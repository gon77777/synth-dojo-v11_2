// FXラック・ミキサー基盤テスト(v3.1): node test/fx.js  偽のAudioContextでバス構成を検証
const fs=require('fs'),path=require('path'),vm=require('vm');
const ctx={console,setTimeout,clearTimeout};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
const L=f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..','www','js',f),'utf8'),ctx,{filename:f});
// ---- 偽AudioContext: 接続グラフと値を記録 ----
let nid=0;
function node(type){const n={type,kind:type,id:++nid,out:[],channelCount:2,channelCountMode:'max',
 connect(t){n.out.push(t);return t},disconnect(t){n.out=t?n.out.filter(q=>q!==t):[]},start(){}};
 const P=v=>({value:v,setTargetAtTime(x){this.value=x},setValueAtTime(x){this.value=x}});
 n.gain=P(1);n.pan=P(0);n.Q=P(1);n.delayTime=P(0);n.frequency=P(350);n.threshold=P(0);n.knee=P(0);n.ratio=P(0);n.attack=P(0);n.release=P(0);return n}
class AC{constructor(){this.audioWorklet=AC.noWk?undefined:{addModule:()=>Promise.resolve()};this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination=node('dest')}
 resume(){}createGain(){return node('gain')}createWaveShaper(){return node('shaper')}createDelay(){return node('delay')}
 createBiquadFilter(){return node('biquad')}createConvolver(){return node('conv')}createDynamicsCompressor(){return node('dyn')}
 createAnalyser(){return node('an')}createStereoPanner(){return node('pan')}createChannelMerger(){return node('merger')}createBuffer(c,l){const d=[new Float32Array(l),new Float32Array(l)];return{len:l,getChannelData:i=>d[i]}}}
class AWN{constructor(x,name,opt){this.kind=name;this.out=[];this.connect=q=>{this.out.push(q);return q};this.disconnect=()=>{this.out=[]};this.name=name;this.opt=opt;this.par={};this.parameters={get:k=>this.par[k]||(this.par[k]={value:0,setTargetAtTime(v){this.value=v}})};this.port={onmessage:null}}}
ctx.AudioWorkletNode=AWN;ctx.Blob=class{constructor(a){this.a=a}};ctx.URL={createObjectURL:()=>'blob:x'};
ctx.AudioContext=AC;
['mixdefs.js','fxdsp.js','fxworklets.js','bus.js','seq.js'].forEach(L);
const SD=ctx.SD;let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
// ---- 定義 ----
ok(JSON.stringify(SD.FXIDS.slice(0,7))===JSON.stringify(['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master']),'旧FX IDが先頭に残っている');
ok(new Set(SD.FXIDS).size===SD.FXIDS.length,'FX IDの重複なし');
ok(SD.FXR.every(r=>r.ids.every(i=>SD.FXIDS.indexOf(i)>=0)),'ラックのIDはすべてFXIDS');
ok(SD.MIXP.map(p=>p.id).join()==='tVol,tPan,tPitch,tDly,tRvb,tOut,dkOn,dkSrc,dkDepth,dkAtk,dkHold,dkRel,dkCurve','ミキサーのID');
ok(SD.MIXP.every(p=>p.def>=p.min&&p.def<=p.max),'ミキサー既定値が範囲内');
const d=SD.MIXDEF();ok(d.tVol===1&&d.tPan===0,'既定は VOL100%・PAN中央(音を変えない)');
ok(SD.volGain(1)===1&&SD.volGain(0)===0&&SD.volGain(.5)<.5,'VOLは100%で等倍・0で無音・指数カーブ');
// ---- 旧データ互換: mix無し→既定 / 不正値→丸める ----
let m=SD.mixClean(undefined);ok(m.tVol===1&&m.tPan===0&&m.dkOn===0&&m.dkDepth===.7,'mix無しは既定(DUCK含む)');
m=SD.mixClean({tVol:5,tPan:-9,zzz:1});ok(m.tVol===1&&m.tPan===-1&&m.zzz===undefined,'範囲外は丸め・未知IDは捨てる');
m=SD.mixClean({tVol:'x'});ok(m.tVol===1,'数値でない値は既定');
// ---- トラックの保存・復元(キット・play状態) ----
const io={now:()=>0,on(){},off(){},sched(){return 1},unsched(){}};
const P=new SD.Play(io);ok(P.tr.every(x=>x.mix.tVol===1&&x.mix.tPan===0),'新規トラックは既定mix');
P.tr[1].mix.tVol=.4;P.tr[1].mix.tPan=-.5;
const gt=JSON.parse(JSON.stringify(P.getTracks()));ok(gt[1].mix.tVol===.4&&gt[1].mix.tPan===-.5,'getTracksにmix');
const Q=new SD.Play(io);Q.setTracks(gt,1);ok(Q.tr[1].mix.tVol===.4&&Q.tr[1].mix.tPan===-.5&&Q.tr[0].mix.tVol===1,'setTracksで復元');
const old=gt.map(x=>{const y=Object.assign({},x);delete y.mix;return y});const R=new SD.Play(io);R.setTracks(old,0);
ok(R.tr.every(x=>x.mix.tVol===1&&x.mix.tPan===0),'旧データ(mix無し)は既定で読める');
const st=JSON.parse(JSON.stringify(P.getState()));const S2=new SD.Play(io);S2.setState(st);ok(S2.tr[1].mix.tPan===-.5,'play状態の往復');
// ---- バス: 構成 ----
const B=new SD.Bus();
B.setMix(2,'tVol',.5);ok(B.mix[2].tVol===.5,'初期化前のmix値を保持');
B.init();const x=B.ctx;
function reach(a,b,seen=new Set()){if(a===b)return true;if(seen.has(a))return false;seen.add(a);return a.out.some(t=>reach(t,b,seen))}
ok(B.input===B.strip(0).in,'bus.input = トラック1のストリップ入口');
ok(reach(B.input,x.destination),'ストリップ→…→出力まで接続');
ok(B.strip(0).vol.gain.value===1&&B.strip(0).pan.pan.value===0,'既定のストリップは素通し(VOL=1・PAN=0)');
ok(B.strip(0).in.channelCountMode==='explicit'&&B.mixIn.channelCountMode==='explicit','ステレオ固定(PAN中央で-3dBにならない)');
const tb=B.trackBus(2);ok(tb.input===B.strip(2).in,'trackBus(k).input はそのトラックのストリップ');
ok(reach(tb.input,x.destination),'トラック3も出力まで接続');
ok(B.strip(2).vol.gain.value===.25,'初期化前に入れたVOL .5 → gain .25');
B.setMix(2,'tPan',.3);ok(Math.abs(B.strip(2).pan.pan.value-.3)<1e-9,'PAN反映');
B.setMix(0,'tVol',0);ok(B.strip(0).vol.gain.value===0,'VOL0で無音');
ok(B.strip(0)!==B.strip(1)&&B.strip(1)===B.strip(1),'ストリップはトラックごと・使い回し');
// ---- 旧バスとの一致: ドライブ曲線 ----
const oldCurve=a=>{const N=2048,c=new Float32Array(N),k=1+a*12,mm=Math.tanh(k);for(let i=0;i<N;i++){const t=i/(N-1)*2-1;c[i]=Math.tanh(t*k)/mm;}return c};
let same=true;[0,.1,.5,1].forEach(a=>{const c=B.curve(a),o=oldCurve(a);for(let i=0;i<c.length;i++)if(c[i]!==o[i])same=false});ok(same,'DRIVE曲線が v3.0 と一致');
// ---- 旧チェーン: ストリップ以降の接続が v3.0 と同じ形 ----
const n=B.n;ok(reach(B.mixIn,n.ins)&&reach(n.ins,n.dly)&&reach(n.ins,n.cA)&&reach(n.ins,n.cB)&&reach(n.dmix,n.out)&&reach(n.rmix,n.out),'ミックス→ins→DELAY/REVERB→MASTER');
ok(B.mixIn.out.length===1&&B.mixIn.out[0]===n.ins,'INSERTが全部OFFなら mixIn→ins 直結(v3.0と同じ)');
B.set('master',.7);ok(Math.abs(n.out.gain.value-.56)<1e-9,'masterの係数は従来どおり(×0.8)');
B.set('rvbMix',.5);ok(Math.abs(n.rmix.gain.value-.75)<1e-9,'rvbMixの係数は従来どおり(×1.5)');

// ---- v3.2: INSERTチェーン ----
function chain(b){const r=[];let c=b.mixIn;while(c.out.length===1&&c!==b.n.ins){c=c.out[0];r.push(c.kind)}return r}
async function main(){
 const C=new SD.Bus();['gtOn','eqOn','mdOn','cpOn'].forEach(i=>C.p[i]=1);C.p.saType=2;C.p.drive=.5;C.p.cpMake=6;C.p.eqHi=5;C.p.gtThr=-30;
 C.init();await C.wkP;const c=C.n;
 const names=[];let cur=C.mixIn;
 const walk=()=>{const r=[];let q=C.mixIn;for(let i=0;i<40&&q!==c.ins;i++){q=q.out[0];if(!q)break;r.push(q.kind)}return r};
 const w=walk();
 ok(w.indexOf('sd-gate')>=0&&w.indexOf('biquad')>w.indexOf('sd-gate')&&w.indexOf('sd-saturator')>w.indexOf('biquad')&&w.indexOf('sd-modfx')>w.indexOf('sd-saturator')&&w.indexOf('sd-comp')>w.indexOf('sd-modfx'),'チェーン順 GATE→EQ→SAT→MOD→COMP: '+w);
 ok(reach(C.mixIn,c.ins),'チェーンの終端が ins に届く');
 ok(C.st.gt.w.parameters.get('threshold').value===-30,'GATE THRESH → threshold');
 ok(C.st.gt.w.parameters.get('enabled').value===1,'GATEは enabled=1 で作る');
 ok(C.st.sa.w.parameters.get('type').value===1&&Math.abs(C.st.sa.w.parameters.get('drive').value-18)<1e-9,'SAT TUBE(saType 2→worklet type 1)・drive .5→18dB');
 ok(C.n.drv.curve===null,'SOFT以外のときは旧ドライブ曲線を使わない');
 ok(Math.abs(C.st.cp.m.gain.value-Math.pow(10,6/20))<1e-9,'COMP MAKEUP 6dB');
 C.set('eqMid',9);ok(C.st.eq.mid.gain.value===9,'EQ MID 反映');
 C.set('mdMix',.25);ok(C.st.md.w.parameters.get('mix').value===25,'MOD MIX %→0〜100');
 C.set('cpModel',3);ok(C.st.cp.w.parameters.get('model').value===3,'COMP TYPE');
 C.set('saType',0);ok(C.n.drv.curve&&C.n.drv.curve.length===2048,'SOFTに戻すと旧ドライブ曲線');
 ok(reach(C.st.sa.in,C.n.drv),'SOFT時は SAT の入口→旧ドライブ');
 C.set('gtOn',0);C.set('mdOn',0);const w2=walk();ok(w2.indexOf('sd-gate')<0&&w2.indexOf('sd-modfx')<0&&w2.indexOf('sd-comp')>=0,'OFFにすると接続から外れる');
 ok(C.st.gt,'一度作ったノードは保持(再ONが速い)');
 // 旧データ(新IDなし)
 const D=new SD.Bus();D.p.drive=.3;D.init();await D.wkP;
 ok(D.live===1&&reach(D.mixIn,D.n.drv),'旧データ: drive>0 のSATだけが働く(v3.0と同じ)');
 const D0=new SD.Bus();D0.init();await D0.wkP;ok(D0.live===0&&D0.mixIn.out[0]===D0.n.ins,'何もONでなければ素通し');
 // 非対応環境
 AC.noWk=true;const U=new SD.Bus();U.p.gtOn=1;U.p.eqOn=1;U.p.drive=.2;U.init();await U.wkP;AC.noWk=false;
 ok(U.fxUnsup===true,'AudioWorklet非対応を検出');
 const wu=[];let q=U.mixIn;for(let i=0;i<20&&q!==U.n.ins;i++){q=q.out[0];if(!q)break;wu.push(q.kind)}
 ok(wu.indexOf('sd-gate')<0&&wu.indexOf('biquad')>=0,'非対応でもEQ・SOFT SATは動き、GATEは素通し: '+wu);
 // リミッター差し替え
 ok(C.n.lim.name==='sd-limiter'&&C.n.lim.parameters.get('ceiling').value===-1,'LIMITERはワークレット(ceiling -1dB)');
 ok(reach(C.n.comp,x2dest(C))&&true,'COMP→LIMITER→出力');
 // REVERB
 const R=new SD.Bus();R.init();await R.wkP;const r=R.n;
 R.p.rvbType=0;R.p.rvbSize=1;R.makeRvb();ok(r.cB.buffer&&r.cB.buffer.len===48000,'CLASSIC: 従来どおり size秒ぶんのIR');
 ok(r.gB.gain.value===1&&r.gA.gain.value===0,'IR差し替えはもう一方へクロスフェード');
 R.p.rvbType=2;R.p.rvbSize=2;R.makeRvb();ok(r.cA.buffer&&r.cA.buffer.len>96000,'HALL: generateImpulse のIR');
 R.set('rvbPre',40);ok(Math.abs(r.pre.delayTime.value-.04)<1e-9,'PRE DLY 40ms');
 // EQ応答(RBJ式のdB)
 const F=ctx.FxDSP;ok(Math.abs(F.eqMagDb(1000,20,20000,[])- 0)<.1,'EQ素通し値(20Hz/20kHz)で1kHz平坦');
 ok(Math.abs(F.eqMagDb(50,20,20000,[{type:'lowshelf',freq:200,gain:10,q:.7}])-10)<2,'LOW +10dB は低域で約+10');
 ok(Math.abs(F.eqMagDb(1000,20,20000,[{type:'bell',freq:1000,gain:9,q:1}])-9)<.2,'MID +9dB は中心で+9');
 ok(Math.abs(F.eqMagDb(15000,20,20000,[{type:'highshelf',freq:4000,gain:-8,q:.7}])+8)<1.5,'HIGH -8dB は高域で約-8');
 ok(F.eqMagDb(100,200,20000,[])<-2.9&&F.eqMagDb(100,200,20000,[])>-3.2||F.eqMagDb(200,200,20000,[])>-3.2,'ローカットは遮断周波数で約-3dB');
 // ワークレットのソース一式が1ファイルに連結できて、登録名が sd-
 const reg={};const fn=new Function('registerProcessor','AudioWorkletProcessor','sampleRate',Object.keys(SD.FXWSRC).map(k=>'(function(){'+SD.FXWSRC[k]+'\n})();').join('\n'));
 fn((n,c)=>{reg[n]=c},class{constructor(){this.port={postMessage(){}}}},48000);
 ok(['sd-gate','sd-comp','sd-saturator','sd-modfx','sd-limiter'].every(k=>reg[k]),'連結した5つのワークレットが登録される');
 // 埋め込みが fx-src と一致
 const g=require('child_process').spawnSync('node',[path.join(__dirname,'..','tools','gen-fxworklets.js'),'--check']);ok(g.status===0,'fxworklets.js が fx-src と一致');
 // ================= v3.3: DELAY刷新・AUTO FILTER・DJ FILTER・TREMOLO/AUTOPAN・STEREO WIDTH =================
 ok(SD.FXR.map(r=>r.k).join()==='gt,eq,af,dj,sa,bc,rm,md,tr,cp,sw,ts,dl,rv','ラックの並び=チェーン順+センド');
 ok(SD.FXCHAIN.join()==='gt,eq,af,dj,sa,bc,rm,md,tr,cp,sw,ts,rv','INSERTチェーンの順(v3.4+RP-1a で rv が末尾)');
 ok(SD.FXP.every(p=>p.type==='seg'?p.opts.some(o=>o[0]===p.def):(p.def>=p.min&&p.def<=p.max)),'FXつまみの既定値が範囲内');
 ['afOn','djOn','trOn','swOn'].forEach(i=>ok(SD.FXDEF[i]===0,i+' は既定OFF(旧データの音を変えない)'));
 ok(SD.FXDEF.dlySync===0&&SD.FXDEF.dlyPP===0&&SD.FXDEF.dlyMode===0&&SD.FXDEF.dlyTone===4500,'DELAY新つまみの既定=従来どおり(FREE・ピンポンOFF・TAPE・4500Hz)');
 {const E=new SD.Bus();['gtOn','eqOn','afOn','djOn','bcOn','rmOn','mdOn','trOn','cpOn','swOn','tsOn'].forEach(i=>E.p[i]=1);E.p.saType=1;E.p.rvbPos=1;E.init();await E.wkP;const t=E.st,ks=SD.FXCHAIN;
  ok(ks.every(k=>t[k]),'全INSERT: 全部作られる');
  let good=true;for(let i=0;i+1<ks.length;i++){const a=t[ks[i]],b=t[ks[i+1]];if(!reach(a.out,b.in)||reach(b.out,a.in))good=false}
  ok(good&&reach(t.ts.out,E.n.ins),'チェーン順 GATE→EQ→AF→DJ→SAT→BC→RM→MOD→TREMOLO→COMP→WIDTH→TAPE STOP→ins');
  // テンポ同期(AUTO FILTER・TREMOLO): Hz = BPM/60/拍数
  E.setBpm(90);E.set('afSync',1);E.set('afDiv',5);const ar=()=>t.af.w.parameters.get('rate').value,tr=()=>t.tr.w.parameters.get('rate').value;
  ok(Math.abs(ar()-3)<1e-9,'AF SYNC 1/8 @90BPM = 3Hz '+ar());
  E.set('trSync',1);E.set('trDiv',3);ok(Math.abs(tr()-1.5)<1e-9,'TR SYNC 1/4 @90BPM = 1.5Hz');
  E.setBpm(120);ok(Math.abs(ar()-4)<1e-9&&Math.abs(tr()-2)<1e-9,'BPM変更で同期レートも追従');
  E.set('afSync',0);E.set('afRate',7);ok(ar()===7,'FREEはHzのまま');
  E.set('afType',2);E.set('afMode',2);E.set('afCut',500);E.set('afRes',.6);E.set('afDepth',.8);E.set('afShape',4);E.set('afSens',.3);E.set('afAtk',9);E.set('afRel',90);
  const P=k=>t.af.w.parameters.get(k).value;
  ok(P('type')===2&&P('mode')===2&&P('cutoff')===500&&P('res')===.6&&P('depth')===.8&&P('shape')===4&&P('sens')===.3&&P('attack')===9&&P('release')===90,'AF つまみ→ワークレット');
  E.set('trMode',1);E.set('trShape',2);E.set('trDepth',.9);E.set('trSpread',.4);const Q=k=>t.tr.w.parameters.get(k).value;
  ok(Q('mode')===1&&Q('shape')===2&&Q('depth')===.9&&Q('spread')===.4,'TREMOLO つまみ→ワークレット');
  E.set('swWidth',1.6);ok(t.sw.w.parameters.get('width').value===1.6,'WIDTH つまみ→ワークレット');
  E.set('afOn',0);E.set('swOn',0);ok(!(function(){let q=E.mixIn;for(let i=0;i<40&&q!==E.n.ins;i++){q=q.out[0];if(q===t.af.in||q===t.sw.in)return true}return false})(),'OFFにすると接続から外れる');}
 // DJ FILTER
 {const J=new SD.Bus();J.p.djOn=1;J.init();await J.wkP;const j=J.st.dj;
  ok(j.dry.gain.value===1&&j.wet.gain.value===0,'DJ 0%: 素通し(dryだけ)');
  J.set('djFilter',-1);ok(j.dry.gain.value===0&&j.wet.gain.value===1&&Math.abs(j.lp.frequency.value-60)<1&&j.hp.frequency.value===10,'DJ -100%: LPFが約60Hz・HPFは10Hz');
  J.set('djFilter',-.5);ok(Math.abs(j.lp.frequency.value-1095)<2,'DJ -50%: LPF 約1.1kHz(対数で動く)');
  const a=(J.set('djFilter',-.2),j.lp.frequency.value),b=(J.set('djFilter',-.6),j.lp.frequency.value);ok(b<a,'DJ: 左に回すほどLPFが低い');
  J.set('djFilter',1);ok(Math.abs(j.hp.frequency.value-8000)<1&&j.lp.frequency.value>=20000-1,'DJ +100%: HPFが約8kHz');
  J.set('djFilter',.5);const h5=j.hp.frequency.value;J.set('djFilter',.3);ok(h5>j.hp.frequency.value,'DJ: 右に回すほどHPFが高い');
  J.set('djRes',1);J.set('djFilter',-.5);ok(j.lp.Q.value>14&&Math.abs(j.hp.Q.value+3.0103)<1e-6,'DJ RES: 動いている側だけ強調');
  J.set('djFilter',.01);ok(j.dry.gain.value===1&&j.wet.gain.value===0,'DJ ±1.5%以内は素通し');}
 // 非対応環境: DJ(ネイティブ)は動く / AF・TR・WIDTH は素通し
 {AC.noWk=true;const U=new SD.Bus();['afOn','djOn','trOn','swOn'].forEach(i=>U.p[i]=1);U.init();await U.wkP;AC.noWk=false;
  ok(U.fxUnsup&&!U.act('af')&&!U.act('tr')&&!U.act('sw')&&U.act('dj'),'非対応: AF・TR・WIDTHは接続されず、DJ FILTERは動く');}
 // DELAY
 {const Dd=new SD.Bus();Dd.init();await Dd.wkP;const n=Dd.n;
  Dd.setBpm(100);Dd.set('dlySync',1);Dd.set('dlyDiv',5);ok(Math.abs(n.dly.delayTime.value-60/100*.5)<1e-9,'DELAY SYNC 1/8 @100BPM = 300ms(=60000/BPM×分割)');
  Dd.set('dlyDiv',2);ok(Math.abs(n.dly.delayTime.value-.9)<1e-9,'1/4.(付点四分) = 900ms');
  Dd.set('dlyDiv',6);ok(Math.abs(n.dly.delayTime.value-.2)<1e-9,'1/8T(八分三連) = 200ms');
  Dd.setBpm(120);ok(Math.abs(n.dly.delayTime.value-1/6)<1e-9,'BPM変更で同期ディレイも追従');
  Dd.setBpm(40);Dd.set('dlyDiv',0);ok(n.dly.delayTime.value<=3.9,'長すぎる間隔は上限で頭打ち');
  Dd.set('dlySync',0);Dd.set('dlyTime',.25);ok(Math.abs(n.dly.delayTime.value-.25)<1e-9,'FREEはdlyTimeのまま');
  // TAPE: 同じ線の時間を動かす(ピッチが滑る) / DIGITAL: 別の線にセットしてクロスフェード(元の線は動かない=滑らない)
  Dd.set('dlyMode',0);Dd.set('dlyTime',.2);Dd.set('dlyTime',.4);ok(n.dly.delayTime.value===.4&&n.dgA.gain.value===1&&n.dgB.gain.value===0,'TAPE: 線Aの時間が動く(ピッチが滑る)');
  Dd.set('dlyMode',1);Dd.set('dlyTime',.7);ok(n.dly2.delayTime.value===.7&&n.dly.delayTime.value===.4&&n.dgB.gain.value===1&&n.dgA.gain.value===0,'DIGITAL: 別の線Bに新しい時間→クロスフェード(線Aは動かない)');
  Dd.set('dlyTime',.9);ok(n.dly.delayTime.value===.9&&n.dly2.delayTime.value===.7&&n.dgA.gain.value===1&&n.dgB.gain.value===0,'DIGITAL: 次はA↔Bが入れ替わる');
  Dd.set('dlyMode',0);ok(n.dgA.gain.value===1&&n.dgB.gain.value===0,'TAPEに戻すと線Aだけ');
  // 帰還のソフトクリップ(0.8まで素通し・超えた分は頭打ち・左右対称・単調)
  const c=n.dshp.curve;let mono=true,sym=true;for(let i=1;i<c.length;i++)if(c[i]<c[i-1])mono=false;for(let i=0;i<c.length;i++)if(Math.abs(c[i]+c[c.length-1-i])>1e-6)sym=false;
  ok(mono&&sym&&Math.abs(c[Math.round((0.5+1)/2*(c.length-1))]-.5)<1e-6&&Math.abs(c[Math.round((0.8+1)/2*(c.length-1))]-.8)<1e-3&&c[c.length-1]<1&&c[c.length-1]>.9,'DELAY帰還: 0.8まで線形・以降なめらかに頭打ち');
  // PING-PONG
  Dd.set('dlyFb',.6);ok(!n.pp,'ピンポンOFFの間はノードを作らない');
  Dd.set('dlyPP',1);ok(n.pp&&n.dsend.gain.value===0&&n.pp.g.gain.value===1,'PING-PONG ON: 標準経路を閉じてピンポンを開く');
  ok(reach(n.ins,n.dmix)&&reach(n.pp.dL,n.pp.mg)&&reach(n.pp.dR,n.pp.mg)&&reach(n.pp.mg,n.dmix)&&reach(n.pp.dL,n.pp.dR)&&reach(n.pp.dR,n.pp.dL),'PING-PONG: 左⇄右の帰還・左右の出力・dmixへの合流');
  ok(n.pp.f1.gain.value===.6&&n.pp.f2.gain.value===.6,'PING-PONG: FBが反映');
  Dd.set('dlyTime',.35);ok(Math.abs(n.pp.dL.delayTime.value-.35)<1e-9&&Math.abs(n.pp.dR.delayTime.value-.35)<1e-9,'PING-PONG: 左右とも同じ間隔');
  Dd.set('dlyTone',1500);ok(n.dlp.frequency.value===1500&&n.pp.l1.frequency.value===1500,'DLY TONE: 標準・ピンポン両方');
  Dd.set('dlyPP',0);ok(n.dsend.gain.value===1&&n.pp.g.gain.value===0,'PING-PONG OFF: 標準経路へ戻る');}

 // ---- OR-2a: マスターFXラックの並べ替え(順列・保存・接続順) ----
 {const D=SD.FXCHAIN.slice(),N=SD.fxOrdNorm,mv=SD.fxOrdMove;
  ok(N(undefined).join()===D.join()&&N(null).join()===D.join()&&N('x').join()===D.join()&&N({}).join()===D.join(),'ラック順: 無い・壊れた値は既定');
  ok(N(['ts','gt']).length===D.length&&new Set(N(['ts','gt'])).size===D.length&&N(['ts','gt']).indexOf('ts')<N(['ts','gt']).indexOf('gt'),'ラック順: 部分指定は不足を補い全キーが1回ずつ');
  ok(N(['gt','gt','zz','eq']).length===D.length&&N(['gt','gt','zz','eq']).indexOf('zz')<0,'ラック順: 重複・未知は捨てる');
  ok(SD.fxOrdSave(D)===null&&SD.fxOrdSave(undefined)===null&&SD.fxOrdSave(mv(D,0,1)).join()!==D.join(),'ラック順: 既定なら保存しない(null)');
  ok(mv(D,0,-1).join()===D.join()&&mv(D,D.length-1,1).join()===D.join()&&mv(D,0,1)[0]===D[1]&&mv(D,0,1)[1]===D[0],'ラック順: 端は動かない・隣と入れ替え');
  const io2={now:()=>0,on(){},off(){},sched(){return 1},unsched(){}};
  const P2=new SD.Play(io2);ok(P2.getState().fxo===undefined,'旧データ互換: 既定の並びは fxo を持たない');
  P2.fxo=mv(D,4,-1);const st2=JSON.parse(JSON.stringify(P2.getState()));ok(Array.isArray(st2.fxo)&&st2.fxo.join()===P2.fxo.join(),'保存に fxo');
  const P3=new SD.Play(io2);P3.setState(st2);ok(P3.fxo&&P3.fxo.join()===P2.fxo.join(),'fxo の往復');
  const P4=new SD.Play(io2);P4.fxo=mv(D,1,1);delete st2.fxo;P4.setState(st2);ok(P4.fxo===null,'fxo の無い旧データを読むと既定(前の並びを引きずらない)');
  const o2=mv(D,0,1);const P5=new SD.Play(io2);P5.setState({fxo:o2.concat(['zz'])});ok(P5.fxo&&P5.fxo.join()===o2.join(),'壊れた要素を含む fxo は丸める');
  // 接続順: SAT(sa) を GATE(gt) の前へ→ 実際のノード接続も入れ替わる
  const E=new SD.Bus();['gtOn','eqOn','cpOn','tsOn'].forEach(i=>E.p[i]=1);E.p.saType=1;E.init();await E.wkP;
  const ordOk=o=>{const t=E.st,ks=o.filter(k=>E.act(k));let g=true;for(let i=0;i+1<ks.length;i++){if(!reach(t[ks[i]].out,t[ks[i+1]].in)||reach(t[ks[i+1]].out,t[ks[i]].in))g=false}return g&&reach(t[ks[ks.length-1]].out,E.n.ins)&&E.mixIn.out.length===1};
  ok(ordOk(D),'ラック: 既定順で接続');
  const o3=['sa','gt','eq','af','dj','bc','rm','md','tr','cp','sw','ts'].concat(D.filter(k=>['gt','eq','af','dj','sa','bc','rm','md','tr','cp','sw','ts'].indexOf(k)<0));
  E.setFxOrd(o3);ok(ordOk(N(o3))&&E.mixIn.out[0]===E.st.sa.in,'ラック: SAT を先頭へ→ mixIn→SAT→GATE→…・出力まで届く');
  E.setFxOrd(mv(N(o3),0,1));ok(ordOk(N(mv(N(o3),0,1))),'ラック: ▼で入れ替え→接続が追従');
  E.setFxOrd(null);ok(ordOk(D)&&E.fxo===null,'ラック: 既定へ戻す');
  E.set('gtOn',0);E.setFxOrd(o3);ok(ordOk(N(o3)),'ラック: OFFの項目があっても並べ替えできる');
  E.set('gtOn',1);ok(ordOk(N(o3)),'ラック: ON/OFFと並べ替えの併用');
  // 順序だけの変更はフェード(偽コンテキストでは即時)。ON/OFF だけの変更は並びが同じなのでフェードしない
  let fd=0;const E2=new SD.Bus();['gtOn','eqOn'].forEach(i=>E2.p[i]=1);E2.init();await E2.wkP;E2.canFadeM=()=>true;E2.fadeRewireM=()=>{fd++;E2.rewire()};
  E2.set('cpOn',1);ok(fd===0,'ON/OFF の変更ではフェードしない(従来どおり)');E2.setFxOrd(['eq','gt']);ok(fd===1,'順序の変更ではフェードで張り替え');E2.setFxOrd(['eq','gt']);ok(fd===1,'同じ並びの再指定では何も起きない');}
 // ---- OR-2b: バスの EQ↔COMP 入れ替え(保存・接続・フェード) ----
 {const B=new SD.Bus();B.init();await B.wkP;B.setBusMix(0,'iEqOn',1);B.setBusMix(0,'iCpOn',1);const q=B.buses[0]||(B.busNode&&B.busNode(0));
  const bs=B.buses[0];const kinds=()=>{const r=[];let c=bs.in;const seen=new Set();while(c&&!seen.has(c)){seen.add(c);if(c.kind&&c.kind!=='gain')r.push(c.kind);c=c.out[0]}return r};
  ok(kinds().indexOf('biquad')<kinds().indexOf('sd-comp'),'バス: 既定は EQ→COMP');
  B.setBusMix(0,'iOrd',1);ok(kinds()[0]==='sd-comp'&&reach(bs.in,B.ctx.destination),'バス: COMP→EQ に入れ替え・出力まで届く');
  B.setBusMix(0,'iOrd',0);ok(kinds().indexOf('biquad')<kinds().indexOf('sd-comp'),'バス: 戻せる');
  let fd=0;bs.live=2;B.canFade=()=>true;const rw=B.brewire.bind(B);B.bfade=b=>{fd++;rw(b)};B.setBusMix(0,'iOrd',1);ok(fd===1,'バス: 順序変更はフェードで張り替え');B.setBusMix(0,'iEqOn',0);ok(fd===1,'バス: ON/OFFだけではフェードしない');
  const P=new SD.Play({now:()=>0,on(){},off(){},sched(){return 1},unsched(){}});P.bm[1].iOrd=1;const st=JSON.parse(JSON.stringify(P.getState())),P2=new SD.Play({now:()=>0,on(){},off(){},sched(){return 1},unsched(){}});P2.setState(st);ok(P2.bm[1].iOrd===1&&P2.bm[0].iOrd===0,'バス順の保存の往復');}
 /* RP-1a: REVERB の位置(rvbPos)。データだけ。接続は RP-1b */
 {const N=SD.fxOrdNorm,D=SD.FXCHAIN.slice();
  ok(SD.FXDEF.rvbPos===0&&SD.FXIDS.indexOf('rvbPos')>=0,'RP-1a: rvbPos の既定は SEND(0)・保存対象');
  ok(D[D.length-1]==='rv'&&D.indexOf('rv')===D.indexOf('ts')+1,'RP-1a: rv は FXCHAIN の末尾(ts の次)');
  ok(N(['ts','gt']).indexOf('rv')>N(['ts','gt']).indexOf('ts')&&new Set(N(['ts','gt'])).size===D.length,'RP-1a: 旧保存の並び(rv なし)は rv を既定位置に補う');
  const old=D.filter(k=>k!=='rv');ok(N(old).join()===D.join(),'RP-1a: 旧データの並び(rv の無い全キー)は rv が末尾に入る');
  ok(SD.fxOrdSave(old)===null,'RP-1a: 旧データの並びは既定と同じ=保存しない(旧データと同一)');
  const mvd=SD.fxOrdMove(D,D.length-1,-1);ok(mvd[mvd.length-1]==='ts'&&mvd[mvd.length-2]==='rv'&&SD.fxOrdSave(mvd).join()===mvd.join(),'RP-1a: rv も並べ替えられ、保存される');
  const A=/rvbPos:'[^']+'/.test(require('fs').readFileSync(require('path').join(__dirname,'..','www','js','auto.js'),'utf8'));ok(A,'RP-1a: rvbPos はオートメーション不可(理由つき)');
  const B1=new SD.Bus();B1.init();await B1.wkP;const rc=(x,y,seen=new Set())=>{if(x===y)return true;if(seen.has(x))return false;seen.add(x);return x.out.some(t=>rc(t,y,seen))};
  ok(B1.act('rv')===false&&!B1.st.rv,'RP-1a: 既定(SEND)は rv をチェーンに入れない');
  const R1=(B,k)=>B.st[k];B1.set('rvbPos',1);B1.rewire();const nn=B1.n,rs=B1.st.rv;
  ok(B1.act('rv')&&rs&&B1.rvC===1&&rc(B1.mixIn,rs.in)&&rc(rs.in,nn.cA)&&rc(nn.dkR,rs.out)&&rc(rs.out,nn.ins),'RP-1b: CHAIN は mix→rv→(pre→IR→dkR)→rv.out→ins');
  ok(!nn.ins.out.includes(nn.pre)&&!nn.dkR.out.includes(nn.out)&&nn.dkR.out.includes(rs.out)&&rs.dry&&rs.in.out.includes(rs.dry)&&rs.in.out.includes(nn.pre),'RP-1b: ins→pre は切れ、dkR の出口は rv.out へ。原音(dry)は rv.in→rv.out');
  ok(rc(nn.ins,nn.dly)&&rc(nn.ins,nn.out),'RP-1b: CHAIN でも ins→DELAY・ins→出力は従来どおり');
  B1.set('rvbPos',0);B1.rewire();ok(!B1.act('rv')&&B1.rvC===0&&nn.ins.out.includes(nn.pre)&&nn.dkR.out.includes(nn.out)&&!nn.dkR.out.includes(rs.out)&&!rc(B1.mixIn,rs.in),'RP-1b: SEND に戻すと ins→pre・dkR→out が復元(ステージは外れる)');
  B1.set('rvbPos',1);B1.rewire();B1.set('rvbPos',1);B1.rewire();ok(B1.rvC===1&&nn.dkR.out.length===1&&nn.ins.out.filter(q=>q===nn.pre).length===0,'RP-1b: CHAIN の再 rewire を繰り返しても接続が増えない');
  /* RP-2: rvbDry */
  ok(SD.FXDEF.rvbDry===1&&SD.FXIDS.indexOf('rvbDry')>=0,'RP-2: rvbDry の既定は100%(従来)・保存対象');
  ok(!/rvbDry:'[^']+'/.test(require('fs').readFileSync(require('path').join(__dirname,'..','www','js','auto.js'),'utf8')),'RP-2: rvbDry はオートメーション可(なめらかな gain)');
  {const Z=new SD.Bus();Z.p.rvbPos=1;Z.p.rvbDry=0;Z.init();await Z.wkP;const r=Z.st.rv;ok(r&&r.dry.gain.value===0,'RP-2: CHAIN・DRY=0 でステージの原音ゲインが0');Z.set('rvbDry',.5);Z.set('rvbDry',1);ok(true,'RP-2: CHAIN で DRY を動かしても例外なし');
   const Y=new SD.Bus();Y.init();await Y.wkP;let ex=0;try{Y.set('rvbDry',0)}catch(e){ex=1}ok(!ex&&!Y.st.rv&&Y.n.dkR.out[0]===Y.n.out,'RP-2: SEND では DRY は無効(接続は従来のまま・例外なし)');
   for(const x of [NaN,-1,9,1e9]){const W=new SD.Bus();W.p.rvbPos=1;W.init();await W.wkP;let e2=0;try{W.set('rvbDry',x)}catch(e){e2=1}ok(!e2,'RP-2: 極端値でも例外なし '+x)}}
  B1.set('rvbPos',0);B1.rewire();
  {const Z=new SD.Bus();Z.init();await Z.wkP;const zn=Z.n,e0=zn.ins.out.length;Z.rewire();Z.rewire();ok(Z.rvC===0&&zn.ins.out.length===e0&&zn.dkR.out.length===1&&zn.dkR.out[0]===zn.out,'RP-1b: SEND(既定)は rewire を何度しても従来の接続のまま');}
  /* REVERB と 後段のFX(fx.js は fxnew.js を読まないので TAPE STOP で代用) の前後(ラックの並び) */
  {const Z=new SD.Bus();['tsOn'].forEach(i=>Z.p[i]=1);Z.p.rvbPos=1;Z.init();await Z.wkP;const D2=SD.FXCHAIN.slice(),front=D2.filter(k=>k!=='rv');front.splice(front.indexOf('ts'),0,'rv');
   Z.setFxOrd(D2);Z.rewire();ok(Z.st.ts&&Z.st.rv&&rc(Z.st.ts.out,Z.st.rv.in)&&!rc(Z.st.rv.out,Z.st.ts.in)&&rc(Z.st.rv.out,Z.n.ins)===true,'RP-1b: 既定(rv が最後)= 後段のFX(fx.js は fxnew.js を読まないので TAPE STOP で代用) → REVERB(従来の聞こえ)');
   Z.setFxOrd(front);Z.rewire();ok(rc(Z.st.rv.out,Z.st.ts.in)&&!rc(Z.st.ts.out,Z.st.rv.in)&&rc(Z.st.ts.out,Z.n.ins),'RP-1b: rv を rb の前に並べ替えると REVERB → 後段のFX(fx.js は fxnew.js を読まないので TAPE STOP で代用)(リバースリバーブ)');
   ok(rc(Z.st.ts.out,Z.n.ins)&&Z.n.dkR.out[0]===Z.st.rv.out,'RP-1b: 並べ替えても dkR は rv.out に付く');}
  /* 切り替え・並べ替えはフェードで張り替える */
  {const Z=new SD.Bus();Z.init();await Z.wkP;let fd=0;Z.canFadeM=()=>true;const rw=Z.rewire.bind(Z);Z.fadeRewireM=()=>{fd++;rw()};Z.live=1;Z.set('rvbPos',1);ok(fd===1&&Z.rvC===1,'RP-1b: SEND→CHAIN の切り替えはフェードで張り替える');Z.set('rvbPos',0);ok(fd===2&&Z.rvC===0,'RP-1b: CHAIN→SEND もフェード');Z.set('rvbMix',.3);ok(fd===2,'RP-1b: REVERB のつまみでは張り替えない');}
  {const Z=new SD.Bus();Z.p.rvbPos=1;Z.init();await Z.wkP;Z.init();ok(Z.rvC===1&&Z.n.ins.out.indexOf(Z.n.pre)<0,'RP-1b: build し直しても CHAIN が復元される');}
  const P=new SD.Play({now:()=>0,on(){},off(){},sched(){return 1},unsched(){}});ok(P.getState().fx===undefined||P.getState().fx.rvbPos===undefined||P.getState().fx.rvbPos===0,'RP-1a: 既定では rvbPos を保存に持たない/0');}
 if(err){console.error(err+'件NG');process.exit(1)}console.log('OK: FXラック(ミキサー・INSERTチェーン・REVERB刷新・旧データ互換・非対応環境)');
}
function x2dest(b){return b.ctx.destination}
main().catch(e=>{console.error(e);process.exit(1)});
