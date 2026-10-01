# Machiibe Pipeline Worker

GitHub / GitHub Actions に依存せず、Cloudflare Workers + Queues + R2 + Supabase で収集・Productionを継続するための独立Worker。

## Bindings

- R2: `MEDIA_BUCKET` → `machiibe-media`
- Queue: `machiibe-ingest` → DLQ `machiibe-ingest-dlq`
- Queue: `machiibe-production` → DLQ `machiibe-production-dlq`

Cloudflare Queuesのconsumerは3回失敗後にDLQへ送る。

## Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_ENQUEUE_TOKEN`
- `PRODUCTION_CALLBACK_URL`（Production renderer接続後）

ブラウザへservice roleを公開しない。

## Ingest gate

Workerは `regional_sources.automated_fetch_allowed=true` かつ
`terms_review_status=reviewed_allowed` の情報源だけ自動取得する。
`reviewed_facts_only` / `contact_required` はQueue投入されても取得せずfailedにする。

取得rawはR2へ保存し、sha256 / source / fetchedAtをDBへ記録する。
正規化・重複判定・会場・カテゴリ・翻訳は後段処理。

## Cost / deploy gate

このディレクトリはdeploy-readyな構成だが、R2 bucket/Queuesの実作成はCloudflare側リソース作成を伴う。
新規課金可能性があるため、アカウント上の料金条件と利用枠確認前には本番resourceを作成しない。
