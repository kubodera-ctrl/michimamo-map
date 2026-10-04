# まちまも DRIVE β（開発38・先行試作）

## 目的
運転中に必要な情報だけへ絞り、既存まちまもとは独立した車載向けUIを検証する。

初回βの対象:
- 警視庁が公表する速度取締重点路線・重点時間帯
- 重点時間帯中の道路強調（赤・点滅）
- 現在地が対象区間500m以内へ近づいた場合の接近警告
- 既存まちまもの事故多発エリアRPCの共通利用
- 交番/AEDは表示しない
- AIカメラ自動検出は後工程

## 重要な表示境界
このβは「検問中」「速度取締実施中」を断定しない。
警視庁の速度取締指針は重点的に警察活動を実施する路線・時間帯を示すもので、実際の取締りは指定時間外にも行われる場合がある。

表示文言:
- OK: 「現在、取締重点時間帯」
- NG: 「現在検問中」「現在取締中」

## 公式データ
速度取締指針一覧:
https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/torikumi/sokudokanri/torishimari.html

東京湾岸警察署:
https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/torikumi/sokudokanri/torishimari.files/tokyowangan.pdf

2026-09-30再監査で、警視庁の現行「速度取締指針」一覧（更新日2026-07-30）から東京湾岸警察署リンクを直接辿り、重点路線9件を確認した。
旧直リンク `https://www.keishicho.metro.tokyo.lg.jp/sokudo_sisin/1/tokyowangan_sokudo.pdf` には7路線の旧版が残るため、現行性判定では必ず一覧ページからのリンク先を正とする。

## 道路線形
手作業で数点を結んだ概略LineStringは撤去。
誤った道路形状を表示しないことを優先し、検証済み起終点がある区間だけOSRM/OpenStreetMap系の道路ルーティング結果をβ表示する。

先行対象:
- 環二通り：有明北橋上 → 有明中央橋南交差点
- 国道357号：荒川河口橋上 → 京浜大橋上

残り路線は起終点検証が完了するまで「時間帯情報のみ」とし、推測した線は描かない。

## 事故多発エリア
新規DBは作らず既存RPC `accident_hotspots_in_view` を利用。
警察庁2022〜2024年公開データを約250m区画で集計した既存まちまもデータをそのまま共有する。
初期表示はOFF。

## 現時点の技術構成
- Web/PWA先行β
- Leaflet + OpenStreetMap
- 実道路ルーティング: OSRM beta
- Geolocation watchPosition
- Supabase既存公開RPC
- DB Migrationなし
- Production変更なし

## Google Navigation SDKとの関係
今回の先行βは「取締重点/事故多発の表示・接近通知・視認性」を早く実走QAするためのWeb版。
Google Mapsアプリそのものへのプラグインではない。

βで表示ロジックとデータ契約を固めた後、
- iOS Google Navigation SDK
- Android Google Navigation SDK
のネイティブ車載版へ移し、ターンバイターンナビ画面上へ同じ安全レイヤーを重ねる。

## 次工程
1. 実道路ルーティング版をPreviewで本人QA
2. 環二通り・国道357号の道路追従を確認
3. 東京湾岸署9路線の起終点を順次検証して全線地図化（現行一覧リンク由来Sourceのみ）
4. 99署＋高速隊の取締指針を構造化
5. 車線規制など公式道路情報を追加
6. ネイティブNavigation SDK版
7. AIカメラ検出（事故・車線規制等）を後付け
