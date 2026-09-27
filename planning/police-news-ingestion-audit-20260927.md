# 警視庁・防犯ニュース取得／サイト反映監査 2026-09-27

対象: まちまも official ニュースデータ、GitHub Actions police_cron.yml、Supabase public.spots、Drive まちまも_ニュース自動化_統合検証データ_v0.2

## 結論

- 警視庁側の一次データ公開は継続している。
- まちまもProduction DBへの自動反映は現在止まっている。public.spots.category='official' の最新 created_at は 2026-09-19 06:15:37 UTC。
- .github/workflows/police_cron.yml は現在も 0 0,6,12,18 * * *（6時間ごと）を定義しているが、Actions全runを確認した範囲で最後のscheduled runは #102 / 2026-09-19 06:11:59 UTC。以後scheduled runが作成されていない。
- 最後のrun #102自体はsuccess。ログは RSS 71レーン成功 / 1レーン失敗、599件抽出、新規23件登録、DB登録失敗0件。失敗レーンはMCAP XML parse。
- last run head 30cfae46... からcurrent mainまで police_cron.yml / fetch_police_data.py に差分はなく、停止は当該2ファイルの変更によるものではない。workflowが無効化されているか、schedule enqueue側の問題かは未確定。Productionへ書くため、勝手な手動dispatchは行わない。

## 現在のProduction DB

read-only audit:
- visible official: 1,972件
- 東京らしい行: 220件
- 2026-09作成の official: 1,467件
- 2026-09作成の東京らしい行: 147件
- 最新作成: 2026-09-19 06:15:37 UTC

注意: created_at はDB登録時刻であり事件発生日ではない。東京らしい件数もtitle/address推定なので、警視庁公式件数との直接比較値ではない。

## 警視庁一次データ

2026-09-27確認:
- メールけいしちょう Open DATA は公開継続。
- 公開側は 2026-09-24 配信分まで保持し、ダウンロード可能データは22,415件と表示。
- 犯罪発生情報ページには2026年9月分140件、最新一覧に2026-09-25付情報あり。
- 利用条件はCC BY 4.0。出所表示、訂正追従、事実と異なる加工を避けること、地図で無関係な施設/住宅を関連地点と誤認させないことが必要。

Drive Events_Verified には2026-09-24公開の東京3件（練馬区、八王子市、板橋区）が TEST_OK / CC BY 4.0として存在するが、Production DB/管理画面runtimeへは未接続。

## 現行取得方式の問題

fetch_police_data.py は警視庁Open DATAを直接取得していない。

現在:
1. MCAP safety feed
2. Google News RSSを東京23区・多摩・46道府県等の検索laneで取得
3. keyword/address抽出
4. Nominatimで住所ジオコード
5. spots(category=official) へinsert

したがって、
- 警視庁一次情報の更新と同期保証がない
- source URL / source event ID / rights / verified facts / correction stateをDBへ保持しない
- dメニュー等の二次ニュースを official categoryへ混在させる
- 取得数を増やしても品質・権利・訂正追従が改善しない

## 件数増加の可否

技術的には可能。ただし単純なlane limit増加は採用しない。

現コード上は東京23区25件、東京多摩25件、大都市30件、その他25件、横断lane40件などまで取得可能で、最後のrunでも599件抽出できている。ボトルネックは「検索上限」より以下:
- scheduleが9/19以降停止
- duplicate除外
- address抽出
- geocode成功率
- source/facts/rights不足
- map frontendが spots 全件を一括SELECTして全marker/circleを生成する構造

警視庁Open DATA自体には現行DBよりはるかに多いデータがあるため、保存件数は増やせる。ただし22,415件をそのままMAPへ表示しない。

## Nominatim注意

現行は新規候補ごとに公開 nominatim.openstreetmap.org へ約1.5秒間隔で住所検索する。
OSMFの現行policyではheavy use最大1req/secに加え、定期的なbulk geocodingは強く非推奨で、定期実行scriptは4req/minに制限しcacheを求めている。
件数増加前にこの依存を外す/縮小する。

推奨:
- ニュース動画/管理候補では正確な現場座標を不要とし、市区町村代表座標を自前マスターから利用
- 同一市区町村は座標cache
- MAP公開用に本当に個別座標が必要なデータだけ別geocode pipeline
- public Nominatimを6時間ごとの大量処理の主geocoderにしない

## 推奨する次構成

1. 警視庁Open DATAを東京の一次sourceとして直接取得。
2. raw/source recordを spots へ直接入れず、news candidate/source layerへ保存。
3. 最低限 source_event_id / source_org / source_url(or canonical source ref) / occurred_at / published_at / prefecture / municipality / category / verifiedFacts / rights / source_hash / correction_status を保持。
4. 訂正・解決・削除をsource_hash/source_event_idで追従。
5. TEST_OK/PUBLISHABLE だけProduction候補へ上げる。
6. 管理画面はcandidate layerをread-only表示し、旧 spots.official は LEGACY_UNVERIFIED と明示。
7. MAPに出す場合はviewport/地域単位RPCへ変更し、全件SELECT/全marker生成をやめる。
8. Tokyo直結が安定後に他道府県の一次sourceをSource_Master順に追加。

## 実施していないこと

- police cronの手動dispatch
- workflow enable/disable変更
- Production DB insert/update/delete
- Production migration
- 警視庁Open DATA全件取込
- MAPへの表示件数増量

これらはProduction変更となるため、原因確定・Preview/隔離検証後に実施する。
