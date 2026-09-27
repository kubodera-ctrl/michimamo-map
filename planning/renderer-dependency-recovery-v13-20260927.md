# Renderer Dependency Recovery — v13 / 2026-09-27

Status: CURRENT v16.4 + REVIEW5 FINE TUNE の歴史的dependency復元記録。Production Masterをv13へ戻すものではない。

## CURRENT基準

- Master: CURRENT_20260927 / v16.4 + REVIEW5 FINE TUNE
- SINGLE: 43 sec
- WEEKLY: 38 + 12 * ceil(newsCount / 3)
- v16.5は禁止
- Goldenは自動更新しない

## SOURCE_v13回収

- Source: ChatGPT Library `SOURCE_v13.zip`
- Library file: `file_0000000080a48209953642bd95117fa9`
- Archive size: 3,672,935 bytes
- Archive SHA256: `54499b60676f5c1f14d6bc51cf9234bed8f8ccb77fd8c4b86e7f92e133fc7d64`
- archive root `machimamo_reference_v13.py` size: 17,761 bytes
- `machimamo_reference_v13.py` SHA256: `12d6911d2454eebe17d260d9139d127ebba9b341f3cc2ddafa6c6b48b314b4e1`
- user-provided expected SHA256と一致

README_v13.md:
- `v13 is a strict delta over v12`
- `deps/` contains renderer versions referenced by v13 for audit/reference
- no font files included

## dependency tree / provenance

- v13 → v12
- v12 → v11
- v11 → v10
- v10 → v9
- v9 → v6 + v8
- v6 → historical base `machimamo_video5_build/render_short_44s.py`
- v8 → `machimamo_video5_build_v4/source_v7/render_short_44s_v7_zoom_refined.py`

Recovered and hash-checked:
- v12 SHA256 `c4ff0016667fdd0dd958019998aba00f410d305fb00ae3d2de29913cf84ebf7d`; SOURCE_v13 deps == standalone SOURCE_v12 exact
- v11 SHA256 `20bfed79e442adedca880dc17e4a31410b61225237b745c87632b031bfce6d57`; standalone exact
- v10 SHA256 `d5e334b5df9a0b3d0c71ecff3d7938250386342076c0193d809d96cd2a28b31e`; standalone exact
- v9 SHA256 `b828ce6e76e1d947db23d91c3392f08fafe43d0396c34aae58bd802751842124`; standalone exact
- v8 SHA256 `301df3b28862bb21136277dcad04daa60f24fb6050f7cca371d5c995a54fba6a`; standalone v8 source exact
- v6 SHA256 `f39ccb65af98d3519a510ac6e7fefebf29359d5a0186d2b186e58b0e10c8c326`
- historical base `render_short_44s.py` SHA256 `37fea5bc6374681970faf8c6a201726904e4fe22b23d1c1ce197653158b0019b`; Library v3 sourceから回収、provenance relationはNEEDS_REVIEW

## preflight再評価

CURRENT + REVIEW3 + REVIEW4/5 + SOURCE_v13 + historical exact archivesをASSET_ROOT配下へstageし、asset_path_adapterでWORK_ROOTへcopyしてhistorical `/mnt/data` literalのみを書換。

Result:
- v13: RECOVERED_FROM_LIBRARY
- v12/v11/v10/v9/v8/v6: RECOVERED
- v16.1: MAPPED / verified REVIEW3 base
- v16.3 overlays: MAPPED / verified REVIEW3 base
- CURRENT/REVIEW4/5 assets: FOUND
- Japanese runtime font: FOUND_RUNTIME / Visual metrics NEEDS_REVIEW
- true missing code: `machimamo_video5_build_v4/source_v7/render_short_44s_v7_zoom_refined.py`

Actual CURRENT `render_latest.py` import reaches v8 and stops on the missing v7 path above. This is not inferred from path names; it is the actual import blocker after v13 recovery.

## v7 search result

Exact v7 source was searched in:
- ChatGPT Library title/content search
- SOURCE_v13 and standalone v8/v9/v10/v11/v12/v14/v15/v16 archives
- CURRENT / REVIEW3 / REVIEW4 / REVIEW5 archives
- Drive CURRENT/snapshot folders

Only QC report / completed v7 MP4 / map and end contact assets were found. The recovered v7 completed MP4 is SHA256 `f04f5fd8768d7faddba98d6dbcecf4fe9b8141cdfca646e9e72d0e74a080b408`, matching `QC_REPORT_SHORT_44s_ZOOM_REFINED_20260926_v7.md`; ffprobe confirms 44.000s / 1080x1920 / 30fps / H.264 / yuv420p. Exact `render_short_44s_v7_zoom_refined.py` source has not been recovered. Do not reconstruct or guess its drawing implementation.

## font runtime

- README_RESTORE rule maintained: font binaries are not embedded into Master.
- Current renderer runtime resolves `Noto Sans CJK JP`.
- Runtime package: `fonts-noto-cjk` 1:20240730+repack1-1. Local package copyright declares `SIL Open Font License 1.1` for the font. This verification is for runtime use only; the font binary is not added to Git/Drive Master and is not redistributed.
- Historical base renderer expects:
  - `/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc`
  - `/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc`
- Both paths exist in the current execution runtime.
- Font availability only clears dependency availability; wrapping/line-height/glyph metrics remain Golden QC items.
- User-provided Dela/M PLUS archive is not required for the current historical renderer path and is not redistributed.

## render state

- New CURRENT SINGLE 43s: NOT GENERATED (v7 blocker)
- ffprobe/decode: NOT RUN on a new renderer output
- Golden frame comparison: NOT RUN on a new renderer output
- SINGLE Visual QC: NOT PASSED
- WEEKLY 62s: NOT STARTED; gated by SINGLE PASS

Golden baseline is locally recovered and hash-verified:
- `まちまも_SHORT_MASTER_43s_CURRENT.mp4` SHA256 `27108db3aa4e6351b5cb40ead40785a6c04bee601e7373c2bf0130132e56a215`
- `QC_CONTACT_CURRENT.jpg` available

## next

1. Recover exact v7 source if available.
2. Re-run dependency preflight/import.
3. Once import passes, run CURRENT SINGLE 43 sec using formal input schema.
4. ffprobe → full decode → QC frames → Golden compare.
5. Only after technical + visual PASS proceed to WEEKLY 6=62.


## v7 symbol surface required by v8

Static inspection of recovered `render_short_44s_v8_oldstyle.py` shows it imports v7 and references exactly:
- `v7.v6`
- `v7.TOKYO_MAIN`
- `v7.map_japan`
- `v7.prep`
- `v7.frame`

This documents the missing dependency surface but is not permission to reimplement those symbols from later/earlier versions. Exact source recovery remains required.


## Golden baseline technical audit

The approved CURRENT SINGLE baseline was recovered directly from Drive and checked independently of any new renderer output:

- file: `まちまも_SHORT_MASTER_43s_CURRENT.mp4`
- SHA256: `27108db3aa4e6351b5cb40ead40785a6c04bee601e7373c2bf0130132e56a215` (matches `MASTER_SHA256.txt`)
- duration: 43.000000 sec
- video: H.264 / 1080x1920 / 30 fps / yuv420p
- audio: AAC / 48 kHz
- full decode: error log 0 bytes
- approved `QC_CONTACT_CURRENT.jpg` recovered
- local QC extraction prepared at the CURRENT boundaries and NEWS completed-hold window for later generated-vs-Golden comparison

This validates the Golden reference only. It is not evidence that the recovered renderer can reproduce it.


## v14/v15/v16 provenance cross-check

Additional byte-level checks on the recovered CURRENT ancestry:

- v14: CURRENT `machimamo_v164/build/v14/src/machimamo_reference_v14.py` == standalone Library `SOURCE_v14.zip`; SHA256 `f1477950f9765297e389865af092a129be69c6a5d21b6e7302e3d42de2d5b0f3`.
- v15: REVIEW3 `build/v15/src/machimamo_reference_v15.py` == standalone Library `SOURCE_v15_DELTA.zip`; SHA256 `a4cd61bba0a39bf6774ea9bf378af66620311e1331c806cffed6f24e36bced7b`.
- v16 final: REVIEW3 top-level `machimamo_reference_v16_final.py` == REVIEW3 build/v16 copy; SHA256 `ea0bed4b6f2a623e6fbb2fb2fe0b43fc13cb4f65f2b26b15aa2f5abb0601b216`.
- v16.1: REVIEW3 top-level == build/v161 copy; SHA256 `0594994c2b595e432a66fdec452976798d64844c1cb65a3e16555b40def41114`.
- v16.2: CURRENT build/v162 == REVIEW3 top-level source; SHA256 `4cc1408241aa4444e122608cbe4c13ffe707822ac85a642d8d0b3840831a85a5`.

This confirms that the CURRENT ancestry through v14-v16.2 is byte-consistent with the separately recovered historical archives/snapshot. The remaining discontinuity is still the absent v7 source.
