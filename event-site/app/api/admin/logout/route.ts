import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/request-security';
import { ADMIN_COOKIE } from '@/lib/admin-auth';

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const response=NextResponse.redirect(new URL('/admin/login',request.url),303);
  response.cookies.set(ADMIN_COOKIE,'',{httpOnly:true,sameSite:'lax',path:'/',maxAge:0});
  return response;
}
