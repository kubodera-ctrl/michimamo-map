# まちまもMAP｜警視庁 Open DATA 追加モジュール vNext（非本番・差分候補）

**STATUS: OFFLINE_ADAPTER_TESTED / MAP_OVERLAY_TESTED / REVIEW_ADMIN_NOT_CONNECTED / NO_HOSTED_QA / NO_PRODUCTION**

仕様正本（2026-10-31 v0.1）：https://docs.google.com/document/d/1NfSyOtHJf8CiQvYSBl4g_pap6qok-L1m0Py-aFa7XcA/edit

このディレクトリは**既存まちまもMAPへの追加**用。独立サイトではない。既存の `fetch_police_data.py` と `.github/workflows/police_cron.yml` は変更しない。既存の `official` RSSニュースと `local_anomaly.police_safety` は公的Open DATAと別物として扱う。**ポイント・スタンプ付与処理は一切呼ばない。** SNS/ASPへ通知しない。新Cronなし。

## 実在ソースと形式の確定境界

* 正式ソース：<https://mail.keishicho.metro.tokyo.lg.jp/opendata/>。規約：<https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy>。対象データはCC BY 4.0。出所、変更、訂正、表示による位置誤認に注意。警察監修アプリを名乗らない。
* 2026-10-31の調査では、Webページに**出力形式の選択UI**を確認したが、**機械取得の固定API/公式CSV列スキーマ・URLの恒久性は未確認**。スクレイピングのエンドポイントを推定して自動アクセスする実装にはしていない。
* `ingest.py` は**ユーザー/管理者が取得済みの公式エクスポートファイル**をローカルで正規化する。CSVの列名は公式エクスポート確認後に**明示的なカラムマッピング**で接続。`fixtures/*` は**架空**のテストデータであり警視庁発表の転載ではない。マッピング例を実データのスキーマ確証として流用しない。
* `fetched_at` 相当はインポート時刻 `last_success_at` と分け、配信/発生/認知日時は原本にある場合だけ保持。日本時間や発生日を推定補完しない。事件地点が町丁目や自治体までなら**座標を持たせず一覧表示のみ**。住所からジオコーダー重心を採用しない。
* 発行元IDは `tokyo_mail_keishicho_opendata` に限定、出所URLとライセンス固定。見知らぬ出所・未知の状態・別スキーマは失敗として止める。訂正/取消は**原本識別子+revision**がある場合に履歴管理。識別子なしは `pending_identity` で自動掲載不可。
* 取込はローカルのJSONスナップショットを原子的に差し替え、同一revisionの重複は1件のまま。訂正や取消は再承認待ちに戻し、古い内容を自動表示しない。取得/検証失敗は前回の完全スナップショットを維持し、別のエラー通知JSONを記録する。

## ローカル実行（実DB・外部接続なし）

```bash
python -m unittest discover -s tests -p 'test_ingest.py' -v
node tests/test_layer.cjs
python ingest.py --input fixtures/synthetic.csv --mapping fixtures/mapping.synthetic.json --snapshot /tmp/police-snapshot.json --report /tmp/police-report.json --fixture
```

生成した公式データは**管理者レビュー前の非公開候補**であり、そのまま一般公開しない。`review_status=approved` は正式なadmin境界との統合後に限る。JSONを手動で改変して審査をすり抜けることは承認フローではない。

## 既存MAP統合・レビュー

`official-police-layer.js` と CSS は既存 `#filterWrapper .filter-content` と `#map-container` を再利用し、追加の「警視庁公表」フィルターと一覧を表示する。従来の `data-filter=official`、投稿マーカー、SNS・ポイント系には触らない。

* サーバーで承認済みかつ`active/corrected`のレコードだけ表示。`withdrawn/rejected/pending/fixture/identity_unverified` は非表示。原文は `textContent` として扱い、HTMLを実行しない。
* 位置が不正確な情報は一覧**のみ**。真の根拠付き座標が存在し、かつ `location_source=police_explicit_coordinates` の場合だけ地図マーカーを生成。件数0は安全性を意味しない旨を注記。
* `refresh()` は同一オリジンのスナップショットにしかアクセスしない。失敗時は既存表示を消さず、最終成功時刻を表示する。外部SNS・クリック計測・公式APIへブラウザからの通信なし。
* `integrate_preview.py` で **2026-10-30のCoreR3+ASP17読込修復142-file ZIPのSHA** とフルファイル集合を固定して非本番差分版を作れる。Indexの`</head>`/`</body>`へ読み込みを追加するだけで**他141ファイルはbyte一致**。機能フラグ `MACHIMAMO_POLICE_OFFICIAL_VNEXT_ENABLED` は**デフォルトOFF**。本候補は本番Supabaseに向いているため、出力は`test_only_not_for_upload/`で包み**Hosted配備禁止**。安全な非本番DB/認証/アドミン境界確定後、正式配備方式へ適用すること。

例：

```bash
python integrate_preview.py --baseline /path/to/MAP-R3-ASP17-CANDIDATE-142-READY-FOR-APPROVAL-20261030.zip --output /tmp/MAP-POLICE-NONPROD-TEST-ONLY.zip --manifest /tmp/MAP-POLICE-NONPROD-TEST-ONLY.manifest.json
```

## 既存取得経路との対応・残ゲート

* 既存 `fetch_police_data.py`: Google News等のRSS・Nominatim・`spots.category=official`。本番実稼働未確認。60日超削除が取得より前、地名での地理重心がピンになり得るため既存運用の独立修正候補（**このPRで変更・Cron実行しない**）。
* 既存 `.github/workflows/police_cron.yml`: 6時間ごと。実行実績とsecret/pipeline稼働は未確認。**新規Cronは作成しない**。
* 既存ニュース管理/SNS承認：本番の管理者auth boundaryの実コードとデータ契約を特定できるまで別画面を有効化しない。現時点では取込report JSONのみ。`review_status`を正式に変更するadmin RPC/運用と、RLSを含む保存先スキーマは未実装。実DBへは適用していない。
* Phase 2（前兆事案月累計CSV・町丁別認知件数CSV）は列と利用権の確認待ち。月累計を月間事件数として単純加算しない。Phase 3全国47都道府県リンクは既存Driveの `Source_Master` を再利用し、年次窃盗7手口を速報扱いしない。
* β公開のGate増設なし。一般公開/ASP/Auth/DB/Secrets/DNS/課金/SNS投稿には**一切変更なし**。

## テスト境界

Python 12件（オフライン ingest・重複/訂正/取消/失敗時保全・位置精度・元142保持）、Nodeの公式表示層重点差分テスト。実CSV列・実ネット取込・Supabase・Hosted・Safariの正規/Private・管理者承認操作・UIスクリーンショットは未検証。
