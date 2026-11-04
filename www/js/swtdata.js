/* サンプル由来ウェーブテーブル(v2.2 変換コア→v2.3 完成版)。
   素材(モノラルFloat32Array)を64等分した各位置から「1周期の波形(2048点)」を作り、WTと同じ形式のテーブル
   (64フレーム×2048点+11段階の帯域制限ミップ)にする。音程は必ず鍵盤に従う(録音の元のピッチ・長さは残らない)。
   v2.3: SPECTRUMモード(位相ZERO/KEEP/RANDOM)・範囲(START/END)・SMOOTH(隣のフレームとのなめらかさ)・取り込み素材(u:)に対応。
   変換は2段階: ①各フレームの倍音係数と音量を求める(0〜63) ②ミップ生成(0〜63)。step(n)でnフレームずつ進められる。
   結果は最後の1つだけメモリに保持する(SD.SWT.peek)。 */
(function(){
var N=2048,NF=64,HM=1023,PI=Math.PI,TARGET=.9,DEF_CYC=.02,AUTO_BELOW=.005;
var fft=SD.WTD.fft;
function cl(v,a,b){return v<a?a:v>b?b:v}
function at(d,i){return i<0||i>=d.length?0:d[i]}
/* 3次補間(Catmull-Rom)。範囲外は0 */
function rd(d,x){var i=Math.floor(x),t=x-i,p0=at(d,i-1),p1=at(d,i),p2=at(d,i+1),p3=at(d,i+2);
 return p1+.5*t*(p2-p0+t*(2*p0-5*p1+4*p2-p3+t*(3*(p1-p2)+p3-p0)))}
/* 出力1点が素材r個ぶん(r>1.5)に当たるときは平均して折り返しを防ぐ */
function smp(d,x,r,m){if(m<=1)return rd(d,x);var s=0,i;for(i=0;i<m;i++)s+=rd(d,x+((i+.5)/m-.5)*r);return s/m}

/* 範囲(0〜1)を正規化: 範囲外は丸め、逆順は入れ替え、狭すぎる場合は最小幅にする */
function range(a,b){a=+a;b=+b;if(!isFinite(a))a=0;if(!isFinite(b))b=1;a=cl(a,0,1);b=cl(b,0,1);
 if(a>b){var t=a;a=b;b=t}
 if(b-a<.001){if(a+.001<=1)b=a+.001;else{a=.999;b=1}}
 return[a,b]}
function normOpts(o){o=o||{};var r=range(o.a==null?0:o.a,o.b==null?1:o.b),cy=+o.cycle,sm=+o.smooth;
 return{mat:o.mat||'b:voice',cycle:isFinite(cy)&&cy>0?cl(cy,.0025,.1):.0025,align:o.align!==false,norm:o.norm!==false,a:r[0],b:r[1],
  mode:o.mode==='spectrum'?'spectrum':'cycle',phase:o.phase==='keep'||o.phase==='random'?o.phase:'zero',smooth:isFinite(sm)?cl(sm,0,1):0}}
/* つまみの値(SD.defs.wtのp)→変換の指定 */
function optsFrom(p){return normOpts({mat:p.wsMat,cycle:p.wsCycle,align:p.wsAlign!=='off',norm:p.wsNorm!=='off',a:p.wsStart,b:p.wsEnd,mode:p.wsMode,phase:p.wsPhase,smooth:p.wsSmooth})}
/* 結果に効かない設定(SPECTRUM時のCYCLE/ALIGN、CYCLE時のPHASE)はキーに入れない(つまみを動かしても再変換しない) */
function key(o){var m=o.mode==='spectrum';return[o.mat,m?'S':'C',m?o.phase:Math.round(o.cycle*1e5)+(o.align?'a':'n'),o.norm?1:0,Math.round(o.a*1e4),Math.round(o.b*1e4),Math.round(o.smooth*1e3)].join('|')}
/* 素材があるか。u:は読み込み済みの一覧(SD.UMAT)で確かめる。一覧が未読込なら「分からない」ので有りとする */
function exists(id){
 if(SD.UMAT&&SD.UMAT.isU(id))return SD.UMAT.ready?!!SD.UMAT.find(id):true;
 return!!SD.MAT.info(id)}
function hash(a){var h=Math.imul(a|0,374761393)+668265263|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
function isAuto(c){return c<AUTO_BELOW}

/* ---- ピッチ検出(自己相関)。素材の範囲から最大6か所を調べ、周期(サンプル数)の中央値を返す。取れなければ0 ---- */
function detect(d,sr,a0,b0){
 var len=b0-a0,W=3000,minLag=Math.max(8,Math.floor(sr/1000)),maxLag=Math.floor(sr/60),K=6,j,i,l;
 if(len<W+maxLag+8)return 0;
 var span=len-W-maxLag,wins=[],emax=0;
 for(j=0;j<K;j++){var st=Math.floor(a0+(j+.5)/K*span),e=0;for(i=0;i<W;i++){var v=at(d,st+i);e+=v*v}wins.push({st:st,e:e});if(e>emax)emax=e}
 if(emax<1e-9)return 0;
 var per=[],qual=0,r=new Float64Array(maxLag+2),cs=new Float64Array(W+maxLag+1);
 for(j=0;j<K;j++){
  var w=wins[j];if(w.e<.1*emax)continue;qual++;
  for(i=0;i<W+maxLag;i++){var x=at(d,w.st+i);cs[i+1]=cs[i]+x*x}
  var e0=cs[W],rmax=0;
  for(l=minLag;l<=maxLag;l++){
   var nu=0;for(i=0;i<W;i++)nu+=d[w.st+i]*d[w.st+i+l];
   var e1=cs[W+l]-cs[l],dn=Math.sqrt(e0*e1);r[l]=dn>1e-12?nu/dn:0;if(r[l]>rmax)rmax=r[l]}
  if(rmax<.8)continue;
  /* 最初の山(lag=0付近の丸い部分)は飛ばす: rが一度0を下回ってから探す。低い音(周期が長い)・ノイズはここで外れる */
  var z=-1;for(l=minLag;l<=maxLag;l++)if(r[l]<0){z=l;break}
  if(z<0)continue;
  for(l=Math.max(minLag+1,z);l<maxLag;l++){
   if(r[l]>=.93*rmax&&r[l]>r[l-1]&&r[l]>=r[l+1]){
    var a=r[l-1],b=r[l],c=r[l+1],dd=a-2*b+c,dl=dd<-1e-12?.5*(a-c)/dd:0;
    per.push(l+cl(dl,-1,1));break}}
 }
 if(!per.length||per.length<Math.max(1,Math.ceil(qual/3)))return 0;
 per.sort(function(x,y){return x-y});
 return per[per.length>>1];
}

/* ---- CYCLE: 位置cを中心に長さP(サンプル)ぶんを切り出し、2048点にリサンプルして周期波形にする ---- */
function alignStart(d,s0,span){
 var a=Math.ceil(s0),b=Math.floor(s0+span);
 for(var i=a;i<=b;i++){var x1=at(d,i-2),x0=at(d,i-1),y0=at(d,i),y1=at(d,i+1);
  if(x1<0&&x0<0&&y0>=0&&y1>0)return i-1+(-x0)/(y0-x0)}
 return s0}
function cycleFrame(d,c,P,align,out){
 var s0=c-P/2,r=P/N,M=Math.round(N*.12),m=r>1.5?Math.ceil(r*2):1,i;
 if(align)s0=alignStart(d,s0,P);
 for(i=0;i<N;i++){
  var u=i*r,x=smp(d,s0+u,r,m);
  if(i>=N-M){var t=(i-(N-M))/M;x=(1-t)*x+t*smp(d,s0+u-P,r,m)}   /* 末尾は1周期前とクロスフェード(つなぎ目を消す) */
  out[i]=x}
}
/* 波形w(2048点)→倍音係数。DC除去。kmaxより上の倍音は0(素材が持っていない帯域のリサンプル雑音を捨てる) */
function toCoef(w,kmax,s,c,re,im){
 var i,k,mean=0;for(i=0;i<N;i++)mean+=w[i];mean/=N;
 for(i=0;i<N;i++){re[i]=w[i]-mean;im[i]=0}
 fft(re,im,false);
 for(k=1;k<=HM;k++){if(k>kmax){s[k]=0;c[k]=0}else{c[k]=2*re[k]/N;s[k]=-2*im[k]/N}}
}
function peakOf(s,c,re,im){
 var k,i,pk=0;re.fill(0);im.fill(0);
 for(k=1;k<=HM;k++){var ar=c[k]*N/2,ai=-s[k]*N/2;re[k]=ar;im[k]=ai;re[N-k]=ar;im[N-k]=-ai}
 fft(re,im,true);for(i=0;i<N;i++){var v=Math.abs(re[i]);if(v>pk)pk=v}
 return pk}

/* ---- SPECTRUM: 位置cの2048点(ハン窓)をFFTし、第kビンの強さを「第k倍音の強さ」に写す。素材の元のピッチは残らない ---- */
function specFrame(d,c,phase,s,cc,re,im){
 var s0=Math.round(c-N/2),i,k;
 for(i=0;i<N;i++){re[i]=at(d,s0+i)*(.5-.5*Math.cos(2*PI*i/N));im[i]=0}
 fft(re,im,false);
 for(k=1;k<=HM;k++){
  var xr=2*re[k]/N,xi=-2*im[k]/N;                    /* KEEP: 元の位相(x=c·cos+s·sin) */
  if(phase==='keep'){cc[k]=xr;s[k]=xi;continue}
  var mag=Math.sqrt(xr*xr+xi*xi);
  if(phase==='random'){var ph=2*PI*hash(k);cc[k]=mag*Math.cos(ph);s[k]=-mag*Math.sin(ph)}   /* 固定の乱数(全フレーム共通) */
  else{cc[k]=mag;s[k]=0}}                                                                  /* ZERO: 全部そろえる */
}

/* ---- 変換ジョブ ---- */
function Job(mat,o){
 this.o=normOpts(o);this.err=null;this.done=false;this.table=null;this.info=null;
 this.ph=0;this.i=0;this.t0=Date.now();this.ms=0;
 if(!mat||!mat.data||!(mat.sr>0)||mat.data.length<64){this.fail('nomat','素材を読み込めません');return}
 var d=mat.data,pk=0,i;for(i=0;i<d.length;i++){var v=d[i]<0?-d[i]:d[i];if(v>pk)pk=v}
 if(!(pk>1e-4)){this.fail('silent','無音の素材はテーブルにできません');return}
 this.d=d;this.sr=mat.sr;this.a0=this.o.a*d.length;this.b0=this.o.b*d.length;this.short=(this.b0-this.a0)/mat.sr<.1;
 this.S=[];this.C=[];this.pk=new Float64Array(NF);
 this.w=new Float64Array(N);this.re=new Float64Array(N);this.im=new Float64Array(N);
 this.P=0;this.auto=isAuto(this.o.cycle);this.found=false;this.inited=false;
}
Job.prototype.fail=function(code,msg){this.err={code:code,msg:msg};this.done=true;this.ms=Date.now()-this.t0};
Job.prototype.init=function(){
 var sr=this.sr;this.inited=true;
 if(this.o.mode==='spectrum'){this.P=N;this.kmax=HM;return}
 if(this.auto){var p=detect(this.d,sr,this.a0,this.b0);this.found=p>0;this.P=p>0?p:DEF_CYC*sr}
 else this.P=this.o.cycle*sr;
 this.kmax=Math.min(HM,Math.floor(this.P/2));if(this.kmax<1)this.kmax=1;
};
Job.prototype.frame=function(f){
 var c=this.a0+(f+.5)/NF*(this.b0-this.a0),s=new Float64Array(N/2),cc=new Float64Array(N/2);
 if(this.o.mode==='spectrum')specFrame(this.d,c,this.o.phase,s,cc,this.re,this.im);
 else{cycleFrame(this.d,c,this.P,this.o.align,this.w);toCoef(this.w,this.kmax,s,cc,this.re,this.im)}
 this.pk[f]=peakOf(s,cc,this.re,this.im);this.S[f]=s;this.C[f]=cc;
};
/* 音量: NORM ONはフレームごとにピークを揃える(全体の1%未満の小さなフレームは持ち上げすぎない)。OFFは全体で揃える */
/* SMOOTH: 隣り合うフレームの倍音係数をガウス状に重ねる(0〜100% → 幅σ0〜3フレーム)。端は重みを正規化 */
Job.prototype.smoothAll=function(){
 var sg=this.o.smooth*3,R=Math.ceil(sg*2),f,j,k,w=[],S2=[],C2=[];
 if(!(sg>0)||R<1)return;
 for(j=-R;j<=R;j++)w.push(Math.exp(-.5*j*j/(sg*sg)));
 for(f=0;f<NF;f++){
  var s=new Float64Array(N/2),c=new Float64Array(N/2),tw=0;
  for(j=-R;j<=R;j++){var g=f+j;if(g<0||g>=NF)continue;var wt=w[j+R],S=this.S[g],C=this.C[g];tw+=wt;for(k=1;k<=HM;k++){s[k]+=wt*S[k];c[k]+=wt*C[k]}}
  for(k=1;k<=HM;k++){s[k]/=tw;c[k]/=tw}
  S2.push(s);C2.push(c)}
 this.S=S2;this.C=C2;
 for(f=0;f<NF;f++)this.pk[f]=peakOf(this.S[f],this.C[f],this.re,this.im)};
Job.prototype.finishA=function(){
 this.smoothAll();
 var f,g=0;for(f=0;f<NF;f++)if(this.pk[f]>g)g=this.pk[f];
 if(!(g>1e-9)){this.fail('silent','この範囲は無音です');return false}
 this.gpk=g;this.gain=new Float64Array(NF);
 for(f=0;f<NF;f++)this.gain[f]=TARGET/(this.o.norm?Math.max(this.pk[f],.01*g):g);
 var self=this;
 this.b=new SD.WTD.Builder('sample',function(fr,x,s,c){var S=self.S[fr],C=self.C[fr],gn=self.gain[fr];for(var k=1;k<=HM;k++){s[k]=S[k]*gn;c[k]=C[k]*gn}},true);
 return true};
Job.prototype.progress=function(){return this.done?1:this.ph===0?this.i/NF*.5:.5+(this.b?this.b.f/NF*.5:0)};
Job.prototype.step=function(n){
 if(this.done)return 1;
 try{
  if(this.ph===0){
   if(!this.inited)this.init();
   var end=Math.min(NF,this.i+n);for(;this.i<end;this.i++)this.frame(this.i);
   if(this.i>=NF){if(!this.finishA())return 1;this.ph=1}
  }else if(this.b.step(n)){
   this.table=this.b.table();this.table.info=this.info={cycle:this.P/this.sr,auto:this.o.mode==='spectrum'?false:this.auto,found:this.found,a:this.o.a,b:this.o.b,mode:this.o.mode,phase:this.o.phase,smooth:this.o.smooth,short:this.short,sec:(this.b0-this.a0)/this.sr};
   this.done=true;this.ms=Date.now()-this.t0;this.S=this.C=this.b=null;
  }
 }catch(e){this.fail('fail',String(e&&e.message||e))}
 return this.progress();
};

/* ---- 公開API ---- */
var last=null;
/* 同期変換(テスト・小さい処理用): {table,info,key} か {err,key} */
function convert(mat,o){var j=new Job(mat,o);while(!j.done)j.step(NF);var k=key(j.o);
 return j.err?{err:j.err,key:k,ms:j.ms}:{table:j.table,info:j.info,key:k,ms:j.ms}}
function peek(k,id){return last&&last.key===k&&(id==null||exists(id))?last:null}
/* 非同期変換: 8フレームずつ進めて画面を止めない。delay(ms)の間に新しい要求が来たら呼び出し側がcancelする。
   h={prog:function(p),done:function(res)}  res={table,info,key} か {err,key}。戻り値のcancel()で中止 */
function request(o,h,delay){
 o=normOpts(o);var k=key(o),st={cancelled:false,t:0};
 function fin(res){if(!st.cancelled&&h.done)h.done(res)}
 function nomat(){fin({err:{code:'nomat',msg:'素材が見つかりません'},key:k})}
 function run(mat){
  if(st.cancelled)return;
  if(!mat){nomat();return}
  var j=new Job(mat,o);
  (function tick(){
   if(st.cancelled)return;
   j.step(8);if(h.prog)h.prog(j.progress());
   if(!j.done){st.t=setTimeout(tick,0);return}
   if(j.err){fin({err:j.err,key:k,ms:j.ms});return}
   last={table:j.table,info:j.info,key:k,ms:j.ms};fin(last)})();
 }
 function start(){
  if(st.cancelled)return;
  var hit=peek(k,o.mat);if(hit){fin(hit);return}
  if(!exists(o.mat)){nomat();return}
  var mat=SD.MAT.get(o.mat);
  if(!mat&&SD.UMAT&&SD.UMAT.isU(o.mat)){      /* 取り込み素材は端末の保存領域から読み込む(未読込のときは読み込み完了まで待つ) */
   SD.UMAT.load(o.mat).then(function(m){run(m)},function(){run(null)});return}
  run(mat);
 }
 st.t=setTimeout(start,delay||0);
 return{cancel:function(){st.cancelled=true;clearTimeout(st.t)}};
}
SD.SWT={N:N,NF:NF,AUTO_BELOW:AUTO_BELOW,DEF_CYCLE:DEF_CYC,range:range,normOpts:normOpts,optsFrom:optsFrom,key:key,isAuto:isAuto,
 convert:convert,request:request,peek:peek,exists:exists,reset:function(){last=null},Job:Job,detect:detect,cycleFrame:cycleFrame};
})();
