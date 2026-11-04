// データ整合性テスト: node test/validate.js
const fs=require('fs'),path=require('path'),vm=require('vm');
const w=path.join(__dirname,'..','www','js');
const ctx={window:{},console};ctx.window=ctx;vm.createContext(ctx);
['params.js','wtparams.js','mat.js','umat.js','swtparams.js','grparams.js','fmparams.js','addparams.js','modlib.js','mixdefs.js','fxnew.js','fxparams.js','seq.js','drums.js','meter.js','auto.js','lessons.js','lessons2.js','wtlessons.js','seqlessons.js','modlessons.js','grlessons.js','fmlessons.js','addlessons.js','aulessons.js','course.js','th.js','ly.js','ldpd.js','bs.js','plsq.js','fxl.js','mbl.js','psl.js','rvl.js','gll.js','spl.js','vcl.js','cxl.js','auk.js','mt.js','ad.js','gn1.js','gn2.js','gn3.js','hs.js','voice.js','eq.js','cm.js','ef.js','pn.js','fq.js','vo.js','mx.js','se.js','ms.js','ma.js'].forEach(f=>vm.runInContext(fs.readFileSync(path.join(w,f),'utf8'),ctx,{filename:f}));
const SD=ctx.SD;let err=0;const bad=m=>{console.error('NG: '+m);err++};
let nP=0;const NEWFX=new Set(SD.FXP.map(p=>p.id));
Object.keys(SD.defs).forEach(sy=>{const D=SD.defs[sy],ids=new Set();nP+=D.P.length;
D.T.forEach(t=>{t.items.forEach(i=>{if(i.indexOf('v_')!==0&&!D.byId[i])bad(sy+' tab '+t.id+' 未定義つまみ '+i)});
 if(t.at)Object.keys(t.at).forEach(i=>{if(t.items.indexOf(i)<0)bad(sy+' tab '+t.id+' at未登録 '+i)})});
D.P.forEach(p=>{if(p.tab!=='top'&&!D.T.some(t=>t.id===p.tab))bad(sy+' '+p.id+' tab不明 '+p.tab);if(p.tab!=='top'&&!D.T.find(t=>t.id===p.tab).items.includes(p.id))bad(sy+' '+p.id+' がタブに無い');
 if(ids.has(p.id))bad(sy+' 重複 '+p.id);ids.add(p.id);
 if(p.type==='knob'){if(!(p.min<p.max))bad(p.id+' 範囲');if(p.def<p.min||p.def>p.max)bad(p.id+' 既定値が範囲外');if(!p.help)bad(p.id+' help無し')}
 else{if(!p.opts.some(o=>o[0]===p.def))bad(p.id+' 既定値がoptsに無い')}});});
// サンプル由来WT(v2.2): ws*はSMPタブに属し、SMPタブは SAMPLE 選択時だけ出る
{const W=SD.defs.wt,smp=W.T.find(t=>t.id==='smp');if(!smp||!smp.only||smp.only.wTable!=='sample')bad('SMPタブの表示条件');
 W.P.forEach(p=>{if(/^ws[A-Z]/.test(p.id)!==(p.tab==='smp'||p.tab==='cnv'))bad('ws*とSMPタブの対応 '+p.id)});
 if(!W.byId.wTable.opts.some(o=>o[0]==='sample'))bad('WAVE TABLEにSAMPLEが無い');
 const mats=W.byId.wsMat.opts.map(o=>o[0]);if(mats.length!==8||SD.MAT.ids.some(id=>mats.indexOf(id)<0))bad('wsMatの選択肢が内蔵8素材と一致しない');
 if(SD.fmt(W.byId.wsCycle,W.byId.wsCycle.def)!=='AUTO'||SD.fmt(W.byId.wsCycle,.02)!=='20ms')bad('wsCycleの表示(AUTO/ms)');
 if(W.byId.wsCycle.min>=.005||W.byId.wsCycle.max!==.1)bad('wsCycleの範囲(AUTO〜100ms)');
 // v2.3: MODE/PHASE/START/END/SMOOTH
 const eq=(id,tab,def)=>{const p=W.byId[id];if(!p||p.tab!==tab||p.def!==def)bad(id+' の定義(タブ/既定値)')};
 eq('wsMode','cnv','cycle');eq('wsPhase','cnv','zero');eq('wsStart','smp',0);eq('wsEnd','smp',1);eq('wsSmooth','cnv',.2);
 if(W.byId.wsMode.opts.map(o=>o[0]).join()!=='cycle,spectrum'||W.byId.wsPhase.opts.map(o=>o[0]).join()!=='zero,keep,random')bad('wsMode/wsPhaseの選択肢');
 if(SD.fmt(W.byId.wsStart,0)!=='0%'||SD.fmt(W.byId.wsEnd,1)!=='100%'||SD.fmt(W.byId.wsSmooth,.2)!=='20%')bad('START/END/SMOOTHの表示(%)');
 const cn=W.T.find(t=>t.id==='cnv');if(!cn||!cn.only||cn.only.wTable!=='sample')bad('CONVタブの表示条件');
 W.T.filter(t=>t.id==='smp'||t.id==='cnv').forEach(t=>t.items.forEach(i=>{if(!/^v_/.test(i)&&W.byId[i].tab!==t.id)bad(t.id+'タブの項目 '+i);if(!t.at[i])bad(t.id+'タブの配置 '+i)}));
 W.P.filter(p=>/^ws[A-Z]/.test(p.id)).forEach(p=>{if(!W.DEF.hasOwnProperty(p.id)||!W.byId[p.id])bad('ws*の登録 '+p.id)})}
// FM(v2.5c): fAlg / fn* のID・範囲・既定値・タブ配置(IDは最後まで変えない。タブは ALGO/OP1〜4/FX)
{const M=SD.defs.fm,eq=(id,tab,def)=>{const p=M.byId[id];if(!p||p.tab!==tab||p.def!==def)bad(id+' の定義(タブ/既定値)')};
 eq('fAlg','algo','1');if(M.byId.fAlg.opts.map(o=>o[0]).join()!=='1,2,3,4,5,6,7,8')bad('fAlgの選択肢は1〜8');
 if(M.byId.fAlg.opts.length!==SD.FMALGS.length)bad('fAlgの選択肢数とアルゴリズム表が違う');
 for(let n=1;n<=4;n++){eq('f'+n+'Coarse','op'+n,1);eq('f'+n+'Fine','op'+n,0);eq('f'+n+'Det','op'+n,0);eq('f'+n+'Lvl','op'+n,n===1?80:0);
  const c=M.byId['f'+n+'Coarse'],l=M.byId['f'+n+'Lvl'];if(c.min!==.5||c.max!==16||c.step!==.5)bad('f'+n+'Coarseの範囲');if(l.min!==0||l.max!==100)bad('f'+n+'Lvlの範囲')}
 eq('fFb','algo',0);if(M.byId.fFb.min!==0||M.byId.fFb.max!==7||M.byId.fFb.step!==1)bad('fFbの範囲(0〜7)');
 for(let n=1;n<=4;n++){eq('f'+n+'A','op'+n,.002);eq('f'+n+'D','op'+n,.4);eq('f'+n+'S','op'+n,.7);eq('f'+n+'R','op'+n,.2);eq('f'+n+'Vel','op'+n,.5)}
 ['fA','fD','fS','fR'].forEach(i=>{if(M.byId[i])bad('旧全体EG '+i+' が残っている')});
 if(SD.FMMIG({fA:.1}).f4A!==.1)bad('旧全体EGの展開');
 if(M.T.map(t=>t.id).join()!=='algo,op1,op2,op3,op4,fx')bad('FMのタブは ALGO,OP1〜4,FX');
 M.T.forEach(ft=>{if(ft.id.indexOf('op')===0&&ft.items.length!==10)bad(ft.id+'タブは10個(5つまみ+ADSR+形状)');
  ft.items.forEach(i=>{if(!ft.at[i])bad(ft.id+'タブの配置 '+i);if(i.indexOf('v_')!==0&&!M.byId[i])bad(ft.id+'タブの未定義ID '+i);if(i.indexOf('v_')!==0&&ft.id!=='fx'&&M.byId[i]&&M.byId[i].tab!==ft.id)bad(i+' のtabが '+ft.id+' でない')});
  const cells=new Set();ft.items.filter(i=>!NEWFX.has(i)).forEach(i=>{const[c,r]=ft.at[i];const c0=parseInt(c),sp=/span (\\d+)/.exec(c)?+/span (\\d+)/.exec(c)[1]:1,r0=parseInt(r),rs=/span (\\d+)/.exec(r)?+/span (\\d+)/.exec(r)[1]:1;for(let k=0;k<sp;k++)for(let q=0;q<rs;q++){const key=(c0+k)+','+(r0+q);if(cells.has(key))bad(ft.id+'タブ 配置の重なり '+key);cells.add(key);if(c0+k>ft.cols||r0+q>ft.rows)bad(ft.id+'タブ 配置が枠外 '+i)}})});
 /* 目標マーカー(図の赤字)に使うID(アルゴリズム・OPの比率とレベル)が定義済み */
 ['fAlg','fFb'].concat([1,2,3,4].reduce((a,n)=>a.concat(['f'+n+'Coarse','f'+n+'Lvl']),[])).forEach(i=>{if(!M.byId[i])bad('目標マーカー用IDが未定義 '+i)});
 /* FXタブ: フィルター(fType/cutoff/res)とFX、タブはfx */
 ['fType','cutoff','res','drive','rvbMix'].forEach(i=>{if(!M.byId[i]||M.byId[i].tab!=='fx')bad(i+' はFXタブ')});
 if(SD.fmt(M.byId.f1Coarse,2)!=='2.0×'||SD.fmt(M.byId.f1Fine,5)!=='+5%'||SD.fmt(M.byId.f1Det,-10)!=='-10ct')bad('FMの表示形式');
 SD.FXIDS=SD.FXIDS||[];['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'].forEach(i=>{if(!M.byId[i])bad('FMにFXの '+i+' が無い')});
 if(!SD.SYNTHS.find(s=>s.id==='fm')||SD.TSYNTHS.indexOf('fm')<0)bad('シンセ一覧/TRKにFMが無い')}
// アディティブ(v2.7): ad* のID・範囲・既定値・タブ配置(IDは最後まで変えない。タブは SPEC/ENV/FX)
{const M=SD.defs.add,eq=(id,tab,def)=>{const p=M.byId[id];if(!p||p.tab!==tab||p.def!==def)bad(id+' の定義(タブ/既定値)')};
 eq('adSpec','spec','saw');if(M.byId.adSpec.opts.map(o=>o[0]).join()!=='sine,saw,square,tri,custom')bad('adSpecの選択肢');
 eq('adN','spec',32);eq('adLayout','layout','harm');eq('adStretch','layout',.2);eq('adMorph','motion',0);eq('adMotTarget','motion','off');eq('adLfoRate','motion',2);eq('adLfoDepth','motion',.5);eq('adMotA','motion',.01);eq('adMotD','motion',.6);eq('adMotS','motion',.4);eq('adMotR','motion',.3);eq('adEgAmt','motion',.5);eq('adFmt','layout','off');eq('adVowel','layout','a');eq('adFmtShift','layout',0);eq('adPerc','draw','off');eq('adClick','draw',0);eq('adAB','motion','a');for(let n=1;n<=9;n++){const q=M.byId['db'+n];if(!q||q.tab!=='draw'||q.min!==0||q.max!==8||q.step!==1)bad('db'+n+'(0〜8の9段階)')}
 if(M.byId.adLayout.opts.map(o=>o[0]).join()!=='harm,stretch,bell,metal,drawbar'||M.byId.adMotTarget.opts.map(o=>o[0]).join()!=='off,morph,tilt'||M.byId.adVowel.opts.map(o=>o[0]).join()!=='a,i,u,e,o')bad('LAYOUT/MOTION/VOWELの選択肢');
 if(M.byId.adFmtShift.min!==-12||M.byId.adFmtShift.max!==12)bad('F.SHIFTは±12半音');eq('adTilt','spec',0);eq('adOddEven','spec',0);eq('adA','env',.005);eq('adD','env',.8);eq('adS','env',.7);eq('adR','env',.3);eq('adDSlope','env',.4);eq('adATilt','env',0);
 if(M.byId.adN.min!==1||M.byId.adN.max!==64||M.byId.adN.step!==1)bad('adNの範囲(1〜64)');
 ['adTilt','adOddEven','adATilt'].forEach(i=>{if(M.byId[i].min!==-100||M.byId[i].max!==100)bad(i+'の範囲(-100〜+100%)')});
 if(M.byId.adA.min!==.001||M.byId.adA.max!==4||M.byId.adD.min!==.02||M.byId.adD.max!==8||M.byId.adR.max!==6)bad('ADSRの範囲');
 if(SD.fmt(M.byId.adTilt,20)!=='+20%'||SD.fmt(M.byId.adD,.8)!=='800ms')bad('ADの表示形式');
 if(M.T.map(t=>t.id).join()!=='spec,draw,env,layout,motion,fx')bad('アディティブのタブ');
 M.T.forEach(t=>{if(t.items.length!==Object.keys(t.at).length)bad(t.id+'タブ itemsとatの数');t.items.forEach(i=>{if(!t.at[i])bad(t.id+'タブの配置 '+i);if(i.indexOf('v_')!==0&&!M.byId[i])bad(t.id+'タブの未定義ID '+i);if(i.indexOf('v_')!==0&&M.byId[i].tab!==t.id&&t.id!=='fx')bad(i+' のtabが '+t.id+' でない')});
  const cells=new Set();t.items.filter(i=>!NEWFX.has(i)).forEach(i=>{const[c,r]=t.at[i],c0=parseInt(c),sp=/span (\d+)/.exec(c)?+/span (\d+)/.exec(c)[1]:1,r0=parseInt(r),rs=/span (\d+)/.exec(r)?+/span (\d+)/.exec(r)[1]:1;
   if(c0+sp-1>t.cols||r0+rs-1>t.rows)bad(t.id+'タブ 枠外 '+i);for(let k=0;k<sp;k++)for(let q=0;q<rs;q++){const key=(c0+k)+','+(r0+q);if(cells.has(key))bad(t.id+'タブ 配置の重なり '+i);cells.add(key)}})});
 ['fType','cutoff','res','drive','rvbMix'].forEach(i=>{if(!M.byId[i]||M.byId[i].tab!==(['drive','rvbMix'].indexOf(i)>=0?M.byId[i].tab:'fx'))bad(i+' はFXタブ')});
 if(!SD.SYNTHS.find(s=>s.id==='add')||SD.TSYNTHS.indexOf('add')<0)bad('シンセ一覧/TRKにアディティブが無い');
 if(SD.SYNTHS.map(s=>s.id).slice(0,3).join()!=='analog,fm,add')bad('シンセ切替の並び(アナログ→FM→アディティブ)')}
if(!SD.SYNTHS.find(s=>s.id==='analog').name.includes('サブトラクティブ')||SD.SYNTHS.find(s=>s.id==='analog').short!=='アナログ')bad('アナログの表示名/短縮名');
const cats=new Set(SD.CATS.map(c=>c.id)),lid=new Set();
const chk=(L,where,id,g)=>{const p=SD.defs[L.synth].byId[id]||SD.PLAYP[id];if(!p)return bad(L.id+where+' 未定義つまみ '+id);
 if(g===undefined)return;
 if(p.type==='seg'){if(!p.opts.some(o=>o[0]===g))bad(L.id+where+' '+id+' 目標値 '+g+' が選択肢に無い')}
 else if(typeof g!=='number'||g<p.min||g>p.max)bad(L.id+where+' '+id+' 目標値 '+g+' が範囲外')};
const pchk=(L,p)=>{if(!p)return;if(!(p.len>=1&&p.len<=16))bad(L.id+' pat len');if(!SD.SCALES[p.scale])bad(L.id+' pat scale');
 (p.steps||[]).forEach((x,i)=>{if(x.on){if(!(x.n>=SD.NMIN&&x.n<=SD.NMAX))bad(L.id+' pat 音域 step'+(i+1));else if(!SD.inScale(x.n,p.key,p.scale))bad(L.id+' pat スケール外の音 step'+(i+1)+' n='+x.n)}})};
SD.LESSONS.forEach(L=>{
 if(L.mode&&L.mode!=='arp'&&L.mode!=='seq'&&L.mode!=='trk')bad(L.id+' mode不明');if(L.tk&&(L.mode!=='trk'||L.tk.length<1||L.tk.length>SD.MAXT||L.tk.some(x=>!SD.LESSONS.some(l=>l.id===x.id)&&!SD.DRUMBY[x.id]&&!(SD.VOICEBY&&SD.VOICEBY[x.id]))))bad(L.id+' tk不正');if(L.tab&&L.tab!=='arp'&&L.tab!=='seq'&&L.tab!=='trk'&&!SD.defs[L.synth].T.some(t=>t.id===L.tab))bad(L.id+' tab不明');pchk(L,L.pat);
 if(lid.has(L.id))bad('レッスンID重複 '+L.id);lid.add(L.id);
 if(!cats.has(L.cat))bad(L.id+' カテゴリ不明');
 if(!SD.SYNTHS.some(s=>s.id===L.synth))bad(L.id+' synth不明');
 if(L.synth!=='mod')Object.keys(L.init||{}).forEach(k=>{if(k==='user'){const u=L.init.user;if(!u||u.a.length!==32||u.b.length!==32||[...u.a,...u.b].some(v=>!(v>=0&&v<=1)))bad(L.id+' init.user');return}chk(L,' init',k,L.init[k])});
 L.steps.forEach((s,i)=>{const wh=' step'+(i+1);
  if(!s.h||!s.b)bad(L.id+wh+' 見出し/本文');
  (s.f||[]).forEach(([id,g])=>chk(L,wh,id,g));
  // v2.9: 倍音の棒グラフの目標 sp:[[倍音番号,目標の強さ,許容幅]](番号1〜64・強さ0〜1・許容幅は正)。本文に目標の数値(0より大きいもの)が書かれていること
  if(s.sp!==undefined){if(L.synth!=='add'||!Array.isArray(s.sp)||!s.sp.length)bad(L.id+wh+' spはアディティブの配列のみ');else{const sn=new Set();s.sp.forEach((e,k)=>{const [n,v,tol]=e;if(!Number.isInteger(n)||n<1||n>64)bad(L.id+wh+' sp'+(k+1)+' 倍音番号が範囲外 '+n);if(sn.has(n))bad(L.id+wh+' sp 倍音番号の重複 '+n);sn.add(n);if(!(typeof v==='number'&&v>=0&&v<=1))bad(L.id+wh+' sp'+(k+1)+' 強さが0〜1でない '+v);if(tol!==undefined&&!(tol>0&&tol<=.5))bad(L.id+wh+' sp'+(k+1)+' 許容幅 '+tol);if(typeof v==='number'&&v>0&&s.b.indexOf(String(+v.toFixed(2)))<0)bad(L.id+wh+' 本文にspの目標値 '+(+v.toFixed(2))+' が無い')});if(s.tab!=='spec')bad(L.id+wh+' spのステップはtab:spec')}}
  Object.keys(s.s||{}).forEach(k=>chk(L,wh+' s',k,s.s[k]));
  if(s.tab&&s.tab!=='arp'&&s.tab!=='seq'&&s.tab!=='trk'&&s.tab!=='au'&&s.tab!=='mix'&&!SD.defs[L.synth].T.some(t=>t.id===s.tab))bad(L.id+wh+' tab不明 '+s.tab);
  (s.c||[]).forEach(([k,mn])=>{if(!SD.COUNTERS[k])bad(L.id+wh+' カウンタ不明 '+k);if(!(mn>=1&&mn<=(k==='pSave'?8:16)))bad(L.id+wh+' カウンタ最小値 '+mn);if(!L.mode&&k!=='pSave'&&k!=='uHave'&&k!=='uUse')bad(L.id+wh+' SEQ用カウンタにmodeが無い')});
  if(s.clr&&L.mode!=='seq'&&!(L.mode==='trk'&&s.clr==='au'))bad(L.id+wh+' clrはSEQレッスンのみ');
  [].concat(s.col||[]).forEach((c,k)=>{if(!c||!c.h||!c.b)bad(L.id+wh+' コラム'+(k+1)+' 見出し/本文');else if(c.b.length>500)bad(L.id+wh+' コラムが長すぎる('+c.b.length+'字)')});
  if(s.cmp){if(!Array.isArray(s.cmp)||s.cmp.length<2||s.cmp.length>4)bad(L.id+wh+' 聞き比べは2〜4個');else s.cmp.forEach((v,k)=>{if(!v.l||(!v.ln&&v.au!==false&&(!v.s||!Object.keys(v.s).length)&&!v.mt&&!v.tm&&!v.bm))bad(L.id+wh+' 聞き比べ'+(k+1)+' l/s');else Object.keys(v.s||{}).forEach(id=>chk(L,wh+' cmp'+(k+1),id,v.s[id]))})}
  if(s.dm||L.dm)(s.dm||L.dm).forEach((e,k)=>{if(!e.s)return bad(L.id+wh+' dm'+(k+1)+' s無し');if(e.t!==undefined&&!(e.t>=0&&e.t<=20))bad(L.id+wh+' dm'+(k+1)+' t範囲');if(e.r!==undefined&&!(e.r>0&&e.r<=20))bad(L.id+wh+' dm'+(k+1)+' r範囲');Object.keys(e.s).forEach(id=>chk(L,wh+' dm'+(k+1),id,e.s[id]))});
  // グラニュラー: 本文の数値が目標値と一致するか(%/ms/粒毎秒/半音)
  if(L.synth==='fm'&&(s.f||[]).some(([id,g])=>id==='fAlg'&&g!==undefined)){const g=s.f.find(x=>x[0]==='fAlg')[1];if(s.b.indexOf('アルゴリズム'+g)<0)bad(L.id+wh+' 本文に「アルゴリズム'+g+'」が無い')}
  if(L.synth==='gr'||L.synth==='fm'||L.synth==='add'||/^ws\d/.test(L.id))(s.f||[]).forEach(([id,g])=>{if(typeof g!=='number')return;const p=SD.defs[L.synth].byId[id];
   const has=t=>s.b.indexOf(t)>=0;let ok=true,want='';
   if(p.fmt==='pct'){want=Math.round(g*100)+'%';ok=has(want)}
   else if(p.fmt==='time'){const ms=Math.round(g*1000);want=ms+'ms';ok=has(want)||has((g)+'秒')}
   else if(p.fmt==='cyc'){want=Math.round(g*1000)+'ms';ok=g<.005?has('AUTO'):has(want)}
   else if(p.fmt==='ps'){want=g+'/s';ok=has(want)}
   else if(p.fmt==='st'){want=Math.abs(g)+'半音';ok=has(want)||has((g>0?'+':'')+g)}
   else if(p.fmt==='x'){want=g+'倍';ok=has(want)||has(g+'×')||has('×'+g)}
   else if(p.fmt==='pc'){want=(g>0?'+':'')+g+'%';ok=has(want)}
   else if(p.fmt==='ct'){want=g+'ct';ok=has(want)}
   else if(p.fmt==='n'){want=String(g);ok=has(want)}
   if(!ok)bad(L.id+wh+' 本文に目標値の表記が無い '+id+' '+want)});
  // 本文中の目標値と数値が一致するか(ms/Hz/st等は目視、ここでは目標が定義されている場合のみ存在確認)
 });});
// FMレッスン(v2.6): F1〜F7が揃い、F7の完成音(お手本)が出荷プリセット E.PIANO と同じ値
{const fl=SD.LESSONS.filter(l=>l.synth==='fm'&&!/^au/.test(l.id)&&!l.course);if(fl.map(l=>l.id).join()!=='f1,f2,f3,f4,f5,f6,f7')bad('FMレッスンはF1〜F7');
 if(!SD.CATS.some(c=>c.synth==='fm'))bad('FMのカテゴリが無い');
 const f7=SD.LESSONS.find(l=>l.id==='f7'),s=Object.assign({},SD.defs.fm.DEF,f7.init);f7.steps.forEach(st=>{Object.assign(s,st.s||{});(st.f||[]).forEach(([id,g])=>{if(g!==undefined)s[id]=g})});
 Object.keys(SD.FM_EPIANO).forEach(k=>{if(s[k]!==SD.FM_EPIANO[k])bad('F7のお手本とE.PIANOが違う '+k+' '+s[k]+' / '+SD.FM_EPIANO[k])});
 if(!/特定の機種の音色データを再現するものではなく/.test(f7.steps[0].b))bad('F7に「DX7風」の注意書きが無い')}
// アディティブレッスン(v2.9): A1〜A6が揃い、目標・本文・実装の数値が一致する
{const al=SD.LESSONS.filter(l=>l.synth==='add'&&!/^au/.test(l.id)&&!l.course);if(al.map(l=>l.id).join()!=='a1,a2,a3,a4,a5,a6')bad('アディティブのレッスンはA1〜A6');
 if(!SD.CATS.some(c=>c.synth==='add'))bad('アディティブのカテゴリが無い');
 const Pd=SD.defs.add,fin=L=>{const s=Object.assign({},Pd.DEF,L.init);L.steps.forEach(st=>{Object.assign(s,st.s||{});(st.f||[]).forEach(([id,g])=>{if(g!==undefined)s[id]=g})});return s};
 const ff=Array.from({length:64},()=>0);
 // A1: 1/k の並び(ノコギリ波)の目標が実際の SAW プリセットと許容内で一致 / 偶数0・奇数1/k が矩形
 {const a1=SD.LESSONS.find(l=>l.id==='a1'),saw=SD.addPreset('saw');a1.steps[2].sp.forEach(([n,v,tol])=>{if(Math.abs(saw[n-1]-v)>.01+1e-9)bad('A1 step3 目標が1/kと違う '+n+' '+v);if(!(tol<=.1))bad('A1 step3 許容幅が広い '+n)});
  a1.steps[4].sp.forEach(([n,v])=>{if(n%2||v!==0)bad('A1 step5 は偶数番目を0にする目標のはず '+n)});}
 // A2: ドローバーの比率(0.5/1.5/1/2/3/4/5/6/8)と最終のレジストレーションが既定値と同じ
 {const a2=SD.LESSONS.find(l=>l.id==='a2'),s=fin(a2),dp=Object.assign({},Pd.DEF,{adLayout:'drawbar'});for(let k=1;k<=9;k++){if(s['db'+k]!==Pd.byId['db'+k].def)bad('A2 最終の db'+k+' が既定値と違う '+s['db'+k])}
  const E=SD.ADD_DERIVE(dp,ff,ff,ff,0,0,0),R=[.5,1.5,1,2,3,4,5,6,8];R.forEach((r,i)=>{if(Math.abs(E.r[i]-r)>1e-9)bad('A2 ドローバー比率 '+i+' '+E.r[i])});
  if(!/808604002/.test(a2.steps[6].b))bad('A2 最終の並び表記');if(!/1934/.test(a2.steps[0].col.b)||!/1935/.test(a2.steps[0].col.b))bad('A2 コラムの年号(裏取り済み: 1934発明・1935製造)')}
 // A6: 「あ」を棒で描く目標が、FORMANTをONにしたときの実際の強さ(C3=48)と許容内で一致 / 本文にHz値を書かない(出典未確認)
 {const a6=SD.LESSONS.find(l=>l.id==='a6'),f0=440*Math.pow(2,(48-69)/12),p=Object.assign({},Pd.DEF,{adFmt:'on',adVowel:'a',adN:32}),E=SD.ADD_DERIVE(p,SD.addPreset('saw'),ff,ff,0,0,f0);
  a6.steps[1].sp.forEach(([n,v,tol])=>{if(Math.abs(E.a[n-1]-v)>tol)bad('A6 step2 目標が実装の「あ」と違う '+n+' 目標'+v+' 実際'+E.a[n-1].toFixed(2))});
  a6.steps.forEach((st,i)=>{if(/\d\s*Hz|ヘルツ/i.test(st.b))bad('A6 step'+(i+1)+' 本文に周波数の数値(出典未確認)')});
  if(a6.demo.n[0]!==48)bad('A6 のデモはC3(48)')}
 // 共通: 全ステップのtabが実在し、棒グラフ目標のあるステップは SPEC タブ
 al.forEach(L=>L.steps.forEach((st,i)=>{if(!st.tab)bad(L.id+' step'+(i+1)+' tab未指定')}))}
// v3.3: FXつまみの定義(旧IDが残る・IDの衝突なし・全シンセに同じ定義・正規化の往復・接頭辞)
{['drive','dlyTime','dlyFb','dlyMix','rvbSize','rvbMix','master'].forEach(i=>{if(SD.FXIDS.indexOf(i)<0)bad('旧FX IDが無い '+i)});
 if(SD.defs.analog.byId.dlyFb.max!==.95)bad('dlyFb は95%まで(v3.3)');
 [['af','AF'],['dj','DJ'],['tr','TR'],['sw','SW'],['bc','BC'],['rm','RM'],['ts','TS']].forEach(([k])=>{const r=SD.FXR.find(x=>x.k===k);if(!r)bad('ラックに '+k+' が無い');else r.ids.forEach(i=>{if(i.slice(0,2)!==k)bad(k+' のIDの接頭辞 '+i)})});
 SD.MIXP.forEach(p=>{if(p.id.slice(0,2)==='dk'&&p.id!=='dkOn'&&p.id!=='dkSrc'&&p.type!=='knob')bad('DUCKのID '+p.id)});
 if(new Set(SD.FXIDS.concat(SD.MIXALL().map(p=>p.id))).size!==SD.FXIDS.length+SD.MIXALL().length)bad('FX・ミキサー・インサートのIDが重複');
 SD.FXR.find(r=>r.k==='dl').ids.forEach(i=>{if(i.slice(0,3)!=='dly'&&i.slice(0,6)!=='dlDuck'&&i.slice(0,6)!=='rtDuck')bad('DELAYのID '+i)});
 Object.keys(SD.defs).forEach(sy=>{const D=SD.defs[sy];SD.FXP.forEach(p=>{const q=D.byId[p.id];if(!q)bad(sy+' に '+p.id+' が無い');else if(q.label!==p.label||q.tab!=='fx')bad(sy+' の '+p.id+' が他のつまみと衝突')})});
 SD.FXP.forEach(p=>{if(p.type!=='knob')return;const n=SD.toN(p,p.def);if(!(n>=0&&n<=1))bad(p.id+' 既定の正規化値が範囲外');const b=SD.fromN(p,SD.toN(p,(p.min+p.max)/2));if(Math.abs(b-(p.min+p.max)/2)>Math.max(1e-6*(p.max-p.min),(p.step||0)/2+1e-9))bad(p.id+' toN/fromN が往復しない')});
 if(SD.fmt(SD.byId.djFilter,-.5)!=='-50%'||SD.fmt(SD.byId.djFilter,.5)!=='+50%'||SD.fmt(SD.byId.swWidth,2)!=='200%')bad('DJ FILTER・WIDTHの表示形式');
}

// ---- v3.8 オートメーションのレッスン(au 目標・お手本・本文との一致) ----
{const A=SD.Auto,KIND=['has','at','mono','rng','cyc','stp','hold'],KEYS=['id','trk','tol','has','at','mono','rng','cyc','stp','hold'];let nAu=0;
 const num=t=>(t.match(/\d+(?:\.\d+)?(?:kHz|Hz|ms|%|st|dB)/g)||[]);
 SD.LESSONS.filter(l=>l.steps.some(s=>s.au||s.lane||s.bars||s.ref||s.clr==='au')).forEach(L=>{
  const df=(t,id)=>A.defOf(L.synth,id);let bars=4;if(L.meter!=null&&!(SD.METER&&SD.METER.valid(L.meter)))bad(L.id+' meter不正');
  if(L.synth==='mod'){/* MA-4: 目標・レーンのつまみのモジュールが、そのレッスンのパッチ(init.mods)に必ずある */const have=new Set(((L.init||{}).mods||[]).map(m=>m.id));L.steps.forEach((s,i)=>[].concat(s.au||[],s.lane||[],s.ref||[],...(s.cmp||[]).map(c=>c.ln||[])).forEach(g=>{const o=String(g.id).split('.')[0];if(String(g.id).indexOf('.')<0||!have.has(o))bad(L.id+' STEP'+(i+1)+' パッチに無いモジュールのつまみ '+g.id)}))}
  if(!SD.CATS.some(c=>c.id===L.cat&&(c.chapter==='auto'||(L.course&&c.chapter==='course'&&c.course===L.course))))bad(L.id+' オートメーション章のcatではない');
  L.steps.forEach((s,i)=>{const w=L.id+' STEP'+(i+1)+' ';if(s.bars){if(A.BARS.indexOf(s.bars)<0)bad(w+'bars不正');bars=s.bars}
   const BT=A.barOf(L.meter),len=bars*BT,allowed=new Set(),addV=(id,trk,v)=>{const p=df(trk,id);if(p&&p.type!=='seg'){const t=SD.fmt(p,v);allowed.add(t);allowed.add(t.replace(/^[+\-−]/,''))}};
   const chkT=(t,what)=>{if(!(t>=0&&t<=len))bad(w+what+' tickが範囲外 '+t)};
   const lanes=(arr,what)=>(arr||[]).forEach(sp=>{const p=df(sp.trk||0,sp.id);if(!p){bad(w+what+' 未定義のつまみ '+sp.id);return}if(p.auto===false)bad(w+what+' 対象にできないつまみ '+sp.id);
    sp.pts.forEach(q=>{chkT(q[0],what);if(p.type==='seg'?!p.opts.some(o=>o[0]===q[1]):!(q[1]>=p.min-1e-9&&q[1]<=p.max+1e-9))bad(w+what+' 値が範囲外 '+sp.id+' '+q[1]);addV(sp.id,sp.trk||0,q[1])})});
   (s.au||[]).forEach(g=>{nAu++;Object.keys(g).forEach(k=>{if(KEYS.indexOf(k)<0)bad(w+'au 未知の判定 '+k)});const p=df(g.trk||0,g.id);
    if(!p){bad(w+'au 未定義のつまみ '+g.id);return}if(p.auto===false)bad(w+'au 対象にできないつまみ '+g.id);
    if(g.tol!=null&&!(g.tol>0))bad(w+'許容幅');
    (g.at||[]).forEach(a=>{chkT(a[0],'at');if(!(a[2]==null||a[2]>0))bad(w+'at許容幅');if(p.type!=='seg'&&!(a[1]>=p.min&&a[1]<=p.max))bad(w+'at目標値が範囲外 '+g.id+' '+a[1]);addV(g.id,g.trk||0,a[1]);
     if(p.type!=='seg'&&s.b.indexOf(SD.fmt(p,a[1]))<0)bad(w+'本文に目標値 '+SD.fmt(p,a[1])+' が無い')});
    (g.mono||[]).forEach(a=>{chkT(a[0],'mono');chkT(a[1],'mono');if(!(a[0]<a[1])||['up','down'].indexOf(a[2])<0)bad(w+'mono不正')});
    (g.rng||[]).forEach(a=>{chkT(a[0],'rng');chkT(a[1],'rng');if(!(a[0]<a[1]&&a[2]<=a[3]))bad(w+'rng不正');addV(g.id,g.trk||0,a[2]);addV(g.id,g.trk||0,a[3])});
    (g.cyc||[]).forEach(a=>{chkT(a[0],'cyc');chkT(a[1],'cyc');if(!(a[0]<a[1]&&a[2]>=1&&a[3]>0&&a[3]<=1))bad(w+'cyc不正')});
    (g.stp||[]).forEach(a=>{chkT(a[0],'stp');chkT(a[1],'stp');if(!(a[0]<a[1]&&a[2]>=2))bad(w+'stp不正')});
    (g.hold||[]).forEach(a=>{chkT(a[0],'hold');chkT(a[1],'hold')});
    /* 使うエフェクトがONか(ONつまみを持つエフェクトのみ) */
    const fx=SD.FXR.find(f=>f.on&&f.ids.indexOf(g.id)>=0&&g.id!==f.on);if(fx){const on=L.init&&L.init[fx.on]===1||L.steps.some(q=>q.s&&q.s[fx.on]===1);if(!on)bad(w+fx.name+' がONになっていない('+fx.on+':1 が必要)')}});
   lanes(s.lane,'lane');lanes(s.ref,'ref');(s.cmp||[]).forEach(c=>lanes(c.ln,'cmp'));
   (s.f||[]).forEach(([id,g])=>{if(g!==undefined)addV(id,0,g)});
   [s.s].concat((s.cmp||[]).map(c=>c.s)).forEach(o=>o&&Object.keys(o).forEach(id=>{if(typeof o[id]==='number')addV(id,0,o[id])}));
   if(L.init)Object.keys(L.init).forEach(id=>addV(id,0,L.init[id]));
   /* v7.12a: コースの mx・mt 目標(つまみ・メーターの範囲)の数値も、本文に出してよい(単位は問わず、値だけ一致を見る) */
   [].concat(s.mx||[],s.mt||[]).forEach(g=>(g.rng||[]).forEach(v=>[v,Math.abs(v)].forEach(x=>{['dB','Hz','ms','%','st'].forEach(u=>allowed.add(x+u));allowed.add(x/1000+'kHz')})));
   /* お手本は同じステップの au をすべて満たす */
   if(s.au&&s.au.some(g=>g.at||g.mono||g.rng||g.cyc||g.stp||g.hold)){if(!s.ref)bad(w+'au目標があるのに ref(お手本)が無い');else{const R=A.checkAu(A.mkFromSpecs(s.ref,bars,df,L.meter),s.au,df);R.forEach(r=>r.items.forEach(it=>{if(!it.ok)bad(w+'お手本が目標を満たさない: '+r.g.id+' '+it.k+' '+JSON.stringify(it.a))}))}}
   /* 本文の数値(Hz・%・ms…)は、このステップの目標・レーン・つまみの値のどれかと一致 */
   num(s.h+s.b).forEach(t=>{if(!allowed.has(t))bad(w+'本文の数値 '+t+' が目標値と一致しない')});
   /* 小節・拍は tick から計算した値と一致 */
   const okBars=new Set([bars]);[].concat(s.au||[]).forEach(g=>KIND.filter(k=>k!=='has').forEach(k=>(g[k]||[]).forEach(a=>{if(Array.isArray(a)){okBars.add(a[0]/BT);if(k!=='at')okBars.add(a[1]/BT)}})));
   (s.sn||[]).forEach(g=>{okBars.add(g.at+1);okBars.add(1)});/* v7.12a: sn は at(0始まり)+1 小節目・グライドの「1小節以上」 */
   (s.b.match(/(\d+)小節/g)||[]).forEach(t=>{if(!okBars.has(parseInt(t)))bad(w+'本文の '+t+' が bars/tick と一致しない')});
   if(/(19|20)\d\d/.test(s.h+s.b))bad(w+'本文に年号(コラムのみ可)');if(s.col&&/(19|20)\d\d/.test(s.col.b))bad(w+'コラムの年号は README の裏取り表に出典が要る(現在は未裏取りのため不可)')});
 });
 /* MT-4: レッスンの聞き比べ・初期値のテンポ同期(DIV)は拍の分割 0〜8 の整数(拍子に依らない値) */
{const DV=new Set(['afDiv','trDiv','dlyDiv']),okd=v=>Number.isInteger(v)&&v>=0&&v<SD.DIVS.length;
 SD.LESSONS.forEach(L=>{const chk=(o,w)=>{if(o)Object.keys(o).forEach(k=>{if(DV.has(k)&&!okd(o[k]))bad(L.id+' '+w+' '+k+' が 0〜8 の整数でない')})};chk(L.init,'init');L.steps.forEach((st,i)=>{chk(st.s,'STEP'+(i+1)+' s');(st.cmp||[]).forEach(c=>chk(c.s,'STEP'+(i+1)+' cmp'))})})}
if(!SD.LESSONS.some(l=>l.id==='au05'))bad('試作レッスン au05 が無い');
 /* 判定関数の単体確認(目標を満たさない線は不合格) */
 const df0=(t,id)=>A.defOf('analog',id),g0=[{id:'cutoff',at:[[0,400,.1],[1536,8000,.1]],mono:[[0,1536,'up']]}];
 const flat=A.mkFromSpecs([{id:'cutoff',pts:[[0,400],[1536,400]]}],4,df0),dn=A.mkFromSpecs([{id:'cutoff',pts:[[0,8000],[1536,400]]}],4,df0);
 if(A.checkAu(flat,g0,df0)[0].ok||A.checkAu(dn,g0,df0)[0].ok||A.checkAu(A.mk(4),g0,df0)[0].ok)bad('au判定: 満たさない線が合格になる');
 console.log('au目標 '+nAu+'件');}

// ---- v5.0 コース(lv/course/pre/kind/terms/claim/save/quiz・用語集・帯域・パターン集) ----
{const T=SD.TERMS,tid=new Set(),tnm=new Set(),B=SD.BANDS,LI=new Set(SD.LESSONS.map(l=>l.id)),KIND=[undefined,'recipe','read','diag'];let nC=0;
 B.forEach((b,i)=>{if(!(b.lo<b.hi))bad('帯域 '+b.id+' 範囲');if(i&&B[i-1].hi!==b.lo)bad('帯域が連続していない '+b.id)});
 T.forEach(t=>{if(tid.has(t.id))bad('用語ID重複 '+t.id);tid.add(t.id);if(tnm.has(t.name))bad('用語名重複 '+t.name);tnm.add(t.name);
  if(!t.name||!t.kana||!t.en||!t.def)bad('用語の項目不足 '+t.id);if(t.def.length>100)bad('用語の定義が100字超 '+t.id+' '+t.def.length);
  (t.see||[]).forEach(i=>{if(!LI.has(i))bad('用語 '+t.id+' のseeが存在しない '+i)});if(/(19|20)\d\d/.test(t.def))bad('用語の定義に年号 '+t.id);
  const b=B.find(x=>x.id===t.id);if(b&&t.def.indexOf(SD.bandStr(b.id))<0)bad('帯域用語に範囲の表記が無い '+t.id)});
 const okHz=new Set();B.forEach(b=>{const s=SD.bandStr(b.id);(s.match(/\d+(?:\.\d+)?k?Hz/g)||[]).forEach(x=>okHz.add(x))});
 SD.LESSONS.filter(l=>l.course||l.lv>1||l.kind||l.save||l.claim||l.pre).forEach(L=>{nC++;
  if(!(L.lv===2||L.lv===3))bad(L.id+' lvは2か3');const c=SD.CATS.find(x=>x.id===L.cat);if(!c||c.chapter!=='course'||c.course!==L.course)bad(L.id+' コースのcatが不正');
  if(KIND.indexOf(L.kind)<0)bad(L.id+' kind不正');(L.pre||[]).forEach(i=>{if(!LI.has(i))bad(L.id+' preが存在しない '+i)});
  (L.terms||[]).forEach(i=>{if(!tid.has(i))bad(L.id+' termsが用語集に無い '+i)});
  if(L.save&&(!L.save.name||['patch','kit'].indexOf(L.save.kind)<0||(L.save.kind==='kit')!==!!L.tk))bad(L.id+' save不正');
  (L.claim||[]).forEach(q=>{if(q.m!==undefined){/* v7.6〜 ミックスの主張: {trk,m:'gr',rng,cp}(測定は test/cm.js) */if(!(['gr','peak','rms','ovl'].indexOf(q.m)>=0&&L.tk&&q.trk>=1&&q.trk<=L.tk.length&&q.rng&&q.rng.length===2&&q.rng[0]<q.rng[1]))bad(L.id+' claim(ミックス)不正')}else if(!B.some(b=>b.id===q.band)||!(q.min>=0&&q.min<=1)||!(q.n>=SD.NMIN&&q.n<=SD.NMAX))bad(L.id+' claim不正')});
  (L.tk||[]).forEach(x=>Object.keys(x.o.p||{}).forEach(k=>{if(!SD.defs[(SD.LESSONS.find(l=>l.id===x.id)||{synth:'analog'}).synth].byId[k])bad(L.id+' tk o.p 未定義つまみ '+k)}));
  (L.tk||[]).forEach((x,k)=>{const n=x.o.len===undefined?16:x.o.len;if(!(Number.isInteger(n)&&n>=1&&n<=(SD.STEPMAX||16))||Object.keys(x.idx).some(i=>+i>=n))bad(L.id+' tk'+(k+1)+' len不正/範囲外のステップ')});
  if(L.course!=='MI'&&!L.steps.some(s=>s.cmp))bad(L.id+' 聞き比べ(cmp)が1回も無い');
  if(L.kind==='read'&&L.steps.some(s=>s.f||s.s||s.c||s.sp||s.au))bad(L.id+' 読み物に目標がある');
  if(L.kind==='recipe'&&!L.save)bad(L.id+' レシピにsaveが無い');
  if(L.kind==='diag'&&(!L.save||!L.steps.some(s=>s.quiz)||!L.steps.some(s=>(s.mx||[]).length||(s.mt||[]).length||(s.f||[]).length)))bad(L.id+' 診断(diag)は save・quiz・直す目標(mx/mt/f)が要る');
  if(L.steps.length<3||L.steps.length>8)bad(L.id+' ステップ数は3〜8('+L.steps.length+')');
  L.steps.forEach((s,i)=>{const w=L.id+' step'+(i+1)+' ',tx=s.h+s.b+[].concat(s.col||[]).map(c=>c.h+c.b).join('');
   (tx.match(/【[^】]*】/g)||[]).forEach(m=>{const n=m.slice(1,-1);if(!tnm.has(n))bad(w+'未登録の用語 '+m);else if((L.terms||[]).indexOf(T.find(t=>t.name===n).id)<0)bad(w+'termsに無い用語 '+m)});
   {const yb=s.h+s.b;if(/(19|20)\d\d/.test(yb))bad(w+'本文に年号(コラムのみ可)');const cs=[].concat(s.col||[]);cs.forEach(c=>{const ys=[...new Set((c.h+c.b).match(/(?:19|20)\d\d/g)||[])];if(!ys.length)return;if(L.course!=='HS')bad(w+'年号はHS章のコラムのみ');else{if(ys.length>3)bad(w+'コラムの年号は3つまで');const rd=require('fs').readFileSync(require('path').join(__dirname,'..','README.md'),'utf8'),hs=rd.slice(rd.indexOf('## 歴史・用語の裏取り(HS章)')+1);if(rd.indexOf('## 歴史・用語の裏取り(HS章)')<0)bad('READMEにHS章の裏取り表が無い');ys.forEach(y=>{if(hs.indexOf(y)<0)bad(w+'年号 '+y+' がREADMEのHS章裏取り表に無い')})}})};(tx.match(/\d+(?:\.\d+)?k?Hz/g)||[]).forEach(h=>{if(!okHz.has(h)&&!JSON.stringify(s).includes(h.replace(/Hz$/,''))&&!JSON.stringify(s).includes(String(Math.round(parseFloat(h)*(/kHz$/.test(h)?1000:1)))))bad(w+'帯域に無い周波数の表記 '+h)});
   if(s.quiz){if(!s.cmp||!(s.quiz.ans>=1&&s.quiz.ans<=s.cmp.length)||!s.quiz.q||!s.quiz.ex)bad(w+'quiz不正')}
   (s.cmp||[]).forEach((v,k)=>{if(v.tm&&(L.mode!=='trk'||Object.keys(v.tm).some(t=>!(t>=1&&t<=L.tk.length)||Object.keys(v.tm[t]).some(id=>!SD.insDef(id)&&!(id==='ord'&&SD.ordValid(v.tm[t][id]))&&['tDly','tRvb','tPan','tVol','dkOn','dkSrc','dkDepth','dkAtk','dkHold','dkRel'].indexOf(id)<0))))bad(w+'cmp'+(k+1)+' tm不正');if(v.mt&&(L.mode!=='trk'||v.mt.some(t=>!(t>=0&&t<L.tk.length))))bad(w+'cmp'+(k+1)+' mt不正')})})});
 /* MT-5b: 拍子つきレッスン(L.meter)は有効な拍子で、トラックの len(省略=16)は1小節のステップ数。MTコースは meter を持つ */
{const M=SD.METER;SD.LESSONS.filter(l=>l.meter!=null||l.course==='MT').forEach(L=>{if(L.course==='MT'&&L.meter==null)bad(L.id+' MTコースに meter が無い');
 if(!M||!M.valid(L.meter)){bad(L.id+' meter不正');return}const n=M.stepsPerBar(L.meter);
 if(L.meter.n===4&&L.meter.d===4&&L.meter.g==null)bad(L.id+' meter が4/4(省略する)');
 (L.tk||[]).forEach((x,k)=>{if(!L.poly&&(x.o.len===undefined?16:x.o.len)!==n)bad(L.id+' tk'+(k+1)+' の len が1小節('+n+')と違う');
  Object.keys(x.idx).forEach(i=>{if(+i>=(L.poly?(x.o.len===undefined?16:x.o.len):n))bad(L.id+' tk'+(k+1)+' 小節の外のステップ '+i)})});
 if(L.mode!=='trk'||!L.tk)bad(L.id+' meter つきはトラックのレッスン')})}
/* OR-4: 2段目(_2)を目標にするレッスンは、そのトラックの初期 mix.ord に該当スロットがいる。_2 は元のグループと一致・cx11/cx12 は存在 */
{let n2=0;SD.LESSONS.forEach(L=>L.steps.forEach((s,i)=>(s.mx||[]).forEach(g=>{if(!/_2$/.test(g.k))return;n2++;const d=SD.insDef(g.k),x=(L.tk||[])[g.trk-1],o=x&&x.o&&x.o.mix&&x.o.mix.ord;
 if(!d||d.ins!==g.ins)bad(L.id+' step'+(i+1)+' 2段目の目標 '+g.k+' が ins '+g.ins+' と合わない');
 else if(!(SD.ordValid(o)&&o.indexOf(g.ins+'_2')>=0))bad(L.id+' step'+(i+1)+' 2段目の目標 '+g.k+' なのにトラックに '+g.ins+'_2 が居ない')})));
 ['cx11','cx12'].forEach(id=>{if(!SD.LESSONS.some(l=>l.id===id))bad(id+' が無い')});if(!n2)bad('2段目(_2)を目標にするレッスンが無い(cx12)')}
if(!['th01','ly02','bs01'].every(i=>LI.has(i)))bad('試作3本(th01・ly02・bs01)が無い');
 console.log('コース '+nC+'本・用語 '+T.length+'語');}
{/* v9.0 R-1: SB のレッスン sb01・sb02(バスCOMPのSC)。T1=キックはMASTER・T2以降はBUS A、cmp はバスCOMPで SC(T1)と INT を比べ、音量補正 g が付いている */
 for(const id of['sb01','sb02']){const L=SD.LESSONS.find(l=>l.id===id);if(!L){bad(id+' が無い');continue}
  if(L.course!=='CM'||L.steps.length<5||L.steps.length>8)bad(id+' はCMコースの5〜8ステップ');
  if(!L.steps.some(s=>s.col))bad(id+' にコラムが無い');
  if(!L.tk||L.tk.length<3||(SD.withOut(null,L.tk[0].o.out)||{}).tOut||!L.tk.slice(1).every(t=>(SD.withOut(null,t.o.out)||{}).tOut===1))bad(id+' はT1=MASTER・T2以降=BUS A');
  let sc=0,intc=0,ncmp=0;L.steps.forEach((s,i)=>(s.cmp||[]).forEach((c,j)=>{ncmp++;const a=c.bm&&c.bm.A;if(!a){bad(id+' step'+(i+1)+' cmp'+(j+1)+' は bm.A を持つ');return}
   if(a.iCpOn===1&&a.iCpSc===1)sc++;if(a.iCpOn===1&&!a.iCpSc)intc++;if(c.g===undefined)bad(id+' step'+(i+1)+' cmp'+(j+1)+' に g(音量補正)が無い')}));
  if(!sc)bad(id+' にSC(T1)の聞き比べが無い');if(id==='sb01'&&!intc)bad(id+' に通常COMP(INT)との聞き比べが無い');if(ncmp<2)bad(id+' の聞き比べが少ない')}
 const b=SD.LESSONS.find(l=>l.id==='sb02');if(!b||!b.steps.some(s=>(s.cmp||[]).some(c=>(c.mt||[]).indexOf(1)>=0&&c.bm&&c.bm.A.iCpSc===1)))bad('sb02 にキックをミュートしたSCの聞き比べが無い')}

{/* v7.11b: cmp.bm(バスのつまみ)の検査 */
 for(const L of SD.LESSONS)L.steps.forEach((s,i)=>(s.cmp||[]).forEach((c,j)=>{if(!c.bm)return;Object.keys(c.bm).forEach(b=>{if('ABC'.indexOf(b)<0)bad(L.id+' step'+(i+1)+' cmp'+(j+1)+' bm のバス名が不正 '+b);Object.keys(c.bm[b]).forEach(id=>{const q=SD.BUSP.find(z=>z.id===id);if(!q)bad(L.id+' bm の ID が不明 '+id);else if(q.type!=='seg'&&!(c.bm[b][id]>=q.min&&c.bm[b][id]<=q.max))bad(L.id+' bm '+id+' が範囲外')})})}))}
{/* v7.1b: mx / mt / cmp.g / 目安表 {g:} の定義検査(全レッスン) */
 let nMx=0;for(const L of SD.LESSONS){SD.MixGoal.check(L).forEach(m=>bad(m));L.steps.forEach(s=>{nMx+=(s.mx||[]).length+(s.mt||[]).length;if((s.cmp||[]).some(c=>c.g!==undefined)&&s.cmp.length<2)bad(L.id+' cmp.g は2つ以上の聞き比べで使う')})}
 console.log('mx/mt目標 '+nMx+'件')}
console.log(err?('失敗 '+err+'件'):('OK: つまみ'+nP+' / レッスン'+SD.LESSONS.length+'本 / '+SD.LESSONS.reduce((a,l)=>a+l.steps.length,0)+'ステップ'));
process.exit(err?1:0);
