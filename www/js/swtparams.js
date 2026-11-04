/* サンプル由来ウェーブテーブル(v2.2〜v2.3)のつまみ定義。WTの定義(wtparams.js)に追記する。素材一覧(mat.js)の後に読み込むこと。
   IDは ws で始める(WTの既存IDと衝突させない)。SMPタブは WAVE TABLE で SAMPLE を選んだときだけ現れる。 */
(function(){
var W=SD.defs.wt,P=W.P;
function K(id,tab,label,min,max,def,o){P.push(Object.assign({id:id,tab:tab,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:''},o||{}));}
function S(id,tab,label,opts,def,help){P.push({id:id,tab:tab,label:label,type:'seg',opts:opts,def:def,help:help||''});}
/* WAVE TABLE の選択肢に SAMPLE を追加 */
var wt=W.byId.wTable;
wt.opts.push(['sample','SAMPLE']);
wt.help+=' SAMPLE=録音(素材)を64枚の波形に変換して並べた表。音程は必ず鍵盤どおりで、録音の中の位置をPOSITIONで動かすと音色が変わります。選ぶと SMP タブが現れます。';
S('wsMat','smp','MATERIAL',SD.MAT.list.map(function(m){return[m.id,m.name]}),'b:voice','表の元になる音(素材)。素材全体を64等分した各位置から「1周期ぶんの波形」を切り出して、64枚の波形の表にします。グラニュラーのように録音を再生するのではなく、音程は鍵盤で決まります。自分で読み込んだ音(MY SOUND)は、右下のボタンから選びます。');
K('wsCycle','cnv','CYCLE',.0025,.1,.0025,{curve:'log',fmt:'cyc',help:'1枚の波形に使う素材の長さ(MODEがCYCLEのとき効きます)。AUTOは素材の音の高さ(1周期の長さ)を調べて自動で決めます(調べられなければ20ms)。短いと素材の音色そのもの、長いと複数の周期が混ざった複雑な音になります。'});
S('wsAlign','cnv','ALIGN',[['on','ON'],['off','OFF']],'on','(CYCLEのとき)波形の切り出し開始点を、波が下から上へ横切る位置(ゼロ交差)にそろえます。ONだと隣り合う波形の位相がそろい、POSITIONを動かしたときの「プチッ」というつなぎ目のノイズが減ります。');
S('wsNorm','cnv','NORM',[['on','ON'],['off','OFF']],'on','ONだと64枚それぞれの音量(波形のピーク)をそろえます。OFFだと素材の音量の変化がそのまま残り、静かな場所の波形は小さくなります。');
S('wsMode','cnv','MODE',[['cycle','CYCLE'],['spectrum','SPECTRUM']],'cycle','素材から波形を作る方式。CYCLE=素材の1周期ぶんを切り出して波形にします(声・鐘・弦など、音程のある素材向き)。SPECTRUM=素材の「周波数の分布(スペクトル)」を読み取り、各周波数の強さを第k倍音の強さに写して波形にします(ドラム・ノイズなど音程のない素材や、声の音程を問わないときに向きます)。どちらも音程は鍵盤で決まります。');
S('wsPhase','cnv','PHASE',[['zero','ZERO'],['keep','KEEP'],['random','RANDOM']],'zero','SPECTRUMのとき、各倍音の位相(波の出だしのずれ)をどうするか。ZERO=全部そろえる(とがった明るい音)/ KEEP=素材の位相をそのまま使う/ RANDOM=決まった乱数でばらす(ふっくらしたノイズ寄りの音)。CYCLEのときは効きません。');
K('wsStart','smp','START',0,1,0,{help:'素材のどこから使うか。波形の黄色い帯の左端です。POSITIONを0にしたときの音が、この近くの位置から作られます。波形を指でなぞって範囲を決めることもできます。0.1秒より短いと注意が出ます。'});
K('wsEnd','smp','END',0,1,1,{help:'素材のどこまで使うか。波形の黄色い帯の右端です(STARTより大きくなります)。POSITIONを動かすと、STARTからENDの間をなぞるように音色が変わります。'});
K('wsSmooth','cnv','SMOOTH',0,1,.2,{help:'隣り合う波形(フレーム)を重ねて、POSITIONを動かしたときの変化をなめらかにします。0%だと64枚がそのまま並び、大きいほど変化がゆるやかになります(細かい違いはぼやけます)。'});
W.T.splice(1,0,{id:'smp',name:'SMP',cols:8,rows:2,only:{wTable:'sample'},items:['wsMat','v_swave','wsStart','wsEnd','v_swpick'],at:{wsMat:['1 / span 3','1 / span 2'],v_swave:['4 / span 5','1'],wsStart:['4 / span 2','2'],wsEnd:['6 / span 2','2'],v_swpick:['8','2']}});
W.T.splice(2,0,{id:'cnv',name:'CONV',cols:10,rows:2,only:{wTable:'sample'},items:['wsMode','wsPhase','wsCycle','wsSmooth','wsAlign','wsNorm','v_water'],at:{wsMode:['1 / span 3','1'],wsPhase:['1 / span 3','2'],wsCycle:['4','1'],wsSmooth:['5','1'],wsAlign:['6 / span 2','1'],wsNorm:['4 / span 2','2'],v_water:['8 / span 3','1 / span 2']}});
['wsMat','wsCycle','wsAlign','wsNorm','wsMode','wsPhase','wsStart','wsEnd','wsSmooth'].forEach(function(id){var p=W.byId[id]=P.filter(function(x){return x.id===id})[0];W.DEF[id]=p.def});
})();
