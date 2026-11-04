// SS-0 計測: 高Qの掃引を (a)旧方式(5msごとの階段+setTargetAtTime) (b)新方式(Runner) (c)理想(0.1ms刻みの曲線)で描画して比べる。
// 注意: getChannelData は AudioBuffer が GC されると壊れるので必ずコピーして持つ。
// 完了条件(SS): 新/旧 の rms・クリックとも 0.5 以下。 指標: 真値との差のRMS・差の2階差分の最大(クリック)。node-web-audio-api が無いとき、CI以外ではスキップ。 node test/schedm.js
const fs=require('fs'),path=require('path'),vm=require('vm');
let W=null;try{W=require('node-web-audio-api')}catch(e){}
if(!W||!W.OfflineAudioContext){if(process.env.CI){console.error('NG: node-web-audio-api が無い');process.exit(1)}console.log('SKIP: 掃引の計測(node-web-audio-api 未インストール)');process.exit(0)}
const ctx={console,Math,Float32Array,Float64Array,Uint8Array};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
const J=p=>path.join(__dirname,'..','www','js',p);
['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','fxnew.js','fxparams.js','seq.js','auto.js','sched.js'].forEach(f=>vm.runInContext(fs.readFileSync(J(f),'utf8'),ctx,{filename:f}));
const SD=ctx.SD,A=SD.Auto,SR=48000,DUR=1,def=SD.defs.analog.byId.cutoff,Q=18;
const lane={trk:0,id:'cutoff',mute:false,pts:[[0,.2,'L'],[192,.9,'L']]};/* 120BPM で1秒=192tick。cutoff 0.2→0.9 の掃引 */
const hz=t=>A.toValue(def,A.eval(lane,t*192));
function render(setup){
 const c=new W.OfflineAudioContext(1,SR*DUR,SR),o=c.createOscillator();o.type='sawtooth';o.frequency.value=110;
 const f=c.createBiquadFilter();f.type='peaking';f.Q.value=Q;f.gain.value=15;f.frequency.value=hz(0);o.connect(f);f.connect(c.destination);o.start();
 setup(c,f.frequency);return c.startRendering().then(b=>Float32Array.from(b.getChannelData(0)))}
const truth=()=>render((c,p)=>{const n=DUR*10000,a=new Float32Array(n+1);for(let i=0;i<=n;i++)a[i]=hz(i/10000);p.setValueCurveAtTime(a,0,DUR)});
const legacy=()=>render((c,p)=>{let last=null;for(let t=0;t<DUR;t+=.005){const v=hz(t);if(v!==last){p.setTargetAtTime(v,t,.02);last=v}}});
const curve=()=>render((c,p)=>{let now=0;const eng={run:true,pos:0,touch:{},io:{au:()=>({lanes:[lane],lp:null}),def:()=>def,bpm:()=>120}};
 const R=new SD.Sched.Runner({now:()=>now,sr:SR,bind:()=>[{param:p,map:x=>x}]});
 for(now=0;now<DUR-.1;now+=.02){eng.pos=now*192;R.pump(eng,now)}});
const d2=x=>{let m=0;for(let i=2;i<x.length;i++){const d=Math.abs(x[i]-2*x[i-1]+x[i-2]);if(d>m)m=d}return m};
const stat=(x,t)=>{x=x.subarray(0,Math.floor(SR*(DUR-.15)));t=t.subarray(0,x.length);let s=0,mx=0,mi=0,e=new Float32Array(x.length);for(let i=0;i<x.length;i++){e[i]=x[i]-t[i];s+=e[i]*e[i]}
 for(let i=2;i<e.length;i++){const d=Math.abs(e[i]-2*e[i-1]+e[i-2]);if(d>mx){mx=d;mi=i}}return{rms:Math.sqrt(s/x.length),click:mx,at:mi,d2:d2(x)}};
(async()=>{const t=await truth(),tt=d2(t),[a,b]=[stat(await legacy(),t),stat(await curve(),t)],cut=Math.floor(SR*(DUR-.1));
 console.log('旧方式 rms='+a.rms.toExponential(2)+' click='+a.click.toExponential(2));console.log('新方式 rms='+b.rms.toExponential(2)+' click='+b.click.toExponential(2));
 const r=b.rms/a.rms,rc=b.click/a.click;console.log('出力の2階差分最大(クリック検出): 真値='+tt.toExponential(2)+' 旧='+a.d2.toExponential(2)+' 新='+b.d2.toExponential(2)+' / 差の最大位置 旧='+a.at+' 新='+b.at);
  console.log('比(新/旧): rms='+r.toFixed(2)+' click='+rc.toFixed(2)+'(目安: 0.5以下)');
 const ok=isFinite(r)&&isFinite(rc)&&r<=.5&&rc<=.5;console.log(ok?'OK: 新方式は旧方式の半分以下(rms・クリック)':'NG: 完了条件(0.5以下)を満たさない');process.exit(ok?0:1)})();
