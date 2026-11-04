// FMの検証: node test/fm.js  (AudioWorkletをモックして実行)
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
const g=global;g.window=g;g.SD={};g.sampleRate=44100;
let Cls=null;g.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){}}}};g.registerProcessor=(n,c)=>{Cls=c};
['params.js','fmparams.js','fm.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(w,f),'utf8'),{filename:f}));
let err=0;const bad=m=>{console.error('NG: '+m);err++};
SD.FXIDS=['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'];
SD.FM_WORKLET(SD.FMALGS);
const SR=44100,F=m=>440*Math.pow(2,(m-69)/12);
const mk=(o)=>{const pr=new Cls();Object.keys(o||{}).forEach(k=>pr.msg({t:'p',id:k,v:o[k]}));return pr};
/* nブロック処理して左チャンネルを返す */
const run=(pr,blocks,cb)=>{const out=new Float32Array(blocks*128),L=new Float32Array(128),R=new Float32Array(128);let mx=0,nan=false;
 for(let b=0;b<blocks;b++){pr.process([],[[L,R]]);for(let i=0;i<128;i++){const a=L[i];if(!isFinite(a)||!isFinite(R[i]))nan=true;mx=Math.max(mx,Math.abs(a));out[b*128+i]=a}if(cb)cb(b)}
 return{out,mx,nan}};
/* ハン窓つきFFT(2のべき)。振幅スペクトルを返す */
function spec(x){const N=x.length;let re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++)re[i]=x[i]*(.5-.5*Math.cos(2*Math.PI*i/N));
 for(let i=1,j=0;i<N;i++){let b=N>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]]}}
 for(let len=2;len<=N;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<N;i+=len)for(let k=0;k<len/2;k++){const c=Math.cos(a*k),s=Math.sin(a*k),u=i+k,v=i+k+len/2,tr=re[v]*c-im[v]*s,ti=re[v]*s+im[v]*c;re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti}}
 const m=new Float64Array(N/2);for(let i=0;i<N/2;i++)m[i]=Math.hypot(re[i],im[i])/N*4;return m}
const N=16384,BW=SR/N,bin=f=>Math.round(f/BW);
/* 定常部(アタック後)のスペクトル */
const steady=(o,m)=>{const pr=mk(o);pr.msg({t:'on',m:m||69,vel:1});run(pr,40);const r=run(pr,N/128);return{sp:spec(r.out),r}};
/* ピーク(周囲±3ビンより大きく、最大値の2%以上)の周波数一覧 */
const peaks=(sp,th)=>{const mx=Math.max(...sp),res=[];for(let i=4;i<sp.length-4;i++){let ok=sp[i]>mx*(th||.02);for(let d=-3;d<=3&&ok;d++)if(d&&sp[i+d]>=sp[i])ok=false;if(ok)res.push({f:i*BW,a:sp[i]})}return res};
const near=(f,t,tol)=>Math.abs(f-t)<=(tol||BW*2);

// 0) アルゴリズム表の整合(各OPの変調元は自分より上位=大きい番号だけ・ループ無し・キャリア1つ以上・数は8)
{const A=SD.FMALGS;if(A.length!==8)bad('アルゴリズムは8種');
 A.forEach((a,k)=>{const nm='ALG'+(k+1);
  if(a.m.length!==4)bad(nm+' mは4OP分');
  if(!a.c.length)bad(nm+' キャリア無し');
  a.m.forEach((s,i)=>{s.forEach(j=>{if(!(j>i&&j<=3))bad(nm+' OP'+(i+1)+'の変調元OP'+(j+1)+'は上位でない')});if(new Set(s).size!==s.length)bad(nm+' 変調元の重複');if(s.length>3)bad(nm+' 変調元は3つまで')});
  a.c.forEach(i=>{if(!(i>=0&&i<4))bad(nm+' キャリア範囲')});if(new Set(a.c).size!==a.c.length)bad(nm+' キャリア重複');
  /* 変調元になるOPはキャリアにならない=音として出るのは他を変調しないOP。到達可能性: 全OPがいずれかのキャリアにつながる */
  const feeds=new Set();a.m.forEach(s=>s.forEach(j=>feeds.add(j)));
  a.c.forEach(i=>{if(feeds.has(i))bad(nm+' OP'+(i+1)+'がキャリアかつ変調元')});
  for(let i=0;i<4;i++)if(!feeds.has(i)&&a.c.indexOf(i)<0)bad(nm+' OP'+(i+1)+'は何にもつながらない(無音のOP)');
  /* ループ無し(DFS) */
  const vis=[0,0,0,0],dfs=i=>{if(vis[i]===1)return true;if(vis[i]===2)return false;vis[i]=1;const r=a.m[i].some(dfs);vis[i]=2;return r};
  for(let i=0;i<4;i++)if(dfs(i))bad(nm+' ループ')});
 /* 8番は変調なし(全部キャリア) */
 if(A[7].m.some(s=>s.length)||A[7].c.length!==4)bad('ALG8は全部キャリア');
 /* 表は実行時に増やせる: 9番目を足してもエンジンが読める */
 const ex=SD.FMALGS.slice();ex.push({m:[[3],[3],[],[]],c:[0,1,2]});const g2=new (class{})();
 let C2=null;const sv=g.registerProcessor;g.registerProcessor=(n,c)=>{C2=c};SD.FM_WORKLET(ex);g.registerProcessor=sv;
 const p2=new C2();p2.msg({t:'p',id:'fAlg',v:'9'});if(p2.alg!==8||p2.nCar!==3)bad('表を増やしてもエンジンが追従しない')}


// 0b) v2.5c アルゴリズム図のレイアウト: 全アルゴリズムで箱・矢印が0〜1に収まる、箱の重なり無し、矢印は上から下、キャリアは最下段、ヒット判定
{SD.FMALGS.forEach((a,k)=>{const nm='ALG'+(k+1),L=SD.fmLayout(k);
  if(L.boxes.length!==4)bad(nm+' 箱は4つ');
  L.boxes.forEach(b=>{if(b.x-b.w/2<0||b.x+b.w/2>1||b.y-b.h/2<0||b.y+b.h/2>1)bad(nm+' OP'+(b.i+1)+'の箱がはみ出し');
   if(a.c.indexOf(b.i)>=0&&b.r!==0)bad(nm+' キャリアOP'+(b.i+1)+'が最下段でない');
   if(a.c.indexOf(b.i)>=0&&Math.abs(b.y-(1-.5/L.rows))>1e-9)bad(nm+' キャリアのy')});
  for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const p=L.boxes[i],q=L.boxes[j];if(Math.abs(p.x-q.x)<(p.w+q.w)/2&&Math.abs(p.y-q.y)<(p.h+q.h)/2)bad(nm+' 箱の重なり OP'+(i+1)+'/OP'+(j+1))}
  const n=a.m.reduce((x,s)=>x+s.length,0);if(L.arrows.length!==n)bad(nm+' 矢印の数');
  L.arrows.forEach(r=>{[r.x1,r.x2,r.y1,r.y2].forEach(v=>{if(!(v>=0&&v<=1))bad(nm+' 矢印が枠外')});if(!(r.y2>r.y1))bad(nm+' 矢印が下向きでない OP'+(r.s+1)+'→OP'+(r.t+1))});
  L.boxes.forEach(b=>{if(SD.fmHit(k,b.x,b.y)!==b.i)bad(nm+' ヒット判定 OP'+(b.i+1))});
  if(SD.fmHit(k,.001,.001)!==-1&&k!==0)bad(nm+' 隅は何にも当たらない')});
 if(SD.fmLayout(0).rows!==4||SD.fmLayout(7).rows!==1)bad('段数(ALG1=4段、ALG8=1段)');
 /* 表を増やしても図が作れる(表だけから描く) */
 SD.FMALGS.push({m:[[3],[3],[],[]],c:[0,1,2]});if(SD.fmLayout(8).boxes.length!==4)bad('追加アルゴリズムの図');SD.FMALGS.pop()}

// 1) 無音: ボイスが無ければ完全な無音
{const pr=mk();const r=run(pr,50);if(r.mx!==0)bad('無音時に音が出る '+r.mx)}
// 2) 全アルゴリズム × 全レベル最大 × 低中高音: NaN無し・ピーク範囲内・音は出る
{for(let a=1;a<=8;a++)[36,69,108].forEach(m=>{
  const o={fAlg:String(a)};for(let n=1;n<=4;n++){o['f'+n+'Lvl']=100;o['f'+n+'Coarse']=[1,2,3,.5][n-1]}
  const pr=mk(o);pr.msg({t:'on',m:m,vel:1});const r=run(pr,300);
  if(r.nan)bad('ALG'+a+' m'+m+' NaN/Inf');if(r.mx>1)bad('ALG'+a+' m'+m+' ピーク超過 '+r.mx.toFixed(3));
  if(!(r.mx>.01))bad('ALG'+a+' m'+m+' 無音のまま');
  /* 極端な比率・デチューンでも有限 */
  const o2=Object.assign({},o,{f2Coarse:16,f3Coarse:16,f4Coarse:16,f1Fine:50,f2Det:100});
  const pr2=mk(o2);pr2.msg({t:'on',m:m,vel:1});const r2=run(pr2,200);if(r2.nan||r2.mx>1)bad('ALG'+a+' m'+m+' 極端な設定 '+r2.mx)})}
// 3) 全レベル0なら無音(どのアルゴリズムでも)
{for(let a=1;a<=8;a++){const pr=mk({fAlg:String(a),f1Lvl:0});pr.msg({t:'on',m:60,vel:1});const r=run(pr,100);if(r.mx!==0)bad('ALG'+a+' LEVEL全0なのに音が出る')}}
// 4) キャリア1つ・変調なし: FFTのピークが基本周波数×比率に1本だけ
{const f=F(69);
 [[1,440],[2,880],[3,1320],[.5,220]].forEach(([c,want])=>{const{sp}=steady({f1Coarse:c},69),pk=peaks(sp,.01);
  if(pk.length!==1||!near(pk[0].f,want))bad('単音: RATIO'+c+' のピークが '+want+'Hz 1本でない '+JSON.stringify(pk.map(x=>Math.round(x.f))))});
 const{sp}=steady({f1Coarse:1,f1Fine:10,f1Det:0},69),pk=peaks(sp,.01);if(pk.length!==1||!near(pk[0].f,f*1.1,BW*3))bad('FINE+10%で周波数が1.1倍になる '+Math.round(pk[0].f));
 const d=steady({f1Det:100},69),pd=peaks(d.sp,.01);if(pd.length!==1||!near(pd[0].f,f*Math.pow(2,1/12),BW*3))bad('DETUNE+100ctで半音上 '+Math.round(pd[0].f));
 const lv=steady({f1Lvl:40},69),hv=steady({f1Lvl:80},69);if(Math.abs(Math.max(...hv.sp)/Math.max(...lv.sp)-2)>.1)bad('キャリアのLEVELは音量に比例 '+(Math.max(...hv.sp)/Math.max(...lv.sp)).toFixed(2))}
// 5) OP2を変調に使う(ALG1: 2→1): 側波帯が「モジュレーター周波数」の間隔で並ぶ
{const fc=440,fm=300;/* OP1=440Hz、OP2=比率で300Hz相当: 440*ratio → ratio=300/440 は範囲外なので鍵盤を変えて確認 */
 /* OP1: 比率1、OP2: 比率2(=880Hz)。側波帯は 440±k*880 */
 const{sp}=steady({fAlg:'1',f1Lvl:80,f2Lvl:45,f2Coarse:2},69),pk=peaks(sp,.02);
 if(pk.length<3)bad('変調で側波帯が増えない '+pk.length);
 const fs=pk.map(x=>x.f);
 /* 反射(負の周波数)を含め、すべてのピークは 440+k*880 または |440-k*880| の位置 */
 const exp=[];for(let k=-6;k<=6;k++)exp.push(Math.abs(440+k*880));
 fs.forEach(f=>{if(!exp.some(e=>near(f,e,BW*3)))bad('側波帯の位置が 440±k·880 でない '+Math.round(f)+'Hz')});
 /* 非整数比(OP2=1.5倍=660Hz): 側波帯は 440±k*660 の間隔(例: 440,1100,1760,...と 220(=440-660の反射)) */
 const s2=steady({fAlg:'1',f1Lvl:80,f2Lvl:45,f2Coarse:1.5},69),p2=peaks(s2.sp,.02).map(x=>x.f);
 [440,1100,1760,220].forEach(e=>{if(!p2.some(f=>near(f,e,BW*3)))bad('比率1.5で側波帯 '+e+'Hz が無い')});
 /* 変調を強くすると側波帯(倍音)が増える */
 const lo=peaks(steady({fAlg:'1',f2Lvl:30,f2Coarse:2},69).sp,.01).length,hi=peaks(steady({fAlg:'1',f2Lvl:70,f2Coarse:2},69).sp,.01).length;
 if(!(hi>lo))bad('変調のLEVELを上げても倍音が増えない '+lo+'→'+hi);
 /* 変調のLEVELが0なら単音に戻る */
 if(peaks(steady({fAlg:'1',f2Lvl:0,f2Coarse:2},69).sp,.01).length!==1)bad('変調LEVEL0で単音に戻らない')}
// 6) 比率が整数のとき倍音は整数倍に並び、非整数のとき並ばない(エネルギー比で判定)
{const harm=(sp,f0)=>{let tot=0,on=0;for(let i=2;i<sp.length;i++){const e=sp[i]*sp[i],f=i*BW;tot+=e;const r=f/f0;if(Math.abs(r-Math.round(r))*f0<BW*2.5)on+=e}return on/tot};
 const a=harm(steady({fAlg:'1',f2Lvl:55,f2Coarse:2},69).sp,440),b=harm(steady({fAlg:'1',f2Lvl:55,f2Coarse:1.5,f2Fine:-6},69).sp,440);
 if(!(a>.97))bad('整数比で倍音が整数倍に並ばない '+a.toFixed(3));if(!(b<.6))bad('非整数比なのに倍音が整数倍に並ぶ '+b.toFixed(3))}
// 7) キャリア数による正規化: ALG6(3キャリア)でも全部100%のピークが範囲内、ALG8の4キャリアは1/2
{const one=steady({fAlg:'8',f1Lvl:80,f1S:1},69),two=steady({fAlg:'8',f1Lvl:80,f2Lvl:80,f2Coarse:2,f1S:1,f2S:1},69);
 /* 振幅の期待値。FFTのハン窓は周波数が窓の中央にあたると最大15%小さく出る(スカロップ損失)ので、.83〜1.0倍を許す */
 const inr=(v,x)=>v/x>=.83&&v/x<=1.01;
 const a1=Math.max(...one.sp),pk2=peaks(two.sp,.05);if(!inr(a1,.8*.5*.5))bad('ALG8のOP1単独の振幅 '+a1.toFixed(3)+' (1/√4×.8×出力.5=.2)');
 if(pk2.length!==2)bad('ALG8は2つのキャリアが別々の周波数で並ぶ');
 const s1=steady({fAlg:'1',f1Lvl:80,f1S:1},69);if(!inr(Math.max(...s1.sp),.4))bad('ALG1のキャリア1つの振幅 '+Math.max(...s1.sp).toFixed(3)+' (.8×.5)')}
// 8) ナイキスト対策: OP周波数がナイキストを超えるOPは無音。90%以下は素通し。間は滑らかに減る
{const lim=SR/2;
 const hi=mk({f1Coarse:16});hi.msg({t:'on',m:96,vel:1});if(run(hi,100).mx!==0)bad('ナイキスト超え(2093Hz×16)が鳴る');
 /* 変調側が超えると、変調が消えて単音に戻る */
 const{sp}=steady({fAlg:'1',f2Lvl:70,f2Coarse:16},96);if(peaks(sp,.01).length>1)bad('ナイキスト超えのモジュレーターが効いている');
 /* 減衰の連続性: 周波数を少しずつ上げた振幅が単調非増加(90%〜100%) */
 const amp=r=>{const f0=F(69),pr=mk({f1Coarse:Math.min(16,r*lim/f0)});pr.msg({t:'on',m:69,vel:1});run(pr,40);return run(pr,60).mx};
 /* 比率は.5刻みなので、鍵盤で周波数を直接変える */
 const ampAt=f=>{const m=69+12*Math.log2(f/440),pr=mk();pr.msg({t:'on',m:m,vel:1});run(pr,40);return run(pr,60).mx};
 const A=[.5,.85,.9,.92,.95,.98,1.0,1.05].map(x=>ampAt(x*lim));
 if(Math.abs(A[0]-A[2])>.01)bad('90%までは素通しでない '+A[0].toFixed(3)+' '+A[2].toFixed(3));
 for(let i=3;i<A.length;i++)if(A[i]>A[i-1]+1e-3)bad('90%超で減衰が単調でない '+A.map(x=>x.toFixed(3)));
 if(!(A[3]>.01&&A[3]<A[2]))bad('92%で途中の大きさになっていない');if(A[6]>.005||A[7]!==0)bad('ナイキスト以上が0でない '+A[6].toFixed(4)+' '+A[7])}
// 9) 8ボイス上限・ボイス盗み・EG終了で解放
{const pr=mk({f1S:.7});let maxOn=0;for(let i=0;i<20;i++){pr.msg({t:'on',m:40+i,vel:1});run(pr,5,()=>{maxOn=Math.max(maxOn,pr.V.filter(v=>v.on).length)})}
 if(maxOn>8)bad('ボイスが8を超えた '+maxOn);if(maxOn<8)bad('8ボイスまで使えていない '+maxOn);
 const r=run(pr,100);if(r.nan||r.mx>1)bad('ボイス盗み後の出力 '+r.mx);
 /* 盗み中にプチ音(急な段差)が出ない: 1サンプルあたりの差分が妥当 */
 const p3=mk({f1Lvl:80});for(let i=0;i<8;i++)p3.msg({t:'on',m:48+i*2,vel:1});run(p3,60);let jump=0,last=0;
 for(let k=0;k<12;k++){p3.msg({t:'on',m:70+k,vel:1});const x=run(p3,3).out;for(let i=0;i<x.length;i++){jump=Math.max(jump,Math.abs(x[i]-last));last=x[i]}}
 if(jump>.35)bad('ボイス盗みで段差(クリック) '+jump.toFixed(3));
 /* 離す→EG終了でボイス解放 */
 const p4=mk({f1R:.05});p4.msg({t:'on',m:60,vel:1});p4.msg({t:'on',m:64,vel:1});run(p4,100);p4.msg({t:'alloff'});run(p4,400);if(p4.V.some(v=>v.on))bad('リリース後ボイスが解放されない');if(run(p4,10).mx!==0)bad('リリース後に音が残る');
 /* S=0なら押しっぱなしでも自然に消えて解放 */
 const p5=mk({f1S:0,f1D:.05});p5.msg({t:'on',m:60,vel:1});run(p5,600);if(p5.V.some(v=>v.on))bad('S=0で解放されない');
 /* noteOff(個別)は該当の鍵だけ */
 const p6=mk({f1R:.02});p6.msg({t:'on',m:60,vel:1});p6.msg({t:'on',m:64,vel:1});p6.msg({t:'off',m:60});run(p6,200);if(p6.V.filter(v=>v.on).length!==1||p6.V.find(v=>v.on).m!==64)bad('個別のnoteOff');
 /* 同じ鍵の押し直しは1ボイス */
 const p7=mk();p7.msg({t:'on',m:60,vel:1});run(p7,10);p7.msg({t:'on',m:60,vel:1});run(p7,10);if(p7.V.filter(v=>v.on).length!==1)bad('同じ鍵の押し直しでボイスが増える');
 /* 押してすぐ離す(盗み中のoff)でも音が詰まらない・落ちない */
 const p8=mk();for(let i=0;i<8;i++)p8.msg({t:'on',m:40+i,vel:1});run(p8,3);p8.msg({t:'on',m:80,vel:1});p8.msg({t:'off',m:80});const r8=run(p8,50);if(r8.nan)bad('盗み中のoffでNaN')}
// 10) アタックが速い(2ms)でもクリックしない(ピークは範囲内)・ADSRの形: Aが長いと立ち上がりが遅い
{const fast=mk({f1A:.002}),slow=mk({f1A:.5});fast.msg({t:'on',m:69,vel:1});slow.msg({t:'on',m:69,vel:1});
 const a=run(fast,20).mx,b=run(slow,20).mx;if(!(a>b*3))bad('アタックの速い/遅いで立ち上がりが変わらない '+a.toFixed(3)+' '+b.toFixed(3))}
// 11) つまみ変更中(演奏中)も有限で、段差が小さい(ゲインは滑らかに追従)
{const pr=mk({f2Lvl:30,f2Coarse:2});pr.msg({t:'on',m:60,vel:1});run(pr,50);let last=0,jump=0,nan=false;
 for(let k=0;k<100;k++){pr.msg({t:'p',id:'f2Lvl',v:(k*37)%100});pr.msg({t:'p',id:'f1Coarse',v:[1,2,3][k%3]});const x=run(pr,1).out;for(let i=0;i<x.length;i++){if(!isFinite(x[i]))nan=true;jump=Math.max(jump,Math.abs(x[i]-last));last=x[i]}}
 if(nan)bad('つまみ操作中にNaN');if(jump>.9)bad('つまみ操作中の段差 '+jump.toFixed(3))}
// 12) ベロシティ(ARP・SEQのアクセント)で音量が変わる
{const a=steady({f1S:1,f1Vel:1},69).sp,pr=mk({f1S:1,f1Vel:1});pr.msg({t:'on',m:69,vel:.5});run(pr,40);const h=spec(run(pr,N/128).out);if(Math.abs(Math.max(...h)/Math.max(...a)-.5)>.02)bad('VEL=100%でベロシティが音量に反映されない')}
// 13) メイン側クラス: パッチの往復・未対応表示・既定値
{const bus={init(){return null},input:null,p:{},set(id,v){this.p[id]=v}};const fm=new SD.FM(bus);
 const pt=fm.getPatch();SD.defs.fm.P.forEach(p=>{if(p.tab!=='top'&&pt[p.id]===undefined)bad('getPatchに無い '+p.id);if(p.tab==='top'&&pt[p.id]!==undefined)bad('topがpatchに入っている '+p.id)});
 fm.setPatch({fAlg:'4',f2Lvl:55,f3Coarse:3.5});const q=fm.getPatch();if(q.fAlg!=='4'||q.f2Lvl!==55||q.f3Coarse!==3.5||q.f1Lvl!==80||q.f4Lvl!==0)bad('setPatch/既定値');
 const fm2=new SD.FM(bus);fm2.setPatch(q);if(JSON.stringify(fm2.getPatch())!==JSON.stringify(q))bad('保存→復元が一致しない');
 fm2.setPatch({});if(fm2.p.fAlg!=='1'||fm2.p.f1Lvl!==80||fm2.p.f2Lvl!==0)bad('旧データ(空)が既定値で読めない');
 if(fm.unsup)bad('未初期化で非対応表示');fm.ready=true;fm.mode='none';if(!fm.unsup)bad('Worklet無しで非対応にならない');
 if(fm.id!=='fm'||fm.tabs.map(x=>x.id).join()!=='algo,op1,op2,op3,op4,fx')bad('タブ構成(ALGO,OP1〜4,FX)')}
// ===== v2.5b =====
const dist=(sp,f0,bw)=>{bw=bw||BW;let tot=0,fund=0;for(let i=2;i<sp.length;i++){const e=sp[i]*sp[i];tot+=e;if(Math.abs(i*bw-f0)<bw*3)fund+=e}return tot>0?1-fund/tot:0};
// 14) フィードバック: FB 0→7 で倍音の量が単調に増える(ALG8のOP4単独)。FB0は純音
{let last=-1,vals=[];for(let fb=0;fb<=7;fb++){const{sp}=steady({fAlg:'8',f1Lvl:0,f4Lvl:80,f1S:1,f4S:1,fFb:fb},69);const d=dist(sp,440);vals.push(+d.toFixed(4));if(!(d>last-1e-6))bad('FB'+fb+'で倍音が減った '+vals);last=d}
 if(vals[0]>.001)bad('FB0が純音でない '+vals[0]);if(!(vals[7]>.2))bad('FB7で倍音が増えない '+vals[7]);if(!(vals[1]>vals[0]))bad('FB1で変化なし');
 /* FB最大でもNaN無し・範囲内、全アルゴリズムで */
 for(let a=1;a<=8;a++){const pr=mk({fAlg:String(a),f4Lvl:100,f3Lvl:100,f2Lvl:100,fFb:7});pr.msg({t:'on',m:60,vel:1});const r=run(pr,300);if(r.nan||r.mx>1)bad('FB7 ALG'+a+' '+r.mx)}}
// 15) OP別EG: OP2(モジュレーター)のEGを短くすると、立ち上がり直後だけ側波帯が多く後は減る
{const o={fAlg:'1',f1Lvl:80,f2Lvl:85,f2Coarse:2,f2A:.001,f2D:.6,f2S:0,f1S:1};const pr=mk(o);pr.msg({t:'on',m:69,vel:1});run(pr,4);
 const bw2=SR/4096,early=dist(spec(run(pr,32).out),440,bw2);run(pr,300);const late=dist(spec(run(pr,32).out),440,bw2);
 if(!(early>.25))bad('立ち上がり直後に倍音が少ない '+early.toFixed(3));if(!(late<.02))bad('モジュレーターEG終了後も倍音が残る '+late.toFixed(3));
 /* 比較: OP2のEGを長く(S=1)すると、後も倍音が残る */
 const q=mk(Object.assign({},o,{f2S:1,f2D:4}));q.msg({t:'on',m:69,vel:1});run(q,300);const keep=dist(spec(run(q,N/128).out),440);if(!(keep>.15))bad('OP2が持続しても倍音が減る '+keep.toFixed(3));
 /* OPごとに独立: OP1のADSRを変えてもOP2の側波帯は同じ */
 const a1=mk(o),a2=mk(Object.assign({},o,{f1A:.3}));[a1,a2].forEach(x=>x.msg({t:'on',m:69,vel:1}));run(a1,4);run(a2,4);
 if(Math.abs(a1.V[0].l[1]-a2.V[0].l[1])>1e-9)bad('OP1の設定でOP2のEGが変わる')}
// 16) 解放判定は全キャリアのEGだけ。モジュレーターのRが長くても解放される / キャリアのRが長ければ鳴り続ける
{const a=mk({fAlg:'1',f1R:.02,f2R:6,f2Lvl:50,f2Coarse:2,f2S:1,f1S:1});a.msg({t:'on',m:60,vel:1});run(a,50);a.msg({t:'alloff'});run(a,300);
 if(a.V.some(v=>v.on))bad('モジュレーターのRが長いのでボイスが残る');if(run(a,5).mx!==0)bad('モジュレーターだけ残って鳴る');
 const b=mk({fAlg:'1',f1R:3,f2R:.01,f1S:1});b.msg({t:'on',m:60,vel:1});run(b,50);b.msg({t:'alloff'});run(b,300);if(!b.V.some(v=>v.on))bad('キャリアのRが長いのに解放された');
 /* 複数キャリア(ALG5: OP1とOP3): 長い方が終わるまで残る */
 const c=mk({fAlg:'5',f1Lvl:80,f3Lvl:80,f1R:.01,f3R:1,f1S:1,f3S:1});c.msg({t:'on',m:60,vel:1});run(c,30);c.msg({t:'alloff'});run(c,200);if(!c.V.some(v=>v.on))bad('キャリアが1つでも残っていれば解放しない');run(c,2000);if(c.V.some(v=>v.on))bad('全キャリア終了で解放されない')}
// 17) ベロシティ: VEL>0で0.2と1.0の出力が変わる、VEL=0なら変わらない。モジュレーターはベロシティで倍音量が変わる
{const lvl=(o,v)=>{const pr=mk(o);pr.msg({t:'on',m:69,vel:v});run(pr,40);return Math.max(...spec(run(pr,N/128).out))};
 const lo=lvl({f1S:1,f1Vel:1},.2),hi=lvl({f1S:1,f1Vel:1},1);if(Math.abs(lo/hi-.2)>.03)bad('VEL100%で音量が比例しない '+(lo/hi).toFixed(3));
 const l0=lvl({f1S:1,f1Vel:0},.2),h0=lvl({f1S:1,f1Vel:0},1);if(Math.abs(l0-h0)>1e-4)bad('VEL=0でベロシティが効く');
 const m=(v,sv)=>{const pr=mk({fAlg:'1',f2Lvl:60,f2Coarse:2,f1S:1,f2S:1,f1Vel:0,f2Vel:sv});pr.msg({t:'on',m:69,vel:v});run(pr,40);return dist(spec(run(pr,N/128).out),440)};
 if(!(m(1,1)>m(.2,1)+.1))bad('モジュレーターのVELで倍音量が変わらない '+m(1,1).toFixed(3)+' '+m(.2,1).toFixed(3));if(Math.abs(m(1,0)-m(.2,0))>1e-3)bad('モジュレーターVEL=0でも変わる')}
// 18) v2.5aの保存データ(全体EG)は、4つのOPすべてに同じ値で展開して読める
{const old={fAlg:'3',f1Lvl:80,f2Lvl:30,fA:.01,fD:.5,fS:.3,fR:.4},r=SD.FMMIG(old);
 for(let n=1;n<=4;n++){if(r['f'+n+'A']!==.01||r['f'+n+'D']!==.5||r['f'+n+'S']!==.3||r['f'+n+'R']!==.4)bad('OP'+n+'に展開されない')}
 if('fA' in r||'fR' in r)bad('旧IDが残る');if(old.fA!==.01||'f1A' in old)bad('元のデータを書き換えた');
 if(SD.FMMIG({f2A:.9,fA:.1}).f2A!==.9||SD.FMMIG({f2A:.9,fA:.1}).f1A!==.1)bad('新しい値を優先しつつ旧値を補う');
 const bus={init(){return null},input:null,p:{},set(){}},fm=new SD.FM(bus);fm.setPatch(old);const q=fm.getPatch();if(q.f3A!==.01||q.f4S!==.3||q.fAlg!=='3')bad('setPatchで旧データが読めない');if('fA' in q)bad('getPatchに旧ID');
 fm.setPatch({});if(fm.p.f1A!==.002||fm.p.f1D!==.4||fm.p.f1S!==.7||fm.p.f1R!==.2||fm.p.f1Vel!==.5||fm.p.fFb!==0)bad('OP別EG・VEL・FBの既定値');
 if(SD.FMMIG(null)!==null)bad('nullを通せない')}

// v2.5d) プリセット: 全プリセットでNaN無し・ピーク範囲内・音が出る・保存→復元で同一・旧データ(fn*無し)は既定値・E.PIANOの公開・ボイス奪取の通知
{const PR=SD.FMPRESETS;if(PR.length<6||PR.length>8)bad('出荷プリセットは6〜8個 '+PR.length);
 ['epiano','bell','bass','brass','organ','pluck'].forEach(i=>{if(!PR.find(x=>x.id===i))bad('プリセット '+i+' が無い')});
 if(new Set(PR.map(x=>x.id)).size!==PR.length||new Set(PR.map(x=>x.name)).size!==PR.length)bad('プリセットの重複');
 const M=SD.defs.fm,mkE=()=>new SD.FM({init(){},set(){}});
 PR.forEach(q=>{const o=SD.fmPatch(q.id),nm=q.name;
  Object.keys(o).forEach(k=>{const p=M.byId[k];if(!p)bad(nm+' 未定義ID '+k);else if(p.type==='knob'&&(o[k]<p.min||o[k]>p.max))bad(nm+' '+k+' が範囲外 '+o[k]);else if(p.type==='seg'&&!p.opts.some(x=>x[0]===o[k]))bad(nm+' '+k+' 選択肢外')});
  [36,60,84,108].forEach(m=>{const pr=mk(o);pr.msg({t:'on',m:m,vel:1});const r=run(pr,400);if(r.nan)bad(nm+' m'+m+' NaN');if(r.mx>1)bad(nm+' m'+m+' ピーク超過 '+r.mx);if(m<100&&!(r.mx>.02))bad(nm+' m'+m+' 無音 '+r.mx)});
  const p8=mk(o);for(let k=0;k<12;k++)p8.msg({t:'on',m:48+k*3,vel:1});const r8=run(p8,300);if(r8.nan||r8.mx>1)bad(nm+' 多重発音 '+r8.mx);
  const e=mkE();e.setPatch(o);const j=JSON.stringify(e.getPatch());const e2=mkE();e2.setPatch(JSON.parse(j));
  if(JSON.stringify(e2.getPatch())!==j)bad(nm+' 保存→復元が同一でない');
  Object.keys(o).forEach(k=>{if(e2.p[k]!==o[k])bad(nm+' 復元後の値 '+k)})});
 {const e=mkE();e.setPatch({});M.P.forEach(p=>{if(p.tab!=='top'&&e.p[p.id]!==p.def)bad('空データの既定値 '+p.id)});
  e.setPatch({fAlg:'3',f1Lvl:60});if(e.p.f2Coarse!==1||e.p.f4Lvl!==0||e.p.f3A!==.002||e.p.fFb!==0)bad('一部だけのデータが既定値で補われない')}
 if(!SD.FM_EPIANO||SD.FM_EPIANO.fAlg!=='5'||JSON.stringify(SD.FM_EPIANO)!==JSON.stringify(SD.fmPatch('epiano')))bad('E.PIANOの公開(SD.FM_EPIANO)');
 if(SD.fmPatch('nothing')!==null)bad('未知のプリセットはnull');
 {const pr=mk(SD.FM_EPIANO);pr.msg({t:'on',m:60,vel:1});const a=run(pr,12).out;if(!(a.reduce((x,v)=>x+v*v,0)>0))bad('E.PIANO 立ち上がりで無音')}
 {const pr=mk({f1Lvl:80});const msgs=[];pr.port.postMessage=m=>msgs.push(m);for(let k=0;k<8;k++)pr.msg({t:'on',m:50+k,vel:1});run(pr,4);
  if(msgs.length)bad('8音までは通知しない');pr.msg({t:'on',m:70,vel:1});pr.msg({t:'on',m:71,vel:1});pr.msg({t:'on',m:72,vel:1});run(pr,4);
  if(msgs.filter(m=>m.t==='steal').length!==1)bad('ボイス奪取の通知は間引いて1回: '+msgs.length)}}

console.log(err?('失敗 '+err+'件'):'OK: FM');
process.exit(err?1:0);
