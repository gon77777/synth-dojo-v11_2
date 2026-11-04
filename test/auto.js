// オートメーション基盤(v3.5): node test/auto.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const ctx={console,setInterval,clearInterval,Math};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext('var SD={};',ctx);
const J=p=>path.join(__dirname,'..','www','js',p);
['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','fxnew.js','fxparams.js','seq.js','auto.js','modlib.js'].forEach(f=>{try{vm.runInContext(fs.readFileSync(J(f),'utf8'),ctx,{filename:f})}catch(e){if(f==='auto.js'||f==='seq.js'||f==='mixdefs.js')throw e}});
const SD=ctx.SD,A=SD.Auto;let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};const near=(a,b,e)=>Math.abs(a-b)<=(e||1e-9);
const lane=pts=>({trk:0,id:'cutoff',mute:false,pts});
// ---- eval ----
{const l=lane([[0,.2,'L'],[384,.8,'L']]);
 ok(near(A.eval(l,0),.2)&&near(A.eval(l,384),.8),'端点一致');ok(near(A.eval(l,192),.5),'直線の中点');
 ok(near(A.eval(l,-50),.2)&&near(A.eval(l,9999),.8),'前後は端の値を保つ');
 ok(A.eval(lane([]),0)===null,'空レーンはnull');
 for(const sh of ['L','E','G','C']){const m=lane([[0,0,sh],[384,1,'L']]);let prev=-1,mono=true;for(let t=0;t<=384;t+=8){const v=A.eval(m,t);if(v<prev-1e-12)mono=false;prev=v}ok(mono,sh+' 単調増加');ok(near(A.eval(m,0),0)&&near(A.eval(m,384),1),sh+' 端点')}
 ok(A.eval(lane([[0,0,'S'],[384,1,'L']]),383)===0,'S は階段(次の点まで保つ)');
 ok(A.eval(lane([[0,0,'E'],[384,1,'L']]),192)<.5,'E は後半ほど急(中点が直線より下)');
 ok(A.eval(lane([[0,0,'G'],[384,1,'L']]),192)>.5,'G は前半ほど急(中点が直線より上)');
 ok(near(A.eval(lane([[0,0,'C'],[384,1,'L']]),192),.5),'C は中点で0.5');
 ok(A.eval(lane([[0,0,'L',.8],[384,1,'L']]),192)<.5&&A.eval(lane([[0,0,'L',-.8],[384,1,'L']]),192)>.5,'cuの曲がりの向き');
 const d=lane([[0,0,'L'],[100,1,'S'],[100,0,'L'],[200,.5,'L']]);ok(A.eval(d,100)===0&&A.eval(d,99)>.9,'同じtickは後ろの点が勝つ(ジャンプ)');
 ok(A.sample(l,0,384,5).join()==='0.2,0.35,0.5,0.65,0.8'||A.sample(l,0,384,5).every((v,i)=>near(v,.2+.15*i)),'sample');}
// ---- 値変換 ----
{const p=SD.defs.analog.byId.cutoff,q=SD.defs.analog.byId.fType||SD.defs.analog.P.find(x=>x.type==='seg');
 ok(near(A.toValue(p,0),p.min,1e-6)&&near(A.toValue(p,1),p.max,1e-3),'toValue 端点(対数つまみ)');ok(near(A.fromValue(p,A.toValue(p,.4)),.4,.01),'往復');
 ok(A.toValue(q,0)===q.opts[0][0]&&A.toValue(q,q.opts.length-1)===q.opts[q.opts.length-1][0],'seg 変換');ok(A.fromValue(q,q.opts[1][0])===1,'seg 逆変換');}
// ---- shape ----
{const peaks=(pts,t0,t1)=>{const l={pts};let c=0,pv=null,dir=0;const a=A.sample(l,t0,t1,4000);for(let i=1;i<a.length;i++){const d=a[i]-a[i-1];if(Math.abs(d)<1e-9)continue;const s=d>0?1:-1;if(dir>0&&s<0)c++;dir=s}return c};
 const T1=384*4;
 for(const nm of A.SHAPES){const P=A.shape(nm,{t0:0,t1:T1,n:4,depth:.6,center:.5,seed:7});ok(P.length>=2,nm+' 点がある');
  ok(P.every(q=>q[1]>=-1e-9&&q[1]<=1+1e-9),nm+' 0〜1');ok(P.every((q,i)=>i===0||q[0]>=P[i-1][0]),nm+' tick昇順');
  ok(P.every(q=>SD.Auto&&'LSEGC'.indexOf(q[2])>=0),nm+' sh');
  const v=A.sample({pts:P},0,T1,2000);ok(Math.max(...v)<=.8+1e-6&&Math.min(...v)>=.2-1e-6,nm+' 振れ幅は depth 内')}
 ok(peaks(A.shape('tri',{t0:0,t1:T1,n:4}),0,T1)===4,'tri 4周期=山4つ');
 ok(peaks(A.shape('sine',{t0:0,t1:T1,n:6,phase:.25}),0,T1)>=5,'sine 6周期');
 {const P=A.shape('square',{t0:0,t1:T1,n:4,depth:1,center:.5}),v=A.sample({pts:P},0,T1,800);ok(v.every(x=>x===0||x===1),'square は0と1だけ');}
 {const P=A.shape('stairs',{t0:0,t1:T1,steps:5,depth:1,center:.5}),v=new Set(A.sample({pts:P},0,T1-1,500).map(x=>x.toFixed(4)));ok(v.size===5,'stairs 5段 '+v.size);}
 {const a=JSON.stringify(A.shape('random_sh',{n:8,seed:3})),b=JSON.stringify(A.shape('random_sh',{n:8,seed:3})),c=JSON.stringify(A.shape('random_sh',{n:8,seed:4}));ok(a===b&&a!==c,'random_sh は種で決定的');}
 {const P=A.shape('chirp',{t0:0,t1:T1,n:6,depth:1}),pk=P.filter((q,i)=>i>0&&i<P.length-1&&q[1]>.99).map(q=>q[0]),g=pk.slice(1).map((x,i)=>x-pk[i]);ok(pk.length===6&&g.every((x,i)=>i===0||x<g[i-1]),'chirp 周期が単調に短くなる '+g);}
 {const P=A.shape('saw_up',{t0:0,t1:384*2,n:2}),l={pts:P};ok(A.eval(l,383)>.95&&A.eval(l,384)<.05,'saw_up は周期の終わりで急に戻る');}
 {const P=A.shape('sine',{t0:0,t1:384,n:1,phase:0}),l={pts:P};ok(P.length>=16,'sine 16点以上');ok(near(A.eval(l,0),.5,1e-6)&&A.eval(l,96)>.98,'sine は中心から上昇');}
 {const P=A.shape('tri',{t0:100,t1:700,n:3,phase:.3});ok(P[0][0]===100&&P[P.length-1][0]===700,'位相ずらしでも範囲 t0〜t1 に収まる');}}
// ---- thin ----
{const raw=[];for(let t=0;t<=384;t+=2)raw.push([t,.5+.4*Math.sin(t/60),'L']);const tol=.01,th=A.thin(raw,tol),l={pts:th};
 let mx=0;raw.forEach(q=>{mx=Math.max(mx,Math.abs(A.eval(l,q[0])-q[1]))});ok(mx<=tol+1e-9,'thin 最大誤差 '+mx);ok(th.length<raw.length/3,'thin 点が減る '+th.length+'/'+raw.length);ok(th[0][0]===0&&th[th.length-1][0]===384,'thin 端点保持');}
// ---- 編集・保存・上限 ----
{const l=lane([]);[[300,.3],[100,.1],[200,.2],[100,.5]].forEach(([t,v])=>A.insert(l,t,v));ok(l.pts.map(q=>q[0]).join()==='100,200,300','insert 昇順・同tickは置換');
 A.move(l,1,999,.9);ok(l.pts[1][0]===300,'move は隣を越えない');A.remove(l,0);ok(l.pts.length===2,'remove');ok(A.snap(50,24)===48&&A.snap(60,0)===60,'snap');
 const au=A.mk(4),def=(t,id)=>SD.defs.analog.byId[id]||null;
 for(let i=0;i<30;i++)A.addLane(au,0,i<8?'cutoff':'x'+i,def);
 ok(A.addLane(au,0,'cutoff',def)===au.lanes[0],'同じ対象は既存を返す');
 const au2=A.mk(4),ids=SD.defs.analog.P.filter(p=>p.auto!==false).slice(0,20).map(p=>p.id);ids.forEach(id=>A.addLane(au2,0,id,def));ok(au2.lanes.length===16,'レーン上限16 '+au2.lanes.length);
 ok(A.addLane(A.mk(),'M','wTable',(t,id)=>SD.defs.wt.byId[id])===null,'auto:false(wTable)は拒否');
 ok(SD.defs.analog.byId.rvbSize.auto===false&&SD.defs.analog.byId.rvbSize.autoWhy,'rvbSize は auto:false+理由');ok(SD.defs.fm.byId.fAlg.auto==='step','fAlg は auto:step');
 ok(SD.defs.analog.byId.rvbMix.auto!==false&&SD.defs.analog.byId.rvbPre.auto!==false,'rvbMix/rvbPre は対象');
 const au3=A.mk(2);const a=A.addLane(au3,'M','master',def);a.pts=A.shape('ramp_up',{t0:0,t1:768});
 const rt=A.clean(JSON.parse(JSON.stringify(au3)),def);ok(JSON.stringify(rt)===JSON.stringify(au3),'JSON往復');
 const bad=A.clean({bars:3,lanes:[{trk:9,id:'cutoff',pts:[[999999,5,'Z'],[-4,-1],['a',1]]},{id:7}]},def);ok(bad.bars===4&&bad.lanes.length===1&&bad.lanes[0].trk===SD.MAXT-1&&bad.lanes[0].pts.every(q=>q[0]>=0&&q[0]<=1536&&q[1]>=0&&q[1]<=1),'clean が不正値を丸める');
 ok(A.clean(null).lanes.length===0&&A.clean({}).bars===4,'旧データ(au無し)はレーン無し');}
// ---- 描画エディタ(v3.6) ----
{const hi=1,len=1536,mk=()=>({trk:0,id:'cutoff',mute:false,pts:[]});
 const l=mk();const raw=[];for(let t=0;t<=384;t+=5)raw.push([t,.5+.4*Math.sin(t/50)]);
 A.pen(l,raw,24,.01,hi,false,len);ok(l.pts.length>3&&l.pts.every(q=>q[0]%24===0),'PEN: グリッドにスナップ');ok(l.pts.every((q,i)=>i===0||q[0]>=l.pts[i-1][0]),'PEN: 昇順');
 ok(l.pts.length<raw.length/3,'PEN: 間引かれる '+l.pts.length);
 A.pen(l,[[500,.1],[700,.9]],24,.01,hi,false,len);ok(l.pts.some(q=>q[0]===504)&&l.pts.some(q=>q[0]===696),'PEN: 続けて描ける');
 A.pen(l,[[100,.2],[60,.8],[100,.3]],24,.01,hi,false,len);const at=l.pts.filter(q=>q[0]===96);ok(at.length===1&&near(at[0][1],.3),'PEN: 逆走・同tickは最後が勝つ');
 const m=mk();A.line(m,384,1,0,0,hi,false);ok(m.pts.length===2&&m.pts[0][0]===0&&m.pts[1][1]===1,'LINE: 逆向きでも2点');
 const sg=mk();A.line(sg,0,0,384,1,4,true);ok(sg.pts.every(q=>q[2]==='S'&&Number.isInteger(q[1]))&&sg.pts[1][1]===4,'LINE: 選択式は階段・番号');
 const e=mk();e.pts=A.shape('ramp_up',{t0:0,t1:384});A.cut(e,100,300);ok(e.pts.length===2,'ERASE: 範囲の点を消す(端は残る)');
 const sm=mk();sm.pts=[[0,.2,'L'],[1000,.7,'L']];A.seam(sm,1536);ok(sm.pts[sm.pts.length-1][0]===1536&&sm.pts[sm.pts.length-1][1]===.2,'継ぎ目: 末尾を先頭の値に');
 const sm2=mk();sm2.pts=[[0,.2,'L'],[1536,.7,'L']];A.seam(sm2,1536);ok(sm2.pts.length===2&&sm2.pts[1][1]===.2,'継ぎ目: 末尾の点があれば値をそろえる');
 const c=mk();c.pts=[[0,.1,'L'],[96,.9,'L'],[192,.1,'L'],[600,.5,'L']];const clip=A.selCopy(c,0,192);ok(clip.length===3&&clip[2][0]===192,'SEL: 複製');
 A.paste(c,clip,768,len);ok(c.pts.filter(q=>q[0]>=768).length===3&&c.pts.every((q,i)=>i===0||q[0]>=c.pts[i-1][0]),'SEL: 貼り付け');
 const r=A.selMove(c,0,192,48,.05,len,hi,false);ok(r[0]===48&&c.pts[0][0]===48&&near(c.pts[0][1],.15),'SEL: 移動(時間・値)');
 A.selMove(c,48,240,-9999,0,len,hi,false);ok(c.pts[0][0]===0,'SEL: 範囲外へは出ない');
 const sc=mk();sc.pts=[[0,.4,'L'],[96,.6,'L']];A.selScale(sc,0,96,2,hi,false);ok(near(sc.pts[0][1],.3)&&near(sc.pts[1][1],.7),'SEL: 上下スケール(中心を保つ)');
 const h=mk();h.pts=[[0,.2,'L'],[100,.8,'L']];ok(A.hit(h,98,.78,10,.1,1)===1&&A.hit(h,50,.5,10,.1,1)===-1,'POINT: あたり判定');
 const au={n:0};const H=new A.Hist(()=>au,v=>{Object.keys(au).forEach(k=>delete au[k]);Object.assign(au,v)});
 for(let i=1;i<=25;i++){H.push();au.n=i}ok(H.u.length===20,'UNDOは20段');
 H.undo();ok(au.n===24,'undo');H.undo();H.redo();ok(au.n===24,'redo');H.push();au.n=99;ok(H.r.length===0&&H.undo()&&au.n===24,'新しい編集でredoは消える');}
// ---- 再生エンジン(偽クロック・偽setParam) ----
function mkEng(au,bpm){const f={t:0,bpm:bpm||120,calls:[],tm:null,fn:null,au};
 f.io={now:()=>f.t,bpm:()=>f.bpm,au:()=>f.au,def:(t,id)=>SD.defs.analog.byId[id]||(SD.PLAYP[id]||null),setParam:(t,id,v,n)=>f.calls.push({t:f.t,trk:t,id,v,n}),timer:{set:(fn,ms)=>{f.fn=fn;f.tm=1;return 1},clear:()=>{f.tm=null;f.fn=null}},ms:5};
 f.e=new SD.Auto.Engine(f.io);f.run=(to)=>{while(f.t<to-1e-9){f.t=Math.round((f.t+.005)*1e6)/1e6;f.e.update()}};return f}
{const au=A.mk(1),l=A.addLane(au,0,'cutoff',(t,id)=>SD.defs.analog.byId[id]);l.pts=[[0,0,'L'],[384,1,'L']];
 const f=mkEng(au,120);ok(f.tm===null,'開始前はタイマー無し');f.e.start(0);ok(f.tm===1,'レーンがあれば開始でタイマー');
 f.run(1);const p=SD.defs.analog.byId.cutoff;
 ok(f.calls.length>50,'200Hzで呼ばれる '+f.calls.length);
 ok(f.calls.every(c=>c.id==='cutoff'&&c.trk===0),'呼び先');
 // 120BPM: 1秒=2拍=192tick → 値=192/384=.5
 const last=f.calls[f.calls.length-1];ok(near(last.n,.5,.02),'1秒で半分 '+last.n);ok(near(last.v,SD.fromN(p,last.n),1e-6),'実値=fromN(正規化値)');
 ok(f.calls.every((c,i)=>i===0||c.n>=f.calls[i-1].n-1e-9),'単調');
 // ループ: 2秒=1小節で巻き戻る
 f.run(2.5);const w=f.calls.filter(c=>c.t>2.0);ok(w.length&&w[0].n<.1,'bars=1 で2秒後に巻き戻る');
 // 評価と一致
 const pos=(1.0/60*120*96);ok(near(A.eval(l,pos),.5,.01),'eval と一致');
 f.e.stop();ok(f.tm===null,'stopでタイマー停止');const n0=f.calls.length;f.t+=1;f.e.update();ok(f.calls.length===n0,'停止後は呼ばれない');}
{// 変化が無ければ呼ばない/ミュート/auto:false/不明ID
 const au=A.mk(1),ld={trk:0,id:'cutoff',mute:false,pts:[[0,.5,'L'],[384,.5,'L']]};au.lanes.push(ld,{trk:0,id:'wTable',mute:false,pts:[[0,0,'S']]},{trk:0,id:'nothing',mute:false,pts:[[0,.2,'S']]},{trk:0,id:'res',mute:true,pts:[[0,.2,'S']]});
 const f=mkEng(au);f.e.start(0);f.run(.5);ok(f.calls.length===1&&f.calls[0].id==='cutoff','一定値は1回だけ・auto:false/不明ID/ミュートは呼ばれない('+f.calls.map(c=>c.id)+')');}
{// TOUCH
 const au=A.mk(4),l=A.addLane(au,0,'cutoff',(t,id)=>SD.defs.analog.byId[id]);l.pts=[[0,.2,'L'],[1536,.2,'L']];const f=mkEng(au);f.e.start(0);f.run(.1);const n1=f.calls.length;
 f.e.grab(0,'cutoff');f.run(.5);ok(f.calls.length===n1,'掴んでいる間はレーンが書き込まない');
 f.e.release(0,'cutoff',.9);f.run(.53);const mid=f.calls.filter(c=>c.t>.5&&c.t<=.53);ok(mid.length&&mid[0].n>.5,'離した直後はユーザー値寄り');
 f.run(.8);const e=f.calls[f.calls.length-1];ok(near(e.n,.2,.01),'約100ms後にレーンの値へ戻る '+e.n);}
{// テンポ変更でも位置が飛ばない(sBpmレーン相当: bpmを途中で変える)
 const au=A.mk(16),l=A.addLane(au,0,'cutoff',(t,id)=>SD.defs.analog.byId[id]);l.pts=[[0,0,'L'],[16*384,1,'L']];const f=mkEng(au,120);f.e.start(0);f.run(1);const a=f.e.pos;f.bpm=60;f.run(2);const b=f.e.pos;
 ok(near(a,192,2)&&near(b-a,96,2),'テンポ変更は積算で追従 '+a+','+(b-a));}
{// sBpmレーンは演奏設定として対象
 const p=SD.PLAYP.sBpm;ok(p&&p.auto!==false,'sBpm は対象');const v=A.toValue(p,A.fromValue(p,150));ok(v===150,'sBpm 往復');}
// ---- 旧互換: play の保存に au が無くても読める ----
{const io={now:()=>0,on(){},off(){},sched(){},unsched(){}};const p=new SD.Play(io);p.setState({bpm:100});ok(p.au&&p.au.lanes.length===0,'Play.au 既定は空');
 const q=new SD.Play(io);q.au=A.mk(2);const l=A.addLane(q.au,0,'cutoff',(t,id)=>SD.defs.analog.byId[id]);l.pts=[[0,.1,'L'],[768,.9,'L']];
 const st=JSON.parse(JSON.stringify(q.getState())),r=new SD.Play(io);r.setState(st);ok(JSON.stringify(r.au)===JSON.stringify(q.au),'Play 保存・復元で au が往復');}
// ---- v3.7: REC ----
{const D=(t,id)=>SD.defs.analog.byId[id],hi=1;
 // recWrite: 範囲を置き換え・前後は残る・thinで点が減る・昇順
 const l=lane([[0,.1,'L'],[1536,.9,'L']]);const raw=[];for(let t=384;t<=768;t+=6)raw.push([t,.2+.6*(t-384)/384]);
 A.recWrite(l,raw,hi,false);const P=l.pts;ok(P[0][0]===0&&P[P.length-1][0]===1536,'recWrite: 前後の点は残る');
 ok(P.every((q,i)=>!i||q[0]>=P[i-1][0]),'recWrite: tick昇順');ok(P.length<raw.length&&P.length>=4,'recWrite: 直線は間引かれる('+P.length+')');
 ok(near(A.eval(l,576),.5,.02),'recWrite: 録音区間の値');
 const sg=lane([]);A.recWrite(sg,[[0,0],[10,0],[20,2],[30,2],[40,1]],3,true);ok(sg.pts.length===3&&sg.pts.every(q=>q[2]==='S'),'recWrite: 選択式は階段で同値をまとめる');
 // Engine: REC → grab → recPt → release でレーンができる(偽クロック)
 const au=A.mk(4);let t=0,bpm=120,ch=0,pre=0;
 const e=new A.Engine({now:()=>t,bpm:()=>bpm,au:()=>au,def:D,setParam(){},timer:{set(){return 1},clear(){}},ms:5,pre:()=>pre++,changed:()=>ch++});
 e.rec=true;e.start(0);
 const step=sec=>{for(let i=0;i<sec*200;i++){t+=.005;e.update()}};
 step(.5);e.grab(0,'cutoff');ok(A.find(au,0,'cutoff')>=0,'REC: つまみを掴むとレーンが自動で作られる');
 for(let i=0;i<100;i++){step(.01);e.recPt(0,'cutoff',i/100)}
 e.release(0,'cutoff',1);const L=au.lanes[0];
 ok(L.pts.length>=2&&ch===1&&pre===1,'REC: 離すと書き込み・履歴・通知が1回ずつ('+L.pts.length+','+ch+','+pre+')');
 const t0=L.pts[0][0],t1=L.pts[L.pts.length-1][0];ok(t0>=90&&t0<=100&&t1>t0+90&&near(A.eval(L,(t0+t1)/2),.5,.08),'REC: 録音した位置と形('+t0+'〜'+t1+')');
 // REC OFF では書かない
 const au2=A.mk(4);const e2=new A.Engine({now:()=>t,bpm:()=>bpm,au:()=>au2,def:D,setParam(){},timer:{set(){return 1},clear(){}},ms:5});e2.start(0);e2.grab(0,'cutoff');e2.recPt(0,'cutoff',.5);e2.release(0,'cutoff',.5);
 ok(au2.lanes.length===0,'REC OFF ではレーンを作らない');
 // auto:false は録音しない
 const au3=A.mk(4),e3=new A.Engine({now:()=>t,bpm:()=>bpm,au:()=>au3,def:(k,id)=>SD.defs.analog.byId[id]||{auto:false},setParam(){},timer:{set(){return 1},clear(){}},ms:5});e3.rec=true;e3.start(0);e3.grab(0,'wTable');ok(au3.lanes.length===0,'auto:false は録音しない');
 // 停止でも保留分を書く
 const au4=A.mk(4),e4=new A.Engine({now:()=>t,bpm:()=>bpm,au:()=>au4,def:D,setParam(){},timer:{set(){return 1},clear(){}},ms:5});e4.rec=true;e4.start(t);e4.grab(0,'res');e4.recPt(0,'res',.3);t+=.1;e4.update();e4.recPt(0,'res',.6);e4.stop();ok(au4.lanes[0]&&au4.lanes[0].pts.length>=2,'停止で保留分を書く');}
// ---- v3.7: ミキサーのつまみ(PITCH・DLY・RVB)・保存 ----
{const m=SD.mixClean({tPitch:99,tDly:-1});ok(m.tPitch===24&&m.tDly===0&&m.tRvb===1,'mixClean: 範囲に丸める・旧データは既定(0/100%/100%)');
 const d=SD.MIXDEF();ok(d.tPitch===0&&d.tDly===1&&d.tRvb===1,'MIXDEF 既定');
 for(const id of ['tPitch','tDly','tRvb']){const p=SD.MIXP.find(q=>q.id===id);ok(p&&p.auto!==false,id+' は対象');const v=SD.Auto.toValue(p,SD.Auto.fromValue(p,p.min));ok(near(v,p.min),id+' 往復')}
 const au=A.mk(2),l=A.addLane(au,2,'tPitch',(t,id)=>SD.MIXP.find(q=>q.id===id));ok(l&&l.trk===2,'TRK: トラック2に tPitch のレーン');
 l.pts=[[0,.5,'L'],[768,1,'L']];const c=A.clean(A.json(au),(t,id)=>SD.MIXP.find(q=>q.id===id));ok(JSON.stringify(c)===JSON.stringify(au),'複数トラックのレーンが保存・読込で往復');}
// ---- v3.8: 目標の判定 ----
{const df=(t,id)=>A.defOf('analog',id),mk=pts=>A.mkFromSpecs([{id:'cutoff',pts}],4,df),chk=(au,g)=>A.checkAu(au,[Object.assign({id:'cutoff'},g)],df)[0];
 ok(chk(mk([[0,400],[1536,8000]]),{at:[[0,400,.05],[1536,8000,.05]]}).ok,'at: 合格');ok(!chk(mk([[0,400],[1536,2000]]),{at:[[1536,8000,.05]]}).ok,'at: 外れると不合格');
 ok(chk(mk([[0,400],[1536,8000]]),{mono:[[0,1536,'up']]}).ok&&!chk(mk([[0,400],[1536,8000]]),{mono:[[0,1536,'down']]}).ok,'mono: 向き');
 ok(!chk(mk([[0,400,'L'],[768,8000,'L'],[1536,400]]),{mono:[[0,1536,'up']]}).ok,'mono: 途中で下がると不合格');
 ok(chk(mk([[0,1000],[1536,1000]]),{hold:[[0,1536]]}).ok&&!chk(mk([[0,400],[1536,8000]]),{hold:[[0,1536]]}).ok,'hold');
 ok(chk(mk([[0,500],[1536,2000]]),{rng:[[0,1536,400,2500]]}).ok&&!chk(mk([[0,500],[1536,9000]]),{rng:[[0,1536,400,2500]]}).ok,'rng');
 const tri=[];for(let k=0;k<4;k++){tri.push([k*384,300,'L'],[k*384+192,6000,'L'])}tri.push([1536,300]);
 ok(chk(mk(tri),{cyc:[[0,1536,4,.4]]}).ok&&!chk(mk(tri),{cyc:[[0,1536,5,.4]]}).ok&&!chk(mk([[0,300],[1536,400]]),{cyc:[[0,1536,2,.3]]}).ok,'cyc: 山の数と振れ幅');
 const st=[[0,300,'S'],[384,1000,'S'],[768,3000,'S'],[1152,8000,'S'],[1536,8000,'S']];
 ok(chk(mk(st),{stp:[[0,1536,4]]}).ok&&!chk(mk([[0,300],[1536,8000]]),{stp:[[0,1536,2]]}).ok,'stp: 階段');
 ok(!A.checkAu(A.mk(4),[{id:'cutoff',has:1}],df)[0].ok&&A.checkAu(mk([[0,300]]),[{id:'cutoff',has:1}],df)[0].ok,'has: レーンの有無');
 const m=mk([[0,300],[1536,800]]);m.lanes[0].mute=true;ok(!A.checkAu(m,[{id:'cutoff',has:1}],df)[0].ok,'has: ミュートは不合格');
 ok(A.tickText(0)==='先頭'&&A.tickText(1536)==='4小節'&&A.tickText(192)==='2拍','tickText');
 const sg=A.mkFromSpecs([{id:'saType',pts:[[0,'SOFT'],[384,'TAPE']]}],1,(t,id)=>SD.FXP.find(q=>q.id===id));ok(true,'seg の実値レーン');}

// ---- MI: CC → grab → recPt×N → 300ms後 release → レーンの形(app.js の auUser と同じ呼び順を偽の io で再現) ----
{const MIDI_REL_MS=300;let t=0,bpm=120;
 const mkE=(def)=>{const au=A.mk(4);return{au,e:new A.Engine({now:()=>t,bpm:()=>bpm,au:()=>au,def:def||((k,id)=>SD.defs.analog.byId[id]||null),setParam(){},timer:{set(){return 1},clear(){}},ms:5})}};
 const step=s=>{t+=s;this_e&&this_e.update()};let this_e=null;
 // app.js の auUser と同じ: 初回 grab、毎回 recPt、離す時間は後で release
 const user=(E,id,n,trk)=>{const k=trk+':'+id;if(!E.ut[k])E.e.grab(trk,id);E.ut[k]=1;E.e.recPt(trk,id,n)};
 {const E=mkE();E.ut={};this_e=E.e;E.e.rec=true;E.e.start(0);
  for(let i=0;i<=40;i++){step(.02);user(E,'cutoff',i/40,0)}
  step(MIDI_REL_MS/1000);E.e.release(0,'cutoff',1);delete E.ut['0:cutoff'];
  const i=A.find(E.au,0,'cutoff'),l=E.au.lanes[i];
  ok(i>=0&&l&&l.pts.length>=2,'MI: CCを回すとレーンができる');
  ok(l.pts.every((q,j)=>j===0||q[0]>=l.pts[j-1][0]),'MI: 点は tick 昇順');
  ok(l.pts.every(q=>q[1]>=0&&q[1]<=1),'MI: 値は 0〜1');
  const p=SD.defs.analog.byId.cutoff,v0=A.toValue(p,l.pts[0][1]),v1=A.toValue(p,l.pts[l.pts.length-1][1]);
  ok(v1>v0&&A.toValue(p,l.pts[l.pts.length-1][1])>p.min,'MI: 上げた向きが保たれる');}
 // 300ms 止めて再開 → 別区間(範囲置き換えで破綻しない)
 {const E=mkE();E.ut={};this_e=E.e;E.e.rec=true;E.e.start(0);
  for(let i=0;i<10;i++){step(.02);user(E,'res',.2+i*.02,0)}
  step(.3);E.e.release(0,'res',.4);delete E.ut['0:res'];
  const n1=E.au.lanes[0].pts.length;
  for(let i=0;i<10;i++){step(.02);user(E,'res',.8-i*.02,0)}
  step(.3);E.e.release(0,'res',.6);
  ok(E.au.lanes.length===1&&E.au.lanes[0].pts.length>=n1&&E.au.lanes[0].pts.every((q,j,a)=>j===0||q[0]>=a[j-1][0]),'MI: 止まって再開しても1本のレーンで昇順');}
 // 停止中(run=false)は書かない・REC OFF は書かない・auto:false は書かない
 {const E=mkE();E.ut={};this_e=E.e;E.e.rec=true;/* start しない */E.e.grab(0,'cutoff');E.e.recPt(0,'cutoff',.5);E.e.release(0,'cutoff',.5);ok(E.au.lanes.length===0,'MI: 停止中は書かない');}
 {const E=mkE();E.ut={};this_e=E.e;E.e.rec=false;E.e.start(0);step(.1);E.e.grab(0,'cutoff');E.e.recPt(0,'cutoff',.5);E.e.release(0,'cutoff',.5);ok(E.au.lanes.length===0,'MI: REC OFF は書かない(TOUCHのみ)');}
 {const E=mkE((k,id)=>SD.defs.analog.byId[id]||{auto:false});E.ut={};this_e=E.e;E.e.rec=true;E.e.start(0);step(.1);E.e.grab(0,'wTable');E.e.recPt(0,'wTable',.5);E.e.release(0,'wTable',.5);ok(E.au.lanes.length===0,'MI: auto:false は書かない');}
 // マスターFX(trk:"M")・別トラックの同じつまみは別レーン
 {const E=mkE((k,id)=>(SD.FXP||[]).find(q=>q.id===id)||SD.defs.analog.byId[id]||null);E.ut={};this_e=E.e;E.e.rec=true;E.e.start(0);
  const fx=(SD.FXP||[])[0];if(fx){for(let i=0;i<6;i++){step(.02);user(E,fx.id,i/6,'M')}step(.3);E.e.release('M',fx.id,.8);ok(A.find(E.au,'M',fx.id)>=0,'MI: マスターFX(trk M)のレーン')}
  for(let i=0;i<6;i++){step(.02);user(E,'cutoff',i/6,1)}step(.3);E.e.release(1,'cutoff',.8);
  for(let i=0;i<6;i++){step(.02);user(E,'cutoff',i/6,2)}step(.3);E.e.release(2,'cutoff',.8);
  ok(A.find(E.au,1,'cutoff')>=0&&A.find(E.au,2,'cutoff')>=0&&A.find(E.au,1,'cutoff')!==A.find(E.au,2,'cutoff'),'MI: トラックごとに別レーン');}
}
/* MA-1: モジュラーのレーンID('.' を含む) */
{const dm=(trk,id)=>SD.defs.mod.byId[id]||null,def=(trk,id)=>id.indexOf('.')>0?null:SD.defs.analog.byId[id]||null;
 const au=A.mk(2),l=A.addLane(au,0,'vcf1.cutoff',dm);ok(l&&A.find(au,0,'vcf1.cutoff')===0,'MA-1: . 付きIDのレーンを作れる');
 ok(A.addLane(au,0,'rev1.size',dm)===null&&A.addLane(au,0,'div1.n',dm)===null,'MA-1: auto:false(rev.size・div.n)は拒否');
 ok(A.addLane(au,0,'vcf1.nope',dm)===null&&A.addLane(au,0,'xyz1.cutoff',dm)===null,'MA-1: 存在しない種類・つまみは拒否');
 l.pts=[[0,.2,'L'],[384,.9,'L']];A.addLane(au,'M','vco2.wave',dm).pts=[[0,0,'S'],[384,2,'S']];
 const j=JSON.parse(JSON.stringify(A.json(au))),c=A.clean(j,dm);
 ok(A.find(c,0,'vcf1.cutoff')===0&&c.lanes[0].pts.length===2&&near(c.lanes[0].pts[1][1],.9),'MA-1: . 付きIDの保存・読み込みの往復');
 ok(c.lanes[1].pts[1][1]===2&&c.lanes[1].pts[1][2]==='S','MA-1: seg 系(vco2.wave)は階段のまま往復');
 /* 孤児(いまの定義が引けない=別のシンセ・ラックに無い)でも、ID から定義を引いて整形できる */
 const c2=A.clean(j,def);ok(A.find(c2,0,'vcf1.cutoff')===0&&c2.lanes[1].pts[1][2]==='S'&&c2.lanes[1].pts[1][1]===2,'MA-1: defFn が引けなくても . 付きIDは modLib で整形(seg は階段・値を保つ)');
 const old=A.clean({bars:2,lanes:[{trk:0,id:'cutoff',pts:[[0,.3,'L']]}]},def);ok(old.lanes.length===1&&old.lanes[0].id==='cutoff','MA-1: 旧データ(. なし)はそのまま');
 const sp=A.fromReal({trk:0,id:'vcf1.cutoff',pts:[[0,1200],[384,6000]]},def);ok(sp&&sp.id==='vcf1.cutoff'&&sp.pts.length===2,'MA-1: fromReal も modLib で引く');ok(A.defOf('analog','vcf1.cutoff')&&A.defOf('analog','vcf1.cutoff').auto===true&&A.defOf('mod','rev1.size').auto===false,'MA-1: A.defOf もモジュラーのつまみを引く')}
console.log(err?`NG ${err}件`:'OK auto');process.exit(err?1:0);
