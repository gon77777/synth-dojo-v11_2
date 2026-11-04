/* au10(EQのオートメーション)の cmp.g(音量補正)を、オフライン描画で測って表で出す。
   使い方: node tools/au-eq-cal.js            … 表(GT_AU)を標準出力へ
           node tools/au-eq-cal.js --detail   … 各案のレベルと、1小節ごとのパワー(dB)も出す
           node tools/au-eq-cal.js --write    … www/js/aulessons.js の「AU-EQ-GT」の区間へ書き込む
   要 node-web-audio-api(npm i --no-save node-web-audio-api@2.2.0)。いちばん小さい案に揃える(CMコース・EQコースと同じ流儀) */
const fs=require('fs'),path=require('path'),E=require('../test/aueqest.js');
const detail=process.argv.includes('--detail'),write=process.argv.includes('--write');
if(!E.hasRender){console.error('node-web-audio-api が無い');process.exit(1)}
const SD=E.loadSD(),out={};
(async()=>{
 for(const L of SD.LESSONS.filter(l=>l.cat==='au10')){
  for(let si=0;si<L.steps.length;si++){const st=L.steps[si];if(!st.cmp||st.cmp.length<2)continue;
   const r=await E.stepLevelsAu(SD,L,st),m=Math.min(...r.map(x=>x.db));
   r.forEach((x,i)=>{out[L.id+'s'+(si+1)+(i+1)]=Math.max(-24,+(m-x.db).toFixed(1))});
   if(detail){console.log(L.id+' step'+(si+1));st.cmp.forEach((c,i)=>console.log('  '+c.l+': '+r[i].db.toFixed(1)+'dB  g='+out[L.id+'s'+(si+1)+(i+1)]+'  小節別 '+r[i].bars.map(v=>v.toFixed(1)).join(' ')))}}}
 const gt='var GT_AU='+JSON.stringify(out).replace(/"/g,"'")+';';
 if(write){const f=path.join(__dirname,'..','www','js','aulessons.js'),s=fs.readFileSync(f,'utf8'),a='/* AU-EQ-GT:begin */',b='/* AU-EQ-GT:end */',i=s.indexOf(a),j=s.indexOf(b);
  if(i<0||j<i){console.error('aulessons.js に AU-EQ-GT の区間が無い');process.exit(1)}
  fs.writeFileSync(f,s.slice(0,i+a.length)+'\n'+gt+'\n'+s.slice(j));console.log('書き込み: '+Object.keys(out).length+'件')}
 else console.log(gt);
})().catch(e=>{console.error(e.stack);process.exit(1)});
