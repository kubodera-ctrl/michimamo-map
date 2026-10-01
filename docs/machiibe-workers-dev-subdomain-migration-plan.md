# まちイベ workers.dev account subdomain 変更前監査

更新: 2026-09-28
対象branch: feature/machimamo-events-foundation
変更前account subdomain: kubodera
希望account subdomain: sumion
状態: 準備のみ。Cloudflare account subdomain変更 / Worker rename / Production公開変更は未実施。

## 1. 希望URL

Preview:
- https://machiibe-preview.sumion.workers.dev

β / Production候補:
- https://machiibe.sumion.workers.dev

Cloudflare Workersのworkers.dev URLは
`<WORKER_NAME>.<ACCOUNT_SUBDOMAIN>.workers.dev`
で構成される。

したがって:
- 既存 `machiibe-preview` Workerはaccount subdomain変更後に `machiibe-preview.sumion.workers.dev`
- β用は別Worker `machiibe` を新設して `machiibe.sumion.workers.dev`

とする。

既存 `machiibe-preview` をrenameしてβ用へ転用しない。Previewとβ/Productionを別Worker境界として維持する。

## 2. repository全体監査結果

CI #545のcheckout済みrepository全体監査:
- 対象text files: 1,455
- 実行コード/設定の `kubodera.workers.dev` exact参照: 2件
- 実行コード/設定の workers.dev hostname参照: 2件
- 未知の旧account subdomain実行参照: 0件
- 本手順書内の旧URL記載は説明用documentation参照としてguard対象外

### exact参照 1
`event-site/wrangler.jsonc:17`

現在:
`NEXT_PUBLIC_SITE_URL=https://machiibe-preview.kubodera.workers.dev`

切替後候補:
`NEXT_PUBLIC_SITE_URL=https://machiibe-preview.sumion.workers.dev`

役割:
canonical / metadataBase / siteUrl等の公開base URL。

### exact参照 2
`cloudflare/machiibe-pipeline/src/index.ts:95`

現在:
`MachiibeBot/1.0 (+https://machiibe-preview.kubodera.workers.dev/partners)`

切替後候補:
`MachiibeBot/1.0 (+https://machiibe-preview.sumion.workers.dev/partners)`

役割:
自動取得時User-Agentの連絡・説明URL。

## 3. Worker影響一覧

### machiibe-preview
確認済みlive Worker。
現在のCloudflare Git deployment対象。
account subdomain変更でworkers.dev hostnameが変わる。
コード側のNEXT_PUBLIC_SITE_URL切替が必要。

### michimamo-map
Cloudflare Git integrationのbot履歴で存在確認。
同じCloudflare account subdomainを利用している場合、workers.dev hostnameもkubodera→sumionへ変わる。
repo内に `*.kubodera.workers.dev` の直接参照はない。
Production利用URLがVercel/custom domain中心なら直接影響は限定的だが、Cloudflare Dashboard上のWorker URL / Preview URL / Version URLは確認対象。

### machiibe-pipeline
Wrangler設定上のWorker名として存在。
live resource作成状態は未確認。
workers_dev=trueのため、liveであればaccount subdomain変更後に
`machiibe-pipeline.sumion.workers.dev`
へ変わる。
外部から直接叩く設計ではなく、内部token付きenqueue/health用途。
`PRODUCTION_CALLBACK_URL` はenvで与えるため、値が旧workers.dev hostなら切替が必要。

## 4. CORS影響

repository監査では旧 `kubodera.workers.dev` を許可originに持つCORS実装は0件。

確認された関連:
- `supabase/functions/camera-evidence-retention/index.ts`
  - allow origin = `https://machimamo-map.vercel.app`
  - workers.dev変更による直接影響なし
- `supabase/functions/wbgt/index.ts`
  - `Access-Control-Allow-Origin: *`
  - workers.dev変更による直接影響なし

ただしCloudflare Dashboard / 外部SaaS側のCORS allowlistはrepositoryから確認できないため、切替直前に別途確認する。

## 5. callback / webhook影響

repositoryで変更候補として確認:
- `PRODUCTION_CALLBACK_URL`
  - `cloudflare/machiibe-pipeline` がProduction renderer callbackに使用
  - URL値はrepositoryに固定されていない
  - Dashboard env / secret側の実値確認が必要
  - 旧kubodera hostならsumionへ切替

LINE callbackのコードコメントは存在するが、repository内にkubodera.workers.devのLINE redirect/callback URL固定値はない。

旧workers.dev URLを含むWebhook固定値はrepository監査では確認されなかった。

## 6. Cloudflare Access影響

repository内にCloudflare Access application hostnameの設定は確認されなかった。

Cloudflare AccessはWorker単位保護とhostname単位保護の両方が可能。
hostname単位で
`*.kubodera.workers.dev`
を登録している場合は切替が必要。

Dashboard状態はrepository/Drive/Gmailから確定できないため、account subdomain変更直前の本人確認項目とする。

## 7. Search Console影響

repositoryには
- 本番ドメイン確定後にSearch Console登録
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- index解放前にcanonical/Search Console確認

の設計がある。

現在接続済み資料・Gmailから
`machiibe-preview.kubodera.workers.dev`
をSearch Consoleへ登録済みという証跡は確認できなかった。

ただしSearch Console実アカウント状態は未確認。
workers.dev Previewを正式SEO URLとして扱わず、正式独自ドメイン確定後にSearch Consoleを設定する方針を維持する。

## 8. 外部登録URL影響

接続済みGmail:
- kubodera.workers.dev exact hit 0件

Google Drive:
- 旧URLはまちイベCURRENT進捗資料内にのみ確認
- ASP2はまちイベ正式媒体URL未登録のため、現時点で旧workers.devから変更するASP媒体登録なし

外部サービスのDashboard内だけに保存されているURLは検索対象外。
切替時にCloudflare Access / OAuth redirect / Webhook / ASP媒体 / Search Consoleをチェックする。

## 9. Preview / β Worker分離構成

採用:
- persistent Preview Worker: `machiibe-preview`
- β / Production候補 Worker: `machiibe`

account subdomainがsumionになった場合:
- `machiibe-preview.sumion.workers.dev`
- `machiibe.sumion.workers.dev`

Preview WorkerをrenameしてProductionへ転用しない。
Workerごとにvars / secrets / bindings / deployment historyを分離する。

注意:
Cloudflare Wrangler environmentsは別Workerを作成できるが、通常は名称suffixが付く。
今回の希望hostnameを厳密に維持するため、`machiibe-preview` と `machiibe` を明示的なWorker名として管理する方針を優先する。

## 10. account subdomain変更前後の手順

本人が `sumion` 利用可能を確認するまではStep 0で停止。

### Step 0 本人確認
Cloudflare Dashboard > Workers & Pages > Your subdomain > Change
`sumion` が利用可能か確認。
保存/変更はまだ押さない。

### Step 1 旧URL最終棚卸し
- full repo auditを再実行
- Drive/Gmail exact search
- Cloudflare Access applications
- Workers Domains & Routes
- env `PRODUCTION_CALLBACK_URL`
- OAuth redirect/callback
- Webhook
- Search Console
- ASP媒体登録URL
- 外部監視/ヘルスチェック

### Step 2 コード側URL切替準備
同一commitで最低2件を変更:
- `NEXT_PUBLIC_SITE_URL`
- MachiibeBot User-Agent URL

変更先はPreview:
`https://machiibe-preview.sumion.workers.dev`

### Step 3 Cloudflare account subdomain変更
本人操作。
`kubodera` → `sumion`

この時点でaccount配下のworkers.dev URL / Version URL / Preview URLが影響対象。

### Step 4 Preview再deploy
Worker名:
`machiibe-preview`

期待URL:
`https://machiibe-preview.sumion.workers.dev`

commit SHAとDeployment IDを確認。

### Step 5 PC回帰
- root 200
- robots / X-Robots noindex
- canonical / metadataBaseがsumion URL
- TOP
- search
- event detail
- policies
- admin login
- synthetic Golden fixture
- manifest
- API same-origin
- machimamo MAP deeplink
- ASP 0件 fail-closed
- pipeline callback未設定時fail-closed
- console/network重大error 0

### Step 6 iPhone回帰
Safari通常 / Private:
- viewport
- PC表示化なし
- 過剰zoomなし
- TOP/search/detail
- filters
- saved/plan
- admin必要箇所
- synthetic Golden preview
- external links
- noindex

### Step 7 β Worker用意
Preview回帰PASS後のみ、別Worker:
`machiibe`

期待URL:
`https://machiibe.sumion.workers.dev`

初期は:
- noindex
- Production DB未接続または安全なβ接続
- ASP媒体登録なし
- OAuthなし
- SNS実投稿なし

## 11. 切替後追加回帰

### URL
- repository `kubodera.workers.dev` exact 0件
- HTML canonicalにkubodera 0件
- sitemap/robots/OG/Twitter URL
- structured data URL
- redirect loopなし

### Cloudflare
- machiibe-preview Worker名不変
- preview deployment成功
- Version/Deployment URLがsumion subdomain
- Access policy確認
- vars / secrets / bindings欠落なし
- R2 / Queue bindingは作成前なら未作成状態を維持

### Callback/CORS
- PRODUCTION_CALLBACK_URLの実値
- same-origin admin API
- CORS allowlist
- LINE callback
- webhook URL
- health monitor

### SEO
- noindex維持
- Search Consoleは正式独自ドメインまで保留
- index解放しない

## 12. 今回実行しない

- Cloudflare account subdomain変更
- Worker rename
- machiibe Worker新規Production公開
- sumion.net DNS / nameserver変更
- 新規domain購入
- Production DB Migration
- 45件seed本番投入
- OAuth
- API課金/契約
- 実SNS投稿
- index解放

## 13. blocker

唯一の次判断:
`sumion` account subdomainがCloudflare Dashboardで利用可能か。

これは本人操作でのみ最終確認する。
