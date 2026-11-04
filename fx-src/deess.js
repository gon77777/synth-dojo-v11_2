// DE-ESS(シンセ道場 v7.2 新規・分割帯域型): 検出帯域(中心 freq のバンドパス)だけを、しきい値を超えた瞬間に抑える。
// 検出帯域以外は素通し(out = in − 帯域 + 帯域×ゲイン)。amt=最大の抑え量(dB)。listen=1 で検出帯域だけを聴く。
// 左右は検出を共有(定位が動かない)。enabled=0 のときは素通し。
class DeEssProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('freq', 6500, 2000, 12000), k('thresh', -30, -60, 0), k('amt', 6, 0, 24), k('listen', 0, 0, 1), k('enabled', 0, 0, 1)];
  }
  constructor() {
    super();
    this.z = [[0, 0], [0, 0]]; this.env = 0; this.g = 1; this.n = 0; this.mx = 0;
    this.ac = 1 - Math.exp(-1 / (0.0005 * sampleRate)); this.rc = 1 - Math.exp(-1 / (0.04 * sampleRate));
    this.sm = 1 - Math.exp(-1 / (0.002 * sampleRate)); this.key = '';
  }
  coef(f) {
    const w = 2 * Math.PI * f / sampleRate, Q = 1.5, al = Math.sin(w) / (2 * Q), a0 = 1 + al;
    this.b0 = al / a0; this.b2 = -al / a0; this.a1 = -2 * Math.cos(w) / a0; this.a2 = (1 - al) / a0; // バンドパス(ピークゲイン 0dB)
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, nc = output.length;
    if (params.enabled[0] < 0.5) { for (let c = 0; c < nc; c++) output[c].set(input[Math.min(c, input.length - 1)]); this.g = 1; this.env = 0; return true; }
    const f = params.freq[0], th = Math.pow(10, params.thresh[0] / 20), amt = params.amt[0], lis = params.listen[0] >= 0.5;
    if (f !== this.key) { this.key = f; this.coef(f); }
    const b0 = this.b0, b2 = this.b2, a1 = this.a1, a2 = this.a2, bp = [0, 0];
    for (let i = 0; i < frames; i++) {
      let pk = 0;
      for (let c = 0; c < nc; c++) {
        const x = input[Math.min(c, input.length - 1)][i], z = this.z[c];
        const y = b0 * x + z[0]; z[0] = -a1 * y + z[1]; z[1] = b2 * x - a2 * y; // 転置直接形II
        bp[c] = y; const a = y < 0 ? -y : y; if (a > pk) pk = a;
      }
      this.env += (pk - this.env) * (pk > this.env ? this.ac : this.rc);
      let grDb = 0; if (this.env > th) grDb = Math.min(amt, 20 * Math.log10(this.env / th));
      const gt = Math.pow(10, -grDb / 20); this.g += (gt - this.g) * this.sm;
      if (grDb > this.mx) this.mx = grDb;
      for (let c = 0; c < nc; c++) {
        const x = input[Math.min(c, input.length - 1)][i];
        output[c][i] = lis ? bp[c] : x - bp[c] + bp[c] * this.g;
      }
    }
    this.n += frames; if (this.n >= 2048) { this.port.postMessage({ gr: this.mx }); this.n = 0; this.mx = 0; }
    return true;
  }
}
registerProcessor('sd-deess', DeEssProcessor);
