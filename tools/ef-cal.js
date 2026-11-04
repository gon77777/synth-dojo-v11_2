/* EFコースの cmp.g(音量補正)をオフライン描画で測って表で出す。出力を www/js/ef.js の GT に貼る。使い方: node tools/ef-cal.js  要 node-web-audio-api */
const E=require('../test/efest.js'),SD=E.loadSD(),out={};
(async()=>{
 for(const L of SD.LESSONS.filter(l=>l.course==='EF')){
  for(let si=0;si<L.steps.length;si++){const st=L.steps[si],lv=await E.levels(SD,L,st);
   if(lv.length&&!lv.some(x=>x==null)){const m=Math.min(...lv);lv.forEach((x,i)=>{out[L.id+'s'+(si+1)+(i+1)]=Math.max(-24,+(m-x).toFixed(1))});
    if(process.argv.includes('-v'))console.log(L.id,'step'+(si+1),lv.map(x=>x.toFixed(1)).join(' '))}}}
 if(!process.argv.includes('-v'))console.log('var GT='+JSON.stringify(out).replace(/"/g,"'")+';');
})();
