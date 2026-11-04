// 素材基盤の検証: node test/mat.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const g=global;g.window=g;g.SD={};
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..','www','js','mat.js'),'utf8'),{filename:'mat.js'});
let err=0;const bad=m=>{console.error('NG: '+m);err++};
const M=SD.MAT;
if(M.ids.length!==8)bad('素材が8種でない');
const SEC={'b:voice':[5,8],'b:vowels':[5,8],'b:piano':[5,8],'b:bell':[5,8],'b:strings':[5,8],'b:pluck':[5,8],'b:beat':[5,8],'b:noise':[5,8]};
M.ids.forEach(id=>{
 const t0=Date.now(),m=M.get(id),ms=Date.now()-t0;
 if(!m){bad(id+' 生成できない');return}
 const d=m.data,n=d.length,sec=n/m.sr;let mx=0,e=0,fin=true;
 for(let i=0;i<n;i++){const v=d[i];if(!isFinite(v)){fin=false;break}const a=Math.abs(v);if(a>mx)mx=a;e+=v*v}
 if(!fin)bad(id+' 非有限値');
 if(!(d instanceof Float32Array))bad(id+' Float32Arrayでない');
 if(sec<SEC[id][0]||sec>SEC[id][1])bad(id+' 長さ '+sec.toFixed(2)+'s');
 if(Math.abs(mx-.9)>.01)bad(id+' ピーク '+mx.toFixed(3));
 if(Math.sqrt(e/n)<.02)bad(id+' ほぼ無音 rms '+Math.sqrt(e/n).toFixed(3));
 if(Math.abs(d[0])>.01||Math.abs(d[n-1])>.01)bad(id+' 端が0でない(クリック)');
 if(m.peaks.length!==800)bad(id+' peaksが800点でない');
 let pm=0;for(const v of m.peaks)pm=Math.max(pm,v);if(Math.abs(pm-mx)>1e-6)bad(id+' peaksの最大値が一致しない');
 // 決定的(同じ素材は毎回同じ)
 M.clear();const m2=M.get(id);let same=true;for(let i=0;i<n;i+=97)if(m2.data[i]!==d[i]){same=false;break}if(!same)bad(id+' 再生成で結果が変わる');
 console.log(id.padEnd(10),sec.toFixed(2)+'s','peak '+mx.toFixed(2),'rms '+Math.sqrt(e/n).toFixed(3),ms+'ms');
});
// キャッシュは最大3つ
M.clear();M.ids.forEach(id=>M.get(id));if(M.cached().length!==3)bad('キャッシュが3つでない '+M.cached().length);
M.get(M.ids[7]);M.get(M.ids[6]);const c=M.cached();if(c.join()!==[M.ids[5],M.ids[7],M.ids[6]].join())bad('LRU順が違う '+c);
// ID書式
if(M.get('u:x')!==null||M.get('voice')!==null)bad('未知のIDはnull');
M.ids.forEach(id=>{if(!/^b:[a-z]+$/.test(id))bad('ID書式 '+id)});
// 波形表示部品(キャンバスをモック)
{const calls=[];const ctx=new Proxy({},{get:(t,k)=>k==='canvas'?cv:(...a)=>calls.push(k),set:()=>true});
 var cv={clientWidth:300,clientHeight:80,width:0,height:0,getContext:()=>ctx};
 g.getComputedStyle=()=>({getPropertyValue:()=>''});
 const wv=new SD.WaveView(cv);wv.setMat(M.get('b:bell'));wv.setPos(.3);wv.setRange(.5,.2);
 if(wv.range[0]!==.2||wv.range[1]!==.5)bad('範囲の正規化');
 if(!calls.includes('fillRect'))bad('波形が描かれない');
 wv.setPos(2);wv.setRange(null);wv.setMat(null);}
console.log(err?'FAILED '+err:'OK');process.exit(err?1:0);
