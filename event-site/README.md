# まちイベ

「まちイベ」は、まちまもMAPの第二軸となる全国イベント検索・おでかけ支援サイトです。

## 構成

- Next.js App Router
- 既存のまちまも Supabase を共用
- DBテーブルの一般直接公開なし
- 公開検索・詳細・sitemap は public RPC 経由
- 本番はMAPと分離してデプロイし、現在のv1確認は Cloudflare Workers の `machiibe-preview` を使用

## 初回セットアップ

1. `supabase/migrations/20260918235500_event_platform_foundation.sql` を検証環境でレビュー・適用
2. `.env.example` を元に環境変数を設定
3. `npm install`
4. `npm run typecheck`
5. `npm run build`

## 公開ルール

- 実在イベントを出典未確認のままダミー投入しない
- `regional_sources.event_use_allowed=true` は取得・再利用条件を確認してから設定
- `verification_status=verified` と `publication_status=published` の両方を満たすイベントだけ一般公開
- 画像は `image_usage_status=allowed` の場合だけ公開RPCから返す
- 全国一括収集より先に限定地域で、重複・更新・期限・訂正・削除を検証する
- MAP側は `?lat=&lng=&event=` を安全に受け取り、確認済み会場座標がある場合だけイベント位置へ初期表示する

## 次の開発

E0: 情報源台帳と限定地域の取り込み検証  
E1: 今日・明日・今週末・30日・地域・子ども向け検索  
E2: まちまもMAPのAED・交番・WBGT・周辺情報へ接続  
E3: 全国SEO、canonical、構造化データ、サイトマップ強化  
E4: 主催者無料投稿と審査  
E5: PR・スポンサー・収益化

## ブランド

- 公開サイト名: **まちイベ**
- 親ブランド: **まちまも**
- 表示例: **まちイベ by まちまも**
- 内部フォルダ名 `event-site/` と既存DB名は、不要な破壊的変更を避けるため当面維持する

## 運営SNS素材

管理画面の「新しく検出されたイベント」から、公開済み・確認済みイベントだけSNS素材を作成できる。

- X: 確認済みDB情報だけで投稿文を生成し、X投稿画面を開く
- TikTok: 1080×1920の9:16 PNGと投稿キャプションを自動生成
- TikTokへの自動投稿・アカウント連携は行わない
- TikTok用PNGには正式な「まちイベ」アイコンを必ず表示する
- イベント写真はMVPでは使用せず、ブランドテンプレートだけで成立させる
- TikTokのUIに重要情報が重なりにくいよう、タイトル・日時・会場・CTAを安全領域へ収める
- 長いイベント名や絵文字を含むタイトルでも、文字切れ・サロゲート分断を避けて自動調整する
- 生成したPNGを保存し、キャプションをコピーしてTikTokアプリから手動投稿する

## v1確認の順序

1. CloudflareプレビューでPC / スマホUIを確認
2. 管理画面のX・TikTok素材生成を確認
3. 公式・利用条件確認済みの実イベントを30件から段階投入
4. 単日 / 長期 / 無料 / 有料 / ファミリー / 推し活 / 不定期を混ぜて検索・詳細・MAP連携を確認
5. 問題なければ地域単位から全国へ拡大する

本番Supabase migrationは、上記プレビュー確認が終わるまで適用しない。


## 本番公開前の運用ゲート

- `MACHIIBE_ADMIN_PASSWORD` は十分に長いランダム値、`MACHIIBE_ADMIN_SESSION_SECRET` は32バイト以上のランダム値を使用する
- Cloudflare側でも `/api/admin/login` にレート制限を設定する。アプリ内レート制限はWorkerインスタンス内の補助防御であり、分散環境全体の防御としては扱わない
- `event-site/package-lock.json` を本番公開前に生成・コミットし、CIは最終的に `npm ci` へ切り替える
- `NEXT_PUBLIC_ALLOW_INDEXING=true` は独自ドメイン・canonical・Search Console確認後にだけ有効化する
- 本番Supabase migration適用前に、CIのSQL migration / smoke / real fixture smokeをすべて通す


## 開発3：実データ投入準備

- 任意の日付指定を追加
  - 1日だけ：開始日のみ選択
  - 期間：開始日 + 終了日
  - 逆順日付は自動正規化
  - 最大400日間に制限
  - ページ送り・保存検索にも日付条件を保持
- 本番初期投入用seed: `supabase/seeds/machiibe_initial_verified_events.sql`
- verified batch2: `supabase/seeds/machiibe_verified_events_batch2.sql`
  - 2026-09-21〜22に公式ページを再確認した30件（初期17件 + verified batch2 13件）
  - イベント画像は一切転載せず `image_usage_status=not_used`
  - 2回実行しても重複しないidempotent設計
- v1専用rollback: `supabase/rollback/machiibe_v1.sql`
  - 既存まちまもテーブル・関数には触れず、まちイベv1オブジェクトだけを削除

### 本番DB相当のROLLBACK検証

2026-09-21、本番Supabase上で次を1トランザクション内に実行し、最後にROLLBACKした。

1. event platform migration
2. family dining migration
3. admin analytics migration
4. production seedを2回連続実行
5. 30イベント / 38開催回 / 任意日付範囲 / QuizKnock・呪術廻戦・刀剣乱舞・ムーミン関連 / 画像非公開 / anon直読禁止を確認
6. v1 rollback SQLを実行し、対象オブジェクトが全て消えることを確認
7. 最終ROLLBACK

検証後、本番DBに `events` / `regional_sources` / `event_occurrences` 等が残っていないことも再確認済み。


## 開発4準備：イベント拡張と雨の日検索

- 「☔ 雨の日の室内遊び」ショートカット
  - 屋内
  - 子どもが主役 / ファミリー向け
  - 大人向け除外
  を一括適用する
- 関東情報源台帳: `data/machiibe/source_registry_kanto_v1.json`
  - 26ソース
  - 公式施設ページと観光ポータルを用途分離
  - 自動取得は規約確認まで無効
- 関東候補プール: `data/machiibe/candidate_events_kanto_v1.json`
  - 61候補
  - 東京18 / 千葉18 / 埼玉12 / 神奈川13
  - 雨の日向け候補21
  - 候補は全件 publishable=false / image_policy=not_used
  - 公式詳細・公式運営発表を再確認した20候補をproduction seedへ昇格
- 管理画面にイベント確認・公開編集を追加
  - verified + 情報源利用許可 + 情報源active の3条件なしではpublishedへ変更不可
- 3周確認方式を `docs/machiibe-release-checklist.md` に固定


### 30件版production seed 再ドライラン

2026-09-22、本番Supabase上で以下を1トランザクション内に実行し、最後にROLLBACKした。

- migration 3本
- 初期seed 17件
- verified batch2 13件
- 2セットを再実行しても重複なし
- 合計30イベント
- occurrence 38件
- 10月期間検索
- 雨の日検索（屋内 + 子ども/ファミリー + 大人向け除外）
- 宇宙兄弟 / ホロライブ / Dr.STONE / ポケモン / サンリオ / しなこ / おでかけ子ザメ / 銀河鉄道999 の推し活紐付け
- 全イベント image_usage_status=not_used
- anonからevents直接SELECT不可
- publishedはverified + source利用許可 + source active
- v1 rollback後に対象オブジェクトが残らないことを確認

検証後、本番DBは未変更。


## 情報提供・データ連携向け説明ページ

- `/partners`
- API提供元、自治体、観光協会、施設、スポンサー等に共有する事業説明ページ
- β公開準備中であることを明記
- 全国化・定期更新・差分確認・重複統合・確認後公開の方針を説明
- 出典保持、規約確認、画像権利、訂正/掲載停止の運用方針を説明
- 公開前の営業・問い合わせ用途のためページ単体は `noindex,follow`


## 公開ポリシー・法務導線

公開前に以下を実装し、`/policies` から一元案内する。

- `/terms` 利用規約
- `/privacy` プライバシーポリシー
- `/external-transmission` 外部送信について
- `/data-policy` イベント情報・データポリシー
- `/advertising-policy` 広告・アフィリエイトポリシー
- `/copyright` 著作権・商標・リンク方針
- `/disclaimer` 免責事項
- `/accessibility` アクセシビリティ方針
- `/corrections` 訂正・掲載停止・権利侵害申告
- `/operator` 運営者情報

### 公開制御

- β期間中は全ポリシーページも `NEXT_PUBLIC_ALLOW_INDEXING=false` に従いnoindex
- sitemapはindex許可前は空配列
- `/partners` は問い合わせ・営業用途のため公開後もページ単体でnoindex
- 本公開後のみ一般ポリシーをsitemapへ追加

### 情報源ガバナンス

`regional_sources` では以下を分離管理する。

- `terms_review_status`
  - `pending`
  - `reviewed_facts_only`（公式ページの事実項目を手動確認して利用）
  - `reviewed_allowed`（確認済み条件の範囲でAPI/RSS/自動取得等を許可可能）
  - `reviewed_restricted`
  - `contact_required`
- `acquisition_mode`
  - manual_facts_only / discovery_only / official_page_monitor / official_api / open_data / rss / partner_feed
- `automated_fetch_allowed`

重要：**手動の事実確認OKと、自動取得・転載・API再利用の許諾は同一扱いにしない。**

自動取得は `reviewed_allowed` かつ許可済み取得方式でなければDB制約上ONにできない。
