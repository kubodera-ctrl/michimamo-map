# まちまもニュース動画 Production v2

本番用の決定版レンダー基盤。

## 重要
- 中央は必ず権利確認済みの実動画。
- 静止画パンやズームをニュース映像の代替にしない。
- SNS UI入り動画はsourceUiFree=falseとしてブロック。
- CapCut、Descript、Canvaは任意の補助ツール。生成エンジンにはしない。
- 1080x1920、30fpsをコードで固定。
- エンドカードを必ず別画面で締める。

## ローカル
tools/video-production-v2へ移動してnpm install。
npm run studioでプレビュー。
npm run render:short -- samples/typhoon25.json out/short.mp4 で短尺レンダー。
npx tsx scripts/qc.ts out/short.mp4 samples/typhoon25.json でQC。

## AWS Lambda
必要な環境変数:
REMOTION_AWS_REGION
REMOTION_FUNCTION_NAME
REMOTION_SERVE_URL

npm run render:lambda -- samples/typhoon25.json

Lambdaは自分のAWSアカウントで動かし、レンダー量に応じて課金される本番基盤として使う。
外部AI動画サービスの無料クレジットには依存しない。

## 入力
ニュース本文から直接デザインを生成しない。
AIはverifiedFactsからheadline、summary、safetyPoints候補を作るだけ。
レイアウトはmachimamo-card-v2に固定する。

詳細はARCHITECTURE.md。

CI validation target: feature/machimamo-video-production-v2
