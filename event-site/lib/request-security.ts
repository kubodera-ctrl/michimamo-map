export function isSameOriginRequest(request:Request){
  const fetchSite=request.headers.get('sec-fetch-site');
  if(fetchSite && fetchSite!=='same-origin') return false;

  const origin=request.headers.get('origin');
  if(!origin) return true;

  try{
    return new URL(origin).origin===new URL(request.url).origin;
  }catch{
    return false;
  }
}
