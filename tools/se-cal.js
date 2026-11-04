/* SEコースの cmp.g(音量補正)を推定して出す(SD.SE_CAL に載せた「EQだけが違う聞き比べ」のみ。場面どうしの比較は音量差が学習内容なので対象外)。出力を www/js/se.js の GT に貼る。使い方: node tools/se-cal.js */
const {loadSD,stepLevels}=require('../test/eqest.js'),SD=loadSD(),out={};
(SD.SE_CAL||[]).forEach(k=>{const [id,s]=k.split(':'),L=SD.LESSONS.find(l=>l.id===id),lv=stepLevels(L,L.steps[s-1]);if(!lv.length||lv.some(x=>x==null))return;const m=Math.min(...lv);lv.forEach((x,i)=>{out[id+'s'+s+(i+1)]=Math.max(-24,+(m-x).toFixed(1))})});
console.log('var GT='+JSON.stringify(out).replace(/"/g,"'")+';');
