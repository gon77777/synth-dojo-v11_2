/* au10(EQのオートメーション)の聞き比べ音量の「測定」(オフライン描画)。tools/au-eq-cal.js が cmp.g を出し、test/aueq.js が差1dB以内を検査する。
   test/cmest.js の描画(各トラックの素の音)を使い、EQ4をレーンに沿って動かす: 5msごとにレーンの値を読んで、6段のバイクアッド係数を作り直し、状態は引き継ぐ。
   cmp の各案は「tm(最初のつまみ値)+ ln(一時のレーン)」。レベルは、ループ全体(bars小節)のミックスの平均パワー(dB)。
   EQ以外のインサート(COMP・SATなど)は、au10 では使わないので通さない。node-web-audio-api が要る(無ければ測定は使えない)。 */
const path=require('path'),E=require('./cmest.js'),DSP=require(path.join(__dirname,'..','www','js','fxdsp.js'));
const SR=E.SR,BLK=240/* 5ms */,TPS_SEC=192/* BPM120: 1秒=2拍=192tick */;
/* x(Float32Array)に EQ4 をかける。m=最初のつまみ値(iEq*)。lanes=[{id,pts(正規化)}] は時間で値を上書きする */
function tvEq(SD,x,m,lanes){const A=SD.Auto,n=x.length,y=Float64Array.from(x),ls=lanes.map(l=>({l,p:A.defOf('analog',l.id)})),S=[0,1,2,3,4,5].map(()=>[0,0,0,0]);
 for(let s=0;s<n;s+=BLK){const e=Math.min(n,s+BLK),tick=s/SR*TPS_SEC,mm=Object.assign({},m);
  ls.forEach(q=>{const v=A.eval(q.l,tick);if(v!=null&&q.p)mm[q.l.id]=A.toValue(q.p,v)});
  DSP.eq4Stages(mm,SR).forEach((st,k)=>{const c=st.co,z=S[k];let x1=z[0],x2=z[1],y1=z[2],y2=z[3];
   for(let i=s;i<e;i++){const v=y[i],o=c[0]*v+c[1]*x1+c[2]*x2-c[3]*y1-c[4]*y2;x2=x1;x1=v;y2=y1;y1=o;y[i]=o}
   z[0]=x1;z[1]=x2;z[2]=y1;z[3]=y2})}
 return Float32Array.from(y)}
/* cmp の1案 v の、ミックス全体の平均パワー(dB)と、1小節ごとのパワー(dB)。{db, bars:[…]} */
async function cmpOne(SD,L,st,v){const bars=v.bars||st.bars||4,A=SD.Auto,au=v.ln?A.mkFromSpecs(v.ln,bars,(t,id)=>A.defOf('analog',id)):A.mk(bars),bufs=[];
 for(let k=0;k<L.tk.length;k++){const t=L.tk[k],dry=await E.trackDry(SD,L,t,bars),m=Object.assign({},SD.mxToMix(t.o.mx),(v.tm||{})[k+1]);
  const ls=au.lanes.filter(l=>l.trk===k&&!l.mute);bufs.push(m.iEqOn==1?tvEq(SD,dry,m,ls):dry)}
 const n=bufs[0].length,per=Math.floor(n/bars),bar=[];let tot=0;
 for(let b=0;b<bars;b++){let s=0;for(let i=b*per;i<(b+1)*per;i++){let a=0;bufs.forEach(f=>{a+=f[i]});s+=a*a}bar.push(10*Math.log10(s/per+1e-20));tot+=s}
 return{db:10*Math.log10(tot/(per*bars)+1e-20),bars:bar}}
/* ステップ st の各案: [{db,bars}]。測れない(描画が無い)ときは null */
async function stepLevelsAu(SD,L,st){if(!E.hasRender)return null;const r=[];for(const v of st.cmp||[])r.push(await cmpOne(SD,L,st,v));return r}
module.exports={tvEq,cmpOne,stepLevelsAu,loadSD:E.loadSD,hasRender:E.hasRender};
