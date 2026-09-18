import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, adminConfigReady, createAdminSessionToken, validateAdminPassword } from '@/lib/admin-auth';

export const runtime='nodejs';

export async function POST(request:Request){
  const data=await request.formData();
  const password=String(data.get('password')||'');
  const target=new URL('/admin/login',request.url);

  if(!adminConfigReady()){
    target.searchParams.set('error','config');
    return NextResponse.redirect(target,303);
  }
  if(!validateAdminPassword(password)){
    target.searchParams.set('error','1');
    return NextResponse.redirect(target,303);
  }

  const response=NextResponse.redirect(new URL('/admin',request.url),303);
  response.cookies.set(ADMIN_COOKIE,createAdminSessionToken(),{
    httpOnly:true,
    secure:process.env.NODE_ENV==='production',
    sameSite:'lax',
    path:'/',
    maxAge:ADMIN_SESSION_MAX_AGE
  });
  return response;
}
