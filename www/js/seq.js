/* アルペジエーター/ステップシーケンサー(全シンセ共通・DOM非依存)。
   先読みスケジューラ: 25msごとに約100ms先までの発音を予約する(描画が重くてもリズムが乱れにくい)。
   io={now(),on(m,vel,from),off(m),sched(fn,t)->id,unsched(id)} を差し込む(テストでは偽物を渡す) */
SD.SCALES={major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],penta:[0,2,4,7,9],blues:[0,3,5,6,7,10],chrom:[0,1,2,3,4,5,6,7,8,9,10,11]};
SD.SCALE_NAMES=[['major','メジャー'],['minor','マイナー'],['penta','ペンタ'],['blues','ブルース'],['chrom','クロマチック']];
SD.KEYS=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
SD.RATES=[['1/4',1],['1/8',.5],['1/8三連',1/3],['1/16',.25],['1/32',.125]];
SD.ARP_MODES=[['up','UP'],['down','DOWN'],['ud','UP-DOWN'],['rnd','RANDOM'],['ord','押した順']];
/* レッスン用の擬似つまみ(目標値の判定・表示に使う)。tabは該当する画面(arp/seq)。 */
SD.PLAYP={
 aMode:{id:'aMode',tab:'arp',label:'MODE',type:'seg',opts:SD.ARP_MODES,def:'up',help:'アルペジエーターの順番。'},
 aRate:{id:'aRate',tab:'arp',label:'RATE',type:'seg',opts:SD.RATES.map((r,i)=>[i,r[0]]),def:3,help:'音を鳴らす間隔。'},
 aOct:{id:'aOct',tab:'arp',label:'OCT RANGE',type:'seg',opts:[[1,'1'],[2,'2'],[3,'3'],[4,'4']],def:1,help:'何オクターブ分くり返すか。'},
 aGate:{id:'aGate',tab:'arp',label:'GATE',type:'knob',min:.1,max:1,def:.6,curve:'lin',fmt:'pct',step:0,help:'1音を鳴らす長さの割合。'},
 sBpm:{id:'sBpm',tab:'',label:'BPM',type:'knob',min:40,max:240,def:120,curve:'lin',fmt:'n',step:1,help:'テンポ。'},
 sSwing:{id:'sSwing',tab:'',label:'SWING',type:'knob',min:0,max:.6,def:0,curve:'lin',fmt:'pct',step:0,help:'裏拍を遅らせる量。'}
};
/* レッスンの達成カウンタ(c:[[key,最小値]]) */
SD.COUNTERS=Object.assign(SD.COUNTERS||{},{sOn:'音符の数',sAcc:'アクセント',sSld:'スライド',sTie:'タイ',pSave:'保存したパターン'});
SD.STEPMAX=32;/* MT-2a: steps は常に32要素(len は表示・発音の範囲。範囲外は捨てずに残す) */
SD.NMIN=24;SD.NMAX=96;SD.MAXT=8;/* v7.0a: 6→8本(v5.1で4→6本。旧4本・6本のデータはそのまま読める) */
/* 和音ステップ(v5.1): ステップは単音 n に加えて ch:[音…](最大4音)を持てる。cd:{t,i}=和音の種類と転回(あれば音程入力・♪▲▼で和音ごと動く) */
SD.CHORDS=[{id:'maj',name:'メジャー',sym:'',iv:[0,4,7]},{id:'min',name:'マイナー',sym:'m',iv:[0,3,7]},{id:'7',name:'7th',sym:'7',iv:[0,4,7,10]},{id:'maj7',name:'メジャー7th',sym:'M7',iv:[0,4,7,11]},{id:'m7',name:'マイナー7th',sym:'m7',iv:[0,3,7,10]},{id:'sus2',name:'sus2',sym:'sus2',iv:[0,2,7]},{id:'sus4',name:'sus4',sym:'sus4',iv:[0,5,7]},{id:'pow',name:'パワー',sym:'5',iv:[0,7,12]},{id:'dim',name:'dim',sym:'dim',iv:[0,3,6]},{id:'add9',name:'add9',sym:'add9',iv:[0,4,7,14]}];
SD.MAXCH=4;
SD.chordDef=id=>SD.CHORDS.find(c=>c.id===id)||null;
/* 根音 root・種類 t・転回 inv → 音のリスト(昇順・最大4音・NMIN〜NMAX内。決定的) */
SD.chordNotes=(root,t,inv)=>{const d=SD.chordDef(t);if(!d)return [];let a=d.iv.map(v=>root+v);inv=Math.max(0,Math.min(a.length-1,inv|0));for(let k=0;k<inv;k++)a.push(a.shift()+12);
 while(Math.max.apply(null,a)>SD.NMAX)a=a.map(v=>v-12);while(Math.min.apply(null,a)<SD.NMIN)a=a.map(v=>v+12);return a.slice(0,SD.MAXCH).sort((x,y)=>x-y)};
SD.chordName=(root,t,inv)=>{const d=SD.chordDef(t);return d?SD.KEYS[((root%12)+12)%12]+d.sym+(inv?(inv===1?'¹':'²'):''):''};
SD.mkStep=n=>({on:false,n:n==null?48:n,acc:false,sld:false,tie:false});
/* ステップの正規化(旧データは ch なし→そのまま) */
SD.cleanStep=q=>{q=q||{};const o={on:!!q.on,n:Math.max(SD.NMIN,Math.min(SD.NMAX,q.n|0||48)),acc:!!q.acc,sld:!!q.sld,tie:!!q.tie};
 if(Array.isArray(q.ch)){const a=[];q.ch.forEach(v=>{v=v|0;if(v>=SD.NMIN&&v<=SD.NMAX&&a.indexOf(v)<0&&a.length<SD.MAXCH)a.push(v)});if(a.length>1){o.ch=a.sort((x,y)=>x-y);if(q.cd&&SD.chordDef(q.cd.t))o.cd={t:q.cd.t,i:Math.max(0,Math.min(2,q.cd.i|0))}}}
 return o};
SD.cpStep=q=>{const o={on:q.on,n:q.n,acc:q.acc,sld:q.sld,tie:q.tie};if(q.ch&&q.ch.length>1){o.ch=q.ch.slice();if(q.cd)o.cd={t:q.cd.t,i:q.cd.i}}return o};SD.TSYNTHS=['analog','wt','mod','gr','fm','add','smp'];
SD.noteName=m=>SD.KEYS[((m%12)+12)%12]+(Math.floor(m/12)-1);
SD.inScale=(m,key,sc)=>SD.SCALES[sc].indexOf((((m-key)%12)+12)%12)>=0;
SD.snap=(m,key,sc)=>{if(SD.inScale(m,key,sc))return m;for(let d=1;d<12;d++){if(SD.inScale(m-d,key,sc))return m-d;if(SD.inScale(m+d,key,sc))return m+d}return m};
SD.stepScale=(m,dir,key,sc)=>{let x=m;for(let d=0;d<24;d++){x+=dir;if(x<SD.NMIN||x>SD.NMAX)return m;if(SD.inScale(x,key,sc))return x}return m};

SD.Play=class{
 constructor(io){
  this.io=io;this.meter=null;this.metro=false;this.bpm=120;this.swing=0;this.mode='key';this.hold=false;
  this.a={mode:'up',rate:3,gate:.6,oct:1,nt:null,i:0,k:0};
  this.notes=[];this.fing=new Set();this.fresh=true;
  this.s={len:16,scale:'minor',key:0,sel:0,nt:0,i:0,from:null,
   steps:Array.from({length:SD.STEPMAX},()=>SD.mkStep())};
  this.tr=Array.from({length:SD.MAXT},(_,k)=>this.mkTrack(k));this.bm=[0,1,2].map(()=>SD.busClean());this.sc=SD.Auto?SD.Auto.cleanSc(null,SD.MAXT):[];this.ts=0;this.g=0;this.tnt=0;
  this.running=false;this.T=new Set();this.snd=new Map();this.tok=new Map();this.tc=0;
  this.cb={};this.tm=null;this.taps=[];this.t0=0;
  this.au=SD.Auto?SD.Auto.mk():{bars:4,lanes:[]};this.eng=null;
 }
 /* MT-3a: au は拍子(this.meter)に従う。どこで play.au=… と差し替えても au.meter が play.meter と一致する */
 get au(){return this._au}
 set au(v){this._au=v;if(v&&SD.Auto&&SD.Auto.setMeter)SD.Auto.setMeter(v,this.meter)}
 dur(b){return b*60/this.bpm}
 /* ---- MT-2b: 拍子(プロジェクトに1つ。null=4/4)・メトロノーム ---- */
 getMeter(){const M=SD.METER;return this.meter?Object.assign({},this.meter,{g:this.meter.g?this.meter.g.slice():null}):(M?M.DEFAULT():{n:4,d:4,g:null})}
 spb(){const M=SD.METER;return M&&this.meter?M.stepsPerBar(this.meter):16}/* 1小節のステップ数 */
 accArr(){const M=SD.METER;return M?M.accents(this.meter||M.DEFAULT()):[0,4,8,12]}/* 強拍(まとまりの先頭)のステップ位置 */
 /* fit=true: 全トラックとSEQの len を1小節(stepsPerBar)に合わせる。false: len はそのまま。範囲外のステップは捨てない */
 setMeter(m,fit){const M=SD.METER;if(!M)return false;const o=M.norm(m);if(!o)return false;
  this.meter=(o.n===4&&o.d===4&&o.g==null)?null:o;
  if(SD.Auto&&SD.Auto.setMeter)SD.Auto.setMeter(this._au,this.meter);
  if(fit){const n=Math.max(1,Math.min(SD.STEPMAX,this.spb()));this.s.len=n;if(this.s.sel>=n)this.s.sel=0;this.tr.forEach(x=>{x.len=n;if(x.sel>=n)x.sel=0})}
  return true}
 click(t,p){if(!this.metro||!this.io.click)return;if(this.accArr().indexOf(p)>=0)this.io.click(t,p===0)}
 /* ---- マルチトラック(TRKモード): トラックごとに音色(synth+patch)とパターンを持ち、同じクロックで同時に鳴らす ---- */
 mkTrack(k){return{name:'T'+(k+1),synth:'analog',patch:null,mix:SD.MIXDEF(),len:16,scale:'minor',key:0,sel:0,mute:false,solo:false,from:null,
  steps:Array.from({length:SD.STEPMAX},()=>SD.mkStep())}}
 /* 編集対象のパターン(TRKモードでは選択中トラック、それ以外はSEQのパターン)。lenやstepsなど同じ形 */
 cs(){return this.mode==='trk'?this.tr[this.ts]:this.s}
 setTrackSel(k){this.ts=Math.max(0,Math.min(this.tr.length-1,k|0))}
 audible(x){return this.tr.some(q=>q.solo)?x.solo:!x.mute}
 getTracks(){return this.tr.map(x=>({name:x.name,synth:x.synth,patch:x.patch,mix:Object.assign({},x.mix),len:x.len,scale:x.scale,key:x.key,mute:x.mute,solo:x.solo,steps:x.steps.map(SD.cpStep)}))}
 setTracks(a,t){
  if(!Array.isArray(a))return;
  for(let k=0;k<SD.MAXT;k++){const o=a[k];if(!o){if(k>=a.length)this.tr[k]=this.mkTrack(k);continue}const x=this.mkTrack(k);
   x.name=String(o.name||x.name).slice(0,8);x.synth=SD.TSYNTHS.indexOf(o.synth)>=0?o.synth:'analog';x.patch=o.patch&&typeof o.patch==='object'?o.patch:null;x.mix=SD.mixClean(o.mix);
   x.scale=SD.SCALES[o.scale]?o.scale:'minor';x.key=((o.key|0)%12+12)%12;x.len=Math.max(1,Math.min(SD.STEPMAX,o.len|0||16));x.mute=!!o.mute;x.solo=!!o.solo;
   for(let i=0;i<SD.STEPMAX;i++)x.steps[i]=SD.cleanStep((o.steps||[])[i]);/* 16要素の旧データは17〜32を休符で補う */
   this.tr[k]=x}
  this.setTrackSel(t|0);
 }
 /* ---- 発音(予約) ---- */
 note(m,vel,t,len,from,trk){
  const tk=++this.tc,io=this.io,key=(trk==null?'':trk)+':'+m;
  const a=io.sched(()=>{this.T.delete(a);this.tok.set(key,tk);this.snd.set(key,[m,trk]);io.on(m,vel,from,trk)},t);
  const b=io.sched(()=>{this.T.delete(b);if(this.tok.get(key)===tk){this.snd.delete(key);io.off(m,trk)}},t+len);
  this.T.add(a);this.T.add(b);
 }
 killAll(){
  this.T.forEach(id=>this.io.unsched(id));this.T.clear();
  this.snd.forEach(v=>this.io.off(v[0],v[1]));this.snd.clear();this.tok.clear();
 }
 /* ---- テンポ ---- */
 setBpm(v){this.bpm=Math.max(40,Math.min(240,Math.round(v)));if(this.io&&this.io.tempo)this.io.tempo(this.bpm);return this.bpm}
 tap(now){
  const T=this.taps;if(T.length&&now-T[T.length-1]>2000)T.length=0;T.push(now);if(T.length>5)T.shift();
  if(T.length>=2){this.setBpm(60000/((T[T.length-1]-T[0])/(T.length-1)))}return this.bpm;
 }
 setSwing(v){this.swing=Math.max(0,Math.min(.6,v))}
 /* ---- モード ---- */
 setMode(m){
  if(m===this.mode)return;
  this.running=false;if(this.eng)this.eng.stop();if(this.io.beatStop)this.io.beatStop();this.killAll();if(this.io.keyClear)this.io.keyClear();this.tr.forEach(x=>{x.km=null});this.notes=[];this.fing.clear();this.fresh=true;this.a.nt=null;
  this.mode=m;
  this.g=0;if(m==='key'){clearInterval(this.tm);this.tm=null}else if(!this.tm)this.tm=setInterval(()=>this.tick(),25);
  this.cb.step&&this.cb.step(-1);
 }
 start(){if((this.mode!=='seq'&&this.mode!=='trk')||this.running)return false;const t=this.io.now();if(t==null)return false;
  this.running=true;this.s.i=0;this.s.nt=t+.06;this.s.from=null;this.t0=this.s.nt;this.g=0;this.sg=0;this.tnt=this.s.nt;this.tr.forEach(x=>{x.from=null;x.km=null});if(this.eng)this.eng.start(this.t0);if(this.io.beatStart)this.io.beatStart(this.t0,this.bpm);return true}
 stop(){this.running=false;if(this.eng)this.eng.stop();if(this.io.beatStop)this.io.beatStop();this.killAll();if(this.io.duckClear)this.io.duckClear();if(this.io.keyClear)this.io.keyClear();this.tr.forEach(x=>{x.km=null});this.cb.step&&this.cb.step(-1)}
 /* ---- アルペジエーター ---- */
 setHold(b){this.hold=b;if(!b){this.notes=this.notes.filter(m=>this.fing.has(m))}}
 arpDown(m){if(this.hold&&this.fresh)this.notes=[];this.fresh=false;this.fing.add(m);if(this.notes.indexOf(m)<0)this.notes.push(m)}
 arpUp(m){this.fing.delete(m);if(!this.hold)this.notes=this.notes.filter(x=>x!==m);if(!this.fing.size)this.fresh=true}
 arpList(){
  const a=this.a,b=a.mode==='ord'?this.notes.slice():this.notes.slice().sort((x,y)=>x-y),L=[];
  for(let k=0;k<a.oct;k++)b.forEach(n=>L.push(Math.min(120,n+12*k)));
  if(a.mode==='down')L.reverse();
  else if(a.mode==='ud'&&L.length>2)return L.concat(L.slice(1,-1).reverse());
  return L;
 }
 arpStep(){
  const a=this.a,L=this.arpList(),n=L.length,d=this.dur(SD.RATES[a.rate][1]);
  const m=a.mode==='rnd'?L[Math.floor(Math.random()*n)]:L[a.i%n];
  const te=a.nt+((a.k&1)?this.swing*d:0);
  this.note(m,.85,te,Math.max(.01,Math.min(d*a.gate,d-.006)));
  a.i++;a.k++;a.nt+=d;
 }
 /* ---- シーケンサー ---- */
 seqStep(){
  const s=this.s,len=s.len;if(s.i>=len)s.i=0;
  const i=s.i,d=this.dur(.25),te=s.nt+(((this.sg|0)&1)?this.swing*d:0);/* MT-2c: 裏拍は1/16グリッドの通し番号の奇数(パターンが奇数長でも周回でずれない。TRK の g と同じ) */
  if(this.io.beat)this.io.beat(s.nt,(this.sg|0)/4,this.bpm);this.sg=(this.sg|0)+1;/* 拍同期: 格子の時刻(スウィングを除く)はこの拍 */
  this.io.sched(()=>{this.cb.step&&this.cb.step(i)},te);
  this.click(s.nt,((this.sg|0)-1)%this.spb());/* 上で sg を進めたあと=このステップの通し番号 */
  this.trig(s,i,te,d);
  s.i++;s.nt+=d;
 }
 trkStep(){
  const g=this.g,d=this.dur(.25),te=this.tnt+((g&1)?this.swing*d:0);
  if(this.io.beat)this.io.beat(this.tnt,g/4,this.bpm);/* 拍同期: 格子の時刻(スウィングを除く)はこの拍 */
  this.io.sched(()=>{this.cb.tstep&&this.cb.tstep(g)},te);
  this.click(this.tnt,g%this.spb());
  this.tr.forEach((x,k)=>{
   if(this.audible(x)){this.keyMuteTo(x,k,false,te);this.trig(x,g%x.len,te,d,k)}
   else if(this.io.scNeed&&this.io.scNeed(k)){/* 本物のサイドチェイン: だれかのキーに使われているトラックは、ミュート・ソロで外れても鳴らし続ける(聞こえなくして) */
    this.keyMuteTo(x,k,true,te);this.trig(x,g%x.len,te,d,k)}
   else{this.keyMuteTo(x,k,false,te);x.from=null;this.duckOnly(x,g%x.len,te,k)}
  });
  this.g++;this.tnt+=d;
 }
 /* キーミュートの切り替え(状態が変わるときだけ・ステップの頭 te で。x.km は null=未確定 / true / false)。停止で予約ごと消える */
 keyMuteTo(x,k,on,te){
  if(!this.io.keyMute||x.km===on)return;x.km=on;
  const a=this.io.sched(()=>{this.T.delete(a);this.io.keyMute(k,on)},te-.004);this.T.add(a);
 }
 /* ミュート中のトラックでも、ノートのタイミングでDUCKの合図だけは出す(音声は使わない疑似サイドチェイン) */
 duckOnly(s,i,te,trk){
  if(!this.io.duck)return;const st=s.steps[i],prev=i>0?s.steps[i-1]:null;
  if(st.on&&!(st.tie&&prev&&prev.on))this.io.duck(trk,te);
 }
 /* 1ステップ分の発音(SEQとTRKで共通)。s={len,steps,from} */
 trig(s,i,te,d,trk){
  const len=s.len,st=s.steps[i];
  const prev=i>0?s.steps[i-1]:null,tied=st.on&&st.tie&&prev&&prev.on;
  if(st.on&&!tied){
   if(trk!=null&&this.io.duck)this.io.duck(trk,te);
   let ext=0;for(let j=i+1;j<len;j++){const q=s.steps[j];if(q.on&&q.tie)ext++;else break}
   const nx=s.steps[i+1<len?i+1:0],nxOn=!!(nx&&nx.on&&!nx.tie&&i+1+ext<len);
   let L=ext?d*(ext+1)-.006:d*(st.acc?.8:.6);
   if(st.sld&&nxOn&&!ext)L=d+.03;
   if(st.ch&&st.ch.length>1)st.ch.forEach(m=>this.note(m,st.acc?1:.7,te,Math.max(.01,L),undefined,trk));/* 和音: スライドは使わない */
   else this.note(st.n,st.acc?1:.7,te,Math.max(.01,L),s.from!=null?s.from:undefined,trk);
  }
  s.from=(st.on&&st.sld&&!(st.ch&&st.ch.length>1))?st.n:null;
 }
 tick(){
  const t=this.io.now();if(t==null)return;const hz=t+.1;let g=0;
  if(this.mode==='arp'){
   const a=this.a;
   if(!this.notes.length){a.nt=null;return}
   if(a.nt==null){a.nt=t+.05;a.i=0;a.k=0;this.t0=a.nt}else if(a.nt<t-.05)a.nt=t+.02;
   while(a.nt<hz&&g++<64)this.arpStep();
  }else if(this.mode==='seq'&&this.running){
   const s=this.s;if(s.nt<t-.05)s.nt=t+.02;
   while(s.nt<hz&&g++<64)this.seqStep();
  }else if(this.mode==='trk'&&this.running){
   if(this.tnt<t-.05)this.tnt=t+.02;
   while(this.tnt<hz&&g++<64)this.trkStep();
  }
 }
 beatPos(){const t=this.io.now();if(t==null)return -1;
  if((this.mode==='seq'||this.mode==='trk')&&this.running||this.mode==='arp'&&this.a.nt!=null)return Math.max(0,(t-this.t0)/this.dur(1));return -1}
 /* ---- パターン編集 ---- */
 setLen(n){const s=this.cs();s.len=Math.max(1,Math.min(SD.STEPMAX,n|0));if(s.sel>=s.len)s.sel=s.len-1}
 setScale(sc,key){const s=this.cs();if(SD.SCALES[sc])s.scale=sc;s.key=((key%12)+12)%12;s.steps.forEach(x=>{x.n=SD.snap(x.n,s.key,s.scale);this.reChord(x)})}
 /* 和音: 根音 n から ch を作り直す(cd があるときだけ) */
 reChord(st){if(st.cd&&st.ch)st.ch=SD.chordNotes(st.n,st.cd.t,st.cd.i)}
 setChord(t,inv){const s=this.cs(),st=s.steps[s.sel];if(!SD.chordDef(t))return null;st.cd={t,i:Math.max(0,Math.min(2,inv|0))};st.ch=SD.chordNotes(st.n,t,st.cd.i);if(st.ch.length<2){delete st.ch;delete st.cd}else st.on=true;return st.ch}
 clearChord(){const s=this.cs(),st=s.steps[s.sel];delete st.ch;delete st.cd}
 enterNote(m){const s=this.cs(),st=s.steps[s.sel];st.n=SD.snap(Math.max(SD.NMIN,Math.min(SD.NMAX,m)),s.key,s.scale);st.on=true;if(st.cd)this.reChord(st);else if(st.ch)delete st.ch;return st.n}
 nudge(dir){const s=this.cs(),st=s.steps[s.sel];st.n=SD.stepScale(st.n,dir,s.key,s.scale);if(st.cd)this.reChord(st);else if(st.ch)delete st.ch;return st.n}
 clearPattern(){const s=this.cs();s.steps.forEach(x=>{x.on=false;x.acc=false;x.sld=false;x.tie=false;delete x.ch;delete x.cd;x.n=SD.snap(48,s.key,s.scale)})}
 pattern(){const s=this.s;return{len:s.len,scale:s.scale,key:s.key,steps:s.steps.map(SD.cpStep)}}
 setPattern(p){
  const s=this.s;if(!p||!Array.isArray(p.steps))return;
  s.scale=SD.SCALES[p.scale]?p.scale:'minor';s.key=((p.key|0)%12+12)%12;s.len=Math.max(1,Math.min(SD.STEPMAX,p.len|0||16));
  for(let i=0;i<SD.STEPMAX;i++)s.steps[i]=SD.cleanStep(p.steps[i]);
  if(s.sel>=s.len)s.sel=0;
 }
 /* ---- レッスン用の値の出し入れ ---- */
 getV(id){switch(id){case 'aMode':return this.a.mode;case 'aRate':return this.a.rate;case 'aOct':return this.a.oct;case 'aGate':return this.a.gate;case 'sBpm':return this.bpm;case 'sSwing':return this.swing}}
 setV(id,v){switch(id){case 'aMode':if(SD.ARP_MODES.some(x=>x[0]===v))this.a.mode=v;break;case 'aRate':this.a.rate=Math.max(0,Math.min(SD.RATES.length-1,v|0));break;
  case 'aOct':this.a.oct=Math.max(1,Math.min(4,v|0));break;case 'aGate':this.a.gate=Math.max(.1,Math.min(1,v));break;case 'sBpm':this.setBpm(v);break;case 'sSwing':this.setSwing(v);break}}
 count(k){const s=this.s,L=s.steps.slice(0,s.len);
  switch(k){case 'sOn':return L.filter(x=>x.on).length;case 'sAcc':return L.filter(x=>x.on&&x.acc).length;case 'sSld':return L.filter(x=>x.on&&x.sld).length;
   case 'sTie':return L.filter((x,i)=>i>0&&x.on&&x.tie&&L[i-1].on).length}return 0}
 /* ---- シーン(v7.3a): いまのミックス(各トラックの mix 全部とミュート)を撮る ---- */
 snap(i,name){const S=SD.Auto;if(!(i>=0&&i<S.NSC))return null;const o=S.cleanSc([].concat(Array(i).fill(null),[{name:name!=null?name:(this.sc[i]?this.sc[i].name:'S'+(i+1)),tr:this.tr.map(x=>({mute:x.mute,mix:x.mix}))}]),SD.MAXT)[i];this.sc[i]=o;return o}
 /* ---- 保存用 ---- */
 getState(){const a=this.a;return{bpm:this.bpm,swing:this.swing,a:{mode:a.mode,rate:a.rate,gate:a.gate,oct:a.oct},meter:this.meter?this.getMeter():undefined,p:this.pattern(),trk:{t:this.ts,tr:this.getTracks()},bus:this.bm.map(o=>Object.assign({},o)),au:SD.Auto?SD.Auto.json(this.au):undefined,sc:this.sc.some(Boolean)?JSON.parse(JSON.stringify(this.sc)):undefined,fxo:SD.fxOrdSave?(SD.fxOrdSave(this.fxo)||undefined):undefined}}
 setState(o){
  if(!o)return;const a=this.a;
  if(typeof o.bpm==='number')this.setBpm(o.bpm);if(typeof o.swing==='number')this.setSwing(o.swing);
  if(o.a){if(SD.ARP_MODES.some(x=>x[0]===o.a.mode))a.mode=o.a.mode;if(o.a.rate>=0&&o.a.rate<SD.RATES.length)a.rate=o.a.rate|0;
   if(typeof o.a.gate==='number')a.gate=Math.max(.1,Math.min(1,o.a.gate));if(o.a.oct>=1&&o.a.oct<=4)a.oct=o.a.oct|0}
  this.meter=null;if(o.meter!=null&&SD.METER)this.setMeter(o.meter,false);/* 無い・壊れた値は4/4 */
  if(o.p)this.setPattern(o.p);
  if(o.trk)this.setTracks(o.trk.tr,o.trk.t);
  this.fxo=SD.fxOrdSave?SD.fxOrdSave(o.fxo):null;/* OR-2a: マスターFXラックの並び(無い・既定と同じは null=従来順) */
  this.bm=[0,1,2].map(i=>SD.busClean(Array.isArray(o.bus)?o.bus[i]:null));/* v7.2: バスの設定(無いデータは既定=従来と同じ) */
  if(SD.Auto){this.au=SD.Auto.clean(o.au,this.defFn||null);this.sc=SD.Auto.cleanSc(o.sc,SD.MAXT)}/* v7.3a: シーン定義(無いデータは全スロット空) *//* 無い旧データはレーン無し */
 }
};
