/* AU-K 複合オートメーション(au84〜。LS-au1: au84・au85・au86)。複数のレーンを同時に描く。目標は既存の at/mono/hold と sn(シーンレーン)だけ。
   聞き比べ cmp の ln=一時のレーン。cmp.g(音量補正)は未測定=README の申し送り参照。年号・人名・機材名は書かない */
SD.CATS.push({id:'au11',synth:'analog',chapter:'auto',name:'AU-K 複合オートメーション'});
(function(){
 var B=384,L4=1536,L8=3072;
 var pd=function(id){if(id.indexOf('.')>0&&SD.modLib)return SD.modLib.knobDef(id);var m=SD.MIXP.filter(function(q){return q.id===id})[0]||SD.FXP.filter(function(q){return q.id===id})[0];return m||SD.defs.analog.byId[id]||{id:'sBpm',label:'BPM',type:'knob',min:40,max:240,def:120,curve:'lin',fmt:'n',step:1}};
 var F=function(id,v){return SD.fmt(pd(id),v)};
 var T=function(id,pts){return{id:id,pts:pts}};
 var TM=function(id,pts){return{id:id,trk:'M',pts:pts}};
 var steps16=function(a){return a.map(function(n){return n.length?{on:true,n:n[0],acc:false,sld:false,tie:false}:{on:false,n:48,acc:false,sld:false,tie:false}})};
 var BASS=function(){return{len:16,scale:'minor',key:9,steps:steps16([[33],[],[],[33],[],[],[36],[],[33],[],[31],[],[33],[],[40],[]])}};
 var BI={o1Wave:'sawtooth',o1Lvl:.8,subLvl:.4,cutoff:400,res:.2,envAmt:.3,fD:.2,fS:.5,aA:.003,aD:.25,aS:.8,aR:.1,aMode:'up',aRate:3,aGate:.6,aOct:1,sBpm:120,sSwing:0};
 var ex=function(o,k){var r={};for(var i in o)r[i]=o[i];for(var j in k)r[j]=k[j];return r};
 var P=SD.PATS,TK=P.tk;
 var all16=function(){var q={},s=[];for(var i=0;i<16;i++){q[i]=0;if(i)s.push(i)}return{idx:q,o:{tie:s}}};
 var HOLD=function(){var a=all16();return{id:'bass',idx:a.idx,o:{name:'パッド',scale:'minor',tie:a.o.tie,tr:12,p:{o1Wave:'sawtooth',o1Lvl:.5,cutoff:9000,aA:.01,aD:.2,aS:.9,aR:.15}}}};
 var TRK3=function(){return[TK('kick',P.fourFloor(),'キック',{p:{o1Lvl:.45}}),TK('bass',P.bassPattern('eighth',0),'ベース',{scale:'minor',acc:[0,4,8,12]}),HOLD()]};
 var qz=function(q,ans,ex){return{q:q,ans:ans,ex:ex}};
 var AU=function(o){return Object.assign({cat:'au11',synth:'analog',ts:2},o)};
 var SQ={'静か':{1:{tVol:.5},2:{tVol:0},3:{tVol:.6}},'全開':{1:{tVol:1},2:{tVol:.9},3:{tVol:.6}}};
 var scDef=function(){return Object.keys(SQ).map(function(n){return{name:n,mix:SQ[n]}})};
 SD.LESSONS.push(
AU({id:'au84',mode:'seq',tab:'seq',title:'2本を同時に',sub:'カットオフを上げながら、音量を下げる',oct:-1,demo:{n:[33]},pat:BASS(),init:BI,steps:[
 {h:'動かさずに聴く',b:'ベースが同じ明るさ、同じ音量で鳴り続ける。この音に、2本のレーンを同時に描いて、逆向きに動かす。',clr:'au',bars:4,tab:'seq'},
 {h:'カットオフのレーンを作る',b:'AUTOタブで CUTOFF のレーンを作ろう。',tab:'au',au:[{id:'cutoff',has:1}]},
 {h:'カットオフを開く',b:'先頭の'+F('cutoff',400)+'から4小節目の終わりの'+F('cutoff',8000)+'まで、右上がりの線を引こう。音がだんだん明るくなる。',tab:'au',
  au:[{id:'cutoff',at:[[0,400,.1],[L4,8000,.1]],mono:[[0,L4,'up']]}],ref:[T('cutoff',[[0,400],[L4,8000]])]},
 {h:'音量のレーンを足す',b:'カットオフのレーンは'+F('cutoff',400)+'から'+F('cutoff',8000)+'のまま残して、続けて MIX の VOL のレーンを作ろう。先頭の'+F('tVol',1)+'から4小節目の終わりの'+F('tVol',.2)+'まで、右下がりの線を引こう。明るくなるのに、音量は下がっていく。2本が逆向きに動く。',tab:'au',
  au:[{id:'cutoff',at:[[0,400,.1],[L4,8000,.1]],mono:[[0,L4,'up']]},{id:'tVol',at:[[0,1,.1],[L4,.2,.1]],mono:[[0,L4,'down']]}],
  lane:[T('cutoff',[[0,400],[L4,8000]])],ref:[T('cutoff',[[0,400],[L4,8000]]),T('tVol',[[0,1],[L4,.2]])]},
 {h:'足す順に聴き比べる',b:'カットオフだけ、音量だけ、両方を聴き比べよう。カットオフだけだと、明るくなって音が前に出る。両方動かすと、明るさが増しても、音が遠ざかるように聞こえる。',tab:'au',
  cmp:[{l:'カットオフだけ',bars:4,ln:[T('cutoff',[[0,400],[L4,8000]])]},{l:'音量だけ',bars:4,s:{cutoff:400},ln:[T('tVol',[[0,1],[L4,.2]])]},{l:'両方',bars:4,ln:[T('cutoff',[[0,400],[L4,8000]]),T('tVol',[[0,1],[L4,.2]])]}],
  quiz:qz('明るくなりながら、遠ざかるように聞こえるのは?',3,'3が正解。カットオフを開きながら音量を下げている。1は明るくなって近づく。2は音色が変わらず、小さくなるだけ。')},
 {h:'使われどころ',b:'逆向きの動きを組み合わせる使い道を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'1本のレーンだけだと、動きの向きは1つ。2本を逆向きに動かすと、「明るくなるのに遠ざかる」のような、1本では作れない動きになる。場面の転換や、音が遠くへ消えていく演出で使われる。'}}
]}),
AU({id:'au85',mode:'trk',tab:'trk',title:'3本で場面を変える',sub:'シーンレーンと、2本のレーンを重ねる',oct:-1,demo:{n:[33]},tk:TRK3(),sc:scDef(),init:ex(BI,{cutoff:3000,djOn:1,djFilter:0,rvbMix:.1}),steps:[
 {h:'2つの場面を聴く',b:'T1キック・T2ベース・T3パッドが鳴っている。「静か」はベースが無く、「全開」はキックもベースも大きい。この2つの場面を、8小節の中で切り替えて、さらにレーンを2本重ねる。',clr:'au',bars:8,tab:'mix',
  cmp:[{l:'静か',tm:SQ['静か']},{l:'全開',tm:SQ['全開']}],quiz:qz('ベースが鳴っているのは?',2,'2が正解(全開)。静かの場面は、ベースの音量が0なので聞こえない。')},
 {h:'1本目: シーンレーン',b:'AUTOタブのシーンレーンに、切り替えの位置を置こう。「静か」を1小節目に(すぐ切り替え)、「全開」を5小節目に(1小節以上かけて)置く。前半は静かで、後半へ向けて全開になる。',tab:'au',bars:8,
  sn:[{at:0,scene:'静か',glide:'0'},{at:4,scene:'全開',glide:'≥1bar'}]},
 {h:'2本目: フィルターを開く',b:'AUTOタブで FXの DJ FILTER のレーンを作って、先頭の'+F('djFilter',-.6)+'から8小節目の終わりの'+F('djFilter',0)+'まで、右上がりの線を引こう。こもった音が、だんだん開く。',tab:'au',bars:8,
  au:[{id:'djFilter',trk:'M',at:[[0,-.6,.1],[L8,0,.1]],mono:[[0,L8,'up']]}],ref:[TM('djFilter',[[0,-.6],[L8,0]])]},
 {h:'3本目: 響きを足す',b:'フィルターのレーンは'+F('djFilter',-.6)+'から'+F('djFilter',0)+'のまま残して、続けて REVERB の MIX のレーンを作ろう。後半の頭(4小節ぶん進んだ位置)の'+F('rvbMix',.1)+'から8小節目の終わりの'+F('rvbMix',.4)+'まで、右上がりの線を引こう。全開に向けて、響きが広がる。',tab:'au',bars:8,
  au:[{id:'djFilter',trk:'M',at:[[0,-.6,.1],[L8,0,.1]],mono:[[0,L8,'up']]},{id:'rvbMix',trk:'M',at:[[4*B,.1,.05],[L8,.4,.05]],mono:[[4*B,L8,'up']]}],
  lane:[TM('djFilter',[[0,-.6],[L8,0]])],ref:[TM('djFilter',[[0,-.6],[L8,0]]),TM('rvbMix',[[0,.1],[4*B,.1],[L8,.4]])]},
 {h:'レーンの有無を聴き比べる',b:'フィルターと響きのレーンがある場合と、無い場合を聴き比べよう。レーンがあると、場面の切り替えに向けて、音が少しずつ変わっていく。',tab:'au',
  cmp:[{l:'レーンあり',bars:8,ln:[TM('djFilter',[[0,-.6],[L8,0]]),TM('rvbMix',[[0,.1],[4*B,.1],[L8,.4]])]},{l:'レーンなし',bars:8,au:false}]},
 {h:'使われどころ',b:'シーンとレーンの役割分担を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'シーンレーンは、複数のトラックの状態を、まとめて切り替える。レーンは、ほかのつまみを、場面の途中で動かす。大きな切り替えをシーンに、細かい動きをレーンにまかせると、整理しやすい。レーンを描いたつまみは、シーンよりレーンが優先される。'}}
]}),
AU({id:'au86',mode:'seq',tab:'seq',title:'テンポとフィルター',sub:'減速しながら、フィルターを閉じる',oct:-1,demo:{n:[33]},pat:BASS(),init:ex(BI,{cutoff:4000,sBpm:120}),steps:[
 {h:'動かさずに聴く',b:'テンポは'+F('sBpm',120)+'、カットオフは'+F('cutoff',4000)+'で一定。この音に、テンポとフィルターの2本のレーンを描いて、曲が終わっていくような動きを作る。',clr:'au',bars:4,tab:'seq'},
 {h:'テンポを落とす',b:'AUTOタブで BPM のレーンを作って、先頭の'+F('sBpm',120)+'から4小節目の終わりの'+F('sBpm',70)+'まで、右下がりの線を引こう。演奏がだんだん遅くなる。',tab:'au',
  au:[{id:'sBpm',at:[[0,120,.05],[L4,70,.05]],mono:[[0,L4,'down']]}],ref:[T('sBpm',[[0,120],[L4,70]])]},
 {h:'フィルターを閉じる',b:'テンポのレーンは'+F('sBpm',120)+'から'+F('sBpm',70)+'のまま残して、続けて CUTOFF のレーンを作ろう。先頭の'+F('cutoff',4000)+'から4小節目の終わりの'+F('cutoff',500)+'まで、右下がりの線を引く。遅くなりながら、音がこもっていく。',tab:'au',
  au:[{id:'sBpm',at:[[0,120,.05],[L4,70,.05]],mono:[[0,L4,'down']]},{id:'cutoff',at:[[0,4000,.1],[L4,500,.1]],mono:[[0,L4,'down']]}],
  lane:[T('sBpm',[[0,120],[L4,70]])],ref:[T('sBpm',[[0,120],[L4,70]]),T('cutoff',[[0,4000],[L4,500]])]},
 {h:'足す順に聴き比べる',b:'テンポだけ、フィルターだけ、両方を聴き比べよう。テンポだけだと、明るいまま遅くなる。両方動かすと、遅くなりながら暗くなって、終わりに向かう感じがはっきりする。',tab:'au',
  cmp:[{l:'テンポだけ',bars:4,ln:[T('sBpm',[[0,120],[L4,70]])]},{l:'フィルターだけ',bars:4,s:{sBpm:120},ln:[T('cutoff',[[0,4000],[L4,500]])]},{l:'両方',bars:4,ln:[T('sBpm',[[0,120],[L4,70]]),T('cutoff',[[0,4000],[L4,500]])]}],
  quiz:qz('遅くなりながら、暗くなっていくのは?',3,'3が正解。テンポを下げながら、カットオフも閉じている。1は暗くならない。2は遅くならない。')},
 {h:'使われどころ',b:'テンポと音色を一緒に動かす使い道を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'曲の終わりでは、テンポを落としながら、音を暗くしていくと、自然に終わった感じが出る。2本が同じ方向に動くと、動きが強調される。向きをそろえるか、逆にするかで、演出の性格が変わる。'}}
]})
 );

 /* ---- LS-au2: au90・au91・au92 ---- */
 var TL=function(trk,id,pts){return{id:id,trk:trk,pts:pts}};
 var wave=function(id,cyc,v0,v1,t0,t1){var p=pd(id),a=SD.toN(p,v0),b=SD.toN(p,v1),P=(t1-t0)/cyc,out=[],R=Math.round;
  for(var k=0;k<cyc;k++){var s=t0+k*P;for(var i=0;i<16;i++)out.push([R(s+P*i/16),SD.fromN(p,a+(b-a)*(.5-.5*Math.cos(2*Math.PI*i/16)))])}
  out.push([t1,v0]);return out};
 var CT=T('cutoff',[[0,400],[L4,8000]]),RS=T('res',[[0,.2],[L4,.7]]),NZ=T('noiseLvl',[[0,0],[L4,.5]]);
 var AT=function(id,a,b){return{id:id,at:[[0,a,.1],[L4,b,.1]],mono:[[0,L4,'up']]}};
 var XA=TL(0,'tVol',[[0,1],[L4,0]]),XB=TL(1,'tVol',[[0,0],[L4,1]]);
 var PWK=[-.6,.7,-.4,.5,-.7,.6,-.2,.4,0].map(function(v,i){return[i*192,v,i<8?'C':'L']});
 SD.LESSONS.push(
AU({id:'au90',mode:'seq',tab:'seq',title:'1つの動きを3つに',sub:'同じ右上がりの形を、3つのつまみに描く',oct:-1,demo:{n:[33]},pat:BASS(),init:ex(BI,{cutoff:400,res:.2,noiseLvl:0}),steps:[
 {h:'動かさずに聴く',b:'ベースが、暗くて静かな音で鳴り続ける。ここに、同じ向きの動きを3つのつまみに描いて、ライザーのように盛り上げる。',clr:'au',bars:4,tab:'seq'},
 {h:'1本目: カットオフ',b:'AUTOタブで CUTOFF のレーンを作って、先頭の'+F('cutoff',400)+'から4小節目の終わりの'+F('cutoff',8000)+'まで、右上がりの線を引こう。音がだんだん明るくなる。',tab:'au',
  au:[AT('cutoff',400,8000)],ref:[CT]},
 {h:'2本目: レゾナンス',b:'続けて、RES のレーンを作って、先頭の'+F('res',.2)+'から4小節目の終わりの'+F('res',.7)+'まで、同じ右上がりの線を引こう。カットオフ付近のクセが、だんだん強くなる。',tab:'au',
  au:[AT('res',.2,.7)],lane:[CT],ref:[CT,RS]},
 {h:'3本目: ノイズ',b:'さらに、NOISE のレーンを作って、先頭の'+F('noiseLvl',0)+'から4小節目の終わりの'+F('noiseLvl',.5)+'まで、同じ右上がりの線を引こう。息のような成分が、だんだん増える。3本が、同じ形で動く。',tab:'au',
  au:[AT('noiseLvl',0,.5)],lane:[CT,RS],ref:[CT,RS,NZ]},
 {h:'本数を聴き比べる',b:'1本だけ、3本、動かさない場合を聴き比べよう。同じ形でも、3本重ねると、盛り上がりがずっと大きくなる。',tab:'au',
  cmp:[{l:'1本だけ',bars:4,s:{res:.2,noiseLvl:0},ln:[CT]},{l:'3本',bars:4,ln:[CT,RS,NZ]},{l:'動かさない',au:false,s:{cutoff:400,res:.2,noiseLvl:0}}],
  quiz:qz('盛り上がりがいちばん大きいのは?',2,'2が正解(3本)。明るさ・クセ・息の成分が同時に増える。1はカットオフだけなので、動きが小さい。')},
 {h:'使われどころ',b:'1つの動きを複数のつまみに当てる使い道を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'1つの動きを複数のつまみに同時に当てる方法は、マクロのようなもの。ライザーでは、明るさ・クセ・ノイズを同じ形で上げると、1本のつまみより大きな変化になる。形をそろえると、全体が1つの動きに聞こえる。'}}
]}),
AU({id:'au91',mode:'trk',tab:'trk',title:'クロスフェード',sub:'2つのトラックのVOLを、反対向きに動かす',oct:-1,demo:{n:[33]},
 tk:[TK('bass',P.bassPattern('eighth',0),'A: ベース',{scale:'minor',acc:[0,4,8,12]}),TK('bass',P.walk('step'),'B: メロディ',{scale:'minor',tr:24,p:{o1Wave:'square',o1Lvl:.5,cutoff:3000,aA:.01,aD:.2,aS:.3,aR:.1}})],init:ex(BI,{cutoff:3000}),steps:[
 {h:'2つのトラックを聴く',b:'T1はベース、T2はメロディ。いまは両方が同じ音量で鳴っている。この2つを、一方が消えながら、もう一方が現れる形(クロスフェード)でつなぐ。',clr:'au',bars:4,tab:'trk'},
 {h:'T1を消していく',b:'AUTOタブで T1 のVOLのレーンを作って、先頭の'+F('tVol',1)+'から4小節目の終わりの'+F('tVol',0)+'まで、右下がりの線を引こう。ベースがだんだん消える。',tab:'au',
  au:[{id:'tVol',trk:0,at:[[0,1,.1],[L4,0,.1]],mono:[[0,L4,'down']]}],ref:[XA]},
 {h:'T2を出していく',b:'続けて、T2のVOLのレーンを作って、先頭の'+F('tVol',0)+'から4小節目の終わりの'+F('tVol',1)+'まで、反対向きの右上がりの線を引こう。メロディがだんだん現れる。',tab:'au',
  au:[{id:'tVol',trk:1,at:[[0,0,.1],[L4,1,.1]],mono:[[0,L4,'up']]}],lane:[XA],ref:[XA,XB]},
 {h:'3通りを聴き比べる',b:'クロスフェード、ベースだけ、メロディだけを聴き比べよう。クロスフェードは、途中で2つが同じくらいの音量になり、少しずつ入れ替わる。',tab:'au',
  cmp:[{l:'クロスフェード',bars:4,ln:[XA,XB]},{l:'ベースだけ',au:false,tm:{1:{tVol:1},2:{tVol:0}}},{l:'メロディだけ',au:false,tm:{1:{tVol:0},2:{tVol:1}}}],
  quiz:qz('ベースからメロディへ、少しずつ入れ替わるのは?',1,'1が正解(クロスフェード)。2はベースだけ、3はメロディだけなので、入れ替わらない。')},
 {h:'使われどころ',b:'2つのトラックを入れ替える使い道を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'一方を下げながらもう一方を上げると、場面や音色がなめらかに入れ替わる。直線で同時に動かすと、真ん中で少し音が痩せることがある。そのときは、2本の形を少しずらして調整する。'}}
]}),
AU({id:'au92',mode:'seq',tab:'seq',title:'周期とランダムの合成',sub:'サインの往復と、なめらかなランダムを重ねる',oct:-1,demo:{n:[33]},pat:BASS(),init:ex(BI,{cutoff:400}),steps:[
 {h:'動かさずに聴く',b:'カットオフは'+F('cutoff',400)+'で固定、音は中央で鳴っている。ここに、規則的な動きと、不規則な動きを、別のつまみに描いて重ねる。',clr:'au',bars:4,tab:'seq'},
 {h:'周期の動き: カットオフ',b:'CUTOFF のレーンに「サイン」の形を、回数4で敷こう。'+F('cutoff',300)+'と'+F('cutoff',4000)+'の間を、4小節で4回往復する。規則的な「ワウワウ」。',tab:'au',
  au:[{id:'cutoff',cyc:[[0,L4,4,.3]]}],ref:[T('cutoff',wave('cutoff',4,300,4000,0,L4))]},
 {h:'ランダムの動き: パン',b:'続けて、PAN のレーンに「ランダムウォーク」を回数3で敷こう。'+F('tPan',-.7)+'から'+F('tPan',.7)+'の範囲で、音が左右にふらふらと漂う。',tab:'au',
  au:[{id:'tPan',rng:[[0,L4,-.7,.7]],cyc:[[0,L4,3,.3]]}],lane:[T('cutoff',wave('cutoff',4,300,4000,0,L4))],ref:[T('cutoff',wave('cutoff',4,300,4000,0,L4)),T('tPan',PWK)]},
 {h:'足す順に聴き比べる',b:'周期だけ、ランダムだけ、両方を聴き比べよう。周期だけだと機械的。ランダムだけだと明るさは変わらない。両方重ねると、規則と揺らぎが同居して、生きた動きになる。',tab:'au',
  cmp:[{l:'周期だけ',bars:4,ln:[T('cutoff',wave('cutoff',4,300,4000,0,L4))]},{l:'ランダムだけ',bars:4,s:{cutoff:400},ln:[T('tPan',PWK)]},{l:'両方',bars:4,ln:[T('cutoff',wave('cutoff',4,300,4000,0,L4)),T('tPan',PWK)]}],
  quiz:qz('規則的な往復と、左右の揺らぎが、どちらも聞こえるのは?',3,'3が正解(両方)。カットオフのサインが規則的な動きを、パンのランダムウォークが不規則な動きを作る。1は左右に動かない。2は明るさが変わらない。')},
 {h:'使われどころ',b:'規則とランダムを重ねる使い道を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'規則的な動きだけだと機械的に、ランダムだけだと落ち着かなく聞こえる。別のつまみに、両方を少しずつ描くと、リズムの軸を保ちながら、生っぽい表情が出る。ランダムは小さく、遅くするのが自然。'}}
]})
 );

 /* ---- LS-au3: au87・au88・au89 ---- */
 var AM=function(id,a,b){return{id:id,trk:'M',at:[[0,a,.1],[L4,b,.1]],mono:[[0,L4,'up']]}};
 var MT=function(id,pts){return{id:id,trk:'M',pts:pts}};
 var HPR=MT('eqHpf',[[0,20,'E'],[L4,800]]),PSR=MT('psSh',[[0,0],[L4,12]]),RBR=MT('rbMix',[[0,0],[L4,.5]]);
 var VOLR=MT('master',[[0,.7,'S'],[2*B-24,.7,'L'],[2*B,0,'S'],[3*B-24,0,'L'],[3*B,.7,'L'],[L4,.7]]);
 var LPR=T('cutoff',[[0,8000],[2*B,400,'S'],[3*B-24,400,'L'],[3*B,8000],[L4,8000]]);
 var GLR=MT('glProb',[[0,0],[B,0],[2*B,.8,'S'],[3*B-24,.8,'L'],[3*B,0],[L4,0]]);
 var STV={glProb:[0,.3,.6,.9],rbMix:[0,.25,.5,.75],tsSpeed:[1,.8,.6,.4]};
 var STR=function(id){var v=STV[id];return{id:id,trk:'M',at:v.map(function(x,i){return[i*B+192,x,.1]}),stp:[[0,L4,3]]}};
 var STP=function(id){var v=STV[id];return MT(id,v.map(function(x,i){return[i*B,x,'S']}).concat([[L4,v[3]]]))};
 var RAMP=MT('glProb',[[0,0],[L4,.9]]);
 SD.LESSONS.push(
AU({id:'au87',mode:'seq',tab:'seq',title:'ライザー総合',sub:'ノイズ・LOW CUT・ピッチ・リバースを重ねる',oct:-1,demo:{n:[33]},pat:BASS(),init:ex(BI,{cutoff:3000,noiseLvl:0,eqOn:1,eqHpf:20,psOn:1,psSh:0,psMix:1,rbOn:1,rbLen:3,rbMix:0}),steps:[
 {h:'動かさずに聴く',b:'ベースが、そのまま鳴り続ける。ここに、4本のレーンを重ねて、4小節で盛り上がるライザーを作る。上げていく向きは、4本とも同じ。',clr:'au',bars:4,tab:'seq'},
 {h:'1本目: ノイズ',b:'AUTOタブで NOISE のレーンを作って、先頭の'+F('noiseLvl',0)+'から4小節目の終わりの'+F('noiseLvl',.5)+'まで、右上がりの線を引こう。息のようなノイズが、だんだん増える。',tab:'au',
  au:[AT('noiseLvl',0,.5)],ref:[NZ]},
 {h:'2本目: LOW CUT',b:'続けて、FXのつまみから EQ の LOW CUT のレーンを作って、先頭の'+F('eqHpf',20)+'から4小節目の終わりの'+F('eqHpf',800)+'まで、右上がりの線を引こう。低い音が少しずつ抜けて、軽く、浮き上がる。',tab:'au',
  au:[AM('eqHpf',20,800)],lane:[NZ],ref:[NZ,HPR]},
 {h:'3本目: ピッチ',b:'続けて、PITCH の SHIFT のレーンを作って、先頭の'+F('psSh',0)+'から4小節目の終わりの'+F('psSh',12)+'まで、右上がりの線を引こう。音の高さが、1オクターブ上がっていく。',tab:'au',
  au:[AM('psSh',0,12)],lane:[NZ,HPR],ref:[NZ,HPR,PSR]},
 {h:'4本目: リバース',b:'最後に、REVERSE の MIX のレーンを作って、先頭の'+F('rbMix',0)+'から4小節目の終わりの'+F('rbMix',.5)+'まで、右上がりの線を引こう。逆再生の音が、だんだん混ざる。4本が、同じ向きで動く。',tab:'au',
  au:[AM('rbMix',0,.5)],lane:[NZ,HPR,PSR],ref:[NZ,HPR,PSR,RBR]},
 {h:'本数を聴き比べる',b:'ノイズだけ、4本全部、動かさない場合を聴き比べよう。ノイズだけでも盛り上がるが、4本重ねると、音が高く、軽く、広がって、ライザーらしい迫力になる。',tab:'au',
  cmp:[{l:'ノイズだけ',bars:4,ln:[NZ]},{l:'4本全部',bars:4,ln:[NZ,HPR,PSR,RBR]},{l:'動かさない',au:false,s:{noiseLvl:0,eqHpf:20,psSh:0,rbMix:0}}],
  quiz:qz('高く、軽くなりながら、盛り上がるのは?',2,'2が正解(4本全部)。ノイズ・LOW CUT・ピッチ・リバースが同時に動く。1はノイズが増えるだけで、音の高さは変わらない。3は動かないので盛り上がらない。')},
 {h:'使われどころ',b:'4本を重ねるライザーの作り方を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'ライザーは、1つの動きでは足りない。音の量(ノイズ)、低域の重さ(LOW CUT)、高さ(ピッチ)、広がり(リバース)を同じ向きに動かすと、聞き手は「上がっていく」と感じる。ピッチは上げすぎると音が荒れるので、半音の数は控えめにする。'}}
]}),
AU({id:'au88',mode:'seq',tab:'seq',title:'ドロップの演出',sub:'抜く・戻す。VOL・カットオフ・グリッチ',oct:-1,demo:{n:[33]},pat:BASS(),init:ex(BI,{cutoff:8000,master:.7,glOn:1,glLen:2,glProb:0,glRep:4,glRev:.25,glMix:1}),steps:[
 {h:'動かさずに聴く',b:'ベースが、4小節のあいだ、同じ音量と明るさで鳴り続ける。ここに、3本のレーンで「抜く」と「戻す」を描く。途中で音を抜いて、最後の小節の頭で戻す。',clr:'au',bars:4,tab:'seq'},
 {h:'1本目: 音量を抜く',b:'AUTOタブで MASTER の VOL のレーンを作ろう。1小節が過ぎるまで'+F('master',.7)+'を保って、2小節が過ぎたところで'+F('master',0)+'へ落とそう。3小節が過ぎたところで'+F('master',.7)+'へ戻す。そのあいだの1小節が無音になる。',tab:'au',
  au:[{id:'master',trk:'M',at:[[B,.7,.1],[2*B,0,.1],[960,0,.1],[3*B,.7,.1]]}],ref:[VOLR]},
 {h:'2本目: カットオフで抜く',b:'続けて、CUTOFF のレーンを作って、先頭の'+F('cutoff',8000)+'から2小節が過ぎたところの'+F('cutoff',400)+'まで、右下がりの線を引こう。音がこもって、遠ざかる。3小節が過ぎたところで、'+F('cutoff',8000)+'へ戻す。',tab:'au',
  au:[{id:'cutoff',at:[[0,8000,.1],[2*B,400,.1],[3*B,8000,.1]],mono:[[0,2*B,'down']]}],lane:[VOLR],ref:[VOLR,LPR]},
 {h:'3本目: グリッチを足す',b:'最後に、GLITCH の PROB のレーンを作って、1小節が過ぎたところの'+F('glProb',0)+'から2小節が過ぎたところの'+F('glProb',.8)+'まで、右上がりの線を引こう。落とす前に、音が細かく崩れていく。3小節が過ぎたところで、'+F('glProb',0)+'へ戻す。',tab:'au',
  au:[{id:'glProb',trk:'M',at:[[B,0,.1],[2*B,.8,.1],[3*B,0,.1]],mono:[[B,2*B,'up']]}],lane:[VOLR,LPR],ref:[VOLR,LPR,GLR]},
 {h:'足す順に聴き比べる',b:'音量だけ、3本全部、動かさない場合を聴き比べよう。音量だけだと、急に音が消える。3本重ねると、こもって、崩れてから消えるので、無音が「抜けた」と感じられる。',tab:'au',
  cmp:[{l:'音量だけ',bars:4,s:{cutoff:8000,glProb:0},ln:[VOLR]},{l:'3本全部',bars:4,ln:[VOLR,LPR,GLR]},{l:'動かさない',au:false,s:{cutoff:8000,glProb:0}}],
  quiz:qz('こもって、崩れてから、音が抜けるのは?',2,'2が正解(3本全部)。カットオフで音がこもり、グリッチで崩れてから、音量が落ちる。1は音量だけなので、急に消える。3は動かない。')},
 {h:'使われどころ',b:'ドロップの前後の作り方を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'ドロップは、戻す瞬間を目立たせるために、直前を「抜く」。音を足すより、一瞬だけ音を減らすほうが、戻ったときの落差が大きい。戻すときは、全部を同じ位置にそろえると、1つの動きに聞こえる。'}}
]}),
AU({id:'au89',mode:'seq',tab:'seq',title:'切り替えの階段',sub:'グリッチ・リバース・テープストップを階段で',oct:-1,demo:{n:[33]},pat:BASS(),init:ex(BI,{cutoff:3000,glOn:1,glLen:2,glProb:0,glRep:4,glRev:.25,glMix:1,rbOn:1,rbLen:3,rbMix:0,tsOn:1,tsSpeed:1}),steps:[
 {h:'動かさずに聴く',b:'ベースが、そのまま鳴り続ける。ここに、「階段」の形のレーンを3本描く。階段は、値が小節ごとに、ぱっと切り替わる形。なめらかな線とは違って、段ごとに、はっきり変わる。',clr:'au',bars:4,tab:'seq'},
 {h:'1本目: グリッチの階段',b:'AUTOタブで GLITCH の PROB のレーンを作って、小節ごとに'+F('glProb',0)+'、'+F('glProb',.3)+'、'+F('glProb',.6)+'、'+F('glProb',.9)+'と、階段で上げよう。つなぎ方は「ステップ」にする。崩れる確率が、段ごとに上がる。',tab:'au',
  au:[STR('glProb')],ref:[STP('glProb')]},
 {h:'2本目: リバースの階段',b:'続けて、REVERSE の MIX のレーンを作って、小節ごとに'+F('rbMix',0)+'、'+F('rbMix',.25)+'、'+F('rbMix',.5)+'、'+F('rbMix',.75)+'と、階段で上げよう。逆再生の音が、段ごとに増える。',tab:'au',
  au:[STR('rbMix')],lane:[STP('glProb')],ref:[STP('glProb'),STP('rbMix')]},
 {h:'3本目: テープストップの階段',b:'最後に、TAPE STOP の SPEED のレーンを作って、小節ごとに'+F('tsSpeed',1)+'、'+F('tsSpeed',.8)+'、'+F('tsSpeed',.6)+'、'+F('tsSpeed',.4)+'と、階段で下げよう。再生が、段ごとに遅くなって、音程も下がる。',tab:'au',
  au:[STR('tsSpeed')],lane:[STP('glProb'),STP('rbMix')],ref:[STP('glProb'),STP('rbMix'),STP('tsSpeed')]},
 {h:'階段と直線を聴き比べる',b:'グリッチの PROB を、階段と直線で聴き比べよう。階段は、段ごとに崩れ方がはっきり変わる。直線は、いつ変わったか分かりにくい。動かさない場合は、ずっと崩れない。',tab:'au',
  cmp:[{l:'階段',bars:4,ln:[STP('glProb')]},{l:'直線',bars:4,ln:[RAMP]},{l:'動かさない',au:false,s:{glProb:0}}],
  quiz:qz('小節ごとに、崩れ方がはっきり変わるのは?',1,'1が正解(階段)。値が小節ごとに切り替わる。2は少しずつ変わるので、変わった場所が分かりにくい。3は変わらない。')},
 {h:'使われどころ',b:'階段の使いどころを考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'階段は、場面を切り替えるときに向いている。なめらかな線は「変化の途中」を見せるが、階段は「次の段に来た」ことを見せる。グリッチ、リバース、テープストップのような、効きの強い効果ほど、小節ごとに段を作ると、構成が聞き手に伝わる。'}}
]})
 );

 /* ---- LS-au4: au93(モジュラー)・au94(読み物)・au95(仕上げ演習16小節) ---- */
 var MM=SD.modLib.M,st16=function(a){return a.map(function(n){return n.length?{on:true,n:n[0],acc:false,sld:false,tie:false}:{on:false,n:48,acc:false,sld:false,tie:false}})};
 var MPAT={len:16,scale:'minor',key:9,steps:st16([[57],[],[60],[],[64],[],[60],[],[57],[],[60],[],[64],[],[67],[]])};
 var MINIT={mods:[MM('kbd1'),MM('vco1',{wave:'sawtooth'}),MM('vcf1',{cutoff:300,res:.3,cv:2}),MM('adsr1',{a:.01,d:.3,s:.7,r:.2}),MM('vca1'),MM('out1'),MM('lfo1',{wave:'sine',rate:.5,depth:.7})],
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vcf1.in'],['vcf1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['adsr1.out','vca1.cv'],['lfo1.out','vcf1.cutoff']]};
 var MC=T('vcf1.cutoff',[[0,300],[L4,4000]]),MR=T('lfo1.rate',[[0,.5],[L4,12]]);
 var B16=16*B,B4=4*B,B8=8*B,B12=12*B;
 var XC={id:'cutoff',trk:1,pts:[[0,500,'S'],[B4,500,'L'],[B8,8000,'S'],[B12,8000,'L'],[B16,500]]};
 var XV={id:'tVol',trk:2,pts:[[0,.2,'S'],[B4,.2,'L'],[B8,.9,'S'],[B12,.9,'L'],[B16,0]]};
 var XR=MT('rvbMix',[[0,.1,'L'],[B8,.6,'L'],[B16,.1]]);
 SD.LESSONS.push(
AU({id:'au93',synth:'mod',mode:'seq',tab:'seq',title:'モジュラーのつまみを描く',sub:'VCFのCUTOFFとLFOのRATEを同時に',oct:0,demo:{n:[57,60,64],gap:.5,len:.4},pat:MPAT,init:MINIT,steps:[
 {h:'動かさずに聴く',b:'VCFのCUTOFFは低めで、LFOがゆっくり揺らしている。どちらも固定なので、同じ表情が繰り返される。ここに、モジュラーのつまみを2本、レーンで動かす。',clr:'au',bars:4,tab:'rack'},
 {h:'1本目: CUTOFF',b:'AUTOタブの「対象を選ぶ」から VCF1 の CUTOFF を選んで、先頭の'+F('vcf1.cutoff',300)+'から4小節目の終わりの'+F('vcf1.cutoff',4000)+'まで、右上がりの線を引こう。こもった音が、だんだん明るくなる。',tab:'au',
  au:[{id:'vcf1.cutoff',at:[[0,300,.1],[L4,4000,.1]],mono:[[0,L4,'up']]}],ref:[MC]},
 {h:'2本目: LFOのRATE',b:'続けて、LFO1 の RATE のレーンを作って、先頭の'+F('lfo1.rate',.5)+'から4小節目の終わりの'+F('lfo1.rate',12)+'まで、右上がりの線を引こう。明るくなりながら、揺れが速くなる。',tab:'au',
  au:[{id:'lfo1.rate',at:[[0,.5,.1],[L4,12,.1]],mono:[[0,L4,'up']]}],lane:[MC],ref:[MC,MR]},
 {h:'足す順に聴き比べる',b:'CUTOFFだけ、2本、動かさない場合を聴き比べよう。CUTOFFだけだと、明るくなるだけ。2本重ねると、明るさと揺れの速さが一緒に上がって、盛り上がりが大きくなる。',tab:'au',
  cmp:[{l:'CUTOFFだけ',bars:4,ln:[MC]},{l:'2本',bars:4,ln:[MC,MR]},{l:'動かさない',au:false}],
  quiz:qz('明るくなりながら、揺れも速くなるのは?',2,'2が正解(2本)。CUTOFFとLFOのRATEが同時に上がる。1は揺れの速さが変わらない。3は動かない。')},
 {h:'使われどころ',b:'モジュラーのつまみを重ねる使い道を考えてみよう。',tab:'au',
  col:{h:'使われどころ',b:'モジュラーのつまみも、他のシンセと同じ道具で描ける。レーンが動かすのは、つまみの値。LFOの出力そのものではなく、LFOの速さを動かすので、揺れの性格を時間で変えられる。'}}
]}),
AU({id:'au94',title:'CCで録って手直し',sub:'録る・見る・直す。外部つまみの手順',init:BI,demo:{n:[48,55,60,64],gap:.8,len:.7},steps:[
 {h:'この章の目的',b:'前の章で学んだ、外部つまみの割り当てと、動きの録音を、実際の曲づくりの手順にまとめる。実機がないと採点できないので、読み物として、順番だけを確認する。',tab:'au'},
 {h:'1. 録る前の準備',b:'録りたいつまみに、物理つまみを割り当てておく。AUTOタブで、そのつまみのレーンを作る。作っておくと、録った点が、そのレーンに入る。録る長さ(小節)も、先に決めておく。',tab:'au'},
 {h:'2. RECで録る',b:'RECをONにして、再生しながら物理つまみを回す。再生が止まっているあいだは、何も録られない。回すのは、1つのつまみに絞ると、あとで直しやすい。',tab:'au'},
 {h:'3. 録った動きを見る',b:'止めて、レーンを見る。点が細かく並んでいれば、手の動きがそのまま入っている。動かしていない時間にも、小さな揺れが入っていることがある。',tab:'au'},
 {h:'4. 手直しする',b:'細かすぎる部分は、範囲を消して、線を引き直す。大きな山や谷の位置がずれていたら、点を動かして合わせる。味のある揺れは、そのまま残してもよい。',tab:'au'},
 {h:'5. 聴いて決める',b:'録ったまま、直したあと、動かさない場合を聴き比べる。直しすぎると、機械的になるので、聴いて、どこまで直すかを決めよう。',tab:'au',
  col:{h:'録り直しのコツ',b:'うまく録れないときは、全部を直すより、録り直したほうが早い。短い区間ごとに、何回か録って、いちばん良いものを残すと、自然な動きになる。'}}
]}),
AU({id:'au95',mode:'trk',tab:'trk',title:'仕上げ演習',sub:'16小節で、複数のレーンを組み合わせる',oct:-1,demo:{n:[33]},tk:TRK3(),init:ex(BI,{cutoff:3000,rvbMix:.1}),steps:[
 {h:'16小節の曲を仕上げる',b:'T1キック、T2ベース、T3パッドが鳴っている。前半は暗く静かで、中盤で盛り上がり、最後に静まる形を、3本のレーンで描こう。これまでに学んだ、右上がり、範囲、右下がりを組み合わせる。',clr:'au',bars:16,tab:'trk'},
 {h:'1本目: ベースのカットオフ',b:'T2のCUTOFFのレーンを作ろう。先頭から4小節が過ぎるまでは'+F('cutoff',300)+'〜'+F('cutoff',1000)+'に収める。4小節が過ぎてから8小節が過ぎるまでは右上がりで開く。8小節が過ぎてから12小節が過ぎるまでは'+F('cutoff',6000)+'〜'+F('cutoff',8000)+'に収め、最後の4小節は右下がりで閉じる。',tab:'au',bars:16,
  au:[{id:'cutoff',trk:1,rng:[[0,B4-48,300,1000],[B8+48,B12-48,6000,8000]],mono:[[B4,B8,'up'],[B12,B16,'down']]}],ref:[XC]},
 {h:'2本目: パッドの音量',b:'T3のVOLのレーンを作ろう。4小節が過ぎるまでは'+F('tVol',0)+'〜'+F('tVol',.3)+'に収める。そこから8小節が過ぎるまでは右上がりで、'+F('tVol',.8)+'以上まで出す。8小節が過ぎたあと、12小節が過ぎるまでは、動かさずに保つ。最後の4小節は右下がりで、静かにする。',tab:'au',bars:16,
  au:[{id:'tVol',trk:2,rng:[[0,B4-48,0,.3]],mono:[[B4,B8,'up'],[B12,B16,'down']],hold:[[B8+48,B12-48]],at:[[B8,.8,.15]]}],lane:[XC],ref:[XC,XV]},
 {h:'3本目: リバーブ',b:'最後に、REVERB の MIX のレーンを作ろう。先頭の'+F('rvbMix',.1)+'から8小節が過ぎたところの'+F('rvbMix',.6)+'まで右上がり、そこから16小節の終わりの'+F('rvbMix',.1)+'まで右下がりで、山を作る。盛り上がりの頂点で、響きがいちばん広がる。',tab:'au',bars:16,
  au:[{id:'rvbMix',trk:'M',at:[[0,.1,.05],[B8,.6,.05],[B16,.1,.05]],mono:[[0,B8,'up'],[B8,B16,'down']]}],lane:[XC,XV],ref:[XC,XV,XR]},
 {h:'3本を聴き比べる',b:'3本そろえた場合と、動かさない場合を聴き比べよう。レーンがあると、曲に起承転結が生まれる。',tab:'au',
  cmp:[{l:'3本そろえた',bars:16,ln:[XC,XV,XR]},{l:'動かさない',bars:16,au:false}]},
 {h:'使われどころ',b:'ここまでの動きをまとめよう。',tab:'au',
  col:{h:'使われどころ',b:'複数のレーンの動きの山をそろえると、曲全体が1つの流れに聞こえる。山の位置をずらすと、別の表情になる。まず頂点を決めて、そこへ向かう動きと、そこから戻る動きを、レーンごとに描くと、整理しやすい。'}}
]})
 );
})();
