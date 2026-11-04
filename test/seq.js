// 演奏エンジン(ARP/SEQ)テスト: node test/seq.js  偽の時計・偽のスケジューラで決定的に検証
const fs=require('fs'),path=require('path'),vm=require('vm');
const ctx={console,setInterval,clearInterval};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext('var SD={};',ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','www','js','mixdefs.js'),'utf8'),ctx,{filename:'mixdefs.js'});
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','www','js','seq.js'),'utf8'),ctx,{filename:'seq.js'});
const SD=ctx.SD;let err=0;const ok=(c,m)=>{if(!c){console.error('NG: '+m);err++}};
// ---- スケール ----
ok(SD.snap(61,0,'major')===60,'C#→C(メジャー,近い方の下)');ok(SD.snap(60,0,'minor')===60,'C はそのまま');
ok(SD.snap(64,0,'minor')===63,'E→Eb(マイナー)');ok(SD.stepScale(60,1,0,'major')===62,'C→D');ok(SD.stepScale(60,-1,0,'minor')===58,'C→Bb(マイナー下)');
ok(SD.noteName(48)==='C3'&&SD.noteName(61)==='C#4','音名(鍵盤表示と同じC3=48)');
// ---- 偽io ----
function mk(){
 const f={t:0,q:[],log:[]};
 const io={now:()=>f.t,on:(m,v,fr)=>f.log.push({t:f.t,k:'on',m,v,fr}),off:m=>f.log.push({t:f.t,k:'off',m}),
  sched:(fn,t)=>{const e={t,fn,id:Math.random()};f.q.push(e);return e},unsched:e=>{f.q=f.q.filter(x=>x!==e)}};
 f.p=new SD.Play(io);
 f.run=(to)=>{ // 25msごとにtick、予約時刻が来たら実行
  while(f.t<=to+1e-9){f.p.tick();
   const due=f.q.filter(e=>e.t<=f.t+1e-9).sort((a,b)=>a.t-b.t);f.q=f.q.filter(e=>due.indexOf(e)<0);due.forEach(e=>{f.t=Math.max(f.t,e.t);e.fn()});
   f.t=Math.round((f.t+.025)*1e6)/1e6}};
 return f}
// ---- ARP ----
{const f=mk(),p=f.p;p.setBpm(120);p.setMode('arp');p.a.rate=3;p.a.mode='up';p.a.oct=2;
 [60,64,67].forEach(m=>p.arpDown(m));
 ok(JSON.stringify(p.arpList())===JSON.stringify([60,64,67,72,76,79]),'UP 2oct: '+p.arpList());
 p.a.mode='down';ok(p.arpList()[0]===79,'DOWN');p.a.mode='ud';ok(p.arpList().join()==='60,64,67,72,76,79,76,72,67,64','UP-DOWN '+p.arpList());
 p.a.mode='ord';p.notes=[67,60,64];p.a.oct=1;ok(p.arpList().join()==='67,60,64','押した順');
 p.notes=[60,64,67];p.a.mode='up';p.a.oct=1;p.a.gate=.5;
 f.run(2);
 const ons=f.log.filter(x=>x.k==='on');
 // 120BPM 1/16 = 0.125s → 約2秒で15〜16音
 ok(ons.length>=15&&ons.length<=17,'ARP音数 '+ons.length);
 ok(ons.slice(0,4).map(x=>x.m).join()==='60,64,67,60','ARP順序 '+ons.slice(0,4).map(x=>x.m));
 const gaps=ons.slice(1).map((x,i)=>x.t-ons[i].t),mx=Math.max(...gaps),mn=Math.min(...gaps);
 ok(mx-mn<=.03,'ARP間隔が安定 '+mn+'〜'+mx); // 25ms刻みのtickなのでtick粒度ぶん
 // 鍵盤を離すと止まる
 const n0=ons.length;[60,64,67].forEach(m=>p.arpUp(m));f.run(f.t+1);
 ok(f.log.filter(x=>x.k==='on').length<=n0+1,'離したら止まる');
 // HOLD
 const g=mk(),q=g.p;q.setMode('arp');q.setHold(true);q.arpDown(60);q.arpUp(60);ok(q.notes.length===1,'HOLDで残る');
 q.arpDown(62);ok(q.notes.join()==='62','HOLDで新しい和音に入れ替え');q.arpDown(65);ok(q.notes.join()==='62,65','同時押しは追加');
 q.arpUp(62);q.arpUp(65);q.setHold(false);ok(q.notes.length===0,'HOLD解除で消える');
 // レート
 const h=mk(),r=h.p;r.setBpm(120);r.setMode('arp');r.a.rate=0;r.arpDown(60);h.run(2);const o=h.log.filter(x=>x.k==='on');ok(Math.abs((o[1].t-o[0].t)-.5)<.03,'1/4=0.5s '+(o[1].t-o[0].t));
 // ゲート
 const i=mk(),s=i.p;s.setBpm(120);s.setMode('arp');s.a.rate=1;s.a.gate=.5;s.arpDown(60);i.run(1);const on=i.log.find(x=>x.k==='on'),of=i.log.find(x=>x.k==='off');ok(Math.abs((of.t-on.t)-.125)<.03,'ゲート50%: '+(of.t-on.t));
}
// ---- SEQ ----
{const f=mk(),p=f.p;p.setBpm(120);p.setMode('seq');p.setScale('minor',0);p.setLen(8);
 const S=p.s.steps;S[0].on=true;S[0].n=48;S[1].on=true;S[1].n=51;S[1].acc=true;S[2].on=true;S[2].n=55;S[2].sld=true;S[3].on=true;S[3].n=58;S[4].on=true;S[4].n=58;S[4].tie=true;S[6].on=true;S[6].n=60;
 ok(p.start(),'start');f.run(2.2); // 8step×0.125=1s/周
 const L=f.log.filter(x=>x.k==='on');
 ok(L.slice(0,5).map(x=>x.m).join()==='48,51,55,58,60','1周目の音 '+L.slice(0,5).map(x=>x.m));
 ok(L[1].v===1&&L[0].v<1,'アクセントは強い');
 ok(L[3].fr===55,'スライド: 次の音は直前の音から '+L[3].fr);
 ok(!L.slice(0,5).some((x,i)=>x.m===58&&i===4),'タイは再発音しない');
 // 長さ(ループ)
 ok(Math.abs((L[5].t-L[0].t)-1)<.03,'1周=1秒 '+(L[5].t-L[0].t));
 // タイ: 58は2ステップ分鳴る
 const off58=f.log.find(x=>x.k==='off'&&x.m===58);ok(off58&&Math.abs(off58.t-L[3].t-.244)<.03,'タイで音が伸びる '+(off58&&off58.t-L[3].t));
 // スイング
 const g=mk(),q=g.p;q.setBpm(120);q.setMode('seq');q.setLen(4);q.s.steps.forEach((x,i)=>{x.on=true;x.n=48});q.setSwing(.5);q.start();g.run(.6);
 const O=g.log.filter(x=>x.k==='on');ok(Math.abs((O[1].t-O[0].t)-.125*1.5)<.03,'スイング50%: 裏拍が後ろへ '+(O[1].t-O[0].t));
 // 停止で全部止まる
 p.stop();ok(f.q.length===0&&p.snd.size===0,'停止で予約と発音が消える');
}
// ---- 保存/復元・音域 ----
{const f=mk(),p=f.p;p.s.steps[3].on=true;p.s.steps[3].n=57;p.setBpm(99);p.a.gate=.4;const st=JSON.parse(JSON.stringify(p.getState())),q=mk().p;q.setState(st);
 ok(q.bpm===99&&q.s.steps[3].n===57&&q.a.gate===.4,'状態の保存/復元');
 q.setState({bpm:999,swing:5,a:{mode:'zzz',rate:99,gate:9,oct:9},p:{len:99,steps:[{n:1000}]}});ok(q.bpm===240&&q.swing===.6&&q.a.mode==='up','異常値の丸め');
 ok(q.a.gate===1&&q.s.len===32&&q.s.steps[0].n===96,'範囲外の値を丸める(len上限32)');
 const r=mk().p;r.setScale('major',0);r.s.sel=0;ok(r.enterNote(61)===60&&r.s.steps[0].on,'スケールロックで入力');}
// ---- レッスン用の値 ----
{const p=mk().p;p.setV('aMode','rnd');p.setV('aRate',4);p.setV('aOct',3);p.setV('aGate',.2);p.setV('sBpm',150);p.setV('sSwing',.25);
 ok(p.getV('aMode')==='rnd'&&p.getV('aRate')===4&&p.getV('aOct')===3&&p.getV('aGate')===.2&&p.getV('sBpm')===150&&p.getV('sSwing')===.25,'getV/setV');
 p.setPattern({len:16,scale:'minor',key:9,steps:[{on:true,n:45,acc:true},{on:true,n:45,sld:true},{on:true,n:48,tie:true},{tie:true}]});
 ok(p.count('sOn')===3&&p.count('sAcc')===1&&p.count('sSld')===1&&p.count('sTie')===1,'カウンタ '+[p.count('sOn'),p.count('sAcc'),p.count('sSld'),p.count('sTie')]);
 p.setLen(2);ok(p.count('sOn')===2,'長さ外は数えない');}

// ---- マルチトラック(TRK) ----
function mk2(){
 const f={t:0,q:[],log:[]};
 const io={now:()=>f.t,on:(m,v,fr,k)=>f.log.push({t:f.t,k:'on',m,v,fr,trk:k}),off:(m,k)=>f.log.push({t:f.t,k:'off',m,trk:k}),
  sched:(fn,t)=>{const e={t,fn,id:Math.random()};f.q.push(e);return e},unsched:e=>{f.q=f.q.filter(x=>x!==e)}};
 f.p=new SD.Play(io);
 f.run=(to)=>{while(f.t<=to+1e-9){f.p.tick();const due=f.q.filter(e=>e.t<=f.t+1e-9).sort((a,b)=>a.t-b.t);f.q=f.q.filter(e=>due.indexOf(e)<0);due.forEach(e=>{f.t=Math.max(f.t,e.t);e.fn()});f.t=Math.round((f.t+.025)*1e6)/1e6}};
 return f}
{const f=mk2(),p=f.p;p.setBpm(120);p.setMode('trk');
 ok(p.start(),'TRKで再生開始');p.stop();
 // T1: 0,4,8,12 に C3 / T2: 4,12 に D3 / T3: 長さ3
 const set=(k,idx,n)=>idx.forEach(i=>{p.tr[k].steps[i].on=true;p.tr[k].steps[i].n=n});
 p.setScale('chrom',0);p.setTrackSel(1);p.setScale('chrom',0);p.setTrackSel(2);p.setScale('chrom',0);
 set(0,[0,4,8,12],48);set(1,[4,12],50);p.tr[2].len=3;set(2,[0],60);
 p.start();f.run(2.05);
 const on=k=>f.log.filter(x=>x.k==='on'&&x.trk===k);
 // 120BPM 1/16=0.125s → 16ステップ=2s。約1周ぶん(T1は4音,T2は2音)
 ok(on(0).length>=4&&on(0).length<=5,'T1の音数 '+on(0).length);ok(on(1).length>=2&&on(1).length<=3,'T2の音数 '+on(1).length);
 ok(on(0).every(x=>x.m===48)&&on(1).every(x=>x.m===50),'トラックごとの音程');
 // T3は3ステップ周期(0.375s)で約5〜6音 → 長さの違うポリリズム
 ok(on(2).length>=5&&on(2).length<=7,'T3(len3)の音数 '+on(2).length);
 const g0=on(2).map(x=>x.t);ok(Math.abs((g0[1]-g0[0])-.375)<.03,'T3の周期 '+(g0[1]-g0[0]));
 // ミュート・ソロ
 p.tr[0].mute=true;f.run(f.t+.3);f.log.length=0;f.run(f.t+1);ok(on(0).length===0&&on(1).length>0,'ミュート');
 p.tr[0].mute=false;p.tr[1].solo=true;f.run(f.t+.3);f.log.length=0;f.run(f.t+1);ok(on(0).length===0&&on(2).length===0&&on(1).length>0,'ソロ');
 p.tr[1].solo=false;
 // 停止でトラック指定のoffが出る
 f.log.length=0;p.tr[0].steps[0].on=true;f.run(f.t+.5);const live=p.snd.size;p.stop();
 ok(f.log.filter(x=>x.k==='off').every(x=>x.trk!==undefined)||live===0,'stopでトラック付きoff');
 ok(p.snd.size===0,'停止後に鳴りっぱなしが無い');
 // 編集対象の切り替え(cs)
 p.setTrackSel(1);ok(p.cs()===p.tr[1],'TRKのcsは選択トラック');p.tr[1].sel=5;p.enterNote(62);ok(p.tr[1].steps[5].on&&p.tr[1].steps[5].n===62,'選択ステップへ音程入力');
 p.setLen(8);ok(p.tr[1].len===8&&p.s.len===16,'LENは選択トラックだけ');
 p.setMode('seq');ok(p.cs()===p.s,'SEQのcsは従来のパターン');
 // 保存・復元
 const st=JSON.parse(JSON.stringify(p.getState()));const q=mk2().p;q.setState(st);
 ok(q.tr[0].steps[4].on&&q.tr[1].len===8&&q.tr[2].len===3&&q.ts===1,'getState/setStateでトラックが復元');
 q.setTracks([{name:'あ'.repeat(20),synth:'xxx',steps:[{n:999}],len:99,scale:'zzz'}],7);
 ok(q.tr[0].synth==='analog'&&q.tr[0].len===32&&q.tr[0].name.length<=8&&q.tr[0].steps[0].n===96&&q.tr[0].scale==='minor'&&q.ts===7,'setTracksの値の丸め(8本: ts 7)');
}
{ // スライド・タイは従来どおりトラックでも動く
 const f=mk2(),p=f.p;p.setBpm(120);p.setMode('trk');p.setScale('chrom',0);const x=p.tr[0];
 x.steps[0]={on:true,n:48,acc:false,sld:true,tie:false};x.steps[1]={on:true,n:52,acc:false,sld:false,tie:false};
 p.start();f.run(.5);const o=f.log.filter(y=>y.k==='on'&&y.trk===0);ok(o.length>=2&&o[1].fr===48,'トラックでスライド(fromが渡る)');}
// ---- v5.1: 和音ステップ・6トラック・旧データ互換 ----
{
 ok(SD.MAXT===8,'MAXT=8(v7.0a。v5.1の6本・v3の4本の旧データも読める)');
 ok(SD.chordNotes(48,'maj',0).join()==='48,52,55'&&SD.chordNotes(48,'min',0).join()==='48,51,55','メジャー/マイナーの音');
 ok(SD.chordNotes(48,'maj',1).join()==='52,55,60'&&SD.chordNotes(48,'maj',2).join()==='55,60,64','転回');
 ok(SD.chordNotes(48,'7',0).length===4&&SD.chordNotes(48,'add9',0).join()==='48,52,55,62','4音まで');
 ok(SD.CHORDS.every(c=>c.iv.length>=3&&c.iv.length<=4),'和音は3〜4音');
 ok(SD.chordNotes(96,'maj',0).every(m=>m>=SD.NMIN&&m<=SD.NMAX)&&SD.chordNotes(24,'maj',2).every(m=>m>=SD.NMIN&&m<=SD.NMAX),'範囲内に収める');
 ok(SD.chordNotes(60,'min',1).join()===SD.chordNotes(60,'min',1).join(),'決定的');
 ok(SD.chordName(57,'min',0)==='Am'&&SD.chordName(48,'maj7',0)==='CM7','和音名');
 // 発音: 同じステップで同時に note-on
 const f=mk(),p=f.p;p.setBpm(120);p.setMode('seq');p.setScale('chrom',0);p.setLen(4);
 p.s.sel=0;p.enterNote(48);p.setChord('maj',0);p.s.sel=2;p.enterNote(53);
 ok(p.s.steps[0].ch.join()==='48,52,55'&&!p.s.steps[2].ch,'setChord は選択ステップだけ');
 p.start();f.run(1.2);
 const on=f.log.filter(x=>x.k==='on');
 ok(on.slice(0,3).map(x=>x.m).join()==='48,52,55'&&on[0].t===on[1].t&&on[1].t===on[2].t,'和音は同時に鳴る '+on.slice(0,4).map(x=>x.m+'@'+x.t));
 ok(on[3].m===53,'単音ステップは従来どおり');
 const offs=f.log.filter(x=>x.k==='off').slice(0,3).map(x=>x.m).sort().join();ok(offs==='48,52,55','和音は全部止まる '+offs);
 // 和音ステップの音程入力・♪は和音ごと動く
 const g=mk(),q=g.p;q.setMode('seq');q.setScale('chrom',0);q.s.sel=0;q.enterNote(48);q.setChord('min',0);q.enterNote(50);
 ok(q.s.steps[0].ch.join()==='50,53,57','和音ステップに音程入力→和音ごと移調 '+q.s.steps[0].ch);
 q.nudge(1);ok(q.s.steps[0].ch.join()==='51,54,58','♪▲も和音ごと');q.clearChord();ok(!q.s.steps[0].ch&&!q.s.steps[0].cd,'単音に戻す');
 // 保存・復元(ch・cd を含む)/旧データ(ch無し)/不正値
 const h=mk(),r=h.p;r.setMode('trk');r.setTrackSel(5);r.cs().sel=1;r.enterNote(55);r.setChord('sus4',1);
 const st=JSON.parse(JSON.stringify(r.getState())),r2=mk().p;r2.setState(st);
 ok(r2.tr[5].steps[1].ch.join()===r.tr[5].steps[1].ch.join()&&r2.tr[5].steps[1].cd.t==='sus4'&&r2.tr[5].steps[1].cd.i===1,'6本目の和音が保存・復元される');
 ok(r2.tr.length===8,'トラックは8本');
 const old=mk().p;old.tr[4].steps[0].on=true;old.tr[5].name='XX';
 old.setTracks([{name:'旧1',steps:[{on:true,n:60}]},{name:'旧2'},{name:'旧3'},{name:'旧4'}],0); // 旧データ(4本・ch無し)
 ok(old.tr[0].name==='旧1'&&old.tr[0].steps[0].on&&old.tr[0].steps[0].ch===undefined,'旧4本データを読める(ch無しは従来どおり)');
 ok(old.tr[4].name==='T5'&&!old.tr[4].steps[0].on&&old.tr[5].name==='T6','旧データ読込で5・6本目は初期状態');
 const bad=SD.cleanStep({on:1,n:50,ch:[50,50,300,-1,'x',52,55,57,59,61],cd:{t:'zzz',i:9}});
 ok(bad.ch.length<=4&&bad.ch.every(m=>m>=SD.NMIN&&m<=SD.NMAX)&&!bad.cd,'不正な ch は丸める '+JSON.stringify(bad));
 ok(SD.cleanStep({on:1,n:50,ch:[50]}).ch===undefined,'1音だけの ch は単音扱い');
 // 6本同時再生(NaN・例外なし)
 const k=mk(),w=k.p;w.setBpm(140);w.setMode('trk');let nan=0;
 w.tr.forEach((x,i)=>{x.steps[0].on=true;x.steps[0].n=48+i;if(i%2)x.steps[4].on=true});w.setTrackSel(2);w.cs().sel=0;w.setChord('7',0);
 w.start();k.run(2);const al=k.log.filter(x=>x.k==='on');al.forEach(x=>{if(!isFinite(x.m)||!isFinite(x.t))nan++});
 ok(nan===0&&al.length>=6,'6本同時再生 '+al.length);
 ok(al.some(x=>x.m===60)||al.length>=9,'和音込みの6本再生');
 // 旧データの SEQ パターン(ch無し)
 const pp=mk().p;pp.setPattern({len:8,scale:'minor',key:0,steps:[{on:true,n:48},{on:true,n:51,acc:true}]});
 ok(pp.pattern().steps[0].ch===undefined&&pp.pattern().steps[1].acc===true,'旧パターンは従来どおり');
 // DUCK の SRC は6本まで
 ok(SD.MIXP.find(p=>p.id==='dkSrc').max===7&&SD.mixClean({dkSrc:7}).dkSrc===7&&SD.mixClean({dkSrc:5}).dkSrc===5&&SD.mixClean({dkSrc:9}).dkSrc===7,'dkSrc が8本まで選べる(旧データの T1〜T6 はそのまま)');
}

// ---- v7.0a: 8本・旧データ(4本・6本・インサート無し)の読み込み ----
{
 const p=mk2().p,mkT=(n,steps)=>({name:'t'+n,synth:'analog',steps:steps||[],len:16});
 // 8本目の保存・復元
 p.setMode('trk');p.setTrackSel(7);p.cs().sel=2;p.enterNote(60);p.tr[7].mix.iEqOn=1;p.tr[7].mix.iEqHg=6;p.tr[7].mix.iCpOn=1;p.tr[7].mix.iOrd=1;
 const st=JSON.parse(JSON.stringify(p.getState())),q=mk2().p;q.setState(st);
 ok(q.tr.length===8&&q.tr[7].steps[2].on&&q.tr[7].steps[2].n===60,'8本目のパターンが保存・復元される');
 ok(q.tr[7].mix.iEqOn===1&&q.tr[7].mix.iEqHg===6&&q.tr[7].mix.iCpOn===1&&q.tr[7].mix.iOrd===1,'インサートの値が保存・復元される');
 ok(q.tr[0].mix.iEqOn===0&&q.tr[0].mix.iCpOn===0&&q.tr[0].mix.iGtOn===0&&q.tr[0].mix.iSaOn===0&&q.tr[0].mix.iMdOn===0,'新規トラックのインサートは全OFF');
 // 旧データ: 4本・6本(mixはインサート項目なし)→ 残りは新規トラック、インサートは既定(全OFF)
 [4,6].forEach(n=>{const old=Array.from({length:n},(_,k)=>Object.assign(mkT(k),{mix:{tVol:.5,tPan:.2,dkOn:1,dkSrc:Math.min(k,5)}})),r=mk2().p;r.setTracks(old,0);
  ok(r.tr.length===8&&r.tr[n-1].mix.tVol===.5&&r.tr[n-1].mix.dkOn===1&&r.tr[n].mix.tVol===1,n+'本の旧データを読める(残りは新規トラック)');
  ok(r.tr.every(x=>x.mix.iEqOn===0&&x.mix.iCpOn===0&&x.mix.iGtOn===0&&x.mix.iSaOn===0&&x.mix.iMdOn===0),n+'本の旧データのインサートは全OFF');
  ok(JSON.stringify(SD.mixClean(old[0].mix))===JSON.stringify(Object.assign(SD.MIXDEF(),{tVol:.5,tPan:.2,dkOn:1,dkSrc:0})),n+'本の旧mixは既定値で補われる')});
 // 不正値は丸める・範囲外のIDは捨てる
 const m=SD.mixClean({iEqHg:99,iCpMix:-3,iCpModel:9,iOrd:5,iEqB1f:1,zzz:1});
 ok(m.iEqHg===15&&m.iCpMix===0&&m.iCpModel===3&&m.iOrd===1&&m.iEqB1f===80&&m.zzz===undefined,'インサートの不正値を丸める');
 // レッスン tk の mx → mix
 const mx=SD.mxToMix({eq:{iEqOn:1,iEqHg:3},cp:{iCpOn:1,bad:1},zz:5});
 ok(mx.iEqOn===1&&mx.iEqHg===3&&mx.iCpOn===1&&mx.bad===undefined,'tk の mx:{eq:{…}} を mix に直す');
 // 8本同時に鳴らす
 const f=mk2(),pp=f.p;pp.setBpm(120);pp.setMode('trk');for(let k=0;k<8;k++){pp.tr[k].steps[0]={on:true,n:48+k,acc:false,sld:false,tie:false}}
 pp.start();f.run(.3);const ks=new Set(f.log.filter(y=>y.k==='on').map(y=>y.trk));ok(ks.size===8,'8本同時に鳴る '+[...ks].join());
}

console.log(err?('失敗 '+err+'件'):'OK: 演奏エンジン(マルチトラック含む)');process.exit(err?1:0);
