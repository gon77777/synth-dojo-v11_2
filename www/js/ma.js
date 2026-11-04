/* MA コース(ma01〜ma06)。モジュラーのつまみをオートメーションのレーンで動かす。
   レーンのIDは 'vcf1.cutoff' のように「モジュールID.つまみ」。目標のつまみは必ず init のパッチに存在する(test/validate.js が検査)。
   シンセは synth:'mod'・mode:'seq'(パターンで鳴らし、AUTOタブでレーンを描く)。数値は SD.fmt で表示と同じ書式にする。年号・人名・機材名は書かない */
(function(){
 var M=SD.modLib.M,L4=1536,F=function(id,v){return SD.fmt(SD.modLib.knobDef(id),v)},T=function(id,pts){return{id:id,pts:pts}};
 SD.CATS.push({id:'ma1',synth:'mod',chapter:'course',course:'MA',name:'MA モジュラーのオートメーション'});
 var st=function(a){return a.map(function(n){return n.length?{on:true,n:n[0],acc:false,sld:false,tie:false}:{on:false,n:48,acc:false,sld:false,tie:false}})};
 var PAT={len:16,scale:'minor',key:9,steps:st([[57],[],[60],[],[64],[],[60],[],[57],[],[60],[],[64],[],[67],[]])};
 var base=function(vf,extraMods,extraCab){return{mods:[M('kbd1'),M('vco1',{wave:'sawtooth'}),M('vcf1',vf),M('adsr1',{a:.01,d:.3,s:.7,r:.2}),M('vca1'),M('out1')].concat(extraMods||[]),
  cab:[['kbd1.pitch','vco1.pitch'],['vco1.out','vcf1.in'],['vcf1.out','vca1.in'],['vca1.out','out1.in'],['kbd1.gate','adsr1.gate'],['adsr1.out','vca1.cv']].concat(extraCab||[])}};
 var D=function(id,t,sub,init,steps){return{id:id,cat:'ma1',synth:'mod',lv:2,course:'MA',pre:['m3'],title:t,sub:sub,mode:'seq',tab:'seq',oct:0,demo:{n:[57,60,64],gap:.5,len:.4},pat:PAT,init:init,steps:steps}};
 var cut=function(a){return T('vcf1.cutoff',a)};
 SD.LESSONS.push(
 D('ma01','カットオフを描く','VCFのCUTOFFをレーンで動かす',base({cutoff:300,res:.3,cv:0}),[
  {h:'動かさずに聴く',b:'VCFのCUTOFFは低めに固定。こもった音が同じ明るさで繰り返される。ここから、時間に沿ってカットオフを動かしていく。',clr:'au',bars:4,tab:'rack'},
  {h:'レーンのIDは「モジュール.つまみ」',b:'モジュラーのつまみは、モジュールのIDとつまみ名をつないで vcf1.cutoff のように呼ぶ。他のシンセのつまみと同じように、AUTOタブの「対象を選ぶ」から選べる。いまのラックにあるモジュールが、VCF1・VCO1 のように並んでいる。',tab:'rack'},
  {h:'CUTOFFのレーンを作る',b:'AUTOタブで「対象を選ぶ」を押し、一覧の VCF1 を開いて CUTOFF を選ぼう。',tab:'au',au:[{id:'vcf1.cutoff',has:1}]},
  {h:'だんだん開く',b:'4小節かけて、'+F('vcf1.cutoff',300)+'から'+F('vcf1.cutoff',4000)+'まで直線で上げよう。こもった音が少しずつ明るくなる。',tab:'au',au:[{id:'vcf1.cutoff',mono:[[0,L4,'up']]}],ref:[cut([[0,300,'L'],[L4,4000,'L']])]},
  {h:'山をつくる',b:'次は2小節目の頭(小節の位置は上の目盛り)で'+F('vcf1.cutoff',4000)+'に届き、最後は'+F('vcf1.cutoff',300)+'へ戻る山を描こう。開いて、また閉じる動き。',tab:'au',au:[{id:'vcf1.cutoff',at:[[768,4000,.15]]}],ref:[cut([[0,300,'L'],[768,4000,'L'],[L4,300,'L']])]},
  {h:'聴き比べる',b:'固定と、だんだん開く動きを聴き比べよう。同じパッチでも、つまみを時間で動かすだけで表情が変わる。',tab:'au',cmp:[{l:'固定',au:false},{l:'だんだん開く',ln:[cut([[0,300,'L'],[L4,4000,'L']])]}]}
 ]),
 D('ma02','LFOのレートを動かす','揺れの速さを時間で変える',base({cutoff:900,res:.4,cv:2},[M('lfo1',{wave:'sine',rate:1,depth:.7})],[['lfo1.out','vcf1.cutoff']]),[
  {h:'揺れが一定の音',b:'LFOがVCFのカットオフを揺らしている。RATEはゆっくりめに固定なので、うねりの速さは変わらない。',clr:'au',bars:4,tab:'rack'},
  {h:'RATEのレーンを作る',b:'AUTOタブで LFO1 の RATE のレーンを作ろう。レーンが動かすのは「つまみの値」で、LFOの出力(揺れそのもの)ではない。',tab:'au',au:[{id:'lfo1.rate',has:1}]},
  {h:'だんだん速く',b:'4小節かけて'+F('lfo1.rate',.5)+'から'+F('lfo1.rate',12)+'まで上げよう。ゆっくりしたうねりが、震えに変わっていく。RATEは対数のつまみなので、グラフでは遅い側が広く使える。',tab:'au',au:[{id:'lfo1.rate',mono:[[0,L4,'up']]}],ref:[T('lfo1.rate',[[0,.5,'L'],[L4,12,'L']])]},
  {h:'速い・遅いを繰り返す',b:'今度は2周期以上、'+F('lfo1.rate',1)+'と'+F('lfo1.rate',10)+'の間を行き来させよう。レーンの波が、LFOの速さを揺らす二重の動きになる。',tab:'au',au:[{id:'lfo1.rate',cyc:[[0,L4,2,.3]]}],ref:[T('lfo1.rate',[[0,1,'L'],[384,10,'L'],[768,1,'L'],[1152,10,'L'],[L4,1,'L']])]},
  {h:'聴き比べる',b:'一定のうねりと、だんだん速くなるうねりを聴き比べよう。',tab:'au',cmp:[{l:'一定',au:false},{l:'だんだん速く',ln:[T('lfo1.rate',[[0,.5,'L'],[L4,12,'L']])]}]}
 ]),
 D('ma03','FM量・PWMを動かす','VCOの音色の変化を描く',base({cutoff:6000,res:.1,cv:0},[M('vco2',{wave:'sine',coarse:12}),M('lfo1',{wave:'sine',rate:2,depth:.8})],[['kbd1.pitch','vco2.pitch'],['vco2.out','vco1.fm'],['lfo1.out','vco1.pwm']]),[
  {h:'動かさずに聴く',b:'VCO1にはVCO2が FM入力でつながり、LFOが PWM入力につながっている。でもFM量はゼロ、PWM量も控えめなので、まだ素直な音。',clr:'au',bars:4,tab:'rack',s:{'vco1.wave':'pulse','vco1.width':.3,'vco1.pwm':.2}},
  {h:'FM量のレーンを作る',b:'AUTOタブで VCO1 の FM量 のレーンを作ろう。',tab:'au',au:[{id:'vco1.fm',has:1}]},
  {h:'だんだん金属的に',b:'4小節かけてFM量を'+F('vco1.fm',0)+'から'+F('vco1.fm',.8)+'まで上げよう。倍音が増えて、音が硬く金属的になっていく。',tab:'au',au:[{id:'vco1.fm',mono:[[0,L4,'up']]}],ref:[T('vco1.fm',[[0,0,'L'],[L4,.8,'L']])]},
  {h:'PWM量も動かす',b:'FM量のレーンはそのまま、VCO1の PWM量 のレーンも作って、'+F('vco1.pwm',.2)+'から'+F('vco1.pwm',1)+'まで上げよう。パルスの幅が大きく揺れて、音が厚くなる。',tab:'au',au:[{id:'vco1.fm',has:1},{id:'vco1.pwm',mono:[[0,L4,'up']]}],ref:[T('vco1.fm',[[0,0,'L'],[L4,.8,'L']]),T('vco1.pwm',[[0,.2,'L'],[L4,1,'L']])]},
  {h:'聴き比べる',b:'FM量とPWM量を動かさない音と、動かした音を聴き比べよう。',tab:'au',cmp:[{l:'動かさない',au:false},{l:'動かす',ln:[T('vco1.fm',[[0,0,'L'],[L4,.8,'L']]),T('vco1.pwm',[[0,.2,'L'],[L4,1,'L']])]}]}
 ]),
 D('ma04','クロックの速さを変える','CLOCKのBPMで自動演奏を加速させる',{mods:[M('kbd1'),M('clk1',{bpm:60,div:'e',gate:.5}),M('seqm1'),M('vco1',{wave:'sawtooth'}),M('vcf1',{cutoff:2500,res:.3,cv:0}),M('adsr1',{a:.005,d:.18,s:0,r:.05}),M('vca1'),M('out1')],
  cab:[['clk1.out','seqm1.clk'],['clk1.out','adsr1.gate'],['seqm1.pitch','vco1.pitch'],['vco1.out','vcf1.in'],['vcf1.out','vca1.in'],['vca1.out','out1.in'],['adsr1.out','vca1.cv']]},[
  {h:'一定の速さで聴く',b:'CLOCKがSEQUENCERを進めて、8ステップのフレーズが自動で鳴っている。BPMは遅めに固定なので、速さはずっと同じ。',clr:'au',bars:4,tab:'rack'},
  {h:'BPMのレーンを作る',b:'AUTOタブで CLOCK1 の BPM のレーンを作ろう。ここで動かすのはCLOCK部品のテンポで、アプリ全体のBPM(演奏のテンポ)とは別のつまみ。',tab:'au',au:[{id:'clk1.bpm',has:1}]},
  {h:'だんだん加速',b:'4小節かけてBPMを'+F('clk1.bpm',60)+'から'+F('clk1.bpm',200)+'まで上げよう。同じフレーズが、焦るように速くなっていく。',tab:'au',au:[{id:'clk1.bpm',mono:[[0,L4,'up']]}],ref:[T('clk1.bpm',[[0,60,'L'],[L4,200,'L']])]},
  {h:'最後だけ一気に',b:'3小節目までは'+F('clk1.bpm',60)+'のまま、最後で'+F('clk1.bpm',200)+'へ駆け上がる形も描こう。溜めてから加速する、盛り上げの定番。',tab:'au',au:[{id:'clk1.bpm',at:[[1152,60,.15],[L4,200,.15]]}],ref:[T('clk1.bpm',[[0,60,'L'],[1152,60,'L'],[L4,200,'L']])]},
  {h:'聴き比べる',b:'一定の速さと、だんだん加速する動きを聴き比べよう。',tab:'au',cmp:[{l:'一定',au:false},{l:'だんだん加速',ln:[T('clk1.bpm',[[0,60,'L'],[L4,200,'L']])]}]}
 ]),
 D('ma05','組み替えたらどうなる','モジュールを消すとレーンは「対象なし」になる',base({cutoff:300,res:.3,cv:0}),[
  {h:'まずレーンを描く',b:'VCF1 の CUTOFF にレーンを作り、4小節かけて'+F('vcf1.cutoff',300)+'から'+F('vcf1.cutoff',4000)+'まで上げよう。',clr:'au',bars:4,tab:'au',au:[{id:'vcf1.cutoff',mono:[[0,L4,'up']]}],ref:[cut([[0,300,'L'],[L4,4000,'L']])]},
  {h:'モジュールを消す',b:'RACKタブで VCF1 のカードのタイトルを長押しして、VCF1 を削除しよう(つないだケーブルも一緒に消える)。レーンはどうなるだろう。',tab:'rack'},
  {h:'レーンは残る',b:'AUTOタブを開くと、レーン名に「対象なし」と付き、薄く表示されているはず。モジュールが無いだけで、描いた点は消えていない。「対象なし」のレーンは、点の編集はできるが、再生しても何も動かさない。',tab:'au'},
  {h:'同じモジュールを足す',b:'RACKタブの「＋」から VCF を足そう。IDは同じ VCF1 になる。足したら、VCO1 の OUT → VCF1 の IN、VCF1 の OUT → VCA1 の IN をつなぎ直そう。',tab:'rack',m:[['vcf',1]],k:[['vco1.out','vcf1.in'],['vcf1.out','vca1.in']]},
  {h:'レーンが復活する',b:'AUTOタブに戻ると、レーン名から「対象なし」が消えて、また効くようになっている。レーンの持ち主は、モジュールそのものではなく「IDと種類」。同じ種類・同じIDなら、つまみの定義が同じなので、そのまま使える。番号が再利用されて別のモジュールに当たっても、同じ種類なら動く。',tab:'au'},
  {h:'聴き比べる',b:'レーン無しと、レーンありを聴き比べよう。ケーブルの組み替えは、レーンを動かすのは「つまみの値」だけ、という点は変わらない。CV入力が刺さっているつまみは、レーンの値が基準になり、CVが足される。',tab:'au',cmp:[{l:'レーン無し',au:false},{l:'レーンあり',ln:[cut([[0,300,'L'],[L4,4000,'L']])]}]}
 ]),
 D('ma06','モジュラーでライザー','ノイズ・VCF・VCA・クロックを重ねて盛り上げる',{mods:[M('kbd1'),M('noise1',{color:'white'}),M('vcf1',{cutoff:200,res:.5,cv:0}),M('vca1',{level:.3}),M('clk1',{bpm:80,div:'s',gate:.5}),M('adsr1',{a:.003,d:.12,s:0,r:.04}),M('out1')],
  cab:[['noise1.out','vcf1.in'],['vcf1.out','vca1.in'],['vca1.out','out1.in'],['clk1.out','adsr1.gate'],['adsr1.out','vca1.cv']]},[
  {h:'動かさずに聴く',b:'ノイズをフィルターに通し、CLOCKのパルスで細かく刻んでいる。カットオフ・刻む速さ・音量は低めに固定なので、まだ盛り上がらない。ライザーは、この3つを同時に上げて作る。',clr:'au',bars:4,tab:'rack'},
  {h:'まずカットオフを開く',b:'VCF1 の CUTOFF のレーンを作り、4小節かけて'+F('vcf1.cutoff',200)+'から'+F('vcf1.cutoff',8000)+'まで上げよう。ノイズが暗い所から、ざらっと明るくなっていく。',tab:'au',au:[{id:'vcf1.cutoff',mono:[[0,L4,'up']]}],ref:[cut([[0,200,'L'],[L4,8000,'L']])]},
  {h:'刻みを速くする',b:'次は CLOCK1 の BPM のレーン。'+F('clk1.bpm',80)+'から'+F('clk1.bpm',220)+'まで上げて、刻みを速くする。',tab:'au',au:[{id:'clk1.bpm',mono:[[0,L4,'up']]}],ref:[T('clk1.bpm',[[0,80,'L'],[L4,220,'L']])]},
  {h:'音量も上げる',b:'最後に VCA1 の LEVEL のレーン。'+F('vca1.level',.3)+'から'+F('vca1.level',1)+'まで上げよう。3つが同時に上がり、最後は一気に爆発する。',tab:'au',au:[{id:'vca1.level',mono:[[0,L4,'up']]}],ref:[T('vca1.level',[[0,.3,'L'],[L4,1,'L']])]},
  {h:'聴き比べる',b:'動かさない音と、3つを重ねたライザーを聴き比べよう。1つずつでは単調でも、重ねると勢いが出る。',tab:'au',cmp:[{l:'動かさない',au:false},{l:'3つを重ねる',ln:[cut([[0,200,'L'],[L4,8000,'L']]),T('clk1.bpm',[[0,80,'L'],[L4,220,'L']]),T('vca1.level',[[0,.3,'L'],[L4,1,'L']])]}]}
 ])
 );
})();
