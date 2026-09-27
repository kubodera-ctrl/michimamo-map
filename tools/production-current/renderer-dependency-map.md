# Renderer dependency map — CURRENT 2026-09-27

Source of truth: `SOURCE_CURRENT_FULL.zip`, `TOP_MASTER_CURRENT.zip`, and `VIDEO_MASTER_CURRENT_20260927.zip`.
The three supplied archive hashes match `MASTER_SHA256.txt`. Font binaries are deliberately excluded per `README_RESTORE.md`; resolve a Japanese-capable runtime font using the renderer's existing font selection/fallback and verify rendered glyph metrics against the approved MP4. Do not require `MACHIMAMO_APPROVED_JP_FONT`.

ASSET_ROOT means the extracted directory whose immediate children include `machimamo_v164/` and `machimamo_reference_v16_1/`. WORK_ROOT is a writable per-render work directory. Source/drawing functions must not be redesigned to address paths.

| Logical asset/dependency | Historical reference | CURRENT file / runtime mapping | SHA-256 | Page/use | State |
|---|---|---|---|---|---|
| Approved TOP artwork | `machimamo_reference_v14/src/TOP_VISUAL_MASTER_APPROVED.png` | `$ASSET_ROOT/machimamo_v164/build/v14/src/TOP_VISUAL_MASTER_APPROVED.png` (identical to standalone TOP archive copy) | `b8908921d50cbdc95ebe994edcd11bb1265fd40ac39b92f7ec0d30cc49a806e9` | TOP | MAPPED |
| Clean TOP background | `machimamo_reference_v14/src/TOP_BACKGROUND_CLEAN.png` | `$ASSET_ROOT/machimamo_v164/build/v14/src/TOP_BACKGROUND_CLEAN.png` (identical to TOP archive) | `5a2f9e5a5939397d364eb03a65c4f671525992df539919250a99a344426a5445` | TOP | MAPPED |
| Approved endcard artwork | `machimamo_reference_v14/src/ENDCARD_APPROVED.png` | `$ASSET_ROOT/machimamo_v164/build/v14/src/ENDCARD_APPROVED.png` | `cddaf03e1256ea95c55af818b19d00bc4ed41cb5336a46a31123df81624eb477` | END | FOUND |
| Central transparent emblem | old renderer logo/emblem lookup | `$ASSET_ROOT/machimamo_v164/review5_logo_emblem_grabcut.png` | `f20e02a55fa757a33ae263964dcbb9e5932e77de0fc40d00383ea5516b14ca5a` | common headers | FOUND |
| Smiling dog | `machimamo_reference_v16_1/src/dog_only_generated_officialized.png` | `$ASSET_ROOT/machimamo_reference_v16_1/src/dog_only_generated_officialized.png` | `90f44d4b85473ca650badb8af64855cdbcbb53a580d497a78290ac967f2d4c5a` | MAP explanation, safety, END according to CURRENT | FOUND |
| Sad news dog (candidate A) | `machimamo_reference_v16_2/src/dog_sad_v16_2.png` | `$ASSET_ROOT/machimamo_v164/build/v162/dog_sad_generated_blue_clean.png` | `2e05bf211d38c8e448b472bb81e5ada1503b22d0ba30f1a2282b4cae1352bbef` | news footer | NEEDS_REVIEW |
| Sad news dog (candidate B) | same historical lookup | `$ASSET_ROOT/machimamo_v164/review4_sad_dog_transparent.png` | `77ec3d9033f76225d5e18162e1ea35827c32347257499204d83394d980d92a5a` | news footer | NEEDS_REVIEW |
| News footer overlay | `machimamo_reference_v16_3/overlays/news_short.png` / `news_weekly.png` | candidate: `$ASSET_ROOT/machimamo_v164/review4_assets/footer_news_sad.png` | `9757588469538200a9afbe042a5abce8334a329f9424d639ddc210d96a1eccd5` | SHORT/WEEKLY news footer | NEEDS_REVIEW |
| Safety footer | historical v16.3 overlay convention | `$ASSET_ROOT/machimamo_v164/review4_assets/footer_safety_smile.png` | `6bd15fde3181a661079f032af8611222abaf0371df86479e53fea791a10f4207` | safety | FOUND |
| MAP info overlays | historical REVIEW4/5 layer names | `review4_assets/mapinfo_{cover,action,footer,title_accent}.png` | `mapinfo_action.png: 524d409851965d43b7c1b95555d1f7086d16387795e8b8f429f5207b99a5481b`; `cover.png: 9bc8704dac0304c15f2847d8a96b57993ad2a5cafcae987bb61ca5956b70152d`; `footer.png: c419863a1cf19adbb71fab1a5601e8f0151f3125abc77d77c020e31c2153eaf5` | MAP explanation | FOUND |
| Logic overlays | historical REVIEW4/5 layer names | `review4_assets/logic_{cover,message,footer,title_accent}.png` | `cover.png: 83a736c688f068bf930869802ef739f4fc61fcd731a0155aa160ea78946bf8a0`; `message.png: 54266d96b51dc155d5705985fb7c81a93af95a8470adbae9433805e0052d16e4`; `footer.png: 430f7e7d3605a57f35e0d2afd49b9f55ca8eb421f7ce1a7537f2d339a507dfad` | logic | FOUND |
| END background and gradients | historical end layer refs | `review4_assets/end_bg.png`, `end_g0.png`–`end_g4.png` | `end_bg.png: a8bf86ce707d2546f4126371aeffcc7d2e1d36ff279349e01e36ce81b77c991e` | END | FOUND |
| REVIEW5 SHORT header | historical header patch ref | `review5_assets/header_short_patch.png` | `c8db0ec2105310204f4d63e35677bf3e0cfd515d7ee040c63513d417efeed210` | SHORT news | FOUND |
| REVIEW5 WEEKLY header | historical header patch ref | `review5_assets/header_weekly_patch.png` | `c8a8b3cde00f198b402e08b19d7bd3d18ec1d19b137742247183de47093a6d0f` | WEEKLY news | FOUND |
| REVIEW5 MAP header | historical map header patch ref | `review5_assets/map_header_patch.png` | `e287d7b6864bc4936b9586e39719b0cf3f8938a8b181fa39232716cacc188f13` | MAP | FOUND |
| v14 renderer code | `machimamo_reference_v14/src/machimamo_reference_v14.py` | `$ASSET_ROOT/machimamo_v164/build/v14/src/machimamo_reference_v14.py` | n/a | TOP/base | FOUND (imports missing v13 module) |
| v16.2 renderer code | current renderer's v16.2 import | `$ASSET_ROOT/machimamo_v164/build/v162/machimamo_reference_v16_2.py` | n/a | NEWS/WEEKLY | FOUND (imports missing v16.1 module) |
| v13 renderer code | `machimamo_reference_v13/package/machimamo_reference_v13.py` | absent from VIDEO_MASTER, SOURCE, TOP, and REVIEW5 delta archives | n/a | v14 foundation | MISSING (code) |
| v16.1 renderer code | `machimamo_reference_v16_1/src/machimamo_reference_v16_1.py` | absent from VIDEO_MASTER, SOURCE, TOP, and REVIEW5 delta archives; folder contains only smiling dog image | n/a | v16.2 foundation | MISSING (code) |
| Japanese font binary | no fixed path in README_RESTORE | intentionally excluded; resolve from runtime and visually/metric-QC | n/a | all text | NEEDS_REVIEW (runtime font availability) |

Archive hashes verified against `MASTER_SHA256.txt`:
- VIDEO_MASTER_CURRENT_20260927.zip: `4262fdd2271506215cbadfaaa0cedf728cfb492a8dc6dfa5e54711398a0e9cb3`
- SOURCE_CURRENT_FULL.zip: `916157c8126923d7e4324cb968d34e38511c767ad0bdb25803656d148052bf93`
- TOP_MASTER_CURRENT.zip: `55f1335642207c194a8479be5f11246f404cf5f15e830e3f3e1bdfa5a77a34d9`
- SHORT approved MP4: `27108db3aa4e6351b5cb40ead40785a6c04bee601e7373c2bf0130132e56a215`
- WEEKLY 6 approved MP4: `cbfa1774b0a0a4ecb20ced12911a80a2c1d1167c666206859b3f35787b5b3857`

## Rendering gate

The current asset inventory is substantially present. Do not stop because an old asset path is absent; map equivalent CURRENT assets and compare visually. Renderer execution remains blocked by two missing foundational Python modules, not by the listed visual assets or an environment-variable requirement. No substitute drawings/layouts or generated art may be introduced. Resolve the CURRENT source-code dependency with the Drive owner or recover only an exact hash-verified code copy from a documented CURRENT package. Until then, do not claim a regenerated MP4 or Golden match.
