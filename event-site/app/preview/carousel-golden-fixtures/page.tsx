import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import MachiibeFinalCarouselRenderer from '@/components/MachiibeFinalCarouselRenderer';
import {GOLDEN_FIXTURES} from '@/lib/machiibe-golden-fixtures';

export const metadata:Metadata={
  title:'CAROUSEL Golden Fixture Preview',
  robots:{index:false,follow:false}
};

const QA_ITEMS=[
  '1080×1920比率','文字切れ','文字重なり','safe area','ページ番号','見出し',
  '吹き出し','ポラロイド','詳細カード','fact chip','CTA','ロゴ','まちまも導線','5/7/8Pページ構成'
];

export default function GoldenFixturePreviewPage(){
  if(process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true') notFound();

  return (
    <main className="admin-shell">
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">PREVIEW ONLY / SYNTHETIC DATA</p>
          <h1>CAROUSEL Golden Fixture Preview</h1>
          <p>Golden確認用。実イベント・本番DBを使わないVisual Regression専用です。index許可環境では404になります。</p>
          <div className="admin-quick-links">
            {GOLDEN_FIXTURES.map((item)=>(
              <Link key={item.id} href={'/preview/carousel-golden-fixtures/'+item.id}>{item.label}を単独で開く →</Link>
            ))}
          </div>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>目視確認項目</h2><p>この確認表示はCanvas外です。生成PNGには入りません。</p></div></div>
        <div className="result-tools">
          {QA_ITEMS.map((item)=><span key={item}>{item}</span>)}
        </div>
      </section>

      {GOLDEN_FIXTURES.map((item)=>(
        <section className="admin-panel" key={item.id} data-fixture={item.id}>
          <div className="admin-panel-head">
            <div><p className="eyebrow">Golden確認用</p><h2>{item.label}</h2><p>{item.description} / 全{item.pageCount}ページ</p></div>
            <Link href={'/preview/carousel-golden-fixtures/'+item.id}>このfixtureだけ開く →</Link>
          </div>
          <MachiibeFinalCarouselRenderer
            input={item.input}
            pageCount={item.pageCount}
            postSetId={'fixture-'+item.id}
            revisionId={'fixture-revision-'+item.id}
          />
        </section>
      ))}
    </main>
  );
}
