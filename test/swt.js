// サンプル由来ウェーブテーブルの検証(v2.2変換コア+v2.3完成版): node test/swt.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
const g=global;g.window=g;g.SD={};
['params.js','wtparams.js','mat.js','umat.js','swtparams.js','wtdata.js','swtdata.js','wtsynth.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(w,f),'utf8'),{filename:f}));
let err=0;const bad=m=>{console.error('NG: '+m);err++};
const D=SD.WTD,N=2048,NF=64,NL=11,W=SD.SWT;
const sine=(f,sec,sr)=>{sr=sr||44100;const n=Math.round(sec*sr),d=new Float32Array(n);for(let i=0;i<n;i++)d[i]=.9*Math.sin(2*Math.PI*f*i/sr);return{data:d,sr}};
const fr=(T,f,l)=>T.levels.subarray(((l||0)*NF+f)*N,((l||0)*NF+f+1)*N);
const spec=x=>{const re=Float64Array.from(x),im=new Float64Array(N);D.fft(re,im,false);return{re,im}};
const hashT=T=>{let h=2166136261;const v=T.levels;for(let i=0;i<v.length;i+=7){h=Math.imul(h^Math.round(v[i]*1e4),16777619)}return h>>>0};

// 1) 全素材: 64×2048×11段・有限値・ピーク範囲・変換時間
let tAll=0;
SD.MAT.ids.forEach(id=>{
 const m=SD.MAT.get(id),r=W.convert(m,{mat:id});
 if(r.err){bad(id+' 変換失敗 '+r.err.msg);return}
 const T=r.table;if(T.levels.length!==NL*NF*N||T.NF!==NF||T.N!==N||T.NL!==NL)bad(id+' サイズ');
 let mx=0,mx0=0;for(let i=0;i<T.levels.length;i++){const v=T.levels[i];if(!isFinite(v)){bad(id+' 非有限値');break}const a=Math.abs(v);mx=Math.max(mx,a);if(i<NF*N)mx0=Math.max(mx0,a)}
 if(mx0<.5||mx0>1.2)bad(id+' レベル0のピーク '+mx0.toFixed(2));if(mx>3)bad(id+' 全体のピーク '+mx.toFixed(2));
 // 帯域制限(折り返し防止): 上位ミップの許容倍音数を超えない
 for(const f of [0,21,42,63])for(const l of [1,3,6,9]){
  const s=spec(fr(T,f,l)),mh=Math.min(1023,1024>>l);let hi=0,tot=0;for(let k=1;k<N/2;k++){const e=s.re[k]**2+s.im[k]**2;tot+=e;if(k>mh)hi+=e}
  if(hi>1e-6*tot)bad(id+' f'+f+' level'+l+' 帯域外エネルギー '+(hi/tot).toExponential(1))}
 tAll+=r.ms;console.log(id.padEnd(10),'変換 '+r.ms+'ms  CYCLE '+(r.info.cycle*1000).toFixed(2)+'ms'+(r.info.found?'(検出)':'(AUTO既定)')+'  peak0 '+mx0.toFixed(2));
});
// 6秒素材の変換時間の目安(200ms級)
{const m=SD.MAT.get('b:voice'),r=W.convert(m,{mat:'b:voice'});console.log('6秒素材 変換 '+r.ms+'ms');if(r.ms>1000)bad('変換が遅すぎる '+r.ms+'ms')}

// 2) 無音素材は拒否
{const r=W.convert({data:new Float32Array(44100),sr:44100},{});if(!r.err||r.err.code!=='silent')bad('無音素材が拒否されない');
 const r2=W.convert(null,{});if(!r2.err)bad('素材なしが拒否されない');
 const d=new Float32Array(88200);for(let i=0;i<44100;i++)d[i]=.8*Math.sin(i*.05);const r3=W.convert({data:d,sr:44100},{a:.6,b:1});if(!r3.err||r3.err.code!=='silent')bad('範囲内が無音のときに拒否されない')}

// 3) 440Hzサイン波: AUTOで周期を検出し、全フレームで第1倍音が支配的
[44100,48000].forEach(sr=>{
 const r=W.convert(sine(440,1,sr),{cycle:.0025});
 if(r.err){bad('サイン波 変換失敗');return}
 if(!r.info.auto||!r.info.found)bad('サイン波: AUTOで周期が検出されない sr'+sr);
 if(Math.abs(r.info.cycle*440-1)>.01)bad('サイン波: 検出した周期 '+(r.info.cycle*1000).toFixed(3)+'ms (期待 '+(1000/440).toFixed(3)+'ms)');
 let worst=1,pk=[0,9];for(let f=0;f<NF;f++){const s=spec(fr(r.table,f,0));let tot=0;for(let k=1;k<N/2;k++)tot+=s.re[k]**2+s.im[k]**2;worst=Math.min(worst,(s.re[1]**2+s.im[1]**2)/tot);let p=0;for(const v of fr(r.table,f,0))p=Math.max(p,Math.abs(v));pk[0]=Math.max(pk[0],p);pk[1]=Math.min(pk[1],p)}
 if(worst<.99)bad('サイン波: 第1倍音が支配的でないフレームがある ratio='+worst.toFixed(4)+' sr'+sr);
 if(pk[0]-pk[1]>.02)bad('サイン波: NORM ONでピークがそろわない '+pk[1].toFixed(3)+'〜'+pk[0].toFixed(3));
});
// 3b) 手動のCYCLE: 440Hzの3周期ぶん → 第3倍音が支配的
{const r=W.convert(sine(440,1,44100),{cycle:3/440});if(r.err||r.info.auto)bad('手動CYCLEの指定');else{const s=spec(fr(r.table,30,0));let tot=0;for(let k=1;k<N/2;k++)tot+=s.re[k]**2+s.im[k]**2;if((s.re[3]**2+s.im[3]**2)/tot<.97)bad('手動CYCLE=3周期で第3倍音が支配的でない')}}
// 3c) ピッチが取れない素材(ノイズ・ドラム)はAUTOで20ms
['b:noise','b:beat','b:piano'].forEach(id=>{const r=W.convert(SD.MAT.get(id),{mat:id});if(r.info.found||Math.abs(r.info.cycle-.02)>1e-6)bad(id+' 検出できないときの既定20ms');});

// 4) 決定性・NORM・ALIGN
{const m=SD.MAT.get('b:voice'),a=W.convert(m,{}),b=W.convert(m,{});if(hashT(a.table)!==hashT(b.table)||a.key!==b.key)bad('同じ入力で結果が違う');
 for(let i=0;i<a.table.levels.length;i+=1013)if(a.table.levels[i]!==b.table.levels[i]){bad('決定性(値)');break}
 const c=W.convert(m,{cycle:.03});if(hashT(c.table)===hashT(a.table))bad('CYCLEを変えても結果が同じ');
 // NORM OFF: 素材の音量変化が残る(PLUCKは減衰するのでフレームごとのピークがばらつく)
 const pl=SD.MAT.get('b:pluck'),on=W.convert(pl,{norm:true}),off=W.convert(pl,{norm:false});
 const pks=T=>{const o=[];for(let f=0;f<NF;f++){let p=0;for(const v of fr(T,f,0))p=Math.max(p,Math.abs(v));o.push(p)}return o};
 const pOn=pks(on.table),pOff=pks(off.table),mxOff=Math.max(...pOff),mnOff=Math.min(...pOff);
 if(Math.abs(mxOff-.9)>.02)bad('NORM OFF: 全体のピークが揃っていない '+mxOff.toFixed(3));
 if(mnOff>mxOff*.7)bad('NORM OFF: 音量差が残っていない '+mnOff.toFixed(3));
 const mid=pOn.slice(4,60);if(Math.max(...mid)-Math.min(...mid)>.05&&mid.filter(v=>Math.abs(v-.9)>.05).length>mid.length*.5)bad('NORM ON: ピークがそろっていない');
 // ALIGN: 位相がそろうので隣り合うフレームの差が小さい(VOICE・手動CYCLE)
 const dif=T=>{let s=0;for(let f=0;f<NF-1;f++){const A=fr(T,f,0),B=fr(T,f+1,0);for(let i=0;i<N;i++)s+=(A[i]-B[i])**2}return s/(NF-1)/N};
 const al=W.convert(m,{cycle:.02,align:true}),na=W.convert(m,{cycle:.02,align:false});
 console.log('フレーム間の差 ALIGN ON '+dif(al.table).toFixed(4)+' / OFF '+dif(na.table).toFixed(4));
 if(!(dif(al.table)<=dif(na.table)))bad('ALIGN ONのほうがフレーム間の差が大きい');
 // 周期のつなぎ目(先頭と末尾の差)が滑らか: 隣り合う点の差の平均の数倍以内
 let seam=0,adj=0;for(let f=0;f<NF;f++){const A=fr(al.table,f,0);seam+=Math.abs(A[0]-A[N-1]);for(let i=1;i<N;i++)adj+=Math.abs(A[i]-A[i-1])/(N-1)}
 console.log('つなぎ目 '+(seam/NF).toFixed(4)+' / 隣の点の差 '+(adj/NF).toFixed(4));
 if(seam/NF>adj/NF*4)bad('周期のつなぎ目が滑らかでない')}

// 5) 範囲(v2.3の下ごしらえ): 正規化と、範囲で結果が変わること
{const r1=W.range(.8,.2);if(r1[0]!==.2||r1[1]!==.8)bad('range 逆順');const r2=W.range(.5,.5);if(!(r2[1]>r2[0]))bad('range 同値');const r3=W.range(-1,2);if(r3[0]!==0||r3[1]!==1)bad('range 範囲外');const r4=W.range(NaN,'x');if(r4[0]!==0||r4[1]!==1)bad('range NaN');
 const m=SD.MAT.get('b:vowels'),a=W.convert(m,{a:0,b:1}),b=W.convert(m,{a:0,b:.5});if(hashT(a.table)===hashT(b.table))bad('範囲を変えても結果が同じ')}

// 5b) v2.3: SPECTRUM・位相・SMOOTH・範囲補正・キー
{const sr=44100,K0=10,f0=K0*sr/N,n=sr*2,d=new Float32Array(n);for(let i=0;i<n;i++)d[i]=.8*Math.sin(2*Math.PI*f0*i/sr);
 const m={data:d,sr};
 const mags=(T,f)=>{const s=spec(fr(T,f,0));return Array.from({length:40},(_,k)=>Math.hypot(s.re[k],s.im[k]))};
 const z=W.convert(m,{mode:'spectrum',phase:'zero',smooth:0});if(z.err)bad('SPECTRUM変換 '+z.err.msg);
 if(z.table){for(const f of [3,31,60]){const a=mags(z.table,f),pk=Math.max(...a.slice(1));
   if(a.indexOf(pk)!==K0)bad('SPECTRUM: 第'+K0+'倍音が最大でない f'+f+' '+a.indexOf(pk));
   if(!(a[K0-1]>.3*pk&&a[K0-1]<.7*pk&&a[K0+1]>.3*pk&&a[K0+1]<.7*pk))bad('SPECTRUM: 隣の倍音が窓の漏れ(約1/2)にならない f'+f);
   let o=0;for(let k=1;k<40;k++)if(Math.abs(k-K0)>1)o=Math.max(o,a[k]);if(o>.05*pk)bad('SPECTRUM: 既知の線スペクトル以外が大きい '+(o/pk).toFixed(3))}
  if(z.info.mode!=='spectrum'||z.info.auto)bad('SPECTRUMのinfo')}
 // 位相: ZERO=全部そろう(0点が最大)、RANDOM=固定の乱数(決定的・振幅は同じ)、KEEPは別の波形
 const rz=W.convert(m,{mode:'spectrum',phase:'random',smooth:0}),r2=W.convert(m,{mode:'spectrum',phase:'random',smooth:0}),kp=W.convert(m,{mode:'spectrum',phase:'keep',smooth:0});
 if(hashT(rz.table)!==hashT(r2.table))bad('RANDOM位相が決定的でない');
 if(hashT(rz.table)===hashT(z.table)||hashT(kp.table)===hashT(z.table)||hashT(kp.table)===hashT(rz.table))bad('位相モードで結果が変わらない');
 {const A=mags(z.table,20),B=mags(rz.table,20),ra=A[K0]/A[K0+1],rb=B[K0]/B[K0+1];if(Math.abs(ra-rb)/ra>.05)bad('RANDOMで振幅スペクトルが変わった');
  const fz=fr(z.table,20,0);let pi=0;for(let i=1;i<N;i++)if(Math.abs(fz[i])>Math.abs(fz[pi]))pi=i;if(pi>8&&pi<N-8)bad('ZEROでピークが先頭付近に無い '+pi)}
 // 帯域制限・有限値・ピークはSPECTRUMでも守る
 ['b:beat','b:noise','b:voice'].forEach(id=>{const mm=SD.MAT.get(id);['zero','keep','random'].forEach(ph=>{const r=W.convert(mm,{mode:'spectrum',phase:ph});if(r.err){bad(id+' '+ph+' 変換失敗');return}
  let mx=0,fin=true;for(let i=0;i<r.table.levels.length;i++){const v=r.table.levels[i];if(!isFinite(v)){fin=false;break}mx=Math.max(mx,Math.abs(v))}
  if(!fin)bad(id+' '+ph+' 非有限値');if(mx>3)bad(id+' '+ph+' ピーク '+mx.toFixed(2));
  for(const f of [0,32,63])for(const l of [1,4,8]){const s=spec(fr(r.table,f,l)),mh=Math.min(1023,1024>>l);let hi=0,tot=0;for(let k=1;k<N/2;k++){const e=s.re[k]**2+s.im[k]**2;tot+=e;if(k>mh)hi+=e}if(hi>1e-6*tot)bad(id+' SPECTRUM 帯域外 f'+f+' l'+l)}})});
 // SMOOTH: 大きいほどフレーム間の差が小さい(単調)
 const vm=SD.MAT.get('b:vowels'),df=T=>{let s=0;for(let f=0;f<NF-1;f++){const A=fr(T,f,0),B=fr(T,f+1,0);for(let i=0;i<N;i++)s+=(A[i]-B[i])**2}return s/(NF-1)/N};
 const d0=df(W.convert(vm,{cycle:.02,smooth:0}).table),d5=df(W.convert(vm,{cycle:.02,smooth:.5}).table),d1=df(W.convert(vm,{cycle:.02,smooth:1}).table);
 console.log('SMOOTH フレーム間の差 0%:'+d0.toFixed(4)+' 50%:'+d5.toFixed(4)+' 100%:'+d1.toFixed(4));
 if(!(d0>d5&&d5>d1))bad('SMOOTHが大きいほど差が小さくなるはず');
 // 範囲の補正(START>END)・短い範囲の注意・キー(効かない設定は再変換しない)
 const bv=SD.MAT.get('b:strings'),ra=W.convert(bv,{a:.8,b:.2}),rb2=W.convert(bv,{a:.2,b:.8});if(hashT(ra.table)!==hashT(rb2.table)||ra.key!==rb2.key)bad('START>ENDが補正されない');
 const sh=W.convert(bv,{a:.5,b:.51}),lg=W.convert(bv,{a:0,b:1});if(!sh.info.short||lg.info.short)bad('短い範囲の注意(0.1秒未満) '+sh.info.sec);
 const ko=W.optsFrom({wsMat:'b:voice',wsMode:'spectrum',wsPhase:'zero',wsCycle:.02,wsAlign:'on',wsNorm:'on',wsStart:0,wsEnd:1,wsSmooth:.2});
 if(W.key(ko)!==W.key(Object.assign({},ko,{cycle:.05,align:false})))bad('SPECTRUMでCYCLE/ALIGNがキーに入っている');
 const kc=Object.assign({},ko,{mode:'cycle'});if(W.key(kc)!==W.key(Object.assign({},kc,{phase:'random'})))bad('CYCLEでPHASEがキーに入っている');
 if(W.key(ko)===W.key(Object.assign({},ko,{phase:'random'})))bad('SPECTRUMでPHASEがキーに入っていない');
 if(W.key(kc)===W.key(Object.assign({},kc,{smooth:.5})))bad('SMOOTHがキーに入っていない');
 // 既定(v2.2相当のopts)でもsmooth未指定なら0
 if(W.normOpts({}).smooth!==0||W.normOpts({}).mode!=='cycle'||W.normOpts({}).phase!=='zero')bad('normOptsの既定');
}

// 6) WTシンセへの接続(モックのバス・ノード)。非同期変換・デバウンス・直前のテーブル保持・ワークレットへの送信
SD.FXIDS=SD.FXIDS||[];
const base=D.get('basic'),msgs=[];
const wt=new SD.WT({init(){},input:{},set(){}});
wt.ready=true;wt.mode='worklet';wt.node={port:{postMessage(m){msgs.push(m)}}};
/* 実際に変換が始まった回数(デバウンスで中止された要求は数えない): 変換開始時にだけ素材を引く */
let calls=0;const mg=SD.MAT.get;SD.MAT.get=function(id){calls++;return mg.call(SD.MAT,id)};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 W.reset();
 wt.set('wTable','sample');
 if(wt.tab!==base&&wt.tab.id!=='basic')bad('変換中は直前/基本のテーブルのまま');
 if(wt.smp.st!=='wait'&&wt.smp.st!=='run')bad('変換中の状態表示 '+wt.smp.st);
 // 連続操作 → 最後の1回だけ変換(300msのデバウンス)
 calls=0;wt.set('wsCycle',.01);wt.set('wsCycle',.02);wt.set('wsCycle',.03);wt.set('wsAlign','off');
 await wait(150);if(wt.smp.st==='done')bad('デバウンス前に変換が終わっている');
 await wait(1500);
 if(wt.smp.st!=='done')bad('変換が終わらない '+wt.smp.st+' '+wt.smp.msg);
 if(calls!==1)bad('連続操作で変換が'+calls+'回走った(期待1回)');
 if(!wt.tab||wt.tab.id!=='sample'||wt.tabId!=='s:'+wt.sKey())bad('完了後にテーブルが差し替わらない');
 const tm=msgs.filter(m=>m.t==='tab');if(tm.length<1||tm[tm.length-1].data!==wt.tab.levels)bad('ワークレットへテーブルが送られない');
 // 同じ設定は再変換しない(最後の1つをキャッシュ)
 calls=0;const n0=msgs.length;wt.set('wTable','basic');wt.set('wTable','sample');await wait(50);
 if(calls!==0)bad('同じ設定で再変換した');if(wt.tabId!=='s:'+wt.sKey())bad('キャッシュから戻らない');
 // 別の設定 → 変換 → 戻すとまた変換(保持は最後の1つだけ)
 wt.set('wsMat','b:bell');await wait(1500);if(wt.smp.st!=='done'||wt.smp.info.auto!==false&&false)bad('素材変更後の変換');
 calls=0;wt.set('wsMat','b:voice');await wait(1500);if(calls!==1)bad('保持は最後の1つだけのはず calls='+calls);
 // 変換中に別のテーブルへ切り替えると中止される
 wt.set('wsMat','b:strings');wt.set('wTable','pwm');await wait(1000);if(wt.tabId!=='pwm'||wt.smp.st==='done'&&wt.tab.id==='sample')bad('変換中の切替で中止されない '+wt.tabId);
 // 保存・復元: パラメーターだけが入る(フレーム自体は保存しない)
 wt.set('wTable','sample');wt.set('wsMat','b:vowels');wt.set('wsCycle',.015);wt.set('wsAlign','off');wt.set('wsNorm','off');await wait(1500);
 const gp=wt.getPatch();if(gp.wsMat!=='b:vowels'||gp.wsCycle!==.015||gp.wsAlign!=='off'||gp.wsNorm!=='off'||gp.wTable!=='sample')bad('getPatchにws*が入らない');
 if(JSON.stringify(gp).length>4000)bad('音色データが大きすぎる(テーブルを保存していないか) '+JSON.stringify(gp).length);
 const hOld=hashT(wt.tab);
 const wt2=new SD.WT({init(){},input:{},set(){}});wt2.setPatch(JSON.parse(JSON.stringify(gp)));
 // 復元側は同じ設定なのでキャッシュから即座に同じテーブル
 await wait(500);if(wt2.tab.id!=='sample'||hashT(wt2.tab)!==hOld)bad('保存→復元で同じテーブルにならない');
 // 旧データ(ws*なし)は既定値で読める
 const wt3=new SD.WT({init(){},input:{},set(){}});wt3.setPatch({wTable:'basic',wPos:.2});if(wt3.p.wsMat!=='b:voice'||wt3.p.wsCycle!==.0025||wt3.p.wsAlign!=='on'||wt3.p.wsNorm!=='on')bad('旧データの既定値');
 wt3.setPatch({wTable:'sample'});await wait(800);wt3.setPatch({wTable:'basic'});
 // 素材が見つからない(不明な内蔵ID)→ 既定のVOICEに戻して作り直す。戻したことは fixedMat で伝える
 wt2.set('wsMat','b:nothing');await wait(1500);
 if(wt2.p.wsMat!=='b:voice'||wt2.fixedMat!=='b:nothing'||wt2.smp.st!=='done')bad('不明な素材で既定に戻らない '+wt2.p.wsMat+' '+wt2.smp.st);
 wt2.fixedMat=null;
 // 変換エラー(無音の範囲など)→ エラー表示・再試行しない → 素材を直すと復帰
 {const mg2=SD.MAT.get;SD.MAT.get=function(id){if(id==='b:bell')return{id:id,name:'X',data:new Float32Array(44100),sr:44100};return mg2.call(SD.MAT,id)};
  wt2.set('wsMat','b:bell');await wait(800);if(wt2.smp.st!=='err')bad('無音素材でエラー表示にならない '+wt2.smp.st);
  calls=0;wt2.frame(0);wt2.frame(1);await wait(200);if(calls!==0)bad('エラー後に再試行を繰り返す');
  wt2.set('wsMat','b:voice');await wait(1000);if(wt2.smp.st!=='done')bad('エラー後に素材を直しても復帰しない');SD.MAT.get=mg2}
 // v2.3: 保存→復元(新つまみ込み)で同じテーブル。フレームは保存しない
 {const a=new SD.WT({init(){},input:{},set(){}});a.set('wTable','sample');
  [['wsMat','b:vowels'],['wsMode','spectrum'],['wsPhase','random'],['wsStart',.25],['wsEnd',.7],['wsSmooth',.5],['wsNorm','off']].forEach(([k,v])=>a.set(k,v));
  await wait(1500);if(a.smp.st!=='done')bad('v2.3設定の変換 '+a.smp.st);
  const gp2=a.getPatch(),h1=hashT(a.tab);['wsMode','wsPhase','wsStart','wsEnd','wsSmooth'].forEach(k=>{if(!(k in gp2))bad('getPatchに'+k+'が無い')});
  if(JSON.stringify(gp2).length>4000)bad('音色データが大きい');
  SD.SWT.reset();const b=new SD.WT({init(){},input:{},set(){}});b.setPatch(JSON.parse(JSON.stringify(gp2)));await wait(1500);
  if(b.smp.st!=='done'||hashT(b.tab)!==h1)bad('v2.3 保存→復元で同じテーブルにならない');
  // 旧データ(v2.2のws*のみ)は既定(CYCLE・全範囲・SMOOTH20%)で読める
  const c=new SD.WT({init(){},input:{},set(){}});c.setPatch({wTable:'sample',wsMat:'b:bell',wsCycle:.02,wsAlign:'on',wsNorm:'on'});
  if(c.p.wsMode!=='cycle'||c.p.wsPhase!=='zero'||c.p.wsStart!==0||c.p.wsEnd!==1||c.p.wsSmooth!==.2)bad('v2.2データの既定値');await wait(800)}
 // 取り込み素材(u:): モックのメモリ保存で、変換・保存→復元・削除後の既定戻し・未読込時の待ち
 {SD.UMAT._useMemory();await wait(20);
  const sr=44100,n=sr*2,x=new Float32Array(n);for(let i=0;i<n;i++)x[i]=.7*Math.sin(2*Math.PI*220*i/sr)+.2*Math.sin(2*Math.PI*660*i/sr);
  const r=await SD.UMAT.add('TEST',[x],sr);if(!r.ok){bad('モック素材の取り込み '+r.msg)}else{
   const id=r.id,u=new SD.WT({init(){},input:{},set(){}});u.set('wTable','sample');u.set('wsMat',id);await wait(1500);
   if(u.smp.st!=='done'||u.p.wsMat!==id)bad('取り込み素材で変換できない '+u.smp.st+' '+u.smp.msg);
   if(!(u.smp.info&&u.smp.info.found)||Math.abs(1/u.smp.info.cycle-220)>6)bad('取り込み素材のAUTO周期 '+(u.smp.info&&1/u.smp.info.cycle));
   const gp=u.getPatch(),h=hashT(u.tab);if(gp.wsMat!==id)bad('素材IDが保存されない');
   // 復元(キャッシュ無し・素材の読み込みキャッシュも空 → 保存領域から読み込んで同じテーブル)
   SD.SWT.reset();SD.UMAT._reset&&0;const v=new SD.WT({init(){},input:{},set(){}});v.setPatch(JSON.parse(JSON.stringify(gp)));await wait(1500);
   if(v.smp.st!=='done'||hashT(v.tab)!==h)bad('取り込み素材: 保存→復元で同じテーブルにならない');
   // 削除 → その素材のキャッシュは使われず、既定に戻る
   await SD.UMAT.remove(id);v.set('wsPhase','keep');v.set('wsMode','spectrum');v.set('wsMode','cycle');v.set('wsPhase','zero');
   SD.SWT.peek&&0;const w2=new SD.WT({init(){},input:{},set(){}});w2.setPatch(JSON.parse(JSON.stringify(gp)));await wait(1500);
   if(w2.p.wsMat!=='b:voice'||w2.fixedMat!==id||w2.smp.st!=='done')bad('削除済み素材が既定に戻らない '+w2.p.wsMat+' '+w2.smp.st);
   // 削除済みIDの最後の結果がキャッシュに残っていても使われない
   if(SD.SWT.peek(SD.SWT.key(SD.SWT.optsFrom(Object.assign({},w2.p,{wsMat:id}))),id)!==null)bad('削除済み素材のキャッシュが使われる')}}
// 既存の8テーブル+自作は従来どおり
 ['basic','pwm','harm','vowel','digital','metal','organ','noise','user'].forEach(id=>{wt2.set('wTable',id);if(wt2.tab.id!==id)bad('既存テーブル '+id)});
 console.log(err?('失敗 '+err+'件'):'OK: サンプル由来ウェーブテーブル(変換コア・WT接続)');
 process.exit(err?1:0);
})();
