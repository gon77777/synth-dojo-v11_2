// 音の質の検証(テストのみ・アプリには入れない): node test/quality.js
// お手本をオフライン描画し、帯域・RMS・ピーク・ステレオ幅・基音・立ち上がりを測る。聴感の良し悪しは実機で確認。
// 要: npm i --no-save node-web-audio-api@2.2.0 (v8.0で版を固定。CIも同じ。無い場合、CI以外ではスキップ)
const fs=require('fs'),path=require('path'),vm=require('vm');
if(!process.argv.includes('--child')){const cp=require('child_process');let r;for(let k=1;k<=3;k++){r=cp.spawnSync(process.execPath,[__filename,'--child'],{encoding:'utf8'});if(r.status===0||r.status===1)break;console.log('再試行 '+k+'/3(描画ライブラリの不安定: '+(r.status===2?'NaN':'クラッシュ')+')')}
 process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exit(r.status===0?0:1)}
let OAC;try{OAC=require('node-web-audio-api').OfflineAudioContext}catch(e){if(process.env.CI){console.error('NG: node-web-audio-api が無い');process.exit(1)}console.log('SKIP: node-web-audio-api 未インストール(npm i --no-save node-web-audio-api)');process.exit(0)}
const w=path.join(__dirname,'..','www','js'),ctx0={console};ctx0.window=ctx0;vm.createContext(ctx0);
['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','modlib.js','mixdefs.js','fxnew.js','fxparams.js','seq.js','drums.js','auto.js','lessons.js','course.js','th.js','ly.js','ldpd.js','bs.js','plsq.js','fxl.js','ad.js','gn1.js','gn2.js','gn3.js','hs.js','eq.js','cm.js','ef.js','pn.js','fq.js','vo.js','mx.js','se.js','ms.js','synth.js','add.js','voice.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),ctx0,{filename:f}));
/* 決定的にする(v8.0): お手本のノイズ(Math.random)を固定の乱数列にして、実行ごと・描画の順序・再試行で値が揺れないようにする(render の頭で毎回リセット) */
vm.runInContext('(function(){var s=20260101;Math.random=function(){s=(s*1664525+1013904223)>>>0;return s/4294967296};Math.reseed=function(){s=20260101}})()',ctx0);
const SD=ctx0.SD;let err=0;const bad=m=>{console.error('NG: '+m);err++};
const SR=44100;
/* ---- 測定関数 ---- */
function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
 for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const u=i+k,v=i+k+len/2,tr=re[v]*cr-im[v]*ci,ti=re[v]*ci+im[v]*cr;re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
function bands(x,t0){const N=16384,re=new Float64Array(N),im=new Float64Array(N),o=Math.round(t0*SR);for(let i=0;i<N;i++)re[i]=(x[o+i]||0)*(0.5-0.5*Math.cos(2*Math.PI*i/(N-1)));fft(re,im);
 const e={},tot={v:0};SD.BANDS.forEach(b=>e[b.id]=0);for(let k=1;k<N/2;k++){const f=k*SR/N,p=re[k]*re[k]+im[k]*im[k];if(f<20||f>20000)continue;tot.v+=p;const b=SD.BANDS.find(b=>f>=b.lo&&f<b.hi);if(b)e[b.id]+=p}
 SD.BANDS.forEach(b=>e[b.id]=tot.v?e[b.id]/tot.v:0);return e}
const peak=x=>{let m=0;for(const v of x)m=Math.max(m,Math.abs(v));return m};
const rms=(x,a,b)=>{let s=0;a=Math.round(a*SR);b=Math.round(b*SR);for(let i=a;i<b;i++)s+=x[i]*x[i];return Math.sqrt(s/(b-a))};
function corr(L,R){let a=0,b=0,c=0;for(let i=0;i<L.length;i++){a+=L[i]*L[i];b+=R[i]*R[i];c+=L[i]*R[i]}return a&&b?c/Math.sqrt(a*b):1}
/* 基音の検出(v8.0で改良): 窓を複数(t0から0.08秒おき・最大5つ)とり、各窓で FFT 自己相関の「最初に強い山」(最大の0.85倍以上のうち最短のラグ)を採って放物線補間。窓どうしは±3%でまとめ、数が多い群(同数なら高い方)を答えにする。
   オクターブ下に取り違える旧方式(最大の山を選ぶ)の対策。決定的(乱数なし)。自己検証は下の selfTest。 */
function pitch(x,t0){const N=8192,M=16384,lo=Math.round(SR/1000),hi=Math.round(SR/30),cand=[];let r0=0;
 for(let w=0;w<5;w++){const o=Math.round((t0+.08*w)*SR);if(o+N>x.length)break;const re=new Float64Array(M),im=new Float64Array(M);let e=0;for(let i=0;i<N;i++){re[i]=x[o+i];e+=x[o+i]*x[o+i]}
  const rm=Math.sqrt(e/N);if(w===0)r0=rm;if(rm<1e-4||rm<.2*r0)continue;
  fft(re,im);for(let k=0;k<M;k++){re[k]=re[k]*re[k]+im[k]*im[k];im[k]=0}fft(re,im);const r=re;
  let k=lo;while(k<hi&&r[k]>0)k++;let gm=0;for(let l=k;l<=hi;l++)if(r[l]>gm)gm=r[l];if(!(gm>0))continue;
  let bl=-1;for(let l=Math.max(k,lo+1);l<hi;l++)if(r[l]>=r[l-1]&&r[l]>=r[l+1]&&r[l]>=.85*gm){bl=l;break}if(bl<0)continue;
  const a=r[bl-1],b=r[bl],c=r[bl+1],d=a-2*b+c,sh=d?0.5*(a-c)/d:0;cand.push(SR/(bl+sh))}
 if(!cand.length)return 0;let best=null;for(const f of cand){const grp=cand.filter(g=>Math.abs(g/f-1)<.03);if(!best||grp.length>best.n||(grp.length===best.n&&f>best.f))best={n:grp.length,f:grp.reduce((a,b)=>a+b,0)/grp.length}}return best.f}
function attack(x){const pk=peak(x.subarray(0,Math.round(.5*SR)));for(let i=0;i<x.length;i++)if(Math.abs(x[i])>=pk*.9)return i/SR;return -1}
/* ---- オフライン描画(アナログ単音。hold秒だけ押して離す) ---- */
async function render(patch,notes,hold,total,synth,_try){_try=_try||0;vm.runInContext('Math.reseed()',ctx0);const c=new OAC(2,Math.round(total*SR),SR),bus={init:()=>c,input:c.destination,set(){}},syn=synth==='add'?new SD.ADD(bus):new SD.Synth(bus);
 if(synth==='add'){syn.init();syn.setPatch(Object.assign({},SD.defs.add.DEF,patch))}else{syn.p=Object.assign({},SD.defs.analog.DEF,patch);syn.init()}[].concat(notes).forEach(n=>syn.noteOn(n,1));
 let susp=false;c.suspend(hold).then(()=>{[].concat(notes).forEach(n=>syn.noteOff(n));c.resume()}).catch(()=>{susp=true});const b=await c.startRendering();if(susp&&_try<8)return render(patch,notes,hold,total,synth,_try+1);const o=[Float32Array.from(b.getChannelData(0)),Float32Array.from(b.getChannelData(1))];if(o.some(a=>a.some(v=>v!==v))||peak(o[0])<1e-4||peak(o[0])>10)throw new Error('FLAKY');return o}
const refPatch=L=>{const s=Object.assign({},SD.defs.analog.DEF,L.init);L.steps.forEach(st=>{Object.assign(s,st.s||{});(st.f||[]).forEach(([id,g])=>{if(g!==undefined)s[id]=g})});return s};
(async()=>{
 /* 基音検出の自己検証(合成した既知の音。描画ライブラリに依らない): サイン・ノコギリ・矩形・離調した2本・低い音・倍音が基音より強い音 */
 {const gen=(f,fn,sec)=>{const x=new Float32Array(Math.round((sec||1.6)*SR));for(let i=0;i<x.length;i++)x[i]=fn(f*i/SR);return x},saw=p=>2*(p-Math.floor(p))-1,sq=p=>p-Math.floor(p)<.5?1:-1,sn=p=>Math.sin(2*Math.PI*p);
  const T=[['サイン55Hz',gen(55,sn),55],['ノコギリ130.81Hz',gen(130.81,saw),130.81],['ノコギリ440Hz',gen(440,saw),440],['矩形261.63Hz',gen(261.63,sq),261.63],['ノコギリ32.7Hz',gen(32.7,saw),32.7],
   ['離調2本(220Hz+7セント)',(()=>{const a=gen(220,saw),b=gen(220*Math.pow(2,7/1200),saw);return a.map((v,i)=>.5*(v+b[i]))})(),220],
   ['2倍音が強い(130Hz)',gen(130,p=>.4*sn(p)+1*sn(2*p)+.5*sn(3*p)),130]];
  for(const [nm,x,f] of T){const d=pitch(x,.3);if(!(Math.abs(d/f-1)<.02))bad('自己検証: 基音検出 '+nm+' 期待'+f+' 実測'+d.toFixed(1))}}
 /* 測定関数の自己検証(既知の音) */
 {const [l,r]=await render({o1Wave:'sine',o1Lvl:1,o2Lvl:0,subLvl:0,cutoff:20000,aA:.004,aS:1,aR:.1},33,1,1.6),e=bands(l,.3),f0=pitch(l,.3);
  if(e.sub<.9)bad('自己検証: 55Hzのサインのサブ比 '+e.sub.toFixed(2));if(Math.abs(f0-55)>1.5)bad('自己検証: 基音検出 '+f0.toFixed(1)+'Hz');
  if(corr(l,r)<.99)bad('自己検証: モノ音源の左右相関');if(attack(l)>.03)bad('自己検証: 立ち上がり '+attack(l));if(!(rms(l,.3,.9)>.01))bad('自己検証: RMS');if(peak(l)>1)bad('自己検証: ピーク');
  const [s2]=await render({o1Wave:'sawtooth',o1Lvl:1,o2Lvl:0,subLvl:0,cutoff:20000,aA:.004,aS:1,aR:.1},69,1,1.6),e2=bands(s2,.3);if(e2.sub+e2.low>.01||e2.mid+e2.hmid+e2.pres+e2.air<.3)bad('自己検証: 440Hzのノコギリの帯域')}
 /* お手本の検証: 主張(claim)・基音・クリップ無し */
 let n=0;
 for(const L of SD.LESSONS.filter(l=>l.course&&l.synth==='analog'&&!l.tk&&l.kind!=='read')){
  const p=refPatch(L),nt=(L.claim&&L.claim[0]&&L.claim[0].n)||(L.demo.n[0]);
  const pk0=(p.aS||0)<.05,t0=pk0?.03:.3,t1=pk0?.2:.9,tonal=(p.o1Lvl>0||p.o2Lvl>0||p.subLvl>0),[l,r]=await render(p,nt,1,1.6),e=bands(l,t0);n++;
  if(peak(l)>1.0)bad(L.id+' お手本がクリップ '+peak(l).toFixed(2));if(!(rms(l,t0,t1)>.005))bad(L.id+' お手本が無音');
  /* 基音: 音を出す発振器が無い(ノイズだけ)・和音(共通の周期が基音より低くなる)なら検査しない。ピッチEG(pAmt)がある音色は、落ち着いてから(4×pDec後)測る。サブ発振器が鳴る音色は、1オクターブ下が実際の周期になるので期待を f0 と f0/2 のどちらも許す */
  const chord=!!nt.length,pt0=p.pAmt?Math.min(4*(p.pDec||.3),1.2):t0,f0=440*Math.pow(2,((nt.length?nt[0]:nt)-69)/12),d=(tonal&&!chord)?pitch(l,pt0):0;if(tonal&&!chord&&!(Math.abs(d/f0-1)<=.05||(p.subLvl>0&&Math.abs(d/(f0/2)-1)<=.05)))bad(L.id+' 基音が違う 期待'+f0.toFixed(1)+' 実測'+d.toFixed(1));
  (L.claim||[]).forEach(q=>{if(e[q.band]<q.min)bad(L.id+' 主張「'+q.band+'帯域が'+q.min+'以上」が成り立たない('+e[q.band].toFixed(2)+')')})}
 /* 声の代役(v7.4): 母音・息・子音を単音で描画し、NaN・クリップ・無音が無いこと。描画の準備(アディティブのオフライン接続など)に失敗したら SKIP を表示 */
 for(const v of SD.VOICES){
  if(v.synth==='add'&&typeof AudioWorkletNode==='undefined'){console.log('SKIP: 声の代役 '+v.id+'(アディティブは AudioWorklet が要る。この環境では描画できない。声の質は test/voice.js が検査)');continue}
  if(v.synth==='smp'){console.log('SKIP: 声の代役 '+v.id+'(取り込み素材は同梱しないので描画できない)');continue}
  try{
   const Cls=v.synth==='add'?SD.ADD:SD.Synth,c=new OAC(2,Math.round(1.6*SR),SR),bus={init:()=>c,input:c.destination,set(){}},syn=new Cls(bus);
   syn.init();syn.setPatch(Object.assign({},SD.defs[v.synth].DEF,v.p));syn.noteOn(v.n,1);
   c.suspend(.8).then(()=>{syn.noteOff(v.n);c.resume()});
   const b=await c.startRendering(),l=Float32Array.from(b.getChannelData(0));n++;
   if(l.some(q=>q!==q))bad(v.id+' 声の代役に NaN');else{if(peak(l)>1.0)bad(v.id+' 声の代役がクリップ '+peak(l).toFixed(2));if(!(peak(l)>.005))bad(v.id+' 声の代役が無音')}
  }catch(e){console.log('SKIP: 声の代役 '+v.id+' の描画に失敗('+e.message+')')}
 }
 /* TRKレシピ: 各トラックの音色(お手本+o.p)の単音を足し合わせ、リミッター前でクリップしないこと。サブがサブ〜ローに、ミッドが中域以上にあること */
 for(const L of SD.LESSONS.filter(l=>l.course&&l.tk)){
  const bufs=[];for(const t of L.tk){const dr=SD.DRUMBY[t.id]||SD.VOICEBY[t.id],sy0=dr&&dr.synth||'analog',sy=(sy0==='add'||sy0==='smp')?'analog':sy0,src=dr?{demo:{n:[dr.n]}}:SD.LESSONS.find(x=>x.id===t.id),p=dr?Object.assign({},SD.defs[sy].DEF,(sy0==='add'||sy0==='smp')?{o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:2500,res:.2,envAmt:0,drive:0,aA:.06,aD:.2,aS:.85,aR:.25}:dr.p,t.o.p||{}):Object.assign(refPatch(src),t.o.p||{}),nt=(src.demo.n[0].length?src.demo.n[0][0]:src.demo.n[0])+(t.o.tr|0);const bb=await render(p,nt,.5,1.2,sy),vg=(t.o.mix&&t.o.mix.tVol!==undefined)?SD.volGain(t.o.mix.tVol):1;bufs.push({t,b:bb.map(a=>vg===1?a:a.map(v=>v*vg))})}
  /* 同じステップで実際に重なるトラックだけを足す(最悪のステップで判定) */
  let worst=0;const seen=new Set();for(let st=0;st<16;st++){const on=bufs.filter(x=>x.t.idx[st]!==undefined),key=on.map(x=>bufs.indexOf(x)).join();if(seen.has(key))continue;seen.add(key);
   const sm=new Float32Array(Math.round(1.2*SR));on.forEach(x=>{for(let i=0;i<sm.length;i++)sm[i]+=x.b[0][i]});worst=Math.max(worst,peak(sm))}n++;
  if(worst>1.0)bad(L.id+' 同時に鳴るトラックのピークが1.0超 '+worst.toFixed(2));
  const sub=bufs.find(x=>x.t.o.name==='サブ'),mid=bufs.find(x=>x.t.o.name==='ミッド');
  if(sub){const e=bands(sub.b[0],.1),low=e.sub+e.low;if(low<.8)bad(L.id+' サブの低域比が低い '+low.toFixed(2))}
  if(mid){const e=bands(mid.b[0],.1),lo=e.sub+e.low,hi=e.mid+e.hmid+e.pres+e.air;if(lo>.35)bad(L.id+' ミッドに低域が多い(本文は「低域がほぼ出ない」) '+lo.toFixed(2));if(e.lmid+hi<.65)bad(L.id+' ミッドのローミッド以上の比が低い '+(e.lmid+hi).toFixed(2))}}
 /* v5.1 ドラム音色(SD.DRUMS): 無音・クリップ・NaNが無いこと、帯域が名前と矛盾しないこと */
 const DR={};
 for(const d of SD.DRUMS){const [l]=await render(Object.assign({},SD.defs.analog.DEF,d.p),d.n,.25,1),e=bands(l,.002);n++;DR[d.id]=e;
  if(l.some(v=>!isFinite(v)))bad('ドラム '+d.id+' にNaN');if(peak(l)>1.0)bad('ドラム '+d.id+' がクリップ '+peak(l).toFixed(2));if(!(rms(l,.002,.15)>.005))bad('ドラム '+d.id+' が無音');
  const hi=e.hmid+e.pres+e.air,lo=e.sub+e.low+e.lmid;
  if((d.id==='shaker'||d.id==='ohat')&&hi<.7)bad('ドラム '+d.id+' の高域(ハイミッド以上)が少ない '+hi.toFixed(2));
  if(d.id==='clap'&&e.mid+hi<.7)bad('ドラム clap の中高域が少ない '+(e.mid+hi).toFixed(2));
  if((d.id==='tom'||d.id==='conga')&&lo<.6)bad('ドラム '+d.id+' の低〜ローミッドが少ない '+lo.toFixed(2))}
 if(process.env.DRUMLOG)console.log(JSON.stringify(DR));
 console.log(err?('失敗 '+err+'件'):'OK: 音の質 お手本'+n+'本');process.exit(err?1:0);
})().catch(e=>{if(e.message==='FLAKY'){console.error('FLAKY');process.exit(2)}console.error('NG: '+e.stack);process.exit(1)});
