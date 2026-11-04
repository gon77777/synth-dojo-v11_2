/* グラニュラーシンセ(v1.1): 素材の一部を切り出した「粒」を大量にまいて重ねる。AudioWorklet(Blob URL)で処理。
   AudioWorkletが無い環境は非対応(代替は作らない)。worklet関数は外部変数を参照しないこと。 */
SD.GR_WORKLET=function(){
 var TP=Math.PI*2,NG=32,NV=4,WN=1024,OS=.6;
 var WI={hann:0,tri:1,gauss:2,rect:3},WT=[];
 (function(){var g0=Math.exp(-.5*Math.pow(.5/.16,2)),i,k;for(k=0;k<4;k++)WT.push(new Float32Array(WN+1));
  for(i=0;i<=WN;i++){var x=i/WN;WT[0][i]=.5-.5*Math.cos(TP*x);WT[1][i]=1-Math.abs(2*x-1);WT[2][i]=(Math.exp(-.5*Math.pow((x-.5)/.16,2))-g0)/(1-g0);WT[3][i]=1}
  WT[0][0]=WT[0][WN]=0;WT[1][0]=WT[1][WN]=0;WT[2][0]=WT[2][WN]=0})();
 class G extends AudioWorkletProcessor{
  constructor(){
   super();
   this.p={gPos:.3,gSize:.08,gDens:12,gSpray:.1,gPitch:0,gWin:'hann',gRoot:60,gKey:'on',gJit:0,gPRand:0,gScan:0,gFreeze:'off',lfoShape:'sine',lfoRate:5,gLfoPos:0,gLfoSize:0,gLfoPitch:0,lfoAmp:0,aA:.005,aD:.3,aS:.8,aR:.2};this.lph=0;this.lf=0;this.vc=0;
   this.mat=null;this.msr=44100;this.V=[];
   for(var i=0;i<NV;i++)this.V.push({on:false,m:60,vel:1,l:0,st:0,rel:false,age:0,cd:0,sc:0});
   this.gOn=new Uint8Array(NG);this.gPos=new Float64Array(NG);this.gStep=new Float64Array(NG);this.gT=new Int32Array(NG);this.gLen=new Int32Array(NG);
   this.gL=new Float32Array(NG);this.gR=new Float32Array(NG);this.gV=new Uint8Array(NG);this.gAge=new Float64Array(NG);this.gW=new Uint8Array(NG);this.gFd=new Uint8Array(NG);this.gF=new Float32Array(NG);
   this.aL=new Float64Array(NV);this.aR=new Float64Array(NV);
   this.ctr=0;this.rc=0;this.gc=0;this.sMin=1e9;this.sMax=-1;this.maxG=0;this.WT=WT;
   this.port.onmessage=e=>this.msg(e.data);
  }
  msg(d){
   var i,v;
   if(d.t==='p')this.p[d.id]=d.v;
   else if(d.t==='mat'){this.mat=d.data;this.msr=d.sr||44100;this.gOn.fill(0)}
   else if(d.t==='on')this.on(d.m,d.vel);
   else if(d.t==='off'){for(i=0;i<NV;i++){v=this.V[i];if(v.on&&v.m===d.m&&!v.rel)this.rel(v)}}
   else if(d.t==='alloff'){for(i=0;i<NV;i++){v=this.V[i];if(v.on&&!v.rel)this.rel(v)}}
  }
  rel(v){v.rel=true;v.st=3}
  on(m,vel){
   var f=null,i;
   for(i=0;i<NV;i++)if(!this.V[i].on){f=this.V[i];break}
   if(!f){f=this.V[0];for(i=1;i<NV;i++)if(this.V[i].age<f.age)f=this.V[i];
    for(i=0;i<NG;i++)if(this.gOn[i]&&this.gV[i]===this.V.indexOf(f))this.gFd[i]=1}
   f.on=true;f.m=m;f.vel=vel||1;f.l=0;f.st=0;f.rel=false;f.age=++this.ctr;f.cd=0;f.sc=0;
  }
  spawn(vi,v){
   var p=this.p,mat=this.mat,sr=sampleRate,g=-1,i,n=mat.length;
   for(i=0;i<NG;i++)if(!this.gOn[i]){g=i;break}
   if(g<0){var o=-1,oa=1e18;for(i=0;i<NG;i++)if(!this.gFd[i]&&this.gAge[i]<oa){oa=this.gAge[i];o=i}if(o>=0)this.gFd[o]=1;return}
   var lf=this.lf,c=p.gPos+v.sc+p.gLfoPos*.5*lf+p.gSpray*(Math.random()*2-1);if(p.gScan!==0||v.sc!==0)c-=Math.floor(c);else c=c<0?0:c>1?1:c;
   var st=c*(n-1);if(st>n-2)st=n-2;if(st<0)st=0;
   var semi=p.gPitch+p.gLfoPitch*lf+p.gPRand*(Math.random()*2-1)+(p.gKey==='on'?v.m-p.gRoot:0),sp=Math.pow(2,semi/12)*this.msr/sr;sp=sp<.0625?.0625:sp>16?16:sp;
   var pan=(Math.random()*2-1)*.35,an=(pan+1)*Math.PI/4;
   this.gOn[g]=1;this.gPos[g]=st;this.gStep[g]=sp;this.gT[g]=0;this.gLen[g]=Math.max(16,Math.round(p.gSize*Math.pow(2,p.gLfoSize*lf)*sr));
   this.gL[g]=Math.cos(an);this.gR[g]=Math.sin(an);this.gV[g]=vi;this.gAge[g]=++this.ctr;this.gW[g]=WI[p.gWin]||0;this.gFd[g]=0;this.gF[g]=1;
   if(st<this.sMin)this.sMin=st;if(st>this.sMax)this.sMax=st;
  }
  process(ins,outs){
   var o=outs[0],L=o[0],R=o[1]||o[0],n=L.length,p=this.p,mat=this.mat,sr=sampleRate,V=this.V,i,j,g,vi;
   L.fill(0);if(R!==L)R.fill(0);
   if(!mat)return true;
   var any=false;for(i=0;i<NV;i++)if(V[i].on)any=true;
   if(!any){var k=0;for(i=0;i<NG;i++)if(this.gOn[i])this.gOn[i]=0;this.gc=0;if(this.vz){this.vz=0;this.port.postMessage({t:'g',a:new Float32Array(0)})}return true}
   this.lph+=p.lfoRate*n/sr;this.lph-=Math.floor(this.lph);var ph=this.lph,sh=p.lfoShape;
   this.lf=sh==='sine'?Math.sin(TP*ph):sh==='triangle'?(ph<.5?4*ph-1:3-4*ph):sh==='sawtooth'?2*ph-1:(ph<.5?1:-1);
   var tr=(1-p.lfoAmp/2)+(p.lfoAmp/2)*this.lf;
   if(p.gFreeze!=='on'&&p.gScan!==0)for(i=0;i<NV;i++)if(V[i].on&&!V[i].rel)V[i].sc+=p.gScan*n/sr;
   var ainc=1/(Math.max(p.aA,.004)*sr),kd=Math.exp(-3/(Math.max(p.aD,.005)*sr)),kr=Math.exp(-4/(Math.max(p.aR,.01)*sr)),
       interval=sr/Math.max(1,p.gDens),jt=p.gJit,norm=OS/Math.sqrt(Math.max(1,p.gDens*p.gSize)),mn1=mat.length-1,aL=this.aL,aR=this.aR,ng=0;
   for(j=0;j<n;j++){
    for(vi=0;vi<NV;vi++){
     var v=V[vi];if(!v.on)continue;
     if(v.st===0){v.l+=ainc;if(v.l>=1){v.l=1;v.st=1}}else if(v.st===1)v.l=p.aS+(v.l-p.aS)*kd;else v.l*=kr;
     if(!v.rel){v.cd-=1;if(v.cd<=0){this.spawn(vi,v);v.cd+=interval*(1+jt*.9*(Math.random()*2-1))}}
    }
    for(vi=0;vi<NV;vi++){aL[vi]=0;aR[vi]=0}
    for(g=0;g<NG;g++){
     if(!this.gOn[g])continue;
     var t=this.gT[g],ps=this.gPos[g];
     if(t>=this.gLen[g]||ps>=mn1){this.gOn[g]=0;continue}
     var x=t/this.gLen[g]*WN,ix=x|0,w0=WT[this.gW[g]],w=w0[ix]+(w0[ix+1]-w0[ix])*(x-ix);
     if(this.gFd[g]){this.gF[g]-=1/64;if(this.gF[g]<=0){this.gOn[g]=0;continue}w*=this.gF[g]}
     var ip=ps|0,fr=ps-ip,s=(mat[ip]+(mat[ip+1]-mat[ip])*fr)*w;
     vi=this.gV[g];aL[vi]+=s*this.gL[g];aR[vi]+=s*this.gR[g];
     this.gPos[g]=ps+this.gStep[g];this.gT[g]=t+1;ng++;
    }
    for(vi=0;vi<NV;vi++){var vv=V[vi];if(!vv.on)continue;var q=vv.l*vv.vel*norm*tr;L[j]+=aL[vi]*q;R[j]+=aR[vi]*q}
   }
   for(vi=0;vi<NV;vi++){var v2=V[vi];if(v2.on&&v2.rel&&v2.l<1e-4){v2.on=false;for(g=0;g<NG;g++)if(this.gOn[g]&&this.gV[g]===vi)this.gFd[g]=1}}
   this.gc=0;for(g=0;g<NG;g++)if(this.gOn[g])this.gc++;if(this.gc>this.maxG)this.maxG=this.gc;
   this.rc+=n;if(this.rc>=1470){this.rc=0;var a=new Float32Array(this.gc*2),k2=0,mm=mat.length;
    for(g=0;g<NG;g++)if(this.gOn[g]){a[k2++]=this.gPos[g]/mm;a[k2++]=this.gT[g]/this.gLen[g]}
    this.vz=a.length>0?1:this.vz;this.port.postMessage({t:'g',a:a})}
   return true;
  }
 }
 registerProcessor('sd-gr',G);
};

SD.GR=class{
 constructor(bus){this.bus=bus;this.p=Object.assign({},SD.defs.gr.DEF);this.ctx=null;this.node=null;this.ready=false;this.mode=null;this.q=[];this.held=new Map();this.posNow=-1;this.gv=null;this.posDirty=false}
 get id(){return 'gr'}
 get params(){return SD.defs.gr.P}
 get tabs(){return SD.defs.gr.T}
 get unsup(){return this.ready&&this.mode!=='worklet'}
 /* 密度×SIZE(1ボイスあたりの同時粒数)×押している鍵の数が上限32を超えるか */
 over(){return this.p.gDens*this.p.gSize*Math.max(1,Math.min(2,this.held.size))>32}
 init(){
  const x=this.bus.init();
  if(this.ctx)return;
  this.ctx=x;this.out=x.createGain();this.flt=x.createBiquadFilter();this.out.connect(this.flt);this.flt.connect(this.bus.input);
  const done=m=>{this.mode=m;this.ready=true;this.applyAll();this.applyFlt();this.q.splice(0).forEach(g=>this.dispatch(g))};
  if(x.audioWorklet&&typeof AudioWorkletNode!=='undefined'){
   let pr=x.__grm;
   if(!pr){let url=null;try{url=URL.createObjectURL(new Blob(['('+SD.GR_WORKLET.toString()+')()'],{type:'application/javascript'}))}catch(e){}
    if(url)pr=x.__grm=x.audioWorklet.addModule(url)}
   if(pr){
    pr.then(()=>{
     const n=new AudioWorkletNode(x,'sd-gr',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
     n.connect(this.out);n.port.onmessage=e=>{if(e.data.t==='g'){this.gv=e.data.a;this.posDirty=true}};this.node=n;done('worklet');
    }).catch(()=>done('none'));return;
   }
  }
  done('none');
 }
 getPatch(){const o={};SD.defs.gr.P.forEach(p=>{if(p.tab!=='top')o[p.id]=this.p[p.id]});return o}
 setPatch(o){SD.defs.gr.P.forEach(p=>{if(p.tab!=='top')this.set(p.id,o&&o[p.id]!==undefined?o[p.id]:p.def)})}
 set(id,v){if(id==='gMat'&&!SD.MAT.info(v))v=SD.defs.gr.DEF.gMat;this.p[id]=v;this.apply(id)}
 applyAll(){Object.keys(this.p).forEach(id=>this.apply(id))}
 apply(id){
  if(SD.FXIDS.indexOf(id)>=0){this.bus.set(id,this.p[id]);return}
  if(id==='fType'||id==='cutoff'||id==='res'){this.applyFlt();return}
  if(!this.ready||this.mode!=='worklet')return;
  if(id==='gMat'){const id0=this.p.gMat,m=SD.MAT.get(id0);
   if(m){this.node.port.postMessage({t:'mat',data:m.data,sr:m.sr});return}
   if(SD.UMAT&&SD.UMAT.isU(id0)){SD.UMAT.load(id0).then(mm=>{if(this.p.gMat!==id0)return;if(!mm)this.p.gMat=SD.defs.gr.DEF.gMat;this.apply('gMat');SD.UMAT.emit()})}
   return}
  this.node.port.postMessage({t:'p',id:id,v:this.p[id]});
 }
 applyFlt(){
  const f=this.flt,p=this.p;if(!f||!f.frequency)return;
  try{f.type=p.fType;f.frequency.setTargetAtTime(Math.min(20000,p.cutoff),this.ctx.currentTime,.02);f.Q.setTargetAtTime(p.fType==='bandpass'?.5+p.res*14:p.res*22,this.ctx.currentTime,.02)}catch(e){}
 }
 send(m){if(this.ready)this.dispatch(m);else if(this.q.length<64)this.q.push(m)}
 dispatch(m){if(this.mode==='worklet')this.node.port.postMessage(m)}
 noteOn(m,vel){this.init();this.held.set(m,1);this.send({t:'on',m:m,vel:vel||1})}
 noteOff(m){if(!this.held.has(m))return;this.held.delete(m);this.send({t:'off',m:m})}
 allOff(){this.held.clear();this.q=this.q.filter(g=>g.t==='p');this.send({t:'alloff'})}
};
