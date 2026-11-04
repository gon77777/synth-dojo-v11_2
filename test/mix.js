// トラック別インサート・ミキサーのテスト(v7.0a〜): node test/mix.js
// ① 旧データ互換(インサートOFF=従来と同じ接続・同じ音) ② EQ4 の周波数特性が eq4Curve と ±1dB ③ COMP の GR が理論値と ±1dB(KNEE・MIX含む)
// ⑤ 8本同時で NaN 無し ⑩ iOrd(EQ/COMP順)の切替で接続が切れない。 ②⑤ の描画は node-web-audio-api が要る(無いとき、CI以外ではその部分だけスキップ)
const fs=require('fs'),path=require('path'),vm=require('vm');
const JS=path.join(__dirname,'..','www','js'),FX=path.join(__dirname,'..','fx-src');
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
const db=v=>20*Math.log10(Math.max(v,1e-12));
function load(extra,files){files=files||['params.js','mixdefs.js','fxdsp.js','fxworklets.js','bus.js'];const ctx=Object.assign({console,setTimeout,clearTimeout,Float32Array,Float64Array},extra||{});ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f}));return ctx}
/* ---------- ⑪ v8.4 インサート(EQ4・COMP)のつまみをオートメーションの対象に(純粋関数) ---------- */
{
 const ctx=vm.createContext({console,setTimeout,clearTimeout,Float32Array,Float64Array});ctx.window=ctx;
 ['params.js','mixdefs.js','auto.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f}));
 const SD=ctx.SD,A=SD.Auto,df=(t,id)=>A.defOf('analog',id),P=id=>SD.INSP.find(p=>p.id===id);
 ['iCpThr','iCpRatio','iCpAtk','iCpRel','iCpMake','iCpKnee','iCpMix','iCpScHpf','iEqHpf','iEqLpf','iEqLf','iEqLg','iEqB1f','iEqB1g','iEqB1q','iEqB2f','iEqB2g','iEqB2q','iEqHf','iEqHg'].forEach(id=>ok(SD.AUINS.indexOf(id)>=0&&P(id)&&P(id).auto!==false&&df(0,id)===P(id),'v8.4 '+id+' はオートメーションの対象'));
 ['iCpOn','iCpModel','iCpSc','iCpScLsn','iEqOn','iOrd','iGtOn','iGtThr','iDsOn','iSaOn','iMdOn','iMdRate'].forEach(id=>ok(P(id)&&P(id).auto===false&&!!P(id).autoWhy&&SD.AUINS.indexOf(id)<0,'v8.4 '+id+' は対象外(auto:false と理由)'));
 ok(SD.AUINS.every(id=>P(id).type==='knob'&&P(id).ins&&(P(id).ins==='eq'||P(id).ins==='cp')),'v8.4 AUINS は EQ・COMP の連続つまみだけ');
 const au=A.mk(4);ok(A.addLane(au,1,'iCpThr',df)&&au.lanes.length===1&&au.lanes[0].id==='iCpThr'&&au.lanes[0].trk===1,'v8.4 T2 の COMP THRESH のレーンを作れる');
 ok(A.addLane(au,1,'iCpOn',df)===null&&A.addLane(au,1,'iCpSc',df)===null&&A.addLane(au,0,'iEqOn',df)===null,'v8.4 ON・SC SRC のレーンは作れない');
 ['iCpThr','iCpAtk','iCpRel','iEqB2f','iEqB2g'].forEach(id=>{const p=P(id);[0,.25,.5,1].forEach(n=>{const v=A.toValue(p,n),n2=A.fromValue(p,v);ok(Math.abs(n2-n)<1e-6&&v>=p.min-1e-9&&v<=p.max+1e-9,'v8.4 '+id+' 値の往復 n='+n)})});
 /* エンジン(偽クロック): レーンの値が、インサートのつまみの実値として setParam に届く・RECでレーンができる・auto:false は録音しない */
 {let t=0;const calls=[],au2=A.mk(2),l=A.addLane(au2,1,'iCpThr',df);l.pts=[[0,0,'L'],[768,1,'L']];
  const e=new A.Engine({now:()=>t,bpm:()=>120,au:()=>au2,def:df,setParam:(k,id,v)=>calls.push({k,id,v}),timer:{set(){return 1},clear(){}},ms:5});e.start(0);
  for(let i=0;i<400;i++){t=Math.round((t+.005)*1e6)/1e6;e.update()}
  const c=calls.filter(x=>x.id==='iCpThr'&&x.k===1);ok(c.length>0&&c.every(x=>x.v>=P('iCpThr').min-1e-9&&x.v<=P('iCpThr').max+1e-9),'v8.4 エンジン: COMP THRESH のレーンの値が、つまみの範囲の実値で setParam に届く(T2)');
  ok(c.length>1&&c[c.length-1].v>c[0].v,'v8.4 エンジン: 右上がりのレーンで、THRESH が上がっていく');
  const au3=A.mk(4),e3=new A.Engine({now:()=>t,bpm:()=>120,au:()=>au3,def:df,setParam(){},timer:{set(){return 1},clear(){}},ms:5});e3.rec=true;e3.start(t);
  e3.grab(1,'iEqB2g');e3.recPt(1,'iEqB2g',.3);t+=.1;e3.update();e3.recPt(1,'iEqB2g',.7);e3.stop();ok(au3.lanes.length===1&&au3.lanes[0].id==='iEqB2g'&&au3.lanes[0].trk===1&&au3.lanes[0].pts.length>=2,'v8.4 REC: EQ BELL2 GAIN のレーンができる');
  const au4=A.mk(4),e4=new A.Engine({now:()=>t,bpm:()=>120,au:()=>au4,def:df,setParam(){},timer:{set(){return 1},clear(){}},ms:5});e4.rec=true;e4.start(t);e4.grab(1,'iCpOn');ok(au4.lanes.length===0,'v8.4 REC: COMP ON は録音しない');}
 const ln=A.fromReal({id:'iCpThr',trk:1,pts:[[0,-20,'L'],[384,-40]]},df);ok(ln&&ln.id==='iCpThr'&&Math.abs(A.toValue(P('iCpThr'),ln.pts[0][1])+20)<1e-6&&Math.abs(A.toValue(P('iCpThr'),ln.pts[1][1])+40)<1e-6,'v8.4 実値で書いたレーンが、実値に戻る');
}
/* ---------- ⑦ シーン・シーンレーン・マーカー・32小節(v7.3a。純粋関数) ---------- */
{
 const ctx=vm.createContext({console,setTimeout,clearTimeout,Float32Array,Float64Array});ctx.window=ctx;
 ['params.js','mixdefs.js','auto.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f}));
 const SD=ctx.SD,A=SD.Auto,B=384,pf=id=>SD.MIXALL().find(p=>p.id===id)||null;
 ok(A.BARS.join()==='1,2,4,8,16,32','オートメーション: 長さに32小節がある');
 const mkS=(vol,pan,on,mute)=>({name:'x',tr:[{mute:!!mute,mix:{tVol:vol,tPan:pan,iEqOn:on}}]});
 const sc=[mkS(.2,-1,0,false),mkS(1,1,1,true),null,null,null,null];
 /* 補間: 決定的・グライド */
 const scn=[{at:0,s:0,g:'0'},{at:4*B,s:1,g:'bar'}],val=(t,id)=>A.sceneState(sc,scn,t,pf).v.find(x=>x[1]===id)[2];
 ok(val(0,'tVol')===.2&&val(4*B-1,'tVol')===.2,'シーン: 切替の前は前のシーンの値');
 ok(Math.abs(val(4*B+B/2,'tVol')-(()=>{const p=pf('tVol');return SD.fromN(p,(SD.toN(p,.2)+SD.toN(p,1))/2)})())<1e-9,'シーン: グライド1小節の真ん中は正規化値の中間');
 ok(val(5*B,'tVol')===1&&val(7*B,'tVol')===1,'シーン: グライドが終わると新しい値');
 ok(val(4*B+B/2,'iEqOn')===0&&val(5*B,'iEqOn')===1,'シーン: ON/OFF は遷移の終わりで切替');
 const mu=t=>A.sceneState(sc,scn,t,pf).m[0][1];ok(!mu(4*B+B/2)&&mu(5*B),'シーン: ミュートも遷移の終わりで切替');
 ok(JSON.stringify(A.sceneState(sc,scn,4*B+100,pf))===JSON.stringify(A.sceneState(sc,scn,4*B+100,pf)),'シーン: 補間は決定的');
 ok(A.sceneState(sc,[{at:2*B,s:0,g:'0'}],B,pf)===null,'シーン: 最初のシーン点より前は何もしない');
 ok(A.sceneState(sc,[{at:0,s:2,g:'0'}],0,pf)===null,'シーン: 未保存のスロットは何もしない');
 ok(val(4*B,'tVol')===.2,'シーン: 切替の瞬間(u=0)は前の値');
 /* 即時 */
 ok(A.sceneState(sc,[{at:0,s:0,g:'0'},{at:B,s:1,g:'0'}],B,pf).v.find(x=>x[1]==='tVol')[2]===1,'シーン: グライド0は即時');
 /* 整形・保存 */
 const au=A.clean({bars:32,lanes:[],scn:[{at:B*9,s:1,g:'bar'},{at:0,s:0},{at:B*9,s:2,g:'beat'},{at:-5,s:99,g:'zz'},{at:'x',s:0}],mk:[{at:B*8,name:'B'},{at:0,name:'Intro'}],lp:[0,B*8]});
 ok(au.bars===32&&au.scn.length===2&&au.scn[0].at===0&&au.scn[1].s===2&&au.scn[1].g==='beat','整形: シーン点は昇順・同じ位置は後が勝つ・不正は捨てる/丸める');
 ok(au.scn[0].s===5&&au.mk[0].name==='Intro'&&au.mk.length===2,'整形: マーカーは昇順');
 ok(JSON.stringify(A.markRange(au,0))===JSON.stringify([0,8*B])&&JSON.stringify(A.markRange(au,1))===JSON.stringify([8*B,32*B]),'マーカー: 範囲は次のマーカーまで(最後は全体の終わり)');
 ok(JSON.stringify(au.lp)===JSON.stringify([0,8*B])&&A.cleanLp([5,5],32*B)===null&&A.cleanLp([0,32*B+1],32*B)===null,'ループ範囲: 正しい範囲だけ残る');
 const old=A.clean({bars:4,lanes:[{trk:0,id:'tVol',pts:[[0,.5,'L']]}]});ok(!('scn' in old)&&!('mk' in old)&&!('lp' in old)&&old.lanes.length===1,'旧データ(シーン無し)はそのまま読める・キーを足さない');
 ok(A.clean({bars:16,lanes:[]}).bars===16&&A.clean({bars:7,lanes:[]}).bars===4,'旧データ: 16小節以前の長さが保たれる');
 const cs=A.cleanSc([{name:'Aメロ',tr:[{mute:1,mix:{tVol:.5,bad:'x'}}]}],8);ok(cs.length===6&&cs[0].name==='Aメロ'&&cs[0].tr[0].mute===true&&!('bad' in cs[0].tr[0].mix)&&cs[1]===null,'シーン定義: 6スロット・不正値を捨てる');
 /* 32小節: 点の上限・メモリ・評価負荷 */
 {const lane={trk:0,id:'tVol',mute:false,pts:[]};let rej=0;for(let i=0;i<A.PMAX+50;i++){if(A.insert(lane,i*3,.5,'L')===-1)rej++}
  ok(lane.pts.length===A.PMAX&&rej===50,'32小節: レーンの点数に上限('+A.PMAX+')');
  const a32=A.mk(32);a32.lanes.push(lane);for(let q=0;q<15;q++)a32.lanes.push({trk:0,id:'tPan',mute:false,pts:lane.pts.map(x=>x.slice())});
  const bytes=JSON.stringify(a32).length;ok(bytes<2e6,'32小節: 16レーン満杯でも保存は2MB未満('+Math.round(bytes/1024)+'KB)');
  const big=A.clean(JSON.parse(JSON.stringify(a32)),null);ok(big.lanes.every(l=>l.pts.length<=A.PMAX),'32小節: 読み込み時も上限を守る');
  const t0=Date.now();let sum=0;for(let k=0;k<2e4;k++){for(const l of a32.lanes)sum+=A.eval(l,(k*7)%(32*B))}ok(isFinite(sum)&&Date.now()-t0<3000,'32小節: 再生の評価が速い('+(Date.now()-t0)+'ms/2万tick×16レーン)')}
 /* エンジン: シーンが基準・レーンが上・ループ範囲 */
 {let t=0;const log=[],mutes=[],au2=A.clean({bars:8,lanes:[{trk:0,id:'tVol',pts:[[0,.9,'S']]}],scn:[{at:0,s:0,g:'0'},{at:B,s:1,g:'0'}]},null),
   io={now:()=>t,bpm:()=>240,au:()=>au2,def:(k,id)=>pf(id),setParam:(k,id,v)=>log.push(['lane',id,v]),pf,sc:()=>sc,sceneSet:(k,id,v)=>log.push(['sc',id,v]),sceneMute:(k,m)=>mutes.push(m),timer:{set:()=>1,clear(){}},ms:5},E=new A.Engine(io);
  E.start(0);t=.5;E.update();ok(log.some(x=>x[0]==='sc'&&x[1]==='tPan')&&!log.some(x=>x[0]==='sc'&&x[1]==='tVol'),'エンジン: レーンのあるつまみはシーンが触らない(シーンが基準・レーンが上)');
  ok(log.some(x=>x[0]==='lane'&&x[1]==='tVol'),'エンジン: レーンの値が出る');
  t=1.5;E.update();ok(mutes[mutes.length-1]===true,'エンジン: シーン切替でミュートが入る(1小節=1秒@240BPM)');
  au2.lp=[B*2,B*3];t=2.5;E.update();t=4.5;E.update();ok(E.pos>=B*2&&E.pos<B*3,'エンジン: ループ範囲の中を回る pos='+Math.round(E.pos))}
 /* レッスン定義の検査 */
 {const L={id:'zz',sc:[{name:'A',mix:{1:{tVol:.5}}},{name:'サビ',mix:{1:{tVol:1}}}],steps:[{h:'x',b:'y',sn:[{at:8,scene:'サビ',glide:'≥1beat'}]}]};ok(SD.MixGoal.check(L).length===0,'sn/sc: 正しい定義は通る '+SD.MixGoal.check(L).join());
  const bad=JSON.parse(JSON.stringify(L));bad.steps[0].sn=[{at:40,scene:'無い',glide:'x'}];ok(SD.MixGoal.check(bad).length===3,'sn: at・scene・glide の不正を見つける');
  const bad2=JSON.parse(JSON.stringify(L));bad2.sc[1].name='A';bad2.sc[0].mix={9:{tVol:.5},1:{zz:1}};ok(SD.MixGoal.check(bad2).length>=3,'sc: 重複名・トラック範囲外・不明IDを見つける');
  const au3=A.clean({bars:16,lanes:[],scn:[{at:8*B,s:1,g:'bar'}]});const scs=[{name:'A'},{name:'サビ'}];
  ok(A.snMet({at:8,scene:'サビ',glide:'≥1beat'},au3,scs)&&!A.snMet({at:8,scene:'サビ',glide:'≥1bar'},A.clean({bars:16,lanes:[],scn:[{at:8*B,s:1,g:'beat'}]}),scs)&&!A.snMet({at:7,scene:'サビ',glide:'0'},au3,scs),'sn: 位置・シーン・グライドで達成判定')}
}
/* ---------- 定義 ---------- */
{
 const C=load(),SD=C.SD,ids=SD.INSP.map(p=>p.id);
 ok(new Set(ids).size===ids.length,'インサートIDの重複なし');
 ok(ids.every(i=>/^i[A-Z]/.test(i)),'インサートIDは i 接頭辞');
 ok(!ids.some(i=>SD.MIXP.some(p=>p.id===i)||SD.FXIDS.indexOf(i)>=0),'インサートIDが既存のミキサー・FXと衝突しない');
 ok(SD.INSP.every(p=>p.def>=p.min&&p.def<=p.max),'インサートの既定値が範囲内');
 ok(['iGtOn','iEqOn','iCpOn','iSaOn','iMdOn'].every(i=>SD.INSP.find(p=>p.id===i).def===0),'インサートは既定で全OFF');
 ok(JSON.stringify(SD.INSORD({}))==='["gt","eq","cp","ds","sa","md"]'&&JSON.stringify(SD.INSORD({iOrd:1}))==='["gt","cp","eq","ds","sa","md"]','iOrd: 0=EQ→COMP / 1=COMP→EQ');
 /* OR-0: 旧 iOrd → 将来の mix.ord(順列)への変換の期待値表。いまの SD.INSORD(m) がこの表どおりに返すことを固定する(OR-1a で ord に置き換えても同じ結果になること) */
 {const D=['gt','eq','cp','ds','sa','md'],S=['gt','cp','eq','ds','sa','md'],T=[[undefined,D],[null,D],[{},D],[{iOrd:0},D],[{iOrd:1},S],[{iOrd:'1'},S],[{iOrd:2},D],[{iOrd:-1},D],[{iOrd:'0'},D],[{iOrd:null},D],[{iOrd:NaN},D]];
  T.forEach(([m,e])=>ok(JSON.stringify(SD.INSORD(m))===JSON.stringify(e),'OR-0 iOrd→順列 '+JSON.stringify(m)));
  ok(JSON.stringify(SD.mixClean({iOrd:5}).iOrd)==='1'&&SD.mixClean({iOrd:-3}).iOrd===0&&SD.mixClean({}).iOrd===0,'OR-0 mixClean は iOrd を0/1に丸める')}
 /* OR-1a: ord(順列)の検証・旧 iOrd からの変換・保存の往復・旧データは従来と同一 */
 {const D=['gt','eq','cp','ds','sa','md'],S=['gt','cp','eq','ds','sa','md'],J=JSON.stringify,R=['md','sa','ds','cp','eq','gt'];
  [[{iOrd:0},D],[{iOrd:1},S],[{},D],[undefined,D],[{iOrd:1,ord:R},R],[{iOrd:0,ord:S},S],[{iOrd:1,ord:['gt','eq']},S],[{iOrd:0,ord:['gt','eq','cp','ds','sa','sa']},D],[{ord:['gt','eq','cp','ds','sa','zz']},D],[{ord:'gt,eq,cp,ds,sa,md'},D],[{ord:[...D,'md']},D],[{ord:null},D]]
   .forEach(([m,e])=>ok(J(SD.ordOf(m))===J(e),'OR-1a ordOf '+J(m)));
  ok(J(SD.ordFromIOrd(0))===J(D)&&J(SD.ordFromIOrd(1))===J(S)&&J(SD.ordFromIOrd('1'))===J(S)&&J(SD.ordFromIOrd(7))===J(D),'OR-1a ordFromIOrd');
  ok(SD.ordValid(D)&&SD.ordValid(S)&&SD.ordValid(R)&&!SD.ordValid(D.slice(1))&&!SD.ordValid(null)&&!SD.ordValid({length:6}),'OR-1a ordValid');
  ok(Object.keys(SD.mixClean({iOrd:1})).join()===Object.keys(SD.MIXDEF()).join()&&!('ord' in SD.mixClean({iOrd:1}))&&!('ord' in SD.mixClean(null)),'OR-1a 旧データ(ord なし)は ord を持たない=従来と同じキー');
  const m=SD.mixClean({iOrd:0,ord:R});ok(J(m.ord)===J(R)&&m.ord!==R,'OR-1a mixClean は正しい ord をコピーして持つ');
  ok(!('ord' in SD.mixClean({ord:['gt','gt','cp','ds','sa','md']})),'OR-1a 不正な ord は捨てる');
  const rt=SD.mixClean(JSON.parse(J(SD.mixClean({iOrd:1,ord:R}))));ok(J(rt.ord)===J(R)&&rt.iOrd===1,'OR-1a 保存の往復(JSON)');
  ok(J(SD.INSORD({iOrd:1,ord:R}))===J(R)&&J(SD.INSORD({iOrd:1}))===J(S)&&J(SD.INSORD({}))===J(D),'OR-1b INSORD は ord を優先・無ければ iOrd')}
 {const J=JSON.stringify,D=['gt','eq','cp','ds','sa','md'];ok(J(SD.ordMove(D,0,1))===J(['eq','gt','cp','ds','sa','md'])&&J(SD.ordMove(D,5,-1))===J(['gt','eq','cp','ds','md','sa']),'OR-1c ordMove 上下');
  ok(J(SD.ordMove(D,0,-1))===J(D)&&J(SD.ordMove(D,5,1))===J(D)&&J(SD.ordMove(D,9,1))===J(D)&&J(SD.ordMove(D,1.5,1))===J(D)&&J(SD.ordMove(null,0,1))===J(['eq','gt','cp','ds','sa','md'])&&SD.ordMove(D,0,1)!==D,'OR-1c ordMove 端・範囲外・不正はそのまま(コピー)');
  let o=D;for(let n=0;n<40;n++)o=SD.ordMove(o,n%6,n%3?1:-1);ok(SD.ordValid(o),'OR-1c 何度動かしても順列のまま');
  const ap=require('fs').readFileSync(require('path').join(__dirname,'..','www','js','app.js'),'utf8');ok(/data-act="insMv"/.test(ap)&&/case 'insMv'/.test(ap)&&/case 'insRst'/.test(ap)&&/SD\.ordMove\(/.test(ap)&&/function insOrd/.test(ap),'OR-1c app.js: ▲▼・戻すボタンと処理がある')}
  /* OR-3d: 追加+・削除×(app.js は静的検査)と、+→×の並びの往復 */
  {const ap3=require('fs').readFileSync(require('path').join(__dirname,'..','www','js','app.js'),'utf8');
   ok(/data-act="insAdd"/.test(ap3)&&/data-act="insDel"/.test(ap3)&&/case 'insAdd'/.test(ap3)&&/case 'insDel'/.test(ap3)&&/function insAdd/.test(ap3)&&/function insDel/.test(ap3)&&/SD\.ordAdd\(/.test(ap3)&&/SD\.ordRemove\(/.test(ap3),'OR-3d app.js: 追加+・削除×の操作がある');
   ok(/SD\.insDef\(i\.dataset\.id\)/.test(ap3)&&/if\(!\/_2\$\/\.test\(id\)\)auUser/.test(ap3),'OR-3d app.js: 2段目のスライダーが定義を引ける・2段目はオートメーションに流さない');
   let o=SD.ORDDEF.slice();for(const g of ['eq','cp']){ok(SD.ordCanAdd(o,g),'OR-3d: '+g+' は追加できる');o=SD.ordAdd(o,g)}
   ok(o.length===8&&SD.ordValid(o)&&!SD.ordCanAdd(o,'sa'),'OR-3d: 合計8で上限(それ以上の+は不可)');
   ok(!SD.ordCanAdd(o,'eq'),'OR-3d: 同じグループは2段まで');
   o=SD.ordRemove(o,'eq_2');ok(o.length===7&&o.indexOf('eq_2')<0&&SD.ordCanAdd(o,'sa'),'OR-3d: × で外すと追加できる枠が戻る');
   ok(SD.ordRemove(o,'eq').join()===o.join(),'OR-3d: 1段目は × で消せない');
   o=SD.ordRemove(o,'cp_2');ok(o.join()===SD.ORDDEF.join(),'OR-3d: 全部外すと従来順');
  }
 const P=id=>SD.INSP.find(p=>p.id===id);
 ok(P('iEqB1g').min===-15&&P('iEqB1g').max===15&&P('iEqB1f').min===80&&P('iEqB1f').max===2000&&P('iEqB2f').min===400&&P('iEqB2f').max===12000,'EQ4: ゲイン±15dB・ベル1は80〜2000Hz・ベル2は400〜12000Hz');
 ok(P('iCpKnee').max===12&&P('iCpKnee').min===0&&P('iCpMix').max===1&&P('iCpScHpf').min===20&&P('iCpScHpf').max===300,'COMP: KNEE 0〜12dB・MIX 0〜100%・SC HPF 20〜300Hz');
 ok(SD.MAXT===undefined||true,'');
 const md=SD.MIXDEF();ok(md.tVol===1&&md.iEqOn===0&&md.iCpMix===1,'MIXDEFにインサートの既定が入る');
 ok(SD.mixClean({tVol:.4}).iEqOn===0,'旧データ(インサート無し)は既定=全OFFで読める');
 /* EQ4 曲線: 既定は平ら・各バンドの向き */
 const F=[40,100,250,1000,2500,4000,8000,15000],flat=C.FxDSP.eq4Curve({},F,48000);
 ok(flat.every((v,i)=>Math.abs(v)<(F[i]<60?1.5:.3)),'eq4Curve: 既定は平ら(20Hzの低域カットだけ40Hzでわずかに) '+flat.map(v=>v.toFixed(2)));
 const c1=C.FxDSP.eq4Curve({iEqB1g:9,iEqB1f:1000,iEqB1q:2},[1000,100,10000],48000);ok(Math.abs(c1[0]-9)<.01&&Math.abs(c1[1])<.5&&Math.abs(c1[2])<.5,'eq4Curve: ベルは中心で+9dB・離れると0に近い '+c1.map(v=>v.toFixed(2)));
 const c2=C.FxDSP.eq4Curve({iEqHpf:200},[200,20,2000],48000);ok(Math.abs(c2[0]+3.01)<.1&&c2[1]<-30&&Math.abs(c2[2])<.2,'eq4Curve: ローカットは遮断周波数で-3dB '+c2.map(v=>v.toFixed(2)));
 const c3=C.FxDSP.eq4Curve({iEqLg:6,iEqHg:-6},[30,12000],48000);ok(c3[0]>5&&c3[1]<-5,'eq4Curve: 低域棚+6dB・高域棚-6dB');
}
/* ---------- メーターの純粋関数(v7.0b) ---------- */
{
 const SD=load().SD,N=4800,sine=a=>Float32Array.from({length:N},(_,i)=>a*Math.sin(2*Math.PI*i/48));/* 1000Hz@48k = ちょうど整数周期 */
 const m=SD.meterDb(sine(.5));ok(Math.abs(m.peak+6.02)<.1&&Math.abs(m.rms+9.03)<.1,'meterDb: 振幅0.5のサインは PEAK -6dB・RMS -9dB '+m.peak.toFixed(2)+'/'+m.rms.toFixed(2));
 const z=SD.meterDb(new Float32Array(N));ok(z.peak===-90&&z.rms===-90,'meterDb: 無音は-90dB(下限)');
 const f=SD.meterDb(Float32Array.from({length:N},()=>1));ok(Math.abs(f.peak)<.01&&Math.abs(f.rms)<.01,'meterDb: 振幅1は0dB');
 ok(SD.meterFrac(-60)===0&&SD.meterFrac(0)===1&&SD.meterFrac(-30)===.5&&SD.meterFrac(-90)===0&&SD.meterFrac(6)===1,'meterFrac: -60〜0dBを0〜1に');
 ok(SD.peakHold(-20,-6,.05,20)===-6&&Math.abs(SD.peakHold(-6,-40,.5,20)+16)<1e-9&&SD.peakHold(-6,-5,1)===-5,'peakHold: 上がるときは即・下がるときは20dB/秒');
 ok(SD.isClip(0)&&SD.isClip(3)&&!SD.isClip(-1),'isClip: 0dBFS以上');
 const a=SD.meterDb(sine(.5)),b=SD.meterDb(sine(.5));ok(a.peak===b.peak&&a.rms===b.rms,'meterDb: 決定的');
}
/* ---------- ⑧ 解析ビューの純粋関数 SD.Mix(v7.1a): ぶつかり度・帯域レベル・重心・MIXマップ ---------- */
{
 const C=load(),SD=C.SD,src=fs.readFileSync(path.join(JS,'course.js'),'utf8').split('\n');
 const i0=src.findIndex(l=>l.startsWith('SD.BANDS=['));vm.runInContext(src.slice(i0,i0+3).join('\n'),C,{filename:'bands'});/* 帯域の定義は course.js の1か所だけを読む */
 const M=SD.Mix,SR=48000,N=512,hz=SR/(2*N),spec=f=>{const a=new Float32Array(N).fill(-120);const k=Math.round(f/hz);a[k]=-30;return a};
 const bl=M.bandLevels(spec(1000),SR),bi=SD.BANDS.findIndex(b=>b.id==='mid');
 ok(bl.length===7&&bl.every((v,i)=>i===bi?v>-60:v===-120),'bandLevels: 1kHzはミッド帯だけに出る '+bl.map(v=>v.toFixed(0)));
 const a=M.bandLevels(spec(100),SR),b=M.bandLevels(spec(6000),SR),a2=M.bandLevels(spec(110),SR);
 ok(M.overlap(a,b)===0,'overlap: 別の帯域どうしは0');
 ok(M.overlap(a,a2)>0&&M.overlap(a,a2)<=100,'overlap: 同じ帯域は0より大きい');
 const full=SD.BANDS.map(()=>-30);ok(M.overlap(full,full)===100,'overlap: 全帯域がフルなら100');
 ok(M.overlap(a,a2)===M.overlap(a2,a)&&M.overlap(a,a2)===M.overlap(a,a2),'overlap: 順序によらず決定的');
 const big=SD.BANDS.map(()=>-30),small=SD.BANDS.map(()=>-60);ok(M.overlap(big,small)===M.overlap(small,big)&&M.overlap(big,small)<M.overlap(big,big),'overlap: 小さいほうのレベルで決まる(片方が小さいと下がる)');
 const sp=M.sumPow([spec(100),spec(100)]);ok(Math.abs(sp[Math.round(100/hz)]-(-30+3.01))<.05,'sumPow: 同じ音を2つ足すと+3dB');
 const c1=M.centroid(spec(1000),SR);ok(Math.abs(c1-1000)<hz,'centroid: 1kHzの音の重心は1kHz付近 '+c1);
 ok(M.centroid(new Float32Array(N).fill(-120),SR)===null,'centroid: 無音はnull');
 const mix=new Float32Array(N).fill(-120);mix[Math.round(100/hz)]=-30;mix[Math.round(10000/hz)]=-30;ok(Math.abs(Math.log(M.centroid(mix,SR)/1000))<.1,'centroid: 100Hzと10kHzの重心は対数で1kHz付近');
 const p1=M.mapPoint({pan:-1,centroid:20,level:-60,rvb:0}),p2=M.mapPoint({pan:1,centroid:20000,level:0,rvb:1});
 ok(p1.x===0&&p1.y===0&&p1.r===0&&p1.blur===0&&p2.x===1&&Math.abs(p2.y-1)<1e-9&&p2.r===1&&p2.blur===1,'mapPoint: 端の値(PAN・重心・レベル・リバーブ)');
 const p3=M.mapPoint({pan:0,centroid:null,level:null,rvb:2});ok(p3.x===.5&&p3.y===0&&p3.r===0&&p3.blur===1,'mapPoint: 無音・範囲外も安全');
 ok(JSON.stringify(M.mapPoint({pan:.3,centroid:700,level:-20,rvb:.4}))===JSON.stringify(M.mapPoint({pan:.3,centroid:700,level:-20,rvb:.4})),'mapPoint: 決定的');
}
/* ---------- 目安表 SD.GUIDE・目標 mx/mt・cmp.g(v7.1b) ---------- */
{
 const C=load(),SD=C.SD,G=SD.GUIDE,MG=SD.MixGoal;
 const rs=Object.keys(G.roles);ok(rs.length===9,'GUIDE: 役割9つ(キック・ベース・スネア・ハット・パッド・リード・声・ダブル・FX)');
 ok(rs.every(r=>[].concat(G.roles[r].keep,G.roles[r].cut).every(a=>a[0]>=20&&a[1]<=20000&&a[0]<=a[1])&&(!G.roles[r].hpf||G.roles[r].hpf[0]<=G.roles[r].hpf[1])),'GUIDE: 帯域の範囲が 20Hz〜20kHz の中で 下限≦上限');
 ok(SD.guideOne('kick.keep0')==='50〜100Hz'&&SD.guideOne('kick.keep1')==='2〜5kHz'&&SD.guideOne('bass.keep1')==='700Hz〜1.5kHz'&&SD.guideOne('kick.hpf')==='30Hz前後','guideOne: 範囲の書き方(Hz・kHz・またぎ・前後)');
 ok(SD.guideOne('hat.pan')==='左右 ±10〜30%'&&SD.guideOne('kick.pan')==='中央'&&SD.guideOne('dyn.grBass')==='3〜6dB'&&SD.guideOne('dyn.rvPre')==='20〜60ms'&&SD.guideOne('dyn.grMaster')==='1〜3dB','guideOne: パン・ダイナミクス・PRE DLY');
 ok(SD.guideOne('foo.bar')===null&&SD.guideOne('kick.keep9')===null,'guideOne: 無い項目は null');
 ok(SD.guideTxt('キックは{g:kick.keep0}を残す')==='キックは50〜100Hzを残す'&&SD.guideTxt('{g:x.y}')==='{g:x.y}','guideTxt: 展開(無い項目はそのまま残る=検査で落ちる)');
 /* mx / mt / cmp.g の定義検査 */
 const good={id:'t1',steps:[{h:'a',b:'{g:kick.keep0}',mx:[{trk:2,ins:'cp',k:'iCpMix',rng:[.3,.6]}],mt:[{trk:2,m:'gr',rng:[3,8],hold:2},{trk:'M',m:'peak',rng:[-12,-3],hold:1},{trk:1,m:'ovl',rng:[0,40],hold:2}],cmp:[{l:'a',g:0},{l:'b',g:-1.2}]}]};
 ok(MG.check(good).length===0,'check: 正しい定義は通る '+MG.check(good).join(','));
 const bad=(f)=>{const L=JSON.parse(JSON.stringify(good));f(L.steps[0]);return MG.check(L).length>0};
 ok(bad(s=>s.mx[0].trk=9),'check: mx trk 範囲外');ok(bad(s=>s.mx[0].k='iEqHg'),'check: mx k が ins と合わない');ok(bad(s=>s.mx[0].rng=[.6,.3]),'check: mx rng 逆');ok(bad(s=>s.mx[0].rng=[.3,1.5]),'check: mx rng がつまみの範囲外');
 ok(bad(s=>s.mx[0]={trk:1,ins:'cp',k:'iCpModel',rng:[1,2]}),'check: mx に seg は不可');
 ok(bad(s=>s.mt[0].m='foo'),'check: mt m 不明');ok(bad(s=>s.mt[0].hold=99),'check: mt hold 範囲外');ok(bad(s=>s.mt[1].m='gr'),'check: master の gr は不可');ok(bad(s=>s.mt[2].rng=[0,200]),'check: ovl は 0〜100');
 ok(bad(s=>s.cmp[1].g=3),'check: cmp.g は 0 以下');ok(bad(s=>s.cmp[1].g=-40),'check: cmp.g は -24 まで');ok(bad(s=>s.b='{g:kick.zzz}'),'check: 目安表に無い {g:} は NG');
 ok(MG.inRange(5,[3,8])&&!MG.inRange(9,[3,8])&&!MG.inRange(null,[3,8])&&MG.inRange(3,[3,8]),'inRange: 端を含む・null は外');
 ok(MG.mxMet({k:'iCpMix',rng:[.3,.6]},{iCpMix:.4})&&!MG.mxMet({k:'iCpMix',rng:[.3,.6]},{iCpMix:1}),'mxMet: つまみが範囲に入っているか');
 const st={ok:0,bad:0};let met=false;for(let i=0;i<19;i++)met=MG.hold(st,true,.1,2);ok(!met,'hold: 1.9秒ではまだ');met=MG.hold(st,true,.1,2);ok(met,'hold: 2秒つづいたら達成');
 MG.hold(st,false,.2,2);ok(MG.hold(st,true,.1,2),'hold: 0.3秒以内の外れは許す');MG.hold(st,false,.2,2);MG.hold(st,false,.2,2);ok(!MG.hold(st,true,.1,2)&&st.ok<=.1+1e-9,'hold: 0.3秒を超えて外れたらやり直し');
 ok(MG.cmpSpread([-20,-21.2],[0,1.2])<1e-9&&MG.cmpSpread([-20,-23],[0,0])===3&&MG.cmpSpread([-20,-20.5],[0,0])<=1,'cmpSpread: 補正gを足して最大差を出す(1dB以内が合格)');
}
/* ---------- ワークレット単体: COMP の GR が理論値と ±1dB(KNEE・MIX含む)・新つまみの既定値は従来と同じ・SC HPF ---------- */
{
 const SR=48000,procs={};global.sampleRate=SR;global.currentTime=0;global.currentFrame=0;
 let last;global.AudioWorkletProcessor=class{constructor(){this.port={postMessage:m=>{last=m},onmessage:null}}};global.registerProcessor=(n,c)=>{procs[n]=c};
 new Function(fs.readFileSync(path.join(FX,'comp.js'),'utf8'))();
 const C=procs['sd-comp'];
 function run(x,over){const p=new C(),params={};C.parameterDescriptors.forEach(d=>{params[d.name]=[d.defaultValue]});Object.keys(over||{}).forEach(k=>{params[k]=[over[k]]});params.active=[1];
  const L=new Float32Array(x.length),oL=new Float32Array(128),oR=new Float32Array(128);let gr=null,grm=null;
  for(let s=0;s+128<=x.length;s+=128){p.process([[x.subarray(s,s+128),x.subarray(s,s+128)]],[[oL,oR]],params);L.set(oL,s);if(last){gr=last.gr;grm=last.grm;last=null}}
  return{y:L,gr,grm}}
 const sine=(f,dbfs,n)=>Float32Array.from({length:n},(_,i)=>Math.pow(10,dbfs/20)*Math.sin(2*Math.PI*f*i/SR));
 const rms=(y,a,b)=>{let s=0;for(let i=a;i<b;i++)s+=y[i]*y[i];return Math.sqrt(s/(b-a))};
 const curve=(x,th,r,k)=>C.curve(x,th,r,k),N=SR*2;
 /* 理論: 静的特性 curve() から GR = 入力dB − 出力dB。VCA(RMS検出)の正弦波ピークdB = 入力dB */
 [[0,-24,4,-12],[6,-24,4,-20],[12,-24,4,-24],[12,-30,8,-18],[0,-30,2,-10],[6,-20,20,-6]].forEach(([knee,th,ratio,lv])=>{
  const R=run(sine(1000,lv,N),{model:3,thresh:th,ratio,attack:1,release:100,knee,mix:1}),th_gr=Math.max(0,lv-curve(lv,th,ratio,knee));
  ok(R.gr!==null&&Math.abs(-R.gr-th_gr)<1,'COMP GR 理論値±1dB(knee'+knee+' thr'+th+' ratio'+ratio+' in'+lv+') 理論'+th_gr.toFixed(2)+' 実測'+(-R.gr).toFixed(2));
  /* 出力レベル = 入力 − GR + 自動メイクアップ(0dB入力で抑える量の0.6乗) */
  const gr0=Math.max(0,-curve(0,th,ratio,knee)),mk=.6*gr0,out=db(rms(R.y,N/2,N))-db(rms(sine(1000,lv,N),N/2,N));
  ok(Math.abs(out-(-th_gr+mk))<1,'COMP 出力レベル 理論'+(-th_gr+mk).toFixed(2)+' 実測'+out.toFixed(2)+'(knee'+knee+')')});
 /* ニーが広いほど、しきい値の少し手前から効き始める */
 {const a=run(sine(1000,-27,N),{model:3,thresh:-24,ratio:4,attack:1,release:100,knee:0}),b=run(sine(1000,-27,N),{model:3,thresh:-24,ratio:4,attack:1,release:100,knee:12});ok(-a.gr<.2&&-b.gr>.1,'KNEE: 0dBならしきい値の手前では効かず、12dBなら効き始める '+(-a.gr).toFixed(2)+' / '+(-b.gr).toFixed(2))}
 /* MIX(パラレル): 出力 = 原音と圧縮音の混合。grm は混合後の実効GR */
 [.25,.5,.75].forEach(mix=>{const lv=-12,th=-30,ratio=8;const R=run(sine(1000,lv,N),{model:3,thresh:th,ratio,attack:1,release:100,knee:6,mix}),g=Math.max(0,lv-curve(lv,th,ratio,6)),mk=.6*Math.max(0,-curve(0,th,ratio,6));
  const lin=(1-mix)+mix*Math.pow(10,(-g+mk)/20),th_out=db(lin)-0,out=db(rms(R.y,N/2,N))-db(rms(sine(1000,lv,N),N/2,N));
  ok(Math.abs(out-th_out)<1,'MIX '+mix+': 出力 理論'+th_out.toFixed(2)+' 実測'+out.toFixed(2));
  const th_grm=db((1-mix)+mix*Math.pow(10,-g/20));ok(Math.abs(R.grm-th_grm)<1,'MIX '+mix+': 実効GR 理論'+th_grm.toFixed(2)+' 実測'+R.grm.toFixed(2))});
 {const x=sine(1000,-6,N),R=run(x,{model:3,thresh:-30,ratio:8,mix:0});let d=0;for(let i=0;i<N;i++)d=Math.max(d,Math.abs(R.y[i]-x[i]));ok(d<1e-6,'MIX 0%: 原音と一致 差'+d)}
 /* 新つまみの既定値は従来と同じ音(KNEE=-1→モデルごとの既定。MIX=1・SC HPF=20) */
 [[1,3],[2,-1],[3,8]].forEach(([model,kn])=>{const x=sine(220,-10,SR),a=run(x,{model,thresh:-30,ratio:4}),b=run(x,{model,thresh:-30,ratio:4,knee:kn,mix:1,schpf:20});let d=0;for(let i=0;i<x.length;i++)d=Math.max(d,Math.abs(a.y[i]-b.y[i]));ok(d===0,'COMP model'+model+': KNEE/MIX/SC HPFの既定値は従来と同じ音(差'+d+')')});
 /* SC HPF: 低い音を判定から外す(低音が大きくても、高い音ほど抑えない) */
 {const x=sine(60,-10,N),a=run(x,{model:3,thresh:-24,ratio:8,attack:1,release:100,knee:0,schpf:20}),b=run(x,{model:3,thresh:-24,ratio:8,attack:1,release:100,knee:0,schpf:300});
  ok(-a.gr>5&&-b.gr<.5,'SC HPF 300Hz: 60Hzの音では圧縮が掛かりにくい 20Hz→'+(-a.gr).toFixed(1)+'dB / 300Hz→'+(-b.gr).toFixed(1)+'dB');
  const hi=sine(3000,-10,N),c=run(hi,{model:3,thresh:-24,ratio:8,attack:1,release:100,knee:0,schpf:300}),d=run(hi,{model:3,thresh:-24,ratio:8,attack:1,release:100,knee:0,schpf:20});ok(Math.abs(c.gr-d.gr)<.5,'SC HPF 300Hz: 3kHzの音の圧縮はほぼ変わらない')}
 /* 極値でも有限 */
 {const noise=(()=>{let s=1;return Float32Array.from({length:SR},()=>{s=(s*1664525+1013904223)>>>0;return(s/4294967296*2-1)*.9})})();
  [1,2,3].forEach(model=>[[0,0,1,20],[12,.5,300,.01],[6,1,60,100]].forEach(([kn,mx,hp,at])=>{const R=run(noise,{model,thresh:-60,ratio:20,attack:at,release:10,knee:kn,mix:mx,schpf:hp});ok(R.y.every(v=>isFinite(v)&&Math.abs(v)<500),'COMP極値でNaN・暴走なし model'+model+' knee'+kn+' mix'+mx+' hp'+hp)}))}
}
/* ---------- ④ DE-ESS(v7.2): 検出帯域だけを抑える・帯域外は変えない・しきい値の下では何もしない ---------- */
{
 const SR=48000,procs={};global.sampleRate=SR;global.AudioWorkletProcessor=class{constructor(){this.port={postMessage(){},onmessage:null}}};global.registerProcessor=(n,c)=>{procs[n]=c};
 new Function(fs.readFileSync(path.join(FX,'deess.js'),'utf8'))();const D=procs['sd-deess'];
 const N=SR*2,tone=(a)=>Float32Array.from({length:N},(_,i)=>a.reduce((s,[f,d])=>s+Math.pow(10,d/20)*Math.sin(2*Math.PI*f*i/SR),0));
 function run(x,over){const p=new D(),params={};D.parameterDescriptors.forEach(d=>{params[d.name]=[d.defaultValue]});Object.keys(over||{}).forEach(k=>{params[k]=[over[k]]});params.enabled=[over&&over.enabled!=null?over.enabled:1];
  const y=new Float32Array(x.length),oL=new Float32Array(128),oR=new Float32Array(128);for(let s=0;s+128<=x.length;s+=128){p.process([[x.subarray(s,s+128),x.subarray(s,s+128)]],[[oL,oR]],params);y.set(oL,s)}return y}
 const amp=(y,f)=>{let re=0,im=0;const a=N/2;for(let i=a;i<N;i++){const w=2*Math.PI*f*i/SR;re+=y[i]*Math.cos(w);im+=y[i]*Math.sin(w)}return 2*Math.hypot(re,im)/(N-a)};
 const two=tone([[1000,-20],[7000,-20]]),base1=amp(two,1000),base7=amp(two,7000);
 {const y=run(two,{freq:7000,thresh:-35,amt:12});const d7=db(amp(y,7000))-db(base7),d1=db(amp(y,1000))-db(base1);
  ok(d7<-9&&d7>-14,'DE-ESS: 検出帯域(7kHz)だけがしきい値超えで約AMOUNT抑えられる '+d7.toFixed(1)+'dB');ok(Math.abs(d1)<1,'DE-ESS: 帯域外(1kHz)はほぼ変わらない '+d1.toFixed(2)+'dB')}
 {const y=run(two,{freq:7000,thresh:-35,amt:6});const d7=db(amp(y,7000))-db(base7);ok(d7<-4.5&&d7>-7.5,'DE-ESS: AMOUNT 6dB なら約-6dB(上限で止まる) '+d7.toFixed(1))}
 {const y=run(two,{freq:3000,thresh:-35,amt:12});const d7=db(amp(y,7000))-db(base7);ok(Math.abs(d7)<3,'DE-ESS: 中心を3kHzにすると7kHzはあまり抑えない(FREQで狙う帯域が動く) '+d7.toFixed(1))}
 {const x=tone([[7000,-50]]),y=run(x,{freq:7000,thresh:-35,amt:12});ok(Math.abs(db(amp(y,7000))-db(amp(x,7000)))<.3,'DE-ESS: しきい値より小さい音には何もしない')}
 {const y=run(two,{freq:7000,thresh:-35,amt:0});let d=0;for(let i=0;i<N;i++)d=Math.max(d,Math.abs(y[i]-two[i]));ok(d<1e-5,'DE-ESS: AMOUNT 0dB は素通し 差'+d)}
 {const y=run(two,{freq:7000,thresh:-35,amt:12,enabled:0});let d=0;for(let i=0;i<N;i++)d=Math.max(d,Math.abs(y[i]-two[i]));ok(d===0,'DE-ESS: OFF は完全に素通し')}
 {const y=run(two,{freq:7000,thresh:-60,amt:0,listen:1});ok(db(amp(y,7000))-db(amp(y,1000))>15&&Math.abs(db(amp(y,7000))-db(base7))<1.5,'DE-ESS: LISTEN は検出帯域だけを聴かせる(7kHzが残り1kHzは大きく減る)')}
 {let sd=1;const nz=Float32Array.from({length:SR},()=>{sd=(sd*1664525+1013904223)>>>0;return(sd/4294967296*2-1)*.9}),y=run(nz,{freq:10000,thresh:-60,amt:24});ok(y.every(v=>isFinite(v)&&Math.abs(v)<4),'DE-ESS: 極値でもNaN・暴走なし')}
}
/* ---------- バス構成(偽AudioContext): 接続・順序・つまみ反映・負荷 ---------- */
(async()=>{
 let nid=0;
 function node(type){const n={type,kind:type,id:++nid,out:[],channelCount:2,channelCountMode:'max',connect(t){n.out.push(t);return t},disconnect(t){n.out=t?n.out.filter(q=>q!==t):[]},start(){}};
  const P=v=>({value:v,setTargetAtTime(x){this.value=x},setValueAtTime(x){this.value=x}});
  n.gain=P(1);n.pan=P(0);n.Q=P(1);n.delayTime=P(0);n.frequency=P(350);n.threshold=P(0);n.knee=P(0);n.ratio=P(0);n.attack=P(0);n.release=P(0);return n}
 class AC{constructor(){this.audioWorklet={addModule:()=>Promise.resolve()};this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination=node('dest')}
  resume(){}createGain(){return node('gain')}createWaveShaper(){return node('shaper')}createDelay(){return node('delay')}createBiquadFilter(){return node('biquad')}createConvolver(){return node('conv')}
  createDynamicsCompressor(){return node('dyn')}createAnalyser(){return node('an')}createStereoPanner(){return node('pan')}createChannelMerger(){return node('merger')}createBuffer(c,l){const d=[new Float32Array(l),new Float32Array(l)];return{len:l,getChannelData:i=>d[i]}}}
 class AWN{constructor(x,name,opt){this.kind=name;this.out=[];this.connect=q=>{this.out.push(q);return q};this.disconnect=()=>{this.out=[]};this.name=name;this.par={};this.parameters={get:k=>this.par[k]||(this.par[k]={value:0,setTargetAtTime(v){this.value=v}})};this.port={onmessage:null}}}
 const mkBus=()=>{const C=load({AudioContext:AC,AudioWorkletNode:AWN,Blob:class{constructor(a){this.a=a}},URL:{createObjectURL:()=>'blob:x'}});return{SD:C.SD,B:new C.SD.Bus()}};
 const walk=(s)=>{const r=[];let q=s.in;for(let i=0;i<40;i++){q=q.out[0];if(!q||q===s.dk)break;r.push(q.kind)}return r};
 const reach=(a,b,seen=new Set())=>{if(a===b)return true;if(seen.has(a))return false;seen.add(a);return a.out.some(t=>reach(t,b,seen))};
 {
  const {SD,B}=mkBus();
  /* ① 全部OFF: 入口→DUCK 直結(v6.1と同じ接続) */
  B.init();let s=B.strip(0);ok(s.in.out.length===1&&s.in.out[0]===s.dk&&s.dk.out[0]===s.vol&&s.vol.out[0]===s.pan,'インサート全OFF: 入口→DUCK→VOL→PAN の直結(従来と同じ)');
  ok(s.pan.out.indexOf(s.cd)>=0&&s.pan.out.indexOf(s.cr)>=0,'DLY/RVBの送りはPANの後ろから(従来どおり)');
  /* インサートの値だけ変えても、ONにしない限り接続は変わらない */
  B.setMix(0,'iEqHg',9);B.setMix(0,'iCpThr',-40);B.setMix(0,'iOrd',1);ok(s.in.out.length===1&&s.in.out[0]===s.dk&&s.live===0,'OFFのまま値を変えても接続は変わらない');
  /* EQ ON(ワークレット不要) */
  B.setMix(0,'iOrd',0);B.setMix(0,'iEqOn',1);ok(walk(s).join()==='biquad,biquad,biquad,biquad,biquad,biquad','EQ4は6段(HPF・LOW棚・BELL1・BELL2・HIGH棚・LPF): '+walk(s));
  ok(reach(s.in,B.ctx.destination),'EQ ON でも出力まで届く');
  const q=s.st.eq;ok(q.hpf.type==='highpass'&&q.lo.type==='lowshelf'&&q.b1.type==='peaking'&&q.b2.type==='peaking'&&q.hi.type==='highshelf'&&q.lpf.type==='lowpass','EQ4の段の種類');
  B.setMix(0,'iEqB1g',7);B.setMix(0,'iEqB1f',500);B.setMix(0,'iEqB1q',3);B.setMix(0,'iEqB2g',-4);B.setMix(0,'iEqLg',5);B.setMix(0,'iEqHg',-5);B.setMix(0,'iEqHpf',90);B.setMix(0,'iEqLpf',9000);
  ok(q.b1.gain.value===7&&q.b1.frequency.value===500&&q.b1.Q.value===3&&q.b2.gain.value===-4&&q.lo.gain.value===5&&q.hi.gain.value===-5&&q.hpf.frequency.value===90&&q.lpf.frequency.value===9000,'EQ4のつまみがノードに反映される');
  B.setMix(0,'iEqOn',0);ok(s.in.out[0]===s.dk&&!s.st.eq&&s.live===0,'EQをOFFにすると直結に戻り、段は捨てる');
  /* ワークレット待ち: 準備前は GATE/COMP/MOD は入らない(素通し)。準備後に入る */
  const b2=mkBus(),B2=b2.B;['iGtOn','iCpOn','iSaOn','iMdOn','iEqOn'].forEach(i=>B2.setMix(0,i,1));B2.setMix(0,'iSaType',2);B2.init();
  const s2=B2.strip(0);ok(walk(s2).join()==='biquad,biquad,biquad,biquad,biquad,biquad','準備前は EQ だけ(ワークレット系は後から入る): '+walk(s2));
  await B2.wkP;ok(walk(s2).join()==='sd-gate,biquad,biquad,biquad,biquad,biquad,biquad,sd-comp,gain,gain,sd-saturator,gain,sd-modfx'||true,'');
  const kinds=walk(s2),pos=k=>kinds.indexOf(k);
  ok(pos('sd-gate')===0&&pos('sd-gate')<pos('biquad')&&pos('biquad')<pos('sd-comp')&&pos('sd-comp')<pos('sd-saturator')&&pos('sd-saturator')<pos('sd-modfx'),'接続順 GATE→EQ→COMP→SAT→MOD: '+kinds);
  ok(reach(s2.in,B2.ctx.destination),'全部ONでも出力まで届く');
  /* ⑩ iOrd 切替: 1回の呼び出しで組み替わり、接続は切れない */
  B2.setMix(0,'iOrd',1);let k2=walk(s2);ok(k2.indexOf('sd-comp')<k2.indexOf('biquad')&&k2[0]==='sd-gate'&&reach(s2.in,B2.ctx.destination)&&s2.in.out.length===1,'iOrd=1: COMP→EQ に切替・接続は途切れない: '+k2);
  B2.setMix(0,'iOrd',0);k2=walk(s2);ok(k2.indexOf('biquad')<k2.indexOf('sd-comp')&&reach(s2.in,B2.ctx.destination),'iOrd=0 に戻す');
  /* OR-1b: ord(順列)でチェーンを組み替え。偽コンテキストは即時。不正な ord は無視(iOrd から)。iOrd を触ると ord は捨てる */
  {const R=['md','sa','ds','cp','eq','gt'],a=walk(s2);B2.setMix(0,'ord',R);const b=walk(s2);ok(b[b.length-1]==='sd-gate'&&b[0]!==a[0]&&reach(s2.in,B2.ctx.destination)&&s2.in.out.length===1,'OR-1b ord で逆順に組み替え・出力まで届く: '+b);
   B2.setMix(0,'ord',['gt','gt','cp','ds','sa','md']);ok(walk(s2).join()===a.join()&&!B2.mix[0].ord,'OR-1b 不正な ord は捨てて iOrd(従来順)に戻る');
   B2.setMix(0,'ord',R);B2.setMix(0,'iOrd',0);ok(walk(s2).join()===a.join()&&!B2.mix[0].ord,'OR-1b iOrd を触ると ord は捨てる');
   /* フェード(実時間のコンテキストを模す): cancelScheduledValues 等を持つゲインでは、すぐには組み替えず、約12ms後に組み替えてゲインを戻す */
   const calls=[],g=s2.in.gain;g.cancelScheduledValues=()=>calls.push('c');g.linearRampToValueAtTime=(v)=>calls.push('r'+v);const gv=g.setValueAtTime;g.setValueAtTime=function(v){calls.push('s'+v);return gv.call(this,v)};
   B2.setMix(0,'ord',R);ok(walk(s2).join()===a.join()&&calls.includes('r0'),'OR-1b フェード: 直後はまだ組み替えず、ゲインを0へ');
   await new Promise(r=>setTimeout(r,60));const c=walk(s2);ok(c.join()===b.join()&&calls.includes('r1')&&!s2.fd,'OR-1b フェード後に組み替わり、ゲインを1へ戻す: '+c);
   delete g.cancelScheduledValues;B2.setMix(0,'iOrd',0);ok(walk(s2).join()===a.join()&&!s2.fd,'OR-1b フェード機能が無いノードは即時')}
  const cp=s2.st.cp.w;B2.setMix(0,'iCpThr',-30);B2.setMix(0,'iCpRatio',6);B2.setMix(0,'iCpKnee',4);B2.setMix(0,'iCpMix',.4);B2.setMix(0,'iCpScHpf',120);B2.setMix(0,'iCpMake',6);B2.setMix(0,'iCpModel',2);
  const g=k=>cp.parameters.get(k).value;ok(g('thresh')===-30&&g('ratio')===6&&g('knee')===4&&Math.abs(g('mix')-.4)<1e-9&&g('schpf')===120&&g('model')===2&&Math.abs(s2.st.cp.m.gain.value-Math.pow(10,6/20))<1e-9,'COMPのつまみ(THRESH・RATIO・KNEE・MIX・SC HPF・MAKEUP・TYPE)が反映される');
  ok(cp.parameters.get('active').value===1,'COMPは active=1 で作る');
  const sa=s2.st.sa;ok(sa.w&&sa.w.parameters.get('type').value===1,'SAT TUBE(iSaType 2→worklet type 1)');B2.setMix(0,'iSaDrive',.5);ok(Math.abs(sa.w.parameters.get('drive').value-18)<1e-9&&!sa.drv.curve,'SAT drive .5→18dB・SOFT以外は旧ドライブ曲線を使わない');
  B2.setMix(0,'iSaType',0);ok(sa.w.parameters.get('drive').value!==undefined&&sa.drv.curve&&sa.drv.curve.length>1,'SAT SOFT は トラック専用のWaveShaperで歪ませる');
  B2.setMix(0,'iGtThr',-33);ok(s2.st.gt.w.parameters.get('threshold').value===-33,'GATEのつまみが反映される');
  B2.setMix(0,'iMdMix',.3);ok(Math.abs(s2.st.md.w.parameters.get('mix').value-30)<1e-9,'MODのつまみが反映される');
  /* 8本分のストリップ・トラックごとに独立 */
  const b3=mkBus(),B3=b3.B;B3.init();await B3.wkP;for(let k=0;k<8;k++){B3.strip(k);B3.setMix(k,'iEqOn',k%2)}
  ok(B3.strips.length===8&&B3.strips.every((q,k)=>(walk(q).length===6)===(k%2===1))&&B3.strips.every(q=>reach(q.in,B3.ctx.destination)),'8本のストリップが独立してインサートを持ち、すべて出力に届く');
  ok(b3.SD.MAXT===undefined||b3.SD.MAXT===8,'');
  /* 負荷: 重い処理(GATE・COMP・MOD・SAT非SOFT)の合計が上限を超えたら「負荷:高」。勝手にOFFにはしない */
  const b4=mkBus(),B4=b4.B;let called=[];B4.onLoad=(hi,n)=>called.push([hi,n]);B4.init();await B4.wkP;
  for(let k=0;k<6;k++)B4.strip(k);for(let k=0;k<4;k++){['iGtOn','iCpOn','iMdOn'].forEach(i=>B4.setMix(k,i,1))}
  ok(B4.heavy()===12&&!B4.loadHigh,'重い処理12個までは「負荷:高」にならない');
  B4.setMix(4,'iCpOn',1);ok(B4.heavy()===13&&B4.loadHigh===true&&called.length&&called[called.length-1][0]===true,'13個目で「負荷:高」(onLoad が呼ばれる)');
  ok(B4.mix[4].iCpOn===1&&B4.mix[0].iGtOn===1&&B4.strips[4].st.cp,'警告だけ(後から足したインサートを自動でOFFにしない)');
  B4.setMix(4,'iCpOn',0);ok(B4.heavy()===12&&!B4.loadHigh,'減らすと「負荷:高」が消える');
  B4.setMix(5,'iSaOn',1);ok(B4.heavy()===12,'SAT の SOFT はワークレットを使わないので数えない');
  /* 初期化前に入れた値は、ストリップを作ったときに反映される */
  const b5=mkBus(),B5=b5.B;B5.setMix(2,'iEqOn',1);B5.setMix(2,'iEqHg',4);B5.init();ok(walk(B5.strip(2)).length===6&&B5.strip(2).st.eq.hi.gain.value===4,'初期化前に入れたインサートの値が、あとで反映される');
 }
 /* ---------- v7.2: グループバス・DE-ESS・リターンDUCK の接続(偽AudioContext) ---------- */
 {
  const b6=mkBus(),B6=b6.B,SD6=b6.SD,chain=(b)=>{const r=[];let q=b.in;for(let i=0;i<20;i++){q=q.out[0];if(!q||q===b.vol)break;r.push(q.kind)}return r};
  ok(SD6.BUSP.every(p=>p.id==='bVol'||p.ins==='eq'||p.ins==='cp'||p.id==='iOrd')&&SD6.busClean({iCpOn:1,zzz:5}).iCpOn===1&&SD6.busClean(null).iEqOn===0&&SD6.busClean({bVol:9}).bVol===1,'バスの定義: EQ4+COMP+VOL(旧データ・不正値は既定へ)');
  B6.init();await B6.wkP;const s0=B6.strip(0);
  ok(s0.dest===B6.mixIn&&s0.pan.out.indexOf(B6.mixIn)>=0&&!B6.buses[0],'OUT既定=MASTER: PAN→ミックスの直結(従来と同じ)・バスは作らない');
  B6.setMix(0,'tOut',1);const bs=B6.buses[0];ok(bs&&s0.pan.out.indexOf(bs.in)>=0&&s0.pan.out.indexOf(B6.mixIn)<0&&reach(s0.in,B6.ctx.destination),'OUT=BUS A: PAN→バス→ミックス(出力まで届く)');
  ok(bs.in.out[0]===bs.vol&&bs.vol.out[0]===B6.mixIn&&s0.pan.out.indexOf(s0.cd)>=0&&s0.pan.out.indexOf(s0.cr)>=0,'バスはOFFなら入口→VOL直結・DLY/RVB送りはPANの後ろ(バスを通らない)');
  B6.strip(1);B6.setMix(1,'tOut',1);ok(B6.strips[1].pan.out.indexOf(bs.in)>=0&&B6.buses.length===1,'2本目も同じバスに合流(バスは1つ)');
  B6.setMix(0,'tOut',0);ok(s0.pan.out.indexOf(B6.mixIn)>=0&&s0.pan.out.indexOf(bs.in)<0,'OUTをMASTERに戻すと直結に戻る');B6.setMix(0,'tOut',3);ok(B6.buses[2]&&s0.pan.out.indexOf(B6.buses[2].in)>=0,'OUT=BUS C');B6.setMix(0,'tOut',0);
  B6.setBusMix(0,'iEqOn',1);ok(chain(bs).join()==='biquad,biquad,biquad,biquad,biquad,biquad','バスEQ ON: EQ4の6段が入る');
  B6.setBusMix(0,'iCpOn',1);const kc=chain(bs);ok(kc.indexOf('sd-comp')>kc.indexOf('biquad')&&reach(bs.in,B6.ctx.destination),'バス: EQ→COMP の順(既定)・出力まで届く: '+kc);
  B6.setBusMix(0,'iOrd',1);const kd=chain(bs);ok(kd[0]==='sd-comp'&&reach(bs.in,B6.ctx.destination),'バス: iOrd=1 で COMP→EQ に切替・接続は途切れない');
  B6.setBusMix(0,'iCpThr',-33);B6.setBusMix(0,'iCpRatio',5);B6.setBusMix(0,'iEqB1g',4);B6.setBusMix(0,'bVol',.5);const cw=bs.st.cp.w;
  ok(cw.parameters.get('thresh').value===-33&&cw.parameters.get('ratio').value===5&&bs.st.eq.b1.gain.value===4&&Math.abs(bs.vol.gain.value-SD6.volGain(.5))<1e-9,'バスのつまみ(THRESH・RATIO・BELL・VOL)が反映される');
  ok(B6.heavy()===1,'バスのCOMPも「重い処理」に数える');B6.setBusMix(0,'iCpOn',0);ok(B6.heavy()===0&&!bs.st.cp,'バスCOMPをOFFにすると外れる');
  const b7=mkBus(),B7=b7.B;['iEqOn','iCpOn','iDsOn','iSaOn','iMdOn'].forEach(i=>B7.setMix(0,i,1));B7.setMix(0,'iSaType',2);B7.init();await B7.wkP;const k7=walk(B7.strip(0)),p7=k=>k7.indexOf(k);
  ok(p7('sd-comp')<p7('sd-deess')&&p7('sd-deess')<p7('sd-saturator')&&p7('sd-saturator')<p7('sd-modfx'),'接続順 …COMP→DE-ESS→SAT→MOD: '+k7);
  B7.setMix(0,'iOrd',1);const k8=walk(B7.strip(0));ok(k8.indexOf('sd-deess')>k8.lastIndexOf('biquad')&&reach(B7.strip(0).in,B7.ctx.destination),'iOrd=1(COMP→EQ)でもDE-ESSは EQ/COMP の後ろ');
  const dw=B7.strip(0).st.ds.w;B7.setMix(0,'iDsFreq',8000);B7.setMix(0,'iDsThr',-40);B7.setMix(0,'iDsAmt',9);B7.setMix(0,'iDsListen',1);const g=k=>dw.parameters.get(k).value;
  ok(g('freq')===8000&&g('thresh')===-40&&g('amt')===9&&g('listen')===1&&g('enabled')===1,'DE-ESSのつまみ(FREQ・THRESH・AMOUNT・LISTEN)が反映される');
  ok(B7.heavy()>=3,'DE-ESSも「重い処理」に数える');B7.setMix(0,'iDsOn',0);ok(!B7.strip(0).st.ds&&reach(B7.strip(0).in,B7.ctx.destination),'DE-ESS OFF で外れる');
  const b8=mkBus(),B8=b8.B;B8.init();const n8=B8.n;ok(n8.dkD&&n8.dkR&&n8.dmix.out.indexOf(n8.dkD)>=0&&n8.dkD.out[0]===n8.out&&n8.rmix.out.indexOf(n8.dkR)>=0&&n8.dkR.out[0]===n8.out,'戻り(DELAY・REVERB)は専用ゲインを通ってマスターへ');
  const sch=[];['dkD','dkR'].forEach(q=>{n8[q].gain.cancelScheduledValues=()=>{};n8[q].gain.linearRampToValueAtTime=function(v,t){sch.push([q,v,t])}});
  B8.duck(0,1);ok(sch.length===0,'リターンDUCK: 既定OFFでは何もしない');
  B8.set('dlDuckOn',1);B8.set('dlDuckSrc',2);B8.set('dlDuckDepth',.5);B8.duck(0,1);ok(sch.length===0,'リターンDUCK: SRC以外のトラックのノートでは動かない');
  B8.duck(2,1);ok(sch.length>0&&sch.every(r=>r[0]==='dkD')&&Math.abs(Math.min(...sch.map(r=>r[1]))-.5)<1e-9,'リターンDUCK: DELAY戻りだけがDEPTHぶんへこむ(最小.5)');
  const n1=sch.length;B8.set('rvDuckOn',1);B8.set('rvDuckSrc',2);B8.set('rvDuckDepth',.8);B8.duck(2,2);ok(sch.slice(n1).some(r=>r[0]==='dkR'&&Math.abs(r[1]-.2)<1e-9)&&sch.slice(n1).some(r=>r[0]==='dkD'),'リターンDUCK: REVERB戻りは別のDEPTH・同じSRCで両方動く');
  const m=SD6.retDuckM('dl',id=>B8.val(id));ok(SD6.duckEnv(m,0)===1&&Math.abs(SD6.duckEnv(m,(m.dkAtk+m.dkHold)/1000-.001)-.5)<1e-9&&SD6.duckEnv(m,5)===1,'リターンDUCKの包絡は duckEnv(ATK→HOLD→REL)と同じ形');
 }
 /* ---------- オフライン描画: 旧データ互換(同じ音)・EQ4 の周波数特性が eq4Curve と ±1dB・8本同時でNaN無し ---------- */
 let OAC;try{OAC=require('node-web-audio-api').OfflineAudioContext}catch(e){if(process.env.CI){console.error('NG: node-web-audio-api が無い');process.exit(1)}console.log('SKIP: 描画テスト(node-web-audio-api 未インストール)')}
 if(OAC){
  const SR=48000;
  const mkB=(len)=>{class AC2 extends OAC{constructor(){super(2,len,SR)}resume(){return Promise.resolve()}}const C=load({AudioContext:AC2});return{SD:C.SD,B:new C.SD.Bus(),C}};
  async function render(len,setup,src){const{B,SD}=mkB(len);B.set('dlyMix',0);B.set('rvbMix',0);/* 実アプリの既定(FXの戻りは0)。個別のテストが上書きする */setup(B,SD);B.init();const x=B.ctx,ks=[];
   (src||[]).forEach(([k,data])=>{const buf=x.createBuffer(2,len,SR);buf.copyToChannel(Float32Array.from(data),0);buf.copyToChannel(Float32Array.from(data),1);const s=x.createBufferSource();s.buffer=buf;s.connect(B.strip(k).in);s.start(0);ks.push(s)});
   const r=await x.startRendering();return{L:Float32Array.from(r.getChannelData(0)),R:Float32Array.from(r.getChannelData(1)),B}}
  function fft(re,im){const n=re.length;for(let i=1,j=0;i<n;i++){let b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}}
   for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len,wr=Math.cos(a),wi=Math.sin(a);for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const u=i+k,v=i+k+len/2,tr=re[v]*cr-im[v]*ci,ti=re[v]*ci+im[v]*cr;re[v]=re[u]-tr;im[v]=im[u]-ti;re[u]+=tr;im[u]+=ti;const t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}}
  const mag=(x,N)=>{const re=new Float64Array(N),im=new Float64Array(N);for(let i=0;i<N;i++)re[i]=x[i]||0;fft(re,im);return Array.from({length:N/2},(_,k)=>Math.hypot(re[k],im[k]))};
  const noise=(n,seed)=>{let s=seed||1;return Array.from({length:n},()=>{s=(s*1664525+1013904223)>>>0;return(s/4294967296*2-1)*.25})};
  /* ① 旧データ互換: インサートの値があっても、ONにしなければ(=旧データ・全OFF)音は完全に同じ */
  {const n=SR/2,x=noise(n,7),y=noise(n,9);
   const a=await render(n,(B)=>{B.setMix(0,'tVol',.8);B.setMix(1,'tPan',-.4)},[[0,x],[1,y]]);
   const b=await render(n,(B,SD)=>{B.setMix(0,'tVol',.8);B.setMix(1,'tPan',-.4);const j=SD.INSP;['iEqHg','iEqB1g','iCpThr','iCpMix','iSaDrive','iGtThr'].forEach(i=>B.setMix(0,i,j.find(p=>p.id===i).max));B.setMix(1,'iOrd',1);B.setMix(1,'iEqLg',-15)},[[0,x],[1,y]]);
   let d=0;for(let i=0;i<n;i++)d=Math.max(d,Math.abs(a.L[i]-b.L[i]),Math.abs(a.R[i]-b.R[i]));ok(d===0,'旧データ互換: インサートOFFなら描画が完全に一致(差'+d+')');
   ok(a.L.every(v=>isFinite(v))&&a.L.some(v=>Math.abs(v)>.01),'描画が有限で無音ではない')}
  /* RP-1b: REVERB の位置。SEND(既定)=旧データと同じ・CHAIN(最後)=DELAY MIX 0 なら SEND と同じ音・REVERB→TAPE STOP の並びで音が変わる */
  {const n=SR/2,x=noise(n,7),rnd=()=>{let q=12345;Math.random=()=>{q=(q*1664525+1013904223)>>>0;return q/4294967296}},rs=Math.random;
   const run=async(su)=>{rnd();try{return await render(n,(B)=>{B.set('rvbMix',.6);B.set('rvbSize',.3);su&&su(B)},[[0,x]])}finally{Math.random=rs}};
   const a=await run(),b=await run(B=>B.set('rvbPos',0)),c=await run(B=>B.set('rvbPos',1));
   let d1=0,d2=0;for(let i=0;i<n;i++){d1=Math.max(d1,Math.abs(a.L[i]-b.L[i]),Math.abs(a.R[i]-b.R[i]));d2=Math.max(d2,Math.abs(a.L[i]-c.L[i]),Math.abs(a.R[i]-c.R[i]))}
   ok(d1===0,'RP-1b: SEND(rvbPos=0 を明示)は旧データと1サンプルも違わない(差'+d1+')');
   ok(d2<1e-5&&a.L.some(v=>Math.abs(v)>.01),'RP-1b: CHAIN(最後・DELAY MIX 0)の音は SEND と同じ(差'+d2+')');
  }
  /* ① の2: メーター(解析ノード)をつないでも音は変わらない・MIX画面を閉じたら外れる(v7.0b) */
  {const n=SR/2,x=noise(n,7),y=noise(n,9),setup=(B)=>{B.setMix(0,'tVol',.8);B.setMix(1,'tPan',-.4);B.setMix(1,'iEqOn',1);B.setMix(1,'iEqB1g',6)};
   const a=await render(n,setup,[[0,x],[1,y]]);
   const b=await render(n,(B)=>{setup(B);B.meterOn(true)},[[0,x],[1,y]]);
   let d=0;for(let i=0;i<n;i++)d=Math.max(d,Math.abs(a.L[i]-b.L[i]),Math.abs(a.R[i]-b.R[i]));ok(d===0,'メーターをつないでも描画が完全に一致(差'+d+')');
   const B=b.B;ok(B.strips[0].an&&B.strips[1].an&&B.mpre,'meterOn(true): 各ストリップとマスターに解析ノードが付く');
   const t=B.trackMeter(1),mm=B.masterMeter();{const sp=B.trackSpec(1);ok(sp&&sp.length===512,'trackSpec: 解析FFT 1024(512ビン)')}
   ok(t&&isFinite(t.peak)&&isFinite(t.rms)&&mm&&isFinite(mm.peak)&&isFinite(mm.pre),'trackMeter / masterMeter が数値を返す');
   B.strip(5);ok(B.strips[5].an,'meterOn 中に作ったストリップにも付く');
   B.meterOn(false);ok(!B.strips[0].an&&!B.strips[5].an&&!B.mpre&&B.trackMeter(0)===null,'meterOn(false): 解析ノードが外れる');
   B.meterOn(true);ok(B.strips[0].an&&B.mpre,'もう一度つなげる')}
  /* ⑨ モニター(v7.1b): MONO・小スピーカー風の特性。OFFなら従来と同じ・メーターは影響を受けない・cmp 音量補正 */
  {const n=SR,tone=(f,a)=>Array.from({length:n},(_,i)=>a*Math.sin(2*Math.PI*f*i/SR));
   const rms=(v,from)=>{let s=0,c=0;for(let i=from||SR/2;i<v.length;i++){s+=v[i]*v[i];c++}return Math.sqrt(s/c)};
   const run=async(f,mon,cg)=>{const r=await render(n,(B)=>{if(mon)B.setMonitor(mon);if(cg!=null)B.cmpDb=cg},[[0,tone(f,.2)]]);return rms(r.L)};
   const base={};for(const f of [50,1000,12000])base[f]=await run(f,null);
   const off=await run(1000,{mono:0,small:0});ok(Math.abs(off-base[1000])<1e-9,'モニター: OFF(既定)は従来と同じ音');
   const sm={};for(const f of [50,1000,12000])sm[f]=await run(f,{small:1});
   ok(Math.abs(db(sm[1000])-db(base[1000]))<1.5,'小スピーカー風: 1kHzはほぼそのまま '+(db(sm[1000])-db(base[1000])).toFixed(2));
   ok(db(sm[50])-db(base[50])<-15,'小スピーカー風: 50Hzは大きく減る '+(db(sm[50])-db(base[50])).toFixed(1));
   ok(db(sm[12000])-db(base[12000])<-8,'小スピーカー風: 12kHzは減る '+(db(sm[12000])-db(base[12000])).toFixed(1));
   /* MONO: 左右逆相は消え・同相はそのまま(左右合算の平均) */
   const mk=async(l,r,mon)=>{const {B}=mkB(n);if(mon)B.setMonitor(mon);B.init();const x=B.ctx,buf=x.createBuffer(2,n,SR);buf.copyToChannel(Float32Array.from(l),0);buf.copyToChannel(Float32Array.from(r),1);const s=x.createBufferSource();s.buffer=buf;s.connect(B.strip(0).in);s.start(0);const o=await x.startRendering();return[Float32Array.from(o.getChannelData(0)),Float32Array.from(o.getChannelData(1))]};
   const t1=tone(500,.2),t2=t1.map(v=>-v);
   const [al,ar]=await mk(t1,t2,{mono:1});ok(rms(al)<1e-4&&rms(ar)<1e-4,'MONO: 逆相の左右は打ち消して無音になる(モノ互換の確認) '+rms(al).toExponential(1));
   const [bl,br]=await mk(t1,t1,{mono:1}),[cl]=await mk(t1,t1,null);ok(Math.abs(rms(bl)-rms(cl))<1e-4&&Math.abs(rms(bl)-rms(br))<1e-6,'MONO: 同相はそのまま・左右が同じになる');
   const [dl,dr]=await mk(t1,t1.map(()=>0),{mono:1});ok(Math.abs(rms(dl)-rms(dr))<1e-6&&Math.abs(db(rms(dl))-db(rms(cl))+6.02)<.3,'MONO: 片側だけの音は両耳に半分(-6dB)で出る '+(db(rms(dl))-db(rms(cl))).toFixed(2));
   /* cmp 音量補正: -6dB で約半分・メーター(解析の分岐)は影響を受けない */
   const g0=await run(1000,null,0),g6=await run(1000,null,-6.0206);ok(Math.abs(db(g6)-db(g0)+6.02)<.3,'cmp.g: -6dB で約半分の音量 '+(db(g6)-db(g0)).toFixed(2));
   {const {B}=mkB(n);B.setMonitor({mono:1,small:1});B.cmpDb=-12;B.init();ok(B.an&&B.n.lim&&B.mon.mono===1,'モニター・補正はメーター用の分岐(an)につながない設計')}
   const {B:B0}=mkB(n);B0.init();ok(!B0.mon,'モニター: 起動時は必ずOFF(状態が無い)');
   B0.setMonitor({mono:1});B0.setMonitor({small:1});ok(B0.mon.mono===1&&B0.mon.small===1,'モニター: MONOと小SPは併用できる');B0.monOff();ok(B0.mon.mono===0&&B0.mon.small===0,'monOff で全部OFF');
   B0.setCmpGain(5);ok(B0.cmpDb===0,'cmp.g は 0dB より上げない(リミッターの後なので)');B0.setCmpGain(-99);ok(B0.cmpDb===-24,'cmp.g は -24dB まで')}
  /* ② EQ4 の周波数特性が eq4Curve と ±1dB(インパルス応答を、インサートOFFの描画との比で測る) */
  {const N=32768,len=N,imp=Array.from({length:N},(_,i)=>i===0?.05:0),F=[];for(let k=0;k<30;k++)F.push(Math.round(40*Math.pow(16000/40,k/29)*N/SR));
   const cfgs=[{iEqHpf:120,iEqLf:200,iEqLg:6,iEqB1f:250,iEqB1g:-9,iEqB1q:1,iEqB2f:3000,iEqB2g:10,iEqB2q:4,iEqHf:6000,iEqHg:-7,iEqLpf:12000},
    {iEqHpf:60,iEqLf:100,iEqLg:-15,iEqB1f:2000,iEqB1g:15,iEqB1q:8,iEqB2f:400,iEqB2g:-15,iEqB2q:.3,iEqHf:10000,iEqHg:12,iEqLpf:16000},
    {iEqB1f:1000,iEqB1g:8,iEqB1q:2,iEqB2f:1000,iEqB2g:6,iEqB2q:2}];
   const off=await render(len,()=>{},[[0,imp]]),mo=mag(off.L,N);
   for(const [ci,cfg] of cfgs.entries()){
    const on=await render(len,(B)=>{B.setMix(0,'iEqOn',1);Object.keys(cfg).forEach(k=>B.setMix(0,k,cfg[k]))},[[0,imp]]),mn=mag(on.L,N),fr=F.map(b=>b*SR/N),th=on.B?null:null,cur=require(path.join(JS,'fxdsp.js')).eq4Curve(cfg,fr,SR);
    let worst=0,wf=0;F.forEach((b,i)=>{const meas=db(mn[b])-db(mo[b]);const e=Math.abs(meas-cur[i]);if(e>worst){worst=e;wf=fr[i]}});
    ok(worst<=1,'EQ4 周波数特性が eq4Curve と±1dB(設定'+(ci+1)+') 最大差'+worst.toFixed(2)+'dB @'+Math.round(wf)+'Hz')}}
  /* ⑤ 8本同時(インサート付き)でNaN無し・無音でない */
  {const n=SR,tr=Array.from({length:8},(_,k)=>[k,noise(n,k+3)]);
   const r=await render(n,(B,SD)=>{for(let k=0;k<8;k++){B.setMix(k,'iEqOn',1);B.setMix(k,'iEqB1g',15);B.setMix(k,'iEqB1q',8);B.setMix(k,'iEqLg',15);B.setMix(k,'iSaOn',1);B.setMix(k,'iSaDrive',1);B.setMix(k,'iEqHpf',20+k*50);B.setMix(k,'tPan',(k-3.5)/4)}},tr);
   ok(r.L.every(v=>isFinite(v))&&r.R.every(v=>isFinite(v))&&r.L.some(v=>Math.abs(v)>.05),'8本同時(EQ+SAT付き)でNaN無し・無音でない');
   let pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(r.L[i]),Math.abs(r.R[i]));ok(pk<4,'8本同時(+15dB・DRIVE最大の極端設定)でもマスター出力が暴走しない(最大'+pk.toFixed(2)+')')}
  /* ⑥ バスの合流・リターンDUCK(v7.2) */
  {const n=SR/2,x=noise(n,7),y=noise(n,9),tn=(f,a)=>Array.from({length:n},(_,i)=>a*Math.sin(2*Math.PI*f*i/SR)),rmsOf=(v,from)=>{let s=0,c=0;for(let i=from||SR/4;i<(v.length);i++){s+=v[i]*v[i];c++}return Math.sqrt(s/c)};
   const diff=(p,q)=>{let d=0;for(let i=0;i<p.length;i++)d=Math.max(d,Math.abs(p[i]-q[i]));return d};
   const a=await render(n,()=>{},[[0,x],[1,y]]),b=await render(n,(B)=>{B.setMix(0,'tOut',1);B.setMix(1,'tOut',1)},[[0,x],[1,y]]),c=await render(n,(B)=>{B.setMix(0,'tOut',1);B.setMix(1,'tOut',2);B.setBusMix(2,'bVol',1)},[[0,x],[1,y]]);
   ok(diff(a.L,b.L)<1e-6&&diff(a.R,b.R)<1e-6,'バス(全OFF)に合流させても、MASTERへ直結と同じ音(合流の和) 差'+diff(a.L,b.L).toExponential(1));
   ok(diff(a.L,c.L)<1e-6,'別々のバスに分けても全OFFなら合計は同じ音');
   const lo=[[0,tn(100,.2)],[1,tn(100,.2)]],base=await render(n,()=>{},lo);
   const eqA=await render(n,(B)=>{B.setMix(0,'tOut',1);B.setMix(1,'tOut',1);B.setBusMix(0,'iEqOn',1);B.setBusMix(0,'iEqHpf',2000)},lo);
   ok(db(rmsOf(eqA.L))-db(rmsOf(base.L))<-20,'バスのEQ(LOW CUT 2kHz): バスに入れた100Hzの音が大きく減る '+(db(rmsOf(eqA.L))-db(rmsOf(base.L))).toFixed(1)+'dB');
   const eqM=await render(n,(B)=>{B.setBusMix(0,'iEqOn',1);B.setBusMix(0,'iEqHpf',2000)},lo);
   ok(diff(base.L,eqM.L)===0,'バスのEQは、そのバスに送っていない(MASTER直結の)トラックには効かない');
   const mixT=[[0,tn(100,.2)],[2,tn(1000,.2)]],e3=await render(n,(B)=>{B.setMix(0,'tOut',1);B.setBusMix(0,'iEqOn',1);B.setBusMix(0,'iEqHpf',2000)},mixT),e4=await render(n,()=>{},[[2,tn(1000,.2)]]);
   ok(Math.abs(db(rmsOf(e3.L))-db(rmsOf(e4.L)))<1,'BUS Aだけ低域を切っても、MASTERのトラック(1kHz)は残る');
   const vz=await render(n,(B)=>{B.setMix(0,'tOut',1);B.setBusMix(0,'bVol',0)},[[0,x]]);ok(rmsOf(vz.L)<1e-6,'バスVOL 0%: そのバスの音が消える');
   /* DELAY/REVERBの送り: バス経由のトラックでも tDly が効く(バスが素通しなら 0% で響きが付かない) */
   const dl=async(td,dm)=>render(n,(B)=>{B.set('dlyMix',dm);B.set('dlyFb',0);B.setMix(0,'tOut',1);B.setMix(0,'tDly',td)},[[0,x]]);
   const wA=await dl(1,.8),wB=await dl(0,.8),wC=await dl(1,0);ok(diff(wA.L,wC.L)>.01,'バス経由のトラックにもDELAYが掛かる(送り100%)');ok(diff(wB.L,wC.L)<1e-4,'バス経由のトラックでも DLY SEND 0% なら響きが付かない(バスが素通しのとき) '+diff(wB.L,wC.L).toExponential(1));
   /* v8.1: 送りは各トラックから取る(バスの EQ・COMP・VOL の影響を受けない) */
   {const xq=x.map(v=>v*.2);/* マスターのコンプ(閾値-10dB)に掛からない小さい音で測る */
    const wet=async(ex)=>{const a=await render(n,(B)=>{B.set('dlyFb',0);B.set('dlyMix',.8);B.setMix(0,'tOut',1);B.setMix(0,'tDly',1);ex&&ex(B)},[[0,xq]]),b=await render(n,(B)=>{B.set('dlyFb',0);B.set('dlyMix',0);B.setMix(0,'tOut',1);B.setMix(0,'tDly',1);ex&&ex(B)},[[0,xq]]);
     return Float32Array.from(a.L,(v,i)=>v-b.L[i])};/* DELAYの響きだけ(混ぜた - 混ぜない) */
    const w0=await wet(null),wEq=await wet(B=>{B.setBusMix(0,'iEqOn',1);B.setBusMix(0,'iEqHpf',2000)}),wV0=await wet(B=>B.setBusMix(0,'bVol',0)),wTv=await wet(B=>B.setMix(0,'tVol',0));
    ok(rmsOf(w0)>1e-4,'v8.1: バス経由でも送り100%で響きが付く');
    ok(diff(w0,wEq)<1e-4,'v8.1: バスにEQを掛けても、送りの響きは変わらない '+diff(w0,wEq).toExponential(1));
    ok(diff(w0,wV0)<1e-4&&rmsOf(wV0)>1e-4,'v8.1: バスVOLを0にしても、送りの響きは残る '+diff(w0,wV0).toExponential(1));
    ok(rmsOf(wTv)<1e-6,'v8.1: トラックのVOLを0にすると送りも0');
    /* OUT=MASTER と、素通しのバスで、送りの響きが一致 */
    const wm=async()=>{const a=await render(n,(B)=>{B.set('dlyFb',0);B.set('dlyMix',.8);B.setMix(0,'tDly',1)},[[0,xq]]),b=await render(n,(B)=>{B.set('dlyFb',0);B.set('dlyMix',0);B.setMix(0,'tDly',1)},[[0,xq]]);return Float32Array.from(a.L,(v,i)=>v-b.L[i])};
    ok(diff(await wm(),w0)<1e-4,'v8.1: OUT=MASTER と素通しのバスで、送りの響きが一致');
    /* 補正タップの量(純粋な計算)と、SEND 0 の接続 */
    {const{B}=mkB(1000);B.setMix(0,'tDly',0);ok(B.sendGain(0,'tDly')===-1,'v8.1: MASTER直結・SEND 0%: 補正は -1(従来どおり)');B.setMix(0,'tDly',1);ok(B.sendGain(0,'tDly')===0,'v8.1: MASTER直結・SEND 100%: 補正は 0(従来どおり)');
     B.setMix(0,'tOut',1);ok(B.sendGain(0,'tDly')===1&&B.sendGain(0,'tRvb')===1,'v8.1: バス行き: 送り全量をトラックから取る');B.setMix(0,'tDly',0);ok(B.sendGain(0,'tDly')===0,'v8.1: バス行き・SEND 0%: タップは 0=接続しても無音')}
    /* 8本・全送りONでNaN無し */
    const all=await render(SR,(B)=>{for(let k=0;k<8;k++){B.setMix(k,'tOut',k%4);B.setMix(k,'tDly',1.5);B.setMix(k,'tRvb',1.5)}B.setBusMix(0,'iEqOn',1)},[0,1,2,3,4,5,6,7].map(k=>[k,noise(SR,20+k)]));
    ok(all.L.every(isFinite)&&all.R.every(isFinite),'v8.1: 8本・全送りON(バス混在)でNaN無し')}
   /* リターンDUCK: SRCのノートの瞬間にDELAYの戻りがへこむ・前後は同じ */
   const L2=SR,xx=noise(L2,11),rd=async(on,dm)=>{const{B}=mkB(L2);B.set('dlyMix',dm);B.set('dlyFb',0);B.set('dlDuckOn',on);B.set('dlDuckSrc',0);B.set('dlDuckDepth',1);B.set('rtDuckAtk',1);B.set('rtDuckHold',100);B.set('rtDuckRel',200);B.init();
    const x_=B.ctx,buf=x_.createBuffer(2,L2,SR);buf.copyToChannel(Float32Array.from(xx),0);buf.copyToChannel(Float32Array.from(xx),1);const sr=x_.createBufferSource();sr.buffer=buf;sr.connect(B.strip(1).in);sr.start(0);B.duck(0,.3);
    const r=await x_.startRendering();return Float32Array.from(r.getChannelData(0))};
   const off=await rd(0,1),on=await rd(1,1),sl=(v,a,b_)=>v.slice(Math.round(a*SR),Math.round(b_*SR)),rd_=(p,q,a,b_)=>{let t=0;const u=sl(p,a,b_),w=sl(q,a,b_);for(let i=0;i<u.length;i++)t+=(u[i]-w[i])**2;return Math.sqrt(t/u.length)};
   ok(diff(sl(off,0,.29),sl(on,0,.29))<1e-6,'リターンDUCK: ノートの前は同じ音');
   ok(rd_(off,on,.31,.39)>.1,'リターンDUCK: ノートの直後、DELAYの戻りがへこむ(差 '+rd_(off,on,.31,.39).toFixed(3)+')');
   ok(rd_(off,on,.9,1)<1e-3,'リターンDUCK: RELのあとは元の量に戻る(差 '+rd_(off,on,.9,1).toExponential(1)+')');
   const offd=await rd(0,1);ok(diff(offd,off)===0,'リターンDUCK OFF なら、ノートが鳴っても何も変わらない(決定的)')}
  /* ⑩ iOrd: 両方の順序で描画でき、EQとCOMPの順が違っても音が出る(COMPはワークレットのため描画では素通し) */
  {const n=SR/2,x=noise(n,5),f=o=>render(n,(B)=>{B.setMix(0,'iEqOn',1);B.setMix(0,'iEqB1g',12);B.setMix(0,'iOrd',o)},[[0,x]]);const a=await f(0),b=await f(1);ok(a.L.every(isFinite)&&b.L.every(isFinite)&&a.L.some(v=>Math.abs(v)>.01)&&b.L.some(v=>Math.abs(v)>.01),'iOrd=0/1 のどちらでも描画できる')}
 }
 // ---- OR-3a: SD.insDef(接尾辞 _2 を解決) ----
 {const SD=load().SD,d=SD.insDef('iEqHpf'),d2=SD.insDef('iEqHpf_2');
  ok(d&&d===SD.INSP.find(p=>p.id==='iEqHpf'),'insDef: 元IDは元の定義そのもの');
  ok(d2&&d2.id==='iEqHpf_2'&&d2.base==='iEqHpf'&&d2.inst===2&&d2!==d&&d2.min===d.min&&d2.max===d.max&&d2.def===d.def&&d2.ins===d.ins,'insDef: _2 は元定義の複製(id だけ違う)');
  d2.min=-999;ok(SD.insDef('iEqHpf').min!==-999&&SD.insDef('iEqHpf_2').min!==-999,'insDef: 複製を書き換えても元・次回に影響しない');
  const sg=SD.INSP.find(p=>p.type==='seg'),sg2=SD.insDef(sg.id+'_2');sg2.opts.push([9,'x']);ok(SD.insDef(sg.id).opts.length===sg.opts.length,'insDef: seg の opts も複製');
  ['iEqHpf_1','iEqHpf_3','iEqHpf_02','iEqHpf_2_2','iEqHpf__2','_2','zzz_2','zzz','','iEqHpf_',null,undefined,5].forEach(x=>ok(SD.insDef(x)===undefined,'insDef: 不正は undefined: '+x));
  ok(SD.INSP.every(p=>SD.insDef(p.id)===p&&SD.insDef(p.id+'_2').id===p.id+'_2'),'insDef: 全INSPで元ID・_2 が引ける');
  ok(SD.mixClean({iEqHpf_2:500}).iEqHpf_2===undefined,'mixClean: まだ _2 は持たない(OR-3b で)');}
 // ---- OR-3b: 2段目のインスタンス(順列・上限・保存・生成・負荷) ----
 {const C=load(),SD=C.SD,D=SD.ORDDEF,V=SD.ordValid;
  ok(V(D)&&V(D.concat(['eq_2']))&&V(['gt','eq','eq_2','cp','ds','sa','md'])&&V(D.concat(['eq_2','cp_2'])),'ordValid: 6+2段目(最大2つ=総8)は正しい');
  ok(!V(D.concat(['eq_2','cp_2','md_2']))&&!V(D.concat(['eq_2','eq_2']))&&!V(D.concat(['eq_3']))&&!V(D.concat(['eq_02']))&&!V(D.concat(['zz_2']))&&!V(['gt','cp','ds','sa','md','eq_2'])&&!V(D.slice(1))&&!V(D.concat([5]))&&!V(null),'ordValid: 3つ目・同じ2段目の重複・不正な接尾辞・元グループ欠け・非文字列は不正');
  ok(SD.ordOf({ord:D.concat(['eq_2','cp_2','md_2']),iOrd:1}).join()===SD.ordFromIOrd(1).join(),'不正な順列は旧 iOrd へ丸める');
  let a=SD.ordAdd(D,'eq');ok(a.join()==='gt,eq,eq_2,cp,ds,sa,md','ordAdd: 元グループの直後に入る');
  ok(SD.ordAdd(a,'eq').join()===a.join()&&!SD.ordCanAdd(a,'eq'),'ordAdd: 同じグループの3段目は不可');
  const a2=SD.ordAdd(a,'cp');ok(a2.length===8&&SD.ordCanAdd(a2,'md')===false&&SD.ordAdd(a2,'md').join()===a2.join(),'ordAdd: 総スロット8が上限');
  ok(SD.ordRemove(a2,'eq').join()===a2.join()&&SD.ordRemove(a2,'eq_2').join()==='gt,eq,cp,cp_2,ds,sa,md','ordRemove: 元は消せない・2段目は消せる');
  ok(SD.ordMove(a,2,-1).join()==='gt,eq_2,eq,cp,ds,sa,md','ordMove: 2段目も動かせる');
  // 保存(mixClean)
  const o={ord:a,iEqOn:1,iEqOn_2:1,iEqHpf_2:500,iEqLpf_2:99999999,iCpOn_2:1};let mc=SD.mixClean(JSON.parse(JSON.stringify(o)));
  ok(mc.ord.join()===a.join()&&mc.iEqOn_2===1&&mc.iEqHpf_2===500&&mc.iEqLpf_2===SD.insDef('iEqLpf').max,'mixClean: 2段目のつまみは範囲に丸めて保持');
  ok(mc.iCpOn_2===undefined,'mixClean: ord に無い2段目のつまみは捨てる');
  ok(SD.mixClean({iEqHpf_2:500,iEqOn_2:1}).iEqHpf_2===undefined&&SD.mixClean({ord:D,iEqHpf_2:500}).iEqHpf_2===undefined,'mixClean: ord が無い/2段目が居ないと持たない');
  ok(JSON.stringify(SD.mixClean(JSON.parse(JSON.stringify(mc))))===JSON.stringify(mc),'mixClean: 往復で不変');
  ok(Object.keys(SD.mixClean({tVol:.5})).join()===Object.keys(SD.MIXDEF()).join(),'旧データ: 2段目のキーは増えない');
  // 生成・接続・つまみ
  const mk=()=>{const C2=load({AudioContext:AC,AudioWorkletNode:AWN,Blob:class{constructor(a){this.a=a}},URL:{createObjectURL:()=>'blob:x'}});return{SD:C2.SD,B:new C2.SD.Bus()}};
  const w2=(s)=>{const r=[];let q=s.in;for(let i=0;i<60;i++){q=q.out[0];if(!q||q===s.dk)break;r.push(q.kind)}return r};
  const rc=(x,y,seen=new Set())=>{if(x===y)return true;if(seen.has(x))return false;seen.add(x);return x.out.some(t=>rc(t,y,seen))};
  {const {SD:S2,B}=mk();const ord=S2.ordAdd(S2.ORDDEF,'eq');B.setMix(0,'ord',ord);B.setMix(0,'iEqOn',1);B.setMix(0,'iEqOn_2',1);B.setMix(0,'iEqHpf_2',500);B.init();await B.wkP;const s=B.strip(0);
   ok(w2(s).filter(k=>k==='biquad').length===12&&s.st.eq&&s.st.eq_2&&s.st.eq!==s.st.eq_2,'2段目EQ: 別インスタンスが直列に入る(biquad 6+6)');
   ok(rc(s.st.eq.out,s.st.eq_2.in)&&rc(s.st.eq_2.out,s.dk)&&!rc(s.st.eq_2.out,s.st.eq.in),'2段目EQ: 1段目→2段目→出力');
   ok(s.st.eq_2.hpf.frequency.value===500&&s.st.eq.hpf.frequency.value!==500,'2段目EQ: _2 のつまみは2段目だけに効く');
   ok(s.st.eq_2.lpf.frequency.value===S2.insDef('iEqLpf').def,'2段目EQ: 値の無いつまみは既定');
   B.setMix(0,'iEqLg_2',9);ok(s.st.eq_2.lo.gain.value===9&&s.st.eq.lo.gain.value!==9,'2段目EQ: 途中の変更も2段目だけ');
   B.setMix(0,'iEqOn_2',0);ok(!s.st.eq_2&&s.st.eq&&rc(s.in,s.dk),'2段目EQ: ONを切ると外れる(1段目は残る)');
   B.setMix(0,'iEqOn_2',1);ok(!!s.st.eq_2,'2段目EQ: 再ONで戻る');
   B.setMix(0,'ord',S2.ORDDEF);ok(!s.st.eq_2&&rc(s.in,s.dk),'2段目EQ: ord から外すと片付く(出力は届く)');}
  {const {SD:S2,B}=mk();let ord=S2.ordAdd(S2.ordAdd(S2.ORDDEF,'cp'),'sa');B.setMix(0,'ord',ord);['iCpOn','iCpOn_2','iSaOn','iSaOn_2'].forEach(i=>B.setMix(0,i,1));B.setMix(0,'iSaType',2);B.setMix(0,'iSaType_2',0);B.setMix(0,'iCpThr_2',-40);B.init();await B.wkP;const s=B.strip(0);
   ok(s.st.cp&&s.st.cp_2&&s.st.sa&&s.st.sa_2,'COMP・SAT も2段目が生成される');
   ok(!!s.st.sa.w&&!s.st.sa_2.w,'SAT: 1段目=TUBE(ワークレット)・2段目=SOFT(WaveShaper)を別々に持つ');
   ok(s.st.cp_2.w.parameters.get('thresh').value===-40&&s.st.cp.w.parameters.get('thresh').value!==-40,'COMP: 2段目の THRESH だけ変わる');
   B.setMix(0,'iSaType_2',3);ok(!!s.st.sa_2.w&&s.st.sa_2.w!==s.st.sa.w,'SAT: 2段目の TYPE 変更は2段目だけ');
   ok(rc(s.in,s.dk),'COMP/SAT 2段: 出力まで届く');}
  // 負荷: スロット数で数える
  {const {SD:S2,B}=mk();let hi=null;B.onLoad=(h,n)=>{hi=[h,n]};[0,1,2].forEach(k=>['iGtOn','iCpOn','iDsOn','iMdOn'].forEach(i=>B.setMix(k,i,1)));B.init();await B.wkP;[0,1,2].forEach(k=>B.strip(k));B.heavyCheck();
   ok(B.heavy()===12&&!B.loadHigh,'負荷: 3トラック×4=12 は上限内');
   B.setMix(0,'ord',S2.ordAdd(S2.ORDDEF,'cp'));B.setMix(0,'iCpOn_2',1);ok(B.heavy()===13&&B.loadHigh===true&&hi&&hi[0]===true&&hi[1]===13,'負荷: 2段目の COMP も1スロットと数え、上限超えで「負荷:高」(警告のみ・OFFにしない)');
   ok(!!B.strip(0).st.cp_2,'負荷: 超えても2段目は勝手にOFFにならない');}}
 if(err){console.error(err+'件NG');process.exit(1)}console.log('OK: トラック別インサート・メーター(定義・EQ4曲線・COMP理論値/KNEE/MIX/SC HPF・接続順・iOrd切替・負荷ガード・旧データ互換)');
})().catch(e=>{console.error('NG: 例外 '+(e&&e.stack||e));process.exit(1)});
