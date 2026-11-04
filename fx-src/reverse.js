// REVERSE(シンセ道場 v10.7 FX-3b): 本物のリバース。拍に揃えた区間(LEN)で入力を録り、次の区間に時間を反転して出す。
// 拍位置・区間バッファは fx-src/beatbuf.js(SDBeat.Clock / SDBeat.BeatBuf。FX-3a)を使う。メインスレッドからのアンカー {beat:{t,b,bpm,run,n}} をメッセージで受ける。
// 【動き】区間 k の入力を録る間、区間 k-1 の録音を末尾から先頭へ読んで出す: 出力[i] = 録音[k-1][長さ-1-i]。区間の頭は拍の格子に揃う=逆再生の頭も拍に揃う。
//   遅延=区間の長さ(最初の区間は無音)。ドライは遅らせない(逆再生が1区間遅れて重なる=リバース本来の使い方)。MIX=0 は入力そのまま。
//   区間の頭・尻には約2ms の直線フェードを掛ける(逆再生の切れ目のクリック防止。区間の内側は時間反転と完全に一致)。区間が約8ms 未満なら長さの1/4。
//   テンポ変更で区間は伸び縮みする: 直前の区間のほうが長ければ尻は読まれず、短ければ読み出しが足りない部分は無音。
//   FEEDBACK: 出した音(逆再生)の一部を、いま録っている区間にも足す=次の区間でもう一度反転=順再生の繰り返しが fb ずつ小さくなって続く。
//   足す前に「±1 までは直線・それより上は tanh で頭打ち(最大 2)」の飽和を通すので、FEEDBACK 0.9 でも DC・矩形入力で発振・無限に膨らまない。
//   MIX・FEEDBACK は約20msでなめらかに追従(レーンで動かしてもクリックなし)。LEN は離散。
//   再生開始(アンカーの n が変わる)で区間と録音を捨てる。ONになった直後・長く処理されなかった(接続が外れていた)あとも捨てる=古い音を出さない。
// 入力が NaN・無限大なら 0。出力が壊れたら録音を捨てて復帰。enabled<0.5 は素通し(録音も捨てる)。
(function () {
  const G = typeof globalThis !== 'undefined' ? globalThis : self;
  const soft = x => { const a = x < 0 ? -x : x; return a <= 1 ? x : (x < 0 ? -1 : 1) * (1 + Math.tanh(a - 1)); };
  class SDReverse extends AudioWorkletProcessor {
    static get parameterDescriptors() {
      const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
      return [k('enabled', 0, 0, 1), k('len', 3, 0, 5), k('mix', 1, 0, 1), k('fb', 0, 0, 0.9)];
    }
    constructor() {
      super(); this.clk = null; this.buf = null; this.last = null; this.mx = null; this.fb = null; this.msgs = [];
      this.port.onmessage = e => { const d = e.data; if (d && d.beat) { if (this.clk) this.clk.post(d.beat); else this.msgs.push(d.beat); } };
    }
    process(inputs, outputs, params) {
      const inp = inputs[0], out = outputs[0]; if (!out || !out.length) return true;
      const n = out[0].length, ic = inp ? inp.length : 0, L = ic ? inp[0] : null, R = ic ? inp[Math.min(1, ic - 1)] : null, B = G.SDBeat;
      if (params.enabled[0] < 0.5 || !B) {
        for (let c = 0; c < out.length; c++) { const s = c === 0 ? L : R; if (s) out[c].set(s); else out[c].fill(0); }
        if (this.buf) this.buf.reset(); this.last = null; this.mx = null;
        return true;
      }
      const sr = sampleRate, T0 = currentTime;
      if (!this.clk) { this.clk = new B.Clock(); this.msgs.forEach(m => this.clk.post(m)); this.msgs = []; }
      if (!this.buf) this.buf = new B.BeatBuf(sr, 4, 40);
      const clk = this.clk, buf = this.buf;
      if (this.last !== null && T0 - this.last > 0.01) { buf.reset(); }              // 接続が外れていた間の古い音を出さない
      this.last = T0 + n / sr;
      let li = +params.len[0]; li = li === li ? Math.min(5, Math.max(0, Math.round(li))) : 3;
      let mt = +params.mix[0]; mt = mt === mt ? Math.min(1, Math.max(0, mt)) : 1;
      let ft = +params.fb[0]; ft = ft === ft ? Math.min(0.9, Math.max(0, ft)) : 0;
      if (this.mx === null) { this.mx = mt; this.fb = ft; }
      const len = B.LENS[li], co = 1 - Math.exp(-1 / (0.02 * sr)), FADE = Math.round(0.002 * sr), o0 = out[0], o1 = out[1];
      let mx = this.mx, fb = this.fb, bad = false;
      for (let i = 0; i < n; i++) {
        const ts = T0 + i / sr; clk.adopt(ts);
        let x = L ? L[i] : 0, y = R ? R[i] : x; if (!(x === x) || x > 1e6 || x < -1e6) x = 0; if (!(y === y) || y > 1e6 || y < -1e6) y = 0;
        mx += (mt - mx) * co; fb += (ft - fb) * co;
        buf.step(clk.beat(ts), len, clk.bpm, x, y, clk.takeFresh());
        const pos = buf.pos, pn = buf.pn; let wl = 0, wr = 0;
        if (pos < pn) {
          const F = Math.min(FADE, pn >> 2); let g = 1;
          if (F > 0) { if (pos < F) g = pos / F; else if (pn - 1 - pos < F) g = (pn - 1 - pos) / F; }
          wl = buf.get(0, pn - 1 - pos) * g; wr = buf.get(1, pn - 1 - pos) * g;
        }
        if (fb > 1e-6 && pos < buf.cap) { const Bk = buf.bank[buf.cur]; Bk[0][pos] += fb * soft(wl); Bk[1][pos] += fb * soft(wr); }
        const a = x * (1 - mx) + wl * mx, b = y * (1 - mx) + wr * mx;
        if (!(a === a) || !(b === b) || a > 1e6 || a < -1e6 || b > 1e6 || b < -1e6) { bad = true; o0[i] = 0; if (o1) o1[i] = 0; } else { o0[i] = a; if (o1) o1[i] = b; }
      }
      this.mx = mx; this.fb = fb;
      if (bad) { buf.reset(); }
      for (let c = 2; c < out.length; c++) out[c].set(o0);
      return true;
    }
  }
  registerProcessor('sd-reverse', SDReverse);
})();
