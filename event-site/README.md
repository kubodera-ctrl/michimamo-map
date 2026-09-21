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
3. 公式・利用条件確認済みの実イベントを10〜30件だけ投入
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
  - 2026-09-21に公式ページを再確認した10件
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
5. 10イベント / 32開催回 / 任意日付範囲 / QuizKnock関連 / 画像非公開 / anon直読禁止を確認
6. v1 rollback SQLを実行し、対象オブジェクトが全て消えることを確認
7. 最終ROLLBACK

検証後、本番DBに `events` / `regional_sources` / `event_occurrences` 等が残っていないことも再確認済み。
