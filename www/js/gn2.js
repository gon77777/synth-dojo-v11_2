/* v5.10 GN-2 ジャンル(海外・ダンス以外)(gn10〜gn15)。ジャンルの一般的な特徴(テンポ・リズム・音色・展開)だけを扱う。
   特定の曲・アーティスト・作品は再現しない。年号・人名・曲名・機種名は書かない。起源の断定もしない。
   TRKレシピ(6本以内)。聴き比べはトラックのミュート切替(cmp.mt)。tk の o.cd=和音・o.tie=のばし・o.mix=ミキサー値 */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags})};
 A('gatedverb','ゲートリバーブ','げーとりばーぶ','gated reverb','リバーブの余韻を途中で急に切り落とした、太く短い残響。スネアなどに使う。',['gn10'],['空間']);
 A('lofi','ローファイ','ろーふぁい','lo-fi','わざと音をこもらせ、ノイズや揺らぎを残した、粗い質感のこと。',['gn11'],['質感']);
 A('chip','チップチューン','ちっぷちゅーん','chiptune','矩形波・三角波・ノイズなどの少ない音で作る、ゲーム機のような音楽。',['gn12'],['音色']);
 A('pulse','パルス波','ぱるすは','pulse wave','矩形波の仲間。波の上の幅(デューティ)で音色が変わる。',['gn12'],['波形']);
 A('ambient','アンビエント','あんびえんと','ambient','拍を前に出さず、長い音と空間で雰囲気を作る音楽の作り方。',['gn13'],['構成']);
 A('drone','ドローン','どろーん','drone','同じ高さの音を長く鳴らし続けること。音楽の下地になる。',['gn13','gn14'],['音色']);
 A('cinematic','シネマティック','しねまてぃっく','cinematic','映画のように、低音の持続・広がる響き・大きな一撃で場面を作る音づくり。',['gn14'],['音色']);
 A('softpad','柔らかいパッド','やわらかいぱっど','soft pad','アタックが遅く、高域を抑えた、輪郭のぼやけたパッド。',['gn15'],['音色']);
 SD.CATS.push({id:'gn2',synth:'analog',chapter:'course',course:'GN',name:'GN ジャンル(海外・ダンス以外)'});
 var P=SD.PATS,TK=P.tk,z=function(a,r){var q={};a.forEach(function(i){q[i]=r||0});return q};
 var Z=function(a){return {idx:z(a),o:{}}};
 var all16=function(){var q={};for(var i=0;i<16;i++)q[i]=0;return q},ALL=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
 var G=function(o){return Object.assign({cat:'gn2',synth:'analog',lv:2,course:'GN',kind:'recipe',mode:'trk',tab:'trk',ts:0,oct:-1},o)};
 var KP={o1Lvl:.45},DK=SD.scMix({src:0,depth:.8,key:-20});/* v8.3: 本物のサイドチェイン(COMPのSC SRC=T1) */
 /* 音色 */
 var BS={o1Wave:'sawtooth',o1Lvl:.4,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:900,res:.1,envAmt:.8,fD:.15,fS:0,drive:.15,aA:.003,aD:.16,aS:.4,aR:.06};
 var SUB={o1Wave:'sine',o1Lvl:.7,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:900,res:0,envAmt:0,fS:0,drive:0,aA:.004,aD:.5,aS:.8,aR:.15};
 var ARPS={o1Wave:'sawtooth',o1Lvl:.26,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:2800,res:.15,envAmt:1.2,fD:.12,fS:0,aA:.002,aD:.14,aS:0,aR:.05,dlyMix:.25,dlyTime:.3,dlyFb:.35};
 var PAD80={o1Wave:'sawtooth',o1Lvl:.2,o2Wave:'sawtooth',o2Lvl:.2,o2Fine:14,subLvl:0,noiseLvl:0,cutoff:2200,res:0,envAmt:0,aA:.35,aD:.4,aS:.85,aR:.7,rvbMix:.35};
 var LD80={o1Wave:'sawtooth',o1Lvl:.26,o2Wave:'square',o2Lvl:.16,o2Fine:8,subLvl:0,noiseLvl:0,cutoff:3600,res:.1,envAmt:0,lfoShape:'sine',lfoRate:5.5,lfoPitch:.15,aA:.01,aD:.3,aS:.8,aR:.2,rvbMix:.3};
 var GSN={o1Lvl:.35,noiseLvl:.8,nHP:900,aA:.001,aD:.24,aS:0,aR:.02,rvbMix:.4};
 var EP={o1Wave:'triangle',o1Lvl:.4,o2Wave:'sine',o2Lvl:.2,o2Semi:12,subLvl:0,noiseLvl:0,cutoff:1600,res:0,envAmt:.4,fD:.3,fS:.2,lfoShape:'sine',lfoRate:.7,lfoPitch:.3,aA:.004,aD:.7,aS:.1,aR:.3};
 var CRK={o1Lvl:0,noiseLvl:.18,nHP:5000,fType:'bandpass',cutoff:7000,res:.1,aA:.001,aD:.012,aS:0,aR:.01};
 var DUL={cutoff:1400,drive:.35};
 var SQ1={o1Wave:'square',o1Lvl:.3,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:9000,res:0,envAmt:0,aA:.001,aD:.12,aS:.7,aR:.03};
 var SQ2=Object.assign({},SQ1,{o1Lvl:.2,aD:.1,aS:.4});
 var TRI={o1Wave:'triangle',o1Lvl:.6,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:9000,res:0,envAmt:0,aA:.001,aD:.1,aS:.9,aR:.02};
 var NZK={o1Lvl:0,noiseLvl:.6,nHP:600,fType:'lowpass',cutoff:900,aA:.001,aD:.09,aS:0,aR:.02};
 var NZH={o1Lvl:0,noiseLvl:.45,nHP:5000,aA:.001,aD:.03,aS:0,aR:.01};
 var WASH={o1Lvl:0,noiseLvl:.25,nHP:2500,fType:'bandpass',cutoff:3500,res:.1,aA:2.2,aD:.2,aS:.9,aR:1.5,rvbMix:.5};
 var AMB={o1Wave:'sine',o1Lvl:.3,o2Wave:'triangle',o2Lvl:.25,o2Fine:9,subLvl:0,noiseLvl:0,cutoff:1800,res:0,envAmt:0,aA:1.6,aD:.4,aS:.9,aR:1.8,rvbMix:.7,rvbSize:.9};
 var BELL={o1Wave:'sine',o1Lvl:.4,o2Wave:'sine',o2Lvl:.2,o2Semi:19,subLvl:0,noiseLvl:0,cutoff:6000,res:0,envAmt:0,aA:.004,aD:1.6,aS:0,aR:1.2,rvbMix:.7,rvbSize:.9,dlyMix:.3,dlyTime:.45,dlyFb:.4};
 var DRN={o1Wave:'sawtooth',o1Lvl:.4,o2Wave:'sawtooth',o2Lvl:.4,o2Fine:8,subLvl:0,noiseLvl:0,cutoff:300,res:.1,envAmt:0,aA:1,aD:.3,aS:1,aR:1,rvbMix:.4};
 var STR={o1Wave:'sawtooth',o1Lvl:.2,o2Wave:'sawtooth',o2Lvl:.2,o2Fine:12,subLvl:0,noiseLvl:0,cutoff:2400,res:0,envAmt:0,lfoShape:'sine',lfoRate:5,lfoPitch:.12,aA:.9,aD:.4,aS:.9,aR:1,rvbMix:.5,rvbSize:.8};
 var HIT={o1Wave:'sine',o1Lvl:.8,noiseLvl:.5,nHP:300,fType:'lowpass',cutoff:1600,aA:.001,aD:1.4,aS:0,aR:.4,pAmt:18,pDec:.18,rvbMix:.7,rvbSize:.9,drive:.3};
 var TOM={o1Wave:'sine',o1Lvl:.8,noiseLvl:.15,aA:.001,aD:.5,aS:0,aR:.2,pAmt:10,pDec:.1,rvbMix:.5};
 var RSR={o1Lvl:0,noiseLvl:.4,nHP:3000,aA:3,aD:.1,aS:1,aR:.1,rvbMix:.2};
 var SOFT={o1Wave:'triangle',o1Lvl:.3,o2Wave:'sawtooth',o2Lvl:.12,o2Fine:10,subLvl:0,noiseLvl:0,cutoff:1300,res:0,envAmt:0,aA:.25,aD:.4,aS:.85,aR:.6,rvbMix:.4};
 var held=function(name,p,extra){return {id:'bass',idx:all16(),o:Object.assign({name:name,scale:'minor',tie:ALL,p:p},extra||{})}};
 /* 和音トラック: list=[[根音オフセット,和音の種類],…]・at=開始ステップ・len=ステップ数。のばす(tie)。 */
 var chd=function(name,list,at,len,p,extra){var idx={},cd={},tie=[];list.forEach(function(c,k){for(var j=0;j<len[k];j++){idx[at[k]+j]=c[0];if(j)tie.push(at[k]+j)}cd[at[k]]={t:c[1],i:0}});return {id:'bass',idx:idx,o:Object.assign({name:name,tr:24,scale:'minor',p:p,cd:cd,tie:tie},extra||{})}};
 var single=function(name,p,idx,extra){return {id:'bass',idx:idx,o:Object.assign({name:name,tr:12,scale:'minor',p:p},extra||{})}};
 var SV=function(h,b,o){return Object.assign({h:h,b:b,tab:'trk'},o||{})};
 var Q=function(q,ans,ex){return {q:q,ans:ans,ex:ex}};
 /* n本のうち k(0始まり)だけ鳴らすときの mt */
 var only=function(n,k){var a=[];for(var i=0;i<n;i++)if(i!==k)a.push(i);return a};
 var ex=function(n,ks){var a=[];for(var i=0;i<n;i++)if(ks.indexOf(i)<0)a.push(i);return a};
 SD.LESSONS.push(
G({id:'gn10',pre:['th06','pd01'],terms:['gatedverb','arp','pad','reverb','chorus'],save:{name:'シンセウェーブ風',kind:'kit'},title:'シンセウェーブ/80年代風',sub:'アルペジオ・厚いパッド・ゲートリバーブ風のスネア(近似)',demo:{n:[36]},init:{sBpm:100},
 tk:[TK('kick',Z([0,8,10]),'キック',{p:KP}),TK('snare',Z([4,12]),'スネア',{p:GSN}),TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BS,mix:DK}),single('アルペジオ',ARPS,{0:0,2:3,4:7,6:12,8:7,10:3,12:7,14:3},{tr:24}),chd('パッド',[[0,'min'],[8,'maj'],[3,'maj'],[10,'maj']],[0,4,8,12],[4,4,4,4],PAD80),single('リード',LD80,{0:7,3:5,6:3,8:0,12:3},{tr:24})],steps:[
 SV('80年代風のテンポと型','シンセウェーブ風は、BPM 100前後。落ち着いたテンポで、ベースが8分音符で刻み、上で【アルペジオ】が流れ、厚い【パッド】が包む。T1キック、T2スネア、T3ベース、T4アルペジオ、T5パッド、T6リード。「▶ 試聴」で全部鳴らそう。再現度は近似(○)。'),
 SV('ドラムは太く','キックは1拍目と3拍目、スネアは2拍目と4拍目。スネアは音を少し長めにし、余韻をリバーブで広げてある。聴き比べよう。',{cmp:[{l:'キックだけ',mt:[1,2,3,4,5]},{l:'+スネア',mt:[2,3,4,5]}]}),
 SV('ゲートリバーブ風','【ゲートリバーブ】は、残響を途中で急に切り落として、太く短く聞かせる手法。ここでは、ノイズを短く切ったスネアで近似した。本物の切り落としはできない。',{cmp:[{l:'スネアなし',mt:[1,2,3,4,5]},{l:'スネアあり',mt:[2,3,4,5]}]}),
 SV('刻むベース','ベースは8分音符で休まず刻む。キックのたびに沈む設定にしてあるので、低域がぶつからない。聴き比べよう。',{cmp:[{l:'ベースなし',mt:[2]},{l:'ベースあり',mt:[]}]}),
 SV('アルペジオとパッド','アルペジオは和音を1音ずつ並べた動き。パッドは音をゆっくり立ち上げ、長く伸ばして全体を包む。2つで「動き」と「広がり」を分ける。',{cmp:[{l:'パッドなし',mt:[4]},{l:'アルペジオなし',mt:[3]},{l:'両方',mt:[]}]}),
 SV('どれがアルペジオ?','聴き比べて、和音が1音ずつ並んで流れているものを選ぼう。',{cmp:[{l:'1',mt:only(6,2)},{l:'2',mt:only(6,3)},{l:'3',mt:only(6,4)}],quiz:Q('アルペジオだけが鳴っているのは?',2,'2がアルペジオ。1はベース、3は伸びるパッド。アルペジオは和音の音が1つずつ順に鳴る。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。リードのあるなしを聴き比べて、メロディの役割を確かめよう。',{col:{h:'近似であることを忘れない',b:'ゲートリバーブは、実機では余韻を途中で切る専用の処理で作る。ここは、短く切ったノイズで雰囲気を近づけただけ。テンポ・和音・音色の組み合わせで「らしさ」を作る、という考え方が身につけばよい。'}})
]}),
G({id:'gn11',pre:['th06','sq05'],terms:['lofi','swing','seventh','noise','dark'],save:{name:'ローファイ風',kind:'kit'},title:'ローファイ風',sub:'こもった音・揺らぎ・ノイズ・ゆるいスウィング',demo:{n:[36]},init:{sBpm:80,sSwing:.25},
 tk:[TK('kick',Z([0,10]),'キック',{p:{o1Lvl:.4,cutoff:700}}),TK('snare',Z([4,12]),'スネア',{p:{o1Lvl:.25,noiseLvl:.35,cutoff:2200}}),TK('hat',P.shuffle(.4),'ハット',{p:{noiseLvl:.3,cutoff:5000}}),chd('コード',[[0,'m7'],[5,'m7'],[3,'maj7'],[7,'7']],[0,4,8,12],[4,4,4,4],EP,{tie:[]}),held('ベース',SUB,{p:Object.assign({},SUB,{aD:.4})}),TK('hat',Z([1,5,6,9,13,15]),'ノイズ',{p:CRK})],steps:[
 SV('ローファイ風とは','【ローファイ】風は、BPM 80前後のゆったりしたテンポ。わざと音をこもらせ、揺らぎとノイズを残す。T1キック、T2スネア、T3ハット、T4コード、T5ベース、T6ノイズ。'),
 SV('跳ねすぎない跳ね','ハットに【スウィング】を少しかけて、ゆるく跳ねさせる。キックの位置も、拍からすこしずらしてある。0%・25%・55%で違いを聴こう。',{cmp:[{l:'0%',s:{sSwing:0}},{l:'25%',s:{sSwing:.25}},{l:'55%',s:{sSwing:.55}}]}),
 SV('こもった音','【ローファイ】の音は高域が少なく、角が丸い。ドラムのフィルターを閉じて、高い音を削ってある。T1〜T3だけ聴いて、そのこもり方を確かめよう。',{cmp:[{l:'ドラムだけ',mt:[3,4,5]},{l:'全部',mt:[]}]}),
 SV('揺らぐコード','コードは【7th】系で柔らかく。音の高さをゆっくり揺らして、テープが少しよれたような感じを出す。コードを聴き比べよう。',{cmp:[{l:'コードなし',mt:[3]},{l:'コードあり',mt:[]}]}),
 SV('ノイズを足す','T6は、プチプチと小さく鳴る【ホワイトノイズ】。あえて足すと、ざらついた古い質感になる。ノイズの有無を聴き比べよう。',{cmp:[{l:'ノイズなし',mt:[5]},{l:'ノイズあり',mt:[]}]}),
 SV('どれが一番こもっている?','聴き比べて、高域が一番少ないものを選ぼう。',{cmp:[{l:'1',mt:only(6,2)},{l:'2',mt:only(6,3)},{l:'3',mt:only(6,5)}],quiz:Q('一番高域が少なく【暗い】な音は?',2,'2がコード。丸くこもっている。1はハット、3はノイズで、どちらも高域が中心。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。スウィングを変えて、ゆるさの具合を探そう。',{col:{h:'欠点を味にする',b:'ローファイは、本来なら避ける音のこもりやノイズを、わざと残して雰囲気に変える考え方。やりすぎると聞こえにくくなるので、足しすぎないのがコツ。'}})
]}),
G({id:'gn12',pre:['th06','sq01'],terms:['chip','pulse','arp','noise','poly'],save:{name:'チップチューン風',kind:'kit'},title:'チップチューン/ゲーム音楽風',sub:'矩形・三角・ノイズの少ない音で',demo:{n:[48]},init:{sBpm:150},
 tk:[single('パルス(主旋律)',SQ1,{0:7,2:7,3:10,4:12,6:10,8:7,10:3,12:5,14:7},{tr:12}),single('パルス(伴奏)',SQ2,{0:0,1:7,2:12,3:7,4:0,5:7,6:12,7:7,8:3,9:10,10:15,11:10,12:3,13:10,14:15,15:10},{tr:12}),single('三角(ベース)',TRI,{0:0,4:0,6:0,8:3,12:5,14:3},{tr:-12}),TK('hat',Z([0,4,8,12]),'ノイズ(キック)',{p:NZK}),TK('hat',Z([2,6,10,14]),'ノイズ(ハット)',{p:NZH})],steps:[
 SV('少ない音で作る','【チップチューン】風は、使える音がわずかな「ゲーム機」のような作り。矩形波2つ・三角波1つ・ノイズ1つ、という分担が基本。BPM 150前後で軽快に進む。T1・T2パルス、T3三角、T4・T5ノイズ。'),
 SV('矩形(パルス)波の音','矩形波の仲間を【パルス波】と呼ぶ。1つは主旋律、もう1つは和音の音を速く並べる【アルペジオ】で、和音の代わりをする。1本でも「同時に鳴る」ように聞こえる。',{cmp:[{l:'主旋律だけ',mt:[1,2,3,4]},{l:'+伴奏',mt:[2,3,4]}]}),
 SV('三角波のベース','低音は三角波。丸くて柔らかいので、矩形の伴奏とは違う帯域になる。聴き比べよう。',{cmp:[{l:'ベースなし',mt:[2]},{l:'ベースあり',mt:[]}]}),
 SV('ノイズのドラム','ドラムも、ノイズで作る。低めのノイズがキック、高めのノイズがハットの代わり。サンプルは使わない。',{cmp:[{l:'ドラムなし',mt:[3,4]},{l:'ドラムあり',mt:[]}]}),
 SV('どれが三角波のベース?','聴き比べて、丸く柔らかい低音だけが鳴っているものを選ぼう。',{cmp:[{l:'1',mt:only(5,0)},{l:'2',mt:only(5,2)},{l:'3',mt:only(5,3)}],quiz:Q('三角波のベースは?',2,'2が三角波のベース。1は矩形波の主旋律、3はノイズのキック。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。音を足しすぎず、4つの役割を守るのが「らしさ」。',{col:{h:'制限が個性になる',b:'同時に鳴る音が少ないと、アルペジオを速く並べて和音に聞かせるなど、工夫が生まれる。制限があるから生まれた音づくりが、そのままジャンルの個性になった。'}})
]}),
G({id:'gn13',pre:['pd05','th09'],terms:['ambient','drone','reverb','attack','release'],save:{name:'アンビエント風',kind:'kit'},title:'アンビエント風',sub:'長いパッド・ゆっくりの変化・空間',demo:{n:[48]},init:{sBpm:70},
 tk:[chd('パッド',[[0,'sus2'],[5,'sus2']],[0,8],[8,8],AMB,{tr:12}),held('ドローン',DRN,{tr:-12}),single('ベル',BELL,{0:0,5:7,10:12,13:7},{tr:12}),held('ノイズ',WASH,{tr:12})],steps:[
 SV('拍を前に出さない','【アンビエント】風は、拍を前に出さず、長い音と空間で雰囲気を作る。BPM 70前後だが、リズムは目立たない。T1パッド、T2ドローン、T3ベル、T4ノイズ。'),
 SV('ドローン','【ドローン】は、同じ高さの音を長く鳴らし続ける下地。低域を静かに支えるので、他の音が自由に動ける。',{cmp:[{l:'ドローンなし',mt:[1]},{l:'ドローンあり',mt:[]}]}),
 SV('ゆっくりのパッド','パッドは【アタック】をとても遅くし、【リリース】を長くして、音の出入りをぼかす。【リバーブ】も大きく。輪郭が消えて、空間に溶ける。',{cmp:[{l:'パッドなし',mt:[0]},{l:'パッドあり',mt:[]}]}),
 SV('ぽつりと鳴るベル','ベルは音数を絞り、間をたっぷり空ける。残響で長く伸びるので、少ないほど印象に残る。',{cmp:[{l:'ベルなし',mt:[2]},{l:'ベルあり',mt:[]}]}),
 SV('空気のノイズ','ノイズをゆっくり立ち上げて、空気のような質感を足す。音程のない帯域が、広がりを作る。',{cmp:[{l:'ノイズなし',mt:[3]},{l:'ノイズあり',mt:[]}]}),
 SV('どれが一番広い?','聴き比べて、一番空間に広がって聞こえるものを選ぼう。',{cmp:[{l:'1',mt:only(4,1)},{l:'2',mt:only(4,0)},{l:'3',mt:only(4,2)}],quiz:Q('一番広がって聞こえるのは?',2,'2がパッド。リバーブが大きく、輪郭がぼやける。1は低く狭いドローン、3は短く鳴るベル。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。音の出入りが遅いほど、雰囲気が溶ける。',{col:{h:'変化は遅く、少なく',b:'アンビエントでは、変化がゆっくりなほど雰囲気が保たれる。音を足す順番をミュートで試し、1つ足すごとに印象がどう変わるかを聴いてみよう。変化の仕方はオートメーションでも作れる。'}})
]}),
G({id:'gn14',pre:['pd03','fx03'],terms:['cinematic','drone','impact','riser','reverb'],save:{name:'シネマティック風',kind:'kit'},title:'シネマティック/映画音楽風',sub:'低域の持続・弦風・インパクト(近似)',demo:{n:[36]},init:{sBpm:80},
 tk:[held('低音の持続',DRN,{tr:-12}),chd('ストリングス風',[[0,'min'],[8,'maj']],[0,8],[8,8],STR,{tr:12}),TK('bass',Z([0]),'インパクト',{tr:-12,p:HIT}),TK('tom',Z([8,10,12,14]),'低いタム',{p:TOM}),held('ライザー',RSR,{tr:12})],steps:[
 SV('場面を作る音','【シネマティック】風は、低音の持続・広がる響き・大きな一撃で場面を作る。BPM 80前後。T1低音、T2ストリングス風、T3インパクト、T4タム、T5ライザー。再現度は近似(○)。'),
 SV('低域の持続','低音を【ドローン】のように長く鳴らして、足元を固める。重く、不安や緊張を感じさせる土台になる。',{cmp:[{l:'低音なし',mt:[0]},{l:'低音あり',mt:[]}]}),
 SV('ストリングス風','ノコギリ波を少しずらして重ね、アタックを遅くし、ゆっくり揺らす。弦楽のような厚みに近づける。近似であり、本物の弦とは違う。',{cmp:[{l:'弦なし',mt:[1]},{l:'弦あり',mt:[]}]}),
 SV('インパクト','【インパクト】は、低い音が一撃で爆ぜて、長い残響が続く音。小節の頭に1回だけ入れると、場面の区切りになる。',{cmp:[{l:'インパクトなし',mt:[2]},{l:'インパクトあり',mt:[]}]}),
 SV('タムで盛り上げる','低いタムを後半に連打して、次へ向かう緊張を作る。音数が増えるぶん、盛り上がる。',{cmp:[{l:'タムなし',mt:[3]},{l:'タムあり',mt:[]}]}),
 SV('ライザー','【ライザー】を、ゆっくり立ち上げる。静かな場面から、一気に大きな場面へつなぐときの定番。',{cmp:[{l:'ライザーなし',mt:[4]},{l:'ライザーあり',mt:[]}]}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。足す順番を、ミュートで変えてみよう。',{col:{h:'低い音は少なく、長く',b:'映画のような音は、低い音を少数、長く、静かに置くのが基本。足し算より、間(ま)と余韻のほうが場面を作る。インパクトは多用せず、ここぞという一回に絞る。'}})
]}),
G({id:'gn15',pre:['th06','th04'],terms:['halftime','softpad','subbass','seventh','swing'],save:{name:'R&B/ポップ風',kind:'kit'},title:'R&B/ポップ風(シンセ編)',sub:'柔らかいパッド・サブ・ハーフタイム',demo:{n:[36]},init:{sBpm:90},
 tk:[TK('kick',P.halfTime('kick'),'キック',{p:KP}),TK('clap',P.halfTime('snare'),'クラップ'),TK('hat',P.shuffle(.15),'ハット',{p:{noiseLvl:.35}}),chd('柔らかいパッド',[[0,'m7'],[8,'maj7'],[5,'m7'],[7,'7']],[0,4,8,12],[4,4,4,4],SOFT),held('サブ',SUB,{mix:DK})],steps:[
 SV('ゆったりとした土台','R&B/ポップ風は、BPM 90前後。【ハーフタイム】で、クラップは1小節に1回だけ。ゆったりした土台の上に、柔らかい和音を置く。T1キック、T2クラップ、T3ハット、T4パッド、T5サブ。'),
 SV('ドラムを積む','キックとクラップだけで、ゆったりしたノリが決まる。ハットを軽く跳ねさせると、少し前へ進む感じが出る。',{cmp:[{l:'キックだけ',mt:[1,2,3,4]},{l:'+クラップ',mt:[2,3,4]},{l:'ハットまで',mt:[3,4]}]}),
 SV('柔らかいパッド','【柔らかいパッド】は、アタックが遅く、高域を抑えて輪郭をぼかした音。【7th】系の和音を重ねると、洗練された雰囲気が出る。',{cmp:[{l:'パッドなし',mt:[3]},{l:'パッドあり',mt:[]}]}),
 SV('サブで支える','低音はサイン波の【サブベース】を、ゆっくり持続させる。パッドの足元を支え、スマホのスピーカーでは聞こえにくいが、ヘッドホンでは重く感じる。',{cmp:[{l:'サブなし',mt:[4]},{l:'サブあり',mt:[]}]}),
 SV('どれが柔らかい?','聴き比べて、一番輪郭がぼやけて柔らかく聞こえるものを選ぼう。',{cmp:[{l:'1',mt:only(5,2)},{l:'2',mt:only(5,3)},{l:'3',mt:only(5,1)}],quiz:Q('一番柔らかく聞こえるのは?',2,'2がパッド。アタックが遅く、高域が少ない。1はハット、3はクラップで、どちらも輪郭がはっきりしている。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。和音の種類を変えて、雰囲気の違いを確かめよう。',{col:{h:'隙間を残す',b:'音数を絞って隙間を残すと、1つ1つの音が丁寧に聞こえる。パッドは主張しすぎず、ドラムとサブが作る間(ま)の中に置くのが、このジャンルの一般的な作り方。'}})
]})
);
})();
