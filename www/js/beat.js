/* 拍同期(FX-3a): トランスポート(seq.js)の「いまの拍位置」を、拍同期のエフェクト(リバース・グリッチ。FX-3b・3c)のワークレットへ渡す。DOM・AudioContext に依存しない(テスト可能)。
   方式: アンカー {t,b,bpm,run,n}(AudioContext の時刻 t に拍 b・テンポ bpm・run=再生中・n=再生開始の通し番号)を持ち、拍位置 = b + (t'-t)·bpm/60 で外挿する。ワークレット側(fx-src/beatbuf.js)も同じ式。
   アンカーを送るのは、再生開始(start)・停止(stop)・テンポ変更(setBpm。停止中)・トランスポートの再同期(at。再生中。外挿と合っていれば送らない)。
   再生中のテンポ変更は at() が担う: トランスポートは「次に鳴らすステップの時刻 te はこの拍」と告げるので、先読みで予約済みのステップ(古いテンポ)と新しいテンポの境目も、鳴る音と同じ格子になる。 */
var SD=window.SD=window.SD||{};
SD.BEATLEN=[[1/8,'1/8拍'],[1/4,'1/4拍'],[1/2,'1/2拍'],[1,'1拍'],[2,'2拍'],[4,'1小節']];   /* LEN の分割値(拍単位)。fx-src/beatbuf.js の LENS と同じ。1小節=4拍は 4/4 前提(MT で一般化) */
SD.Beat=class{
 constructor(){this.a={t:0,b:0,bpm:120,run:0,n:0};this.sinks=[]}
 pos(t){const a=this.a;return a.b+(t-a.t)*a.bpm/60}
 get(){return Object.assign({},this.a)}
 emit(){const m=this.get();this.sinks.slice().forEach(f=>{try{f(m)}catch(e){}})}
 /* 送り先(ワークレットの port.postMessage をくるんだ関数)をつなぐ。つないだ時点のアンカーをすぐ渡す。戻り値は外す関数 */
 attach(f){this.sinks.push(f);try{f(this.get())}catch(e){}return()=>{const i=this.sinks.indexOf(f);if(i>=0)this.sinks.splice(i,1)}}
 /* 再生開始: 時刻 t0 に拍0。通し番号 n を進める(ワークレットはここで区間・乱数を最初から始める) */
 start(t0,bpm){const a=this.a;this.a={t:t0,b:0,bpm:bpm>0?bpm:a.bpm,run:1,n:a.n+1};this.emit()}
 /* 停止: 時刻 t で止め、その後は最後のテンポで進み続ける(run=0) */
 stop(t){const a=this.a;if(!a.run)return;this.a={t,b:this.pos(t),bpm:a.bpm,run:0,n:a.n};this.emit()}
 /* 停止中のテンポ変更(再生中はトランスポートの at() が担うので何もしない) */
 setBpm(bpm,t){const a=this.a;if(a.run||!(bpm>0)||bpm===a.bpm)return;this.a={t,b:this.pos(t),bpm,run:0,n:a.n};this.emit()}
 /* 再生中: 「時刻 t は拍 b・テンポ bpm」。いまの外挿と合っていれば(約0.2サンプル以内)送らない。戻り値=送ったか */
 at(t,b,bpm){const a=this.a;if(a.run&&bpm===a.bpm&&Math.abs(this.pos(t)-b)<2e-6)return false;this.a={t,b,bpm,run:1,n:a.n};this.emit();return true}
};
SD.beat=new SD.Beat();
