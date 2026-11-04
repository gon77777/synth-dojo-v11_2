/* v5.11 GN-3 ジャンル(日本)(gn16〜gn22)。音色・リズム・和声の「一般的な傾向」だけを扱う。
   特定の曲・アーティスト・作品は再現しない。年号・人名・曲名・機種名・時事表現は書かない。起源の断定もしない。
   TRKレシピ(6本以内)。聴き比べはミュート切替(cmp.mt)・BPM/スウィング切替(cmp.s)。和の音階は音の位置(半音数)で直接指定する */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags})};
 A('miyako','都節風の音階','みやこぶしふうのおんかい','miyako-bushi-style scale','主音から半音・長3度・半音・全音と進む、5音の音階。日本的と言われる響きを作る。',['gn20'],['音階']);
 A('taiko','太鼓のリズム','たいこのりずむ','taiko rhythm','低い「ドン」と高い「カッ」を打ち分けて作る、和太鼓の一般的なリズムの型。',['gn21'],['リズム']);
 A('palmmute','パームミュート風','ぱーむみゅーとふう','palm-mute style','短く切った低めのノコギリ波を細かく刻む、ギターの消音奏法のような音。',['gn19'],['音色']);
 A('callresp','合いの手','あいのて','call and response','主旋律の合間に入る短いフレーズ。メロディとの間を埋めて、掛け合いを作る。',['gn19'],['構成']);
 SD.CATS.push({id:'gn3',synth:'analog',chapter:'course',course:'GN',name:'GN ジャンル(日本)'});
 var P=SD.PATS,TK=P.tk,z=function(a,r){var q={};a.forEach(function(i){q[i]=r||0});return q};
 var Z=function(a){return {idx:z(a),o:{}}};
 var all16=function(){var q={};for(var i=0;i<16;i++)q[i]=0;return q},ALL=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
 var G=function(o){return Object.assign({cat:'gn3',synth:'analog',lv:2,course:'GN',kind:'recipe',mode:'trk',tab:'trk',ts:0,oct:-1},o)};
 var KP={o1Lvl:.45},DK=SD.scMix({src:0,depth:.75,key:-20,rel:90});/* v8.3: 本物のサイドチェイン(COMPのSC SRC=T1) */
 var BSF={o1Wave:'sawtooth',o1Lvl:.4,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:800,res:.1,envAmt:.7,fD:.15,fS:0,drive:.1,aA:.003,aD:.18,aS:.5,aR:.06};
 var SUB={o1Wave:'sine',o1Lvl:.7,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:900,res:0,envAmt:0,fS:0,aA:.004,aD:.4,aS:.8,aR:.12};
 var EP={o1Wave:'triangle',o1Lvl:.4,o2Wave:'sine',o2Lvl:.2,o2Semi:12,subLvl:0,noiseLvl:0,cutoff:2200,res:0,envAmt:.4,fD:.3,fS:.2,aA:.004,aD:.6,aS:.1,aR:.25,rvbMix:.2};
 var BRS={o1Wave:'sawtooth',o1Lvl:.24,o2Wave:'sawtooth',o2Lvl:.2,o2Fine:8,subLvl:0,noiseLvl:0,cutoff:2400,res:.05,envAmt:1,fD:.15,fS:.4,aA:.02,aD:.2,aS:.3,aR:.1};
 var LDJ={o1Wave:'sawtooth',o1Lvl:.26,o2Wave:'sawtooth',o2Lvl:.22,o2Fine:14,subLvl:0,noiseLvl:0,cutoff:5000,res:.1,envAmt:0,drive:.25,aA:.004,aD:.3,aS:.8,aR:.15,dlyMix:.2,dlyTime:.25,dlyFb:.3};
 var STR={o1Wave:'sawtooth',o1Lvl:.2,o2Wave:'sawtooth',o2Lvl:.2,o2Fine:12,subLvl:0,noiseLvl:0,cutoff:2600,res:0,envAmt:0,aA:.5,aD:.4,aS:.9,aR:.6,rvbMix:.3};
 var PAD={o1Wave:'sawtooth',o1Lvl:.2,o2Wave:'sawtooth',o2Lvl:.2,o2Fine:14,subLvl:0,noiseLvl:0,cutoff:2000,res:0,envAmt:0,aA:.3,aD:.4,aS:.85,aR:.6,rvbMix:.35};
 var BELL={o1Wave:'sine',o1Lvl:.4,o2Wave:'sine',o2Lvl:.2,o2Semi:19,subLvl:0,noiseLvl:0,cutoff:6000,res:0,envAmt:0,aA:.004,aD:.8,aS:0,aR:.5,rvbMix:.4};
 var GTR={o1Wave:'sawtooth',o1Lvl:.3,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:1100,res:.1,envAmt:.3,fD:.06,fS:0,drive:.5,aA:.002,aD:.07,aS:0,aR:.03};
 var FILL={o1Wave:'square',o1Lvl:.26,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:3500,res:.3,envAmt:1,fD:.1,fS:0,aA:.002,aD:.12,aS:0,aR:.05,dlyMix:.25,dlyTime:.2,dlyFb:.3};
 var KOTO={o1Wave:'sawtooth',o1Lvl:.3,o2Lvl:0,subLvl:0,noiseLvl:.04,nHP:3000,cutoff:2800,res:.15,envAmt:1.4,fD:.1,fS:0,aA:.002,aD:.45,aS:0,aR:.25,rvbMix:.35};
 var SHAKU={o1Wave:'triangle',o1Lvl:.4,o2Lvl:0,subLvl:0,noiseLvl:.3,nHP:2500,fType:'bandpass',cutoff:1500,res:.4,envAmt:0,lfoShape:'sine',lfoRate:5,lfoPitch:.25,aA:.12,aD:.3,aS:.8,aR:.4,rvbMix:.5};
 var DRN={o1Wave:'sawtooth',o1Lvl:.35,o2Wave:'sawtooth',o2Lvl:.35,o2Fine:8,subLvl:0,noiseLvl:0,cutoff:350,res:.1,envAmt:0,aA:.8,aD:.3,aS:1,aR:.8,rvbMix:.3};
 var DON={o1Wave:'sine',o1Lvl:.85,noiseLvl:.2,nHP:400,aA:.001,aD:.45,aS:0,aR:.2,pAmt:10,pDec:.1,rvbMix:.3};
 var KAT={o1Wave:'square',o1Lvl:.4,noiseLvl:.4,nHP:2000,aA:.001,aD:.05,aS:0,aR:.02,pAmt:8,pDec:.015};
 var KANE={o1Wave:'sine',o1Lvl:.3,o2Wave:'sine',o2Lvl:.2,o2Semi:19,noiseLvl:0,cutoff:8000,aA:.001,aD:.35,aS:0,aR:.2,rvbMix:.3};
 var held=function(name,p,extra){return {id:'bass',idx:all16(),o:Object.assign({name:name,scale:'minor',tie:ALL,p:p},extra||{})}};
 var chd=function(name,list,at,len,p,extra){var idx={},cd={},tie=[];list.forEach(function(c,k){for(var j=0;j<len[k];j++){idx[at[k]+j]=c[0];if(j)tie.push(at[k]+j)}cd[at[k]]={t:c[1],i:0}});return {id:'bass',idx:idx,o:Object.assign({name:name,tr:24,scale:'minor',p:p,cd:cd,tie:tie},extra||{})}};
 var chops=function(name,p,list,extra){var idx={},cd={};list.forEach(function(c){idx[c[0]]=c[1];cd[c[0]]={t:c[2],i:0}});return {id:'bass',idx:idx,o:Object.assign({name:name,tr:24,scale:'minor',p:p,cd:cd},extra||{})}};
 var single=function(name,p,idx,extra){return {id:'bass',idx:idx,o:Object.assign({name:name,tr:12,scale:'minor',p:p},extra||{})}};
 var SV=function(h,b,o){return Object.assign({h:h,b:b,tab:'trk'},o||{})};
 var Q=function(q,ans,ex){return {q:q,ans:ans,ex:ex}};
 var only=function(n,k){var a=[];for(var i=0;i<n;i++)if(i!==k)a.push(i);return a};
 SD.LESSONS.push(
G({id:'gn16',pre:['th04','th06'],terms:['seventh','swing','syncope','stab','sidechain'],save:{name:'シティポップ風',kind:'kit'},title:'シティポップ風',sub:'7thコード・弾むベース・ブラス/エレピ風(近似)',demo:{n:[36]},init:{sBpm:108,sSwing:.15},
 tk:[TK('kick',Z([0,8,10]),'キック',{p:KP}),TK('snare',Z([4,12]),'スネア'),TK('hat',P.shuffle(.2),'ハット',{p:{noiseLvl:.35}}),TK('bass',P.bassPattern('syncop',0),'ベース',{scale:'minor',p:BSF,mix:DK}),chops('エレピ風',EP,[[0,0,'maj7'],[6,0,'maj7'],[8,5,'m7'],[14,5,'m7']]),chops('ブラス風',BRS,[[3,0,'7'],[11,5,'7']],{tr:12})],steps:[
 SV('シティポップ風とは','シティポップ風は、BPM 108前後。【7th】系の和音、弾むベース、軽く跳ねるリズムが特徴。T1キック、T2スネア、T3ハット、T4ベース、T5エレピ風、T6ブラス風。再現度は近似(○)。'),
 SV('軽く跳ねるリズム','ハットに【スウィング】を少しだけかけて、ゆるく跳ねさせる。0%・15%・40%で違いを聴こう。',{cmp:[{l:'0%',s:{sSwing:0}},{l:'15%',s:{sSwing:.15}},{l:'40%',s:{sSwing:.4}}]}),
 SV('弾むベース','ベースは、キックの合間に【シンコペーション】で動く。音を短く切ると、弾むノリになる。',{cmp:[{l:'ベースなし',mt:[3]},{l:'ベースあり',mt:[]}]}),
 SV('7thの響き','メジャー7thとマイナー7thを交互に使うと、洗練された、少し切ない響きになる。三和音と聴き比べよう。',{cmp:[{l:'エレピなし',mt:[4]},{l:'エレピあり',mt:[]}]}),
 SV('ブラス風の合いの手','ブラス風は、ノコギリ波を重ね、出だしでフィルターを開いて「パッ」と鳴らす近似。【スタブ】として短く入れ、アクセントにする。',{cmp:[{l:'ブラスなし',mt:[5]},{l:'ブラスあり',mt:[]}]}),
 SV('どれがブラス風?','聴き比べて、短く「パッ」と入るノコギリの和音を選ぼう。',{cmp:[{l:'1',mt:only(6,3)},{l:'2',mt:only(6,5)},{l:'3',mt:only(6,4)}],quiz:Q('ブラス風は?',2,'2がブラス風。1はベース、3はエレピ風。ブラス風はノコギリ波で、出だしが明るく鋭い。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。キックのたびにベースが沈む【サイドチェイン】の量も、変えてみよう(MIXタブでベースのCOMPのTHRESHを動かす)。',{col:{h:'傾向であって決まりではない',b:'ここで扱ったのは、音色・リズム・和声の一般的な傾向だけ。特定の曲の再現ではない。同じジャンル名でも、作り手や時期で音は大きく違う。傾向を道具として使い、自分の音にしていこう。'}})
]}),
G({id:'gn17',pre:['th05','th06'],terms:['prog','halftime','octave','supersaw','chorus'],save:{name:'アニソン風',kind:'kit'},title:'アニソン風',sub:'速いテンポ・派手なシンセ・動くコード進行',demo:{n:[36]},init:{sBpm:170},
 tk:[TK('kick',Z([0,6,8,10]),'キック',{p:KP}),TK('snare',Z([4,12]),'スネア'),TK('hat',Z([0,2,4,6,8,10,12,14]),'ハット',{p:{noiseLvl:.4}}),TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'major',p:BSF,mix:DK}),chd('ストリングス風',[[5,'maj'],[7,'maj'],[4,'min'],[9,'min']],[0,4,8,12],[4,4,4,4],STR,{scale:'major'}),single('リード',LDJ,{0:7,2:9,4:12,6:9,8:7,10:4,12:7,14:9},{tr:24,scale:'major'})],steps:[
 SV('速くて派手','アニソン風は、BPM 170前後の速いテンポで、シンセが派手に動くのが傾向。T1キック、T2スネア、T3ハット、T4ベース、T5ストリングス風、T6リード。再現度は近似(○)。'),
 SV('速さを作るドラム','キックの前のめりな配置と、8分音符のハットで、速さが際立つ。BPMを動かして、印象の変化を確かめよう。',{cmp:[{l:'キックだけ',mt:[1,2,3,4,5]},{l:'+スネア',mt:[2,3,4,5]},{l:'+ハット',mt:[3,4,5]}]}),
 SV('動くコード進行','コードは4つ並べ、1小節ごとに動かす。【コード進行】が動くたびに、聞こえる色が変わる。ストリングス風で和音を伸ばして、厚みを足す。',{cmp:[{l:'ストリングスなし',mt:[4]},{l:'ストリングスあり',mt:[]}]}),
 SV('派手なリード','リードはノコギリ波を2つ重ね、少し歪ませて前に出す。1オクターブ上の高い音域に置くと、メロディが抜ける。',{cmp:[{l:'リードなし',mt:[5]},{l:'リードあり',mt:[]}]}),
 SV('低音を整える','ベースは8分音符でまっすぐ刻み、リードより低い帯域に収める。キックのたびに沈む設定で、前のめりな低域がぶつからない。',{cmp:[{l:'ベースなし',mt:[3]},{l:'ベースあり',mt:[]}]}),
 SV('どれがリード?','聴き比べて、高い音域で動いているものを選ぼう。',{cmp:[{l:'1',mt:only(6,4)},{l:'2',mt:only(6,5)},{l:'3',mt:only(6,3)}],quiz:Q('リードは?',2,'2がリード。1はストリングス風で和音、3はベース。リードは一番高い音域でメロディを動かす。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。コードの動き方を変えて、雰囲気の違いを確かめよう。',{col:{h:'足しすぎに注意',b:'派手さは、音を足すほど増えるが、足しすぎると濁る。帯域を分けて、リードは高域、ベースは低域、和音は中域、と役割を守ると、速くてもすっきり聞こえる。'}})
]}),
G({id:'gn18',pre:['th07','ly14'],terms:['build','break','octave','pad','reverb'],save:{name:'J-POPシンセ風',kind:'kit'},title:'J-POPのシンセの使い方',sub:'イントロの音・サビでの厚み・ブレイク',demo:{n:[36]},init:{sBpm:120},
 tk:[TK('kick',Z([0,4,8,12]),'キック',{p:KP}),TK('snare',Z([4,12]),'スネア',{mix:{tVol:.8}}),TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'major',p:BSF,mix:DK}),single('ベル・アルペジオ',BELL,{0:0,2:4,4:7,6:12,8:7,10:4,12:0,14:4},{tr:24,scale:'major',mix:{tVol:.8}}),chd('パッド',[[0,'maj'],[7,'maj'],[9,'min'],[5,'maj']],[0,4,8,12],[4,4,4,4],PAD,{scale:'major'}),single('リード(上)',LDJ,{0:7,4:9,8:12,12:9},{tr:24,scale:'major',mix:{tVol:.8}})],steps:[
 SV('場面ごとの音の使い方','J-POPでは、イントロ・サビ・ブレイクで、シンセの役割が変わるのが一般的。ここでは、要素を足し引きして、その違いを聴く。T1キック、T2スネア、T3ベース、T4ベル、T5パッド、T6リード。再現度は近似(○)。'),
 SV('イントロの音','イントロは、ベルのような音のアルペジオだけで始めると、印象に残りやすい。要素が少ないので、1つ1つの音が目立つ。',{cmp:[{l:'ベルだけ',mt:[0,1,2,4,5]},{l:'+パッド',mt:[0,1,2,5]}]}),
 SV('Aメロは引き算','メロディの下は、ドラムとベース、軽いパッドだけにする。音数を絞ると、歌やメロディに耳が向く。',{cmp:[{l:'ベルなし・リードなし',mt:[3,5]},{l:'ベルあり',mt:[5]}]}),
 SV('サビで厚くする','サビでは、【オクターブ】違いのリードや、パッドを足して厚みを出す。全部の要素を鳴らすと、一気に広がる。',{cmp:[{l:'ブレイク前',mt:[5]},{l:'サビ(全部)',mt:[]}]}),
 SV('ブレイクで抜く','【ブレイク】は、ドラムとベースを抜いて、パッドとベルだけにする場面。直前を静かにすると、次の【ビルドアップ】からのサビが際立つ。',{cmp:[{l:'サビ',mt:[]},{l:'ブレイク',mt:[0,1,2,5]}]}),
 SV('どれがブレイク?','聴き比べて、ドラムが抜けて、パッドとベルだけが鳴っているものを選ぼう。',{cmp:[{l:'1',mt:[]},{l:'2',mt:[0,1,2,5]},{l:'3',mt:[3,4,5]}],quiz:Q('ブレイクは?',2,'2がブレイク。ドラムとベースとリードが抜けている。1は全部、3はキック・スネア・ベースだけ。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。足す順番を、ミュートで変えてみよう。',{col:{h:'展開は足し引きで作る',b:'曲の盛り上がりは、新しい音を作らなくても、同じ要素の足し引きで作れる。どの場面でどれを鳴らすかを決めるのが、アレンジの基本になる。'}})
]}),
G({id:'gn19',pre:['th06','sq01'],terms:['palmmute','callresp','sidechain','poly','stab'],save:{name:'ボカロ曲風',kind:'kit'},title:'ボカロ曲風',sub:'速いテンポ・細かい刻み・ギター風・合いの手',demo:{n:[36]},init:{sBpm:175},
 tk:[TK('kick',Z([0,3,8,10]),'キック',{p:KP}),TK('snare',Z([4,12]),'スネア'),TK('hat',Z([0,2,4,6,8,10,12,14]),'ハット',{p:{noiseLvl:.4}}),TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',p:BSF,mix:DK}),chops('ギター風',GTR,[[0,0,'pow'],[1,0,'pow'],[2,0,'pow'],[4,0,'pow'],[6,0,'pow'],[8,3,'pow'],[10,3,'pow'],[12,5,'pow'],[14,5,'pow']]),single('合いの手',FILL,{3:12,7:15,11:19,15:15},{tr:24})],steps:[
 SV('速くて細かい','ボカロ曲風は、BPM 175前後の速さで、細かく刻むのが傾向。T1キック、T2スネア、T3ハット、T4ベース、T5ギター風、T6合いの手。再現度は近似(○)。'),
 SV('細かい刻みのドラム','キックは8分より細かい位置にも入れ、ハットは8分で刻む。速いテンポでも、ノリが途切れない。',{cmp:[{l:'キックだけ',mt:[1,2,3,4,5]},{l:'+スネア',mt:[2,3,4,5]},{l:'+ハット',mt:[3,4,5]}]}),
 SV('ギター風の刻み','【パームミュート風】は、低めに閉じたノコギリ波を、短く切って細かく刻んだ音。和音はパワーコードに近い形にして、すっきり重くする。',{cmp:[{l:'ギター風なし',mt:[4]},{l:'ギター風あり',mt:[]}]}),
 SV('ベースと棲み分け','ベースは8分音符でまっすぐ。ギター風は中域、ベースは低域に分かれるので、2つとも聞こえる。',{cmp:[{l:'ベースなし',mt:[3]},{l:'ベースあり',mt:[]}]}),
 SV('合いの手','【合いの手】は、メロディの合間に入る短いフレーズ。ここでは矩形波のシンセを、小節の終わりに入れた。ディレイで少し余韻を足す。',{cmp:[{l:'合いの手なし',mt:[5]},{l:'合いの手あり',mt:[]}]}),
 SV('どれが合いの手?','聴き比べて、小節の終わりだけに入る高い音を選ぼう。',{cmp:[{l:'1',mt:only(6,4)},{l:'2',mt:only(6,5)},{l:'3',mt:only(6,3)}],quiz:Q('合いの手は?',2,'2が合いの手。1はギター風の刻み、3はベース。合いの手は、間を埋める短いフレーズ。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。テンポを下げて、細かい刻みの見え方を確かめよう。',{col:{h:'隙間を作る',b:'細かい刻みが続くと、聞き疲れしやすい。合いの手や休符で、定期的に隙間を作ると、全体が呼吸する。速さと隙間の対比が、聴きやすさを決める。'}})
]}),
G({id:'gn20',pre:['th03','pl01'],terms:['miyako','pluck','drone','reverb','pad'],save:{name:'和風',kind:'kit'},title:'ゲーム音楽風(和風・和の音階)',sub:'日本的な音階・琴/尺八風(近似)',demo:{n:[48]},init:{sBpm:90},
 tk:[single('琴風',KOTO,{0:0,2:7,4:8,6:12,8:8,10:7,12:5,14:0},{tr:12,scale:'chrom'}),single('尺八風',SHAKU,{0:12,4:13,8:17},{tr:12,scale:'chrom',tie:[1,2,3,5,6,7,9,10,11]}),held('ドローン',DRN,{tr:-12,scale:'chrom'}),TK('tom',Z([0,8]),'太鼓',{p:DON}),TK('rim',Z([4,12]),'拍子木風',{p:KAT})],steps:[
 SV('日本的な響き','【都節風の音階】は、主音から半音・長3度・半音・全音と進む5音の音階。西洋のメジャーやマイナーとは違う、日本的と言われる響きになる。T1琴風、T2尺八風、T3ドローン、T4太鼓、T5拍子木風。再現度は近似(○)。'),
 SV('琴風の撥弦','琴風は、ノコギリ波に短い減衰とフィルターの跳ねを組み合わせた、弦を弾く音の近似。都節風の音階の音だけを並べてある。',{cmp:[{l:'琴風だけ',mt:[1,2,3,4]},{l:'全部',mt:[]}]}),
 SV('尺八風の息','尺八風は、三角波に息のノイズを少し混ぜ、アタックをゆっくりにして、ゆっくり揺らす近似。長く伸ばす音で、息の流れを出す。',{cmp:[{l:'尺八なし',mt:[1]},{l:'尺八あり',mt:[]}]}),
 SV('ドローンで支える','低い【ドローン】を静かに長く鳴らすと、音階の主音が決まり、日本的な響きが安定する。',{cmp:[{l:'ドローンなし',mt:[2]},{l:'ドローンあり',mt:[]}]}),
 SV('間を作るリズム','太鼓と拍子木風は、音を少なくして、間(ま)を残す。間が多いほど、1つ1つの音が重く聞こえる。',{cmp:[{l:'打楽器なし',mt:[3,4]},{l:'打楽器あり',mt:[]}]}),
 SV('どれが尺八風?','聴き比べて、息のノイズを含んで伸びる音を選ぼう。',{cmp:[{l:'1',mt:only(5,0)},{l:'2',mt:only(5,1)},{l:'3',mt:only(5,3)}],quiz:Q('尺八風は?',2,'2が尺八風。1は琴風で弾く音、3は太鼓。尺八風は、息のノイズを含んで長く伸びる。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。琴風の音を、ステップで並べ替えてみよう。',{col:{h:'近似と分かって使う',b:'実際の和楽器の音は、もっと複雑。ここは、シンセの波形とフィルターで雰囲気に近づけた近似。音階が持つ響きを、音色で支えるという考え方を学ぶのが目的。'}})
]}),
G({id:'gn21',pre:['th06','sq03'],terms:['taiko','syncope','tom','transient','reverb'].filter(function(x){return x!=='tom'}),save:{name:'和太鼓風',kind:'kit'},title:'祭り・和太鼓風のリズム',sub:'ドンとカッの打ち分け・シンセでの近似',demo:{n:[36]},init:{sBpm:120},
 tk:[TK('tom',Z([0,6,8,10,12]),'大太鼓(ドン)',{p:DON}),TK('rim',Z([2,4,7,14]),'締太鼓(カッ)',{p:KAT}),TK('tom',Z([3,11,15]),'小太鼓',{p:Object.assign({},DON,{o1Lvl:.6,aD:.2}),tr:7}),TK('conga',Z([5,13]),'鉦風',{p:KANE,tr:12}),held('低音',SUB,{tr:-12})],steps:[
 SV('ドンとカッ','【太鼓のリズム】は、低い「ドン」と高い「カッ」を打ち分けて作る。T1大太鼓(ドン)、T2締太鼓(カッ)、T3小太鼓、T4鉦風、T5低音。再現度は近似(○)。'),
 SV('大太鼓のドン','大太鼓は、低く長く響く音。音程が一瞬下がるピッチエンベロープで、皮を打つ感じを出してある。',{cmp:[{l:'ドンだけ',mt:[1,2,3,4]},{l:'全部',mt:[]}]}),
 SV('締太鼓のカッ','締太鼓は、高くて短い、乾いた音。ドンの合間に入ると、リズムが引き締まる。',{cmp:[{l:'カッなし',mt:[1]},{l:'カッあり',mt:[]}]}),
 SV('打ち分けのパターン','ドンを拍の頭に、カッを裏に置くと、メリハリが出る。【シンコペーション】で位置をずらすと、ノリが前へ進む。',{cmp:[{l:'ドンとカッだけ',mt:[2,3,4]},{l:'+小太鼓',mt:[3,4]}]}),
 SV('鉦と低音','鉦風の高い金属音を、定位置にくり返し入れる。低音は長く伸ばして、全体を下から支える。',{cmp:[{l:'鉦なし',mt:[3]},{l:'低音なし',mt:[4]},{l:'全部',mt:[]}]}),
 SV('どれがカッ?','聴き比べて、高くて短い乾いた音を選ぼう。',{cmp:[{l:'1',mt:only(5,0)},{l:'2',mt:only(5,1)},{l:'3',mt:only(5,4)}],quiz:Q('カッ(締太鼓)は?',2,'2がカッ。1は低いドン、3は長く響く低音。カッは高くて短い。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。ドンの位置を動かして、ノリの変化を確かめよう。',{col:{h:'打ち分けが型を作る',b:'太鼓のリズムは、高低の打ち分けと、間の取り方で型が決まる。ここで学んだのは、一般的な打ち分けの考え方で、特定の曲や流派のリズムではない。'}})
]}),
G({id:'gn22',pre:['th06','th05'],terms:['halftime','swing','prog','sidechain'],save:{name:'風の型',kind:'kit'},title:'「〇〇風」の考え方',sub:'テンポ・リズム・音色・和声・構成の手順',demo:{n:[36]},init:{sBpm:120,sSwing:0},
 tk:[TK('kick',Z([0,4,8,12]),'キック',{p:KP}),TK('snare',Z([4,12]),'スネア'),TK('hat',P.shuffle(0),'ハット',{p:{noiseLvl:.35}}),TK('bass',P.bassPattern('syncop',0),'ベース',{scale:'minor',p:BSF,mix:DK}),chd('コード',[[0,'min'],[8,'maj'],[3,'maj'],[10,'maj']],[0,4,8,12],[4,4,4,4],PAD),single('リード',LDJ,{0:7,4:5,8:3,12:0},{tr:24})],steps:[
 SV('風を作る順番','「〇〇風」は、①テンポ ②リズム ③音色 ④和声 ⑤構成 の順に決めていくと、手順が整理できる。このレシピは、1つずつ変えて違いを体験する練習台。T1キック、T2スネア、T3ハット、T4ベース、T5コード、T6リード。'),
 SV('① テンポを変える','同じパターンでも、テンポが変わるだけで印象は大きく変わる。速いと前のめり、遅いとゆったり。聴き比べよう。',{cmp:[{l:'BPM 80',s:{sBpm:80}},{l:'BPM 120',s:{sBpm:120}},{l:'BPM 170',s:{sBpm:170}}]}),
 SV('② リズムを変える','ハットの跳ね方(スウィング)を変えると、同じBPMでも、まっすぐにも、ゆるくも聞こえる。',{cmp:[{l:'0%',s:{sSwing:0}},{l:'25%',s:{sSwing:.25}},{l:'50%',s:{sSwing:.5}}]}),
 SV('③ 音色を変える','ベースだけ、コードだけ、と音色の役割を切り替えて聴く。どの音が「らしさ」を決めているかを探す。',{cmp:[{l:'ドラムだけ',mt:[3,4,5]},{l:'+ベース',mt:[4,5]},{l:'+コード',mt:[5]},{l:'全部',mt:[]}]}),
 SV('④ 和声を変える','コードの動きを変えると、色が変わる。ここは【コード進行】を、4つのコードでぐるぐる回している。TH章で学んだ型を入れ替えて試そう。'),
 SV('⑤ 構成を考える','足し引きで場面を作る。キックだけから始めて、順に足していくと、1つの曲の流れになる。聴き比べよう。',{cmp:[{l:'キックだけ',mt:[1,2,3,4,5]},{l:'+ベース',mt:[1,2,4,5]},{l:'+コード',mt:[1,2,5]},{l:'全部',mt:[]}]}),
 SV('どれが一番ゆったり?','聴き比べて、一番ゆったり聞こえるテンポを選ぼう。',{cmp:[{l:'1',s:{sBpm:170}},{l:'2',s:{sBpm:80}},{l:'3',s:{sBpm:120}}],quiz:Q('一番ゆったりしているのは?',2,'2が一番遅い。同じパターンでも、テンポが遅いほどゆったり聞こえる。')}),
 SV('レシピを保存','「レシピ保存」でこのセットを保存できる。好きなジャンルを1つ選び、5つの順番で自分なりの「風」を作ってみよう。',{col:{h:'風は特徴の組み合わせ',b:'「〇〇風」は、特定の曲をなぞるのではなく、テンポ・リズム・音色・和声・構成という特徴の組み合わせ。傾向をつかんだら、自分の音として組み直すのが一番の近道になる。'}})
]})
);
})();
