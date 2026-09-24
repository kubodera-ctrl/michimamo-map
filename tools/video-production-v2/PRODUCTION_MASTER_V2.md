# まちまもニュース動画 Production Master v2

更新: 2026-09-24
ステータス: Production design lock
旧 v1.2 より本書を優先する。

## 0. 目的

まちまものニュース動画を、外部AI動画サービスの無料クレジットやGUI編集ツールに依存せず、
同一入力から同一品質で再生成できる本番制作基盤として運用する。

正本はコード + 構造化データ。
CapCut / Descript / Canva / Runway等は任意の補助・確認用であり、本番レンダーの必須依存にしない。

## 1. 最新ビジュアルの固定

正式デザインは「白いニュースカード型」。

上から順に:

1. 青い「まちまも速報」ヘッダー
   - 正式ロゴ/アイコン
   - 日付
   - 情報源
   - 映像源
   - まちまもサブコピー

2. 大見出し
   - 白背景
   - 1行目は黒〜濃紺
   - 2行目は重要点を赤
   - 見出しだけで何が起きたか分かる
   - 文字数に応じて自動縮小するが、レイアウトは変えない

3. 中央の実ニュース/公式映像
   - 実際に再生される動画
   - 元SNS UIなし
   - 16:9や9:16を強制変形しない
   - containを基本、必要に応じ安全なcover
   - 余白が出る場合は同素材のblur backgroundを使用
   - 映像の出典を小さく常時表示
   - AI生成映像を現実のニュース映像として代用しない

4. 要約
   - 白背景
   - 1〜2文
   - verifiedFactsのみ
   - セクション切替は控えめなフェード
   - 未確認情報は生成しない

5. 注意ポイント
   - 黄色帯
   - 3カラム固定
   - ベクターアイコン
   - 犯罪/防災/事故/交通/インフラ/気象に応じて内容だけ差し替える

6. まちまもMAP CTA
   - 青帯
   - 「近くで何が起きてる？」
   - 「まちまもMAPで確認」
   - プロフィール導線
   - 保存/シェア/フォローは補助
   - ニュースより目立たせない

7. 専用エンドカード
   - ニュース画面とは別の全画面
   - 3〜7秒
   - ロゴ
   - 「最後まで見ていただきありがとうございます！」
   - 保存
   - 家族に共有
   - フォロー
   - まちまもMAP CTA
   - 「詳しくはプロフィールから」
   - 「知ることで、守れるまちがある。」
   - 尺稼ぎ目的で伸ばさない

## 2. 映像権利

rightsLevel:
- SELF_OWNED
- EXPLICIT_PERMISSION
- PUBLIC_LICENSE
- CC_BY
- PUBLIC_DOMAIN
- REVIEW
- BLOCKED

mediaUseMode:
- FULL_VIDEO
- VIDEO_EXCERPT
- STILL_ONLY
- AUDIO_DISABLED
- ATTRIBUTION_REQUIRED
- LINK_ONLY
- DO_NOT_USE

自動レンダー・公開候補:
- SELF_OWNED
- EXPLICIT_PERMISSION
- PUBLIC_LICENSE
- CC_BY
- PUBLIC_DOMAIN

人手承認:
- REVIEW

動画利用不可:
- BLOCKED
- LINK_ONLY
- DO_NOT_USE
- STILL_ONLY
- 商用利用未確認
- 改変/再構成不可
- 元SNS UIあり
- attribution必須なのに表記無し

テレビ局ニュース、通常YouTube、TikTok、Instagram、X、一般投稿は
権利確認なしで自動転載しない。

## 3. 出力仕様

共通:
- 1080x1920
- 9:16
- 30fps
- H.264
- yuv420p
- SNS投稿互換MP4

SHORT:
- 25〜45秒
- 標準 38〜42秒
- 実動画は0秒から開始
- エンドカード 3〜5秒

LONG:
- 61〜90秒
- 標準 68〜75秒
- 短尺の単純引き延ばし禁止
- 事実 -> 影響 -> 対応/復旧 -> 安全行動 -> 最新確認 -> CTA -> エンド
- 実動画2本以上または合計利用可能25秒以上を推奨
- 1本かつ25秒未満なら publishEligible=false、管理者承認で解除可能

## 4. 本番テクノロジー

### Render core
- Remotion
- OffthreadVideo
- FFmpeg / ffprobe
- Zod input validation

### Render execution
第一候補:
- Remotion Lambda / AWS
- private S3 output
- IAM最小権限
- レンダー量に応じて課金される通常インフラ

代替:
- 専用Docker render worker
- 同一Composition/同一QCを使用

### App / state
- Supabase Postgres
- admin-only RLS
- video_media_assets
- video_render_jobs
- video_render_outputs

### CI
- GitHub Actionsは型検証・権利ゲートテスト・サンプルレンダー・QCのみ
- GitHub Actionsを本番動画レンダーサービスにはしない

## 5. ジョブ状態

draft
-> rights_review
-> ready_to_preview
-> approved
-> rendering
-> qc
-> rendered
-> publish_ready

例外:
- blocked
- failed

承認済みジョブの入力payloadはイミュータブルなスナップショットとして扱う。

## 6. QC

TECHNICAL:
- 1080x1920
- 30fps
- H.264
- duration許容差内
- 黒画面なし
- 動画が動いている
- 縦横比の強制変形なし
- 文字切れなし
- エンドカードあり

CONTENT:
- 日付
- 情報元
- 映像元
- headline
- summary
- safetyPoints
- 時制
- verifiedFactsとの一致

RIGHTS:
- rightsLevel
- mediaUseMode
- commercialUseAllowed
- modificationAllowed
- sourceUiFree
- attribution

重大エラー1件でも publishEligible=false。

## 7. AIの役割

AIにデザインを毎回作らせない。

AIが生成してよい:
- headline候補
- summary候補
- safetyPoints候補
- カテゴリ
- タグ

AIが推測してはいけない:
- 日時
- 場所
- 被害数
- 犠牲者数
- 原因
- 復旧状況
- 権利条件

verifiedFactsにない情報は動画へ入れない。

## 8. 人間の操作

理想フロー:

ニュース確認
-> まちまも速報
-> 自動整理
-> 権利ゲート
-> 9:16プレビュー
-> 必要なら文言修正
-> 承認
-> Production render
-> QC
-> publish_ready

管理者が動画編集ソフトで毎回位置調整する運用は禁止。

## 9. 本番の完成条件

- 理想カード型UIがニュースごとに崩れない
- 中央は本物の権利確認済み動画
- 最後は専用エンドカードで明確に締まる
- 1080x1920の実ファイル
- 権利証跡とQC証跡がDBに残る
- 同じ入力を再レンダーできる
- 無料クレジットの残量で本番運用が止まらない
