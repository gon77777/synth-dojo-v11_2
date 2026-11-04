// REVERSE(sd-reverse)の検査: node test/fxw-reverse.js   FX-3b
//  ①逆再生の波形が元の時間反転と一致(LEN 6種) ②遅延=区間の長さ・ドライは遅れない・MIX ③FEEDBACK(反復・安定・DC/矩形で発振しない) ④テンポ変更・再生開始・LEN変更・接続の途切れ ⑤極端値・NaN・不正値 ⑥ラック登録・バス配線
const fs=require('fs'),path=require('path'),vm=require('vm');
const H=require('./fxw5.js'),{procs}=H,SR=48000,ROOT=path.join(__dirname,'..');
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
if(H.errors&&H.errors()>0){console.error('NG: fxw5 の検査が通っていない');process.exit(1)}
const A=(t,b,bpm,run,n)=>({t,b,bpm,run:run==null?1:run,n:n==null?1:n}),LENS=globalThis.SDBeat.LENS;
/* 128サンプルずつ回す(時刻を進める)。msgs=[{at:サンプル,beat}]。o.seq(s)=ブロックごとの上書き。skip=[from,to) のブロックは処理しない(接続が外れた状態)。戻り値 [L,R] */
function drive(xL,xR,o){o=o||{};const C=procs['sd-reverse'],p=new C({}),P={enabled:[o.en==null?1:o.en],len:[o.len==null?3:o.len],mix:[o.mix==null?1:o.mix],fb:[o.fb||0]};
 const n=xL.length,L=new Float32Array(n),R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128),ms=(o.msgs||[{at:0,beat:A(0,0,120)}]).slice().sort((a,b)=>a.at-b.at);let mi=0;
 for(let s=0;s+128<=n;s+=128){global.currentTime=s/SR;global.currentFrame=s;
  while(mi<ms.length&&ms[mi].at<=s){p.port.onmessage({data:ms[mi].raw!==undefined?ms[mi].raw:{beat:ms[mi].beat}});mi++}
  if(o.skip&&s>=o.skip[0]&&s<o.skip[1])continue;
  if(o.seq){const q=o.seq(s);Object.keys(q).forEach(k=>{P[k]=[q[k]]})}
  p.process([[xL.subarray(s,s+128),xR.subarray(s,s+128)]],[[oL,oR]],P);L.set(oL,s);R.set(oR,s)}
 return [L,R]}
const noise=H.noise,sil=n=>new Float32Array(n),db=x=>20*Math.log10(x);
const maxdiff=(a,b,i0,i1,f)=>{let m=0;for(let i=i0;i<i1;i++)m=Math.max(m,Math.abs(a[i]-f(i)));return m};
const FADE=96;
// ---- ①逆再生 = 元の時間反転(LEN 6種・120BPM。区間の内側は完全一致。左右別々) ----
{const N=SR*5,xl=noise(N,.5),xr=noise(N,.3).map((v,i)=>v*Math.sin(i*.001));
 LENS.forEach((len,li)=>{const S=Math.round(len*SR*60/120),[L,R]=drive(xl,xr,{len:li});let worst=0,segs=0;
  for(let k=1;(k+1)*S<=N;k++){const a=(k-1)*S,F=Math.min(FADE,S>>2);for(let i=F;i<S-F;i++){worst=Math.max(worst,Math.abs(L[k*S+i]-xl[a+S-1-i]),Math.abs(R[k*S+i]-xr[a+S-1-i]))}segs++}
  ok(segs>=1&&worst<1e-6,'LEN='+len+'拍: 出力が直前の区間の時間反転と一致(区間 '+segs+'個・最大差 '+worst.toExponential(1)+')');
  // 区間の頭・尻はフェード(0から入り0へ戻る)=切れ目のクリックなし
  ok(Math.abs(L[S])<1e-9&&Math.abs(L[2*S-1])<1e-9,'LEN='+len+'拍: 逆再生の頭と尻は 0 から入り 0 に戻る')})}
// ---- ②遅延=区間の長さ。最初の区間は無音。パルスは「区間の頭から p」→「次の区間の頭から S-1-p」に出る。ドライは遅れない ----
{const S=24000,N=SR*3,x=sil(N);x[1000]=.2;x[S+5000]=.4;x[S+23000]=.1;const [L]=drive(x,x.slice(),{len:3});
 let first=0;for(let i=0;i<S;i++)first=Math.max(first,Math.abs(L[i]));ok(first===0,'MIX=100%: 最初の区間は無音(最大 '+first+')');
 ok(Math.abs(L[S+(S-1-1000)]-.2)<1e-6,'パルス(区間内 1000)は次の区間の頭から '+(S-1-1000)+' に出る(遅延=区間の長さ。'+L[S+S-1-1000]+')');
 ok(Math.abs(L[2*S+(S-1-5000)]-.4)<1e-6&&Math.abs(L[2*S+(S-1-23000)]-.1*(23000<S-FADE?1:(S-1-23000)/FADE))<1e-6,'パルス(次の区間 5000・23000)も反転した位置に出る');
 let ex=0;for(let i=0;i<N;i++)if(Math.abs(L[i])>1e-9&&i!==S+S-1-1000&&i!==2*S+S-1-5000&&i!==2*S+S-1-23000)ex++;ok(ex===0,'余計な音が出ない('+ex+')')}
{const N=SR*2,x=noise(N,.5),y=noise(N,.5).map(v=>-v);
 let [L,R]=drive(x,y,{mix:0});ok(maxdiff(L,x,0,N,i=>x[i])===0&&maxdiff(R,y,0,N,i=>y[i])===0,'MIX=0: 入力そのまま(遅れなし・左右も)');
 const S=24000,[M]=drive(x,x.slice(),{mix:.5}),[W]=drive(x,x.slice(),{mix:1});ok(maxdiff(M,x,0,N,i=>(x[i]+W[i])/2)<1e-6,'MIX=50%: 原音(遅れなし)と逆再生の平均');
 ok(maxdiff(M,x,0,S,i=>x[i]/2)<1e-6,'MIX=50%: 最初の区間は原音の半分だけ(逆再生はまだ無い)');
 const [Z]=drive(x,x.slice(),{en:0});ok(maxdiff(Z,x,0,N,i=>x[i])===0,'enabled=0: 素通し')}
// MIX をレーンで動かしてもクリックなし(0↔1 の切り替え)
{const N=SR*3,x=Float32Array.from({length:N},(_,i)=>.5*Math.sin(i*.07)),[L]=drive(x,x.slice(),{seq:s=>({mix:(s/128)%100<50?0:1})});let dm=0;for(let i=1;i<N;i++)dm=Math.max(dm,Math.abs(L[i]-L[i-1]));ok(dm<.25,'MIX の急な切り替えでクリックなし(隣の差の最大 '+dm.toFixed(3)+')')}
// ---- ③FEEDBACK: 逆→順の繰り返しが fb ずつ小さく(パルス)・止めるとじわじわ消える・DC・矩形・ノイズで発振しない ----
{const S=24000,N=SR*6,x=sil(N);x[3000]=.1;const [L]=drive(x,x.slice(),{len:3,fb:.5});
 ok(Math.abs(L[S+S-1-3000]-.1)<1e-6,'FEEDBACK=0.5: 1回目は逆再生('+L[S+S-1-3000]+')');
 ok(Math.abs(L[2*S+3000]-.05)<1e-5,'FEEDBACK=0.5: 2回目は順方向で半分('+L[2*S+3000]+')');
 ok(Math.abs(L[3*S+S-1-3000]-.025)<1e-5&&Math.abs(L[4*S+3000]-.0125)<1e-5,'FEEDBACK=0.5: 以降も半分ずつ小さくなる')
 const [Z]=drive(x,x.slice(),{len:3,fb:0});let m=0;for(let i=2*S;i<N;i++)m=Math.max(m,Math.abs(Z[i]));ok(m===0,'FEEDBACK=0: 繰り返しなし')}
{const N=SR*30,xs={'ノイズ1秒のあと無音':(()=>{const a=sil(N);a.set(noise(SR,.8));return a})(),'DC .9':new Float32Array(N).fill(.9),'全振幅の矩形':Float32Array.from({length:N},(_,i)=>(i>>6)&1?1:-1)};
 Object.keys(xs).forEach(k=>{const x=xs[k],[L,R]=drive(x,x.slice(),{len:3,fb:.9,mix:1});let mx=0,bad=0;for(let i=0;i<N;i++){const a=Math.abs(L[i]),b=Math.abs(R[i]);if(!isFinite(a)||!isFinite(b))bad++;else mx=Math.max(mx,a,b)}
  ok(bad===0&&mx<=3.2,'FEEDBACK=0.9('+k+'): 30秒回しても有限・最大 '+mx.toFixed(2)+'(上限 3.2)');
  if(k==='ノイズ1秒のあと無音'){let tail=0;for(let i=N-SR*2;i<N;i++)tail=Math.max(tail,Math.abs(L[i]));ok(tail<.02,'FEEDBACK=0.9: 入力を止めると繰り返しは小さくなる(最後の2秒の最大 '+tail.toFixed(4)+')')}})}
// FEEDBACK をレーンで動かしても破綻しない
{const N=SR*6,x=noise(N,.5),[L]=drive(x,x.slice(),{len:2,seq:s=>({fb:.45+.45*Math.sin(s/SR*5),mix:.7})});let bad=0,mx=0;for(let i=0;i<N;i++){if(!isFinite(L[i]))bad++;else mx=Math.max(mx,Math.abs(L[i]))}ok(bad===0&&mx<3.2,'FEEDBACK・MIX を同時に動かしても破綻しない(最大 '+mx.toFixed(2)+')')}
// ---- ④テンポ・再生開始・LEN・接続の途切れ ----
{// 一定テンポ 150(拍の長さ 19200): 反転が成り立つ
 const S=19200,N=SR*4,x=noise(N,.5),[L]=drive(x,x.slice(),{len:3,msgs:[{at:0,beat:A(0,0,150)}]});ok(maxdiff(L,x,3*S+FADE,4*S-FADE,i=>x[(3-1)*S+S-1-(i-3*S)])<1e-6,'150BPM: 反転が成り立つ(拍の長さ '+S+')');
 // 120→150(1.0秒=拍2): 拍2〜3の区間(19200)は、直前の区間(24000)の尻から読む。以降は19200どうし
 const msgs=[{at:0,beat:A(0,0,120)},{at:0,beat:A(1,2,150)}],[T]=drive(x,x.slice(),{len:3,msgs}),s2=48000,s3=48000+19200,s4=s3+19200;
 ok(maxdiff(T,x,s2+FADE,s3-FADE,i=>x[s2-24000+(24000-1-(i-s2))])<1e-6,'テンポ変更の区間: 直前の区間(24000)の尻から読む(足りない分は読まれない)');
 ok(maxdiff(T,x,s3+FADE,s4-FADE,i=>x[s2+(19200-1-(i-s3))])<1e-6,'テンポ変更の次の区間: 19200 サンプルで反転が成り立つ');
 // 150→75: 短い区間のあとの長い区間は、読み出しが足りない部分が無音
 const m2=[{at:0,beat:A(0,0,150)},{at:0,beat:A(1,2.5,75)}],[U]=drive(x,x.slice(),{len:3,msgs:m2});let nan=0;for(let i=0;i<N;i++)if(!isFinite(U[i]))nan++;
 const e0=SR+19200*0+0;ok(nan===0,'150→75: 区間が伸びても有限')}
{// 再生開始(n が変わる): 前の音は捨てる。開始から最初の区間は無音。次の区間に開始後の音の反転
 const S=24000,N=SR*4,x=noise(N,.5),t0=1.0,msgs=[{at:0,beat:A(0,0,120,1,0)},{at:0,beat:A(t0,0,120,1,1)}],[L]=drive(x,x.slice(),{len:3,msgs});
 let m=0;for(let i=SR+1;i<SR+S-1;i++)m=Math.max(m,Math.abs(L[i]));ok(m===0,'再生開始から最初の区間は無音(開始前の録音を出さない。最大 '+m+')');
 ok(maxdiff(L,x,SR+S+FADE,SR+2*S-FADE,i=>x[SR+S-1-(i-SR-S)])<1e-6,'再生開始の次の区間: 開始後の音の反転')}
{// LEN を途中で変える(1拍→1/4拍): その場で新しい区間が始まり、以降は格子に揃って反転
 const N=SR*4,x=noise(N,.5),[L]=drive(x,x.slice(),{len:3,seq:s=>({len:s<SR*2?3:1})});let bad=0;for(let i=0;i<N;i++)if(!isFinite(L[i]))bad++;ok(bad===0,'LEN を途中で変えても有限');
 const S=6000,k0=Math.ceil((SR*2+256)/S)+2;ok(maxdiff(L,x,k0*S+FADE,(k0+1)*S-FADE,i=>x[(k0-1)*S+S-1-(i-k0*S)])<1e-6,'LEN 変更のあと(1/4拍): 反転が成り立つ')}
{// 接続が外れていた(process が呼ばれない)あと: 古い録音を出さない
 const N=SR*4,x=noise(N,.5),[L]=drive(x,x.slice(),{len:3,skip:[SR,SR*2+4*128]});let m=0;for(let i=SR*2+4*128;i<SR*2+4*128+22000;i++)m=Math.max(m,Math.abs(L[i]));
 ok(m===0,'接続が外れていたあと、最初の区間は無音(古い音を出さない。最大 '+m+')')}
// ---- ⑤極端値・NaN・不正なパラメーター ----
{const N=SR/2*4,ins={silence:sil(N),dc:new Float32Array(N).fill(.9),square:Float32Array.from({length:N},(_,i)=>(i>>6)&1?1:-1),noise:noise(N,1)};
 [{len:0,fb:.9,mix:1},{len:5,fb:.9,mix:1},{len:3,fb:.9,mix:.5},{len:1,fb:0,mix:1}].forEach(o=>Object.keys(ins).forEach(k=>{const [L,R]=drive(ins[k],ins[k].slice(),Object.assign({msgs:[{at:0,beat:A(0,0,300)}]},o));let bad=0,mx=0;for(let i=0;i<N;i++){const a=Math.abs(L[i]),b=Math.abs(R[i]);if(!isFinite(a)||!isFinite(b))bad++;else mx=Math.max(mx,a,b)}
  ok(bad===0&&mx<=3.2,'極端値(LEN '+o.len+'・FB '+o.fb+'・MIX '+o.mix+'・'+k+'): NaN '+bad+'個・最大 '+mx.toFixed(2))}));
 const x=noise(SR*3,.5);for(let i=1000;i<1010;i++)x[i]=NaN;x[2000]=Infinity;x[SR+5]=-Infinity;const [L]=drive(x,x.slice(),{len:3,fb:.8});let bad=0;for(let i=0;i<L.length;i++)if(!isFinite(L[i]))bad++;ok(bad===0,'NaN・無限大が入っても出力は有限('+bad+')');
 const [P]=drive(x.map(v=>isFinite(v)?v:0),x.map(v=>isFinite(v)?v:0),{len:NaN,mix:NaN,fb:NaN});let b2=0;for(let i=0;i<P.length;i++)if(!isFinite(P[i]))b2++;ok(b2===0,'不正なパラメーター(NaN)でも出力は有限');
 const [Q]=drive(x.map(v=>isFinite(v)?v:0),x.map(v=>isFinite(v)?v:0),{len:99,mix:9,fb:9});let b3=0,m3=0;for(let i=0;i<Q.length;i++){if(!isFinite(Q[i]))b3++;else m3=Math.max(m3,Math.abs(Q[i]))}ok(b3===0&&m3<3.2,'範囲外の値は丸められる(最大 '+m3.toFixed(2)+')');
 const [Y]=drive(x.map(v=>isFinite(v)?v:0),x.map(v=>isFinite(v)?v:0),{msgs:[{at:0,raw:null},{at:0,raw:{beat:{t:NaN,b:1,bpm:120}}},{at:0,raw:{beat:'x'}},{at:0,beat:A(0,0,120)}]});let b4=0;for(let i=0;i<Y.length;i++)if(!isFinite(Y[i]))b4++;ok(b4===0,'不正なアンカー(null・NaN・文字)でも落ちない')}
// ---- ⑥ラック登録・バス配線 ----
{const c={console,Math,Object,Array,Float32Array,setTimeout,clearTimeout};c.window=c;vm.createContext(c);vm.runInContext('var SD={};',c);
 ['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','beat.js','fxnew.js','fxparams.js','bus.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,'www','js',f),'utf8'),c,{filename:f}));
 const SD=c.SD,ch=SD.FXCHAIN,e=SD.FXR.find(r=>r.k==='rb');
 ok(ch.indexOf('rb')===ch.indexOf('ps')+1&&ch.indexOf('gl')===ch.indexOf('rb')+1&&ch.indexOf('tr')===ch.indexOf('gl')+3&&ch[ch.indexOf('gl')+1]==='vc'&&ch[ch.indexOf('gl')+2]==='sp','チェーン: md→ps→rb→gl→vc→sp→tr('+ch.join('>')+')');
 ok(e&&e.wn==='sd-reverse'&&e.on==='rbOn'&&e.ids.join()==='rbOn,rbLen,rbMix,rbFb'&&!e.heavy,'ラック項目(heavy でない)');
 ok(SD.FXDEF.rbOn===0&&SD.FXDEF.rbLen===3&&SD.FXDEF.rbMix===1&&SD.FXDEF.rbFb===0,'既定値(OFF・1拍・100%・0)');
 ok(SD.FXR.length===20&&SD.FXR.slice(-2).map(r=>r.k).join()==='dl,rv'&&SD.FXR.filter(r=>r.k==='rv').length===1,'ラック20項目(VOCODER・SPECTRAL を含む)(既存の REVERB=rv と別のキー rb。DELAY・REVERBは最後)');
 const names=procs['sd-reverse'].parameterDescriptors.map(d=>d.name),map={rbLen:'len',rbMix:'mix',rbFb:'fb'};
 Object.keys(map).forEach(id=>{const m=SD.FXMAP[id];ok(m&&m[0]==='rb'&&m[1]===map[id]&&names.indexOf(m[1])>=0,id+' → '+map[id]+' が存在する')});
 ok(SD.FXMAP.rbLen[3]===0&&SD.FXMAP.rbMix[3]===1&&SD.FXMAP.rbFb[3]===1,'LEN は離散(なめらかにしない)・MIX/FB はなめらか');
 const D=SD.defs.analog.byId;ok(e.ids.every(id=>D[id]&&D[id].auto!==false),'全つまみがオートメーション可(trk=M)');
 ok(D.rbMix.min===0&&D.rbMix.max===1&&D.rbFb.min===0&&D.rbFb.max===.9&&D.rbFb.max===procs['sd-reverse'].parameterDescriptors.find(d=>d.name==='fb').maxValue,'つまみの範囲がワークレットの範囲と一致');
 ok(JSON.stringify(D.rbLen.opts.map(o=>o[1]))===JSON.stringify(SD.BEATLEN.map(r=>r[1]))&&SD.BEATLEN.every((r,i)=>r[0]===LENS[i]),'LEN の選択肢が SD.BEATLEN・ワークレットの LENS と一致');
 // バス: mk_rb が拍の送り先につなぎ、再構築で外れる
 const B=SD.bus;B.wkOK=true;B.p={};B.ctx={currentTime:0};const sent=[],mk={parameters:{get:()=>({set value(v){}})},port:{postMessage:m=>sent.push(m)}};B.wnode=nm=>Object.assign({nm},mk);B.wp=()=>{};
 ok(B.act('rb')===false,'bus.act: OFF');B.p.rbOn=1;ok(B.act('rb')===true,'bus.act: ON');
 const g=B.mk_rb();ok(g.in===g.out&&g.w.nm==='sd-reverse'&&typeof g.unlink==='function'&&sent.length===1&&sent[0].beat,'bus.mk_rb: ワークレットを作り拍のアンカーを送る');
 SD.beat.start(3,100);ok(sent.length===2&&sent[1].beat.n===1,'bus.mk_rb: 再生開始のアンカーが届く');
 g.unlink();SD.beat.start(4,100);ok(sent.length===2,'unlink で外れる')}
{const w=fs.readFileSync(path.join(ROOT,'www','js','fxworklets.js'),'utf8');ok(/\"reverse\":/.test(w)&&/sd-reverse/.test(w),'fxworklets.js に reverse が埋め込まれている');
 const ks=Object.keys(new Function('var window={};'+w+';return window.SD.FXWSRC')());ok(ks.indexOf('beatbuf')<ks.indexOf('reverse'),'beatbuf は reverse より前に読み込まれる')}
err+=H.errors?H.errors():0;console.log(err?'FAIL '+err:'fxw-reverse OK');process.exit(err?1:0)
