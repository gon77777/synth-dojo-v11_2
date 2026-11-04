/* v7.11b MXコース(mx01〜mx13)の検査(構造・目安表との一致。メーター系 mt の達成は実機で確認): node test/mx.js */
const E=require('./cmest.js'),SD=E.loadSD(),{eqOnly}=require('./mxcal.js'),{stepLevels}=require('./eqest.js');let err=0;const bad=m=>{console.log('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const LS=SD.LESSONS.filter(l=>l.course==='MX'),G=SD.GUIDE.roles,D=SD.GUIDE.dyn;
['mx01','mx02','mx03','mx04','mx05','mx06','mx07','mx08','mx09','mx10','mx11','mx12','mx13'].forEach(id=>ok(LS.some(l=>l.id===id),id+' が無い'));
const get=id=>LS.find(l=>l.id===id),mxs=l=>[].concat(...l.steps.map(s=>s.mx||[])),f=(l,t,k)=>mxs(get(l)).find(g=>g.trk===t&&g.k===k);
const NT={mx01:6,mx02:6,mx03:2,mx04:3,mx05:4,mx06:6,mx07:8,mx08:7,mx09:6,mx10:4,mx11:4,mx12:6,mx13:6};
LS.forEach(L=>{ok(L.mode==='trk'&&L.tk.length===NT[L.id],L.id+' のトラック数');ok(L.steps.length>=5&&L.steps.length<=8,L.id+' は5〜8ステップ');ok(L.steps.some(s=>s.col),L.id+' にコラム');ok(L.steps.some(s=>(s.cmp||[]).length),L.id+' に聞き比べ');
 L.tk.forEach((x,i)=>ok(x.o.mx&&x.o.mx.eq&&x.o.mx.cp,L.id+' T'+(i+1)+' に EQ と COMP'));
 L.steps.forEach((st,si)=>{(st.mx||[]).forEach(g=>{const x=L.tk[g.trk-1];let ini,d;if(g.ins==='mix'){ini=(x.o.mix||{})[g.k];d=SD.MIXP.find(p=>p.id===g.k).def}else{const m=x.o.mx&&x.o.mx[g.ins];ini=m&&m[g.k];d=SD.INSP.find(p=>p.id===g.k).def}
  if(ini===undefined)ini=d;if(L.id<'mx08')ok(!SD.MixGoal.inRange(ini,g.rng),L.id+' step'+(si+1)+' mx '+g.k+' T'+g.trk+' が最初から達成済み');g._ini=SD.MixGoal.inRange(ini,g.rng)});if(L.id>='mx08'&&(st.mx||[]).length)ok(!st.mx.every(g=>g._ini),L.id+' step'+(si+1)+' の mx 目標が最初から全部達成済み')})});
const R=(l,t,k,lo,hi,w)=>{const g=f(l,t,k);ok(g&&g.rng[0]===lo&&g.rng[1]===hi,l+' '+w+' が目安表と違う '+(g&&g.rng))};
R('mx04',3,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'コードのローカット');R('mx05',4,'iEqHpf',G.hat.hpf[0],G.hat.hpf[1],'ハットのローカット');
R('mx06',6,'iEqHpf',G.lead.hpf[0],G.lead.hpf[1],'リードのローカット');
['mx05','mx01'].forEach(l=>{const t=l==='mx01'?4:4;R(l,t,'tPan',G.hat.pan.lo/100,G.hat.pan.hi/100,'ハットのPAN')});
R('mx07',8,'tPan',G.dbl.pan.lo/100,G.dbl.pan.hi/100,'ダブルのPAN');
mxs(get('mx03')).filter(g=>g.k==='iEqLg').forEach(g=>ok(Math.min(Math.abs(g.rng[0]),Math.abs(g.rng[1]))===D.eqStart[0]&&Math.max(Math.abs(g.rng[0]),Math.abs(g.rng[1]))===D.eqStart[1],'mx03 EQの量が目安(1〜3dB)と違う'));
LS.forEach(L=>L.steps.forEach(s=>(s.mt||[]).forEach(g=>{if(g.m==='gr'&&L.id==='mx03')ok(g.rng[0]===D.grBass[0]&&g.rng[1]===D.grBass[1],'mx03 ベースのGR目標が目安と違う');if(g.m==='gr'&&L.id==='mx05')ok(g.rng[0]===D.grDrumBus[0]&&g.rng[1]===D.grDrumBus[1],'mx05 ドラムのGR目標が目安と違う')})));
ok(get('mx07').tk.map(x=>x.o.out).join('')==='AAABBBCC','mx07 の出力先(A=ドラム・B=音楽・C=声)');

/* ---- v7.11b: mx08〜mx13 ---- */
const FD=require('../www/js/fxdsp.js'),eqdb=(m,f)=>FD.eq4Curve(m,[f])[0];
/* 目安表との一致 */
R('mx09',3,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'コードのローカット');R('mx09',4,'tPan',G.hat.hpf?G.hat.pan.lo/100:0,G.hat.pan.hi/100,'ハットのPAN');R('mx13',4,'tPan',G.hat.pan.lo/100,G.hat.pan.hi/100,'ハットのPAN');
R('mx10',4,'iEqB1f',G.snare.cut[0][0],G.snare.cut[0][1],'スネアの箱っぽさ');R('mx11',3,'iEqB2f',G.lead.cut[1][0],G.lead.cut[1][1],'リードの刺さり');R('mx11',2,'iEqB2f',G.pad.cut[1][0],G.pad.cut[1][1],'コードの声の場所');R('mx10',3,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'コードのローカット');
[['mx09',2,'iEqLg'],['mx10',3,'iEqB1g'],['mx10',4,'iEqB1g'],['mx11',3,'iEqB2g'],['mx11',2,'iEqB2g']].forEach(([l,t,k])=>{const g=f(l,t,k);ok(g&&Math.min(Math.abs(g.rng[0]),Math.abs(g.rng[1]))===D.eqStart[0]&&Math.max(Math.abs(g.rng[0]),Math.abs(g.rng[1]))===D.eqStart[1],l+' '+k+' の量が目安(1〜3dB)と違う')});
['mx09'].forEach(l=>LS.find(x=>x.id===l).steps.forEach(s=>(s.mt||[]).forEach(g=>{if(g.m==='gr')ok(g.rng[0]===D.grBass[0]&&g.rng[1]===D.grBass[1],l+' ベースのGR目標が目安と違う')})));
/* 出力先(mx12: A=ドラム・B=音楽) */
ok(get('mx12').tk.map(x=>x.o.out).join('')==='AAABBB','mx12 の出力先');
/* 聞き比べ: bm(バスのつまみ)の ID と範囲 */
LS.forEach(L=>L.steps.forEach((st,si)=>(st.cmp||[]).forEach((c,j)=>{if(!c.bm)return;Object.keys(c.bm).forEach(b=>Object.keys(c.bm[b]).forEach(id=>{const q=SD.BUSP.find(z=>z.id===id);ok(q&&(q.type==='seg'||(c.bm[b][id]>=q.min&&c.bm[b][id]<=q.max)),L.id+' step'+(si+1)+' bm '+b+'.'+id+' が不正')}))})));
/* 聞き比べの音量: EQだけが違う比較は、推定で差1dB以内(mx10 など) */
let nC=0;LS.filter(L=>L.id>='mx08').forEach(L=>L.steps.forEach((st,si)=>{if(!eqOnly(st))return;const lv=stepLevels(L,st);if(!lv.length||lv.some(x=>x==null))return;nC++;const sp=SD.MixGoal.cmpSpread(lv,st.cmp.map(c=>c.g||0));ok(sp<=1.0,L.id+' step'+(si+1)+' 聞き比べの推定音量差が1dBを超える '+sp.toFixed(2)+'dB')}));
/* mx12 の全員が EQ と COMP を持つ(上の共通検査と同じ)。診断(diag)の2本: 問題が状態に入っている・直した状態では消えている */
const T=(L,t)=>L.tk[t-1].o,eqOf=(L,t)=>T(L,t).mx.eq,fixedTm=(L,key)=>{const st=L.steps[L.steps.length-1];return st.cmp[st.cmp.length-1].tm};
{const L=get('mx10'),F=fixedTm(L);
 ok(L.kind==='diag','mx10 は kind:diag');
 ok(eqdb(eqOf(L,3),350)>=4,'mx10 こもり: コードの350Hzが+4dB以上持ち上がっていない');ok(eqdb(F[3],350)<=-0.5,'mx10 こもり: 直した状態で350Hzが下がっていない');
 ok(eqdb(eqOf(L,4),600)>=4,'mx10 箱鳴り: スネアの600Hzが+4dB以上持ち上がっていない');ok(eqdb(F[4],600)<=-0.5,'mx10 箱鳴り: 直した状態で600Hzが下がっていない');
 ok(eqOf(L,2).iEqHpf<=30&&eqOf(L,3).iEqHpf<=30&&eqdb(eqOf(L,3),60)>-1&&eqdb(eqOf(L,2),60)>-1,'mx10 低域の濁り: コードとベースの60Hz付近が両方素通しになっていない');
 ok(eqdb(F[3],60)<-6&&F[3].iEqHpf>=G.pad.hpf[0],'mx10 低域の濁り: 直した状態でコードの低域が減っていない');
 ok(L.steps.filter(s=>s.quiz).length>=3,'mx10 クイズが3つ以上')}
{const L=get('mx11'),F=fixedTm(L),F2=L.steps[L.steps.length-1].cmp[1].s,m=T(L,2).mix,v=T(L,4).mix;
 ok(L.kind==='diag','mx11 は kind:diag');
 ok(eqdb(eqOf(L,3),4000)>=4&&eqOf(L,3).iEqB2q>=2,'mx11 刺さり: リードの4kHzが狭く+4dB以上持ち上がっていない');ok(eqdb(F[3],4000)<=-0.5,'mx11 刺さり: 直した状態で4kHzが下がっていない');
 ok(v.tVol<=.5&&eqdb(eqOf(L,2),3000)>-.5,'mx11 声の埋もれ: 声が小さく、コードに声の場所(ポケット)が無い状態になっていない');ok(F[4].tVol>=.7&&eqdb(F[2],3000)<=-0.5,'mx11 声の埋もれ: 直した状態で声が前に出ていない');
 ok(SD.INSP&&L.init.swOn===1&&L.init.swWidth>=1.5,'mx11 広がりすぎ: WIDTH AMT が150%以上になっていない');ok(F2.swWidth<=1.1||F2.swOn===0,'mx11 広がりすぎ: 直した状態でWIDTHが戻っていない');
 ok(m.iCpOn===1&&m.iCpSc===1&&m.iCpThr<=-30&&m.iCpRel>=500,'mx11 ポンピング: T2のCOMPがSC SRC=T1で深く(THRESH -30dB以下)・戻りが遅い(500ms以上)状態になっていない');ok(F[2].iCpSc===1&&F[2].iCpThr>=-24&&F[2].iCpThr<=-16&&F[2].iCpRel<=300,'mx11 ポンピング: 直した状態でSC COMPが浅く・短くなっていない');
 /* SCの沈み具合(THRESHが低いほど深い)。問題の状態は直した状態より6dB以上低い */
 ok(m.iCpThr<=F[2].iCpThr-6,'mx11 ポンピング: 問題の状態が、直した状態より深く沈んでいない');
 ok(!JSON.stringify(L).includes('dkOn'),'mx11: 疑似DUCK(dkOn)を使っていない');
 ok(L.steps.filter(s=>s.quiz).length>=4,'mx11 クイズが4つ以上')}
/* mx13: お手本と「何もしていない」で、全トラックのVOLを同じ比で変えると音量差は exact(g の根拠): ここでは、お手本が各トラックにEQ・COMPを持つことだけ確認 */
ok(get('mx13').steps.some(s=>(s.mt||[]).some(g=>g.trk==='M'&&g.m==='peak')),'mx13 に MASTER のPEAK目標(音量をそろえる)');
console.log(err?('失敗 '+err+'件'):'OK: MXコース '+LS.length+'本(構造・目安表との一致・診断の問題が状態に入っていること・EQ比較の音量差'+nC+'件)');process.exit(err?1:0);
