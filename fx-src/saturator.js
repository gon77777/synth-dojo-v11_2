// 出典: pickle-vox-v80/dynamics-worklet.js から抜き取り(動作は元のまま)。登録名は後で sd- 系に直してよい。
// ---------- サチュレーション(テープ / チューブ / トランス風(NEVE) / マイクプリ風 / ファズ) ----------
// ・声を歪ませて、倍音(温かみ・太さ・荒さ)を足す。ドライブは 0〜+36 dB(入力にかける利得)
// ・歪ませたあとは、大きな声(約 -12 dBFS)の音量がドライブで変わらないように、自動で音量をそろえる。
//   そのため、ドライブを上げると、小さな音ほど持ち上がる(実機のドライブと同じ向き)
// ・type: 0 = テープ(tanh。左右対称・奇数次の倍音。高域が丸まり、低域がほんの少し太る)
//         1 = チューブ(少し偏らせた tanh。偶数次の倍音)
//         2 = トランス風(NEVE。下の説明)
//         3 = マイクプリ風(上下の振れ幅が違う3次のソフトクリップ。クリップが始まると、はっきり頭を打つ)
//         4 = ファズ(強く偏らせた、ほぼ四角に近い歪み。倍音がとても多い)
// ・トランス風(NEVE の 1073 などの入出力トランスの感じ): トランスの鉄心は、低い音ほど先に飽和する。
//   そこで、100 Hz より下ほど(最大 3 倍)強くドライブしてから、非常にやわらかく丸まる曲線(asinh。偶数次+奇数次の倍音)に通し、
//   同じ形で元に戻す(小さな音は素通し。大きな低域だけが潰れて、太く丸くなる)。さらに、低域をほんの少し足す
// ・歪みの計算は「1次の ADAA(歪み関数の積分を使う方式)」で、折り返しノイズ(耳障りなザラつき)を抑える。
//   オーバーサンプリングはしないので、遅れはほぼなし(約0.5サンプル)
// ・out: 歪ませた音の出力(-12〜+12 dB)。原音には、かからない(mix で混ぜる前に、歪ませた音だけを上げ下げする)
// ・mix: 原音と歪ませた音の混ぜ具合(100 で全部歪んだ音)。enabled が 0 のときは、滑らかに素通しへ戻る
// ・タイプの切り替えは、約10 ms のクロスフェード
const SAT_N = 5;
const SAT_REF = 0.25;                                     // 音量をそろえる基準の大きさ(約 -12 dBFS)
const SAT_TUBE_B = 0.2, SAT_TUBE_TB = Math.tanh(0.2);
const SAT_TUBE_N = 1 / (1 - SAT_TUBE_TB * SAT_TUBE_TB);   // 小さな音の利得を 1 にそろえる
const SAT_NEVE_B = 0.12, SAT_NEVE_AB = Math.asinh(0.12);
const SAT_NEVE_N = Math.sqrt(1 + 0.12 * 0.12);
const SAT_NEVE_K = 3;                                     // 低域にかける、追加のドライブ倍率(最大)
const SAT_NEVE_FC = 100;                                  // その境目(Hz)
const SAT_MP_LP = 1.0, SAT_MP_LN = 0.8;                   // マイクプリ風: 上側・下側の振れ幅(違うほど偶数次の倍音が増える)
const SAT_FZ_A = 3, SAT_FZ_B = 0.5, SAT_FZ_TB = Math.tanh(0.5);
const SAT_FZ_N = 1 / (3 * (1 - SAT_FZ_TB * SAT_FZ_TB));

// log(cosh(x)) を、大きな値でもあふれないように計算する
function satLcosh(x) {
  const ax = x < 0 ? -x : x;
  return ax + Math.log1p(Math.exp(-2 * ax)) - 0.6931471805599453;
}
// マイクプリ風の3次のソフトクリップ(t = ±1 で頭を打つ)と、その積分
function satCubic(t) { return t > 1 ? 0.6666666666666666 : t < -1 ? -0.6666666666666666 : t - (t * t * t) / 3; }
function satCubicI(t) { const a = t < 0 ? -t : t; return a <= 1 ? (a * a) / 2 - (a * a * a * a) / 12 : 0.6666666666666666 * a - 0.25; }
// 歪み関数 f(原点を通る。小さな音の傾きは 1)と、その積分 F
function satShape(t, u) {
  switch (t) {
    case 0: return Math.tanh(u);
    case 1: return (Math.tanh(u + SAT_TUBE_B) - SAT_TUBE_TB) * SAT_TUBE_N;
    case 2: return (Math.asinh(u + SAT_NEVE_B) - SAT_NEVE_AB) * SAT_NEVE_N;
    case 3: return u >= 0 ? SAT_MP_LP * satCubic(u / SAT_MP_LP) : SAT_MP_LN * satCubic(u / SAT_MP_LN);
    default: return (Math.tanh(SAT_FZ_A * u + SAT_FZ_B) - SAT_FZ_TB) * SAT_FZ_N;
  }
}
function satInt(t, u) {
  switch (t) {
    case 0: return satLcosh(u);
    case 1: return (satLcosh(u + SAT_TUBE_B) - SAT_TUBE_TB * u) * SAT_TUBE_N;
    case 2: { const w = u + SAT_NEVE_B; return (w * Math.asinh(w) - Math.sqrt(w * w + 1) - SAT_NEVE_AB * u) * SAT_NEVE_N; }
    case 3: return u >= 0 ? SAT_MP_LP * SAT_MP_LP * satCubicI(u / SAT_MP_LP) : SAT_MP_LN * SAT_MP_LN * satCubicI(u / SAT_MP_LN);
    default: return (satLcosh(SAT_FZ_A * u + SAT_FZ_B) / SAT_FZ_A - SAT_FZ_TB * u) * SAT_FZ_N;
  }
}
// ドライブ倍率 g のとき、基準の大きさの音が、基準の大きさで出てくるようにする倍率
function satComp(t, g) {
  const p = satShape(t, g * SAT_REF), n = satShape(t, -g * SAT_REF);
  const m = 0.5 * ((p < 0 ? -p : p) + (n < 0 ? -n : n));
  return m > 1e-9 ? SAT_REF / m : 1;
}

class SaturatorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'drive', defaultValue: 6, minValue: 0, maxValue: 36, automationRate: 'k-rate' },     // dB(0〜+36)
      { name: 'tone', defaultValue: 12000, minValue: 1000, maxValue: 20000, automationRate: 'k-rate' },
      { name: 'mix', defaultValue: 100, minValue: 0, maxValue: 100, automationRate: 'k-rate' },
      { name: 'out', defaultValue: 0, minValue: -12, maxValue: 12, automationRate: 'k-rate' },       // 出力(dB。歪ませた音にだけかかる。原音には、かからない)
      { name: 'type', defaultValue: 0, minValue: 0, maxValue: SAT_N - 1, automationRate: 'k-rate' },
      { name: 'enabled', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
    ];
  }

  constructor() {
    super();
    this.u1 = 0;                                     // 1つ前の、歪ませる前の値(ドライブをかけたあと)
    this.v1 = 0;                                     // トランス風だけ: 低域を強めたあとの、1つ前の値
    this.fp = new Float64Array(SAT_N).fill(NaN);     // タイプごとの、1つ前の値での積分(使い回して計算を減らす。NaN は「未計算」)
    this.w = new Float64Array(SAT_N);                // タイプごとの混ざり具合(なめらかに追従)
    this.w[0] = 1;
    this.comp = new Float64Array(SAT_N).fill(1);     // タイプごとの音量そろえ(なめらかに追従)
    this.compT = new Float64Array(SAT_N).fill(1);
    this.lastG = -1;
    this.dcX = new Float64Array(SAT_N); this.dcY = new Float64Array(SAT_N);   // 直流除去の状態(テープ以外)
    this.dcR = 1 - (2 * Math.PI * 15) / sampleRate;
    this.g = 1;            // いまのドライブ倍率(なめらかに追従)
    this.o = 1;            // いまの出力の倍率(歪ませた音にだけかかる。なめらかに追従)
    this.a = 0;            // いまの歪ませた音の割合(0〜1。なめらかに追従)
    this.lp = 0;           // 高域のまるさ(1次ローパス)の状態
    this.lpCoef = 1;
    this.lastTone = -1;
    this.bump = 0;         // 低域の太り(テープ)の状態
    this.bumpCoef = 1 - Math.exp(-2 * Math.PI * 100 / sampleRate);
    this.nBump = 0;        // 低域の太り(トランス風)の状態
    this.nBumpCoef = 1 - Math.exp(-2 * Math.PI * 70 / sampleRate);
    this.nPre = 0;         // トランス風: 低域を取り出すローパス(100 Hz)
    this.nPost = 0;        // トランス風: 元に戻すためのローパス(100 Hz × K)
    this.nPreCoef = 1 - Math.exp(-2 * Math.PI * SAT_NEVE_FC / sampleRate);
    this.nPostCoef = 1 - Math.exp(-2 * Math.PI * SAT_NEVE_FC * SAT_NEVE_K / sampleRate);
    this.smooth = 1 - Math.exp(-1 / (0.010 * sampleRate));   // パラメータの追従(約10ms)
  }

  // 1次の ADAA。歪ませる前の値 u と、1つ前の値 u1 から、歪ませた値(音量そろえの前)を返す
  adaa(t, u, u1) {
    const du = u - u1;
    const fu = satInt(t, u);
    let y;
    if ((du < 0 ? -du : du) < 1e-5) y = satShape(t, 0.5 * (u + u1));
    else y = (fu - (this.fp[t] === this.fp[t] ? this.fp[t] : satInt(t, u1))) / du;
    this.fp[t] = fu;
    return y;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;

    const ch = Math.min(input.length, output.length);
    const x = input[0];
    const frames = x.length;
    const enabled = params.enabled[0] >= 0.5;
    const driveDb = Math.min(36, Math.max(0, params.drive[0]));
    const driveN = driveDb / 36;
    const gTarget = Math.pow(10, driveDb / 20);              // 0〜+36 dB
    const oTarget = Math.pow(10, Math.min(12, Math.max(-12, params.out[0])) / 20);
    const aTarget = enabled ? Math.min(1, Math.max(0, params.mix[0] / 100)) : 0;
    const tyTarget = Math.min(SAT_N - 1, Math.max(0, Math.round(params.type[0])));
    const tone = Math.min(params.tone[0], sampleRate * 0.45);
    if (tone !== this.lastTone) {
      this.lpCoef = tone >= 19000 ? 1 : 1 - Math.exp(-2 * Math.PI * tone / sampleRate);
      this.lastTone = tone;
    }
    if (gTarget !== this.lastG) {
      for (let t = 0; t < SAT_N; t++) this.compT[t] = satComp(t, gTarget);
      this.lastG = gTarget;
    }
    const lpCoef = this.lpCoef;
    const tapeBump = 0.18 * driveN;                          // テープの低域の太り(最大で +1.5 dB ほど)
    const neveBump = 0.10 + 0.10 * driveN;                   // トランス風の低域の太り(+1 〜 +2 dB ほど)
    const { smooth, bumpCoef, nBumpCoef, nPreCoef, nPostCoef, dcR, w, comp, compT, fp, dcX, dcY } = this;
    const K = SAT_NEVE_K;
    let { u1, v1, g, o, a, lp, bump, nBump, nPre, nPost } = this;

    for (let i = 0; i < frames; i++) {
      let xi = x[i];
      if (!(xi === xi) || xi > 1e6 || xi < -1e6) xi = 0;    // NaN・極端な値は 0 にする

      g += (gTarget - g) * smooth;
      a += (aTarget - a) * smooth;
      o += (oTarget - o) * smooth;
      nPre += (xi - nPre) * nPreCoef;                        // 低域(100 Hz 以下)。トランス風用。常に追従させる

      if (a < 1e-4 && aTarget === 0) {
        // 完全に素通し。状態だけ保っておく
        a = 0;
        u1 = g * xi; v1 = g * (xi + (K - 1) * nPre);
        fp.fill(NaN);
        for (let t = 0; t < SAT_N; t++) { dcX[t] = 0; dcY[t] = 0; w[t] = t === tyTarget ? 1 : 0; comp[t] = compT[t]; }
        lp = xi; bump = 0; nBump = 0; nPost = 0;
        output[0][i] = xi;
        continue;
      }

      const u = g * xi;
      const v = g * (xi + (K - 1) * nPre);
      let wet = 0;

      for (let t = 0; t < SAT_N; t++) {
        w[t] += ((t === tyTarget ? 1 : 0) - w[t]) * smooth;
        comp[t] += (compT[t] - comp[t]) * smooth;
        if (w[t] < 0.001 && t !== tyTarget) {               // 使っていないタイプは、計算を省く
          w[t] = 0; fp[t] = NaN; dcX[t] = 0; dcY[t] = 0;
          if (t === 2) nPost = 0, nBump = 0;
          continue;
        }
        let y;
        if (t === 2) {
          // トランス風: 低域を強めて歪ませ、同じ形で戻す
          y = this.adaa(2, v, v1) * comp[2];
          const yd = y - dcX[2] + dcR * dcY[2]; dcX[2] = y; dcY[2] = yd; y = yd;
          nPost += (y - nPost) * nPostCoef;
          y -= ((K - 1) / K) * nPost;
          nBump += (y - nBump) * nBumpCoef;
          y += neveBump * nBump;
        } else {
          y = this.adaa(t, u, u1) * comp[t];
          if (t === 0) {
            bump += (y - bump) * bumpCoef;                   // 低域の太り(100 Hz 以下をほんの少し足す)
            y += tapeBump * bump;
          } else {                                           // 直流を取り除く(偏らせた分の、ゆっくりしたずれ)
            const yd = y - dcX[t] + dcR * dcY[t]; dcX[t] = y; dcY[t] = yd; y = yd;
          }
        }
        wet += w[t] * y;
      }

      // 高域のまるさ(1次ローパス)
      lp += (wet - lp) * lpCoef;
      wet = lp * o;

      u1 = u; v1 = v;
      output[0][i] = xi + (wet - xi) * a;
    }

    this.u1 = u1; this.v1 = v1; this.g = g; this.o = o; this.a = a; this.lp = lp;
    this.bump = bump; this.nBump = nBump; this.nPre = nPre; this.nPost = nPost;
    for (let c = 1; c < ch; c++) output[c].set(output[0]);
    return true;
  }
}

registerProcessor('sd-saturator', SaturatorProcessor);
