/* 取り込み素材(v1.5): 端末内の音声ファイルをグラニュラーの素材にする。ID書式は u:xxxx。
   保存=IndexedDB(Int16モノラル)。上限: 1素材20秒 / 8個 / 合計24MB。デコードと取り込み処理はここ、画面は app.js。
   IndexedDBが使えない環境(テスト・一部のプライベートモード)はメモリ保存(再起動で消える)。 */
(function(){
var LIM={sec:20,count:8,bytes:24*1024*1024,name:12,minSec:.1,file:12*1024*1024};
var meta=[],loaded=false,ucache={},order=[],MAXC=2,be=null,persistent=false,lis=[];
function memBackend(){var m={};return{
 list:function(){return Promise.resolve(Object.keys(m).map(function(k){return Object.assign({},m[k].meta)}))},
 get:function(id){return Promise.resolve(m[id]?m[id].pcm:null)},
 put:function(mt,pcm){m[mt.id]={meta:Object.assign({},mt),pcm:pcm};return Promise.resolve()},
 del:function(id){delete m[id];return Promise.resolve()}}}
function idbBackend(){var dbp=null;
 function open(){if(dbp)return dbp;dbp=new Promise(function(res,rej){var r=indexedDB.open('sd_umat',1);
  r.onupgradeneeded=function(){var d=r.result;d.createObjectStore('meta',{keyPath:'id'});d.createObjectStore('pcm')};
  r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}});return dbp}
 function tx(mode,fn){return open().then(function(d){return new Promise(function(res,rej){var t=d.transaction(['meta','pcm'],mode),o=fn(t);
  t.oncomplete=function(){res(o&&o.result!==undefined?o.result:undefined)};t.onerror=t.onabort=function(){rej(t.error||new Error('idb'))}})})}
 return{list:function(){return tx('readonly',function(t){return t.objectStore('meta').getAll()})},
  get:function(id){return tx('readonly',function(t){return t.objectStore('pcm').get(id)}).then(function(v){return v||null})},
  put:function(mt,pcm){return tx('readwrite',function(t){t.objectStore('meta').put(mt);t.objectStore('pcm').put(pcm,mt.id)})},
  del:function(id){return tx('readwrite',function(t){t.objectStore('meta').delete(id);t.objectStore('pcm').delete(id)})}}}
function emit(){lis.forEach(function(f){try{f()}catch(e){}})}
function isU(id){return typeof id==='string'&&id.charAt(0)==='u'&&id.charAt(1)===':'}
function find(id){for(var i=0;i<meta.length;i++)if(meta[i].id===id)return meta[i];return null}
function total(){var s=0;meta.forEach(function(m){s+=m.bytes});return s}
function clean(n){n=String(n==null?'':n).replace(/[\u0000-\u001f<>"'`&]/g,'').trim();return n.slice(0,LIM.name)}
function toI16(f){var o=new Int16Array(f.length),i,v;for(i=0;i<f.length;i++){v=Math.round(f[i]*32767);o[i]=v>32767?32767:v<-32767?-32767:v}return o}
function fromI16(a){var o=new Float32Array(a.length),i;for(i=0;i<a.length;i++)o[i]=a[i]/32767;return o}
/* デコード済みチャンネル → モノラル・上限の長さ・ピーク0.9・端フェード。{data,trunc} か {err} */
function prep(chs,sr){
 if(!chs||!chs.length||!(sr>0))return{err:'音声を読み取れませんでした'};
 var n=chs[0].length,c,i,k=chs.length;for(c=1;c<k;c++)n=Math.min(n,chs[c].length);
 var max=Math.round(LIM.sec*sr),trunc=n>max;if(trunc)n=max;
 if(n<Math.round(LIM.minSec*sr))return{err:'短すぎます(0.1秒以上)'};
 var d=new Float32Array(n),pk=0,v;
 for(i=0;i<n;i++){v=0;for(c=0;c<k;c++){var x=chs[c][i];v+=isFinite(x)?x:0}v/=k;d[i]=v;var a=v<0?-v:v;if(a>pk)pk=a}
 if(pk<1e-5)return{err:'無音のファイルです'};
 var g=.9/pk,e=Math.min(132,n>>1);
 for(i=0;i<n;i++){var f=1;if(i<e)f=i/e;else if(n-1-i<e)f=(n-1-i)/e;d[i]*=g*f}
 return{data:d,trunc:trunc}}
function peaksOf(d){return SD.MAT.peaks(d)}
function init(){
 if(be)return;
 try{if(typeof indexedDB!=='undefined'&&indexedDB){be=idbBackend();persistent=true}}catch(e){be=null}
 if(!be){be=memBackend();persistent=false}
 be.list().then(function(l){meta=(l||[]).sort(function(a,b){return a.t-b.t});loaded=true;emit()}).catch(function(){be=memBackend();persistent=false;meta=[];loaded=true;emit()})}
function check(bytes){
 if(meta.length>=LIM.count)return'素材は'+LIM.count+'個までです。不要な素材を削除してください';
 if(total()+bytes>LIM.bytes)return'保存容量の上限('+Math.round(LIM.bytes/1048576)+'MB)を超えます。不要な素材を削除してください';
 return''}
function add(name,chs,sr){
 init();
 var r=prep(chs,sr);if(r.err)return Promise.resolve({ok:false,msg:r.err});
 var pcm=toI16(r.data),msg=check(pcm.length*2);if(msg)return Promise.resolve({ok:false,msg:msg});
 var id='u:'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36),
  mt={id:id,name:clean(name)||('MY SOUND '+(meta.length+1)),sr:sr,n:pcm.length,bytes:pcm.length*2,t:Date.now()};
 return be.put(mt,pcm.buffer).then(function(){meta.push(mt);emit();return{ok:true,id:id,trunc:r.trunc,msg:r.trunc?LIM.sec+'秒を超えた分は切り捨てました':''}})
  .catch(function(){return{ok:false,msg:'保存に失敗しました(端末の空き容量を確認してください)'}})}
function remove(id){
 init();if(!find(id))return Promise.resolve(false);
 return be.del(id).then(function(){meta=meta.filter(function(m){return m.id!==id});delete ucache[id];order=order.filter(function(x){return x!==id});emit();return true}).catch(function(){return false})}
/* 名前変更: backend差を避けるため、pcmを読み直してメタごと再保存 */
function rename2(id,name){var m=find(id),n=clean(name);if(!m||!n)return Promise.resolve(false);
 return be.get(id).then(function(pcm){if(!pcm)return false;var c=Object.assign({},m,{name:n});return be.put(c,pcm).then(function(){m.name=n;if(ucache[id])ucache[id].name=n;emit();return true})}).catch(function(){return false})}
function load(id){
 init();if(ucache[id])return Promise.resolve(ucache[id]);
 var run=function(){var m=find(id);if(!m)return Promise.resolve(null);
  return be.get(id).then(function(buf){if(!buf)return null;var d=fromI16(new Int16Array(buf));
   var o={id:id,name:m.name,data:d,sr:m.sr,peaks:peaksOf(d)};ucache[id]=o;order=order.filter(function(x){return x!==id});order.push(id);
   while(order.length>MAXC){delete ucache[order.shift()]}return o})};
 if(loaded)return run();
 return new Promise(function(res){var f=function(){var k=lis.indexOf(f);if(k>=0)lis.splice(k,1);res(run())};lis.push(f)})}
function list(){return meta.map(function(m){return Object.assign({},m)})}
function usage(){return{count:meta.length,bytes:total(),maxCount:LIM.count,maxBytes:LIM.bytes}}
SD.UMAT={LIM:LIM,isU:isU,prep:prep,toI16:toI16,fromI16:fromI16,init:init,add:add,remove:remove,rename:rename2,load:load,list:list,usage:usage,check:check,
 find:find,get ready(){return loaded},get persistent(){return persistent},cached:function(id){return ucache[id]||null},
 onchange:function(f){lis.push(f)},emit:emit,_useMemory:function(){be=memBackend();persistent=false;meta=[];loaded=false;ucache={};order=[];be.list().then(function(){loaded=true})},_reset:function(){be=null;meta=[];loaded=false;ucache={};order=[]}};
/* SD.MAT への組み込み: u: は取り込み素材(読み込み済みのものだけ get で返る。ロード中・未読込は null) */
var M=SD.MAT,oi=M.info,og=M.get;
M.info=function(id){
 if(isU(id)){if(!loaded)return{id:id,name:'…',label:'読み込み中'};var m=find(id);return m?{id:id,key:null,name:m.name,label:'取り込み素材 '+m.name,user:true}:null}
 return oi(id)};
M.get=function(id){return isU(id)?(ucache[id]||null):og(id)};
})();
