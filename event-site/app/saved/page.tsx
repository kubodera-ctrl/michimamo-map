import type { Metadata } from 'next';
import Link from 'next/link';
import { SavedEventsClient } from '@/components/SavedEventsClient';
import {getRequestLocale} from '@/lib/i18n-server';
import {localePath,type Locale} from '@/lib/i18n-config';

const copy:Record<Locale,{title:string;description:string;breadcrumb:string;intro:string;plan:string;map:string;saved:string;attended:string}>={
  ja:{title:'行きたい・行ったイベント',description:'まちイベで保存した「行きたい」「行った」イベント一覧。',breadcrumb:'保存したイベント',intro:'この端末に保存しています。来場前は必ず公式情報をご確認ください。',plan:'📅 おでかけプラン',map:'🗺 行きたいを地図で見る',saved:'♡ 行きたい',attended:'✓ 行った'},
  en:{title:'Saved and visited events',description:'Events you saved as “Want to go” or “Visited” on Machi-Ibe.',breadcrumb:'Saved events',intro:'These are stored on this device. Always check official information before visiting.',plan:'📅 Outing plan',map:'🗺 View saved events on map',saved:'♡ Want to go',attended:'✓ Visited'},
  'zh-cn':{title:'想去・去过的活动',description:'在 Machi-Ibe 保存为“想去”或“去过”的活动。',breadcrumb:'已保存活动',intro:'这些信息保存在本设备中。出发前请务必查看官方最新信息。',plan:'📅 出游计划',map:'🗺 在地图查看想去活动',saved:'♡ 想去',attended:'✓ 去过'},
  'zh-tw':{title:'想去・去過的活動',description:'在 Machi-Ibe 儲存為「想去」或「去過」的活動。',breadcrumb:'已儲存活動',intro:'這些資訊保存在本裝置中。出發前請務必查看官方最新資訊。',plan:'📅 出遊計畫',map:'🗺 在地圖查看想去活動',saved:'♡ 想去',attended:'✓ 去過'},
  ko:{title:'가고 싶은・다녀온 이벤트',description:'Machi-Ibe에서 「가고 싶어요」 또는 「다녀왔어요」로 저장한 이벤트입니다.',breadcrumb:'저장한 이벤트',intro:'이 기기에 저장됩니다. 방문 전 반드시 공식 최신 정보를 확인해 주세요.',plan:'📅 나들이 계획',map:'🗺 가고 싶은 이벤트 지도',saved:'♡ 가고 싶어요',attended:'✓ 다녀왔어요'}
};

export async function generateMetadata():Promise<Metadata>{
  const locale=await getRequestLocale();
  const t=copy[locale] || copy.ja;
  return {
    title:t.title,
    description:t.description,
    robots:{index:false,follow:true},
    alternates:{canonical:localePath('/saved',locale)}
  };
}

export default async function SavedPage() {
  const locale=await getRequestLocale();
  const t=copy[locale] || copy.ja;
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb"><Link href={localePath('/',locale)}>まちイベ</Link><span>›</span><span>{t.breadcrumb}</span></nav>
      <p className="eyebrow">SAVED</p>
      <h1>{t.breadcrumb}</h1>
      <p className="area-copy">{t.intro}</p>
      <div className="result-tools"><Link href={localePath('/plan',locale)}>{t.plan}</Link><Link href={localePath('/saved/map',locale)}>{t.map}</Link></div>
      <section className="saved-section"><h2>{t.saved}</h2><SavedEventsClient mode="saved" locale={locale} /></section>
      <section className="saved-section"><h2>{t.attended}</h2><SavedEventsClient mode="attended" locale={locale} /></section>
    </main>
  );
}
