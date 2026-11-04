/* CMコースの cmp.g(音量補正)をオフライン描画で測って表で出す。出力を www/js/cm.js の GT に貼る。使い方: node tools/cm-cal.js
   要 node-web-audio-api。--gr を付けると、mt目標・claim の GR の統計も出す(数値の調整用) */
const E=require('../test/cmest.js'),SD=E.loadSD(),out={},showGr=process.argv.includes('--gr');
const stat=a=>{const b=a.slice(Math.floor(a.length/3));return{mean:b.reduce((x,y)=>x+y,0)/b.length,min:Math.min(...b),max:Math.max(...b)}};
(async()=>{
 for(const L of SD.LESSONS.filter(l=>l.course==='CM')){
  for(let si=0;si<L.steps.length;si++){const st=L.steps[si],lv=await E.cmpLevels(SD,L,st);
   if(lv.length&&!lv.some(x=>x==null)){const m=Math.min(...lv);lv.forEach((x,i)=>{out[L.id+'s'+(si+1)+(i+1)]=Math.max(-24,+(m-x).toFixed(1))})}
   if(showGr&&(st.mt||[]).length){const state=E.stateAt(SD,L,si),r=await E.measure(SD,L,state);
    st.mt.forEach(g=>{const s=stat(r.gr[g.trk]||[0]);console.log(L.id+' step'+(si+1)+' mt gr '+JSON.stringify(g.rng)+' hold'+g.hold+' → state '+JSON.stringify(state[g.trk])+' GR mean '+s.mean.toFixed(1)+' ['+s.min.toFixed(1)+'〜'+s.max.toFixed(1)+'] 達成可能:'+E.mtReachable(SD,r.gr[g.trk]||[],g.rng,g.hold))})}}
  if(showGr)for(const q of L.claim||[]){const ov={};ov[q.trk]=Object.assign({iCpOn:1},q.cp),r=await E.measure(SD,L,ov),s=stat(r.gr[q.trk]);console.log(L.id+' claim '+JSON.stringify(q.rng)+' → GR mean '+s.mean.toFixed(1)+' ['+s.min.toFixed(1)+'〜'+s.max.toFixed(1)+']')}}
 if(!showGr)console.log('var GT='+JSON.stringify(out).replace(/"/g,"'")+';');
})();
