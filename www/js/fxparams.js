/* FXつまみ(mixdefs.js の SD.FXP)を、すべてのシンセの定義に足す。旧データに無いIDは既定値で読まれる */
(function(){
 Object.keys(SD.defs).forEach(function(sy){
  var D=SD.defs[sy],fx=D.T.find(function(t){return t.id==='fx'});
  SD.FXP.forEach(function(p){
   if(D.byId[p.id])return;
   var q=Object.assign({},p);D.P.push(q);D.byId[q.id]=q;D.DEF[q.id]=q.def;
   if(fx&&fx.items.indexOf(q.id)<0){fx.items.push(q.id);if(fx.at)fx.at[q.id]=['1','3']}/* 配置はRACK表示では使わない(検査用) */
  });
 });
 SD.P=SD.defs.analog.P;SD.byId=SD.defs.analog.byId;SD.DEF=SD.defs.analog.DEF;
})();
