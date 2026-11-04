/* MXコースの cmp.g(音量補正)を推定して表で出す(EQだけが違う聞き比べのみ)。出力を www/js/mx.js の GT2 に貼る。使い方: node tools/mx-cal.js */
const {loadSD,stepLevels}=require('../test/eqest.js'),{eqOnly}=require('../test/mxcal.js'),SD=loadSD(),out={};
SD.LESSONS.filter(l=>l.course==='MX').forEach(L=>L.steps.forEach((st,si)=>{if(!eqOnly(st))return;const lv=stepLevels(L,st);if(!lv.length||lv.some(x=>x==null))return;const m=Math.min(...lv);
 lv.forEach((x,i)=>{out[L.id+'s'+(si+1)+(i+1)]=Math.max(-24,+(m-x).toFixed(1))})}));
console.log('var GT2='+JSON.stringify(out).replace(/"/g,"'")+';');
