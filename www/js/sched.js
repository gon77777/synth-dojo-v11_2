/* サンプル精度スケジュール(段階 SS): レーンの値を先読みして AudioParam.setValueCurveAtTime で予約する。
   仕様: 次期仕様書(機能拡張編)§4。表にあるつまみ(SD.AUBIND)だけ新方式、他は従来(Engine が 5ms ごとに setParam)。
   ①純粋関数(advance/planWindow/record/valueAt/cancel/laneSig) ②Runner(予約・取り消し・つなぎ替え・フォールバック) ③SD.AUBIND(対象表) */
(function(){
 var A=SD.Auto,TPB=96,DT=.001,LOOK=.08,TRIG=.0625,BLEND=.01,TCREL=.1;
 var S=SD.Sched={stats:{fallback:0,shift:0,resets:0,curves:0}};

 /* ---- 位置を1ms刻みで進める。tl={t,pos} を更新し、窓 G={t0,dt,n,pos[n+1],wrap[n+1]} を返す。
    bpmAt(pos) は位置ごとのBPM(レーンのBPMがあるとき位置で変わる)。ループ・範囲ループの巻き戻しは wrap=1 の印 ---- */
 S.advance=function(tl,tEnd,o){
  var n=Math.max(0,Math.round((tEnd-tl.t)/DT)),pos=new Float64Array(n+1),wrap=new Uint8Array(n+1),p=tl.pos,lp=o.lp,len=o.len;pos[0]=p;
  for(var i=1;i<=n;i++){
   var np=p+DT*o.bpmAt(p)/60*TPB;
   if(lp){if(np<lp[0]){np=lp[0];wrap[i]=1}if(np>=lp[1]){np=lp[0]+(np-lp[0])%(lp[1]-lp[0]);wrap[i]=1}}
   else if(np>=len){np=np%len;wrap[i]=1}
   pos[i]=np;p=np}
  var G={t0:tl.t,dt:DT,n:n,pos:pos,wrap:wrap};tl.t+=n*DT;tl.pos=p;return G};
 /* 窓の中の時刻 t の位置(補間)。窓の外は null。巻き戻しをまたぐ区間は近い側の値 */
 S.posAt=function(G,t){
  if(!G||t<G.t0||t>G.t0+G.n*G.dt+1e-12)return null;
  var f=(t-G.t0)/G.dt,i=Math.floor(f+1e-9);if(i>=G.n)return G.pos[G.n];
  var r=f-i;if(r<0)r=0;if(G.wrap[i+1])return r<.5?G.pos[i]:G.pos[i+1];
  return G.pos[i]+(G.pos[i+1]-G.pos[i])*r};

 /* ---- 窓の値を予約の列にする。rec={items,tEnd,vEnd,base,entry}。
    連続: 巻き戻しで曲線を分ける(先頭の1点だけの区間は前の窓の終点と同じなので出さない)。entry があれば保持値から10msでなじませる。
    離散(seg・ON/OFF): 変化点だけ setValueAtTime ---- */
 S.planWindow=function(rec,G,vals,disc){
  var n=G.n,t0=G.t0,dt=G.dt,ops=[],i;
  if(disc){var last=rec.vEnd==null?null:rec.vEnd;
   for(i=0;i<=n;i++)if(last===null||vals[i]!==last){ops.push({k:'s',t:t0+i*dt,v:vals[i]});last=vals[i]}
   rec.vEnd=last;rec.entry=null;return ops}
  var e=rec.entry,v=vals;
  if(e){v=Float64Array.from(vals);
   for(i=0;i<=n;i++){var w=(t0+i*dt-e.t0)/BLEND;if(w>=1)break;if(w<0)w=0;v[i]=e.v0+(v[i]-e.v0)*w}
   if(t0+n*dt>=e.t0+BLEND-1e-12)rec.entry=null}
  var a=0;
  for(i=1;i<=n+1;i++)if(i>n||G.wrap[i]){
   var b=i-1;if(b-a+1>=2){var arr=new Float32Array(b-a+1);for(var k=a;k<=b;k++)arr[k-a]=v[k];ops.push({k:'c',t:t0+a*dt,dt:(b-a)*dt,v:arr})}
   a=i}
  return ops};
 S.record=function(rec,ops){
  for(var i=0;i<ops.length;i++){var o=ops[i];rec.items.push(o);
   if(o.k==='c'){rec.tEnd=o.t+o.dt;rec.vEnd=o.v[o.v.length-1]}else{rec.tEnd=o.t;rec.vEnd=o.v}}};
 /* 予約済みの曲線から時刻 t の値を計算する(AudioParam の線形補間と同じ。実装差のある cancelAndHoldAtTime には頼らない) */
 S.valueAt=function(rec,t){
  var v=rec.base,it=rec.items;
  for(var i=0;i<it.length;i++){var x=it[i];if(x.t>t)break;
   if(x.k==='s')v=x.v;
   else if(t>=x.t+x.dt)v=x.v[x.v.length-1];
   else{var f=(t-x.t)/x.dt*(x.v.length-1),j=Math.floor(f);v=x.v[j]+(x.v[j+1]-x.v[j])*(f-j)}}
  return v};
 /* 取り消し: t の値と、cancelScheduledValues に渡す時刻(進行中の曲線があればその開始時刻)を返し、t 以降の予約の記録を捨てる */
 S.cancel=function(rec,t){
  var v=S.valueAt(rec,t),from=t,keep=[];
  for(var i=0;i<rec.items.length;i++){var x=rec.items[i];
   if(x.k==='c'){var e=x.t+x.dt;if(x.t<=t&&t<e)from=Math.min(from,x.t);if(e>t)continue}
   else if(x.t>t)continue;
   keep.push(x)}
  rec.items=keep;rec.tEnd=null;rec.vEnd=null;return{v:v,from:from}};
 S.laneSig=function(l){var s=l.mute?'m':'u',p=l.pts;for(var i=0;i<p.length;i++)s+=';'+p[i][0]+','+p[i][1]+','+p[i][2];return s};

 /* ---- Runner ----
    io={now(),sr,bind(trk,id)→[{param,map}]|null,quiet}。Engine から pump(eng,now) を呼ぶ(eng.io={au,def,bpm}・eng.touch・eng.pos・eng.run)。
    受け持っているつまみ: owned[key]=1。例外で使えなくなったつまみ: fail[key]=true(以後は旧方式) */
 var R=S.Runner=function(io){this.io=io;this.K={};this.owned={};this.fail={};this.gsig=null;this.dirty=true;this.nextSig=0};
 var P=R.prototype;
 function readV(p){var v;try{v=p.value}catch(e){}return typeof v==='number'&&isFinite(v)?v:0}
 function mkNode(nd,startT){var b=readV(nd.param);return{param:nd.param,map:nd.map,rec:{items:[],tEnd:null,vEnd:null,base:b,entry:{t0:startT,v0:b}}}}
 P.invalidate=function(){this.dirty=true};
 /* 取り消して、いまの値(曲線から計算)で止める */
 function hold(nd,now){var c=S.cancel(nd.rec,now);try{nd.param.cancelScheduledValues(c.from);nd.param.setValueAtTime(c.v,now)}catch(e){}nd.rec.base=c.v;return c.v}
 P.release=function(key,now){var K=this.K[key];if(!K)return;K.nodes.forEach(function(nd){hold(nd,now)});delete this.K[key];delete this.owned[key]};
 P.releaseAll=function(now){for(var k in this.K)this.release(k,now==null?this.io.now():now)};
 /* つまみを掴んだ: 先読みぶんの遅れを出さないため、即座に予約を捨てる */
 P.touch=function(trk,id){this.release(trk+':'+id,this.io.now())};
 /* 旧方式の書き込みの前: 曲線と重なる書き込みは例外になるので、その前に取り消す。id='*' はそのトラックの全て */
 P.pre=function(trk,id){var now=this.io.now(),pf=trk+':';for(var k in this.K)if(id==='*'?k.indexOf(pf)===0:k===pf+id)this.release(k,now)};
 function reset(K,now,eng,all){
  K.nodes.forEach(function(nd){var v=hold(nd,now);nd.rec.entry={t0:now,v0:v}});
  K.tl={t:now,pos:eng.pos};K.G=[];S.stats.resets++}
 function sameNodes(K,ns){if(K.nodes.length!==ns.length)return false;for(var i=0;i<ns.length;i++)if(K.nodes[i].param!==ns[i].param)return false;return true}
 function bpmLane(au,eio){for(var i=0;i<au.lanes.length;i++){var l=au.lanes[i];if(l.id==='sBpm'&&!l.mute&&l.pts.length){var p=eio.def(l.trk,'sBpm');if(p)return{l:l,p:p}}}return null}
 function circ(a,b,per){var d=Math.abs(a-b)%per;return Math.min(d,per-d)}
 function take(R_,key,l,p,ns,now,eng,tc){
  var st=tc?Math.max(tc.rel,now-.05):now,tps=eng.io.bpm()/60*TPB,pos=eng.pos-(now-st)*tps;if(pos<0)pos=0;
  var K={key:key,lane:l,p:p,sig:S.laneSig(l),tl:{t:st,pos:pos},G:[],tc:tc?{n:tc.n,rel:tc.rel}:null,
   nodes:ns.map(function(nd){var x=mkNode(nd,st);if(tc)x.rec.entry=null;/* 離した直後は掴んでいた値から100msでレーンへ(entry の代わり) */return x})};
  R_.K[key]=K;R_.owned[key]=1}
 /* 窓を1つ作って予約する。例外は1サンプルずらして再試行、それでも出たらそのつまみだけ旧方式へ(false を返す) */
 function applyOp(io,nd,o){
  var pm=nd.param;
  if(o.k==='s'){try{pm.setValueAtTime(o.v,o.t)}catch(e){return null}return o}
  try{pm.setValueCurveAtTime(o.v,o.t,o.dt);S.stats.curves++;return o}catch(e){}
  var sh=1/io.sr,o2={k:'c',t:o.t+sh,dt:Math.max(o.dt-sh,sh),v:o.v};
  try{pm.setValueCurveAtTime(o2.v,o2.t,o2.dt);S.stats.shift++;S.stats.curves++;return o2}catch(e){}
  return null}
 function plan(R_,K,now,eng,ctx){
  var G=S.advance(K.tl,now+LOOK,{len:ctx.L,lp:ctx.lp,bpmAt:ctx.bpmAt}),n=G.n;if(n<=0)return true;
  K.G.push(G);if(K.G.length>4)K.G.shift();
  var real=new Float64Array(n+1),tc=K.tc,i;
  for(i=0;i<=n;i++){var v=A.eval(K.lane,G.pos[i]);
   if(tc){var w=(G.t0+i*G.dt-tc.rel)/TCREL;if(w<1){if(w<0)w=0;v=v*w+tc.n*(1-w)}}
   real[i]=A.toValue(K.p,v)}
  if(tc&&G.t0+n*G.dt>=tc.rel+TCREL)K.tc=null;
  var disc=K.p.type!=='knob';
  for(var q=0;q<K.nodes.length;q++){var nd=K.nodes[q],vals=new Float64Array(n+1);
   for(i=0;i<=n;i++)vals[i]=nd.map(real[i]);
   var ops=S.planWindow(nd.rec,G,vals,disc),done=[];
   for(var j=0;j<ops.length;j++){var r=applyOp(R_.io,nd,ops[j]);if(!r){S.stats.fallback++;return false}done.push(r)}
   S.record(nd.rec,done);
   var it=nd.rec.items,cut=now-.5,m=0;while(m<it.length&&(it[m].k==='c'?it[m].t+it[m].dt:it[m].t)<cut)m++;if(m>1)it.splice(0,m-1)}
  return true}
 P.pump=function(eng,now){
  var io=this.io,eio=eng.io,au=eio.au(),k;
  if(!au||!eng.run){this.releaseAll(now);return}
  var L=A.len(au),lp=A.cleanLp(au.lp,L),bl=bpmLane(au,eio),bpm=eio.bpm();
  var gsig=L+'|'+(lp?lp[0]+','+lp[1]:'')+'|'+(bl?'L':bpm);
  var gchg=this.gsig!==null&&this.gsig!==gsig;this.gsig=gsig;
  var bpmAt=bl?function(pos){return A.toValue(bl.p,A.eval(bl.l,pos))}:function(){return bpm};
  var ctx={L:L,lp:lp,bpmAt:bpmAt},per=lp?lp[1]-lp[0]:L,tol=Math.max(2,.03*bpm/60*TPB);
  var chk=this.dirty||now>=this.nextSig;if(chk){this.dirty=false;this.nextSig=now+.05}
  var want={};
  for(var i=0;i<au.lanes.length;i++){
   var l=au.lanes[i];if(l.mute||!l.pts.length)continue;
   var p=eio.def(l.trk,l.id);if(!p||p.auto===false)continue;
   k=l.trk+':'+l.id;var tc=eng.touch[k];
   if(tc&&tc.down){this.release(k,now);continue}
   if(this.fail[k])continue;
   var ns=io.bind(l.trk,l.id);if(!ns||!ns.length){this.release(k,now);continue}
   want[k]=1;
   var K=this.K[k];
   if(!K){take(this,k,l,p,ns,now,eng,tc&&!tc.down?tc:null);continue}
   K.lane=l;K.p=p;
   if(!sameNodes(K,ns)){K.nodes.forEach(function(nd){hold(nd,now)});K.nodes=ns.map(function(nd){return mkNode(nd,now)});K.tl={t:now,pos:eng.pos};K.G=[];K.tc=null;S.stats.resets++;continue}
   for(var q=0;q<ns.length;q++)K.nodes[q].map=ns[q].map;
   if(chk){var sg=S.laneSig(l);if(sg!==K.sig){K.sig=sg;reset(K,now,eng)}}}
  for(k in this.K)if(!want[k])this.release(k,now);
  for(k in this.K){var K2=this.K[k];
   if(gchg)reset(K2,now,eng);
   else if(K2.tl.t<now-1e-9)reset(K2,now,eng);/* 先読みを使い切った(タイマーの遅れ)→今から作り直す=従来と同じ回復 */
   else{var pr=null;for(var g=K2.G.length-1;g>=0&&pr==null;g--)pr=S.posAt(K2.G[g],now);
    if(pr!=null&&circ(pr,eng.pos,per)>tol)reset(K2,now,eng)}
   if(K2.tl.t-now<TRIG){if(!plan(this,K2,now,eng,ctx)){this.fail[k]=true;this.release(k,now)}}}};

 /* ---- 対象表: つまみ → [{param,map}]。表にあるものだけ新方式。1つのつまみが複数ノードを動かすもの・JSで計算して反映するものは対象外 ---- */
 var TR={iEqHpf:['hpf','frequency'],iEqLpf:['lpf','frequency'],iEqLf:['lo','frequency'],iEqLg:['lo','gain'],
  iEqB1f:['b1','frequency'],iEqB1g:['b1','gain'],iEqB1q:['b1','Q'],iEqB2f:['b2','frequency'],iEqB2g:['b2','gain'],iEqB2q:['b2','Q'],iEqHf:['hi','frequency'],iEqHg:['hi','gain']};
 var ME={eqHpf:['hpf','frequency'],eqLpf:['lpf','frequency'],eqLo:['lo','gain'],eqMid:['mid','gain'],eqMidF:['mid','frequency'],eqMidQ:['mid','Q'],eqHi:['hi','gain']};
 var MN={master:['out','gain',function(v){return v*.8}],rvbMix:['rmix','gain',function(v){return v*1.5}],rvbPre:['pre','delayTime',function(v){return v/1000}],dlyMix:['dmix','gain',null]};
 var ID=function(v){return v},P100=function(v){return v*100},DB=function(v){return Math.pow(10,v/20)};
 /* SS-5a: 既存ワークレットの AudioWorkletNode.parameters(すべて k-rate=128サンプルごとに読む。曲線の値はブロックごとに反映されるので、旧方式の5msより細かい)。
    表の形 id:[グループ,パラメーター名,変換]。bus.js の up()/_up() が W(グループ,名前,値) で書いているものだけを、同じ変換で載せる。
    載せないもの(旧方式のまま): 切り替え(type/mode/shape/model/listen)・RATE系(同期の換算を JS が行う afRate/trRate)・drive/iSaDrive(波形カーブも JS が差し替える)・iCpMake(cpMk の計算)・SC系 */
 var WM={gtThr:['gt','threshold'],gtHold:['gt','hold'],gtRel:['gt','release'],gtRange:['gt','range'],
  saTone:['sa','tone'],saMix:['sa','mix',P100],saOut:['sa','out'],
  afCut:['af','cutoff'],afRes:['af','res'],afDepth:['af','depth'],afSens:['af','sens'],afAtk:['af','attack'],afRel:['af','release'],
  trDepth:['tr','depth'],trSpread:['tr','spread'],bcBits:['bc','bits'],bcRate:['bc','rate'],bcMix:['bc','mix'],
  rmFreq:['rm','freq'],rmMix:['rm','mix'],tsSpeed:['ts','speed'],swWidth:['sw','width'],
  mdRate:['md','rate'],mdDepth:['md','depth',P100],mdFb:['md','fb',P100],mdMix:['md','mix',P100],
  cpThr:['cp','thresh'],cpRatio:['cp','ratio'],cpAtk:['cp','attack'],cpRel:['cp','release']};
 var WT={iGtThr:['gt','threshold'],iGtHold:['gt','hold'],iGtRel:['gt','release'],iGtRange:['gt','range'],
  iCpThr:['cp','thresh'],iCpRatio:['cp','ratio'],iCpAtk:['cp','attack'],iCpRel:['cp','release'],iCpKnee:['cp','knee'],iCpMix:['cp','mix'],iCpScHpf:['cp','schpf'],
  iSaTone:['sa','tone'],iSaMix:['sa','mix',P100],iSaOut:['sa','out'],
  iDsFreq:['ds','freq'],iDsThr:['ds','thresh'],iDsAmt:['ds','amt'],
  iMdRate:['md','rate'],iMdDepth:['md','depth',P100],iMdFb:['md','fb',P100],iMdMix:['md','mix',P100]};
 var wpar=function(st,e){var g=st&&st[e[0]],w=g&&g.w,pm=w&&w.parameters&&w.parameters.get&&w.parameters.get(e[1]);return pm?[{param:pm,map:e[2]||ID}]:null};
 /* SS-5b: モジュラーのつまみ。各モジュールの builder が返す ap:{つまみ:[AudioParam,変換]} を引く(1つのつまみ=1つの AudioParam で、他のつまみと同じ AudioParam を書かないものだけ)。ラックが組み替わると nodes が新しくなり、Runner が param の違いを見て自動で張り替える */
 var mpar=function(rack,trk,id){var r=rack&&rack(trk),i=id.indexOf('.'),n=r&&r.nodes&&i>0&&r.nodes[id.slice(0,i)],a=n&&n.ap&&n.ap[id.slice(i+1)];return a&&a[0]?[{param:a[0],map:a[1]||ID}]:null};
  /* SS-5c: 新エフェクト(FX-1〜4。マスターFXラック)のつまみ。表は作らず、bus.js の up() の default が使う SD.FXMAP(id→[キー,パラメーター名,変換,smooth])をそのまま引く=書き込みと同じ変換。
     載せる=smooth が付いている連続つまみ(MB のX1/X2/THRESH/RATIO/ATTACK/RELEASE/GAIN/OUT/MIX・PS SHIFT/FINE/GRAIN/MIX・RB MIX/FEEDBACK・GL MIX・VC LO/HI/ATTACK/RELEASE/NOISE/FORMANT/MIX・SP AMOUNT/TILT/MIX)。
     載せない(旧方式のまま)=seg(ON/OFF・SOLO/MUTE・MODE・LEN・PITCH・SIZE・FREEZE・SRC・BANDS)と、smooth の付かない glProb/glRep/glRev(確率・分割数=区間ごとに読むもの)。seg の判定は FXP の type を見る(mbS/mbM は map に smooth が付いているが seg なので除外) */
  var fxe=function(id){var m=SD.FXMAP&&SD.FXMAP[id];if(!m||!m[3])return null;var d=SD.FXP&&SD.FXP.filter(function(q){return q.id===id})[0];return d&&d.type==='knob'?[m[0],m[1],m[2]]:null};
  var fxids=function(){return Object.keys(SD.FXMAP||{}).filter(function(i){return fxe(i)})};
 SD.AUBIND={IDS:{track:Object.keys(TR).concat(['tVol','tPan'],Object.keys(WT)),master:Object.keys(ME).concat(Object.keys(MN),Object.keys(WM),['cpMake'],fxids())},WM:WM,WT:WT,
  fx:fxe,
  bind:function(trk,id,bus,rack){
   if(!bus||!bus.ctx)return null;
   if(rack&&typeof id==='string'&&id.indexOf('.')>0&&trk!=='M')return mpar(rack,trk,id);
   if(trk==='M'){
    var e=ME[id];if(e){var x=bus.st&&bus.st.eq&&bus.st.eq[e[0]];return x?[{param:x[e[1]],map:ID}]:null}
    var m=MN[id];if(m){var y=bus.n&&bus.n[m[0]];return y?[{param:y[m[1]],map:m[2]||ID}]:null}
    var wm=WM[id];if(wm)return wpar(bus.st,wm);
    var fx=fxe(id);if(fx)return wpar(bus.st,fx);
    if(id==='cpMake'){var c=bus.st&&bus.st.cp;return c&&c.m&&c.m.gain?[{param:c.m.gain,map:DB}]:null}
    return null}
   if(typeof trk!=='number')return null;
   var s=bus.strips&&bus.strips[trk];if(!s)return null;
   if(id==='tVol')return s.km?null:[{param:s.vol.gain,map:SD.volGain}];/* キーとして鳴らし続けるトラックは VOL を0に固定(旧方式) */
   if(id==='tPan')return[{param:s.pan.pan,map:ID}];
   var t=TR[id];if(t){var q=s.st&&s.st.eq&&s.st.eq[t[0]];return q?[{param:q[t[1]],map:ID}]:null}
   var wt=WT[id];if(wt)return wpar(s.st,wt);
   return null}};
})();
