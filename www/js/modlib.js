/* モジュラーの部品定義・接続ルール・つまみ定義(DOM非依存)。
   MODS[種類]={name,desc,i:[入力ジャック],o:[出力ジャック],knobs:[つまみ]} / ジャック kind: audio(音・黄) cv(制御・青) gate(ピンク)
   ID規則: モジュール='種類+番号'(vco1)、ジャック/つまみ='モジュールID.名前'(vco1.pitch) */
(function(){
var A=SD.defs.analog,W=A.byId.o1Wave.opts;
function K(k,label,min,max,def,o){return Object.assign({k:k,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:''},o||{});}
function S(k,label,opts,def,help){return {k:k,label:label,type:'seg',opts:opts,def:def,help:help||''};}
function J(k,label,kind){return {k:k,label:label,kind:kind};}
var SQN=[60,63,67,63,70,67,63,60];
function SEQK(){var a=[];
 for(var i=1;i<=8;i++){a.push(K('n'+i,'N'+i,36,96,SQN[i-1],{step:1,fmt:'note',help:'ステップ'+i+'の音程(半音単位)。▲▼で上げ下げします。'}));
  a.push(S('o'+i,'ON'+i,[['on','ON'],['off','OFF']],'on','ステップ'+i+'を鳴らすか。OFFにすると、その拍は休符(音程は出るがGATEは出ない)になります。'));}
 a.push(K('len','LENGTH',1,8,8,{step:1,fmt:'n',help:'何ステップで1周するか。短くすると、パターンが途中で最初に戻ります(クロックとの周期のずれでリズムが変わる)。'}));
 a.push(K('oct','OCT',-2,2,0,{step:1,fmt:'int',help:'パターン全体をオクターブ単位で上下します。'}));return a;}
var MODS={
 kbd:{name:'KEYBOARD',desc:'鍵盤。ピッチ(CV)とGATEを出す',i:[],o:[J('pitch','PITCH','cv'),J('gate','GATE','gate')],
  knobs:[K('oct','OCT',-2,2,0,{step:1,fmt:'int',help:'鍵盤が送るピッチを、オクターブ単位で上下します。'})]},
 vco:{name:'VCO',desc:'音の素になる発振器',i:[J('pitch','PITCH','cv'),J('fm','FM','audio'),J('pwm','PWM','cv')],o:[J('out','OUT','audio')],
  knobs:[S('wave','WAVE',W.concat([['pulse','PULSE']]),'sawtooth','波形。音の基本の形で、倍音の量が変わります。PULSEは幅(WIDTH)を変えられる矩形波で、PWM入力でその幅を動かせます。'),
   K('coarse','COARSE',-24,24,0,{step:1,fmt:'st',help:'音の高さを半音単位でずらします。+12で1オクターブ上。'}),
   K('fine','FINE',-50,50,0,{step:1,fmt:'ct',help:'音の高さをセント(半音の100分の1)で微調整します。'}),
   K('fm','FM量',0,1,0,{help:'FM入力に届いた信号で、ピッチをどれだけ揺らすか。上げるほど倍音が増えて金属的になります。'}),
   K('width','WIDTH',.05,.95,.5,{help:'PULSE波形のとき、1周期のうち高い部分の割合(デューティ比)。50%は矩形波、小さくすると細く鼻にかかった音になります。'}),
   K('pwm','PWM量',0,1,.5,{help:'PWM入力に届いた制御信号で、WIDTHをどれだけ動かすか。LFOをつなぐと音が厚く揺れます。WIDTHが端に近いときは大きくしすぎると音が途切れます。'})]},
 lfo:{name:'LFO',desc:'ゆっくり揺れる制御信号',i:[J('rate','RATE','cv')],o:[J('out','OUT','cv')],
  knobs:[S('wave','WAVE',W,'sine','揺れ方。サイン=なめらか / 矩形=カクカク。'),
   K('rate','RATE',.1,30,5,{curve:'log',fmt:'hzf',help:'揺れる速さ。ゆっくりなら「うねり」、速いと「震え」。'}),
   K('depth','DEPTH',0,1,.5,{help:'出力の大きさ(揺れ幅)。つなぎ先ごとに効き方が変わります。ピッチ(1V/oct)につなぐときはごく小さくて十分。'})]},
 noise:{name:'NOISE',desc:'ザーというノイズ',i:[],o:[J('out','OUT','audio')],
  knobs:[S('color','COLOR',[['white','ホワイト'],['pink','ピンク']],'white','ホワイト=高音までザーッ / ピンク=低めで柔らかい雑音。')]},
 vcf:{name:'VCF',desc:'音色を削るフィルター',i:[J('in','IN','audio'),J('cutoff','CUTOFF','cv')],o:[J('out','OUT','audio')],
  knobs:[S('type','TYPE',[['lowpass','LP'],['highpass','HP'],['bandpass','BP']],'lowpass','LP=高音を削る / HP=低音を削る / BP=中域だけ通す。'),
   K('cutoff','CUTOFF',20,20000,20000,{curve:'log',fmt:'hz',help:'フィルターの境目の周波数。LPなら下げるほど暗くこもります。'}),
   K('res','RES',0,1,0,{help:'カットオフ付近を持ち上げて強調します。'}),
   K('cv','CV量',-4,4,0,{step:.1,fmt:'oct',help:'CUTOFF入力に届いた制御信号が、カットオフを何オクターブ動かすか。0だと入力があっても変化しません。'})]},
 vca:{name:'VCA',desc:'音量を操る',i:[J('in','IN','audio'),J('cv','CV','cv')],o:[J('out','OUT','audio')],
  knobs:[K('level','LEVEL',0,1,1,{help:'全体の最大音量。'}),
   K('cv','CV量',0,1,1,{help:'音量のうちCVで操る割合。100%だとCVが0の間は無音、0%だと常に通ります。音量=LEVEL×(1−CV量)+LEVEL×CV量×CV。'})]},
 adsr:{name:'ADSR',desc:'鍵盤に連動して変化する制御信号',i:[J('gate','GATE','gate')],o:[J('out','OUT','cv')],
  knobs:[K('a','A',.001,4,.01,{curve:'log',fmt:'time',help:'アタック。GATEが入ってから最大(1)になるまでの時間。'}),
   K('d','D',.001,4,.3,{curve:'log',fmt:'time',help:'ディケイ。最大からサスティンまで下がる時間。'}),
   K('s','S',0,1,.7,{help:'サスティン。GATEが入っている間に保つ値。0だと押しっぱなしでも消えます。'}),
   K('r','R',.005,6,.3,{curve:'log',fmt:'time',help:'リリース。GATEが切れてから0に戻る時間。'})]},
 mixer:{name:'MIXER',desc:'4つの信号を混ぜる',i:[J('in1','IN1','audio'),J('in2','IN2','audio'),J('in3','IN3','audio'),J('in4','IN4','audio')],o:[J('out','OUT','audio')],
  knobs:[1,2,3,4].map(function(n){return K('l'+n,'LEVEL'+n,0,1,.7,{help:'入力'+n+'の音量。'});})},
 atten:{name:'ATTENUVERTER',desc:'信号の量を絞る/反転する',i:[J('in','IN','cv')],o:[J('out','OUT','cv')],
  knobs:[K('amt','量',-1,1,1,{step:.01,fmt:'pct',help:'入力にかける量。マイナスにすると上下が反転します。'}),
   K('ofs','OFFSET',-1,1,0,{step:.01,fmt:'pct',help:'出力に常に足す一定の値(直流)。'})]},
 sh:{name:'SAMPLE&HOLD',desc:'トリガーの瞬間の値を保持',i:[J('in','IN','cv'),J('trig','TRIG','gate')],o:[J('out','OUT','cv')],knobs:[]},
 delay:{name:'DELAY',desc:'やまびこ',i:[J('in','IN','audio')],o:[J('out','OUT','audio')],
  knobs:[K('time','TIME',.02,1,.3,{curve:'log',fmt:'time',help:'やまびこの間隔。'}),
   K('fb','FB',0,.9,.35,{help:'フィードバック。上げると繰り返しが増えます。'}),
   K('mix','MIX',0,1,.3,{help:'ディレイ音の量。0で原音のみ。'})]},
 clk:{name:'CLOCK',desc:'一定間隔でGATEパルスを出す',i:[],o:[J('out','OUT','gate')],
  knobs:[K('bpm','BPM',40,240,120,{step:1,fmt:'n',help:'テンポ(1分あたりの拍数)。'}),
   S('div','DIV',[['q','1/4'],['e','1/8'],['s','1/16']],'e','1拍を何分割して鳴らすか。1/16がいちばん細かい。'),
   K('gate','GATE長',.05,.95,.5,{help:'1回のパルスのうちGATEがONの割合。ADSRのサスティン中の長さに効きます。'})]},
 slew:{name:'SLEW',desc:'制御信号の変化をなめらかにする',i:[J('in','IN','cv')],o:[J('out','OUT','cv')],
  knobs:[K('time','TIME',.005,.5,.1,{curve:'log',fmt:'time',help:'変化にかける時間の目安。大きいほど、入力の急な変化がゆっくり追いかける形に変わります(鍵盤のピッチにつなぐとポルタメント、矩形のLFOにつなぐと角が丸くなる)。立ち上がりと立ち下がりは同じ速さです。'})]},
 ring:{name:'RING MOD',desc:'2つの音をかけ算する',i:[J('a','A','audio'),J('b','B','audio')],o:[J('out','OUT','audio')],
  knobs:[K('mix','MIX',0,1,1,{help:'かけ算した音の量。0でAの原音のみ、100%で完全なリングモジュレーション(AとBの周波数の和と差だけが残る、鐘のような金属音)。Bがつながっていないと、かけ算した音は無音です。'})]},
 shaper:{name:'WAVESHAPER',desc:'波形をゆがめて倍音を作る',i:[J('in','IN','audio'),J('drive','DRIVE','cv')],o:[J('out','OUT','audio')],
  knobs:[S('shape','SHAPE',[['soft','SOFT'],['hard','HARD'],['fold','FOLD']],'soft','SOFT=なめらかに頭を丸める / HARD=頭をぶった切る / FOLD=振幅が大きいと折り返して複雑な倍音を作る。'),
   K('drive','DRIVE',1,8,3,{curve:'log',fmt:'x',help:'入力を何倍に持ち上げてからゆがめるか。大きいほど波形が強く変形します。1だとほぼ素通り。'})]},
 cmp:{name:'COMPARATOR',desc:'信号が基準を超えるとGATEを出す',i:[J('in','IN','cv')],o:[J('out','OUT','gate')],
  knobs:[K('th','THRESH',-1,1,.3,{step:.01,fmt:'pct',help:'基準の値。入力がこれを上回るとGATEがON、下回るとOFFになります。LFOをつなぐと、揺れに合わせて一定間隔のGATEができます。'})]},
 div:{name:'CLOCK DIVIDER',desc:'GATEを割って間引く',i:[J('in','IN','gate')],o:[J('out','OUT','gate')],
  knobs:[S('n','DIV',[['2','÷2'],['3','÷3'],['4','÷4'],['8','÷8']],'2','入ってきたGATEの何回に1回だけ出力するか。÷2なら1拍おきに鳴る。CLOCKにつなぐとゆっくりしたリズムができ、同じCLOCKから複数に分けて重ねるとポリリズムになります。')]},
 quant:{name:'QUANTIZER',desc:'ピッチを音階の音に揃える',i:[J('in','IN','cv')],o:[J('out','OUT','cv')],
  knobs:[S('scale','SCALE',[['chrom','CHROM'],['major','MAJOR'],['minor','MINOR'],['penta','PENTA'],['blues','BLUES']],'major','入力のピッチ(1V/oct)を、この音階の一番近い音に揃えます。CHROMは半音単位。'),
   K('key','KEY',0,11,0,{step:1,fmt:'key',help:'音階の主音(ルート)。MAJORでCなら白鍵だけになります。'})]},
 rev:{name:'REVERB',desc:'残響',i:[J('in','IN','audio')],o:[J('out','OUT','audio')],
  knobs:[K('size','SIZE',.2,3,1,{curve:'log',fmt:'time',help:'残響の長さ。大きいほど広い空間(ホール)のように長く残ります。変えると、少し待ってから切り替わります。'}),
   K('mix','MIX',0,1,.3,{help:'残響音の量。0で原音のみ。'})]},
 seqm:{name:'SEQUENCER',desc:'8ステップの音程パターンを、CLOCKに合わせて順番に出す',i:[J('clk','CLK','gate'),J('rst','RESET','gate')],o:[J('pitch','PITCH','cv'),J('gate','GATE','gate')],
  knobs:SEQK()},
 out:{name:'OUTPUT',desc:'音の出口',i:[J('in','IN','audio')],o:[],
  knobs:[K('vol','VOLUME',0,1,.8,{help:'出口の音量。'})]}
};
/* MA-0: 全つまみの「オートメーションできるか」。auto:true/false を全つまみに付ける(挙動は変えない=いまの apply の経路のまま)。
   false は、グラフの再構築・IR再生成・状態リセットを起こすもの(autoWhy に理由)。true でも、切り替え時にクリックが出やすいものは autoWhy に注記 */
var AUTO_NO={'rev.size':'変更から150ms後に残響(IR)を作り直すので、レーンで動かし続けられない','div.n':'変更のたびに内部の数えを0に戻す(状態リセット)ので、レーンの階段で動かすと拍がずれる'};
var AUTO_NOTE={'vco.wave':'波形の切り替えは階段になり、切り替わりでクリックが出やすい','lfo.wave':'波形の切り替えは階段になり、切り替わりでクリックが出やすい','noise.color':'切り替えは階段(10msの短いクロスフェード)','vcf.type':'切り替えは階段になり、切り替わりでクリックが出やすい','shaper.shape':'カーブの差し替えは階段になり、切り替わりでクリックが出やすい','quant.scale':'音階の切り替えは階段。鳴っている音程が飛ぶ','quant.key':'主音の切り替えは階段。鳴っている音程が飛ぶ','clk.div':'分割の切り替えは階段(次のパルスから変わる)','adsr.a':'次のGATEから反映(鳴っている最中の音には効かない)','adsr.d':'次のGATEから反映','adsr.s':'次のGATEから反映','adsr.r':'次のGATEオフから反映'};
Object.keys(MODS).forEach(function(t){MODS[t].knobs.forEach(function(k){var key=t+'.'+k.k.replace(/^o[1-8]$/,'o1').replace(/^n[1-8]$/,'n1');
 if(AUTO_NO[key]){k.auto=false;k.autoWhy=AUTO_NO[key];}else{k.auto=true;var w=AUTO_NOTE[key]||AUTO_NOTE[t+'.'+k.k];if(w)k.autoWhy=w;}
 if(t==='seqm'&&/^o[1-8]$/.test(k.k))k.autoWhy='ON/OFFは階段(次のステップから反映)';});});
var ORDER=['vco','lfo','noise','vcf','vca','adsr','mixer','atten','sh','delay','clk','slew','ring','shaper','cmp','div','quant','rev','seqm','kbd','out'];
var L={M:null,MODS:MODS,ORDER:ORDER,MAXM:16,MAXC:32};
L.type=function(id){var m=/^([a-z]+)\d+$/.exec(id);return m&&MODS[m[1]]?m[1]:null;};
L.M=function(id,v){return {id:id,t:id.replace(/\d+$/,''),v:v||{}};};
L.split=function(id){var i=id.indexOf('.');return i<0?[id,'']:[id.slice(0,i),id.slice(i+1)];};
/* MA-2: いまのラック(st={mods,cab})に、そのつまみ('vcf1.cutoff')の持ち主のモジュールがあるか(孤児判定の元) */
L.exists=function(st,id){var s=L.split(id),t=L.type(s[0]);if(!t||!st||!st.mods||!L.find(st,s[0]))return false;return MODS[t].knobs.some(function(k){return k.k===s[1];});};
L.find=function(st,id){for(var i=0;i<st.mods.length;i++)if(st.mods[i].id===id)return st.mods[i];return null;};
L.uid=function(st,t){for(var n=1;;n++)if(!L.find(st,t+n))return t+n;};
L.reg=function(mods){L.cur=mods;};
L.has=function(st,a,b){return st.cab.some(function(c){return c[0]===a&&c[1]===b;});};
L.title=function(id){var m=/^([a-z]+)(\d+)$/.exec(id);if(!m||!MODS[m[1]])return id;return MODS[m[1]].name+((m[1]==='kbd'||m[1]==='out')&&m[2]==='1'?'':m[2]);};
L.label=function(id){var s=L.split(id),t=L.type(s[0]);if(!t)return id;var up=L.title(s[0]);
 if(s[1]==='')return up;var P=(MODS[t].i.concat(MODS[t].o)).filter(function(p){return p.k===s[1];})[0],K=MODS[t].knobs.filter(function(p){return p.k===s[1];})[0];
 return up+' '+(P?P.label:K?K.label:s[1]);};
L.port=function(st,id,dir){var s=L.split(id),m=L.find(st,s[0]);if(!m)return null;var l=MODS[m.t][dir];for(var i=0;i<l.length;i++)if(l[i].k===s[1])return l[i];return null;};
L.outKind=function(st,a){var p=L.port(st,a,'o');return p?p.kind:'audio';};
L.canConnect=function(st,a,b){
 var pa=L.port(st,a,'o'),pb=L.port(st,b,'i');
 if(!pa||!pb)return {ok:false,msg:'出力ジャック→入力ジャックの順につなぎます'};
 if((pa.kind==='gate')!==(pb.kind==='gate'))return {ok:false,msg:pa.kind==='gate'?'GATE(ピンク)は、ピンクの入力にだけつなげます':'音(黄)・制御(青)は、GATE(ピンク)につなげません'};
 if(L.has(st,a,b))return {ok:false,msg:'同じケーブルがすでにあります'};
 if(st.cab.length>=L.MAXC)return {ok:false,msg:'ケーブルは最大'+L.MAXC+'本までです'};
 var ma=L.split(a)[0],mb=L.split(b)[0];
 if(pa.kind!=='gate'){var seen={},stack=[mb];
  while(stack.length){var x=stack.pop();if(x===ma)return {ok:false,msg:'ループ(出力から入力への戻り接続)はできません'};if(seen[x])continue;seen[x]=1;
   st.cab.forEach(function(c){var cs=L.split(c[0])[0];if(cs===x&&L.outKind(st,c[0])!=='gate')stack.push(L.split(c[1])[0]);});}}
 return {ok:true};
};
L.samplePatch=function(){var M=L.M;return {mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('vcf1',{cutoff:1200,res:.2,cv:2}),M('adsr1',{a:.01,d:.3,s:.7,r:.3}),M('adsr2',{a:.005,d:.35,s:.2,r:.3}),M('vca1'),M('out1')],
 cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vcf1.in'],['vcf1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['kbd1.gate','adsr2.gate'],['adsr1.out','vca1.cv'],['adsr2.out','vcf1.cutoff']]};};
L.blankPatch=function(){var M=L.M;return {mods:[M('kbd1'),M('out1')],cab:[]};};
/* モジュールのつまみ定義(id='vco1.coarse')。UI・検証が共通で使う */
var cache={};
L.knobDef=function(id){
 if(cache[id])return cache[id];var s=L.split(id),t=L.type(s[0]);if(!t)return undefined;
 var k=MODS[t].knobs.filter(function(x){return x.k===s[1];})[0];if(!k)return undefined;
 return cache[id]=Object.assign({},k,{id:id,tab:'rack'});
};
SD.modLib=L;SD.MODS=MODS;
/* つまみ表: FX(共通)+master だけを固定のPに持つ。モジュールのつまみは動的(byIdのProxyが引き当てる) */
var P=[],fxIds=['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'];
fxIds.forEach(function(i){P.push(A.byId[i]);});
var T=[{id:'rack',name:'RACK',cols:1,rows:1,items:[]},{id:'fx',name:'FX',cols:6,rows:1,items:['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix']}];
var base={},DEF={};P.forEach(function(p){base[p.id]=p;DEF[p.id]=p.def;});
var byId=new Proxy(base,{get:function(t,k){if(k in t)return t[k];return typeof k==='string'&&k.indexOf('.')>0?L.knobDef(k):undefined;}});
SD.defs.mod={P:P,T:T,byId:byId,DEF:DEF};
var sy=SD.SYNTHS.filter(function(s){return s.id==='mod';})[0];if(sy){sy.ready=true;delete sy.ver;}
})();
