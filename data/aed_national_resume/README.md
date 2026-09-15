# AED全国一括処理・再開入口

2026-09-15 第1波の公開・anon地図取得確認済み。全国41,987件、掲載469/1,741自治体、未掲載1,272自治体。

## 運用方針

全国一括調査 → 処理できるものを大量公開 → 残った例外を解決。県を順番に3つ選ぶ制限は設けない。ユーザーは安全に投入できるものの本番反映まで承認済み。
全自治体への反映を目指す。掲載1件以上と全施設網羅を区別し、情報源未確認・公開不可を完了として数えない。

## 次の処理

1. `municipality_queue.json` の `candidate_processing_required` 44自治体を候補情報源単位でまとめて処理。
2. `candidate_profiles.json` の理由に応じて、座標列変換・住所ジオコーディング・AED対象リソース選択・ダウンロード再試行・利用条件確認をまとめる。緯度経度があるだけで公開可とはしない。
3. `source_discovery_required` 1,228自治体は、県域データ、自治体公式サイト、消防の広域情報源を全国横断で調査。調査済みと不存在は区別する。
4. 既掲載自治体の未取得情報源と、今回の48除外行・13保留行も追跡する。未掲載自治体ゼロだけで全AED網羅とはしない。

## 優先処理候補（未掲載）

| 都道府県 | 自治体 | 候補データセット | 処理状態 |
|---|---|---|---|
| 栃木県 | 真岡市 | 092096_p_7010_7010 | address_geocoding_or_column_mapping_required |
| 神奈川県 | 横須賀市 | 142018_wagamap_lid_54, 142018_wagamap_lid_56, 142018_wagamap_lid_55 | download_or_resource_selection_required |
| 静岡県 | 静岡市 | 221007_hokeneisei20221208-001 | address_geocoding_or_column_mapping_required |
| 愛知県 | 名古屋市 | 231002_7107010000_subway-stationaed | address_geocoding_or_column_mapping_required |
| 滋賀県 | 湖南市 | 252115_ | address_geocoding_or_column_mapping_required |
| 滋賀県 | 高島市 | 252123_004103_000001 | address_geocoding_or_column_mapping_required |
| 大阪府 | 堺市 | 271403_sakai_aed | address_geocoding_or_column_mapping_required |
| 大阪府 | 豊中市 | 272035_aed | download_or_resource_selection_required |
| 大阪府 | 茨木市 | 272116_p_36258_36258 | address_geocoding_or_column_mapping_required |
| 大阪府 | 門真市 | 272230_aed | address_geocoding_or_column_mapping_required |
| 兵庫県 | 三田市 | 282197_aed | coordinates_and_license_review_required |
| 和歌山県 | 海南市 | 302023_aed | address_geocoding_or_column_mapping_required |
| 岡山県 | 岡山市 | okayama_2815 | download_or_resource_selection_required |
| 岡山県 | 津山市 | okayama_190 | download_or_resource_selection_required |
| 岡山県 | 玉野市 | okayama_3160 | download_or_resource_selection_required |
| 岡山県 | 笠岡市 | okayama_640 | download_or_resource_selection_required |
| 岡山県 | 浅口市 | okayama_646 | address_geocoding_or_column_mapping_required |
| 岡山県 | 早島町 | okayama_651 | address_geocoding_or_column_mapping_required |
| 岡山県 | 里庄町 | okayama_653 | download_or_resource_selection_required |
| 岡山県 | 矢掛町 | okayama_652 | download_or_resource_selection_required |
| 岡山県 | 鏡野町 | okayama_471 | address_geocoding_or_column_mapping_required |
| 岡山県 | 勝央町 | okayama_955 | address_geocoding_or_column_mapping_required |
| 岡山県 | 奈義町 | okayama_1084 | coordinates_and_license_review_required |
| 岡山県 | 久米南町 | okayama_1019 | address_geocoding_or_column_mapping_required |
| 岡山県 | 美咲町 | okayama_781 | aed_resource_selection_required |
| 岡山県 | 吉備中央町 | okayama_6036 | address_geocoding_or_column_mapping_required |
| 福岡県 | 北九州市 | 401005_aed_ktq | address_geocoding_or_column_mapping_required |
| 福岡県 | 直方市 | 402044_aed | address_geocoding_or_column_mapping_required |
| 福岡県 | 大川市 | 402125_0009100_00011 | coordinate_format_review_required |
| 福岡県 | うきは市 | 402257_0020 | address_geocoding_or_column_mapping_required |
| 長崎県 | 長崎市 | 422011_aed_gk, 422011_aed_k | address_geocoding_or_column_mapping_required |
| 長崎県 | 佐世保市 | 422029_aedmap | address_geocoding_or_column_mapping_required |
| 長崎県 | 島原市 | 422037_aed | address_geocoding_or_column_mapping_required |
| 長崎県 | 波佐見町 | 423238_01 | download_or_resource_selection_required |
| 熊本県 | 宇城市 | 432130_aed | address_geocoding_or_column_mapping_required |
| 熊本県 | 天草市 | 432156_amakusa002 | coordinates_and_license_review_required |
| 宮崎県 | 都城市 | 452025_aed_list | address_geocoding_or_column_mapping_required |
| 宮崎県 | 延岡市 | 452033_aed | address_geocoding_or_column_mapping_required |
| 宮崎県 | 日南市 | 452041_20250601027 | aed_resource_selection_required |
| 宮崎県 | 都農町 | 454061_aed | address_geocoding_or_column_mapping_required |
| 鹿児島県 | 鹿児島市 | 46201_aed-minkan, 462012_aed-shi, 462012_aed-kuniken | coordinates_and_license_review_required |
| 鹿児島県 | 南さつま市 | 462209_aed | address_geocoding_or_column_mapping_required |
| 鹿児島県 | 姶良市 | 462250_aed | address_geocoding_or_column_mapping_required |
| 鹿児島県 | 肝付町 | 464929_aed01 | address_geocoding_or_column_mapping_required |

## 証跡・再現

- `sources.json` / `raw/`: 公開に使った15情報源、URL、ハッシュ、利用条件、原本。
- `survey_scope.json`: カタログ検索の対象と範囲。全国の公式情報源調査完了ではない。
- `review_reports.json` / `row_exceptions.json`: 行単位の公開・保留・除外理由。
- `public_duplicate_holds.json`: 本番近接重複検査で追加確認に回した11行。ほか2行は事前の近接重複検出。
- `batch_index.json` / `production_runs.json`: 18件のSQLハッシュ、rollback事前検証とcommit結果。
- `anon_rpc_results.json`: 15自治体すべてで公開件数と地図API取得件数が一致。
- `municipality_queue.json`: 全1,741自治体を公式コードで管理した本番実数と残作業。

再生成: `python scripts/prepare_aed_national_resume.py`（openpyxlが必要）および `python scripts/finalize_aed_national_resume.py`。生成のみでDB接続・書込みはしない。
この第1波SQLは投入済み。再実行しない。次の公開は新しい波のディレクトリと最新本番ベースラインを使う。既存公開キーを上書きしない。
各自治体の検証は分離し、最大150行の独立トランザクションで、公開済みデータとの重複照合・件数ガード・rollback事前検証を通す。複数チャンクでは先行チャンクとの近接重複も照合する。
今回の本番ガードは倉敷・総社・霧島の後続チャンクで施設候補を検出。失敗したrollbackで公開変更なし。11行を保留に振り分け、投入済み17チャンクのSQLハッシュが不変であることを確認しながら再生成した。
自治体コードが違う行、貸出専用、外部利用不可、住所と座標の不整合はそのまま公開しない。出典の利用可能日時・設置位置・更新日を保持する。

## 調査範囲の限界

BODIKはAED検索結果196データセットを全件取得・照合し、当時未掲載40自治体45データセットを抽出。データセットにAED以外のリソースが混在するためリソース選択も要審査。
島根19件・岡山20件のカタログページも取得。岡山は取得した検索一覧ページ分で全ページ調査完了ではない。鳥取は今回の検索で既掲載自治体の2件のみ。
情報源が未確認の自治体は「データなし」扱いにしない。公開利用条件の未解決や古い情報源の更新確認は残件として扱う。
