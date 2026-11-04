// SPECTRAL(sd-spectral)の検査: node test/fxw-spectral.js   FX-4a(FFT 基盤。モードなし=素通し)
//  ①FFT/IFFT(DFTとの一致・往復の誤差・窓の和) ②往復: 出力は入力を N サンプル遅らせたものに一致(SIZE 1024/2048・左右別・ステレオ) ③遅延=窓長の測定・MIX でコムが出ない(ドライの遅延補償)
//  ⑤(4b)FREEZE: 入力が止まっても保持・サインが持続・OFFで戻る / BLUR: 隣のビンが平均化される・amount=0 は素通し・エネルギーが暴れない
//  ⑦(4c)GATE: しきい値で弱い成分が消える・amount=0 素通し / ROBOT: パルス化(hop 周期)・エネルギー・ピーク / WHISPER: 位相ランダム・エネルギー保存・再現性 / SHIFT: 全成分が一律にずれる
//  ⑧(4d)TILT: 高域/低域への掛かり方・mode=0 に効かない・極端値 / ラック登録(sp・heavy・MAP・既定・チェーン位置)
//  ④enabled=0 は遅延ゼロの素通し・SIZE 切替・極端値・NaN
const H=require('./fxw5.js'),{procs}=H,SR=48000;
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
if(H.errors&&H.errors()>0){console.error('NG: fxw5 の検査が通っていない');process.exit(1)}
const C=procs['sd-spectral'];
/* ① FFT */
{const p=new C({}),N=p.N;
 const rnd=(()=>{let s=3;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296*2-1}})();
 const re0=Float64Array.from({length:N},rnd),im0=Float64Array.from({length:N},rnd),re=re0.slice(),im=im0.slice();
 /* DFT と比べる(いくつかのビンだけ。全部だと N² 回) */
 p.fft(re,im,false);let md=0;[0,1,5,100,N/2,N-3].forEach(k=>{let a=0,b=0;for(let n=0;n<N;n++){const w=-2*Math.PI*k*n/N;a+=re0[n]*Math.cos(w)-im0[n]*Math.sin(w);b+=re0[n]*Math.sin(w)+im0[n]*Math.cos(w)}md=Math.max(md,Math.abs(a-re[k]),Math.abs(b-im[k]))});
 ok(md<1e-8,'FFT は DFT と一致(最大差 '+md.toExponential(1)+')');
 p.fft(re,im,true);let e=0;for(let i=0;i<N;i++)e=Math.max(e,Math.abs(re[i]-re0[i]),Math.abs(im[i]-im0[i]));ok(e<1e-12,'FFT→IFFT の往復誤差 '+e.toExponential(1)+' < 1e-12');
 /* サインは該当ビンに立つ・パーセバル */
 const x=new Float64Array(N),y=new Float64Array(N);for(let i=0;i<N;i++)x[i]=Math.sin(2*Math.PI*37*i/N);p.fft(x,y,false);
 ok(Math.abs(Math.hypot(x[37],y[37])-N/2)<1e-6&&Math.hypot(x[40],y[40])<1e-6,'サイン(37周期)は37番ビンに N/2 で立つ');
 const z=new Float64Array(N),w=new Float64Array(N);let te=0;for(let i=0;i<N;i++){z[i]=rnd();te+=z[i]*z[i]}p.fft(z,w,false);let fe=0;for(let i=0;i<N;i++)fe+=z[i]*z[i]+w[i]*w[i];ok(Math.abs(fe/N-te)<1e-8*te,'パーセバルの等式');
 /* ハン窓²を hop=N/4 で足すと 1.5(=scale の逆数)で一定 */
 let dev=0;for(let n=0;n<p.hop;n++){let s=0;for(let k=0;k<4;k++)s+=p.win[n+k*p.hop]**2;dev=Math.max(dev,Math.abs(s-1.5))}ok(dev<1e-12,'ハン窓²の hop=N/4 の和は 1.5 で一定(偏り '+dev.toExponential(1)+')');}
/* ② 往復: 出力 = 入力を N サンプル遅らせたもの */
function drive(xL,xR,over,seq){return H.run('sd-spectral',xL,xR,Object.assign({enabled:1},over||{}),seq)}
const maxd=(a,b,from)=>{let m=0;for(let i=from||0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m};
[1024,2048].forEach(N=>{
 const n=SR,x=H.noise(n,.7),y=H.noise(n,.4).map((v,i)=>v*Math.cos(i*.003)),o=drive(x,y,{size:N});
 const dx=new Float32Array(n),dy=new Float32Array(n);for(let i=N;i<n;i++){dx[i]=x[i-N];dy[i]=y[i-N]}
 ok(maxd(o[0],dx)<1e-6&&maxd(o[1],dy)<1e-6,'SIZE '+N+': 出力は入力を N サンプル遅らせたものに一致(左右別々。最大差 '+Math.max(maxd(o[0],dx),maxd(o[1],dy)).toExponential(1)+')');
 ok(o[0].subarray(0,N).every(v=>Math.abs(v)<1e-9),'SIZE '+N+': 最初の N サンプルは無音');
 /* 遅延の測定(ヘルパー): MIX=100% でも MIX=0 でも N */
 ok(H.latency('sd-spectral',{enabled:1,size:N,mix:1})===N,'SIZE '+N+': 遅延=窓長 '+N+' サンプル(MIX=100%)');
 ok(H.latency('sd-spectral',{enabled:1,size:N,mix:0})===N,'SIZE '+N+': 遅延=窓長(MIX=0。ドライも同じだけ遅れる)');
 /* MIX の途中でも、ドライとウェットが同じ時刻なので濁らない=出力は常に遅延した入力に一致 */
 [.25,.5,.75].forEach(mx=>{const q=drive(x,y,{size:N,mix:mx});ok(maxd(q[0],dx,Math.round(.2*SR))<1e-6,'SIZE '+N+' MIX '+mx+': コムが出ない(遅延した入力と一致)')});
});
/* ③ MIX をレーンで動かしても(ブロックごと)、遅延した入力に一致 */
{const n=SR,x=H.noise(n,.6),o=drive(x,x.slice(),{size:1024},s=>({mix:.5+.5*Math.sin(s/3000)})),dx=new Float32Array(n);for(let i=1024;i<n;i++)dx[i]=x[i-1024];ok(maxd(o[0],dx,Math.round(.2*SR))<1e-6,'MIX を動かし続けても一致')}
/* ④ enabled=0: 遅延ゼロの素通し(ビット一致)・途中でON→OFF→ON */
{const n=SR/2-64,x=H.noise(n,.5),o=drive(x,x.slice(),{enabled:0});ok(maxd(o[0],x)===0,'enabled=0: 素通し(ビット一致・遅延ゼロ)');
 const q=drive(x,x.slice(),{},s=>({enabled:(s>>12)&1?0:1}));ok(q[0].every(isFinite),'ON/OFF を切り替え続けても有限')}
/* SIZE を途中で切り替えても有限・落ちない・切替後は新しい窓長の遅延 */
{const n=SR,x=H.noise(n,.5),o=drive(x,x.slice(),{},s=>({size:(s>>13)&1?2048:1024}));ok(o[0].every(isFinite)&&o[1].every(isFinite)&&Math.max(...o[0].map(Math.abs))<=2,'SIZE を切り替え続けても有限・暴れない')}
/* 極端値・不正値 */
H.extreme('sd-spectral',{enabled:1,size:2048,mix:1},2);H.extreme('sd-spectral',{enabled:1,size:1024,mix:.5},2);
{const n=SR/2,x=H.noise(n,.5);x[300]=NaN;x[700]=Infinity;x[1100]=-1e12;const o=drive(x,x.slice(),{});ok(o[0].every(isFinite)&&o[1].every(isFinite),'入力に NaN/Inf/巨大値: 出力は有限');
 const bad=drive(H.noise(n,.5),H.noise(n,.5),{size:NaN,mix:NaN});ok(bad[0].every(isFinite),'size/mix が NaN でも有限')}
{const n=SR,x=H.noise(n,.5),mono=new C({}),a=new Float32Array(128).fill(.3),o1=new Float32Array(128),o2=new Float32Array(128);for(let i=0;i<30;i++)mono.process([[a]],[[o1,o2]],{enabled:[1],size:[1024],mix:[1],mode:[0],amount:[.5],freeze:[0]});ok(o1.every(v=>Math.abs(v-.3)<1e-6)&&o2.every(v=>Math.abs(v-.3)<1e-6),'モノ入力は左右に同じ音')}
/* ⑤ FX-4b: FREEZE */
{const n=SR*2,f=1000,mk=(on,off)=>Float32Array.from({length:n},(_,i)=>(i>=on&&i<off)?.5*Math.sin(2*Math.PI*f*i/SR):0);
 const x=mk(0,Math.round(.5*SR)),rms=(y,a,b)=>{let t=0;for(let i=a;i<b;i++)t+=y[i]*y[i];return Math.sqrt(t/(b-a))};
 const g=(y,fr,a,b)=>{let c=0,s=0;for(let i=a;i<b;i++){c+=y[i]*Math.cos(2*Math.PI*fr*i/SR);s+=y[i]*Math.sin(2*Math.PI*fr*i/SR)}return Math.hypot(c,s)/(b-a)};
 const a0=Math.round(1.0*SR),b0=Math.round(1.8*SR),on=Math.round(.3*SR),off=Math.round(1.9*SR);
 const free=drive(x,x.slice(),{size:1024},s=>({freeze:s>=on&&s<off?1:0})),norm=drive(x,x.slice(),{size:1024});
 ok(rms(norm[0],a0,b0)<1e-6,'FREEZE なし: 入力が止まれば出力も止まる');
 const fr=rms(free[0],a0,b0),ref=rms(x,Math.round(.1*SR),Math.round(.4*SR));
 ok(fr>ref*.7&&fr<ref*1.4,'FREEZE: 入力が止まっても保持される(RMS '+fr.toFixed(3)+' / 元 '+ref.toFixed(3)+')');
 ok(g(free[0],1000,a0,b0)>g(free[0],700,a0,b0)*10&&g(free[0],1000,a0,b0)>g(free[0],1300,a0,b0)*10,'FREEZE: 周波数も保たれる(1kHz。ビン中心からずれたサインでも)');
 {const w=Math.round(.1*SR),v=[];for(let t=a0;t+w<=b0;t+=w)v.push(rms(free[0],t,t+w));ok(Math.max(...v)/Math.min(...v)<1.15,'FREEZE: 持続中の音量がゆらがない(最大/最小 '+(Math.max(...v)/Math.min(...v)).toFixed(3)+')')}
 const off2=drive(x,x.slice(),{size:1024},s=>({freeze:s>=on&&s<Math.round(1.2*SR)?1:0}));
 ok(rms(off2[0],Math.round(1.4*SR),Math.round(1.8*SR))<1e-4,'FREEZE を OFF にすると入力に戻る(止まった入力なら無音)');
 ok(free[0].every(isFinite)&&Math.max(...free[0].map(Math.abs))<1,'FREEZE: 有限・暴れない');
 /* 左右別々に凍る */
 const xr=mk(0,Math.round(.5*SR)).map((v,i)=>v*0),fl=drive(x,xr,{size:1024},s=>({freeze:s>=on?1:0}));ok(rms(fl[0],a0,b0)>.05&&rms(fl[1],a0,b0)<1e-6,'FREEZE: 左右別々(右が無音なら右は無音のまま)');
 /* ノイズを凍らせると、定常な音が続く */
 const nz=H.noise(n,.5).map((v,i)=>i<SR*.5?v:0),fn=drive(nz,nz.slice(),{size:2048},s=>({freeze:s>=Math.round(.3*SR)?1:0}));ok(rms(fn[0],a0,b0)>.05&&fn[0].every(isFinite),'FREEZE: ノイズも保持される(定常)');
 /* 切り替えを動かし続けても有限 */
 const tg=drive(H.noise(n,.5),H.noise(n,.5),{size:1024},s=>({freeze:(s>>11)&1}));ok(tg[0].every(isFinite)&&Math.max(...tg[0].map(Math.abs))<4,'FREEZE を ON/OFF し続けても有限')}
/* ⑥ FX-4b: BLUR */
{const N=1024,n=SR,k0=40,fq=k0*SR/N,x=Float32Array.from({length:n},(_,i)=>.5*Math.sin(2*Math.PI*fq*i/SR)),p=new C({});
 const spec=(y,at)=>{const re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++){re[i]=y[at+i]*p.win[i]}p.fft(re,im,false);return Float64Array.from({length:N/2+1},(_,k)=>Math.hypot(re[k],im[k]))};
 const base=drive(x,x.slice(),{size:N,mode:1,amount:0}),bl=drive(x,x.slice(),{size:N,mode:1,amount:.5}),off=drive(x,x.slice(),{size:N,mode:0,amount:1});
 const dx=new Float32Array(n);for(let i=N;i<n;i++)dx[i]=x[i-N];
 ok(maxd(base[0],dx,N)<1e-6,'BLUR amount=0: 素通し(往復と同じ)');ok(maxd(off[0],dx,N)<1e-6,'mode=0: amount を上げても素通し');
 const A=spec(base[0],SR/2),B=spec(bl[0],SR/2);
 ok(B[k0]<A[k0]*.8&&B[k0+4]>A[k0+4]*3&&B[k0-4]>A[k0-4]*3,'BLUR: ピークが下がり隣のビンが上がる(peak '+A[k0].toFixed(1)+'→'+B[k0].toFixed(1)+' / ±4ビン '+A[k0+4].toFixed(2)+'→'+B[k0+4].toFixed(2)+')');
 /* 大きいほど広がる */
 const w=(amt)=>{const y=drive(x,x.slice(),{size:N,mode:1,amount:amt}),S=spec(y[0],SR/2);return S[k0]};
 ok(w(1)<w(.5)&&w(.5)<w(.2)&&w(.2)<w(0),'BLUR: AMOUNT が大きいほどピークが下がる(広がる)('+w(0).toFixed(1)+' > '+w(.2).toFixed(1)+' > '+w(.5).toFixed(1)+' > '+w(1).toFixed(1)+')');
 /* 振幅は暴れない(ノイズ・矩形・DC・無音) */
 const nz=H.noise(n,.8),o=drive(nz,nz.slice(),{size:2048,mode:1,amount:1});ok(o[0].every(isFinite)&&Math.max(...o[0].map(Math.abs))<2,'BLUR: ノイズでも有限・暴れない');
 ok(drive(new Float32Array(n),new Float32Array(n),{mode:1,amount:1})[0].every(v=>v===0),'BLUR: 無音は無音のまま');
 H.extreme('sd-spectral',{enabled:1,size:2048,mix:1,mode:1,amount:1},4);H.extreme('sd-spectral',{enabled:1,size:1024,mix:1,mode:1,amount:1,freeze:1},4);
 /* BLUR の動かし続け・MIXでコムが出ない(BLUR中でもドライは遅延補償) */
 const mv=drive(nz,nz.slice(),{size:1024,mode:1},s=>({amount:((s>>10)&3)/3,mix:.5}));ok(mv[0].every(isFinite),'BLUR: AMOUNT を動かし続けても有限');
 const m0=drive(nz,nz.slice(),{size:1024,mode:1,amount:1,mix:0});ok(maxd(m0[0],(()=>{const d=new Float32Array(n);for(let i=1024;i<n;i++)d[i]=nz[i-1024];return d})(),SR/2)<1e-6,'BLUR: MIX=0 は遅延した原音のまま')}
/* ⑦ FX-4c: GATE・ROBOT・WHISPER・SHIFT */
{const n=SR,N=1024,rms=(y,a,b)=>{let t=0;for(let i=a;i<b;i++)t+=y[i]*y[i];return Math.sqrt(t/(b-a))},pk=(y,a)=>{let m=0;for(let i=a;i<y.length;i++)m=Math.max(m,Math.abs(y[i]));return m};
 const g=(y,fr,a,b)=>{let c=0,s=0;for(let i=a;i<b;i++){c+=y[i]*Math.cos(2*Math.PI*fr*i/SR);s+=y[i]*Math.sin(2*Math.PI*fr*i/SR)}return Math.hypot(c,s)/(b-a)};
 const a0=Math.round(.5*SR),b0=SR-2048,dly=(x,N)=>{const d=new Float32Array(x.length);for(let i=N;i<x.length;i++)d[i]=x[i-N];return d};
 const nz=H.noise(n,.5),sn=(f,a)=>Float32Array.from({length:n},(_,i)=>a*Math.sin(2*Math.PI*f*i/SR));
 /* amount=0 は GATE・ROBOT・WHISPER・SHIFT すべて素通し */
 [2,3,4,5].forEach(m=>{const o=drive(nz,nz.slice(),{size:N,mode:m,amount:0});ok(maxd(o[0],dly(nz,N),N)<1e-6,'mode '+m+' amount=0: 素通し')});
 /* GATE: 強い 1kHz+弱い 3kHz(1/25)+微小ノイズ。しきい値を上げると弱いものから消える */
 {const x=sn(1000,.5).map((v,i)=>v+.02*Math.sin(2*Math.PI*3000*i/SR)+.002*(nz[i]*2)),G=a=>drive(x,x.slice(),{size:N,mode:2,amount:a})[0];
  const r0=G(0),r1=G(.1),r3=G(.3),r6=G(.6);
  ok(g(r1,3000,a0,b0)>g(r0,3000,a0,b0)*.8&&g(r1,1000,a0,b0)>.2,'GATE: しきい値が低いと 3kHz も 1kHz も残る');
  ok(g(r3,3000,a0,b0)<g(r0,3000,a0,b0)*.05&&g(r3,1000,a0,b0)>.2,'GATE: しきい値(最大の9%)を上げると 3kHz だけ消える('+g(r0,3000,a0,b0).toFixed(4)+'→'+g(r3,3000,a0,b0).toFixed(5)+')');
  ok(rms(r1,a0,b0)<=rms(r0,a0,b0)+1e-6&&rms(r3,a0,b0)<rms(r0,a0,b0)*.999&&rms(r6,a0,b0)<=rms(r3,a0,b0)+1e-6&&rms(r3,a0,b0)<=rms(r1,a0,b0)+1e-6,'GATE: AMOUNT が大きいほど音は減る(単調)');
  ok(Math.max(pk(r0,N),pk(r6,N))<1,'GATE: 暴れない')}
 /* ROBOT: 出力が hop(N/4)周期のパルス=ブザーになる。エネルギーは大きく減らない・ピークは有限 */
 [1024,2048].forEach(NN=>{const o=drive(nz,nz.slice(),{size:NN,mode:3,amount:1})[0],hp=NN/4,ac=l=>{let s=0,e=0;for(let i=a0;i<n-hp-8;i++){s+=o[i]*o[i+l];e+=o[i]*o[i]}return s/e};
  ok(ac(hp)>.8&&Math.abs(ac(hp/2+3))<.3,'ROBOT SIZE '+NN+': hop('+hp+')周期で繰り返す(ac '+ac(hp).toFixed(2)+' / ずらすと '+ac(hp/2+3).toFixed(2)+')');
  const r=rms(o,a0,b0)/rms(nz,a0,b0);ok(r>.6&&r<1.2,'ROBOT SIZE '+NN+': エネルギーが保たれる(RMS比 '+r.toFixed(2)+')');
  ok(pk(o,NN)<nz.reduce((m,v)=>Math.max(m,Math.abs(v)),0)*12,'ROBOT SIZE '+NN+': ピークは有限(入力の12倍以下。'+(pk(o,NN)/.5).toFixed(1)+'倍)')});
 {const a=drive(nz,nz.slice(),{size:N,mode:3,amount:.5})[0],b=drive(nz,nz.slice(),{size:N,mode:3,amount:1})[0];ok(rms(a,a0,b0)>=rms(b,a0,b0)-1e-6,'ROBOT: AMOUNT は寄せる量(0.5 は 1 より元に近い)')}
 /* WHISPER: 位相ランダム→サインが散る。エネルギーは保存。同じ入力は同じ結果。モノはモノのまま */
 {const x=sn(1000,.5),n0=drive(x,x.slice(),{size:N,mode:0})[0],w=drive(x,x.slice(),{size:N,mode:4,amount:1}),r=rms(w[0],a0,b0)/rms(n0,a0,b0);
  ok(r>.8&&r<1.25,'WHISPER: エネルギーが保たれる(RMS比 '+r.toFixed(2)+')');
  ok(g(w[0],1000,a0,b0)<g(n0,1000,a0,b0)*.5,'WHISPER: サインの純度が下がる(1kHz '+g(n0,1000,a0,b0).toFixed(3)+'→'+g(w[0],1000,a0,b0).toFixed(3)+')');
  ok(pk(w[0],N)<1.2,'WHISPER: ピークが暴れない('+pk(w[0],N).toFixed(2)+')');
  const w2=drive(x,x.slice(),{size:N,mode:4,amount:1});ok(maxd(w[0],w2[0])===0&&maxd(w[0],w[1])===0,'WHISPER: 同じ入力は同じ結果(固定シード)・モノは左右同じ');
  const h=drive(nz,nz.slice(),{size:2048,mode:4,amount:.5})[0],rr=rms(h,a0,b0)/rms(nz,a0,b0);ok(rr>.8&&rr<1.25,'WHISPER: amount .5 でもエネルギー保存(RMS比 '+rr.toFixed(2)+')');
  const rs=drive(x,x.slice(),{size:N,mode:4,amount:1},s=>({enabled:s<SR/2?1:(s<SR/2+4096?0:1)}));ok(rs[0].every(isFinite),'WHISPER: OFF→ON でシードが戻っても有限')}
 /* SHIFT: 全成分が一律に Δ だけずれる(1000→1750 / 2500→3250。ビン中心でない 1000Hz でも) */
 [[1024,.5],[2048,.5]].forEach(([NN,a])=>{const d=.25*3000,x=sn(1000,.4).map((v,i)=>v+.3*Math.sin(2*Math.PI*2500*i/SR)),o=drive(x,x.slice(),{size:NN,mode:5,amount:a})[0];
  const lo=g(o,1000+d,a0,b0),hi=g(o,2500+d,a0,b0),off=Math.max(g(o,1000,a0,b0),g(o,2500,a0,b0),g(o,1000+d+300,a0,b0));
  ok(lo>.15&&hi>.1&&off<Math.min(lo,hi)*.15,'SHIFT SIZE '+NN+': 1000→'+(1000+d)+' と 2500→'+(2500+d)+' に一律にずれる(振幅 '+lo.toFixed(3)+'/'+hi.toFixed(3)+'。元の位置 '+off.toFixed(3)+')');
  ok(Math.abs(rms(o,a0,b0)/rms(x,a0,b0)-1)<.1,'SHIFT SIZE '+NN+': 音量は変わらない')});
 {const x=sn(1000,.4),o=drive(x,x.slice(),{size:N,mode:5,amount:.05})[0];ok(maxd(o,dly(x,N),N)<1e-6,'SHIFT: ずらし量が1ビン未満なら素通し')}
 {const w=(a)=>{const x=sn(1000,.4),o=drive(x,x.slice(),{size:N,mode:5,amount:a})[0];return g(o,1000+Math.round(a*a*3000*N/SR)*SR/N,a0,b0)};ok(w(.3)>.15&&w(.7)>.15&&w(1)>.15,'SHIFT: AMOUNT 0.3・0.7・1.0 のどれでも round(amount²×3000Hz÷ビン幅)ビンだけずれる')}
 /* 極端値・動かし続け・切替 */
 [2,3,4,5].forEach(m=>{H.extreme('sd-spectral',{enabled:1,size:2048,mix:1,mode:m,amount:1},12);H.extreme('sd-spectral',{enabled:1,size:1024,mix:1,mode:m,amount:.5,freeze:1},12)});
 {const mv=drive(nz,nz.slice(),{size:1024},s=>({mode:2+((s>>11)&3),amount:((s>>9)&3)/3,mix:.5}));ok(mv[0].every(isFinite)&&mv[1].every(isFinite)&&pk(mv[0],0)<6,'MODE と AMOUNT を動かし続けても有限・暴れない')}
 {const z=drive(new Float32Array(n),new Float32Array(n),{mode:5,amount:1});ok(z[0].every(v=>v===0),'SHIFT: 無音は無音のまま')}
 {const x=sn(1000,.5),f1=drive(x,x.slice(),{size:N,mode:5,amount:.5,freeze:1},s=>({freeze:s>9000?1:0}));ok(f1[0].every(isFinite),'FREEZE+SHIFT: 有限')}}
/* ⑧ FX-4d: TILT */
{const n=SR,N=1024,a0=Math.round(.5*SR),b0=SR-2048,g=(y,fr,a,b)=>{let c=0,s=0;for(let i=a;i<b;i++){c+=y[i]*Math.cos(2*Math.PI*fr*i/SR);s+=y[i]*Math.sin(2*Math.PI*fr*i/SR)}return Math.hypot(c,s)/(b-a)};
 const x=Float32Array.from({length:n},(_,i)=>.5*Math.sin(2*Math.PI*1000*i/SR)+.02*Math.sin(2*Math.PI*200*i/SR)+.02*Math.sin(2*Math.PI*8000*i/SR));
 const G=t=>drive(x,x.slice(),{size:N,mode:2,amount:.3,tilt:t})[0],r0=G(0),rp=G(1),rm=G(-1),ref=drive(x,x.slice(),{size:N,mode:0})[0],lo=g(ref,200,a0,b0),hi=g(ref,8000,a0,b0);
 ok(g(r0,200,a0,b0)<lo*.08&&g(r0,8000,a0,b0)<hi*.08,'TILT=0: GATE は低域も高域も同じように消す(200Hz '+(g(r0,200,a0,b0)/lo).toFixed(3)+' / 8kHz '+(g(r0,8000,a0,b0)/hi).toFixed(3)+')');
 ok(g(rp,8000,a0,b0)/hi<.3&&g(rp,200,a0,b0)/lo>.5,'TILT=+1: 高域ほど強く掛かる(8kHz '+(g(rp,8000,a0,b0)/hi).toFixed(2)+' は消え・200Hz '+(g(rp,200,a0,b0)/lo).toFixed(2)+' は残る)');
 ok(g(rm,200,a0,b0)/lo<.45&&g(rm,8000,a0,b0)/hi>.8,'TILT=-1: 低域ほど強く掛かる(200Hz '+(g(rm,200,a0,b0)/lo).toFixed(2)+' は消え・8kHz '+(g(rm,8000,a0,b0)/hi).toFixed(2)+' は残る)');
 ok(g(rp,1000,a0,b0)>.2&&g(rm,1000,a0,b0)>.2,'TILT: 主成分(1kHz)は残る');
 const m0=drive(x,x.slice(),{size:N,mode:0,tilt:1})[0];ok(maxd(m0,ref)===0,'mode=0 には TILT は効かない(ビット一致)');
 const a1=drive(x,x.slice(),{size:N,mode:5,amount:0,tilt:1})[0],a2=drive(x,x.slice(),{size:N,mode:5,amount:0,tilt:0})[0];ok(maxd(a1,a2)===0,'amount=0 なら TILT を動かしても素通し(ビット一致)');
 [1,2,3,4,5].forEach(m=>{[-1,1].forEach(t=>{H.extreme('sd-spectral',{enabled:1,size:2048,mix:1,mode:m,amount:1,tilt:t},12)})});
 const mv=drive(x,x.slice(),{size:1024,mode:3},s=>({amount:.7,tilt:Math.sin(s/9000)}));ok(mv[0].every(isFinite)&&maxd(mv[0],new Float32Array(n))<8,'TILT を動かし続けても有限・暴れない')}
/* ラック登録(ブラウザ側と同じ読み込み順) */
{const fs=require('fs'),path=require('path'),vm=require('vm'),JS=path.join(__dirname,'..','www','js'),ctx={console,setTimeout,clearTimeout,Float32Array,Float64Array};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 ['params.js','mixdefs.js','fxnew.js','fxparams.js','fxdsp.js','fxworklets.js','bus.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f}));const SD=ctx.SD,r=SD.FXR.find(q=>q.k==='sp');
 ok(!!r&&r.wn==='sd-spectral'&&r.on==='spOn'&&r.heavy===true&&r.ids.join()==='spOn,spMode,spAmt,spFz,spTilt,spSize,spMix','ラック登録: SPECTRAL(spOn・heavy・つまみ7個)');
 ok(SD.FXCHAIN.indexOf('sp')===SD.FXCHAIN.indexOf('vc')+1&&SD.FXCHAIN.indexOf('sp')<SD.FXCHAIN.indexOf('tr'),'チェーン: vc の次・tr の前');
 const D=SD.defs.analog.byId;ok(D.spOn.def===0&&D.spMode.def===0&&D.spMode.opts.length===5&&D.spFz.def===0&&D.spFz.opts.length===2&&D.spSize.def===0&&D.spMix.def===1&&D.spTilt.def===0&&D.spAmt.def===.5&&SD.FXDEF.spOn===0&&SD.FXDEF.spFz===0,'既定: OFF・BLUR・FREEZE OFF・SIZE 1024(旧データはここで読まれる。FREEZE は seg=レーンで切替可)');
 ok(SD.FXIDS.indexOf('spFz')>=0&&SD.FXIDS.indexOf('spTilt')>=0&&SD.FXR.length<=SD.FXMAX,'FXIDS に含まれる(保存・読み込み)・最大数以内('+SD.FXR.length+'/'+SD.FXMAX+')');
 const names=C.parameterDescriptors.map(d=>d.name),ids=r.ids.filter(i=>SD.FXMAP[i]);ok(ids.length===6&&ids.every(i=>names.indexOf(SD.FXMAP[i][1])>=0),'MAP: つまみ6個(spOn以外)がすべてワークレットのパラメーターに対応');
 const M=SD.FXMAP;ok([0,1,2,3,4].map(v=>M.spMode[2](v)).join()==='1,2,3,4,5'&&M.spSize[2](0)===1024&&M.spSize[2](1)===2048&&M.spMode[3]===0&&M.spFz[3]===0&&M.spSize[3]===0&&M.spAmt[3]===1,'MAP: MODE→1〜5・SIZE→1024/2048・離散は smooth なし')}
if(err){console.error(err+'件 NG');process.exit(1)}console.log('fxw-spectral OK');
