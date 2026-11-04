/* EFコース(v7.7a〜)の測定。test/cmest.js(トラック別インサートを通すオフライン描画)に、マスターFXの聞き比べの音量測定を足したもの。
   v7.7a: BITCRUSH・RING MOD / v7.7b: DELAY・REVERB・WIDTH・DJ FILTER・AUTO FILT(マスターの chain と送り。ping-pong・DIGITAL/TAPE の違い・リターンDUCKは近似=省く)。
   node-web-audio-api が要る(無ければ測れない)。 */
const E=require('./cmest.js'),path=require('path');
const SR=E.SR,OAC=E.OAC,fxdsp=require(path.join(__dirname,'..','www','js','fxdsp.js'));
const sum=(a,b,g)=>{for(let i=0;i<a.length;i++)a[i]+=b[i]*g};
function ms(x){let e=0;for(let i=0;i<x.length;i++)e+=x[i]*x[i];return e/x.length}
/* 単音の和音(L.demo.n)を L.init+s のシンセで描画し、BITCRUSH→RING MOD を通した全体のRMS(dB)(v7.7a) */
async function fxLevel(SD,L,s){
 const D=SD.defs.analog.DEF,dm=L.demo,patch=Object.assign({},D,L.init,s),notes=dm.n,hold=dm.len||.7,total=hold+.5;let sum0=null;
 for(const n of notes){const b=await E.renderNote(SD,patch,n,1,hold,total,'analog');if(!sum0)sum0=new Float32Array(b.length);for(let i=0;i<b.length;i++)sum0[i]+=b[i]}
 let y=sum0;
 if(patch.bcOn==1)y=E.runProc('sd-bitcrush',y,{bits:patch.bcBits,rate:patch.bcRate,mix:patch.bcMix})[0];
 if(patch.rmOn==1)y=E.runProc('sd-ringmod',y,{freq:patch.rmFreq,mix:patch.rmMix,shape:patch.rmShape||0})[0];
 return 10*Math.log10(ms(y)+1e-20)}
/* ステレオ入力のワークレット */
function runSt(name,L,R,pm,opt){const K=E.procs[name],p=new K(opt||{}),params={};K.parameterDescriptors.forEach(d=>{params[d.name]=[d.defaultValue]});Object.keys(pm).forEach(k=>{params[k]=[pm[k]]});if('enabled' in params)params.enabled=[1];
 const oL=new Float32Array(L.length),oR=new Float32Array(L.length),a=new Float32Array(128),b=new Float32Array(128);
 for(let s=0;s+128<=L.length;s+=128){p.process([[L.subarray(s,s+128),R.subarray(s,s+128)]],[[a,b]],params);oL.set(a,s);oR.set(b,s)}return[oL,oR]}
/* リバーブのIR(アプリの makeRvb と同じ: CLASSIC=減衰するノイズ / ROOM・HALL・PLATE=FxDSP) */
function rvbIR(m){const type=m.rvbType|0,size=m.rvbSize;
 if(!type){const n=Math.floor(SR*size),L=new Float32Array(n),R=new Float32Array(n);let s=12345;const r=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x40000000-1};for(let i=0;i<n;i++){const e=Math.pow(1-i/n,3);L[i]=r()*e;R[i]=r()*e}return{L,R}}
 return fxdsp.generateImpulse(SR,{type:['','room','hall','plate'][type],decay:size,damp:m.rvbDamp*100,seed:0})}
/* マスターの流れ(近似): ミックス → [AUTO FILT → DJ FILTER → WIDTH] → 出力 / 送り(各トラックの tDly・tRvb を足したもの)→ DELAY・REVERB → 出力。戻り {L,R}(長さは入力と同じ) */
async function master(SD,dryL,dryR,sdL,sdR,srL,srR,P,bpm){
 let L=dryL,R=dryR;const n=L.length,dv=x=>SD.DIVS[x|0]||.5;
 if(P.afOn==1){const rate=P.afSync==1?1/(60/bpm*dv(P.afDiv)):P.afRate,pm={type:P.afType,cutoff:P.afCut,res:P.afRes,mode:P.afMode,rate,shape:P.afShape,depth:P.afDepth,sens:P.afSens,attack:P.afAtk,release:P.afRel};
  L=E.runProc('sd-autofilter',L,pm)[0];R=E.runProc('sd-autofilter',R,pm)[0]}
 if(P.swOn==1){const r=runSt('sd-width',L,R,{width:P.swWidth});L=r[0];R=r[1]}
 const c=new OAC(2,n,SR),G=()=>c.createGain(),buf=(a,b)=>{const q=c.createBuffer(2,n,SR);q.getChannelData(0).set(a);q.getChannelData(1).set(b);const s=c.createBufferSource();s.buffer=q;s.start(0);return s},out=G();out.connect(c.destination);
 let node=buf(L,R);
 if(P.djOn==1&&Math.abs(P.djFilter)>=.015){const v=P.djFilter,a=Math.abs(v),fm=Math.min(20000,.45*SR),flat=-3.0103,rq=flat+P.djRes*18,hp=c.createBiquadFilter(),lp=c.createBiquadFilter();hp.type='highpass';lp.type='lowpass';
  if(v<0){lp.frequency.value=fm*Math.pow(60/fm,a);hp.frequency.value=10;lp.Q.value=rq;hp.Q.value=flat}else{hp.frequency.value=20*Math.pow(400,a);lp.frequency.value=fm;hp.Q.value=rq;lp.Q.value=flat}
  node.connect(hp);hp.connect(lp);node=lp}
 node.connect(out);
 if(P.dlyMix>0){const tm=P.dlySync==1?Math.max(.005,Math.min(3.9,60/bpm*dv(P.dlyDiv))):Math.max(.005,Math.min(3.9,P.dlyTime)),dly=c.createDelay(4),lp=c.createBiquadFilter(),fb=G(),mx=G();dly.delayTime.value=tm;lp.type='lowpass';lp.frequency.value=P.dlyTone;fb.gain.value=Math.min(.95,P.dlyFb);mx.gain.value=P.dlyMix;
  const s=buf(sdL,sdR);s.connect(dly);dly.connect(lp);lp.connect(fb);fb.connect(dly);dly.connect(mx);mx.connect(out)}
 if(P.rvbMix>0){const ir=rvbIR(P),b=c.createBuffer(2,ir.L.length,SR);b.getChannelData(0).set(ir.L);b.getChannelData(1).set(ir.R);const cv=c.createConvolver();cv.normalize=true;cv.buffer=b;const pre=c.createDelay(.5);pre.delayTime.value=(P.rvbPre||0)/1000;const mx=G();mx.gain.value=P.rvbMix*1.5;
  const s=buf(srL,srR);s.connect(pre);pre.connect(cv);cv.connect(mx);mx.connect(out)}
 const r=await c.startRendering();return[Float32Array.from(r.getChannelData(0)),Float32Array.from(r.getChannelData(1))]}
const BASEP=SD=>Object.assign({},SD.FXDEF,{bpm:120});
/* ステップ st の聞き比べの各案の音量(dB)。tm=トラック別(インサート・tDly・tRvb)/ s=マスターFX。測れない案は null。
   TRKレッスン: 各トラックの音(インサートまで)を足して master() を通す。単音レッスン: デモの和音を1本として同様に。評価は後半(ループ2回目以降)・単音は全体(余韻を含む) */
async function levelsFx(SD,L,st){const out=[],tail=2.5;
 for(const v of st.cmp||[]){
  if(v.ln){out.push(null);continue}/* オートメーションのレーン(時間で変わる)は測らない */
  const P=Object.assign(BASEP(SD),SD.defs.analog.DEF&&{},L.init,v.s||{}),bpm=P.sBpm||120;let tr=[];
  if(L.mode==='trk'){
   for(let k=0;k<L.tk.length;k++){if((v.mt||[]).indexOf(k)>=0)continue;const t=L.tk[k],dry=await E.trackDry(SD,L,t,3),m=Object.assign({},SD.MIXDEF(),SD.mxToMix(t.o.mx),t.o.mix||{},(v.tm||{})[k+1]||{}),r=E.runChain(SD,dry,m);
    tr.push({L:r.L,R:r.R,d:m.tDly==null?1:m.tDly,r:m.tRvb==null?1:m.tRvb})}}
  else{const D=SD.defs.analog.DEF,dm=L.demo,patch=Object.assign({},D,L.init,v.s||{}),hold=dm.len||.7,gap=dm.gap||1.4,n=Math.round(((dm.n.length-1)*gap+hold+tail)*SR),y=new Float32Array(n);
   for(let i=0;i<dm.n.length;i++){const b=await E.renderNote(SD,patch,[].concat(dm.n[i])[0],1,hold,hold+.5,'analog'),o=Math.round(i*gap*SR);for(let k=0;k<b.length&&o+k<n;k++)y[o+k]+=b[k]}
   tr.push({L:y,R:y.slice(),d:1,r:1})}
  const n=tr[0].L.length,z=()=>new Float32Array(n),dl=z(),dr=z(),sl=z(),sr=z(),rl=z(),rr=z();
  tr.forEach(t=>{sum(dl,t.L,1);sum(dr,t.R,1);sum(sl,t.L,t.d);sum(sr,t.R,t.d);sum(rl,t.L,t.r);sum(rr,t.R,t.r)});
  const o=await master(SD,dl,dr,sl,sr,rl,rr,P,bpm),a=L.mode==='trk'?Math.round(n*2/3):0;let e=0;for(let i=a;i<n;i++)e+=(o[0][i]*o[0][i]+o[1][i]*o[1][i])/2;
  out.push(10*Math.log10(e/(n-a)+1e-20))}
 return out}
async function levels(SD,L,st){
 if(!L.id||+L.id.slice(2)<8||L.id==='ef16'){/* v7.7a のレッスン */
  if(L.mode==='trk')return E.cmpLevels(SD,L,st);const out=[];for(const v of st.cmp||[])out.push(v.s?await fxLevel(SD,L,v.s):null);return out}
 return levelsFx(SD,L,st)}
module.exports=Object.assign({},E,{fxLevel,levels,levelsFx,master,runSt,rvbIR,ms});
