# まちイベ 全国イベント収集基盤 v1

更新: 2026-09-28
branch: feat/machiibe-national-ingestion-foundation
状態: Preview/dry-run設計。Production投入禁止。

## 1. Pipeline

SOURCE
→ FETCH
→ NORMALIZE
→ DEDUP
→ VERIFY
→ EVENT
→ SEARCH
→ EXPIRE / UPDATE

原則:
- 公式 / Open Data / API / RSS / ICS / JSON-LDを優先。
- 検索エンジン結果や第三者イベントサイトを無差別scrapingしない。
- robots / 利用規約 / 商用利用 / attributionをSource Registryで明示する。
- 未確認値をAIや文字列推測でcanonical factへ確定しない。
- 画像権利はdisplay/cache/SNS/commercialを分離する。
- Production大量投入は本人QA後の別Gate。

## 2. Source Registry mapping

既存 public.regional_sources を正本として拡張する。似た第二マスターを作らない。

要求名 → 現行/拡張:
- source_id → id
- source_name → name
- source_type → source_kind
- prefecture / municipality → 同名
- base_url → homepage_url
- feed_url → data_url
- terms_status → terms_review_status
- failure_count → consecutive_failures
- active → is_active
- fetch_method → 今回追加
- robots_status → 今回追加
- commercial_use_status → 今回追加
- attribution_requirement → 今回追加
- update_frequency → update_frequency_minutesを追加
- last_checked_at → 今回追加
- last_success_at → 既存
- priority → 今回追加
- ETag / Last-Modified → source_etag / source_last_modifiedを追加

Secrets / token / passwordはRegistryに保存しない。

## 3. Adapter boundary

shared/machiibe-ingestion/contracts.ts をUI非依存の契約とする。

Adapter:
- OPEN_DATA
- RSS
- ICS
- JSON_API
- JSON_LD
- HTML_STRUCTURED
- MANUAL

fetch計画・raw抽出・normalizeをsource adapterへ分離し、events schemaへsource固有ロジックを埋め込まない。
自動fetchは reviewed_allowed + robots許可 + commercial disallowedでない + automated_fetch_allowed の全条件でのみ許可する。

## 4. Canonical Event mapping

現行 public.events を壊さず利用する。

- event_id → events.id
- source_id → events.source_id
- source_event_id → source_event_key / event_source_records
- source_url → source_page_url
- source_updated_at → source_updated_at
- source_hash → event_source_records.raw_hash
- title / description → title / summary
- start_at / end_at → start_date,start_time,end_date,end_time,timezone
- prefecture / municipality / address / lat / lng → 既存位置フィールド
- venue_name / venue_type → venue_name / venue_type_keys
- category / tags → category_keys +将来tag layer
- age_min / age_max → 未確認時null。現行age_group_keysと併用し、推測変換しない
- family / child_focused → audience_intent_verified=trueの時だけ意味を持つ
- indoor → indoor
- rain_ok → 現行に確定列なし。source fact取得までは推測しない
- accessibility → accessibility_keys/notes
- price_type / min / max → price_type + price_text。金額min/maxはsourceに構造化値がある場合のみ将来追加
- image_url / rights → image_url + granular rights flags
- official_url → official_url
- verified_at → last_verified_at
- expires_at → expires_at
- status → event_status / publication_status

## 5. Dedup

単純title一致でmergeしない。

signals:
- source_event_id
- official_url
- normalized title similarity
- venue similarity
- start/end overlap
- municipality
- distance
- organizer similarity

confidenceが十分高い候補だけ自動処理対象にできるが、初期は conservative。
shared contractの duplicateReviewRequired は0.97未満をreviewへ回す。
machiibe_duplicate_candidatesでsignalsと判断を監査可能にする。

## 6. Update / cancel / expire

source_hash差分を基本に:
- content_changed
- date_changed
- venue_changed
- price_changed
- cancelled
- postponed
- expired
- restored

をmachiibe_event_change_logへ記録可能にする。
終了イベントは検索RPCの日時条件とexpires_atで除外し、監査metadataは保持。

## 7. Freshness

Sourceごとにupdate_frequency_minutes。
当日/翌日系は短く、数か月先は長く設定可能。
ETag / Last-Modifiedがあるsourceはconditional requestを優先。
304 Not Modified時はrawの重複保存を避ける。
失敗時はbackoffし、consecutive_failuresとstale状態を管理する。

## 8. Search scale

Production検索はDB/API側filter + pagination/cursorを維持。
全イベントをクライアントへ配らない。
初期はPostgres:
- date range
- prefecture / municipality
- category / price / indoor / audience / age / venue
- FTS
- pg_trgm候補
- lat/lng将来地理検索

専用検索サービスは実測で必要になった場合だけ。

## 9. Inventory current

既存:
- Kanto concrete registry: 26 sources (Tokyo 8 / Kanagawa 6 / Chiba 6 / Saitama 6)
- National venue discovery series: 12

今回追加research:
- Digital Agency municipal ODS event standard
- Digital Agency municipality open-data registry
- Tokyo Open Data: Minato/Koto/Chuo/Itabashi event CSV candidates
- Kanagawa CKAN catalog API

Inventory/discovery候補総数: 45。
ただし「47都道府県のイベントfeed確認済み」ではない。
現在の具体的event-source prefecture coverageは4/47。
デジタル庁の自治体一覧をsource-of-sourcesとして47都道府県の探索経路を作り、各自治体datasetのlicense/更新/実在を個別に確認する。

## 10. Rollout

Phase 1:
Tokyo + nearby prefectures, official/open-data, hundreds→thousands.

Phase 2:
47 prefectures source registry discovery/compliance.

Phase 3:
major municipalities / facilities / malls.

Phase 4:
organizer direct registration + external provider if ROI supports it.

Quality before count:
accuracy / freshness / rights / duplicate rate / search UX.

## 11. KPI

将来管理OSへ:
- active_events
- new_events
- updated_events
- expired_events
- cancelled_events
- duplicate_candidates
- source_success_rate
- source_failure_rate
- stale_sources
- rights_unknown
- image_rights_unknown

UIへ密結合せずSource Registry / ingestion health / duplicate review / rights review / event approval APIを分離する。

## 12. No Production

このbranchで許可:
Source Registry schema / adapter contract / dry-run / normalize / dedup / validation / Preview search.

禁止:
Production migration / bulk seed / actual R2 resource / paid provider contract / OAuth / index release / real SNS post.
