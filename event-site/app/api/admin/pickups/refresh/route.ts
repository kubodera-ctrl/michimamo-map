import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, validateAdminSession } from '@/lib/admin-auth';
import { getAdminSupabase } from '@/lib/supabase-admin';

export const runtime='nodejs';

export async function POST(request:Request){
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.redirect(new URL('/admin/login',request.url),303);
  const db=getAdminSupabase();
  if(!db) return NextResponse.redirect(new URL('/admin?error=config',request.url),303);
  const {error}=await db.rpc('service_refresh_machiibe_pickups',{p_limit:6});
  return NextResponse.redirect(new URL(error?'/admin?error=pickup':'/admin?updated=pickups',request.url),303);
}
