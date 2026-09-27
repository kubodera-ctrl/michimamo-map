# まちイベ CAROUSEL Media Storage Contract

更新: 2026-09-28
状態: CURRENT実装契約 / R2実resource未作成

## 目的
CURRENT CAROUSEL Rendererが生成した1080×1920 PNGを、Production Revisionと一意に対応付けて保存・検証・Publishingへ渡す。

## 正本
- `MACHIIBE_PRODUCTION_MASTER_CURRENT.md`
- `MACHIIBE_ADMIN_INTEGRATION_CONTRACT.md`
- `event-site/lib/machiibe-media-manifest.ts`

## 保存単位
各Revisionごとに5〜8枚のPNGを保存する。

R2 object key:

```
production/machiibe/{postSetId}/{revisionId}/{fileName}
```

同じRevisionの承認済み生成物を直接上書きしない。再生成は新Revisionを使用する。

## Hash
各PNG:
- SHA-256を算出
- media manifestに `fileName / pageNumber / bytes / sha256 / width / height / mimeType / r2Key` を保持

Revision:
- canonical manifest JSON全体のSHA-256を `mediaHash` とする
- upload/retry/idempotencyの比較に利用
- hash不一致時はDBを更新しない

## Upload
予定フロー:

1. 管理画面Canvas RendererでPNG生成
2. browser側でpage SHA-256を算出
3. mediaManifest / mediaHash生成
4. same-origin admin APIへ送信
5. API側でadmin session / same-origin / revision状態を再検証
6. server側で受信byteを再hash
7. private R2へPUT
8. 全ページ成功後のみRevisionのmedia_manifest / media_hashを更新
9. audit log記録

部分成功時にRevisionを「保存済み」扱いしない。

## Visibility
R2 objectを直接public bucketとして扱わない。

- draft / generated / edited: private
- visual/golden/admin approval前: public publishing URLを発行しない
- publishEligible=true後: verified domain配下のmedia delivery endpointから配信可能にする

TikTok Photo PostのPULL_FROM_URLは公開アクセス可能かつTikTok Appで検証済みのdomain/URL prefixが必要なため、正式URL確定後にdelivery URLを接続する。

## R2 resource
想定bucket名: `machiibe-media`

現在:
- wrangler設計あり
- 実bucket存在・binding・課金条件は未確認
- 実resource作成は行わない
- resource作成前でもRenderer / manifest / hashの検証は継続する

## QC
R2保存はGolden合格を意味しない。

別々に保持:
- facts QC
- rights QC
- visual QC
- golden QC
- page count QC
- disclaimer QC
- admin approval
- media persisted

Golden失敗時にGolden Snapshotを自動更新しない。

## Publishing
X/TikTok AdapterはmediaManifestを入力とし、Rendererを再実行しない。

X:
- 1 Postに最大4写真のため、CURRENT 5〜8枚CAROUSELを勝手に削除しない
- multi-post strategyが正式承認されるまではfail-closed

TikTok:
- Photo PostはCURRENT 5〜8枚を扱える
- OAuth / video.publish / verified media domain / audit等は外部接続Gateとして分離

## 未確定
- private media retention期間
- R2実resource
- public media endpoint
- X 5〜8枚のmulti-post strategy
- OAuth/token保管方式

これらは確認前に推測で本番有効化しない。
