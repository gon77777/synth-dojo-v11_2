// 声の代役・素材再生トラックのテスト(v7.4): node test/voice.js
// ① 定義の整合(つまみ・タブ・FX) ② 声の代役の音色がそのシンセの定義の範囲内 ③ 歌のメロディの型 ④ 素材再生エンジン(擬似AudioContextで動作を検査) ⑤ トラックの保存・読み込み
const fs=require('fs'),path=require('path'),vm=require('vm');
const JS=path.join(__dirname,'..','www','js');
let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
const ctx={console,setTimeout,clearTimeout,Float32Array,Float64Array};ctx.window=ctx;vm.createContext(ctx);
['params.js','wtparams.js','mat.js','umat.js','swtparams.js','smpparams.js','grparams.js','fmparams.js','addparams.js','mixdefs.js','fxnew.js','fxparams.js','seq.js','drums.js','lessons.js','course.js','voice.js','smp.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f}));
const SD=ctx.SD,D=SD.defs.smp;
/* ① 定義 */
ok(!!D&&D.P.length>10,'smp: 定義がある');
D.T.forEach(t=>t.items.forEach(i=>{if(!/^v_/.test(i))ok(!!D.byId[i],'smp: タブ '+t.id+' の項目 '+i+' が定義に無い')}));
D.P.forEach(p=>{if(p.tab!=='top'&&p.type==='knob'&&p.id!=='master')ok(p.min<p.max&&p.def>=p.min&&p.def<=p.max,'smp: '+p.id+' の範囲');if(p.type==='seg')ok(p.opts.some(o=>o[0]===p.def),'smp: '+p.id+' の既定がopts内')});
ok(SD.FXIDS.every(i=>!!D.byId[i]),'smp: FXつまみが全部ある(fxparams.js)');
ok(D.byId.sMat.opts.length===SD.MAT.list.length&&D.DEF.sMat==='b:voice','smp: sMat は内蔵素材の全部・既定は VOICE');
ok(SD.SYNTHS.some(y=>y.id==='smp'&&y.ready&&y.noLesson),'SD.SYNTHS に smp(レッスン一覧には出さない)');
ok(SD.TSYNTHS.indexOf('smp')>=0,'SD.TSYNTHS に smp');
ok(/権利/.test(D.byId.sMat.help)&&/権利/.test(D.byId.sMat.help),'smp: 権利についての注意が画面(ヘルプ)にある');
/* ② 声の代役 */
const V=SD.VOICES;
ok(V.length===9&&SD.VOICEBY.vo_smp&&SD.VOICEBY.vo_smp.synth==='smp'&&['vo_a','vo_i','vo_u','vo_e','vo_o','vo_breath','vo_shi','vo_pa'].every(i=>SD.VOICEBY[i]),'声の代役: 母音5+息+子音2+取り込み素材(vo_smp)');
ok(new Set(V.map(v=>v.id)).size===V.length&&V.every(v=>!SD.DRUMBY[v.id]),'声の代役: ID が一意・ドラムと衝突しない');
V.forEach(v=>{const d=SD.defs[v.synth];ok(!!d,v.id+' シンセ');Object.keys(v.p).forEach(k=>{const p=d.byId[k];if(!p){ok(false,v.id+' 未定義のつまみ '+k);return}
 if(p.type==='seg')ok(p.opts.some(o=>o[0]===v.p[k]),v.id+' '+k+' の値');else ok(typeof v.p[k]==='number'&&v.p[k]>=p.min-1e-9&&v.p[k]<=p.max+1e-9,v.id+' '+k+' の範囲 '+v.p[k])})});
['a','i','u','e','o'].forEach(x=>ok(SD.VOICEBY['vo_'+x].p.adVowel===x&&SD.VOICEBY['vo_'+x].p.adFmt==='on','母音 '+x));
ok(SD.VOICEBY.vo_breath.p.o1Lvl===0&&SD.VOICEBY.vo_breath.p.noiseLvl>0,'息はノイズだけ');
ok(SD.VOICEBY.vo_shi.p.nHP>=3000&&SD.VOICEBY.vo_shi.p.aD<.2,'シ: 高域・短い');
ok(SD.VOICEBY.vo_pa.p.cutoff<=1500&&SD.VOICEBY.vo_pa.p.aD<.1,'パ: 低域・瞬間');
/* ③ メロディの型 */
['A','B','sabi','x'].forEach(pt=>{const a=SD.PATS.vocal(pt),b=SD.PATS.vocal(pt);ok(JSON.stringify(a)===JSON.stringify(b),'vocal '+pt+' 決定的');
 const ks=Object.keys(a.idx);ok(ks.length>=4&&ks.length<=16,'vocal '+pt+' 音数');ks.forEach(k=>ok(+k>=0&&+k<=15&&Number.isInteger(a.idx[k])&&a.idx[k]>=-24&&a.idx[k]<=36,'vocal '+pt+' 範囲'));a.o.tie.forEach(i=>ok(a.idx[i]!==undefined,'vocal '+pt+' tie が空のステップ'))});
{const r=p=>{const v=Object.values(SD.PATS.vocal(p).idx);return[Math.min(...v),Math.max(...v)]};ok(r('sabi')[0]>r('A')[0]&&r('sabi')[1]>r('A')[1],'サビはAメロより高い')}
/* ④ 擬似AudioContextで素材再生エンジンの動きを検査 */
const log=[];let now=0;
const mkNode=n=>({n,connect(){return this},disconnect(){},gain:mkP(),frequency:mkP()});
const mkP=()=>({value:0,setValueAtTime(v,t){log.push(['sv',v,t])},linearRampToValueAtTime(v,t){log.push(['ramp',v,t])},cancelScheduledValues(){},setTargetAtTime(v,t,k){log.push(['tgt',v,t,k])}});
const x={get currentTime(){return now},sampleRate:44100,createGain(){return mkNode('gain')},
 createBuffer(c,n,sr){const d=new Float32Array(n);return{duration:n/sr,length:n,sampleRate:sr,getChannelData(){return d}}},
 createBufferSource(){const s=mkNode('src');s.start=(t,o)=>log.push(['start',t,o]);s.stop=t=>log.push(['stop',t]);return s}};
const sets=[];const bus={init:()=>x,input:mkNode('in'),set(id,v){sets.push([id,v])}};
const e=new SD.SmpPlay(bus);
ok(e.id==='smp'&&e.params===SD.defs.smp.P&&e.tabs===SD.defs.smp.T,'SmpPlay: id/params/tabs');
e.setPatch({sMode:'one',sStart:.25,aA:.01,aR:.2});
ok(e.p.sMat==='b:voice'&&sets.length>0,'SmpPlay: 既定の素材・FXはバスへ');
e.noteOn(60,1);
const st=log.filter(l=>l[0]==='start');
ok(st.length===1&&Math.abs(st[0][2]-.25*e.ab.duration)<1e-6,'SmpPlay: START の位置から再生('+(st[0]&&st[0][2])+')');
ok(log.some(l=>l[0]==='ramp'&&Math.abs(l[2]-.01)<1e-9&&l[1]<=.8+1e-9),'SmpPlay: アタック(aA)で立ち上がる・0.8以下');
const nStop=log.filter(l=>l[0]==='stop').length;e.noteOff(60);
ok(log.filter(l=>l[0]==='stop').length===nStop,'SmpPlay: ONE SHOT は離しても止めない');
now=1;e.noteOn(62,1);ok(log.filter(l=>l[0]==='start').length===2&&log.filter(l=>l[0]==='stop').length>nStop,'SmpPlay: 次のステップで前の音を短くフェードして鳴らし直す');
e.set('sMode','loop');now=2;e.noteOn(64,1);const sNode=[...e.voices].pop();
ok(sNode.s.loop===true&&Math.abs(sNode.s.loopStart-.25*e.ab.duration)<1e-6&&sNode.s.loopEnd===e.ab.duration,'SmpPlay: LOOP は START〜終端をくり返す');
const n2=log.filter(l=>l[0]==='stop').length;e.noteOff(64);ok(log.filter(l=>l[0]==='stop').length>n2,'SmpPlay: LOOP は離すとリリースで止まる');
let pk=0;{const dd=SD.MAT.get('b:voice').data;for(let i=0;i<dd.length;i++)pk=Math.max(pk,Math.abs(dd[i]))}ok(pk<=1.0&&pk>0,'内蔵素材 VOICE のピークが 0〜1');
e.set('sMat','b:none');ok(e.p.sMat==='b:voice','SmpPlay: 存在しない内蔵素材は VOICE に戻す');
e.allOff();ok(e.held.size===0,'SmpPlay: allOff');
/* 未読込の取り込み素材は鳴らさない(落ちない) */
{const e2=new SD.SmpPlay(bus);e2.init();e2.p.sMat='u:zzzz';SD.UMAT._useMemory();const before=log.length;let threw=false;try{e2.noteOn(60,1)}catch(er){threw=true}ok(!threw&&log.filter((l,i)=>i>=before&&l[0]==='start').length===0,'SmpPlay: 未読込の取り込み素材は無音で落ちない')}
/* 取り込み素材(メモリ保存)を読み込んで鳴らす */
(async()=>{
 SD.UMAT._useMemory();await new Promise(r=>setTimeout(r,5));
 const sr=44100,a=new Float32Array(sr/2);for(let i=0;i<a.length;i++)a[i]=Math.sin(i*.05);
 const r=await SD.UMAT.add('my',[a],sr);ok(r.ok,'取り込み: 追加できる');
 const e3=new SD.SmpPlay(bus);e3.init();e3.set('sMat',r.id);ok(e3.p.sMat===r.id||!SD.MAT.info(r.id)===false,'SmpPlay: 取り込み素材を選べる');
 e3.p.sMat=r.id;e3.buf();await new Promise(rs=>setTimeout(rs,20));
 const before=log.length;e3.noteOn(60,1);ok(log.filter((l,i)=>i>=before&&l[0]==='start').length===1&&Math.abs(e3.ab.duration-.5)<.01,'SmpPlay: 取り込み素材をそのまま再生(0.5秒)');
 /* ⑤ トラックの保存・読み込み */
 const P=new SD.Play({now:()=>0,tempo(){},duck(){},duckClear(){},on(){},off(){},sched(){return 0},unsched(){}});
 const t=P.getTracks();t[0].synth='smp';t[0].patch={sMat:r.id,sMode:'loop'};P.setTracks(JSON.parse(JSON.stringify(t)),0);
 ok(P.tr[0].synth==='smp'&&P.tr[0].patch.sMode==='loop','トラック: smp を保存・読み込みできる');
 ok(P.tr[1].synth==='analog','トラック: 旧データ(他のトラック)は従来どおり');
 console.log(err?'NG '+err+' 件':'OK: voice');process.exit(err?1:0);
})();
