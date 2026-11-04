/* v7.6a CM コンプレッサー(cm01〜cm08)。cm09〜cm15 は v7.6b。
   すべてトラック別インサートのCOMP(T I)。聞き比べ cmp の tm=トラック別インサートの値(トラック番号は1始まり・COMPの全つまみを書く)。
   cmp の g(音量補正dB)は tools/cm-cal.js(オフライン描画の測定)で出した値を GT に入れる。test/cm.js が差1dB以内・mt目標が達成できること・claim を検査する。
   数値は目安(SD.GUIDE の {g:} か、つまみ値と同じ数字のみ)。年号・人名・機材名は書かない */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags||['CM']})};
 A('thresh','スレッショルド','すれっしょるど','threshold','コンプが効き始める音量(しきい値)。これを超えた分だけ抑える。THRESHつまみで決める。',['cm01','cm02'],['CM']);
 A('cratio','レシオ','れしお','ratio','しきい値を超えた分を、どれだけ抑えるかの比率。4:1なら、超えた分を4分の1にする。大きいほど強く抑える。',['cm01','cm02'],['CM']);
 A('gr','ゲインリダクション(GR)','げいんりだくしょん','gain reduction (GR)','コンプがそのとき音量を下げている量(dB)。GRメーターで見る。0なら何もしていない。',['cm01','cm02'],['CM']);
 A('makeup','メイクアップ','めいくあっぷ','makeup gain','コンプで抑えて小さくなった分を、あとから持ち上げる音量。MAKEUPつまみ。',['cm04'],['CM']);
 A('knee','ニー','にー','knee','しきい値のあたりで、効き始めをどれだけなだらかにするか。0dBは急に効き、大きいほどなだらかに効き始める。',['cm05'],['CM']);
 A('catk','アタック(コンプ)','あたっく','attack (compressor)','コンプが音を抑え始めるまでの速さ。遅いと音の頭が抑えられずに通り、速いと頭から抑える。',['cm03'],['CM']);
 A('crel','リリース(コンプ)','りりーす','release (compressor)','コンプが抑えるのをやめて、音量を戻すまでの速さ。',['cm03'],['CM']);
 A('pump','ポンピング','ぽんぴんぐ','pumping','コンプの効き方で、音量が息をするように上がり下がりすること。わざと使う場合も、意図せず出る場合もある。',['cm08'],['CM']);
 A('limiter','リミッター','りみったー','limiter','音が上限を超えないように、大きな山をすばやく抑える最後の番人。RATIOがとても大きく、ATTACKがとても速いコンプの仲間。',['cm11'],['CM']);
 var P=SD.PATS,TK=P.tk;
 var z=function(a){var q={};a.forEach(function(i){q[i]=0});return q},all16=function(){var q={};for(var i=0;i<16;i++)q[i]=0;return q},sus=[1,2,3,4,5,6,7,9,10,11,12,13,14,15];
 SD.CATS.push({id:'cm1',synth:'analog',chapter:'course',course:'CM',name:'CM コンプレッサー'});
 /* 聞き比べの音量補正 g(dB)。キー '<レッスン>s<ステップ>' + 番号。値は tools/cm-cal.js が出す(0=補正なし) */
 var GT={'cm01s11':0,'cm01s12':-4.7,'cm01s31':-3.4,'cm01s32':-2.1,'cm01s33':0,'cm01s41':0,'cm01s42':-2.9,'cm01s43':-4.2,'cm01s51':0,'cm01s52':-3.1,'cm01s53':-3.7,'cm02s11':0,'cm02s12':-2.6,'cm02s13':-5.3,'cm02s51':-6.3,'cm02s52':0,'cm03s11':0,'cm03s12':-2.1,'cm03s13':-4.1,'cm03s41':-1.7,'cm03s42':-1.3,'cm03s43':0,'cm04s41':0,'cm04s42':-4.2,'cm04s43':-12.1,'cm05s11':0,'cm05s12':0,'cm05s13':0,'cm05s31':-1.3,'cm05s32':-2.1,'cm05s33':0,'cm05s41':-2.2,'cm05s42':0,'cm06s11':0,'cm06s12':-0.6,'cm06s13':-1.5,'cm06s41':0,'cm06s42':-3.7,'cm06s51':-0.6,'cm06s52':-1.5,'cm06s53':0,'cm07s11':0,'cm07s12':-7.4,'cm07s41':0,'cm07s42':-2.2,'cm07s51':0,'cm07s52':-8.3,'cm08s11':0,'cm08s12':-3.3,'cm08s31':0,'cm08s32':-1,'cm09s11':0,'cm09s12':-6.9,'cm09s31':0,'cm09s32':-1.1,'cm09s51':0,'cm09s52':-4.9,'cm10s11':0,'cm10s12':-2.1,'cm10s13':-0.6,'cm10s31':0,'cm10s32':-0.6,'cm10s33':-1.3,'cm10s41':-1.9,'cm10s42':0,'cm10s51':-2.1,'cm10s52':-0.6,'cm10s53':0,'cm13s11':0,'cm13s12':-2,'cm13s13':-4,'cm13s31':0,'cm13s32':-3.5,'cm13s33':-5.4,'cm13s41':0,'cm13s42':-13.7,'cm13s51':-2,'cm13s52':-4,'cm13s53':0,'cm14s21':0,'cm14s22':0,'cm15s21':-1.6,'cm15s22':0,'cm15s23':-5.6,'cm15s31':0,'cm15s32':-1.4,'cm15s33':-4.7,'cm15s41':0,'cm15s42':-2,'cm15s43':-1.2};
 var cm=function(key,items){return items.map(function(it,i){var o=Object.assign({l:it[0]},it[1]);var g=GT[key+(i+1)];if(g!==undefined)o.g=g;return o})};
 /* トラック別COMPの状態(全つまみ。既定+指定)。cmp の tm や tk の mx に使う。OFF=COMPなし */
 var CPD={iCpOn:1,iCpModel:3,iCpThr:-24,iCpRatio:3,iCpAtk:10,iCpRel:250,iCpMake:0,iCpKnee:6,iCpMix:1,iCpScHpf:20};
 var CP=function(o){return Object.assign({},CPD,o||{})},OFF={iCpOn:0};
 var NO=CP({iCpThr:0,iCpRatio:1});/* 最初の状態(何も抑えない) */
 var BASS={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:.3,noiseLvl:0,fType:'lowpass',cutoff:700,res:.1,envAmt:.3,drive:0,aA:.004,aD:.25,aS:.7,aR:.1};
 var PAD={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:9000,res:0,envAmt:0,drive:0,aA:.01,aD:.2,aS:.9,aR:.15};
 var KICK=function(mx){return TK('kick',P.fourFloor(),'キック',mx?{mx:{cp:mx}}:{})};
 var SNR=function(mx){return TK('snare',{idx:z([4,12]),o:{}},'スネア',mx?{mx:{cp:mx}}:{})};
 var HAT=function(){return TK('hat',{idx:z([0,2,4,6,8,10,12,14]),o:{}},'ハット',{acc:[2,6,10,14]})};
 var HATO=function(){return TK('hat',{idx:z([2,6,10,14]),o:{}},'ハット',{acc:[2,6,10,14]})};/* キック・スネアと同時に鳴らない裏拍だけ(リミッター前のピーク対策) */
 var VOX=function(mx){return TK('vo_a',{idx:{0:0,3:2,6:3,8:2,11:0,14:-2},o:{}},'声(代役)',{acc:[0,3,8],mx:{cp:mx}})};
 var STABO=function(mx){return {id:'bass',idx:z([2,6,10,14]),o:{name:'コード',scale:'minor',tr:12,p:PAD,mx:{cp:mx}}}};/* 裏拍だけ(キック・スネアと重ならない) */
 var RICH={o1Wave:'sawtooth',o1Lvl:.25,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:8000,res:0,envAmt:0,drive:0,aA:.004,aD:.25,aS:.8,aR:.1};
 var SPL=function(eq,cp){return Object.assign({},eq,CP(cp))};/* 聞き比べ用: EQの状態+COMPの全つまみ */
 var BP8=function(mx){return TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12],mx:{cp:mx}})};
 var BSY=function(mx){return TK('bass',P.bassPattern('syncop',0),'ベース',{scale:'minor',p:BASS,acc:[0,6],mx:{cp:mx}})};
 var STAB=function(name,mx){return {id:'bass',idx:z([0,4,8,12]),o:{name:name,scale:'minor',tr:12,p:PAD,mx:{cp:mx}}}};
 var SBN={iCpOn:1,iCpModel:3,iCpSc:0,iCpThr:-30,iCpRatio:4,iCpAtk:10,iCpRel:150,iCpMake:0,iCpKnee:6,iCpMix:1,iCpScHpf:20,iCpScLsn:0},SBS=SD.scMix({src:0,depth:.8,key:-14,rel:120});/* sb: バスCOMPの通常(INT)とSC(T1) */
 var qz=function(q,ans,ex){return {q:q,ans:ans,ex:ex}};
 var base=function(o){return Object.assign({cat:'cm1',synth:'analog',lv:2,course:'CM',mode:'trk',tab:'trk',oct:-1,demo:{n:[33]}},o)};
 SD.LESSONS.push(
/* ---------------- cm01 ---------------- */
base({id:'cm01',pre:['th02'],terms:['comp','dyn','gr','thresh','cratio'],title:'コンプとは(ダイナミクス)',sub:'大きい音を抑えて、差を縮める',ts:2,
 tk:[KICK(),BP8(NO)],steps:[
 {h:'コンプは音量の差を縮める',b:'【コンプレッサー】は、大きい音を自動で小さく抑えて、【ダイナミクス】(大きい音と小さい音の差)を縮める道具。T2のベースにCOMPがかかっている。いまは何も抑えない設定なので、原音のまま。\\nまず聞き比べて、COMPを入れると何が変わるか聴こう。音量は合わせてあるので、聴くのは「音量の差」だけ。',tab:'mix',
  cmp:cm('cm01s1',[['COMPなし',{tm:{2:OFF}}],['COMPあり',{tm:{2:CP({iCpThr:-30,iCpRatio:4})}}]])},
 {h:'GRメーターを見る',b:'T2のCOMPのTHRESHを-40〜-26dBまで下げ、RATIOは3〜6にしよう。再生すると、T2のGRメーターが動く。【ゲインリダクション(GR)】は、コンプがいま音量を下げている量(dB)。大きい音が来るたびに増え、小さくなると減る。0なら何もしていない。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-40,-26]},{trk:2,ins:'cp',k:'iCpRatio',rng:[3,6]}],mt:[{trk:2,m:'gr',rng:[2,14],hold:1.5}]},
 {h:'THRESH: どこから抑えるか',b:'【スレッショルド】(THRESH)は、効き始める音量。低くするほど、小さい音まで抑えるので、GRが増える。同じRATIOで、THRESHだけが違う3つを聴き比べて、いちばん強く抑えているものを選ぼう。',tab:'mix',
  cmp:cm('cm01s3',[['1',{tm:{2:CP({iCpThr:-18,iCpRatio:4})}}],['2',{tm:{2:CP({iCpThr:-30,iCpRatio:4})}}],['3',{tm:{2:CP({iCpThr:-42,iCpRatio:4})}}]]),quiz:qz('いちばん強く抑えているのは?',3,'3が正解。THRESHが-42dBまで低いので、ほとんどの音がしきい値を超え、GRが大きい。1は-18dBで、大きい音のてっぺんだけを抑える。')},
 {h:'RATIO: どれだけ抑えるか',b:'【レシオ】(RATIO)は、しきい値を超えた分をどれだけ抑えるか。4なら、超えた分を4分の1にする。RATIOを3〜8にして、変化を聴こう。数字が大きいほど、音量の山がそろう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpRatio',rng:[3,8]}],
  cmp:cm('cm01s4',[['RATIO 1.5',{tm:{2:CP({iCpThr:-30,iCpRatio:1.5})}}],['RATIO 4',{tm:{2:CP({iCpThr:-30,iCpRatio:4})}}],['RATIO 12',{tm:{2:CP({iCpThr:-30,iCpRatio:12})}}]]),quiz:qz('いちばん強く抑えているのは?',3,'3が正解(RATIO 12)。超えた分をほとんど通さないので、音量の山がほぼそろう。1は、超えた分の3分の2が残るので、ゆるやかに抑える程度。')},
 {h:'差が縮まるとどう聞こえるか',b:'コンプをかけると、大きい音が抑えられて、小さい音との差が縮まる。小さい音も聞き取りやすくなり、全体が安定して聞こえる。ただし抑えすぎると、メリハリが無くなって平らに聞こえる。',tab:'mix',
  cmp:cm('cm01s5',[['COMPなし',{tm:{2:OFF}}],['軽め',{tm:{2:CP({iCpThr:-28,iCpRatio:2})}}],['強め',{tm:{2:CP({iCpThr:-40,iCpRatio:8})}}]]),
  col:{h:'コンプは「かけるほど良くなる」わけではない',b:'コンプは音量を整える道具で、音色を良くする魔法ではない。ただ、抑えた分だけ音量が下がり、聞き比べでは「大きいほうが良い」と感じやすい。このコースの聞き比べは、音量差が1dB以内になるようそろえてある。判断は、小さめの音量でこまめに休みながら。'}}
]}),
/* ---------------- cm02 ---------------- */
base({id:'cm02',pre:['cm01'],terms:['comp','gr','thresh','cratio'],title:'THRESHとRATIO',sub:'しきい値と比率は「ペア」',ts:2,
 tk:[KICK(),{id:'bass',idx:all16(),o:{name:'ベース(のばす)',scale:'minor',tie:sus,p:BASS,mx:{cp:NO}}}],
 claim:[{trk:2,m:'gr',rng:[5,8],cp:{iCpThr:-30,iCpRatio:4}}],steps:[
 {h:'2つのつまみは「ペア」',b:'【スレッショルド】と【レシオ】は、2つで1組。THRESHが「どこから」で、RATIOが「どれだけ」。同じくらい抑えるのでも、組み合わせは何通りもある。T2は音が長く続くベース。GRが安定して読みやすい。\\nまず、3つの組み合わせを聴こう。',tab:'mix',
  cmp:cm('cm02s1',[['低め+弱め',{tm:{2:CP({iCpThr:-34,iCpRatio:2})}}],['中間',{tm:{2:CP({iCpThr:-30,iCpRatio:4})}}],['高め+強め',{tm:{2:CP({iCpThr:-26,iCpRatio:12})}}]])},
 {h:'軽い圧縮(GR 2〜3dB)',b:'まず軽く。T2のTHRESHを-27〜-23dB、RATIOを1.5〜3にして、GRが2〜3dBで安定するところを探そう。変化は小さいが、音量の山が少し丸くなる。軽い圧縮は、聴いて分かるか分からないかの境目。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-27,-23]},{trk:2,ins:'cp',k:'iCpRatio',rng:[1.5,3]}],mt:[{trk:2,m:'gr',rng:[2,3],hold:1.5}]},
 {h:'ふつうの圧縮(GR 5〜8dB)',b:'つぎは普通。THRESHを-32〜-26dB、RATIOを3〜6にして、GRを5〜8dBにしよう。音量のムラがはっきりそろうが、まだ自然。ベースや声のGRは、これより少し小さい{g:dyn.grBass}が始めの目安。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-32,-26]},{trk:2,ins:'cp',k:'iCpRatio',rng:[3,6]}],mt:[{trk:2,m:'gr',rng:[5,8],hold:1.5}]},
 {h:'強い圧縮(GR 10dB以上)',b:'さらに強く。THRESHを-44〜-36dB、RATIOを6〜20にして、GRを10dB以上にしよう。音量が大きくそろい、力強く聞こえる反面、音が平らで不自然になりやすい。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-44,-36]},{trk:2,ins:'cp',k:'iCpRatio',rng:[6,20]}],mt:[{trk:2,m:'gr',rng:[10,30],hold:1.5}]},
 {h:'同じGRでも、効き方が違う',b:'GRがほぼ同じでも、THRESHとRATIOの組み合わせで聞こえ方が違う。高いしきい値と強い比率は、大きい音だけを強く抑える。低いしきい値と弱い比率は、全体をまんべんなくゆるく抑える。どちらが良いかは、音と目的しだい。',tab:'mix',
  cmp:cm('cm02s5',[['高め+強め',{tm:{2:CP({iCpThr:-26,iCpRatio:12})}}],['低め+弱め',{tm:{2:CP({iCpThr:-40,iCpRatio:2})}}]]),
  col:{h:'ミックスに正解は1つではない',b:'ここで出てくる数値は、すべて始めの目安。曲や音色で、ちょうど良い設定は変わる。GRメーターは、耳で決めた設定の「結果」を確かめる道具として使おう。メーターの数字に合わせるのが目的ではない。'}}
]}),
/* ---------------- cm03 ---------------- */
base({id:'cm03',pre:['cm02'],terms:['comp','catk','crel','thresh','cratio','transient'],title:'ATTACKとRELEASE',sub:'パンチを通すか、潰すか',ts:3,
 tk:[KICK(CP({iCpThr:-26,iCpRatio:6,iCpAtk:10,iCpRel:400})),SNR(),BP8(NO)],steps:[
 {h:'アタック: 抑え始める速さ',b:'【アタック(コンプ)】は、しきい値を超えてから、実際に抑え始めるまでの速さ。T1のキックにCOMPがかかっている。アタックが速いと、音の頭(【立ち上がり】)から抑えられてパンチが減る。遅いと、頭が抑えられる前に通り抜けて、パンチが残る。',tab:'mix',
  cmp:cm('cm03s1',[['速い(0.5ms)',{tm:{1:CP({iCpThr:-26,iCpRatio:6,iCpAtk:.5,iCpRel:100})}}],['中(10ms)',{tm:{1:CP({iCpThr:-26,iCpRatio:6,iCpAtk:10,iCpRel:100})}}],['遅い(40ms)',{tm:{1:CP({iCpThr:-26,iCpRatio:6,iCpAtk:40,iCpRel:100})}}]]),quiz:qz('キックの頭のパンチが、いちばん残っているのは?',3,'3が正解(ATTACK 40ms)。抑え始めが遅く、音の頭が通り抜ける。1は頭から抑えられて、丸くおとなしい。')},
 {h:'パンチを通す設定',b:'T1のATTACKを20〜60msにしよう。しきい値を超えた直後の頭は通って、そのあとの部分が抑えられる。結果として、頭が目立つ=パンチのある音になる。',tab:'mix',
  mx:[{trk:1,ins:'cp',k:'iCpAtk',rng:[20,60]}]},
 {h:'速いと潰れる',b:'ATTACKを0.1〜2msに戻すと、音の頭まで抑えられる。パンチが丸まり、音が潰れて聞こえる。これは良くない設定ではなく、目的しだい。おとなしく平らにしたいときの選択肢でもある。',tab:'mix',
  mx:[{trk:1,ins:'cp',k:'iCpAtk',rng:[.1,2]}]},
 {h:'リリース: 戻る速さ',b:'【リリース(コンプ)】は、音が小さくなってから、抑えるのをやめて音量を戻すまでの速さ。キックは4つ打ちで、120BPMなら次のキックまで500ms。リリースが短いと次のキックの前に戻りきり、長いと戻りきらないうちに次が来る。',tab:'mix',
  cmp:cm('cm03s4',[['短い(50ms)',{tm:{1:CP({iCpThr:-26,iCpRatio:6,iCpAtk:10,iCpRel:50})}}],['中(200ms)',{tm:{1:CP({iCpThr:-26,iCpRatio:6,iCpAtk:10,iCpRel:200})}}],['長い(800ms)',{tm:{1:CP({iCpThr:-26,iCpRatio:6,iCpAtk:10,iCpRel:800})}}]]),quiz:qz('次のキックまでに、抑えが戻りきらないのは?',3,'3が正解(RELEASE 800ms)。キックの間隔は500msなので、戻りきる前に次のキックが来て、ずっと抑えたままになる。')},
 {h:'テンポに合わせる',b:'リリースは、テンポに合わせて決める考え方がある。次の拍の前に戻りきるくらい(120BPMの1拍500msより短く)にすると、グルーヴを保ちやすい。T1のRELEASEを100〜300msにしよう。',tab:'mix',
  mx:[{trk:1,ins:'cp',k:'iCpRel',rng:[100,300]}],
  col:{h:'アタックとリリースに正解はない',b:'「アタックを遅く・リリースをテンポに合わせる」は、パンチを残したいときの出発点。逆に、速いアタックで頭を抑えて、おとなしくまとめたい場合もある。聞き比べて、曲に合うほうを選ぼう。'}}
]}),
/* ---------------- cm04 ---------------- */
base({id:'cm04',pre:['cm02'],terms:['comp','makeup','gr','thresh','cratio'],title:'MAKEUPと聞き比べの落とし穴',sub:'大きい音は「良く」聞こえる',ts:2,
 tk:[KICK(),BP8(NO)],steps:[
 {h:'抑えると音量が変わる',b:'コンプは大きい音を抑えるので、抑えた分だけ音量は下がる。実機のコンプは、この分を自分で持ち上げるのが一般的。このアプリのCOMPは、抑えた分の一部を自動で持ち上げているので、強くかけても極端には小さくならない。\\nT2のTHRESHを-40〜-30dB、RATIOを4〜8にして、強めにかけよう。GRが増えると音量の感じが変わる。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-40,-30]},{trk:2,ins:'cp',k:'iCpRatio',rng:[4,8]}],mt:[{trk:2,m:'gr',rng:[6,20],hold:1.5}]},
 {h:'MAKEUPで持ち上げる',b:'【メイクアップ】(MAKEUP)は、抑えた分をさらに持ち上げる音量。T2のMAKEUPを4〜9dBにしよう。自動の補正に足されるので、COMPなしよりはっきり大きくなる。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpMake',rng:[4,9]}]},
 {h:'大きい音は「良く」聞こえる',b:'人の耳は、少し大きい音のほうを「良い音」と感じやすい。コンプをかけてMAKEUPで持ち上げると、「良くなった」のか「大きくなっただけ」なのか分からなくなる。\\nT2のMAKEUPを0に戻して、上げて、と自分で動かして聴き比べてみよう。大きいほうが、何となく良く聞こえるはず。',tab:'mix'},
 {h:'音量をそろえて比べる',b:'音量をそろえて比べると、違いは「音量の差」ではなく「音の性質の差」だけになる。次の聞き比べは、音量差が1dB以内になるよう補正済み。MAKEUPが違うだけの2つは、補正すると同じに聞こえるはず。',tab:'mix',
  cmp:cm('cm04s4',[['COMPなし',{tm:{2:OFF}}],['COMPあり MAKEUP 0',{tm:{2:CP({iCpThr:-36,iCpRatio:6,iCpMake:0})}}],['COMPあり MAKEUP 8',{tm:{2:CP({iCpThr:-36,iCpRatio:6,iCpMake:8})}}]])},
 {h:'比べる前に音量をそろえる',b:'ミックスでも同じ。COMPやEQの前後を比べるときは、MAKEUPやVOLで音量をそろえてから判断する。そろえてなお良いと感じるなら、それは音の性質の違い。',tab:'mix',
  col:{h:'「そろえる」は基本',b:'音量が違うまま比べると、どうしても大きいほうを選びがちになる。このコースの聞き比べは、すべて音量差が1dB以内になるようそろえてある。自分のミックスでも、比べる前にそろえる習慣をつけよう。'}}
]}),
/* ---------------- cm05 ---------------- */
base({id:'cm05',pre:['cm04'],terms:['comp','knee','gr','thresh','cratio'],title:'KNEEとタイプ(FET/OPTO/VCA)',sub:'効き始めのやわらかさとクセ',ts:2,
 tk:[KICK(),BP8(CP({iCpThr:-32,iCpRatio:4,iCpKnee:6}))],steps:[
 {h:'ニー: 効き始めのなだらかさ',b:'【ニー】(KNEE)は、しきい値のあたりで、効き始めをどれだけなだらかにするか。0dBなら、しきい値を超えた瞬間から急に効く。12dBなら、しきい値の手前から少しずつ効き始める。音のつながりが自然になるのは、なだらかなほう。',tab:'mix',
  cmp:cm('cm05s1',[['KNEE 0dB',{tm:{2:CP({iCpThr:-32,iCpRatio:4,iCpKnee:0})}}],['KNEE 6dB',{tm:{2:CP({iCpThr:-32,iCpRatio:4,iCpKnee:6})}}],['KNEE 12dB',{tm:{2:CP({iCpThr:-32,iCpRatio:4,iCpKnee:12})}}]])},
 {h:'ハードニーとソフトニー',b:'T2のKNEEを0〜2dBにすると、効きがはっきりして、抑えている感じが出る(ハードニー)。8〜12dBにすると、効いているか分かりにくいほど自然(ソフトニー)。両方を動かして、違いを聴こう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpKnee',rng:[8,12]}]},
 {h:'3つのタイプ',b:'COMP TYPEは、圧縮のクセの違い。FETは速くて元気、OPTOはゆったり、VCAはクセが少ない、という傾向がある。同じTHRESHとRATIOでタイプだけを変えて聴こう。FETとVCAは、アタックを速く設定できる。OPTOは、アタックが決まっていて遅め。',tab:'mix',
  cmp:cm('cm05s3',[['FET',{tm:{2:CP({iCpModel:1,iCpThr:-32,iCpRatio:4})}}],['OPTO',{tm:{2:CP({iCpModel:2,iCpThr:-32,iCpRatio:4})}}],['VCA',{tm:{2:CP({iCpModel:3,iCpThr:-32,iCpRatio:4})}}]])},
 {h:'どれがクセのある音?',b:'タイプによって、同じ設定でも、抑え方と色づけが違う。FETは、抑えるほど倍音が増える。OPTOは、長く抑えるほど戻りがゆっくりになる。VCAは、設定どおりに素直に動く。まずは「VCAをふつう、FETとOPTOはクセ」くらいに考えるとよい。',tab:'mix',
  cmp:cm('cm05s4',[['1',{tm:{2:CP({iCpModel:2,iCpThr:-32,iCpRatio:4,iCpRel:600})}}],['2',{tm:{2:CP({iCpModel:3,iCpThr:-32,iCpRatio:4,iCpRel:600})}}]]),quiz:qz('設定どおりに素直に動く、クセの少ないほうは?',2,'2が正解(VCA)。OPTOは、長く抑えたあとほど戻りがゆっくりになる性質があって、同じ設定でも動きが読みにくい。')},
 {h:'タイプの選び方',b:'タイプに優劣はない。パンチや元気さがほしければFET、ゆったりなじませたければOPTO、素直に整えたいならVCA、というのが出発点。迷ったら、聞き比べて、曲に合うものを選ぼう。',tab:'mix',
  col:{h:'タイプ名の由来',b:'FET・OPTO・VCAは、もともと、コンプの中で音量を下げる部品の種類の名前。このアプリのタイプは、それぞれのクセの傾向を近似したもの。実機の再現ではない。'}}
]}),
/* ---------------- cm06 ---------------- */
base({id:'cm06',pre:['cm05'],terms:['comp','catk','crel','gr','transient'],title:'ドラムのコンプ',sub:'パンチを増やす・サステインを増やす',ts:3,
 tk:[KICK(CP({iCpThr:-26,iCpRatio:6,iCpAtk:10,iCpRel:100})),SNR(CP({iCpThr:-18,iCpRatio:6,iCpAtk:10,iCpRel:100})),HATO()],steps:[
 {h:'2つの使い方',b:'ドラムのコンプには、大きく2つの使い方がある。アタックを遅くして頭を通す=パンチを増やす。アタックとリリースを速くして、頭を抑えて余韻を持ち上げる=サステインを増やす。T2のスネアにCOMPがかかっている。聞き比べて、違いを聴こう。',tab:'mix',
  cmp:cm('cm06s1',[['COMPなし',{tm:{2:OFF}}],['パンチ',{tm:{2:CP({iCpThr:-18,iCpRatio:6,iCpAtk:30,iCpRel:100})}}],['サステイン',{tm:{2:CP({iCpThr:-18,iCpRatio:6,iCpAtk:.5,iCpRel:60,iCpMake:4})}}]])},
 {h:'スネアのパンチを増やす',b:'T2のATTACKを15〜50ms、RELEASEを60〜200msにしよう。スネアの頭が通って、アタックの鋭さが立つ。THRESHは-24〜-14dB。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpAtk',rng:[15,50]},{trk:2,ins:'cp',k:'iCpRel',rng:[60,200]},{trk:2,ins:'cp',k:'iCpThr',rng:[-24,-14]}]},
 {h:'スネアのサステインを増やす',b:'つぎは逆。T2のATTACKを0.1〜3ms、RELEASEを40〜120msにして、MAKEUPを3〜9dBにしよう。頭が抑えられ、余韻が相対的に持ち上がって、太く長く聞こえる。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpAtk',rng:[.1,3]},{trk:2,ins:'cp',k:'iCpRel',rng:[40,120]},{trk:2,ins:'cp',k:'iCpMake',rng:[3,9]}]},
 {h:'キックも同じ考え方',b:'キックでも同じ。T1のATTACKを15〜50msにすると、アタックの点が残って、抜けが良くなる。逆にATTACKを速くすると、まとまりが出る代わりにおとなしくなる。',tab:'mix',
  mx:[{trk:1,ins:'cp',k:'iCpAtk',rng:[15,50]}],
  cmp:cm('cm06s4',[['キック・速い',{tm:{1:CP({iCpThr:-26,iCpRatio:6,iCpAtk:.5,iCpRel:100})}}],['キック・遅い',{tm:{1:CP({iCpThr:-26,iCpRatio:6,iCpAtk:30,iCpRel:100})}}]])},
 {h:'どれ?',b:'聞き比べて、スネアの頭が抑えられて、余韻が持ち上がって聞こえるものを選ぼう。',tab:'mix',
  cmp:cm('cm06s5',[['1',{tm:{2:CP({iCpThr:-18,iCpRatio:6,iCpAtk:30,iCpRel:100})}}],['2',{tm:{2:CP({iCpThr:-18,iCpRatio:6,iCpAtk:.5,iCpRel:60,iCpMake:4})}}],['3',{tm:{2:OFF}}]]),quiz:qz('スネアの頭が抑えられ、余韻が持ち上がったのは?',2,'2が正解。アタックが速く、リリースも速いので、頭が抑えられて余韻が目立つ。1はアタックが遅くて頭が残る。3はCOMPなし。')},
 {h:'ドラムは「まとめて」も掛ける',b:'ドラムのコンプは、1つずつ掛ける方法と、ドラム全体を1つにまとめて掛ける方法がある。まとめて掛けるときは、バスを使う(後のレッスンで扱う)。ドラムバスのGRは、{g:dyn.grDrumBus}が始めの目安。',tab:'mix',
  col:{h:'パンチとサステインは両立しにくい',b:'パンチを残すにはアタックを遅く、サステインを増やすには速く。同じコンプで両方は取れないので、役割に合わせて選ぶ。両方ほしいときは、コンプを2段にする、パラレルで混ぜる、などの方法がある(cm10で扱う)。'}}
]}),
/* ---------------- cm07 ---------------- */
base({id:'cm07',pre:['cm05'],terms:['comp','gr','thresh','cratio','crel','makeup','sub','low'],title:'ベースのコンプ',sub:'音量のムラをそろえて低域を安定させる',ts:2,
 tk:[KICK(),BSY(NO)],
 claim:[{trk:2,m:'gr',rng:[3,6],cp:{iCpThr:-26,iCpRatio:3,iCpAtk:20,iCpRel:300,iCpMake:3}}],steps:[
 {h:'ベースは音量のムラが出やすい',b:'ベースは、音程や強さで、音量がばらつきやすい。低域は特に、音量がそろっていないとミックス全体が不安定になる。T2のベースにCOMPがかかっている。聞き比べて、そろうとどう聞こえるか聴こう。',tab:'mix',
  cmp:cm('cm07s1',[['COMPなし',{tm:{2:OFF}}],['COMPあり',{tm:{2:CP({iCpThr:-26,iCpRatio:3,iCpAtk:20,iCpRel:300,iCpMake:3})}}]])},
 {h:'GRの目安を探す',b:'ベースのGRは、{g:dyn.grBass}が始めの目安。T2のTHRESHを-32〜-22dB、RATIOを2.5〜4にして、メーターを見ながら探そう。ATTACKは15〜40msにして、音の頭を少し通す。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-32,-22]},{trk:2,ins:'cp',k:'iCpRatio',rng:[2.5,4]},{trk:2,ins:'cp',k:'iCpAtk',rng:[15,40]}],mt:[{trk:2,m:'gr',rng:[2,8],hold:1.5}]},
 {h:'リリースは音の長さに',b:'ベースの音が短いのに、リリースが長すぎると、次の音にも抑えが残る。T2のRELEASEを300〜600msにして、ベースのリズムに合うか確かめよう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpRel',rng:[300,600]}]},
 {h:'SC HPFで低音に引っぱられない',b:'ベースのコンプは、低い音の大きな波に引っぱられて、必要以上に抑えやすい。SC HPFは、圧縮の判定にだけ使うローカット。SC HPFを80〜150Hzにすると、低い基音に引っぱられにくくなる。聞き比べて、ベースの輪郭の違いを聴こう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpScHpf',rng:[80,150]}],
  cmp:cm('cm07s4',[['SC HPF 20Hz',{tm:{2:CP({iCpThr:-26,iCpRatio:3,iCpAtk:20,iCpRel:300,iCpMake:3,iCpScHpf:20})}}],['SC HPF 120Hz',{tm:{2:CP({iCpThr:-26,iCpRatio:3,iCpAtk:20,iCpRel:300,iCpMake:3,iCpScHpf:120})}}]])},
 {h:'かけすぎると',b:'GRを大きくしすぎると、ベースが潰れて、ふくらみや抜けが無くなる。聞き比べて、ふつうの設定と比べよう。',tab:'mix',
  cmp:cm('cm07s5',[['ふつう',{tm:{2:CP({iCpThr:-26,iCpRatio:3,iCpAtk:20,iCpRel:300,iCpMake:3})}}],['かけすぎ',{tm:{2:CP({iCpThr:-48,iCpRatio:12,iCpAtk:2,iCpRel:100,iCpMake:12})}}]]),
  col:{h:'ベースとキックの関係',b:'ベースを整えると、キックとの音量の関係も安定する。キックとベースが同じ低域で重なるときは、EQで棲み分ける(eq08)、ベースを少し抑えるなどの方法もある。コンプだけで解決しようとしないのがコツ。'}}
]}),
/* ---------------- cm08 ---------------- */
base({id:'cm08',pre:['cm05'],terms:['comp','pump','crel','gr','thresh','cratio','pad'],title:'コード・パッドのコンプ',sub:'一体感と、ポンピングとの境目',ts:2,
 tk:[KICK(),STAB('コード',NO)],steps:[
 {h:'コードを一体にする',b:'コードやパッドは、同時に鳴る音が多く、音量が上下しやすい。軽くコンプをかけると、全体が一体にまとまる。T2のコードは、1拍ごとに鳴るスタブ。聞き比べて、まとまり方を聴こう。',tab:'mix',
  cmp:cm('cm08s1',[['COMPなし',{tm:{2:OFF}}],['軽く',{tm:{2:CP({iCpThr:-30,iCpRatio:2.5,iCpAtk:20,iCpRel:300})}}]])},
 {h:'軽く掛ける',b:'T2のTHRESHを-34〜-26dB、RATIOを2〜3にして、ATTACKを10〜30ms、RELEASEを200〜400msにしよう。GRは小さめ(1〜3dB程度)で、一体感が出る。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-34,-26]},{trk:2,ins:'cp',k:'iCpRatio',rng:[2,3]},{trk:2,ins:'cp',k:'iCpRel',rng:[200,400]}]},
 {h:'リリースが短いと息をする',b:'RELEASEを短くすると、コードが鳴り終わるたびに、抑えがすぐ戻って音量が持ち上がる。コードの余韻が、音量が上下しながら聞こえる。これが【ポンピング】。わざと使えば効果になるが、意図せず出ると耳につく。',tab:'mix',
  cmp:cm('cm08s3',[['リリース長め',{tm:{2:CP({iCpThr:-36,iCpRatio:6,iCpAtk:10,iCpRel:400})}}],['リリース短め',{tm:{2:CP({iCpThr:-36,iCpRatio:6,iCpAtk:10,iCpRel:40})}}]]),quiz:qz('音量が息をするように上下するのは?',2,'2が正解(RELEASE 40ms)。抑えがすぐ戻るので、コードの余韻が持ち上がり、音量が上下して聞こえる。1は戻りがゆっくりで、音量の動きがなだらか。')},
 {h:'境目を探す',b:'T2のTHRESHを-44〜-34dB、RATIOを6〜12、RELEASEを30〜80msにして、わざとポンピングを出してみよう。次に、RELEASEを300〜600msに戻すと、ポンピングが消える。この境目を耳で覚えておこう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-44,-34]},{trk:2,ins:'cp',k:'iCpRatio',rng:[6,12]},{trk:2,ins:'cp',k:'iCpRel',rng:[30,80]}]},
 {h:'ポンピングを使う',b:'ポンピングは、ダンスミュージックでは、わざと使う効果でもある。たとえばキックに合わせて、ほかの音を上下させる。その場合は、コンプだけでなく、サイドチェイン(cm12・au35)の考え方で作る。ここでの目的は「意図せず出さない」こと。',tab:'mix',
  col:{h:'一体感とポンピングは近い',b:'コンプで一体感を出す設定を強くしていくと、いつのまにかポンピングになる。境目は曲や音色で違うので、数字ではなく、耳で確かめる。迷ったら、リリースを少し長めにするのが安全。'}}
]}),
/* ---------------- cm09 ---------------- */
base({id:'cm09',pre:['cm07'],terms:['comp','gr','thresh','cratio','crel','makeup'],title:'リード・声のコンプ',sub:'前に出す・起伏をならす',ts:2,
 tk:[KICK(),VOX(NO),HATO()],
 claim:[{trk:2,m:'gr',rng:[3,6],cp:{iCpThr:-30,iCpRatio:3,iCpAtk:15,iCpRel:200,iCpMake:3}}],steps:[
 {h:'声は起伏が大きい',b:'歌は、強く歌う音と弱く歌う音の差が大きい。小さい音はほかの音に埋もれ、大きい音は飛び出す。コンプで差を縮めると、全体が聞き取りやすくなる。T2は声の代役(合成音)にCOMPがかかっている。聞き比べよう。',tab:'mix',
  cmp:cm('cm09s1',[['COMPなし',{tm:{2:OFF}}],['COMPあり',{tm:{2:CP({iCpThr:-30,iCpRatio:3,iCpAtk:15,iCpRel:200,iCpMake:3})}}]])},
 {h:'GRの目安を探す',b:'声のGRは、{g:dyn.grVocal}が始めの目安。T2のTHRESHを-36〜-26dB、RATIOを2.5〜4にして、メーターを見ながら探そう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-36,-26]},{trk:2,ins:'cp',k:'iCpRatio',rng:[2.5,4]}],mt:[{trk:2,m:'gr',rng:[2,8],hold:1.5}]},
 {h:'アタックは少し遅め',b:'アタックを速くすると、言葉の頭が抑えられて、こもって聞こえる。T2のATTACKを15〜30ms、RELEASEを120〜200msにして、言葉の頭を通しつつ、息継ぎの前で戻るようにしよう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpAtk',rng:[15,30]},{trk:2,ins:'cp',k:'iCpRel',rng:[120,200]}],
  cmp:cm('cm09s3',[['アタック速い',{tm:{2:CP({iCpThr:-30,iCpRatio:3,iCpAtk:.5,iCpRel:200,iCpMake:3})}}],['アタック遅め',{tm:{2:CP({iCpThr:-30,iCpRatio:3,iCpAtk:20,iCpRel:200,iCpMake:3})}}]])},
 {h:'MAKEUPで前に出す',b:'抑えたぶん、小さい音が相対的に持ち上がる。T2のMAKEUPを2〜6dBにすると、声がオケの前に出てくる。ただし音量が上がったぶん「良く聞こえる」だけかもしれないので、聞き比べは音量をそろえて行う(cm04)。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpMake',rng:[2,6]}]},
 {h:'かけすぎると',b:'強くかけすぎると、息づかいや小さい声まで持ち上がり、声が平らで疲れる音になる。聞き比べて、ふつうの設定と比べよう。',tab:'mix',
  cmp:cm('cm09s5',[['ふつう',{tm:{2:CP({iCpThr:-30,iCpRatio:3,iCpAtk:15,iCpRel:200,iCpMake:3})}}],['かけすぎ',{tm:{2:CP({iCpThr:-50,iCpRatio:12,iCpAtk:3,iCpRel:80,iCpMake:12})}}]]),
  quiz:qz('声が平らになって息づかいまで持ち上がったのは?',2,'2が正解。THRESHが低くRATIOが高いので、小さい音まで強く抑えられて起伏がなくなる。')},
 {h:'歌ものの全体へ',b:'声のコンプは、EQやDE-ESS、リバーブと組み合わせて使う。順番や役割は、歌もの(VO)のレッスンで扱う。ここではコンプだけで、起伏がならされる感覚をつかめればよい。',tab:'mix',
  col:{h:'リードにも同じ考え方',b:'シンセのリードも、音量の起伏をならすと前に出る。声ほど息づかいを気にしなくてよいので、少し強めにかけてもよい。ただし「強くかけたほうが前に出る」とは限らない。音量をそろえて確かめよう。'}}
]}),
/* ---------------- cm10 ---------------- */
base({id:'cm10',pre:['cm05'],terms:['comp','gr','thresh','cratio','parallel'],title:'パラレルコンプ',sub:'原音と圧縮音を混ぜる',ts:2,
 tk:[KICK(),SNR(NO),HATO()],
 claim:[{trk:2,m:'gr',rng:[3,7],cp:{iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:.4}}],steps:[
 {h:'潰さずに密度だけ足す',b:'強く潰したコンプの音は、密度や迫力がある代わりに、元の勢いが失われる。そこで、潰した音と原音を混ぜる。これが【パラレル処理】(コンプなら、パラレルコンプ)。原音の勢いを残したまま、密度だけ足せる。T2のスネアにCOMPのMIXがかかっている。聞き比べよう。',tab:'mix',
  cmp:cm('cm10s1',[['COMPなし',{tm:{2:OFF}}],['潰しきり(MIX 100%)',{tm:{2:CP({iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:1})}}],['パラレル(MIX 40%)',{tm:{2:CP({iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:.4})}}]])},
 {h:'強く潰す',b:'まず圧縮側を強く作る。T2のTHRESHを-48〜-34dB、RATIOを8〜12、ATTACKを0.1〜3ms、RELEASEを60〜150msにしよう。MIX 100%だと、潰れて平らな音になる。これを原音と混ぜる。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-48,-34]},{trk:2,ins:'cp',k:'iCpRatio',rng:[8,12]},{trk:2,ins:'cp',k:'iCpAtk',rng:[.1,3]},{trk:2,ins:'cp',k:'iCpRel',rng:[60,150]}]},
 {h:'MIXで混ぜる',b:'T2のMIXを25〜60%にしよう。0%は原音だけ、100%は圧縮した音だけ。混ぜる量が増えるほど、密度が増えて勢いが減る。聞き比べて、混ぜ方の違いを聴こう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpMix',rng:[.25,.6]}],
  cmp:cm('cm10s3',[['MIX 20%',{tm:{2:CP({iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:.2})}}],['MIX 50%',{tm:{2:CP({iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:.5})}}],['MIX 80%',{tm:{2:CP({iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:.8})}}]])},
 {h:'ふつうのコンプと比べる',b:'同じ「密度」を、ふつうのコンプで作ると、アタックが遅くても頭が少し削れる。パラレルは、頭(原音)が混ざるぶん、勢いが残る。音量をそろえて聞き比べよう。',tab:'mix',
  cmp:cm('cm10s4',[['ふつうのコンプ',{tm:{2:CP({iCpThr:-34,iCpRatio:4,iCpAtk:5,iCpRel:100,iCpMix:1})}}],['パラレル',{tm:{2:CP({iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:.4})}}]])},
 {h:'どれ?',b:'聞き比べて、スネアの頭の勢いが残っていて、同時に余韻の密度もあるものを選ぼう。',tab:'mix',
  cmp:cm('cm10s5',[['1',{tm:{2:CP({iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:1})}}],['2',{tm:{2:CP({iCpThr:-40,iCpRatio:10,iCpAtk:1,iCpRel:100,iCpMix:.4})}}],['3',{tm:{2:OFF}}]]),
  quiz:qz('勢いも密度もあるのは?',2,'2が正解(MIX 40%)。1は潰しきりで勢いが失われ、3はCOMPなしで密度が足りない。')},
 {h:'実機のDAWでは',b:'実機のDAWでは、トラックを複製するか、センドで別のトラックに送って潰し、元のトラックと混ぜるのが一般的。ここでは1つのCOMPの中のMIXつまみで、同じ結果を近似している。',tab:'mix',
  col:{h:'ドラムバスでよく使う',b:'パラレルコンプは、ドラム全体にかけると効果が分かりやすい。個別のトラックで潰しすぎるより、まとめて潰して原音と混ぜるほうが、扱いやすいことが多い。'}}
]}),
/* ---------------- cm11 ---------------- */
base({id:'cm11',pre:['th02','cm05'],terms:['limiter','clip','peak','rms','comp','headroom'],title:'リミッターとクリップ',sub:'ピークを止める役目と、かけすぎの歪み',mode:undefined,tk:undefined,tab:'fx',oct:0,ts:undefined,
 demo:{n:[48,55,60,55],gap:.7,len:.5},init:{o1Wave:'sawtooth',o1Lvl:.6,cutoff:6000,aA:.003,aD:.3,aS:.8,aR:.2},steps:[
 {h:'リミッターは最後の番人',b:'【リミッター】は、音が決めた上限を超えないように、大きな山だけをすばやく抑える最後の番人。コンプの仲間で、RATIOがとても大きく、ATTACKがとても速い。このアプリでは、マスターの最後に上限用のリミッターが入っていて、数値は変えられない。',tab:'fx'},
 {h:'上限を超えると【クリップ】',b:'リミッターで止められなかった山は、上限で波形が切られて、ひずむ。これが【クリップ】。ここでは、ドライブで波形をつぶして、ひずみの手ざわりを聴こう。',tab:'fx',
  cmp:[{l:'ドライブ 0%',s:{drive:0}},{l:'ドライブ 60%',s:{drive:.6}},{l:'ドライブ 100%',s:{drive:1}}]},
 {h:'コンプでリミッターのように',b:'マスターのコンプのRATIOを最大に、ATTACKを最短に近づけると、リミッターのように大きい山だけを止められる。THRESHを-24〜-14dB、RATIOを16〜20、ATTACKを0.01〜1msにして、MAKEUPで持ち上げよう。',tab:'fx',
  f:[['cpOn',1],['cpThr',-18],['cpRatio',18],['cpAtk',.5],['cpRel',100],['cpMake',6]],
  cmp:[{l:'コンプなし',s:{cpOn:0}},{l:'リミッター風',s:{cpOn:1,cpThr:-18,cpRatio:18,cpAtk:.5,cpRel:100,cpMake:6}}]},
 {h:'ピークは同じで、RMSが上がる',b:'リミッター風にして持ち上げると、山(ピーク)が増えずに、全体の平均(RMS)だけ上がる。耳には「大きく、迫力がある」と聞こえる。ただし音量が上がったぶん、良く聞こえているだけかもしれない。音量をそろえて確かめよう(cm04)。',tab:'fx'},
 {h:'かけすぎると',b:'THRESHを下げすぎてMAKEUPを上げすぎると、いつも抑えられていて、音が平らになり、低い音に引っぱられて全体の音量が波打つ。ひずみも出る。聞き比べて、ふつうの設定と比べよう。',tab:'fx',
  cmp:[{l:'ほどほど',s:{cpOn:1,cpThr:-18,cpRatio:18,cpAtk:.5,cpRel:100,cpMake:6}},{l:'かけすぎ',s:{cpOn:1,cpThr:-48,cpRatio:20,cpAtk:.01,cpRel:30,cpMake:20}}],
  quiz:{q:'平らで、ひずみが出ているのは?',ans:2,ex:'2が正解。THRESHが低すぎてMAKEUPも大きいので、いつも強く抑えられ、山がつぶれてひずむ。'}},
 {h:'ピークを止めるのが役目',b:'リミッターは、音を整える道具ではなく、ピークを止める保険。ミックスの途中で音量が足りないときに、リミッターで解決しようとすると、潰れた音になる。先にバランスを整え、最後に上限だけ止めるのが基本。',tab:'fx',
  col:{h:'クリップは悪者とは限らない',b:'わざと波形をつぶして、音に迫力やざらつきを足す使い方もある。ただし、意図せず出るクリップは、ただの雑音になる。いつ、わざとやっているのかを、自分で決めておこう。'}}
]}),
/* ---------------- cm12 ---------------- */
base({id:'cm12',pre:['cm05','ly10'],terms:['comp','sidechain','gr','thresh','cratio'],title:'サイドチェインの使い分け',sub:'キックで抜く・リズムの形を作る',ts:2,
 tk:[KICK(),TK('bass',P.bassPattern('eighth',0),'ベース(COMPだけ)',{scale:'minor',p:BASS,acc:[0,4,8,12],mx:{cp:CP({iCpThr:-20,iCpRatio:2,iCpAtk:5,iCpRel:150})}}),TK('bass',P.bassPattern('eighth',0),'ベース(SC)',{scale:'minor',p:BASS,acc:[0,4,8,12],mix:SD.scMix({src:0,depth:.8,key:-14})})],steps:[
 {h:'キックの場所を空ける',b:'キックとベースが同じ場所で鳴ると、ぶつかる。キックのたびにベースを下げて、道を空ける手法が【サイドチェイン】。コンプの【サイドチェイン】入力(SC SRC)をT1のキックにすると、キックの音を合図に、ベースのコンプが動く。T2はふつうのコンプだけ、T3はキックを合図にしたサイドチェインのベース。聞き比べよう。',tab:'mix',
  cmp:[{l:'コンプだけ',mt:[2],tm:{2:CP({iCpThr:-44,iCpRatio:8,iCpAtk:5,iCpRel:150})}},{l:'サイドチェイン',mt:[1]}]},
 {h:'コンプは自分の音量で動く',b:'ふつうのコンプは、そのトラック自身の音量を見て動く。キックが鳴っているかどうかは知らない。T2のTHRESHを-52〜-40dB、RATIOを6〜12にして、強くかけても、へこむタイミングはベースの音量しだいで、キックの位置とは関係がないことを確かめよう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-52,-40]},{trk:2,ins:'cp',k:'iCpRatio',rng:[6,12]}]},
 {h:'サイドチェインはキックの音で動く',b:'T3のコンプは、SC SRCがT1(キック)になっている。キックが鳴るたびに、その音を聞いてベースを下げる。T3を選んでMIXタブのCOMPを開き、THRESHとRELEASEを動かそう。THRESHを下げるほど深くへこみ、RELEASEは戻る速さ。戻る速さをテンポに合わせると、リズムの形になる。',tab:'mix'},
 {h:'どちら?',b:'聞き比べて、キックのたびにベースが一瞬へこむものを選ぼう。',tab:'mix',
  cmp:[{l:'1',mt:[1]},{l:'2',mt:[2]}],quiz:qz('キックに合わせてへこむのは?',1,'1が正解(T3のサイドチェイン)。キックの音を合図にへこむので、キックの位置とそろう。2のコンプだけは、ベース自身の音量で動く。')},
 {h:'使い分けの考え方',b:'ふつうのコンプは「音量をそろえる」道具で、サイドチェインは「別の音に合わせて道を空ける・リズムの形を作る」道具。目的がそろえることならふつうのコンプ、道を空けることならサイドチェイン。両方を重ねてもよい。',tab:'mix'},
 {h:'実機のDAWでも同じ',b:'実機のDAWのコンプには、別のトラックの音声でコンプを動かすサイドチェイン入力がある。このアプリのCOMPのSC SRCも、同じ働きをする。T3のコンプは、T1のキックの音を聞いて動くので、キックの音量に合わせて、ベースが下がる。',tab:'mix',
  col:{h:'ノートの合図(DUCK)とのちがい',b:'このアプリには、ノートの合図でへこませるDUCK(疑似)もある。DUCKは、キックが小さく鳴ってもへこむ深さが変わらない。音声のサイドチェインは、キックの大きさにあわせて抑え方が変わる。実機のDAWと同じなのは、音声のサイドチェインのほう。'}}
]}),
/* ---------------- cm13 ---------------- */
base({id:'cm13',pre:['cm08','cm10'],terms:['comp','gr','thresh','cratio','catk','crel','pump','makeup'],title:'コンプの飛び道具',sub:'歪み・ポンピング・余韻の持ち上げ',ts:2,
 tk:[KICK(),SNR(NO),STABO(NO)],
 claim:[{trk:2,m:'gr',rng:[3,8],cp:{iCpThr:-48,iCpRatio:20,iCpAtk:.1,iCpRel:40,iCpMake:8}}],steps:[
 {h:'3つの飛び道具',b:'コンプには、整える以外の使い方がある。(1)超高速アタックと高いRATIOで、わざと歪ませる。(2)過圧縮のポンピングを、リズムとして使う。(3)余韻(アンビエンス)を持ち上げる。どれも、強くかける使い方。まずT2のスネアで、ふつうの設定と歪みの設定を聞き比べよう。',tab:'mix',
  cmp:cm('cm13s1',[['COMPなし',{tm:{2:OFF}}],['ふつう',{tm:{2:CP({iCpThr:-30,iCpRatio:3,iCpAtk:10,iCpRel:250})}}],['歪み',{tm:{2:CP({iCpThr:-48,iCpRatio:20,iCpAtk:.1,iCpRel:40,iCpMake:8})}}]])},
 {h:'歪みを作る',b:'T2のTHRESHを-52〜-40dB、RATIOを12〜20、ATTACKを0.1〜1ms、RELEASEを30〜100ms、MAKEUPを4〜10dBにしよう。波形の山が一瞬で削られて、ざらついた太い音になる。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-52,-40]},{trk:2,ins:'cp',k:'iCpRatio',rng:[12,20]},{trk:2,ins:'cp',k:'iCpAtk',rng:[.1,1]},{trk:2,ins:'cp',k:'iCpRel',rng:[30,100]},{trk:2,ins:'cp',k:'iCpMake',rng:[4,10]}]},
 {h:'ポンピングをリズムにする',b:'T3のコードに、過圧縮をかける。THRESHを-46〜-36dB、RATIOを8〜12、RELEASEを40〜120msにして、コードが息をするように波打つ様子を聴こう。cm08では「出さない」ものだったポンピングを、ここでは「わざと出す」。',tab:'mix',
  mx:[{trk:3,ins:'cp',k:'iCpThr',rng:[-46,-36]},{trk:3,ins:'cp',k:'iCpRatio',rng:[8,12]},{trk:3,ins:'cp',k:'iCpRel',rng:[40,120]}],
  cmp:cm('cm13s3',[['COMPなし',{tm:{3:OFF}}],['リリース長め',{tm:{3:CP({iCpThr:-42,iCpRatio:10,iCpAtk:10,iCpRel:400})}}],['リリース短め',{tm:{3:CP({iCpThr:-42,iCpRatio:10,iCpAtk:10,iCpRel:60})}}]]),
  quiz:qz('波打つように聞こえるのは?',3,'3が正解(RELEASE 60ms)。抑えがすぐ戻るので、コードの余韻が持ち上がって、音量が上下して聞こえる。2は戻りがゆっくりで、波打ちが目立たない。')},
 {h:'余韻を持ち上げる',b:'強めに抑えてMAKEUPで持ち上げると、抑えられない小さい音=余韻や部屋の鳴りが、相対的に持ち上がる。T2のTHRESHを-52〜-42dB、RATIOを3〜6、ATTACKを10〜30ms、RELEASEを150〜300ms、MAKEUPを6〜12dBにして、スネアの余韻を聴こう。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-52,-42]},{trk:2,ins:'cp',k:'iCpRatio',rng:[3,6]},{trk:2,ins:'cp',k:'iCpAtk',rng:[10,30]},{trk:2,ins:'cp',k:'iCpRel',rng:[150,300]},{trk:2,ins:'cp',k:'iCpMake',rng:[6,12]}],
  cmp:cm('cm13s4',[['COMPなし',{tm:{2:OFF}}],['余韻を持ち上げる',{tm:{2:CP({iCpThr:-48,iCpRatio:4,iCpAtk:20,iCpRel:200,iCpMake:9})}}]])},
 {h:'どれ?',b:'聞き比べて、スネアが歪んでざらついて聞こえるものを選ぼう。',tab:'mix',
  cmp:cm('cm13s5',[['1',{tm:{2:CP({iCpThr:-30,iCpRatio:3,iCpAtk:10,iCpRel:250})}}],['2',{tm:{2:CP({iCpThr:-48,iCpRatio:20,iCpAtk:.1,iCpRel:40,iCpMake:8})}}],['3',{tm:{2:OFF}}]]),
  quiz:qz('歪んでざらついているのは?',2,'2が正解。ATTACKが最短に近く、RATIOも最大に近いので、山がすぐ削られて歪む。1はふつうのコンプ、3はCOMPなし。')},
 {h:'飛び道具は、使いどころを決めて',b:'どれも、かけすぎると音が潰れたり、耳に疲れたりする。使う前に「この曲のどこで、何のために」を決める。効果は、全体に使うのではなく、1つの音や、1つの場面だけにするのが基本。',tab:'mix',
  col:{h:'歪みとしてのコンプ',b:'超高速アタックは、音の波形そのものを削るので、コンプというより歪みに近い。歪みのインサート(SAT)とは、ざらつきの質が違う。聞き比べて、好みで使い分けよう。'}}
]}),
/* ---------------- cm14 ---------------- */
base({id:'cm14',pre:['cm10','eq03'],terms:['comp','gr','thresh','cratio','hpf','lpf'],title:'帯域を分けて圧縮(近似)',sub:'低域と高域を別々に圧縮する',ts:2,
 tk:[TK('bass',P.bassPattern('eighth',0),'低域側',{scale:'minor',p:RICH,acc:[0,4,8,12],mx:{eq:{iEqOn:1,iEqLpf:1500,iEqHpf:20},cp:NO}}),TK('bass',P.bassPattern('eighth',0),'高域側',{scale:'minor',p:RICH,acc:[0,4,8,12],mx:{eq:{iEqOn:1,iEqHpf:1500,iEqLpf:20000},cp:NO}})],steps:[
 {h:'低音が全体を引っぱる',b:'低い音は、波が大きく、コンプの判定を左右しやすい。全体にコンプをかけると、低い音に引っぱられて、高い音まで抑えられてしまう。帯域ごとにコンプを分けられたら、低域だけ強く、高域は軽く、とできる。',tab:'mix'},
 {h:'同じ音を2つに分ける',b:'このレッスンでは、同じ音を2つのトラックに分けた。T1は低域側(HIGH CUTで高域を切る)、T2は高域側(LOW CUTで低域を切る)。2つを足すと、元の音に近い。聞き比べて、どう聞こえるか聴こう。',tab:'mix',
  cmp:[{l:'まとめて強く',mt:[1],tm:{1:SPL({iEqOn:0},{iCpThr:-42,iCpRatio:8,iCpAtk:10,iCpRel:150,iCpMake:4})}},{l:'わけて(低域だけ強く)',tm:{1:SPL({iEqOn:1,iEqLpf:800,iEqHpf:20},{iCpThr:-42,iCpRatio:8,iCpAtk:10,iCpRel:150,iCpMake:4}),2:SPL({iEqOn:1,iEqHpf:800,iEqLpf:20000},{iCpThr:0,iCpRatio:1,iCpAtk:10,iCpRel:250})}}]},
 {h:'分ける場所を決める',b:'T1のHIGH CUTと、T2のLOW CUTを、同じ周波数にそろえる。500〜1000Hzにしよう。低い方に重ねすぎると低域が太くなり、高い方に重ねすぎると薄くなる。',tab:'mix',
  mx:[{trk:1,ins:'eq',k:'iEqLpf',rng:[500,1000]},{trk:2,ins:'eq',k:'iEqHpf',rng:[500,1000]}]},
 {h:'低域側は強く',b:'T1のTHRESHを-48〜-36dB、RATIOを6〜10にして、低域だけを強く抑えよう。低域が安定して、全体の土台が太くなる。',tab:'mix',
  mx:[{trk:1,ins:'cp',k:'iCpThr',rng:[-48,-36]},{trk:1,ins:'cp',k:'iCpRatio',rng:[6,10]}]},
 {h:'高域側は軽く',b:'T2のTHRESHを-34〜-26dB、RATIOを2〜3にして、高域は軽く整える程度にしよう。低域の影響を受けないので、高域の抜けが残る。',tab:'mix',
  mx:[{trk:2,ins:'cp',k:'iCpThr',rng:[-34,-26]},{trk:2,ins:'cp',k:'iCpRatio',rng:[2,3]}],
  col:{h:'本物のマルチバンドとのちがい',b:'ここでやったのは、2つのトラックに分ける近似。本物のマルチバンドコンプは、1つの機器の中で、位相をそろえたまま帯域を分ける。この近似では、分け目の周波数で、つなぎ目の音量や位相が少しずれる。分け目を急に動かすと、そこに違和感が出ることがある。'}}
]}),
/* ---------------- cm15 ---------------- */
base({id:'cm15',pre:['cm03','cm05'],terms:['comp','gr','thresh','cratio','catk','crel','pump'],title:'聞き分けクイズ(コンプ)',sub:'強さ・アタック・リリースを耳で当てる',ts:2,
 tk:[KICK(),SNR(NO),STABO(NO)],steps:[
 {h:'音量はそろえてある',b:'コンプの設定を、耳で当ててみよう。音量が上がると「良い音」に感じやすいので、どの問題も音量をそろえてある。手がかりは、音の頭の出方、余韻の戻り方、音量の動きだけ。',tab:'mix'},
 {h:'問題1: いちばん強いのは?',b:'T2のスネアに、強さの違う3つのコンプをかけた。もっとも強く抑えているものを選ぼう。',tab:'mix',
  cmp:cm('cm15s2',[['1',{tm:{2:CP({iCpThr:-34,iCpRatio:4,iCpAtk:10,iCpRel:150})}}],['2',{tm:{2:CP({iCpThr:-20,iCpRatio:2,iCpAtk:10,iCpRel:150})}}],['3',{tm:{2:CP({iCpThr:-50,iCpRatio:10,iCpAtk:10,iCpRel:150})}}]]),
  quiz:qz('いちばん強く抑えているのは?',3,'3が正解(THRESH -50dB・RATIO 10)。山が大きく削られて、音の起伏が平らになる。2は軽く、1は中くらい。')},
 {h:'問題2: アタックがいちばん遅いのは?',b:'T2のスネアで、ATTACKだけを変えた3つ。音の頭が抑えられずに、いちばんよく通るものを選ぼう。',tab:'mix',
  cmp:cm('cm15s3',[['1',{tm:{2:CP({iCpThr:-36,iCpRatio:6,iCpAtk:.5,iCpRel:100})}}],['2',{tm:{2:CP({iCpThr:-36,iCpRatio:6,iCpAtk:5,iCpRel:100})}}],['3',{tm:{2:CP({iCpThr:-36,iCpRatio:6,iCpAtk:40,iCpRel:100})}}]]),
  quiz:qz('アタックがいちばん遅いのは?',3,'3が正解(40ms)。頭が抑えられる前に通り抜けるので、アタックの鋭さが残る。1は頭から抑えられて、おとなしい。')},
 {h:'問題3: リリースがいちばん短いのは?',b:'T3のコードで、RELEASEだけを変えた3つ。抑えがすぐ戻って、音量が波打つように聞こえるものを選ぼう。',tab:'mix',
  cmp:cm('cm15s4',[['1',{tm:{3:CP({iCpThr:-42,iCpRatio:8,iCpAtk:10,iCpRel:500})}}],['2',{tm:{3:CP({iCpThr:-42,iCpRatio:8,iCpAtk:10,iCpRel:40})}}],['3',{tm:{3:CP({iCpThr:-42,iCpRatio:8,iCpAtk:10,iCpRel:200})}}]]),
  quiz:qz('リリースがいちばん短いのは?',2,'2が正解(40ms)。抑えがすぐ戻るので、コードの余韻が持ち上がり、音量が上下して聞こえる。1は戻りがゆっくりで、動きがなだらか。')},
 {h:'クイズのまとめ',b:'当たらなくても、数字より「どちらに動いたか」が分かれば十分。強さは起伏の平らさ、アタックは頭の鋭さ、リリースは音量の戻り方に出る。この3つを、自分の耳の物差しにしよう。',tab:'mix',
  col:{h:'耳を休ませる',b:'聞き分けは、長く続けると耳が疲れて判断がにぶる。小さめの音量で、こまめに休みながら練習しよう。大きな音で長時間聴くのは耳に負担がかかる。'}}
]})
,
/* ---------------- sb01・sb02(v9.0 R-1。バスCOMPのサイドチェイン。T1=キックはMASTERへ、T2・T3はBUS Aへ) ---------------- */
base({id:'sb01',pre:['cm12','mx12'],terms:['busc','sidechain','gr','pump'],title:'バスのサイドチェイン',sub:'キックの合図で、パッドとベースをまとめて沈める',
 tk:[KICK(),{id:'bass',idx:all16(),o:{name:'パッド',scale:'minor',tie:sus,tr:12,p:PAD,out:'A'}},TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12],out:'A'})],steps:[
 {h:'バスにまとめて、1回で沈める',b:'T2(パッド)とT3(ベース)は BUS A にまとめてあり、T1(キック)は MASTER へ直接出ている。トラックごとにサイドチェインを作ると手間がかかるが、【バスコンプ】のサイドチェインなら、BUS A のCOMPを1つ設定するだけで、まとめて沈められる。\\nまず聞き比べよう。1はCOMPなし、2はふつうのバスCOMP(自分たちの音で判定)、3はキックを合図にしたサイドチェイン。',tab:'mix',
  cmp:[{l:'COMPなし',mt:[],bm:{A:{iCpOn:0}}},{l:'ふつうのバスCOMP',mt:[],bm:{A:SBN}},{l:'キックで判定(SC)',mt:[],bm:{A:SBS}}]},
 {h:'どれがキックに合わせて沈む?',b:'もう一度聞いて、キックの拍のたびに、パッドとベースがそろって一瞬へこんでいるものを選ぼう。',tab:'mix',
  cmp:[{l:'1',mt:[],bm:{A:SBN}},{l:'2',mt:[],bm:{A:SBS}},{l:'3',mt:[],bm:{A:{iCpOn:0}}}],quiz:qz('キックの拍でそろってへこむのは?',2,'2が正解(SC)。キックの音を合図に、BUS A のCOMPが動く。1はパッドとベース自身の音量で動くので、キックの位置とは関係がない。3はCOMPなし。')},
 {h:'BUS A のCOMPにキックをつなぐ',b:'MIXタブで BUS A を開き、COMP をONにして、SC SRC を T1 にしよう。THRESHを-30〜-20dB、RATIOを6以上、RELEASEを80〜200msにすると、キックのたびに深く沈み、次のキックまでに戻る。',tab:'mix'},
 {h:'深さと戻りを決める',b:'THRESHを下げるほど深く沈み、RELEASEは戻る速さ。戻りを拍に合わせると、リズムの形になる。2つを聞き比べて、戻りが遅くて沈みっぱなしに近いほうを選ぼう。',tab:'mix',
  cmp:[{l:'1',mt:[],bm:{A:SD.scMix({src:0,depth:.8,key:-14,rel:80})}},{l:'2',mt:[],bm:{A:SD.scMix({src:0,depth:.8,key:-14,rel:500})}}],quiz:qz('沈みっぱなしに近いのは?',2,'2が正解(RELEASE 500ms)。次のキックまでに戻りきらず、音量が低いままになる。1は100ms近くで戻る。')},
 {h:'SC LISTEN で、合図を聴く',b:'BUS A のCOMPのSC LISTENをONにすると、判定に使っている音(キック)を直接聴ける。キックの低域に反応しているかを確かめる道具で、聴き終えたらOFFに戻そう。',tab:'mix'},
 {h:'使い分け',b:'パッドとベースを同じ深さで沈めたいなら、バスのサイドチェイン。ベースだけ深く、パッドは浅く、のように変えたいなら、トラックごとのサイドチェイン。迷ったら、まずバスで作って、足りなければトラックで補おう。',tab:'mix',
  col:{h:'沈めすぎない',b:'サイドチェインは、深くするほどキックが目立つが、そのぶん曲の厚みが失われる。まず浅くして、キックが聞こえるぎりぎりの深さで止めよう。小さめの音量で、こまめに休もう。'}}
]}),
/* ---------------- sb02 ---------------- */
base({id:'sb02',pre:['sb01'],terms:['busc','sidechain','gr'],title:'キックを消しても沈む',sub:'ミュートしても、判定にはキックが使われる',
 tk:[KICK(),{id:'bass',idx:all16(),o:{name:'パッド',scale:'minor',tie:sus,tr:12,p:PAD,out:'A'}},TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12],out:'A'})],steps:[
 {h:'キックを鳴らさずに合図だけ',b:'サイドチェインの合図(キー)は、キックの音そのもの。だから、T1をミュートして聞こえなくしても、BUS A のCOMPは、T1の音を判定に使い続ける。キックが聞こえないのに、パッドとベースだけがへこむ、という使い方ができる。\\n聞き比べよう。BUS A のCOMPは、どれもSC SRCがT1。',tab:'mix',
  cmp:[{l:'キックあり',mt:[],bm:{A:SBS}},{l:'キックだけミュート',mt:[1],bm:{A:SBS}}]},
 {h:'どれがキックなしで沈む?',b:'3つ聞いて、キックは聞こえないのに、パッドとベースがキックの拍で沈んでいるものを選ぼう。',tab:'mix',
  cmp:[{l:'1',mt:[1],bm:{A:SBN}},{l:'2',mt:[1],bm:{A:SBS}},{l:'3',mt:[],bm:{A:SBS}}],quiz:qz('キックが聞こえないのに、キックの拍でへこむのは?',2,'2が正解。キックはミュートでも、SC SRC=T1のCOMPが、キックの音を判定に使う。1もミュートだが、SC SRCがINT(自分の音)なので、キックの拍とは無関係。3はキックも聞こえる。')},
 {h:'キックが聞こえない理由',b:'ミュートしたトラックの音は、MASTERにもBUSにも出ない。ただし、サイドチェインの合図としてだけ、裏で鳴らし続けられる。だから、T1のミュートをON/OFFしても、パッドとベースの沈み方は変わらない。',tab:'mix'},
 {h:'こう使う',b:'キックを別の音(たとえば、ふつうは聞こえない短いクリック)に置きかえて、沈む動きだけを残す、という作り方がある。ここでは、T1のミュートをONにして、BUS A のTHRESHを-30〜-20dBで動かし、沈み方を作ろう。',tab:'mix'},
 {h:'ミュートを戻す',b:'ミュートしたままだと、キックが聞こえなくなり、曲として物足りない。作ったあとは、T1のミュートを外して、キックを鳴らそう。沈み方は、そのまま残る。',tab:'mix',
  cmp:[{l:'ミュートのまま',mt:[1],bm:{A:SBS}},{l:'ミュートを外した',mt:[],bm:{A:SBS}}],
  col:{h:'ソロにすると?',b:'別のトラックをソロにすると、キックはソロの対象外になって聞こえなくなる。それでも、合図としてのキックは鳴り続けるので、沈み方は変わらない。'}}
]})

 );
 /* sb の聞き比べ音量補正 g(dB)。キー '<レッスン>s<ステップ>'=[各案の g]。値は tools/sb-cal.js が出す */
 var GSB={'sb01s1':[-3,-7,0],'sb01s2':[-7,0,-3],'sb01s4':[-2.9,0],'sb02s1':[-2.2,0],'sb02s2':[-9.1,0,-2.2],'sb02s5':[0,-2.2]};
 SD.LESSONS.forEach(function(L){if(!/^sb\d+$/.test(L.id))return;L.steps.forEach(function(st,i){var g=GSB[L.id+'s'+(i+1)];if(g&&st.cmp)st.cmp.forEach(function(c,j){if(g[j]!==undefined)c.g=g[j]})})});
})();
