import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';
import {DEFAULT_LOCALE,isLocale,localePath,stripLocalePrefix,type Locale} from './lib/i18n-config';

const COOKIE='machiibe_locale';

function excluded(pathname:string){
  return pathname.startsWith('/api/')
    || pathname==='/api'
    || pathname.startsWith('/admin/')
    || pathname==='/admin'
    || pathname.startsWith('/_next/')
    || pathname==='/favicon.ico'
    || pathname==='/robots.txt'
    || pathname==='/sitemap.xml'
    || pathname==='/manifest.webmanifest'
    || pathname==='/machiibe-icon.svg'
    || /\.[a-z0-9]+$/i.test(pathname);
}

export function middleware(request:NextRequest){
  const {pathname}=request.nextUrl;
  if(excluded(pathname)) return NextResponse.next();

  const parsed=stripLocalePrefix(pathname);
  const cookieLocale=request.cookies.get(COOKIE)?.value?.toLowerCase();
  const preferred:Locale=isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  if(parsed.hadPrefix){
    const url=request.nextUrl.clone();
    url.pathname=parsed.pathname;
    const requestHeaders=new Headers(request.headers);
    requestHeaders.set('x-machiibe-locale',parsed.locale);
    const response=NextResponse.rewrite(url,{request:{headers:requestHeaders}});
    response.cookies.set(COOKIE,parsed.locale,{path:'/',maxAge:60*60*24*365,sameSite:'lax',secure:true});
    response.headers.set('Content-Language',parsed.locale);
    return response;
  }

  if(preferred!==DEFAULT_LOCALE){
    const url=request.nextUrl.clone();
    url.pathname=localePath(pathname,preferred);
    return NextResponse.redirect(url);
  }

  const requestHeaders=new Headers(request.headers);
  requestHeaders.set('x-machiibe-locale',DEFAULT_LOCALE);
  const response=NextResponse.next({request:{headers:requestHeaders}});
  response.headers.set('Content-Language',DEFAULT_LOCALE);
  return response;
}

export const config={
  matcher:['/((?!_next/static|_next/image).*)']
};
