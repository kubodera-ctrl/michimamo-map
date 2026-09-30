# まちまも DRIVE Backend / Data Pipeline

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

## Fail-safe
A parse failure never makes a new broken version public.
The previous snapshot can remain only until its own event expiry.
Expired information is never extended merely because a new parse failed.

## Premium
Feature key: `police_official_info`.
Police official information is returned only by an authenticated server-side entitlement-checked RPC.
Free clients cannot retrieve the same premium geometry/time payload from a hidden endpoint.

## Nationwide audit status (2026-09-30)
- Official speed-enforcement guideline Source: 47/47 prefectures.
- Dynamic/future Source found: 35/47.
- Regular future Source not found after official-site audit: 12/47.
- At least some exact-segment candidates: 18 prefectures.
- Area-oriented sources are the current baseline in 29 prefectures.

## Production boundary
This file is design documentation only.
Do not apply a Production DB migration, enable billing, add paid APIs, or merge the DRIVE branch without the existing approval gates.
