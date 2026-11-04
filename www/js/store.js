SD.VER=4;
SD.store={
  get(k,d){try{const v=localStorage.getItem('sd_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{localStorage.setItem('sd_'+k,JSON.stringify(v))}catch(e){}},
  dump(){const o={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.indexOf('sd_')===0){try{o[k.slice(3)]=JSON.parse(localStorage.getItem(k))}catch(e){}}}}catch(e){}return o},
  load(d){Object.keys(d||{}).forEach(k=>{if(k!=='ver')SD.store.set(k,d[k])})},
  /* v1(音色にsynth無し)→v2。v3=演奏設定(play)とパターン(pats)を追加 / v4=モジュラー音色(patchが{mods,cab,...})を追加(移行処理なし)。進捗はレッスンIDキーのため互換 */
  migrate(){
    const v=this.get('ver',1);
    if(v<2){const l=this.get('presets',[]);l.forEach(x=>{if(!x.synth)x.synth='analog'});this.set('presets',l)}
    if(v<SD.VER)this.set('ver',SD.VER);
  }
};
SD.store.migrate();
