export function normalizePublicUrl(value:string|undefined|null,{httpsOnly=false}:{httpsOnly?:boolean}={}){
  const raw=(value||'').trim();
  if(!raw) return '';
  try{
    const url=new URL(raw);
    if(httpsOnly ? url.protocol!=='https:' : !['http:','https:'].includes(url.protocol)) return '';
    if(url.username || url.password) return '';
    return url.toString();
  }catch{
    return '';
  }
}

export function configuredSiteUrl(){
  return normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL,{httpsOnly:true});
}

export function publicSiteBaseUrl(){
  return configuredSiteUrl() || 'https://events.example.jp/';
}

export function searchIndexingAllowed(){
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING==='true' && Boolean(configuredSiteUrl());
}

export function machimamoMapUrl(){
  return normalizePublicUrl(process.env.NEXT_PUBLIC_MACHIMAMO_MAP_URL,{httpsOnly:true})
    || 'https://machimamo-map.vercel.app/';
}

export function xAccountUrl(){
  return normalizePublicUrl(process.env.NEXT_PUBLIC_X_ACCOUNT_URL,{httpsOnly:true})
    || 'https://x.com/machiibe01';
}
