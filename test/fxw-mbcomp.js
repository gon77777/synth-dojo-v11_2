// MULTIBAND(sd-mbcomp)の検査: node test/fxw-mbcomp.js   FX-1a=分割と再合成(平坦・位相・移動・極端値) / FX-1b=バンド別COMP・GAIN・SOLO/MUTE・OUT・MIX
const H=require('./fxw5.js'),{run,extreme}=H,SR=48000,N=SR;
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
if(H.errors()>0){console.error('NG: fxw5 の検査が通っていない');process.exit(1)}
const sine=(f,a,n)=>Float32Array.from({length:n||N},(_,i)=>(a||.5)*Math.sin(2*Math.PI*f*i/SR));
const amp=(y,f)=>{let re=0,im=0;const a=N/2;for(let i=a;i<N;i++){const w=2*Math.PI*f*i/SR;re+=y[i]*Math.cos(w);im+=y[i]*Math.sin(w)}return 2*Math.hypot(re,im)/(N-a)};
const db=x=>20*Math.log10(x);const MbC=H.procs['sd-mbcomp'];
// ---- 全バンド素通しの再合成が平坦(±0.1dB): 分割周波数の前後を含めて測る ----
for(const [x1,x2] of [[200,2500],[80,800],[500,8000],[1000,1250]]){
 let worst=0,wf=0;
 [30,50,80,120,x1*.5,x1*.9,x1,x1*1.1,x1*2,500,1000,x2*.5,x2*.9,x2,x2*1.1,x2*2,5000,10000,16000].forEach(f=>{if(f>=SR*.45)return;
  const x=sine(f),[y]=run('sd-mbcomp',x,x.slice(),{enabled:1,x1,x2});const d=Math.abs(db(amp(y,f)/.5));if(d>worst){worst=d;wf=f}});
 ok(worst<=.1,'平坦: x1='+x1+' x2='+x2+' の最大偏差 '+worst.toFixed(3)+'dB('+Math.round(wf)+'Hz)')}
// ---- 位相も通過(オールパス): インパルスのエネルギーが保たれる・分割周波数で打ち消し合わない ----
{const x=new Float32Array(N);x[100]=.5;const [y]=run('sd-mbcomp',x,x.slice(),{enabled:1,x1:300,x2:3000});let e=0;for(let i=0;i<N;i++)e+=y[i]*y[i];
 ok(Math.abs(e/.25-1)<.01,'インパルスのエネルギーが保たれる(オールパス) '+(e/.25).toFixed(4))}
// ---- OFF は入力と一致 ----
{const x=H.noise(N,.8),[y]=run('sd-mbcomp',x,x.slice(),{enabled:0,x1:100,x2:5000});let d=0;for(let i=0;i<N;i++)d=Math.max(d,Math.abs(y[i]-x[i]));ok(d===0,'OFFは入力と一致')}
// ---- ステレオ: 左右が独立(片側だけの入力が反対側に漏れない) ----
{const x=sine(1000),z=new Float32Array(N),[L,R]=run('sd-mbcomp',x,z,{enabled:1});let m=0;for(let i=0;i<N;i++)m=Math.max(m,Math.abs(R[i]));ok(m===0&&amp(L,1000)>.49,'左右は独立')}
// ---- 分割周波数の移動(ブロックごとに掃引)で破綻しない・出力の最大が入力の2倍以内 ----
{const x=H.noise(N,.5),sweep=s=>{const t=s/N;return{x1:40*Math.pow(25,.5+.5*Math.sin(t*20)),x2:400*Math.pow(30,.5+.5*Math.sin(t*13))}};
 const [y]=run('sd-mbcomp',x,x.slice(),{enabled:1},sweep);let bad=0,mx=0;for(let i=0;i<N;i++){if(!isFinite(y[i]))bad++;else mx=Math.max(mx,Math.abs(y[i]))}
 ok(bad===0&&mx<1.5,'掃引で破綻しない(最大 '+mx.toFixed(2)+')');
 // 反転: x2 を x1 より下に指定しても(内部で 1.25倍に直る)平坦
 const s2=sine(700),[y2]=run('sd-mbcomp',s2,s2.slice(),{enabled:1,x1:1000,x2:400});ok(Math.abs(db(amp(y2,700)/.5))<=.1,'x2<x1 の指定でも平坦(内部で補正)')}
// ---- 極端値・NaN: 無音・DC・矩形・ノイズ × 端の分割周波数 ----
extreme('sd-mbcomp',{enabled:1,x1:40,x2:400},3);extreme('sd-mbcomp',{enabled:1,x1:1000,x2:12000},3);extreme('sd-mbcomp',{enabled:1,x1:1000,x2:400},3);
// ---- NaN を入れても次のブロックで復帰する ----
{const x=H.noise(N,.5);for(let i=1000;i<1010;i++)x[i]=NaN;const [y]=run('sd-mbcomp',x,x.slice(),{enabled:1});let tail=0;for(let i=N-4000;i<N;i++)if(!isFinite(y[i]))tail++;ok(tail===0,'NaN の後に復帰する')}

// ======== FX-1b: バンド別COMP・GAIN・SOLO/MUTE・OUT・MIX ========
const L=(y,f)=>db(amp(y,f)); // dBFS(振幅)
const go=(f,a,o)=>{const x=sine(f,a),[y]=run('sd-mbcomp',x,x.slice(),Object.assign({enabled:1,x1:400,x2:3000},o));return y};
const gdb=(f,a,o)=>L(go(f,a,o),f)-db(a);   // その周波数のゲイン(dB)
const T=(n,t,r)=>({['t'+n]:t,['r'+n]:r,['a'+n]:5,['l'+n]:100});
// ---- 既定(RATIO=1)は素通し=1aと同じ ----
ok(Math.abs(gdb(60,.5,{}))<=.1&&Math.abs(gdb(1000,.5,{}))<=.1&&Math.abs(gdb(8000,.5,{}))<=.1,'RATIO=1 は圧縮しない(平坦)');
// ---- バンド別: しきい値を超えたバンドだけが下がる ----
{const lo=T(1,-30,8);
 ok(gdb(60,.5,lo)<-8,'低域だけ圧縮: 低域の音が下がる('+gdb(60,.5,lo).toFixed(1)+'dB)');
 ok(Math.abs(gdb(1000,.5,lo))<=.1&&Math.abs(gdb(8000,.5,lo))<=.1,'低域だけ圧縮: 中域・高域は動かない');
 ok(Math.abs(gdb(60,.002,lo))<=.2,'しきい値より小さい音は下がらない');
 const mid=T(2,-30,8),hi=T(3,-30,8);
 ok(gdb(1000,.5,mid)<-8&&Math.abs(gdb(60,.5,mid))<=.1&&Math.abs(gdb(8000,.5,mid))<=.1,'中域だけ圧縮');
 ok(gdb(8000,.5,hi)<-8&&Math.abs(gdb(60,.5,hi))<=.1&&Math.abs(gdb(1000,.5,hi))<=.1,'高域だけ圧縮')}
// ---- 低域が大きく鳴っていても、中域の小さい音は下がらない(単一バンドのCOMPとの違い) ----
{const n=N,a=sine(60,.8),b=sine(1000,.02),x=Float32Array.from({length:n},(_,i)=>a[i]+b[i]),o=Object.assign({enabled:1,x1:400,x2:3000},T(1,-30,10));
 const [y]=run('sd-mbcomp',x,x.slice(),o);ok(Math.abs(L(y,1000)-db(.02))<=.3&&L(y,60)<db(.8)-8,'キックが鳴っても中域は下がらない(ポンピングしない)')}
// ---- 通常COMP(sd-comp VCA・ニー8)と同じ特性: 静的な入出力が一致 ----
{const th=-30,r=4,gr0=-MbC.curve(0,th,r,8),mk=.6*gr0;
 [.5,.2,.08,.04,.03,.02].forEach(a=>{
  const g1=gdb(60,a,Object.assign({x1:400},T(1,th,r)));
  const x=sine(60,a),[y]=run('sd-comp',x,x.slice(),{model:3,thresh:th,ratio:r,attack:5,release:100,active:1,knee:8});
  const g2=L(y,60)-db(a)-mk;   // 自動メイクアップを引く
  ok(Math.abs(g1-g2)<=.35,'通常COMP(VCA)と同等 入力'+Math.round(db(a))+'dB: '+g1.toFixed(2)+' vs '+g2.toFixed(2));
  const ex=MbC.curve(db(a),th,r,8)-db(a);ok(Math.abs(g1-ex)<=.4,'静的特性の式と一致 '+g1.toFixed(2)+' vs '+ex.toFixed(2))})}
// ---- 左右連動(同じゲイン) ----
{const l=sine(60,.5),r=sine(60,.05),[yl,yr]=run('sd-mbcomp',l,r,Object.assign({enabled:1,x1:400,x2:3000},T(1,-30,8)));
 ok(Math.abs((L(yl,60)-db(.5))-(L(yr,60)-db(.05)))<=.3,'左右は連動(同じゲイン)')}
// ---- GAIN ----
ok(Math.abs(gdb(1000,.2,{g2:6})-6)<=.2&&Math.abs(gdb(60,.2,{g2:6}))<=.1,'GAIN: 該当帯域だけ +6dB');
// ---- SOLO / MUTE ----
ok(gdb(60,.3,{s2:1})<-40&&Math.abs(gdb(1000,.3,{s2:1}))<=.5&&gdb(8000,.3,{s2:1})<-30,'SOLO: 選んだ帯域だけ鳴る');
ok(Math.abs(gdb(60,.3,{s1:1,s2:1}))<=.2&&Math.abs(gdb(1000,.3,{s1:1,s2:1}))<=.5&&gdb(8000,.3,{s1:1,s2:1})<-30,'SOLO: 複数ONなら複数鳴る');
ok(gdb(60,.3,{m1:1})<-40&&Math.abs(gdb(1000,.3,{m1:1}))<=.5&&Math.abs(gdb(8000,.3,{m1:1}))<=.2,'MUTE: 該当帯域だけ消える');
ok(gdb(1000,.3,{s2:1,m2:1})<-60,'SOLO と MUTE が同じ帯域なら MUTE が勝つ');
ok(gdb(60,.3,{s2:1,m1:1})<-40,'SOLO 中でも他帯域は鳴らない');
// ---- OUT / MIX ----
ok(Math.abs(gdb(1000,.2,{out:-6})+6)<=.2&&Math.abs(gdb(1000,.2,{out:6})-6)<=.2,'OUT: 全体の音量');
{const o=Object.assign(T(1,-40,20),{x1:400}),g1=gdb(60,.5,Object.assign({mix:1},o)),g0=gdb(60,.5,Object.assign({mix:0},o)),gh=gdb(60,.5,Object.assign({mix:.5},o));
 ok(Math.abs(g0)<=.1&&g1<-10,'MIX=0 は原音(圧縮なし)・MIX=100% は圧縮');
 const e=db(.5*(1+Math.pow(10,g1/20))/2)-db(.5);ok(Math.abs(gh-e)<=.3,'MIX=50%: 原音と圧縮音の中間('+gh.toFixed(2)+' vs '+e.toFixed(2)+')')}
{// 原音も同じ位相: MIX=0.5 で分割周波数付近を含めて、圧縮なしなら平坦(櫛にならない)
 let w=0;[100,400,800,3000,5000].forEach(f=>{w=Math.max(w,Math.abs(gdb(f,.4,{mix:.5,x1:400,x2:3000,out:0})))});ok(w<=.1,'MIX=50% でも圧縮なしなら平坦(位相がそろう)'+w.toFixed(3))}
// ---- GRの報告(port) ----
{const C=H.procs['sd-mbcomp'],p=new C({}),msgs=[];p.port={postMessage:m=>msgs.push(m)};const par={};C.parameterDescriptors.forEach(d=>{par[d.name]=[d.defaultValue]});Object.assign(par,{enabled:[1],x1:[400],x2:[3000],t1:[-30],r1:[8],a1:[5],l1:[100]});
 const x=sine(60,.5),o=[new Float32Array(128),new Float32Array(128)];for(let s=0;s+128<=N;s+=128)p.process([[x.subarray(s,s+128),x.subarray(s,s+128)]],[o],par);
 const g=msgs.length&&msgs[msgs.length-1].gr;ok(msgs.length>=10&&g&&g[0]<-5&&Math.abs(g[1])<.01&&Math.abs(g[2])<.01,'GRを約50msごとに報告(低域だけ下がる) '+(g?g.map(v=>v.toFixed(1)):'なし'))}
// ---- 極端値・NaN(圧縮・GAIN最大・SOLO/MUTE) ----
{const st={enabled:1,x1:100,x2:5000,out:0};for(const n of [1,2,3])Object.assign(st,{['t'+n]:-60,['r'+n]:20,['a'+n]:.1,['l'+n]:10});extreme('sd-mbcomp',st,3);
 const mx=Object.assign({},st);for(const n of [1,2,3])Object.assign(mx,{['r'+n]:1,['g'+n]:24});mx.out=12;extreme('sd-mbcomp',mx,400);
 extreme('sd-mbcomp',Object.assign({},st,{s1:1,m2:1,mix:.5}),3);
 const x=H.noise(N,.5);for(let i=1000;i<1010;i++)x[i]=NaN;const [y]=run('sd-mbcomp',x,x.slice(),st);let tail=0;for(let i=N-4000;i<N;i++)if(!isFinite(y[i]))tail++;ok(tail===0,'圧縮中に NaN が入っても復帰する')}
// ---- 登録(fx-src と fxworklets.js の一致は test/fx.js・gen --check) ----
{const fs=require('fs'),path=require('path'),vm=require('vm');const ctx={console,Math,Object,Array,Float32Array};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 ['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','fxnew.js','fxparams.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..','www','js',f),'utf8'),ctx,{filename:f}));
 const SD=ctx.SD,c=SD.FXCHAIN;ok(c.indexOf('mb')===c.indexOf('cp')+1&&c.indexOf('sw')===c.indexOf('mb')+1,'チェーン: cp→mb→sw');
 const e=SD.FXR.find(r=>r.k==='mb');ok(e&&e.heavy&&e.wn==='sd-mbcomp'&&e.on==='mbOn','ラック項目(heavy)');
 ok(SD.FXDEF.mbOn===0&&SD.FXDEF.mbX1===200&&SD.FXDEF.mbX2===2500&&SD.FXMAP.mbX1[1]==='x1'&&SD.FXMAP.mbX2[1]==='x2','既定値(OFF・200Hz・2500Hz)と対応表');
 ok(e.ids.length===3+21+2&&[1,2,3].every(n=>SD.FXDEF['mbR'+n]===1&&SD.FXDEF['mbS'+n]===0&&SD.FXDEF['mbM'+n]===0&&SD.FXDEF['mbG'+n]===0)&&SD.FXDEF.mbOut===0&&SD.FXDEF.mbMix===1,'バンド別つまみの既定(RATIO=1・SOLO/MUTE=OFF・OUT=0・MIX=100%)');
 ok(SD.FXR.length===20&&SD.FXR.slice(-2).map(r=>r.k).join()==='dl,rv','ラック20項目(VOCODER・SPECTRAL を含む)(MB・PS・RB を含む。DELAY・REVERBは最後)');
 ok(e.ids.every(id=>SD.defs.analog.byId[id]&&SD.defs.analog.byId[id].auto!==false),'FX-1c: 全つまみがオートメーション可(trk=M・auto:false なし)');
 const proc=H.procs['sd-mbcomp'];ok(proc&&proc.parameterDescriptors.length===3+21+2,'パラメーター数(3+21+2)');
 Object.keys(SD.FXMAP).forEach(id=>{const m=SD.FXMAP[id];if(m[0]==='mb')ok(proc.parameterDescriptors.some(d=>d.name===m[1]),id+' → '+m[1]+' が存在する')})}
err+=H.errors();console.log(err?'FAIL '+err:'fxw-mbcomp OK');process.exit(err?1:0)
