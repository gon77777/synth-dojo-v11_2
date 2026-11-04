/* オートメーション基盤(v3.5): データ・評価(純粋関数)・形・点の編集・再生エンジン。DOM非依存。
   時間は tick(1拍=96・1小節=384・1/16=24)。値は正規化0〜1(選択式つまみは選択肢の番号)。 */
var SD=window.SD=window.SD||{};
(function(){
 var TPB=96,TPBAR=384,TPS=24,MAXL=16,BARS=[1,2,4,8,16,32],PMAX=4096,SHS='LSEGC';
 var clamp=function(x,a,b){return Math.max(a,Math.min(b,x))};
 /* ---- 対象にできないつまみ(定義に auto:false と理由 autoWhy を付ける)。fAlg は階段のみ(auto:'step') ---- */
 var OFF={wTable:'素材・テーブルの切り替えは、音が途切れるので動かせません。',wsMat:'素材の切り替えは、読み込み直しが必要なので動かせません。',gMat:'素材の切り替えは、読み込み直しが必要なので動かせません。',
  rvbPos:'位置の切り替えは、つなぎ替えで音が途切れるので動かせません。',rvbSize:'残響の作り直しが必要なので動かせません(RVB MIX・PRE DLYは動かせます)。',rvbType:'残響の作り直しが必要なので動かせません(RVB MIX・PRE DLYは動かせます)。',rvbDamp:'残響の作り直しが必要なので動かせません(RVB MIX・PRE DLYは動かせます)。'};
 Object.keys(SD.defs||{}).forEach(function(sy){var D=SD.defs[sy];
  Object.keys(OFF).forEach(function(id){var p=D.byId[id];if(p){p.auto=false;p.autoWhy=OFF[id]}});
  var a=D.byId.fAlg;if(a){a.auto='step';a.autoWhy='階段(ステップ)でのみ切り替えられます。'}});
 var A=SD.Auto={TPB:TPB,TPBAR:TPBAR,TPS:TPS,MAXL:MAXL,BARS:BARS,PMAX:PMAX,OFF:OFF};
 /* MT-1b: au.meter={n,d,g}。4/4(既定)は持たない=従来のデータと完全に同じ。meter.js(SD.METER)が無い環境でも4/4で動く */
 A.mk=function(bars,meter){var au={bars:BARS.indexOf(bars)>=0?bars:4,lanes:[]},m=meter&&SD.METER?SD.METER.norm(meter):null;if(m&&!(m.n===4&&m.d===4&&m.g==null))au.meter=m;return au};
 /* MT-3a: 拍子の付け外し(4/4・不正=持たない)。点・シーン・マーカーは tick のまま触らない(小節線の位置だけが barTicks で動く) */
 A.setMeter=function(au,meter){if(!au)return au;var m=meter&&SD.METER?SD.METER.norm(meter):null;if(m&&!(m.n===4&&m.d===4&&m.g==null))au.meter=m;else delete au.meter;return au};
 /* MT-3b: 画面操作の純関数。GRID『1小節』(保存値384)は拍子の1小節・小節単位の移動と『次に置く位置』は barTicks */
 A.gridTick=function(au,g){return g===384?A.bar(au):g};
 A.barMove=function(au,at,d){var bt=A.bar(au);return Math.max(0,Math.min((au.bars-1)*bt,at+d*bt))};
 A.nextAt=function(au,last){var bt=A.bar(au);return last?Math.min((au.bars-1)*bt,last.at+bt*Math.max(1,Math.floor(au.bars/4))):0};
 A.bar=function(au){var m=au&&au.meter;return m&&SD.METER&&SD.METER.valid(m)?SD.METER.barTicks(m):TPBAR};
 /* MT-3c: 拍子(meter)から1小節のtick。au が無くても使える(レッスン定義・検証用)。省略・不正=4/4 */
 A.barOf=function(m){return m&&SD.METER&&SD.METER.valid(m)?SD.METER.barTicks(m):TPBAR};
 A.len=function(au){return au.bars*A.bar(au)};
 /* ---- 評価 ---- */
 A.interp=function(sh,cu,u){
  if(sh==='S')return 0;if(sh==='E')return u*u;if(sh==='G')return 1-(1-u)*(1-u);if(sh==='C')return u*u*(3-2*u);
  return cu?Math.pow(u,Math.pow(4,cu)):u};/* 'L': cu>0 で後半ほど急、cu<0 で前半ほど急 */
 A.eval=function(lane,tick){
  var P=lane.pts,n=P.length;if(!n)return null;
  if(tick<=P[0][0])return P[0][1];
  if(tick>=P[n-1][0])return P[n-1][1];
  var i=0,lo=0,hi=n-1;/* tick<=P[i][0] を満たす最後の i(同じtickの点は後ろが勝つ) */
  while(lo<hi){var m=(lo+hi+1)>>1;if(P[m][0]<=tick)lo=m;else hi=m-1}i=lo;
  var a=P[i],b=P[i+1],sh=a[2]||'L';if(sh==='S')return a[1];
  var u=(tick-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*A.interp(sh,a[3]||0,u)};
 A.sample=function(lane,t0,t1,n){var r=[];for(var k=0;k<n;k++)r.push(A.eval(lane,n>1?t0+(t1-t0)*k/(n-1):t0));return r};
 /* ---- 値の変換(レーンの値 ⇔ つまみの実値) ---- */
 A.toValue=function(p,v){if(p.type==='seg'){var o=p.opts[clamp(Math.round(v),0,p.opts.length-1)];return o[0]}return SD.fromN(p,v)};
 A.fromValue=function(p,val){if(p.type==='seg'){for(var i=0;i<p.opts.length;i++)if(p.opts[i][0]===val)return i;return 0}return SD.toN(p,val)};
 A.hi=function(p){return p.type==='seg'?p.opts.length-1:1};/* レーン値の上限 */
 /* ---- 点の編集(tick昇順を保つ) ---- */
 A.snap=function(tick,grid){return grid>0?Math.round(tick/grid)*grid:Math.round(tick)};
 A.insert=function(lane,tick,v,sh,cu){
  var P=lane.pts,pt=[Math.round(tick),v,sh||'L'];if(cu)pt.push(cu);
  if(P.length>=PMAX&&!P.some(function(q){return q[0]===pt[0]}))return -1;/* 点の上限 */
  var i=P.length;while(i>0&&P[i-1][0]>pt[0])i--;
  if(i>0&&P[i-1][0]===pt[0]){P[i-1]=pt;return i-1}
  P.splice(i,0,pt);return i};
 A.move=function(lane,i,tick,v){
  var P=lane.pts,p=P[i];if(!p)return -1;
  var lo=i>0?P[i-1][0]:0,hi=i<P.length-1?P[i+1][0]:1e9;
  p[0]=clamp(Math.round(tick),lo,hi);p[1]=v;return i};
 A.remove=function(lane,i){return lane.pts.splice(i,1)};
 A.thin=function(pts,tol){/* Ramer–Douglas–Peucker(縦方向の誤差 ≤ tol) */
  var n=pts.length;if(n<3)return pts.map(function(p){return[p[0],p[1],'L']});
  var keep=new Array(n).fill(false),st=[[0,n-1]];keep[0]=keep[n-1]=true;
  while(st.length){var s=st.pop(),a=s[0],b=s[1],mx=0,mi=-1;
   for(var k=a+1;k<b;k++){var u=(pts[k][0]-pts[a][0])/Math.max(1,pts[b][0]-pts[a][0]),y=pts[a][1]+(pts[b][1]-pts[a][1])*u,d=Math.abs(pts[k][1]-y);if(d>mx){mx=d;mi=k}}
   if(mx>tol&&mi>0){keep[mi]=true;st.push([a,mi],[mi,b])}}
  var r=[];for(var j=0;j<n;j++)if(keep[j])r.push([pts[j][0],pts[j][1],'L']);return r};
 /* ---- レーン一覧 ---- */
 A.find=function(au,trk,id){for(var i=0;i<au.lanes.length;i++)if(au.lanes[i].trk===trk&&au.lanes[i].id===id)return i;return -1};
 /* 追加。上限16本・既存なら既存を返す。defFn(trk,id)→つまみ定義。auto:false は拒否(null) */
 /* MA-1: モジュラーのレーンID('vcf1.cutoff' のように '.' を含む)。ID の先頭の種類で定義が決まるので、いまのラックにそのモジュールが無くても(孤児でも)つまみ定義を引ける */
 A.defFor=function(defFn,trk,id){var p=defFn?defFn(trk,id):null;if(!p&&typeof id==='string'&&id.indexOf('.')>0&&SD.modLib)p=SD.modLib.knobDef(id)||null;return p};
 /* MA-2: 孤児レーン=モジュラーのID('.' 付き)で、defFn(いまのラックで引く定義)が引けないもの。点は残す(R1)・再生や REC は defFn が null なので何もしない・同IDのモジュールが戻れば defFn が引けて復活(R2) */
 A.isOrphan=function(l,defFn){return !!l&&typeof l.id==='string'&&l.id.indexOf('.')>0&&!(defFn&&defFn(l.trk,l.id))};
 A.orphans=function(au,defFn){return(au&&au.lanes||[]).filter(function(l){return A.isOrphan(l,defFn)})};
 A.addLane=function(au,trk,id,defFn){
  var p=defFn?defFn(trk,id):null;if(defFn&&(!p||p.auto===false))return null;
  var i=A.find(au,trk,id);if(i>=0)return au.lanes[i];
  if(au.lanes.length>=MAXL)return null;
  var l={trk:trk,id:id,mute:false,pts:[]};au.lanes.push(l);return l};
 /* 読み込み時の整形(不正値を丸める)。defFn があれば範囲も合わせる */
 A.clean=function(o,defFn){
  var au=A.mk(o&&o.bars|0,o&&o.meter);if(!o)return au;if(!Array.isArray(o.lanes))o={bars:au.bars,lanes:[],scn:o.scn,mk:o.mk,lp:o.lp};
  var L=A.len(au);
  o.lanes.forEach(function(l){
   if(au.lanes.length>=MAXL||!l||typeof l.id!=='string')return;
   var trk=l.trk==='M'?'M':clamp(l.trk|0,0,(SD.MAXT||4)-1);
   if(A.find(au,trk,l.id)>=0)return;
   var p=defFn?A.defFor(defFn,trk,l.id):null,hi=p?A.hi(p):64,seg=p&&p.type==='seg';
   var pts=(Array.isArray(l.pts)?l.pts:[]).map(function(q,k){if(!Array.isArray(q))return null;var t=+q[0],v=+q[1];if(!isFinite(t)||!isFinite(v))return null;
    var sh=SHS.indexOf(q[2])>=0?q[2]:'L',cu=clamp(+q[3]||0,-1,1);if(seg)sh='S';
    var r=[clamp(Math.round(t),0,L),seg?clamp(Math.round(v),0,hi):clamp(v,0,hi),sh];if(cu&&sh==='L')r.push(cu);r._k=k;return r}).filter(Boolean);
   pts.sort(function(a,b){return a[0]-b[0]||a._k-b._k});pts.forEach(function(q){delete q._k});if(pts.length>PMAX)pts=pts.slice(0,PMAX);
   au.lanes.push({trk:trk,id:l.id,mute:!!l.mute,pts:pts})});
  var sn=A.cleanScn(o.scn,L),mk=A.cleanMk(o.mk,L),lp=A.cleanLp(o.lp,L);if(sn.length)au.scn=sn;if(mk.length)au.mk=mk;if(lp)au.lp=lp;/* 無いデータは無し=従来 */
  return au};
 A.json=function(au){return JSON.parse(JSON.stringify(au))};

 /* ---- シーンレーン・マーカー・ループ範囲(v7.3a)。scn=[{at(tick),s(シーン番号0〜5),g(グライド)}] mk=[{at,name}] lp=[t0,t1] ---- */
 var GL={'0':0,beat:TPB,bar:TPBAR,'2bar':TPBAR*2};/* グライドの種類の一覧(キーの存在判定用。tick は glideTicks(g,barTicks)) */
 A.GLIDES=[['0','即時'],['beat','1拍'],['bar','1小節'],['2bar','2小節']];A.NSC=6;A.MARKS=['Intro','A','B','Chorus','Break','Drop','Outro'];
 A.glideTicks=function(g,bt){bt=bt||TPBAR;return g==='beat'?TPB:g==='bar'?bt:g==='2bar'?bt*2:0};
 A.cleanScn=function(a,L){var r=[];(Array.isArray(a)?a:[]).forEach(function(q){if(!q||r.length>=64)return;var t=+q.at,s=+q.s;if(!isFinite(t)||!isFinite(s))return;
   var e={at:clamp(Math.round(t),0,L),s:clamp(Math.round(s),0,A.NSC-1),g:GL[q.g]!=null?q.g:'0'},i=r.length;while(i>0&&r[i-1].at>e.at)i--;
   if(i>0&&r[i-1].at===e.at)r[i-1]=e;else r.splice(i,0,e)});return r};
 A.cleanMk=function(a,L){var r=[];(Array.isArray(a)?a:[]).forEach(function(q){if(!q||r.length>=32)return;var t=+q.at;if(!isFinite(t))return;
   var e={at:clamp(Math.round(t),0,L),name:String(q.name==null?'':q.name).slice(0,12)||'A'},i=r.length;while(i>0&&r[i-1].at>e.at)i--;r.splice(i,0,e)});return r};
 A.cleanLp=function(a,L){if(!Array.isArray(a)||a.length!==2)return null;var x=Math.round(+a[0]),y=Math.round(+a[1]);return isFinite(x)&&isFinite(y)&&x>=0&&y>x&&y<=L?[x,y]:null};
 A.markRange=function(au,i){var m=au.mk||[],e=m[i];if(!e)return null;var nx=m[i+1];return[e.at,nx?nx.at:A.len(au)]};
 A.sceneAt=function(scn,tick,bt){if(!scn||!scn.length||tick<scn[0].at)return null;var i=0,lo=0,hi=scn.length-1;
  while(lo<hi){var m=(lo+hi+1)>>1;if(scn[m].at<=tick)lo=m;else hi=m-1}i=lo;var e=scn[i],g=A.glideTicks(e.g,bt);
  return{a:i>0?scn[i-1].s:e.s,b:e.s,u:g>0?clamp((tick-e.at)/g,0,1):1}};
 /* シーンの補間(純粋関数)。連続値は正規化値で補間、seg/ON/OFF/ミュートは遷移の終わりで切替。返り値 {v:[[trk,id,値]],m:[[trk,mute]]}。最初のシーン点より前・未保存は null */
 A.sceneState=function(sc,scn,tick,pf,bt){var h=A.sceneAt(scn,tick,bt);if(!h||!sc)return null;var T=sc[h.b];if(!T)return null;var F=sc[h.a]||T,v=[],m=[];
  T.tr.forEach(function(t,k){var f=F.tr[k]||t;m.push([k,h.u>=1?!!t.mute:!!f.mute]);
   Object.keys(t.mix).forEach(function(id){var vb=t.mix[id],va=f.mix[id];if(va==null)va=vb;var p=pf?pf(id):null,r;
    if(h.u>=1||va===vb)r=vb;else if(!p||p.type==='seg'||typeof vb!=='number'||typeof va!=='number')r=va;
    else r=SD.fromN(p,SD.toN(p,va)+(SD.toN(p,vb)-SD.toN(p,va))*h.u);
    v.push([k,id,r])})});return{v:v,m:m}};
 /* レッスンの sn 目標(at=小節(0始まり)・scene=名前・glide='0'|'≥1beat'|'≥1bar')が、いまのシーンレーンで満たされているか */
 A.snMet=function(g,au,sc){var names=(sc||[]).map(function(x){return x&&x.name}),want=names.indexOf(g.scene);if(want<0)return false;
  var bt=A.bar(au),need=g.glide==='≥1bar'?bt:g.glide==='≥1beat'?TPB:0;
  return(au.scn||[]).some(function(e){return e.at===g.at*bt&&e.s===want&&A.glideTicks(e.g,bt)>=need})};
 A.cleanSc=function(a,nT){var r=[];for(var i=0;i<A.NSC;i++){var q=Array.isArray(a)?a[i]:null;if(!q||!Array.isArray(q.tr)){r.push(null);continue}
  r.push({name:String(q.name==null?'S'+(i+1):q.name).slice(0,12),tr:q.tr.slice(0,nT).map(function(t){var mix={};if(t&&t.mix)Object.keys(t.mix).forEach(function(id){var x=t.mix[id];if(typeof x==='number'&&isFinite(x))mix[id]=x});return{mute:!!(t&&t.mute),mix:mix}})})}return r};
 /* ---- 形(シェイプ)。点列を返す。o={t0,t1,n(周期数),depth,center,phase,duty,steps,seed,wave} ---- */
 function rng(seed){var a=(seed||1)>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
 A.SHAPES=['ramp_up','ramp_down','exp_up','log_up','scurve','saw_up','saw_down','tri','sine','square','stairs','random_sh','random_walk','spike','cliff','chirp'];
 A.shape=function(name,o){
  o=o||{};var t0=o.t0!=null?o.t0:0,t1=o.t1!=null?o.t1:(o.bt||TPBAR)*4,n=Math.max(1,o.n||4),dp=o.depth!=null?o.depth:1,ce=o.center!=null?o.center:.5;
  var lo=clamp(ce-dp/2,0,1),hi=clamp(ce+dp/2,0,1),L=t1-t0,ph=o.phase||0,du=o.duty!=null?o.duty:.5;
  var R=function(x){return Math.round(x)},P=[];
  /* 周期形: 1周期の折れ点 bp=[[u,値,sh]…](u=0〜1)を、位相ずらしで t0〜t1 に敷く */
  function periodic(bp){
   var cl=L/n,all=[],k,j;
   for(k=-1;k<=n+1;k++)for(j=0;j<bp.length;j++){all.push([R(t0+(k+bp[j][0]-ph)*cl),bp[j][1],bp[j][2]])}
   all.sort(function(a,b){return a[0]-b[0]});
   var ln={pts:all},out=[],hasA=false;
   all.forEach(function(q){if(q[0]>=t0&&q[0]<=t1){out.push(q);if(q[0]===t0)hasA=true}});
   if(!hasA){var i=0;while(i<all.length-1&&all[i+1][0]<=t0)i++;out.unshift([t0,A.eval(ln,t0),all[i][2]])}
   var last=out[out.length-1];if(last[0]<t1)out.push([t1,A.eval(ln,t1),'L']);
   /* 同じtickに複数あるとき、t1の点は先頭だけ残す(最後の山で戻らないように) */
   return out.filter(function(q,i){return !(q[0]===t1&&i>0&&out[i-1][0]===t1)})}
  switch(name){
   case 'ramp_up':P=[[t0,lo,'L'],[t1,hi,'L']];break;
   case 'ramp_down':P=[[t0,hi,'L'],[t1,lo,'L']];break;
   case 'exp_up':P=[[t0,lo,'E'],[t1,hi,'L']];break;
   case 'log_up':P=[[t0,lo,'G'],[t1,hi,'L']];break;
   case 'scurve':P=[[t0,lo,'C'],[t1,hi,'L']];break;
   case 'saw_up':P=periodic([[0,lo,'L'],[.9999,hi,'S']]);break;
   case 'saw_down':P=periodic([[0,hi,'L'],[.9999,lo,'S']]);break;
   case 'tri':P=periodic([[0,lo,'L'],[.5,hi,'L']]);break;
   case 'sine':{var bp=[],m=24;for(var i=0;i<m;i++)bp.push([i/m,ce+dp/2*Math.sin(2*Math.PI*i/m),'L']);bp=bp.map(function(q){return[q[0],clamp(q[1],0,1),'L']});/* 24点の直線近似 */P=periodic(bp);break}
   case 'square':P=periodic([[0,hi,'S'],[clamp(du,.01,.99),lo,'S']]);break;
   case 'stairs':{var s=Math.max(2,o.steps||4);for(var k=0;k<s;k++)P.push([R(t0+L*k/s),lo+(hi-lo)*k/(s-1),'S']);P.push([t1,hi,'S']);break}
   case 'random_sh':{var r=rng(o.seed);for(var k=0;k<n;k++)P.push([R(t0+L*k/n),lo+(hi-lo)*r(),'S']);P.push([t1,P[P.length-1][1],'S']);break}
   case 'random_walk':{var r2=rng(o.seed);for(var k=0;k<=n;k++)P.push([R(t0+L*k/n),lo+(hi-lo)*r2(),'C']);P[P.length-1][2]='L';break}
   case 'spike':P=[[t0,lo,'L'],[R(t0+L*.1),hi,'G'],[t1,lo,'L']];break;
   case 'cliff':P=[[t0,hi,'S'],[t1,lo,'L']];break;
   case 'chirp':{var rr=.8,tot=(1-Math.pow(rr,n))/(1-rr),pos=0;
    for(var k=0;k<n;k++){var l=L*Math.pow(rr,k)/tot;P.push([R(t0+pos),lo,'L']);P.push([R(t0+pos+l/2),hi,'L']);pos+=l}
    P.push([t1,lo,'L']);break}
   default:return[]}
  return P};
 /* 形を lane の範囲 [t0,t1] に敷く(範囲内の既存の点は置き換え、外は残す) */
 A.paint=function(lane,pts,t0,t1){
  var keep=lane.pts.filter(function(q){return q[0]<t0||q[0]>t1});
  lane.pts=keep.concat(pts.map(function(q){return q.slice()}));
  lane.pts.sort(function(a,b){return a[0]-b[0]});/* Array.sort は安定。同tickは(既存→形)の順 */
  return lane};

 /* ---- 描画エディタ用の編集(v3.6)。y は正規化(0〜1)。seg=選択式(値=番号・階段)、hi=レーン値の上限 ---- */
 A.GRIDS=[['1小節',384],['1拍',96],['1/8',48],['1/16',24],['3連',32],['なし',0]];
 A.cut=function(lane,t0,t1){lane.pts=lane.pts.filter(function(q){return q[0]<t0||q[0]>t1});return lane};
 function fitPts(pts,hi,seg){return pts.map(function(q){var v=clamp(q[1],0,1)*hi;return seg?[q[0],Math.round(v),'S']:[q[0],v,q[2]||'L']})}
 function put(lane,pts){lane.pts=lane.pts.concat(pts);lane.pts.sort(function(a,b){return a[0]-b[0]});return lane}/* 安定ソート */
 /* PEN: raw=[[tick,y]…](なぞった軌跡)。グリッドにスナップ→同tickは最後が勝つ→間引き→範囲を置き換え */
 A.pen=function(lane,raw,grid,tol,hi,seg,len){
  if(!raw.length)return lane;var m={};
  raw.forEach(function(q){var t=clamp(A.snap(q[0],grid),0,len);m[t]=q[1]});
  var ts=Object.keys(m).map(Number).sort(function(a,b){return a-b}),pts=ts.map(function(t){return[t,m[t],'L']});
  if(pts.length>2)pts=A.thin(pts,tol||.01);
  A.cut(lane,ts[0],ts[ts.length-1]);return put(lane,fitPts(pts,hi,seg))};
 A.line=function(lane,t0,y0,t1,y1,hi,seg){
  if(t1<t0){var a=t0;t0=t1;t1=a;a=y0;y0=y1;y1=a}
  A.cut(lane,t0,t1);return put(lane,fitPts(t1===t0?[[t0,y1,'L']]:[[t0,y0,'L'],[t1,y1,'L']],hi,seg))};
 /* 継ぎ目: 最後の値を最初の値にそろえる(ループ末尾 len に点が無ければ足す) */
 A.seam=function(lane,len){
  var P=lane.pts;if(!P.length)return lane;var v=P[0][1],last=P[P.length-1];
  if(last[0]<len)P.push([len,v,'L']);else last[1]=v;return lane};
 A.selCopy=function(lane,t0,t1){return lane.pts.filter(function(q){return q[0]>=t0&&q[0]<=t1}).map(function(q){var r=q.slice();r[0]-=t0;return r})};
 A.paste=function(lane,clip,at,len){
  if(!clip.length)return lane;var span=clip[clip.length-1][0];A.cut(lane,at,at+span);
  return put(lane,clip.map(function(q){var r=q.slice();r[0]=clamp(r[0]+at,0,len);return r}))};
 /* 範囲内の点を dt tick・dv(レーン値)だけ動かす。範囲は新しい位置を返す */
 A.selMove=function(lane,t0,t1,dt,dv,len,hi,seg){
  var keep=[],mv=[];lane.pts.forEach(function(q){(q[0]>=t0&&q[0]<=t1?mv:keep).push(q)});
  dt=clamp(dt,-t0,len-t1);
  mv.forEach(function(q){q[0]+=dt;var v=clamp(q[1]+dv,0,hi);q[1]=seg?Math.round(v):v});
  lane.pts=keep.concat(mv);lane.pts.sort(function(a,b){return a[0]-b[0]});return[t0+dt,t1+dt]};
 A.selScale=function(lane,t0,t1,f,hi,seg){
  var S=lane.pts.filter(function(q){return q[0]>=t0&&q[0]<=t1});if(!S.length)return lane;
  var mn=Math.min.apply(null,S.map(function(q){return q[1]})),mx=Math.max.apply(null,S.map(function(q){return q[1]})),c=(mn+mx)/2;
  S.forEach(function(q){var v=clamp(c+(q[1]-c)*f,0,hi);q[1]=seg?Math.round(v):v});return lane};
 /* 点のあたり判定(最も近い点の番号。tt=tick許容・ty=y許容(正規化)) */
 A.hit=function(lane,tick,y,tt,ty,hi){
  var b=-1,bd=1e9;lane.pts.forEach(function(q,i){var dx=Math.abs(q[0]-tick)/tt,dy=Math.abs(q[1]/hi-y)/ty;if(dx<=1&&dy<=1&&dx+dy<bd){bd=dx+dy;b=i}});return b};
 /* 取り消し・やり直し(編集全体で20段) */
 A.Hist=function(get,set,max){this.get=get;this.set=set;this.u=[];this.r=[];this.max=max||20};
 A.Hist.prototype.push=function(){this.u.push(JSON.stringify(this.get()));if(this.u.length>this.max)this.u.shift();this.r=[]};
 A.Hist.prototype.undo=function(){if(!this.u.length)return false;this.r.push(JSON.stringify(this.get()));this.set(JSON.parse(this.u.pop()));return true};
 A.Hist.prototype.redo=function(){if(!this.r.length)return false;this.u.push(JSON.stringify(this.get()));this.set(JSON.parse(this.r.pop()));return true};
 /* REC(v3.7): なぞった軌跡 raw=[[tick,値(レーン値)]…] をレーンに書き込む。範囲 [先頭,末尾] の既存の点は置き換え、
    前後は元のレーンになめらかにつながる(前の点→最初の録音点、最後の録音点→次の点は、それぞれの区間の補間で結ばれる)。
    選択式つまみは階段・同じ値の連続は1点にまとめる。連続値は thin(tol 1%)で間引く */
 A.recWrite=function(lane,raw,hi,seg,tol){
  if(!raw.length)return lane;
  var m={};raw.forEach(function(q){m[Math.round(q[0])]=q[1]});
  var ts=Object.keys(m).map(Number).sort(function(a,b){return a-b}),pts=ts.map(function(t){return[t,seg?Math.round(m[t]):m[t],'L']});
  if(seg){pts=pts.filter(function(q,i){return i===0||q[1]!==pts[i-1][1]}).map(function(q){return[q[0],q[1],'S']})}
  else if(pts.length>2){pts=A.thin(pts.map(function(q){return[q[0],q[1]/hi,'L']}),tol||.01).map(function(q){return[q[0],q[1]*hi,'L']})}
  A.cut(lane,ts[0],ts[ts.length-1]);
  lane.pts=lane.pts.concat(pts);lane.pts.sort(function(a,b){return a[0]-b[0]});return lane};
 /* ---- レッスン用(v3.8): つまみ定義の引き当て・実値のレーン・目標の判定(すべて純粋関数) ---- */
 A.defOf=function(synth,id){
  if(id==='sBpm'||id==='sSwing')return SD.PLAYP[id];
  var m=(SD.MIXP||[]).filter(function(q){return q.id===id})[0];if(m)return m;
  if(SD.AUINS&&SD.AUINS.indexOf(id)>=0)return(SD.insDef&&SD.insDef(id))||null;/* v8.4: EQ4・COMPのつまみ */
  if(id.indexOf('.')>0&&SD.modLib){var k=SD.modLib.knobDef(id);if(k)return k}/* MA-1: モジュラーのつまみ */
  var d=SD.defs[synth];return d&&d.byId[id]||null};
 var nrm=function(p,val){return A.fromValue(p,val)/A.hi(p)};
 /* 実値で書いたレーン {id,trk,pts:[[tick,実値,sh,cu]]} を、正規化値のレーンにする */
 A.fromReal=function(spec,defFn){
  var trk=spec.trk==null?0:spec.trk,p=A.defFor(defFn,trk,spec.id);if(!p)return null;var seg=p.type==='seg';
  return{trk:trk,id:spec.id,mute:false,pts:(spec.pts||[]).map(function(q){var r=[q[0],A.fromValue(p,q[1]),seg?'S':(q[2]||'L')];if(q[3]&&!seg)r.push(q[3]);return r})}};
 A.mkFromSpecs=function(specs,bars,defFn,meter){var au=A.mk(bars,meter);(specs||[]).forEach(function(sp){var l=A.fromReal(sp,defFn);if(l&&au.lanes.length<MAXL)au.lanes.push(l)});return au};
 A.tickText=function(t,meter){var bt=A.barOf(meter);return t===0?'先頭':t%bt===0?(t/bt)+'小節':t%TPB===0?(t/TPB)+'拍':t+'tick'};
 /* 目標 g={id,trk,tol,has,at:[[tick,値,許容幅]],mono:[[t0,t1,'up'|'down']],rng:[[t0,t1,min,max]],cyc:[[t0,t1,n,振れ幅(正規化)]],stp:[[t0,t1,n]],hold:[[t0,t1]]} の判定項目を並べる */
 A.goalItems=function(g){var r=[];
  if(g.has)r.push({k:'has'});
  ['at','mono','rng','cyc','stp','hold'].forEach(function(k){(g[k]||[]).forEach(function(a){r.push({k:k,a:a})})});
  return r};
 /* MT-3c: 目標が参照する tick を『小節』に直した一覧(昇順・重複なし)。N小節=N×barTicks の検査・本文との照合用。判定そのものは tick のまま(拍子に依らない) */
 A.goalBars=function(goals,meter){var bt=A.barOf(meter),o={};
  (goals||[]).forEach(function(g){A.goalItems(g).forEach(function(it){var a=it.a;if(!Array.isArray(a))return;o[a[0]/bt]=1;if(it.k!=='at')o[a[1]/bt]=1})});
  return Object.keys(o).map(Number).sort(function(x,y){return x-y})};
 function samp(l,hi,t0,t1,n){var v=[];for(var i=0;i<=n;i++)v.push(A.eval(l,t0+(t1-t0)*i/n)/hi);return v}
 function okItem(l,p,g,it){
  var hi=A.hi(p),a=it.a,v;
  switch(it.k){
   case 'has':return true;
   case 'at':{var tg=nrm(p,a[1]),tol=a[2]!=null?a[2]:(g.tol!=null?g.tol:.1);if(p.type==='seg')tol=.5/hi;return Math.abs(A.eval(l,a[0])/hi-tg)<=tol+1e-9}
   case 'mono':{v=samp(l,hi,a[0],a[1],48);var s=a[2]==='down'?-1:1,ok=s*(v[v.length-1]-v[0])>=.1;for(var i=1;i<v.length;i++)if(s*(v[i]-v[i-1])<-.03)ok=false;return ok}
   case 'rng':{v=samp(l,hi,a[0],a[1],48);var lo=Math.min(nrm(p,a[2]),nrm(p,a[3]))-.02,up=Math.max(nrm(p,a[2]),nrm(p,a[3]))+.02;return v.every(function(x){return x>=lo&&x<=up})}
   case 'cyc':{v=samp(l,hi,a[0],a[1],240);var mn=Math.min.apply(null,v),mx=Math.max.apply(null,v);if(mx-mn<a[3]-1e-9)return false;
    var mid=(mn+mx)/2,h=(mx-mn)*.25,st=v[0]>mid?1:0,n=st?1:0;for(var j=1;j<v.length;j++){if(st===0&&v[j]>mid+h){st=1;n++}else if(st===1&&v[j]<mid-h)st=0}return n>=a[2]}
   case 'stp':{var run=0,cnt=0,prev=null;for(var t=a[0];t<=a[1];t+=6){var x=A.eval(l,t)/hi;if(prev!==null&&Math.abs(x-prev)<.004)run++;else{if(run>=3)cnt++;run=0}prev=x}if(run>=3)cnt++;return cnt>=a[2]}
   case 'hold':{v=samp(l,hi,a[0],a[1],48);return Math.max.apply(null,v)-Math.min.apply(null,v)<=.05}}
  return false}
 /* au のレーンが goals をすべて満たすか。戻り値=[{g,items:[{k,a,ok}],ok}…](目標ごと) */
 A.checkAu=function(au,goals,defFn){
  return(goals||[]).map(function(g){
   var trk=g.trk==null?0:g.trk,p=defFn(trk,g.id),i=A.find(au,trk,g.id),l=i>=0?au.lanes[i]:null,live=!!(l&&!l.mute&&l.pts.length&&p);
   var items=A.goalItems(g).map(function(it){return{k:it.k,a:it.a,ok:it.k==='has'?!!(l&&!l.mute&&l.pts.length):(live&&okItem(l,p,g,it))}});
   return{g:g,items:items,ok:live&&items.every(function(x){return x.ok})}})};
 /* 目標のチップ文言(1項目1つ) */
 A.goalChips=function(g,p,meter){var f=function(v){return SD.fmt(p,v)},T=function(t){return A.tickText(t,meter)};
  return A.goalItems(g).map(function(it){var a=it.a;
   switch(it.k){
    case 'has':return p.label+' のレーンを作る';
    case 'at':return p.label+' '+T(a[0])+'で '+f(a[1]);
    case 'mono':return p.label+' '+T(a[0])+'→'+T(a[1])+' '+(a[2]==='down'?'だんだん下げる':'だんだん上げる');
    case 'rng':return p.label+' '+T(a[0])+'〜'+T(a[1])+' '+f(a[2])+'〜'+f(a[3]);
    case 'cyc':return p.label+' '+T(a[0])+'〜'+T(a[1])+' '+a[2]+'周期以上';
    case 'stp':return p.label+' '+T(a[0])+'〜'+T(a[1])+' '+a[2]+'段以上';
    case 'hold':return p.label+' '+T(a[0])+'〜'+T(a[1])+' 一定'}
   return ''})};
 /* ---- 再生エンジン ----
    io={now(),bpm(),au()→auto,def(trk,id)→つまみ定義|null,setParam(trk,id,実値,レーン値),timer:{set(fn,ms),clear(id)},ms:5}
    ▶と同時に start(t0)。位置は「経過秒×現在のBPM」を積算するので、テンポ変更でもずれない */
 A.Engine=function(io){this.io=io;this.run=false;this.pos=0;this.lastT=0;this.sent={};this.ss={};this.touch={};this.tm=null;this.cur={};this.rec=false;this.rb={}};
 var E=A.Engine.prototype;
 E.active=function(){var au=this.io.au();return!!au&&(this.rec||(au.scn&&au.scn.length>0)||au.lanes.some(function(l){return!l.mute&&l.pts.length}))};
 E.start=function(t0){
  this.run=true;this.pos=0;this.lastT=t0!=null?t0:this.io.now();this.sent={};this.ss={};this.touch={};this.cur={};this.rb={};if(this.io.sched)this.io.sched.invalidate();
  if(this.tm==null&&this.active())this.tm=this.io.timer.set(this.update.bind(this),this.io.ms||5)};
 E.stop=function(){this.flush();if(this.io.sched)this.io.sched.releaseAll();this.run=false;if(this.tm!=null){this.io.timer.clear(this.tm);this.tm=null}};
 /* 再生中にレーンが増えたときタイマーを起こす */
 E.poke=function(){if(this.run&&this.tm==null&&this.active())this.tm=this.io.timer.set(this.update.bind(this),this.io.ms||5)};
 E.grab=function(trk,id){var k=trk+':'+id;if(this.io.sched)this.io.sched.touch(trk,id);this.touch[k]={down:true,n:null,rel:0};delete this.sent[k];
  if(this.rec&&this.run&&!this.rb[k]){var au=this.io.au(),p=this.io.def(trk,id);if(au&&p&&p.auto!==false&&A.addLane(au,trk,id,this.io.def))this.rb[k]={trk:trk,id:id,raw:[],pos:this.pos}}};
 /* REC: ユーザーがつまみを動かした値(正規化 0〜1。選択式は番号)を、いまの位置で記録 */
 E.recPt=function(trk,id,n){var b=this.rb[trk+':'+id];if(!b)return;
  if(b.raw.length&&this.pos<b.pos-A.len(this.io.au())/2)this.commit(b);/* ループで巻き戻ったら区切る */
  b.pos=this.pos;b.raw.push([this.pos,n])};
 E.commit=function(b){
  var au=this.io.au(),i=au?A.find(au,b.trk,b.id):-1,p=this.io.def(b.trk,b.id);
  if(i>=0&&p&&b.raw.length){if(this.io.pre)this.io.pre();A.recWrite(au.lanes[i],b.raw,A.hi(p),p.type==='seg');this.sent={};if(this.io.changed)this.io.changed()}
  b.raw=[]};
 E.flush=function(){for(var k in this.rb){this.commit(this.rb[k]);delete this.rb[k]}};
 E.release=function(trk,id,n){var k=trk+':'+id,t=this.touch[k];if(t){t.down=false;t.n=n;t.rel=this.io.now()}var b=this.rb[k];if(b){this.commit(b);delete this.rb[k];this.poke()}};
 E.update=function(){
  if(!this.run)return;var io=this.io,now=io.now();if(now==null||now<this.lastT)return;
  var au=io.au();if(!au)return;
  var dt=now-this.lastT;this.lastT=now;
  var L=A.len(au),lp=A.cleanLp(au.lp,L);
  if(lp){var np=this.pos+dt*io.bpm()/60*TPB;if(np<lp[0])np=lp[0];this.pos=np>=lp[1]?lp[0]+(np-lp[0])%(lp[1]-lp[0]):np}else this.pos=(this.pos+dt*io.bpm()/60*TPB)%L;
  var sc=io.sched&&io.schedOn&&io.schedOn()?io.sched:null;if(sc)sc.pump(this,now);else if(io.sched&&io.sched.releaseAll&&Object.keys(io.sched.K).length)io.sched.releaseAll(now);
  /* シーン(基準)。レーンのあるつまみはレーンが上に乗るので、シーンは触らない */
  if(au.scn&&au.scn.length&&io.sc){var st=A.sceneState(io.sc(),au.scn,this.pos,io.pf,A.bar(au));
   if(st){var lk={};for(var q=0;q<au.lanes.length;q++){var z=au.lanes[q];if(!z.mute&&z.pts.length)lk[z.trk+':'+z.id]=1}
    for(var q=0;q<st.v.length;q++){var e=st.v[q],kk=e[0]+':'+e[1];if(lk[kk])continue;if(this.ss[kk]!==e[2]){this.ss[kk]=e[2];io.sceneSet(e[0],e[1],e[2])}}
    for(var q=0;q<st.m.length;q++){var mk='m'+st.m[q][0];if(this.ss[mk]!==st.m[q][1]){this.ss[mk]=st.m[q][1];io.sceneMute(st.m[q][0],st.m[q][1])}}}}
  var doQ=!!(sc&&io.setQuiet&&now-(this.qt||0)>=.033);if(doQ)this.qt=now;
  for(var i=0;i<au.lanes.length;i++){
   var l=au.lanes[i];if(l.mute||!l.pts.length)continue;
   var p=io.def(l.trk,l.id);if(!p||p.auto===false)continue;
   var key=l.trk+':'+l.id,n=A.eval(l,this.pos),tc=this.touch[key];
   if(sc&&sc.owned[key]){this.cur[key]=n;if(doQ&&!(tc&&tc.down))io.setQuiet(l.trk,l.id,A.toValue(p,n),n);delete this.sent[key];if(tc&&!tc.down&&now-tc.rel>=.3)delete this.touch[key];continue}/* SS: 先読み予約が受け持つつまみは旧方式で書かない */
   if(tc){if(tc.down)continue;var w=(now-tc.rel)/.1;if(w>=1)delete this.touch[key];else n=n*w+tc.n*(1-w)}
   var val=A.toValue(p,n);this.cur[key]=n;
   if(this.sent[key]!==val){this.sent[key]=val;io.setParam(l.trk,l.id,val,n)}}};
})();
