/* VC コース(vc01〜vc06。LS-vc1・LS-vc2)。ボコーダー(マスターFXラックの VOCODER。つまみID接頭辞 vc)。年号・人名・機材名は書かない。
   曲はトラックモード。T1=モジュレーター(ADD の母音。VOL 0 でも働く=キーはVOLの前から取る)・T2=搬送波(のこぎり波の持続音)・T3=キック。SRC=T1。
   声の代わりは ADD の母音(録音は対象外)。負荷:高。cmp.g(音量補正)は未測定=README の申し送り参照 */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags})};
 A('carrier','搬送波','はんそうは','carrier','ボコーダーで、喋らせる側の音。のこぎり波のように、倍音の多い持続音がよく合う。',['vc01'],['エフェクト']);
 SD.CATS.push({id:'vc1',synth:'analog',chapter:'course',course:'VC',name:'VC ボコーダー'});
 var P=SD.PATS,TK=P.tk;
 var FT=function(o){return Object.assign({cat:'vc1',synth:'analog',lv:2,course:'VC',kind:'recipe',mode:'trk',tab:'trk',ts:0,oct:0,pre:['fx07']},o)};
 var B=384,L4=1536,TM=function(id,pts){return{id:id,trk:'M',pts:pts}};
 var KIT2=function(){var k=KIT(),c=function(){var o={};for(var i=0;i<16;i++)o[i]={t:'min',i:0};return o};k.push(TK('bass',ALL(),'パッド',{scale:'minor',p:{o1Wave:'triangle',o1Lvl:.8,cutoff:2500,aA:.3,aD:.5,aS:.9,aR:.4}}),TK('bass',ALL(),'和音',{scale:'minor',cd:c(),p:{o1Wave:'sawtooth',o1Lvl:.5,cutoff:5000,aA:.01,aD:.5,aS:.9,aR:.2}}));return k};
 var ALL=function(){var q={},t=[];for(var i=0;i<16;i++){q[i]=0;if(i)t.push(i)}return{idx:q,o:{tie:t}}};
 var KIT=function(){return[TK('ad04',P.bassPattern('syncop',0),'モジュレーター',{mix:{tVol:0},p:{adFmt:'on',adVowel:'a'}}),TK('bass',ALL(),'搬送波',{scale:'minor',p:{o1Wave:'sawtooth',o1Lvl:.8,cutoff:6000,aA:.01,aD:.5,aS:.9,aR:.2}}),TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}})]};
 var I0={vcOn:0,vcSrc:0,vcBands:2,vcLo:100,vcHi:8000,vcAtk:5,vcRel:40,vcNoise:0,vcFmt:0,vcMix:1};
 SD.LESSONS.push(
FT({id:'vc01',terms:['vocoder','carrier'],save:{name:'ボコーダーのしくみ',kind:'kit'},title:'しくみ',sub:'帯域ごとの音量を、別の音に移す',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0),steps:[
 {h:'2つの音を知る',b:'T1は、母音「あ」のリズムを刻む音(モジュレーター)。T2は、のこぎり波の持続音(【搬送波】)。T1はVOLを0にしてあるので、聞こえない。聞こえるのは、のこぎり波の持続音だけ。',tab:'trk'},
 {h:'VOCODERをONにする',b:'FXタブで VOCODER をONにしよう。SRC が INT のあいだは、何も変わらない。SRC に T1 を選ぶと、T1 の音が使われる。',f:[['vcOn',1],['vcSrc',1]],tab:'fx'},
 {h:'何が起きたか',b:'のこぎり波が、T1のリズムに合わせて、刻むように鳴り始めた。【ボコーダー】は、T1(モジュレーター)の帯域ごとの強さを測って、その強さを搬送波に移している。T1が鳴っていない瞬間は、搬送波も静かになる。',tab:'fx'},
 {h:'聴き比べる',b:'ボコーダーなし、あり、ありでMIXを半分にしたものを聴き比べよう。なしでは、のこぎり波が鳴り続ける。ありでは、T1の動きが移る。',tab:'fx',cmp:[{l:'なし',s:{vcOn:0,vcSrc:0}},{l:'あり',s:{vcOn:1,vcSrc:1,vcMix:1}},{l:'MIX半分',s:{vcOn:1,vcSrc:1,vcMix:.5}}],quiz:{q:'のこぎり波が、T1のリズムで刻んで鳴るのは?',ans:2,ex:'2が正解。ボコーダーは、T1の強さの動きを搬送波に移す。1は何も移していないので、のこぎり波が鳴り続ける。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。SRCに選んだトラックは、VOLを下げても、ミュートしても働く。聞こえなくしたいときは、そのトラックのVOLを下げよう。',tab:'fx',
  col:{h:'声を使わなくても喋る',b:'ボコーダーは、もともと声の強さの動きを楽器に移して、楽器を喋らせる道具。ここでは声の代わりに、母音を出すシンセの音を使っている。何でも、強さが変化する音なら、モジュレーターになれる。'}}
]}),
FT({id:'vc02',pre:['vc01'],terms:['vocoder'],save:{name:'ロボット声',kind:'kit'},title:'ロボット声',sub:'ADDの母音で、搬送波を喋らせる',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{vcOn:1,vcSrc:1}),steps:[
 {h:'いまの音を聴く',b:'VOCODER がONで、SRC は T1。のこぎり波が、母音「あ」の動きを受けて鳴っている。',tab:'fx'},
 {h:'ATTACKを短くする',b:'ATTACK を1msにしよう。モジュレーターの立ち上がりに素早く追いついて、出だしがくっきりする。',f:[['vcAtk',1]],tab:'fx',tol:.5},
 {h:'RELEASEを長くする',b:'RELEASE を150msにしよう。音が弱まるとき、ゆっくり戻る。なめらかで、のびのある響きになる。',f:[['vcRel',150]],tab:'fx',tol:20},
 {h:'FORMANTで声を変える',b:'FORMANT を+5にしよう。合成する側の帯域だけが上にずれて、声が細く、小さな口のように聞こえる。-5にすると、太く、大きな口のようになる。',f:[['vcFmt',5]],tab:'fx'},
 {h:'聴き比べる',b:'FORMANT -5、0、+5を聴き比べよう。',tab:'fx',cmp:[{l:'-5',s:{vcFmt:-5}},{l:'0',s:{vcFmt:0}},{l:'+5',s:{vcFmt:5}}],quiz:{q:'声が太く、大きな口のように聞こえるのは?',ans:1,ex:'1が正解。FORMANTを下げると、帯域が下にずれて、太く大きな口のような声になる。上げると細く小さな口のようになる。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。T1の母音を変えると、声の色が変わる。',tab:'fx',
  col:{h:'ロボットらしさ',b:'ロボットのような声は、搬送波に高さが一定の音を使うと出やすい。のこぎり波の同じ高さの音が、母音の動きで刻まれる。ボコーダーの定番の使い方。'}}
]}),
FT({id:'vc03',pre:['vc02'],terms:['vocoder'],save:{name:'バンド数と明瞭さ',kind:'kit'},title:'バンド数と明瞭さ',sub:'8・16・20の聞き比べ',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{vcOn:1,vcSrc:1,vcBands:2}),steps:[
 {h:'いまの音を聴く',b:'VOCODER がONで、BANDS は16。基準にしよう。',tab:'fx'},
 {h:'バンドを減らす',b:'BANDS を8にしよう。帯域の数が減って、母音の形が粗くなる。ロボットらしい、つぶれた響きになる。',f:[['vcBands',0]],tab:'fx'},
 {h:'バンドを増やす',b:'BANDS を20にしよう。帯域が細かくなって、母音の形がはっきりする。そのかわり、負荷が上がる。',f:[['vcBands',3]],tab:'fx'},
 {h:'聴き比べる',b:'BANDS 8、16、20を聴き比べよう。',tab:'fx',cmp:[{l:'8',s:{vcBands:0}},{l:'16',s:{vcBands:2}},{l:'20',s:{vcBands:3}}],quiz:{q:'母音の形がいちばんはっきり聞こえるのは?',ans:3,ex:'3が正解。帯域の数が多いほど、モジュレーターの周波数の形を細かく写せる。ただし、そのぶん重くなる。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。端末が重いときは、BANDSを減らそう。',tab:'fx',
  col:{h:'粗さも味',b:'帯域が少ないと、聞き取りにくい。でも、その粗さが「ロボットらしさ」でもある。はっきり喋らせたいなら多く、機械っぽさを出したいなら少なく。目的で選ぼう。'}}
]}),
FT({id:'vc04',pre:['vc03'],terms:['vocoder'],save:{name:'ノイズで子音',kind:'kit'},title:'ノイズで子音',sub:'息のノイズで、サ行・タ行のような子音を足す',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{vcOn:1,vcSrc:1,vcNoise:0}),steps:[
 {h:'子音のない声を聴く',b:'VOCODER がONで、SRC は T1。のこぎり波は周期のある音だけなので、母音のようには鳴るが、「サ」や「タ」のような息の子音は出ない。',tab:'fx'},
 {h:'NOISEを足す',b:'NOISE を40%にしよう。ホワイトノイズが足されて、息のような成分が混ざる。T1の強さの動きに合わせて出入りするので、子音のように聞こえる。',f:[['vcNoise',.4]],tab:'fx',tol:.05},
 {h:'高域を広げる',b:'RANGE HI を12.0kHzにしよう。「サ行」の息の成分は高い周波数にあるので、帯域を高く広げると、子音が出やすくなる。',f:[['vcHi',12000]],tab:'fx',tol:1500},
 {h:'聴き比べる',b:'NOISE 0%、40%、80%を聴き比べよう。',tab:'fx',cmp:[{l:'0%',s:{vcNoise:0}},{l:'40%',s:{vcNoise:.4}},{l:'80%',s:{vcNoise:.8}}],quiz:{q:'息のような、ささやきに近い響きがいちばん強いのは?',ans:3,ex:'3が正解。NOISEが大きいほど、ノイズの成分が多くなって、息のような、ささやきに近い響きになる。足しすぎると、母音の輪郭が埋もれる。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。NOISEは、足しすぎないのがコツ。',tab:'fx',
  col:{h:'子音の明瞭さには限りがある',b:'このボコーダーは、母音の形を写すのが得意。子音は、ノイズで雰囲気を足すだけなので、言葉をはっきり聞き取れるほどにはならない。ここは近似。ロボットらしい味として楽しもう。'}}
]}),
FT({id:'vc05',pre:['vc04'],terms:['vocoder','carrier'],save:{name:'搬送波の選び方',kind:'kit'},title:'搬送波の選び方',sub:'のこぎり・パッド・和音で聞き比べる',demo:{n:[45]},tk:KIT2(),init:Object.assign({},I0,{vcOn:1,vcSrc:1}),steps:[
 {h:'3つの搬送波を知る',b:'T2はのこぎり波の持続音、T3はゆっくり立ち上がるパッドの音、T4は和音。どれも【搬送波】の候補になる。VOCODERは、マスターの音をまとめて搬送波にするので、鳴らす音を選べば、搬送波を選べる。',tab:'trk'},
 {h:'聴き比べる',b:'のこぎり波、パッド、和音を、1つずつ聴き比べよう。搬送波が変わると、同じ母音の動きでも、響きがまるで変わる。',tab:'fx',cmp:[{l:'のこぎり波',mt:[3,4]},{l:'パッド',mt:[2,4]},{l:'和音',mt:[2,3]}],quiz:{q:'和音の響きで喋るのは?',ans:3,ex:'3が正解。和音を搬送波にすると、母音の動きが、和音の響きに乗って聞こえる。のこぎり波1音だと、単音のロボットのようになる。'}},
 {h:'選ぶコツ',b:'倍音が多い音ほど、母音の形がはっきり出る。倍音の少ない音は、母音の形を写しにくい。',tab:'fx'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。',tab:'fx',
  col:{h:'搬送波は材料',b:'ボコーダーは、搬送波の中にある周波数成分に、母音の強さを掛けて形を作る。材料が豊かなほど、豊かな声になる。のこぎり波や、和音のように、倍音が多い音を選ぼう。'}}
]}),
FT({id:'vc06',pre:['vc05'],terms:['vocoder'],save:{name:'しゃべらせる',kind:'kit'},title:'しゃべらせる',sub:'FORMANTをレーンで切り替える',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{vcOn:1,vcSrc:1}),steps:[
 {h:'動かさずに聴く',b:'FORMANT は0のまま。喋らせても、同じ口の形の声が続くだけ。',clr:'au',bars:4,tab:'fx'},
 {h:'FORMANTのレーンを作る',b:'AUTOタブで、VOCODER の FORMANT のレーンを作ろう。FORMANT は、声の帯域をずらして、口の大きさを変えるつまみ。',tab:'au',au:[{id:'vcFmt',trk:'M',has:1}]},
 {h:'声の形を切り替える',b:'先頭の-6stから、1小節ごとに0st、+6st、0stへ、階段で切り替えよう。声の太さが変わるたびに、口の形が変わって、喋っているように聞こえる。',tab:'au',
  au:[{id:'vcFmt',trk:'M',at:[[0,-6,.5],[B,0,.5],[2*B,6,.5],[3*B,0,.5]],stp:[[0,L4,4]]}],ref:[TM('vcFmt',[[0,-6,'S'],[B,0,'S'],[2*B,6,'S'],[3*B,0,'S'],[L4,0]])]},
 {h:'聴き比べる',b:'動かさない場合と、階段で切り替えた場合を聴き比べよう。',tab:'au',cmp:[{l:'動かさない',au:false,s:{vcFmt:0}},{l:'切り替える',ln:[TM('vcFmt',[[0,-6,'S'],[B,0,'S'],[2*B,6,'S'],[3*B,0,'S'],[L4,0]])]}],quiz:{q:'喋っているように聞こえるのは?',ans:2,ex:'2が正解。声の形が変わるたびに響きが変わるので、言葉のように聞こえる。1は同じ形の声が続くだけ。'}},
 {h:'使われどころ',b:'ロボットのセリフや、モノの喋るような演出を考えてみよう。',tab:'au',
  col:{h:'言葉に近づける',b:'本物の言葉は、母音と子音が、素早く入れ替わる。レーンを細かくしたり、NOISEで子音を足したりすると、近づいていく。完全な言葉は難しいが、喋っている雰囲気は作れる。'}}
]})
 );
})();
