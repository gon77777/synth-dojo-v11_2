/* v7.5a EQコース(eq01〜eq06)の検査: ①聞き比べの音量差1dB以内(推定。tools/eq-cal.js が出した g を使う) ②目標の範囲と目安表の一致 ③tm・mx の定義 */
const {loadSD,stepLevels}=require('./eqest.js'),SD=loadSD();let err=0;const bad=m=>{console.log('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const LS=SD.LESSONS.filter(l=>l.course==='EQ');ok(LS.length>=11,'EQコースが11本以上');
['eq01','eq02','eq03','eq04','eq05','eq06','eq07','eq08','eq09','eq10','eq11'].forEach(id=>ok(LS.some(l=>l.id===id),id+' が無い'));
let nC=0;
LS.forEach(L=>L.steps.forEach((st,si)=>{const lv=stepLevels(L,st);if(!lv.length||lv.some(x=>x==null))return;nC++;
 const gs=st.cmp.map(c=>c.g||0),sp=SD.MixGoal.cmpSpread(lv,gs);
 ok(sp<=1.0,L.id+' step'+(si+1)+' 聞き比べの推定音量差が1dBを超える '+sp.toFixed(2)+'dB');
 st.cmp.forEach((c,i)=>ok(c.g===undefined||(c.g<=0&&c.g>=-24),L.id+' g範囲'))}));
/* 目安表との一致: eq05 の数値目標は GUIDE の範囲そのもの */
const G=SD.GUIDE,L5=LS.find(l=>l.id==='eq05'),mxs=[].concat(...L5.steps.map(s=>s.mx||[]));
const hp=mxs.find(g=>g.k==='iEqHpf'),b1f=mxs.find(g=>g.k==='iEqB1f'),b1g=mxs.find(g=>g.k==='iEqB1g');
ok(hp&&hp.rng[0]===G.roles.pad.hpf[0]&&hp.rng[1]===G.roles.pad.hpf[1],'eq05 パッドのローカット範囲が目安表と違う');
ok(b1f&&b1f.rng[0]===G.roles.bass.cut[0][0]&&b1f.rng[1]===G.roles.bass.cut[0][1],'eq05 ベースの濁り帯域が目安表と違う');
ok(b1g&&b1g.rng[0]===-G.dyn.eqStart[1]&&b1g.rng[1]===-G.dyn.eqStart[0],'eq05 カット量が目安表(1〜3dB)と違う');
/* eq08: キックの重さ・ベースの輪郭の範囲が目安表の中 */
{const L8=LS.find(l=>l.id==='eq08'),m=[].concat(...L8.steps.map(s=>s.mx||[])),kk=G.roles.kick.keep[0],bk=G.roles.bass.keep[1];
 const kf=m.find(g=>g.trk===1&&g.k==='iEqB1f'),bf=m.find(g=>g.trk===2&&g.k==='iEqB2f');
 ok(kf&&kf.rng[0]>=kk[0]&&kf.rng[1]<=kk[1],'eq08 キックの周波数が目安表(重さ)の外');ok(bf&&bf.rng[0]===bk[0]&&bf.rng[1]===bk[1],'eq08 ベースの輪郭が目安表と違う')}
/* eq09: レーン目標のお手本が目標を満たすのは validate.js が検査。ここでは eq09 がAUTO目標を持つことだけ */
ok(LS.find(l=>l.id==='eq09').steps.some(s=>(s.au||[]).length),'eq09 にAUTO目標が無い');
/* eq06: 「耳障りな所」(レゾナンス)が目標のスイープ範囲に入っている */
const L6=LS.find(l=>l.id==='eq06'),res=L6.tk[1].o.p.cutoff,g6=[].concat(...L6.steps.map(s=>s.mx||[])).find(g=>g.k==='iEqB2f');
ok(g6&&res>=g6.rng[0]&&res<=g6.rng[1],'eq06 レゾナンスの周波数が目標範囲の外');
/* 初期状態では、各ステップの mx 目標が全部は達成済みになっていない(最初から「できた」にならない) */
LS.filter(l=>l.mode==='trk').forEach(L=>L.steps.forEach((st,si)=>{if(!(st.mx||[]).length)return;
 const met=st.mx.every(g=>{const x=L.tk[g.trk-1],ini=(x.o.mx&&x.o.mx.eq&&x.o.mx.eq[g.k]),d=SD.INSP.find(p=>p.id===g.k).def;return SD.MixGoal.inRange(ini==null?d:ini,g.rng)});
 ok(!met,L.id+' step'+(si+1)+' の mx 目標が最初から全部達成済み')}));
console.log(err?('失敗 '+err+'件'):('OK: EQコース '+LS.length+'本・聞き比べ'+nC+'件の音量差を推定で検査'));process.exit(err?1:0);
