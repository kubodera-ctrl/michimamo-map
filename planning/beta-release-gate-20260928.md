# まちまも β Release Gate — 2026-09-28

Status: PASS / BLOCKED / OFF / UNVERIFIED. Implemented alone is not PASS.

## β機能分類
- A 必須 ON候補: MAP、警察署/交番/AED、地域異変閲覧、地域異変投稿（PR20後）、LINE認証、マイページ、ポイント蓄積。
- B βでON可能: ランキング（架空補完削除後）、クイズ、スタンプ、通常ASP広告（厳格gate通過後）、今日のお出かけ/まちイベ導線（限定）。
- C βではOFF/Coming Soon: ポイント交換、AIカメラ一般公開、車載一般公開、ニュース動画、SNS Production。
- D β後: Renderer exact-v7復旧、自動SNS、ASPポイント還元、reversal live、vehicle_reward、有料AI。

## P0
1. 旧ハードコードASP/ポイント表示がASP2 Runtime gateを迂回。Production/mainにA8/ValueCommerce直リンク、＋10,000pt / ＋500,000pt表示あり。ASP2 CURRENT reward_enabled=0。特PのProduction URLとCURRENT URLも不一致。guardrail branchでβ非表示化済み、Production未反映。
2. エリア別前月報告数で実データ10件未満時に固定/random dummy件数を混ぜるコードがmainに存在。安全データの架空補完は禁止。guardrail branchで実件数のみへ修正済み。
3. PR #20: exact-head npm test / isolated write E2EはPASS。残りはCloudflare check責務、required checks、main merge時Production deploy挙動。
4. exchangeをONにする場合のpoint_exchange reason mismatch。初期βはOFFで回避し、additive migration候補と隔離DB behavior PASS済み。

## P1
- Android core smoke未記録: MAP/Auth/MyPage/Post/Quiz最低限。
- Supabase Security Advisor WARNの意図確認: anon SECURITY DEFINER 3、authenticated SECURITY DEFINER 38。admin RPCはadmin membership + second passwordだが公開API面を再確認。
- leaked-password protection disabled: end-user password auth未使用なら非blockerだがAuth方針として記録。
- Accessibility smoke未完: focus/label/zoom/contrast/modal close。
- DB/Storage backup・restore手順の実証未確認。Git rollbackだけではStorage復元にならない。
- 中央error monitoring未接続。console/toast中心。
- ASP ON前にPrivacy/Termsへ広告・affiliate tracking説明を合わせる。
- user report spotsは全件select/render。現状約2,000件だがスケール前にviewport/age pagingが必要。

## P2
- ASP 0〜3件時はdisabled filterを多数見せずcompact化。
- robots.txt/canonical/明示index方針なし。βのSEO方針を決定。
- analytics測定源と保存方針を明文化。
- public domain/canonical URL固定。
- ranking少数データ時の説明改善。

## P3
- Renderer exact-v7、自動ニュース動画、X/TikTok live publishing、交換provider live/reversal、ASP reward live、車載ポイント、統合Admin OS。

## PR統合順
1. PR #20 P0
2. PR #22 police_safety（#20に1 commit stack。#20後mainへretarget/rebase、migration別Gate）
3. Identity UI（本人QA PASS。PR23はP4 ancestry上なのでIdentity-only 12 commitsをpost-#20/#22 mainへreplay/squash）
4. P4/P5（統合後mainへrebase。Rendererはinactive維持）
5. PR #21 ASP Runtime（diverged/mergeable=false。ASP2 publishable offerができてからlatest mainへ再構成）

## PR #20 evidence
- base main 7b4b935a5facb0a441445a9e14adce1982c909e1
- head 52f213b8ceb451eec5d865db5037ea29f45e144f, ahead19/behind0/mergeable=true
- exact Vercel Preview dpl_EracVMj9dJfm7JF45vjTQqqzYHvt READY
- exact-head full npm test PASS: Actions 36382389650
- isolated local_anomaly write E2E PASS: Actions 36382981383. create、1pt×5/6th0、receipt replay、payload mismatch、validation、other delete deny、owner delete success。disposable PostgreSQL、Production writeなし。
- remaining: Workers Builds:michimamo-map原因/責務、machiibe-preview required判定、branch protection required checks、main→Production deploy behavior。

## Point/Exchange hardening
- Draft PR #25 / fix/beta-point-exchange-contract。
- additive 20260928143000_point_exchange_reason_contract.sql: 既存reason保持 + point_exchangeのみ追加候補。Production未適用。
- future vocabulary only: point_exchange_reversal / asp_reward / asp_reward_reversal / vehicle_reward。
- get_my_point_balance(): gross / reserved / available=max(0,gross-reserved)。
- isolated DB behavior PASS: Actions 36382314327。reserve, idempotency, insufficient, approved, issuing, issued, ledger debit, points_committed_at, external_issue_id, delivery request link, double issued reject, cancel, reject, issue_failed, retry。

## Reversal design
- append-only。original ledgerをupdate/deleteしない。
- companion relation: original_transaction_id UNIQUE, reversal_transaction_id UNIQUE, source, reversal_ref_key UNIQUE, created_at。
- reversal amountはoriginalの正負反転。double reversal拒否。初期βでは未実装/未有効。

## ASP conversion design
- pending -> verified -> approved | rejected -> reversed。
- approvedのみasp_rewardをappend。credited approvalのreversedのみasp_reward_reversal。
- provider + program/offer + provider conversion IDをstable uniqueness key。
- pending/verifiedはgross/availableへ入れない。

## Release Gate
Security: [BLOCKED] legacy ads/reward claims, synthetic ranking; [UNVERIFIED] required checks; [PASS] point direct mutation restricted。
Auth: [PASS] LINE/Identity本人QA; [UNVERIFIED] Android auth smoke; Google OAuth OFF。
RLS/DB: [PASS] Production read audit + isolated PR20 write; [OFF] unapproved migrations。
Privacy/Terms: [PASS] pages exist; [UNVERIFIED] affiliate/tracking wording before ads ON。
UI/Safari: [PASS] normal/Private P0 scope; [UNVERIFIED] Android/accessibility。
Performance: [PASS] safety_spots viewport RPC; [P1] user spots all-row render。
Points: [PASS] ledger/post cap/quiz/stamps/AED; [OFF] exchange。
ASP/Ads: [BLOCKED] strict publishable=0 and legacy direct UI; no live click。
Analytics/Error: [UNVERIFIED] measurement plan / central error monitoring。
Backup/Rollback: [PASS] Git rollback; [UNVERIFIED] DB/Storage restore runbook。
Production deploy: [UNVERIFIED] main merge auto-production behavior。
Domain/SEO: [UNVERIFIED] stable domain/index policy/canonical/robots。
SNS: OFF。
Admin: [UNVERIFIED] RPC exposure/rate limit runbook。
Abuse prevention: [PASS] point daily/idempotency; [UNVERIFIED] full auth/admin/post rate matrix。

## Initial β recommendation
Core safety map + LINE + MyPage + regional posting + point earning + quiz/stamps can be initial beta after P0 guardrails/integration close.
Keep exchange, ASP rewards, camera/vehicle public beta, automated news video and live SNS OFF.
Normal ASP ads can be added during beta only after a small 3–10 offer set passes all publication gates.
