/* v7.12a/b SEコース(se01〜se12)の検査(構造・場面(シーン)の定義・エネルギーの曲線が本文の主張と合うこと・目安表との一致。メーター系 mt の達成は実機で確認): node test/se.js */
const E=require('./cmest.js'),SD=E.loadSD(),{stepLevels}=require('./eqest.js');let err=0;const bad=m=>{console.log('NG: '+m);err++},ok=(c,m)=>{if(!c)bad(m)};
const LS=SD.LESSONS.filter(l=>l.course==='SE'),G=SD.GUIDE.roles,D=SD.GUIDE.dyn;
['se01','se02','se03','se04','se05','se06','se07','se08','se09','se10','se11','se12','se13','se14','se15','se16','se17'].forEach(id=>ok(LS.some(l=>l.id===id),id+' が無い'));
const get=id=>LS.find(l=>l.id===id),mxs=l=>[].concat(...l.steps.map(s=>s.mx||[])),f=(l,t,k)=>mxs(get(l)).find(g=>g.trk===t&&g.k===k);
const KEYS=['tVol','tPan','tRvb','iEqHpf','iEqHg','iEqLpf'];
/* ---- 構造 ---- */
LS.forEach(L=>{ok(L.mode==='trk'&&L.tk.length===7,L.id+' のトラック数は7');ok(L.steps.length>=5&&L.steps.length<=8,L.id+' は5〜8ステップ');ok(L.steps.some(s=>s.col),L.id+' にコラム');ok(L.steps.some(s=>(s.cmp||[]).length),L.id+' に聞き比べ');
 ok(Array.isArray(L.sc)&&L.sc.length>=2,L.id+' に sc(シーン)');
 L.tk.forEach((x,i)=>ok(x.o.mx&&x.o.mx.eq,L.id+' T'+(i+1)+' に EQ'));
 ok(L.tk[3].o.mx.cp&&L.tk[6].o.mx.cp,L.id+' ベース・声に COMP');
 /* 初期状態: トラックの mix(mx と mix を合成)で、各ステップの mx 目標が最初から全部達成済みではない */
 L.steps.forEach((st,si)=>{(st.mx||[]).forEach(g=>{const x=L.tk[g.trk-1],mm=Object.assign({},SD.mxToMix(x.o.mx),x.o.mix||{});let ini=mm[g.k];if(ini===undefined)ini=(g.ins==='mix'?SD.MIXP:SD.INSP).find(p=>p.id===g.k).def;g._ini=SD.MixGoal.inRange(ini,g.rng)});
  if((st.mx||[]).length)ok(!st.mx.every(g=>g._ini),L.id+' step'+(si+1)+' の mx 目標が最初から全部達成済み');
  if(st.sn)ok(st.bars>=Math.max(...st.sn.map(g=>g.at))+1&&st.tab==='au',L.id+' step'+(si+1)+' の sn は AUTO タブで、小節数が足りること')});
 /* シーン: 全シーンが同じつまみを持つ(呼び出しで状態が決まる)・名前の重複なし・sn の名前が存在 */
 L.sc.forEach(c=>{for(let t=1;t<=7;t++)ok(KEYS.every(k=>c.mix[t]&&c.mix[t][k]!==undefined),L.id+' シーン'+c.name+' T'+t+' のつまみ不足')});
 L.steps.forEach((st,si)=>{(st.sn||[]).forEach(g=>ok(L.sc.some(c=>c.name===g.scene),L.id+' step'+(si+1)+' sn のシーン名'))});
 ok(SD.MixGoal.check(L).length===0,L.id+' MixGoal.check: '+SD.MixGoal.check(L).join(' / '))});
/* ---- エネルギーの曲線: 場面の定義が本文の主張と合う ---- */
const S=SD.SE_SCT,col=(n,k)=>S[n].map(r=>r[KEYS.indexOf(k)]),sum=(n,k,fn)=>col(n,k).reduce((a,v)=>a+(fn?fn(v):v),0);
const dens=n=>col(n,'tVol').filter(v=>v>=.1).length,pow=n=>sum(n,'tVol',v=>v*v);
ok(dens('A')<=dens('B')&&dens('B')<=dens('サビ')&&dens('A')<dens('サビ'),'密度: A ≤ B ≤ サビ(Aよりサビが多い)');
ok(pow('A')<pow('B')&&pow('B')<pow('サビ'),'音量(各VOLの2乗和): A < B < サビ');
ok(sum('A','iEqHg')<=sum('B','iEqHg')&&sum('B','iEqHg')<sum('サビ','iEqHg'),'高域(HIGH SHELF合計): A ≤ B < サビ');
const chdPan=n=>S[n][4][1],chdRvb=n=>S[n][4][2];
ok(chdPan('A')<chdPan('B')&&chdPan('B')<chdPan('サビ'),'幅(コードのPAN): A < B < サビ');
ok(sum('A','tRvb')<sum('B','tRvb')&&sum('B','tRvb')<sum('サビ','tRvb'),'空間(RVB SEND合計): A < B < サビ');
ok(S['A'][4][3]>S['サビ'][4][3],'Aのコードのローカットが、サビより高い(Aは低域タイト)');
ok(S['Intro'][4][5]<=4000,'Intro のコードに LPF(4kHz以下)');ok(col('Intro','tVol')[6]===0&&col('Intro','tVol')[3]===0,'Intro は声とベースを鳴らさない');
ok(col('A','tVol')[6]>=Math.max(S['A'][4][0],S['A'][5][0]),'A: 声が、コード・リードより大きい(声が主役)');
ok(col('間奏','tVol')[6]===0&&S['間奏'][5][0]>S['サビ'][5][0],'間奏: 声が無く、リードが主役');
/* 範囲 */
Object.keys(S).forEach(n=>S[n].forEach((r,i)=>KEYS.forEach((k,j)=>{const p=(SD.MIXP.concat(SD.INSP)).find(q=>q.id===k);ok(r[j]>=p.min&&r[j]<=p.max,'シーン'+n+' T'+(i+1)+' '+k+' が範囲外')})));
/* ---- 目安表との一致 ---- */
const R=(l,t,k,lo,hi,w)=>{const g=f(l,t,k);ok(g&&g.rng[0]===lo&&g.rng[1]===hi,l+' '+w+' が目安表と違う '+(g&&g.rng))};
R('se03',5,'iEqHpf',G.pad.hpf[0],G.pad.hpf[1],'コードのローカット');R('se03',3,'iEqHpf',G.hat.hpf[0],G.hat.hpf[1],'ハットのローカット');R('se03',7,'iEqHpf',G.vocal.hpf[0],G.vocal.hpf[1],'声のローカット');
R('se04',3,'iEqHg',D.eqStart[0],D.eqStart[1],'ハットのHIGH SHELF(始めの目安)');R('se04',5,'iEqHg',D.eqStart[0],D.eqStart[1],'コードのHIGH SHELF(始めの目安)');
/* 場面の値が、目標の範囲に入っている(お手本=場面) */
const inR=(sc,l,t,k)=>{const g=f(l,t,k);return g&&SD.MixGoal.inRange(get(l).sc.find(c=>c.name===sc).mix[t][k],g.rng)};
[['A','se03',5,'iEqHpf'],['A','se03',3,'iEqHpf'],['A','se03',7,'iEqHpf'],['A','se03',5,'tVol'],['A','se03',6,'tVol'],['A','se03',5,'tPan'],['A','se03',5,'tRvb'],['A','se03',7,'tRvb'],
 ['B','se04',2,'tVol'],['B','se04',6,'tVol'],['B','se04',3,'iEqHg'],['B','se04',5,'iEqHg'],['B','se04',5,'tPan'],['B','se04',5,'tRvb'],
 ['サビ','se05',4,'tVol'],['サビ','se05',1,'tVol'],['サビ','se05',5,'iEqHpf'],['サビ','se05',3,'iEqHg'],['サビ','se05',5,'iEqHg'],['サビ','se05',7,'iEqHg'],['サビ','se05',5,'tPan'],['サビ','se05',5,'tRvb'],['サビ','se05',7,'tVol'],['サビ','se05',7,'tRvb'],
 ['サビ','se01',5,'tPan'],['サビ','se01',5,'tRvb'],['Intro','se02',2,'tVol'],['Intro','se02',4,'tVol'],['Intro','se02',7,'tVol'],['Intro','se02',5,'iEqLpf'],['Intro','se02',5,'tRvb'],['Intro','se02',6,'tRvb']
].forEach(([sc,l,t,k])=>ok(inR(sc,l,t,k),l+' T'+t+' '+k+' の目標範囲に、シーン「'+sc+'」の値が入っていない'));
/* ---- v7.12b: 新しい場面(サビ前・ブレイク・サビ後・つなぎ)の曲線 ---- */
ok(pow('B')<pow('サビ前')&&pow('サビ前')<pow('サビ'),'サビ前: 音量が B より大きく、サビより小さい');
ok(S['サビ前'][4][3]>S['B'][4][3],'サビ前: コードのローカットが B より高い(低域を薄くする)');
ok(sum('サビ前','tRvb')>sum('B','tRvb'),'サビ前: 空間が B より大きい');ok(dens('サビ前')>=dens('B'),'サビ前: 密度が B 以上');
ok(col('ブレイク','tVol').filter(v=>v>=.1).length<=1&&col('ブレイク','tVol')[4]>0,'ブレイク: 鳴るのはコード(余韻)だけ');ok(S['ブレイク'][4][2]>=.5,'ブレイク: 余韻のリバーブが多い');
ok(S['サビ後'][4][5]<=4000&&S['サビ後'][5][5]<=4000,'サビ後: コード・リードに LPF');ok(pow('サビ後')<pow('サビ'),'サビ後: 音量がサビより小さい');ok(col('サビ後','tVol')[6]===0,'サビ後: 声が止まる');
ok(S['つなぎ'][4][5]<=2500&&col('つなぎ','tVol')[6]>=.8,'つなぎ: フィルターを閉じ、声が先に入る');
[['サビ前','se07',5,'iEqHpf'],['サビ前','se07',6,'iEqHpf'],['サビ前','se07',2,'tVol'],['サビ前','se07',3,'tVol'],['サビ前','se07',5,'tRvb'],['サビ前','se07',6,'tRvb'],
 ['ブレイク','se08',1,'tVol'],['ブレイク','se08',2,'tVol'],['ブレイク','se08',3,'tVol'],['ブレイク','se08',4,'tVol'],['ブレイク','se08',6,'tVol'],['ブレイク','se08',7,'tVol'],['ブレイク','se08',5,'tVol'],['ブレイク','se08',5,'tRvb'],['ブレイク','se08',5,'iEqLpf'],
 ['サビ','se09',1,'tVol'],['サビ','se09',4,'tVol'],['サビ','se09',3,'iEqHg'],['サビ','se09',7,'iEqHg'],['サビ','se09',5,'tPan'],['サビ','se09',5,'tRvb'],
 ['サビ後','se10',5,'iEqLpf'],['サビ後','se10',6,'iEqLpf'],['サビ後','se10',1,'tVol'],['サビ後','se10',3,'tVol'],['サビ後','se10',7,'tVol'],['サビ後','se10',5,'tRvb'],['サビ後','se10',6,'tRvb'],
 ['つなぎ','se11',5,'iEqLpf'],['つなぎ','se11',6,'iEqLpf'],['つなぎ','se11',5,'tRvb'],['つなぎ','se11',6,'tRvb'],['つなぎ','se11',7,'tVol'],['つなぎ','se11',7,'tRvb'],
 ['サビ前','se12',5,'iEqHpf'],['サビ前','se12',3,'iEqHpf'],['サビ前','se12',3,'tVol'],['サビ前','se12',3,'iEqHg'],['サビ前','se12',2,'tVol'],['サビ前','se12',2,'tRvb'],['つなぎ','se12',5,'iEqLpf'],['つなぎ','se12',6,'iEqLpf']
].forEach(([sc,l,t,k])=>ok(inR(sc,l,t,k),l+' T'+t+' '+k+' の目標範囲に、シーン「'+sc+'」の値が入っていない'));
/* ---- v7.12c: 2番A・ラスサビ・アウトロ・エンド ---- */
ok(pow('A')<pow('2番A')&&pow('2番A')<pow('B'),'2番A: 音量が A より大きく B より小さい');ok(dens('2番A')>dens('A'),'2番A: 密度が A より多い');ok(S['2番A'][6][0]===S['A'][6][0]&&S['2番A'][6][1]===S['A'][6][1],'2番A: 声は A と同じ');
ok(pow('ラスサビ')>pow('サビ')&&sum('ラスサビ','iEqHg')>sum('サビ','iEqHg')&&sum('ラスサビ','tRvb')>sum('サビ','tRvb')&&S['ラスサビ'][4][1]>S['サビ'][4][1],'ラスサビ: 音量・高域・空間・幅がサビより大きい');
ok(pow('アウトロ')<pow('サビ')&&S['アウトロ'][4][5]<=4000&&col('アウトロ','tVol')[6]===0,'アウトロ: 小さく・LPF・声なし');ok(dens('エンド')<=1&&col('エンド','tVol')[4]>0&&S['エンド'][4][2]>=.5,'エンド: 余韻(コードのリバーブ)だけ');
[['2番A','se13',6,'tVol'],['2番A','se13',3,'tVol'],['2番A','se13',5,'tPan'],['2番A','se13',5,'tRvb'],
 ['間奏','se14',1,'tVol'],['間奏','se14',2,'tVol'],['間奏','se14',7,'tVol'],['間奏','se14',6,'tVol'],['間奏','se14',5,'tPan'],['間奏','se14',6,'tRvb'],
 ['ラスサビ','se15',3,'iEqHg'],['ラスサビ','se15',7,'iEqHg'],['ラスサビ','se15',5,'tPan'],['ラスサビ','se15',6,'tPan'],
 ['アウトロ','se16',1,'tVol'],['アウトロ','se16',7,'tVol'],['アウトロ','se16',5,'iEqLpf'],['アウトロ','se16',6,'iEqLpf'],['アウトロ','se16',6,'tRvb']
].forEach(([sc,l,t,k])=>ok(inR(sc,l,t,k),l+' T'+t+' '+k+' の目標範囲に、シーン「'+sc+'」の値が入っていない'));
ok(get('se17').sc.length===6&&get('se17').steps.some(s=>s.bars===32),'se17: 32小節のシーンレーン');
/* ---- 聞き比べの tm: ID と範囲 ---- */
LS.forEach(L=>L.steps.forEach((st,si)=>(st.cmp||[]).forEach((c,j)=>Object.keys(c.tm||{}).forEach(t=>Object.keys(c.tm[t]).forEach(id=>{const q=SD.MIXALL().find(z=>z.id===id);ok(q&&(q.type==='seg'||(c.tm[t][id]>=q.min&&c.tm[t][id]<=q.max)),L.id+' step'+(si+1)+' cmp'+(j+1)+' tm T'+t+'.'+id+' が不正')})))));
/* ---- 音量補正 g: SD.SE_CAL の聞き比べは、推定で差1dB以内 ---- */
let nC=0;(SD.SE_CAL||[]).forEach(k=>{const [id,s]=k.split(':'),L=get(id),st=L.steps[s-1],lv=stepLevels(L,st);ok(lv.length>1&&lv.every(x=>x!=null),k+' の推定レベルが出ない');nC++;const sp=SD.MixGoal.cmpSpread(lv,st.cmp.map(c=>c.g||0));ok(sp<=1.0,k+' の聞き比べの推定音量差が1dBを超える '+sp.toFixed(2)+'dB');ok(st.cmp.some(c=>c.g!==undefined),k+' に g が無い')});
console.log(err?('失敗 '+err+'件'):'OK: SEコース '+LS.length+'本(構造・シーン定義・エネルギーの曲線・目安表との一致・場面と目標範囲の整合・EQ比較の音量差'+nC+'件)');process.exit(err?1:0);
