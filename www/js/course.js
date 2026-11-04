/* コース(v5.0〜): 中級・上級。lv:2|3 course:'TH'等 pre:[推奨の前提(未修了でも開ける)] kind:'recipe'|'read'|省略
   terms:[用語ID] 本文の【用語名】は用語集(SD.TERMS)の name と対応(test/validate.js)
   step.quiz={q,ans(1始まりの聞き比べ番号),ex} / step.cmp[i].mt=[ミュートするトラック番号](TRKのレッスン)
   claim:[{n:MIDI,band:帯域ID,min:0〜1}] お手本の主張(test/quality.js が検証) save:{name,kind:'patch'|'kit'} */
SD.CATS.push(
 {id:'th1',synth:'analog',chapter:'course',course:'TH',name:'TH 用語と基礎理論'},
 {id:'ly1',synth:'analog',chapter:'course',course:'LY',name:'LY 重ね方(レイヤー)'},
 {id:'ld1',synth:'analog',chapter:'course',course:'LD',name:'LD リード'},
 {id:'pd1',synth:'analog',chapter:'course',course:'PD',name:'PD パッド'},
 {id:'bs1',synth:'analog',chapter:'course',course:'BS',name:'BS シンセベース'});

/* 帯域の定義(1か所に統一。本文・用語集・テストはここを参照。境目はあくまで目安) */
SD.BANDS=[
 {id:'sub',name:'サブ',lo:20,hi:60},{id:'low',name:'ロー',lo:60,hi:250},{id:'lmid',name:'ローミッド',lo:250,hi:500},
 {id:'mid',name:'ミッド',lo:500,hi:2000},{id:'hmid',name:'ハイミッド',lo:2000,hi:4000},{id:'pres',name:'プレゼンス',lo:4000,hi:6000},{id:'air',name:'エア',lo:6000,hi:20000}];
SD.bandStr=function(id){var b=SD.BANDS.filter(function(x){return x.id===id})[0],f=function(v){return v>=1000?(v/1000)+'kHz':v+'Hz'};return b.id==='sub'?'〜'+f(b.hi):b.id==='air'?f(b.lo)+'〜':f(b.lo)+'〜'+f(b.hi)};

SD.TERMS=(function(){
 var B=function(id,kana,en,def,tags){var b=SD.BANDS.filter(function(x){return x.id===id})[0];return {id:id,name:b.name,kana:kana,en:en,def:def+'(目安: '+SD.bandStr(id)+')',see:['th01'],tags:tags||['帯域']}};
 return [
  B('sub','さぶ','sub','耳より体で感じる最も低い帯域。サイン波のベースやキックの土台が入る。'),
  B('low','ろー','low','ベースやキックの太さを決める低域。重なると濁りやすい。'),
  B('lmid','ろーみっど','low mid','音の「こもり」「箱鳴り」が出やすい帯域。削ると抜けがよくなる。'),
  B('mid','みっど','mid','楽器の主役が集まる中域。小さなスピーカーでも聞こえる。'),
  B('hmid','はいみっど','high mid','音の輪郭や硬さを決める帯域。上げすぎると耳にきつい。'),
  B('pres','ぷれぜんす','presence','音が前に出る感じを作る帯域。子音や歪みのエッジが出る。'),
  B('air','えあ','air','空気感やきらめきの最も高い帯域。足すと開放的になる。'),
  {id:'overtone',name:'倍音',kana:'ばいおん',en:'harmonic / overtone',def:'基音の整数倍の周波数の成分。倍音の量と並びで音色が決まる。',see:['th01','bs01'],tags:['音色']},
  {id:'subbass',name:'サブベース',kana:'さぶべーす',en:'sub bass',def:'サイン波などで作る、サブの帯域中心のベース。体に響く低音。',see:['bs01','ly02'],tags:['低音','ベース']},
  {id:'layer',name:'レイヤー',kana:'れいやー',en:'layer',def:'複数の音を重ねて1つの音にすること。帯域や質感を役割分担させる。',see:['ly02'],tags:['重ね方']},
  {id:'mask',name:'マスキング',kana:'ますきんぐ',en:'masking',def:'同じ帯域の音どうしが重なり、片方が聞こえにくくなること。',see:['ly02'],tags:['重ね方','ミックス']},
  {id:'hpf',name:'ハイパスフィルター',kana:'はいぱすふぃるたー',en:'high-pass filter (HPF)',def:'低い周波数を削り、高い周波数を通すフィルター。ローカットとも言う。',see:['th01','ly02'],tags:['フィルター']},
  {id:'lpf',name:'ローパスフィルター',kana:'ろーぱすふぃるたー',en:'low-pass filter (LPF)',def:'高い周波数を削り、低い周波数を通すフィルター。音が丸くこもる。',see:['th01','ly02'],tags:['フィルター']}
 ];
})();

/* ジャンル用パターン集(コードで生成。ジャンルで一般的な型のみ。戻り値は tk 用 {idx:{ステップ:半音},o:{…}}) */
SD.PATS=(function(){
 var z=function(a,r){var q={};a.forEach(function(i){q[i]=r||0});return q},cl=function(v,a,b){return Math.max(a,Math.min(b,v))};
 /* MT-5a: 拍子対応。meter(省略・4/4=従来の16ステップの型そのまま)。4/4以外は強拍(まとまりの先頭=SD.METER.accents)を基準に組む。
    戻り値の o.len=1小節のステップ数(4/4以外のみ付く)。決定的(乱数なし) */
 var Gm=function(m){var M=SD.METER;if(m==null||!M||!M.valid(m))return null;var p=M.accents(m);if(M.label(m)==='4/4'&&p.join()==='0,4,8,12')return null;return {spb:M.stepsPerBar(m),pul:p}};
 var ev=function(g){var a=[];for(var i=0;i<g.spb;i+=2)a.push(i);return a};
 var mid=function(g){var p=g.pul;return p.length>1?p[Math.floor(p.length/2)]:Math.floor(g.spb/2)};
 var snr=function(g){var p=g.pul;return p.length>1?p.filter(function(x,j){return j%2===1}):[mid(g)]};
 var off=function(g){var p=g.pul,a=[];p.forEach(function(s,j){var L=(j+1<p.length?p[j+1]:g.spb)-s;if(L>=2)a.push(s+(L>>1))});if(!a.length){a=p.filter(function(x,j){return j%2===1});if(!a.length)a=[p[0]]}return a};
 var mkp=function(g,a,o){var u=[],i;a.forEach(function(x){if(x>=0&&x<g.spb&&u.indexOf(x)<0)u.push(x)});u.sort(function(x,y){return x-y});return {idx:z(u),o:Object.assign({len:g.spb},o||{})}};
 var P={
  fourFloor:function(m){var g=Gm(m);if(g)return mkp(g,g.pul);return {idx:z([0,4,8,12]),o:{}}},
  offbeatHat:function(m){var g=Gm(m);if(g)return mkp(g,off(g));return {idx:z([2,6,10,14]),o:{}}},
  halfTime:function(part,m){var g=Gm(m);if(g){var s=mid(g);return part==='kick'?mkp(g,[0,s+2]):mkp(g,[s])}return part==='kick'?{idx:z([0,10]),o:{}}:{idx:z([8]),o:{}}},
  dnbBreak:function(part,m){var g=Gm(m);if(g){var sn=snr(g);return part==='kick'?mkp(g,[0,mid(g)+2]):part==='snare'?mkp(g,sn):mkp(g,ev(g).concat(sn),{acc:sn.filter(function(x){return x<g.spb})})}
   return part==='kick'?{idx:z([0,10]),o:{}}:part==='snare'?{idx:z([4,12]),o:{}}:{idx:z([0,2,4,6,8,10,12,14]),o:{acc:[4,12]}}},
  trapHat:function(roll,m){var g=Gm(m);if(g){var a=ev(g);if(roll)a=a.concat([g.spb-3,g.spb-1]);var ac=[0,mid(g)].filter(function(x){return x<g.spb});return mkp(g,a.concat(ac),{acc:ac})}
   var a=[0,2,4,6,8,10,12,14];if(roll)a=[0,2,4,6,8,10,12,13,14,15];return {idx:z(a),o:{acc:[0,8]}}},
  shuffle:function(sw,m){var g=Gm(m),r=g?mkp(g,ev(g)):{idx:z([0,2,4,6,8,10,12,14]),o:{}};r.swing=cl(+sw||0,0,.6);return r},
  bassPattern:function(kind,root,m){root=root|0;var g=Gm(m);
   if(g){var pl=g.pul,e=ev(g),sy=[];pl.forEach(function(s,j){var L=(j+1<pl.length?pl[j+1]:g.spb)-s;sy.push(s);if(L>=3)sy.push(s+L-1)});
    var mm={root:pl,eighth:e,offbeat:off(g),syncop:sy},a=mm[kind]||mm.root,r=mkp(g,a),i;a.forEach(function(x){if(x<g.spb)r.idx[x]=root});
    if(kind==='octave'){e.forEach(function(x){r.idx[x]=root+(pl.indexOf(x)<0?12:0)})}return r}
   var m0={root:[0,4,8,12],eighth:[0,2,4,6,8,10,12,14],offbeat:[2,6,10,14],syncop:[0,3,6,10,12]},q={};
   (m0[kind]||m0.root).forEach(function(i){q[i]=root});if(kind==='octave')[0,2,4,6,8,10,12,14].forEach(function(i){q[i]=root+(i%4?12:0)});return {idx:q,o:{}}},
  /* chords(prog:メジャースケールの度数(0始まり)の配列, voicing:'close'|'open') → 各コードの構成音(キー主音からの半音) */
  chords:function(prog,voicing){var M=SD.SCALES.major;return (prog||[0,4,5,3]).map(function(d){var n=[0,2,4].map(function(k){var x=d+k;return M[x%7]+12*Math.floor(x/7)});if(voicing==='open')n[1]+=12;return n.sort(function(a,b){return a-b})})},
  tk:function(id,pat,name,extra){return {id:id,idx:pat.idx,o:Object.assign({name:name},pat.o,extra||{})}}
 };
 return P;
})();

(function(){
 var bs=SD.bandStr,TK=SD.PATS.tk,P=SD.PATS;
 var subP={o1Wave:'sine',o1Lvl:1,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:900,res:0,envAmt:0,fS:0,drive:0,aA:.004,aD:.3,aS:.9,aR:.12};
 var midP={o1Wave:'sawtooth',o1Lvl:.8,o2Lvl:0,subLvl:0,noiseLvl:0,fType:'highpass',cutoff:220,res:.1,envAmt:0,drive:.3,aA:.004,aD:.25,aS:.7,aR:.1};
 SD.LESSONS.push(
{id:'th01',cat:'th1',synth:'analog',lv:2,course:'TH',kind:'read',pre:[],terms:['sub','low','lmid','mid','hmid','pres','air','overtone','hpf','lpf'],title:'周波数帯の名前',sub:'サブ・ロー・ミッド…音を帯域で呼ぶ',oct:0,demo:{n:[48,55,60,64],gap:1,len:.8},init:{o1Wave:'sawtooth',o1Lvl:.8,cutoff:18000,aA:.003,aD:.3,aS:.8,aR:.2},steps:[
 {h:'音は「帯域」で呼ぶ',b:'音の高さは周波数(Hz)で表せる。低い方から高い方へ、いくつかの範囲に分けて呼ぶと、「ここが足りない」「ここが濁る」と話しやすくなる。\nこの章でよく使う呼び名を、順に聴いて覚えよう。',tab:'filter'},
 {h:'低い方の帯域',b:'【サブ】('+bs('sub')+')は体に響く最低域、【ロー】('+bs('low')+')はベースやキックの太さ、【ローミッド】('+bs('lmid')+')はこもりの出やすい帯域。\n境目は目安で、人や場面でも少しずれる。',tab:'filter'},
 {h:'中〜高い方の帯域',b:'【ミッド】('+bs('mid')+')は主役の帯域、【ハイミッド】('+bs('hmid')+')は輪郭や硬さ、【プレゼンス】('+bs('pres')+')は前に出る感じ、【エア】('+bs('air')+')はきらめき。',tab:'filter'},
 {h:'フィルターで帯域を切り取って聴く',b:'ノコギリ波は【倍音】が多く、低域から高域まで広く含む。【ローパスフィルター】で高い方を削ると、帯域が減っていくのが耳で分かる。聴き比べよう。',tab:'filter',
  cmp:[{l:'ミッド付近まで',s:{cutoff:1000}},{l:'ハイミッド付近まで',s:{cutoff:3500}},{l:'全部',s:{cutoff:18000}}],
  col:{h:'ハイパスフィルターは逆向き',b:'【ハイパスフィルター】は反対に、低い方を削って高い方だけ通す。ベースに足すレイヤーの低域をカットして、低音がぶつからないようにするときなどに使う。次の「重ね方」の章で使う。'}},
 {h:'この章のまとめ',b:'帯域の名前は「どこの話か」をそろえる言葉。用語は用語集からいつでも引ける。本文の青い文字をタップすると意味が出る。',tab:'filter',
  col:{h:'帯域の境目について',b:'帯域の名前と範囲は、資料や現場によって少しずつ違う。このアプリでは目安として固定の値を使っている。覚えるのは数字より「その帯域が音にどう効くか」。'}}
]},
{id:'ly02',cat:'ly1',synth:'analog',lv:2,course:'LY',kind:'recipe',pre:['th01'],terms:['layer','subbass','hpf','lpf','mask','low','mid'],mode:'trk',tab:'trk',ts:1,title:'サブ+ミッドの重ね方',sub:'低域と中域をべつの音に任せる',oct:-1,demo:{n:[33]},
 tk:[TK('kick',P.fourFloor(),'キック'),TK('bass',P.bassPattern('syncop',0),'サブ',{scale:'minor',p:subP}),TK('bass',P.bassPattern('syncop',0),'ミッド',{scale:'minor',p:midP}),TK('hat',P.offbeatHat(),'ハット')],
 save:{name:'サブ+ミッドベース',kind:'kit'},steps:[
 {h:'4つのトラックを聴く',b:'T1キック、T2サブ、T3ミッド、T4ハット。T2とT3は同じ音符を弾いているが、音色がちがう。「▶ 試聴」で鳴らして、ベースが2つの音でできていることを確かめよう。',tab:'trk'},
 {h:'サブだけ・ミッドだけ・両方',b:'【レイヤー】は、1つの音に全部を任せず、役割を分けて重ねる考え方。サブは'+bs('sub').replace('〜','')+'以下〜【ロー】の太さ、ミッドは【ミッド】の輪郭を受け持つ。聴き比べよう。',tab:'trk',
  cmp:[{l:'サブだけ',mt:[2]},{l:'ミッドだけ',mt:[1]},{l:'両方',mt:[]}]},
 {h:'どっちがサブ?',b:'聴き比べて、体に響く丸い低音(【サブベース】)だけが鳴っているのはどれか選ぼう。',tab:'trk',
  cmp:[{l:'1',mt:[1]},{l:'2',mt:[2]},{l:'3',mt:[1,2]}],quiz:{q:'サブだけが鳴っているのは?',ans:2,ex:'2がサブだけ。丸くて低い音。1はミッドだけで輪郭が目立つ。3は両方ミュートでベースなし。'}},
 {h:'棲み分けのしくみ',b:'重ねた2つが同じ帯域で鳴ると【マスキング】が起きて濁る。そこで、サブは【ローパスフィルター】で高域を落とし、ミッドは【ハイパスフィルター】で低域を落とすと、帯域が分かれてクリアになる。\nこのレシピのミッドは、低域がほぼ出ない設定にしてある。',tab:'trk'},
 {h:'レシピを保存',b:'「レシピ保存」を押すと、この4トラックをセットに保存できる。トラックタブの「セット」から呼び出して、音色を変えて遊んでみよう。',tab:'trk',
  col:{h:'低域は1つだけ',b:'低域(サブ〜ロー)を担当する音は1つに決めるのが基本。2つ以上が同じ低域を鳴らすと位相が干渉して、音量が不安定になったり濁ったりしやすい。'}}
]},
{id:'bs01',cat:'bs1',synth:'analog',lv:2,course:'BS',kind:'recipe',pre:['th01'],terms:['sub','subbass','overtone'],title:'サブベース',sub:'サイン波で土台を作る',oct:-1,demo:{n:[33,33,40,33],gap:.6,len:.45},
 init:{o1Wave:'sawtooth',o1Lvl:.8,o2Lvl:0,subLvl:0,noiseLvl:0,cutoff:6000,aA:.003,aD:.3,aS:.7,aR:.1},save:{name:'サブベース',kind:'patch'},
 claim:[{n:33,band:'sub',min:.5}],steps:[
 {h:'波形をサイン波に',b:'OSC1の波形を「サイン」にしよう。【倍音】がなく、丸い低音になる。【サブベース】の基本の形。',f:[['o1Wave','sine']],tab:'osc'},
 {h:'音量をそろえる',b:'OSC1のレベルを100%まで上げよう。サイン波は聞こえ方がおとなしいので、しっかり出す。',f:[['o1Lvl',1]],tab:'osc',tol:.1},
 {h:'のばして低音を支える',b:'AMP EGのSUSTAINを90%にしよう。音が減衰せず、キックの間を埋めるように低音が続く。',f:[['aS',.9]],tab:'env',tol:.1},
 {h:'聴き比べる',b:'ノコギリ波のベースと、サイン波のサブベースを聴き比べよう。サブは【サブ】('+bs('sub')+')に集まっていて、ノコギリは高い帯域まで広がる。',tab:'osc',
  cmp:[{l:'ノコギリ',s:{o1Wave:'sawtooth'}},{l:'サイン(サブ)',s:{o1Wave:'sine'}}]},
 {h:'レシピを保存',b:'「レシピ保存」で、この音色を音色リストに保存できる。次の章でミッドの音を足して、小さなスピーカーでも聞こえるベースにしていく。',tab:'osc',
  col:{h:'小さなスピーカーのこと',b:'スマホの内蔵スピーカーなどは、サブの帯域をほとんど再生できない。サイン波だけのベースは、ヘッドホンやスピーカーで聞こえても、小さな機器では消えて聞こえることがある。'}}
]}
 );
})();

/* v9.0 R-2: MI(外部MIDIのCC)の読み物 mi01・mi02。実機がないと採点できないので、目標(f/au)は付けず、読み物+手順だけ */
(function(){
 SD.CATS.push({id:'mi1',synth:'analog',chapter:'course',course:'MI',name:'MI 外部MIDIつまみ'});
 var M=function(o){return Object.assign({cat:'mi1',synth:'analog',lv:2,course:'MI',kind:'read',oct:0,terms:[],demo:{n:[48,55,60,64],gap:.8,len:.7},init:{o1Wave:'sawtooth',o1Lvl:.8,cutoff:3000,aA:.003,aD:.3,aS:.8,aR:.2}},o)};
 SD.LESSONS.push(
M({id:'mi01',pre:['au01'],title:'外部つまみをつなぐ',sub:'MIDIコントローラーのつまみを、画面のつまみに割り当てる',steps:[
 {h:'何ができるか',b:'MIDIコントローラー(つまみやフェーダーのついた機器)をつなぐと、その物理つまみで、画面のつまみを動かせる。動かしたときに送られる信号が CC(コントロールチェンジ)で、つまみごとに番号がある。このアプリでは、受けたCCを、好きなつまみに割り当てられる。',tab:'osc'},
 {h:'まず、つなぐ',b:'機器をスマホにつなぎ(USBまたはBluetooth)、アプリの設定を開く。「MIDIつまみ割り当て(LEARN)」の欄に、最後に受けたCCが表示される。物理つまみを回して、数字が変わるかを確かめよう。変わらないときは、つなぎ直すか、機器の側の設定を見直す。',tab:'osc'},
 {h:'LEARNで割り当てる',b:'設定の「LEARN」を開始すると、画面の上にバーが出る。そこで、割り当てたい画面のつまみ(ミキサーのスライダーも可)をタップする。値は変わらず、対象として選ばれるだけ。そのまま10秒以内に、物理つまみを回すと、最初に届いたCCが、そのつまみに結びつく。',tab:'osc'},
 {h:'受け取り方を選ぶ',b:'物理つまみの位置と、画面のつまみの値がずれているとき、動かした瞬間に値が飛ぶことがある。ジャンプは、そのまま飛ぶ方式。ピックアップは、物理つまみが画面の値に追いつくまで待つ方式で、飛ばずに済む。チャンネルは、既定では全チャンネル。機器が複数あるときは、受けたチャンネルだけにもできる。',tab:'osc'},
 {h:'注意すること',b:'CC 64(ペダル)・120・123 は、鍵盤の動作のために予約されていて、割り当てられない。CC 7(音量)とCC 10(パン)は割り当てられるが、機器によっては本来の役目で使われるので、設定の注意書きを読もう。BPMとスウィングは、割り当ての対象外。',tab:'osc'},
 {h:'続きと後片付け',b:'割り当ては一覧に並び、1つずつ削除することも、全部消すこともできる。存在しないつまみ(たとえば、削除したモジュール)への割り当ては、無視される。次の章では、この割り当てを使って、動きを録音する。',tab:'osc',
  col:{h:'トラックについて',b:'割り当ては、学習したときのトラックで結びつく。他のトラックのシンセのつまみは、そのトラックを選んでいる間だけ動く。ミキサーのつまみは、どのトラックを選んでいても動く。'}}
]}),
M({id:'mi02',pre:['mi01','au01'],title:'CCで録音して手直し',sub:'外部つまみの動きをレーンに録り、あとで直す',steps:[
 {h:'流れ',b:'外部つまみの動きは、画面のつまみを指で動かしたときと同じ扱いで、オートメーションのレーンに録音できる。流れは、割り当てる、RECをONにする、再生しながら回す、止めて手直しする、の4つ。',tab:'osc'},
 {h:'割り当てておく',b:'まだなら、前の章の手順で、録りたいつまみ(たとえば、カットオフやミキサーのVOL)に、物理つまみを割り当てる。RECできるのは、オートメーションの対象になっているつまみだけ。BPMなど、対象外のものは割り当てられない。',tab:'osc'},
 {h:'RECをONにして録る',b:'AUTOタブの「REC」をONにして、再生を始める。再生中に物理つまみを回すと、その動きがレーンに点として録られる。REC がONでも、再生が止まっているあいだは、何も録られない。',tab:'osc'},
 {h:'離したときの動き',b:'物理つまみから手を離して、約0.3秒たつと、そのつまみは、またレーンの動きに従う。つまみを動かしている間は、レーンよりも、手の動きが優先される。画面のつまみでは約0.25秒。外部つまみは、少しだけ長めに待つ。',tab:'osc'},
 {h:'止めて、手直しする',b:'録った動きは、AUTOタブのレーンに点として残る。点が多すぎて細かいときは、範囲を消して描き直したり、点を1つずつ動かしたりして整える。ふつうの手描きのレーンと同じ道具で直せる。',tab:'osc'},
 {h:'聴いて、決める',b:'録ったままで良いか、直すか、聴いて決めよう。手の震えのような細かい動きは、直すと自然に聞こえる場合が多い。逆に、味のある揺れは、そのまま残すほうが良い場合もある。',tab:'osc',
  col:{h:'ピックアップとREC',b:'ピックアップにしておくと、録り始めに値が飛ばない。録音の頭で、不自然な段差が出るのを避けられる。録り直すときは、最初の位置から合わせよう。'}}
]})
 );
})();
