// BITCRUSH(シンセ道場 v3.4 新規): ビット深度を落とす(量子化)+サンプルを間引く(ホールド)
// bits 1..16(16=量子化しない) / rate 1..64(N サンプルごとに値を取り直す。1=間引かない) / mix 0..1 / enabled=0 は素通し
// bits=16 かつ rate<=1 のときは入力そのもの(mix に関わらず)
class BitcrushProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('bits', 16, 1, 16), k('rate', 1, 1, 64), k('mix', 1, 0, 1), k('enabled', 0, 0, 1)];
  }
  constructor() { super(); this.cnt = 0; this.hold = [0, 0]; }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, inCh = c => input[Math.min(c, input.length - 1)];
    const bits = Math.round(params.bits[0]), rate = Math.max(1, params.rate[0]), mix = params.mix[0];
    if (params.enabled[0] < 0.5 || (bits >= 16 && rate <= 1)) {
      for (let c = 0; c < output.length; c++) output[c].set(inCh(c));
      this.cnt = 0; return true;
    }
    const q = bits >= 16 ? 0 : Math.pow(2, bits - 1);   // 片側の段数(bits=1 → 1 段=±1 の2値)
    const nc = Math.min(output.length, 2);
    for (let i = 0; i < frames; i++) {
      if (this.cnt <= 0) {
        for (let c = 0; c < nc; c++) {
          const x = inCh(c)[i];
          this.hold[c] = q ? Math.max(-1, Math.min(1, Math.round(x * q) / q)) : x;
        }
        this.cnt += rate;
      }
      this.cnt -= 1;
      for (let c = 0; c < nc; c++) output[c][i] = inCh(c)[i] * (1 - mix) + this.hold[c] * mix;
    }
    for (let c = 2; c < output.length; c++) output[c].set(output[0]);
    return true;
  }
}
registerProcessor('sd-bitcrush', BitcrushProcessor);
