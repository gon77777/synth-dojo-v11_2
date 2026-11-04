// SD.PATS(ジャンル用パターン集)の形・範囲・決定性: node test/pats.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js'),ctx={console};ctx.window=ctx;vm.createContext(ctx);
['params.js','mixdefs.js','fxnew.js','fxparams.js','seq.js','lessons.js','course.js','th.js','ly.js','ldpd.js','bs.js','plsq.js','fxl.js','ad.js','gn1.js','gn2.js','gn3.js','hs.js','eq.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),ctx,{filename:f}));
const SD=ctx.SD,P=SD.PATS;let err=0;const bad=m=>{console.error('NG: '+m);err++};
const calls=[['fourFloor'],['offbeatHat'],['halfTime','kick'],['halfTime','snare'],['dnbBreak','kick'],['dnbBreak','snare'],['dnbBreak','hat'],['trapHat',false],['trapHat',true],['shuffle',0],['shuffle',.4],['shuffle',9],
 ['bassPattern','root',0],['bassPattern','eighth',-5],['bassPattern','offbeat',3],['bassPattern','syncop',0],['bassPattern','octave',2],['bassPattern','unknown',0],['gateSeq','even'],['gateSeq','three'],['gateSeq','gap'],['gateSeq','x'],['polyPat',12],['polyPat',15,true],['polyPat',16],['polyPat',3],['walk','step'],['walk','jump'],['walk','x']];
calls.forEach(c=>{const nm=c.join(','),a=P[c[0]].apply(null,c.slice(1)),b=P[c[0]].apply(null,c.slice(1));
 if(JSON.stringify(a)!==JSON.stringify(b))bad(nm+' 決定的でない');const ks=Object.keys(a.idx);
 if(!ks.length||ks.length>16)bad(nm+' ステップ数');ks.forEach(k=>{if(!(+k>=0&&+k<=15&&String(+k)===k))bad(nm+' ステップ位置 '+k);const v=a.idx[k];if(!Number.isInteger(v)||v<-24||v>36)bad(nm+' 音の範囲 '+v)});
 (a.o.acc||[]).forEach(i=>{if(a.idx[i]===undefined)bad(nm+' accが空のステップ '+i)});
 if(a.swing!==undefined&&!(a.swing>=0&&a.swing<=.6))bad(nm+' swing範囲')});
[[0,4,5,3],[0,5,3,4],[1,4,0]].forEach(pr=>['close','open'].forEach(v=>{const a=P.chords(pr,v),b=P.chords(pr,v);if(JSON.stringify(a)!==JSON.stringify(b))bad('chords 決定的でない');
 if(a.length!==pr.length)bad('chords 数');a.forEach(ch=>{if(ch.length!==3||ch.some(n=>!Number.isInteger(n)||n<0||n>40)||ch.some((n,i)=>i&&n<=ch[i-1]))bad('chords 構成音 '+JSON.stringify(ch))})}));
if(JSON.stringify(P.chords([0],'close')[0])!=='[0,4,7]')bad('Iのコードが長三和音でない');
if(JSON.stringify(P.chords([5],'close')[0])!=='[9,12,16]')bad('VIの三和音');
const t=P.tk('kick',P.fourFloor(),'K',{p:{}});if(t.id!=='kick'||t.o.name!=='K'||!t.o.p)bad('tkヘルパー');
console.log(err?('失敗 '+err+'件'):'OK: パターン集 '+Object.keys(P).length+'関数');process.exit(err?1:0);
