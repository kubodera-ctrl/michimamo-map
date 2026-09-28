# ASP Runtime Master Import v1

Google Sheets `まちまも・まちイベ ASP案件マスター` remains the business master owned by ASP2. This repository defines the runtime contract; it must not write back to or overwrite the sheet.

## Import contract

The admin panel accepts a JSON array derived from the latest master. `source_master_updated_at` is the spreadsheet's modified timestamp. `offer_id` is deterministic and is never a display name:

```json
[
  {
    "offer_id": "ofr_000002",
    "source_record_id": "master-row-number",
    "asp": "a8",
    "program_id": "program-id-from-master",
    "advertiser_name": "Advertiser",
    "offer_name": "Program name",
    "category": "Category",
    "media_type": "Web",
    "approval_status": "approved",
    "automation_level": "X",
    "services": {
      "machimamo": {
        "source_listing_allowed": true,
        "source_media_approved": true,
        "production_listing_approved": false,
        "web_approval_status": "approved",
        "app_approval_status": "unknown",
        "sns_approval_status": "unknown",
        "line_approval_status": "unknown",
        "tracking_url": "https://approved-asp-tracking.example/path?original=query",
        "creative_type": "image",
        "creative_url": "https://approved-asp-creative.example/banner.png",
        "impression_tracking_url": "https://approved-asp-tracking.example/impression.gif?original=query",
        "point_reward_allowed": false,
        "reward_rule_confirmed": false,
        "reward_rule": {},
        "last_verified_at": "2026-09-25T00:00:00Z"
      }
    }
  }
]
```

This is a shape example only. Do not use its example hostnames as real links.

## Mapping from the current Sheets master

- `offer_id`: copy the stable `offer_id` column from the current master unchanged (for example `ofr_000002`). It is the Runtime primary key; do not replace it with the display name, sheet row number, or a synthesized key.
- `asp` and `program_id`: copy the provider identifier and actual program ID columns. `program_id` is unique with `asp`, but is not a replacement for the master `offer_id`.
- `source_record_id`: optional sheet row/management number for traceability; never use it as the primary key.
- `approval_status`: provider partnership state. `approved` only for explicit approval; map review/pending/unknown to their non-publishable equivalents.
- `source_listing_allowed`: `まちまも掲載` is explicitly `○`.
- `source_media_approved`: provider account and the registered まちまも media are confirmed for this offer.
- `production_listing_approved`: copy the explicit `本番掲載可否` decision from `本番掲載準備`. Leave false for `掲載不可`, missing, or unresolved. The independent gate prevents an approved registered website link from being used before the live production origin and placement conditions are confirmed.
- `web_approval_status`: registered website/media is explicitly allowed. `SNS掲載`, `アプリ掲載`, and `LINE掲載` remain separate; unknown does not inherit Web approval.
- `tracking_url`: copy the exact href issued for the registered まちまも media. Do not normalize, shorten, append parameters, or use the まちイベ URL.
- `creative_url` and `impression_tracking_url`: parse the official tag into the image src and the 1x1 tracking URL. Never pass the complete HTML tag into Runtime Master.
- `point_reward_allowed`: only explicit ASP/advertiser permission. Unknown/NG is false. Set `reward_rule_confirmed` only when the user-facing conditions and amount/rate have been settled; otherwise no reward is exposed.
- `automation_level`: copy the current ASP2 master value (`A/B/C/D/X`).
- Do not import source HTML, scripts, iframe, arbitrary attributes, or customer information.

## Fail-closed behavior

Import upserts source facts but does not enable publication or placements. The existing admin-controlled `publish_status`, listing flag, and placement controls remain unchanged. The public read RPC only returns a row when partnership, service listing permission, service media approval, explicit production listing approval, Web channel approval, exact tracking URL, active status, enabled placement, and dates all pass. If present, the approved impression tracking URL is returned as a separate HTTPS field; the HTML tag is never inserted.

Point reward data must include explicit permission, a confirmed rule, at least an amount or rate, and a non-empty structured rule object. Creative types are restricted to text/image. Point reward is a second gate: only `point_reward_allowed AND reward_rule_confirmed` is exposed. A normal PR offer may be published without points when all advertising gates pass; the response then contains no reward amount/rate or reward rule.

Click recording is separate from navigation. It creates an internal `click_id`, records offer, service, placement, signed-in user or anonymous session, timestamp and source screen, while the browser opens the unchanged ASP tracking URL directly. Failure to record a click must not stop the outbound navigation. Automated tests must never click a real tracking URL.

## Current master findings (read-only)

The sheet currently contains media-specific website and tag data, but approval for App/SNS/LINE is not implied by Web approval. The current `本番掲載準備` sheet lists the two Lepton records as `掲載不可` because production URL/Web-PWA-app conditions and final placements remain unconfirmed. Lepton Bridge (`ofr_000002`) also has points explicitly NG. Those rows may be synchronized as drafts using their stable IDs and exact mM tracking URLs, but must remain unpublished and non-point-bearing until ASP2 updates the source approval fields. Never reuse the mM link for mI. Current runtime has no ASP tables in production; this migration is on a Draft PR and has not been applied.

## Discovery metadata / filter & sort contract

User-facing discovery is a projection of publishable Runtime rows, not a second business master. Google Sheets ASP2 CURRENT remains authoritative. Unknown values remain NULL/absent and do not participate in labels, filters, or numeric/date sorts.

New nullable Runtime metadata:
- `media_conditions_verified`: exact media/channel conditions were checked. Required for public RPC.
- `link_verified`: exact approved tracking link was verified against the source. Required for public RPC.
- `reward_permission`: `allowed | denied | unknown`. Reward display requires `allowed`.
- `reward_enabled`: business decision from ASP2. Must remain false unless permission/rule/value gates pass.
- `reward_fixed_points`: confirmed user-facing integer points only. Do not derive from ASP commission.
- `action_type`: `free_registration | app_install | document_request | bank_account_opening | purchase | service_contract | reservation | application | other`.
- `cost_type`: `free | paid` only when source-backed.
- `purchase_required`: boolean only when source-backed or deterministically implied by a confirmed non-purchase action.
- `estimated_available_days`: points becoming available, not ASP occurrence/approval timing. Store only an explicit numeric estimate; otherwise NULL.
- `source_added_at`: actual source/master added date only. Do not use Runtime import time as “new”.
- `recommendation_rank`: optional source/admin-curated order. It is not exposed as a score and must not be synthesized from payout alone.
- `recommendation_note`: source-backed explanation.
- `conversion_conditions`: user-facing confirmed success conditions.

Discovery filters:
- all
- fast: only rows with a confirmed `estimated_available_days`; display sorted early-to-late when that sort is selected. No arbitrary day estimate is invented.
- high_points: only rows with visible confirmed fixed points.
- easy: deterministic action types `free_registration/app_install/document_request`.
- free: `cost_type=free`.
- no_purchase: `purchase_required=false` (or deterministic confirmed non-purchase action).
- recommended: only rows with explicit `recommendation_rank`.
- new: only rows with explicit `source_added_at`.

Sort options are recommended, points high/low, availability early/late, added new/old. Popular is a future contract using actual recorded usage only and is not shown unless explicitly enabled and real positive usage exists.

The public RPC still requires partnership approval, source listing permission, media approval, production listing approval, `media_conditions_verified=true`, `link_verified=true`, Web approval, exact tracking URL, Runtime active/listing enabled, approved placement enabled, and service/placement validity windows. Reward fields are nulled unless reward permission and reward gates pass.

