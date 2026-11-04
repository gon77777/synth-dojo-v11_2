// 出典: pickle-vox-v80/dynamics-worklet.js から抜き取り(動作は元のまま)。登録名は後で sd- 系に直してよい。
// ---------- モジュレーション(コーラス / ダブラー / フランジャー / フェイザー) ----------
// ・マイクの音(モノラル)を受けて、ステレオで返す。原音(ドライ)はそのまま、変調した音(ウェット)を足す
// ・type: 0 = コーラス(約20〜26 ms の遅れをゆらす。左右で逆向き)
//         1 = ダブラー(約30〜42 ms の遅れを、左右で別々に、スムーズなランダムでゆらす。2人で歌ったような厚み。
//             ピッチのずれ(セント)・タイミングのばらつき(ms)・広がり(パンの幅)を持つ。デプスは使わない)
//         2 = フランジャー(約0.5〜5.5 ms の短い遅れ+フィードバック。ジェット機のような音)
//         3 = フェイザー(オールパスフィルタ6段を揺らす+フィードバック。ロボット声・特殊な声質)
// ・遅れの読み出しは線形補間。フィードバックは1サンプル単位で戻す(遅れが短くても正しく動く)
// ・enabled が 0 のときは、原音をそのまま通す(切り替えはなめらか)。種類の切り替えも、短く絞ってから入れ替える
// ・原音は遅らせないので、このエフェクトによる遅れ(レイテンシ)は出ない
class ModFxProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'type', defaultValue: 0, minValue: 0, maxValue: 3, automationRate: 'k-rate' },
      { name: 'rate', defaultValue: 0.8, minValue: 0.05, maxValue: 10, automationRate: 'k-rate' },
      { name: 'depth', defaultValue: 50, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      { name: 'fb', defaultValue: 0, minValue: 0, maxValue: 90, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 50, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      { name: 'enabled', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // ---- ダブラー用 ----
      { name: 'cents', defaultValue: 8, minValue: 0, maxValue: 50, automationRate: 'k-rate' },     // ピッチのずれ(セント。この範囲で、音程がふらふらする)
      { name: 'timing', defaultValue: 4, minValue: 0, maxValue: 10, automationRate: 'k-rate' },    // タイミングのばらつき(ms。重なる声の遅れが、この範囲で変わる)
      { name: 'spread', defaultValue: 80, minValue: 0, maxValue: 100, automationRate: 'k-rate' }   // 広がり(%。0 = 2つの声とも中央、100 = 完全に左右)
    ];
  }

  constructor(options) {
    super();
    this.N = Math.ceil(sampleRate * 0.07) + 8;     // 遅れの長さの上限(約70 ms)
    this.bL = new Float32Array(this.N);
    this.bR = new Float32Array(this.N);
    this.w = 0;
    this.p1 = 0;            // ゆらし(LFO)の位置 0〜1
    // ダブラーの「スムーズなランダム」: 4つ(0 = 声1のタイミング, 1 = 声1のピッチ, 2 = 声2のタイミング, 3 = 声2のピッチ)。
    // 乱数で次の値(-1〜1)を決め、いまの値からなめらかに(smoothstep)つなぐ。乱数の種は、テストで固定できる
    const seed = options && options.processorOptions && Number.isFinite(options.processorOptions.seed) ? options.processorOptions.seed : Math.floor(Math.random() * 4294967296);
    this.rs = (seed >>> 0) || 0x9e3779b9;
    this.gPh = new Float64Array(4);   // 次の値へ向かう途中の位置(0〜1)
    this.gA = new Float64Array(4);    // いまの値(-1〜1)
    this.gB = new Float64Array(4);    // 次の値
    for (let k = 0; k < 4; k++) { this.gPh[k] = this.rnd01(); this.gA[k] = this.rnd01() * 2 - 1; this.gB[k] = this.rnd01() * 2 - 1; }
    this.pD1 = 0; this.pD2 = 0;       // ピッチのずれによる、遅れの変化(秒。声1・声2)
    this.cents = 0; this.timing = 0; this.spread = 0;   // いまの値(なめらかに追従)
    this.depth = 0;         // いまの深さ(0〜1。なめらかに追従)
    this.fb = 0;            // いまのフィードバック(0〜0.9)
    this.a = 0;             // いまの、変調した音の量(ミックス × 使用中)
    this.cur = 0;           // いま鳴らしている種類
    this.sw = 1;            // 種類を切り替えるときの、変調した音の音量(0〜1)
    this.xL = new Float64Array(6); this.yL = new Float64Array(6);   // フェイザーのオールパス(左)の状態
    this.xR = new Float64Array(6); this.yR = new Float64Array(6);   // 右
    this.cL = new Float64Array(6); this.cR = new Float64Array(6);   // オールパスの係数
    this.fbL = 0; this.fbR = 0;                                      // フェイザーのフィードバック用(1つ前の出力)
    this.cnt = 0;
    this.smooth = 1 - Math.exp(-1 / (0.010 * sampleRate));          // パラメータの追従(約10 ms)
    this.smoothSlow = 1 - Math.exp(-1 / (0.060 * sampleRate));      // ダブラーの量(ピッチ・タイミング・広がり)の追従(約60 ms。遅れが急に変わって音程がはねないように)
    this.swStep = 1 / (0.020 * sampleRate);                         // 種類の切り替え(絞る・戻すで約20 msずつ)
    this.RATIO = [1, 1.2, 1.45, 1.75, 2.1, 2.5];                    // 段ごとの周波数の比(ノッチを広げる)
  }

  rnd01() {                       // 0 以上 1 未満の乱数(xorshift32)
    let x = this.rs;
    x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
    this.rs = x;
    return x / 4294967296;
  }

  clearAll() {
    this.bL.fill(0); this.bR.fill(0);
    this.xL.fill(0); this.yL.fill(0); this.xR.fill(0); this.yR.fill(0);
    this.fbL = 0; this.fbR = 0;
    this.pD1 = 0; this.pD2 = 0;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || !output.length) return true;
    const oL = output[0];
    const oR = output.length > 1 ? output[1] : output[0];
    const x = input && input.length ? input[0] : null;
    const frames = oL.length;
    if (!x) { oL.fill(0); if (oR !== oL) oR.fill(0); return true; }

    const sr = sampleRate;
    const enabled = params.enabled[0] >= 0.5;
    const tyT = Math.min(3, Math.max(0, Math.round(params.type[0])));
    const rate = Math.min(10, Math.max(0.05, params.rate[0]));
    const dT = Math.min(1, Math.max(0, params.depth[0] / 100));
    const fT = Math.min(0.9, Math.max(0, params.fb[0] / 100));
    const aT = enabled ? Math.min(1, Math.max(0, params.mix[0] / 100)) : 0;
    const inc1 = rate / sr;
    // ダブラー: 乱数の目標を取り直す速さ。タイミングはレートの半分(ゆっくり)、ピッチはレート(ただし、ずれが大きいときは、遅れが伸びすぎないよう下限あり)。声2は 1.37 倍(別の速さ)
    const KC = Math.LN2 / 1200;                              // 1セントぶんの、周波数の比の変化
    const cT = Math.min(50, Math.max(0, params.cents[0]));
    const tT = Math.min(10, Math.max(0, params.timing[0])) * 0.001;
    const sT = Math.min(1, Math.max(0, params.spread[0] / 100));
    const fTm = Math.max(0.025, rate * 0.5);
    const fPt = Math.max(rate, KC * cT / (3 * 0.006));      // ピッチの動きの速さ(Hz)。遅れの振れ幅が 6 ms を超えない下限
    const gInc = this.gInc || (this.gInc = new Float64Array(4));
    gInc[0] = fTm / sr; gInc[1] = fPt / sr; gInc[2] = fTm * 1.37 / sr; gInc[3] = fPt * 1.37 / sr;
    const { N, bL, bR, smooth, smoothSlow, swStep, RATIO, xL, yL, xR, yR, cL, cR, gPh, gA, gB } = this;
    const TWO_PI = 2 * Math.PI;
    let { w, p1, depth, fb, a, cur, sw, fbL, fbR, cnt, cents, timing, spread } = this;

    for (let i = 0; i < frames; i++) {
      let xi = x[i];
      if (!(xi === xi) || xi > 1e6 || xi < -1e6) xi = 0;    // NaN・極端な値は 0 にする

      depth += (dT - depth) * smooth;
      fb += (fT - fb) * smooth;
      a += (aT - a) * smooth;
      p1 += inc1; if (p1 >= 1) p1 -= 1;
      cents += (cT - cents) * smoothSlow;
      timing += (tT - timing) * smoothSlow;
      spread += (sT - spread) * smoothSlow;

      // 種類の切り替え: いったん絞って、種類を入れ替え、また戻す
      if (tyT !== cur) {
        sw -= swStep;
        if (sw <= 0) { sw = 0; cur = tyT; this.clearAll(); fbL = 0; fbR = 0; cnt = 0; }
      } else if (sw < 1) {
        sw = Math.min(1, sw + swStep);
      }

      // 完全に切っているときは、素通し(遅れの記録だけ続ける)
      if (a < 1e-4 && aT === 0) {
        a = 0;
        bL[w] = xi; bR[w] = xi;
        if (++w >= N) w = 0;
        fbL = 0; fbR = 0;
        oL[i] = xi; oR[i] = xi;
        continue;
      }

      const s1 = Math.sin(TWO_PI * p1);
      let wl, wr, scale = 1;

      if (cur < 3) {
        // ---- 遅れをゆらす系(コーラス・ダブラー・フランジャー) ----
        let dl, dr, fbv = 0;
        if (cur === 0) {
          const md = 0.006 * depth;
          dl = (0.020 + md * s1) * sr;
          dr = (0.026 - md * s1) * sr;
        } else if (cur === 1) {
          // 2つの声それぞれが、タイミングとピッチを、別々のスムーズなランダムでゆらす。
          // ピッチのずれは、遅れの変化の速さ(音程 = 1 - 遅れの変化)として作る: 遅れの振れ幅 = KC × セント ÷ (3 × 動きの速さ)(最大の傾きが、ちょうどそのセントになる)
          let g0 = 0, g1 = 0, g2 = 0, g3 = 0;
          for (let k = 0; k < 4; k++) {
            let ph = gPh[k] + gInc[k];
            if (ph >= 1) { ph -= 1; gA[k] = gB[k]; gB[k] = this.rnd01() * 2 - 1; }
            gPh[k] = ph;
            const v = gA[k] + (gB[k] - gA[k]) * ph * ph * (3 - 2 * ph);
            if (k === 0) g0 = v; else if (k === 1) g1 = v; else if (k === 2) g2 = v; else g3 = v;
          }
          const ap = KC * cents / (3 * fPt);
          dl = (0.030 + timing * g0 + ap * g1) * sr;
          dr = (0.042 + timing * g2 + ap * g3) * sr;
        } else {
          const md = 0.0025 * depth;
          dl = (0.003 + md * s1) * sr;
          dr = (0.003 - md * s1) * sr;
          fbv = fb;
          scale = Math.sqrt(1 - fb * fb);                   // フィードバックで増える音量を、ならす
        }
        if (dl < 2) dl = 2; else if (dl > N - 3) dl = N - 3;
        if (dr < 2) dr = 2; else if (dr > N - 3) dr = N - 3;
        let rp = w - dl; if (rp < 0) rp += N; if (rp >= N) rp -= N;      // 浮動小数の丸めで、ちょうど N になることがある(範囲外を読まないように)
        let i0 = rp | 0; const fl = rp - i0; let i1 = i0 + 1; if (i1 >= N) i1 = 0;
        wl = bL[i0] + (bL[i1] - bL[i0]) * fl;
        rp = w - dr; if (rp < 0) rp += N; if (rp >= N) rp -= N;
        i0 = rp | 0; const fr = rp - i0; i1 = i0 + 1; if (i1 >= N) i1 = 0;
        wr = bR[i0] + (bR[i1] - bR[i0]) * fr;
        if (!(wl === wl) || !(wr === wr) || wl > 50 || wl < -50 || wr > 50 || wr < -50) {
          this.clearAll(); wl = 0; wr = 0;                  // 万一あふれたら、いったん消す
        }
        bL[w] = xi + fbv * wl;
        bR[w] = xi + fbv * wr;
        if (++w >= N) w = 0;
        if (cur === 1) {
          // 広がり: 100% = 声1を左・声2を右、0% = 2つとも中央(どちらも、音量の合計は変わらない)
          const th = (1 - spread) * 0.7853981633974483;
          const pc = Math.cos(th), ps = Math.sin(th);
          const ml = pc * wl + ps * wr, mr = ps * wl + pc * wr;
          wl = ml; wr = mr;
        }
      } else {
        // ---- フェイザー(オールパス6段をゆらす。左右は逆向き) ----
        bL[w] = xi; bR[w] = xi;                              // 種類を戻したとき、古い音が残らないよう記録は続ける
        if (++w >= N) w = 0;
        if ((cnt++ & 7) === 0) {
          const f0L = 700 * Math.pow(2, 2.2 * depth * s1);
          const f0R = 700 * Math.pow(2, -2.2 * depth * s1);
          for (let k = 0; k < 6; k++) {
            let fl = f0L * RATIO[k]; if (fl > sr * 0.45) fl = sr * 0.45;
            let fr = f0R * RATIO[k]; if (fr > sr * 0.45) fr = sr * 0.45;
            const tl = Math.tan(Math.PI * fl / sr), tr = Math.tan(Math.PI * fr / sr);
            cL[k] = (tl - 1) / (tl + 1);
            cR[k] = (tr - 1) / (tr + 1);
          }
        }
        let u = xi + fb * fbL;
        for (let k = 0; k < 6; k++) { const y = cL[k] * (u - yL[k]) + xL[k]; xL[k] = u; yL[k] = y; u = y; }
        fbL = u; wl = u;
        let v = xi + fb * fbR;
        for (let k = 0; k < 6; k++) { const y = cR[k] * (v - yR[k]) + xR[k]; xR[k] = v; yR[k] = y; v = y; }
        fbR = v; wr = v;
        if (!(wl === wl) || !(wr === wr) || wl > 50 || wl < -50 || wr > 50 || wr < -50) {
          this.clearAll(); wl = 0; wr = 0;
        }
        scale = Math.sqrt(1 - fb * fb);
      }

      const wa = a * sw * scale;
      const g = 1 / (1 + 0.5 * a);                           // 足した分の音量上がりを、ならす
      oL[i] = (xi + wl * wa) * g;
      oR[i] = (xi + wr * wa) * g;
    }

    this.w = w; this.p1 = p1; this.depth = depth; this.fb = fb; this.a = a;
    this.cents = cents; this.timing = timing; this.spread = spread;
    this.cur = cur; this.sw = sw; this.fbL = fbL; this.fbR = fbR; this.cnt = cnt;
    return true;
  }
}

registerProcessor('sd-modfx', ModFxProcessor);
