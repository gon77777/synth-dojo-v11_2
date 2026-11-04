(function(){
'use strict';
const $=s=>document.querySelector(s);
const E=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ST=SD.store,SYN={analog:new SD.Synth(SD.bus),fm:new SD.FM(SD.bus),add:new SD.ADD(SD.bus),wt:new SD.WT(SD.bus),mod:new SD.Mod(SD.bus),gr:new SD.GR(SD.bus),smp:new SD.SmpPlay(SD.bus)};
let syn=SYN.analog;
/* 演奏エンジン(ARP/SEQ)。発音は現在のシンセへ。先読み予約→setTimeoutで時刻に発音 */
/* トラックの PITCH(半音・連続)は次に鳴らす音から反映。鳴らした時の値を覚えて、止めるときに同じ音を止める */
const POFF={};
function pitchOf(k){const x=play.tr[k==null?0:k];return x&&x.mix&&x.mix.tPitch||0}
const play=new SD.Play({now:()=>SD.bus.ctx?SD.bus.ctx.currentTime:null,tempo:b=>SD.bus.setBpm(b),beat:(t,b,bpm)=>SD.beat.at(t,b,bpm),beatStart:(t,bpm)=>SD.beat.start(t,bpm),beatStop:()=>SD.beat.stop(SD.bus.ctx?SD.bus.ctx.currentTime:0),duck:(k,t)=>SD.bus.duck(k,t),duckClear:()=>SD.bus.duckReset(),scNeed:k=>SD.bus.scNeed(k),keyMute:(k,on)=>SD.bus.keyMute(k,on),keyClear:()=>SD.bus.keyClear(),on:(m,v,f,k)=>{const o=pitchOf(k);POFF[(k==null?'s':k)+':'+m]=o;return(k==null?syn:teng(k)).noteOn(m+o,v,f!=null?f+o:f)},off:(m,k)=>{const key=(k==null?'s':k)+':'+m,o=POFF[key]||0;delete POFF[key];return(k==null?syn:teng(k)).noteOff(m+o)},
 sched:(fn,t)=>setTimeout(fn,Math.max(0,(t-SD.bus.ctx.currentTime)*1000)),unsched:id=>clearTimeout(id),click:(t,acc)=>{const c=SD.bus.ctx;if(!c)return;try{const o=c.createOscillator(),g=c.createGain(),T=Math.max(t,c.currentTime);o.frequency.value=acc?1500:1000;g.gain.setValueAtTime(acc?.22:.12,T);g.gain.exponentialRampToValueAtTime(.001,T+.04);o.connect(g);g.connect(c.destination);o.start(T);o.stop(T+.05)}catch(e){}}});
const PP={el:null,sps:null,trs:null};
/* トラック用エンジン(TRKモード): トラックごとに独立したシンセのインスタンスを持つ。FXは共通バスなのでトラック側からは触らない */
const TE=[];
function teng(k){const x=play.tr[k];let t=TE[k];
 if(!t||t.synth!==x.synth){if(t)t.e.allOff();const C={analog:SD.Synth,fm:SD.FM,add:SD.ADD,wt:SD.WT,mod:SD.Mod,gr:SD.GR,smp:SD.SmpPlay}[x.synth];t=TE[k]={synth:x.synth,e:new C(SD.bus.trackBus(k))};t.e.setPatch(x.patch||{})}
 return t.e}
function trkResync(k){const t=TE[k],x=play.tr[k];if(!t)return;if(t.synth===x.synth)t.e.setPatch(x.patch||{});else{t.e.allOff();delete TE[k]}}
function trkReset(){TE.forEach(t=>{try{t.e.allOff()}catch(e){}});TE.length=0;syncMix()}
/* トラックのミキサー値(VOL・PAN)をバスへ反映。非TRKのシンセはトラック1のストリップを使う */
/* OR-1c: 並び順(上→下の順に通る)。▲▼で入れ替え。ord は mix.ord に持つ(旧データは持たない=従来順) */
function ordHtml(x,k){const ord=SD.ordOf(x.mix);return `<div class="sub">並び順(上から下へ通る)</div>`+ord.map((gk,i)=>{const g0=SD.INSG.find(q=>q.k===SD.slotBase(gk)),sx=SD.slotSfx(gk),g=Object.assign({},g0,{name:g0.name+(sx?' 2':'')});/* OR-3b: 2段目は名前に ' 2' */return `<div class="mxr"><span class="lb2">${i+1} ${g.name}${x.mix[g.on+sx]?' ●':''}</span><button class="pb" data-act="insMv" data-t="${k}" data-i="${i}" data-d="-1" ${i?'':'disabled'} aria-label="${g.name}を上へ">▲</button><button class="pb" data-act="insMv" data-t="${k}" data-i="${i}" data-d="1" ${i<ord.length-1?'':'disabled'} aria-label="${g.name}を下へ">▼</button>${sx?`<button class="pb" data-act="insDel" data-t="${k}" data-g="${gk}" aria-label="${g.name}を削除">×</button>`:`<button class="pb" data-act="insAdd" data-t="${k}" data-g="${gk}" ${SD.ordCanAdd(ord,gk)?'':'disabled'} aria-label="${g.name}の2段目を追加">+</button>`}</div>`}).join('')+`<button class="pb" data-act="insRst" data-t="${k}">従来の順に戻す</button><span class="pv">${ord.length}/${SD.SLOTMAX}</span><div class="hint">並べ替えると、短いフェードでつなぎ替えます。ON/OFFの切り替えとは別です。オートメーションでは動かせません。</div>`}
/* OR-3d: 2段目の追加(+)・削除(×)。追加は既定値+ONで入れる/削除は _2 のつまみ値を捨てる(再追加は既定から) */
function insAdd(k,g){const x=play.tr[k];if(!x)return;const o=SD.ordOf(x.mix);if(!SD.ordCanAdd(o,g)){toast('これ以上は追加できません(各グループ2段まで・合計'+SD.SLOTMAX+'つまで)');return}
 SD.INSP.filter(q=>q.ins===g).forEach(q=>{const d=SD.insDef(q.id+'_2');x.mix[d.id]=d.def;if(SD.bus.mix[k])SD.bus.mix[k][d.id]=d.def});
 const G=SD.INSG.find(q=>q.k===g);if(G){x.mix[G.on+'_2']=1;if(SD.bus.mix[k])SD.bus.mix[k][G.on+'_2']=1}
 insOrd(k,SD.ordAdd(o,g))}
function insDel(k,gk){const x=play.tr[k];if(!x||!SD.slotSfx(gk))return;const o=SD.ordRemove(SD.ordOf(x.mix),gk);insOrd(k,o);
 Object.keys(x.mix).forEach(id=>{if(/_2$/.test(id)&&SD.slotBase(gk)===(SD.insDef(id)||{}).ins){delete x.mix[id];if(SD.bus.mix[k])delete SD.bus.mix[k][id]}});
 if(SD.slotBase(gk)==='cp')SD.bus.setMix(k,'iCpSc_2',0)/* 配線を張り直す */}
function insOrd(k,ord){const x=play.tr[k];x.mix.ord=ord.slice();x.mix.iOrd=ord.indexOf('cp')<ord.indexOf('eq')?1:0;if(SD.bus.mix[k])SD.bus.mix[k].iOrd=x.mix.iOrd;SD.bus.setMix(k,'ord',ord)}
function syncMix(){SD.bus.setFxOrd(play.fxo);/* OR-2a: ラックの並び(読み込み時) */play.tr.forEach((x,k)=>{SD.MIXALL().forEach(p=>SD.bus.setMix(k,p.id,x.mix[p.id]));Object.keys(x.mix).forEach(id=>{if(/_2$/.test(id))SD.bus.setMix(k,id,x.mix[id])});/* OR-3b: 2段目のつまみ */SD.bus.setMix(k,'ord',x.mix.ord||null)});syncBus()}/* OR-1b: ord は iOrd の後に(iOrd が ord を消すため) */
function syncBus(){play.bm.forEach((m,b)=>SD.BUSP.forEach(p=>SD.bus.setBusMix(b,p.id,m[p.id])))}

/* ---------- オートメーション(v3.5): つまみの動きをレーンに描き、▶と同時に再生 ---------- */
const AUG=()=>SD.Auto.gridTick(play.au,AU.grid);/* MT-3b: GRID『1小節』は現在の拍子の1小節(auto.js の gridTick) */
const AU={sel:0,shape:'ramp_up',perBar:1,lo:0,hi:1,seed:1,pend:{},raf:0};
/* レッスン中: 聞き比べ・お手本は S.cmpAu(一時のレーン)で上書き。オートメーションを使わないレッスンではエンジンを止める */
const auStep=s=>!!(s.au||s.lane||s.bars||s.clr==='au'||s.ref);
const auLesson=L=>!!L&&L.steps.some(auStep);
function auView(){return S.lesson?(auLesson(S.lesson)?(S.cmpAu||play.au):null):play.au}
const AUMIX=['tVol','tPan','tPitch','tDly','tRvb','dkDepth'];
function auSynth(trk){return S.mode==='trk'&&typeof trk==='number'?play.tr[trk].synth:S.synth}
function autoRack(trk){const k=S.mode==='trk'&&typeof trk==='number'?trk:-1;if(k>=0)return play.tr[k]&&play.tr[k].synth==='mod'?teng(k):null;return S.synth==='mod'?syn:null}
function autoDef(trk,id){
 if(id==='sBpm'||id==='sSwing')return SD.PLAYP[id];
 if(AUMIX.indexOf(id)>=0)return SD.MIXP.find(p=>p.id===id);
 if(SD.insDef(id))return typeof trk==='number'?SD.insDef(id):null;/* v8.4: インサート(EQ4・COMP)。トラックのつまみだけ。auto:false は呼び出し側で拒否 */
 if(id.indexOf('.')>0&&SD.modLib){/* MA-1/2: モジュラーのつまみ('vcf1.cutoff')は ID の先頭の種類で定義が決まる。いまのラックにそのモジュールが無ければ null(孤児=再生・REC・MIDIの対象外。レーンの点は残る) */
  const e=autoRack(trk);return e&&SD.modLib.exists(e.st(),id)?SD.modLib.knobDef(id):null}
 const d=SD.defs[auSynth(trk)];return d&&d.byId[id]||null}
SD.modPre=id=>{const S_=SD.sched;if(S_&&S_.K)for(const k in S_.K)if(k.slice(k.indexOf(':')+1)===id)S_.release(k,SD.bus.ctx?SD.bus.ctx.currentTime:0)};/* SS-5b: 旧方式の書き込み(set/applyAll)の前に、そのつまみの曲線を取り消す */
function autoSet(trk,id,val){
 if(id==='sBpm'||id==='sSwing'){play.setV(id,val);AU.pend.bpm=1;return}
 if(AUMIX.indexOf(id)>=0||SD.AUINS.indexOf(id)>=0){const k=typeof trk==='number'?trk:0;if(!play.tr[k])return;play.tr[k].mix[id]=val;SD.bus.setMix(k,id,val);AU.pend.mix=1;return}/* v8.4: AUINS=EQ4・COMPのつまみ */
 if(S.mode==='trk'&&typeof trk==='number'&&SD.FXIDS.indexOf(id)<0){const t=TE[trk];if(t)t.e.set(id,val);if(trk===play.ts)AU.pend[id]=val;return}
 syn.set(id,val);AU.pend[id]=val;vizDirty=true}
/* SS: 先読み予約が音を受け持つつまみの「値だけ」の同期(30Hz。保存・表示用。音は触らない) */
function autoQuiet(trk,id,val){
 if(typeof id==='string'&&id.indexOf('.')>0&&trk!=='M'){const r=autoRack(trk);if(r){r.p[id]=val;if(S.mode!=='trk'||trk===play.ts)AU.pend[id]=val}return}/* SS-5b: モジュラーのつまみは値だけ同期 */
 if(trk==='M'&&SD.FXIDS.indexOf(id)>=0){syn.p[id]=val;SD.bus.p[id]=val;AU.pend[id]=val;return}
 const k=typeof trk==='number'?trk:0;if(!play.tr[k])return;
 if(AUMIX.indexOf(id)>=0||SD.AUINS.indexOf(id)>=0){play.tr[k].mix[id]=val;if(SD.bus.mix[k])SD.bus.mix[k][id]=val;AU.pend.mix=1}}
play.defFn=autoDef;
const SCPF={};function scPf(id){if(!(id in SCPF))SCPF[id]=SD.MIXALL().find(p=>p.id===id)||null;return SCPF[id]}
play.eng=new SD.Auto.Engine({pf:scPf,sc:()=>play.sc,sceneSet:(k,id,v)=>{const x=play.tr[k];if(!x)return;x.mix[id]=v;SD.bus.setMix(k,id,v);AU.pend.mix=1},sceneMute:(k,m)=>{if(play.tr[k]){play.tr[k].mute=m;AU.pend.mix=1}},now:()=>SD.bus.ctx?SD.bus.ctx.currentTime:null,bpm:()=>play.bpm,au:()=>auView(),def:autoDef,setParam:autoSet,setQuiet:autoQuiet,
 timer:{set:(f,ms)=>setInterval(f,ms),clear:id=>clearInterval(id)},ms:5,sched:null,schedOn:()=>CFG.sched==='curve',pre:()=>auH().push(),changed:()=>{savePlay();if(S.tab==='au')renderAu()}});
/* SS: サンプル精度スケジュール(CFG.sched==='curve' のときだけ有効。SS-D 以降の既定は curve。『従来』は設定で選べる)。bus の旧方式の書き込みの前に、重なる曲線を取り消す */
{const io={now:()=>SD.bus.ctx?SD.bus.ctx.currentTime:0,get sr(){return SD.bus.ctx?SD.bus.ctx.sampleRate:48000},bind:(trk,id)=>SD.AUBIND.bind(trk,id,SD.bus,autoRack)};
 play.eng.io.sched=SD.sched=new SD.Sched.Runner(io);SD.bus.schedPre=(trk,id)=>{if(SD.sched.owned&&Object.keys(SD.sched.K).length)SD.sched.pre(trk,id)}}
/* ユーザーがつまみを動かしたとき: TOUCH(掴んでいる間はレーンより優先)と REC(動かした分をレーンに記録)。離したあと250msで「離した」とみなす */
let UREL=250;/* 離したとみなす時間(ms)。MIDI経由だけ MIDI_REL_MS */
const UT={};
function auUser(id,v,trk){
 const e=play.eng;if(!e||!e.run||(S.lesson&&!auLesson(S.lesson)))return;const p=autoDef(trk,id);if(!p||p.auto===false)return;
 const k=trk+':'+id,n=SD.Auto.fromValue(p,v);
 if(UT[k])clearTimeout(UT[k]);else e.grab(trk,id);
 e.recPt(trk,id,n);UT[k]=setTimeout(()=>{delete UT[k];e.release(trk,id,n)},UREL)}
const auTrkOf=id=>SD.FXIDS.indexOf(id)>=0?'M':(S.mode==='trk'?play.ts:0);

/* ---------- MIDI learn(MI): 外部CC→つまみ。割り当て表は SD.MidiMap(midimap.js)。REC は auUser に流すだけ ---------- */
const MIDI_REL_MS=300;
const MM={map:null,learn:false,tgt:null,el:null,tm:0,last:null,pk:{}};
const mmKnown=(trk,id)=>id.indexOf('.')>0?!!autoDef(trk,id):SD.MIXALL().some(p=>p.id===id)||Object.keys(SD.defs).some(s=>SD.defs[s].byId&&SD.defs[s].byId[id]);
const mmMap=()=>MM.map||(MM.map=SD.MidiMap.clean(ST.get('midimap',null),mmKnown));
const mmSave=()=>{ST.set('midimap',MM.map);MM.pk={}};
const mmMix=id=>AUMIX.indexOf(id)>=0||!!SD.insDef(id);
/* 今の画面・音源で動かせる対象なら定義を返す。トラックは学習した番号に固定(単音モードは 0)。他トラックのシンセつまみは、そのトラックを選んでいる間だけ動く */
function mmLive(e){
 const p=autoDef(e.trk,e.id);if(!p||SD.PLAYP[e.id])return null;
 if(typeof e.trk==='number'){
  if(mmMix(e.id)){if(!play.tr[e.trk]||(S.mode!=='trk'&&e.trk!==0))return null}
  else if(e.trk!==(S.mode==='trk'?play.ts:0))return null}
 else if(e.trk!=='M'||SD.FXIDS.indexOf(e.id)<0)return null;
 return p}
const mmCur=(e,p)=>{if(p.type!=='knob')return null;const x=mmMix(e.id)?(play.tr[e.trk]&&play.tr[e.trk].mix[e.id]):syn.p[e.id];return typeof x==='number'?SD.toN(p,x):null};
function mmApply(e,v){
 const p=mmLive(e);if(!p)return;
 let val=SD.MidiMap.toValue(p,v);
 if(mmMap().pick==='pickup'&&p.type==='knob'){
  const k=e.trk+':'+e.id,st=MM.pk[k]||(MM.pk[k]={last:null,ok:false,ap:null}),cur=mmCur(e,p);
  if(st.ok&&st.ap!=null&&cur!=null&&Math.abs(cur-st.ap)>.05){st.ok=false;st.last=null}/* 画面側で動かされたら、また追いつくまで待つ */
  if(!SD.MidiMap.pickup(st,cur,v/127))return;
  st.ap=SD.toN(p,val)}
 UREL=MIDI_REL_MS;
 try{
  if(mmMix(e.id)){
   if(e.id==='tPan'&&Math.abs(val)<.03)val=0;
   play.tr[e.trk].mix[e.id]=val;SD.bus.setMix(e.trk,e.id,val);AU.pend.mix=1;auUser(e.id,val,e.trk);savePlay();if(S.lesson)checkGoals()}
  else setP(e.id,val,true)/* 画面のつまみと同じ関数(音・画面・保存・目標判定・auUser) */
 }finally{UREL=250}}
const mmLastText=()=>MM.last?'CC'+MM.last.c+' / ch'+(MM.last.ch+1)+' / 値 '+MM.last.v:'(まだ受信なし)';
function mmClearSel(){clearTimeout(MM.tm);MM.tgt=null;if(MM.el){MM.el.classList.remove('mmsel');MM.el=null}}
function mmBar(){
 let b=$('#mmbar');
 if(!MM.learn){if(b)b.remove();return}
 if(!b){b=E('div','mmbar');b.id='mmbar';document.body.appendChild(b)}
 b.innerHTML=`<span>${MM.tgt?'CCを動かしてください… → '+esc(auLabel(MM.tgt)):'LEARN: 割り当てたいつまみをタップ'}</span><button data-act="mmlearn">終了</button>`}
function mmLearn(on){
 MM.learn=on;mmClearSel();MM.pk={};mmBar();
 if(on){closeOv();toast('LEARN: 割り当てたいつまみをタップ')}else toast('LEARN を終了しました')}
/* 画面のつまみ → 学習の対象({trk,id,el})。割り当てできない場所は null */
function mmHit(t){
 const m=t&&t.closest?t.closest('.mxi,.fd,[data-act=insSeg],.cell[data-id]'):null;if(!m)return null;
 if(m.matches('.fd'))return{trk:+m.dataset.t,id:'tVol',el:m};
 if(m.matches('.mxi,[data-act=insSeg]'))return{trk:+m.dataset.t,id:m.dataset.id,el:m};
 return{trk:auTrkOf(m.dataset.id),id:m.dataset.id,el:m}}
function mmPickTarget(h){
 const t={trk:h.trk,id:h.id};
 if(!mmLive(t)){toast('このつまみは割り当てできません');return}
 mmClearSel();MM.tgt=t;MM.el=h.el;h.el.classList.add('mmsel');
 MM.tm=setTimeout(()=>{mmClearSel();mmBar();toast('時間切れ: 選択を取り消しました')},10000);
 mmBar();toast('CCを動かしてください… → '+auLabel(t))}
['pointerdown','pointerup','pointercancel','click','dblclick','input','mousedown','touchstart'].forEach(n=>document.addEventListener(n,e=>{
 if(!MM.learn)return;const h=mmHit(e.target);if(!h)return;
 e.stopPropagation();if(e.cancelable)e.preventDefault();
 if(n==='pointerdown')mmPickTarget(h)},{capture:true,passive:false}));
function mmCc(m){
 MM.last={c:m.c,ch:m.ch,v:m.v};const lt=$('#mmlast');if(lt)lt.textContent=mmLastText();
 if(MM.learn&&MM.tgt){/* 選択中: 最初に来たCCで確定(予約CCは断る) */
  const t=MM.tgt,r=SD.MidiMap.bind(mmMap(),m.c,CFG.mch==='rx'?m.ch:null,t.trk,t.id);
  if(!r){toast('CC'+m.c+' は割り当てできません(サステイン・全消音で使用)');return true}
  MM.map=r;mmSave();mmClearSel();mmBar();toast('CC'+m.c+' → '+auLabel(t));
  if($('#ov').classList.contains('on')&&$('#ov').querySelector('#mmlast'))openCfg();
  return true}
 return false}
function mmCfgHtml(seg){
 const m=mmMap();
 const rows=m.map.map((e,i)=>`<div class="row"><div class="rt"><b>${esc(auLabel(e))}</b><span>CC${e.c} / ${e.ch==null?'全ch':'ch'+(e.ch+1)}${mmLive(e)?'':' / 今の画面では無効'}</span></div><button class="pb" data-act="mmdel" data-i="${i}">削除</button></div>`).join('');
 return `<div class="lab">MIDIつまみ割り当て(LEARN)</div><div class="sub">最後に受けたCC: <b id="mmlast">${mmLastText()}</b></div><button class="row free" data-act="mmlearn">LEARN を開始</button><div class="sub">押すと設定を閉じます。割り当てたいつまみをタップ → 10秒以内にCCを動かすと確定します。</div>${seg('mmch',CFG.mch==='rx'?'rx':'omni',[['omni','全チャンネル'],['rx','受けたチャンネルだけ']])}${seg('mmpick',m.pick,[['jump','ジャンプ'],['pickup','ピックアップ']])}<div class="sub">ジャンプ=すぐ反映。ピックアップ=画面のつまみに追いつくまで無視。</div>${rows||'<div class="sub">割り当てはまだありません。</div>'}${m.map.length?'<button class="row free" data-act="mmclr">全消去</button>':''}<div class="sub">サステイン(CC64)・全消音(CC120/123)は割り当てできません。CC7(ボリューム)・CC10(パン)は機器が音量や定位に使うことがあります。REC中にCCを回すと、TOUCH と同じようにレーンへ記録されます(止まって0.3秒で区切り)。ON/OFFなどは動かせますが記録されません。</div>`}
/* 画面の更新は最大30Hz(音への反映は200Hz) */
let wasRun=false;
setInterval(()=>{const e=play.eng;if(wasRun&&!play.running&&e.rec){e.rec=false;if(S.tab==='au')renderAu()}wasRun=play.running;const P=AU.pend;if(!Object.keys(P).length)return;AU.pend={};
 for(const k in P){if(k==='bpm'){updBpm();continue}if(k==='mix'){if(S.tab==='mix'&&typeof renderMix==='function')renderMix();continue}
  const u=ui[k];if(u&&u.set&&syn.p[k]!=null)u.set(P[k])}},33);
/* レッスンで使う擬似つまみ(ARP/SEQの設定)。つまみIDからの引き当てを共通化 */
const PGS={},UIP={};
const PB=id=>D().byId[id]||SD.PLAYP[id],U=id=>ui[id]||UIP[id];
const curV=id=>SD.PLAYP[id]?play.getV(id):syn.p[id];
const cnt=k=>k==='uHave'?SD.UMAT.list().length:k==='uUse'?(()=>{const w=S.synth==='wt',m=curV(w?'wsMat':'gMat');return(S.synth==='gr'||w&&curV('wTable')==='sample')&&SD.UMAT.isU(m)&&SD.UMAT.find(m)?1:0})():k==='pSave'?ST.get('pats',[]).filter(Boolean).length:play.count(k);
const CFG=Object.assign({fz:1,fine:false,kb:'a',vel:true,sched:'curve'},ST.get('cfg',{}));/* SS-D: 既定は curve。以前の既定('legacy')のまま自分で選んでいない保存は curve に移す */
if(CFG.sched==='legacy'&&!CFG.schedSet)CFG.sched='curve';
let vizDirty=true;
const UIS={};let ui={};const UIM={};
const S={tab:'osc',oct:ST.get('oct',0),lesson:null,step:0,ab:'mine',mine:null,met:false,fin:false,coachHidden:false,spG:null,hold:false,synth:ST.get('synth','analog'),mode:'key',cur:-1,bi:-1,scope:'spec',ask:null,askCb:null};
const D=()=>SD.defs[S.synth],PATCH=()=>D().P.filter(p=>p.tab!=='top').map(p=>p.id),freeKey=id=>id==='analog'?'free':'free_'+id;
const LESSONS=SD.LESSONS,LBY={};LESSONS.forEach(l=>LBY[l.id]=l);

/* ---------- utils ---------- */
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),1700)}
function getPatch(){return syn.getPatch()}
function arc(a0,a1){const r=19,P=a=>[24+r*Math.sin(a*Math.PI/180),24-r*Math.cos(a*Math.PI/180)],[x0,y0]=P(a0),[x1,y1]=P(a1);
 return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${Math.abs(a1-a0)>180?1:0} ${a1>a0?1:0} ${x1.toFixed(2)} ${y1.toFixed(2)}`}
function fmtGoal(p,g){return SD.fmt(p,g)}

/* ---------- controls ---------- */
function mkKnob(p,mini){
 const c=E('div','cell kn'+(mini?' mini':''));c.dataset.id=p.id;
 c.innerHTML=`<div class="lb">${p.label}</div><svg class="ks" viewBox="0 0 48 48"><path class="trk" d="${arc(-135,135)}"/><path class="va" d=""/><circle class="gl" r="3.4" cx="24" cy="5"/><circle class="bd" cx="24" cy="24" r="13.5"/><line class="pt" x1="24" y1="24" x2="24" y2="14.5"/></svg><div class="vl"></div>`;
 const va=c.querySelector('.va'),pt=c.querySelector('.pt'),gl=c.querySelector('.gl'),vl=c.querySelector('.vl');
 const z=p.min<0?SD.toN(p,0):0;
 const o={el:c,
  set(v){const n=SD.toN(p,v),a=-135+270*n;va.setAttribute('d',Math.abs(n-z)<.002?'':arc(-135+270*z,a));pt.setAttribute('transform',`rotate(${a} 24 24)`);vl.textContent=SD.fmt(p,v)},
  goal(g){if(g==null){gl.style.display='none';return}const a=(-135+270*SD.toN(p,g))*Math.PI/180;gl.setAttribute('cx',24+19*Math.sin(a));gl.setAttribute('cy',24-19*Math.cos(a));gl.style.display='block'},
  focus(b){c.classList.toggle('focus',b)},ok(b){c.classList.toggle('ok',b)}};
 o.goal(null);
 let sy=0,sn=0,drag=false,pid=null;
 c.addEventListener('pointerdown',e=>{if(pid!==null)return;pid=e.pointerId;try{c.setPointerCapture(pid)}catch(_){}sy=e.clientY;sn=SD.toN(p,syn.p[p.id]);drag=false;e.preventDefault()});
 c.addEventListener('pointermove',e=>{if(e.pointerId!==pid)return;const dy=sy-e.clientY;if(!drag&&Math.abs(dy)<5)return;drag=true;setP(p.id,SD.fromN(p,sn+dy/(CFG.fine?700:170)),true)});
 let lt=0,tm=0;
 const end=e=>{if(e.pointerId!==pid)return;pid=null;if(drag||e.type!=='pointerup')return;
  const now=Date.now();
  if(now-lt<320){clearTimeout(tm);lt=0;setP(p.id,p.def,true);toast(p.label+' を初期値に戻しました');}
  else{lt=now;tm=setTimeout(()=>{lt=0;askNum(p)},300);}};
 c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
 return o;
}
function mkSeg(p){
 const c=E('div','cell sg s2');c.dataset.id=p.id;
 c.innerHTML=`<div class="lb">${p.label}</div><div class="so n${p.opts.length}">${p.opts.map(o=>`<button data-v="${o[0]}">${SD.WSVG[o[0]]?`<svg viewBox="0 0 24 12"><path d="${SD.WSVG[o[0]]}"/></svg>`:''}<span>${o[1]}</span></button>`).join('')}</div>`;
 const bs=[...c.querySelectorAll('button')],N=p.opts.length;
 c.querySelector('.so').style.setProperty('--oc',N<=3?N:N===4?2:Math.ceil(N/2));
 bs.forEach(b=>b.addEventListener('click',()=>setP(p.id,b.dataset.v,true)));
 return {el:c,
  set(v){bs.forEach(b=>b.classList.toggle('on',b.dataset.v===v))},
  goal(g){bs.forEach(b=>b.classList.toggle('goal',g!=null&&b.dataset.v===g))},
  focus(b){c.classList.toggle('focus',b)},ok(b){c.classList.toggle('ok',b)}};
}

/* ---------- 可視化(フィルター曲線・エンベロープ形状) ---------- */
function mkViz(kind){
 if(kind==='swpick'){const c=E('button','cell btnc','MY SOUND');c.dataset.act='mat';c.title='取り込んだ素材を選ぶ(素材の管理を開く)';return {el:c,cv:null,kind,set(){},goal(){},focus(){},ok(){}}}
 const c=E('div','cell viz'),cv=E('canvas');c.appendChild(cv);if(kind==='gwave')c.dataset.act='mat';
 if(kind==='algo'){const o={el:c,cv,kind,G:{},set(){},goal(){},focus(){},ok(){}};
  cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),i=SD.fmHit(algIdx(),(e.clientX-r.left-AP*r.width)/Math.max(1,r.width*(1-2*AP)),(e.clientY-r.top-AP*r.height)/Math.max(1,r.height*(1-2*AP)));if(i>=0)showTab('op'+(i+1))});return o}
 if(kind.indexOf('op')===0&&kind.length===3)return {el:c,cv,kind:'openv',n:+kind[2],set(){},goal(){},focus(){},ok(){}};
 if(kind==='swave')swaveDrag(cv);
 if(kind==='spec'||kind==='dec')barDrag(cv,kind);
 return {el:c,cv,kind,set(){},goal(){},focus(){},ok(){}};
}
/* アディティブの棒グラフ(SPEC=倍音の強さ / ENV=倍音ごとの減衰の長さ)。指でなぞって描く。32本ずつ2ページ(上の細い帯をタップで 1〜32 / 33〜64 を切替)。
   ENVはダブルタップで上書きを全部消して自動(D.SLOPE)に戻す。SPECはMOTIONタブのEDITで選んだA/Bのスペクトルを編集する */
const DEC_LO=.02,DEC_HI=2,dec2y=m=>Math.log(m/DEC_LO)/Math.log(DEC_HI/DEC_LO),y2dec=y=>DEC_LO*Math.pow(DEC_HI/DEC_LO,Math.max(0,Math.min(1,y)));
const ADP={pg:0};
function barDrag(cv,kind){
 let pid=null,li=-1,ly=0,mv=false,tap=0,top=false;
 const at=e=>{const r=cv.getBoundingClientRect(),W=Math.max(1,r.width),H=Math.max(1,r.height);
  return[ADP.pg*32+Math.max(0,Math.min(31,Math.floor((e.clientX-r.left)/W*32))),Math.max(0,Math.min(1,1-(e.clientY-r.top-BAR_TOP)/Math.max(1,H-BAR_TOP-BAR_BOT)))]};
 const val=y=>kind==='spec'?(y<.015?0:y):y2dec(y);
 const put=(i,y)=>{const a=kind==='spec'?syn.cur():syn.dd;let i0=li<0?i:li,y0=li<0?y:ly,st=i0<=i?1:-1,n=Math.abs(i-i0);
  for(let k=0;k<=n;k++){const j=i0+st*k;a[j]=val(n?y0+(y-y0)*k/n:y)}
  li=i;ly=y;syn.arrChanged();vizDirty=true;if(S.lesson&&kind==='spec')checkGoals()};
 cv.addEventListener('pointerdown',e=>{if(pid!==null)return;pid=e.pointerId;try{cv.setPointerCapture(pid)}catch(_){}li=-1;mv=false;
  const r=cv.getBoundingClientRect();top=e.clientY-r.top<BAR_TOP;
  if(top){ADP.pg=1-ADP.pg;vizDirty=true;e.preventDefault();return}
  const[i,y]=at(e);put(i,y);if(kind==='spec'&&syn.p.adSpec!=='custom')setP('adSpec','custom',true);e.preventDefault()});
 cv.addEventListener('pointermove',e=>{if(e.pointerId!==pid||top)return;const[i,y]=at(e);mv=true;put(i,y)});
 const end=e=>{if(e.pointerId!==pid)return;pid=null;li=-1;if(top)return;
  if(kind==='dec'&&!mv){const n=Date.now();if(n-tap<400){syn.dd.fill(0);syn.arrChanged();vizDirty=true;toast('減衰の長さを自動(D.SLOPE)に戻しました');tap=0}else tap=n}
  saveFree();checkGoals()};
 cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',e=>{if(e.pointerId===pid){pid=null;li=-1}});
}
/* SMPタブの波形: 指でなぞって使う範囲(START〜END)を決める。端の近くは端だけ、帯の中は帯ごと、外は新しく範囲を作る。動かさずに下の方をタップすると素材の管理を開く */
function swaveDrag(cv){
 let pid=null,mode=0,x0=0,cx0=0,a0=0,b0=0,mv=false;
 const fx=e=>{const r=cv.getBoundingClientRect();return Math.max(0,Math.min(1,(e.clientX-r.left)/Math.max(1,r.width)))};
 cv.addEventListener('pointerdown',e=>{if(pid!==null)return;pid=e.pointerId;try{cv.setPointerCapture(pid)}catch(_){}
  const p=syn.p,x=fx(e),r=cv.getBoundingClientRect(),tol=Math.max(.04,14/Math.max(1,r.width));
  a0=p.wsStart;b0=p.wsEnd;x0=x;cx0=e.clientX;mv=false;
  mode=Math.abs(x-a0)<tol&&Math.abs(x-a0)<=Math.abs(x-b0)?1:Math.abs(x-b0)<tol?2:x>a0&&x<b0?3:4;e.preventDefault()});
 cv.addEventListener('pointermove',e=>{if(e.pointerId!==pid)return;const x=fx(e),dx=x-x0;if(!mv&&Math.abs(e.clientX-cx0)<5)return;mv=true;
  const G=.01;let a=a0,b=b0;
  if(mode===1)a=Math.min(x,b0-G);else if(mode===2)b=Math.max(x,a0+G);
  else if(mode===3){const w=b0-a0;a=Math.max(0,Math.min(1-w,a0+dx));b=a+w}
  else{a=Math.min(x0,x);b=Math.max(x0,x);if(b-a<G){if(a+G<=1)b=a+G;else a=1-G}}
  setP('wsStart',a,true);setP('wsEnd',b,true)});
 const end=e=>{if(e.pointerId!==pid)return;pid=null;
  if(!mv){const r=cv.getBoundingClientRect();if((e.clientY-r.top)/Math.max(1,r.height)>.7)openMat()}};
 cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',e=>{if(e.pointerId===pid)pid=null});
}
function cvPrep(cv){const d=window.devicePixelRatio||1,w=cv.clientWidth*d|0,h=cv.clientHeight*d|0;if(!w||!h)return null;
 if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h;const g=cv.getContext('2d');g.clearRect(0,0,w,h);return {g,w,h,d}}
function biquadDb(type,f0,Q,f,sr){
 const w0=2*Math.PI*f0/sr,cs=Math.cos(w0),sn=Math.sin(w0);
 let al,b0,b1,b2;
 if(type==='bandpass'){al=sn/(2*Q);b0=al;b1=0;b2=-al}
 else{al=sn/(2*Math.pow(10,Q/20));if(type==='lowpass'){b0=(1-cs)/2;b1=1-cs;b2=b0}else{b0=(1+cs)/2;b1=-(1+cs);b2=b0}}
 const a0=1+al,a1=-2*cs,a2=1-al,w=2*Math.PI*f/sr,c1=Math.cos(w),s1=Math.sin(w),c2=Math.cos(2*w),s2=Math.sin(2*w);
 const nr=b0+b1*c1+b2*c2,ni=-(b1*s1+b2*s2),dr=a0+a1*c1+a2*c2,di=-(a1*s1+a2*s2);
 return 10*Math.log10((nr*nr+ni*ni)/(dr*dr+di*di)+1e-12);
}
function drawFCurve(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,p=syn.p,sr=(syn.ctx&&syn.ctx.sampleRate)||48000;
 const X=f=>Math.log(f/20)/Math.log(1000)*w,Y=db=>h-(db+36)/66*h;
 g.strokeStyle='rgba(157,178,198,.25)';g.lineWidth=d;g.beginPath();
 [100,1000,10000].forEach(f=>{g.moveTo(X(f),0);g.lineTo(X(f),h)});g.moveTo(0,Y(0));g.lineTo(w,Y(0));g.stroke();
 const fc=Math.min(p.cutoff,sr*.45);
 g.strokeStyle='rgba(255,122,147,.7)';g.setLineDash([4*d,3*d]);g.beginPath();g.moveTo(X(fc),0);g.lineTo(X(fc),h);g.stroke();g.setLineDash([]);
 g.beginPath();
 for(let x=0;x<=w;x+=2){const f=20*Math.pow(1000,x/w),db=Math.max(-36,Math.min(30,biquadDb(p.fType,fc,syn.q(),f,sr)));x?g.lineTo(x,Y(db)):g.moveTo(x,Y(db))}
 g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.fillStyle='rgba(242,193,78,.25)';g.fill();
 g.beginPath();
 for(let x=0;x<=w;x+=2){const f=20*Math.pow(1000,x/w),db=Math.max(-36,Math.min(30,biquadDb(p.fType,fc,syn.q(),f,sr)));x?g.lineTo(x,Y(db)):g.moveTo(x,Y(db))}
 g.strokeStyle='#f2c14e';g.lineWidth=2*d;g.stroke();
}
function drawEnvShape(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,p=syn.p;
 const tw=t=>.12+.88*Math.min(1,Math.log(1+t*50)/Math.log(201));
 const draw=(A,D,S,R,col,dash)=>{
  const wa=tw(A),wd=tw(D),ws=.6,wr=tw(R),T=wa+wd+ws+wr,px=10*d,X=u=>px+u/T*(w-2*px),Y=a=>h-px-a*(h-2*px);
  g.beginPath();g.moveTo(X(0),Y(0));g.lineTo(X(wa),Y(1));
  for(let i=1;i<=12;i++){const k=i/12;g.lineTo(X(wa+wd*k),Y(S+(1-S)*Math.exp(-3*k)))}
  g.lineTo(X(wa+wd+ws),Y(S));
  for(let i=1;i<=12;i++){const k=i/12;g.lineTo(X(wa+wd+ws+wr*k),Y(S*Math.exp(-4*k)))}
  g.strokeStyle=col;g.lineWidth=2*d;g.setLineDash(dash?[5*d,3*d]:[]);g.stroke();g.setLineDash([]);
 };
 if(p.fA!==undefined)draw(p.fA,p.fD,p.fS,p.fR,'#ff7a93',true);draw(p.aA,p.aD,p.aS,p.aR,'#f2c14e',false);
 g.font=(9*d)+'px sans-serif';g.fillStyle='#f2c14e';g.fillText('AMP',6*d,11*d);if(p.fA!==undefined){g.fillStyle='#ff7a93';g.fillText('F.ENV',30*d,11*d)}
}
/* ---------- FM: アルゴリズム図・OPのエンベロープ形状 ---------- */
const AP=.04,algIdx=()=>Math.max(0,Math.min(SD.FMALGS.length-1,(parseInt(syn.p.fAlg,10)||1)-1));
function drawAlgo(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,p=syn.p,L=SD.fmLayout(algIdx()),G=v.G||{};
 const X=x=>(AP+x*(1-2*AP))*w,Y=y=>(AP+y*(1-2*AP))*h;
 g.strokeStyle='#9db2c6';g.fillStyle='#9db2c6';g.lineWidth=1.5*d;
 L.arrows.forEach(a=>{const x1=X(a.x1),y1=Y(a.y1),x2=X(a.x2),y2=Y(a.y2),an=Math.atan2(y2-y1,x2-x1),ah=6*d;
  g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
  g.beginPath();g.moveTo(x2,y2);g.lineTo(x2-ah*Math.cos(an-.45),y2-ah*Math.sin(an-.45));g.lineTo(x2-ah*Math.cos(an+.45),y2-ah*Math.sin(an+.45));g.closePath();g.fill()});
 g.textAlign='center';g.textBaseline='middle';
 L.boxes.forEach(b=>{const n=b.i+1,x=X(b.x-b.w/2),y=Y(b.y-b.h/2),bw=(X(b.x+b.w/2)-x),bh=(Y(b.y+b.h/2)-y),on=p['f'+n+'Lvl']>0;
  g.fillStyle=on?'#1d3447':'#14202b';g.fillRect(x,y,bw,bh);
  g.lineWidth=(b.car?3.5:1.5)*d;g.strokeStyle=b.car?'#f2c14e':'#9db2c6';g.strokeRect(x,y,bw,bh);
  g.fillStyle=on?'#e8eef4':'#6d8196';g.font='bold '+Math.min(bh*.4,13*d)+'px sans-serif';g.fillText('OP'+n,x+bw/2,y+bh*.36);
  const gs=[];if(G['f'+n+'Coarse']!==undefined)gs.push('×'+G['f'+n+'Coarse']);if(G['f'+n+'Lvl']!==undefined)gs.push('L'+G['f'+n+'Lvl']);
  g.font=Math.min(bh*.3,10*d)+'px sans-serif';
  if(gs.length){g.fillStyle='#ff7a93';g.fillText('→'+gs.join(' '),x+bw/2,y+bh*.74)}
  else{g.fillStyle='#9db2c6';g.fillText('×'+SD.fmt(SD.defs.fm.byId['f'+n+'Coarse'],p['f'+n+'Coarse'])+' L'+Math.round(p['f'+n+'Lvl']),x+bw/2,y+bh*.74)}
  if(n===4&&p.fFb>0){g.fillStyle='#7fe0a0';g.font='bold '+Math.min(bh*.3,10*d)+'px sans-serif';g.textAlign='right';g.fillText('↻FB'+Math.round(p.fFb),x+bw-3*d,y+bh*.14);g.textAlign='center'}});
 g.textAlign='left';g.fillStyle='#9db2c6';g.font=(9*d)+'px sans-serif';g.textBaseline='top';g.fillText('ALGO '+(algIdx()+1)+'  太枠=キャリア(音になる)',4*d,3*d);
 if(G.fAlg!==undefined){g.fillStyle='#ff7a93';g.textAlign='right';g.fillText('目標 ALGO '+G.fAlg,w-4*d,3*d)}
}
const BAR_TOP=14,BAR_BOT=12;
const addE=()=>SD.ADD_DERIVE(syn.p,syn.sp,syn.dd,syn.spB,0,0,0);
function barFrame(o,txt){const {g,w,h,d}=o,pg=ADP.pg;
 g.strokeStyle='rgba(157,178,198,.22)';g.lineWidth=d;g.beginPath();const T=BAR_TOP*d,H=h-(BAR_TOP+BAR_BOT)*d;[0,.25,.5,.75,1].forEach(f=>{g.moveTo(0,T+H*f);g.lineTo(w,T+H*f)});g.stroke();
 g.font=(9*d)+'px sans-serif';g.fillStyle='#9db2c6';g.textBaseline='top';g.textAlign='left';g.fillText(txt,5*d,2*d);
 g.textAlign='right';g.fillStyle='#f2c14e';g.fillText((pg?'1〜32 / ▶33〜64':'▶1〜32 / 33〜64')+'(タップで切替)',w-4*d,2*d);g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle='#9db2c6';
 [1,8,16,24,32].forEach(k=>g.fillText(k+pg*32,(k-1)*w/32+w/32*.15,h-2*d));return{T,H,bw:w/32}}
function drawSpec(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,d}=o,p=syn.p,E=addE(),cur=syn.cur(),F=barFrame(o,'倍音の強さ'+(p.adMorph>0||p.adMotTarget==='morph'||p.adAB==='b'?'['+(p.adAB==='b'?'B':'A')+'を編集]':'')),pg=ADP.pg*32;
 for(let q=0;q<32;q++){const i=pg+q,x=q*F.bw,on=i<E.N,b=Math.max(0,Math.min(1,cur[i])),u=Math.max(0,Math.min(1,E.u[i]));
  g.globalAlpha=on?1:.3;
  g.strokeStyle='rgba(157,178,198,.7)';g.lineWidth=d;if(b>0)g.strokeRect(x+F.bw*.14,F.T+F.H*(1-b),F.bw*.72,F.H*b);
  g.fillStyle=i===0?'#fff':'#f2c14e';if(u>0)g.fillRect(x+F.bw*.14,F.T+F.H*(1-u),F.bw*.72,Math.max(F.H*u,2*d));
  g.globalAlpha=1}
 spMarks(g,F,d,pg);
 meterBars(g,F,d,E);
}
/* レッスンの倍音目標(sp)の赤いマーカー: 許容幅の帯+目標の線(いま表示中のページのぶんだけ) */
function spMarks(g,F,d,pg){if(!S.lesson||S.fin||!S.spG)return;
 S.spG.forEach(([n,t,tol])=>{const q=n-1-pg;if(q<0||q>=32)return;const tl=tol===undefined?.1:tol,x=q*F.bw+F.bw*.08,w=F.bw*.84,y0=Math.max(0,t-tl),y1=Math.min(1,t+tl);
  g.fillStyle='rgba(255,90,90,.22)';g.fillRect(x,F.T+F.H*(1-y1),w,Math.max(2*d,F.H*(y1-y0)));
  g.strokeStyle='#ff5a5a';g.lineWidth=Math.max(1.5,2*d);g.beginPath();g.moveTo(x,F.T+F.H*(1-t));g.lineTo(x+w,F.T+F.H*(1-t));g.stroke();
  g.fillStyle='#ff5a5a';g.font=(9*d)+'px sans-serif';g.textAlign='center';g.textBaseline='top';g.fillText('→'+(+t.toFixed(2)),x+w/2,Math.max(F.T-1*d,F.T+F.H*(1-y1)-11*d));g.textAlign='left';g.textBaseline='alphabetic'})}
function meterBars(g,F,d,E){const lv=syn.lv;if(!lv)return;g.fillStyle='rgba(255,255,255,.9)';
 for(let q=0;q<32;q++){const y=Math.min(1,lv[ADP.pg*32+q]*E.mx);if(y>.004)g.fillRect(q*F.bw+F.bw*.38,F.T+F.H*(1-y),F.bw*.24,F.H*y)}}
function drawDec(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,d}=o,E=addE(),F=barFrame(o,'減衰の長さ(明るい=上書き/ダブルタップで自動)'),pg=ADP.pg*32;
 for(let q=0;q<32;q++){const i=pg+q,x=q*F.bw,ov=syn.dd[i]>0,y=Math.max(0,Math.min(1,dec2y(E.m[i])));
  g.globalAlpha=i<E.N?1:.3;g.fillStyle=ov?'#7fe0a0':'rgba(242,193,78,.55)';g.fillRect(x+F.bw*.14,F.T+F.H*(1-y),F.bw*.72,Math.max(F.H*y,2*d));g.globalAlpha=1}
 meterBars(g,F,d,E);
}
/* LAYOUTタブ: 倍音の周波数の並び(横=基音に対する比率、縦=強さ)。整数倍なら等間隔、BELL/METALは不規則に */
function drawLay(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,E=addE(),px=8*d;let rm=1,i;
 for(i=0;i<64;i++)if(E.a[i]>1e-7&&E.r[i]>rm)rm=E.r[i];
 g.strokeStyle='rgba(157,178,198,.25)';g.lineWidth=d;g.beginPath();g.moveTo(px,h-14*d);g.lineTo(w-px,h-14*d);g.stroke();
 g.fillStyle='#9db2c6';g.font=(9*d)+'px sans-serif';g.textAlign='left';g.fillText('周波数の並び(基音=1)',6*d,11*d);g.textAlign='right';g.fillText('×'+rm.toFixed(1),w-6*d,11*d);g.textAlign='left';
 g.lineWidth=Math.max(1.5,2*d);for(i=0;i<64;i++)if(E.a[i]>1e-7){const x=px+E.r[i]/rm*(w-2*px),y=Math.max(.04,E.a[i])*(h-30*d);g.strokeStyle=Math.abs(E.r[i]-Math.round(E.r[i]))<1e-6?'#f2c14e':'#7fe0a0';g.beginPath();g.moveTo(x,h-14*d);g.lineTo(x,h-14*d-y);g.stroke()}
 g.fillStyle='#9db2c6';g.fillText('黄=整数倍 緑=非整数',6*d,h-3*d)}
/* MOTIONタブ: スペクトルA(灰の枠)・B(青の枠)と、いまのMORPHの混ざり具合(黄) */
function drawMix(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,p=syn.p,E=addE(),px=6*d,bw=(w-2*px)/64,T=16*d,H=h-T-6*d;
 const bar=(a,i,st,fill)=>{const y=Math.max(0,Math.min(1,a[i]));if(y<=0)return;if(fill){g.fillStyle=st;g.fillRect(px+i*bw+bw*.1,T+H*(1-y),bw*.8,Math.max(2*d,H*y))}else{g.strokeStyle=st;g.lineWidth=d;g.strokeRect(px+i*bw+bw*.1,T+H*(1-y),bw*.8,H*y)}};
 for(let i=0;i<64;i++){bar(syn.sp,i,'rgba(157,178,198,.8)');bar(syn.spB,i,'rgba(95,180,255,.9)');bar(E.u,i,'#f2c14e',true)}
 g.fillStyle='#9db2c6';g.font=(9*d)+'px sans-serif';g.textAlign='left';g.fillText('A灰 B青 いま=黄',5*d,11*d);g.textAlign='right';g.fillText('MORPH '+Math.round(p.adMorph*100)+'%',w-5*d,11*d)}
function drawOpEnv(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,p=syn.p,n=v.n,A=p['f'+n+'A'],D=p['f'+n+'D'],S_=p['f'+n+'S'],R=p['f'+n+'R'];
 const tw=t=>.12+.88*Math.min(1,Math.log(1+t*50)/Math.log(201)),wa=tw(A),wd=tw(D),ws=.6,wr=tw(R),T=wa+wd+ws+wr,px=10*d,X=u=>px+u/T*(w-2*px),Y=a=>h-px-a*(h-2*px);
 g.beginPath();g.moveTo(X(0),Y(0));g.lineTo(X(wa),Y(1));
 for(let i=1;i<=12;i++){const k=i/12;g.lineTo(X(wa+wd*k),Y(S_+(1-S_)*Math.exp(-3*k)))}
 g.lineTo(X(wa+wd+ws),Y(S_));
 for(let i=1;i<=12;i++){const k=i/12;g.lineTo(X(wa+wd+ws+wr*k),Y(S_*Math.exp(-4*k)))}
 g.strokeStyle='#f2c14e';g.lineWidth=2*d;g.stroke();
 const car=SD.FMALGS[algIdx()].c.indexOf(n-1)>=0;g.font=(9*d)+'px sans-serif';g.fillStyle='#f2c14e';g.fillText('OP'+n+(car?' 音量':' 変調の深さ'),6*d,11*d);
}
function drawWave(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,p=syn.p,pos=syn.posNow>=0&&syn.ready?syn.posNow:p.wPos,fp=pos*63,fa=Math.floor(fp),fr=fp-fa,fb=Math.min(63,fa+1),A=syn.frame(fa),B=syn.frame(fb);
 g.strokeStyle='rgba(157,178,198,.25)';g.lineWidth=d;g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();
 g.beginPath();for(let x=0;x<=w;x+=2){const i=Math.min(2047,Math.floor(x/w*2048)),y=A[i]+(B[i]-A[i])*fr;const py=h/2-y*h*.38;x?g.lineTo(x,py):g.moveTo(x,py)}
 g.strokeStyle='#f2c14e';g.lineWidth=2*d;g.stroke();
 g.font=(9*d)+'px sans-serif';g.fillStyle='#9db2c6';g.fillText('1周期の波形  POS '+Math.round(pos*100)+'%',6*d,11*d);
}
function drawWater(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,pos=syn.posNow>=0&&syn.ready?syn.posNow:syn.p.wPos,cur=Math.round(pos*63);
 const line=(f,col,lw)=>{const F=syn.frame(f),y0=h*.92-f/63*h*.62,amp=h*.2;g.beginPath();
  for(let i=0;i<=64;i++){const x=i/64*w*.9+f/63*w*.1,y=y0-F[Math.min(2047,i*32)]*amp;i?g.lineTo(x,y):g.moveTo(x,y)}
  g.strokeStyle=col;g.lineWidth=lw*d;g.stroke()};
 for(let f=63;f>=0;f-=3)line(f,'rgba(157,178,198,.45)',1);
 line(cur,'#f2c14e',2);
 if(S.tab==='cnv')drawSmpStat(g,w,h,d);
}
/* SMPタブ: 変換の進み具合・使われたCYCLEを波形表示の下に出す */
function drawSmpStat(g,w,h,d){
 const s=syn.smp;if(!s||syn.p.wTable!=='sample')return;
 const inf=SD.MAT.info(syn.p.wsMat),nm=inf?inf.name:'';
 let t='',col='#9db2c6';
 if(s.st==='wait'||s.st==='run'){t='変換中… '+Math.round(s.prog*100)+'%';col='#f2c14e';g.fillStyle='rgba(242,193,78,.8)';g.fillRect(0,h-3*d,w*s.prog,3*d)}
 else if(s.st==='err'){t='変換できません: '+s.msg;col='#ff7a93'}
 else if(s.st==='done'&&s.info){if(s.info.mode==='spectrum'){t='SPECTRUM '+({zero:'ZERO',keep:'KEEP',random:'RANDOM'}[s.info.phase]||'')+(s.info.short?'(範囲が短い)':'')}
  else{const c=s.info.cycle*1000,f=Math.round(1/s.info.cycle);t=(s.info.auto?(s.info.found?'AUTO ':'AUTO(音の高さを検出できず) '):'CYCLE ')+c.toFixed(1)+'ms'+(s.info.auto&&s.info.found?'(約'+f+'Hz)':'')+(s.info.short?'(範囲が短い)':'')}}
 g.font=(9*d)+'px sans-serif';g.fillStyle=col;g.fillText(nm+'  '+t,6*d,h-6*d);
}
function drawPEnv(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,p=syn.p,px=10*d,tw=t=>.12+.88*Math.min(1,Math.log(1+t*50)/Math.log(201));
 const wa=tw(p.peA),wd=tw(p.peD),ws=.6,wr=tw(p.peR),T=wa+wd+ws+wr,X=u=>px+u/T*(w-2*px),mid=h/2,Y=l=>mid-l*p.peAmt*(h/2-px);
 g.strokeStyle='rgba(157,178,198,.3)';g.lineWidth=d;g.beginPath();g.moveTo(0,mid);g.lineTo(w,mid);g.stroke();
 g.beginPath();g.moveTo(X(0),Y(0));g.lineTo(X(wa),Y(1));
 for(let i=1;i<=12;i++){const k=i/12;g.lineTo(X(wa+wd*k),Y(p.peS+(1-p.peS)*Math.exp(-3*k)))}
 g.lineTo(X(wa+wd+ws),Y(p.peS));
 for(let i=1;i<=12;i++){const k=i/12;g.lineTo(X(wa+wd+ws+wr*k),Y(p.peS*Math.exp(-4*k)))}
 g.strokeStyle='#7fe0a0';g.lineWidth=2*d;g.stroke();
 g.font=(9*d)+'px sans-serif';g.fillStyle='#7fe0a0';g.fillText('POSITIONの動き(上=右へ / 下=左へ)',6*d,11*d);
}
function drawGWave(v){
 if(!v.wv)v.wv=new SD.WaveView(v.cv);const p=syn.p,m=SD.MAT.get(p.gMat);
 v.wv.m=m;v.wv.pos=p.gPos;v.wv.range=p.gSpray>0?[Math.max(0,p.gPos-p.gSpray),Math.min(1,p.gPos+p.gSpray)]:null;v.wv.draw();
 {const g2=v.cv.getContext&&v.cv.getContext('2d'),dd=window.devicePixelRatio||1,inf=SD.MAT.info(p.gMat);if(g2&&inf&&v.cv.height){g2.setTransform(1,0,0,1,0,0);g2.font=(9*dd)+'px sans-serif';g2.fillStyle='#9fb3c8';g2.fillText((m?inf.name:'読み込み中…')+'(タップで素材の管理)',6*dd,v.cv.height-5*dd)}}
 const gv=syn.gv;if(gv&&gv.length){const o=cvPrep(v.cv);if(o){const {g,w,h,d}=o;
  for(let i=0;i<gv.length;i+=2){const x=gv[i]*w,pr=gv[i+1],a=Math.sin(Math.PI*pr);g.fillStyle='rgba(255,122,147,'+(.25+.7*a).toFixed(2)+')';g.fillRect(x-d,h*.5-h*.4*a,2*d,h*.8*a)}}}
}
/* SMPタブの波形: 素材の全体・使う範囲(帯)・POSITIONの位置。素材が無い/読み込み中/変換エラーは文字で伝える */
function drawSwave(v){
 if(!v.wv)v.wv=new SD.WaveView(v.cv);const p=syn.p,id=p.wsMat,inf=SD.MAT.info(id);
 let m=SD.MAT.get(id);
 if(!m&&SD.UMAT.isU(id)&&v.ld!==id){v.ld=id;SD.UMAT.load(id).then(()=>{vizDirty=true})}   /* 取り込み素材は読み込み完了で再描画(1素材につき1回) */
 if(m)v.ld=null;
 const a=Math.min(p.wsStart,p.wsEnd),b=Math.max(p.wsStart,p.wsEnd);
 v.wv.m=m;v.wv.range=[a,b];v.wv.pos=a+(b-a)*p.wPos;v.wv.draw();
 const g=v.cv.getContext&&v.cv.getContext('2d'),dd=window.devicePixelRatio||1;if(!g||!v.cv.height)return;
 g.setTransform(1,0,0,1,0,0);g.font=(9*dd)+'px sans-serif';
 const s=syn.smp,sec=m?(m.data.length/m.sr*(b-a)):0;
 let t=(inf&&m?inf.name:inf&&inf.label==='読み込み中'?'読み込み中…':'素材なし')+'  範囲 '+Math.round(a*100)+'〜'+Math.round(b*100)+'%'+(m?'('+sec.toFixed(2)+'秒)':'');
 g.fillStyle='#9fb3c8';g.fillText(t,6*dd,v.cv.height-5*dd);
 if(m&&sec<.1){g.fillStyle='#f2c14e';g.fillText('範囲が短すぎます(0.1秒以上を目安に)',6*dd,12*dd)}
 else if(s&&s.st==='err'){g.fillStyle='#ff7a93';g.fillText('変換できません: '+s.msg,6*dd,12*dd)}
 else if(s&&(s.st==='wait'||s.st==='run')){g.fillStyle='#f2c14e';g.fillText('変換中… '+Math.round(s.prog*100)+'%',6*dd,12*dd)}
}
function drawGWin(v){
 const o=cvPrep(v.cv);if(!o)return;const {g,w,h,d}=o,px=8*d,cur=syn.p.gWin;
 g.fillStyle='#14202b';g.fillRect(0,0,w,h);
 SD.GRWINS.forEach(([id,nm])=>{const on=id===cur;g.beginPath();
  for(let i=0;i<=64;i++){const x=i/64,y=SD.GRWIN(id,x),X=px+x*(w-2*px),Y=h-px-y*(h-2*px);i?g.lineTo(X,Y):g.moveTo(X,Y)}
  g.strokeStyle=on?'#f2c14e':'rgba(157,178,198,.28)';g.lineWidth=(on?2.5:1)*d;g.stroke()});
}
function drawViz(){const t=D().T.find(x=>x.id===S.tab);if(!t)return;
 t.items.forEach(i=>{const u=ui[i];if(!u||!u.kind)return;
  if(u.kind==='fcurve')drawFCurve(u);else if(u.kind==='env')drawEnvShape(u);else if(u.kind==='wave')drawWave(u);else if(u.kind==='water')drawWater(u);else if(u.kind==='penv')drawPEnv(u);else if(u.kind==='gwave')drawGWave(u);else if(u.kind==='swave')drawSwave(u);else if(u.kind==='gwin')drawGWin(u);else if(u.kind==='algo')drawAlgo(u);else if(u.kind==='openv')drawOpEnv(u);else if(u.kind==='spec')drawSpec(u);else if(u.kind==='dec')drawDec(u);else if(u.kind==='lay')drawLay(u);else if(u.kind==='mix')drawMix(u)})}

/* ---------- parameter set ---------- */
function setP(id,v,user,quiet){
 const p=D().byId[id];
 if(p.type==='knob')v=SD.clamp(p,v);
 /* START<ENDを保つ(0.01以上あける)。ENDより大きいSTARTは、手前に補正 */
 if(id==='wsStart'&&syn.p.wsEnd!=null)v=Math.min(v,Math.max(0,syn.p.wsEnd-.01));
 if(id==='wsEnd'&&syn.p.wsStart!=null)v=Math.max(v,Math.min(1,syn.p.wsStart+.01));
 syn.set(id,v);ui[id].set(v);if(S.tab==='fx'){fxLamp();mbDraw();vcDraw();spDraw()}
 if(user&&SD.PLAYP[id]==null)auUser(id,v,auTrkOf(id));
 if(id==='wTable'&&S.synth==='wt')refreshTabs();
 if(id==='adLayout'&&S.synth==='add')refreshTabs();
 if(id==='master')ST.set('master',v);
 vizDirty=true;
 /* MT-4: テンポ同期の長さ(拍・ms・1小節に何回か)を拍子つきで知らせる */
 {const sm=/^(af|tr|dly)(Div|Sync)$/.exec(id);if(user&&sm&&SD.METER&&(sm[2]==='Div'||v==1)&&syn.p[sm[1]+'Sync']==1){const tx=SD.METER.syncText(syn.p[sm[1]+'Div'],play.bpm,play.getMeter&&play.getMeter());if(tx)toast(tx)}}
 if(S.synth==='gr'&&(id==='gDens'||id==='gSize')&&syn.over())toast('粒が多すぎます。古い粒から消えて音が途切れることがあります');
 if(user){if(S.ab==='ref'){S.ab='mine';updAB()}saveFree()}
 if(!quiet)checkGoals();
}
function applyMod(o){
 syn.setPatch(o&&o.mods?o:Object.assign({},o,SD.modLib.samplePatch()));RK.pend=null;RK.selc=null;
 PATCH().forEach(id=>ui[id].set(syn.p[id]));
 let pl=false;Object.keys(o||{}).forEach(k=>{if(SD.PLAYP[k]){play.setV(k,o[k]);pl=true}});if(pl)refreshPlayUI();
 {const og=SD.Auto.orphans(play.au,autoDef);if(og.length&&!S.lesson)toast('このパッチに無いモジュールのレーンが'+og.length+'本あります(AUTOタブで「対象なし」。同じIDのモジュールを足すと復活)')}/* MA-2 R3 */
 vizDirty=true;renderRack();checkGoals();
}
function applyPatch(o){applyPatch0(o);if(S.mode==='trk'&&!S.trkLoad&&!S.lesson)trkCommit()}
function applyPatch0(o){if(S.synth==='mod'){applyMod(o);return}if(S.synth==='fm')o=SD.FMMIG(o);if(S.synth==='wt')syn.setUser(o.user||SD.WTD.USER_DEFAULT,'quiet');if(S.synth==='add')syn.loading=true;try{PATCH().forEach(id=>setP(id,o[id]!==undefined?o[id]:D().DEF[id],false,true))}finally{if(S.synth==='add'){syn.loading=false;syn.setArr(o);vizDirty=true}}
 let pl=false;Object.keys(o).forEach(k=>{if(SD.PLAYP[k]){play.setV(k,o[k]);pl=true}});if(pl)refreshPlayUI();
 checkGoals()}
function refreshPlayUI(){updBpm();if(S.tab==='arp')renderArp();else if(S.tab==='seq')renderSeq()}
function lessonState(){const o=getPatch();Object.keys(SD.PLAYP).forEach(k=>o[k]=play.getV(k));return o}
let ft;let tkt;function saveFree(){if(S.mode==='trk'&&!S.lesson&&!S.trkLoad){clearTimeout(tkt);tkt=setTimeout(trkCommit,250)}if(S.lesson)return;clearTimeout(ft);const k=freeKey(S.synth),sy=syn;ft=setTimeout(()=>ST.set(k,sy.getPatch()),600)}

/* ---------- number input ---------- */
function ov(html,cls){const o=$('#ov');o.innerHTML=`<div class="sheet ${cls||''}">${html}</div>`;o.classList.add('on')}
function closeOv(){if(typeof matStop==='function'&&MV.src)matStop();const o=$('#ov');o.classList.remove('on');o.innerHTML='';S.ask=null;S.askCb=null}
function askNum(p){
 const cur=syn.p[p.id];
 ov(`<div class="sh"><b>${p.label}</b><button data-act="close">✕</button></div><div class="sb"><p class="hp">${esc(p.help)}</p><div class="rg">現在 ${SD.fmt(p,cur)} ／ 範囲 ${SD.fmt(p,p.min)} 〜 ${SD.fmt(p,p.max)}</div><input id="ni" inputmode="decimal" autocomplete="off" value="${esc(SD.fmt(p,cur))}"><div class="bt"><button data-act="ndef">初期値</button><button data-act="close">やめる</button><button class="pri" data-act="nok">決定</button></div></div>`,'sm');
 S.ask=p;setTimeout(()=>{const i=$('#ni');if(i){i.focus();i.select()}},60);
}
function askText(title,val,cb){
 ov(`<div class="sh"><b>${title}</b><button data-act="close">✕</button></div><div class="sb"><input id="ti" autocomplete="off" maxlength="24" value="${esc(val)}"><div class="bt"><button data-act="close">やめる</button><button class="pri" data-act="tok">保存</button></div></div>`,'sm');
 S.askCb=cb;setTimeout(()=>{const i=$('#ti');if(i){i.focus();i.select()}},60);
}

/* ---------- lessons ---------- */
function modState(L,n){
 const ML=SD.modLib,MD=SD.MODS,mods=L.init.mods.map(m=>({id:m.id,t:m.t,v:Object.assign({},m.v)})),cab=L.init.cab.map(c=>c.slice()),st={mods,cab};
 const defs=m=>MD[m.t].knobs.forEach(k=>{if(m.v[k.k]===undefined)m.v[k.k]=k.def});mods.forEach(defs);
 const run=(s,full)=>{
  (s.rm||[]).forEach(([a,b])=>{const i=cab.findIndex(c=>c[0]===a&&c[1]===b);if(i>=0)cab.splice(i,1)});
  if(full){(s.m||[]).forEach(([t,c])=>{let k=mods.filter(x=>x.t===t).length;while(k++<c){const m={id:ML.uid(st,t),t,v:{}};defs(m);mods.push(m)}});
   (s.k||[]).forEach(([a,b])=>{if(ML.canConnect(st,a,b).ok)cab.push([a,b])})}
  const sv=(id,g)=>{const q=ML.split(id),m=ML.find(st,q[0]);if(m)m.v[q[1]]=g};
  Object.keys(s.s||{}).forEach(id=>sv(id,s.s[id]));
  if(full)(s.f||[]).forEach(([id,g])=>{if(g!==undefined)sv(id,g)});
 };
 for(let j=0;j<n;j++)run(L.steps[j],true);
 return {st,run};
}
function modPatch(L,n,part){const r=modState(L,n);if(part)r.run(L.steps[n],false);return {mods:r.st.mods,cab:r.st.cab}}
function stateUpTo(L,n){if(L.synth==='mod')return modPatch(L,n,false);const s=Object.assign({},SD.defs[L.synth].DEF,L.init);
 for(let j=0;j<n;j++){const st=L.steps[j];Object.assign(s,st.s||{});if(st.s&&st.s.adSpec!==undefined)delete s.sp;(st.f||[]).forEach(([id,g])=>{if(g!==undefined){s[id]=g;if(id==='adSpec')delete s.sp}});
  if(st.sp&&st.sp.length){const a=s.sp?s.sp.slice():SD.addPreset(!s.adSpec||s.adSpec==='custom'?'saw':s.adSpec);st.sp.forEach(([k,v])=>{a[k-1]=v});s.sp=a;s.adSpec='custom'}}return s}
/* L.keepMat: 取り込んだ素材(u:)を選択中なら、ステップ移動・お手本切替でも素材を保つ(v1.6) */
function keepM(L,s){if(L.keepMat&&L.synth==='gr'&&S.synth==='gr'){const m=syn.p.gMat;if(SD.UMAT.isU(m)&&SD.UMAT.find(m))s.gMat=m}
 if(L.keepMat&&L.synth==='wt'&&S.synth==='wt'){const m=syn.p.wsMat;if(SD.UMAT.isU(m)&&SD.UMAT.find(m))s.wsMat=m}return s}
function stateAt(L,i){if(L.synth==='mod')return modPatch(L,i,true);const st=L.steps[i],o=Object.assign(stateUpTo(L,i),st.s||{});if(st.s&&st.s.adSpec!==undefined)delete o.sp;return keepM(L,o)}
function refOf(L){return stateUpTo(L,L.steps.length)}
const prog=()=>ST.get('prog',{});
function saveProg(id,o){const p=prog();p[id]=Object.assign(p[id]||{step:0,done:false},o);ST.set('prog',p)}

function startLesson(id,from){
 if(S.mode!=='key')setMode('key',true);
 if(LBY[id].pat)play.setPattern(LBY[id].pat);
 if(LBY[id].synth!==S.synth)switchSynth(LBY[id].synth,true);
 stopDemo();syn.allOff();
 if(auLesson(LBY[id])){if(!S.auSave){S.fxSave={};SD.FXIDS.forEach(id=>{S.fxSave[id]=syn.p[id]});S.auSave=SD.Auto.json(play.au);S.mixSave=play.tr.map(x=>Object.assign({},x.mix))}play.au=SD.Auto.mk(4);auMixReset();S.cmpAu=null;AU.h=null;AU.sel=0}else auRestore();
 if(!LBY[id].tk)trkRestore();
 if(LBY[id].tk){if(!S.trkSave)S.trkSave={t:play.getTracks(),ts:play.ts,m:play.getMeter()};play.stop();play.setMeter(LBY[id].meter||null,false);play.setTracks(LBY[id].tk.map(x=>kitTrack(x.id,x.idx,x.o)),LBY[id].ts|0);trkReset();mtBtn()}
 sceneInstall(LBY[id]);
 S.lesson=LBY[id];S.coachHidden=false;S.fin=false;setOct(S.lesson.oct||0);
 closeOv();gotoStep(Math.min(from||0,S.lesson.steps.length-1));
}
/* レッスンでレーンが動かしたミキサー値(VOL・PAN・PITCH・送り)を既定に戻す */
function auMixReset(){const d=SD.MIXDEF();play.tr.forEach(x=>['tVol','tPan','tPitch','tDly','tRvb'].forEach(id=>{x.mix[id]=d[id]}));syncMix();play.eng.sent={}}
function trkRestore(){if(S.trkSave){play.stop();play.setTracks(S.trkSave.t,S.trkSave.ts);if(S.trkSave.m)play.setMeter(S.trkSave.m,false);trkReset();S.trkSave=null;mtBtn()}}
/* v7.12a: レッスンの sc(シーン定義 [{name,mix:{トラック番号(1始まり):{つまみID:値}}}])を play.sc に敷く。自分のシーンは S.scSave に退避し、レッスンを出る/別のレッスンへ移るときに戻す */
function scRestore(){if(S.scSave){play.sc=S.scSave;S.scSave=null;play.eng.ss={};if(S.tab==='mix')try{renderMix()}catch(_){}}}
function sceneInstall(L){if(!L||!L.sc){scRestore();return}if(!S.scSave)S.scSave=play.sc;const nT=play.tr.length;play.sc=SD.Auto.cleanSc(L.sc.map(c=>({name:c.name,tr:play.tr.map((_,k)=>({mute:false,mix:Object.assign({},(c.mix||{})[k+1]||{})}))})),SD.MAXT);play.eng.ss={};MX.scn=0}
function fxoRestore(){if(S.fxoSave===undefined)return;play.fxo=S.fxoSave;S.fxoSave=undefined;SD.bus.setFxOrd(play.fxo);if(S.tab==='fx'&&FXW)showFx()}
function auRestore(){fxoRestore();scRestore();trkRestore();if(S.auSave){play.eng.stop();if(S.fxSave){SD.FXIDS.forEach(id=>{if(S.fxSave[id]!==undefined&&D().byId[id]&&ui[id])setP(id,S.fxSave[id],false,true)});S.fxSave=null}if(S.mixSave){play.tr.forEach((x,k)=>{if(S.mixSave[k])Object.assign(x.mix,S.mixSave[k])});S.mixSave=null;syncMix()}play.au=SD.Auto.clean(S.auSave,autoDef);S.auSave=null;S.cmpAu=null;AU.h=null;AU.sel=0}}
function exitLesson(silent){
 auRestore();S.lesson=null;S.fin=false;stopDemo();clearMarks();renderCoach();markTabs();
 if(!silent)toast('自由に音作りできます');
}
function clearMarks(){mtStop();SD.bus.setCmpGain(0);S.spG=null;vizDirty=true;if(ui.v_algo)ui.v_algo.G={};Object.keys(ui).forEach(id=>{ui[id].goal(null);ui[id].focus(false);ui[id].ok(false)});if(S.synth==='mod')markJacks();Object.keys(UIP).forEach(id=>{UIP[id].goal(null);UIP[id].focus(false);UIP[id].ok(false)})}
function gotoStep(i){
 const L=S.lesson,n=L.steps.length;i=Math.max(0,Math.min(n-1,i));
 S.step=i;S.fin=false;S.ab='mine';S.met=false;S.cmpi=-1;stopDemo();
 saveProg(L.id,{step:i});
 if(L.mode&&S.mode!==L.mode)setMode(L.mode,true);
 const s=L.steps[i];
 if(s.clr&&s.clr!=='au'){play.clearPattern();if(S.tab==='seq')updSeq()}
 S.cmpAu=null;if(L.tk&&play.tr.some(x=>x.mute)&&L.steps.some(q=>(q.cmp||[]).some(c=>c.mt))){play.tr.forEach(x=>{x.mute=false});updTrk()}
 if(auLesson(L)){
  if(s.clr==='au'){play.au.lanes=[];auMixReset()}
  if(s.bars)play.au.bars=s.bars;
  (s.lane||[]).forEach(sp=>{const l=SD.Auto.fromReal(sp,autoDef);if(!l)return;const i=SD.Auto.find(play.au,l.trk,l.id);if(i>=0)play.au.lanes[i]=l;else if(play.au.lanes.length<SD.Auto.MAXL)play.au.lanes.push(l)});
  AU.sel=Math.min(AU.sel,Math.max(0,play.au.lanes.length-1));AU.pt=-1;AU.rg=null;play.eng.poke()}
 applyPatch(stateAt(L,i));clearMarks();mtStart(s);
 if(s.sp&&s.sp.length){S.spG=s.sp;ADP.pg=Math.floor((s.sp[0][0]-1)/32)}
 (s.f||[]).forEach(([id,g])=>{U(id).focus(true);if(g!==undefined){U(id).goal(g);if(ui.v_algo)ui.v_algo.G[id]=g}});
 const t=s.tab||(s.f&&s.f[0]?PB(s.f[0][0]).tab:null)||L.tab;if(t)showTab(t);
 renderCoach();markTabs();checkGoals();
}
function nextStep(){
 const L=S.lesson;
 if(S.fin){openTOC();return}
 if(S.step>=L.steps.length-1){S.fin=true;saveProg(L.id,{done:true});clearMarks();markTabs();renderCoach();toast('レッスン完了!');return}
 gotoStep(S.step+1);
}
function isMet(id,g,tol){const p=PB(id),cur=curV(id);
 if(p.type==='seg')return cur===g;
 return Math.abs(SD.toN(p,cur)-SD.toN(p,g))<=(tol||.07)+1e-6}
function checkGoals(){
 const L=S.lesson,ab=$('#addmb');if(ab)ab.classList.remove('foc');
 if(!L||S.fin)return;
 const s=L.steps[S.step];let all=true,any=false;
 (s.m||[]).forEach(([t,n])=>{any=true;const ok=syn.mods.filter(x=>x.t===t).length>=n,ch=document.querySelector(`.chip[data-mk="${t}"]`);if(ch)ch.classList.toggle('ok',ok);if(!ok){all=false;if(ab)ab.classList.add('foc')}});
 (s.k||[]).forEach(([a,b])=>{any=true;const ok=syn.has(a,b),ch=document.querySelector(`.chip[data-ck="${a}|${b}"]`);if(ch)ch.classList.toggle('ok',ok);if(!ok)all=false});
 (s.f||[]).forEach(([id,g])=>{if(g===undefined)return;any=true;const ok=isMet(id,g,s.tol);U(id).ok(ok);
  const ch=document.querySelector(`.chip[data-id="${id}"]`);if(ch)ch.classList.toggle('ok',ok);if(!ok)all=false});
 if(s.sp&&s.sp.length&&S.synth==='add'){any=true;const ok=spAll(s.sp),ch=document.querySelector('.chip[data-spc]');if(ch)ch.classList.toggle('ok',ok);if(!ok)all=false}
 (s.mx||[]).forEach((g,i)=>{any=true;const ok=SD.MixGoal.mxMet(g,(play.tr[g.trk-1]||{}).mix),ch=document.querySelector(`.chip[data-mxg="${i}"]`);if(ch)ch.classList.toggle('ok',ok);if(!ok)all=false});
 (s.sn||[]).forEach((g,i)=>{any=true;const ok=SD.Auto.snMet(g,play.au,play.sc),ch=document.querySelector(`.chip[data-sng="${i}"]`);if(ch)ch.classList.toggle('ok',ok);if(!ok)all=false});
 (s.mt||[]).forEach((g,i)=>{any=true;const ok=!!(S.mtOk&&S.mtOk[i]),ch=document.querySelector(`.chip[data-mtg="${i}"]`);if(ch)ch.classList.toggle('ok',ok);if(!ok)all=false});
 if(s.au&&s.au.length){any=true;const R=SD.Auto.checkAu(play.au,s.au,autoDef);S.auRes=R;R.forEach((r,gi)=>r.items.forEach((it,ii)=>{const ch=document.querySelector(`.chip[data-aug="${gi}.${ii}"]`);if(ch)ch.classList.toggle('ok',it.ok)}));if(!R.every(r=>r.ok))all=false}else S.auRes=null;
 (s.c||[]).forEach(([k,mn])=>{any=true;const ok=cnt(k)>=mn,ch=document.querySelector(`.chip[data-cid="${k}"]`);
  if(ch){ch.classList.toggle('ok',ok);ch.textContent=cLabel(k,mn)}if(!ok)all=false});
 if(any&&all&&!S.met){S.met=true;toast('できた!');try{navigator.vibrate&&navigator.vibrate(25)}catch(_){}}
 if(!all)S.met=false;
}
const spAll=sp=>{const a=syn.cur();return sp.every(([n,t,tol])=>Math.abs((a[n-1]||0)-t)<=(tol===undefined?.1:tol)+1e-6)};
const spLabel=sp=>'倍音の棒 '+sp.map(([n,t])=>n+'→'+(+t.toFixed(2))).join(' ');
const cLabel=(k,mn)=>`${SD.COUNTERS[k]} ${Math.min(cnt(k),99)} / ${mn}以上`;
function renderCoach(){
 const L=S.lesson,co=$('#coach');$('#cshow').hidden=!(L&&S.coachHidden);
 if(!L||S.coachHidden){co.hidden=true;return}
 co.hidden=false;
 const n=L.steps.length,s=L.steps[S.step],last=S.step>=n-1;
 let body;
 if(S.fin)body=`<h3>レッスン完了!</h3><p>「${esc(L.title)}」おつかれさま。鍵盤とつまみで自由にいじって、耳で確かめてみよう。「お手本」と聴き比べるのもおすすめ。</p>`;
 else{
  const auChips=(s.au||[]).map((g,gi)=>{const p=autoDef(g.trk==null?0:g.trk,g.id);return p?SD.Auto.goalChips(g,p,play.au&&play.au.meter).map((t,ii)=>`<span class="chip" data-aug="${gi}.${ii}">${esc(t)}</span>`).join(''):''}).join('');
  const ML=SD.modLib,chips=auChips+mxChips(s)+(s.m||[]).map(([t,n])=>`<span class="chip" data-mk="${t}">${SD.MODS[t].name}${n>1?' ×'+n:''} を追加</span>`).join('')+(s.k||[]).map(([a,b])=>`<span class="chip" data-ck="${a}|${b}">${ML.label(a)} → ${ML.label(b)}</span>`).join('')+(s.f||[]).map(([id,g])=>{const p=PB(id);return `<span class="chip" data-id="${id}">${p.label}${g!==undefined?' → '+fmtGoal(p,g):''}</span>`}).join('')+(s.sp&&s.sp.length?`<span class="chip" data-spc="1">${spLabel(s.sp)}</span>`:'')+(s.c||[]).map(([k,mn])=>`<span class="chip" data-cid="${k}">${cLabel(k,mn)}</span>`).join('');
  body=`<div class="cs">STEP ${S.step+1} / ${n}</div><h3>${s.h}</h3><p>${tmH(s.b.replace(/\n/g,'<br>'))}</p><div class="chips">${chips}</div>${cmpHtml(s)}${L.save&&last?`<div class="chips"><button class="pri" data-act="rsave">レシピ保存: ${esc(L.save.name)}</button></div>`:''}${colHtml(s)}`;
 }
 const dots=L.steps.map((_,i)=>`<button data-act="dot" data-i="${i}" class="${i===S.step&&!S.fin?'cur':''}"><i></i></button>`).join('');
 co.innerHTML=`<div class="ch"><div class="ct">${esc(L.title)}</div><button data-act="coachhide" aria-label="解説を隠す">◂</button><button data-act="coachx" aria-label="レッスン終了">✕</button></div><div class="cb">${body}</div><div class="dots">${dots}</div><div class="cf"><button data-act="prev" ${S.step===0&&!S.fin?'disabled':''}>◀</button><button data-act="play" id="pbtn">▶ 試聴</button><button data-act="ab" id="abtn">お手本</button><button class="pri" data-act="next">${S.fin?'目次へ':last?'完了':'次へ ▶'}</button></div>`;
 updAB();checkGoals();
}
/* 解説の拡張(v1.3)。step.col=コラム{h,b}(配列可) / step.cmp=聞き比べ[{l,s:{つまみ:値}}] / step.dm=デモ中の自動セット[{t,s,r}] */
function colHtml(s){const c=[].concat(s.col||[]);return c.map(x=>`<details class="col"><summary>${esc(x.h)}</summary><p>${tmH(esc(x.b).replace(/\n/g,'<br>'))}</p></details>`).join('')}
function mxChips(s){
 const mx=(s.mx||[]).map((g,i)=>{const p=g.ins==='mix'?SD.MIXP.find(q=>q.id===g.k):SD.insDef(g.k),G=g.ins==='mix'?{name:'MIX'}:SD.INSG.find(q=>q.k===g.ins);return `<span class="chip" data-mxg="${i}">T${g.trk} ${G.name} ${p.label} → ${SD.fmt(p,g.rng[0])}〜${SD.fmt(p,g.rng[1])}</span>`}).join('');
 const mt=(s.mt||[]).map((g,i)=>`<span class="chip" data-mtg="${i}">${g.trk==='M'?'MASTER':'T'+g.trk} ${SD.MixGoal.MT[g.m]} ${g.rng[0]}〜${g.rng[1]}${g.m==='ovl'?'':' dB'} を${g.hold}秒</span>`).join('');
 const sn=(s.sn||[]).map((g,i)=>`<span class="chip" data-sng="${i}">シーン「${esc(g.scene)}」を ${g.at+1}小節目に${g.glide==='≥1bar'?'(1小節以上かけて)':g.glide==='≥1beat'?'(1拍以上かけて)':''}</span>`).join('');
 return mx+mt+sn}
/* mt 目標(メーターの範囲目標): 再生中だけ動く。hold 秒つづけて範囲に入ったら達成 */
function mtStop(){if(S.mtTmr){clearInterval(S.mtTmr);S.mtTmr=0}S.mtOn=false;S.mtOk=null;if(S.tab!=='mix')SD.bus.meterOn(false)}
function mtStart(s){
 mtStop();if(!(s&&s.mt&&s.mt.length))return;
 S.mtOn=true;S.mtOk=s.mt.map(()=>false);S.mtSt=s.mt.map(()=>({ok:0,bad:0}));S.mtPk=s.mt.map(()=>-90);S.mtT=performance.now();SD.bus.meterOn(true);
 S.mtTmr=setInterval(()=>{
  const L=S.lesson,st=L&&L.steps[S.step];if(!st||!st.mt||S.fin){mtStop();return}
  const B=SD.bus,now=performance.now(),dt=Math.min(.3,(now-S.mtT)/1000);S.mtT=now;let ch=false;
  const sr=B.ctx?B.ctx.sampleRate:48000;
  st.mt.forEach((g,i)=>{let v=null;
   if(g.m==='gr'){const q=B.trackGr(g.trk-1);v=q?Math.abs(q.gr):null}
   else if(g.m==='ovl'){const a=B.trackSpec(g.trk-1);if(a){const o=g.vs?B.trackSpec(g.vs-1):SD.Mix.sumPow(Array.from({length:SD.MAXT},(_,k)=>k!==g.trk-1?B.trackSpec(k):null));v=o?SD.Mix.overlap(SD.Mix.bandLevels(a,sr),SD.Mix.bandLevels(o,sr)):null}}
   else{const q=g.trk==='M'?B.masterMeter():B.trackMeter(g.trk-1);if(q){if(g.m==='peak'){S.mtPk[i]=SD.peakHold(S.mtPk[i],q.peak,dt,20);v=S.mtPk[i]}else v=q.rms}}
   const met=SD.MixGoal.hold(S.mtSt[i],SD.MixGoal.inRange(v,g.rng),dt,g.hold);if(met!==S.mtOk[i]){S.mtOk[i]=met;ch=true}});
  if(ch)checkGoals()},100)}
function cmpHtml(s){if(!s.cmp||!s.cmp.length)return '';const qa=S.qa&&S.qa.step===S.step?S.qa:null;return `<div class="cmp"><span>聞き比べ</span>${s.cmp.map((v,i)=>`<button data-act="cmp" data-i="${i}" class="${S.cmpi===i?'on':''}">${esc(v.l)}</button>`).join('')}</div>`+(s.quiz?`<div class="cmp qz"><span>${esc(s.quiz.q)}</span>${s.cmp.map((v,i)=>`<button data-act="qans" data-i="${i}" class="${qa&&qa.i===i?(qa.ok?'ok':'ng'):''}">${i+1}</button>`).join('')}</div>${qa&&qa.ok?`<p class="qex">${esc(s.quiz.ex)}</p>`:''}`:'')}
function cmpGo(i){
 const L=S.lesson;if(!L||S.fin)return;const v=(L.steps[S.step].cmp||[])[i];if(!v)return;
 SD.bus.setCmpGain(v.g||0);stopDemo();if(v.mt){play.tr.forEach((x,k)=>{x.mute=v.mt.indexOf(k)>=0});updTrk()}Object.keys(v.s||{}).forEach(id=>setP(id,v.s[id],false,true));if('fxo' in v){if(S.fxoSave===undefined)S.fxoSave=play.fxo||null;play.fxo=SD.fxOrdSave(v.fxo);SD.bus.setFxOrd(play.fxo);if(S.tab==='fx')showFx()}/* RP-4b: 聴き比べでマスターFXの並びを切り替える */
 /* v7.5a: tm={トラック番号(1始まり):{インサートのつまみID:値}} で、聞き比べにトラック別インサートの値を使う */
 if(v.tm){Object.keys(v.tm).forEach(t=>{const k=t-1,x=play.tr[k];if(!x)return;const tv=SD.cmpTmFill(v.tm[t]);Object.keys(tv).forEach(id=>{x.mix[id]=tv[id];SD.bus.setMix(k,id,tv[id])})});if(S.tab==='mix')renderMix()}
 /* v7.11b: bm={'A'|'B'|'C':{バスのつまみID:値}} で、聞き比べにバス(BUS A/B/C)のEQ・COMPの値を使う */
 if(v.bm){Object.keys(v.bm).forEach(b=>{const k='ABC'.indexOf(b),m=play.bm[k];if(!m)return;Object.keys(v.bm[b]).forEach(id=>{m[id]=v.bm[b][id];SD.bus.setBusMix(k,id,v.bm[b][id])})});if(S.tab==='mix')renderMix()}
 if(v.ln)S.cmpAu=SD.Auto.mkFromSpecs(v.ln,v.bars||play.au.bars,autoDef,play.au.meter);else if(v.au===false)S.cmpAu=SD.Auto.mk(play.au.bars,play.au.meter);else S.cmpAu=null;auMixReset();
 /* v7.8a: auMixReset が PAN 等を既定へ戻すので、tm の値(tPan など)を戻したあとに入れ直す */
 if(v.tm){Object.keys(v.tm).forEach(t=>{const k=t-1,x=play.tr[k];if(!x)return;Object.keys(v.tm[t]).forEach(id=>{if(id.charAt(0)==='t'){x.mix[id]=v.tm[t][id];SD.bus.setMix(k,id,v.tm[t][id])}})})}
 play.eng.poke();
 S.cmpi=i;document.querySelectorAll('.cmp button').forEach(b=>b.classList.toggle('on',+b.dataset.i===i));
 checkGoals();playDemo();
}
function dmRestore(){const sv=S.dmSave;if(!sv)return;S.dmSave=null;Object.keys(sv).forEach(id=>{try{setP(id,sv[id],false,true)}catch(_){}});checkGoals()}
function dmApply(e){
 Object.keys(e.s).forEach(id=>{const p=D().byId[id],v=e.s[id];if(!p)return;
  if(e.r&&p.type==='knob'){const f=SD.toN(p,syn.p[id]),t=SD.toN(p,v),n=Math.max(2,Math.ceil(e.r*1000/60));
   for(let k=1;k<=n;k++)demoT.push(setTimeout(()=>setP(id,SD.fromN(p,f+(t-f)*k/n),false,true),k*e.r*1000/n))}
  else setP(id,v,false,true)});
}
function updAB(){const b=$('#abtn');if(b){b.textContent=S.ab==='ref'?'自分の音':'お手本';b.classList.toggle('on',S.ab==='ref')}}
function toggleAB(){
 if(!S.lesson)return;
 const rf=S.lesson.steps[S.step].ref;
 if(S.ab==='mine'){S.mine=lessonState();applyPatch(keepM(S.lesson,refOf(S.lesson)));S.ab='ref';if(rf){auMixReset();S.cmpAu=SD.Auto.mkFromSpecs(rf,play.au.bars,autoDef,play.au.meter)}toast('お手本の音(もう一度押すと自分の音)')}
 else{applyPatch(S.mine);S.ab='mine';S.cmpAu=null;auMixReset();toast('自分の音に戻しました')}
 updAB();
}
let demoT=[];
function stopDemo(){demoT.forEach(clearTimeout);demoT=[];dmRestore();relAll();const b=$('#pbtn');if(b)b.textContent='▶ 試聴'}
function playDemo(){
 const L=S.lesson;if(!L)return;
 if(S.mode==='seq'||S.mode==='trk'){runToggle();const b=$('#pbtn');if(b)b.textContent=play.running?'■ 停止':'▶ 試聴';return}
 if(demoT.length){stopDemo();return}
 syn.init();
 const d=Object.assign({n:[55],gap:1.4,len:1.1},L.demo,L.steps[S.step].d||{});
 d.n.forEach((n,i)=>{const ms=[].concat(n);
  demoT.push(setTimeout(()=>ms.forEach(m=>S.mode==='arp'?play.arpDown(m):syn.noteOn(m)),i*d.gap*1000));
  demoT.push(setTimeout(()=>ms.forEach(m=>S.mode==='arp'?play.arpUp(m):syn.noteOff(m)),(i*d.gap+d.len)*1000))});
 const dm=L.steps[S.step].dm||L.dm;
 if(dm){S.dmSave={};dm.forEach(e=>Object.keys(e.s).forEach(id=>{if(!(id in S.dmSave)&&D().byId[id])S.dmSave[id]=syn.p[id]}));
  dm.forEach(e=>{if(!e.t)dmApply(e);else demoT.push(setTimeout(()=>dmApply(e),e.t*1000))})}
 demoT.push(setTimeout(()=>{demoT=[];dmRestore();const b=$('#pbtn');if(b)b.textContent='▶ 試聴'},((d.n.length-1)*d.gap+d.len)*1000+300));
 const b=$('#pbtn');if(b)b.textContent='■ 停止';
}

/* ---------- TOC / presets ---------- */
function openTOC(){
 const pg=prog();
 let h=`<div class="sh"><b>レッスン目次</b><button data-act="close">✕</button></div><div class="sb"><button class="row free" data-act="freeplay">レッスンなしで自由に音作り</button><button class="row free" data-act="gloss">用語集</button><div class="lvf">${[[0,'全部'],[1,'初級'],[2,'中級'],[3,'上級']].map(([k,n])=>`<button data-act="lvf" data-k="${k}" class="${k===(S.lvf|0)?'on':''}">${n}</button>`).join('')}</div>`;
 let num=0;const lvf=S.lvf|0;
 const lessonRows=c=>LESSONS.filter(l=>l.cat===c.id).map(l=>{
    num++;const p=pg[l.id]||{step:0,done:false},n=l.steps.length;
    const st=p.done?'<em>✓ 完了</em>':p.step>0?`<em>途中 ${p.step+1}/${n}</em>`:'';
    return `<div class="row"><div class="rt"><b>${num}. ${esc(l.title)}</b><span>${esc(l.sub)}(${n}ステップ)</span>${st}</div><div class="rb">${p.step>0&&!p.done?`<button class="pri" data-act="ls" data-id="${l.id}" data-from="${p.step}">続きから</button>`:''}<button data-act="ls" data-id="${l.id}" data-from="0">最初から</button></div></div>`}).join('');
 if(lvf<=1)SD.SYNTHS.forEach(sy=>{
  if(sy.noLesson)return;
  if(sy.id==='mod'){const ac=SD.CATS.filter(c=>c.chapter==='auto');if(ac.length){h+=`<h4 style="font-size:14px;border-bottom:1px solid var(--ln);padding-bottom:3px">オートメーション</h4><div class="sub">つまみの動きを時間軸に描いて、曲の流れを作る</div>`;ac.forEach(c=>{h+=`<h4>${c.name}</h4>`+lessonRows(c)})}}
  h+=`<h4 style="font-size:14px;border-bottom:1px solid var(--ln);padding-bottom:3px">${sy.name}</h4>${sy.sub?`<div class="sub">${sy.sub}</div>`:''}`;
  const cats=SD.CATS.filter(c=>c.synth===sy.id&&!c.chapter);
  if(!sy.ready||!cats.length){h+=`<div class="empty">準備中(${sy.ver||''})</div>`;return}
  cats.forEach(c=>{
   h+=`<h4>${c.name}</h4>`;
   LESSONS.filter(l=>l.cat===c.id).forEach(l=>{
    num++;const p=pg[l.id]||{step:0,done:false},n=l.steps.length;
    const st=p.done?'<em>✓ 完了</em>':p.step>0?`<em>途中 ${p.step+1}/${n}</em>`:'';
    h+=`<div class="row"><div class="rt"><b>${num}. ${esc(l.title)}</b><span>${esc(l.sub)}(${n}ステップ)</span>${st}</div><div class="rb">${p.step>0&&!p.done?`<button class="pri" data-act="ls" data-id="${l.id}" data-from="${p.step}">続きから</button>`:''}<button data-act="ls" data-id="${l.id}" data-from="0">最初から</button></div></div>`;
   });
  });
 });
 const LVN=['','初級','中級','上級'],cp=[];
 SD.CATS.filter(c=>c.chapter==='course').forEach(c=>{const ls=LESSONS.filter(l=>l.cat===c.id&&(!lvf||l.lv===lvf));if(!ls.length)return;
  if(!cp.length)cp.push(`<h4 style="font-size:14px;border-bottom:1px solid var(--ln);padding-bottom:3px">コース(中級・上級)</h4><div class="sub">曲の中で使える音を作る。前提は目安で、未修了でも開ける</div>`);
  cp.push(`<h4>${c.name}</h4>`+ls.map(l=>{num++;const p=pg[l.id]||{step:0,done:false},n=l.steps.length,rd=l.kind==='read',
   st=p.done?'<em>✓ 完了</em>':p.step>0?`<em>途中 ${p.step+1}/${n}</em>`:'',pre=(l.pre||[]).filter(i=>LBY[i]).map(i=>LBY[i].title).join('・');
   return `<div class="row"><div class="rt"><b>${num}. <i class="lvb lv${l.lv}">${LVN[l.lv]}</i>${esc(l.title)}</b><span>${esc(l.sub)}(${rd?'読み物 ':l.kind==='recipe'?'レシピ ':l.kind==='diag'?'診断 ':''}${n}ステップ)</span>${pre?`<span>前提の目安: ${esc(pre)}</span>`:''}${st}</div><div class="rb">${p.step>0&&!p.done?`<button class="pri" data-act="ls" data-id="${l.id}" data-from="${p.step}">続きから</button>`:''}<button data-act="ls" data-id="${l.id}" data-from="0">最初から</button></div></div>`}).join(''))});
 h+=cp.join('');
 ov(h+'</div>');
}
/* ---------- 用語集(v5.0) ---------- */
const tmH=t=>SD.guideTxt(t).replace(/【([^】]+)】/g,(m,n)=>{const x=SD.TERMS.find(q=>q.name===n);return x?`<a class="tm" data-act="term" data-id="${x.id}">${n}</a>`:n});
function glRows(q,id){const t=(q||'').trim().toLowerCase(),L=SD.TERMS.filter(x=>!t||[x.name,x.kana,x.en,(x.tags||[]).join(' ')].join(' ').toLowerCase().indexOf(t)>=0);
 return L.map(x=>{const o=x.id===id;return `<div class="row"><div class="rt"><b>${esc(x.name)}</b><span>${esc(x.en)}</span>${o?`<p class="td">${esc(x.def)}</p>`:''}</div><div class="rb">${o?(x.see||[]).filter(i=>LBY[i]).map(i=>`<button data-act="ls" data-id="${i}" data-from="0">${esc(LBY[i].title)}</button>`).join(''):`<button data-act="tdef" data-id="${x.id}">意味</button>`}</div></div>`}).join('')||'<div class="empty">見つかりません</div>'}
function openGlossary(id){ov(`<div class="sh"><b>用語集</b><button data-act="close">✕</button></div><div class="sb"><input id="gq" autocomplete="off" placeholder="かな・英語・タグで検索"><div id="gl">${glRows('',id)}</div></div>`)}
function fmFactory(){return S.synth==='fm'?SD.FMPRESETS.map(q=>({id:'f_fm_'+q.id,name:q.name,synth:'fm',patch:SD.fmPatch(q.id),oct:0,fac:true})):[]}
function drumFactory(){return S.synth==='analog'?SD.DRUMS.map(d=>({id:'f_dr_'+d.id,name:'ドラム: '+d.name,synth:'analog',patch:Object.assign({},d.p),oct:d.oct,fac:true})):[]}
function voiceFactory(){return SD.VOICES.filter(d=>d.synth===S.synth).map(d=>({id:'f_'+d.id,name:d.name+'(代役)',synth:d.synth,patch:Object.assign({},d.p),oct:d.oct,fac:true}))}
function factory(){return fmFactory().concat(drumFactory()).concat(voiceFactory()).concat(LESSONS.filter(l=>l.synth===S.synth&&!(l.kind==='read'||(l.course&&l.tk))).map(l=>({id:'f_'+l.id,name:'お手本: '+l.title,synth:l.synth,patch:Object.fromEntries(Object.entries(refOf(l)).filter(([k])=>!SD.PLAYP[k])),oct:l.oct||0,fac:true})))}
function openPresets(t){
 t=t||'mine';S.ptab=t;
 const us=ST.get('presets',[]).filter(x=>(x.synth||'analog')===S.synth),favs=ST.get('favs',[]);
 let items;
 if(t==='mine')items=us;
 else if(t==='fav')items=us.filter(x=>x.fav).concat(factory().filter(x=>favs.includes(x.id)));
 else items=factory();
 const isFav=x=>x.fac?favs.includes(x.id):x.fav;
 const tabs=[['mine','自作'],['fav','お気に入り'],['fac','お手本集']].map(([k,n])=>`<button data-act="ptab" data-t="${k}" class="${k===t?'on':''}">${n}</button>`).join('');
 const list=items.length?items.map(x=>`<div class="row"><div class="rt"><b>${esc(x.name)}</b></div><div class="rb"><button class="fv ${isFav(x)?'on':''}" data-act="pfav" data-id="${x.id}" aria-label="お気に入り">${isFav(x)?'★':'☆'}</button><button class="pri" data-act="pload" data-id="${x.id}">読み込む</button>${x.fac?'':`<button data-act="pdel" data-id="${x.id}">削除</button>`}</div></div>`).join(''):`<div class="empty">${t==='mine'?'まだ保存した音色がありません。「今の音を保存」で追加できます。':'まだありません。★を押すとここに集まります。'}</div>`;
 ov(`<div class="sh"><b>音色</b><button data-act="close">✕</button></div><div class="sb"><div class="pact"><button data-act="psave">今の音を保存</button><button data-act="pinit">初期音に戻す</button></div><div class="ptabs">${tabs}</div>${list}</div>`);
}
function findPreset(id){return id.indexOf('f_')===0?factory().find(x=>x.id===id):ST.get('presets',[]).find(x=>x.id===id)}
function loadPreset(x){if((x.synth||'analog')!==S.synth)switchSynth(x.synth||'analog',true);if(S.lesson)exitLesson(true);applyPatch(x.patch);if(x.oct!=null)setOct(x.oct);ST.set(freeKey(S.synth),getPatch());closeOv();toast('読み込みました: '+x.name)}

/* ---------- tabs / octave / keyboard ---------- */
/* つまみの大きさ: 実際のグリッドの高さと行数から決める(端末ごとに高さが違うため、固定の見積りでは収まらない) */
function fitKs(el,rows,gap,cols,cgap){
 if(!el||!el.clientHeight)return;
 const cs=getComputedStyle(el),px=k=>parseFloat(cs[k])||0;
 const H=el.clientHeight-px('paddingTop')-px('paddingBottom'),W=el.clientWidth-px('paddingLeft')-px('paddingRight'),r=Math.max(1,rows||1),c=Math.max(1,cols||1),cg=cgap==null?2:cgap;
 const kh=Math.floor((H-(gap==null?2:gap)*(r-1))/r-32),kw=Math.floor((W-cg*(c-1))/c-8);
 el.style.setProperty('--ks',Math.max(22,Math.min(72,kh,kw))+'px');
}
function fitGrid(){const g=$('#grid');if(!g)return;fitKs(g,+g.style.getPropertyValue('--r')||1,2,+g.style.getPropertyValue('--c')||1,2)}
function showTab(id){showTab0(id);if(typeof applyKb==='function')applyKb()}
function showTab0(id){
 if(id==='mix'){showMix();return}
 if(id==='au'){showAu();return}
 if(id==='fx'&&D().T.some(t=>t.id==='fx'&&t.items.indexOf('drive')>=0)){showFx();return}
 if(id==='arp'||id==='seq'||id==='trk'){showPlayTab(id);return}
 if(id==='rack'&&S.synth==='mod'){showRack();return}
 if(id==='harm'&&S.synth==='wt'){showHarm();return}
 S.tab=id;const t=D().T.find(x=>x.id===id),g=$('#grid');
 g.style.setProperty('--c',t.cols);g.style.setProperty('--r',t.rows);
 while(g.firstChild)g.removeChild(g.firstChild);
 t.items.forEach((i,n)=>{const e=ui[i].el;e.style.gridColumn='';e.style.gridRow='';
  if(t.at&&t.at[i]){e.style.gridColumn=t.at[i][0];e.style.gridRow=t.at[i][1]}
  else if(t.place){if(ui[i].kind){e.style.gridColumn=(t.place+1)+' / span 2';e.style.gridRow='1 / span 2'}else{e.style.gridColumn=(n%t.place)+1;e.style.gridRow=Math.floor(n/t.place)+1}}
  g.appendChild(e)});vizDirty=true;fitGrid();
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.id===id));
}
function markTabs(){
 const L=S.lesson,ids=new Set();
 if(L&&!S.fin)(L.steps[S.step].f||[]).forEach(([id])=>ids.add(PB(id).tab));
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('has',ids.has(b.dataset.id)&&b.dataset.id!==S.tab));
}
function setOct(o){S.oct=Math.max(-2,Math.min(2,o));ST.set('oct',S.oct);$('#octl').textContent='OCT '+(S.oct>0?'+':'')+S.oct;
 const base=48+S.oct*12;document.querySelectorAll('.kl').forEach(k=>k.textContent='C'+(Math.floor((base+ +k.dataset.o)/12)-1));}
function buildKbd(){
 const kb=$('#kbd'),ks=E('div','kb'),NW=15,nm=[0,2,4,5,7,9,11];
 for(let i=0;i<NW;i++){const k=E('div','key w'),o=Math.floor(i/7)*12+nm[i%7];k.dataset.o=o;if(i%7===0)k.innerHTML=`<i class="kl" data-o="${o}"></i>`;ks.appendChild(k)}
 for(let i=0;i<NW-1;i++)if([0,1,3,4,5].includes(i%7)){const k=E('div','key b');k.dataset.o=Math.floor(i/7)*12+nm[i%7]+1;k.style.left=((i+1)/NW*100-2.1)+'%';ks.appendChild(k)}
 kb.appendChild(ks);KMAP={};ks.querySelectorAll('.key').forEach(k=>{KMAP[k.dataset.o]=k});
 const ptr=new Map();
 const down=(id,k)=>{const m=48+S.oct*12+ +k.dataset.o;ptr.set(id,{k,m});
  if(S.mode==='arp'){k.classList.add('on');syn.init();play.arpDown(m);return}
  if(S.mode==='seq'||S.mode==='trk'){k.classList.add('on');const n=seqKey(m);ptr.set(id,{k,m:n});syn.noteOn(n);return}
  if(S.hold){if(syn.held.has(m)){syn.noteOff(m);k.classList.remove('on','hl')}else{syn.noteOn(m);k.classList.add('on','hl')}return}
  k.classList.add('on');syn.noteOn(m)};
 const up=id=>{const c=ptr.get(id);if(!c)return;ptr.delete(id);
  if(S.mode==='arp'){c.k.classList.remove('on');play.arpUp(c.m);return}
  if(S.mode==='seq'||S.mode==='trk'){c.k.classList.remove('on');syn.noteOff(c.m);return}
if(S.hold&&c.k.classList.contains('hl'))return;c.k.classList.remove('on');if(!S.hold)syn.noteOff(c.m)};
 ks.addEventListener('pointerdown',e=>{const k=e.target.closest('.key');if(!k)return;try{ks.setPointerCapture(e.pointerId)}catch(_){}down(e.pointerId,k);e.preventDefault()});
 ks.addEventListener('pointermove',e=>{const c=ptr.get(e.pointerId);if(!c)return;const el=document.elementFromPoint(e.clientX,e.clientY),k=el&&el.closest&&el.closest('.key');if(k&&k!==c.k&&(!S.hold||S.mode!=='key')){up(e.pointerId);down(e.pointerId,k)}});
 ['pointerup','pointercancel'].forEach(t=>ks.addEventListener(t,e=>up(e.pointerId)));
 ks.addEventListener('contextmenu',e=>e.preventDefault());
}

/* ---------- scope ---------- */
function drawScope(){
 requestAnimationFrame(drawScope);sqPaint();if(S.tab==='fx')fxLamp();
 const bp=play.beatPos(),bi=bp<0?-1:Math.floor(bp)%4;
 if(bi!==S.bi){S.bi=bi;document.querySelectorAll('#beat i').forEach((e,i)=>e.classList.toggle('on',i===bi))}
 if(syn.posDirty&&(S.tab==='wave'||S.tab==='sample'||S.tab==='scan'||S.tab==='smp'||S.tab==='cnv')){syn.posDirty=false;vizDirty=true}
 {const w=SYN.wt;if(w&&w.fixedMat){const bad=w.fixedMat;w.fixedMat=null;if(S.synth==='wt'&&UIS.wt.wsMat)UIS.wt.wsMat.set(w.p.wsMat);vizDirty=true;toast('素材「'+(SD.UMAT.isU(bad)?'取り込み素材':'指定の素材')+'」が見つからないため、VOICEに戻しました')}}
 {const a=SYN.add;if(a&&a.lvNew){a.lvNew=false;if(S.synth==='add'&&(S.tab==='spec'||S.tab==='env'||S.tab==='draw'))vizDirty=true}}
 if(vizDirty){vizDirty=false;drawViz()}
 const cv=$('#scope'),w=cv.clientWidth*(window.devicePixelRatio||1)|0,h=cv.clientHeight*(window.devicePixelRatio||1)|0;
 if(!w||!h)return;if(cv.width!==w)cv.width=w;if(cv.height!==h)cv.height=h;
 const g=cv.getContext('2d');g.clearRect(0,0,w,h);
 const an=syn.bus.an;g.lineWidth=Math.max(1.5,h/20);g.strokeStyle='#f2c14e';
 if(!an){g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();return}
 if(S.scope==='spec'){
  const n=an.frequencyBinCount,d=drawScope.f||(drawScope.f=new Uint8Array(n)),sr=syn.ctx.sampleRate;an.getByteFrequencyData(d);
  g.fillStyle='rgba(242,193,78,.35)';g.beginPath();g.moveTo(0,h);
  for(let x=0;x<=w;x+=2){const f=20*Math.pow(1000,x/w),b=Math.min(n-1,Math.round(f/(sr/2)*n));g.lineTo(x,h-d[b]/255*h*.95)}
  g.lineTo(w,h);g.closePath();g.fill();g.stroke();
 }else{
  const n=an.fftSize,d=drawScope.t||(drawScope.t=new Uint8Array(n));an.getByteTimeDomainData(d);
  let st=0;for(let i=1;i<n/2;i++)if(d[i-1]<128&&d[i]>=128){st=i;break}
  g.beginPath();for(let x=0;x<w;x++){const v=d[st+Math.floor(x/w*(n/2-1))]/255;x?g.lineTo(x,h-v*h):g.moveTo(x,h-v*h)}g.stroke();
 }
}

function relAll(){play.killAll();syn.allOff();MD.on.clear();MD.susd.clear();MD.sus=false;document.querySelectorAll('.key.on,.key.hl').forEach(k=>k.classList.remove('on','hl'))}
/* ---------- MIDI入力・鍵盤の大きさ ---------- */
/* MIDIのノート番号は実音のまま受け、OCTボタンの分だけ移調する(画面鍵盤と同じ音になる)。
   画面鍵盤は C3〜C5(48〜72)の範囲だけ光る。KEY=発音 / HOLD=押すたびに入切 / ARP=ノートを渡す / SEQ・TRK=選択中のステップに入力して発音 */
let KMAP={};
const MD={on:new Map(),sus:false,susd:new Set(),last:''};
const kbSmall=()=>CFG.kb==='s'||(CFG.kb!=='n'&&(SD.Midi.names.length>0||S.tab==='mix'||S.tab==='au'));
function applyKb(){
 const sm=kbSmall(),b=$('#kbsb'),mb=$('#midib');
 $('#app').classList.toggle('kbs',sm);
 if(b){b.textContent=sm?'鍵盤 ▲':'鍵盤 ▼';b.classList.toggle('on',sm)}
 if(mb){mb.hidden=!SD.Midi.supported();mb.classList.toggle('on',SD.Midi.names.length>0)}
 vizDirty=true;
}
function mKey(n,on,hl){const k=KMAP[n-48];if(!k)return;k.classList.toggle('on',on);if(hl!==undefined)k.classList.toggle('hl',hl)}
function midiOn(n,vel){
 if(!$('#start').classList.contains('off'))return;
 const m=n+S.oct*12;if(m<0||m>127)return;
 const v=CFG.vel?.2+.8*vel/127:1;
 syn.init();
 if(S.mode==='arp'){MD.on.set(n,{m,md:'arp'});mKey(n,true);play.arpDown(m);return}
 if(S.mode==='seq'||S.mode==='trk'){const q=seqKey(m);MD.on.set(n,{m:q,md:'seq'});mKey(n,true);syn.noteOn(q,v);return}
 if(S.hold){if(syn.held.has(m)){syn.noteOff(m);mKey(n,false,false)}else{syn.noteOn(m,v);mKey(n,true,true)}return}
 MD.susd.delete(n);MD.on.set(n,{m,md:'key'});mKey(n,true);syn.noteOn(m,v);
}
function midiRel(n){
 const c=MD.on.get(n);if(!c)return;
 MD.on.delete(n);MD.susd.delete(n);mKey(n,false);
 if(c.md==='arp')play.arpUp(c.m);else syn.noteOff(c.m);
}
function midiOff(n){
 const c=MD.on.get(n);if(!c)return;
 if(c.md==='key'&&MD.sus){MD.susd.add(n);return}
 midiRel(n);
}
function midiMsg(m){
 if(m.t==='on')midiOn(m.n,m.v);
 else if(m.t==='off')midiOff(m.n);
 else if(m.t==='cc'){
  if(mmCc(m))return;
  if(m.c===64){MD.sus=m.v>=64;if(!MD.sus)[...MD.susd].forEach(midiRel)}
  else if(m.c===123||m.c===120){relAll()}
  else{const e=SD.MidiMap.find(mmMap(),m.c,m.ch);if(e)mmApply(e,m.v)}
 }
}
function midiState(){
 const nm=SD.Midi.names.join(', ');
 if(nm!==MD.last){if(nm)toast('MIDI接続: '+nm);else if(MD.last)toast('MIDIが切断されました');MD.last=nm}
 applyKb();
 if($('#ov').classList.contains('on')&&$('#ov').querySelector('#midist'))openCfg();
}
function midiText(){
 const s=SD.Midi.status;
 return s==='ok'?'接続中: '+SD.Midi.names.join(', '):s==='unsupported'?'この環境はMIDI入力に対応していません(Chrome系ブラウザ・対応するAndroid端末で使えます)':s==='denied'?'MIDIの利用が許可されませんでした':s==='none'?'MIDI機器が見つかりません(USB/Bluetoothで接続して「再検索」)':'未確認'
}
function setHold(b){S.hold=b;play.setHold(b);$('#holdb').classList.toggle('on',b);if(!b)relAll();else toast('HOLD ON: 鍵盤を離しても鳴り続けます(もう一度押すと止まる)')}
function setFine(b){CFG.fine=b;ST.set('cfg',CFG);$('#fineb').classList.toggle('on',b)}
function setFz(v){CFG.fz=v;ST.set('cfg',CFG);document.documentElement.style.setProperty('--fz',v)}
function buildTabs(){const tabs=$('#tabs');tabs.innerHTML='';const TL=D().T.filter(t=>!t.only||Object.keys(t.only).every(k=>[].concat(t.only[k]).indexOf(syn.p[k])>=0));TL.push({id:'mix',name:'MIX'});if(S.mode==='arp')TL.push({id:'arp',name:'ARP'});if(S.mode==='seq')TL.push({id:'seq',name:'SEQ'});if(S.mode==='trk')TL.push({id:'trk',name:'TRK'});if(S.mode==='seq'||S.mode==='trk')TL.push({id:'au',name:'AUTO'});TL.forEach(t=>{const b=E('button','tab',t.name);b.dataset.act='tab';b.dataset.id=t.id;tabs.appendChild(b)});
 if(S.synth==='mod'){tabs.insertAdjacentHTML('beforeend','<button class="tb first" id="addmb" data-act="addmod" aria-label="モジュール追加">＋</button><button class="tb" id="delcb" data-act="delcab" disabled>✂ ケーブル削除</button><button class="tb" data-act="modmenu" aria-label="メニュー">⋯</button>')}}
/* 条件付きタブ(SMP)の出し入れ。表示中のSMPタブが消える場合はWAVEへ戻す */
const firstTab=()=>S.synth==='add'&&syn.p.adLayout==='drawbar'?'draw':D().T[0].id;
function refreshTabs(){buildTabs();if(S.synth==='add'&&!document.querySelector('.tab[data-id="'+S.tab+'"]')&&S.tab!=='arp'&&S.tab!=='seq'&&S.tab!=='trk'&&S.tab!=='au'){showTab(syn.p.adLayout==='drawbar'?'draw':'spec');markTabs();return}if((S.tab==='smp'||S.tab==='cnv')&&syn.p.wTable!=='sample'){showTab('wave');markTabs();return}document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.id===S.tab));markTabs()}
function synName(id){const y=SD.SYNTHS.find(y=>y.id===id);return y.short||y.name}
function chkUnsup(now){$('#unsupb').hidden=true;const f=()=>{const u=!!syn.unsup;$('#unsupb').hidden=!u;if(u)toast('このシンセはこの端末では非対応です')};if(now)f();else setTimeout(f,700)}
let vlt=0;function showVoice(){const e=$('#vload');e.classList.add('on');clearTimeout(vlt);vlt=setTimeout(()=>e.classList.remove('on'),1400)}
function switchSynth(id,silent){
 if(id===S.synth)return;
 if(S.lesson)exitLesson(true);
 clearTimeout(ft);ST.set(freeKey(S.synth),syn.getPatch());
 const old=syn,fx={};SD.FXIDS.forEach(k=>fx[k]=old.p[k]);
 old.allOff();relAll();stopDemo();
 S.synth=id;ST.set('synth',id);syn=SYN[id];ui=UIS[id];
 buildTabs();
 if(SD.bus.ctx)syn.init();chkUnsup();
 applyPatch(Object.assign({},ST.get(freeKey(id),{}),fx));
 setP('master',ST.get('master',.7),false,true);
 $('#synb').textContent=synName(id);
 showTab(firstTab());markTabs();renderCoach();vizDirty=true;
 if(!silent)toast(synName(id)+'に切り替えました');
}
function openSynth(){
 ov(`<div class="sh"><b>シンセ切替</b><button data-act="close">✕</button></div><div class="sb">${SD.SYNTHS.map(y=>`<div class="row ${y.ready?'':'off'}"><div class="rt"><b>${y.name}</b><span>${y.ready?(y.id===S.synth?'使用中':''):'準備中('+y.ver+')'}</span>${y.sub?`<div class="sub">${y.sub}</div>`:''}</div><div class="rb">${y.ready?`<button class="pri" data-act="usesynth" data-id="${y.id}">選ぶ</button>`:''}</div></div>`).join('')}</div>`,'sm');
}
function openCfg(){
 const seg=(act,cur,l)=>`<div class="ptabs g">${l.map(([v,n])=>`<button data-act="${act}" data-v="${v}" class="${String(v)===String(cur)?'on':''}">${n}</button>`).join('')}</div>`;
 ov(`<div class="sh"><b>設定</b><button data-act="close">✕</button></div><div class="sb"><div class="lab">解説の文字サイズ</div>${seg('fz',CFG.fz,[[.9,'小'],[1,'中'],[1.2,'大']])}<div class="lab">つまみのドラッグ感度</div>${seg('finec',CFG.fine,[[false,'通常'],[true,'ファイン']])}<div class="sub">つまみはダブルタップで初期値に戻ります。</div><div class="lab">鍵盤の大きさ</div>${seg('kbc',CFG.kb,[['n','通常'],['s','小'],['a','MIDI接続中は小']])}<div class="lab">MIDI入力</div><div class="sub" id="midist">${midiText()}</div>${seg('velc',CFG.vel,[[true,'ベロシティ反映'],[false,'固定']])}<button class="row free" data-act="midiscan">再検索</button><div class="sub">MIDIの音はOCTボタンの分だけ移調されます。サステインペダル(KEYモード)・オールノートオフに対応。</div>${mmCfgHtml(seg)}<div class="lab">オートメーションの反映方式(試験)</div>${seg('schedc',CFG.sched,[['legacy','従来'],['curve','先読み予約']])}<div class="sub">先読み予約=EQ・VOL・PAN・マスターの一部を、80ms先まで曲線で予約します(高速な掃引のプチプチ対策)。既定です。おかしいときは「従来」に戻してください。</div><div class="lab">データ</div><button class="row free" data-act="data">書き出し / 読み込み</button><div class="lab">素材</div><button class="row free" data-act="mat">素材の管理(波形・試聴・読み込み)</button><div class="sub">シンセ道場 v2.5b ／ データ形式 sd_ver ${SD.VER}</div></div>`,'sm');
}
/* 素材マネージャ(v1.0〜): 内蔵8素材+取り込み素材(v1.5)。波形確認・試聴・グラニュラーで使う・読み込み・名前変更・削除 */
const MV={id:'b:voice',wv:null,src:null,raf:0,t0:0};
function openMat(){
 SD.UMAT.init();matStop();
 const us=SD.UMAT.list(),u=SD.UMAT.usage(),mb=x=>(x/1048576).toFixed(1);
 if(!SD.MAT.info(MV.id))MV.id='b:voice';
 ov(`<div class="sh"><b>素材</b><button data-act="close">✕</button></div><div class="sb"><div class="lab">内蔵素材</div><div class="ptabs g" id="mvl">${SD.MAT.list.map(x=>`<button data-act="matsel" data-id="${x.id}" class="${x.id===MV.id?'on':''}">${x.name}</button>`).join('')}</div>
<div class="lab">自分の音(${u.count}/${u.maxCount}個 ・ ${mb(u.bytes)}/${mb(u.maxBytes)}MB)</div><div id="mvu">${us.map(x=>`<div class="row ${x.id===MV.id?'on':''}" data-id="${x.id}"><div class="rt"><b>${esc(x.name)}</b><span>${(x.n/x.sr).toFixed(1)}秒</span></div><div class="rb"><button data-act="matsel" data-id="${x.id}">選ぶ</button><button data-act="matren" data-id="${x.id}">名前</button><button data-act="matdel" data-id="${x.id}">削除</button></div></div>`).join('')||'<div class="empty">まだありません</div>'}</div>
<input type="file" id="mvf" accept="audio/*" hidden><button class="row free" data-act="matimp">＋ 音声ファイルを読み込む</button>
<div class="sub">1素材は${SD.UMAT.LIM.sec}秒まで(超えた分は切り捨て)、ファイルは${Math.round(SD.UMAT.LIM.file/1048576)}MBまで。モノラルに変換して端末内に保存します(書き出しデータには含まれません)。<br><b>自分が権利を持つ音声だけを使ってください。</b>データは端末内にだけ保存され、アプリには同梱されません。${SD.UMAT.persistent?'':'<br>この端末では保存できないため、アプリを閉じると消えます。'}</div>
<canvas id="mvc" style="width:100%;height:110px;border-radius:8px;margin-top:8px;display:block"></canvas><div class="sub" id="mvi"></div><div class="pact"><button data-act="matplay" id="mvp">▶ 試聴</button><button class="pri" data-act="matuse">グラニュラーで使う</button><button class="pri" data-act="matusewt">サンプルWTで使う</button><button class="pri" data-act="matusesmp">素材再生トラックで使う</button></div></div>`);
 MV.wv=new SD.WaveView($('#mvc'));matShow(MV.id);
}
function matShow(id){
 matStop();MV.id=id;
 document.querySelectorAll('#mvl button,#mvu .row').forEach(x=>x.classList.toggle('on',x.dataset.id===id));
 const inf=SD.MAT.info(id);if(!inf||!MV.wv)return;
 MV.wv.setPos(null);MV.wv.setMat(null);$('#mvi').textContent='読み込み中…';
 (SD.UMAT.isU(id)?SD.UMAT.load(id):Promise.resolve(SD.MAT.get(id))).then(m=>{
  if(MV.id!==id||!$('#mvi'))return;if(!m){$('#mvi').textContent='読み込めませんでした';return}
  MV.wv.setMat(m);$('#mvi').textContent=inf.label+' / '+(m.data.length/m.sr).toFixed(1)+'秒 / '+m.sr+'Hz'});
}
function matStop(){
 if(MV.src){try{MV.src.stop()}catch(_){}MV.src=null}
 cancelAnimationFrame(MV.raf);const b=$('#mvp');if(b)b.textContent='▶ 試聴';if(MV.wv)MV.wv.setPos(null);
}
function matPlay(){
 if(MV.src){matStop();return}
 const m=SD.MAT.get(MV.id);if(!m)return;
 const ctx=SD.bus.init(),buf=ctx.createBuffer(1,m.data.length,m.sr);buf.getChannelData(0).set(m.data);
 const s=ctx.createBufferSource(),g=ctx.createGain();g.gain.value=.6;s.buffer=buf;s.connect(g);g.connect(SD.bus.input);
 MV.src=s;MV.t0=ctx.currentTime;$('#mvp').textContent='■ 停止';
 s.onended=()=>{if(MV.src===s)matStop()};s.start();
 const tick=()=>{if(MV.src!==s)return;MV.wv.setPos((ctx.currentTime-MV.t0)/buf.duration);MV.raf=requestAnimationFrame(tick)};tick();
}
async function matImport(file){
 if(!file)return;
 if(file.size>SD.UMAT.LIM.file){toast('ファイルが大きすぎます('+Math.round(SD.UMAT.LIM.file/1048576)+'MBまで。短く切ってから読み込んでください)');return}
 toast('読み込み中…');
 let r;
 try{
  const ctx=SD.bus.init(),ab=await file.arrayBuffer();
  const buf=await new Promise((res,rej)=>{const p=ctx.decodeAudioData(ab,res,rej);if(p&&p.then)p.then(res,rej)});
  const chs=[];for(let i=0;i<buf.numberOfChannels;i++)chs.push(buf.getChannelData(i));
  r=await SD.UMAT.add(file.name.replace(/\.[^.]*$/,''),chs,buf.sampleRate);
 }catch(e){toast('この形式の音声は読み込めませんでした');return}
 if(!r.ok){toast(r.msg);return}
 toast('読み込みました'+(r.msg?'('+r.msg+')':''));
 if($('#mvu')){MV.id=r.id;openMat()}
}
function matFallback(id){
 {const q=SYN.smp;if(q&&q.p.sMat===id){const d=SD.defs.smp.DEF.sMat;if(S.synth==='smp')setP('sMat',d,false,true);else q.set('sMat',d)}}
 const g=SYN.gr;if(g&&g.p.gMat===id){const d=SD.defs.gr.DEF.gMat;if(S.synth==='gr')setP('gMat',d,false,true);else g.set('gMat',d)}
 const w=SYN.wt;if(w&&w.p.wsMat===id){const d=SD.defs.wt.DEF.wsMat;if(S.synth==='wt')setP('wsMat',d,false,true);else w.set('wsMat',d)}}
function matDel(id){
 const m=SD.UMAT.find(id);if(!m||!confirm('「'+m.name+'」を削除しますか?'))return;
 SD.UMAT.remove(id).then(ok=>{if(!ok){toast('削除できませんでした');return}matFallback(id);if(MV.id===id)MV.id='b:voice';openMat();toast('削除しました')});
}
function matUse(){
 const id=MV.id,inf=SD.MAT.info(id);if(!inf)return;
 if(S.lesson)exitLesson(true);closeOv();if(S.synth!=='gr')switchSynth('gr',true);
 setP('gMat',id,false,true);showTab('sample');toast('素材を切り替えました: '+inf.name);
}
function matUseSmp(){
 const id=MV.id,inf=SD.MAT.info(id);if(!inf)return;
 if(S.lesson)exitLesson(true);closeOv();if(S.synth!=='smp')switchSynth('smp',true);
 setP('sMat',id,false,true);showTab('sample');toast('素材再生で鳴らす素材を切り替えました: '+inf.name);
}
function matUseWT(){
 const id=MV.id,inf=SD.MAT.info(id);if(!inf)return;
 if(S.lesson)exitLesson(true);closeOv();if(S.synth!=='wt')switchSynth('wt',true);
 if(syn.p.wTable!=='sample')setP('wTable','sample',false,true);
 setP('wsMat',id,false,true);showTab('smp');toast('サンプル由来テーブルの素材を切り替えました: '+inf.name);
}
function exportJSON(){return JSON.stringify({app:'synth-dojo',sd_ver:SD.VER,date:new Date().toISOString(),data:ST.dump()})}
function openData(){
 ov(`<div class="sh"><b>データの書き出し / 読み込み</b><button data-act="close">✕</button></div><div class="sb"><div class="sub">音色・進捗・設定をJSONで保存します。再インストール前の保険に。下の欄にそのまま貼り付けて読み込むこともできます。</div><textarea id="dj" spellcheck="false">${esc(exportJSON())}</textarea><div class="pact" style="margin-top:6px"><button data-act="dsave">ファイルに保存/共有</button><button data-act="dcopy">コピー</button></div><div class="pact"><button data-act="dfile">ファイルから読み込む</button><button data-act="dpaste">欄の内容を読み込む</button></div><input id="df" type="file" accept=".json,application/json,text/plain" hidden></div>`);
 $('#df').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>importJSON(String(r.result));r.readAsText(f)});
}
function importJSON(t){
 let o;try{o=JSON.parse(t)}catch(e){toast('JSONとして読めません');return}
 if(!o||o.app!=='synth-dojo'||!o.data){toast('シンセ道場のデータではありません');return}
 if((o.sd_ver||1)>SD.VER){toast('新しい版のデータです。アプリを更新してください');return}
 if(!confirm('今のデータを上書きして読み込みます。よろしいですか?'))return;
 ST.load(o.data);ST.set('ver',o.sd_ver||1);ST.migrate();toast('読み込みました。再起動します');setTimeout(()=>location.reload(),700);
}
async function saveFile(){
 const txt=exportJSON(),name='synth-dojo-backup.json',P=window.Capacitor&&Capacitor.Plugins||{};
 try{
  if(P.Filesystem&&P.Share){await P.Filesystem.writeFile({path:name,data:txt,directory:'CACHE',encoding:'utf8'});
   const u=await P.Filesystem.getUri({path:name,directory:'CACHE'});await P.Share.share({title:name,url:u.uri});return}
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();toast('保存しました');
 }catch(e){toast('保存できません。「コピー」を使ってください')}
}
function copyData(){const t=$('#dj');t.focus();t.select();let ok=false;try{ok=document.execCommand('copy')}catch(_){}
 if(!ok&&navigator.clipboard)navigator.clipboard.writeText(t.value).then(()=>toast('コピーしました'),()=>toast('コピーできません'));else toast(ok?'コピーしました':'コピーできません')}

/* ---------- actions ---------- */
function act(a,b){
 switch(a){
  case 'toc':openTOC();break;
  case 'tsel':trkSelect(+b.dataset.t);break;
  case 'mixdk':{const x=play.tr[+b.dataset.t],k=+b.dataset.t;x.mix.dkOn=x.mix.dkOn?0:1;if(x.mix.dkSrc===k)x.mix.dkSrc=(k+1)%SD.MAXT;SD.bus.setMix(k,'dkSrc',x.mix.dkSrc);SD.bus.setMix(k,'dkOn',x.mix.dkOn);renderMix();savePlay();break}
  case 'autool':AU.tool=b.dataset.v;AU.pt=-1;renderAu();break;
  case 'augrid':AU.grid=+b.dataset.v;renderAu();break;
  case 'auundo':if(auH().undo())auDone();break;
  case 'auredo':if(auH().redo())auDone();break;
  case 'auseam':{const l=auCur();if(l&&l.pts.length){auH().push();SD.Auto.seam(l,SD.Auto.len(play.au));auDone()}break}
  case 'aupsh':{const l=auCur(),q=l&&l.pts[AU.pt];if(q){auH().push();q[2]=b.dataset.v;if(q[2]!=='L')q.length=3;auDone()}break}
  case 'aupcu':{const l=auCur(),q=l&&l.pts[AU.pt];if(q){auH().push();q[3]=Math.max(-1,Math.min(1,Math.round(((q[3]||0)+ +b.dataset.d)*10)/10));if(!q[3])q.length=3;auDone()}break}
  case 'aupdel':{const l=auCur();if(l&&l.pts[AU.pt]){auH().push();SD.Auto.remove(l,AU.pt);AU.pt=-1;auDone()}break}
  case 'aumv':{const l=auCur(),p=l&&auDefAny(l.trk,l.id);if(l&&p&&AU.rg){auH().push();const hi=SD.Auto.hi(p),r=SD.Auto.selMove(l,AU.rg.t0,AU.rg.t1,(+b.dataset.dt||0)*(AUG()||24),(+b.dataset.dv||0)*hi,SD.Auto.len(play.au),hi,p.type==='seg');AU.rg={t0:r[0],t1:r[1]};auDone()}break}
  case 'ausc':{const l=auCur(),p=l&&auDefAny(l.trk,l.id);if(l&&p&&AU.rg){auH().push();SD.Auto.selScale(l,AU.rg.t0,AU.rg.t1,+b.dataset.f,SD.Auto.hi(p),p.type==='seg');auDone()}break}
  case 'auclip':{const l=auCur();if(l&&AU.rg){AU.clip=SD.Auto.selCopy(l,AU.rg.t0,AU.rg.t1);toast('複製しました');renderAu()}break}
  case 'aupaste':{const l=auCur();if(l&&AU.clip&&AU.rg){auH().push();SD.Auto.paste(l,AU.clip,AU.rg.t1,SD.Auto.len(play.au));auDone()}break}
  case 'aurgdel':{const l=auCur();if(l&&AU.rg){auH().push();SD.Auto.cut(l,AU.rg.t0,AU.rg.t1);auDone()}break}
  case 'aupick':auPick();break;
  case 'aupick1':{const id=b.dataset.id,tk=b.dataset.trk==='M'?'M':+b.dataset.trk,p=autoDef(tk,id);if(!p||p.auto===false){toast(p&&p.autoWhy?p.autoWhy:'このつまみは動かせません');break}
   auH().push();const l=SD.Auto.addLane(play.au,tk,id,autoDef);if(!l){toast('レーンは16本までです');break}AU.sel=play.au.lanes.indexOf(l);closeOv();savePlay();renderAu();break}
  case 'aurec':{const e=play.eng;e.rec=!e.rec;if(e.rec){e.poke();toast(play.running?'RECオン: つまみを動かした分だけ記録します':'RECオン: ▶を押して、つまみを動かしてください')}else e.flush();renderAu();break}
  case 'ausel':AU.sel=+b.dataset.i;renderAu();break;
  case 'auorph':AU.sel=+b.dataset.i;closeOv();renderAu();break;
  case 'scn':{if(SCN.lp){SCN.lp=0;break}const i=+b.dataset.v;MX.scn=i;if(play.sc[i])sceneApply(i);else toast('まだ保存されていません(長押しか「保存」で保存)');renderMix();break}
  case 'scnsave':{const i=MX.scn|0;play.snap(i);savePlay();toast('S'+(i+1)+' に保存しました');renderMix();break}
  case 'scnname':{const i=MX.scn|0,n=($('#scnname')||{}).value||'';if(!play.sc[i])play.snap(i,n||undefined);else play.sc[i].name=n.slice(0,12)||'S'+(i+1);savePlay();renderMix();break}
  case 'scat':case 'scs':case 'scg':case 'scdel':{const i=+b.dataset.i,G=SD.Auto.GLIDES.map(g=>g[0]);scnEdit(a=>{const e=a.scn[i];if(!e)return;if(b.dataset.act==='scat')e.at=SD.Auto.barMove(a,e.at,+b.dataset.d);else if(b.dataset.act==='scs')e.s=(e.s+1)%6;else if(b.dataset.act==='scg')e.g=G[(G.indexOf(e.g)+1)%G.length];else a.scn.splice(i,1)});break}
  case 'scadd':scnEdit(a=>{const l=(a.scn||[]).slice(-1)[0];a.scn=(a.scn||[]).concat([{at:SD.Auto.nextAt(a,l),s:l?(l.s+1)%6:0,g:'beat'}])});break;
  case 'mkat':case 'mkn':case 'mkdel':{const i=+b.dataset.i,N=SD.Auto.MARKS;scnEdit(a=>{const e=a.mk[i];if(!e)return;if(b.dataset.act==='mkat')e.at=SD.Auto.barMove(a,e.at,+b.dataset.d);else if(b.dataset.act==='mkn')e.name=N[(N.indexOf(e.name)+1)%N.length];else a.mk.splice(i,1)});break}
  case 'mkadd':scnEdit(a=>{const l=(a.mk||[]).slice(-1)[0],N=SD.Auto.MARKS;a.mk=(a.mk||[]).concat([{at:SD.Auto.nextAt(a,l),name:N[Math.min((a.mk||[]).length,N.length-1)]}])});break;
  case 'mkloop':scnEdit(a=>{const r=SD.Auto.markRange(a,+b.dataset.i);if(!r)return;if(a.lp&&a.lp[0]===r[0]&&a.lp[1]===r[1])delete a.lp;else a.lp=r});break;
  case 'mkloopoff':scnEdit(a=>{delete a.lp});break;
  case 'aubars':play.au.bars=+b.dataset.v;savePlay();renderAu();break;
  case 'aushape':AU.shape=b.dataset.v;renderAu();break;
  case 'aucyc':AU.perBar=+b.dataset.v;renderAu();break;
  case 'auapply':auApply();break;
  case 'aumute':{const l=auCur();if(l){l.mute=!l.mute;savePlay();renderAu();play.eng.poke()}break}
  case 'audel':{if(auCur()){auH().push();play.au.lanes.splice(AU.sel,1);savePlay();renderAu()}break}
  case 'auclr':if(play.au.lanes.length&&confirm('すべてのレーンを消しますか?')){auH().push();play.au.lanes=[];AU.sel=0;savePlay();renderAu()}break;
  case 'insT':MX.sel=+b.dataset.v;MX.ins.t=MX.sel;renderMix();break;
  case 'mon':{const m=SD.bus.mon||{};SD.bus.setMonitor({[b.dataset.v]:m[b.dataset.v]?0:1});break}
  case 'monoff':SD.bus.monOff();break;
  case 'anv':MX.an.v=b.dataset.v;renderMix();break;
  case 'anvs':MX.an.vs=+b.dataset.v;renderMix();break;
  case 'mxsec':MX.sec=b.dataset.v;renderMix();break;
  case 'mxpg':MX.pg=+b.dataset.v;renderMix();break;
  case 'mxclip':MX.clip=false;renderMix();break;
  case 'insG':MX.ins.g=b.dataset.v;renderMix();break;
  case 'insMv':{const k=+b.dataset.t;if(!play.tr[k])break;insOrd(k,SD.ordMove(SD.ordOf(play.tr[k].mix),+b.dataset.i,+b.dataset.d));renderMix();savePlay();break}
  case 'insAdd':{insAdd(+b.dataset.t,SD.slotBase(b.dataset.g));renderMix();savePlay();break}
  case 'insDel':{insDel(+b.dataset.t,b.dataset.g);renderMix();savePlay();break}
  case 'insRst':{const k=+b.dataset.t,x=play.tr[k];if(!x)break;delete x.mix.ord;x.mix.iOrd=0;SD.bus.setMix(k,'iOrd',0);Object.keys(x.mix).forEach(id=>{if(/_2$/.test(id)){delete x.mix[id];if(SD.bus.mix[k])delete SD.bus.mix[k][id]}});SD.bus.setMix(k,'iCpSc_2',0);renderMix();savePlay();break}
  case 'busSel':MX.bus=+b.dataset.v;renderMix();break;
  case 'busG':MX.bg=b.dataset.v;renderMix();break;
  case 'busSeg':{const bb=+b.dataset.b,id=b.dataset.id,v=+b.dataset.v;play.bm[bb][id]=v;SD.bus.setBusMix(bb,id,v);renderMix();savePlay();break}
  case 'insSeg':{const k=+b.dataset.t,id=b.dataset.id,v=+b.dataset.v;if(id==='iOrd'&&play.tr[k].mix.ord){/* 並べ替え済みなら、EQ と COMP の前後だけ入れ替えて他の並びは保つ */const o=SD.ordOf(play.tr[k].mix),ie=o.indexOf('eq'),ic=o.indexOf('cp');if((v==1)!==(ic<ie)){o[ie]='cp';o[ic]='eq'}insOrd(k,o);renderMix();savePlay();break}play.tr[k].mix[id]=v;SD.bus.setMix(k,id,v);renderMix();savePlay();break}
  case 'mixsrc':{const k=+b.dataset.t;play.tr[k].mix.dkSrc=+b.dataset.v;SD.bus.setMix(k,'dkSrc',+b.dataset.v);renderMix();savePlay();break}
  case 'mixm':{const x=play.tr[+b.dataset.t];x.mute=!x.mute;renderMix();savePlay();break}
  case 'mixs':{const x=play.tr[+b.dataset.t];x.solo=!x.solo;renderMix();savePlay();break}
  case 'fxsel':{if(FXSEL!==b.dataset.k)FXPG=0;FXSEL=b.dataset.k;fxFill();break}
  case 'fxpg':{FXPG++;fxFill();break}
   case 'fxlpg':{FXLP++;fxlShow();break}
   case 'fxmv':{const o=SD.fxOrdNorm(play.fxo),i=o.indexOf(FXSEL),d=+b.dataset.d;if(d!==0&&FXSEL==='rv'&&syn.p.rvbPos!=1){toast('REVERBを動かすには POSITION を CHAIN に');break}/* RP-1c */if(d!==0&&i<0){toast('この項目は並べ替えできません(DELAY は最後に固定)');break}play.fxo=SD.fxOrdSave(d===0?null:SD.fxOrdMove(o,i,d));SD.bus.setFxOrd(play.fxo);showFx();savePlay();break}
  case 'tmute':{const x=play.tr[+b.dataset.t];x.mute=!x.mute;updTrk();savePlay();break}
  case 'tsolo':{const x=play.tr[+b.dataset.t];x.solo=!x.solo;updTrk();savePlay();break}
  case 'tstep':{const k=+b.dataset.t,i=+b.dataset.i,x=play.tr[k];if(i>=x.len)break;const same=k===play.ts&&x.sel===i;if(k!==play.ts)trkSelect(k);if(same)x.steps[i].on=!x.steps[i].on;x.sel=i;updTrk();savePlay();break}
  case 'tname':{const x=play.tr[play.ts];askText('トラック名(8文字まで)',x.name,n=>{x.name=(n||x.name).slice(0,8);updTrk();savePlay()});break}
  case 'tkit':if(confirm('トラックをドラム例(キック・スネア・ハット・ベース・クラップ・オープンハット)に置き換えますか?')){trkKit();}break;
  case 'kits':openKits();break;
  case 'kitsave':{const i=+b.dataset.i,L=ST.get('kits',[]),x=L[i];askText('セット名',x?x.name:'セット'+(i+1),name=>{const l=ST.get('kits',[]);while(l.length<8)l.push(null);l[i]={name,bpm:play.bpm,swing:play.swing,t:play.ts,tr:play.getTracks(),au:SD.Auto.json(play.au)};ST.set('kits',l);openKits();toast('保存しました')});break}
  case 'kitload':{const x=ST.get('kits',[])[+b.dataset.i];if(!x)break;closeOv();play.stop();play.setTracks(x.tr,x.t);play.setBpm(x.bpm||120);play.setSwing(x.swing||0);play.au=SD.Auto.clean(x.au,autoDef);play.eng.flush();trkReset();trkSelect(play.ts,true);updBpm();savePlay();toast('呼び出しました: '+x.name);break}
  case 'kitdel':{const l=ST.get('kits',[]);l[+b.dataset.i]=null;ST.set('kits',l);openKits();break}
  case 'hmab':HM.t=b.dataset.k;harmPaint();break;
  case 'hmpre':{const u=syn.user,t=HM.t,v=b.dataset.v,K=i=>i+1;
   if(v==='ab'){u.b=u.a.slice()}
   else u[t]=Array.from({length:32},(_,i)=>{const k=K(i);return v==='saw'?1/k:v==='sq'?(k%2?1/k:0):v==='tri'?(k%2?1/(k*k):0):v==='sine'?(k===1?1:0):(Math.random()*(1/Math.sqrt(k)))});
   if(v==='rand'){const m=Math.max.apply(null,u[t]);u[t]=u[t].map(x=>x/m)}
   harmEdit();saveFree();break}
  case 'jack':jackTap(b.dataset.p,b.classList.contains('out')?'o':'i');break;
  case 'selcab':{const k=b.dataset.a+'|'+b.dataset.b;RK.selc=RK.selc===k?null:k;RK.pend=null;markJacks();break}
  case 'delcab':if(RK.selc){const q=RK.selc.split('|');syn.disconnect(q[0],q[1]);RK.selc=null;renderRack();saveFree();checkGoals();toast('ケーブルを外しました')}break;
  case 'addmod':openAddMod();break;
  case 'pickmod':{const r=syn.addMod(b.dataset.t);if(!r.ok){toast(r.msg);break}closeOv();if(S.tab!=='rack')showTab('rack');else renderRack();RK.el.scrollLeft=RK.el.scrollWidth;saveFree();checkGoals();toast(SD.modLib.title(r.id)+' を追加しました');break}
  case 'modmenu':ov(`<div class="sh"><b>ラック</b><button data-act="close">✕</button></div><div class="sb"><div class="pact"><button data-act="modsample">サンプルパッチに戻す</button><button data-act="modblank">白紙から始める</button></div><div class="sub">ジャックは「出力→入力」の順にタップ。ケーブル中央の丸をタップで選択→「ケーブル削除」。カード上部の長押しでモジュール削除。</div></div>`,'sm');break;
  case 'modsample':case 'modblank':{if(S.lesson)exitLesson(true);closeOv();applyMod(a==='modsample'?SD.modLib.samplePatch():SD.modLib.blankPatch());saveFree();toast(a==='modsample'?'サンプルパッチに戻しました':'白紙にしました');break}
  case 'mode':setMode(b.dataset.m);break;
  case 'run':runToggle();break;
  case 'bpmd':case 'bpmu':play.setBpm(play.bpm+(a==='bpmu'?1:-1));updBpm();savePlay();break;
  case 'tap':play.tap(Date.now());updBpm();savePlay();break;
  case 'amode':play.a.mode=b.dataset.v;renderArp();savePlay();break;
  case 'arate':play.a.rate=+b.dataset.v;renderArp();savePlay();break;
  case 'aoct':play.a.oct=+b.dataset.v;renderArp();savePlay();break;
  case 'slen':play.setLen(play.cs().len+ +b.dataset.d);updSeq();savePlay();break;
  case 'ssel':{const i=+b.dataset.i,st=play.cs().steps[i];if(i>=play.cs().len)break;if(play.cs().sel===i)st.on=!st.on;play.cs().sel=i;updSeq();savePlay();break}
  case 'sf':{const st=play.cs().steps[play.cs().sel],k=b.dataset.k;st[k]=!st[k];if(k!=='on'&&st[k])st.on=true;updSeq();savePlay();break}
  case 'snudge':{const st=play.cs().steps[play.cs().sel],n=play.nudge(+b.dataset.d);st.on=true;updSeq();savePlay();syn.init();syn.noteOn(n);setTimeout(()=>syn.noteOff(n),260);break}
  case 'sclr':if(confirm('このパターンの音符をすべて消しますか?')){play.clearPattern();updSeq();savePlay()}break;
  case 'pickmeter':{const M=SD.METER,cur=play.getMeter();ov(`<div class="sh"><b>拍子</b><button data-act="close">✕</button></div><div class="sb"><div class="ptabs g" style="flex-wrap:wrap">${M.PRESETS.map(p=>`<button style="flex:0 0 calc(25% - 3px)" class="${p.n===cur.n&&p.d===cur.d?'on':''}" data-act="setmeter" data-n="${p.n}" data-d="${p.d}">${p.n}/${p.d}</button>`).join('')}</div><div class="prow"><span class="lb2">自分で</span><input id="mtn" type="number" min="1" max="32" value="${cur.n}" style="width:54px"> / <select id="mtd"><option>4</option><option>8</option><option>16</option></select><button class="pb pri" data-act="metcust">決定</button></div><div class="sub">BPM は四分音符のまま。1小節は最大32ステップ(1/16が単位)まで。強拍の位置は拍子から自動で決まります。</div></div>`);const d=$('#mtd');if(d)d.value=String(cur.d);break}
  case 'setmeter':meterAsk({n:+b.dataset.n,d:+b.dataset.d,g:null});break;
  case 'metcust':meterAsk({n:+$('#mtn').value|0,d:+$('#mtd').value|0,g:null});break;
  case 'metro':play.metro=!play.metro;mtBtn();break;
  case 'pickscale':ov(`<div class="sh"><b>スケール</b><button data-act="close">✕</button></div><div class="sb"><div class="ptabs g" style="flex-wrap:wrap">${SD.SCALE_NAMES.map(([v,n])=>`<button style="flex:0 0 calc(33% - 3px)" class="${v===play.cs().scale?'on':''}" data-act="setscale" data-v="${v}">${n}</button>`).join('')}</div><div class="sub">スケール外の音は、いちばん近いスケール内の音に自動で寄せます。</div></div>`,'sm');break;
  case 'schord':S.chInv=null;chordSheet();break;
  case 'chsel':{const s=play.cs(),st=s.steps[s.sel],inv=S.chInv==null?(st.cd?st.cd.i:0):S.chInv;play.setChord(b.dataset.v,inv);S.chInv=inv;chordSheet();updSeq();updTrk();savePlay();chordHear();break}
  case 'chinv':{const s=play.cs(),st=s.steps[s.sel];S.chInv=+b.dataset.v;if(st.cd)play.setChord(st.cd.t,S.chInv);chordSheet();updSeq();updTrk();savePlay();chordHear();break}
  case 'chclr':play.clearChord();S.chInv=null;closeOv();updSeq();updTrk();savePlay();break;
  case 'setscale':play.setScale(b.dataset.v,play.cs().key);closeOv();updSeq();savePlay();break;
  case 'pickkey':ov(`<div class="sh"><b>キー(主音)</b><button data-act="close">✕</button></div><div class="sb"><div class="ptabs g" style="flex-wrap:wrap">${SD.KEYS.map((n,i)=>`<button style="flex:0 0 calc(25% - 3px)" class="${i===play.cs().key?'on':''}" data-act="setkey" data-v="${i}">${n}</button>`).join('')}</div></div>`,'sm');break;
  case 'setkey':play.setScale(play.cs().scale,+b.dataset.v);closeOv();updSeq();savePlay();break;
  case 'pats':openPats();break;
  case 'patsave':{const i=+b.dataset.i,L=ST.get('pats',[]),x=L[i];askText('パターン名',x?x.name:'ベース'+(i+1),name=>{const l=ST.get('pats',[]);while(l.length<8)l.push(null);l[i]={name,synth:S.synth,patch:getPatch(),oct:S.oct,bpm:play.bpm,pat:play.pattern()};ST.set('pats',l);openPats();toast('保存しました');checkGoals()});break}
  case 'patload':loadPat(+b.dataset.i);break;
  case 'patdel':{if(!confirm('このパターンを削除しますか?'))break;const l=ST.get('pats',[]);l[+b.dataset.i]=null;ST.set('pats',l);openPats();checkGoals();break}
  case 'synth':openSynth();break;
  case 'usesynth':closeOv();switchSynth(b.dataset.id);break;
  case 'hold':setHold(!S.hold);break;
  case 'fine':setFine(!CFG.fine);break;
  case 'cfg':openCfg();break;
  case 'fz':setFz(+b.dataset.v);openCfg();break;
  case 'kbc':CFG.kb=b.dataset.v;ST.set('cfg',CFG);applyKb();openCfg();break;
  case 'kbs':CFG.kb=kbSmall()?'n':'s';ST.set('cfg',CFG);applyKb();break;
  case 'schedc':CFG.sched=b.dataset.v;CFG.schedSet=1;ST.set('cfg',CFG);if(CFG.sched!=='curve'&&SD.sched)SD.sched.releaseAll();openCfg();break;
  case 'velc':CFG.vel=b.dataset.v==='true';ST.set('cfg',CFG);openCfg();break;
  case 'midiscan':SD.Midi.start().then(()=>{openCfg()});break;
  case 'midi':if(!SD.Midi.supported())toast('この環境はMIDI入力に対応していません');else if(SD.Midi.names.length)toast('MIDI接続: '+SD.Midi.names.join(', '));else SD.Midi.start().then(()=>toast(SD.Midi.names.length?'MIDI接続: '+SD.Midi.names.join(', '):midiText()));break;
  case 'finec':setFine(b.dataset.v==='true');openCfg();break;
  case 'mmlearn':mmLearn(!MM.learn);break;
  case 'mmch':CFG.mch=b.dataset.v;ST.set('cfg',CFG);openCfg();break;
  case 'mmpick':mmMap().pick=b.dataset.v==='pickup'?'pickup':'jump';mmSave();openCfg();break;
  case 'mmdel':MM.map=SD.MidiMap.unbind(mmMap(),+b.dataset.i);mmSave();openCfg();break;
  case 'mmclr':if(confirm('割り当てをすべて消しますか?')){const pk=mmMap().pick;MM.map=SD.MidiMap.empty();MM.map.pick=pk;mmSave();openCfg()}break;
  case 'data':openData();break;
  case 'mat':openMat();break;
  case 'matusewt':matUseWT();break;
  case 'matusesmp':matUseSmp();break;
  case 'matsel':matShow(b.dataset.id);break;
  case 'matimp':$('#mvf').click();break;
  case 'matdel':matDel(b.dataset.id);break;
  case 'matuse':matUse();break;
  case 'matren':{const id=b.dataset.id,m=SD.UMAT.find(id);if(m)askText('素材の名前(12文字まで)',m.name,n=>{SD.UMAT.rename(id,n).then(ok=>{if(ok){closeOv();openMat()}else toast('名前を変更できませんでした')})});break}
  case 'matplay':matPlay();break;
  case 'dsave':saveFile();break;
  case 'dcopy':copyData();break;
  case 'dfile':$('#df').click();break;
  case 'dpaste':importJSON($('#dj').value);break;
  case 'presets':openPresets('mine');break;
  case 'close':closeOv();break;
  case 'lvf':S.lvf=+b.dataset.k;openTOC();break;
  case 'gloss':openGlossary();break;
  case 'term':openGlossary(b.dataset.id);break;
  case 'tdef':{const q=$('#gq');$('#gl').innerHTML=glRows(q?q.value:'',b.dataset.id);break}
  case 'qans':{const L=S.lesson;if(!L)break;const q=L.steps[S.step].quiz,i=+b.dataset.i,ok=i+1===q.ans;S.qa={step:S.step,i,ok};toast(ok?'正解!':'ちがうかも。もう一度聴き比べてみよう');renderCoach();break}
  case 'rsave':{const L=S.lesson;if(!L||!L.save)break;const nm=L.save.name;
   if(L.save.kind==='kit'){play.tr.forEach(x=>{x.mute=false});updTrk();const l=ST.get('kits',[]);while(l.length<8)l.push(null);let i=l.findIndex(x=>!x);const full=i<0;if(full)i=7;
    l[i]={name:nm,bpm:play.bpm,swing:play.swing,t:play.ts,tr:play.getTracks(),au:SD.Auto.json(play.au)};ST.set('kits',l);toast(full?'セットが満杯のため8番を上書きしました':'セットに保存しました: '+nm)}
   else{const l=ST.get('presets',[]);l.unshift({id:'u_'+Date.now(),name:nm,synth:S.synth,patch:getPatch(),oct:S.oct,fav:false});ST.set('presets',l);toast('音色に保存しました: '+nm)}break}
  case 'octd':setOct(S.oct-1);break;
  case 'octu':setOct(S.oct+1);break;
  case 'tab':showTab(b.dataset.id);markTabs();break;
  case 'ls':startLesson(b.dataset.id,+b.dataset.from);break;
  case 'freeplay':exitLesson(true);closeOv();break;
  case 'prev':gotoStep(S.fin?S.lesson.steps.length-1:S.step-1);break;
  case 'next':nextStep();break;
  case 'play':playDemo();break;
  case 'cmp':cmpGo(+b.dataset.i);break;
  case 'ab':toggleAB();break;
  case 'dot':gotoStep(+b.dataset.i);break;
  case 'coachx':exitLesson();break;
  case 'coachhide':S.coachHidden=true;renderCoach();break;
  case 'coachshow':S.coachHidden=false;renderCoach();break;
  case 'nok':{const p=S.ask;if(!p)break;const v=SD.parse(p,$('#ni').value,syn.p[p.id]);if(isNaN(v)){toast('数字を入力してください');break}setP(p.id,v,true);closeOv();break}
  case 'ndef':{const p=S.ask;if(!p)break;setP(p.id,p.def,true);closeOv();break}
  case 'tok':{const cb=S.askCb,v=$('#ti').value.trim();if(!cb)break;if(!v){toast('名前を入力してください');break}cb(v);break}
  case 'ptab':openPresets(b.dataset.t);break;
  case 'psave':askText('音色の名前',`音色${ST.get('presets',[]).length+1}`,name=>{const l=ST.get('presets',[]);l.unshift({id:'u_'+Date.now(),name,synth:S.synth,patch:getPatch(),oct:S.oct,fav:false});ST.set('presets',l);openPresets('mine');toast('保存しました')});break;
  case 'pinit':if(S.lesson)exitLesson(true);applyPatch({});ST.set(freeKey(S.synth),getPatch());closeOv();toast('初期音に戻しました');break;
  case 'pload':{const x=findPreset(b.dataset.id);if(x)loadPreset(x);break}
  case 'pfav':{const id=b.dataset.id;if(id.indexOf('f_')===0){let f=ST.get('favs',[]);f=f.includes(id)?f.filter(x=>x!==id):f.concat(id);ST.set('favs',f)}
   else{const l=ST.get('presets',[]),x=l.find(y=>y.id===id);if(x){x.fav=!x.fav;ST.set('presets',l)}}openPresets(S.ptab);break}
  case 'pdel':{if(!confirm('この音色を削除しますか?'))break;ST.set('presets',ST.get('presets',[]).filter(x=>x.id!==b.dataset.id));openPresets(S.ptab);break}
 }
}

/* ---------- 演奏モード(KEY/ARP/SEQ) ---------- */
let pt;function savePlay(){checkGoals();if(S.lesson)return;clearTimeout(pt);pt=setTimeout(()=>ST.set('play',play.getState()),400)}
function updBpm(){$('#bpml').textContent=play.bpm}
function updRun(){const b=$('#runb');b.textContent=play.running?'■':'▶';b.classList.toggle('on',play.running)}
function setMode(m,silent){
 if(m===S.mode)return;
 relAll();play.setMode(m);S.mode=m;play.setHold(S.hold);
 document.querySelectorAll('.mseg button').forEach(b=>b.classList.toggle('on',b.dataset.m===m));
 buildTabs();showTab(m==='key'?D().T[0].id:m);markTabs();updRun();
 if(m==='trk')trkSelect(play.ts,true);
 if(!silent)toast(m==='key'?'KEY: 鍵盤で直接演奏':m==='arp'?'ARP: 和音を押さえると自動で順に鳴ります':m==='trk'?'TRK: トラックごとに音色とパターンを持ち、同時に鳴らします':'SEQ: ▶で再生。ステップを選び、鍵盤で音程を入力');
}
function runToggle(){
 if(S.mode!=='seq'&&S.mode!=='trk'){toast('▶はSEQ・TRKモードで使います(ARPは鍵盤を押すと自動で鳴ります)');return}
 if(play.running)play.stop();else{syn.init();if(S.mode==='trk')play.tr.forEach((x,k)=>teng(k).init());play.start()}
 updRun();
}
/* ステップの表示名: 和音は『Cm』など、単音は音名。TRKの狭いマスでは和音だけ省略形 */
function stepLbl(st,wide){return st.ch&&st.cd?SD.chordName(st.n,st.cd.t,st.cd.i):st.ch?SD.noteName(st.n)+'+':SD.noteName(st.n)}
function chordSheet(){
 const s=play.cs(),st=s.steps[s.sel],cd=st.cd||{t:null,i:0},inv=S.chInv==null?cd.i:S.chInv;
 ov(`<div class="sh"><b>和音(STEP ${s.sel+1} / 根音 ${SD.noteName(st.n)})</b><button data-act="close">✕</button></div><div class="sb"><div class="ptabs g" style="flex-wrap:wrap">${SD.CHORDS.map(c=>`<button style="flex:0 0 calc(25% - 3px)" class="${c.id===cd.t?'on':''}" data-act="chsel" data-v="${c.id}">${SD.KEYS[st.n%12]}${c.sym}<small style="display:block;font-size:9px">${c.name}</small></button>`).join('')}</div><div class="prow"><span class="lb2">転回</span>${[0,1,2].map(i=>`<button class="pb ${i===inv?'on':''}" data-act="chinv" data-v="${i}">${i?i+'転':'基本'}</button>`).join('')}<button class="pb" data-act="chclr">単音に戻す</button></div><div class="sub">1ステップに最大4音。選んだ和音は、鍵盤で音程を入れ直したり♪▲▼で動かすと、和音ごと移ります。</div></div>`,'sm');
}
function chordHear(){const s=play.cs(),st=s.steps[s.sel];if(!st.ch)return;syn.init();const ms=st.ch.slice();ms.forEach(m=>syn.noteOn(m,.7));setTimeout(()=>ms.forEach(m=>syn.noteOff(m)),420)}
function seqKey(m){const n=play.enterNote(m),s=play.cs();s.sel=(s.sel+1)%s.len;updSeq();savePlay();return n}
const trkKey=seqKey;
function showPlayTab(id){
 S.tab=id;const g=$('#grid');g.style.setProperty('--c',1);g.style.setProperty('--r',1);
 while(g.firstChild)g.removeChild(g.firstChild);
 const pp=E('div','pp');g.appendChild(pp);PP.el=pp;PP.sps=null;
 if(id==='arp')renderArp();else if(id==='trk')renderTrk();else renderSeq();
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.id===id));
}

/* ---------- AUTOタブ(v3.6 描画エディタ) ---------- */
const AUSH=[['ramp_up','上昇'],['ramp_down','下降'],['exp_up','指数↑'],['log_up','対数↑'],['scurve','S字'],['tri','三角'],['sine','サイン'],['saw_up','のこぎり↑'],['saw_down','のこぎり↓'],['square','矩形'],['stairs','階段'],['random_sh','ランダム'],['spike','スパイク'],['cliff','崖']];
const AUTOOL=[['pen','PEN'],['line','LINE'],['shape','SHAPE'],['point','POINT'],['erase','ERASE'],['sel','SEL']];
Object.assign(AU,{tool:'pen',grid:24,pt:-1,rg:null,clip:null,drag:null,tap:null,h:null});
function scnEdit(fn){auH().push();const a=play.au;fn(a);const L=SD.Auto.len(a),c=SD.Auto.clean(a,autoDef);['scn','mk','lp'].forEach(k=>{if(c[k])a[k]=c[k];else delete a[k]});savePlay();play.eng.poke();renderAu()}
function scnPanel(au){const G=SD.Auto.GLIDES,B=SD.Auto.bar(au),len=SD.Auto.len(au),sc=au.scn||[],mk=au.mk||[],bar=t=>Math.floor(t/B)+1;
 const r1=(e,i)=>`<div class="prow scr"><span class="lb2">${bar(e.at)}小節</span><button class="pb" data-act="scat" data-i="${i}" data-d="-1">◀</button><button class="pb" data-act="scat" data-i="${i}" data-d="1">▶</button><button class="pb" data-act="scs" data-i="${i}">S${e.s+1} ${esc((play.sc[e.s]||{name:'—'}).name)}</button><button class="pb" data-act="scg" data-i="${i}">${(G.find(g=>g[0]===e.g)||G[0])[1]}</button><button class="pb" data-act="scdel" data-i="${i}" aria-label="削除">✕</button></div>`;
 const r2=(e,i)=>`<div class="prow scr"><span class="lb2">${bar(e.at)}小節</span><button class="pb" data-act="mkat" data-i="${i}" data-d="-1">◀</button><button class="pb" data-act="mkat" data-i="${i}" data-d="1">▶</button><button class="pb" data-act="mkn" data-i="${i}">${esc(e.name)}</button><button class="pb ${au.lp&&au.lp[0]===e.at&&au.lp[1]===SD.Auto.markRange(au,i)[1]?'on':''}" data-act="mkloop" data-i="${i}">ループ</button><button class="pb" data-act="mkdel" data-i="${i}" aria-label="削除">✕</button></div>`;
 return `<div class="sub">シーンレーン</div>${sc.map(r1).join('')}<div class="prow"><button class="pb" data-act="scadd">＋ シーンを置く</button><span class="hint">シーンは MIX の SCENE で保存</span></div><div class="sub">マーカー${au.lp?` (ループ ${bar(au.lp[0])}〜${bar(au.lp[1]-1)}小節)`:''}</div>${mk.map(r2).join('')}<div class="prow"><button class="pb" data-act="mkadd">＋ マーカー</button>${au.lp?'<button class="pb" data-act="mkloopoff">ループ解除</button>':''}</div>`}
function scnStrip(au){const len=SD.Auto.len(au);return `<div class="aumk">${(au.mk||[]).map(m=>`<span style="left:${m.at/len*100}%">${esc(m.name)}</span>`).join('')}${(au.scn||[]).map(e=>`<span class="sf" style="left:${e.at/len*100}%">S${e.s+1}</span>`).join('')}</div>`}
const auH=()=>AU.h||(AU.h=new SD.Auto.Hist(()=>play.au,v=>{play.au=v;AU.pt=-1;AU.rg=null}));
const auDefAny=(t,id)=>SD.Auto.defFor(autoDef,t,id);/* MA-3: 編集・表示用(孤児レーンでもつまみ定義を引く)。再生・REC・MIDI は従来の autoDef(孤児は null) */
const auOrph=l=>!!l&&SD.Auto.isOrphan(l,autoDef);
const auLabel=l=>{const t=(l.trk==='M'?'M':'T'+(l.trk+1))+' ';if(auOrph(l))return t+SD.modLib.label(l.id)+'(対象なし)';const p=autoDef(l.trk,l.id);return t+(p&&p.ins&&SD.AUINS.indexOf(p.id)>=0?(p.ins==='cp'?'COMP ':'EQ ')+p.label:p?p.label:l.id)};/* v8.4: インサートは「T2 COMP THRESH」のように出す。MA-3: モジュラーは「T1 VCF1 CUTOFF」・孤児は末尾に(対象なし) */
/* v8.4: インサート(EQ・COMP)のレーンで、そのインサートがOFFのとき(値は保存されるが音には出ない)のヒント */
const auInsHint=l=>{const p=l&&typeof l.trk==='number'&&autoDef(l.trk,l.id);if(!p||!p.ins||SD.AUINS.indexOf(p.id)<0)return'';const x=play.tr[l.trk];if(!x)return'';const on=p.ins==='cp'?'iCpOn':'iEqOn';return x.mix[on]==1?'':`<div class="prow"><span class="hint">T${l.trk+1} の ${p.ins==='cp'?'COMP':'EQ'} が OFF のあいだは、このレーンは音に効きません(MIXタブで ON にします)。</span></div>`};
const auCur=()=>play.au.lanes[AU.sel]||null;
const auDone=()=>{savePlay();renderAu();play.eng.poke()};
function showAu(){
 S.tab='au';const g=$('#grid');g.style.setProperty('--c',1);g.style.setProperty('--r',1);
 while(g.firstChild)g.removeChild(g.firstChild);
 const pp=E('div','pp aup');g.appendChild(pp);AU.el=pp;renderAu();
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.id==='au'));
 cancelAnimationFrame(AU.raf);const loop=()=>{if(S.tab!=='au'||!AU.el||!AU.el.isConnected)return;auDraw();AU.raf=requestAnimationFrame(loop)};loop();
}
function renderAu(){
 const au=play.au;if(AU.sel>=au.lanes.length)AU.sel=Math.max(0,au.lanes.length-1);
 const l=auCur(),p=l&&auDefAny(l.trk,l.id);if(AU.pt>=(l?l.pts.length:0))AU.pt=-1;
 const seg=(act,cur,list)=>list.map(([v,n])=>`<button class="pb ${String(v)===String(cur)?'on':''}" data-act="${act}" data-v="${v}">${n}</button>`).join('');
 const chips=au.lanes.map((x,i)=>`<button class="pb ${i===AU.sel?'on':''}" data-act="ausel" data-i="${i}" ${play.eng.rb[x.trk+':'+x.id]?'style="background:#d33;color:#fff"':auOrph(x)?'style="opacity:.45"':''}>${esc(auLabel(x))}${x.mute?' (M)':''}</button>`).join('');
 let tp='';
 if(AU.tool==='shape')tp=`<div class="prow"><span class="lb2">形</span>${seg('aushape',AU.shape,AUSH)}</div><div class="prow"><span class="lb2">回数/小節</span>${seg('aucyc',AU.perBar,[[1,'1'],[2,'2'],[4,'4'],[8,'8']])}</div>
 <div class="prow"><span class="lb2">LOW</span><input type="range" id="aulo" min="0" max="100" value="${Math.round(AU.lo*100)}"><span class="pv" id="aulov"></span></div>
 <div class="prow"><span class="lb2">HIGH</span><input type="range" id="auhi" min="0" max="100" value="${Math.round(AU.hi*100)}"><span class="pv" id="auhiv"></span></div>
 <div class="prow"><span class="hint">グラフをドラッグした範囲に敷きます</span><button class="pb pri" data-act="auapply">全体に敷く</button></div>`;
 else if(AU.tool==='point'){const q=l&&l.pts[AU.pt];
  tp=q?`<div class="prow"><span class="lb2">つなぎ方</span>${seg('aupsh',q[2]||'L',p&&p.type==='seg'?[['S','階段']]:[['L','直線'],['E','指数'],['G','対数'],['C','なめらか'],['S','階段']])}</div>
  ${(q[2]||'L')==='L'&&!(p&&p.type==='seg')?`<div class="prow"><span class="lb2">曲がり</span><button class="pb" data-act="aupcu" data-d="-.2">−</button><b>${Math.round((q[3]||0)*100)}</b><button class="pb" data-act="aupcu" data-d=".2">＋</button></div>`:''}
  <div class="prow"><button class="pb" data-act="aupdel">この点を削除</button></div>`:`<div class="prow"><span class="hint">タップで点を追加・ドラッグで移動・点をダブルタップで削除</span></div>`}
 else if(AU.tool==='sel')tp=AU.rg?`<div class="prow"><button class="pb" data-act="aumv" data-dt="-1">◀</button><button class="pb" data-act="aumv" data-dt="1">▶</button><button class="pb" data-act="aumv" data-dv=".05">▲</button><button class="pb" data-act="aumv" data-dv="-.05">▼</button>
  <button class="pb" data-act="ausc" data-f="1.25">拡</button><button class="pb" data-act="ausc" data-f=".8">縮</button></div><div class="prow"><button class="pb" data-act="auclip">複製</button><button class="pb" data-act="aupaste" ${AU.clip?'':'disabled'}>貼り付け</button><button class="pb" data-act="aurgdel">範囲を消す</button></div>`:`<div class="prow"><span class="hint">範囲をドラッグして選択</span></div>`;
 else tp=`<div class="prow"><span class="hint">${AU.tool==='pen'?'なぞって描く(グリッドにそろえて自動で間引き)':AU.tool==='line'?'始点から終点までドラッグして直線':'消したい範囲をドラッグ'}</span></div>`;
 AU.el.innerHTML=`<div class="auc"><canvas id="aucv"></canvas>${scnStrip(au)}</div><div class="aux">
 <div class="prow"><button class="pb pri" data-act="aupick">${l?esc(auLabel(l)):'対象を選ぶ'}</button>${seg('aubars',au.bars,SD.Auto.BARS.map(b=>[b,b+'小節']))}</div>
 ${chips?`<div class="prow">${chips}</div>`:''}
 ${auInsHint(l)}
 ${auOrph(l)?'<div class="prow"><span class="hint">このモジュールはいまのラックにありません(対象なし)。点は残っていて編集できますが、再生では無視されます。同じIDのモジュールを足すと、このレーンが復活します。</span></div>':''}
 ${scnPanel(au)}
 <div class="prow">${seg('autool',AU.tool,AUTOOL)}</div>
 <div class="prow"><span class="lb2">GRID</span>${seg('augrid',AU.grid,SD.Auto.GRIDS.map(g=>[g[1],g[0]]))}</div>
 ${tp}
 <div class="prow"><button class="pb ${play.eng.rec?'on':''}" data-act="aurec" style="${play.eng.rec?'background:#d33;color:#fff':''}">● REC</button><button class="pb" data-act="auundo">UNDO</button><button class="pb" data-act="auredo">REDO</button><button class="pb" data-act="auseam">継ぎ目をそろえる</button><button class="pb" data-act="aumute">${l&&l.mute?'ミュート解除':'ミュート'}</button><button class="pb" data-act="audel">レーン削除</button><button class="pb" data-act="auclr">全消去</button></div></div>`;
 const upd=()=>{const f=v=>p?SD.fmt(p,SD.Auto.toValue(p,v*SD.Auto.hi(p))):Math.round(v*100)+'%',a=$('#aulov'),b=$('#auhiv');if(a){a.textContent=f(AU.lo);b.textContent=f(AU.hi)}};
 const lo=$('#aulo');if(lo){lo.addEventListener('input',e=>{AU.lo=e.target.value/100;upd()});$('#auhi').addEventListener('input',e=>{AU.hi=e.target.value/100;upd()});upd()}
 auBind($('#aucv'));
}
function auBind(c){
 const A=SD.Auto,pos=e=>{const r=c.getBoundingClientRect(),len=A.len(play.au);return{t:Math.max(0,Math.min(len,Math.round((e.clientX-r.left)/r.width*len))),y:Math.max(0,Math.min(1,1-((e.clientY-r.top)-4)/(r.height-8)))}};
 const sn=t=>A.snap(t,AUG());
 c.addEventListener('pointerdown',e=>{
  const l=auCur();if(!l){toast('先に「対象を選ぶ」でつまみを選んでください');return}
  const p=auDefAny(l.trk,l.id);if(!p||p.auto===false){toast('このつまみは動かせません');return}
  try{c.setPointerCapture(e.pointerId)}catch(_){}
  const q=pos(e),r=c.getBoundingClientRect(),len=A.len(play.au),hi=A.hi(p),seg=p.type==='seg';
  const d=AU.drag={id:e.pointerId,a:q,b:q,raw:[[q.t,q.y]],l,p,hi,seg,len,idx:-1,pushed:false};
  if(AU.tool==='point'){
   const i=A.hit(l,q.t,q.y,18/r.width*len,18/(r.height-8),hi);
   if(i>=0){const now=Date.now();
    if(AU.tap&&AU.tap.i===i&&now-AU.tap.t<320){auH().push();A.remove(l,i);AU.pt=-1;AU.tap=null;AU.drag=null;auDone();return}
    AU.tap={i,t:now};AU.pt=i;d.idx=i}
   else{auH().push();d.pushed=true;const v=seg?Math.round(q.y*hi):q.y*hi;d.idx=A.insert(l,sn(q.t),v,seg?'S':'L');AU.pt=d.idx;AU.tap=null}}
  e.preventDefault()});
 c.addEventListener('pointermove',e=>{const d=AU.drag;if(!d||e.pointerId!==d.id)return;const q=pos(e);d.b=q;d.raw.push([q.t,q.y]);
  if(AU.tool==='point'&&d.idx>=0){if(!d.pushed){auH().push();d.pushed=true}
   const v=d.seg?Math.round(q.y*d.hi):q.y*d.hi;A.move(d.l,d.idx,sn(q.t),v)}});
 const up=e=>{const d=AU.drag;if(!d||e.pointerId!==d.id)return;AU.drag=null;const l=d.l,t0=sn(Math.min(d.a.t,d.b.t)),t1=sn(Math.max(d.a.t,d.b.t));
  switch(AU.tool){
   case 'pen':auH().push();A.pen(l,d.raw,AUG(),.01,d.hi,d.seg,d.len);break;
   case 'line':auH().push();A.line(l,sn(d.a.t),d.a.y,sn(d.b.t),d.b.y,d.hi,d.seg);break;
   case 'erase':if(t1>t0){auH().push();A.cut(l,t0,t1)}break;
   case 'sel':AU.rg=t1>t0?{t0,t1}:null;break;
   case 'shape':{if(t1-t0<24){toast('範囲を広くドラッグしてください');break}
    let lo=AU.lo,hi=AU.hi;if(lo>hi){const x=lo;lo=hi;hi=x}
    let pts=A.shape(AU.shape,{t0,t1,n:Math.max(1,Math.round(AU.perBar*(t1-t0)/A.bar(play.au))),depth:hi-lo,center:(hi+lo)/2,seed:AU.seed++});
    if(d.seg)pts=pts.map(x=>[x[0],Math.round(x[1]*d.hi),'S']);else pts=pts.map(x=>[x[0],x[1]*d.hi,x[2]]);
    auH().push();l.pts=l.pts.filter(x=>x[0]<t0||x[0]>t1).concat(pts);l.pts.sort((a,b)=>a[0]-b[0]);break}}
  auDone()};
 c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
}
function auDraw(){
 const c=$('#aucv');if(!c)return;const A=SD.Auto,dpr=window.devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;
 if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
 const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
 const au=play.au,len=A.len(au),css=getComputedStyle(document.documentElement),ln=css.getPropertyValue('--ln')||'#444',ac=css.getPropertyValue('--ac')||'#fc0',dim=css.getPropertyValue('--dim')||'#888';
 const X=t=>t/len*w,Y=(v,hi)=>h-4-(h-8)*v/hi;
 if(AUG()&&X(AUG())>=6){x.strokeStyle=ln;x.globalAlpha=.25;for(let t=0;t<=len;t+=AUG()){x.beginPath();x.moveTo(X(t),0);x.lineTo(X(t),h);x.stroke()}}
 {const bt=A.bar(au);/* 拍の線(薄い)→小節線(濃い)。小節線は拍の線の上に重なるとは限らない(7/8・3/8など) */
 for(let t=0;t<=len;t+=A.TPB){if(t%bt===0)continue;x.strokeStyle=ln;x.globalAlpha=.5;x.beginPath();x.moveTo(X(t),0);x.lineTo(X(t),h);x.stroke()}
 for(let t=0;t<=len;t+=bt){x.strokeStyle=ln;x.globalAlpha=1;x.beginPath();x.moveTo(X(t),0);x.lineTo(X(t),h);x.stroke()}x.globalAlpha=1}
 const l=auCur();
 const path=(m,col,wd,al)=>{const q=auDefAny(m.trk,m.id),hi=q?A.hi(q):1;if(!m.pts.length)return;x.globalAlpha=al;x.strokeStyle=col;x.lineWidth=wd;x.beginPath();
  for(let i=0;i<=300;i++){const t=len*i/300,y=Y(A.eval(m,t),hi);i?x.lineTo(X(t),y):x.moveTo(0,y)}x.stroke();x.globalAlpha=1};
 au.lanes.forEach((m,i)=>{if(m!==l)path(m,dim,1,.35)});
 if(!l||!l.pts.length){x.fillStyle=dim;x.font='12px sans-serif';x.fillText(l?'ドラッグして描く':'「対象を選ぶ」からつまみを選ぶ',10,20)}
 const p=l&&auDefAny(l.trk,l.id),hi=p?A.hi(p):1;
 if(l){path(l,l.mute?dim:ac,2,1);
  l.pts.forEach((q,i)=>{x.fillStyle=i===AU.pt?'#fff':ac;x.beginPath();x.arc(X(q[0]),Y(q[1],hi),i===AU.pt?5:3,0,7);x.fill()})}
 if(S.lesson&&S.auRes&&l&&p)S.auRes.forEach(r=>{if(r.g.id!==l.id||(r.g.trk==null?0:r.g.trk)!==l.trk)return;r.items.forEach(it=>auGoalDraw(x,it,p,hi,X,Y,h))});
 if(AU.rg){x.fillStyle=ac;x.globalAlpha=.18;x.fillRect(X(AU.rg.t0),0,X(AU.rg.t1)-X(AU.rg.t0),h);x.globalAlpha=1}
 const d=AU.drag;
 if(d){x.fillStyle=ac;x.strokeStyle='#fff';x.lineWidth=1.5;
  if(AU.tool==='pen'){x.beginPath();d.raw.forEach((q,i)=>i?x.lineTo(X(q[0]),h-4-(h-8)*q[1]):x.moveTo(X(q[0]),h-4-(h-8)*q[1]));x.stroke()}
  else if(AU.tool==='line'){x.beginPath();x.moveTo(X(d.a.t),h-4-(h-8)*d.a.y);x.lineTo(X(d.b.t),h-4-(h-8)*d.b.y);x.stroke()}
  else if(AU.tool!=='point'){x.globalAlpha=.2;x.fillRect(X(Math.min(d.a.t,d.b.t)),0,Math.abs(X(d.b.t)-X(d.a.t)),h);x.globalAlpha=1}}
 const e=play.eng;if(e&&e.run){const px=X(e.pos);x.strokeStyle='#fff';x.lineWidth=1;x.beginPath();x.moveTo(px,0);x.lineTo(px,h);x.stroke();
  if(p&&l.pts.length){const v=A.eval(l,e.pos);x.fillStyle='#fff';x.font='11px sans-serif';x.fillText(SD.fmt(p,A.toValue(p,v)),6,12)}}
}
/* レッスンの目標(赤。達成で緑): at=丸と許容幅の帯 / mono=矢印 / rng=帯 / cyc=波線 / stp・hold=破線の目安 */
function auGoalDraw(x,it,p,hi,X,Y,h){
 const A=SD.Auto,col=it.ok?'#4c4':'#e44',a=it.a,nm=v=>A.fromValue(p,v)/hi;x.save();x.strokeStyle=col;x.fillStyle=col;x.lineWidth=2;
 if(it.k==='at'){const tol=a[2]!=null?a[2]:.1,y=Y(nm(a[1])*hi,hi),dy=(h-8)*tol;x.globalAlpha=.2;x.fillRect(X(a[0])-8,y-dy,16,dy*2);x.globalAlpha=1;x.beginPath();x.arc(X(a[0]),y,5,0,7);x.fill()}
 else if(it.k==='rng'){const y0=Y(nm(a[3])*hi,hi),y1=Y(nm(a[2])*hi,hi);x.globalAlpha=.18;x.fillRect(X(a[0]),Math.min(y0,y1),X(a[1])-X(a[0]),Math.abs(y1-y0));x.globalAlpha=1;x.setLineDash([4,3]);x.strokeRect(X(a[0]),Math.min(y0,y1),X(a[1])-X(a[0]),Math.abs(y1-y0))}
 else if(it.k==='mono'){const up=a[2]!=='down',xa=X(a[0]),xb=X(a[1]),ya=up?h-14:14,yb=up?14:h-14;x.setLineDash([6,4]);x.beginPath();x.moveTo(xa,ya);x.lineTo(xb,yb);x.stroke();x.setLineDash([]);const ang=Math.atan2(yb-ya,xb-xa);x.beginPath();x.moveTo(xb,yb);x.lineTo(xb-9*Math.cos(ang-.4),yb-9*Math.sin(ang-.4));x.lineTo(xb-9*Math.cos(ang+.4),yb-9*Math.sin(ang+.4));x.fill()}
 else if(it.k==='cyc'){const n=a[2],am=a[3];x.setLineDash([3,3]);x.beginPath();for(let i=0;i<=120;i++){const t=a[0]+(a[1]-a[0])*i/120,v=.5+am/2*Math.sin(2*Math.PI*n*i/120),px=X(t),py=h-4-(h-8)*v;i?x.lineTo(px,py):x.moveTo(px,py)}x.stroke()}
 else if(it.k==='stp'||it.k==='hold'){x.setLineDash([2,4]);x.beginPath();x.moveTo(X(a[0]),h-6);x.lineTo(X(a[1]),h-6);x.stroke()}
 x.restore()}
function auPick(){
 const trk=S.mode==='trk'?play.ts:0,D0=SD.defs[auSynth(trk)],row=(p,tk)=>{const off=p.auto===false;
  return `<button class="pb" style="${off?'opacity:.4':''}" data-act="aupick1" data-id="${p.id}" data-trk="${tk}">${esc(p.label)}</button>`};
 let h='<div class="lab">どのつまみを動かしますか(薄いものは動かせません)</div>';
 h+=`<div class="sub">SYNTH(T${trk+1})</div><div class="prow" style="flex-wrap:wrap">${D0.P.filter(p=>(p.type==='knob'||p.type==='seg')&&SD.FXIDS.indexOf(p.id)<0).map(p=>row(p,trk)).join('')}</div>`;
 h+=`<div class="sub">MIX(T${trk+1})</div><div class="prow" style="flex-wrap:wrap">${AUMIX.map(id=>row(SD.MIXP.find(p=>p.id===id),trk)).join('')}</div>`;
 if(typeof trk==='number'&&play.tr[trk])[['eq','EQ4'],['cp','COMP']].forEach(([g,nm])=>{h+=`<div class="sub">${nm}(T${trk+1})</div><div class="prow" style="flex-wrap:wrap">${SD.INSP.filter(p=>p.ins===g&&p.id!=='iOrd').map(p=>row(p,trk)).join('')}</div>`});/* v8.4: ON・切り替えは薄く出る(auto:false) */
  {const rk=autoRack(trk),ML=SD.modLib;if(rk){/* MA-3: 現在のラックのモジュールを 種類名+番号 でグループ化(折りたたみ・検索) */
   const st=rk.st();h+='<div class="sub">RACK(現在のモジュール)</div><div class="prow"><input id="aupq" type="search" placeholder="検索(例: vcf1 / cutoff / レート)" style="flex:1;min-width:0"></div>';
   st.mods.forEach(m=>{const M=SD.MODS[m.t];if(!M)return;const ks=M.knobs.filter(k=>k.type==='knob'||k.type==='seg');if(!ks.length)return;
    h+=`<details class="aug"><summary>${esc(ML.title(m.id))}(${ks.length})</summary><div class="prow" style="flex-wrap:wrap">${ks.map(k=>{const p=ML.knobDef(m.id+'.'+k.k);return `<button class="pb" style="${p.auto===false?'opacity:.4':''}" data-act="aupick1" data-id="${m.id}.${k.k}" data-trk="${trk}" data-q="${esc((m.id+' '+ML.title(m.id)+' '+p.label+' '+k.k).toLowerCase())}">${esc(p.label)}</button>`}).join('')}</div></details>`})}
   const og=SD.Auto.orphans(play.au,autoDef);if(og.length)h+=`<div class="sub">対象なし(いまのラックに無いモジュールのレーン)</div><div class="prow" style="flex-wrap:wrap">${og.map(l=>`<button class="pb" style="opacity:.55" data-act="auorph" data-i="${play.au.lanes.indexOf(l)}">${esc(auLabel(l))}</button>`).join('')}</div>`}
  SD.FXR.forEach(f=>{const L=f.ids.map(id=>D0.byId[id]).filter(Boolean);if(L.length)h+=`<div class="sub">${f.name}</div><div class="prow" style="flex-wrap:wrap">${L.map(p=>row(p,'M')).join('')}</div>`});
 h+=`<div class="sub">MASTER・演奏</div><div class="prow" style="flex-wrap:wrap">${[D0.byId.master,SD.PLAYP.sBpm,SD.PLAYP.sSwing].filter(Boolean).map(p=>row(p,'M')).join('')}</div>`;
 ov(`<div class="sh"><b>対象のつまみ</b><button data-act="close">×</button></div><div class="sb">${h}</div>`);
 const q=$('#aupq');if(q)q.addEventListener('input',()=>{const w=q.value.trim().toLowerCase();document.querySelectorAll('.aug').forEach(d=>{let n=0;d.querySelectorAll('button[data-q]').forEach(b=>{const v=!w||b.dataset.q.indexOf(w)>=0;b.style.display=v?'':'none';if(v)n++});d.style.display=n?'':'none';d.open=!!w&&n>0})})
}
function auApply(){
 const l=auCur();if(!l){toast('先に対象のつまみを選んでください');return}
 const p=auDefAny(l.trk,l.id);if(!p||p.auto===false){toast('このつまみは動かせません');return}
 const au=play.au,len=SD.Auto.len(au),hiN=SD.Auto.hi(p);let lo=AU.lo,hi=AU.hi;if(lo>hi){const t=lo;lo=hi;hi=t}
 let pts=SD.Auto.shape(AU.shape,{t0:0,t1:len,n:AU.perBar*au.bars,depth:hi-lo,center:(hi+lo)/2,seed:AU.seed++});
 if(p.type==='seg'){pts=pts.map(q=>[q[0],Math.round(q[1]*hiN),'S']).filter((q,i,a)=>i===0||q[1]!==a[i-1][1]||q[0]===len)}
 auH().push();l.pts=pts;auDone();
}
/* ---------- FX RACK(v3.1: 固定順のチェーン。いまは SAT→DELAY/REVERB の既存3つ。ONの印=効果量が0でない) ---------- */
const FXR=SD.FXR.map(r=>Object.assign({},r,{on:p=>r.on?p[r.on]==1:r.lamp(p)}));
let FXSEL='sa',FXW=null,FXE=FXR;
/* シンセによっては FX タブにフィルターなど別のつまみも載っている(FM・アディティブ等)。それは「FILTER」の項目にまとめる */
function fxEntries(){const T=D().T.find(t=>t.id==='fx'),known=[].concat(...FXR.map(f=>f.ids)),ex=T.items.filter(i=>known.indexOf(i)<0);/* OR-2a: チェーンの項目は play.fxo の順に並べる(DELAY/REVERB は最後) */const o=SD.fxOrdNorm(play.fxo),pos=k=>o.indexOf(k),ch=FXR.filter(f=>pos(f.k)>=0).sort((a,b)=>pos(a.k)-pos(b.k)),R=ch.concat(FXR.filter(f=>pos(f.k)<0));return ex.length?[{k:'etc',name:'FILTER',ids:ex,on:null}].concat(R):R}
function showFx(){
 S.tab='fx';const g=$('#grid');g.style.setProperty('--c',1);g.style.setProperty('--r',1);
 while(g.firstChild)g.removeChild(g.firstChild);
  FXE=fxEntries();if(!FXE.some(x=>x.k===FXSEL))FXSEL=FXE[0].k;
 const L=S.lesson;if(L&&!S.fin){const fs=(L.steps[S.step].f||[]).map(q=>q[0]),m=FXE.find(x=>x.ids.some(i=>fs.indexOf(i)>=0));if(m)FXSEL=m.k}
 const w=E('div','fxr'),l=E('div','fxl'),r=E('div','fxg');
 FXE.forEach(f=>{const b=E('button','fxi','<i></i>'+f.name);b.dataset.act='fxsel';b.dataset.k=f.k;l.appendChild(b)});
 w.appendChild(l);w.appendChild(r);g.appendChild(w);FXW={l,r};
  if(FXE.length>SD.FXLPAGE){const pb=E('button','pb fxlpg','');pb.dataset.act='fxlpg';l.appendChild(pb)}
  {const mv=E('div','fxmv','');[['▲',-1,'上へ(先に通る)'],['▼',1,'下へ(後に通る)'],['↺',0,'既定の順に戻す']].forEach(q=>{const bt=E('button','pb',q[0]);bt.dataset.act='fxmv';bt.dataset.d=q[1];bt.title=q[2];mv.appendChild(bt)});l.appendChild(mv)}/* OR-2a: ラックの並べ替え */
  FXLP=SD.fxPageOf(FXE.findIndex(x=>x.k===FXSEL));fxlShow();fxFill();
 if(FXRO)FXRO.disconnect();
 if(window.ResizeObserver){let lw=r.clientWidth,lh=r.clientHeight;FXRO=new ResizeObserver(()=>{if(!r.isConnected||FXW.r!==r)return;if(Math.abs(r.clientWidth-lw)>6||Math.abs(r.clientHeight-lh)>6){lw=r.clientWidth;lh=r.clientHeight;fxFill()}});FXRO.observe(r)}
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.id==='fx'));vizDirty=true;
}
let FXPG=0,FXRO=null,FXLP=0;
/* FX-0: 左の一覧が10個を超えたらページ送り(選択中の項目があるページを出す) */
function fxlShow(){if(!FXW)return;const n=FXE.length,pc=SD.fxPageCount(n);if(FXLP>=pc)FXLP=0;FXW.l.querySelectorAll('.fxi').forEach((b,i)=>{b.hidden=pc>1&&SD.fxPageOf(i)!==FXLP});const pb=FXW.l.querySelector('.fxlpg');if(pb)pb.textContent=(FXLP+1)+'/'+pc+' ›'}
/* FXのページ分け: 各部品の占有列数(つまみ=1、セレクタ=2〜3)を数え、「2行・最大maxC列」に収まる範囲で区切る */
function fxW(id){const e=ui[id].el;if(e.classList.contains('sg')){const t=[...e.querySelectorAll('button span')].map(x=>x.textContent.length),n=t.length;return(n>=7||(n>=3&&Math.max(...t)>=5))?3:2}return e.classList.contains('viz')?2:1}
function fxPack(ws,c){ /* grid-auto-flow:row dense と同じ置き方で、c列に並べたときの行数 */
 const occ=[];let rows=0;
 for(const w of ws){if(w>c)return 99;let placed=false;
  for(let r=0;!placed;r++){occ[r]=occ[r]||new Array(c).fill(0);
   for(let x=0;x+w<=c&&!placed;x++){let ok=true;for(let k=0;k<w;k++)if(occ[r][x+k]){ok=false;break}
    if(ok){for(let k=0;k<w;k++)occ[r][x+k]=1;placed=true;rows=Math.max(rows,r+1)}}}
 }
 return rows}
function fxCols(ws,maxC){for(let c=Math.max(2,...ws);c<=maxC;c++)if(fxPack(ws,c)<=2)return c;return 0}
function fxPages(items,maxC,res){ /* items: [{id,w}] / res: 各ページの末尾に確保する部品(ページ送りボタン等) */
 const pages=[];let cur=[];
 items.forEach(it=>{const t=cur.concat([it]).concat(res);if(cur.length&&!fxCols(t.map(x=>x.w),maxC)){pages.push(cur);cur=[it]}else cur.push(it)});
 if(cur.length)pages.push(cur);return pages}
function fxFill(){
 const f=FXE.find(x=>x.k===FXSEL),r=FXW.r;while(r.firstChild)r.removeChild(r.firstChild);
 const maxC=Math.max(4,Math.min(8,Math.floor((r.clientWidth||520)/66))),ts=f.k==='ts';
 const mbv=f.k==='mb'?[{id:'#mbviz',w:3}]:f.k==='vc'?[{id:'#vcviz',w:3}]:f.k==='sp'?[{id:'#spviz',w:3}]:[];/* FX-1c: 3バンド表示を全ページの先頭に */
 const all=f.ids.map(id=>({id,w:fxW(id)})),extra=ts?[{id:'#trig',w:2}]:[];
 let pages=fxPages(all,maxC,extra.concat(mbv));
 if(pages.length>1)pages=fxPages(all,maxC,extra.concat(mbv,[{id:'#pg',w:1}]));
 const pgs=pages.length;if(FXPG>=pgs)FXPG=0;
 const pg=pages[FXPG]||[],list=pg.concat(ts?extra:[]).concat(pgs>1?[{id:'#pg',w:1}]:[]);
 list.unshift(...mbv);const c=fxCols(list.map(x=>x.w),maxC)||maxC,rn=Math.min(2,Math.max(1,fxPack(list.map(x=>x.w),c)));
 r.style.setProperty('--n',c);r.style.setProperty('--rn',rn);r.dataset.rn=rn;r.classList.toggle('unsup',!!(f.wk&&SD.bus.fxUnsup));
 if(mbv.length)r.appendChild(f.k==='vc'?vcEl():f.k==='sp'?spEl():mbEl());
 pg.forEach(it=>{const e=ui[it.id].el;e.style.gridRow='';e.style.gridColumn=e.classList.contains('sg')||e.classList.contains('viz')?'span '+it.w:'';r.appendChild(e)});
 if(ts){const b=E('button','pb fxtrig','TRIG<br>(押している間 止まる)');b.dataset.act='tstrig';b.style.gridColumn='span 2';
  const dn=e=>{e.preventDefault();if(syn.p.tsOn!=1)setP('tsOn',1,true);SD.bus.init();SD.bus.chk();SD.bus.tsTrig(true);b.classList.add('on')},up=()=>{if(b.classList.contains('on')){SD.bus.tsTrig(false);b.classList.remove('on')}};
  b.addEventListener('pointerdown',dn);['pointerup','pointercancel','pointerleave'].forEach(n=>b.addEventListener(n,up));r.appendChild(b)}
 if(pgs>1){const b=E('button','pb fxpg',(FXPG+1)+'/'+pgs+' ›');b.dataset.act='fxpg';r.appendChild(b)}
 fitKs(r,rn,2,c,6);fxLamp();vcDraw();spDraw();
}
/* RP-1c: REVERB の POSITION。SEND のときは▲▼を灰色に・CHAIN のときはヒントを出す */
function fxRvHint(){const rv=FXSEL==='rv',ch=syn.p.rvbPos==1;FXW.r.dataset.hint=rv?(ch?'CHAIN: ラックの▲▼で REVERSE の前にすると尾まで逆再生。DELAY は REVERB の後ろ・トラックの RVB SEND も同じ位置から出ます':'SEND(従来): チェーンの外。POSITION を CHAIN にすると▲▼で REVERSE の前に置けます'):'';FXW.r.classList.toggle('hint',rv);FXW.l.querySelectorAll('.fxmv .pb').forEach(b=>{const d=+b.dataset.d;b.classList.toggle('dis',rv&&!ch&&d!==0);if(d!==0)b.title=(rv&&!ch)?'POSITION を CHAIN に':(d<0?'上へ(先に通る)':'下へ(後に通る)')})}
/* ---------- FX-1c MULTIBAND の画面: 3バンドの帯域(対数軸)・分割位置・GRメーター・SOLO/MUTEの状態 ---------- */
let MBV=null;
function mbEl(){if(!MBV){const e=E('div','viz mbviz'),c=E('canvas');e.appendChild(c);MBV={el:e,cv:c}}MBV.el.style.gridColumn='span 3';return MBV.el}
function mbDraw(){
 if(!FXW||FXSEL!=='mb'||!MBV||!MBV.el.isConnected)return;const cv=MBV.cv,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;
 if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}const c=cv.getContext&&cv.getContext('2d');if(!c)return;
 const P=syn.p,x1=+P.mbX1||200,x2=Math.max(+P.mbX2||2500,x1*1.25),X=f=>w*Math.log(Math.min(20000,Math.max(20,f))/20)/Math.log(1000);
 const on=P.mbOn==1,g=on?SD.bus.mbGr():null,sx=[0,X(x1),X(x2),w],nm=['LO','MID','HI'],col=['#e8a33d','#4fc3a1','#6aa9ff'];
 const solo=[1,2,3].some(n=>P['mbS'+n]==1);
 c.clearRect(0,0,w,h);c.font='10px sans-serif';c.textBaseline='top';
 for(let b=0;b<3;b++){const n=b+1,mute=P['mbM'+n]==1,so=P['mbS'+n]==1,live=on&&!mute&&(!solo||so);
  c.globalAlpha=live?1:.35;c.fillStyle=col[b]+'33';c.fillRect(sx[b],0,sx[b+1]-sx[b],h);
  const gr=g&&g[b]!=null?Math.abs(g[b]):0,gh=Math.min(1,gr/24)*(h-16);c.fillStyle=col[b]+'cc';c.fillRect(sx[b]+2,0,Math.max(0,sx[b+1]-sx[b]-4),gh);   // 上から下がる=ゲインリダクション
  c.fillStyle='#fff';c.fillText(nm[b]+(so?' S':'')+(mute?' M':''),sx[b]+4,h-13);if(on&&(+P['mbR'+n]||1)>1)c.fillText(gr.toFixed(1)+' dB',sx[b]+4,2);
  c.globalAlpha=1}
 c.strokeStyle='#888';c.lineWidth=1;[1,2].forEach(i=>{c.beginPath();c.moveTo(sx[i],0);c.lineTo(sx[i],h);c.stroke()});
 c.fillStyle='#aaa';c.fillText(on?'':'OFF',w-24,2)}
/* ---------- FX-5c VOCODER の画面: 分析の帯域(下の棒。対数軸)と、FORMANT でずらした合成の帯域(上の棒)・SRC・NOISE ---------- */
let VCV=null;
function vcEl(){if(!VCV){const e=E('div','viz mbviz'),c=E('canvas');e.appendChild(c);VCV={el:e,cv:c}}VCV.el.style.gridColumn='span 3';return VCV.el}
function vcDraw(){
 if(!FXW||FXSEL!=='vc'||!VCV||!VCV.el.isConnected)return;const cv=VCV.cv,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;
 if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}const c=cv.getContext&&cv.getContext('2d');if(!c)return;
 const P=syn.p,n=[8,12,16,20][P.vcBands|0]||16,lo=+P.vcLo||100,hi=Math.max(+P.vcHi||8000,lo*2),fm=+P.vcFmt||0,k=Math.pow(2,fm/12),on=P.vcOn==1,src=P.vcSrc|0;
 const X=f=>w*Math.log(Math.min(20000,Math.max(20,f))/20)/Math.log(1000),r=Math.pow(hi/lo,1/(n-1)),bw=Math.max(2,X(lo*r)-X(lo)-2);
 c.clearRect(0,0,w,h);c.font='10px sans-serif';c.textBaseline='top';c.globalAlpha=on?1:.4;
 for(let i=0;i<n;i++){const f=lo*Math.pow(r,i);c.fillStyle='#4fc3a1cc';c.fillRect(X(f)-bw/2,h/2+2,bw,h/2-14);   // 下=分析(モジュレーター)
  c.fillStyle='#e8a33dcc';c.fillRect(X(f*k)-bw/2,12,bw,h/2-14)}   // 上=合成(搬送波)。FORMANT=0 なら真上に並ぶ
 c.fillStyle='#fff';c.fillText('合成'+(fm?(fm>0?' +':' ')+fm+'st':''),4,1);c.fillText('分析 '+n+'帯域'+(src?'  SRC T'+src:'  SRC INT(素通し)')+((+P.vcNoise||0)>0?'  NOISE '+Math.round(P.vcNoise*100)+'%':''),4,h-12);
 c.globalAlpha=1;if(!on){c.fillStyle='#aaa';c.fillText('OFF',w-24,1)}}
/* ---------- FX-4d SPECTRAL の画面: 対数周波数軸に「MODEの掛かり方(TILTの重み)」・MODE/AMOUNT・FREEZE・SIZEと遅れ・負荷:高 ---------- */
let SPV=null;
function spEl(){if(!SPV){const e=E('div','viz mbviz'),c=E('canvas');e.appendChild(c);SPV={el:e,cv:c}}SPV.el.style.gridColumn='span 3';return SPV.el}
function spDraw(){
 if(!FXW||FXSEL!=='sp'||!SPV||!SPV.el.isConnected)return;const cv=SPV.cv,w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;
 if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}const c=cv.getContext&&cv.getContext('2d');if(!c)return;
 const P=syn.p,on=P.spOn==1,md=P.spMode|0,am=Math.min(1,Math.max(0,+P.spAmt)),tl=Math.min(1,Math.max(-1,+P.spTilt||0)),fz=P.spFz==1,N=P.spSize==1?2048:1024,ms=Math.round(N/48);
 const nm=['BLUR','GATE','ROBOT','WHISPER','SHIFT'][md]||'BLUR',n=Math.max(8,Math.floor(w/6)),top=14,bh=h-top-14;
 c.clearRect(0,0,w,h);c.font='10px sans-serif';c.textBaseline='top';c.globalAlpha=on?1:.4;
 for(let i=0;i<n;i++){const x=(i+.5)/n,wt=tl>0?1-(1-x)*tl:1+x*tl,v=am*wt,bw=Math.max(2,w/n-1);   // 棒=その周波数にどれだけ掛かるか(AMOUNT×TILTの重み。左=20Hz・右=20kHz)
  c.fillStyle=fz?'#6aa9ffcc':'#e8a33dcc';c.fillRect(i*w/n,top+bh*(1-v),bw,Math.max(1,bh*v))}
 c.fillStyle='#fff';c.fillText(nm+'  AMOUNT '+Math.round(am*100)+'%'+(tl?'  TILT '+(tl>0?'+':'')+Math.round(tl*100)+'%':''),4,1);
 c.fillText('SIZE '+N+'(遅れ約'+ms+'ms)'+(fz?'   ❄ FREEZE':''),4,h-12);
 c.globalAlpha=1;c.fillStyle=on?'#ff6b5e':'#aaa';c.textAlign='right';c.fillText(on?'負荷:高':'OFF',w-4,1);c.textAlign='left'}
function fxLamp(){if(!FXW)return;fxRvHint();const nOn=FXE.filter(f=>f.on&&f.on(syn.p)).length;FXW.l.classList.toggle('heavy',nOn>6||FXE.some(f=>f.heavy&&f.on&&f.on(syn.p)));FXW.l.classList.toggle('heavy2',syn.p.spOn==1);FXW.l.querySelectorAll('.fxi').forEach((b,i)=>{const f=FXE[i];b.classList.toggle('sel',f.k===FXSEL);b.classList.toggle('on',f.on?!!f.on(syn.p):false);b.classList.toggle('nolamp',!f.on);b.classList.toggle('unsup',!!(f.wk&&SD.bus.fxUnsup))})}
/* ---------- MIX(トラックストリップ: VOL・PAN。非TRKは1本だけ=トラック1) ---------- */
/* ---------- MIX(v7.0b): ストリップ(フェーダー・PAN・M/S・PEAK/RMS/GRメーター)+マスターのメーター+選択トラックのインサート ---------- */
SD.bus.onMon=m=>{const e=$('#monbar'),on=m.mono||m.small;if(e){e.hidden=!on;e.innerHTML=on?`<span>🎧 モニター: ${[m.mono?'MONO':'',m.small?'小スピーカー風':''].filter(Boolean).join(' + ')} がON(保存されません)</span><button data-act="monoff">全部OFF</button>`:''}if(S.tab==='mix'&&MX.el)renderMix()};
const MX={el:null,sel:0,pg:0,sec:'ins',bus:0,bg:'eq',ins:{t:0,g:'eq'},tmr:0,mt:[],mm:null,clip:false,an:{v:'spec',vs:-1},rm:[],tc:0,pts:[]};SD.bus.onLoad=()=>{if(S.tab==='mix'&&MX.el)renderMix()};
function showMix(){
 S.tab='mix';const g=$('#grid');g.style.setProperty('--c',1);g.style.setProperty('--r',1);
 while(g.firstChild)g.removeChild(g.firstChild);
 MX.el=E('div','mxp');g.appendChild(MX.el);renderMix();
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.id==='mix'));
}

/* ---- 解析ビュー(v7.1a): スペクトル重ね・帯域バー・MIXマップ。表示のためだけ(音は変えない) ---- */
function mxAnDraw(){
 const cv=MX.el&&MX.el.querySelector('#mxan');if(!cv)return;const B=SD.bus,c=cv.getContext&&cv.getContext('2d');if(!c)return;
 const W=cv.width,H=cv.height,sr=B.ctx?B.ctx.sampleRate:48000,n=SD.MAXT,A=MX.an,CA='#4fc3a1',CB='#e8a33d';
 c.clearRect(0,0,W,H);c.font='10px sans-serif';c.textBaseline='top';
 const sp=[];for(let k=0;k<n;k++)sp[k]=B.trackSpec(k);
 const sel=sp[MX.sel],act=k=>sp[k]&&SD.Mix.bandLevels(sp[k],sr).some(v=>v>-100);
 const oth=A.vs>=0?sp[A.vs]:SD.Mix.sumPow(sp.filter((q,k)=>k!==MX.sel&&q));
 const ov=$('#mxov');
 if(!B.ctx||!sel){c.fillStyle='#888';c.fillText('再生すると表示されます',8,8);if(ov)ov.textContent='';MX.pts=[];return}
 const X=f=>W*Math.log(f/20)/Math.log(1000);
 if(A.v==='spec'){
  c.strokeStyle='#333';c.lineWidth=1;[100,1000,10000].forEach(f=>{c.beginPath();c.moveTo(X(f),0);c.lineTo(X(f),H);c.stroke();c.fillStyle='#777';c.fillText(f>=1000?(f/1000)+'k':f,X(f)+2,H-11)});
  [[sel,CA],[oth,CB]].forEach(([d,col])=>{c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();let st=false;const hz=sr/(2*d.length);for(let k=1;k<d.length;k++){const f=k*hz;if(f<20||f>20000)continue;const y=H*(1-Math.max(0,Math.min(1,(d[k]+100)/80)));st?c.lineTo(X(f),y):c.moveTo(X(f),y);st=true}c.stroke()});
  c.fillStyle=CA;c.fillText('■ T'+(MX.sel+1),6,2);c.fillStyle=CB;c.fillText('■ '+(A.vs>=0?'T'+(A.vs+1):'他すべて'),56,2);
 }else if(A.v==='band'){
  const la=SD.Mix.bandLevels(sel,sr),lb=SD.Mix.bandLevels(oth,sr),bw=W/SD.BANDS.length;
  SD.BANDS.forEach((b,i)=>{[[la[i],CA,0],[lb[i],CB,1]].forEach(([v,col,j])=>{const h=SD.Mix.lvFrac(v)*(H-16);c.fillStyle=col;c.fillRect(i*bw+4+j*(bw-8)/2,H-14-h,(bw-8)/2-1,h)});c.fillStyle='#999';c.fillText(b.name.slice(0,4),i*bw+3,H-12)});
 }else{
  MX.pts=[];c.strokeStyle='#333';c.beginPath();c.moveTo(W/2,0);c.lineTo(W/2,H);c.stroke();c.fillStyle='#777';c.fillText('L',3,2);c.fillText('R',W-9,2);c.fillText('高',3,14);c.fillText('低',3,H-12);
  for(let k=0;k<n;k++){if(!sp[k]||!play.tr[k]||!act(k))continue;const m=play.tr[k].mix,pt=SD.Mix.mapPoint({pan:m.tPan,centroid:SD.Mix.centroid(sp[k],sr),level:MX.rm[k],rvb:(m.tRvb==null?1:m.tRvb)*(+B.val('rvbMix')||0)});
   const px=8+pt.x*(W-16),py=8+(1-pt.y)*(H-16),r=5+pt.r*14;MX.pts.push({k,x:px,y:py,r});
   c.save();c.shadowColor=k===MX.sel?CA:CB;c.shadowBlur=pt.blur*24;c.fillStyle=(k===MX.sel?CA:CB)+'aa';c.beginPath();c.arc(px,py,r,0,7);c.fill();c.restore();
   if(k===MX.sel){c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.arc(px,py,r,0,7);c.stroke()}c.fillStyle='#fff';c.fillText(k+1,px-3,py-5)}
 }
 if(ov){if(A.v==='map')ov.textContent='横=PAN・縦=音の高さの重心・大きさ=音量・ぼやけ=リバーブ。円をタップで選択';else{const q=SD.Mix.overlap(SD.Mix.bandLevels(sel,sr),SD.Mix.bandLevels(oth,sr));ov.textContent='ぶつかり度 '+q+'(0〜100)。学習用の目安で、耳が最終判断です'}}
}
function mxStop(){if(MX.tmr){clearInterval(MX.tmr);MX.tmr=0}if(!S.mtOn)SD.bus.meterOn(false)}
function mxMeterTick(){
 if(S.tab!=='mix'||!MX.el||!MX.el.isConnected){mxStop();return}
 const B=SD.bus,now=performance.now(),dt=Math.min(.2,(now-(MX.t0||now))/1000);MX.t0=now;
 MX.mt.forEach(m=>{const q=B.trackMeter(m.k),pk=q?q.peak:-90,rm=q?q.rms:-90;
  MX.rm[m.k]=rm;m.pk=SD.peakHold(m.pk,pk,dt,20);m.rms.style.height=(SD.meterFrac(rm)*100)+'%';m.ph.style.bottom=(SD.meterFrac(m.pk)*100)+'%';m.ph.classList.toggle('clip',SD.isClip(m.pk));
  const g=B.trackGr(m.k);m.gr.style.height=g?Math.min(100,Math.abs(g.gr)/20*100)+'%':'0%';m.rms.classList.toggle('hot',rm>-6)});
 const M=MX.mm;if(M){const q=B.masterMeter(),pk=q?q.peak:-90,rm=q?q.rms:-90,pre=q?q.pre:-90;
  M.pk=SD.peakHold(M.pk,pk,dt,20);M.rms.style.height=(SD.meterFrac(rm)*100)+'%';M.ph.style.bottom=(SD.meterFrac(M.pk)*100)+'%';
  if(SD.isClip(pre)||SD.isClip(pk))MX.clip=true;M.lamp.classList.toggle('on',MX.clip);
  M.txt.textContent='PEAK '+(M.pk<=-89?'−∞':M.pk.toFixed(1))+' / RMS '+(rm<=-89?'−∞':rm.toFixed(1))+' dB';
  M.gr.style.height=q?Math.min(100,Math.abs(q.gr)/20*100)+'%':'0%'}
 if((MX.tc++&1)===0)mxAnDraw();
 {const eb=MX.el.querySelector('#busgr');if(eb){const q=B.busGr(MX.bus);eb.textContent=q?('GR '+Math.abs(q.gr).toFixed(1)+' dB'):'GR —'}}
 const el=MX.el.querySelector('#insgr');if(el){const q=B.trackGr(MX.sel);el.textContent=q?('GR '+Math.abs(q.gr).toFixed(1)+' dB'+(q.grm!=null&&Math.abs(q.grm-q.gr)>.05?'(混合後 '+Math.abs(q.grm).toFixed(1)+')':'')):'GR —'}
}
/* ---- シーン(v7.3a) ---- */
function scHtml(){const SC=play.sc,cur=MX.scn|0;return `<div class="mxr wrap">${SC.map((c,i)=>`<button class="pb scb ${i===cur?'on':''}" data-act="scn" data-v="${i}">S${i+1}<small>${c?esc(c.name):'—'}</small></button>`).join('')}</div><div class="mxr wrap"><button class="pb pri" data-act="scnsave">いまのミックスを S${cur+1} に保存</button><input id="scnname" maxlength="12" value="${esc(SC[cur]?SC[cur].name:'')}" placeholder="名前" aria-label="シーン名"><button class="pb" data-act="scnname">名前を変える</button></div><div class="hint">タップで呼び出し・長押しで上書き保存。保存するのは各トラックの VOL・PAN・送り・ミュート・インサート・OUT。シーンの切替は AUTO タブの「シーンレーン」で小節に置きます。</div>`}
function sceneApply(i){const c=play.sc[i];if(!c)return;c.tr.forEach((t,k)=>{const x=play.tr[k];if(!x)return;Object.keys(t.mix).forEach(id=>{x.mix[id]=t.mix[id];SD.bus.setMix(k,id,t.mix[id])});x.mute=t.mute});play.eng.ss={};updTrk();savePlay()}
const SCN={lp:0,tm:0};
document.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('.scb');if(!b)return;clearTimeout(SCN.tm);SCN.tm=setTimeout(()=>{SCN.lp=1;const i=+b.dataset.v;MX.scn=i;play.snap(i);savePlay();toast('S'+(i+1)+' に保存しました');renderMix()},600)});
['pointerup','pointercancel','pointerleave'].forEach(t=>document.addEventListener(t,()=>clearTimeout(SCN.tm)));
function renderMix(){
 if(S.tab!=='mix'||!MX.el)return;const trk=S.mode==='trk',n=trk?SD.MAXT:1,B=SD.bus;
 MX.sel=Math.max(0,Math.min(MX.sel,n-1));MX.ins.t=MX.sel;
 const W=MX.el.clientWidth||window.innerWidth,per=(n>4&&W<900)?4:n;/* 8本+マスター+パネルが横に収まらない端末は4本ずつのページ */
 const pgs=Math.ceil(n/per);MX.pg=Math.max(0,Math.min(MX.pg,pgs-1));
 /* 選択トラックのページへ */ if(MX.sel<MX.pg*per||MX.sel>=(MX.pg+1)*per)MX.pg=Math.floor(MX.sel/per);
 const sl=(p,x,k)=>`<div class="mxr"><span class="lb2">${p.label}</span><input type="range" class="mxi" min="0" max="1000" data-t="${k}" data-id="${p.id}" value="${Math.round(SD.toN(p,x.mix[p.id])*1000)}" aria-label="${p.label}"><span class="pv">${SD.fmt(p,x.mix[p.id])}</span></div>`;
 const PV=SD.MIXP.find(p=>p.id==='tVol'),PP_=SD.MIXP.find(p=>p.id==='tPan');
 const lamps=x=>SD.INSG.map(g=>`<i class="${x.mix[g.on]?'on':''}">${g.name[0]}</i>`).join('');
 const strip=k=>{const x=play.tr[k];return `<div class="ms${k===MX.sel?' sel':''}" data-k="${k}"><button class="mxn" data-act="insT" data-v="${k}">${trk?'T'+(k+1):'MAIN'}<small>${trk?esc(x.name)+(x.mix.tOut?' ▸'+'ABC'[x.mix.tOut-1]:''):''}</small></button><div class="mxf"><div class="fd" data-t="${k}" role="slider" aria-label="VOL"><i class="ff" style="height:${SD.toN(PV,x.mix.tVol)*100}%"></i><b class="ft" style="bottom:${SD.toN(PV,x.mix.tVol)*100}%"></b></div><div class="mtr"><div class="mb mrms"></div><u class="mpk"></u><div class="mgr"></div></div></div><div class="pv vv" data-t="${k}">${SD.fmt(PV,x.mix.tVol)}</div><div class="mxr pn"><input type="range" class="mxi" min="0" max="1000" data-t="${k}" data-id="tPan" value="${Math.round(SD.toN(PP_,x.mix.tPan)*1000)}" aria-label="PAN"><span class="pv">${SD.fmt(PP_,x.mix.tPan)}</span></div>${trk?`<div class="mxb"><button class="pb ${x.mute?'on':''}" data-act="mixm" data-t="${k}">M</button><button class="pb ${x.solo?'on':''}" data-act="mixs" data-t="${k}">S</button></div><div class="mil">${lamps(x)}</div>`:''}</div>`};
 const strips=Array.from({length:per},(_,j)=>MX.pg*per+j).filter(k=>k<n).map(strip).join('');
 const master=`<div class="ms mst"><div class="mxn">MASTER<small>PEAK/RMS</small></div><div class="mxf"><div class="mtr big"><div class="mb mrms"></div><u class="mpk"></u><div class="mgr"></div></div></div><button class="clipb${MX.clip?' on':''}" data-act="mxclip" title="タップで消す">CLIP</button><div class="pv mtx">—</div></div>`;
 const pager=pgs>1?`<div class="mxpg">${Array.from({length:pgs},(_,i)=>`<button class="pb ${i===MX.pg?'on':''}" data-act="mxpg" data-v="${i}">T${i*per+1}-${Math.min(n,(i+1)*per)}</button>`).join('')}</div>`:'';
 /* 右: 選択トラック(INSERT / SEND・PITCH / DUCK) */
 const k=MX.sel,x=play.tr[k],hv=B.heavy?B.heavy():0;
 const seg=p=>`<div class="mxr wrap"><span class="lb2">${p.label}</span>${p.opts.map(([v,nm])=>`<button class="pb ${x.mix[p.id]===v?'on':''}" data-act="insSeg" data-t="${k}" data-id="${p.id}" data-v="${v}">${nm}</button>`).join('')}</div>`;
 const K=SD.MIXP.filter(p=>p.type==='knob'),dk=K.filter(p=>p.id.slice(0,2)==='dk');
 const busScHint=(b,bm)=>{if(!(bm.iCpSc|0))return'';const j=B.bscSrc?B.bscSrc(b):-1;return'<div class="hint">'+(bm.iCpOn!=1?'COMP が OFF のあいだは、サイドチェインも働きません。':j>=0?'判定に使う音: T'+(j+1)+'(そのトラックをミュートしていても、判定には使われます)。':'判定に使う音がありません(INT として動いています)。')+'</div>'};
 const scHint=(k,x,g)=>{const sf=g==='cp_2'?'_2':'',v=x.mix['iCpSc'+sf]|0;if(!v)return'';const j=B.scSrc?B.scSrc(k,g||'cp'):-1;return'<div class="hint">'+(x.mix['iCpOn'+sf]!=1?'COMP が OFF のあいだは、サイドチェインも働きません。':j>=0?'判定に使う音: T'+(j+1)+'(そのトラックをミュートしていても、判定には使われます)。':'自分自身を選んでいるか、キーがぐるっと循環になるため、INT(自分の音で判定)として動いています。')+'</div>'};
 const secs=[['ins','INSERT'],['snd','SEND/OUT'],['bus','BUS'],['sc','SCENE'],['dk','DUCK']];
 let body='';
 if(MX.sec==='ins'){const G=SD.INSG.find(g=>g.k===MX.ins.g)||SD.INSG[0],ps=SD.INSP.filter(p=>p.ins===G.k||(p.ins==='ord'&&(G.k==='eq'||G.k==='cp')));
  const has2=SD.ordOf(x.mix).indexOf(G.k+'_2')>=0,ps2=has2?ps.filter(p=>p.ins===G.k).map(p=>SD.insDef(p.id+'_2')):[];/* OR-3d: 2段目のつまみ */
  const oh=ordHtml(x,k);body=`<div class="mxr wrap">${SD.INSG.map(g=>`<button class="pb ${g.k===G.k?'on':''}" data-act="insG" data-v="${g.k}">${g.name}${x.mix[g.on]?' ●':''}</button>`).join('')}</div>${oh}${ps.map(p=>p.type==='seg'?seg(p):sl(p,x,k)).join('')}${G.k==='cp'?'<div class="hint" id="insgr">GR —</div>'+scHint(k,x):''}${has2?`<div class="sub">${G.name} 2(2段目。オートメーション不可)</div>`+ps2.map(p=>p.type==='seg'?seg(p):sl(p,x,k)).join('')+(G.k==='cp'?scHint(k,x,'cp_2'):''):''}<div class="hint">このトラックだけに掛かります(マスターの FX とは別)。</div>`}
 else if(MX.sec==='snd')body=seg(SD.MIXP.find(p=>p.id==='tOut'))+['tPitch','tDly','tRvb'].map(id=>sl(SD.MIXP.find(p=>p.id===id),x,k)).join('')+'<div class="hint">OUT=音の出口(BUS A=ドラム役・B=音楽役・C=声役)。DLY/RVB SEND はマスターの DELAY・REVERB へ送る量です。送りは各トラックから取るので、バスの EQ・COMP・VOL の影響は受けません(トラックの VOL・PAN・インサートは効きます)。</div>';
 else if(MX.sec==='sc')body=scHtml();
 else if(MX.sec==='bus'){const bi=MX.bus,bm=play.bm[bi],BG=MX.bg==='cp'?'cp':'eq',on=BG==='cp'?'iCpOn':'iEqOn',who=play.tr.map((t,j)=>t.mix.tOut===bi+1?'T'+(j+1):'').filter(Boolean).join(' ')||'(なし)';
  const bsl=p=>`<div class="mxr"><span class="lb2">${p.label}</span><input type="range" class="mxbi" min="0" max="1000" data-b="${bi}" data-id="${p.id}" value="${Math.round(SD.toN(p,bm[p.id])*1000)}" aria-label="${p.label}"><span class="pv">${SD.fmt(p,bm[p.id])}</span></div>`;
  const bseg=p=>`<div class="mxr wrap"><span class="lb2">${p.label}</span>${p.opts.map(([v,nm])=>`<button class="pb ${bm[p.id]===v?'on':''}" data-act="busSeg" data-b="${bi}" data-id="${p.id}" data-v="${v}">${nm}</button>`).join('')}</div>`;
  const ps=SD.BUSP.filter(p=>p.ins===BG&&p.id!==on);
  body=`<div class="mxr wrap">${SD.BUSN.map((nm,i)=>`<button class="pb ${i===bi?'on':''}" data-act="busSel" data-v="${i}">${nm}</button>`).join('')}</div><div class="hint">${SD.BUSROLE[bi]}。入っているトラック: ${who}(トラックの OUT で選びます)</div>${bsl(SD.BUSP[0])}<div class="mxr wrap">${['eq','cp'].map(g=>`<button class="pb ${g===BG?'on':''}" data-act="busG" data-v="${g}">${g==='eq'?'EQ':'COMP'}${bm[g==='eq'?'iEqOn':'iCpOn']?' ●':''}</button>`).join('')}</div>${bseg(SD.BUSP.find(p=>p.id===on))}${ps.map(p=>p.type==='seg'?bseg(p):bsl(p)).join('')}${bseg(SD.BUSP.find(p=>p.id==='iOrd'))}${BG==='cp'?'<div class="hint" id="busgr">GR —</div>'+busScHint(bi,bm):''}<div class="hint">バスは、まとめた音に EQ・COMP を掛けます。バスの音量はそのバスに入れたトラック全部に効きます。</div>`}
 else body=`<div class="mxr"><span class="lb2">DUCK</span><button class="pb ${x.mix.dkOn?'on':''}" data-act="mixdk" data-t="${k}">${x.mix.dkOn?'ON':'OFF'}</button></div><div class="mxr wrap"><span class="lb2">SRC</span>${Array.from({length:SD.MAXT},(_,j)=>j).filter(j=>j!==k).map(j=>`<button class="pb ${x.mix.dkSrc===j?'on':''}" data-act="mixsrc" data-t="${k}" data-v="${j}">T${j+1}</button>`).join('')}</div>${x.mix.dkOn?dk.filter(p=>p.type==='knob').map(p=>sl(p,x,k)).join('')+'<div class="hint">ノートで掛ける疑似サイドチェイン(音声は使いません)</div>':''}`;
 const AV=[['spec','スペクトル重ね'],['band','帯域'],['map','MAP']],an=trk?`<div class="mxan"><div class="mxr wrap">${AV.map(([v,nm])=>`<button class="pb ${MX.an.v===v?'on':''}" data-act="anv" data-v="${v}">${nm}</button>`).join('')}</div><canvas id="mxan" width="300" height="130"></canvas>${MX.an.v!=='map'?`<div class="mxr wrap"><span class="lb2">VS</span><button class="pb ${MX.an.vs<0?'on':''}" data-act="anvs" data-v="-1">他すべて</button>${Array.from({length:SD.MAXT},(_,j)=>j).filter(j=>j!==k).map(j=>`<button class="pb ${MX.an.vs===j?'on':''}" data-act="anvs" data-v="${j}">T${j+1}</button>`).join('')}</div>`:''}<div class="hint" id="mxov"></div></div>`:'';
 const panel=trk?`<div class="mxsel"><div class="mxn">T${k+1} ${esc(x.name)}${hv>SD.INSMAX?' <span class="warn">負荷:高</span>':''}</div><div class="mxr wrap">${secs.map(([v,nm])=>`<button class="pb ${MX.sec===v?'on':''}" data-act="mxsec" data-v="${v}">${nm}</button>`).join('')}</div>${body}${an}</div>`:`<div class="mxsel"><div class="mxn">MAIN</div>${['tPitch','tDly','tRvb'].map(id=>sl(SD.MIXP.find(p=>p.id===id),x,0)).join('')}</div>`;
 const mo=B.mon||{},monRow=`<div class="mxr wrap monr"><span class="lb2">MON</span><button class="pb ${mo.mono?'on':''}" data-act="mon" data-v="mono">MONO</button><button class="pb ${mo.small?'on':''}" data-act="mon" data-v="small">小SP</button><span class="hint">聴く音だけ変わります(保存されません)</span></div>`;
 MX.el.innerHTML=`<div class="mxl">${monRow}<div class="mxst">${strips}${master}</div>${pager}<div class="hint">RMS は目安です(LUFS は測りません)。CLIP は合計が 0dB を超えたしるし。</div></div>${panel}`;
 /* メーターの要素を集めて更新ループを開始(MIX画面を開いている間だけ解析ノードをつなぐ) */
 MX.mt=[...MX.el.querySelectorAll('.ms[data-k]')].map(e=>({k:+e.dataset.k,rms:e.querySelector('.mrms'),ph:e.querySelector('.mpk'),gr:e.querySelector('.mgr'),pk:-90}));
 const me=MX.el.querySelector('.ms.mst');MX.mm={rms:me.querySelector('.mrms'),ph:me.querySelector('.mpk'),gr:me.querySelector('.mgr'),lamp:me.querySelector(".clipb"),txt:me.querySelector('.mtx'),pk:-90};
 B.meterOn(true);if(!MX.tmr){MX.t0=0;MX.tmr=setInterval(mxMeterTick,50)}
 const set=(k,id,v)=>{if(id==='tPan'&&Math.abs(v)<.03)v=0;play.tr[k].mix[id]=v;B.setMix(k,id,v);if(!/_2$/.test(id))auUser(id,v,k);/* 2段目はオートメーション対象外 */savePlay();if(S.lesson)checkGoals();return v};
 MX.el.querySelectorAll('.mxi').forEach(i=>{const p=SD.MIXALL().find(q=>q.id===i.dataset.id)||SD.insDef(i.dataset.id),kk=+i.dataset.t;
  const upd=(v,sync)=>{v=set(kk,p.id,v);i.nextElementSibling.textContent=SD.fmt(p,v);if(sync)i.value=Math.round(SD.toN(p,v)*1000)};
  i.addEventListener('input',()=>upd(SD.fromN(p,i.value/1000),p.id==='tPan'));
  i.addEventListener('dblclick',()=>upd(p.def,true))});
 MX.el.querySelectorAll('.mxbi').forEach(i=>{const p=SD.BUSP.find(q=>q.id===i.dataset.id),bb=+i.dataset.b;i.addEventListener('input',()=>{const v=SD.fromN(p,i.value/1000);play.bm[bb][p.id]=v;SD.bus.setBusMix(bb,p.id,v);i.nextElementSibling.textContent=SD.fmt(p,v);savePlay()});i.addEventListener('dblclick',()=>{play.bm[bb][p.id]=p.def;SD.bus.setBusMix(bb,p.id,p.def);i.value=Math.round(SD.toN(p,p.def)*1000);i.nextElementSibling.textContent=SD.fmt(p,p.def);savePlay()})});
 const cv=MX.el.querySelector('#mxan');if(cv)cv.addEventListener('click',e=>{if(MX.an.v!=='map')return;const r=cv.getBoundingClientRect(),sx=cv.width/(r.width||cv.width),x=(e.clientX-r.left)*sx,y=(e.clientY-r.top)*sx;let best=null,bd=1e9;MX.pts.forEach(q=>{const d=Math.hypot(q.x-x,q.y-y);if(d<Math.max(q.r+6,14)&&d<bd){bd=d;best=q}});if(best){MX.sel=best.k;renderMix()}});
 /* 縦フェーダー(自前。ドラッグ・ダブルタップで100%に戻す) */
 MX.el.querySelectorAll('.fd').forEach(f=>{const kk=+f.dataset.t,val=f.parentNode.parentNode.querySelector('.vv');let lt=0;
  const put=v=>{v=set(kk,'tVol',v);const nn=SD.toN(PV,v)*100;f.querySelector('.ff').style.height=nn+'%';f.querySelector('.ft').style.bottom=nn+'%';val.textContent=SD.fmt(PV,v)};
  const mv=e=>{const r=f.getBoundingClientRect();put(SD.fromN(PV,Math.max(0,Math.min(1,1-(e.clientY-r.top)/r.height))))};
  f.addEventListener('pointerdown',e=>{e.preventDefault();const t=performance.now();if(t-lt<300){put(PV.def);lt=0;return}lt=t;if(f.setPointerCapture)try{f.setPointerCapture(e.pointerId)}catch(_){}f.dataset.dr=1;mv(e)});
  f.addEventListener('pointermove',e=>{if(f.dataset.dr)mv(e)});
  ['pointerup','pointercancel'].forEach(n=>f.addEventListener(n,()=>{delete f.dataset.dr}))});
}

const segRow=(label,act,opts,cur,pid)=>`<div class="prow" data-pid="${pid}"><span class="lb2">${label}</span>${opts.map(([v,n])=>`<button class="pb ${String(v)===String(cur)?'on':''}" data-act="${act}" data-v="${v}">${n}</button>`).join('')}</div>`;
const swingRow=()=>`<div class="prow" data-pid="sSwing"><span class="lb2">SWING</span><input type="range" id="swing" min="0" max="60" value="${Math.round(play.swing*100)}"><span class="pv" id="swingv">${Math.round(play.swing*100)}%</span></div>`;
function renderArp(){
 const a=play.a;
 PP.el.innerHTML=segRow('MODE','amode',SD.ARP_MODES,a.mode,'aMode')+segRow('RATE','arate',SD.RATES.map((r,i)=>[i,r[0]]),a.rate,'aRate')+
 `<div class="prow"><span class="grp" data-pid="aOct"><span class="lb2">OCT</span>${[1,2,3,4].map(n=>`<button class="pb ${a.oct===n?'on':''}" data-act="aoct" data-v="${n}">${n}</button>`).join('')}</span><span class="grp" data-pid="aGate"><span class="lb2">GATE</span><input type="range" id="gate" min="10" max="100" value="${Math.round(a.gate*100)}"><span class="pv" id="gatev">${Math.round(a.gate*100)}%</span></span></div>`+swingRow()+
 `<div class="hint">鍵盤で和音を押さえる。HOLDを入れると離しても続き、新しい和音で入れ替わります。</div>`;
 paintGoals();
}
/* MT-2b: 拍子の表示(強拍=まとまりの先頭・小節頭・表示列数・ボタン) */
function mtShown(len){return Math.max(16,len|0)}
function mtCls(i){const spb=play.spb(),p=i%spb;return play.accArr().indexOf(p)>=0?(p===0?' gs bs':' gs'):''}
function mtBtn(){const M=SD.METER,m=play.getMeter(),b=$('#mtb'),r=$('#mtr');if(b)b.textContent=M?M.label(m)+(M.isCompound(m)?' ♩.='+Math.round(M.dottedBpm(play.bpm)):''):'4/4';if(r)r.classList.toggle('on',!!play.metro)}
function meterAsk(m){const M=SD.METER,w=M.why(m);if(w){toast('その拍子は使えません: '+w);return}
 const n=M.stepsPerBar(m),diff=play.s.len!==n||play.tr.some(x=>x.len!==n);let fit=false;
 if(diff)fit=confirm('拍子を '+M.label(m)+'(1小節='+n+'ステップ)にします。\n全トラックの LEN を1小節に合わせますか?\nOK=合わせる / キャンセル=LENはそのまま(ステップは消えません)');
 play.setMeter(m,fit);closeOv();updSeq();savePlay()}
function renderSeq(){
 const s=play.cs();let b='';
 for(let i=0;i<SD.STEPMAX;i++)b+=`<button class="sp" data-act="ssel" data-i="${i}" data-n="${i+1}"><b></b><i></i></button>`;
 PP.el.innerHTML=`<div class="prow"><span class="lb2">LEN</span><button class="pb" data-act="slen" data-d="-1">−</button><b id="slen"></b><button class="pb" data-act="slen" data-d="1">＋</button><button class="pb" data-act="pickscale" id="scb"></button><button class="pb" data-act="pickkey" id="keyb"></button><button class="pb" data-act="pickmeter" id="mtb"></button><button class="pb" data-act="metro" id="mtr">♪</button><button class="pb pri" data-act="pats">パターン</button><button class="pb" data-act="sclr">全消去</button></div><div class="sps" id="sps">${b}</div><div class="prow"><span class="lb2" id="sedl"></span><button class="pb" data-act="sf" data-k="on">ON</button><button class="pb" data-act="sf" data-k="acc">ACC</button><button class="pb" data-act="sf" data-k="sld">SLIDE</button><button class="pb" data-act="sf" data-k="tie">TIE</button><button class="pb" data-act="schord">和音</button><button class="pb" data-act="snudge" data-d="-1">♪▼</button><button class="pb" data-act="snudge" data-d="1">♪▲</button><span class="hint">鍵盤を押すと音程を入力→次へ</span></div>`+swingRow();
 PP.sps=[...PP.el.querySelectorAll('.sp')];updSeq();paintGoals();
}
function updSeq(){
 if(S.tab==='trk'){updTrk();return}
 if(S.tab!=='seq'||!PP.sps)return;
 const s=play.cs(),shown=mtShown(s.len);{const g=$('#sps');if(g)g.style.gridTemplateColumns=shown>16?'repeat(16,minmax(0,1fr))':''}mtBtn();
 PP.sps.forEach((e,i)=>{const st=s.steps[i];
  e.className='sp'+(st.on?' on':'')+(i>=s.len?' out':'')+(i===s.sel?' sel':'')+(i===S.cur?' cur':'')+mtCls(i);e.style.display=i<shown?'':'none';
  e.firstChild.textContent=st.on?stepLbl(st,true):'–';
  e.lastChild.textContent=[st.acc?'A':'',st.sld?'S':'',st.tie?'T':''].filter(Boolean).join(' ')});
 const st=s.steps[s.sel];
 $('#slen').textContent=s.len;$('#sedl').textContent='STEP '+(s.sel+1);
 $('#scb').textContent=SD.SCALE_NAMES.find(x=>x[0]===s.scale)[1];$('#keyb').textContent='KEY '+SD.KEYS[s.key];
 PP.el.querySelectorAll('[data-act=sf]').forEach(e=>e.classList.toggle('on',!!st[e.dataset.k]));PP.el.querySelectorAll('[data-act=schord]').forEach(e=>e.classList.toggle('on',!!st.ch));
}
function paintGoals(){
 document.querySelectorAll('[data-pid]').forEach(e=>{const g=PGS[e.dataset.pid]||{};
  e.classList.toggle('pfocus',!!g.focus);e.classList.toggle('pok',!!g.ok);
  e.querySelectorAll('button[data-v]').forEach(b=>b.classList.toggle('goal',g.goal!=null&&String(b.dataset.v)===String(g.goal)))})
}
function paintCur(){if(S.tab!=='seq'||!PP.sps)return;PP.sps.forEach((e,i)=>e.classList.toggle('cur',i===S.cur))}
play.cb.step=i=>{S.cur=i;paintCur();if(i<0){S.curG=-1;paintTCur();updRun()}};
play.cb.tstep=g=>{S.curG=g;paintTCur()};
function paintTCur(){if(S.tab!=='trk'||!PP.trs)return;PP.trs.forEach((row,k)=>{const x=play.tr[k];row.querySelectorAll('.sp').forEach((e,i)=>e.classList.toggle('cur',S.curG>=0&&play.running&&i===S.curG%x.len))})}
function openPats(){
 const L=ST.get('pats',[]);let h=`<div class="sh"><b>パターン(ベースライン)</b><button data-act="close">✕</button></div><div class="sb"><div class="sub">音色・テンポとセットで8個まで保存。呼び出すと音色も切り替わります。</div>`;
 for(let i=0;i<8;i++){const x=L[i];
  h+=`<div class="row"><div class="rt"><b>${i+1}. ${x?esc(x.name):'空き'}</b><span>${x?`${synName(x.synth)} ／ ${x.pat.steps.filter((q,k)=>k<x.pat.len&&q.on).length}音 ／ BPM ${x.bpm}`:''}</span></div><div class="rb">${x?`<button class="pri" data-act="patload" data-i="${i}">呼出</button>`:''}<button data-act="patsave" data-i="${i}">保存</button>${x?`<button data-act="patdel" data-i="${i}">削除</button>`:''}</div></div>`}
 ov(h+'</div>');
}
function loadPat(i){
 const x=ST.get('pats',[])[i];if(!x)return;
 closeOv();play.killAll();
 if(S.lesson&&!S.lesson.mode)exitLesson(true);
 if(x.synth!==S.synth&&SYN[x.synth])switchSynth(x.synth,true);
 applyPatch(x.patch);setOct(x.oct||0);ST.set(freeKey(S.synth),getPatch());
 play.setPattern(x.pat);play.setBpm(x.bpm||120);updBpm();updSeq();savePlay();toast('呼び出しました: '+x.name);
}

/* ---------- マルチトラック(TRK) ---------- */
function trkSelect(k,quiet){
 play.setTrackSel(k);const x=play.tr[play.ts],keep=S.tab==='trk';
 S.trkLoad=true;
 try{const fx={};SD.FXIDS.forEach(i=>fx[i]=syn.p[i]);if(x.synth!==S.synth)switchSynth(x.synth,true);applyPatch0(Object.assign({},x.patch||{},fx))}finally{S.trkLoad=false}
 if(keep&&S.tab!=='trk')showTab('trk');else updTrk();
 if(!quiet&&!S.lesson)toast(x.name+'(音色: '+synName(x.synth)+')');
}
function trkCommit(){
 if(S.mode!=='trk'||S.lesson)return;
 const k=play.ts,x=play.tr[k],pt=getPatch();SD.FXIDS.forEach(i=>delete pt[i]);
 x.synth=S.synth;x.patch=pt;trkResync(k);savePlay();updTrk();
}
function renderTrk(){
 let rows='';
 play.tr.forEach((x,k)=>{let b='';for(let i=0;i<SD.STEPMAX;i++)b+=`<button class="sp" data-act="tstep" data-t="${k}" data-i="${i}"><b></b><i></i></button>`;
  rows+=`<div class="trw" data-t="${k}"><button class="tn" data-act="tsel" data-t="${k}"></button><button class="tm" data-act="tmute" data-t="${k}">M</button><button class="ts" data-act="tsolo" data-t="${k}">S</button><div class="tsp">${b}</div></div>`});
 PP.el.innerHTML=`<div class="prow"><span class="lb2">LEN</span><button class="pb" data-act="slen" data-d="-1">−</button><b id="slen"></b><button class="pb" data-act="slen" data-d="1">＋</button><button class="pb" data-act="pickscale" id="scb"></button><button class="pb" data-act="pickkey" id="keyb"></button><button class="pb" data-act="pickmeter" id="mtb"></button><button class="pb" data-act="metro" id="mtr">♪</button><button class="pb pri" data-act="tkit">ドラム例</button><button class="pb pri" data-act="kits">セット</button><button class="pb" data-act="tname">名前</button><button class="pb" data-act="sclr">全消去</button></div><div class="trk">${rows}</div><div class="prow"><span class="lb2" id="sedl"></span><button class="pb" data-act="sf" data-k="on">ON</button><button class="pb" data-act="sf" data-k="acc">ACC</button><button class="pb" data-act="sf" data-k="sld">SLIDE</button><button class="pb" data-act="sf" data-k="tie">TIE</button><button class="pb" data-act="schord">和音</button><button class="pb" data-act="snudge" data-d="-1">♪▼</button><button class="pb" data-act="snudge" data-d="1">♪▲</button><span class="hint">行を選び、ステップをタップ→鍵盤で音程。音色は各タブで編集</span><b id="tload" class="hint"></b></div>`+swingRow();
 PP.sps=null;PP.trs=[...PP.el.querySelectorAll('.trw')];updTrk();paintGoals();
}
function updTrk(){
 if(S.tab!=='trk'||!PP.trs)return;
 const sel=play.ts,shown=mtShown(Math.max.apply(null,play.tr.map(x=>x.len))),AB={analog:'AN',wt:'WT',mod:'MOD',fm:'FM',add:'ADD',gr:'GR',smp:'SMP'};
 PP.trs.forEach((row,k)=>{const x=play.tr[k];
  row.classList.toggle('sel',k===sel);row.classList.toggle('dim',!play.audible(x));row.querySelector('.tsp').style.gridTemplateColumns='repeat('+shown+',minmax(0,1fr))';
  row.querySelector('.tn').innerHTML=`${esc(x.name)}<small>${AB[x.synth]}</small>`;
  row.querySelector('.tm').classList.toggle('on',x.mute);row.querySelector('.ts').classList.toggle('on',x.solo);
  row.querySelectorAll('.sp').forEach((e,i)=>{const st=x.steps[i];
   e.className='sp'+(st.on?' on':'')+(i>=x.len?' out':'')+(k===sel&&i===x.sel?' sel':'')+(play.running&&S.curG>=0&&i===S.curG%x.len?' cur':'')+mtCls(i)+(i>=shown?' hid':'');
   e.firstChild.textContent=st.on?stepLbl(st)+(st.acc?'!':'')+(st.sld?'~':'')+(st.tie?'_':''):'·'})});
 const s=play.cs(),st=s.steps[s.sel];
 $('#slen').textContent=s.len;$('#sedl').textContent=play.tr[sel].name+' '+(s.sel+1);{const n=play.tr.filter(x=>play.audible(x)&&x.steps.some(q=>q.on)).length,e=$('#tload');if(e){e.textContent=(n>=5||SD.bus.loadHigh)?'負荷:高':'';e.style.color='#e8a33d'}}
 $('#scb').textContent=SD.SCALE_NAMES.find(x=>x[0]===s.scale)[1];$('#keyb').textContent='KEY '+SD.KEYS[s.key];
 PP.el.querySelectorAll('[data-act=sf]').forEach(e=>e.classList.toggle('on',!!st[e.dataset.k]));PP.el.querySelectorAll('[data-act=schord]').forEach(e=>e.classList.toggle('on',!!st.ch));
}
/* ドラム例: 既存のファクトリー音色+v5.1のドラム音色を6トラックに割り当てる */
function kitTrack(id,idx,o){const dr=SD.DRUMBY[id]||SD.VOICEBY[id],l=dr?{synth:dr.synth||'analog',demo:{n:[dr.n]}}:LBY[id],r=dr?Object.assign({},SD.defs[l.synth].DEF,dr.p):refOf(l),pt={};
  SD.defs[l.synth].P.filter(p=>p.tab!=='top'&&SD.FXIDS.indexOf(p.id)<0).forEach(p=>{pt[p.id]=r[p.id]});Object.assign(pt,(o&&o.p)||{});
  const d=l.demo&&l.demo.n&&l.demo.n[0];o=o||{};const n=(Array.isArray(d)?d[0]:(d||48))+(o.tr|0);
  const steps=Array.from({length:16},()=>({on:false,n:n,acc:false,sld:false,tie:false}));
  Object.keys(idx).forEach(i=>{steps[i]={on:true,n:n+idx[i],acc:!!(o.acc||[]).includes(+i),sld:!!(o.sld||[]).includes(+i),tie:!!(o.tie||[]).includes(+i)}});
  /* v5.2: o.cd={ステップ:{t:和音の種類,i:転回}} でそのステップを和音にする(根音は n+idx) */
  Object.keys(o.cd||{}).forEach(i=>{const st=steps[i];if(!st)return;const c=o.cd[i],ch=SD.chordNotes(st.n,c.t,c.i|0);if(ch.length>1){st.ch=ch;st.cd={t:c.t,i:c.i|0}}});
  return {name:o.name,synth:l.synth,patch:pt,mix:SD.withOut(o.mix&&o.mx?Object.assign({},SD.mxToMix(o.mx),o.mix):(o.mix||(o.mx?SD.mxToMix(o.mx):null)),o.out),len:Math.max(1,Math.min(16,o.len|0||16)),scale:o.scale||'chrom',key:o.scale==='minor'?((n%12)+12)%12:0,mute:false,solo:false,steps};
}
function trkKit(){
 const mk=kitTrack;
 const z=a=>{const q={};a.forEach(i=>q[i]=0);return q};
 const tr=[mk('kick',z([0,4,8,12]),{name:'キック'}),mk('snare',z([4,12]),{name:'スネア'}),mk('hat',z([0,2,4,6,8,10,12,14]),{name:'ハット',acc:[2,6,10,14]}),
  mk('bass',{0:0,3:0,6:3,8:0,10:7,12:5,14:3},{name:'ベース',scale:'minor',sld:[10]}),mk('clap',z([4,12]),{name:'クラップ'}),mk('ohat',z([6,14]),{name:'Oハット'})];
 play.stop();play.setTracks(tr,0);play.setBpm(110);trkReset();trkSelect(0,true);updBpm();savePlay();toast('ドラム例を入れました。▶で再生');
}
function openKits(){
 const L=ST.get('kits',[]);let h=`<div class="sh"><b>トラックセット</b><button data-act="close">✕</button></div><div class="sb"><div class="sub">6トラックの音色・パターン・テンポをまとめて8個まで保存(旧4トラックのセットも読めます)。</div>`;
 for(let i=0;i<8;i++){const x=L[i];
  h+=`<div class="row"><div class="rt"><b>${i+1}. ${x?esc(x.name):'空き'}</b><span>${x?`${x.tr.filter(t=>t&&t.steps.some(q=>q.on)).length}トラック ／ BPM ${x.bpm}`:''}</span></div><div class="rb">${x?`<button class="pri" data-act="kitload" data-i="${i}">呼出</button>`:''}<button data-act="kitsave" data-i="${i}">保存</button>${x?`<button data-act="kitdel" data-i="${i}">削除</button>`:''}</div></div>`}
 ov(h+'</div>');
}
/* ---------- ウェーブテーブルの自作(倍音エディタ) ---------- */
const HM={t:'a',cv:null,pv:null,last:-1};
const hAmp2h=a=>Math.sqrt(a),hH2amp=h=>h*h;
function showHarm(){
 S.tab='harm';const g=$('#grid');g.style.setProperty('--c',1);g.style.setProperty('--r',1);
 while(g.firstChild)g.removeChild(g.firstChild);
 const r=E('div','hm',`<canvas class="hb"></canvas><div class="hc"><div class="hseg"><button data-act="hmab" data-k="a">A 始点</button><button data-act="hmab" data-k="b">B 終点</button></div><canvas class="hp"></canvas><div class="hpre">${[['saw','ノコギリ'],['sq','矩形'],['tri','三角'],['sine','サイン'],['rand','ランダム'],['ab','A→Bへ複製']].map(x=>`<button data-act="hmpre" data-v="${x[0]}">${x[1]}</button>`).join('')}</div></div>`);
 g.appendChild(r);HM.cv=r.querySelector('.hb');HM.pv=r.querySelector('.hp');
 const cv=HM.cv;
 const at=e=>{const b=cv.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;return [Math.max(0,Math.min(31,Math.floor(x*32))),Math.max(0,Math.min(1,1-y))]};
 const put=e=>{const q=at(e),arr=syn.user[HM.t];let i0=HM.last<0?q[0]:HM.last,i1=q[0],st=i0<=i1?1:-1;
  for(let i=i0;i!==i1+st;i+=st)arr[i]=hH2amp(q[1]);HM.last=i1;harmEdit()};
 cv.addEventListener('pointerdown',e=>{cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);HM.last=-1;put(e);e.preventDefault()});
 cv.addEventListener('pointermove',e=>{if(HM.last>=0)put(e)});
 ['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>{HM.last=-1;saveFree()}));
 harmPaint();
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.id==='harm'));
}
function harmEdit(){
 if(syn.p.wTable!=='user')setP('wTable','user');
 syn.setUser(syn.user);vizDirty=true;harmPaint();
}
function harmPaint(){
 if(S.synth!=='wt'||S.tab!=='harm')return;
 document.querySelectorAll('[data-act=hmab]').forEach(b=>b.classList.toggle('on',b.dataset.k===HM.t));
 let o=cvPrep(HM.cv);
 if(o){const {g,w,h,d}=o,u=syn.user[HM.t],bw=w/32,cs=getComputedStyle(document.documentElement),ac=cs.getPropertyValue('--ac')||'#f2c14e',ln=cs.getPropertyValue('--ln')||'#456',dim=cs.getPropertyValue('--dim')||'#99a';
  g.strokeStyle=ln;g.lineWidth=1;g.beginPath();[.25,.5,.75].forEach(f=>{g.moveTo(0,h*f);g.lineTo(w,h*f)});g.stroke();
  for(let i=0;i<32;i++){const bh=hAmp2h(u[i])*h*.9;g.fillStyle=i===0?'#fff':ac;g.globalAlpha=u[i]>0?.95:.25;g.fillRect(i*bw+bw*.12,h-Math.max(bh,2*d),bw*.76,Math.max(bh,2*d))}
  g.globalAlpha=1;g.fillStyle=dim;g.font=(9*d)+'px sans-serif';[1,8,16,24,32].forEach(k=>g.fillText(k,(k-1)*bw+bw*.15,h*.99-0))}
 o=cvPrep(HM.pv);
 if(o){const {g,w,h,d}=o,wp=syn.p.wPos,fr=[[syn.user.a,'#8aa'],[null,'#fff'],[syn.user.b,'#8aa']],n=128;
  const draw=(x,col,lw)=>{const f=SD.WTD.userFrame(syn.user,x,n);g.strokeStyle=col;g.lineWidth=lw*d;g.beginPath();for(let i=0;i<n;i++){const X=i/(n-1)*w,Y=h/2-f[i]*h*.42;i?g.lineTo(X,Y):g.moveTo(X,Y)}g.stroke()};
  g.globalAlpha=.45;draw(0,'#8fb',1);draw(1,'#fb8',1);g.globalAlpha=1;draw(wp,'#fff',1.6)}
}
/* ---------- モジュラーのラック ---------- */
const RK={el:null,pend:null,selc:null},KC={audio:'#f2c14e',cv:'#5fb4ff',gate:'#ff7ab8'},NS='http://www.w3.org/2000/svg';
const curStep=()=>S.lesson&&!S.fin?S.lesson.steps[S.step]:null;
function showRack(){
 S.tab='rack';const g=$('#grid');g.style.setProperty('--c',1);g.style.setProperty('--r',1);
 while(g.firstChild)g.removeChild(g.firstChild);
 const r=E('div','rack');g.appendChild(r);RK.el=r;renderRack();
 document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.id==='rack'));
}
/* SEQUENCERの専用カード: 8ステップの縦列(▲音程▼・ON/OFF)+LENGTH/OCTのつまみ */
function mkStepNote(p){
 const c=E('div','cell sqn');c.dataset.id=p.id;c.innerHTML='<button class="sqb u">▲</button><div class="vl"></div><i class="gt"></i><button class="sqb d">▼</button>';
 const vl=c.querySelector('.vl'),gt=c.querySelector('.gt'),mv=d=>e=>{e.preventDefault();setP(p.id,SD.clamp(p,Math.round(syn.p[p.id])+d),true)};
 c.querySelector('.u').addEventListener('click',mv(1));c.querySelector('.d').addEventListener('click',mv(-1));
 return {el:c,set(v){vl.textContent=SD.fmt(p,v)},goal(g){gt.textContent=g==null?'':'→'+SD.fmt(p,g);c.classList.toggle('hasgoal',g!=null)},focus(b){c.classList.toggle('focus',b)},ok(b){c.classList.toggle('ok',b)}};
}
function mkStepOn(p){
 const c=E('button','cell sqo');c.dataset.id=p.id;c.addEventListener('click',()=>setP(p.id,syn.p[p.id]==='on'?'off':'on',true));
 return {el:c,set(v){c.classList.toggle('on',v==='on');c.textContent=v==='on'?'●':'－'},goal(g){c.classList.toggle('goal',g!=null);c.dataset.g=g==null?'':g},focus(b){c.classList.toggle('focus',b)},ok(b){c.classList.toggle('ok',b)}};
}
function sqBody(m){
 const b=E('div','sqbody'),rw=E('div','sqr');
 for(let i=1;i<=8;i++){const col=E('div','sqc'),n=ui[m.id+'.n'+i],o=ui[m.id+'.o'+i];col.dataset.i=i-1;col.appendChild(E('div','sqi',String(i)));
  n.set(syn.p[m.id+'.n'+i]);o.set(syn.p[m.id+'.o'+i]);col.appendChild(n.el);col.appendChild(o.el);rw.appendChild(col)}
 const kb=E('div','sqk');['len','oct'].forEach(k=>{const u=ui[m.id+'.'+k];u.set(syn.p[m.id+'.'+k]);kb.appendChild(u.el)});
 b.appendChild(rw);b.appendChild(kb);return b;
}
function sqPaint(){
 if(S.synth!=='mod'||S.tab!=='rack'||!RK.el)return;
 RK.el.querySelectorAll('.mc.t-seqm').forEach(c=>{const id=c.dataset.mid,n=syn.nodes&&syn.nodes[id],pos=n&&n.pos!==undefined?n.pos:-1,len=(syn.p[id+'.len']|0)||8;
  c.querySelectorAll('.sqc').forEach(col=>{const i=+col.dataset.i;col.classList.toggle('cur',i===pos);col.classList.toggle('off',i>=len)})})
}
function renderRack(){
 if(S.synth!=='mod'||S.tab!=='rack'||!RK.el)return;
 const ML=SD.modLib,st=syn.st(),sl=RK.el.scrollLeft,sy=RK.el.scrollTop,inn=E('div','rkin');
 st.mods.forEach(m=>{
  const M=SD.MODS[m.t],c=E('div','mc t-'+m.t),h=E('div','mh',ML.title(m.id));c.dataset.mid=m.id;
  let lp=0;h.addEventListener('pointerdown',()=>{clearTimeout(lp);lp=setTimeout(()=>{if(confirm(ML.title(m.id)+' を削除しますか?(つないだケーブルも消えます)')){syn.removeMod(m.id);RK.pend=RK.selc=null;renderRack();saveFree();checkGoals()}},650)});
  ['pointerup','pointercancel','pointerleave'].forEach(t=>h.addEventListener(t,()=>clearTimeout(lp)));
  c.appendChild(h);
  if(m.t==='seqm')c.appendChild(sqBody(m));
  else if(M.knobs.length){const kb=E('div','mk'),nk=M.knobs.filter(k=>k.type!=='seg').length;kb.style.setProperty('--cols',Math.max(2,Math.min(4,nk)));
   M.knobs.forEach(k=>{const id=m.id+'.'+k.k,u=ui[id];u.set(syn.p[id]);kb.appendChild(u.el)});c.appendChild(kb)}
  const jk=(p,d)=>`<button class="jk ${d} k-${p.kind}" data-act="jack" data-p="${m.id}.${p.k}"><i></i><span>${p.label}</span></button>`;
  c.appendChild(E('div','mj',`<div>${M.i.map(p=>jk(p,'in')).join('')}</div><div>${M.o.map(p=>jk(p,'out')).join('')}</div>`));
  inn.appendChild(c)});
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('class','rkcb');inn.appendChild(svg);
 RK.el.textContent='';RK.el.appendChild(inn);RK.el.scrollLeft=sl;RK.el.scrollTop=sy;markJacks();
}
function jackXY(inn,id){const j=inn.querySelector(`.jk[data-p="${id}"] i`);if(!j)return null;const r=j.getBoundingClientRect(),b=inn.getBoundingClientRect();return [r.left-b.left+r.width/2,r.top-b.top+r.height/2]}
function drawCables(){
 const inn=RK.el&&RK.el.firstChild;if(!inn)return;const svg=inn.querySelector('.rkcb');if(!svg)return;
 const ML=SD.modLib,st=syn.st(),s=curStep();let h='';
 const path=(a,b)=>{const p=jackXY(inn,a),q=jackXY(inn,b);if(!p||!q)return null;const dy=Math.max(26,Math.abs(q[0]-p[0])*.2)+16;
  return {d:`M${p[0]} ${p[1]}C${p[0]} ${p[1]+dy},${q[0]} ${q[1]+dy},${q[0]} ${q[1]}`,mx:(p[0]+q[0])/2,my:(p[1]+q[1])/2+.75*dy}};
 st.cab.forEach(c=>{const o=path(c[0],c[1]);if(!o)return;const col=KC[ML.outKind(st,c[0])],sel=RK.selc===c[0]+'|'+c[1];
  h+=`<path class="cb${sel?' sel':''}" d="${o.d}" stroke="${col}"/><circle class="cm${sel?' sel':''}" style="color:${col}" cx="${o.mx}" cy="${o.my}" r="9" data-act="selcab" data-a="${c[0]}" data-b="${c[1]}"/>`});
 if(s)(s.k||[]).forEach(([a,b])=>{if(syn.has(a,b))return;const o=path(a,b);if(o)h+=`<path class="cb gh" d="${o.d}"/>`});
 svg.innerHTML=h;
}
function markJacks(){
 if(S.synth!=='mod'||!RK.el||!RK.el.firstChild)return;
 const ML=SD.modLib,st=syn.st(),s=curStep(),want=new Set(),pd=RK.pend;
 if(s)(s.k||[]).forEach(([a,b])=>{if(!syn.has(a,b)){want.add(a);want.add(b)}});
 RK.el.querySelectorAll('.jk').forEach(j=>{const p=j.dataset.p,out=j.classList.contains('out');
  j.classList.toggle('foc',want.has(p));j.classList.toggle('pend',!!pd&&pd.p===p);
  j.classList.toggle('cand',!!pd&&pd.dir!==(out?'o':'i')&&(pd.dir==='o'?ML.canConnect(st,pd.p,p):ML.canConnect(st,p,pd.p)).ok);
  j.classList.toggle('conn',st.cab.some(c=>c[0]===p||c[1]===p))});
 const d=$('#delcb');if(d)d.disabled=!RK.selc;
 drawCables();
}
function jackTap(p,dir){
 const pd=RK.pend;RK.selc=null;
 if(!pd||pd.dir===dir){RK.pend=pd&&pd.p===p?null:{p,dir};markJacks();return}
 const a=dir==='i'?pd.p:p,b=dir==='i'?p:pd.p;RK.pend=null;
 const r=syn.connect(a,b);
 if(!r.ok){toast(r.msg);markJacks();return}
 renderRack();saveFree();checkGoals();
}
function openAddMod(){
 const ML=SD.modLib;
 ov(`<div class="sh"><b>モジュールを追加</b><button data-act="close">✕</button></div><div class="sb">${ML.ORDER.map(t=>`<div class="row"><div class="rt"><b>${SD.MODS[t].name}</b><span>${SD.MODS[t].desc}</span></div><div class="rb"><button class="pri" data-act="pickmod" data-t="${t}">追加</button></div></div>`).join('')}<div class="sub">${syn.mods.length} / ${ML.MAXM} 個</div></div>`);
}
window.addEventListener('resize',()=>{if(S.synth==='mod'&&S.tab==='rack')markJacks()});

/* ---------- boot ---------- */
function boot(){
 SYN.fm.onSteal=showVoice;SYN.add.onSteal=showVoice;SYN.add.onVl=n=>{if(n<4)toast('倍音が多いので、同時発音を'+n+'音までに制限しました')};
 if(!SYN[S.synth])S.synth='analog';
 syn=SYN[S.synth];
 Object.keys(SD.defs).forEach(sy=>{const u=UIS[sy]={};ui=u;
  SD.defs[sy].P.forEach(p=>{if(p.id==='master'){if(!UIM.o)UIM.o=mkKnob(p,true);u.master=UIM.o;return}u[p.id]=p.type==='seg'?mkSeg(p):mkKnob(p,p.tab==='top')});
  u.v_fcurve=mkViz('fcurve');u.v_env=mkViz('env');u.v_wave=mkViz('wave');u.v_water=mkViz('water');u.v_penv=mkViz('penv');u.v_gwave=mkViz('gwave');u.v_gwave2=mkViz('gwave');u.v_gwin=mkViz('gwin');u.v_swave=mkViz('swave');u.v_swpick=mkViz('swpick');u.v_algo=mkViz('algo');u.v_spec=mkViz('spec');u.v_dec=mkViz('dec');u.v_lay=mkViz('lay');u.v_mix=mkViz('mix');for(let k=1;k<=4;k++)u['v_op'+k]=mkViz('op'+k)});
 UIS.mod=new Proxy(UIS.mod,{get(t,k){if(!(k in t)&&typeof k==='string'&&k.indexOf('.')>0){const p=SD.defs.mod.byId[k];if(p)t[k]=/^seqm\d+\.n[1-8]$/.test(k)?mkStepNote(p):/^seqm\d+\.o[1-8]$/.test(k)?mkStepOn(p):p.type==='seg'?mkSeg(p):mkKnob(p,false)}return t[k]}});
 ui=UIS[S.synth];
 Object.keys(SD.PLAYP).forEach(id=>{PGS[id]={};UIP[id]={set(){},focus(b){PGS[id].focus=b;paintGoals()},ok(b){PGS[id].ok=b;paintGoals()},goal(g){PGS[id].goal=g;paintGoals()}}});
 setFz(CFG.fz);setFine(CFG.fine);
 play.setState(ST.get('play',null));syncMix();updBpm();
 $('#vol').appendChild(UIM.o.el);UIM.el=1;
 buildTabs();$('#synb').textContent=synName(S.synth);
 buildKbd();SD.Midi.on=midiMsg;SD.Midi.state=midiState;applyKb();
 if(window.ResizeObserver)new ResizeObserver(fitGrid).observe($('#grid'));else window.addEventListener('resize',fitGrid);

 applyPatch(ST.get(freeKey(S.synth),{}));
 setP('master',ST.get('master',.7),false,true);
 showTab(firstTab());setOct(S.oct);renderCoach();
 document.addEventListener('click',e=>{
  if(e.target.id==='ov'){closeOv();return}
  const b=e.target.closest('[data-act]');if(b)act(b.dataset.act,b);
 });
document.addEventListener('input',e=>{const t=e.target;if(t.id==='gq'){$('#gl').innerHTML=glRows(t.value);return}
  if(t.id==='gate'){play.a.gate=t.value/100;$('#gatev').textContent=t.value+'%';savePlay()}
  else if(t.id==='swing'){play.setSwing(t.value/100);$('#swingv').textContent=t.value+'%';savePlay()}});
 $('#bpml').addEventListener('click',()=>askText('BPM(40〜240)',String(play.bpm),v=>{const n=parseFloat(v);if(isNaN(n)){toast('数字を入力してください');return}play.setBpm(n);updBpm();savePlay();closeOv()}));
 document.addEventListener('keydown',e=>{if(e.key!=='Enter')return;if(S.ask)act('nok');else if(S.askCb)act('tok')});
 $('#scope').addEventListener('click',()=>{S.scope=S.scope==='spec'?'wave':'spec'});
 $('#start').addEventListener('click',()=>{syn.init();chkUnsup();$('#start').classList.add('off');SD.Midi.start();
  try{const sb=window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.StatusBar;if(sb)sb.hide()}catch(_){}},{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){play.stop();play.notes=[];play.fing.clear();updRun();relAll();stopDemo()}else if(syn.ctx&&syn.ctx.state!=='running')syn.ctx.resume()});
 document.addEventListener('contextmenu',e=>e.preventDefault());
 drawScope();
 if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&location.hostname!=='localhost')navigator.serviceWorker.register('sw.js').catch(()=>{});
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='mvf'){const f=e.target.files&&e.target.files[0];e.target.value='';matImport(f)}});
SD.UMAT.init();SD.UMAT.onchange(()=>{vizDirty=true;if(S.lesson)checkGoals()});
SD._test={MM,mmMap,mmApply,mmLive,MIDI_REL_MS,LBY,mtTick:()=>0,oct:()=>S.oct,midiMsg,applyKb,kbSmall,CFG,MD,checkGoals,auView,exitLesson,chkUnsup,showVoice,setP,trkCommit,teng,trkSelect,syn:()=>syn,stateAt,stateUpTo,refOf,isMet,switchSynth,setMode,play,runToggle,start:startLesson,next:nextStep};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
