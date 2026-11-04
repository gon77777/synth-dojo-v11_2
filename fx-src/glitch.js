// GLITCH(シンセ道場 v10.8 FX-3c): 拍同期のスタッター。拍に揃えた区間(LEN)ごとに、確率 PROB で「グリッチ区間」にする。遅延ゼロ。
// 拍位置・区間バッファは fx-src/beatbuf.js(SDBeat.Clock / BeatBuf。FX-3a)。アンカーは port.postMessage({beat:...})。
// 【グリッチ区間】区間の頭の 1/REPEAT(=スライス)は入力をそのまま通しながら録り、残りは**録ったスライスのくり返し**に置き換える(スタッター)。
//   ・REV の確率で、くり返しを**逆再生**にする。PITCH(−12/0/+12)でくり返しの再生速度が 1/2・1・2 倍(ピッチも変わる。スライスの長さは入力側で固定=速度2倍なら1スライスぶんを2回で埋める)。
//   ・区間ごとに 1/4 の確率で**ゲート**(くり返しの奇数番目のスライスを無音)。
//   ・くり返しの継ぎ目・素通し↔くり返しの切り替え・ゲートの開閉には約1ms のフェード(クリック防止)。区間の内側は録音と完全に一致(速度1倍)。
// 【確率】乱数は固定シード(mulberry32)。**区間の頭ごとに必ず4個**引く(PROB・REV などを変えても、後の区間の乱数がずれない=PROB を上げると前のグリッチ区間は残り増えるだけ)。
//   再生開始(アンカーの n が変わる)で乱数と録音を最初に戻す=同じ演奏は同じ結果。区間は頭が拍に揃っているときだけグリッチにする(途中から始まった区間=再生開始の途中・LEN変更直後は素通し)。
// PROB=0 は完全な素通し(遅延ゼロ・ビット一致)。MIX は約20msで追従(区間の途中で動かしてもクリックなし)。REPEAT・PITCH・REV・PROB は区間の頭で採用。NaN・無限大の入力は 0。
(function () {
  const G = typeof globalThis !== 'undefined' ? globalThis : self;
  const rng = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const SEED = 0x5d0c1e;
  class SDGlitch extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
      return [k('enabled', 0, 0, 1), k('len', 3, 0, 5), k('prob', 0.5, 0, 1), k('rep', 4, 2, 16), k('rev', 0.25, 0, 1), k('pitch', 0, -12, 12), k('mix', 1, 0, 1)];
    }
    constructor() {
      super(); this.clk = null; this.buf = null; this.last = null; this.mx = null; this.msgs = []; this.rnd = rng(SEED); this.seg = this.noSeg(); this.xf = 0; this.gg = 1; this.xfL = 0; this.xfR = 0; this.lwL = 0; this.lwR = 0;
      this.port.onmessage = e => { const d = e.data; if (d && d.beat) { if (this.clk) this.clk.post(d.beat); else this.msgs.push(d.beat); } };
    }
    noSeg() { return { gl: false, slice: 0, rev: false, gate: false, r: 1 }; }
    wipe() { if (this.buf) this.buf.reset(); Object.assign(this.seg, this.noSeg()); this.xf = 0; this.gg = 1; this.lwL = this.lwR = 0; }
    process(inputs, outputs, params) {
      const inp = inputs[0], out = outputs[0]; if (!out || !out.length) return true;
      const n = out[0].length, ic = inp ? inp.length : 0, L = ic ? inp[0] : null, R = ic ? inp[Math.min(1, ic - 1)] : null, B = G.SDBeat;
      if (params.enabled[0] < 0.5 || !B) {
        for (let c = 0; c < out.length; c++) { const s = c === 0 ? L : R; if (s) out[c].set(s); else out[c].fill(0); }
        this.wipe(); this.last = null; this.mx = null; return true;
      }
      const sr = sampleRate, T0 = currentTime, clamp = (v, a, b, d) => { v = +v; return v === v ? Math.min(b, Math.max(a, v)) : d; };
      if (!this.clk) { this.clk = new B.Clock(); this.msgs.forEach(m => this.clk.post(m)); this.msgs = []; }
      if (!this.buf) this.buf = new B.BeatBuf(sr, 4, 40);
      const clk = this.clk, buf = this.buf;
      if (this.last !== null && T0 - this.last > 0.01) this.wipe();                 // 接続が外れていた間の古い録音で鳴らさない
      this.last = T0 + n / sr;
      const li = Math.round(clamp(params.len[0], 0, 5, 3)), len = B.LENS[li], prob = clamp(params.prob[0], 0, 1, 0.5), rep = Math.round(clamp(params.rep[0], 2, 16, 4)),
        rev = clamp(params.rev[0], 0, 1, 0.25), st = clamp(params.pitch[0], -12, 12, 0), mt = clamp(params.mix[0], 0, 1, 1);
      const rate = Math.pow(2, Math.round(st / 12));                                // −12/0/+12 → 0.5/1/2
      if (this.mx === null) this.mx = mt;
      const co = 1 - Math.exp(-1 / (0.02 * sr)), F = Math.round(0.001 * sr), o0 = out[0], o1 = out[1], seg = this.seg;
      let mx = this.mx, bad = false;
      for (let i = 0; i < n; i++) {
        const ts = T0 + i / sr; clk.adopt(ts);
        let x = L ? L[i] : 0, y = R ? R[i] : x; if (!(x === x) || x > 1e6 || x < -1e6) x = 0; if (!(y === y) || y > 1e6 || y < -1e6) y = 0;
        mx += (mt - mx) * co;
        const fresh = clk.takeFresh(); if (fresh) { this.rnd = rng(SEED); this.wipe(); }
        const sw = buf.step(clk.beat(ts), len, clk.bpm, x, y, fresh), pos = buf.pos;
        if (sw) {
          const u1 = this.rnd(), u2 = this.rnd(), u3 = this.rnd(); this.rnd();
          if (seg.gl) { this.xf = F; this.xfL = this.lwL; this.xfR = this.lwR; }     // グリッチ区間のあと: 最後のくり返しの音から素通しへ
          const slice = Math.floor(len * 60 / clk.bpm * sr / rep);
          seg.gl = u1 < prob && pos === 0 && slice >= 16 && slice * 2 <= buf.cap; seg.slice = slice; seg.rev = u2 < rev; seg.gate = u3 < 0.25; seg.r = rate; this.gg = 1;
        }
        let wl = x, wr = y;
        if (seg.gl && pos >= seg.slice) {
          const S = seg.slice, t = pos - S, ph = t * seg.r, lp = ph - S * Math.floor(ph / S), Bk = buf.bank[buf.cur];
          if (pos === S) { this.xf = F; this.xfL = this.lwL; this.xfR = this.lwR; }  // 素通しからくり返しへの継ぎ目: 直前の音から滑らかにつなぐ
          const tg = seg.gate && (Math.floor(pos / S) & 1) ? 0 : 1; this.gg += Math.max(-1 / F, Math.min(1 / F, tg - this.gg));   // ゲートは約1msで開閉
          let q = seg.rev ? S - 1 - lp : lp; if (q < 0) q += S;
          const i0 = Math.floor(q), fr = q - i0, i1 = i0 + 1 >= S ? 0 : i0 + 1, g = Math.min(1, lp / F, (S - lp) / F) * this.gg;
          wl = (Bk[0][i0] * (1 - fr) + Bk[0][i1] * fr) * g; wr = (Bk[1][i0] * (1 - fr) + Bk[1][i1] * fr) * g;
        }
        if (seg.gl) { this.lwL = wl; this.lwR = wr; }
        let a = x, b = y;
        if (seg.gl || this.xf > 0) {
          if (this.xf > 0) { const k = this.xf / F; wl = wl * (1 - k) + this.xfL * k; wr = wr * (1 - k) + this.xfR * k; this.xf--; }
          a = x * (1 - mx) + wl * mx; b = y * (1 - mx) + wr * mx;
        }
        if (!(a === a) || !(b === b) || a > 1e6 || a < -1e6 || b > 1e6 || b < -1e6) { bad = true; o0[i] = 0; if (o1) o1[i] = 0; } else { o0[i] = a; if (o1) o1[i] = b; }
      }
      this.mx = mx; if (bad) this.wipe();
      for (let c = 2; c < out.length; c++) out[c].set(o0);
      return true;
    }
  }
  registerProcessor('sd-glitch', SDGlitch);
})();
