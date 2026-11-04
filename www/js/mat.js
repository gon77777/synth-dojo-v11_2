/* 素材基盤(v1.0): 内蔵8素材をコードで合成する。外部ファイル無し。
   素材ID: 内蔵は 'b:voice' のように b: 、取り込みは u: を予約(v1.5)。
   SD.MAT.get(id) → {id,name,data:Float32Array(mono),sr,peaks:Float32Array(800)}  生成は初回のみ(遅延)。キャッシュは最大3つ。
   SD.WaveView: 全体波形+位置の線+範囲の帯を重ねるキャンバス部品(グラニュラー以外でも使える)。 */
(function(){
var SR=44100,PI=Math.PI,TAU=PI*2,NP=800,PEAK=.9,MAXC=3;
function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function mtof(m){return 440*Math.pow(2,(m-69)/12)}
function mk(sec){return new Float32Array(Math.round(sec*SR))}
function norm(d){
 var n=d.length,e=Math.min(132,n>>1),i,m=0;
 for(i=0;i<e;i++){var g=i/e;d[i]*=g;d[n-1-i]*=g}
 for(i=0;i<n;i++){if(!isFinite(d[i]))d[i]=0;var a=Math.abs(d[i]);if(a>m)m=a}
 if(m>0){var k=PEAK/m;for(i=0;i<n;i++)d[i]*=k}
 return d;
}
/* フォルマント合成: 倍音を足し合わせ、母音の山(F1〜F3)で振幅を決める。fm(t)→[F1,F2,F3] */
function formant(sec,f0,fm,seed){
 var d=mk(sec),n=d.length,H=44,ph=new Float64Array(H+1),am=new Float64Array(H+1),B=256,r=rng(seed),p0=0,F=[0,0,0],i,k,b;
 for(i=0;i<n;i+=B){
  var t=i/SR,f=f0*(1+.012*Math.sin(TAU*5.2*t)+.004*Math.sin(TAU*.7*t)),fr=fm(t);
  for(k=1;k<=H;k++){var hz=f*k,g=0;
   for(b=0;b<3;b++){var x=(hz-fr[b])/(fr[b]*.12+40);g+=(b?.55/b:1)*Math.exp(-x*x)}
   am[k]=hz<SR/2.2?g/k:0}
  var e=Math.min(n,i+B);
  for(var j=i;j<e;j++){
   p0+=TAU*f/SR;var s=0;
   for(k=1;k<=H;k++)if(am[k]>1e-4)s+=am[k]*Math.sin(p0*k);
   d[j]=s*(1+.03*(r()-.5))*(.8+.2*Math.sin(TAU*5.2*j/SR));
  }
 }
 return norm(d);
}
var VW={a:[800,1200,2900],i:[300,2300,3000],u:[320,1250,2700],e:[500,1900,2800],o:[500,900,2800]};
function mixF(a,b,x){return[a[0]+(b[0]-a[0])*x,a[1]+(b[1]-a[1])*x,a[2]+(b[2]-a[2])*x]}
function ease(x){return x*x*(3-2*x)}
var GEN={
 voice:function(){return formant(6,196,function(){return VW.a},11)},
 vowels:function(){var q=['a','i','u','e','o'],L=6/5;
  return formant(6,170,function(t){var s=Math.min(4.999,t/L),i=Math.floor(s),f=s-i,x=f<.7?0:ease((f-.7)/.3);return mixF(VW[q[i]],VW[q[Math.min(4,i+1)]],x)},23)},
 piano:function(){var d=mk(6),n=d.length,N=[48,51,55,58,62],i,k,j;
  for(j=0;j<N.length;j++){var f=mtof(N[j]),st=j*.035,ga=.6/(1+j*.1);
   for(k=1;k<=12;k++){var fk=f*k*Math.sqrt(1+.0004*k*k);if(fk>SR/2.3)break;
    var tau=2.4/(1+.55*k),a=ga/(k*.9+.1),ph=j*1.3+k*.7,s0=Math.round(st*SR);
    for(i=s0;i<n;i++){var t=(i-s0)/SR,e=Math.exp(-t/tau);if(e<1e-4)break;d[i]+=a*e*Math.sin(TAU*fk*t+ph)*(1-Math.exp(-t*600))}}}
  return norm(d)},
 bell:function(){var d=mk(8),n=d.length,R=[.56,.92,1.19,1.71,2,2.74,3,3.76,4.07],A=[1,.7,.9,.6,.5,.4,.35,.25,.2],S=[[392,0],[523.25,3.8]],i,k,s;
  for(s=0;s<2;s++){var f=S[s][0],s0=Math.round(S[s][1]*SR);
   for(k=0;k<R.length;k++){var fk=f*R[k],tau=3.2/(1+.45*k);
    for(i=s0;i<n;i++){var t=(i-s0)/SR,e=Math.exp(-t/tau);if(e<1e-4)break;d[i]+=A[k]*e*Math.sin(TAU*fk*t+k)}}}
  return norm(d)},
 strings:function(){var d=mk(6),n=d.length,f=mtof(48),a1=0,a2=0,p1=0,p2=0,lp=0,i,d1=Math.pow(2,6/1200),d2=Math.pow(2,-6/1200);
  for(i=0;i<n;i++){var t=i/SR,env=Math.min(1,t/1.5)*Math.min(1,(6-t)/.8),vib=1+.003*Math.sin(TAU*5*t)*Math.min(1,t/1.5);
   p1+=f*d1*vib/SR;p2+=f*d2*vib/SR;p1-=Math.floor(p1);p2-=Math.floor(p2);
   var x=(p1*2-1)+(p2*2-1);lp+=(x-lp)*.22;d[i]=lp*env}
  return norm(d)},
 pluck:function(){var d=mk(6),n=d.length,M=[60,64,67,71],i,j,r=rng(31);
  for(j=0;j<4;j++){var f=mtof(M[j]),L=Math.max(2,Math.round(SR/f)),buf=new Float32Array(L),s0=Math.round(j*1.4*SR),p=0,prev=0;
   for(i=0;i<L;i++)buf[i]=r()*2-1;
   for(i=s0;i<n;i++){var q=(p+1)%L,v=(buf[p]+buf[q])*.5*.9965;d[i]+=buf[p];buf[p]=v;p=q}}
  return norm(d)},
 beat:function(){var bpm=90,st=60/bpm/4,d=mk(st*32),n=d.length,r=rng(47),i;
  function kick(s){for(i=s;i<Math.min(n,s+Math.round(.35*SR));i++){var t=(i-s)/SR;d[i]+=1.1*Math.sin(TAU*(45*t+105*(1-Math.exp(-t*28))/28))*Math.exp(-t*9)}}
  function snare(s){var lp=0;for(i=s;i<Math.min(n,s+Math.round(.28*SR));i++){var t=(i-s)/SR,x=r()*2-1;lp+=(x-lp)*.55;d[i]+=(.55*(x-lp*.4)+.5*Math.sin(TAU*185*t))*Math.exp(-t*17)}}
  function hat(s,len,v){var p=0;for(i=s;i<Math.min(n,s+Math.round(len*SR));i++){var t=(i-s)/SR,x=r()*2-1;d[i]+=v*(x-p)*Math.exp(-t/(len/5));p=x}}
  var K=[0,7,10,16,23,26,28],Sn=[4,12,20,28];
  K.forEach(function(x){kick(Math.round(x*st*SR))});Sn.forEach(function(x){snare(Math.round(x*st*SR))});
  for(var h=0;h<32;h+=2)hat(Math.round(h*st*SR),h%8===6?.14:.045,h%4===0?.3:.2);
  return norm(d)},
 noise:function(){var d=mk(6),n=d.length,r=rng(59),lo=0,bd=0,i;
  for(i=0;i<n;i++){var t=i/SR,fc=180*Math.pow(6000/180,t/6),f=2*Math.sin(PI*fc/SR),q=.35;
   var x=r()*2-1;lo+=f*bd;var hi=x-lo-q*bd;bd+=f*hi;d[i]=lo*(.3+.7*t/6)}
  return norm(d)}
};
var LIST=[
 {id:'b:voice',key:'voice',name:'VOICE',label:'声風の持続音'},
 {id:'b:vowels',key:'vowels',name:'VOWELS',label:'あいうえお'},
 {id:'b:piano',key:'piano',name:'PIANO',label:'和音(Cm7)'},
 {id:'b:bell',key:'bell',name:'BELL',label:'鐘'},
 {id:'b:strings',key:'strings',name:'STRINGS',label:'弦風'},
 {id:'b:pluck',key:'pluck',name:'PLUCK',label:'撥弦(4音)'},
 {id:'b:beat',key:'beat',name:'BEAT',label:'ドラムループ'},
 {id:'b:noise',key:'noise',name:'NOISE SWEEP',label:'ノイズの上昇'}
];
function peaks(d){var p=new Float32Array(NP),n=d.length,i,b;
 for(b=0;b<NP;b++){var a=Math.floor(b*n/NP),e=Math.max(a+1,Math.floor((b+1)*n/NP)),m=0;for(i=a;i<e&&i<n;i++){var v=Math.abs(d[i]);if(v>m)m=v}p[b]=m}
 return p}
var cache=[];
var MAT={
 SR:SR,list:LIST,peaks:peaks,
 ids:LIST.map(function(x){return x.id}),
 info:function(id){for(var i=0;i<LIST.length;i++)if(LIST[i].id===id)return LIST[i];return null},
 get:function(id){
  for(var i=0;i<cache.length;i++)if(cache[i].id===id){var c=cache.splice(i,1)[0];cache.push(c);return c}
  var inf=MAT.info(id);if(!inf)return null;
  var data=GEN[inf.key](),m={id:id,name:inf.name,data:data,sr:SR,peaks:peaks(data)};
  cache.push(m);while(cache.length>MAXC)cache.shift();return m},
 cached:function(){return cache.map(function(x){return x.id})},
 clear:function(){cache.length=0}
};
SD.MAT=MAT;

/* 波形表示: 全体波形+位置の線+範囲の帯。pos/range は 0〜1。 */
function WaveView(cv){this.cv=cv;this.m=null;this.pos=null;this.range=null;this.mark=null}
WaveView.prototype={
 setMat:function(m){this.m=m;this.draw()},
 setPos:function(p){this.pos=p;this.draw()},
 setRange:function(a,b){this.range=a==null?null:[Math.max(0,Math.min(a,b)),Math.min(1,Math.max(a,b))];this.draw()},
 draw:function(){
  var cv=this.cv;if(!cv||!cv.getContext)return;
  var dp=window.devicePixelRatio||1,w=cv.clientWidth||300,h=cv.clientHeight||80;
  if(cv.width!==Math.round(w*dp)||cv.height!==Math.round(h*dp)){cv.width=Math.round(w*dp);cv.height=Math.round(h*dp)}
  var g=cv.getContext('2d');if(!g)return;
  var cs=window.getComputedStyle?getComputedStyle(cv):null,col=function(n,d){var v=cs&&cs.getPropertyValue(n);return v&&v.trim()||d};
  g.setTransform(dp,0,0,dp,0,0);g.clearRect(0,0,w,h);
  g.fillStyle=col('--bg','#0e1620');g.fillRect(0,0,w,h);
  if(this.range){g.fillStyle='rgba(255,190,60,.22)';g.fillRect(this.range[0]*w,0,Math.max(1,(this.range[1]-this.range[0])*w),h)}
  g.strokeStyle=col('--ln','#2a3a4a');g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();
  if(this.m){var p=this.m.peaks,np=p.length,mid=h/2;g.fillStyle=col('--ac2','#4fc3f7');
   for(var x=0;x<w;x++){var a=Math.floor(x*np/w),e=Math.max(a+1,Math.floor((x+1)*np/w)),m=0;for(var i=a;i<e&&i<np;i++)if(p[i]>m)m=p[i];var hh=Math.max(1,m*mid*.95);g.fillRect(x,mid-hh,1,hh*2)}}
  if(this.pos!=null){g.strokeStyle=col('--ac','#ffbe3c');g.lineWidth=2;var px=Math.round(Math.max(0,Math.min(1,this.pos))*(w-1))+.5;g.beginPath();g.moveTo(px,0);g.lineTo(px,h);g.stroke();g.lineWidth=1}
 }
};
SD.WaveView=WaveView;
})();
