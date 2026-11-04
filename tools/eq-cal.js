/* EQコースの cmp.g(音量補正)を推定して表で出す。出力を www/js/eq.js の GT に貼る。使い方: node tools/eq-cal.js */
const {loadSD,stepLevels}=require('../test/eqest.js'),SD=loadSD(),out={};
SD.LESSONS.filter(l=>l.course==='EQ').forEach(L=>L.steps.forEach((st,si)=>{const lv=stepLevels(L,st);if(!lv.length||lv.some(x=>x==null))return;const m=Math.min(...lv);
 lv.forEach((x,i)=>{out[L.id+'s'+(si+1)+(i+1)]=Math.max(-24,+(m-x).toFixed(1))})}));
console.log('var GT='+JSON.stringify(out).replace(/"/g,"'")+';');
