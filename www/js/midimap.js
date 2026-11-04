/* MIDI CC の割り当て表(MIDI learn)。DOM非依存の純粋関数だけ(test/midi.js が検査)。
   表: {v:1, pick:'jump'|'pickup', map:[{c:CC番号(0〜127), ch:null(オムニ)|0〜15, trk:トラック番号|'M'(マスターFX), id:つまみID}]}
   ・1つのCCは1つの対象に、1つの対象は1つのCCに(同じCCを学習し直すと付け替え)
   ・予約CC(64=サステイン / 120・123=全消音)は割り当てない
   ・対象が今の画面・音源に存在するかは、使うとき(app.js の autoDef)に判定する。ここでは「どの音源にも無いID」を捨てるだけ */
(function(){
const SD=window.SD=window.SD||{};
const RESERVED=[64,120,123];
const isTrk=t=>t==='M'||(Number.isInteger(t)&&t>=0&&t<64);
const clone=m=>({v:1,pick:m.pick==='pickup'?'pickup':'jump',map:m.map.map(e=>Object.assign({},e))});
const same=(a,b)=>a.trk===b.trk&&a.id===b.id;
/* CCの衝突: 同じ番号で、チャンネルが同じか、どちらかがオムニ */
const clash=(a,b)=>a.c===b.c&&(a.ch==null||b.ch==null||a.ch===b.ch);
const MM={
 RESERVED,
 empty(){return{v:1,pick:'jump',map:[]}},
 reserved(c){return RESERVED.indexOf(c)>=0},
 /* known(trk,id) が偽のものは捨てる(省略時は捨てない)。形が不正なもの・予約CC・衝突は捨てる(先に書いてあるものを残す) */
 clean(raw,known){
  const out=MM.empty();
  if(!raw||typeof raw!=='object')return out;
  if(raw.pick==='pickup')out.pick='pickup';
  (Array.isArray(raw.map)?raw.map:[]).forEach(e=>{
   if(!e||typeof e!=='object')return;
   const c=e.c,ch=e.ch==null?null:e.ch,trk=e.trk,id=e.id;
   if(!Number.isInteger(c)||c<0||c>127||MM.reserved(c))return;
   if(ch!==null&&!(Number.isInteger(ch)&&ch>=0&&ch<=15))return;
   if(!isTrk(trk)||typeof id!=='string'||!id||id.length>64)return;
   if(known&&!known(trk,id))return;
   const n={c,ch,trk,id};
   if(out.map.some(x=>clash(x,n)||same(x,n)))return;
   out.map.push(n);
  });
  return out;
 },
 /* 学習: 同じCC(衝突するもの)と同じ対象の古い割り当てを外してから足す。予約CC・不正は null */
 bind(m,c,ch,trk,id){
  if(!Number.isInteger(c)||c<0||c>127||MM.reserved(c))return null;
  if(!isTrk(trk)||typeof id!=='string'||!id)return null;
  const n={c,ch:ch==null?null:ch,trk,id},r=clone(m);
  r.map=r.map.filter(x=>!clash(x,n)&&!same(x,n));
  r.map.push(n);
  return r;
 },
 unbind(m,i){const r=clone(m);if(i>=0&&i<r.map.length)r.map.splice(i,1);return r},
 unbindTarget(m,trk,id){const r=clone(m);r.map=r.map.filter(x=>!(x.trk===trk&&x.id===id));return r},
 find(m,c,ch){if(!m||!m.map)return null;for(let i=0;i<m.map.length;i++){const e=m.map[i];if(e.c===c&&(e.ch==null||e.ch===ch))return e}return null},
 /* CCの値(0〜127)→つまみの実値。連続つまみ=v/127を曲線・範囲に当てる / 選択式(ON/OFFを含む)=選択肢を等分(v>=64でON) */
 toValue(p,v){
  v=Math.max(0,Math.min(127,v|0));
  if(p.type==='seg'){const n=p.opts.length,i=Math.min(n-1,Math.floor(v*n/128));return p.opts[i][0]}
  return SD.fromN(p,v/127);
 },
 /* ピックアップ: 状態 st={last:null,ok:false}。画面の値 cur(0〜1)とCCの値 n(0〜1)が重なる/またぐまで false を返す */
 pickup(st,cur,n){
  if(st.ok)return true;
  if(cur==null||Math.abs(n-cur)<=.03||(st.last!=null&&(st.last-cur)*(n-cur)<=0)){st.ok=true;st.last=n;return true}
  st.last=n;return false;
 }
};
SD.MidiMap=MM;
})();
