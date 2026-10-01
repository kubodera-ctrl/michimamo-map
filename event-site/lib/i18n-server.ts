import {headers} from 'next/headers';
import {normalizeLocale,type Locale} from './i18n-config';

export async function getRequestLocale():Promise<Locale>{
  const requestHeaders=await headers();
  return normalizeLocale(requestHeaders.get('x-machiibe-locale'));
}
