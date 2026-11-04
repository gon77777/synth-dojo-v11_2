/* v7.13 MSコース(ms01〜ms07)の検査(構造・mx目標が最初から達成済みでない・お手本の値が目標範囲に入る・問題つきミックスに問題が入っている): node test/ms.js */
const E=require('./cmest.js'),SD=E.loadSD();let err=0;const bad=m=>{console.log('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const LS=SD.LESSONS.filter(l=>l.course==='MS');
['ms01','ms02','ms03','ms04','ms05','ms06','ms07'].forEach(id=>ok(LS.some(l=>l.id===id),id+' が無い'));
const get=id=>LS.find(l=>l.id===id);
LS.forEach(L=>{ok(L.steps.length>=4&&L.steps.length<=8,L.id+' のステップ数');ok(L.steps.some(s=>s.col),L.id+' にコラム');ok(L.steps.some(s=>(s.cmp||[]).length),L.id+' に聞き比べ');
 L.steps.forEach((st,si)=>{(st.mx||[]).forEach(g=>{});if((st.mx||[]).length){const x=g=>{const t=L.tk[g.trk-1],mm=Object.assign({},SD.mxToMix(t.o.mx),t.o.mix||{});let v=mm[g.k];if(v===undefined)v=(g.ins==='mix'?SD.MIXP:SD.INSP).find(p=>p.id===g.k).def;return SD.MixGoal.inRange(v,g.rng)};ok(!st.mx.every(x),L.id+' step'+(si+1)+' の mx 目標が最初から全部達成済み')}});
 ok(SD.MixGoal.check(L).length===0,L.id+' MixGoal.check: '+SD.MixGoal.check(L).join(' / '))});
/* 問題つきミックス: 整ったミックスに比べて、広がりすぎ・刺さり・低域の重なり */
const B=SD.MS_BAD,F=SD.MS_FIN;
ok(Math.abs(B[3][1])>.6&&Math.abs(B[4][1])>.6,'BAD: コード・リードが広がりすぎ');ok(B[1][4]>=5,'BAD: ハットが刺さる');ok(B[3][3]<=20,'BAD: コードの低域が空いていない');
/* 整ったミックスの値が、ms06 の目標範囲に入る */
const f=(l,t,k)=>[].concat(...get(l).steps.map(s=>s.mx||[])).find(g=>g.trk===t&&g.k===k);
[['ms06',4,'iEqHpf',3],['ms06',2,'iEqHg',4],['ms06',4,'tPan',1],['ms06',4,'tRvb',2],['ms06',5,'tPan',1],['ms06',5,'tRvb',2],['ms04',4,'tPan',1],['ms04',5,'tPan',1],['ms05',3,'tVol',0],['ms05',2,'tVol',0]].forEach(([l,t,k,j])=>{const g=f(l,t,k);ok(g,l+' T'+t+' '+k+' の目標が無い');if(g&&!(l==='ms05')){const v=F[t-1][j];ok(SD.MixGoal.inRange(v,g.rng),l+' T'+t+' '+k+' 整ったミックスの値が範囲外 '+v)}});
console.log(err?('失敗 '+err+'件'):'OK: MSコース '+LS.length+'本(構造・mx目標・問題つきミックスの定義)');process.exit(err?1:0);
