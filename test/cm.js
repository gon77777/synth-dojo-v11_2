/* v7.6a CMコース(cm01〜cm08)の検査(オフライン描画の測定): node test/cm.js
   ①聞き比べの音量差1dB以内(g を足した実測) ②mt目標(GR)が達成できる(目標どおりに動かした状態で、アプリと同じ判定)
   ③claim(GRの主張)が成り立つ・目安表と一致 ④各ステップの mx 目標が最初から全部は達成済みでない ⑤本文の主張が音に出ている(アタック・リリース・ポンピング)
   node-web-audio-api が無いとき、CI以外では測定の部分だけスキップ */
const E=require('./cmest.js'),SD=E.loadSD();let err=0;const bad=m=>{console.log('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const ALL=SD.LESSONS.filter(l=>l.course==='CM'),LS=ALL.filter(l=>l.mode==='trk');
['cm01','cm02','cm03','cm04','cm05','cm06','cm07','cm08','cm09','cm10','cm11','cm12','cm13','cm14','cm15'].forEach(id=>ok(ALL.some(l=>l.id===id),id+' が無い'));
/* 定義だけの検査(描画なし) */
LS.forEach(L=>{ok(L.mode==='trk'&&L.tk&&L.tk.length>=2,L.id+' はTRKレッスン');
 L.steps.forEach((st,si)=>{(st.cmp||[]).forEach((c,i)=>{ok(c.tm||c.mt,L.id+' step'+(si+1)+' cmp'+(i+1)+' は tm(COMPの状態)か mt を持つ');ok(c.g===undefined||(c.g<=0&&c.g>=-24),L.id+' g範囲');
   Object.keys(c.tm||{}).forEach(t=>{const v=c.tm[t];ok(v.iCpOn===0||Object.keys(SD.INSP.filter(p=>p.ins==='cp'&&p.id!=='iCpSc'&&p.id!=='iCpScLsn'/* v8.2: SC は書かなければ INT(SD.cmpTmFill) */).reduce((a,p)=>{a[p.id]=1;return a},{})).every(k=>v[k]!==undefined),L.id+' step'+(si+1)+' cmp'+(i+1)+' tm のCOMPは全つまみを書く')})});
  /* 初期状態では mx 目標が全部は達成済みでない */
  if((st.mx||[]).length){const met=st.mx.every(g=>{const x=L.tk[g.trk-1],ini=x.o.mx&&x.o.mx.cp&&x.o.mx.cp[g.k],d=SD.INSP.find(p=>p.id===g.k).def;return SD.MixGoal.inRange(ini==null?d:ini,g.rng)});ok(!met,L.id+' step'+(si+1)+' の mx 目標が最初から全部達成済み')}})});
/* 目安表との一致(cm07 の GR は {g:dyn.grBass} と同じ範囲) */
{const q=LS.find(l=>l.id==='cm07').claim[0],G=SD.GUIDE.dyn.grBass;ok(q.rng[0]===G[0]&&q.rng[1]===G[1],'cm07 の claim の範囲が目安表(ベースのGR)と違う')}
LS.forEach(L=>(L.claim||[]).forEach(q=>ok(q.m==='gr'&&q.trk>=1&&q.trk<=L.tk.length&&q.rng&&q.rng[0]<q.rng[1]&&q.cp,L.id+' claim 定義不正')));
(async()=>{
 if(!E.hasRender){if(process.env.CI){bad('node-web-audio-api が無い')}else console.log('SKIP: 測定(node-web-audio-api 未インストール)');return done(0)}
 let nC=0,nM=0,nQ=0;
 for(const L of LS){
  for(let si=0;si<L.steps.length;si++){const st=L.steps[si];
   /* ① 聞き比べの音量差 */
   if((st.cmp||[]).length>1&&st.cmp.every(c=>c.tm&&!c.mt)){const lv=await E.cmpLevels(SD,L,st),gs=st.cmp.map(c=>c.g||0);nC++;
    const sp=SD.MixGoal.cmpSpread(lv,gs);ok(sp<=1.0,L.id+' step'+(si+1)+' 聞き比べの音量差が1dBを超える '+sp.toFixed(2)+'dB')}
   /* ② mt 目標(GR)が、目標どおりの状態で達成できる */
   if((st.mt||[]).length){const state=E.stateAt(SD,L,si),r=await E.measure(SD,L,state);
    st.mt.forEach(g=>{if(g.m!=='gr')return;nM++;ok(E.mtReachable(SD,r.gr[g.trk]||[],g.rng,g.hold),L.id+' step'+(si+1)+' mt GR '+g.rng+' が目標どおりの状態で達成できない(GR '+(r.gr[g.trk]?Math.min(...r.gr[g.trk].slice(r.gr[g.trk].length/3|0)).toFixed(1)+'〜'+Math.max(...r.gr[g.trk]).toFixed(1):'無し')+')')})}}
  /* ③ claim */
  for(const q of L.claim||[]){const ov={};ov[q.trk]=Object.assign({iCpOn:1},q.cp);const r=await E.measure(SD,L,ov),b=r.gr[q.trk].slice(r.gr[q.trk].length/3|0),m=b.reduce((x,y)=>x+y,0)/b.length;nQ++;
   ok(SD.MixGoal.inRange(m,q.rng),L.id+' claim: GRの平均が '+q.rng+' に入らない '+m.toFixed(2))}}
 /* ⑤ 本文の主張が音に出ている */
 const cm03=LS.find(l=>l.id==='cm03'),cm08=LS.find(l=>l.id==='cm08'),K=(o)=>({1:Object.assign({iCpOn:1,iCpModel:3,iCpThr:-26,iCpRatio:6,iCpAtk:10,iCpRel:100,iCpKnee:6,iCpMix:1,iCpMake:0,iCpScHpf:20},o)});
 {const k1={tk:[cm03.tk[0]]},a=await E.measure(SD,k1,K({iCpAtk:.5})),b=await E.measure(SD,k1,K({iCpAtk:40})),cf=r=>20*Math.log10(r.peak);
  ok(cf(b)>cf(a)+.5,'cm03: アタックが遅いほど音の頭(ピーク)が抑えられずに残る 速い'+cf(a).toFixed(1)+' 遅い'+cf(b).toFixed(1)+'dB')}
 {const mn=async rel=>{const r=await E.measure(SD,cm03,K({iCpRel:rel})),g=r.gr[1].slice(r.gr[1].length/3|0);return Math.min(...g)};const s=await mn(200),l=await mn(800);
  ok(l>s+1,'cm03: リリースが長いと、キックの間でも抑えが戻りきらない 200ms最小GR'+s.toFixed(1)+' 800ms'+l.toFixed(1))}
 {const sw=async rel=>{const r=await E.measure(SD,cm08,{2:Object.assign({iCpOn:1,iCpModel:3,iCpThr:-36,iCpRatio:6,iCpAtk:10,iCpKnee:6,iCpMix:1,iCpMake:0,iCpScHpf:20},{iCpRel:rel})}),g=r.gr[2].slice(r.gr[2].length/3|0);return Math.max(...g)-Math.min(...g)};const a=await sw(40),b=await sw(400);
  ok(a>b+.5,'cm08: リリースが短いとGRの上下(ポンピング)が大きい 40ms '+a.toFixed(1)+' 400ms '+b.toFixed(1))}
 /* v8.2: 聞き比べの tm が COMP を書くのに SC を書かないときは、INT/OFF を補う(ユーザーのSC設定が聞き比べに漏れない) */
 {const o={iCpOn:1,iCpThr:-20},f=SD.cmpTmFill(o),g=SD.cmpTmFill({iCpOn:1,iCpSc:2,iCpScLsn:1}),e={iEqOn:1,tPan:.2},h=SD.cmpTmFill(e);
  ok(f.iCpSc===0&&f.iCpScLsn===0&&f.iCpThr===-20&&o.iCpSc===undefined,'cmpTmFill: COMPだけ書いた tm には INT/OFF を補う(元は変えない)');
  ok(g.iCpSc===2&&g.iCpScLsn===1,'cmpTmFill: SC を書いた tm はそのまま');
  ok(h===e&&h.iCpSc===undefined&&SD.cmpTmFill(null)===null,'cmpTmFill: COMP を書かない tm には何も足さない')}
 done(nC,nM,nQ);
 function done(nC,nM,nQ){console.log(err?('失敗 '+err+'件'):('OK: CMコース '+LS.length+'本・聞き比べ'+(nC||0)+'件の音量差・mt目標'+(nM||0)+'件・claim'+(nQ||0)+'件を測定で検査'));process.exit(err?1:0)}
})().catch(e=>{console.error('NG: '+e.stack);process.exit(1)});
