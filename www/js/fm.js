/* FMシンセ(v2.5c: 共通フィルター接続。v2.5b: OP別EG・ベロシティ感度・フィードバック): 4オペレーターの位相変調 y=sin(2π·φ+変調)。AudioWorklet(Blob URL)で全ボイスを処理。
   アルゴリズムは表(SD.FMALGS)を引数で受け取り、エンジンは表を読むだけ。worklet関数は外部変数を参照しないこと。
   AudioWorkletが無い環境は非対応(代替は作らない)。 */
SD.FM_WORKLET=function(ALGS){
 var TP=Math.PI*2,NV=8,NO=4,FADE=.003,OUT=.5;
 /* 折り返し対策: OP周波数がナイキストの90%を超えたら滑らかに0へ(ナイキスト以上は完全に0) */
 function nyq(x){return x<=.9?1:x>=1?0:.5+.5*Math.cos(Math.PI*(x-.9)/.1)}
 /* 最終段のソフトクリップ: ±.7までは素通し、超えた分だけなめらかに1へ飽和(出力は±1以内) */
 function sc(x){var a=x<0?-x:x;if(a<=.7)return x;var y=.7+.3*Math.tanh((a-.7)/.3);return x<0?-y:y}
 class F extends AudioWorkletProcessor{
  constructor(){
   super();
   var n,i;
   this.p={fAlg:'1',fFb:0};
   for(n=1;n<=NO;n++){this.p['f'+n+'Coarse']=1;this.p['f'+n+'Fine']=0;this.p['f'+n+'Det']=0;this.p['f'+n+'Lvl']=n===1?80:0;
    this.p['f'+n+'A']=.002;this.p['f'+n+'D']=.4;this.p['f'+n+'S']=.7;this.p['f'+n+'R']=.2;this.p['f'+n+'Vel']=.5}
   this.V=[];
   for(i=0;i<NV;i++)this.V.push({on:false,m:60,f:261.6,vel:1,age:0,fd:0,fl:1,pm:-1,pv:1,prel:false,fbk:0,rel:false,
    l:new Float64Array(NO),st:new Int8Array(NO),vs:new Float64Array(NO),ph:new Float64Array(NO),ga:new Float64Array(NO),tg:new Float64Array(NO),dg:new Float64Array(NO),inc:new Float64Array(NO)});
   this.ctr=0;this.sn=0;this.alg=0;this.nCar=1;this.norm=1;this.fbk=0;
   this.ratio=new Float64Array(NO);this.gain=new Float64Array(NO);this.ms=new Int8Array(NO*3);this.mc=new Int8Array(NO);this.car=new Int8Array(NO);this.out=new Float64Array(NO);
   this.ai=new Float64Array(NO);this.kd=new Float64Array(NO);this.kr=new Float64Array(NO);this.sus=new Float64Array(NO);this.vsn=new Float64Array(NO);
   this.derive();
   this.port.onmessage=e=>this.msg(e.data);
  }
  /* つまみの値から、ブロックごとに使う値(アルゴリズムの展開・OPごとの倍率・レベル・EG係数)を作る */
  derive(){
   var p=this.p,i,k,n,a,sr=sampleRate;
   a=parseInt(p.fAlg,10);if(!(a>=1))a=1;if(a>ALGS.length)a=ALGS.length;this.alg=a-1;
   var A=ALGS[this.alg];
   this.car.fill(0);this.nCar=Math.max(1,A.c.length);for(i=0;i<A.c.length;i++)this.car[A.c[i]]=1;
   this.norm=1/Math.sqrt(this.nCar);
   /* フィードバック: OP4の前サンプルの出力を自分の位相に戻す量(ラジアン)。0=無し、7で約2rad */
   var fb=Math.max(0,Math.min(7,Math.round(p.fFb)));this.fbk=fb>0?2*(fb/7)*(fb/7):0;
   for(i=0;i<NO;i++){
    var s=A.m[i]||[];this.mc[i]=Math.min(3,s.length);for(k=0;k<this.mc[i];k++)this.ms[i*3+k]=s[k];
    n=i+1;
    this.ratio[i]=p['f'+n+'Coarse']*(1+p['f'+n+'Fine']/100)*Math.pow(2,p['f'+n+'Det']/1200);
    var l=p['f'+n+'Lvl']/100;l=l<0?0:l>1?1:l;
    /* キャリア=音量(0〜1)。モジュレーター=変調の深さ(0〜8ラジアン、指数カーブでつまみの下側が細かい) */
    this.gain[i]=this.car[i]?l:8*(Math.pow(32,l)-1)/31;
    /* OPごとのADSR(A=直線上昇、D=Sへ指数、R=指数減衰)とベロシティ感度 */
    this.ai[i]=1/(Math.max(p['f'+n+'A'],.001)*sr);this.kd[i]=Math.exp(-3/(Math.max(p['f'+n+'D'],.001)*sr));this.kr[i]=Math.exp(-4/(Math.max(p['f'+n+'R'],.005)*sr));
    this.sus[i]=p['f'+n+'S'];this.vsn[i]=Math.max(0,Math.min(1,p['f'+n+'Vel']));
   }
  }
  msg(d){
   var i,v;
   if(d.t==='p'){this.p[d.id]=d.v;this.derive()}
   else if(d.t==='on')this.on(d.m,d.vel);
   else if(d.t==='off'){for(i=0;i<NV;i++){v=this.V[i];if(!v.on)continue;
     if(v.fd){if(v.pm===d.m)v.prel=true}else if(v.m===d.m&&!v.rel)this.rel(v)}}
   else if(d.t==='alloff'){for(i=0;i<NV;i++){v=this.V[i];if(!v.on)continue;if(v.fd)v.prel=true;else if(!v.rel)this.rel(v)}}
  }
  rel(v){v.rel=true;for(var i=0;i<NO;i++)v.st[i]=3}
  /* ボイスの目標(位相の進み・OPごとの大きさ)。snap=trueなら現在値を目標に合わせる(発音の瞬間) */
  target(v,n,snap){
   var sr=sampleRate,ny=sr/2,i,f,t;
   for(i=0;i<NO;i++){
    f=v.f*this.ratio[i];v.inc[i]=f/sr;
    t=this.gain[i]*nyq(f/ny);v.tg[i]=t;
    if(snap){v.ga[i]=t;v.dg[i]=0}else v.dg[i]=(t-v.ga[i])/n;
   }
  }
  start(v,m,vel){
   v.on=true;v.m=m;v.f=440*Math.pow(2,(m-69)/12);v.vel=vel>1?1:vel;v.rel=false;v.age=++this.ctr;v.fd=0;v.fl=1;v.pm=-1;v.fbk=0;
   v.l.fill(0);v.st.fill(0);v.ph.fill(0);this.target(v,1,true);
   if(v.prel){v.prel=false;this.rel(v)}
  }
  /* 発音。空きが無ければ、離した中で最も古いボイス、それも無ければ最も古いボイスを、短いフェードで奪う */
  on(m,vel){
   var i,v,f=null,best=null;vel=vel>0?vel:1;
   for(i=0;i<NV;i++){v=this.V[i];if(v.on&&!v.fd&&!v.rel&&v.m===m){f=v;break}}
   if(f){this.steal(f,m,vel);return}
   for(i=0;i<NV;i++)if(!this.V[i].on){this.start(this.V[i],m,vel);return}
   for(i=0;i<NV;i++){v=this.V[i];if(v.fd)continue;
    if(!best||(v.rel&&!best.rel)||(v.rel===best.rel&&v.age<best.age))best=v}
   if(!best){best=this.V[0];for(i=1;i<NV;i++)if(this.V[i].age<best.age)best=this.V[i]}
   this.steal(best,m,vel);
  }
  steal(v,m,vel){if(this.sn<=0){this.sn=11000;this.port.postMessage({t:'steal'})}v.fd=1;v.pm=m;v.pv=vel;v.prel=false}
  process(ins,outs){
   var o=outs[0],L=o[0],R=o[1]||o[0],n=L.length,V=this.V,i,j,k,v;
   L.fill(0);if(R!==L)R.fill(0);
   if(this.sn>0)this.sn-=n;
   var any=false;for(i=0;i<NV;i++)if(V[i].on){any=true;break}
   if(!any)return true;
   var fdec=1/(FADE*sampleRate),out=this.out,ms=this.ms,mc=this.mc,car=this.car,norm=this.norm,ai=this.ai,kd=this.kd,kr=this.kr,sus=this.sus,vsn=this.vsn,fbk=this.fbk;
   for(i=0;i<NV;i++){
    v=V[i];if(!v.on)continue;
    this.target(v,n,false);
    var ph=v.ph,ga=v.ga,dg=v.dg,inc=v.inc,l=v.l,st=v.st;
    for(j=0;j<n;j++){
     if(v.fd){v.fl-=fdec;if(v.fl<=0){this.start(v,v.pm,v.pv);ph=v.ph;ga=v.ga;dg=v.dg;inc=v.inc;l=v.l;st=v.st}}
     /* OPごとのEG。ボイスは「全キャリアのEGが終わったとき」に解放(モジュレーターだけ残っても鳴らない) */
     var alive=false;
     for(k=0;k<NO;k++){
      var s0=st[k];
      if(s0===0){l[k]+=ai[k];if(l[k]>=1){l[k]=1;st[k]=1}}else if(s0===1)l[k]=sus[k]+(l[k]-sus[k])*kd[k];else l[k]*=kr[k];
      if(car[k]&&!(l[k]<1e-4&&(st[k]===3||(st[k]===1&&sus[k]<=1e-4))))alive=true;
     }
     if(!alive){v.on=false;break}
     var sum=0,vel=v.vel;
     for(k=NO-1;k>=0;k--){
      var ar=ph[k]*TP,c=mc[k],q;
      for(q=0;q<c;q++)ar+=out[ms[k*3+q]];
      if(k===3&&fbk>0)ar+=fbk*v.fbk;
      ph[k]+=inc[k];if(ph[k]>=1)ph[k]-=Math.floor(ph[k]);
      ga[k]+=dg[k];
      var g=ga[k];
      if(g>1e-7||g<-1e-7){
       var sn=Math.sin(ar);if(k===3)v.fbk=sn;
       /* ベロシティ感度: 0なら常に1倍、1ならベロシティそのまま(モジュレーターは変調の深さ、キャリアは音量) */
       var y=sn*g*l[k]*(1-vsn[k]*(1-vel));out[k]=y;if(car[k])sum+=y}
      else{out[k]=0;if(k===3)v.fbk=0}
     }
     L[j]+=sum*norm*(v.fd?v.fl:1)*OUT;
    }
   }
   for(j=0;j<n;j++){var z=sc(L[j]);L[j]=z;if(R!==L)R[j]=z}
   return true;
  }
 }
 registerProcessor('sd-fm',F);
};

SD.FM=class{
 constructor(bus){this.bus=bus;this.p=Object.assign({},SD.defs.fm.DEF);this.ctx=null;this.node=null;this.ready=false;this.mode=null;this.pq=[];this.held=new Map();this.posDirty=false}
 get id(){return 'fm'}
 get params(){return SD.defs.fm.P}
 get tabs(){return SD.defs.fm.T}
 get unsup(){return this.ready&&this.mode!=='worklet'}
 init(){
  const x=this.bus.init();
  if(this.ctx)return;
  this.ctx=x;this.out=x.createGain();this.out.connect(this.bus.input);
  this.flt=x.createBiquadFilter();this.flt.connect(this.out);
  const done=m=>{this.mode=m;this.ready=true;this.applyAll();this.pq.splice(0).forEach(g=>this.dispatch(g))};
  if(x.audioWorklet&&typeof AudioWorkletNode!=='undefined'){
   let pr=x.__fmm;
   if(!pr){let url=null;try{url=URL.createObjectURL(new Blob(['('+SD.FM_WORKLET.toString()+')('+JSON.stringify(SD.FMALGS)+')'],{type:'application/javascript'}))}catch(e){}
    if(url)pr=x.__fmm=x.audioWorklet.addModule(url)}
   if(pr){
    pr.then(()=>{
     const n=new AudioWorkletNode(x,'sd-fm',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
     n.connect(this.flt);this.node=n;n.port.onmessage=e=>{if(e.data&&e.data.t==='steal'&&this.onSteal)this.onSteal()};done('worklet');
    }).catch(()=>done('none'));return;
   }
  }
  done('none');
 }
 getPatch(){const o={};SD.defs.fm.P.forEach(p=>{if(p.tab!=='top')o[p.id]=this.p[p.id]});return o}
 setPatch(o){o=SD.FMMIG(o);SD.defs.fm.P.forEach(p=>{if(p.tab!=='top')this.set(p.id,o&&o[p.id]!==undefined?o[p.id]:p.def)})}
 set(id,v){this.p[id]=v;this.apply(id)}
 applyAll(){Object.keys(this.p).forEach(id=>this.apply(id))}
 q(){const p=this.p;return p.fType==='bandpass'?.5+p.res*14:p.res*22}
 apply(id){
  if(SD.FXIDS.indexOf(id)>=0){this.bus.set(id,this.p[id]);return}
  if(id==='fType'||id==='cutoff'||id==='res'){const f=this.flt;if(f){f.type=this.p.fType;f.frequency.value=Math.min(20000,this.p.cutoff);f.Q.value=this.q()}return}
  if(!this.ready||this.mode!=='worklet')return;
  this.node.port.postMessage({t:'p',id:id,v:this.p[id]});
 }
 send(m){if(this.ready)this.dispatch(m);else if(this.pq.length<64)this.pq.push(m)}
 dispatch(m){if(this.mode==='worklet')this.node.port.postMessage(m)}
 noteOn(m,vel){this.init();this.held.set(m,1);this.send({t:'on',m:m,vel:vel||1})}
 noteOff(m){if(!this.held.has(m))return;this.held.delete(m);this.send({t:'off',m:m})}
 allOff(){this.held.clear();this.pq=this.pq.filter(g=>g.t==='p');this.send({t:'alloff'})}
};
