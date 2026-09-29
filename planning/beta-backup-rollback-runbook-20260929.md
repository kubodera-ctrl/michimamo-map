# まちまも β Backup / Rollback Runbook — 2026-09-29

対象: まちまもMAP β公開直前・公開直後の復旧準備。

## 現在の前提

- Supabase Production: `ckftozjhdszlwqnylmxv` / ap-northeast-1 / Free plan。
- 2026-09-29監査時点のDB size: 約116 MB。
- Storage: 4 buckets / 10 objects / 約11 MB。
- Free planでは自動日次Database BackupをRelease Gateの根拠にできない。
- PITRは現プランでは利用しない。新規費用・契約は本人承認なしに追加しない。
- Storage object本体はDB dumpだけでは復元できないため、DBとStorageを別々に退避する。
- 既知正常Vercel Production: `dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4`。
- Production rollback / restore / migrationは本人承認があるまで実行しない。

## Release直前に必ず作るスナップショット

### 1. Database

Supabase公式CLIのbackup/restore手順に合わせ、roles / schema / dataを分離する。

```bash
supabase db dump --db-url "[CONNECTION_STRING]" -f roles.sql --role-only
supabase db dump --db-url "[CONNECTION_STRING]" -f schema.sql
supabase db dump --db-url "[CONNECTION_STRING]" -f data.sql --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
```

注意:
- `[CONNECTION_STRING]` とDB passwordはGit・Drive・チャット本文へ保存しない。
- dump完了時刻、各ファイルsize、SHA-256をRelease記録へ残す。
- schema dump単独ではdataを含まない。3ファイルすべてを1セットとして扱う。
- dump取得は読み取り主体だがProduction credentialを使うため、Release実行時に本人の承認済み手順として行う。

### 2. Storage objects

DB backupにはStorage object本体が含まれない。

Release直前に4 bucketすべてのobjectを外部退避し、最低限以下を記録する。

- bucket名
- object path
- object count
- byte size
- backup取得時刻
- objectごとのchecksum、または退避先での整合確認結果

2026-09-29 inventory:
- `aed-submission-images`: 1 object / 999,440 bytes
- `camera-evidence`: 0 object
- `profile-avatars`: 1 object / 18,885 bytes
- `spot-images`: 8 objects / 10,502,570 bytes

公式にはDashboard/APIでのdownload、またはS3 protocolを利用できる。S3 access key新規発行が必要な方法はcredential変更を伴うため本人承認後に行う。現状はobject数が少ないので、β初回Releaseでは「既存権限で全objectを退避できる方法」を優先する。

### 3. Edge Functions / deploy configuration

Database dumpだけではEdge Function source / deploy設定は復元できない。

Release snapshotには以下も固定する。

- Git commit SHA
- ProductionでACTIVEなEdge Function一覧、version、verify_jwt
- Productionからのみ存在したfunction sourceがGitへ正本化されていること
- Vercel Production deployment ID / aliases
- Supabase migration適用済み一覧

開発38でProduction `line-auth` sourceはprep branchへ正本化済み。不要video/test Functionsの停止は別の本人承認工程。

## RPO / RTO

### RPO

自動backupを前提にしないため、β公開時のRPOは「Release直前のmanual snapshot取得時刻」を基準にする。
snapshot後にProductionへ入った新規投稿・ポイント・設定変更は、snapshotへ戻した場合に失われる可能性がある。

したがって:
1. DB / Storage snapshot
2. checksum確認
3. Production変更
の順序を崩さない。

### RTO

復旧実測は未実施のため、現時点で時間を断定しない。
初回β公開後、Productionデータを変更しないdisposable環境でrestore drillを行い、
- DB restore開始〜検証完了
- Storage restore開始〜object整合確認
を計測して正式RTOを決める。

## Vercel rollback

既知正常deployment:
`dpl_5XXTtKK5o7RwCipcaqYckqDnCqw4`

Vercel公式には既存deploymentへのrollback / promote手段がある。
本番で実行する場合は、Release ownerが対象deployment IDと現在のProduction deploymentを照合してから実行する。

Production rollbackの実試験は本人承認なしに行わない。

## Supabase database restore

復元先は原則としてdisposable / 新規検証環境で先に確認する。
公式backup/restore手順では、roles → schema → dataの順序と、restore前のdefault privilege確認が必要。

本番DBへ直接restoreする場合は破壊的変更になり得るため、必ず本人承認を取得し、
- 対象project ref
- restore対象snapshot時刻
- 失われる可能性があるsnapshot後データ
を明記してから実行する。

## Release Gate判定

β公開前のBackup gateをPASSにする条件:
1. DB 3 dump files取得済み
2. Storage全object退避済み
3. count / size / checksum確認済み
4. Git SHA / Vercel deployment / Edge Function inventory記録済み
5. 復元手順が本runbookと一致

Rollback gate:
- 手順確定はPREP完了。
- Production rollback実行は必須条件ではない。
- ただしdisposable restore drill未実施なら、RTOは「未実測」と明記したままβリスクとして管理する。
