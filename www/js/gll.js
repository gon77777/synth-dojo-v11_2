/* GL コース(gl01〜gl05。LS-gl1・LS-gl2)。グリッチ(マスターFXラックの GLITCH。つまみID接頭辞 gl)。年号・人名・機材名は書かない。
   GLITCH は拍に揃えた区間(LEN)ごとに、確率(PROB)で『区間の頭の断片だけ通して、残りを断片のくり返し』にする。遅れない。乱数は固定シード+再生開始でリセット。
   曲はトラックモード(キック・ハット・ベース・メロディ)。cmp.g(音量補正)は未測定=README の申し送り参照 */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags})};
 A('stutter','スタッター','すたったー','stutter','同じ短い断片を、つっかえるようにくり返す音。グリッチの基本の形。',['gl01'],['エフェクト']);
 A('glitch','グリッチ','ぐりっち','glitch','音をわざと途切れさせたり、くり返したり、逆にしたりして、機械が不具合を起こしたように聞かせる加工。',['gl01','gl02'],['エフェクト']);
 SD.CATS.push({id:'gl1',synth:'analog',chapter:'course',course:'GL',name:'GL グリッチ'});
 var P=SD.PATS,TK=P.tk,L4=1536,TM=function(id,pts){return{id:id,trk:'M',pts:pts}};
 var NOTES={len:16,scale:'minor',key:9,steps:(function(){var l=57;return[57,0,0,0,60,0,0,0,64,0,0,0,60,0,0,0].map(function(n){if(n)l=n;return{on:true,n:l,acc:false,sld:false,tie:!n}})})()};
 var SYN=function(o){return Object.assign({o1Wave:'sawtooth',o1Lvl:.7,cutoff:3000,res:.1,envAmt:0,fA:.002,aA:.002,aD:.2,aS:.8,aR:.3,sBpm:120,sSwing:0},o)};
 var FT=function(o){return Object.assign({cat:'gl1',synth:'analog',lv:2,course:'GL',kind:'recipe',mode:'trk',tab:'trk',ts:0,oct:0,pre:['fx07']},o)};
 var KIT=function(){return[TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}}),TK('hat',P.offbeatHat(),'ハット'),TK('bass',P.bassPattern('syncop',0),'ベース',{scale:'minor',p:{o1Wave:'sawtooth',o1Lvl:.7,cutoff:900,aD:.25,aS:.7,aR:.1}}),TK('bass',P.walk('step'),'メロディ',{scale:'minor',tr:24,p:{o1Wave:'square',o1Lvl:.5,cutoff:3000,aD:.2,aS:.3,aR:.1}})]};
 var I0={glOn:0,glLen:3,glProb:.5,glRep:4,glRev:0,glPitch:1,glMix:1};
 SD.LESSONS.push(
FT({id:'gl01',terms:['stutter','glitch'],save:{name:'スタッター',kind:'kit'},title:'スタッター',sub:'1拍を細かい断片に分けて、くり返す',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0),steps:[
 {h:'元の音を聴く',b:'キック・ハット・ベース・メロディが、なめらかに流れている。この流れの一部を、わざとつっかえさせる。',tab:'trk'},
 {h:'GLITCHをONにする',b:'FXタブで GLITCH をONにしよう。【グリッチ】は、音をくり返したり、途切れさせたりして、機械が不具合を起こしたように聞かせる加工。LEN は1拍。PROB を100%にして、毎回かかるようにする。',f:[['glOn',1],['glLen',3],['glProb',1]],tab:'fx'},
 {h:'REPEATを4にする',b:'REPEAT を4にしよう。1拍を4つの断片に分けて、頭の断片だけを通し、残りは同じ断片のくり返しに置き換える。これが【スタッター】。拍が1/16ずつ、つっかえて聞こえる。',f:[['glRep',4]],tab:'fx'},
 {h:'細かくする',b:'REPEAT を8にしよう。断片が短くなり、くり返しが細かく速くなる。',f:[['glRep',8]],tab:'fx'},
 {h:'聴き比べる',b:'元の音、REPEAT 4、REPEAT 8を聴き比べよう。',tab:'fx',cmp:[{l:'元の音',s:{glOn:0}},{l:'REPEAT 4',s:{glOn:1,glLen:3,glProb:1,glRep:4}},{l:'REPEAT 8',s:{glOn:1,glLen:3,glProb:1,glRep:8}}],quiz:{q:'くり返しが、いちばん細かく速く聞こえるのは?',ans:3,ex:'3が正解。REPEATが大きいほど断片が短くなり、同じ断片を速くくり返す。2は断片が長く、くり返しがゆっくり。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。GLITCHは音が遅れない。元の演奏の頭は、そのまま通る。',tab:'fx',
  col:{h:'拍に揃っている',b:'GLITCHの区間は、時間でなく拍で決まる。テンポが変わっても、くり返しは拍に揃ったまま。だからリズムを崩さずに、つっかえだけを足せる。'}}
]}),
FT({id:'gl02',pre:['gl01'],terms:['glitch'],save:{name:'確率で崩す',kind:'kit'},title:'確率で崩す',sub:'PROBで、かかる拍とかからない拍を混ぜる',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{glOn:1,glProb:1}),steps:[
 {h:'毎回かける',b:'GLITCH がONで、PROB は100%。毎拍、スタッターがかかっている。規則的すぎて、機械的に聞こえる。',tab:'fx'},
 {h:'確率を下げる',b:'PROB を50%にしよう。拍ごとに、かかるかどうかが変わる。ときどきつっかえる、不規則な感じになる。',f:[['glProb',.5]],tab:'fx',tol:.05},
 {h:'ほとんどかけない',b:'PROB を15%にしよう。たまにだけ、つっかえる。ほとんど元のままなので、起こったときの驚きが大きい。',f:[['glProb',.15]],tab:'fx',tol:.05},
 {h:'0%にする',b:'PROB を0%にしよう。ぜんぜんかからない。音は元のまま、遅れもなく素通しになる。',f:[['glProb',0]],tab:'fx',tol:.02},
 {h:'聴き比べる',b:'PROB 100%、50%、15%を聴き比べよう。同じ演奏を2回聴くと、かかる場所も同じになる。',tab:'fx',cmp:[{l:'100%',s:{glOn:1,glProb:1}},{l:'50%',s:{glOn:1,glProb:.5}},{l:'15%',s:{glOn:1,glProb:.15}}],quiz:{q:'ときどきだけ、つっかえて聞こえるのは?',ans:3,ex:'3が正解。PROBが低いと、かかる拍が少なくなり、たまにだけ起こる。1は毎拍かかる。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。再生を止めて最初から鳴らすと、同じ場所でグリッチが起こる。',tab:'fx',
  col:{h:'固定シードの意味',b:'乱数は固定の種(シード)から作るので、再生を始めるたびに、同じ順番で同じ結果になる。ランダムに聞こえても、毎回同じ。だから、聴き比べや、曲の中で決まった場所にグリッチを置きたいときに、あてにできる。'}}
]}),
FT({id:'gl03',pre:['gl02'],terms:['glitch'],save:{name:'リピート+リバース',kind:'kit'},title:'リピート+リバース',sub:'くり返しの一部を、逆再生にする',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{glOn:1,glProb:.7,glRep:4,glRev:0}),steps:[
 {h:'リバースなしで聴く',b:'GLITCH がONで、PROB は70%。REV は0%なので、くり返しはすべて順方向。',tab:'fx'},
 {h:'REVを上げる',b:'REV を50%にしよう。グリッチになった拍のうち、半分は逆再生のくり返しになる。順方向と逆方向が混ざって、予測しにくくなる。',f:[['glRev',.5]],tab:'fx',tol:.05},
 {h:'すべて逆にする',b:'REV を100%にしよう。グリッチになる拍は、すべて逆再生のくり返しになる。',f:[['glRev',1]],tab:'fx',tol:.05},
 {h:'聴き比べる',b:'REV 0%、50%、100%を聴き比べよう。',tab:'fx',cmp:[{l:'REV 0%',s:{glOn:1,glProb:.7,glRev:0}},{l:'REV 50%',s:{glOn:1,glProb:.7,glRev:.5}},{l:'REV 100%',s:{glOn:1,glProb:.7,glRev:1}}],quiz:{q:'グリッチの拍が、すべて逆再生になるのは?',ans:3,ex:'3が正解。REVは、グリッチの拍のうち、逆再生になる割合。100%なら、すべて逆再生になる。'}},
 {h:'ピッチも変えてみる',b:'PITCH を+12にしよう。くり返しの断片が倍の速さで再生されて、1オクターブ高くなる。',f:[['glPitch',2]],tab:'fx'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。PITCHを-12にすると、半分の速さで1オクターブ下になる。',tab:'fx',
  col:{h:'3つの変化の組み合わせ',b:'グリッチには、くり返し、逆再生、ピッチの3つの変化がある。1つずつ足すと、どの変化が何をしているか聴き分けやすい。PROBで起こる頻度、REVで逆の割合、PITCHで高さを決めていく。'}}
]}),
FT({id:'gl04',pre:['gl03'],terms:['glitch'],save:{name:'グリッドを変える',kind:'kit'},title:'グリッドを変える',sub:'1/8・1/16・三連で、くり返しの刻みを変える',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{glOn:1,glProb:1,glRep:4}),steps:[
 {h:'1/16で聴く',b:'GLITCH がONで、PROB は100%、LEN は1拍。REPEAT が4なので、1拍を4つに分けた1/16の刻み。まず基準にしよう。',tab:'fx'},
 {h:'1/8にする',b:'REPEAT を2にしよう。1拍を2つに分けるので、1/8の刻みになる。くり返しがゆったりする。',f:[['glRep',2]],tab:'fx'},
 {h:'三連にする',b:'REPEAT を3にしよう。1拍を3つに分けるので、1/8の三連(3連符)の刻みになる。2や4の刻みとはちがう、はずむ感じが出る。',f:[['glRep',3]],tab:'fx'},
 {h:'聴き比べる',b:'1/8、1/16、三連を聴き比べよう。',tab:'fx',cmp:[{l:'1/8',s:{glOn:1,glProb:1,glRep:2}},{l:'1/16',s:{glOn:1,glProb:1,glRep:4}},{l:'三連',s:{glOn:1,glProb:1,glRep:3}}],quiz:{q:'1拍を3つに分けた、はずむ刻みになるのは?',ans:3,ex:'3が正解。REPEATを3にすると、1拍を3つに分ける三連になる。1は2つ、2は4つに分けた刻み。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。REPEATを6にすると、1/16の三連(さらに細かい三連)になる。',tab:'fx',
  col:{h:'分け方で、ノリが変わる',b:'REPEATは、1つの区間を何個に分けるかを決める。2・4・8は、まっすぐな刻み。3・6は、三連のはずむ刻み。曲のノリに合う分け方を選ぼう。'}}
]}),
FT({id:'gl05',pre:['gl04'],terms:['glitch'],mode:'seq',tab:'seq',save:{name:'ブレイク演出',kind:'patch'},title:'ブレイク演出',sub:'PROBと音量のレーンで、場面を切り替える',demo:{n:[57],gap:2,len:1.8},pat:NOTES,init:SYN({glOn:1,glLen:3,glProb:0,glRep:4,glRev:.25,glPitch:1,glMix:1}),steps:[
 {h:'動かさずに聴く',b:'GLITCH はONで、PROB は0%。何もかからず、音はそのまま流れている。',clr:'au',bars:4,tab:'fx'},
 {h:'PROBのレーンを作る',b:'AUTOタブで GLITCH の PROB のレーンを作ろう。',tab:'au',au:[{id:'glProb',trk:'M',has:1}]},
 {h:'だんだんかける',b:'先頭の0%から4小節目の100%まで、右上がりの線を引こう。初めは素通しで、だんだん崩れていく。',tab:'au',
  au:[{id:'glProb',trk:'M',at:[[0,0,.1],[L4,1,.1]],mono:[[0,L4,'up']]}],ref:[TM('glProb',[[0,0],[L4,1]])]},
 {h:'音量も下げる',b:'MIXのVOLのレーンを足して、先頭の100%から4小節目の20%まで下げよう。崩れながら、音が引いていく。',tab:'au',
  au:[{id:'glProb',trk:'M',has:1},{id:'tVol',at:[[0,1,.1],[L4,.2,.1]],mono:[[0,L4,'down']]}],lane:[TM('glProb',[[0,0],[L4,1]])],ref:[TM('glProb',[[0,0],[L4,1]]),{id:'tVol',pts:[[0,1],[L4,.2]]}]},
 {h:'足す順に聴き比べる',b:'PROBだけ、音量だけ、両方を聴き比べよう。両方動かすと、音が崩れながら引いていき、次の場面への転換がはっきりする。',tab:'au',
  cmp:[{l:'PROBだけ',ln:[TM('glProb',[[0,0],[L4,1]])]},{l:'音量だけ',ln:[{id:'tVol',pts:[[0,1],[L4,.2]]}],s:{glProb:0}},{l:'両方',ln:[TM('glProb',[[0,0],[L4,1]]),{id:'tVol',pts:[[0,1],[L4,.2]]}]}]},
 {h:'使われどころ',b:'ブレイク(曲の流れを一度止める場面)での使い方を考えてみよう。',tab:'au',
  col:{h:'崩して、引いて、戻す',b:'ブレイクの前に、音を崩しながら引いていくと、次の場面の頭に向けた緊張が生まれる。場面が変わったら、PROBと音量を元に戻して、すっきり切り替えよう。'}}
]})
 );
})();
