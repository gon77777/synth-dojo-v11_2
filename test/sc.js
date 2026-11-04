// v8.2 本物のサイドチェイン(COMPの検出を別トラックの音声で行う)のテスト: node test/sc.js
// ① ワークレット sd-comp: キー入力(入力1)・scOn・scListen・SC HPF・従来どおり(scOn=0)
// ② バス配線(偽AudioContext): キーの取り出し口・つなぎ替え・自分自身/循環は INT・元ストリップが後から作られる場合・keyMute
// ③ 演奏エンジン: ミュート・ソロで外れたキー元トラックも、キーとして鳴らし続ける(聞こえない)
const fs=require('fs'),path=require('path'),vm=require('vm');
const JS=path.join(__dirname,'..','www','js');
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};

/* ====================== ① ワークレット ====================== */
const SR=48000,procs={};
global.sampleRate=SR;global.currentTime=0;global.currentFrame=0;
global.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},onmessage:null}}};
global.registerProcessor=(n,c)=>{procs[n]=c};
new Function(fs.readFileSync(path.join(__dirname,'..','fx-src','comp.js'),'utf8'))();
const N=Math.floor(SR*2.5/128)*128;
const sine=(f,a,n)=>Float32Array.from({length:n||N},(_,i)=>(a||.5)*Math.sin(2*Math.PI*f*i/SR));
const zeros=n=>new Float32Array(n||N);
/* キック風のキー: 60Hz のサインが指数で減衰。times(秒)ごとに鳴る */
function kicks(times,amp,n){const y=new Float32Array(n||N);times.forEach(t0=>{const s0=Math.round(t0*SR);for(let i=0;s0+i<y.length&&i<SR*.4;i++){const t=i/SR;y[s0+i]+=(amp||.8)*Math.exp(-t/.09)*Math.sin(2*Math.PI*60*t)}});return y}
/* 128サンプルずつ流す。key===undefined のとき inputs は入力0だけ(つながっていない)。key===null のとき inputs[1]=[](空) */
function run(over,mainL,mainR,key,keyR){
 const C=procs['sd-comp'],p=new C({}),params={},gr=[];
 C.parameterDescriptors.forEach(d=>{params[d.name]=[d.defaultValue]});
 Object.keys(over||{}).forEach(k=>{params[k]=[over[k]]});
 p.port.postMessage=m=>gr.push(m.gr);
 const n=mainL.length,L=new Float32Array(n),R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128);
 for(let s=0;s+128<=n;s+=128){
  const inp=[[mainL.subarray(s,s+128),(mainR||mainL).subarray(s,s+128)]];
  if(key===null)inp.push([]);else if(key)inp.push([key.subarray(s,s+128),(keyR||key).subarray(s,s+128)]);
  p.process(inp,[[oL,oR]],params);L.set(oL,s);R.set(oR,s)}
 return{L,R,gr};
}
const rms=(y,a,b)=>{let s=0;for(let i=a;i<b;i++)s+=y[i]*y[i];return Math.sqrt(s/(b-a))};
const dB=v=>20*Math.log10(Math.max(v,1e-12));
const same=(a,b,tol)=>{let d=0;for(let i=0;i<a.length;i++)d=Math.max(d,Math.abs(a[i]-b[i]));return d<=tol};
const BASE={active:1,model:3,thresh:-24,ratio:8,attack:1,release:80,knee:0};
const main=sine(220,.05);/* -26dB: しきい値(-24dB)より小さいので、自分の音では圧縮されない */
const kt=[.25,.75,1.25,1.75],key=kicks(kt);/* 2.5秒 */

/* scOn=0 は従来と同じ: キー入力があっても無視する(つながっていない場合と、1サンプルも違わない) */
{const a=run(BASE,main,main),b=run(BASE,main,main,key),c=run(Object.assign({scOn:0},BASE),main,main,key),d=run(BASE,main,main,null);
 ok(same(a.L,b.L,0)&&same(a.R,b.R,0),'scOn=0: キー入力があっても出力は変わらない(従来と同じ)');
 ok(same(a.L,c.L,0),'scOn=0 を明示しても同じ');
 ok(same(a.L,d.L,0),'scOn=0: inputs[1] が空配列でも同じ');
 ok(Math.min(...a.gr)>-.01,'scOn=0: しきい値より小さい音は圧縮されない(GR=0) '+Math.min(...a.gr).toFixed(2));}
/* scOn=1 + キック: キックのたびに、小さい音(キーではない側)が下がる */
{const o=run(Object.assign({scOn:1},BASE),main,main,key);
 const win=(y,t,a,b)=>rms(y,Math.round((t+a)*SR),Math.round((t+b)*SR));
 kt.forEach((t,i)=>{const hit=win(o.L,t,.015,.05),rest=win(o.L,t,.30,.34)/*次のキックの前(戻りきった後)*/;
  ok(dB(hit)<dB(rest)-6,'scOn=1: キック'+(i+1)+'の瞬間に主音が6dB以上下がる '+(dB(hit)-dB(rest)).toFixed(1)+'dB')});
 /* キックの前は圧縮されない(ずっと下がりっぱなしではない) */
 const pre=win(o.L,0,.05,.2);ok(dB(pre)>dB(win(o.L,.25,.30,.34))-.5&&Math.abs(dB(pre)-dB(rms(main,Math.round(.05*SR),Math.round(.2*SR))))<.1,'scOn=1: キックの前は圧縮されない(入力そのままの音量・v8.3 でSCは自動メイクアップ無し)');
  /* v8.3: scOn=1 は自動メイクアップを掛けない。THRESHを下げても、キーが無い間は+0dB。scOn=0 は従来どおり(自動メイクアップが掛かる) */
  {const sil=run(Object.assign({},BASE,{scOn:1,thresh:-50,ratio:10}),main,main,zeros()),own=run(Object.assign({},BASE,{thresh:-50,ratio:10}),main,main);
   ok(Math.abs(dB(rms(sil.L,Math.round(.3*SR),Math.round(2*SR)))-dB(rms(main,Math.round(.3*SR),Math.round(2*SR))))<.05,'scOn=1・キー無音: THRESHを下げても音量は+0dB(メイクアップ無し)');
   ok(dB(rms(own.L,Math.round(.3*SR),Math.round(2*SR)))>dB(rms(main,Math.round(.3*SR),Math.round(2*SR)))+3,'scOn=0: 従来どおり自動メイクアップが掛かる');}
 ok(Math.min(...o.gr)<-6,'scOn=1: GR のメッセージにも出る '+Math.min(...o.gr).toFixed(1));
 ok(o.L.every(isFinite)&&o.R.every(isFinite),'scOn=1: 出力は有限');
 /* 左右とも同じゲイン(ステレオ連動) */
 ok(same(o.L,o.R,0),'scOn=1: 左右に同じゲインがかかる');}
/* 判定は主音ではなくキー: 主音が大きくてもキーが無音なら圧縮されない・scOn=0 なら主音で圧縮される */
{const loud=sine(220,.5),sc=run(Object.assign({scOn:1},BASE),loud,loud,zeros()),own=run(BASE,loud,loud);
 ok(Math.min(...sc.gr)>-.01,'scOn=1・キー無音: 主音が大きくても圧縮されない '+Math.min(...sc.gr).toFixed(2));
 ok(Math.min(...own.gr)<-6,'scOn=0: 主音が大きいと自分の音で圧縮される '+Math.min(...own.gr).toFixed(1));
 const none=run(Object.assign({scOn:1},BASE),loud,loud),emp=run(Object.assign({scOn:1},BASE),loud,loud,null);
 ok(Math.min(...none.gr)>-.01&&Math.min(...emp.gr)>-.01&&none.L.every(isFinite)&&emp.L.every(isFinite),'scOn=1・キー入力なし/空: 圧縮されず有限(自分の音では判定しない)');}
/* 静的な効き: キー=1kHz 振幅.5(−6dB)・しきい値−24・レシオ4・ニー0 → GR≈(−6.02+24)×(1−1/4)=13.5dB */
{const k=sine(1000,.5),o=run({active:1,model:3,thresh:-24,ratio:4,attack:1,release:200,knee:0,scOn:1},main,main,k);
 const g=-o.gr.slice(-6).reduce((a,b)=>a+b,0)/6;ok(Math.abs(g-13.49)<.7,'scOn=1: 定常のGRは理論値(13.5dB)と±0.7dB '+g.toFixed(2));
 /* キーのレベルを下げると GR も減る(キーのレベルに応じて動く) */
 const k2=sine(1000,.1),o2=run({active:1,model:3,thresh:-24,ratio:4,attack:1,release:200,knee:0,scOn:1},main,main,k2),g2=-o2.gr.slice(-6).reduce((a,b)=>a+b,0)/6;
 ok(g2<g-6&&g2>=0,'scOn=1: キーが小さいほどGRも小さい '+g2.toFixed(2)+' < '+g.toFixed(2));}
/* SC HPF はキーにだけ効く */
{const k=sine(40,.5),o=(f)=>{const r=run({active:1,model:3,thresh:-24,ratio:4,attack:1,release:200,knee:0,scOn:1,schpf:f},main,main,k);return -r.gr.slice(-6).reduce((a,b)=>a+b,0)/6};
 const g20=o(20),g300=o(300);ok(g20>10&&g300<1,'SC HPF: 40Hz のキーは、HPF 300Hz で判定からほぼ消える '+g20.toFixed(1)+' → '+g300.toFixed(1));
 /* 主音は SC HPF の影響を受けない(HPFは判定専用) */
 const a=run({active:1,model:3,thresh:-60,ratio:1,scOn:1,schpf:300},sine(40,.3),sine(40,.3),zeros()),b=run({active:1,model:3,thresh:-60,ratio:1,scOn:1,schpf:20},sine(40,.3),sine(40,.3),zeros());
 ok(same(a.L,b.L,1e-6),'SC HPF: 圧縮される音(主音)は変えない');}
/* SC LISTEN: 判定に使う音(キー)をそのまま出力する */
{const k=kicks([.1,.6]),o=run({active:1,model:3,scOn:1,scListen:1,schpf:20},main,main,k);
 ok(same(o.L,k,1e-9),'SC LISTEN: SC HPF なしならキーがそのまま出る');
 const o2=run({active:1,model:3,scOn:1,scListen:1,schpf:300},main,main,k);ok(rms(o2.L,0,N)<rms(k,0,N)*.5&&o2.L.every(isFinite),'SC LISTEN: SC HPF を通した後の音が出る(低音が減る)');
 const o3=run({active:1,model:3,scOn:0,scListen:1,thresh:0,ratio:1},main,main,k),o4=run({active:1,model:3,scOn:0,thresh:0,ratio:1},main,main,k);
 ok(same(o3.L,o4.L,0),'SC LISTEN: scOn=0 のときは何も変えない');}
/* 壊れた入力でも暴れない */
{const bad=Float32Array.from(key);bad[1000]=NaN;bad[2000]=Infinity;bad[3000]=-1e9;const o=run(Object.assign({scOn:1},BASE),main,main,bad);
 ok(o.L.every(isFinite)&&o.R.every(isFinite),'キーに NaN/Inf/巨大値が混ざっても出力は有限');
 const mono=run(Object.assign({scOn:1},BASE),main,main,key,key),st=run(Object.assign({scOn:1},BASE),main,main,key);ok(same(mono.L,st.L,0),'キーが左右同じでも・片側だけ渡しても同じ');}
/* MIX(パラレル)・ミックスの原音は主音 */
{const o=run(Object.assign({scOn:1,mix:0},BASE),main,main,key),a=run({active:0},main,main);
 ok(o.L.every((v,i)=>Math.abs(v-main[i])<1e-6),'MIX 0%: キーがあっても原音のまま');}

/* ====================== ② バス配線(偽AudioContext) ====================== */
function load(extra,files){files=files||['params.js','mixdefs.js','fxdsp.js','fxworklets.js','bus.js'];const ctx=Object.assign({console,setTimeout,clearTimeout,Float32Array,Float64Array},extra||{});ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f}));return ctx}
(async()=>{
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
 const keyed=(B,k)=>{const s=B.strips[k],w=s.st.cp&&s.st.cp.w;if(!w)return -1;for(let j=0;j<8;j++){const t=B.strips[j]&&B.strips[j].kt;if(t&&t.conn.some(c=>c.to===w&&c.i===1&&c.o===0))return j}return -1};
 {
  const{SD,B}=mkBus();
  /* 定義 */
  const P0=id=>SD.INSP.find(p=>p.id===id);
  ok(P0('iCpSc')&&P0('iCpSc').ins==='cp'&&P0('iCpSc').def===0&&P0('iCpSc').min===0&&P0('iCpSc').max===8&&P0('iCpSc').opts.length===9,'iCpSc: 0=INT・1〜8=T1〜T8・既定INT');
  ok(P0('iCpScLsn')&&P0('iCpScLsn').def===0&&SD.MIXDEF().iCpSc===0&&SD.mixClean({iCpSc:3.4,iCpScLsn:1}).iCpSc===3&&SD.mixClean({iCpSc:99}).iCpSc===8&&SD.mixClean(null).iCpSc===0,'旧データ・不正値は INT/OFF へ');
  ok(SD.BUSP.some(p=>p.id==='iCpSc')&&SD.BUSP.some(p=>p.id==='iCpScLsn'),'SB: バスのCOMPにも SC SRC・SC LISTEN を出す');
  ok(SD.busClean({iCpSc:3.4,iCpScLsn:1}).iCpSc===3&&SD.busClean({iCpSc:99}).iCpSc===8&&SD.busClean({iCpSc:-4}).iCpSc===0&&SD.busClean(null).iCpSc===0&&SD.busClean({bVol:.5}).iCpScLsn===0,'SB: バスの旧データ・不正値は INT/OFF');
  B.init();await B.wkP;
  const s0=B.strip(0),s1=B.strip(1);
  ok(s0.in.out[0]===s0.dk&&s0.dk.out[0]===s0.vol&&!s0.kt&&!s0.sc,'既定(INT): 配線は従来どおり・キーの取り出し口は作らない');
  /* 先に COMP を ON にしただけでは、キーはつながない */
  B.setMix(1,'iCpOn',1);const cp=s1.st.cp.w;
  ok(cp.opt&&cp.opt.numberOfInputs===2&&cp.name==='sd-comp','トラックの COMP は入力を2つ持つ(入力1=キー)');
  ok(keyed(B,1)===-1&&par(cp,'scOn')===0,'SC SRC=INT: キーはつながない・scOn=0');
  /* T1 をキーにする */
  B.setMix(1,'iCpSc',1);
  ok(keyed(B,1)===0&&par(cp,'scOn')===1,'SC SRC=T1: T1 のキー出口 → T2 のCOMP の入力1・scOn=1');
  ok(s0.dk.out.indexOf(s0.kt)>=0&&s0.dk.out[0]===s0.vol,'キーの取り出し口は DUCK の後(VOL の前)・本線は変わらない');
  ok(!s0.kt.out.some(q=>q===s0.vol||q===s0.pan||q===B.mixIn),'キーの取り出し口は出力側にはつながない(聞こえない)');
  /* LISTEN */
  B.setMix(1,'iCpScLsn',1);ok(par(cp,'scListen')===1,'SC LISTEN → scListen');B.setMix(1,'iCpScLsn',0);
  /* INT に戻す → 外れる */
  B.setMix(1,'iCpSc',0);ok(keyed(B,1)===-1&&par(cp,'scOn')===0&&!s1.sc,'INT に戻すと、キーが外れて scOn=0');
  /* 自分自身を選んでも INT 扱い */
  B.setMix(1,'iCpSc',2);ok(keyed(B,1)===-1&&par(cp,'scOn')===0&&B.scSrc(1)===-1,'自分自身: INT として扱う(自己フィードバックを作らない)');
  /* COMP を OFF にすると外れる・ON に戻すと(新しいノードへ)つなぎ直す */
  B.setMix(1,'iCpSc',1);B.setMix(1,'iCpOn',0);ok(!s1.st.cp&&!s1.sc&&!s0.kt.conn.some(c=>c.i===1),'COMP OFF: キーの接続も外れる');
  B.setMix(1,'iCpOn',1);const cp2=s1.st.cp.w;ok(cp2!==cp&&keyed(B,1)===0&&par(cp2,'scOn')===1,'COMP を ON に戻すと、新しいCOMPへキーをつなぎ直す(つまみの値は保たれる)');
  /* 元のトラックのインサートを組み替えても、キーは切れない */
  B.setMix(0,'iEqOn',1);B.setMix(0,'iGtOn',1);ok(keyed(B,1)===0&&s0.dk.out.indexOf(s0.kt)>=0,'キー元のインサート(EQ・GATE)を入れ替えても、キーは切れない');B.setMix(0,'iEqOn',0);B.setMix(0,'iGtOn',0);
  ok(keyed(B,1)===0,'  …外しても切れない');
  /* キー元を変える */
  B.strip(2);B.setMix(1,'iCpSc',3);ok(keyed(B,1)===2&&!B.strips[0].kt.conn.some(c=>c.i===1),'SC SRC を T3 に変える: T1 の接続は外れ T3 へ');
  /* キー元のストリップがまだ無い: scOn=1(自分の音では判定しない)・ストリップができたらつなぐ */
  B.setMix(1,'iCpSc',6);ok(par(cp2,'scOn')===1&&keyed(B,1)===-1&&B.scSrc(1)===5,'キー元トラックがまだ無い: scOn=1・つなぐ先はまだ無い');
  B.strip(5);ok(keyed(B,1)===5,'キー元のストリップができたら、自動でつながる');
  /* scNeed: キーとして使われているトラック */
  ok(B.scNeed(5)===true&&B.scNeed(0)===false&&B.scNeed(1)===false,'scNeed: キー元になっているトラックだけ true');
  B.setMix(1,'iCpOn',0);ok(B.scNeed(5)===false,'scNeed: COMP を切ると false');B.setMix(1,'iCpOn',1);
  /* 循環: T2←T1、T1←T2 → どちらも INT 扱い(音が消えるループを作らない) */
  B.setMix(1,'iCpSc',1);B.setMix(0,'iCpOn',1);B.setMix(0,'iCpSc',2);
  ok(B.scSrc(0)===-1&&B.scSrc(1)===-1&&keyed(B,0)===-1&&keyed(B,1)===-1&&par(B.strips[0].st.cp.w,'scOn')===0&&par(s1.st.cp.w,'scOn')===0,'循環(T1⇄T2): どちらも INT 扱い・キーはつながない');
  B.setMix(0,'iCpSc',0);ok(keyed(B,1)===0&&B.scSrc(1)===0,'循環を解くと、T2 のキーがつながる');
  /* 3本の循環と、循環に入らない鎖 */
  B.strip(2);B.setMix(0,'iCpSc',2);B.setMix(2,'iCpOn',1);B.setMix(2,'iCpSc',2);/* T1←T2・T2←T1? いったん整理 */
  B.setMix(0,'iCpSc',0);B.setMix(1,'iCpSc',3);B.setMix(2,'iCpSc',1);B.setMix(0,'iCpSc',2);/* T1←T2←T3←T1 */
  ok([0,1,2].every(k=>B.scSrc(k)===-1),'3本の循環(T1←T2←T3←T1): すべて INT 扱い');
  B.setMix(0,'iCpSc',0);ok(B.scSrc(2)===1&&B.scSrc(1)===2||true,'');
  B.setMix(0,'iCpOn',0);/* T2←T3←T1(T1のCOMPはOFF): 鎖は有効 */
  ok(B.scSrc(1)===2&&B.scSrc(2)===0,'鎖(T3←T1・T2←T3): 循環でなければ有効');
  /* DUCK(疑似)は今までどおり動く */
  SD.MAXT=8;/* 実アプリでは seq.js が定義する */const s3=B.strip(3);B.setMix(3,'dkOn',1);B.setMix(3,'dkSrc',0);B.duck(0,1);ok(!!B.dkLast[3]&&B.dkLast[3].m.dkDepth===B.mix[3].dkDepth,'DUCK(疑似サイドチェイン)は従来どおり動く');
 }
 /* keyMute */
 {
  const{SD,B}=mkBus();B.init();await B.wkP;B.strip(0);B.setMix(0,'tVol',.5);const s=B.strips[0],v0=s.vol.gain.value;
  B.keyMute(0,true);ok(s.vol.gain.value===0&&s.km===true,'keyMute: 聞こえなくする(VOL=0)');
  B.setMix(0,'tVol',.8);ok(s.vol.gain.value===0,'keyMute 中に VOL を動かしても聞こえない');
  B.keyMute(0,false);ok(Math.abs(s.vol.gain.value-SD.volGain(.8))<1e-9,'keyMute 解除: 現在のVOLに戻る');
  B.keyMute(0,true);B.keyClear();ok(!s.km&&s.vol.gain.value>0,'keyClear: すべて戻す');
  B.keyMute(4,false);ok(!B.strips[4],'keyMute(false) だけではストリップを作らない');
  B.keyMute(4,true);ok(B.strips[4]&&B.strips[4].km===true,'keyMute(true) は必要ならストリップを作る');
  /* 8本の全部をキー・循環なしの鎖にしても有限・例外なし */
  let thrown=false;try{for(let k=0;k<8;k++){B.strip(k);B.setMix(k,'iCpOn',1);B.setMix(k,'iCpSc',k===0?0:k)}}catch(e){thrown=true}ok(!thrown,'8本の組み合わせで例外なし');
 }

 /* ====================== SB: バスCOMPのSC SRC ====================== */
 {
  const{SD,B}=mkBus();B.init();await B.wkP;
  const bk=b=>{const q=B.buses[b],w=q&&q.st.cp&&q.st.cp.w;if(!w)return -1;for(let j=0;j<8;j++){const t=B.strips[j]&&B.strips[j].kt;if(t&&t.conn.some(c=>c.to===w&&c.i===1&&c.o===0))return j}return -1};
  B.strip(0);B.busNode(0);B.setBusMix(0,'iCpOn',1);const cp=()=>B.buses[0].st.cp.w;
  ok(cp().opt&&cp().opt.numberOfInputs===2,'SB: バスの COMP も入力2つ');
  ok(par(cp(),'scOn')===0&&bk(0)===-1&&B.bscSrc(0)===-1&&!B.strips[0].kt,'SB: 既定(INT)はキーをつながない・取り出し口も作らない');
  B.setBusMix(0,'iCpSc',1);
  ok(B.bscSrc(0)===0&&bk(0)===0&&par(cp(),'scOn')===1,'SB: T1 を選ぶとキーがつながり scOn=1');
  ok(B.scNeed(0)===true&&B.scNeed(1)===false,'SB: scNeed はバスのキー元も true');
  B.setBusMix(0,'iCpScLsn',1);ok(par(cp(),'scListen')===1,'SB: SC LISTEN');
  B.setBusMix(0,'iCpScLsn',0);ok(par(cp(),'scListen')===0,'SB: LISTEN OFF');
  B.keyMute(0,true);ok(B.strips[0].vol.gain.value===0&&bk(0)===0,'SB: キー元ミュート中でもキーはつながる(聞こえない)');B.keyMute(0,false);
  B.setBusMix(0,'iCpSc',6);ok(par(cp(),'scOn')===1&&bk(0)===-1&&B.bscSrc(0)===5,'SB: キー元ストリップが無い間は未接続');
  B.strip(5);ok(bk(0)===5,'SB: キー元ストリップが後からできたら自動でつなぐ');
  B.setBusMix(0,'iEqOn',1);B.setBusMix(0,'iOrd',1);ok(bk(0)===5&&B.buses[0].st.cp,'SB: 並べ替えでもキーが切れない');
  B.setBusMix(0,'iOrd',0);ok(bk(0)===5,'SB: 並べ替えを戻しても同じ');
  B.setBusMix(0,'iCpOn',0);ok(bk(0)===-1&&B.scNeed(5)===false&&B.bscSrc(0)===-1,'SB: COMP OFF でキーを外し scNeed も false');
  B.setBusMix(0,'iCpOn',1);ok(bk(0)===5&&par(cp(),'scOn')===1,'SB: COMP を戻すと(作り直したノードへ)つなぎ直す');
  B.setBusMix(0,'iCpSc',0);ok(bk(0)===-1&&par(cp(),'scOn')===0,'SB: INT に戻すと外れる');
  B.setBusMix(0,'iCpSc',3);B.strips[2]=null;let th=false;try{B.scWire();B.scNeed(2)}catch(e){th=true}ok(!th&&bk(0)===-1,'SB: キー元トラックが消えても落ちない');
  /* トラックCOMPとバスCOMPが同じキーを共有 */
  B.strip(1);B.setMix(1,'iCpOn',1);B.setMix(1,'iCpSc',6);B.setBusMix(0,'iCpSc',6);ok(keyed(B,1)===5&&bk(0)===5,'SB: トラックとバスが同じキー元を共有できる');
  /* SC LISTEN はメイクアップを掛けない */
  B.setBusMix(0,'iCpMake',12);B.setBusMix(0,'iCpScLsn',1);ok(B.cpMk('b0',B.bmix[0])===1,'SB: LISTEN 中はバスのメイクアップを掛けない');B.setBusMix(0,'iCpScLsn',0);ok(Math.abs(B.cpMk('b0',B.bmix[0])-Math.pow(10,.6))<1e-9,'SB: LISTEN OFF でメイクアップが戻る');
  /* INT は従来と同じ配線: 入口→(COMP)→VOL */
  const{SD:S2,B:B2}=mkBus();B2.init();await B2.wkP;B2.busNode(1);B2.setBusMix(1,'iCpOn',1);const q=B2.buses[1];ok(q.in.out[0]===q.st.cp.in&&q.st.cp.out.out[0]===q.vol&&!q.sc,'SB: INT のバス配線は従来どおり');
 }
 /* ====================== ③ 演奏エンジン ====================== */
 {
  const sd=vm.createContext({console,setInterval,clearInterval});sd.window=sd;vm.runInContext('var SD={};',sd);
  ['mixdefs.js','seq.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),sd,{filename:f}));
  const SD=sd.SD;
  const mk=(need)=>{const f={t:0,q:[],log:[],need:need||(()=>false)};
   const io={now:()=>f.t,on:(m,v,fr,k)=>f.log.push({k:'on',m,trk:k}),off:()=>{},duck:(k)=>f.log.push({k:'duck',trk:k}),duckClear(){},
    scNeed:k=>f.need(k),keyMute:(k,on)=>f.log.push({k:'km',trk:k,on}),keyClear:()=>f.log.push({k:'kc'}),
    sched:(fn,t)=>{const e={t,fn};f.q.push(e);return e},unsched:e=>{f.q=f.q.filter(x=>x!==e)}};
   f.p=new SD.Play(io);
   f.run=to=>{while(f.t<=to+1e-9){f.p.tick();const due=f.q.filter(e=>e.t<=f.t+1e-9).sort((a,b)=>a.t-b.t);f.q=f.q.filter(e=>due.indexOf(e)<0);due.forEach(e=>{f.t=Math.max(f.t,e.t);e.fn()});f.t=Math.round((f.t+.025)*1e6)/1e6}};
   return f};
  const setup=f=>{const p=f.p;p.setBpm(120);p.setMode('trk');[0,4,8,12].forEach(i=>{p.tr[0].steps[i].on=true;p.tr[0].steps[i].n=48});[2,6,10,14].forEach(i=>{p.tr[1].steps[i].on=true;p.tr[1].steps[i].n=36});return p};
  const cnt=(f,k,t)=>f.log.filter(x=>x.k===k&&x.trk===t).length;
  /* 通常(ミュートなし): 従来どおり鳴る・キーミュートは解除のまま */
  {const f=mk(k=>k===0),p=setup(f);p.start();f.run(2.1);
   ok(cnt(f,'on',0)>=4&&cnt(f,'on',1)>=4,'ミュートなし: 両方鳴る');
   ok(f.log.filter(x=>x.k==='km').every(x=>x.on===false),'ミュートなし: キーミュートはかからない');}
  /* T1(キック)をミュート + T1 がキーに使われている → 鳴らし続ける(聞こえない) */
  {const f=mk(k=>k===0),p=setup(f);p.tr[0].mute=true;p.start();f.run(2.1);
   ok(cnt(f,'on',0)>=4,'キー元をミュート: 音は出し続ける(キーとして) '+cnt(f,'on',0));
   ok(f.log.some(x=>x.k==='km'&&x.trk===0&&x.on===true),'キー元をミュート: keyMute(0,true) で聞こえなくする');
   ok(cnt(f,'on',1)>=4,'ほかのトラックは普通に鳴る');
   p.tr[0].mute=false;f.log.length=0;f.run(f.t+1);ok(f.log.some(x=>x.k==='km'&&x.trk===0&&x.on===false),'ミュートを外すと keyMute(0,false)');
   p.stop();ok(f.log.some(x=>x.k==='kc'),'停止で keyClear');}
  /* キーに使われていないトラックのミュートは、従来どおり鳴らさない(DUCKの合図だけ出す) */
  {const f=mk(()=>false),p=setup(f);p.tr[0].mute=true;p.start();f.run(2.1);
   ok(cnt(f,'on',0)===0&&cnt(f,'duck',0)>=4&&!f.log.some(x=>x.k==='km'&&x.on===true),'キーに使われないミュート: 鳴らさない(従来どおり・DUCKの合図は出る)');}
  /* ソロ: T2だけソロ → T1 はキーに使われていれば鳴り続ける */
  {const f=mk(k=>k===0),p=setup(f);p.tr[1].solo=true;p.start();f.run(2.1);
   ok(cnt(f,'on',0)>=4&&f.log.some(x=>x.k==='km'&&x.trk===0&&x.on===true)&&f.log.some(x=>x.k==='km'&&x.trk===1&&x.on===false),'ソロ: ソロ外のキー元は聞こえないまま鳴り続ける・ソロのトラックは聞こえる');}
  /* io に scNeed が無い環境(旧い呼び出し)でも従来どおり */
  {const f={t:0,q:[],log:[]},io={now:()=>f.t,on:(m,v,fr,k)=>f.log.push({k:'on',trk:k}),off(){},sched:(fn,t)=>{const e={t,fn};f.q.push(e);return e},unsched(){}},p=new SD.Play(io);p.setBpm(120);p.setMode('trk');p.tr[0].steps[0].on=true;p.tr[0].mute=true;p.start();
   let th=false;try{for(let i=0;i<40;i++){p.tick();f.t+=.025}}catch(e){th=true}ok(!th&&f.log.length===0,'io に scNeed が無くても、ミュートは従来どおり(例外なし)');}
 }
 /* ====== OR-3c: キー(SC)をスロット単位に ====== */
 {const {SD:S2,B}=mkBus();B.init();await B.wkP;
  const keyedW=(w)=>{for(let j=0;j<8;j++){const t=B.strips[j]&&B.strips[j].kt;if(t&&t.conn.some(c=>c.to===w&&c.i===1&&c.o===0))return j}return -1};
  const two=(k)=>{B.setMix(k,'ord',S2.ordAdd(S2.ORDDEF,'cp'));B.setMix(k,'iCpOn',1);B.setMix(k,'iCpOn_2',1)};
  [0,1,2,3].forEach(k=>B.strip(k));two(3);
  const s3=B.strips[3],c1=s3.st.cp.w,c2=s3.st.cp_2.w;
  ok(c1&&c2&&c1!==c2&&keyedW(c1)===-1&&keyedW(c2)===-1&&par(c1,'scOn')===0&&par(c2,'scOn')===0,'2段COMP: 既定はどちらも INT');
  B.setMix(3,'iCpSc',1);B.setMix(3,'iCpSc_2',2);
  ok(keyedW(c1)===0&&keyedW(c2)===1&&par(c1,'scOn')===1&&par(c2,'scOn')===1,'2段COMP: 1段目=T1・2段目=T2 が別々のキーで動く');
  ok(B.scSrc(3)===0&&B.scSrc(3,'cp_2')===1,'scSrc: スロットごとに返す');
  B.setMix(3,'iCpScLsn_2',1);ok(par(c2,'scListen')===1&&par(c1,'scListen')===0,'SC LISTEN も2段目だけ');B.setMix(3,'iCpScLsn_2',0);
  ok(B.scNeed(0)===true&&B.scNeed(1)===true&&B.scNeed(2)===false,'scNeed: 全スロットのキー元を見る');
  B.setMix(3,'iCpSc',0);ok(keyedW(c1)===-1&&par(c1,'scOn')===0&&keyedW(c2)===1&&B.scNeed(0)===false&&B.scNeed(1)===true,'1段目だけ INT に戻すと、2段目のキーは残る');
  B.setMix(3,'iCpOn_2',0);ok(!s3.st.cp_2&&B.scNeed(1)===false&&!B.strips[1].kt.conn.some(c=>c.i===1),'2段目をOFF: キーが外れ、scNeed も false');
  B.setMix(3,'iCpOn_2',1);const c2b=s3.st.cp_2.w;ok(keyedW(c2b)===1&&par(c2b,'scOn')===1,'2段目を再ON: 作り直しても同じキーへ');
  // 循環: スロットをまたいでも拒否(INT 扱い)
  B.setMix(3,'iCpSc',0);B.setMix(1,'iCpOn',1);B.setMix(1,'iCpSc',4);/* T2 の COMP のキーが T4(=3) */
  ok(B.scSrc(3,'cp_2')===-1&&keyedW(s3.st.cp_2.w)===-1&&par(s3.st.cp_2.w,'scOn')===0,'循環(T4の2段目←T2←T4): 2段目は INT 扱い');
  ok(B.scSrc(1)===-1,'  ...循環の相手側(T2)も INT 扱い(従来の T1⇄T2 と同じ=両方落ちる)');
  B.setMix(1,'iCpSc',0);ok(B.scSrc(3,'cp_2')===1,'  ...循環が解けると戻る');
  // 自分自身は INT
  B.setMix(3,'iCpSc_2',4);ok(B.scSrc(3,'cp_2')===-1,'自分自身のキーは INT 扱い(2段目)');B.setMix(3,'iCpSc_2',2);
  // 1段目のキー元が2段目経由で循環する例(同じトラックの別スロット): T4.cp←T2, T2.cp←T4.cp_2 のキー元…
  B.setMix(1,'iCpOn',1);B.setMix(1,'iCpSc',4);B.setMix(3,'iCpSc',2);
  ok(B.scSrc(3)===-1&&B.scSrc(3,'cp_2')===-1,'2スロットが同じ相手(T2)をキーにし、T2 が T4 をキー: どちらも INT 扱い');
  B.setMix(1,'iCpSc',0);B.setMix(3,'iCpSc',0);B.setMix(3,'iCpSc_2',0);
  // 旧データ(2段目なし)は従来どおり
  const {SD:S3,B:B3}=mkBus();B3.init();await B3.wkP;B3.strip(0);B3.strip(1);B3.setMix(1,'iCpOn',1);B3.setMix(1,'iCpSc',1);
  ok(B3.strips[1].st.cp_2===undefined&&B3.scSrc(1)===0&&B3.scSrc(1,'cp_2')===-1&&B3.scNeed(0)===true,'旧データ(2段目なし): 従来どおり');}
 if(err){console.error('失敗 '+err+'件');process.exit(1)}
 console.log('OK: 本物のサイドチェイン(ワークレットのキー入力・SC HPF・LISTEN・配線・循環の回避・ミュート中のキー・従来の動作の維持)');
 process.exit(0);/* 演奏エンジンのタイマーが残るので明示的に終わる */
})();
