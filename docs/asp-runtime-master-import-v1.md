# ASP Runtime Master Import v1

Google Sheets `まちまも・まちイベ ASP案件マスター` remains the business master owned by ASP2. This repository defines the runtime contract; it must not write back to or overwrite the sheet.

## Import contract

The admin panel accepts a JSON array derived from the latest master. `source_master_updated_at` is the spreadsheet's modified timestamp. `offer_id` is deterministic and is never a display name:

```json
[
  {
    "offer_id": "A8.net:program-id-from-master",
    "source_record_id": "master-row-number",
    "asp": "A8.net",
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

- `asp` and `program_id`: ASP + the actual program identifier, not the sheet row number. Use the program ID recorded in the sheet or provider's program details. Do not import a row whose stable program ID is unresolved.
- `source_record_id`: sheet management number for traceability; never use it as the primary key.
- `approval_status`: provider partnership state. `approved` only for explicit approval; map review/pending/unknown to their non-publishable equivalents.
- `source_listing_allowed`: `まちまも掲載` is explicitly `○`.
- `source_media_approved`: provider account and the registered まちまも media are confirmed for this offer.
- `web_approval_status`: registered website/media is explicitly allowed. `SNS掲載`, `アプリ掲載`, and `LINE掲載` remain separate; unknown does not inherit Web approval.
- `tracking_url`: copy the exact href issued for the registered まちまも media. Do not normalize, shorten, append parameters, or use the まちイベ URL.
- `creative_url` and `impression_tracking_url`: parse the official tag into the image src and the 1x1 tracking URL. Never pass the complete HTML tag into Runtime Master.
- `point_reward_allowed`: only explicit ASP/advertiser permission. Unknown/NG is false. Set `reward_rule_confirmed` only when the user-facing conditions and amount/rate have been settled; otherwise no reward is exposed.
- `automation_level`: copy the current ASP2 master value (`A/B/C/D/X`).
- Do not import source HTML, scripts, iframe, arbitrary attributes, or customer information.

## Fail-closed behavior

Import upserts source facts but does not enable publication or placements. The existing admin-controlled `publish_status`, listing flag, and placement controls remain unchanged. The public read RPC only returns a row when partnership, service listing permission, service media approval, Web channel approval, exact tracking URL, active status, enabled placement, and dates all pass.

Point reward is a second gate: only `point_reward_allowed AND reward_rule_confirmed` is exposed. A normal PR offer may be published without points when all advertising gates pass; the response then contains no reward amount/rate or reward rule.

Click recording is separate from navigation. It creates an internal `click_id`, records offer, service, placement, signed-in user or anonymous session, timestamp and source screen, while the browser opens the unchanged ASP tracking URL directly. Failure to record a click must not stop the outbound navigation. Automated tests must never click a real tracking URL.

## Current master findings (read-only)

The sheet currently contains media-specific website and tag data, but approval for App/SNS/LINE is not implied by Web approval. For example, the Lepton Bridge record is approved for the registered A8 website and has a まちまも tracking link/tag, while point reward is explicitly NG and App/SNS/LINE placement remains unconfirmed. It must therefore stay non-point-bearing and must not be used on unconfirmed channels. Current runtime has no ASP tables yet; this migration is pending branch/Preview review and has not been applied to production Supabase.
