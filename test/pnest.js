/* PNコース(v7.8〜)の聞き比べ音量の「推定」。各トラックの音をオフライン描画(test/cmest.js の trackDry)し、
   ストリップの PAN(2ch入力の StereoPanner。test/pn.js が実測で検証)の係数を掛けて足し、L・Rの平均パワーを返す。
   tools/pn-cal.js が cmp.g を出し、test/pn.js が差1dB以内を検査する。要 node-web-audio-api(無ければ null) */
const C=require('./cmest.js');
/* StereoPanner(2ch入力・L=Rの素材)の出力係数。pan -1〜1。Web Audio 仕様の式(実測と一致: 中央 L=R=1、端 片側 2・反対側 0) */
function panGain(p){p=Math.max(-1,Math.min(1,p));const x=p<=0?p+1:p,c=Math.cos(x*Math.PI/2),s=Math.sin(x*Math.PI/2);
 return p<=0?{L:1+c,R:s}:{L:c,R:1+s}}
const dryCache={};
async function dry(SD,L,k){const key=L.id+':'+k;if(!dryCache[key])dryCache[key]=await C.trackDry(SD,L,L.tk[k],3);return dryCache[key]}
/* v: cmp の1案({tm,mt})。戻り値 dB(L・R平均パワー) */
async function level(SD,L,v){let sum=0,n=0;
 for(let k=0;k<L.tk.length;k++){
  if(v.mt&&v.mt.indexOf(k)>=0)continue;
  const d=await dry(SD,L,k);if(!d)return null;const base=((L.tk[k].o.mix||{}).tPan)||0,pan=((v.tm||{})[k+1]||{}).tPan;
  const g=panGain(pan==null?base:pan),tv=((v.tm||{})[k+1]||{}).tVol,bv=((L.tk[k].o.mix||{}).tVol),vv=tv!=null?tv:(bv!=null?bv:1),vg=Math.pow(vv*vv,2);n=Math.max(n,d.length);
  const a=Math.round(d.length*2/3);let s=0;for(let i=a;i<d.length;i++)s+=d[i]*d[i];s/=(d.length-a);
  sum+=s*vg*(g.L*g.L+g.R*g.R)/2}
 return 10*Math.log10(sum+1e-20)}
async function levels(SD,L,st){const o=[];for(const v of st.cmp||[])o.push(await level(SD,L,v));return o}
module.exports={panGain,level,levels,loadSD:C.loadSD,hasRender:C.hasRender,OAC:C.OAC};
