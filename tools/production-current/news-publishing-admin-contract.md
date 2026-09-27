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


## Future integrated admin OS compatibility (design constraint, not implementation)

The Drive roadmap `地域生活プラットフォーム｜統合運営管理センター構想・実装ロードマップ v1（2026-09-27）` is a forward architecture constraint only. This P4/P5 branch does **not** implement the integrated admin OS.

For current machimamo work:
- The service identity is explicitly `machimamo`; shared keys must include the service dimension where they can be globally unique across services.
- Keep the machimamo admin UI as a thin view over domain/API contracts. Do not put renderer, publishing completion, ASP, or audit truth into DOM-only state.
- Reuse the shared `publishing_post_sets / publishing_revisions / publishing_platform_posts / publishing_audit_log` model after exact migration reconciliation. Do not add duplicate machimamo-only tables with the same responsibility.
- Production/rendering, Publishing, ASP and Audit remain separate responsibilities and separate state transitions.
- A future management center may consume the same service-scoped read/write contracts through Admin API/BFF; migration of the UI must not require redesigning CURRENT SINGLE/WEEKLY or legacy user-post SNS assets.
- No Admin Auth/RBAC, management-center dashboard, inquiries, or management-center migration is started by this compatibility note.


## Read-only legacy candidate bridge (temporary P4 integration)

Until the canonical verified-news API/table exists, the P4 admin UI may read public legacy `spots.category=official` rows as **LEGACY_UNVERIFIED** candidates. This is a migration bridge, not a Production news source.

Rules:
- Read only public columns: id, created_at, category, title, comment, address, is_hidden, report_count.
- Never classify these rows as `POLICE_OFFICIAL` solely because the legacy category is `official`. Historical rows include third-party news/aggregator text and do not preserve canonical primary-source identity.
- Source URL, verifiedFacts and rights evidence are absent from the legacy schema, so every bridged row is `source=needs_review / facts=needs_review / rights=needs_review / publishEligible=false`.
- Rendering, QC approval and X/TikTok publication remain disabled for these rows.
- Prefecture/date parsing is navigation/filter assistance only; it does not promote extracted text into verified facts.
- WEEKLY may show the count of matching real legacy candidates, but eligible count remains zero until canonical source/facts/rights gates pass. Never fill a requested 6/9/12 count with synthetic stories.
- The bridge must load only when the news admin is visible (normal authenticated admin or Preview QA), not for every public map visitor.
- The bridge reads through existing public RLS only. It must not use service_role or add a Production migration merely for Preview display.

Canonical replacement:
- Replace the legacy reader with an Admin API/BFF or a reconciled shared news source table containing source provenance, verified facts, rights evidence, correction state and content hash.
- Official source adapters must preserve the source-specific license and correction requirements. A source-master entry alone is not a fact record.
- Existing legacy candidates remain visibly distinguishable during migration; never silently upgrade them to verified.

## UI-independent workflow state contract

`news-workflow-state-contract.cjs` keeps Production / Render / QC / Approval / Publishing state outside DOM/UI state.

Fail-closed prerequisites:
- `render=SUCCEEDED` requires `production=FROZEN`
- `qc=PASSED` requires `render=SUCCEEDED`
- `approval=APPROVED` requires `qc=PASSED`
- `publishingPreview=READY` requires `approval=APPROVED`
- a platform `POSTED` state requires `publishingPreview=READY` plus both `revisionId` and `renderId`

Opening a modal, showing a button, or rendering a read-only preview never advances a domain state. Current X/TikTok state remains `CONNECTION_REQUIRED`; no OAuth or external send is performed by this contract.
