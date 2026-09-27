import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {isSameOriginRequest} from '@/lib/request-security';
import {
  PUBLISHING_ADAPTER_IMPLEMENTED,
  planPublishingReadiness
} from '@/lib/publishing-adapter-plan';
import type {PublishingPlatform} from '@/lib/publishing-state';

export const runtime='nodejs';

function mediaCount(value:unknown){
  if(Array.isArray(value)) return value.length;
  if(value && typeof value==='object' && Array.isArray((value as any).items)) return (value as any).items.length;
  return 0;
}

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return new Response('Unauthorized',{status:401});

  const form=await request.formData();
  const postSetId=String(form.get('post_set_id')||'').trim();
  const revisionId=String(form.get('revision_id')||'').trim();
  const platform=String(form.get('platform')||'') as PublishingPlatform;
  if(!postSetId||!revisionId||(platform!=='x'&&platform!=='tiktok')){
    return NextResponse.json({error:'invalid_request'},{status:400});
  }

  const db=getAdminSupabase();
  if(!db) return NextResponse.json({error:'db_unconfigured'},{status:503});

  const setResult=await db.from('publishing_post_sets')
    .select('id,service,production_type,prefecture,period_label')
    .eq('id',postSetId).eq('service','machiibe').maybeSingle();
  if(setResult.error||!setResult.data) return NextResponse.json({error:'post_set_not_found'},{status:404});

  const revisionResult=await db.from('publishing_revisions')
    .select('id,post_set_id,production_type,master_version,status,approval_status,publish_eligible,caption_snapshot,hashtags_snapshot,media_manifest,media_hash')
    .eq('id',revisionId).eq('post_set_id',postSetId).maybeSingle();
  if(revisionResult.error||!revisionResult.data) return NextResponse.json({error:'revision_not_found'},{status:404});

  const revision=revisionResult.data;
  const count=mediaCount(revision.media_manifest);
  const readiness=planPublishingReadiness({
    platform,
    productionType:revision.production_type,
    mediaCount:count,
    publishEligible:Boolean(revision.publish_eligible),
    approvalStatus:revision.approval_status,
    credentialsConfigured:false,
    publicMediaReady:false,
    verifiedMediaDomain:false,
    xMultiPostStrategyApproved:false
  });

  return NextResponse.json({
    previewOnly:true,
    externalRequestSent:false,
    platform,
    postSetId,
    revisionId,
    productionType:revision.production_type,
    masterVersion:revision.master_version,
    mediaCount:count,
    mediaHash:revision.media_hash,
    caption:revision.caption_snapshot,
    hashtags:revision.hashtags_snapshot||[],
    adapterImplemented:PUBLISHING_ADAPTER_IMPLEMENTED[platform],
    readiness
  },{status:readiness.allowed?200:409});
}
