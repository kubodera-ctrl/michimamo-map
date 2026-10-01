# 画像 fallback / rights / provenance contract

更新: 2026-10-01
状態: 開発17 CURRENT / PR #24 独立Media Quality lane

## 目的

イベントfact取得と画像利用権を分離したまま、公開visualを安全に100%へ近づける。
権利不明画像でcoverageを埋めない。PR #1 β Release laneは変更せず、Media Quality基盤はPR #24で独立して進める。

## 公開visualの正式4段階

1. `event_official`
   - 利用可能と確認できたイベント公式画像
2. `event_illustration`
   - 第三者権利を侵害しない安全なイベントイメージ画像
   - 実イベント写真と誤認させない
3. `venue_official` / `place_photo`
   - 利用可能と確認できた会場・施設・場所写真
   - 必要に応じて「会場」「場所イメージ」と明示
4. `category_visual` / `generic_fallback`
   - まちイベ保有のブランドvisual
   - `generic_fallback` は5段階目ではなく「その他」カテゴリ用の4段階目variant

公開slotは4まで必ずfallbackする。
broken imageも同じresolverで4へfail-safeする。

## Machine safety state

`SAFE`
- まちイベ保有asset、または
- `displayAllowed=true` かつ `rightsSourceUrl` と `reviewedAt` が確認済み

`REVIEW_REQUIRED`
- display可否がnull/unknown
- display可でもprovenance/rights review証跡が不足

`DO_NOT_USE`
- `displayAllowed=false`

resolverは `SAFE` のみを公開候補として選択する。
unknown/nullは許可とみなさない。

## DB tracking

`machiibe_media_assets` で最低限以下を追跡する。

- subject / media role / media URL
- source URL
- provenance kind
- display/cache/commercial/SNS allowed
- attribution / license
- rights status / rights reviewed at
- checked at
- public selected / public selected at
- cache object key
- active state

`machiibe_media_public_gate_ck` により、public selectedは
- active
- provenance known
- checked_atあり
- public_selected_atあり
- machiibe_owned または explicit display permission + reviewed rights
を満たさない限り成立させない。

## Rightsは用途別

権利を1個のallowedへまとめない。

- display_allowed
- cache_allowed
- commercial_allowed
- sns_allowed
- attribution_required / attribution_text
- rights_status / rights_reviewed_at / source_url

原則:
- Web表示可でもcache/SNS可とは限らない
- cache_allowed=true または machiibe_owned でない媒体はR2へ複製しない
- SNSは display + commercial + sns の明示許可が揃う場合のみ
- 場所写真も著作物として扱う
- X上の画像は公式アカウントという理由だけで転載/hotlinkしない

## KPI

正式KPI:
- `image_coverage_rate = 100%`
- `empty_visual_count = 0`
- `rights_unknown_public_image_count = 0`

`measureMediaQuality()` でresolver結果から計測可能にする。
ACTIVE実イベントが0件の状態ではcoverage率を無理に100%と断定せずnull扱いとし、件数投入後に実測する。

## 自前カテゴリvisualの最小セット

PR #1のverified seed 45件を開発17で監査したcategory key出現:
- entertainment 28
- learning 13
- family 11
- art 8
- nature 7
- food 7
- festival 4
- sports 3
- market 2
- fireworks 1
- experience 1

この分布を踏まえ、初期brand visualは少数高coverageを優先する。

推奨グループ:
- エンタメ / 推し活 / キャラクター / ライブ
- 学び / 科学
- 親子 / 子ども
- 文化 / 展示 / アート
- 自然 / 動物
- グルメ / マルシェ
- 祭り / 季節 / 花火
- スポーツ
- 体験 / ものづくり
- 屋内 / 屋外 / 商業施設は会場系補助
- その他

PR #1の既存 `EventVisualFallback` は第三者画像を使わないブランドfallbackとしてβ安全網を維持する。
画像ファイルを無制限に増やさず、必要ならブランドvisualの派生assetを後続で追加する。

## Official X / 全国Source

イベントfactとmedia reuseを別Gateにする。
Official Xはverified公式アカウントの公開Post URLをfacts provenanceに使えるが、X本文全文やX-hosted mediaをコピーしない。
X画像URLのhotlinkでimage coverageを埋めない。

全国自治体Source / 観光協会 / Facility / 推し活についても、fact候補と同時にmedia候補・source・provenance・rightsを記録するが、公開選択はMedia safety gateを通す。

## β Release境界

β公開のために全イベント公式画像収集完了を待たない。
Release blockerは以下:
- rights_unknown_public_image_count > 0
- fallback不能でvisual slotが空になる
- media変更によるP0/P1表示崩れ

PR #1へMedia Qualityの全国収集実装を流し込まない。
PR #24はPR #1 Production安定後の正式base整理まで独立laneを維持する。
