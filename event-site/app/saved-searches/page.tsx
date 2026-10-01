import type { Metadata } from 'next';
import Link from 'next/link';
import { SavedSearchesClient } from '@/components/SavedSearchesClient';
import {getRequestLocale} from '@/lib/i18n-server';
import {localePath,type Locale} from '@/lib/i18n-config';

const copy:Record<Locale,{title:string;description:string;intro:string}>={
  ja:{title:'保存した検索',description:'まちイベで保存した検索条件。',intro:'よく使う条件をこの端末に保存しています。ログイン不要で使えます。'},
  en:{title:'Saved searches',description:'Search filters saved on Machi-Ibe.',intro:'Frequently used filters are stored on this device. No login is required.'},
  'zh-cn':{title:'已保存搜索',description:'在 Machi-Ibe 保存的搜索条件。',intro:'常用条件保存在本设备中，无需登录即可使用。'},
  'zh-tw':{title:'已儲存搜尋',description:'在 Machi-Ibe 儲存的搜尋條件。',intro:'常用條件保存在本裝置中，不需登入即可使用。'},
  ko:{title:'저장한 검색',description:'Machi-Ibe에 저장한 검색 조건입니다.',intro:'자주 쓰는 조건을 이 기기에 저장합니다. 로그인 없이 사용할 수 있습니다.'}
};

export async function generateMetadata():Promise<Metadata>{
  const locale=await getRequestLocale();
  const t=copy[locale] || copy.ja;
  return {title:t.title,description:t.description,robots:{index:false,follow:true},alternates:{canonical:localePath('/saved-searches',locale)}};
}

export default async function SavedSearchesPage() {
  const locale=await getRequestLocale();
  const t=copy[locale] || copy.ja;
  return (
    <main className="content-wrap area-page">
      <nav className="breadcrumb"><Link href={localePath('/',locale)}>まちイベ</Link><span>›</span><span>{t.title}</span></nav>
      <p className="eyebrow">SAVED SEARCH</p>
      <h1>{t.title}</h1>
      <p className="area-copy">{t.intro}</p>
      <SavedSearchesClient locale={locale} />
    </main>
  );
}
