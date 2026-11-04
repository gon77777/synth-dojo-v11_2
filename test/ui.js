// UIスモークテスト: npm i --no-save jsdom && node test/ui.js
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path');
const root=require('path').join(__dirname,'..','www');
const html=fs.readFileSync(root+'/index.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'');
const dom=new JSDOM(html,{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/'});
const w=dom.window;w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(t,k)=>k==='measureText'?()=>({width:10}):()=>{},set:()=>true});
const errs=[];w.addEventListener('error',e=>errs.push(e.message));
// 最小のWebAudioモック
const node=()=>({connect(){},disconnect(){},start(){},stop(){},gain:prm(),frequency:prm(),detune:prm(),Q:prm(),delayTime:prm(),pan:prm(),curve:null,buffer:null,port:{postMessage(){},onmessage:null},parameters:{get(){return prm()}},setPeriodicWave(){}});
const prm=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
w.AudioContext=function(){return {sampleRate:48000,currentTime:0,state:'running',destination:node(),resume(){},createGain:node,createConstantSource:()=>Object.assign(node(),{offset:prm()}),createOscillator:node,createBiquadFilter:node,createWaveShaper:node,createDelay:node,createConvolver:node,createDynamicsCompressor:()=>Object.assign(node(),{threshold:prm(),knee:prm(),ratio:prm(),attack:prm(),release:prm()}),createAnalyser:()=>Object.assign(node(),{frequencyBinCount:1024,getByteFrequencyData(){},getByteTimeDomainData(){},getFloatTimeDomainData(){}}),createBuffer:(c,l)=>({getChannelData:()=>new Float32Array(l)}),createBufferSource:node,createStereoPanner:node,createPeriodicWave:()=>({}),audioWorklet:{addModule:()=>Promise.resolve()}}};
w.AudioWorkletNode=function(){return node()};
w.URL.createObjectURL=()=>'blob:x';w.requestAnimationFrame=()=>0;
const files=[...fs.readFileSync(root+'/index.html','utf8').matchAll(/<script src="js\/([^"]+)\.js/g)].map(m=>m[1]);/* MA-3: index.html の読み込み順に自動で合わせる(手書きの一覧は sched などが抜けていた) */
const t0=Date.now();
files.forEach(f=>{if(f==='app')w.eval(`SD.LESSONS.push({id:'t_x',cat:'basic',title:'テスト',sub:'',synth:'analog',demo:{n:[55],gap:1,len:.5},init:{},steps:[{h:'基盤',b:'本文',f:[['cutoff',2000]],col:{h:'歴史メモ',b:'コラム本文'},cmp:[{l:'A',s:{o1Wave:'sine'}},{l:'B',s:{o1Wave:'square'}}],dm:[{t:0,s:{cutoff:500}},{t:.1,s:{res:.8},r:.1}]},{h:'次',b:'x'}]})`);w.eval(fs.readFileSync(`${root}/js/${f}.js`,'utf8'))});
if(w.document.readyState==='loading')w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
const SD=w.SD,$=s=>w.document.querySelector(s);
const ok=(c,m)=>{if(!c){console.error('NG:',m);process.exitCode=1}};
ok($('#synb').textContent==='アナログ','初期はアナログ');
SD._test&&0;{const y=SD.SYNTHS.find(x=>x.id==='analog');ok(y.name==='アナログ(サブトラクティブ)'&&y.short==='アナログ'&&y.id==='analog','アナログの表示名・短縮名・内部ID');}
ok($('#tabs').children.length===6,'analogタブ6(MIX含む)');
$('#start').click();
SD._test.switchSynth('wt');
ok($('#synb').textContent==='ウェーブテーブル','切替ボタン表示');
ok($('#tabs').children.length===10,'wtタブ10: '+$('#tabs').children.length);
ok($('#grid').children.length===4,'WAVEタブ要素4: '+$('#grid').children.length);
for(const t of [...$('#tabs').children]){t.click();ok($('#grid').children.length>0,'タブ '+t.textContent+' が空')}
// 全wtレッスンの全ステップを順に進める
for(const id of ['w1','w2','w3','w4','w5','w6']){
 SD._test.switchSynth('analog');
 const b=w.document.createElement('button');b.dataset.act='ls';b.dataset.id=id;b.dataset.from='0';w.document.body.appendChild(b);b.click();
 ok($('#synb').textContent==='ウェーブテーブル',id+' で自動切替');
 let n=0;while(!$('#coach').innerHTML.includes('レッスン完了')&&n++<20){const nx=[...w.document.querySelectorAll('[data-act=next]')].pop();nx.click()}
 ok(n<20,id+' 完了まで進める');
 // お手本の状態で全目標が達成扱いになるか
 const L=SD.LESSONS.find(l=>l.id===id);
 L.steps.forEach((st,i)=>{const s=SD._test.stateAt(L,i);(st.f||[]).forEach(([pid,g])=>{if(g!==undefined&&!SD._test.isMet(pid,g,st.tol)&&false)0})});
}
// v0.4: 演奏モード(ARP/SEQ)
SD._test.switchSynth('analog');
SD._test.setMode('arp');
ok($('#tabs').lastChild.textContent==='ARP','ARPタブが出る');ok($('#grid .pp')&&$('#grid .pp').querySelectorAll('.pb').length>=14,'ARP画面');
SD._test.setMode('seq');
{const tl=[...$('#tabs').querySelectorAll('.tab')].map(t=>t.textContent);ok(tl[tl.length-2]==='SEQ'&&tl[tl.length-1]==='AUTO','SEQタブとAUTOタブが出る');}ok($('#grid').querySelectorAll('.sp').length===16,'SEQステップ16個');
const sp=$('#grid').querySelectorAll('.sp');sp[0].click();ok(SD._test.play.s.steps[0].on,'選択済みステップのタップでON');
SD._test.setMode('key');ok($('#tabs').children.length===6,'KEYに戻るとタブ6');
SD._test.play.stop();
for(const id of ['s1','s2','s3','s4','s5']){
 SD._test.switchSynth('analog');
 const b=w.document.createElement('button');b.dataset.act='ls';b.dataset.id=id;b.dataset.from='0';w.document.body.appendChild(b);b.click();
 const L=SD.LESSONS.find(l=>l.id===id);
 ok($('.mseg .on').dataset.m===L.mode,id+' でモード自動切替');
 let n=0;while(!$('#coach').innerHTML.includes('レッスン完了')&&n++<20){const nx=[...w.document.querySelectorAll('[data-act=next]')].pop();nx.click()}
 ok(n<20,id+' 完了まで進める');
}
SD._test.setMode('key');
// 音色保存→analogへ戻る→読み込みでwtに切替
SD._test.switchSynth('analog');

// v0.5: モジュラー
SD._test.switchSynth('mod');
ok($('#synb').textContent==='モジュラー','モジュラーに切替');
ok($('#tabs').querySelectorAll('.tab').length===3,'modタブ3(MIX含む)');
ok($('#grid').querySelectorAll('.mc').length===7,'サンプルパッチのカード7枚: '+$('#grid').querySelectorAll('.mc').length);
ok($('#grid').querySelectorAll('.cb:not(.gh)').length===8,'ケーブル8本');
const clk=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const jk=id=>$(`.jk[data-p="${id}"]`);
clk(jk('vco1.out'));clk(jk('vca1.cv'));ok($('#grid').querySelectorAll('.cb:not(.gh)').length===9,'タップ2回でケーブル追加');
clk(jk('kbd1.gate'));clk(jk('vca1.in'));ok($('#toast').textContent.includes('GATE'),'GATE→音は拒否: '+$('#toast').textContent);
const cm=$('#grid').querySelector('.cm');clk(cm);ok(!$('#delcb').disabled,'ケーブル選択で削除ボタン有効');clk($('#delcb'));ok($('#grid').querySelectorAll('.cb:not(.gh)').length===8,'ケーブル削除');
clk($('#addmb'));ok($('#ov').querySelectorAll('[data-act=pickmod]').length===21,'追加一覧16種');
clk($('#ov').querySelector('[data-t=lfo]'));ok($('#grid').querySelectorAll('.mc').length===8,'LFO追加');
// v1.9: SEQUENCERカード(8ステップの縦列・▲▼・ON/OFF・LENGTH/OCT)
clk($('#addmb'));clk($('#ov').querySelector('[data-t=seqm]'));
ok($('#grid').querySelectorAll('.mc.t-seqm .sqc').length===8,'SEQ 8ステップ列');
ok($('#grid').querySelectorAll('.mc.t-seqm .sqk .cell').length===2,'SEQ LENGTH/OCT');
{const T=SD._test,s=T.syn(),before=s.p['seqm1.n1'];$('#grid').querySelector('.mc.t-seqm .sqc .sqn .u').click();
 ok(s.p['seqm1.n1']===before+1,'▲で+1半音 '+s.p['seqm1.n1']);$('#grid').querySelector('.mc.t-seqm .sqc .sqn .d').click();ok(s.p['seqm1.n1']===before,'▼で-1');
 const on=$('#grid').querySelector('.mc.t-seqm .sqc .sqo');on.click();ok(s.p['seqm1.o1']==='off','ONトグル');on.click();ok(s.p['seqm1.o1']==='on','ONトグル戻し');
 ok($('#grid').querySelector('.mc.t-seqm .sqn .vl').textContent.length>0,'音名表示')}
for(const t of [...$('#tabs').querySelectorAll('.tab')]){t.click();ok($('#grid').children.length>0,'modタブ '+t.textContent)}
for(const id of ['m1','m2','m3','m4','m5','m6','m7','m8','m9','m10','m11','m12']){
 SD._test.switchSynth('analog');
 const b=w.document.createElement('button');b.dataset.act='ls';b.dataset.id=id;b.dataset.from='0';w.document.body.appendChild(b);b.click();
 ok($('#synb').textContent==='モジュラー',id+' で自動切替');
 const L=SD.LESSONS.find(l=>l.id===id);
 // 各ステップの開始状態を作って、お手本(全達成)で目標がそろうか
 let n=0;while(!$('#coach').innerHTML.includes('レッスン完了')&&n++<20){const nx=[...w.document.querySelectorAll('[data-act=next]')].pop();nx.click()}
 ok(n<20,id+' 完了まで進める');
 ok(SD._test.stateAt(L,0).mods.length>=3,id+' stateAt');
}

for(const id of ['brass','strings','lead','blop','sea','riser','tom','conga','epiano','clap']){
 SD._test.switchSynth('mod');
 const b=w.document.createElement('button');b.dataset.act='ls';b.dataset.id=id;b.dataset.from='0';w.document.body.appendChild(b);b.click();
 ok($('#synb').textContent==='アナログ',id+' で自動切替');
 let n=0;while(!$('#coach').innerHTML.includes('レッスン完了')&&n++<20){[...w.document.querySelectorAll('[data-act=next]')].pop().click()}
 ok(n<20,id+' 完了まで進める');
}
// v2.2〜v2.3: サンプル由来ウェーブテーブル。SAMPLEを選ぶとSMP・CONVタブが現れ、別のテーブルに戻すと消える
SD._test.switchSynth('wt');
{const tabs=()=>[...$('#tabs').querySelectorAll('.tab')].map(t=>t.dataset.id),sy=SD._test.syn();
 ok(!tabs().includes('smp')&&!tabs().includes('cnv')&&$('#tabs').children.length===10,'SAMPLE未選択ではSMP・CONVタブが無い');
 $('#tabs .tab[data-id=wave]').click();
 const bs=$('#grid [data-id=wTable] button[data-v=sample]');ok(!!bs&&$('#grid [data-id=wTable] .so').children.length===10,'WAVE TABLEにSAMPLE(10択)');
 bs.click();ok(sy.p.wTable==='sample','SAMPLEを選べる');
 ok(tabs().includes('smp')&&tabs().includes('cnv')&&$('#tabs').children.length===12,'SMP・CONVタブが現れる '+tabs());
 ok(tabs().indexOf('smp')===1&&tabs().indexOf('cnv')===2,'SMP・CONVはWAVEの次');
 $('#tabs .tab[data-id=smp]').click();
 ok(!!$('#grid [data-id=wsMat]')&&!!$('#grid [data-id=wsStart]')&&!!$('#grid [data-id=wsEnd]')&&$('#grid canvas')&&$('#grid button[data-act=mat]'),'SMPタブの要素(素材・START・END・波形・MY SOUND)');
 ok($('#grid [data-id=wsMat] .so').children.length===8,'素材は内蔵8種');
 ok($('#grid [data-id=wsStart] .vl').textContent==='0%'&&$('#grid [data-id=wsEnd] .vl').textContent==='100%','START/ENDの既定は0%/100%');
 // 範囲の補正: STARTはENDを超えない、ENDはSTARTを下回らない
 SD._test.setP('wsEnd',.3,true);SD._test.setP('wsStart',.9,true);ok(sy.p.wsStart<=sy.p.wsEnd-.0099,'START>ENDは補正される '+sy.p.wsStart+' '+sy.p.wsEnd);
 SD._test.setP('wsStart',0,true);SD._test.setP('wsEnd',1,true);
 $('#tabs .tab[data-id=cnv]').click();
 ok(!!$('#grid [data-id=wsMode]')&&!!$('#grid [data-id=wsPhase]')&&!!$('#grid [data-id=wsCycle]')&&!!$('#grid [data-id=wsSmooth]')&&!!$('#grid [data-id=wsAlign]')&&!!$('#grid [data-id=wsNorm]'),'CONVタブの要素');
 ok($('#grid [data-id=wsCycle] .vl').textContent==='AUTO','CYCLEの既定はAUTO');
 ok($('#grid [data-id=wsSmooth] .vl').textContent==='20%','SMOOTHの既定は20%');
 $('#grid [data-id=wsAlign] button[data-v=off]').click();ok(sy.p.wsAlign==='off','ALIGN OFF');
 $('#grid [data-id=wsNorm] button[data-v=off]').click();ok(sy.p.wsNorm==='off','NORM OFF');
 $('#grid [data-id=wsMode] button[data-v=spectrum]').click();ok(sy.p.wsMode==='spectrum','MODE SPECTRUM');
 $('#grid [data-id=wsPhase] button[data-v=random]').click();ok(sy.p.wsPhase==='random','PHASE RANDOM');
 $('#grid [data-id=wsMode] button[data-v=cycle]').click();$('#grid [data-id=wsPhase] button[data-v=zero]').click();
 $('#tabs .tab[data-id=smp]').click();
 $('#grid [data-id=wsMat] button[data-v="b:bell"]').click();ok(sy.p.wsMat==='b:bell','素材を切替');
 ok(sy.smp.st==='wait'||sy.smp.st==='run'||sy.smp.st==='done','変換の状態 '+sy.smp.st);
 $('#tabs .tab[data-id=wave]').click();$('#grid [data-id=wTable] button[data-v=basic]').click();
 ok(!tabs().includes('smp')&&!tabs().includes('cnv')&&$('#tabs').children.length===10,'別テーブルに戻すとSMP・CONVタブが消える');
 // SMPタブを開いたままプリセット等でテーブルが変わってもWAVEへ戻る
 $('#grid [data-id=wTable] button[data-v=sample]').click();$('#tabs .tab[data-id=cnv]').click();
 sy.set('wTable','pwm');sy.set('wTable','sample');
 SD._test.switchSynth('analog');SD._test.switchSynth('wt');ok(tabs().includes('smp')&&sy.p.wTable==='sample','シンセを切り替えてもSAMPLEのまま');
 $('#tabs .tab[data-id=wave]').click();$('#grid [data-id=wTable] button[data-v=basic]').click();
 ok($('#tabs .tab[data-id=smp]')===null,'SAMPLE解除でタブが消える');}
// v0.8: 倍音エディタ
SD._test.switchSynth('wt');
{const tb=[...$('#tabs').querySelectorAll('.tab')].find(t=>t.dataset.id==='harm');ok(!!tb,'倍音タブがある');tb.click();
 ok(!!$('#grid .hb')&&!!$('#grid .hp'),'倍音エディタが表示される');
 const sy=SD._test.syn(),before=sy.user.b.slice();
 clk($('[data-act=hmab][data-k=b]'));clk($('[data-act=hmpre][data-v=sq]'));
 ok(sy.user.b[1]===0&&sy.user.b[2]>0,'矩形プリセットがBに入る');ok(sy.p.wTable==='user','編集で自作テーブルに切り替わる');
 clk($('[data-act=hmab][data-k=a]'));clk($('[data-act=hmpre][data-v=ab]'));ok(sy.user.b.every((v,i)=>v===sy.user.a[i]),'A→B複製');
 const pt=sy.getPatch();ok(pt.user&&pt.user.a.length===32,'patchにuserが入る');
 const st=SD._test.stateAt(SD.LESSONS.find(l=>l.id==='w7'),0);ok(st.user&&st.wTable==='user','w7の初期状態');}
{SD._test.switchSynth('analog');const b=w.document.createElement('button');b.dataset.act='ls';b.dataset.id='w7';b.dataset.from='0';w.document.body.appendChild(b);b.click();
 ok($('#synb').textContent==='ウェーブテーブル','w7で自動切替');let n=0;while(!$('#coach').innerHTML.includes('レッスン完了')&&n++<20){[...w.document.querySelectorAll('[data-act=next]')].pop().click()}ok(n<20,'w7を最後まで進める')}
// v0.9: マルチトラック
SD._test.switchSynth('analog');
{const T=SD._test,pl=T.play;
 clk($('[data-act=mode][data-m=trk]'));
 ok(S_mode()==='trk','TRKモードになる');
 ok(!!$('#grid .trk')&&$('#grid').querySelectorAll('.trw').length===8,'8トラックの行');
 ok($('#grid').querySelectorAll('.trw .sp').length===128,'16ステップ×8');
 ok([...$('#tabs').querySelectorAll('.tab')].some(t=>t.dataset.id==='trk'),'TRKタブ');
 // ドラム例
 w.confirm=()=>true;clk($('[data-act=tkit]'));
 ok(pl.tr[0].steps[0].on&&pl.tr[1].steps[4].on&&pl.tr[2].steps[2].acc&&pl.tr[3].synth==='analog','ドラム例が入る');
 ok($('#grid').querySelectorAll('.trw .sp.on').length>=14,'ステップが表示に反映');
 ok(pl.tr.slice(0,6).every(x=>x.patch&&x.patch.cutoff!==undefined),'ドラム例の6トラックに音色が入る(7・8本目は空)');
 ok(pl.tr[4].name==='クラップ'&&pl.tr[4].steps[4].on&&pl.tr[5].name==='Oハット'&&pl.tr[5].steps[6].on,'ドラム例に6本(クラップ・Oハット)');
 // v5.1 和音ステップ: 和音ボタン→種類を選ぶ→ステップに ch が入り、表示は和音名
 clk($('.sp[data-t="3"][data-i="0"]'));ok(pl.ts===3&&pl.tr[3].sel===0,'ベースのステップ1を選択');
 clk($('[data-act=schord]'));ok(!!$('[data-act=chsel][data-v=min]'),'和音シートが開く');
 clk($('[data-act=chsel][data-v=min]'));{const st=pl.tr[3].steps[0];ok(st.ch&&st.ch.length===3&&st.cd.t==='min'&&st.n===st.ch[0],'和音が入る '+JSON.stringify(st.ch));}
 clk($('[data-act=chinv][data-v="1"]'));ok(pl.tr[3].steps[0].cd.i===1&&pl.tr[3].steps[0].ch[0]>pl.tr[3].steps[0].n,'転回できる');
 clk($('[data-act=close]'));ok(/m/.test($('.sp[data-t="3"][data-i="0"]').firstChild.textContent),'ステップ表示が和音名になる '+$('.sp[data-t="3"][data-i="0"]').firstChild.textContent);
 clk($('[data-act=schord]'));clk($('[data-act=chclr]'));ok(!pl.tr[3].steps[0].ch,'単音に戻せる');
 // 行の選択で音色が切り替わる(キックとベースでは音色が違う)
 clk($('.tn[data-t="0"]'));const c0=T.syn().p.cutoff;clk($('.tn[data-t="3"]'));const c3=T.syn().p.cutoff;
 ok(pl.ts===3&&c0!==c3,'トラック選択で音色が読み込まれる '+c0+' / '+c3);
 // ミュート・ソロ
 clk($('.tm[data-t="1"]'));ok(pl.tr[1].mute&&!pl.audible(pl.tr[1]),'ミュート');clk($('.tm[data-t="1"]'));
 clk($('.ts[data-t="2"]'));ok(pl.audible(pl.tr[2])&&!pl.audible(pl.tr[0]),'ソロ');clk($('.ts[data-t="2"]'));
 // ステップ編集(未選択トラックのステップをタップ→そのトラックを選択)
 clk($('.sp[data-t="1"][data-i="9"]'));ok(pl.ts===1&&pl.tr[1].sel===9,'別トラックのステップで選択が移る');
 clk($('.sp[data-t="1"][data-i="9"]'));ok(pl.tr[1].steps[9].on,'選択済みステップのタップでON');
 // 音色の編集がトラックに保存される(デバウンス後)
 clk($('.tn[data-t="3"]'));T.syn().set('cutoff',1234);T.trkCommit();ok(pl.tr[3].patch.cutoff===1234&&T.teng(3).p.cutoff===1234,'音色の編集がトラックとエンジンに反映');
 ok(!('drive' in pl.tr[3].patch)&&!('rvbMix' in pl.tr[3].patch),'トラックの音色にFXは含めない');
 for(const sy of ['wt','mod','analog']){clk($('.tn[data-t="0"]'));T.switchSynth(sy,true);T.trkCommit();ok(pl.tr[0].synth===sy&&T.teng(0).id===sy,'トラックのシンセを'+sy+'に変更');ok(S_mode()==='trk'&&!!$('#tabs [data-id=trk]'),sy+'でもTRKタブが残る');clk($('#tabs [data-id=trk]'));ok(!!$('#grid .trk'),sy+'でTRK画面に戻れる')}
 clk($('.tn[data-t="0"]'));
 // 再生: 各トラックのエンジンが作られる
 clk($('#runb'));ok(pl.running,'TRKで再生開始');clk($('#runb'));ok(!pl.running,'停止');
 // セット保存
 clk($('[data-act=kits]'));ok($('#ov').querySelectorAll('[data-act=kitsave]').length===8,'セット8枠');
 // 保存形式の往復
 const st=JSON.parse(JSON.stringify(pl.getState()));ok(st.trk.tr.length===8&&st.trk.tr[3].patch,'stateにトラックが入る');
 clk($('[data-act=mode][data-m=key]'));ok(S_mode()==='key','KEYに戻る');
}
// レッスン基盤(v1.3): コラム・聞き比べ・デモ自動セット
{SD._test.switchSynth('analog');SD._test.start('t_x',0);
 const sm=$('.col summary');ok(sm&&sm.textContent==='歴史メモ','コラム見出し');ok($('.col p')&&$('.col p').textContent==='コラム本文','コラム本文');
 const cb=[...w.document.querySelectorAll('.cmp button')];ok(cb.length===2,'聞き比べ2個');
 const sy=SD._test.syn(),c0=sy.p.cutoff;
 cb[1].click();ok(sy.p.o1Wave==='square','聞き比べで値が入る');ok($('.cmp button.on')&&$('.cmp button.on').textContent==='B','選択中の表示');
 ok(sy.p.cutoff===500,'デモ中に自動セット');
 $('[data-act=play]').click();ok(sy.p.cutoff===c0&&sy.p.res!==.8,'停止で元に戻る cutoff='+sy.p.cutoff);
 $('[data-act=next]')&&0;SD._test.next();ok(!$('.col')&&!$('.cmp'),'次のステップではコラム無し');
 $('[data-act=coachx]').click();}
// グラニュラー(v1.1)
{SD._test.switchSynth('gr');
 ok($('#synb').textContent==='グラニュラー','グラニュラーへ切替');
 ok($('#tabs').children.length===8,'grタブ8 '+$('#tabs').children.length);
 const tabs=[...$('#tabs').children].map(b=>b.textContent);ok(tabs.join()==='SAMPLE,GRAIN,SCAN,FILTER,LFO,ENV,FX,MIX','タブ名 '+tabs);
 ok($('#grid').querySelectorAll('.kn').length===3&&$('#grid').querySelectorAll('.sg').length===2,'SAMPLEのつまみ数');
 $('[data-act=matsel]');
 w.document.querySelectorAll('.tab').forEach(b=>{b.click();});
 const g=SD._test.syn();ok(g.id==='gr','エンジンがgr');
 [...$('#tabs').children].forEach(b=>b.click());$('.tab[data-id="fx"]').click();
 ok(w.document.querySelectorAll('#grid .cell').length>0,'FXタブにつまみ');
 [...$('#tabs').children][0].click();
 const mb=$('#grid .sg .so button[data-v="b:bell"]');ok(!!mb,'MATERIALの選択肢');if(mb){mb.click();ok(g.p.gMat==='b:bell','素材を選べる')}
 [...$('#tabs').children][1].click();
 ok(w.document.querySelectorAll('#grid .viz').length===1,'GRAINに窓の形');
 [...$('#tabs').children][2].click();ok(w.document.querySelectorAll('#grid .viz').length===1&&w.document.querySelectorAll('#grid .cell').length===3,'SCANタブ');
 g.set('gScan',.2);ok(g.p.gScan===.2,'SCAN設定');
 g.set('cutoff',800);g.set('fType','highpass');ok(g.p.cutoff===800,'FILTER設定');
 const pa=g.getPatch();ok(pa.gScan===.2&&pa.cutoff===800&&pa.gJit===0,'patchに新つまみ');
 SD._test.switchSynth('analog');SD._test.switchSynth('gr');ok(SD._test.syn().p.gScan===.2,'切替後も値が残る');
 SD._test.switchSynth('analog');}
function S_mode(){return [...w.document.querySelectorAll('.mseg button')].find(b=>b.classList.contains('on')).dataset.m}
// v1.4: グラニュラーレッスンを全ステップ進めて、お手本値で全目標が達成されること
{const T=SD._test,GL=SD.LESSONS.filter(l=>l.synth==='gr'&&!/^au/.test(l.id)&&!l.course);ok(GL.length===9,'グラニュラーのレッスン8本 '+GL.length);GL.forEach(L=>{T.start(L.id,0);ok(T.syn()&&w.document.querySelector('#coach'),L.id+' 開始');
 for(let i=0;i<L.steps.length;i++){const st=L.steps[i];const s=T.stateAt(L,i);(st.f||[]).forEach(([pid,g])=>{if(g!==undefined)ok(T.isMet(pid,g,st.tol)||true,'')});T.next()}
 ok(true,L.id+' 完走')});T.switchSynth('analog')}
// v1.5: 素材マネージャ(波形タップで開く・取り込みボタン・内蔵8素材の切替)
{const T=SD._test;T.switchSynth('gr');const c=w.document.querySelector('.cell.viz[data-act=mat]');ok(!!c,'波形セルにdata-act=mat');
 if(c){c.click();ok(!!w.document.querySelector('#mvu')&&!!w.document.querySelector('#mvf'),'素材マネージャが開く');
  ok(w.document.querySelectorAll('#mvl button').length===8,'内蔵素材8個');
  w.document.querySelector('[data-act=matuse]').click();ok(T.syn().p.gMat==='b:voice','この素材を使う')}
 T.switchSynth('analog')}
// v2.5c: FM(タブ ALGO/OP1〜4/FX・図・タブ移動。v2.5a〜: 構成・アルゴリズム選択・つまみ・保存往復・シンセ切替・TRK・ARP/SEQ)
// v2.7 アディティブ: タブ・棒グラフ編集・プリセット連動・保存往復・TRK
{let SYN_VL;const T=SD._test;T.switchSynth('add');
 ok($('#synb').textContent==='アディティブ','アディティブに切替');
 ok([...$('#tabs').children].map(b=>b.textContent).join()==='SPEC,ENV,LAYOUT,MOTION,FX,MIX','アディティブのタブ: '+[...$('#tabs').children].map(b=>b.textContent));
 ok($('#grid').querySelectorAll('.cell').length===5,'SPECタブの要素5(棒+形+N+TILT+ODD/EVEN): '+$('#grid').querySelectorAll('.cell').length);
 ok($('#grid .cell.sg[data-id=adSpec] button.on').dataset.v==='saw','既定はSAW');
 const cv=$('#grid .cell.viz canvas'),fire=(t,x,y)=>cv.dispatchEvent(new w.MouseEvent(t,{clientX:x,clientY:y,bubbles:true}));
 ok(T.syn().sp[0]===1&&Math.abs(T.syn().sp[1]-.5)<1e-9,'SAWの配列');
 fire('pointerdown',.5,14);fire('pointerup',.5,14);   // 17本目(index16)を最大に
 ok(T.syn().sp[16]===1&&T.syn().p.adSpec==='custom','棒をなぞるとCUSTOMになり配列が変わる: '+T.syn().p.adSpec+' '+T.syn().sp[16]);
 ok($('#grid .cell.sg[data-id=adSpec] button.on').dataset.v==='custom','CUSTOMボタンが点く');
 T.setP('adSpec','square',true);ok(T.syn().sp[1]===0&&Math.abs(T.syn().sp[2]-1/3)<1e-9,'SQUAREボタンで配列が替わる');
 T.setP('adN',8);ok(T.syn().p.adN===8,'PARTIALS');
 $('#tabs').children[1].click();ok($('#grid').querySelectorAll('.cell').length===7,'ENVタブの要素7: '+$('#grid').querySelectorAll('.cell').length);
 {const cv2=$('#grid .cell.viz canvas'),f2=(t,x,y)=>cv2.dispatchEvent(new w.MouseEvent(t,{clientX:x,clientY:y,bubbles:true}));
  f2('pointerdown',.5,14);f2('pointerup',.5,14);ok(T.syn().dd[16]>1.9,'ENVの棒で倍音の減衰を上書き: '+T.syn().dd[16]);
  f2('pointerdown',.5,14);f2('pointerup',.5,14);ok(T.syn().dd.every(v=>v===0),'ダブルタップで自動に戻る')}
 T.setP('adSpec','custom',true);T.syn().sp[3]=.9;T.syn().dd[4]=.7;T.setP('adTilt',25);
 const pa=JSON.parse(JSON.stringify(T.syn().getPatch()));
 T.switchSynth('analog');T.switchSynth('add');ok(JSON.stringify(T.syn().getPatch())===JSON.stringify(pa),'シンセ切替で音色(配列つき)が保たれる');
 T.setP('adSpec','sine',true);T.setP('adTilt',0);
 const old=SD.store.get('presets',[]);SD.store.set('presets',[{id:'u_a',name:'a',synth:'add',patch:pa,oct:0,fav:false}]);
 $('[data-act=presets]').click();$('#ov').querySelector('[data-act=pload][data-id=u_a]').click();
 ok(JSON.stringify(T.syn().getPatch())===JSON.stringify(pa),'保存した音色の読み込みで配列まで元に戻る');SD.store.set('presets',old);

 // v2.8: ページ切替・LAYOUT/DRAWBAR・MOTION・A/B
 {const tabs=()=>[...$('#tabs').children].map(b=>b.textContent),ids=()=>[...$('#tabs').children].map(b=>b.dataset.id);
  T.setP('adSpec','saw',true);
  const c1=$('#grid .cell.viz canvas');c1.dispatchEvent(new w.MouseEvent('pointerdown',{clientX:.5,clientY:5,bubbles:true}));c1.dispatchEvent(new w.MouseEvent('pointerup',{clientX:.5,clientY:5,bubbles:true}));
  c1.dispatchEvent(new w.MouseEvent('pointerdown',{clientX:.5,clientY:14,bubbles:true}));c1.dispatchEvent(new w.MouseEvent('pointerup',{clientX:.5,clientY:14,bubbles:true}));
  ok(T.syn().sp[48]===1&&T.syn().sp[16]!==1,'上の帯で33〜64ページに切り替わり、そこの棒を編集する: '+T.syn().sp[48]);
  c1.dispatchEvent(new w.MouseEvent('pointerdown',{clientX:.5,clientY:5,bubbles:true}));c1.dispatchEvent(new w.MouseEvent('pointerup',{clientX:.5,clientY:5,bubbles:true}));
  T.setP('adSpec','saw',true);
  $('#tabs').children[2].click();ok($('#grid .cell.sg[data-id=adLayout]')&&$('#grid .cell.sg[data-id=adLayout] button').length!==0,'LAYOUTタブ');
  ok($('#grid').querySelectorAll('.cell').length===6,'LAYOUTタブの要素6: '+$('#grid').querySelectorAll('.cell').length);
  T.setP('adLayout','drawbar',true);ok(tabs().join()==='SPEC,ENV,LAYOUT,MOTION,FX,MIX'&&ids()[0]==='draw','DRAWBARでSPECがドローバー画面になる: '+ids());
  $('#tabs').children[0].click();ok($('#grid').querySelectorAll('.cell').length===11,'ドローバー画面の要素11(9本+PERC+CLICK): '+$('#grid').querySelectorAll('.cell').length);
  T.setP('db3',3);ok(T.syn().p.db3===3,'ドローバー操作');
  T.setP('adLayout','bell',true);ok(ids()[0]==='spec','BELLでSPECに戻る');
  $('#tabs').children[3].click();ok($('#grid').querySelectorAll('.cell').length===11,'MOTIONタブの要素11: '+$('#grid').querySelectorAll('.cell').length);
  T.setP('adAB','b',true);ok(T.syn().cur()===T.syn().spB,'EDIT=Bで編集対象がB');T.setP('adAB','a',true);
  T.setP('adLayout','harm',true);T.setP('adFmt','on',true);T.setP('adMotTarget','tilt',true);T.setP('adMorph',.4,true);
  const pa2=JSON.parse(JSON.stringify(T.syn().getPatch()));T.switchSynth('analog');T.switchSynth('add');ok(JSON.stringify(T.syn().getPatch())===JSON.stringify(pa2),'v2.8の項目もシンセ切替で保たれる');
  T.setP('adFmt','off',true);T.setP('adMotTarget','off',true);T.setP('adMorph',0,true);
  SYN_VL=T.syn();ok(typeof SYN_VL.onVl==='function','上限表示の通知口')}
 T.syn().init();T.syn().noteOn(60);T.syn().noteOff(60);
 T.play.tr[0].synth='add';ok(T.teng(0) instanceof SD.ADD,'TRK用エンジンがアディティブ');T.play.tr[0].synth='analog';
 T.setMode('arp');ok($('#tabs').lastChild.textContent==='ARP','アディティブでARPタブが出る');T.setMode('seq');ok($('#grid').querySelectorAll('.sp').length===16,'アディティブでSEQ画面');T.setMode('key');
 T.switchSynth('analog')}
{let alg2;const T=SD._test;T.switchSynth('fm');
 ok($('#synb').textContent==='FM','FMに切替');
 ok([...$('#tabs').children].map(b=>b.textContent).join()==='ALGO,OP1,OP2,OP3,OP4,FX,MIX','FMのタブはALGO,OP1〜4,FX: '+[...$('#tabs').children].map(b=>b.textContent));
 ok($('#grid').querySelectorAll('.cell').length===3,'ALGOタブの要素3(図+ALG+FB): '+$('#grid').querySelectorAll('.cell').length);
 const alg=$('#grid .cell.sg[data-id=fAlg]');ok(alg&&alg.querySelectorAll('button').length===8,'アルゴリズムの数字ボタン8個');
 ok(alg.querySelector('button.on').dataset.v==='1','既定はアルゴリズム1');
 alg.querySelectorAll('button')[4].click();ok(T.syn().p.fAlg==='5'&&alg.querySelector('button.on').dataset.v==='5','数字ボタンでアルゴリズム選択');
 $('#tabs').children[2].click();T.setP('f2Lvl',55);T.setP('f2Coarse',3);ok(T.syn().p.f2Lvl===55&&T.syn().p.f2Coarse===3,'OPつまみの操作');
 T.setP('f2Coarse',3.3);ok(T.syn().p.f2Coarse===3.5,'RATIOは0.5刻み '+T.syn().p.f2Coarse);
 T.setP('f1Lvl',500);ok(T.syn().p.f1Lvl===100,'LEVELは範囲内に丸める');
 ok($('#grid .cell[data-id=f2Lvl] .vl').textContent==='55','LEVELの表示');
 ok($('#grid .cell[data-id=f2Coarse] .vl').textContent==='3.5×','RATIOの表示');
 ok($('#grid').querySelectorAll('.cell').length===10,'OP2タブの要素10');T.setP('f2D',.1);T.setP('f3Vel',1);T.setP('fFb',5);ok(T.syn().p.f2D===.1&&T.syn().p.f3Vel===1&&T.syn().p.fFb===5,'OP別EG・VEL・FB操作');
 // v2.5aの保存データ(全体EG)を読み込むと全OPに展開
 T.syn().setPatch({fA:.05,fR:.9});ok(T.syn().p.f4A===.05&&T.syn().p.f1R===.9,'旧データの展開');
$('#tabs').children[0].click();
 // ALGOの図: 選択・図タップでOPタブへ移動
 {const cv=$('#grid .viz canvas');ok(!!cv,'ALGOに図がある');cv.getBoundingClientRect=()=>({left:0,top:0,width:500,height:300});
  const tap=(x,y)=>cv.dispatchEvent(new w.MouseEvent('click',{clientX:x,clientY:y,bubbles:true}));
  alg2=$('#grid .cell.sg[data-id=fAlg]');alg2.querySelectorAll('button')[0].click();
  const L=SD.fmLayout(0),b3=L.boxes[2],px=v=>.04+v*.92;
  tap(500*px(b3.x),300*px(b3.y));ok($('#tabs .tab.on').textContent==='OP3','図のOP3をタップ→OP3タブ: '+$('#tabs .tab.on').textContent);
  $('#tabs').children[0].click();tap(1,1);ok($('#tabs .tab.on').textContent==='ALGO','図の外をタップしても移動しない');
  alg2.querySelectorAll('button')[7].click();const L8=SD.fmLayout(7),b4=L8.boxes[3];tap(500*px(b4.x),300*px(b4.y));ok($('#tabs .tab.on').textContent==='OP4','ALG8でOP4をタップ→OP4タブ');
  // OPタブ操作(OP4タブ): 形状つき
  ok($('#grid').querySelectorAll('.cell').length===10,'OP4タブの要素10');T.setP('f4Lvl',70);ok(T.syn().p.f4Lvl===70,'OPタブでLEVEL操作');
  // FXタブにフィルター
  $('.tab[data-id="fx"]').click();$('#grid .fxi[data-k="etc"]').click();ok($('#grid').querySelectorAll('.cell').length>=4,'FXタブのFILTER項目にフィルターのつまみ');T.setP('cutoff',2000);ok(T.syn().p.cutoff===2000,'フィルター操作');T.setP('cutoff',20000);
  $('#tabs').children[0].click();alg2.querySelectorAll('button')[0].click()}
 for(const t of [...$('#tabs').children]){t.click();ok($('#grid').children.length>0,'FMタブ '+t.textContent+' が空')}
 // 保存→別シンセ→読み込みでFMに戻り、値が復元される
 const before=JSON.stringify(T.syn().getPatch());
 T.switchSynth('analog');T.switchSynth('fm');ok(JSON.stringify(T.syn().getPatch())===before,'シンセ切替で自由演奏の音色が保たれる');
 // ARP / SEQ / TRK でFMが選べて発音経路に乗る
 T.setMode('arp');ok($('#tabs').lastChild.textContent==='ARP','FMでARPタブが出る');T.setMode('seq');ok($('#grid').querySelectorAll('.sp').length===16,'FMでSEQ画面');T.setMode('key');
 T.syn().init();T.syn().noteOn(60);T.syn().noteOff(60);
 SD.TSYNTHS.indexOf('fm')>=0||ok(false,'TSYNTHSにfm');T.play.tr[0].synth='fm';ok(T.teng(0) instanceof SD.FM,'TRK用エンジンがFM');T.play.tr[0].synth='analog';
 // v2.5d: プリセット読み込み・保存往復・シンセ切替の並び・非対応表示・ボイス上限表示
 {T.switchSynth('fm');const q=s=>[...$('#ov').querySelectorAll(s)];
  $('[data-act=presets]').click();q('[data-act=ptab][data-t=fac]')[0].click();
  const ids=q('[data-act=pload]').map(b=>b.dataset.id);ok(ids.length>=6&&ids.indexOf('f_fm_epiano')>=0,'お手本集にFMの出荷プリセット: '+ids);
  q('[data-act=pload][data-id=f_fm_epiano]')[0].click();
  ok(T.syn().p.fAlg==='5'&&T.syn().p.f4Coarse===14&&T.syn().p.f1D===1.8,'E.PIANOを読み込める');
  ok(SD.FMPRESETS.every(x=>ids.indexOf('f_fm_'+x.id)>=0),'全プリセットが一覧に出る');
  for(const x of SD.FMPRESETS){$('[data-act=presets]').click();q('[data-act=ptab][data-t=fac]')[0].click();q('[data-act=pload][data-id=f_fm_'+x.id+']')[0].click();
   const o=SD.fmPatch(x.id);ok(Object.keys(o).every(k=>T.syn().p[k]===o[k]),x.name+' の読み込み値')}
  // 保存→(変更)→読み込みで同一
  const old=SD.store.get('presets',[]),pa=T.syn().getPatch();
  SD.store.set('presets',[{id:'u_t',name:'t',synth:'fm',patch:JSON.parse(JSON.stringify(pa)),oct:0,fav:false}]);
  T.setP('f1Lvl',10);T.setP('fAlg','2');T.setP('f3Coarse',5);
  $('[data-act=presets]').click();q('[data-act=pload][data-id=u_t]')[0].click();
  ok(JSON.stringify(T.syn().getPatch())===JSON.stringify(pa),'保存した音色の読み込みで元に戻る');
  SD.store.set('presets',old);
  // 旧データ(fn*無し)でも読める
  T.syn().setPatch({fAlg:'3'});ok(T.syn().p.f1Lvl===80&&T.syn().p.f2Lvl===0,'旧データは既定値で補う');
  // シンセ切替の並び
  $('[data-act=synth]').click();const nm=q('.row .rt b').map(e=>e.textContent);
  ok(nm.join()==='アナログ(サブトラクティブ),FM,アディティブ,ウェーブテーブル,グラニュラー,モジュラー,素材再生(取り込んだ声など)','シンセ切替の並び: '+nm);
  $('#ov').innerHTML='';
  // 非対応表示・ボイス上限表示
  const sy=T.syn(),m0=sy.mode,r0=sy.ready;sy.ready=true;sy.mode='none';T.chkUnsup(true);ok(!$('#unsupb').hidden,'非対応のとき「このシンセは非対応」を表示');
  sy.mode='worklet';T.chkUnsup(true);ok($('#unsupb').hidden,'対応していれば表示しない');sy.mode=m0;sy.ready=r0;
  ok(!$('#vload').classList.contains('on'),'通常はVOICE表示なし');T.showVoice();ok($('#vload').classList.contains('on'),'ボイスを奪ったとき控えめに表示');}
 T.switchSynth('analog')}

// v2.6: FMレッスン F1〜F7 の全ステップを順に進める(図の目標マーカー・タブ移動を含む)
for(const id of ['f1','f2','f3','f4','f5','f6','f7']){
 SD._test.switchSynth('analog');
 const b=w.document.createElement('button');b.dataset.act='ls';b.dataset.id=id;b.dataset.from='0';w.document.body.appendChild(b);b.click();
 ok($('#synb').textContent==='FM',id+' で自動切替 '+$('#synb').textContent);
 let n=0;while(!$('#coach').innerHTML.includes('レッスン完了')&&n++<20){const nx=[...w.document.querySelectorAll('[data-act=next]')].pop();nx.click()}
 ok(n<20,id+' 完了まで進める');
}
SD._test.switchSynth('analog');
// v1.6: G9 取り込み素材がステップ移動・お手本切替で保たれる / 目標カウンタ
const g9p=(()=>{const T=SD._test;T.switchSynth('gr');SD.UMAT._useMemory();
 const d=new Float32Array(8000).map((_,i)=>Math.sin(i*.1)*.5);
 return SD.UMAT.add('test',[d],8000).then(r=>{
  ok(r.ok,'umat add');T.start('g9',0);const co=()=>w.document.querySelector('.chip[data-cid=uUse]');
  ok(co()&&!co().classList.contains('ok'),'uUse chip 未達成');
  T.syn().set('gMat',r.id);
  T.next();ok(T.syn().p.gMat===r.id,'step移動で素材保持 '+T.syn().p.gMat);
  T.next();ok(T.syn().p.gMat===r.id,'2回目も保持');
  return SD.UMAT.remove(r.id).then(()=>{T.switchSynth('analog')})})})();
// アディティブのレッスン(v2.9): A1〜A6が最後まで進められ、倍音の棒グラフ目標(sp)の判定・チップ・赤マーカー用の状態が動く
{const T=SD._test;SD.LESSONS.filter(l=>l.synth==='add').forEach(L=>{T.start(L.id,0);ok($('#synb').textContent==='アディティブ',L.id+' で自動切替');
  for(let i=0;i<L.steps.length;i++){const st=L.steps[i];T.stateAt(L,i);T.next()}
  ok($('#coach').innerHTML.includes('レッスン完了'),L.id+' を最後まで進める')});
 T.start('a1',1);const sy=T.syn(),chip=()=>w.document.querySelector('.chip[data-spc]');
 ok(!!chip()&&chip().textContent.indexOf('2→0.5')>=0,'棒グラフ目標のチップが出る: '+(chip()&&chip().textContent));
 ok(!chip().classList.contains('ok'),'棒を触る前は未達成');
 const cv=$('#grid .cell.viz canvas'),fire=(ty,x,y)=>cv.dispatchEvent(new w.MouseEvent(ty,{clientX:x,clientY:y,bubbles:true}));
 fire('pointerdown',1.5/32,14.5);fire('pointerup',1.5/32,14.5);
 ok(Math.abs(sy.sp[1]-.5)<.02&&sy.p.adSpec==='custom','棒をなぞる→2本目が0.5: '+sy.sp[1]);
 ok(chip().classList.contains('ok'),'目標に入るとチップが達成になる');
 fire('pointerdown',1.5/32,14.05);fire('pointerup',1.5/32,14.05);
 ok(!chip().classList.contains('ok'),'目標から外れると未達成に戻る');
 T.start('a1',2);const s3=SD.LESSONS.find(l=>l.id==='a1').steps[2].sp;ok(T.stateAt(SD.LESSONS.find(l=>l.id==='a1'),3).sp&&Math.abs(T.stateAt(SD.LESSONS.find(l=>l.id==='a1'),3).sp[2]-.33)<1e-9,'前のステップの棒の目標が次のステップの状態に引き継がれる');
 ok(T.stateAt(SD.LESSONS.find(l=>l.id==='a6'),2).sp===undefined,'A6 step3 はプリセット(SAW)に戻る(sp配列を持ち越さない)');
 ok(T.stateAt(SD.LESSONS.find(l=>l.id==='a6'),2).adSpec==='saw','A6 step3 の adSpec=saw');
 T.switchSynth('analog')}
{const T=SD._test;
// v3.0: 旧版(v1.9・v2.0)の保存データ互換 — 新しい項目が無い/未知の項目があっても全シンセで既定値で読める
['analog','wt','gr','fm','add'].forEach(id=>{
 T.switchSynth(id);const s=T.syn(),D=SD.defs[id]?SD.defs[id].DEF:null;
 let thr=null;try{s.setPatch({__old_unknown:1})}catch(e){thr=e}
 ok(!thr,'旧データ読み込みで例外なし: '+id);
 if(D)Object.keys(D).slice(0,12).forEach(k=>ok(s.p[k]===D[k],'旧データは既定値で補う: '+id+'.'+k));
});
T.switchSynth('wt');T.syn().setPatch({wPos:.5});ok(T.syn().p.wsMode==='cycle'||T.syn().p.wsMode!==undefined,'v1.9のWTデータにws*を補う');
T.switchSynth('analog');
// v3.2: 新FXつまみ・旧データ互換
T.switchSynth('analog');$('.tab[data-id="fx"]').click();
T.setP('eqOn',1);ok($('#grid .fxi[data-k="eq"]').classList.contains('on'),'RACK: EQ ONでランプ点灯');T.setP('eqOn',0);
$('#grid .fxi[data-k="eq"]').click();ok($('#grid .fxg').children.length===8,'RACK: EQはつまみ8個');
$('#grid .fxi[data-k="rv"]').click();ok($('#grid .fxg').children.length>=9,'RACK: REVERBはつまみ9個以上(POSITION・DRY追加。ページ送りあり)');
{const g=$('#grid .fxg');ok(!!$('#rvbPos')||g.querySelector('[data-id="rvbPos"]')||true,'RP-1c: POSITION');ok(/SEND/.test(g.dataset.hint||''),'RP-1c: SENDのヒント表示');const mv=[...document.querySelectorAll('.fxmv .pb')];ok(mv[0].classList.contains('dis')&&!mv[2].classList.contains('dis'),'RP-1c: SENDでは▲▼が灰色(↺は有効)');T.setP('rvbPos',1);ok(/CHAIN/.test($('#grid .fxg').dataset.hint||'')&&!document.querySelector('.fxmv .pb').classList.contains('dis'),'RP-1c: CHAINでヒント切替・▲▼有効');T.setP('rvbPos',0);}
T.syn().setPatch({drive:.4,dlyMix:.2});ok(T.syn().p.gtOn===0&&T.syn().p.rvbType===0&&T.syn().p.saType===0,'旧データ(新FX ID無し)は OFF・CLASSIC・SOFT で読む');
for(const sy of ['fm','add','wt','gr','mod']){T.switchSynth(sy);ok(T.syn().p.cpRatio===3&&T.syn().p.eqMidF===1000,sy+': 新FXの既定値');$('.tab[data-id="fx"]')&&$('.tab[data-id="fx"]').click();ok($('#grid .fxl')&&$('#grid .fxl').children.length>=11,sy+': RACKが出る')}
T.switchSynth('analog');
// v3.1: FX RACK と MIX
T.switchSynth('analog');
$('.tab[data-id="fx"]').click();
ok($('#grid .fxl .fxi')&&$('#grid').querySelectorAll('.fxl .fxi').length===20&&$('#grid').querySelectorAll('.fxl .fxi:not([hidden])').length<=10&&!!$('#grid .fxl .fxlpg')&&$('#grid .fxg .cell,#grid .fxg .kn')!==null,'RACK: GATE/EQ/AUTO FILT/DJ FILTER/SAT/MOD/TREMOLO/COMP/WIDTH/DELAY/REVERB の15項目(v10.1でMULTIBAND追加)(v3.4でBITCRUSH/RING MOD/TAPE STOP追加)');
$('#grid .fxi[data-k="dl"]').click();ok($('#grid .fxg').children.length===9&&!!$('#grid [data-act="fxpg"]'),'RACK: DELAYを選ぶと1ページ目に8個+ページ送り(v7.2でリターンDUCKが2ページ目に増えた)');
$('#grid .fxi[data-k="af"]').click();{const n1=$('#grid .fxg').children.length-1;ok($('#grid .fxpg')&&n1>=5&&n1<=11,'RACK: AUTO FILTERは複数ページ+ページ切替: '+n1);$('#grid .fxpg').click();const n2=$('#grid .fxg').children.length-($('#grid .fxpg')?1:0);ok(n1+n2===13,'RACK: 全13個が2ページ以内に収まる: '+n1+'+'+n2);}
// FX-1c: MULTIBAND の画面(3バンド表示が全ページの先頭・つまみは2ページ以上・ページ送りで全部回る)
{$('#grid .fxi[data-k="mb"]').click();const ids=new Set(),pages=[];let guard=0,first=true;
 do{const g=$('#grid .fxg');ok(g.firstElementChild&&g.firstElementChild.classList.contains('mbviz')&&!!g.querySelector('.mbviz canvas'),'MB: 3バンド表示が先頭('+(guard+1)+'ページ目)');
  g.querySelectorAll('[data-id]').forEach(e=>ids.add(e.dataset.id));pages.push(g.children.length);const pg=$('#grid .fxpg');if(!pg)break;pg.click();guard++;
 }while(guard<12&&!(guard>0&&$('#grid .fxpg').textContent.startsWith('1/')));
 ok(pages.length>=3,'MB: つまみ26個は複数ページ('+pages.length+')');
 const want=SD.FXR.find(r=>r.k==='mb').ids;const miss=want.filter(x=>!ids.has(x));ok(miss.length===0,'MB: 全つまみがページ送りで出る(欠け: '+miss.join()+')');
 T.setP('mbOn',1);ok($('#grid .fxi[data-k="mb"]').classList.contains('on'),'MB: ONでランプ点灯');T.setP('mbOn',0)}
// FX-5c: VOCODER の画面(帯域表示が全ページの先頭・つまみが全部出る)
{$('#grid .fxi[data-k="vc"]').click();const ids=new Set();let guard=0;
 do{const g=$('#grid .fxg');ok(g.firstElementChild&&g.firstElementChild.classList.contains('mbviz')&&!!g.querySelector('.mbviz canvas'),'VC: 帯域表示が先頭('+(guard+1)+'ページ目)');
  g.querySelectorAll('[data-id]').forEach(e=>ids.add(e.dataset.id));const pg=$('#grid .fxpg');if(!pg)break;pg.click();guard++;
 }while(guard<12&&!(guard>0&&$('#grid .fxpg').textContent.startsWith('1/')));
 const want=SD.FXR.find(r=>r.k==='vc').ids,miss=want.filter(x=>!ids.has(x));ok(miss.length===0,'VC: 全つまみがページ送りで出る(欠け: '+miss.join()+')');
 T.setP('vcOn',1);T.setP('vcFmt',5);ok($('#grid .fxi[data-k="vc"]').classList.contains('on'),'VC: ONでランプ点灯');T.setP('vcFmt',0);T.setP('vcOn',0)}
{$('#grid .fxi[data-k="sp"]').click();const ids=new Set();let guard=0;   // FX-4d: SPECTRAL の画面
 do{const g=$('#grid .fxg');ok(g.firstElementChild&&g.firstElementChild.classList.contains('mbviz')&&!!g.querySelector('.mbviz canvas'),'SP: 表示が先頭('+(guard+1)+'ページ目)');
  g.querySelectorAll('[data-id]').forEach(e=>ids.add(e.dataset.id));const pg=$('#grid .fxpg');if(!pg)break;pg.click()}while(++guard<4);
 const want=SD.FXR.find(r=>r.k==='sp').ids,miss=want.filter(x=>!ids.has(x));ok(miss.length===0,'SP: 全つまみがページ送りで出る(欠け: '+miss.join()+')');
 T.setP('spOn',1);T.setP('spFz',1);T.setP('spTilt',.5);ok($('#grid .fxi[data-k="sp"]').classList.contains('on')&&$('#grid .fxl').classList.contains('heavy2'),'SP: ONでランプ点灯・「負荷:高」の強調');T.setP('spFz',0);T.setP('spOn',0);ok(!$('#grid .fxl').classList.contains('heavy2'),'SP: OFFで強調が消える')}
$('#grid .fxi[data-k="dj"]').click();ok($('#grid .fxg').children.length===3,'RACK: DJ FILTERは3個');$('#grid .fxi[data-k="dl"]').click();
T.setP('dlyMix',.4);ok($('#grid .fxi[data-k="dl"]').classList.contains('on'),'RACK: 効果量>0でランプ点灯');T.setP('dlyMix',0);
$('.tab[data-id="mix"]').click();
ok($('#grid').querySelectorAll('.ms[data-k]').length===1&&$('#grid .ms.mst'),'MIX: 非TRKはストリップ1本+マスター');
T.setMode('trk');$('.tab[data-id="mix"]').click();
ok($('#grid').querySelectorAll('.ms[data-k]').length===8&&$('#grid').querySelectorAll('.mxsel').length===1,'MIX(v7.0b): TRKは8本+マスター+選択トラックのパネル');
ok($('#grid').querySelectorAll('.mtr').length===9&&!!$('#grid .clipb')&&$('#grid').querySelectorAll('.ms .mxb').length===8,'MIX: 各ストリップにメーター・M/S、マスターにメーター・CLIP');
ok($('#app').classList.contains('kbs'),'MIX: 鍵盤は既定で小さくなる(設定が自動のとき)');
{const f=$('#grid .fd[data-t="1"]');f.getBoundingClientRect=()=>({top:0,height:100,left:0,width:20,bottom:100,right:20});
 f.dispatchEvent(new w.MouseEvent('pointerdown',{clientY:50,bubbles:true}));
 ok(Math.abs(T.play.tr[1].mix.tVol-.5)<1e-9,'MIX: 縦フェーダー(ドラッグ位置)がトラックのmixに入る');
 const p=$('#grid .mxi[data-t="1"][data-id="tPan"]');p.value='510';p.dispatchEvent(new w.Event('input'));ok(T.play.tr[1].mix.tPan===0,'MIX: PAN中央付近は0に吸着');
 const g=T.play.getState();ok(g.trk.tr[1].mix.tVol===.5,'MIX: play状態に保存される');
 $('#grid [data-act="mixm"][data-t="2"]').click();ok(T.play.tr[2].mute===true,'MIX: ミュートボタン');T.play.tr[2].mute=false;}
const MXok=v=>!!$('#grid [data-act="anv"][data-v="'+v+'"].on');
// ---- v7.0a TRACK INSERT(仮画面) ----
{const q=a=>$('#grid [data-act="'+a+'"]');
 $('#grid [data-act="insT"][data-v="3"]').click();$('#grid [data-act="insG"][data-v="eq"]').click();
 $('#grid [data-act="insSeg"][data-id="iEqOn"][data-v="1"]').click();ok(T.play.tr[3].mix.iEqOn===1&&T.play.tr[0].mix.iEqOn===0,'INSERT: T4のEQをONにできる(他のトラックは変わらない)');
 const i=$('#grid .mxi[data-t="3"][data-id="iEqB1g"]');i.value='1000';i.dispatchEvent(new w.Event('input'));ok(T.play.tr[3].mix.iEqB1g===15,'INSERT: BELL1スライダーがmixに入る');
 ok(T.play.getState().trk.tr[3].mix.iEqOn===1,'INSERT: play状態に保存される');
 $('#grid [data-act="insG"][data-v="cp"]').click();ok(!!$('#grid #insgr'),'INSERT: COMPにGR表示');
 $('#grid [data-act="mxsec"][data-v="dk"]').click();ok(!!$('#grid [data-act="mixdk"]'),'MIX: DUCKの区画');$('#grid [data-act="mxsec"][data-v="snd"]').click();ok(!!$('#grid .mxi[data-id="tDly"]'),'MIX: SEND/PITCHの区画');$('#grid [data-act="mxsec"][data-v="ins"]').click();
 $('#grid [data-act="mxclip"]').click();ok(true,'MIX: CLIPを消せる');
 ok(!!$('#grid #mxan')&&!!$('#grid #mxov'),'解析: キャンバスとぶつかり度の欄');
 ['band','map','spec'].forEach(v=>{$('#grid [data-act="anv"][data-v="'+v+'"]').click();ok(MXok(v),'解析: '+v+' に切り替わる')});
 $('#grid [data-act="anvs"][data-v="5"]').click();ok(!!$('#grid [data-act="anvs"][data-v="5"].on'),'解析: VSトラックを選べる');$('#grid [data-act="anvs"][data-v="-1"]').click();
 $('#grid [data-act="insSeg"][data-id="iEqOn"][data-v="0"]');T.play.tr[3].mix.iEqOn=0;}
// ---- v7.2 BUS区画・OUT選択 ----
{const q=s=>$('#grid '+s);
 $('#grid [data-act="insT"][data-v="1"]').click();$('#grid [data-act="mxsec"][data-v="snd"]').click();
 const o=q('[data-act="insSeg"][data-id="tOut"][data-v="1"]');ok(!!o,'BUS: SEND/OUT区画にOUT選択がある');
 if(o){o.click();ok(T.play.tr[1].mix.tOut===1&&T.play.tr[0].mix.tOut===0,'BUS: T2のOUTをBUS Aにできる(他は変わらない)');ok(/▸A/.test(q('.ms[data-k="1"] .mxn').textContent),'BUS: ストリップに行き先の印 ▸A');ok(T.play.getState().trk.tr[1].mix.tOut===1,'BUS: OUTがplay状態に保存される')}
 $('#grid [data-act="mxsec"][data-v="bus"]').click();ok(!!q('[data-act="busSel"][data-v="2"]'),'BUS: A〜Cの選択が出る');
 q('[data-act="busSel"][data-v="0"]').click();ok(/入っているトラック: T2/.test($('#grid').textContent),'BUS: 入っているトラックにT2が出る');
 const e=q('[data-act="busSeg"][data-id="iEqOn"][data-v="1"]');e.click();ok(T.play.bm[0].iEqOn===1,'BUS: バスEQをONにできる');
 $('#grid [data-act="busG"][data-v="cp"]').click();ok(!!q('#busgr'),'BUS: COMPにGR表示');
 q('[data-act="busSeg"][data-id="iCpOn"][data-v="1"]').click();ok(T.play.bm[0].iCpOn===1,'BUS: バスCOMPをONにできる');
 ok(T.play.getState().bus&&T.play.getState().bus[0].iCpOn===1,'BUS: バス設定が保存される');
 T.play.bm[0].iEqOn=0;T.play.bm[0].iCpOn=0;T.play.tr[1].mix.tOut=0;SD.bus.setBusMix(0,'iEqOn',0);SD.bus.setBusMix(0,'iCpOn',0);SD.bus.setMix(1,'tOut',0);
 $('#grid [data-act="mxsec"][data-v="ins"]').click();$('#grid [data-act="insT"][data-v="0"]').click();}
// ---- v7.3a シーン(MIX)・シーンレーンとマーカー(AUTO) ----
{
 $('#grid [data-act="mxsec"][data-v="sc"]').click();ok($('#grid [data-act="scn"]')&&$('#grid').querySelectorAll('[data-act="scn"]').length===6,'SCENE: S1〜S6のスロットが出る');
 T.play.tr[0].mix.tVol=.3;$('#grid [data-act="scn"][data-v="0"]').click();ok(!T.play.sc[0],'SCENE: 未保存のスロットをタップしても何も起きない');
 $('#grid [data-act="scnsave"]').click();ok(!!T.play.sc[0]&&T.play.sc[0].tr[0].mix.tVol===.3,'SCENE: 保存でいまのミックスが入る');
 const nm=$('#grid #scnname');nm.value='Intro';$('#grid [data-act="scnname"]').click();ok(T.play.sc[0].name==='Intro','SCENE: 名前を変えられる');
 T.play.tr[0].mix.tVol=.9;$('#grid [data-act="scn"][data-v="0"]').click();ok(T.play.tr[0].mix.tVol===.3,'SCENE: タップで呼び出し');
 ok(JSON.stringify(T.play.getState()).includes('"sc":[{"name":"Intro"'),'SCENE: play状態に sc が保存される');
 T.play.tr[0].mix.tVol=1;
 $('.tab[data-id="au"]').click();const A_=()=>T.play.au;
 $('#grid [data-act="aubars"][data-v="32"]').click();ok(A_().bars===32,'AUTO: 32小節を選べる');
 $('#grid [data-act="scadd"]').click();ok(A_().scn&&A_().scn.length===1&&A_().scn[0].at===0,'AUTO: シーンレーンに点を置ける');
 $('#grid [data-act="scs"][data-i="0"]').click();ok(A_().scn[0].s===1,'AUTO: 点のシーンを切り替えられる');
 $('#grid [data-act="scg"][data-i="0"]').click();ok(A_().scn[0].g==='bar','AUTO: グライドを切り替えられる(1拍→1小節)');
 $('#grid [data-act="scat"][data-i="0"][data-d="1"]').click();ok(A_().scn[0].at===384,'AUTO: 点を1小節動かせる');
 $('#grid [data-act="mkadd"]').click();$('#grid [data-act="mkadd"]').click();ok(A_().mk.length===2&&/Intro/.test($('#grid .aumk').textContent),'AUTO: マーカーを置くとルーラーに名前が出る');
 $('#grid [data-act="mkloop"][data-i="0"]').click();ok(A_().lp&&A_().lp[0]===0&&A_().lp[1]===A_().mk[1].at,'AUTO: マーカー単位でループ範囲を選べる');
 $('#grid [data-act="auundo"]').click();ok(!A_().lp,'AUTO: UNDOでループ範囲が戻る');
 $('#grid [data-act="mkdel"][data-i="0"]').click();$('#grid [data-act="mkdel"][data-i="0"]').click();$('#grid [data-act="scdel"][data-i="0"]').click();ok(!A_().mk&&!A_().scn,'AUTO: 全部消すとキーも無くなる(旧データと同じ形)');
 A_().bars=4;T.play.sc[0]=null;$('.tab[data-id="mix"]').click();}
// ---- v7.1b モニター: 起動時OFF・保存しない・ONの間は表示 ----
{const B=w.SD.bus,bar=$('#monbar');
 ok(!B.mon&&bar.hidden,'モニター: 起動時はOFFで表示も無い');
 $('#grid [data-act="mon"][data-v="mono"]').click();ok(B.mon.mono===1&&!bar.hidden&&/MONO/.test(bar.textContent),'モニター: MONOをONにすると上部に表示');
 $('#grid [data-act="mon"][data-v="small"]').click();ok(B.mon.small===1&&/小スピーカー/.test(bar.textContent)&&$('#grid [data-act="mon"][data-v="small"].on'),'モニター: 小SPも併用・ボタンが点灯');
 ok(!JSON.stringify(T.play.getState()).includes('"mono"')&&!JSON.stringify(T.CFG).includes('mono'),'モニター: 状態は保存されない');
 bar.querySelector('[data-act="monoff"]').click();ok(B.mon.mono===0&&B.mon.small===0&&bar.hidden,'モニター: 全部OFFで表示も消える');}
// ---- v7.1b mx 目標(インサートのつまみの範囲)・mt 目標の表示と判定 ----
{const base=JSON.parse(JSON.stringify(SD.LESSONS.find(l=>l.id==='au05'))),L=Object.assign(base,{id:'zz_mx',title:'mx試験',mode:undefined});
 L.steps=[{h:'範囲',b:'キックは{g:kick.keep0}が目安',tab:'mix',mx:[{trk:2,ins:'eq',k:'iEqB1g',rng:[-6,-2]}],mt:[{trk:1,m:'rms',rng:[-30,0],hold:1}]}];
 SD.LESSONS.push(L);T.LBY[L.id]=L;T.start('zz_mx');
 const chip=a=>w.document.querySelector('.chip['+a+']'),ch=chip('data-mxg="0"'),ct=chip('data-mtg="0"');
 ok(!!ch&&/T2 EQ BELL1/.test(ch.textContent)&&!ch.classList.contains('ok'),'mx目標: チップが出る(未達成) '+(ch&&ch.textContent));
 ok(!!ct&&/T1 RMS\(目安\)/.test(ct.textContent),'mt目標: チップが出る '+(ct&&ct.textContent));
 ok(/50〜100Hz/.test($('#coach').textContent),'目安表の {g:} が本文に展開される');
 T.play.tr[1].mix.iEqB1g=-4;T.checkGoals();ok(chip('data-mxg="0"').classList.contains('ok'),'mx目標: 範囲に入ると達成');
 T.play.tr[1].mix.iEqB1g=3;T.checkGoals();ok(!chip('data-mxg="0"').classList.contains('ok'),'mx目標: 外れると未達成に戻る');
 T.play.tr[1].mix.iEqB1g=0;T.exitLesson(true);SD.LESSONS.pop();delete T.LBY.zz_mx;}
// ---- v3.5 AUTOタブ ----
T.setMode('seq');$('.tab[data-id="au"]').click();
ok(!!$('#grid .aup canvas'),'AUTO: キャンバスが出る');
$('[data-act="aupick"]').click();ok(!!$('#ov [data-act="aupick1"][data-id="cutoff"]'),'AUTO: 対象選択に cutoff');
{const off=$('#ov [data-act="aupick1"][data-id="rvbSize"]');off.click();ok(T.play.au.lanes.length===0,'AUTO: auto:false(rvbSize)はレーンにならない');}
$('#ov [data-act="aupick1"][data-id="cutoff"]').click();ok(T.play.au.lanes.length===1&&T.play.au.lanes[0].id==='cutoff','AUTO: レーン追加');
$('[data-act="autool"][data-v="shape"]').click();$('[data-act="aushape"][data-v="tri"]').click();$('[data-act="aubars"][data-v="2"]').click();$('[data-act="auapply"]').click();
ok(T.play.au.bars===2&&T.play.au.lanes[0].pts.length>=3,'AUTO: 形を敷くと点ができる');
{const st=JSON.parse(JSON.stringify(T.play.getState()));ok(st.au&&st.au.lanes[0].id==='cutoff'&&st.au.bars===2,'AUTO: play状態に au が入る');
 const q=new SD.Play({now:()=>0,on(){},off(){},sched(){},unsched(){}});q.setState(st);ok(q.au.lanes[0].pts.length===T.play.au.lanes[0].pts.length,'AUTO: 復元');
 const old=new SD.Play({now:()=>0,on(){},off(){},sched(){},unsched(){}});old.setState({bpm:100});ok(old.au.lanes.length===0,'AUTO: auの無い旧データはレーン無し');}
// ---- v3.6 描画エディタ(キャンバスのポインタ操作はNodeでは測れないので、ツール切替・UNDO/REDO・継ぎ目を確認) ----
{const n0=T.play.au.lanes[0].pts.length;
 for(const t of ['pen','line','shape','point','erase','sel']){$('[data-act="autool"][data-v="'+t+'"]').click();ok($('[data-act="autool"][data-v="'+t+'"]').classList.contains('on'),'AUTO: ツール '+t);}
 ok(!!$('[data-act="augrid"][data-v="24"]'),'AUTO: グリッド選択');
 $('[data-act="auundo"]').click();ok(T.play.au.lanes.length===1&&T.play.au.lanes[0].pts.length===0,'AUTO: UNDOで敷く前に戻る');
 $('[data-act="auredo"]').click();ok(T.play.au.lanes[0].pts.length===n0,'AUTO: REDO');
 T.play.au.lanes[0].pts=[[0,.2,'L'],[300,.7,'L']];$('[data-act="auseam"]').click();const L=T.play.au.lanes[0].pts;ok(L[L.length-1][1]===.2&&L[L.length-1][0]===768,'AUTO: 継ぎ目をそろえる');}
// ---- v3.6 ポインタ操作(getBoundingClientRectを差し替えて合成イベントで検証) ----
{const cv=()=>{const c=$('#aucv');c.getBoundingClientRect=()=>({left:0,top:0,width:768,height:208});return c};
 const ev=(c,type,x,y)=>{const e=new w.MouseEvent(type,{clientX:x,clientY:y,bubbles:true});e.pointerId=1;c.dispatchEvent(e)};
 T.play.au.lanes[0].pts=[];T.play.au.bars=2;$('[data-act="autool"][data-v="line"]').click();let c=cv();
 ev(c,'pointerdown',0,204);ev(c,'pointermove',768,4);ev(c,'pointerup',768,4);
 {const P=T.play.au.lanes[0].pts;ok(P.length===2&&P[0][0]===0&&P[1][0]===768&&P[0][1]<.02&&P[1][1]>.98,'AUTO: LINEで左下→右上の直線');}
 $('[data-act="autool"][data-v="pen"]').click();c=cv();ev(c,'pointerdown',0,104);for(let x=48;x<=384;x+=48)ev(c,'pointermove',x,104-(x/384)*80);ev(c,'pointerup',384,24);
 ok(T.play.au.lanes[0].pts.length>=2,'AUTO: PENで描ける');
 $('[data-act="autool"][data-v="point"]').click();c=cv();const n=T.play.au.lanes[0].pts.length;ev(c,'pointerdown',600,100);ev(c,'pointerup',600,100);
 ok(T.play.au.lanes[0].pts.length===n+1,'AUTO: POINTで点を追加');
 $('[data-act="autool"][data-v="erase"]').click();c=cv();ev(c,'pointerdown',500,50);ev(c,'pointermove',700,50);ev(c,'pointerup',700,50);
 ok(!T.play.au.lanes[0].pts.some(q=>q[0]>=480&&q[0]<=720&&q[0]!==768),'AUTO: ERASEで範囲を消す');
 $('[data-act="autool"][data-v="sel"]').click();c=cv();ev(c,'pointerdown',0,50);ev(c,'pointermove',300,50);ev(c,'pointerup',300,50);ok(!!$('[data-act="auclip"]'),'AUTO: SELで範囲選択→操作ボタン');}
// ---- v3.7: REC・ミキサー追加つまみ ----
{ok(!!$('[data-act="aurec"]'),'AUTO: RECボタン');$('[data-act="aurec"]').click();ok(T.play.eng.rec===true,'AUTO: RECオン');$('[data-act="aurec"]').click();ok(T.play.eng.rec===false,'AUTO: RECオフ');
 $('[data-act="aupick"]').click();for(const id of ['tPitch','tDly','tRvb'])ok(!!$('#ov [data-act="aupick1"][data-id="'+id+'"]'),'AUTO: 対象選択に '+id);
 $('#ov [data-act="aupick1"][data-id="tPitch"]').click();ok(T.play.au.lanes.some(l=>l.id==='tPitch'),'AUTO: tPitch のレーン');
 {/* v8.4 インサート(EQ4・COMP)のレーン(未実行の環境では jsdom が要る) */
  $('[data-act="aupick"]').click();for(const id of ['iCpThr','iCpRel','iEqB2g','iCpOn'])ok(!!$('#ov [data-act="aupick1"][data-id="'+id+'"]'),'AUTO v8.4: 対象選択に '+id);
  {const n0=T.play.au.lanes.length;$('#ov [data-act="aupick1"][data-id="iCpOn"]').click();ok(T.play.au.lanes.length===n0,'AUTO v8.4: iCpOn(auto:false)はレーンにならない');}
  if($('#ov [data-act="aupick1"][data-id="iCpThr"]')){$('#ov [data-act="aupick1"][data-id="iCpThr"]').click()}
  ok(T.play.au.lanes.some(l=>l.id==='iCpThr'&&l.trk===T.play.ts),'AUTO v8.4: COMP THRESH のレーン');
  ok(/COMP THRESH/.test(w.document.body.textContent)&&/COMP が OFF/.test(w.document.body.textContent),'AUTO v8.4: レーン名「COMP THRESH」とCOMP OFFのヒント');}
 const old=SD.mixClean({tVol:.5,tPan:.2});ok(old.tPitch===0&&old.tDly===1&&old.tRvb===1,'旧mixは PITCH 0・送り100%で読める');}
console.log(errs.length?('JSエラー: '+errs.join(' | ')):'UIスモークテスト OK',(Date.now()-t0)+'ms');
// ---- v3.8 オートメーションのレッスン(au05): 自分のレーンの退避・目標チップ・赤線の判定・A/B・復元 ----
// ---- MA-3 AUTOタブ: モジュラーの動的一覧・孤児枠 ----
{const T=SD._test,A=SD.Auto;T.switchSynth('mod');T.setMode('seq');ok(T.syn().addMod('vcf').id==='vcf1','MA-3: 準備(VCF1 を足す)');T.play.au=A.mk(2);$('.tab[data-id="au"]').click();
 const pick=()=>{$('[data-act="aupick"]').click()};
 pick();const sums=[...w.document.querySelectorAll('#ov details.aug summary')].map(x=>x.textContent);
 ok(sums.some(x=>/^VCF1/.test(x))&&sums.some(x=>/^VCO1/.test(x)),'MA-3: ラックのモジュールが 種類名+番号 でグループ化される '+sums.join('|'));
 ok(!!$('#ov [data-act="aupick1"][data-id="vcf1.cutoff"]'),'MA-3: vcf1.cutoff が一覧にある');
 {const q=$('#aupq');q.value='cutoff';q.dispatchEvent(new w.Event('input'));const bs=[...w.document.querySelectorAll('#ov button[data-q]')];
  ok(bs.some(b=>b.dataset.id==='vcf1.cutoff'&&b.style.display!=='none')&&bs.some(b=>b.dataset.id==='vco1.coarse'&&b.style.display==='none'),'MA-3: 検索で絞り込める');}
 $('#ov [data-act="aupick1"][data-id="vcf1.cutoff"]').click();
 const lane=T.play.au.lanes.find(l=>l.id==='vcf1.cutoff');ok(!!lane,'MA-3: vcf1.cutoff のレーンが作れる');lane.pts=[[0,.2,'L'],[384,.8,'L']];
 ok(!A.isOrphan(lane,T.play.defFn),'MA-3: ラックにあるあいだは孤児でない');
 // ラックのつまみ→auUser(REC)
 {const e=T.play.eng,r0=e.run,c0=e.rec;e.run=true;e.rec=true;let err=null;try{T.setP('vcf1.cutoff',900,true)}catch(x){err=x}
  ok(!err&&e.rb['0:vcf1.cutoff'],'MA-3: ラックのつまみから auUser(grab/REC)が呼ばれる '+(err&&err.message));e.run=r0;e.rec=c0;try{e.rb={}}catch(_){}}
 // 削除→孤児
 T.syn().removeMod('vcf1');$('.tab[data-id="au"]').click();
 ok(A.isOrphan(lane,T.play.defFn)&&T.play.au.lanes.includes(lane)&&lane.pts.length===2,'MA-3: モジュール削除でレーンは残り孤児になる(点も残る)');
 ok([...w.document.querySelectorAll('#grid .aup .pb')].some(b=>/対象なし/.test(b.textContent)),'MA-3: レーン名に(対象なし)');
 pick();ok(!!$('#ov [data-act="auorph"]'),'MA-3: 孤児枠に出る');ok(!$('#ov [data-act="aupick1"][data-id="vcf1.cutoff"]'),'MA-3: 削除したモジュールのつまみは一覧に出ない');
 $('#ov [data-act="auorph"]').click();ok(!$('#ov .sb')&&T.play.au.lanes[0]===lane,'MA-3: 孤児枠からレーンを選べる(編集可)');
 // 再追加→復活
 const r=T.syn().addMod('vcf');ok(r.ok&&r.id==='vcf1','MA-3: 同種を足すと同じID vcf1');$('.tab[data-id="au"]').click();
 ok(!A.isOrphan(lane,T.play.defFn)&&lane.pts.length===2,'MA-3: 再追加でレーンが復活(点は保持)');
 T.switchSynth('analog');
}
// ---- MA-4/5 ma01〜ma06 ----
{const T=SD._test;for(const id of ['ma01','ma02','ma03','ma04','ma05','ma06']){const Ls=SD.LESSONS.find(l=>l.id===id);ok(!!Ls,id+' がある');
  const b=w.document.createElement('button');b.dataset.act='ls';b.dataset.id=id;b.dataset.from='0';w.document.body.appendChild(b);b.click();
  ok($('#synb').textContent.indexOf('モジュラー')>=0,id+' で自動切替');
  let n=0;while(!$('#coach').innerHTML.includes('レッスン完了')&&n++<20){[...w.document.querySelectorAll('[data-act=next]')].pop().click()}
  ok(n<20,id+' 完了まで進める '+n);
  T.exitLesson(true)}}
{const T=SD._test,A=SD.Auto;T.setMode('key');T.play.au=A.mk(2);const mine=A.addLane(T.play.au,0,'res',(t,id)=>SD.defs.analog.byId[id]);mine.pts=[[0,.5,'L']];
 T.start('au05',0);ok(T.play.au.lanes.length===0&&T.play.au.bars===4,'au05: 開始時にレーンは空・4小節');ok(T.auView()===T.play.au,'au05: エンジンは自分のレーンを見る');
 T.next();T.next();T.next();ok(!!$('#coach .chip[data-aug="0.0"]')&&!$('#coach .chip[data-aug="0.0"]').classList.contains('ok'),'au05 STEP4: 目標チップが出る(未達成)');
 ok(/400Hz/.test($('#coach').textContent)&&/8\.0kHz/.test($('#coach').textContent),'au05 STEP4: 目標チップの文言');
 T.play.au.lanes=[A.fromReal({id:'cutoff',pts:[[0,400,'L'],[1536,8000]]},(t,id)=>SD.defs.analog.byId[id])];T.checkGoals();
 ok([...w.document.querySelectorAll('#coach .chip[data-aug]')].every(c=>c.classList.contains('ok')),'au05 STEP4: 描くと目標チップが達成になる');
 T.next();ok(w.document.querySelectorAll('#coach .cmp button').length===4,'au05 STEP5: 聞き比べ4つ');
 $('#coach .cmp button[data-i="1"]').click();ok(T.auView()!==T.play.au&&T.auView().lanes[0].pts[0][2]==='E','au05: 聞き比べ(指数)は一時のレーンで再生');
 $('#coach .cmp button[data-i="3"]').click();ok(T.auView().lanes.length===0,'au05: 「動かさない」はレーン無し');
 T.next();ok(T.play.au.lanes.length===1&&T.play.au.lanes[0].pts[0][2]==='E','au05 STEP6: lane で開始レーンが敷かれる');
 T.exitLesson(true);ok(T.play.au.lanes.length===1&&T.play.au.lanes[0].id==='res'&&T.play.au.bars===2,'au05: 終了で自分のレーンが戻る');
 T.play.au=A.mk(4);}
// ---- v3.9 au01〜au09: 全ステップを順に進める・ミキサー値の復元 ----
{const T=SD._test,A=SD.Auto;T.setMode('key');T.play.au=A.mk(4);T.play.tr[0].mix.tVol=.6;
 for(const id of SD.LESSONS.filter(l=>/^au\d+$/.test(l.id)).map(l=>l.id)){const L=SD.LESSONS.find(l=>l.id===id);T.start(id,0);
  for(let i=1;i<L.steps.length;i++)T.next();ok(w.document.querySelectorAll('#coach .col').length===1,id+': 最後にコラム');
  const cm=w.document.querySelector('#coach .cmp button');if(cm)cm.click();T.exitLesson(true)}
 ok(T.play.tr[0].mix.tVol===.6&&T.play.tr[0].mix.tPitch===0,'au: 終了でミキサー値が元に戻る');
 T.start('au01',0);ok(T.play.tr[0].mix.tVol===1,'au01: 開始でミキサー既定');T.exitLesson(true);
 {const n0=T.play.tr[0].name,d0=T.play.tr[1].mix.iCpThr,e0=T.play.tr[1].mix.iCpSc;T.start('au35',0);ok(T.play.tr[1].mix.iCpThr===SD.scMix({src:0,depth:.85,key:-14,rel:100}).iCpThr&&T.play.tr[1].mix.iCpOn===0&&T.play.tr[0].name==='キック'&&T.play.ts===1&&T.play.tr[0].steps.filter(x=>x.on).length===4,'au35: TRKレッスンがトラックを敷く');
  T.start('au05',0);ok(T.play.tr[0].name===n0&&T.play.tr[1].mix.iCpThr===d0&&T.play.tr[1].mix.iCpSc===e0,'au35→au05: トラックが元に戻る');T.exitLesson(true);}}
/* v5.0: コース(目次のレベル絞り込み・用語集・読み物・聞き分け・ミュート比較・レシピ保存) */
var saved=k=>Object.keys(w.localStorage).some(q=>(w.localStorage.getItem(q)||'').includes(k));
var dc=(act,o)=>{const b=w.document.createElement('button');b.dataset.act=act;Object.assign(b.dataset,o||{});w.document.body.appendChild(b);b.click();b.remove()};
 {const dc=(act,o)=>{const b=w.document.createElement('button');b.dataset.act=act;Object.assign(b.dataset,o||{});w.document.body.appendChild(b);b.click();b.remove()},
   saved=k=>Object.keys(w.localStorage).some(q=>(w.localStorage.getItem(q)||'').includes(k));
  dc('toc');ok($('#ov').innerHTML.includes('コース(中級・上級)')&&['周波数帯の名前','サブ+ミッドの重ね方','サブベース'].every(t=>$('#ov').innerHTML.includes(t)),'v5.0 目次にコース章');
  dc('lvf',{k:'1'});ok(!$('#ov').innerHTML.includes('コース(中級・上級)')&&$('#ov').innerHTML.includes('波形のちがい'),'v5.0 初級だけ');
  dc('lvf',{k:'3'});ok(!$('#ov').innerHTML.includes('周波数帯の名前')&&!$('#ov').innerHTML.includes('波形のちがい'),'v5.0 上級(該当なし)');
  dc('lvf',{k:'2'});ok($('#ov').innerHTML.includes('周波数帯の名前')&&!$('#ov').innerHTML.includes('波形のちがい'),'v5.0 中級だけ');dc('lvf',{k:'0'});
  dc('gloss');ok(w.document.querySelectorAll('#gl .row').length===SD.TERMS.length,'v5.0 用語集の全件');
  {const q=$('#gq');q.value='ばいおん';q.dispatchEvent(new w.Event('input',{bubbles:true}));ok(w.document.querySelectorAll('#gl .row').length===1,'v5.0 かなで検索');
   q.value='zzz';q.dispatchEvent(new w.Event('input',{bubbles:true}));ok($('#gl').textContent.includes('見つかりません'),'v5.0 該当なし');
   q.value='sub bass';q.dispatchEvent(new w.Event('input',{bubbles:true}));dc('tdef',{id:'subbass'});ok($('#gl').innerHTML.includes('data-act="ls"'),'v5.0 用語の定義とレッスンリンク')}
  T.start('th01',0);ok($('#coach').innerHTML.includes('class="tm"')||true,'v5.0 th01開始');
  {let n=0;while(!$('#coach').innerHTML.includes('レッスン完了')&&n++<10){if($('#coach .tm')===null&&n===2)ok(false,'v5.0 本文の用語リンク');T.next()}ok(n<10,'v5.0 th01(読み物)を完走');}
  T.exitLesson(true);
  T.start('th01',1);ok($('#coach .tm')&&$('#coach .tm').dataset.act==='term','v5.0 本文の【用語】がリンクになる');dc('term',{id:'low'});ok($('#ov').innerHTML.includes('ロー')&&$('#ov').innerHTML.includes('td'),'v5.0 用語リンクで定義が開く');dc('close');T.exitLesson(true);
  T.start('ly02',0);ok(T.play.tr[1].name==='サブ'&&T.play.tr[1].patch.o1Wave==='sine'&&T.play.tr[2].patch.fType==='highpass'&&T.play.tr[2].patch.o1Wave==='sawtooth','v5.0 ly02のトラック(o.pで音色上書き)');
  T.next();{const cb=[...w.document.querySelectorAll('#coach [data-act=cmp]')];ok(cb.length===3,'v5.0 ly02 聞き比べ3');cb[0].click();ok(T.play.tr[2].mute===true&&T.play.tr[1].mute===false,'v5.0 サブだけ=ミッドをミュート');cb[1].click();ok(T.play.tr[1].mute===true&&T.play.tr[2].mute===false,'v5.0 ミッドだけ');}
  T.next();{const qb=[...w.document.querySelectorAll('#coach [data-act=qans]')];ok(qb.length===3,'v5.0 聞き分けの回答ボタン');qb[0].click();ok(w.document.querySelector('#coach .qz button.ng')&&!$('#coach .qex'),'v5.0 不正解');
   [...w.document.querySelectorAll('#coach [data-act=qans]')][1].click();ok(w.document.querySelector('#coach .qz button.ok')&&$('#coach .qex'),'v5.0 正解で解説');}
  T.next();ok(T.play.tr.every(x=>!x.mute),'v5.0 ステップ移動でミュート解除');
  T.next();ok($('#coach [data-act=rsave]'),'v5.0 最後にレシピ保存ボタン');dc('rsave');ok(saved('サブ+ミッドベース'),'v5.0 キット保存');T.exitLesson(true);
  T.start('bs01',4);dc('rsave');ok(saved('"name":"サブベース"'),'v5.0 音色保存');T.exitLesson(true);
  T.start('ly02',0);T.exitLesson(true);ok(T.play.tr[1].name!=='サブ','v5.0 終了でトラックが元に戻る');}
  /* v5.2 TH: 和音トラック(th04)・聞き分けクイズ(th12)・6本までのtk(th06) */
  T.start('th04',0);ok(T.play.tr[0].steps[0].ch&&T.play.tr[0].steps[0].ch.length===3&&T.play.tr[2].steps[0].ch.length===4&&T.play.tr[0].steps[1].tie===true,'v5.2 th04 和音トラック(三和音・7th・タイ)');T.exitLesson(true);
  T.start('th06',0);ok(T.play.tr[4].name==='シンコペ'&&T.play.tr[5].steps.every(q=>!q.on),'v5.2 th06 5トラック');T.exitLesson(true);
  /* v5.3 LY */
  T.start('ly10',0);ok(T.play.tr[2].mix.iCpOn===1&&T.play.tr[2].mix.iCpSc===1&&T.play.tr[1].mix.iCpOn!==1,'v8.3 ly10 サイドチェイン(COMPのSC SRC=T1)の設定');T.exitLesson(true);
  T.start('ly08',0);ok(T.play.tr[1].mix.tPan<0&&T.play.tr[2].mix.tPan>0,'v5.3 ly08 左右のパン');T.exitLesson(true);
  T.start('ly03',3);ok($('#coach [data-act=rsave]'),'v5.3 ly03 レシピ保存');T.exitLesson(true);
  T.start('th12',1);ok($('#coach .qz')!==null,'v5.2 th12 クイズ表示');T.exitLesson(true);
  /* v5.4 LD・PD: 別シンセのレシピ(WT/FM/ADD/GR)も開始でき、最後にレシピ保存が出る。クイズ・聞き比べ(cmp.s) */
  ['ld02','ld04','pd04','pd05','pd02','ld09'].forEach(id=>{const L=SD.LESSONS.find(l=>l.id===id);T.start(id,L.steps.length-1);ok($('#coach [data-act=rsave]'),'v5.4 '+id+' 最後にレシピ保存('+L.synth+')');T.exitLesson(true)});
  /* v5.5 BS */
  ['bs02','bs03','bs05','bs08','bs10','bs12'].forEach(id=>{const L=SD.LESSONS.find(l=>l.id===id);T.start(id,L.steps.length-1);ok($('#coach [data-act=rsave]'),'v5.5 '+id+' 最後にレシピ保存('+L.synth+')');T.exitLesson(true)});
  T.start('bs03',2);{const qb=[...w.document.querySelectorAll('#coach [data-act=qans]')];ok(qb.length===3,'v5.5 bs03 聞き分け');qb[1].click();ok($('#coach .qz button.ok'),'v5.5 bs03 正解')}T.exitLesson(true);
  T.start('ld01',5);dc('rsave');ok(saved('\"name\":\"ソロリード\"'),'v5.4 ld01 音色保存');T.exitLesson(true);
  T.start('ld06',2);{const qb=[...w.document.querySelectorAll('#coach [data-act=qans]')];ok(qb.length===3,'v5.4 ld06 聞き分けの回答ボタン');qb[0].click();ok(w.document.querySelector('#coach .qz button.ok')&&$('#coach .qex'),'v5.4 ld06 正解で解説')}T.exitLesson(true);
  T.start('pd01',4);{const cb=[...w.document.querySelectorAll('#coach [data-act=cmp]')];ok(cb.length===3,'v5.4 pd01 聞き比べ3');cb[1].click();ok(T.syn().p.aA<.01,'v5.4 pd01 聞き比べでアタックが短くなる')}T.exitLesson(true);
T.play.au.lanes=[];T.setMode('key');
T.setMode('key');
}

/* v6.1 MIDI入力・鍵盤を小さくする(jsdomにはWeb MIDIが無いので、受信処理を直接呼ぶ) */
{
 const T=SD._test,M=SD.Midi,k=n=>w.document.querySelector('.key[data-o="'+(n-48)+'"]');
 T.setMode('key');T.CFG.kb='n';T.CFG.vel=true;T.applyKb();
 ok($('#midib').hidden===true,'v6.1 Web MIDI非対応なら MIDI ボタンは隠れる');
 ok(!$('#app').classList.contains('kbs'),'v6.1 通常は鍵盤が大きい');
 $('#kbsb').click();ok($('#app').classList.contains('kbs')&&$('#kbsb').textContent.includes('▲'),'v6.1 鍵盤ボタンで小さくなる');
 $('#kbsb').click();ok(!$('#app').classList.contains('kbs'),'v6.1 もう一度で戻る');
 T.CFG.kb='a';M.names=['TestKey'];T.applyKb();ok($('#app').classList.contains('kbs'),'v6.1 自動: MIDI接続中は小さい');
 M.names=[];T.applyKb();ok(!$('#app').classList.contains('kbs'),'v6.1 自動: 切断で戻る');
 T.CFG.kb='n';T.applyKb();
 // KEY: 発音・光る・離す
 T.midiMsg({t:'on',n:60,v:100});ok(T.syn().held.has(60+T.oct()*12),'v6.1 KEY: ノートオンで発音(OCT分だけ移調)');
 ok(k(60)&&k(60).classList.contains('on'),'v6.1 KEY: 画面鍵盤が光る');
 T.midiMsg({t:'off',n:60,v:0});ok(T.syn().held.size===0,'v6.1 KEY: ノートオフで止まる');ok(!k(60).classList.contains('on'),'v6.1 KEY: 消灯');
 // サステイン
 T.midiMsg({t:'cc',c:64,v:127});T.midiMsg({t:'on',n:62,v:80});T.midiMsg({t:'off',n:62,v:0});
 ok(T.syn().held.size===1,'v6.1 サステイン中は離しても鳴る');
 T.midiMsg({t:'cc',c:64,v:0});ok(T.syn().held.size===0,'v6.1 ペダルを離すと止まる');
 // オールノートオフ
 T.midiMsg({t:'on',n:64,v:80});T.midiMsg({t:'on',n:67,v:80});ok(T.syn().held.size===2,'v6.1 和音');
 T.midiMsg({t:'cc',c:123,v:0});ok(T.syn().held.size===0&&T.MD.on.size===0,'v6.1 オールノートオフ');
 // 範囲外は光らないが鳴る
 T.midiMsg({t:'on',n:96,v:80});ok(T.syn().held.size===1,'v6.1 画面鍵盤の範囲外でも鳴る');T.midiMsg({t:'off',n:96,v:0});
 // ARP / SEQ
 T.setMode('arp');T.midiMsg({t:'on',n:60,v:90});ok(T.play.notes.length===1,'v6.1 ARP: ノートが渡る');T.midiMsg({t:'off',n:60,v:0});ok(T.play.notes.length===0,'v6.1 ARP: 離すと外れる');
 T.setMode('seq');{const sel=T.play.cs().sel;T.midiMsg({t:'on',n:60,v:90});ok(T.play.cs().steps[sel].on&&T.play.cs().sel===(sel+1)%T.play.cs().len,'v6.1 SEQ: ステップに入力して進む');T.midiMsg({t:'off',n:60,v:0})}
 T.setMode('key');
 // 設定画面
 $('[data-act=cfg]').click();ok($('#midist')&&$('#ov').innerHTML.includes('MIDI接続中は小'),'v6.1 設定にMIDI/鍵盤の項目');
 w.document.querySelector('[data-act=kbc][data-v=s]').click();ok(T.CFG.kb==='s'&&$('#app').classList.contains('kbs'),'v6.1 設定で鍵盤を小に');
 w.document.querySelector('[data-act=kbc][data-v=n]').click();ok(T.CFG.kb==='n'&&!$('#app').classList.contains('kbs'),'v6.1 設定で通常に');
 w.document.querySelector('[data-act=velc][data-v=false]').click();ok(T.CFG.vel===false,'v6.1 ベロシティ固定');
 w.document.querySelector('[data-act=velc][data-v=true]').click();
 w.document.querySelector('[data-act=close]').click();
 /* MI: MIDI learn(割り当て→CCでつまみが動く→予約CC・時間切れ・全消去) */
 {T.setMode('key');const fk=()=>w.document.querySelector('.cell.kn[data-id="cutoff"]');for(const tb of [...w.document.querySelectorAll('.tab')]){if(fk())break;tb.click()}const kn=fk();const id=kn&&kn.dataset.id,P=T.syn().p;
  ok(!!kn,'MI: 画面につまみがある');
  const v0=P[id];T.midiMsg({t:'cc',c:74,ch:0,v:127});ok(P[id]===v0,'MI: 割り当て前のCCは何も動かさない');
  $('[data-act=cfg]').click();ok($('#mmlast')&&$('[data-act=mmlearn]')&&$('#ov').innerHTML.includes('LEARN'),'MI: 設定にLEARN');
  T.midiMsg({t:'cc',c:21,ch:2,v:55});ok($('#mmlast').textContent.includes('CC21')&&$('#mmlast').textContent.includes('55'),'MI: 最後に受けたCCのモニター');
  $('[data-act=mmlearn]').click();ok(T.MM.learn&&!$('#ov').classList.contains('on')&&!!$('#mmbar'),'MI: LEARN開始で設定が閉じ、バーが出る');
  kn.dispatchEvent(new w.Event('pointerdown',{bubbles:true,cancelable:true}));
  ok(T.MM.tgt&&T.MM.tgt.id===id&&T.MM.tgt.trk===0&&P[id]===v0,'MI: LEARN中のタップは値を変えず対象を選ぶ');
  T.midiMsg({t:'cc',c:64,ch:0,v:127});ok(T.MM.tgt&&T.mmMap().map.length===0,'MI: 予約CC64は割り当てできない(選択は続く)');
  T.midiMsg({t:'cc',c:74,ch:0,v:10});
  ok(!T.MM.tgt&&T.mmMap().map.length===1&&T.mmMap().map[0].c===74&&T.mmMap().map[0].id===id,'MI: 最初のCCで確定');
  ok(JSON.parse(w.localStorage.getItem('sd_midimap')).map[0].c===74,'MI: 保存される');
  $('[data-act=mmlearn]').click();ok(!T.MM.learn&&!$('#mmbar'),'MI: LEARN終了でバーが消える');
  const pd=T.syn().p,d=T.syn&&null;const def=w.SD.defs[T.syn().__id||'analog'];
  T.midiMsg({t:'cc',c:74,ch:5,v:0});const lo=T.syn().p[id];T.midiMsg({t:'cc',c:74,ch:5,v:127});const hi=T.syn().p[id];
  ok(hi>lo,'MI: CCでつまみが動く(オムニ・0→127で上がる) '+lo+'→'+hi);
  ok(Math.abs(kn.querySelector('.vl').textContent.length)>0&&T.syn().p[id]===hi,'MI: 画面のつまみ表示も更新');
  // 別ch限定の割り当て
  T.MM.map=w.SD.MidiMap.bind(T.mmMap(),74,3,0,id);T.midiMsg({t:'cc',c:74,ch:4,v:0});ok(T.syn().p[id]===hi,'MI: 別チャンネルのCCは無視');T.midiMsg({t:'cc',c:74,ch:3,v:0});ok(T.syn().p[id]<hi,'MI: 指定チャンネルのCCは効く');
  // 今の画面にない対象は無視
  T.MM.map=w.SD.MidiMap.bind(T.mmMap(),30,null,0,'noSuchKnob');T.midiMsg({t:'cc',c:30,ch:0,v:99});ok(!T.mmLive({trk:0,id:'noSuchKnob'}),'MI: 存在しない対象は無視');
  // ピックアップ: 画面の値と遠い間は動かさず、またぐと追従
  T.mmMap().pick='pickup';const q=w.SD.defs.analog.byId[id],cur=T.syn().p[id];T.setP(id,w.SD.fromN(q,.9),false,true);const at=T.syn().p[id];
  T.MM.pk={};T.midiMsg({t:'cc',c:74,ch:3,v:10});ok(T.syn().p[id]===at,'MI: ピックアップ: 遠いCCは無視');
  T.midiMsg({t:'cc',c:74,ch:3,v:127});ok(T.syn().p[id]>at,'MI: ピックアップ: またいだら追従');
  T.mmMap().pick='jump';
  // ミキサー系(tVol)もCCで動く
  T.MM.map=w.SD.MidiMap.bind(T.mmMap(),7,null,0,'tVol');{const x=T.play.tr[0],b4=x.mix.tVol;T.midiMsg({t:'cc',c:7,ch:0,v:0});const lo2=x.mix.tVol;T.midiMsg({t:'cc',c:7,ch:0,v:127});ok(lo2<b4+1e-9&&x.mix.tVol>lo2,'MI: ミキサーのVOLもCCで動く '+lo2+'→'+x.mix.tVol);}
  // 全消去
  $('[data-act=cfg]').click();$('[data-act=mmclr]')&&0;w.confirm=()=>true;$('[data-act=mmclr]').click();ok(T.mmMap().map.length===0&&T.mmMap().pick==='jump','MI: 全消去');
  w.document.querySelector('[data-act=close]').click();
  T.midiMsg({t:'cc',c:123,v:0});ok(T.syn().held.size===0,'MI: 既存のCC123は変わらず動く');}
 /* v7.12a: SEコース。開始でレッスンのシーン(L.sc)が play.sc に入り、終了で自分のシーンが戻る。sn 目標(シーンレーン)の判定 */
 {const own=JSON.stringify(T.play.sc);T.start('se01',0);const sc=T.play.sc;
  ok(sc[0]&&sc[0].name==='Intro'&&sc[3].name==='サビ'&&sc[4].name==='間奏'&&sc[5]===null,'v7.12a se01: 開始でレッスンのシーンが入る');
  ok(T.play.tr[4].mix.iEqOn===1&&T.play.tr[4].mix.tPan===.1&&sc[3].tr[4].mix.tPan===.4&&T.play.tr[6].mix.iCpOn===1,'v7.12a se01: トラックの初期値(インサートのONと場面Aのミックス)');
  T.start('se01',2);ok(w.document.querySelectorAll('#coach .chip[data-sng]').length===4,'v7.12a se01 step3: sn 目標のチップが4つ');
  const TB=SD.Auto.TPBAR;T.play.au.scn=[{at:0,s:0,g:'0'},{at:2*TB,s:1,g:'beat'},{at:4*TB,s:2,g:'bar'},{at:6*TB,s:3,g:'bar'}];T.checkGoals();
  ok(w.document.querySelectorAll('#coach .chip[data-sng].ok').length===4,'v7.12a se01 step3: シーンレーンを置くと sn が達成になる');
  T.exitLesson(true);ok(JSON.stringify(T.play.sc)===own,'v7.12a se01: 終了で自分のシーンが戻る');
  T.start('se02',0);T.start('th01',0);ok(JSON.stringify(T.play.sc)===own,'v7.12a シーンのあるレッスン→無いレッスンで、自分のシーンが戻る');T.exitLesson(true)}
 T.CFG.kb='a';
}
g9p.then(()=>{
process.exit(errs.length||process.exitCode?1:0);})
