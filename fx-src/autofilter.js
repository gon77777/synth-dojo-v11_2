// AUTO FILTER(シンセ道場 v3.3 新規): ステートバリアブルフィルター(TPT)。カットオフを LFO またはエンベロープフォロワーで動かす
// type 0=LP 1=HP 2=BP 3=NOTCH / mode 0=MANUAL 1=LFO 2=ENV / shape 0=SINE 1=TRI 2=SAW 3=SQUARE 4=S&H
// rate は Hz(テンポ同期のときは bus.js が Hz に換算して渡す)。depth は最大 ±4 オクターブ。enabled=0 は入力をそのまま通す
class AutoFilterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('type', 0, 0, 3), k('cutoff', 1000, 20, 20000), k('res', 0, 0, 1), k('mode', 1, 0, 2), k('rate', 1, 0.01, 40),
      k('shape', 0, 0, 4), k('depth', 0.5, 0, 1), k('sens', 0.5, 0, 1), k('attack', 5, 0.1, 500), k('release', 120, 1, 2000), k('enabled', 0, 0, 1)];
  }
  constructor() {
    super();
    this.ph = 0; this.sh = 0; this.seed = 12345; this.env = 0;
    this.ic1 = [0, 0]; this.ic2 = [0, 0];
  }
  rnd() { this.seed = (this.seed * 1664525 + 1013904223) >>> 0; return this.seed / 4294967296 * 2 - 1; }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const nch = Math.min(output.length, 2), frames = output[0].length;
    const inCh = c => input[Math.min(c, input.length - 1)];
    if (params.enabled[0] < 0.5) {
      for (let c = 0; c < output.length; c++) output[c].set(inCh(c));
      return true;
    }
    const type = Math.round(params.type[0]), mode = Math.round(params.mode[0]), shape = Math.round(params.shape[0]);
    const base = params.cutoff[0], res = params.res[0], rate = params.rate[0], depth = params.depth[0], sens = params.sens[0];
    const aA = Math.exp(-1 / (Math.max(0.1, params.attack[0]) * 0.001 * sampleRate)), aR = Math.exp(-1 / (Math.max(1, params.release[0]) * 0.001 * sampleRate));
    const Q = 0.707 * Math.pow(20, res), k = 1 / Q, comp = 1 / (1 + res * 0.5), fmax = 0.45 * sampleRate;
    const inc = rate / sampleRate, ig = 1 + sens * 16;
    for (let i = 0; i < frames; i++) {
      let mod = 0;
      if (mode === 1) {
        const t = this.ph;
        if (shape === 0) mod = Math.sin(2 * Math.PI * t);
        else if (shape === 1) mod = t < 0.25 ? 4 * t : (t < 0.75 ? 2 - 4 * t : 4 * t - 4);
        else if (shape === 2) mod = 2 * t - 1;
        else if (shape === 3) mod = t < 0.5 ? 1 : -1;
        else mod = this.sh;
        this.ph += inc; if (this.ph >= 1) { this.ph -= Math.floor(this.ph); this.sh = this.rnd(); }
        mod *= depth * 4;
      } else if (mode === 2) {
        let a = Math.abs(inCh(0)[i]); if (nch > 1) a = Math.max(a, Math.abs(inCh(1)[i]));
        this.env = a > this.env ? aA * this.env + (1 - aA) * a : aR * this.env + (1 - aR) * a;
        mod = Math.min(1, this.env * ig) * depth * 4;
      }
      let fc = base * Math.pow(2, mod); if (fc < 20) fc = 20; else if (fc > fmax) fc = fmax;
      const g = Math.tan(Math.PI * fc / sampleRate), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
      for (let c = 0; c < nch; c++) {
        const x = inCh(c)[i], v3 = x - this.ic2[c], v1 = this.ic1[c] * a1 + a2 * v3, v2 = this.ic2[c] + a2 * this.ic1[c] + a3 * v3;
        this.ic1[c] = 2 * v1 - this.ic1[c]; this.ic2[c] = 2 * v2 - this.ic2[c];
        let y;
        if (type === 0) y = v2; else if (type === 1) y = x - k * v1 - v2; else if (type === 2) y = k * v1; else y = x - k * v1;
        output[c][i] = y * comp;
      }
    }
    for (let c = 0; c < nch; c++) { if (!(Math.abs(this.ic1[c]) < 1e6)) this.ic1[c] = 0; if (!(Math.abs(this.ic2[c]) < 1e6)) this.ic2[c] = 0; }
    for (let c = nch; c < output.length; c++) output[c].set(output[0]);
    return true;
  }
}
registerProcessor('sd-autofilter', AutoFilterProcessor);
