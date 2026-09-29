# Source promotion stages

全国coverageは「候補発見」「規約・robots確認」「fetch可否」「実データ検証」「Preview投入」を分離する。
イベント本文の取得可否と、画像のWeb表示/SNS二次利用/cache/R2保存/動画素材利用も別gateにする。

## A. Discovery / compliance state

1. DISCOVERED
   - 公式source候補を発見しただけ。
2. PREFLIGHT
   - 一覧/詳細/カレンダー/ページネーション/JSON-LD/RSS/ICS/CSV/XLSX/API等の取得経路候補を確認。
   - まだ利用規約・robotsを通過した意味ではない。
3. TERMS_REVIEWED
   - 利用規約、商用利用、再利用、再配布、cache、画像、SNS、attributionを確認。
   - unknownはunknownのまま。
4. ROBOTS_REVIEWED
   - robots/access policyを確認。規約OKでもrobots pendingならREADYへ上げない。
5. READY
   - terms/robots/商用/再利用が取得対象に対して許可され、実resource URLとfetch methodが確定。
   - automated_fetch_allowed=trueへ変更する直前のレビュー済み状態。
6. ACTIVE
   - dry-run / validation / dedup / freshness確認を通過し、Preview供給に利用中。
7. BLOCKED
   - 規約・robots・技術制限・アクセス制限等で現状利用不可。
   - 地域全体を諦めず代替sourceを探索する。

## B. Ingestion promotion stage

既存DB/contract側では以下を維持する。

CANDIDATE
→ TERMS_REVIEWED
→ FETCH_ALLOWED
→ DRY_RUN_PASS
→ PREVIEW_ENABLED
→ PRODUCTION_REVIEW

対応の目安:
- DISCOVERED / PREFLIGHT -> CANDIDATE
- TERMS_REVIEWED / ROBOTS_REVIEWED -> TERMS_REVIEWED
- READY -> FETCH_ALLOWED候補
- ACTIVE -> DRY_RUN_PASSまたはPREVIEW_ENABLED
- BLOCKED -> automated_fetch_allowed=false

FETCH_ALLOWED条件:
- terms=reviewed_allowed
- robots=allowed / not_applicable
- commercial=allowed
- reuse=allowed
- redistribution/cache/image/SNSの状態を記録
- automated_fetch_allowed=true の明示承認

robots pendingは自動fetchを許可しない。
画像/SNSの許可はevent fact取得許可とは独立する。
Web掲載可能でもSNS二次利用・cache・R2保存・動画素材利用を自動許可しない。
画像権利が不明でも、イベント本文の利用条件が満たされる場合はイベント自体を捨てず、画像だけfail-closedにする。
