# まちイベ R36非本番統合・本番稼働Gate（2026-10-22）

## スコープと状態

このPRブランチはPR #24 HEAD `4e263e42bec5f249e83a51ae0efbcb310e74965a` から派生した **nonProd / code-only** の検証候補です。PR #1、PR #24、`main` を直接変更しません。Production DB/Secrets/Cron/デプロイ/パスワード解除なし。新規Source自動取得と外部通知なし。

R36までの補完機能：Source権利・取得境界、正規化RAW→R2受領永続化、job/Source照合、Queue duplicate replay guard、source-event identity、イベント正本/出典同時更新RPC、ジョブ登録/期限付きlease/durable outbox、監視統計とアラートfingerprint抑制。イベント新規自動公開禁止。取消/延期の明示的な根拠が無ければHOLD。Source既存CANDIDATEは自動取得不可。

非本番Supabase `ufomasuyfgfcmwuuufzq` に既に適用・実DB検証済みのR33/R34/R36スキーマはここにSQL参考コードとして同梱。**再適用禁止**。 `supabase/nonprod/` はProduction migration chainに含めない。

## フラグ（未設定=OFF、現状維持）

- NORMALIZATION_PREVIEW_ENABLED
- INGEST_RECEIPT_VERIFY_ENABLED
- AUTO_UPDATE_SCHEDULER_ENABLED
- AUTO_UPDATE_DISPATCH_ENABLED
- AUTO_UPDATE_MONITOR_PERSIST_ENABLED
- CANONICAL_UPDATE_ENABLED
- AUTO_UPDATE_NONPROD_PROJECT_REF（nonProd限定値が必須）

すべてのFlagがONでも、正規のCloudflare Worker binding/secretと非本番Queue/R2実体の独立検証が必要。Cloudflare現行Workerのwrangler.jsoncはProductionと共有しない。実配備時は非本番専用Worker名・Queue名・R2 bucketを明示した別Config＋現存Free枠/費用を監査すること。

## 検証

- PR24ベースを使用した専用branchのcode-only PR。既存Source/イベント25件を変更しない。
- Local R36 ZIP -> 86/86 Node tests PASS、local shim strict TS PASS (node 22.16)。
- 既存の実非本番SQLにおいてsynthetic BEGIN/ROLLBACK（event/provenance CAS、outbox/lease、fast-consumer race）検証済み。
- branchの新規CIはcloudflare Workerの正式依存型検査とWrangler --dry-run、およびevent-siteのfocus testsのみ。**CI自動配備しない**。
- Cloudflare nonProd Worker→Queue/R2/Supabase RESTのHosted E2E、Secrets、Cron、通知、実イベントSourceの取得、iPhone実機テストは未実証でNO_GO。

追加失敗ケース：同じjob完成通知がQueueから再送されても`fetch`やR2やcanonical RPCを繰返さずoutbox状態を確かめてACK。job_id/source_id不一致ではjob statusを書き換えずretry。terminal dead_letter状態は二重処理しない。

原本 Owner-only Drive: https://drive.google.com/file/d/1F9yvB_3el8pdTmFqrVbIV0UtFX7BMzXQ/view
正式CURRENT: https://docs.google.com/document/d/1BaWS4lnLJFwZCzhHg5M3KaHA9Rv94K8S7nl5rZTZs-k/edit
正式QA: 21 PASS / 4 FAIL / 7未実施、HostedReady=false、NO_GO。
