# RP-0: REVERB を REVERSE の前に置くための洗い出し(v10.61 時点。コードは変えていない)

| 調べたこと | 結果 | 後の段階 |
|---|---|---|
| `act(k)`(bus.js 317〜) | `rv` の case が無い。末尾の `FXR.find(q.k===k&&q.wn)` は `rv`(wn なし)に当たらず **false**。→ `case 'rv': return v('rvbPos')==1` を足す(`wkOK` は不要=Convolver のため) | RP-1a |
| `initStage(k)` | `FXR.find(k).ids` 全部に `up(id)` を掛ける。`rv` の ids(rvbSize 等)は `set` 経路で処理済み・`up` は汎用 → **`rv` は `initStage` を飛ばす**(`mk_rv` 内で完結させる) | RP-1b |
| `rewire` | `mixIn.disconnect()` と各 `st[k].out.disconnect()` の後に `prev.connect(n.ins)`。**`ins→pre`・`dkR→out` は `build`(287行)で張りっぱなし**。CHAIN では `rewire` 内で `ins→pre` を切り、`dkR` の出口を `out`→ステージ `out` に付け替える。SEND に戻すときは両方を復元する | RP-1b |
| `build` が作り直すとき | `this.st={}` に戻る(295行)→ `rewire` が CHAIN を再構築。`pre` は `build` 内で作る(Convolver・`rvA` も新規)ので付け替えは `rewire` 側で毎回やればよい | RP-1b |
| トラックの RVB SEND(`cr`) | `strip` 作成時(14・65行)に `cr.connect(this.n.pre)`。**`pre` に直接入る**ので CHAIN でも残響に入る(変更不要)。`build` 後の再接続は既存の処理のまま | — |
| `makeRvb`(IR作り直し) | `cA/cB`・`gA/gB` のクロスフェードだけ。接続に触らない → CHAIN 化と独立 | — |
| ダッキング | `dkR` は残響の枝の中(`rmix→dkR`)。`retReset('rv')`・`rvDuckOn` は `n.dkR` を見るだけ → **変更不要** | — |
| ラック | `FXR` の末尾は `dl`・`rv` のまま(`test/fxw5.js:55` が検査)。`FXCHAIN`(mixdefs.js 347)に `rv` を足す。**`app.js` の `fxmv`(1072)は『DELAY・REVERBは最後に固定』と案内して `rv` を弾く**ので、CHAIN のときだけ許すよう直す | RP-1c |
| `FXCHAIN` を前提にしたテスト | `test/fx.js:119`(順の完全一致 → `rv` を末尾に足して更新)・`fx.js:123,179`(全ON・並べ替え)・`fxw-*.js`(相対位置のみで影響なし)。`fxAdd` は全て `after:` 指定なので、`rv` を `FXCHAIN` の最後に置いても新FXの位置は変わらない | RP-1a |
| `fxOrdNorm` | 足りないキーは「既定の直前のキーの後ろ」へ補う → 旧保存の並びでは `rv` は `ts` の後ろ(=末尾)。期待値表を `test/fx.js` に | RP-1a |
| 旧データ | `rvbPos` が無ければ `FXDEF`(既定0=SEND)。`act('rv')` が偽 → チェーンに入らず従来どおり | RP-1a |

## 仕様書との差(RP-0 時点)
なし。ただし `initStage` を `rv` で飛ばす必要がある点を仕様に追記(上表)。
