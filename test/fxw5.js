// FX-0 基盤の検査(v10.0): node test/fxw5.js
//  ①遅延測定ヘルパー(インパルス応答。既存の sd-limiter で検算) ②SD.fxAdd のダミー項目(パススルー)でラック・旧データ・チェーン・バスの汎用経路が崩れない ③ページ分け
//  以降の FX 段階はこのファイルに「全FXの極端値検査(extreme)」を足す。ダミーはこのテスト内だけで作り、www には残さない。
const fs=require('fs'),path=require('path'),vm=require('vm');
const SR=48000,procs={};
global.sampleRate=SR;global.currentTime=0;global.currentFrame=0;
global.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},onmessage:null}}};
global.registerProcessor=(n,c)=>{procs[n]=c};
const FXS=path.join(__dirname,'..','fx-src');
fs.readdirSync(FXS).filter(f=>f.endsWith('.js')).forEach(f=>new Function(fs.readFileSync(path.join(FXS,f),'utf8'))());
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};

// ---- 共通ヘルパー(以降の FX テストはここを使う) ----
/* ワークレットを 128 サンプルずつ回す。xL/xR=入力、over=パラメーターの上書き、seq(s)=ブロックごとの上書き */
function run(name,xL,xR,over,seq){
 const C=procs[name],p=new C({}),params={};
 C.parameterDescriptors.forEach(d=>{params[d.name]=[d.defaultValue]});
 const n=xL.length,L=new Float32Array(n),R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128);
 for(let s=0;s+128<=n;s+=128){
  const o=Object.assign({},over||{},seq?seq(s):{});Object.keys(o).forEach(k=>{params[k]=[o[k]]});
  p.process([[xL.subarray(s,s+128),xR.subarray(s,s+128)]],[[oL,oR]],params);L.set(oL,s);R.set(oR,s)}
 return [L,R]}
/* 遅延(サンプル数): 小さなインパルスを入れて、出力の最大の絶対値の位置を返す。at=インパルスの位置。ドライ/ウェットが混ざるものは over で MIX=100% にして測る */
function latency(name,over,opt){
 opt=opt||{};const n=opt.n||SR/2,at=opt.at||1024,amp=opt.amp!=null?opt.amp:.1,x=new Float32Array(n);x[at]=amp;
 const y=run(name,x,x.slice(),over)[0];let mi=0,mv=0;for(let i=0;i<n;i++){const a=Math.abs(y[i]);if(a>mv){mv=a;mi=i}}
 return mv>0?mi-at:null}
const noise=(n,a)=>{let s=7;return Float32Array.from({length:n},()=>{s=(s*1664525+1013904223)>>>0;return(s/4294967296*2-1)*(a||.5)})};
/* 極端な入力(無音・DC・全振幅の矩形・ノイズ)でも NaN・無限大・暴走(|y|>limit)が出ないこと。各 FX の段階で extreme('sd-xxx',{...最大値のパラメーター}) を呼ぶ */
function extreme(name,over,limit){
 limit=limit||8;const n=SR/2,ins={silence:new Float32Array(n),dc:new Float32Array(n).fill(.9),square:Float32Array.from({length:n},(_,i)=>(i>>6)&1?1:-1),noise:noise(n,1)};
 Object.keys(ins).forEach(k=>{const [L,R]=run(name,ins[k],ins[k].slice(),over);let bad=0,mx=0;for(let i=0;i<n;i++){const a=Math.abs(L[i]),b=Math.abs(R[i]);if(!isFinite(a)||!isFinite(b))bad++;else mx=Math.max(mx,a,b)}
  ok(bad===0,name+' 極端値('+k+'): NaN/無限大 '+bad+'個');ok(mx<=limit,name+' 極端値('+k+'): 最大 '+mx.toFixed(2)+' が上限 '+limit+' を超える')})}
module.exports={run,latency,extreme,noise,procs,ok:(c,m)=>ok(c,m)};

// ---- ①遅延測定ヘルパーの検算: リミッターは約2ms(=96サンプル)先読み。しきい値より小さいインパルスは、その分だけ遅れて出る ----
{const d=latency('sd-limiter',{ceiling:-1,release:80});ok(d===Math.max(8,Math.round(SR*.002)),'遅延測定: sd-limiter の先読み 96サンプルが測れる('+d+')');
 const d0=latency('sd-width',{enabled:1,width:1});ok(d0===0,'遅延測定: 遅延のないもの(WIDTH)は 0('+d0+')');
 const dz=(()=>{const x=new Float32Array(4096);return latency('sd-limiter',{},{n:4096,amp:0})})();ok(dz===null,'遅延測定: 無音なら null')}
// 極端値ヘルパーが既存ワークレットで動く(上限内で通り、壊れたものは検出する)
extreme('sd-limiter',{ceiling:-24,release:1},2);
{const before=err;const sv=console.error;let hit=0;console.error=()=>{hit++};procs['sd-bad']=class extends global.AudioWorkletProcessor{static get parameterDescriptors(){return[]}process(i,o){o[0][0].fill(NaN);o[0][1].fill(NaN);return true}};extreme('sd-bad',{});console.error=sv;ok(hit>=4,'extreme: NaN を出すものを検出する');err=before}

// ---- ②SD.fxAdd(ダミー=パススルー) ----
{const ctx={console,setTimeout,clearTimeout,Math,Object,Array,Float32Array};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 const J=f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..','www','js',f),'utf8'),ctx,{filename:f});
 ['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js'].forEach(J);
 const SD=ctx.SD,n0=SD.FXR.length,ch0=SD.FXCHAIN.slice(),ids0=SD.FXIDS.length;
 const dummy=()=>({k:'zz',name:'DUMMY',after:'cp',wn:'sd-dummy',heavy:true,
  params:[['s','zzOn','DUMMY',[[0,'OFF'],[1,'ON']],0,''],['k','zzAmt','AMT',0,1,.5,{},'']],map:{zzAmt:['amt',v=>v*2,1]}});
 ok(n0<=SD.FXMAX&&n0===14,'ラックは現在14項目('+n0+')');
 const e=SD.fxAdd(dummy());
 ok(SD.FXR.length===n0+1&&SD.FXR.findIndex(r=>r.k==='zz')===SD.FXR.findIndex(r=>r.k==='cp')+1,'ラック: cp の次に入る');
 ok(SD.FXCHAIN.join()===ch0.slice(0,ch0.indexOf('cp')+1).concat(['zz'],ch0.slice(ch0.indexOf('cp')+1)).join(),'チェーン: cp の後ろに1つ増えるだけ(既存の順序は変わらない)');
 ok(SD.FXR[SD.FXR.length-2].k==='dl'&&SD.FXR[SD.FXR.length-1].k==='rv','DELAY・REVERB は最後のまま');
 ok(SD.FXIDS.length===ids0+2&&SD.FXIDS.indexOf('zzOn')>=0&&SD.FXDEF.zzOn===0&&SD.FXDEF.zzAmt===.5,'FXIDS・FXDEF に載る');
 ok(e.on==='zzOn'&&e.wk===1&&e.heavy===true&&SD.FXMAP.zzAmt[0]==='zz'&&SD.FXMAP.zzAmt[1]==='amt'&&SD.FXMAP.zzAmt[2](2)===4,'項目と変換表');
 let t1=false,t2=false,t3=false;try{SD.fxAdd(dummy())}catch(x){t1=true}try{SD.fxAdd({k:'zy',name:'X',params:[['s','zzOn','X',[[0,'a']],0]]})}catch(x){t2=true}try{SD.fxAdd({k:'zx'})}catch(x){t3=true}
 ok(t1&&t2&&t3,'重複したキー・つまみID・不正な仕様は例外');
 let full=false;try{for(let i=0;i<20;i++)SD.fxAdd({k:'q'+i,name:'Q',params:[['s','q'+i+'On','Q',[[0,'OFF'],[1,'ON']],0]]})}catch(x){full=true}ok(full&&SD.FXR.length===SD.FXMAX,'ラックは最大'+SD.FXMAX+'種で止まる('+SD.FXR.length+')');
 // 旧データ(zz の無い保存)は既定で読める: fxparams が全シンセの定義に足し、DEF が既定値
 J('fxparams.js');
 Object.keys(SD.defs).forEach(sy=>{const D=SD.defs[sy];ok(D.byId.zzOn&&D.DEF.zzOn===0&&D.DEF.zzAmt===.5&&D.T.find(t=>t.id==='fx').items.indexOf('zzOn')>=0,sy+': ダミーが定義に載り既定値がある')});
 // 旧データ互換: 保存に zz が無くても DEF で補うと OFF
 const old={cutoff:1000},merged=Object.assign({},SD.defs.analog.DEF,old);ok(merged.zzOn===0,'旧データは OFF で読める');
 // ラックの整合: 全項目の ids が定義にあり、チェーンのキーは全部ラックにある・重複なし
 SD.FXR.forEach(r=>r.ids.forEach(id=>ok(SD.defs.analog.byId[id]||id==='drive',r.k+': '+id+' が定義にある')));
 ok(SD.FXCHAIN.every(k=>SD.FXR.some(r=>r.k===k))&&new Set(SD.FXCHAIN).size===SD.FXCHAIN.length&&new Set(SD.FXR.map(r=>r.k)).size===SD.FXR.length,'チェーンとラックの整合');
 // バスの汎用経路: act/mkGen/up(default)
 J('bus.js');const B=SD.bus;B.wkOK=true;B.p={};
 ok(B.act('zz')===false,'bus.act: OFF');B.p.zzOn=1;ok(B.act('zz')===true,'bus.act: ON(汎用)');B.wkOK=false;ok(B.act('zz')===false,'bus.act: ワークレット非対応なら素通し');B.wkOK=true;
 B.ctx={currentTime:0};const wr=[];B.wnode=nm=>({nm,parameters:{get:k=>({set value(v){wr.push([nm,k,v])},setTargetAtTime(v){wr.push([nm,k,v,'sm'])}})}});
 B.wp=function(node,name,v,sm){const p=node.parameters.get(name);if(sm)p.setTargetAtTime(v);else p.value=v};
 const g=B.mkGen('zz');ok(g.in===g.out&&g.w.nm==='sd-dummy'&&wr.some(r=>r[1]==='enabled'&&r[2]===1),'bus.mkGen: ワークレット1つ・enabled=1');
 B.st={zz:g};B.p.zzAmt=.25;B.up('zzAmt');ok(wr.some(r=>r[1]==='amt'&&r[2]===.5&&r[3]==='sm'),'bus.up: 汎用の変換表で書く');
 // ③ページ分け
 ok(SD.fxPageCount(10)===1&&SD.fxPageCount(11)===2&&SD.fxPageCount(20)===2&&SD.fxPageCount(21)===3&&SD.fxPageOf(9)===0&&SD.fxPageOf(10)===1&&SD.fxPageOf(16)===1,'ページ分け: 10個超は2ページ、最大20種は2ページ');
 // 完了条件: ダミーは www に残っていない
 ok(!/sd-dummy|zzOn/.test(fs.readdirSync(path.join(__dirname,'..','www','js')).map(f=>fs.readFileSync(path.join(__dirname,'..','www','js',f),'utf8')).join('')),'ダミーは www に残っていない')}
module.exports.errors=()=>err;
if(require.main===module){console.log(err?'FAIL '+err:'fxw5 OK');process.exit(err?1:0)}/* 他のテストから require されたときは終了しない */
