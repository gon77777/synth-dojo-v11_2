// SPECTRAL(シンセ道場 v10.15 FX-4d。4c から): FFT 基盤。自前の FFT(基数2・複素・Float64)+ハン窓(分析と合成の両方)+75%オーバーラップ(hop=N/4)。
// 4a は素通し(モードなし): 入力 → 窓掛け → FFT → (ここに4b以降の処理を入れる: spec())→ IFFT → 窓掛け → 足し合わせ。
//   ハン窓²を hop=N/4 で足すと一定(1.5)になるので、1.5 で割れば往復は元の信号に一致する(誤差は丸めだけ)。
// 遅延 = 窓長 N サンプルちょうど(SIZE=1024 → 約21ms / 2048 → 約43ms。48kHz)。出力の最初の N サンプルは無音。
//   原音(ドライ)も同じ N サンプル遅らせてから MIX する=MIX をどう動かしても、ドライとウェットが同じ時刻に揃う(コムフィルタが出ない)。
// enabled<0.5 は素通し(遅延ゼロ。状態は捨てる)。SIZE を変えたら状態を捨てて作り直す。MIX は約20msで追従。NaN/Inf は入力で0にし、出力が壊れたら状態を捨てて復帰。
// 左右は別々に処理する(FFT は左右それぞれ)。
// FX-4b: FREEZE(freeze 0/1)と BLUR(mode=1・amount)。mode: 0=なし(素通し) / 1=BLUR / 2=GATE / 3=ROBOT / 4=WHISPER / 5=SHIFT。
//   FREEZE: ONにした最初の2フレームで「振幅」と「位相の進み」を取り、そのあとは入力に関係なく、振幅を保ったまま位相を進めて鳴らし続ける(位相ボコーダー=帯域内のサインなら途切れず持続)。
//           取り込みの2フレームのあいだは通常どおり(つなぎ目なし)。OFF にすると次のフレームから入力に戻る。FREEZE は MODE の処理より前=凍らせた音にも BLUR が掛かる(凍らせるのは BLUR 前の振幅)。
//   FX-4c: GATE=フレーム内の最大振幅×amount² より弱いビンを消す(amount=0 は素通し)/ ROBOT=位相を『フレームの中心に揃う直線位相』へ(amount で元の位相から寄せる。hop ごとにパルスが立つ=ブザー的・音程は SR/hop)/
//          WHISPER=各ビンの位相に ±π×amount の乱数(固定シード xorshift・左右同じ種=モノはモノのまま・reset で種に戻る)/ SHIFT=スペクトルを round(amount²×3000Hz×N/SR) ビン上へ一律にずらし、フレームごとに位相を回して本物の周波数シフトにする(非調和)。
//          ROBOT は振幅を変えない / WHISPER は重ね合わせで下がるぶんだけ振幅を補正(音量が保たれる)。
//   FX-4d: TILT(tilt -1〜+1。既定0)= モード(BLUR〜SHIFT)の掛かり方を周波数で傾ける。+側は高域ほど強く・−側は低域ほど強く(重み=対数周波数 20Hz〜20kHz を 0〜1 にした x。+t: 1−(1−x)t / −t: 1+x·t(t<0))。
//          モードの出力と元(FREEZE 後)のスペクトルを、ビンごとの重みで複素に混ぜる。tilt=0 は 4c と1サンプルも違わない。FREEZE には掛からない(モードだけ)。
//   BLUR:   振幅を周波数方向に ±r ビン(r=round(amount²×48))の箱平均でぼかす(位相は元のビンのまま)。amount=0 は素通し(往復と同じ)。ピークは下がり、隣のビンが上がる。
class SpectralProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    const k = (name, d, a, b) => ({ name, defaultValue: d, minValue: a, maxValue: b, automationRate: 'k-rate' });
    return [k('enabled', 0, 0, 1), k('size', 1024, 1024, 2048), k('mix', 1, 0, 1), k('mode', 0, 0, 7), k('amount', 0.5, 0, 1), k('freeze', 0, 0, 1), k('tilt', 0, -1, 1)];
  }
  constructor() {
    super();
    this.N = 0; this.mx = 1; this.init(1024);
  }
  // 窓長 N(2のべき乗)に合わせて、表・バッファを作る(状態は空)
  init(N) {
    this.N = N; this.mask = N - 1; this.hop = N >> 2;
    this.cos = new Float64Array(N >> 1); this.sin = new Float64Array(N >> 1);
    for (let i = 0; i < (N >> 1); i++) { this.cos[i] = Math.cos(2 * Math.PI * i / N); this.sin[i] = Math.sin(2 * Math.PI * i / N); }
    this.rev = new Uint32Array(N); const bits = Math.round(Math.log2(N));
    for (let i = 0; i < N; i++) { let r = 0, x = i; for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; } this.rev[i] = r; }
    this.win = new Float64Array(N); for (let i = 0; i < N; i++) this.win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    this.scale = 1 / 1.5;
    this.inB = [new Float64Array(N), new Float64Array(N)]; this.acc = [new Float64Array(N), new Float64Array(N)];
    this.re = new Float64Array(N); this.im = new Float64Array(N);
    this.pos = 0; this.cnt = 0;
    const H = (N >> 1) + 1, st = () => ({ state: 0, mag: new Float64Array(H), ph: new Float64Array(H), adv: new Float64Array(H) });
    this.fs = [st(), st()]; this.fs[0].rs = 2463534242; this.fs[1].rs = 2463534242; this.fs[0].sp = 0; this.fs[1].sp = 0; this.sm = new Float64Array(H); this.fz = 0; this.md = 0; this.am = 0.5; this.tl = 0;
    this.xw = new Float64Array(H); this.to = new Float64Array(H); this.ti = new Float64Array(H);
    for (let k = 0; k < H; k++) this.xw[k] = Math.min(1, Math.max(0, Math.log(Math.max(k, 1) * sampleRate / N / 20) / Math.log(1000)));
  }
  reset() { this.init(this.N); }
  // 複素 FFT(その場)。inv=true で逆変換(1/N を掛ける)
  fft(re, im, inv) {
    const N = this.N, rev = this.rev, cs = this.cos, sn = this.sin;
    for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    const sg = inv ? 1 : -1;
    for (let len = 2; len <= N; len <<= 1) {
      const half = len >> 1, step = N / len;
      for (let i = 0; i < N; i += len) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const wr = cs[k], wi = sg * sn[k], a = i + j, b = a + half;
          const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        }
      }
    }
    if (inv) { const s = 1 / N; for (let i = 0; i < N; i++) { re[i] *= s; im[i] *= s; } }
  }
  // 4b 以降: スペクトル(re・im。0..N-1。実信号なので N/2+1 以降は共役)を加工する場所。4a は何もしない
  spec(re, im, ch) {
    const N = this.N, H = N >> 1, st = this.fs[ch], mg = this.sm, TP = 2 * Math.PI;
    // --- FREEZE(振幅と位相を保持して、位相を進め続ける) ---
    if (this.fz) {
      if (st.state === 0) {                      // 1フレーム目: 振幅と位相を取る(出力は通常どおり)
        for (let k = 0; k <= H; k++) { st.mag[k] = Math.hypot(re[k], im[k]); st.ph[k] = Math.atan2(im[k], re[k]); }
        st.state = 1;
      } else if (st.state === 1) {               // 2フレーム目: 位相の進みから各ビンの本当の周波数を出す(ビン中心からのずれ)
        const hop = this.hop;
        for (let k = 0; k <= H; k++) {
          const ph = Math.atan2(im[k], re[k]), nom = TP * k * hop / N;
          let d = ph - st.ph[k] - nom; d -= TP * Math.round(d / TP);
          st.adv[k] = nom + d; st.mag[k] = Math.hypot(re[k], im[k]); st.ph[k] = ph;
        }
        st.state = 2;
      } else {                                   // 保持: 位相だけ進める
        for (let k = 0; k <= H; k++) { let p = st.ph[k] + st.adv[k]; if (p > 1e4) p %= TP; st.ph[k] = p; }
      }
      if (st.state === 2) for (let k = 0; k <= H; k++) { re[k] = st.mag[k] * Math.cos(st.ph[k]); im[k] = st.mag[k] * Math.sin(st.ph[k]); }
    } else st.state = 0;
    const md = this.md, am = this.am, tl = md > 0 ? this.tl : 0, to = this.to, ti = this.ti;
    if (tl !== 0) for (let k = 0; k <= H; k++) { to[k] = re[k]; ti[k] = im[k]; }   // TILT: モード前のスペクトルを取っておく
    if (md === 1) {          // --- BLUR ---
      const r = Math.round(am * am * 48);
      if (r > 0) {
        for (let k = 0; k <= H; k++) mg[k] = Math.hypot(re[k], im[k]);
        for (let k = 0; k <= H; k++) {
          const a = Math.max(0, k - r), b = Math.min(H, k + r); let t = 0; for (let j = a; j <= b; j++) t += mg[j];
          const m2 = t / (b - a + 1), m1 = mg[k];
          if (m1 > 1e-30) { const g = m2 / m1; re[k] *= g; im[k] *= g; } else { re[k] = m2; im[k] = 0; }
        }
      }
    } else if (md === 2) {   // --- GATE(最大の amount² 倍より弱いビンを消す) ---
      let pk = 0; for (let k = 0; k <= H; k++) { const m = Math.hypot(re[k], im[k]); mg[k] = m; if (m > pk) pk = m; }
      const th = pk * am * am;
      if (th > 0) for (let k = 0; k <= H; k++) if (mg[k] < th) { re[k] = 0; im[k] = 0; }
    } else if (md === 3 || md === 4) {   // --- ROBOT(直線位相)/ WHISPER(乱数位相) ---
      if (am > 0) {
        // WHISPER は位相が揃わなくなるぶん重ね合わせのエネルギーが下がる(完全ランダムで 1/4)→ 振幅を補正して音量を保つ(ρ=位相の揃い=sin(π am)/(π am))
        let gn = 1; if (md === 4) { const rho = Math.sin(Math.PI * am) / (Math.PI * am); gn = 1 / Math.sqrt(rho * rho + (1 - rho * rho) * 0.25); }
        for (let k = 0; k <= H; k++) {
          const m = Math.hypot(re[k], im[k]) * gn; if (m < 1e-30) continue;
          const ph = Math.atan2(im[k], re[k]); let np;
          if (md === 3) { const tg = (k & 1) ? Math.PI : 0; let d = tg - ph; d -= TP * Math.round(d / TP); np = ph + am * d; }   // 目標=フレーム中心にパルス(位相 πk)。am=1 で完全に揃う
          else { let x = st.rs; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; st.rs = x; np = ph + am * Math.PI * (x / 2147483648 - 1); }
          re[k] = m * Math.cos(np); im[k] = m * Math.sin(np);
        }
      }
    } else if (md === 5) {   // --- SHIFT(一律にずらす。位相を回して本物の周波数シフト) ---
      const s = Math.round(am * am * 3000 * N / sampleRate);
      if (s > 0) {
        st.sp = (st.sp + TP * s * this.hop / N) % TP; const c = Math.cos(st.sp), sn = Math.sin(st.sp);
        for (let k = H; k >= 0; k--) {
          const j = k - s;
          if (j < 0) { re[k] = 0; im[k] = 0; } else { const a = re[j], b = im[j]; re[k] = a * c - b * sn; im[k] = a * sn + b * c; }
        }
      }
    }
    if (tl !== 0) for (let k = 0; k <= H; k++) {
      const x = this.xw[k], w = tl > 0 ? 1 - (1 - x) * tl : 1 + x * tl;
      re[k] = to[k] + w * (re[k] - to[k]); im[k] = ti[k] + w * (im[k] - ti[k]);
    }
    // 実信号に戻す(N/2+1 以降は共役。0 と N/2 は虚部0)
    im[0] = 0; im[H] = 0;
    for (let k = 1; k < H; k++) { re[N - k] = re[k]; im[N - k] = -im[k]; }
  }
  // 1つのフレーム(いま t の位置まで)を処理して、acc に足す
  frame() {
    const N = this.N, m = this.mask, p = this.pos, w = this.win, re = this.re, im = this.im, sc = this.scale;
    for (let ch = 0; ch < 2; ch++) {
      const b = this.inB[ch], a = this.acc[ch];
      for (let n = 0; n < N; n++) { re[n] = b[(p + n) & m] * w[n]; im[n] = 0; }   // 最も古い=p+1 の1つ前(下の pos 更新後なので p が最古)
      this.fft(re, im, false); this.spec(re, im, ch); this.fft(re, im, true);
      for (let n = 0; n < N; n++) a[(p + n) & m] += re[n] * w[n] * sc;
    }
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || !input.length || !output || !output.length) return true;
    const frames = output[0].length, inCh = input.length, outCh = output.length;
    if (params.enabled[0] < 0.5) {
      for (let c = 0; c < outCh; c++) output[c].set(input[Math.min(c, inCh - 1)]);
      if (this.pos !== 0 || this.cnt !== 0 || this.mx !== 1) { this.reset(); this.mx = 1; }
      return true;
    }
    const num = (v, d, a, b) => { v = +v; return v === v ? Math.min(b, Math.max(a, v)) : d; };
    const N = num(params.size[0], 1024, 1024, 2048) >= 1536 ? 2048 : 1024;
    if (N !== this.N) { this.init(N); }
    this.fz = params.freeze[0] >= 0.5 ? 1 : 0; this.md = Math.round(num(params.mode[0], 0, 0, 7)); this.am = num(params.amount[0], 0.5, 0, 1); this.tl = num(params.tilt ? params.tilt[0] : 0, 0, -1, 1);
    const mT = num(params.mix[0], 1, 0, 1), mk = 1 - Math.exp(-1 / (0.02 * sampleRate));
    const xL = input[0], xR = input[Math.min(1, inCh - 1)], oL = output[0], oR = output[Math.min(1, outCh - 1)];
    const m = this.mask, hop = this.hop, bL = this.inB[0], bR = this.inB[1], aL = this.acc[0], aR = this.acc[1];
    let bad = false;
    for (let s = 0; s < frames; s++) {
      let l = xL[s], r = xR[s]; if (!(l - l === 0)) l = 0; if (!(r - r === 0)) r = 0;
      const p = this.pos, dl = bL[p], dr = bR[p], wl = aL[p], wr = aR[p];   // dl,dr = N サンプル前の入力(ドライ)・wl,wr = N サンプル前の位置の合成結果
      bL[p] = l; bR[p] = r; aL[p] = 0; aR[p] = 0;
      this.mx += (mT - this.mx) * mk; const mx = this.mx;
      let ol = dl + (wl - dl) * mx, or = dr + (wr - dr) * mx;
      if (!(ol - ol === 0) || !(or - or === 0)) { bad = true; ol = 0; or = 0; }
      oL[s] = ol; if (oR !== oL) oR[s] = or;
      this.pos = (p + 1) & m;
      if (++this.cnt === hop) { this.cnt = 0; this.frame(); }
    }
    if (bad) this.reset();
    for (let c = 2; c < outCh; c++) output[c].set(output[1]);
    return true;
  }
}
registerProcessor('sd-spectral', SpectralProcessor);
