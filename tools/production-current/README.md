# CURRENT Production Engine integration (in progress)

Source of truth: Drive `VIDEO_PRODUCTION_MASTER_CURRENT.md` and `ADMIN_INTEGRATION_CONTRACT.md`, 2026-09-27, v16.4 + REVIEW5 FINE TUNE. No v16.5 / 15-second prototype use.

`timeline.cjs` implements the formal timeline only. `input-contract.cjs` validates the official CURRENT input contract and fail-closed publish gates. Its app integration extension requires `sourceType` and item-level source/rights for weekly items so anomaly posts and police notices cannot be conflated or share an unproven clearance. The Drive-owned CURRENT schema itself is unchanged. Neither file generates or publishes media. No active Production Master is registered by this change.

`news-publishing-contract.cjs` records the separate admin/P5 domain labels and safe status contract only. Admin labels are **TikTok SHORT / SINGLE (43 seconds)** and **TikTok LONG / WEEKLY (CURRENT duration)**. The official input mode remains `SINGLE` / `WEEKLY`; there is no independent single-news 61-second duration. Weekly presets are 6/9/12 actual verified items; duration remains `38 + 12 * ceil(newsCount/3)` including a full 12-second final page with 1–2 items. The weekly key is week start + prefecture; the publishing key is revision + render + platform. A TikTok `publish_id` is not completion: only final `PUBLISHED` status counts as done. This file does not implement the admin UI, persistence, or API adapter.

Source archive: Drive ID `1T5mxTuPUHkq_En-rjmggmXYHlQzzAECr` (`SOURCE_CURRENT_FULL.zip`). SHA256: `916157c8126923d7e4324cb968d34e38511c767ad0bdb25803656d148052bf93`.

Audited entry: `render_latest.py`, `review5_finetune.py`, REVIEW4/3 and nested v14/v16.2 sources. `tools/production-current/renderer-dependency-map.md` records current asset mappings and hashes. The visual assets (approved TOP, endcard, central emblem, smiling/sad dog candidates, and REVIEW4/5 overlays) exist; some legacy path names need mapped/visual review. `README_RESTORE.md` explicitly excludes font binaries and directs runtime Japanese font resolution, so no `MACHIMAMO_APPROVED_JP_FONT` variable is required. The true source blockers are two foundation code files absent from all three CURRENT archives and REVIEW5 delta: `machimamo_reference_v13/package/machimamo_reference_v13.py` and `machimamo_reference_v16_1/src/machimamo_reference_v16_1.py`. Their dependent drawing code must not be replaced or redesigned.

Before render: obtain exact hash-verified foundation modules from the CURRENT source owner/package, add an ASSET_ROOT/WORK_ROOT path adapter only, resolve a Japanese-capable font in the renderer environment, and validate glyph/layout metrics against approved QC. Then render Admin Preview/MP4/QC through one engine and compare with approved Golden. No regenerated renderer output, Golden comparison, or current P4 Preview is claimed.

Run `npm run test:production-current` for timeline, provenance, publishing contract, and source-bundle readiness contract.
