// PITCH SHIFT(シンセ道場 v10.5 FX-2a/2b): 時間領域。遅延線+2つの読み出しヘッド+ハン窓のクロスフェード(グレイン)。
// 仕組み: 入力を遅延線に書く。ヘッドの遅延は φ·G(φ=0〜1 をのこぎり状に動かす)。φ が dφ=(1-ratio)/G ずつ進むと、読み出し位置は ratio 倍の速さで進む=ピッチが ratio 倍。
//         2つ目のヘッドは φ を 0.5 ずらす。窓 w1=0.5-0.5cos(2πφ)・w2=1-w1(合計はいつも1)。窓が 0 のところで φ が 0→1 に飛ぶので、飛び目は聞こえない。
// 補間は4点ヘルミート(3次)。フォルマントは保存しない(声は高くすると細く、低くすると太くなる)。
// 0半音(SHIFT が ±0.005 以内)のときは、窓を使わず固定の遅延だけを通す(2ヘッドの櫛フィルターが出ないように)。切り替えは約10msでクロスフェード。
// 遅延: 固定遅延 = G/2+2 サンプル(G=40ms なら 962 サンプル)。GRAIN(窓の長さ G。10〜100ms)で変わる。
// FX-2b: FINE(±100セント。SHIFT に足す)・GRAIN・MIX(原音との割合)。ドライ(原音)も同じ固定遅延を通して合わせる=0半音ならMIXをどう動かしても入力の遅れと一致(櫛が出ない)。
//   GRAIN は約50msでなめらかに追従(遅延が飛ばない)。MIX は約20msで追従。ほかのつまみも k-rate。
// 左右は別々の遅延線で、φ(ヘッドの位置)は共通。NaN・無限大は書き込み時に0にして、出力が壊れたら遅延線を捨てて復帰する。
class PitchProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('enabled', 0, 0, 1), k('shift', 0, -24, 24), k('fine', 0, -100, 100), k('grain', 40, 10, 100), k('mix', 1, 0, 1)];
  }
  constructor() {
    super();
    this.SIZE = 16384; this.mask = this.SIZE - 1;
    this.G = 0.04 * sampleRate; this.mx = 1; this.snap = true;       // グレイン長(サンプル。なめらかに追従)=既定40ms・MIX(なめらか)
    this.buf = [new Float32Array(this.SIZE), new Float32Array(this.SIZE)];
    this.w = 0; this.phi = 0; this.sh = 0; this.by = 1;             // 書き込み位置・ヘッドの位相・なめらかにした SHIFT・バイパスの割合(1=固定遅延だけ)
  }
  reset() { this.buf[0].fill(0); this.buf[1].fill(0); this.w = 0; this.phi = 0; this.sh = 0; this.by = 1; this.mx = 1; this.snap = true; }
  // 4点ヘルミート補間。b=遅延線・pos=読み出し位置(小数・w - d)
  rd(b, pos) {
    const m = this.mask, i = Math.floor(pos), f = pos - i;
    const y0 = b[(i - 1) & m], y1 = b[i & m], y2 = b[(i + 1) & m], y3 = b[(i + 2) & m];
    const c1 = 0.5 * (y2 - y0), c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3, c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);
    return ((c3 * f + c2) * f + c1) * f + y1;
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, inCh = input.length;
    if (params.enabled[0] < 0.5) {
      for (let c = 0; c < output.length; c++) output[c].set(input[Math.min(c, inCh - 1)]);
      if (this.w !== 0 || this.sh !== 0) this.reset();
      return true;
    }
    const sr = sampleRate, m = this.mask, num = (v, d, a, b) => { v = +v; return v === v ? Math.min(b, Math.max(a, v)) : d; };
    const gT = num(params.grain[0], 40, 10, 100) * 0.001 * sr;
    const mxT = num(params.mix[0], 1, 0, 1);
    if (this.snap) { this.G = gT; this.mx = mxT; this.snap = false; }                       // 最初のブロックは目標へ一気に(遅延が測れる・起動直後に動かない)
    const G0 = this.G, mx0 = this.mx;
    let G1 = G0 + (gT - G0) * (1 - Math.exp(-frames / (0.05 * sr))); if (Math.abs(G1 - gT) < 0.5) G1 = gT;
    let mx1 = mx0 + (mxT - mx0) * (1 - Math.exp(-frames / (0.02 * sr))); if (Math.abs(mx1 - mxT) < 0.0005) mx1 = mxT;
    this.G = G1; this.mx = mx1;                                                              // ブロック内はサンプルごとに直線で動かす(階段にしない)
    let tgt = num(params.shift[0], 0, -24, 24) + num(params.fine[0], 0, -100, 100) / 100;
    this.sh += (tgt - this.sh) * (1 - Math.exp(-frames / (0.02 * sr)));       // 約20msで追従(レーンで動かしてもクリックが出ない)
    if (Math.abs(this.sh - tgt) < 0.001) this.sh = tgt;
    const ratio = Math.pow(2, this.sh / 12);
    const byT = Math.abs(this.sh) < 0.005 && Math.abs(tgt) < 0.005 ? 1 : 0, byStep = 1 / (0.01 * sr);
    const nCh = Math.min(2, output.length);
    let w = this.w, phi = this.phi, by = this.by;
    const TP = 2 * Math.PI;
    for (let i = 0; i < frames; i++) {
      const G = G0 + (G1 - G0) * (i + 1) / frames, D0 = G / 2 + 2, mixv = mx0 + (mx1 - mx0) * (i + 1) / frames, dphi = (1 - ratio) / G;
      for (let ch = 0; ch < nCh; ch++) {
        let x = input[Math.min(ch, inCh - 1)][i];
        if (!(x === x) || x > 1e6 || x < -1e6) x = 0;
        this.buf[ch][w & m] = x;
      }
      if (by < byT) by = Math.min(byT, by + byStep); else if (by > byT) by = Math.max(byT, by - byStep);
      const w1 = 0.5 - 0.5 * Math.cos(TP * phi), w2 = 1 - w1;
      let p2 = phi + 0.5; if (p2 >= 1) p2 -= 1;
      const d1 = 2 + phi * G, d2 = 2 + p2 * G;
      for (let ch = 0; ch < nCh; ch++) {
        const b = this.buf[ch];
        const dly = Number.isInteger(D0) ? b[(w - D0) & m] : this.rd(b, w - D0);            // 原音(固定遅延)
        let y = dly;
        if (mixv > 0 && by < 1) { const s = w1 * this.rd(b, w - d1) + w2 * this.rd(b, w - d2); y = dly + (by * dly + (1 - by) * s - dly) * mixv; }
        output[ch][i] = y;
      }
      phi += dphi; if (phi >= 1) phi -= 1; else if (phi < 0) phi += 1;
      w = (w + 1) & m;
    }
    this.w = w; this.phi = phi; this.by = by;
    let bad = false;
    for (let ch = 0; ch < nCh; ch++) { const v = output[ch][frames - 1]; if (!isFinite(v)) bad = true; }
    if (bad || !isFinite(phi)) { this.reset(); for (let ch = 0; ch < output.length; ch++) output[ch].fill(0); }
    for (let c = 2; c < output.length; c++) output[c].set(output[0]);
    return true;
  }
}
registerProcessor('sd-pitch', PitchProcessor);
