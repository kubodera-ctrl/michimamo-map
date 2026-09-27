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


## 2026-09-27 P4 Renderer blocker correction and CURRENT source audit

- P4 starts from `feat/dev34-current-production-engine`; requested current base is `restart/dev34`. Use a normal merge to preserve P0 changes; do not force-rebase. The synchronized feature HEAD and Preview provenance must be recorded from GitHub/Vercel after push; a stale local mirror is not evidence of latest HEAD.
- Corrected prior interpretation: `SOURCE_CURRENT_FULL.zip` is a restoration snapshot, and “historical path not found” does not mean “asset absent.” Hash-verified source mappings are in `tools/production-current/renderer-dependency-map.md`. The 2026-09-27 REVIEW3 snapshot contains v16.1 foundation code SHA `0594994c2b595e432a66fdec452976798d64844c1cb65a3e16555b40def41114`, exact dog/overlay source assets; those are historical base candidates, not approved REVIEW5 substitutions until the later deltas are checked.
- Audited CURRENT/REVIEW3 assets show approved TOP, END, transparent emblem, happy dog, sad dog candidate, and REVIEW5 patches present. v16.1 code/old overlay paths can be mapped by content/provenance. `machimamo_reference_v13/package/machimamo_reference_v13.py` remains truly missing in the audited CURRENT and REVIEW3 trees, preventing complete engine execution without an approved source recovery. No drawing implementation was rewritten.
- README_RESTORE says fonts are intentionally absent from ZIPs and Japanese font must resolve in the runtime. Removed any interpretation that `MACHIMAMO_APPROVED_JP_FONT` or a bundled binary is a required configuration. This runner currently has no `fc-match :lang=ja` family, so text metrics and visual QC are still blocked.
- `asset_path_adapter.py` maps historical `/mnt/data` literals via ASSET_ROOT/WORK_ROOT in a copied source tree, leaving drawing code unchanged; adapter and preflight tests cover this. No actual SINGLE/WEEKLY final MP4 has been regenerated, decoded, or Golden-compared yet.
- Admin news publishing remains fail-closed scaffold: real news/article table and shared `publishing_*` tables are absent from the inspected Supabase schema, so read-only data connection and weekly candidate filtering are not yet possible. No DB write/migration was applied; no SNS/ASP action taken.
- P4 Preview is for UI/manual iPhone QA only and has no proof of renderer execution. Production is unchanged. Police-safety remains its own additive-migration PR and is not mixed into P4.


## 2026-09-27 P4 Renderer audit correction — latest verified state

This section supersedes the earlier statement that v16.1 foundation code and the sad-dog/news-overlay content were entirely missing. The user clarified that `SOURCE_CURRENT_FULL` is a 2026-09-27 approved restoration snapshot, so old-path absence was rechecked across the base and deltas.

- CURRENT archive SHA256 values match `MASTER_SHA256.txt`. REVIEW3 base `SOURCE_v16.4_REVIEW3_PRE_REDESIGN_20260927.zip` contains `machimamo_reference_v16_1/src/machimamo_reference_v16_1.py` (SHA256 `0594994c2b595e432a66fdec452976798d64844c1cb65a3e16555b40def41114`), exact `dog_sad_v16_2.png`, and exact `news_short.png` / `news_weekly.png` old overlays. REVIEW4 and REVIEW5 delta contents are additive patch code/assets and do not replace these base source dependencies. Those entries are MAPPED, not MISSING; old overlay-to-final composition still requires frame QC.
- Approved CURRENT visual assets exist: TOP/clean TOP, END, transparent logo emblem, dog candidates, REVIEW4 overlays and REVIEW5 header patches. Their SHA-256 and use mapping are in `tools/production-current/renderer-dependency-map.md`.
- Only confirmed absent renderer module across VIDEO_MASTER_CURRENT_20260927.zip, SOURCE_CURRENT_FULL.zip, TOP_MASTER_CURRENT.zip, REVIEW3 base, REVIEW4 delta and REVIEW5 delta: `machimamo_reference_v13/package/machimamo_reference_v13.py`. Renderer cannot run without recovering this original module. No substitute or drawing rewrite was made.
- Font binaries are explicitly excluded by README_RESTORE. Removed `MACHIMAMO_APPROVED_JP_FONT` as a required environment variable. This execution image has no `fc-match :lang=ja` font; use a Japanese-capable runtime font and verify its glyphs/metrics against QC before visual pass.
- `asset_path_adapter.py` rewrites only legacy `/mnt/data` literals within copied Python source into `ASSET_ROOT` / `WORK_ROOT`; 11 source modules were copied and checked with 0 remaining absolute literals. Unit tests pass.
- Latest P4 synchronized feature branch source: `feat/dev34-current-production-engine @5fa45541276a81ea17ab47bb6be1787a14dfd16d`; P4 merge `be528ca9ed75b386a80f7f628b7928696e458b6b` includes restart/dev34 `52f213b8ceb451eec5d865db5037ea29f45e144f` without force-rebase. Preview is READY, deployment `dpl_77uNmjrocRb5zqkyrm8zKw92x4ZY`, `https://machimamo-monbwqdgb-miti4.vercel.app`, source branch/SHA exact above, target=null (Preview only). It is UI scaffold preview, not renderer execution proof.
- Local P4 validation checkout reports `npm test`, `npm run test:production-current`, and `git diff --check` PASS; this is local test evidence, distinct from a clean checkout test bound to the remote Preview SHA. No current Python SINGLE/WEEKLY render, decode, Golden frame comparison, or MP4 visual QC has passed.
- Supabase read-only schema audit found no news/article tables and no shared `publishing_*` tables. Admin news manager remains unconnected/fail-closed. No schema writes or production mutations.
- P4 UI verification still needed on iPhone Safari: open the Preview above, open `ニュース投稿管理`, scroll from top to bottom; check SHORT/SINGLE list, LONG/WEEKLY block, week/prefecture selectors, 6/9/12 choices, posted-state filters and lower controls remain reachable and not covered by an ad band. Do not generate or publish. No P4 Production deploy.


## 2026-09-27 開発35再開監査・将来管理OS整合

- GitHub再取得: `main @7b4b935a5facb0a441445a9e14adce1982c909e1`, `restart/dev34 @52f213b8ceb451eec5d865db5037ea29f45e144f`, P4 `feat/dev34-current-production-engine` は再開時 `ed9e2af12c139a82a9b8ce6ec940ec60e5a6daa5`。PR #20=open/Draft/未merge/mergeable、PR #21=open/Draft/未mergeで現在mergeable=false、PR #22=open/Draft/未merge/mergeable。
- Vercel再取得: P4 Preview `dpl_31ZZE6FU35sMgTTU2Q1Q9y6pFYUE` / `https://machimamo-objootvhp-miti4.vercel.app` は READY、target=null、source branch=P4、source SHA=`ed9e2af...`。Productionではない。
- Supabase `ckftozjhdszlwqnylmxv` は ACTIVE_HEALTHY。read-only schema確認で `news/article`, `publishing_*`, `asp_runtime_*` のlive tableは0件。したがってニュース管理UIはfail-closed未接続、ASP Runtime migrationも本番未適用の判定を維持。
- P4 Renderer: CURRENT source/asset監査、`ASSET_ROOT/WORK_ROOT` adapterは存在。hash-verified REVIEW3からv16.1/legacy overlaysはMAPPED。確認済みの真のsource blockerは `machimamo_reference_v13/package/machimamo_reference_v13.py`。日本語fontはMasterへ同梱せずruntime解決。新規SINGLE/WEEKLY MP4・decode・Golden visual QCは未実施。
- 将来の正式方針としてDrive `統合運営管理センター構想・実装ロードマップ v1` を確認。現行リリースを止めず、まちまも側は必要最小限管理UI + API/DB契約、共通側はPublishing/ASP/Auditを責務分離して再利用し、将来Admin API/BFF経由で管理センターへ段階移行する。管理OS自体は正式開始指示まで実装しない。
- P4 domain/UI scaffoldに `serviceId=machimamo` を明示し、共通Publishingのglobal idempotency/generation keyへservice dimensionを含める小差分を実装。CURRENTのSINGLE/WEEKLY尺、renderer、旧SNS素材UIは変更しない。管理センター固有table/auth/dashboardは追加しない。


## 2026-09-27 P4 iPhone QA｜LINE認証なし閲覧専用モード

- iPhone実機でP4 PreviewからLINE認証できず、ニュース投稿管理へ到達できないため、P4 Preview branchだけにread-only QA入口を追加。
- 固定QA host: `machimamo-map-git-feat-dev34-current-production-engine-miti4.vercel.app`。query `newsAdminQa=1` の両方が一致した場合だけ有効。Production hostや通常URLでは無効。
- QAモードは `#adminNewsPublishingSection` のみ表示し、既存管理ダッシュボードの道路/AED/ポイント/退会/通報/SNS素材等はCSSで非表示。admin password入力、CSV、`loadAdminDashboard()` は呼ばないため、本番管理RPC・DB取得・書込を開始しない。
- SINGLE/WEEKLYのfilter/selectはUI確認用に操作可能。生成/X/TikTok/WEEKLY投稿ボタンは既存通りdisabled・接続設定必要。Production/Publishing DB未接続・fail-closedを維持。
- 通常の管理者経路は維持：LINEログイン → `is_current_user_admin` → 管理パスワード → admin RPC。無認証QAでこの経路を置換しない。
- 実装commit `42e1a4ec7fe9f50258a71d1e6822133741e46734`、test commit `5f9b29e90bc97d6ce22fbe5413128b638d64ff78`。静的contract確認でQA host/query gate、read-only banner、通常admin auth/RPC保持、service=machimamo/fail-closedをPASS。
- Vercel deployment `dpl_G6L77deG87UeHVYJ4jgoR5gqjX6K` は READY / target=null / source SHA `5f9b29e90bc97d6ce22fbe5413128b638d64ff78`。stable branch aliasをiPhone QA入口として使用。
- iPhone確認URL: `https://machimamo-map-git-feat-dev34-current-production-engine-miti4.vercel.app/?newsAdminQa=1`。最上部〜最下部scroll、SHORT/SINGLE、LONG/WEEKLY、都道府県/週/6・9・12/済filter/下部操作/広告非干渉を確認。投稿・生成操作は行わない。
