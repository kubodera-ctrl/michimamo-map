import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/request-security';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, validateAdminSession } from '@/lib/admin-auth';
import { getAdminSupabase } from '@/lib/supabase-admin';

export const runtime='nodejs';

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.redirect(new URL('/admin/login',request.url),303);
  const data=await request.formData();
  const eventId=Number(data.get('event_id'));
  const enabled=String(data.get('enabled'))==='1';
  if(!Number.isInteger(eventId)||eventId<=0) return NextResponse.redirect(new URL('/admin?error=event',request.url),303);
  const db=getAdminSupabase();
  if(!db) return NextResponse.redirect(new URL('/admin?error=config',request.url),303);
  const {error}=await db.rpc('service_set_machiibe_pickup',{p_event_id:eventId,p_enabled:enabled,p_rank:50});
  return NextResponse.redirect(new URL(error?'/admin?error=pickup':'/admin?updated=pickup',request.url),303);
}
