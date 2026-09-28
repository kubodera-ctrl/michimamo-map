# 画像 fallback / rights contract

優先順位:
1. event_official: イベント公式画像かつ display_allowed=true
2. venue_official: 会場・施設公式画像かつ display_allowed=true
3. place_photo: 公園・モール・ホテル・会場等の許諾済み場所写真
4. category_visual: まちイベ独自カテゴリvisual
5. generic_fallback: 高品質汎用fallback

権利は1個の allowed フラグにまとめない:
- display_allowed
- cache_allowed
- commercial_allowed
- sns_allowed
- attribution_required / attribution_text
- rights_status / rights_reviewed_at / source_url

原則:
- null/unknown は許可ではない。
- Web表示可でもcache/SNS可とは限らない。
- cache_allowed=true または machiibe_owned でない媒体はR2へ複製しない。
- SNSは display + commercial + sns の明示許可が揃う場合のみ。
- 場所写真も著作物として扱う。
- category_visual/generic_fallbackは実イベント写真と誤認させない。
- PR #1のcategory visualはまちイベownedとして、外部写真が使えない時の安全fallbackに使う。
