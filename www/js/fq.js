/* v7.9a/b FQ 帯域設計(fq01〜fq13)。fq12 のみマスターEQ(F)を cmp.s で使う。fq13 は診断(問題を状態で定義し、聞き比べで原因を選び、直す。kind は 'recipe')。トラック別インサートのEQ4(T I M)で「残す所・整理する所・ローカット位置」を範囲目標で確かめる。
   聞き比べ cmp の tm=トラック別インサート(EQ4)とパンの値。g(音量補正dB)は tools/fq-cal.js(test/eqest.js の推定)が出す(test/fq.js が差1dB以内を検査)。
   mt の ovl(ぶつかり度)は学習用の指標。範囲は広めの目安で、耳が最終判断。数値は目安(SD.GUIDE の {g:} か、つまみ値と同じ数字のみ)。年号・人名・機材名は書かない */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags||['FQ']})};
 A('pocket','ポケット','ぽけっと','pocket','ほかの音(たとえば声)のために、あえて空けておく帯域のすきま。その帯域を少し下げて、居場所を作る。',['fq06'],['FQ']);
 A('compeq','補完EQ','ほかんいーきゅー','complementary EQ','2つの音がぶつかる帯域で、一方を少し上げ、もう一方を少し下げて、お互いの居場所を分ける使い方。',['fq01','fq03'],['FQ','EQ']);
 A('mainband','主帯域','しゅたいいき','main band','その音の「らしさ」を担う帯域。ここは残し、それ以外を整理するのが帯域設計の基本。目安は SD.GUIDE。曲や音色で変わる。',['fq01','fq02'],['FQ']);
 A('overlap','ぶつかり度','ぶつかりど','overlap index','2つの音が、同じ帯域を同時に使っている度合いを0〜100で表す、このアプリの指標。学習用の目安で、耳が最終判断。',['fq01','fq03','fq06'],['FQ']);
 var P=SD.PATS,TK=P.tk,bs=SD.bandStr;
 var GT={'fq01s11':-1.1,'fq01s12':0,'fq01s31':-0.9,'fq01s32':0,'fq01s41':0,'fq01s42':0,'fq01s51':-1,'fq01s52':0,'fq02s11':0,'fq02s12':-0.7,'fq02s13':0,'fq02s41':0,'fq02s42':-0.1,'fq02s61':0,'fq02s62':-3.9,'fq03s11':-0.1,'fq03s12':-0.6,'fq03s13':0,'fq03s51':-0.2,'fq03s52':0,'fq03s61':-1.5,'fq03s62':0,'fq04s11':0,'fq04s12':0,'fq04s13':-0.4,'fq04s41':0,'fq04s42':0,'fq04s61':0,'fq04s62':-0.3,'fq05s11':0,'fq05s12':0,'fq05s31':-0.1,'fq05s32':0,'fq05s41':0,'fq05s42':0,'fq05s51':0,'fq05s52':0,'fq06s11':-0.7,'fq06s12':0,'fq06s41':0,'fq06s42':0,'fq06s51':-0.7,'fq06s52':0,'fq07s11':-0.1,'fq07s12':-0.2,'fq07s13':0,'fq07s41':0,'fq07s42':0,'fq07s51':0,'fq07s52':0,'fq07s61':-0.2,'fq07s62':0,'fq08s11':-0.8,'fq08s12':0,'fq08s41':-0.8,'fq08s42':0,'fq08s71':-0.4,'fq08s72':0,'fq09s11':-0.9,'fq09s12':0,'fq09s51':-0.5,'fq09s52':0,'fq09s61':-4.5,'fq09s62':0,'fq10s11':-1.4,'fq10s12':0,'fq10s31':0,'fq10s32':0,'fq10s61':-0.2,'fq10s62':0,'fq11s11':-1,'fq11s12':0,'fq11s51':0,'fq11s52':0,'fq11s53':0,'fq12s11':-3.9,'fq12s12':0,'fq12s13':-1.1,'fq12s21':-1.5,'fq12s22':0,'fq12s31':0,'fq12s32':-0.4,'fq12s61':0,'fq12s62':-1.5,'fq13s11':0,'fq13s12':-0.6,'fq13s13':-0.6,'fq13s31':0,'fq13s32':-0.1,'fq13s33':-0.7,'fq13s51':0,'fq13s52':-0.7,'fq13s53':-0.7,'fq13s61':-1.8,'fq13s62':0};
 var cm=function(key,items){return items.map(function(it,i){var o=Object.assign({l:it[0]},it[1]);var g=GT[key+(i+1)];if(g!==undefined)o.g=g;return o})};
 var E=function(o){return Object.assign({iEqOn:1,iEqHpf:20,iEqLpf:20000,iEqLg:0,iEqB1g:0,iEqB2g:0,iEqHg:0},o||{})};
 var z=function(a){var q={};a.forEach(function(i){q[i]=0});return q};
 var all16=function(){var q={};for(var i=0;i<16;i++)q[i]=0;return q},sus=[1,2,3,4,5,6,7,9,10,11,12,13,14,15];
 var PAD={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:9000,res:0,envAmt:0,drive:0,aA:.01,aD:.2,aS:.9,aR:.15};
 var VOX=function(){return withE(TK('vo_a',{idx:{0:0,3:2,6:3,8:2,11:0,14:-2},o:{}},'声(代役)',{acc:[0,3,8]}),0)};
 var E0={eqOn:1,eqHpf:20,eqLpf:20000,eqLo:0,eqMid:0,eqMidF:1000,eqMidQ:1,eqHi:0},M=function(o){return Object.assign({},E0,o)};
 var BASS={o1Wave:'sawtooth',o1Lvl:.5,o2Lvl:0,subLvl:.3,noiseLvl:0,fType:'lowpass',cutoff:700,res:.1,envAmt:.3,drive:0,aA:.004,aD:.25,aS:.7,aR:.1};
 var LEADP={o1Wave:'sawtooth',o1Lvl:.38,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:5000,res:.1,envAmt:.2,drive:0,aA:.004,aD:.2,aS:.5,aR:.15};
 var HARSH=Object.assign({},LEADP,{cutoff:4000,res:.55});/* 4kHz付近にレゾナンスのピーク(fq07の「刺さり」) */
 var withE=function(t,o){var ex=t.o.mx&&t.o.mx.eq;t.o.mx=Object.assign({},t.o.mx||{},{eq:E(ex||o)});return t};
 var wq=function(t,o){t.o.mx={eq:E(o)};return t};
 var KIK=function(){return withE(TK('kick',P.fourFloor(),'キック'),0)};
 var SNR=function(){return withE(TK('snare',{idx:z([4,12]),o:{}},'スネア'),0)};
 var CLP=function(){return withE(TK('clap',{idx:z([4,12]),o:{}},'クラップ'),0)};
 var HAT=function(){return withE(TK('hat',{idx:z([2,6,10,14]),o:{}},'ハット',{acc:[2,6,10,14]}),0)};
 var OHT=function(){return withE(TK('ohat',{idx:z([2,10]),o:{}},'Oハット'),0)};
 var BAS=function(){return withE(TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12]}),0)};
 var held=function(name,p,o){return withE({id:'bass',idx:all16(),o:Object.assign({name:name,scale:'minor',tie:sus,p:p},o||{})},0)};
 var PADT=function(){return held('パッド',PAD,{tr:12})};
 var LEAD=function(name,p){return withE({id:'bass',idx:z([0,3,6,10,12]),o:{name:name||'リード',scale:'minor',tr:24,p:p||LEADP}},0)};
 var ARP=function(){return withE({id:'bass',idx:{0:0,2:2,4:4,6:2,8:4,10:7,12:4,14:2},o:{name:'アルペジオ',scale:'minor',tr:24,p:LEADP}},0)};
 var base=function(o){return Object.assign({cat:'fq1',synth:'analog',lv:2,course:'FQ',mode:'trk',tab:'trk',oct:-1,demo:{n:[33]},kind:'recipe'},o)};
 var qz=function(q,ans,ex){return {q:q,ans:ans,ex:ex}};
 var MX=function(trk,k,lo,hi){return {trk:trk,ins:'eq',k:k,rng:[lo,hi]}};
 var MXP=function(trk,lo,hi){return {trk:trk,ins:'mix',k:'tPan',rng:[lo,hi]}};
 var Gd=SD.GUIDE.roles,Gy=SD.GUIDE.dyn;
 SD.CATS.push({id:'fq1',synth:'analog',chapter:'course',course:'FQ',name:'FQ 帯域設計'});
 SD.LESSONS.push(
/* ---------------- fq01 ---------------- */
base({id:'fq01',pre:['eq05','eq08'],terms:['mask','hpf','compeq','mainband','low','lmid','overlap'],title:'引き算の考え方(居場所を作る)',sub:'全員が全帯域を使うと濁る',ts:5,save:{name:'居場所を分けたミックス',kind:'kit'},
 tk:[KIK(),BAS(),PADT(),LEAD(),HAT()],steps:[
 {h:'全員が全帯域を使うと',b:'キック・ベース・パッド・リード・ハット。どの音も低域から高域まで広く鳴らすと、同じ帯域を取り合って【マスキング】が起きる。濁って、どの音も聞き取りにくい。\\nまず、何も整理していない状態と、役割ごとに居場所を分けた状態を聞き比べよう。',tab:'mix',
  cmp:cm('fq01s1',[['全員そのまま',{tm:{1:E(),2:E(),3:E(),4:E(),5:E()}}],['居場所を分けた',{tm:{1:E({iEqB1f:350,iEqB1g:-2,iEqB1q:1}),2:E({iEqHpf:30,iEqB1f:300,iEqB1g:-2,iEqB1q:1}),3:E({iEqHpf:150}),4:E({iEqHpf:200}),5:E({iEqHpf:400})}}]]),
  quiz:qz('整理されて、すっきり聞こえるのは?',2,'2が正解。役割ごとに、使わない帯域を少し引いたので、各楽器の居場所ができた。1は全員が低域〜中域で重なり、濁りやすい。')},
 {h:'役割ごとの【主帯域】(残す所)',b:'音には「らしさ」を担う【主帯域】がある。キックは重さ({g:kick.keep0})とアタックの点({g:kick.keep1})。ベースは基音({g:bass.keep0})と輪郭({g:bass.keep1})。リードは{g:lead.keep0}。ハットは{g:hat.keep0}。\\nすべて目安で、曲や音色で変わる。まず「残す所」を決めて、それ以外を少し引く。これが帯域設計の基本の考え方。',tab:'mix'},
 {h:'低域の持ち主を決める',b:'低域({g:bass.keep0}のあたり)は、キックとベースが使う場所。パッド(T3)のLOW CUTを{g:pad.hpf}、リード(T4)のLOW CUTを{g:lead.hpf}にして、低域を空けよう。ローカットは、引き算でいちばん安全に効く。',tab:'mix',
  mx:[MX(3,'iEqHpf',100,200),MX(4,'iEqHpf',150,250)],
  cmp:cm('fq01s3',[['ローカット前',{tm:{3:E(),4:E()}}],['ローカット後',{tm:{3:E({iEqHpf:150}),4:E({iEqHpf:200})}}]])},
 {h:'ハットの低域はほぼ不要',b:'ハット(T5)のLOW CUTを{g:hat.hpf}にしよう。ハットの低域({g:hat.cut0})は、ほとんど聞こえないのに、ミックスの低域を濁らせる。',tab:'mix',
  mx:[MX(5,'iEqHpf',300,500)],cmp:cm('fq01s4',[['ハットのローカット無し',{tm:{5:E()}}],['ハットのローカットあり',{tm:{5:E({iEqHpf:400})}}]])},
 {h:'ぶつかり度で確かめる',b:'再生して、T3パッドとT2ベースの【ぶつかり度】を見よう。ローカットのあとは、2つが同時に出している帯域が減るので、ぶつかり度が下がる。数字は目安で、耳が最終判断。',tab:'mix',
  mt:[{trk:3,m:'ovl',vs:2,rng:[0,40],hold:2}],
  cmp:cm('fq01s5',[['整理前',{tm:{1:E(),2:E(),3:E(),4:E(),5:E()}}],['整理後',{tm:{1:E(),2:E({iEqHpf:30}),3:E({iEqHpf:150}),4:E({iEqHpf:200}),5:E({iEqHpf:400})}}]])},
 {h:'引き算は「居場所づくり」',b:'「レシピ保存」で、この5トラックのセットを保存できる。次の fq02 からは、楽器ごとに「残す所」と「整理する所」を詳しく見ていく。一方を上げ、もう一方を下げる【補完EQ】も、居場所づくりの1つ。',tab:'mix',
  col:{h:'削るのが目的ではない',b:'引き算は、削ること自体が目的ではなく、残したい音の居場所を作ること。削りすぎると、どの音もやせて、音楽としての厚みが無くなる。始めの目安は1〜3dB。迷ったら、削る前と後を音量をそろえて聞き比べよう。'}}
]}),
/* ---------------- fq02 ---------------- */
base({id:'fq02',pre:['fq01'],terms:['mainband','low','lmid','hmid','shelf','bell'],title:'キック',sub:'重さとアタックの点を残し、箱っぽさを整理',ts:3,save:{name:'整えたキック',kind:'kit'},
 tk:[KIK(),BAS(),PADT()],steps:[
 {h:'キックに必要な2つ',b:'キックの【主帯域】は2つ。重さ({g:kick.keep0})と、アタックの点({g:kick.keep1})。重さが足りないと軽く、点が足りないと埋もれる。聞き比べて、違いをつかもう。',tab:'mix',
  cmp:cm('fq02s1',[['原音',{tm:{1:E()}}],['重さを足す',{tm:{1:E({iEqLf:80,iEqLg:3})}}],['点を足す',{tm:{1:E({iEqB2f:3500,iEqB2g:3,iEqB2q:1})}}]])},
 {h:'重さを残す',b:'T1キックのLOW SHELFのFREQを{g:kick.keep0}に合わせ、GAINを{g:dyn.eqStart}だけ上げよう。シェルフは、その周波数より下をまとめて持ち上げる。',tab:'mix',
  mx:[MX(1,'iEqLf',50,100),MX(1,'iEqLg',1,3)]},
 {h:'アタックの点を出す',b:'BELL2のFREQを{g:kick.keep1}に置き、GAINを{g:dyn.eqStart}だけ上げよう。ビーターが当たる「点」が出て、小さなスピーカーでもキックの位置が分かりやすくなる。',tab:'mix',
  mx:[MX(1,'iEqB2f',2000,5000),MX(1,'iEqB2g',1,3)]},
 {h:'箱っぽさを整理する',b:'BELL1のFREQを{g:kick.cut0}に置き、GAINを{g:dyn.eqStart}だけ下げよう。この帯域は、キックが「ボンボン」と箱のように鳴る原因になりやすい。聞き比べて、すっきりしたほうを選ぼう。',tab:'mix',
  mx:[MX(1,'iEqB1f',250,500),MX(1,'iEqB1g',-3,-1)],
  cmp:cm('fq02s4',[['1',{tm:{1:E({iEqB1f:350,iEqB1g:-2,iEqB1q:1})}}],['2',{tm:{1:E()}}]]),quiz:qz('箱っぽさが減っているのは?',1,'1が正解。ローミッドを少し下げると、箱のような詰まりが減って、重さと点が聞き取りやすくなる。')},
 {h:'ローカットの位置',b:'LOW CUTを{g:kick.hpf}にしよう。人の耳にほとんど聞こえない超低域を切ると、ミックス全体の余裕(ヘッドルーム)が増える。切りすぎると重さが減るので、必要なときだけでよい。',tab:'mix',mx:[MX(1,'iEqHpf',25,40)]},
 {h:'やりすぎを聴く',b:'整理には限度がある。2つを聞き比べて、重さを持ち上げすぎているほうを選ぼう。',tab:'mix',
  cmp:cm('fq02s6',[['1',{tm:{1:E({iEqLf:80,iEqLg:3,iEqB1f:350,iEqB1g:-2,iEqB1q:1,iEqB2f:3500,iEqB2g:2,iEqB2q:1})}}],['2',{tm:{1:E({iEqLf:80,iEqLg:12,iEqB1f:350,iEqB1g:-2,iEqB1q:1,iEqB2f:3500,iEqB2g:2,iEqB2q:1})}}]]),
  quiz:qz('重さが出すぎているのは?',2,'2が正解。低域を大きく上げると、ベースやミックス全体の低域を圧迫する。始めの目安は1〜3dB。'),
  col:{h:'キックは「点」と「面」',b:'キックは、重さ(面)とアタック(点)でできている。小さなスピーカーでは低い重さが聞こえにくいので、点があると存在が分かる。逆にイヤホンや大きなスピーカーでは、重さがよく聞こえる。どちらでも成り立つ範囲を探そう。'}}
]}),
/* ---------------- fq03 ---------------- */
base({id:'fq03',pre:['fq02'],terms:['mainband','compeq','low','lmid','bell','overlap'],title:'ベース',sub:'基音と輪郭を残し、濁りを整理。キックとの住み分け',ts:3,save:{name:'住み分けたベース',kind:'kit'},
 tk:[KIK(),BAS(),PADT()],steps:[
 {h:'ベースに必要な2つ',b:'ベースの【主帯域】は、基音({g:bass.keep0})と輪郭({g:bass.keep1})。基音は低さと太さ、輪郭は音程の聞き取りやすさ。小さなスピーカーでは基音が聞こえにくいので、輪郭が頼りになる。聞き比べよう。',tab:'mix',
  cmp:cm('fq03s1',[['原音',{tm:{2:E()}}],['濁りを足す',{tm:{2:E({iEqB1f:300,iEqB1g:6,iEqB1q:1})}}],['濁りを整理',{tm:{2:E({iEqB1f:300,iEqB1g:-2,iEqB1q:1})}}]])},
 {h:'濁りを整理する',b:'T2ベースのBELL1のFREQを{g:bass.cut0}に置き、GAINを{g:dyn.eqStart}だけ下げよう。この帯域は、ベースとコード・パッドが重なって、もやもやしやすい。',tab:'mix',
  mx:[MX(2,'iEqB1f',200,400),MX(2,'iEqB1g',-3,-1)]},
 {h:'輪郭を出す',b:'BELL2のFREQを{g:bass.keep1}に置き、GAINを{g:dyn.eqStart}だけ上げよう。弦をはじく感じやアタックが出て、音程が聞き取りやすくなる。',tab:'mix',
  mx:[MX(2,'iEqB2f',700,1500),MX(2,'iEqB2g',1,3)]},
 {h:'ローカット',b:'LOW CUTを{g:bass.hpf}にしよう。ベースの基音より下の、ほとんど聞こえない帯域を整理して、キックのための余裕を残す。',tab:'mix',mx:[MX(2,'iEqHpf',25,40)]},
 {h:'キックとの住み分け',b:'キックとベースは、どちらも低域を使う。【補完EQ】の考え方で、片方を上げ、もう片方を下げて居場所を分ける。T1キックの箱っぽさ({g:kick.cut0})を{g:dyn.eqStart}だけ下げたら、再生してT2とT1の【ぶつかり度】を見よう。',tab:'mix',
  mx:[MX(1,'iEqB1f',250,500),MX(1,'iEqB1g',-3,-1)],mt:[{trk:2,m:'ovl',vs:1,rng:[0,45],hold:2}],
  cmp:cm('fq03s5',[['整理前',{tm:{1:E(),2:E()}}],['整理後',{tm:{1:E({iEqB1f:350,iEqB1g:-2,iEqB1q:1}),2:E({iEqHpf:30,iEqB1f:300,iEqB1g:-2,iEqB1q:1,iEqB2f:1000,iEqB2g:2,iEqB2q:1})}}]])},
 {h:'整理のしすぎ',b:'2つを聞き比べて、ベースが痩せすぎているほうを選ぼう。',tab:'mix',
  cmp:cm('fq03s6',[['1',{tm:{2:E({iEqHpf:30,iEqB1f:300,iEqB1g:-2,iEqB1q:1})}}],['2',{tm:{2:E({iEqHpf:200,iEqB1f:300,iEqB1g:-12,iEqB1q:1})}}]]),
  quiz:qz('痩せすぎているのは?',2,'2が正解。基音の帯域までローカットし、ローミッドも大きく削ると、ベースの太さが無くなる。'),
  col:{h:'低域は「席が少ない」',b:'低域は、少しの音量でもスピーカーを大きく動かす。そのため、たくさんの音が入れる場所ではない。キックとベースだけで十分に埋まるので、ほかの音には席を空けてもらう、という考え方がある。'}}
]}),
/* ---------------- fq04 ---------------- */
base({id:'fq04',pre:['fq02'],terms:['mainband','low','lmid','hmid','pres','shelf'],title:'スネア・クラップ',sub:'胴とスナップのバランス',ts:4,save:{name:'整えたスネアとクラップ',kind:'kit'},
 tk:[KIK(),SNR(),CLP(),HAT()],steps:[
 {h:'胴とスナップ',b:'スネア・クラップの【主帯域】は、胴({g:snare.keep0})とスナップ({g:snare.keep1})。胴は厚み、スナップは「パシッ」という存在感。バランスで、ぶ厚いスネアにも軽いスネアにもなる。聞き比べよう。',tab:'mix',
  cmp:cm('fq04s1',[['原音',{tm:{2:E()}}],['胴を足す',{tm:{2:E({iEqLf:200,iEqLg:3})}}],['スナップを足す',{tm:{2:E({iEqB2f:4500,iEqB2g:3,iEqB2q:1})}}]])},
 {h:'胴を出す',b:'T2スネアのLOW SHELFのFREQを{g:snare.keep0}に合わせ、GAINを{g:dyn.eqStart}だけ上げよう。キックより上の低域に、スネアの厚みが乗る。',tab:'mix',
  mx:[MX(2,'iEqLf',150,250),MX(2,'iEqLg',1,3)]},
 {h:'スナップを出す',b:'BELL2のFREQを{g:snare.keep1}に置き、GAINを{g:dyn.eqStart}だけ上げよう。ミックスの中でスネアが前に出る。',tab:'mix',
  mx:[MX(2,'iEqB2f',3000,6000),MX(2,'iEqB2g',1,3)]},
 {h:'箱っぽさを整理する',b:'BELL1のFREQを{g:snare.cut0}に置き、GAINを{g:dyn.eqStart}だけ下げよう。この帯域は、スネアが「ポコポコ」と箱のように鳴る原因になりやすい。',tab:'mix',
  mx:[MX(2,'iEqB1f',400,800),MX(2,'iEqB1g',-3,-1)],
  cmp:cm('fq04s4',[['1',{tm:{2:E()}}],['2',{tm:{2:E({iEqB1f:550,iEqB1g:-2,iEqB1q:1})}}]]),quiz:qz('ポコポコした箱っぽさが減っているのは?',2,'2が正解。400〜800Hzあたりを少し下げたので、胴の詰まりが減った。')},
 {h:'ローカット',b:'LOW CUTを{g:snare.hpf}にしよう。スネアの低域は、キックとベースの場所。ここを切ると、低域がすっきりする。',tab:'mix',mx:[MX(2,'iEqHpf',80,120)]},
 {h:'クラップにも同じ考え方',b:'T3クラップも、LOW CUTを{g:snare.hpf}にして、BELL2のFREQを{g:snare.keep1}に置こう。クラップは、スネアと重ねたり、スネアの代わりに使ったりする。左右の広がりは {g:snare.pan}。',tab:'mix',
  mx:[MX(3,'iEqHpf',80,120),MX(3,'iEqB2f',3000,6000)],
  cmp:cm('fq04s6',[['整理前',{tm:{2:E(),3:E()}}],['整理後',{tm:{2:E({iEqHpf:100,iEqB1f:550,iEqB1g:-2,iEqB1q:1}),3:E({iEqHpf:100,iEqB2f:4500,iEqB2g:2,iEqB2q:1})}}]]),
  col:{h:'スネアは「厚み」と「抜け」の綱引き',b:'胴を足すと厚くなるが、ミックスの中で埋もれやすい。スナップを足すと抜けるが、耳に痛くなりやすい。曲の速さや、ほかの音の量で、ちょうどよい所は変わる。大きな音で長く聴かず、こまめに休もう。'}}
]}),
/* ---------------- fq05 ---------------- */
base({id:'fq05',pre:['fq01'],terms:['mainband','air','hpf','shelf'],title:'ハット・高域の打楽器',sub:'ローカット量・耳障りの整理',ts:4,save:{name:'整えたハット',kind:'kit'},
 tk:[KIK(),BAS(),HAT(),OHT()],steps:[
 {h:'ハットが使う帯域',b:'ハットやシェイカーの【主帯域】は{g:hat.keep0}。きらめきやリズムの細かさを担う。一方、{g:hat.cut0}は、ほぼ不要。聞こえないのに、低域を濁らせる原因になる。ローカットの量を聞き比べよう。',tab:'mix',
  cmp:cm('fq05s1',[['ローカット無し',{tm:{3:E(),4:E()}}],['ローカットあり',{tm:{3:E({iEqHpf:400}),4:E({iEqHpf:400})}}]])},
 {h:'ローカット',b:'T3ハット・T4Oハットの、LOW CUTを{g:hat.hpf}にしよう。キックやベースの帯域には入らず、ハットの存在感はほとんど変わらない。',tab:'mix',
  mx:[MX(3,'iEqHpf',300,500),MX(4,'iEqHpf',300,500)]},
 {h:'耳障りな高域を整理する',b:'ハットが耳に痛いとき、HIGH SHELFで高域をまとめて下げる。T3ハットのHIGH SHELFのFREQを{g:hat.keep0}の中に置き、GAINを{g:dyn.eqStart}だけ下げよう。きらめきは残りつつ、きつさが減る。',tab:'mix',
  mx:[MX(3,'iEqHf',6000,12000),MX(3,'iEqHg',-3,-1)],
  cmp:cm('fq05s3',[['そのまま',{tm:{3:E({iEqHpf:400})}}],['高域を少し下げた',{tm:{3:E({iEqHpf:400,iEqHf:8000,iEqHg:-3})}}]])},
 {h:'やりすぎを聴く',b:'2つを聞き比べて、ローカットを上げすぎているほうを選ぼう。',tab:'mix',
  cmp:cm('fq05s4',[['1',{tm:{3:E({iEqHpf:400}),4:E({iEqHpf:400})}}],['2',{tm:{3:E({iEqHpf:3000}),4:E({iEqHpf:3000})}}]]),
  quiz:qz('ローカットが高すぎるのは?',2,'2が正解。ハットの本体に近い帯域まで切ると、薄く細い音になって、リズムの存在感が減る。')},
 {h:'左右に少し置く',b:'ハットの置き場所は{g:hat.pan}。T3ハットを右寄り(R10〜30%)、T4Oハットを左寄り(L10〜30%)に置こう。真ん中を空けて、キック・ベースの場所を守る。',tab:'mix',
  mx:[MXP(3,.1,.3),MXP(4,-.3,-.1)],
  cmp:cm('fq05s5',[['全部中央',{tm:{3:{tPan:0},4:{tPan:0}}}],['左右に少し',{tm:{3:{tPan:.2},4:{tPan:-.2}}}]])},
 {h:'小スピーカーでも確かめる',b:'MIXタブの「小スピーカー」モニターで聴こう。小さなスピーカーでは、低域がほぼ再生されないので、ハットの低域は聞こえない。でも、ヘッドホンや大きなスピーカーでは、低域を濁らせる。どちらでも成り立つよう、ローカットを入れておく。',tab:'mix',
  col:{h:'高域は耳が疲れやすい',b:'高域の整理は、聴き疲れを減らす効果もある。耳に痛い帯域は、小さい音量で聴いたほうが見つけやすい。長時間続けて聴かず、こまめに休もう。'}}
]}),
/* ---------------- fq06 ---------------- */
base({id:'fq06',pre:['fq01'],terms:['mainband','pocket','low','lmid','mid','hmid','air','overlap'],title:'コード・キーボード・パッド',sub:'ローカット・ローミッドの整理・声の場所を空ける',ts:4,save:{name:'場所を空けたパッド',kind:'kit'},
 tk:[KIK(),BAS(),PADT(),LEAD('メロディ(声の代わり)')],steps:[
 {h:'パッドの居場所',b:'コード・キーボード・パッドは、音域が広く、長く鳴るので、ほかの音とぶつかりやすい。【主帯域】は、ボディ({g:pad.keep0})と、空気感({g:pad.keep1})。ほかは整理して、ベースや声の場所を空ける。T4は、声の代わりのメロディ。',tab:'mix',
  cmp:cm('fq06s1',[['原音',{tm:{3:E()}}],['整理後',{tm:{3:E({iEqHpf:150,iEqB1f:350,iEqB1g:-2,iEqB1q:1,iEqB2f:2500,iEqB2g:-2,iEqB2q:1})}}]])},
 {h:'ローカット',b:'T3パッドのLOW CUTを{g:pad.hpf}にしよう。パッドの低域({g:pad.cut0})は、ベースと重なる帯域。切ると、ベースの輪郭がはっきりする。',tab:'mix',mx:[MX(3,'iEqHpf',100,200)]},
 {h:'ローミッドの整理',b:'T3パッドのBELL1のFREQを【ローミッド】('+bs('lmid')+')に置き、GAINを{g:dyn.eqStart}だけ下げよう。パッドが厚いと、この帯域がこもりやすい。',tab:'mix',
  mx:[MX(3,'iEqB1f',250,500),MX(3,'iEqB1g',-3,-1)]},
 {h:'声の場所を空ける',b:'メロディ(声の代わり)の帯域({g:pad.cut1})は、パッドが多いと埋もれる。T3パッドのBELL2のFREQを{g:pad.cut1}に置き、GAINを{g:dyn.eqStart}だけ下げて、【ポケット】を作ろう。',tab:'mix',
  mx:[MX(3,'iEqB2f',1000,4000),MX(3,'iEqB2g',-3,-1)],
  cmp:cm('fq06s4',[['空けない',{tm:{3:E({iEqHpf:150})}}],['空ける',{tm:{3:E({iEqHpf:150,iEqB2f:2500,iEqB2g:-3,iEqB2q:1})}}]])},
 {h:'ぶつかり度で確かめる',b:'再生して、T4メロディとT3パッドの【ぶつかり度】を見よう。パッドを整理すると、メロディと重なる帯域が減って、ぶつかり度が下がる。',tab:'mix',
  mt:[{trk:4,m:'ovl',vs:3,rng:[0,40],hold:2}],
  cmp:cm('fq06s5',[['整理前',{tm:{3:E()}}],['整理後',{tm:{3:E({iEqHpf:150,iEqB1f:350,iEqB1g:-2,iEqB1q:1,iEqB2f:2500,iEqB2g:-3,iEqB2q:1})}}]])},
 {h:'空気感は上に足す',b:'中域を引いたぶん、T3パッドのHIGH SHELFのFREQを{g:pad.keep1}の中に置き、GAINを{g:dyn.eqStart}だけ上げると、空気感が戻る。声の邪魔にならない高い所で、広がりを作る。',tab:'mix',
  mx:[MX(3,'iEqHf',4000,12000),MX(3,'iEqHg',1,3)],
  col:{h:'ポケットは「声の席」',b:'声が入る曲では、パッドやキーボードの中域を少し下げて、声の席を空けておく。声が無いときは、その席を埋めてもよい。曲の場面で変えるやり方もあるが、それは後のコースで扱う。'}}
]}),
/* ---------------- fq07 ---------------- */
base({id:'fq07',pre:['fq01','fq06'],terms:['mainband','hmid','pres','bell','q'],title:'リード・アルペジオ',sub:'抜けと刺さりの調整',ts:4,save:{name:'抜けと刺さりを整えたリード',kind:'kit'},
 tk:[KIK(),BAS(),LEAD('リード',HARSH),ARP()],steps:[
 {h:'リードが使う帯域',b:'リード・アルペジオの【主帯域】は{g:lead.keep0}。ここが出ていると「抜ける」。一方、同じ帯域の中の{g:lead.cut1}あたりは、出すぎると耳に痛い「刺さり」になる。聞き比べよう。',tab:'mix',
  cmp:cm('fq07s1',[['原音',{tm:{3:E()}}],['抜けを足す',{tm:{3:E({iEqB2f:2500,iEqB2g:3,iEqB2q:1})}}],['こもらせる',{tm:{3:E({iEqLpf:2000})}}]])},
 {h:'ローカット',b:'T3リード・T4アルペジオのLOW CUTを{g:lead.hpf}にしよう。リードの低域は、ベースやキックと重なるだけで、音のまとまりには効かない。',tab:'mix',
  mx:[MX(3,'iEqHpf',150,250),MX(4,'iEqHpf',150,250)]},
 {h:'抜けを出す',b:'T3リードのBELL2のFREQを{g:lead.keep0}に置き、GAINを{g:dyn.eqStart}だけ上げよう。ミックスの中で、リードが前に出る。',tab:'mix',
  mx:[MX(3,'iEqB2f',1000,4000),MX(3,'iEqB2g',1,3)]},
 {h:'刺さりを探して削る',b:'T3リードには、耳に痛い帯域がある。同じBELL2のQを大きく(狭く)して、FREQを動かして探そう。見つけたら、{g:lead.cut1}の範囲でGAINを{g:dyn.eqStart}だけ下げる。狭く削ると、ほかの音色を残しやすい。',tab:'mix',
  mx:[MX(3,'iEqB2f',3000,5000),MX(3,'iEqB2g',-3,-1),MX(3,'iEqB2q',2,6)],
  cmp:cm('fq07s4',[['刺さる',{tm:{3:E({iEqHpf:200})}}],['狭く削った',{tm:{3:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}]])},
 {h:'リードとアルペジオを分ける',b:'リードの置き場所は{g:lead.pan}。T3リードをほぼ中央(L15%〜R15%)、T4アルペジオを右寄り(R20〜60%)に置こう。同じ帯域を使う2つが、左右で別々に聞こえる。',tab:'mix',
  mx:[MXP(3,-.15,.15),MXP(4,.2,.6)],
  cmp:cm('fq07s5',[['どちらも中央',{tm:{3:{tPan:0},4:{tPan:0}}}],['分けた',{tm:{3:{tPan:0},4:{tPan:.4}}}]])},
 {h:'削りすぎを聴く',b:'2つを聞き比べて、刺さりを消しすぎて、リードがこもっているほうを選ぼう。',tab:'mix',
  cmp:cm('fq07s6',[['1',{tm:{3:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}],['2',{tm:{3:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-12,iEqB2q:.5})}}]]),
  quiz:qz('こもっているのは?',2,'2が正解。広い幅で大きく下げると、刺さりと一緒に抜けの帯域も消える。狭く浅く削るほうが、音色を残せる。'),
  col:{h:'刺さりは「音」より「耳」',b:'刺さりを感じる帯域は、人によって、スピーカーによって、少しずつ違う。ある環境で気持ちよく聞こえても、別の環境では耳に痛いことがある。複数の環境で、小さい音量で確かめよう。'}}
]}),
/* ---------------- fq08 ---------------- */
base({id:'fq08',pre:['fq06','fq07'],terms:['mainband','pocket','overlap','hpf','mid','hmid'],title:'声の帯域に道を空ける(ポケット)',sub:'声が居る帯域を、シンセ側で少しだけ空ける',ts:5,save:{name:'声の道を空けたミックス',kind:'kit'},
 tk:[KIK(),BAS(),PADT(),LEAD('リード',LEADP),VOX()],steps:[
 {h:'声は主役の帯域を持つ',b:'声(T5は代役の合成音)の【主帯域】は、太さ({g:vocal.keep0})・明瞭さ({g:vocal.keep1})・空気感({g:vocal.keep2})。このうち明瞭さの帯域は、パッドやリードも使うので、埋もれやすい。聞き比べよう。',tab:'mix',
  cmp:cm('fq08s1',[['道を空けない',{tm:{3:E(),4:E()}}],['道を空けた',{tm:{3:E({iEqHpf:150,iEqB2f:2500,iEqB2g:-3,iEqB2q:1}),4:E({iEqHpf:200,iEqB2f:3000,iEqB2g:-2,iEqB2q:1})}}]]),
  quiz:qz('声がよく聞こえるのは?',2,'2が正解。パッドとリードが声の帯域を少し空けたので、声が埋もれにくい。')},
 {h:'パッドの道を空ける',b:'T3パッドのBELL2のFREQを{g:pad.cut1}に置き、GAINを{g:dyn.eqStart}だけ下げよう。広いQ(1前後)で、なだらかに空ける。声が無いときは、空けなくてもよい。',tab:'mix',mx:[MX(3,'iEqB2f',1000,4000),MX(3,'iEqB2g',-3,-1)]},
 {h:'リードの道を空ける',b:'T4リードのBELL2のFREQを声の明瞭さ({g:vocal.keep1})に置き、GAINを{g:dyn.eqStart}だけ下げよう。リードは主役にもなるので、深く削らず、少しだけ。',tab:'mix',mx:[MX(4,'iEqB2f',2000,5000),MX(4,'iEqB2g',-3,-1)]},
 {h:'ぶつかり度で確かめる',b:'再生して、T5声と、ほかの全部のトラックの【ぶつかり度】を見よう。道を空けたぶん、声とほかの音が重なる帯域が減って、ぶつかり度が下がる。数字は目安で、耳が最終判断。',tab:'mix',
  mt:[{trk:5,m:'ovl',rng:[0,50],hold:2}],
  cmp:cm('fq08s4',[['空ける前',{tm:{3:E(),4:E()}}],['空けたあと',{tm:{3:E({iEqHpf:150,iEqB2f:2500,iEqB2g:-3,iEqB2q:1}),4:E({iEqHpf:200,iEqB2f:3000,iEqB2g:-2,iEqB2q:1})}}]])},
 {h:'声側の整理と置き場所',b:'声のLOW CUTを{g:vocal.hpf}にして、置き場所は{g:vocal.pan}(PAN)。声の低域はほかの音と重なりやすいので、まず整理する。',tab:'mix',
  mx:[MX(5,'iEqHpf',80,120),MXP(5,-.05,.05)]},
 {h:'声の太さを足す',b:'声のLOW SHELFのFREQを{g:vocal.keep0}に合わせ、GAINを{g:dyn.eqStart}だけ上げよう。ほかの音から削ったぶん、声に足すと、声が主役として前に出る。',tab:'mix',mx:[MX(5,'iEqLf',100,250),MX(5,'iEqLg',1,3)]},
 {h:'空けすぎを聴く',b:'2つを聞き比べて、空けすぎているほうを選ぼう。',tab:'mix',
  cmp:cm('fq08s7',[['1',{tm:{3:E({iEqHpf:150,iEqB2f:2500,iEqB2g:-3,iEqB2q:1})}}],['2',{tm:{3:E({iEqHpf:600,iEqB2f:2500,iEqB2g:-12,iEqB2q:.5})}}]]),
  quiz:qz('空けすぎているのは?',2,'2が正解。パッドの中域がごっそり無くなり、声が無くなったとき、スカスカになる。浅く広く空けるのが目安。'),
  col:{h:'声の席は「作る」もの',b:'声は、曲の中でいちばん耳が向かう音。そのぶん、ほかの音の中域を少し引いて、席を作っておく。どの音もほんの少し引くだけで、1つの音を深く削るより、自然に声が前に出る。'}}
]}),
/* ---------------- fq09 ---------------- */
base({id:'fq09',pre:['fq02','fq03','fq04','fq05','fq06','fq07'],terms:['mainband','hpf','low','lmid','overlap'],title:'低域の総点検',sub:'全トラックのローカット位置を決める',ts:6,save:{name:'低域を総点検したミックス',kind:'kit'},
 tk:[KIK(),BAS(),SNR(),PADT(),LEAD('リード',LEADP),HAT()],steps:[
 {h:'低域は渋滞しやすい',b:'6つの音を、ローカット無しで重ねると、使わない低域まで積み重なって、全体が濁る。ローカットを整理した状態と聞き比べよう。',tab:'mix',
  cmp:cm('fq09s1',[['全部ローカット無し',{tm:{1:E(),2:E(),3:E(),4:E(),5:E(),6:E()}}],['総点検後',{tm:{1:E({iEqHpf:30}),2:E({iEqHpf:30}),3:E({iEqHpf:100}),4:E({iEqHpf:150}),5:E({iEqHpf:200}),6:E({iEqHpf:400})}}]]),
  quiz:qz('低域がすっきりしているのは?',2,'2が正解。使わない低域を切ったので、キックとベースの場所が空いた。')},
 {h:'土台の2つ',b:'キック(T1)とベース(T2)のLOW CUTを、{g:kick.hpf}にしよう。土台の2つは、切りすぎない。切るのは、聞こえない超低域だけ。',tab:'mix',mx:[MX(1,'iEqHpf',25,40),MX(2,'iEqHpf',25,40)]},
 {h:'スネアとパッド',b:'スネア(T3)のLOW CUTを{g:snare.hpf}、パッド(T4)を{g:pad.hpf}にしよう。パッドは、ベースの基音({g:bass.keep0})と重なる低域を、しっかり空ける。',tab:'mix',mx:[MX(3,'iEqHpf',80,120),MX(4,'iEqHpf',100,200)]},
 {h:'リードとハット',b:'リード(T5)のLOW CUTを{g:lead.hpf}、ハット(T6)を{g:hat.hpf}にしよう。高い音の低域は、聞こえないのに、全体を濁らせる。',tab:'mix',mx:[MX(5,'iEqHpf',150,250),MX(6,'iEqHpf',300,500)]},
 {h:'ぶつかり度で確かめる',b:'再生して、T4パッドとT2ベースの【ぶつかり度】を見よう。点検後は、重なる帯域が減って、数字が下がる。',tab:'mix',
  mt:[{trk:4,m:'ovl',vs:2,rng:[0,35],hold:2}],
  cmp:cm('fq09s5',[['点検前',{tm:{2:E(),4:E()}}],['点検後',{tm:{2:E({iEqHpf:30}),4:E({iEqHpf:150})}}]])},
 {h:'切りすぎを聴く',b:'2つを聞き比べて、全部を高く切りすぎているほうを選ぼう。',tab:'mix',
  cmp:cm('fq09s6',[['1',{tm:{1:E({iEqHpf:30}),2:E({iEqHpf:30}),3:E({iEqHpf:100}),4:E({iEqHpf:150}),5:E({iEqHpf:200}),6:E({iEqHpf:400})}}],['2',{tm:{1:E({iEqHpf:150}),2:E({iEqHpf:200}),3:E({iEqHpf:400}),4:E({iEqHpf:600}),5:E({iEqHpf:800}),6:E({iEqHpf:1500})}}]]),
  quiz:qz('切りすぎているのは?',2,'2が正解。キックやベースの重さまで切ると、ミックスが細くなる。'),
  col:{h:'ローカットは「必要な所だけ」',b:'ローカットは、全部の音に同じ量を入れるものではない。音ごとに、残す帯域が違う。全トラックの位置を並べて見ると、低い音から高い音へ、階段のように上がっていくのが目安。'}}
]}),
/* ---------------- fq10 ---------------- */
base({id:'fq10',pre:['fq05','fq07'],terms:['mainband','air','pres','hmid','shelf','bell'],title:'高域の整理(シャリ・刺さり・空気感)',sub:'高域に何を残し、何を丸めるか',ts:5,save:{name:'高域を整えたミックス',kind:'kit'},
 tk:[KIK(),HAT(),OHT(),PADT(),LEAD('リード',HARSH)],steps:[
 {h:'高域の3つの悩み',b:'高域には、3つの顔がある。ハットの「シャリ」、リードの「刺さり」、パッドの「空気感」。シャリと刺さりは減らし、空気感は残す。整理前と整理後を聞き比べよう。',tab:'mix',
  cmp:cm('fq10s1',[['整理前',{tm:{2:E(),3:E(),4:E(),5:E()}}],['整理後',{tm:{2:E({iEqHpf:400,iEqHf:8000,iEqHg:-3}),3:E({iEqHpf:400,iEqHf:8000,iEqHg:-3}),4:E({iEqHpf:150,iEqHf:6000,iEqHg:2}),5:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}]])},
 {h:'シャリを整理する',b:'T2ハット・T3Oハットの、HIGH SHELFのFREQを{g:hat.keep0}の中に置き、GAINを{g:dyn.eqStart}だけ下げよう。きらめきは残り、耳へのきつさが減る。',tab:'mix',mx:[MX(2,'iEqHf',6000,12000),MX(2,'iEqHg',-3,-1),MX(3,'iEqHf',6000,12000),MX(3,'iEqHg',-3,-1)]},
 {h:'刺さりを削る',b:'T5リードのBELL2のQを大きくし、FREQを{g:lead.cut1}の中で動かして刺さりを探そう。見つけたら、GAINを{g:dyn.eqStart}だけ下げる。',tab:'mix',mx:[MX(5,'iEqB2f',3000,5000),MX(5,'iEqB2g',-3,-1),MX(5,'iEqB2q',2,6)],
  cmp:cm('fq10s3',[['刺さる',{tm:{5:E({iEqHpf:200})}}],['狭く削った',{tm:{5:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}]])},
 {h:'空気感を足す',b:'T4パッドのHIGH SHELFのFREQを{g:pad.keep1}の中に置き、GAINを{g:dyn.eqStart}だけ上げよう。シャリを減らしたぶん、パッドの高域で広がりを足す。',tab:'mix',mx:[MX(4,'iEqHf',4000,12000),MX(4,'iEqHg',1,3)]},
 {h:'ハイカットで丸める',b:'Oハット(T3)のHIGH CUTを12kHz〜18kHzの間にしよう。いちばん上の高域は、聞こえにくいのに、きつさだけを残すことがある。やわらかくなる。',tab:'mix',mx:[MX(3,'iEqLpf',12000,18000)]},
 {h:'やりすぎを聴く',b:'2つを聞き比べて、高域を丸めすぎているほうを選ぼう。',tab:'mix',
  cmp:cm('fq10s6',[['1',{tm:{2:E({iEqHpf:400,iEqHf:8000,iEqHg:-3}),4:E({iEqHpf:150,iEqHf:6000,iEqHg:2})}}],['2',{tm:{2:E({iEqHpf:400,iEqLpf:4000,iEqHf:8000,iEqHg:-12}),4:E({iEqHpf:150,iEqLpf:3000})}}]]),
  quiz:qz('丸めすぎているのは?',2,'2が正解。高域が無くなって、遠くでこもったように聞こえる。空気感まで消えてしまう。'),
  col:{h:'高域は少しで効く',b:'高域は、少しの量でも、音の印象を大きく変える。耳が疲れやすい帯域でもあるので、小さな音量で、休みながら調整しよう。やさしく整える、という考え方もある。'}}
]}),
/* ---------------- fq11 ---------------- */
base({id:'fq11',pre:['fq09','fq10'],terms:['mask','overlap','pocket','mainband'],title:'マスキングを見て直す',sub:'ぶつかり度を見ながら、取り合いを直す',ts:5,save:{name:'マスキングを直したミックス',kind:'kit'},
 tk:[KIK(),BAS(),PADT(),LEAD('リード',LEADP),HAT()],steps:[
 {h:'ぶつかり度の見方',b:'2つの音が同じ帯域を同時に使うと、【マスキング】が起きる。ミキサーの解析ビューの【ぶつかり度】は、それを0〜100の数字で見せる学習用の指標。数字が大きいほど、2つが重なっている。耳で聴いて、数字で確かめよう。',tab:'mix',
  cmp:cm('fq11s1',[['何も整理していない',{tm:{1:E(),2:E(),3:E(),4:E(),5:E()}}],['整理した',{tm:{1:E({iEqB1f:350,iEqB1g:-2,iEqB1q:1}),2:E({iEqHpf:30}),3:E({iEqHpf:150,iEqB2f:2500,iEqB2g:-3,iEqB2q:1}),4:E({iEqHpf:200}),5:E({iEqHpf:400})}}]])},
 {h:'ベースとパッド',b:'ベース(T2)とパッド(T3)は、低域で重なりやすい。パッドのLOW CUTを{g:pad.hpf}にして、再生しながらT3とT2のぶつかり度を見よう。',tab:'mix',mx:[MX(3,'iEqHpf',100,200)],mt:[{trk:3,m:'ovl',vs:2,rng:[0,35],hold:2}]},
 {h:'パッドとリード',b:'パッド(T3)とリード(T4)は、中域で重なりやすい。パッドのBELL2のFREQを{g:pad.cut1}に置き、GAINを{g:dyn.eqStart}だけ下げて、T4とT3のぶつかり度を見よう。',tab:'mix',mx:[MX(3,'iEqB2f',1000,4000),MX(3,'iEqB2g',-3,-1)],mt:[{trk:4,m:'ovl',vs:3,rng:[0,40],hold:2}]},
 {h:'キックとベース',b:'キック(T1)の箱っぽさ({g:kick.cut0})を{g:dyn.eqStart}だけ下げ、ベース(T2)のLOW CUTを{g:bass.hpf}にして、T2とT1のぶつかり度を見よう。',tab:'mix',mx:[MX(1,'iEqB1f',250,500),MX(1,'iEqB1g',-3,-1),MX(2,'iEqHpf',25,40)],mt:[{trk:2,m:'ovl',vs:1,rng:[0,45],hold:2}]},
 {h:'直し方を選ぶ',b:'重なりの直し方は、EQで引く以外にもある。PANで左右に分ける、音量で主役を決める、など。リードとパッドのぶつかりを、3つの直し方で聞き比べよう。',tab:'mix',
  cmp:cm('fq11s5',[['EQで引く',{tm:{3:E({iEqHpf:150,iEqB2f:2500,iEqB2g:-3,iEqB2q:1}),4:{tPan:0}}}],['PANで分ける',{tm:{3:E({iEqHpf:150}),4:{tPan:.5}}}],['何もしない',{tm:{3:E({iEqHpf:150}),4:{tPan:0}}}]]),
  quiz:qz('リードがいちばん中央に残りつつ、パッドと分かれるのは?',1,'1が正解。EQで、パッドの重なる帯域を引くと、リードは中央のまま聞こえる。PANで分ける方法は、リードが左右に偏る。どちらがよいかは曲しだい。'),
  col:{h:'数字は道しるべ',b:'ぶつかり度の数字が0になることが目的ではない。音楽には、重なって気持ちよい部分もある。数字は「どこを聴けばいいか」を教える道しるべで、決めるのは耳。'}}
]}),
/* ---------------- fq12 ---------------- */
base({id:'fq12',pre:['fq09','fq10'],terms:['eq','low','mid','air'],title:'全体の周波数バランス',sub:'ミックス全体のスペクトルの形を確かめる',ts:6,save:{name:'全体のバランスを見たミックス',kind:'kit'},
 tk:[KIK(),BAS(),SNR(),PADT(),LEAD('リード',LEADP),HAT()],steps:[
 {h:'スペクトルの形を見る',b:'ミックス全体のスペクトル(ミキサーの解析ビュー)を見ると、低域から高域への「形」が分かる。一般には、低域が高く、高域に向かってなだらかに下がる形が多い。ただし、曲のジャンルや音色で変わる。傾向のひとつとして見よう。まず、低域を増やした場合と、高域を増やした場合を聞き比べる。',tab:'mix',
  cmp:cm('fq12s1',[['低域が多い',{s:M({eqLo:6})}],['ふつう',{s:M()}],['高域が多い',{s:M({eqHi:6})}]]),
  quiz:qz('高域が多く、明るく聞こえるのは?',3,'3が正解。HIGHを上げたので、きらびやかに聞こえる。1は低域が多く、重く聞こえる。')},
 {h:'低域が多すぎるとき',b:'ミックス全体で、低域が重すぎるときは、マスターのEQのLOWを少し下げる。FXタブのEQをONにして、LOWを-3dBにしよう。',tab:'fx',f:[['eqOn',1],['eqLo',-3]],tol:.1,
  cmp:cm('fq12s2',[['LOW 0',{s:M()}],['LOW -3dB',{s:M({eqLo:-3})}]])},
 {h:'高域が足りないとき',b:'全体がこもって聞こえるときは、マスターのEQのHIGHを少し上げる。HIGHを+3dBにしよう。',tab:'fx',f:[['eqOn',1],['eqHi',3]],tol:.1,
  cmp:cm('fq12s3',[['HIGH 0',{s:M()}],['HIGH +3dB',{s:M({eqHi:3})}]])},
 {h:'帯域バーで見る',b:'MIXタブの解析ビューの帯域バーで、サブ・ロー・ローミッド・ミッド・ハイミッド・プレゼンス・エアの量を見よう。どこかだけが突き出ていないか、ざっと見る。ただし、数字や形が正解を決めるわけではない。',tab:'mix'},
 {h:'小スピーカーでも確かめる',b:'MIXタブの「小スピーカー」モニターで聴くと、低域がほとんど出ない。それでも、輪郭や中域で、各楽器が聞き取れるかを確かめる。ヘッドホンとは、全体の印象が変わる。',tab:'mix'},
 {h:'やりすぎを聴く',b:'2つを聞き比べて、全体のバランスを動かしすぎているほうを選ぼう。',tab:'fx',
  cmp:cm('fq12s6',[['1',{s:M({eqLo:-2,eqHi:2})}],['2',{s:M({eqLo:-10,eqHi:10})}]]),
  quiz:qz('動かしすぎているのは?',2,'2が正解。低域を大きく減らし、高域を大きく足すと、全体が細く、きつい音になる。マスターのEQは、始めの目安として、小さく。'),
  col:{h:'形は「傾向」',b:'スペクトルの形は、ミックスの健康診断のようなもの。ただし、ジャンルや、使っている音色で、正しい形が変わる。形は傾向としてだけ見て、最後は耳と、いくつかの環境で確かめよう。'}}
]}),
/* ---------------- fq13 ---------------- */
base({id:'fq13',pre:['fq11'],terms:['mainband','overlap','lmid','pres','low','hpf'],title:'聞き分けクイズ(どこが濁っている?)',sub:'原因の帯域を当てて直す',ts:3,save:{name:'診断して直したミックス',kind:'kit'},
 tk:[KIK(),withE(TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BASS,acc:[0,4,8,12]}),0),
  held('パッド',PAD,{tr:12,mx:{eq:E({iEqB1f:350,iEqB1g:6,iEqB1q:1})}}),wq(LEAD('リード',HARSH),{iEqB2f:4000,iEqB2g:6,iEqB2q:3})],steps:[
 {h:'3つの問題ミックス',b:'このミックスには、3つの問題が隠れている(こもり・刺さり・低域の濁り)。まず、問題を1つだけ残した3つのミックスを聞こう。それぞれ、どんな音かを覚える。',tab:'mix',
  cmp:cm('fq13s1',[['A',{tm:{2:E({iEqHpf:30}),3:E({iEqHpf:150,iEqB1f:350,iEqB1g:-2,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:6,iEqB2q:3})}}],['B',{tm:{2:E({iEqHpf:30}),3:E({iEqHpf:150,iEqB1f:350,iEqB1g:6,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}],['C',{tm:{2:E(),3:E({iEqHpf:20,iEqB1f:350,iEqB1g:-2,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}]]),
  quiz:qz('「こもり」が出ているのは?',2,'Bが正解。パッドのローミッドが持ち上がっていて、全体が詰まって聞こえる。Aは高域が刺さる、Cは低域が濁る。')},
 {h:'こもりを直す',b:'こもりの原因は、パッド(T3)のローミッド。BELL1のFREQを{g:bass.cut0}の近く(250〜500Hzの中)に置き、GAINを{g:dyn.eqStart}だけ下げて直そう。',tab:'mix',mx:[MX(3,'iEqB1f',250,500),MX(3,'iEqB1g',-3,-1)]},
 {h:'刺さりを当てる',b:'もう一度、問題を1つだけ残した3つを聞こう。「刺さり」が出ているのはどれ?',tab:'mix',
  cmp:cm('fq13s3',[['A',{tm:{2:E({iEqHpf:30}),3:E({iEqHpf:150,iEqB1f:350,iEqB1g:-2,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}],['B',{tm:{2:E({iEqHpf:30}),3:E({iEqHpf:150,iEqB1f:350,iEqB1g:-2,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:6,iEqB2q:3})}}],['C',{tm:{2:E(),3:E({iEqHpf:20,iEqB1f:350,iEqB1g:-2,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}]]),
  quiz:qz('「刺さり」が出ているのは?',2,'Bが正解。リードの{g:lead.cut1}あたりが持ち上がっていて、耳にきつい。')},
 {h:'刺さりを直す',b:'リード(T4)のBELL2のQを大きく(狭く)して、FREQを{g:lead.cut1}の中に置き、GAINを{g:dyn.eqStart}だけ下げて直そう。',tab:'mix',mx:[MX(4,'iEqB2f',3000,5000),MX(4,'iEqB2g',-3,-1),MX(4,'iEqB2q',2,6)]},
 {h:'低域の濁りを当てる',b:'最後の問題。「低域の濁り」が出ているのはどれ?',tab:'mix',
  cmp:cm('fq13s5',[['A',{tm:{2:E({iEqHpf:30}),3:E({iEqHpf:150,iEqB1f:350,iEqB1g:-2,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}],['B',{tm:{2:E(),3:E({iEqHpf:20,iEqB1f:350,iEqB1g:-2,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}],['C',{tm:{2:E({iEqHpf:30}),3:E({iEqHpf:150,iEqB1f:350,iEqB1g:6,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}]]),
  quiz:qz('「低域の濁り」が出ているのは?',2,'Bが正解。パッドの低域がローカットされず、ベースと重なって、低域がもやもやする。')},
 {h:'低域を直す',b:'パッド(T3)のLOW CUTを{g:pad.hpf}、ベース(T2)のLOW CUTを{g:bass.hpf}にして直そう。再生しながら、T3とT2のぶつかり度が下がるのを見る。',tab:'mix',mx:[MX(3,'iEqHpf',100,200),MX(2,'iEqHpf',25,40)],mt:[{trk:3,m:'ovl',vs:2,rng:[0,35],hold:2}],
  cmp:cm('fq13s6',[['直す前',{tm:{2:E(),3:E({iEqHpf:20,iEqB1f:350,iEqB1g:6,iEqB1q:1}),4:E({iEqHpf:20,iEqB2f:4000,iEqB2g:6,iEqB2q:3})}}],['全部直した',{tm:{2:E({iEqHpf:30}),3:E({iEqHpf:150,iEqB1f:350,iEqB1g:-2,iEqB1q:1}),4:E({iEqHpf:200,iEqB2f:4000,iEqB2g:-3,iEqB2q:4})}}]]),
  col:{h:'聞き分けは練習で伸びる',b:'「こもり」「刺さり」「濁り」を耳で聞き分けるのは、練習で上達する。まず、EQで大きく動かして違いを知り、それから小さく動かして、ちょうどよい所を探す。小さい音量で、こまめに休みながら続けよう。'}}
]})
 );
})();
