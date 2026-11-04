/* RV コース(rv01〜rv05。LS-rv1・LS-rv2)。リバース(マスターFXラックの REVERSE。つまみID接頭辞 rb)。年号・人名・機材名は書かない。
   REVERSE は拍に揃えた区間(LEN)で録り、次の区間に逆向きに出す=出てくる音は LEN だけ遅れる。REVERB は既定(POSITION=SEND)では REVERSE より後ろに来る=逆再生した音にリバーブが掛かる。POSITION=CHAIN にするとラックの▲▼で REVERSE の前にでき、リバーブの尾まで逆再生される(RP-1。レッスン本文の書き直しは RP-4b)。
   曲はトラックモード(キック・メロディ・ハット)。cmp.g(音量補正)は未測定=README の申し送り参照 */
(function(){
 SD.CATS.push({id:'rv1',synth:'analog',chapter:'course',course:'RV',name:'RV リバース'});
 var P=SD.PATS,TK=P.tk,L4=1536,TM=function(id,pts){return{id:id,trk:'M',pts:pts}};
 var NOTES={len:16,scale:'minor',key:9,steps:(function(){var l=57;return[57,0,0,0,60,0,0,0,64,0,0,0,60,0,0,0].map(function(n){if(n)l=n;return{on:true,n:l,acc:false,sld:false,tie:!n}})})()};
 var RVFRONT=(function(){var o=SD.fxOrdNorm(null).filter(function(k){return k!=='rv'}),i=o.indexOf('rb');o.splice(i<0?o.length:i,0,'rv');return o})();/* REVERB を REVERSE の前にした並び(聴き比べ用) */
 var SYN=function(o){return Object.assign({o1Wave:'sawtooth',o1Lvl:.7,cutoff:3000,res:.1,envAmt:0,fA:.002,aA:.002,aD:.2,aS:.8,aR:.3,sBpm:120,sSwing:0},o)};
 var FT=function(o){return Object.assign({cat:'rv1',synth:'analog',lv:2,course:'RV',kind:'recipe',mode:'trk',tab:'trk',ts:0,oct:0,pre:['fx08']},o)};
 var KIT=function(){return[TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}}),TK('hat',P.offbeatHat(),'ハット'),TK('bass',P.walk('step'),'メロディ',{scale:'minor',tr:24,p:{o1Wave:'square',o1Lvl:.5,cutoff:3000,aD:.2,aS:.3,aR:.1}})]};
 SD.LESSONS.push(
FT({id:'rv01',terms:['reverse'],save:{name:'逆再生の聞こえ',kind:'kit'},title:'逆再生の聞こえ',sub:'アタックが後ろに来る、本物の逆再生',demo:{n:[45]},tk:KIT(),init:{rbOn:0,rbLen:3,rbMix:1,rbFb:0},steps:[
 {h:'元の音を聴く',b:'キックとメロディが、頭に強いアタックを持って鳴っている。音は、鳴った瞬間がいちばん大きい。',tab:'trk'},
 {h:'REVERSEをONにする',b:'FXタブで REVERSE をONにしよう。LEN は1拍のままにする。入力を1拍ぶん録って、次の1拍に逆向きに出す。最初の1拍は無音で、そのあとから逆再生の音が出てくる。',f:[['rbOn',1],['rbLen',3]],tab:'fx'},
 {h:'聴こえ方を確かめる',b:'音が、だんだん大きくなって、突然切れるのが聞こえる。アタックが後ろにまわり、余韻が先に来るため。これが【リバース】(逆再生)。',tab:'fx'},
 {h:'原音と混ぜる',b:'MIX を50%にしよう。原音は遅れずに鳴り、逆再生の音が重なる。逆再生の「ふくらむ感じ」が、普通の音の上に乗る。',f:[['rbMix',.5]],tab:'fx',tol:.05},
 {h:'聴き比べる',b:'元の音、逆再生だけ、半分混ぜたものを聴き比べよう。',tab:'fx',cmp:[{l:'元の音',s:{rbOn:0}},{l:'逆再生だけ',s:{rbOn:1,rbLen:3,rbMix:1}},{l:'半分混ぜる',s:{rbOn:1,rbLen:3,rbMix:.5}}],quiz:{q:'「だんだん大きくなって突然切れる」音が聞こえるのは?',ans:2,ex:'2が正解。逆再生では、鳴り終わりの余韻が先に来て、アタックが最後に来る。3は原音も一緒に鳴るので、ふくらみは目立ちにくい。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。REVERSEは、LENの長さだけ音が遅れる点を覚えておこう。',tab:'fx',
  col:{h:'本物の逆再生',b:'これは音をあとから時間反転した本物の逆再生。録音済みの音を後ろから読んでいる。リバース風の音をシンセの設定で近づけるやり方(fx08)もあるが、こちらは音の形がそのまま逆になる。'}}
]}),
FT({id:'rv02',pre:['rv01'],terms:['reverse','reverb'],save:{name:'リバースリバーブ',kind:'kit'},title:'リバースリバーブ',sub:'リバーブの尾まで逆再生して、音の手前でふくらませる',demo:{n:[45]},tk:KIT(),init:{rbOn:0,rbLen:3,rbMix:1,rbFb:0,rvbMix:0,rvbPos:0,rvbDry:1},steps:[
 {h:'リバーブをチェーンに入れる',b:'REVERB を選び、POSITION を CHAIN にして、MIX を30%にしよう。CHAIN にすると、リバーブがラックの並びの一員になり、順番を変えられる。',f:[['rvbPos',1],['rvbMix',.3]],tab:'fx',tol:.1},
 {h:'REVERSE をONにする',b:'REVERSE をONにして、LEN を1拍、MIX を100%にしよう。逆再生だけが出てくる。',f:[['rbOn',1],['rbLen',3],['rbMix',1]],tab:'fx'},
 {h:'REVERB を REVERSE の前へ',b:'ラックの左の一覧で REVERB を選び、▲で REVERSE の手前まで上げよう(何度か押す)。通る順が「REVERB → REVERSE」になり、原音とリバーブの尾が、まとめて逆再生される。並びは目標では採点できないので、次の聴き比べで確かめよう。',tab:'fx'},
 {h:'聴き比べる',b:'従来の順(逆再生→リバーブ)、本物(リバーブ→逆再生)、リバーブの尾だけ(DRY 0%)を聴き比べよう。本物は、尾がふくらんで、最後に音が吸い込まれる。',tab:'fx',cmp:[{l:'従来の順',s:{rbOn:1,rbLen:3,rbMix:1,rvbPos:0,rvbMix:.3,rvbDry:1},fxo:null},{l:'本物',s:{rbOn:1,rbLen:3,rbMix:1,rvbPos:1,rvbMix:.3,rvbDry:1},fxo:RVFRONT},{l:'尾だけ',s:{rbOn:1,rbLen:3,rbMix:1,rvbPos:1,rvbMix:.3,rvbDry:0},fxo:RVFRONT}],quiz:{q:'リバーブの尾がふくらんで、最後に音が吸い込まれるのは?',ans:2,ex:'2が正解。リバーブの尾まで逆再生するので、響きが手前でふくらむ。1は逆再生してからリバーブを掛けるので、響きの向きは普通。3は原音を通さないので、尾のふくらみだけが聞こえる。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。LEN を長くすると、ふくらみも長くなる。',tab:'fx',
  col:{h:'窓と遅れのこと',b:'逆再生は、LENの区間ごとに録って、次の区間に反転して出す。だから出てくる音はLENだけ遅れ、リアルタイムの処理では原音より前にふくらみが来ることはない。区間の頭に原音がある演奏なら、その後ろに尾のふくらみが乗る。ふくらむ位置は、LENの区切りで決まる。'}}
]}),
FT({id:'rv03',pre:['rv02'],terms:['reverse'],save:{name:'拍に合わせる',kind:'kit'},title:'拍に合わせる',sub:'LEN を1拍・1小節に変えて、逆再生の長さを聴く',demo:{n:[45]},tk:KIT(),init:{rbOn:0,rbLen:3,rbMix:1,rbFb:0,rvbMix:0},steps:[
 {h:'1拍で聴く',b:'REVERSE をONにして、LEN を1拍にしよう。1拍ごとに区切って、逆再生する。拍の頭にそろって聞こえる。',f:[['rbOn',1],['rbLen',3]],tab:'fx'},
 {h:'半拍にする',b:'LEN を1/2拍にしよう。逆再生が細かくなり、せわしない感じになる。',f:[['rbLen',2]],tab:'fx'},
 {h:'1小節にする',b:'LEN を1小節にしよう。1小節ぶんを録って、次の1小節に逆向きに出す。ゆったり大きくふくらんで、小節の頭で切れる。',f:[['rbLen',5]],tab:'fx'},
 {h:'聴き比べる',b:'1/2拍、1拍、1小節を聴き比べよう。',tab:'fx',cmp:[{l:'1/2拍',s:{rbOn:1,rbLen:2,rbMix:1}},{l:'1拍',s:{rbOn:1,rbLen:3,rbMix:1}},{l:'1小節',s:{rbOn:1,rbLen:5,rbMix:1}}],quiz:{q:'ふくらみが、いちばんゆっくり大きく育つのは?',ans:3,ex:'3が正解。LEN が長いほど、逆再生のふくらみが長く育つ。ただし、そのぶん出てくるまでの遅れも大きくなる。'}},
 {h:'FEEDBACKを少し足す',b:'FEEDBACK を30%にしよう。逆再生した音の一部がもう一度録られて、次の区間にもう一度ひっくり返って出てくる。余韻のように、繰り返しが残る。',f:[['rbFb',.3]],tab:'fx',tol:.05},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。テンポを変えても、逆再生の区間は拍に合ったままになる。',tab:'fx',
  col:{h:'区間は拍に揃う',b:'REVERSEの区間は、時間の長さではなく拍の長さで決まる。テンポを速くすれば区間は短くなり、遅くすれば長くなる。曲の拍に合わせて、いつも頭がそろう。'}}
]}),
FT({id:'rv04',pre:['rv03'],terms:['reverse'],mode:'seq',tab:'seq',save:{name:'前フリのリバース',kind:'patch'},title:'前フリに使う',sub:'ドロップの前に、逆再生をだんだん混ぜていく',demo:{n:[57],gap:2,len:1.8},pat:NOTES,init:SYN({rbOn:1,rbLen:5,rbMix:0,rbFb:0}),steps:[
 {h:'動かさずに聴く',b:'REVERSE はONで、LENは小節の長さ。MIXは0%なので、原音だけが鳴っている。まず基準にしよう。',clr:'au',bars:4,tab:'fx'},
 {h:'MIXのレーンを作る',b:'AUTOタブで REVERSE の MIX のレーンを作ろう。',tab:'au',au:[{id:'rbMix',trk:'M',has:1}]},
 {h:'だんだん混ぜる',b:'先頭の0%から4小節目の100%まで、右上がりの線を引こう。逆再生の音が少しずつ増えて、ドロップ(曲の盛り上がる場面)の前の「前フリ」になる。',tab:'au',
  au:[{id:'rbMix',trk:'M',at:[[0,0,.1],[L4,1,.1]],mono:[[0,L4,'up']]}],ref:[TM('rbMix',[[0,0],[L4,1]])]},
 {h:'混ぜ方を聴き比べる',b:'だんだん混ぜる、動かさない、最初から100%を聴き比べよう。だんだん混ぜると、場面の頭に向かって期待が高まる。',tab:'au',cmp:[{l:'だんだん混ぜる',ln:[TM('rbMix',[[0,0],[L4,1]])]},{l:'動かさない',au:false,s:{rbMix:0}},{l:'最初から100%',au:false,s:{rbMix:1}}]},
 {h:'使われどころ',b:'ドロップの前や、場面の切り替わりでの使い方を考えてみよう。',tab:'au',
  col:{h:'前フリの作り方',b:'曲が盛り上がる前に、音を引いたり、ふくらませたりして期待を作る。逆再生は、だんだん大きくなって突然切れる形なので、次の場面の頭に向かう動きと相性がいい。'}}
]}),
FT({id:'rv05',pre:['rv04'],terms:['reverse'],mode:'seq',tab:'seq',save:{name:'近似と本物',kind:'patch'},title:'近似と本物の聞き比べ',sub:'エンベロープの近似と、本物の逆再生',demo:{n:[57],gap:2,len:1.8},pat:NOTES,init:SYN({rbOn:0,rbLen:3,rbMix:1,rbFb:0}),steps:[
 {h:'ふつうの音を聴く',b:'音の出だしが強く、そのあと小さくなる。ふつうの音の形を基準にしよう。',tab:'env'},
 {h:'エンベロープで近似する',b:'AMP Aを0.4秒、AMP Rを5msにしよう。出だしがゆっくり立ち上がり、ぱっと切れる。逆再生に似た形になる。',f:[['aA',.4],['aR',.005]],tab:'env',tol:.1},
 {h:'本物にする',b:'AMP AとAMP Rを元に戻して、REVERSE をONにしよう。LEN は1拍。こんどは、鳴った音そのものを逆向きにしている。',f:[['aA',.002],['aR',.3],['rbOn',1],['rbLen',3]],tab:'fx',tol:.1},
 {h:'3つを聴き比べる',b:'ふつう、エンベロープの近似、本物の逆再生を聴き比べよう。近似は、いつでも鳴らした瞬間から出る。本物は、1拍遅れて逆向きに出る。',tab:'fx',cmp:[{l:'ふつう',s:{aA:.002,aR:.3,envAmt:0,fA:.002,rbOn:0}},{l:'近似',s:{aA:.4,aR:.005,envAmt:2,fA:.4,rbOn:0}},{l:'本物',s:{aA:.002,aR:.3,envAmt:0,fA:.002,rbOn:1,rbLen:3,rbMix:1}}],quiz:{q:'音を鳴らしてから、1拍遅れて聞こえるのは?',ans:3,ex:'3が正解。本物の逆再生は、1拍ぶん録ってから逆向きに出すので、LENの長さだけ遅れる。2の近似は、鳴らした瞬間から立ち上がる。'}},
 {h:'使い分けを考える',b:'近似は、遅れずに出せるのが強み。本物は、音色の細部まで逆になるのが強み。目的で選ぼう。',tab:'fx',
  col:{h:'どちらを使う?',b:'鳴らした瞬間から立ち上げたいなら、エンベロープの近似。ドラムやボーカルのような、すでにある音を逆にしたいなら、REVERSEが向いている。'}}
]})
 );
})();
