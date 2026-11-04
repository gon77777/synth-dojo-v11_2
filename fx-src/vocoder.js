// VOCODER(シンセ道場 v10.11 FX-5c。5b から): チャンネルボコーダー。入力0=搬送波(マスターの音)・入力1=モジュレーター(vcSrc のトラックのキー)。
// 仕組み: モジュレーターと搬送波を、同じ N 本の帯域(BANDS=8/12/16/20。RANGE の lo〜hi を対数で等分)に分ける(2次バンドパス×2段=4次)。
//   モジュレーターの各帯域を整流して、ATTACK/RELEASE のエンベロープフォロワーで音量の形(env)にし、搬送波の同じ帯域に掛けて足す。
//   env は整流の平均(振幅の 2/π)を π/2 倍して、帯域のサイン波の振幅に合わせてある。
// keyOn=0(SRC=INT)・enabled=0 は素通し(入力0とビット一致)。keyOn=1 でモジュレーターが無音なら、出力も無音(env が0に戻る)。
// MIX=原音(搬送波・遅らせない=IIRなので遅延ゼロ)との割合。約20msで追従。BANDS/RANGE を変えたら帯域を作り直す(状態を捨てる)。
// FX-5c: NOISE(0〜1)= 搬送波にホワイトノイズを足して(帯域に分ける前の wet 側だけ。MIX のドライには混ぜない)、子音(s・t)の「息」の成分を作る。0 は 5b と完全に同じ。
//        FORMANT(-12〜+12 半音)= 搬送波の側の帯域の中心周波数だけを 2^(F/12) 倍にずらす(モジュレーターの分析帯域は動かさない)=声質(フォルマント)が上下する。0 は 5b と完全に同じ。
//        FORMANT だけの変更は状態を捨てずに係数だけ替える(レーンで動かしてもクリックしにくい)。
// 安全: 入力の NaN/Inf は0にする。出力が壊れたら状態を捨てて復帰。出力は ±4 に制限。
const VC_MAXB = 24;
class VocoderProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('enabled', 0, 0, 1), k('keyOn', 0, 0, 1), k('bands', 16, 4, VC_MAXB), k('lo', 100, 40, 2000), k('hi', 8000, 1000, 18000),
      k('attack', 5, 0.5, 200), k('release', 40, 2, 1000), k('mix', 1, 0, 1), k('noise', 0, 0, 1), k('formant', 0, -12, 12)];
  }
  constructor() {
    super();
    this.n = 0; this.sig = ''; this.b0 = new Float64Array(VC_MAXB); this.a1 = new Float64Array(VC_MAXB); this.a2 = new Float64Array(VC_MAXB);
    this.zm = new Float64Array(VC_MAXB * 4); this.zl = new Float64Array(VC_MAXB * 4); this.zr = new Float64Array(VC_MAXB * 4); this.env = new Float64Array(VC_MAXB);
    this.mx = 1; this.fm = NaN; this.c0 = new Float64Array(VC_MAXB); this.c1 = new Float64Array(VC_MAXB); this.c2 = new Float64Array(VC_MAXB); this.rs = 0x9e3779b9;
  }
  reset() { this.zm.fill(0); this.zl.fill(0); this.zr.fill(0); this.env.fill(0); }
  coef(f, q, B, A1, A2, i) {
    const w = 2 * Math.PI * f / sampleRate, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    B[i] = al / a0; A1[i] = -2 * Math.cos(w) / a0; A2[i] = (1 - al) / a0;
  }
  prep(bands, lo, hi, fm) {
    const n = Math.max(4, Math.min(VC_MAXB, Math.round(bands))), sig = n + ':' + lo + ':' + hi;
    if (sig !== this.sig) {
      this.sig = sig; this.n = n; this.reset(); this.fm = NaN;
      const sr = sampleRate, top = Math.min(hi, sr * 0.45), r = Math.pow(top / lo, 1 / (n - 1)), bw = Math.log2(r);
      this.r = r; this.lo = lo;
      this.q = Math.max(0.7, 0.9 / (2 * Math.sinh(Math.LN2 / 2 * bw)));   // 隣の帯域と重なる幅(2段重ねで狭くなるぶん少し広く)
      for (let i = 0; i < n; i++) this.coef(lo * Math.pow(this.r, i), this.q, this.b0, this.a1, this.a2, i);
    }
    if (fm !== this.fm) {   // 搬送波の側の帯域: FORMANT 半音ぶん周波数をずらす(0 なら分析の帯域と同じ係数=5b と同じ)
      this.fm = fm;
      const k = Math.pow(2, fm / 12), lim = sampleRate * 0.45;
      for (let i = 0; i < this.n; i++) {
        if (fm === 0) { this.c0[i] = this.b0[i]; this.c1[i] = this.a1[i]; this.c2[i] = this.a2[i]; }
        else this.coef(Math.min(lim, Math.max(20, this.lo * Math.pow(this.r, i) * k)), this.q, this.c0, this.c1, this.c2, i);
      }
    }
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!output || !output.length) return true;
    if (!input || !input.length) { for (let c = 0; c < output.length; c++) output[c].fill(0); return true; }
    const frames = output[0].length, inCh = input.length, outCh = output.length;
    const num = (v, d, a, b) => { v = +v; return v === v ? Math.min(b, Math.max(a, v)) : d; };
    if (params.enabled[0] < 0.5 || params.keyOn[0] < 0.5) {
      for (let c = 0; c < outCh; c++) output[c].set(input[Math.min(c, inCh - 1)]);
      this.mx = 1; if (this.sig) { this.sig = ''; this.reset(); }
      return true;
    }
    const sr = sampleRate, lo = num(params.lo[0], 100, 40, 2000), hi = Math.max(lo * 2, num(params.hi[0], 8000, 1000, 18000));
    this.prep(num(params.bands[0], 16, 4, VC_MAXB), lo, hi, Math.round(num(params.formant[0], 0, -12, 12) * 100) / 100);
    const n = this.n, b0 = this.b0, a1 = this.a1, a2 = this.a2, c0 = this.c0, c1 = this.c1, c2 = this.c2, nz = num(params.noise[0], 0, 0, 1), zm = this.zm, zl = this.zl, zr = this.zr, env = this.env;
    const ca = 1 - Math.exp(-1 / (num(params.attack[0], 5, 0.5, 200) * 0.001 * sr)), cr = 1 - Math.exp(-1 / (num(params.release[0], 40, 2, 1000) * 0.001 * sr));
    const mT = num(params.mix[0], 1, 0, 1), mk = 1 - Math.exp(-1 / (0.02 * sr)), G = Math.PI / 2;
    const key = inputs[1], kc = key ? key.length : 0, kA = kc > 0 ? key[0] : null, kB = kc > 1 ? key[1] : kA;
    const xL = input[0], xR = input[Math.min(1, inCh - 1)], oL = output[0], oR = output[Math.min(1, outCh - 1)];
    let bad = false;
    for (let s = 0; s < frames; s++) {
      let m = 0;
      if (kA) { const p = kA[s], q = kB[s]; m = 0.5 * ((p === p && p - p === 0 ? p : 0) + (q === q && q - q === 0 ? q : 0)); }
      let l = xL[s], r = xR[s]; if (!(l - l === 0)) l = 0; if (!(r - r === 0)) r = 0;
      let rs = this.rs; rs ^= rs << 13; rs ^= rs >>> 17; rs ^= rs << 5; this.rs = rs >>> 0; const w1 = (this.rs / 2147483648 - 1) * nz, w2 = ((Math.imul(this.rs, 1664525) + 1013904223 >>> 0) / 2147483648 - 1) * nz;
      const cl = l + w1, cr0 = r + w2;
      let wl = 0, wr = 0;
      for (let i = 0, j = 0; i < n; i++, j += 4) {
        const B = b0[i], A1 = a1[i], A2 = a2[i], C0 = c0[i], C1 = c1[i], C2 = c2[i];
        // モジュレーター(2段)
        let y = B * m + zm[j]; zm[j] = zm[j + 1] - A1 * y; zm[j + 1] = -B * m - A2 * y;
        let y2 = B * y + zm[j + 2]; zm[j + 2] = zm[j + 3] - A1 * y2; zm[j + 3] = -B * y - A2 * y2;
        const a = y2 < 0 ? -y2 : y2, e = env[i]; env[i] = e + (a - e) * (a > e ? ca : cr);
        // 搬送波 左
        y = C0 * cl + zl[j]; zl[j] = zl[j + 1] - C1 * y; zl[j + 1] = -C0 * cl - C2 * y;
        y2 = C0 * y + zl[j + 2]; zl[j + 2] = zl[j + 3] - C1 * y2; zl[j + 3] = -C0 * y - C2 * y2;
        wl += y2 * env[i];
        // 搬送波 右
        y = C0 * cr0 + zr[j]; zr[j] = zr[j + 1] - C1 * y; zr[j + 1] = -C0 * cr0 - C2 * y;
        y2 = C0 * y + zr[j + 2]; zr[j + 2] = zr[j + 3] - C1 * y2; zr[j + 3] = -C0 * y - C2 * y2;
        wr += y2 * env[i];
      }
      this.mx += (mT - this.mx) * mk; const mx = this.mx;
      let ol = l + (wl * G - l) * mx, or = r + (wr * G - r) * mx;
      if (!(ol - ol === 0) || !(or - or === 0)) { bad = true; ol = 0; or = 0; }
      oL[s] = ol > 4 ? 4 : ol < -4 ? -4 : ol; if (oR !== oL) oR[s] = or > 4 ? 4 : or < -4 ? -4 : or;
    }
    if (bad) this.reset();
    else for (let i = 0; i < n; i++) { if (env[i] < 1e-20) env[i] = 0; }
    for (let c = 2; c < outCh; c++) output[c].set(output[1]);
    return true;
  }
}
registerProcessor('sd-vocoder', VocoderProcessor);
