export const SUPPORTED_LOCALES = ['ja','en','zh-cn','zh-tw','ko'] as const;

export type Locale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE:Locale='ja';

export const LOCALE_LABELS:Record<Locale,string>={
  ja:'日本語',
  en:'English',
  'zh-cn':'简体中文',
  'zh-tw':'繁體中文',
  ko:'한국어'
};

export const HTML_LANG:Record<Locale,string>={
  ja:'ja',
  en:'en',
  'zh-cn':'zh-Hans',
  'zh-tw':'zh-Hant',
  ko:'ko'
};

export function isLocale(value:string|undefined|null):value is Locale {
  return Boolean(value && (SUPPORTED_LOCALES as readonly string[]).includes(value.toLowerCase()));
}

export function normalizeLocale(value:string|undefined|null):Locale {
  const normalized=(value||'').toLowerCase();
  return isLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname:string):{locale:Locale;pathname:string;hadPrefix:boolean}{
  const parts=pathname.split('/').filter(Boolean);
  const first=(parts[0]||'').toLowerCase();
  if(first!=='ja' && isLocale(first)){
    const rest='/' + parts.slice(1).join('/');
    return {locale:first,pathname:rest==='/'?'/':rest,hadPrefix:true};
  }
  return {locale:DEFAULT_LOCALE,pathname:pathname||'/',hadPrefix:false};
}

export function localePath(pathname:string,locale:Locale):string {
  const stripped=stripLocalePrefix(pathname).pathname;
  if(locale===DEFAULT_LOCALE) return stripped || '/';
  return `/${locale}${stripped==='/'?'':stripped}`;
}
