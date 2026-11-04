/* 拍子(MT-1a)。SD.METER=拍子の型・barTicks・stepsPerBar・検証・グルーピング。純粋な関数だけ(DOM・保存・他のファイルに依存しない)。
   MT-1a ではどこからも呼ばない。保存の互換と auto.js の置換は MT-1b。
   meter={n:4,d:4,g:null}(省略=4/4)。barTicks=n*384/d(1拍=四分音符=96tick)。stepsPerBar=barTicks/24(1/16を1ステップ。最大32)。
   g=拍のまとまり(分母単位の個数の配列。7/8 なら [2,2,3]。合計=n)。null なら拍子から自動(下の autoG)。BPM の基準は四分音符のまま */
(function(){
 var BASE=384,TPS=24,TPB=96,MAXSTEPS=32,DEN=[4,8,16];
 var M=SD.METER={BASE:BASE,TPS:TPS,TPB:TPB,MAXSTEPS:MAXSTEPS,DENS:DEN.slice()};
 var isInt=function(x){return typeof x==='number'&&isFinite(x)&&Math.floor(x)===x};
 M.DEFAULT=function(){return{n:4,d:4,g:null}};
 /* 検証。戻り値=''(正常)または理由の文字列 */
 M.why=function(m){
  if(!m||typeof m!=='object')return '拍子がオブジェクトでない';
  if(!isInt(m.n)||m.n<1)return '分子 n が1以上の整数でない';
  if(DEN.indexOf(m.d)<0)return '分母 d は4・8・16のどれか';
  var bt=m.n*BASE/m.d;if(!isInt(bt))return 'barTicks が整数にならない';
  var sp=bt/TPS;if(!isInt(sp))return 'stepsPerBar が整数にならない';
  if(sp>MAXSTEPS)return '1小節が'+MAXSTEPS+'ステップを超える';
  if(m.g!=null){
   if(!Array.isArray(m.g)||!m.g.length)return 'g が配列でない';
   var s=0;for(var i=0;i<m.g.length;i++){if(!isInt(m.g[i])||m.g[i]<1)return 'g の要素が1以上の整数でない';s+=m.g[i]}
   if(s!==m.n)return 'g の合計が n と一致しない'}
  return ''};
 M.valid=function(m){return M.why(m)===''};
 M.barTicks=function(m){m=m||M.DEFAULT();return m.n*BASE/m.d};
 M.stepsPerBar=function(m){return M.barTicks(m)/TPS};
 /* 分母1単位のステップ数(4分母=4・8分母=2・16分母=1) */
 M.unitSteps=function(m){m=m||M.DEFAULT();return 16/m.d};
 /* 既定のまとまり: 分子が3の倍数で分母が8・16(複合拍子)は3つ組、それ以外は1単位ずつ */
 M.autoG=function(m){
  m=m||M.DEFAULT();var r=[],i;
  if(m.d!==4&&m.n%3===0){for(i=0;i<m.n/3;i++)r.push(3)}else{for(i=0;i<m.n;i++)r.push(1)}
  return r};
 M.groups=function(m){m=m||M.DEFAULT();return(m.g&&m.g.length?m.g:M.autoG(m)).slice()};
 /* ステップ数で表したまとまり(3/4=[4,4,4]・6/8=[6,6]・7/8 で g=[2,2,3] なら [4,4,6]) */
 M.groupSteps=function(m){var u=M.unitSteps(m);return M.groups(m).map(function(x){return x*u})};
 /* 各まとまりの先頭ステップ番号(強拍。先頭=0 が最も強い) */
 M.accents=function(m){var a=[],p=0;M.groupSteps(m).forEach(function(x){a.push(p);p+=x});return a};
 M.isAccent=function(m,i){return M.accents(m).indexOf(i)>=0};
 /* 表示用 */
 M.label=function(m){m=m||M.DEFAULT();return m.n+'/'+m.d};
 M.isCompound=function(m){m=m||M.DEFAULT();return m.d!==4&&m.n%3===0&&(m.g==null||m.g.every(function(x){return x===3}))};
 M.dottedBpm=function(bpm){return bpm*2/3};/* 四分音符=bpm のとき、付点四分音符は毎分 bpm×2/3 */
 /* 旧データ(拍子なし)=4/4。壊れた値は null */
 M.norm=function(o){if(o==null)return M.DEFAULT();if(M.why(o))return null;return{n:o.n,d:o.d,g:o.g==null?null:o.g.slice()}};
 /* MT-4: テンポ同期(DIV)の長さの表示。DIV は『拍(四分音符=1拍)の分数』で拍子に依らない(1/8 は常に0.5拍)。拍子が関わるのは『1小節の何回分か』の言い方だけ。
    DIVBEATS・DIVLAB は SD.DIVS・mixdefs.js の DIV の並びと同じ(test で一致を検査) */
 M.DIVBEATS=[4,2,1.5,1,.75,.5,1/3,.25,1/6];
 M.DIVLAB=['1/1','1/2','1/4.','1/4','1/8.','1/8','1/8T','1/16','1/16T'];
 var r2=function(x){return String(Math.round(x*100)/100)};
 /* i=DIV の番号・bpm=テンポ(四分音符)・m=拍子(省略=4/4)。戻り値 {label,beats,sec,hz,perBar(1小節にその長さが何回入るか)} 。不正な番号は null */
 M.syncInfo=function(i,bpm,m){
  i=i|0;if(!(i>=0&&i<M.DIVBEATS.length))return null;
  m=m&&M.valid(m)?m:M.DEFAULT();bpm=bpm>0?bpm:120;
  var b=M.DIVBEATS[i],sec=60/bpm*b,beatsPerBar=M.barTicks(m)/96;
  return{label:M.DIVLAB[i],beats:b,sec:sec,hz:1/sec,perBar:beatsPerBar/b}};
 M.syncText=function(i,bpm,m){
  var o=M.syncInfo(i,bpm,m);if(!o)return '';m=m&&M.valid(m)?m:M.DEFAULT();
  var pb=o.perBar,bar=pb>=1?'1小節('+M.label(m)+')に'+r2(pb)+'回':r2(1/pb)+'小節('+M.label(m)+')ぶん';
  return o.label+' = '+r2(o.beats)+'拍 = '+Math.round(o.sec*1000)+'ms ・ '+bar};
 M.PRESETS=[[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[3,8],[5,8],[6,8],[7,8],[9,8],[12,8],[15,16]].map(function(a){return{n:a[0],d:a[1],g:null}});
})();
