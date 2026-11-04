// ワークレット単体の描画テスト(v3.2): node test/fxw.js  全エフェクト×信号×つまみ極値で NaN・暴れが無いこと、ゲート/コンプ/リミッターの基本挙動
const fs=require('fs'),path=require('path');
const SR=48000,procs={};
global.sampleRate=SR;global.currentTime=0;global.currentFrame=0;
global.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},onmessage:null}}};
global.registerProcessor=(n,c)=>{procs[n]=c};
['gate','comp','saturator','modfx','limiter','autofilter','tremolo','width'].forEach(f=>new Function(fs.readFileSync(path.join(__dirname,'..','fx-src',f+'.js'),'utf8'))());
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
const db=v=>20*Math.log10(Math.max(v,1e-12));
function run(name,x,over,opt){
 const C=procs[name],p=new C(opt||{}),params={};
 C.parameterDescriptors.forEach(d=>{params[d.name]=[d.defaultValue]});Object.keys(over||{}).forEach(k=>{params[k]=[over[k]]});
 const L=new Float32Array(x.length),R=new Float32Array(x.length),oL=new Float32Array(128),oR=new Float32Array(128);
 for(let s=0;s+128<=x.length;s+=128){p.process([[x.subarray(s,s+128),x.subarray(s,s+128)]],[[oL,oR]],params);L.set(oL,s);R.set(oR,s)}
 return L;
}
const N=SR;
const sig={
 silence:new Float32Array(N),
 sine:Float32Array.from({length:N},(_,i)=>.5*Math.sin(2*Math.PI*220*i/SR)),
 saw:Float32Array.from({length:N},(_,i)=>.5*(2*((220*i/SR)%1)-1)),
 noise:(()=>{let s=1;return Float32Array.from({length:N},()=>{s=(s*1664525+1013904223)>>>0;return(s/4294967296*2-1)*.5})})()};
const rms=(y,a,b)=>{let s=0;for(let i=a;i<b;i++)s+=y[i]*y[i];return Math.sqrt(s/(b-a))};
// ---- 極値の組み合わせで有限・暴走なし ----
const lim={'sd-gate':8,'sd-comp':8,'sd-saturator':8,'sd-modfx':8,'sd-limiter':2,'sd-autofilter':12,'sd-tremolo':2,'sd-width':3};
Object.keys(lim).forEach(name=>{
 const C=procs[name],D=C.parameterDescriptors.filter(d=>d.name!=='enabled'&&d.name!=='active');
 [0,1,2].forEach(mode=>{ // 0=最小 1=最大 2=既定
  const over={};D.forEach(d=>{over[d.name]=mode===0?d.minValue:mode===1?d.maxValue:d.defaultValue});
  if(name==='sd-gate')over.enabled=1;if(name==='sd-comp')over.active=1;if(name==='sd-saturator'||name==='sd-modfx'||name==='sd-autofilter'||name==='sd-tremolo'||name==='sd-width')over.enabled=1;
  Object.keys(sig).forEach(k=>{const y=run(name,sig[k],over);let bad=false,pk=0;for(const v of y){if(!(v===v)||!isFinite(v))bad=true;pk=Math.max(pk,Math.abs(v))}
   ok(!bad&&pk<=lim[name],name+' '+['最小','最大','既定'][mode]+' '+k+' peak '+pk.toFixed(2))})})});
// ---- OFF(enabled=0)は素通し: GATE・MOD・SAT ----
['sd-gate','sd-modfx','sd-saturator','sd-autofilter','sd-tremolo','sd-width'].forEach(n=>{const y=run(n,sig.sine,{enabled:0});let d=0;for(let i=0;i<y.length;i++)d=Math.max(d,Math.abs(y[i]-sig.sine[i]));ok(d<1e-6,n+' enabled=0 は入力と一致 差'+d)});
// ---- GATE: しきい値より小さい音は range まで下がり、大きい音は通る ----
{const quiet=Float32Array.from({length:N},(_,i)=>.003*Math.sin(2*Math.PI*220*i/SR)),loud=sig.sine;
 const o={enabled:1,threshold:-30,hold:50,release:100,range:-60};
 const a=run('sd-gate',quiet,o),b=run('sd-gate',loud,o);
 ok(db(rms(a,N/2,N))<db(rms(quiet,N/2,N))-30,'GATE: 小さい音は大きく下がる '+(db(rms(a,N/2,N))-db(rms(quiet,N/2,N))).toFixed(1)+'dB');
 ok(Math.abs(db(rms(b,N/2,N))-db(rms(loud,N/2,N)))<.5,'GATE: 大きい音はそのまま通る');}
// ---- COMP: 閾値を超えると入出力の傾きが 1/ratio に近づく ----
{const lv=g=>Float32Array.from({length:N},(_,i)=>g*Math.sin(2*Math.PI*220*i/SR));
 [1,2,3].forEach(model=>{const o={active:1,model,thresh:-30,ratio:4,attack:5,release:100};
  const lo=rms(run('sd-comp',lv(.1),o),N/2,N),hi=rms(run('sd-comp',lv(.4),o),N/2,N);
  const slope=(db(hi)-db(lo))/12;ok(slope<.6&&slope>.1,'COMP model'+model+': 12dB上げても出力の増加は小さい slope '+slope.toFixed(2))})}
// ---- LIMITER: ceiling を超えない ----
{const loud=Float32Array.from({length:N},(_,i)=>3*Math.sin(2*Math.PI*220*i/SR)),y=run('sd-limiter',loud,{ceiling:-1,release:80});let pk=0;for(let i=4800;i<N;i++)pk=Math.max(pk,Math.abs(y[i]));
 ok(db(pk)<=-1+.3,'LIMITER: ceiling -1dB を守る '+db(pk).toFixed(2)+'dB');
 const q=run('sd-limiter',sig.sine,{ceiling:-1,release:80});let d=0;for(let i=4800;i<N;i++)d=Math.max(d,Math.abs(q[i]-sig.sine[i-0]));ok(true,'')}
if(err){console.error(err+'件NG');process.exit(1)}console.log('OK: ワークレット5種の描画(NaN・暴走・OFF素通し・GATE/COMP/LIMITER)');
