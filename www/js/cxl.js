/* CX コース(cx01〜cx12。cx11・cx12 は OR-4)。エフェクトの複合。年号・人名・機材名は書かない。
   曲はトラックモード。聞き比べ cmp の tm=トラック別インサート・s=マスターFX。cmp.g(音量補正)は未測定=README の申し送り参照 */
(function(){
 SD.CATS.push({id:'cx1',synth:'analog',chapter:'course',course:'CX',name:'CX エフェクトの複合'});
 var P=SD.PATS,TK=P.tk;
 var E=function(o){return Object.assign({iEqOn:1,iEqHpf:20,iEqLpf:20000,iEqLg:0,iEqB1g:0,iEqB2g:0,iEqHg:0},o||{})};
 var S=function(o){return Object.assign({iSaOn:1,iSaType:1,iSaDrive:.3,iSaTone:20000,iSaMix:1,iSaOut:0},o||{})};
 var C=function(o){return Object.assign({iCpOn:1,iCpModel:3,iCpThr:-24,iCpRatio:3,iCpAtk:10,iCpRel:250,iCpMake:0,iCpKnee:6,iCpMix:1,iCpScHpf:20},o||{})};
 var BASS={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:.3,noiseLvl:0,fType:'lowpass',cutoff:700,res:.1,envAmt:.3,drive:0,aA:.004,aD:.25,aS:.7,aR:.1};
 var KICK=function(){return TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}})};
 var BP=function(name,mx,mix){return TK('bass',P.bassPattern('eighth',0),name,{scale:'minor',p:BASS,acc:[0,4,8,12],mx:mx,mix:mix})};
 var FT=function(o){return Object.assign({cat:'cx1',synth:'analog',lv:3,course:'CX',kind:'recipe',mode:'trk',tab:'trk',oct:-1,demo:{n:[33]}},o)};
 var qz=function(q,ans,ex){return {q:q,ans:ans,ex:ex}};
 SD.LESSONS.push(
FT({id:'cx01',pre:['ef03','ef12'],terms:['insert','sat'],title:'直列の定番',sub:'歪み→フィルター→空間。順番の意味',save:{name:'直列で仕上げたベース',kind:'kit'},
 tk:[KICK(),BP('ベース',{sa:S({iSaType:5,iSaDrive:.3})})],init:{djOn:0,djFilter:0,djRes:.2,rvbMix:0,dlyMix:0},steps:[
 {h:'3つの段を通す',b:'T2のベースを、歪み→フィルター→空間(リバーブ)の順に、一列で通していく。前の段の結果が、そのまま次の段に入る。これが【インサート】の直列のつなぎ方。まず、何も足していない音を聴こう。',tab:'trk'},
 {h:'1段目: 歪ませる',b:'T2のSATのDRIVEを0.5〜0.9にしよう(TYPEはFUZZ)。荒い高い倍音がたくさん生まれて、音が前に出る。',tab:'mix',mx:[{trk:2,ins:'sa',k:'iSaDrive',rng:[.5,.9]}]},
 {h:'2段目: フィルターで整える',b:'FXタブで DJ FILTER をONにして、つまみを左へ(-50%あたり)回そう。歪みで生まれた高い倍音の、荒れすぎた部分が削れる。',f:[['djOn',1],['djFilter',-.5]],tab:'fx',tol:.15},
 {h:'3段目: 空間を足す',b:'REVERB の MIX を25%あたりにしよう。歪ませて整えた音に、最後に響きが乗る。',f:[['rvbMix',.25]],tab:'fx',tol:.1},
 {h:'フィルターの位置で聴き比べる',b:'フィルターを歪みの前に置いた場合(EQのHIGH CUTで削ってから歪ませる)と、後ろに置いた場合(歪ませてからDJ FILTERで削る)を聴き比べよう。前に置くと、歪みが高い倍音を作り直すので荒さが残る。後ろに置くと、歪みで生まれた高い倍音が削れて、なめらかになる。',tab:'fx',
  cmp:[{l:'フィルター→歪み',tm:{2:Object.assign(E({iEqLpf:1500}),S({iSaType:5,iSaDrive:.7}))},s:{djOn:0,rvbMix:.25}},{l:'歪み→フィルター',tm:{2:Object.assign(E({iEqLpf:20000}),S({iSaType:5,iSaDrive:.7}))},s:{djOn:1,djFilter:-.5,rvbMix:.25}}],
  quiz:qz('歪みで生まれた高い倍音が、そのまま残っているのは?',1,'1が正解。フィルターを歪みの前に置くと、削った後で歪みが高い倍音を作り直す。2は歪みの後で削るので、高い倍音が減ってなめらかになる。')},
 {h:'空間はいちばん最後',b:'リバーブを歪みの前に置くと、響きの尾まで歪んでしまい、濁りやすい。空間は最後にして、整えた音に響きを足すのが定番。このアプリのチェーンは、音源→トラックのインサート→マスターFX(リバーブは既定で最後)の順に流れる。ラックの▲▼で並べ替えもできるが、ここでは既定の並びのまま、「どの段を使うか」で順番を選ぶ。',tab:'fx'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。DRIVEとDJ FILTERの組み合わせを変えて、好みの荒さを探してみよう。',tab:'fx',
  col:{h:'固定の並びを活かす',b:'フィルターを歪みの前にしたいときはトラックのEQを、後にしたいときはマスターのDJ FILTERを使う。段の選び方が、そのまま順番の選び方になる。'}}
]}),
FT({id:'cx02',pre:['ad03','cx01'],terms:['parallel','sat'],title:'並列処理',sub:'原音を残して、高域だけに歪みを足す',save:{name:'高域だけ歪ませたベース',kind:'kit'},
 tk:[KICK(),BP('原音',null),BP('歪み(並列)',{eq:E({iEqHpf:20}),sa:S({iSaType:5,iSaDrive:.8})},{tVol:.4})],steps:[
 {h:'2つのベースを聴く',b:'T2は原音のベース。T3は同じ音符を、強く歪ませた別のトラック。ad03では、歪みトラックの低域を削らずに混ぜた。ここでは、歪みのほうの低域を削って、高域だけを足してみる。',tab:'trk'},
 {h:'歪みトラックの低域を削る',b:'T3のEQの LOW CUT を400〜1500Hzにしよう。歪みトラックから低い音が消えて、荒い高域だけが残る。原音の重さには、手を付けない。',tab:'mix',mx:[{trk:3,ins:'eq',k:'iEqHpf',rng:[400,1500]}]},
 {h:'混ぜる量を決める',b:'T3のVOLを動かして、歪みを足す量を決めよう。上げるほど荒く、下げるほど原音に近づく。',tab:'mix'},
 {h:'3通りを聴き比べる',b:'原音だけ、低域を削らずに歪みを混ぜた場合、低域を削って歪みを混ぜた場合を聴き比べよう。削らない場合は、歪みの低域が重なって、低音がにごる。',tab:'mix',
  cmp:[{l:'原音だけ',mt:[2]},{l:'低域も歪ませる',tm:{3:E({iEqHpf:20})}},{l:'高域だけ歪ませる',tm:{3:E({iEqHpf:800})}}],
  quiz:qz('低音の輪郭が、いちばんすっきり保たれているのは?',3,'3が正解。歪みトラックの低域を削ると、低音は原音だけが受け持つので、輪郭が保たれる。2は歪みの低域が原音に重なり、にごりやすい。')},
 {h:'直列との違い',b:'1つのトラックにSATを挿して強く歪ませると、低域まで一緒に荒れる。並列にすれば、「どの帯域に」「どれだけ」歪みを足すかを、別々に決められる。',tab:'mix'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。T3のDRIVEを変えて、荒さの質を聴き比べてみよう。',tab:'mix',
  col:{h:'分けるほど、決められる',b:'トラックを分けると、そのぶん個別にEQやCOMPを挿せる。1つのトラックでは両立しにくい「重さ」と「荒さ」も、並列なら別々に作れる。'}}
]}),
FT({id:'cx08',pre:['ef16','cm05'],terms:['comp','eq','gr'],title:'EQ→COMP と COMP→EQ',sub:'順番で、COMPが反応する帯域が変わる',save:{name:'順番を決めたミッド',kind:'kit'},
 tk:[KICK(),BP('ベース',{eq:E({iEqB1f:250,iEqB1q:1,iEqB1g:0}),cp:C({iCpThr:-26,iCpRatio:4}),ord:{iOrd:0}})],steps:[
 {h:'同じつまみ、違う結果',b:'T2のベースには、EQとCOMPが入っている。EQの順番(ORDER)を入れ替えるだけで、同じつまみでも音が変わる。ef16では低域を使った。ここでは、中低域(250Hz付近)のBELLで確かめる。',tab:'mix'},
 {h:'中低域を持ち上げる',b:'T2のBELL1のGAINを+6〜+12dBにしよう。250Hz付近が持ち上がって、ベースが太くなる。ORDERはEQ→COMPのまま。',tab:'mix',mx:[{trk:2,ins:'eq',k:'iEqB1g',rng:[6,12]}]},
 {h:'GRメーターを見る',b:'EQ→COMPのとき、持ち上げた帯域がそのままCOMPに入る。持ち上げるほど、COMPが強く反応して、GRが増える。BELL1のGAINを上下させながら、GRメーターを見よう。',tab:'mix'},
 {h:'順番を入れ替えて聴く',b:'EQ→COMPと、COMP→EQを聴き比べよう。COMP→EQでは、先に音量をそろえてから持ち上げるので、持ち上げた分はそのまま出て、GRは変わらない。',tab:'mix',
  cmp:[{l:'EQ→COMP',tm:{2:Object.assign(E({iEqB1f:250,iEqB1q:1,iEqB1g:9}),C({iCpThr:-26,iCpRatio:4}),{iOrd:0})}},{l:'COMP→EQ',tm:{2:Object.assign(E({iEqB1f:250,iEqB1q:1,iEqB1g:9}),C({iCpThr:-26,iCpRatio:4}),{iOrd:1})}}],
  quiz:qz('持ち上げた帯域に、COMPが反応して抑えているのは?',1,'1が正解(EQ→COMP)。持ち上げた帯域がCOMPに入るので、GRが増える。2は圧縮の後で持ち上げるので、持ち上げた分はそのまま出る。')},
 {h:'カットとブーストの順番',b:'目安として、不要な帯域を削る(カット)のは先、持ち上げる(ブースト)のは後、という考え方がある。EQのBELL1のGAINを-9dBにして、EQ→COMPとCOMP→EQを聴き比べよう。カットを先にすると、COMPが不要な帯域に反応しなくなる。',tab:'mix',
  cmp:[{l:'カット→COMP',tm:{2:Object.assign(E({iEqB1f:250,iEqB1q:1,iEqB1g:-9}),C({iCpThr:-26,iCpRatio:4}),{iOrd:0})}},{l:'COMP→カット',tm:{2:Object.assign(E({iEqB1f:250,iEqB1q:1,iEqB1g:-9}),C({iCpThr:-26,iCpRatio:4}),{iOrd:1})}}]},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。曲に合わせて、順番を耳で決めよう。',tab:'mix',
  col:{h:'正解は曲が決める',b:'どちらの順番が正しい、ということはない。COMPに何を聴かせたいか(持ち上げた帯域か、元のままの音か)で選ぶ。迷ったら、両方を聴き比べよう。'}}
]})
 );
 /* ---- LS-cx2: cx03・cx09・cx10 ---- */
 var PAD={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:9000,res:0,envAmt:0,drive:0,aA:.01,aD:.2,aS:.9,aR:.15};
 var all16=function(){var q={},s=[];for(var i=0;i<16;i++){q[i]=0;if(i)s.push(i)}return{idx:q,tie:s}};
 var MD=function(o){return Object.assign({iMdOn:1,iMdType:0,iMdRate:.8,iMdDepth:.5,iMdFb:0,iMdMix:.5},o||{})};
 var PADT=function(out,mx){var a=all16();return{id:'bass',idx:a.idx,o:{name:'パッド',scale:'minor',tie:a.tie,tr:12,p:PAD,out:out,mx:mx}}};
 var BASSB=function(out,mx){return TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12],out:out,mx:mx})};
 var SBN={iCpOn:1,iCpModel:3,iCpSc:0,iCpThr:-30,iCpRatio:4,iCpAtk:10,iCpRel:150,iCpMake:0,iCpKnee:6,iCpMix:1,iCpScHpf:20,iCpScLsn:0},SBS=SD.scMix({src:0,depth:.8,key:-14,rel:120});
 SD.LESSONS.push(
FT({id:'cx03',pre:['sb01','mb03'],terms:['busc','sidechain','mband'],title:'サイドチェイン+マルチバンド',sub:'バスで沈めて、低域だけ整える',save:{name:'SCとMBの重ねがけ',kind:'kit'},
 tk:[KICK(),PADT('A'),BASSB('A')],init:{mbOn:0,mbS1:0,mbS2:0,mbS3:0,mbR1:1,mbT1:-24},steps:[
 {h:'2つの道具を重ねる',b:'T2(パッド)とT3(ベース)は BUS A に入っている。BUS A のCOMPでキックに合わせて沈める【サイドチェイン】と、マスターの【マルチバンド】で低域だけ整える方法を、重ねて使ってみる。',tab:'mix'},
 {h:'バスをキックで沈める',b:'BUS A のCOMPをONにして、SC SRC を T1 にしよう。THRESHは-30〜-20dB、RATIOは6以上、RELEASEは80〜200ms。パッドもベースも、キックの拍でそろって沈む。',tab:'mix'},
 {h:'低域だけ整える',b:'FXタブで MULTIBAND をONにして、LO の THRESH を-30dB、RATIO を4にしよう。キックとベースが重なる低域だけが抑えられて、パッドの高い音は変わらない。',f:[['mbOn',1],['mbT1',-30],['mbR1',4]],tab:'fx',tol:.1},
 {h:'3通りを聴き比べる',b:'サイドチェインだけ、マルチバンドだけ、両方を聴き比べよう。サイドチェインは、パッドの高い音まで沈む。マルチバンドは、キックの拍には合わせず、低域の音量をならす。両方使うと、うねりと低域の安定が両立する。',tab:'fx',
  cmp:[{l:'SCだけ',mt:[],bm:{A:SBS},s:{mbOn:0}},{l:'MBだけ',mt:[],bm:{A:{iCpOn:0}},s:{mbOn:1,mbT1:-30,mbR1:4}},{l:'両方',mt:[],bm:{A:SBS},s:{mbOn:1,mbT1:-30,mbR1:4}}],
  quiz:qz('パッドの高い音が、キックの拍に合わせて沈むのは?',1,'1が正解(SCだけ)。BUS A のCOMPは、パッドを帯域に関係なくまとめて沈める。2のマルチバンドは低域だけを抑えるので、パッドの高い音は沈まない。')},
 {h:'役割を分ける',b:'サイドチェインは「拍に合わせたうねり」、マルチバンドは「帯域ごとの安定」。目的が違うので、重ねても役割がぶつかりにくい。どちらも浅くして、少しずつ足そう。',tab:'fx'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。LO の RELEASE と BUS A の RELEASE をずらして、うねりの形を変えてみよう。',tab:'fx',
  col:{h:'沈めすぎない',b:'重ねるほど音量が動くので、全体が弱々しく聞こえやすい。1つずつ足して、そのたびにOFFと聴き比べよう。小さめの音量で、こまめに休もう。'}}
]}),
FT({id:'cx09',pre:['mb02','cx01'],terms:['mband'],title:'帯域別の処理',sub:'低域は中央にまとめ、高域だけ広げる',save:{name:'低域モノ・高域ワイド',kind:'kit'},
 tk:[KICK(),PADT(undefined,{md:MD({iMdMix:.6})}),BASSB(undefined)],init:{swOn:0,swWidth:1,mbOn:0,mbS1:0,mbS2:0,mbS3:0,mbR1:1,mbT1:-24},steps:[
 {h:'広げる前の音',b:'キック・パッド(T2)・ベースが鳴っている。パッドには、左右に広がる揺れ(MOD)が入っている。低い音は中央、高い音は左右、という配置をねらう。',tab:'mix'},
 {h:'全体を広げる',b:'FXタブで WIDTH をONにして、WIDTH AMT を160%にしよう。左右の差が強まるので、パッドが広がる。',f:[['swOn',1],['swWidth',1.6]],tab:'fx',tol:.1},
 {h:'広げた音の低域を削る',b:'T2のEQの LOW CUT を150〜300Hzにしよう。広げた音の低域が左右に散ると、土台が弱くなる。パッドの低域を削って、低域はキックとベースにまかせる。',tab:'mix',mx:[{trk:2,ins:'eq',k:'iEqHpf',rng:[150,300]}]},
 {h:'低域をならす',b:'FXタブで MULTIBAND をONにして、LO の THRESH を-30dB、RATIO を3にしよう。中央に集めた低域の音量がそろう。',f:[['mbOn',1],['mbT1',-30],['mbR1',3]],tab:'fx',tol:.1},
 {h:'聴き比べる',b:'広げる前、全部広げた場合、パッドの低域を削って広げた場合を聴き比べよう。',tab:'fx',
  cmp:[{l:'広げる前',tm:{2:E({iEqHpf:20})},s:{swOn:0}},{l:'全部広げる',tm:{2:E({iEqHpf:20})},s:{swOn:1,swWidth:1.6}},{l:'低域を残して広げる',tm:{2:E({iEqHpf:220})},s:{swOn:1,swWidth:1.6}}],
  quiz:qz('広がりがあって、低域が中央にまとまっているのは?',3,'3が正解。パッドの低域を削ってから広げると、低域はキックとベースだけが受け持つ。2は広げたパッドの低域が左右に散って、土台がぼやける。')},
 {h:'SOLOで確かめる',b:'MULTIBAND の LO の SOLO をONにして、低域だけを聴こう。キックとベースが中央に集まって聞こえれば成功。確かめたら、SOLOはOFFに戻す。',tab:'fx'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。WIDTH AMT を変えて、広がりの量を探してみよう。',tab:'fx',
  col:{h:'低音は中央',b:'低い音は、左右に振ると位置がつかみにくく、小さなスピーカーでは消えやすい。高い音だけ広げるのが、定番の考え方。'}}
]}),
FT({id:'cx10',pre:['cx03','cx09'],terms:['insert','mband'],title:'仕上げ演習',sub:'自分でチェーンを組んで、仕上げる',save:{name:'仕上げのチェーン',kind:'kit'},
 tk:[KICK(),PADT('A',{md:MD({iMdMix:.6})}),BASSB('A',{sa:S({iSaType:5,iSaDrive:.1})})],init:{mbOn:0,mbR1:1,mbT1:-24,swOn:0,swWidth:1,rvbMix:0,djOn:0},steps:[
 {h:'課題',b:'キック・パッド・ベースが、まだ整っていない。この演習では、ここまでに使った道具を、自分で選んで重ねていく。各段階の目標は、ふれ幅の中にあればOK。',tab:'mix'},
 {h:'ベースに荒さを足す',b:'T3(ベース)のSATのDRIVEを0.3〜0.6にしよう。ベースの輪郭が出る。',tab:'mix',mx:[{trk:3,ins:'sa',k:'iSaDrive',rng:[.3,.6]}]},
 {h:'低域をそろえる',b:'FXタブで MULTIBAND をONにして、LO の THRESH を-30dB、RATIO を4にしよう。',f:[['mbOn',1],['mbT1',-30],['mbR1',4]],tab:'fx',tol:.15},
 {h:'パッドを広げる',b:'WIDTH をONにして、WIDTH AMT を140%にしよう。低域がにごるときは、T2の LOW CUT を上げる。',f:[['swOn',1],['swWidth',1.4]],tab:'fx',tol:.15},
 {h:'空間を足す',b:'REVERB の MIX を20%にしよう。空間は最後に足す。',f:[['rvbMix',.2]],tab:'fx',tol:.1},
 {h:'仕上げの前後を聴く',b:'仕上げる前と、仕上げた後を聴き比べよう。変わりすぎていないかも確かめる。',tab:'fx',
  cmp:[{l:'仕上げ前',s:{mbOn:0,swOn:0,rvbMix:0},tm:{3:S({iSaType:5,iSaDrive:.1})}},{l:'仕上げ後',s:{mbOn:1,mbT1:-30,mbR1:4,swOn:1,swWidth:1.4,rvbMix:.2},tm:{3:S({iSaType:5,iSaDrive:.45})}}],
  quiz:qz('広がりと響きがあるのは?',2,'2が正解(仕上げ後)。WIDTHとREVERBが入っている。1は何も足していないので、せまくて乾いた音。')},
 {h:'レシピを保存',b:'「レシピ保存」で保存しよう。次は、自分の曲で同じ順番を試してみよう。',tab:'fx',
  col:{h:'足し算より引き算',b:'仕上げでは、足した後に、いったんOFFにして聴き比べるのが大切。効果が薄いものは外して、必要な道具だけを残そう。'}}
]})
 );

 /* ---- LS-cx3: cx04・cx05・cx06(cx07 は LS-cx4) ---- */
 var ALLN=function(){var q={},s=[];for(var i=0;i<16;i++){q[i]=0;if(i)s.push(i)}return{idx:q,o:{tie:s}}};
 var VKIT=function(){return[TK('ad04',P.bassPattern('syncop',0),'モジュレーター',{mix:{tVol:0},p:{adFmt:'on',adVowel:'a'}}),TK('bass',ALLN(),'搬送波',{scale:'minor',p:{o1Wave:'sawtooth',o1Lvl:.8,cutoff:6000,aA:.01,aD:.5,aS:.9,aR:.2}}),TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}})]};
 var BKIT=function(){return[KICK(),TK('bass',P.bassPattern('syncop',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12]}),TK('hat',P.offbeatHat(),'ハット'),TK('bass',P.walk('step'),'メロディ',{scale:'minor',tr:24,p:{o1Wave:'square',o1Lvl:.5,cutoff:3000,aA:.2,aD:.2,aS:.3,aR:.1}})]};
 SD.LESSONS.push(
FT({id:'cx04',pre:['vc02','cx01'],terms:['vocoder','carrier'],title:'声のパッド',sub:'ボコーダー→MOD→リバーブで、声のような広がり',save:{name:'声のパッド',kind:'kit'},
 tk:VKIT(),init:{vcOn:0,vcSrc:0,vcBands:2,vcAtk:5,vcRel:150,mdOn:0,mdType:0,mdMix:.5,rvbMix:0},steps:[
 {h:'材料を聴く',b:'T1は母音「あ」のリズムを刻む音(聞こえない設定)、T2はのこぎり波の持続音(【搬送波】)。ボコーダーで声のような音にして、揺らしと響きで、パッドに仕上げる。',tab:'trk'},
 {h:'1段目: 声にする',b:'FXタブで VOCODER をONにして、SRC を T1 にしよう。RELEASE を150msにすると、母音の変わり目がなめらかになる。',f:[['vcOn',1],['vcSrc',1],['vcRel',150]],tab:'fx',tol:20},
 {h:'2段目: 揺らして広げる',b:'MOD をONにして、MOD MIX を40%あたりにしよう(TYPEはCHORUS)。音が左右にゆらいで、1人の声が合唱のように厚くなる。',f:[['mdOn',1],['mdType',0],['mdMix',.4]],tab:'fx',tol:.1},
 {h:'3段目: 響きを足す',b:'REVERB の MIX を35%にしよう。声のパッドが、広い空間に溶ける。',f:[['rvbMix',.35]],tab:'fx',tol:.1},
 {h:'足す順に聴き比べる',b:'ボコーダーだけ、MODを足した場合、さらにリバーブを足した場合を聴き比べよう。',tab:'fx',
  cmp:[{l:'ボコーダーだけ',s:{vcOn:1,vcSrc:1,mdOn:0,rvbMix:0}},{l:'+MOD',s:{vcOn:1,vcSrc:1,mdOn:1,mdMix:.4,rvbMix:0}},{l:'+MOD+リバーブ',s:{vcOn:1,vcSrc:1,mdOn:1,mdMix:.4,rvbMix:.35}}],
  quiz:qz('左右に広がって、いちばん厚く聞こえるのは?',3,'3が正解。MODで音が揺れて厚くなり、リバーブで空間に広がる。1はボコーダーだけなので、細くて乾いている。')},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。MODのRATEや、REVERBのサイズを変えて、パッドの広がり方を探してみよう。',tab:'fx',
  col:{h:'声は、足しすぎると濁る',b:'揺らしと響きを足すほど、母音の輪郭がぼやける。足すたびにOFFと聴き比べて、言葉らしさが残るところで止めよう。'}}
]}),
FT({id:'cx05',pre:['gl03','rv03'],terms:['glitch','reverse','tapestop'],title:'ブレイクの演出',sub:'グリッチ・リバース・TAPE STOPを重ねる',save:{name:'ブレイクの演出',kind:'kit'},
 tk:BKIT(),init:{glOn:0,glLen:3,glProb:0,glRep:4,glRev:.25,glPitch:1,glMix:1,rbOn:0,rbLen:3,rbMix:0,rbFb:0,tsOn:0,tsSpeed:1},steps:[
 {h:'ふつうの流れ',b:'キック・ベース・ハット・メロディが鳴っている。曲の流れを一度崩す「ブレイク」の演出を、3つの道具で作る。まず、何も足していない音を聴こう。',tab:'trk'},
 {h:'1つ目: グリッチで崩す',b:'GLITCH をONにして、PROB を60%にしよう。拍ごとに、くり返しや逆再生が混じって、流れが崩れる。',f:[['glOn',1],['glProb',.6]],tab:'fx',tol:.1},
 {h:'2つ目: リバースで引き込む',b:'REVERSE をONにして、MIX を40%にしよう(LENは1拍)。逆再生の音が混ざって、次の拍へ引き込まれるような動きが出る。',f:[['rbOn',1],['rbMix',.4]],tab:'fx',tol:.1},
 {h:'3つ目: TAPE STOPで止める',b:'TAPE STOP をONにして、SPEED を50%にしよう。再生が遅くなって、音程も下がる。演出の最後に使うと、音が止まる感じが出る。',f:[['tsOn',1],['tsSpeed',.5]],tab:'fx',tol:.1},
 {h:'重ね方を聴き比べる',b:'何もなし、グリッチ+リバース、3つ全部を聴き比べよう。重ねるほど、ふつうの流れから遠ざかる。',tab:'fx',
  cmp:[{l:'何もなし',s:{glOn:0,rbOn:0,tsOn:0}},{l:'グリッチ+リバース',s:{glOn:1,glProb:.6,rbOn:1,rbMix:.4,tsOn:0}},{l:'3つ全部',s:{glOn:1,glProb:.6,rbOn:1,rbMix:.4,tsOn:1,tsSpeed:.5}}],
  quiz:qz('音程が下がって、止まりかけるように聞こえるのは?',3,'3が正解。TAPE STOPは再生速度と一緒に音程も下げる。1と2にはTAPE STOPが入っていない。')},
 {h:'使いどころ',b:'3つを同時に鳴らし続けると、ただ荒れるだけになる。演出では、短い時間だけ重ねて、終わったら元に戻す。時間で動かす方法は、オートメーションの課程で学べる。',tab:'fx'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。PROBとSPEEDを変えて、崩れ方を探してみよう。',tab:'fx',
  col:{h:'引き算で演出する',b:'ブレイクの演出は、足すだけでなく、音を抜くことでも作れる。崩したあと、いったん静かにして、次の場面で全部戻すと、落差が効く。'}}
]}),
FT({id:'cx06',pre:['ps03','ef09'],terms:['pshift','delay'],title:'ピッチ+ディレイのきらめき',sub:'オクターブ上とディレイで、シマー風(近似)',save:{name:'きらめきのパッド',kind:'kit'},
 tk:[TK('bass',ALLN(),'パッド',{scale:'minor',tr:12,p:PAD}),KICK()],init:{psOn:0,psSh:0,psMix:1,dlyMix:0,dlyFb:.3,rvbMix:0},steps:[
 {h:'ふつうのパッド',b:'T1はパッド、T2はキック。パッドに、1オクターブ上の音とディレイを足して、きらめく響きを作る。本物のシマー(上げた音を何度も上げ直す)ではなく、その近似。まず、何も足していない音を聴こう。',tab:'trk'},
 {h:'1段目: オクターブ上を足す',b:'PITCH をONにして、SHIFT を+12、MIX を40%にしよう。原音の上に、1オクターブ上の音が薄く重なる。',f:[['psOn',1],['psSh',12],['psMix',.4]],tab:'fx',tol:.1},
 {h:'2段目: ディレイで繰り返す',b:'DELAY の MIX を35%、FEEDBACK を50%にしよう。オクターブ上の音も含めて、繰り返される。',f:[['dlyMix',.35],['dlyFb',.5]],tab:'fx',tol:.1},
 {h:'3段目: 響きで包む',b:'REVERB の MIX を30%にしよう。繰り返しが空間に溶けて、きらめきが広がる。',f:[['rvbMix',.3]],tab:'fx',tol:.1},
 {h:'足す順に聴き比べる',b:'パッドだけ、オクターブ上を足した場合、ディレイとリバーブまで足した場合を聴き比べよう。',tab:'fx',
  cmp:[{l:'パッドだけ',s:{psOn:0,dlyMix:0,rvbMix:0}},{l:'+オクターブ上',s:{psOn:1,psSh:12,psMix:.4,dlyMix:0,rvbMix:0}},{l:'+ディレイ+リバーブ',s:{psOn:1,psSh:12,psMix:.4,dlyMix:.35,dlyFb:.5,rvbMix:.3}}],
  quiz:qz('高い音が繰り返されて、きらめいて聞こえるのは?',3,'3が正解。オクターブ上の音が、ディレイで繰り返される。2は高い音が1回鳴るだけで、繰り返されない。')},
 {h:'近似の限界',b:'本物のシマーは、繰り返しのたびに音が上がり続ける。この組み合わせでは、上げるのは1回だけで、繰り返しの音はそのまま同じ高さ。それでも、きらめきの雰囲気は出せる。',tab:'fx'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。SHIFTを+7や+19にして、響きの色の違いを聴こう。',tab:'fx',
  col:{h:'ピッチシフトの質',b:'ピッチシフトは、音を切り貼りして高さを変えるので、少し荒れる。MIXを半分以下にすると、荒れが目立たず、きらめきだけが残る。'}}
]})
 );

 /* ---- LS-cx4: cx07 ---- */
 SD.LESSONS.push(
FT({id:'cx07',pre:['sp02','cx01'],terms:['spfreeze'],title:'凍らせて空間へ',sub:'FREEZEで一瞬を止めて、リバーブに溶かす',save:{name:'凍らせて空間へ',kind:'kit'},
 tk:BKIT(),init:{spOn:0,spMode:0,spAmt:0,spFz:0,spMix:1,rvbMix:0},steps:[
 {h:'ふつうの流れ',b:'キック・ベース・ハット・メロディが鳴っている。メロディの響きを一瞬で止めて、そのまま空間に溶かす方法を作る。SPECTRALは重いエフェクトなので、使うときだけONにしよう。',tab:'trk'},
 {h:'1段目: SPECTRALを準備する',b:'FXタブで SPECTRAL をONにして、AMOUNT を0にしよう。音は変わらない。準備ができた状態。',f:[['spOn',1],['spAmt',0]],tab:'fx',tol:.02},
 {h:'2段目: 凍らせる',b:'再生しながら、好きなタイミングで FREEZE をONにしよう。その瞬間の響きが止まって、鳴り続ける。曲が進んでも、凍らせた響きは変わらない。',f:[['spFz',1]],tab:'fx'},
 {h:'3段目: 空間に溶かす',b:'REVERB の MIX を40%にしよう。凍らせた響きが、広い空間に溶ける。止まった音が、背景の雰囲気に変わる。',f:[['rvbMix',.4]],tab:'fx',tol:.1},
 {h:'足す順に聴き比べる',b:'通常、FREEZEだけ、FREEZE+リバーブを聴き比べよう。FREEZEだけでも、響きは止まって鳴り続ける。リバーブを足すと、その輪郭がやわらいで、空間に広がる。',tab:'fx',
  cmp:[{l:'通常',s:{spOn:1,spAmt:0,spFz:0,rvbMix:0}},{l:'FREEZEだけ',s:{spOn:1,spAmt:0,spFz:1,rvbMix:0}},{l:'FREEZE+リバーブ',s:{spOn:1,spAmt:0,spFz:1,rvbMix:.4}}],
  quiz:qz('響きが止まって鳴り続け、空間にも広がっているのは?',3,'3が正解。FREEZEで響きを保持して、リバーブで空間に広げている。2は保持されるが、空間の広がりは足されていない。')},
 {h:'FREEZEを戻す',b:'FREEZE をOFFにしよう。入力の音に戻る。凍らせるのは短い時間だけにして、場面の切り替えで戻すと、めりはりがつく。',f:[['spFz',0]],tab:'fx'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。FREEZEのタイミングを変えて、凍る音の違いを聴こう。',tab:'fx',
  col:{h:'何を凍らせるか',b:'凍らせる音は、ONにした瞬間の音で決まる。和音が鳴っている瞬間を選ぶと厚いパッドに、単音の瞬間を選ぶと細い持続音になる。耳でタイミングを探そう。'}}
]})
 );
 /* ---- OR-4: cx11・cx12(トラックの並べ替え・2段目。mix.ord / `_2`) ---- */
 var OD=SD.ORDDEF,OSA=['gt','cp','ds','sa','eq','md'],OE2=SD.ordAdd(OD,'eq');
 var E2=function(o){var r={};Object.keys(E(o)).forEach(function(k){r[k+'_2']=E(o)[k]});return r};
 SD.LESSONS.push(
FT({id:'cx11',pre:['cx08','cx01'],terms:['insert','sat','eq'],title:'順序で音が変わる',sub:'EQで持ち上げてから歪ませるか、歪ませてから持ち上げるか',save:{name:'順番を決めたベース',kind:'kit'},
 tk:[KICK(),BP('ベース',{eq:E({iEqB1f:500,iEqB1q:1,iEqB1g:0}),sa:S({iSaType:5,iSaDrive:.2})})],steps:[
 {h:'同じ2つ、順番だけ違う',b:'T2のベースには、EQとSATが入っている。トラックのインサートは、上から下へ順に通る。並び順を入れ替えると、同じつまみでも音が変わる。',tab:'mix'},
 {h:'EQで中域を持ち上げる',b:'T2のEQのBELL1のGAINを+6〜+12dBにしよう。中域が持ち上がって、ベースが前に出る。並びはEQ→SATのまま。',tab:'mix',mx:[{trk:2,ins:'eq',k:'iEqB1g',rng:[6,12]}]},
 {h:'SATを効かせる',b:'T2のSATのDRIVEを0.3〜0.6にしよう。EQで持ち上げた帯域が、そのまま歪みに入る。持ち上げた帯域ほど、強く歪む。',tab:'mix',mx:[{trk:2,ins:'sa',k:'iSaDrive',rng:[.3,.6]}]},
 {h:'並び順を入れ替えて聴く',b:'INSERT画面の「並び順」で、SATをEQの上に動かすと、SAT→EQの並びになる(▲▼で動かす)。先に歪ませてから持ち上げるので、持ち上げた分は歪まずにそのまま出る。EQ→SATとSAT→EQを聴き比べよう。',tab:'mix',
  cmp:[{l:'EQ→SAT',tm:{2:Object.assign(E({iEqB1f:500,iEqB1q:1,iEqB1g:9}),S({iSaType:5,iSaDrive:.5}),{ord:OD})}},{l:'SAT→EQ',tm:{2:Object.assign(E({iEqB1f:500,iEqB1q:1,iEqB1g:9}),S({iSaType:5,iSaDrive:.5}),{ord:OSA})}}],
  quiz:qz('持ち上げた中域が、歪みの中に入っているのは?',1,'1が正解(EQ→SAT)。持ち上げた帯域がそのまま歪みに入るので、その帯域が荒くなる。2は歪ませた後で持ち上げるので、持ち上げた分は歪まない。')},
 {h:'使い分ける',b:'目安として、歪みの質を決めたいときはEQを前に置く(どの帯域を歪ませるか選ぶ)。歪んだ後の音色を整えたいときはEQを後ろに置く。並べ替えは、音が途切れないよう短いフェードでつなぎ替わる。オートメーションでは動かせない。',tab:'mix'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。ほかのインサートでも並びを入れ替えて、音の変わり方を聴こう。',tab:'mix',
  col:{h:'順番は音色の一部',b:'つまみの値が同じでも、並びが違えば別の音になる。迷ったら、両方の並びを聴き比べて、耳で選ぶのが近道。'}}
]}),
FT({id:'cx12',pre:['cx11','eq01'],terms:['insert','eq'],title:'同じEQを2段',sub:'1つ目は低域用、2つ目は高域用。傾きも急になる',save:{name:'EQ2段のベース',kind:'kit'},
 tk:[KICK(),BP('ベース',{eq:E({iEqHpf:20})},Object.assign({ord:OE2},E2({iEqHpf:20})))],steps:[
 {h:'EQが2つ並んでいる',b:'T2のベースには、EQが2段入っている(INSERT画面の並び順で、EQの横の+を押すと2段目が入る。最大2段まで)。1段目は低域、2段目は高域を受け持たせる。',tab:'mix'},
 {h:'1段目で低域を整える',b:'1段目のLOW CUTを80〜200Hzにしよう。キックと重なる低い音が減って、ベースの低域がすっきりする。',tab:'mix',mx:[{trk:2,ins:'eq',k:'iEqHpf',rng:[80,200]}]},
 {h:'2段目で高域を整える',b:'INSERT画面でEQを開き、「EQ 2」のHIGHを-12〜-6dBにしよう。高い音がやわらぐ。1段目には触らずに、高域だけを別に調整できる。',tab:'mix',mx:[{trk:2,ins:'eq',k:'iEqHg_2',rng:[-12,-6]}]},
 {h:'2段重ねると急になる',b:'1段目と2段目の両方で、LOW CUTを同じ位置にすると、削る傾きが急になる。1段だけの場合と聴き比べよう。',tab:'mix',
  cmp:[{l:'1段だけ',tm:{2:Object.assign(E({iEqHpf:150}),{ord:OD})}},{l:'2段で重ねる',tm:{2:Object.assign(E({iEqHpf:150}),E2({iEqHpf:150}),{ord:OE2})}}],
  quiz:qz('低い音がいちばん深く削れているのは?',2,'2が正解。同じ位置のLOW CUTを2段重ねると、傾きが倍になって、低い音がより深く減る。')},
 {h:'段数の上限',b:'同じインサートは2段まで、1トラックの合計は8つまで。重いインサート(COMPなど)を増やすと、負荷:高と表示される。×で2段目を外すと、2段目の値は捨てられる。',tab:'mix'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。2段目に別の役割(中域のベルなど)を持たせて、使い分けを試そう。',tab:'mix',
  col:{h:'2段にする理由',b:'1つのEQでも多くのことができる。2段にするのは、傾きを急にしたいとき、役割を分けて管理したいとき。増やしすぎず、必要な分だけにする。'}}
]})
 );
})();
