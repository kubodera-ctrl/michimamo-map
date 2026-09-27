import {createHash} from 'node:crypto';
import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {isSameOriginRequest} from '@/lib/request-security';
import {
  MACHIIBE_CAROUSEL_MASTER_VERSION,
  MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
  MACHIIBE_ENDCARD_VERSION,
  planMachiibeCarousel,
  validateMachiibeCarouselInput,
  type CarouselInput
} from '@/lib/machiibe-production-master';
import {AGE_OPTIONS,PRICE_LABELS} from '@/lib/events';
import {PREFECTURES} from '@/lib/prefectures';
import type {EventDetail} from '@/lib/types';

export const runtime='nodejs';

const isoDate=/^\d{4}-\d{2}-\d{2}$/;
const ageLabels=Object.fromEntries(AGE_OPTIONS) as Record<string,string>;

function prefectureCode(name:string){
  const index=PREFECTURES.findIndex(([,label])=>label===name);
  return index>=0?String(index+1).padStart(2,'0'):'';
}

function sha(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function eventToInput(event:EventDetail){
  if(!event.venue_name || !event.municipality || !event.last_verified_at) return null;
  const hasIndoor=event.venue_type_keys.includes('event_venue_indoor');
  const hasOutdoor=event.venue_type_keys.includes('event_venue_outdoor');
  const indoorOutdoor=hasIndoor&&hasOutdoor
    ? 'mixed'
    : event.indoor===true||hasIndoor
      ? 'indoor'
      : event.indoor===false||hasOutdoor
        ? 'outdoor'
        : 'unknown';

  return {
    eventId:String(event.id),
    title:event.title,
    eventCategory:event.category_keys[0]||null,
    venueName:event.venue_name,
    venueAddress:event.address,
    prefecture:event.prefecture,
    municipality:event.municipality,
    startDate:event.start_date,
    endDate:event.end_date,
    startTime:event.start_time,
    endTime:event.end_time,
    priceLabel:event.price_text||PRICE_LABELS[event.price_type],
    ageLabel:event.age_group_keys.length?event.age_group_keys.map((key)=>ageLabels[key]||key).join('・'):null,
    reservationLabel:event.reservation_text
      || (event.reservation_required===true?'予約必要':event.reservation_required===false?'予約不要':'公式情報を確認'),
    indoorOutdoor,
    rainPolicy:null,
    officialUrl:event.official_url,
    sourceName:event.source_name,
    sourceCheckedAt:event.last_verified_at,
    mediaUrl:event.image_url,
    mediaRightsStatus:event.image_url?'approved':'unknown',
    imageMode:event.image_url?'official':'none',
    imageDisclaimer:null,
    isCancelled:event.event_status==='cancelled',
    isPostponed:event.event_status==='postponed',
    isEnded:event.end_date < new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),
    verified:true,
    includedInPost:true,
    summary:event.summary,
    highlightPoints:[],
    tags:[...event.category_keys,...event.fandom_slugs]
  } as const;
}

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.redirect(new URL('/admin/login',request.url),303);

  const form=await request.formData();
  const prefecture=String(form.get('prefecture')||'').trim();
  const from=String(form.get('from')||'').slice(0,10);
  const to=String(form.get('to')||'').slice(0,10);
  const periodLabel=String(form.get('period_label')||'').trim().slice(0,120) || `${from}〜${to}`;
  const featureKey=String(form.get('feature_key')||'').trim().slice(0,80) || null;
  const productionType=String(form.get('production_type')||'CAROUSEL');
  const slugs=form.getAll('event_slug').map((value)=>String(value)).filter((value)=>/^[a-z0-9][a-z0-9-]{2,159}$/.test(value)).slice(0,100);

  if(productionType!=='CAROUSEL') {
    return NextResponse.redirect(new URL('/admin/production/new?error=video-master-unavailable',request.url),303);
  }
  if(!prefecture || !isoDate.test(from) || !isoDate.test(to) || to<from || slugs.length<3){
    return NextResponse.redirect(new URL('/admin/production/new?error=invalid-selection',request.url),303);
  }

  const code=prefectureCode(prefecture);
  if(!code) return NextResponse.redirect(new URL('/admin/production/new?error=prefecture',request.url),303);

  const db=getAdminSupabase();
  if(!db) return NextResponse.redirect(new URL('/admin/production/new?error=db-unconfigured',request.url),303);

  const eventResult=await db.rpc('get_public_events_by_slugs',{p_slugs:slugs});
  if(eventResult.error || !Array.isArray(eventResult.data)){
    return NextResponse.redirect(new URL('/admin/production/new?error=events',request.url),303);
  }

  const events=(eventResult.data as EventDetail[]).filter((event)=>event.prefecture===prefecture && event.start_date<=to && event.end_date>=from);
  const mapped=events.map(eventToInput);
  if(mapped.some((event)=>event===null) || mapped.length<3 || mapped.length!==slugs.length){
    return NextResponse.redirect(new URL('/admin/production/new?error=facts',request.url),303);
  }
  const safeEvents=mapped.filter((event):event is NonNullable<typeof event>=>Boolean(event));
  const plan=planMachiibeCarousel(safeEvents.length);
  if(!plan.eligible) return NextResponse.redirect(new URL('/admin/production/new?error=count',request.url),303);

  const created:string[]=[];
  let cursor=0;
  for(const part of plan.parts){
    const partEvents=safeEvents.slice(cursor,cursor+part.eventCount);
    cursor+=part.eventCount;
    const sourceHash=sha(partEvents.map((event)=>({
      eventId:event.eventId,title:event.title,startDate:event.startDate,endDate:event.endDate,
      venueName:event.venueName,sourceCheckedAt:event.sourceCheckedAt
    })));

    const input:CarouselInput={
      period:{periodType:'custom',periodLabel,periodStart:from,periodEnd:to,holidayCampaignId:null},
      area:{prefecture,prefectureCode:code,municipalityName:null,municipalityCode:null,areaGroupName:null,areaGroupId:null},
      events:partEvents,
      production:{
        productionMasterVersion:MACHIIBE_CAROUSEL_MASTER_VERSION,
        templateVersion:MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
        endcardVersion:MACHIIBE_ENDCARD_VERSION,
        requestedBy:'admin',
        sourceHash,
        forceRegenerate:false
      }
    };

    const validation=validateMachiibeCarouselInput(input);
    if(!validation.ok){
      return NextResponse.redirect(new URL('/admin/production/new?error=validation',request.url),303);
    }

    const generationKey=sha({
      prefectureCode:code,periodStart:from,periodEnd:to,featureKey,
      productionMasterVersion:MACHIIBE_CAROUSEL_MASTER_VERSION,
      partIndex:part.partIndex,partCount:part.partCount,sourceHash
    });

    const existing=await db.from('publishing_post_sets').select('id').eq('generation_key',generationKey).maybeSingle();
    if(existing.data?.id){
      created.push(existing.data.id as string);
      continue;
    }

    const setResult=await db.from('publishing_post_sets').insert({
      service:'machiibe',
      production_type:'CAROUSEL',
      production_master_version:MACHIIBE_CAROUSEL_MASTER_VERSION,
      template_version:MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
      prefecture,
      municipality:null,
      area_group_id:null,
      period_start:from,
      period_end:to,
      period_label:part.partCount>1?`${periodLabel} Part ${part.partIndex}/${part.partCount}`:periodLabel,
      feature_key:featureKey,
      event_count:part.eventCount,
      part_index:part.partIndex,
      part_count:part.partCount,
      source_hash:sourceHash,
      generation_key:generationKey,
      status:'validating',
      requested_by:'admin'
    }).select('id').single();
    if(setResult.error || !setResult.data?.id){
      return NextResponse.redirect(new URL('/admin/production/new?error=create-set',request.url),303);
    }

    const postSetId=String(setResult.data.id);
    const revResult=await db.from('publishing_revisions').insert({
      post_set_id:postSetId,
      revision_number:1,
      production_type:'CAROUSEL',
      master_version:MACHIIBE_CAROUSEL_MASTER_VERSION,
      template_version:MACHIIBE_CAROUSEL_TEMPLATE_VERSION,
      status:'validating',
      input_snapshot:input,
      facts_snapshot:{events:partEvents.map((event)=>({
        eventId:event.eventId,title:event.title,startDate:event.startDate,endDate:event.endDate,
        startTime:event.startTime,endTime:event.endTime,venueName:event.venueName,
        venueAddress:event.venueAddress,municipality:event.municipality,priceLabel:event.priceLabel,
        ageLabel:event.ageLabel,reservationLabel:event.reservationLabel,rainPolicy:event.rainPolicy,
        officialUrl:event.officialUrl,sourceName:event.sourceName,sourceCheckedAt:event.sourceCheckedAt
      }))},
      rights_manifest:{events:partEvents.map((event)=>({
        eventId:event.eventId,mediaUrl:event.mediaUrl,mediaRightsStatus:event.mediaRightsStatus,
        imageMode:event.imageMode,imageDisclaimer:event.imageDisclaimer
      }))},
      page_plan:part,
      facts_qc:'pass',
      rights_qc:'pass',
      visual_qc:'pending',
      golden_qc:'pending',
      page_count_qc:'pass',
      disclaimer_qc:'pass',
      approval_status:'pending',
      publish_eligible:false
    }).select('id').single();
    if(revResult.error){
      await db.from('publishing_post_sets').update({status:'failed'}).eq('id',postSetId);
      return NextResponse.redirect(new URL('/admin/production/new?error=create-revision',request.url),303);
    }

    await db.from('publishing_audit_log').insert({
      service:'machiibe',entity_type:'post_set',entity_id:postSetId,action:'created',
      actor:'admin',after_snapshot:{generationKey,sourceHash,part,eventIds:partEvents.map((event)=>event.eventId)}
    });
    created.push(postSetId);
  }

  return NextResponse.redirect(new URL(`/admin/production?created=${encodeURIComponent(created.join(','))}`,request.url),303);
}
