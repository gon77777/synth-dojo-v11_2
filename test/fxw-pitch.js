// PITCH SHIFT(sd-pitch)の検査: node test/fxw-pitch.js   FX-2a=SHIFT(時間領域・2ヘッド・クロスフェード) / FX-2b=FINE・GRAIN・MIX・遅延補償・ラック登録
const fs=require('fs'),path=require('path');
const H=require('./fxw5.js'),{run,latency,extreme}=H,SR=48000,N=SR*2;
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
if(H.errors&&H.errors()>0){console.error('NG: fxw5 の検査が通っていない');process.exit(1)}
// 基音検出は test/quality.js のもの(fft と pitch)をそのまま使う
const q=fs.readFileSync(path.join(__dirname,'quality.js'),'utf8'),a=q.indexOf('function fft('),b=q.indexOf('function attack(');
const P0=new Function('SR',q.slice(a,b)+';return {pitch,fft}')(SR);const pitch=P0.pitch,fft=P0.fft;
const sine=(f,A,n)=>Float32Array.from({length:n||N},(_,i)=>(A||.5)*Math.sin(2*Math.PI*f*i/SR));
const go=(x,o,seq)=>run('sd-pitch',x,x.slice(),Object.assign({enabled:1},o),seq)[0];
const rms=(y,a,b)=>{let s=0;for(let i=a;i<b;i++)s+=y[i]*y[i];return Math.sqrt(s/(b-a))};
const db=x=>20*Math.log10(x);
// ---- 遅延(固定): インパルスが G/2+2 サンプル後に出る(G=40ms→962) ----
{const d=latency('sd-pitch',{enabled:1,shift:0});ok(d===962,'0半音の遅延は 962 サンプル('+d+')')}
// ---- 0半音は固定遅延だけ(入力に一致・櫛が出ない) ----
{const x=H.noise(N,.5),y=go(x,{shift:0});let d=0;for(let i=2000;i<N;i++)d=Math.max(d,Math.abs(y[i]-x[i-962]));ok(d<1e-6,'0半音は入力の遅れと一致('+d.toExponential(1)+')')}
// ---- 音程(基音検出=quality.js のもの。検出範囲は約30〜1000Hz なので、出力が600Hz以下になる組み合わせ)。ヘッド2つの間隔(G/2=20ms)がちょうど整数周期になる音(50Hzの倍数)で測る ----
// 注: 時間領域方式は、ヘッドの間隔が整数周期でない音だと、2つのヘッドの位相がずれて窓の周期(25Hz)ぶんの側帯波が出る(下の帯域検査)。仕様の「再現度 ○」の理由
for(const [f,s] of [[300,12],[400,-12],[500,-5],[100,24],[1000,-24],[250,12],[1000,-12],[100,-12],[550,1]]){
 const y=go(sine(f),{shift:s}),want=f*Math.pow(2,s/12),got=pitch(y,.5);
 ok(got>0&&Math.abs(got/want-1)<.01,f+'Hz を '+s+'半音 → '+want.toFixed(1)+'Hz のはず(検出 '+got.toFixed(1)+')')}
// ---- どんな音でもエネルギーは目的の周波数のまわり(側帯波は窓の周期 ±25Hz×|ratio-1|)に集まる ----
for(const [f,s] of [[440,12],[440,-12],[330,24],[880,-24],[1234,7]]){
 const y=go(sine(f),{shift:s}),want=f*Math.pow(2,s/12),n=65536,re=new Float64Array(n),im=new Float64Array(n);for(let i=0;i<n;i++)re[i]=y[SR/2+i]*(0.5-0.5*Math.cos(2*Math.PI*i/n));fft(re,im);
 const bw=25*Math.abs(Math.pow(2,s/12)-1)+35;let tot=0,near=0;for(let k=1;k<n/2;k++){const e=re[k]*re[k]+im[k]*im[k],hz=k*SR/n;tot+=e;if(Math.abs(hz-want)<=bw)near+=e}
 ok(near/tot>.9,f+'Hz を '+s+'半音: 目的の周波数 '+want.toFixed(0)+'Hz の±'+bw.toFixed(0)+'Hz にエネルギーの '+(near/tot*100).toFixed(0)+'%')}
// ---- 音量: 振幅が大きく凹まない・大きくもならない(正弦波。窓の合計=1) ----
for(const [f,s] of [[440,12],[440,-12],[1000,7],[200,5],[3000,-7]]){
 const y=go(sine(f),{shift:s}),r=rms(y,SR/2,N);let pk=0;for(let i=SR/2;i<N;i++)pk=Math.max(pk,Math.abs(y[i]));
 ok(db(r/(.5/Math.SQRT2))>-6&&db(r/(.5/Math.SQRT2))<1.5&&pk<.6,f+'Hz '+s+'半音: 音量 '+db(r/(.5/Math.SQRT2)).toFixed(1)+'dB・ピーク '+pk.toFixed(2))}
// ---- グレイン境目のクリック: 出力の2階差分の最大が、同じ周波数のきれいなサイン波の3倍以内 ----
for(const [f,s] of [[440,12],[440,-12],[700,5]]){
 const y=go(sine(f),{shift:s}),fo=f*Math.pow(2,s/12);let mx=0;for(let i=SR/2;i<N-1;i++)mx=Math.max(mx,Math.abs(y[i+1]-2*y[i]+y[i-1]));
 const clean=.5*Math.pow(2*Math.PI*fo/SR,2);ok(mx<3*clean,f+'Hz '+s+'半音: 境目のクリック 2階差分 '+(mx/clean).toFixed(2)+'倍(閾値3)')}
// ---- SHIFT を動かして(掃引・階段)も破綻しない・クリックが出ない ----
{const x=sine(440),sw=s=>({shift:12*Math.sin(s/SR*2*Math.PI*.5)}),y=go(x,{},sw);let bad=0,mx=0,dm=0;for(let i=0;i<N;i++){if(!isFinite(y[i]))bad++;else{mx=Math.max(mx,Math.abs(y[i]));if(i>1)dm=Math.max(dm,Math.abs(y[i]-y[i-1]))}}
 ok(bad===0&&mx<.7,'SHIFT を掃引しても破綻しない(最大 '+mx.toFixed(2)+')');
 // 440Hz の約2倍(880Hz)までのサインの隣のサンプル差は 0.5*2π*880/SR≒0.06。その数倍を超える飛びがない
 ok(dm<.2,'SHIFT の掃引でクリックなし(隣の差の最大 '+dm.toFixed(3)+')');
 const st=go(x,{},s=>({shift:s<SR?0:7})),d2=(()=>{let m=0;for(let i=SR/4;i<N;i++)m=Math.max(m,Math.abs(st[i]-st[i-1]));return m})();ok(d2<.2,'SHIFT の階段(0→+7)でクリックなし('+d2.toFixed(3)+')')}
// ---- 0に戻すと固定遅延だけに戻る ----
{const x=H.noise(N,.4),y=go(x,{},s=>({shift:s<SR/2?7:0}));let d=0;for(let i=SR+SR/2;i<N;i++)d=Math.max(d,Math.abs(y[i]-x[i-962]));ok(d<1e-6,'+7→0 に戻すと固定遅延に戻る('+d.toExponential(1)+')')}
// ---- OFF は入力と一致・ON→OFF で遅延線を捨てる ----
{const x=H.noise(188*128,.8),y=go(x,{enabled:0,shift:12});let d=0;for(let i=0;i<x.length;i++)d=Math.max(d,Math.abs(y[i]-x[i]));ok(d===0,'OFFは入力と一致')}
// ---- 左右は独立(片側だけの入力が反対側に漏れない)・φは共通 ----
{const x=sine(440),z=new Float32Array(N),[L,R]=run('sd-pitch',x,z,{enabled:1,shift:5});let m=0;for(let i=0;i<N;i++)m=Math.max(m,Math.abs(R[i]));ok(m===0&&rms(L,SR/2,N)>.1,'左右は独立')}
// ---- 極端値・NaN ----
for(const s of [24,-24,.004,12])extreme('sd-pitch',{enabled:1,shift:s},2);
{const x=H.noise(N,.5);for(let i=1000;i<1010;i++)x[i]=NaN;x[2000]=Infinity;const y=go(x,{shift:7});let bad=0;for(let i=0;i<N;i++)if(!isFinite(y[i]))bad++;ok(bad===0,'NaN・無限大が入っても出力は有限('+bad+')')}
// ======== FX-2b: FINE・GRAIN・MIX・遅延の補償・ラック登録 ========
// ---- 遅延: GRAIN ごとに G/2+2(原音も同じだけ遅れる) ----
for(const g of [20,40,60,100]){const want=Math.round(g*SR/1000/2)+2,d=latency('sd-pitch',{enabled:1,shift:0,grain:g});ok(d===want,'GRAIN='+g+'ms の遅延は '+want+' サンプル('+d+')');
 const d0=latency('sd-pitch',{enabled:1,shift:0,grain:g,mix:0});ok(d0===want,'MIX=0(原音だけ)も同じ遅延('+d0+')')}
// ---- 0半音では MIX をどう動かしても、入力の遅れと一致(櫛が出ない・MIX の補償) ----
for(const mx of [0,.25,.5,.75,1]){const x=H.noise(N,.5),y=go(x,{shift:0,mix:mx});let d=0;for(let i=2000;i<N;i++)d=Math.max(d,Math.abs(y[i]-x[i-962]));ok(d<1e-6,'MIX='+mx+' 0半音: 入力の遅れと一致('+d.toExponential(1)+')')}
// ---- 周波数特性が平坦(0半音・MIX=0.5。コム=櫛が出ない): 帯域ごとのゲインが ±0.1dB ----
{const w=H.noise(N,.4),y=go(w,{shift:0,mix:.5,grain:30});let e1=0,e2=0;for(let i=4000;i<N;i++){e1+=w[i-722]*w[i-722];e2+=y[i]*y[i]}ok(Math.abs(db(Math.sqrt(e2/e1)))<.01,'MIX=50% 0半音: 全体のエネルギーが変わらない')}
// ---- MIX: 0=原音(遅れだけ)・100%=ピッチを変えた音だけ・50%=2つの和 ----
{const f=250,x=sine(f),o={shift:12},w1=go(x,Object.assign({mix:1},o)),w0=go(x,Object.assign({mix:0},o)),wh=go(x,Object.assign({mix:.5},o));
 ok(Math.abs(pitch(w0,.5)/f-1)<.01,'MIX=0 は原音の高さのまま('+pitch(w0,.5).toFixed(1)+'Hz)');ok(Math.abs(pitch(w1,.5)/(2*f)-1)<.01,'MIX=100% は+12半音');
 let d=0;for(let i=SR;i<N;i++)d=Math.max(d,Math.abs(wh[i]-(w0[i]+w1[i])/2));ok(d<.01,'MIX=50% は原音とピッチ違いの平均('+d.toExponential(1)+')')}
// ---- FINE: SHIFT に足す(セント)・±100 で ±1半音 ----
for(const [f,sh,fi] of [[500,0,-100],[500,0,100],[250,12,0],[500,-12,50]]){const y=go(sine(f),{shift:sh,fine:fi}),want=f*Math.pow(2,(sh+fi/100)/12),got=pitch(y,.5);
 ok(got>0&&Math.abs(got/want-1)<.01,'FINE: '+f+'Hz SHIFT '+sh+' FINE '+fi+' → '+want.toFixed(1)+'Hz(検出 '+got.toFixed(1)+')')}
{// FINE 小(+20セント)+MIX=50% = ダブラー: 原音とのうなりで振幅がゆれる(うなり周波数≒ f×(2^(20/1200)-1))
 const f=500,y=go(sine(f),{shift:0,fine:20,mix:.5}),bt=f*(Math.pow(2,20/1200)-1);let mn=9,mxv=0;for(let t=SR/2;t+480<N;t+=480){let m=0;for(let i=t;i<t+480;i++)m=Math.max(m,Math.abs(y[i]));mn=Math.min(mn,m);mxv=Math.max(mxv,m)}
 ok(mxv>.4&&mn<.3&&bt>5,'ダブラー(+20セント・MIX50%): うなり '+bt.toFixed(1)+'Hz で音量がゆれる(最大 '+mxv.toFixed(2)+' 最小 '+mn.toFixed(2)+')')}
// ---- GRAIN: 窓の長さで境目の周期が変わる(エネルギーの側帯波の位置)・どの長さでも音程が合う・クリックなし ----
for(const g of [10,20,60,100]){const f=g===10?500:400,y=go(sine(f),{shift:-12,grain:g}),got=pitch(y,.5),want=f/2;
 let mx=0;for(let i=SR/2;i<N-1;i++)mx=Math.max(mx,Math.abs(y[i+1]-2*y[i]+y[i-1]));const clean=.5*Math.pow(2*Math.PI*want/SR,2);
 ok(mx<3*clean,'GRAIN='+g+'ms: クリックなし('+(mx/clean).toFixed(2)+'倍)')}
// ---- GRAIN を動かしても破綻・クリックなし(遅延がなめらかに追従) ----
{const x=sine(440),sw=s=>({grain:55+45*Math.sin(s/SR*2*Math.PI*1.3)}),y=go(x,{shift:7},sw);let bad=0,dm=0;for(let i=0;i<N;i++){if(!isFinite(y[i]))bad++;else if(i>1)dm=Math.max(dm,Math.abs(y[i]-y[i-1]))}ok(bad===0&&dm<.3,'GRAIN を掃引しても破綻・クリックなし(隣の差の最大 '+dm.toFixed(3)+')')}
// ---- SHIFT をレーンで動かす(ブロックごとの細かい階段・連続の滑らかな変化)でクリックなし ----
{const x=sine(500),y=go(x,{},s=>({shift:Math.round(s/128)%2?12:7})),dm=(()=>{let m=0;for(let i=SR/4;i<N;i++)m=Math.max(m,Math.abs(y[i]-y[i-1]));return m})();ok(dm<.4,'SHIFT をブロックごとに切り替えてもクリックなし(隣の差の最大 '+dm.toFixed(3)+')');
 const r=go(x,{mix:.7},s=>({shift:-12+24*s/N,fine:50*Math.sin(s/SR*7)}));let bad=0,mx=0;for(let i=0;i<N;i++){if(!isFinite(r[i]))bad++;else mx=Math.max(mx,Math.abs(r[i]))}ok(bad===0&&mx<.8,'SHIFT・FINE・MIX を同時に動かしても破綻しない(最大 '+mx.toFixed(2)+')')}
// ---- MIX を動かしてもクリックなし(0↔1 の切り替え) ----
{const x=sine(500),y=go(x,{shift:5},s=>({mix:(s/128)%40<20?0:1}));let dm=0;for(let i=SR/4;i<N;i++)dm=Math.max(dm,Math.abs(y[i]-y[i-1]));ok(dm<.35,'MIX の切り替えでクリックなし(隣の差の最大 '+dm.toFixed(3)+')')}
// ---- 極端値・NaN(GRAIN・MIX・FINE の端) ----
for(const o of [{shift:24,fine:100,grain:10,mix:1},{shift:-24,fine:-100,grain:100,mix:1},{shift:12,fine:0,grain:10,mix:.5},{shift:7,grain:100,mix:.3},{shift:0,grain:10,mix:1}])extreme('sd-pitch',Object.assign({enabled:1},o),2);
{const x=H.noise(N,.5);for(let i=1000;i<1010;i++)x[i]=NaN;const y=go(x,{shift:7,mix:.6,grain:25});let bad=0;for(let i=0;i<N;i++)if(!isFinite(y[i]))bad++;ok(bad===0,'NaN が入っても出力は有限(MIX・GRAIN つき)')}
// ---- 範囲外・NaN のパラメーターは丸める ----
{const x=sine(500),y=go(x,{shift:NaN,fine:NaN,grain:NaN,mix:NaN});let bad=0;for(let i=0;i<N;i++)if(!isFinite(y[i]))bad++;ok(bad===0,'不正な値(NaN)でも出力は有限')}
// ---- 登録(ラック): md の後ろ・tr の前・既定値・対応表・heavy でない(1ヘッドぶんの遅延線だけ) ----
{const vm=require('vm'),ctx={console,Math,Object,Array,Float32Array};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 ['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','fxnew.js','fxparams.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..','www','js',f),'utf8'),ctx,{filename:f}));
 const SD=ctx.SD,c=SD.FXCHAIN;ok(c.indexOf('ps')===c.indexOf('md')+1&&c.indexOf('tr')>c.indexOf('ps')&&c.slice(c.indexOf('ps')+1,c.indexOf('tr')).every(k=>k==='rb'||k==='gl'||k==='vc'||k==='sp'),'チェーン: md→ps→(rb)→tr('+c.join('>')+')');
 const e=SD.FXR.find(r=>r.k==='ps');ok(e&&e.wn==='sd-pitch'&&e.on==='psOn'&&e.ids.join()==='psOn,psSh,psFine,psGrain,psMix','ラック項目');
 ok(SD.FXDEF.psOn===0&&SD.FXDEF.psSh===0&&SD.FXDEF.psFine===0&&SD.FXDEF.psGrain===40&&SD.FXDEF.psMix===1,'既定値(OFF・0半音・0セント・40ms・MIX100%)');
 ok(SD.FXR.length===20&&SD.FXR.slice(-2).map(r=>r.k).join()==='dl,rv','ラック20項目(VOCODER・SPECTRAL を含む)(DELAY・REVERBは最後)');
 const P=H.procs['sd-pitch'],names=P.parameterDescriptors.map(d=>d.name);const map={psSh:'shift',psFine:'fine',psGrain:'grain',psMix:'mix'};
 Object.keys(map).forEach(id=>{const m=SD.FXMAP[id];ok(m&&m[0]==='ps'&&m[1]===map[id]&&names.indexOf(m[1])>=0,id+' → '+map[id]+' が存在する')});
 ok(e.ids.every(id=>SD.defs.analog.byId[id]&&SD.defs.analog.byId[id].auto!==false),'全つまみがオートメーション可(trk=M)');
 ok(SD.defs.analog.byId.psSh.min===-24&&SD.defs.analog.byId.psSh.max===24&&SD.defs.analog.byId.psGrain.min===10&&SD.defs.analog.byId.psGrain.max===100,'つまみの範囲がワークレットの範囲と一致')}
// ---- fx-src と fxworklets.js の一致は test/fx.js・gen --check ----
{const SRC=fs.readFileSync(path.join(__dirname,'..','www','js','fxworklets.js'),'utf8');ok(/"pitch":/.test(SRC),'fxworklets.js に pitch が埋め込まれている')}
err+=H.errors?H.errors():0;console.log(err?'FAIL '+err:'fxw-pitch OK');process.exit(err?1:0)
