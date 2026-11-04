/* ウェーブテーブルシンセのつまみ定義。FILTER/ENV/LFO/FXの一部はアナログと同じ定義を共有 */
(function(){
var A=SD.defs.analog,P=[];
function K(id,tab,label,min,max,def,o){P.push(Object.assign({id:id,tab:tab,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:''},o||{}));}
function S(id,tab,label,opts,def,help){P.push({id:id,tab:tab,label:label,type:'seg',opts:opts,def:def,help:help||''});}
function U(ids){ids.forEach(function(i){P.push(A.byId[i])})}
S('wTable','wave','WAVE TABLE',[['basic','Basic'],['pwm','PWM'],['harm','Harmonics'],['vowel','Vowel'],['digital','Digital'],['metal','Metal'],['organ','Organ'],['noise','Noise'],['user','自作']],'basic','波形を64枚並べた「表(テーブル)」を選びます。Basic=サイン→三角→ノコギリ→矩形 / PWM=矩形のパルス幅が細くなる / Harmonics=倍音を1本ずつ足す / Vowel=あ→い→う→え→お / Digital=荒いデジタル音 / Metal=金属・ベル / Organ=オルガン / Noise=倍音がランダムに崩れる。');
K('wPos','wave','POSITION',0,1,.67,{help:'テーブルの何枚目の波形を鳴らすか。動かすと波形そのものが連続的に変形して音色が変わります。これがウェーブテーブルの一番大事なつまみ。エンベロープやLFOでも動かせます。'});
K('wOct','osc','OCT',-2,2,0,{step:1,fmt:'int',help:'音の高さをオクターブ単位で上下します。'});
K('wSemi','osc','SEMI',-24,24,0,{step:1,fmt:'st',help:'音の高さを半音単位でずらします。'});
K('wFine','osc','FINE',-50,50,0,{step:1,fmt:'ct',help:'音の高さをセント(半音の100分の1)で微調整します。'});
S('wWarpT','osc','WARP',[['none','なし'],['bend','ベンド'],['sync','シンク']],'none','波形をさらにゆがめる仕組み。ベンド=波形の前半を押し縮めて偏らせる / シンク=波形を途中で何度も最初に戻す(ギュイーンと尖った音)。');
K('wWarp','osc','WARP量',0,1,0,{help:'WARPの効き具合。0だと何も変わりません。動かしながら弾くとよく分かります。'});
K('wSub','osc','SUB',0,1,0,{help:'1オクターブ下で鳴るサイン波。低音に厚みを足します。'});
K('wNoise','osc','NOISE',0,1,0,{help:'ノイズ(ザーッという雑音)の音量。息づかいやアタックのざらつきに。'});
K('uVoices','uni','VOICES',1,5,1,{step:1,fmt:'n',help:'ユニゾン。1つの音を何本重ねるか。2本以上でほんの少し音程をずらして鳴らし、厚みと広がりを出します。重ねた数×同時発音数は合計24本までで、多いと同時発音数が減ります。'});
K('uDetune','uni','DETUNE',0,100,20,{step:1,fmt:'cn',help:'重ねた音のずらし幅(セント)。小さいと太い音、大きいと「ジャーン」とずれたスーパーソウ風になります。'});
K('uSpread','uni','SPREAD',0,1,.5,{help:'重ねた音を左右に広げる量。0でモノラル、大きいほどステレオで広がります。'});
K('uBlend','uni','BLEND',0,1,.5,{help:'重ねた音のうち、真ん中の音と外側の音のバランス。0で真ん中が中心、1で外側(ずれた音)が中心になります。'});
U(['fType','cutoff','res','envAmt','keyTrack','aA','aD','aS','aR','fA','fD','fS','fR']);
K('peA','penv','P.ENV A',.001,4,.005,{curve:'log',fmt:'time',help:'ポジション用エンベロープのアタック。POSITIONが動き始めるまでの時間。'});
K('peD','penv','P.ENV D',.001,4,.3,{curve:'log',fmt:'time',help:'ポジション用エンベロープのディケイ。動いた位置がサスティンに戻るまでの時間。'});
K('peS','penv','P.ENV S',0,1,0,{help:'ポジション用エンベロープのサスティン。押し続けている間、AMTの何割の位置を保つか。0だと元の位置に戻ります。'});
K('peR','penv','P.ENV R',.005,6,.2,{curve:'log',fmt:'time',help:'鍵盤を離したとき、POSITIONが元に戻る時間。'});
K('peAmt','penv','P.ENV AMT',-1,1,0,{help:'ポジション用エンベロープの深さ。プラスなら弾いた瞬間にPOSITIONが上へ、マイナスなら下へ動き、そこから元の位置に戻ります。弾いた瞬間だけ音色が変わる「プラック」に便利。'});
U(['lfoShape','lfoRate']);
K('lfoPos','lfo','→POSITION',0,1,0,{help:'LFOでPOSITIONをゆらす深さ。音色が周期的に変形し、揺れるパッドやウワウワした音になります。'});
U(['lfoPitch','lfoFilter','lfoAmp','drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master']);
var T=[
 {id:'wave',name:'WAVE',cols:8,rows:2,items:['wTable','v_wave','v_water','wPos'],at:{wTable:['1 / span 3','1 / span 2'],v_wave:['4 / span 3','1'],v_water:['4 / span 3','2'],wPos:['7 / span 2','1 / span 2']}},
 {id:'harm',name:'倍音',cols:1,rows:1,items:[]},
 {id:'osc',name:'OSC',cols:6,rows:2,items:['wOct','wSemi','wFine','wSub','wNoise','wWarpT','wWarp']},
 {id:'uni',name:'UNISON',cols:4,rows:1,items:['uVoices','uDetune','uSpread','uBlend']},
 {id:'filter',name:'FILTER',cols:8,rows:1,items:['fType','cutoff','res','envAmt','keyTrack','v_fcurve']},
 {id:'env',name:'ENV',cols:6,rows:2,place:4,items:['aA','aD','aS','aR','fA','fD','fS','fR','v_env']},
 {id:'penv',name:'P.ENV',cols:5,rows:2,place:3,items:['peA','peD','peS','peR','peAmt','v_penv']},
 {id:'lfo',name:'LFO',cols:7,rows:1,items:['lfoShape','lfoRate','lfoPos','lfoPitch','lfoFilter','lfoAmp']},
 {id:'fx',name:'FX',cols:6,rows:1,items:['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix']}
];
var byId={},DEF={};P.forEach(function(p){byId[p.id]=p;DEF[p.id]=p.def});
SD.defs.wt={P:P,T:T,byId:byId,DEF:DEF};
})();
