/* v7.10a VO 歌もの(vo01〜vo08。vo05〜vo08 は v7.10a 後半)。声は同梱しない: T4 は声の代役(合成音 vo_a)。学べるのは「声という役割の置き方」(帯域・ダイナミクス・位置・空間・隙間)。
   すべて TRK+MIXタブ(トラック別インサート EQ4/COMP)。聞き比べ cmp の tm=トラック別インサートの値(トラック番号は1始まり)。声のトラックは EQ と COMP の全つまみを書く(VS)。
   g(音量補正dB)は tools/vo-cal.js(オフライン描画の測定)で出した値を GT に入れる。test/vo.js が差1dB以内・mt(GR)が達成できること・claim を検査する。
   声の代役(アディティブ)は node の描画環境で鳴らせないため、測定ではノコギリ波+ローパスの近似(目安のみ)。数値は目安(SD.GUIDE の {g:} か、つまみ値と同じ数字のみ)。年号・人名・機材名は書かない */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags||['VO']})};
 A('standin','声の代役','こえのだいやく','stand-in voice','歌声の代わりに鳴らす合成音(母音「あ」など)。このアプリは歌声を同梱しない。声という「役割」の置き方(帯域・ダイナミクス・位置・空間・隙間)を学ぶためのもので、本物の声の質感・息づかいは再現できない。',['vo01'],['VO']);
 A('vchain','声のチェーン','こえのちぇーん','vocal chain','声に掛けるエフェクトの並び。ローカット→EQ→コンプ→(ディエッサー)→リバーブ/ディレイ、が基本の流れ。順番しだいで効き方が変わる。',['vo02'],['VO']);
  A('deesser','ディエッサー','でぃえっさー','de-esser','サ行など、耳に刺さる高域(歯擦音)だけを、その瞬間だけ抑えるエフェクト。声全体は暗くならず、検出した帯域だけが下がる。',['vo05'],['VO']);
  A('sibil','歯擦音','しさつおん','sibilance','サ行(シ・スなど)の、息が歯の間を抜けるときの鋭い高域のノイズ。マイクやコンプで強調されると、耳に刺さる。',['vo05'],['VO']);
  A('ride','ライド','らいど','riding the fader','フェーダー(音量)を、曲を聴きながら手で動かして、強い所は下げ・弱い所は上げて、音量をそろえること。コンプが拾いにくい大きな流れを整える。',['vo06'],['VO']);
  A('breath','ブレス','ぶれす','breath','歌の合間の息継ぎの音。多すぎると耳につき、消しすぎると不自然になる。',['vo06'],['VO']);
  A('dubl','ダブル','だぶる','double tracking','同じ歌をもう1回重ねて(または声をコピーして)、厚みと広がりを出すこと。主役の声より小さく・少し暗く・左右に置くのが基本。',['vo09'],['VO']);
  A('harmony','ハモリ','はもり','harmony vocal','主旋律に重ねる、高さの違う声(3度上など)。リードより後ろに置き、主役の邪魔をしない。',['vo09'],['VO']);
  A('vcallresp','コール&レスポンス','こーるあんどれすぽんす','call and response','呼びかけ(声)と応え(楽器)を、交互に置く作り方。声のない隙間に、シンセやハットで応える。',['vo12'],['VO']);
   A('sharerev','共有リバーブ','きょうゆうりばーぶ','shared reverb','複数のトラックを、同じリバーブに送って(センド)、同じ空間に置く使い方。送りの量で、手前・奥が決まる。別々のリバーブにすると、別の空間に置ける。',['vo13'],['VO']);
  A('telvoice','電話声','でんわごえ','telephone voice','低域と高域を大きく削って、中域だけを残した声。電話や小さなラジオのような音になる。音色の演出に使う。',['vo14'],['VO']);
  A('vocoder','ボコーダー','ぼこーだー','vocoder','声の周波数の山(フォルマント)の動きを、別の音(シンセなど)に移して、シンセがしゃべっているように聞かせる機材。このアプリのものは、母音を固定の山で作る近似で、声の動きは移せない。',['vo15'],['VO']);
var P=SD.PATS,TK=P.tk;
 var z=function(a){var q={};a.forEach(function(i){q[i]=0});return q},all16=function(){var q={};for(var i=0;i<16;i++)q[i]=0;return q},sus=[1,2,3,4,5,6,7,9,10,11,12,13,14,15];
 SD.CATS.push({id:'vo1',synth:'analog',chapter:'course',course:'VO',name:'VO 歌もの'});
  SD.CATS.push({id:'vo2',synth:'add',chapter:'course',course:'VO',name:'VO 歌もの(母音シンセ)'});
 /* 聞き比べの音量補正 g(dB)。キー '<レッスン>s<ステップ>' + 番号。値は tools/vo-cal.js が出す(0=補正なし) */
 var GT={'vo01s21':-0.1,'vo01s22':0,'vo01s41':0,'vo01s42':-4.2,'vo01s51':-0.7,'vo01s52':0,'vo02s11':0,'vo02s12':-3.9,'vo02s31':-0.3,'vo02s32':0,'vo02s51':0,'vo02s52':-0.6,'vo03s11':-0.3,'vo03s12':0,'vo03s31':-0.3,'vo03s32':0,'vo03s41':0,'vo03s42':-0.1,'vo03s71':0,'vo03s72':-0.1,'vo04s11':0,'vo04s12':-2.6,'vo04s13':-5.9,'vo04s31':0,'vo04s32':-0.7,'vo04s41':0,'vo04s42':-4.2};
 var cm=function(key,items){return items.map(function(it,i){var o=Object.assign({l:it[0]},it[1]);var g=GT[key+(i+1)];if(g!==undefined)o.g=g;return o})};
 /* トラック別インサートの状態(全つまみ。既定+指定)。EQ=E・COMP=CP。OFF=COMPなし */
 var E=function(o){return Object.assign({iEqOn:1,iEqHpf:20,iEqLpf:20000,iEqLf:200,iEqLg:0,iEqB1f:250,iEqB1g:0,iEqB1q:1,iEqB2f:2500,iEqB2g:0,iEqB2q:1,iEqHf:4000,iEqHg:0},o||{})};
 var CPD={iCpOn:1,iCpModel:3,iCpThr:-24,iCpRatio:3,iCpAtk:10,iCpRel:250,iCpMake:0,iCpKnee:6,iCpMix:1,iCpScHpf:20};
 var CP=function(o){return Object.assign({},CPD,o||{})},OFF={iCpOn:0},NO=CP({iCpThr:0,iCpRatio:1});/* NO=入っているが何も抑えない */
 /* 声のトラックの状態: EQ(全つまみ)+COMP(null=OFF)+並び(ord=1で COMP→EQ) */
 var VS=function(eq,cp,ord){return Object.assign({},E(eq),cp===null?OFF:CP(cp),{iOrd:ord?1:0})};
 var VCP={iCpThr:-30,iCpRatio:3,iCpAtk:15,iCpRel:200,iCpMake:3};/* 声の「ふつう」のコンプ(cm09 と同じ。GRは3〜6dB付近) */
 var BASS={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:.3,noiseLvl:0,fType:'lowpass',cutoff:700,res:.1,envAmt:.3,drive:0,aA:.004,aD:.25,aS:.7,aR:.1};
 var PAD={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:9000,res:0,envAmt:0,drive:0,aA:.01,aD:.2,aS:.9,aR:.15};
 var withM=function(t,mx,mix){t.o.mx=mx;if(mix)t.o.mix=Object.assign({},t.o.mix||{},mix);return t};
 var KIK=function(mix){return withM(TK('kick',P.fourFloor(),'キック'),{eq:E()},mix)};
 var BAS=function(mix){return withM(TK('bass',P.bassPattern('root',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12]}),{eq:E()},mix)};
 var PADT=function(mix){return withM({id:'bass',idx:all16(),o:{name:'パッド',scale:'minor',tie:sus,p:PAD,tr:12}},{eq:E()},mix)};
 /* 声の代役(T4)。EQ と COMP(何も抑えない状態)を入れて始める。pan=初期のPAN */
 var VOX=function(pan,cp,mix){return withM(TK('vo_a',{idx:{0:0,3:2,6:3,8:2,11:0,14:-2},o:{}},'声(代役)',{acc:[0,3,8]}),{eq:E(),cp:cp||NO},Object.assign({},pan?{tPan:pan}:null,mix||null))};
  /* vo05〜: DE-ESS(ds)。DSI=最初の状態(ONだが何も抑えない。検出帯域は低すぎる所から)。DS(o)=全つまみ */
  var DSI={iDsOn:1,iDsFreq:3500,iDsThr:0,iDsAmt:0,iDsListen:0},DS=function(o){return Object.assign({iDsOn:1,iDsFreq:6500,iDsThr:-30,iDsAmt:6,iDsListen:0},o||{})};
  var SHI=function(){return withM(TK('vo_shi',{idx:{1:0,5:0,9:0,13:0},o:{}},'声(シ)',{acc:[1,9]}),{eq:E(),ds:DSI})};
  var BRT=function(){return withM(TK('vo_breath',{idx:{5:0,13:0},o:{}},'声(息)'),{eq:E()})};
  var VI={0:0,3:2,6:3,8:2,11:0,14:-2};
  var DBL=function(){var t=withM(TK('vo_a',{idx:VI,o:{}},'ダブル',{acc:[0,3,8]}),{eq:E(),cp:NO},{tPan:0,tVol:1});return t};
  var HRM=function(){var q={};Object.keys(VI).forEach(function(k){q[k]=VI[k]+4});return withM(TK('vo_a',{idx:q,o:{}},'ハモリ',{acc:[0,3,8]}),{eq:E(),cp:NO},{tPan:0,tVol:1})};
  var LDP=function(idx,name,mix){return withM({id:'bass',idx:idx,o:{name:name,scale:'minor',p:{o1Wave:'square',o1Lvl:.3,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:3000,res:.1,envAmt:0,drive:0,aA:.002,aD:.15,aS:.1,aR:.1},tr:12}},{eq:E()},mix)};
  /* v7.10b 後半: 声のトラックの tm 用(EQ・COMP・ORDER の全つまみ+追加)・SAT・マスターFX */
 var VR=function(o){return Object.assign(VS(),o||{})};
 var SA=function(o){return Object.assign({iSaOn:1,iSaType:1,iSaDrive:.3,iSaTone:20000,iSaMix:1,iSaOut:0},o||{})},SAOFF={iSaOn:0};
 var withSA=function(t,sa){t.o.mx.sa=sa;return t};
 var TM=function(id,pts,trk){return{id:id,trk:trk===undefined?'M':trk,pts:pts}};
 var DJ=function(o){return Object.assign({djOn:1,djFilter:0,djRes:.2,afOn:0,dlyMix:0,rvbMix:0},o)};
 var BC=function(o){return Object.assign({bcOn:0,bcBits:8,bcRate:1,bcMix:1,rmOn:0},o)};
 var RM=function(o){return Object.assign({bcOn:0,rmOn:1,rmFreq:150,rmMix:.5},o)};
 var NS={tDly:0,tRvb:0},L4=1536;/* 送り無し・4小節(tick) */
  var DLm=function(o){return Object.assign({dlyMix:.35,dlyFb:.3,dlySync:1,dlyDiv:4,dlyTime:.3,dlyTone:4500,dlyPP:0,dlyMode:1,dlDuckOn:0,rvbMix:0,swOn:0},o)};
  var RVm=function(o){return Object.assign({rvbMix:.35,rvbType:2,rvbSize:1.8,rvbPre:0,rvbDamp:.5,rvDuckOn:0,dlyMix:0,swOn:0},o)};
 var qz=function(q,ans,ex){return {q:q,ans:ans,ex:ex}};
 var MX=function(trk,k,lo,hi,ins){return {trk:trk,ins:ins||'eq',k:k,rng:[lo,hi]}};
 var base=function(o){return Object.assign({cat:'vo1',synth:'analog',lv:2,course:'VO',mode:'trk',tab:'trk',oct:-1,demo:{n:[33]},kind:'recipe',ts:4},o)};
 var RV={dlyMix:0,rvbMix:.4,rvbType:2,rvbSize:1.6,rvbPre:0,rvbDamp:.5,swOn:0};
 SD.LESSONS.push(
/* ---------------- vo01 ---------------- */
base({id:'vo01',pre:['fq08'],terms:['standin','mask','mainband','dyn','pancenter'],title:'歌ものは声が主役',sub:'声の帯域・ダイナミクス・位置。伴奏は脇役',save:{name:'声が主役のミックス',kind:'kit'},
 tk:[KIK(),BAS(),PADT(),VOX(.35)],steps:[
 {h:'T4は声の代役',b:'歌ものは、声が主役。T4は声の代役(合成音の「あ」)で、本物の歌声は入っていない。【声の代役】で学べるのは、声という「役割」の置き方(帯域・ダイナミクス・位置・空間・隙間)。声の質感や息づかいそのものは、代役では学べない。\\\\nまず、伴奏だけの音と、声が入った音を聞き比べよう。声が入ると、聞く場所が自然に声へ向かう。',tab:'mix',
  cmp:[{l:'伴奏だけ',mt:[3]},{l:'声も入れる',mt:[]}]},
 {h:'声の居場所(帯域)',b:'声の【主帯域】は、太さ({g:vocal.keep0})・明瞭さ({g:vocal.keep1})・空気感({g:vocal.keep2})。まず低域の整理。T4のLOW CUTを{g:vocal.hpf}にしよう。声の低い所は、ほかの音と重なりやすい。',
  mx:[MX(4,'iEqHpf',80,120)],cmp:cm('vo01s2',[['ローカットなし',{tm:{4:VS()}}],['ローカットあり',{tm:{4:VS({iEqHpf:100})}}]])},
 {h:'声の位置(センター)',b:'声は、ふつう中央({g:vocal.pan})に置く。最初、T4は少し右に寄っている。PANを真ん中に戻そう(ほぼ中央でよい)。聞き手の正面にいるから、声は主役として落ち着く。',
  mx:[MX(4,'tPan',-.05,.05,'mix')]},
 {h:'声のダイナミクス',b:'歌は、強く歌う音と弱く歌う音の差が大きい。小さい所は伴奏に埋もれ、大きい所は飛び出す。T4のCOMPのTHRESHを-36〜-26dB、RATIOを2.5〜4にして、差を縮めよう。声のGRの目安は{g:dyn.grVocal}(曲や音色で変わる)。メーターを見ながら探す。',
  mx:[MX(4,'iCpThr',-36,-26,'cp'),MX(4,'iCpRatio',2.5,4,'cp')],mt:[{trk:4,m:'gr',rng:[2,8],hold:1.5}],
  cmp:cm('vo01s4',[['COMPなし',{tm:{4:VS({},null)}}],['COMPあり',{tm:{4:VS({},VCP)}}]])},
 {h:'伴奏は脇役',b:'声が主役なら、伴奏は、声のための場所を空ける脇役。パッド(T3)のLOW CUTを{g:pad.hpf}にして、低域を整理しよう。パッドの低域はベースと重なる。ぶつからない帯域をあらかじめ空けておくのが、歌もののミックスの出発点。',
  mx:[MX(3,'iEqHpf',100,200)],
  cmp:cm('vo01s5',[['整理前',{tm:{3:E()}}],['整理後',{tm:{3:E({iEqHpf:150})}}]]),
  quiz:qz('声が聞き取りやすいのは?',2,'2が正解。パッドの低域を整理すると、ベースや声の低い所と重なる帯域が減り、声の場所が空く。1は低域でぶつかっている。')},
 {h:'役割を決めてから整える',b:'歌ものでは、先に「主役は声」と決めてから、各トラックを整えると迷いにくい。声=帯域・ダイナミクス・位置を整える。伴奏=声の邪魔をしない。レシピ保存で、この声と伴奏のセットを残せる。',
  col:{h:'声の代役の限界',b:'この代役は合成音なので、声の子音の鋭さや息、強さの変化による音色の変化は含まれない。ここで身につくのは、置き方の考え方。本物の声は、取り込み素材(vo16)で試せる。自分が権利を持つ音声だけを使うこと。'}}
]}),
/* ---------------- vo02 ---------------- */
base({id:'vo02',pre:['vo01'],terms:['vchain','hpf','comp','gr','send','insert','predly'],title:'声の基本チェーン',sub:'ローカット→EQ→コンプ→(ディエッサー)→リバーブ/ディレイ',save:{name:'声の基本チェーン',kind:'kit'},init:RV,
 tk:[KIK(),BAS(),PADT(),VOX(0)],steps:[
 {h:'声の【声のチェーン】',b:'声に掛けるエフェクトには、基本の並びがある。ローカット→EQ→コンプ→(ディエッサー)→リバーブ/ディレイ。ここまでの前半(ローカット・EQ・コンプ)はトラックの【インサート】、後半の空間は【センド】で送る。\\\\nまず、何も掛けない声と、基本の並びを通した声を聞き比べよう。',tab:'mix',
  cmp:cm('vo02s1',[['何も掛けない',{tm:{4:VS({},null)}}],['基本の並び',{tm:{4:VS({iEqHpf:100,iEqB1f:300,iEqB1g:-2,iEqB1q:1},VCP)}}]])},
 {h:'1. ローカット',b:'最初は、いちばん安全な引き算。T4のLOW CUTを{g:vocal.hpf}にしよう。声に要らない低域を、いちばん手前で消しておく。',mx:[MX(4,'iEqHpf',80,120)]},
 {h:'2. EQで濁りを引く',b:'BELL1のFREQを{g:vocal.cut0}の中に置き、GAINを{g:dyn.eqStart}だけ下げよう。声のこもり・濁りが減る。Qは広め(1前後)でなだらかに。',
  mx:[MX(4,'iEqB1f',200,400),MX(4,'iEqB1g',-3,-1)],cmp:cm('vo02s3',[['EQなし',{tm:{4:VS({iEqHpf:100},VCP)}}],['濁りを引く',{tm:{4:VS({iEqHpf:100,iEqB1f:300,iEqB1g:-2,iEqB1q:1},VCP)}}]])},
 {h:'3. コンプでならす',b:'T4のTHRESHを-36〜-26dB、RATIOを2.5〜4にして、GRを{g:dyn.grVocal}あたりに。ATTACKは15〜30ms、RELEASEは120〜200msで、言葉の頭を通しつつ、息継ぎの前で戻す。',
  mx:[MX(4,'iCpThr',-36,-26,'cp'),MX(4,'iCpRatio',2.5,4,'cp'),MX(4,'iCpAtk',15,30,'cp'),MX(4,'iCpRel',120,200,'cp')],mt:[{trk:4,m:'gr',rng:[2,8],hold:1.5}]},
 {h:'順番を入れ替える',b:'EQとコンプの前後は、ORDERで変えられる。EQで低域を持ち上げてからコンプに入れると、持ち上げた所にコンプが強く反応する。逆に、コンプのあとにEQを置くと、EQの変化がそのまま耳に届く。LOWを持ち上げた声で、順番だけを変えた2つを聞き比べよう。',
  cmp:cm('vo02s5',[['EQ→COMP',{tm:{4:VS({iEqHpf:100,iEqLf:200,iEqLg:6},VCP,0)}}],['COMP→EQ',{tm:{4:VS({iEqHpf:100,iEqLf:200,iEqLg:6},VCP,1)}}]]),
  quiz:qz('コンプがより強く抑えているのは?',1,'1が正解(EQ→COMP)。EQで持ち上げた低域がコンプに入るので、コンプがそこに反応して強く抑える。2は、コンプが原音の大きさで判断し、そのあとでEQが低域を足す。')},
 {h:'4. 空間はセンドで',b:'最後に、リバーブを少しだけ足す。T4のRVB SENDを10〜30%にしよう(声のプリディレイの目安は{g:dyn.rvPre}。くわしくは vo07)。声そのものはインサートで整えて、空間はセンドで混ぜる、という分け方。',
  mx:[MX(4,'tRvb',.1,.3,'mix')],
  col:{h:'順番に「正解」は1つではない',b:'EQ→COMP が基本とされるのは、COMPが整えた音を判断できるから。ただ、COMP→EQ にして、COMPの効きを変えずにEQだけ動かしたい、という考え方もある。どちらも使えるので、聞き比べて、そのトラックに合うほうを選ぼう。'}}
]}),
/* ---------------- vo03 ---------------- */
base({id:'vo03',pre:['vo02','eq05'],terms:['hpf','lmid','pres','air','shelf','bell','cut','overlap'],title:'声のEQ',sub:'ハイパス・濁り・プレゼンス・空気感',save:{name:'整えた声のEQ',kind:'kit'},
 tk:[KIK(),BAS(),PADT(),VOX(0)],steps:[
 {h:'声のEQは4つの場所',b:'声のEQは、4つの場所を順に見る。①ハイパス(低域の整理)②濁り({g:vocal.cut0})③明瞭さ・【プレゼンス】({g:vocal.keep1})④【エア】=空気感({g:vocal.keep2})。\\\\n何も整えていない声と、4つを整えた声を聞き比べよう。',
  cmp:cm('vo03s1',[['整える前',{tm:{4:VS()}}],['整えた',{tm:{4:VS({iEqHpf:100,iEqB1f:300,iEqB1g:-2,iEqB1q:1,iEqB2f:3000,iEqB2g:2,iEqB2q:1,iEqHf:10000,iEqHg:2})}}]])},
 {h:'① ハイパス',b:'LOW CUTを{g:vocal.hpf}に。ここは声の太さ({g:vocal.keep0})を残す境目なので、上げすぎると声が細くなる。',mx:[MX(4,'iEqHpf',80,120)]},
 {h:'② 濁りを引く',b:'BELL1のFREQを{g:vocal.cut0}に置き、GAINを{g:dyn.eqStart}だけ下げる。【カット】は小さく、広めのQで。',
  mx:[MX(4,'iEqB1f',200,400),MX(4,'iEqB1g',-3,-1)],cmp:cm('vo03s3',[['引く前',{tm:{4:VS({iEqHpf:100})}}],['濁りを引いた',{tm:{4:VS({iEqHpf:100,iEqB1f:300,iEqB1g:-2,iEqB1q:1})}}]])},
 {h:'③ プレゼンスを足す',b:'BELL2のFREQを{g:vocal.keep1}に置き、GAINを{g:dyn.eqStart}だけ上げる。声が前に出て、言葉が聞き取りやすくなる。伴奏の同じ帯域を空けておくと(fq08)、少ない量で足りる。',
  mx:[MX(4,'iEqB2f',2000,5000),MX(4,'iEqB2g',1,3)],cmp:cm('vo03s4',[['足す前',{tm:{4:VS({iEqHpf:100,iEqB1f:300,iEqB1g:-2,iEqB1q:1})}}],['プレゼンスを足した',{tm:{4:VS({iEqHpf:100,iEqB1f:300,iEqB1g:-2,iEqB1q:1,iEqB2f:3000,iEqB2g:2,iEqB2q:1})}}]])},
 {h:'④ 空気感',b:'HIGH SHELFのFREQを{g:vocal.keep2}に置き、GAINを{g:dyn.eqStart}だけ上げる。息のような明るさが加わる。上げすぎると、ざらついて耳に痛くなる。',
  mx:[MX(4,'iEqHf',8000,12000),MX(4,'iEqHg',1,3)]},
 {h:'ぶつかり度で確かめる',b:'再生して、T4声と、ほかの全部の【ぶつかり度】を見よう。声の帯域を整えたぶん、声とほかの音が重なる帯域が減る。数字は目安で、耳が最終判断。',
  mt:[{trk:4,m:'ovl',rng:[0,50],hold:2}]},
 {h:'足しすぎを聴く',b:'2つを聞き比べて、足しすぎているほうを選ぼう。',
  cmp:cm('vo03s7',[['1',{tm:{4:VS({iEqHpf:100,iEqB1f:300,iEqB1g:-2,iEqB1q:1,iEqB2f:3000,iEqB2g:2,iEqB2q:1})}}],['2',{tm:{4:VS({iEqHpf:100,iEqB1f:300,iEqB1g:-2,iEqB1q:1,iEqB2f:4000,iEqB2g:10,iEqB2q:2,iEqHf:10000,iEqHg:8})}}]]),
  quiz:qz('足しすぎているのは?',2,'2が正解。プレゼンスと空気感を大きく足したので、声が硬く、ざらついて耳に痛い。足す量は、始めは1〜3dBから。'),
  col:{h:'声のEQは「引く」が先',b:'足す前に、引けるところがないか探す。引いてから足すと、少ない量で足りて、音が自然に保てる。声の聞こえ方は人やスピーカーで変わる。小さめの音量で、こまめに休みながら確かめよう。'}}
]}),
/* ---------------- vo04 ---------------- */
base({id:'vo04',pre:['vo02','cm09'],terms:['comp','dyn','gr','thresh','cratio','catk','crel'],title:'声のコンプ',sub:'軽く2段・速さ・目標GR。起伏を均しすぎない',save:{name:'整えた声のコンプ',kind:'kit'},
 claim:[{trk:4,m:'gr',rng:[2,8],cp:VCP}],
 tk:[KIK(),BAS(),PADT(),(function(){var t=VOX(0);t.o.out='C';return t})()],steps:[
 {h:'声の起伏をならす',b:'声は、起伏が大きい。【コンプレッサー】で大きい音を抑えると、小さい声も聞こえやすくなる。ただし、均しすぎると、歌の表情まで消える。COMPなし・軽め・強めを聞き比べよう。',
  cmp:cm('vo04s1',[['COMPなし',{tm:{4:VS({},null)}}],['軽め',{tm:{4:VS({},{iCpThr:-28,iCpRatio:2,iCpAtk:15,iCpRel:200,iCpMake:2})}}],['強め',{tm:{4:VS({},{iCpThr:-42,iCpRatio:8,iCpAtk:15,iCpRel:200,iCpMake:6})}}]]),
  quiz:qz('いちばん起伏が均されているのは?',3,'3が正解。THRESHが低くRATIOが高いので、ほとんどの音が強く抑えられ、強弱の差が小さくなる。')},
 {h:'目標のGR',b:'声のGR(【ゲインリダクション(GR)】)は、{g:dyn.grVocal}が始めの目安。T4のTHRESHを-36〜-26dB、RATIOを2.5〜4にして、メーターを見ながら探そう。曲や声で変わる。',
  mx:[MX(4,'iCpThr',-36,-26,'cp'),MX(4,'iCpRatio',2.5,4,'cp')],mt:[{trk:4,m:'gr',rng:[2,8],hold:1.5}]},
 {h:'速さ(ATTACKとRELEASE)',b:'ATTACKを速くすると、言葉の頭が抑えられて、こもって聞こえる。ATTACKを15〜30ms、RELEASEを120〜200msにして、頭を通しつつ、息継ぎの前で戻す。',
  mx:[MX(4,'iCpAtk',15,30,'cp'),MX(4,'iCpRel',120,200,'cp')],cmp:cm('vo04s3',[['ATTACK 速い',{tm:{4:VS({},{iCpThr:-30,iCpRatio:3,iCpAtk:.5,iCpRel:200,iCpMake:3})}}],['ATTACK 遅め',{tm:{4:VS({},VCP)}}]])},
 {h:'均しすぎを聴く',b:'2つを聞き比べて、起伏が失われて平らに聞こえるほうを選ぼう。',
  cmp:cm('vo04s4',[['1',{tm:{4:VS({},VCP)}}],['2',{tm:{4:VS({},{iCpThr:-50,iCpRatio:12,iCpAtk:3,iCpRel:80,iCpMake:12})}}]]),
  quiz:qz('平らに聞こえるのは?',2,'2が正解。小さい音まで強く抑えて持ち上げたので、強弱が消える。1は、必要なところだけ抑えている。')},
 {h:'軽く2段(トラック+BUS)',b:'強く1回より、軽く2回のほうが自然、という考え方がある。T4の出力先はBUS Cにしてある。トラックのCOMPは軽め(GR {g:dyn.grVocal}の手前)にして、BUS CのCOMPで、声全体をもう少しまとめてみよう。BUS Cは MIX画面の BUS 区画で操作する。どちらも、効きすぎないように。',
  col:{h:'均しすぎない勇気',b:'コンプは、音量を整える道具だけれど、表情を平らにもしてしまう。「少し物足りない」くらいで止めて、小さめの音量で聞き比べるのが目安。大きい音は「良く」聞こえやすいので、聞き比べは音量をそろえる。'}}
]}),

/* ---------------- vo05 ---------------- */
base({id:'vo05',pre:['vo04'],terms:['deesser','sibil','vchain','insert'],title:'ディエッサー',sub:'サ行の刺さりを、その瞬間だけ抑える',save:{name:'ディエッサーを掛けた声',kind:'kit'},
 tk:[KIK(),PADT(),SHI(),VOX(0)],steps:[
 {h:'サ行は刺さる',b:'歌の「サ行」(シ・スなど)には、息が歯の間を抜ける鋭い高域のノイズがある。これが【歯擦音】。コンプで声を持ち上げたり、EQで高域を足したりすると、とくに耳に刺さる。それを、その瞬間だけ抑えるのが【ディエッサー】。\\\\n声の代役は、母音の「あ」(T4)と、サ行の「シ」(T3)が別のトラック。本物の声では1本の声に混ざるので、そこに1つ掛ける。ここでは、T3(シ)にディエッサーを掛けて練習する。まず、なしと、ありを聞き比べよう。',tab:'mix',
  cmp:cm('vo05s1',[['ディエッサーなし',{tm:{3:{iDsOn:0}}}],['ディエッサーあり',{tm:{3:DS({iDsFreq:6500,iDsThr:-34,iDsAmt:10})}}]])},
 {h:'1. 検出帯域を合わせる',b:'ディエッサーは、「検出帯域」の音がしきい値を超えた瞬間だけ、その帯域を下げる。T3のDS FREQを、歯擦音の帯域({g:vocal.cut1})に合わせよう。最初は低すぎる所(3.5kHz)に置いてある。DS LISTEN を ON にすると、検出帯域だけが聴ける。サ行が鳴っている帯域を探して、合ったら OFF に戻す。',
  mx:[MX(3,'iDsFreq',5000,9000,'ds')]},
 {h:'2. THRESH: どこから抑えるか',b:'DS THRESH は、検出帯域の音がこれを超えたときだけ抑える、という境目。0dB(最大)では何も起きない。下げるほど、小さいサ行まで抑える。T3のDS THRESHを、-45〜-28dBのあたりに置こう。',
  mx:[MX(3,'iDsThr',-45,-28,'ds')],cmp:cm('vo05s3',[['THRESH 高め(ほぼ効かない)',{tm:{3:DS({iDsThr:-12,iDsAmt:10})}}],['THRESH 低め(しっかり効く)',{tm:{3:DS({iDsThr:-38,iDsAmt:10})}}]])},
 {h:'3. AMOUNT: 抑える量の上限',b:'DS AMOUNT は、抑える量の上限。0dBだと何も変わらない。サ行が気にならなくなる、ぎりぎりの量(4〜10dB)から始めよう。3つを聞き比べて、いちばん抑えているものを選ぼう。',
  mx:[MX(3,'iDsAmt',4,10,'ds')],cmp:cm('vo05s4',[['AMOUNT 3dB',{tm:{3:DS({iDsThr:-38,iDsAmt:3})}}],['AMOUNT 8dB',{tm:{3:DS({iDsThr:-38,iDsAmt:8})}}],['AMOUNT 20dB',{tm:{3:DS({iDsThr:-38,iDsAmt:20})}}]]),
  quiz:qz('いちばんサ行が抑えられているのは?',3,'3が正解。AMOUNTの上限が大きいので、しきい値を超えたサ行が深く下がる。')},
 {h:'かけすぎを聴く',b:'かけすぎると、サ行がこもって、舌足らずに聞こえる。2つを聞き比べて、かけすぎているほうを選ぼう。',
  cmp:cm('vo05s5',[['1',{tm:{3:DS({iDsThr:-38,iDsAmt:8})}}],['2',{tm:{3:DS({iDsThr:-60,iDsAmt:24})}}]]),
  quiz:qz('かけすぎているのは?',2,'2が正解。THRESHが低く、AMOUNTも大きいので、サ行がほとんど消えて、舌足らずに聞こえる。')},
 {h:'声のチェーンの中の位置',b:'ディエッサーは、【声のチェーン】ではコンプの次に置く。このアプリのトラック別【インサート】でも、COMPのあと、SATの前に並ぶ。EQで高域(プレゼンスやエア)を足した声や、強く圧縮した声ほど、サ行が目立つので、足したあとに確かめる。',
  col:{h:'声全体を暗くしない',b:'EQで高域を下げると、サ行は減るが、声全体が暗くなる。ディエッサーは、検出帯域がしきい値を超えた瞬間だけ下げるので、声の明るさはそのまま残る。ただし、検出が合っていないと効きすぎ・効かなさすぎになる。聞き比べて、合わせよう。耳が疲れたら、少し休もう。'}}
]}),
/* ---------------- vo06 ---------------- */
base({id:'vo06',pre:['vo04'],terms:['ride','breath','gr','comp'],title:'ライドとブレス',sub:'手で音量をそろえてから、軽くコンプ。息のバランス',save:{name:'ライドした声',kind:'kit'},
 tk:[KIK(),PADT(),BRT(),VOX(0)],steps:[
 {h:'手で音量をそろえる',b:'声は、強く歌う所と、弱く歌う所で、音量が大きく違う。それを、曲を聴きながら、フェーダーを手で動かしてそろえるのが【ライド】。コンプが拾いにくい、大きな流れを整える。\\\\nAUTOタブで、T4(声)のVOLのレーンを描く。この練習では、前半を「強く歌う所」、後半を「弱く歌う所」とみなす。まず、ライドなしと、ありを聞き比べよう。',tab:'au',clr:'au',bars:4,
  ref:[{id:'tVol',trk:3,pts:[[0,.7,'S'],[768,1,'S'],[L4,1]]}],
  cmp:[{l:'ライドなし',au:false},{l:'ライドあり',ln:[{id:'tVol',trk:3,pts:[[0,.7,'S'],[768,1,'S'],[L4,1]]}]}]},
 {h:'1. 強い所を下げる',b:'前半(強い所)のVOLを、70%あたりまで下げよう。AUTOタブで、T4のVOLのレーンの前半を下げる。',tab:'au',bars:4,
  au:[{id:'tVol',trk:3,at:[[0,.7,.15]]}],ref:[{id:'tVol',trk:3,pts:[[0,.7,'S'],[768,1,'S'],[L4,1]]}]},
 {h:'2. 弱い所は戻す',b:'前半は70%、後半(弱い所)は100%にそろえる。これで、前半と後半の聞こえる大きさが近づく。大きい所を下げるのが基本で、小さい所を上げすぎると、ほかの音に埋もれやすくなる。',tab:'au',bars:4,
  au:[{id:'tVol',trk:3,at:[[0,.7,.15],[1200,1,.15]]}],ref:[{id:'tVol',trk:3,pts:[[0,.7,'S'],[768,1,'S'],[L4,1]]}]},
 {h:'ブレス(息)を整える',b:'T3は、息の音(【ブレス】)。多すぎると息ばかり耳について、歌の邪魔になる。かといって消しすぎると、不自然になる。T3のVOLを、思い切って下げよう(消さずに、うっすら聞こえるくらい)。',tab:'mix',
  mx:[MX(3,'tVol',.2,.5,'mix')],cmp:cm('vo06s4',[['ブレス 大きい',{tm:{3:{tVol:.95}}}],['ブレス ほどよい',{tm:{3:{tVol:.35}}}]]),
  quiz:qz('息の音が目立ちすぎているのは?',1,'1が正解。ブレスのVOLが大きいので、息が歌より前に出る。')},
 {h:'そろえてから、軽くコンプ',b:'手でそろえたあとに、【コンプレッサー】を軽く掛けると、少ない量で足りる。T4のTHRESHを少し高めにして、RATIOを2〜3にして、小さな起伏だけを整えよう。\\\\nなお、このアプリのVOLは、インサート(コンプ)のあとにある。本物のDAWでは、コンプの前でそろえる(クリップゲインなど)ことが多く、そのほうがコンプの効きが安定する。',tab:'mix',
  mx:[MX(4,'iCpThr',-32,-24,'cp'),MX(4,'iCpRatio',2,3,'cp')],
  col:{h:'ライドとコンプの分担',b:'ライドは、フレーズ単位の大きな流れ。コンプは、1音ごとの細かい起伏。分担すると、コンプを強く掛けずにすむので、歌の表情が残りやすい。手で動かした音量は、ミックス全体を聴きながら、少しずつ直そう。'}}
]}),
/* ---------------- vo07 ---------------- */
base({id:'vo07',pre:['vo04','ef10'],terms:['reverb','predly','damp','send'],title:'声のリバーブ',sub:'プレート/ホール・PRE DLYで言葉を前に・響きの整理',save:{name:'声のリバーブ',kind:'kit'},init:RVm(),
 tk:[KIK(NS),PADT(NS),BAS(NS),VOX(0,null,{tRvb:.6,tDly:0})],steps:[
 {h:'声に空間をつける',b:'声は、ドライのままだと近すぎて、伴奏から浮いて聞こえやすい。【リバーブ】で空間を足すと、伴奏となじむ。ここでは、T4の声だけが、リバーブに送ってある(【センド】)。まず、なしと、ありを聞き比べよう。',tab:'fx',
  cmp:[{l:'リバーブなし',s:RVm({rvbMix:0})},{l:'リバーブあり',s:RVm({rvbMix:.35})}]},
 {h:'TYPE: プレートとホール',b:'声には、PLATE(きめ細かくなめらかな響き)がよく使われる。HALL(大きな空間の長い響き)は、広がりが出るが、言葉にかぶりやすい。RVB TYPE を PLATE にして、聞き比べよう。',tab:'fx',f:[['rvbType',3]],tol:.1,
  cmp:[{l:'HALL',s:RVm({rvbType:2,rvbSize:2.5})},{l:'PLATE',s:RVm({rvbType:3,rvbSize:1.8})}]},
 {h:'PRE DLY: 言葉を前に',b:'【プリディレイ】を足すと、声がはっきり聞こえてから、響きが始まる。言葉が響きに埋もれず、声が手前に残る。声の目安は{g:dyn.rvPre}。RVB の PRE DLY を40msにして、聞き比べよう。',tab:'fx',f:[['rvbPre',40]],tol:.1,
  cmp:[{l:'PRE DLY 0ms',s:RVm({rvbType:3,rvbPre:0})},{l:'PRE DLY 40ms',s:RVm({rvbType:3,rvbPre:40})}]},
 {h:'SIZE: 響きの長さを言葉に合わせる',b:'響きが長すぎると、次の言葉に重なって、歌詞が聞き取りにくくなる。短いほうが言葉が明瞭で、長いほうが広がりが出る。聞き比べて、言葉が聞き取りにくいほうを選ぼう。',tab:'fx',
  cmp:[{l:'1',s:RVm({rvbType:3,rvbSize:1,rvbPre:40})},{l:'2',s:RVm({rvbType:3,rvbSize:4,rvbPre:40})}],
  quiz:qz('言葉が聞き取りにくいのは?',2,'2が正解。SIZEが長く、響きが次の言葉まで残って重なる。')},
 {h:'響きの高域を整える',b:'響きに高域が多いと、サ行や息が強調され、耳に痛くなる。RVB の【ダンプ】(DAMP)を60〜90%にして、響きの高域を早く消そう。\\\\n声を送る前の低域は、T4のLOW CUTで切ってあるので、響きに低域が溜まりにくい。',tab:'fx',f:[['rvbDamp',.75]],tol:.2,
  cmp:[{l:'DAMP 20%',s:RVm({rvbType:3,rvbPre:40,rvbDamp:.2})},{l:'DAMP 80%',s:RVm({rvbType:3,rvbPre:40,rvbDamp:.8})}]},
 {h:'送りの量',b:'最後に、T4の RVB SEND を、10〜30%にしよう。声の存在感を残したまま、空間がなじむ量。多いと、声が遠く、ぼやける。',tab:'mix',
  mx:[MX(4,'tRvb',.1,.3,'mix')],
  col:{h:'リバーブは、足すより、引く',b:'響きは、足しすぎると、すぐに声が遠くなる。「あるか、ないか」くらいで止めて、小さめの音量で、全体を聴きながら決めよう。曲のテンポと、言葉の隙間に合わせると、さらになじむ。'}}
]}),
/* ---------------- vo08 ---------------- */
base({id:'vo08',pre:['vo07','ef09'],terms:['delay','slap','duckd','predly'],title:'声のディレイ',sub:'付点8分・スラップ・言葉の隙間に出す',save:{name:'声のディレイ',kind:'kit'},init:DLm({dlyMix:0}),
 tk:[KIK(NS),PADT(NS),BAS(NS),VOX(0,null,{tDly:1,tRvb:0})],steps:[
 {h:'ディレイは声の残像',b:'【ディレイ】は、声が鳴ったあとに、残像のような繰り返しを足す。リバーブより、言葉が濁りにくい。T4の声だけが、ディレイに送ってある。まず、なしと、ありを聞き比べよう。',tab:'fx',
  cmp:[{l:'ディレイなし',s:DLm({dlyMix:0})},{l:'付点8分',s:DLm({dlyDiv:4,dlyMix:.35})}]},
 {h:'付点8分でノリを出す',b:'付点8分(1/8.)は、拍の裏に入るので、リズムが跳ねる定番の遅れ。DLY SYNC を SYNC、DLY DIV を 1/8.、FB を30%、MIX を30%くらいにしよう。',tab:'fx',f:[['dlySync',1],['dlyDiv',4],['dlyFb',.3],['dlyMix',.3]],tol:.1,
  cmp:[{l:'1/8',s:DLm({dlyDiv:5,dlyMix:.3})},{l:'1/8.',s:DLm({dlyDiv:4,dlyMix:.3})},{l:'1/4',s:DLm({dlyDiv:3,dlyMix:.3})}]},
 {h:'スラップで、声を太く',b:'【スラップディレイ】は、短い遅れを1回だけ足して、声を太く、前に出す。繰り返さないので、言葉を邪魔しにくい。DLY SYNC を FREE、TIME を90ms、FB を0%、MIX を30%にしよう。',tab:'fx',f:[['dlySync',0],['dlyTime',.09],['dlyFb',0],['dlyMix',.3]],tol:.1,
  cmp:[{l:'付点8分',s:DLm({dlyDiv:4,dlyMix:.3})},{l:'スラップ',s:DLm({dlySync:0,dlyTime:.09,dlyFb:0,dlyMix:.3})}]},
 {h:'言葉の隙間に出す(DUCK)',b:'ディレイが言葉に重なると、歌詞が聞き取りにくい。【ダッキング】は、声が鳴っている間だけ、ディレイの戻りをへこませ、言葉の隙間で戻す。DLY DUCK を ON、DLY SRC を T4、DLY DEPTH を60%にしよう。実機のDAWでは、声の音そのものでへこませる(サイドチェイン)。このアプリは、声のノートの合図で、へこませる。',tab:'fx',f:[['dlDuckOn',1],['dlDuckSrc',3],['dlDuckDepth',.6]],tol:.1,
  cmp:[{l:'DUCKなし',s:DLm({dlyDiv:4,dlyMix:.45,dlyFb:.45,dlDuckOn:0})},{l:'DUCKあり',s:DLm({dlyDiv:4,dlyMix:.45,dlyFb:.45,dlDuckOn:1,dlDuckSrc:3,dlDuckDepth:.6})}],
  quiz:qz('言葉が聞き取りやすいのは?',2,'2が正解。声が鳴っている間は戻りがへこみ、言葉の隙間で、ディレイが戻る。')},
 {h:'ディレイの色と量',b:'ディレイは、声より暗く・小さくして、後ろに置くと邪魔にならない。DLY TONE を3000Hzくらいに下げ、MIX を控えめにしよう。聞き比べて、声の後ろに隠れているほうを選ぼう。',tab:'fx',f:[['dlyTone',3000]],tol:.2,
  cmp:[{l:'1',s:DLm({dlyDiv:4,dlyMix:.3,dlyTone:9000})},{l:'2',s:DLm({dlyDiv:4,dlyMix:.3,dlyTone:2500})}],
  quiz:qz('声の後ろに、なじんでいるのは?',2,'2が正解。TONEを下げて、繰り返しの高域を減らしたので、声より暗く、後ろに引っ込む。'),
  col:{h:'リバーブとディレイ',b:'リバーブは「空間」、ディレイは「リズムと残像」。声には、両方を少しずつ重ねることが多い。どちらも、言葉が聞き取りにくくなったら、まず量を下げる。小さめの音量で、こまめに休みながら、探そう。'}}
]}),

/* ---------------- vo09 ---------------- */
base({id:'vo09',pre:['vo02'],terms:['dubl','harmony','mask','pancenter'],title:'ダブリング・ハモリ',sub:'ダブルのパン・音量・暗さ。ハモリはリードより後ろに',save:{name:'ダブルとハモリ',kind:'kit'},
 tk:[PADT(NS),BAS(NS),DBL(),VOX(0),HRM()],steps:[
 {h:'声を重ねる',b:'同じ歌をもう1回重ねるのが【ダブル】。厚みと広がりが出る。主旋律とは別の高さで重ねるのが【ハモリ】。T3がダブル、T5がハモリ(どちらも声の代役)。まず、主役の声だけと、ダブルとハモリも入れた音を聞き比べよう。',tab:'mix',
  cmp:[{l:'主役の声だけ',mt:[2,4]},{l:'ダブルとハモリも',mt:[]}]},
 {h:'ダブルは左右に置く',b:'ダブルを主役と同じ中央に置くと、声が太くなるだけで、広がらない。主役は中央のまま、ダブルを左右にずらそう。T3のPANを左右{g:dbl.pan}にする。',
  mx:[MX(3,'tPan',.3,.7,'mix')],cmp:[{l:'ダブルも中央',tm:{3:{tPan:0}}},{l:'ダブルを右へ',tm:{3:{tPan:.5}}}]},
 {h:'音量は主役より小さく',b:'ダブルが主役と同じ大きさだと、どちらが主役か分からなくなる。T3のVOLを、主役より小さくしよう。主役の後ろに隠れているくらいが目安。',
  mx:[MX(3,'tVol',.4,.7,'mix')]},
 {h:'声より少し暗く',b:'ダブルは、声より少し暗く(高域を控えめに)すると、主役の後ろに下がる。ダブルのLOW CUTは、{g:dbl.hpf}。T3のLOW CUTを150Hzあたり、HIGH SHELFを下げて(-6〜-2dB)、暗くしよう。サ行の帯域({g:dbl.cut1})も出しすぎない。',
  mx:[MX(3,'iEqHpf',130,170),MX(3,'iEqHf',4000,8000),MX(3,'iEqHg',-6,-2)],
  cmp:[{l:'主役と同じ音色',tm:{3:E()}},{l:'少し暗く',tm:{3:E({iEqHpf:150,iEqHf:6000,iEqHg:-4})}}]},
 {h:'ハモリは、さらに後ろ',b:'ハモリは、リードより後ろに置く。T5のVOLを下げ、PANを、ダブルとは反対側へ置こう。2つを聞き比べて、リード(主役)が聞き取りにくいほうを選ぼう。',
  mx:[MX(5,'tVol',.3,.6,'mix')],cmp:[{l:'1',tm:{5:{tVol:.95}}},{l:'2',tm:{5:{tVol:.45}}}],
  quiz:qz('主役の声が聞き取りにくいのは?',1,'1が正解。ハモリの音量が大きく、主役と同じ強さで鳴るので、どちらが旋律か分かりにくい。')},
 {h:'重ねると、ぶつかる',b:'声を重ねるほど、同じ帯域が混み合って、言葉が聞き取りにくくなる(【マスキング】)。ダブル・ハモリは、音量を下げ、暗くして、主役が前に残るようにする。人数を増やすより、置き方を整えるのが先。',
  col:{h:'ダブルは「少しずれる」から広がる',b:'本物のダブルは、2回目の歌いまわしやタイミングが少しずれるから、広がって聞こえる。この代役は同じ音のコピーなので、広がりは、PANと音量・暗さの差で作る。モノラルにしても、主役の声が残るか、確かめておこう。'}}
]}),
/* ---------------- vo10 ---------------- */
base({id:'vo10',pre:['vo03','fq08'],terms:['mask','overlap','mainband','cut'],title:'声とシンセの帯域の分け合い',sub:'補完EQ・ポケットの実践',save:{name:'声の場所を空けたミックス',kind:'kit'},
 tk:[KIK(),BAS(),PADT(),VOX(0)],steps:[
 {h:'声とパッドがぶつかる',b:'パッド(T3)は、声と同じ帯域(声の【主帯域】{g:vocal.keep1})にも音を持っている。声と重なると、声が埋もれる(【マスキング】)。再生して、T4(声)と、ほかの全部の【ぶつかり度】を見よう。',
  cmp:cm('vo10s1',[['パッドそのまま',{tm:{3:E()}}],['声の場所を空けた',{tm:{3:E({iEqHpf:150,iEqB2f:3000,iEqB2g:-3,iEqB2q:1})}}]])},
 {h:'ポケットを作る',b:'パッドのEQで、声の帯域({g:pad.cut1})を少し引いて、声のための場所(ポケット)を空ける。T3のBELL2のFREQを2〜4kHzに、GAINを-3〜-1dBにしよう。声を持ち上げるより、まず伴奏を引く(補完EQ)。',
  mx:[MX(3,'iEqB2f',2000,4000),MX(3,'iEqB2g',-3,-1)],mt:[{trk:4,m:'ovl',rng:[0,50],hold:2}]},
 {h:'低域はベースに譲る',b:'パッドの低域は、ベースと重なる。T3のLOW CUTを{g:pad.hpf}にして、低域を空けておく。声のための場所と、ベースのための場所を、先に空ける。',
  mx:[MX(3,'iEqHpf',100,200)]},
 {h:'声は、少しだけ足す',b:'伴奏のポケットができたら、声は少しだけ足せばよい。T4のBELL2を2〜5kHzに置き、GAINを{g:dyn.eqStart}だけ上げよう。伴奏を空けたぶん、足す量は少なくてすむ。',
  mx:[MX(4,'iEqB2f',2000,5000),MX(4,'iEqB2g',1,3)],
  cmp:cm('vo10s4',[['声を足す前',{tm:{3:E({iEqHpf:150,iEqB2f:3000,iEqB2g:-3,iEqB2q:1}),4:VS()}}],['声を少し足した',{tm:{3:E({iEqHpf:150,iEqB2f:3000,iEqB2g:-3,iEqB2q:1}),4:VS({iEqB2f:3000,iEqB2g:2,iEqB2q:1})}}]])},
 {h:'削りすぎを聴く',b:'2つを聞き比べて、伴奏を削りすぎているほうを選ぼう。',
  cmp:cm('vo10s5',[['1',{tm:{3:E({iEqHpf:150,iEqB2f:3000,iEqB2g:-3,iEqB2q:1})}}],['2',{tm:{3:E({iEqHpf:300,iEqB2f:3000,iEqB2g:-12,iEqB2q:.5})}}]]),
  quiz:qz('伴奏が削りすぎなのは?',2,'2が正解。パッドの中域を大きく引いたので、声は聞こえるが、伴奏が細く、スカスカになる。')},
 {h:'声が止まる所では',b:'声がお休みの所では、パッドの中域が空いていても気にならない。声が入る所だけ場所を空ける、という考え方もある(vo11)。まずは、いつも少しだけ空けておくのが安全。',
  col:{h:'声の邪魔をしない伴奏',b:'伴奏のEQは、「声の帯域だけを少し引く」のが基本。声を足すより、伴奏を整えるほうが自然。ぶつかり度の数字は目安で、最終判断は耳。小さめの音量でも、声が聞き取れるか確かめよう。'}}
]}),
/* ---------------- vo11 ---------------- */
base({id:'vo11',pre:['vo08','cm12'],terms:['duckd','sidechain','rtn','comp'],title:'声の間はシンセを下げる',sub:'サイドチェイン・リターンDUCK・オートメーションの使い分け',save:{name:'声に道を空けたミックス',kind:'kit'},
 init:DLm({dlyMix:.4,dlyDiv:4,dlyFb:.4}),
 tk:[KIK(NS),BAS(NS),(function(t){t.o.mx.cp=Object.assign(SD.scMix({src:3,depth:.2,key:-20,rel:800,extra:{iCpAtk:5}}),{iCpOn:0,iCpSc:0});return t})(PADT({tDly:0,tRvb:0})),VOX(0,null,{tDly:1,tRvb:0})],steps:[
 {h:'声が鳴るときは、伴奏を下げる',b:'声が鳴っている間、パッドを少しだけ下げると、声が聞き取りやすくなる。方法は3つ。声の音そのものでコンプを動かす【サイドチェイン】(COMPのSC SRC)、ディレイなどの戻りだけをへこませる【リターン】のDUCK、そして手で描くオートメーション。まず、パッドがそのままの音と、声に合わせてへこむ音を聞き比べよう。',tab:'mix',
  cmp:[{l:'そのまま',tm:{3:{iCpOn:0}}},{l:'声でへこむ',tm:{3:SD.scMix({src:3,depth:.5,key:-20,rel:250,extra:{iCpAtk:5}})}}]},
 {h:'1. COMPのサイドチェイン',b:'MIXタブで T3(パッド)の COMP を開こう。SC SRC を T4(声)にして、COMP を ON にする。声が鳴るたびに、パッドが一瞬へこむ。コンプが声の音そのものを聞いて動く、本物のサイドチェイン。次に、へこむ深さを決める。THRESHを-32〜-23dBにして、控えめに。',tab:'mix',
  mx:[MX(3,'iCpThr',-32,-23,'cp')]},
 {h:'2. 戻る速さ',b:'RELEASEは、へこんだ音が元に戻る速さ。短すぎるとパッドが細かく揺れて落ち着かず、長すぎると、声の間も下がったままになる。声のフレーズに合わせて、探そう。',tab:'mix',
  mx:[MX(3,'iCpRel',100,300,'cp')]},
 {h:'3. リターンDUCK',b:'声のディレイ(戻り)が、次の言葉に重なって邪魔になることがある。FXタブで、DLY DUCK を ON、DLY SRC を T4、DLY DEPTH を60%にしよう。声が鳴っている間だけ、ディレイの戻りがへこむ。',tab:'fx',f:[['dlDuckOn',1],['dlDuckSrc',3],['dlDuckDepth',.6]],tol:.1,
  cmp:[{l:'戻りDUCKなし',s:DLm({dlyDiv:4,dlyMix:.4,dlyFb:.4,dlDuckOn:0})},{l:'戻りDUCKあり',s:DLm({dlyDiv:4,dlyMix:.4,dlyFb:.4,dlDuckOn:1,dlDuckSrc:3,dlDuckDepth:.6})}]},
 {h:'4. オートメーション',b:'声が入る後半は、パッドの音量を全体に下げておく、という方法もある。AUTOタブで、T3(パッド)のVOLのレーンを描こう。前半は100%、後半は60%にする。DUCKのような細かい動きでなく、場面ごとの大きな流れを手で決める。',tab:'au',clr:'au',bars:4,
  au:[{id:'tVol',trk:2,at:[[0,1,.12],[1200,.6,.15]]}],ref:[{id:'tVol',trk:2,pts:[[0,1,'S'],[768,.6,'S'],[L4,.6]]}],
  cmp:[{l:'そのまま',au:false},{l:'後半を下げる',ln:[{id:'tVol',trk:2,pts:[[0,1,'S'],[768,.6,'S'],[L4,.6]]}]}]},
 {h:'使い分け',b:'細かく、自動で動かしたいときは、COMPのサイドチェイン。ディレイやリバーブの戻りが邪魔なときは、リターンDUCK(これはノートの合図で動く疑似のもの)。場面ごとの大きな変化は、オートメーション。サイドチェインは声の音の大きさに追従するので、声のパターンを変えても合う。',tab:'mix',
  col:{h:'下げすぎない',b:'声の間にシンセを下げすぎると、声が止まったときにシンセが急に大きく聞こえて、不自然になる。「下がっているのに気づかない」くらいが目安。小さめの音量で聴いて、決めよう。'}}
]}),
/* ---------------- vo12 ---------------- */
base({id:'vo12',pre:['vo01'],terms:['vcallresp','mask','pancenter'],title:'声の隙間にシンセを置く',sub:'コール&レスポンス。フィル・ハットで隙間を埋める',save:{name:'声に応えるシンセ',kind:'kit'},
 tk:[KIK(),BAS(),LDP({1:0,4:3,7:5,12:3,15:0},'応え(シンセ)',{tDly:0,tRvb:0}),VOX(0),withM(TK('hat',{idx:z([1,4,7,10,13,15]),o:{}},'ハット'),{eq:E()})],steps:[
 {h:'呼びかけと応え',b:'声が歌い終わった隙間に、シンセが短いフレーズで応える。これが【コール&レスポンス】。声(呼びかけ)と、シンセ(応え)が、交互に鳴ると、曲が会話のように聞こえる。まず、声と伴奏だけと、応えのシンセも入れた音を聞き比べよう。',tab:'mix',
  cmp:[{l:'応えなし',mt:[2,4]},{l:'応えあり',mt:[4]}]},
 {h:'声のない所に置く',b:'応えは、声が鳴っていない所に置く。同じタイミングで鳴ると、声と応えが取り合って、どちらも聞き取りにくい(【マスキング】)。T3のシンセは、声の隙間に置いてある。声の位置と見比べよう。',tab:'mix'},
 {h:'ハットで隙間を埋める',b:'リズムの隙間は、ハット(T5)の細かい動きでも埋められる。声のある所でハットを増やすと、うるさい。声が休む所だけ動かすと、隙間がにぎやかになりすぎずに繋がる。ハットの有無を聞き比べよう。',tab:'mix',
  cmp:[{l:'ハットなし',mt:[4]},{l:'ハットあり',mt:[]}]},
 {h:'応えは、声より小さく',b:'応えが声より大きいと、主役が入れ替わってしまう。T3のVOLを、声より小さくしよう。',tab:'mix',
  mx:[MX(3,'tVol',.4,.7,'mix')]},
 {h:'帯域も分ける',b:'応えを、声の主帯域({g:vocal.keep1})から外すと、重なっても邪魔になりにくい。T3のLOW CUTを{g:lead.hpf}にして、低域を整理しよう。',tab:'mix',
  mx:[MX(3,'iEqHpf',150,250)]},
 {h:'声の隙間を聴く',b:'聞き比べて、声の邪魔になっているほうを選ぼう(音量を変えて並べてある)。',tab:'mix',
  cmp:[{l:'1',tm:{3:{tVol:.5}}},{l:'2',tm:{3:{tVol:1}}}],
  quiz:qz('声が聞き取りにくいのは?',2,'2が正解。応えのシンセが大きく、声と同じ強さで鳴るので、主役が分かりにくい。'),
  col:{h:'隙間は「休み」でもある',b:'隙間を全部埋めると、声の余韻や、次の言葉を待つ間が消えて、息苦しくなる。応えは、全部の隙間でなく、ところどころに。聞き返して、足しすぎていないか確かめよう。'}}
]}),
/* ---------------- vo13 ---------------- */
base({id:'vo13',pre:['vo10','ef12'],terms:['sharerev','reverb','send','satur','predly'],title:'シンセと声のエフェクトをそろえる',sub:'共有リバーブで同じ空間に・ディレイの拍・歪みの質感',save:{name:'声とシンセをそろえたミックス',kind:'kit'},
 init:RVm({rvbType:3,rvbSize:1.8,rvbPre:30,rvbMix:.4,dlyMix:.35,dlyDiv:4,dlyFb:.3}),
 tk:[KIK(NS),BAS(NS),withSA(PADT({tDly:0,tRvb:.1}),SA({iSaDrive:0})),withSA(VOX(0,null,{tDly:0,tRvb:.5}),SA({iSaDrive:0}))],steps:[
 {h:'同じ空間に置く',b:'パッド(T3)と声(T4)は、同じ【リバーブ】に【センド】で送ってある。リバーブは1つで、送る量だけが違う。これが【共有リバーブ】。同じ部屋で鳴っているように、音がなじむ。まず、リバーブなしと、共有リバーブを聞き比べよう。',tab:'mix',
  cmp:[{l:'リバーブなし',tm:{3:{tRvb:0},4:VR({tRvb:0})}},{l:'共有リバーブ',tm:{3:{tRvb:.3},4:VR({tRvb:.25})}}]},
 {h:'送りの量で、手前と奥',b:'同じ空間の中でも、送りが多いほど奥(遠く)、少ないほど手前(近く)に聞こえる。声は手前、パッドは奥に置こう。T3のRVB SENDを30〜60%に、T4のRVB SENDを10〜30%にする。最初は、声のほうが多く送ってある。',tab:'mix',
  mx:[MX(3,'tRvb',.3,.6,'mix'),MX(4,'tRvb',.1,.3,'mix')],
  cmp:[{l:'声のほうが奥',tm:{3:{tRvb:.15},4:VR({tRvb:.5})}},{l:'声が手前',tm:{3:{tRvb:.45},4:VR({tRvb:.2})}}]},
 {h:'響きの長さは、まとめて決まる',b:'リバーブが1つなので、響きの長さ(SIZE)も、声とパッドで共通になる。長いほど広がるが、声の言葉に重なって、聞き取りにくくなる。聞き比べて、言葉が聞き取りにくいほうを選ぼう。声とパッドで別の長さにしたいときは、実機のDAWなら、リバーブを2つ用意して、別の空間にする。',tab:'fx',
  cmp:[{l:'1',s:RVm({rvbType:3,rvbSize:1,rvbPre:30,dlyMix:0})},{l:'2',s:RVm({rvbType:3,rvbSize:4,rvbPre:30,dlyMix:0})}],
  quiz:qz('言葉が聞き取りにくいのは?',2,'2が正解。SIZEが長く、響きが次の言葉まで残るので、声とパッドの響きが重なる。')},
 {h:'ディレイは拍にそろえる',b:'ディレイの繰り返しが拍と合っていないと、リズムがずれて濁る。T4のDLY SENDを10〜40%にして、DLY SYNC を SYNC、DLY DIV を 1/8. にしよう。聞き比べて、拍に乗っているほうを選ぼう。',tab:'mix',
  mx:[MX(4,'tDly',.1,.4,'mix')],
  cmp:[{l:'1',s:DLm({dlySync:0,dlyTime:.33,dlyMix:.35,rvbMix:.4}),tm:{4:VR({tDly:.3,tRvb:.2})}},{l:'2',s:DLm({dlySync:1,dlyDiv:4,dlyMix:.35,rvbMix:.4}),tm:{4:VR({tDly:.3,tRvb:.2})}}],
  quiz:qz('繰り返しが拍に乗っているのは?',2,'2が正解。付点8分に同期しているので、繰り返しが拍の裏に決まる。1は時間を手で決めただけで、テンポとずれる。')},
 {h:'歪みの質感をそろえる',b:'声とパッドの【サチュレーション】の種類がばらばらだと、質感がちぐはぐになる。T3とT4のSATのDRIVEを15〜40%にして、TYPEを同じ(TAPE)にそろえよう。聞き比べて、声が浮いているほうを選ぼう。',tab:'mix',
  mx:[MX(3,'iSaDrive',.15,.4,'sa'),MX(4,'iSaDrive',.15,.4,'sa')],
  cmp:[{l:'1',tm:{3:SA({iSaType:1,iSaDrive:.3}),4:VR(SA({iSaType:5,iSaDrive:.5}))}},{l:'2',tm:{3:SA({iSaType:1,iSaDrive:.3}),4:VR(SA({iSaType:1,iSaDrive:.3}))}}],
  quiz:qz('声が浮いているのは?',1,'1が正解。声だけFUZZで荒く歪んでいて、パッドのTAPEの質感とそろっていない。')},
 {h:'そろえすぎない',b:'空間も、拍も、歪みも、全部そろえると、まとまるが、のっぺりする。そろえるのは「空間の種類」と「拍」。送りの量や、歪みの深さは、役割で差をつける(声は手前・少なめ、パッドは奥)。小さめの音量で聴いて、全体がなじんでいるか確かめよう。',tab:'mix',
  col:{h:'道具をそろえる、役割で変える',b:'同じリバーブ・同じ拍・同じ歪みの質感にそろえると、別々に録った音も、1つの曲に聞こえる。そのうえで、送りの量や深さを変えて、手前と奥を作る。実機のDAWでも同じ。大音量で長く聴かず、こまめに休もう。'}}
]}),
/* ---------------- vo14 ---------------- */
base({id:'vo14',pre:['vo07','ef05','ef14'],terms:['telvoice','ringmod','bitcrush','tapestop','sweep','delay'],title:'声のエフェクト飛び道具',sub:'電話声・ロボ声・ビット・テープストップ・フィルター・ダブ的ディレイ',save:{name:'声の飛び道具',kind:'kit'},
 init:RVm({rvbMix:0,dlyMix:.4,dlyFb:.55,dlyDiv:4,tsOn:1,tsSpeed:1,djOn:1,djFilter:0,djRes:.2}),
 tk:[KIK(NS),BAS(NS),PADT(NS),withSA(VOX(0,null,{tDly:0,tRvb:0}),SAOFF)],steps:[
 {h:'電話声',b:'低域と高域を大きく削って、中域だけを残すと、【電話声】になる。T4のLOW CUTを上げて低域を、HIGH CUTを下げて高域を、それぞれ大きく削ろう(目標は画面の表示のとおり)。聞き比べて、そのままの声と、歪みを少し足した声の違いも確かめよう。',tab:'mix',
  mx:[MX(4,'iEqHpf',400,700),MX(4,'iEqLpf',2500,4000)],
  cmp:[{l:'そのまま',tm:{4:VR()}},{l:'電話声',tm:{4:VR({iEqHpf:500,iEqLpf:3000})}},{l:'電話声+歪み',tm:{4:VR(Object.assign({iEqHpf:500,iEqLpf:3000},SA({iSaType:5,iSaDrive:.2})))}}]},
 {h:'ロボ声(リングモジュレーター)',b:'FXタブの RING MOD をONにして、FREQを150Hz、MIXを50%にしよう。声に金属的な響きが乗って、ロボットのような声になる。効果はミックス全体にかかるので、ここでは声だけを鳴らして聞き比べる。',tab:'fx',f:[['rmOn',1],['rmFreq',150]],tol:.1,
  cmp:[{l:'なし',mt:[0,1,2],s:RM({rmOn:0})},{l:'FREQ 150',mt:[0,1,2],s:RM({rmFreq:150})},{l:'FREQ 900',mt:[0,1,2],s:RM({rmFreq:900})}]},
 {h:'ビットクラッシュで、ざらついた声',b:'RING MOD をOFFにして、BITCRUSH をONにしよう。BITSを6、MIXを50%にすると、荒い録音のような、ざらついた声になる。声に使うときは、MIXを下げて、原音を残すのがコツ。',tab:'fx',f:[['rmOn',0],['bcOn',1],['bcBits',6],['bcMix',.5]],tol:.1,
  cmp:[{l:'なし',mt:[0,1,2],s:BC({bcOn:0})},{l:'BITS 10',mt:[0,1,2],s:BC({bcOn:1,bcBits:10,bcMix:.5})},{l:'BITS 5',mt:[0,1,2],s:BC({bcOn:1,bcBits:5,bcMix:.5})}]},
 {h:'テープストップ',b:'【テープストップ】は、再生速度を落として、ピッチも一緒に下げながら止める演出。AUTOタブで TAPE STOP の SPEED のレーンを作ろう。2小節を過ぎるまで100%を保ち、1拍で0%まで落として、止めて、最後の1拍で100%へ戻す。曲の切れ目や、サビ前の「間」で使う。',tab:'au',clr:'au',bars:4,
  au:[{id:'tsSpeed',trk:'M',at:[[0,1,.1],[768,1,.1],[864,0,.1],[1440,0,.1],[L4,1,.1]],mono:[[768,864,'down']],hold:[[960,1400]]}],ref:[TM('tsSpeed',[[0,1,'L'],[768,1,'L'],[864,0,'L'],[1440,0,'L'],[L4,1]])],
  cmp:[{l:'止める',ln:[TM('tsSpeed',[[0,1,'L'],[768,1,'L'],[864,0,'L'],[1440,0,'L'],[L4,1]])]},{l:'動かさない',au:false,s:{tsSpeed:1}}]},
 {h:'フィルターを開く',b:'DJ FILTER のレーンを、先頭の-80%から、4小節かけて0%へ上げよう。こもった声が、だんだん開いて、はっきり聞こえてくる。サビ前の盛り上げや、曲の頭に向いている。',tab:'au',
  au:[{id:'djFilter',trk:'M',at:[[0,-.8,.15],[L4,0,.15]],mono:[[0,L4,'up']]}],ref:[TM('djFilter',[[0,-.8,'L'],[L4,0]])],
  cmp:[{l:'こもったまま',s:DJ({djFilter:-.8}),au:false},{l:'だんだん開く',s:DJ({djFilter:-.8}),ln:[TM('djFilter',[[0,-.8,'L'],[L4,0]])]}]},
 {h:'ダブ的ディレイ',b:'ダブでは、ディレイの送りを、ある瞬間だけ大きく上げて、言葉を繰り返しに残す。この動きを、AUTOタブで、T4のDLY SENDのレーンに描こう。最後の小節の頭で100%にして、次の拍で0%に戻す。FEEDBACKを高めにしてあるので、繰り返しが長く残る。',tab:'au',
  au:[{id:'tDly',trk:3,at:[[0,0,.15],[1200,1,.15],[1300,0,.15]]}],ref:[{id:'tDly',trk:3,pts:[[0,0,'S'],[1152,1,'S'],[1248,0,'S'],[L4,0]]}],
  cmp:[{l:'送りなし',au:false},{l:'一瞬だけ送る',ln:[{id:'tDly',trk:3,pts:[[0,0,'S'],[1152,1,'S'],[1248,0,'S'],[L4,0]]}]}],
  col:{h:'飛び道具は、ここぞで',b:'どれも、ずっと続けると、慣れて効かなくなり、歌詞も聞き取りにくい。短い区間・短いフレーズだけ使うのが、効かせるコツ。使う前後で、ふつうの声に戻して、落差を作ろう。大きな音で長く聴かず、こまめに休もう。'}}
]}),
/* ---------------- vo15 ---------------- */
{id:'vo15',cat:'vo2',synth:'add',lv:2,course:'VO',kind:'recipe',pre:['vo01','a6'],terms:['formant','vocoder'],title:'声をシンセにする',sub:'母音(フォルマント)で歌うシンセ。ボコーダー風は近似',save:{name:'歌うシンセ',kind:'patch'},oct:0,demo:{n:[48,55,60],gap:1.4,len:1.1},
 init:{adSpec:'saw',adN:32,adFmt:'on',adVowel:'a',adFmtShift:0,adMotTarget:'off',adLfoRate:5.5,adLfoDepth:.12,adA:.06,adD:.2,adS:.85,adR:.25},steps:[
 {h:'声のしくみを借りる',b:'声は、声帯の音(倍音がたくさん)を、口の形が一部だけ強めて作る。この強い山が【フォルマント】。このシンセは、母音ごとの山の形を倍音にかけて、「歌っているような音」を作る。FORMANTをOFFとONで聞き比べよう。',tab:'layout',f:[['adFmt','on']],
  cmp:[{l:'OFF',s:{adFmt:'off'}},{l:'ON',s:{adFmt:'on'}}]},
 {h:'母音で歌い分ける',b:'VOWELを切り替えると、同じ高さでも、母音が変わる。い・う・おを聞き比べて、いちばん明るく細いものを選ぼう。',tab:'layout',
  cmp:[{l:'1',s:{adVowel:'i'}},{l:'2',s:{adVowel:'u'}},{l:'3',s:{adVowel:'o'}}],
  quiz:qz('いちばん明るく細いのは?',1,'1が正解。「い」は、上の山が高くて、明るく細い音になる。')},
 {h:'声の主を変える',b:'F.SHIFTを+5半音にしよう。山の位置が上にずれて、小柄な人の声のような印象になる。−5半音で、大柄な人の声のような印象。高さは変わらない。',tab:'layout',f:[['adFmtShift',5]],tol:.03,
  cmp:[{l:'−5',s:{adFmtShift:-5}},{l:'0',s:{adFmtShift:0}},{l:'+5',s:{adFmtShift:5}}]},
 {h:'ゆらぎを足す',b:'本物の声は、音が少し揺れる。MOTIONタブで、MOTION TARGETを TILT にして、LFOで明るさを揺らそう。このシンセには、音程そのものを揺らすビブラートは無いので、明るさの揺れで近似する。',tab:'motion',f:[['adMotTarget','tilt']],
  cmp:[{l:'揺れなし',s:{adMotTarget:'off'}},{l:'明るさが揺れる',s:{adMotTarget:'tilt',adLfoRate:5.5,adLfoDepth:.3}}]},
 {h:'コードを歌わせる',b:'和音を鳴らすと、人が声をそろえて歌っているような、合唱風の音になる。母音を「あ」と「お」で聞き比べよう。【ボコーダー】は、本物の声の山の動きを、シンセに移す機材。このシンセは、母音を固定の山で作るだけなので、しゃべるような動きまでは再現できない。ボコーダー風の近似として使おう。',tab:'layout',d:{n:[48,55,60,64],gap:1.1,len:.9},
  cmp:[{l:'あ',s:{adVowel:'a'}},{l:'お',s:{adVowel:'o'}}],
  col:{h:'声の質感は、ここまで',b:'この音は、声の「役割」(山の形・高さ)の簡単な近似で、息づかいや子音までは出せない。曲に使うときは、本物の声やボコーダーの代わりでなく、「歌のような音色」として使うと、無理がない。小さめの音量で試そう。'}}
]},
/* ---------------- vo16 ---------------- */
base({id:'vo16',pre:['vo02','vo05','vo07','vo08'],terms:['standin','vchain','deesser','predly','insert'],title:'自分の声で試す(任意)',sub:'取り込んだ声(最大20秒)に、vo02〜vo08を当てる',save:{name:'自分の声のミックス',kind:'kit'},
 init:RVm({rvbType:3,rvbSize:1.8,rvbPre:40,rvbMix:.35,dlyMix:.3,dlyDiv:4,dlyFb:.3}),
 tk:[KIK(NS),BAS(NS),PADT(NS),withM(TK('vo_smp',{idx:{0:0,8:0},o:{}},'声(取り込み素材)'),{eq:E(),cp:NO,ds:DSI},{tRvb:0,tDly:0})],steps:[
 {h:'自分の声を取り込む',b:'T4は、取り込んだ素材をそのまま鳴らすトラック。自分が権利を持つ声(最大20秒)だけを使おう。素材の管理画面で取り込んで、T4のMATERIALをその素材に変える。素材は、このアプリを入れた端末の中だけに保存される。今は、内蔵の声の素材が入っている。素材は、テンポに合わせて伸び縮みせず、高さも変わらないので、テンポに合う短い声を用意しよう。まず、伴奏だけと、声も入れた音を聞き比べよう。',tab:'mix',
  cmp:[{l:'伴奏だけ',mt:[3]},{l:'声も入れる',mt:[]}]},
 {h:'ローカット(vo02)',b:'声の低域は、伴奏と重なりやすい。T4のLOW CUTを、{g:vocal.hpf}にしよう。自分の声は、声の代役より低い音を含むことが多いので、聞き比べて決める。',tab:'mix',
  mx:[MX(4,'iEqHpf',80,120)],cmp:[{l:'ローカットなし',tm:{4:VR()}},{l:'ローカットあり',tm:{4:VR({iEqHpf:100})}}]},
 {h:'コンプ(vo04)',b:'自分の声は、強弱の差が、代役より大きい。T4のTHRESHを-36〜-26dBに、RATIOを2.5〜4にして、差を縮めよう。声のGRの目安は{g:dyn.grVocal}。メーターを見ながら、探そう。',tab:'mix',
  mx:[MX(4,'iCpThr',-36,-26,'cp'),MX(4,'iCpRatio',2.5,4,'cp')],
  cmp:[{l:'コンプなし',tm:{4:VS({},null)}},{l:'コンプあり',tm:{4:VS({},VCP)}}]},
 {h:'ディエッサー(vo05)',b:'自分の声のサ行が刺さるときは、T4のDE-ESSを使う。DS FREQを歯擦音の帯域({g:vocal.cut1})に、DS THRESHを-45〜-28dBにして、サ行だけを抑えよう。',tab:'mix',
  mx:[MX(4,'iDsFreq',5000,9000,'ds'),MX(4,'iDsThr',-45,-28,'ds')],
  cmp:[{l:'なし',tm:{4:Object.assign(VS(),{iDsOn:0})}},{l:'あり',tm:{4:Object.assign(VS(),DS({iDsThr:-38,iDsAmt:8}))}}]},
 {h:'リバーブ(vo07)',b:'T4のRVB SENDを、10〜30%にしよう。声が伴奏となじむ。PRE DLYを足すと、言葉が手前に残る。',tab:'mix',
  mx:[MX(4,'tRvb',.1,.3,'mix')]},
 {h:'ディレイ(vo08)',b:'T4のDLY SENDを、10〜30%にしよう。付点8分の繰り返しが、声の後ろに乗る。言葉が聞き取りにくくなったら、まず量を下げる。聞き比べて、声が聞き取りやすいほうを選ぼう。',tab:'mix',
  mx:[MX(4,'tDly',.1,.3,'mix')],
  cmp:[{l:'1',tm:{4:VR({tDly:.5})}},{l:'2',tm:{4:VR({tDly:.2})}}],
  quiz:qz('声が聞き取りやすいのは?',2,'2が正解。ディレイの送りが少なく、繰り返しが次の言葉に重なりにくい。'),
  col:{h:'本物の声は、代役より正直',b:'本物の声は、息づかいや、強弱の変化が、代役よりずっと大きい。同じ設定でも、効き方が変わるので、数字は目安にして、必ず耳で確かめよう。自分の声や権利のある声だけを使い、端末の外へは出さない。小さめの音量で、こまめに休みながら探そう。'}}
]})
 );
})();
