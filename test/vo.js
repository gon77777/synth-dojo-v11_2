/* v7.10b VOコース(vo01〜vo16。vo15=母音シンセ・vo16=取り込み素材トラック)の検査(オフライン描画の測定): node test/vo.js
   ①聞き比べの音量差1dB以内(g を足した実測。声の代役はノコギリ波+ローパスの近似) ②mt目標(GR)が達成できる ③claim ④mx 目標が最初から全部は達成済みでない
   ⑤目標の範囲と目安表(SD.GUIDE)の一致 ⑥声のトラックに EQ と COMP が入っている ⑦cmp の tm(声)は EQ・COMP 全つまみを書く */
const E=require('./cmest.js'),SD=E.loadSD();let err=0;const DSv=o=>Object.assign({iDsOn:1,iDsFreq:6500,iDsThr:-30,iDsAmt:6,iDsListen:0},o);const bad=m=>{console.log('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const LS=SD.LESSONS.filter(l=>l.course==='VO'),G=SD.GUIDE.roles,D=SD.GUIDE.dyn;
['vo01','vo02','vo03','vo04','vo05','vo06','vo07','vo08','vo09','vo10','vo11','vo12','vo13','vo14','vo15','vo16'].forEach(id=>ok(LS.some(l=>l.id===id),id+' が無い'));
const TL=LS.filter(l=>l.id!=='vo15');/* vo15 はトラックなし(アディティブ1台) */
const get=id=>LS.find(l=>l.id===id),mxs=l=>[].concat(...l.steps.map(s=>s.mx||[])),f=(l,t,k)=>mxs(get(l)).find(g=>g.trk===t&&g.k===k);
const ID=k=>SD.INSP.filter(p=>(p.ins==='eq'||p.ins==='cp'||p.id==='iOrd')&&p.id!=='iCpSc'&&p.id!=='iCpScLsn'/* v8.2: SC は書かなければ INT(SD.cmpTmFill) */).map(p=>p.id);
TL.forEach(L=>{ok(L.mode==='trk'&&L.tk.length>=4,L.id+' はTRK');ok(L.steps.length>=5&&L.steps.length<=8,L.id+' は5〜8ステップ');ok(L.steps.some(s=>s.col),L.id+' にコラム');ok(L.steps.some(s=>(s.cmp||[]).length),L.id+' に聞き比べ');
 const v=L.tk[3];ok((v.id==='vo_a'||(L.id==='vo16'&&v.id==='vo_smp'))&&v.o.mx&&v.o.mx.eq&&v.o.mx.cp,L.id+' T4 は声の代役(EQとCOMP入り)');
 L.steps.forEach((st,si)=>{(st.cmp||[]).forEach((c,i)=>{ok(c.tm||c.mt||c.s||c.ln||c.au===false,L.id+' step'+(si+1)+' cmp'+(i+1)+' は tm・mt・s・ln・au:false のどれか');ok(c.g===undefined||(c.g<=0&&c.g>=-24),L.id+' g範囲');
   if(c.tm&&c.tm[4])ok(ID().every(k=>c.tm[4][k]!==undefined||(k.slice(0,3)==='iCp'&&c.tm[4].iCpOn===0)),L.id+' step'+(si+1)+' cmp'+(i+1)+' 声のtmは EQ・COMP・ORDER の全つまみを書く')});
  if((st.mx||[]).length){const met=st.mx.every(g=>{const x=L.tk[g.trk-1];let ini,d;if(g.ins==='mix'){ini=(x.o.mix||{})[g.k];d=SD.MIXP.find(p=>p.id===g.k).def}else{const m=x.o.mx&&x.o.mx[g.ins];ini=m&&m[g.k];d=SD.INSP.find(p=>p.id===g.k).def}return SD.MixGoal.inRange(ini==null?d:ini,g.rng)});ok(!met,L.id+' step'+(si+1)+' の mx 目標が最初から全部達成済み')}})});
LS.forEach(L=>(L.claim||[]).forEach(q=>ok(q.m==='gr'&&q.trk>=1&&q.trk<=L.tk.length&&q.rng&&q.rng[0]<q.rng[1]&&q.cp,L.id+' claim 定義不正')));
/* 目安表との一致 */
const R=(l,t,k,lo,hi,w)=>{const g=f(l,t,k);ok(g&&g.rng[0]===lo&&g.rng[1]===hi,l+' '+w+' が目安表と違う '+(g&&g.rng))},IN=(l,t,k,a,w)=>{const g=f(l,t,k);ok(g&&g.rng[0]>=a[0]&&g.rng[1]<=a[1],l+' '+w+' が目安表の範囲外 '+(g&&g.rng))};
['vo01','vo02','vo03'].forEach(l=>R(l,4,'iEqHpf',G.vocal.hpf[0],G.vocal.hpf[1],'声のローカット'));R('vo01',3,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'パッドのローカット');
['vo02','vo03'].forEach(l=>IN(l,4,'iEqB1f',G.vocal.cut[0],'声の濁り'));IN('vo03',4,'iEqB2f',G.vocal.keep[1],'声の明瞭さ');IN('vo03',4,'iEqHf',G.vocal.keep[2],'声の空気感');
{const g=f('vo09',3,'tPan');ok(g&&g.rng[0]===G.dbl.pan.lo/100&&g.rng[1]===G.dbl.pan.hi/100,'vo09 ダブルのPANが目安表と違う')}
R('vo05',3,'iDsFreq',G.vocal.cut[1][0],G.vocal.cut[1][1],'歯擦音の帯域');
{const g=f('vo07',4,'tRvb');ok(g&&g.rng[0]>=0&&g.rng[1]<=.3,'vo07 声のセンドは少なめ')}
{const g=f('vo02',4,'tRvb');ok(g&&g.rng[0]>=0&&g.rng[1]<=.3,'vo02 声のセンドは少なめ')}
['vo02','vo03'].forEach(l=>mxs(get(l)).filter(g=>/^iEq(Lg|B1g|B2g|Hg)$/.test(g.k)).forEach(g=>{const a=Math.abs(g.rng[0]),b=Math.abs(g.rng[1]);ok(Math.min(a,b)===D.eqStart[0]&&Math.max(a,b)===D.eqStart[1],'量が目安(1〜3dB)と違う '+g.k+' '+g.rng)}));
LS.forEach(L=>L.steps.forEach(s=>(s.mt||[]).forEach(g=>{if(g.m==='gr')ok(g.rng[0]<=D.grVocal[0]&&g.rng[1]>=D.grVocal[1],L.id+' 声のGR範囲が目安(3〜6dB)を含む')})));
/* vo13〜vo16 */
{const g3=f('vo13',3,'tRvb'),g4=f('vo13',4,'tRvb');ok(g3&&g4&&g3.rng[0]>g4.rng[0]&&g4.rng[1]<=.3,'vo13 声の送りは少なめ・パッドは声より多め')}
{const L=get('vo13');ok(L.tk[2].o.mx.sa&&L.tk[3].o.mx.sa,'vo13 T3・T4 に SAT')}
{const L=get('vo14'),ids=L.steps.map(s=>(s.au||[]).map(a=>a.id).join());ok(ids.some(x=>x==='tsSpeed')&&ids.some(x=>x==='djFilter')&&ids.some(x=>x==='tDly'),'vo14 に tsSpeed・djFilter・tDly のレーン');ok(L.init&&L.init.tsOn===1&&L.init.djOn===1,'vo14 init でテープストップ・DJ FILTER が ON')}
{const L=get('vo15');ok(L.synth==='add'&&L.steps.length>=5&&L.steps.length<=8&&L.steps.some(s=>s.col)&&L.steps.some(s=>(s.cmp||[]).length)&&L.init.adFmt==='on','vo15 の構成')}
{const L=get('vo16');ok(L.tk[3].id==='vo_smp'&&SD.VOICEBY.vo_smp&&SD.VOICEBY.vo_smp.synth==='smp','vo16 T4 は取り込み素材トラック');ok(L.steps.some(s=>/権利/.test(s.b)),'vo16 に権利の注意')}
(async()=>{
 if(!E.hasRender){if(process.env.CI){bad('node-web-audio-api が無い')}else console.log('SKIP: 測定(node-web-audio-api 未インストール)');return done(0,0,0)}
 let nC=0,nM=0,nQ=0;
 for(const L of TL.filter(l=>l.id!=='vo16')){
  for(let si=0;si<L.steps.length;si++){const st=L.steps[si];
   if((st.cmp||[]).length>1&&st.cmp.every(c=>c.tm&&!c.mt&&!c.s&&c.g!==undefined||0)&&st.cmp.every(c=>c.tm&&!c.mt&&!c.s&&!JSON.stringify(c.tm).includes('tVol'))){const lv=await E.cmpLevels(SD,L,st),gs=st.cmp.map(c=>c.g||0);nC++;const sp=SD.MixGoal.cmpSpread(lv,gs);ok(sp<=1.0,L.id+' step'+(si+1)+' 聞き比べの音量差が1dBを超える '+sp.toFixed(2)+'dB')}
   if((st.mt||[]).length){const state=E.stateAt(SD,L,si),r=await E.measure(SD,L,state);
    st.mt.forEach(g=>{if(g.m!=='gr')return;nM++;ok(E.mtReachable(SD,r.gr[g.trk]||[],g.rng,g.hold),L.id+' step'+(si+1)+' mt GR '+g.rng+' が目標どおりの状態で達成できない')})}}
  for(const q of L.claim||[]){const ov={};ov[q.trk]=Object.assign({iCpOn:1},q.cp);const r=await E.measure(SD,L,ov),b=r.gr[q.trk].slice(r.gr[q.trk].length/3|0),m=b.reduce((x,y)=>x+y,0)/b.length;nQ++;ok(SD.MixGoal.inRange(m,q.rng),L.id+' claim: GRの平均が '+q.rng+' に入らない '+m.toFixed(2))}}
 /* 本文の主張: vo02 の EQ→COMP は COMP→EQ よりGRが大きい(LOWを持ち上げた声) */
 {const L=get('vo02'),st=L.steps[4],a=await E.measure(SD,L,st.cmp[0].tm),b=await E.measure(SD,L,st.cmp[1].tm),m=r=>{const g=r.gr[4].slice(r.gr[4].length/3|0);return g.reduce((x,y)=>x+y,0)/g.length};ok(m(a)>m(b)+.3,'vo02: EQ→COMP のほうがGRが大きい '+m(a).toFixed(2)+' vs '+m(b).toFixed(2))}
 /* vo05: DE-ESS が効く(THRESHが低いほどGRが出る・THRESH 高めはほぼ出ない・AMOUNTが大きいほど音量が下がる) */
 {const L=get('vo05'),gm=async o=>{const r=await E.measure(SD,L,{3:o});const g=r.ds&&r.ds[3]||[0];return{mx:Math.max(...g),lv:r.tr[3]}},a=await gm(DSv({iDsThr:-12,iDsAmt:10})),b=await gm(DSv({iDsThr:-38,iDsAmt:10})),c=await gm(DSv({iDsThr:-38,iDsAmt:3})),d=await gm(DSv({iDsThr:-38,iDsAmt:20}));
  ok(b.mx>3,'vo05: THRESH低めでDE-ESSのGRが出ない '+b.mx.toFixed(1));ok(a.mx<1,'vo05: THRESH高めなのにGRが出る '+a.mx.toFixed(1));ok(b.lv<a.lv-.5,'vo05: DE-ESSで音量が下がらない');ok(d.lv<c.lv-.5,'vo05: AMOUNT大で音量が下がらない');console.log('vo05 DS GR: 高め'+a.mx.toFixed(1)+' 低め'+b.mx.toFixed(1)+' / 音量 '+a.lv.toFixed(1)+' '+b.lv.toFixed(1)+' amt3 '+c.lv.toFixed(1)+' amt20 '+d.lv.toFixed(1))}
 done(nC,nM,nQ);
 function done(nC,nM,nQ){console.log(err?('失敗 '+err+'件'):('OK: VOコース '+LS.length+'本・聞き比べ'+(nC||0)+'件の音量差・mt目標'+(nM||0)+'件・claim'+(nQ||0)+'件を測定で検査'));process.exit(err?1:0)}
})().catch(e=>{console.error('NG: '+e.stack);process.exit(1)});
