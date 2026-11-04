// fx-src/*.js を www/js/fxworklets.js(Blob URLで登録する文字列)に埋め込む。使い方: node tools/gen-fxworklets.js [--check]
const fs=require('fs'),path=require('path');
const names=['gate','comp','saturator','modfx','limiter','autofilter','tremolo','width','bitcrush','ringmod','tapestop','deess','mbcomp','pitch','beatbuf','reverse','glitch','vocoder','spectral'],root=path.join(__dirname,'..');
let out='/* 自動生成: node tools/gen-fxworklets.js (元: fx-src/*.js)。直接編集しない */\nvar SD=window.SD=window.SD||{};\nSD.FXWSRC={\n';
out+=names.map(n=>' '+JSON.stringify(n)+':'+JSON.stringify(fs.readFileSync(path.join(root,'fx-src',n+'.js'),'utf8'))).join(',\n')+'\n};\n';
const f=path.join(root,'www','js','fxworklets.js');
if(process.argv[2]==='--check'){if(!fs.existsSync(f)||fs.readFileSync(f,'utf8')!==out){console.error('NG: fxworklets.js が fx-src と一致しない。node tools/gen-fxworklets.js を実行');process.exit(1)}console.log('OK: fxworklets.js は fx-src と一致')}
else{fs.writeFileSync(f,out);console.log('生成',f,out.length+'文字')}
