var SD=window.SD={};
(function(){
var W=[['sine','サイン'],['triangle','三角'],['sawtooth','ノコギリ'],['square','矩形']];
var P=[];
function K(id,tab,label,min,max,def,o){P.push(Object.assign({id:id,tab:tab,label:label,min:min,max:max,def:def,type:'knob',curve:'lin',fmt:'pct',step:0,help:''},o||{}));}
function S(id,tab,label,opts,def,help){P.push({id:id,tab:tab,label:label,type:'seg',opts:opts,def:def,help:help||''});}

/* ---- OSC ---- */
S('o1Wave','osc','OSC1 波形',W,'sawtooth','オシレーター1の波形。音の基本の形で、含まれる倍音の量が変わります。サイン=倍音なし(丸い) / 三角=ごく弱い倍音 / ノコギリ=全部の倍音(明るい) / 矩形=奇数倍音(中空感)。');
K('o1Oct','osc','OSC1 OCT',-2,2,0,{step:1,fmt:'int',help:'オシレーター1(とSUB)の高さをオクターブ単位で上下します。'});
K('o1Lvl','osc','OSC1 音量',0,1,.8,{help:'オシレーター1の音量。0にすると鳴らなくなります。'});
K('subLvl','osc','SUB',0,1,0,{help:'OSC1の1オクターブ下で鳴るサイン波。低音に厚みを足します(ベースやキック向き)。'});
K('noiseLvl','osc','NOISE',0,1,0,{help:'ノイズ(「ザー」という雑音)の音量。スネア、ハイハット、風や波などの効果音の素材です。'});
S('o2Wave','osc','OSC2 波形',W,'sawtooth','オシレーター2の波形。OSC1と重ねて使います。');
K('o2Semi','osc','OSC2 SEMI',-24,24,0,{step:1,fmt:'st',help:'OSC2の高さを半音単位でずらします。+7で5度上(和音っぽく)、+12で1オクターブ上。割り切れない値にすると金属的な音になります。'});
K('o2Fine','osc','OSC2 FINE',-50,50,0,{step:1,fmt:'ct',help:'OSC2の高さをセント(半音の100分の1)でわずかにずらします。少しずらすと「うなり」が出て音が太くなります(デチューン)。'});
K('o2Lvl','osc','OSC2 音量',0,1,0,{help:'オシレーター2の音量。0だと鳴りません。'});
K('glide','osc','GLIDE',0,1,0,{fmt:'time',help:'グライド(ポルタメント)。直前に弾いた音から次の音へ、音程が滑らかに移る時間。0で無効。リードやベースで、音をつなげて弾くときに使います。'});
K('nHP','osc','N.HP',20,12000,20,{curve:'log',fmt:'hz',help:'ノイズだけにかかるハイパスフィルター。上げるとノイズの低音が消えて「シャッ」と軽くなります。ハイハットやスネアのザラつきに使います。'});

/* ---- FILTER ---- */
S('fType','filter','FILTER タイプ',[['lowpass','LP'],['highpass','HP'],['bandpass','BP']],'lowpass','LP=高音を削る(こもらせる) / HP=低音を削る(薄くする) / BP=中域だけ通す(ラジオ風)。');
K('cutoff','filter','CUTOFF',20,20000,20000,{curve:'log',fmt:'hz',help:'フィルターの境目の周波数。LPなら下げるほど高音が削れて暗くこもった音になります。シンセの音作りで一番よく触るつまみ。'});
K('res','filter','RES',0,1,0,{help:'レゾナンス。カットオフ付近を持ち上げて強調します。上げると「ミョーン」「ビヨッ」とクセのある響きになります。'});
K('envAmt','filter','ENV AMT',-4,4,0,{step:.1,fmt:'oct',help:'フィルターエンベロープ(F.ENV)がカットオフをどれだけ動かすか(オクターブ単位)。プラスなら弾いた瞬間に開き、マイナスなら閉じます。'});
K('keyTrack','filter','KEY TRK',0,1,0,{help:'キートラック。上げると、高い鍵盤ほどカットオフも上がり、全音域で同じ明るさになります。'});

/* ---- ENV ---- */
K('aA','env','AMP A',.001,4,.005,{curve:'log',fmt:'time',help:'アタック。鍵盤を押してから音量が最大になるまでの時間。長いと「じわ〜」と立ち上がります。'});
K('aD','env','AMP D',.001,4,.3,{curve:'log',fmt:'time',help:'ディケイ。最大音量からサスティンの音量まで下がる時間。'});
K('aS','env','AMP S',0,1,.8,{help:'サスティン。鍵盤を押し続けている間の音量。0だと、押しっぱなしでも自然に消えます(打楽器・プラック向き)。'});
K('aR','env','AMP R',.005,6,.2,{curve:'log',fmt:'time',help:'リリース。鍵盤を離したあとの余韻の長さ。'});
K('aBurst','env','BURST',1,5,1,{step:1,fmt:'n',help:'バースト。鍵盤を押した瞬間に、音量エンベロープを何回くり返すか(約12ms間隔)。1で通常。3〜4にするとノイズが「パパッ」と複数回叩かれ、クラップ(手拍子)になります。'});
K('pAmt','env','PIT AMT',-24,48,0,{step:1,fmt:'st',help:'ピッチエンベロープの深さ(半音)。プラスだと音程が高い所から本来の高さへ落ち、キックやレーザーになります。マイナスだと低い所から上昇します。'});
K('fA','env','F.ENV A',.001,4,.005,{curve:'log',fmt:'time',help:'フィルターエンベロープのアタック。フィルターが開くまでの時間。'});
K('fD','env','F.ENV D',.001,4,.3,{curve:'log',fmt:'time',help:'フィルターエンベロープのディケイ。開いたフィルターがサスティンまで戻る時間。'});
K('fS','env','F.ENV S',0,1,.3,{help:'フィルターエンベロープのサスティン。押し続けている間、ENV AMTの何割を保つか。'});
K('fR','env','F.ENV R',.005,6,.2,{curve:'log',fmt:'time',help:'フィルターエンベロープのリリース。鍵盤を離したときフィルターが元に戻る時間。'});
K('pDec','env','PIT DEC',.005,1,.1,{curve:'log',fmt:'time',help:'ピッチエンベロープの下降(上昇)にかかる時間。短いと硬い「ドッ」、長いと「ボヨーン」。'});

/* ---- LFO ---- */
S('lfoShape','lfo','LFO 波形',W,'sine','LFOの揺れ方。サイン=なめらか / 三角=直線的 / ノコギリ=上がって急に戻る / 矩形=2つの値を行き来(カクカク)。');
K('lfoRate','lfo','RATE',.1,30,5,{curve:'log',fmt:'hzf',help:'LFOの速さ。ゆっくりなら「うねり」、速いと「震え」になります。'});
K('lfoPitch','lfo','→PITCH',0,12,0,{step:.1,fmt:'st',help:'LFOで音程をゆらす深さ。小さい値でビブラート、大きい値でサイレン。'});
K('lfoFilter','lfo','→FILTER',0,4,0,{step:.1,fmt:'oct',help:'LFOでカットオフをゆらす深さ。「ウワウワ」というワウやウォブルになります。'});
K('lfoAmp','lfo','→AMP',0,1,0,{help:'LFOで音量をゆらす深さ。トレモロになります。'});

/* ---- FX ---- */
K('drive','fx','DRIVE',0,1,0,{help:'歪み。倍音が増えて音が太く、荒くなります。キックやベースに少し足すと存在感が出ます。'});
K('dlyTime','fx','DLY TIME',.02,1,.3,{curve:'log',fmt:'time',help:'ディレイ(やまびこ)の間隔。'});
K('dlyFb','fx','DLY FB',0,.95,.35,{fmt:'pct',help:'ディレイのフィードバック。上げると繰り返しの回数が増えます。'});
K('dlyMix','fx','DLY MIX',0,1,0,{help:'ディレイ音の量。0で無効。'});
K('rvbSize','fx','RVB SIZE',.3,5,1.5,{curve:'log',fmt:'time',help:'リバーブ(残響)の長さ。部屋の広さに相当します。'});
K('rvbMix','fx','RVB MIX',0,1,0,{help:'リバーブ音の量。0で無効。'});

K('master','top','VOL',0,1,.7,{help:'全体の音量です。'});

var T=[
 {id:'osc',name:'OSC',cols:7,rows:2,items:['o1Wave','o1Oct','o1Lvl','subLvl','noiseLvl','glide','o2Wave','o2Semi','o2Fine','o2Lvl','nHP']},
 {id:'filter',name:'FILTER',cols:8,rows:1,items:['fType','cutoff','res','envAmt','keyTrack','v_fcurve']},
 {id:'env',name:'ENV',cols:8,rows:2,place:6,items:['aA','aD','aS','aR','aBurst','pAmt','fA','fD','fS','fR','pDec','v_env']},
 {id:'lfo',name:'LFO',cols:6,rows:1,items:['lfoShape','lfoRate','lfoPitch','lfoFilter','lfoAmp']},
 {id:'fx',name:'FX',cols:6,rows:1,items:['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix']}
];

var byId={},DEF={};
P.forEach(function(p){byId[p.id]=p;DEF[p.id]=p.def;});

SD.SYNTHS=[{id:'analog',name:'アナログ(サブトラクティブ)',short:'アナログ',sub:'OSC→フィルター→アンプ。倍音の多い音を「削って」音色を作る方式',ready:true},{id:'fm',name:'FM',sub:'波で別の波の位相を揺らして倍音を作る方式(4オペレーター)',ready:true},{id:'add',name:'アディティブ',sub:'正弦波(倍音)を足し合わせて音色を作る方式(倍音ごとに減衰を変えられる)',ready:true},{id:'wt',name:'ウェーブテーブル',ready:true},{id:'gr',name:'グラニュラー',ready:true},{id:'mod',name:'モジュラー',sub:'サブトラクティブと同じ原理を、ケーブルの配線で組み立てる',ready:false,ver:'v0.5'}];
SD.defs={analog:{P:P,T:T,byId:byId,DEF:DEF}};SD.P=P;SD.T=T;SD.byId=byId;SD.DEF=DEF;SD.WAVES=W;
SD.WSVG={sine:'M1 6C5 -1 9 -1 12 6S19 13 23 6',triangle:'M1 6L6.5 1.5L17.5 10.5L23 6',sawtooth:'M1 10L12 2V10L23 2',square:'M1 10V2H12V10H23V2'};

SD.toN=function(p,v){if(p.type==='seg')return 0;var n=p.curve==='log'?Math.log(v/p.min)/Math.log(p.max/p.min):(v-p.min)/(p.max-p.min);return Math.max(0,Math.min(1,n));};
SD.clamp=function(p,v){v=Math.max(p.min,Math.min(p.max,v));if(p.step){v=Math.round((v-p.min)/p.step)*p.step+p.min;v=Math.round(v*1000)/1000;}return v;};
SD.fromN=function(p,n){n=Math.max(0,Math.min(1,n));var v=p.curve==='log'?p.min*Math.pow(p.max/p.min,n):p.min+n*(p.max-p.min);return SD.clamp(p,v);};

function sg(v,s){return (v>0?'+':'')+s;}
SD.fmt=function(p,v){
 if(p.type==='seg'){var o=p.opts.filter(function(x){return x[0]===v})[0];return o?o[1]:String(v);}
 switch(p.fmt){
  case 'hz':return v>=1000?(v/1000).toFixed(v>=10000?0:1)+'kHz':Math.round(v)+'Hz';
  case 'hzf':return v.toFixed(1)+'Hz';
  case 'time':return v<1?Math.round(v*1000)+'ms':v.toFixed(2)+'s';
  case 'pct':return Math.round(v*100)+'%';
  case 'st':return sg(v,Number.isInteger(v)?v:v.toFixed(1))+'st';
  case 'ct':return sg(v,Math.round(v))+'ct';
  case 'pc':return sg(v,Math.round(v))+'%';
  case 'pc100':return sg(v,Math.round(v*100))+'%';
  case 'oct':return sg(v,v.toFixed(1))+'oct';
  case 'int':return sg(v,v);
  case 'cn':return Math.round(v)+'ct';
  case 'n':return String(Math.round(v));
  case 'pan':return Math.abs(v)<.005?'C':(v<0?'L':'R')+Math.round(Math.abs(v)*100);
  case 'x':return v.toFixed(1)+'×';
  case 'key':return ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][((Math.round(v)%12)+12)%12];
  case 'note':return ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][Math.round(v)%12]+(Math.floor(Math.round(v)/12)-1);
  case 'ps':return(v<10?v.toFixed(1):String(Math.round(v)))+'/s';
  case 'cyc':return v<.005?'AUTO':Math.round(v*1000)+'ms';
 }
 return String(v);
};
SD.parse=function(p,s,cur){
 var t=String(s).trim().toLowerCase(),m;
 if(p.fmt==='cyc'&&t==='auto')return p.min;
 m=t.match(/^[-+]?\d*\.?\d+/);
 if(!m)return NaN;
 var n=parseFloat(m[0]),rest=t.slice(m[0].length).trim();
 switch(p.fmt){
  case 'hz':case 'hzf':return rest.charAt(0)==='k'?n*1000:n;
  case 'time':if(rest.indexOf('ms')===0)return n/1000;if(rest.charAt(0)==='s')return n;return cur>=1?n:n/1000;
  case 'cyc':return rest.charAt(0)==='s'&&rest.indexOf('ms')!==0?n:n/1000;
  case 'pct':case 'pc100':return n/100;
 }
 return n;
};
})();
