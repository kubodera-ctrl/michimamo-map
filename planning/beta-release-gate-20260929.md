# まちまも β Release Gate — 2026-09-29

対象: β Release Candidate。Production変更前の判定。
基準HEAD: `02ed000e52807f2d69614ba49aa286e92f1c3555`（PR #27 stacked on PR #20）
禁止継続: Production Migration / Production deploy / PR merge / ASP実広告公開 / tracking URL自動click / Point Exchange ON / OAuth追加 / SNS実投稿。

## Gate

| 領域 | 状態 | 根拠 / 残件 |
| --- | --- | --- |
| Security | FAIL | Production Supabaseで不要な動画テスト/出力Edge FunctionsがACTIVE。特に `machimamo-video-save-final` は `verify_jwt=false` かつ service role でpublic Storage bucket作成・upsert可能。直近24h invocation 0、bucket/object 0だがβ公開前に停止または認証付き再deployが必要。 |
| Auth | PASS | LINE authはstate hash、OIDC nonce、LINE PKCE、5分challenge、1分exchange code、DBのatomic single-use consumeを確認。start/exchangeはFrontend originを制限。 |
| RLS | PASS | Production public tableは全件RLS enabled。RLS policy 0の表はread-only監査上anon/auth direct grantsなしのRPC-only/private設計を確認。 |
| Privacy | PASS | PR #27でβ利用状況（利用日/最終利用/直近2分online集計）、外部サービス、広告ポイント還元OFFを実装に合わせて明記。 |
| Terms | PASS | PR #27でPoint Exchange受付/承認/発行停止、広告ポイント還元OFFを明記。 |
| UI | 未確認 | PR #20の本人iPhone QAはPASS。PR #27は広告/ランキング/legal/a11y/meta差分のみだが、最新Previewの本人画面QAは未実施。 |
| Safari | PASS | PR #20本人QAで通常Safari基本表示・サイズ・下部menu・modal確認済み。 |
| Private Safari | PASS | PR #20本人QAで基本表示確認済み。 |
| Android | 未確認 | 実機QAなし。 |
| Performance | 未確認 | `index.html` 約703k chars、inline script約176k chars。定量Lighthouse/低速回線計測は未実施。 |
| MAP | PASS | PR #20系で地図・下部menu・警察/AED導線を維持。PR #27はMAPロジック変更なし。 |
| DB | PASS | Production read-only監査実施。Point ledger mismatch 0 / negative 0 / duplicate key 0（前工程）を維持。 |
| Points | PASS | 通常投稿等の既存ポイントはserver-side contract/isolated write E2E PASS。Point ExchangeはOFFとして別扱い。 |
| Point Exchange | N/A | β初期OFF。Production `exchange_enabled=false` / `processing_enabled=false` / requests=0。ON前にPR #25 migrationとavailable projectionが必要。 |
| ASP | PASS | β fail-closed。ASP2 CURRENTのpublishable 0 / reward 0を維持。 |
| Ads | PASS | PR #27でA8/ValueCommerce実リンク、1px tracking、旧Ipsos/CampusTopポイント断定、特P/軒先hardcodeを撤去。再混入テストPASS。 |
| Analytics | PASS | 認証済みβ利用状況のpresence/管理集計あり。Privacy説明もPR #27で整合。 |
| Error logging | FAIL | Central error logging未導入。console.error中心。βでの最低限の障害把握方法を別途決める必要あり。 |
| Backup | 未確認 | Production DB backupの復旧可能時点/RPO/RTOを現connectorでは未確認。 |
| Rollback | 未確認 | 現Production `dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4` は既知正常。Vercelは既存deploymentのpromote/rollback手段あり。ただし実Production rollback試験は未実施。 |
| Production deploy | FAIL | Git接続後Previewは自動作成。main push/merge時のProduction自動deploy設定をconnectorで完全取得できず、安全上auto deployの可能性ありとしてmerge禁止継続。 |
| Domain | 未確認 | 現ProductionはVercel aliasesを確認。正式custom domain最終判定は未完。 |
| SEO/noindex/index | 未確認 | PR #27でdescription/theme-color/manifest追加。canonical/robotsは正式domain確定前のため未設定。 |
| Accessibility | PASS | PR #27静的gateで全img alt必須、icon-only buttonのaccessible name必須。主要投稿/select controlsへaria-label追加。実スクリーンリーダーQAは未実施。 |
| SNS | N/A | β初期Production投稿OFF。実SNS送信なし。 |
| Admin | PASS | Production admin RPCはauth user + active user + admin_users + 第二パスワードの `admin_validate` を確認。 |
| Rate limit | FAIL | LINE authは補助in-memory 10/minのみで複数instance共有なし。汎用の永続rate-limit objectは未確認/未実装。 |
| Abuse prevention | PASS | 投稿ポイント上限、idempotency、payload mismatch拒否、所有者削除、exchange reservation/idempotency等のisolated behavior test PASS。 |

## CI

PR #27 exact HEAD `02ed000e52807f2d69614ba49aa286e92f1c3555`

- Beta Release Gate run 36495725450: PASS
- checkout SHA == event head SHA: PASS
- full `npm ci -> npm test`: PASS
- beta legacy ASP gate: PASS
- beta real-data-only ranking gate: PASS
- beta legal/runtime alignment gate: PASS
- beta accessibility static gate: PASS
- beta SEO/PWA metadata gate: PASS
- Event Site Check run 36495725451: PASS
- Cloudflare Workers Builds (michimamo-map / machiibe-preview): failure継続。mainや無関係branchでも同様に即failure、GitHub required checkではない。

## Production Edge Function findings

### β公開前に停止/保護が必要
- `poc-session`: POC function。ACTIVE。service-role admin user create/deleteを行う。auth:'secret'だがβ運用には不要。
- `machimamo-video-asset-test`: ACTIVE / verify_jwt=false / public media endpoint。
- `machimamo-video-overlay-v1`: ACTIVE / verify_jwt=false / public media endpoint。
- `machimamo-video-final-v1`: ACTIVE / verify_jwt=false / public proxy endpoint。
- `machimamo-video-download-page`: ACTIVE / verify_jwt=false / public HTML endpoint。
- `machimamo-video-save-final`: ACTIVE / verify_jwt=false / service-role / public CORS / Storage bucket create + upsert。最優先。

上記video 5 functionとpoc-sessionは、直近24hのfunction invocation 0を確認。video storage bucket/objectも0。

### verify_jwt=falseだが内部防御あり
- `line-auth`: OAuth callbackのためJWT無し。state/nonce/PKCE/short-lived code/origin checkあり。rate limiterは補助。
- `account-deletion`: Bearer user検証 + admin RPC + password。
- `camera-evidence-retention`: scheduler single-use tokenまたはBearer user。
- `aed-retention`: scheduler single-use token。
- `aed-image-check`: Bearer/internal checksあり（別途既存検証済み）。

## Merge前の必須blocker

1. Productionの不要Edge Functions停止/保護（特に `machimamo-video-save-final`）。
2. main merge時のVercel Production自動deployを停止または挙動確定。
3. PR #20 → #22 → Identity-only → PR #27 の順序を維持。
4. Production Migration / PR merge / Production deployは本人承認まで実行しない。

## 次に本人操作なしで進める項目

- Error loggingのβ最小構成をコード側で設計/準備。
- Rate limitの現行write RPCごとの既存abuse guardを棚卸し。
- Performanceの静的予算/回帰gate作成。
- PR #22 / Identity-only再構成に必要なdiffを事前整理（merge/rebase実行は順序到達後）。
- Cloudflare failureをコード起因ではない範囲まで証拠化。
