// 出典: pickle-vox-v80/dynamics-worklet.js から抜き取り(動作は元のまま)。登録名は後で sd- 系に直してよい。
// ---------- リミッター ----------
// ・約2ms先読みして、上限(ceiling)を超えそうな音を、手前から滑らかに下げる(ステレオ連動)
// ・最後に、そのサンプル自身が上限を超えないよう安全に抑える(上限を超えない)
// ・戻りはリリース(ms)で、ゆっくり元に戻す
// ・先読みぶん、約2msの遅れが出る
class LimiterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'ceiling', defaultValue: -1, minValue: -24, maxValue: 0, automationRate: 'k-rate' },
      { name: 'release', defaultValue: 80, minValue: 1, maxValue: 2000, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    const N = Math.max(8, Math.round(sampleRate * 0.002));
    this.N = N;
    this.bufL = new Float32Array(N);
    this.bufR = new Float32Array(N);
    this.req = new Float32Array(N).fill(1); // 各サンプルが必要とするゲイン
    this.pos = 0;
    this.curMin = 1;                         // 窓の中の最小ゲイン
    this.g = 1;
    this.atk = 1 - Math.exp(-5 / N);        // 先読みの間に、ほぼ目標まで下げる
    this.minG = 1;
    this.reportEvery = Math.max(1, Math.round(sampleRate / 20));
    this.sinceReport = 0;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || !output.length) return true;
    if (!input || !input.length) return true; // 入力なし: 無音のまま

    const inL = input[0];
    const inR = input[1] || input[0];
    const outL = output[0];
    const outR = output[1] || null;
    const frames = inL.length;
    const ceil = Math.pow(10, params.ceiling[0] / 20);
    const rel = 1 - Math.exp(-1 / Math.max(1, params.release[0] * 0.001 * sampleRate));
    const N = this.N;
    const bufL = this.bufL;
    const bufR = this.bufR;
    const reqRing = this.req;
    let pos = this.pos;
    let curMin = this.curMin;
    let g = this.g;
    let minG = this.minG;

    for (let i = 0; i < frames; i++) {
      const xL = inL[i];
      const xR = inR[i];
      const oL = bufL[pos];
      const oR = bufR[pos];
      const oldReq = reqRing[pos];

      const a = Math.max(Math.abs(xL), Math.abs(xR));
      const r = a > ceil ? ceil / a : 1;
      bufL[pos] = xL;
      bufR[pos] = xR;
      reqRing[pos] = r;

      // 窓(直近 N サンプル)の最小ゲインを更新する
      if (r <= curMin) {
        curMin = r;
      } else if (oldReq <= curMin) {
        // 最小だったサンプルが窓から出ていった: 数え直す
        let m = 1;
        for (let k = 0; k < N; k++) if (reqRing[k] < m) m = reqRing[k];
        curMin = m;
      }

      g += (curMin - g) * (curMin < g ? this.atk : rel);
      const gg = g < oldReq ? g : oldReq;
      if (gg < minG) minG = gg;

      outL[i] = oL * gg;
      if (outR) outR[i] = oR * gg;

      pos++;
      if (pos >= N) pos = 0;
    }

    this.pos = pos;
    this.curMin = curMin;
    this.g = g;

    this.sinceReport += frames;
    if (this.sinceReport >= this.reportEvery) {
      this.sinceReport = 0;
      this.port.postMessage({ gr: minG > 0 ? 20 * Math.log10(minG) : -96 });
      minG = 1;
    }
    this.minG = minG;
    return true;
  }
}

registerProcessor('sd-limiter', LimiterProcessor);
