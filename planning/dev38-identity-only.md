# 開発38 Identity-only 再構成

## 目的

PR #23で本人iPhone QA PASS済みのIdentity UIを、P4/P5 ancestryを持ち込まずPR #22の直後へ統合できる形に再構成する。

## Base

- PR #22 branch: `feat/dev34-police-safety-anomaly`
- base SHA: `9c4276b7a85e8f918d50ce20aea7b9af699571bc`

## 元Identity

- PR #23 HEAD: `474aaf0ace068ac029759a5221c5d55a04e72d28`
- PR #23 base: `feat/dev34-current-production-engine@d8faa60b...`
- 本人QA: PASS
- 問題: P4/P5 branch ancestry上にstackedしているため、そのまま統合不可。

## 再構成方法

PR #22とPR #23元baseで同一blobだった以下はIdentity最終版を移植。

- profile-v2.css
- profile-v2.js
- pwa-onboarding.js
- tests/profile_v2.test.cjs

新規Identity専用ファイルを移植。

- identity-ui.css
- identity-ui.js
- tests/identity_ui.test.cjs

共有ファイルはPR #22へ最小差分のみ適用。

- index.html: Identity CSS/JS読込、presentation-only session sync
- package.json: profile/identity tests追加

旧PR #23のplanning/news/renderer/P4/P5差分は持ち込まない。

## Diff監査

PR #22 HEADとのcompare:

- status: ahead
- behind: 0
- changed files: 9
- news / renderer / production-current files: 0

## Safety

- LINE start/callback/exchange contract変更なし
- Auth/RLS/point判定変更なし
- DB Migrationなし
- Google OAuthなし
- Production変更なし
- Identity stateは表示専用

## QA

既存PR #23本人QA PASSはfeature-level根拠として維持する。
新branchではCI、Preview、asset readback、回帰確認を追加で行う。
