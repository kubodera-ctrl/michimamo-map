import type {Metadata} from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {operatorSiteUrl} from '@/lib/url-config';

export const metadata:Metadata={
  title:'まちイベについて｜情報提供・データ連携',
  description:'全国イベント検索サービス「まちイベ」の事業概要、データ連携方針、情報の取り扱いをご案内します。',
  robots:{index:false,follow:true}
};

export default function PartnersPage(){
  return (
    <main className="partners-page">
      <section className="partners-hero">
        <div className="partners-shell partners-hero-grid">
          <div className="partners-hero-copy">
            <p className="eyebrow">MACHI IBE / DATA & PARTNERS</p>
            <h1>地域の小さな催しまで。<br />日本中の「行ってみたい」を見つけやすく。</h1>
            <p className="partners-lead">
              「まちイベ」は、今日・週末・任意の日付から全国のイベントを探せる
              おでかけ検索サービスです。大型イベントだけでなく、自治体、観光協会、
              商業施設、博物館、科学館、地域のお祭りやワークショップなど、
              地域に埋もれやすい情報まで見つけやすくすることを目指しています。
            </p>
            <div className="partners-status-row">
              <span>β公開準備中</span>
              <span>全国対応を開発中</span>
              <span>運営：SUMION合同会社</span>
            </div>
          </div>
          <div className="partners-brand-card" aria-label="まちイベ">
            <Image src="/machiibe-icon.svg" alt="まちイベ" width={110} height={110} priority />
            <strong>まちイベ</strong>
            <small>by まちまも</small>
            <p>イベントを探す。行く前に確かめる。家族や地域で共有する。</p>
          </div>
        </div>
      </section>

      <section className="partners-section">
        <div className="partners-shell">
          <div className="partners-section-head">
            <p className="eyebrow">SERVICE</p>
            <h2>まちイベでできること</h2>
            <p>「有名だから出る」ではなく、条件に合うイベントを見つけられる検索体験を重視しています。</p>
          </div>
          <div className="partners-feature-grid">
            <article><b>01</b><strong>日付から探す</strong><p>今日・明日・今週末・30日以内に加え、1日指定や任意期間にも対応。</p></article>
            <article><b>02</b><strong>家族で探す</strong><p>子どもが主役、ファミリー向け、年齢、無料・有料などで絞り込み。</p></article>
            <article><b>03</b><strong>雨の日から探す</strong><p>屋内・ファミリー向けをまとめて探せる「雨の日の室内遊び」を用意。</p></article>
            <article><b>04</b><strong>推し活から探す</strong><p>作品、キャラクター、クリエイターなどの確認済み関連情報から検索。</p></article>
            <article><b>05</b><strong>不要な候補を減らす</strong><p>除外ワード、開催期間、対象層などを組み合わせて検索結果を調整。</p></article>
            <article><b>06</b><strong>当日の安全へつなぐ</strong><p>まちまもMAPと連携し、会場周辺のAED・交番・暑さ指数などへ接続予定。</p></article>
          </div>
        </div>
      </section>

      <section className="partners-section partners-section-soft">
        <div className="partners-shell partners-two-col">
          <div>
            <p className="eyebrow">NATIONWIDE</p>
            <h2>人気からニッチまで、全国を継続更新</h2>
            <p className="partners-copy">
              目標は、都市部の大型催事だけではなく、地方のお祭り、小規模な体験会、
              公共施設の催しなども同じ検索画面で見つけられることです。
              情報源を登録し、更新を定期確認する方式を基本に、API・RSS・オープンデータが
              利用できる場合は規約確認後に自動連携します。
            </p>
          </div>
          <div className="partners-flow">
            <div><span>1</span><strong>公式情報源を登録</strong><small>API / RSS / オープンデータ / 公式イベントURL</small></div>
            <i>↓</i>
            <div><span>2</span><strong>定期取得・差分確認</strong><small>新規・更新・中止・終了を検知</small></div>
            <i>↓</i>
            <div><span>3</span><strong>正規化・重複統合</strong><small>同一イベントの二重掲載を抑制</small></div>
            <i>↓</i>
            <div><span>4</span><strong>確認後に公開</strong><small>自動取得＝自動公開にはしない</small></div>
          </div>
        </div>
      </section>

      <section className="partners-section">
        <div className="partners-shell">
          <div className="partners-section-head">
            <p className="eyebrow">DATA POLICY</p>
            <h2>データを「拾う」だけでなく、扱い方まで管理します</h2>
          </div>
          <div className="partners-policy-grid">
            <article>
              <strong>出典を保持</strong>
              <p>イベントごとに情報源・公式URL・確認日時を保持し、利用者が最新情報を確認できる導線を設けます。</p>
            </article>
            <article>
              <strong>規約と取得方法を分離管理</strong>
              <p>公式サイトであっても自動取得可能とは判断せず、API・RSS・手動確認など取得方法ごとに利用条件を管理します。</p>
            </article>
            <article>
              <strong>画像は許諾前提</strong>
              <p>イベント画像やロゴは、利用条件を確認できない限り転載しません。画像なしでも成立する表示を基本とします。</p>
            </article>
            <article>
              <strong>変更・中止に対応</strong>
              <p>開催内容変更、延期、中止、完売、受付終了などをステータスとして保持し、検索・カレンダー導線にも反映します。</p>
            </article>
            <article>
              <strong>推測で埋めない</strong>
              <p>料金、屋内外、対象年齢など、公式確認できない事実項目は「不明」のまま扱います。</p>
            </article>
            <article>
              <strong>訂正・掲載停止窓口</strong>
              <p>主催者・施設・権利者からの訂正や掲載停止の申し出を受け付け、確認後に対応できる運用を整えます。</p>
            </article>
          </div>
        </div>
      </section>

      <section className="partners-section partners-section-dark">
        <div className="partners-shell">
          <div className="partners-section-head partners-section-head-light">
            <p className="eyebrow">FOR DATA PROVIDERS</p>
            <h2>情報提供・API連携をご相談したいこと</h2>
            <p>全国・地域イベント情報をお持ちの自治体、観光協会、施設、データ提供事業者の皆さまとの連携を検討しています。</p>
          </div>
          <div className="partners-request-grid">
            <article><strong>利用可能なデータ項目</strong><p>名称、開催日、会場、住所、料金、緯度経度、対象、更新日時など。</p></article>
            <article><strong>取得・更新方法</strong><p>API、RSS、CSV、JSON、オープンデータ、公式ページの更新通知など。</p></article>
            <article><strong>保存・キャッシュ条件</strong><p>検索用DBへの保存可否、保持期間、差分更新、再取得頻度。</p></article>
            <article><strong>商用利用・表示条件</strong><p>出典表示、リンク条件、ロゴ表記、クレジット等の必要事項。</p></article>
            <article><strong>画像・素材の利用条件</strong><p>画像URL参照、サムネイル利用、転載可能範囲、個別許諾の要否。</p></article>
            <article><strong>料金・契約条件</strong><p>API料金、初期費用、月額、従量課金、試用環境の有無。</p></article>
          </div>
        </div>
      </section>

      <section className="partners-section">
        <div className="partners-shell partners-operator">
          <div>
            <p className="eyebrow">OPERATOR</p>
            <h2>運営について</h2>
            <dl>
              <div><dt>サービス</dt><dd>まちイベ by まちまも</dd></div>
              <div><dt>運営</dt><dd>SUMION合同会社</dd></div>
              <div><dt>事業内容</dt><dd>Web・アプリ開発、ITサポート、生活サポート等</dd></div>
              <div><dt>現在</dt><dd>β公開に向けて開発・データ連携準備中</dd></div>
            </dl>
          </div>
          <div className="partners-contact-card">
            <small>DATA / API / PARTNERSHIP</small>
            <strong>情報提供・データ連携のご相談</strong>
            <p>
              API利用条件、商用利用、データ保存、画像利用、スポンサー・連携などについて、
              各提供元の条件に沿って個別に確認しながら進めます。
            </p>
            <div className="partners-contact-actions">
              <a href={operatorSiteUrl()} target="_blank" rel="noreferrer">SUMION公式サイト ↗</a>
              <Link href="/corrections">掲載情報の訂正窓口</Link><Link href="/policies">ポリシー・規約</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
