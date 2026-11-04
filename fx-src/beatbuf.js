// BEAT SYNC 基盤(シンセ道場 v10.6 FX-3a): リバース(FX-3b)・グリッチ(FX-3c)が共有する「拍位置の受け取り」と「拍に揃った区間バッファ」。
// この段階では聞こえるエフェクトではない(登録名 sd-beatbuf は内部のテスト用の出力。ラックには出さない)。
// 【拍位置の受け渡し(FX-3a の決定)】メインスレッドが「AudioContext の時刻 t に、拍 b・テンポ bpm」というアンカー {t,b,bpm,run,n} をメッセージで送る(port.postMessage({beat:...}))。
//   ワークレットは、アンカーの時刻 t が来たサンプルで採用し、拍位置 = b + (時刻-t)·bpm/60 で外挿する(ブロック内もサンプルごと)。
//   ・アンカーは「再生開始」「テンポ変更」「時計の再同期」のときだけ届く。トランスポートは次に鳴らすステップごとに「この時刻はこの拍」と告げ、いまの外挿と合っていれば送らない(js/beat.js)。
//   ・BPM を k-rate パラメーターにはしない(パラメーターは128サンプル単位で、アンカーの時刻とずれるため)。テンポはアンカーに含める。
//   ・n=再生開始の通し番号。変わったら区間を新しい拍0から始め直す(FX-3c の乱数のリセットにも使う)。停止中も止まらず最後のテンポで進み続ける(鍵盤で弾いても効く)。
// 【区間バッファ(BeatBuf)】LEN(拍単位。LENS)ごとに区切り、いまの区間を録りながら「直前の区間」を読める。区間の頭は拍の格子(拍位置 ÷ LEN の整数)に揃う=頭のサンプルは拍位置が格子を跨いだ最初のサンプル。
//   途中から始まった区間(再生開始・LEN 変更)は、頭までのサンプルを無音で埋めて位置を合わせる。区間の長さはテンポ変更で伸び縮みする(読み出しが足りなければ無音)。
// 4/4 前提(1小節=4拍)は LENS の最後の値だけ。拍子の一般化(MT)で換算を足す。bpm は 40〜300 に丸める(区間バッファの大きさは 40BPM・4拍が上限)。
(function () {
  const G = typeof globalThis !== 'undefined' ? globalThis : self;
  const LENS = [1 / 8, 1 / 4, 1 / 2, 1, 2, 4];   // 1/8拍・1/4拍・1/2拍・1拍・2拍・1小節(4拍)
  class Clock {
    constructor() { this.t = 0; this.b = 0; this.bpm = 120; this.run = 0; this.n = 0; this.q = []; this.fresh = false; }
    post(m) {
      if (!m || typeof m !== 'object') return;
      const t = +m.t, b = +m.b, bpm = +m.bpm;
      if (!isFinite(t) || !isFinite(b) || !isFinite(bpm)) return;                       // 不正なアンカーは捨てる
      const a = { t, b, bpm: Math.min(300, Math.max(40, bpm)), run: m.run ? 1 : 0, n: m.n | 0 }, q = this.q;
      while (q.length && q[q.length - 1].t >= t) q.pop();                                // 新しいアンカーは、同じ時刻以降の未採用のアンカーに取って代わる(停止・再開・テンポ変更)
      q.push(a);
      while (q.length > 32) this.take(q.shift());
    }
    take(a) { if (a.n !== this.n) this.fresh = true; this.t = a.t; this.b = a.b; this.bpm = a.bpm; this.run = a.run; this.n = a.n; }
    adopt(ts) { const q = this.q; while (q.length && q[0].t <= ts + 1e-9) this.take(q.shift()); }
    beat(ts) { return this.b + (ts - this.t) * this.bpm / 60; }
    takeFresh() { const f = this.fresh; this.fresh = false; return f; }
  }
  class BeatBuf {
    constructor(sr, maxBeats, minBpm) {
      this.sr = sr; this.cap = Math.ceil(maxBeats * 60 / minBpm * sr) + 16;
      this.bank = [[new Float32Array(this.cap), new Float32Array(this.cap)], [new Float32Array(this.cap), new Float32Array(this.cap)]];
      this.reset();
    }
    reset() { this.cur = 0; this.n = 0; this.pn = 0; this.k = null; this.len = 0; this.pos = 0; this.bank.forEach(b => { b[0].fill(0); b[1].fill(0); }); }
    // 1サンプル進める。bt=この瞬間の拍位置・len=区間の長さ(拍)・bpm・l/r=入力・force=再生開始。区間の頭(新しい区間の最初のサンプル)なら true。
    // 戻ったあと this.pos=この区間の頭からのサンプル数、this.pn=直前の区間の長さ(サンプル)。直前の区間は get(ch,i) で読む。
    step(bt, len, bpm, l, r, force) {
      const k = Math.floor(bt / len + 1e-9); let sw = false;
      if (force || k !== this.k || len !== this.len) {
        sw = true; this.pn = force ? 0 : Math.min(this.n, this.cap); this.cur ^= 1;       // 再生開始(force)では前の区間を捨てる(停止前の音を新しい再生に出さない)
        let off = Math.floor(Math.max(0, bt - k * len) * 60 / bpm * this.sr + 1e-6); if (off >= this.cap) off = this.cap - 1;
        if (off > 0) { const B = this.bank[this.cur]; B[0].fill(0, 0, off); B[1].fill(0, 0, off); }
        this.n = off; this.k = k; this.len = len;
      }
      const i = this.n; this.pos = i;
      if (i < this.cap) { const B = this.bank[this.cur]; B[0][i] = l; B[1][i] = r; }
      this.n = i + 1;
      return sw;
    }
    get(ch, i) { return i >= 0 && i < this.pn ? this.bank[this.cur ^ 1][ch][i] : 0; }
  }
  G.SDBeat = { Clock, BeatBuf, LENS };
  // テスト用の出力: L = 直前の区間を同じ位置で読んだ音(=LEN だけ遅れた入力)・R = 区間の頭だけ 1 のマーカー。パラメーター enabled・len(LENS の番号 0〜5)
  class BeatBufTest extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
      return [k('enabled', 0, 0, 1), k('len', 3, 0, 5)];
    }
    constructor() { super(); this.clk = new Clock(); this.buf = null; this.port.onmessage = e => { const d = e.data; if (d && d.beat) this.clk.post(d.beat); }; }
    process(inputs, outputs, params) {
      const inp = inputs[0], out = outputs[0]; if (!out || !out.length) return true;
      const n = out[0].length, ic = inp ? inp.length : 0, L = ic ? inp[0] : null, R = ic ? inp[Math.min(1, ic - 1)] : null;
      if (params.enabled[0] < 0.5) {
        for (let c = 0; c < out.length; c++) { const s = c === 0 ? L : R; if (s) out[c].set(s); else out[c].fill(0); }
        if (this.buf) this.buf.reset();
        return true;
      }
      const sr = sampleRate, clk = this.clk, T0 = currentTime;
      if (!this.buf) this.buf = new BeatBuf(sr, 4, 40);
      let li = +params.len[0]; li = li === li ? Math.min(5, Math.max(0, Math.round(li))) : 3;
      const len = LENS[li], buf = this.buf, o0 = out[0], o1 = out[1];
      for (let i = 0; i < n; i++) {
        const ts = T0 + i / sr; clk.adopt(ts);
        let x = L ? L[i] : 0, y = R ? R[i] : 0; if (!(x === x) || x > 1e6 || x < -1e6) x = 0; if (!(y === y) || y > 1e6 || y < -1e6) y = 0;
        const sw = buf.step(clk.beat(ts), len, clk.bpm, x, y, clk.takeFresh());
        o0[i] = buf.get(0, buf.pos); if (o1) o1[i] = sw ? 1 : 0;
      }
      for (let c = 2; c < out.length; c++) out[c].set(o0);
      return true;
    }
  }
  registerProcessor('sd-beatbuf', BeatBufTest);
})();
