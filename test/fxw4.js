// v3.4: BITCRUSH / RING MOD / TAPE STOP のワークレット挙動 + DUCK(包絡の純粋関数・バスのスケジュール・seq連携): node test/fxw4.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const SR=48000,procs={};
global.sampleRate=SR;global.currentTime=0;global.currentFrame=0;
global.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},onmessage:null}}};
global.registerProcessor=(n,c)=>{procs[n]=c};
['bitcrush','ringmod','tapestop'].forEach(f=>new Function(fs.readFileSync(path.join(__dirname,'..','fx-src',f+'.js'),'utf8'))());
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
const N=SR*2;
function run(name,xL,xR,over,seq){
 const C=procs[name],p=new C({}),params={};
 C.parameterDescriptors.forEach(d=>{params[d.name]=[d.defaultValue]});
 const n=xL.length,L=new Float32Array(n),R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128);
 for(let s=0;s+128<=n;s+=128){
  const o=Object.assign({},over||{},seq?seq(s):{});Object.keys(o).forEach(k=>{params[k]=[o[k]]});
  p.process([[xL.subarray(s,s+128),xR.subarray(s,s+128)]],[[oL,oR]],params);L.set(oL,s);R.set(oR,s)}
 return [L,R];
}
const sine=(f,a,n)=>Float32Array.from({length:n||N},(_,i)=>(a||.5)*Math.sin(2*Math.PI*f*i/SR));
const noise=a=>{let s=7;return Float32Array.from({length:N},()=>{s=(s*1664525+1013904223)>>>0;return(s/4294967296*2-1)*(a||.5)})};
const rms=(y,a,b)=>{let s=0;for(let i=a;i<b;i++)s+=y[i]*y[i];return Math.sqrt(s/(b-a))};
const gz=(y,f)=>{let re=0,im=0;const a=N/2;for(let i=a;i<N;i++){const w=2*Math.PI*f*i/SR;re+=y[i]*Math.cos(w);im+=y[i]*Math.sin(w)}return 2*Math.hypot(re,im)/(N-a)};
const same=(a,b,tol)=>{let d=0;for(let i=0;i<a.length;i++)d=Math.max(d,Math.abs(a[i]-b[i]));return d<=tol};
const zc=(y,a,b)=>{let c=0;for(let i=a+1;i<b;i++)if(y[i-1]<=0&&y[i]>0)c++;return c/((b-a)/SR)};
// ---- BITCRUSH ----
{const x=noise(.8);
 ok(same(run('sd-bitcrush',x,x,{enabled:1,bits:16,rate:1,mix:1})[0],x,0),'BC: 16bit・間引き1は入力と一致');
 ok(same(run('sd-bitcrush',x,x,{enabled:0,bits:2,rate:9,mix:1})[0],x,0),'BC: OFFは入力と一致');
 ok(same(run('sd-bitcrush',x,x,{enabled:1,bits:3,rate:5,mix:0})[0],x,1e-6),'BC: MIX0%は原音');
 const [y]=run('sd-bitcrush',x,x,{enabled:1,bits:4,rate:1,mix:1});let bad=0;for(const v of y)if(Math.abs(v*8-Math.round(v*8))>1e-5)bad++;
 ok(bad===0,'BC: 4bit は 1/8 刻みの値だけ('+bad+'個ずれ)');
 const [b1]=run('sd-bitcrush',x,x,{enabled:1,bits:1,rate:1,mix:1});ok(b1.every(v=>v===-1||v===0||v===1),'BC: 1bit は -1/0/+1 だけ');
 const [d]=run('sd-bitcrush',x,x,{enabled:1,bits:16,rate:8,mix:1});let runs=0,okr=true;for(let i=0;i+8<=4000;i+=8){for(let k=1;k<8;k++)if(d[i+k]!==d[i])okr=false;runs++}
 ok(okr,'BC: 間引き8は8サンプルごとに同じ値(ホールド)');
 const [e]=run('sd-bitcrush',sine(1000,.5),sine(1000,.5),{enabled:1,bits:16,rate:12,mix:1});
 ok(gz(e,1000)>.4&&(gz(e,SR/12-1000)>.05),'BC: 間引くと折り返し成分(エイリアシング)が出る '+gz(e,SR/12-1000).toFixed(3));
 [[1,1,1],[1,64,1],[16,64,.5],[8,1,1]].forEach(([bits,rate,mix])=>{const y=run('sd-bitcrush',x,x,{enabled:1,bits,rate,mix})[0];ok(y.every(v=>isFinite(v)&&Math.abs(v)<=1.0001),'BC: 極端な値でも有限・範囲内 '+bits+'/'+rate)});}
// ---- RING MOD ----
{const x=sine(1000,.5);
 ok(same(run('sd-ringmod',x,x,{enabled:0,freq:300,mix:1})[0],x,0),'RM: OFFは入力と一致');
 ok(same(run('sd-ringmod',x,x,{enabled:1,freq:300,mix:0})[0],x,1e-6),'RM: MIX0%は原音');
 const [y]=run('sd-ringmod',x,x,{enabled:1,freq:300,mix:1,shape:0});
 ok(gz(y,700)>.2&&gz(y,1300)>.2&&gz(y,1000)<.03,'RM: 1000Hz×300Hz → 700Hz・1300Hz だけ(元の1000Hzは消える) '+gz(y,700).toFixed(3)+'/'+gz(y,1300).toFixed(3)+'/'+gz(y,1000).toFixed(3));
 const [q]=run('sd-ringmod',x,x,{enabled:1,freq:300,mix:1,shape:1});ok(q.every((v,i)=>Math.abs(Math.abs(v)-Math.abs(x[i]))<1e-6),'RM: 矩形は入力の符号を反転するだけ(音量は変わらない)');
 const [m]=run('sd-ringmod',x,x,{enabled:1,freq:300,mix:.5,shape:0});ok(Math.abs(gz(m,1000)-.25)<.03,'RM: MIX50% は原音が半分残る '+gz(m,1000).toFixed(3));
 const n=noise(1);[5000,20].forEach(f=>ok(run('sd-ringmod',n,n,{enabled:1,freq:f,mix:1})[0].every(v=>isFinite(v)&&Math.abs(v)<=1.0001),'RM: '+f+'Hz でも有限・範囲内'));}
// ---- TAPE STOP ----
{const x=sine(1000,.5);
 ok(same(run('sd-tapestop',x,x,{enabled:1,speed:1})[0],x,1e-6),'TS: 速度100%は入力と一致(遅れなし)');
 ok(same(run('sd-tapestop',x,x,{enabled:0,speed:.3})[0],x,0),'TS: OFFは入力と一致');
 const [h]=run('sd-tapestop',x,x,{enabled:1,speed:.5});const f=zc(h,2400,24000);ok(Math.abs(f-500)<15,'TS: 速度50%で出力周波数が半分 '+f.toFixed(1)+'Hz');
 const [q]=run('sd-tapestop',x,x,{enabled:1,speed:.25});const f4=zc(q,2400,24000);ok(Math.abs(f4-250)<12,'TS: 速度25%で1/4 '+f4.toFixed(1)+'Hz');
 // 0%へ落とす(約0.5秒かけて) → 無音に近づく → 1へ戻すと追いつく
 const x3=sine(1000,.5,SR*5),sp=s=>{const t=s/SR;return{speed:t<.5?1-t/.5:t<3?0:t<3.3?(t-3)/.3:1}};
 const [r]=run('sd-tapestop',x3,x3,{enabled:1},sp);
 ok(rms(r,SR*2,SR*3)<1e-3,'TS: 速度0%では止まって無音(DCを出さない) '+rms(r,SR*2,SR*3).toExponential(1));
 ok(r.every(v=>isFinite(v)&&Math.abs(v)<=.5001),'TS: 全区間で有限・範囲内');
 ok(same(r.subarray(SR*4,SR*5),x3.subarray(SR*4,SR*5),1e-4),'TS: 速度が100%に戻ったあとは入力と一致(遅れを残さない)');
 let mx=0;for(let i=1;i<r.length;i++)mx=Math.max(mx,Math.abs(r[i]-r[i-1]));ok(mx<.25,'TS: 急な不連続(ぷつ音)が出ない 最大差 '+mx.toFixed(3));
 // 落としている途中で周波数が下がる
 const fa=zc(r,0,SR*.15),fb=zc(r,SR*.35,SR*.5);ok(fb<fa*.7,'TS: 落としている間にピッチが下がる '+fa.toFixed(0)+' → '+fb.toFixed(0)+'Hz');}
// ---- DUCK: 包絡の純粋関数 ----
const ctx={console,setTimeout,clearTimeout,setInterval,clearInterval};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
const L=f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..','www','js',f),'utf8'),ctx,{filename:f});
// 偽AudioContext(AudioParam のイベントを記録)
let nid=0;
function Pm(v){const p={value:v,ev:[],setTargetAtTime(x){p.value=x},setValueAtTime(x,t){p.ev.push({k:'s',v:x,t});p.value=x},linearRampToValueAtTime(x,t){p.ev.push({k:'r',v:x,t})},cancelScheduledValues(t){p.ev=p.ev.filter(e=>e.t<t)}};return p}
function evalP(p,t){let pv=1,pt=-1e9;for(const e of p.ev){if(e.t>t){if(e.k==='r'){return pv+(e.v-pv)*(t-pt)/(e.t-pt)}return pv}pv=e.v;pt=e.t}return pv}
function node(type){const n={type,kind:type,id:++nid,out:[],channelCount:2,channelCountMode:'max',connect(t){n.out.push(t);return t},disconnect(){n.out=[]},start(){}};
 n.gain=Pm(1);n.pan=Pm(0);n.Q=Pm(1);n.delayTime=Pm(0);n.frequency=Pm(350);n.threshold=Pm(0);n.knee=Pm(0);n.ratio=Pm(0);n.attack=Pm(0);n.release=Pm(0);return n}
class AC{constructor(){this.audioWorklet={addModule:()=>Promise.resolve()};this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination=node('dest')}
 resume(){}createGain(){return node('gain')}createWaveShaper(){return node('shaper')}createDelay(){return node('delay')}createBiquadFilter(){return node('biquad')}createConvolver(){return node('conv')}
 createDynamicsCompressor(){return node('dyn')}createAnalyser(){return node('an')}createStereoPanner(){return node('pan')}createChannelMerger(){return node('merger')}createBuffer(c,l){const d=[new Float32Array(l),new Float32Array(l)];return{len:l,getChannelData:i=>d[i]}}}
class AWN{constructor(x,name,opt){this.kind=name;this.out=[];this.connect=q=>{this.out.push(q);return q};this.disconnect=()=>{this.out=[]};this.name=name;this.opt=opt;this.par={};this.parameters={get:k=>this.par[k]||(this.par[k]=Pm(0))};this.port={onmessage:null}}}
ctx.AudioWorkletNode=AWN;ctx.Blob=class{constructor(a){this.a=a}};ctx.URL={createObjectURL:()=>'blob:x'};ctx.AudioContext=AC;
['mixdefs.js','fxdsp.js','fxworklets.js','bus.js','seq.js'].forEach(L);
const SD=ctx.SD;
(async()=>{
 const M={dkDepth:.8,dkAtk:10,dkHold:30,dkRel:200,dkCurve:0},E=SD.duckEnv;
 ok(E(M,-1)===1&&Math.abs(E(M,0)-1)<1e-9,'DUCK: ノートオン前・直後は1');
 ok(Math.abs(E(M,.010)-.2)<1e-9,'DUCK: dkAtk 後に最小(1−depth)');
 ok(Math.abs(E(M,.030)-.2)<1e-9&&Math.abs(E(M,.040)-.2)<1e-9,'DUCK: HOLD の間は最小のまま');
 ok(Math.abs(E(M,.040+.100)-.6)<1e-9,'DUCK: 戻りの中間で線形(CURVE0)');
 ok(E(M,.2401)===1&&E(M,5)===1,'DUCK: dkRel 後に1へ戻る');
 const mc=c=>Object.assign({},M,{dkCurve:c}),mid=.040+.100;
 ok(E(mc(1),mid)>E(mc(0),mid)&&E(mc(0),mid)>E(mc(-1),mid),'DUCK: CURVE+は速く・−は遅く戻る '+[1,0,-1].map(c=>E(mc(c),mid).toFixed(2)).join('/'));
 ok(E(Object.assign({},M,{dkDepth:0}),.02)===1,'DUCK: 深さ0は何も変えない');
 ok(Math.abs(E(Object.assign({},M,{dkAtk:0}),0)-.2)<1e-9,'DUCK: ATK0 は即最小');
 let mono=true,pv=0;for(let t=.04;t<.25;t+=.001){const v=E(mc(.5),t);if(v<pv-1e-9)mono=false;pv=v}ok(mono,'DUCK: 戻りは単調増加');
 // ---- バスのスケジュール ----
 const B=new SD.Bus();B.init();await B.wkP;
 B.setMix(1,'dkOn',1);B.setMix(1,'dkSrc',0);B.setMix(1,'dkDepth',.8);B.setMix(1,'dkAtk',10);B.setMix(1,'dkHold',30);B.setMix(1,'dkRel',200);B.setMix(1,'dkCurve',0);
 B.setMix(2,'dkOn',1);B.setMix(2,'dkSrc',3);B.setMix(0,'dkOn',1);B.setMix(0,'dkSrc',0);B.strip(0);B.strip(1);B.strip(2);
 B.duck(0,1);
 const g1=B.strip(1).dk.gain;
 ok(Math.abs(evalP(g1,.99)-1)<1e-9&&Math.abs(evalP(g1,1)-1)<1e-9,'DUCK(バス): ノートオン時刻までは1');
 let maxd=0;for(let dt=0;dt<.3;dt+=.0007)maxd=Math.max(maxd,Math.abs(evalP(g1,1+dt)-E(M,dt)));ok(maxd<.02,'DUCK(バス): 予約した折れ線が包絡の式と一致 最大差 '+maxd.toFixed(4));
 ok(Math.abs(evalP(g1,1.01)-.2)<.01&&Math.abs(evalP(g1,1.25)-1)<1e-6,'DUCK(バス): dkAtk 後に最小・dkRel 後に1');
 ok(B.strip(2).dk.gain.ev.length===0,'DUCK(バス): ソースが違うトラックは動かない');
 ok(B.strip(0).dk.gain.ev.length===0,'DUCK(バス): 自分自身をソースにしても動かない');
 // 重なり: へこみの途中(ホールド中)で次のノート → その時点の値から下げ直す
 B.duck(0,1.02);ok(Math.abs(evalP(g1,1.02)-.2)<.01,'DUCK(バス): 連続ノートでも最小値から継続');
 ok(Math.abs(evalP(g1,1.02+.01)-.2)<.01&&evalP(g1,1.02+.1)<.6,'DUCK(バス): 2発目の包絡が1発目に上書きされる');
 // 戻りの途中(1.14秒=戻り半ば)でもう1発 → 半ばの値(.6付近)から下がる
 B.duckReset();ok(Math.abs(evalP(g1,5)-1)<1e-9,'DUCK: duckReset で1へ');
 B.duck(0,10);B.duck(0,10.14);const a0=evalP(g1,10.14);ok(Math.abs(a0-.6)<.03,'DUCK(バス): 戻りの途中のノートは、その時点のゲインから始まる '+a0.toFixed(2));
 B.setMix(1,'dkOn',0);ok(B.dkLast[1]===null&&Math.abs(evalP(g1,10.2)-1)<1e-9,'DUCK: OFFにするとゲインが1へ戻る');
 B.duck(0,20);ok(B.strip(1).dk.gain.ev.every(e=>e.t<20),'DUCK: OFFのトラックは動かない');
 // ストリップの接続: in→dk→vol→pan→mixIn
 const s=B.strip(1);ok(s.in.out[0]===s.dk&&s.dk.out[0]===s.vol,'ストリップ: in→DUCK→VOL');
 // ---- 新INSERT(BITCRUSH・RING MOD・TAPE STOP)の配線とつまみ ----
 const W=new SD.Bus();['bcOn','rmOn','tsOn'].forEach(i=>W.p[i]=1);W.init();await W.wkP;const t=W.st;
 ok(t.bc&&t.rm&&t.ts&&t.bc.w.name==='sd-bitcrush'&&t.rm.w.name==='sd-ringmod'&&t.ts.w.name==='sd-tapestop','ONにしたとき3つのワークレットが作られる');
 const rch=(a,b,seen=new Set())=>{if(a===b)return true;if(seen.has(a))return false;seen.add(a);return a.out.some(q=>rch(q,b,seen))};
 ok(rch(W.mixIn,t.bc.in)&&rch(t.bc.out,t.rm.in)&&rch(t.rm.out,t.ts.in)&&rch(t.ts.out,W.n.ins),'配線: ミックス→BC→RM→TAPE STOP→ins');
 W.set('bcBits',5);W.set('bcRate',7);W.set('bcMix',.6);const P=(k,n)=>t[k].w.parameters.get(n).value;ok(P('bc','bits')===5&&P('bc','rate')===7&&P('bc','mix')===.6,'BC つまみ→ワークレット');
 W.set('rmFreq',1234);W.set('rmMix',.3);W.set('rmShape',1);ok(P('rm','freq')===1234&&P('rm','mix')===.3&&P('rm','shape')===1,'RM つまみ→ワークレット');
 W.set('tsSpeed',.4);ok(P('ts','speed')===.4,'TS つまみ→ワークレット');
 // TRIG: 押すと tsTime で0へ、離すと tsSpeed へ
 const sp=t.ts.w.parameters.get('speed');sp.ev=[];sp.value=1;W.set('tsTime',.8);W.set('tsSpeed',1);W.ctx.currentTime=2;
 ok(W.tsTrig(true)&&Math.abs(evalP(sp,2.8)-0)<1e-9&&Math.abs(evalP(sp,2.4)-.5)<.01,'TRIG押下: tsTime(0.8s)かけて速度0へ');
 sp.value=0;W.ctx.currentTime=3;W.tsTrig(false);ok(Math.abs(evalP(sp,3.4)-1)<1e-9,'TRIG離す: 加速して tsSpeed(100%)へ戻る');
 W.set('bcOn',0);W.set('rmOn',0);W.set('tsOn',0);ok(!rch(W.mixIn,t.bc.in)&&!rch(W.mixIn,t.ts.in),'OFFにすると接続から外れる');
 ok(!new SD.Bus().tsTrig(true),'未初期化・OFFのとき TRIG は何もしない');
 // 旧データ: 新IDが無い(p未設定)→既定OFFで鳴らない
 const O=new SD.Bus();O.init();await O.wkP;ok(!O.st.bc&&!O.st.rm&&!O.st.ts&&O.live===0,'旧データ(新ID無し)は新エフェクトが働かない');
 // ---- seq連携: ノートオンで io.duck(trk,t)。ミュート中のトラックでも合図は出る ----
 const calls=[],io={now:()=>0,on(){},off(){},sched(fn,t){return setTimeout(fn,0)},unsched(id){clearTimeout(id)},duck:(k,t)=>calls.push([k,+t.toFixed(4)]),duckClear(){calls.push('clr')}};
 const Q=new SD.Play(io);Q.setMode('trk');Q.tr[0].steps[0].on=true;Q.tr[0].steps[4].on=true;Q.tr[0].steps[5].on=true;Q.tr[0].steps[5].tie=true;Q.tr[1].steps[2].on=true;Q.tr[1].mute=true;
 Q.tnt=1;Q.g=0;for(let i=0;i<8;i++)Q.trkStep();Q.setMode('key');
 const t0=calls.filter(c=>c[0]===0).map(c=>c[1]),t1=calls.filter(c=>c[0]===1).map(c=>c[1]);
 ok(t0.length===2&&Math.abs(t0[0]-1)<1e-6,'seq: T1のノート(タイは除く)ごとに duck(0,時刻) '+JSON.stringify(t0));
 ok(t1.length===1&&Math.abs(t1[0]-1.25)<1e-6,'seq: ミュート中のT2でも、ノートの時刻に合図が出る '+JSON.stringify(t1));
 Q.setMode('trk');Q.start();Q.stop();ok(calls.includes('clr'),'seq: 停止で duckClear');Q.setMode('key');
 // 旧データ互換: dk無しのmixは既定(OFF)で読める
 const old=SD.mixClean({tVol:.5,tPan:.2});ok(old.dkOn===0&&old.dkDepth===.7&&old.dkSrc===0,'旧データ(dk無し)はOFF・既定値');
 const bad=SD.mixClean({dkSrc:9,dkDepth:5,dkRel:1,dkOn:.4});ok(bad.dkSrc===SD.MAXT-1&&bad.dkDepth===1&&bad.dkRel===20&&bad.dkOn===0,'範囲外は丸め・SEGは整数');
 if(err){console.error(err+'件NG');process.exit(1)}console.log('OK: v3.4(BITCRUSH・RING MOD・TAPE STOP・DUCK)');process.exit(0);
})();
