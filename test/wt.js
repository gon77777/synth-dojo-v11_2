// ウェーブテーブルのデータ/DSP検証: node test/wt.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
const g=global;g.window=g;g.SD={};
['params.js','wtparams.js','wtdata.js','wtsynth.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(w,f),'utf8'),{filename:f}));
let err=0;const bad=m=>{console.error('NG: '+m);err++};
const D=SD.WTD,N=D.N;
// 1) テーブル: 有限・振幅・帯域制限
SD.WTD.ids.forEach(id=>{
 const t0=Date.now(),T=D.build(id),ms=Date.now()-t0;let mx=0;
 for(let i=0;i<T.levels.length;i++){const v=T.levels[i];if(!isFinite(v)){bad(id+' 非有限値');break}mx=Math.max(mx,Math.abs(v))}
 if(mx>3||mx<.2)bad(id+' 振幅 '+mx.toFixed(2));
 for(const f of [0,21,42,63])for(const l of [0,3,6,9]){
  const re=Float64Array.from(T.levels.subarray((l*64+f)*N,(l*64+f+1)*N)),im=new Float64Array(N);D.fft(re,im,false);
  const mh=Math.min(1023,1024>>l);let hi=0,tot=0;for(let k=1;k<N/2;k++){const e=re[k]*re[k]+im[k]*im[k];tot+=e;if(k>mh)hi+=e}
  if(id!=='digital'||l>0)if(hi>1e-6*tot)bad(id+' f'+f+' level'+l+' 帯域外エネルギー '+(hi/tot).toExponential(1));
 }
 console.log(id.padEnd(8),'build '+ms+'ms  peak '+mx.toFixed(2));
});
// 1b) 自作テーブル(倍音スライダー)
{const ud={a:[1].concat(new Array(31).fill(0)),b:Array.from({length:32},(_,i)=>i%2?0:1/(i+1))},T=D.build('user',ud);let mx=0;
 for(let i=0;i<T.levels.length;i++){const v=T.levels[i];if(!isFinite(v)){bad('user 非有限値');break}mx=Math.max(mx,Math.abs(v))}
 if(mx>3||mx<.2)bad('user 振幅 '+mx.toFixed(2));
 const f0=T.levels.subarray(0,N);let z=0;for(let i=0;i<N;i++)z=Math.max(z,Math.abs(f0[i]-Math.sin(2*Math.PI*i/N)*f0[N/4]));if(z>.02)bad('user フレーム0がサイン波でない '+z);
 const pf=D.userFrame(ud,0,64);if(Math.abs(Math.abs(pf[16])-1)>.01)bad('userFrame正規化');
 const zero=D.build('user',{a:new Array(32).fill(0),b:new Array(32).fill(0)});if(zero.levels.some(v=>!isFinite(v)))bad('user 全0で非有限値');
 SD.FXIDS=SD.FXIDS||[];const w2=new SD.WT({init(){},input:{},set(){}});w2.setUser({a:[2,-1,'x'],b:null},'quiet');if(w2.user.a[0]!==1||w2.user.a[1]!==0||w2.user.a[2]!==0||w2.user.b.length!==32)bad('setUser 値の丸め');
 const gp=w2.getPatch();if(!gp.user||gp.user.a.length!==32)bad('getPatch.user');w2.setPatch({user:{a:new Array(32).fill(.5),b:new Array(32).fill(.1)}});if(w2.user.a[5]!==.5)bad('setPatch.user');w2.setPatch({});if(w2.user.a[0]!==1||w2.user.a[1]!==0)bad('setPatch省略時は既定に戻る');
 w2.p.wTable='user';w2.setUser({a:new Array(32).fill(.2),b:new Array(32).fill(.3)},'quiet');const t1=w2.ensureTab();w2.setUser({a:new Array(32).fill(.4),b:new Array(32).fill(.3)},'quiet');if(w2.ensureTab()===t1)bad('ユーザー更新でテーブルが作り直されない');
 console.log('user     peak '+mx.toFixed(2))}
// 2) DSP(AudioWorkletをモックして実行)
g.sampleRate=48000;let Cls=null;
g.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},onmessage:null}}};
g.registerProcessor=(n,c)=>{Cls=c};
SD.WT_WORKLET();
const T=D.build('basic');
function render(params,notes,sec){
 const P=new Cls();P.msg({t:'tab',data:T.levels});Object.keys(params).forEach(k=>P.msg({t:'p',id:k,v:params[k]}));
 notes.forEach(m=>P.msg({t:'on',m,vel:1}));
 const n=Math.ceil(48000*sec/128)*128,L=new Float32Array(n),R=new Float32Array(n),a=new Float32Array(128),b=new Float32Array(128);
 for(let i=0;i<n;i+=128){P.process([],[[a,b]]);L.set(a,i);R.set(b,i)}
 return {L,R};
}
function harmAmp(x,f,k){let re=0,im=0;const s=x.length;for(let i=0;i<s;i++){const ph=2*Math.PI*f*k*i/48000;re+=x[i]*Math.cos(ph);im+=x[i]*Math.sin(ph)}return Math.hypot(re,im)*2/s}
const seg=x=>x.subarray(24000,24000+9600),f440=440;
let r=render({wPos:0,aS:1},[69],.8);
let h1=harmAmp(seg(r.L),f440,1),h2=harmAmp(seg(r.L),f440,2),h3=harmAmp(seg(r.L),f440,3);
if(!(h1>.05&&h2/h1<.02&&h3/h1<.02))bad('POSITION=0 がサイン波でない h2/h1='+(h2/h1).toFixed(3));
r=render({wPos:.667,aS:1},[69],.8);h1=harmAmp(seg(r.L),f440,1);h2=harmAmp(seg(r.L),f440,2);
if(!(h2/h1>.4&&h2/h1<.6))bad('POSITION=.67 がノコギリ波でない h2/h1='+(h2/h1).toFixed(3));
r=render({wPos:1,aS:1},[69],.8);h1=harmAmp(seg(r.L),f440,1);h2=harmAmp(seg(r.L),f440,2);h3=harmAmp(seg(r.L),f440,3);
if(!(h2/h1<.05&&h3/h1>.25&&h3/h1<.4))bad('POSITION=1 が矩形波でない h3/h1='+(h3/h1).toFixed(3));
// 全パラメータ極値で NaN/暴走が無いか
const sets=[{wWarpT:'sync',wWarp:1,uVoices:5,uDetune:100,uSpread:1,res:1,cutoff:200,wSub:1,wNoise:1,lfoPos:1,lfoPitch:12,lfoFilter:4,lfoAmp:1,peAmt:1,envAmt:4},
 {wWarpT:'bend',wWarp:1,fType:'bandpass',res:1,cutoff:5000,keyTrack:1},{fType:'highpass',res:1,cutoff:12000,uVoices:3}];
sets.forEach((s,i)=>{const o=render(Object.assign({aS:1},s),[24,48,60,72,84,96,100],1);let m=0;for(let j=0;j<o.L.length;j++){const v=Math.max(Math.abs(o.L[j]),Math.abs(o.R[j]));if(!isFinite(v)){bad('極値セット'+i+' NaN');return}m=Math.max(m,v)}
 if(m>6)bad('極値セット'+i+' 暴走 peak='+m.toFixed(2));console.log('極値セット'+i+' peak '+m.toFixed(2))});
// ユニゾンで左右が異なる / VOICES=1でも鳴る
r=render({uVoices:3,uSpread:1,uDetune:30,aS:1},[60],.5);let df=0;for(let i=0;i<r.L.length;i++)df+=Math.abs(r.L[i]-r.R[i]);if(df<1)bad('ユニゾンでステレオ差が無い');
// 解放後に無音になる(ボイスが解放される)
{const P=new Cls();P.msg({t:'tab',data:T.levels});P.msg({t:'p',id:'aR',v:.05});P.msg({t:'on',m:60,vel:1});const a=new Float32Array(128),b=new Float32Array(128);
 for(let i=0;i<50;i++)P.process([],[[a,b]]);P.msg({t:'off',m:60});for(let i=0;i<300;i++)P.process([],[[a,b]]);if(P.V.some(v=>v.on))bad('リリース後にボイスが解放されない')}
// 同時発音: VOICES=5 → 4音まで
{const P=new Cls();P.msg({t:'tab',data:T.levels});P.msg({t:'p',id:'uVoices',v:5});[60,62,64,65,67,69].forEach(m=>P.msg({t:'on',m,vel:1}));
 const live=P.V.filter(v=>v.on&&!v.kill).length;if(live!==4)bad('VOICES=5 の同時発音数 '+live+' (期待4)')}
console.log(err?('失敗 '+err+'件'):'OK: ウェーブテーブル 8種+DSP');process.exit(err?1:0);
