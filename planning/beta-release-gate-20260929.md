# まちまも β Release Gate — 2026-09-29

対象: β Release Candidate。Production変更前の判定。

基準upstream: PR #27 `1a86bdaec0b576e61ced875372f2257627b5087f`（base: `restart/dev34`）。
開発38準備branch: `prep/dev38-beta-release-blockers`。
禁止継続: Production Migration / Production deploy / PR merge / Vercel Production promotion / Production Edge Function停止・再deploy / ASP実広告公開 / tracking URL自動click / Point Exchange ON / processing ON / OAuth追加 / SNS実投稿 / 新規費用・契約。

## Gate

| 領域 | 状態 | 根拠 / 残件 |
| --- | --- | --- |
| Security | FAIL | Productionでβ初期不要のPOC/video Edge Functions 6件がACTIVE。特に `machimamo-video-save-final` は認証なし・service role使用・public bucket作成・Storage upsert可能。停止/保護は本人承認待ち。加えてpublic rankingのraw UUID除去はprep branchで修正準備済み、Production未適用。 |
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
| Error logging | FAIL（準備済み） | prep branchでglobal JS error / unhandled rejection / RPC failure / LINE auth failure / map init phaseをSupabase Edge logへprivacy-minimalに送る構成を実装。新Edge Function deployとpersistent limiter migrationはProduction未適用。 |
| Backup | FAIL（手順確定） | Supabase Free planのため自動日次backupを前提にしない。DB約116 MB、Storage約11 MB。Release直前のmanual DB dump + Storage退避runbook作成済み。実snapshot未取得。 |
| Rollback | PREP | 既知正常Vercel Production `dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4` と公式rollback/promote手段を確認。Production実rollbackは未実施。disposable restore drill未実施のためRTO未実測。 |
| Production deploy | FAIL | 既知ProductionはCLI起点、PR PreviewはGit起点target=null。main更新時のGit起点Productionは確認されていないが、Vercel Projectの現設定をconnector不整合で完全取得できず、auto deploy無効を断定できない。merge禁止継続。 |
| Domain | 未確認 | Vercel aliasesは確認済み。正式domain最終決定は未完。 |
| SEO/noindex/index | 未確認 | description/theme-color/manifestあり。canonical/robotsは正式domain確定後。 |
| Accessibility | PASS | 静的gate PASS。スクリーンリーダー実機QAは未実施。 |
| SNS | N/A | β初期Production投稿OFF。 |
| Admin | PASS | admin RPCはauthenticated + active user + admin_users + 第二パスワード + admin_validate。 |
| Rate limit | FAIL（準備済み） | 個別write RPCには日次上限・idempotency・advisory lock等あり。残blockerは認証前Edgeの共有永続limiter。prep branchでservice-role-only DB limiterとLINE auth 10/min/IP相当を実装、Production未適用。 |
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
- ただしProject current settingを完全取得できていないため、設定変更・mergeは本人承認前に実行しない。

## Production Edge Function findings

### β公開前に停止/保護が必要
- `poc-session`: POC。service-roleでAuth user create/delete。
- `machimamo-video-asset-test`: public media endpoint。
- `machimamo-video-overlay-v1`: public media endpoint。
- `machimamo-video-final-v1`: public proxy endpoint。
- `machimamo-video-download-page`: public HTML endpoint。
- `machimamo-video-save-final`: 認証なし / service-role / public Storage bucket create + upsert。最優先。

前工程で上記6件の直近24h invocation 0、video bucket/object 0を確認。停止はProduction変更のため未実行。

### verify_jwt=falseだが内部防御あり
- `line-auth`: OAuth callback用途。内部認証あり。
- `account-deletion`: Bearer user + admin RPC + password。
- `camera-evidence-retention`: scheduler token またはBearer user。
- `aed-retention`: scheduler token。
- `aed-image-check`: Bearer/internal checks。

開発38でProductionにのみ存在していた `line-auth` current sourceをprep branchへ正本化済み。

## 開発38 security prep

Productionには未適用。

- `20260929130000_beta_edge_rate_limit.sql`
  - private bucket table
  - raw IPを保存せずkeyed hashのみ
  - service_role-only consume RPC
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
1. persistent limiter migration
2. `client-error-log` deploy
3. `line-auth` redeploy
4. Release Candidate browser code
の順を守る。1〜3はProduction変更なので本人承認まで実行しない。

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

1. Production不要Edge Functions停止/保護。
2. Vercel main→Production deploy境界の確定。
3. Error logging / shared rate limitのProduction適用判断。
4. Release直前manual backup取得。
5. PR #20 → #22 → Identity-only → PR #27 の統合順維持。
6. Production Migration / PR merge / Production deployは本人承認まで実行しない。

## 本人QA待ち

- PR #27 iPhone関連箇所QA。
- Android実機QA。
- Cloudflare Dashboard build log確認（root cause確定用）。

## 次に本人操作なしで進める項目

- prep branchのCI / Previewでsecurity prepの構文・既存回帰を確認。
- Identity-only再構成diffの事前準備。
- PR20→PR22→Identity-only→PR27の統合conflictをread-onlyで事前監査。
- Lighthouse等の実測PerformanceをPreviewで可能な範囲まで確認。
