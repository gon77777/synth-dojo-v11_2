/* EQコース(v7.5〜)の聞き比べ音量の「推定」(音声を描画せずに計算)。tools/eq-cal.js が g を出し、test/eq.js が差1dB以内を検査する。
   実際の描画(node-web-audio-api)での確認は test/quality.js 側。ここは各音を単純なスペクトルで近似した目安 */
const fs=require('fs'),vm=require('vm'),path=require('path');
const W=path.join(__dirname,'..','www','js'),DSP=require(path.join(W,'fxdsp.js'));
function loadSD(){const ctx={console,setTimeout,clearTimeout,Float32Array,Float64Array};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 ['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','modlib.js','mixdefs.js','fxnew.js','fxparams.js','seq.js','drums.js','auto.js','lessons.js','lessons2.js','wtlessons.js','seqlessons.js','modlessons.js','grlessons.js','fmlessons.js','addlessons.js','aulessons.js','course.js','eq.js','fq.js','mx.js','se.js','ms.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(W,f),'utf8'),ctx,{filename:f}));return ctx.SD}
const hz=m=>440*Math.pow(2,(m-69)/12);
/* 音の近似スペクトル: [{f,p}](p=パワー・合計1) */
function saw(f0,cut,res){const o=[];let s=0;for(let n=1;n*f0<20000;n++){const f=n*f0,lp=1/(1+Math.pow(f/cut,8)),bump=res?Math.pow(10,res*12*Math.exp(-Math.pow(Math.log2(f/cut)/.4,2))/10):1,p=lp*bump/(n*n);o.push({f,p});s+=p}return o.map(x=>({f:x.f,p:x.p/s}))}
function noise(shape){const o=[];let s=0;for(let f=20;f<20000;f+=f<1000?10:50){const p=shape(f)*(f<1000?10:50);o.push({f,p});s+=p}return o.map(x=>({f:x.f,p:x.p/s}))}
const kick=()=>noise(f=>1/(1+Math.pow(f/100,4))),hatC=()=>noise(f=>Math.pow(f/6000,4)/(1+Math.pow(f/6000,4)));
const snr=()=>noise(f=>Math.pow(f/150,2)/(1+Math.pow(f/150,2))/(1+Math.pow(f/7000,4))),clp=()=>noise(f=>Math.pow(f/900,4)/(1+Math.pow(f/900,4))/(1+Math.pow(f/5000,4))),ohat=hatC;
function comp(id,o){const p=o.p||{};if(id==='kick')return kick();if(id==='hat')return hatC();if(id==='snare')return snr();if(id==='clap')return clp();if(id==='ohat')return ohat();if(id.slice(0,3)==='vo_')return saw(220,4000,0);return saw(hz(33+(o.tr|0)),p.cutoff||9000,p.res||0)}
const W_={kick:1,hat:.2,snare:.6,clap:.6,ohat:.2};
const flat={};
function eqFromMaster(s){return{iEqHpf:s.eqHpf,iEqLf:200,iEqLg:s.eqLo,iEqB1f:s.eqMidF,iEqB1g:s.eqMid,iEqB1q:s.eqMidQ,iEqB2g:0,iEqHf:4000,iEqHg:s.eqHi,iEqLpf:s.eqLpf}}
function level(spec,eq,m2){const fr=spec.map(x=>x.f),db=eq?DSP.eq4Curve(eq,fr,48000):fr.map(()=>0),d2=m2?DSP.eq4Curve(m2,fr,48000):null;if(d2)d2.forEach((v,i)=>{db[i]+=v});let s=0;spec.forEach((x,i)=>{s+=x.p*Math.pow(10,db[i]/10)});return s}
/* ステップの cmp 各案の推定レベル(dB)。mt だけの案は null */
function stepLevels(L,st){return(st.cmp||[]).map(v=>{
 if(v.ln||v.au===false)return null;
 if(v.s&&!L.tk){const sp=saw(hz(60),18000,0);return 10*Math.log10(level(sp,eqFromMaster(v.s)))}
 if((v.tm||v.s)&&L.tk){const m2=v.s&&v.s.eqOn?eqFromMaster(v.s):null;let tot=0;L.tk.forEach((x,i)=>{const t=i+1,w=W_[x.id]||1,init=x.o.mx&&x.o.mx.eq?x.o.mx.eq:null,eq=((v.tm||{})[t]?v.tm[t]:init);tot+=w*level(comp(x.id,x.o),eq&&Object.assign({},eq),m2)});return 10*Math.log10(tot)}
 return null})}
module.exports={loadSD,stepLevels};
