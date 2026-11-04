/* EFコース(v7.7a〜)の検査。node-web-audio-api が要る(無ければ SKIP)。
   ① 聞き比べの音量差が1dB以内(cmp.g を入れた状態で。tm=トラック別インサート・s=マスターFX) ② 本文・クイズの主張が音に出ている(ゲートが余韻を切る・歪みで高域の倍音が増える・MODが左右を変える・EQ→COMPはGRが増える) */
const E=require('./efest.js'),SD=E.loadSD(),SR=E.SR;let err=0;const bad=m=>{console.error('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const LS=SD.LESSONS.filter(l=>l.course==='EF'),ids='ef01 ef02 ef03 ef04 ef05 ef06 ef07 ef08 ef09 ef10 ef11 ef12 ef13 ef14 ef15 ef16'.split(' ');
ok(ids.every(i=>LS.some(l=>l.id===i)),'EFコース(v7.7a・v7.7b)のレッスンが足りない');
LS.forEach(L=>{ok(L.steps.length>=5&&L.steps.length<=8,L.id+' ステップ数は5〜8');ok(L.steps.some(s=>s.col),L.id+' コラムが無い')});
const G=o=>Object.assign({iGtOn:1,iGtThr:-50,iGtHold:100,iGtRel:200,iGtRange:-60},o);
(async()=>{
 if(!E.hasRender){if(process.env.CI){bad('node-web-audio-api が無い')}else console.log('SKIP: 測定(node-web-audio-api 未インストール)');process.exit(err?1:0)}
 let nC=0;
 for(const L of LS)for(let si=0;si<L.steps.length;si++){const st=L.steps[si];if((st.cmp||[]).length<2)continue;
  const lv=await E.levels(SD,L,st);if(lv.some(x=>x==null))continue;nC++;const sp=SD.MixGoal.cmpSpread(lv,st.cmp.map(c=>c.g||0));ok(sp<=1.0,L.id+' step'+(si+1)+' 聞き比べの音量差が1dBを超える '+sp.toFixed(2)+'dB')}
 /* ② 主張 */
 const lesson=id=>LS.find(l=>l.id===id),patch=(L,k)=>Object.assign({},SD.defs.analog.DEF,L.tk[k].o.p);
 const win=(x,a,b)=>{let e=0;const i0=Math.round(a*SR),i1=Math.round(b*SR);for(let i=i0;i<i1;i++)e+=x[i]*x[i];return 10*Math.log10(e/(i1-i0)+1e-20)};
 const gated=(b,o)=>E.runProc('sd-gate',b,{threshold:o.iGtThr,hold:o.iGtHold,release:o.iGtRel,range:o.iGtRange})[0];
 {/* ef01: 余韻(0.15〜0.5秒)がゲートで小さくなる。THRESHが高いほど・HOLDが短いほど・RELEASEが短いほど早く切れる */
  const L=lesson('ef01'),b=await E.renderNote(SD,patch(L,1),57,1,.075,.675,'analog'),t=o=>win(gated(b,G(o)),.3,.65),dry=win(b,.3,.65);
  ok(t({iGtThr:-20,iGtHold:60,iGtRel:120})<dry-2,'ef01: ゲートで余韻が小さくならない');
  const a=t({iGtThr:-36,iGtHold:60,iGtRel:120}),m=t({iGtThr:-24,iGtHold:60,iGtRel:120}),h=t({iGtThr:-12,iGtHold:60,iGtRel:120});ok(a>m&&m>h,'ef01 step2: THRESHが高いほど余韻が小さい '+[a,m,h].map(x=>x.toFixed(1)));
  const h0=t({iGtThr:-20,iGtHold:0,iGtRel:120}),h4=t({iGtThr:-20,iGtHold:400,iGtRel:120});ok(h4>h0+1,'ef01 step3: HOLDが長いほど余韻が残る '+h0.toFixed(1)+' '+h4.toFixed(1));
  const r1=t({iGtThr:-20,iGtHold:60,iGtRel:20}),r3=t({iGtThr:-20,iGtHold:60,iGtRel:1500});ok(r3>r1+1,'ef01 step4: RELEASEが短いほど早く消える '+r1.toFixed(1)+' '+r3.toFixed(1));
  const g0=t({iGtThr:-14,iGtHold:0,iGtRel:40,iGtRange:0}),g12=t({iGtThr:-14,iGtHold:0,iGtRel:40,iGtRange:-12}),g60=t({iGtThr:-14,iGtHold:0,iGtRel:40,iGtRange:-60});ok(Math.abs(g0-dry)<.5&&g12>g60+3&&g0>g12+3,'ef01 step5: RANGE 0dBは素通し・-12より-60が小さい '+[g0,g12,g60].map(x=>x.toFixed(1)));
  const r=await E.measure(SD,L,{2:G({iGtThr:-20,iGtHold:60,iGtRel:120})}),r2=await E.measure(SD,L,{2:G({iGtThr:-6,iGtHold:10,iGtRel:20})});ok(r2.tr[2]<r.tr[2]-6,'ef01 step6: THRESH高すぎで音の本体まで削れる '+r.tr[2].toFixed(1)+' '+r2.tr[2].toFixed(1))}
 {/* ef02: 尾の長いスネアの尾を切ると余韻が小さくなる。リズムゲートはLFOの谷を切る */
  const L=lesson('ef02'),b=await E.renderNote(SD,patch(L,2),38,1,.075,.675,'analog'),dry=win(b,.2,.6),y=win(gated(b,G({iGtThr:-18,iGtHold:60,iGtRel:20})),.2,.6);ok(y<dry-6,'ef02 step4: ゲートで尾が切れる '+dry.toFixed(1)+' '+y.toFixed(1));
  const c=await E.renderNote(SD,patch(L,1),57,1,.4,.9,'analog'),yc=gated(c,G({iGtThr:-16,iGtHold:0,iGtRel:20}));ok(win(yc,0,.4)<win(c,0,.4)-1.5,'ef02 step1: リズムゲートでLFOの谷が切れる')}
 {/* ef03: 歪みで倍音が増える(波形の細かい変化=1次差分のエネルギー比が増える)。FUZZがいちばん荒い */
  const L=lesson('ef03'),b=await E.renderNote(SD,patch(L,1),33,1,.5,.7,'analog'),hf=x=>{let a=0,d=0;for(let i=1;i<x.length;i++){a+=x[i]*x[i];d+=(x[i]-x[i-1])*(x[i]-x[i-1])}return d/(a+1e-20)};
  const S=o=>E.runChain(SD,b,Object.assign({iSaOn:1,iSaType:1,iSaDrive:.3,iSaTone:20000,iSaMix:1,iSaOut:0},o)).L;
  ok(hf(S({iSaDrive:.9}))>hf(b)*1.05,'ef03: DRIVEで倍音(高域)が増える '+hf(b).toFixed(3)+' → '+hf(S({iSaDrive:.9})).toFixed(3));
  const n=hf(S({iSaType:3,iSaDrive:.5})),m=hf(S({iSaType:4,iSaDrive:.5})),f=hf(S({iSaType:5,iSaDrive:.5}));ok(f>n&&f>m,'ef03 step4: FUZZがいちばん荒い NEVE'+n.toFixed(3)+' MICPRE'+m.toFixed(3)+' FUZZ'+f.toFixed(3));
  ok(hf(S({iSaType:5,iSaDrive:.6,iSaTone:3000}))<hf(S({iSaType:5,iSaDrive:.6,iSaTone:20000})),'ef03 step5: TONEを下げると高域が丸まる')}
 {/* ef06・ef07: MODでステレオになる(左右が違う)。FEEDBACKで変わる */
  const L=lesson('ef06'),b=await E.renderNote(SD,patch(L,1),57,1,1.2,1.5,'analog'),M=o=>E.runChain(SD,b,Object.assign({iMdOn:1,iMdType:0,iMdRate:.8,iMdDepth:.5,iMdFb:0,iMdMix:.5},o)),cor=r=>{let a=0,c=0,d=0;for(let i=0;i<r.L.length;i++){a+=r.L[i]*r.R[i];c+=r.L[i]*r.L[i];d+=r.R[i]*r.R[i]}return a/Math.sqrt(c*d+1e-20)};
  ok(cor(M({iMdType:0}))<.995,'ef06: コーラスで左右が違う '+cor(M({iMdType:0})).toFixed(3));ok(cor(M({iMdType:1}))<.995,'ef06: ダブラーで左右が違う '+cor(M({iMdType:1})).toFixed(3));
  const d=(p,q)=>{let e=0,a=0;for(let i=0;i<p.length;i++){e+=(p[i]-q[i])*(p[i]-q[i]);a+=p[i]*p[i]}return e/(a+1e-20)};
  ok(d(M({iMdType:2,iMdFb:0,iMdRate:.4,iMdDepth:.6}).L,M({iMdType:2,iMdFb:.85,iMdRate:.4,iMdDepth:.6}).L)>.01,'ef07: FEEDBACKで音が変わる');
  ok(d(M({iMdType:2,iMdRate:.4,iMdDepth:.6,iMdFb:.5}).L,M({iMdType:3,iMdRate:.4,iMdDepth:.6,iMdFb:.5}).L)>.01,'ef07: フランジャーとフェイザーは違う音')}
 {/* ef16: EQで低域を持ち上げてからCOMP(EQ→COMP)のほうが、GRが大きい */
  const L=lesson('ef16'),gr=async o=>{const r=await E.measure(SD,L,{2:Object.assign({iEqOn:1,iEqLg:12,iEqLf:120,iCpOn:1,iCpThr:-26,iCpRatio:4},o)}),a=r.gr[2].slice(r.gr[2].length/3|0);return a.reduce((x,y)=>x+y,0)/a.length};
  const a=await gr({iOrd:0}),b=await gr({iOrd:1});ok(a>b+.5,'ef16: EQ→COMP のほうがGRが大きい EQ→COMP '+a.toFixed(1)+' COMP→EQ '+b.toFixed(1))}

 /* ===== v7.7b: ef08〜ef15(マスターFXの近似描画 E.master で測る) ===== */
 {const P0=SD.FXDEF,Z=n=>new Float32Array(n),N=Math.round(3.5*SR),lead=await E.renderNote(SD,patch(lesson('ef09'),2),69,1,.15,.5,'analog');
  const note=Z(N);lead.forEach((v,i)=>{if(i<N)note[i]=v});
  const wet=async o=>(await E.master(SD,Z(N),Z(N),note,note,note,note,Object.assign({},P0,{dlyMix:0,rvbMix:0},o),120))[0];
  const onset=(y,f)=>{let m=0;for(let i=Math.round(.03*SR);i<y.length;i++)m=Math.max(m,Math.abs(y[i]));for(let i=Math.round(.03*SR);i<y.length;i++)if(Math.abs(y[i])>f*m)return i/SR;return -1};
  const en=(y,a,b)=>10*Math.log10(E.ms(y.subarray(Math.round(a*SR),Math.round(b*SR)))+1e-20);
  const hf=x=>{let a=0,d=0;for(let i=1;i<x.length;i++){a+=x[i]*x[i];d+=(x[i]-x[i-1])*(x[i]-x[i-1])}return d/(a+1e-20)};
  const D=o=>Object.assign({dlyMix:1,dlyFb:0,dlySync:1,dlyDiv:5,dlyTime:.3,dlyTone:12000},o);
  /* ef08: SYNC の音符と時間 / FB / TONE */
  {const a=onset(await wet(D({dlyDiv:5})),.3),b=onset(await wet(D({dlyDiv:3})),.3),c=onset(await wet(D({dlySync:0,dlyTime:.3})),.3);
   ok(Math.abs(a-.25)<.02,'ef08: 1/8 は BPM120 で約250ms '+a);ok(Math.abs(b-.5)<.02,'ef08: 1/4 は約500ms '+b);ok(Math.abs(c-.3)<.02,'ef08: FREE 300ms '+c);
   const f1=await wet(D({dlyFb:.1})),f8=await wet(D({dlyFb:.8}));ok(en(f8,1,3.2)>en(f1,1,3.2)+6,'ef08 step4: FBが高いほど繰り返しが残る '+en(f1,1,3.2).toFixed(1)+' '+en(f8,1,3.2).toFixed(1));
   const t1=await wet(D({dlyFb:.6,dlyTone:1200})),t2=await wet(D({dlyFb:.6,dlyTone:12000}));ok(hf(t1)<hf(t2)*.8,'ef08 step5: TONEを下げると繰り返しが暗い '+hf(t1).toFixed(3)+' '+hf(t2).toFixed(3))}
  /* ef09: スラップは短く1回・付点8分=375ms */
  {const s=onset(await wet(D({dlySync:0,dlyTime:.09})),.3),d=onset(await wet(D({dlyDiv:4})),.3);ok(Math.abs(s-.09)<.02&&s<.15,'ef09 step1: スラップは短い遅れ '+s);ok(Math.abs(d-.375)<.02,'ef09 step2: 付点8分は約375ms '+d);
   const y=await wet(D({dlySync:0,dlyTime:.09,dlyFb:0}));ok(en(y,.4,3)<en(y,.05,.35)-25,'ef09 step1: FB0%なら1回だけで繰り返さない')}
  /* ef10・ef11: リバーブ(IR・PRE・DAMP・SIZE・送り量) */
  {const R=o=>Object.assign({},P0,{dlyMix:0,rvbMix:.5,rvbType:2,rvbSize:2,rvbPre:0,rvbDamp:.5},o),W=async o=>(await E.master(SD,Z(N),Z(N),Z(N),Z(N),note,note,R(o),120))[0];
   const big=await W({rvbSize:4}),small=await W({rvbSize:.6});ok(en(big,1.2,3)>en(small,1.2,3)+10,'ef10 step3: SIZEが大きいほど響きが長い '+en(big,1.2,3).toFixed(1)+' '+en(small,1.2,3).toFixed(1));
   const p0=onset(await W({rvbPre:0}),.05),p9=onset(await W({rvbPre:90}),.05);ok(p9-p0>.06,'ef10 step4: PRE DLYで響きの始まりが遅れる '+p0+' '+p9);
   const i1=E.rvbIR({rvbType:2,rvbSize:2,rvbDamp:.1}).L,i9=E.rvbIR({rvbType:2,rvbSize:2,rvbDamp:.9}).L,lt=x=>x.subarray(Math.round(.3*SR),Math.round(1.2*SR));ok(hf(lt(i9))<hf(lt(i1))*.7,'ef10 step5: DAMPが高いほど響きの後半が暗い '+hf(lt(i1)).toFixed(3)+' '+hf(lt(i9)).toFixed(3));
   const m1=await W({rvbMix:.1}),m6=await W({rvbMix:.6});ok(en(m6,0,3)>en(m1,0,3)+8,'ef10 step6: MIXが大きいほど響きが多い');
   const a=await E.master(SD,Z(N),Z(N),Z(N),Z(N),note.map(v=>v*.3),note.map(v=>v*.3),R({}),120),b=await W({});ok(en(b,0,3)>en(a[0],0,3)+8,'ef11 step4: 送りが多いほど響きが多い')}
  /* ef13: WIDTH(モノ成分は変えない・低域の差は広げない・高域の差は広がる・もとがモノなら広がらない・モノとの差が広がる) */
  {const n=Math.round(1.2*SR),x=(f,ph)=>Float32Array.from({length:n},(_,i)=>.3*Math.sin(2*Math.PI*f*i/SR+ph)),add=(a,b)=>a.map((v,i)=>v+b[i]);
   const L=add(x(50,0),x(2000,0)),R=add(x(50,1),x(2000,1)),W=w=>E.runSt('sd-width',L,R,{width:w}),mag=(y,f)=>{let re=0,im=0;for(let i=n>>1;i<n;i++){re+=y[i]*Math.cos(2*Math.PI*f*i/SR);im+=y[i]*Math.sin(2*Math.PI*f*i/SR)}return 20*Math.log10(Math.hypot(re,im)+1e-12)};
   const side=w=>{const r=W(w);return r[0].map((v,i)=>(v-r[1][i])/2)},mid=w=>{const r=W(w);return r[0].map((v,i)=>(v+r[1][i])/2)};
   ok(mag(side(2),50)-mag(side(1),50)<1.5,'ef13 step2: 低域(50Hz)の差はほとんど広がらない '+(mag(side(2),50)-mag(side(1),50)).toFixed(2));
   ok(Math.abs(mag(side(2),2000)-mag(side(1),2000)-6)<1.5,'ef13 step1: 高域(2kHz)の差は約2倍 '+(mag(side(2),2000)-mag(side(1),2000)).toFixed(2));
   ok(Math.abs(mag(mid(2),2000)-mag(mid(1),2000))<.3,'ef13 step3: モノ(左右の和)は変わらない');
   const m=x(2000,0),r=E.runSt('sd-width',m,m,{width:2});let dd=0;for(let i=n>>1;i<n;i++)dd=Math.max(dd,Math.abs(r[0][i]-m[i]),Math.abs(r[1][i]-m[i]));ok(dd<1e-3,'ef13 step4: もとがモノなら広がらない '+dd);
   const gap=w=>{const r=W(w);let s=0,mo=0;for(let i=n>>1;i<n;i++){s+=(r[0][i]*r[0][i]+r[1][i]*r[1][i])/2;mo+=Math.pow((r[0][i]+r[1][i])/2,2)}return 10*Math.log10(s/mo)};
   ok(gap(2)>gap(1)+1,'ef13 step3: 広げるほどステレオとモノの差が大きい '+gap(1).toFixed(2)+' '+gap(2).toFixed(2))}
  /* ef14: DJ FILTER・AUTO FILT */
  {const L=lesson('ef14'),pad=await E.trackDry(SD,L,L.tk[3],1),n=pad.length,Mx=o=>E.master(SD,pad,pad,Z(n),Z(n),Z(n),Z(n),Object.assign({},P0,{dlyMix:0,rvbMix:0},o),120),lp=(x,fc)=>{const a=1-Math.exp(-2*Math.PI*fc/SR);let y=0;return x.map(v=>(y+=a*(v-y)))};
   const base=(await Mx({djOn:0}))[0],lo=(await Mx({djOn:1,djFilter:-.8}))[0],hi=(await Mx({djOn:1,djFilter:.7}))[0];
   ok(hf(lo)<hf(base)*.6,'ef14 step1: 左(ローパス)で高域が減る '+hf(base).toFixed(3)+' '+hf(lo).toFixed(3));
   const lf=x=>E.ms(lp(x,150))/(E.ms(x)+1e-20);ok(lf(hi)<lf(base)*.5,'ef14 step3: 右(ハイパス)で低域が減る '+lf(base).toFixed(3)+' '+lf(hi).toFixed(3));
   const win=x=>{const w=[],k=Math.round(.125*SR);for(let a=0;a+k<=x.length;a+=k)w.push(hf(x.subarray(a,a+k)));return Math.max(...w)/(Math.min(...w)+1e-9)};
   const af=(await Mx({afOn:1,afType:0,afMode:1,afSync:1,afDiv:5,afCut:600,afDepth:.8,afRes:.5}))[0],off=(await Mx({afOn:0}))[0];ok(win(af)>win(off)*1.5,'ef14 step4: AUTO FILT(LFO)で明るさが周期的に動く '+win(off).toFixed(2)+' '+win(af).toFixed(2))}
  /* ef15: 無限リバーブ(SIZE最大)・ディレイの暴走(FB90%でも有限で、FB35%より残る) */
  {const R=o=>Object.assign({},P0,{dlyMix:0,rvbMix:.5,rvbType:2,rvbSize:2,rvbDamp:.25},o),W=async o=>(await E.master(SD,Z(N),Z(N),Z(N),Z(N),note,note,R(o),120))[0];
   const s5=await W({rvbSize:5}),s7=await W({rvbSize:.7});ok(en(s5,2,3.4)>en(s7,2,3.4)+15,'ef15 step3: SIZE最大の響きは長く残る '+en(s5,2,3.4).toFixed(1)+' '+en(s7,2,3.4).toFixed(1));
   const f9=await wet(D({dlyFb:.9,dlyDiv:4})),f3=await wet(D({dlyFb:.35,dlyDiv:4}));ok(en(f9,2,3.4)>en(f3,2,3.4)+10,'ef15 step4: FB90%は繰り返しが積み重なる');ok(f9.every(v=>isFinite(v)&&Math.abs(v)<4),'ef15 step4: FB90%でもNaN・巨大値が出ない')}
 }
 if(err){console.error('失敗 '+err+'件');process.exit(1)}
 console.log('OK: EFコース '+LS.length+'本・聞き比べ'+nC+'件の音量差・本文の主張(ゲート・歪み・MOD・順番・ディレイ・リバーブ・WIDTH・フィルター)を測定で検査');
})();
