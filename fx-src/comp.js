// 出典: pickle-vox-v80/dynamics-worklet.js から抜き取り(動作は元のまま)。登録名は後で sd- 系に直してよい。
// ---------- コンプ(FET系 / OPTO系 / VCA系) ----------
// ・ステレオ連動(左右に同じゲインをかける)。先読みはしないので、遅れは出ない(ブラウザ内蔵コンプとの違い)
// ・model: 1 = FET(1176系)  2 = OPTO(LA-2A系)  3 = VCA(dbx 160 / SSLバスコンプ系)
// ・音量の自動補正(メイクアップ)は、ブラウザ内蔵コンプと同じ考え方(0 dB入力で抑える量の 0.6 乗)なので、
//   標準コンプと切り替えても、音量感が大きく変わらない
// ・FET: ピーク検出。アタックがごく速い(20〜800 μs)。ニーは硬め。リリースは2段(速い戻り+遅い戻り)で、
//        抑えるほど倍音(奇数次+偶数次)が増える「FETのクセ」を、軽く足す
// ・OPTO: 平均(RMS)に近い検出。ニーが広く、アタックは約10 ms。リリースは「最初に速く半分戻り、残りがゆっくり戻る」2段で、
//        長く抑えたあとほど、戻りがゆっくりになる(光素子の記憶)。出力段(真空管)風の、軽い偶数次の倍音を足す
// ・VCA: RMS検出。ゲインの動きは dB の上で直線的(アタック・リリースが正確)。ニーは中くらい。クセの少ない、きれいな圧縮
// ・active が 0 のときは、処理せず無音を返す(使っていないほうの側の負荷を減らす)
// ・v8.2 本物のサイドチェイン: 入力は2つ。入力0=圧縮される音(主音)/入力1=キー(判定に使う別トラックの音)。
//   scOn=1 のとき、圧縮するかどうかの判定(検出)を、主音ではなくキーで行う。ゲインは主音にかける(左右連動)。
//   キーはこのノードの出力には混ざらない(scListen=1 のときだけ、判定に使う音=SC HPF の後のキーを出力する)。
//   scOn=1 でキーが無い(つながっていない・空)ときは、無音として扱う=圧縮しない(自分の音では判定しない)。
//   scOn=0(既定)のときは、入力1があっても無視する=従来と1サンプルも違わない
//   v8.3: scOn=1 のあいだは自動メイクアップを掛けない(キーが鳴っていないときは、主音をそのまま通す)。MAKEUP つまみ(iCpMake・ワークレットの外)は従来どおり使える
class CompProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'model', defaultValue: 1, minValue: 1, maxValue: 3, automationRate: 'k-rate' },
      { name: 'thresh', defaultValue: -24, minValue: -60, maxValue: 0, automationRate: 'k-rate' },
      { name: 'ratio', defaultValue: 3, minValue: 1, maxValue: 20, automationRate: 'k-rate' },
      { name: 'attack', defaultValue: 10, minValue: 0.01, maxValue: 100, automationRate: 'k-rate' },   // ms(OPTO では使わない)
      { name: 'release', defaultValue: 250, minValue: 10, maxValue: 10000, automationRate: 'k-rate' }, // ms(OPTO では、記憶が満ちたときの遅い戻りの長さ)
      { name: 'active', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
      // ---- v7.0a(トラック別インサート用)。既定値では、これまでと同じ動き ----
      { name: 'knee', defaultValue: -1, minValue: -1, maxValue: 12, automationRate: 'k-rate' },   // dB。負の値=モデルごとの既定(FET 3 / OPTO 14 / VCA 8)
      { name: 'mix', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },       // 圧縮した音の割合(パラレル)。1=圧縮した音だけ
      { name: 'schpf', defaultValue: 20, minValue: 20, maxValue: 300, automationRate: 'k-rate' }, // 検出用ハイパス(Hz)。20以下=使わない
      // ---- v8.2(本物のサイドチェイン)。既定値では、これまでと同じ動き ----
      { name: 'scOn', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },      // 1=判定を入力1(キー)で行う
      { name: 'scListen', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }   // 1=判定に使う音(キー)をそのまま出力(scOn=1 のときだけ)
    ];
  }

  constructor() {
    super();
    this.reset();
    this.dcX = [0, 0]; this.dcY = [0, 0];
    this.dcR = 1 - (2 * Math.PI * 10) / sampleRate;
    this.mkG = 1;                 // いまのメイクアップ倍率(なめらかに追従)
    this.maxGr = 0;
    this.hx = [0, 0, 0, 0];     // 検出用ハイパスの状態(左右×2段)
    this.scPrev = 0;            // 前のブロックで scOn だったか(切り替わったらハイパスの状態を捨てる)
    this.reportEvery = Math.max(1, Math.round(sampleRate / 20));
    this.sinceReport = 0;
    this.smooth = 1 - Math.exp(-1 / (0.020 * sampleRate));
  }

  reset() {
    this.env = 0;        // FET: ピーク包絡
    this.ms = 0;         // OPTO・VCA: 2乗の平均
    this.gA = 0; this.gB = 0;   // FET: 速い戻り / 遅い戻りのゲイン低下(dB。0以上)
    this.gF = 0; this.gS = 0;   // OPTO: 速い成分 / 遅い成分
    this.charge = 0;            // OPTO: 光素子の記憶(0〜1)
    this.g = 0;                 // VCA: ゲイン低下(dB)
    this.grNow = 0;
  }

  // 静的な入出力特性(出力 dB)。ニーは、2次曲線でなめらかにつなぐ(dsp.js の compOut と同じ式)
  static curve(x, th, r, k) {
    const d = x - th;
    if (2 * d < -k) return x;
    if (k > 0 && 2 * Math.abs(d) <= k) {
      const t = d + k / 2;
      return x + (1 / r - 1) * t * t / (2 * k);
    }
    return th + d / r;
  }

  process(inputs, outputs, params) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || !output.length) return true;
    const frames = output[0].length;
    const active = params.active[0] >= 0.001;
    if (!input || !input.length || !active) {
      for (let c = 0; c < output.length; c++) output[c].fill(0);
      if (!active && (this.grNow !== 0 || this.env !== 0 || this.ms !== 0)) this.reset();
      return true;
    }

    const sr = sampleRate;
    const model = Math.min(3, Math.max(1, Math.round(params.model[0])));
    const th = params.thresh[0];
    const ratio = Math.max(1, params.ratio[0]);
    const atkMs = Math.max(0.01, params.attack[0]);
    const relMs = Math.max(10, params.release[0]);
    const kp = params.knee ? params.knee[0] : -1;
    const knee = kp >= 0 ? kp : (model === 1 ? 3 : model === 2 ? 14 : 8);
    const mixv = params.mix ? Math.min(1, Math.max(0, params.mix[0])) : 1;
    const scf = params.schpf ? params.schpf[0] : 20;
    const useHp = scf > 20.5;
    let hb0 = 0, hb1 = 0, hb2 = 0, ha1 = 0, ha2 = 0;
    if (useHp) {           // 2次ハイパス(Butterworth)
      const w0 = 2 * Math.PI * Math.min(scf, sr * 0.45) / sr, cs = Math.cos(w0), al = Math.sin(w0) / (2 * 0.7071067811865476), a0 = 1 + al;
      hb0 = (1 + cs) / 2 / a0; hb1 = -(1 + cs) / a0; hb2 = hb0; ha1 = -2 * cs / a0; ha2 = (1 - al) / a0;
    }
    const co = (ms) => Math.exp(-1 / Math.max(1, ms * 0.001 * sr)); // 1次の戻り(1サンプルあたりの残り率)

    // メイクアップ(0 dB入力のときに抑える量の 0.6 乗。ブラウザ内蔵コンプと同じ)
    const gr0 = Math.max(0, -CompProcessor.curve(0, th, ratio, knee));
    const mkT = Math.exp((0.6 * gr0) * 0.11512925464970229);

    // モデルごとの係数
    let cAtk = 0, cRelA = 0, cRelB = 0, cAtkS = 0, cEnvRel = 0, cMs = 0, cCharge = 0, cF = 0, cFr = 0;
    if (model === 1) {            // FET
      cAtk = co(atkMs);
      cRelA = co(relMs * 0.35);
      cRelB = co(relMs * 1.3);
      cEnvRel = co(1.5);
    } else if (model === 2) {     // OPTO
      cAtk = co(10);              // 速い成分のアタック(約10 ms)
      cF = co(10); cFr = co(60);  // 速い成分: 約10 msで入り、約60 msで戻る
      cAtkS = co(40);
      cMs = co(15);
      cCharge = co(3000);
    } else {                      // VCA
      cAtk = co(atkMs);
      cRelA = co(relMs);
      cMs = co(8);
    }
    const oneMinusCharge = 1 - cCharge;
    const oneMinusMs = 1 - cMs;
    const inL = input[0];
    const inR = input[1] || input[0];
    // ---- v8.2: キー(入力1)。scOn=1 のときだけ検出に使う。無い・空のときは無音扱い ----
    const scOn = params.scOn ? params.scOn[0] >= 0.5 : false;
    const listen = scOn && params.scListen ? params.scListen[0] >= 0.5 : false;
    const keyIn = scOn && inputs[1] && inputs[1].length ? inputs[1] : null;
    // v8.3: サイドチェイン(scOn=1)では、自動メイクアップを掛けない。キーが鳴っていない間は、主音を素通し(+0 dB)にするため
    //       (掛けると、THRESH を下げるほど、キーが無いときの主音が持ち上がってしまう)。scOn=0 は従来どおり
    const mkTg = scOn ? 1 : mkT;
    const kL = keyIn && keyIn[0] && keyIn[0].length >= frames ? keyIn[0] : null;
    const kR = keyIn && keyIn[1] && keyIn[1].length >= frames ? keyIn[1] : kL;
    if ((scOn ? 1 : 0) !== this.scPrev) { this.scPrev = scOn ? 1 : 0; this.hx[0] = this.hx[1] = this.hx[2] = this.hx[3] = 0; }
    let h1L = this.hx[0], h2L = this.hx[1], h1R = this.hx[2], h2R = this.hx[3];
    const outL = output[0];
    const outR = output[1] || null;
    const smooth = this.smooth;
    const dcR = this.dcR;
    let { env, ms, gA, gB, gF, gS, charge, g, mkG, maxGr } = this;
    let dxL = this.dcX[0], dyL = this.dcY[0], dxR = this.dcX[1], dyR = this.dcY[1];
    const LN10_20 = 0.11512925464970229;

    for (let i = 0; i < frames; i++) {
      let l = inL[i], r = inR[i];
      if (!(l === l) || l > 1e6 || l < -1e6) l = 0;
      if (!(r === r) || r > 1e6 || r < -1e6) r = 0;
      mkG += (mkTg - mkG) * smooth;

      // ---- 検出(左右連動。schpf が効いているときは、検出にだけハイパスを通す) ----
      // scOn=0: 主音で検出(従来どおり)/ scOn=1: キー(入力1)で検出。キーが無いときは無音
      let dl = l, dr = r;
      if (scOn) {
        dl = kL ? kL[i] : 0; dr = kR ? kR[i] : 0;
        if (!(dl === dl) || dl > 1e6 || dl < -1e6) dl = 0;
        if (!(dr === dr) || dr > 1e6 || dr < -1e6) dr = 0;
      }
      if (useHp) {
        const xl = dl, xr = dr;
        const yL = hb0 * xl + h1L; h1L = hb1 * xl - ha1 * yL + h2L; h2L = hb2 * xl - ha2 * yL; dl = yL;
        const yR = hb0 * xr + h1R; h1R = hb1 * xr - ha1 * yR + h2R; h2R = hb2 * xr - ha2 * yR; dr = yR;
      }
      if (listen) {          // SC LISTEN: 判定に使う音(SC HPF の後のキー)をそのまま出す
        outL[i] = dl;
        if (outR) outR[i] = dr;
        continue;
      }
      let lvl;
      if (model === 1) {
        const pk = Math.max(dl < 0 ? -dl : dl, dr < 0 ? -dr : dr);
        env = pk > env ? pk : env * cEnvRel;
        lvl = 20 * Math.log10(env + 1e-9);
      } else {
        ms += ((dl * dl + dr * dr) * 0.5 - ms) * oneMinusMs;
        lvl = 10 * Math.log10(ms + 1e-12) + 3.0103;   // 正弦波なら、ピークの dB と同じ値になるよう合わせる
      }
      const target = Math.max(0, lvl - CompProcessor.curve(lvl, th, ratio, knee));

      // ---- ゲイン低下のなめらかな動き(dB) ----
      let gr;
      if (model === 1) {
        gA = target + (gA - target) * (target > gA ? cAtk : cRelA);
        gB = target + (gB - target) * (target > gB ? cAtk : cRelB);
        gr = 0.7 * gA + 0.3 * gB;
      } else if (model === 2) {
        gF = target + (gF - target) * (target > gF ? cF : cFr);
        // 遅い成分の戻りは、長く抑えたあと(charge が大きい)ほど、ゆっくりになる
        const cRelS = Math.exp(-1 / Math.max(1, relMs * (0.25 + 0.75 * charge) * 0.001 * sr));
        gS = target + (gS - target) * (target > gS ? cAtkS : cRelS);
        const c1 = gS / 12;
        charge += ((c1 > 1 ? 1 : c1) - charge) * oneMinusCharge;
        gr = 0.5 * gF + 0.5 * gS;
      } else {
        g = target + (g - target) * (target > g ? cAtk : cRelA);
        gr = g;
      }
      if (gr > maxGr) maxGr = gr;
      this.grNow = gr;
      const gain = Math.exp(-gr * LN10_20) * mkG;

      let yl = l * gain, yr = r * gain;

      // ---- クセ(倍音) ----
      if (model === 1) {
        // FET: 抑えているほど、奇数次(丸み)と偶数次(太さ)の倍音を少し足す
        const a = gr > 12 ? 1 : gr / 12;
        yl = yl * (1 - 0.10 * a * yl * yl) + 0.03 * a * yl * yl;
        yr = yr * (1 - 0.10 * a * yr * yr) + 0.03 * a * yr * yr;
        const ol = yl - dxL + dcR * dyL; dxL = yl; dyL = ol; yl = ol;
        const or = yr - dxR + dcR * dyR; dxR = yr; dyR = or; yr = or;
      } else if (model === 2) {
        // OPTO: 出力段(真空管)風の、軽い偶数次の倍音と、ほんの少しの丸み
        yl = yl + 0.02 * yl * yl - 0.04 * yl * yl * yl;
        yr = yr + 0.02 * yr * yr - 0.04 * yr * yr * yr;
        const ol = yl - dxL + dcR * dyL; dxL = yl; dyL = ol; yl = ol;
        const or = yr - dxR + dcR * dyR; dxR = yr; dyR = or; yr = or;
      }
      if (mixv < 1) { yl = l + (yl - l) * mixv; yr = r + (yr - r) * mixv; }   // パラレル(原音と圧縮した音を混ぜる)
      outL[i] = yl;
      if (outR) outR[i] = yr;
    }

    this.env = env; this.ms = ms; this.gA = gA; this.gB = gB; this.gF = gF; this.gS = gS;
    this.charge = charge; this.g = g; this.mkG = mkG; this.maxGr = maxGr;
    this.hx[0] = h1L; this.hx[1] = h2L; this.hx[2] = h1R; this.hx[3] = h2R;
    this.mixNow = mixv;
    this.dcX[0] = dxL; this.dcY[0] = dyL; this.dcX[1] = dxR; this.dcY[1] = dyR;

    this.sinceReport += frames;
    if (this.sinceReport >= this.reportEvery) {
      this.sinceReport = 0;
      // gr=圧縮した音のゲイン低下(内蔵コンプの reduction と同じ向き=抑えているときはマイナス) / grm=原音と混ぜたあとの実効の低下
      this.port.postMessage({ gr: -this.maxGr, grm: 20 * Math.log10((1 - this.mixNow) + this.mixNow * Math.exp(-this.maxGr * LN10_20)) });
      this.maxGr = 0;
    }
    return true;
  }
}

registerProcessor('sd-comp', CompProcessor);
