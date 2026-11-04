// 出典: pickle-vox-v80/dsp.js の1〜267行(リバーブIR生成・センド/コンプ特性・EQ応答・ソフトクリップ)。検出系は含めない。
// キュウカンバーブ: 音の計算部分(画面や AudioContext に依存しない純粋な関数)
(function (root) {
  'use strict';

  // タイプごとの特徴。
  //  build   : 残響の立ち上がりの速さ(秒)。大きいほどゆっくり広がる
  //  erLevel : 初期反射(最初に聞こえる壁からの反射)の強さ。0で無し
  //  taps    : 初期反射の時刻(ms)
  //  decay / pre / damp : そのタイプを選んだときの、おすすめの初期値
  const TYPE_PROFILES = {
    room: {
      decay: 0.8, pre: 5, damp: 55,
      build: 0.004, erLevel: 0.9,
      taps: [3.5, 6.2, 9.8, 14, 19, 25, 32, 40]
    },
    hall: {
      decay: 2.8, pre: 25, damp: 50,
      build: 0.03, erLevel: 0.55,
      taps: [12, 21, 33, 47, 63, 82, 104, 130]
    },
    plate: {
      decay: 1.8, pre: 0, damp: 25,
      build: 0.002, erLevel: 0,
      taps: []
    }
  };

  const ER_STEP = 0.85; // 初期反射が1つ進むごとの減り方

  // 乱数を固定して、出力用とモニター用で全く同じ響きにする
  function mulberry32(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 残響の波形(インパルス応答)を作る。
  //  decay : -60dB まで減る時間(秒)
  //  damp  : 0〜100。大きいほど高域が早く消える
  //  seed  : 0, 1, 2...。同じ種類のリバーブを複数並べるとき、別々の乱数にして、波形が似て濁るのを防ぐ(0は従来と同じ)
  function generateImpulse(rate, p) {
    const prof = TYPE_PROFILES[p.type] || TYPE_PROFILES.hall;
    const typeIndex = Object.keys(TYPE_PROFILES).indexOf(p.type);
    const decay = Math.max(0.1, p.decay);
    const damp = Math.min(1, Math.max(0, p.damp / 100));
    const len = Math.max(256, Math.floor(rate * decay * 1.15));
    const decayStep = Math.exp(-6.9078 / (decay * rate)); // 1サンプルごとの減衰(-60dBで0.001)
    const onStep = Math.exp(-1 / (prof.build * rate));
    const dampStep = Math.exp(-3 / (decay * rate));
    // 初期反射の強さを、拡散した残響の密度に合わせて決める
    const erBase = Math.sqrt((rate / 1000) * 0.33);
    const out = [];

    for (let ch = 0; ch < 2; ch++) {
      const rnd = mulberry32(1234 + ch * 7919 + typeIndex * 101 + (p.seed | 0) * 30011);
      const d = new Float32Array(len);
      let env = 1, on = 1, dm = 1, y = 0;
      for (let i = 0; i < len; i++) {
        env *= decayStep;
        on *= onStep;
        dm *= dampStep;
        // 時間とともに高域をなだらかに削る(ダンピング)
        const a = 0.95 - 0.92 * damp * (1 - dm);
        const x = (rnd() * 2 - 1) * env * (1 - on);
        y += (x - y) * a;
        d[i] = y;
      }
      // 初期反射。左右でわずかに時刻をずらして広がりを出す
      if (prof.erLevel > 0) {
        prof.taps.forEach((ms, k) => {
          const jitter = (rnd() * 2 - 1) * 0.0015;
          const t = ms / 1000 + (ch ? jitter : -jitter);
          const idx = Math.floor(t * rate);
          const sign = rnd() < 0.5 ? -1 : 1;
          if (idx > 0 && idx < len) {
            d[idx] += sign * prof.erLevel * Math.pow(ER_STEP, k) * erBase * 0.9;
          }
        });
      }
      // 最後を短くなめらかに閉じる
      const fade = Math.min(len, Math.floor(rate * 0.05));
      for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
      out.push(d);
    }
    return { L: out[0], R: out[1] };
  }

  // 「かかり具合」(0〜100)をリバーブ声の音量(倍率)にする。0で完全に無音、100で+6dB
  function sendGain(mix) {
    if (mix <= 0) return 0;
    const x = mix / 100;
    return 2 * x * x;
  }

  // コンプの入出力特性(dB)。ソフトニー付き
  function compOut(x, thr, ratio, knee) {
    const k = knee || 0;
    const d = x - thr;
    if (2 * d < -k) return x;
    if (k > 0 && 2 * Math.abs(d) <= k) {
      const t = d + k / 2;
      return x + (1 / ratio - 1) * t * t / (2 * k);
    }
    return thr + d / ratio;
  }

  // 中域ブースト(ピーキングEQ)の特性(dB)。f0 が中心、gainDb がブースト量、q が幅
  function peakingMagDb(f, f0, gainDb, q) {
    if (!gainDb) return 0;
    const A = Math.pow(10, gainDb / 40);
    const x = f / f0;
    const base = (1 - x * x) * (1 - x * x);
    const n = base + Math.pow((x * A) / q, 2);
    const d = base + Math.pow(x / (A * q), 2);
    return 10 * Math.log10(n / d);
  }

  // ---- EQバンド(ベル / ローシェルフ / ハイシェルフ / ノッチ) ----
  // Web Audio の BiquadFilterNode と同じ式(RBJ)で、バンド1つぶんの特性(dB)を求める。
  //   type : 'bell'(peaking) / 'lowshelf' / 'highshelf' / 'notch'
  //   gain : ベルとシェルフの量(dB)。ノッチでは使わない
  //   q    : ベルとノッチの幅(Q)。シェルフでは使わない(BiquadFilterNode のシェルフは Q を無視するため)
  const EQ_FS = 48000;
  function bandMagDb(f, type, f0, gainDb, q, fs) {
    const rate = fs || EQ_FS;
    if ((type === 'bell' || type === 'lowshelf' || type === 'highshelf') && !gainDb) return 0;
    const w0 = 2 * Math.PI * f0 / rate;
    const cs = Math.cos(w0);
    const sn = Math.sin(w0);
    const A = Math.pow(10, (gainDb || 0) / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lowshelf' || type === 'highshelf') {
      const al = sn / 2 * Math.SQRT2;       // S = 1
      const k = 2 * Math.sqrt(A) * al;
      if (type === 'lowshelf') {
        b0 = A * ((A + 1) - (A - 1) * cs + k);
        b1 = 2 * A * ((A - 1) - (A + 1) * cs);
        b2 = A * ((A + 1) - (A - 1) * cs - k);
        a0 = (A + 1) + (A - 1) * cs + k;
        a1 = -2 * ((A - 1) + (A + 1) * cs);
        a2 = (A + 1) + (A - 1) * cs - k;
      } else {
        b0 = A * ((A + 1) + (A - 1) * cs + k);
        b1 = -2 * A * ((A - 1) + (A + 1) * cs);
        b2 = A * ((A + 1) + (A - 1) * cs - k);
        a0 = (A + 1) - (A - 1) * cs + k;
        a1 = 2 * ((A - 1) - (A + 1) * cs);
        a2 = (A + 1) - (A - 1) * cs - k;
      }
    } else {
      const al = sn / (2 * Math.max(0.01, q));
      if (type === 'notch') {
        b0 = 1; b1 = -2 * cs; b2 = 1;
        a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;
      } else { // bell
        b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A;
        a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A;
      }
    }
    const w = 2 * Math.PI * Math.min(f, rate * 0.499) / rate;
    const c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    const nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2);
    const dr = a0 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
    const num = nr * nr + ni * ni;
    const den = dr * dr + di * di;
    return 10 * Math.log10(Math.max(1e-12, num) / Math.max(1e-12, den));
  }

  // Qの特性。'const' = 量(ゲイン)に関係なく、Qは一定。
  // 'prop' = 量が大きいほどQが大きく(狭く)なる(プロポーショナルQ。ブーストを強くしても、広がりすぎない)
  function effQ(q, gainDb, mode) {
    if (mode !== 'prop') return q;
    return Math.min(40, q * (1 + Math.abs(gainDb || 0) / 8));
  }

  // 1つのバンドの特性。band は { type, freq, gain, q }。qMode は effQ の mode
  function eqBandDb(f, band, qMode) {
    return bandMagDb(f, band.type || 'bell', band.freq, band.gain, effQ(band.q, band.gain, qMode));
  }

  // ローカット+ハイカット(各12dB/oct)+各バンドの合成特性(dB)
  // bands は、{ type, freq, gain, q } の配列(1つだけのオブジェクトでも可)。省略するとバンドなし
  function eqMagDb(f, lowcut, highcut, bands, qMode) {
    const xl = f / lowcut;
    const xh = f / highcut;
    const hp = (xl * xl) / Math.sqrt(1 + Math.pow(xl, 4));
    const lp = 1 / Math.sqrt(1 + Math.pow(xh, 4));
    let db = 20 * Math.log10(Math.max(1e-6, hp * lp));
    const list = !bands ? [] : (Array.isArray(bands) ? bands : [bands]);
    list.forEach((b) => { db += eqBandDb(f, b, qMode); });
    return db;
  }

  // 読み込んだIR(インパルス応答)を、ConvolverNode に渡せる形に整える。
  //  channels : Float32Array の配列(元のチャンネル)
  //  戻り値   : { channels: 最大2チャンネル, truncated: 長すぎて切ったか }
  //  - 3チャンネル以上は先頭の2つだけ使う
  //  - maxSec を超える部分は切り、最後をなめらかに閉じる
  function shapeImpulse(channels, rate, maxSec) {
    const maxLen = Math.floor(rate * (maxSec || 30));
    const use = channels.slice(0, 2);
    const len = Math.min(use[0].length, maxLen);
    const truncated = use[0].length > maxLen;
    const out = use.map((ch) => {
      const d = ch.slice(0, len);
      if (truncated) {
        const fade = Math.min(len, Math.floor(rate * 0.05));
        for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
      }
      return d;
    });
    return { channels: out, truncated };
  }

  // IRの「減り方」(シュレーダー積分)。グラフ表示用
  //  戻り値: { db: Float32Array(points+1), duration, t60 }
  //   db[i] は時刻 i*duration/points での残りエネルギー(0dBが最大)
  //   t60 は -60dB に達する時刻(秒)
  function impulseDecayCurve(channels, rate, points) {
    const n = channels[0].length;
    const pts = points || 240;
    const duration = n / rate;
    const binE = new Float64Array(pts);
    for (let b = 0; b < pts; b++) {
      const s0 = Math.floor((b * n) / pts);
      const s1 = Math.floor(((b + 1) * n) / pts);
      let e = 0;
      for (let c = 0; c < channels.length; c++) {
        const d = channels[c];
        for (let i = s0; i < s1; i++) e += d[i] * d[i];
      }
      binE[b] = e;
    }
    const tail = new Float64Array(pts + 1); // tail[i] = i番目以降のエネルギー合計
    for (let i = pts - 1; i >= 0; i--) tail[i] = tail[i + 1] + binE[i];
    const total = tail[0];
    const db = new Float32Array(pts + 1);
    let t60 = duration;
    let found = false;
    for (let i = 0; i <= pts; i++) {
      db[i] = total > 0 ? Math.max(-90, 10 * Math.log10(Math.max(tail[i] / total, 1e-9))) : -90;
      if (!found && db[i] <= -60) {
        found = true;
        const prev = i > 0 ? db[i - 1] : 0;
        const frac = prev > db[i] ? (prev + 60) / (prev - db[i]) : 1;
        t60 = ((i - 1 + Math.min(1, Math.max(0, frac))) * duration) / pts;
        if (i === 0) t60 = 0;
      }
    }
    return { db, duration, t60 };
  }

  // 出力が歪みにくくするためのやわらかいクリップ(0.8を超えた分をなだらかに抑える)
  function softClipCurve(n) {
    const size = n || 2048;
    const c = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1)) * 2 - 1;
      const ax = Math.abs(x);
      c[i] = ax < 0.8 ? x : Math.sign(x) * (0.8 + 0.2 * Math.tanh((ax - 0.8) / 0.2));
    }
    return c;
  }

  // ---- EQ4(トラック別インサート。v7.0a) ----
  // ブラウザの BiquadFilterNode(Web Audio 仕様)と同じ式の係数。type: lowpass/highpass(qDb=Q[dB])・peaking(q)・lowshelf/highshelf(S=1)
  function biquadCoef(type, f, sr, gainDb, q, qDb) {
    const w0 = 2 * Math.PI * Math.max(1e-6, Math.min(sr / 2, f)) / sr, c = Math.cos(w0), sn = Math.sin(w0);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lowpass' || type === 'highpass') {
      const al = sn / (2 * Math.pow(10, (qDb == null ? -3.0103 : qDb) / 20));
      if (type === 'lowpass') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
      a0 = 1 + al; a1 = -2 * c; a2 = 1 - al;
    } else {
      const A = Math.pow(10, (gainDb || 0) / 40);
      if (type === 'peaking') {
        const al = sn / (2 * Math.max(1e-6, q || 1));
        b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A;
      } else {
        const al = sn / 2 * Math.sqrt(2), t = 2 * Math.sqrt(A) * al;
        if (type === 'lowshelf') {
          b0 = A * ((A + 1) - (A - 1) * c + t); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - t);
          a0 = (A + 1) + (A - 1) * c + t; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - t;
        } else {
          b0 = A * ((A + 1) + (A - 1) * c + t); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - t);
          a0 = (A + 1) - (A - 1) * c + t; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - t;
        }
      }
    }
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  function biquadDb(co, f, sr) {
    const w = 2 * Math.PI * f / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
    const nr = co[0] + co[1] * c1 + co[2] * c2, ni = -(co[1] * s1 + co[2] * s2), dr = 1 + co[3] * c1 + co[4] * c2, di = -(co[3] * s1 + co[4] * s2);
    return 10 * Math.log10(Math.max(1e-30, (nr * nr + ni * ni) / (dr * dr + di * di)));
  }
  // EQ4の6段(HPF→LOW棚→BELL1→BELL2→HIGH棚→LPF)。p は mix のつまみ(iEqHpf …)。画面とテストで共用
  function eq4Stages(p, sr) {
    const g = (k, d) => (p[k] == null ? d : p[k]);
    return [['highpass', g('iEqHpf', 20), 0, 0], ['lowshelf', g('iEqLf', 200), g('iEqLg', 0), 0], ['peaking', g('iEqB1f', 250), g('iEqB1g', 0), g('iEqB1q', 1)],
      ['peaking', g('iEqB2f', 2500), g('iEqB2g', 0), g('iEqB2q', 1)], ['highshelf', g('iEqHf', 4000), g('iEqHg', 0), 0], ['lowpass', g('iEqLpf', 20000), 0, 0]]
      .map((s) => ({ type: s[0], f: s[1], gain: s[2], q: s[3], co: biquadCoef(s[0], s[1], sr, s[2], s[3]) }));
  }
  // 周波数 freqs(Hz の配列)ごとの合成特性(dB)。sr 省略時 48000
  function eq4Curve(p, freqs, sr) {
    const R = sr || 48000, st = eq4Stages(p, R);
    return freqs.map((f) => st.reduce((a, s) => a + biquadDb(s.co, f, R), 0));
  }

  const api = { biquadCoef, biquadDb, eq4Stages, eq4Curve, TYPE_PROFILES, ER_STEP, generateImpulse, sendGain, compOut, peakingMagDb, bandMagDb, effQ, eqBandDb, eqMagDb, shapeImpulse, impulseDecayCurve, softClipCurve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FxDSP = api;
})(typeof window !== 'undefined' ? window : globalThis);
