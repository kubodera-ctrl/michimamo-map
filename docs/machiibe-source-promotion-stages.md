# Source promotion stages

全国coverageは候補発見と実取得許可を分離する。

1. CANDIDATE
   - 公式source候補を発見しただけ。
2. TERMS_REVIEWED
   - 利用規約・商用利用・再利用・再配布・cache・画像・SNS・attribution・取得条件を確認。
   - unknownはunknownのまま。
3. FETCH_ALLOWED
   - terms=reviewed_allowed
   - robots=allowed / not_applicable
   - commercial=allowed
   - reuse=allowed
   - redistribution/cache/image/SNSの状態を記録
   - automated_fetch_allowed=true の承認を持つ
4. DRY_RUN_PASS
   - fetch → normalize → validation → dedup → update/cancelのdry-run PASS。
5. PREVIEW_ENABLED
   - Preview searchへREAL_VERIFIED/REAL_NEEDS_REVIEWとして投入可能。
6. PRODUCTION_REVIEW
   - Production適用判断待ち。自動でProductionへ進めない。

robots pendingは自動fetchを許可しない。
画像/SNSの許可はevent fact取得許可とは独立し、source factを取得できても画像転載を意味しない。
