import type { Metadata } from 'next';
import Link from 'next/link';
import { OutingPlanClient } from '@/components/OutingPlanClient';
import {getRequestLocale} from '@/lib/i18n-server';
import {localePath,type Locale} from '@/lib/i18n-config';

const copy:Record<Locale,{title:string;description:string;intro:string;saved:string;map:string}>={
  ja:{title:'おでかけプラン',description:'「行きたい」に保存したイベントを予定日ごとに整理。',intro:'「行きたい」イベントの予定日を決めて、1日のおでかけ候補を日付順にまとめます。移動時間はまだ自動最適化せず、確定した事実だけを使います。',saved:'♡ 行きたい一覧',map:'🗺 地図で見る'},
  en:{title:'Outing plan',description:'Organize saved events by your planned visit date.',intro:'Choose visit dates for events you want to attend and group your day by date. Travel time is not auto-optimized yet; only confirmed facts are used.',saved:'♡ Want-to-go list',map:'🗺 View on map'},
  'zh-cn':{title:'出游计划',description:'按计划前往日期整理“想去”的活动。',intro:'为“想去”的活动选择日期，并按日期整理一天的出游候选。目前不自动优化移动时间，只使用已确认的信息。',saved:'♡ 想去列表',map:'🗺 地图查看'},
  'zh-tw':{title:'出遊計畫',description:'依預計前往日期整理「想去」的活動。',intro:'為「想去」的活動選擇日期，並依日期整理一天的出遊候選。目前不自動最佳化移動時間，只使用已確認資訊。',saved:'♡ 想去清單',map:'🗺 地圖查看'},
  ko:{title:'나들이 계획',description:'「가고 싶어요」로 저장한 이벤트를 예정일별로 정리합니다.',intro:'가고 싶은 이벤트의 방문 예정일을 정해 날짜별로 나들이 후보를 정리합니다. 이동 시간은 아직 자동 최적화하지 않고 확인된 사실만 사용합니다.',saved:'♡ 가고 싶은 목록',map:'🗺 지도에서 보기'}
};

export async function generateMetadata():Promise<Metadata>{
  const locale=await getRequestLocale();
  const t=copy[locale] || copy.ja;
  return {title:t.title,description:t.description,robots:{index:false,follow:true},alternates:{canonical:localePath('/plan',locale)}};
}

export default async function PlanPage() {
  const locale=await getRequestLocale();
  const t=copy[locale] || copy.ja;
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb"><Link href={localePath('/',locale)}>まちイベ</Link><span>›</span><span>{t.title}</span></nav>
      <p className="eyebrow">OUTING PLAN</p>
      <h1>{t.title}</h1>
      <p className="area-copy">{t.intro}</p>
      <div className="result-tools"><Link href={localePath('/saved',locale)}>{t.saved}</Link><Link href={localePath('/saved/map',locale)}>{t.map}</Link></div>
      <OutingPlanClient locale={locale} />
    </main>
  );
}
