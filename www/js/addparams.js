/* アディティブシンセのつまみ定義(v2.8: 64倍音・LAYOUT・ドローバー・MOTION・フォルマント。タブ SPEC(DRAWBAR時はドローバー)/ENV/LAYOUT/MOTION/FX)。FXは共通。
   倍音の配列は音色データの配列として保存する(つまみIDには含めない): sp=スペクトルA(倍音の強さ64個、0〜1)/ spB=スペクトルB / dd=倍音ごとの減衰の長さの上書き(64個、0=自動(D.SLOPE)、それ以外は DECAY に掛ける倍率 .02〜2)。
   v2.7の保存(32個の配列)は、残りを0で埋めて読む。ID(ad* / db*)は最後まで変えない。 */
(function(){
var A=SD.defs.analog,P=[];
function K(id,tab,label,min,max,def,o){P.push(Object.assign({id:id,tab:tab,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:''},o||{}));}
function S(id,tab,label,opts,def,help){P.push({id:id,tab:tab,label:label,type:'seg',opts:opts,def:def,help:help||''});}
function UF(ids){ids.forEach(function(i){P.push(Object.assign({},A.byId[i],{tab:'fx'}))})}
function U(ids){ids.forEach(function(i){P.push(A.byId[i])})}
SD.ADD_NP=64;
/* 倍音の形のプリセット(64個)。SINE=1本だけ / SAW=1/k / SQUARE=奇数だけ1/k / TRI=奇数だけ1/k² */
SD.addPreset=function(name){var a=[],k,i;for(i=0;i<64;i++){k=i+1;
 a.push(name==='sine'?(k===1?1:0):name==='square'?(k%2?1/k:0):name==='tri'?(k%2?1/(k*k):0):1/k)}return a};
/* つまみ+配列から、実際に使う値を作る(画面の表示とワークレットで共通。自己完結の関数なのでワークレットにそのまま渡せる)。
   sp=スペクトルA / spB=スペクトルB(MORPHで補間) / dd=減衰の上書き / mm=MORPHへの加算(動き) / mt=TILTへの加算(動き) / f0=その音の基本周波数(フォルマント用、0なら無し) / out=使い回す結果(省略可)
   結果: a=各倍音の強さ(最大を1にそろえた相対値) / u=そろえる前の値(画面用) / mx=その最大 / r=周波数の比率(LAYOUT) / m=減衰の長さの倍率 / t=アタック時間の倍率 / s=サスティンの係数(パーカッションは0) / N / cnt=鳴る倍音の数 */
SD.ADD_DERIVE=function(p,sp,dd,spB,mm,mt,f0,out){
 var NP=64,i,k,v,o,x,mx=0,N=Math.max(1,Math.min(NP,Math.round(p.adN))),O=out,lay=p.adLayout||'harm';
 if(!O)O={a:new Float64Array(NP),u:new Float64Array(NP),m:new Float64Array(NP),t:new Float64Array(NP),r:new Float64Array(NP),s:new Float64Array(NP),mx:0,N:1,cnt:0};
 var a=O.a,u=O.u,m=O.m,t=O.t,r=O.r,s=O.s,tl=Math.max(-1,Math.min(1,p.adTilt/100+(mt||0))),oe=p.adOddEven/100,ds=p.adDSlope,
  mo=Math.max(0,Math.min(1,(p.adMorph||0)+(mm||0))),B=(p.adStretch||0)/100*.002,
  BT=[.5,1,1.2,1.5,2,2.5,3,3.5,4.2,5,5.4,6.8,8,9.6,11,13],DR=[.5,1.5,1,2,3,4,5,6,8],lcg=12345,fm=f0>0&&p.adFmt==='on',VW,F,sh,j,e,q;
 O.N=N;
 if(fm){VW={a:[800,1200,2500],i:[300,2300,3000],u:[350,1300,2300],e:[500,1900,2500],o:[500,900,2400]};F=VW[p.adVowel]||VW.a;sh=Math.pow(2,(p.adFmtShift||0)/12)}
 for(i=0;i<NP;i++){k=i+1;
  /* 周波数の比率 */
  if(lay==='stretch')r[i]=k*Math.sqrt(1+B*k*k);
  else if(lay==='bell'){x=i*15/63;j=Math.min(14,Math.floor(x));r[i]=BT[j]+(BT[j+1]-BT[j])*(x-j)}
  else if(lay==='metal'){lcg=(lcg*1103515245+12345)&2147483647;r[i]=k*(.7+.7*lcg/2147483648)}
  else if(lay==='drawbar')r[i]=i<9?DR[i]:0;
  else r[i]=k;
  t[i]=Math.pow(k,p.adATilt/200);s[i]=1;
  if(lay==='drawbar'){v=i<9?(p['db'+k]>0?p['db'+k]:0)/8:0;m[i]=1}
  else{v=sp[i]>0?sp[i]:0;if(spB&&mo>0)v=v*(1-mo)+(spB[i]>0?spB[i]:0)*mo;v=i<N?v:0;v*=Math.pow(k,tl);
   if(k%2){if(oe>0)v*=1-oe}else if(oe<0)v*=1+oe;
   o=dd&&dd[i]>0?dd[i]:Math.pow(k,-ds);m[i]=Math.max(.02,Math.min(2,o))}
  /* ドローバーのパーカッション: 打鍵だけ短く2倍または3倍を足す(サスティンしない) */
  if(lay==='drawbar'&&i===9&&p.adPerc&&p.adPerc!=='off'){v=.7;r[i]=p.adPerc==='3'?3:2;s[i]=0;m[i]=Math.max(.02,Math.min(2,.12/Math.max(.02,p.adD)))}
  /* フォルマント: 実際の周波数(基本周波数×比率)で決まる包絡を掛ける(声の仕組み) */
  if(fm&&v>0){x=f0*r[i];e=.03;for(q=0;q<3;q++){j=Math.log(x/(F[q]*sh))/Math.LN2/(q<2?.28:.35);e+=[1,.6,.35][q]*Math.exp(-.5*j*j)}v*=e}
  u[i]=v;a[i]=v;if(v>mx)mx=v;
 }
 O.mx=mx;O.cnt=0;
 for(i=0;i<NP;i++){if(mx>1e-9)a[i]/=mx;if(a[i]>1e-7)O.cnt++}
 return O;
};
/* 同時発音数の自動調整: 鳴る倍音の数×ボイス数が上限(160)を超えないよう 4→3→2 に下げる */
SD.addVoiceLimit=function(cnt){return cnt*4<=160?4:cnt*3<=160?3:2};
S('adSpec','spec','SPECTRUM',[['sine','SINE'],['saw','SAW'],['square','SQUARE'],['tri','TRI'],['custom','CUSTOM']],'saw','倍音の強さの形。SINE=基音だけ / SAW=1/kで減る(ノコギリ) / SQUARE=奇数だけ(矩形) / TRI=奇数だけ1/k²(三角)。棒グラフを触ると自動でCUSTOMになります。');
K('adN','spec','PARTIALS',1,64,32,{step:1,fmt:'n',help:'使う倍音の数(最大64)。減らすと高い倍音が消えて、丸い音になります。多いと負荷が増え、同時発音数が自動で減ります。'});
K('adTilt','spec','TILT',-100,100,0,{step:1,fmt:'pc',help:'高い倍音を持ち上げる(+)/下げる(−)。明るさを変えます。'});
K('adOddEven','spec','ODD/EVEN',-100,100,0,{step:1,fmt:'pc',help:'奇数倍音と偶数倍音のバランス。−にすると奇数だけ(矩形に近い)、+にすると偶数だけが残ります。'});
K('adA','env','ATTACK',.001,4,.005,{curve:'log',fmt:'time',help:'全体のアタック。音が最大になるまでの時間。'});
K('adD','env','DECAY',.02,8,.8,{curve:'log',fmt:'time',help:'基準の減衰時間。倍音ごとの減衰の長さ(左の棒)はこれに掛けた長さになります。'});
K('adS','env','SUSTAIN',0,1,.7,{help:'鍵盤を押し続けている間に残る大きさ。0にすると全部の倍音が減衰して消えます(ピアノ・ベルは0、オルガンは100%)。'});
K('adR','env','RELEASE',.005,6,.3,{curve:'log',fmt:'time',help:'鍵盤を離したあとの余韻の長さ。'});
K('adDSlope','env','D.SLOPE',0,1,.4,{help:'高い倍音ほど減衰を速くする度合い。上げるほど、高い倍音が先に消えます(ピアノのように、最初は明るく後から丸くなる)。棒を触ると、その倍音だけ上書きできます。'});
K('adATilt','env','A.TILT',-100,100,0,{step:1,fmt:'pc',help:'高い倍音ほどアタックを遅く(+)/速く(−)。+にすると、低い倍音のあとから明るさが立ち上がります。'});
/* LAYOUT */
S('adLayout','layout','LAYOUT',[['harm','HARM'],['stretch','STRETCH'],['bell','BELL'],['metal','METAL'],['drawbar','DRAWBAR']],'harm','倍音の周波数の並べ方。HARM=整数倍(普通の楽音) / STRETCH=高い倍音ほど少し高い(ピアノ) / BELL=鐘の非整数の並び / METAL=ばらばらに散らす(打楽器) / DRAWBAR=オルガンの9本のバー(SPECタブがドローバーに変わります)。');
K('adStretch','layout','STRETCH',0,1,.2,{help:'STRETCH配置の伸び。上げるほど高い倍音が整数倍から高い側へずれます。'});
S('adFmt','layout','FORMANT',[['off','OFF'],['on','ON']],'off','声のように、周波数ごとの山(フォルマント)を倍音に掛けます。音程を変えても山の位置は変わらないので、母音のまま高さだけ変わります。');
S('adVowel','layout','VOWEL',[['a','あ'],['i','い'],['u','う'],['e','え'],['o','お']],'a','フォルマントの母音。山の位置の値は目安です。');
K('adFmtShift','layout','F.SHIFT',-12,12,0,{step:1,fmt:'st',help:'フォルマント全体を半音単位でずらします。上げると声の主が小柄に、下げると大柄に聞こえます。'});
/* MOTION */
S('adAB','motion','EDIT',[['a','A'],['b','B']],'a','SPECタブで棒を編集するスペクトル。Aが始点、Bが終点で、MORPHで間を補間します。');
K('adMorph','motion','MORPH',0,1,0,{help:'スペクトルAからBへの補間。0=A、100%=B。LFOやEGでこれを動かせます。'});
S('adMotTarget','motion','MOTION',[['off','OFF'],['morph','MORPH'],['tilt','TILT']],'off','LFOとEGが動かす対象。MORPH=AとBの間を行き来 / TILT=明るさが開閉。');
K('adLfoRate','motion','LFO RATE',.1,20,2,{curve:'log',fmt:'hzf',help:'動きのLFOの速さ。'});
K('adLfoDepth','motion','LFO DEPTH',0,1,.5,{help:'動きのLFOの深さ。'});
K('adMotA','motion','MOT A',.001,4,.01,{curve:'log',fmt:'time',help:'動きのEGのアタック。'});
K('adMotD','motion','MOT D',.001,4,.6,{curve:'log',fmt:'time',help:'動きのEGのディケイ。'});
K('adMotS','motion','MOT S',0,1,.4,{help:'動きのEGのサスティン。'});
K('adMotR','motion','MOT R',.005,6,.3,{curve:'log',fmt:'time',help:'動きのEGのリリース。'});
K('adEgAmt','motion','EG AMT',0,1,.5,{help:'動きのEGの量。弾いた瞬間からどれだけMORPH/TILTを上げるか。'});
/* DRAWBAR */
var FT=["16'","5⅓'","8'","4'","2⅔'","2'","1⅗'","1⅓'","1'"],DB=[8,0,8,6,0,4,0,0,2];
for(var q=0;q<9;q++)K('db'+(q+1),'draw',FT[q],0,8,DB[q],{step:1,fmt:'n',help:'ドローバー '+FT[q]+'(0〜8)。オルガンの音色を作る9本のバーの1本。数字が大きいほどこの高さの音が強くなります。'});
S('adPerc','draw','PERC',[['off','OFF'],['2','2nd'],['3','3rd']],'off','パーカッション。打鍵の瞬間だけ2倍または3倍の音を短く足します(サスティンしません)。');
K('adClick','draw','CLICK',0,1,0,{help:'打鍵の短いノイズ(キークリック)の量。'});
UF(['fType','cutoff','res']);
U(['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master']);
var T=[
 {id:'spec',name:'SPEC',cols:8,rows:2,only:{adLayout:['harm','stretch','bell','metal']},items:['v_spec','adSpec','adN','adTilt','adOddEven'],at:{v_spec:['1 / span 4','1 / span 2'],adSpec:['5 / span 2','1 / span 2'],adN:['7','1'],adTilt:['8','1'],adOddEven:['7','2']}},
 {id:'draw',name:'SPEC',cols:9,rows:2,only:{adLayout:'drawbar'},items:['db1','db2','db3','db4','db5','db6','db7','db8','db9','adPerc','adClick'],at:{db1:['1','1'],db2:['2','1'],db3:['3','1'],db4:['4','1'],db5:['5','1'],db6:['6','1'],db7:['7','1'],db8:['8','1'],db9:['9','1'],adPerc:['1 / span 3','2'],adClick:['4','2']}},
 {id:'env',name:'ENV',cols:8,rows:2,items:['v_dec','adA','adD','adS','adR','adDSlope','adATilt'],at:{v_dec:['1 / span 4','1 / span 2'],adA:['5','1'],adD:['6','1'],adS:['7','1'],adR:['8','1'],adDSlope:['5','2'],adATilt:['6','2']}},
 {id:'layout',name:'LAYOUT',cols:8,rows:2,items:['adLayout','v_lay','adStretch','adFmt','adVowel','adFmtShift'],at:{adLayout:['1 / span 2','1 / span 2'],v_lay:['3 / span 4','1'],adStretch:['7','1'],adFmt:['3','2'],adVowel:['4 / span 3','2'],adFmtShift:['7','2']}},
 {id:'motion',name:'MOTION',cols:8,rows:2,items:['v_mix','adAB','adMorph','adMotTarget','adLfoRate','adLfoDepth','adMotA','adMotD','adMotS','adMotR','adEgAmt'],at:{v_mix:['1 / span 2','1 / span 2'],adAB:['3','1'],adMorph:['4','1'],adMotTarget:['5 / span 2','1'],adLfoRate:['7','1'],adLfoDepth:['8','1'],adMotA:['3','2'],adMotD:['4','2'],adMotS:['5','2'],adMotR:['6','2'],adEgAmt:['7','2']}},
 {id:'fx',name:'FX',cols:6,rows:2,items:['fType','cutoff','res','v_fcurve','drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix'],
  at:{fType:['1','1'],cutoff:['2','1'],res:['3','1'],v_fcurve:['4 / span 3','1'],drive:['1','2'],dlyTime:['2','2'],dlyFb:['3','2'],dlyMix:['4','2'],rvbSize:['5','2'],rvbMix:['6','2']}}
];
var byId={},DEF={};P.forEach(function(p){byId[p.id]=p;DEF[p.id]=p.def});
SD.defs.add={P:P,T:T,byId:byId,DEF:DEF};
})();
