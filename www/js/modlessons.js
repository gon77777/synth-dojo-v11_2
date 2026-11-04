/* モジュラーのレッスン M1〜M6(synth:'mod')。書式は lessons.js と同じ。モジュラー用の追加項目:
   init={mods,cab}(開始時の構造) / step.k=[[出力,入力],...] つなぐべきケーブル(未接続なら点滅する仮の線を表示)
   step.m=[[種類,個数]] 追加すべきモジュール / step.rm=[[出力,入力]] ステップ開始時に自動で外すケーブル
   step.f=[['vco1.coarse',目標]] / step.s={'adsr1.r':値} 開始時に自動セット。ポートとつまみのIDは 'モジュールID.名前'。
   前のステップの k/m/f は達成済みとして引き継がれる(お手本=全ステップ達成後の状態) */
(function(){
var M=SD.modLib.M;
SD.CATS.push({id:'mod1',synth:'mod',name:'ケーブルで音を組み立てる'});
var D={n:[48,55],gap:1.6,len:1.2};
SD.LESSONS.push(
{id:'m1',cat:'mod1',synth:'mod',tab:'rack',title:'最初の1音',sub:'KEYBOARD→VCO→OUTPUT',oct:0,demo:D,
 init:{mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('out1')],cab:[]},steps:[
 {h:'ラックの見方',b:'「RACK」に、部品(モジュール)が1枚ずつカードで並んでいる。左から KEYBOARD(鍵盤)・VCO(音の素)・OUTPUT(出口)。\nカード下の丸いボタンが「ジャック」(端子)。左が入力、右が出力。色は信号の種類で、黄=音 / 青=制御(CV) / ピンク=GATE(鍵盤を押している間だけON)。\n今はまだ何もつながっていないので、鍵盤を弾いても鳴らない。'},
 {h:'ピッチをつなぐ',b:'ジャックは「出力→入力」の順にタップしてつなぐ(ドラッグはしない)。\nKEYBOARDの「PITCH」をタップ → VCOの「PITCH」をタップ。\nこれで鍵盤の高さの情報(ピッチCV)がVCOに届く。点滅している線が、つなぐ場所の目安。',k:[['kbd1.pitch','vco1.pitch']]},
 {h:'音をOUTPUTへ',b:'VCOの「OUT」→OUTPUTの「IN」をつなごう。つないだら鍵盤を弾いてみよう。\n弾いている間だけ鳴る(安全のため、鍵盤を離すと自動で止まる)。\n間違えたら、ケーブル中央の丸をタップして選び、上の「ケーブル削除」で外せる。',k:[['vco1.out','out1.in']]},
 {h:'波形を選ぶ',b:'VCOのWAVEを「矩形」にしよう。アナログシンセのOSCと同じで、波形で音の明るさが変わる。',f:[['vco1.wave','square']]},
 {h:'ピッチCVのしくみ',b:'鍵盤は「1V/オクターブ」というルールでピッチを送っている。1オクターブ上がると+1V。VCOは+1Vで周波数が2倍になる。\nVCOのCOARSE(半音単位)を+12にしよう。同じ鍵でも1オクターブ高く鳴る。',f:[['vco1.coarse',12]]}
]},
{id:'m2',cat:'mod1',synth:'mod',tab:'rack',title:'VCAとエンベロープ',sub:'音量を鍵盤に連動させる',oct:0,demo:D,
 init:{mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('out1')],cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','out1.in']]},steps:[
 {h:'VCAを足す',b:'いまは鍵盤を弾いている間、一定の音量で「ブッ」と鳴るだけ。音量を操る部品が VCA。\nタブ列右の「＋」を押し、一覧から「VCA」を選んで追加しよう。',m:[['vca',1]]},
 {h:'VCAを間に入れる',b:'VCOとOUTPUTの間にVCAを挟む。直結のケーブルは外しておいた。\nVCO「OUT」→VCA「IN」、VCA「OUT」→OUTPUT「IN」の2本をつなごう。\nつなぐと無音になる。VCAは、CVに電圧が届くまで音を通さないため。',rm:[['vco1.out','out1.in']],k:[['vco1.out','vca1.in'],['vca1.out','out1.in']]},
 {h:'ADSRを足す',b:'VCAを開け閉めする電圧を作る部品が ADSR(エンベロープ)。「＋」からADSRを追加しよう。',m:[['adsr',1]]},
 {h:'GATEをつなぐ',b:'ADSRは、鍵盤のGATE(押している間ON)を受けて動き出す。KEYBOARDの「GATE」(ピンク)→ADSRの「GATE」をつなごう。\nGATEはピンク同士でしかつなげない。音(黄)や制御(青)につなごうとすると断られる。',k:[['kbd1.gate','adsr1.gate']]},
 {h:'ADSRでVCAを開く',b:'ADSRの「OUT」(青)→VCAの「CV」をつなごう。鍵盤を押すとADSRが0→1に上がってVCAが開き、離すと下がって音が消える。\nこれで音量が鍵盤に連動した。',k:[['adsr1.out','vca1.cv']]},
 {h:'ゆっくり立ち上がる音',b:'ADSRのA(アタック)を0.5秒、R(リリース)を1.2秒にしよう。パッドのように、じわっと立ち上がり、余韻を残して消える。',f:[['adsr1.a',.5],['adsr1.r',1.2]],s:{'adsr1.s':.8}},
 {h:'短いプラック',b:'A=5ms、D=250ms、S=0%、R=150msにしよう。弾いた瞬間だけ鳴ってすぐ消える、弦をはじいたような音になる。',f:[['adsr1.a',.005],['adsr1.d',.25],['adsr1.s',0],['adsr1.r',.15]]}
]},
{id:'m3',cat:'mod1',synth:'mod',tab:'rack',title:'フィルターを足す',sub:'VCFとADSRの2箇所使い',oct:0,demo:D,
 init:{mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('adsr1',{a:.005,d:.4,s:.7,r:.3}),M('vca1'),M('out1')],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['adsr1.out','vca1.cv']]},steps:[
 {h:'VCFを足す',b:'いまの音は明るいまま。音色を削る部品が VCF(フィルター)。「＋」からVCFを追加しよう。',m:[['vcf',1]]},
 {h:'VCOとVCAの間に',b:'VCO「OUT」→VCF「IN」、VCF「OUT」→VCA「IN」の順につなごう。(VCO→VCAの直結は外した)\nまだカットオフが全開なので、音は変わらない。',rm:[['vco1.out','vca1.in']],k:[['vco1.out','vcf1.in'],['vcf1.out','vca1.in']]},
 {h:'カットオフを下げる',b:'VCFのCUTOFFを700Hz、RESを50%にしよう。高音が削れて、カットオフ付近が強調された音になる。',f:[['vcf1.cutoff',700],['vcf1.res',.5]]},
 {h:'ADSRをもう1つ',b:'フィルターの開き具合を自動で動かすため、2つ目のADSRを足そう。ADSR1は音量(VCA)担当、ADSR2はフィルター担当になる。',m:[['adsr',2]]},
 {h:'GATEをつなぐ',b:'KEYBOARDの「GATE」→ADSR2の「GATE」。1つのGATE出力から、複数の入力へつなげる。',k:[['kbd1.gate','adsr2.gate']]},
 {h:'カットオフを動かす',b:'ADSR2の「OUT」→VCFの「CUTOFF」をつなごう。ただしVCFの「CV量」が0なので、まだ変化しない。',k:[['adsr2.out','vcf1.cutoff']]},
 {h:'CV量で深さを決める',b:'VCFのCV量を+3octにしよう。ADSR2が1のとき、カットオフが3オクターブ上がる。弾いた瞬間に「ビョン」と開いて、閉じていく。',f:[['vcf1.cv',3]]},
 {h:'フィルターの形を作る',b:'ADSR2のD(ディケイ)を0.3秒、S(サステイン)を0%にしよう。パッと開いてすぐ閉じる、シンセベースらしい音になる。',f:[['adsr2.d',.3],['adsr2.s',0]]}
]},
{id:'m4',cat:'mod1',synth:'mod',tab:'rack',title:'LFOで動かす',sub:'ビブラート・ワウ・トレモロ',oct:0,demo:D,
 init:{mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('vcf1',{cutoff:900,res:.3,cv:3}),M('adsr1',{a:.01,d:.4,s:.7,r:.3}),M('adsr2',{a:.005,d:.3,s:0,r:.3}),M('vca1'),M('out1')],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vcf1.in'],['vcf1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['adsr1.out','vca1.cv'],['kbd1.gate','adsr2.gate'],['adsr2.out','vcf1.cutoff']]},steps:[
 {h:'LFOを足す',b:'LFOは、ゆっくり周期的に揺れる制御信号を作る部品。つなぎ先を変えるだけで、いろいろな効果になる。「＋」からLFOを追加しよう。',m:[['lfo',1]]},
 {h:'ビブラート',b:'LFOの「OUT」→VCOの「PITCH」をつなぎ、DEPTHを3%、RATEを5.5Hzにしよう。ピッチがゆらゆら揺れる=ビブラート。\nピッチは1V/octなので、DEPTHはごく小さくて十分。大きくすると半音を超えて揺れる。',k:[['lfo1.out','vco1.pitch']],f:[['lfo1.depth',.03],['lfo1.rate',5.5]]},
 {h:'ワウ',b:'ビブラートのケーブルは外した。LFO「OUT」→VCF「CUTOFF」をつなぎ、DEPTHを50%、RATEを2Hzにしよう。カットオフがゆっくり開閉する「ワウワウ」になる。\n同じLFOでも、つなぎ先で効果が変わるのがモジュラーのおもしろさ。',rm:[['lfo1.out','vco1.pitch']],k:[['lfo1.out','vcf1.cutoff']],f:[['lfo1.depth',.5],['lfo1.rate',2]]},
 {h:'VCAをもう1つ',b:'トレモロ(音量の揺れ)を作る。ADSR用のVCAとは別に、揺れ専用のVCAを直列に入れよう。「＋」からVCAを追加。',rm:[['lfo1.out','vcf1.cutoff']],m:[['vca',2]]},
 {h:'直列につなぐ',b:'VCA1「OUT」→VCA2「IN」、VCA2「OUT」→OUTPUT「IN」の順につなごう。(VCA1とOUTPUTの直結は外した)',rm:[['vca1.out','out1.in']],k:[['vca1.out','vca2.in'],['vca2.out','out1.in']]},
 {h:'トレモロ',b:'LFO「OUT」→VCA2「CV」をつなぎ、VCA2のCV量を50%、LFOのDEPTHを100%、RATEを6Hzにしよう。音量が行ったり来たりする=トレモロ。\nVCAの音量は「基本の音量 + CV×CV量」。CV量を50%にすると、残り50%が基本として常に通るので、無音まで落ちきらない。',k:[['lfo1.out','vca2.cv']],f:[['vca2.cv',.5],['lfo1.depth',1],['lfo1.rate',6]]}
]},
{id:'m5',cat:'mod1',synth:'mod',tab:'rack',title:'FMと不思議な音',sub:'VCOでVCOを揺らす',oct:0,demo:{n:[48,55],gap:2,len:1.6},
 init:{mods:[M('kbd1'),M('vco1',{wave:'sine'}),M('adsr1',{a:.005,d:.8,s:0,r:.5}),M('vca1'),M('out1')],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['adsr1.out','vca1.cv']]},steps:[
 {h:'素直なサイン波',b:'いまのVCO1はサイン波で、丸い「ポーン」という音。次から、2つ目のVCOでこの音を高速で揺らして複雑にする。これがFM(周波数変調)。'},
 {h:'モジュレーターを足す',b:'「＋」からVCOをもう1つ追加しよう。VCO2は音を直接出さず、VCO1を揺らす役(モジュレーター)になる。',m:[['vco',2]]},
 {h:'ピッチをそろえる',b:'KEYBOARDの「PITCH」→VCO2の「PITCH」もつなごう。VCO2も鍵盤に追従する。1つの出力から複数の入力へつなげる。',k:[['kbd1.pitch','vco2.pitch']]},
 {h:'FMをつなぐ',b:'VCO2の「OUT」→VCO1の「FM」をつなごう。VCO2の音が、VCO1のピッチを音の速さで揺らす。ただしVCO1のFM量が0なので、まだ変化しない。',k:[['vco2.out','vco1.fm']]},
 {h:'FM量を上げる',b:'VCO1のFM量を35%にしよう。音がギラッと明るく変わる。FM量を上げるほど倍音が増える。',f:[['vco1.fm',.35]]},
 {h:'整数比のFM',b:'VCO2のCOARSEを+12(1オクターブ上)にしよう。2つの周波数の比が整数(2:1)だと、倍音がきれいに並んで、エレピや鐘のような澄んだ音になる。',f:[['vco2.coarse',12]]},
 {h:'不協和なFM',b:'COARSEを+14にして、FM量を60%にしよう。比が整数でなくなると、倍音が不規則に散らばって、金属音・ベル・効果音になる。\nADSR1のR(リリース)は1.2秒にしてある。余韻が長いとベルらしくなる。',f:[['vco2.coarse',14],['vco1.fm',.6]],s:{'adsr1.r':1.2}}
]},
{id:'m6',cat:'mod1',synth:'mod',tab:'rack',title:'ランダムを使う',sub:'NOISE+SAMPLE&HOLD',oct:0,demo:{n:[48,48,48,48],gap:1,len:.6},
 init:{mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('vcf1',{cutoff:1500,res:.3,cv:2}),M('adsr1',{a:.005,d:.3,s:.5,r:.2}),M('vca1'),M('out1')],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vcf1.in'],['vcf1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['adsr1.out','vca1.cv']]},steps:[
 {h:'ランダムの素',b:'NOISEは「ザー」というランダムな信号。これを「ある瞬間だけ」切り取って保持すると、階段状のランダムな値になる。切り取る部品が SAMPLE&HOLD(S&H)。\n「＋」から、NOISEとSAMPLE&HOLDを1つずつ追加しよう。',m:[['noise',1],['sh',1]]},
 {h:'ノイズを入力へ',b:'NOISEの「OUT」→S&Hの「IN」をつなごう。S&Hが「何を読み取るか」を決める。',k:[['noise1.out','sh1.in']]},
 {h:'トリガーをつなぐ',b:'KEYBOARDの「GATE」→S&Hの「TRIG」をつなごう。鍵盤を押した瞬間に、ノイズの値を読み取って保持する。TRIGはGATE(ピンク)専用の入力。',k:[['kbd1.gate','sh1.trig']]},
 {h:'ATTENUVERTERを足す',b:'S&Hの出力は±1V(±1オクターブ)と大きい。そこで、量を絞る部品「ATTENUVERTER」を追加しよう。マイナスにすると反転もできる。',m:[['atten',1]]},
 {h:'ランダムなピッチ',b:'S&Hの「OUT」→ATTENUVERTERの「IN」、ATTENUVERTERの「OUT」→VCOの「PITCH」をつなぎ、AMT(量)を40%にしよう。鍵盤を押すたびに、音の高さがランダムに変わる。',k:[['sh1.out','atten1.in'],['atten1.out','vco1.pitch']],f:[['atten1.amt',.4]]},
 {h:'ARPと組み合わせる',b:'下の帯でARPモードにして、和音を押さえ、HOLDをONにしてみよう。ARPが1音ごとにGATEを出すので、自動でランダムなメロディが流れる。ARPのRATEを変えると、ランダムの速さも変わる。\n確かめたら「次へ」。'},
 {h:'ランダムなフィルター',b:'ATTENUVERTERの「OUT」→VCFの「CUTOFF」にもつなごう。1つの出力から複数の行き先へ。VCFのCV量は+2octにしてあるので、音の明るさも毎回ランダムに変わる。',k:[['atten1.out','vcf1.cutoff']]}
]}
);
})();
/* M7: CLOCK(13番目のモジュール)。鍵盤を使わずに自動で鳴らす */
(function(){
var M=SD.modLib.M;
SD.LESSONS.push(
{id:'m7',cat:'mod1',synth:'mod',tab:'rack',title:'CLOCKで自動演奏',sub:'GATEを自動で出す',oct:0,demo:{n:[48],gap:5,len:4},
 init:{mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('vcf1',{cutoff:1200,res:.3,cv:2}),M('adsr1',{a:.005,d:.25,s:0,r:.1}),M('adsr2',{a:.005,d:.2,s:0,r:.1}),M('vca1'),M('out1')],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vcf1.in'],['vcf1.out','vca1.in'],['vca1.out','out1.in'],['adsr1.out','vca1.cv'],['adsr2.out','vcf1.cutoff']]},steps:[
 {h:'GATEが空っぽ',b:'今のパッチはGATEがどこにもつながっていないので、鍵盤を押しても音が出ない。GATEは鍵盤以外からも出せる。それが CLOCK(一定間隔でパルスを出す部品)。'},
 {h:'CLOCKを足す',b:'「＋」からCLOCKを追加しよう。追加すると、すぐにテンポどおりにパルスが流れ始める(まだどこにもつながっていないので無音)。',m:[['clk',1]]},
 {h:'音量を動かす',b:'CLOCKの「OUT」(ピンク)→ADSR1の「GATE」をつなごう。鍵盤を押さなくても、一定のリズムで「ポッ、ポッ」と鳴り続ける。鍵盤を弾くと音程が変わる。',k:[['clk1.out','adsr1.gate']]},
 {h:'フィルターも動かす',b:'CLOCKの「OUT」→ADSR2の「GATE」もつなごう。1つのGATE出力から複数のエンベロープを同時に動かせる。音色も毎回「ビョン」と開いて閉じる。',k:[['clk1.out','adsr2.gate']]},
 {h:'テンポと刻み',b:'CLOCKのBPMを140、DIVを「1/16」にしよう。BPMはテンポ、DIVは1拍を何分割するか。速くて細かいリズムになる。',f:[['clk1.bpm',140],['clk1.div','s']],tol:.1},
 {h:'ランダムの部品を足す',b:'ランダムなメロディを自動で作る。NOISE・SAMPLE&HOLD・ATTENUVERTERを1つずつ足そう。足したら、NOISEの「OUT」→S&Hの「IN」と、CLOCKの「OUT」→S&Hの「TRIG」をつなごう。CLOCKのパルスごとに、ノイズの値を読み取って保持する。',m:[['noise',1],['sh',1],['atten',1]],k:[['noise1.out','sh1.in'],['clk1.out','sh1.trig']]},
 {h:'ランダムなメロディ',b:'S&Hの「OUT」→ATTENUVERTERの「IN」、ATTENUVERTERの「OUT」→VCO1の「PITCH」をつなぎ、AMT(量)を30%にしよう。鍵盤もARPも使わず、音程がランダムに変わり続ける自動演奏になる。',k:[['sh1.out','atten1.in'],['atten1.out','vco1.pitch']],f:[['atten1.amt',.3]]}
]}
);
})();
/* v2.0a: M8〜M9(追加モジュールのレッスン。M10〜M12は次の版) */
(function(){
var M=SD.modLib.M;
SD.CATS.push({id:'mod2',synth:'mod',name:'新しい部品を使いこなす'});
var D={n:[48,55],gap:1.6,len:1.2};
SD.LESSONS.push(
{id:'m8',cat:'mod2',synth:'mod',tab:'rack',title:'パルス幅とポルタメント',sub:'PWM・SLEW',oct:0,demo:D,
 init:{mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('adsr1',{a:.005,d:.5,s:.6,r:.3}),M('vca1'),M('out1')],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['adsr1.out','vca1.cv']]},steps:[
 {h:'PULSE波形',b:'VCOのWAVEを「PULSE」にしよう。PULSEは矩形波の仲間で、1周期のうち高い部分の長さ(幅)を変えられる。今は幅が50%なので、矩形波と同じ音になる。',f:[['vco1.wave','pulse']]},
 {h:'幅で音色が変わる',b:'VCOのWIDTHを20%にしよう。幅を細くすると、鼻にかかったような、細くて硬い音になる。幅を変えるだけで音色が変わるのがPULSEの特徴。',f:[['vco1.width',.2]]},
 {h:'幅を自動で動かす',b:'幅を手で動かし続ける代わりに、LFOにやらせよう。「＋」からLFOを追加しよう。',m:[['lfo',1]]},
 {h:'PWM入力へ',b:'LFOの「OUT」→VCOの「PWM」をつなごう。LFOのRATEは0.8Hz、DEPTHは100%にしよう。幅がゆっくり揺れ続けて、音が厚く、うねるように聞こえる。これがPWM(パルス幅変調)。',k:[['lfo1.out','vco1.pwm']],f:[['lfo1.rate',.8],['lfo1.depth',1]]},
 {h:'PWM量と幅の中心',b:'WIDTHを50%、PWM量を40%にしよう。WIDTHは揺れの中心、PWM量は揺れ幅。幅が端(5%や95%)に届くと音が途切れるので、中心から離れすぎないようにする。',f:[['vco1.width',.5],['vco1.pwm',.4]]},
 {h:'揺れを速くする',b:'LFOのRATEを4Hzにしよう。揺れが速くなると、ゆったりしたうねりが、ふるえるような音に変わる。',f:[['lfo1.rate',4]]},
 {h:'SLEWを足す',b:'ここからは別の話。SLEWは、制御信号の変化をなめらかにする部品。鍵盤のピッチにつなぐと、音が階段状に変わる代わりに、すべるように移り変わる(ポルタメント)。「＋」からSLEWを追加しよう。',m:[['slew',1]]},
 {h:'ピッチの間に入れる',b:'KEYBOARDの「PITCH」とVCOの「PITCH」の直結は外した。KEYBOARD「PITCH」→SLEW「IN」、SLEW「OUT」→VCO「PITCH」の2本をつなごう。TIMEが短い(100ms)うちは、ほとんど変化がわからない。',rm:[['kbd1.pitch','vco1.pitch']],k:[['kbd1.pitch','slew1.in'],['slew1.out','vco1.pitch']]},
 {h:'すべる音',b:'SLEWのTIMEを0.4秒にしよう。鍵盤を続けて弾くと、前の音から次の音へ、音程がすべるように変わる。長くするほどゆっくり追いかける。',f:[['slew1.time',.4]],
  col:{h:'ポルタメント',b:'音程をなめらかにつなぐ奏法は、もともと歌やバイオリンなどの楽器にある表現。シンセでは、ピッチの変化を遅らせるこの仕組みで再現できる。モジュラーでは、SLEWのような専用の部品を鍵盤のピッチに挟むだけで実現できる。'}}
]},
{id:'m9',cat:'mod2',synth:'mod',tab:'rack',title:'金属音と倍音を作る',sub:'RING MOD・WAVESHAPER',oct:0,demo:{n:[48,55],gap:2,len:1.6},
 init:{mods:[M('kbd1'),M('vco1',{wave:'sine'}),M('adsr1',{a:.005,d:.8,s:0,r:.5}),M('vca1'),M('out1')],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['adsr1.out','vca1.cv']]},steps:[
 {h:'素直なサイン波',b:'いまのVCO1は、サイン波の丸い音。ここに2つの部品を足して、金属的な音を作っていく。まずは RING MOD(リングモジュレーター)から。'},
 {h:'RING MODとVCOを足す',b:'RING MODは、2つの音をかけ算する部品。「＋」からRING MODと、もう1つVCOを追加しよう。',m:[['ring',1],['vco',2]]},
 {h:'Aをつなぐ',b:'VCO1「OUT」→RING MOD「A」、RING MOD「OUT」→VCA「IN」の2本をつなごう。(VCO1とVCAの直結は外した)\nBがまだつながっていないので、無音になる。かけ算は、相手がいないと成り立たない。',rm:[['vco1.out','vca1.in']],k:[['vco1.out','ring1.a'],['ring1.out','vca1.in']]},
 {h:'Bをつなぐ',b:'KEYBOARDの「PITCH」→VCO2の「PITCH」、VCO2「OUT」→RING MOD「B」をつなごう。鳴り始めるが、2つが同じ高さなので、元の2倍の高さの音(和)になる。差は0で聞こえない。',k:[['kbd1.pitch','vco2.pitch'],['vco2.out','ring1.b']]},
 {h:'周波数をずらす',b:'VCO2のCOARSEを+7にしよう。2つの周波数の和と差の音だけが出て、元の音は消える。この2つは整数倍の関係にならないので、鐘のような金属音になる。',f:[['vco2.coarse',7]],
  col:{h:'ダレクの声',b:'リングモジュレーターの有名な使い方は、1963年のイギリスのテレビ番組「ドクター・フー」に登場するダレクの声。BBCラジオフォニック・ワークショップのブライアン・ホジソンが、俳優の声をリングモジュレーターに通して作った。母音を伸ばして話すと効果がよくわかる、と本人は語っている。'}},
 {h:'原音と混ぜる',b:'RING MODのMIXを50%にしよう。かけ算した音に、Aの原音が半分混ざって、金属的だけれど音程がわかりやすくなる。0%なら原音だけ、100%ならかけ算した音だけ。',f:[['ring1.mix',.5]]},
 {h:'WAVESHAPERを足す',b:'次は、波形そのものをゆがませて倍音を作る部品、WAVESHAPER。「＋」から追加しよう。',m:[['shaper',1]]},
 {h:'RING MODの後ろへ',b:'RING MOD「OUT」→WAVESHAPER「IN」、WAVESHAPER「OUT」→VCA「IN」をつなごう。(RING MODとVCAの直結は外した)',rm:[['ring1.out','vca1.in']],k:[['ring1.out','shaper1.in'],['shaper1.out','vca1.in']]},
 {h:'FOLDで折り返す',b:'SHAPEを「FOLD」、DRIVEを4倍にしよう。入力が大きいと波形が折り返されて、複雑な倍音が生まれる。DRIVEを大きくするほど、折り返しが増えて音が複雑になる。',f:[['shaper1.shape','fold'],['shaper1.drive',4]]},
 {h:'3つの形を聞き比べる',b:'SOFTは頭をなめらかに丸め、HARDは頭を切り落とし、FOLDは折り返す。同じDRIVEでも、ゆがみ方で音の硬さが違う。ボタンで聞き比べよう。',cmp:[{l:'SOFT',s:{'shaper1.shape':'soft'}},{l:'HARD',s:{'shaper1.shape':'hard'}},{l:'FOLD',s:{'shaper1.shape':'fold'}}]}
]}
);
})();
/* v2.0b: M10〜M12(ゲート系・音階/残響・SEQUENCERのレッスン) */
(function(){
var M=SD.modLib.M;
var DC={n:[48],gap:5,len:4};
SD.LESSONS.push(
{id:'m10',cat:'mod2',synth:'mod',tab:'rack',title:'ゲートを割る・拾う',sub:'CLOCK DIVIDER・COMPARATOR',oct:0,demo:DC,
 init:{mods:[M('kbd1'),M('clk1',{bpm:120,div:'e'}),M('vco1',{wave:'sawtooth'}),M('adsr1',{a:.005,d:.25,s:0,r:.1}),M('vca1'),M('out1')],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vca1.in'],['vca1.out','out1.in'],['adsr1.out','vca1.cv'],['clk1.out','adsr1.gate']]},steps:[
 {h:'CLOCKの拍',b:'いまはCLOCKのGATEが、そのままADSRにつながっていて、一定のリズムで鳴り続けている。GATEは「割る」ことも「つくる」こともできる。ここでは、そのための部品を2つ使う。'},
 {h:'CLOCK DIVIDERを足す',b:'CLOCK DIVIDERは、入ってきたGATEを数えて、N回に1回だけ通す部品。「＋」から追加しよう。',m:[['div',1]]},
 {h:'CLOCKとADSRの間に',b:'CLOCK「OUT」→DIVIDER「IN」、DIVIDER「OUT」→ADSR「GATE」をつなごう。(CLOCKとADSRの直結は外した)\n初期値は÷2なので、リズムが半分の速さになる。',rm:[['clk1.out','adsr1.gate']],k:[['clk1.out','div1.in'],['div1.out','adsr1.gate']]},
 {h:'÷4にする',b:'DIVIDERのDIVを「÷4」にしよう。4回に1回だけ通るので、ゆったりしたリズムになる。',f:[['div1.n','4']]},
 {h:'段をつなげる',b:'DIVIDERをもう1つ足して、直列につなごう。÷4の次に÷2を入れると、全体で÷8になる。DIVIDER1「OUT」→DIVIDER2「IN」、DIVIDER2「OUT」→ADSR「GATE」をつなぎ、DIVIDER2のDIVを「÷2」にしよう。(DIVIDER1とADSRの直結は外した)\nGATEは何段でもつなげる。',m:[['div',2]],rm:[['div1.out','adsr1.gate']],k:[['div1.out','div2.in'],['div2.out','adsr1.gate']],f:[['div2.n','2']]},
 {h:'GATEをつくる',b:'今度は、制御信号(CV)からGATEをつくる。COMPARATORは、入力が基準(THRESH)を上回るとGATEがON、下回るとOFFになる部品。LFOと一緒に追加しよう。',m:[['lfo',1],['cmp',1]]},
 {h:'LFOでリズムを作る',b:'LFO「OUT」→COMPARATOR「IN」、COMPARATOR「OUT」→ADSR「GATE」をつなぎ、LFOのRATEを2Hz、DEPTHを100%にしよう。(DIVIDER2とADSRの直結は外した)\nLFOがTHRESHを超えるたびにGATEが出る。鍵盤もCLOCKも使わずに、LFOだけで鳴り続ける。',rm:[['div2.out','adsr1.gate']],k:[['lfo1.out','cmp1.in'],['cmp1.out','adsr1.gate']],f:[['lfo1.rate',2],['lfo1.depth',1]]},
 {h:'THRESHでGATEの長さが変わる',b:'COMPARATORのTHRESHを70%にしよう。基準が高いほど、LFOが基準を超えている時間が短くなり、GATEが細く(短く)なる。低いと長く、ほぼ常にONになる。',f:[['cmp1.th',.7]]}
]},
{id:'m11',cat:'mod2',synth:'mod',tab:'rack',title:'音階に揃える・響かせる',sub:'QUANTIZER・REVERB',oct:0,demo:DC,
 init:{mods:[M('kbd1'),M('clk1',{bpm:120,div:'e'}),M('lfo1',{wave:'sine',rate:.3,depth:.6}),M('vco1',{wave:'sawtooth'}),M('adsr1',{a:.005,d:.2,s:0,r:.1}),M('vca1'),M('out1')],
  cab:[['lfo1.out','vco1.pitch'],['vco1.out','vca1.in'],['vca1.out','out1.in'],['adsr1.out','vca1.cv'],['clk1.out','adsr1.gate']]},steps:[
 {h:'音階のない音程',b:'LFOがVCOのPITCHにつながっていて、CLOCKに合わせて鳴っている。音程がなめらかに上下するので、ドレミのどこにも当たらない「中途半端な音」が混ざる。これを音階の音に揃える。'},
 {h:'QUANTIZERを足す',b:'QUANTIZERは、ピッチ(CV)を音階の一番近い音に揃える部品。「＋」から追加しよう。',m:[['quant',1]]},
 {h:'LFOとVCOの間に',b:'LFO「OUT」→QUANTIZER「IN」、QUANTIZER「OUT」→VCO「PITCH」をつなごう。(LFOとVCOの直結は外した)\n初期値はCメジャー(ドレミファソラシド)。階段状に動いて、音階の音だけが鳴る。',rm:[['lfo1.out','vco1.pitch']],k:[['lfo1.out','quant1.in'],['quant1.out','vco1.pitch']]},
 {h:'音階を選ぶ',b:'SCALEを「PENTA」にしよう。5つの音だけの音階(ペンタトニック)で、どの音の並びでも調和しやすくなる。',f:[['quant1.scale','penta']]},
 {h:'聞き比べる',b:'SCALEを切り替えて聞き比べよう。同じLFOの動きでも、音階が変わるだけで雰囲気が大きく変わる。CHROMは半音すべて(ほぼ素通り)、BLUESは影のある響き。',cmp:[{l:'MAJOR',s:{'quant1.scale':'major'}},{l:'MINOR',s:{'quant1.scale':'minor'}},{l:'PENTA',s:{'quant1.scale':'penta'}},{l:'BLUES',s:{'quant1.scale':'blues'}}]},
 {h:'主音を変える',b:'KEYを9(A)にしよう。音階の主音(ルート)がAに移り、同じ形の音階が別の高さに移る。',f:[['quant1.key',9]]},
 {h:'REVERBを足す',b:'音に空間の広がりを足そう。REVERBは残響をつくる部品。「＋」から追加しよう。',m:[['rev',1]]},
 {h:'出口の手前に',b:'VCA「OUT」→REVERB「IN」、REVERB「OUT」→OUTPUT「IN」をつなごう。(VCAとOUTPUTの直結は外した)',rm:[['vca1.out','out1.in']],k:[['vca1.out','rev1.in'],['rev1.out','out1.in']]},
 {h:'広い空間にする',b:'REVERBのSIZEを2秒、MIXを40%にしよう。SIZEは残響の長さ(空間の広さ)、MIXは残響の量。音を止めても余韻が残る。',f:[['rev1.size',2],['rev1.mix',.4]]}
]},
{id:'m12',cat:'mod2',synth:'mod',tab:'rack',title:'SEQUENCERで曲を組む',sub:'8ステップ・休符・長さ',oct:0,demo:DC,
 init:{mods:[M('kbd1'),M('clk1',{bpm:120,div:'e'}),M('vco1',{wave:'sawtooth'}),M('adsr1',{a:.005,d:.25,s:0,r:.1}),M('vca1'),M('out1')],
  cab:[['vco1.out','vca1.in'],['vca1.out','out1.in'],['adsr1.out','vca1.cv'],['clk1.out','adsr1.gate']]},steps:[
 {h:'同じ音のくり返し',b:'CLOCKに合わせて、いつも同じ高さで鳴っている。音程を順番に変えていく部品が SEQUENCER。8ステップぶんの音程を覚えておき、CLOCKのたびに1つずつ進む。'},
 {h:'SEQUENCERを足す',b:'「＋」からSEQUENCERを追加しよう。8列のカードが現れる。上から、ステップ番号・音名(▲▼で上げ下げ)・ON/OFFが並ぶ。',m:[['seqm',1]]},
 {h:'CLOCKを進める',b:'CLOCK「OUT」→SEQUENCER「CLK」をつなごう。CLOCKのパルスが来るたびに、1ステップ進む。再生中のステップは枠が光る。ただし音程の出力をまだつないでいないので、音の高さは変わらない。',k:[['clk1.out','seqm1.clk']]},
 {h:'音程をつなぐ',b:'SEQUENCER「PITCH」→VCO「PITCH」をつなごう。8ステップのフレーズが流れる。',k:[['seqm1.pitch','vco1.pitch']]},
 {h:'GATEもつなぐ',b:'SEQUENCER「GATE」→ADSR「GATE」をつなごう。(CLOCKとADSRの直結は外した)\nいまは音が変わらないが、GATEもSEQUENCERが出すようになった。次のステップで、この意味がわかる。',rm:[['clk1.out','adsr1.gate']],k:[['seqm1.gate','adsr1.gate']]},
 {h:'休符を入れる',b:'ステップ4のON/OFFを「OFF」にしよう。OFFのステップは、音程は進むがGATEが出ないので、その拍だけ休みになる。',f:[['seqm1.o4','off']]},
 {h:'音程を変える',b:'ステップ1の音程を1オクターブ下のC3(48)にしよう。▲▼で半音ずつ動かせる。再生中でも、今鳴っているステップなら、すぐに反映される。',f:[['seqm1.n1',48]]},
 {h:'LENGTHでパターンを短くする',b:'LENGTHを6にしよう。6ステップで1周して最初に戻る。CLOCKの拍とのずれで、リズムの感じが変わる。RESET入力にGATEを入れると、好きなタイミングで1ステップ目に戻せる。',f:[['seqm1.len',6]]},
 {h:'CLOCK DIVIDERでゆっくり',b:'CLOCK DIVIDERを足して、CLOCK「OUT」→DIVIDER「IN」、DIVIDER「OUT」→SEQUENCER「CLK」にしよう。(CLOCKとSEQUENCERの直結は外した)\nDIVを「÷2」にすると、パターンの進みが半分の速さになる。',m:[['div',1]],rm:[['clk1.out','seqm1.clk']],k:[['clk1.out','div1.in'],['div1.out','seqm1.clk']],f:[['div1.n','2']]}
]}
);
})();
