export type CkanResourceLike={
  id?:string|null;
  url?:string|null;
  name?:string|null;
  format?:string|null;
  mimetype?:string|null;
  state?:string|null;
  last_modified?:string|null;
  created?:string|null;
};

export type ResolvedCkanResource={
  id:string;
  url:string;
  name:string|null;
  modifiedAt:string|null;
  ageDays:number|null;
  fresh:boolean;
};

function timestamp(value:string|null|undefined){
  if(!value)return null;
  const ms=Date.parse(value);
  return Number.isFinite(ms)?ms:null;
}

function isCsv(resource:CkanResourceLike){
  const format=(resource.format||'').trim().toLowerCase();
  const mime=(resource.mimetype||'').trim().toLowerCase();
  const url=(resource.url||'').toLowerCase();
  return format==='csv'||mime==='text/csv'||url.includes('.csv');
}

function httpsUrl(value:string|null|undefined){
  if(!value)return null;
  try{
    const url=new URL(value);
    return url.protocol==='https:'?url.toString():null;
  }catch{return null;}
}

export function selectLatestCkanCsvResource(
  resources:CkanResourceLike[],
  options:{now?:string;maxAgeDays?:number}={}
):ResolvedCkanResource|null{
  const nowMs=timestamp(options.now||new Date().toISOString());
  if(nowMs===null)throw new Error('invalid resolver now timestamp');
  const maxAgeDays=options.maxAgeDays??45;
  if(!Number.isFinite(maxAgeDays)||maxAgeDays<0)throw new Error('invalid maxAgeDays');

  const candidates=resources.flatMap((resource)=>{
    const url=httpsUrl(resource.url);
    if(!url||!isCsv(resource)||(resource.state&&resource.state!=='active'))return [];
    const modified=timestamp(resource.last_modified)||timestamp(resource.created);
    return [{resource,url,modified}];
  }).sort((a,b)=>(b.modified??-Infinity)-(a.modified??-Infinity));

  const best=candidates[0];
  if(!best)return null;
  const ageDays=best.modified===null?null:Math.max(0,(nowMs-best.modified)/86_400_000);
  return {
    id:best.resource.id||best.url,
    url:best.url,
    name:best.resource.name||null,
    modifiedAt:best.modified===null?null:new Date(best.modified).toISOString(),
    ageDays:ageDays===null?null:Number(ageDays.toFixed(2)),
    fresh:ageDays!==null&&ageDays<=maxAgeDays
  };
}
