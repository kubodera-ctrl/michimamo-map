import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, validateAdminSession } from '@/lib/admin-auth';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { buildXShareUrl } from '@/lib/share';
import { siteUrl } from '@/lib/seo';
import { CATEGORY_OPTIONS, PRICE_LABELS } from '@/lib/events';
import { isSameOriginRequest } from '@/lib/request-security';
import {MACHIIBE_SOCIAL_MASTER} from '@/lib/machiibe-social-master';

export const runtime='nodejs';

const categoryLabels=Object.fromEntries(CATEGORY_OPTIONS) as Record<string,string>;

function formatDate(start:string,end:string){
  return start===end ? start : `${start}〜${end}`;
}

function formatTime(start:string|null|undefined,end:string|null|undefined){
  if(!start) return '時間未定';
  return end ? `${start.slice(0,5)}〜${end.slice(0,5)}` : start.slice(0,5);
}

export async function GET(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.redirect(new URL('/admin/login',request.url),303);
  const slug=new URL(request.url).searchParams.get('slug')||'';
  const db=getAdminSupabase();
  if(!db || !slug) return NextResponse.redirect(new URL('/admin?error=x',request.url),303);

  const {data,error}=await db.rpc('get_public_event',{p_slug:slug});
  if(error || !data) return NextResponse.redirect(new URL('/admin?error=x',request.url),303);

  const event=data as {
    title:string;summary:string|null;start_date:string;end_date:string;
    start_time:string|null;end_time:string|null;prefecture:string;municipality?:string|null;
    venue_name?:string|null;audience_intent:string;category_keys:string[];price_type:'free'|'partly_free'|'paid'|'unknown';
    indoor:boolean|null;event_status:string;
  };

  if(['cancelled','postponed','sold_out','registration_closed'].includes(event.event_status)){
    return NextResponse.redirect(new URL('/admin?error=x-unavailable',request.url),303);
  }

  await db.rpc('service_record_machiibe_metric',{
    p_metric:'admin_x_compose',
    p_event_slug:slug,
    p_search_term:null
  });

  const conditions=[
    event.audience_intent==='child_centered'?'子どもが主役':event.audience_intent==='family_friendly'?'ファミリー向け':'',
    event.indoor===true?'屋内':'',
    PRICE_LABELS[event.price_type],
    ...(event.category_keys||[]).slice(0,2).map((key)=>categoryLabels[key]||'')
  ].filter(Boolean).slice(0,4).join('・');

  return NextResponse.redirect(buildXShareUrl({
    prefix:'【新着イベント】',
    placeText:[event.prefecture,event.municipality].filter(Boolean).join(' '),
    title:event.title,
    conditionText:conditions,
    dateText:formatDate(event.start_date,event.end_date),
    timeText:formatTime(event.start_time,event.end_time),
    summary:event.summary||undefined,
    ctaLines:[MACHIIBE_SOCIAL_MASTER.copy.cta.machiibe,MACHIIBE_SOCIAL_MASTER.copy.cta.machimamo],
    pageUrl:siteUrl(`/events/${slug}`),
    hashtags:['イベント情報']
  }),302);
}
