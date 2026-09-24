# まちまも動画 Production v2 アーキテクチャ

## 目的
CapCut、Descript、Canva等のクレジットや書き出し制限を本番依存にしない。
コードと入力JSONを正本にし、同じ入力から同じ1080x1920動画を再生成できる構成にする。

## 本番フロー
1. ニュース取得
2. verifiedFactsを正規化
3. 動画候補取得
4. rightsLevel、mediaUseMode、商用可否、改変可否、attributionを保存
5. evaluateRightsで自動ゲート
6. 管理画面でRemotion Playerプレビュー
7. 管理者承認
8. Remotion Lambdaで1080x1920、30fps、H.264レンダー
9. qc.ts相当の技術QC
10. 完成MP4、metadata、rights、QCを永続Storageへ保存
11. 投稿候補化

## 役割
- Remotion: レイアウト、タイムライン、テキスト、アニメーション、エンドカード
- OffthreadVideo: 権利確認済みの実ニュース動画
- FFmpeg: Remotion内部処理と素材事前正規化
- AWS Lambda: 本番分散レンダー
- GitHub Actions: CI検証のみ。本番レンダーには使わない

## 最新デザイン
基準は白いニュースカード。
青ヘッダー、黒と赤の大見出し、横長の実動画、短い要約、黄色の注意ポイント帯、3つの注意カード、青いまちまもMAP CTA。
ニュース映像は中央最大の単一コンテンツ領域にするが、カード全体の情報設計を崩すほど巨大化させない。

## エンド
エンドカードは別画面として3〜7秒。
ロゴ、お礼、保存、家族共有、フォロー、MAP CTA、プロフィール導線を固定。
尺稼ぎには使わない。

## 状態
draft -> rights_review -> ready_to_preview -> approved -> rendering -> qc -> rendered -> publish_ready
失敗はfailed、権利NGはblocked。

## 長尺
61〜90秒。
素材1本かつ合計利用可能時間25秒未満はレンダー自体は可能だがpublishEligible=false。
短尺を単純に引き延ばさない。
