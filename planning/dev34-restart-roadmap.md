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


## 2026-09-27 P4 実ニュース候補 read-only接続

- Production Supabase `public.spots` をread-only監査。legacy `category=official` は1,972件（visible 1,972件）、期間 2026-08-30〜2026-09-19。旧データには第三者ニュース/集約元テキストもあり、`official` という旧categoryだけで警察公式とみなさない。
- `spots` schemaにはsource URL / verifiedFacts / rights証跡の正式フィールドが無い。従って既存実データは `LEGACY_UNVERIFIED` としてのみ管理UIへ表示し、全件 `publishEligible=false`。
- Supabase RLSを再確認: `spots_public_read` は anon/authenticated SELECT、`is_hidden=false OR created_by=auth.uid()`。anon/authenticatedのtable SELECT privilegeもtrue。Preview QAは公開行・限定列のみを読む。Production DB write/migrationなし。
- 新 `news-candidate-adapter.js` を追加。旧official row→candidate変換、都道府県補助推定、タイトル内月日からの暫定newsDate、SINGLE filter、ISO week、WEEKLY集計をUIから分離。推定値はverified factへ昇格しない。
- `news-publishing-admin.js` v2はニュース管理が表示された時だけ最大2,500件を500件単位でread-only取得。通常公開MAP訪問ではこの候補読込を開始しない。
- SINGLE一覧は実候補を表示し、source/facts/rights=要確認、render=不可、生成操作=disabled。WEEKLYは対象週+都道府県の実候補件数を表示するがProduction利用可能=0件を維持し、6/9/12件不足を架空補完しない。
- Preview QAの無認証閲覧は従来どおりニュース管理セクション限定。他の管理領域/RPC/書込は起動しない。
- adapter実行検証: 福岡の実legacy sampleで prefecture=福岡県、municipality=みやこ町、newsDate=2026-09-18、publishEligible=false、W38 filterをPASS。関連JS/testの構文PASS。
- Source Master過去seedでは警視庁「メールけいしちょう OPEN DATA」が一次ソース候補。現行公式サイトでもCC BY 4.0、出所表示、事実と異なる加工回避、訂正追従が明記されている。正式adapterはSource Masterの存在だけでなく最新利用規約・一次データ・訂正状態を保持する設計にする。
- 次: iPhone Previewで実候補表示/filters/weekly countを確認。並行してcanonical verified-news Admin API/BFF contractを設計し、legacy bridgeを置換できるようにする。Production migration・外部投稿なし。


## 2026-09-27 P4 canonical verified-news contract

- `tools/production-current/news-candidate-contract.cjs` を追加。schemaVersion=`machimamo-news-candidate-v1`、service=`machimamo`、informationKind=`POLICE_OFFICIAL|LOCAL_ANOMALY`。
- Candidate gateは sourceStatus=verified / factsStatus=verified / rightsStatus=cleared / correctionStatus=current を全て要求。HTTPS source/evidence、sourceHash SHA-256、verifiedFacts非空、publishable rights level、commercialUseAllowed=true、CC_BY attributionを検証。
- `LEGACY_UNVERIFIED` はcanonical validatorで拒否。旧spots candidateを選択しただけで正式候補へ昇格させない。
- `news-candidate-api-contract.md` に将来Admin API/BFFのread contract、service scope、pagination、correction/hash更新、storage責務分離を記録。endpoint実装・Production migration・Admin Auth変更は未実施。
- validator実行検証PASS：正常な警視庁OPEN DATA型candidateはvalid/publishEligible=true、correctionStatus=unknownはvalidだがpublishEligible=false、commercialUseAllowed=falseはinvalid、LEGACY_UNVERIFIEDはinvalid。
- 警視庁OPEN DATA最新公式確認：対象データはCC BY 4.0、出所表示、事実と異なる加工回避、訂正追従の注意あり。Open DATAサイトでは2026-09-24までの配信データ掲載を確認。利用規約は利用時に最新再確認する。
- P4 HEAD `17a0321e8fc77e153f2c014b3206c9e3ae5bc1ec`。Vercel Preview `dpl_HRhpe1UgUjtP11wNYB7iQPkzjgLC` READY / target=null。Production変更なし。

## 2026-09-27 警視庁ニュース更新・反映監査

- 警視庁側は更新継続。メールけいしちょうOpen DATAは9/24配信分まで、犯罪発生情報は9/25付情報まで確認。
- Production `spots.category=official` は1,972件、最新created_atは2026-09-19 06:15:37 UTC。東京らしい行は220件。サイト自動反映は現在停止と判定。
- `police_cron.yml` は6時間ごとのscheduleを維持しているが、全Actions runを監査した結果、最後のscheduled runは #102 / 2026-09-19 06:11:59 UTC。以後scheduled runなし。last runはsuccess、71 RSS lanes成功/1失敗、599候補抽出、新規23件、DB登録失敗0。
- last run headからcurrent mainまで `police_cron.yml` / `fetch_police_data.py` の差分なし。停止原因はworkflow disable / schedule enqueue等の外部状態を含め未確定。Production書込になるためmanual dispatchは未実施。
- 現fetcherは警視庁Open DATA直結ではなくMCAP + Google News RSS。Drive Events_Verifiedには9/24公開の東京3件TEST_OKがあるがruntime未接続。
- 件数増加は可能だがlane limit単純増加は採用しない。一次source直結、source/facts/rights/correction保持、市区町村代表座標/cache、MAP viewport取得へ移行してから増量する。
- public Nominatimの定期bulk利用条件と現1.5秒間隔が不整合のため、件数増加前にニュースpipelineからの依存を縮小/除去する。
- 詳細監査: `planning/police-news-ingestion-audit-20260927.md`。
- Production cron設定変更、DB書込、migration、全件取込、MAP増量は未実施。


## 2026-09-27 ニュース保持・選定方針確定

- activeなニュース候補/MAP表示対象は原則直近60日。60日超の未使用候補はactive対象から外し、90日以上をMAPへ残し続けない。
- ただし実際に生成・承認・公開・訂正対応へ使ったニュースは、二重投稿防止・訂正追従・監査のため source_event_id / source_hash / revision / publication / audit の最小メタデータを保持し、古いMAP pin/本文の保持とは分離する。
- 選定基準は「地域の人が今その地域で気をつける意味があるか」を優先。対人安全、子ども/弱者保護、地域拠点犯罪、地域での逮捕/捜索、公共安全影響を高優先。
- 高優先: 痴漢、つきまとい、声かけ、公然わいせつ、盗撮、不審者、暴行/傷害/強盗/脅迫、誘拐/連れ去り、子どもの行方不明/迷子/捜索、地域内の詐欺/特殊詐欺/窃盗/万引きグループ、地域拠点の組織犯罪、逃走/刃物/火災等の公共安全事案。
- 出入国管理法等の逮捕情報は、地域との具体的接点 + 一次情報確認を条件に対象。国籍を煽り要素にしない。
- 条件付き: 自殺/転落/死亡事案はSNS話題性だけで優先せず、交通停止・立入規制・救助・学校/地域影響等の公共安全上の意味がある場合のみ。方法・詳細地点を過度に強調せず、動機を推測しない。
- 原則除外: 地域接点のない海外逮捕、一般的な空港/税関摘発、啓発キャンペーン/採用/表敬/統計だけの広報、地域安全と無関係な一般ニュース。
- ユーザー例: 海外詐欺グループ逮捕=除外、新宿区で詐欺グループ逮捕=対象、新宿区拠点の全国万引きグループ=対象、羽田空港の単純違法物発見=除外、痴漢/つきまとい/誘拐/迷子/子ども捜索=優先。
- MAP保持とSNS Production選定は分離。SNS件数不足を古い/無関係ニュースで補完しない。
- 詳細: planning/news-selection-retention-policy-20260927.md


## 2026-09-27 交通安全ニュース追加確定

- 高速道路・自動車専用道路の逆走/逆走車は、重大な交通安全リスクとしてニュース選定の高優先カテゴリへ追加。
- 対象: 逆走発生、逆走車確認、逆走による事故、通行止め/車線規制、警察・道路管理者の緊急注意喚起。
- 地域/路線の具体的接点を確認し、古い再掲だけのニュースは除外。直近60日retentionを適用。
- tools/production-current/news-selection-policy.cjs に TRAFFIC_WRONG_WAY を実装し、地域性・60日retentionと合わせて判定する。


## 2026-09-27 P4 iPhone QA｜ニュース管理 PASS

- iPhone実機で固定QA入口 `https://machimamo-map-git-feat-dev34-current-production-engine-miti4.vercel.app/?newsAdminQa=1` を確認。
- 上部→最下部まで縦スクロールPASS。
- SINGLE一覧、WEEKLY、東京都 / 2026-W38、実候補件数、状態表示、最下部操作欄まで到達PASS。
- 広告帯による操作遮蔽なし。
- 実ニュース候補表示PASS。
- 候補行タップ時に詳細・Production・QC・Publishingへ遷移しない点は現行read-only一覧の実装範囲であり、今回のスクロール不具合ではない。
- 後続P4/P5で `候補詳細 → source/facts/rights → Production Preview → QC → 承認 → Publishing` を接続する。
- `LEGACY_UNVERIFIED` は将来詳細画面を開けても render / QC承認 / Publishing不可を維持する。
- Production Auth / RPC / DB write / SNS送信は変更なし。


## 2026-09-27 Renderer v13 recovery再開

- ChatGPT Libraryから `SOURCE_v13.zip` を回収。archive SHA256 `54499b60676f5c1f14d6bc51cf9234bed8f8ccb77fd8c4b86e7f92e133fc7d64`。
- root `machimamo_reference_v13.py` は17,761 bytes、SHA256 `12d6911d2454eebe17d260d9139d127ebba9b341f3cc2ddafa6c6b48b314b4e1` でユーザー提示値と一致。旧「v13不存在」blockerを訂正。
- READMEの `v13 is a strict delta over v12` を確認。v13→v12→v11→v10→v9→v6/v8 import chainを実物で追跡。
- v12/v11/v10/v9/v8はstandalone historical archiveとexact hash match。v6もSOURCE_v13から回収。base `render_short_44s.py` はLibrary v3 sourceから回収したがprovenance relationはNEEDS_REVIEW。
- CURRENT + REVIEW3/4/5 + v13/historyをASSET_ROOTへstageし、WORK_ROOTへpath literalだけrewriteしてactual `render_latest.py` importを実施。v13を越えてv8まで進み、`machimamo_video5_build_v4/source_v7/render_short_44s_v7_zoom_refined.py` で停止。現時点のtrue code blockerはv7。
- exact v7 sourceはLibrary/Drive/CURRENT/REVIEW/historical archivesで未回収。QC reportとv7 completed MP4は存在するが、描画sourceを推測で再構築しない。
- runtime fontは現環境で `Noto Sans CJK JP` を解決し、historical renderer期待のRegular/Bold TTC pathが存在。font availability blockerは解消したがVisual QCは未実施。
- new SINGLE 43s render / ffprobe / decode / Golden compare / Visual QCはv7 blockerのため未実施。WEEKLYはSINGLE PASSまで開始しない。
- 詳細: `planning/renderer-dependency-recovery-v13-20260927.md`。


## 2026-09-27 警視庁Open DATA direct adapter dry-run

- `machimamo-news-candidate-v1` のPOLICE_OFFICIALにstable `sourceEventId` を必須化。
- `tools/production-current/keishicho-open-data-adapter.cjs` を追加。Production writeなしのtransport-independent converterとして、sourceEventId / publishedAt / occurredAt / municipality / headline / body / source category / correction stateをcanonical candidateへ変換。
- sourceHashはsource identity/date/category/locality/headline/body/correctionを固定順でSHA-256化。訂正でhashが変わる契約。
- rightsは最新公式利用規約に基づきCC BY / attribution required / commercialUseAllowed=true / evidence URLを保持。地図・URL記述・問い合わせ記述は対象情報外という規約上の境界は別途維持。
- locality evidence、lastVerifiedAt、raw source categoryを保持し、60日retention + priority classifierへ渡す。
- Drive Events_Verifiedの東京都3件（練馬区/八王子市/板橋区、2026-09-24公開）をdry-run regression fixtureとして使用。adapter/testの構文確認PASS。
- 公開Open DATAのinteractive export画面は確認したが、current download endpoint/column payloadはこの環境から未取得。endpointや列名を推測で固定せず、source transport parserはlive export contract取得後に接続する。
- Production DB migration/writeなし。


## 2026-09-27 legacy police schedule停止原因の切り分け

- default branch=main、current mainにもpolice_cron.yml存在、schedule `0 0,6,12,18 * * *`維持。
- last scheduled run #102 (2026-09-19 06:11:59 UTC) はsuccess。以後repository Actions collectionにschedule event runなし。
- last-run HEAD→current mainでpolice_cron.yml / fetch_police_data.py差分なし。
- 9/27も他PR workflowは正常実行しているためrepo全体のActions停止ではない。
- 現接続ではworkflow-definition state / repository Actions policy endpointを読めず、個別workflowがdisabled_manuallyかactiveかは未確定。残原因クラスはworkflow個別stateまたはGitHub schedule enqueue側。
- legacy workflowはProduction spotsへ直接writeするためmanual dispatch/re-run/enable変更は未実施。
- 詳細: `planning/police-workflow-stop-audit-20260927.md`。
