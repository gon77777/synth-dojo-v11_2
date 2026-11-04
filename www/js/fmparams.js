/* FMシンセのつまみ定義とアルゴリズム表(v2.5c: タブ ALGO/OP1〜4/FX、フィルター接続、図のレイアウト)。FXは共通。
   ID(fAlg / fn*)は最後まで変えない(保存データの互換)。fA/fD/fS/fR は v2.5a の「全体EG」(v2.5bでOP別の初期値に展開)。 */
(function(){
var A=SD.defs.analog,P=[];
function K(id,tab,label,min,max,def,o){P.push(Object.assign({id:id,tab:tab,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:''},o||{}));}
function S(id,tab,label,opts,def,help){P.push({id:id,tab:tab,label:label,type:'seg',opts:opts,def:def,help:help||''});}
function U(ids){ids.forEach(function(i){P.push(A.byId[i])})}
/* 共通フィルター(アナログと同じ定義の複製。タブだけFXに置く) */
function UF(ids){ids.forEach(function(i){P.push(Object.assign({},A.byId[i],{tab:'fx'}))})}

/* アルゴリズム表(データ)。オペレーターは0〜3(=OP1〜OP4)。m[i]=OPiの位相を動かす変調元の一覧(必ずiより大きい番号)、c=キャリア(音として出るOP)。
   エンジンはこの表を読むだけ。増やすときは行を足すだけでよい。 */
SD.FMALGS=[
 {m:[[1],[2],[3],[]],c:[0]},          /* 1: 4→3→2→1 直列 */
 {m:[[1],[2,3],[],[]],c:[0]},         /* 2: (3+4)→2→1 */
 {m:[[1,2],[],[3],[]],c:[0]},         /* 3: 4→3→1 と 2→1 */
 {m:[[1,2,3],[],[],[]],c:[0]},        /* 4: 2,3,4 すべて→1 */
 {m:[[1],[],[3],[]],c:[0,2]},         /* 5: 2→1 と 4→3 の2組 */
 {m:[[3],[3],[3],[]],c:[0,1,2]},      /* 6: 4→1,2,3(1つの変調で3音) */
 {m:[[],[2],[3],[]],c:[0,1]},         /* 7: 4→3→2 と 単独の1 */
 {m:[[],[],[],[]],c:[0,1,2,3]}        /* 8: 全部キャリア(加算) */
];

S('fAlg','algo','ALGORITHM',['1','2','3','4','5','6','7','8'].map(function(n){return[n,n]}),'1','オペレーター(OP)のつなぎ方。1〜4は変調(矢印)が多く、8は変調なしで4つの音を足し合わせます。OP4が一番上流で、OP1に向かって下へ変調がかかります。キャリア(音として聞こえるOP)は、アルゴリズムの表で決まっています。');
var NAMES=['RATIO','FINE','DETUNE','LEVEL'];
for(var n=1;n<=4;n++){(function(n){
 K('f'+n+'Coarse','op'+n,'OP'+n+' RATIO',.5,16,1,{step:.5,fmt:'x',help:'OP'+n+'の周波数の倍率(鍵盤の音に対して)。整数だと倍音が整数倍に並び、すっきりした音程のある音に。小数や割り切れない値にすると、ベルや金属のような音になります。'});
 K('f'+n+'Fine','op'+n,'OP'+n+' FINE',-50,50,0,{step:1,fmt:'pc',help:'OP'+n+'の倍率のこまかい調整(%)。RATIOに×(1+FINE/100)がかかります。'});
 K('f'+n+'Det','op'+n,'OP'+n+' DETUNE',-100,100,0,{step:1,fmt:'ct',help:'OP'+n+'の周波数をセント(半音の100分の1)でずらします。ごく小さくずらすと、うなりで太い音になります。'});
 K('f'+n+'Lvl','op'+n,'OP'+n+' LEVEL',0,100,n===1?80:0,{step:1,fmt:'n',help:'OP'+n+'のレベル。キャリアとして鳴るときは音量、他のOPを変調するときは変調の深さ(上げるほど倍音が増えて明るく、荒くなります)。0だとこのOPは働きません。'});

 K('f'+n+'A','op'+n,'OP'+n+' A',.001,4,.002,{curve:'log',fmt:'time',help:'OP'+n+'のアタック。このOPが最大になるまでの時間。モジュレーターなら倍音が増えるまでの時間、キャリアなら音量が立ち上がる時間。'});
 K('f'+n+'D','op'+n,'OP'+n+' D',.001,4,.4,{curve:'log',fmt:'time',help:'OP'+n+'のディケイ。最大からサスティンまで下がる時間。モジュレーターを短くすると、立ち上がり直後だけ明るい「カーン」という音(エレピなど)になります。'});
 K('f'+n+'S','op'+n,'OP'+n+' S',0,1,.7,{help:'OP'+n+'のサスティン。鍵盤を押し続けている間の大きさ。'});
 K('f'+n+'R','op'+n,'OP'+n+' R',.005,6,.2,{curve:'log',fmt:'time',help:'OP'+n+'のリリース。鍵盤を離したあとの余韻の長さ。'});
 K('f'+n+'Vel','op'+n,'OP'+n+' VEL',0,1,.5,{help:'OP'+n+'のベロシティ感度。0だと強く弾いても弱く弾いても同じ。上げるほど、弾く強さで変わります(モジュレーターなら音色の明るさ、キャリアなら音量)。'});
})(n)}
K('fFb','algo','FEEDBACK',0,7,0,{step:1,fmt:'n',help:'フィードバック。OP4の出力を、1サンプル前の値でOP4自身の位相に戻します。上げるほどOP4の音がノコギリ波に近づき、倍音が増えて荒くなります(0で無し)。'});
UF(['fType','cutoff','res']);
U(['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master']);

/* アルゴリズム図のレイアウト(0〜1の正規化座標。箱は中心x,y・幅w・高さh)。キャリアは最下段、変調元ほど上段。アルゴリズム表だけから作る */
SD.fmLayout=function(a){
 var A=SD.FMALGS[a],n=A.m.length,lv=[],i,j,k,r;
 for(i=0;i<n;i++){var tg=[];for(j=0;j<i;j++)if(A.m[j].indexOf(i)>=0)tg.push(j);
  lv[i]=A.c.indexOf(i)>=0||!tg.length?0:1+Math.max.apply(null,tg.map(function(t){return lv[t]}))}
 var rows=1+Math.max.apply(null,lv),h=Math.min(.26,.7/rows),w=.2,bx=[],at={};
 for(r=0;r<rows;r++){
  var ids=[];for(i=0;i<n;i++)if(lv[i]===r)ids.push(i);
  var des=ids.map(function(o){var t=[];for(j=0;j<o;j++)if(A.m[j].indexOf(o)>=0)t.push(at[j]);return t.length?t.reduce(function(x,y){return x+y},0)/t.length:.5});
  var ord=ids.map(function(o,q){return{o:o,d:des[q]}});if(r>0)ord.sort(function(x,y){return x.d-y.d||x.o-y.o});
  ord.forEach(function(e,q){var x=ord.length===1&&r>0?e.d:(q+.5)/ord.length;at[e.o]=x;
   bx.push({i:e.o,r:r,x:x,y:1-(r+.5)/rows,w:w,h:h,car:A.c.indexOf(e.o)>=0})})}
 bx.sort(function(x,y){return x.i-y.i});
 var ar=[];for(j=0;j<n;j++)A.m[j].forEach(function(s){var S=bx[s],T=bx[j];ar.push({s:s,t:j,x1:S.x,y1:S.y+S.h/2,x2:T.x,y2:T.y-T.h/2})});
 return{rows:rows,boxes:bx,arrows:ar};
};
/* 座標(0〜1)にある箱の番号(0〜3)。無ければ-1 */
SD.fmHit=function(a,x,y){var b=SD.fmLayout(a).boxes,i;for(i=0;i<b.length;i++)if(Math.abs(x-b[i].x)<=b[i].w/2+.02&&Math.abs(y-b[i].y)<=b[i].h/2+.04)return b[i].i;return -1};

var T=[
 {id:'algo',name:'ALGO',cols:9,rows:2,items:['v_algo','fAlg','fFb'],at:{v_algo:['1 / span 5','1 / span 2'],fAlg:['6 / span 4','1'],fFb:['6','2']}}
];
for(n=1;n<=4;n++){(function(n){var it=['Coarse','Fine','Det','Lvl','Vel'].map(function(c){return 'f'+n+c}).concat(['A','D','S','R'].map(function(c){return 'f'+n+c}),['v_op'+n]),at={};
 it.forEach(function(id,i){at[id]=i<5?[String(i+1),'1']:i<9?[String(i-4),'2']:['5 / span 2','2']});
 T.push({id:'op'+n,name:'OP'+n,cols:6,rows:2,items:it,at:at})})(n)}
T.push({id:'fx',name:'FX',cols:6,rows:2,items:['fType','cutoff','res','v_fcurve','drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix'],
 at:{fType:['1','1'],cutoff:['2','1'],res:['3','1'],v_fcurve:['4 / span 3','1'],drive:['1','2'],dlyTime:['2','2'],dlyFb:['3','2'],dlyMix:['4','2'],rvbSize:['5','2'],rvbMix:['6','2']}});
var byId={},DEF={};P.forEach(function(p){byId[p.id]=p;DEF[p.id]=p.def});
/* v2.5aの保存データ(全体EG fA/fD/fS/fR)を、4つのOPすべての ADSR に同じ値で展開して読む(旧IDは捨てる) */
SD.FMMIG=function(o){if(!o||typeof o!=='object')return o;var r=Object.assign({},o),n,k,ks=['A','D','S','R'];
 if(['fA','fD','fS','fR'].some(function(x){return r[x]!==undefined})){
  for(n=1;n<=4;n++)ks.forEach(function(c){if(r['f'+n+c]===undefined&&r['f'+c]!==undefined)r['f'+n+c]=r['f'+c]})}
 ks.forEach(function(c){delete r['f'+c]});return r};
/* 出荷プリセット(v2.5d)。既存機種の音色データは写さず、自作の値でコード生成する。
   ops[n] = [RATIO, FINE, DETUNE(ct), LEVEL, A, D, S, R, VEL]。fAlg/fFb と合わせて全FM値になる。時間は秒。 */
SD.FMPRESETS=[
 {id:'epiano',name:'E.PIANO',alg:5,fb:0,ops:[[1,0,0,80,.002,1.8,.2,.35,.4],[1,0,0,42,.002,.9,.25,.3,.8],[1,0,3,55,.002,1.4,.15,.3,.4],[14,0,0,34,.001,.12,0,.1,.7]]},
 {id:'bell',name:'BELL',alg:5,fb:0,ops:[[1,0,0,70,.001,3,0,2.5,.3],[3.5,0,0,55,.001,2,0,2,.5],[5.5,0,0,40,.001,1.6,0,1.6,.3],[7,0,0,45,.001,.8,0,.8,.5]]},
 {id:'bass',name:'BASS',alg:4,fb:1,ops:[[1,0,0,85,.001,.3,.8,.1,.3],[1,0,0,45,.001,.18,.25,.1,.7],[2,0,0,25,.001,.12,.1,.1,.5],[.5,0,0,20,.001,.1,0,.1,.5]]},
 {id:'brass',name:'BRASS',alg:4,fb:3,ops:[[1,0,0,80,.04,.2,.8,.15,.4],[1,0,0,55,.08,.3,.6,.15,.8],[1,0,5,25,.1,.3,.5,.15,.5],[1,0,0,30,.06,.3,.5,.15,.5]]},
 {id:'organ',name:'ORGAN',alg:8,fb:0,ops:[[1,0,0,70,.005,.01,1,.05,0],[2,0,0,60,.005,.01,1,.05,0],[4,0,0,45,.005,.01,1,.05,0],[.5,0,0,40,.005,.01,1,.05,0]]},
 {id:'pluck',name:'PLUCK',alg:2,fb:0,ops:[[1,0,0,75,.001,.5,0,.2,.4],[2,0,0,50,.001,.15,0,.1,.8],[3,0,0,20,.001,.1,0,.1,.5],[1,0,0,15,.001,.08,0,.1,.5]]},
 {id:'lead',name:'LEAD',alg:1,fb:5,ops:[[1,0,0,75,.01,.2,.8,.2,.3],[1,0,0,30,.01,.3,.7,.2,.5],[2,0,0,25,.01,.3,.7,.2,.5],[1,0,0,35,.01,.3,.7,.2,.5]]}
];
/* プリセットの全FM値(fAlg・fFb・fnの各値)を作る。FX・フィルターは既定値のまま。E.PIANOはv2.6のレッスンF7の「お手本」から SD.fmPatch('epiano') で参照する */
SD.fmPatch=function(id){var q=SD.FMPRESETS.filter(function(x){return x.id===id})[0];if(!q)return null;
 var o={fAlg:String(q.alg),fFb:q.fb};q.ops.forEach(function(v,i){var n=i+1;
  o['f'+n+'Coarse']=v[0];o['f'+n+'Fine']=v[1];o['f'+n+'Det']=v[2];o['f'+n+'Lvl']=v[3];o['f'+n+'A']=v[4];o['f'+n+'D']=v[5];o['f'+n+'S']=v[6];o['f'+n+'R']=v[7];o['f'+n+'Vel']=v[8]});return o};
SD.FM_EPIANO=SD.fmPatch('epiano');
SD.defs.fm={P:P,T:T,byId:byId,DEF:DEF};
})();
