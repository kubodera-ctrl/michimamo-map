# まちまもイベント

まちまもMAPの第二軸となる全国イベント検索サイトの E0/E1 基盤です。

## 構成

- Next.js App Router
- 既存のまちまも Supabase を共用
- DBテーブルの一般直接公開なし
- 公開検索・詳細・sitemap は public RPC 経由
- Vercel はこの `event-site/` を Root Directory に指定して、MAPとは別Projectとしてデプロイ

## 初回セットアップ

1. `supabase/migrations/20260918235500_event_platform_foundation.sql` を検証環境でレビュー・適用
2. `.env.example` を元に Vercel 環境変数を設定
3. `npm install`
4. `npm run typecheck`
5. `npm run build`

## 公開ルール

- 実在イベントを出典未確認のままダミー投入しない
- `regional_sources.event_use_allowed=true` は取得・再利用条件を確認してから設定
- `verification_status=verified` と `publication_status=published` の両方を満たすイベントだけ一般公開
- 画像は `image_usage_status=allowed` の場合だけ公開RPCから返す
- 全国一括収集より先に限定地域で、重複・更新・期限・訂正・削除を検証する
- MAP側の `?lat=&lng=&event=` ディープリンク受取は次フェーズで実装する

## 次の開発

E0: 情報源台帳と限定地域の取り込み検証  
E1: 今日・明日・今週末・30日・地域・子ども向け検索  
E2: まちまもMAPのAED・交番・WBGT・周辺情報へ接続  
E3: 全国SEO、canonical、構造化データ、サイトマップ強化  
E4: 主催者無料投稿と審査  
E5: PR・スポンサー・収益化
