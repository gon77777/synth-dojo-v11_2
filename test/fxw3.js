// v3.3 新ワークレット(AUTO FILTER / TREMOLO・AUTOPAN / STEREO WIDTH)の挙動テスト: node test/fxw3.js
const fs=require('fs'),path=require('path');
const SR=48000,procs={};
global.sampleRate=SR;global.currentTime=0;global.currentFrame=0;
global.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},onmessage:null}}};
global.registerProcessor=(n,c)=>{procs[n]=c};
['autofilter','tremolo','width'].forEach(f=>new Function(fs.readFileSync(path.join(__dirname,'..','fx-src',f+'.js'),'utf8'))());
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
const db=v=>20*Math.log10(Math.max(v,1e-12));
function run(name,xL,xR,over){
 const C=procs[name],p=new C({}),params={};
 C.parameterDescriptors.forEach(d=>{params[d.name]=[d.defaultValue]});Object.keys(over||{}).forEach(k=>{params[k]=[over[k]]});
 const n=xL.length,L=new Float32Array(n),R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128);
 for(let s=0;s+128<=n;s+=128){p.process([[xL.subarray(s,s+128),xR.subarray(s,s+128)]],[[oL,oR]],params);L.set(oL,s);R.set(oR,s)}
 return [L,R];
}
const N=SR*2;
const sine=(f,a)=>Float32Array.from({length:N},(_,i)=>(a||.5)*Math.sin(2*Math.PI*f*i/SR));
const dc=Float32Array.from({length:N},()=>1);
const noise=a=>{let s=7;return Float32Array.from({length:N},()=>{s=(s*1664525+1013904223)>>>0;return(s/4294967296*2-1)*(a||.5)})};
const rms=(y,a,b)=>{let s=0;for(let i=a;i<b;i++)s+=y[i]*y[i];return Math.sqrt(s/(b-a))};
// ---- AUTO FILTER: MANUAL(動かさない)の周波数応答 ----
{const af=(type,f)=>{const x=sine(f);const [y]=run('sd-autofilter',x,x,{enabled:1,mode:0,type,cutoff:1000,res:0});return db(rms(y,N/2,N)/rms(x,N/2,N))};
 ok(Math.abs(af(0,1000)+3)<1,'AF LP: カットオフで約-3dB '+af(0,1000).toFixed(1));
 ok(af(0,100)>-1&&af(0,8000)<-20,'AF LP: 低域は通り高域は大きく下がる '+af(0,100).toFixed(1)+' / '+af(0,8000).toFixed(1));
 ok(af(1,8000)>-1&&af(1,100)<-20,'AF HP: 高域は通り低域は下がる');
 ok(Math.abs(af(2,1000))<1&&af(2,100)<-10&&af(2,10000)<-10,'AF BP: 中心だけ通る(0dB) '+af(2,1000).toFixed(1));
 ok(af(3,1000)<-20&&af(3,100)>-1&&af(3,10000)>-1,'AF NOTCH: 中心だけ削る '+af(3,1000).toFixed(1));}
// ---- AUTO FILTER: LFO の周波数が指定どおり(出力の明るさの周期) ----
function lfoHz(shape,rate){
 const x=noise(.5),[y]=run('sd-autofilter',x,x,{enabled:1,mode:1,type:0,cutoff:1000,res:0,depth:1,rate,shape});
 const W=480,r=[];for(let i=0;i+W<=N;i+=W)r.push(rms(y,i,i+W));const m=r.reduce((a,b)=>a+b)/r.length;
 let c=0;for(let i=1;i<r.length;i++)if((r[i-1]-m)*(r[i]-m)<0)c++;return c/2/(N/SR)}
{const h=lfoHz(0,2);ok(Math.abs(h-2)<=.5,'AF LFO SINE 2Hz → 測定 '+h.toFixed(2)+'Hz');
 const h2=lfoHz(1,4);ok(Math.abs(h2-4)<=.75,'AF LFO TRI 4Hz → 測定 '+h2.toFixed(2)+'Hz');}
// ---- AUTO FILTER: ENV は大きい音ほど明るく(カットオフが上がる) ----
{const g=a=>{const x=noise(a),[y]=run('sd-autofilter',x,x,{enabled:1,mode:2,type:0,cutoff:300,res:0,depth:1,sens:1,attack:2,release:50});return rms(y,N/2,N)/rms(x,N/2,N)};
 const q=g(.01),l=g(.5);ok(l>q*1.8,'AF ENV: 大きい入力のほうが通過率が高い '+q.toFixed(3)+' → '+l.toFixed(3));}
// ---- AUTO FILTER: S&H は周期ごとに値が変わる(同じ種で決定的) ----
{const a=lfoHz(4,3),b=lfoHz(4,3);ok(a===b,'AF S&H: 同じ入力で結果が同じ(決定的)');}
// ---- TREMOLO: 深さ100%・SQUARE で音量が 0 と 1 だけ ----
{const [y]=run('sd-tremolo',dc,dc,{enabled:1,mode:0,shape:2,depth:1,rate:4});
 let two=0,tr=0,prev=y[0]>.5;for(let i=0;i<N;i++){if(Math.abs(y[i])<1e-3||Math.abs(y[i]-1)<1e-3)two++;const h=y[i]>.5;if(h!==prev)tr++;prev=h}
 ok(two/N>.99,'TREMOLO SQUARE 100%: 音量が0と1だけ '+(two/N*100).toFixed(2)+'%');
 ok(Math.abs(tr/2/(N/SR)-4)<=.5,'TREMOLO: 4Hz で周期どおり '+(tr/2/(N/SR)).toFixed(2)+'Hz');
 ok(y[0]>.99,'TREMOLO: 位相0で音量最大');}
// ---- TREMOLO: 深さ0は素通し・深さ50%の最小値は0.5 ----
{const [y0]=run('sd-tremolo',dc,dc,{enabled:1,depth:0,shape:0,rate:5});let d=0;for(const v of y0)d=Math.max(d,Math.abs(v-1));ok(d<1e-6,'TREMOLO 深さ0 は素通し');
 const [y]=run('sd-tremolo',dc,dc,{enabled:1,depth:.5,shape:0,rate:5});let mn=9;for(let i=1000;i<N;i++)mn=Math.min(mn,y[i]);ok(Math.abs(mn-.5)<.02,'TREMOLO 深さ50% の最小は約0.5 '+mn.toFixed(3));}
// ---- AUTOPAN: SPREAD100% で左右が逆位相 / SPREAD0% は左右同じ ----
{const [L,R]=run('sd-tremolo',dc,dc,{enabled:1,mode:1,shape:0,depth:1,rate:2,spread:1});let s=0,sl=0,sr=0;for(let i=4800;i<N;i++){s+=(L[i]-.5)*(R[i]-.5);sl+=(L[i]-.5)**2;sr+=(R[i]-.5)**2}
 ok(s/Math.sqrt(sl*sr)<-.97,'AUTOPAN spread100%: 左右が逆位相 相関 '+(s/Math.sqrt(sl*sr)).toFixed(3));
 const [a,b]=run('sd-tremolo',dc,dc,{enabled:1,mode:1,shape:0,depth:1,rate:2,spread:0});let d=0;for(let i=0;i<N;i++)d=Math.max(d,Math.abs(a[i]-b[i]));ok(d<1e-6,'AUTOPAN spread0%: 左右同じ');}
// ---- STEREO WIDTH ----
{const xl=noise(.4),xr=(()=>{let s=99;return Float32Array.from({length:N},()=>{s=(s*1664525+1013904223)>>>0;return(s/4294967296*2-1)*.4})})();
 const [a,b]=run('sd-width',xl,xr,{enabled:1,width:0});let d=0;for(let i=9600;i<N;i++)d=Math.max(d,Math.abs(a[i]-b[i]));ok(d<1e-5,'WIDTH 0%: モノ(左右が同じ)');
 const [c,e]=run('sd-width',xl,xr,{enabled:1,width:1});let d1=0;for(let i=0;i<N;i++)d1=Math.max(d1,Math.abs(c[i]-xl[i]),Math.abs(e[i]-xr[i]));ok(d1<1e-5,'WIDTH 100%: 入力と一致 差'+d1);
 const m=(f,w)=>{const x=sine(f,.4),nx=Float32Array.from(x,v=>-v),[l,r]=run('sd-width',x,nx,{enabled:1,width:w});const s=Float32Array.from(l,(v,i)=>(v-r[i])/2);const S=Float32Array.from(x);return rms(s,N/2,N)/rms(S,N/2,N)};
 const hi=m(2000,2),lo=m(60,2);ok(hi>1.9&&hi<2.1,'WIDTH 200%: 2kHzの差成分は約2倍 '+hi.toFixed(2));
 ok(lo<1.3,'WIDTH 200%: 60Hzの差成分は広がらない(低域保護) '+lo.toFixed(2));
 const nr=m(60,0);ok(nr<.05,'WIDTH 0%: 低域の差成分も消える(完全モノ) '+nr.toFixed(3));}
if(err){console.error(err+'件NG');process.exit(1)}console.log('OK: v3.3ワークレット(AUTO FILTER・TREMOLO/AUTOPAN・STEREO WIDTH)');
