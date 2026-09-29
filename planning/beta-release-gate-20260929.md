# まちまも β Release Gate — 2026-09-29

対象: β Release Candidate。Production変更前の判定。

基準upstream: PR #27 `1a86bdaec0b576e61ced875372f2257627b5087f`（base: `restart/dev34`）。
開発38準備branch: `prep/dev38-beta-release-blockers`。
Draft PR: #28 `開発38: β Release blocker preparation`。最終baseはPR #27 branch `fix/beta-legacy-asp-gate` を維持する。
運用基準: 安全・可逆な変更は本人確認なしで継続。新規費用/契約、OAuth・2FA等の本人操作、Productionデータ破壊、不可逆Migration、DNS等の重大本番設定、法的同意が必要な操作のみ本人確認ライン。

## Gate

| 領域 | 状態 | 根拠 / 残件 |
| --- | --- | --- |
| Security | PASS | β初期不要のProduction Edge Functions 6件は2026-09-30に現行sourceをmainへrollback archive後、全件 `verify_jwt=true` + 410 Goneの無副作用stubへreversible redeploy済み。`machimamo-video-save-final` のStorage副作用経路も無効化。public ranking raw UUID除去は追加hardeningとしてprep済み、UI同期時に適用する。 |
| Auth | PASS | LINE authはstate hash、OIDC nonce、LINE PKCE、5分challenge、1分exchange code、DB atomic single-use consume、origin checkを確認。 |
| RLS | PASS | Production public tablesは全件RLS enabled。 |
| Privacy | PASS / prep更新あり | PR #27のβ利用状況説明に加え、prep branchではprivacy-minimalなβ障害情報の説明も追加。Production未反映。 |
| Terms | PASS | β版Point Exchange受付/承認/発行停止、広告ポイント還元OFFを明記。 |
| UI | 未確認 | PR #27最新Previewの本人iPhone QA待ち。 |
| Safari | PASS | PR #20本人QA済み。 |
| Private Safari | PASS | PR #20本人QA済み。 |
| Android | 未確認 | β公開前に最低1台の実機QAが必要。 |
| Performance | 未確認 | 静的budgetはPASS。Lighthouse / mobile / first map display / waterfallは未実測。 |
| MAP | PASS | PR #27でMAPロジックの意図しない変更なし。 |
| DB | PASS | Production read-only監査済み。 |
| Points | PASS | βで有効な通常ポイント系は既存server-side contract/isolated write E2Eを維持。 |
| Point Exchange | N/A | β初期OFF。Production `exchange_enabled=false` / `processing_enabled=false`。PR #25はON直前までProduction適用しない。 |
| ASP | PASS | fail-closed。publishable案件0に整合。 |
| Ads | PASS | legacy hardcoded広告・tracking pixel・未承認ポイント断定を撤去。 |
| Analytics | PASS | 認証済みpresence/管理集計あり。 |
| Error logging | FAIL（準備済み） | browser capture + `client-error-log` はprep済み。共有persistent limiter基盤はProduction適用済み。`client-error-log` deployとbrowser RC反映が残る。 |
| Backup | FAIL（手順確定） | Supabase Free planのため自動日次backupを前提にしない。DB約116 MB、Storage約11 MB。Release直前のmanual DB dump + Storage退避runbook作成済み。実snapshot未取得。 |
| Rollback | PREP | 既知正常Vercel Production `dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4` と公式rollback/promote手段を確認。Production実rollbackは未実施。disposable restore drill未実施のためRTO未実測。 |
| Production deploy | PASS | `vercel.json` の公式 `git.deploymentEnabled.main=false` をPR #33でmainへ反映。main HEAD更新後にmain起点Vercel deploymentが発生しないことを確認。既知Production `dpl_5XX...` / aliasesは不変。Productionは明示promote/CLI方式とする。 |
| Domain | 未確認 | Vercel aliasesは確認済み。正式domain最終決定は未完。 |
| SEO/noindex/index | 未確認 | description/theme-color/manifestあり。canonical/robotsは正式domain確定後。 |
| Accessibility | PASS | 静的gate PASS。スクリーンリーダー実機QAは未実施。 |
| SNS | N/A | β初期Production投稿OFF。 |
| Admin | PASS | admin RPCはauthenticated + active user + admin_users + 第二パスワード + admin_validate。 |
| Rate limit | FAIL（基盤適用済み） | 個別write RPCのguardに加え、2026-09-30 Productionへprivate bucket + service_role-only `consume_edge_rate_limit` を適用済み。anon/auth EXECUTEなしをreadback。残りは `line-auth` を共有10/min limiterへ切替し、client error loggerへ20/min limiterを接続すること。 |
| Abuse prevention | PASS | 既存の投稿/ポイント/画像/appeal/quiz等に個別abuse guardあり。 |

## PR #27 current CI

PR #27 exact HEAD `1a86bdaec0b576e61ced875372f2257627b5087f`

- Beta Release Gate run 36496337009: PASS
- Event Site Check run 36496337080: PASS
- checkout SHA == event head SHA: PASS
- full `npm test`: PASS
- legacy ASP / real-data-only ranking / legal-runtime / accessibility / SEO-PWA / static performance gates: PASS

開発38 prep branchは上記upstreamを動かさず別branchで準備中。prep branch自身のCIはDraft PR作成後に記録する。

## Cloudflare Workers Builds

コード側から確認できる範囲を切り分け済み。

- PR #27:
  - machiibe-preview: `5d2a3344-f329-40e8-b27b-0e3015053507`
  - michimamo-map: `3b624ed6-a52f-471d-bf80-07070391d450`
- main:
  - machiibe-preview: `d957845f-73c9-4acf-ae76-e9750b8f09cb`
  - michimamo-map: `dc761d41-ffe8-4c54-9f41-04f42834e2bb`
- PR #20:
  - machiibe-preview: `4e2277a2-3b1e-4e69-8d95-22dcdf433370`
  - michimamo-map: `9f5529a9-3819-4b23-beba-e02995f4edcf`

共通事項:
- 同型failureがmain/PR20/PR27に発生。
- GitHub required checkではない。
- repoにwrangler.toml / wrangler.json / wrangler.jsonc等のCloudflare build設定なし。
- Event Site Check内のCloudflare adapter buildは別経路でPASS。
- PR #27コード固有regressionを示す証拠は現在ない。
- 根本原因確定にはCloudflare Dashboardの該当build logが必要。Dashboard操作・設定変更は本人側の確認境界。

## Vercel deploy境界

- 既知正常Production `dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4`: target=production / source=cli / Git metaなし。
- PR #27 Preview `dpl_6CnL2cUVGsvK3CZ8dHohQXon4359`: target=null / source=git / branch・SHA metaあり。
- 確認できた既知Production 3件はいずれもCLI起点。
- Vercel公式仕様では `git.deploymentEnabled.main=false` でmain Git deploymentを無効化可能。
- PR #33で `git.deploymentEnabled.main=false` をmainへ反映し、main merge後にVercel Production deploymentが発生しないことを実確認。既知Production aliasesは不変。

## Production Edge Function findings

### β初期不要Functionの安全化完了
- 直近24h invocation 0を再確認。
- 現行sourceを `tools/production-edge-archive/20260930/` へ保存しPR #34でmain反映。
- `poc-session`: v5 / verify_jwt=true / 410 stub
- `machimamo-video-asset-test`: v2 / verify_jwt=true / 410 stub
- `machimamo-video-overlay-v1`: v2 / verify_jwt=true / 410 stub
- `machimamo-video-final-v1`: v3 / verify_jwt=true / 410 stub
- `machimamo-video-download-page`: v2 / verify_jwt=true / 410 stub
- `machimamo-video-save-final`: v3 / verify_jwt=true / 410 stub
- 旧Auth/Storage/media副作用は現在実行不能。必要時はarchive sourceから明示reviewして復元可能。

### verify_jwt=falseだが内部防御あり
- `line-auth`: OAuth callback用途。内部認証あり。
- `account-deletion`: Bearer user + admin RPC + password。
- `camera-evidence-retention`: scheduler token またはBearer user。
- `aed-retention`: scheduler token。
- `aed-image-check`: Bearer/internal checks。

開発38でProductionにのみ存在していた `line-auth` current sourceをprep branchへ正本化済み。

## 開発38 security prep

Production適用状況を項目ごとに明記。

- `20260929130000_beta_edge_rate_limit.sql` → Production適用済み（migration `20260929231903 beta_edge_rate_limit`）
  - private bucket table
  - raw IPを保存せずkeyed hashのみ
  - service_role-only consume RPC
  - anon/auth schema usage・EXECUTEなしをreadback
  - LINE auth 10 requests / 60 sec
  - client error logger 20 requests / 60 sec
- `20260929130500_safe_profile_ranking.sql`
  - public rankingからraw profile UUIDを除去
  - `is_me` をserver-sideで返す
- `supabase/functions/line-auth/index.ts`
  - current Production sourceをGitへ正本化
  - shared persistent limiter準備
  - secret/token/raw IPを含まない固定error log
- `supabase/functions/client-error-log/index.ts`
  - origin allowlist
  - fixed event schema
  - secret/user payloadを受けない
  - persistent rate limit
  - Supabase Edge structured logへ出力
- `beta-error-bootstrap.js`
  - app起動前のglobal error / unhandled rejection queue
- browser runtime
  - RPC failure central capture
  - LINE auth start/exchange/session failure capture
  - map init phase識別
- Privacy
  - β障害情報の最小収集内容と非収集項目を明文化

deploy sequencing:
1. persistent limiter migration → DONE
2. `client-error-log` deploy
3. `line-auth` persistent limiter redeploy
4. Release Candidate browser code
の順を守る。safe ranking migrationはbrowser UI同期と同時工程まで保留。

## Backup / Rollback

詳細: `planning/beta-backup-rollback-runbook-20260929.md`

β公開前Backup PASS条件:
1. roles/schema/data dump取得
2. Storage全object退避
3. count / size / checksum確認
4. Git SHA / Vercel deployment / Edge Function inventory固定
5. snapshot後にProduction変更

RTOはrestore drill未実施のため未実測と明記する。

## Merge前の必須blocker

1. Error loggingの残適用（`client-error-log` + browser RC）。
2. `line-auth` をpersistent limiterへ切替。
3. Release直前manual backup取得。
4. PR #20 → #22 → Identity-only → PR #27 の統合順維持。
5. PR #30統合PreviewのPASS結果を正式統合時にも維持。
6. Cloudflare failureはGitHub requiredではないが、可能ならDashboard logでroot causeを確定。

## 本人QA待ち

- PR #27 iPhone関連箇所QA。
- Android実機QA。
- Cloudflare Dashboard build log確認（root cause確定用）。

## 次に本人操作なしで進める項目

- prep branchのCI / Previewでsecurity prepの構文・既存回帰を確認。
- Identity-only再構成diffの事前準備。
- PR20→PR22→Identity-only→PR27の統合conflictをread-onlyで事前監査。
- Lighthouse等の実測PerformanceをPreviewで可能な範囲まで確認。


## 2026-09-30 開発38追記

- main HEAD: `0690a6833d61e0e754d4f7b771052bb0c8bc918e`（Vercel deploy policy + Edge rollback archive反映後）。
- PR #29 Identity-only: exact HEAD `e984a078...` npm-test PASS。P4/P5 ancestry混入なし。
- PR #30 β統合Preview: HEAD `3ce090fd...` exact-SHA npm-test PASS。
  - legacy ASP / real ranking / legal / accessibility / SEO-PWA / performance
  - police_safety subtype
  - profile v2 / Identity UI
  全PASS。
- Vercel Git Previewは一時 `api-deployments-free-per-day`（100/day超過）で停止。コード不具合ではない。prep branchのGit auto deployを本commitから停止し、今後は必要なPreviewだけ明示作成する。
