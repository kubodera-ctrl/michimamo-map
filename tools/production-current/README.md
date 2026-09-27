# CURRENT Production Engine integration (in progress)

Source of truth: Drive `VIDEO_PRODUCTION_MASTER_CURRENT.md` and `ADMIN_INTEGRATION_CONTRACT.md`, 2026-09-27, v16.4 + REVIEW5 FINE TUNE. No v16.5 / 15-second prototype use.

`timeline.cjs` implements the formal timeline only. `input-contract.cjs` validates the official CURRENT input contract and fail-closed publish gates. Its app integration extension requires `sourceType` and item-level source/rights for weekly items so anomaly posts and police notices cannot be conflated or share an unproven clearance. The Drive-owned CURRENT schema itself is unchanged. Neither file generates or publishes media. No active Production Master is registered by this change.

`news-publishing-contract.cjs` records the separate admin/P5 domain labels and safe status contract only. Admin labels are **TikTok SHORT / SINGLE (43 seconds)** and **TikTok LONG / WEEKLY (CURRENT duration)**. The official input mode remains `SINGLE` / `WEEKLY`; there is no independent single-news 61-second duration. Weekly presets are 6/9/12 actual verified items; duration remains `38 + 12 * ceil(newsCount/3)` including a full 12-second final page with 1–2 items. The weekly key is week start + prefecture; the publishing key is revision + render + platform. A TikTok `publish_id` is not completion: only final `PUBLISHED` status counts as done. This file does not implement the admin UI, persistence, or API adapter.

Source archive: Drive ID `1T5mxTuPUHkq_En-rjmggmXYHlQzzAECr` (`SOURCE_CURRENT_FULL.zip`). SHA256: `916157c8126923d7e4324cb968d34e38511c767ad0bdb25803656d148052bf93`.

Audited entry: `source/machimamo_v164/render_latest.py` and `source/machimamo_v164/review5_finetune.py`. The archive contains the v14 and v16.4 layers but references external v13, v16.1 renderer, v16.2 dog, and v16.3 overlay paths that are absent from that archive. Approved Japanese font binaries are also absent. The snapshot therefore cannot render safely in a clean environment without substitutes; the drawing functions must not be changed. `renderer-bundle.json` and `renderer-preflight.cjs` enumerate the required files and require an explicit `MACHIMAMO_APPROVED_JP_FONT` path, failing closed until the approved source set is complete.

Next: obtain the exact missing renderer/font assets from the current master set; configure ASSET_ROOT/WORK_ROOT without changing drawing functions; feed validated CURRENT input; render Admin Preview, MP4 and QC frames through one engine; then compare final MP4 with the approved Golden. No renderer, Golden, decode/QC, or browser Preview PASS is claimed.

Run `npm run test:production-current` for timeline, provenance, publishing contract, and source-bundle readiness contract.
