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

## 2026-10-31：既存MAPへ統合する追加開発（独立サービスではない）

**採用範囲:** ①メールけいしちょうOpen DATA（子ども・女性、声かけ・つきまとい・強盗等、特殊詐欺注意）②前兆事案の年内認知月累計CSV③町丁目別の罪種・手口認知件数（月累計）④47都道府県の窃盗7手口年次データ出典⑤警視庁犯罪情報マップ（前兆事案・アポ電・犯罪）の公式リンクのみ。交通事故マップの取り込み・新規こども110番収集は既存の採用保留を維持。

- `cumulative_sources.py` は **取得済みの公式CSV** を明示カラムマップでオフライン正規化し、期間別の累計スナップショット、変更検知、逆転・消失のレビュー待ち、重複無増加を扱う。CSVの固定ヘッダーは未確認のため、架空ヘッダーのマッピングを本番で勝手に流用しない。CSVの商用再利用条件はメールけいしちょうのCC BY 4.0と混同せず別判定。
- `official_source_registry.json` は以前のGoogle Drive Source_Master全47都道府県のURLを **リンク案内として** 保全。各自治体のデータ・権利・更新周期を実証なしにONへしない。
- `official-police-hub.js` は既存地図の表示選択メニュー内に「防犯公表・統計」を追加し、前兆事案／町丁目統計／アポ電公式リンク／全国の出典を同じ地図画面から閲覧。住民投稿、AED、交番、既存「防犯ニュース」の表示やポイント処理は変更しない。町丁目CSVは発生地点ピンを作らない。
- `integrate_preview.py` は採用済みCoreR3+ASP17の142ファイルとSHAに固定し、上記モジュールをMAP本体の `index.html` に組み込み、管理者ダッシュボード**既存の認証成功後だけ**レビュー状況を読み込むように追加。既存141ファイルはbyte同一。認証の実体を新たに作らない。
- `sql/DRAFT_DO_NOT_APPLY_police_official.sql` は**非実行・非確定のDB差分案**。既存 `admin_validate` と `is_current_user_admin` の存在・引数・戻り値のみ本番read-only確認済み。既存テーブル・ポイント処理を変更せず、今後の権限・本番承認時に吟味する資料である。migration適用やSQL実行成功と混同しない。

**未達（反映前に必要）:** 警視庁実エクスポート列の確認と更新/訂正ID契約、前兆・町丁目CSVのライセンス確認、47県それぞれのデータ実体への適合、既存管理者による真正な承認＋サーバ側公開RPCと履歴、独立した非本番DB/Hosted/Safari差分検証。警視庁元サイトの地図画像・DigiPolice独自素材やAPIは転用しない。これらは従来のまちまもβ公開Gateを増やさない。

**配備禁止:** この成果の ZIP は `test_only_not_for_upload/` 内に146のファイルを持つが、HTML内の参照先は現行Production Supabaseのまま。機能フラグはデフォルトOFF。Cloudflare、実DB、Source ON、Secrets/Auth/DNS、広告/SNS/ポイントに変更なし。実データと適法性、管理者審査と復旧計画の確認後に、初めて通常の公開候補へ移す。

## R8 差分: 権利境界と累計レビューの保全（2026-10-31）

- `rights_evidence_registry_R8_REVIEW_ONLY.json` に**元資料ごと**の根拠と未確認を区別。メールけいしちょうOpen DATAの対象情報は明示的なCC BY 4.0、町丁目統計の公式東京都APIカタログは過年度リソースについてCC BYと記載。**2026年R8に機械的に転用せず**、前兆事案CSVも元ページのリンク自体を権利許諾に代用しない。
- 上記不確かな `precursor` / `town_stats` は、管理画面から承認操作を表示せず、SQL `admin_review_police_official` 側でも `dataset_specific_rights_pending` により拒否。これは**実データ権利が確認できたら審査・変更するための明示的な保留**であり、ソース/掲載をOFFのまま保つ。
- `cumulative_sources.update_history` は月を跨ぐ件数比較の際、`ambiguous_area_rows_held` などのソース由来の要審査フラグを消さないよう修正。保留2行が自動的に解除されないことを再現テストで確認。
- `tests/browser_local_chromium_smoke.py` は実Chrome系ブラウザの完全ネットワーク遮断テスト（架空データ・既存MAPコンテナに相当するDOM要素）。**Cloudflare Hosted・Safari試験ではない。**
- GitHub CIの実CSV再取得はSource修正時に`workflow_dispatch`と`verify_real_csv=true`を明示した場合に限る。過去の実CSV検証Run `41171579593`を正本として保持、無意味な同一原本の繰返し取得なし。
- 現時点で本番DB/Auth/Secrets/Production、既存RSS Cron、ポイント、ASP、SNSへの変更なし。


## R9 2026-10-31: 公式メール実ファイル確認と非公開レビュー専用アダプタ

* 公式公開フォームをChromeで通常操作し、2026-10-20から2026-10-21（翌日0時、終了側排他）の**1日分のみ**取得して一時ランナーで形式確認（実際に送信する日付 `20261020` / `20261021` をチェック）。原文・被害者情報はログ・GitHub・Driveに保存しない。
* **CSV**: 47データ行・5ヘッダー（配信日時／配信表題／配信本文／配信元／配信先）、うち3行は列数不一致につき取込禁止。修復推測・サイレント改変をしない。
* **JSON**: 同じ1日分47件、実際の5キー `message/send_at/send_by/send_to/subject`。定形JSONとして検証済み。**警視庁の安定ID・訂正・取消・発生地点・日時書式の真正な意味は未確認**、掲載は不可。
* `mail_json_private_review.py` は上記実5キーのみを許可し、非公開レビュー用データを所有者専用0700ディレクトリ内の0600ファイルへ原子的に保存。出典発行IDを生成せず、内部レビューキーを「公式事案ID」と誤認しない。`review_status=pending_identity` / `rights_status=unverified` / 位置不明 / 公開OFF / DB転送不可。CLI stdoutにはSHA・件数等のメタデータのみ。出力内容には本文が含まれるため、**Git/Drive/サイト/チャットへのアップロードは禁止**。
* ローカル利用例（結果ファイルはGitHub作業ツリーの**外**に置くこと）：

```bash
mkdir -m 700 -p /tmp/mail_source_private
# 本人管理下の正規エクスポートJSONを /tmp/mail_source_private/input.json に配置
python mail_json_private_review.py --input /tmp/mail_source_private/input.json --output /tmp/mail_source_private/review.json
```

* 本番反映条件：個別の訂正/取消照合とID審査、資料別著作権、管理者認証・監査を伴う実DB審査、Cloudflare保護付きHosted・Safari・既存MAP回帰、復旧IDと限定承認。**従来β公開の新Gateにしない**。
