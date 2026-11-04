/* v5.5 BS シンセベース(bs02〜bs13)。bs01 は course.js。年号・人名・曲名・機種名は書かない。
   TRKレシピはトラックのミュート切替(cmp.mt)で聴き比べる。ワブルのテンポ同期は AUTO FILTER の SYNC を使う */
(function(){
 var T=SD.TERMS,A=function(id,name,kana,en,def,see,tags){T.push({id:id,name:name,kana:kana,en:en,def:def,see:see,tags:tags})};
 A('res','レゾナンス','れぞなんす','resonance','フィルターのカットオフ付近を強調すること。上げるとクセのある鳴きが出る。',['bs04'],['フィルター','ベース']);
 A('wobble','ワブル','わぶる','wobble','フィルターなどを周期的に揺らして、うねらせる低音の音色。',['bs05','bs06'],['ベース']);
 A('accent','アクセント','あくせんと','accent','特定の音だけを強く、または明るく鳴らして、リズムに強弱をつけること。',['bs04'],['リズム']);
 A('ghost','ゴーストノート','ごーすとのーと','ghost note','ごく弱く鳴らす、聞こえるか聞こえないかの音。グルーヴを作る。',['bs03'],['リズム']);
 A('fenv','フィルターエンベロープ','ふぃるたーえんべろーぷ','filter envelope','音の出だしからフィルターの開き方を時間で変える仕組み。ENV AMTで深さを決める。',['bs04','bs13'],['フィルター']);
 A('penv','ピッチエンベロープ','ぴっちえんべろーぷ','pitch envelope','音の出だしだけ音程を動かし、元の高さに戻す仕組み。',['bs12'],['エンベロープ']);
 var P=SD.PATS,TK=P.tk;
 var BS=function(o){return Object.assign({cat:'bs1',synth:'analog',lv:2,course:'BS',kind:'recipe',oct:-1},o)};
 var BT=function(o){return Object.assign({cat:'bs1',synth:'analog',lv:2,course:'BS',kind:'recipe',mode:'trk',tab:'trk',ts:0,oct:-1},o)};
 var B0={o1Wave:'sine',o1Lvl:.8,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'lowpass',cutoff:20000,res:0,envAmt:0,keyTrack:0,drive:0,aA:.004,aD:.3,aS:.8,aR:.1,glide:0,lfoFilter:0,lfoPitch:0,lfoAmp:0};
 var SUB={o1Wave:'sine',o1Lvl:.4,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:900,res:0,envAmt:0,fS:0,drive:0,aA:.004,aD:.3,aS:.9,aR:.12};
 var all16=function(){var q={};for(var i=0;i<16;i++)q[i]=0;return q},sus=[1,2,3,4,5,6,7,9,10,11,12,13,14,15];
 var held=function(name,p,mix){return {id:'bass',idx:all16(),o:{name:name,scale:'minor',tie:sus,p:p,mix:mix}}};
 var bp=function(name,kind,p){return TK('bass',P.bassPattern(kind,0),name,{scale:'minor',p:p||SUB})};
 var KK=function(){return TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}})};
 var held1=[33,33,36,31],dm=function(n,g,l){return {n:n,gap:g||1.2,len:l||1.1}};
 SD.LESSONS.push(
BS({id:'bs02',pre:['bs01'],terms:['subbass','overtone','lpf','mid','sub','sat'],save:{name:'ミッド入りベース',kind:'patch'},title:'ミッドを足して聞こえるベースに',sub:'倍音を足して小さなスピーカーでも聞こえる',demo:{n:[33,33,40,33],gap:.6,len:.45},init:Object.assign({},B0,{o1Wave:'sine',o1Lvl:1}),steps:[
 {h:'サイン波だけの弱点',b:'【サブベース】は体に響くが、【倍音】が無いので、小さなスピーカーでは聞こえにくい。まず今の音を聴いて、基準にしよう。',tab:'osc'},
 {h:'ノコギリ波を足す',b:'OSC2をノコギリ波にして、音量を40%にしよう。ノコギリ波の倍音が【ミッド】の帯域に出て、低音の存在が分かるようになる。',f:[['o2Wave','sawtooth'],['o2Lvl',.4]],tab:'osc'},
 {h:'高域を削る',b:'CUTOFFを下げて、高すぎる倍音を削ろう。【ローパスフィルター】で、ベースに合う範囲に整える。',f:[['cutoff',1500]],tab:'filter'},
 {h:'歪みで倍音を増やす',b:'DRIVEを25%にしよう。【歪み】で倍音が増えて、さらに聞こえやすくなる。',f:[['drive',.25]],tab:'fx'},
 {h:'足す前後を聴き比べる',b:'サイン波だけ、ノコギリ波を足した音、足してさらに歪ませた音を聴き比べよう。',tab:'osc',cmp:[{l:'サインだけ',s:{o2Lvl:0,cutoff:20000,drive:0}},{l:'ノコギリ足す',s:{o2Lvl:.4,cutoff:1500,drive:0}},{l:'足して歪み',s:{o2Lvl:.4,cutoff:1500,drive:.25}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。スマホのスピーカーでも聴いて、低音が聞こえるか確かめよう。',tab:'osc',
  col:{h:'低域と中域は別の役目',b:'低域の重さと、中域の聞こえやすさは別のもの。両方を1つの音に持たせると、どちらも中途半端になりやすい。重ねる章では、これを2つの音に分けて作った。'}}
]}),
BT({id:'bs03',pre:['bs01'],terms:['ghost','accent','offbeat','syncope'],save:{name:'ベースのパターン',kind:'kit'},title:'鳴らすリズム(ベースのパターン)',sub:'同じ音でもリズムで性格が変わる',demo:{n:[33]},
 tk:[KK(),bp('ルート','root'),bp('八分','eighth'),bp('オクターブ','octave'),bp('シンコペ','syncop')],steps:[
 {h:'5つのトラック',b:'T1はキック。T2〜T5は、同じ音のベースを、ちがうリズムで弾いている。「▶ 試聴」で鳴らして、確かめよう。',tab:'trk'},
 {h:'リズムの型を聴き比べる',b:'キックと同じタイミング、八分音符の刻み、オクターブの跳ね、【シンコペーション】。同じ音でも、乗り方が変わる。',tab:'trk',cmp:[{l:'ルート',mt:[2,3,4]},{l:'八分',mt:[1,3,4]},{l:'オクターブ',mt:[1,2,4]},{l:'シンコペ',mt:[1,2,3]}]},
 {h:'どれが弾んでいる?',b:'聴き比べて、キックの合間を埋めて、前へ押し出すように聞こえるものを選ぼう。',tab:'trk',cmp:[{l:'1',mt:[2,3,4]},{l:'2',mt:[1,2,3]},{l:'3',mt:[1,3,4]}],quiz:{q:'キックの裏で動くのは?',ans:2,ex:'2がシンコペ。キックの位置からずれて入るので、前へ押し出される。1はキックと同じ位置、3は八分の刻み。'}},
 {h:'休符と強弱',b:'音を弾かない「休符」と、弱く弾く【ゴーストノート】が、グルーヴを作る。ベースは、全部の拍を埋めるより、あえて空けた方が目立つ。',tab:'trk'},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。パターンをミュートで切り替えながら、曲に合う型を探そう。',tab:'trk',
  col:{h:'ベースはキックと組む',b:'ベースのリズムは、単独ではなく、キックとの組み合わせで決まる。キックと同じ位置に置くと重く、キックの裏に置くと動きが出る。【アクセント】を付ける位置も、ここで決めることが多い。'}}
]}),
BS({id:'bs04',pre:['bs01'],terms:['res','accent','fenv','lpf'],save:{name:'アシッド風ベース',kind:'patch'},title:'アシッド風ベース',sub:'レゾナンスとカットオフの動きとスライド',demo:{n:[33,33,45,33,36,33],gap:.25,len:.22},init:Object.assign({},B0,{o1Wave:'sawtooth',o1Lvl:.8,aD:.2,aS:.5,aR:.06,fA:.001,fD:.2,fS:0}),steps:[
 {h:'ノコギリ波とローパス',b:'OSC1はノコギリ波。CUTOFFをかなり下げて、こもった低音にしよう。ここから、フィルターを動かして音を作る。',f:[['cutoff',500]],tab:'filter'},
 {h:'レゾナンスで鳴かせる',b:'RESを55%にしよう。【レゾナンス】は、カットオフ付近を強調する。フィルターが動くと、「ビョン」と鳴くようなクセが出る。',f:[['res',.55]],tab:'filter',tol:.08},
 {h:'出だしでフィルターを開く',b:'ENV AMTを2.5オクターブにしよう。【フィルターエンベロープ】で、音の出だしだけフィルターが開き、すぐ閉じる。',f:[['envAmt',2.5]],tab:'filter'},
 {h:'スライドでつなぐ',b:'OSCタブのGLIDEを少し上げよう。音から音へすべって、うねるような動きが出る。',f:[['glide',.06]],tab:'osc',tol:.08},
 {h:'つまみの効きを聴き比べる',b:'RESとENV AMTで、鳴き方と出だしの強さがどう変わるか聴こう。',tab:'filter',cmp:[{l:'RES低め',s:{res:.15,envAmt:2.5}},{l:'RES高め',s:{res:.55,envAmt:2.5}},{l:'ENV AMT大',s:{res:.55,envAmt:3.5}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。シーケンサーで【アクセント】を付けたり、カットオフを手で動かしたりして遊ぼう。',tab:'filter',
  col:{h:'アクセントの考え方',b:'この種類のベースは、同じ音の並びでも、強く鳴らす音を決めるだけで、表情が大きく変わる。強くする音では、ENV AMTやカットオフが効きやすく、明るく鳴る。'}}
]}),
BS({id:'bs05',pre:['bs02'],terms:['wobble','lpf','sync','bpm'],save:{name:'ワブルベース',kind:'patch'},title:'ワブルベース(基本)',sub:'フィルターを拍に合わせて揺らす',demo:dm(held1),init:Object.assign({},B0,{o1Wave:'sawtooth',o1Lvl:.8,cutoff:20000,aS:1,afOn:0,afSync:0}),steps:[
 {h:'うねる低音',b:'【ワブル】は、ローパスフィルターを周期的に開け閉めして、低音をうねらせる音。まず、うねらない音を聴こう。',tab:'fx'},
 {h:'AUTO FILTERをONにする',b:'FXタブでAUTO FILTを探して、ONにしよう。MODEはLFO、タイプはLPにして、LFOでカットオフを動かす。',f:[['afOn',1],['afMode',1],['afType',0]],tab:'fx'},
 {h:'深さと鳴きを決める',b:'AF CUTOFFを下げ、AF DEPTHを大きく、AF RESを50%にしよう。開閉の幅が広がり、うねりがはっきりする。',f:[['afCut',300],['afDepth',.85],['afRes',.5]],tab:'fx',tol:.08},
 {h:'テンポに合わせる',b:'AF SYNCをONにして、AF DIVを1/4にしよう。【同期】で、うねりがテンポの拍にぴったり合う。',f:[['afSync',1],['afDiv',3]],tab:'fx'},
 {h:'うねる速さを聴き比べる',b:'1/4、1/8、1/16でうねる速さがどう変わるか聴こう。分割が細かいほど、速く刻む。',tab:'fx',cmp:[{l:'1/4',s:{afOn:1,afSync:1,afDiv:3}},{l:'1/8',s:{afOn:1,afSync:1,afDiv:5}},{l:'1/16',s:{afOn:1,afSync:1,afDiv:7}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。テンポを変えても、うねりが拍に合い続けるのを確かめよう。',tab:'fx',
  col:{h:'波形の形で性格が変わる',b:'AF SHAPEを変えると、うねりの形が変わる。サイン波はなめらか、矩形波は開け閉めがはっきりした、刻む感じになる。'}}
]}),
BS({id:'bs06',lv:3,pre:['bs05'],terms:['wobble','sat','lfo','lpf'],save:{name:'攻めたワブル',kind:'patch'},title:'ワブルベース(攻め)',sub:'二重のうねり・歪み・音色の暴れ',demo:dm(held1),init:Object.assign({},B0,{o1Wave:'sawtooth',o1Lvl:.8,o2Wave:'square',o2Lvl:.4,o2Fine:12,cutoff:20000,aS:1,afOn:0,afSync:1,afDiv:5,lfoRate:2}),steps:[
 {h:'うねりを2つ重ねる',b:'ここでは、AUTO FILTERの拍に合ううねりに、シンセ側の【LFO】のうねりを重ねる。周期が違う2つが重なって、不規則に見える動きになる。',tab:'lfo'},
 {h:'シンセのLFOでうねらせる',b:'LFOタブで、→FILTERを2.5オクターブにしよう。RATEは、拍とは合わない値のままで、わざとずらす。',f:[['lfoFilter',2.5]],tab:'lfo'},
 {h:'拍に合ううねりも足す',b:'FXタブで、AUTO FILTをONにして、AF DIVを1/8にしよう。拍に合うカクッとした動きが、LFOのなめらかなうねりに重なる。',f:[['afOn',1],['afDiv',5]],tab:'fx'},
 {h:'歪ませる',b:'SAT TYPEをFUZZにして、DRIVEを50%にしよう。うねりで増減する倍音が歪みで強調されて、攻撃的な音になる。',f:[['saType',5],['drive',.5]],tab:'fx'},
 {h:'重ねるほど荒くなる',b:'うねりを1つ、2つ、歪みも足した音を、順に聴き比べよう。',tab:'fx',cmp:[{l:'LFOだけ',s:{afOn:0,saType:0,drive:0}},{l:'LFO+拍のうねり',s:{afOn:1,saType:0,drive:0}},{l:'さらに歪み',s:{afOn:1,saType:5,drive:.5}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'fx',
  col:{h:'動きを時間で変える',b:'同じ設定を鳴らし続けると、すぐ飽きる。曲の途中でうねりの深さや歪みを変えると、展開が作れる。つまみの動きを時間で描く方法は、オートメーションの章で学べる。'}}
]}),
BS({id:'bs07',lv:3,pre:['bs02','ly04'],terms:['detune','beat','chorus','lpf'],save:{name:'リースベース',kind:'patch'},title:'リースベース',sub:'デチューンしたノコギリ+フィルター+コーラス',demo:dm([33,33,31,36]),init:Object.assign({},B0,{o1Wave:'sawtooth',o1Lvl:.5,o2Wave:'sawtooth',o2Lvl:0,aS:1,mdOn:0}),steps:[
 {h:'2つのノコギリ波をずらす',b:'OSC2もノコギリ波にして、音量を50%、FINEを20ctにしよう。【デチューン】した2つの低音が重なって、ゆっくり大きく【うなり】が出る。',f:[['o2Wave','sawtooth'],['o2Lvl',.5],['o2Fine',20]],tab:'osc',tol:.06},
 {h:'フィルターで整える',b:'CUTOFFを下げて、うなりが聞き取りやすい範囲にしよう。【ローパスフィルター】で高域の荒さを抑える。',f:[['cutoff',1200]],tab:'filter'},
 {h:'ゆっくり動かす',b:'LFOタブで、→FILTERを0.6オクターブにして、RATEをゆっくりにしよう。うなりと、フィルターの動きが重なる。',f:[['lfoFilter',.6],['lfoRate',.4]],tab:'lfo'},
 {h:'コーラスで広げる',b:'FXタブでMODをONにして、タイプをCHORUSにしよう。【コーラス】で厚みと広がりが足される。',f:[['mdOn',1],['mdType',0]],tab:'fx'},
 {h:'ずれの量を聴き比べる',b:'ずれが小さいと穏やか、大きいと荒く唸る。',tab:'osc',cmp:[{l:'ずれ0',s:{o2Fine:0}},{l:'ずれ10',s:{o2Fine:10}},{l:'ずれ35',s:{o2Fine:35}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'osc',
  col:{h:'低域は濁りやすい',b:'低い音で大きくずらすと、うなりがゆっくりになりすぎて、音程が曖昧になる。曲の中で使うときは、ずらしすぎないことと、低域をモノに寄せることが大切。'}}
]}),
BS({id:'bs08',synth:'fm',pre:['bs02'],terms:['fm','overtone','sub'],save:{name:'FMベース',kind:'patch'},title:'FMベース',sub:'モジュレーターで太く、金属的に',demo:{n:[33,33,40,33],gap:.6,len:.45},init:{fAlg:'1',f1Lvl:80,f2Lvl:0,f3Lvl:0,f4Lvl:0,fFb:0,f1A:.002,f1D:.4,f1S:.8,f1R:.1},steps:[
 {h:'アルゴリズム1',b:'ALGOタブで、アルゴリズム1を選ぼう。OP2がOP1を揺らす。低音では、揺らす量を控えめにするのが基本。',f:[['fAlg','1']],tab:'algo'},
 {h:'周波数比は1倍',b:'OP2タブで、RATIOを1倍にしよう。キャリアと同じ周波数で揺らすと、低音の芯を残したまま、【倍音】だけが増える。',f:[['f2Coarse',1]],tab:'op2'},
 {h:'揺らす量を足す',b:'OP2のLEVELを35にしよう。サイン波に倍音が加わって、小さなスピーカーでも聞こえる低音になる。',f:[['f2Lvl',35]],tab:'op2'},
 {h:'揺らす量を聴き比べる',b:'LEVELを増やすほど、金属的で硬くなる。',tab:'op2',cmp:[{l:'0',s:{f2Lvl:0}},{l:'35',s:{f2Lvl:35}},{l:'70',s:{f2Lvl:70}}]},
 {h:'フィードバックで太く',b:'ALGOタブのFEEDBACKを2にしよう。OPが自分を揺らして、ノコギリ波に近い太さが出る。',f:[['fFb',2]],tab:'algo'},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'op2',
  col:{h:'サブはサイン波のまま',b:'FMで倍音を足しても、低域の土台は、キャリアのサイン波が担っている。【サブ】の重さを残したまま、中域を足せるのがFMベースの利点。'}}
]}),
BS({id:'bs09',pre:['bs04'],terms:['fenv','lpf','transient'],save:{name:'プラックベース',kind:'patch'},title:'スラップ・プラック風ベース',sub:'短い減衰とフィルターの跳ね',demo:{n:[33,33,40,36],gap:.45,len:.2},init:Object.assign({},B0,{o1Wave:'sawtooth',o1Lvl:.8,cutoff:20000,fA:.001,fS:0}),steps:[
 {h:'弾く音にする',b:'AMP Dを短く、SUSTAINを20%にしよう。鳴った直後に音量が下がる、弾いて切れるタイプの音になる。',f:[['aD',.2],['aS',.2]],tab:'env'},
 {h:'閉じたフィルターから始める',b:'CUTOFFを下げよう。まだ開いていないフィルターで、こもった音から始める。',f:[['cutoff',350]],tab:'filter'},
 {h:'出だしで跳ねる',b:'ENV AMTを3オクターブにして、F.ENV Dを短くしよう。【フィルターエンベロープ】が一瞬だけ開いて、弾いた直後の【立ち上がり】が跳ねる。',f:[['envAmt',3],['fD',.12]],tab:'filter',tol:.08},
 {h:'跳ね具合を聴き比べる',b:'ENV AMTを変えて、出だしの明るさを聴こう。',tab:'filter',cmp:[{l:'なし',s:{envAmt:0}},{l:'中',s:{envAmt:1.5}},{l:'大',s:{envAmt:3}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。キーボードで、短く弾いたときと伸ばしたときの違いを試そう。',tab:'filter',
  col:{h:'ベースの打撃感',b:'弾く系のベースは、出だしの明るさと減衰の速さで、打撃感が決まる。ENV AMTを上げると明るく弾け、Dを短くすると、よりタイトになる。'}}
]}),
BT({id:'bs10',pre:['ly10'],terms:['sidechain','low','hpf'],save:{name:'キックとベース',kind:'kit'},title:'キックとベースの共存',sub:'サイドチェインとタイミングですみ分ける',demo:{n:[33]},
 tk:[KK(),held('ベース(なし)',SUB),held('ベース(SC)',SUB,SD.scMix({src:0,depth:.85,key:-20,rel:90})),bp('ベース(裏)','offbeat')],steps:[
 {h:'低音の取り合い',b:'キックとベースは、どちらも【ロー】の帯域を使う。同時に鳴ると、ぶつかって濁る。ぶつからない工夫は主に2つ。「音量を一瞬下げる」と「鳴らす位置をずらす」。',tab:'trk'},
 {h:'サイドチェインで下げる',b:'T2はサイドチェインなし、T3はサイドチェインあり。T3のコンプは、キックの音を合図に動く(SC SRC=T1)。キックの瞬間だけベースが下がる【サイドチェイン】を聴き比べよう。',tab:'trk',cmp:[{l:'なし',mt:[2,3]},{l:'あり',mt:[1,3]}]},
 {h:'位置をずらす',b:'T4は、キックの裏の位置にだけベースを置いた。ぶつからないので、サイドチェインなしでもすっきり聞こえる。',tab:'trk',cmp:[{l:'同じ位置(なし)',mt:[2,3]},{l:'裏の位置',mt:[1,2]}]},
 {h:'どれがすっきり?',b:'聴き比べて、キックの瞬間にベースがへこまず、位置だけで避けているものを選ぼう。',tab:'trk',cmp:[{l:'1',mt:[2,3]},{l:'2',mt:[1,3]},{l:'3',mt:[1,2]}],quiz:{q:'位置をずらして避けているのは?',ans:3,ex:'3が位置のずらし。裏の位置にだけ鳴る。2はサイドチェインでへこむ。1はそのまま。'}},
 {h:'レシピを保存',b:'「レシピ保存」でこのセットを保存できる。MIXタブでT3のCOMPを開き、THRESHやRELEASEを変えてみよう。',tab:'trk',
  col:{h:'低域を削る方法もある',b:'ベースの低域を、ハイパスフィルターで少し削ると、キックとのぶつかりが減る。ただし削りすぎると、ベースの重さが失われる。サイドチェイン・位置・フィルターを、曲に応じて組み合わせる。'}}
]}),
BS({id:'bs11',pre:['bs02'],terms:['sat','low','overtone'],save:{name:'歪みベース',kind:'patch'},title:'歪ませるベース',sub:'SAT・BITCRUSHで太く、荒く',demo:{n:[33,33,40,33],gap:.6,len:.45},init:Object.assign({},B0,{o1Wave:'sawtooth',o1Lvl:.8,o2Lvl:.4,o2Wave:'sine',o2Semi:-12,cutoff:3000,drive:0,saType:0,bcOn:0,bcBits:16}),steps:[
 {h:'DRIVEで太くする',b:'DRIVEを30%にしよう。【歪み】で倍音が増えて、音が太くなる。',f:[['drive',.3]],tab:'fx'},
 {h:'歪みの種類を選ぶ',b:'SAT TYPEをTAPEにしよう。TAPEは高域がまろやかに丸まる歪みで、低音に向く。',f:[['saType',1]],tab:'fx'},
 {h:'ビットクラッシュで荒く',b:'BITCRUSHをONにして、BITSを8、BC MIXを40%にしよう。ビット数を減らして波形を粗くすると、デジタルな荒さが加わる。MIXで元の音を残すと、低音が痩せにくい。',f:[['bcOn',1],['bcBits',8],['bcMix',.4]],tab:'fx'},
 {h:'歪みの種類を聴き比べる',b:'歪みなし、TAPE、ビットクラッシュを足した音を聴こう。',tab:'fx',cmp:[{l:'なし',s:{drive:0,saType:0,bcOn:0}},{l:'TAPE',s:{drive:.3,saType:1,bcOn:0}},{l:'TAPE+BC',s:{drive:.3,saType:1,bcOn:1,bcBits:8,bcMix:.4}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'fx',
  col:{h:'低域は歪ませすぎない',b:'低い音を強く歪ませると、波形がつぶれて、低域の重さが痩せて聞こえることがある。原音を残して歪みを混ぜる(並列)と、重さを保ったまま荒さを足せる。このレシピのBC MIXが、その考え方。'}}
]}),
BS({id:'bs12',pre:['bs01'],terms:['penv','subbass','sat'],save:{name:'808風ベース',kind:'patch'},title:'808風ベース',sub:'長い減衰のサイン波と音程の下降',demo:{n:[36,36,31,33],gap:1,len:.9},init:Object.assign({},B0,{o1Wave:'sine',o1Lvl:1,aA:.002,aD:.3,aS:0,aR:.2}),steps:[
 {h:'長く減衰するサイン波',b:'AMP Dを1.2秒にして、SUSTAINを0にしよう。長く伸びてから消える低音になる。キックのような、ドスンという響きを持つ、サブ寄りのベース。',f:[['aD',1.2],['aS',0]],tab:'env'},
 {h:'音程を一瞬下げる',b:'PIT AMTを12半音にして、PIT DECを短くしよう。【ピッチエンベロープ】で、出だしだけ高い音程から、本来の高さまで一気に下がる。ドスンという打撃感が出る。',f:[['pAmt',12],['pDec',.08]],tab:'env',tol:.08},
 {h:'歪みで倍音を足す',b:'DRIVEを30%にしよう。サイン波だけだと小さなスピーカーでは聞こえにくいので、【歪み】で倍音を足す。',f:[['drive',.3]],tab:'fx'},
 {h:'ピッチの有無を聴き比べる',b:'出だしの音程の動きがあるかないかで、打撃感が変わる。',tab:'env',cmp:[{l:'なし',s:{pAmt:0}},{l:'12半音',s:{pAmt:12}},{l:'24半音',s:{pAmt:24}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。音の長さ(AMP D)を変えて、曲のテンポに合わせよう。',tab:'env',
  col:{h:'低い音ほど音程が分かりにくい',b:'この種類のベースは、とても低い音を鳴らすので、音程がはっきり聞こえない機器が多い。歪みで倍音を足すことで、低い音でも音程が聞き取れるようになる。'}}
]}),
BS({id:'bs13',pre:['bs04'],terms:['fenv','lpf','lfo'],save:{name:'動くベース',kind:'patch'},title:'ベースの動き(フィルターエンベロープ)',sub:'立ち上がりの跳ねと、動きの足し方',demo:{n:[33,33,40,36],gap:.6,len:.5},init:Object.assign({},B0,{o1Wave:'sawtooth',o1Lvl:.8,cutoff:20000,fA:.005,fD:.3,fS:.3}),steps:[
 {h:'止まったフィルター',b:'同じ高さのフィルターで鳴らし続けるベースは、機械的に聞こえる。まず、CUTOFFを下げて、基準になる音を作ろう。',f:[['cutoff',300]],tab:'filter'},
 {h:'出だしで開く',b:'ENV AMTを2オクターブにしよう。【フィルターエンベロープ】で、音の出だしだけ開いて、だんだん閉じる。',f:[['envAmt',2]],tab:'filter'},
 {h:'開いている時間を決める',b:'F.ENV Dを長くすると、ゆっくり閉じる。短くすると、すぐ閉じる。F.ENV Dを0.25秒にしよう。',f:[['fD',.25]],tab:'env'},
 {h:'動きの足し方を聴き比べる',b:'動きなし、エンベロープだけ、LFOもあわせた音を聴こう。',tab:'filter',cmp:[{l:'動きなし',s:{envAmt:0,lfoFilter:0}},{l:'エンベロープ',s:{envAmt:2,lfoFilter:0}},{l:'+LFO',s:{envAmt:2,lfoFilter:.5,lfoRate:1}}]},
 {h:'レシピを保存',b:'「レシピ保存」で保存できる。',tab:'filter',
  col:{h:'曲の中で変化させる',b:'ベースのフィルターを、曲の展開に合わせて少しずつ開けると、盛り上がりが作れる。つまみの動きを時間で描く方法は、オートメーションの章で学べる。'}}
]})
 );
})();
