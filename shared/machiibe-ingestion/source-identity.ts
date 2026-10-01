export type SourceEndpointLike={
  url?:string|null;
  sourceUrl?:string|null;
  eventUrl?:string|null;
  feedUrl?:string|null;
  baseUrl?:string|null;
  homepageUrl?:string|null;
};

const TRACKING_KEYS=new Set([
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'gclid','fbclid'
]);

export function canonicalSourceEndpoint(value:string){
  const raw=value.trim();
  if(!raw) return '';
  try{
    const url=new URL(raw);
    url.hash='';
    const params=[...url.searchParams.entries()]
      .filter(([key])=>!TRACKING_KEYS.has(key.toLowerCase()))
      .sort(([a,av],[b,bv])=>a===b?av.localeCompare(bv):a.localeCompare(b));
    url.search='';
    for(const [key,val] of params) url.searchParams.append(key,val);
    url.hostname=url.hostname.toLowerCase();
    if((url.protocol==='https:'&&url.port==='443')||(url.protocol==='http:'&&url.port==='80')) url.port='';
    url.pathname=url.pathname.replace(/\/{2,}/g,'/').replace(/\/$/,'')||'/';
    return url.toString().replace(/\/$/,'');
  }catch{
    return raw.replace(/\/$/,'').toLowerCase();
  }
}

export function sourceEndpointFromRow(row:SourceEndpointLike){
  return row.eventUrl||row.feedUrl||row.sourceUrl||row.url||row.baseUrl||row.homepageUrl||'';
}

export function groupSourceEndpoints<T extends SourceEndpointLike>(rows:T[]){
  const groups=new Map<string,T[]>();
  for(const row of rows){
    const key=canonicalSourceEndpoint(sourceEndpointFromRow(row));
    if(!key) continue;
    const list=groups.get(key)||[];
    list.push(row);
    groups.set(key,list);
  }
  return groups;
}

export function sourceEndpointStats<T extends SourceEndpointLike>(rows:T[]){
  const groups=groupSourceEndpoints(rows);
  const duplicateRecords=[...groups.values()].reduce((sum,items)=>sum+Math.max(0,items.length-1),0);
  return {
    registryRecords:rows.length,
    uniqueEndpoints:groups.size,
    duplicateRecords
  };
}
