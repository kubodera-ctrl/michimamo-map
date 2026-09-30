export {};

type Row=Record<string,unknown>;

function record(value:unknown):Row|null{
  return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Row:null;
}
function text(value:unknown){
  return typeof value==='string'&&value.trim()?value.trim():null;
}
function validDate(value:string){
  return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'));
}
function addDays(value:string,days:number){
  const date=new Date(value+'T00:00:00Z');
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
function daysBetween(from:string,to:string){
  return Math.round((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86_400_000);
}
function occurrenceRows(row:Row){
  return Array.isArray(row.date_list)?row.date_list.map(record).filter((v):v is Row=>Boolean(v)):[];
}
function distribution(values:(string|null)[]){
  const out:Record<string,number>={};
  for(const value of values){
    const key=value||'(empty)';
    out[key]=(out[key]||0)+1;
  }
  return out;
}

async function main(){
  const today=new Date().toISOString().slice(0,10);
  const from=process.env.MACHIIBE_KAWASAKI_FROM||today;
  const to=process.env.MACHIIBE_KAWASAKI_TO||addDays(from,7);
  const page=Number(process.env.MACHIIBE_KAWASAKI_PAGE||'1');

  if(!validDate(from)||!validDate(to))throw new Error('from/to must be yyyy-MM-dd');
  const span=daysBetween(from,to);
  if(span<0||span>31)throw new Error('Kawasaki audit window must be between 0 and 31 days');
  if(!Number.isInteger(page)||page<1)throw new Error('page must be a positive integer');

  const url=new URL('https://eventapp.city.kawasaki.jp/data/api/v1/events');
  url.searchParams.set('format','JSON');
  url.searchParams.set('from',from);
  url.searchParams.set('to',to);
  url.searchParams.set('page',String(page));

  const started=performance.now();
  const response=await fetch(url,{
    method:'GET',
    headers:{accept:'application/json'},
    redirect:'follow',
    signal:AbortSignal.timeout(20_000)
  });
  const body=await response.text();
  const elapsedMs=Math.round(performance.now()-started);
  if(!response.ok)throw new Error('HTTP '+response.status);

  const payload=JSON.parse(body) as unknown;
  const root=record(payload)||{};
  const events=Array.isArray(root.event_data)?root.event_data.map(record).filter((v):v is Row=>Boolean(v)):[];
  const occurrences=events.flatMap(occurrenceRows);
  const occurrenceDates=occurrences.map((row)=>text(row.date)).filter((v):v is string=>Boolean(v)).sort();
  const updated=events.map((row)=>text(row.upd_date)).filter((v):v is string=>Boolean(v)).sort();
  const openUrls=events.map((row)=>text(row.open_url));
  const addresses=events.map((row)=>text(row.place_adr));
  const withLatLon=events.filter((row)=>row.place_lat!==null&&row.place_lat!==undefined&&row.place_lon!==null&&row.place_lon!==undefined).length;
  const statuses=events.map((row)=>text(row.status)||text(row.status_ext));
  const barrier=events.map((row)=>text(row.barrier_free));

  process.stdout.write(JSON.stringify({
    auditMode:'low_load_single_request',
    requestCount:1,
    databaseWrite:false,
    activeWrite:false,
    productionChange:false,
    mediaFetch:false,
    requested:{from,to,page,spanDays:span,url:url.toString()},
    response:{
      httpStatus:response.status,
      elapsedMs,
      responseSizeBytes:Buffer.byteLength(body,'utf8'),
      totalNumbers:typeof root.total_numbers==='number'?root.total_numbers:null,
      totalPages:typeof root.total_pages==='number'?root.total_pages:null,
      eventCount:events.length,
      occurrenceCount:occurrences.length
    },
    occurrenceDateRange:{
      min:occurrenceDates[0]||null,
      max:occurrenceDates.at(-1)||null
    },
    updDate:{
      populated:updated.length,
      min:updated[0]||null,
      max:updated.at(-1)||null
    },
    openUrl:{
      populated:openUrls.filter(Boolean).length,
      https:openUrls.filter((value)=>value?.startsWith('https://')).length,
      http:openUrls.filter((value)=>value?.startsWith('http://')).length,
      other:openUrls.filter((value)=>Boolean(value)&&!/^https?:\/\//i.test(value!)).length,
      empty:openUrls.filter((value)=>!value).length
    },
    location:{
      addressPopulated:addresses.filter(Boolean).length,
      latLonPopulated:withLatLon
    },
    statusDistribution:distribution(statuses),
    barrierFree:{
      populated:barrier.filter(Boolean).length,
      empty:barrier.filter((value)=>!value).length
    }
  },null,2)+'\n');
}

main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
