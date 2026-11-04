// 拍同期の基盤(FX-3a)の検査: node test/fxw-beat.js
//  fx-src/beatbuf.js(sd-beatbuf=テスト用出力。L=直前の区間を同じ位置で読んだ音・R=区間の頭のマーカー)+ www/js/beat.js(拍位置のアンカー)+ seq.js・bus.js の配線
//  ①区間の頭が拍に揃う(LEN 6種・パルス列・開始が拍の途中) ②BPM変更(遅れて届いても) ③停止→再生 ④実際の SD.Play(TRK)で テンポを動かし続け・パターンが何周しても・停止→再開・スウィング ありでも、鳴るステップの拍の格子と一致
//  ⑤SD.Beat の規則(送りすぎない・停止中のテンポ・つなぐ/外す) ⑥極端値・不正なメッセージ・NaN ⑦配線(bus.setBpm・beatLink)と登録
const fs=require('fs'),path=require('path'),vm=require('vm');
const H=require('./fxw5.js'),{extreme,procs}=H,SR=48000,ROOT=path.join(__dirname,'..');
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
if(H.errors&&H.errors()>0){console.error('NG: fxw5 の検査が通っていない');process.exit(1)}
const A=(t,b,bpm,run,n)=>({t,b,bpm,run:run==null?1:run,n:n==null?1:n});
/* ワークレットを 128 サンプルずつ回す。msgs=[{at:サンプル,beat:アンカー}](at 以降の最初のブロックの頭で届く)。戻り値 [L,R] */
function drive(x,o){o=o||{};const C=procs['sd-beatbuf'],p=new C({}),params={enabled:[o.en==null?1:o.en],len:[o.len==null?3:o.len]};
 const n=x.length,L=new Float32Array(n),R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128),ms=(o.msgs||[]).slice().sort((a,b)=>a.at-b.at);let mi=0;
 for(let s=0;s+128<=n;s+=128){global.currentTime=s/SR;global.currentFrame=s;
  while(mi<ms.length&&ms[mi].at<=s){p.port.onmessage({data:ms[mi].raw!==undefined?ms[mi].raw:{beat:ms[mi].beat}});mi++}
  const xs=x.subarray(s,s+128);p.process([[xs,xs]],[[oL,oR]],params);L.set(oL,s);R.set(oR,s)}
 return [L,R]}
const marks=R=>{const a=[];for(let i=0;i<R.length;i++)if(R[i]>.5)a.push(i);return a};
const sil=n=>new Float32Array(n),pulses=(n,l)=>{const x=sil(n);l.forEach(([i,a])=>{x[i]=a});return x};
const same=(got,exp,tol,msg)=>{ok(got.length===exp.length,msg+': 個数 '+got.length+' / 期待 '+exp.length);let m=0;for(let i=0;i<Math.min(got.length,exp.length);i++)m=Math.max(m,Math.abs(got[i]-exp[i]));ok(m<=tol,msg+': 位置のずれ最大 '+m.toFixed(3)+' サンプル(許容 '+tol+')')};
const N=SR*3;

// ---- ①定数テンポ(120): LEN 6種すべてで、区間の頭が拍の格子(LEN×k 拍)のサンプルに揃う ----
{const spb=SR*60/120;[[0,1/8],[1,1/4],[2,1/2],[3,1],[4,2],[5,4]].forEach(([li,len])=>{
  const [L,R]=drive(sil(N),{len:li,msgs:[{at:0,beat:A(0,0,120)}]}),exp=[];for(let k=0;k*len*spb<N;k++)exp.push(Math.round(k*len*spb));
  same(marks(R),exp,0,'LEN='+len+'拍: 区間の頭が格子に揃う')})}
// パルス列: 拍の頭に置いたパルスは、区間の頭(pos 0)に入り、ちょうど LEN 後の区間の頭に出る。位置・大きさとも一致
{const spb=24000,x=pulses(SR*4,[[0,.1],[spb,.2],[2*spb,.3],[3*spb,.4],[4*spb,.5],[spb+6000,.05],[2*spb+12000,.07]]),[L]=drive(x,{len:3,msgs:[{at:0,beat:A(0,0,120)}]});
 [[1,.1],[2,.2],[3,.3],[4,.4],[5,.5]].forEach(([m,a])=>{if(m*spb<L.length)ok(Math.abs(L[m*spb]-a)<1e-6,'パルス列(1拍): 拍'+m+' の頭に前の拍の頭のパルス '+a+'('+L[m*spb]+')')});
 ok(Math.abs(L[2*spb+6000]-.05)<1e-6&&Math.abs(L[3*spb+12000]-.07)<1e-6,'パルス列(1拍): 拍の途中のパルスも1拍後の同じ位置に出る');
 let e=0;const hit=new Set([spb,2*spb,3*spb,4*spb,5*spb,2*spb+6000,3*spb+12000]);for(let i=0;i<L.length;i++)if(!hit.has(i)&&Math.abs(L[i])>1e-9)e++;ok(e===0,'パルス列(1拍): 余計な音が出ない('+e+')')}
{const spb=24000,x=pulses(SR*5,[[12000,.6],[spb*4+3000,.3]]),[L]=drive(x,{len:5,msgs:[{at:0,beat:A(0,0,120)}]});
 ok(Math.abs(L[12000+4*spb]-.6)<1e-6,'パルス列(1小節): 小節の途中のパルスは1小節(4拍)後の同じ位置に出る')}
// 拍の途中から再生を始める(開始時刻が拍・サンプルの格子と無関係): 開始の時刻から LEN ごと
{const t0=.1234,spb=24000,exp=[0,Math.ceil(t0*SR)];for(let k=1;t0*SR+k*spb<N;k++)exp.push(Math.ceil(t0*SR+k*spb));
 const [,R]=drive(sil(N),{len:3,msgs:[{at:0,beat:A(0,0,120,1,0)},{at:0,beat:A(t0,0,120,1,1)}]});same(marks(R),exp,1,'開始が 0.1234秒: 開始の時刻とそこからの拍に揃う')}

// ---- ②BPM変更: 120→150(1.0秒=拍2から)。拍 k≥2 は 1.0+(k-2)·0.4秒。メッセージが遅れて届いても(拍の境目より前なら)同じ ----
{const exp=[0,24000,48000];for(let k=3;48000+(k-2)*19200<N;k++)exp.push(48000+(k-2)*19200);
 [0,SR-1,SR+128*5].forEach(late=>{const [,R]=drive(sil(N),{len:3,msgs:[{at:0,beat:A(0,0,120)},{at:late,beat:A(1,2,150)}]});same(marks(R),exp,1,'BPM 120→150('+(late?'届くのが'+(late-SR)+'サンプル後':'事前に届く')+')')})}
// 速くして遅くする(120→240→60)でも、各拍がアンカーの式に一致
{const [,R]=drive(sil(SR*5),{len:3,msgs:[{at:0,beat:A(0,0,120)},{at:SR,beat:A(1,2,240)},{at:2*SR,beat:A(2,6,60)}]}),exp=[0,24000,48000,60000,72000,84000,96000];for(let k=7;96000+(k-6)*48000<SR*5;k++)exp.push(96000+(k-6)*48000);
 // 拍2〜5=240BPM(12000/拍)、拍6以降=60BPM(48000/拍)
 const e2=[0,24000,48000,60000,72000,84000,96000,144000,192000];same(marks(R),e2.filter(v=>v<SR*5),1,'BPM 120→240→60')}

// ---- ③停止→再生: 停止中も拍は進み続け、再生開始で新しい拍0・区間の頭が開始の時刻に来る(前の区間は捨てる) ----
{const x=pulses(SR*2,[[5000,.9],[9700,.5]]),[L,R]=drive(x,{len:3,msgs:[{at:0,beat:A(0,0,120,1,1)},{at:7200,beat:A(.15,.3,120,0,1)},{at:7300,beat:A(.2,0,120,1,2)}]}),mk=marks(R);
 same(mk.slice(0,3),[0,9600,33600],1,'停止→再生: 再開の時刻(0.2秒)に区間の頭が来る(拍の位相が同じでも)');
 ok(Math.abs(L[33700]-.5)<1e-6,'停止→再生: 再開後の最初の区間の音(0.2秒+100サンプル)が1拍後に出る');
 let g=0;for(let i=9600;i<33600;i++)if(Math.abs(L[i])>1e-9)g++;ok(g===0,'停止→再生: 停止前の音は新しい再生に出ない('+g+')')}
// 無効(enabled=0)は素通し
{const x=pulses(4096,[[300,.9]]),[L,R]=drive(x,{en:0});ok(L[300]===Math.fround(.9)&&marks(R).length===1,'enabled=0: 入力がそのまま出る')}

// ---- ④実際の SD.Play(TRK)+SD.Beat: テンポを動かし続け・停止→再開・スウィング ありでも、鳴るステップの格子と一致 ----
const ctx={console,setInterval,clearInterval};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
['mixdefs.js','beat.js','seq.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,'www','js',f),'utf8'),ctx,{filename:f}));const SD=ctx.SD;
function sim(lag){const f={t:0,cur:0,q:[],msgs:[],steps:[],ev:[],r:0,lag:lag||0},B=new SD.Beat();B.attach(m=>f.msgs.push({at:Math.ceil(f.t*SR)+f.lag,beat:m}));
 const io={now:()=>f.t,on(){},off(){},sched:(fn,t)=>{const e={t,fn};f.q.push(e);return e},unsched:e=>{f.q=f.q.filter(x=>x!==e)},
  tempo:b=>B.setBpm(b,f.t),beat:(t,b,bpm)=>B.at(t,b,bpm),beatStart:(t,bpm)=>{f.r++;f.starts.push(t);B.start(t,bpm)},beatStop:()=>{if(f.on){f.stops.push(f.t)}f.on=false;B.stop(f.t)}};
 f.starts=[];f.stops=[];f.B=B;f.p=new SD.Play(io);const p=f.p;p.cb.tstep=g=>f.steps.push({g,t:f.cur,r:f.r});   /* t=そのステップの予約時刻 te(偽の時計は25msごとに進むので、コールバックを実行するとき f.cur に te を持たせる) */
 p.setMode('trk');clearInterval(p.tm);p.tm=null;
 f.at=(t,fn)=>{f.ev.push([t,fn]);f.ev.sort((a,b)=>a[0]-b[0])};
 f.run=to=>{while(f.t<=to+1e-9){while(f.ev.length&&f.ev[0][0]<=f.t+1e-9)f.ev.shift()[1]();p.tick();
   const due=f.q.filter(e=>e.t<=f.t+1e-9).sort((a,b)=>a.t-b.t);f.q=f.q.filter(e=>due.indexOf(e)<0);due.forEach(e=>{f.cur=e.t;f.t=Math.max(f.t,e.t);e.fn()});f.t=Math.round((f.t+.025)*1e6)/1e6}};
 return f}
function scenario(lag){const f=sim(lag),p=f.p;p.tr[0].len=4;p.tr[0].steps[0].on=true;p.tr[1].len=3;p.tr[1].steps[1].on=true;p.setBpm(120);
 f.at(.1,()=>{p.start();f.on=true});
 for(let k=0;k<=40;k++)f.at(1+k*.1,()=>p.setBpm(120+Math.round(((f.t-1)/4)*60)));   // 1〜5秒: 120→180 を0.1秒ごとに(テンポのオートメーション)
 f.at(5.0,()=>p.stop());
 f.at(5.6,()=>{p.setSwing(.3);p.start();f.on=true});f.at(7.0,()=>p.setBpm(95));f.at(8.2,()=>p.setBpm(210));
 f.run(9.0);return f}
function checkPlay(lag,li,per,name){const f=scenario(lag),n=Math.ceil(SR*9.5/128)*128,[,R]=drive(sil(n),{len:li,msgs:f.msgs});const mk=marks(R);
 const wins=[[f.starts[0],f.stops[0]],[f.starts[1],9.0]];let tot=0,bad=0,miss=0,extra=0;
 wins.forEach(([a,b],r)=>{const st=f.steps.filter(s=>s.r===r+1&&s.g%per===0&&s.t>=a-1e-9&&s.t<b-1e-6);
  st.forEach(s=>{if(r===1&&s.g%2===1)return;/* スウィング中の奇数ステップは音符だけが後ろにずれる(拍の格子は動かない)ので位置は比べない */const x=s.t*SR;let d=1e9;mk.forEach(m=>{d=Math.min(d,Math.abs(m-x))});tot++;if(d>1.01)bad++});
  const inM=mk.filter(m=>m/SR>=a-1e-6&&m/SR<b-1e-6);if(inM.length!==st.length){extra+=Math.abs(inM.length-st.length)}});
 ok(tot>=5&&bad===0&&extra===0,name+': 鳴るステップの拍の格子と一致(検査 '+tot+' 点・ずれ '+bad+'・個数の過不足 '+extra+')');return f}
checkPlay(0,3,4,'TRK 再生(1拍・テンポ変化・パターン長4と3・停止→再開・スウィング)');
checkPlay(1000,3,4,'同・メッセージが約21ms遅れて届く');
checkPlay(0,5,16,'同・1小節(4拍)');
checkPlay(0,1,1,'同・1/4拍(16分音符ごと)');
// 送りすぎない: 一定テンポで4秒再生すると、アンカーは再生開始の1回だけ
{const f=sim(0),p=f.p;p.tr[0].steps[0].on=true;p.setBpm(137);const n0=f.msgs.length;f.at(.1,()=>p.start());f.run(4.1);ok(f.msgs.length-n0===1,'一定テンポ4秒でアンカーを送るのは再生開始の1回だけ('+(f.msgs.length-n0)+')');
 const n1=f.msgs.length;p.setBpm(160);f.run(4.4);ok(f.msgs.length-n1>=1&&f.msgs.length-n1<=3,'再生中のテンポ変更後に少数のアンカー('+(f.msgs.length-n1)+')')}
// SEQ モードも同じ(拍0から・パターンの周回で乱れない)
{const f=sim(0),p=f.p;p.setMode('seq');clearInterval(p.tm);p.tm=null;p.s.len=5;p.s.steps[0].on=true;p.setBpm(100);p.cb.step=null;const st=[];f.at(.1,()=>p.start());
 let calls=[];const o=p.io.beat;p.io.beat=(t,b,bpm)=>{calls.push([t,b,bpm]);return o(t,b,bpm)};f.run(3);
 ok(calls.length>15&&calls.every((c,i)=>Math.abs(c[1]-i/4)<1e-9),'SEQ: 拍位置はパターンが周回しても 0,1/4,2/4… と通し(5ステップのパターンでも)');
 ok(f.msgs.length>=2&&f.msgs[f.msgs.length-1].beat.n===1,'SEQ: 再生開始のアンカーに通し番号')}

// ---- ⑤SD.Beat の規則 ----
{const B=new SD.Beat(),log=[];const off=B.attach(m=>log.push(m));ok(log.length===1&&log[0].bpm===120&&log[0].run===0,'attach: つないだ時点のアンカーをすぐ渡す');
 B.setBpm(90,10);ok(log.length===2&&log[1].bpm===90&&log[1].run===0&&log[1].b===B.pos(10)&&B.pos(10)===log[1].b,'停止中のテンポ変更: 拍位置は途切れず(その時刻の拍から新テンポ)');
 const b10=B.pos(10);ok(Math.abs(B.pos(12)-(b10+3))<1e-9,'停止中も最後のテンポ(90)で進み続ける');
 B.start(20,90);ok(log.length===3&&log[2].n===1&&log[2].run===1&&log[2].b===0&&log[2].t===20,'再生開始: 時刻・拍0・通し番号1');
 ok(B.at(20,0,90)===false&&log.length===3,'at: 外挿と合っていれば送らない');
 ok(B.at(20+60/90,1,90)===false&&B.at(21,2,90)===true&&log.length===4&&log[3].b===2,'at: ずれたら(再同期)送る');
 B.setBpm(200,22);ok(log.length===4,'再生中の setBpm は送らない(トランスポートの at が担う)');
 ok(B.at(22,B.pos(22),200)===true&&log[4].bpm===200,'再生中のテンポ変更は at() が新テンポのアンカーを送る');
 B.stop(25);ok(log[5].run===0&&Math.abs(log[5].b-B.pos(25))<1e-9&&log[5].n===1,'停止: 通し番号は変えず、その時刻から自由に進む');const L5=log.length;B.stop(26);ok(log.length===L5,'停止中の stop は何もしない');
 B.start(30);ok(log[log.length-1].n===2,'再開で通し番号が進む');off();B.start(40);ok(log.length===L5+1,'外した送り先には届かない');
 ok(Math.abs(B.pos(31)-B.pos(30)-B.get().bpm/60)<1e-9,'start の bpm を省くと直前のテンポを使う')}

// ---- ⑥極端値・不正入力 ----
extreme('sd-beatbuf',{enabled:1,len:5},2);extreme('sd-beatbuf',{enabled:1,len:0},2);extreme('sd-beatbuf',{enabled:1,len:3},2);
{const bad=[null,0,'x',{},{beat:1},{t:NaN,b:0,bpm:120},{t:1,b:Infinity,bpm:120},{t:1,b:0,bpm:NaN},{t:'a',b:0,bpm:120},[]],msgs=[{at:0,beat:A(0,0,120)}];bad.forEach((r,i)=>msgs.push({at:128*(i+3),raw:{beat:r}}));msgs.push({at:300,raw:null},{at:300,raw:undefined},{at:300,raw:{foo:1}});
 const exp=[];for(let k=0;k*24000<N;k++)exp.push(k*24000);const [,R]=drive(sil(N),{len:3,msgs});same(marks(R),exp,0,'不正なメッセージ(NaN・無限大・文字・null)は無視されて拍が乱れない')}
{const [,R1]=drive(sil(SR*2),{len:3,msgs:[{at:0,beat:A(0,0,1e9)}]}),[,R2]=drive(sil(SR*4),{len:3,msgs:[{at:0,beat:A(0,0,.001)}]});
 same(marks(R1),[0,9600,19200,28800,38400,48000,57600,67200,76800,86400],0,'BPM が大きすぎる指定は 300 に丸まる(1拍=9600サンプル)');same(marks(R2),[0,72000,144000],0,'BPM が小さすぎる指定は 40 に丸まる(1拍=72000サンプル)')}
{const n=SR*14,x=pulses(n,[[100,.8],[288000+100,.2]]),[L,R]=drive(x,{len:5,msgs:[{at:0,beat:A(0,0,40)}]});
 same(marks(R),[0,288000,576000],0,'40BPM・1小節(4拍=6秒)が区間バッファに収まる');ok(Math.abs(L[288000+100]-.8)<1e-6&&Math.abs(L[576000+100]-.2)<1e-6,'40BPM・1小節: 1小節後に同じ位置で出る(切れない)')}
{const x=sil(SR);x[100]=NaN;x[200]=Infinity;x[300]=-Infinity;x[400]=1e9;x[500]=.5;const [L,R]=drive(x,{len:3,msgs:[{at:0,beat:A(0,0,120)}]});let b=0;for(let i=0;i<L.length;i++)if(!isFinite(L[i])||!isFinite(R[i]))b++;ok(b===0,'入力の NaN・無限大・巨大値は出力に出ない('+b+')')}
{[[99,5],[-3,0],[NaN,3],[2.4,2],[2.6,3]].forEach(([v,idx])=>{const [,R]=drive(sil(SR),{len:v,msgs:[{at:0,beat:A(0,0,120)}]}),len=SD.BEATLEN[idx][0],exp=[];for(let k=0;k*len*24000<SR;k++)exp.push(Math.round(k*len*24000));same(marks(R),exp,0,'LEN の指定 '+v+' は番号 '+idx+'('+SD.BEATLEN[idx][1]+')に丸まる')})}
// 区間の途中でテンポが変わっても落ちない・NaN が出ない(区間は伸び縮みし、足りない読み出しは無音)
{const x=Float32Array.from({length:SR*4},(_,i)=>.5*Math.sin(i*.05)),msgs=[{at:0,beat:A(0,0,60)}];for(let k=1;k<30;k++)msgs.push({at:k*6000,beat:A(k*6000/SR,k*6000/SR,40+((k*37)%200))});const [L,R]=drive(x,{len:5,msgs});let b=0,mx=0;for(let i=0;i<L.length;i++){if(!isFinite(L[i]))b++;else mx=Math.max(mx,Math.abs(L[i]))}ok(b===0&&mx<=.5001,'区間の途中のテンポ変更の連打でも壊れない(NaN '+b+'・最大 '+mx.toFixed(3)+')')}
// LEN を途中で変えても、新しい格子の頭から始まる
{const msgs=[{at:0,beat:A(0,0,120)}],C=procs['sd-beatbuf'],p=new C({}),params={enabled:[1],len:[3]},n=SR*3,R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128),z=sil(128);
 p.port.onmessage({data:{beat:A(0,0,120)}});for(let s=0;s+128<=n;s+=128){global.currentTime=s/SR;if(s===SR)params.len[0]=1;p.process([[z,z]],[[oL,oR]],params);R.set(oR,s)}
 const mk=marks(R);ok(mk.indexOf(24000)>=0&&mk.indexOf(48000)>=0&&mk.some(m=>m>=48000+128&&m<=48000+128+2*6000+3),'LEN を途中で変えると、その場で新しい LEN の区間が始まり以降は格子に揃う(1/4拍=6000サンプル)')}

// ---- ⑦配線と登録 ----
{ok(JSON.stringify(SD.BEATLEN.map(r=>r[0]))===JSON.stringify(globalThis.SDBeat.LENS),'LEN の分割値(メイン側 SD.BEATLEN とワークレット側 LENS)が一致');
 ok(SD.BEATLEN.map(r=>r[1]).join()==='1/8拍,1/4拍,1/2拍,1拍,2拍,1小節','LEN の表示名');
 ok(/js\/beat\.js/.test(fs.readFileSync(path.join(ROOT,'www','index.html'),'utf8'))&&/js\/beat\.js/.test(fs.readFileSync(path.join(ROOT,'www','sw.js'),'utf8')),'index.html・sw.js に beat.js が載っている');
 const ih=fs.readFileSync(path.join(ROOT,'www','index.html'),'utf8');ok(ih.indexOf('js/beat.js')<ih.indexOf('js/bus.js')&&ih.indexOf('js/beat.js')<ih.indexOf('js/seq.js'),'beat.js は bus.js・seq.js より前に読み込まれる');
 const w=fs.readFileSync(path.join(ROOT,'www','js','fxworklets.js'),'utf8');ok(/"beatbuf"/.test(w)&&/sd-beatbuf/.test(w),'fxworklets.js に beatbuf が埋め込まれている');
 // bus の配線(fxw5 と同じ読み込み)
 const c2={console,setTimeout,clearTimeout,Math,Object,Array,Float32Array};c2.window=c2;vm.createContext(c2);vm.runInContext('var SD={};',c2);
 ['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','beat.js','fxparams.js','bus.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,'www','js',f),'utf8'),c2,{filename:f}));
 const S2=c2.SD,B=S2.bus;B.ctx={currentTime:5};B.applyDelay=()=>{};B.up=()=>{};B.setBpm(90);const a=S2.beat.get();ok(a.bpm===90&&a.t===5&&a.run===0,'bus.setBpm が拍のアンカーを更新する(停止中)');
 B.ctx=null;B.setBpm(100);ok(S2.beat.get().bpm===100,'ctx が無くても落ちない');B.ctx={currentTime:6};
 const got=[],node={port:{postMessage:m=>got.push(m)}},off=B.beatLink(node);ok(got.length===1&&got[0].beat&&got[0].beat.bpm===100,'bus.beatLink: つないだ時点のアンカーをワークレットへ送る');
 S2.beat.start(7,100);ok(got.length===2&&got[1].beat.n===1&&got[1].beat.t===7,'bus.beatLink: 再生開始も届く');off();S2.beat.start(8,100);ok(got.length===2,'bus.beatLink: 戻り値の関数で外せる')}

console.log(err?'FAIL '+err:'fxw-beat OK');process.exit(err?1:0);
