// GLITCH(sd-glitch)の検査: node test/fxw-glitch.js   FX-3c
//  ①PROB=0 は素通し(ビット一致・遅延ゼロ) ②くり返し(順・REV・PITCH±12・REPEAT・ゲート)が録音と一致 ③固定シード(同じ結果・再生開始でリセット・PROB を上げても前の区間は残る)
//  ④途中から始まる区間は素通し・テンポ/LEN/途切れ・クリック ⑤極端値・NaN ⑥ラック登録・バス配線
const fs=require('fs'),path=require('path'),vm=require('vm');
const H=require('./fxw5.js'),{procs}=H,SR=48000,ROOT=path.join(__dirname,'..');
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
if(H.errors&&H.errors()>0){console.error('NG: fxw5 の検査が通っていない');process.exit(1)}
const A=(t,b,bpm,run,n)=>({t,b,bpm,run:run==null?1:run,n:n==null?1:n}),LENS=globalThis.SDBeat.LENS;
function drive(xL,xR,o){o=o||{};const C=procs['sd-glitch'],p=new C({}),P={enabled:[o.en==null?1:o.en],len:[o.len==null?3:o.len],prob:[o.prob==null?1:o.prob],rep:[o.rep||4],rev:[o.rev||0],pitch:[o.pitch||0],mix:[o.mix==null?1:o.mix]};
 const n=xL.length,L=new Float32Array(n),R=new Float32Array(n),oL=new Float32Array(128),oR=new Float32Array(128),ms=(o.msgs||[{at:0,beat:A(0,0,120)}]).slice().sort((a,b)=>a.at-b.at);let mi=0;
 for(let s=0;s+128<=n;s+=128){global.currentTime=s/SR;global.currentFrame=s;
  while(mi<ms.length&&ms[mi].at<=s){p.port.onmessage({data:ms[mi].raw!==undefined?ms[mi].raw:{beat:ms[mi].beat}});mi++}
  if(o.skip&&s>=o.skip[0]&&s<o.skip[1])continue;
  if(o.seq){const q=o.seq(s);Object.keys(q).forEach(k=>{P[k]=[q[k]]})}
  p.process([[xL.subarray(s,s+128),xR.subarray(s,s+128)]],[[oL,oR]],P);L.set(oL,s);R.set(oR,s)}
 return [L,R]}
const noise=H.noise,sil=n=>new Float32Array(n),F=48,S=24000;
const maxd=(a,b)=>{let m=0;for(let i=0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m};
// ---- ①PROB=0: ビット一致・遅延ゼロ(MIX・REPEAT・REV・PITCH・LEN をどうしても) ----
{const N=SR*4,x=noise(N,.7),y=noise(N,.4).map((v,i)=>v*Math.cos(i*.002));
 [{},{mix:.3,rep:16,rev:1,pitch:2},{len:0,pitch:-1},{len:5,rep:2,mix:1}].forEach((o,k)=>{const [L,R]=drive(x,y,Object.assign({prob:0},o));ok(maxd(L,x)===0&&maxd(R,y)===0,'PROB=0 は入力とビット一致(設定 '+k+')')});
 const imp=sil(SR);imp[1000]=.1;const [L]=drive(imp,imp.slice(),{prob:0});ok(L[1000]===Math.fround(.1)&&L.reduce((a,v,i)=>a+(i!==1000&&v!==0?1:0),0)===0,'PROB=0: インパルスは遅れず1サンプルも増えない');
 const [Z]=drive(x,y,{en:0,prob:1});ok(maxd(Z,x)===0,'enabled=0: 素通し')}
// ---- ②くり返し。PROB=100%・REPEAT=4(スライス 6000)・120BPM・1拍=24000。区間ごとに ゲート(奇数スライス無音)か否かが違うので、そのどちらかに一致すること ----
// 期待: 出力[K+pos] = pos<slice なら入力。そうでなければ 録音[K+q](q は速度・向きで決まる)
function replay(x,L,o){const sl=o.sl||S/(o.rep||4),r=o.r||1,nseg=Math.floor(x.length/S);let checked=0,gated=0,bad=0,heads=0;
 for(let k=0;k<nseg;k++){const K=k*S;
  for(let p=(k?F+2:0);p<sl;p++)if(Math.abs(L[K+p]-x[K+p])>1e-6)heads++;                       // 最初のスライスは入力そのまま
  for(let j=1;j<S/sl;j++){let silent=true,match=true,n=0;
   for(let p=j*sl+F+2;p<(j+1)*sl-F-2;p++){const t=p-sl,ph=t*r,lp=ph-sl*Math.floor(ph/sl);if(lp<F+2||lp>sl-F-3)continue;
    let q=o.rev?sl-1-lp:lp;if(q<0)q+=sl;const i0=Math.floor(q),fr=q-i0,i1=i0+1>=sl?0:i0+1,want=x[K+i0]*(1-fr)+x[K+i1]*fr;n++;
    if(Math.abs(L[K+p])>1e-9)silent=false;if(Math.abs(L[K+p]-want)>1e-5)match=false}
   if(n>0){if(match)checked++;else if(silent&&(j&1))gated++;else bad++}}}
 return {checked,gated,bad,heads,nseg}}
{const N=SR*20,x=noise(N,.6),y=x.slice();
 [['順再生',{}],['REV=100%',{rev:1}],['PITCH +12(2倍)',{pitch:2}],['PITCH -12(半分)',{pitch:0}],['REPEAT=2',{rep:2}],['REPEAT=8',{rep:8}],['REPEAT=16',{rep:16}]].forEach(([nm,o])=>{
  const oo=Object.assign({prob:1,pitch:1},o),pitchSt=oo.pitch===2?12:oo.pitch===0?-12:0,[L,R]=drive(x,y,{prob:1,rep:o.rep,rev:o.rev,pitch:pitchSt}),rr=replay(x,L,{rep:o.rep,rev:o.rev,r:Math.pow(2,pitchSt/12)});
  ok(rr.heads===0,nm+': 区間の最初のスライスは入力そのまま('+rr.heads+')');ok(rr.bad===0&&rr.checked>0,nm+': くり返しが録音と一致(一致 '+rr.checked+'・ゲート '+rr.gated+'・不一致 '+rr.bad+')');
  ok(maxd(L,R)===0,nm+': 左右同じ入力なら同じ出力')});
 // ゲートは区間ごとに約1/4: 40区間のうち、奇数スライスが無音の区間がある(全部ではない)
 const [L]=drive(x,y,{prob:1,rep:4}),rr=replay(x,L,{rep:4});ok(rr.gated>0&&rr.gated<rr.checked,'ゲート: 区間によって奇数スライスが無音('+rr.gated+'/'+(rr.gated+rr.checked)+')')}
// 左右別々の入力でも、それぞれ自分の録音をくり返す
{const N=SR*4,x=noise(N,.5),y=noise(N,.5).map(v=>-v),[L,R]=drive(x,y,{prob:1}),a=replay(x,L,{}),b=replay(y,R,{});ok(a.bad===0&&b.bad===0&&a.checked>0&&b.checked>0,'左右は別々にくり返す')}
// MIX=50%: 原音とくり返しの平均。MIX=0: グリッチ区間でも素通し
{const N=SR*6,x=noise(N,.6),[W]=drive(x,x.slice(),{prob:1}),[M]=drive(x,x.slice(),{prob:1,mix:.5}),[Z]=drive(x,x.slice(),{prob:1,mix:0});let d=0;for(let i=0;i<N;i++)d=Math.max(d,Math.abs(M[i]-(x[i]+W[i])/2));ok(d<1e-5,'MIX=50%: 原音とグリッチの平均('+d.toExponential(1)+')');ok(maxd(Z,x)<1e-6,'MIX=0: 素通し')}
// ---- ③固定シード ----
{const N=SR*20,x=noise(N,.5),[A1]=drive(x,x.slice(),{prob:.5,rev:.5}),[A2]=drive(x,x.slice(),{prob:.5,rev:.5});ok(maxd(A1,A2)===0,'同じ入力・同じ設定なら毎回同じ結果');
 const seg=o=>{const [L]=drive(x,x.slice(),o),g=[];for(let k=0;k<N/S-1;k++){let d=0;for(let p=S/4+100;p<S/4*2-100;p++)d=Math.max(d,Math.abs(L[k*S+p]-x[k*S+p]));g.push(d>1e-6)}return g};
 const lo=seg({prob:.3}),hi=seg({prob:.7}),n1=lo.filter(Boolean).length,n2=hi.filter(Boolean).length;
 ok(lo.every((v,i)=>!v||hi[i])&&n1>0&&n2>n1,'PROB を上げると、前のグリッチ区間は残って増えるだけ(.3→'+n1+'区間・.7→'+n2+'区間 / '+lo.length+')');
 ok(seg({prob:1}).every(Boolean),'PROB=100%: 全区間がグリッチ');
 // 再生開始でリセット: 入力が10秒周期で、10秒目に再生開始(n=2・拍0)→ 後半は前半と同じ
 const T=SR*10,per=noise(T,.5),xx=new Float32Array(2*T);xx.set(per);xx.set(per,T);
 const [Q]=drive(xx,xx.slice(),{prob:.5,rev:.5,msgs:[{at:0,beat:A(0,0,120,1,1)},{at:T,beat:A(T/SR,0,120,1,2)}]});ok(maxd(Q.subarray(0,T),Q.subarray(T))===0,'再生開始(n 変更)で乱数が最初に戻る: 2回目の再生が1回目と同じ');
 const [Q2]=drive(xx,xx.slice(),{prob:.5,rev:.5,msgs:[{at:0,beat:A(0,0,120,1,1)}]});ok(maxd(Q2.subarray(0,T),Q2.subarray(T))>0,'再生開始が無ければ(続けて流すと)2回目は別の並び')}
// ---- ④途中から始まる区間は素通し・テンポ変更・LEN 変更・途切れ・クリック ----
{const N=SR*3,x=noise(N,.6),t0=.1234,a=Math.ceil(t0*SR),b=Math.ceil(t0*SR+.63*S),[L]=drive(x,x.slice(),{prob:1,msgs:[{at:0,beat:A(0,0,120,1,0)},{at:0,beat:A(t0,.37,120,1,1)}]});
 ok(maxd(L.subarray(a,b-1),x.subarray(a,b-1))===0,'再生開始が拍の途中(拍0.37): 開始から次の拍の頭までの区間は素通し');let d=0;for(let i=b+S/4+100;i<b+S/2-100;i++)d=Math.max(d,Math.abs(L[i]-x[i]));ok(d>1e-3,'開始が拍の途中: 次の区間(頭が揃う)からグリッチ');
 const [M]=drive(x,x.slice(),{prob:1,msgs:[{at:0,beat:A(0,0,120,1,0)},{at:0,beat:A(t0,0,120,1,1)}]});d=0;for(let i=a+S/4+100;i<a+S/2-100;i++)d=Math.max(d,Math.abs(M[i]-x[i]));ok(d>1e-3,'再生開始が拍0(サンプルの途中でも): その区間からグリッチ(頭が揃っている)')}
{const N=SR*6,x=noise(N,.6),mxv=1,chk=(L,nm)=>{let bad=0,m=0;for(let i=0;i<L.length;i++){if(!isFinite(L[i]))bad++;else m=Math.max(m,Math.abs(L[i]))}ok(bad===0&&m<=.6+1e-6,nm+': 有限・入力の最大を超えない(最大 '+m.toFixed(3)+')')};
 chk(drive(x,x.slice(),{prob:1,rev:.5,msgs:[{at:0,beat:A(0,0,120)},{at:0,beat:A(1,2,150)},{at:0,beat:A(2,4,60)}]})[0],'テンポ変更(120→150→60)');
 chk(drive(x,x.slice(),{prob:1,rev:.5,seq:s=>({len:s<SR*2?3:s<SR*4?0:5,rep:2+(s/128)%15|0,pitch:(s/128%3|0)*12-12})})[0],'LEN・REPEAT・PITCH を動かし続ける');
 chk(drive(x,x.slice(),{prob:1,skip:[SR,SR+SR/2]})[0],'接続の途切れ');
 const [Z]=drive(x,x.slice(),{prob:1,skip:[SR,SR+SR/2+3264]});let m=0;for(let i=SR+SR/2+3264;i<4*S-1;i++)m=Math.max(m,Math.abs(Z[i]-x[i]));ok(m===0,'接続の途切れのあと、最初の(頭が揃わない)区間は素通し')}
// クリック: 滑らかなサイン波を入れて、グリッチ(順・逆・±12・ゲート)の出力の隣の差が、フェードの大きさを超えない
{const N=SR*12,x=Float32Array.from({length:N},(_,i)=>.5*Math.sin(i*.05)),lim=.025+.5/F*1.0+.02;
 [{},{rev:1},{pitch:12},{pitch:-12},{rep:16},{len:0,rep:8}].forEach(o=>{const [L]=drive(x,x.slice(),Object.assign({prob:1},o));let dm=0;for(let i=1;i<N;i++)dm=Math.max(dm,Math.abs(L[i]-L[i-1]));ok(dm<lim,'クリックなし '+JSON.stringify(o)+'(隣の差の最大 '+dm.toFixed(3)+' < '+lim.toFixed(3)+')')})}
// ---- ⑤極端値・NaN・不正値 ----
{const N=SR*3,ins={silence:sil(N),dc:new Float32Array(N).fill(.9),square:Float32Array.from({length:N},(_,i)=>(i>>6)&1?1:-1),noise:noise(N,1)};
 [{len:0,rep:16,rev:1,pitch:12,msgs:[{at:0,beat:A(0,0,300)}]},{len:5,rep:2,pitch:-12,msgs:[{at:0,beat:A(0,0,40)}]},{len:3,mix:.5,rev:.5}].forEach(o=>Object.keys(ins).forEach(k=>{const [L,R]=drive(ins[k],ins[k].slice(),Object.assign({prob:1},o));let bad=0,m=0;for(let i=0;i<N;i++){const a=Math.abs(L[i]),b=Math.abs(R[i]);if(!isFinite(a)||!isFinite(b))bad++;else m=Math.max(m,a,b)}ok(bad===0&&m<=1+1e-6,'極端値(LEN '+(o.len==null?3:o.len)+'・'+k+'): NaN '+bad+'個・最大 '+m.toFixed(2))}));
 const x=noise(SR*3,.5);for(let i=1000;i<1010;i++)x[i]=NaN;x[2000]=Infinity;x[SR+5]=-Infinity;const [L]=drive(x,x.slice(),{prob:1});let b1=0;for(let i=0;i<L.length;i++)if(!isFinite(L[i]))b1++;ok(b1===0,'NaN・無限大が入っても出力は有限('+b1+')');
 const cl=x.map(v=>isFinite(v)?v:0),[P]=drive(cl,cl.slice(),{len:NaN,prob:NaN,rep:NaN,rev:NaN,pitch:NaN,mix:NaN});let b2=0;for(let i=0;i<P.length;i++)if(!isFinite(P[i]))b2++;ok(b2===0,'不正なパラメーター(NaN)でも出力は有限');
 const [Q]=drive(cl,cl.slice(),{len:99,prob:9,rep:99,rev:9,pitch:99,mix:9});let b3=0,m3=0;for(let i=0;i<Q.length;i++){if(!isFinite(Q[i]))b3++;else m3=Math.max(m3,Math.abs(Q[i]))}ok(b3===0&&m3<=.5+1e-6,'範囲外の値は丸められる(最大 '+m3.toFixed(2)+')');
 const [Y]=drive(cl,cl.slice(),{msgs:[{at:0,raw:null},{at:0,raw:{beat:{t:NaN,b:1,bpm:120}}},{at:0,raw:{beat:'x'}},{at:0,beat:A(0,0,120)}]});let b4=0;for(let i=0;i<Y.length;i++)if(!isFinite(Y[i]))b4++;ok(b4===0,'不正なアンカーでも落ちない')}
// ---- ⑥ラック登録・バス配線 ----
{const c={console,Math,Object,Array,Float32Array,setTimeout,clearTimeout};c.window=c;vm.createContext(c);vm.runInContext('var SD={};',c);
 ['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','beat.js','fxnew.js','fxparams.js','bus.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(ROOT,'www','js',f),'utf8'),c,{filename:f}));
 const SD=c.SD,ch=SD.FXCHAIN,e=SD.FXR.find(r=>r.k==='gl'),D=SD.defs.analog.byId,dsc=n=>procs['sd-glitch'].parameterDescriptors.find(d=>d.name===n);
 ok(ch.indexOf('gl')===ch.indexOf('rb')+1&&ch.indexOf('tr')===ch.indexOf('gl')+3&&ch[ch.indexOf('gl')+1]==='vc'&&ch[ch.indexOf('gl')+2]==='sp','チェーン: md→ps→rb→gl→vc→sp→tr('+ch.join('>')+')');
 ok(e&&e.wn==='sd-glitch'&&e.on==='glOn'&&e.ids.join()==='glOn,glLen,glProb,glRep,glRev,glPitch,glMix'&&!e.heavy,'ラック項目(heavy でない)');
 ok(SD.FXDEF.glOn===0&&SD.FXDEF.glLen===3&&SD.FXDEF.glProb===.5&&SD.FXDEF.glRep===4&&SD.FXDEF.glRev===.25&&SD.FXDEF.glPitch===1&&SD.FXDEF.glMix===1,'既定値(OFF・1拍・50%・4・25%・0・100%)');
 ok(SD.FXR.length===20&&SD.FXR.slice(-2).map(r=>r.k).join()==='dl,rv'&&SD.fxPageCount(SD.FXR.length)===2,'ラック20項目(VOCODER・SPECTRAL を含む)(左一覧2ページ。DELAY・REVERBは最後)');
 const map={glLen:'len',glProb:'prob',glRep:'rep',glRev:'rev',glPitch:'pitch',glMix:'mix'};Object.keys(map).forEach(id=>{const m=SD.FXMAP[id];ok(m&&m[0]==='gl'&&m[1]===map[id]&&dsc(m[1]),id+' → '+map[id]+' が存在する')});
 ok(SD.FXMAP.glPitch[2](0)===-12&&SD.FXMAP.glPitch[2](1)===0&&SD.FXMAP.glPitch[2](2)===12,'PITCH の選択肢(0/1/2)→ -12/0/+12');
 ok(['glLen','glProb','glRep','glRev','glPitch'].every(id=>SD.FXMAP[id][3]===0)&&SD.FXMAP.glMix[3]===1,'離散・区間の頭で採るものはなめらかにしない・MIX はなめらか');
 ok(e.ids.every(id=>D[id]&&D[id].auto!==false),'全つまみがオートメーション可(trk=M)');
 ok(D.glProb.max===1&&D.glRep.min===dsc('rep').minValue&&D.glRep.max===dsc('rep').maxValue&&D.glMix.max===1,'つまみの範囲がワークレットの範囲と一致');
 ok(JSON.stringify(D.glLen.opts.map(o=>o[1]))===JSON.stringify(SD.BEATLEN.map(r=>r[1]))&&SD.BEATLEN.every((r,i)=>r[0]===LENS[i]),'LEN の選択肢が SD.BEATLEN・ワークレットの LENS と一致');
 const B=SD.bus;B.wkOK=true;B.p={};B.ctx={currentTime:0};const sent=[],mk={parameters:{get:()=>({set value(v){}})},port:{postMessage:m=>sent.push(m)}};B.wnode=nm=>Object.assign({nm},mk);B.wp=()=>{};
 ok(B.act('gl')===false,'bus.act: OFF');B.p.glOn=1;ok(B.act('gl')===true,'bus.act: ON');const g=B.mk_gl();ok(g.in===g.out&&g.w.nm==='sd-glitch'&&typeof g.unlink==='function'&&sent.length===1&&sent[0].beat,'bus.mk_gl: 拍のアンカーを送る');
 SD.beat.start(3,100);ok(sent.length===2,'再生開始が届く');g.unlink();SD.beat.start(4,100);ok(sent.length===2,'unlink で外れる')}
{const w=fs.readFileSync(path.join(ROOT,'www','js','fxworklets.js'),'utf8');ok(/\"glitch\":/.test(w)&&/sd-glitch/.test(w),'fxworklets.js に glitch が埋め込まれている');const ks=Object.keys(new Function('var window={};'+w+';return window.SD.FXWSRC')());ok(ks.indexOf('beatbuf')<ks.indexOf('glitch'),'beatbuf は glitch より前')}
err+=H.errors?H.errors():0;console.log(err?'FAIL '+err:'fxw-glitch OK');process.exit(err?1:0)
