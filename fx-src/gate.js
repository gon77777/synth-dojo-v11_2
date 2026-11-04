// 出典: pickle-vox-v80/dynamics-worklet.js から抜き取り(動作は元のまま)。登録名は後で sd- 系に直してよい。
// ---------- ノイズゲート ----------
// ・音の大きさ(ピーク)を測り、しきい値を超えたら開き、下回ったら(ホールド後)閉じる
// ・開閉のチャタリングを防ぐため、閉じるしきい値は開くしきい値より 4 dB 低い
// ・音量の変化は dB で直線的に動かす(ぷつっという音を出さない)。開く速さは固定(1.5ms)
// ・enabled が 0 のときは、常に開いた状態(素通し)になる
class GateProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -50, minValue: -100, maxValue: 0, automationRate: 'k-rate' },
      { name: 'hold', defaultValue: 100, minValue: 0, maxValue: 2000, automationRate: 'k-rate' },
      { name: 'release', defaultValue: 200, minValue: 1, maxValue: 5000, automationRate: 'k-rate' },
      { name: 'range', defaultValue: -60, minValue: -120, maxValue: 0, automationRate: 'k-rate' },
      { name: 'enabled', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.env = 0;                 // 音の大きさ(ピーク包絡)
    this.envDecay = Math.exp(-1 / (0.010 * sampleRate)); // 包絡の戻り(約10ms)
    this.gDb = 0;                 // いまのゲイン(dB。0 = 素通し)
    this.open = true;
    this.holdLeft = 0;
    this.openStep = 1 / (0.0015 * sampleRate); // 全幅を開くのにかかる速さ(1.5ms)
    this.reportEvery = Math.max(1, Math.round(sampleRate / 20));
    this.sinceReport = 0;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;

    const ch = Math.min(input.length, output.length);
    const frames = input[0].length;
    const enabled = params.enabled[0] >= 0.5;
    const openThr = Math.pow(10, params.threshold[0] / 20);
    const closeThr = openThr * 0.6310; // -4 dB
    const holdSamples = Math.round(params.hold[0] * 0.001 * sampleRate);
    const rangeDb = Math.min(0, params.range[0]);
    const span = Math.max(1, -rangeDb);
    const closeStep = span / Math.max(1, params.release[0] * 0.001 * sampleRate); // 全幅を閉じるのにかかる速さ
    const openStep = this.openStep * span;

    for (let i = 0; i < frames; i++) {
      let peak = 0;
      for (let c = 0; c < ch; c++) {
        const a = Math.abs(input[c][i]);
        if (a > peak) peak = a;
      }
      this.env = peak > this.env ? peak : this.env * this.envDecay;

      if (!enabled) {
        this.open = true;
        this.holdLeft = holdSamples;
      } else if (this.env >= openThr) {
        this.open = true;
        this.holdLeft = holdSamples;
      } else if (this.open && this.env < closeThr) {
        if (this.holdLeft > 0) this.holdLeft--;
        else this.open = false;
      }

      const target = this.open ? 0 : rangeDb;
      if (this.gDb < target) this.gDb = Math.min(target, this.gDb + openStep);
      else if (this.gDb > target) this.gDb = Math.max(target, this.gDb - closeStep);

      const g = this.gDb >= 0 ? 1 : Math.pow(10, this.gDb / 20);
      for (let c = 0; c < ch; c++) output[c][i] = input[c][i] * g;
    }

    this.sinceReport += frames;
    if (this.sinceReport >= this.reportEvery) {
      this.sinceReport = 0;
      this.port.postMessage({ open: this.open, gr: this.gDb });
    }
    return true;
  }
}

registerProcessor('sd-gate', GateProcessor);
