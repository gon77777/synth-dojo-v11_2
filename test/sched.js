// サンプル精度スケジュール(SS)の純粋関数と Runner(偽AudioParam): node test/sched.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const ctx={console,Math,Float32Array,Float64Array,Uint8Array};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
const J=p=>path.join(__dirname,'..','www','js',p);
['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','fxnew.js','fxparams.js','seq.js','auto.js','sched.js'].forEach(f=>vm.runInContext(fs.readFileSync(J(f),'utf8'),ctx,{filename:f}));
const SD=ctx.SD,S=SD.Sched,A=SD.Auto;let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};const near=(a,b,e)=>Math.abs(a-b)<=(e||1e-9);
const bpm120=()=>120;
// ---- advance: 1msで 120BPM=192tick/s → 0.192tick/ms ----
{const tl={t:0,pos:0},G=S.advance(tl,.08,{len:384,lp:null,bpmAt:bpm120});
 ok(G.n===80&&near(G.pos[80],80*.192,1e-6),'advance 位置');ok(near(tl.t,.08)&&near(tl.pos,G.pos[80]),'tl が進む');
 const G2=S.advance(tl,.16,{len:384,lp:null,bpmAt:bpm120});ok(near(G2.pos[0],G.pos[80]),'窓の継ぎ目で位置が連続');
 const t2={t:0,pos:380},H=S.advance(t2,.1,{len:384,lp:null,bpmAt:bpm120});ok(H.wrap.some(x=>x===1)&&H.pos[H.n]<384,'ループで巻き戻し wrap=1');
 const t3={t:0,pos:90},K=S.advance(t3,.1,{len:384,lp:[96,192],bpmAt:bpm120});ok(K.pos[1]>=96&&K.wrap[1]===1,'範囲ループ: 範囲外から入ると頭へ');
 const t4={t:0,pos:0},F=S.advance(t4,.05,{len:384,lp:null,bpmAt:p=>60});ok(near(F.pos[50],50*.096,1e-6),'テンポ変化(60BPM)');
 ok(near(S.posAt(G,.0105),G.pos[10]+(G.pos[11]-G.pos[10])*.5,1e-9)&&S.posAt(G,1)===null,'posAt 補間と窓外');}
// ---- planWindow: 連続・巻き戻しで曲線を分ける・先頭1点を出さない ----
{const tl={t:0,pos:380},G=S.advance(tl,.1,{len:384,lp:null,bpmAt:bpm120}),rec={items:[],tEnd:null,vEnd:null,base:0,entry:null};
 const v=new Float64Array(G.n+1);for(let i=0;i<=G.n;i++)v[i]=G.pos[i]/384;
 const ops=S.planWindow(rec,G,v,false);ok(ops.length>=2&&ops.every(o=>o.k==='c'),'巻き戻しで2本以上に分かれる');
 for(let i=1;i<ops.length;i++)ok(ops[i].t>=ops[i-1].t+ops[i-1].dt-1e-12,'曲線が重ならない');
 ok(ops.every(o=>o.v.length>=2),'1点だけの曲線は出さない');}
// ---- 継ぎ目の連続: 2窓を続けて計画 → 境目の値が一致 ----
{const tl={t:0,pos:0},rec={items:[],tEnd:null,vEnd:null,base:0,entry:null},lane={trk:0,id:'x',mute:false,pts:[[0,0,'L'],[384,1,'L']]};
 const mk=te=>{const G=S.advance(tl,te,{len:384,lp:null,bpmAt:bpm120}),v=new Float64Array(G.n+1);for(let i=0;i<=G.n;i++)v[i]=A.eval(lane,G.pos[i]);const o=S.planWindow(rec,G,v,false);S.record(rec,o);return o};
 const a=mk(.08),b=mk(.16);ok(near(a[a.length-1].v.at(-1),b[0].v[0],1e-6),'窓の継ぎ目で値が連続');ok(near(b[0].t,a[0].t+a[0].dt),'時刻も連続');}
// ---- entry: 保持値から10msでなじむ ----
{const tl={t:0,pos:0},G=S.advance(tl,.05,{len:384,lp:null,bpmAt:bpm120}),rec={items:[],tEnd:null,vEnd:null,base:0,entry:{t0:0,v0:1}},v=new Float64Array(G.n+1).fill(0);
 const o=S.planWindow(rec,G,v,false)[0];ok(near(o.v[0],1)&&near(o.v[5],.5,1e-6)&&near(o.v[10],0,1e-6)&&rec.entry===null,'entry 10ms ブレンド');}
// ---- 離散: 変化点だけ ----
{const G={t0:0,dt:.001,n:5,pos:new Float64Array(6),wrap:new Uint8Array(6)},rec={items:[],tEnd:null,vEnd:null,base:0,entry:null};
 const o=S.planWindow(rec,G,[1,1,1,2,2,2],true);ok(o.length===2&&o[0].v===1&&o[1].v===2&&near(o[1].t,.003),'離散は変化点だけ');
 ok(S.planWindow(rec,G,[2,2,2,2,2,2],true).length===0,'次の窓で同値なら出さない');}
// ---- record / valueAt / cancel ----
{const rec={items:[],tEnd:null,vEnd:null,base:5,entry:null};S.record(rec,[{k:'s',t:1,v:2},{k:'c',t:2,dt:1,v:Float32Array.from([0,10])},{k:'c',t:3,dt:1,v:Float32Array.from([10,20])}]);
 ok(S.valueAt(rec,.5)===5&&S.valueAt(rec,1.5)===2&&near(S.valueAt(rec,2.5),5)&&near(S.valueAt(rec,3.5),15)&&near(S.valueAt(rec,9),20),'valueAt');
 const c=S.cancel(rec,2.5);ok(near(c.v,5)&&near(c.from,2)&&rec.items.length===1,'cancel: 進行中の曲線の開始時刻から取り消す');
 const c2=S.cancel(rec,1.5);ok(c2.v===2&&c2.from===1.5&&rec.items.length===1,'cancel: 予約の間');}
// ---- laneSig ----
ok(S.laneSig({mute:false,pts:[[0,1,'L']]})!==S.laneSig({mute:false,pts:[[0,2,'L']]})&&S.laneSig({mute:true,pts:[]})==='m','laneSig');
// ---- Runner(偽AudioParam。重なる曲線は例外) ----
function fakeParam(){const p={v:0,cur:[],log:[],value:0,
 setValueCurveAtTime(a,t,d){for(const c of p.cur)if(t<c.t+c.d-1e-12&&t+d>c.t+1e-12)throw new Error('overlap');p.cur.push({t,d,a});p.log.push('c')},
 setValueAtTime(v,t){p.log.push('s')},cancelScheduledValues(t){p.cur=p.cur.filter(c=>c.t+c.d<=t);p.log.push('x')}};return p}
{const par=fakeParam(),lane={trk:0,id:'cutoff',mute:false,pts:[[0,0,'L'],[384,1,'L']]},def=SD.defs.analog.byId.cutoff;let now=0;
 const au={lanes:[lane],lp:null,len:null};const eng={run:true,pos:0,touch:{},io:{au:()=>au,def:()=>def,bpm:()=>120}};
 const R=new S.Runner({now:()=>now,sr:48000,bind:()=>[{param:par,map:x=>x}]});
 for(let i=0;i<40;i++){now=i*.02;eng.pos=now*192%384;R.pump(eng,now)}
 ok(R.owned['0:cutoff']===1&&par.cur.length>=2,'Runner: 予約が入る');
 for(let i=1;i<par.cur.length;i++)ok(par.cur[i].t>=par.cur[i-1].t+par.cur[i-1].d-1e-9,'Runner: 曲線が重ならない');
 R.touch(0,'cutoff');ok(!R.owned['0:cutoff'],'touch で即解放');
 now=.9;R.pump(eng,now);ok(R.owned['0:cutoff']===1,'touch 後に再取得');
 eng.run=false;R.pump(eng,now);ok(!R.owned['0:cutoff'],'停止で解放');}
// ---- Engine 統合: 受け持ちのつまみは setParam を呼ばず、setQuiet だけが約30Hzで呼ばれる。touch中は呼ばない ----
{const par=fakeParam(),def=SD.defs.analog.byId.cutoff,lane={trk:0,id:'cutoff',mute:false,pts:[[0,0,'L'],[384,1,'L']]};let now=0,on=true,sp=0,q=0;
 const au={lanes:[lane],lp:null,len:null};
 const R=new S.Runner({now:()=>now,sr:48000,bind:()=>[{param:par,map:x=>x}]});
 const E=new A.Engine({now:()=>now,bpm:()=>120,au:()=>au,def:()=>def,setParam:()=>{sp++},setQuiet:()=>{q++},sched:R,schedOn:()=>on,timer:{set:()=>1,clear:()=>{}}});
 E.start(0);for(let i=1;i<=100;i++){now=i*.005;E.update()}
 ok(R.owned['0:cutoff']===1&&sp<=1&&q>=10&&q<=20,'Engine: 受け持ち中は setParam を呼ばず setQuiet は約30Hz (sp='+sp+' q='+q+')');
 E.grab(0,'cutoff');const q0=q;for(let i=0;i<10;i++){now+=.005;E.update()}ok(q===q0&&!R.owned['0:cutoff'],'Engine: touch 中は同期しない・解放');
 on=false;E.release(0,'cutoff',.5);sp=0;for(let i=0;i<20;i++){now+=.005;E.update()}ok(sp>0,'schedOn=false なら旧方式で書く');}
// ---- AUBIND ----
{const B=SD.AUBIND,fp=()=>({});const bus={ctx:{},strips:[{vol:{gain:fp()},pan:{pan:fp()},st:{eq:{hpf:{frequency:fp()}}}}],st:{eq:{lo:{gain:fp()}}},n:{out:{gain:fp()}}};
 ok(B.bind(0,'tVol',bus)[0].map(.5)===.25,'tVol は SD.volGain');ok(B.bind(0,'iEqHpf',bus).length===1&&B.bind(0,'iEqLf',bus)===null,'EQ 未作成なら null');
 ok(B.bind('M','master',bus)[0].map(1)===.8&&B.bind('M','eqLo',bus).length===1&&B.bind('M','dlyFb',bus)===null,'マスター対象表');
 ok(B.bind(0,'cutoff',bus)===null,'対象外は旧方式');}
// ---- SS-5a: ワークレットの parameters ----
{const B=SD.AUBIND,fp=()=>({}),mk=names=>({parameters:{get:n=>names[n]||undefined}});
 const GF={gt:'gate',sa:'saturator',af:'autofilter',tr:'tremolo',bc:'bitcrush',rm:'ringmod',ts:'tapestop',sw:'width',md:'modfx',cp:'comp',ds:'deess'};
 const src={};Object.keys(GF).forEach(g=>{src[g]=fs.readFileSync(path.join(__dirname,'..','fx-src',GF[g]+'.js'),'utf8')});
 const P={};
 // 表の全項目: パラメーター名が fx-src にある・FXP/INSP に同じIDがある・bind が AudioParam と変換を返す
 [['M',B.WM,SD.FXP.map(p=>p.id)],[0,B.WT,SD.INSP.map(p=>p.id)]].forEach(([trk,T,ids])=>Object.keys(T).forEach(id=>{const e=T[id];
  ok(ids.indexOf(id)>=0,'SS-5a: '+id+' は定義にある');
  ok(src[e[0]]&&new RegExp("['\"]"+e[1]+"['\"]").test(src[e[0]]),'SS-5a: '+id+' → '+e[0]+'.'+e[1]+' が fx-src にある');
  const st={};st[e[0]]={w:mk({[e[1]]:fp()})};const bus={ctx:{},strips:[{vol:{gain:fp()},pan:{pan:fp()},st:st}],st:st,n:{}};
  const r=B.bind(trk,id,bus);ok(r&&r.length===1&&typeof r[0].map(1)==='number','SS-5a: '+id+' が載る');
  const none=B.bind(trk,id,{ctx:{},strips:[{vol:{gain:fp()},pan:{pan:fp()},st:{}}],st:{},n:{}});ok(none===null,'SS-5a: '+id+' はノード未作成なら旧方式')}));
 // 変換(bus.js の W と同じ)
 const one=(trk,id,v)=>{const e=(trk==='M'?B.WM:B.WT)[id],st={};st[e[0]]={w:mk({[e[1]]:fp()})};return B.bind(trk,id,{ctx:{},strips:[{vol:{gain:fp()},pan:{pan:fp()},st:st}],st:st,n:{}})[0].map(v)};
 ok(one('M','saMix',.5)===50&&one('M','mdDepth',.4)===40&&one('M','cpThr',-20)===-20&&one(0,'iMdFb',.3)===30&&one(0,'iSaMix',1)===100,'SS-5a: 変換(×100 と恒等)');
 {const g={},bus={ctx:{},st:{cp:{m:{gain:g}}},n:{}};const r=B.bind('M','cpMake',bus);ok(r&&r[0].param===g&&Math.abs(r[0].map(20)-10)<1e-9,'SS-5a: cpMake は dB→倍率');}
 // 載せないもの(JS が計算・切り替え・SC)は旧方式のまま
 ['afRate','trRate','drive','saType','mdType','cpModel','afType','trMode','rmShape'].forEach(id=>ok(B.bind('M',id,{ctx:{},st:{},n:{}})===null&&!B.WM[id],'SS-5a: '+id+' は対象外'));
 ['iSaDrive','iCpMake','iCpOn','iCpScLsn','iSaType','iMdType','iCpModel','iDsListen'].forEach(id=>ok(!B.WT[id],'SS-5a: '+id+' は対象外'));
 ok(B.IDS.master.indexOf('cpThr')>=0&&B.IDS.track.indexOf('iCpThr')>=0,'SS-5a: IDS に載る')}
// ---- SS-5b: モジュラーのつまみ(rack の nodes[].ap を引く) ----
{const B=SD.AUBIND,par={},nm=()=>fakeParam(),bus={ctx:{},strips:[],st:{},n:{}};
 const rack=trk=>trk===1?{nodes:{vcf1:{ap:{cutoff:[par.f=nm()],cv:[par.c=nm(),v=>v*1200]}},out1:{ap:{vol:[par.v=nm(),v=>v*.3]}}}}:null;
 const a=B.bind(1,'vcf1.cutoff',bus,rack);ok(a&&a.length===1&&a[0].param===par.f&&a[0].map(440)===440,'SS-5b: vcf1.cutoff が載る(恒等)');
 const b=B.bind(1,'vcf1.cv',bus,rack);ok(b&&b[0].map(.5)===600,'SS-5b: 変換が効く');
 ok(B.bind(1,'out1.vol',bus,rack)[0].map(1)===.3,'SS-5b: out1.vol');
 ok(B.bind(1,'vcf1.res',bus,rack)===null,'SS-5b: ap に無いつまみ(res)は旧方式');
 ok(B.bind(1,'vcf9.cutoff',bus,rack)===null,'SS-5b: 孤児(ラックに無い)は null');
 ok(B.bind(0,'vcf1.cutoff',bus,rack)===null,'SS-5b: モジュラーでないトラックは null');
 ok(B.bind(1,'vcf1.cutoff',bus)===null,'SS-5b: rack を渡さなければ旧方式');
 ok(B.bind(1,'iEqLg',{ctx:{},strips:[{vol:{gain:nm()},pan:{pan:nm()},st:{}}],st:{},n:{}},rack)===null,'SS-5b: 既存の表は変わらない(ノード未作成=null)');
 // Runner: 作り直し(新しい AudioParam)で張り替え、レーン保持・孤児は無視
 const p1=nm(),p2=nm();let cur=p1,now=0,present=true;const lane={trk:1,id:'vcf1.cutoff',mute:false,pts:[[0,0,'L'],[384,1,'L']]},def={type:'knob',min:20,max:20000,def:1000,curve:'log'};
 const au={lanes:[lane],lp:null,len:null},eng={run:true,pos:0,touch:{},io:{au:()=>au,def:()=>def,bpm:()=>120}};
 const R=new S.Runner({now:()=>now,sr:48000,bind:()=>present?[{param:cur,map:x=>x}]:null});
 for(let i=0;i<20;i++){now=i*.02;eng.pos=now*192%384;R.pump(eng,now)}ok(R.owned['1:vcf1.cutoff']===1&&p1.cur.length>=1,'SS-5b: curve 方式で予約が入る');
 cur=p2;for(let i=20;i<40;i++){now=i*.02;eng.pos=now*192%384;R.pump(eng,now)}ok(p2.cur.length>=1&&R.owned['1:vcf1.cutoff']===1,'SS-5b: ラックが作り直されたら新しい AudioParam に張り替わる');
 present=false;for(let i=40;i<44;i++){now=i*.02;R.pump(eng,now)}ok(!R.owned['1:vcf1.cutoff']&&au.lanes.length===1,'SS-5b: モジュールが消えたら解放(レーンは残る)');
 present=true;for(let i=44;i<60;i++){now=i*.02;eng.pos=now*192%384;R.pump(eng,now)}ok(R.owned['1:vcf1.cutoff']===1,'SS-5b: 復活で再び受け持つ')}
// ---- SS-5c: 新エフェクト(FX-1〜4)のつまみ。FXMAP の smooth な連続つまみだけ載る ----
{const B=SD.AUBIND,fp=()=>({}),mk=names=>({parameters:{get:n=>names[n]||undefined}}),M=SD.FXMAP,FXP=SD.FXP;
 const WN={mb:'mbcomp',ps:'pitch',rb:'reverse',gl:'glitch',vc:'vocoder',sp:'spectral'},desc={};
 Object.keys(WN).forEach(k=>{const src=fs.readFileSync(path.join(__dirname,'..','fx-src',WN[k]+'.js'),'utf8'),names=[];src.replace(/(?:k|a)\(\s*'([A-Za-z0-9]+)'/g,(m,n)=>{names.push(n)});if(k==='mb')['t','r','a','l','g','s','m'].forEach(c=>[1,2,3].forEach(b=>names.push(c+b)));desc[k]=names});
 const ids=Object.keys(M),on=[],off=[];
 ids.forEach(id=>{const m=M[id],d=FXP.find(q=>q.id===id),st={};st[m[0]]={w:mk({[m[1]]:fp()})};const bus={ctx:{},strips:[],st:st,n:{}},r=B.bind('M',id,bus);
  const want=!!m[3]&&d&&d.type==='knob';
  if(want){on.push(id);ok(r&&r.length===1&&typeof r[0].map(1)==='number','SS-5c: '+id+' が載る');
   ok(desc[m[0]]&&desc[m[0]].indexOf(m[1])>=0,'SS-5c: '+id+' → '+m[0]+'.'+m[1]+' が fx-src のパラメーターにある');
   ok(B.bind('M',id,{ctx:{},strips:[],st:{},n:{}})===null,'SS-5c: '+id+' はノード未作成なら旧方式');
   const v=d.def;ok(r[0].map(v)===(m[2]?m[2](v):v),'SS-5c: '+id+' の変換は bus.js の up() と同じ')}
  else{off.push(id);ok(r===null,'SS-5c: '+id+' は旧方式のまま')}});
 const has=i=>on.indexOf(i)>=0;
 ok(['mbX1','mbX2','mbT1','mbR2','mbA3','mbL1','mbG2','mbOut','mbMix','psSh','psFine','psGrain','psMix','rbMix','rbFb','glMix','vcLo','vcHi','vcAtk','vcRel','vcNoise','vcFmt','vcMix','spAmt','spTilt','spMix'].every(has),'SS-5c: 連続つまみが載っている('+on.length+'個)');
 ok(['mbS1','mbM3','rbLen','glLen','glProb','glRep','glRev','glPitch','vcBands','spMode','spFz','spSize'].every(i=>off.indexOf(i)>=0)&&['mbOn','psOn','rbOn','glOn','vcOn','vcSrc','spOn'].every(i=>!has(i)),'SS-5c: seg・ON/OFF・確率/分割数は旧方式(SOLO/MUTE・MODE・FREEZE・SIZE を含む)');
 ok(on.every(i=>B.IDS.master.indexOf(i)>=0)&&off.every(i=>B.IDS.master.indexOf(i)<0),'SS-5c: IDS.master に載せたものだけ入る');
 ok(B.bind(0,'spAmt',{ctx:{},strips:[{vol:{gain:fp()},pan:{pan:fp()},st:{}}],st:{},n:{}})===null,'SS-5c: トラック側(数値トラック)では載らない=マスターFXのみ');
 ok(B.bind('M','gtThr',{ctx:{},st:{gt:{w:mk({threshold:fp()})}},n:{}})!==null&&B.bind('M','saMix',{ctx:{},st:{sa:{w:mk({mix:fp()})}},n:{}})[0].map(.5)===50,'SS-5c: 既存の表(SS-5a)は変わらない')}
console.log(err?'FAIL '+err:'sched OK');process.exit(err?1:0)
