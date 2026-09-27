import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {isSameOriginRequest} from '@/lib/request-security';
import {isPublishEligible,type ProductionQcStatus} from '@/lib/machiibe-production-master';

export const runtime='nodejs';
const allowed=new Set<ProductionQcStatus>(['pending','pass','fail']);

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.redirect(new URL('/admin/login',request.url),303);

  const form=await request.formData();
  const postSetId=String(form.get('post_set_id')||'');
  const revisionId=String(form.get('revision_id')||'');
  const visual=String(form.get('visual_qc')||'pending') as ProductionQcStatus;
  const golden=String(form.get('golden_qc')||'pending') as ProductionQcStatus;
  const approve=form.get('approve')==='1';
  if(!postSetId || !revisionId || !allowed.has(visual) || !allowed.has(golden)){
    return NextResponse.redirect(new URL('/admin/production?error=qc',request.url),303);
  }

  const db=getAdminSupabase();
  if(!db) return NextResponse.redirect(new URL('/admin/production?error=db',request.url),303);
  const current=await db.from('publishing_revisions').select('*').eq('id',revisionId).eq('post_set_id',postSetId).maybeSingle();
  if(current.error || !current.data) return NextResponse.redirect(new URL('/admin/production?error=revision',request.url),303);

  const eligible=isPublishEligible({
    facts:current.data.facts_qc,
    rights:current.data.rights_qc,
    visual,
    golden,
    pageCount:current.data.page_count_qc,
    disclaimer:current.data.disclaimer_qc,
    adminApproval:approve
  });

  const approvalStatus=approve?'approved':'pending';
  const nextStatus=eligible?'approved':visual==='fail'||golden==='fail'?'failed':'validating';
  const update=await db.from('publishing_revisions').update({
    visual_qc:visual,
    golden_qc:golden,
    approval_status:approvalStatus,
    approved_at:approve?new Date().toISOString():null,
    approved_by:approve?'admin':null,
    publish_eligible:eligible,
    status:nextStatus,
    updated_at:new Date().toISOString()
  }).eq('id',revisionId).eq('post_set_id',postSetId);
  if(update.error) return NextResponse.redirect(new URL('/admin/production/'+postSetId+'?error=qc-save',request.url),303);

  await db.from('publishing_post_sets').update({status:nextStatus,updated_at:new Date().toISOString()}).eq('id',postSetId);
  await db.from('publishing_audit_log').insert({
    service:'machiibe',entity_type:'revision',entity_id:revisionId,action:'qc_updated',actor:'admin',
    before_snapshot:{visual_qc:current.data.visual_qc,golden_qc:current.data.golden_qc,approval_status:current.data.approval_status,publish_eligible:current.data.publish_eligible},
    after_snapshot:{visual_qc:visual,golden_qc:golden,approval_status:approvalStatus,publish_eligible:eligible}
  });

  return NextResponse.redirect(new URL('/admin/production/'+postSetId,request.url),303);
}
