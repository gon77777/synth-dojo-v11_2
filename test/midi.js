// MIDI入力: node test/midi.js(パース・機器の検出・接続/切断を検査。実機は不要)
const fs=require('fs'),path=require('path');
let bad=0;const ok=(c,m)=>{if(!c){console.error('NG:',m);bad++}};
const load=nav=>{global.window={};global.navigator=nav;delete require.cache[require.resolve('../www/js/midi.js')];
 new Function('window','navigator',fs.readFileSync(path.join(__dirname,'..','www','js','midi.js'),'utf8'))(global.window,nav);return global.window.SD.Midi};
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

let M=load({});
ok(eq(M.parse([0x90,60,100]),{t:'on',ch:0,n:60,v:100}),'note on');
ok(eq(M.parse([0x93,60,100]),{t:'on',ch:3,n:60,v:100}),'note on ch4');
ok(eq(M.parse([0x90,60,0]),{t:'off',ch:0,n:60,v:0}),'vel0 は note off');
ok(eq(M.parse([0x80,64,40]),{t:'off',ch:0,n:64,v:40}),'note off');
ok(eq(M.parse([0xB0,64,127]),{t:'cc',ch:0,c:64,v:127}),'sustain');
ok(eq(M.parse([0xB0,123,0]),{t:'cc',ch:0,c:123,v:0}),'all notes off');
ok(M.parse([0xF8])===null&&M.parse([0xFE])===null,'リアルタイム/アクティブセンスは無視');
ok(M.parse([0xE0,0,64])===null&&M.parse([0xC0,5])===null,'未対応は無視');
ok(M.parse([])===null&&M.parse(null)===null&&M.parse([60,60,60])===null,'不正データ');
ok(M.parse(new Uint8Array([0x90,200,100])).n===72,'7bit にマスク');

// ---- MIDI learn の割り当て表(midimap.js。純粋関数) ----
{const vm=require('vm'),ctx={Math,console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext('var SD={};',ctx);
 ['params.js','midimap.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..','www','js',f),'utf8'),ctx,{filename:f}));
 const SD=ctx.SD,MM=SD.MidiMap,E=MM.empty();
 ok(MM.clean(undefined).map.length===0&&MM.clean({}).map.length===0&&MM.clean('x').pick==='jump','旧データ(キーなし)・不正は割り当て0');
 let m=MM.bind(E,74,null,2,'cutoff');
 ok(m&&m.map.length===1&&E.map.length===0,'bind は元を壊さない');
 ok(MM.bind(E,64,null,0,'cutoff')===null&&MM.bind(E,120,null,0,'cutoff')===null&&MM.bind(E,123,null,0,'cutoff')===null,'予約CC(64/120/123)は拒否');
 ok(MM.bind(E,7,null,0,'tVol')!==null&&MM.bind(E,10,null,0,'tPan')!==null,'CC7/10 は学習できる');
 ok(MM.bind(E,128,null,0,'x')===null&&MM.bind(E,-1,null,0,'x')===null&&MM.bind(E,1.5,null,0,'x')===null,'CC範囲外');
 ok(MM.bind(E,1,null,64,'x')===null&&MM.bind(E,1,null,'Q','x')===null&&MM.bind(E,1,null,0,'')===null,'トラック・IDの不正');
 const m2=MM.bind(m,74,null,2,'res');
 ok(m2.map.length===1&&m2.map[0].id==='res','同じCCを別の対象へ学習=付け替え');
 const m3=MM.bind(m,75,null,2,'cutoff');
 ok(m3.map.length===1&&m3.map[0].c===75,'同じ対象を別のCCへ=1対象1CC');
 ok(MM.bind(m,74,3,2,'res').map.length===1,'オムニと特定chは衝突(付け替え)');
 const m4=MM.bind(MM.bind(E,74,0,0,'a'),74,1,0,'b');ok(m4.map.length===2,'別チャンネルの同じCCは共存');
 ok(MM.find(m4,74,0).id==='a'&&MM.find(m4,74,1).id==='b'&&MM.find(m4,74,2)===null&&MM.find(m4,75,0)===null,'find(チャンネル別)');
 ok(MM.find(m,74,9).id==='cutoff','オムニはどのチャンネルでも当たる');
 ok(MM.unbind(m4,0).map.length===1&&MM.unbind(m4,9).map.length===2&&MM.unbindTarget(m4,0,'a').map.length===1,'unbind/unbindTarget');
 const raw={v:1,pick:'pickup',map:[{c:74,ch:null,trk:0,id:'cutoff'},{c:74,ch:null,trk:0,id:'res'},{c:20,ch:null,trk:0,id:'cutoff'},{c:64,ch:null,trk:0,id:'q1'},{c:21,ch:16,trk:0,id:'q2'},{c:22,ch:null,trk:99,id:'q3'},{c:23,ch:null,trk:'M',id:'ghost'},{c:24,ch:null,trk:'M',id:'drive'},null,'x',{c:25}]};
 const cl=MM.clean(raw,(t,id)=>id!=='ghost');
 ok(cl.pick==='pickup','pickup を保つ');
 ok(cl.map.length===2&&cl.map[0].id==='cutoff'&&cl.map[0].c===74&&cl.map[1].id==='drive','clean: 衝突は先を残す・予約CC/不正/存在しないIDを捨てる '+JSON.stringify(cl.map));
 ok(MM.clean(raw).map.some(e=>e.id==='ghost'),'known 省略時は捨てない');
 // 値の変換
 const cut=SD.defs.analog.byId.cutoff,seg=SD.defs.analog.P.find(p=>p.type==='seg');
 const near=(a,b,e)=>Math.abs(a-b)<=e;
 ok(near(MM.toValue(cut,0),cut.min,1e-6)&&near(MM.toValue(cut,127),cut.max,1e-3),'連続つまみの端(対数)');
 ok(near(MM.toValue(cut,64),SD.fromN(cut,64/127),1e-9),'連続つまみは v/127 を曲線に当てる');
 ok(MM.toValue(cut,-5)===MM.toValue(cut,0)&&MM.toValue(cut,999)===MM.toValue(cut,127),'範囲外はクランプ');
 ok(MM.toValue(seg,0)===seg.opts[0][0]&&MM.toValue(seg,127)===seg.opts[seg.opts.length-1][0],'seg の端');
 {const n=seg.opts.length;let prev=-1,mono=true;const seen=new Set();for(let v=0;v<=127;v++){const i=seg.opts.findIndex(o=>o[0]===MM.toValue(seg,v));if(i<prev)mono=false;prev=i;seen.add(i)}ok(mono&&seen.size===n,'seg は選択肢を等分(単調・全部に当たる)')}
 const onoff={type:'seg',opts:[[0,'OFF'],[1,'ON']]};
 ok(MM.toValue(onoff,0)===0&&MM.toValue(onoff,63)===0&&MM.toValue(onoff,64)===1&&MM.toValue(onoff,127)===1,'ON/OFF は v>=64 で ON');
 // ピックアップ
 {const st={last:null,ok:false};
  ok(MM.pickup(st,null,.5)===true,'現在値が不明なら即反映');
  const s2={last:null,ok:false};
  ok(MM.pickup(s2,.8,.1)===false&&MM.pickup(s2,.8,.3)===false,'遠い間は無視');
  ok(MM.pickup(s2,.8,.9)===true&&MM.pickup(s2,.8,.0)===true,'またいだら反映・その後は追従');
  const s3={last:null,ok:false};ok(MM.pickup(s3,.5,.51)===true,'近ければ即反映');}
}

(async()=>{
// 非対応環境
let M=load({}),fired=0;M.state=()=>fired++;
ok(!M.supported(),'非対応');
let r=await M.start();
ok(r===false&&M.status==='unsupported'&&fired===1,'非対応の状態');

// 許可されない
M=load({requestMIDIAccess:()=>Promise.reject(new Error('x'))});
r=await M.start();
ok(r===false&&M.status==='denied','拒否の状態');

// 機器の検出・ホットプラグ
const mk=(name,state)=>({name,state,onmidimessage:null});
const a=mk('KeyA','connected'),b=mk('KeyB','disconnected'),inputs=new Map([['a',a],['b',b]]);
const acc={inputs,onstatechange:null};
M=load({requestMIDIAccess:o=>{ok(o&&o.sysex===false,'sysex は要求しない');return Promise.resolve(acc)}});
const got=[];M.on=m=>got.push(m);let st=0;M.state=()=>st++;
r=await M.start();
ok(r===true&&M.status==='ok'&&eq(M.names,['KeyA']),'接続中の機器のみ');
ok(typeof a.onmidimessage==='function'&&b.onmidimessage===null,'接続中だけ購読');
a.onmidimessage({data:[0x90,60,90]});a.onmidimessage({data:[0xF8]});a.onmidimessage({data:[0x80,60,0]});
ok(got.length===2&&got[0].t==='on'&&got[1].t==='off','メッセージの受け渡し');
b.state='connected';acc.onstatechange();
ok(eq(M.names,['KeyA','KeyB'])&&st>=2,'ホットプラグ(接続)');
a.state='disconnected';b.state='disconnected';acc.onstatechange();
ok(M.names.length===0&&M.status==='none'&&a.onmidimessage===null,'切断');
r=await M.start();ok(r===true&&M.status==='none','2回目の start は再検索');
if(bad){console.error(bad+' 件NG');process.exit(1)}else console.log('midi: OK');
})();
