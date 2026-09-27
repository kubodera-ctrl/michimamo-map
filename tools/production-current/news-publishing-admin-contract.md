# News Production / Publishing admin contract (P4/P5, implementation pending)

This is separate from the legacy user-post social asset flow. Do not repurpose or remove that legacy flow.

## Current code inventory

| Surface | Current identifiers/actions | Classification | Current capability |
|---|---|---|---|
| Admin social area | `#adminSocialPostArea`, rendered by `renderAdminSocialPosts()` | Legacy user-post assets | Lists recent public `spots`; no Production/QC/revision lifecycle |
| TikTok PNG modal | `#adminSocialAssetModal`, `#adminSocialAssetBody`, `#adminSocialCanvas`; `openAdminTikTokAsset(id)` | Legacy user-post assets | Deterministic 1080x1920 PNG, caption editing/copy, PNG download; scroll-safe legacy modal |
| X compose action | `openAdminXPost(id)` and modal `shareAdminSocialAssetToX()` | Legacy user-post assets | Opens `twitter.com/intent/tweet`; not API publishing and not confirmed-post state |
| Public share | `shareSpot()` / `shareToSNS()` | Legacy user-post/general sharing | Browser share or X/LINE intent; no admin publisher |
| New news SINGLE | No route, component, API, production record, or posting state found | New feature | Not implemented |
| New news WEEKLY | No route, component, API, weekly set, or posting state found | New feature | Not implemented |
| Production rendering | Current P4 branch contains `timeline.cjs`, input provenance validator, and tests | Production engine | Timeline/input gates only; no renderer, final MP4, QC, approval or media record yet |
| X/TikTok publishing API | No X or TikTok publishing endpoint/adapter found in current app | Publishing | Not connected; do not call existing intent/PNG export “published” |

## Production type labels

- `SINGLE` is displayed as **TikTok SHORT / SINGLE · 43秒**. It remains 43 seconds: TOP 3, MAP 7, NEWS 12, MAP explanation 8, logic 8, END 5.
- `WEEKLY` is displayed as **TikTok LONG / WEEKLY · CURRENT尺**. Duration remains `38 + 12 * ceil(actualNewsCount / 3)`. Admin presets: 6 / 9 / 12 actual verified stories. A last page of 1–2 stories still occupies 12 seconds. No invented filler and no new single-story long duration.
- In the CURRENT input schema, the formal modes stay `SINGLE` / `WEEKLY`; SHORT/LONG are admin-facing labels only.

## SINGLE screen requirements

Independent `ニュース投稿管理` > `単体ニュース / SHORT` section. List title, region, prefecture, municipality, news date, source, verified-facts gate, rights gate, render state, QC, admin approval, X state, TikTok state, posted time, and actions. Actions are Preview, X, TikTok. Use only the approved 43-second SINGLE final MP4. X and TikTok have separate status; both complete = 済, one complete = 一部済.

## WEEKLY screen requirements

Independent `ウィークリー投稿 / TikTok LONG` section. Required week and one of 47 prefectures. Then show eligible actual news, allow review/selection, and choose 6/9/12 (default 6). Never synthesize missing stories. Flow: candidates → selection → render → QC → approval → TikTok preview → explicit post → final TikTok status check. Weekly posting currently targets TikTok only. State key is week-start + prefecture.

## Source identity

News `sourceType` is distinct from anomaly subtype:

- `LOCAL_ANOMALY`: user/community post; not official police content.
- `POLICE_OFFICIAL`: verified public-source record; HTTPS source and rights evidence required.

The user anomaly value `police_safety` is under `spots.category=local_anomaly` and is presented as “利用者投稿 · 地域の異変（警察・防犯に関する情報）”. The official `spots.category=official` / “公的機関・警察情報” remains separate. Do not infer a police announcement or criminal responsibility from user text.

## Publishing safety and completion

- Posting requires final rendered media, QC pass, explicit admin approval, preview of account/caption/hashtags/media, then a distinct final publish action.
- `revisionId + renderId + platform` forms the idempotency key. Retrying an already posted revision is blocked unless an admin explicitly chooses re-post.
- X is complete only with created post + external post ID. TikTok is complete only after final `PUBLISHED` status; a `publish_id`, upload or `PROCESSING` is not done.
- Without OAuth/scope/app audit/API contract, show “接続設定必要”; never fake success and never send externally.
- Keep the shared `publishing_*` schema from the machiibe work; do not create same-role duplicate tables. Reconcile exact current schema/migration before writing integration SQL.

## Mobile and ad constraints

All new list/preview/review/post confirmation views must be tested in normal and Private Safari down to the final action. Prefer one page scroll; keep preview media `touch-action: pan-y`; avoid nested overflow traps and body scroll-lock conflicts; use safe-area-aware bottom padding. Hide the global PR banner on admin screens or reserve safe space so it cannot cover QC, approval, publish buttons, or scrolling.

## Gate state

This document is a P4/P5 build contract, not evidence of an operational UI. No new publishing table, Production record, migration, OAuth, external post, or Production deployment is created by this contract. Current preview database shares Production; never create test posts there. A dedicated isolated Supabase preview project or verified local/staging endpoint is required before write E2E.
