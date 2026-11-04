/* 素材再生シンセのつまみ定義(v7.4)。取り込み素材(や内蔵素材)を「そのまま」鳴らす。ピッチ・テンポに合わせた伸縮はしない。
   自分が権利を持つ音声だけを使う(端末内のみ・同梱なし)。AMPはアタック/リリースだけ、FXはアナログと共通 */
(function(){
var A=SD.defs.analog,P=[];
function K(id,tab,label,min,max,def,o){P.push(Object.assign({id:id,tab:tab,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:''},o||{}));}
function S(id,tab,label,opts,def,help){P.push({id:id,tab:tab,label:label,type:'seg',opts:opts,def:def,help:help||''});}
function U(ids){ids.forEach(function(i){P.push(A.byId[i])})}
S('sMat','sample','MATERIAL',SD.MAT.list.map(function(m){return[m.id,m.name]}),'b:voice','鳴らす素材。内蔵8種のほか、MY SOUNDで取り込んだ自分の音も選べます。自分が権利を持つ音声だけを使ってください(端末内にだけ保存されます)。');
S('sMode','sample','MODE',[['one','ONE SHOT'],['loop','LOOP']],'one','ONE SHOT=素材を最後まで1回鳴らす(鍵盤を離しても止まらない) / LOOP=鍵盤を押している間くり返す。どちらも音の高さは変わらず、テンポにも合わせて伸び縮みしません。');
K('sStart','sample','START',0,1,0,{help:'素材のどこから鳴らすか(0%=最初)。ステップを鳴らすたびに、ここから再生します。'});
U(['aA','aR']);
U(['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master']);
var T=[
 {id:'sample',name:'SAMPLE',cols:8,rows:2,items:['sMat','sMode','sStart','v_swpick'],at:{sMat:['1 / span 4','1 / span 2'],sMode:['5 / span 2','1'],sStart:['7','1'],v_swpick:['8','1']}},
 {id:'env',name:'ENV',cols:2,rows:1,items:['aA','aR']},
 {id:'fx',name:'FX',cols:6,rows:1,items:['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix']}
];
var byId={},DEF={};P.forEach(function(p){byId[p.id]=p;DEF[p.id]=p.def});
SD.defs.smp={P:P,T:T,byId:byId,DEF:DEF};
SD.SYNTHS.push({id:'smp',name:'素材再生(取り込んだ声など)',short:'素材',sub:'素材をそのまま鳴らす。ピッチは変わらず、テンポにも合わせて伸縮しない。自分が権利を持つ音声だけ使う',ready:true,noLesson:true});
})();
