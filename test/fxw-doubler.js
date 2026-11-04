// ダブラー(モジュレーションの種類 1)の DSP 検査。Electron なしで、Node だけで動く: node tests/doubler-dsp.js
// ・ピッチのずれ(セント)が、設定した範囲に収まり、設定の近くまで届くこと
// ・タイミングのばらつき(ms)が、設定した範囲に収まること(声1 = 30 ms、声2 = 42 ms の前後)
// ・広がり: 0% で左右が同じ、100% で声1は左だけ・声2は右だけ
// ・乱数の種を同じにすると、同じ動きになる(再現できる)
// ・NaN が出ない / 切ったあとは素通し
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const SR = 48000;
const reg = {};
const sandbox = { sampleRate: SR, AudioWorkletProcessor: class { constructor() { this.port = { postMessage() {}, onmessage: null }; } }, registerProcessor: (n, c) => { reg[n] = c; }, Math, Float32Array, Float64Array, Int32Array, Uint32Array, Uint8Array, Array, Object, Number, console, globalThis: null };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'fx-src', 'modfx.js'), 'utf8'), sandbox);
const Mod = reg['sd-modfx'];
let fail = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };

// 指定のパラメータで、入力 x を流して、左右の出力を返す
function run(x, o, seed) {
  const p = new Mod({ processorOptions: { seed: seed === undefined ? 12345 : seed } });
  const L = new Float32Array(x.length), R = new Float32Array(x.length);
  const params = { type: [1], rate: [o.rate === undefined ? 0.3 : o.rate], depth: [o.depth === undefined ? 40 : o.depth], fb: [0], mix: [o.mix === undefined ? 100 : o.mix], enabled: [o.enabled === undefined ? 1 : o.enabled], cents: [o.cents === undefined ? 8 : o.cents], timing: [o.timing === undefined ? 4 : o.timing], spread: [o.spread === undefined ? 80 : o.spread] };
  for (let i = 0; i < x.length; i += 128) {
    const n = Math.min(128, x.length - i);
    const out = [new Float32Array(n), new Float32Array(n)];
    p.process([[x.subarray(i, i + n)]], [out], params);
    L.set(out[0], i); R.set(out[1], i);
  }
  return { L, R };
}
// ミックス100% のとき、a = 1・g = 1/1.5 なので、ウェットだけを取り出せる: wet = out × 1.5 - dry
const wetOf = (out, x) => { const w = new Float32Array(out.length); for (let i = 0; i < w.length; i++) w[i] = out[i] * 1.5 - x[i]; return w; };

// ---- ピッチ: 1 kHz のサインを流し、ウェットの瞬間の周波数を、セントで測る ----
function centsTrack(w, f0, skip) {
  // f0 の複素発振器と掛けて、約 25 ms の移動平均でならし、位相の変化から周波数を出す
  const n = w.length, win = Math.round(SR * 0.025);
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) { const ph = 2 * Math.PI * f0 * i / SR; re[i] = w[i] * Math.cos(ph); im[i] = -w[i] * Math.sin(ph); }
  const sm = (a) => { const o = new Float64Array(n); let s = 0; for (let i = 0; i < n; i++) { s += a[i]; if (i >= win) s -= a[i - win]; o[i] = s / win; } return o; };
  const r = sm(re), q = sm(im);
  const out = [];
  const step = Math.round(SR * 0.02);
  for (let i = skip + step; i < n; i += step) {
    const a0 = Math.atan2(q[i - step], r[i - step]), a1 = Math.atan2(q[i], r[i]);
    let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const df = d / (2 * Math.PI) / (step / SR);
    out.push(1200 * Math.log2((f0 + df) / f0));
  }
  return out;
}
const DUR = 40;
const x = new Float32Array(SR * DUR);
for (let i = 0; i < x.length; i++) x[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * i / SR);

for (const c of [5, 10, 20]) {
  // タイミングを 0 にして、ピッチだけを見る
  const r = run(x, { cents: c, timing: 0, spread: 100, rate: 0.3 });
  const t = centsTrack(wetOf(r.L, x), 1000, SR * 2);
  const mx = Math.max(...t.map(Math.abs));
  const rms = Math.sqrt(t.reduce((a, b) => a + b * b, 0) / t.length);
  ok(mx <= c * 1.15, `ピッチ ${c} セント: 最大 ${mx.toFixed(1)} セント(設定を超えない)`);
  ok(mx >= c * 0.55, `ピッチ ${c} セント: 最大 ${mx.toFixed(1)} セント(設定の近くまで動く。rms ${rms.toFixed(1)})`);
}
{
  const r = run(x, { cents: 0, timing: 0, spread: 100 });
  const t = centsTrack(wetOf(r.L, x), 1000, SR * 2);
  const mx = Math.max(...t.map(Math.abs));
  ok(mx < 0.3, `ピッチ 0・タイミング 0: 音程は動かない(最大 ${mx.toFixed(2)} セント)`);
}
{
  // 同じ設定で、LFO(サイン)ではないこと: 速さが一定の周期ではなく、ばらつく(声1のピッチの符号が変わる間隔が、そろっていない)
  const r = run(x, { cents: 10, timing: 0, spread: 100, rate: 1 });
  const t = centsTrack(wetOf(r.L, x), 1000, SR * 2);
  const zc = []; for (let i = 1; i < t.length; i++) if ((t[i - 1] < 0) !== (t[i] < 0)) zc.push(i);
  const gaps = []; for (let i = 1; i < zc.length; i++) gaps.push(zc[i] - zc[i - 1]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length);
  ok(gaps.length > 10 && sd / mean > 0.25, `ランダム: 符号が変わる間隔のばらつき ${(sd / mean).toFixed(2)}(サインなら 0 に近い)`);
}
{
  // 左右(声1・声2)が、別々に動く
  const r = run(x, { cents: 10, timing: 0, spread: 100 });
  const a = centsTrack(wetOf(r.L, x), 1000, SR * 2), b = centsTrack(wetOf(r.R, x), 1000, SR * 2);
  const n = Math.min(a.length, b.length);
  let sa = 0, sb = 0, sab = 0; for (let i = 0; i < n; i++) { sa += a[i] * a[i]; sb += b[i] * b[i]; sab += a[i] * b[i]; }
  const corr = sab / Math.sqrt(sa * sb);
  ok(Math.abs(corr) < 0.6, `声1と声2のピッチの動きは、別々(相関 ${corr.toFixed(2)})`);
}

// ---- タイミング: インパルスを 100 ms ごとに流して、ウェットの遅れを測る ----
function delays(o, ch, base) {
  const xi = new Float32Array(SR * 60);
  const per = Math.round(SR * 0.1);
  for (let i = per; i < xi.length; i += per) xi[i] = 0.5;
  const r = run(xi, Object.assign({ cents: 0, spread: 100 }, o));
  const w = wetOf(ch === 'L' ? r.L : r.R, xi);
  const res = [];
  for (let i = per * 20; i < xi.length - per; i += per) {
    let s = 0, sx = 0;
    for (let k = 1; k < Math.round(SR * 0.075); k++) { const v = Math.abs(w[i + k]); s += v; sx += v * k; }
    res.push(sx / s / SR * 1000);
  }
  return res;
}
for (const t of [2, 5, 10]) {
  const dl = delays({ timing: t, rate: 0.3 }, 'L'), dr = delays({ timing: t, rate: 0.3 }, 'R');
  const rl = [Math.min(...dl), Math.max(...dl)], rr = [Math.min(...dr), Math.max(...dr)];
  ok(rl[0] >= 30 - t - 0.6 && rl[1] <= 30 + t + 0.6, `タイミング ±${t} ms: 声1の遅れ ${rl[0].toFixed(1)}〜${rl[1].toFixed(1)} ms(30 ms の前後)`);
  ok(rr[0] >= 42 - t - 0.6 && rr[1] <= 42 + t + 0.6, `タイミング ±${t} ms: 声2の遅れ ${rr[0].toFixed(1)}〜${rr[1].toFixed(1)} ms(42 ms の前後)`);
  ok(rl[1] - rl[0] > t * 0.5, `タイミング ±${t} ms: 声1は、実際にばらつく(幅 ${(rl[1] - rl[0]).toFixed(1)} ms)`);
}
{
  const dl = delays({ timing: 0 }, 'L'), dr = delays({ timing: 0 }, 'R');
  ok(Math.max(...dl) - Math.min(...dl) < 0.05 && Math.abs(dl[0] - 30) < 0.2, `タイミング 0: 声1は 30 ms のまま(${dl[0].toFixed(2)})`);
  ok(Math.max(...dr) - Math.min(...dr) < 0.05 && Math.abs(dr[0] - 42) < 0.2, `タイミング 0: 声2は 42 ms のまま(${dr[0].toFixed(2)})`);
}

// ---- 広がり ----
{
  const noise = new Float32Array(SR * 4); let s = 1; for (let i = 0; i < noise.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; noise[i] = (s / 0x7fffffff - 0.5) * 0.6; }
  const r0 = run(noise, { spread: 0, cents: 8, timing: 4 });
  let diff = 0; for (let i = SR; i < noise.length; i++) diff = Math.max(diff, Math.abs(r0.L[i] - r0.R[i]));
  ok(diff < 1e-6, `広がり 0%: 左右がまったく同じ(最大の差 ${diff.toExponential(1)})`);
  const r1 = run(noise, { spread: 100, cents: 0, timing: 0 });
  // 100% では、左 = ドライ + 声1(30 ms)、右 = ドライ + 声2(42 ms): 左は 30 ms の遅れ、右は 42 ms の遅れだけを含む
  const wl = wetOf(r1.L, noise), wr = wetOf(r1.R, noise);
  const lag = (w, ms) => { const k = Math.round(SR * ms / 1000); let e = 0, e0 = 0; for (let i = SR; i < noise.length; i++) { e += (w[i] - noise[i - k]) ** 2; e0 += w[i] ** 2; } return e / e0; };
  ok(lag(wl, 30) < 1e-3 && lag(wr, 42) < 1e-3, `広がり 100%: 左は声1だけ(30 ms)・右は声2だけ(42 ms)(残差 ${lag(wl, 30).toExponential(1)} / ${lag(wr, 42).toExponential(1)})`);
  // 音量: 広がりを変えても、ウェットのパワーはほぼ同じ
  const pw = (o) => { const r = run(noise, o); let e = 0; for (let i = SR; i < noise.length; i++) e += r.L[i] ** 2 + r.R[i] ** 2; return e; };
  const p0 = pw({ spread: 0, cents: 0, timing: 0 }), p50 = pw({ spread: 50, cents: 0, timing: 0 }), p100 = pw({ spread: 100, cents: 0, timing: 0 });
  const db = (a, b) => Math.abs(10 * Math.log10(a / b));
  ok(db(p0, p100) < 1 && db(p50, p100) < 1, `広がりを変えても、音量はほぼ同じ(0%: ${db(p0, p100).toFixed(2)} dB、50%: ${db(p50, p100).toFixed(2)} dB の差)`);
}

// ---- 再現性・安全性 ----
{
  const a = run(x.subarray(0, SR * 3), { cents: 10, timing: 5 }, 777), b = run(x.subarray(0, SR * 3), { cents: 10, timing: 5 }, 777), c = run(x.subarray(0, SR * 3), { cents: 10, timing: 5 }, 778);
  let same = true, diff = false; for (let i = 0; i < a.L.length; i++) { if (a.L[i] !== b.L[i]) same = false; if (a.L[i] !== c.L[i]) diff = true; }
  ok(same, '乱数の種が同じなら、同じ出力');
  ok(diff, '乱数の種が違えば、違う出力');
  const off = run(x.subarray(0, SR), { enabled: 0 });
  let d = 0; for (let i = SR * 0.2 | 0; i < SR; i++) d = Math.max(d, Math.abs(off.L[i] - x[i]), Math.abs(off.R[i] - x[i]));
  ok(d < 1e-6, `切っているときは素通し(差 ${d.toExponential(1)})`);
  const ex = run(x.subarray(0, SR * 5), { cents: 50, timing: 10, rate: 10, spread: 100 });
  let bad = false; for (let i = 0; i < ex.L.length; i++) if (!isFinite(ex.L[i]) || !isFinite(ex.R[i]) || Math.abs(ex.L[i]) > 2 || Math.abs(ex.R[i]) > 2) bad = true;
  ok(!bad, '最大の設定(50セント・10 ms・10 Hz)でも、NaN・大きなはみ出しが出ない');
  const slow = run(x.subarray(0, SR * 5), { cents: 50, timing: 10, rate: 0.05, spread: 100 });
  bad = false; for (let i = 0; i < slow.L.length; i++) if (!isFinite(slow.L[i]) || Math.abs(slow.L[i]) > 2) bad = true;
  ok(!bad, '最大のずれ・いちばん遅いレートでも、安全');
}
console.log(fail ? ('\n' + fail + ' 件 失敗') : '\nすべて合格');
process.exit(fail ? 1 : 0);
