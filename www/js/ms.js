/* v7.13 MSコース(ms01〜ms07)。仕上げ・チェック。マスターFX(コンプ・EQ・ドライブ)とモニター(MONO・小スピーカー)で確かめる。
   5トラック(キック・ハット・ベース・コード・リード)+トラック別EQ。聞き比べ cmp の音量補正 g は未測定(マスター側の変化は node-web-audio-api で要測定)。
   数値は目安(SD.GUIDE の {g:} か、つまみ値と同じ数字のみ)。年号・人名・機材名は書かない */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags||['MS']})};
 A('glue','まとまり','まとまり','glue','バラバラの音が、ひとつの曲として聞こえること。マスターに軽いコンプを掛けると出やすい。',['ms01'],['MS']);
 A('monitorchk','モニター確認','もにたーかくにん','monitor check','モノ・小スピーカー・小音量など、いつもと違う聞こえ方で、ミックスが崩れないか確かめること。',['ms04','ms05','ms06'],['MS']);
 A('checklist','チェックリスト','ちぇっくりすと','checklist','仕上げに確認する項目を、順に並べた表。低域・濁り・刺さり・定位・奥行き・音量・クリップ。',['ms06'],['MS']);
 var P=SD.PATS,TK=P.tk,z=function(a){var q={};a.forEach(function(i){q[i]=0});return q},all16=function(){var q={};for(var i=0;i<16;i++)q[i]=0;return q},sus=[1,2,3,4,5,6,7,9,10,11,12,13,14,15];
 SD.CATS.push({id:'ms1',synth:'analog',chapter:'course',course:'MS',name:'MS 仕上げ・チェック'});
 var E=function(o){return Object.assign({iEqOn:1,iEqHpf:20,iEqLpf:20000,iEqLf:200,iEqLg:0,iEqB1f:250,iEqB1g:0,iEqB1q:1,iEqB2f:2500,iEqB2g:0,iEqB2q:1,iEqHf:4000,iEqHg:0},o||{})};
 var BASS={o1Wave:'sawtooth',o1Lvl:.33,o2Lvl:0,subLvl:.2,noiseLvl:0,fType:'lowpass',cutoff:700,res:.1,envAmt:.3,drive:0,aA:.004,aD:.25,aS:.7,aR:.1};
 var PAD={o1Wave:'sawtooth',o1Lvl:.26,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:9000,res:0,envAmt:0,drive:0,aA:.01,aD:.2,aS:.9,aR:.15};
 var LEADP={o1Wave:'sawtooth',o1Lvl:.32,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:5000,res:.1,envAmt:.2,drive:0,aA:.004,aD:.2,aS:.5,aR:.15};
 /* 行: [tVol,tPan,tRvb,iEqHpf,iEqHg]。トラック順 1キック 2ハット 3ベース 4コード 5リード */
 var K=['tVol','tPan','tRvb','iEqHpf','iEqHg'];
 var rows=function(R){var o={};R.forEach(function(r,i){var m={};K.forEach(function(k,j){m[k]=r[j]});o[i+1]=m});return o};
 var FIN=[[.9,0,0,30,0],[.4,.2,.1,400,1],[.7,0,0,30,0],[.4,.3,.25,150,0],[.5,-.2,.25,200,0]];/* 整ったミックス */
 var TRK=function(R,over){R=R||FIN;var M=rows(R),o=over||{};var mm=function(k){return Object.assign({},M[k+1],o[k+1]||{})};
  var w=function(t,mx,k,cp){t.o.mx=mx;t.o.mix=mm(k);return t};
  return[w(TK('kick',P.fourFloor(),'キック'),{eq:E()},0),w(TK('hat',{idx:z([2,6,10,14]),o:{}},'ハット',{acc:[2,6,10,14]}),{eq:E()},1),
   w(TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12]}),{eq:E()},2),
   w({id:'bass',idx:all16(),o:{name:'コード',scale:'minor',tie:sus,p:PAD,tr:12}},{eq:E()},3),
   w({id:'bass',idx:z([0,3,6,10,12]),o:{name:'リード',scale:'minor',tr:24,p:LEADP}},{eq:E()},4)]};
 var tm=function(R,over){var M=rows(R||FIN),o=over||{},r={};for(var k in M)r[k]=Object.assign({},M[k],o[k]||{});return r};
 var MM=function(trk,k,lo,hi){return {trk:trk,ins:'mix',k:k,rng:[lo,hi]}},MX=function(trk,k,lo,hi){return {trk:trk,ins:'eq',k:k,rng:[lo,hi]}};
 var qz=function(q,ans,ex){return {q:q,ans:ans,ex:ex}};
 var RVm=function(o){return Object.assign({rvbMix:.2,rvbType:3,rvbSize:1.8,rvbPre:30,rvbDamp:.5,dlyMix:0,swOn:0,cpOn:0},o)};
 var base=function(o){return Object.assign({cat:'ms1',synth:'analog',lv:2,course:'MS',mode:'trk',tab:'trk',oct:-1,demo:{n:[33]},kind:'recipe',ts:1,init:RVm({})},o)};
 var COL=function(b){return {h:'まとめ',b:b+'小さめの音量で、こまめに休もう。'}};
 /* 問題つきミックス: 広がりすぎ・刺さり・濁り・低域の重なり */
 var BAD=[[.9,0,0,30,0],[.5,.8,.2,400,6],[.7,0,0,30,0],[.5,.8,.6,20,0],[.5,-.8,.6,200,0]];
 SD.MS_BAD=BAD;SD.MS_FIN=FIN;
 SD.LESSONS.push(
base({id:'ms01',pre:['cm05'],terms:['glue','comp','gr'],title:'マスターのコンプ(まとめ役)',sub:'軽い圧縮で「まとまり」を出す',save:{name:'マスターの軽いコンプ',kind:'kit'},tk:TRK(),steps:[
 {h:'マスターに軽く掛ける',b:'マスターのコンプは、全体に軽く掛けて、バラバラの音を【まとまり】のある1つの音にまとめる役。強く掛けるのではなく、GRが{g:dyn.grMaster}ほどの軽い圧縮が目安(曲や音色で変わる)。コンプなしと、軽く掛けたものを聞き比べよう。',tab:'fx',
  cmp:[{l:'コンプなし',s:{cpOn:0}},{l:'軽いコンプ',s:{cpOn:1,cpThr:-18,cpRatio:2,cpAtk:30,cpRel:200,cpMake:2}}],
  quiz:qz('まとまりが出ているのは?',2,'2が正解(違いは小さいので、よく聴く)。ピークが揃い、全体がひとつの塊に聞こえる。')},
 {h:'THRESHとRATIO',b:'FXタブのCOMPをONにして、THRESHを-18dBに、RATIOを2にしよう。低いRATIOで、浅く掛ける。',tab:'fx',f:[['cpOn',1],['cpThr',-18],['cpRatio',2]]},
 {h:'ATTACKとRELEASE',b:'ATTACKを30ms、RELEASEを200msにしよう。ATTACKが遅いと、アタックの勢いが残り、RELEASEが適度だと、自然に戻る。',tab:'fx',f:[['cpAtk',30],['cpRel',200]]},
 {h:'MAKEUPで音量を戻す',b:'圧縮で下がった音量を、MAKEUPを2dBにして戻そう。音量が上がると良く聞こえるので、掛ける前と後は、音量をそろえて聞き比べる。',tab:'fx',f:[['cpMake',2]]},
 {h:'掛けすぎ',b:'THRESHを-40dBに、RATIOを8にして、掛けすぎた状態を聴こう。平らになり、息をするように揺れやすい。軽い設定と聞き比べよう。',tab:'fx',
  cmp:[{l:'軽い',s:{cpOn:1,cpThr:-18,cpRatio:2,cpAtk:30,cpRel:200,cpMake:2}},{l:'掛けすぎ',s:{cpOn:1,cpThr:-40,cpRatio:8,cpAtk:30,cpRel:200,cpMake:2}}],
  col:COL('マスターのコンプは、「掛けた感じがしない」くらいが良い、という考え方もある。迷ったら、浅く掛けて、ON/OFFで比べよう。')}
 ]}),
base({id:'ms02',pre:['eq08'],terms:['eq','shelf','q'],title:'マスターEQ(最後の微調整)',sub:'広いQ・小さい変化だけ',save:{name:'マスターEQの微調整',kind:'kit'},tk:TRK(),steps:[
 {h:'最後は、小さく',b:'マスターのEQは、全体の最後の微調整。1〜2dBほどの小さな変化と、広いQだけにとどめる。大きく動かすなら、トラックに戻る、という考え方もある。EQなしと、高域を少し足したものを聞き比べよう。',tab:'fx',
  cmp:[{l:'EQなし',s:{eqOn:0}},{l:'高域+1.5dB',s:{eqOn:1,eqHi:1.5}}],
  quiz:qz('明るく聞こえるのは?',2,'2が正解。高域の棚を足したので、全体が少し明るい。')},
 {h:'高域を少し',b:'FXタブのEQをONにして、HIGHを1.5dBにしよう。',tab:'fx',f:[['eqOn',1],['eqHi',1.5]]},
 {h:'低域を少し',b:'LOWを1dBにしよう。足りない重さを、わずかに補う。',tab:'fx',f:[['eqLo',1]]},
 {h:'広いQで中域を引く',b:'MIDを-1dBにして、MID Qを0.5にしよう。Qが小さいと広い帯域がなだらかに動く。',tab:'fx',f:[['eqMid',-1],['eqMidQ',.5]]},
 {h:'やりすぎ',b:'HIGHを9dB、LOWを9dBにした状態と、小さい変化を聞き比べよう。大きく動かすと、ほかの音のバランスまで変わる。',tab:'fx',
  cmp:[{l:'小さい変化',s:{eqOn:1,eqLo:1,eqHi:1.5}},{l:'やりすぎ',s:{eqOn:1,eqLo:9,eqHi:9}}],
  col:COL('マスターEQで直したくなったら、まずトラックのバランスを見直す。最後の微調整は、少しで十分、という考え方もある。')}
 ]}),
base({id:'ms03',pre:['cm05'],terms:['limiter','clip'],title:'リミッターと音圧',sub:'上げすぎの弊害。クリップ・ポンピング・細く聞こえる',save:{name:'音圧の上げすぎチェック',kind:'kit'},tk:TRK(),steps:[
 {h:'音圧を上げるとは',b:'曲全体の平均の大きさを上げることを、「音圧を上げる」と呼ぶ。マスターのコンプで山を抑えてMAKEUPで持ち上げると、同じピークでも大きく聞こえる。ただし、上げすぎると弊害が出る。ふつうと、上げすぎを聞き比べよう。',tab:'fx',
  cmp:[{l:'ふつう',s:{cpOn:1,cpThr:-18,cpRatio:2,cpAtk:30,cpRel:200,cpMake:2}},{l:'上げすぎ',s:{cpOn:1,cpThr:-40,cpRatio:20,cpAtk:1,cpRel:50,cpMake:14}}],
  quiz:qz('平らで、窮屈に聞こえるのは?',2,'2が正解。山がつぶされ、抑揚が減っている。')},
 {h:'上げすぎる',b:'THRESHを-40dBに、RATIOを20に、MAKEUPを14dBにして、わざと上げすぎてみよう。音が前に出て、窮屈になる。',tab:'fx',f:[['cpOn',1],['cpThr',-40],['cpRatio',20],['cpMake',14]]},
 {h:'ひずみ(クリップ)',b:'さらに、DRIVEを80%にしよう。上限を超えた山が切られて、ひずむ。これが【クリップ】。',tab:'fx',f:[['drive',.8]],
  cmp:[{l:'DRIVE 0%',s:{drive:0}},{l:'DRIVE 80%',s:{drive:.8}}]},
 {h:'ポンピング',b:'RELEASEを50msにすると、大きい音(キック)のあとで全体が持ち上がり、息をするように揺れやすい。聴いて確かめよう。',tab:'fx',f:[['cpRel',50]]},
 {h:'ふつうに戻す',b:'THRESHを-18dB、RATIOを2、MAKEUPを2dB、DRIVEを0に戻そう。大きさは、小さめでも、十分に聞こえる。',tab:'fx',f:[['cpThr',-18],['cpRatio',2],['cpMake',2],['drive',0]],
  col:COL('大きい音を良い音と感じる錯覚があるので、音量をそろえて比べることが大切。【リミッター】は最後の番人で、音圧を上げる道具というより、山を守る道具、という考え方もある。')}
 ]}),
base({id:'ms04',pre:['mx05'],terms:['monitorchk','phase'],title:'モノ・小スピーカー・ヘッドホンで確認',sub:'モニター機能で聞こえ方を確かめる',save:{name:'モノで崩れないミックス',kind:'kit'},tk:TRK(BAD),steps:[
 {h:'いつもと違う聞こえ方',b:'スマホの小さなスピーカーや、片耳のイヤホンなど、リスナーの環境はさまざま。MIXタブのモニター(MONO・小スピーカー)で、【モニター確認】をしよう。モニターは確かめたら必ずOFFに戻す(起動時はOFF)。今のミックスは、いくつか問題を含んでいる。',tab:'mix',
  cmp:[{l:'今のミックス',tm:tm(BAD)},{l:'整ったミックス',tm:tm(FIN)}],
  quiz:qz('整っているのは?',2,'2が正解。1は、コードとリードが左右に広がりすぎ、リバーブも多い。')},
 {h:'モノで確かめる',b:'MONOをONにして、今のミックスを聴こう。左右の広がりが消えて、コードとリードが薄くなったり、位置関係が崩れたりしないか。確かめたらMONOはOFFに戻す。',tab:'mix',
  cmp:[{l:'今のミックス',tm:tm(BAD)},{l:'整ったミックス',tm:tm(FIN)}]},
 {h:'広がりを直す',b:'コード(T4)のPANを0.2〜0.4に、リード(T5)のPANを-0.3〜-0.1にしよう。広げすぎを抑えると、モノでも崩れにくい。',tab:'mix',
  mx:[MM(4,'tPan',.2,.4),MM(5,'tPan',-.3,-.1)]},
 {h:'小スピーカーで確かめる',b:'小スピーカーのモニターをONにして、ベースとキックが聞こえにくくなるのを確かめよう。低い音は、小さなスピーカーでは出にくい。それでも、倍音(高い成分)でベースの存在が伝わるか確かめる。',tab:'mix',
  cmp:[{l:'ベースあり',tm:tm(FIN)},{l:'ベースなし',tm:tm(FIN,{3:{tVol:0}})}],
  quiz:qz('ベースがいないのは?',2,'2が正解。ただし、小スピーカーでは、ベースありでも、音の差が小さく感じやすい。')},
 {h:'音量の余裕',b:'MASTER のPEAKが-9〜-3dBに収まっているか確かめよう。',tab:'mix',mt:[{trk:'M',m:'peak',rng:[-9,-3],hold:2}],
  col:COL('いつもと違う環境で確かめると、思わぬ問題が見つかる。ヘッドホンでは、左右が極端に分かれて聞こえやすい。どの環境でも、極端に崩れないのが目安。')}
 ]}),
base({id:'ms05',pre:['ms04'],terms:['monitorchk'],title:'小さい音量で確認・耳を休ませる',sub:'小音量でもバランスが保てるか',save:{name:'小音量でも保つミックス',kind:'kit'},tk:TRK([[.9,0,0,30,0],[.2,.2,.1,400,1],[.5,0,0,30,0],[.4,.3,.25,150,0],[.5,-.2,.25,200,0]]),steps:[
 {h:'小さい音量でも聞こえるか',b:'音量を下げると、低い音と高い音が聞こえにくくなる(耳の特性)。小さい音量で、ベースやハットが消えないか確かめよう。大きい音量だけで作ると、小さい音量では崩れやすい。',tab:'mix',
  cmp:[{l:'ベース小さめ',tm:tm(FIN,{3:{tVol:.5}})},{l:'ベース整った',tm:tm(FIN)}],
  quiz:qz('小さい音量でも、低域が保たれやすいのは?',2,'2が正解。ベースが小さめだと、小音量で消えやすい。')},
 {h:'マスター音量を下げる',b:'MASTER VOLUMEを30%にして、小さい音量で聴こう。',tab:'fx',f:[['master',.3]]},
 {h:'ベースを整える',b:'ベース(T3)のVOLを0.65〜0.8にしよう。小さい音量でも、低域が聞こえる。',tab:'mix',mx:[MM(3,'tVol',.65,.8)]},
 {h:'ハットを整える',b:'ハット(T2)のVOLを0.35〜0.45にしよう。高域が消えず、でも出すぎない。',tab:'mix',mx:[MM(2,'tVol',.35,.45)]},
 {h:'耳を休ませる',b:'長く、大きい音で聴くと、耳が疲れて判断が鈍る。こまめに休み、休んだあとに、小さい音量で確かめ直そう。',tab:'mix',
  col:COL('音量の数値の基準は、人や環境で変わるので、ここでは示さない。疲れたと感じる前に、休もう。')}
 ]}),
base({id:'ms06',pre:['ms04','fq01'],terms:['checklist','monitorchk','hpf'],title:'仕上げチェックリスト',sub:'低域・濁り・刺さり・定位・奥行き・音量・クリップを順に',save:{name:'仕上げチェック済みミックス',kind:'kit'},tk:TRK(BAD),steps:[
 {h:'順番に確認',b:'仕上げは、【チェックリスト】で順に見る。低域→濁り→刺さり→定位→奥行き→音量→クリップ。今のミックスには、問題が入っている。整ったミックスと聞き比べてから始めよう。',tab:'mix',
  cmp:[{l:'今のミックス',tm:tm(BAD)},{l:'整ったミックス',tm:tm(FIN)}],
  quiz:qz('整っているのは?',2,'2が正解。1は、低域が重なり、高域が刺さり、広がりすぎている。')},
 {h:'低域',b:'コード(T4)のLOW CUTを{g:pad.hpf}に上げよう。ベースとキックのために、低域を空ける。',tab:'mix',mx:[MX(4,'iEqHpf',100,200)]},
 {h:'濁り',b:'コード(T4)の250Hz付近(BELL1)のGAINを{g:dyn.eqStart}だけ下げよう。こもりが取れる。',tab:'mix',mx:[MX(4,'iEqB1g',-3,-1)]},
 {h:'刺さり',b:'ハット(T2)のHIGH SHELFを0〜2dBに戻そう。高域の出すぎを抑える。',tab:'mix',mx:[MX(2,'iEqHg',0,2)]},
 {h:'定位と奥行き',b:'コード(T4)のPANを0.2〜0.4に、RVB SENDを0.2〜0.3にしよう。リード(T5)のPANを-0.3〜-0.1に、RVB SENDを0.2〜0.3にしよう。',tab:'mix',
  mx:[MM(4,'tPan',.2,.4),MM(4,'tRvb',.2,.3),MM(5,'tPan',-.3,-.1),MM(5,'tRvb',.2,.3)]},
 {h:'音量とクリップ',b:'MASTER のPEAKが-9〜-3dBに収まっているか確かめよう。収まっていれば、クリップの心配は小さい。最後に、MONOと小スピーカーで確かめて、OFFに戻す。',tab:'mix',mt:[{trk:'M',m:'peak',rng:[-9,-3],hold:2}],
  col:COL('チェックリストは、毎回同じ順で見ると、見落としが減る。順番に決まりはないが、低域から高域へ、全体から細部へ、という考え方もある。')}
 ]}),
base({id:'ms07',kind:'read',pre:['ms06'],terms:['monitorchk'],title:'書き出し前に(アプリの外の話)',sub:'DAWへ持ち出すときの考え方',save:{name:'書き出し前のメモ',kind:'kit'},tk:TRK(),steps:[
 {h:'このアプリでできないこと',b:'このアプリは、WAVの書き出しを行わない。ここでの経験は、本物のDAWで曲を仕上げるときの考え方として持ち出す。',tab:'mix'},
 {h:'ヘッドルームを残す',b:'マスターのピークに余裕を残して、仕上げ(マスタリング)へ渡す考え方がある。余裕の量は、環境で変わるので、ここでは数値を示さない。',tab:'mix',
  cmp:[{l:'整ったミックス',tm:tm(FIN)},{l:'少し小さめ',tm:tm(FIN,{1:{tVol:.7}})}]},
 {h:'確認の順',b:'書き出す前に、モノ・小スピーカー・小音量で確かめ、問題がなければ、書き出す。書き出したあとも、別の環境で聴き直す。',tab:'mix'},
 {h:'聴き直す',b:'時間を置いて、耳を休めてから、もう一度聴くと、気づく点が多い。',tab:'mix',
  col:COL('書き出しの形式や設定は、使う道具や目的で変わるので、各ソフトの説明を確認しよう。')}
 ]})
 );
})();
