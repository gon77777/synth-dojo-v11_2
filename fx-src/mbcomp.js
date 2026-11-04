// MULTIBAND(シンセ道場 v10.1 FX-1a): Linkwitz-Riley 4次(バターワース2次×2段)で3バンドに分けて、足し直す。
// 構成: 入力 →(x1)→ 低域 / 高域。高域 →(x2)→ 中域 / 高域。低域は x2 の LP+HP(=オールパス)を通して位相をそろえる。
//       3バンドの合計は、振幅が平坦でオールパス(LR4 の性質)。
// v10.2 FX-1b: 各バンドに COMP(THRESH・RATIO・ATTACK・RELEASE・GAIN)・SOLO・MUTE。OUT(出力dB)・MIX(原音との割合)。
//   COMP は comp.js の VCA 型と同じ考え方: RMS検出(8ms)・左右連動・ニー8dB(2次曲線)・ゲイン低下は dB 上でアタック/リリース。
//   自動メイクアップは無し(GAIN つまみで手動)。RATIO=1 なら何も圧縮しない(既定=素通し=1a と同じ)。
//   MIX の「原音」は、圧縮・GAIN・SOLO/MUTE を掛けない3バンドの和(=同じオールパスを通った音)。位相がそろうので混ぜても櫛にならない。
//   GR(各バンドのゲイン低下 dB)は約50msごとに port で {gr:[低,中,高]} を送る(画面は FX-1c)。
// x1<x2 を守る(x2 は x1 の1.25倍以上)。係数はブロックごとに更新(k-rate)。NaN・無限大が出たら状態を捨てる。
class MbCompProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    const a = [k('enabled', 0, 0, 1), k('x1', 200, 40, 1000), k('x2', 2500, 400, 12000)];
    for (let b = 1; b <= 3; b++) a.push(k('t' + b, -24, -60, 0), k('r' + b, 1, 1, 20), k('a' + b, 10, 0.1, 100), k('l' + b, 200, 10, 2000), k('g' + b, 0, -24, 24), k('s' + b, 0, 0, 1), k('m' + b, 0, 0, 1));
    a.push(k('out', 0, -24, 12), k('mix', 1, 0, 1));
    return a;
  }
  constructor() {
    super();
    this.fx1 = 200; this.fx2 = 2500;          // いまの(なめらかにした)分割周波数
    this.c = {};                              // 係数 {lp1, hp1, lp2, hp2}: [b0,b1,b2,a1,a2]
    this.st = [];                             // 状態: 2ch × 12個の2次フィルター(各 z1,z2)
    for (let ch = 0; ch < 2; ch++) this.st.push(new Float64Array(24));
    this.setCoef(this.fx1, this.fx2);
    this.ms = [0, 0, 0]; this.gr = [0, 0, 0]; this.mx = [0, 0, 0]; this.since = 0;   // バンドごと: 2乗平均・ゲイン低下(dB)・報告用の最大
  }
  // バターワース2次(Q=1/√2)の LP/HP
  static bq(type, f) {
    const w = 2 * Math.PI * f / sampleRate, cs = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2), a0 = 1 + al;
    const b = type === 'lp' ? [(1 - cs) / 2, 1 - cs, (1 - cs) / 2] : [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    return [b[0] / a0, b[1] / a0, b[2] / a0, -2 * cs / a0, (1 - al) / a0];
  }
  setCoef(f1, f2) {
    const nyq = sampleRate * 0.45; f1 = Math.min(f1, nyq / 1.25); f2 = Math.min(Math.max(f2, f1 * 1.25), nyq);
    const B = MbCompProcessor.bq;
    this.c = { lp1: B('lp', f1), hp1: B('hp', f1), lp2: B('lp', f2), hp2: B('hp', f2) };
  }
  // 転置直接形II。s の o 番目(z1=o, z2=o+1)
  static f(c, s, o, x) {
    const y = c[0] * x + s[o];
    s[o] = c[1] * x - c[3] * y + s[o + 1];
    s[o + 1] = c[2] * x - c[4] * y;
    return y;
  }
  // 1サンプル・1ch: 3バンド [低(オールパス済み), 中, 高] を返す
  split(s, x, out) {
    const F = MbCompProcessor.f, c = this.c;
    const lo = F(c.lp1, s, 2, F(c.lp1, s, 0, x));            // LR4 低域
    const hi = F(c.hp1, s, 6, F(c.hp1, s, 4, x));            // LR4 高域(x1 より上)
    out[1] = F(c.lp2, s, 10, F(c.lp2, s, 8, hi));            // 中域
    out[2] = F(c.hp2, s, 14, F(c.hp2, s, 12, hi));           // 高域
    out[0] = F(c.lp2, s, 18, F(c.lp2, s, 16, lo)) + F(c.hp2, s, 22, F(c.hp2, s, 20, lo)); // 低域を x2 のオールパスに通す
  }
  // 静的特性(comp.js の curve と同じ式)
  static curve(x, th, r, k) {
    const d = x - th;
    if (2 * d < -k) return x;
    if (k > 0 && 2 * Math.abs(d) <= k) { const t = d + k / 2; return x + (1 / r - 1) * t * t / (2 * k); }
    return th + d / r;
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, inCh = input.length;
    if (params.enabled[0] < 0.5) {
      for (let c = 0; c < output.length; c++) output[c].set(input[Math.min(c, inCh - 1)]);
      for (let ch = 0; ch < 2; ch++) this.st[ch].fill(0);
      this.ms.fill(0); this.gr.fill(0);
      return true;
    }
    // 分割周波数: ブロックごとにゆっくり追従(約20ms)。x2 は x1 の1.25倍以上
    const k = 1 - Math.exp(-frames / (0.02 * sampleRate));
    this.fx1 += (params.x1[0] - this.fx1) * k; this.fx2 += (params.x2[0] - this.fx2) * k;
    this.setCoef(this.fx1, this.fx2);
    // バンド別の設定(ブロックごと)
    const LN = 0.11512925464970229, co = (ms) => Math.exp(-1 / Math.max(1, ms * 0.001 * sampleRate));
    const th = [], rt = [], cA = [], cR = [], gn = [], on = [0, 0, 0], any = [0];
    let solo = false;
    for (let b = 0; b < 3; b++) {
      const n = b + 1;
      th[b] = params['t' + n][0]; rt[b] = Math.max(1, params['r' + n][0]);
      cA[b] = co(Math.max(0.1, params['a' + n][0])); cR[b] = co(Math.max(10, params['l' + n][0]));
      const mute = params['m' + n][0] >= 0.5, so = params['s' + n][0] >= 0.5;
      if (so) solo = true;
      on[b] = (so ? 2 : 0) + (mute ? 1 : 0);                       // bit1=solo bit0=mute
      gn[b] = Math.exp(params['g' + n][0] * LN);
    }
    const pass = [0, 0, 0];                                       // 1=鳴らす
    for (let b = 0; b < 3; b++) pass[b] = (on[b] & 1) ? 0 : (solo ? ((on[b] & 2) ? 1 : 0) : 1);
    const outG = Math.exp(params.out[0] * LN), mixv = Math.min(1, Math.max(0, params.mix[0]));
    const cMs = co(8), oneMs = 1 - cMs, KNEE = 8;
    const nCh = Math.min(2, output.length), xL = input[0], xR = input[Math.min(1, inCh - 1)];
    const oL = output[0], oR = nCh > 1 ? output[1] : null;
    const bl = [0, 0, 0], br = [0, 0, 0], ms = this.ms, gr = this.gr, mx = this.mx, sL = this.st[0], sR = this.st[1];
    for (let i = 0; i < frames; i++) {
      this.split(sL, xL[i], bl);
      if (oR) this.split(sR, xR[i], br); else { br[0] = bl[0]; br[1] = bl[1]; br[2] = bl[2]; }
      let wl = 0, wr = 0;
      for (let b = 0; b < 3; b++) {
        ms[b] += ((bl[b] * bl[b] + br[b] * br[b]) * 0.5 - ms[b]) * oneMs;
        const lvl = 10 * Math.log10(ms[b] + 1e-12) + 3.0103;
        const target = rt[b] > 1 ? Math.max(0, lvl - MbCompProcessor.curve(lvl, th[b], rt[b], KNEE)) : 0;
        gr[b] = target + (gr[b] - target) * (target > gr[b] ? cA[b] : cR[b]);
        if (gr[b] > mx[b]) mx[b] = gr[b];
        if (pass[b]) { const g = Math.exp(-gr[b] * LN) * gn[b]; wl += bl[b] * g; wr += br[b] * g; }
      }
      const dl = bl[0] + bl[1] + bl[2], dr = br[0] + br[1] + br[2];   // 原音(同じオールパスを通った音)
      oL[i] = dl + (wl * outG - dl) * mixv;
      if (oR) oR[i] = dr + (wr * outG - dr) * mixv;
    }
    if (!isFinite(oL[frames - 1]) || (oR && !isFinite(oR[frames - 1])) || !isFinite(sL[0]) || !isFinite(sR[0]) || !isFinite(ms[0] + ms[1] + ms[2] + gr[0] + gr[1] + gr[2])) {
      sL.fill(0); sR.fill(0); ms.fill(0); gr.fill(0); oL.fill(0); if (oR) oR.fill(0);
    }
    for (let c = 2; c < output.length; c++) output[c].set(output[0]);
    this.since += frames;
    if (this.since >= sampleRate / 20) { this.since = 0; this.port.postMessage({ gr: [-mx[0], -mx[1], -mx[2]] }); mx[0] = mx[1] = mx[2] = 0; }
    return true;
  }
}
registerProcessor('sd-mbcomp', MbCompProcessor);
