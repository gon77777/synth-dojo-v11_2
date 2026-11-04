/* 素材再生エンジン(v7.4): 内蔵素材・取り込み素材(SD.MAT.get / SD.UMAT.load)を AudioBufferSource でそのまま再生する。
   1トラック=1つの音(ステップが来るたびに START から鳴らし直す。前の音は短くフェード)。ピッチは変えない(鍵盤の高さは無視)。
   ONE SHOT=最後まで鳴る / LOOP=鍵盤(ステップ)を離すまでくり返す。出力は bus.input(=インサート・バスが効く)。 */
SD.SmpPlay=class{
 constructor(bus){this.bus=bus;this.p=Object.assign({},SD.defs.smp.DEF);this.ctx=null;this.out=null;this.ab=null;this.abId=null;this.voices=new Set();this.held=new Map();this.posDirty=false}
 get id(){return 'smp'}
 get params(){return SD.defs.smp.P}
 get tabs(){return SD.defs.smp.T}
 get unsup(){return false}
 init(){
  const x=this.bus.init();
  if(this.ctx)return;
  this.ctx=x;this.out=x.createGain();this.out.connect(this.bus.input);this.applyAll();
 }
 getPatch(){const o={};SD.defs.smp.P.forEach(p=>{if(p.tab!=='top')o[p.id]=this.p[p.id]});return o}
 setPatch(o){SD.defs.smp.P.forEach(p=>{if(p.tab!=='top')this.set(p.id,o&&o[p.id]!==undefined?o[p.id]:p.def)})}
 set(id,v){if(id==='sMat'&&!SD.MAT.info(v))v=SD.defs.smp.DEF.sMat;this.p[id]=v;this.apply(id)}
 applyAll(){Object.keys(this.p).forEach(id=>this.apply(id))}
 apply(id){
  if(SD.FXIDS.indexOf(id)>=0){this.bus.set(id,this.p[id]);return}
  if(id==='sMat'&&this.ctx)this.buf()
 }
 /* 再生用バッファ。取り込み素材が未読込のときは読み込みを始めて null(その間の音は出ない) */
 buf(){
  const id=this.p.sMat,x=this.ctx;if(!x)return null;
  if(this.ab&&this.abId===id)return this.ab;
  const m=SD.MAT.get(id);
  if(m){this.ab=this.mk(m);this.abId=id;return this.ab}
  if(SD.UMAT&&SD.UMAT.isU(id))SD.UMAT.load(id).then(mm=>{if(this.p.sMat!==id)return;if(!mm){this.p.sMat=SD.defs.smp.DEF.sMat;SD.UMAT.emit();return}this.ab=this.mk(mm);this.abId=id;SD.UMAT.emit()});
  return null;
 }
 mk(m){const x=this.ctx,sr=m.sr||44100,ab=x.createBuffer(1,m.data.length,sr);if(ab.copyToChannel)ab.copyToChannel(m.data,0);else ab.getChannelData(0).set(m.data);return ab}
 /* 開始位置(秒)。終端の手前で止める */
 off(ab){const d=ab.duration;return Math.min(Math.max(0,this.p.sStart)*d,Math.max(0,d-.02))}
 noteOn(m,vel){
  this.init();const ab=this.buf();if(!ab)return;
  const x=this.ctx,t=x.currentTime,loop=this.p.sMode==='loop',off=this.off(ab);
  this.fadeAll(.015);
  const s=x.createBufferSource(),g=x.createGain();s.buffer=ab;
  if(loop){s.loop=true;s.loopStart=off;s.loopEnd=ab.duration}
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(Math.min(1,vel||1)*.8,t+Math.max(.003,this.p.aA));
  s.connect(g);g.connect(this.out);
  const v={s:s,g:g,loop:loop};this.voices.add(v);this.held.set(m,v);
  s.onended=()=>{this.voices.delete(v);try{g.disconnect()}catch(e){}if(this.held.get(m)===v)this.held.delete(m)};
  s.start(t,off);
 }
 /* 鍵盤(ステップ)を離す: LOOPだけリリースで止める。ONE SHOTは最後まで鳴らす */
 noteOff(m){const v=this.held.get(m);if(!v)return;this.held.delete(m);if(v.loop)this.fade(v,Math.max(.02,this.p.aR))}
 fade(v,sec){
  const x=this.ctx,t=x.currentTime;
  try{v.g.gain.cancelScheduledValues(t);v.g.gain.setTargetAtTime(0,t,Math.max(.004,sec/4));v.s.stop(t+sec+.05)}catch(e){}
 }
 fadeAll(sec){this.voices.forEach(v=>this.fade(v,sec));this.held.clear()}
 allOff(){if(this.ctx)this.fadeAll(.03)}
};
