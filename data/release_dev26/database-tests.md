# 実DB検証結果（2026-09-16）

実施方法はREADME参照。いずれもテスト行のみを生成し、ROLLBACK。Storage/Authの実削除APIを呼んでいない。

|検証|適用前（同一トランザクションで新SQLを一時適用）|本番適用後|
|---|---|---|
|release_dev26_transaction.sql|PASS|PASS|
|dev22_submission_transaction.sql|現行DBでPASS|既存処理を今回変更していない|
|quiz_server_grading_transaction.sql|現行DBでPASS|既存処理を今回変更していない|

新試験結果：replay / payload mismatch / 50m / private camera / direct insert denial / point cap / owner-other-anon-suspended / finalize replay / 10d / reason / 30d / grace anchored to expiry / extension / cleanup token / retry / account camera scrub。

並行HTTPストレス、実画像Storage削除、実Auth退会、実機ブラウザー永続化は別途必要。SQLのロール変更はテスト行の権限境界試験用であり、実管理者ログイン成功を主張しない。
