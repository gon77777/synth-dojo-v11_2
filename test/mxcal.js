/* MXコースの「EQだけが違う聞き比べ」を見分ける(音量 tVol・COMP・パン・WIDTH・DUCK などが案どうしで同じなら、EQの差だけ)。tools/mx-cal.js と test/mx.js が使う */
function eqOnly(st){const c=st.cmp||[];if(c.length<2||c.some(v=>v.bm||v.ln||v.au===false||v.mt))return false;
 const ks=new Set();c.forEach(v=>Object.keys(v.tm||{}).forEach(t=>ks.add(t)));if(!ks.size)return false;
 for(const t of ks){const rest=v=>{const o=Object.assign({},(v.tm||{})[t]||{});Object.keys(o).forEach(k=>{if(/^iEq/.test(k))delete o[k]});return JSON.stringify(Object.keys(o).sort().map(k=>[k,o[k]]))};
  const r0=rest(c[0]);if(c.some(v=>rest(v)!==r0))return false}
 const s0=JSON.stringify(c[0].s||{});return c.every(v=>JSON.stringify(v.s||{})===s0)}
module.exports={eqOnly};
