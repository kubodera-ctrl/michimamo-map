import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import MachiibeFinalCarouselRenderer from '@/components/MachiibeFinalCarouselRenderer';
import {GOLDEN_FIXTURES,goldenFixtureById} from '@/lib/machiibe-golden-fixtures';

export const dynamicParams=false;

export function generateStaticParams(){
  return GOLDEN_FIXTURES.map((item)=>({fixture:item.id}));
}

export const metadata:Metadata={
  title:'Golden確認用 CAROUSEL',
  robots:{index:false,follow:false}
};

type Params=Promise<{fixture:string}>;

const QA_ITEMS=[
  '1080×1920比率','文字切れ','文字重なり','safe area','ページ番号','見出し',
  '吹き出し','ポラロイド','詳細カード','fact chip','CTA','ロゴ','まちまも導線'
];

export default async function GoldenFixtureDetailPage({params}:{params:Params}){
  if(process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true') notFound();
  const {fixture}=await params;
  const item=goldenFixtureById(fixture);
  if(!item) notFound();

  return (
    <main className="admin-shell">
      <nav className="breadcrumb">
        <Link href="/preview/carousel-golden-fixtures">Golden fixtures</Link><span>›</span><span>{item.label}</span>
      </nav>
      <div className="admin-topbar">
        <div>
          <p className="eyebrow">GOLDEN確認用 / SYNTHETIC DATA</p>
          <h1>{item.label} Visual QA</h1>
          <p>{item.description}。下のCanvasが完成デザインそのものです。QA文言はCanvas外にのみ表示しています。</p>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-head"><div><h2>目視チェック</h2><p>全{item.pageCount}ページを上から順に確認してください。</p></div></div>
        <div className="result-tools">
          {QA_ITEMS.map((label)=><span key={label}>{label}</span>)}
          <span>{item.pageCount}Pページ構成</span>
        </div>
      </section>

      <section className="admin-panel" data-fixture={item.id}>
        <MachiibeFinalCarouselRenderer
          input={item.input}
          pageCount={item.pageCount}
          postSetId={'fixture-'+item.id}
          revisionId={'fixture-revision-'+item.id}
        />
      </section>
    </main>
  );
}
