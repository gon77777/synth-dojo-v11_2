/* ウェーブテーブル生成: 8種×64フレーム×2048サンプル。各フレームは倍音スペクトルから作り、
   折り返し防止のため倍音数を半分ずつ減らした11段階(帯域制限ミップ)を持つ。 */
(function(){
var N=2048,NF=64,NL=11,HM=1023,PI=Math.PI;
function fft(re,im,inv){
 var n=re.length,i,j=0,b,t,len,k;
 for(i=1;i<n;i++){b=n>>1;for(;j&b;b>>=1)j^=b;j^=b;if(i<j){t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t}}
 for(len=2;len<=n;len<<=1){
  var a=(inv?2:-2)*PI/len,wr=Math.cos(a),wi=Math.sin(a),h=len>>1;
  for(i=0;i<n;i+=len){var cr=1,ci=0;
   for(k=0;k<h;k++){var u=i+k,v=u+h,xr=re[v]*cr-im[v]*ci,xi=re[v]*ci+im[v]*cr;
    re[v]=re[u]-xr;im[v]=im[u]-xi;re[u]+=xr;im[u]+=xi;t=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=t}}}
 if(inv)for(i=0;i<n;i++){re[i]/=n;im[i]/=n}
}
function hash(a,b){var h=(Math.imul(a,374761393)+Math.imul(b,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296}
function lerp(a,b,f){return a+(b-a)*f}
/* s[k]=sin成分, c[k]=cos成分 の係数を埋める。x=0..1(フレーム位置) */
var BAS=[
 function(k){return k===1?1:0},
 function(k){return k%2?((k-1)/2%2?-1:1)*8/(PI*PI)/(k*k):0},
 function(k){return(k%2?1:-1)*2/PI/k},
 function(k){return k%2?4/PI/k:0}
];
var VW=[[800,1200,2900],[300,2300,3000],[320,1250,2700],[500,1900,2800],[500,900,2800]],VA=[1,.6,.3];
var OG=[[1,.3,0,0,0,0,0,0],[1,.8,.9,.6,.5,.4,.3,.2],[1,.5,.8,.7,.5,.6,.4,.3],[.6,.5,1,.8,.9,.9,.8,.7],[.2,.2,.5,.4,.8,1,1,1]],OH=[1,2,3,4,6,8,10,12];
var MR=[1,2.76,5.4,8.93,11.34,13.7,18.64];
var GEN={
 basic:function(x,s,c){var g=x*3,i=Math.min(2,Math.floor(g)),fr=g-i,A=BAS[i],B=BAS[i+1];for(var k=1;k<=HM;k++)s[k]=lerp(A(k),B(k),fr)},
 pwm:function(x,s,c){var w=.5-.45*x;for(var k=1;k<=HM;k++){var m=2/(k*PI)*Math.sin(k*PI*w);s[k]=m*Math.sin(k*PI*w);c[k]=m*Math.cos(k*PI*w)}},
 harm:function(x,s,c,f){for(var k=1;k<=f+1&&k<=HM;k++)s[k]=1/k},
 vowel:function(x,s,c){var g=x*4,i=Math.min(3,Math.floor(g)),fr=g-i,F=[0,1,2].map(function(j){return lerp(VW[i][j],VW[i+1][j],fr)});
  for(var k=1;k<=400;k++){var fq=k*110,a=.04;for(var j=0;j<3;j++){var bw=80+.08*F[j],d=(fq-F[j])/bw;a+=VA[j]*Math.exp(-.5*d*d)}s[k]=a*Math.pow(k,-.6)}},
 metal:function(x,s,c){var sc=1+x*1.6;s[1]=.6;
  for(var j=1;j<MR.length;j++){var k=Math.round(MR[j]*sc);if(k>HM)continue;var a=Math.pow(j+1,-.6),ph=j*1.7;s[k]+=a*Math.cos(ph);c[k]+=a*Math.sin(ph)}},
 organ:function(x,s,c){var g=x*4,i=Math.min(3,Math.floor(g)),fr=g-i;for(var j=0;j<8;j++)s[OH[j]]+=lerp(OG[i][j],OG[i+1][j],fr)},
 noise:function(x,s,c,f){for(var k=1;k<=400;k++){var a=Math.pow(k,-(1-x*.6))*(1-x*.7+x*1.4*hash(f+999,k)),ph=x*hash(f,k)*2*PI;s[k]=a*Math.cos(ph);c[k]=a*Math.sin(ph)}}
};
function digital(x,re,im){var hold=1+Math.floor(x*x*60),Q=2+Math.floor((1-x)*30);
 for(var i=0;i<N;i++){var j=Math.floor(i/hold)*hold,v=2*j/N-1;re[i]=Math.round(v*Q/2)/(Q/2);im[i]=0}}
var USERD={a:[1].concat(new Array(31).fill(0)),b:Array.apply(null,Array(32)).map(function(_,i){return 1/(i+1)})};
function userGen(ud){var a=ud.a,b=ud.b;return function(x,s){for(var k=1;k<=32;k++)s[k]=lerp(a[k-1]||0,b[k-1]||0,x)}}
/* 自作テーブルの1フレーム(プレビュー用): 倍音32本(sin成分)から n サンプルの波形を作り、ピークを1に正規化 */
function userFrame(ud,x,n){var out=new Float32Array(n),pk=1e-9,i,k;
 for(k=1;k<=32;k++){var a=lerp(ud.a[k-1]||0,ud.b[k-1]||0,x);if(a>1e-6)for(i=0;i<n;i++)out[i]+=a*Math.sin(2*PI*k*i/n)}
 for(i=0;i<n;i++)pk=Math.max(pk,Math.abs(out[i]));for(i=0;i<n;i++)out[i]/=pk;return out}
/* 段階処理できる生成器。fill(f,x,s,c,re,im)がフレームfの倍音係数(s,c)を埋める。raw=trueなら係数をそのまま使う(エネルギー正規化なし)。
   step(n)でnフレームずつ進める(画面を止めないため)。build()は一気に最後まで進める。 */
function Builder(id,fill,raw){this.id=id;this.fill=fill;this.raw=!!raw;this.f=0;
 this.lv=new Float32Array(NL*NF*N);this.re=new Float64Array(N);this.im=new Float64Array(N);this.s=new Float64Array(N/2);this.c=new Float64Array(N/2)}
Builder.prototype.step=function(nf){
 var lv=this.lv,re=this.re,im=this.im,s=this.s,c=this.c,end=Math.min(NF,this.f+nf),k,l,i;
 for(var f=this.f;f<end;f++){
  var x=f/(NF-1);s.fill(0);c.fill(0);
  this.fill(f,x,s,c,re,im);
  var e=0,km=1;for(k=1;k<=HM;k++){var q=s[k]*s[k]+c[k]*c[k];e+=q;if(q>1e-12)km=k}
  var g=this.raw?1:(e>1e-12?.5/Math.sqrt(e/2):0);
  for(l=0;l<NL;l++){
   var o=(l*NF+f)*N,mh=Math.min(HM,1024>>l);
   if(l>0&&mh>=km){lv.copyWithin(o,f*N,f*N+N);continue}
   re.fill(0);im.fill(0);
   for(k=1;k<=mh;k++){var ar=c[k]*g*N/2,ai=-s[k]*g*N/2;re[k]=ar;im[k]=ai;re[N-k]=ar;im[N-k]=-ai}
   fft(re,im,true);
   if(l===0){var pk=0;for(i=0;i<N;i++)pk=Math.max(pk,Math.abs(re[i]));if(pk>1.2){var sc=1.2/pk;g*=sc;for(i=0;i<N;i++)re[i]*=sc}}
   for(i=0;i<N;i++)lv[o+i]=re[i];
  }}
 this.f=end;return end>=NF};
Builder.prototype.table=function(){return {id:this.id,N:N,NF:NF,NL:NL,levels:this.lv}};
function builtinFill(id,ud){
 var ug=id==='user'?userGen(ud||USERD):null;
 return function(f,x,s,c,re,im){
  if(id==='digital'){digital(x,re,im);fft(re,im,false);for(var k=1;k<=HM;k++){c[k]=2*re[k]/N;s[k]=-2*im[k]/N}}
  else (ug||GEN[id])(x,s,c,f);
 }}
function build(id,ud){var b=new Builder(id,builtinFill(id,ud),false);b.step(NF);return b.table()}
var cache=[];
function get(id,ud){
 if(id==='user')return build(id,ud);
 for(var i=0;i<cache.length;i++)if(cache[i].id===id){var t=cache.splice(i,1)[0];cache.push(t);return t}
 var t2=build(id);cache.push(t2);if(cache.length>3)cache.shift();return t2;
}
/* フォールバック用: 1フレーム(Float32Array 2048)→PeriodicWave用の倍音係数 */
function harm(fr,K){K=K||256;var re=new Float64Array(N),im=new Float64Array(N);for(var i=0;i<N;i++)re[i]=fr[i];fft(re,im,false);
 var R=new Float32Array(K+1),I=new Float32Array(K+1);for(var k=1;k<=K;k++){R[k]=2*re[k]/N;I[k]=-2*im[k]/N}return {real:R,imag:I}}
SD.WTD={Builder:Builder,USER_DEFAULT:USERD,userFrame:userFrame,N:N,NF:NF,NL:NL,ids:['basic','pwm','harm','vowel','digital','metal','organ','noise'],build:build,get:get,harm:harm,fft:fft};
})();
