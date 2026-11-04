// 拍子 SD.METER のテスト(MT-1a): node test/meter.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
const ctx={console};ctx.window=ctx;ctx.SD={};vm.createContext(ctx);
['meter.js','auto.js'].forEach(f=>{try{vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),ctx,{filename:f})}catch(e){if(f==='meter.js')throw e}});
const M=ctx.SD.METER;let err=0;const bad=m=>{console.error('NG: '+m);err++};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const mk=(n,d,g)=>({n,d,g:g||null});
/* 代表13拍子: [n,d,barTicks,stepsPerBar,groupSteps] */
const T=[[2,4,192,8,[4,4]],[3,4,288,12,[4,4,4]],[4,4,384,16,[4,4,4,4]],[5,4,480,20,[4,4,4,4,4]],[6,4,576,24,[4,4,4,4,4,4]],[7,4,672,28,[4,4,4,4,4,4,4]],
 [3,8,144,6,[6]],[5,8,240,10,[2,2,2,2,2]],[6,8,288,12,[6,6]],[7,8,336,14,[2,2,2,2,2,2,2]],[9,8,432,18,[6,6,6]],[12,8,576,24,[6,6,6,6]],[15,16,360,15,[3,3,3,3,3]]];
T.forEach(([n,d,bt,sp,gs])=>{const m=mk(n,d),id=n+'/'+d;
 if(M.why(m))bad(id+' が不正と判定: '+M.why(m));
 if(M.barTicks(m)!==bt)bad(id+' barTicks '+M.barTicks(m)+' ≠ '+bt);
 if(M.stepsPerBar(m)!==sp)bad(id+' stepsPerBar '+M.stepsPerBar(m)+' ≠ '+sp);
 if(!eq(M.groupSteps(m),gs))bad(id+' groupSteps '+JSON.stringify(M.groupSteps(m))+' ≠ '+JSON.stringify(gs));
 if(M.groupSteps(m).reduce((a,b)=>a+b,0)!==sp)bad(id+' まとまりの合計が stepsPerBar と違う');
 if(M.label(m)!==id)bad(id+' label')});
/* 境界(最大32ステップ) */
[[8,4],[16,8],[32,16],[1,4],[1,8],[1,16]].forEach(([n,d])=>{if(M.why(mk(n,d)))bad(n+'/'+d+' は有効なはず: '+M.why(mk(n,d)))});
[[9,4],[17,8],[33,16]].forEach(([n,d])=>{if(!M.why(mk(n,d)))bad(n+'/'+d+' は32ステップ超で拒否のはず')});
/* 不正な拍子 */
[[4,3],[4,2],[4,5],[4,32],[4,'4'],[0,4],[-1,4],[1.5,4],['3',4],[NaN,4],[Infinity,4],[4,undefined]].forEach(([n,d])=>{if(M.valid({n,d,g:null}))bad('不正な拍子を受理: '+n+'/'+d)});
[null,undefined,5,'4/4',[]].forEach(x=>{if(M.valid(x))bad('不正な値を受理: '+JSON.stringify(x))});
/* g の検証・グルーピング */
if(!M.valid(mk(7,8,[2,2,3])))bad('7/8 g=[2,2,3] が不正');
if(!eq(M.groupSteps(mk(7,8,[2,2,3])),[4,4,6]))bad('7/8 [2,2,3] のステップ数が [4,4,6] でない: '+JSON.stringify(M.groupSteps(mk(7,8,[2,2,3]))));
if(!eq(M.accents(mk(7,8,[2,2,3])),[0,4,8]))bad('7/8 強拍 [0,4,8]');
if(!eq(M.accents(mk(6,8)),[0,6]))bad('6/8 強拍 [0,6]');
if(!eq(M.accents(mk(4,4)),[0,4,8,12]))bad('4/4 強拍 [0,4,8,12]');
if(!M.isAccent(mk(6,8),6)||M.isAccent(mk(6,8),3))bad('isAccent');
[[7,8,[2,2]],[7,8,[2,2,4]],[7,8,[]],[7,8,[0,7]],[7,8,[2.5,4.5]],[7,8,'223'],[4,4,[1,1,1]]].forEach(([n,d,g])=>{if(M.valid({n,d,g}))bad('不正な g を受理: '+JSON.stringify(g))});
/* 複合拍子・テンポ換算 */
if(!M.isCompound(mk(6,8))||!M.isCompound(mk(9,8))||!M.isCompound(mk(12,8))||M.isCompound(mk(3,4))||M.isCompound(mk(7,8)))bad('isCompound');
if(Math.abs(M.dottedBpm(120)-80)>1e-9)bad('dottedBpm(120)=80');
/* 既定=4/4・旧データ(省略)=4/4 */
if(!eq(M.DEFAULT(),{n:4,d:4,g:null}))bad('DEFAULT');
if(!eq(M.norm(undefined),{n:4,d:4,g:null})||!eq(M.norm(null),{n:4,d:4,g:null}))bad('norm: 省略=4/4');
if(M.norm({n:4,d:3})!==null)bad('norm: 壊れた値は null');
if(M.barTicks()!==384||M.stepsPerBar()!==16)bad('引数なし=4/4');
const n1=M.norm({n:7,d:8,g:[2,2,3]});n1.g[0]=9;if(!eq(M.groups(mk(7,8,[2,2,3])),[2,2,3]))bad('groups が元を共有');
const gg=M.groups(mk(7,8,[2,2,3]));gg[0]=9;const src=mk(7,8,[2,2,3]);M.groups(src)[0]=9;if(src.g[0]!==2)bad('groups が参照を返している');
/* 全プリセットが有効で 32 ステップ以内 */
M.PRESETS.forEach(m=>{if(M.why(m))bad('プリセット不正 '+M.label(m));if(M.stepsPerBar(m)>32)bad('プリセット超過 '+M.label(m))});
/* 有効な全組み合わせで barTicks が 24 の倍数・まとまりの合計=stepsPerBar */
let cnt=0;[4,8,16].forEach(d=>{for(let n=1;n<=40;n++){const m=mk(n,d);if(M.valid(m)){cnt++;if(M.barTicks(m)%24)bad(n+'/'+d+' barTicks が24の倍数でない');if(M.groupSteps(m).reduce((a,b)=>a+b,0)!==M.stepsPerBar(m))bad(n+'/'+d+' まとまりの合計')}}});
if(cnt!==8+16+32)bad('有効な拍子の数 '+cnt+' ≠ 56');
/* 4/4 は auto.js の定数と一致(置換しても変わらない根拠) */
const A=ctx.SD.Auto;if(A){if(M.barTicks(mk(4,4))!==A.TPBAR)bad('4/4 barTicks ≠ TPBAR');if(M.TPS!==A.TPS||M.TPB!==A.TPB)bad('TPS/TPB が auto.js と違う')}else bad('auto.js を読めない');
/* MT-1b: auto.js だけが SD.METER を使う(他のファイルはまだ触らない) */
fs.readdirSync(w).filter(f=>['meter.js','auto.js','seq.js','app.js','course.js','mt.js'].indexOf(f)<0).forEach(f=>{if(/SD\.METER/.test(fs.readFileSync(path.join(w,f),'utf8')))bad(f+' が SD.METER を参照している(MT-5c 時点: auto.js・seq.js・app.js・course.js・mt.js のみ)')});
/* MT-1b: au の保存と長さ */
const J=o=>JSON.stringify(o);
if(J(A.mk(4))!==J({bars:4,lanes:[]})||J(A.mk(8,mk(4,4)))!==J({bars:8,lanes:[]}))bad('4/4 は meter を持たない(旧データと同一)');
if(J(A.mk(4,{n:4,d:4,g:null}))!==J(A.mk(4)))bad('4/4 の明示も meter を持たない');
const a34=A.mk(4,mk(3,4));if(!a34.meter||a34.meter.n!==3||A.len(a34)!==4*288)bad('3/4 の長さ 4×288: '+A.len(a34));
const a68=A.mk(2,mk(6,8));if(A.len(a68)!==2*288||A.bar(a68)!==288)bad('6/8 の長さ');
if(A.len(A.mk(16))!==16*384||A.bar({bars:4,lanes:[]})!==384)bad('4/4 の長さ');
/* 旧データ(meter なし)=4/4 で従来と同一 */
const old={bars:4,lanes:[],scn:[{at:384,s:1,g:'bar'}],mk:[{at:768,name:'A'}],lp:[384,1152]};
if(J(A.clean(old))!==J(old))bad('旧データの往復が変わった: '+J(A.clean(old)));
/* 保存の往復(meter あり) */
const o34={bars:4,lanes:[],meter:mk(3,4),scn:[{at:288,s:1,g:'bar'}],lp:[288,1152]};
const c34=A.clean(JSON.parse(J(o34)));if(J(c34.meter)!==J(mk(3,4))||c34.lp[1]!==1152||c34.scn[0].at!==288)bad('3/4 の往復: '+J(c34));
if(J(A.clean(JSON.parse(J(c34))))!==J(c34))bad('3/4 の2回目の往復');
if(J(A.json(c34))!==J(c34))bad('A.json');
if(J(A.clean({bars:4,lanes:[],lp:[288,1500]}).lp)!=='[288,1500]')bad('4/4×4小節=1536 以内の lp は残る');
const g=A.clean({bars:1,lanes:[],meter:mk(3,4),lp:[0,300]});if(g.lp)bad('3/4×1小節=288 を超える lp は捨てる');
if(A.clean({bars:4,lanes:[],meter:{n:4,d:3}}).meter)bad('不正な meter は捨てる(=4/4)');
if(A.clean({bars:4,lanes:[],meter:'3/4'}).meter)bad('文字列の meter は捨てる');
const g78=A.clean({bars:2,lanes:[],meter:mk(7,8,[2,2,3])});if(J(g78.meter.g)!=='[2,2,3]')bad('g の往復');
/* tickText・グライド・シーン */
if(A.tickText(384)!=='1小節'||A.tickText(288)!=='3拍'||A.tickText(0)!=='先頭'||A.tickText(96)!=='1拍')bad('tickText 4/4 が従来と違う');
if(A.tickText(288,mk(3,4))!=='1小節'||A.tickText(576,mk(3,4))!=='2小節'||A.tickText(96,mk(3,4))!=='1拍')bad('tickText 3/4');
if(A.glideTicks('bar')!==384||A.glideTicks('2bar')!==768||A.glideTicks('beat')!==96||A.glideTicks('0')!==0||A.glideTicks('x')!==0)bad('glideTicks 4/4');
if(A.glideTicks('bar',288)!==288||A.glideTicks('2bar',288)!==576||A.glideTicks('beat',288)!==96)bad('glideTicks 3/4');
const sc=[{at:0,s:0,g:'0'},{at:288,s:1,g:'bar'}];
const h1=A.sceneAt(sc,432,288);if(Math.abs(h1.u-.5)>1e-9)bad('sceneAt 3/4 の途中 u=.5: '+h1.u);
const h2=A.sceneAt(sc,432);if(Math.abs(h2.u-(144/384))>1e-9)bad('sceneAt 4/4 既定');
const snAu=A.clean({bars:4,lanes:[],meter:mk(3,4),scn:[{at:288,s:1,g:'bar'}]});
if(!A.snMet({at:1,scene:'B',glide:'≥1bar'},snAu,[{name:'A'},{name:'B'}]))bad('snMet 3/4: 2小節目(at=1)=288');
if(A.snMet({at:1,scene:'B',glide:'≥1bar'},A.clean({bars:4,lanes:[],scn:[{at:288,s:1,g:'bar'}]}),[{name:'A'},{name:'B'}]))bad('snMet 4/4 では 288 は1小節目の位置でない');
if(!A.snMet({at:1,scene:'B',glide:'≥1bar'},A.clean({bars:4,lanes:[],scn:[{at:384,s:1,g:'bar'}]}),[{name:'A'},{name:'B'}]))bad('snMet 4/4');
if(A.mkFromSpecs([],4,null,mk(3,4)).meter.n!==3)bad('mkFromSpecs の meter');
/* meter.js が無い環境でも 4/4 で動く(旧データ・テストの互換) */
const c2={console};c2.window=c2;c2.SD={};vm.createContext(c2);vm.runInContext(fs.readFileSync(path.join(w,'auto.js'),'utf8'),c2);
const B=c2.SD.Auto;if(B.len(B.mk(4,mk(3,4)))!==1536||B.mk(4,mk(3,4)).meter)bad('meter.js 無しは 4/4');
const idx=fs.readFileSync(path.join(__dirname,'..','www','index.html'),'utf8'),sw=fs.readFileSync(path.join(__dirname,'..','www','sw.js'),'utf8');
if(idx.indexOf('js/meter.js')<0)bad('index.html に meter.js が無い');if(sw.indexOf('js/meter.js')<0)bad('sw.js に meter.js が無い');
/* ---- MT-2a: seq.js の steps 32要素・len 上限32・範囲外の保持・旧データの補完 ---- */
{const cs={console,setInterval,clearInterval};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={};',cs);
['mixdefs.js','seq.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),cs,{filename:f}));
const Q=cs.SD,io={now:()=>0,on(){},off(){},sched:()=>1,unsched(){}},N=()=>new Q.Play(io);
const p=N();if(Q.STEPMAX!==32)bad('STEPMAX=32');
if(p.s.steps.length!==32||p.tr.some(x=>x.steps.length!==32))bad('初期の steps は32要素(SEQ・全トラック)');
p.setLen(99);if(p.s.len!==32)bad('len 上限32');p.setLen(0);if(p.s.len!==1)bad('len 下限1');
/* 範囲外の保持: len を縮めても steps は残り、戻すと復活 */
p.setLen(24);p.s.steps[20].on=true;p.s.steps[20].n=60;p.s.steps[31].on=true;p.setLen(8);
if(!p.s.steps[20].on||p.s.steps[20].n!==60||!p.s.steps[31].on)bad('len を縮めても範囲外が残る');
if(p.count('sOn')!==0)bad('範囲外のステップは数えない');
const st=JSON.parse(JSON.stringify(p.getState())),q=N();q.setState(st);
if(q.s.len!==8||!q.s.steps[20].on||q.s.steps[20].n!==60||!q.s.steps[31].on||q.s.steps.length!==32)bad('保存の往復で範囲外が残る(SEQ)');
q.setLen(24);if(!q.s.steps[20].on)bad('戻すと復活');
/* TRK も同じ */
p.setMode('trk');p.setTrackSel(2);p.cs().steps[25].on=true;p.cs().steps[25].n=67;p.setLen(12);
const t2=N();t2.setState(JSON.parse(JSON.stringify(p.getState())));
if(t2.tr[2].len!==12||!t2.tr[2].steps[25].on||t2.tr[2].steps[25].n!==67||t2.tr[2].steps.length!==32)bad('保存の往復で範囲外が残る(TRK)');
if(p.getTracks()[2].steps.length!==32||p.pattern().steps.length!==32)bad('getTracks/pattern は32要素');
/* 旧データ(16要素)は17〜32を休符で補う・len は従来どおり */
const old=N();old.setState({p:{len:16,scale:'minor',key:9,steps:Array.from({length:16},(_,i)=>({on:i%4===0,n:45}))},trk:{t:0,tr:[{steps:Array.from({length:16},(_,i)=>({on:i===3,n:50})),len:16}]}});
if(old.s.steps.length!==32||old.s.len!==16)bad('旧SEQ: 32要素・len=16');
if(old.s.steps.slice(16).some(x=>x.on||x.n!==48||x.acc||x.sld||x.tie||x.ch))bad('旧SEQ: 17〜32は休符');
if(!old.s.steps[4].on||!old.tr[0].steps[3].on||old.tr[0].steps.length!==32||old.tr[0].steps.slice(16).some(x=>x.on))bad('旧TRK: 補完');
/* 壊れた入力 */
const z=N();z.setState({p:{len:'x',steps:[null,5,{n:'a'}]},trk:{t:0,tr:[{len:-3,steps:'zz'}]}});
if(z.s.steps.length!==32||z.s.len!==16||z.tr[0].steps.length!==32||z.tr[0].len!==1)bad('壊れた入力でも32要素');
/* 発音: len=20 のトラックは19番目まで鳴る・範囲外は鳴らない */
{const lg=[],q2=[],io2={now:()=>0,on:(m)=>lg.push(m),off(){},sched:(fn,t)=>{q2.push({fn,t});return q2.length},unsched(){}},r=new Q.Play(io2);
 r.setMode('seq');r.s.len=20;r.s.steps.forEach((x,i)=>{x.on=true;x.n=40+i});r.start();for(let k=0;k<40;k++)r.seqStep();q2.sort((a,b)=>a.t-b.t).forEach(e=>e.fn());
 const u=lg.filter((m,i)=>lg.indexOf(m)===i);if(u.length!==20||Math.max.apply(null,u)!==59)bad('発音は len まで('+u.length+')')}
}
/* ---- MT-2b: play.meter(保存・fit・無効値)とメトロノームの強拍 ---- */
{const cs={console,setInterval,clearInterval};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={};',cs);
['meter.js','mixdefs.js','seq.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),cs,{filename:f}));
const Q=cs.SD;
const mkP=(clicks)=>{const q=[],io={now:()=>0,on(){},off(){},sched:(fn,t)=>{q.push({fn,t});return q.length},unsched(){},click:(t,a)=>clicks.push([Math.round(t*1000)/1000,a])};return new Q.Play(io)};
const p=mkP([]);
if(!eq(p.getMeter(),{n:4,d:4,g:null})||p.spb()!==16||!eq(p.accArr(),[0,4,8,12]))bad('既定は4/4');
if(p.getState().meter!==undefined)bad('4/4 は meter を保存しない(旧データと同じ)');
if(p.setMeter({n:4,d:5,g:null})!==false||p.setMeter({n:99,d:4,g:null})!==false||p.meter!==null)bad('不正な拍子は拒否(拍子は変わらない)');
p.setMeter({n:7,d:8,g:[2,2,3]},false);
if(p.spb()!==14||!eq(p.accArr(),[0,4,8])||p.s.len!==16)bad('7/8 g=[2,2,3]: 14ステップ・強拍0/4/8・len はそのまま');
p.s.steps[20].on=true;p.setMeter({n:7,d:8,g:[2,2,3]},true);
if(p.s.len!==14||p.tr.some(x=>x.len!==14)||!p.s.steps[20].on)bad('fit: 全トラックの len=14・範囲外は残る');
const r=mkP([]);r.setState(JSON.parse(JSON.stringify(p.getState())));
if(!eq(r.getMeter(),{n:7,d:8,g:[2,2,3]})||r.spb()!==14)bad('meter の保存の往復');
r.setState({});if(r.meter!==null)bad('meter の無いデータ=4/4');r.setState({meter:{n:3,d:7}});if(r.meter!==null)bad('壊れた meter=4/4');
const q5=mkP([]);q5.setMeter({n:5,d:4,g:null},true);if(q5.s.len!==20)bad('5/4=20');q5.setMeter({n:12,d:8,g:null},true);if(q5.s.len!==24)bad('12/8=24');q5.setMeter({n:15,d:16,g:null},true);if(q5.tr[0].len!==15)bad('15/16=15');
/* メトロノーム: 拍子ごとに強拍(まとまりの先頭)で鳴る・小節頭だけ acc=true */
const run=(m,mode,steps,metro)=>{const cl=[],q=mkP(cl);q.setMeter(m,true);q.metro=metro;q.setMode(mode);clearInterval(q.tm);q.tm=null;q.setBpm(120);q.start();for(let k=0;k<steps;k++)mode==='seq'?q.seqStep():q.trkStep();q.stop();return cl};
const idx=cl=>cl.map(c=>Math.round((c[0]-cl[0][0])/.125));
let c=run({n:4,d:4,g:null},'seq',32,true);
if(!eq(idx(c),[0,4,8,12,16,20,24,28])||!eq(c.map(x=>x[1]),[true,false,false,false,true,false,false,false]))bad('4/4 SEQ: 4ステップごと・小節頭が強');
c=run({n:3,d:4,g:null},'trk',24,true);if(!eq(idx(c),[0,4,8,12,16,20])||c[3][1]!==true||c[1][1]!==false)bad('3/4 TRK: 12ステップで小節');
c=run({n:6,d:8,g:null},'seq',24,true);if(!eq(idx(c),[0,6,12,18])||!eq(c.map(x=>x[1]),[true,false,true,false]))bad('6/8: 6ステップ=2つ組');
c=run({n:7,d:8,g:[2,2,3]},'trk',28,true);if(!eq(idx(c),[0,4,8,14,18,22])||c[3][1]!==true)bad('7/8 [2,2,3]: 0/4/8/14/18/22');
if(run({n:4,d:4,g:null},'seq',32,false).length!==0)bad('メトロノームOFFは鳴らさない');
{const q=mkP([]);q.io.click=null;q.metro=true;q.setMode('seq');clearInterval(q.tm);q.start();q.seqStep();}/* click が無い環境でも落ちない */
}
/* ---- MT-2c: スウィングは1/16グリッドの奇数ステップ(拍子・len に依らない) ---- */
{const cs={console,setInterval,clearInterval};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={};',cs);
['meter.js','mixdefs.js','seq.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),cs,{filename:f}));
const Q=cs.SD;
/* 発音の予約時刻(sched された on の時刻)を集める */
const times=(mode,len,meter,n)=>{const out=[],q=[],io={now:()=>0,on(){},off(){},sched:(fn,t)=>{q.push({fn,t});return q.length},unsched(){}};
 const p=new Q.Play(io);p.setMeter(meter,false);p.setMode(mode);clearInterval(p.tm);p.tm=null;p.setBpm(120);p.setSwing(.5);
 const c=p.cs();c.len=len;c.steps.forEach(x=>{x.on=true;x.n=48;x.tie=false});if(mode==='trk')p.tr.forEach((x,k)=>{x.len=len;if(k)x.steps.forEach(y=>y.on=false)});
 p.start();for(let k=0;k<n;k++)mode==='seq'?p.seqStep():p.trkStep();
 const rec=[];p.io.on=(m,v,fr,tr)=>rec.push(p._t);q.slice().sort((a,b)=>a.t-b.t).forEach(e=>{p._t=e.t;e.fn()});p.stop();return rec.map(t=>Math.round((t-rec[0])*1000)/1000)};
const base=0.125,sw=.5*base;
/* 4/4・len16: 従来どおり(奇数ステップが 0.5×1/16 遅れる) */
let a=times('seq',16,{n:4,d:4,g:null},32);
if(a.length!==32)bad('4/4 SEQ: 32音');
const exp=(i)=>Math.round((i*base+(i&1?sw:0)-0)*1000)/1000;
if(a.some((t,i)=>Math.abs(t-(exp(i)-exp(0)))>1e-3))bad('4/4 SEQ: スウィングは従来と同じ');
/* 奇数長(15)でも周回してグリッドの奇数ステップだけが遅れる */
a=times('seq',15,{n:15,d:16,g:null},45);if(a.length!==45||a.some((t,i)=>Math.abs(t-(exp(i)-exp(0)))>1e-3))bad('15/16 SEQ: 周回してもグリッドの奇数が遅れる');
a=times('trk',15,{n:15,d:16,g:null},45);if(a.length!==45||a.some((t,i)=>Math.abs(t-(exp(i)-exp(0)))>1e-3))bad('15/16 TRK');
a=times('seq',12,{n:3,d:4,g:null},36);if(a.some((t,i)=>Math.abs(t-(exp(i)-exp(0)))>1e-3))bad('3/4 SEQ');
a=times('seq',14,{n:7,d:8,g:[2,2,3]},42);if(a.some((t,i)=>Math.abs(t-(exp(i)-exp(0)))>1e-3))bad('7/8 SEQ');
/* ARP: スウィングは k の奇数(拍子に依らない) */
{const q=[],io={now:()=>0,on(){},off(){},sched:(fn,t)=>{q.push({fn,t});return q.length},unsched(){}};const p=new Q.Play(io);p.setMeter({n:7,d:8,g:null},false);p.setMode('arp');clearInterval(p.tm);p.tm=null;p.setSwing(.5);p.a.rate=3;p.notes=[60];p.a.nt=0;p.a.i=0;p.a.k=0;
 for(let k=0;k<8;k++)p.arpStep();const ts=q.filter((e,i)=>i%2===0).map(e=>e.t);
 if(ts.some((t,i)=>Math.abs(t-(i*base+(i&1?sw:0)))>1e-6))bad('ARP: 拍子に依らずスウィングは奇数番目')}
}
/* ---- MT-3a: play.meter ↔ au.meter(A.len・tickText・シーンレーン・エンジン) ---- */
{const cs={console,setInterval,clearInterval};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={};',cs);
['meter.js','auto.js','mixdefs.js','seq.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),cs,{filename:f}));
const Q=cs.SD,A=Q.Auto,io={now:()=>0,on(){},off(){},sched:()=>1,unsched(){}};
const p=new Q.Play(io);
if(p.au.meter!==undefined||A.len(p.au)!==1536)bad('既定 au は4/4(meter なし・4小節=1536)');
const J=JSON.stringify;
p.setMeter({n:3,d:4,g:null},false);
if(J(p.au.meter)!==J({n:3,d:4,g:null})||A.len(p.au)!==4*288||A.bar(p.au)!==288)bad('setMeter が au に届く(3/4: 1小節=288・4小節=1152)');
p.au=A.mk(8);if(!p.au.meter||A.len(p.au)!==8*288)bad('au を差し替えても拍子が付く(undo・レッスン復元など)');
p.au=A.clean({bars:2,lanes:[]});if(A.len(p.au)!==2*288)bad('au を clean で作り直しても拍子が付く');
const L=A.addLane(p.au,0,'cutoff',null);L.pts.push([0,.2,'L'],[288,.8,'L']);p.setMeter({n:7,d:8,g:[2,2,3]},false);
if(A.len(p.au)!==2*336||J(L.pts)!==J([[0,.2,'L'],[288,.8,'L']]))bad('拍子を変えても点は tick のまま');
if(A.tickText(336,p.au.meter)!=='1小節'||A.tickText(288,p.au.meter)!=='3拍'||A.tickText(672,p.au.meter)!=='2小節')bad('tickText(7/8)');
/* 保存の往復 */
const q=new Q.Play(io);q.setState(JSON.parse(J(p.getState())));
if(J(q.au.meter)!==J({n:7,d:8,g:[2,2,3]})||A.len(q.au)!==2*336||J(q.meter)!==J(p.meter))bad('保存の往復で au の長さが保たれる');
/* 4/4 に戻す=au に meter を持たない(旧データと同一) */
p.setMeter({n:4,d:4,g:null},false);if(p.au.meter!==undefined||A.len(p.au)!==2*384||p.getState().meter!==undefined||p.getState().au.meter!==undefined)bad('4/4 に戻すと meter が消える');
/* 旧データ(meter なし)=4/4 */
const o=new Q.Play(io);o.setState({au:{bars:4,lanes:[]}});if(o.au.meter!==undefined||A.len(o.au)!==1536)bad('旧データ=4/4');
/* 不正な拍子は拒否・au は変わらない */
q.setMeter({n:3,d:5,g:null},false);if(J(q.au.meter)!==J({n:7,d:8,g:[2,2,3]}))bad('不正な拍子で au が変わらない');
/* シーンレーン: エンジンが A.bar(au) を渡す(3/4 の bar グライドは288tickで完了) */
{const e=new Q.Play(io);e.setMeter({n:3,d:4,g:null},false);e.au=A.clean({bars:4,lanes:[],scn:[{at:0,s:0,g:'0'},{at:288,s:1,g:'bar'}]});
 const seen=[],orig=A.sceneState;A.sceneState=function(){seen.push(arguments[4]);return orig.apply(this,arguments)};
 const T={t:0},eng=new A.Engine({au:()=>e.au,now:()=>T.t,bpm:()=>120,def:()=>null,timer:{set:()=>1,clear(){}},sc:()=>[{tr:[{mute:false,mix:{}}]},{tr:[{mute:true,mix:{}}]}],sceneSet(){},sceneMute(){}});
 eng.start(0);T.t=.5;eng.update();A.sceneState=orig;
 if(!seen.length||seen[0]!==288)bad('エンジンがシーンへ barTicks を渡す(3/4=288): '+seen[0]);
 const h=A.sceneAt(e.au.scn,288+144,A.bar(e.au));if(Math.abs(h.u-.5)>1e-9)bad('3/4 のシーン bar グライドは288tick');
 const e4=new Q.Play(io);e4.au=A.clean({bars:4,lanes:[],scn:[{at:0,s:0,g:'0'},{at:384,s:1,g:'bar'}]});seen.length=0;A.sceneState=function(){seen.push(arguments[4]);return orig.apply(this,arguments)};
 const eng4=new A.Engine({au:()=>e4.au,now:()=>T.t,bpm:()=>120,def:()=>null,timer:{set:()=>1,clear(){}},sc:()=>[{tr:[{mute:false,mix:{}}]},{tr:[{mute:true,mix:{}}]}],sceneSet(){},sceneMute(){}});
 T.t=0;eng4.start(0);T.t=.5;eng4.update();A.sceneState=orig;if(seen[0]!==384)bad('4/4 は384のまま: '+seen[0])}
}
/* ---- MT-3b: 画面側(app.js)の拍子依存を純関数に寄せた分の検査+app.js に4/4固定の数が残らない ---- */
{const cs={console};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={};',cs);
['meter.js','auto.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),cs,{filename:f}));
const A=cs.SD.Auto,au=(bars,m)=>A.clean({bars,lanes:[],meter:m});
if(A.gridTick(au(4),384)!==384||A.gridTick(au(4,mk(3,4)),384)!==288||A.gridTick(au(4,mk(7,8)),384)!==336||A.gridTick(au(4,mk(3,4)),96)!==96||A.gridTick(au(4,mk(3,4)),0)!==0)bad('gridTick: 『1小節』だけ拍子に従う');
if(A.barMove(au(4),0,1)!==384||A.barMove(au(4,mk(3,4)),0,1)!==288||A.barMove(au(4,mk(3,4)),288,-5)!==0||A.barMove(au(4,mk(3,4)),0,99)!==3*288||A.barMove(au(8,mk(6,8)),288,2)!==864)bad('barMove: 小節単位の移動と端の丸め');
if(A.nextAt(au(4,mk(3,4)),null)!==0||A.nextAt(au(4,mk(3,4)),{at:0})!==288||A.nextAt(au(16,mk(5,4)),{at:480})!==480+480*4||A.nextAt(au(4,mk(3,4)),{at:864})!==864||A.nextAt(au(4),{at:384})!==768)bad('nextAt: 次に置く位置');
const src=fs.readFileSync(path.join(w,'app.js'),'utf8');
if(/A\.TPBAR|Auto\.TPBAR/.test(src))bad('app.js に TPBAR が残っている');
const m384=(src.match(/\b384\b/g)||[]).length;if(m384!==0)bad('app.js の 384 は残さない: '+m384+'件');
}
/* ---- MT-3c: 目標判定(at/mono/rng/cyc/stp/hold)の tick 換算。判定は tick のまま・N小節=N×barTicks ---- */
{const cs={console};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={};',cs);
['params.js','mixdefs.js','fxparams.js','meter.js','auto.js'].forEach(f=>{try{vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),cs,{filename:f})}catch(e){if(f==='meter.js'||f==='auto.js')throw e}});
const A=cs.SD.Auto,df=(t,id)=>A.defOf('analog',id);
if(A.barOf()!==384||A.barOf(mk(3,4))!==288||A.barOf(mk(7,8))!==336||A.barOf({n:3,d:5})!==384||A.barOf(null)!==384)bad('barOf');
[[4,4],[3,4],[6,8],[7,8],[5,4],[9,8],[12,8],[15,16]].forEach(([n,d])=>{const m=mk(n,d),bt=A.barOf(m),B=k=>k*bt,nm=n+'/'+d,bars=4,len=bars*bt;
 const au=pts=>A.mkFromSpecs([{id:'cutoff',pts}],bars,df,m);
 const chk=(l,g)=>A.checkAu(l,[Object.assign({id:'cutoff'},g)],df)[0];
 /* at・mono: N小節めの位置 */
 const up=au([[0,400],[B(4),8000]]);
 if(!chk(up,{at:[[0,400,.1],[B(4),8000,.1]],mono:[[0,B(4),'up']]}).ok)bad(nm+' at/mono 右上がり');
 if(chk(up,{mono:[[0,B(4),'down']]}).ok)bad(nm+' mono 逆向きが通る');
 /* 4/4の384×4 の位置は、4/4以外では『4小節の終わり』ではない */
 if(bt!==384){const l=au([[0,400],[B(2),8000],[len,8000]]);if(chk(l,{at:[[B(2),8000,.1]]}).ok!==true)bad(nm+' at N小節');if(chk(l,{at:[[384*2,8000,.01]]}).ok&&384*2!==B(2)&&Math.abs(A.eval(l.lanes[0],768)/A.hi(df(0,'cutoff'))-A.eval(l.lanes[0],B(2))/A.hi(df(0,'cutoff')))>.02)bad(nm+' 4/4のtickで読んでいる')}
 /* rng・hold: 小節区間 */
 const hl=au([[0,1000],[B(2),1000],[B(2),6000],[len,6000]]);
 if(!chk(hl,{hold:[[0,B(2)-1]],rng:[[B(2),len,5000,7000]]}).ok)bad(nm+' hold/rng');
 if(chk(hl,{hold:[[0,B(3)]]}).ok)bad(nm+' hold が段差をまたいで通る');
 /* cyc: 1小節ごとに1周期(4周期) */
 const pts=[];for(let k=0;k<4;k++)pts.push([B(k),300,'L'],[B(k)+bt/2,6000,'L']);pts.push([len,300]);
 const cy=au(pts);if(!chk(cy,{cyc:[[0,len,4,.3]]}).ok)bad(nm+' cyc 4周期');if(chk(cy,{cyc:[[0,len,6,.3]]}).ok)bad(nm+' cyc 6周期が通る');
 /* stp: 1小節ごとの階段(4段) */
 const st=[[0,300,'S'],[B(1),1000,'S'],[B(2),3000,'S'],[B(3),8000,'S'],[len,8000,'S']];
 const sl=au(st);if(!chk(sl,{stp:[[0,len,4]]}).ok)bad(nm+' stp 4段');if(chk(sl,{stp:[[0,len,6]]}).ok)bad(nm+' stp 6段が通る');
 /* goalBars: tick→小節 */
 const gb=A.goalBars([{id:'cutoff',at:[[0,400],[B(2),8000]],mono:[[B(1),B(3),'up']],hold:[[B(2),B(4)]]}],m);
 if(JSON.stringify(gb)!=='[0,1,2,3,4]')bad(nm+' goalBars '+JSON.stringify(gb));
 /* チップ文言: 小節・拍の表示が拍子の barTicks で */
 const p=df(0,'cutoff'),ch=A.goalChips({id:'cutoff',mono:[[0,B(2),'up']],hold:[[B(1),B(2)]]},p,m);
 if(ch[0].indexOf('先頭→2小節')<0||ch[1].indexOf('1小節〜2小節')<0)bad(nm+' チップ '+ch.join('|'));
});
/* 4/4: 従来の判定と文言が同じ(meter 省略・4/4 明示・旧呼び出し) */
{const p=df(0,'cutoff'),g={id:'cutoff',mono:[[0,1536,'up']],rng:[[384,768,500,900]],cyc:[[0,1536,2,.3]]};
 const a=A.goalChips(g,p),b=A.goalChips(g,p,mk(4,4)),c=A.goalChips(g,p,undefined);
 if(JSON.stringify(a)!==JSON.stringify(b)||JSON.stringify(a)!==JSON.stringify(c))bad('4/4 チップが変わった');
 if(a[0].indexOf('4小節')<0)bad('4/4 チップ文言: '+a[0]);
 const l=A.mkFromSpecs([{id:'cutoff',pts:[[0,400],[1536,8000]]}],4,df);const l2=A.mkFromSpecs([{id:'cutoff',pts:[[0,400],[1536,8000]]}],4,df,mk(4,4));
 if(JSON.stringify(A.checkAu(l,[g],df).map(r=>r.items.map(i=>i.ok)))!==JSON.stringify(A.checkAu(l2,[g],df).map(r=>r.items.map(i=>i.ok))))bad('4/4 判定が変わった');}
/* 3/4 で 4/4 の tick(384)で書くと『1小節+1拍』=『4拍』と表示される(小節として扱わない) */
{const p=df(0,'cutoff'),ch=A.goalChips({id:'cutoff',hold:[[0,384]]},p,mk(3,4));if(ch[0].indexOf('4拍')<0)bad('3/4 の384は4拍: '+ch[0])}
/* app.js の goalChips 呼び出しは au の拍子を渡す */
{const src=fs.readFileSync(path.join(w,'app.js'),'utf8');if(!/goalChips\(g,p,play\.au&&play\.au\.meter\)/.test(src))bad('app.js goalChips に拍子を渡していない')}
}
/* ---- MT-4: テンポ同期(DIV)の表示。DIV は拍の分数=拍子に依らない・『1小節に何回か』だけ拍子で変わる ---- */
{const cs={console};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={};',cs);
['params.js','mixdefs.js','fxparams.js','meter.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),cs,{filename:f}));
const SD=cs.SD,Mx=SD.METER,near=(a,b)=>Math.abs(a-b)<1e-9;
/* mixdefs.js の DIV と同じ並び・同じ名前 */
if(JSON.stringify(Mx.DIVBEATS)!==JSON.stringify(SD.DIVS))bad('MT-4 DIVBEATS が SD.DIVS と違う');
['afDiv','trDiv','dlyDiv'].forEach(id=>{const p=SD.FXP.find(q=>q.id===id);if(!p||JSON.stringify(p.opts.map(o=>o[1]))!==JSON.stringify(Mx.DIVLAB)||p.opts.some((o,k)=>o[0]!==k))bad('MT-4 '+id+' の選択肢が DIVLAB と違う')});
/* 長さ(拍・秒)は拍子に依らない */
[[4,4],[3,4],[6,8],[7,8],[5,4],[15,16]].forEach(([n,d])=>{const m=mk(n,d),bt=Mx.barTicks(m)/96;
 Mx.DIVBEATS.forEach((b,i)=>{const o=Mx.syncInfo(i,120,m);if(!near(o.beats,b)||!near(o.sec,.5*b)||!near(o.hz,1/(.5*b))||!near(o.perBar,bt/b))bad('MT-4 syncInfo '+n+'/'+d+' div'+i)})});
/* 具体値 */
{const o=Mx.syncInfo(5,120,mk(3,4));if(!near(o.sec,.25)||!near(o.perBar,3*2))bad('MT-4 3/4 の1/8');
 const t=Mx.syncText(5,120,mk(3,4));if(t!=='1/8 = 0.5拍 = 250ms ・ 1小節(3/4)に6回')bad('MT-4 syncText 3/4: '+t);
 const t2=Mx.syncText(3,100);if(t2!=='1/4 = 1拍 = 600ms ・ 1小節(4/4)に4回')bad('MT-4 syncText 4/4 既定: '+t2);
 const t3=Mx.syncText(0,120,mk(7,8));if(t3!=='1/1 = 4拍 = 2000ms ・ 1.14小節(7/8)ぶん')bad('MT-4 1/1 は7/8の1小節より長い: '+t3);
 const t4=Mx.syncText(6,120,mk(6,8));if(t4!=='1/8T = 0.33拍 = 167ms ・ 1小節(6/8)に9回')bad('MT-4 三連 6/8: '+t4);
 if(Mx.syncInfo(9,120)!==null||Mx.syncInfo(-1,120)!==null||Mx.syncText(99,120)!=='')bad('MT-4 範囲外');
 const z=Mx.syncInfo(3,0,{n:3,d:5,g:null});if(!near(z.sec,.5)||!near(z.perBar,4))bad('MT-4 不正値は 120BPM・4/4')}
const src=fs.readFileSync(path.join(w,'app.js'),'utf8');if(!/SD\.METER\.syncText\(/.test(src))bad('MT-4 app.js が syncText を呼んでいない');
}
/* ---- MT-5a: SD.PATS の拍子対応(4/4=従来と同一・決定的・強拍基準) ---- */
{const cs={console};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={};',cs);
vm.runInContext(fs.readFileSync(path.join(w,'meter.js'),'utf8'),cs,{filename:'meter.js'});
const src=fs.readFileSync(path.join(w,'course.js'),'utf8'),a=src.indexOf('SD.PATS=(function(){'),b=src.indexOf('})();',a)+5;
vm.runInContext(src.slice(a,b),cs,{filename:'course.js(PATS)'});
const P=cs.SD.PATS,M=cs.SD.METER,J=JSON.stringify,k=o=>Object.keys(o.idx).map(Number).sort((x,y)=>x-y).join();
/* 4/4: 従来の値と同じ(省略・4/4明示・g=[1,1,1,1])。o.len は付かない */
const L44={fourFloor:[[],'{"idx":{"0":0,"4":0,"8":0,"12":0},"o":{}}'],offbeatHat:[[],'{"idx":{"2":0,"6":0,"10":0,"14":0},"o":{}}'],
 'halfTime,kick':[['kick'],'{"idx":{"0":0,"10":0},"o":{}}'],'halfTime,snare':[['snare'],'{"idx":{"8":0},"o":{}}'],
 'dnbBreak,kick':[['kick'],'{"idx":{"0":0,"10":0},"o":{}}'],'dnbBreak,snare':[['snare'],'{"idx":{"4":0,"12":0},"o":{}}'],
 'dnbBreak,hat':[['hat'],'{"idx":{"0":0,"2":0,"4":0,"6":0,"8":0,"10":0,"12":0,"14":0},"o":{"acc":[4,12]}}'],
 'trapHat,0':[[false],'{"idx":{"0":0,"2":0,"4":0,"6":0,"8":0,"10":0,"12":0,"14":0},"o":{"acc":[0,8]}}'],
 'trapHat,1':[[true],'{"idx":{"0":0,"2":0,"4":0,"6":0,"8":0,"10":0,"12":0,"13":0,"14":0,"15":0},"o":{"acc":[0,8]}}'],
 'shuffle':[[.4],'{"idx":{"0":0,"2":0,"4":0,"6":0,"8":0,"10":0,"12":0,"14":0},"o":{},"swing":0.4}'],
 'bass,root':[['root',3],'{"idx":{"0":3,"4":3,"8":3,"12":3},"o":{}}'],'bass,syncop':[['syncop',0],'{"idx":{"0":0,"3":0,"6":0,"10":0,"12":0},"o":{}}'],
 'bass,octave':[['octave',2],'{"idx":{"0":2,"2":14,"4":2,"6":14,"8":2,"10":14,"12":2,"14":14},"o":{}}']};
const call=(key,args,m)=>{const f=key.split(',')[0];if(f==='bass')return P.bassPattern(args[0],args[1],m);if(f==='trapHat')return P.trapHat(args[0],m);if(f==='shuffle')return P.shuffle(args[0],m);
 return P[f].apply(null,f==='fourFloor'||f==='offbeatHat'?[m]:[args[0],m])};
Object.keys(L44).forEach(key=>[undefined,null,mk(4,4),mk(4,4,[1,1,1,1])].forEach(m=>{const r=call(key,L44[key][0],m);if(J(r)!==L44[key][1])bad('MT-5a 4/4 が従来と違う '+key+' '+J(r))}));
/* 3/4・6/8・7/8[2,2,3] の期待値(強拍基準) */
const t=(nm,r,idx,len)=>{if(k(r)!==idx||r.o.len!==len)bad('MT-5a '+nm+' '+k(r)+' len'+r.o.len+' 期待 '+idx+' '+len)};
const m34=mk(3,4),m68=mk(6,8),m78=mk(7,8,[2,2,3]);
t('3/4 fourFloor',P.fourFloor(m34),'0,4,8',12);t('3/4 offbeatHat',P.offbeatHat(m34),'2,6,10',12);
t('3/4 halfTime snare',P.halfTime('snare',m34),'4',12);t('3/4 halfTime kick',P.halfTime('kick',m34),'0,6',12);
t('3/4 dnb kick',P.dnbBreak('kick',m34),'0,6',12);t('3/4 dnb snare',P.dnbBreak('snare',m34),'4',12);t('3/4 dnb hat',P.dnbBreak('hat',m34),'0,2,4,6,8,10',12);
t('3/4 trap',P.trapHat(false,m34),'0,2,4,6,8,10',12);t('3/4 trap roll',P.trapHat(true,m34),'0,2,4,6,8,9,10,11',12);
if(J(P.trapHat(false,m34).o.acc)!=='[0,4]'||J(P.dnbBreak('hat',m34).o.acc)!=='[4]')bad('MT-5a 3/4 acc');
t('3/4 bass syncop',P.bassPattern('syncop',0,m34),'0,3,4,7,8,11',12);
{const o=P.bassPattern('octave',2,m34).idx;if(J(o)!=='{"0":2,"2":14,"4":2,"6":14,"8":2,"10":14}')bad('MT-5a 3/4 octave '+J(o))}
t('6/8 fourFloor',P.fourFloor(m68),'0,6',12);t('6/8 offbeatHat',P.offbeatHat(m68),'3,9',12);t('6/8 halfTime',P.halfTime('snare',m68),'6',12);t('6/8 halfTime kick',P.halfTime('kick',m68),'0,8',12);
t('7/8 fourFloor',P.fourFloor(m78),'0,4,8',14);t('7/8 offbeatHat',P.offbeatHat(m78),'2,6,11',14);
if(P.shuffle(.3,m34).swing!==.3||P.shuffle(9,m34).swing!==.6)bad('MT-5a shuffle swing');
/* 全拍子の不変条件: ステップは 0〜spb-1・len=spb(4/4以外)・acc は埋まったステップ・決定的・空でない */
let nm=0;for(let n=1;n<=32;n++)[4,8,16].forEach(d=>{const m=mk(n,d);if(!M.valid(m))return;[null,[1,1].length&&null].length;const spb=M.stepsPerBar(m);nm++;
 const cs2=[['fourFloor',[m]],['offbeatHat',[m]],['halfTime',['kick',m]],['halfTime',['snare',m]],['dnbBreak',['kick',m]],['dnbBreak',['snare',m]],['dnbBreak',['hat',m]],['trapHat',[false,m]],['trapHat',[true,m]],['shuffle',[.3,m]],
  ['bassPattern',['root',0,m]],['bassPattern',['eighth',0,m]],['bassPattern',['offbeat',0,m]],['bassPattern',['syncop',0,m]],['bassPattern',['octave',0,m]]];
 cs2.forEach(([f,a])=>{const x=P[f].apply(null,a),y=P[f].apply(null,a),id=n+'/'+d+' '+f+' '+a.slice(0,-1).join();
  if(J(x)!==J(y))bad('MT-5a 決定的でない '+id);const ks=Object.keys(x.idx).map(Number);
  if(f==='offbeatHat'&&spb===1||f==='bassPattern'&&a[0]==='offbeat'&&spb===1){}else if(!ks.length)bad('MT-5a 空 '+id);
  ks.forEach(q=>{if(!(q>=0&&q<spb&&Number.isInteger(q)))bad('MT-5a 範囲外ステップ '+id+' '+q)});
  if(!(n===4&&d===4&&M.accents(m).join()==='0,4,8,12')&&x.o.len!==spb)bad('MT-5a len '+id);
  (x.o.acc||[]).forEach(q=>{if(x.idx[q]===undefined)bad('MT-5a acc が空のステップ '+id+' '+q)})})});
if(nm<50)bad('MT-5a 拍子の数 '+nm);
/* course.js 単体(meter.js なし)でも従来どおり */
{const c2={console};c2.window=c2;vm.createContext(c2);vm.runInContext('var SD={};',c2);vm.runInContext(src.slice(a,b),c2);if(J(c2.SD.PATS.fourFloor(mk(3,4)))!=='{"idx":{"0":0,"4":0,"8":0,"12":0},"o":{}}')bad('MT-5a meter.js 無しは4/4')}
}
/* ---- MT-5b: mt01〜mt04(拍子つきレッスン)。トラックの位置・クイズの答え・app.js の拍子の出し入れ ---- */
{const cs={console};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={TERMS:[],CATS:[],LESSONS:[]};',cs);
vm.runInContext(fs.readFileSync(path.join(w,'meter.js'),'utf8'),cs,{filename:'meter.js'});
const cr=fs.readFileSync(path.join(w,'course.js'),'utf8'),a=cr.indexOf('SD.PATS=(function(){'),b=cr.indexOf('})();',a)+5;
vm.runInContext(cr.slice(a,b),cs);vm.runInContext('SD.FXP=[{id:"djFilter"},{id:"rvbMix"}];SD.defs={analog:{byId:{}}};SD.fmt=function(p,v){return v+"%"};',cs);vm.runInContext(fs.readFileSync(path.join(w,'mt.js'),'utf8'),cs,{filename:'mt.js'});
const SD=cs.SD,M=SD.METER,L={};SD.LESSONS.forEach(l=>L[l.id]=l);
if(['mt01','mt02','mt03','mt04'].some(id=>!L[id]))bad('MT-5b レッスンが足りない');
if(!SD.CATS.some(c=>c.id==='mt1'&&c.course==='MT'&&c.chapter==='course'))bad('MT-5b cat');
const ks=t=>Object.keys(t.idx).map(Number).sort((x,y)=>x-y).join();
/* 拍子とトラックの len・位置 */
const exp={mt01:{m:'3/4',len:12,k:['0,4,8']},mt02:{m:'6/8',len:12,k:['0,4,8','0,6']},mt03:{m:'5/4',len:20,k:['0,12','0,8']},mt04:{m:'7/8',len:14,k:['0,4,8','0,6,10','0,4,10']}};
Object.keys(exp).forEach(id=>{const l=L[id],e=exp[id];if(M.label(l.meter)!==e.m||!M.valid(l.meter))bad(id+' 拍子 '+M.label(l.meter));
 if(l.tk.some(t=>t.o.len!==e.len))bad(id+' len が '+e.len+' でない');if(M.stepsPerBar(l.meter)!==e.len)bad(id+' 1小節のステップ数');
 const kk=l.tk.filter(t=>t.id==='kick').map(ks);if(JSON.stringify(kk)!==JSON.stringify(e.k))bad(id+' キックの位置 '+kk.join('|')+' 期待 '+e.k.join('|'))});
/* クイズ: 聞き比べの option が鳴らすトラック(mt=ミュート)から答えを導き直す */
const play=(l,c)=>l.tk.filter((t,i)=>c.mt.indexOf(i)<0);
const quizStep=l=>l.steps.find(s=>s.quiz),kicks=(l,c)=>play(l,c).filter(t=>t.id==='kick');
{const l=L.mt01,s=quizStep(l),c=s.cmp[s.quiz.ans-1];const t=play(l,c);if(t.length!==1||ks(t[0])!=='0,4,8')bad('mt01 クイズの答え(キック3回)')
 s.cmp.forEach((x,i)=>{if(i!==s.quiz.ans-1&&play(l,x).length===1&&ks(play(l,x)[0]).split(',').length===3)bad('mt01 クイズの答えが複数')})}
{const l=L.mt02,s=quizStep(l),c=s.cmp[s.quiz.ans-1],k=kicks(l,c);if(k.length!==1||ks(k[0])!=='0,6')bad('mt02 クイズの答え(6/8=2回)');
 s.cmp.forEach((x,i)=>{if(i!==s.quiz.ans-1&&kicks(l,x).some(t=>ks(t)==='0,6'))bad('mt02 クイズの答えが複数')})}
{const l=L.mt03,s=quizStep(l),c=s.cmp[s.quiz.ans-1],k=kicks(l,c);if(k.length!==1||ks(k[0])!=='0,8')bad('mt03 クイズの答え(2+3)');
 s.cmp.forEach((x,i)=>{if(i!==s.quiz.ans-1&&kicks(l,x).some(t=>ks(t)==='0,8'))bad('mt03 クイズの答えが複数')})}
{const l=L.mt04,s=quizStep(l),c=s.cmp[s.quiz.ans-1],k=kicks(l,c);if(k.length!==1||ks(k[0])!=='0,6,10')bad('mt04 クイズの答え(3+2+2)');
 s.cmp.forEach((x,i)=>{if(i!==s.quiz.ans-1&&kicks(l,x).some(t=>ks(t)==='0,6,10'))bad('mt04 クイズの答えが複数')})}
/* 聞き比べの mt は存在するトラック番号のみ・全レッスンに聞き比べとクイズがある */
Object.keys(exp).forEach(id=>{const l=L[id];if(!l.steps.some(s=>s.quiz))bad(id+' クイズ無し');l.steps.forEach(s=>(s.cmp||[]).forEach(c=>(c.mt||[]).forEach(t=>{if(!(t>=0&&t<l.tk.length))bad(id+' cmp.mt 範囲外 '+t)})))});
/* app.js: レッスン開始で拍子を切り替え・退出/他レッスンで戻す・SEQの表示を更新 */
const ap=fs.readFileSync(path.join(w,'app.js'),'utf8');
if(!/play\.setMeter\(LBY\[id\]\.meter\|\|null,false\)/.test(ap))bad('MT-5b app.js: startLesson が拍子を切り替えない');
if(!/m:play\.getMeter\(\)/.test(ap)||!/play\.setMeter\(S\.trkSave\.m,false\)/.test(ap))bad('MT-5b app.js: 拍子を戻さない');
}
/* ---- MT-5c: mt05〜mt09。拍子・len・キック位置・クイズの答え・ポリメーター・app.js が仮レーンに拍子を渡す ---- */
{const cs={console};cs.window=cs;vm.createContext(cs);vm.runInContext('var SD={TERMS:[],CATS:[],LESSONS:[]};',cs);
vm.runInContext(fs.readFileSync(path.join(w,'meter.js'),'utf8'),cs,{filename:'meter.js'});
const cr=fs.readFileSync(path.join(w,'course.js'),'utf8'),a=cr.indexOf('SD.PATS=(function(){'),b=cr.indexOf('})();',a)+5;
vm.runInContext(cr.slice(a,b),cs);vm.runInContext('SD.FXP=[{id:"djFilter",type:"knob",min:-1,max:1,def:0,fmt:"pct"},{id:"rvbMix",type:"knob",min:0,max:1,def:.2,fmt:"pct"}];SD.defs={analog:{byId:{}}};SD.fmt=function(p,v){return v+"%"};',cs);
vm.runInContext(fs.readFileSync(path.join(w,'mt.js'),'utf8'),cs,{filename:'mt.js'});
const SD=cs.SD,M=SD.METER,L={};SD.LESSONS.forEach(l=>L[l.id]=l);
const ids=['mt05','mt06','mt07','mt08','mt09'];if(ids.some(id=>!L[id]))bad('MT-5c レッスンが足りない');
const ks=t=>Object.keys(t.idx).map(Number).sort((x,y)=>x-y).join();
const exp={mt05:{m:'9/8',len:18},mt06:{m:'5/8',len:10},mt07:{m:'3/4',len:12},mt08:{m:'3/4',len:12},mt09:{m:'7/8',len:14}};
ids.forEach(id=>{const l=L[id],e=exp[id];if(!l||!M.valid(l.meter)||M.label(l.meter)!==e.m)bad(id+' 拍子');else if(M.stepsPerBar(l.meter)!==e.len)bad(id+' 1小節のステップ数');
 if(!l.steps.some(s=>s.quiz)&&id!=='mt07')bad(id+' クイズ無し')});
const play=(l,c)=>l.tk.filter((t,i)=>c.mt.indexOf(i)<0),qs=l=>l.steps.find(s=>s.quiz),only=(l,s,f)=>{const n=[];s.cmp.forEach((c,i)=>{if(f(play(l,c)))n.push(i+1)});return n};
{const l=L.mt05,k=l.tk.filter(t=>t.id==='kick').map(ks);if(JSON.stringify(k)!=='["0,6,12","0,4,8,12,16"]')bad('mt05 キックの位置 '+k);
 const s=qs(l),n=only(l,s,t=>t.length===1&&t[0].id==='kick'&&ks(t[0])==='0,6,12');if(n.join()!==String(s.quiz.ans))bad('mt05 クイズの答え '+n)}
{const l=L.mt06,k=l.tk.filter(t=>t.id==='kick').map(ks);if(JSON.stringify(k)!=='["0,6","0,3,5,8"]')bad('mt06 キックの位置 '+k);
 const s=qs(l),n=only(l,s,t=>t.length===1&&t[0].id==='kick'&&ks(t[0])==='0,3,5,8');if(n.join()!==String(s.quiz.ans))bad('mt06 クイズの答え '+n)}
{const l=L.mt08;if(!l.poly)bad('mt08 poly');const ln=l.tk.map(t=>t.o.len===undefined?16:t.o.len);if(JSON.stringify(ln)!=='[16,12,16]')bad('mt08 len '+ln);
 const s=qs(l),n=only(l,s,t=>t.length>0&&t.every(x=>(x.o.len===undefined?16:x.o.len)===12));if(n.join()!==String(s.quiz.ans))bad('mt08 クイズの答え '+n)}
{const l=L.mt09;if(M.label(l.meter)!=='7/8'||l.meter.g.join()!=='2,2,3')bad('mt09 g');
 const s=qs(l),n=only(l,s,t=>t.some(x=>x.id==='snare'));if(n.join()!==String(s.quiz.ans))bad('mt09 クイズの答え '+n)}
ids.filter(id=>id!=='mt08').forEach(id=>{if(L[id].poly)bad(id+' poly は mt08 のみ')});
/* mt07: 3/4 の4小節=288×4。レーンの点は範囲内・拍子は 288 */
{const l=L.mt07,BT=M.barTicks(l.meter);if(BT!==288)bad('mt07 barTicks '+BT);
 l.steps.forEach(s=>[].concat(s.au||[],s.lane||[],s.ref||[],...(s.cmp||[]).map(c=>c.ln||[])).forEach(g=>[].concat(g.pts||[],g.at||[]).forEach(q=>{if(q[0]<0||q[0]>4*BT)bad('mt07 tick範囲外 '+q[0])})))}
const ap=fs.readFileSync(path.join(w,'app.js'),'utf8');
if(!/mkFromSpecs\(v\.ln,v\.bars\|\|play\.au\.bars,autoDef,play\.au\.meter\)/.test(ap)||!/SD\.Auto\.mk\(play\.au\.bars,play\.au\.meter\)/.test(ap)||!/mkFromSpecs\(rf,play\.au\.bars,autoDef,play\.au\.meter\)/.test(ap))bad('MT-5c app.js: 聞き比べ・お手本の仮レーンに拍子を渡していない');
}
if(err){console.error('失敗 '+err+'件');process.exit(1)}console.log('OK meter(13拍子・境界・不正・g・既定=4/4・auto.js定数一致・保存の往復・旧データ=4/4・meter.js無し・MT-2a: steps32/len32/範囲外の保持/旧データ補完・MT-2b: 拍子の保存/fit/メトロノームの強拍・MT-2c: スウィング・MT-3a: play↔au の拍子/シーン・MT-3b: gridTick/barMove/nextAt・MT-5a〜5c)');process.exit(0);/* seq.js の setInterval が残るため明示的に終了 */
