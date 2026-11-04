/* アディティブシンセ(v2.8: 64倍音・LAYOUT・ドローバー・MOTION・フォルマント): 正弦波(倍音)の足し算。AudioWorklet(Blob URL)で全ボイスを処理。
   同時発音数は4(鳴る倍音が多いと自動で3→2に下げる)。つまみ→実際の値は SD.ADD_DERIVE / 上限は SD.addVoiceLimit(addparams.js)を引数で受け取る(画面と共通)。
   worklet関数は外部変数を参照しないこと。AudioWorkletが無い環境は非対応(代替は作らない)。 */
SD.ADD_WORKLET=function(DERIVE,VLIM){
 var TP=Math.PI*2,NV=4,NP=64,FADE=.003,OUT=.5;
 /* 正弦波の表(4096点+1、線形補間。誤差は-120dB程度)。Math.sinより軽い */
 var TB=new Float64Array(4098),i0;for(i0=0;i0<4098;i0++)TB[i0]=Math.sin(TP*i0/4096);
 function sc(x){var a=x<0?-x:x;if(a<=.7)return x;var y=.7+.3*Math.tanh((a-.7)/.3);return x<0?-y:y}
 class A extends AudioWorkletProcessor{
  constructor(){
   super();
   var i;
   this.p={adN:32,adTilt:0,adOddEven:0,adA:.005,adD:.8,adS:.7,adR:.3,adDSlope:.4,adATilt:0,adLayout:'harm',adStretch:20,adMorph:0,adMotTarget:'off',adLfoRate:2,adLfoDepth:.5,adMotA:.01,adMotD:.6,adMotS:.4,adMotR:.3,adEgAmt:.5,adFmt:'off',adVowel:'a',adFmtShift:0,adPerc:'off',adClick:0,
    db1:8,db2:0,db3:8,db4:6,db5:0,db6:4,db7:0,db8:0,db9:2};
   this.sp=new Float64Array(NP);this.spB=new Float64Array(NP);this.dd=new Float64Array(NP);
   for(i=0;i<NP;i++){this.sp[i]=1/(i+1);this.spB[i]=(i+1)%2?1/(i+1):0}
   this.V=[];
   for(i=0;i<NV;i++)this.V.push({on:false,m:60,f:261.6,vel:1,age:0,fd:0,fl:1,pm:-1,pv:1,prel:false,rel:false,eg:0,es:0,ck:0,km:0,
    l:new Float64Array(NP),st:new Int8Array(NP),ph:new Float64Array(NP),ga:new Float64Array(NP),dg:new Float64Array(NP),tg:new Float64Array(NP),inc:new Float64Array(NP),dv:null});
   this.ctr=0;this.sn=0;this.mt=0;this.lvOn=false;this.lp=0;this.vl=4;this.vdep=false;
   this.d=null;this.ai=new Float64Array(NP);this.kd=new Float64Array(NP);this.sa=new Float64Array(NP);this.kr=0;this.sus=.7;
   this.derive();
   this.port.onmessage=e=>this.msg(e.data);
  }
  /* ブロックごとに使う値(倍音の強さ・パーシャルごとのEG係数・動きのEG・同時発音数)を作る */
  derive(){
   var p=this.p,sr=sampleRate,d=DERIVE(p,this.sp,this.dd,this.spB,0,0,0,this.d),i,vl;this.d=d;
   for(i=0;i<NP;i++){
    this.ai[i]=1/(Math.max(p.adA*d.t[i],.001)*sr);
    this.kd[i]=Math.exp(-3/(Math.max(p.adD*d.m[i],.001)*sr));
    this.sa[i]=d.s[i];
   }
   this.kr=Math.exp(-4/(Math.max(p.adR,.005)*sr));this.sus=Math.max(0,Math.min(1,p.adS));
   this.vdep=p.adFmt==='on'||p.adMotTarget==='morph'||p.adMotTarget==='tilt';
   vl=VLIM(d.cnt);if(vl!==this.vl){this.vl=vl;this.port.postMessage({t:'vl',n:vl})}
  }
  msg(d){
   var i,v,t=d.t;
   if(t==='p'){this.p[d.id]=d.v;this.derive()}
   else if(t==='sp'||t==='spB'||t==='dd'){var a=t==='sp'?this.sp:t==='spB'?this.spB:this.dd;for(i=0;i<NP;i++)a[i]=+d.a[i]||0;this.derive()}
   else if(t==='on')this.on(d.m,d.vel);
   else if(t==='off'){for(i=0;i<NV;i++){v=this.V[i];if(!v.on)continue;
     if(v.fd){if(v.pm===d.m)v.prel=true}else if(v.m===d.m&&!v.rel)this.rel(v)}}
   else if(t==='alloff'){for(i=0;i<NV;i++){v=this.V[i];if(!v.on)continue;if(v.fd)v.prel=true;else if(!v.rel)this.rel(v)}}
  }
  rel(v){v.rel=true;v.es=2;for(var i=0;i<NP;i++)v.st[i]=3}
  start(v,m,vel){
   v.on=true;v.m=m;v.f=440*Math.pow(2,(m-69)/12);v.vel=vel>1?1:vel;v.rel=false;v.age=++this.ctr;v.fd=0;v.fl=1;v.pm=-1;v.eg=0;v.es=0;v.ck=1;
   v.l.fill(0);v.st.fill(0);v.ph.fill(0);v.ga.fill(0);v.dg.fill(0);
   if(!v.dv)v.dv=DERIVE(this.p,this.sp,this.dd,this.spB,0,0,0,null);
   this.tgt(v,1,true,0,0);
   if(v.prel){v.prel=false;this.rel(v)}
  }
  /* ボイスの目標(位相の進み・倍音ごとの大きさ)。snap=trueなら現在値を目標に合わせる(発音の瞬間)。mm/mt=動き */
  tgt(v,n,snap,mm,mt){
   var p=this.p,sr=sampleRate,ny=sr*.45,f=v.f,d=this.vdep?DERIVE(p,this.sp,this.dd,this.spB,mm,mt,p.adFmt==='on'?f:0,v.dv):this.d,r=d.r,a=d.a,tg=v.tg,inc=v.inc,ga=v.ga,dg=v.dg,k,x,ss=0,nr;
   for(k=0;k<NP;k++){x=f*r[k];inc[k]=x/sr;if(r[k]>0&&x<=ny&&a[k]>1e-9){tg[k]=a[k];ss+=a[k]*a[k]}else tg[k]=0}
   nr=ss>1e-12?1/Math.sqrt(ss):0;
   for(k=0;k<NP;k++){x=tg[k]*nr;tg[k]=x;if(snap){ga[k]=x;dg[k]=0}else dg[k]=(x-ga[k])/n}
   for(k=NP-1;k>=0;k--)if(tg[k]>0||ga[k]>1e-9)break;
   v.km=k+1;
  }
  /* 発音。ボイス数の上限(this.vl)に達していたら、離した中で最も古いボイス、それも無ければ最も古いボイスを、短いフェードで奪う */
  on(m,vel){
   var i,v,f=null,best=null,c=0;vel=vel>0?vel:1;
   for(i=0;i<NV;i++){v=this.V[i];if(v.on&&!v.fd&&!v.rel&&v.m===m){f=v;break}}
   if(f){this.steal(f,m,vel);return}
   for(i=0;i<NV;i++)if(this.V[i].on)c++;
   if(c<this.vl)for(i=0;i<NV;i++)if(!this.V[i].on){this.start(this.V[i],m,vel);return}
   for(i=0;i<NV;i++){v=this.V[i];if(!v.on||v.fd)continue;
    if(!best||(v.rel&&!best.rel)||(v.rel===best.rel&&v.age<best.age))best=v}
   if(!best){for(i=0;i<NV;i++)if(!this.V[i].on){this.start(this.V[i],m,vel);return}best=this.V[0]}
   this.steal(best,m,vel);
  }
  steal(v,m,vel){if(this.sn<=0){this.sn=11000;this.port.postMessage({t:'steal'})}v.fd=1;v.pm=m;v.pv=vel;v.prel=false}
  process(ins,outs){
   var o=outs[0],L=o[0],R=o[1]||o[0],n=L.length,V=this.V,i,j,k,v,sr=sampleRate,p=this.p;
   L.fill(0);if(R!==L)R.fill(0);
   if(this.sn>0)this.sn-=n;
   var any=false,newest=null;for(i=0;i<NV;i++)if(V[i].on){any=true;if(!newest||V[i].age>newest.age)newest=V[i]}
   if(!any){if(this.lvOn){this.lvOn=false;this.port.postMessage({t:'lv',l:new Array(NP).fill(0)})}return true}
   var fdec=1/(FADE*sr),ai=this.ai,kd=this.kd,sa=this.sa,kr=this.kr,sus=this.sus,tgt=p.adMotTarget,mon=tgt==='morph'||tgt==='tilt',
    click=p.adClick>0&&p.adLayout==='drawbar'?p.adClick:0,kck=Math.exp(-1/(.006*sr)),lf=0,depth=p.adLfoDepth,eam=p.adEgAmt;
   if(mon){this.lp+=p.adLfoRate*n/sr;this.lp-=Math.floor(this.lp);lf=Math.sin(TP*this.lp)*depth}
   for(i=0;i<NV;i++){
    v=V[i];if(!v.on)continue;
    var mm=0,mt=0;
    if(mon){
     /* 動きのEG(ボイスごと・ブロック単位) */
     if(v.es===0){v.eg+=n/(Math.max(p.adMotA,.001)*sr);if(v.eg>=1){v.eg=1;v.es=1}}
     else if(v.es===1)v.eg=p.adMotS+(v.eg-p.adMotS)*Math.exp(-3*n/(Math.max(p.adMotD,.001)*sr));
     else v.eg*=Math.exp(-4*n/(Math.max(p.adMotR,.005)*sr));
     var mv=lf+v.eg*eam;if(tgt==='morph')mm=lf*.5+v.eg*eam;else mt=mv;
    }
    this.tgt(v,n,false,mm,mt);
    var l=v.l,st=v.st,ph=v.ph,ga=v.ga,dg=v.dg,tg=v.tg,inc=v.inc,gv=(.3+.7*v.vel)*OUT,km=v.km;
    for(j=0;j<n;j++){
     if(v.fd){v.fl-=fdec;if(v.fl<=0){this.start(v,v.pm,v.pv);l=v.l;st=v.st;ph=v.ph;ga=v.ga;dg=v.dg;tg=v.tg;inc=v.inc;gv=(.3+.7*v.vel)*OUT;km=v.km}}
     var sum=0,alive=false,s0,lk,pk,x,xi,g;
     for(k=0;k<km;k++){
      g=ga[k]+dg[k];ga[k]=g;pk=ph[k]+inc[k];ph[k]=pk>=1?pk-1:pk;
      if(g<=1e-9&&tg[k]===0)continue;
      s0=st[k];lk=l[k];
      if(s0===0){lk+=ai[k];if(lk>=1){lk=1;st[k]=1}}else if(s0===1)lk=sus*sa[k]+(lk-sus*sa[k])*kd[k];else lk*=kr;
      l[k]=lk;
      if(!(lk<1e-4&&(s0===3||(s0===1&&sus*sa[k]<=1e-4))))alive=true;
      if(g*lk>1e-7){x=ph[k]*4096;xi=x|0;sum+=g*lk*(TB[xi]+(TB[xi+1]-TB[xi])*(x-xi))}
     }
     if(click>0&&v.ck>1e-3){sum+=(Math.random()*2-1)*v.ck*click*.6/gv;v.ck*=kck;if(!alive&&v.ck>1e-3)alive=true}
     if(!alive){v.on=false;break}
     L[j]+=sum*gv*(v.fd?v.fl:1);
    }
   }
   for(j=0;j<n;j++){var z=sc(L[j]);L[j]=z;if(R!==L)R[j]=z}
   /* 発音中の各倍音の強さを30Hz程度で画面へ(最新のボイス。ga=正規化後の強さ×エンベロープ) */
   this.mt-=n;
   if(this.mt<=0&&newest&&newest.on){this.mt=sr/30;this.lvOn=true;var lv=new Array(NP),nl=newest.l,ng=newest.ga,nn=0;for(k=0;k<NP;k++)if(ng[k]>nn)nn=ng[k];nn=nn>1e-12?1/nn:0;for(k=0;k<NP;k++)lv[k]=nl[k]*ng[k]*nn;this.port.postMessage({t:'lv',l:lv})}
   return true;
  }
 }
 registerProcessor('sd-add',A);
};

SD.ADD=class{
 constructor(bus){this.bus=bus;this.p=Object.assign({},SD.defs.add.DEF);this.sp=SD.addPreset(this.p.adSpec);this.spB=SD.addPreset('square');this.dd=new Array(64).fill(0);this.ctx=null;this.node=null;this.ready=false;this.mode=null;this.pq=[];this.held=new Map();this.loading=false;this.lv=null;this.lvNew=false;this.vl=4}
 get id(){return 'add'}
 get params(){return SD.defs.add.P}
 get tabs(){return SD.defs.add.T}
 get unsup(){return this.ready&&this.mode!=='worklet'}
 /* 編集中のスペクトル(MOTIONタブのEDITでA/Bを切り替える) */
 cur(){return this.p.adAB==='b'?this.spB:this.sp}
 init(){
  const x=this.bus.init();
  if(this.ctx)return;
  this.ctx=x;this.out=x.createGain();this.out.connect(this.bus.input);
  this.flt=x.createBiquadFilter();this.flt.connect(this.out);
  const done=m=>{this.mode=m;this.ready=true;this.applyAll();this.postArr();this.pq.splice(0).forEach(g=>this.dispatch(g))};
  if(x.audioWorklet&&typeof AudioWorkletNode!=='undefined'){
   let pr=x.__addm2;
   if(!pr){let url=null;try{url=URL.createObjectURL(new Blob(['('+SD.ADD_WORKLET.toString()+')('+SD.ADD_DERIVE.toString()+','+SD.addVoiceLimit.toString()+')'],{type:'application/javascript'}))}catch(e){}
    if(url)pr=x.__addm2=x.audioWorklet.addModule(url)}
   if(pr){
    pr.then(()=>{
     const n=new AudioWorkletNode(x,'sd-add',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
     n.connect(this.flt);this.node=n;
     n.port.onmessage=e=>{const d=e.data;if(!d)return;if(d.t==='steal'){if(this.onSteal)this.onSteal()}else if(d.t==='lv'){this.lv=d.l;this.lvNew=true}else if(d.t==='vl'){this.vl=d.n;if(this.onVl)this.onVl(d.n)}};
     done('worklet');
    }).catch(()=>done('none'));return;
   }
  }
  done('none');
 }
 /* 音色: つまみ+配列(sp=スペクトルA 64個 / spB=スペクトルB 64個 / dd=減衰の上書き64個) */
 getPatch(){const o={};SD.defs.add.P.forEach(p=>{if(p.tab!=='top')o[p.id]=this.p[p.id]});o.sp=this.sp.slice();o.spB=this.spB.slice();o.dd=this.dd.slice();return o}
 setPatch(o){
  o=o||{};this.loading=true;
  SD.defs.add.P.forEach(p=>{if(p.tab!=='top')this.set(p.id,o[p.id]!==undefined?o[p.id]:p.def)});
  this.loading=false;this.setArr(o);
 }
 /* 配列だけを読む(不正・欠けは既定。32個(v2.7)は残りを0で埋める。spが無ければ adSpec のプリセット、spBは矩形、ddは全部自動) */
 setArr(o){
  const fit=(a,fb,lo,hi)=>{if(!Array.isArray(a)||(a.length!==32&&a.length!==64)||!a.every(v=>typeof v==='number'&&isFinite(v)))return fb;
   const r=a.map(v=>Math.max(lo,Math.min(hi,v)));while(r.length<64)r.push(0);return r};
  this.sp=fit(o&&o.sp,SD.addPreset(this.p.adSpec==='custom'?'saw':this.p.adSpec),0,1);
  this.spB=fit(o&&o.spB,SD.addPreset('square'),0,1);
  this.dd=fit(o&&o.dd,new Array(64).fill(0),0,2).map(v=>v>0?Math.max(.02,v):0);
  this.postArr();
 }
 postArr(){if(!this.ready||this.mode!=='worklet')return;const q=this.node.port;q.postMessage({t:'sp',a:this.sp});q.postMessage({t:'spB',a:this.spB});q.postMessage({t:'dd',a:this.dd})}
 /* 画面から棒を直接いじったあと(sp/spB/ddを書き換えてから呼ぶ) */
 arrChanged(){this.postArr()}
 set(id,v){
  this.p[id]=v;
  if(id==='adSpec'&&!this.loading&&v!=='custom'){if(this.p.adAB==='b')this.spB=SD.addPreset(v);else this.sp=SD.addPreset(v);this.postArr()}
  this.apply(id);
 }
 applyAll(){Object.keys(this.p).forEach(id=>this.apply(id))}
 q(){const p=this.p;return p.fType==='bandpass'?.5+p.res*14:p.res*22}
 apply(id){
  if(SD.FXIDS.indexOf(id)>=0){this.bus.set(id,this.p[id]);return}
  if(id==='fType'||id==='cutoff'||id==='res'){const f=this.flt;if(f){f.type=this.p.fType;f.frequency.value=Math.min(20000,this.p.cutoff);f.Q.value=this.q()}return}
  if(id==='adSpec'||id==='adAB')return;
  if(!this.ready||this.mode!=='worklet')return;
  this.node.port.postMessage({t:'p',id:id,v:this.p[id]});
 }
 send(m){if(this.ready)this.dispatch(m);else if(this.pq.length<64)this.pq.push(m)}
 dispatch(m){if(this.mode==='worklet')this.node.port.postMessage(m)}
 noteOn(m,vel){this.init();this.held.set(m,1);this.send({t:'on',m:m,vel:vel||1})}
 noteOff(m){if(!this.held.has(m))return;this.held.delete(m);this.send({t:'off',m:m})}
 allOff(){this.held.clear();this.pq=this.pq.filter(g=>g.t==='p');this.send({t:'alloff'})}
};
