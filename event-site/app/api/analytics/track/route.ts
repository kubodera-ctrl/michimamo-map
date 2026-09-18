import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase-admin';
import { allowRequest, requestClientKey } from '@/lib/server-rate-limit';

export const runtime='nodejs';

const METRICS=new Set([
  'page_view','search','event_view','event_open','save_event','unsave_event',
  'attended_event','unattended_event','calendar_google','calendar_ics',
  'map_google','map_apple','parking_search','dining_open',
  'machimamo_map','x_share'
]);

function sameOrigin(request:Request){
  const origin=request.headers.get('origin');
  if(!origin) return true;
  try{
    return new URL(origin).host===new URL(request.url).host;
  }catch{return false;}
}

function sanitizeSearchTerm(value:unknown){
  if(typeof value!=='string') return '';
  const term=value.normalize('NFKC').replace(/\s+/g,' ').trim().slice(0,80);
  if(!term) return '';
  if(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(term)) return '';
  if(/\d{8,}/.test(term.replace(/[\s-]/g,''))) return '';
  return term;
}

export async function POST(request:Request){
  if(!sameOrigin(request)) return NextResponse.json({ok:false},{status:403});
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite && fetchSite!=='same-origin' && fetchSite!=='same-site'){
    return NextResponse.json({ok:false},{status:403});
  }
  const rate=allowRequest(requestClientKey(request,'analytics'),60,60_000);
  if(!rate.allowed){
    return NextResponse.json({ok:false,reason:'rate_limited'},{status:429,headers:{'Retry-After':String(rate.retryAfter)}});
  }
  const length=Number(request.headers.get('content-length')||0);
  if(length>4096) return NextResponse.json({ok:false},{status:413});

  let body:Record<string,unknown>;
  try{ body=await request.json(); }catch{ return NextResponse.json({ok:false},{status:400}); }

  const metric=typeof body.metric==='string'?body.metric:'';
  if(!METRICS.has(metric)) return NextResponse.json({ok:false},{status:400});
  const eventSlug=typeof body.eventSlug==='string'?body.eventSlug.slice(0,160):'';
  const searchTerm=sanitizeSearchTerm(body.searchTerm);

  const db=getAdminSupabase();
  if(!db) return NextResponse.json({ok:false,reason:'unconfigured'},{status:503});
  const {error}=await db.rpc('service_record_machiibe_metric',{
    p_metric:metric,
    p_event_slug:eventSlug||null,
    p_search_term:searchTerm||null
  });
  if(error){
    console.error('service_record_machiibe_metric failed',error.message);
    return NextResponse.json({ok:false},{status:500});
  }
  return NextResponse.json({ok:true});
}
