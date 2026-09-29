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
警視庁の速度取締指針は重点的に警察活動を実施する路線・時間帯を示すもので、実際の取締りは指定時間外にもランダムに行われる。

表示文言:
- OK: 「現在、取締重点時間帯」
- NG: 「現在検問中」「現在取締中」

## 公式データ
速度取締指針一覧:
https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/torikumi/sokudokanri/torishimari.html

東京湾岸警察署:
https://www.keishicho.metro.tokyo.lg.jp/sokudo_sisin/1/tokyowangan_sokudo.pdf

一覧ページ更新日: 2026-07-30

東京湾岸署の7重点路線を構造化済み。
地図線形は初回実走UI確認のため、環二通り・都橋通りの2区間のみ概略線形を付与している。本番公開前に正確な道路LineStringへ置換する。

## 事故多発エリア
新規DBは作らず既存RPC `accident_hotspots_in_view` を利用。
警察庁2022〜2024年公開データを約250m区画で集計した既存まちまもデータをそのまま共有する。

## 現時点の技術構成
- Web/PWA先行β
- Leaflet + OpenStreetMap
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
1. Previewでスマホ表示確認
2. お台場〜有明周辺で実走QA
3. 概略LineStringを正確な道路形状へ置換
4. 東京湾岸署7路線を全て地図化
5. 99署＋高速隊の取締指針を自動構造化
6. 車線規制など公式道路情報を追加
7. ネイティブNavigation SDK版
8. AIカメラ検出（事故・車線規制等）を後付け
