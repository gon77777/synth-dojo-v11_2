// RING MOD(シンセ道場 v3.4 新規): 入力に搬送波(サイン/矩形)を掛ける。金属的・ロボット的な音
// freq 20..5000Hz / shape 0=SINE 1=SQUARE / mix 0..1(0=原音)/ enabled=0 は素通し
// 出力 = 入力×(1−mix) + 入力×搬送波×mix。搬送波は ±1 なので音量は増えない
class RingmodProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('freq', 440, 1, 12000), k('shape', 0, 0, 1), k('mix', 0.5, 0, 1), k('enabled', 0, 0, 1)];
  }
  constructor() { super(); this.ph = 0; }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, inCh = c => input[Math.min(c, input.length - 1)];
    if (params.enabled[0] < 0.5) { for (let c = 0; c < output.length; c++) output[c].set(inCh(c)); return true; }
    const inc = params.freq[0] / sampleRate, sq = Math.round(params.shape[0]) === 1, mix = params.mix[0], nc = Math.min(output.length, 2);
    for (let i = 0; i < frames; i++) {
      const car = sq ? (this.ph < 0.5 ? 1 : -1) : Math.sin(2 * Math.PI * this.ph);
      for (let c = 0; c < nc; c++) { const x = inCh(c)[i]; output[c][i] = x * (1 - mix) + x * car * mix; }
      this.ph += inc; if (this.ph >= 1) this.ph -= Math.floor(this.ph);
    }
    for (let c = 2; c < output.length; c++) output[c].set(output[0]);
    return true;
  }
}
registerProcessor('sd-ringmod', RingmodProcessor);
