SD.Synth=class{
 constructor(bus){this.bus=bus;this.p=Object.assign({},SD.DEF);this.ctx=null;this.n=null;this.voices=new Set();this.held=new Map();}

 get id(){return 'analog'}
 get params(){return SD.P}
 get tabs(){return SD.T}
 init(){
  const x=this.bus.init();
  if(this.n)return;
  this.ctx=x;
  const G=()=>x.createGain(),bus=G(),trem=G();
  bus.connect(trem);trem.connect(this.bus.input);
  const lfo=x.createOscillator(),lp=G(),lf=G(),la=G();
  lfo.connect(lp);lfo.connect(lf);lfo.connect(la);la.connect(trem.gain);lfo.start();
  const nb=x.createBuffer(1,x.sampleRate*2,x.sampleRate),d=nb.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  this.nb=nb;this.n={bus,trem,lfo,lp,lf,la};
  this.applyAll();
 }
 getPatch(){const o={};SD.P.forEach(p=>{if(p.tab!=='top')o[p.id]=this.p[p.id]});return o;}
 setPatch(o){SD.P.forEach(p=>{if(p.tab!=='top')this.set(p.id,o&&o[p.id]!==undefined?o[p.id]:p.def)});}

 set(id,v){this.p[id]=v;this.apply(id);}
 applyAll(){Object.keys(this.p).forEach(id=>this.apply(id));}

 apply(id){
  if(SD.FXIDS.indexOf(id)>=0){this.bus.set(id,this.p[id]);return;}
  if(!this.ctx)return;
  const x=this.ctx,t=x.currentTime,v=this.p[id],n=this.n,S=(a,val)=>a.setTargetAtTime(val,t,.02);
  switch(id){
   case 'lfoRate':S(n.lfo.frequency,v);break;
   case 'lfoShape':n.lfo.type=v;break;
   case 'lfoPitch':S(n.lp.gain,v*100);break;
   case 'lfoFilter':S(n.lf.gain,v*1200);break;
   case 'lfoAmp':S(n.la.gain,v/2);S(n.trem.gain,1-v/2);break;
   case 'aA':case 'aD':case 'aS':case 'aR':case 'fA':case 'fD':case 'fS':case 'fR':case 'pAmt':case 'pDec':case 'envAmt':case 'keyTrack':break;
   default:this.voices.forEach(v=>this.paint(v,false));
  }
 }

 q(){const p=this.p;return p.fType==='bandpass'?.5+p.res*14:p.res*22;}

 paint(v,imm){
  const x=this.ctx,t=x.currentTime,p=this.p,T=.012;
  const sv=(a,val,tc)=>{if(imm)a.value=val;else a.setTargetAtTime(val,t,tc||T);};
  v.o1.type=p.o1Wave;v.o2.type=p.o2Wave;
  v.o1.detune.value=p.o1Oct*1200;
  v.o2.detune.value=p.o1Oct*1200+p.o2Semi*100+p.o2Fine;
  v.sub.detune.value=p.o1Oct*1200-1200;
  sv(v.g1.gain,p.o1Lvl);sv(v.g2.gain,p.o2Lvl);sv(v.gs.gain,p.subLvl);sv(v.gn.gain,p.noiseLvl);
  v.f.type=p.fType;sv(v.f.frequency,p.cutoff,.015);sv(v.f.Q,this.q(),.015);sv(v.nh.frequency,p.nHP,.015);
 }

 pf(o,fr,t){
  const p=this.p;
  if(p.pAmt!==0){o.frequency.setValueAtTime(fr*Math.pow(2,p.pAmt/12),t);o.frequency.setTargetAtTime(fr,t,Math.max(.002,p.pDec/3));}
  else o.frequency.setValueAtTime(fr,t);
 }

 noteOn(m,vel,from){
  this.init();
  vel=vel||1;
  const x=this.ctx,p=this.p,t=x.currentTime+.003,N=this.n,G=()=>x.createGain();
  if(this.held.has(m))this.kill(this.held.get(m));
  while(this.voices.size>=12)this.kill(this.voices.values().next().value);
  const f=440*Math.pow(2,(m-69)/12),v={m:m};
  const mkO=type=>{const o=x.createOscillator();o.type=type;this.pf(o,f,t);N.lp.connect(o.detune);return o;};
  v.o1=mkO(p.o1Wave);v.o2=mkO(p.o2Wave);v.sub=mkO('sine');
  /* スライド: 直前の音程から滑らかに移る(from=直前のMIDI番号。ピッチEGが無いときのみ) */
  const fm=from!=null?from:(p.glide>0&&this.last!=null&&this.last!==m?this.last:null),gtc=from!=null?.025:Math.max(.005,p.glide/3);
  if(fm!=null&&p.pAmt===0){const ff=440*Math.pow(2,(fm-69)/12);[v.o1,v.o2,v.sub].forEach(o=>{o.frequency.setValueAtTime(ff,t);o.frequency.setTargetAtTime(f,t,gtc)})}
  this.last=m;
  v.g1=G();v.g2=G();v.gs=G();v.gn=G();
  v.nz=x.createBufferSource();v.nz.buffer=this.nb;v.nz.loop=true;
  v.nh=x.createBiquadFilter();v.nh.type='highpass';v.nh.Q.value=.7;
  v.mix=G();v.mix.gain.value=.3;v.f=x.createBiquadFilter();v.amp=G();v.amp.gain.value=0;
  v.o1.connect(v.g1);v.o2.connect(v.g2);v.sub.connect(v.gs);v.nz.connect(v.nh);v.nh.connect(v.gn);
  [v.g1,v.g2,v.gs,v.gn].forEach(g=>g.connect(v.mix));
  v.mix.connect(v.f);v.f.connect(v.amp);v.amp.connect(N.bus);
  N.lf.connect(v.f.detune);
  this.paint(v,true);
  // amp envelope
  const a=v.amp.gain,A=Math.max(.004,p.aA);
  const nb=Math.max(1,Math.round(p.aBurst)),bg=.012;let t0=t;
  for(let i=0;i<nb-1;i++){const ti=t+i*bg;a.setValueAtTime(0,ti);a.linearRampToValueAtTime(vel,ti+.001);a.linearRampToValueAtTime(0,ti+bg*.9)}
  t0=t+(nb-1)*bg;a.setValueAtTime(0,t0);a.linearRampToValueAtTime(vel,t0+A);a.setTargetAtTime(vel*p.aS,t0+A,Math.max(.005,p.aD)/3);
  // filter envelope (on detune, in cents)
  v.base=(m-60)*100*p.keyTrack;
  const fd=v.f.detune,peak=v.base+p.envAmt*1200,sus=v.base+p.envAmt*1200*p.fS,FA=Math.max(.004,p.fA);
  fd.setValueAtTime(v.base,t);fd.linearRampToValueAtTime(peak,t+FA);fd.setTargetAtTime(sus,t+FA,Math.max(.005,p.fD)/3);
  v.o1.start(t);v.o2.start(t);v.sub.start(t);v.nz.start(t,Math.random()*1.5);
  v.o1.onended=()=>this.cleanup(v);
  this.voices.add(v);this.held.set(m,v);
 }

 noteOff(m){const v=this.held.get(m);if(!v)return;this.held.delete(m);this.rel(v,false);}
 kill(v){if(this.held.get(v.m)===v)this.held.delete(v.m);this.rel(v,true);}
 allOff(){this.held.forEach(v=>this.rel(v,false));this.held.clear();}

 rel(v,fast){
  if(v.rel)return;v.rel=true;
  const x=this.ctx,t=x.currentTime,p=this.p,r=fast?.04:Math.max(.01,p.aR);
  const a=v.amp.gain,cur=a.value;a.cancelScheduledValues(t);a.setValueAtTime(cur,t);a.setTargetAtTime(0,t,r/4);
  if(!fast){const fd=v.f.detune,fc=fd.value;fd.cancelScheduledValues(t);fd.setValueAtTime(fc,t);fd.setTargetAtTime(v.base,t,Math.max(.01,p.fR)/4);}
  const end=t+r*1.4+.05;
  [v.o1,v.o2,v.sub,v.nz].forEach(o=>{try{o.stop(end)}catch(e){}});
 }

 cleanup(v){
  this.voices.delete(v);
  if(this.held.get(v.m)===v)this.held.delete(v.m);
  try{[v.o1,v.o2,v.sub].forEach(o=>this.n.lp.disconnect(o.detune));this.n.lf.disconnect(v.f.detune);}catch(e){}
  [v.o1,v.o2,v.sub,v.nz,v.g1,v.g2,v.gs,v.gn,v.nh,v.mix,v.f,v.amp].forEach(n=>{try{n.disconnect()}catch(e){}});
 }
};
