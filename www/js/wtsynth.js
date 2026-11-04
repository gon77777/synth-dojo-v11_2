/* ウェーブテーブルシンセ。AudioWorklet(Blob URL)で全ボイスを処理。使えない環境ではPeriodicWave+クロスフェードで代替。
   worklet関数は外部変数を参照しないこと(文字列化してBlobに入れるため) */
SD.WT_WORKLET=function(){
 var N=2048,NF=64,NL=11,SB=32,TP=Math.PI*2,OS=.3;
 function lfoV(sh,ph){return sh==='sine'?Math.sin(TP*ph):sh==='triangle'?(ph<.5?4*ph-1:3-4*ph):sh==='sawtooth'?2*ph-1:(ph<.5?1:-1)}
 function adv(e,A,D,S,R,len){
  if(e.st===0){e.l+=len/(Math.max(A,.004)*sampleRate);if(e.l>=1){e.l=1;e.st=1}}
  else if(e.st===1)e.l=S+(e.l-S)*Math.exp(-3*len/(Math.max(D,.005)*sampleRate));
  else e.l*=Math.exp(-4*len/(Math.max(R,.01)*sampleRate));
 }
 class W extends AudioWorkletProcessor{
  constructor(){
   super();
   this.p={wPos:.67,wOct:0,wSemi:0,wFine:0,wWarpT:'none',wWarp:0,wSub:0,wNoise:0,uVoices:1,uDetune:20,uSpread:.5,uBlend:.5,fType:'lowpass',cutoff:20000,res:0,envAmt:0,keyTrack:0,aA:.005,aD:.3,aS:.8,aR:.2,fA:.005,fD:.3,fS:.3,fR:.2,peA:.005,peD:.3,peS:0,peR:.2,peAmt:0,lfoShape:'sine',lfoRate:5,lfoPos:0,lfoPitch:0,lfoFilter:0,lfoAmp:0};
   this.tab=null;this.V=[];
   for(var i=0;i<8;i++)this.V.push({on:false,ph:new Float64Array(5),sub:0,ae:{l:0,st:0},fe:{l:0,st:0},pe:{l:0,st:0},fz:new Float64Array(8),m:0,vel:1,age:0,rel:false,kf:1,kill:false,pos:0});
   this.lph=0;this.ctr=0;this.rc=0;
   this.inc=new Float64Array(5);this.wl=new Float64Array(5);this.wr=new Float64Array(5);this.gl=new Float64Array(5);this.w0=new Float64Array(5);this.bA=new Int32Array(5);this.bB=new Int32Array(5);
   this.port.onmessage=e=>this.msg(e.data);
  }
  msg(d){
   var V=this.V,i,v;
   if(d.t==='p')this.p[d.id]=d.v;
   else if(d.t==='tab')this.tab=d.data;
   else if(d.t==='on')this.on(d.m,d.vel);
   else if(d.t==='off'){for(i=0;i<V.length;i++){v=V[i];if(v.on&&v.m===d.m&&!v.rel&&!v.kill)this.rel(v)}}
   else if(d.t==='alloff'){for(i=0;i<V.length;i++){v=V[i];if(v.on&&!v.rel&&!v.kill)this.rel(v)}}
  }
  rel(v){v.rel=true;v.ae.st=3;v.fe.st=3;v.pe.st=3}
  on(m,vel){
   var V=this.V,act=[],i,v,f=null;
   for(i=0;i<V.length;i++){v=V[i];if(v.on&&!v.kill){if(v.m===m&&!v.rel)v.kill=true;else act.push(v)}}
   var mx=Math.min(6,Math.floor(24/Math.max(1,this.p.uVoices|0)));
   act.sort((a,b)=>a.age-b.age);
   while(act.length>=mx)act.shift().kill=true;
   for(i=0;i<V.length;i++)if(!V[i].on){f=V[i];break}
   if(!f){f=V[0];for(i=1;i<V.length;i++)if(V[i].age<f.age)f=V[i]}
   f.on=true;f.m=m;f.vel=vel||1;f.age=++this.ctr;f.rel=false;f.kill=false;f.kf=1;f.sub=0;
   for(i=0;i<5;i++)f.ph[i]=i?Math.random():0;
   f.ae.l=0;f.ae.st=0;f.fe.l=0;f.fe.st=0;f.pe.l=0;f.pe.st=0;f.fz.fill(0);f.pos=this.p.wPos;
  }
  process(ins,outs){
   var o=outs[0],L=o[0],R=o[1]||o[0],n=L.length,p=this.p,tab=this.tab,sr=sampleRate,V=this.V;
   L.fill(0);if(R!==L)R.fill(0);
   if(!tab)return true;
   var inc=this.inc,wl=this.wl,wr=this.wr,bA=this.bA,bB=this.bB;
   for(var s0=0;s0<n;s0+=SB){
    var len=Math.min(SB,n-s0);
    this.lph+=p.lfoRate*len/sr;this.lph-=Math.floor(this.lph);
    var lf=lfoV(p.lfoShape,this.lph),U=Math.max(1,Math.min(5,p.uVoices|0)),
        ainc=1/(Math.max(p.aA,.004)*sr),kd=Math.exp(-3/(Math.max(p.aD,.005)*sr)),kr=Math.exp(-4/(Math.max(p.aR,.01)*sr)),kk=Math.exp(-1/(.012*sr)),
        tr=(1-p.lfoAmp/2)+(p.lfoAmp/2)*lf,
        wT=p.wWarpT,wp=p.wWarp,wm=wT==='sync'?1+wp*7:wT==='bend'?1+wp*3:1,
        bp=p.fType==='bandpass',lp=p.fType==='lowpass',Qv=bp?.5+p.res*14:p.res*22,
        sub=p.wSub,nz=p.wNoise;
    var ws=0,u;
    for(u=0;u<U;u++){var oo=U>1?(u/(U-1))*2-1:0,ao=Math.abs(oo),w=.2+.8*((1-p.uBlend)*(1-ao)+p.uBlend*ao);this.w0[u]=w;ws+=w*w}
    var nrm=1/Math.sqrt(ws);
    for(var vi=0;vi<V.length;vi++){
     var v=V[vi];if(!v.on)continue;
     var pos=p.wPos+lf*p.lfoPos*.5+p.peAmt*v.pe.l;pos=pos<0?0:pos>1?1:pos;v.pos=pos;
     var fp=pos*(NF-1),fa=Math.floor(fp),fr=fp-fa,fb=Math.min(NF-1,fa+1);
     var f0=440*Math.pow(2,((v.m-69)+p.wOct*12+p.wSemi+p.wFine/100+lf*p.lfoPitch)/12);
     for(u=0;u<U;u++){
      var o2=U>1?(u/(U-1))*2-1:0,pan=o2*p.uSpread,an=(pan+1)*Math.PI/4;
      inc[u]=f0*Math.pow(2,o2*p.uDetune/1200)/sr;
      var al=.5/(inc[u]*wm),lv=Math.round(Math.log(1024/Math.max(al,1))/Math.LN2);lv=lv<0?0:lv>NL-1?NL-1:lv;
      bA[u]=(lv*NF+fa)*N;bB[u]=(lv*NF+fb)*N;
      wr[u]=this.w0[u]*nrm*Math.sin(an);this.gl[u]=this.w0[u]*nrm*Math.cos(an);
     }
     var cf=p.cutoff*Math.pow(2,p.envAmt*v.fe.l+p.keyTrack*(v.m-60)/12+p.lfoFilter*lf);
     cf=cf<20?20:cf>sr*.45?sr*.45:cf;
     var w0=TP*cf/sr,cs=Math.cos(w0),sn=Math.sin(w0),b0,b1,b2,al2;
     if(bp){al2=sn/(2*Qv);b0=al2;b1=0;b2=-al2}
     else{al2=sn/(2*Math.pow(10,Qv/20));if(lp){b0=(1-cs)/2;b1=1-cs;b2=b0}else{b0=(1+cs)/2;b1=-(1+cs);b2=b0}}
     var a0=1+al2,a1=-2*cs/a0,a2=(1-al2)/a0;b0/=a0;b1/=a0;b2/=a0;
     var fz=v.fz,ph=v.ph,ae=v.ae,gain=v.vel*tr*OS,sph=f0*.5/sr;
     for(var j=0;j<len;j++){
      if(ae.st===0){ae.l+=ainc;if(ae.l>=1){ae.l=1;ae.st=1}}
      else if(ae.st===1)ae.l=p.aS+(ae.l-p.aS)*kd;
      else ae.l*=kr;
      if(v.kill){v.kf*=kk}
      var sl=0,srr=0;
      for(u=0;u<U;u++){
       var q=ph[u]+inc[u];if(q>=1)q-=1;ph[u]=q;
       if(wT==='bend')q=Math.pow(q,1+wp*3);else if(wT==='sync'){q*=wm;q-=Math.floor(q)}
       var ix=q*N,i0=ix|0,fx=ix-i0,i1=(i0+1)&(N-1),
           a=tab[bA[u]+i0]*(1-fx)+tab[bA[u]+i1]*fx,b=tab[bB[u]+i0]*(1-fx)+tab[bB[u]+i1]*fx,sm=a+(b-a)*fr;
       sl+=sm*this.gl[u];srr+=sm*wr[u];
      }
      if(sub>0){v.sub+=sph;if(v.sub>=1)v.sub-=1;var sx=Math.sin(TP*v.sub)*sub*.6;sl+=sx;srr+=sx}
      if(nz>0){var nx=(Math.random()*2-1)*nz*.5;sl+=nx;srr+=nx}
      var yl=b0*sl+b1*fz[0]+b2*fz[1]-a1*fz[2]-a2*fz[3];fz[1]=fz[0];fz[0]=sl;fz[3]=fz[2];fz[2]=yl;
      var yr=b0*srr+b1*fz[4]+b2*fz[5]-a1*fz[6]-a2*fz[7];fz[5]=fz[4];fz[4]=srr;fz[7]=fz[6];fz[6]=yr;
      var g=ae.l*gain*v.kf;
      L[s0+j]+=yl*g;R[s0+j]+=yr*g;
     }
     adv(v.fe,p.fA,p.fD,p.fS,p.fR,len);adv(v.pe,p.peA,p.peD,p.peS,p.peR,len);
     if((v.rel&&ae.l<1e-4)||v.kf<.001){v.on=false}
    }
   }
   this.rc+=n;
   if(this.rc>=2048){this.rc=0;var nv=null;for(var k=0;k<V.length;k++){if(V[k].on&&!V[k].kill&&(!nv||V[k].age>nv.age))nv=V[k]}this.port.postMessage({t:'pos',v:nv?nv.pos:-1})}
   return true;
  }
 }
 registerProcessor('sd-wt',W);
};

SD.WT=class{
 constructor(bus){this.bus=bus;this.p=Object.assign({},SD.defs.wt.DEF);this.ctx=null;this.node=null;this.ready=false;this.mode=null;this.q=[];
  this.user=JSON.parse(JSON.stringify(SD.WTD.USER_DEFAULT));this.uv=0;this.ut=0;this.held=new Map();this.tab=null;this.tabId=null;this.posNow=-1;this.posDirty=false;this.fv=new Map();this.pwc={};this.smp={st:'idle',prog:0,msg:'',key:'',info:null};this.sh=null;this.posted=null;this.fixedMat=null}
 get id(){return 'wt'}
 get params(){return SD.defs.wt.P}
 get tabs(){return SD.defs.wt.T}
 q_(){const p=this.p;return p.fType==='bandpass'?.5+p.res*14:p.res*22}
 ensureTab(){
  if(this.p.wTable==='sample'&&SD.SWT)return this.ensureSmp();
  const key=this.p.wTable==='user'?'user:'+this.uv:this.p.wTable;
  if(this.tabId!==key){this.smpStop();this.tab=SD.WTD.get(this.p.wTable==='sample'?'basic':this.p.wTable,this.user);this.tabId=key;this.pwc={}}return this.tab}
 /* ---- サンプル由来テーブル(v2.2): 変換は非同期。完了するまでは直前のテーブルが鳴り続ける ---- */
 sKey(){return SD.SWT.key(SD.SWT.optsFrom(this.p))}
 ensureSmp(){
  const sk=this.sKey();
  if(this.tabId==='s:'+sk)return this.tab;
  const hit=SD.SWT.peek(sk,this.p.wsMat);
  if(hit){this.smpStop();this.smpTake(hit);this.postTab();return this.tab}
  if(!this.tab){this.tab=SD.WTD.get('basic');this.tabId='basic'}
  this.smpSched(0);return this.tab}
 smpTake(res){this.tab=res.table;this.tabId='s:'+res.key;this.pwc={};this.smp={st:'done',prog:1,msg:'',key:res.key,info:res.info}}
 smpStop(){if(this.sh){this.sh.h.cancel();this.sh=null}if(this.smp.st==='wait'||this.smp.st==='run')this.smp={st:'idle',prog:0,msg:'',key:'',info:null}}
 smpSched(delay){
  const sk=this.sKey();
  if(this.sh&&this.sh.key===sk)return;
  if(this.smp.st==='err'&&this.smp.key===sk)return;
  if(this.sh){this.sh.h.cancel();this.sh=null}
  this.smp={st:'wait',prog:0,msg:'',key:sk,info:this.smp.info};this.posDirty=true;
  this.sh={key:sk,h:SD.SWT.request(SD.SWT.optsFrom(this.p),{
   prog:pr=>{this.smp.st='run';this.smp.prog=pr;this.posDirty=true},
   done:res=>this.smpDone(sk,res)},delay)};
 }
 smpDone(sk,res){
  if(!this.sh||this.sh.key!==sk)return;this.sh=null;this.posDirty=true;
  if(res.err){
   /* 素材が無い(削除済み・この端末に無い)ときは既定の素材に戻して作り直す。戻した事実は fixedMat で画面に伝える */
   if(res.err.code==='nomat'&&this.p.wTable==='sample'&&this.sKey()===sk&&this.p.wsMat!==SD.defs.wt.DEF.wsMat){this.fixMat();return}
   this.smp={st:'err',prog:0,msg:res.err.msg,key:sk,info:null};return}
  if(this.p.wTable!=='sample'||this.sKey()!==sk)return;
  this.smpTake(res);this.postTab();
 }
 fixMat(){const bad=this.p.wsMat;this.p.wsMat=SD.defs.wt.DEF.wsMat;this.fixedMat=bad;this.smp={st:'idle',prog:0,msg:'',key:'',info:null};this.posDirty=true;this.smpSched(0)}
 postTab(){if(this.ready&&this.mode==='worklet'&&this.tab&&this.posted!==this.tab){this.node.port.postMessage({t:'tab',data:this.tab.levels});this.posted=this.tab}}
 /* 自作テーブルの倍音(a=始点 b=終点, 各32本 0〜1)。now=falseなら少し待ってから作り直す(スライダー操作中の負荷対策) */
 setUser(u,mode){
  const cl=a=>Array.from({length:32},(_,i)=>{const v=+(a&&a[i]);return isFinite(v)?Math.max(0,Math.min(1,v)):0});
  this.user={a:cl(u&&u.a),b:cl(u&&u.b)};this.uv++;clearTimeout(this.ut);
  if(mode==='quiet'||this.p.wTable!=='user')return;
  const go=()=>{this.apply('wTable');this.posDirty=true};
  if(mode==='now')go();else this.ut=setTimeout(go,180);
 }
 frame(f,lv){const t=this.ensureTab(),o=((lv||0)*t.NF+f)*t.N;return t.levels.subarray(o,o+t.N)}
 init(){
  const x=this.bus.init();
  if(this.ctx)return;
  this.ctx=x;this.out=x.createGain();this.out.connect(this.bus.input);
  this.ensureTab();
  const done=m=>{this.mode=m;this.ready=true;this.posted=null;this.applyAll();this.q.splice(0).forEach(g=>this.dispatch(g))};
  if(x.audioWorklet&&typeof AudioWorkletNode!=='undefined'){
   let pr=x.__wtm;
   if(!pr){let url=null;try{url=URL.createObjectURL(new Blob(['('+SD.WT_WORKLET.toString()+')()'],{type:'application/javascript'}))}catch(e){}
    if(url)pr=x.__wtm=x.audioWorklet.addModule(url)}
   if(pr){
    pr.then(()=>{
     const n=new AudioWorkletNode(x,'sd-wt',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
     n.connect(this.out);n.port.onmessage=e=>{if(e.data.t==='pos'&&e.data.v!==this.posNow){this.posNow=e.data.v;this.posDirty=true}};
     this.node=n;done('worklet');
    }).catch(()=>done('fallback'));return;
   }
  }
  done('fallback');
 }
 getPatch(){const o={};SD.defs.wt.P.forEach(p=>{if(p.tab!=='top')o[p.id]=this.p[p.id]});o.user={a:this.user.a.slice(),b:this.user.b.slice()};return o}
 setPatch(o){this.setUser(o&&o.user||SD.WTD.USER_DEFAULT,'quiet');SD.defs.wt.P.forEach(p=>{if(p.tab!=='top')this.set(p.id,o&&o[p.id]!==undefined?o[p.id]:p.def)})}
 set(id,v){this.p[id]=v;this.apply(id)}
 applyAll(){Object.keys(this.p).forEach(id=>this.apply(id))}
 apply(id){
  if(SD.FXIDS.indexOf(id)>=0){this.bus.set(id,this.p[id]);return}
  if(id==='wTable'){this.ensureTab();this.postTab();return}
  if(/^ws[A-Z]/.test(id)){if(this.p.wTable==='sample'&&SD.SWT)this.smpSched(300);return}
  if(this.ready&&this.mode==='worklet')this.node.port.postMessage({t:'p',id:id,v:this.p[id]});
 }
 send(m){if(this.ready)this.dispatch(m);else if(this.q.length<64)this.q.push(m)}
 dispatch(m){if(this.mode==='worklet')this.node.port.postMessage(m);else this.fb(m)}
 noteOn(m,vel){this.init();this.held.set(m,1);this.send({t:'on',m:m,vel:vel||1})}
 noteOff(m){if(!this.held.has(m))return;this.held.delete(m);this.send({t:'off',m:m})}
 allOff(){this.held.clear();this.q=this.q.filter(g=>g.t==='p');this.send({t:'alloff'})}

 /* ---- フォールバック(PeriodicWave。POSITIONは鍵盤を押した時点の値で固定、WARP/SUB/NOISE/LFOは無効) ---- */
 pw(k){
  if(!this.pwc[k]){const h=SD.WTD.harm(this.frame(k,0));this.pwc[k]=this.ctx.createPeriodicWave(h.real,h.imag)}
  return this.pwc[k];
 }
 fb(m){
  if(m.t==='on')this.fbOn(m.m,m.vel);
  else if(m.t==='off'){const v=this.fv.get(m.m);if(v){this.fv.delete(m.m);this.fbRel(v,false)}}
  else if(m.t==='alloff'){this.fv.forEach(v=>this.fbRel(v,false));this.fv.clear()}
 }
 fbOn(m,vel){
  const x=this.ctx,p=this.p,t=x.currentTime+.003;
  if(this.fv.has(m))this.fbRel(this.fv.get(m),true);
  const U=p.uVoices,pos=p.wPos*63,fa=Math.min(63,Math.floor(pos)),fr=pos-fa,fb=Math.min(63,fa+1),
   f=x.createBiquadFilter(),amp=x.createGain(),v={m:m,os:[],f:f,amp:amp},fq=440*Math.pow(2,(m-69)/12);
  f.type=p.fType;f.Q.value=this.q_();f.frequency.value=Math.min(20000,p.cutoff);
  f.detune.value=(m-60)*100*p.keyTrack;
  const A=Math.max(.004,p.aA),FA=Math.max(.004,p.fA);
  amp.gain.setValueAtTime(0,t);amp.gain.linearRampToValueAtTime(vel||1,t+A);amp.gain.setTargetAtTime((vel||1)*p.aS,t+A,Math.max(.005,p.aD)/3);
  v.base=f.detune.value;
  f.detune.setValueAtTime(v.base,t);f.detune.linearRampToValueAtTime(v.base+p.envAmt*1200,t+FA);f.detune.setTargetAtTime(v.base+p.envAmt*1200*p.fS,t+FA,Math.max(.005,p.fD)/3);
  let ws=0;const w=[];for(let u=0;u<U;u++){const o=U>1?u/(U-1)*2-1:0,a=Math.abs(o),k=.2+.8*((1-p.uBlend)*(1-a)+p.uBlend*a);w.push(k);ws+=k*k}
  for(let u=0;u<U;u++){
   const o=U>1?u/(U-1)*2-1:0,pn=x.createStereoPanner?x.createStereoPanner():null;
   if(pn)pn.pan.value=o*p.uSpread;
   [fa,fb].forEach((k,i)=>{
    const os=x.createOscillator(),g=x.createGain();os.setPeriodicWave(this.pw(k));os.frequency.value=fq;
    os.detune.value=p.wOct*1200+p.wSemi*100+p.wFine+o*p.uDetune;
    g.gain.value=.3*w[u]/Math.sqrt(ws)*(i?fr:1-fr);
    os.connect(g);g.connect(pn||f);os.start(t);v.os.push(os);if(pn)pn.connect(f);
   });
  }
  f.connect(amp);amp.connect(this.out);this.fv.set(m,v);
 }
 fbRel(v,fast){
  const x=this.ctx,t=x.currentTime,r=fast?.04:Math.max(.01,this.p.aR);
  const a=v.amp.gain,cur=a.value;a.cancelScheduledValues(t);a.setValueAtTime(cur,t);a.setTargetAtTime(0,t,r/4);
  const end=t+r*1.4+.05;v.os.forEach(o=>{try{o.stop(end)}catch(e){}});
  v.os[0]&&(v.os[0].onended=()=>{[v.f,v.amp].forEach(n=>{try{n.disconnect()}catch(e){}})});
 }
};
