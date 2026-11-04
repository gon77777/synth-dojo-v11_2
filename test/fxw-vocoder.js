// VOCODER(sd-vocoder)の検査: node test/fxw-vocoder.js   FX-5a(キー配線。音は素通し)
//  ①ワークレット: 入力0を素通し(ビット一致・遅延ゼロ)・入力1(キー)は読むだけ(無接続・空・NaN・巨大値でも同じ)・極端値
//  ②定義: ラック登録・旧データ・チェーン位置 ③バス配線(偽AudioContext): キーの接続・INT・範囲外/不正値・キー元の削除/後から作成・ミュート中でも生きる・scNeed
const fs=require('fs'),path=require('path'),vm=require('vm');
const H=require('./fxw5.js'),{procs}=H,SR=48000,JS=path.join(__dirname,'..','www','js');
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
if(H.errors&&H.errors()>0){console.error('NG: fxw5 の検査が通っていない');process.exit(1)}
/* ① ワークレット */
function drive(xL,xR,key,o){o=o||{};const C=procs['sd-vocoder'],p=new C({}),P={},n=xL.length;C.parameterDescriptors.forEach(d=>{P[d.name]=[d.defaultValue]});P.enabled=[o.en==null?1:o.en];Object.keys(o.p||{}).forEach(k=>{P[k]=[o.p[k]]});const nn=n,L=new Float32Array(n),R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128);
 for(let s=0;s+128<=n;s+=128){const inp=[[xL.subarray(s,s+128),xR.subarray(s,s+128)]];if(key===null)inp.push([]);else if(key)inp.push([key.subarray(s,s+128),key.subarray(s,s+128)]);
  p.process(inp,[[oL,oR]],P);L.set(oL,s);R.set(oR,s)}return[L,R]}
const same=(a,b)=>{for(let i=0;i<a.length;i++)if(!Object.is(a[i],b[i]))return false;return true};
{const N=SR,x=H.noise(N,.7),y=H.noise(N,.4).map((v,i)=>v*Math.cos(i*.002)),sil=new Float32Array(N);
 const bad=Float32Array.from(x);bad[500]=NaN;bad[900]=Infinity;bad[1500]=-1e9;
 const base=drive(x,y);
 ok(same(base[0],x)&&same(base[1],y),'素通し: 入力0とビット一致(左右別々・遅延ゼロ)');
 ok(H.latency('sd-vocoder',{})===0,'遅延は0サンプル');
 [['キー無接続',undefined],['キー空',null],['キー無音',sil],['キー=ノイズ',H.noise(N,1)],['キー=NaN/Inf/巨大値',bad]].forEach(([nm,k])=>{const o=drive(x,y,k);ok(same(o[0],x)&&same(o[1],y),'キー入力が変わっても出力は入力0のまま: '+nm)});
 const off=drive(x,y,H.noise(N,1),{en:0});ok(same(off[0],x)&&same(off[1],y),'enabled=0 も素通し');
 const C=procs['sd-vocoder'],p=new C({}),oL=new Float32Array(128).fill(7),oR=new Float32Array(128).fill(7);p.process([[]],[[oL,oR]],{enabled:[1],keyOn:[1]});ok(oL.every(v=>v===0)&&oR.every(v=>v===0),'入力0が空なら無音');
 const m=new C({}),a=new Float32Array(128).fill(.3),o1=new Float32Array(128),o2=new Float32Array(128);m.process([[a]],[[o1,o2]],{enabled:[1],keyOn:[0]});ok(same(o1,a)&&same(o2,a),'モノ入力は左右に同じ音を出す');
 H.extreme('sd-vocoder',{enabled:1},1);
 H.extreme('sd-vocoder',{enabled:1,keyOn:1,bands:24,lo:40,hi:18000,attack:.5,release:2},4);}
/* 5b: ボコーダー本体 */
{const N=SR*2,P=(o)=>({p:Object.assign({keyOn:1,mix:1},o||{})}),noi=H.noise(N,.5),sil=new Float32Array(N);
 const rms=(y,a,b)=>{let t=0;for(let i=a;i<b;i++)t+=y[i]*y[i];return Math.sqrt(t/(b-a))};
 const sine=(f,a)=>Float32Array.from({length:N},(_,i)=>a*Math.sin(2*Math.PI*f*i/SR));
 /* keyOn=0(INT)は素通し(ビット一致) */
 {const o=drive(noi,noi,sine(500,.5),{p:{keyOn:0}});ok(same(o[0],noi),'keyOn=0(SRC=INT): 素通し(ビット一致)')}
 /* モジュレーターが無音なら無音 */
 {const o=drive(noi,noi,sil,P());ok(rms(o[0],0,N)<1e-9&&rms(o[1],0,N)<1e-9,'モジュレーター無音: 出力は無音');
  const o2=drive(noi,noi,undefined,P());ok(rms(o2[0],0,N)<1e-9,'キー入力なし(keyOn=1): 無音');
  const o3=drive(noi,noi,null,P());ok(rms(o3[0],0,N)<1e-9,'キー入力が空(keyOn=1): 無音');
  const m=drive(noi,noi,sil,P({mix:0}));ok((()=>{let d=0;for(let i=N/2;i<N;i++)d=Math.max(d,Math.abs(m[0][i]-noi[i]));return d<1e-6})(),'MIX=0: 原音のまま(モジュレーターが無音でも)')}
 /* エンベロープに追従: 搬送波=ノイズ・モジュレーター=1kHzのサインを 0.5〜1.0 秒だけ鳴らす */
 {const key=sine(1000,.5);for(let i=0;i<N;i++){const t=i/SR;if(t<.5||t>1)key[i]=0}
  const o=drive(noi,noi,key,P({release:20}))[0];
  const on=rms(o,Math.round(.6*SR),Math.round(.95*SR)),off=rms(o,Math.round(1.3*SR),N),pre=rms(o,0,Math.round(.45*SR));
  ok(on>.01&&off<on*.01&&pre<on*.01,'モジュレーターが鳴っている間だけ出る(on '+on.toFixed(3)+' / 前 '+pre.toExponential(1)+' / 後 '+off.toExponential(1)+')');
  /* 周波数: 1kHz のモジュレーターなら、出力のエネルギーは 1kHz 付近に集まる(ゲルツェル法で 1kHz と 4kHz を比べる) */
  const g=(y,f)=>{let c=0,s=0;const a=Math.round(.6*SR),b=Math.round(.95*SR);for(let i=a;i<b;i++){c+=y[i]*Math.cos(2*Math.PI*f*i/SR);s+=y[i]*Math.sin(2*Math.PI*f*i/SR)}return Math.hypot(c,s)/(b-a)};
  ok(g(o,1000)>g(o,4000)*4&&g(o,1000)>g(o,250)*4,'モジュレーター 1kHz: 出力は 1kHz 付近が強い('+g(o,1000).toFixed(4)+' vs 4k '+g(o,4000).toFixed(4)+' / 250 '+g(o,250).toFixed(4)+')');
  /* ATTACK: 短いほど立ち上がりが速い */
  const rise=(a)=>{const y=drive(noi,noi,key,P({attack:a}))[0],t0=Math.round(.5*SR);return rms(y,t0,t0+Math.round(.01*SR))};
  ok(rise(.5)>rise(80)*1.5,'ATTACK: 短いほど立ち上がりが速い('+rise(.5).toFixed(3)+' > '+rise(80).toFixed(3)+')');
  /* RELEASE: 長いほどモジュレーターが切れたあとも残る */
  const tail=(r)=>{const y=drive(noi,noi,key,P({release:r}))[0],t0=Math.round(1.02*SR);return rms(y,t0,t0+Math.round(.03*SR))};
  ok(tail(500)>tail(5)*3,'RELEASE: 長いほど余韻が残る('+tail(500).toFixed(3)+' > '+tail(5).toFixed(3)+')')}
 /* RANGE: 範囲の外の帯域は出ない(LO=2kHz・HI=8kHz に絞り、200Hz のモジュレーターは通らない) */
 {const k=sine(200,.5),a=drive(noi,noi,k,P({lo:1000,hi:8000})),b=drive(noi,noi,k,P({lo:100,hi:8000}));
  ok(rms(a[0],N/2,N)<rms(b[0],N/2,N)*.3,'RANGE LO: 範囲の下の音(200Hz)では出にくい('+rms(a[0],N/2,N).toFixed(4)+' < '+rms(b[0],N/2,N).toFixed(4)+')')}
 /* BANDS: 8/12/16/20 で動く・出力は有限・帯域が多いほど細かく(同じモジュレーターでも出力が変わる) */
 {const key=sine(1000,.5),o=[0,1,2,3].map(i=>[8,12,16,20][i]).map(b=>drive(noi,noi,key,P({bands:b}))[0]);
  ok(o.every(y=>y.every(isFinite)&&rms(y,N/2,N)>.005),'BANDS 8/12/16/20: すべて有限で音が出る');
  ok(!same(o[0],o[3]),'BANDS: 数で出力が変わる')}
 /* 左右別の搬送波は左右別のまま */
 {const l=sine(300,.4),r=sine(700,.4),key=H.noise(N,.5),o=drive(l,r,key,P({mix:1}));ok(!same(o[0],o[1])&&rms(o[0],N/2,N)>.001&&rms(o[1],N/2,N)>.001,'搬送波は左右別々に処理される')}
 /* 状態を持ち越さない: BANDS を変えても NaN・暴走なし・遅延ゼロ(MIX=0 はドライと一致) */
 {const key=H.noise(N,.9),o=drive(noi,noi,key,Object.assign(P({mix:.5}),{}));ok(o[0].every(isFinite)&&Math.max(...o[0].map(Math.abs))<=4,'MIX=50%・ノイズ同士: 有限・±4以内')}
 /* 5c: NOISE=0・FORMANT=0 は 5b と完全に同じ(5b の出力のハッシュ。ノイズ搬送波+ノイズキー・既定のつまみ・1秒) */
 {const x=H.noise(SR,.5),k=H.noise(SR,.5),o=drive(x,x,k,{p:{keyOn:1}})[0],u=new Uint32Array(o.buffer);let h=2166136261;for(let i=0;i<u.length;i++)h=Math.imul(h^u[i],16777619)>>>0;
  ok(h===1084735230,'NOISE=0・FORMANT=0: 5b と同じ出力(ハッシュ '+h+')')}
 /* NOISE: 搬送波が無音でも、モジュレーターが鳴っていれば息のノイズが出る・モジュレーターが無音なら出ない・大きいほど大きい */
 {const key=sine(3000,.5),a=drive(sil,sil,key,P({noise:0})),b=drive(sil,sil,key,P({noise:.5})),c=drive(sil,sil,key,P({noise:1})),d=drive(sil,sil,sil,P({noise:1}));
  ok(rms(a[0],N/2,N)<1e-9&&rms(b[0],N/2,N)>.003&&rms(c[0],N/2,N)>rms(b[0],N/2,N)*1.5,'NOISE: 搬送波が無音でも出る・0で出ない・大きいほど大きい('+rms(b[0],N/2,N).toFixed(4)+' < '+rms(c[0],N/2,N).toFixed(4)+')');
  ok(rms(d[0],0,N)<1e-9,'NOISE: モジュレーターが無音なら出ない');
  const o=drive(noi,noi,key,P({noise:0,mix:.5})),w=drive(noi,noi,key,P({noise:1,mix:0}));let dd=0;for(let i=N/2;i<N;i++)dd=Math.max(dd,Math.abs(w[0][i]-noi[i]));ok(dd<1e-6,'NOISE: MIX=0 の原音にはノイズを混ぜない')}
 /* FORMANT: 搬送波=1kHz のサイン・モジュレーター=ノイズ(全帯域)→ 出力の周波数が、帯域のずらしに応じて動く(+12 で 2 倍の帯域=2kHz 側が強くなる) */
 {  /* 帯域の動き: 搬送波=ノイズ・モジュレーター=1kHz サイン。FORMANT +12 で出力の重心が 2kHz 側へ */
  const nz=H.noise(N,.5),ks=sine(1000,.5),a0=drive(nz,nz,ks,P({formant:0}))[0],a1=drive(nz,nz,ks,P({formant:12}))[0],am=drive(nz,nz,ks,P({formant:-12}))[0],G=(y,f)=>{let c=0,s=0;for(let i=N/2;i<N;i++){c+=y[i]*Math.cos(2*Math.PI*f*i/SR);s+=y[i]*Math.sin(2*Math.PI*f*i/SR)}return Math.hypot(c,s)};
  ok(G(a0,1000)>G(a0,2000)&&G(a0,1000)>G(a0,500)&&G(a1,2000)>G(a1,1000)&&G(am,500)>G(am,1000),'FORMANT: 帯域が動く(0=1kHz / +12=2kHz / -12=500Hz)');
  /* 動かし続けても有限・暴走なし */
  const mv=drive(nz,nz,ks,{p:{keyOn:1,mix:1},}),ch=(()=>{const C=procs['sd-vocoder'],p=new C({}),P2={};C.parameterDescriptors.forEach(d=>{P2[d.name]=[d.defaultValue]});P2.enabled=[1];P2.keyOn=[1];const L=new Float32Array(N),a=new Float32Array(128),b=new Float32Array(128);
   for(let s=0;s+128<=N;s+=128){P2.formant=[-12+24*((s/128)%50)/50];P2.noise=[((s/128)%7)/7];p.process([[nz.subarray(s,s+128),nz.subarray(s,s+128)],[ks.subarray(s,s+128)]],[[a,b]],P2);L.set(a,s)}return L})();
  ok(ch.every(isFinite)&&Math.max(...ch.map(Math.abs))<=4,'FORMANT/NOISE をブロックごとに動かし続けても有限・±4以内')}
 /* 壊れたキー */
 {const bad=H.noise(N,.5);bad[500]=NaN;bad[900]=Infinity;bad[1500]=-1e9;const o=drive(noi,noi,bad,P());ok(o[0].every(isFinite)&&o[1].every(isFinite),'キーに NaN/Inf/巨大値: 出力は有限')}}
/* ② 定義(ブラウザ側と同じ読み込み順) */
function load(extra,files){const ctx=Object.assign({console,setTimeout,clearTimeout,Float32Array,Float64Array},extra||{});ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f}));return ctx}
const FILES=['params.js','mixdefs.js','fxnew.js','fxparams.js','fxdsp.js','fxworklets.js','bus.js'];
(async()=>{
 {const C=load({},FILES),SD=C.SD,r=SD.FXR.find(q=>q.k==='vc');
  ok(!!r&&r.wn==='sd-vocoder'&&r.on==='vcOn'&&r.heavy===true&&r.ids.join()==='vcOn,vcSrc,vcBands,vcLo,vcHi,vcAtk,vcRel,vcNoise,vcFmt,vcMix','ラック登録: VOCODER(vcOn・vcSrc・heavy)');
  ok(SD.FXCHAIN.indexOf('vc')===SD.FXCHAIN.indexOf('gl')+1&&SD.FXCHAIN.indexOf('vc')<SD.FXCHAIN.indexOf('tr'),'チェーン: gl の次・tr の前');
  const D=SD.defs.analog.byId;ok(D.vcOn&&D.vcOn.def===0&&D.vcSrc&&D.vcSrc.def===0&&D.vcSrc.opts.length===9&&D.vcBands.def===2&&D.vcMix.def===1&&SD.FXDEF.vcOn===0&&SD.FXDEF.vcSrc===0,'既定: OFF・INT(旧データはここで読まれる)');
  ok(SD.FXR.length===SD.FXR.filter((q,i,a)=>a.findIndex(z=>z.k===q.k)===i).length&&SD.FXR.length<=SD.FXMAX,'ラックの重複なし・最大数以内');
  ok(SD.FXIDS.indexOf('vcSrc')>=0&&SD.FXIDS.indexOf('vcOn')>=0,'FXIDS に含まれる(保存・読み込みの対象)');}
 /* ③ バス配線 */
 let nid=0;const P=v=>({value:v,setTargetAtTime(x){this.value=x},setValueAtTime(x){this.value=x},cancelScheduledValues(){},linearRampToValueAtTime(x){this.value=x}});
 /* connect(先, 出力番号, 入力番号) を覚える偽ノード */
 function node(type){const n={type,kind:type,id:++nid,out:[],conn:[],channelCount:2,channelCountMode:'max',
  connect(t,o,i){n.out.push(t);n.conn.push({to:t,o:o|0,i:i|0});return t},
  disconnect(t,o,i){if(!t){n.out=[];n.conn=[];return}if(o===undefined){n.out=n.out.filter(q=>q!==t);n.conn=n.conn.filter(c=>c.to!==t)}else{n.conn=n.conn.filter(c=>!(c.to===t&&c.o===(o|0)&&c.i===(i|0)));if(!n.conn.some(c=>c.to===t))n.out=n.out.filter(q=>q!==t)}},start(){}};
  n.gain=P(1);n.pan=P(0);n.Q=P(1);n.delayTime=P(0);n.frequency=P(350);n.threshold=P(0);n.knee=P(0);n.ratio=P(0);n.attack=P(0);n.release=P(0);return n}
 class AC{constructor(){this.audioWorklet={addModule:()=>Promise.resolve()};this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination=node('dest')}
  resume(){}createGain(){return node('gain')}createWaveShaper(){return node('shaper')}createDelay(){return node('delay')}createBiquadFilter(){return node('biquad')}createConvolver(){return node('conv')}
  createDynamicsCompressor(){return node('dyn')}createAnalyser(){return node('an')}createStereoPanner(){return node('pan')}createChannelMerger(){return node('merger')}createBuffer(c,l){const d=[new Float32Array(l),new Float32Array(l)];return{len:l,getChannelData:i=>d[i]}}}
 class AWN{constructor(x,name,opt){this.kind=name;this.out=[];this.conn=[];this.opt=opt;this.name=name;this.par={};
  this.connect=(q,o,i)=>{this.out.push(q);this.conn.push({to:q,o:o|0,i:i|0});return q};this.disconnect=()=>{this.out=[];this.conn=[]};
  this.parameters={get:k=>this.par[k]||(this.par[k]={value:0,setTargetAtTime(v){this.value=v}})};this.port={onmessage:null}}}
 const mkBus=()=>{const C=load({AudioContext:AC,AudioWorkletNode:AWN,Blob:class{constructor(a){this.a=a}},URL:{createObjectURL:()=>'blob:x'}});return{SD:C.SD,B:new C.SD.Bus()}};
 const par=(w,k)=>w.par[k]?w.par[k].value:undefined;
 const kV=B=>{const w=B.st.vc&&B.st.vc.w;if(!w)return -1;for(let j=0;j<8;j++){const t=B.strips[j]&&B.strips[j].kt;if(t&&t.conn.some(c=>c.to===w&&c.i===1&&c.o===0))return j}return -1};
 const mkB=async()=>{const C=load({AudioContext:AC,AudioWorkletNode:AWN,Blob:class{constructor(a){this.a=a}},URL:{createObjectURL:()=>'blob:x'}},FILES);const B=new C.SD.Bus();B.init();await B.wkP;return{SD:C.SD,B}};
 {
  const{SD,B}=await mkB();B.strip(0);B.strip(1);
  ok(!B.st.vc&&!B.strips[0].kt&&B.vcSrc()===-1,'既定(OFF): ノードもキーの取り出し口も作らない');
  B.set('vcOn',1);const w=B.st.vc.w;
  ok(w.name==='sd-vocoder'&&w.opt.numberOfInputs===2&&par(w,'enabled')===1&&par(w,'keyOn')===0,'ON: ワークレットは入力2つ・SRC=INT は keyOn=0(素通し)');
  ok(kV(B)===-1&&!B.strips[0].kt,'SRC=INT: キーはつながない');
  B.set('vcSrc',1);ok(kV(B)===0&&B.vcSrc()===0&&par(w,'keyOn')===1,'SRC=T1: T1 のキー出口 → ボコーダーの入力1・keyOn=1');
  ok(B.strips[0].dk.out.indexOf(B.strips[0].kt)>=0&&B.strips[0].dk.out[0]===B.strips[0].vol,'取り出し口は DUCK の後(VOL の前)・本線は変わらない');
  ok(!B.strips[0].kt.out.some(q=>q===B.strips[0].vol||q===B.strips[0].pan||q===B.mixIn),'出力側にはつながない(聞こえない)');
  B.set('vcSrc',2);ok(kV(B)===1&&!B.strips[0].kt.conn.some(c=>c.i===1),'SRC を T2 に変えると T1 の接続は外れる');
  B.set('vcSrc',0);ok(kV(B)===-1&&B.vcSrc()===-1&&par(w,'keyOn')===0,'INT に戻すと外れる・keyOn=0');
  B.set('vcBands',3);B.set('vcLo',300);B.set('vcMix',.4);ok(par(w,'bands')===20&&par(w,'lo')===300&&Math.abs(par(w,'mix')-.4)<1e-9,'BANDS(3→20本)・RANGE・MIX がワークレットのパラメーターへ');
  /* 範囲外・不正値は INT=無効(構造上ループしない。自分自身・循環は起こらない) */
  [9,-1,99,1.5,NaN,'x',null,undefined].forEach(v=>{B.set('vcSrc',v);ok(kV(B)===-1&&B.vcSrc()===-1,'不正値 '+String(v)+' は INT 扱い')});
  /* キー元ストリップが無い間は未接続・できたらつなぐ */
  B.set('vcSrc',6);ok(B.vcSrc()===5&&kV(B)===-1,'キー元トラックが無い: 未接続');B.strip(5);ok(kV(B)===5,'キー元ストリップが後からできたら自動でつなぐ');
  /* scNeed・キー元ミュートでも配線が生きる */
  ok(B.scNeed(5)===true&&B.scNeed(0)===false,'scNeed: ボコーダーのキー元は true');
  B.keyMute(5,true);ok(B.strips[5].vol.gain.value===0&&kV(B)===5,'キー元ミュート中(keyMute)でもキーはつながる(聞こえない)');B.keyMute(5,false);
  B.setMix(5,'tVol',0);ok(kV(B)===5,'キー元の VOL を0にしてもキーは切れない(VOLの前から取る)');
  /* キー元のインサートを組み替えても切れない */
  B.setMix(5,'iEqOn',1);B.setMix(5,'iGtOn',1);ok(kV(B)===5,'キー元のインサートを入れ替えても切れない');
  /* 他の項目の ON/OFF で再構成されても、つなぎ直す */
  B.set('glOn',1);ok(kV(B)===5&&B.st.vc.w===w,'前段(GLITCH)をONにして組み替えても、同じノードにキーがつながる');
  B.set('vcOn',0);ok(kV(B)===-1&&B.scNeed(5)===false&&B.vcSrc()===-1,'OFF: キーを外し scNeed も false');
  B.set('vcOn',1);ok(kV(B)===5&&B.scNeed(5)===true,'ON に戻すと、キーをつなぎ直す(SRC の値は保たれる)');
  /* キー元トラックが消えても落ちない */
  B.strips[5]=null;let th=false;try{B.scWire();B.scNeed(5);B.set('vcSrc',6)}catch(e){th=true}ok(!th&&kV(B)===-1,'キー元トラックが消えても落ちない');
  /* COMP のキーと同じ取り出し口を共有できる */
  B.strip(5);B.strip(2);B.setMix(2,'iCpOn',1);B.setMix(2,'iCpSc',6);ok(kV(B)===5&&B.strips[2].st.cp.w&&B.strips[5].kt.conn.filter(c=>c.i===1).length===2,'COMP のSCとボコーダーが同じキー取り出し口を共有');
  B.setMix(2,'iCpOn',0);ok(kV(B)===5,'  COMP のSCを外してもボコーダーのキーは残る');
 }
 /* 非対応環境(ワークレット無し)でも落ちない */
 {const C=load({AudioContext:AC},FILES),B=new C.SD.Bus();B.init();B.set('vcOn',1);B.set('vcSrc',1);let th=false;try{B.vcWire();B.scNeed(0)}catch(e){th=true}ok(!th&&B.vcSrc()===-1,'ワークレット非対応: 素通し・例外なし')}
 if(err){console.error(err+'件 NG');process.exit(1)}console.log('fxw-vocoder OK');
})();
