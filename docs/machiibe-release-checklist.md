# まちイベ 公開前実機チェック表

更新: 2026-09-23

## 方針

同じ公開候補を **3周** 確認する。

1. **Round A — コード/データ確認**: 自動テスト・DBドライラン・出典整合
2. **Round B — 実機確認**: iPhone Safari通常/プライベート + PC
3. **Round C — 本番直前/直後確認**: noindex状態で本番相当確認 → 公開後再確認

1周で問題を見つけた場合は、修正後にその項目をAからやり直す。

---

## Round A — コード/データ

### 検索
- [ ] 今日 / 明日 / 今週末 / 30日以内
- [ ] 任意の1日
- [ ] 任意の期間
- [ ] 逆順の日付を正常化
- [ ] 都道府県
- [ ] キーワード
- [ ] 除外ワード
- [ ] カテゴリ
- [ ] 年齢
- [ ] 料金
- [ ] 推し活
- [ ] アクセシビリティ
- [ ] 屋内だけ
- [ ] **雨の日の室内遊び** = 屋内 + 子ども/ファミリー + 大人向け除外
- [ ] 並び順
- [ ] ページ送り後も条件維持
- [ ] 保存検索後も条件維持

### データ品質
- [ ] slug重複なし
- [ ] start_date <= end_date
- [ ] 情報源台帳に存在するsource_keyだけ使用
- [ ] 公式/発見用の区分が明確
- [ ] discovery_onlyを公開しない
- [ ] image_policy=not_usedを維持
- [ ] 中止/延期/完売/受付終了の状態反映
- [ ] recurring/irregularは実開催日を確認
- [ ] 同日複数回を別occurrenceとして保持

### 多言語
- [ ] 日本語URLは既存URLのまま
- [ ] /en /zh-cn /zh-tw /ko が同じ公開ルートへ安全にrewriteされる
- [ ] 言語切替後も検索条件・保存・予定・イベント詳細のlocaleが維持される
- [ ] html lang / Content-Language / canonical / hreflangが一致
- [ ] 未レビュー機械翻訳をapprovedにできない
- [ ] approved翻訳が無い場合は日本語へfallback
- [ ] 英語/簡体字/繁体字/韓国語で検索UI・カード・詳細・保存・予定の主要操作が可能

### DB境界
- [ ] anonからevents等を直接SELECT不可
- [ ] 公開RPCのみ実行可
- [ ] publishedはverified + source allowedのみ
- [ ] service_roleがクライアントへ露出しない
- [ ] migration → seed×2 → smoke → rollback が通る

---

## Round B — 実機

### iPhone Safari 通常
- [ ] TOPの横幅/ズーム異常なし
- [ ] PC表示にならない
- [ ] 日付指定UIが操作できる
- [ ] 雨の日の室内遊びが1タップで使える
- [ ] 検索結果カードが1列
- [ ] 画像なしカードでもレイアウト安定
- [ ] 詳細ページの全ボタンが押せる
- [ ] Google/Apple Maps
- [ ] Google Calendar
- [ ] ICS
- [ ] 行きたい/行った
- [ ] おでかけプラン
- [ ] MAPディープリンク

### iPhone Safari プライベート
- [ ] レイアウト崩れなし
- [ ] localStorage未保存時もエラーなし
- [ ] 保存系機能が失敗してもページ自体は使用可能
- [ ] 管理画面は未認証で開けない

### PC
- [ ] イベント一覧2列
- [ ] 検索フォームの折返し正常
- [ ] PR枠が広告と明示
- [ ] 注目記事4カード
- [ ] 長期イベント折りたたみ
- [ ] ページング

### 管理画面
- [ ] 隠し5タップ → /admin
- [ ] パスワード必須
- [ ] イベント運営編集が開ける
- [ ] 未確認イベントをpublishedにできない
- [ ] source未許可をpublishedにできない
- [ ] 中止/延期/完売/受付終了へ変更可能
- [ ] X素材
- [ ] TikTok 1080×1920
- [ ] TikTokアイコン表示
- [ ] TikTok長文/絵文字切れなし

---

## Round C — 本番直前/直後

### noindexのまま
- [ ] robots.txt Disallow
- [ ] X-Robots-Tag noindex
- [ ] canonicalが本番予定URL
- [ ] sitemapが意図したページだけ
- [ ] 本番Supabaseに初期データ投入
- [ ] 45件以上のverified実イベントが検索できる
- [ ] 雨の日向けで屋内ファミリー候補が出る
- [ ] 404/通信失敗/0件を区別

### index解放前
- [ ] Search Console設定
- [ ] GA設定
- [ ] 訂正/掲載停止フォーム
- [ ] 管理者パスワード16文字以上
- [ ] セッションsecret 32バイト以上
- [ ] Cloudflare側/admin loginレート制限

### 公開直後
- [ ] TOP 200
- [ ] detail 200
- [ ] sitemap 200
- [ ] robots/index状態確認
- [ ] Supabase advisory再確認
- [ ] X/TikTok実投稿1件ずつ目視
- [ ] まちまもMAP連携1件実走


## ポリシー・法務導線

### Round A — 内容・実装
- [ ] /policies から全ポリシーへ到達できる
- [ ] 利用規約
- [ ] プライバシーポリシー
- [ ] 外部送信について
- [ ] イベント情報・データポリシー
- [ ] 広告・アフィリエイトポリシー
- [ ] 著作権・商標・リンク方針
- [ ] 免責事項
- [ ] アクセシビリティ方針
- [ ] 訂正・掲載停止・権利侵害申告
- [ ] 運営者情報
- [ ] footerから主要ポリシーへ到達できる
- [ ] PR/広告枠には広告と分かる表示がある
- [ ] アフィリエイト導入時も対象リンク付近の表示が明瞭
- [ ] raw検索語をGoogle Analyticsへ送らない
- [ ] Google Analytics / Supabase / OpenStreetMapの外部送信説明が実装と一致
- [ ] 画像・ロゴは利用条件確認前に公開しない
- [ ] facts-only確認と自動取得許諾をDB上で別管理

### Round B — 設定
- [ ] NEXT_PUBLIC_OPERATOR_SITE_URL
- [ ] NEXT_PUBLIC_CONTACT_URL
- [ ] NEXT_PUBLIC_CORRECTION_FORM_URL
- [ ] NEXT_PUBLIC_GA_MEASUREMENT_IDの実設定と外部送信説明が一致
- [ ] β期間はNEXT_PUBLIC_ALLOW_INDEXING=false
- [ ] β期間のsitemapが空
- [ ] /partnersは公開後もnoindex

### Round C — 本公開直前
- [ ] ポリシー最終更新日を確認
- [ ] 実際に導入したASP/広告事業者に合わせて広告方針を再確認
- [ ] 新たな外部SDK/埋め込みが増えていないか確認
- [ ] 直接販売機能を追加した場合は必要な販売事業者表示を追加
- [ ] 主催者投稿機能を追加した場合は投稿者向け規約・権利保証条項を追加
