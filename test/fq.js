/* v7.9a FQコース(fq01〜)の検査: ①聞き比べの音量差1dB以内(推定。tools/fq-cal.js の g) ②目標の範囲と目安表(SD.GUIDE)の一致 ③mx/mt/cmp の定義 ④初期状態で全目標が達成済みでない */
const {loadSD,stepLevels}=require('./eqest.js'),SD=loadSD();let err=0;const bad=m=>{console.log('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const LS=SD.LESSONS.filter(l=>l.course==='FQ'),G=SD.GUIDE.roles,D=SD.GUIDE.dyn;ok(LS.length>=13,'FQコースが13本以上');
['fq01','fq02','fq03','fq04','fq05','fq06','fq07','fq08','fq09','fq10','fq11','fq12','fq13'].forEach(id=>ok(LS.some(l=>l.id===id),id+' が無い'));
const get=id=>LS.find(l=>l.id===id),mxs=l=>[].concat(...l.steps.map(s=>s.mx||[])),f=(l,t,k)=>mxs(get(l)).find(g=>g.trk===t&&g.k===k);
let nC=0;
LS.forEach(L=>{ok(L.mode==='trk','trk ではない '+L.id);ok(L.steps.length>=5&&L.steps.length<=8,L.id+' は5〜8ステップ');ok(L.steps.some(s=>s.col),L.id+' にコラムが無い');ok(L.steps.some(s=>(s.cmp||[]).length),L.id+' に聞き比べが無い');
 L.steps.forEach((st,si)=>{const lv=stepLevels(L,st);if(!lv.length||lv.some(x=>x==null))return;nC++;
  const sp=SD.MixGoal.cmpSpread(lv,st.cmp.map(c=>c.g||0));ok(sp<=1.0,L.id+' step'+(si+1)+' 聞き比べの推定音量差が1dBを超える '+sp.toFixed(2)+'dB');
  (st.cmp||[]).forEach(c=>ok(c.g===undefined||(c.g<=0&&c.g>=-24),L.id+' g範囲'))});
 /* 初期状態で、各ステップの目標が全部は達成済みでない */
 L.steps.forEach((st,si)=>{if(!(st.mx||[]).length)return;
  const met=st.mx.every(g=>{const x=L.tk[g.trk-1];let ini,d;if(g.ins==='mix'){ini=(x.o.mix||{})[g.k];d=SD.MIXP.find(p=>p.id===g.k).def}else{ini=x.o.mx&&x.o.mx.eq&&x.o.mx.eq[g.k];d=SD.INSP.find(p=>p.id===g.k).def}return SD.MixGoal.inRange(ini==null?d:ini,g.rng)});
  ok(!met,L.id+' step'+(si+1)+' の mx 目標が最初から全部達成済み')});
 /* tk の全トラックに EQ インサートが入っている */
 L.tk.forEach((x,i)=>ok(x.o.mx&&x.o.mx.eq&&x.o.mx.eq.iEqOn===1,L.id+' T'+(i+1)+' にEQが入っていない'))});
/* 目安表との一致(範囲そのもの) */
const R=(l,t,k,lo,hi,w)=>{const g=f(l,t,k);ok(g&&g.rng[0]===lo&&g.rng[1]===hi,l+' '+w+' が目安表と違う '+(g&&g.rng))};
const IN=(l,t,k,a,w)=>{const g=f(l,t,k);ok(g&&g.rng[0]>=a[0]&&g.rng[1]<=a[1],l+' '+w+' が目安表の範囲外 '+(g&&g.rng))};
R('fq01',3,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'パッドのローカット');R('fq01',4,'iEqHpf',G.lead.hpf[0],G.lead.hpf[1],'リードのローカット');R('fq01',5,'iEqHpf',G.hat.hpf[0],G.hat.hpf[1],'ハットのローカット');
IN('fq02',1,'iEqLf',G.kick.keep[0],'キック重さ');IN('fq02',1,'iEqB2f',G.kick.keep[1],'キックの点');R('fq02',1,'iEqB1f',G.kick.cut[0][0],G.kick.cut[0][1],'キックの箱っぽさ');
R('fq03',2,'iEqB1f',G.bass.cut[0][0],G.bass.cut[0][1],'ベースの濁り');R('fq03',2,'iEqB2f',G.bass.keep[1][0],G.bass.keep[1][1],'ベースの輪郭');
IN('fq04',2,'iEqLf',G.snare.keep[0],'スネアの胴');IN('fq04',2,'iEqB2f',G.snare.keep[1],'スネアのスナップ');R('fq04',2,'iEqB1f',G.snare.cut[0][0],G.snare.cut[0][1],'スネアの箱っぽさ');
R('fq05',3,'iEqHpf',G.hat.hpf[0],G.hat.hpf[1],'ハットのローカット');
R('fq06',3,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'パッドのローカット');R('fq06',3,'iEqB2f',G.pad.cut[1][0],G.pad.cut[1][1],'パッドの声の場所');
{const L7=get('fq07'),a=L7.steps[2].mx.find(g=>g.k==='iEqB2f'),b=L7.steps[3].mx.find(g=>g.k==='iEqB2f');ok(a&&a.rng[0]===G.lead.keep[0][0]&&a.rng[1]===G.lead.keep[0][1],'fq07 リードの抜けが目安表と違う');ok(b&&b.rng[0]>=G.lead.cut[1][0]&&b.rng[1]<=G.lead.cut[1][1],'fq07 リードの刺さりが目安表の範囲外')}
/* fq08〜fq13 */
IN('fq08',3,'iEqB2f',G.pad.cut[1],'パッドの声の場所');IN('fq08',4,'iEqB2f',G.vocal.keep[1],'リードの道');R('fq08',5,'iEqHpf',G.vocal.hpf[0],G.vocal.hpf[1],'声のローカット');IN('fq08',5,'iEqLf',G.vocal.keep[0],'声の太さ');
R('fq09',1,'iEqHpf',25,40,'キックのローカット');{const g=f('fq09',3,'iEqHpf');ok(g&&g.rng[0]<=G.snare.hpf[0]&&g.rng[1]>=G.snare.hpf[1],'fq09 スネアのローカットが目安表(100Hz前後)を含まない')}R('fq09',4,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'パッドのローカット');R('fq09',5,'iEqHpf',G.lead.hpf[0],G.lead.hpf[1],'リードのローカット');R('fq09',6,'iEqHpf',G.hat.hpf[0],G.hat.hpf[1],'ハットのローカット');
IN('fq10',5,'iEqB2f',G.lead.cut[1],'リードの刺さり');IN('fq10',4,'iEqHf',G.pad.keep[1],'パッドの空気感');
R('fq11',3,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'パッドのローカット');
/* fq13: 3つの問題が、初期状態(tk)と cmp の「問題あり」の案に実際に入っている(状態で定義) */
{const L=get('fq13'),pd=L.tk[2].o.mx.eq,ld=L.tk[3].o.mx.eq;ok(pd.iEqB1g>=3&&pd.iEqB1f>=250&&pd.iEqB1f<=500,'fq13 こもりがパッドの初期状態に無い');ok(ld.iEqB2g>=3,'fq13 刺さりがリードの初期状態に無い');ok(pd.iEqHpf<G.pad.hpf[0],'fq13 低域の濁り(パッドのローカット無し)が初期状態に無い');
 const c1=L.steps[0].cmp,c3=L.steps[2].cmp,c5=L.steps[4].cmp;ok(c1[1].tm[3].iEqB1g>=3&&c1[0].tm[3].iEqB1g<0&&c1[2].tm[3].iEqB1g<0,'fq13 step1 のこもり案');ok(c3[1].tm[4].iEqB2g>=3&&c3[0].tm[4].iEqB2g<0&&c3[2].tm[4].iEqB2g<0,'fq13 step3 の刺さり案');ok(c5[1].tm[3].iEqHpf<G.pad.hpf[0]&&c5[0].tm[3].iEqHpf>=G.pad.hpf[0]&&c5[2].tm[3].iEqHpf>=G.pad.hpf[0],'fq13 step5 の低域濁り案');
 ok(L.steps[0].quiz.ans===2&&L.steps[2].quiz.ans===2&&L.steps[4].quiz.ans===2,'fq13 quiz の答え')}
/* カット・ブースト量は始めの目安(eqStart) */
mxs({steps:LS.flatMap(l=>l.steps)}).filter(g=>/^iEq(Lg|B1g|B2g|Hg)$/.test(g.k)).forEach(g=>{const a=Math.abs(g.rng[0]),b=Math.abs(g.rng[1]);ok(Math.min(a,b)===D.eqStart[0]&&Math.max(a,b)===D.eqStart[1],'量が目安(1〜3dB)と違う '+g.k+' '+g.rng)});
/* fq07: 刺さり(レゾナンス)の周波数が、削る目標範囲に入る */
{const L7=get('fq07'),res=L7.tk[2].o.p.cutoff,g=L7.steps[3].mx.find(q=>q.k==='iEqB2f');ok(res>=g.rng[0]&&res<=g.rng[1],'fq07 レゾナンスが目標範囲の外')}
console.log(err?('失敗 '+err+'件'):('OK: FQコース '+LS.length+'本・聞き比べ'+nC+'件の音量差を推定で検査'));process.exit(err?1:0);
