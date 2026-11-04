// サチュレーション(5タイプ・ドライブ 0〜+36 dB)の確認。Node だけで動く。使い方: node tests/saturator-types.js
// 見るもの: 実行できる(NaN なし・暴走なし)/ 遅れなし / 音量そろえ(大きな声の音量がドライブで大きく変わらない)/
//          倍音の出かた(偶数次・奇数次)/ 折り返しノイズ / タイプ切り替えで音が飛ばない / バイパスで素通し / トランスは低域ほど歪む
const fs = require('fs');
const path = require('path');
const SR = 48000;
const procs = {};
global.sampleRate = SR; global.currentTime = 0; global.currentFrame = 0;
global.AudioWorkletProcessor = class { constructor() { this.port = { postMessage() {}, onmessage: null }; } };
global.registerProcessor = (name, cls) => { procs[name] = cls; };
new Function(fs.readFileSync(path.join(__dirname, '..', 'fx-src', 'saturator.js'), 'utf8'))();   // eslint-disable-line no-new-func
let fail = 0;
const ok = (n, c, x) => { if (!c) fail++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : '')); };
const C = procs['sd-saturator'];
const NAMES = ['テープ', 'チューブ', 'トランス風', 'マイクプリ風', 'ファズ'];
function run(x, over, proc) {
  const p = proc || new C();
  const params = {};
  C.parameterDescriptors.forEach((d) => { params[d.name] = [d.defaultValue]; });
  Object.assign(params, over);
  const y = new Float32Array(x.length), out = new Float32Array(128);
  for (let s = 0; s + 128 <= x.length; s += 128) {
    if (typeof over.fn === 'function') over.fn(s, params);
    p.process([[x.subarray(s, s + 128)]], [[out]], params); y.set(out, s);
  }
  return y;
}
function sine(f, amp, n) { const x = new Float32Array(n || SR); for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin(2 * Math.PI * f * i / SR); return x; }
// f0 の整数倍の成分(フーリエ係数)の大きさ
function harm(y, f0, h) { let re = 0, im = 0; const a = Math.round(0.2 * SR), b = y.length; const n = b - a; for (let i = a; i < b; i++) { const ph = 2 * Math.PI * f0 * h * i / SR; re += y[i] * Math.cos(ph); im += y[i] * Math.sin(ph); } return 2 * Math.hypot(re, im) / n; }
const rms = (y, a) => { let s = 0, n = 0; for (let i = a || Math.round(0.2 * SR); i < y.length; i++) { s += y[i] * y[i]; n++; } return Math.sqrt(s / n); };
const db = (v) => 20 * Math.log10(Math.max(v, 1e-12));

for (let t = 0; t < 5; t++) {
  const x = sine(220, 0.25);
  // 実行できる・暴走しない
  for (const dr of [0, 12, 24, 36]) {
    const y = run(x, { enabled: [1], type: [t], drive: [dr], tone: [20000] });
    let bad = false, pk = 0; for (const v of y) { if (!(v === v) || Math.abs(v) > 2) bad = true; pk = Math.max(pk, Math.abs(v)); }
    ok(NAMES[t] + ' +' + dr + ' dB: 有限・暴走なし', !bad, 'peak ' + pk.toFixed(3));
  }
  // 音量そろえ: 基準(-12 dBFS)の正弦波の音量が、ドライブ 0〜36 dB でも ±4 dB 以内
  const r0 = rms(run(x, { enabled: [1], type: [t], drive: [0], tone: [20000] }));
  const r36 = rms(run(x, { enabled: [1], type: [t], drive: [36], tone: [20000] }));
  const r18 = rms(run(x, { enabled: [1], type: [t], drive: [18], tone: [20000] }));
  ok(NAMES[t] + ': 音量そろえ(0/18/36 dB でほぼ同じ音量)', Math.abs(db(r36 / r0)) < 4 && Math.abs(db(r18 / r0)) < 3, 'rms ' + db(r0).toFixed(1) + ' / ' + db(r18).toFixed(1) + ' / ' + db(r36).toFixed(1) + ' dB');
  // 小さな音は、ドライブ分だけ持ち上がる(ドライブの向きが正しい)
  const q = sine(220, 0.002);
  const q0 = rms(run(q, { enabled: [1], type: [t], drive: [0], tone: [20000] })), q24 = rms(run(q, { enabled: [1], type: [t], drive: [24], tone: [20000] }));
  ok(NAMES[t] + ': 小さな音はドライブで持ち上がる', q24 > q0 * (t === 2 ? 1.5 : 3), '+' + db(q24 / q0).toFixed(1) + ' dB');
  // 倍音
  const y = run(x, { enabled: [1], type: [t], drive: [18], tone: [20000] });
  const h1 = harm(y, 220, 1), h2 = harm(y, 220, 2), h3 = harm(y, 220, 3);
  console.log('   ' + NAMES[t] + ' +18 dB: 基音 ' + db(h1).toFixed(1) + ' / 2次 ' + (db(h2) - db(h1)).toFixed(1) + ' / 3次 ' + (db(h3) - db(h1)).toFixed(1) + ' dB(基音比)');
  // 直流が残らない
  let dc = 0; for (let i = Math.round(0.3 * SR); i < y.length; i++) dc += y[i]; dc /= (y.length - Math.round(0.3 * SR));
  ok(NAMES[t] + ': 直流が残らない', Math.abs(dc) < 0.01, dc.toFixed(5));
  // 遅れなし(相互相関)
  let best = -1e9, bl = 0; const yl = run(x, { enabled: [1], type: [t], drive: [6], tone: [20000] });
  for (let L = -20; L <= 20; L++) { let s = 0; for (let i = 24000; i < 36000; i++) s += x[i - L] * yl[i]; if (s > best) { best = s; bl = L; } }
  ok(NAMES[t] + ': 遅れなし(±2 標本以内。直流除去の位相進みを含む)', Math.abs(bl) <= 2, bl + ' 標本');
}
// 偶数次・奇数次の性格
{
  const x = sine(220, 0.25);
  const g = (t, dr) => { const y = run(x, { enabled: [1], type: [t], drive: [dr || 18], tone: [20000] }); return { h2: db(harm(y, 220, 2)) - db(harm(y, 220, 1)), h3: db(harm(y, 220, 3)) - db(harm(y, 220, 1)) }; };
  const tape = g(0), tube = g(1), neve = g(2), mp = g(3), fz = g(4);
  ok('テープは、ほぼ奇数次だけ(2次が3次より 40 dB 以上小さい)', tape.h2 < tape.h3 - 40, tape.h2.toFixed(1) + ' vs ' + tape.h3.toFixed(1));
  ok('チューブは、テープより偶数次が多い', tube.h2 > tape.h2 + 30, tube.h2.toFixed(1));
  ok('トランス風は、偶数次が出る', neve.h2 > -45, neve.h2.toFixed(1));
  ok('マイクプリ風は、偶数次が出る', mp.h2 > -40, mp.h2.toFixed(1));
  ok('ファズは、偶数次も奇数次も強い(2次・3次とも -22 dB より大きい)', fz.h2 > -22 && fz.h3 > -22, fz.h2.toFixed(1) + ' / ' + fz.h3.toFixed(1));
}
// トランス風: 低域ほど先に歪む(同じ大きさで、60 Hz と 1 kHz の、3次歪みを比べる)
{
  const d3 = (f) => { const y = run(sine(f, 0.1), { enabled: [1], type: [2], drive: [12], tone: [20000] }); return db(harm(y, f, 3)) - db(harm(y, f, 1)); };
  const lo = d3(60), hi = d3(1000);
  ok('トランス風: 60 Hz は 1 kHz より、3次歪みが 6 dB 以上大きい(低域ほど飽和)', lo > hi + 6, '60Hz ' + lo.toFixed(1) + ' / 1kHz ' + hi.toFixed(1) + ' dB');
  const t0 = (f) => { const y = run(sine(f, 0.1), { enabled: [1], type: [0], drive: [12], tone: [20000] }); return db(harm(y, f, 3)) - db(harm(y, f, 1)); };
  ok('(比較)テープは、周波数でほぼ変わらない', Math.abs(t0(60) - t0(1000)) < 3, t0(60).toFixed(1) + ' / ' + t0(1000).toFixed(1));
  // 小さな音は素通し(周波数特性が平ら)
  const gain = (f) => { const y = run(sine(f, 0.001), { enabled: [1], type: [2], drive: [0], tone: [20000] }); return db(rms(y) / (0.001 / Math.SQRT2)); };
  ok('トランス風 0 dB: 小さな音は、40 Hz〜5 kHz でほぼ平ら(±2.5 dB。低域の太りを含む)', [40, 100, 400, 1000, 5000].every((f) => Math.abs(gain(f)) < 2.5), [40, 100, 400, 1000, 5000].map((f) => gain(f).toFixed(1)).join(' / '));
}
// 折り返しノイズ: 3.1 kHz の正弦波 +36 dB で、倍音以外の成分の合計が、基音より 55 dB 以上小さい(ADAA の効果)
for (let t = 0; t < 5; t++) {
  const f0 = 3100; const y = run(sine(f0, 0.25), { enabled: [1], type: [t], drive: [30], tone: [20000] });
  const a = Math.round(0.2 * SR), n = y.length - a; let tot = 0; for (let i = a; i < y.length; i++) tot += y[i] * y[i]; tot /= n;
  let hs = 0; for (let h = 1; h * f0 < SR / 2; h++) { const m = harm(y, f0, h); hs += m * m / 2; }
  const resid = Math.max(tot - hs, 1e-14);
  console.log('   ' + NAMES[t] + ' 3.1 kHz +30 dB: 倍音以外 ' + db(Math.sqrt(resid)).toFixed(1) + ' dB(全体 ' + db(Math.sqrt(tot)).toFixed(1) + ' dB)');
}
// タイプの切り替え(音が飛ばない)・バイパス(素通し)・mix
{
  const x = sine(220, 0.25, SR);
  for (const [a, b] of [[0, 4], [4, 2], [2, 3], [3, 1]]) {
    const p = new C();
    const y = run(x, { enabled: [1], type: [a], drive: [12], tone: [20000], fn: (s, prm) => { if (s >= SR / 2) prm.type = [b]; } }, p);
    let mx = 0; for (let i = SR / 2 - 400; i < SR / 2 + 2000; i++) mx = Math.max(mx, Math.abs(y[i] - y[i - 1]));
    ok('切り替え ' + NAMES[a] + '→' + NAMES[b] + ': 隣り合う標本の差が大きく飛ばない', mx < 0.15, mx.toFixed(3));
  }
  const y = run(x, { enabled: [0], type: [4], drive: [36] });
  let d = 0; for (let i = 0; i < x.length; i++) d = Math.max(d, Math.abs(y[i] - x[i]));
  ok('バイパス(enabled=0)は素通し', d < 1e-6, d.toExponential(1));
  const ym = run(x, { enabled: [1], type: [4], drive: [36], mix: [0] });
  d = 0; for (let i = 0; i < x.length; i++) d = Math.max(d, Math.abs(ym[i] - x[i]));
  ok('mix 0% は素通し', d < 1e-5, d.toExponential(1));
}
// 出力ノブ: 歪ませた音だけが ±dB 動く。mix 0% では効かない
{
  const x = sine(220, 0.25);
  const r = (o, mix) => rms(run(x, { enabled: [1], type: [0], drive: [12], tone: [20000], out: [o], mix: [mix] }));
  ok('出力 +6 dB で、約 +6 dB', Math.abs(db(r(6, 100) / r(0, 100)) - 6) < 0.3, db(r(6, 100) / r(0, 100)).toFixed(2));
  ok('出力 -12 dB で、約 -12 dB', Math.abs(db(r(-12, 100) / r(0, 100)) + 12) < 0.3, db(r(-12, 100) / r(0, 100)).toFixed(2));
  ok('mix 0% では、出力ノブは効かない(原音のまま)', Math.abs(r(12, 0) - r(-12, 0)) < 1e-6);
}
// 異常入力
{
  const x = new Float32Array(4800); x[10] = NaN; x[20] = 1e9; x[30] = -Infinity;
  for (let t = 0; t < 5; t++) { const y = run(x.subarray(0, 4736), { enabled: [1], type: [t], drive: [36] }); ok(NAMES[t] + ': NaN・極端な値でも有限', y.every((v) => v === v && Math.abs(v) < 10)); }
}
console.log(fail ? '\n' + fail + ' 件 失敗' : '\nすべて成功');
process.exit(fail ? 1 : 0);
