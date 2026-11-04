/* SP コース(sp01〜sp06。LS-sp1・LS-sp2)。スペクトル(マスターFXラックの SPECTRAL。つまみID接頭辞 sp)。年号・人名・機材名は書かない。
   SPECTRAL は音をFFTで周波数ごとに分けて加工する。SIZE=窓の長さ(1024=約21ms遅れ・2048=約43ms遅れ)。最も重い=「負荷:高」。
   曲はトラックモード(キック・ハット・ベース・メロディ)。cmp.g(音量補正)は未測定=README の申し送り参照 */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags})};
 A('fft','FFT','えふえふてぃー','FFT','音を、周波数ごとの強さに分けて調べる計算。ごく短い区間(窓)ごとに行うので、窓が長いほど周波数は細かく分かるが、そのぶん遅れる。',['sp01'],['エフェクト']);
 A('spfreeze','フリーズ','ふりーず','freeze','いまの音の周波数の形を保持して、鳴らし続けること。入力が止まっても、同じ響きが残る。',['sp02'],['エフェクト']);
 SD.CATS.push({id:'sp1',synth:'analog',chapter:'course',course:'SP',name:'SP スペクトル'});
 var P=SD.PATS,TK=P.tk;
 var FT=function(o){return Object.assign({cat:'sp1',synth:'analog',lv:2,course:'SP',kind:'recipe',mode:'trk',tab:'trk',ts:0,oct:0,pre:['fx07']},o)};
 var KIT=function(){return[TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}}),TK('hat',P.offbeatHat(),'ハット'),TK('bass',P.bassPattern('syncop',0),'ベース',{scale:'minor',p:{o1Wave:'sawtooth',o1Lvl:.7,cutoff:900,aD:.25,aS:.7,aR:.1}}),TK('bass',P.walk('step'),'メロディ',{scale:'minor',tr:24,p:{o1Wave:'square',o1Lvl:.5,cutoff:3000,aD:.2,aS:.3,aR:.1}})]};
 var I0={spOn:0,spMode:0,spAmt:.5,spFz:0,spTilt:0,spSize:0,spMix:1};
 SD.LESSONS.push(
FT({id:'sp01',terms:['fft'],save:{name:'周波数を見る',kind:'kit'},title:'周波数を見る',sub:'FFTの窓と、窓が長いと遅れるわけ',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0),steps:[
 {h:'音を聴く',b:'低いキックとベース、高いハットとメロディが混ざって鳴っている。1つの音の中に、いろいろな高さの成分が重なっている。',tab:'trk'},
 {h:'SPECTRALをONにする',b:'FXタブで SPECTRAL をONにしよう。AMOUNT を0にすると、何も加工しない。音は変わらないまま、中でFFTを行っている。「負荷:高」と表示されるように、とても重いエフェクトなので、使うときだけONにしよう。',f:[['spOn',1],['spAmt',0]],tab:'fx',tol:.02},
 {h:'FFTとは',b:'【FFT】は、音を周波数ごとの強さに分けて調べる計算。ごく短い区間(窓)ごとに行う。窓が長いほど周波数は細かく分かるが、1つの窓がたまるまで待つので、そのぶん音が遅れる。',tab:'fx'},
 {h:'窓を長くする',b:'SIZE を長いほうに切り替えよう。窓が2倍の長さになって、周波数が細かく分かる。そのかわり、遅れも約2倍になる。',f:[['spSize',1]],tab:'fx'},
 {h:'聴き比べる',b:'元の音、SIZEが短い場合、SIZEが長い場合を聴き比べよう。どちらも加工はしていない。音の中身は同じだが、出てくるタイミングが少し違う。',tab:'fx',cmp:[{l:'元の音',s:{spOn:0}},{l:'SIZE 短い',s:{spOn:1,spAmt:0,spSize:0}},{l:'SIZE 長い',s:{spOn:1,spAmt:0,spSize:1}}],quiz:{q:'窓が長いほど、大きくなるのは?',ans:3,ex:'3が正解。窓が長いと周波数は細かく分かるが、窓がたまるまで待つので、遅れが大きくなる。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。SPECTRAL は、原音も同じだけ遅らせるので、MIXで混ぜても音が濁らない。',tab:'fx',
  col:{h:'遅れと細かさの引き換え',b:'周波数の細かさと、時間の細かさは、両方は手に入らない。窓を長くすれば周波数は細かく見えるが、時間はぼやける。窓を短くすれば、時間は細かいが、周波数はぼやける。どちらを取るかは、目的しだい。'}}
]}),
FT({id:'sp02',pre:['sp01'],terms:['spfreeze'],save:{name:'フリーズ',kind:'kit'},title:'FREEZE',sub:'一瞬の響きを引き伸ばしてパッドにする',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{spOn:1,spAmt:0}),steps:[
 {h:'普通に聴く',b:'SPECTRAL がONで、AMOUNT は0。音は加工されていない。メロディもベースも、鳴って消えていく。',tab:'fx'},
 {h:'FREEZEをONにする',b:'再生しながら、好きなタイミングで FREEZE をONにしよう。ONにした瞬間の音が保持されて、鳴り続ける。これが【フリーズ】。',f:[['spFz',1]],tab:'fx'},
 {h:'何が起きているか',b:'FREEZEは、ONにした瞬間の周波数の形を覚えて、それを鳴らし続ける。入力が止まっても、同じ響きが残る。パッドのような持続音になる。',tab:'fx'},
 {h:'OFFにして戻す',b:'FREEZE をOFFにしよう。入力の音に戻る。',f:[['spFz',0]],tab:'fx'},
 {h:'聴き比べる',b:'通常、FREEZE、FREEZE+BLURを聴き比べよう。FREEZEは、止まったように鳴り続ける。BLURを足すと、にじんだ響きになる。',tab:'fx',cmp:[{l:'通常',s:{spOn:1,spAmt:0,spFz:0}},{l:'FREEZE',s:{spOn:1,spAmt:0,spFz:1}},{l:'FREEZE+BLUR',s:{spOn:1,spMode:0,spAmt:.7,spFz:1}}],quiz:{q:'入力の音が変わっても、同じ響きが鳴り続けるのは?',ans:2,ex:'2が正解。FREEZEは、ONにした瞬間の周波数の形を保持する。1は入力に追従して、音が変わっていく。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。FREEZEはレーンでも切り替えられる。場面の転換に使えそうだ。',tab:'fx',
  col:{h:'短い音を長く',b:'一瞬の音も、フリーズすれば何秒でも引き伸ばせる。キックやメロディの一音を、パッドや環境音のように変えられる。空間系のエフェクトと組み合わせると、さらに広がる。'}}
]}),
FT({id:'sp03',pre:['sp02'],terms:['fft'],save:{name:'BLUR',kind:'kit'},title:'BLUR',sub:'周波数方向のにじみ',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{spOn:1,spMode:0,spAmt:0}),steps:[
 {h:'加工なしで聴く',b:'SPECTRAL がONで、MODE は BLUR、AMOUNT は0。音は加工されていない。基準にしよう。',tab:'fx'},
 {h:'AMOUNTを上げる',b:'AMOUNT を50%にしよう。周波数の成分が、隣りどうしで混ざる。輪郭がぼやけて、にじんだ音になる。',f:[['spAmt',.5]],tab:'fx',tol:.05},
 {h:'もっとぼかす',b:'AMOUNT を100%にしよう。さらに強くにじんで、音の輪郭がほとんど分からなくなる。',f:[['spAmt',1]],tab:'fx',tol:.05},
 {h:'聴き比べる',b:'AMOUNT 0%、50%、100%を聴き比べよう。',tab:'fx',cmp:[{l:'0%',s:{spOn:1,spMode:0,spAmt:0}},{l:'50%',s:{spOn:1,spMode:0,spAmt:.5}},{l:'100%',s:{spOn:1,spMode:0,spAmt:1}}],quiz:{q:'音の輪郭が、いちばんぼやけるのは?',ans:3,ex:'3が正解。BLURは、AMOUNTが大きいほど周波数が隣りどうしで混ざり、音の輪郭がぼやける。'}},
 {h:'TILTで偏らせる',b:'TILT を+側にしよう。高域ほど強くぼかされて、低域はくっきり残る。-側だと逆になる。',f:[['spTilt',.6]],tab:'fx',tol:.2},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。',tab:'fx',
  col:{h:'リバーブとは別のにじみ',b:'リバーブは時間方向に音を伸ばす。BLURは周波数方向に音をにじませる。同じ「ぼやけ」でも、聞こえ方がちがう。2つを重ねると、輪郭のない、霧のような音になる。'}}
]}),
FT({id:'sp04',pre:['sp03'],terms:[],save:{name:'スペクトルゲート',kind:'kit'},title:'スペクトルゲート',sub:'弱い成分だけを消す(ノイズ除去と加工の違い)',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{spOn:1,spMode:1,spAmt:0}),steps:[
 {h:'加工なしで聴く',b:'SPECTRAL がONで、MODE は GATE、AMOUNT は0。音は加工されていない。基準にしよう。',tab:'fx'},
 {h:'弱い成分を消す',b:'AMOUNT を40%にしよう。周波数ごとに、弱い成分だけが消える。強い成分は残るので、音の芯だけが残って、すかすかした音になる。',f:[['spAmt',.4]],tab:'fx',tol:.05},
 {h:'もっと消す',b:'AMOUNT を80%にしよう。強い成分のうち、さらに多くが消えて、音の骨組みだけのようになる。',f:[['spAmt',.8]],tab:'fx',tol:.05},
 {h:'聴き比べる',b:'AMOUNT 0%、40%、80%を聴き比べよう。',tab:'fx',cmp:[{l:'0%',s:{spOn:1,spMode:1,spAmt:0}},{l:'40%',s:{spOn:1,spMode:1,spAmt:.4}},{l:'80%',s:{spOn:1,spMode:1,spAmt:.8}}],quiz:{q:'音の芯だけが残って、すかすかになるのは?',ans:3,ex:'3が正解。GATEは、弱い成分を周波数ごとに消す。AMOUNTが大きいほど、消える成分が増える。'}},
 {h:'TILTで偏らせる',b:'TILT を+側にしよう。高域の弱い成分が強く消えて、低域はそのまま残る。こもった音になる。',f:[['spTilt',.6]],tab:'fx',tol:.2},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。',tab:'fx',
  col:{h:'ノイズ除去とは別物',b:'ノイズ除去は、ノイズだけを狙って消す。ここでのGATEは、弱い成分を一律に消すだけで、何がノイズかは判断しない。そのため、音の一部も消えて、加工として聞こえる。音色を変える道具として使おう。'}}
]}),
FT({id:'sp05',pre:['sp04'],terms:[],save:{name:'ロボットとささやき',kind:'kit'},title:'ロボットとささやき',sub:'位相をそろえる/ばらす',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{spOn:1,spMode:2,spAmt:0}),steps:[
 {h:'加工なしで聴く',b:'SPECTRAL がONで、MODE は ROBOT、AMOUNT は0。音は加工されていない。基準にしよう。',tab:'fx'},
 {h:'位相をそろえる',b:'AMOUNT を70%にしよう。ROBOT は、各周波数の波のタイミング(位相)をそろえる。音が機械的なブザーのように、無機質になる。',f:[['spAmt',.7]],tab:'fx',tol:.05},
 {h:'位相をばらす',b:'MODE を WHISPER にしよう。こんどは、位相をばらばらにする。音の高さの感じが薄れて、ささやき声のような、かさかさした音になる。',f:[['spMode',3]],tab:'fx'},
 {h:'聴き比べる',b:'元の音、ROBOT、WHISPERを聴き比べよう。',tab:'fx',cmp:[{l:'元の音',s:{spOn:1,spMode:2,spAmt:0}},{l:'ROBOT',s:{spOn:1,spMode:2,spAmt:.7}},{l:'WHISPER',s:{spOn:1,spMode:3,spAmt:.7}}],quiz:{q:'位相をばらして、かさかさしたささやきのようになるのは?',ans:3,ex:'3が正解。WHISPERは位相をばらばらにするので、高さの感じが薄れて、ささやきのような音になる。2のROBOTは位相をそろえるので、機械的になる。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。同じ音を、そろえるかばらすかで、まるで別の音になる。',tab:'fx',
  col:{h:'位相は音色を決める',b:'音の周波数の成分は、強さのほかに「位相」も持つ。位相をいじっても、周波数ごとの強さは大きく変わらない。それでも、聞こえ方はまるで変わる。音色の中の、見えにくい要素。'}}
]}),
FT({id:'sp06',pre:['sp05'],terms:[],save:{name:'周波数シフトとピッチシフト',kind:'kit'},title:'周波数シフトとピッチシフト',sub:'非調和のうなりを聴く',demo:{n:[45]},tk:KIT(),init:Object.assign({},I0,{spOn:1,spMode:4,spAmt:0,psOn:0,psSh:7,psMix:1}),steps:[
 {h:'加工なしで聴く',b:'SPECTRAL がONで、MODE は SHIFT、AMOUNT は0。音は加工されていない。基準にしよう。',tab:'fx'},
 {h:'周波数をずらす',b:'AMOUNT を30%にしよう。すべての成分が、同じ周波数ぶんだけ上にずれる。倍音の並びが崩れて、音程の感じが濁る。',f:[['spAmt',.3]],tab:'fx',tol:.05},
 {h:'ピッチシフトと比べる',b:'ピッチシフトは、成分の比を保ったまま、全体を同じ割合で上げる。周波数シフトは、同じ差で上げるので、比が崩れる。',tab:'fx'},
 {h:'聴き比べる',b:'元の音、周波数シフト(SHIFT)、ピッチシフト(+7)を聴き比べよう。',tab:'fx',cmp:[{l:'元の音',s:{spOn:1,spMode:4,spAmt:0,psOn:0}},{l:'周波数シフト',s:{spOn:1,spMode:4,spAmt:.3,psOn:0}},{l:'ピッチシフト',s:{spOn:0,psOn:1,psSh:7,psMix:1}}],quiz:{q:'倍音の並びが崩れて、濁って聞こえるのは?',ans:2,ex:'2が正解。周波数シフトは、すべての成分を同じ周波数ぶん動かすので、倍音の整数倍の関係が崩れる。3のピッチシフトは、比を保つので、音程の感じが残る。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。',tab:'fx',
  col:{h:'非調和のおもしろさ',b:'倍音の関係が崩れた音は、ふつうの楽器にはない、金属的でゆがんだ響きになる。音程の感じは崩れるが、効果音や、ざらついた質感を作るのに向いている。'}}
]})
 );
})();
