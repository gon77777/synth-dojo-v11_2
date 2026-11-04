/* 声の代役(v7.4): 歌声は同梱しない。コード生成のファクトリー音色だけ(アディティブの母音・息・子音)。
   再現度 ○(役割の代役)。声そのものの質感・息づかい・音量の起伏は再現できない。
   ビブラートは、アディティブにピッチLFOが無いため、明るさのゆらぎ(MOTION=TILT)で近似する。
   歌のメロディの型(SD.PATS.vocal)は一般的な形だけで、特定の曲のメロディではない。 */
var SD=window.SD=window.SD||{};
(function(){
 var vow=function(id,nm,v){return {id:id,name:nm,synth:'add',n:57,oct:0,voice:'vowel',
  p:{adSpec:'saw',adN:32,adTilt:0,adOddEven:0,adFmt:'on',adVowel:v,adMotTarget:'tilt',adLfoRate:5.5,adLfoDepth:.12,adMotA:.4,adMotD:.2,adMotS:1,adMotR:.2,adEgAmt:0,adA:.06,adD:.2,adS:.85,adR:.25}}};
 SD.VOICES=[
  vow('vo_a','声: あ','a'),vow('vo_i','声: い','i'),vow('vo_u','声: う','u'),vow('vo_e','声: え','e'),vow('vo_o','声: お','o'),
  /* 息(ブレス): 帯域ノイズだけ。ゆっくり立ち上がり、ゆっくり消える */
  {id:'vo_breath',name:'声: 息',synth:'analog',n:60,oct:0,voice:'breath',p:{o1Lvl:0,o2Lvl:0,subLvl:0,noiseLvl:.7,nHP:1500,fType:'bandpass',cutoff:3200,res:.15,aA:.09,aD:.25,aS:.15,aR:.18}},
  /* 子音: サ行の「シ」=短い高域ノイズ */
  {id:'vo_smp',name:'声: 取り込み素材',synth:'smp',n:60,oct:0,voice:'smp',p:{sMat:'b:voice',sMode:'one',sStart:0,aA:.005,aR:.1}},
  {id:'vo_shi',name:'声: シ',synth:'analog',n:60,oct:0,voice:'cons',p:{o1Lvl:0,o2Lvl:0,subLvl:0,noiseLvl:.9,nHP:5000,fType:'bandpass',cutoff:6800,res:.3,aA:.004,aD:.11,aS:0,aR:.03}},
  /* 子音: パ行の破裂=低域の瞬間音 */
  {id:'vo_pa',name:'声: パ',synth:'analog',n:48,oct:0,voice:'cons',p:{o1Wave:'sine',o1Lvl:1,o2Lvl:0,subLvl:0,noiseLvl:.25,nHP:300,fType:'lowpass',cutoff:1100,res:0,aA:.001,aD:.06,aS:0,aR:.02,pAmt:18,pDec:.025}}
 ];
 SD.VOICEBY={};SD.VOICES.forEach(function(d){SD.VOICEBY[d.id]=d});
 /* 歌のメロディの型: 戻り値は tk 用 {idx:{ステップ:半音},o:{tie}}(基準の音からの半音)。part='A'(Aメロ:狭く低め)|'B'(Bメロ:上がっていく)|'sabi'(サビ:高く伸ばす) */
 var V={
  A:{idx:{0:0,2:2,4:3,8:2,10:0,12:-2},o:{tie:[4]}},
  B:{idx:{0:3,2:5,4:7,6:7,8:8,10:10,12:12},o:{tie:[6]}},
  sabi:{idx:{0:12,4:14,6:12,8:10,10:12,12:7},o:{tie:[0,8]}}
 };
 SD.PATS.vocal=function(part){var v=V[part]||V.A,i={};Object.keys(v.idx).forEach(function(k){i[k]=v.idx[k]});return {idx:i,o:{tie:v.o.tie.slice()}}};
})();
