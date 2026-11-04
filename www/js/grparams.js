/* グラニュラーシンセのつまみ定義。AMP ADSRとFXはアナログと共通 */
(function(){
var A=SD.defs.analog,P=[];
function K(id,tab,label,min,max,def,o){P.push(Object.assign({id:id,tab:tab,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:''},o||{}));}
function S(id,tab,label,opts,def,help){P.push({id:id,tab:tab,label:label,type:'seg',opts:opts,def:def,help:help||''});}
function U(ids){ids.forEach(function(i){P.push(A.byId[i])})}
SD.GRWINS=[['hann','ハン'],['tri','三角'],['gauss','ガウス'],['rect','矩形']];
/* 窓の形(0〜1の位置→0〜1の大きさ)。ワークレット内の表と同じ式 */
SD.GRWIN=function(n,x){
 if(n==='hann')return .5-.5*Math.cos(2*Math.PI*x);
 if(n==='tri')return 1-Math.abs(2*x-1);
 if(n==='gauss'){var g0=Math.exp(-.5*Math.pow(.5/.16,2));return(Math.exp(-.5*Math.pow((x-.5)/.16,2))-g0)/(1-g0)}
 return 1;
};
S('gMat','sample','MATERIAL',SD.MAT.list.map(function(m){return[m.id,m.name]}),'b:voice','粒の元になる音(素材)。声・鐘・ドラムなど8種から選びます。グラニュラーは、この素材のごく一部分を切り出して大量にまき、重ねて音を作ります。');
K('gPos','sample','POSITION',0,1,.3,{help:'素材のどこから粒を切り出すか。波形の黄色い線がその位置です。動かすと、素材の中の別の場所の音が鳴ります。時間とは関係なく、位置を止めたまま鳴らし続けることもできます。'});
K('gSpray','sample','SPRAY',0,1,.1,{help:'位置のばらつき。0だと毎回同じ場所から切り出し、大きいほど位置の前後から粒をばらまきます(波形の帯の幅)。大きくすると音がにじんで雲のようになります。'});
K('gRoot','sample','ROOT',24,96,60,{step:1,fmt:'note',help:'素材が元々持っている音の高さ(基準音)。KEY TRKがONのとき、鍵盤の音との差だけ粒の音程が変わります。'});
S('gKey','sample','KEY TRK',[['on','ON'],['off','OFF']],'on','ONだと鍵盤の高さに合わせて粒の音程が変わります。OFFだと、どの鍵盤を弾いても素材の元の高さで鳴ります(PITCHつまみは効きます)。');
K('gSize','grain','SIZE',.005,.5,.08,{curve:'log',fmt:'time',help:'粒1つの長さ。短いと「プチプチ」した細かい質感、長いと素材の元の音色に近づきます。'});
K('gDens','grain','DENSITY',1,60,12,{curve:'log',fmt:'ps',help:'1秒に出す粒の数。低いと粒が1つずつ聞こえ、高いと粒が重なり合って「雲」のような連続した音になります。'});
K('gPitch','grain','PITCH',-24,24,0,{step:1,fmt:'st',help:'粒ごとの音程。時間の流れ(位置)とは独立に、音の高さだけを変えられるのがグラニュラーの特徴です。'});
S('gWin','grain','WINDOW',SD.GRWINS,'hann','粒の音量の形。ハン/ガウス=つなぎ目が滑らか、三角=少しシャープ、矩形=いきなり始まっていきなり切れるのでノイジー。');
K('gJit','grain','JITTER',0,1,0,{help:'粒を出すタイミングのばらつき。0だと等間隔でメトロノームのように、大きいと不規則に粒が出て自然な雲やざわめきになります。'});
K('gPRand','grain','P.RAND',0,12,0,{step:0,fmt:'st',help:'粒ごとの音程のランダムな幅(半音)。大きくすると粒の音程がばらけ、和音のような、にじんだ響きになります。'});
K('gScan','scan','SCAN',-.5,.5,0,{help:'位置を自動で動かす速さ(1秒に素材の何%進むか)。プラスで先へ、マイナスで逆戻り。素材の端まで行くと反対側へ回り込みます。鍵盤を押した位置から動き始めます。'});
S('gFreeze','scan','FREEZE',[['off','OFF'],['on','ON']],'off','ONにすると、SCANで動いていた位置をその場で止めます。鳴らしたまま「時間を止めた」ような、伸びる音になります(鍵盤を押し直すと最初に戻ります)。');
K('gLfoPos','lfo','→POSITION',0,1,0,{help:'LFOで位置をゆらす深さ。素材の中を行ったり来たりして音色がうねります。'});
K('gLfoSize','lfo','→SIZE',0,1,0,{help:'LFOで粒の長さをゆらす深さ(最大±1オクターブ分)。質感が周期的に変わります。'});
K('gLfoPitch','lfo','→PITCH',0,12,0,{step:0,fmt:'st',help:'LFOで粒の音程をゆらす深さ(半音)。ビブラートになります。'});
U(['fType','cutoff','res','lfoShape','lfoRate','lfoAmp']);
U(['aA','aD','aS','aR','drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master']);
var T=[
 {id:'sample',name:'SAMPLE',cols:8,rows:2,items:['gMat','v_gwave','gPos','gSpray','gRoot','gKey'],at:{gMat:['1 / span 3','1 / span 2'],v_gwave:['4 / span 5','1'],gPos:['4','2'],gSpray:['5','2'],gRoot:['6','2'],gKey:['7 / span 2','2']}},
 {id:'grain',name:'GRAIN',cols:8,rows:2,items:['gSize','gDens','gPitch','gWin','v_gwin','gJit','gPRand'],at:{gSize:['1','1'],gDens:['2','1'],gPitch:['3','1'],gWin:['4 / span 2','1'],v_gwin:['6 / span 3','1 / span 2'],gJit:['1','2'],gPRand:['2','2']}},
 {id:'scan',name:'SCAN',cols:8,rows:1,items:['gScan','gFreeze','v_gwave2'],at:{gScan:['1','1'],gFreeze:['2 / span 2','1'],v_gwave2:['4 / span 5','1']}},
 {id:'filter',name:'FILTER',cols:4,rows:1,items:['fType','cutoff','res']},
 {id:'lfo',name:'LFO',cols:7,rows:1,items:['lfoShape','lfoRate','gLfoPos','gLfoSize','gLfoPitch','lfoAmp']},
 {id:'env',name:'ENV',cols:6,rows:1,items:['aA','aD','aS','aR','v_env'],at:{aA:['1','1'],aD:['2','1'],aS:['3','1'],aR:['4','1'],v_env:['5 / span 2','1']}},
 {id:'fx',name:'FX',cols:6,rows:1,items:['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix']}
];
var byId={},DEF={};P.forEach(function(p){byId[p.id]=p;DEF[p.id]=p.def});
SD.defs.gr={P:P,T:T,byId:byId,DEF:DEF};
})();
