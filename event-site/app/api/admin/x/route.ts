import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, validateAdminSession } from '@/lib/admin-auth';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { buildXShareUrl } from '@/lib/share';
import { siteUrl } from '@/lib/seo';

export const runtime='nodejs';

export async function GET(request:Request){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.redirect(new URL('/admin/login',request.url),303);
  const slug=new URL(request.url).searchParams.get('slug')||'';
  const db=getAdminSupabase();
  if(!db || !slug) return NextResponse.redirect(new URL('/admin?error=x',request.url),303);

  const {data,error}=await db.rpc('get_public_event',{p_slug:slug});
  if(error || !data) return NextResponse.redirect(new URL('/admin?error=x',request.url),303);

  await db.rpc('service_record_machiibe_metric',{
    p_metric:'admin_x_compose',
    p_event_slug:slug,
    p_search_term:null
  });

  const event=data as {title:string;start_date:string;end_date:string;prefecture:string;municipality?:string|null;venue_name?:string|null};
  const dateText=event.start_date===event.end_date?event.start_date:`${event.start_date}〜${event.end_date}`;
  const placeText=[event.prefecture,event.municipality,event.venue_name].filter(Boolean).join(' ');
  return NextResponse.redirect(buildXShareUrl({
    prefix:'【新着イベント】',
    title:event.title,
    dateText,
    placeText,
    pageUrl:siteUrl(`/events/${slug}`)
  }),302);
}
