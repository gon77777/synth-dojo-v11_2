/* 新しいエフェクト(FX-1〜5)の登録。SD.fxAdd(mixdefs.js)を呼ぶだけ。fxparams.js より前に読み込む。
   置き場: マスターFXラック(固定順チェーン)。mb は cp の後ろ・sw の前(README v10.0)。 */
(function(){
 var OO=[[0,'OFF'],[1,'ON']];
 /* FX-1 MULTIBAND(sd-mbcomp)。1a=帯域分割と再合成(X1・X2)。1b=バンド別COMP(THRESH・RATIO・ATTACK・RELEASE・GAIN)・SOLO/MUTE・OUT・MIX。画面は 1c */
 var P=[['s','mbOn','MULTIBAND',OO,0,'3つの帯域(低・中・高)に分け、帯域ごとに圧縮して足し直します。RATIOを1より上げた帯域だけが圧縮されます(初期値は全帯域1=音は変わりません)。負荷が高めです。'],
  ['k','mbX1','MB X1',40,1000,200,{curve:'log',fmt:'hz'},'低域と中域の境目の周波数。'],
  ['k','mbX2','MB X2',400,12000,2500,{curve:'log',fmt:'hz'},'中域と高域の境目の周波数。X1より少し(1.25倍)上までしか下げられません。']],
  M={mbX1:['x1',null,1],mbX2:['x2',null,1]};
 [['LO','低域',20,300],['MID','中域',10,200],['HI','高域',5,120]].forEach(function(b,i){var n=i+1,N=b[0]+' ',w=b[1];
  P.push(['k','mbT'+n,N+'THRESH',-60,0,-24,{fmt:'db'},w+'で、これを超えた音を抑えます。'],
   ['k','mbR'+n,N+'RATIO',1,20,1,{curve:'log',fmt:'x'},w+'を抑える強さ。1だと圧縮しません。'],
   ['k','mbA'+n,N+'ATTACK',.1,100,b[2],{curve:'log',fmt:'ms'},w+'の、抑え始める速さ。'],
   ['k','mbL'+n,N+'RELEASE',10,2000,b[3],{curve:'log',fmt:'ms'},w+'の、抑えを戻す速さ。'],
   ['k','mbG'+n,N+'GAIN',-24,24,0,{fmt:'db'},w+'の音量(圧縮のあと)。自動のメイクアップはありません。'],
   ['s','mbS'+n,N+'SOLO',OO,0,w+'だけを聴きます(ほかの帯域は鳴りません)。複数ONにするとそのぶんだけ鳴ります。'],
   ['s','mbM'+n,N+'MUTE',OO,0,w+'を消します。']);
  M['mbT'+n]=['t'+n,null,1];M['mbR'+n]=['r'+n,null,1];M['mbA'+n]=['a'+n,null,1];M['mbL'+n]=['l'+n,null,1];M['mbG'+n]=['g'+n,null,1];M['mbS'+n]=['s'+n,null,1];M['mbM'+n]=['m'+n,null,1]});
 P.push(['k','mbOut','MB OUT',-24,12,0,{fmt:'db'},'圧縮した音の全体の音量。'],
  ['k','mbMix','MB MIX',0,1,1,{},'原音との割合。100%=圧縮した音だけ。原音も同じ位相でそろえてあるので、混ぜても音が濁りません(パラレル圧縮)。']);
 M.mbOut=['out',null,1];M.mbMix=['mix',null,1];
 SD.fxAdd({k:'mb',name:'MULTIBAND',after:'cp',wn:'sd-mbcomp',on:'mbOn',heavy:true,params:P,map:M});
 /* FX-2 PITCH(sd-pitch)。md の後ろ・tr の前(README v10.0)。2a=SHIFT のみ・2b=FINE・GRAIN・MIX・ラック登録。時間領域(2つのヘッド+クロスフェード)=音が崩れる場面あり。フォルマントは保存しない */
 SD.fxAdd({k:'ps',name:'PITCH',after:'md',wn:'sd-pitch',on:'psOn',heavy:false,
  params:[['s','psOn','PITCH',OO,0,'音の高さを、長さを変えずにずらします(時間領域方式)。0半音なら音は変わらず、約20〜60ms遅れるだけです。声は高くすると細く、低くすると太くなります(フォルマントは保存しません)。'],
   ['k','psSh','SHIFT',-24,24,0,{step:1,fmt:'st'},'半音単位で上げ下げします。+12で1オクターブ上、-12で下。'],
   ['k','psFine','FINE',-100,100,0,{step:1,fmt:'ct'},'SHIFTにセント(半音の100分の1)で足します。MIXを半分にして±10〜30セントにするとダブラーになります。'],
   ['k','psGrain','GRAIN',10,100,40,{fmt:'ms'},'音を切り貼りする窓の長さ。短いと遅れが小さく粗い音、長いとなめらかで遅れが大きくなります。'],
   ['k','psMix','MIX',0,1,1,{},'原音との割合。原音も同じだけ遅らせてあるので、0半音のときは混ぜても音が濁りません。']],
  map:{psSh:['shift',null,1],psFine:['fine',null,1],psGrain:['grain',null,1],psMix:['mix',null,1]}});
 /* FX-3b REVERSE(sd-reverse。キーは rb=既存の REVERB(rv)と別。つまみID接頭辞も rb)。ps の後ろ・tr の前(拍同期のため TREMOLO の前)。拍に揃えた区間で録り、次の区間に時間反転して出す。遅延=LEN。ドライは遅らせない。LEN の値は SD.BEATLEN(beat.js)と同じ */
 SD.fxAdd({k:'rb',name:'REVERSE',after:'ps',wn:'sd-reverse',on:'rbOn',heavy:false,
  params:[['s','rbOn','REVERSE',OO,0,'入力を、拍に揃えた区間(LEN)ごとに録り、次の区間に時間を逆にして出します(本物の逆再生)。出てくる音はLENの長さだけ遅れ、最初の区間は無音です。テンポ・再生位置に合わせて動きます(停止中も、最後のテンポで進みます)。MIXを下げると原音(遅れない)に逆再生が重なります。'],
   ['s','rbLen','LEN',[[0,'1/8拍'],[1,'1/4拍'],[2,'1/2拍'],[3,'1拍'],[4,'2拍'],[5,'1小節']],3,'逆再生にする区間の長さ(拍。1小節=4拍)。長いほど、アタックが後ろに来る逆再生らしさが出て、遅れも大きくなります。'],
   ['k','rbMix','MIX',0,1,1,{},'原音との割合。0=原音だけ、100%=逆再生だけ(原音は遅らせません)。'],
   ['k','rbFb','FEEDBACK',0,.9,0,{},'逆再生の音の一部を、もう一度録りに戻します。次の区間でもう一度ひっくり返るので、順方向の繰り返しが少しずつ小さくなって続きます(0.9でも発振しません)。']],
  map:{rbLen:['len',null,0],rbMix:['mix',null,1],rbFb:['fb',null,1]}});
 /* FX-3c GLITCH(sd-glitch)。rb の後ろ・tr の前。拍同期のスタッター(遅延ゼロ。PROB=0 は素通し)。乱数は固定シード+再生開始でリセット */
 SD.fxAdd({k:'gl',name:'GLITCH',after:'rb',wn:'sd-glitch',on:'glOn',heavy:false,
  params:[['s','glOn','GLITCH',OO,0,'拍に揃えた区間(LEN)ごとに、確率(PROB)でスタッター(同じ短い断片のくり返し)にします。区間の頭の断片はそのまま通し、残りを断片のくり返しに置き換えるので、遅れません。確率の乱数は固定なので、同じ演奏は毎回同じグリッチになります(再生を始めるたびに最初から)。'],
   ['s','glLen','LEN',[[0,'1/8拍'],[1,'1/4拍'],[2,'1/2拍'],[3,'1拍'],[4,'2拍'],[5,'1小節']],3,'グリッチにするかどうかを決める区間の長さ(拍。1小節=4拍)。'],
   ['k','glProb','PROB',0,1,.5,{},'区間がグリッチになる確率。0=素通し(音は全く変わりません)、100%=毎区間。'],
   ['k','glRep','REPEAT',2,16,4,{step:1},'区間を何個の断片に分けるか。大きいほど断片が短く、細かいくり返しになります。'],
   ['k','glRev','REV',0,1,.25,{},'グリッチ区間のうち、くり返しを逆再生にする確率。'],
   ['s','glPitch','PITCH',[[0,'-12'],[1,'0'],[2,'+12']],1,'くり返しの再生速度。-12=半分の速さ(1オクターブ下)、+12=倍の速さ(1オクターブ上)。'],
   ['k','glMix','MIX',0,1,1,{},'原音との割合。グリッチ区間だけに掛かります。']],
  map:{glLen:['len',null,0],glProb:['prob',null,0],glRep:['rep',null,0],glRev:['rev',null,0],glPitch:['pitch',function(v){return(v-1)*12},0],glMix:['mix',null,1]}});
 /* FX-5 VOCODER(sd-vocoder)。gl の後ろ・tr の前。搬送波=マスターの音(入力0)・モジュレーター=vcSrc のトラック(入力1)。5a=配線・5b=フィルターバンク+エンベロープフォロワー・5c=NOISE・FORMANT・画面 */
 SD.fxAdd({k:'vc',name:'VOCODER',after:'gl',wn:'sd-vocoder',on:'vcOn',heavy:true,
  params:[['s','vcOn','VOCODER',OO,0,'別のトラック(SRC)の音の帯域ごとの強さを、マスターの音に移して「喋らせる」エフェクト(チャンネルボコーダー)。SRCがINTのあいだは何も変わりません。SRCに選んだトラックは、聞こえない状態で鳴らし続けます(その音を消したいときは、そのトラックの音量を下げてください)。負荷が高めです。'],
   ['s','vcSrc','SRC',[[0,'INT'],[1,'T1'],[2,'T2'],[3,'T3'],[4,'T4'],[5,'T5'],[6,'T6'],[7,'T7'],[8,'T8']],0,'モジュレーター(喋らせる側の音)にするトラック。INT=なし(素通し)。T1〜T8=そのトラックの音(VOLの前から取るので、トラックをミュートしても、ボリュームを下げても働きます)。'],
   ['s','vcBands','BANDS',[[0,'8'],[1,'12'],[2,'16'],[3,'20']],2,'周波数の帯域の数。多いほど言葉がはっきりしますが、重くなります。8だとロボットらしい粗さが出ます。'],
   ['k','vcLo','RANGE LO',50,1000,100,{curve:'log',fmt:'hz'},'帯域を並べる範囲の下限。'],
   ['k','vcHi','RANGE HI',2000,16000,8000,{curve:'log',fmt:'hz'},'帯域を並べる範囲の上限(LOの2倍までしか下がりません)。高くすると子音の「サ行」が出やすくなります。'],
   ['k','vcAtk','ATTACK',.5,100,5,{curve:'log',fmt:'ms'},'モジュレーターの強さに、どれだけ速く追いつくか。短いほど子音がはっきりします。'],
   ['k','vcRel','RELEASE',5,500,40,{curve:'log',fmt:'ms'},'音が弱まるときに、どれだけゆっくり戻るか。長いとなめらかで、短いと切れ味が出ます。'],
   ['k','vcNoise','NOISE',0,1,0,{},'ホワイトノイズを足して、「サ行」「タ行」のような息の子音を作ります(声の代わりの音には、のこぎり波などの周期のある音だけだと子音が出ません)。0=足しません。'],
   ['k','vcFmt','FORMANT',-12,12,0,{step:1,fmt:'st'},'合成する側の帯域だけを半音単位でずらします(分析する側は動かしません)。上げると声が細く・小さな口のように、下げると太く・大きな口のように聞こえます。0=ずらしません。'],
   ['k','vcMix','MIX',0,1,1,{},'原音(マスターの音)との割合。100%=ボコーダーの音だけ。']],
  map:{vcBands:['bands',function(v){return[8,12,16,20][v|0]||16}],vcLo:['lo',null,1],vcHi:['hi',null,1],vcAtk:['attack',null,1],vcRel:['release',null,1],vcMix:['mix',null,1],vcNoise:['noise',null,1],vcFmt:['formant',null,1]}});
 /* FX-4d SPECTRAL(sd-spectral。接頭辞 sp)。vc の後ろ・tr の前。FFT(窓長=遅延。ドライも同じだけ遅らせる)。MODE=BLUR/GATE/ROBOT/WHISPER/SHIFT(ワークレットの mode は 1〜5)。FREEZE は seg(レーンで切替できる)。最も重い=heavy */
 SD.fxAdd({k:'sp',name:'SPECTRAL',after:'vc',wn:'sd-spectral',on:'spOn',heavy:true,
  params:[['s','spOn','SPECTRAL',OO,0,'音をFFTで周波数ごとに分けて加工します。MODEで加工の種類、AMOUNTで量、FREEZEで音の凍結、TILTで低域/高域のどちらに強く掛けるかを決めます。SIZEの長さだけ遅れます(原音も同じだけ遅らせるので、MIXで濁りません)。このエフェクトは最も重く、「負荷:高」です。必要なときだけONにしてください。'],
   ['s','spMode','MODE',[[0,'BLUR'],[1,'GATE'],[2,'ROBOT'],[3,'WHISPER'],[4,'SHIFT']],0,'BLUR=周波数方向にぼかす(にじんだ音)/ GATE=弱い成分だけ消す(スペクトルゲート)/ ROBOT=位相をそろえる(機械的なブザー)/ WHISPER=位相をばらす(ささやき)/ SHIFT=全成分を一律にずらす(非調和。音程感は崩れます・上方向のみ)。'],
   ['k','spAmt','AMOUNT',0,1,.5,{},'MODEの掛かり具合。0=素通し。SHIFTは最大で約+3000Hzずれます(AMOUNTの2乗に比例)。'],
   ['s','spFz','FREEZE',OO,0,'ONにした瞬間の音を保持して、鳴らし続けます(パッドのように)。入力が止まっても鳴ります。OFFで入力に戻ります。MODEはFREEZEした音にも掛かります。オートメーションで切り替えられます。'],
   ['k','spTilt','TILT',-1,1,0,{},'MODEを掛ける周波数の偏り。0=全体に均一、+側=高域ほど強く、−側=低域ほど強く掛かります(FREEZEには掛かりません)。'],
   ['s','spSize','SIZE',[[0,'1024'],[1,'2048']],0,'FFTの窓の長さ(サンプル)。1024=約21ms遅れ・軽い、2048=約43ms遅れ・周波数が細かく重い。切り替えると内部の状態が空になります。'],
   ['k','spMix','MIX',0,1,1,{},'原音との割合。原音も窓の長さぶん遅らせてあるので、混ぜても音が濁りません。']],
  map:{spMode:['mode',function(v){return(v|0)+1},0],spAmt:['amount',null,1],spFz:['freeze',null,0],spTilt:['tilt',null,1],spSize:['size',function(v){return v==1?2048:1024},0],spMix:['mix',null,1]}});
})();
