import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {ADMIN_COOKIE,validateAdminSession} from '@/lib/admin-auth';
import {getAdminSupabase} from '@/lib/supabase-admin';
import {isSameOriginRequest} from '@/lib/request-security';

export const runtime='nodejs';

const EVENT_STATUS=new Set(['scheduled','changed','postponed','cancelled','sold_out','registration_closed']);
const VERIFY_STATUS=new Set(['unverified','verified','needs_review']);
const PUBLICATION_STATUS=new Set(['draft','published','expired','hidden']);
const PRICE_TYPES=new Set(['free','partly_free','paid','unknown']);
const AUDIENCE=new Set(['child_centered','family_friendly','general','adult_oriented']);
const isoDate=(v:string)=>/^\d{4}-\d{2}-\d{2}$/.test(v);
const httpUrl=(v:string)=>{try{const u=new URL(v);return u.protocol==='http:'||u.protocol==='https:';}catch{return false;}};
const text=(data:FormData,name:string,max:number)=>String(data.get(name)||'').trim().slice(0,max);
const nullable=(value:string)=>value||null;

export async function POST(request:Request){
  if(!isSameOriginRequest(request)) return new Response('Forbidden',{status:403});
  const jar=await cookies();
  if(!validateAdminSession(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.redirect(new URL('/admin/login',request.url),303);

  const data=await request.formData();
  const slug=text(data,'slug',160);
  const back=new URL(`/admin/events/${encodeURIComponent(slug)}`,request.url);
  const fail=(code:string)=>{back.searchParams.set('error',code);return NextResponse.redirect(back,303);};

  if(!/^[a-z0-9][a-z0-9-]{2,159}$/.test(slug)) return fail('slug');
  const title=text(data,'title',300);
  const startDate=text(data,'start_date',10);
  const endDate=text(data,'end_date',10);
  const startTime=text(data,'start_time',5);
  const endTime=text(data,'end_time',5);
  const eventStatus=text(data,'event_status',40);
  const verificationStatus=text(data,'verification_status',40);
  const publicationStatus=text(data,'publication_status',40);
  const priceType=text(data,'price_type',30);
  const audience=text(data,'audience_intent',40);
  const officialUrl=text(data,'official_url',1000);
  const indoorRaw=text(data,'indoor',10);

  if(!title || !prefecture || !isoDate(startDate) || !isoDate(endDate) || endDate<startDate) return fail('dates');
  if(startTime && !/^\d{2}:\d{2}$/.test(startTime)) return fail('start-time');
  if(endTime && !/^\d{2}:\d{2}$/.test(endTime)) return fail('end-time');
  if(!EVENT_STATUS.has(eventStatus)||!VERIFY_STATUS.has(verificationStatus)||!PUBLICATION_STATUS.has(publicationStatus)) return fail('status');
  if(!PRICE_TYPES.has(priceType)||!AUDIENCE.has(audience)||!httpUrl(officialUrl)) return fail('fields');
  if(!['','true','false'].includes(indoorRaw)) return fail('indoor');

  const db=getAdminSupabase();
  if(!db) return fail('config');
  const {data:event,error:readError}=await db.from('events').select('id,source_id,event_status').eq('slug',slug).maybeSingle();
  if(readError||!event) return fail('event');
  const {data:source,error:sourceError}=await db.from('regional_sources').select('event_use_allowed,is_active').eq('id',event.source_id).maybeSingle();
  if(sourceError||!source) return fail('source');

  if(publicationStatus==='published' && (verificationStatus!=='verified' || !source.event_use_allowed || !source.is_active)) {
    return fail('publish-gate');
  }

  const update:Record<string,unknown>={
    title,
    summary:nullable(text(data,'summary',2000)),
    start_date:startDate,
    end_date:endDate,
    start_time:nullable(startTime),
    end_time:nullable(endTime),
    event_status:eventStatus,
    status_note:nullable(text(data,'status_note',500)),
    venue_name:nullable(text(data,'venue_name',300)),
    prefecture,
    municipality:nullable(text(data,'municipality',100)),
    address:nullable(text(data,'address',500)),
    official_url:officialUrl,
    price_type:priceType,
    price_text:nullable(text(data,'price_text',1000)),
    indoor:indoorRaw===''?null:indoorRaw==='true',
    audience_intent:audience,
    audience_intent_verified:verificationStatus==='verified',
    verification_status:verificationStatus,
    publication_status:publicationStatus,
    updated_at:new Date().toISOString()
  };
  if(verificationStatus==='verified') update.last_verified_at=new Date().toISOString();
  if(eventStatus!==event.event_status) update.status_updated_at=new Date().toISOString();

  const {error}=await db.from('events').update(update).eq('id',event.id);
  if(error){console.error('admin event update failed',error.message);return fail('update');}
  back.searchParams.set('updated','1');
  return NextResponse.redirect(back,303);
}
