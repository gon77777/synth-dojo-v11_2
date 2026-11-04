/* v7.7a EF その他のエフェクター(ef01〜ef07・ef16)・v7.7b(ef08〜ef15。ファイル末尾)。
   ef01〜ef04・ef06・ef07・ef16 はトラック別インサート(GATE=gt・SAT=sa・MOD=md・EQ/COMP の順 iOrd)。ef05 はマスターFX(BITCRUSH・RING MOD)。
   聞き比べ cmp の tm=トラック別インサートの値(トラック番号は1始まり・そのインサートの全つまみを書く)。g(音量補正dB)は tools/ef-cal.js(オフライン描画の測定)で出して GT に入れる。
   test/ef.js が差1dB以内・本文の主張(ゲートが余韻を切る等)を検査する。数値は目安。年号・人名・機材名は書かない */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags||['EF']})};
 A('ngate','ゲート','げーと','noise gate','音量がしきい値より小さい間、音を閉じて(小さくして)静かにする道具。ノイズや余韻の整理に使う。THRESHより大きい音が来ると開く。',['ef01','ef02'],['EF']);
 A('ghold','ホールド','ほーるど','hold','ゲートが、しきい値を下回ってもすぐ閉じずに、開いたまま保つ時間。短すぎると、音の途中で切れる。',['ef01'],['EF']);
 A('satur','サチュレーション','さちゅれーしょん','saturation','音をやわらかく歪ませて、倍音を足すこと。軽くかけると、温かさや存在感が出る。かけすぎると荒くなる。',['ef03','ef04'],['EF']);
 A('dbl','ダブラー','だぶらー','doubler','同じ音を、ほんの少し時間と音程をずらして重ね、2人で重ねて歌ったような厚みを出すエフェクト。',['ef06'],['EF']);
 A('flanger','フランジャー','ふらんじゃー','flanger','ごく短い遅れの音を混ぜて、その遅れを揺らし、ジェット機のような「うねり」を出すエフェクト。',['ef07'],['EF']);
 A('phaser','フェイザー','ふぇいざー','phaser','位相をずらした音を混ぜて、特定の帯域に山と谷を作り、その位置をゆっくり動かして波打つ動きを出すエフェクト。',['ef07'],['EF']);
 var P=SD.PATS,TK=P.tk;
 var z=function(a){var q={};a.forEach(function(i){q[i]=0});return q};
 SD.CATS.push({id:'ef1',synth:'analog',chapter:'course',course:'EF',name:'EF その他のエフェクター'});
 /* 聞き比べの音量補正 g(dB)。キー '<レッスン>s<ステップ>' + 番号。値は tools/ef-cal.js が出す(0=補正なし) */
 var GT={'ef01s11':-0.1,'ef01s12':0,'ef01s21':-3.8,'ef01s22':-3.9,'ef01s23':0,'ef01s31':0,'ef01s32':-0.2,'ef01s33':-0.2,'ef01s41':0,'ef01s42':0,'ef01s43':0,'ef01s51':-1.5,'ef01s52':-0.4,'ef01s53':0,'ef01s61':-3.8,'ef01s62':0,'ef02s11':-2.3,'ef02s12':0,'ef02s21':0,'ef02s22':0,'ef02s31':-1.4,'ef02s32':0,'ef02s41':-0.1,'ef02s42':0,'ef03s11':0,'ef03s12':-1.9,'ef03s21':0,'ef03s22':-1.6,'ef03s23':-7.6,'ef03s31':-11,'ef03s32':-0.9,'ef03s33':0,'ef03s41':0,'ef03s42':-4.9,'ef03s43':-5.7,'ef03s51':0,'ef03s52':0,'ef03s61':-3.8,'ef03s62':0,'ef04s11':0,'ef04s12':-3,'ef04s21':0,'ef04s22':-2.1,'ef04s31':-3.7,'ef04s32':0,'ef04s41':0,'ef04s42':-6.3,'ef05s21':0,'ef05s22':0,'ef05s23':-0.1,'ef05s31':0,'ef05s32':0,'ef05s41':-4.3,'ef05s42':0,'ef05s43':-0.1,'ef05s51':-3.2,'ef05s52':0,'ef06s11':-0.5,'ef06s12':0,'ef06s21':-0.2,'ef06s22':-0.1,'ef06s23':0,'ef06s31':0,'ef06s32':-0.9,'ef06s33':-1,'ef06s41':-0.1,'ef06s42':0,'ef06s43':-0.3,'ef06s51':-0.7,'ef06s52':0,'ef07s11':-1.5,'ef07s12':0,'ef07s21':-0.1,'ef07s22':0,'ef07s23':-0.1,'ef07s41':0,'ef07s42':-0.6,'ef16s11':0,'ef16s12':-4.5,'ef16s31':0,'ef16s32':-6.2,'ef16s41':-1.4,'ef16s42':0};
 var ef=function(key,items){return items.map(function(it,i){var o=Object.assign({l:it[0]},it[1]);var g=GT[key+(i+1)];if(g!==undefined)o.g=g;return o})};
 /* インサートの状態(全つまみ。既定+指定) */
 var GD={iGtOn:1,iGtThr:-50,iGtHold:100,iGtRel:200,iGtRange:-60},G=function(o){return Object.assign({},GD,o||{})},GOFF={iGtOn:0};
 var SD0={iSaOn:1,iSaType:1,iSaDrive:.3,iSaTone:20000,iSaMix:1,iSaOut:0},S=function(o){return Object.assign({},SD0,o||{})},SOFF={iSaOn:0};
 var MD0={iMdOn:1,iMdType:0,iMdRate:.8,iMdDepth:.5,iMdFb:0,iMdMix:.5},M=function(o){return Object.assign({},MD0,o||{})},MOFF={iMdOn:0};
 var ED={iEqOn:1,iEqHpf:20,iEqLpf:20000,iEqLg:0,iEqB1g:0,iEqB2g:0,iEqHg:0},E=function(o){return Object.assign({},ED,o||{})};
 var CD={iCpOn:1,iCpModel:3,iCpThr:-24,iCpRatio:3,iCpAtk:10,iCpRel:250,iCpMake:0,iCpKnee:6,iCpMix:1,iCpScHpf:20},C=function(o){return Object.assign({},CD,o||{})};
 /* 音源 */
 var TAIL={o1Wave:'sawtooth',o1Lvl:.9,o2Lvl:0,subLvl:0,noiseLvl:.12,fType:'lowpass',cutoff:3000,res:.1,envAmt:0,drive:0,aA:.003,aD:.12,aS:.7,aR:.6};/* 余韻(リリース)の長い音+ノイズ */
 var BASS={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:.3,noiseLvl:0,fType:'lowpass',cutoff:700,res:.1,envAmt:.3,drive:0,aA:.004,aD:.25,aS:.7,aR:.1};
 var PAD={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:9000,res:0,envAmt:0,drive:0,aA:.01,aD:.2,aS:.9,aR:.15};
 var PULSE=Object.assign({},PAD,{cutoff:6000,aR:.05,lfoShape:'sine',lfoRate:4,lfoAmp:1});/* 音量が周期的に上下する(リズムゲートの材料) */
 var SNL={o1Wave:'triangle',o1Lvl:.15,o2Lvl:0,subLvl:0,noiseLvl:.6,fType:'lowpass',cutoff:7000,res:0,envAmt:0,drive:0,aA:.002,aD:.12,aS:.5,aR:.8};/* 長く尾を引くスネア風(リバーブの尾の近似) */
 var KICK=function(){return TK('kick',P.fourFloor(),'キック')};
 var HATO=function(){return TK('hat',{idx:z([2,6,10,14]),o:{}},'ハット',{acc:[2,6,10,14]})};
 var BP8=function(mx){return TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12],mx:mx})};
 var STAB=function(name,p,mx){return {id:'bass',idx:z([0,4,8,12]),o:{name:name,scale:'minor',tr:12,p:p,mx:mx}}};
 var HELD=function(name,p,mx){var q={},t=[];for(var i=0;i<16;i++)q[i]=0;for(i=0;i<16;i++)if(i!==0&&i!==8)t.push(i);return {id:'bass',idx:q,o:{name:name,scale:'minor',tr:12,tie:t,p:p,mx:mx}}};
 var qz=function(q,ans,ex){return {q:q,ans:ans,ex:ex}};
 var base=function(o){return Object.assign({cat:'ef1',synth:'analog',lv:2,course:'EF',mode:'trk',tab:'trk',oct:-1,demo:{n:[33]},kind:'recipe'},o)};
 var fxl=function(o){return Object.assign({cat:'ef1',synth:'analog',lv:2,course:'EF',kind:'recipe',oct:0,demo:{n:[48,55,60,64],gap:.9,len:.7},init:{o1Wave:'sawtooth',o1Lvl:.7,noiseLvl:.15,cutoff:9000,aA:.003,aD:.3,aS:.8,aR:.2}},o)};
 SD.LESSONS.push(
/* ---------------- ef01 ---------------- */
base({id:'ef01',pre:['th02'],terms:['ngate','ghold','thresh'],title:'ゲート',sub:'小さい音・余韻・ノイズを整理する',ts:2,save:{name:'ゲートで整えた音',kind:'kit'},
 tk:[KICK(),STAB('余韻の長い音',TAIL,{gt:G({iGtThr:-20})})],steps:[
 {h:'ゲートは「小さい音を閉じる」',b:'【ゲート】は、音量がしきい値より小さい間、音を閉じて静かにする道具。T2は、余韻(リリース)が長く、かすかなノイズが乗った音。余韻が次の音までだらだら続いている。ゲートをかけると、余韻とノイズが整理される。聞き比べよう。',tab:'mix',
  cmp:ef('ef01s1',[['ゲートなし',{tm:{2:GOFF}}],['ゲートあり',{tm:{2:G({iGtThr:-20,iGtHold:60,iGtRel:120})}}]])},
 {h:'THRESH: どこから閉じるか',b:'【スレッショルド】(THRESH)は、ゲートが開閉する音量。高くするほど、大きい音まで閉じるので、余韻が早く切れる。T2のTHRESHを-26〜-14dBにして、余韻の切れ方を聴こう。高すぎると、音の本体まで削る。',tab:'mix',
  mx:[{trk:2,ins:'gt',k:'iGtThr',rng:[-26,-14]}],
  cmp:ef('ef01s2',[['THRESH -36',{tm:{2:G({iGtThr:-36,iGtHold:60,iGtRel:120})}}],['THRESH -24',{tm:{2:G({iGtThr:-24,iGtHold:60,iGtRel:120})}}],['THRESH -12',{tm:{2:G({iGtThr:-12,iGtHold:60,iGtRel:120})}}]]),quiz:qz('余韻がいちばん早く切れているのは?',3,'3が正解。THRESHが-12dBと高いので、音が小さくなり始めてすぐに閉じる。1は-36dBで、余韻のほとんどが残る。')},
 {h:'HOLD: 開いたまま保つ時間',b:'【ホールド】(HOLD)は、しきい値を下回っても、開いたまま保つ時間。短いと、音の途中で切れて不自然になりやすい。長いと、余韻が残る。T2のHOLDを30〜120msにして聴こう。',tab:'mix',
  mx:[{trk:2,ins:'gt',k:'iGtHold',rng:[30,120]}],
  cmp:ef('ef01s3',[['HOLD 0ms',{tm:{2:G({iGtThr:-20,iGtHold:0,iGtRel:120})}}],['HOLD 100ms',{tm:{2:G({iGtThr:-20,iGtHold:100,iGtRel:120})}}],['HOLD 400ms',{tm:{2:G({iGtThr:-20,iGtHold:400,iGtRel:120})}}]]),quiz:qz('いちばん長く開いたままなのは?',3,'3が正解。HOLDが400msと長いので、しきい値を下回ってもしばらく閉じない。')},
 {h:'RELEASE: 閉じる速さ',b:'RELEASEは、閉じるときの速さ。短いと、ぷつっと切れる。長いと、自然に消える。T2のRELEASEを80〜300msにして、音がなじむ長さを探そう。',tab:'mix',
  mx:[{trk:2,ins:'gt',k:'iGtRel',rng:[80,300]}],
  cmp:ef('ef01s4',[['RELEASE 20ms',{tm:{2:G({iGtThr:-20,iGtHold:60,iGtRel:20})}}],['RELEASE 200ms',{tm:{2:G({iGtThr:-20,iGtHold:60,iGtRel:200})}}],['RELEASE 1500ms',{tm:{2:G({iGtThr:-20,iGtHold:60,iGtRel:1500})}}]]),quiz:qz('いちばんぷつっと切れているのは?',1,'1が正解。RELEASEが20msと短いので、一気に閉じる。3は1500msで、ゆっくり消える。')},
 {h:'RANGE: どこまで下げるか',b:'RANGEは、閉じたときの下げ幅。0dBだと何も変わらない。-12dBなら、少し下がるだけで、ノイズが残る。-60dB近くまで下げると、ほぼ無音になる。T2のRANGEを-80〜-40dBにしよう。',tab:'mix',
  mx:[{trk:2,ins:'gt',k:'iGtRange',rng:[-80,-40]}],
  cmp:ef('ef01s5',[['RANGE 0dB',{tm:{2:G({iGtThr:-14,iGtHold:0,iGtRel:40,iGtRange:0})}}],['RANGE -12dB',{tm:{2:G({iGtThr:-14,iGtHold:0,iGtRel:40,iGtRange:-12})}}],['RANGE -60dB',{tm:{2:G({iGtThr:-14,iGtHold:0,iGtRel:40,iGtRange:-60})}}]])},
 {h:'やりすぎると音が削れる',b:'THRESHが高すぎると、音の頭や、小さく弾いた音まで閉じてしまい、音が欠ける。ゲートは「いらない小さい音」だけを閉じる道具。聞き比べて、欠けているほうを選ぼう。',tab:'mix',
  cmp:ef('ef01s6',[['ふつう',{tm:{2:G({iGtThr:-20,iGtHold:60,iGtRel:120})}}],['THRESH 高すぎ',{tm:{2:G({iGtThr:-6,iGtHold:10,iGtRel:20})}}]]),quiz:qz('音の本体まで削れているのは?',2,'2が正解。THRESHが-6dBと高く、HOLDも短いので、音の本体が出る前後で閉じてしまう。'),
  col:{h:'ゲートは「引き算」の道具',b:'ゲートは、音を足すのでなく、いらない部分を引く道具。ノイズや余韻を整理すると、ミックスのすき間がすっきりする。ただし、元の音の雰囲気(余韻の自然さ)も一緒に削るので、聴きながら控えめに。'}}
]}),
/* ---------------- ef02 ---------------- */
base({id:'ef02',pre:['ef01'],terms:['ngate','ghold','gatedverb','lfo'],title:'ゲートの飛び道具',sub:'リズムゲートと、ゲートで切った余韻(近似)',ts:2,save:{name:'ゲートの飛び道具',kind:'kit'},
 tk:[KICK(),HELD('伸びる音',PULSE,{gt:G({iGtThr:-16,iGtHold:0,iGtRel:20,iGtRange:-60})}),TK('snare',{idx:z([4,12]),o:{}},'スネア(尾が長い)',{p:SNL,mx:{gt:GOFF}})],steps:[
 {h:'ゲートは音量に反応する',b:'ゲートは、音量だけで開閉する。だから、音量が周期的に上下する音(T2は、LFOで音量が揺れる音)にかけると、大きいところだけが通って、小さいところが消え、刻みのリズムが生まれる。これが【ゲート】で作るリズムゲート。聞き比べよう。',tab:'mix',
  cmp:ef('ef02s1',[['ゲートなし',{tm:{2:GOFF}}],['リズムゲート',{tm:{2:G({iGtThr:-16,iGtHold:0,iGtRel:20,iGtRange:-60})}}]])},
 {h:'刻みの長さは HOLD と RELEASE',b:'刻みの1つ1つを長くするなら、T2のHOLDを伸ばす。短く切りたいなら、HOLDを0にしてRELEASEも短く。T2のHOLDを0〜60ms、RELEASEを10〜60msにして、刻みの歯切れを確かめよう。',tab:'mix',
  mx:[{trk:2,ins:'gt',k:'iGtHold',rng:[0,60]},{trk:2,ins:'gt',k:'iGtRel',rng:[10,60]}],
  cmp:ef('ef02s2',[['短く切る',{tm:{2:G({iGtThr:-16,iGtHold:0,iGtRel:10,iGtRange:-60})}}],['長めに残す',{tm:{2:G({iGtThr:-16,iGtHold:150,iGtRel:150,iGtRange:-60})}}]])},
 {h:'THRESHで刻みの「幅」が変わる',b:'THRESHを上げると、音量の山のてっぺんだけが通るので、刻みが細くなる。下げると、太くなる。T2のTHRESHを-20〜-14dBにして、刻みの太さを変えよう。なお、LFOはテンポと同期していないので、刻みは曲のテンポとは少しずれていく(近似)。',tab:'mix',
  mx:[{trk:2,ins:'gt',k:'iGtThr',rng:[-20,-14]}],
  cmp:ef('ef02s3',[['太い刻み',{tm:{2:G({iGtThr:-20,iGtHold:0,iGtRel:20})}}],['細い刻み',{tm:{2:G({iGtThr:-14,iGtHold:0,iGtRel:20})}}]])},
 {h:'ゲートで切った余韻(近似)',b:'T3は、長く尾を引くスネア風の音。尾を途中でぶつっと切ると、短くて密度のある、独特の存在感になる。これが【ゲートリバーブ】風の考え方。ここでは、リバーブの尾の代わりに、音そのものの長い余韻を切る近似。T3のゲートをONにして聴き比べよう。',tab:'mix',
  cmp:ef('ef02s4',[['尾が長いまま',{tm:{3:GOFF}}],['尾を切る',{tm:{3:G({iGtThr:-18,iGtHold:60,iGtRel:20})}}]]),quiz:qz('尾が途中で切れているのは?',2,'2が正解。HOLDが短くRELEASEも短いので、余韻が一定の長さで切れる。')},
 {h:'飛び道具は少しだけ',b:'リズムゲートも、切った余韻も、ずっと使うと耳に疲れる。サビ前の数小節、またはひとつの音だけに使うと効果的。基礎で作った「小さい音を整理する耳」を、あえて逆向きに使う方法でもある。',tab:'mix',
  col:{h:'この章の「近似」',b:'ここでは、リバーブそのものにゲートをかけるのでなく、余韻の長い音をゲートで切る近似で体験している。本物のゲートリバーブは、リバーブの尾を切る手法。仕組みの考え方は同じ。'}}
]}),
/* ---------------- ef03 ---------------- */
base({id:'ef03',pre:['th02'],terms:['satur','overtone'],title:'サチュレーションの種類',sub:'6タイプとTONE・MIX・OUT',ts:2,save:{name:'サチュレーション比較',kind:'kit'},
 tk:[KICK(),BP8({sa:S({iSaType:1,iSaDrive:.3})})],steps:[
 {h:'サチュレーションとは',b:'【サチュレーション】は、音をやわらかく歪ませて、【倍音】を足すこと。T2のベースに、SATが入っている。歪ませると、基音のほかに、倍音が増えて、小さいスピーカーでも聞こえやすくなる。聞き比べよう。',tab:'mix',
  cmp:ef('ef03s1',[['SATなし',{tm:{2:SOFF}}],['SATあり',{tm:{2:S({iSaType:1,iSaDrive:.4})}}]])},
 {h:'DRIVE: 歪ませる量',b:'DRIVEは、歪ませる量。小さいと倍音がわずかに増え、大きいと荒くなる。T2のDRIVEを0.3〜0.7にして、変わり方を聴こう。',tab:'mix',
  mx:[{trk:2,ins:'sa',k:'iSaDrive',rng:[.3,.7]}],
  cmp:ef('ef03s2',[['DRIVE 0.1',{tm:{2:S({iSaType:1,iSaDrive:.1})}}],['DRIVE 0.4',{tm:{2:S({iSaType:1,iSaDrive:.4})}}],['DRIVE 0.9',{tm:{2:S({iSaType:1,iSaDrive:.9})}}]])},
 {h:'6タイプ(前半)',b:'SAT TYPEは6つ。SOFTは、やわらかい歪み。TAPEは、高域が丸くなって温かい。TUBEは、倍音が豊かで、ふくよか。同じDRIVEで、タイプだけを変えて聴き比べよう。',tab:'mix',
  cmp:ef('ef03s3',[['SOFT',{tm:{2:S({iSaType:0,iSaDrive:.5})}}],['TAPE',{tm:{2:S({iSaType:1,iSaDrive:.5})}}],['TUBE',{tm:{2:S({iSaType:2,iSaDrive:.5})}}]])},
 {h:'6タイプ(後半)',b:'NEVEは、低域が太る。MICPREは、中域が前に出て、少し硬い。FUZZは、強く荒く歪む。どれがいちばん荒いか、聴いて選ぼう。',tab:'mix',
  cmp:ef('ef03s4',[['NEVE',{tm:{2:S({iSaType:3,iSaDrive:.5})}}],['MICPRE',{tm:{2:S({iSaType:4,iSaDrive:.5})}}],['FUZZ',{tm:{2:S({iSaType:5,iSaDrive:.5})}}]]),quiz:qz('いちばん荒く歪んでいるのは?',3,'3が正解(FUZZ)。ほかのタイプより歪みが強く、倍音が荒い。')},
 {h:'TONE: 歪みの高域を丸める',b:'TONEは、歪ませた音の高域を丸めるつまみ(SOFT以外)。低くするほど、ざらつきが丸くなる。T2のTONEを真ん中あたりまで下げて、荒さの調整に使おう。',tab:'mix',
  mx:[{trk:2,ins:'sa',k:'iSaTone',rng:[4000,12000]}],
  cmp:ef('ef03s5',[['TONE 全開',{tm:{2:S({iSaType:5,iSaDrive:.6,iSaTone:20000})}}],['TONE 低め',{tm:{2:S({iSaType:5,iSaDrive:.6,iSaTone:3000})}}]])},
 {h:'MIX と OUT: 混ぜ具合と音量',b:'SAT MIXは、歪ませた音と原音の混ぜ具合。小さくすると、原音を保ったまま、倍音だけを足せる。SAT OUTは、歪ませた音の音量。歪ませると音量も変わるので、OUTで合わせる。T2のSAT MIXを0.3〜0.7にしよう。',tab:'mix',
  mx:[{trk:2,ins:'sa',k:'iSaMix',rng:[.3,.7]}],
  cmp:ef('ef03s6',[['MIX 100%',{tm:{2:S({iSaType:5,iSaDrive:.6,iSaMix:1})}}],['MIX 40%',{tm:{2:S({iSaType:5,iSaDrive:.6,iSaMix:.4})}}]]),
  col:{h:'歪みは「悪い音」ではない',b:'歪みは、倍音を増やして、音を前に出したり温かくしたりする道具。ただし、大きい音ほど「良く」聞こえやすいので、音量をそろえて比べることが大切。判断は、小さめの音量で、こまめに休みながら。'}}
]}),
/* ---------------- ef04 ---------------- */
base({id:'ef04',pre:['ef03'],terms:['satur','overtone','parallel'],title:'サチュレーションの使い方',sub:'前に出す・小スピーカーで聞かせる・並列で太くする',ts:2,save:{name:'サチュレーションの使い方',kind:'kit'},
 tk:[KICK(),BP8({sa:S({iSaType:1,iSaDrive:.2,iSaMix:1})}),STAB('コード',PAD,{sa:SOFF})],steps:[
 {h:'倍音で前に出す',b:'ベースは低い音なので、小さいスピーカーでは聞こえにくい。【サチュレーション】で倍音を足すと、基音が弱いスピーカーでも、ベースの存在が伝わる。T2のSATのDRIVEを0.3〜0.6にして、聞き比べよう。',tab:'mix',
  mx:[{trk:2,ins:'sa',k:'iSaDrive',rng:[.3,.6]}],
  cmp:ef('ef04s1',[['SATなし',{tm:{2:SOFF}}],['SATあり',{tm:{2:S({iSaType:1,iSaDrive:.5})}}]])},
 {h:'小スピーカーで確かめる',b:'MIXのMONで、小スピーカー風をONにして、聞き比べよう(戻し忘れ注意。起動時は必ずOFF)。サチュレーションの効果は、小スピーカーのほうが分かりやすい。確かめたら、MONをOFFに戻す。',tab:'mix',
  cmp:ef('ef04s2',[['SATなし',{tm:{2:SOFF}}],['SATあり',{tm:{2:S({iSaType:2,iSaDrive:.5})}}]])},
 {h:'並列で太くする',b:'歪みすぎが気になるときは、SAT MIXを下げて、原音に混ぜる。原音の芯を残したまま、倍音だけが乗る。これは、パラレルコンプと同じ「混ぜる」考え方。T2のSAT MIXを0.3〜0.6にしよう。',tab:'mix',
  mx:[{trk:2,ins:'sa',k:'iSaMix',rng:[.3,.6]}],
  cmp:ef('ef04s3',[['MIX 100%',{tm:{2:S({iSaType:5,iSaDrive:.6,iSaMix:1})}}],['MIX 40%',{tm:{2:S({iSaType:5,iSaDrive:.6,iSaMix:.4})}}]])},
 {h:'かけすぎると',b:'DRIVEを上げすぎると、倍音が増えすぎて荒くなり、ほかの音とぶつかる。コードにもかけて、聞き比べよう。軽くかければ温かく、強くかければ荒くなる。',tab:'mix',
  cmp:ef('ef04s4',[['軽い',{tm:{3:S({iSaType:1,iSaDrive:.25})}}],['強い',{tm:{3:S({iSaType:5,iSaDrive:.9})}}]]),quiz:qz('倍音が増えすぎて荒くなっているのは?',2,'2が正解。FUZZでDRIVEも大きいので、倍音が強く、荒れる。')},
 {h:'どのトラックに使うか',b:'サチュレーションは、「前に出したい音」「温かくしたい音」に、少しだけ使うのが基本。全トラックにかけると、全体が荒くなり、すき間がなくなる。',tab:'mix',
  col:{h:'歪みと音量',b:'歪ませると、音量も変わる。比べるときは、SAT OUTで音量をそろえよう。このコースの聞き比べは、すべて音量差が1dB以内になるようそろえてある。'}}
]}),
/* ---------------- ef05 ---------------- */
fxl({id:'ef05',pre:['fx09'],terms:['bitcrush','ringmod','overtone'],save:{name:'質感のエフェクト',kind:'patch'},title:'ビットクラッシュ・リングモジュレーター',sub:'質感として足す飛び道具',steps:[
 {h:'質感として足す',b:'【ビットクラッシュ】と【リングモジュレーター】は、音を良くするのでなく、「質感」を足す飛び道具。ローファイ(荒い録音風)や、金属・ロボットのような響きが作れる。まず、何も足さない音を基準に聴こう。',tab:'fx'},
 {h:'ビットクラッシュ: 音の細かさを落とす',b:'FXタブのBITCRUSHをONにして、BITSを6にしよう。BITSは、音の階段の細かさ。小さいほど荒い。RATEは、サンプリングの粗さ(ざらつき)。聞き比べよう。',tab:'fx',f:[['bcOn',1],['bcBits',6]],tol:.1,
  cmp:ef('ef05s2',[['なし',{s:{bcOn:0,rmOn:0}}],['BITS 10',{s:{bcOn:1,bcBits:10,bcRate:1,bcMix:1,rmOn:0}}],['BITS 5',{s:{bcOn:1,bcBits:5,bcRate:1,bcMix:1,rmOn:0}}]])},
 {h:'MIXで質感の量を決める',b:'BITCRUSHのMIXを下げると、原音に荒さが混ざって、ほどよいローファイになる。MIXを40%くらいにして、聴こう。',tab:'fx',f:[['bcOn',1],['bcBits',6],['bcMix',.4]],tol:.1,
  cmp:ef('ef05s3',[['MIX 100%',{s:{bcOn:1,bcBits:6,bcRate:1,bcMix:1,rmOn:0}}],['MIX 40%',{s:{bcOn:1,bcBits:6,bcRate:1,bcMix:.4,rmOn:0}}]])},
 {h:'リングモジュレーター: 金属の響き',b:'BITCRUSHをOFFにして、RING MODをONにしよう。FREQを150Hz、MIXを50%にする。入力音に別の周波数をかけるので、ふつうの音にはない、金属的な響きになる。FREQが低いとロボット声のよう、高いと金属的。',tab:'fx',f:[['bcOn',0],['rmOn',1],['rmFreq',150],['rmMix',.5]],tol:.1,
  cmp:ef('ef05s4',[['なし',{s:{bcOn:0,rmOn:0}}],['FREQ 150',{s:{bcOn:0,rmOn:1,rmFreq:150,rmMix:.5}}],['FREQ 900',{s:{bcOn:0,rmOn:1,rmFreq:900,rmMix:.5}}]])},
 {h:'ほどよく足す',b:'どちらも、MIXを下げて、少しだけ足すのが使いやすい。ずっとかけると耳が疲れるので、短い区間だけにする使い方もある。ここまでの質感を聴き比べて、好みの量を探そう。',tab:'fx',
  cmp:ef('ef05s5',[['ローファイ',{s:{bcOn:1,bcBits:7,bcRate:1,bcMix:.4,rmOn:0}}],['金属',{s:{bcOn:0,rmOn:1,rmFreq:400,rmMix:.35}}]]),
  col:{h:'「荒さ」は選ぶ味つけ',b:'質感のエフェクトは、基礎の「きれいに整える」とは逆に、荒さをあえて足す道具。好みの問題なので、正解はない。大音量で長く聴かず、こまめに休みながら探そう。'}}
]}),
/* ---------------- ef06 ---------------- */
base({id:'ef06',pre:['th02'],terms:['chorus','dbl','lfo'],title:'コーラスとダブラー',sub:'厚み・幅。RATE/DEPTH/MIXの目安',ts:2,save:{name:'厚みのコード',kind:'kit'},
 tk:[KICK(),HELD('コード',PAD,{md:M({iMdType:0})})],steps:[
 {h:'コーラスで厚みを足す',b:'【コーラス】は、ほんの少し遅らせた音を重ね、その遅れをゆっくり揺らして、複数の楽器が重なったような厚みと幅を出す。T2のコードに、MODが入っている。聞き比べよう。',tab:'mix',
  cmp:ef('ef06s1',[['MODなし',{tm:{2:MOFF}}],['コーラス',{tm:{2:M({iMdType:0,iMdRate:.8,iMdDepth:.5,iMdMix:.5})}}]])},
 {h:'RATE: 揺れる速さ',b:'RATEは、揺れる速さ。遅いと、ゆったり広がる。速いと、ふるえて不自然になる。T2のRATEを0.3〜1.5Hzにして、聴こう。',tab:'mix',
  mx:[{trk:2,ins:'md',k:'iMdRate',rng:[.3,1.5]}],
  cmp:ef('ef06s2',[['RATE 0.3',{tm:{2:M({iMdType:0,iMdRate:.3})}}],['RATE 0.8',{tm:{2:M({iMdType:0,iMdRate:.8})}}],['RATE 6',{tm:{2:M({iMdType:0,iMdRate:6})}}]])},
 {h:'DEPTH: 揺れの深さ',b:'DEPTHは、揺れの深さ。浅いと、わずかな厚み。深いと、音程が揺れて、酔うような響きになる。T2のDEPTHを0.3〜0.6にしよう。',tab:'mix',
  mx:[{trk:2,ins:'md',k:'iMdDepth',rng:[.3,.6]}],
  cmp:ef('ef06s3',[['DEPTH 0.2',{tm:{2:M({iMdType:0,iMdDepth:.2})}}],['DEPTH 0.5',{tm:{2:M({iMdType:0,iMdDepth:.5})}}],['DEPTH 1.0',{tm:{2:M({iMdType:0,iMdDepth:1})}}]])},
 {h:'MIX: エフェクト音の量',b:'MOD MIXは、エフェクト音の量。0.5前後なら、厚みが出つつ、原音が保たれる。MIXが大きすぎると、原音の芯が薄くなる。T2のMOD MIXを0.3〜0.6にして、聴こう。',tab:'mix',
  mx:[{trk:2,ins:'md',k:'iMdMix',rng:[.3,.6]}],
  cmp:ef('ef06s4',[['MIX 0.2',{tm:{2:M({iMdType:0,iMdMix:.2})}}],['MIX 0.5',{tm:{2:M({iMdType:0,iMdMix:.5})}}],['MIX 1.0',{tm:{2:M({iMdType:0,iMdMix:1})}}]])},
 {h:'ダブラー: 2人で重ねる厚み',b:'MOD TYPEを DOUBLER にすると、【ダブラー】になる。コーラスのような周期的な揺れでなく、時間と音程がランダムに少しずれた音を重ねる。2人で重ねて歌ったような自然な厚み。コーラスと聞き比べよう。',tab:'mix',
  cmp:ef('ef06s5',[['コーラス',{tm:{2:M({iMdType:0,iMdMix:.5})}}],['ダブラー',{tm:{2:M({iMdType:1,iMdMix:.5})}}]]),quiz:qz('周期的に揺れるのでなく、ランダムにずれて重なっているのは?',2,'2が正解(ダブラー)。コーラスは、LFOでゆっくり周期的に揺れる。'),
  col:{h:'広げたい音・広げない音',b:'コーラスやダブラーは、音を左右に広げる。広げすぎると、センターの音(キック・ベース・声)が薄くなりやすい。広げるのは、コードやパッドなど、すき間を埋めたい音が中心。'}}
]}),
/* ---------------- ef07 ---------------- */
base({id:'ef07',pre:['ef06'],terms:['flanger','phaser','lfo'],title:'フランジャーとフェイザー',sub:'動き・うねり・ジェット感',ts:2,save:{name:'うねりのコード',kind:'kit'},
 tk:[KICK(),HATO(),HELD('コード',PAD,{md:M({iMdType:2})})],steps:[
 {h:'フランジャー: ジェット感',b:'MODのTYPEを FLANGER にすると、【フランジャー】になる。ごく短い遅れの音を混ぜ、その遅れを揺らすので、音のところどころが山と谷になって、ジェット機のような「うねり」になる。聞き比べよう。',tab:'mix',
  cmp:ef('ef07s1',[['MODなし',{tm:{3:MOFF}}],['フランジャー',{tm:{3:M({iMdType:2,iMdRate:.4,iMdDepth:.6,iMdFb:.5,iMdMix:.5})}}]])},
 {h:'FEEDBACK: うねりの強さ',b:'FEEDBACKは、エフェクト音を入口に戻す量。0なら、おだやか。上げると、うねりが強く、金属的な響きになる。T3のFEEDBACKを0.3〜0.7にして、聴こう。',tab:'mix',
  mx:[{trk:3,ins:'md',k:'iMdFb',rng:[.3,.7]}],
  cmp:ef('ef07s2',[['FEEDBACK 0',{tm:{3:M({iMdType:2,iMdRate:.4,iMdDepth:.6,iMdFb:0})}}],['FEEDBACK 0.5',{tm:{3:M({iMdType:2,iMdRate:.4,iMdDepth:.6,iMdFb:.5})}}],['FEEDBACK 0.85',{tm:{3:M({iMdType:2,iMdRate:.4,iMdDepth:.6,iMdFb:.85})}}]])},
 {h:'RATE: うねりの速さ',b:'RATEは、うねりが往復する速さ。遅いと、ゆったりした波。速いと、ビブラートのようになる。T3のRATEを0.2〜1Hzにして、曲のテンポに合う速さを探そう。',tab:'mix',
  mx:[{trk:3,ins:'md',k:'iMdRate',rng:[.2,1]}]},
 {h:'フェイザー: やわらかい波',b:'TYPEを PHASER にすると、【フェイザー】になる。フランジャーより、やわらかく、ゆっくり波打つ。位相をずらした音を混ぜるので、特定の帯域に山と谷ができ、その位置が動く。フランジャーと聞き比べよう。',tab:'mix',
  cmp:ef('ef07s4',[['フランジャー',{tm:{3:M({iMdType:2,iMdRate:.4,iMdDepth:.6,iMdFb:.5,iMdMix:.5})}}],['フェイザー',{tm:{3:M({iMdType:3,iMdRate:.4,iMdDepth:.6,iMdFb:.5,iMdMix:.5})}}]]),quiz:qz('ジェット機のように強く金属的にうねっているのは?',1,'1が正解(フランジャー)。短い遅れを使うので、細かい山と谷が並び、金属的になる。フェイザーは、もっとやわらかい。')},
 {h:'どんな音に使うか',b:'うねりは、ずっと続く音(コード・パッド・ハット)に使うと分かりやすい。短い音(キック)では、効果が出にくい。使いすぎると耳が疲れるので、MIXを控えめに。',tab:'mix',
  col:{h:'動きは「静かな部分」に',b:'うねりのエフェクトは、音に動きを足す。静かな部分に足すと目立ち、にぎやかな部分では埋もれやすい。足す場所を選ぶことも、使い方のうち。'}}
]}),
/* ---------------- ef16 ---------------- */
base({id:'ef16',pre:['cm05','eq05'],terms:['comp','eq','gr'],title:'処理の順番',sub:'EQ→COMPか、COMP→EQか。センドの前後',ts:2,save:{name:'順番を決めたベース',kind:'kit'},
 tk:[KICK(),BP8({eq:E({iEqLg:9,iEqLf:120}),cp:C({iCpThr:-26,iCpRatio:4}),ord:{iOrd:0}})],steps:[
 {h:'順番で音が変わる',b:'インサートは、並べる順番で音が変わる。T2のベースには、EQとCOMPが入っている。EQで低域を持ち上げてから圧縮する(EQ→COMP)のと、圧縮してから持ち上げる(COMP→EQ)のでは、同じつまみでも結果が違う。ORDERで切り替えて、聞き比べよう。',tab:'mix',
  cmp:ef('ef16s1',[['EQ→COMP',{tm:{2:Object.assign(E({iEqLg:9,iEqLf:120}),C({iCpThr:-26,iCpRatio:4}),{iOrd:0})}}],['COMP→EQ',{tm:{2:Object.assign(E({iEqLg:9,iEqLf:120}),C({iCpThr:-26,iCpRatio:4}),{iOrd:1})}}]])},
 {h:'EQ→COMP: 持ち上げた帯域に反応する',b:'EQが先だと、持ち上げた低域が大きくなってから、COMPに入る。COMPはその低域に強く反応して、抑える量(GR)が増える。つまり、EQで持ち上げた帯域を、COMPが抑えて整える流れ。T2のLOWを+6〜+12dBにして、GRメーターを見よう。',tab:'mix',
  mx:[{trk:2,ins:'eq',k:'iEqLg',rng:[6,12]}]},
 {h:'COMP→EQ: 整えた音に色をつける',b:'COMPが先だと、先に音量をそろえてから、EQで色をつける。EQで持ち上げた分は、COMPに邪魔されず、そのまま出る。仕上げの色づけには、こちらがなじみやすい。ORDERを切り替えて、違いを確かめよう。',tab:'mix',
  cmp:ef('ef16s3',[['EQ→COMP(LOW +12)',{tm:{2:Object.assign(E({iEqLg:12,iEqLf:120}),C({iCpThr:-26,iCpRatio:4}),{iOrd:0})}}],['COMP→EQ(LOW +12)',{tm:{2:Object.assign(E({iEqLg:12,iEqLf:120}),C({iCpThr:-26,iCpRatio:4}),{iOrd:1})}}]]),quiz:qz('持ち上げた低域に、COMPが強く反応して抑えているのは?',1,'1が正解(EQ→COMP)。EQで持ち上げた低域が、そのままCOMPに入るので、GRが増える。')},
 {h:'どちらが正しい、ではない',b:'EQ→COMPが正解でも、COMP→EQが正解でもない。目安として、「不要な帯域を削る(カット)のは先、持ち上げる(ブースト)のは後」という考え方がある。カットを先にすると、COMPが不要な低域に反応しなくなる。曲と音色に合わせて、耳で選ぼう。',tab:'mix',
  cmp:ef('ef16s4',[['EQ(カット)→COMP',{tm:{2:Object.assign(E({iEqHpf:60,iEqLg:0}),C({iCpThr:-26,iCpRatio:4}),{iOrd:0})}}],['COMP→EQ(カット)',{tm:{2:Object.assign(E({iEqHpf:60,iEqLg:0}),C({iCpThr:-26,iCpRatio:4}),{iOrd:1})}}]])},
 {h:'センドの前後',b:'リバーブやディレイに送る量(SEND)は、このアプリでは、インサートとPANの後ろから取る。つまり、トラックのEQやCOMPの結果が、そのまま送られる。そのため、COMPで抑えた音が、リバーブにも小さく送られる。送りの前後で、効き方が変わることを覚えておこう。',tab:'mix',
  col:{h:'実機の世界では',b:'実際のミキサーやDAWでは、センドを「インサートの前」から取るか「後ろ」から取るか選べるものが多い。前から取れば、インサートの効果がリバーブに影響しない。このアプリは、後ろから取る方式だけ。'}}
]})
 );

/* ================= v7.7b ef08〜ef15 =================
   ディレイ・リバーブ・WIDTH・フィルターは「マスターFX」(FXタブ)。トラックごとの送りは MIX の DLY SEND / RVB SEND(tDly・tRvb)。
   聞き比べ cmp の s=マスターFXの値 / tm=トラック別(送り tDly・tRvb・インサート)。g(音量補正)は tools/ef-cal.js が出す。
   測定(test/efest.js)は DELAY(TIME・FB・TONE)・REVERB(IR・PRE・MIX)・WIDTH・DJ FILTER・AUTO FILT を近似で再現する(PING-PONG・DIGITAL/TAPE・リターンDUCK・オートメーションのレーンは測らない=該当の聞き比べは g を付けない) */
 var T7=SD.TERMS,A7=function(id,name,kana,en,def,see){T7.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:['EF']})};
 A7('slap','スラップディレイ','すらっぷでぃれい','slapback delay','数十〜百ミリ秒ほどの短い遅れを、繰り返さずに1回だけ足すディレイ。音が太く、前に出る。',['ef09']);
 A7('pingpong','ピンポン','ぴんぽん','ping-pong','ディレイの繰り返しが、左右に交互に飛ぶ設定。中央の音はそのままで、返りだけが広がる。',['ef09']);
 A7('duckd','ダッキング','だっきんぐ','ducking','ある音が鳴っている間だけ、別の音(ここではディレイやリバーブの戻り)を下げ、鳴りやんだすき間で戻すこと。',['ef09']);
 A7('predly','プリディレイ','ぷりでぃれい','pre-delay','リバーブの響きが始まるまでの間。長くすると、元の音がはっきり聞こえてから響くので、距離感が変わる。',['ef10','ef11']);
 A7('damp','ダンプ','だんぷ','damping','リバーブの高域の減り方。上げるほど高域が早く消えて、暗くやわらかい響きになる。',['ef10','ef11']);
 A7('send','センド','せんど','send','トラックの音を枝分かれさせて、リバーブやディレイに送ること(並列)。元の音はそのまま残り、効果音が足される。',['ef12']);
 A7('insert','インサート','いんさーと','insert','トラックの音の通り道に、EQやCOMPなどを直列に挿すこと。通った音そのものが変わる。',['ef12']);
 A7('rtn','リターン','りたーん','return','センドで送った先(リバーブやディレイ)から戻ってくる音。ミックスの中で、その量を決める。',['ef12']);
 Object.assign(GT,/*GT7B*/{'ef08s11':0,'ef08s12':-0.7,'ef08s21':0,'ef08s22':-0.5,'ef08s23':-0.5,'ef08s31':-0.4,'ef08s32':0,'ef08s33':0,'ef08s41':0,'ef08s42':-0.1,'ef08s43':-0.9,'ef08s51':0,'ef08s52':0,'ef08s53':0,'ef08s61':0,'ef08s62':-0.6,'ef08s63':-2.2,'ef09s11':0,'ef09s12':-0.1,'ef09s13':0,'ef09s21':0,'ef09s22':-0.1,'ef09s23':-0.1,'ef09s31':0,'ef09s32':0,'ef09s41':0,'ef09s42':0,'ef09s51':0,'ef09s52':0,'ef10s11':0,'ef10s12':0,'ef10s21':0,'ef10s22':-0.5,'ef10s23':-0.4,'ef10s31':0,'ef10s32':0,'ef10s33':-0.2,'ef10s41':0,'ef10s42':0,'ef10s43':-0.1,'ef10s51':0,'ef10s52':0,'ef10s53':0,'ef10s61':0,'ef10s62':-0.1,'ef10s63':-0.3,'ef11s11':0,'ef11s12':0,'ef11s13':0,'ef11s21':0,'ef11s22':0,'ef11s31':0,'ef11s32':-2.9,'ef11s33':-2.9,'ef11s41':0,'ef11s42':0,'ef11s51':0,'ef11s52':0,'ef12s11':-0.3,'ef12s12':0,'ef12s21':0,'ef12s22':0,'ef12s23':0,'ef12s31':0,'ef12s32':0,'ef12s33':0,'ef12s41':0,'ef12s42':0,'ef12s51':-0.3,'ef12s52':0,'ef13s11':0,'ef13s12':-0.2,'ef13s13':-0.5,'ef13s21':0,'ef13s22':0,'ef13s31':0,'ef13s32':-0.6,'ef13s41':-0.4,'ef13s42':0,'ef13s43':-0.3,'ef13s51':0,'ef13s52':-0.1,'ef13s53':-0.3,'ef14s11':-9.6,'ef14s12':-9.8,'ef14s13':0,'ef14s41':-0.8,'ef14s42':-0.4,'ef14s43':0,'ef14s51':-0.3,'ef14s52':0,'ef15s21':0,'ef15s22':0,'ef15s31':0,'ef15s32':-0.1,'ef15s51':0,'ef15s52':-0.2});
 var PLK={o1Wave:'sawtooth',o1Lvl:.6,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:3200,res:.1,envAmt:.4,drive:0,aA:.002,aD:.14,aS:0,aR:.1};/* 短く切れる音(余韻がディレイ・リバーブで聞こえやすい) */
 var LDP=function(a,name,mix){var q={};a.forEach(function(p){q[p[0]]=p[1]});return {id:'bass',idx:q,o:{name:name,scale:'minor',tr:12,p:PLK,mix:mix}}};
 var WM=function(t,mix){t.o=Object.assign({},t.o,{mix:mix});return t};
 var NS={tDly:0,tRvb:0};/* 送り無し */
 var LEAD=function(mix){return LDP([[0,0],[6,3],[10,7]],'リード',mix)};
 var SNR=function(mix){return WM(TK('snare',{idx:z([4,12]),o:{}},'スネア'),mix)};
 var KIK=function(){return WM(KICK(),NS)},HAT=function(){return WM(HATO(),NS)};
 var DL=function(o){return Object.assign({dlyMix:.4,dlyFb:.35,dlySync:1,dlyDiv:5,dlyTime:.3,dlyTone:4500,dlyPP:0,dlyMode:1,dlDuckOn:0,rvbMix:0},o)};
 var RV=function(o){return Object.assign({rvbMix:.3,rvbType:2,rvbSize:2,rvbPre:0,rvbDamp:.5,rvDuckOn:0,dlyMix:0},o)};
 var SW=function(o){return Object.assign({swOn:1,swWidth:1,dlyMix:0,rvbMix:0},o)};
 var DJ=function(o){return Object.assign({djOn:1,djFilter:0,djRes:.2,afOn:0,dlyMix:0,rvbMix:0},o)};
 var AF=function(o){return Object.assign({afOn:1,afType:0,afMode:1,afCut:1000,afRes:.3,afDepth:.6,afRate:1,afSync:1,afDiv:5,afShape:0,afSens:.5,afAtk:5,afRel:120,djOn:0,dlyMix:0,rvbMix:0},o)};
 var MDC={iMdOn:1,iMdType:0,iMdRate:.8,iMdDepth:.5,iMdFb:0,iMdMix:.5};
 var PLY={o1Wave:'triangle',o1Lvl:.85,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:3500,res:.1,envAmt:.3,drive:0,aA:.002,aD:.25,aS:.35,aR:.12,dlyMix:0,rvbMix:0,dlySync:0,bcOn:0,rmOn:0};
 var fxe=function(o){return fxl(Object.assign({init:PLY,demo:{n:[60,64,67,64],gap:1.4,len:.2},pre:['th11']},o))};
 var B4=384,L4=1536;
 var TM=function(id,pts){return{id:id,trk:'M',pts:pts}};
 SD.LESSONS.push(
/* ---------------- ef08 ---------------- */
fxe({id:'ef08',terms:['delay','fbk','sync'],save:{name:'ディレイの基本',kind:'patch'},title:'ディレイの基礎',sub:'TIME・SYNC・FEEDBACK・TONE・MIX',steps:[
 {h:'ディレイは「遅れて返る音」',b:'【ディレイ】は、音を少し遅らせて、元の音のあとに繰り返し鳴らすエフェクト。やまびこのようなもの。FXタブで DLY MIX を40%にして、試聴しよう。MIX は、遅れた音の量。0%だと何も聞こえない。',tab:'fx',f:[['dlyMix',.4]],tol:.1,
  cmp:ef('ef08s1',[['なし',{s:DL({dlyMix:0})}],['あり',{s:DL({dlyMix:.4,dlySync:0,dlyTime:.3})}]])},
 {h:'TIME: 遅れる長さ',b:'DLY SYNC を FREE にして、DLY TIME で遅れの長さをミリ秒で決める。短いと元の音に張りついて厚みになり、長いとはっきりしたやまびこになる。TIME を300ms前後にして聴こう。',tab:'fx',f:[['dlySync',0],['dlyTime',.3],['dlyMix',.4]],tol:.1,
  cmp:ef('ef08s2',[['TIME 80ms',{s:DL({dlySync:0,dlyTime:.08})}],['TIME 300ms',{s:DL({dlySync:0,dlyTime:.3})}],['TIME 700ms',{s:DL({dlySync:0,dlyTime:.7})}]]),quiz:qz('いちばん遅れが長いのは?',3,'3が正解。TIMEが700msと長いので、元の音からはっきり離れて返ってくる。1は80msで、元の音に張りつく。')},
 {h:'SYNC: 拍に合わせる',b:'テンポが決まっている曲では、遅れの長さを「音符」で決めると、繰り返しが拍と合う。DLY SYNC を SYNC にして、DLY DIV を 1/8(八分音符)にしよう。BPM120なら、1/8は250ms、1/4は500ms。テンポを変えても、繰り返しはテンポについてくる。',tab:'fx',f:[['dlySync',1],['dlyDiv',5],['dlyMix',.4]],tol:.1,
  cmp:ef('ef08s3',[['1/16',{s:DL({dlyDiv:7})}],['1/8',{s:DL({dlyDiv:5})}],['1/4',{s:DL({dlyDiv:3})}]]),quiz:qz('繰り返しの間隔がいちばん短いのは?',1,'1が正解。1/16は十六分音符で、BPM120なら125ms。1/4の半分の半分の長さ。')},
 {h:'FEEDBACK: 繰り返しの回数',b:'【フィードバック】(FB)は、遅れた音をもう一度ディレイに戻す量。上げるほど、繰り返しの回数が増える。DLY FB を50%くらいにして聴こう。上げすぎると、いつまでも終わらなくなる(暴走は ef15 で扱う)。',tab:'fx',f:[['dlyFb',.5]],tol:.1,
  cmp:ef('ef08s4',[['FB 10%',{s:DL({dlyFb:.1})}],['FB 45%',{s:DL({dlyFb:.45})}],['FB 80%',{s:DL({dlyFb:.8})}]]),quiz:qz('繰り返しの回数がいちばん多いのは?',3,'3が正解。FBが80%と高いので、返る音がなかなか小さくならない。')},
 {h:'TONE: 繰り返しの明るさ',b:'DLY TONE は、繰り返すたびに高域を丸める度合い。下げるほど、繰り返しが暗くなって、元の音の後ろに隠れる。TONEを2kHz前後にして聴こう。明るいままだと、繰り返しが元の音と同じくらい目立つ。',tab:'fx',f:[['dlyTone',2000]],tol:.1,
  cmp:ef('ef08s5',[['TONE 12kHz',{s:DL({dlyTone:12000})}],['TONE 4.5kHz',{s:DL({dlyTone:4500})}],['TONE 1.2kHz',{s:DL({dlyTone:1200})}]])},
 {h:'MIXで量を決める',b:'最後は MIX。遅れた音の量が多いほど、ディレイが目立つ。少ないと、すき間にうっすら空間が足される。基準にせず、曲に合わせて耳で決めよう。聞き比べて、好みの量を探そう。',tab:'fx',
  cmp:ef('ef08s6',[['MIX 15%',{s:DL({dlyMix:.15})}],['MIX 40%',{s:DL({dlyMix:.4})}],['MIX 80%',{s:DL({dlyMix:.8})}]]),
  col:{h:'ディレイは「時間」を使うエフェクト',b:'ディレイは、EQやコンプと違って、音そのものでなく「時間」を足す道具。拍に合わせると、繰り返しがリズムの一部になる。合わせないと、別のリズムが重なって、にごって聞こえることもある。大きな音で長く聴かず、こまめに休みながら探そう。'}}
]}),
/* ---------------- ef09 ---------------- */
base({id:'ef09',pre:['ef08'],terms:['delay','slap','pingpong','duckd'],title:'ディレイの使い分け',sub:'スラップ・付点8分・ピンポン・ダッキング',ts:3,save:{name:'ディレイの使い分け',kind:'kit'},
 init:{dlyMix:0,rvbMix:0},tk:[KIK(),HAT(),LEAD()],steps:[
 {h:'スラップ: 短い遅れを1回',b:'【スラップディレイ】は、数十〜百ミリ秒ほどの短い遅れを、繰り返さずに1回だけ足すやり方。音が太く、前に出る。DLY SYNC を FREE、TIME を90ms、FB を0%、MIX を35%にしよう。T3(リード)にだけ送ってある。',tab:'fx',f:[['dlySync',0],['dlyTime',.09],['dlyFb',0],['dlyMix',.35]],tol:.1,
  cmp:ef('ef09s1',[['ディレイなし',{s:DL({dlyMix:0})}],['スラップ',{s:DL({dlySync:0,dlyTime:.09,dlyFb:0,dlyMix:.35})}],['付点8分',{s:DL({dlyDiv:4,dlyMix:.35})}]]),quiz:qz('繰り返さず、音が太くなるだけなのは?',2,'2が正解。TIMEが短く、FBが0%なので、遅れた音は1回だけで、元の音に張りついて太く聞こえる。')},
 {h:'付点8分: ノリを出す',b:'付点8分(1/8.)は、八分音符の1.5倍の長さ。拍の裏に入るので、リズムが跳ねる定番の遅れ。DLY SYNC を SYNC、DLY DIV を 1/8. にして、FB を35%にしよう。1/8 や 1/4 と聞き比べると、ノリの違いが分かる。',tab:'fx',f:[['dlySync',1],['dlyDiv',4],['dlyFb',.35],['dlyMix',.35]],tol:.1,
  cmp:ef('ef09s2',[['1/8',{s:DL({dlyDiv:5,dlyMix:.35})}],['1/8.',{s:DL({dlyDiv:4,dlyMix:.35})}],['1/4',{s:DL({dlyDiv:3,dlyMix:.35})}]])},
 {h:'ピンポン: 左右へ跳ねる',b:'【ピンポン】は、繰り返しが左右に交互に飛ぶ設定。リードの元の音は中央のまま、返りだけが広がる。PING-PONG を ON にして、聴き比べよう。ヘッドホンだと左右の動きが分かりやすい。',tab:'fx',f:[['dlyPP',1],['dlyMix',.35]],tol:.1,
  cmp:ef('ef09s3',[['ふつう',{s:DL({dlyDiv:4,dlyMix:.35,dlyPP:0})}],['ピンポン',{s:DL({dlyDiv:4,dlyMix:.35,dlyPP:1})}]])},
 {h:'ダッキング: 音のあいだだけ返す',b:'ディレイが長いと、次の音に重なって邪魔になる。【ダッキング】は、リードが鳴っている間だけ、ディレイの戻りをへこませ、音が切れたすき間で戻す。DLY DUCK を ON、DLY SRC を T3、DLY DEPTH を60%にしよう。',tab:'fx',f:[['dlDuckOn',1],['dlDuckSrc',2],['dlDuckDepth',.6]],tol:.1,
  cmp:ef('ef09s4',[['ダッキングなし',{s:DL({dlyDiv:4,dlyMix:.5,dlyFb:.5,dlDuckOn:0})}],['ダッキングあり',{s:DL({dlyDiv:4,dlyMix:.5,dlyFb:.5,dlDuckOn:1,dlDuckSrc:2,dlDuckDepth:.6})}]]),quiz:qz('リードの音が、ディレイに邪魔されにくいのは?',2,'2が正解。リードが鳴っている間は戻りがへこむので、ノートの頭がはっきり聞こえる。')},
 {h:'リード向き・声向き',b:'リードには、付点8分やピンポンで広がりを足すのが定番。声には、言葉を邪魔しないよう、短いスラップや、ダッキングを使う考え方がある(声の代役は VO コースで使う)。正解は1つではないので、聞き比べて、曲に合うほうを選ぼう。',tab:'fx',
  cmp:ef('ef09s5',[['リード向き',{s:DL({dlyDiv:4,dlyMix:.4,dlyFb:.4,dlyPP:1})}],['声向き',{s:DL({dlySync:0,dlyTime:.1,dlyFb:0,dlyMix:.3,dlyPP:0})}]]),
  col:{h:'ディレイは「主役の後ろ」に置く',b:'ディレイの音は、元の音より小さく・暗くして、主役の後ろに置くと、邪魔にならない。TONEを下げる、MIXを控えめにする、ダッキングで主役の音をよけるのが、そのための定番の手。'}}
]}),
/* ---------------- ef10 ---------------- */
fxe({id:'ef10',pre:['ef08'],terms:['reverb','predly','damp','dry','wet'],save:{name:'リバーブの基本',kind:'patch'},title:'リバーブの基礎',sub:'TYPE・SIZE・PRE DLY・DAMP・MIX',steps:[
 {h:'リバーブは「空間の響き」',b:'【リバーブ】は、部屋やホールで音が壁に反射して、混ざり合って消えていく響きを足すエフェクト。FXタブで RVB MIX を30%にして、試聴しよう。元の音(【ドライ】)に、響きの音(【ウェット】)が足される。',tab:'fx',f:[['rvbMix',.3]],tol:.1,
  cmp:ef('ef10s1',[['なし',{s:RV({rvbMix:0})}],['あり',{s:RV({rvbMix:.3})}]])},
 {h:'TYPE: 空間の種類',b:'RVB TYPE を HALL にしよう。ROOM は小さな部屋の近い反射、HALL は大きな空間の長い響き、PLATE はきめ細かくなめらかな響き、という傾向がある。聞き比べて、響き方の違いをつかもう。',tab:'fx',f:[['rvbType',2],['rvbMix',.3]],tol:.1,
  cmp:ef('ef10s2',[['ROOM',{s:RV({rvbType:1,rvbSize:1})}],['HALL',{s:RV({rvbType:2,rvbSize:2.5})}],['PLATE',{s:RV({rvbType:3,rvbSize:1.8})}]])},
 {h:'SIZE: 響きの長さ',b:'RVB SIZE は、響きが消えるまでの長さ。大きな空間ほど長い。SIZE を2.5秒くらいにして聴こう。長いほど余韻が豊かだが、次の音と重なって、にごりやすい。',tab:'fx',f:[['rvbSize',2.5]],tol:.1,
  cmp:ef('ef10s3',[['SIZE 0.6秒',{s:RV({rvbSize:.6})}],['SIZE 1.5秒',{s:RV({rvbSize:1.5})}],['SIZE 4秒',{s:RV({rvbSize:4})}]]),quiz:qz('響きがいちばん長く残るのは?',3,'3が正解。SIZEが4秒と長いので、次の音が来るまで響きが続く。')},
 {h:'PRE DLY: 響きが始まるまでの間',b:'【プリディレイ】(PRE DLY)は、元の音から響きが始まるまでの間。長くすると、元の音がはっきり聞こえてから響くので、音が手前に聞こえやすい。PRE DLY を40msにして聴こう。',tab:'fx',f:[['rvbPre',40]],tol:.1,
  cmp:ef('ef10s4',[['PRE 0ms',{s:RV({rvbPre:0})}],['PRE 40ms',{s:RV({rvbPre:40})}],['PRE 90ms',{s:RV({rvbPre:90})}]])},
 {h:'DAMP: 高域の減り方',b:'【ダンプ】(DAMP)は、響きの高域の減り方。上げるほど、高域が早く消えて、暗くやわらかい響きになる。DAMP を80%くらいにして聴こう。下げると、明るくきらびやかな響きが長く残る。',tab:'fx',f:[['rvbDamp',.8]],tol:.1,
  cmp:ef('ef10s5',[['DAMP 10%',{s:RV({rvbDamp:.1})}],['DAMP 50%',{s:RV({rvbDamp:.5})}],['DAMP 90%',{s:RV({rvbDamp:.9})}]]),quiz:qz('響きがいちばん暗いのは?',3,'3が正解。DAMPが90%と高く、響きの高域が早く消える。')},
 {h:'MIX: 響きの量',b:'最後は MIX。響きが多いほど、音が奥へ引っ込む。少ないと、音が前でくっきり聞こえる。「どれくらいがいい」という正解はなく、曲と音色で決める。聞き比べよう。',tab:'fx',
  cmp:ef('ef10s6',[['MIX 10%',{s:RV({rvbMix:.1})}],['MIX 30%',{s:RV({rvbMix:.3})}],['MIX 60%',{s:RV({rvbMix:.6})}]]),
  col:{h:'リバーブは「距離」を作る',b:'響きの量が増えると、音は遠くに聞こえやすい。リバーブは、音を飾るというより、音を置く「場所」を作る道具。かけすぎると全体が遠くぼやけるので、小さめの音量で、こまめに休みながら探そう。'}}
]}),
/* ---------------- ef11 ---------------- */
base({id:'ef11',pre:['ef10'],terms:['reverb','predly','damp'],title:'リバーブの使い分け',sub:'距離・明るさ・長さ(テンポと密度)',ts:3,save:{name:'リバーブの使い分け',kind:'kit'},
 init:{dlyMix:0,rvbMix:.3,rvbType:2,rvbSize:2,rvbPre:0,rvbDamp:.5},
 tk:[KIK(),SNR({tDly:0,tRvb:.3}),LEAD({tDly:0,tRvb:1}),HAT(),WM(BP8(),NS)],steps:[
 {h:'プリディレイで距離',b:'リード(T3)に響きが掛かっている。PRE DLY を長くすると、元の音が手前にはっきり聞こえ、響きは少し奥から始まる。目安は{g:dyn.rvPre}。PRE DLY を40msにして、聞き比べよう。',tab:'fx',f:[['rvbPre',40]],tol:.15,
  cmp:ef('ef11s1',[['PRE 0ms',{s:RV({rvbPre:0})}],['PRE 40ms',{s:RV({rvbPre:40})}],['PRE 100ms',{s:RV({rvbPre:100})}]])},
 {h:'DAMPで明るさ',b:'DAMP を上げると響きが暗くなり、下げると明るくなる。明るい響きは前に、暗い響きは奥に聞こえやすい。リードの響きを暗めにして、他の音(ハット)と取り合わないようにする考え方もある。DAMP を70%にして聴こう。',tab:'fx',f:[['rvbDamp',.7]],tol:.1,
  cmp:ef('ef11s2',[['DAMP 20%(明るい)',{s:RV({rvbDamp:.2})}],['DAMP 70%(暗い)',{s:RV({rvbDamp:.7})}]])},
 {h:'長さはテンポと密度に合わせる',b:'まばらな音には長い響きが合い、音が詰まっていると、長い響きは次の音に重なってにごる。テンポが速いほど、短めが合いやすい。SIZE を変えながら、ミュートを切り替えて(ここでは聞き比べのボタン)、まばらな場合と詰まった場合を聴こう。',tab:'fx',
  cmp:ef('ef11s3',[['まばら+長い',{s:RV({rvbSize:3.5}),mt:[3,4]}],['詰まる+長い',{s:RV({rvbSize:3.5}),mt:[]}],['詰まる+短い',{s:RV({rvbSize:.8}),mt:[]}]]),quiz:qz('響きで音がにごっているのは?',2,'2が正解。ハットとベースが鳴って詰まっているのに、響きが3.5秒と長いので、次の音に重なる。')},
 {h:'量は送りで決める',b:'リバーブは1つでも、トラックごとの RVB SEND で、響きの量を変えられる。T3(リード)の RVB SEND を30%と100%で聞き比べよう。送りが多いほど響きが多く、奥に聞こえる。ふだんはスネアとリードにだけ、小さめに送る。',tab:'mix',
  cmp:ef('ef11s4',[['リード 送り30%',{tm:{3:{tRvb:.3}}}],['リード 送り100%',{tm:{3:{tRvb:1}}}]])},
 {h:'手前と奥を作る',b:'ここまでの組み合わせで、音を「手前」と「奥」に置ける。手前は、PRE DLYを長めに・DAMPを高めに・送りを少なく。奥は、PRE DLYを短く・送りを多く・DAMPを低めに。好みの置き場所を探そう。',tab:'fx',
  cmp:ef('ef11s5',[['手前',{s:RV({rvbPre:40,rvbDamp:.7,rvbMix:.2}),tm:{3:{tRvb:.4}}}],['奥',{s:RV({rvbPre:5,rvbDamp:.3,rvbMix:.5}),tm:{3:{tRvb:1}}}]]),
  col:{h:'「全部に同じリバーブ」でもいい',b:'曲の中の全部の音を、1つのリバーブに送ると、同じ部屋で鳴っているようにまとまる。その上で、送りの量だけを音ごとに変えて、奥行きを作る。これは ef12 で詳しく扱う。'}}
]}),
/* ---------------- ef12 ---------------- */
base({id:'ef12',pre:['ef11'],terms:['send','insert','rtn','reverb'],title:'センドとインサート',sub:'直列と並列の違い・共有リバーブ',ts:2,save:{name:'共有リバーブのミックス',kind:'kit'},
 init:{dlyMix:0,rvbMix:.35,rvbType:2,rvbSize:2,rvbPre:10,rvbDamp:.6},
 tk:[KIK(),LEAD({tDly:0,tRvb:0}),SNR({tDly:0,tRvb:0}),WM(TK('hat',{idx:z([2,6,10,14]),o:{}},'ハット',{acc:[2,6,10,14]}),NS)],steps:[
 {h:'インサート(直列): 音そのものを変える',b:'【インサート】は、トラックの音の通り道に、EQやCOMPなどを直列に挿すやり方。通った音そのものが変わる。T2(リード)の LOW CUT(EQのインサート)を、150〜400Hzにしよう。元の音から低域が減る。',tab:'mix',mx:[{trk:2,ins:'eq',k:'iEqHpf',rng:[150,400]}],
  cmp:ef('ef12s1',[['インサートなし',{tm:{2:{iEqOn:0}}}],['LOW CUT 300Hz',{tm:{2:E({iEqHpf:300})}}]])},
 {h:'センド(並列): 元の音を残して足す',b:'【センド】は、トラックの音を枝分かれさせて、リバーブやディレイに送るやり方。元の音はそのまま残り、リバーブの音が足される。戻ってくる音が【リターン】。T2の RVB SEND(SEND/OUT 区画)を0%、30%、100%にして聴き比べよう。',tab:'mix',
  cmp:ef('ef12s2',[['送り 0%',{tm:{2:{tRvb:0}}}],['送り 30%',{tm:{2:{tRvb:.3}}}],['送り 100%',{tm:{2:{tRvb:1}}}]]),quiz:qz('元の音は変えず、響きだけを足すのは?',2,'2が正解(センド)。送りを上げても、元の音そのものは変わらず、リターンの響きが増えるだけ。1のインサートは、通る音そのものを変える。')},
 {h:'共有リバーブで統一感',b:'リバーブを音ごとに別々に用意せず、1つのリバーブに全部を少しずつ送ると、同じ部屋で鳴っているようにまとまる。リード・スネア・ハットに、送りを少しずつ足して、聞き比べよう。',tab:'mix',
  cmp:ef('ef12s3',[['送りなし',{tm:{2:{tRvb:0},3:{tRvb:0},4:{tRvb:0}}}],['リードだけ',{tm:{2:{tRvb:1},3:{tRvb:0},4:{tRvb:0}}}],['全員に少し(共有)',{tm:{2:{tRvb:.5},3:{tRvb:.35},4:{tRvb:.2}}}]]),quiz:qz('1つの部屋で鳴っているようにまとまるのは?',3,'3が正解。全員が同じリバーブに送られて、同じ空間の響きを共有している。')},
 {h:'送りの量で距離を作る',b:'共有リバーブでも、送りの量を変えれば、音ごとの距離を変えられる。送りが少ない音は手前、多い音は奥に聞こえやすい。T2の送りを15%と80%にして、距離の違いを聴こう。',tab:'mix',
  cmp:ef('ef12s4',[['T2 送り15%(手前)',{tm:{2:{tRvb:.15},3:{tRvb:.35},4:{tRvb:.2}}}],['T2 送り80%(奥)',{tm:{2:{tRvb:.8},3:{tRvb:.35},4:{tRvb:.2}}}]])},
 {h:'インサートの結果が送りに乗る',b:'このアプリでは、センドは、インサートやPANの後ろから取る。つまり、T2の LOW CUT を上げると、リバーブに送られる低域も減る。響きから低域を抜くと、すっきりする。T2の LOW CUT を250〜500Hzにして、送りは100%のまま聴こう。',tab:'mix',mx:[{trk:2,ins:'eq',k:'iEqHpf',rng:[250,500]}],
  cmp:ef('ef12s5',[['LOW CUT 20Hz',{tm:{2:Object.assign(E({iEqHpf:20}),{tRvb:1})}}],['LOW CUT 400Hz',{tm:{2:Object.assign(E({iEqHpf:400}),{tRvb:1})}}]]),
  col:{h:'使い分けの目安',b:'音そのものを整えたいとき(EQ・COMP・歪み)は、インサート。リバーブやディレイのように、複数の音で共有したいものは、センド。実際のミキサーやDAWでは、センドを挿入の前から取るか後ろから取るかを選べるものも多い。このアプリは、後ろから取る方式だけ。なお、マスターのリバーブは、既定では「送り」。FXタブの POSITION を CHAIN にすると、ラックの並びの一員(直列)になり、REVERSE の前にも置ける(rv02)。'}}
]}),
/* ---------------- ef13 ---------------- */
base({id:'ef13',pre:['th10','ef12'],terms:['wide','mono','stereo'],title:'ステレオ幅(WIDTH)',sub:'低域は広げない・広げすぎるとモノで薄くなる',ts:3,save:{name:'幅を決めたミックス',kind:'kit'},
 init:{dlyMix:0,rvbMix:0,swOn:1,swWidth:1},
 tk:[KIK(),WM(BP8(),NS),WM(HELD('パッド',PAD),Object.assign({},NS,MDC))],steps:[
 {h:'WIDTH: 広さのつまみ',b:'FXタブの WIDTH は、左右の差(ステレオの広がり)を調節する。0%で完全なモノ、100%でそのまま、200%で広げる。WIDTH をONにして、WIDTH AMT を150%にしよう。T3のパッドは、コーラスで左右に少し違いがある。',tab:'fx',f:[['swOn',1],['swWidth',1.5]],tol:.1,
  cmp:ef('ef13s1',[['0%(モノ)',{s:SW({swWidth:0})}],['100%',{s:SW({swWidth:1})}],['200%',{s:SW({swWidth:2})}]])},
 {h:'低域は広げない',b:'WIDTH は、150Hzより低い差の成分を広げない作りになっている。低音は中央に集めるほうが、力が逃げず、スピーカーでも安定するから。ベースとキックだけにして、WIDTH 100%と200%を聴き比べよう。ほとんど変わらないはず。',tab:'fx',
  cmp:ef('ef13s2',[['低域だけ 100%',{s:SW({swWidth:1}),mt:[2]}],['低域だけ 200%',{s:SW({swWidth:2}),mt:[2]}]])},
 {h:'広げすぎるとモノで薄くなる',b:'広げるほど、「左右が逆向き」の成分が増える。MIX画面の MONO ボタン(左右を足して聴く)を押すと、その成分が打ち消し合って消える。ステレオで聴いたときと、モノで聴いたときの差が大きいと、モノでは薄く・小さく聞こえやすい。【モノラル】でも確かめる習慣をつけよう。聞き比べたあと MONO も試そう。',tab:'fx',
  cmp:ef('ef13s3',[['WIDTH 100%',{s:SW({swWidth:1}),mt:[0,1]}],['WIDTH 200%',{s:SW({swWidth:2}),mt:[0,1]}]]),quiz:qz('ステレオとモノの差が大きくなりやすいのは?',2,'2が正解。広げた分の成分は、モノにすると打ち消し合うので、広げるほど差が大きくなる。')},
 {h:'もとがモノなら広がらない',b:'WIDTH は、もとの音の左右の差を調節するだけ。もとが完全なモノの音は、200%にしても広がらない。パッドのコーラス(MOD)をONとOFFにして、WIDTH 200%で聴き比べよう。幅は「作る」ものと「調節する」ものがある。',tab:'mix',
  cmp:ef('ef13s4',[['コーラスなし+200%',{s:SW({swWidth:2}),mt:[],tm:{3:{iMdOn:0}}}],['コーラスあり+100%',{s:SW({swWidth:1}),mt:[],tm:{3:{iMdOn:1}}}],['コーラスあり+200%',{s:SW({swWidth:2}),mt:[],tm:{3:{iMdOn:1}}}]])},
 {h:'どこまで広げる?',b:'目安として、キックとベースは{g:kick.pan}、パッドなどは{g:pad.pan}。広げすぎず、モノでも崩れない範囲を探そう。100%、150%、200%を聞き比べて、MONO も確かめよう。',tab:'fx',
  cmp:ef('ef13s5',[['100%',{s:SW({swWidth:1}),mt:[]}],['150%',{s:SW({swWidth:1.5}),mt:[]}],['200%',{s:SW({swWidth:2}),mt:[]}]]),
  col:{h:'幅は「効かせる場所」を選ぶ',b:'曲全体を広げる前に、広げたい音(パッドやFX)を選ぶほうが、芯のある音になる。中央に置く音と、広げる音の対比が、ステレオの広がりを感じさせる。'}}
]}),
/* ---------------- ef14 ---------------- */
base({id:'ef14',pre:['ef08'],terms:['sweep','lfo','cutoff'],title:'フィルター系の使い方',sub:'DJ FILTERとAUTO FILTを曲の動きに',ts:2,save:{name:'フィルターの動き',kind:'kit'},
 init:{dlyMix:0,rvbMix:0,djOn:1,djFilter:0,afOn:0},
 tk:[KIK(),WM(BP8(),NS),HAT(),WM(HELD('パッド',PAD),NS)],steps:[
 {h:'DJ FILTER: 1つのつまみで',b:'DJ FILTER は、1つのつまみで、左は高域を削ってこもらせ(ローパス)、右は低域を削る(ハイパス)。中央で素通し。DJ FILTER をONにして、つまみを-60%にしよう。ビルドの前のこもった音になる。',tab:'fx',clr:'au',bars:4,f:[['djOn',1],['djFilter',-.6]],tol:.2,
  cmp:ef('ef14s1',[['素通し',{s:DJ({djFilter:0})}],['-70%(こもる)',{s:DJ({djFilter:-.7})}],['+60%(低音を抜く)',{s:DJ({djFilter:.6})}]])},
 {h:'ビルドで開く',b:'AUTOタブで MASTER の DJ FILTER のレーンを作ろう。先頭の-80%から、4小節かけて0%へ上げていく。こもった音が、だんだん開いて、サビ頭で全開になる。聞き比べて、開かないままの音との違いを確かめよう。',tab:'au',
  au:[{id:'djFilter',trk:'M',at:[[0,-.8,.15],[L4,0,.15]],mono:[[0,L4,'up']]}],ref:[TM('djFilter',[[0,-.8,'L'],[L4,0]])],
  cmp:[{l:'こもったまま',s:DJ({djFilter:-.8}),au:false},{l:'だんだん開く',s:DJ({djFilter:-.8}),ln:[TM('djFilter',[[0,-.8,'L'],[L4,0]])]}]},
 {h:'サビ前に低域を抜く',b:'逆に、右へ回して低域(ハイパス)を削ると、音が軽くなる。サビの前だけ、0%から+70%へ上げて、サビ頭で戻すと、そこで低音が戻ったときの迫力が増す。3小節目から4小節目の終わりに向けて、+70%へ上げよう。',tab:'au',
  au:[{id:'djFilter',trk:'M',at:[[0,0,.15],[1152,0,.15],[L4,.7,.15]]}],ref:[TM('djFilter',[[0,0,'L'],[1152,0],[L4,.7]])],
  cmp:[{l:'そのまま',s:DJ({djFilter:0}),au:false},{l:'低域を抜く',s:DJ({djFilter:0}),ln:[TM('djFilter',[[0,0,'L'],[1152,0],[L4,.7]])]}]},
 {h:'AUTO FILT: 一定の周期で動かす',b:'AUTO FILT(オートフィルター)は、フィルターのカットオフを、LFOで自動で動かす。DJ FILTER のON を切って、AUTO FILT をONにしよう。AF MODE=LFO、AF SYNC=SYNC、AF DIV=1/8、AF DEPTH=60%。リズムに合わせて音が開閉する。',tab:'fx',f:[['djOn',0],['afOn',1],['afMode',1],['afSync',1],['afDiv',5],['afDepth',.6]],tol:.1,
  cmp:ef('ef14s4',[['なし',{s:AF({afOn:0})}],['ゆっくり(1/1)',{s:AF({afDiv:0})}],['リズミカル(1/8)',{s:AF({afDiv:5})}]])},
 {h:'ENV: 音の大きさで動かす',b:'AF MODE を ENV にすると、LFOでなく、入力の音の大きさに反応して開閉する。音が大きいと開き、小さいと閉じる。キックやハットのたびに「ワウ」と動く。AF MODE を ENV にして、LFOと聴き比べよう。',tab:'fx',f:[['afOn',1],['afMode',2]],tol:.1,
  cmp:ef('ef14s5',[['LFO',{s:AF({afMode:1})}],['ENV',{s:AF({afMode:2})}]]),
  col:{h:'動かしすぎない',b:'フィルターの動きは、場面転換の合図として効く。ずっと動かし続けると、慣れて効かなくなる。ここぞという場面だけ動かし、あとは静かにしておくほうが、動きが生きる。大音量で長く聴かず、こまめに休もう。'}}
]}),
/* ---------------- ef15 ---------------- */
base({id:'ef15',pre:['ef10','ef08'],terms:['reverb','delay','fbk','reverse'],title:'空間系の飛び道具',sub:'逆リバーブ風・ゲートリバーブ風(近似)・無限リバーブ・ディレイの暴走と戻し',ts:3,save:{name:'空間系の飛び道具',kind:'kit'},
 init:{dlyMix:.4,dlySync:1,dlyDiv:4,dlyFb:.35,rvbMix:0,rvbType:2,rvbSize:2},
 tk:[KIK(),SNR({tDly:0,tRvb:1}),LEAD({tDly:1,tRvb:.5}),HAT()],steps:[
 {h:'逆リバーブ風(近似)',b:'逆リバーブは、響きが「音の前に」だんだん大きくなって、音の頭でぴたっと切れる効果。本物の逆再生(リバーブの尾まで逆再生)は rv02 で作れる。ここでは手軽な近似として、AUTOタブで MASTER の RVB MIX のレーンを作り、先頭の0%から、4小節目の頭に向けて80%まで、つなぎ方を「指数」で上げよう。',tab:'au',clr:'au',bars:4,
  au:[{id:'rvbMix',trk:'M',at:[[0,0,.1],[1440,.8,.15]],mono:[[0,1440,'up']]}],ref:[TM('rvbMix',[[0,0,'E'],[1440,.8],[1500,0]])],
  cmp:[{l:'響き無し',s:RV({rvbMix:0,rvbSize:3}),au:false},{l:'近似(スウェル)',s:RV({rvbMix:0,rvbSize:3}),ln:[TM('rvbMix',[[0,0,'E'],[1440,.8],[1500,0]])]}]},
 {h:'ゲートリバーブ風(近似)',b:'ゲートリバーブは、長い響きを、途中で急に切る効果で、スネアが力強く聞こえる。ここでは、SIZE を短くして、MIX を大きめにすることで近似する。RVB MIX を50%、RVB SIZE を0.7秒にして、スネア(T2)に送ろう。通常の長い響きと聴き比べよう。',tab:'fx',f:[['rvbMix',.5],['rvbSize',.7]],tol:.1,
  cmp:ef('ef15s2',[['通常の響き',{s:RV({rvbMix:.4,rvbSize:2.5,dlyMix:0}),tm:{2:{tRvb:1},3:{tRvb:0}}}],['ゲート風(近似)',{s:RV({rvbMix:.5,rvbSize:.7,rvbDamp:.3,dlyMix:0}),tm:{2:{tRvb:1},3:{tRvb:0}}}]])},
 {h:'無限リバーブ(近似)',b:'RVB SIZE を最大の5秒にして、DAMPを低め、MIXを大きめにすると、響きが長く溜まって、ほとんど終わらない空間になる。ブレイクで、響きだけを残す演出に使う。本物の「響きを止めて固定する」機能はないので、近似。SIZE を5秒にして聴こう。',tab:'fx',f:[['rvbSize',5],['rvbMix',.5]],tol:.1,
  cmp:ef('ef15s3',[['通常(1.5秒)',{s:RV({rvbMix:.4,rvbSize:1.5,dlyMix:0})}],['無限風(5秒)',{s:RV({rvbMix:.5,rvbSize:5,rvbDamp:.25,dlyMix:0})}]])},
 {h:'ディレイの暴走と戻し',b:'FEEDBACKを一気に上げると、繰り返しが減らずに積み重なって、音が渦のように膨れる(暴走)。そのまま止めずに、元の値へ戻せば、渦が静まって、ブレイクを盛り上げる効果になる。AUTOタブで MASTER の DLY FB のレーンを作り、3小節目の終わり近くで90%まで上げ、4小節目の頭で35%へ戻そう。音量に注意。',tab:'au',clr:'au',bars:4,
  au:[{id:'dlyFb',trk:'M',at:[[0,.35,.1],[1152,.35,.1],[1344,.9,.1],[L4,.35,.1]]}],ref:[TM('dlyFb',[[0,.35,'L'],[1152,.35],[1344,.9],[1440,.9],[L4,.35]])],
  cmp:[{l:'FB一定',s:DL({dlyDiv:4,dlyFb:.35}),au:false},{l:'暴走と戻し',s:DL({dlyDiv:4,dlyFb:.35}),ln:[TM('dlyFb',[[0,.35,'L'],[1152,.35],[1344,.9],[1440,.9],[L4,.35]])]}]},
 {h:'やりすぎと戻し方',b:'暴走や無限リバーブは、音量が膨れやすい。一瞬だけ使い、必ず元の値に戻す。戻しそびれると、そのまま鳴り続けて、聴き疲れや、スピーカーへの負担になる。ふだんの設定と、飛び道具を使った設定を、聞き比べよう。',tab:'fx',
  cmp:ef('ef15s5',[['ふだん',{s:DL({dlyDiv:4,dlyFb:.35,rvbMix:.2,rvbSize:1.5})}],['飛び道具(一瞬だけ)',{s:DL({dlyDiv:4,dlyFb:.8,rvbMix:.5,rvbSize:5})}]]),
  col:{h:'飛び道具は「一瞬」が決め手',b:'ブレイクや場面転換で一瞬だけ使うと、音が空間ごと変わったように聞こえる。ずっと使うと、ただの音のにごりになる。「入る前と入った後のコントラスト」を作る道具、と考えるとよい。大きな音で長く聴かず、こまめに休もう。'}}
]})
 );
})();
