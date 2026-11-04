// 取り込み素材の検証: node test/umat.js  (メモリ保存で実行)
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
const g=global;g.window=g;g.SD={};
['mat.js','umat.js'].forEach(f=>vm.runInThisContext(fs.readFileSync(path.join(w,f),'utf8'),{filename:f}));
let err=0;const bad=m=>{console.error('NG: '+m);err++};
const sine=(n,f,sr,a)=>{const d=new Float32Array(n);for(let i=0;i<n;i++)d[i]=(a||.3)*Math.sin(2*Math.PI*f*i/sr);return d};
const U=SD.UMAT,sr=44100;
(async()=>{
// 1) prep
{const L=sine(sr,440,sr,.3),R=sine(sr,440,sr,.1),r=U.prep([L,R],sr);
 if(r.err)bad('prep失敗 '+r.err);else{let pk=0;r.data.forEach(v=>{pk=Math.max(pk,Math.abs(v))});
  if(Math.abs(pk-.9)>.01)bad('ピーク0.9になっていない '+pk);if(r.data[0]!==0||r.data[r.data.length-1]!==0)bad('端が0でない');if(r.data.length!==sr)bad('長さが変わった')}}
{const r=U.prep([sine(sr*30,220,sr)],sr);if(r.err||!r.trunc||r.data.length!==sr*20)bad('20秒に切り捨てられない')}
if(!U.prep([new Float32Array(sr)],sr).err)bad('無音を受け付けた');
if(!U.prep([sine(100,440,sr)],sr).err)bad('短すぎるのを受け付けた');
if(!U.prep([],sr).err||!U.prep(null,sr).err)bad('空入力');
{const d=sine(sr,440,sr);d[10]=NaN;d[20]=Infinity;const r=U.prep([d],sr);if(r.err||r.data.some(v=>!isFinite(v)))bad('NaN/Infが残る')}
// 2) Int16往復
{const d=sine(5000,333,sr,.9),b=U.fromI16(U.toI16(d));let e=0;for(let i=0;i<d.length;i++)e=Math.max(e,Math.abs(d[i]-b[i]));if(e>1e-4)bad('Int16往復の誤差 '+e)}
// 3) 追加・一覧・読み込み・SD.MAT連携
U.init();for(let i=0;i<50&&!U.ready;i++)await new Promise(r=>setTimeout(r,5));
if(!U.ready)bad('初期化されない');
if(!SD.MAT.info('u:zzzz')===false)0;
if(SD.MAT.info('u:zzzz'))bad('存在しないu:素材のinfoがある');
if(!SD.MAT.info('b:voice'))bad('内蔵素材のinfoが壊れた');
const ids=[];
for(let i=0;i<3;i++){const r=await U.add('テスト'+i,[sine(sr*2,200+i*50,sr)],sr);if(!r.ok)bad('追加失敗 '+r.msg);else ids.push(r.id)}
if(U.list().length!==3)bad('一覧の数');
if(!SD.MAT.info(ids[0])||SD.MAT.info(ids[0]).name!=='テスト0')bad('infoに名前が出ない');
if(SD.MAT.get(ids[0])!==null)bad('未読込なのにgetが返る');
const m0=await U.load(ids[0]);if(!m0||m0.data.length!==sr*2||m0.peaks.length!==800||m0.sr!==sr)bad('load結果');
if(SD.MAT.get(ids[0])!==m0)bad('読込後のMAT.getが一致しない');
await U.load(ids[1]);await U.load(ids[2]);
if(U.cached(ids[0]))bad('キャッシュが2つを超えた');
if(!SD.MAT.get(ids[2]))bad('最新のキャッシュが無い');
if(!SD.MAT.get('b:bell')||SD.MAT.get('b:bell').data.length<1000)bad('内蔵素材のgetが壊れた');
// 4) 名前変更・削除
if(!(await U.rename(ids[1],'  あたらしい名前が十二文字をこえる長い名前  ')))bad('rename失敗');
if(U.find(ids[1]).name.length>12)bad('名前が12文字を超えた');
if(!(await U.remove(ids[0])))bad('削除失敗');if(U.list().length!==2||SD.MAT.info(ids[0]))bad('削除後に残る');
if(await U.remove('u:nothing'))bad('存在しないものを削除できた');
// 5) 上限: 個数
for(const id of U.list().map(x=>x.id))await U.remove(id);
for(let i=0;i<8;i++){const r=await U.add('n'+i,[sine(sr,300,sr)],sr);if(!r.ok)bad('8個目までは入る '+r.msg)}
{const r=await U.add('x',[sine(sr,300,sr)],sr);if(r.ok||!/8個/.test(r.msg))bad('9個目が入る/メッセージ '+r.msg)}
// 6) 上限: 容量(96kHzの20秒=3.84MB → 7個目で24MB超え)
for(const id of U.list().map(x=>x.id))await U.remove(id);
let okN=0,last=null;for(let i=0;i<8;i++){const r=await U.add('b'+i,[sine(96000*20,300,96000)],96000);if(r.ok)okN++;else{last=r;break}}
if(okN!==6||!last||!/MB/.test(last.msg))bad('容量上限が守られない okN='+okN+' '+(last&&last.msg));
if(U.usage().bytes>U.LIM.bytes)bad('合計が上限超え');
// 7) 切り捨て通知
for(const id of U.list().map(x=>x.id))await U.remove(id);
{const r=await U.add('long',[sine(sr*25,300,sr)],sr);if(!r.ok||!r.trunc||!/切り捨て/.test(r.msg))bad('切り捨て通知')}
// 8) 名前が空ならデフォルト名
{const r=await U.add('<>',[sine(sr,300,sr)],sr);if(!r.ok||!/^MY SOUND/.test(U.find(r.id).name))bad('既定名')}
console.log(err?('失敗 '+err+'件'):'OK: 取り込み素材(変換・上限・保存・SD.MAT連携)');process.exit(err?1:0);
})();
