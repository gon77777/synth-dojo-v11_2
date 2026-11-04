// STEREO WIDTH(シンセ道場 v3.3 新規): M/S 処理。width 0=モノ 1=そのまま 2=広げる。150Hz未満の差成分(S)は広げない(狭めるのは効く)
class WidthProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('width', 1, 0, 2), k('enabled', 0, 0, 1)];
  }
  constructor() { super(); this.lp = 0; this.w = 1; this.a = 1 - Math.exp(-2 * Math.PI * 150 / sampleRate); this.sm = 1 - Math.exp(-1 / (0.01 * sampleRate)); }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, L = input[0], R = input[Math.min(1, input.length - 1)];
    if (params.enabled[0] < 0.5) { for (let c = 0; c < output.length; c++) output[c].set(input[Math.min(c, input.length - 1)]); this.w = 1; return true; }
    const wt = params.width[0], oL = output[0], oR = output.length > 1 ? output[1] : null;
    for (let i = 0; i < frames; i++) {
      this.w += (wt - this.w) * this.sm;
      const w = this.w, m = 0.5 * (L[i] + R[i]), s = 0.5 * (L[i] - R[i]);
      this.lp += this.a * (s - this.lp);
      const hi = s - this.lp, s2 = s + (w - 1) * hi + (Math.min(w, 1) - 1) * this.lp;
      oL[i] = m + s2; if (oR) oR[i] = m - s2;
    }
    for (let c = 2; c < output.length; c++) output[c].set(output[0]);
    return true;
  }
}
registerProcessor('sd-width', WidthProcessor);
