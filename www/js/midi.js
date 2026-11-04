/* MIDI入力(Web MIDI API)。parse は純粋関数(test/midi.js が検査)。
   Midi.start() で機器を探し、接続中の入力すべて(オムニ)から受け取る。
   Midi.on(msg)   : msg={t:'on'|'off',n,v,ch} / {t:'cc',c,v,ch}
   Midi.state()   : 接続・切断・状態の変化のたびに呼ばれる
   Midi.names     : 接続中の機器名の配列
   Midi.status    : 'idle'(未開始)|'unsupported'|'denied'|'none'(機器なし)|'ok' */
(function(){
const SD=window.SD=window.SD||{};
function parse(d){
 if(!d||d.length<1)return null;
 const s=d[0];if(s<0x80||s>=0xF0)return null;
 const t=s&0xF0,ch=s&15,a=(d[1]|0)&127,b=(d[2]|0)&127;
 if(t===0x90)return b?{t:'on',ch,n:a,v:b}:{t:'off',ch,n:a,v:0};
 if(t===0x80)return{t:'off',ch,n:a,v:b};
 if(t===0xB0)return{t:'cc',ch,c:a,v:b};
 return null;
}
const M={acc:null,names:[],status:'idle',on:null,state:null,parse,
 supported(){return typeof navigator!=='undefined'&&typeof navigator.requestMIDIAccess==='function'},
 start(){
  if(!M.supported()){M.status='unsupported';M.names=[];M.fire();return Promise.resolve(false)}
  if(M.acc){M.scan();return Promise.resolve(true)}
  return navigator.requestMIDIAccess({sysex:false}).then(a=>{M.acc=a;a.onstatechange=()=>M.scan();M.scan();return true})
   .catch(()=>{M.status='denied';M.names=[];M.fire();return false});
 },
 scan(){
  const names=[];
  if(M.acc)M.acc.inputs.forEach(i=>{
   if(i.state==='disconnected'){i.onmidimessage=null;return}
   i.onmidimessage=M.msg;names.push(i.name||'MIDI')});
  M.names=names;M.status=names.length?'ok':'none';M.fire();
 },
 msg(e){const m=parse(e.data);if(m&&M.on)M.on(m)},
 fire(){if(M.state)M.state()}
};
SD.Midi=M;
})();
