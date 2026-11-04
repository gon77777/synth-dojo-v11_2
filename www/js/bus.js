/* 共通マスターバス(v3.1): トラックストリップ(VOL・PAN)→ミックス→ドライブ→ディレイ/リバーブ→マスター→コンプ→リミッター。
   ストリップ以降の既存チェーンは v3.0 と同一(音を変えない)。非TRKのシンセはトラック1のストリップを使う */
SD.Bus=class{
 constructor(){this.p={};this.ctx=null;this.an=null;this.mix=[];this.fxo=null;this.strips=[];this.tb=[];this.gr={};this.bpm=120;this.dact=0;this.dcur=null;this.dkLast=[];this.buses=[];this.bmix=[0,1,2].map(()=>SD.BUSDEF());this.dkLastR={};}
 get input(){return this.ctx?this.strip(0).in:null}
 /* トラックストリップ(必要になったとき作る)。stereo固定にして、PAN中央で音量が変わらないようにする */
 strip(k){
  if(this.strips[k])return this.strips[k];
  const x=this.ctx,G=()=>x.createGain(),i=G(),dk=G(),v=G(),pn=x.createStereoPanner(),cd=G(),cr=G();
  [i,dk,v].forEach(n=>{n.channelCount=2;n.channelCountMode='explicit';});
  i.connect(dk);dk.connect(v);v.connect(pn);
  /* 送り量(v3.7): 送り先は挿入エフェクトの後ろ(ins)から取るので、トラックごとの調整は「(送り量−1)×このトラックの音」を足して行う。
     100%なら補正は0で従来と同じ音。挿入エフェクトがONのときは近似 */
  cd.gain.value=0;cr.gain.value=0;pn.connect(cd);pn.connect(cr);if(this.n){cd.connect(this.n.dsend);cr.connect(this.n.pre)}
  const s=this.strips[k]={in:i,dk,vol:v,pan:pn,cd,cr,st:{},sig:'',dest:null};this.routeOut(k);this.applyMix(k,true);this.tchk(k);if(this.meterActive)this.mAttach(k);return s;
 }
 setMix(k,id,v){
  if(id==='ord'){/* OR-1b: 並びの順列。正しくなければ持たない(iOrd から求める) */const m=this.mix[k]=this.mix[k]||SD.MIXDEF();if(SD.ordValid(v))m.ord=v.slice();else delete m.ord;if(this.strips[k])this.tchk(k);return}
  if(id==='iOrd'&&this.mix[k])delete this.mix[k].ord;/* 旧つまみで切り替えたら ord は捨てて iOrd を正とする */
  if(this.schedPre)this.schedPre(k,id);
  (this.mix[k]=this.mix[k]||SD.MIXDEF())[id]=v;
  if(this.strips[k]){if(id.charAt(0)==='i'&&id!=='iOrd'||id==='iOrd'){this.tup(k,id);this.tchk(k)}else if(id==='tOut')this.routeOut(k);else this.applyMix(k,false,id)}
  if(id==='dkOn'&&!v)this.duckReset(k);
  if(/^iCp(Sc|On|ScLsn)(_2)?$/.test(id))this.scWire();/* OR-3c: 2段目も */
 }
 /* ---- DUCK(疑似サイドチェイン): ソーストラック src のノートオン(時刻 t=ctx時間)で、DUCK ONのトラックのゲインをへこませる ----
    音声は使わない。包絡は SD.duckEnv(純粋関数)と同じ形を折れ線で予約。前のへこみの途中から始まる場合は、その時点のゲインから下げる */
 duck(src,t){
  if(!this.ctx)return;
  for(let k=0;k<SD.MAXT;k++){
   const m=this.mix[k],s=this.strips[k];if(!m||!s||m.dkOn!=1||m.dkSrc!==src||k===src)continue;
   this.dkLast[k]=this.dkSched(s.dk.gain,this.dkLast[k],m,t);
  }
  /* リターンDUCK(v7.2): DELAY・REVERB の戻りをSRCトラックのノートでへこませる */
  if(this.n)[['dl',this.n.dkD],['rv',this.n.dkR]].forEach(r=>{
   if(this.val(r[0]+'DuckOn')!=1||(this.val(r[0]+'DuckSrc')|0)!==src)return;
   this.dkLastR[r[0]]=this.dkSched(r[1].gain,this.dkLastR[r[0]],SD.retDuckM(r[0],id=>this.val(id)),t);
  });
 }
 /* へこみの予約(包絡は SD.duckEnv と同じ形)。前のへこみの途中から始まる場合は、その時点のゲインから下げる。次回のために { t, m } を返す */
 dkSched(p,prev,m,t){
  const g0=prev?SD.duckEnv(prev.m,t-prev.t):1,d=m.dkDepth,fl=1-d,a=Math.max(.001,m.dkAtk/1000),h=m.dkHold/1000,r=m.dkRel/1000;
  p.cancelScheduledValues(t);p.setValueAtTime(g0,t);p.linearRampToValueAtTime(fl,t+a);
  if(h>0)p.linearRampToValueAtTime(fl,t+a+h);
  for(let j=1;j<=10;j++){const u=j/10;p.linearRampToValueAtTime(fl+d*Math.pow(u,Math.pow(4,-m.dkCurve)),t+a+h+r*u)}
  return{t,m:{dkDepth:m.dkDepth,dkAtk:m.dkAtk,dkHold:m.dkHold,dkRel:m.dkRel,dkCurve:m.dkCurve}};
 }
 duckReset(k){
  const f=k=>{const s=this.strips[k];if(s){s.dk.gain.cancelScheduledValues(this.ctx.currentTime);s.dk.gain.setTargetAtTime(1,this.ctx.currentTime,.01)}this.dkLast[k]=null};
  if(!this.ctx)return;if(k==null){for(let i=0;i<SD.MAXT;i++)f(i);this.retReset('dl');this.retReset('rv')}else f(k);
 }
 retReset(r){const g=this.n&&(r==='dl'?this.n.dkD:this.n.dkR);if(g){g.gain.cancelScheduledValues(this.ctx.currentTime);g.gain.setTargetAtTime(1,this.ctx.currentTime,.01)}this.dkLastR[r]=null}
 /* ---- グループバス(v7.2): トラックの OUT=BUS A/B/C → バス[EQ4⇄COMP]→VOL→ミックス。ONのものだけ接続。センドはトラックから直接取る(バスを通らない) ---- */
 routeOut(k){
  const s=this.strips[k];if(!s)return;const o=((this.mix[k]||{}).tOut|0),dest=o>0&&o<=3?this.busNode(o-1).in:this.mixIn;
  if(s.dest!==dest){if(s.dest){try{s.pan.disconnect(s.dest)}catch(e){}}s.pan.connect(dest);s.dest=dest}
  this.applyMix(k,false,'tDly');this.applyMix(k,false,'tRvb');/* v8.1: 送りの量はバスに入れるかどうかで変わる */
 }
 /* 送りの補正タップの量(v8.1)。マスターの送りは「ミックス全体」から取るので、MASTER直結のトラックは (送り-1) を足し引きするだけ。
    バス行きのトラックは、バスの出力にある打ち消しタップ(-1)でバス経由ぶんが消えるので、トラックの PAN の後ろから送り全量を取る=バスの EQ・COMP・VOL の影響を受けない */
 sendGain(k,id){const m=this.mix[k]||{},v=m[id]==null?1:m[id],o=m.tOut|0;return o>0&&o<=3?v:v-1}
 busNode(b){
  if(this.buses[b])return this.buses[b];
  const x=this.ctx,i=x.createGain(),v=x.createGain();[i,v].forEach(n=>{n.channelCount=2;n.channelCountMode='explicit'});
  i.connect(v);v.connect(this.mixIn);const cd=x.createGain(),cr=x.createGain();cd.gain.value=-1;cr.gain.value=-1;v.connect(cd);v.connect(cr);if(this.n){cd.connect(this.n.dsend);cr.connect(this.n.pre)}/* v8.1: バス経由ぶんの送りを打ち消す */
  const q=this.buses[b]={in:i,vol:v,cd,cr,st:{},sig:'',live:0};this.bup(b,'bVol',1);this.bchk(b);return q;
 }
 setBusMix(b,id,v){
  this.bmix[b]=this.bmix[b]||SD.BUSDEF();this.bmix[b][id]=v;
  if(this.buses[b]){if(id==='bVol')this.bup(b,id);else{this.bup(b,id);this.bchk(b)}}
  if(id==='iCpSc'||id==='iCpOn'||id==='iCpScLsn')this.scWire();
 }
 bact(b,g){const m=this.bmix[b]||{};return g==='eq'?m.iEqOn==1:g==='cp'?(m.iCpOn==1&&!!this.wkOK):false}
 bchk(b){const q=this.buses[b];if(!q||!this.ctx)return;const m=this.bmix[b],sig=['eq','cp'].map(g=>this.bact(b,g)?1:0).join('')+(m.iOrd==1?'c':'e');if(sig!==q.sig){q.sig=sig;const os=m.iOrd==1?'c':'e',ch=q.osig!==undefined&&q.osig!==os&&q.live>0;q.osig=os;if(ch&&this.canFade(q))this.bfade(b);else if(!q.fd)this.brewire(b)}this.scWire();this.heavyCheck()}
 /* OR-2b: バスの EQ↔COMP の入れ替えも、トラックと同じ約10ms×2のフェードで張り替える */
 bfade(b){const q=this.buses[b],x=this.ctx,g=q.in.gain,FD=this.fadeMs||10;if(q.fd)return;const t=x.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+FD/1000);
  q.fd=setTimeout(()=>{q.fd=null;if(this.buses[b]!==q)return;this.brewire(b);const t2=x.currentTime;g.cancelScheduledValues(t2);g.setValueAtTime(0,t2);g.linearRampToValueAtTime(1,t2+FD/1000)},FD+2)}
 brewire(b){
  const q=this.buses[b],order=this.bmix[b].iOrd==1?['cp','eq']:['eq','cp'],live=[];q.osig=this.bmix[b].iOrd==1?'c':'e';
  order.forEach(g=>{if(this.bact(b,g)){if(!q.st[g]){q.st[g]=g==='eq'?this.mkt_eq(b):this.mkt_cp('b'+b);SD.BUSP.filter(p=>p.ins===g).forEach(p=>this.bup(b,p.id,1))}live.push(q.st[g])}else if(q.st[g]){q.st[g].out.disconnect();delete q.st[g]}});
  q.in.disconnect();Object.keys(q.st).forEach(g=>q.st[g].out.disconnect());
  let prev=q.in;live.forEach(n=>{prev.connect(n.in);prev=n.out});prev.connect(q.vol);q.live=live.length;
 }
 bup(b,id,now){const q=this.buses[b];if(!q||!this.ctx)return;if(id==='bVol'){const t=this.ctx.currentTime,val=SD.volGain(this.bmix[b].bVol);now?(q.vol.gain.value=val):q.vol.gain.setTargetAtTime(val,t,.02);return}this._up(q,this.bmix[b],'b'+b,id,now)}
 busGr(b){const q=this.gr.t&&this.gr.t['b'+b];return q&&this.buses[b]&&this.buses[b].st.cp?q:null}

 applyMix(k,now,only){
  if(this.schedPre)this.schedPre(k,only||'*');
  const s=this.strips[k],m=this.mix[k]||SD.MIXDEF(),t=this.ctx.currentTime;
  const S=(a,val)=>now?(a.value=val):a.setTargetAtTime(val,t,.02);
  if(!only||only==='tVol'){if(s.km){s.vol.gain.cancelScheduledValues(t);s.vol.gain.setValueAtTime(0,t)}else S(s.vol.gain,SD.volGain(m.tVol))}/* v8.2: キーとして鳴らし続けるだけのトラックは、聞こえない(VOL=0) */
  if(!only||only==='tPan')S(s.pan.pan,m.tPan);
  if(!only||only==='tDly')S(s.cd.gain,this.sendGain(k,'tDly'));
  if(!only||only==='tRvb')S(s.cr.gain,this.sendGain(k,'tRvb'));
 }

 /* ---- トラック別インサート(v7.0a): 入口→[GATE]→[EQ4⇄COMP]→[SAT]→[MOD]→DUCK。ONのものだけ作って接続する。全部OFFなら 入口→DUCK 直結(従来と同じ) ---- */
 tact(k,g){
  const m=this.mix[k]||{},W=this.wkOK,x=SD.slotSfx(g),f=id=>m[id+x];/* OR-3b: 2段目(_2)は ON も _2 のつまみを見る */
  switch(SD.slotBase(g)){
   case 'gt':return f('iGtOn')==1&&!!W;case 'eq':return f('iEqOn')==1;case 'cp':return f('iCpOn')==1&&!!W;case 'ds':return f('iDsOn')==1&&!!W;
   case 'sa':return f('iSaOn')==1&&((f('iSaType')|0)===0||!!W);case 'md':return f('iMdOn')==1&&!!W;
  }
  return false;
 }
 tsig(k){return SD.INSORD(this.mix[k]).map(g=>g+(this.tact(k,g)?1:0)).join('')}
 /* 接続の組み替えが要るときだけ(ON/OFF・順序が変わったとき)。つまみを回すたびには組み替えない。
    順序だけが変わり、すでに鳴っているチェーンがあるときは、約10ms×2のフェード(入口のゲインを0へ→組み替え→1へ)で張り替える(クリック防止。実時間の AudioContext のみ。オフライン描画・偽のコンテキストは即時) */
 tchk(k){const s=this.strips[k];if(!s||!this.ctx)return;const sig=this.tsig(k);if(sig!==s.sig){s.sig=sig;const os=SD.INSORD(this.mix[k]).join(),ch=s.osig!==undefined&&s.osig!==os&&s.live>0;s.osig=os;if(ch&&this.canFade(s))this.fadeRewire(k);else if(!s.fd)this.trewire(k)}this.scWire();this.heavyCheck()}
 canFade(s){const g=s.in&&s.in.gain,x=this.ctx;return !!g&&typeof g.cancelScheduledValues==='function'&&typeof g.linearRampToValueAtTime==='function'&&typeof x.startRendering!=='function'&&x.state==='running'&&typeof setTimeout==='function'}
 fadeRewire(k){const s=this.strips[k],x=this.ctx,g=s.in.gain,FD=this.fadeMs||10;if(s.fd)return;/* 待ち中の組み替えは、実行時の最新の mix で行う */
  const t=x.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+FD/1000);
  s.fd=setTimeout(()=>{s.fd=null;if(this.strips[k]!==s)return;this.trewire(k);const t2=x.currentTime;g.cancelScheduledValues(t2);g.setValueAtTime(0,t2);g.linearRampToValueAtTime(1,t2+FD/1000)},FD+2)}
 trewire(k){
  const s=this.strips[k],order=SD.INSORD(this.mix[k]),live=[];s.osig=order.join();
  order.forEach(g=>{if(this.tact(k,g)){if(!s.st[g]){s.st[g]=this['mkt_'+SD.slotBase(g)](k,g);this.tinit(k,g)}live.push(s.st[g])}else if(s.st[g]){s.st[g].out.disconnect();delete s.st[g]}});
  Object.keys(s.st).forEach(g=>{if(order.indexOf(g)<0){s.st[g].out.disconnect();delete s.st[g]}});/* OR-3b: 並びから外れた2段目を片付ける */
  s.in.disconnect();Object.keys(s.st).forEach(g=>s.st[g].out.disconnect());
  let prev=s.in;live.forEach(q=>{prev.connect(q.in);prev=q.out});prev.connect(s.dk);s.live=live.length;
 }
 tinit(k,g){const x=SD.slotSfx(g),b=SD.slotBase(g);SD.INSP.filter(p=>p.ins===b).forEach(p=>this.tup(k,p.id+x,1))}
 /* 重い処理(ワークレット系のインサート)の合計。上限(SD.INSMAX)を超えたら loadHigh=true(警告のみ。勝手にOFFにしない) */
 heavy(){let n=0;this.strips.forEach(s=>{if(!s)return;['','_2'].forEach(x=>{['gt','cp','md','ds'].forEach(g=>{if(s.st[g+x])n++});if(s.st['sa'+x]&&s.st['sa'+x].w)n++})});/* OR-3b: スロット(2段目も)の数で数える */this.buses.forEach(q=>{if(q&&q.st.cp)n++});return n}
 heavyCheck(){const h=this.heavy(),hi=h>SD.INSMAX;if(hi!==!!this.loadHigh){this.loadHigh=hi;if(this.onLoad)this.onLoad(hi,h)}}
 mkt_gt(k){const w=this.wnode('sd-gate');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 mkt_eq(k){
  const x=this.ctx,B=t=>{const f=x.createBiquadFilter();f.type=t;return f},hpf=B('highpass'),lo=B('lowshelf'),b1=B('peaking'),b2=B('peaking'),hi=B('highshelf'),lpf=B('lowpass');
  hpf.Q.value=-3.0103;lpf.Q.value=-3.0103;hpf.connect(lo);lo.connect(b1);b1.connect(b2);b2.connect(hi);hi.connect(lpf);return{in:hpf,out:lpf,hpf,lo,b1,b2,hi,lpf};
 }
 /* ====== 本物のサイドチェイン(v8.2) ======
    トラック k の COMP の判定を、別トラック j の音(キー)で行う。キーの取り出し口 kt は、j のストリップの DUCK の後ろ・VOL の前から分岐する
    (出力側にはつながない=聞こえない。j をミュートしても、キーは流れる)。kt → k の COMP の入力1。
    iCpSc: 0=INT(自分の音で判定=従来・何もつながない) / 1〜8=T1〜T8。自分自身・循環(T1⇄T2 など。つなぐと音が消えるループになる)は INT 扱い */
 scRaw(k,g){const m=this.mix[k],v=m?(m['iCpSc'+SD.slotSfx(g)]|0):0,j=v-1;return(v>=1&&v<=8&&j!==k)?j:-1}/* OR-3c: g='cp'(既定)|'cp_2' = スロット単位 */
 /* トラック k の COMP が、いま実際に使うキー元(0〜7)。使わない(INT・COMPがOFF・自分自身・循環)なら -1。元のストリップが無くても番号は返す */
 scSrc(k,g){
  g=g||'cp';if(!this.tact(k,g))return -1;const j=this.scRaw(k,g);if(j<0)return -1;
  return this.scReach(j,k)?-1:j;
 }
 /* OR-3c: トラック from の音が to のキーに依存するか(from の「動いているCOMPスロット」のキー元を全スロットぶんたどる)。k のキー元 j から k へ戻れるなら循環 */
 scReach(from,to){const seen={},st=[from];while(st.length){const c=st.pop();if(c===to)return true;if(seen[c])continue;seen[c]=1;['cp','cp_2'].forEach(g=>{if(this.tact(c,g)){const n=this.scRaw(c,g);if(n>=0)st.push(n)}})}return false}
 /* トラック j が、だれかのキーとして使われているか(演奏エンジンが、ミュート・ソロで外れた j も鳴らし続けるかの判断に使う) */
 scNeed(j){for(let k=0;k<8;k++)if(k!==j&&(this.scSrc(k)===j||this.scSrc(k,'cp_2')===j))return true;/* OR-3c: 全スロットを見る */for(let q=0;q<3;q++)if(this.bscSrc(q)===j)return true;return this.vcSrc()===j}
 /* FX-5a: マスターのボコーダーのキー元(モジュレーター)トラック(0〜7)。使わない(INT・OFF・範囲外・不正値)なら -1。
    ボコーダーはマスターFXラックにあり、キーはトラックのDUCKの後から取るだけ(出力側へはつながない)ので、構造上ループしない(自分自身・循環は起こらない) */
 vcSrc(){if(!this.ctx||!this.act('vc'))return -1;const v=+this.val('vcSrc');return(v>=1&&v<=8&&v===Math.floor(v))?v-1:-1}
 /* ボコーダーのキーの接続(入力1)。ノードが作り直されたら・キー元が変わったら・キー元ストリップが後からできたら、つなぎ直す。何度呼んでも同じ結果 */
 vcWire(){
  if(!this.ctx)return;const w=this.act('vc')&&this.st&&this.st.vc?this.st.vc.w:null,j=w?this.vcSrc():-1,src=j>=0?this.strips[j]:null,c=this.vcK;
  if(c&&(c.w!==w||c.j!==j||!src)){try{c.kt.disconnect(c.w,0,1)}catch(e){}this.vcK=null}
  if(!this.vcK&&w&&src){const kt=this.ktap(j);kt.connect(w,0,1);this.vcK={j,kt,w}}
  if(w)this.wp(w,'keyOn',j>=0?1:0);
 }
 /* SB: バス b の COMP のキー元トラック(0〜7)。使わない(INT・COMPがOFF・範囲外)なら -1。キー元はトラックのみで、キーは検出器にしか入らないため構造上ループしない(トラックのCOMPのキー元にバスは選べない) */
 bscSrc(b){if(!this.bact(b,'cp'))return -1;const m=this.bmix[b],v=m?(m.iCpSc|0):0;return(v>=1&&v<=8)?v-1:-1}
 /* キーの取り出し口(必要になったとき1回だけ作る。作ったあとは残す=つながる先が無ければ何も起きない) */
 ktap(j){const s=this.strips[j];if(s.kt)return s.kt;const g=this.ctx.createGain();g.channelCount=2;g.channelCountMode='explicit';s.dk.connect(g);return s.kt=g}
 /* COMP のメイクアップの量(SC LISTEN 中はキーをそのまま聴くので掛けない) */
 cpMk(k,m,g){const x=SD.slotSfx(g),j=typeof k==='number'?this.scSrc(k,g||'cp'):(typeof k==='string'&&k.charAt(0)==='b'?this.bscSrc(+k.slice(1)):-1);return(m['iCpScLsn'+x]==1&&j>=0)?1:Math.pow(10,(m['iCpMake'+x]||0)/20)}
 /* 全トラックのキーの接続と scOn/scListen を、いまの設定に合わせる(何度呼んでも同じ結果=変わったところだけ組み替える) */
 scWire(){
  if(!this.ctx)return;
  for(let k=0;k<this.strips.length;k++){
   const s=this.strips[k];if(!s)continue;const m=this.mix[k]||{};
   ['cp','cp_2'].forEach(g=>{/* OR-3c: スロットごとに配線(状態は s.sc/scw/scv と、2段目は s.sc_2/scw_2/scv_2) */
    const x=SD.slotSfx(g),w=s.st[g]&&s.st[g].w,j=w?this.scSrc(k,g):-1,src=j>=0?this.strips[j]:null,C='sc'+x,W='scw'+x,Vv='scv'+x;
    if(s[C]&&(s[C].w!==w||s[C].j!==j||!src)){try{s[C].kt.disconnect(s[C].w,0,1)}catch(e){}s[C]=null}
    if(!s[C]&&w&&src){const kt=this.ktap(j);kt.connect(w,0,1);s[C]={j,kt,w}}
    if(w){const on=j>=0?1:0,ls=on&&m['iCpScLsn'+x]==1?1:0,sig=on+':'+ls;
     if(s[W]!==w||s[Vv]!==sig){s[W]=w;s[Vv]=sig;this.wp(w,'scOn',on);this.wp(w,'scListen',ls);if(s.st[g].m)s.st[g].m.gain.setTargetAtTime(this.cpMk(k,m,g),this.ctx.currentTime,.02)}}
    else{s[W]=null;s[Vv]=null}
   });
  }
  for(let b=0;b<this.buses.length;b++){/* SB: バスのCOMP */
   const q=this.buses[b];if(!q)continue;const w=q.st.cp&&q.st.cp.w,m=this.bmix[b]||{};
   const j=w?this.bscSrc(b):-1,src=j>=0?this.strips[j]:null;
   if(q.sc&&(q.sc.w!==w||q.sc.j!==j||!src)){try{q.sc.kt.disconnect(q.sc.w,0,1)}catch(e){}q.sc=null}
   if(!q.sc&&w&&src){const kt=this.ktap(j);kt.connect(w,0,1);q.sc={j,kt,w}}
   if(w){const on=j>=0?1:0,ls=on&&m.iCpScLsn==1?1:0,sig=on+':'+ls;
    if(q.scw!==w||q.scv!==sig){q.scw=w;q.scv=sig;this.wp(w,'scOn',on);this.wp(w,'scListen',ls);if(q.st.cp.m)q.st.cp.m.gain.setTargetAtTime(this.cpMk('b'+b,m),this.ctx.currentTime,.02)}}
   else{q.scw=null;q.scv=null}
  }
  this.vcWire();
 }
 /* キーとして鳴らし続けるだけのトラックを、聞こえなくする(on=true)/戻す(on=false)。on=false だけではストリップを作らない */
 keyMute(k,on){
  if(!this.ctx)return;let s=this.strips[k];if(!s){if(!on)return;s=this.strip(k)}
  if(!!s.km===!!on)return;s.km=!!on;this.applyMix(k,false,'tVol');
 }
 keyClear(){this.strips.forEach((s,k)=>{if(s&&s.km){s.km=false;this.applyMix(k,false,'tVol')}})}
 mkt_cp(k,g){const w=this.wnode('sd-comp',{numberOfInputs:2}),m=this.ctx.createGain(),gk=SD.slotSfx(g)?'c2_'+k:k;this.wp(w,'active',1);w.connect(m);w.port.onmessage=e=>{(this.gr.t=this.gr.t||[])[gk]={gr:e.data.gr,grm:e.data.grm}};return{in:w,out:m,w,m}}
 mkt_ds(k,g){const w=this.wnode('sd-deess'),gk=(SD.slotSfx(g)?'d2_':'d')+k;this.wp(w,'enabled',1);w.port.onmessage=e=>{(this.gr.t=this.gr.t||[])[gk]=e.data.gr};return{in:w,out:w,w}}
 mkt_sa(k,g){g=g||'sa';const x=this.ctx,sin=x.createGain(),sout=x.createGain(),drv=x.createWaveShaper();[sin,sout].forEach(q=>{q.channelCount=2;q.channelCountMode='explicit'});drv.oversample='2x';const s={in:sin,out:sout,sin,sout,drv,w:null};this.strips[k].st[g]=s;this.tsaRoute(k,g);return s}
 tsaRoute(k,g){
  g=g||'sa';const s=this.strips[k].st[g];if(!s)return;const m=this.mix[k]||{},t=m['iSaType'+SD.slotSfx(g)]|0;
  s.sin.disconnect();s.drv.disconnect();
  if(t===0||!this.wkOK){s.sin.connect(s.drv);s.drv.connect(s.sout)}
  else{if(!s.w){s.w=this.wnode('sd-saturator');this.wp(s.w,'enabled',1)}s.sin.connect(s.w);s.w.connect(s.sout)}
 }
 mkt_md(k){const w=this.wnode('sd-modfx');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 /* インサートのつまみ値をノードへ反映(now=作った直後は即時) */
 tup(k,id,now){const s=this.strips[k];if(!s||!this.ctx)return;if(this.schedPre)this.schedPre(k,id);this._up(s,this.mix[k]||SD.MIXDEF(),k,id,now)}
 _up(s,m,k,id,now){
  if(/_2$/.test(id)){/* OR-3b: 2段目のつまみ。st の _2 を元のキーに見立てて同じ処理に流す(値が無ければ既定) */
   const b=id.slice(0,-2),d=SD.insDef(b);if(!d||d.ins==='ord')return;const st2={};SD.ORDDEF.forEach(g=>{st2[g]=s.st[g+'_2']});const m2=Object.assign({},m);m2[b]=m[id]===undefined?d.def:m[id];
   [...SD.INSP].forEach(p=>{if(p.ins!=='ord'&&m[p.id+'_2']!==undefined)m2[p.id]=m[p.id+'_2'];else if(p.ins!=='ord'&&p.ins===d.ins&&m[p.id+'_2']===undefined)m2[p.id]=p.def});
   return this._up(Object.assign({},s,{st:st2,sfx:'_2'}),m2,k,b,now)}
  const v=m[id],t=this.ctx.currentTime,st=s.st,
   S=(a,val)=>now?(a.value=val):a.setTargetAtTime(val,t,.02),W=(g,n,val,sm)=>{if(st[g]&&st[g].w)this.wp(st[g].w,n,val,sm&&!now)};
  switch(id){
   case 'iGtThr':W('gt','threshold',v,1);break;case 'iGtHold':W('gt','hold',v,1);break;case 'iGtRel':W('gt','release',v,1);break;case 'iGtRange':W('gt','range',v,1);break;
   case 'iEqHpf':if(st.eq)S(st.eq.hpf.frequency,v);break;case 'iEqLpf':if(st.eq)S(st.eq.lpf.frequency,v);break;
   case 'iEqLf':if(st.eq)S(st.eq.lo.frequency,v);break;case 'iEqLg':if(st.eq)S(st.eq.lo.gain,v);break;
   case 'iEqB1f':if(st.eq)S(st.eq.b1.frequency,v);break;case 'iEqB1g':if(st.eq)S(st.eq.b1.gain,v);break;case 'iEqB1q':if(st.eq)S(st.eq.b1.Q,v);break;
   case 'iEqB2f':if(st.eq)S(st.eq.b2.frequency,v);break;case 'iEqB2g':if(st.eq)S(st.eq.b2.gain,v);break;case 'iEqB2q':if(st.eq)S(st.eq.b2.Q,v);break;
   case 'iEqHf':if(st.eq)S(st.eq.hi.frequency,v);break;case 'iEqHg':if(st.eq)S(st.eq.hi.gain,v);break;
   case 'iCpModel':W('cp','model',v);break;case 'iCpThr':W('cp','thresh',v,1);break;case 'iCpRatio':W('cp','ratio',v,1);break;case 'iCpAtk':W('cp','attack',v,1);break;case 'iCpRel':W('cp','release',v,1);break;
   case 'iCpKnee':W('cp','knee',v,1);break;case 'iCpMix':W('cp','mix',v,1);break;case 'iCpScHpf':W('cp','schpf',v,1);break;
   case 'iCpMake':if(st.cp)S(st.cp.m.gain,this.cpMk(k,m,s.sfx?'cp_2':'cp'));break;
   case 'iSaType':this.tsaRoute(k,s.sfx?'sa_2':'sa');if(st.sa&&st.sa.w)this.wp(st.sa.w,'type',Math.max(0,v-1));this.tup(k,'iSaDrive'+(s.sfx||''),now);break;
   case 'iSaDrive':if(st.sa){const soft=(m.iSaType|0)===0||!this.wkOK;this.tcurve(k,(v>0&&soft)?this.curve(v):null,s.sfx?'sa_2':'sa');if(st.sa.w)this.wp(st.sa.w,'drive',v*36,!now)}break;
   case 'iSaTone':W('sa','tone',v,1);break;case 'iSaMix':W('sa','mix',v*100,1);break;case 'iSaOut':W('sa','out',v,1);break;
   case 'iDsFreq':W('ds','freq',v,1);break;case 'iDsThr':W('ds','thresh',v,1);break;case 'iDsAmt':W('ds','amt',v,1);break;case 'iDsListen':W('ds','listen',v);break;
   case 'iMdType':W('md','type',v);break;case 'iMdRate':W('md','rate',v,1);break;case 'iMdDepth':W('md','depth',v*100,1);break;case 'iMdFb':W('md','fb',v*100,1);break;case 'iMdMix':W('md','mix',v*100,1);break;
  }
 }
 /* SOFTの曲線を差し替える。2回目の代入を拒否する厳密な実装では、WaveShaperを作り直して繋ぎ直す(音は止めない) */
 tcurve(k,c,g){g=g||'sa';const sa=this.strips[k].st[g];if(!sa)return;if(!c&&!sa.drv.curve)return;try{sa.drv.curve=c}catch(e){const n=this.ctx.createWaveShaper();n.oversample='2x';try{if(c)n.curve=c}catch(_){}sa.drv.disconnect();sa.drv=n;this.tsaRoute(k,g)}}

 /* ---- メーター(v7.0b): MIX画面を開いている間だけ解析ノードをつなぐ。音は変えない(つなぐだけ・出力には出さない) ---- */
 mAttach(k){const s=this.strips[k];if(!s||s.an)return;const a=this.ctx.createAnalyser();a.fftSize=1024;a.smoothingTimeConstant=.5;a.minDecibels=-120;s.pan.connect(a);s.an=a;s.mb=new Float32Array(a.fftSize);s.sp=new Float32Array(a.frequencyBinCount)}
 mDetach(k){const s=this.strips[k];if(!s||!s.an)return;try{s.pan.disconnect(s.an)}catch(e){}s.an=null;s.mb=null}
 meterOn(on){
  on=!!on;this.meterActive=on;if(!this.ctx)return;
  this.strips.forEach((s,k)=>{if(s)on?this.mAttach(k):this.mDetach(k)});
  if(on){if(!this.mpre&&this.n){const a=this.ctx.createAnalyser();a.fftSize=1024;a.smoothingTimeConstant=0;this.n.out.connect(a);this.mpre=a;this.mpb=new Float32Array(1024)}}
  else if(this.mpre){try{this.n.out.disconnect(this.mpre)}catch(e){}this.mpre=null;this.mpb=null}
 }
 /* トラック k のメーター値({peak,rms} dBFS。VOL・PAN の後ろ。つないでいないとき null) */
 trackMeter(k){const s=this.strips[k];if(!s||!s.an)return null;s.an.getFloatTimeDomainData(s.mb);return SD.meterDb(s.mb)}
 /* トラック k のスペクトル(dB配列・512ビン。解析FFT=1024。つないでいないとき null)。表示のためだけ */
 trackSpec(k){const s=this.strips[k];if(!s||!s.an)return null;s.an.getFloatFrequencyData(s.sp);return s.sp}
 /* マスター: peak/rms=最終段(リミッターの後ろ)・pre=マスター圧縮の前の合計のピーク(0dBを超えるとCLIP)・gr=マスターCOMPのGR(dB) */
 masterMeter(){
  if(!this.ctx||!this.an)return null;
  if(!this.mmb)this.mmb=new Float32Array(this.an.fftSize);this.an.getFloatTimeDomainData(this.mmb);const r=SD.meterDb(this.mmb);
  if(this.mpre){this.mpre.getFloatTimeDomainData(this.mpb);r.pre=SD.meterDb(this.mpb).peak}else r.pre=-90;
  r.gr=this.n&&this.n.comp&&this.n.comp.reduction!=null?this.n.comp.reduction:0;return r;
 }

 /* ---- モニター(MONO・小スピーカー風)と聞き比べの音量補正(v7.1b)。保存しない・起動時はOFF ---- */
 setMonitor(o){this.mon=Object.assign({mono:0,small:0},this.mon,o);this.monRoute();if(this.onMon)this.onMon(this.mon)}
 monOff(){this.setMonitor({mono:0,small:0})}
 monRoute(){
  const m=this.mon||{mono:0,small:0};if(!this.ctx||!this.monIn)return;const x=this.ctx;
  try{this.monIn.disconnect()}catch(e){}
  if(!this.monN){const g=x.createGain();g.channelCount=1;g.channelCountMode='explicit';g.channelInterpretation='speakers';/* 左右を合算(平均)して両耳へ */
   const hp=x.createBiquadFilter(),lp=x.createBiquadFilter();hp.type='highpass';hp.frequency.value=250;hp.Q.value=.7071;lp.type='lowpass';lp.frequency.value=5000;lp.Q.value=.7071;this.monN={mono:g,hp,lp}}
  const N=this.monN;[N.mono,N.hp,N.lp].forEach(n=>{try{n.disconnect()}catch(e){}});
  let prev=this.monIn;
  if(m.mono){prev.connect(N.mono);prev=N.mono}
  if(m.small){prev.connect(N.hp);N.hp.connect(N.lp);prev=N.lp}
  prev.connect(x.destination);
 }
 /* 聞き比べの音量補正(dB。0以下)。最終段の後ろで掛ける(リミッターの後なので上げない) */
 setCmpGain(db){this.cmpDb=Math.max(-24,Math.min(0,+db||0));if(this.cmpG)this.cmpG.gain.setTargetAtTime(Math.pow(10,this.cmpDb/20),this.ctx.currentTime,.01)}
 /* 画面用: トラック k のGR(dB。圧縮した音のゲイン低下)。COMPが無いとき null */
 trackGr(k){const q=this.gr.t&&this.gr.t[k];return q&&this.strips[k]&&this.strips[k].st.cp?q:null}
 /* トラック用の入口(シンセの bus 引数として渡す。FXつまみはトラック側からは触らない) */
 trackBus(k){
  const me=this;
  return this.tb[k]||(this.tb[k]={init:()=>me.init(),get input(){return me.strip(k).in},set(){}});
 }
 init(){
  if(this.ctx){if(this.ctx.state!=='running')this.ctx.resume();return this.ctx;}
  const C=window.AudioContext||window.webkitAudioContext;
  const x=this.ctx=new C({latencyHint:'interactive'}),G=()=>x.createGain();
  const dkD=G(),dkR=G(),mixIn=G(),ins=G(),drv=x.createWaveShaper(),dry=G(),dly=x.createDelay(4),dly2=x.createDelay(4),dsend=G(),dIn=G(),dgA=G(),dgB=G(),dsum=G(),dshp=x.createWaveShaper(),fb=G(),dlp=x.createBiquadFilter(),dmix=G(),
        pre=x.createDelay(.5),cA=x.createConvolver(),cB=x.createConvolver(),gA=G(),gB=G(),rmix=G(),out=G(),comp=x.createDynamicsCompressor(),lim=x.createDynamicsCompressor(),an=x.createAnalyser();
  [mixIn,ins,dIn].forEach(q=>{q.channelCount=2;q.channelCountMode='explicit'});this.mixIn=mixIn;
  drv.oversample='2x';dlp.type='lowpass';dlp.frequency.value=4500;gB.gain.value=0;dgB.gain.value=0;dshp.curve=this.softCurve();
  /* ミックス→(ONのINSERTだけ)→ins→ dry / DELAY / REVERB。INSERTが全部OFFのときは v3.0 と同じ接続 */
  mixIn.connect(ins);ins.connect(dry);dry.connect(out);
  /* DELAY: ins→送り→dIn→(線A・線B)→dsum→dmix。帰還は dsum→トーン→ソフトクリップ→fb→dIn。線Bは DIGITAL のクロスフェード用(TAPEでは無音) */
  ins.connect(dsend);dsend.connect(dIn);dIn.connect(dly);dIn.connect(dly2);dly.connect(dgA);dly2.connect(dgB);dgA.connect(dsum);dgB.connect(dsum);
  dsum.connect(dlp);dlp.connect(dshp);dshp.connect(fb);fb.connect(dIn);dsum.connect(dmix);dmix.connect(dkD);dkD.connect(out);
  ins.connect(pre);pre.connect(cA);pre.connect(cB);cA.connect(gA);cB.connect(gB);gA.connect(rmix);gB.connect(rmix);rmix.connect(dkR);dkR.connect(out);
  out.connect(comp);comp.connect(lim);lim.connect(an);
  /* モニター(v7.1b): 最終段(リミッターの後)から聴く用の分岐だけを変える。メーター(an)は影響を受けない。cmpG=聞き比べの音量補正 */
  const cmpG=G(),monIn=G();[cmpG,monIn].forEach(q=>{q.channelCount=2;q.channelCountMode='explicit'});lim.connect(cmpG);cmpG.connect(monIn);monIn.connect(x.destination);this.cmpG=cmpG;this.monIn=monIn;
  comp.threshold.value=-10;comp.knee.value=12;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.15;
  /* 音量の安全策: 最終段の簡易リミッター(ワークレットが使えるときは先読みリミッターに差し替える) */
  lim.threshold.value=-3;lim.knee.value=0;lim.ratio.value=20;lim.attack.value=.001;lim.release.value=.08;
  an.fftSize=2048;an.smoothingTimeConstant=.6;an.minDecibels=-90;an.maxDecibels=-10;
  this.n={dkD,dkR,drv,ins,dly,dly2,dsend,dIn,dgA,dgB,dsum,dshp,dlp,fb,dmix,pre,cA,cB,gA,gB,rmix,out,comp,lim,an};this.an=an;this.rvA=true;Object.keys(this.st||{}).forEach(k=>{const q=this.st[k];if(q&&q.unlink){try{q.unlink()}catch(e){}}});this.st={};this.vcK=null;this.sig='';this.rvC=0;this.rvPrev=undefined;/* RP-1b: 新しいグラフは SEND の接続 */
  SD.FXIDS.forEach(id=>{if(this.p[id]!==undefined)this.set(id,this.p[id]);});
  this.applyDelay(true);this.strip(0);this.loadWk();this.monRoute();this.setCmpGain(this.cmpDb||0);if(this.meterActive)this.meterOn(true);
  if(x.state!=='running')x.resume();
  return x;
 }
 val(id){const v=this.p[id];return v!==undefined?v:(SD.FXDEF&&SD.FXDEF[id]!==undefined?SD.FXDEF[id]:(SD.DEF||{})[id])}
 /* ---- AudioWorklet(Blob URLで1回だけ登録)。使えない環境は fxUnsup=true(該当エフェクトは素通し) ---- */
 loadWk(){
  if(this.wkP)return this.wkP;const x=this.ctx;
  if(!x.audioWorklet||typeof AudioWorkletNode==='undefined'||typeof Blob==='undefined'||!SD.FXWSRC){this.fxUnsup=true;return this.wkP=Promise.resolve(false)}
  let url;
  try{const src=Object.keys(SD.FXWSRC).map(k=>'(function(){'+SD.FXWSRC[k]+'\n})();').join('\n');url=URL.createObjectURL(new Blob([src],{type:'application/javascript'}))}catch(e){this.fxUnsup=true;return this.wkP=Promise.resolve(false)}
  return this.wkP=x.audioWorklet.addModule(url).then(()=>{this.wkOK=true;this.useLimiter();this.sig='';this.chk();this.strips.forEach((q,k)=>{if(q)this.tchk(k)});this.buses.forEach((q,b)=>{if(q)this.bchk(b)});return true}).catch(()=>{this.fxUnsup=true;return false});
 }
 wnode(name,opt){return new AudioWorkletNode(this.ctx,name,Object.assign({numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'},opt||{}))}
 wp(node,name,v,smooth){const p=node.parameters.get(name);if(!p)return;if(smooth)p.setTargetAtTime(v,this.ctx.currentTime,.02);else p.value=v}
 useLimiter(){
  try{const n=this.n,w=this.wnode('sd-limiter');this.wp(w,'ceiling',-1);this.wp(w,'release',80);
   n.comp.disconnect(n.lim);n.lim.disconnect();n.comp.connect(w);w.connect(this.cmpG);w.connect(n.an);n.lim=w;w.port.onmessage=m=>{this.gr.lim=m.data.gr}}catch(e){}
 }
 /* ---- INSERTチェーン(固定順 gt→eq→sa→md→cp)。ONのものだけ作って接続する ---- */
 act(k){
  const v=id=>this.val(id);
  switch(k){
   case 'gt':return v('gtOn')==1&&this.wkOK;
   case 'eq':return v('eqOn')==1;
   case 'sa':return v('saType')>0?!!this.wkOK:v('drive')>0;
   case 'af':return v('afOn')==1&&this.wkOK;
   case 'dj':return v('djOn')==1;
   case 'md':return v('mdOn')==1&&this.wkOK;
   case 'tr':return v('trOn')==1&&this.wkOK;
   case 'sw':return v('swOn')==1&&this.wkOK;
   case 'cp':return v('cpOn')==1&&this.wkOK;
   case 'bc':return v('bcOn')==1&&this.wkOK;
   case 'rm':return v('rmOn')==1&&this.wkOK;
   case 'ts':return v('tsOn')==1&&this.wkOK;
   case 'rv':return v('rvbPos')==1;/* RP-1a */
  }
  const r=SD.FXR.find(q=>q.k===k&&q.wn);/* FX-0: SD.fxAdd で足した項目(ワークレット+ONつまみ) */
  if(r)return v(r.on)==1&&!!this.wkOK;
  return false;
 }
 /* 接続の組み替えが要るときだけ rewire(つまみを回すたびには組み替えない) */
 chk(){
  if(!this.ctx)return;
  const o=SD.fxOrdNorm(this.fxo),sig=o.map(k=>k+(this.act(k)?1:0)).join('');
  if(sig!==this.sig){this.sig=sig;const os=o.join(),rvn=this.act('rv')?1:0,rvch=this.rvPrev!==undefined&&this.rvPrev!==rvn,ch=(this.oSig!==undefined&&this.oSig!==os&&this.live>0)||rvch;this.rvPrev=rvn;this.oSig=os;if(ch&&this.canFadeM())this.fadeRewireM();else if(!this.fdM)this.rewire()}
 }
 /* OR-2a: ラックの並び(null=既定)。順序だけが変わったときは約10ms×2のフェードで張り替える(トラックと同じ流儀) */
 setFxOrd(a){this.fxo=SD.fxOrdSave(a);this.chk()}
 canFadeM(){const g=this.mixIn&&this.mixIn.gain,x=this.ctx;return !!g&&typeof g.cancelScheduledValues==='function'&&typeof g.linearRampToValueAtTime==='function'&&typeof x.startRendering!=='function'&&x.state==='running'&&typeof setTimeout==='function'}
 fadeRewireM(){const x=this.ctx,g=this.mixIn.gain,FD=this.fadeMs||10;if(this.fdM)return;const t=x.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+FD/1000);
  this.fdM=setTimeout(()=>{this.fdM=null;if(!this.ctx)return;this.rewire();const t2=x.currentTime;g.cancelScheduledValues(t2);g.setValueAtTime(0,t2);g.linearRampToValueAtTime(1,t2+FD/1000)},FD+2)}
 rewire(){
  const x=this.ctx;if(!x)return;const n=this.n,live=[],ord=SD.fxOrdNorm(this.fxo);this.oSig=ord.join();
  ord.forEach(k=>{if(!this.act(k))return;if(!this.st[k]){this.st[k]=this['mk_'+k]?this['mk_'+k]():this.mkGen(k);if(k!=='rv')this.initStage(k)}live.push(this.st[k])});
  n.mixIn=n.mixIn||this.mixIn;this.mixIn.disconnect();Object.keys(this.st).forEach(k=>this.st[k].out.disconnect());
  let prev=this.mixIn;live.forEach(s=>{prev.connect(s.in);prev=s.out});prev.connect(n.ins);
  /* RP-1b: REVERB が CHAIN(チェーンの一員)のとき、ins→pre を切って dkR の出口をステージの出口へ。SEND に戻るときは元に戻す */
  const rvS=this.st.rv&&live.indexOf(this.st.rv)>=0?this.st.rv:null;
  if(rvS){if(!this.rvC){try{n.ins.disconnect(n.pre)}catch(e){}this.rvC=1}n.dkR.disconnect();n.dkR.connect(rvS.out)}
  else if(this.rvC){n.ins.connect(n.pre);n.dkR.disconnect();n.dkR.connect(n.out);this.rvC=0}
  this.live=live.length;this.vcWire();
 }
 initStage(k){const f=SD.FXR.find(r=>r.k===k);f.ids.forEach(id=>this.up(id));if(k==='sa')this.up('drive')}
 /* FX-0: SD.fxAdd で足した項目の既定の作り方(ワークレット1つ。専用の配線が要るものは mk_<k> を足す) */
 mkGen(k){const r=SD.FXR.find(q=>q.k===k),w=this.wnode(r.wn);this.wp(w,'enabled',1);return{in:w,out:w,w}}
 /* FX-3b: 拍同期のワークレット。拍位置の送り先につなぐ(外す関数は unlink。作り直すとき・捨てるときに呼ぶ) */
 /* RP-1b: REVERB のチェーン用ステージ。in→dry→out(原音)と in→pre(残響の入口)。残響の戻り(dkR)は rewire でこの out へ付け替える */
 mk_rv(){const x=this.ctx,G=()=>{const g=x.createGain();g.channelCount=2;g.channelCountMode='explicit';return g},i=G(),o=G(),dry=G();dry.gain.value=this.val('rvbDry');i.connect(dry);dry.connect(o);i.connect(this.n.pre);return{in:i,out:o,dry}}
 mk_rb(){const w=this.wnode('sd-reverse');this.wp(w,'enabled',1);return{in:w,out:w,w,unlink:this.beatLink(w)}}
 mk_gl(){const w=this.wnode('sd-glitch');this.wp(w,'enabled',1);return{in:w,out:w,w,unlink:this.beatLink(w)}}
 mk_vc(){const w=this.wnode('sd-vocoder',{numberOfInputs:2});this.wp(w,'enabled',1);return{in:w,out:w,w}}
 mk_gt(){const w=this.wnode('sd-gate');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 mk_eq(){
  const x=this.ctx,B=(t)=>{const f=x.createBiquadFilter();f.type=t;return f},hpf=B('highpass'),lo=B('lowshelf'),mid=B('peaking'),hi=B('highshelf'),lpf=B('lowpass');
  hpf.Q.value=-3.0103;lpf.Q.value=-3.0103;lo.frequency.value=200;hi.frequency.value=4000;
  hpf.connect(lo);lo.connect(mid);mid.connect(hi);hi.connect(lpf);return{in:hpf,out:lpf,hpf,lo,mid,hi,lpf};
 }
 mk_sa(){const x=this.ctx,sin=x.createGain(),sout=x.createGain();[sin,sout].forEach(q=>{q.channelCount=2;q.channelCountMode='explicit'});const s={in:sin,out:sout,sin,sout,w:null};this.st.sa=s;this.saRoute();return s}
 saRoute(){
  const s=this.st.sa;if(!s)return;const t=this.val('saType')|0;
  s.sin.disconnect();this.n.drv.disconnect();
  if(t===0||!this.wkOK){s.sin.connect(this.n.drv);this.n.drv.connect(s.sout)}
  else{if(!s.w){s.w=this.wnode('sd-saturator');this.wp(s.w,'enabled',1)}s.sin.connect(s.w);s.w.connect(s.sout)}
 }
 mk_af(){const w=this.wnode('sd-autofilter');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 mk_tr(){const w=this.wnode('sd-tremolo');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 mk_bc(){const w=this.wnode('sd-bitcrush');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 mk_rm(){const w=this.wnode('sd-ringmod');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 mk_ts(){const w=this.wnode('sd-tapestop');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 /* TAPE STOP のトリガー: down=true で tsTime かけて速度を0へ / false で加速して tsSpeed(つまみの値)へ戻る */
 tsTrig(down){
  const s=this.st&&this.st.ts;if(!s||!s.w||!this.ctx)return false;const p=s.w.parameters.get('speed'),t=this.ctx.currentTime,tm=Math.max(.05,this.val('tsTime'));
  if(p.cancelScheduledValues)p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);
  if(down)p.linearRampToValueAtTime(0,t+tm);else p.linearRampToValueAtTime(this.val('tsSpeed'),t+Math.min(.4,tm));
  return true;
 }
 mk_sw(){const w=this.wnode('sd-width');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 /* DJ FILTER: 素通し(dry)と フィルター(wet: HPF→LPF)の2経路。中央付近は dry だけ */
 mk_dj(){
  const x=this.ctx,G=()=>{const g=x.createGain();g.channelCount=2;g.channelCountMode='explicit';return g},B=t=>{const f=x.createBiquadFilter();f.type=t;f.Q.value=-3.0103;return f},
   i=G(),o=G(),dry=G(),wet=G(),hp=B('highpass'),lp=B('lowpass');wet.gain.value=0;hp.frequency.value=10;lp.frequency.value=Math.min(20000,.45*x.sampleRate);
  i.connect(dry);dry.connect(o);i.connect(hp);hp.connect(lp);lp.connect(wet);wet.connect(o);return{in:i,out:o,dry,wet,hp,lp};
 }
 djApply(){
  const s=this.st.dj;if(!s)return;const x=this.ctx,t=x.currentTime,S=(a,val)=>a.setTargetAtTime(val,t,.02),v=this.val('djFilter'),a=Math.abs(v),res=this.val('djRes'),fm=Math.min(20000,.45*x.sampleRate),flat=-3.0103,rq=flat+res*18;
  const mid=a<.015;S(s.dry.gain,mid?1:0);S(s.wet.gain,mid?0:1);
  if(mid){S(s.hp.frequency,10);S(s.lp.frequency,fm);s.hp.Q.value=flat;s.lp.Q.value=flat;return}
  if(v<0){S(s.lp.frequency,fm*Math.pow(60/fm,a));S(s.hp.frequency,10);s.lp.Q.value=rq;s.hp.Q.value=flat}
  else{S(s.hp.frequency,20*Math.pow(400,a));S(s.lp.frequency,fm);s.hp.Q.value=rq;s.lp.Q.value=flat}
 }
 mk_md(){const w=this.wnode('sd-modfx');this.wp(w,'enabled',1);return{in:w,out:w,w}}
 /* FX-1c: マルチバンドのGR(低・中・高。dB・抑えているときはマイナス)を画面へ */
 mk_mb(){const w=this.wnode('sd-mbcomp');this.wp(w,'enabled',1);w.port.onmessage=e=>{if(e.data&&e.data.gr)this.gr.mb=e.data.gr};return{in:w,out:w,w}}
 mbGr(){return this.st&&this.st.mb&&this.gr.mb?this.gr.mb:null}
 mk_cp(){const w=this.wnode('sd-comp'),m=this.ctx.createGain();this.wp(w,'active',1);w.connect(m);w.port.onmessage=e=>{this.gr.cp=e.data.gr};return{in:w,out:m,w,m}}
 /* つまみ値をノードへ反映 */
 up(id){
  const v=this.val(id),t=this.ctx.currentTime,S=(a,val)=>a.setTargetAtTime(val,t,.02),st=this.st,W=(k,n,val,sm)=>{if(st[k]&&st[k].w)this.wp(st[k].w,n,val,sm)};
  switch(id){
   case 'gtThr':W('gt','threshold',v,1);break;case 'gtHold':W('gt','hold',v,1);break;case 'gtRel':W('gt','release',v,1);break;case 'gtRange':W('gt','range',v,1);break;
   case 'eqHpf':if(st.eq)S(st.eq.hpf.frequency,v);break;case 'eqLpf':if(st.eq)S(st.eq.lpf.frequency,v);break;
   case 'eqLo':if(st.eq)S(st.eq.lo.gain,v);break;case 'eqMid':if(st.eq)S(st.eq.mid.gain,v);break;
   case 'eqMidF':if(st.eq)S(st.eq.mid.frequency,v);break;case 'eqMidQ':if(st.eq)S(st.eq.mid.Q,v);break;case 'eqHi':if(st.eq)S(st.eq.hi.gain,v);break;
   case 'saType':this.saRoute();if(st.sa&&st.sa.w)this.wp(st.sa.w,'type',Math.max(0,v-1));this.up('drive');break;
   case 'drive':this.n.drv.curve=(v>0&&!(this.val('saType')>0&&this.wkOK))?this.curve(v):null;if(st.sa&&st.sa.w)this.wp(st.sa.w,'drive',v*36,1);break;
   case 'saTone':W('sa','tone',v,1);break;case 'saMix':W('sa','mix',v*100,1);break;case 'saOut':W('sa','out',v,1);break;
   case 'afType':W('af','type',v);break;case 'afCut':W('af','cutoff',v,1);break;case 'afRes':W('af','res',v,1);break;case 'afMode':W('af','mode',v);break;case 'afShape':W('af','shape',v);break;
   case 'afDepth':W('af','depth',v,1);break;case 'afSens':W('af','sens',v,1);break;case 'afAtk':W('af','attack',v,1);break;case 'afRel':W('af','release',v,1);break;
   case 'afRate':case 'afSync':case 'afDiv':W('af','rate',this.lfoHz('af'),1);break;
   case 'djFilter':case 'djRes':this.djApply();break;
   case 'trMode':W('tr','mode',v);break;case 'trShape':W('tr','shape',v);break;case 'trDepth':W('tr','depth',v,1);break;case 'trSpread':W('tr','spread',v,1);break;
   case 'trRate':case 'trSync':case 'trDiv':W('tr','rate',this.lfoHz('tr'),1);break;
   case 'bcBits':W('bc','bits',v,1);break;case 'bcRate':W('bc','rate',v,1);break;case 'bcMix':W('bc','mix',v,1);break;
   case 'rmFreq':W('rm','freq',v,1);break;case 'rmMix':W('rm','mix',v,1);break;case 'rmShape':W('rm','shape',v);break;
   case 'tsSpeed':W('ts','speed',v,1);break;
   case 'swWidth':W('sw','width',v,1);break;
   case 'mdType':W('md','type',v);break;case 'mdRate':W('md','rate',v,1);break;case 'mdDepth':W('md','depth',v*100,1);break;case 'mdFb':W('md','fb',v*100,1);break;case 'mdMix':W('md','mix',v*100,1);break;
   case 'cpModel':W('cp','model',v);break;case 'cpThr':W('cp','thresh',v,1);break;case 'cpRatio':W('cp','ratio',v,1);break;case 'cpAtk':W('cp','attack',v,1);break;case 'cpRel':W('cp','release',v,1);break;
   case 'cpMake':if(st.cp)S(st.cp.m.gain,Math.pow(10,v/20));break;
   default:{const m=SD.FXMAP&&SD.FXMAP[id];if(m)W(m[0],m[1],m[2]?m[2](v):v,m[3])}/* FX-0 */
  }
 }
 set(id,v){
  this.p[id]=v;if(!this.ctx)return;
  if(this.schedPre)this.schedPre('M',id);
  const x=this.ctx,t=x.currentTime,n=this.n,S=(a,val)=>a.setTargetAtTime(val,t,.02);
  switch(id){
   case 'dlyTime':case 'dlySync':case 'dlyDiv':case 'dlyMode':this.applyDelay();break;
   case 'dlyFb':S(n.fb.gain,v);if(n.pp){S(n.pp.f1.gain,v);S(n.pp.f2.gain,v)}break;
   case 'dlyTone':S(n.dlp.frequency,v);if(n.pp){S(n.pp.l1.frequency,v);S(n.pp.l2.frequency,v)}break;
   case 'dlyPP':this.applyPP();break;
   case 'dlyMix':S(n.dmix.gain,v);break;
   case 'rvbSize':case 'rvbType':case 'rvbDamp':clearTimeout(this.rt);this.rt=setTimeout(()=>this.makeRvb(),this.rinit?150:0);this.rinit=1;break;
   case 'rvbPre':S(n.pre.delayTime,v/1000);break;
   case 'rvbMix':S(n.rmix.gain,v*1.5);break;
   case 'rvbDry':if(this.st.rv&&this.st.rv.dry)S(this.st.rv.dry.gain,v);break;/* RP-2: CHAIN のステージだけ。SEND では st.rv が無い=無効 */
   case 'master':S(n.out.gain,v*.8);break;
   case 'dlDuckOn':if(!v)this.retReset('dl');break;case 'rvDuckOn':if(!v)this.retReset('rv');break;case 'dlDuckSrc':case 'dlDuckDepth':case 'rvDuckSrc':case 'rvDuckDepth':case 'rtDuckAtk':case 'rtDuckHold':case 'rtDuckRel':break;
   default:this.up(id);this.chk();
  }
  if(id==='drive'||id==='saType')this.chk();
  if(id==='vcSrc'||id==='vcOn')this.vcWire();
 }
 /* テンポ(BPM)。同期のDELAY・LFOの周期を作り直す */
 setBpm(b){this.bpm=b;if(SD.beat)SD.beat.setBpm(b,this.ctx?this.ctx.currentTime:0);if(!this.ctx)return;this.applyDelay();this.up('afRate');this.up('trRate')}
 /* 拍同期(FX-3a): 拍同期のワークレット(リバース・グリッチ)を拍位置の送り先につなぐ。戻り値=外す関数(ノードを捨てるときに呼ぶ) */
 beatLink(w){return SD.beat?SD.beat.attach(m=>{try{w.port.postMessage({beat:m})}catch(e){}}):function(){}}
 lfoHz(k){const sy=this.val(k+'Sync')==1,b=SD.DIVS[this.val(k+'Div')|0]||.5;return Math.max(.01,Math.min(40,sy?this.bpm/60/b:this.val(k+'Rate')))}
 dlySec(){return this.val('dlySync')==1?Math.max(.005,Math.min(3.9,60/this.bpm*(SD.DIVS[this.val('dlyDiv')|0]||.5))):Math.max(.005,Math.min(3.9,this.val('dlyTime')))}
 /* DELAYの時間を反映。TAPE=時間を動かすとピッチが滑る / DIGITAL=もう一方の線に時間をセットしてクロスフェード(滑らない) */
 applyDelay(now){
  const n=this.n;if(!n||!n.dly)return;const x=this.ctx,t=x.currentTime,tm=this.dlySec(),dig=this.val('dlyMode')==1,S=(a,val)=>now?(a.value=val):a.setTargetAtTime(val,t,.02);
  const A=n.dly.delayTime,B=n.dly2.delayTime,ga=n.dgA.gain,gb=n.dgB.gain;
  if(!dig){
   if(this.dact){this.dact=0;ga.setTargetAtTime(1,t,.012);gb.setTargetAtTime(0,t,.012)}
   S(A,tm);B.value=tm;this.dcur=tm;
  }else{
   const act=this.dact?B:A,idle=this.dact?A:B,gact=this.dact?gb:ga,gidle=this.dact?ga:gb;
   if(this.dcur===null||now){A.value=tm;B.value=tm;this.dcur=tm;return}
   if(Math.abs(tm-this.dcur)>.002){idle.value=tm;gact.setTargetAtTime(0,t,.012);gidle.setTargetAtTime(1,t,.012);this.dact=this.dact?0:1;this.dcur=tm}
   else{act.setTargetAtTime(tm,t,.02)}
  }
  if(n.pp){S(n.pp.dL.delayTime,tm);S(n.pp.dR.delayTime,tm)}
 }
 /* PING-PONG: 入力をモノにして左の線へ。左→右→左…と交互に、左右へ振り分ける。ONにするとき初めてノードを作る */
 mkPP(){
  const x=this.ctx,n=this.n,G=()=>x.createGain(),D=()=>x.createDelay(4),L=()=>{const f=x.createBiquadFilter();f.type='lowpass';f.frequency.value=this.val('dlyTone');return f},
   g=G(),inn=G(),dL=D(),dR=D(),l1=L(),l2=L(),s1=x.createWaveShaper(),s2=x.createWaveShaper(),f1=G(),f2=G(),mg=x.createChannelMerger(2),o=G();
  inn.channelCount=1;inn.channelCountMode='explicit';g.gain.value=0;s1.curve=this.softCurve();s2.curve=this.softCurve();f1.gain.value=this.val('dlyFb');f2.gain.value=this.val('dlyFb');
  n.ins.connect(g);g.connect(inn);inn.connect(dL);dL.connect(l1);l1.connect(s1);s1.connect(f1);f1.connect(dR);dR.connect(l2);l2.connect(s2);s2.connect(f2);f2.connect(dL);
  dL.connect(mg,0,0);dR.connect(mg,0,1);mg.connect(o);o.connect(n.dmix);
  n.pp={g,inn,dL,dR,l1,l2,s1,s2,f1,f2,mg,o};this.applyDelay(true);
 }
 applyPP(){
  const n=this.n,on=this.val('dlyPP')==1,t=this.ctx.currentTime;if(on&&!n.pp)this.mkPP();
  n.dsend.gain.setTargetAtTime(on?0:1,t,.02);if(n.pp)n.pp.g.gain.setTargetAtTime(on?1:0,t,.02);
 }
 /* ディレイ帰還のソフトクリップ(0.8まではそのまま。超えた分をなめらかに頭打ち=発振防止) */
 softCurve(){const N=2049,c=new Float32Array(N),k=.8;for(let i=0;i<N;i++){const x=i/(N-1)*2-1,a=Math.abs(x),y=a<=k?a:k+(1-k)*Math.tanh((a-k)/(1-k));c[i]=x<0?-y:y}return c}
 curve(a){const N=2048,c=new Float32Array(N),k=1+a*12,m=Math.tanh(k);for(let i=0;i<N;i++){const t=i/(N-1)*2-1;c[i]=Math.tanh(t*k)/m;}return c;}
 /* IRの差し替えは2本のConvolverをクロスフェード(ぷつ音を出さない) */
 makeRvb(){
  const x=this.ctx,n=this.n,type=this.val('rvbType')|0,size=this.val('rvbSize');let b;
  if(!type||!window.FxDSP){const len=Math.max(1,Math.floor(x.sampleRate*size));b=x.createBuffer(2,len,x.sampleRate);
   for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}}
  else{const m=window.FxDSP.generateImpulse(x.sampleRate,{type:['','room','hall','plate'][type],decay:size,damp:this.val('rvbDamp')*100,seed:0});
   b=x.createBuffer(2,m.L.length,x.sampleRate);b.getChannelData(0).set(m.L);b.getChannelData(1).set(m.R);}
  const to=this.rvA?n.cB:n.cA,go=this.rvA?n.gB:n.gA,from=this.rvA?n.gA:n.gB,t=x.currentTime;
  to.buffer=b;go.gain.setTargetAtTime(1,t,.03);from.gain.setTargetAtTime(0,t,.03);this.rvA=!this.rvA;
 }
};
SD.bus=new SD.Bus();
