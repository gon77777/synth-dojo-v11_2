/* モジュラーシンセのエンジン(モノフォニック)。
   音=WebAudioノードをそのまま接続 / CV=GainNode経由でAudioParamへ(ピッチは1V/oct→detune 1200セント) /
   GATE=鍵盤の押下・離しの内部イベント(ADSRはパラメータ自動変化、S&Hは読み取り)。
   構造(モジュール・ケーブル)が変わったらグラフを作り直し、つまみは生きたAudioParamを直接動かす。 */
(function(){
var L=SD.modLib,MODS=SD.MODS;
var Q=function(t,r){return t==='bandpass'?.5+r*14:r*22;};
function mkH(x){var all=[],src=[];return {all:all,src:src,
 G:function(v){var g=x.createGain();if(v!==undefined)g.gain.value=v;all.push(g);return g;},
 N:function(n,s){all.push(n);if(s)src.push(n);return n;}};}
var B={};
B.kbd=function(x,e,id){var h=mkH(x),cs=h.N(x.createConstantSource(),1);cs.offset.value=e.pv(id);cs.start();
 return {o:{pitch:cs},gs:{gate:1},cs:cs,u:function(k){if(k==='oct')e.pitch(x.currentTime,null);},all:h.all,src:h.src};};
/* VCO。PULSE=のこぎり波+しきい値(WaveShaperの段差)でパルス波を作る。しきい値はWIDTHとPWM入力の和 */
var STEP=null;
function stepCurve(){if(STEP)return STEP;var n=2049,c=new Float32Array(n),i;for(i=0;i<n;i++)c[i]=i<(n-1)/2?-1:1;return STEP=c;}
B.vco=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},o=h.N(x.createOscillator(),1),pin=h.G(1200),fin=h.G(P('fm')*2400),out=h.G(1),
  isP=P('wave')==='pulse',dg=h.G(isP?0:1),pg=h.G(isP?1:0),psum=h.G(1),off=h.N(x.createConstantSource(),1),pwi=h.G(P('pwm')),ws=h.N(x.createWaveShaper());
 o.type=isP?'sawtooth':P('wave');o.frequency.value=261.6256;o.detune.value=P('coarse')*100+P('fine');pin.connect(o.detune);fin.connect(o.detune);
 off.offset.value=P('width')*2-1;off.connect(psum);pwi.connect(psum);ws.curve=stepCurve();
 o.connect(dg);dg.connect(out);o.connect(psum);psum.connect(ws);ws.connect(pg);pg.connect(out);o.start();off.start();
 return {i:{pitch:pin,fm:fin,pwm:pwi},o:{out:out},ap:{fm:[fin.gain,function(v){return v*2400}],pwm:[pwi.gain],width:[off.offset,function(v){return v*2-1}]},all:h.all,src:h.src,u:function(k,v,t){
  if(k==='wave'){var p=v==='pulse';o.type=p?'sawtooth':v;dg.gain.setTargetAtTime(p?0:1,t,.01);pg.gain.setTargetAtTime(p?1:0,t,.01);}
  else if(k==='coarse'||k==='fine')o.detune.setTargetAtTime(P('coarse')*100+P('fine'),t,.01);else if(k==='fm')fin.gain.setTargetAtTime(v*2400,t,.01);
  else if(k==='width')off.offset.setTargetAtTime(v*2-1,t,.01);else if(k==='pwm')pwi.gain.setTargetAtTime(v,t,.01);}};};
B.lfo=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},o=h.N(x.createOscillator(),1),rin=h.G(1200),out=h.G(P('depth'));
 o.type=P('wave');o.frequency.value=P('rate');rin.connect(o.detune);o.connect(out);o.start();
 return {i:{rate:rin},o:{out:out},ap:{rate:[o.frequency],depth:[out.gain]},all:h.all,src:h.src,u:function(k,v,t){if(k==='wave')o.type=v;else if(k==='rate')o.frequency.setTargetAtTime(v,t,.02);else if(k==='depth')out.gain.setTargetAtTime(v,t,.02);}};};
B.noise=function(x,e,id){var h=mkH(x),c=e.p[id+'.color'],w=h.N(x.createBufferSource(),1),p=h.N(x.createBufferSource(),1),wg=h.G(c==='white'?1:0),pg=h.G(c==='pink'?1:0),out=h.G(1);
 w.buffer=e.nb.white;p.buffer=e.nb.pink;w.loop=p.loop=true;w.connect(wg);p.connect(pg);wg.connect(out);pg.connect(out);w.start(0,Math.random()*1.5);p.start(0,Math.random()*1.5);
 return {o:{out:out},all:h.all,src:h.src,u:function(k,v,t){if(k==='color'){wg.gain.setTargetAtTime(v==='white'?1:0,t,.01);pg.gain.setTargetAtTime(v==='pink'?1:0,t,.01);}}};};
B.vcf=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},f=h.N(x.createBiquadFilter()),cin=h.G(P('cv')*1200);
 f.type=P('type');f.frequency.value=P('cutoff');f.Q.value=Q(P('type'),P('res'));cin.connect(f.detune);
 return {i:{in:f,cutoff:cin},o:{out:f},ap:{cutoff:[f.frequency],cv:[cin.gain,function(v){return v*1200}]},all:h.all,src:h.src,u:function(k,v,t){
  if(k==='type'){f.type=v;f.Q.setTargetAtTime(Q(v,P('res')),t,.015);}else if(k==='cutoff')f.frequency.setTargetAtTime(v,t,.015);
  else if(k==='res')f.Q.setTargetAtTime(Q(P('type'),v),t,.015);else if(k==='cv')cin.gain.setTargetAtTime(v*1200,t,.015);}};};
B.vca=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},g=h.G(P('level')*(1-P('cv'))),cin=h.G(P('level')*P('cv'));cin.connect(g.gain);
 return {i:{in:g,cv:cin},o:{out:g},all:h.all,src:h.src,u:function(k,v,t){g.gain.setTargetAtTime(P('level')*(1-P('cv')),t,.015);cin.gain.setTargetAtTime(P('level')*P('cv'),t,.015);}};};
B.adsr=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},cs=h.N(x.createConstantSource(),1);cs.offset.value=0;cs.start();
 var g={on:function(t){var p=cs.offset,cur=p.value,A=Math.max(.004,P('a'));p.cancelScheduledValues(t);p.setValueAtTime(cur,t);p.linearRampToValueAtTime(1,t+A);p.setTargetAtTime(P('s'),t+A,Math.max(.005,P('d'))/3);},
  off:function(t){var p=cs.offset,cur=p.value;p.cancelScheduledValues(t);p.setValueAtTime(cur,t);p.setTargetAtTime(0,t,Math.max(.01,P('r'))/4);}};
 return {o:{out:cs},g:{gate:g},all:h.all,src:h.src,u:function(){}};};
B.mixer=function(x,e,id){var h=mkH(x),sum=h.G(1),ins={},gs=[1,2,3,4].map(function(n){var g=h.G(e.p[id+'.l'+n]);g.connect(sum);ins['in'+n]=g;return g;});
 return {i:ins,o:{out:sum},ap:(function(){var a={};gs.forEach(function(g,i){a['l'+(i+1)]=[g.gain]});return a;})(),all:h.all,src:h.src,u:function(k,v,t){var n=+k.slice(1);if(n)gs[n-1].gain.setTargetAtTime(v,t,.015);}};};
B.atten=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},inn=h.G(P('amt')),sum=h.G(1),cs=h.N(x.createConstantSource(),1);cs.offset.value=P('ofs');cs.start();inn.connect(sum);cs.connect(sum);
 return {i:{in:inn},o:{out:sum},ap:{amt:[inn.gain],ofs:[cs.offset]},all:h.all,src:h.src,u:function(k,v,t){if(k==='amt')inn.gain.setTargetAtTime(v,t,.015);else if(k==='ofs')cs.offset.setTargetAtTime(v,t,.015);}};};
B.sh=function(x,e,id){var h=mkH(x),inn=h.G(1),an=h.N(x.createAnalyser()),z=h.G(0),out=h.N(x.createConstantSource(),1),buf=new Float32Array(32);
 an.fftSize=32;inn.connect(an);an.connect(z);z.connect(x.destination);out.offset.value=0;out.start();
 var g={on:function(t){var v=0;try{an.getFloatTimeDomainData(buf);v=buf[buf.length-1]||0;}catch(err){}out.offset.setValueAtTime(v,t);},off:function(){}};
 return {i:{in:inn},o:{out:out},g:{trig:g},all:h.all,src:h.src,u:function(){}};};
B.delay=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},inn=h.G(1),d=h.N(x.createDelay(2)),fb=h.G(P('fb')),dry=h.G(1-P('mix')),wet=h.G(P('mix')),out=h.G(1);
 d.delayTime.value=P('time');inn.connect(dry);dry.connect(out);inn.connect(d);d.connect(wet);wet.connect(out);d.connect(fb);fb.connect(d);
 return {i:{in:inn},o:{out:out},ap:{time:[d.delayTime],fb:[fb.gain]},all:h.all,src:h.src,u:function(k,v,t){if(k==='time')d.delayTime.setTargetAtTime(v,t,.03);else if(k==='fb')fb.gain.setTargetAtTime(v,t,.02);
  else if(k==='mix'){dry.gain.setTargetAtTime(1-v,t,.02);wet.gain.setTargetAtTime(v,t,.02);}}};};
B.clk=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},tg=[],to=[],nt=x.currentTime+.08,iv=0,D={q:1,e:.5,s:.25};
 var per=function(){return 60/P('bpm')*D[P('div')];},fire=function(t,on){var d=Math.max(0,(t-x.currentTime)*1000);to.push(setTimeout(function(){var q=x.currentTime+.003;tg.forEach(function(l){on?l.on(q):l.off(q);});},d));};
 var tick=function(){if(to.length>64)to.splice(0,to.length-32);while(nt<x.currentTime+.1){if(tg.length){fire(nt,1);fire(nt+per()*P('gate'),0);}nt+=per();}};
 iv=setInterval(tick,25);
 return {o:{out:1},ck:1,tg:tg,all:h.all,src:h.src,u:function(){},dead:function(){clearInterval(iv);to.forEach(clearTimeout);tg.length=0;}};};
/* SLEW: 臨界減衰(Q=-6dB)の2次ローパスで、制御信号の変化をなめらかにする。TIME→カットオフ=1/(2πT) */
B.slew=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},inn=h.G(1),f=h.N(x.createBiquadFilter());
 f.type='lowpass';f.Q.value=-6.02;f.frequency.value=1/(6.2832*Math.max(.005,P('time')));inn.connect(f);
 return {i:{in:inn},o:{out:f},ap:{time:[f.frequency,function(v){return 1/(6.2832*Math.max(.005,v))}]},all:h.all,src:h.src,u:function(k,v,t){if(k==='time')f.frequency.setTargetAtTime(1/(6.2832*Math.max(.005,v)),t,.02);}};};
/* RING MOD: AにBをGainのgainへ入れて掛け算。MIXで原音とブレンド */
B.ring=function(x,e,id){var h=mkH(x),ina=h.G(1),inb=h.G(1),rg=h.G(0),dry=h.G(1-e.p[id+'.mix']),wet=h.G(e.p[id+'.mix']),out=h.G(1);
 ina.connect(rg);inb.connect(rg.gain);rg.connect(wet);ina.connect(dry);dry.connect(out);wet.connect(out);
 return {i:{a:ina,b:inb},o:{out:out},all:h.all,src:h.src,u:function(k,v,t){if(k==='mix'){dry.gain.setTargetAtTime(1-v,t,.015);wet.gain.setTargetAtTime(v,t,.015);}}};};
/* WAVESHAPER: 入力×DRIVE(0〜8倍の範囲を曲線の横軸に対応)→曲線で変形。DRIVE入力(CV)は±1で±3倍ぶん加算 */
var SHC={};
function shapeCurve(n){if(SHC[n])return SHC[n];var N=4097,c=new Float32Array(N),i,v;
 for(i=0;i<N;i++){v=(i/(N-1)*2-1)*8;c[i]=n==='hard'?Math.max(-1,Math.min(1,v)):n==='fold'?Math.sin(v*Math.PI/2):Math.tanh(v);}return SHC[n]=c;}
B.shaper=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},pre=h.G(P('drive')/8),cin=h.G(.375),sh=h.N(x.createWaveShaper()),out=h.G(1);
 cin.connect(pre.gain);sh.curve=shapeCurve(P('shape'));try{sh.oversample='2x'}catch(err){}pre.connect(sh);sh.connect(out);
 return {i:{in:pre,drive:cin},o:{out:out},ap:{drive:[pre.gain,function(v){return v/8}]},all:h.all,src:h.src,u:function(k,v,t){if(k==='shape')sh.curve=shapeCurve(v);else if(k==='drive')pre.gain.setTargetAtTime(v/8,t,.015);}};};
/* COMPARATOR: CVを約8msごとに読み、基準を超えたらGATEのON、下回ったらOFF(ヒステリシス±0.02)。制御レート処理 */
B.cmp=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},inn=h.G(1),an=h.N(x.createAnalyser()),z=h.G(0),tg=[],buf=new Float32Array(32),hi=false,iv=0;
 an.fftSize=32;inn.connect(an);an.connect(z);z.connect(x.destination);
 var fire=function(on){var q=x.currentTime+.003;tg.forEach(function(l){on?l.on(q):l.off(q);});};
 iv=setInterval(function(){if(!tg.length)return;var v=0;try{an.getFloatTimeDomainData(buf);v=buf[buf.length-1]||0;}catch(err){return;}
  var th=P('th');if(!hi&&v>th+.02){hi=true;fire(true);}else if(hi&&v<th-.02){hi=false;fire(false);}},8);
 return {i:{in:inn},ck:1,auto:false,tg:tg,all:h.all,src:h.src,u:function(){},dead:function(){clearInterval(iv);tg.length=0;}};};
/* CLOCK DIVIDER: GATEの立ち上がりをN回数えて1回だけ通す。通した分の立ち下がりも通す */
B.div=function(x,e,id){var h=mkH(x),out=[],cnt=0,act=false,
 sink={on:function(t){var n=+e.p[id+'.n']||2;cnt++;if((cnt-1)%n===0){act=true;out.forEach(function(l){l.on(t);});}},off:function(t){if(act){act=false;out.forEach(function(l){l.off(t);});}}};
 return {g:{in:sink},go:{out:out},all:h.all,src:h.src,u:function(k){if(k==='n')cnt=0;},dead:function(){out.length=0;}};};
/* QUANTIZER: 入力(±4oct)を/4して、半音ごとの階段カーブのWaveShaperに通す(音階の一番近い音へ)。音声レートで動くので遅れない */
var QCU={};
function quantCurve(sc,key){var id=sc+key;if(QCU[id])return QCU[id];var N=8193,c=new Float32Array(N),sn={},i,v,r;
 for(i=0;i<N;i++){v=(i/(N-1)*2-1)*4;r=Math.round(v*12);if(sn[r]===undefined)sn[r]=(SD.snap(r+60,key,sc)-60)/12;c[i]=sn[r];}return QCU[id]=c;}
B.quant=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},pre=h.G(.25),ws=h.N(x.createWaveShaper()),out=h.G(1),set=function(){ws.curve=quantCurve(P('scale'),((Math.round(P('key'))%12)+12)%12);};
 set();pre.connect(ws);ws.connect(out);
 return {i:{in:pre},o:{out:out},all:h.all,src:h.src,u:function(k){if(k==='scale'||k==='key')set();}};};
/* REVERB: 減衰ノイズのインパルス応答(コンボルバー)。SIZE変更は150ms待ってから作り直す */
B.rev=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},inn=h.G(1),cv=h.N(x.createConvolver()),dry=h.G(1-P('mix')),wet=h.G(P('mix')*1.5),out=h.G(1),tm=0;
 var mk=function(){var len=Math.max(1,Math.floor(x.sampleRate*P('size'))),b=x.createBuffer(2,len,x.sampleRate),c,i,d;
  for(c=0;c<2;c++){d=b.getChannelData(c);for(i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}cv.buffer=b;};
 mk();inn.connect(dry);dry.connect(out);inn.connect(cv);cv.connect(wet);wet.connect(out);
 return {i:{in:inn},o:{out:out},all:h.all,src:h.src,u:function(k,v,t){if(k==='size'){clearTimeout(tm);tm=setTimeout(mk,150);}else if(k==='mix'){dry.gain.setTargetAtTime(1-v,t,.02);wet.gain.setTargetAtTime(v*1.5,t,.02);}},dead:function(){clearTimeout(tm);}};};
/* SEQUENCER(8ステップ): CLKのGATE立ち上がりで1ステップ進み、そのステップの音程(1V/oct・鍵盤と同じ基準でC4=0)をPITCHに出す。
   ステップがONならGATE出力もON(CLKのGATEが切れたらOFF=GATE長はCLOCKのGATE長に従う)。RESETで次のCLKを1ステップ目に戻す */
B.seqm=function(x,e,id){var h=mkH(x),P=function(k){return e.p[id+'.'+k];},cs=h.N(x.createConstantSource(),1),out=[],pos=-1,act=false,node;
 var note=function(i){return((+P('n'+(i+1))||60)-60)/12+(P('oct')|0);};
 cs.offset.value=note(0);cs.start();
 var clk={on:function(t){var len=Math.max(1,Math.min(8,P('len')|0||8));pos=(pos+1)%len;node.pos=pos;
   cs.offset.cancelScheduledValues(t);cs.offset.setTargetAtTime(note(pos),t,.002);
   if(P('o'+(pos+1))!=='off'){act=true;out.forEach(function(l){l.on(t);});}else act=false;},
  off:function(t){if(act){act=false;out.forEach(function(l){l.off(t);});}}},
 rst={on:function(){pos=-1;node.pos=-1;},off:function(){}};
 node={g:{clk:clk,rst:rst},go:{gate:out},o:{pitch:cs},pos:-1,all:h.all,src:h.src,
  u:function(k,v,t){if(k==='oct'||/^n[1-8]$/.test(k)){if(pos>=0)cs.offset.setTargetAtTime(note(pos),t,.01);}},dead:function(){out.length=0;}};
 return node;};
B.out=function(x,e,id){var h=mkH(x),g=h.G(e.p[id+'.vol']*.3);g.connect(e.out);
 return {i:{in:g},ap:{vol:[g.gain,function(v){return v*.3}]},all:h.all,src:h.src,u:function(k,v,t){if(k==='vol')g.gain.setTargetAtTime(v*.3,t,.015);}};};

SD.Mod=class{
 constructor(bus){this.bus=bus;this.p=Object.assign({},SD.defs.mod.DEF);this.ctx=null;this.n=null;this.out=null;
  this.mods=[];this.cab=[];this.nodes={};this.gl=[];this.held=new Map();this.stack=[];this.cur=60;this.gOn=false;this.setPatch(L.samplePatch());}
 get id(){return 'mod'}
 get params(){return SD.defs.mod.P}
 get tabs(){return SD.defs.mod.T}
 st(){return {mods:this.mods,cab:this.cab}}
 init(){
  const x=this.bus.init();
  if(this.n)return;
  this.ctx=x;this.out=x.createGain();this.out.gain.value=0;this.out.connect(this.bus.input);
  this.nb=this.noiseBufs(x);this.n=1;this.build();this.applyAll();
 }
 noiseBufs(x){
  const n=Math.floor(x.sampleRate*2),w=x.createBuffer(1,n,x.sampleRate),p=x.createBuffer(1,n,x.sampleRate),a=w.getChannelData(0),b=p.getChannelData(0);
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0,mx=1e-6,i;
  for(i=0;i<n;i++){const r=Math.random()*2-1;a[i]=r*.8;
   b0=.99886*b0+r*.0555179;b1=.99332*b1+r*.0750759;b2=.969*b2+r*.153852;b3=.8665*b3+r*.3104856;b4=.55*b4+r*.5329522;b5=-.7616*b5-r*.016898;
   const y=b0+b1+b2+b3+b4+b5+b6+r*.5362;b6=r*.115926;b[i]=y;if(Math.abs(y)>mx)mx=Math.abs(y);}
  for(i=0;i<n;i++)b[i]=b[i]/mx*.8;
  return {white:w,pink:p};
 }
 /* ---- パッチ ---- */
 getPatch(){
  const o={mods:this.mods.map(m=>{const v={};MODS[m.t].knobs.forEach(k=>{v[k.k]=this.p[m.id+'.'+k.k]});return {id:m.id,t:m.t,v:v}}),cab:this.cab.map(c=>c.slice())};
  SD.defs.mod.P.forEach(p=>{if(p.tab!=='top')o[p.id]=this.p[p.id]});
  return o;
 }
 setPatch(o){
  o=o||{};
  if(o.mods){
   Object.keys(this.p).forEach(k=>{if(k.indexOf('.')>0)delete this.p[k]});
   this.mods=[];this.cab=[];
   o.mods.forEach(m=>{if(!MODS[m.t]||L.find(this.st(),m.id))return;this.mods.push({id:m.id,t:m.t});
    MODS[m.t].knobs.forEach(k=>{this.p[m.id+'.'+k.k]=m.v&&m.v[k.k]!==undefined?m.v[k.k]:k.def})});
   (o.cab||[]).forEach(c=>{if(L.canConnect(this.st(),c[0],c[1]).ok)this.cab.push([c[0],c[1]])});
   L.reg(this.mods);if(this.ctx)this.build();
  }
  SD.defs.mod.P.forEach(p=>{if(p.tab!=='top')this.set(p.id,o[p.id]!==undefined?o[p.id]:p.def)});
 }
 /* ---- 構造の編集(戻り値 {ok,msg,id}) ---- */
 addMod(t){
  if(this.mods.length>=L.MAXM)return {ok:false,msg:'モジュールは最大'+L.MAXM+'個までです'};
  const id=L.uid(this.st(),t);this.mods.push({id:id,t:t});
  MODS[t].knobs.forEach(k=>{this.p[id+'.'+k.k]=k.def});
  L.reg(this.mods);if(this.ctx)this.build();return {ok:true,id:id};
 }
 removeMod(id){
  const m=L.find(this.st(),id);if(!m)return {ok:false,msg:'ありません'};
  this.mods=this.mods.filter(x=>x!==m);this.cab=this.cab.filter(c=>c[0].split('.')[0]!==id&&c[1].split('.')[0]!==id);
  MODS[m.t].knobs.forEach(k=>{delete this.p[id+'.'+k.k]});
  L.reg(this.mods);if(this.ctx)this.build();return {ok:true};
 }
 connect(a,b){
  const r=L.canConnect(this.st(),a,b);if(!r.ok)return r;
  this.cab.push([a,b]);if(this.ctx)this.build();return {ok:true};
 }
 disconnect(a,b){
  const n=this.cab.length;this.cab=this.cab.filter(c=>!(c[0]===a&&c[1]===b));
  if(this.cab.length!==n&&this.ctx)this.build();return {ok:true};
 }
 has(a,b){return L.has(this.st(),a,b)}
 /* ---- つまみ ---- */
 set(id,v){this.p[id]=v;this.apply(id)}
 applyAll(){Object.keys(this.p).forEach(id=>this.apply(id))}
 apply(id){
  if(SD.FXIDS.indexOf(id)>=0){this.bus.set(id,this.p[id]);return}
  if(!this.ctx||id.indexOf('.')<0)return;
  const s=L.split(id),n=this.nodes[s[0]];
  if(n&&n.u){if(SD.modPre)SD.modPre(id);n.u(s[1],this.p[id],this.ctx.currentTime)}
 }
 /* ---- グラフ構築 ---- */
 pv(id){return (this.cur-60)/12+(this.p[id+'.oct']|0)}
 dispose(){
  Object.keys(this.nodes).forEach(id=>{const n=this.nodes[id];
   n.src.forEach(s=>{try{s.stop()}catch(e){}});n.all.forEach(a=>{try{a.disconnect()}catch(e){}});if(n.dead)n.dead()});
  this.nodes={};this.gl=[];
 }
 /* 上流にLFO/NOISE/CLOCKがあれば、鍵盤なしで自走する(COMPARATORの出力を開けておく判定) */
 autoSrc(id){const seen={},st=[id];while(st.length){const x=st.pop();if(seen[x])continue;seen[x]=1;const t=L.type(x);if(x!==id&&(t==='lfo'||t==='noise'||t==='clk'))return true;this.cab.forEach(c=>{if(c[1].split('.')[0]===x)st.push(c[0].split('.')[0])})}return false}
 clkLive(){return Object.keys(this.nodes).some(id=>{const n=this.nodes[id];return n.ck&&n.tg.length&&n.auto!==false})}
 build(){
  this.dispose();if(!this.ctx)return;
  const x=this.ctx;
  this.mods.forEach(m=>{this.nodes[m.id]=B[m.t](x,this,m.id)});
  this.cab.forEach(c=>{
   const a=c[0].split('.'),b=c[1].split('.'),A=this.nodes[a[0]],T=this.nodes[b[0]];if(!A||!T)return;
   if(T.g&&T.g[b[1]]){if(A.gs&&A.gs[a[1]])this.gl.push(T.g[b[1]]);else if(A.ck)A.tg.push(T.g[b[1]]);else if(A.go&&A.go[a[1]])A.go[a[1]].push(T.g[b[1]]);return}
   const src=A.o&&A.o[a[1]],dst=T.i&&T.i[b[1]];if(src&&dst)src.connect(dst);
  });
  this.mods.forEach(m=>{if(m.t==='cmp'&&this.nodes[m.id])this.nodes[m.id].auto=this.autoSrc(m.id)});
  if(this.stack.length){const t=x.currentTime+.003;this.gl.forEach(l=>l.on(t))}
  const live=this.clkLive();if(live)this.open(x.currentTime);else if(this.hadClk&&!this.gOn){const g=this.out.gain;g.cancelScheduledValues(x.currentTime);g.setTargetAtTime(0,x.currentTime,.012)}
  this.hadClk=live;
 }
 /* ---- 発音(モノフォニック・後着優先) ---- */
 pitch(t,from){
  this.mods.forEach(m=>{if(m.t!=='kbd')return;const n=this.nodes[m.id];if(!n)return;
   const o=this.p[m.id+'.oct']|0,v=(this.cur-60)/12+o,P=n.cs.offset;
   P.cancelScheduledValues(t);
   if(from!=null){P.setValueAtTime((from-60)/12+o,t);P.setTargetAtTime(v,t,.025)}else P.setTargetAtTime(v,t,.002);
  });
 }
 tail(){
  let r=0;
  this.mods.forEach(m=>{
   if(m.t==='adsr')r=Math.max(r,this.p[m.id+'.r']*1.4+.05);
   else if(m.t==='rev'&&this.p[m.id+'.mix']>.01)r=Math.max(r,Math.min(6,this.p[m.id+'.size'])+.1);
   else if(m.t==='delay'&&this.p[m.id+'.mix']>.01)r=Math.max(r,Math.min(6,this.p[m.id+'.time']*(1+4*this.p[m.id+'.fb']))+.1);
  });
  return r?Math.min(6,r):.03;
 }
 open(t){const g=this.out.gain;g.cancelScheduledValues(t);g.setTargetAtTime(1,t,.003)}
 shut(t){if(this.clkLive())return;const g=this.out.gain;g.cancelScheduledValues(t);g.setValueAtTime(1,t);g.setTargetAtTime(0,t+this.tail(),.012)}
 gates(on,t){this.gl.forEach(l=>on?l.on(t):l.off(t))}
 noteOn(m,vel,from){
  this.init();if(!this.ctx)return;
  const t=this.ctx.currentTime+.003;
  this.stack=this.stack.filter(n=>n!==m);this.stack.push(m);this.held.set(m,1);this.cur=m;
  this.pitch(t,from!=null?from:null);this.open(t);
  if(from==null||!this.gOn)this.gates(true,t);
  this.gOn=true;
 }
 noteOff(m){
  if(!this.held.has(m)||!this.ctx)return;
  this.held.delete(m);this.stack=this.stack.filter(n=>n!==m);
  const t=this.ctx.currentTime+.003;
  if(this.stack.length){this.cur=this.stack[this.stack.length-1];this.pitch(t,null);return}
  this.gates(false,t);this.gOn=false;this.shut(t);
 }
 allOff(){
  this.held.clear();this.stack=[];
  if(this.ctx&&this.gOn){const t=this.ctx.currentTime+.003;this.gates(false,t);this.gOn=false;this.shut(t)}
 }
};
})();
