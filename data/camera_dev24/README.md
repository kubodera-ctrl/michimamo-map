# 開発24：無料カメラの検知・撮影基盤

## 引き継ぎ元
- GitHub main `51be07abeb4d74db9fd5efe5de6b9115ce6d9a45`。
- `data/camera_dev23/README.md` と `ROADMAP.md` の最新無料／有料統合仕様を確認。
- 支出先行禁止、月150円の追加AIは未課金・未提供、AED有料画像AI保留、写真は端末内のみを維持。

## 今回の実装
- `camera-detection.js`: 標準化途中のブラウザーFaceDetectorへの接続。起動時のモデル取得や有料通信なし。実行可否を機能検出し、矩形値の検証・25%余白・画像端のクリップ。最大100候補、同時検出1件。
- `camera-capture.js`: 本人の「顔を検出してモザイク（試験）」操作で検出し、自動で候補領域へモザイク。ナンバーは検出しない。初期全体モザイクのみ置換し、手動マスクを残す。検出0件や失敗時も元の加工を保持。8秒で待機を終了し手動操作を継続可能にする。
- タイムアウトはブラウザー内部の検出キャンセル保証ではない。検出Promiseが完了するまではアダプターが次の処理を拒否して多重起動を防ぐ。検出用Canvasは終了／タイムアウト時に1pxへ縮小。検出結果と画像を永続保存しない。
- 検出中の保存禁止、反映時の再確認、手動編集・終了後の古い結果拒否を追加。説明文と読み込みバージョンも更新。
- `camera-observation.js`: 自動シャッター**判断部分のみ**。実映像から情報を抽出するモデル・トラッカーではない。公開ページでは読み込まない。

## 判断部分の入出力・開発上の仮設定
- 各フレームは単調増加時刻（接続時にはperformance.now等）、foreground、frameValid、detectorValidated、mode、vehiclesを渡す。未検証・欠落・異常入力では状態を破棄。
- 散歩: trackerValidated、cameraStable、各車両のvisible/occluded/identityReliable/stationary/confidenceが必要。trackIdはローカルセッションだけのID。ナンバーだけや矩形IoUだけでidentityReliableをtrueにしてはならない。
- 観測間隔上限1500ms、信頼度0.9以上、最大64対象、全体撮影間隔2秒。精度を検証した値ではなく保守的な開発仮設定。実機評価後に調整し記録する。
- 連続観測3分でstop_candidate、5・10・20分でcapture_requestを返す。撮影成功後、当該フレームのrequestオブジェクトをacknowledgeする。失敗した撮影を成功として記録しない。古いフレームの応答を拒否する。
- 車載: roadDetectorValidated、eventId、hazard、blocksPassage、stoppedEvidence、relationConfidenceが必要。対応hazardはcrosswalk_blocked/intersection_blocked/cycle_space_blockedのみ。通過イベントを60秒重複抑制、最大64件。候補は停車後確認と明示。
- これらの検証フラグは将来の内部接続条件であり、サーバーの認証・認可ではない。実モデル評価を終える前にフラグだけtrueにして機能公開しない。

## モデル調査と採用判断
1. ブラウザーFaceDetector: 顔矩形だけの試験経路として接続。端末依存で全ブラウザー対応ではなく、iPhone実機は未確認。日本のナンバーは対象外。
   - 公式草案: https://wicg.github.io/shape-detection-api/
2. TensorFlow.js COCO-SSD: 車両候補用として調査。公式ソースにApache-2.0表記、lite_mobilenet_v2の構成とカスタムmodelUrlを確認。公式クラス一覧は顔・日本のナンバー・道路の通行妨害を扱わないため、これ単体で要件を満たさない。
   - https://github.com/tensorflow/tfjs-models/blob/master/coco-ssd/src/index.ts
   - https://github.com/tensorflow/tfjs-models/blob/master/coco-ssd/src/classes.ts
   - 今回は外部スクリプト／モデル配信を本番へ追加していない。採用前に実際に配布する重みの来歴・条件、固定バージョン、サイズ・ハッシュ・配信コストを確認する。ソースライセンスだけで重みや学習データの条件まで確認済みと扱わない。
3. iPhone向け顔・日本のナンバーの端末内モデル: 未選定。ナンバーを車両全体マスクや推測矩形で「専用検出済み」と表現しない。

## 検証
実行コマンド（リポジトリ直下）:
```
node tests/camera_capture.test.cjs
node tests/camera_observation.test.cjs
node tests/free_camera_and_ai_pause.test.cjs
node tests/ios_viewport_stability.test.cjs
git diff --check
```
全てPASS。撮影準備、手動保護、検出中保存拒否、古い検出／保存結果の破棄、候補0件／失敗、観測中断、3/5/10/20分、重複抑制、撮影失敗時再試行、車両だけの危険判定拒否を検証。
これらはDOM/Canvas代替・合成検知入力のテスト。実物の顔／車両認識、Safariのタッチ・描画・ダウンロード、夜間／逆光／ブレ／小対象の精度や発熱は未確認。利用可能なローカルChromium実行ファイルは見つからなかった。

## 次に必要な実装
1. iPhoneも対象にできる端末内顔・ナンバーモデルを選定し、条件・重み・配信費用と許諾済み実画像での性能を確認。
2. 複数特徴の車両追跡とカメラ移動／遮蔽推定を接続。ボックス一致のみの追跡を完成扱いにしない。
3. 上の判断ロジックと実フレームの自動撮影を接続。枚数・画素・メモリ上限と重複破棄を実装。散歩／車載の開始UI、車載の停車後確認、終了／背景時の破棄を検証。
4. 車載の道路空間・停止根拠・通行妨害位置関係を実装し、認識性能を評価してから有効化。
5. サーバー投稿前に本人／管理者限定の非公開保管、10日削除、30日延長＋7日無回答削除を完成させる。端末への保存を投稿完了とは扱わない。

自動シャッター・両モードはまだユーザーが使える状態ではない。次スレはこの記録と最新ROADMAPから再開する。
