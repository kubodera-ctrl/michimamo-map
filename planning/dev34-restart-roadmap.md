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
| ASP実広告リンク / Runtime Master | C | ASP2管理のDrive案件マスター最終更新 2026-09-27 15:09 JSTを読取確認。専用ブランチ `feat/dev34-asp-runtime-master` にfail-closed schema/RPC、管理同期UI、PR枠、クリック記録、契約テストを追加。migration未適用・Preview未確認・実リンク未公開。成果連携/Webhook/ポイント台帳接続は未実装。 |
| まちイベ / 今日のお出かけ導線 | C | 仕様・コードの現状態と導線の端末確認を行い、既存機能を継続利用。追加ポップアップは共通UI/Feature flag/API契約を先に用意する。 |
| 警視庁ニュース自動化 | C | 取得/検証コードは存在。最新記事性、一次ソース、失敗時、管理者承認の実運用確認が未完。 |
| 動画Production | C | local `tools/news-studio` は15秒/4frame試作でDrive CURRENTの v16.4 + REVIEW5 (43s/Weekly公式尺) と不一致。参考成果物として保管し、本番生成・MP4には採用しない。 |
| SNS投稿 (X/TikTok) | D | 管理者承認後の投稿UI/履歴/adapter未実装。接続、課金、TikTok監査状況を確認するまでは送信しない。 |
| GitHub/CI冗長性 | C | Cloudflare/Supabaseは接続済みだがCloudflare側preview/deployの独立手順とGitHub停止時の再現テストは未確認。GitHub Actionsを唯一のデプロイ経路にしない。 |
| Drive資料整合 / 仕様更新 | B | Drive CURRENTとASP masterを確認。差分を反映する実装仕様・未決条件の運用記録が必要。 |

## 統合ロードマップ

### P0 — Safari・既存未完了の回収

## 現在の接続・Preview blocker（2026-09-27）

- PR #20はDraftのまま。Vercel project `machimamo-map` のProductionは既知正常 deployment `dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4`（`machimamo-map.vercel.app`）と確認。Productionには変更なし。
- Vercel project Settings > Git で「This Project is not connected to a Git repository」を確認。PR #20のPreview URLは未作成。Vercel GitHub App/repository接続の権限を戻す操作は本人の明示確認後に行う。
- 最新候補deployment `dpl_4rNUM3ezdXPPSpMRKAAYE7V2tyHt` はtarget/aliasなしでPR #20 Previewとして使えない。
- Cloudflare DashboardはCloudflareのセキュリティ検証画面で停止（検証回避なし）。ローカルにVercel CLI/Wranglerと`.vercel`接続設定なし。独立Preview経路は未確立。
- PreviewができるまでSafari実機QA・merge・Production反映は禁止。Cloudflare等のProduction非接触Preview経路も調査する。

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

### P3 — ASP実広告リンク・Runtime Master・交換台帳

1. ASP2がGoogle Sheets「まちまも・まちイベ ASP案件マスター」の編集責任者・事業正本を保持。開発34はSheet→Supabase Runtime Master同期とアプリ利用を担当し、同期直前に最新状態を再取得する。
2. ASP案件マスターの安定 `offer_id` をそのままPrimary KeyとしてRuntime MasterへImportし、別名や合成IDに置き換えない。Importはsource factsだけをupsertし、公開・placementを有効化しない。raw広告HTML/iframe/scriptは拒否する。
3. offerとservice(media)を分離する。まちまもとまちイベで承認/リンクを共有しない。まちまも公開gateは提携承認、まちまも掲載許可、媒体承認、本番掲載可否、Web承認、実tracking URL、active、掲載期間、enabled placementを全て要求する。
4. 広告掲載許可とポイント還元許可を分離する。ポイント情報は `point_reward_allowed AND reward_rule_confirmed` の場合だけ返す。NG案件はポイント付与せず通常PR掲載のみ可能。
5. 管理画面で公開ON/OFF、placement、掲載期間、一時停止、クリック数、還元条件、媒体承認、source同期/最終確認を確認できる。成果連携は未接続と明示する。
6. クリックは内部click_id/offer/service/placement/userまたは匿名session/time/source screenを記録し、ASP発行tracking URLへ直接遷移する。ASP2 masterの本番掲載準備が掲載不可/未確認の現行案件はdraftに留める。URLへパラメータを足さず、計測失敗で遷移を止めない。テストは実リンクをクリックしない。
7. 成果照合、reward_token、Webhook/Queue、ledgerは後続工程。ASPが識別パラメータを許可しない案件を自動個人照合しない。ASPへ個人情報を渡さない。
8. available/reserved/confirmed/expired/reversed台帳、交換予約・失敗返還・完了のidempotencyを実装する。ギフト事業者契約/費用/個人情報フローが未確定の間はlive交換を無効に保つ。

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


### P3 実装確認メモ（2026-09-27）
- 現行ASP masterの安定IDは `offer_id` 列（例 `ofr_000002`）、A8の `program_id` は `s00000027130002`。offer_idを合成IDへ置き換えない。
- `本番掲載準備` 現行行ではLepton BridgeとLeptonの2件が「掲載不可」。現行のProduction URL/Web・PWA・アプリ条件と掲載位置の最終確認待ち。掲載gateに `production_listing_approved` を追加し、Sheetで掲載可になるまでRuntimeでは公開できない。
- Lepton Bridgeは還元不可。App/SNS/LINE媒体承認も未確認。正規URLをdraft同期する場合もポイント表示なし、machiibeへリンクを流用しない。
- admin UIはJSON importを受けるが、Google Sheets API直接同期/変換は未接続。ASP2のソース編集は行わない。

## 2026-09-27 次工程検証（feature側記録）

- この追記はPR #21側。PR #20 base e0eb669は未変更。
- ASP修正push: 829fe3a9fe0093d42be2157a8bd04fafe61558e2。隔離PostgreSQL実行検証PASS、退会時クリックFK/CHECK衝突を修正。Production未適用。
- Cloudflare failed build 4件を特定、ログ本文はCloud Browserのセキュリティ検証で未取得。根本原因未確定。
- GitHub Event Site Checkはevent-site/package.json不在によるcache pathエラーを確認。Cloudflare原因と混同しない。
- Vercel Git選択画面にkubodera-ctrl/michimamo-mapのConnect表示。本人接続待ち。Preview ID/URLなし。
- ASP2契約とchannel・unknown automation・approved placement・sync auditに差分あり。現PRは本番利用不可、C継続。
- P2追加13テスト=11PASS/2FAIL（旧quiz fixture重複、旧exchange期待文言）。実機未確認。
- P4別branch feat/dev34-current-production-engine @42549914a67bfe4111e703805af46cafb7f07e7f。CURRENT timeline実装/テストのみ、Renderer/MP4 QC未完了。
- P5はまちイベ既存共通schemaを再利用する方針。同名DDL追加なし。
- 詳細/検証限界/次工程: planning/dev34-validation-20260927.md。

## 2026-09-28 ASP Discovery / sort・filter

- 正本: Drive「まちまも・まちイベ ASP案件マスター」/ ASP実装連携仕様 CURRENT（schema_version=asp_master_v1）。本番掲載可能0件・還元有効0件を維持し、推測データは作らない。
- PR #21専用branch feat/dev34-asp-runtime-master上で実装。P4 news branchへ混在させない。
- Runtime discovery metadataを追加: media_conditions_verified / link_verified / reward_permission / reward_enabled / reward_fixed_points / action_type / cost_type / purchase_required / estimated_available_days / source_added_at / recommendation_rank / recommendation_note / conversion_conditions。
- Public gateを強化: partnership + source_listing + media approval + production listing + media_conditions_verified + link_verified + Web approval + exact tracking URL + active/listing_enabled + approved placement + valid windows。
- ユーザー分類: すべて / 反映が早い / 高ポイント / かんたん / 無料でできる / 購入不要 / おすすめ / 新着。確認済みmetadataだけで判定。
- sort: おすすめ / ポイント高低 / 反映早遅 / 追加新旧。popularは実usageがある場合のみ将来enableするcontract。
- 「反映が早い」はASP成果発生/承認ではなくestimated_available_days（ポイントavailableまで）の確認済み数値だけを使用。正式値なしは表示・sort対象外。
- 「かんたん」はaction_typeの free_registration / app_install / document_request のみ。曖昧条件はnull。
- reward表示はreward_permission=allowed + point_reward_allowed + reward_rule_confirmed + reward_enabled + confirmed value/ruleを満たす場合のみ。
- discovery UIはcategory filterとspecial filter/sortを併用可能。詳細条件はdetailsへ分離。
- 人気順は架空生成しない。実click usageが正に存在し、明示enableされた場合のみ表示可能。
- migration codeは追加するがProduction DBへは未適用。ASP tracking URLの自動巡回/クリックテストなし。

## 2026-09-28 ASP Discovery UX follow-up

- recommendation_rankが無い状態で「おすすめ順」を捏造しない。sortには常時「掲載順」を用意し、recommendation_rankが実データに存在する場合のみ「おすすめ順」を表示。
- 「反映が早い」presetはestimated_available_days確認済み案件だけに絞り、反映：早い順へ切替。
- 「高ポイント」presetは公開可能な確認済み固定ポイント案件だけに絞り、ポイント：高い順へ切替。
- 「新着」presetはsource_added_at確認済み案件だけに絞り、追加：新しい順へ切替。
- カテゴリfilterは独立して併用可能。

## 2026-09-28 ASP Discovery empty-state follow-up

- ASP2 CURRENTで本番掲載可能0件・還元有効0件のため、架空fixture案件は公開UIへ投入しない。
- Discovery RPCが0件または未接続でも、分類/カテゴリ/sortのUI shellを表示してレイアウト確認可能にする。
- 案件リストは0件のまま。Runtime未接続時は「fail-closed」を明示し、既存/推測案件へfallbackしない。

