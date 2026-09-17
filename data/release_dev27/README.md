# まちまも開発27 実装・検証記録

更新日: 2026-09-17

## 実装済み

- 通常投稿: 1件1pt、JSTで1日最大5pt。
- 「助かった！」: 押した本人へ一意投稿ごとに1pt、JSTで1日最大5pt。上限後も投票自体は保存する。
- 週間クイズスタンプ:
  - 車・自転車・ミックスは10問中9問以上で1個、全モード合計1日1個。
  - EXTRAは100問、1問5秒表示、98問以上で3個、週1回。
  - 報酬獲得後も挑戦回数は制限しない。
- LINE利用: 有効な既存セッションで画面を開くとJSTの日付を1回記録し、月〜日の7日利用で1個。再認証・友だち追加を要求しない。
- 週間スタンプ: クイズ最大10個＋利用1個の最大11個。10個到達で50ptを週1回。翌週へ持ち越さない。
- AED累積スタンプ: `approved_new` のみ1個。週上限なし、持ち越し、10個ごとに50pt。`approved_existing`、重複、否認、要修正は対象外。投稿受付の日10件・週20件制限は変更していない。
- マイページ: 「今日の活動」の下に3カードを1列3段で表示し、獲得枠をまちまもアイコンで埋める。AED投稿、非公開カメラ証拠、異議申立て、ポイント履歴、自分の投稿、ガチャ履歴を折りたたみに変更。
- クイズバンク: 添付400問を正本として旧230問を置換。完全一致設問を解消し、画像標識30問を加えた430問（車215・自転車215）。全問3択、ID重複0、設問完全一致0、正解参照切れ0。
- 利用規約・ガイド・LPの旧30pt／通常10pt／クイズ直接ポイント／換金提供済み表現を現仕様へ更新。

## 法令・安全表現の確認

- 法的義務は「禁止・義務・反則行為」、安全上の推奨は「推奨・危険・望ましい」と区別した。
- イヤホンは装着形態だけで一律違反とせず、安全運転に必要な音が聞こえない状態を問題化した。
- 傘差しは全国一律の単純な断定を避け、運転操作への支障と都道府県公安委員会規則を説明した。
- 反則金納付と前科の説明は、一定の要件下で刑事手続へ移行しない旨に限定した。
- 主な公式確認先: [警察庁 交通の方法に関する教則](https://www.npa.go.jp/bureau/traffic/20241101kyousoku.pdf)、[警察庁 自転車の交通ルール](https://www.npa.go.jp/bureau/traffic/bicycle/portal/rule.html)、[警察庁 自転車FAQ](https://www.npa.go.jp/bureau/traffic/bicycle/portal/faq.html)、[警察庁 自転車の反則行為・反則金](https://www.npa.go.jp/bureau/traffic/bicycle/pdf/jitensyahansokukoui.pdf)、[国土交通省 道路標識一覧](https://www.mlit.go.jp/road/sign/sign/douro/ichiran.pdf)。各問題の `sourceKeys` と `sourceCheckedAt` もJSONへ保存した。

## 検証

- `node scripts/build_quiz_dev27.mjs`: 430問生成。
- `node tests/dev27_quiz_and_mypage.test.cjs`: 問題数、モード比、重複、3択、正解、画像レンダラー、UI、主要SQL条件 PASS。
- `node tests/source_browser.test.cjs`: 3件 PASS。
- 本番と同じSupabase PostgreSQL 17で migration 全文を `BEGIN ... ROLLBACK` 実行: 構文・依存関係 PASS。
- `tests/dev27_stamps_transaction.sql` を同じROLLBACK内で実行: 通常満点→1個、同日再挑戦→0個、EXTRA満点→3個、7日利用→1個、週間10個→50pt、再実行→0pt PASS。テストデータ・残高変更は残していない。
- `git diff --check`: PASS。

## 意図的に未実装

- ASP案件、還元条件、連携方法。
- 60日休眠によるポイント抹消。
- 3,000ptを含む換金・交換機能と交換価値。
- 車載ポイント、管理者限定化、有料AI、月額課金。

## 本番反映

- DB migration: `20260917002422_quiz_stamps_dev27.sql`（本番履歴 `20260917002422 quiz_stamps_dev27`、適用・件数確認済み）
- Git/Vercel: 反映後にコミットと本番URLの確認結果を追記する。
