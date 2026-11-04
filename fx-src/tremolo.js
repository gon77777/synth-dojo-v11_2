// TREMOLO / AUTOPAN(シンセ道場 v3.3 新規): LFO で音量(TREMOLO)または左右の音量(PAN)を揺らす
// mode 0=TREMOLO 1=PAN / shape 0=SINE 1=TRI 2=SQUARE 3=SAW(下降) / depth 0..1 / spread 0..1(PAN時の左右のLFOのずれ。1=逆位相)
// rate は Hz(同期のときは bus.js が換算)。位相0で音量が最大(1)。短いスルー(0.5ms)でクリックを防ぐ。enabled=0 は素通し
class TremoloProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('mode', 0, 0, 1), k('rate', 4, 0.01, 40), k('shape', 0, 0, 3), k('depth', 0.5, 0, 1), k('spread', 1, 0, 1), k('enabled', 0, 0, 1)];
  }
  constructor() { super(); this.ph = 0; this.gl = 1; this.gr = 1; }
  lfo(t, shape) {
    t -= Math.floor(t);
    if (shape === 0) return 0.5 + 0.5 * Math.cos(2 * Math.PI * t);
    if (shape === 1) return Math.abs(1 - 2 * t);
    if (shape === 2) return t < 0.5 ? 1 : 0;
    return 1 - t;
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, inCh = c => input[Math.min(c, input.length - 1)];
    if (params.enabled[0] < 0.5) { for (let c = 0; c < output.length; c++) output[c].set(inCh(c)); this.gl = this.gr = 1; return true; }
    const mode = Math.round(params.mode[0]), shape = Math.round(params.shape[0]), depth = params.depth[0], off = mode === 1 ? 0.5 * params.spread[0] : 0;
    const inc = params.rate[0] / sampleRate, slew = 1 / (0.0005 * sampleRate), L = inCh(0), R = inCh(1);
    for (let i = 0; i < frames; i++) {
      const tl = 1 - depth * (1 - this.lfo(this.ph, shape)), tr = 1 - depth * (1 - this.lfo(this.ph + off, shape));
      this.gl += Math.max(-slew, Math.min(slew, tl - this.gl)); this.gr += Math.max(-slew, Math.min(slew, tr - this.gr));
      output[0][i] = L[i] * this.gl; if (output.length > 1) output[1][i] = R[i] * this.gr;
      this.ph += inc; if (this.ph >= 1) this.ph -= Math.floor(this.ph);
    }
    for (let c = 2; c < output.length; c++) output[c].set(output[0]);
    return true;
  }
}
registerProcessor('sd-tremolo', TremoloProcessor);
