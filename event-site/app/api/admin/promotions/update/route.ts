import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {isSameOriginRequest} from '@/lib/request-security';
import {normalizePublicUrl} from '@/lib/url-config';

export const runtime='nodejs';
const approvals=new Set(['pending','approved','rejected','not_required']);

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.redirect(new URL('/admin/login',request.url),303);
  const form=await request.formData();
  const id=String(form.get('id')||'');
  const mediaApproval=String(form.get('media_approval')||'pending');
  const rawUrl=String(form.get('target_url')||'').trim();
  const targetUrl=rawUrl?normalizePublicUrl(rawUrl,{httpsOnly:true}):null;
  const enabled=form.get('enabled')==='1';
  if(!id || !approvals.has(mediaApproval) || (rawUrl&&!targetUrl)){
    return NextResponse.redirect(new URL('/admin/promotions?error=invalid',request.url),303);
  }
  const db=getAdminSupabase();
  if(!db) return NextResponse.redirect(new URL('/admin/promotions?error=db',request.url),303);
  const current=await db.from('machiibe_promotions').select('*').eq('id',id).maybeSingle();
  if(current.error||!current.data) return NextResponse.redirect(new URL('/admin/promotions?error=not-found',request.url),303);
  const next={machiibe_media_approval:mediaApproval,target_url:targetUrl,enabled,updated_at:new Date().toISOString()};
  const update=await db.from('machiibe_promotions').update(next).eq('id',id);
  if(update.error) return NextResponse.redirect(new URL('/admin/promotions?error=gate',request.url),303);
  await db.from('publishing_audit_log').insert({
    service:'machiibe',entity_type:'promotion',entity_id:id,action:'promotion_updated',actor:'admin',
    before_snapshot:{media_approval:current.data.machiibe_media_approval,target_url:current.data.target_url,enabled:current.data.enabled},
    after_snapshot:next
  });
  return NextResponse.redirect(new URL('/admin/promotions',request.url),303);
}
