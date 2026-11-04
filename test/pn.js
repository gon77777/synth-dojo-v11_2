/* PNコース(v7.8a〜)のテスト: node test/pn.js
   ①PANの係数(StereoPanner・2ch入力)を実測と照合(node-web-audio-api があれば)②聞き比べの音量差が1dB以内(推定。要描画)③tPan を使う目標・聞き比べの定義 */
const E=require('./pnest.js');let fail=0;const ng=m=>{console.log('NG:',m);fail++};
const SD=E.loadSD(),L=SD.LESSONS.filter(l=>l.course==='PN');
if(L.length<3)ng('PNレッスンが足りない');
/* ③定義 */
L.forEach(l=>{if(l.mode!=='trk')ng(l.id+' trk ではない');
 l.steps.forEach((s,i)=>{const w=l.id+' step'+(i+1)+': ';
  (s.mx||[]).forEach(g=>{if(g.ins==='mix'&&g.k==='tPan'&&!(g.rng[0]>=-1&&g.rng[1]<=1))ng(w+'tPan の rng 範囲外');if(g.ins==='mix'&&['tPan','tVol','tRvb','tDly'].indexOf(g.k)<0)ng(w+'mix の k が想定外')});
  (s.cmp||[]).forEach((c,j)=>{if(!c.tm)return;const pans=Object.keys(c.tm||{}).map(t=>c.tm[t].tPan).filter(v=>v!==undefined);if(pans.length!==l.tk.length||pans.some(v=>!(v>=-1&&v<=1)))ng(w+'cmp'+(j+1)+' の tPan が不正');
   if(Object.keys(c.tm).length!==l.tk.length)ng(w+'cmp'+(j+1)+' は全トラックを書く')})})});
/* mx の目標が、tk の初期値のままでは達成済みでない(初期値と範囲が重ならない)ことは強制しないが、範囲が空でないこと */
(async()=>{
 if(!E.hasRender){console.log('(node-web-audio-api が無いので ①② は省略)');end();return}
 /* ①実測 */
 const{OfflineAudioContext}=require('node-web-audio-api');
 for(const p of [-1,-.5,0,.5,1]){const c=new OfflineAudioContext(2,44100,44100),o=c.createOscillator();o.frequency.value=440;
  const g=c.createGain();g.channelCount=2;g.channelCountMode='explicit';const pn=c.createStereoPanner();pn.pan.value=p;o.connect(g);g.connect(pn);pn.connect(c.destination);o.start();
  const b=await c.startRendering(),r=ch=>{const d=b.getChannelData(ch);let s=0;for(const v of d)s+=v*v;return Math.sqrt(s/d.length)},m=E.panGain(p),ref=r(0)/Math.max(m.L,1e-9);
  const dl=p===1?0:20*Math.log10(r(0)/(0.7071*m.L)),dr=p===-1?0:20*Math.log10(r(1)/(0.7071*m.R));
  if(Math.abs(dl)>.2||Math.abs(dr)>.2)ng('PAN係数が実測と合わない pan='+p+' '+dl.toFixed(2)+' '+dr.toFixed(2))}
 /* 中央=両側同じ・端=片側+6dB(中央比)・合計+3dB */
 const c0=E.panGain(0),e1=E.panGain(1);if(Math.abs(20*Math.log10(e1.R/c0.R)-6.02)>.05)ng('端の片側は中央比 +6dB');
 if(Math.abs(10*Math.log10((e1.L**2+e1.R**2)/(c0.L**2+c0.R**2))-3.01)>.05)ng('端の合計は中央比 +3dB');
 /* ②音量差 */
 for(const l of L)for(let si=0;si<l.steps.length;si++){const st=l.steps[si];if(!st.cmp)continue;const lv=await E.levels(SD,l,st);
  if(lv.some(x=>x==null))continue;const v=lv.map((x,i)=>x+(st.cmp[i].g||0)),d=Math.max(...v)-Math.min(...v);
  if(d>1)ng(l.id+' step'+(si+1)+' 聞き比べの音量差 '+d.toFixed(2)+'dB')}
 end()})();
function end(){console.log(fail?'失敗 '+fail+'件':'OK: PN '+L.length+'本');process.exit(fail?1:0)}
