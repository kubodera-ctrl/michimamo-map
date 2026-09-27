# まちまも開発34 再始動バックログ

更新日: 2026-09-27
対象ブランチ: `restart/dev34` (GitHub `main` `7b4b935` 起点)
判定凡例: A=実装・反映・確認済み / B=完成・反映待ち / C=途中実装 / D=仕様確定・未実装 / E=外部要因停止

## 現状台帳（コード・DB・公開環境で確認した状態）

| 領域 | 状態 | 確認できたこと / 次の完了条件 |
|---|---|---|
| Safari通常・Private | B | 42a854 修正を現mainへ再適用。静的回帰テスト合格。Previewで通常/Private Safari実機確認が必要。Productionは既知正常deploymentのまま。 |
| 地域異変フォーム | B | `local_anomaly` 説明を先頭、異変種類を必須。通常タイプは追加文言不要、「その他」のみ内容必須。既存投稿API/DB契約、投稿無制限・付与上限5pt/日を維持。実機投稿確認はPreviewで必要。 |
| 投稿主による地域異変削除 | B | DB `delete_my_spot(bigint)` は所有者チェック付きで存在。UIはログイン状態確定後も再同期されずボタンが出ないraceを修正。未ログイン/他人の投稿では非表示、DBで必ず所有者検証。 |
| 画像なし投稿 | B | popupのレスポンシブ幅・本文拡大を追加。小画面実機で1画面に収まるか確認が必要。 |
| 管理画面 / 警視庁ニュース | C | 現状は記事管理・素材状態・記事別アコーディオン・同一ニュースからの素材化をE2Eで確認できていない。Drive CURRENTを照合し、API/認証を含める。 |
| AIカメラ / 車載モード | C | カメラ関連UI・保持期限・AI停止ガード等はコード/DBに存在。現端末で撮影から保存/破棄までE2E未確認。 |
| ポイント / スタンプ / クイズ | B | 台帳・transaction/RPC・重複防止に関する実装・回帰テストあり。実ユーザー運用と端末での集計表示は別途確認。 |
| ポイント交換 / デジタルギフト | B | 交換画面・DB/APIの雛形あり。Supabase live configは `exchange_enabled=false`, `processing_enabled=false`、申請0件。外部処理・有効化はしない。 |
| ASP連携 | D | Drive ASPマスターが正本。案件ごとに還元許可・計測・否認/承認要件を確認し、匿名reward_token・台帳・Webhookを実装する必要あり。 |
| まちイベ / 今日のお出かけ導線 | C | 仕様・コードの現状態と導線の端末確認を行い、既存機能を継続利用。追加ポップアップは共通UI/Feature flag/API契約を先に用意する。 |
| 警視庁ニュース自動化 | C | 取得/検証コードは存在。最新記事性、一次ソース、失敗時、管理者承認の実運用確認が未完。 |
| 動画Production | C | local `tools/news-studio` は15秒/4frame試作でDrive CURRENTの v16.4 + REVIEW5 (43s/Weekly公式尺) と不一致。参考成果物として保管し、本番生成・MP4には採用しない。 |
| SNS投稿 (X/TikTok) | D | 管理者承認後の投稿UI/履歴/adapter未実装。接続、課金、TikTok監査状況を確認するまでは送信しない。 |
| GitHub/CI冗長性 | C | Cloudflare/Supabaseは接続済みだがCloudflare側preview/deployの独立手順とGitHub停止時の再現テストは未確認。GitHub Actionsを唯一のデプロイ経路にしない。 |
| Drive資料整合 / 仕様更新 | B | Drive CURRENTとASP masterを確認。差分を反映する実装仕様・未決条件の運用記録が必要。 |

## 統合ロードマップ

### P0 — Safari・既存未完了の回収

1. Safari標準viewport修正、回帰テスト、独立Preview作成。
2. 通常Safari / Private Safari AAPオン、オフで実機確認。確認までは本番にpromoteしない。
3. 異変フォーム、投稿主削除、画像なし投稿をPreview端末で確認。投稿/削除時はテストデータを用い、既存ユーザーデータに触れない。
4. dev31〜34各領域のDB・API・UI・端末確認を追記し、確認できていないものを「完了」と扱わない。

### P1 — 耐障害開発・Preview・共通API基盤

1. GitHubは履歴/レビューの一経路とし、Cloudflare Pages/Workersのbuild-preview-deploy経路を手順化・検証。GitLab等第二remoteは必要時に追加できる設計とし、別GitHubアカウントは作らない。
2. Workers API v1を重要処理のゲートウェイにし、Supabase Auth→内部user UUID、Postgres/PostGIS、R2、Queues/DLQ、監査ログ、idempotencyの境界を定義。
3. Previewは匿名データ/限定権限。DB migrationはローカルで検証し、live applyはスキーマ/他Work差分を再取得してから。

### P2 — ユーザー向け機能回収

1. 地域異変の投稿・削除・画像なし・ポイント上限を実機で完了確認。
2. 今日のお出かけ/まちイベポップアップを仕様に沿って追加し、既存イベント導線・表示抑制・deep linkと統合。
3. AIカメラ/車載モード、ポイント/スタンプ/クイズをログイン状態・通信失敗・連続操作込みで回帰。

### P3 — ASP・交換台帳

1. Drive「まちまも・まちイベ ASP案件マスター」現行行を唯一の案件基準とし、pointOK案件だけ対象。成果計測方式、許可媒体、承認/否認、確定日を確認。
2. API-firstで匿名token発行・クリック・Webhook/Queue受信・照合・重複排除・承認待ちを実装。ASPへ個人情報を渡さない。
3. available/reserved/confirmed/expired/reversedの台帳、交換予約・失敗返還・完了のidempotencyを実装。
4. ギフト事業者API/契約費用/個人情報フローが未確定の間はlive交換を無効のまま維持。

### P4 — 公式動画Production Master

1. Drive CURRENT一式/zip/MP4/QC/sourceをバイト・内容確認し、v16.4 + REVIEW5 FINE TUNEだけを基準にする。v16.5不採用。
2. Drive正本が指定する `CURRENT_20260927` を入力契約上の現行参照値として使用する。アプリ内の正式なProduction Master ID / templateVersion / renderer versionは未定義として扱い、実装・素材一式と照合してから新たに命名・記録する。SINGLE 43s、WEEKLY `38 + 12*ceil(n/3)` を守る。
3. 同一rendererで管理プレビュー・静止画・MP4、Golden Fixture/Snapshot/visual regression。未承認生成物を外部投稿できない状態管理。

> 旧メモにあった `machimamo-news-production-master-v1` / `machimamo-news-v1` / `machimamo-endcard-v1` / `machimamo-short-v2` は会話内の候補名であり、Drive CURRENTで確定した識別子ではない。正式名称として使用せず、必要性が検証されるまでは未採番扱いとする。

### P5 — SNS Publishing

1. 投稿レコードはRevision/render/platform単位でidempotent。X/TikTokを別状態、投稿履歴/外部ID/エラー保持。
2. Admin preview→明示的な最終投稿操作だけで送信。X API費用/契約・TikTok監査/権限不足は `接続設定必要` / `送信済・投稿未完了` とし、公開済みにしない。
3. WeeklyはTikTokのみ。投稿結果照会で完了を確かめる。失敗は動画生成状態から分離する。

## 安全・反映ルール

- 本番データ、ポイント残高、投稿、交換、SNS送信にはテストで触れない。
- schema / secrets / shared auth / rewards / deploy の最新状態を本番前に再取得。
- ProductionはPreviewと実機QA完了後のみ。Safari実機確認前のPromotionは禁止。
- GitHub Actions以外の継続経路を確認できるまで、Actions成功だけをデプロイ可用性とみなさない。

## 2026-09-27 SNS素材スクロール実機報告対応（base側）
- Vercel Git接続復旧、e0eb669 Preview READY: dpl_2V2ihPmbXUQqLKfrxTNszmdfNGB8。
- 本人報告: 他はほぼOK、SNS素材モーダルが下までスクロールできず広告帯が重なる。通常/Private別の全項目PASSではない。
- fix d85cbacbc976df80895089f95db73e1293c4ffc4: SNS modalのみ90dvh/flex/min-height:0の独立scroll body、header固定、adより上へ配置。デザイン/投稿データ/Productionは未変更。
- static tests admin_social_assets / safari_private_viewport / ios_viewport_stability PASS。隔離Chromium検証はbrowser downloadが壊れたarchiveで未実行。iPhone再確認待ち。
- 修正Preview候補 https://machimamo-q7vvvj8of-miti4.vercel.app/ (dpl_FU8oJEDbgwugwjNYJXogLdysPUS7、source d85cbac)。実機でPNG保存/投稿文/コピー/Xボタンへスクロール到達とcloseを確認する。外部投稿はしない。
- PR21はstackedのまま、今回base修正の取り込みは次工程で再照合。merge/Production前に必須。

## 2026-09-27 P0 最新Preview再確認・投稿先DB隔離判定
- restart/dev34 HEAD: 99edca82c7e5d0d4129707c19fb250b77e57a85c。修正: document capture-phase touch handlerで、開いているadminSocialAssetModalのスワイプをadminSocialAssetBody.scrollTopへ手動反映。button/link/input/textarea/select/contenteditableでは介入せず、既存filter用gestureは維持。Regression assertionsをtests/admin_social_assets.test.cjsへ追加。
- Vercel Preview READY: dpl_DwvHg9XTpR7j394kcUs1LqkqQn3b / https://machimamo-m9lhdknfm-miti4.vercel.app/。source=git、branch=restart/dev34、SHA=99edca82c7e5d0d4129707c19fb250b77e57a85c、target=null (Preview)。前のd85 Previewに対する実機報告とこの新修正後の再確認は区別する。
- 本人報告: 通常/Private Safariの表示サイズ、下部メニュー、各モーダルなど基礎表示はPASS。SNS素材画面は最下部までスクロールできるとの確認あり。一方、別途「管理画面内TikTok投稿ページ」はスクロールできないとの報告。対象画面が異なるため、SNS素材モーダルのPASSで未解決ページをPASS扱いしない。99ed Previewでの該当画面再確認待ち。
- DB隔離ゲート: 現行branchのfrontend SUPABASE_URLは https://ckftozjhdszlwqnylmxv.supabase.co、mainも同じProject Ref。Preview DBはProductionと共有。書込テスト投稿は本番データへ入るため禁止。テスト投稿なし、Migrationなし、本番変更なし。隔離Supabase Project/Preview環境が用意・確認されるまで異変投稿E2Eは保留。
- PR #20: open/Draft/mergeable=true、未merge。main最新SHA=7b4b935a5facb0a441445a9e14adce1982c909e1、PR headはmainより15 commit先行・behind 0、GitHub compareはmerge conflictなし。Productionは変更なし。Draft解除はTikTok投稿ページの実機再確認、CI failureの扱い確認、実投稿DB安全性ゲート解決後。
- Checks: camera-regression success、Vercel Preview deployment READY。Event Site Checkは別サービスのworkflowでsetup-nodeが存在しない event-site/package.json をcache pathに指定して失敗、Install/testsはskipped。PR20のまちまも変更起因ではない。Cloudflare Workers Buildsもmachiibe-preview/michimamo-map双方failure。原因本文はDashboardで未確認・PR20 Previewの代替ではない。
