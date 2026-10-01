import {NextResponse} from 'next/server';
import {getEvent} from '@/lib/events';
import {normalizeLocale} from '@/lib/i18n-config';
import {getPublicSupabase} from '@/lib/supabase';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type Params=Promise<{slug:string}>;

export async function GET(request:Request,{params}:{params:Params}){
  const {slug}=await params;
  if(!/^[a-z0-9][a-z0-9-]{2,159}$/.test(slug)){
    return NextResponse.json({error:{code:'invalid_slug'}},{status:400});
  }

  const locale=normalizeLocale(new URL(request.url).searchParams.get('lang'));
  const event=await getEvent(slug,locale);
  if(!event) return NextResponse.json({error:{code:'not_found'}},{status:404});

  const db=getPublicSupabase();
  let provenance:null|Record<string,unknown>=null;
  if(db){
    const {data,error}=await db.rpc('get_public_event_provenance',{p_slug:slug});
    if(!error && data && typeof data==='object') provenance=data as Record<string,unknown>;
  }

  return NextResponse.json({
    data:{...event,provenance},
    meta:{apiVersion:'v1',locale}
  },{headers:{'Cache-Control':'public, max-age=60, stale-while-revalidate=300'}});
}
