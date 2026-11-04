/* SB レッスン(sb01・sb02)の cmp.g(音量補正)を測って出す。出力を www/js/cm.js の GSB に貼る。使い方: node tools/sb-cal.js
   バスCOMP(sd-comp。SC のときはキー=T1の素の音)を通した全体の後半ループのRMSを、案ごとに測る。ミュートしたトラックは出力に混ぜず、キーにだけ使う */
const E=require('../test/cmest.js'),SD=E.loadSD();
const CPMAP={iCpModel:'model',iCpThr:'thresh',iCpRatio:'ratio',iCpAtk:'attack',iCpRel:'release',iCpKnee:'knee',iCpMix:'mix',iCpScHpf:'schpf'};
function busComp(x,key,cp){const K=E.procs['sd-comp'],p=new K(),pm={};K.parameterDescriptors.forEach(d=>{pm[d.name]=[d.defaultValue]});
 Object.keys(CPMAP).forEach(k=>{if(cp[k]!==undefined)pm[CPMAP[k]]=[cp[k]]});pm.active=[1];const sc=(cp.iCpSc|0)>0;pm.scOn=[sc?1:0];pm.scListen=[0];
 const n=x.length,y=new Float32Array(n),a=new Float32Array(128),b=new Float32Array(128),mk=Math.pow(10,(cp.iCpMake||0)/20);
 for(let s=0;s+128<=n;s+=128){const xs=x.subarray(s,s+128),ks=(key||x).subarray(s,s+128);p.process(sc?[[xs,xs],[ks,ks]]:[[xs,xs]],[[a,b]],pm);y.set(a,s)}
 for(let i=0;i<n;i++)y[i]*=mk;return y}
async function level(L,v){const dry=[];for(let k=0;k<L.tk.length;k++)dry.push(await E.trackDry(SD,L,L.tk[k],3));
 const n=dry[0].length,bus=new Float32Array(n),mst=new Float32Array(n);
 L.tk.forEach((t,k)=>{const mute=(v.mt||[]).indexOf(k+1)>=0,to=SD.withOut(null,t.o.out);if(mute)return;(to&&to.tOut?bus:mst).set(dry[k].map((e,i)=>e+((to&&to.tOut?bus:mst)[i])))});
 const cp=Object.assign({},v.bm.A),out=cp.iCpOn==1?busComp(bus,dry[0],cp):bus,a=Math.round(n*2/3);let s=0;
 for(let i=a;i<n;i++){const m=out[i]+mst[i];s+=m*m}return 10*Math.log10(s/(n-a)+1e-20)}
(async()=>{const res={};
 for(const L of SD.LESSONS.filter(l=>/^sb\d+$/.test(l.id)))for(let si=0;si<L.steps.length;si++){const c=L.steps[si].cmp;if(!c)continue;
  const lv=[];for(const v of c)lv.push(await level(L,v));const m=Math.min(...lv);res[L.id+'s'+(si+1)]=lv.map(x=>Math.max(-24,+(m-x).toFixed(1)))}
 console.log('var GSB='+JSON.stringify(res).replace(/"/g,"'")+';')})().catch(e=>{console.error(e);process.exit(1)});
