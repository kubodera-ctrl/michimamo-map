# 開発34 次工程監査 2026-09-27

## 起点と反映状態
- P0 PR20 / restart/dev34: e0eb669602c7388cc52aa4258f61c67af73e4d7f 維持。Draft、未merge、Preview/iPhone未確認。
- P3 PR21 / feat/dev34-asp-runtime-master: 修正commit 829fe3a9fe0093d42be2157a8bd04fafe61558e2。base=restart/dev34維持。
- P4別branch feat/dev34-current-production-engine: 42549914a67bfe4111e703805af46cafb7f07e7f。CURRENT timelineのみ。Renderer/MP4 QC未完了。
- 本番deploy/Migration/広告公開/ASP実クリック/外部SNS投稿なし。

## Preview blocker（E）
Cloudflare DashboardはこのCloud Browserでセキュリティ検証を繰り返し、1回再読込後もログへ進めない。根本原因未特定。GitHub check概要はBuild IDのみでerror text/annotationsなし。再deployは実施していない。

|commit|Worker|Build ID|
|---|---|---|
|e0eb669|michimamo-map|b7ea36b6-7151-4bb0-8a42-e90b42937650|
|e0eb669|machiibe-preview|219a9e0d-3227-4362-bf3e-7e2c637a3e32|
|4cb36bc|michimamo-map|32cacf1e-42ab-43bc-96be-454a267788e4|
|4cb36bc|machiibe-preview|416e85f7-667f-48e0-9724-104a25a5f51e|

PR20のtreeにはevent-site/とWrangler設定がない。ルートpackage.jsonにはbuild scriptがない。Cloudflareで実際に指定されたroot/build/deploy/env/nodeは未読のため、これだけでCloudflareの原因と断定しない。

別途、GitHub Actions Event Site Check run36298069306/job108560510669の失敗は確定: actions/setup-node cache-dependency-path=event-site/package.jsonが存在せず `Some specified paths were not resolved, unable to cache dependencies.`。index.html変更がこのworkflowを発火する。後続では対象directory存在チェックを別probe jobに置き、存在するbranchのみevent-site buildを実行する。まちまもCIは独立させる。

Vercel project prj_ztySCERSaeL9B4F6pUarKwZenmeX: Git未接続を実画面再確認。GitHubを選ぶとkubodera-ctrl/michimamo-mapとConnectを表示。権限/接続変更は本人操作待ち。旧CLI READY deploymentはPR20 provenanceなし、Preview扱いしない。新Preview ID/URLなし。

## ASP Migration検証（C）
`npm run test:asp-db` はPGlite 0.5.8の隔離PostgreSQLに依存先の最小stubを作成してMigration全文を実行する。本番接続/データ利用なし。live admin_validateがvoid・認証/管理者/第二認証を検証すること、audit列を読み取り確認した。stubは本番認証のE2E証明ではない。

PASS: SQL構文、依存signature、未認証拒否、同一offer再import、初期draft非公開、媒体分離、publish/pause、click保存、admin list RPC、RLS、直接table権限遮断、退会後履歴匿名化。

発見・修正: auth.users ON DELETE SET NULLとclicksの本人/匿名ID必須CHECKが衝突し退会を阻害。挿入時RPC検証は維持し、削除後NULLを許容。その他、tracking URLの不要な正規化を廃止、画像クリックのsynthetic navigationを廃止、別機能保存ボタンへの干渉を防止。

未検証: Supabase PreviewでのAPI/RLS E2E、全migration同時適用、実admin password、実機。Productionへは未適用。

## ASP2 CURRENT差分（C）
2026-09-27にASP実装連携仕様 CURRENTを再取得。現在公開可0件、reward_enabled全件false。Importなし。
- 正式キー(offer_id,service,channel)。現Runtimeはoffer/serviceのみ。web以外を取り込む前にchannel対応必須。
- automation_level不明はNULL、D/Xへ推測変換しない。現default Xとの調整が必要。
- rate 0..1、points整数、未知enum拒否、重複履歴/internal_program除外、source content_hash/run_id/schema_versionが必要。
- placement_candidatesではなくplacement_approvedに制限。現管理者の任意placement設定をsource承認位置に束縛する必要あり。
- stale snapshot拒否、差分レビュー、全件取得成功後の停止、同期監査が未完了。
- 重要ASP管理操作はWorkers API v1へ段階移行。現在のSupabase管理RPCだけで共通基盤適合完了とはしない。

## P2監査（すべて実機未確認）
|領域|コード/DB/検証|状態|
|---|---|---|
|AIカメラ・車載|camera-* JS、camera_evidence DBあり。関連9テストPASS。撮影/保存/破棄/通信障害実機未確認|C|
|クイズ・スタンプ|quiz_claims/quiz_usage_days/weekly_stamp_events/rewards/aed_stamp_events/rewardsあり。quiz_server_ui PASS。dev27 fixture430件中question text unique321で旧テストFAIL|C|
|ランキング・ポイント|index UI/point_transactions/baselinesあり。集計・残高照合E2E未確認|C|
|交換|point_exchange_* 4表あり。最新digital_gift test PASS。旧beta testは期待文言30,000pt→3,000円が不一致でFAIL。設定有効化なし|C|
|今日のお出かけ・まちイベ|イベントbranchに実装。live eventsなし。公開導線/小画面E2E未確認|C|
|警視庁ニュース管理|既存コードあり。管理生成/承認E2E未確認|C|

P2対象14テスト中12PASS/2FAIL。npm test本体はPASS。旧テストFAILを隠すための削除やsnapshot更新は行っていない。

## P4（C）
Drive CURRENT v16.4 + REVIEW5確認、SOURCE_CURRENT_FULL.zip取得。SHA256=916157c8126923d7e4324cb968d34e38511c767ad0bdb25803656d148052bf93。
Sourceは/mnt/data絶対path依存、日本語font別途必要。別branchでSINGLE43/WEEKLY38+12*ceil(n/3)・ニュース10+2秒保持を実装し、件数境界テストPASS。既存画像/描画関数未変更。source/Golden完全照合、Renderer移植、完成MP4 QCは未完了。

## P5共通schema整合（D/C）
確認branch feature/machimamo-events-foundation @7c3dd1562438b36f21c876ef7938b57a4644061a。
`20260927062000_machiibe_operational_foundation.sql`にproduction_master_registryおよびpublishing_post_sets/revisions/platform_posts/audit_logあり。service=machimamo/machiibe対応。まちまも側へ同名DDLは追加しない。live DBには未作成。
要調整: 同一migration内の重複CREATE群、Masterのmigration時自動active更新、renderIdとnewsId/weeklySetId対応、post_setとrevisionの所属整合、postedの外部ID/最終状態制約、履歴cascade削除、connection_required/review_pendingの状態、WEEKLYはTikTok単独で済とする集計。

共通契約案: Producerはimmutable renderId/revisionId/templateVersion/mediaHash/QCを渡す。Publisherはservice/contentType/requiredPlatformsと管理者の最終投稿意思を確認し、同一revision/platform/repostSequenceの一意キーを予約する。キュー再配送では同じattemptを再利用。外部応答不明は照会待ちとし自動再投稿しない。XはexternalPostId、TikTokは最終公開成功のみposted。送信済/投稿未完了はsentのまま。再投稿は明示操作のみ。外部API呼出し未実装・未実行。

ASP成果Adapter案: API/Webhook/CSV/Manualを確認済みcapabilityごとに選択。不明providerはdisabled。canonical eventはasp/accountScope/externalConversionId/offerId/status/revision/sourceHash/occurredAt/approvedAt/rewardToken。raw eventを監査保存し署名/重複/媒体許可/会員照合後に正規化。approvedは既存point_transactionsのledger adapterへ一意keyで接続し、取消は原仕訳参照の逆仕訳。ポイント整数・確定ルールを使用しbalance直書き禁止。未照合はpending_review/DLQ。個別ASPのWebhook/API利用権限が未確認の間は有効化しない。

## 次工程
Vercel本人ConnectまたはCloudflare失敗ログの提供→正確な設定修正→e0eb669由来Preview→Safari実機。並行してASP2のchannel/placement/同期監査を適合、P2失敗テストの現行仕様照合、CURRENT rendererを移植。PR20 PASS前にPR21先行merge禁止。
