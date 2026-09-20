import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/request-security';
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, adminConfigReady, createAdminSessionToken, validateAdminPassword } from '@/lib/admin-auth';
import { allowRequest, requestClientKey } from '@/lib/server-rate-limit';

export const runtime='nodejs';

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const rate=allowRequest(requestClientKey(request,'admin-login'),8,10*60_000);
  if(!rate.allowed){
    const rateTarget=new URL('/admin/login',request.url);
    rateTarget.searchParams.set('error','rate');
    return NextResponse.redirect(rateTarget,303);
  }
  const data=await request.formData();
  const password=String(data.get('password')||'');
  const target=new URL('/admin/login',request.url);

  if(!adminConfigReady()){
    target.searchParams.set('error','config');
    return NextResponse.redirect(target,303);
  }
  if(!validateAdminPassword(password)){
    await new Promise((resolve)=>setTimeout(resolve,600));
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
