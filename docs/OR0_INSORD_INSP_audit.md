# OR-0: `INSORD` / `SD.INSP` / `iOrd` を引いている箇所(v10.49 時点。コードは変えていない)

## 順序(`iOrd`・`SD.INSORD`)
| 場所 | 内容 | 後の段階 |
|---|---|---|
| `mixdefs.js:76,83` | `iOrd` つまみ定義(0/1)・`SD.INSORD(m)`(固定6グループ、`iOrd==1` で cp/eq 入替) | OR-1a で `mix.ord` へ。旧 iOrd は変換 |
| `bus.js:101,105` | トラックの `tsig`(組み替え検知)・`trewire` が `INSORD` を使う | OR-1b |
| `bus.js:20` | `setMix` で `iOrd` を `tup/tchk` に回す | OR-1b |
| `bus.js:72,74` | **バスは `INSORD` を使わず `bmix.iOrd==1` を直接見る**(eq/cp のみ) | OR-2b |
| `mixdefs.js:79,99` | `AUINS`・`BUSP` が `iOrd` を特別扱い(`auto:false`・バス定義に含む) | OR-1a/2b |
| `app.js:1543` | インサート画面が `p.ins==='ord'` を eq/cp 画面に混ぜる | OR-1c |
| `test/cmest.js:38` | 測定用の描画が `SD.INSORD(m)` を使う | OR-1b |
| レッスン | `ef.js`(ef16)・`cxl.js`(cx08)・`vo.js`(`VS`)が `iOrd:0/1` を直書き | 変更しない(旧データ互換の根拠) |

## 定義(`SD.INSP`)を直接引く箇所(OR-3a で `SD.insDef(id)` に置換)
`app.js:39,78,606,1342,1543` / `auto.js:223`(`AUINS`)/ `aulessons.js:9` / `bus.js:110`(`tinit`)/ `mixdefs.js:99,108,181`(`BUSP`・`MIXALL`・`check`)/ `test/validate.js:222` ほかテスト多数。
(仕様の `scPf` は現行コードに見当たらない=SB で別名・統合済みの可能性。OR-3c で再確認)

## 期待値表(`test/mix.js` に固定済み)
`INSORD`: 未定義/null/{}・iOrd 0・'0'・2・-1・null・NaN → 従来順 / iOrd 1・'1' → cp と eq を入替。`mixClean` は iOrd を 0/1 に丸める。
