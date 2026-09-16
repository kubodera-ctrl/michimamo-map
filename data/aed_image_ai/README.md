# AED画像AI事前チェック・マスクプレビュー

## 実装範囲
- 管理者画面から明示的に実行。サーバーでログイン・管理権限・管理パスワードを検証。
- 非公開AED投稿写真をサーバーからOpenAI Responses APIへ送信。GPSや投稿者名を別途プロンプトへ追加しない。通常投稿画面の画像変換・EXIF除去を継続。
- 固定モデル gpt-4.1-mini-2025-04-14、store:false。応答のAED候補・顔候補・ナンバー候補・画質・矩形を厳格検証。ナンバー文字列や人物の身元は取得しない。
- AI結果は管理者だけが読める。承認／否認・公開・ポイント処理は変更しない。
- 同一写真の完了結果は再利用。実行中／失敗直後は2分待機。全管理者合計で日本時間1日100回まで（失敗もカウント）。
- モザイク候補プレビュー、ドラッグで範囲追加、追加範囲取消、確認後JPEG保存を実装。自動検出矩形は15%ずつ広げる。
- 加工画像は管理者の端末に保存するだけ。サーバーへの加工画像保存、投稿者への加工画像表示、自動公開、10日削除／保全延長は今回の対象外。

## 有効化
この作業では本番のAPIキーやSecretsの設定値を確認・変更できていない。実画像をAIに送信する試験も未実施。
1. Supabase対象プロジェクトのEdge Functions → Secretsに OPENAI_API_KEY を設定（キーをチャット・GitHub・フロントエンドへ貼らない）。
2. AED_AI_ENABLED を true に設定。停止時は false にする。
3. 管理者画面のAED審査で「AI接続状態を確認」を押す。キー文字列そのものは応答に含めない。
4. 同意を得たテスト画像で「AIで事前チェック」を実行し、結果・見落とし・モザイク位置を人が比較する。一般公開はされない。
5. 無関係画像、AED標識だけ、実物、ぼけ、逆光、顔・ナンバー、複数対象で精度を評価してから運用範囲を広げる。

有効化後のAPI利用には利用料が発生する。API側の予算設定も用いる。100回は技術上の上限で、金額上限の保証ではない。
store:falseを無保存・ゼロデータ保持の保証とは扱わない。利用サービスのデータ取扱条件を確認する。

## 検証
- tests/aed_image_ai.test.mjs：疑似API応答で構造検証、拒否・不完全応答・429、JPEG入力制限、矩形余白・異常座標。
- tests/aed_image_ai_transaction.sql：ROLLBACK検証。service限定実行、非管理者閲覧不可、結果偽造拒否、再送待機、キャッシュ、日次上限、審査／ポイント不変、投稿削除時連動削除。
- 既存AED審査ロジック、クイズUI／HTML内JS構文の回帰テスト通過。
- 実画像を使うAI応答、ブラウザーでのCanvas描画・保存、iPhoneタッチ補正、実ログイン審査E2Eは未確認。Chromium取得が失敗する検証環境の制約を継続。
- 本番Edge Functionのverify_jwtはfalseだが、関数内のauth.getUserと管理権限・パスワード検証で必ず認証する。秘密鍵を公開クライアントに渡さない。
- Advisorsのprivate予算表「RLS有効・ポリシーなし」は一般利用者を拒否する意図したINFO。既存警告を全解消したという意味ではない。

## 限界
画像モデルの矩形位置・対象検出は不正確なことがある。検出ゼロは個人情報なしの保証ではなく、モザイク済みでも目視確認が必須。加工の失敗を原画像の自動公開に置き換えない。原画像は引き続き非公開。審査チェックやモザイク保存はAIの判定だけで実行しない。

参考：
- [OpenAI画像入力](https://developers.openai.com/api/docs/guides/images-vision)
- [構造化応答](https://developers.openai.com/api/docs/guides/structured-outputs)
- [モデル](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [データ取扱](https://developers.openai.com/api/docs/guides/your-data)
- [Supabase RLS診断](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
