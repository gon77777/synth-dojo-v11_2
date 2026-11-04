/* ドラム音色(v5.1): アナログ音色のパッチだけ(サンプルは同梱しない・コード生成)。ファクトリー音色と「ドラム例」で使う。
   n=基準の音(ノイズ系は音程に影響しにくい)・oct=鍵盤のOCT。キック・スネア・ハットは既存レッスン音色(kick/snare/hat)を流用 */
var SD=window.SD=window.SD||{};
SD.DRUMS=[
 {id:'clap',name:'クラップ',n:60,oct:0,p:{o1Lvl:0,noiseLvl:1,nHP:900,fType:'bandpass',cutoff:1800,res:.25,aA:.001,aD:.16,aS:0,aR:.05,aBurst:4}},
 {id:'tom',name:'タム',n:45,oct:-1,p:{o1Wave:'sine',o1Lvl:1,aA:.001,aD:.35,aS:0,aR:.1,pAmt:12,pDec:.12}},
 {id:'shaker',name:'シェイカー',n:60,oct:1,p:{o1Lvl:0,noiseLvl:.8,nHP:6000,fType:'bandpass',cutoff:8000,res:.2,aA:.02,aD:.07,aS:0,aR:.03}},
 {id:'rim',name:'リム',n:72,oct:1,p:{o1Wave:'square',o1Lvl:.5,noiseLvl:.3,nHP:2500,aA:.001,aD:.035,aS:0,aR:.02,pAmt:10,pDec:.012}},
 {id:'ohat',name:'オープンハット',n:60,oct:1,p:{o1Lvl:0,noiseLvl:1,nHP:7000,fType:'bandpass',cutoff:9000,res:.5,aA:.001,aD:.35,aS:0,aR:.15}},
 {id:'conga',name:'コンガ風',n:60,oct:0,p:{o1Wave:'sine',o1Lvl:1,noiseLvl:.08,nHP:3000,aA:.001,aD:.22,aS:0,aR:.06,pAmt:5,pDec:.03}}
];
SD.DRUMBY={};SD.DRUMS.forEach(function(d){SD.DRUMBY[d.id]=d});
