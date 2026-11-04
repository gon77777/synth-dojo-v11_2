// グラニュラーの検証: node test/gr.js  (AudioWorkletをモックして実行)
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
const g=global;g.window=g;g.SD={};g.sampleRate=44100;
let Cls=null;g.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){}}}};g.registerProcessor=(n,c)=>{Cls=c};
['params.js','mat.js','umat.js','grparams.js','gr.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(w,f),'utf8'),{filename:f}));
let err=0;const bad=m=>{console.error('NG: '+m);err++};
SD.FXIDS=['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'];
SD.GR_WORKLET();
const mk=(over)=>{const pr=new Cls();pr.msg({t:'mat',data:SD.MAT.get(over&&over.mat||'b:voice').data,sr:44100});Object.keys(over||{}).forEach(k=>{if(k!=='mat')pr.msg({t:'p',id:k,v:over[k]})});return pr};
const run=(pr,blocks,cb)=>{const L=new Float32Array(128),R=new Float32Array(128);let mx=0,nan=false,e=0;
 for(let b=0;b<blocks;b++){pr.process([],[[L,R]]);for(let i=0;i<128;i++){const a=L[i],c=R[i];if(!isFinite(a)||!isFinite(c))nan=true;mx=Math.max(mx,Math.abs(a),Math.abs(c));e+=a*a+c*c}if(cb)cb(b)}
 return{mx,nan,e}};
// 1) 無音: ボイスが無ければ完全な無音
{const pr=mk();const r=run(pr,50);if(r.mx!==0)bad('無音時に音が出る '+r.mx)}
// 2) 発音して有限値・音量が妥当・粒数が上限以下
const cases=[{},{gDens:60,gSize:.5},{gDens:1,gSize:.005},{gDens:60,gSize:.5,gWin:'rect'},{gWin:'gauss',gSpray:1,gPitch:24},{gPitch:-24,gKey:'off'},{mat:'b:beat',gPos:1,gSpray:1},{mat:'b:noise',gPos:0,gSpray:0}];
cases.forEach((c,ci)=>{const pr=mk(c);pr.msg({t:'on',m:60,vel:1});pr.msg({t:'on',m:72,vel:1});
 const r=run(pr,400);
 if(r.nan)bad('case'+ci+' NaN/Inf');
 if(pr.maxG>32)bad('case'+ci+' 粒の同時数 '+pr.maxG);
 if(!(r.e>0))bad('case'+ci+' 無音のまま');
 if(r.mx>1.5)bad('case'+ci+' 音量過大 '+r.mx.toFixed(2));
 if(pr.sMin<0||pr.sMax>SD.MAT.get(c.mat||'b:voice').data.length-1)bad('case'+ci+' 位置が素材の範囲外 '+pr.sMin+'..'+pr.sMax);
 console.log('case'+ci,JSON.stringify(c).padEnd(46),'peak '+r.mx.toFixed(2),'粒最大 '+pr.maxG)});
// 3) 離すと無音に戻る
{const pr=mk({aR:.05});pr.msg({t:'on',m:60,vel:1});run(pr,100);pr.msg({t:'alloff'});const r=run(pr,400);const r2=run(pr,10);if(r2.mx!==0)bad('リリース後も音が残る '+r2.mx);if(pr.V.some(v=>v.on))bad('ボイスが解放されない')}
// 4) 窓: 0から始まり0で終わる(矩形を除く)。ワークレット内の表とUI側の式が一致
{const pr=mk();['hann','tri','gauss'].forEach((n,i)=>{const t=pr.WT[i];if(Math.abs(t[0])>1e-6||Math.abs(t[1024])>1e-6)bad(n+' 窓の端が0でない');
  if(Math.abs(t[512]-1)>.02)bad(n+' 窓の中央が1でない '+t[512]);
  for(let k=0;k<=1024;k+=64)if(Math.abs(t[k]-SD.GRWIN(n,k/1024))>1e-4)bad(n+' 式の不一致 x='+k/1024)});
 if(pr.WT[3][0]!==1)bad('矩形窓')}
// 5) 位置の固定: SPRAY=0なら粒はすべて同じ開始位置
{const pr=mk({gSpray:0,gPos:.5});pr.msg({t:'on',m:60,vel:1});run(pr,200);const n=SD.MAT.get('b:voice').data.length-1;if(Math.abs(pr.sMin-pr.sMax)>1e-6||Math.abs(pr.sMin-.5*n)>1)bad('SPRAY=0で位置がばらつく')}
// 6) 低密度では粒が個別: DENS=2,SIZE=50ms → 同時1個以下
{const pr=mk({gDens:2,gSize:.05});pr.msg({t:'on',m:60,vel:1});run(pr,300);if(pr.maxG>2)bad('低密度で粒が重なる '+pr.maxG)}
// 7) 高密度で上限に張り付いても落ちない/ボイス盗みでも有限
{const pr=mk({gDens:60,gSize:.5});for(let i=0;i<6;i++){pr.msg({t:'on',m:48+i*3,vel:1});const r=run(pr,30);if(r.nan)bad('ボイス盗み中にNaN')}if(pr.maxG>32)bad('上限超過')}
// 5b) SCAN: 位置が動く。FREEZEで止まる。逆向きも範囲内
{const n=SD.MAT.get('b:voice').data.length-1;
 let pr=mk({gSpray:0,gPos:.2,gScan:.25});pr.msg({t:'on',m:60,vel:1});run(pr,1200);if(!(pr.sMax-pr.sMin>.3*n))bad('SCANで位置が動かない '+(pr.sMax-pr.sMin)/n);if(pr.sMin<0||pr.sMax>n)bad('SCAN範囲外');
 pr=mk({gSpray:0,gPos:.2,gScan:.25,gFreeze:'on'});pr.msg({t:'on',m:60,vel:1});run(pr,1200);if(Math.abs(pr.sMax-pr.sMin)>1)bad('FREEZEで位置が動く');
 pr=mk({gSpray:0,gPos:.2,gScan:-.5});pr.msg({t:'on',m:60,vel:1});const r=run(pr,1200);if(pr.sMin<0||pr.sMax>n||r.nan)bad('逆スキャン範囲外/NaN')}
// 5c) 4ボイス・変調・ジッター全開でも安定
{const pr=mk({gDens:60,gSize:.3,gJit:1,gPRand:12,gLfoPos:1,gLfoSize:1,gLfoPitch:12,lfoAmp:1,lfoRate:30,lfoShape:'square',gScan:.5});[48,52,55,59,62].forEach(m=>pr.msg({t:'on',m,vel:1}));
 const r=run(pr,800);if(r.nan)bad('全変調でNaN');if(pr.maxG>32)bad('全変調で粒上限超過 '+pr.maxG);if(r.mx>1.5)bad('全変調で音量過大 '+r.mx.toFixed(2));if(pr.sMin<0||pr.sMax>SD.MAT.get('b:voice').data.length-1)bad('全変調で位置範囲外')}
// 5d) ジッター: 0なら粒の間隔が等しく、1なら不規則
{const gaps=j=>{const pr=mk({gDens:20,gSize:.02,gJit:j}),ts=[];pr.msg({t:'on',m:60,vel:1});const o=pr.spawn.bind(pr);let blk=0;pr.spawn=(vi,v)=>{ts.push(blk);o(vi,v)};for(let b=0;b<300;b++){blk=b;run(pr,1)}
  const d=[];for(let i=1;i<ts.length;i++)d.push(ts[i]-ts[i-1]);const m=d.reduce((a,b)=>a+b,0)/d.length;return d.reduce((a,b)=>a+(b-m)*(b-m),0)/d.length};
 if(!(gaps(1)>gaps(0)*1.5+.05))bad('JITTERが効かない '+gaps(0)+' / '+gaps(1))}
// 5e) 可視化データ(約30Hz)と無音後のクリア
{const pr=mk();const msgs=[];pr.port.postMessage=m=>msgs.push(m);pr.msg({t:'on',m:60,vel:1});run(pr,400);
 const gs=msgs.filter(m=>m.t==='g');if(gs.length<30||gs.length>36)bad('可視化通知の頻度 '+gs.length+'/400blk');
 if(gs.some(m=>m.a.length%2||Array.from(m.a).some(v=>!isFinite(v)||v<0||v>1.0001)))bad('可視化データの形式');
 pr.msg({t:'alloff'});run(pr,600);const last=msgs.filter(m=>m.t==='g').pop();if(last.a.length!==0)bad('無音後に粒表示が残る')}
// 8) パラメータ定義・エンジン(メイン側)
{const D=SD.defs.gr;D.P.forEach(p=>{if(p.tab!=='top'&&p.def===undefined)bad(p.id+' def無し')});
 const e=new SD.GR({init(){},input:{},set(){}});e.set('gMat','x:bad');if(e.p.gMat!=='b:voice')bad('不正な素材IDが通る');
 e.set('gDens',60);e.set('gSize',.5);e.held.set(60,1);e.held.set(64,1);if(!e.over())bad('over()が働かない');e.set('gDens',12);e.set('gSize',.08);e.held.clear();if(e.over())bad('over()の誤検出');
 const pa=e.getPatch();if(pa.gPos!==.3||pa.master!==undefined)bad('getPatch');e.setPatch({gPos:.8});if(e.p.gPos!==.8||e.p.gSize!==.08)bad('setPatch');
 if(SD.fmt(D.byId.gRoot,60)!=='C4'||SD.fmt(D.byId.gRoot,24)!=='C1'||SD.fmt(D.byId.gRoot,96)!=='C7')bad('ROOT表記')}
console.log(err?'FAILED '+err:'OK');process.exit(err?1:0);
