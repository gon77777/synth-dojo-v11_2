// アディティブの検証: node test/add.js  (AudioWorkletをモックして実行)
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
const g=global;g.window=g;g.SD={};g.sampleRate=44100;
let Cls=null;g.AudioWorkletProcessor=class{constructor(){const q=this;this.port={postMessage(m){(q.msgs=q.msgs||[]).push(m)}}}};g.registerProcessor=(n,c)=>{Cls=c};
['params.js','addparams.js','add.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(w,f),'utf8'),{filename:f}));
let err=0;const bad=m=>{console.error('NG: '+m);err++};
SD.FXIDS=['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'];
SD.ADD_WORKLET(SD.ADD_DERIVE,SD.addVoiceLimit);
const SR=44100,F=m=>440*Math.pow(2,(m-69)/12);
const mk=(o,sp,dd)=>{const pr=new Cls();Object.keys(o||{}).forEach(k=>pr.msg({t:'p',id:k,v:o[k]}));if(sp)pr.msg({t:'sp',a:sp});if(dd)pr.msg({t:'dd',a:dd});return pr};
const run=(pr,blocks,cb)=>{const out=new Float32Array(blocks*128),L=new Float32Array(128),R=new Float32Array(128);let mx=0,nan=false;
 for(let b=0;b<blocks;b++){pr.process([],[[L,R]]);for(let i=0;i<128;i++){const a=L[i];if(!isFinite(a)||!isFinite(R[i]))nan=true;mx=Math.max(mx,Math.abs(a));out[b*128+i]=a}if(cb)cb(b)}
 return{out,mx,nan}};
function spec(x){const N=x.length;let re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++)re[i]=x[i]*(.5-.5*Math.cos(2*Math.PI*i/N));
 for(let i=1,j=0;i<N;i++){let b=N>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]]}}
 for(let len=2;len<=N;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<N;i+=len)for(let k=0;k<len/2;k++){const c=Math.cos(a*k),s=Math.sin(a*k),u=i+k,v=i+k+len/2,tr=re[v]*c-im[v]*s,ti=re[v]*s+im[v]*c;re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti}}
 const m=new Float64Array(N/2);for(let i=0;i<N/2;i++)m[i]=Math.hypot(re[i],im[i])/N*4;return m}
const N=16384,BW=SR/N;
/* 周波数fの付近(±3ビン)のエネルギーから求めた振幅(窓の取りこぼしに強い) */
const amp=(sp,f)=>{const c=Math.round(f/BW);let m=0;for(let d=-3;d<=3;d++)m+=(sp[c+d]||0)**2;return Math.sqrt(m)};
/* 定常部(アタック・減衰後)のスペクトル。Sustain1でアタック後に一定にする */
const steady=(o,sp,m,dd)=>{const pr=mk(Object.assign({adS:1,adA:.001},o),sp,dd);pr.msg({t:'on',m:m||45,vel:1});run(pr,40);const r=run(pr,N/128);return{sp:spec(r.out),r}};

// 0) 定義: プリセット・導出
{const P=SD.addPreset;
 if(P('sine').length!==64||P('sine')[0]!==1||P('sine').slice(1).some(v=>v!==0))bad('SINEは基音だけ');
 if(Math.abs(P('saw')[3]-.25)>1e-9)bad('SAWは1/k');
 if(P('square')[1]!==0||Math.abs(P('square')[2]-1/3)>1e-9)bad('SQUAREは奇数だけ1/k');
 if(P('tri')[1]!==0||Math.abs(P('tri')[2]-1/9)>1e-9)bad('TRIは奇数だけ1/k²');
 const D=SD.defs.add.DEF,d0=SD.ADD_DERIVE(D,P('saw'),null);
 if(Math.abs(d0.a[0]-1)>1e-9||Math.abs(d0.a[3]-.25)>1e-9)bad('導出: 最大1にそろう');
 const d1=SD.ADD_DERIVE(Object.assign({},D,{adTilt:100}),P('saw'),null);if(Math.abs(d1.a[0]-d1.a[31])>1e-9)bad('TILT+100%でSAWが平らになる');
 const d2=SD.ADD_DERIVE(Object.assign({},D,{adOddEven:-100}),P('saw'),null);if(d2.a[1]!==0||d2.a[0]!==1)bad('ODD/EVEN -100%は奇数だけ');
 const d3=SD.ADD_DERIVE(Object.assign({},D,{adOddEven:100}),P('saw'),null);if(d3.a[0]!==0||d3.a[1]<=0)bad('ODD/EVEN +100%は偶数だけ');
 const d4=SD.ADD_DERIVE(Object.assign({},D,{adN:5}),P('saw'),null);if(d4.a[4]<=0||d4.a[5]!==0)bad('PARTIALS=5は5本まで');
 const d5=SD.ADD_DERIVE(Object.assign({},D,{adDSlope:0}),P('saw'),null),d6=SD.ADD_DERIVE(Object.assign({},D,{adDSlope:1}),P('saw'),null);
 if(Math.abs(d5.m[31]-1)>1e-9||!(d6.m[31]<d6.m[0]))bad('D.SLOPE: 0で全部同じ、上げると高域ほど短い');
 const dd=new Array(64).fill(0);dd[7]=1.5;const d7=SD.ADD_DERIVE(D,P('saw'),dd);if(d7.m[7]!==1.5||d7.m[6]===1.5)bad('減衰の上書きはその倍音だけ');
 if(!(SD.ADD_DERIVE(Object.assign({},D,{adATilt:100}),P('saw'),null).t[31]>1))bad('A.TILT+で高域ほどアタックが遅い')}

// 1) SINE: FFTのピークが基本周波数の1本だけ
{const f=F(45),{sp}=steady({},SD.addPreset('sine'));const a1=amp(sp,f);let other=0;for(let k=2;k<=8;k++)other=Math.max(other,amp(sp,f*k));
 if(!(a1>.05))bad('SINEの基音が出ない '+a1);if(other>a1*.01)bad('SINEに倍音が出る '+other/a1)}
// 2) SAW: 第k倍音の強さが1/kに比例
{const f=F(45),{sp}=steady({},SD.addPreset('saw')),a1=amp(sp,f);
 for(const k of [2,3,4,5,8,12]){const r=amp(sp,f*k)/a1;if(Math.abs(r-1/k)>.05/k+.01)bad('SAW 第'+k+'倍音 比 '+r.toFixed(3)+' (期待 '+(1/k).toFixed(3)+')')}}
// 3) SQUARE: 偶数倍音がほぼ0
{const f=F(45),{sp}=steady({},SD.addPreset('square')),a1=amp(sp,f);
 for(const k of [2,4,6,8])if(amp(sp,f*k)>a1*.01)bad('SQUAREの偶数倍音 '+k);
 if(Math.abs(amp(sp,f*3)/a1-1/3)>.03)bad('SQUAREの第3倍音')}
// 4) D.SLOPE>0: 時間が経つと高い倍音のほうが先に小さくなる(DSLOPE=0なら同じ比のまま)
{const lvl=(slope)=>{const pr=mk({adDSlope:slope,adD:.5,adS:0,adA:.001},SD.addPreset('saw'));pr.msg({t:'on',m:45,vel:1});run(pr,3);const v=pr.V.find(x=>x.on),r=[];
  run(pr,Math.ceil(.3*SR/128));r.push(v.l[0],v.l[15]);return r};
 const a=lvl(.8),b=lvl(0);
 if(!(a[1]<a[0]*.5))bad('D.SLOPE .8: 第16倍音が先に減衰しない '+a);
 if(Math.abs(a[1]-b[1])<1e-6||!(b[1]>=b[0]*.9))bad('D.SLOPE 0: 全部同じ速さ '+b)}
// 5) S=0で十分に時間が経つと無音(ボイスも解放される)
{const pr=mk({adS:0,adD:.1,adA:.001},SD.addPreset('saw'));pr.msg({t:'on',m:60,vel:1});const r0=run(pr,20);if(!(r0.mx>.01))bad('S=0 立ち上がりが無音');
 run(pr,Math.ceil(1.5*SR/128));const r=run(pr,8);if(r.mx>1e-3)bad('S=0 で消えない '+r.mx);if(pr.V.some(v=>v.on))bad('S=0 でボイスが解放されない')}
// 6) 倍音ごとのEG: 上書きした倍音だけ長く残る
{const dd=new Array(64).fill(0);dd[1]=2;const pr=mk({adDSlope:1,adD:.4,adS:0,adA:.001},SD.addPreset('saw'),dd);pr.msg({t:'on',m:45,vel:1});run(pr,Math.ceil(.5*SR/128));const v=pr.V[0];
 if(!(v.l[1]>v.l[2]*3))bad('上書きの倍音が長く残らない '+v.l[1]+' '+v.l[2])}
// 7) ナイキスト超えの倍音は生成されない(m=96: 2093Hz→9本まで。10本目=20930Hz>19845Hz)
{const m=96,f=F(m),{sp}=steady({},SD.addPreset('saw'),m);let hi=0;for(let c=Math.round(19900/BW);c<sp.length;c++)hi=Math.max(hi,sp[c]);
 if(!(amp(sp,f*9)>.005))bad('第9倍音が出ない');if(amp(sp,f*10)>amp(sp,f*9)*.05)bad('ナイキスト90%超の第10倍音が出る');
 const pr=mk({adS:1},SD.addPreset('saw'));pr.msg({t:'on',m:140,vel:1});if(run(pr,4).mx!==0)bad('極端な高音は無音')}
// 8) NaN・ピーク: 全プリセット×低中高音×極端設定
{const ext=[{},{adTilt:100,adOddEven:100,adN:32},{adTilt:-100,adOddEven:-100},{adATilt:100,adDSlope:1,adD:.02,adA:.001},{adS:1,adN:1}];
 for(const nm of ['sine','saw','square','tri'])for(const e of ext)for(const m of [24,60,96]){const pr=mk(Object.assign({adS:1},e),SD.addPreset(nm));pr.msg({t:'on',m,vel:1});pr.msg({t:'on',m:m+4,vel:1});pr.msg({t:'on',m:m+7,vel:1});const r=run(pr,60);
  if(r.nan)bad('NaN '+nm+' '+JSON.stringify(e)+' m'+m);if(r.mx>1)bad('ピーク>1 '+r.mx.toFixed(3)+' '+nm+' '+m);if(r.mx<.01&&!(e.adOddEven===100&&nm!=='saw'))bad('無音 '+nm+' '+JSON.stringify(e)+' m'+m)}
 // 全部0の配列は無音(0割り無し)
 const pr=mk({adS:1},new Array(64).fill(0));pr.msg({t:'on',m:60,vel:1});const r=run(pr,10);if(r.nan||r.mx!==0)bad('全0配列は無音')}
// 9) ボイス: 上限4・奪取・離した音の解放
{const pr=mk({adS:1,adA:.001,adR:.01},SD.addPreset('saw'));for(let m=60;m<68;m++)pr.msg({t:'on',m,vel:1});run(pr,20);
 if(pr.V.filter(v=>v.on).length>4)bad('ボイス数が上限4を超える');
 if(!(pr.msgs||[]).some(x=>x.t==='steal'))bad('奪取の通知が無い');
 pr.msg({t:'alloff'});run(pr,Math.ceil(.5*SR/128));if(pr.V.some(v=>v.on))bad('alloff後に解放されない')}
// 10) 倍音の強さの通知(30Hz程度)と、処理時間(32倍音×4ボイス)
{const pr=mk({adS:1},SD.addPreset('saw'));for(const m of [48,55,60,64])pr.msg({t:'on',m,vel:1});
 const t0=process.hrtime.bigint(),B=Math.ceil(2*SR/128);run(pr,B);const ms=Number(process.hrtime.bigint()-t0)/1e6;
 const lv=(pr.msgs||[]).filter(x=>x.t==='lv');if(lv.length<40||lv.length>80)bad('lvの通知回数 '+lv.length+'/2秒');if(lv[5].l.length!==64)bad('lvは64個');
 console.log('処理時間: 2秒ぶん(32倍音×4ボイス) '+ms.toFixed(0)+'ms → 実時間の '+(ms/20).toFixed(1)+'%')}
// 11) クラス: 保存往復・プリセット連動・不正データ
{const A=new SD.ADD({set(){}}),P=SD.addPreset;
 if(A.sp.join()!==P('saw').join())bad('初期は SAW');
 A.set('adSpec','square');if(A.sp.join()!==P('square').join())bad('adSpec変更で配列が替わる');
 A.sp[5]=.9;A.dd[3]=.5;A.set('adSpec','custom');A.set('adTilt',20);if(A.sp[5]!==.9)bad('CUSTOMは配列を保つ');
 const pa=JSON.parse(JSON.stringify(A.getPatch())),B=new SD.ADD({set(){}});B.setPatch(pa);
 if(JSON.stringify(B.getPatch())!==JSON.stringify(A.getPatch()))bad('保存→復元が同じ');
 B.setPatch({});if(JSON.stringify(B.getPatch())!==JSON.stringify(new SD.ADD({set(){}}).getPatch()))bad('旧データ(空)は既定');
 B.setPatch({adSpec:'tri'});if(B.sp.join()!==P('tri').join())bad('配列が無ければプリセットから');
 B.setPatch({adSpec:'custom',sp:[1,2,'x'],dd:null});if(B.sp.length!==64||B.dd.some(v=>v!==0))bad('不正な配列は既定');
 B.setPatch({sp:new Array(64).fill(5),dd:new Array(64).fill(9)});if(B.sp[0]!==1||B.dd[0]!==2)bad('配列の範囲を丸める');
 if(!SD.defs.add.byId.adSpec.opts.some(o=>o[0]==='custom'))bad('CUSTOM')}
// ===== v2.8 =====
const D8=SD.defs.add.DEF,drv=(o,sp,dd,spB,mm,mt,f0)=>SD.ADD_DERIVE(Object.assign({},D8,o),sp||SD.addPreset('saw'),dd||null,spB||SD.addPreset('square'),mm,mt,f0);
// 12) 64倍音: 処理時間とボイス自動調整
{if(SD.defs.add.byId.adN.max!==64)bad('adNは最大64');
 if(SD.addVoiceLimit(32)!==4||SD.addVoiceLimit(40)!==4||SD.addVoiceLimit(41)!==3||SD.addVoiceLimit(53)!==3||SD.addVoiceLimit(54)!==2||SD.addVoiceLimit(64)!==2)bad('ボイス上限 4→3→2');
 const pr=mk({adN:64,adS:1},SD.addPreset('saw'));if(pr.vl!==2)bad('64倍音で同時発音2: '+pr.vl);
 if(!(pr.msgs||[]).some(x=>x.t==='vl'&&x.n===2))bad('vl通知');
 for(const m of [60,64,67])pr.msg({t:'on',m,vel:1});run(pr,20);if(pr.V.filter(v=>v.on).length>2)bad('64倍音で3音鳴る');
 const t0=process.hrtime.bigint();run(pr,Math.ceil(2*SR/128));const ms=Number(process.hrtime.bigint()-t0)/1e6;console.log('処理時間: 2秒ぶん(64倍音×2ボイス) '+ms.toFixed(0)+'ms');
 const p2=mk({adN:40,adS:1},SD.addPreset('saw'));if(p2.vl!==4)bad('40倍音は4');
 p2.msg({t:'p',id:'adN',v:60});if(p2.vl!==3&&p2.vl!==2)bad('60倍音で減る');
 const r=run(pr,20);if(r.nan||r.mx>1)bad('64倍音のNaN/ピーク')}
// 13) LAYOUT: 比率
{const r=o=>Array.from(drv(o).r),h=r({}),s=r({adLayout:'stretch',adStretch:100});
 if(h[9]!==10)bad('HARMは整数倍');
 if(!(s[31]>32&&Math.abs(s[0]-1)<.01&&Math.abs(s[9]-10*Math.sqrt(1+.002*100))<1e-9))bad('STRETCH: i·√(1+B·i²) '+s[9]);
 if(r({adLayout:'stretch',adStretch:0}).some((v,i)=>Math.abs(v-(i+1))>1e-9))bad('STRETCH 0%は整数倍');
 const b=r({adLayout:'bell'});if(b.some((v,i)=>i&&v<=b[i-1])||b.some(v=>v===Math.round(v)&&0))bad('BELLは単調増加');if(Math.abs(b[63]-13)>1e-9||Math.abs(b[0]-.5)>1e-9)bad('BELLの端 '+b[0]+' '+b[63]);
 if(b.filter(v=>Number.isInteger(v)).length>16)bad('BELLは非整数が中心');
 const m1=r({adLayout:'metal'}),m2=r({adLayout:'metal'});if(m1.join()!==m2.join())bad('METALは固定シード');if(m1.filter((v,i)=>Math.abs(v-(i+1))<1e-6).length>2)bad('METALが散っていない');
 if(!(Math.min(...m1)>0))bad('METALの比率は正')}
// 14) DRAWBAR: 比率・強さ・パーカッション・音
{const d=drv({adLayout:'drawbar',db1:8,db2:0,db3:4,db4:0,db5:0,db6:0,db7:0,db8:0,db9:8}),R=Array.from(d.r).slice(0,9);
 if(R.join()!==[.5,1.5,1,2,3,4,5,6,8].join())bad('ドローバー比率 '+R);
 if(Math.abs(d.u[0]-1)>1e-9||Math.abs(d.u[2]-.5)>1e-9||d.u[1]!==0||Math.abs(d.u[8]-1)>1e-9)bad('ドローバー強さ(0〜8→0〜1)');
 if(d.cnt!==3)bad('ドローバーの鳴る数 '+d.cnt);
 if(drv({adLayout:'drawbar'}).u[9]!==0)bad('PERC OFFは無し');
 const p2=drv({adLayout:'drawbar',adPerc:'2'}),p3=drv({adLayout:'drawbar',adPerc:'3'});if(p2.r[9]!==2||p3.r[9]!==3||p2.s[9]!==0||!(p2.u[9]>0))bad('パーカッション 2nd/3rd・サスティン無し');
 /* 鳴らす: 基音は8'(=1倍)に出る。16'は半分の周波数。 */
 const f=F(45),{sp}=steady({adLayout:'drawbar',db1:8,db2:0,db3:8,db4:0,db5:0,db6:0,db7:0,db8:0,db9:0},SD.addPreset('saw'));
 if(!(amp(sp,f)>.02&&amp(sp,f/2)>.02))bad('16\'と8\'が出る');if(amp(sp,f*2)>amp(sp,f)*.02)bad('4\'は出ない');
 /* パーカッション: 打鍵だけ(サスティンで消える) */
 const pr=mk({adLayout:'drawbar',adPerc:'2',db1:0,db3:0,db4:0,db9:0,db3:8,adS:1,adD:.1,adA:.001},null);pr.msg({t:'on',m:60,vel:1});run(pr,4);const v=pr.V[0],l9=v.l[9];run(pr,Math.ceil(.8*SR/128));
 if(!(l9>.3&&v.l[9]<1e-3))bad('パーカッションが消えない '+l9+' '+v.l[9]);if(!(v.l[2]>.95))bad('ドローバー本体は保つ');
 /* CLICK */
 const q0=mk({adLayout:'drawbar',adClick:0},null),q1=mk({adLayout:'drawbar',adClick:1},null);[q0,q1].forEach(q=>q.msg({t:'on',m:60,vel:1}));
 const e0=run(q0,1).out,e1=run(q1,1).out;let d01=0;for(let i=0;i<128;i++)d01+=Math.abs(e1[i]-e0[i]);if(!(d01>.5))bad('CLICKが鳴らない '+d01);
 const c2=run(q1,40);if(c2.nan||c2.mx>1)bad('CLICKでNaN/ピーク')}
// 15) MORPH: 端がAとBに一致、MOTION
{const A=SD.addPreset('saw'),B=SD.addPreset('square'),a0=drv({adMorph:0},A,null,B),a1=drv({adMorph:1},A,null,B),aH=drv({adMorph:.5},A,null,B);
 for(let i=0;i<32;i++){const ea=A[i],eb=B[i];if(Math.abs(a0.u[i]-ea)>1e-9||Math.abs(a1.u[i]-eb)>1e-9)bad('MORPH端 '+i);if(Math.abs(aH.u[i]-(ea+eb)/2)>1e-9)bad('MORPH中間 '+i)}
 if(Math.abs(drv({adMorph:0},A,null,B,.5).u[1]-aH.u[1])>1e-9)bad('動きの加算(mm)');if(!(drv({adTilt:0},A,null,B,0,1).u[31]>drv({adTilt:0},A,null,B).u[31]))bad('動き(mt)はTILTを上げる');
 /* ワークレット: MORPH端の音。A=SAW(偶数あり)、B=SQUARE(偶数なし) */
 const spA=steady({adMorph:0},A,45,null),f=F(45);
 const prB=mk({adMorph:1,adS:1,adA:.001},A);prB.msg({t:'spB',a:B});prB.msg({t:'on',m:45,vel:1});run(prB,40);const sB=spec(run(prB,N/128).out);
 if(!(amp(spA.sp,f*2)>amp(spA.sp,f)*.3))bad('Aは偶数倍音あり');if(amp(sB,f*2)>amp(sB,f)*.02||!(amp(sB,f*3)>amp(sB,f)*.25))bad('MORPH100%でBの音(偶数なし)');
 /* LFOでMORPHが動く: 時間でスペクトルが変わる(第2倍音の強さが揺れる) */
 const pm=mk({adMotTarget:'morph',adLfoRate:4,adLfoDepth:1,adS:1,adA:.001,adMorph:.5,adEgAmt:0},A);pm.msg({t:'spB',a:B});pm.msg({t:'on',m:45,vel:1});
 let mn=1e9,mx=-1e9;run(pm,30,()=>{const g=pm.V[0].ga[1];if(g<mn)mn=g;if(g>mx)mx=g});run(pm,Math.ceil(.5*SR/128),()=>{const g=pm.V[0].ga[1];if(g<mn)mn=g;if(g>mx)mx=g});
 if(!(mx>mn*1.3))bad('LFOでMORPHが動かない '+mn+' '+mx);
 /* EG: 弾いた直後に開き(TILT+)、ディケイでサスティンへ */
 const pe=mk({adMotTarget:'tilt',adLfoDepth:0,adEgAmt:1,adMotA:.001,adMotD:.2,adMotS:0,adTilt:-100,adS:1,adA:.001},A);pe.msg({t:'on',m:45,vel:1});run(pe,6);const h0=pe.V[0].ga[15]/pe.V[0].ga[0];run(pe,Math.ceil(1*SR/128));const h1=pe.V[0].ga[15]/pe.V[0].ga[0];
 if(!(h0>h1*3))bad('動きのEGで開いて閉じる '+h0+' '+h1);
 const rn=run(pe,20);if(rn.nan||rn.mx>1)bad('MOTIONでNaN/ピーク')}
// 16) FORMANT: 母音ごとに山の位置が違う・音程を変えても山の位置は変わらない
{const peak=(o,f0)=>{const d=drv(Object.assign({adFmt:'on',adN:64,adTilt:0},o),SD.addPreset('sine').map((v,i)=>1),null,null,0,0,f0);let b=0,bi=0;for(let i=0;i<64;i++)if(d.u[i]>b){b=d.u[i];bi=i}return f0*d.r[bi]};
 const f0=100,pa=peak({adVowel:'a'},f0),pi=peak({adVowel:'i'},f0),pu=peak({adVowel:'u'},f0);
 if(!(Math.abs(pa-800)<=60))bad('あの最大は約800Hz付近 '+pa);if(!(pi<400&&pi>=200))bad('いの最大は低い山 '+pi);if(pa===pi||pi===pu&&pa===pu)bad('母音で山が違う');
 const p1=peak({adVowel:'a'},110),p2=peak({adVowel:'a'},130);if(Math.abs(p1-p2)>140)bad('音程を変えても山の周波数は同じ '+p1+' '+p2);
 const sh=peak({adVowel:'a',adFmtShift:12},f0);if(!(sh>1400&&sh<1800))bad('F.SHIFT +12で約2倍 '+sh);
 const off=drv({adFmt:'off'},null,null,null,0,0,100),on=drv({adFmt:'on'},null,null,null,0,0,100);if(Math.abs(off.u[9]-.1)>1e-9||on.u[9]===off.u[9])bad('FORMANT OFFは変わらない/ONで変わる');
 const pr=mk({adFmt:'on',adVowel:'o',adS:1,adN:64},SD.addPreset('saw'));pr.msg({t:'on',m:50,vel:1});const r=run(pr,60);if(r.nan||r.mx>1||r.mx<.01)bad('フォルマント音のNaN/ピーク/無音')}
// 17) 保存: v2.7(32個)の配列・A/B・ドローバー
{const A=new SD.ADD({set(){}});A.setPatch({adSpec:'custom',sp:new Array(32).fill(.5),dd:new Array(32).fill(0)});
 if(A.sp.length!==64||A.sp[31]!==.5||A.sp[32]!==0||A.dd.length!==64)bad('32個の配列は0で埋めて読む');
 A.set('adAB','b');A.set('adSpec','sine');if(A.spB[0]!==1||A.spB[1]!==0||A.sp[0]!==.5)bad('EDIT=Bのプリセットはspだけ変えない');
 A.set('adLayout','drawbar');A.set('db3',5);A.set('adMorph',.3);A.set('adMotTarget','morph');A.set('adFmt','on');A.set('adVowel','e');
 const pa=JSON.parse(JSON.stringify(A.getPatch())),B=new SD.ADD({set(){}});B.setPatch(pa);if(JSON.stringify(B.getPatch())!==JSON.stringify(pa))bad('A/B・ドローバー・MOTION・FORMANTの保存往復');
 B.setPatch({});if(B.p.adLayout!=='harm'||B.p.db1!==8||B.p.adAB!=='a'||B.spB[1]!==0||B.spB[2]===0)bad('旧データ(空)は既定');
 for(const id of ['adLayout','adStretch','adMorph','adMotTarget','adLfoRate','adLfoDepth','adMotA','adMotD','adMotS','adMotR','adEgAmt','adFmt','adVowel','adFmtShift','adPerc','adClick','adAB'].concat(Array.from({length:9},(_,i)=>'db'+(i+1))))if(!SD.defs.add.byId[id])bad('ID '+id)}
if(err){console.error(err+'件NG');process.exit(1)}console.log('OK: アディティブ(32倍音・倍音ごとのEG)');
