# まちイベ 多言語対応仕様

更新: 2026-09-23

## 対応言語 v1

- 日本語: `ja`（既存URL、prefixなし）
- English: `en` → `/en/...`
- 简体中文: `zh-cn` → `/zh-cn/...`
- 繁體中文: `zh-tw` → `/zh-tw/...`
- 한국어: `ko` → `/ko/...`

将来はタイ語、フランス語、スペイン語等も同じ仕組みで追加できる。

## URL方針

日本語をcanonical基準とし、既存URLを壊さない。

例:
- 日本語: `/events/example`
- 英語: `/en/events/example`
- 簡体字: `/zh-cn/events/example`
- 繁体字: `/zh-tw/events/example`
- 韓国語: `/ko/events/example`

middlewareで言語prefixを内部既存ルートへrewriteする。
選択言語は `machiibe_locale` cookieへ保存し、内部リンクでprefixが落ちても選択言語へ戻す。

管理画面・API・静的アセットは多言語rewrite対象外。

## データ方針

### canonical事実

`public.events` の日本語情報をcanonicalとする。

翻訳によって以下を変更しない:
- 開催日
- 開催時間
- 開催状態
- 緯度経度
- 料金区分
- 予約要否
- カテゴリ
- 年齢
- 屋内外
- 会場タイプ
- 出典
- 検証状態

### event_translations

言語別の表示テキストだけを `public.event_translations` へ保持する。

対象:
- title
- summary
- status_note
- venue_name
- address_text
- price_text
- reservation_text
- organizer_name
- accessibility_notes

日本語canonicalを上書きしない。

## 翻訳の出所

`translation_source`:
- `manual`: 人手翻訳
- `provider`: 主催者・提供元の公式多言語情報
- `machine`: 未レビュー機械翻訳
- `machine_reviewed`: レビュー済み機械翻訳

## 公開ゲート

`review_status`:
- draft
- needs_review
- approved
- rejected

公開RPCから取得できるのは `approved` のみ。

さらにDB制約で、
- manual
- provider
- machine_reviewed

以外は approved にできない。

つまり `machine + approved` はDBレベルで禁止する。

## 公開RPC

`get_public_event_translations(bigint[], text)`

公開条件:
- locale一致
- approved
- 最大100 event ID
- eventがpublished
- eventがverified
- sourceがactive
- sourceのevent_use_allowed=true
- eventが期限切れでない

テーブルそのものはanon/authenticatedへ公開しない。
RLS有効。
PUBLICのfunction executeをrevokeした上で公開RPCのみanon/authenticatedへgrantする。

## フォールバック

翻訳がない場合:
1. ページをエラーにしない
2. canonical日本語を表示
3. 公式URL・出典はそのまま保持

翻訳RPCが未適用/一時失敗の場合も日本語表示へフォールバックする。

## SEO

言語別URLでは:
- `html lang`
- `Content-Language`
- canonical
- hreflang
- Open Graph URL

をlocaleへ合わせる。

本公開前は既存のnoindex設定を優先する。

## 翻訳表示の注意

外国語表示には、
「翻訳表示でも開催条件は必ず主催者・公式サイトの最新情報を確認する」
旨を表示する。

翻訳内容を主催者公式翻訳と誤認させない。

## 開発フェーズ

### Phase 1 — 完了
- locale定義
- URL prefix/rewrite
- 言語選択
- locale cookie
- html lang / Content-Language
- TOP主要コピー
- header/footer
- canonical / hreflang基礎
- event_translations DB
- approved translation overlay
- 一覧・詳細の翻訳fallback
- ROLLBACK検証

### Phase 2 — 主要導線まで前倒し実装
- 検索フィルター主要項目を5言語化
- 日付 / 料金 / ステータス / 会場タイプ / 配慮情報 / 並び順の共通辞書化
- イベントカードを5言語化
- ページ送り / 通信エラー / 前回訪問後の新着を5言語化
- 注目特集 / まちまも連携導線を5言語化
- EventActionsを5言語化
- イベント詳細の主要事実ラベル / CTA / 出典表示を5言語化
- 保存検索 / 行きたい・行った / おでかけプランを5言語化
- locale prefixを保存・予定・検索リンクでも維持
- 残り: 都道府県の外国語表示名、飲食ページ、地図保存ページ、細部aria/alt、静的ポリシーページ

### Phase 3
- 規約・ポリシー等の静的ページ
- sitemap言語別拡張
- 管理画面翻訳レビューUI
- 翻訳キュー
- 翻訳品質監査
- 将来の追加言語

## 2026-09-23 ROLLBACK検証

本番Supabase上の1トランザクション内で既存まちイベmigration + i18n migrationを一時実行。

確認:
- approved + machine_reviewed → 公開RPCに1件出る
- 他locale → 0件
- machine + approved → CHECK制約で拒否
- needs_review → 公開RPCから0件
- ROLLBACK成功

検証後:
- public.events = 未作成
- public.event_translations = 未作成
- get_public_event_translations = 未作成

本番DBに変更・テストデータは残していない。
