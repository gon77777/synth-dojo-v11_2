// TAPE STOP(シンセ道場 v3.4 新規): 約2秒の循環バッファを、速度 speed(1=通常 / 0=停止)で読む。速度が下がるとピッチも下がる
// speed 0..1(k-rate。オートメーションで描ける)/ enabled=0 は素通し
// 仕組み: 読み位置は書き込み位置より「遅れ」dly サンプル後ろ。speed<1 の間は dly が (1−speed) ずつ増える。
//   speed が 1 に戻ったら、10ms のクロスフェードで「いまの音」へ追いつく(遅れを残さない)。
//   遅れがバッファいっぱい(約2秒)になったら無音(テープが止まった状態)。速度が極小のときも音量を絞る(DCを出さない)
class TapestopProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('speed', 1, 0, 1), k('enabled', 0, 0, 1)];
  }
  constructor() {
    super();
    this.N = Math.max(2048, Math.ceil(sampleRate * 2) + 8);
    this.buf = [new Float32Array(this.N), new Float32Array(this.N)];
    this.w = 0; this.dly = 0; this.fade = 0; this.fdly = 0; this.g = 1;
  }
  rd(c, d) {            // 書き込み位置から d サンプル前(線形補間)
    const N = this.N, p = this.w - d, i = Math.floor(p), f = p - i, a = ((i % N) + N) % N, b = (a + 1) % N;
    return this.buf[c][a] * (1 - f) + this.buf[c][b] * f;
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, inCh = c => input[Math.min(c, input.length - 1)], N = this.N, nc = Math.min(output.length, 2);
    const on = params.enabled[0] >= 0.5, sp = Math.max(0, Math.min(1, params.speed[0])), maxD = N - 4, FL = Math.ceil(sampleRate * 0.01);
    for (let i = 0; i < frames; i++) {
      for (let c = 0; c < nc; c++) this.buf[c][this.w] = inCh(c)[i];
      if (!on) { this.dly = 0; this.fade = 0; this.g = 1; for (let c = 0; c < nc; c++) output[c][i] = inCh(c)[i]; this.w = (this.w + 1) % N; continue; }
      if (sp >= 0.999 && this.dly > 0.5 && this.fade === 0) { this.fade = FL; this.fdly = this.dly; this.dly = 0; }
      else if (sp < 0.999) { this.dly = Math.min(maxD, this.dly + (1 - sp)); this.fade = 0; }
      const stopped = this.dly >= maxD - 1;
      const tg = stopped ? 0 : Math.min(1, sp * 12);                  // 速度がほぼ0なら音量を絞る
      this.g += Math.max(-0.002, Math.min(0.002, tg - this.g));
      for (let c = 0; c < nc; c++) {
        let y;
        if (this.fade > 0) { const a = this.fade / FL; y = this.rd(c, this.fdly) * a + inCh(c)[i] * (1 - a); }
        else y = this.dly > 0 ? this.rd(c, this.dly) : inCh(c)[i];
        output[c][i] = y * this.g;
      }
      if (this.fade > 0) { this.fade--; this.fdly += 0; }
      this.w = (this.w + 1) % N;
    }
    for (let c = 2; c < output.length; c++) output[c].set(output[0]);
    return true;
  }
}
registerProcessor('sd-tapestop', TapestopProcessor);
