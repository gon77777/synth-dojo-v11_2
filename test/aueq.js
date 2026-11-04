/* v8.5 E5: au10(EQのオートメーション)の検査: node test/aueq.js
   ①定義(描画なし): cmp の g が全案に付いている(0以下・−24以上)・cmp の ln は EQ4 のつまみ(AUINS)だけ・tm の番号がトラック内
   ②測定の部品(描画なし): tvEq(レーンで動かすEQ)が、レーンが無い・一定のレーンなら、固定のEQ(cmest の runChain)と一致する。レーンが動くと音が変わる
   ③聞き比べの音量差1dB以内(g を足した実測。ループ全体の平均パワー): node-web-audio-api が無いとき、CI以外ではスキップ */
const E=require('./aueqest.js'),C=require('./cmest.js'),SD=E.loadSD();let err=0;const bad=m=>{console.log('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const LS=SD.LESSONS.filter(l=>l.cat==='au10'),ids=LS.map(l=>l.id).join(',');
ok(LS.length===13,'au10 のレッスンが13本でない: '+LS.length+' '+ids);
/* ① 定義 */
let nCmp=0;
LS.forEach(L=>L.steps.forEach((st,si)=>{if(!st.cmp)return;const w=L.id+' step'+(si+1);ok(st.cmp.length>=2,w+' cmp が2つ未満');
 st.cmp.forEach((c,i)=>{nCmp++;ok(typeof c.g==='number'&&c.g<=0&&c.g>=-24,w+' cmp'+(i+1)+' に g(0〜−24)が無い: '+c.g);
  (c.ln||[]).forEach(l=>ok(SD.AUINS.indexOf(l.id)>=0,w+' cmp'+(i+1)+' の ln '+l.id+' が EQ4/COMP のつまみでない'));
  Object.keys(c.tm||{}).forEach(t=>ok(t>=1&&t<=L.tk.length,w+' cmp'+(i+1)+' tm のトラック番号'))});
 /* 音量が揃っている案は、少なくとも1つが g=0(いちばん小さい案に揃える) */
 ok(st.cmp.some(c=>c.g===0),w+' g=0 の案が無い(いちばん小さい案に揃える)')}));
/* ② 測定の部品 */
{const n=48000,x=new Float32Array(n);let s=12345;for(let i=0;i<n;i++){s=(s*1103515245+12345)&0x7fffffff;x[i]=(s/0x7fffffff-.5)*.2}
 const m={iEqOn:1,iEqHpf:300,iEqLg:4,iEqB2f:900,iEqB2g:6,iEqB2q:2,iEqHg:-3,iEqLpf:8000},ref=C.runChain(SD,x,m).L,md=(a,b)=>{let d=0;for(let i=0;i<a.length;i++)d=Math.max(d,Math.abs(a[i]-b[i]));return d};
 ok(md(E.tvEq(SD,x,m,[]),ref)<1e-5,'tvEq(レーン無し)が固定のEQと違う');
 const base=Object.assign({},m,{iEqHpf:20}),p=SD.Auto.defOf('analog','iEqHpf'),K=SD.Auto.fromValue(p,300),lane={id:'iEqHpf',trk:1,pts:[[0,K,'L'],[2000,K,'L']]};
 ok(md(E.tvEq(SD,x,base,[lane]),ref)<1e-5,'tvEq(一定のレーン)が、その値で固定したEQと違う');
 const ramp={id:'iEqHpf',trk:1,pts:[[0,SD.Auto.fromValue(p,20),'L'],[192,SD.Auto.fromValue(p,2000),'L']]},z=x.map((_,i)=>.2*Math.sin(2*Math.PI*200*i/48000)),y=E.tvEq(SD,z,base,[ramp]),pw=(a,t0,t1)=>{let s=0;for(let i=t0;i<t1;i++)s+=a[i]*a[i];return s/(t1-t0)};
 ok(pw(y,0,2400)>pw(y,n-2400,n)*2,'tvEq: LOW CUT を上げていくと、後半は200Hzの音が抜けて小さくなるはず')}
/* ③ 測定 */
(async()=>{
 if(!E.hasRender){if(process.env.CI)bad('node-web-audio-api が無い');else console.log('SKIP: 音量差の測定(node-web-audio-api 未インストール)');return done(0)}
 let nS=0;
 for(const L of LS)for(let si=0;si<L.steps.length;si++){const st=L.steps[si];if(!st.cmp||st.cmp.length<2)continue;
  const r=await E.stepLevelsAu(SD,L,st),sp=SD.MixGoal.cmpSpread(r.map(x=>x.db),st.cmp.map(c=>c.g||0));nS++;
  ok(sp<=1.0,L.id+' step'+(si+1)+' 聞き比べの音量差が1dBを超える '+sp.toFixed(2)+'dB(node tools/au-eq-cal.js --write で出し直す)')}
 done(nS);
 function done(nS){console.log(err?('失敗 '+err+'件'):('OK: au10 '+LS.length+'本・cmp '+nCmp+'案の定義'+(nS?('・'+nS+'ステップの音量差を測定で検査'):'')));process.exit(err?1:0)}
})().catch(e=>{console.error('NG: '+e.stack);process.exit(1)});
