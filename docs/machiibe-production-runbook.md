# まちイベ 本番投入ランブック

更新: 2026-09-23

## 原則

- 本番投入は **DB → noindexプレビュー → 実機 → index解放** の順。
- いきなり全国公開しない。
- 初期は verified production seed のみ。
- 候補プール `data/machiibe/candidate_events_kanto_v1.json` は直接公開しない。
- 異常時は `supabase/rollback/machiibe_v1.sql` でまちイベv1だけ戻す。

## Phase 0 — 実行前

1. GitHub Actions / CIの復旧を確認
2. Event Site Check最新HEAD success
3. Cloudflare/Vercel Previewが最新HEAD
4. `NEXT_PUBLIC_ALLOW_INDEXING=false`
5. production seed内容を再確認
6. Supabaseのバックアップ/復旧手段を確認
7. Security/Performance advisors取得

## Phase 1 — DB migration

順番を固定する。

1. `20260918235500_event_platform_foundation.sql`
2. `20260919011500_family_dining_overlay.sql`
3. `20260919043000_event_platform_admin_analytics.sql`
4. `20260923073000_event_i18n_foundation.sql`

適用後確認:

```sql
select to_regclass('public.events'),
       to_regclass('public.regional_sources'),
       to_regclass('public.event_occurrences'),
       to_regclass('public.event_site_metrics_daily');
```

RLS/権限確認:

```sql
select has_table_privilege('anon','public.events','select') as anon_events_select;
```

期待値: false

## Phase 2 — verified seed

`supabase/seeds/machiibe_initial_verified_events.sql`\n\n続けて:\n`supabase/seeds/machiibe_verified_events_batch2.sql`\n\n続けて:\n`supabase/seeds/machiibe_verified_events_batch3.sql`\n\n続けて:\n`supabase/seeds/machiibe_verified_events_batch4.sql`\n\n続けて:\n`supabase/seeds/machiibe_verified_events_batch5.sql`

確認:

```sql
select publication_status,verification_status,count(*)
from public.events
group by 1,2
order by 1,2;
```

画像確認:

```sql
select count(*) filter(where image_usage_status<>'not_used') as unexpected_images
from public.events;
```

初期seedでは期待値: 0

2026-09-23時点では initial + batch2 + batch3 + batch4 + batch5 の合計45イベントをROLLBACKトランザクションで検証済み。batch3は6件、いすみイセエビまつりの開催回12件、ドラえもんfandomを確認。batch4は5件、そごうの複合venue type、川崎みなと祭りのfamily判定、ソラマチ公式英訳の公開RPCを確認。batch5は4件、西武園SideMのfandom、amusement分類、複数店舗イベントの正規化、画像非使用、source gateまで確認済み。

## Phase 3 — noindex状態でアプリ接続

- TOP検索
- 任意日付
- 雨の日の室内遊び
- 推し活
- 無料
- accessibility
- detail
- calendar
- MAP
- 保存/予定
- admin editor
- X/TikTok

ここで1件でも重大不具合ならindex解放しない。

## Phase 4 — 候補追加

候補プールは以下の順で昇格。

1. detail_verified
2. official_list_verified → 詳細ページ確認後
3. needs_occurrence_review → 実開催日正規化後
4. discovery_only → 主催/施設公式ページ発見後

昇格条件:
- sourceがactive
- event_use_allowed確認
- title/date/venue/official_url確認
- 料金を推測しない
- indoorを推測しない
- family/child分類を推測しない
- 画像は原則not_used

目安:
- 現在のverified seed: 45件
- 60件
- 100件
- 300件
- 地域単位で全国拡大

## Phase 5 — index解放

全Round A/B/C完了後のみ:

- 独自ドメイン確定
- canonical確認
- Search Console登録
- sitemap送信
- `NEXT_PUBLIC_ALLOW_INDEXING=true`

解放直後24時間は:
- 404
- 5xx
- Supabase RPC errors
- source freshness
- 訂正依頼
を優先監視。

## Rollback条件

以下は即時rollback候補:
- 既存まちまもDB/機能への影響
- RLS/権限漏れ
- service_role露出
- 誤った大量公開
- migration不整合で更新不能

まちイベv1専用:
`supabase/rollback/machiibe_v1.sql`

rollback後:
1. 対象table/function消失確認
2. 既存まちまも主要機能確認
3. 原因修正
4. Round Aから再開
