/* v5.8 AD 上級: 攻めた音作り(ad01〜ad12)。年号・人名・曲名・機種名は書かない。ad10 は近似(本物のリサンプルは不可) */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags})};
 A('algo','アルゴリズム','あるごりずむ','algorithm','FMで、オペレーターの変調のつなぎ方。つなぎ方で倍音の出方が大きく変わる。',['ad01'],['FM']);
 A('fbk','フィードバック','ふぃーどばっく','feedback','出力の一部を入力に戻すこと。FMでは音が荒く、ディレイでは余韻がくり返される。',['ad01','ad09'],['FM']);
 A('waveshape','ウェーブシェイプ','うぇーぶしぇいぷ','waveshaping','波形を歪ませて形を変え、倍音を作り出す方法。歪みもその一種。',['ad02'],['音作り']);
 A('parallel','パラレル処理','ぱられるしょり','parallel processing','原音と加工した音を別々に用意して混ぜること。原音の重さを保ったまま質感を足せる。',['ad03'],['ミックス']);
 A('growl','グロウル','ぐろうる','growl','うなるような、声に近い荒い低音の質感。多段の揺れと歪みで作る。',['ad06'],['ベース']);
 A('alias','エイリアス','えいりあす','aliasing','細かさが足りず、本来無い高い音がまぎれ込む現象。デジタルな荒れとして使える。',['ad09'],['デジタル']);
 A('resample','リサンプル','りさんぷる','resample','作った音をいったん録り直し、それを素材としてさらに加工すること。',['ad10'],['音作り']);
 SD.CATS.push({id:'adv1',synth:'analog',chapter:'course',course:'AD',name:'AD 上級: 攻めた音作り'});
 var P=SD.PATS,TK=P.tk;
 var AD=function(o){return Object.assign({cat:'adv1',synth:'analog',lv:3,course:'AD',kind:'recipe',oct:0},o)};
 var AT=function(o){return Object.assign({cat:'adv1',synth:'analog',lv:3,course:'AD',kind:'recipe',mode:'trk',tab:'trk',ts:0,oct:-1},o)};
 var K0={o1Wave:'sawtooth',o1Lvl:.8,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:20000,res:0,envAmt:0,keyTrack:0,drive:0,aA:.003,aD:.3,aS:.8,aR:.2,glide:0,lfoFilter:0,lfoPitch:0,lfoAmp:0,dlyMix:0,rvbMix:0};
 var FI={fAlg:'4',f1Lvl:80,f2Lvl:0,f2Coarse:2,f3Lvl:0,f3Coarse:3,f4Lvl:0,f4Coarse:5,fFb:0,f1A:.002,f1D:.5,f1S:.7,f1R:.2};
 var BP=function(name,p){return TK('bass',P.bassPattern('syncop',0),name,{scale:'minor',p:p})};
 var SUB={o1Wave:'sine',o1Lvl:.9,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:900,res:0,envAmt:0,drive:0,aA:.004,aD:.3,aS:.9,aR:.12};
 var MID={o1Wave:'sawtooth',o1Lvl:.7,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'highpass',cutoff:220,res:.1,envAmt:0,drive:.2,aA:.004,aD:.25,aS:.7,aR:.1};
 SD.LESSONS.push(
AD({id:'ad01',synth:'fm',pre:['ld04'],terms:['algo','fm','fbk','overtone'],save:{name:'多段変調',kind:'patch'},title:'多段変調',sub:'アルゴリズムとフィードバックで倍音を設計',demo:{n:[48,55,48,60],gap:.6,len:.5},init:FI,steps:[
 {h:'並列の変調',b:'【アルゴリズム】はOPの変調のつなぎ方。アルゴリズム4では、OP2・OP3・OP4がすべてOP1を直接揺らす。揺らす側が並んでいるので、倍音は足し算のように増える。まず基準として聴こう。',f:[['fAlg','4']],tab:'algo'},
 {h:'揺らす量を足す',b:'OP2のLEVELを30、OP3を25、OP4を20にしよう。3つのモジュレーターが同時にOP1を揺らして、倍音が重なっていく。',f:[['f2Lvl',30],['f3Lvl',25],['f4Lvl',20]],tab:'op2',tol:.1},
 {h:'直列に変える',b:'アルゴリズム1にしよう。4→3→2→1の一直線で、揺らす側がさらに揺らされる。倍音が複雑に散らばって、同じLEVELでも音が鋭くなる。',f:[['fAlg','1']],tab:'algo'},
 {h:'つなぎ方を聴き比べる',b:'同じLEVELでも、つなぎ方で音の性格が変わる。聴き比べよう。',tab:'algo',cmp:[{l:'4(並列)',s:{fAlg:'4'}},{l:'2(混在)',s:{fAlg:'2'}},{l:'1(直列)',s:{fAlg:'1'}}]},
 {h:'フィードバックを足す',b:'ALGOタブのFEEDBACKを3にしよう。【フィードバック】で、OPが自分自身を揺らして、荒い倍音が加わる。',f:[['fFb',3]],tab:'algo'},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。アルゴリズムを切り替えながら、LEVELを動かして、自分の好みの鋭さを探そう。',tab:'algo',
  col:{h:'直列は強力だが暴れやすい',b:'直列の多段変調は、少しのLEVEL変化で音が大きく変わる。上げすぎると音程が不安定になるので、少しずつ動かして、狙った所で止める。'}}
]}),
AD({id:'ad02',synth:'wt',pre:['ld02'],terms:['waveshape','sat','overtone'],save:{name:'ウェーブシェイプの音',kind:'patch'},title:'ウェーブシェイプ+フィルター',sub:'波形をゆがめて倍音を作り、削って整える',demo:{n:[48,48,55,51],gap:.6,len:.5},init:{wTable:'basic',wPos:0,wWarpT:'none',wWarp:0,uVoices:1,cutoff:20000,drive:0,aA:.003,aD:.3,aS:.8,aR:.2},steps:[
 {h:'素直な波形を聴く',b:'WAVE TABLEはBASIC、POSITIONは0%。ほとんど倍音の無い、素直な波形が鳴る。ここから【ウェーブシェイプ】で、倍音を作り出す。',tab:'wave'},
 {h:'波形をゆがめる',b:'WARP TYPEをBENDにして、WARPを60%にしよう。波形の形が曲げられて、元にはなかった倍音が生まれる。',f:[['wWarpT','bend'],['wWarp',.6]],tab:'wave',tol:.08},
 {h:'歪みでさらにつぶす',b:'FXタブのDRIVEを40%にしよう。【歪み】も波形をつぶして倍音を増やす、ウェーブシェイプの一種。',f:[['drive',.4]],tab:'fx',tol:.08},
 {h:'フィルターで整える',b:'FILTERタブのCUTOFFを下げて、増えすぎた高い倍音を削ろう。作った倍音を、フィルターで必要な量だけ残す。',f:[['cutoff',2500]],tab:'filter',tol:.1},
 {h:'足す順に聴き比べる',b:'素直な波形、ゆがめた波形、歪みを足した波形、フィルターで整えた波形。',tab:'wave',cmp:[{l:'素直',s:{wWarpT:'none',wWarp:0,drive:0,cutoff:20000}},{l:'ゆがめる',s:{wWarpT:'bend',wWarp:.6,drive:0,cutoff:20000}},{l:'+歪み',s:{wWarpT:'bend',wWarp:.6,drive:.4,cutoff:20000}},{l:'+フィルター',s:{wWarpT:'bend',wWarp:.6,drive:.4,cutoff:2500}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'filter',
  col:{h:'作る→削る の順番',b:'倍音を足す処理(ゆがみ・歪み)のあとに、削る処理(フィルター)を置くと、増やした倍音の形を整えられる。順番を逆にすると、ゆがんだ結果にまた高い倍音が増えるので、結果が変わる。'}}
]}),
AT({id:'ad03',pre:['ly10'],terms:['parallel','sat','low'],save:{name:'並列の歪みベース',kind:'kit'},title:'並列処理',sub:'原音と歪みを別トラックで混ぜる',demo:{n:[33]},
 tk:[TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}}),BP('原音(サブ)',SUB),BP('歪み(並列)',Object.assign({},MID,{drive:.9,cutoff:300,o1Lvl:.5}))],steps:[
 {h:'3つのトラックを聴く',b:'T1はキック。T2は原音のサブ、T3は同じ音符を、強く歪ませた別の音。【パラレル処理】は、原音と加工した音を別々に用意して、混ぜる方法。',tab:'trk'},
 {h:'歪みを足す前後を聴き比べる',b:'原音だけ、歪みだけ、混ぜた音。混ぜると、低音の重さを保ったまま、荒さが加わる。',tab:'trk',cmp:[{l:'原音だけ',mt:[2]},{l:'歪みだけ',mt:[1]},{l:'混ぜる',mt:[]}]},
 {h:'どれが混ぜた音?',b:'聴き比べて、重さと荒さの両方が聞こえるものを選ぼう。',tab:'trk',cmp:[{l:'1',mt:[1]},{l:'2',mt:[]},{l:'3',mt:[2]}],quiz:{q:'重さと荒さが両方あるのは?',ans:2,ex:'2が混ぜた音。1は原音だけで重いが荒さが無く、3は歪みだけで荒いが重さが痩せる。'}},
 {h:'混ぜる量を決める',b:'MIXタブのVOLで、歪みの量を調整できる。歪みを上げると荒く、下げると重く。曲に合う量を探そう。',tab:'trk'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。',tab:'trk',
  col:{h:'1つの音を強く歪ませない理由',b:'低い音を強く歪ませると、波形がつぶれて重さが痩せやすい。原音を別に残して並列で混ぜると、重さと荒さを独立して調整できる。'}}
]}),
AD({id:'ad04',synth:'add',pre:['pd04'],terms:['overtone','formant','waveshape'],save:{name:'倍音設計の音',kind:'patch'},title:'倍音の外科手術',sub:'アディティブで倍音を作り直す',demo:{n:[48,55,60,64],gap:.8,len:.7},init:{adSpec:'saw',adN:32,adTilt:0,adOddEven:0,adFmt:'off',adA:.005,adR:.3},steps:[
 {h:'ノコギリ波の倍音',b:'SPECTRUMタブで、ノコギリ波の倍音の並びを見よう。すべての倍音が、高い方ほど小さく並ぶ。ここから、倍音を直接いじっていく。',tab:'spec'},
 {h:'偶数倍音を削る',b:'ODD/EVENを-100%にしよう。偶数番目の倍音が消えて、奇数だけが残る。矩形波に近い、中空的な音になる。',f:[['adOddEven',-100]],tab:'spec',tol:.1},
 {h:'高い倍音を削る',b:'TILTを-50%にしよう。高い倍音ほど弱くなって、音がこもって暗くなる。',f:[['adTilt',-50]],tab:'spec',tol:.1},
 {h:'倍音の数を減らす',b:'HARMONICSを8にしよう。使う倍音が8本だけになる。少ない倍音で、シンプルな音になる。',f:[['adN',8]],tab:'spec'},
 {h:'手術の前後を聴き比べる',b:'元のノコギリ波、偶数を削った音、さらに高域も削った音。倍音の並びで、音色がはっきり変わる。',tab:'spec',cmp:[{l:'元',s:{adOddEven:0,adTilt:0,adN:32}},{l:'偶数を削る',s:{adOddEven:-100,adTilt:0,adN:32}},{l:'+高域も',s:{adOddEven:-100,adTilt:-50,adN:8}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'spec',
  col:{h:'フィルターとの違い',b:'フィルターは、ある帯域をまとめて削る。アディティブは、倍音を1本ずつ選べるので、「3番目だけ残す」のような、フィルターではできない細かい設計ができる。'}}
]}),
AD({id:'ad05',synth:'wt',pre:['pd04'],terms:['formant','res','lpf'],save:{name:'声の質感リード',kind:'patch'},title:'フォルマントで声に',sub:'母音のテーブルとフィルターで声に近づける',demo:{n:[55,57,60,57],gap:.7,len:.6},init:{wTable:'vowel',wPos:0,uVoices:1,fType:'lowpass',cutoff:20000,res:0,aA:.01,aD:.3,aS:.8,aR:.3},steps:[
 {h:'母音のテーブルを選ぶ',b:'WAVE TABLEをVOWELにしよう。母音の【フォルマント】の形を持った波形が並んでいる。POSITIONを動かすと、母音が移り変わる。',f:[['wTable','vowel']],tab:'wave'},
 {h:'母音の位置を決める',b:'POSITIONを35%にしよう。母音のあいだを、好みの位置に決める。',f:[['wPos',.35]],tab:'wave',tol:.08},
 {h:'共鳴を足す',b:'FILTERタブのCUTOFFを下げて、RESを40%にしよう。【レゾナンス】でカットオフ付近が強まり、声の響きの山が強調される。',f:[['cutoff',2000],['res',.4]],tab:'filter',tol:.1},
 {h:'母音の位置を聴き比べる',b:'POSITIONを変えるだけで、母音が変わって聞こえる。',tab:'wave',cmp:[{l:'0%',s:{wPos:0}},{l:'35%',s:{wPos:.35}},{l:'70%',s:{wPos:.7}},{l:'100%',s:{wPos:1}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'wave',
  col:{h:'近似であること',b:'ここで作る声は、母音の響きだけを真似たもので、子音や息づかい、音程の揺れまでは含まない。声の「雰囲気」を足す素材として使うのが向いている。'}}
]}),
AD({id:'ad06',pre:['bs06'],terms:['growl','lfo','res','sat'],save:{name:'グロウル',kind:'patch'},title:'グロウル(うなり)の作り方',sub:'多段の揺れ・歪み・荒さを重ねる',demo:{n:[33,33,36,31],gap:.8,len:.7},init:Object.assign({},K0,{o1Lvl:.8,subLvl:.4,cutoff:1500,res:.3,aS:.9}),steps:[
 {h:'静かな音を基準にする',b:'揺れも歪みも無い、ノコギリ波の低音。ここから「うなり」を重ねていく。',tab:'filter'},
 {h:'フィルターを速く揺らす',b:'LFOのRATEを6Hz、→FILTERを2.5オクターブにしよう。【LFO】でカットオフが速く開閉して、「ウォウウォウ」という揺れが生まれる。',f:[['lfoRate',6],['lfoFilter',2.5]],tab:'lfo',tol:.1},
 {h:'共鳴を強める',b:'RESを55%にしよう。【レゾナンス】で、揺れの山が強調されて、声のような響きになる。',f:[['res',.55]],tab:'filter',tol:.08},
 {h:'歪みで荒くする',b:'DRIVEを50%にしよう。【歪み】で倍音が増え、うなりが太く荒くなる。',f:[['drive',.5]],tab:'fx',tol:.08},
 {h:'ビットクラッシュを足す',b:'BITCRUSHをONにして、BITSを8、BC MIXを40%にしよう。デジタルな荒さが加わって、【グロウル】の質感になる。',f:[['bcOn',1],['bcBits',8],['bcMix',.4]],tab:'fx',tol:.08},
 {h:'重ねる順に聴き比べる',b:'揺れだけ、揺れ+共鳴、全部。重ねるほど、うなりが強くなる。',tab:'fx',cmp:[{l:'揺れだけ',s:{lfoFilter:2.5,res:.3,drive:0,bcOn:0}},{l:'+共鳴',s:{lfoFilter:2.5,res:.55,drive:0,bcOn:0}},{l:'全部',s:{lfoFilter:2.5,res:.55,drive:.5,bcOn:1,bcBits:8,bcMix:.4}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。LFOのRATEを変えると、うなりの速さが変わる。',tab:'lfo',
  col:{h:'重ねすぎると輪郭が消える',b:'揺れ・歪み・荒さを全部上げると、音程が分からなくなる。曲の中で使うときは、高音域のレイヤーを別に足して、輪郭を補うことが多い。'}}
]}),
AD({id:'ad07',pre:['ld05'],terms:['lfo','fenv','lpf','vibrato'],save:{name:'重ねて動く音',kind:'patch'},title:'変調を重ねる',sub:'エンベロープとLFOを組み合わせて動かす',demo:{n:[60,64,67,64],gap:.7,len:.6},init:Object.assign({},K0,{cutoff:900,res:.2,aS:.7}),steps:[
 {h:'動かない音を基準にする',b:'CUTOFFが固定の音。この上に、いくつもの動きを重ねていく。',tab:'filter'},
 {h:'エンベロープで出だしを動かす',b:'ENV AMTを2オクターブ、F.ENV Dを300msにしよう。【フィルターエンベロープ】で、音ごとの出だしが明るく開く。',f:[['envAmt',2],['fD',.3]],tab:'filter',tol:.1},
 {h:'LFOでゆっくり揺らす',b:'LFOのRATEを0.8Hz、→FILTERを0.8オクターブにしよう。出だしの動きの上に、ゆっくりした周期の動きが重なる。',f:[['lfoRate',.8],['lfoFilter',.8]],tab:'lfo',tol:.1},
 {h:'音程にも揺れを足す',b:'→PITCHを0.2半音にしよう。【ビブラート】程度のかすかな揺れで、音が生きてくる。',f:[['lfoPitch',.2]],tab:'lfo',tol:.1},
 {h:'重ねた数を聴き比べる',b:'動きが1つ、2つ、3つと増えると、音が複雑に生きてくる。',tab:'lfo',cmp:[{l:'1つ',s:{envAmt:2,lfoFilter:0,lfoPitch:0}},{l:'2つ',s:{envAmt:2,lfoFilter:.8,lfoPitch:0}},{l:'3つ',s:{envAmt:2,lfoFilter:.8,lfoPitch:.2}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'lfo',
  col:{h:'周期のちがう動きを重ねる',b:'エンベロープは音ごと、LFOはゆっくり周期的、手動のオートメーションは曲の展開と、動きの時間の長さがちがう。時間の長さがちがう動きを重ねると、同じ音がくり返されても、聞こえ方が毎回少しずつ変わる。'}}
]}),
AT({id:'ad08',pre:['ly14'],terms:['sub','mid','hmid','low','noise'],save:{name:'3帯域の質感',kind:'kit'},title:'周波数ごとの質感設計',sub:'低域はサイン・中域は歪み・高域はノイズ',demo:{n:[33]},
 tk:[BP('低域:サイン',SUB),BP('中域:歪み',Object.assign({},MID,{drive:.5,cutoff:250})),TK('bass',P.bassPattern('eighth',0),'高域:ノイズ',{scale:'minor',p:{o1Lvl:0,noiseLvl:.5,nHP:6000,aA:.001,aD:.06,aS:0,aR:.03}})],steps:[
 {h:'3つの帯域を3つの音で',b:'T1は【サブ】にサイン波、T2は【ミッド】に歪んだノコギリ波、T3は高い帯域に【ホワイトノイズ】。それぞれが担当する帯域に、ふさわしい質感を割り当てている。',tab:'trk'},
 {h:'1つずつ聴く',b:'低域のサイン、中域の歪み、高域のノイズ。単独だと不完全だが、重ねると1つの音になる。',tab:'trk',cmp:[{l:'低域',mt:[1,2]},{l:'中域',mt:[0,2]},{l:'高域',mt:[0,1]},{l:'全部',mt:[]}]},
 {h:'どれが高域?',b:'聴き比べて、きらきらした細かい粒だけが鳴っているものを選ぼう。',tab:'trk',cmp:[{l:'1',mt:[0,1]},{l:'2',mt:[1,2]},{l:'3',mt:[0,2]}],quiz:{q:'高域のノイズだけは?',ans:1,ex:'1が高域のノイズだけ。2は低域のサイン、3は中域の歪みだけ。'}},
 {h:'帯域ごとに素材を選ぶ',b:'低域はきれいな波形、中域は倍音の多い波形、高域は粒状のノイズ。担当する帯域に合う素材を選ぶのが、質感設計の考え方。',tab:'trk'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。VOLで、3帯域のバランスを変えてみよう。',tab:'trk',
  col:{h:'帯域のすき間を意識する',b:'3つの音が同じ帯域を使うと濁る。帯域が重ならないように、ハイパスやローパスで棲み分けると、まとまりと分離のよさが両立する。'}}
]}),
AD({id:'ad09',pre:['fx09'],terms:['alias','bitcrush','fbk','delay'],save:{name:'破綻させた音',kind:'patch'},title:'破綻させて使う',sub:'ビット・エイリアス・フィードバックで荒らす',demo:{n:[60,64,67,72],gap:.7,len:.5},init:Object.assign({},K0,{o1Lvl:.7,cutoff:8000,bcOn:0,bcBits:16,bcRate:1,bcMix:1,dlyTime:.25,dlyFb:.3,dlyMix:0}),steps:[
 {h:'きれいな音を基準にする',b:'何も壊していないノコギリ波。ここから、わざと壊して、使える荒さに変える。',tab:'fx'},
 {h:'ビット数を落とす',b:'BITCRUSHをONにして、BITSを4にしよう。音の段階が粗くなって、ざらざらした歪みが出る。',f:[['bcOn',1],['bcBits',4]],tab:'fx'},
 {h:'間引きでエイリアスを出す',b:'RATEを12にしよう。サンプルを間引くと、本来無い高い音がまぎれ込む。これが【エイリアス】で、金属的で不協和な響きになる。',f:[['bcRate',12]],tab:'fx',tol:.1},
 {h:'ディレイで暴走させる',b:'DLY MIXを40%、DLY FBを85%にしよう。【フィードバック】が大きいと、くり返しが重なって、音が膨らむ。',f:[['dlyMix',.4],['dlyFb',.85]],tab:'fx',tol:.05},
 {h:'壊し方を聴き比べる',b:'きれいな音、ビット数を落とした音、エイリアスも出した音。',tab:'fx',cmp:[{l:'きれい',s:{bcOn:0,dlyMix:0}},{l:'ビット',s:{bcOn:1,bcBits:4,bcRate:1,dlyMix:0}},{l:'+エイリアス',s:{bcOn:1,bcBits:4,bcRate:12,dlyMix:0}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。フィードバックは上げすぎると暴走するので、音量に注意。',tab:'fx',
  col:{h:'壊し方にも制御は要る',b:'荒さは、量を決めて使うから効果になる。最初に全部を壊すのではなく、ミックスの割合で混ぜて、足す量を少しずつ決めるのが基本。'}}
]}),
AD({id:'ad10',lv:3,pre:['ad03'],terms:['resample','sat','lpf','bitcrush'],save:{name:'リサンプル風',kind:'patch'},title:'リサンプル風の処理(近似)',sub:'歪ませる→削る→また歪ませる',demo:{n:[48,55,48,60],gap:.6,len:.5},init:Object.assign({},K0,{cutoff:20000,eqOn:0,eqLpf:20000,bcOn:0}),steps:[
 {h:'流れの考え方',b:'【リサンプル】は、作った音をいったん録り直して、それを素材として、さらに加工する方法。このアプリには録り直しがないので、効果の順番を重ねて、近い質感を作る。',tab:'fx'},
 {h:'1段目: 歪ませる',b:'DRIVEを50%にしよう。倍音がたくさん生まれる。',f:[['drive',.5]],tab:'fx',tol:.08},
 {h:'2段目: 削る',b:'EQをONにして、LPFを3.0kHzにしよう。1段目で増えた高い倍音を、ローパスで整える。',f:[['eqOn',1],['eqLpf',3000]],tab:'fx',tol:.1},
 {h:'3段目: 荒らす',b:'BITCRUSHをONにして、BITSを8にしよう。整えた音を、さらにデジタルに荒らす。録り直して加工したような、複雑な質感になる。',f:[['bcOn',1],['bcBits',8]],tab:'fx'},
 {h:'段を増やして聴き比べる',b:'原音、1段、2段、3段。段が増えるほど、元の音からかけ離れていく。',tab:'fx',cmp:[{l:'原音',s:{drive:0,eqOn:0,bcOn:0}},{l:'1段',s:{drive:.5,eqOn:0,bcOn:0}},{l:'2段',s:{drive:.5,eqOn:1,eqLpf:3000,bcOn:0}},{l:'3段',s:{drive:.5,eqOn:1,eqLpf:3000,bcOn:1,bcBits:8}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'fx',
  col:{h:'本物のリサンプルとの違い',b:'本物のリサンプルは、録り直した音を、さらにピッチや時間まで変えて加工できる。ここでの処理は、エフェクトの順番を重ねただけの近似で、録り直しの自由度はない。'}}
]}),
AD({id:'ad11',pre:['th08'],terms:['attack','overtone','lfo','noise'],save:{name:'らしさの4要素',kind:'patch'},title:'音色の「らしさ」を作る要素',sub:'立ち上がり・倍音・揺らぎ・ノイズ',demo:{n:[60,64,67,64],gap:.8,len:.7},init:Object.assign({},K0,{cutoff:1800,aA:.002,aS:.8,lfoPitch:0,noiseLvl:0}),steps:[
 {h:'4つの要素',b:'音色の個性は、立ち上がり(【アタック】)・【倍音】の量・揺らぎ・ノイズの4つで説明できる。同じ音程でも、この4つが変わると、別の楽器のように聞こえる。',tab:'env'},
 {h:'立ち上がりを変える',b:'AMP Aを150msにしよう。出だしがゆっくりになって、息を吹き込むような楽器に近づく。',f:[['aA',.15]],tab:'env',tol:.1},
 {h:'倍音を変える',b:'CUTOFFを下げて、倍音を減らそう。高い倍音が減ると、丸く、やわらかい音色になる。',f:[['cutoff',900]],tab:'filter',tol:.1},
 {h:'揺らぎを足す',b:'LFOの→PITCHを0.2半音にしよう。わずかな音程の揺れが、機械的でない、人の演奏らしさを出す。',f:[['lfoPitch',.2]],tab:'lfo',tol:.1},
 {h:'ノイズを足す',b:'ノイズのレベルを10%にしよう。かすかな息の音が加わって、リアルな質感が出る。',f:[['noiseLvl',.1]],tab:'osc',tol:.05},
 {h:'要素を足す前後を聴き比べる',b:'4つの要素を足す前と後を聴こう。',tab:'osc',cmp:[{l:'足す前',s:{aA:.002,cutoff:1800,lfoPitch:0,noiseLvl:0}},{l:'足した後',s:{aA:.15,cutoff:900,lfoPitch:.2,noiseLvl:.1}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。聴いた音を分析するときも、この4つの視点が使える。',tab:'osc',
  col:{h:'分析の道具として使う',b:'好きな音を聴いたら、「立ち上がりは速いか」「倍音は多いか」「揺れているか」「ノイズが混じるか」と順に聞くと、何を真似ればよいかが見えてくる。'}}
]}),
AD({id:'ad12',kind:'read',pre:['ad11'],terms:['overtone','layer'],title:'自分の音をレシピにする',sub:'整理して、名前を付けて、残す',demo:{n:[60,64,67],gap:.8,len:.7},init:Object.assign({},K0,{cutoff:3000}),steps:[
 {h:'音を作ったら名前を付ける',b:'作った音は、どんな役目で、どんな特徴か、一言で名前を付けて残そう。「太いサブ」「明るいプラック」のように、あとで探しやすい名前がよい。',tab:'filter'},
 {h:'音色リストに保存する',b:'音色の保存は、画面上部の保存ボタンから。1つのトラックの音色は音色リストに、複数のトラックの組み合わせはトラックセットに保存できる。',tab:'filter'},
 {h:'レシピ保存を使い分ける',b:'この章のレッスンの「レシピ保存」は、その場の音色やセットを、そのまま残せる。作った音は、似た音と並べて聴き比べると、違いが整理できる。',tab:'filter',cmp:[{l:'暗め',s:{cutoff:1200}},{l:'標準',s:{cutoff:3000}},{l:'明るめ',s:{cutoff:8000}}],
  col:{h:'道具の使い方より、聴く耳',b:'つまみの動かし方は、数をこなせば身につく。大事なのは、「この音は、何が足りないか」を聴き取る耳。この道場のレッスンで、聴き比べに時間をかけたのは、そのため。'}}
]})
 );
})();
