# まちドラ（まちDRIVE） Backend / Data Pipeline

Status: design-current / no Production migration

## Reuse from existing machimamo
- Supabase as the common backend.
- Source registry -> import batch -> source record -> provenance pattern from the AED foundation.
- Public clients consume scoped RPCs instead of internal ingestion tables.
- RLS/revoke, admin audit, fail-closed publication and rollback-minded batch history.

## DRIVE improvements
1. Keep source registry and ingestion internals in `app_private` by default.
2. Separate lightweight `fetch_runs` from content-changing `source_versions`.
3. Use ETag / Last-Modified / SHA-256 to avoid reparsing unchanged PDFs/HTML/CSV.
4. Track Source freshness separately from data precision.
5. Store discovery audits, including `NOT_FOUND_AFTER_OFFICIAL_SITE_AUDIT`.
6. Make geo/time precision event-level, never prefecture-level.
7. Publish only validated current events into a public snapshot.
8. Schedule by per-Source `next_check_at`, with jitter, instead of many fixed Crons.
9. Version parsers per Source so one layout change cannot break the country.
10. Premium entitlement is checked server-side.

## Core internal tables
- `app_private.enforcement_sources`
- `app_private.enforcement_fetch_runs`
- `app_private.enforcement_source_versions`
- `app_private.enforcement_source_records`
- `app_private.enforcement_events`
- `app_private.enforcement_field_provenance`

## Public / app-facing data
- `public.drive_road_geometries`: verified LineString / Polygon only.
- `public.drive_enforcement_public_snapshot`: current validated publishable rows.
- RPC candidates:
  - `get_drive_safety_in_view`
  - `get_drive_route_alerts`
  - `get_drive_premium_enforcement`
  - `get_drive_source_attribution`
  - `get_drive_update_status`

## Publication gate
An enforcement event is publishable only when:
- source is active;
- terms gate allows the ingestion path;
- source freshness is CURRENT;
- parser/validation passed;
- event has not expired;
- geo/time precision matches the selected display mode;
- source verification is within the Source-specific freshness policy.

## Geo contract
- EXACT_SEGMENT -> resolve official start/end to the real road network, then verify.
- ROAD_AREA -> do not invent start/end; render road-area/region semantics.
- LOCALITY -> locality halo/card.
- PREFECTURE/NONE -> card only.
- Hand-drawn guessed LineStrings are prohibited.
- `endpointVerified=true` and `routeMatchTokens` only authorize routing candidates; they do not make geometry VERIFIED.
- `geometryVerified=true` requires endpoint evidence, road-name match, routing result and road/visual QA.

## Scheduler
One small scheduler claims due Sources by `next_check_at`.
Flow:
claim -> terms/robots gate -> conditional GET -> hash -> version only if changed ->
parse -> validate -> normalize -> diff -> geometry -> publish gate -> snapshot -> next_check_at.

Poll profiles are defined in the Drive Source Registry:
DAILY_NEXTDAY, WEEKLY_FRIDAY, ROLLING_10DAY, HALF_MONTH,
OPEN_DATA_HALF_MONTH, MONTHLY_BOUNDARY, MONTHLY_ADVANCE, MONTHLY_SPOT,
HALF_YEAR, ANNUAL_CHANGE_DETECT, HTML_CHANGE_DETECT, HALF_MONTH_SPOT,
AD_HOC_SPOT, PREFECTURE_POLICY, SOURCE_STALE_AWARE.

## Nationwide parser rollout contract
Do not implement all 47 prefectures as one parser. Expand by representative Source type first.

The representative matrix is `data/drive/national-parser-representatives-v1.json`.
Current type coverage intentionally distinguishes implementation from discovery:
- PDF: existing Tokyo/Chiba/Saitama contracts exercise exact, area and focus semantics.
- HTML: existing Kanagawa and Tokyo monthly contracts exercise mixed exact/area and policy/date semantics.
- CSV / structured data: Oita publishes machine-readable CSV; a generic structured adapter is tested only with synthetic contract rows until the current official CSV header schema is bound and verified.
- WebMap / dynamic provider: Okayama remains `DYNAMIC_PROVIDER_GATE`; rendered-map scraping is prohibited until an official/approved API or data interface, schema, terms and use conditions are validated.
- Weekly / half-month / monthly / annual / half-year cadence families are represented before broad rollout.

Every completed parser path must preserve:
Source -> Source Version -> Source Record -> Normalized Common Event -> Provenance ->
Geometry precision -> Time precision -> Freshness -> Publish gate.

Lineage rules:
- `sourceRecordKey` always points back to the official row/record.
- `sourceSubrecordKey` preserves one-row-to-many-event splits.
- `sourceVersionDate` is present in the common schema but remains NULL when the official version date cannot be verified.
- `sourceIndexUrl` preserves current-source resolution / attribution where available.
- `geometry.routeMatchTokens` is routing validation metadata, never proof of verified geometry.

`scripts/drive_parser_trace.mjs` provides a testable staging trace for this chain.
It separates event-fact publication from precise LineString publication so a valid ROAD_AREA/LOCALITY fact is not lost merely because exact geometry is unavailable.

## Fail-safe
A parse failure never makes a new broken version public.
The previous snapshot can remain only until its own event expiry.
Expired information is never extended merely because a new parse failed.
A dynamic provider with unknown API/schema/terms must fail closed rather than scrape rendered UI.
A machine-readable Source with unknown current header binding remains schema-pending rather than receiving guessed columns.

## Premium
Feature key: `police_official_info`.
Police official information is returned only by an authenticated server-side entitlement-checked RPC.
Free clients cannot retrieve the same premium geometry/time payload from a hidden endpoint.

Non-Production entitlement contract:
- authenticated identity must come from verified server-side auth context; client flags never grant access;
- grants are matched by user + feature key and must be ACTIVE and unexpired;
- Production accepts only server-owned grant records;
- TEST_GRANT is allowed only when explicitly enabled in non-Production and is rejected in Production;
- unknown feature/status/source, missing auth, missing grant and expired grant all fail closed;
- Store Billing connection state never grants Premium by itself;
- while Store Billing is disconnected, locked UI remains fail-closed and Premium data is not requested.

The executable contract lives in `scripts/drive_premium_entitlement.mjs` with `tests/drive_premium_entitlement.test.mjs`.
It is a Preview/test boundary only and does not authorize a Production migration or real billing.

## Nationwide audit status (2026-09-30)
- Official speed-enforcement guideline Source: 47/47 prefectures.
- Dynamic/future Source found: 35/47.
- Regular future Source not found after official-site audit: 12/47.
- At least some exact-segment candidates: 18 prefectures.
- Area-oriented sources are the current baseline in 29 prefectures.

## Production boundary
This file is design documentation only.
Do not apply a Production DB migration, enable billing, add paid APIs, or merge the DRIVE branch without the existing approval gates.
