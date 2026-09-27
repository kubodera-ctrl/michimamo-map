# CURRENT Production Engine integration (in progress)

Source of truth: Drive `VIDEO_PRODUCTION_MASTER_CURRENT.md` and `ADMIN_INTEGRATION_CONTRACT.md`, 2026-09-27, v16.4 + REVIEW5 FINE TUNE. No v16.5 / 15-second prototype use.

`timeline.cjs` implements the formal timeline only. `input-contract.cjs` validates the official CURRENT input contract and fail-closed publish gates. Its app integration extension requires `sourceType` and item-level source/rights for weekly items so anomaly posts and police notices cannot be conflated or share an unproven clearance. The Drive-owned CURRENT schema itself is unchanged. Neither file generates or publishes media. No active Production Master is registered by this change.

Source archive: Drive ID `1T5mxTuPUHkq_En-rjmggmXYHlQzzAECr` (`SOURCE_CURRENT_FULL.zip`). SHA256: `916157c8126923d7e4324cb968d34e38511c767ad0bdb25803656d148052bf93`.

Audited source entry: `source/machimamo_v164/review5_finetune.py`, imports `review4_unified_design.py`, uses absolute `/mnt/data` asset/output references. Archive includes approved TOP/dog/emblem/overlay assets. Japanese font binaries are not included. Source is a restoration snapshot, not an already integrated request-driven renderer.

Next: make ASSET_ROOT/WORK_ROOT configurable without changing drawing functions; connect sourceType to verified source records; feed validated CURRENT input; load approved fonts; render with the same engine for Admin Preview/MP4/QC frames; compare final MP4 and Golden. No renderer or MP4 QC PASS claimed yet.

Run: `node tools/production-current/timeline.test.cjs` and `node tools/production-current/input-contract.test.cjs`.
