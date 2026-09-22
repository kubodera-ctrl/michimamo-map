'use client';

import {usePathname,useRouter} from 'next/navigation';
import {LOCALE_LABELS,SUPPORTED_LOCALES,localePath,type Locale} from '@/lib/i18n-config';

export function LanguageSwitcher({locale,label}:{locale:Locale;label:string}){
  const pathname=usePathname() || '/';
  const router=useRouter();

  const change=(next:Locale)=>{
    document.cookie=`machiibe_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    router.push(localePath(pathname,next));
    router.refresh();
  };

  return (
    <label className="language-switcher">
      <span className="sr-only">{label}</span>
      <select aria-label={label} value={locale} onChange={(event)=>change(event.target.value as Locale)}>
        {SUPPORTED_LOCALES.map((item)=><option key={item} value={item}>{LOCALE_LABELS[item]}</option>)}
      </select>
    </label>
  );
}
