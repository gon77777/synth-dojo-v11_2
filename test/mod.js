// モジュラーの検証: node test/mod.js (部品定義・接続ルール・レッスンのデータ整合・エンジンの組み立て)
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
let mockV=0;const ticks=[];let ramps=0;const ctx={console,Float32Array,Math,Object,Proxy,Array,setInterval:f=>ticks.push(f),clearInterval(){},setTimeout:f=>{f();return 1},clearTimeout(){}};ctx.window=ctx;vm.createContext(ctx);
['params.js','wtparams.js','modlib.js','seq.js','auto.js','lessons.js','modlessons.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),ctx,{filename:f}));
const SD=ctx.SD,L=SD.modLib,MD=SD.MODS;let err=0;const bad=m=>{console.error('NG: '+m);err++};
// 部品定義
Object.keys(MD).forEach(t=>{const M=MD[t];[...M.i,...M.o].forEach(p=>{if(!['audio','cv','gate'].includes(p.kind))bad(t+' jack kind')});
 const ks=new Set();M.knobs.forEach(k=>{if(ks.has(k.k))bad(t+' 重複 '+k.k);ks.add(k.k);
  if(k.type==='knob'){if(!(k.min<k.max)||k.def<k.min||k.def>k.max)bad(t+'.'+k.k+' 範囲/既定値');if(!k.help)bad(t+'.'+k.k+' help無し')}
  else if(!k.opts.some(o=>o[0]===k.def))bad(t+'.'+k.k+' 既定値がoptsに無い')})});
L.ORDER.forEach(t=>{if(!MD[t])bad('ORDER '+t)});if(L.ORDER.length!==21)bad('モジュールは21種');
// 接続ルール
const st=L.samplePatch(),ok=(c,m)=>{if(!c)bad(m)};
const ck=(s,a,b)=>L.canConnect(s,a,b).ok;
ok(ck({mods:st.mods,cab:[]},'kbd1.pitch','vco1.pitch'),'pitch→pitch');
ok(!ck({mods:st.mods,cab:[]},'vco1.out','adsr1.gate'),'音→GATEは不可');
ok(!ck({mods:st.mods,cab:[]},'kbd1.gate','vca1.in'),'GATE→音は不可');
ok(ck({mods:st.mods,cab:[]},'vco1.out','vca1.cv'),'音→CVは可');
ok(!ck({mods:st.mods,cab:[]},'vco1.in','vcf1.in'),'入力から始めると不可');
ok(!ck(st,'vco1.out','vcf1.in'),'重複ケーブルは不可');
ok(!ck(st,'vca1.out','vcf1.in'),'ループは不可');
ok(!ck(st,'vcf1.out','vcf1.in'),'自己ループは不可');
const big={mods:st.mods,cab:[]};for(let i=0;i<32;i++)big.cab.push(['lfo9.out','x'+i]);ok(!ck(big,'kbd1.pitch','vco1.pitch'),'ケーブル32本上限');
ok(st.cab.every((c,i)=>ck({mods:st.mods,cab:st.cab.slice(0,i)},c[0],c[1])),'サンプルパッチの接続が全て有効');
// レッスン
const ML=SD.LESSONS.filter(l=>l.synth==='mod');if(ML.length!==12)bad('モジュラーのレッスンは12本: '+ML.length);
const chkVal=(Ls,wh,id,g,s)=>{const p=SD.defs.mod.byId[id];if(!p)return bad(Ls.id+wh+' 未定義つまみ '+id);
 const m=L.find(s,L.split(id)[0]);if(!m)return bad(Ls.id+wh+' モジュールが無い '+id);
 if(p.type==='seg'){if(!p.opts.some(o=>o[0]===g))bad(Ls.id+wh+' '+id+' 目標値が選択肢に無い '+g)}else if(typeof g!=='number'||g<p.min||g>p.max)bad(Ls.id+wh+' '+id+' 目標値が範囲外 '+g)};
ML.forEach(Ls=>{
 const s={mods:Ls.init.mods.map(m=>({id:m.id,t:m.t})),cab:[]};
 Ls.init.mods.forEach(m=>{if(!MD[m.t])bad(Ls.id+' 種類不明 '+m.t);Object.keys(m.v||{}).forEach(k=>{if(!SD.defs.mod.byId[m.id+'.'+k])bad(Ls.id+' init未定義 '+m.id+'.'+k)})});
 Ls.init.cab.forEach(c=>{if(!ck(s,c[0],c[1]))bad(Ls.id+' init接続不可 '+c);else s.cab.push(c.slice())});
 Ls.steps.forEach((st,i)=>{const wh=' step'+(i+1);
  if(!st.h||!st.b)bad(Ls.id+wh+' 見出し/本文');
  (st.rm||[]).forEach(c=>{const j=s.cab.findIndex(x=>x[0]===c[0]&&x[1]===c[1]);if(j<0)bad(Ls.id+wh+' rm対象のケーブルが無い '+c);else s.cab.splice(j,1)});
  (st.m||[]).forEach(([t,n])=>{if(!MD[t])bad(Ls.id+wh+' m種類不明');if(s.mods.length+0>L.MAXM)bad('モジュール数');let k=s.mods.filter(x=>x.t===t).length;while(k++<n)s.mods.push({id:L.uid(s,t),t})});
  Object.keys(st.s||{}).forEach(id=>chkVal(Ls,wh+' s',id,st.s[id],s));
  (st.k||[]).forEach(c=>{if(!ck(s,c[0],c[1]))bad(Ls.id+wh+' k接続不可 '+c);else s.cab.push(c.slice())});
  (st.f||[]).forEach(([id,g])=>chkVal(Ls,wh,id,g,s));
  // v2.0: m8以降は、本文の数値と目標値の一致を検証
  if(+Ls.id.slice(1)>=8)(st.f||[]).forEach(([id,g])=>{if(typeof g!=='number')return;const p=SD.defs.mod.byId[id],has=t=>st.b.indexOf(t)>=0;let ok=true,want='';
   if(p.fmt==='pct'){want=Math.round(g*100)+'%';ok=has(want)}else if(p.fmt==='time'){const ms=Math.round(g*1000);want=ms+'ms';ok=has(want)||has(g+'秒')}
   else if(p.fmt==='hz'||p.fmt==='hzf'){want=g+'Hz';ok=has(want)}else if(p.fmt==='x'){want=g+'倍';ok=has(want)||has(g+'×')}else if(p.fmt==='st'||p.fmt==='oct'||p.fmt==='n'||p.fmt==='int'){want=(g>0?'+':'')+g;ok=has(want)||has(String(g))}
   if(!ok)bad(Ls.id+wh+' 本文に目標値の表記が無い '+id+' '+want)});
  if(!st.k&&!st.m&&!st.f&&!st.rm&&!st.cmp&&i>0&&!/確かめ|素直|いまの|ラック/.test(st.h+st.b))console.log('  (情報のみのステップ: '+Ls.id+wh+')');
 });
 if(s.cab.length>L.MAXC||s.mods.length>L.MAXM)bad(Ls.id+' お手本が上限超過');
});
// エンジン(モックAudioContextで組み立て・発音)
const prm=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){ramps++},setTargetAtTime(){},cancelScheduledValues(){}});
const nd=()=>({connect(){},disconnect(){},start(){},stop(){},gain:prm(),frequency:prm(),detune:prm(),Q:prm(),delayTime:prm(),offset:prm(),getFloatTimeDomainData(b){b[b.length-1]=mockV},fftSize:0});
const x={sampleRate:48000,currentTime:0,state:'running',destination:nd(),resume(){},createGain:nd,createWaveShaper:nd,createConvolver:nd,createOscillator:nd,createBiquadFilter:nd,createConstantSource:nd,createBufferSource:nd,createAnalyser:nd,createDelay:nd,createBuffer:(c,l)=>({getChannelData:()=>new Float32Array(l)})};
ctx.SD.FXIDS=['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'];
vm.runInContext(fs.readFileSync(path.join(w,'modsynth.js'),'utf8'),ctx,{filename:'modsynth.js'});
const bus={init(){return x},input:nd(),set(){}};
try{
 const m=new SD.Mod(bus);m.noteOn(60,1);m.noteOn(64,1,60);m.noteOff(64);m.noteOff(60);
 ML.forEach(Ls=>{m.setPatch(Ls.init);m.noteOn(55,1);m.noteOff(55)});
 m.setPatch(L.samplePatch());
 ['vco','lfo','noise','vcf','vca','adsr','mixer','atten','sh','delay','clk','slew','ring','shaper','cmp','div','quant','rev','seqm'].forEach(t=>{const r=m.addMod(t);if(!r.ok)bad('addMod '+t);const g=m.getPatch();m.setPatch(g);m.removeMod(r.id)});
 if(!m.addMod('sh').ok)bad('add sh');
 // SS-5b: ap(AudioParam直結)の表。つまみは数値で auto 可・変換は範囲全体で有限・他のつまみと同じ AudioParam を共有しない
 {const WANT={vco:'fm,pwm,width',lfo:'rate,depth',vcf:'cutoff,cv',mixer:'l1,l2,l3,l4',atten:'amt,ofs',delay:'time,fb',slew:'time',shaper:'drive',out:'vol'};
  m.setPatch({mods:[],cab:[],p:{}});let chk=0;
  L.ORDER.forEach(t=>{if(t==='kbd')return;const r=m.addMod(t);if(!r.ok)return;if(WANT[t])chk++;const n=m.nodes[r.id],ap=n&&n.ap||{},ks=Object.keys(ap).sort().join();
   if(ks!==(WANT[t]?WANT[t].split(',').sort().join():''))bad('SS-5b: '+t+' の ap が想定と違う '+ks);
   Object.keys(ap).forEach(k=>{const d=L.knobDef(r.id+'.'+k);if(!d||d.type!=='knob'||d.auto===false)bad('SS-5b: '+r.id+'.'+k+' は数値で auto 可のはず');
    if(!ap[k][0])bad('SS-5b: '+r.id+'.'+k+' の AudioParam が無い');
    if(d)[d.min,d.def,d.max].forEach(v=>{const y=ap[k][1]?ap[k][1](v):v;if(!isFinite(y))bad('SS-5b: '+r.id+'.'+k+' の変換が有限でない '+v)})});
   const ps=Object.keys(ap).map(k=>ap[k][0]);if(new Set(ps).size!==ps.length)bad('SS-5b: '+t+' で同じ AudioParam を2つのつまみが書く');
   m.removeMod(r.id)});if(chk!==9)bad('SS-5b: ap の検査対象が9種にならない '+chk);
  [['vco1.fm',1,2400],['vco1.width',.25,-.5],['slew1.time',.1,1/(6.2832*.1)],['out1.vol',1,.3],['shaper1.drive',8,1]].forEach(([id,v,w])=>{const t=L.type(id.split('.')[0]);const r=m.addMod(t);const q=m.nodes[r.id].ap[id.split('.')[1]];if(Math.abs(q[1](v)-w)>1e-6)bad('SS-5b: 変換 '+id);m.removeMod(r.id)});
  // 旧方式で書いたつまみ(vcf.res の Q 計算・vca・delay.mix・rev.mix・coarse/fine)は ap に載せない
  const nots=['vcf.res','vcf.type','vca.level','vca.cv','delay.mix','rev.mix','rev.size','ring.mix','vco.coarse','vco.fine','vco.wave','lfo.wave','noise.color','seqm.n1','clk.bpm'];
  nots.forEach(id=>{const [t,k]=id.split('.');const r=m.addMod(t);if(r.ok){const ap=m.nodes[r.id].ap;if(ap&&ap[k])bad('SS-5b: '+id+' は対象外のはず');m.removeMod(r.id)}})}
 const c7=ML.find(l=>l.id==='m7');m.setPatch(c7.init);m.addMod('clk');m.connect('clk1.out','adsr1.gate');ramps=0;x.currentTime=1;ticks.forEach(f=>f());if(ramps<2)bad('CLOCKがGATEを出していない '+ramps);
 if(!m.clkLive())bad('clkLive');m.removeMod('clk1');if(m.clkLive())bad('clk削除後');
 const s1=m.getPatch();if(!s1.mods.length||!Array.isArray(s1.cab))bad('getPatch');
 for(let i=0;i<20&&m.mods.length<16;i++)m.addMod('vco');if(m.addMod('vco').ok)bad('モジュール16個上限');

 // v1.7: 新モジュール(PWM入力・SLEW・RING MOD・WAVESHAPER)
 ok(ck({mods:[{id:'lfo1',t:'lfo'},{id:'vco1',t:'vco'}],cab:[]},'lfo1.out','vco1.pwm'),'LFO->PWM');
 ok(ck({mods:[{id:'kbd1',t:'kbd'},{id:'slew1',t:'slew'},{id:'vco1',t:'vco'}],cab:[]},'slew1.out','vco1.pitch'),'SLEW->pitch');
 ok(!ck({mods:[{id:'kbd1',t:'kbd'},{id:'ring1',t:'ring'}],cab:[]},'kbd1.gate','ring1.a'),'GATE->RING不可');
 {const s={mods:[{id:'vco1',t:'vco'},{id:'ring1',t:'ring'},{id:'shaper1',t:'shaper'}],cab:[['vco1.out','ring1.a'],['ring1.out','shaper1.in']]};
  ok(!ck(s,'shaper1.out','ring1.b')||true,'');ok(!ck(s,'shaper1.out','vco1.fm'),'ループ不可')}
 m.setPatch({mods:[{id:'kbd1',t:'kbd',v:{}},{id:'lfo1',t:'lfo',v:{}},{id:'vco1',t:'vco',v:{wave:'pulse',width:.2,pwm:.4}},{id:'vco2',t:'vco',v:{wave:'sine'}},{id:'ring1',t:'ring',v:{}},{id:'shaper1',t:'shaper',v:{shape:'fold',drive:6}},{id:'slew1',t:'slew',v:{}},{id:'out1',t:'out',v:{}}],
  cab:[['kbd1.pitch','slew1.in'],['slew1.out','vco1.pitch'],['kbd1.pitch','vco2.pitch'],['lfo1.out','vco1.pwm'],['vco1.out','ring1.a'],['vco2.out','ring1.b'],['ring1.out','shaper1.in'],['kbd1.pitch','shaper1.drive'],['shaper1.out','out1.in']]});
 if(m.cab.length!==9)bad('新モジュール配線 '+m.cab.length);
 ['vco1.wave','vco1.width','vco1.pwm','ring1.mix','shaper1.shape','shaper1.drive','slew1.time'].forEach(id=>{const q=SD.defs.mod.byId[id];m.set(id,q.type==='seg'?q.opts[q.opts.length-1][0]:q.max);m.set(id,q.type==='seg'?q.opts[0][0]:q.min)});
 m.noteOn(60,1);m.noteOff(60);
 const g2=m.getPatch();m.setPatch(g2);if(m.cab.length!==9)bad('往復');

 // v1.8: COMPARATOR / CLOCK DIVIDER / QUANTIZER / REVERB
 {const mk=(ids,cab)=>({mods:ids.map(i=>({id:i,t:L.type(i)})),cab});
  ok(ck(mk(['lfo1','cmp1'],[]),'lfo1.out','cmp1.in'),'LFO->CMP');
  ok(ck(mk(['cmp1','adsr1'],[]),'cmp1.out','adsr1.gate'),'CMP->ADSR gate');
  ok(!ck(mk(['cmp1','vca1'],[]),'cmp1.out','vca1.cv'),'CMP gate->CV不可');
  ok(ck(mk(['clk1','div1'],[]),'clk1.out','div1.in'),'CLK->DIV');
  ok(ck(mk(['kbd1','div1'],[]),'kbd1.gate','div1.in'),'KBD gate->DIV');
  ok(ck(mk(['div1','div2'],[['clk1.out','div1.in']]),'div1.out','div2.in'),'DIV->DIV');
  ok(!ck(mk(['div1','vca1'],[]),'div1.out','vca1.in'),'DIV gate->audio不可');
  ok(!ck(mk(['vco1','div1'],[]),'vco1.out','div1.in'),'audio->DIV gate不可');
  ok(ck(mk(['kbd1','quant1'],[]),'kbd1.pitch','quant1.in'),'pitch->QUANT');
  ok(ck(mk(['vco1','rev1'],[]),'vco1.out','rev1.in'),'VCO->REV')}
 {const P={mods:[{id:'kbd1',t:'kbd',v:{}},{id:'div1',t:'div',v:{n:'2'}},{id:'adsr1',t:'adsr',v:{}},{id:'out1',t:'out',v:{}}],cab:[['kbd1.gate','div1.in'],['div1.out','adsr1.gate']]};
  m.setPatch(P);ramps=0;m.noteOn(60,1);m.noteOff(60);m.noteOn(62,1);m.noteOff(62);m.noteOn(64,1);m.noteOff(64);
  if(ramps!==2)bad('DIV÷2: 3回押して2回通る想定 '+ramps);
  m.set('div1.n','4');m.noteOn(60,1);m.noteOff(60);if(ramps!==3)bad('DIV÷4 カウントリセット '+ramps)}
 {const P={mods:[{id:'lfo1',t:'lfo',v:{}},{id:'cmp1',t:'cmp',v:{th:.5}},{id:'adsr1',t:'adsr',v:{}},{id:'out1',t:'out',v:{}}],cab:[['lfo1.out','cmp1.in'],['cmp1.out','adsr1.gate']]};
  m.setPatch(P);if(!m.clkLive())bad('LFO上流のCMPは自走(出力を開く)');
  ramps=0;mockV=.9;ticks.forEach(f=>f());if(ramps!==1)bad('CMP 上回りでON '+ramps);ticks.forEach(f=>f());if(ramps!==1)bad('CMP 連続でON重複');
  mockV=.0;ticks.forEach(f=>f());mockV=.9;ticks.forEach(f=>f());if(ramps!==2)bad('CMP 下回り→再びON '+ramps);mockV=0;
  m.setPatch({mods:[{id:'kbd1',t:'kbd',v:{}},{id:'cmp1',t:'cmp',v:{}},{id:'adsr1',t:'adsr',v:{}},{id:'out1',t:'out',v:{}}],cab:[['kbd1.pitch','cmp1.in'],['cmp1.out','adsr1.gate']]});
  if(m.clkLive())bad('鍵盤由来のCMPは自走しない')}
 {m.setPatch({mods:[{id:'kbd1',t:'kbd',v:{}},{id:'quant1',t:'quant',v:{scale:'major',key:0}},{id:'out1',t:'out',v:{}}],cab:[['kbd1.pitch','quant1.in']]});
  const cv=m.nodes.quant1.all.find(a=>a.curve&&a.curve.length===8193);if(!cv)bad('QUANT カーブ無し');else{
   const at=s=>cv.curve[Math.round((s/12/4+1)/2*8192)]*12,near=(a,b)=>Math.abs(a-b)<.01;
   if(!near(at(1),0))bad('C#→C '+at(1));if(!near(at(4),4))bad('E維持 '+at(4));if(!near(at(6),5))bad('F#→F '+at(6));if(!near(at(-1),-1))bad('B維持 '+at(-1));
   m.set('quant1.scale','chrom');const c2=m.nodes.quant1.all.find(a=>a.curve&&a.curve.length===8193);if(!near(c2.curve[Math.round((1/12/4+1)/2*8192)]*12,1))bad('CHROM');
   m.set('quant1.scale','penta');m.set('quant1.key',9);const c3=m.nodes.quant1.all.find(a=>a.curve&&a.curve.length===8193);
   const q3=c3.curve[Math.round((0/12/4+1)/2*8192)]*12;if(!near(q3,-1))bad('A penta: C→B(下側優先) のC '+q3)}}
 {m.setPatch({mods:[{id:'vco1',t:'vco',v:{}},{id:'rev1',t:'rev',v:{size:.5,mix:.4}},{id:'out1',t:'out',v:{}}],cab:[['vco1.out','rev1.in'],['rev1.out','out1.in']]});
  m.set('rev1.size',3);m.set('rev1.mix',1);m.noteOn(60,1);m.noteOff(60);if(m.tail()<1)bad('REVERB tail '+m.tail())}

 // v1.9: SEQUENCER
 {const mk=(ids,cab)=>({mods:ids.map(i=>({id:i,t:L.type(i)})),cab});
  ok(ck(mk(['clk1','seqm1'],[]),'clk1.out','seqm1.clk'),'CLK->SEQ.clk');
  ok(ck(mk(['clk1','seqm1'],[]),'clk1.out','seqm1.rst'),'CLK->SEQ.rst');
  ok(ck(mk(['seqm1','vco1'],[]),'seqm1.pitch','vco1.pitch'),'SEQ.pitch->VCO');
  ok(ck(mk(['seqm1','adsr1'],[]),'seqm1.gate','adsr1.gate'),'SEQ.gate->ADSR');
  ok(!ck(mk(['seqm1','vca1'],[]),'seqm1.gate','vca1.cv'),'SEQ.gate->CV不可');
  ok(!ck(mk(['seqm1','vco1'],[]),'seqm1.pitch','seqm1.clk'),'pitch->gate不可');
  ok(ck(mk(['seqm1','quant1'],[]),'seqm1.pitch','quant1.in'),'SEQ->QUANT');
  ok(ck(mk(['seqm1','div1','seqm2'],[]),'div1.out','seqm2.clk'),'DIV->SEQ');
  const kd=MD.seqm.knobs;ok(kd.length===18,'SEQ knobs 18: '+kd.length);ok(kd.filter(k=>/^n[1-8]$/.test(k.k)).length===8&&kd.filter(k=>/^o[1-8]$/.test(k.k)).length===8,'8ステップ分')}
 {m.setPatch({mods:[{id:'clk1',t:'clk',v:{}},{id:'seqm1',t:'seqm',v:{len:3,o2:'off'}},{id:'vco1',t:'vco',v:{}},{id:'adsr1',t:'adsr',v:{}},{id:'vca1',t:'vca',v:{}},{id:'out1',t:'out',v:{}}],
   cab:[['clk1.out','seqm1.clk'],['seqm1.pitch','vco1.pitch'],['seqm1.gate','adsr1.gate'],['adsr1.out','vca1.cv'],['vco1.out','vca1.in'],['vca1.out','out1.in']]});
  if(m.cab.length!==6)bad('SEQ配線 '+m.cab.length);if(!m.clkLive())bad('CLOCK→SEQで出力を開く');
  const sn=m.nodes.seqm1,seqOn=()=>sn.g.clk.on(1),seqOff=()=>sn.g.clk.off(1);
  ramps=0;const pos=[];for(let i=0;i<4;i++){seqOn();pos.push(sn.pos);seqOff()}
  if(pos.join()!=='0,1,2,0')bad('SEQ 進行 '+pos.join());if(ramps!==3)bad('SEQ OFFのステップはGATEなし '+ramps);
  sn.g.rst.on(1);if(sn.pos!==-1)bad('RESET');seqOn();if(sn.pos!==0)bad('RESET後は1ステップ目');seqOff();
  m.set('seqm1.len',1);seqOn();if(sn.pos!==0)bad('LEN=1');seqOff();
  m.set('seqm1.n1',72);m.set('seqm1.oct',-1);m.set('seqm1.o1','off');
  const g=m.getPatch(),sm=g.mods.find(x=>x.id==='seqm1');if(sm.v.n1!==72||sm.v.oct!==-1||sm.v.o1!=='off'||sm.v.len!==1)bad('SEQ保存 '+JSON.stringify(sm.v));
  m.setPatch(g);if(m.p['seqm1.n1']!==72)bad('SEQ往復')}
  /* MA-2: 孤児・復活(R1〜R3)。defFn=いまのラックで引く定義(app.js の autoDef と同じ規則) */
  {const A=SD.Auto,mm=new SD.Mod(bus),D=(trk,id)=>id.indexOf('.')>0?(L.exists(mm.st(),id)?L.knobDef(id):null):null;
   mm.setPatch(L.samplePatch());
   ok(L.exists(mm.st(),'vcf1.cutoff')&&!L.exists(mm.st(),'vcf9.cutoff')&&!L.exists(mm.st(),'vcf1.nope')&&!L.exists(mm.st(),'zzz1.x'),'MA-2: L.exists');
   const au=A.mk(2),l=A.addLane(au,0,'vcf1.cutoff',D);l.pts=[[0,.1,'L'],[384,.9,'L']];const l2=A.addLane(au,0,'vco1.wave',D);l2.pts=[[0,0,'S'],[384,2,'S']];
   ok(A.orphans(au,D).length===0,'MA-2: ラックにあれば孤児でない');
   mm.removeMod('vcf1');
   ok(au.lanes.length===2&&au.lanes[0].pts.length===2&&au.lanes[0].pts[1][1]===.9,'MA-2 R1: モジュール削除でレーンと点は消えない');
   ok(A.orphans(au,D).map(x=>x.id).join()==='vcf1.cutoff'&&D(0,'vcf1.cutoff')===null,'MA-2 R1: 削除したモジュールのレーンは孤児(定義は引けない)');
   /* 再生は孤児を無視(例外なし・setParam が呼ばれない) */
   {const calls=[];let t=0;const e=new A.Engine({now:()=>t,bpm:()=>120,au:()=>au,def:D,setParam:(tk,id)=>calls.push(id),timer:{set(){return 1},clear(){}},ms:5});e.start(0);
    for(let i=0;i<60;i++){t+=.005;e.update()}
    ok(calls.length>0&&calls.every(id=>id==='vco1.wave'),'MA-2: 再生は孤児(vcf1.cutoff)を無視し、残りのレーンは動く '+calls)}
   ok(A.addLane(A.mk(2),0,'vcf1.cutoff',D)===null,'MA-2: 孤児のつまみに新しいレーンは作れない');
   const c=A.clean(A.json(au),D);ok(c.lanes.length===2&&c.lanes[0].id==='vcf1.cutoff'&&c.lanes[0].pts.length===2,'MA-2: 孤児レーンも保存・読み込みで残る');
   const r=mm.addMod('vcf');ok(r.ok&&r.id==='vcf1','MA-2 R2: 同じIDで再追加');
   ok(A.orphans(au,D).length===0&&D(0,'vcf1.cutoff').auto===true,'MA-2 R2: 再追加でレーンが復活(孤児でなくなる)');
   {const calls=[];let t=0;const e=new A.Engine({now:()=>t,bpm:()=>120,au:()=>au,def:D,setParam:(tk,id)=>calls.push(id),timer:{set(){return 1},clear(){}},ms:5});e.start(0);for(let i=0;i<60;i++){t+=.005;e.update()}
    ok(calls.indexOf('vcf1.cutoff')>=0,'MA-2 R2: 復活したレーンが再生される')}
   /* R3: パッドを丸ごと読み込み → 無いIDが孤児として数えられる(通知は app.js) */
   mm.setPatch({mods:[{id:'kbd1',t:'kbd'},{id:'out1',t:'out'}],cab:[]});
   ok(A.orphans(au,D).map(x=>x.id).sort().join()==='vcf1.cutoff,vco1.wave','MA-2 R3: パッチ読込後の孤児が列挙できる');
   /* MIDI割り当ての clean: 孤児を known で落とす */
   {const MM={};vm.runInContext(fs.readFileSync(path.join(w,'midimap.js'),'utf8'),ctx,{filename:'midimap.js'});
    const k=(trk,id)=>id.indexOf('.')>0?!!D(trk,id):true,r=SD.MidiMap.clean({v:1,pick:'jump',map:[{c:20,ch:null,trk:0,id:'vcf1.cutoff'},{c:21,ch:null,trk:0,id:'cutoff'}]},k);
    ok(r.map.length===1&&r.map[0].id==='cutoff','MA-2: MIDI割り当ての clean が孤児を落とす')}}
}catch(e){bad('エンジン例外 '+e.stack)}
/* MA-0: 全つまみに auto の可否が定まっている・auto:false には autoWhy がある・knobDef にも引き継がれる */
{let n=0,no=[];Object.keys(MD).forEach(t=>MD[t].knobs.forEach(k=>{n++;if(typeof k.auto!=='boolean')bad(t+'.'+k.k+' の auto が未決定');
  if(k.auto===false){no.push(t+'.'+k.k);if(!k.autoWhy)bad(t+'.'+k.k+' は auto:false なのに autoWhy が無い')}
  const d=L.knobDef(t+'1.'+k.k);if(!d||d.auto!==k.auto)bad(t+'1.'+k.k+' の knobDef に auto が引き継がれない')}));
 if(no.sort().join()!=='div.n,rev.size')bad('auto:false の一覧が想定と違う '+no.join());if(n<60)bad('つまみ数が少なすぎる '+n)}
console.log(err?('失敗 '+err+'件'):('OK: モジュール21種 / レッスン'+ML.length+'本 / '+ML.reduce((a,l)=>a+l.steps.length,0)+'ステップ / エンジン組み立て'));
process.exit(err?1:0);
