/* ミキサー・FXラックの定義(データだけ。音は bus.js)。seq.js のテストからも単独で読める */
var SD=window.SD=window.SD||{};
/* トラックのミキサーつまみ(トラックごとに保存。IDは固定) */
SD.MIXP=[
 {id:'tVol',label:'VOL',min:0,max:1,def:1,type:'knob',curve:'lin',fmt:'pct',step:0,help:'トラックの音量。0〜100%(耳に合わせて指数カーブ)。'},
 {id:'tPan',label:'PAN',min:-1,max:1,def:0,type:'knob',curve:'lin',fmt:'pan',step:0,help:'トラックの左右の定位。'}];
/* v3.7: PITCH・DLY送り・RVB送り(トラックごと。旧データは 0 / 100% / 100% で従来と同じ音) */
SD.MIXP.push(
 {id:'tPitch',label:'PITCH',min:-24,max:24,def:0,type:'knob',curve:'lin',fmt:'st',step:0,help:'トラックの音程を半音単位で連続的にずらします(−24〜+24)。次に鳴らす音から反映されます。'},
 {id:'tDly',label:'DLY SEND',min:0,max:1,def:1,type:'knob',curve:'lin',fmt:'pct',step:0,help:'このトラックからDELAYへ送る量。0%でディレイが掛かりません。'},
 {id:'tRvb',label:'RVB SEND',min:0,max:1,def:1,type:'knob',curve:'lin',fmt:'pct',step:0,help:'このトラックからREVERBへ送る量。0%でリバーブが掛かりません。'});
/* v7.2: 出力先(OUT)。0=MASTER(従来)・1〜3=BUS A/B/C。旧データは 0 で従来と同じ音 */
SD.MIXP.push({id:'tOut',label:'OUT',min:0,max:3,def:0,type:'seg',opts:[[0,'MASTER'],[1,'BUS A'],[2,'BUS B'],[3,'BUS C']],help:'トラックの出力先。MASTER=そのままミックスへ / BUS A・B・C=グループバス(ドラム役・音楽役・声役)にまとめてEQ・COMPを掛けます。送り(DELAY/REVERB)はバスを通りません。'});
/* DUCK(v3.4・トラックごと): 指定トラックのノートオンでゲインをへこませる疑似サイドチェイン(音声は使わない) */
SD.MIXP.push(
 {id:'dkOn',label:'DUCK',min:0,max:1,def:0,type:'seg',opts:[[0,'OFF'],[1,'ON']],help:'ノートで掛ける疑似サイドチェイン。ソーストラックのノートが鳴るたびに、このトラックの音量をへこませます。'},
 {id:'dkSrc',label:'SRC',min:0,max:7,def:0,type:'seg',opts:[[0,'T1'],[1,'T2'],[2,'T3'],[3,'T4'],[4,'T5'],[5,'T6'],[6,'T7'],[7,'T8']],help:'へこませる合図にするトラック(自分自身は選べません)。'},
 {id:'dkDepth',label:'DEPTH',min:0,max:1,def:.7,type:'knob',curve:'lin',fmt:'pct',step:0,help:'へこませる深さ。100%で一瞬無音になります。'},
 {id:'dkAtk',label:'ATK',min:0,max:50,def:2,type:'knob',curve:'lin',fmt:'ms',step:0,help:'へこむまでの速さ。'},
 {id:'dkHold',label:'HOLD',min:0,max:200,def:20,type:'knob',curve:'lin',fmt:'ms',step:0,help:'へこんだまま保つ時間。'},
 {id:'dkRel',label:'REL',min:20,max:800,def:200,type:'knob',curve:'log',fmt:'ms',step:0,help:'元の音量に戻る時間。'},
 {id:'dkCurve',label:'CURVE',min:-1,max:1,def:0,type:'knob',curve:'lin',fmt:'pc100',step:0,help:'戻り方のカーブ。+は最初に素早く戻り、−は最初ゆっくり戻って最後に素早く戻ります。'});
/* ---- トラック別インサート(v7.0a): GATE・EQ4・COMP・SAT・MOD。IDは i 接頭辞。トラックごとに mix[k] へ保存(無いデータは既定=全OFF=従来と同じ音) ---- */
(function(){
 var P=[],OO=[[0,'OFF'],[1,'ON']];
 function S(g,id,label,opts,def,help){P.push({id:id,ins:g,label:label,min:opts[0][0],max:opts[opts.length-1][0],def:def,type:'seg',opts:opts,help:help||''})}
 function K(g,id,label,min,max,def,o,help){P.push(Object.assign({id:id,ins:g,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:help||''},o||{}))}
 S('gt','iGtOn','GATE',OO,0,'このトラックだけに掛けるノイズゲート。小さい音を静かにします。');
 K('gt','iGtThr','THRESH',-100,0,-50,{fmt:'db'},'これより小さい音を閉じます。');
 K('gt','iGtHold','HOLD',0,2000,100,{fmt:'ms'},'しきい値を下回っても、開いたまま保つ時間。');
 K('gt','iGtRel','RELEASE',1,5000,200,{curve:'log',fmt:'ms'},'閉じるときの速さ。');
 K('gt','iGtRange','RANGE',-120,0,-60,{fmt:'db'},'閉じたときの下げ幅。0dBだと何も変わりません。');
 S('eq','iEqOn','EQ',OO,0,'このトラックだけに掛けるイコライザー(EQ4)。ローカット・ハイカットと、棚2つ・ベル2つ。');
 K('eq','iEqHpf','LOW CUT',20,2000,20,{curve:'log',fmt:'hz'},'これより低い音を削ります。20Hzで素通し。');
 K('eq','iEqLpf','HIGH CUT',500,20000,20000,{curve:'log',fmt:'hz'},'これより高い音を削ります。20kHzで素通し。');
 K('eq','iEqLf','LOW FREQ',50,500,200,{curve:'log',fmt:'hz'},'低域の棚(シェルフ)の周波数。');
 K('eq','iEqLg','LOW',-15,15,0,{fmt:'db'},'低域の棚を持ち上げる・下げる。');
 K('eq','iEqB1f','BELL1 FREQ',80,2000,250,{curve:'log',fmt:'hz'},'ベル1の中心周波数(80〜2000Hz)。');
 K('eq','iEqB1g','BELL1',-15,15,0,{fmt:'db'},'ベル1を持ち上げる・下げる。');
 K('eq','iEqB1q','BELL1 Q',.3,8,1,{curve:'log',fmt:'q'},'ベル1の幅。大きいほど狭くなります。');
 K('eq','iEqB2f','BELL2 FREQ',400,12000,2500,{curve:'log',fmt:'hz'},'ベル2の中心周波数(400〜12000Hz。ベル1と重なってよい)。');
 K('eq','iEqB2g','BELL2',-15,15,0,{fmt:'db'},'ベル2を持ち上げる・下げる。');
 K('eq','iEqB2q','BELL2 Q',.3,8,1,{curve:'log',fmt:'q'},'ベル2の幅。大きいほど狭くなります。');
 K('eq','iEqHf','HIGH FREQ',2000,12000,4000,{curve:'log',fmt:'hz'},'高域の棚(シェルフ)の周波数。');
 K('eq','iEqHg','HIGH',-15,15,0,{fmt:'db'},'高域の棚を持ち上げる・下げる。');
 S('cp','iCpOn','COMP',OO,0,'このトラックだけに掛けるコンプレッサー。大きい音を抑えて音量をそろえます。');
 S('cp','iCpModel','COMP TYPE',[[1,'FET'],[2,'OPTO'],[3,'VCA']],3,'圧縮のクセ。FET=速くて元気 / OPTO=ゆったり / VCA=クセが少ない。');
 K('cp','iCpThr','THRESH',-60,0,-24,{fmt:'db'},'これを超えた音を抑えます。');
 K('cp','iCpRatio','RATIO',1,20,3,{curve:'log',fmt:'x'},'抑える強さ。大きいほど強く抑えます。');
 K('cp','iCpAtk','ATTACK',.01,100,10,{curve:'log',fmt:'ms'},'抑え始める速さ(OPTOでは使いません)。');
 K('cp','iCpRel','RELEASE',10,10000,250,{curve:'log',fmt:'ms'},'抑えを戻す速さ。');
 K('cp','iCpMake','MAKEUP',0,24,0,{fmt:'db'},'抑えたぶんの音量を持ち上げます。');
 K('cp','iCpKnee','KNEE',0,12,6,{fmt:'db'},'抑え始めのなめらかさ。0dBで急に、大きいほどなだらかに効き始めます。');
 K('cp','iCpMix','MIX',0,1,1,{fmt:'pct'},'圧縮した音と原音の混ぜ具合(パラレルコンプ)。100%で圧縮した音だけ。');
 K('cp','iCpScHpf','SC HPF',20,300,20,{curve:'log',fmt:'hz'},'圧縮の判定にだけ使うローカット。低音に引っぱられにくくなります。20Hzで素通し。');
 /* v8.2 本物のサイドチェイン: 圧縮するかどうかの判定を、別トラックの音(キー)で行う。0=INT(自分の音で判定=従来)・1〜8=T1〜T8 */
 S('cp','iCpSc','SC SRC',[[0,'INT'],[1,'T1'],[2,'T2'],[3,'T3'],[4,'T4'],[5,'T5'],[6,'T6'],[7,'T7'],[8,'T8']],0,'圧縮の判定に使う音(サイドチェイン)。INT=自分の音で判定(ふつうのコンプ)/T1〜T8=そのトラックの音が鳴ったときに、この音を抑えます(キックが鳴るたびにベースが引っ込む、など)。自分自身を選ぶとINTと同じ。キーにしたトラックの音は、聞こえなくても判定には使われます。');
 S('cp','iCpScLsn','SC LISTEN',OO,0,'ONにすると、判定に使っている音(SC HPFの後のキー)だけを聴けます。SC SRC がT1〜T8のときだけ働きます(確認用)。');
 S('ds','iDsOn','DE-ESS',OO,0,'このトラックだけに掛けるディエッサー。サ行などの耳に刺さる高域だけを、しきい値を超えた瞬間に抑えます。');
 K('ds','iDsFreq','DS FREQ',3000,10000,6500,{curve:'log',fmt:'hz'},'抑える帯域の中心(3〜10kHz)。声のサ行は目安としてこのあたり。');
 K('ds','iDsThr','DS THRESH',-60,0,-30,{fmt:'db'},'検出帯域の音がこれを超えたときだけ抑えます。');
 K('ds','iDsAmt','DS AMOUNT',0,24,6,{fmt:'db'},'抑える量の上限。0dBだと何も変わりません。');
 S('ds','iDsListen','DS LISTEN',[[0,'OFF'],[1,'ON']],0,'ONにすると、検出帯域だけを聴けます(狙った帯域に合っているかの確認用)。');
 S('sa','iSaOn','SAT',OO,0,'このトラックだけに掛ける歪み(サチュレーター)。');
 S('sa','iSaType','SAT TYPE',[[0,'SOFT'],[1,'TAPE'],[2,'TUBE'],[3,'NEVE'],[4,'MICPRE'],[5,'FUZZ']],0,'歪みの種類。SOFT=やわらかい歪み。');
 K('sa','iSaDrive','DRIVE',0,1,.3,{},'歪ませる量。');
 K('sa','iSaTone','TONE',1000,20000,20000,{curve:'log',fmt:'hz'},'歪ませた音の高域を丸めます(SOFT以外)。');
 K('sa','iSaMix','SAT MIX',0,1,1,{},'歪ませた音と原音の混ぜ具合(SOFT以外)。');
 K('sa','iSaOut','SAT OUT',-12,12,0,{fmt:'db'},'歪ませた音の出力(SOFT以外)。');
 S('md','iMdOn','MOD',OO,0,'このトラックだけに掛けるモジュレーション。');
 S('md','iMdType','MOD TYPE',[[0,'CHORUS'],[1,'DOUBLER'],[2,'FLANGER'],[3,'PHASER']],0,'揺らし方の種類。');
 K('md','iMdRate','RATE',.05,10,.8,{curve:'log',fmt:'hzf'},'揺れる速さ。');
 K('md','iMdDepth','DEPTH',0,1,.5,{},'揺れの深さ。');
 K('md','iMdFb','FEEDBACK',0,.9,0,{},'戻し量。');
 K('md','iMdMix','MOD MIX',0,1,.5,{},'エフェクト音の量。');
 S('ord','iOrd','ORDER',[[0,'EQ→COMP'],[1,'COMP→EQ']],0,'EQとCOMPをつなぐ順番。');
 SD.INSP=P;
 /* OR-3a: つまみIDから定義を引く。2段目は接尾辞 `_2`(元IDの英数字+`_2` だけ許す)で、元の定義の複製(id は接尾辞つき・inst:2)を返す。未知・不正な接尾辞(_1 _3 _02 や二重)は undefined */
 SD.insDef=function(id){if(typeof id!=='string')return undefined;var i,b=id,n=1;if(/_2$/.test(id)){b=id.slice(0,-2);n=2}else if(id.indexOf('_')>=0)return undefined;for(i=0;i<P.length;i++)if(P[i].id===b)break;if(i>=P.length)return undefined;if(n===1)return P[i];var c=Object.assign({},P[i]);c.id=id;c.base=b;c.inst=2;if(c.opts)c.opts=c.opts.slice();return c};
 /* v8.4 オートメーション: EQ4・COMP のつまみ(連続値)だけ対象にする。ON・切り替え(MODEL/SC SRC/ORDER など)は、動かすとノードの作り直しで音が途切れるので対象外。GATE・DE-ESS・SAT・MOD はまだ対象外 */
 SD.AUINS=[];P.forEach(function(p){if((p.ins==='eq'||p.ins==='cp')&&p.type==='knob')SD.AUINS.push(p.id);else{p.auto=false;p.autoWhy=(p.ins==='eq'||p.ins==='cp'||p.id==='iOrd')?'ONや切り替えは、音が途切れるので動かせません(つまみの値だけ動かせます)。':'このインサートは、まだオートメーションで動かせません(EQ・COMPのつまみは動かせます)。'}});
 /* インサートの並び(固定順。EQとCOMPの前後は iOrd)。heavy=ワークレット系(負荷の上限の数え方) */
 SD.INSG=[{k:'gt',name:'GATE',on:'iGtOn',heavy:1},{k:'eq',name:'EQ',on:'iEqOn'},{k:'cp',name:'COMP',on:'iCpOn',heavy:1},{k:'ds',name:'DE-ESS',on:'iDsOn',heavy:1},{k:'sa',name:'SAT',on:'iSaOn'},{k:'md',name:'MOD',on:'iMdOn',heavy:1}];
 SD.INSMAX=12;/* 重い処理(ワークレット系)の合計の上限。超えたら「負荷:高」(警告のみ・勝手にOFFにしない) */
 SD.INSORD=function(m){return SD.ordOf(m)};/* OR-1b: ord があればそれ、無ければ iOrd から(旧データは従来と同じ順) */
/* OR-1a: 並びの順列 mix.ord(新)。まだチェーンには使わない(OR-1b)。ord が無い・不正なら旧 iOrd から求める(=従来と同じ) */
SD.ORDDEF=['gt','eq','cp','ds','sa','md'];
SD.ordFromIOrd=function(v){return v==1?['gt','cp','eq','ds','sa','md']:SD.ORDDEF.slice()};
/* OR-3b: 並びは 6グループ(各1回)+2段目 `<グループ>_2`(各グループ1回まで)。総スロット ≤ SD.SLOTMAX(8)=決定事項7。それ以外は不正(従来順に丸める) */
SD.SLOTMAX=8;
SD.slotBase=function(g){return typeof g==='string'&&/_2$/.test(g)?g.slice(0,-2):g};
SD.slotSfx=function(g){return typeof g==='string'&&/_2$/.test(g)?'_2':''};
SD.ordValid=function(a){if(!Array.isArray(a)||a.length<SD.ORDDEF.length||a.length>SD.SLOTMAX)return false;var u={},nb=0;for(var i=0;i<a.length;i++){var g=a[i],b=SD.slotBase(g);if(typeof g!=='string'||SD.ORDDEF.indexOf(b)<0||u[g])return false;u[g]=1;if(b===g)nb++}return nb===SD.ORDDEF.length};
/* 2段目の追加・削除(新しい並びを返す。できなければ元のコピー)。追加は元グループの直後 */
SD.ordCanAdd=function(a,g){return SD.ordValid(a)&&SD.ORDDEF.indexOf(g)>=0&&a.indexOf(g+'_2')<0&&a.length<SD.SLOTMAX};
SD.ordAdd=function(a,g){var r=SD.ordValid(a)?a.slice():SD.ORDDEF.slice();if(!SD.ordCanAdd(r,g))return r;r.splice(r.indexOf(g)+1,0,g+'_2');return r};
SD.ordRemove=function(a,g){var r=SD.ordValid(a)?a.slice():SD.ORDDEF.slice(),i=r.indexOf(g);if(i<0||!SD.slotSfx(g))return r;r.splice(i,1);return r};
SD.ordOf=function(m){return m&&SD.ordValid(m.ord)?m.ord.slice():SD.ordFromIOrd(m&&m.iOrd)};
/* OR-1c: 順列の i 番目を d(-1=上/+1=下)だけ動かした新しい順列。範囲外・不正は元のコピー */
SD.ordMove=function(a,i,d){var r=SD.ordValid(a)?a.slice():SD.ORDDEF.slice();i=+i;d=d<0?-1:1;var j=i+d;if(!(i>=0&&i<r.length&&j>=0&&j<r.length&&i===Math.floor(i)))return r;var t=r[i];r[i]=r[j];r[j]=t;return r};
 /* レッスンの tk[].mx:{eq:{iEqOn:1,…},cp:{…}} を mix の平らなオブジェクトにする(未知のIDは捨てる) */
 SD.mxToMix=function(mx){var r={};if(mx&&typeof mx==='object')Object.keys(mx).forEach(function(g){var o=mx[g];if(o&&typeof o==='object')Object.keys(o).forEach(function(id){if(P.some(function(p){return p.id===id}))r[id]=o[id]})});return r};
})();
/* ---- v8.3 レッスン用: 本物のサイドチェイン(トラックの COMP の SC SRC を、キーにするトラックへ)の mix を作る ----
   DUCK(疑似)だった設定を置き換える。o.src=キーにするトラックの番号(0〜7。キックならふつう 0)・o.depth=沈み(0〜1。DUCK の dkDepth と同じ見かた。
   dB=−20log10(1−depth)・上限18dB)・o.key=キーの大きさの目安(dBFS。キックのキーは o1Lvl 1 で約−14・.45 で約−20)・o.rel=戻り(ms)・o.extra=ほかのつまみ。
   VCA(model 3)・ATK 2ms・RATIO 10・KNEE 6。THRESH は「キーが key のとき、dB だけ抑える」ように決める。
   サイドチェインのときは COMP の自動メイクアップを掛けない(fx-src/comp.js)ので、キーが無いときの音量は変わらない。 */
SD.scMix=function(o){o=o||{};
 var ratio=10,depth=Math.max(.2,Math.min(.95,o.depth==null?.8:o.depth)),dB=Math.min(18,-20*Math.log10(1-depth)),key=o.key==null?-20:o.key,
  thr=Math.max(-60,Math.min(-6,Math.round(key-dB/(1-1/ratio)))),
  r={iCpOn:1,iCpModel:3,iCpSc:(o.src|0)+1,iCpThr:thr,iCpRatio:ratio,iCpAtk:2,iCpRel:o.rel==null?100:o.rel,iCpMake:0,iCpKnee:6,iCpMix:1,iCpScHpf:20};
 Object.keys(o.extra||{}).forEach(function(k){r[k]=o.extra[k]});return r};
/* ---- グループバス(v7.2): BUS A(ドラム役)・B(音楽役)・C(声役)。各バスは EQ4+COMP+VOL。ID はトラックのインサートと同じ(iEq* iCp*)+ bVol。play.bm[0..2] に保存 ---- */
SD.BUSN=['BUS A','BUS B','BUS C'];SD.BUSROLE=['ドラム役','音楽役','声役'];
SD.BUSP=[{id:'bVol',label:'VOL',min:0,max:1,def:1,type:'knob',curve:'lin',fmt:'pct',step:0,help:'バスの音量。0〜100%。'}].concat(SD.INSP.filter(function(p){return(p.ins==='eq'||p.ins==='cp'||p.id==='iOrd')/* SB: バスのCOMPにも SC SRC・SC LISTEN を出す(キー元はトラックのみ) */}));
SD.BUSDEF=function(){var r={};SD.BUSP.forEach(function(p){r[p.id]=p.def});return r};
SD.busClean=function(o){var r=SD.BUSDEF();if(o&&typeof o==='object')SD.BUSP.forEach(function(p){var v=+o[p.id];if(isFinite(v))r[p.id]=Math.max(p.min,Math.min(p.max,p.type==='seg'?Math.round(v):v))});return r};
/* レッスンの tk[].o.out('A'|'B'|'C'|1〜3)を mix の tOut にする(mix が null なら必要なときだけ作る) */
SD.withOut=function(mix,out){var n=typeof out==='string'?'ABC'.indexOf(out)+1:(out|0);if(!(n>=1&&n<=3))return mix;var r=Object.assign({},mix||{});r.tOut=n;return r};
/* 聞き比べの tm(1トラックぶん {つまみID:値})が COMP のつまみを書くのに、SC SRC / SC LISTEN を書いていないときは、INT / OFF を補う(v8.2)。
   ユーザーが別トラックにサイドチェインを設定していても、聞き比べには漏れない(従来のレッスンは SC を書かないので、これまでと同じ音)。SC を書いたレッスンはそのまま */
SD.cmpTmFill=function(tm){if(!tm||typeof tm!=='object')return tm;var ids=Object.keys(tm),cp=ids.some(function(id){return id.slice(0,3)==='iCp'&&id!=='iCpSc'&&id!=='iCpScLsn'});
 if(!cp)return tm;var r=Object.assign({},tm);if(r.iCpSc===undefined)r.iCpSc=0;if(r.iCpScLsn===undefined)r.iCpScLsn=0;return r};
SD.MIXALL=()=>SD.MIXP.concat(SD.INSP||[]);
SD.MIXDEF=()=>{const r={};SD.MIXALL().forEach(p=>{r[p.id]=p.def});return r};
SD.mixClean=o=>{const r=SD.MIXDEF();if(o&&typeof o==='object')SD.MIXALL().forEach(p=>{const v=+o[p.id];if(isFinite(v))r[p.id]=Math.max(p.min,Math.min(p.max,p.type==='seg'?Math.round(v):v))});if(o&&typeof o==='object'&&SD.ordValid(o.ord)){r.ord=o.ord.slice();/* OR-1a: 正しい順列だけ持つ(無い・不正は持たない=iOrd から求める) */
 /* OR-3b: 2段目のつまみは、ord にその2段目がいるものだけ・定義の範囲に丸めて持つ(無いつまみは既定で読まれる) */
 var ex=r.ord.filter(function(g){return SD.slotSfx(g)});if(ex.length)SD.INSP.forEach(function(p){var gk=p.ins+'_2';if(ex.indexOf(gk)<0&&!(p.ins==='ord'))return;if(p.ins==='ord')return;var d=SD.insDef(p.id+'_2'),v=+o[d.id];if(o[d.id]!==undefined&&isFinite(v))r[d.id]=Math.max(d.min,Math.min(d.max,d.type==='seg'?Math.round(v):v))})}return r};

/* ---- メーター(v7.0b)の純粋関数。buf=Float32Array(時間波形)。dBFS(-90で下限)。RMSは「目安」 ---- */
SD.meterDb=function(buf){var pk=0,ss=0,n=buf.length;for(var i=0;i<n;i++){var a=buf[i],b=a<0?-a:a;if(b>pk)pk=b;ss+=a*a}
 return{peak:Math.max(-90,20*Math.log10(Math.max(pk,1e-9))),rms:n?Math.max(-90,20*Math.log10(Math.max(Math.sqrt(ss/n),1e-9))):-90}};
/* dB→メーターの高さ(0〜1。-60dB〜0dB) */
SD.meterFrac=function(db){return Math.max(0,Math.min(1,(db+60)/60))};
/* ピークホールド: 上がるときは即・下がるときは fall dB/秒 */
SD.peakHold=function(prev,cur,dt,fall){return Math.max(cur,prev-(fall==null?20:fall)*dt)};
/* クリップ判定(0dBFS以上) */
SD.isClip=function(peakDb){return peakDb>=-0.1};

/* ---- 解析ビュー(v7.1a)の純粋関数 SD.Mix。表示のためだけ(音は変えない)。スペクトルは dB の配列(AnalyserNode.getFloatFrequencyData と同じ並び)。
   帯域の定義は SD.BANDS(course.js)の1か所のみ。ぶつかり度は学習用の指標で、耳が最終判断 ---- */
SD.Mix=(function(){
 var M={};
 /* dB配列 → 線形パワー合計(dB配列)。「それ以外すべて」を作るのに使う */
 M.sumPow=function(list){var n=0,i,k;list.forEach(function(a){if(a&&a.length>n)n=a.length});var o=new Float64Array(n);
  list.forEach(function(a){if(a)for(k=0;k<n;k++)if(a[k]>-119.9)o[k]+=Math.pow(10,a[k]/10)});
  var r=new Float32Array(n);for(k=0;k<n;k++)r[k]=o[k]>0?10*Math.log10(o[k]):-120;return r};
 /* 帯域ごとのレベル(dB。帯域内の平均パワー)。bands=SD.BANDS 形式 */
 M.bandLevels=function(db,sr,bands){bands=bands||SD.BANDS;var n=db.length,hz=sr/(2*n);
  return bands.map(function(b){var s=0,c=0;for(var k=Math.max(1,Math.ceil(b.lo/hz));k<n&&k*hz<b.hi;k++){if(db[k]>-119.9)s+=Math.pow(10,db[k]/10);c++}return c&&s>0?10*Math.log10(s/c):-120})};
 /* 帯域レベル(dB) → 0〜1(-90〜-30dB。1ビンあたりの平均パワーなので全体の dB より低めに出る) */
 M.lvFrac=function(db){return Math.max(0,Math.min(1,(db+90)/60))};
 /* ぶつかり度 0〜100: 帯域ごとの「小さいほうのレベル」(0〜1)を足して帯域数で割る。2つとも出ている帯域だけが数字になる */
 M.overlap=function(a,b){var n=Math.min(a.length,b.length);if(!n)return 0;var s=0;for(var i=0;i<n;i++)s+=Math.min(M.lvFrac(a[i]),M.lvFrac(b[i]));return Math.round(s/n*100)};
 /* スペクトルの重心(Hz。対数で平均)。無音は null */
 M.centroid=function(db,sr){var n=db.length,hz=sr/(2*n),sp=0,sw=0;for(var k=1;k<n;k++){var f=k*hz;if(f<20||f>20000)continue;if(!(db[k]>-119.9))continue;var p=Math.pow(10,db[k]/10);sp+=p*Math.log(f);sw+=p}return sw>0?Math.exp(sp/sw):null};
 /* MIXマップの1点: x=PAN(0〜1・左→右)・y=重心(対数。20Hz=0〜20kHz=1)・r=レベル(0〜1)・blur=リバーブの量(0〜1) */
 M.mapPoint=function(o){var c=o.centroid,y=c==null?0:Math.max(0,Math.min(1,Math.log(c/20)/Math.log(1000)));
  return{x:(Math.max(-1,Math.min(1,o.pan||0))+1)/2,y:y,r:Math.max(0,Math.min(1,((o.level==null?-90:o.level)+60)/60)),blur:Math.max(0,Math.min(1,o.rvb||0))}};
 return M})();

/* ---- 目安表 SD.GUIDE(v7.1b・付録A)。本文の数値はここだけを根拠にする。すべて目安(曲や音色で変わる)。
   本文には数値を直接書かず {g:役割.項目} と書く(SD.guideTxt が展開。無い項目は検査で落ちる)。帯域名は SD.BANDS ---- */
SD.GUIDE={
 roles:{
  kick:{name:'キック',keep:[[50,100,'重さ'],[2000,5000,'アタックの点']],cut:[[250,500,'箱っぽさ']],hpf:[30,30],pan:{txt:'中央'},depth:'手前(ドライ)'},
  bass:{name:'ベース',keep:[[40,100,'基音'],[700,1500,'輪郭']],cut:[[200,400,'濁り']],hpf:[30,30],pan:{txt:'中央'},depth:'手前'},
  snare:{name:'スネア・クラップ',keep:[[150,250,'胴'],[3000,6000,'スナップ']],cut:[[400,800,'箱っぽさ']],hpf:[100,100],pan:{txt:'中央(クラップは少し広げてよい)'},depth:'中(リバーブ可)'},
  hat:{name:'ハット・シェイカー',keep:[[6000,12000,'きらめき']],cut:[[20,300,'ほぼ不要']],hpf:[300,500],pan:{lo:10,hi:30},depth:'中〜奥'},
  pad:{name:'コード・キー・パッド',keep:[[250,2000,'ボディ'],[4000,12000,'空気感']],cut:[[20,200,'ベースと重なる'],[1000,4000,'声のために空ける']],hpf:[100,200],pan:{txt:'左右に広く'},depth:'奥(リバーブ多め)'},
  lead:{name:'リード・アルペジオ',keep:[[1000,4000,'主役']],cut:[[20,200,'低域'],[3000,5000,'刺さり']],hpf:[150,250],pan:{txt:'中央寄り〜少しずらす'},depth:'手前〜中'},
  vocal:{name:'声(代役を含む)',keep:[[100,250,'太さ'],[2000,5000,'明瞭さ'],[8000,12000,'空気感']],cut:[[200,400,'濁り'],[5000,9000,'歯擦音']],hpf:[80,120],pan:{txt:'中央'},depth:'手前(PRE DLYで距離)'},
  dbl:{name:'ダブル・ハモリ',keep:[[100,5000,'声より少し暗く']],cut:[[20,150,'低域'],[5000,9000,'歯擦音']],hpf:[150,150],pan:{lo:30,hi:70},depth:'声の後ろ(音量は声より小さく)'},
  fx:{name:'ライザー・FX',keep:[],cut:[[20,200,'低域']],hpf:[200,500],pan:{txt:'広く'},depth:'奥〜中'}},
 dyn:{grBass:[3,6],grVocal:[3,6],grDrumBus:[2,4],grMaster:[1,3],rvPre:[20,60],eqStart:[1,3]},
 units:{grBass:'dB',grVocal:'dB',grDrumBus:'dB',grMaster:'dB',rvPre:'ms',eqStart:'dB'}};
SD.guideRange=function(lo,hi){var k=function(v){return v>=1000};
 if(lo===hi)return(k(lo)?lo/1000+'kHz':lo+'Hz')+'前後';
 if(k(lo)&&k(hi))return lo/1000+'〜'+hi/1000+'kHz';if(!k(lo)&&!k(hi))return lo+'〜'+hi+'Hz';return lo+'Hz〜'+hi/1000+'kHz'};
/* {g:kick.keep0} {g:kick.cut0} {g:kick.hpf} {g:hat.pan} {g:dyn.grBass} → 文字列。解決できなければ null */
SD.guideOne=function(key){var m=/^(\w+)\.([a-zA-Z]+)(\d*)$/.exec(key),G=SD.GUIDE;if(!m)return null;
 if(m[1]==='dyn'){var d=G.dyn[m[2]+m[3]];return d?d[0]+'〜'+d[1]+G.units[m[2]+m[3]]:null}
 var r=G.roles[m[1]];if(!r)return null;var f=m[2];
 if(f==='keep'||f==='cut'){var a=r[f][+m[3]||0];return a?SD.guideRange(a[0],a[1]):null}
 if(f==='hpf')return r.hpf?SD.guideRange(r.hpf[0],r.hpf[1]):null;
 if(f==='pan')return r.pan?(r.pan.txt||('左右 ±'+r.pan.lo+'〜'+r.pan.hi+'%')):null;
 if(f==='depth')return r.depth||null;if(f==='name')return r.name;return null};
SD.guideTxt=function(t){return String(t).replace(/\{g:([^}]+)\}/g,function(m,k){var v=SD.guideOne(k);return v==null?m:v})};
SD.guideKeys=function(t){var r=[],re=/\{g:([^}]+)\}/g,m;while((m=re.exec(String(t))))r.push(m[1]);return r};
/* ---- 目標 mx / mt の純粋関数(v7.1b) ---- */
SD.MixGoal={
 MT:{peak:'PEAK',rms:'RMS(目安)',gr:'GR',ovl:'ぶつかり度'},
 inRange:function(v,rng){return v!=null&&isFinite(v)&&v>=rng[0]-1e-9&&v<=rng[1]+1e-9},
 /* hold秒つづけて範囲に入ったら達成。一瞬の外れ(0.3秒まで)は許す */
 hold:function(st,ok,dt,hold){if(ok){st.ok+=dt;st.bad=0}else{st.bad+=dt;if(st.bad>.3)st.ok=0}return st.ok>=hold},
 /* mx: インサートのつまみが範囲に入っているか(mixはトラックの mix オブジェクト) */
 mxMet:function(g,mix){var v=mix&&mix[g.k];return SD.MixGoal.inRange(v,g.rng)},
 /* レッスン定義の検査(エラー文字列の配列)。trk は 1 始まり */
 check:function(L){var e=[],G=SD.MixGoal,nT=Math.max(SD.MAXT||8,1),P=function(id){return SD.insDef(id)};
  if(L.sc!==undefined){if(!Array.isArray(L.sc)||L.sc.length<1||L.sc.length>6)e.push(L.id+': sc は1〜6個');else{var nm={};L.sc.forEach(function(c,j){var w2=L.id+' sc'+(j+1)+': ';if(!c.name||nm[c.name])e.push(w2+'name が空か重複');nm[c.name]=1;
    Object.keys(c.mix||{}).forEach(function(t){if(!(t>=1&&t<=nT))e.push(w2+'mix のトラック番号が範囲外 '+t);Object.keys(c.mix[t]).forEach(function(id){var p=SD.MIXALL().filter(function(q){return q.id===id})[0];if(!p)e.push(w2+'mix の ID が不明 '+id);else if(p.type!=='seg'&&!(c.mix[t][id]>=p.min&&c.mix[t][id]<=p.max))e.push(w2+id+' が範囲外')})})})}}
  (L.steps||[]).forEach(function(s,i){var w=L.id+' step'+(i+1)+': ';
   (s.mx||[]).forEach(function(g){var p=P(g.k);
    if(!(g.trk>=1&&g.trk<=nT))e.push(w+'mx trk が範囲外');
    /* v7.8a: ins:'mix' はトラックのミキサーつまみ(tPan・tVol など)の範囲目標 */
    if(g.ins==='mix'){var q=SD.MIXP.filter(function(z){return z.id===g.k})[0];if(!q)e.push(w+'mx(mix) k が不明 '+g.k);else if(!(g.rng&&g.rng.length===2&&g.rng[0]<g.rng[1]&&g.rng[0]>=q.min&&g.rng[1]<=q.max))e.push(w+'mx(mix) rng が不正');return}
    if(!SD.INSG.some(function(q){return q.k===g.ins}))e.push(w+'mx ins が不明 '+g.ins);
    if(!p)e.push(w+'mx k が不明 '+g.k);else{if(p.ins!==g.ins&&!(p.ins==='ord'))e.push(w+'mx k が ins と合わない');if(p.type==='seg')e.push(w+'mx は範囲目標(つまみ)用。seg は不可');
     if(!(g.rng&&g.rng.length===2&&g.rng[0]<g.rng[1]&&g.rng[0]>=p.min&&g.rng[1]<=p.max))e.push(w+'mx rng が不正(つまみの範囲外か幅なし)')}});
   (s.mt||[]).forEach(function(g){
    if(!G.MT[g.m])e.push(w+'mt m が不明 '+g.m);
    if(!(g.trk==='M'||(g.trk>=1&&g.trk<=nT)))e.push(w+'mt trk が不正');
    if(g.m==='gr'&&g.trk==='M')e.push(w+'mt gr はトラックのみ');
    if(!(g.rng&&g.rng.length===2&&g.rng[0]<g.rng[1]))e.push(w+'mt rng が不正');
    if(g.m==='ovl'&&!(g.rng[0]>=0&&g.rng[1]<=100))e.push(w+'mt ovl は 0〜100');
    if(g.m==='ovl'&&g.trk==='M')e.push(w+'mt ovl はトラックのみ');
    if(!(g.hold>=0&&g.hold<=30))e.push(w+'mt hold は 0〜30秒')});
   (s.sn||[]).forEach(function(g){var names=(L.sc||[]).map(function(x){return x.name});
    if(names.indexOf(g.scene)<0)e.push(w+'sn scene が L.sc に無い '+g.scene);
    if(!(g.at>=0&&g.at<32&&g.at%1===0))e.push(w+'sn at は 0〜31 の整数(小節)');
    if(['0','≥1beat','≥1bar'].indexOf(g.glide)<0)e.push(w+'sn glide は 0/≥1beat/≥1bar')});
   (s.cmp||[]).forEach(function(c,j){if(c.g!==undefined&&!(typeof c.g==='number'&&c.g<=0&&c.g>=-24))e.push(w+'cmp'+(j+1)+' g は -24〜0dB')});
   [s.h,s.b].concat((s.col?(Array.isArray(s.col)?s.col:[s.col]):[]).reduce(function(a,c){return a.concat([c.h,c.b])},[])).forEach(function(t){SD.guideKeys(t||'').forEach(function(k){if(SD.guideOne(k)==null)e.push(w+'目安表に無い {g:'+k+'}')})})});
  return e},
 /* 聞き比べの音量: 各案の測定レベル(dB)+補正g を比べ、最大差を返す(1dB以内が合格) */
 cmpSpread:function(levels,gs){var v=levels.map(function(l,i){return l+(gs&&gs[i]||0)});return Math.max.apply(null,v)-Math.min.apply(null,v)}};
SD.volGain=v=>v*v;
/* DUCK の包絡(純粋関数)。ノートオンから dt 秒後のゲイン(1=そのまま)。m は mix({dkDepth,dkAtk,dkHold,dkRel,dkCurve}。時間はms) */
/* リターンDUCK(r='dl'|'rv')のつまみ値 → duckEnv が読む形(CURVEは0固定) */
SD.retDuckM=(r,val)=>({dkDepth:val(r+'DuckDepth'),dkAtk:val('rtDuckAtk'),dkHold:val('rtDuckHold'),dkRel:val('rtDuckRel'),dkCurve:0});
SD.duckEnv=(m,dt)=>{
 const d=m.dkDepth,a=m.dkAtk/1000,h=m.dkHold/1000,r=m.dkRel/1000,fl=1-d;
 if(dt<0)return 1;
 if(a>0&&dt<a)return 1-d*dt/a;
 if(dt<a+h)return fl;
 if(dt<a+h+r){const u=(dt-a-h)/r;return fl+d*Math.pow(u,Math.pow(4,-m.dkCurve))}
 return 1;
};

/* ---- FXラック(v3.2): 固定順チェーン GATE→EQ→SAT→MOD→COMP → センド DELAY/REVERB。IDは固定 ---- */
(function(){
 var FXP=[],OO=[[0,'OFF'],[1,'ON']];
 function K(id,label,min,max,def,o,help){FXP.push(Object.assign({id:id,tab:'fx',label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:help||''},o||{}));}
 function S(id,label,opts,def,help){FXP.push({id:id,tab:'fx',label:label,type:'seg',opts:opts,def:def,help:help||''});}
 /* GATE */
 S('gtOn','GATE',OO,0,'ノイズゲート。小さい音(しきい値以下)を静かにします。余韻やノイズの切り落としに使います。');
 K('gtThr','THRESH',-100,0,-50,{fmt:'db'},'これより小さい音を閉じます。');
 K('gtHold','HOLD',0,2000,100,{fmt:'ms'},'しきい値を下回っても、開いたまま保つ時間。');
 K('gtRel','RELEASE',1,5000,200,{curve:'log',fmt:'ms'},'閉じるときの速さ(長いほどゆっくり)。');
 K('gtRange','RANGE',-120,0,-60,{fmt:'db'},'閉じたときの下げ幅。0dBだと何も変わりません。');
 /* EQ */
 S('eqOn','EQ',OO,0,'イコライザー。ローカット・ハイカットと、低域・中域・高域の3バンド。');
 K('eqHpf','LOW CUT',20,2000,20,{curve:'log',fmt:'hz'},'これより低い音を削ります。20Hzで素通し。');
 K('eqLpf','HIGH CUT',500,20000,20000,{curve:'log',fmt:'hz'},'これより高い音を削ります。20kHzで素通し。');
 K('eqLo','LOW',-15,15,0,{fmt:'db'},'低域(200Hz付近より下)を持ち上げる・下げる。');
 K('eqMid','MID',-15,15,0,{fmt:'db'},'中域を持ち上げる・下げる(中心はMID FREQ)。');
 K('eqMidF','MID FREQ',200,8000,1000,{curve:'log',fmt:'hz'},'中域バンドの中心周波数。');
 K('eqMidQ','MID Q',.3,8,1,{curve:'log',fmt:'q'},'中域バンドの幅。大きいほど狭くなります。');
 K('eqHi','HIGH',-15,15,0,{fmt:'db'},'高域(4kHz付近より上)を持ち上げる・下げる。');
 /* SAT (旧DRIVE。drive は旧ID。SOFT のときは v3.0 と同じ音) */
 S('saType','SAT TYPE',[[0,'SOFT'],[1,'TAPE'],[2,'TUBE'],[3,'NEVE'],[4,'MICPRE'],[5,'FUZZ']],0,'歪みの種類。SOFT=従来のドライブ。TAPE/TUBE/NEVE/MICPRE/FUZZ=機材風の歪み。');
 K('saTone','TONE',1000,20000,20000,{curve:'log',fmt:'hz'},'歪ませた音の高域を丸めます(SOFT以外)。');
 K('saMix','SAT MIX',0,1,1,{},'歪ませた音と原音の混ぜ具合(SOFT以外)。');
 K('saOut','SAT OUT',-12,12,0,{fmt:'db'},'歪ませた音の出力(SOFT以外)。');
 /* MOD */
 S('mdOn','MOD',OO,0,'モジュレーション。コーラス・ダブラー・フランジャー・フェイザー。');
 S('mdType','MOD TYPE',[[0,'CHORUS'],[1,'DOUBLER'],[2,'FLANGER'],[3,'PHASER']],0,'揺らし方の種類。');
 K('mdRate','RATE',.05,10,.8,{curve:'log',fmt:'hzf'},'揺れる速さ。');
 K('mdDepth','DEPTH',0,1,.5,{},'揺れの深さ。');
 K('mdFb','FEEDBACK',0,.9,0,{},'戻し量。上げるとクセの強い音になります。');
 K('mdMix','MOD MIX',0,1,.5,{},'エフェクト音の量。');
 /* COMP */
 S('cpOn','COMP',OO,0,'コンプレッサー。大きい音を抑えて音量をそろえます。');
 S('cpModel','COMP TYPE',[[1,'FET'],[2,'OPTO'],[3,'VCA']],1,'圧縮のクセ。FET=速くて元気 / OPTO=ゆったり / VCA=クセが少ない。');
 K('cpThr','THRESH',-60,0,-24,{fmt:'db'},'これを超えた音を抑えます。');
 K('cpRatio','RATIO',1,20,3,{curve:'log',fmt:'x'},'抑える強さ。大きいほど強く抑えます。');
 K('cpAtk','ATTACK',.01,100,10,{curve:'log',fmt:'ms'},'抑え始める速さ(OPTOでは使いません)。');
 K('cpRel','RELEASE',10,10000,250,{curve:'log',fmt:'ms'},'抑えを戻す速さ。');
 K('cpMake','MAKEUP',0,24,0,{fmt:'db'},'抑えたぶんの音量を持ち上げます。');
  /* AUTO FILTER (v3.3) */
 var DIV=[[0,'1/1'],[1,'1/2'],[2,'1/4.'],[3,'1/4'],[4,'1/8.'],[5,'1/8'],[6,'1/8T'],[7,'1/16'],[8,'1/16T']];
 S('afOn','AUTO FILT',OO,0,'オートフィルター。フィルターのカットオフを、LFOや音の大きさで自動的に動かします。');
 S('afType','AF TYPE',[[0,'LP'],[1,'HP'],[2,'BP'],[3,'NOTCH']],0,'フィルターの種類。LP=高域を削る / HP=低域を削る / BP=帯域だけ通す / NOTCH=帯域だけ削る。');
 S('afMode','AF MODE',[[0,'MANUAL'],[1,'LFO'],[2,'ENV']],1,'動かし方。MANUAL=動かさない / LFO=一定の周期で動かす / ENV=入力の音量に反応して動かす。');
 K('afCut','AF CUTOFF',40,16000,1000,{curve:'log',fmt:'hz'},'フィルターの中心になる周波数。');
 K('afRes','AF RES',0,1,.3,{},'カットオフ付近の強調(レゾナンス)。');
 K('afDepth','AF DEPTH',0,1,.5,{},'動かす幅。100%でカットオフを上下に最大4オクターブ動かします。');
 K('afRate','AF RATE',.05,20,1,{curve:'log',fmt:'hzf'},'LFOの速さ(SYNCがFREEのとき)。');
 S('afSync','AF SYNC',[[0,'FREE'],[1,'SYNC']],0,'FREE=Hzで指定 / SYNC=テンポに合わせた長さで指定。');
 S('afDiv','AF DIV',DIV,5,'SYNCのときの1周期の長さ(1/8=八分音符)。');
 S('afShape','AF SHAPE',[[0,'SINE'],[1,'TRI'],[2,'SAW'],[3,'SQUARE'],[4,'S&H']],0,'LFOの形。S&H=周期ごとにランダムな値。');
 K('afSens','AF SENS',0,1,.5,{},'ENVのとき、音の大きさにどれだけ反応するか。');
 K('afAtk','AF ATTACK',.1,500,5,{curve:'log',fmt:'ms'},'ENVのとき、音が大きくなったことに反応する速さ。');
 K('afRel','AF RELEASE',1,2000,120,{curve:'log',fmt:'ms'},'ENVのとき、音が小さくなったことに戻る速さ。');
 /* DJ FILTER */
 S('djOn','DJ FILTER',OO,0,'DJミキサー風のフィルター。1つのつまみで、左=ローパス(こもらせる)・右=ハイパス(低音を抜く)。');
 K('djFilter','DJ FILTER',-1,1,0,{fmt:'pc100'},'中央で素通し。左に回すと高域が削れ、右に回すと低域が削れます。');
 K('djRes','DJ RES',0,1,.2,{},'カットオフ付近の強調。');
 /* TREMOLO / AUTOPAN */
 S('trOn','TREMOLO',OO,0,'トレモロ(音量を揺らす)とオートパン(左右に振る)。');
 S('trMode','TR MODE',[[0,'TREMOLO'],[1,'PAN']],0,'TREMOLO=音量を揺らす / PAN=左右の音量を交互に揺らす。');
 K('trRate','TR RATE',.05,20,4,{curve:'log',fmt:'hzf'},'揺れる速さ(SYNCがFREEのとき)。');
 S('trSync','TR SYNC',[[0,'FREE'],[1,'SYNC']],0,'FREE=Hzで指定 / SYNC=テンポに合わせた長さで指定。');
 S('trDiv','TR DIV',DIV,5,'SYNCのときの1周期の長さ。');
 S('trShape','TR SHAPE',[[0,'SINE'],[1,'TRI'],[2,'SQUARE'],[3,'SAW']],0,'揺れ方の形。SQUARE=ON/OFFを繰り返す(ゲート)。');
 K('trDepth','TR DEPTH',0,1,.5,{},'揺れの深さ。100%で一瞬無音になります。');
 K('trSpread','TR SPREAD',0,1,1,{},'PANのとき、左右の揺れのずれ。100%で左右が逆位相(交互に鳴る)。');
 /* STEREO WIDTH */
 S('swOn','WIDTH',OO,0,'ステレオの広がりを変えます。0%でモノ、200%で広げます(150Hz未満は広げません)。');
 K('swWidth','WIDTH AMT',0,2,1,{fmt:'pct'},'0%=モノ / 100%=そのまま / 200%=広げる。');
 /* DELAY 追加分(dlyTime dlyFb dlyMix は従来) */
 S('dlySync','DLY SYNC',[[0,'FREE'],[1,'SYNC']],0,'FREE=ミリ秒で指定 / SYNC=テンポに合わせた間隔(DIVで指定)。');
 S('dlyDiv','DLY DIV',DIV,5,'SYNCのときの間隔(1/8=八分音符、1/4.=付点四分、1/8T=八分三連)。');
 K('dlyTone','DLY TONE',500,12000,4500,{curve:'log',fmt:'hz'},'繰り返すたびに高域を丸める度合い。低いほど暗く溶けていきます。');
 S('dlyPP','PING-PONG',OO,0,'ONにすると、繰り返しが左右に交互に飛びます。');
 S('dlyMode','DLY MODE',[[0,'TAPE'],[1,'DIGITAL']],0,'TAPE=間隔を動かすとピッチが滑る / DIGITAL=滑らず切り替わる。');
  /* BITCRUSH (v3.4) */
  S('bcOn','BITCRUSH',OO,0,'ビットクラッシャー。音をわざと粗くします(ローファイ・チップチューン風)。');
  K('bcBits','BITS',1,16,16,{step:1,fmt:'int'},'音の大きさの細かさ(ビット深度)。16で素通し。小さいほどザラザラ・ノイジーになります。');
  K('bcRate','DOWNSAMPLE',1,64,1,{curve:'log',step:1,fmt:'int'},'サンプルの間引き。1で素通し。大きいほど高音が折り返して(エイリアシング)金属的に濁ります。');
  K('bcMix','BC MIX',0,1,1,{},'粗くした音と原音の混ぜ具合。');
  /* RING MOD */
  S('rmOn','RING MOD',OO,0,'リングモジュレーター。音に別の波を掛け算して、金属的・ロボット的な音にします。');
  K('rmFreq','RM FREQ',20,5000,440,{curve:'log',fmt:'hz'},'掛ける波の周波数。入力の音との和と差の周波数が生まれます。');
  K('rmMix','RM MIX',0,1,.5,{},'リングモジュレーションした音と原音の混ぜ具合。');
  S('rmShape','RM SHAPE',[[0,'SINE'],[1,'SQUARE']],0,'掛ける波の形。SQUAREは荒く尖った音になります。');
  /* TAPE STOP */
  S('tsOn','TAPE STOP',OO,0,'テープストップ。再生速度を落として、ピッチを下げながら止まる効果。');
  K('tsSpeed','SPEED',0,1,1,{fmt:'pct'},'再生速度。100%で通常、0%で停止。下げるとピッチも下がります(オートメーションで描けます)。');
  K('tsTime','STOP TIME',.1,2,.5,{curve:'log',fmt:'time'},'TRIGボタンで止まるまでの時間。');
 /* REVERB 追加分(rvbSize rvbMix は従来) */
 S('rvbType','RVB TYPE',[[0,'CLASSIC'],[1,'ROOM'],[2,'HALL'],[3,'PLATE']],0,'残響の種類。CLASSIC=従来の残響(旧データの音そのまま)。');
 K('rvbPre','PRE DLY',0,100,0,{fmt:'ms'},'残響が始まるまでの間(プリディレイ)。');
 K('rvbDamp','DAMP',0,1,.5,{},'残響の高域の減り方(ROOM/HALL/PLATE)。');
 /* RP-1a: REVERB の位置。SEND=従来(DELAYと並ぶ送り)/ CHAIN=チェーンの一員(ラックで REVERSE の前にできる)。画面は RP-1c で出す */
 S('rvbPos','RVB POS',[[0,'SEND'],[1,'CHAIN']],0,'REVERB の位置。SEND=従来(チェーンの外の送り)/ CHAIN=ラックの並びに入る(REVERSE の前に置くとリバースリバーブ)。');
 /* RP-2: CHAIN のときの原音の通し量(100%=従来)。0%=残響だけ(REVERB→REVERSE で尾だけ逆再生)。SEND では無効 */
 K('rvbDry','RVB DRY',0,1,1,{},'REVERB を CHAIN にしたときの原音の通し量。0%にすると残響だけが次へ流れます(REVERSE の前に置くと尾だけ逆再生)。SEND のときは効きません。');
 /* v7.2 リターンDUCK: DELAY・REVERB の戻りを、SRCトラックのノートでへこませる(SD.duckEnv と同じ形)。ATK/HOLD/REL は2つで共通 */
 var SRC=[[0,'T1'],[1,'T2'],[2,'T3'],[3,'T4'],[4,'T5'],[5,'T6'],[6,'T7'],[7,'T8']];
 S('dlDuckOn','DLY DUCK',OO,0,'ONにすると、DELAYの戻りをソーストラックのノートでへこませます(ディレイが邪魔をしないようにする疑似サイドチェイン)。');
 S('dlDuckSrc','DLY SRC',SRC,0,'DELAYの戻りをへこませる合図にするトラック。');
 K('dlDuckDepth','DLY DEPTH',0,1,.6,{},'DELAYの戻りをへこませる深さ。');
 S('rvDuckOn','RVB DUCK',OO,0,'ONにすると、REVERBの戻りをソーストラックのノートでへこませます。');
 S('rvDuckSrc','RVB SRC',SRC,0,'REVERBの戻りをへこませる合図にするトラック。');
 K('rvDuckDepth','RVB DEPTH',0,1,.6,{},'REVERBの戻りをへこませる深さ。');
 K('rtDuckAtk','RET ATK',0,50,5,{fmt:'ms'},'戻りがへこむまでの速さ(DELAY・REVERB共通)。');
 K('rtDuckHold','RET HOLD',0,300,40,{fmt:'ms'},'へこんだまま保つ時間(共通)。');
 K('rtDuckRel','RET REL',20,1000,250,{curve:'log',fmt:'ms'},'戻りが元の量に戻る時間(共通)。');
 SD.FXCHAIN=['gt','eq','af','dj','sa','bc','rm','md','tr','cp','sw','ts','rv'];/* RP-1a: rv(REVERB)は rvbPos=CHAIN のときだけチェーンに入る。既定位置=最後 */SD.DIVS=[4,2,1.5,1,.75,.5,1/3,.25,1/6];SD.FXP=FXP;SD.FXDEF={};FXP.forEach(function(p){SD.FXDEF[p.id]=p.def});
 ['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'].forEach(function(i){});
 /* ラックの並び(チェーン順)。on=ONつまみ(無いものは効果量で判定)。lamp は点灯条件 */
 SD.FXR=[
  {k:'gt',name:'GATE',on:'gtOn',ids:['gtOn','gtThr','gtHold','gtRel','gtRange'],wk:1},
  {k:'eq',name:'EQ',on:'eqOn',ids:['eqOn','eqHpf','eqLpf','eqLo','eqMid','eqMidF','eqMidQ','eqHi']},
  {k:'af',name:'AUTO FILT',on:'afOn',ids:['afOn','afType','afMode','afCut','afRes','afDepth','afRate','afSync','afDiv','afShape','afSens','afAtk','afRel'],wk:1},
  {k:'dj',name:'DJ FILTER',on:'djOn',ids:['djOn','djFilter','djRes']},
  {k:'sa',name:'SAT',ids:['saType','drive','saTone','saMix','saOut'],lamp:function(p){return p.drive>0||p.saType>0}},
  {k:'bc',name:'BITCRUSH',on:'bcOn',ids:['bcOn','bcBits','bcRate','bcMix'],wk:1},
  {k:'rm',name:'RING MOD',on:'rmOn',ids:['rmOn','rmFreq','rmMix','rmShape'],wk:1},
  {k:'md',name:'MOD',on:'mdOn',ids:['mdOn','mdType','mdRate','mdDepth','mdFb','mdMix'],wk:1},
  {k:'tr',name:'TREMOLO',on:'trOn',ids:['trOn','trMode','trRate','trSync','trDiv','trShape','trDepth','trSpread'],wk:1},
  {k:'cp',name:'COMP',on:'cpOn',ids:['cpOn','cpModel','cpThr','cpRatio','cpAtk','cpRel','cpMake'],wk:1},
  {k:'sw',name:'WIDTH',on:'swOn',ids:['swOn','swWidth'],wk:1},
  {k:'ts',name:'TAPE STOP',on:'tsOn',ids:['tsOn','tsSpeed','tsTime'],wk:1},
  {k:'dl',name:'DELAY',ids:['dlyTime','dlySync','dlyDiv','dlyFb','dlyMix','dlyTone','dlyPP','dlyMode','dlDuckOn','dlDuckSrc','dlDuckDepth','rtDuckAtk','rtDuckHold','rtDuckRel'],lamp:function(p){return p.dlyMix>0}},
  {k:'rv',name:'REVERB',ids:['rvbPos','rvbDry','rvbType','rvbSize','rvbPre','rvbDamp','rvbMix','rvDuckOn','rvDuckSrc','rvDuckDepth'],lamp:function(p){return p.rvbMix>0}}];
 SD.FXIDS=['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'].concat(FXP.map(function(p){return p.id}));
 /* FX-0: 新しいエフェクトの足し方(FX-1〜5 はこれだけを呼ぶ。fxparams.js より前=この後に読み込まれるファイルから呼ぶ)。
    spec={k:'mb',name:'MULTIBAND',after:'cp'(チェーンのこの後ろに入れる),wn:'sd-mbcomp'(ワークレット登録名),on:'mbOn'(省略=params の先頭),
          params:[['k',id,label,min,max,def,opts,help],['s',id,label,opts,def,help],...],
          map:{id:['パラメーター名',変換(省略=そのまま),smooth(1=なめらか)]},heavy:true(負荷:高),lamp:fn(onが無いとき)}
    ・ON/OFFつまみ(on)は 'OFF/ON' の seg を params の先頭に置く。ONのものだけ生成して接続(bus.js の act/rewire)。
    ・離散(seg)は map に smooth を付けない。JSで計算するもの(同期の換算など)は map に載せず bus.js の up() に case を足す。 */
 SD.FXMAP={};SD.FXMAX=20;SD.FXLPAGE=10;
 SD.fxAdd=function(s){
  if(!s||!s.k||!s.params||!s.params.length)throw new Error('fxAdd: k と params が要る');
  if(SD.FXR.some(function(r){return r.k===s.k}))throw new Error('fxAdd: 重複 '+s.k);
  if(SD.FXR.length>=SD.FXMAX)throw new Error('fxAdd: ラックは最大'+SD.FXMAX+'種');
  var ids=s.params.map(function(p){return p[1]});
  s.params.forEach(function(p){if(FXP.some(function(q){return q.id===p[1]}))throw new Error('fxAdd: つまみID重複 '+p[1])});
  s.params.forEach(function(p){if(p[0]==='k')K.apply(null,p.slice(1));else S.apply(null,p.slice(1))});
  FXP.forEach(function(p){if(!(p.id in SD.FXDEF))SD.FXDEF[p.id]=p.def});
  var on=s.on||ids[0],e={k:s.k,name:s.name,ids:ids,wk:1,wn:s.wn,heavy:!!s.heavy};
  if(s.lamp)e.lamp=s.lamp;else e.on=on;
  var a=SD.FXCHAIN.indexOf(s.after),ci=a<0?SD.FXCHAIN.length:a+1;SD.FXCHAIN.splice(ci,0,s.k);
  var fa=SD.FXR.findIndex(function(r){return r.k===s.after});SD.FXR.splice(fa<0?SD.FXR.findIndex(function(r){return r.k==='dl'}):fa+1,0,e);
  Object.keys(s.map||{}).forEach(function(id){SD.FXMAP[id]=[s.k].concat(s.map[id])});
  ids.forEach(function(id){if(SD.FXIDS.indexOf(id)<0)SD.FXIDS.push(id)});
  return e};
 /* ラック左の一覧のページ分け(size個ずつ。10個超は2ページ以上)。i番目の項目が何ページ目か */
 SD.fxPageCount=function(n,size){size=size||SD.FXLPAGE;return Math.max(1,Math.ceil(n/size))};
 SD.fxPageOf=function(i,size){size=size||SD.FXLPAGE;return Math.max(0,Math.floor(i/size))};
 /* OR-2a: マスターFXラックの並び(チェーン順)。保存は play.fxo(既定と同じなら持たない=旧データと同一)。DELAY/REVERB はチェーンの外で固定。
    fxOrdNorm: 配列でなければ既定。配列なら 未知・重複を捨て、足りないキー(新エフェクトが増えた版など)は既定の直前のキーの後ろへ補う */
 SD.fxOrdNorm=function(a){var d=SD.FXCHAIN.slice();if(!Array.isArray(a))return d;var r=[],u={};a.forEach(function(k){if(d.indexOf(k)>=0&&!u[k]){u[k]=1;r.push(k)}});d.forEach(function(k,i){if(u[k])return;var p=i?r.indexOf(d[i-1]):-1;r.splice(p+1,0,k);u[k]=1});return r};
 SD.fxOrdIsDef=function(a){return SD.fxOrdNorm(a).join()===SD.FXCHAIN.join()};
 /* 保存用: 既定と同じなら null(持たない) */
 SD.fxOrdSave=function(a){return SD.fxOrdIsDef(a)?null:SD.fxOrdNorm(a)};
 /* i 番目を d(-1=上/+1=下)だけ動かした新しい並び。範囲外は元のコピー */
 SD.fxOrdMove=function(a,i,d){var r=SD.fxOrdNorm(a);i=+i;d=d<0?-1:1;var j=i+d;if(!(i>=0&&i<r.length&&j>=0&&j<r.length&&i===Math.floor(i)))return r;var t=r[i];r[i]=r[j];r[j]=t;return r};
})();
