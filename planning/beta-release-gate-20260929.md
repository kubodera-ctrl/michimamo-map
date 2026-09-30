# まちまも β Release Gate — 2026-09-30

対象: β Release Candidate。Production Web反映前の最新判定。

## 統合状態
- main: PR #20 → PR #22 → PR #29 Identity-only を順序通り統合済み。
- 旧PR #27はIdentity/Police統合後のmainと競合するため直接mergeしない。
- 本RCはPR #30でexact-SHA PASSした合成差分を現在main上へクリーン再構成。
- Vercel git.deploymentEnabled.main=false はmain反映済み。main mergeでProduction deployしないことを実確認。

## Gate
- Security: PASS。β初期不要Production Edge Functions 6件をrollback archive後、verify_jwt=true + 410 Gone stubへ安全化。
- Auth: PASS。Production line-auth v4へshared persistent limiter追加。
- RLS: PASS。Production public tables RLS enabled。
- Privacy / Terms: PASS。β運用・交換OFF・広告還元OFF・障害ログ最小収集を明記。
- Safari / Private Safari: PASS。本人QA済み。
- Android: 未確認。
- MAP / Posts / Police subtype / Identity: CI PASS済み。最終RCでも回帰gateを実行。
- Point Exchange: β初期OFF。exchange_enabled=false / processing_enabled=false。
- ASP / Ads: fail-closed。実装_媒体 is_publishable=TRUE は0件。
- Error logging: Production client-error-log v1 deploy済み。本RC browser code反映後に稼働開始。
- Rate limit: PASS。Production private persistent bucket + service_role-only consume RPC適用。line-auth 10/min、client-error-log 20/min。
- Accessibility: 静的PASS。スクリーンリーダー実機QAは未実施。
- Production deploy boundary: PASS。main Git auto deploy OFF。既知Production dpl_5XX... はCLI起点のまま。
- Backup: 未完。Release直前manual DB dump + Storage退避が必要。
- Rollback: PREP。Vercel既知正常deployment + Edge rollback archiveあり。RTO restore drillは未実測。
- Performance: static budgetあり。Lighthouse/mobile/first map表示の実測が残る。
- Domain/canonical/robots: 正式domain決定後。
- Cloudflare Workers Builds: 外部blocker。同型failure継続、GitHub requiredではない。Dashboard build logでroot cause確定が残る。

## Production security changes completed
- Vercel main auto Production deploy OFF。
- Production Edge Functions 6件を無副作用stubへ安全化。
- beta_edge_rate_limit migration適用済み（20260929231903）。
- client-error-log v1 ACTIVE。
- line-auth v4 ACTIVE。
- line-auth v3とvideo/POC旧sourceはmainへarchive済み。

## ASP
- ValueCommerce site ID 3779876 / machimamo登録URL https://machimamo-map.vercel.app を媒体URL台帳へ証拠付き反映済み。
- A8登録媒体URLは正本証拠未回収。推測しない。
- publish gate通過前に実広告表示、tracking click、point rewardは開始しない。

## β公開前残作業
1. 本RC exact-SHA CI。
2. Previewが作れる場合は自動QA。Vercel quota等は外部blockerとして管理。
3. Android実機QA。
4. Lighthouse / mobile performance。
5. Release直前manual DB + Storage backup。
6. 最終本人QA後、明示Production deploy。
