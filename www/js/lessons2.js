/* v0.6 アナログのレッスン追加(書式は lessons.js と同じ)。グライド機能(GLIDE)を使うリードを含む */
(function(){
SD.CATS.push({id:'ext',synth:'analog',name:'応用(音色づくりの実践)'});
var D={n:[55],gap:1.5,len:1.1};
SD.LESSONS.push(
{id:'brass',cat:'ext',synth:'analog',title:'ブラス',sub:'フィルターエンベロープの「ブワッ」',oct:0,demo:D,init:{},steps:[
 {h:'ノコギリを2本重ねる',b:'ブラスの素材は明るいノコギリ波。OSC2の音量を70%、FINEを+6ctにして、2本を少しずらして重ねよう。厚みのある管楽器の音になる。',f:[['o2Lvl',.7],['o2Fine',6]],s:{o2Wave:'sawtooth'},tab:'osc',tol:.1},
 {h:'フィルターを閉じる',b:'CUTOFFを500Hz、RESを20%にしよう。いったん音をこもらせておく。この「閉じた状態」から、弾いた瞬間に開くのがブラスの肝。',f:[['cutoff',500],['res',.2]],tab:'filter'},
 {h:'ブワッと開く',b:'ENV AMTを+2.5oct、F.ENV Aを120msにしよう。弾いた直後に、フィルターが少し遅れて「ブワッ」と開く。アタックが短すぎると「ビョン」、長すぎると「ウワー」になる。',f:[['envAmt',2.5],['fA',.12]],s:{fD:.3,fS:.5},tab:'env'},
 {h:'音量の形',b:'AMP Aを60ms、AMP Rを150msにしよう。立ち上がりはわずかに丸く、離すとすっと切れる。ブラスらしい息づかいになる。',f:[['aA',.06],['aR',.15]],s:{aS:.8},tab:'env'}
]},
{id:'strings',cat:'ext',synth:'analog',title:'ストリングス',sub:'ノコギリ2本+ゆっくりアタック+広がり',oct:0,demo:{n:[[48,55,64]],gap:2.5,len:2},init:{},steps:[
 {h:'デチューンしたノコギリ',b:'OSC2の音量を80%、FINEを+12ctにしよう。大きめにずらすと、コーラスをかけたような広がりが出る。弦楽器の合奏はこの「ずれ」が命。',f:[['o2Lvl',.8],['o2Fine',12]],s:{o2Wave:'sawtooth'},tab:'osc',tol:.1},
 {h:'ゆっくり立ち上がる',b:'AMP Aを600ms、AMP Rを1.2秒にしよう。弓がゆっくり弦に触れ、余韻を残して消える。',f:[['aA',.6],['aR',1.2]],s:{aS:.9},tab:'env'},
 {h:'角を取る',b:'CUTOFFを3kHzにしよう。ノコギリのギラつきを少し削ると、やわらかい弦の音になる。',f:[['cutoff',3000]],tab:'filter'},
 {h:'ほんのりビブラート',b:'LFOタブで→PITCHを0.15st、RATEを5Hzにしよう。ごく浅いビブラートで、人が弾いているような揺れが出る。',f:[['lfoPitch',.15],['lfoRate',5]],s:{lfoShape:'sine'},tab:'lfo',tol:.1},
 {h:'広い空間',b:'FXタブでRVB MIXを30%、RVB SIZEを2秒にしよう。ホールで鳴っているような広がりが加わる。和音で弾いてみよう。',f:[['rvbMix',.3],['rvbSize',2]],tab:'fx'}
]},
{id:'lead',cat:'ext',synth:'analog',title:'リード(グライド)',sub:'音程が滑る GLIDE',oct:0,demo:{n:[55,60,57,64],gap:.7,len:.6},init:{},steps:[
 {h:'リードの素材',b:'OSC1を「矩形」、CUTOFFを4kHz、RESを20%にしよう。メロディをはっきり聴かせる、抜けのよい音の土台。',f:[['o1Wave','square'],['cutoff',4000],['res',.2]],tab:'osc'},
 {h:'ノコギリを足す',b:'OSC2の音量を60%、FINEを+7ctにしよう。矩形に、ノコギリの明るさと厚みが加わる。',f:[['o2Lvl',.6],['o2Fine',7]],s:{o2Wave:'sawtooth'},tol:.1},
 {h:'グライド',b:'OSCタブのGLIDEを120msにしよう。続けて違う鍵盤を弾くと、前の音から次の音へ音程が「ツーッ」と滑る。これがグライド(ポルタメント)。シンセリードの定番の表情。0に戻すと、音程は階段状に切り替わる。',f:[['glide',.12]],tab:'osc',tol:.1},
 {h:'ビブラート',b:'LFOタブで→PITCHを0.3st、RATEを5.5Hzにしよう。音を伸ばしたときに揺れが加わり、歌っているような表情になる。',f:[['lfoPitch',.3],['lfoRate',5.5]],s:{lfoShape:'sine'},tab:'lfo',tol:.1},
 {h:'やまびこ',b:'FXタブでDLY MIXを25%、DLY TIMEを300msにしよう。フレーズの後ろに残響のような繰り返しが付いて、リードが立体的になる。',f:[['dlyMix',.25],['dlyTime',.3]],tab:'fx'}
]},
{id:'blop',cat:'ext',synth:'analog',title:'ウォーターブロップ',sub:'サイン波+急なピッチ下降',oct:1,demo:{n:[60,64,67],gap:.8,len:.3},init:{},steps:[
 {h:'丸い音の素',b:'OSC1を「サイン」にしよう。水滴のような丸い音は、倍音のないサイン波から作る。',f:[['o1Wave','sine']],tab:'osc'},
 {h:'短く切る',b:'AMP Dを150ms、AMP Sを0%にしよう。弾いた瞬間だけ「ポッ」と鳴って、すぐ消える。',f:[['aD',.15],['aS',0]],s:{aA:.003,aR:.1},tab:'env',tol:.1},
 {h:'ピッチを落とす',b:'PIT AMTを+19st、PIT DECを60msにしよう。高い音程から本来の高さへ一瞬で落ちる。この「ピョン」という動きが、水滴の「ポロン」に聞こえる。',f:[['pAmt',19],['pDec',.06]],tab:'env',tol:.1},
 {h:'水の響き',b:'FXタブでRVB MIXを25%、RVB SIZEを1.5秒にしよう。水の中、洞窟の中で鳴っているような残響が付く。',f:[['rvbMix',.25],['rvbSize',1.5]],tab:'fx'}
]},
{id:'sea',cat:'ext',synth:'analog',title:'波の音',sub:'ノイズ+LFO+フィルター',oct:0,demo:{n:[55],gap:6,len:5.5},init:{},steps:[
 {h:'ノイズだけにする',b:'OSC1の音量を0、NOISEを80%にしよう。音程のない「ザー」だけが残る。風や波の素材。',f:[['o1Lvl',0],['noiseLvl',.8]],tab:'osc'},
 {h:'帯域をしぼる',b:'FILTERのTYPEを「BP」、CUTOFFを900Hz、RESを30%にしよう。ザラザラが、波のような中域の響きになる。',f:[['fType','bandpass'],['cutoff',900],['res',.3]],tab:'filter'},
 {h:'寄せては返す',b:'LFOタブで→FILTERを1.5oct、RATEを0.2Hzにしよう。5秒に1回、カットオフがゆっくり往復する。波が寄せて引くように、音が明るくなったり暗くなったりする。鍵盤を押し続けて聴こう。',f:[['lfoFilter',1.5],['lfoRate',.2]],s:{lfoShape:'sine'},tab:'lfo',tol:.1},
 {h:'ゆっくり出入り',b:'AMP Aを1.5秒、AMP Rを2秒にしよう。音がじわっと現れ、離しても余韻が残る。波音が遠くから近づいてくる。',f:[['aA',1.5],['aR',2]],s:{aS:1},tab:'env',tol:.1}
]},
{id:'riser',cat:'ext',synth:'analog',title:'ライザー',sub:'ノイズ+フィルター上昇で盛り上げる',oct:0,demo:{n:[55],gap:6,len:5},init:{},steps:[
 {h:'ノイズとノコギリ',b:'NOISEを80%、OSC1の音量を40%にしよう。ノイズに音程のある音を混ぜると、上昇感が出る。',f:[['noiseLvl',.8],['o1Lvl',.4]],tab:'osc'},
 {h:'閉じて始める',b:'CUTOFFを300Hz、RESを40%にしよう。こもった状態からスタートして、ここから開いていく。',f:[['cutoff',300],['res',.4]],tab:'filter'},
 {h:'4秒かけて開く',b:'ENV AMTを+4oct、F.ENV Aを4秒、F.ENV Sを100%にしよう。鍵盤を押し続けると、フィルターが4秒かけてじわじわ開き、そのまま開きっぱなしになる。押し続けて聴こう(HOLDも便利)。',f:[['envAmt',4],['fA',4],['fS',1]],tab:'env',tol:.1},
 {h:'音量も上げる',b:'AMP Aを3.5秒、AMP Rを500msにしよう。音量も一緒に大きくなり、離すとスパッと終わる。ブレイクの前の「盛り上がり→無音」に使う。',f:[['aA',3.5],['aR',.5]],s:{aS:1},tab:'env',tol:.1}
]}
);
SD.LESSONS.push(
{id:'tom',cat:'ext',synth:'analog',title:'トム',sub:'キックの応用: ピッチエンベロープ',oct:-1,demo:{n:[57,53,48],gap:.6,len:.2},init:{},steps:[
 {h:'サインで丸く',b:'OSC1を「サイン」、AMP Dを350ms、AMP Sを0%にしよう。余韻のある「ボーン」という低い音の土台。',f:[['o1Wave','sine'],['aD',.35],['aS',0]],s:{aA:.002,aR:.1},tab:'osc',tol:.1},
 {h:'ピッチが落ちる',b:'PIT AMTを+12st、PIT DECを150msにしよう。叩いた瞬間に1オクターブ上から本来の高さへ落ちる。キックより少し長くゆるやかに落とすのが、トムらしさ。',f:[['pAmt',12],['pDec',.15]],tab:'env',tol:.1},
 {h:'スティックの当たり',b:'NOISEを15%、N.HPを3kHzにしよう。ノイズの高域だけを混ぜると、叩いた瞬間の「パッ」というアタックが加わる。',f:[['noiseLvl',.15],['nHP',3000]],tab:'osc',tol:.1},
 {h:'丸みを出す',b:'FILTERのCUTOFFを2kHzにしよう。高音を少し削ると、皮の丸い響きになる。鍵盤の高さを変えると、ハイタム・フロアタムになる。',f:[['cutoff',2000]],tab:'filter'}
]},
{id:'conga',cat:'ext',synth:'analog',title:'コンガ',sub:'短いピッチ変化+帯域をしぼる',oct:0,demo:{n:[60,60,64,60],gap:.4,len:.15},init:{},steps:[
 {h:'三角波で素朴に',b:'OSC1を「三角」、AMP Dを200ms、AMP Sを0%にしよう。サインより少し倍音があり、木や皮の素朴な音になる。',f:[['o1Wave','triangle'],['aD',.2],['aS',0]],s:{aA:.002,aR:.08},tab:'osc',tol:.1},
 {h:'小さなピッチ変化',b:'PIT AMTを+5st、PIT DECを40msにしよう。トムより小さく速い変化。手のひらで皮を叩いた「ポン」になる。',f:[['pAmt',5],['pDec',.04]],tab:'env',tol:.1},
 {h:'帯域をしぼる',b:'FILTERを「BP」、CUTOFFを900Hz、RESを30%にしよう。中域だけを通すと、胴の共鳴のような「コン」という響きになる。',f:[['fType','bandpass'],['cutoff',900],['res',.3]],tab:'filter'},
 {h:'手の当たり',b:'NOISEを10%、N.HPを4kHzにしよう。ごく小さなノイズで、指が皮に当たる音を足す。',f:[['noiseLvl',.1],['nHP',4000]],tab:'osc',tol:.1}
]},
{id:'epiano',cat:'ext',synth:'analog',title:'エレピ風',sub:'サイン+ベル成分+トレモロ',oct:0,demo:{n:[[48,55,64]],gap:2.5,len:2},init:{},steps:[
 {h:'サインを2つ',b:'OSC1を「サイン」、OSC2も「サイン」にして音量を35%、SEMIを+12にしよう。基音に1オクターブ上の成分が重なって、鍵盤楽器らしい輪郭が出る。',f:[['o1Wave','sine'],['o2Lvl',.35],['o2Semi',12]],s:{o2Wave:'sine'},tab:'osc',tol:.1},
 {h:'ピアノのように減衰',b:'AMP Dを1.2秒、AMP Sを20%、AMP Rを400msにしよう。弾いた後に自然に減っていき、離すと余韻を残して消える。',f:[['aD',1.2],['aS',.2],['aR',.4]],s:{aA:.003},tab:'env',tol:.1},
 {h:'叩いた瞬間の明るさ',b:'CUTOFFを1.8kHz、ENV AMTを+1.5octにしよう。弾いた瞬間だけフィルターが開いて、鍵盤を叩く「カーン」というアタックが出る。',f:[['cutoff',1800],['envAmt',1.5]],s:{fA:.003,fD:.5,fS:.1},tab:'filter',tol:.1},
 {h:'トレモロ',b:'LFOタブで→AMPを30%、RATEを5Hzにしよう。音量がゆらゆら揺れる。ヴィンテージのエレピの、あの「ウワウワ」。',f:[['lfoAmp',.3],['lfoRate',5]],s:{lfoShape:'sine'},tab:'lfo',tol:.1}
]},
{id:'clap',cat:'ext',synth:'analog',title:'クラップ',sub:'BURST: 複数回の打撃音',oct:0,demo:{n:[60],gap:.6,len:.2},init:{},steps:[
 {h:'ノイズだけ',b:'OSC1の音量を0、NOISEを100%にしよう。手拍子はノイズでできている。',f:[['o1Lvl',0],['noiseLvl',1]],tab:'osc',tol:.1},
 {h:'中域をしぼる',b:'FILTERを「BP」、CUTOFFを1.4kHz、RESを40%にしよう。ザーッが、パチッとした手の音域になる。',f:[['fType','bandpass'],['cutoff',1400],['res',.4]],tab:'filter'},
 {h:'短く切る',b:'AMP Dを120ms、AMP Sを0%にしよう。ここまでは「パッ」と1回だけ鳴る音。',f:[['aD',.12],['aS',0]],s:{aA:.002,aR:.1},tab:'env',tol:.1},
 {h:'BURSTで複数回叩く',b:'ENVタブのBURSTを4にしよう。鍵盤を押した瞬間にエンベロープが4回くり返され、「パパパパッ」と何人かが重なって叩く手拍子になる。1にすると1回に戻る。',f:[['aBurst',4]],tab:'env'},
 {h:'広い空間',b:'FXタブでRVB MIXを25%、RVB SIZEを1秒にしよう。スネアと重ねるとビートの雰囲気が出る。',f:[['rvbMix',.25],['rvbSize',1]],tab:'fx'}
]}
);
SD.LESSONS.forEach(function(l){l.synth=l.synth||'analog';});
})();
