export type SourceDiscoveryHint={
  kind:'JSON_LD_EVENT'|'RSS'|'ATOM'|'ICS'|'CSV'|'XLSX'|'SITEMAP';
  url:string|null;
  confidence:'high'|'medium';
};

function absoluteUrl(value:string,baseUrl:string){
  try{return new URL(value,baseUrl).toString();}catch{return null;}
}

function unique(hints:SourceDiscoveryHint[]){
  const seen=new Set<string>();
  return hints.filter((hint)=>{
    const key=hint.kind+'|'+(hint.url||'inline');
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Pure preflight helper only. It discovers candidate structured feeds from HTML
 * without sending any request or implying that terms/robots allow fetching.
 */
export function discoverSourceHintsFromHtml(html:string,baseUrl:string):SourceDiscoveryHint[]{
  const hints:SourceDiscoveryHint[]=[];

  const jsonLd=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const block of jsonLd){
    try{
      const raw=JSON.parse(block[1].trim());
      const nodes:Array<Record<string,unknown>>=[];
      const visit=(value:unknown)=>{
        if(Array.isArray(value)){value.forEach(visit);return;}
        if(!value||typeof value!=='object') return;
        const obj=value as Record<string,unknown>;
        nodes.push(obj);
        if(Array.isArray(obj['@graph'])) obj['@graph'].forEach(visit);
      };
      visit(raw);
      if(nodes.some((node)=>{
        const type=node['@type'];
        return (typeof type==='string'&&type.toLowerCase()==='event')
          || (Array.isArray(type)&&type.some((x)=>String(x).toLowerCase()==='event'));
      })) hints.push({kind:'JSON_LD_EVENT',url:null,confidence:'high'});
    }catch{}
  }

  const linkRe=/<link\b([^>]+)>/gi;
  for(const match of html.matchAll(linkRe)){
    const attrs=match[1];
    const href=attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const type=attrs.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase()||'';
    const rel=attrs.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase()||'';
    if(!href) continue;
    const url=absoluteUrl(href,baseUrl);
    if(!url) continue;
    if(type.includes('rss')) hints.push({kind:'RSS',url,confidence:'high'});
    else if(type.includes('atom')) hints.push({kind:'ATOM',url,confidence:'high'});
    else if(type.includes('calendar')||/\.ics(?:$|[?#])/i.test(url)) hints.push({kind:'ICS',url,confidence:'high'});
    else if(rel.includes('sitemap')) hints.push({kind:'SITEMAP',url,confidence:'medium'});
  }

  for(const match of html.matchAll(/\bhref=["']([^"']+\.(?:csv|xlsx|ics|xml)(?:[?#][^"']*)?)["']/gi)){
    const url=absoluteUrl(match[1],baseUrl);
    if(!url) continue;
    if(/\.csv(?:$|[?#])/i.test(url)) hints.push({kind:'CSV',url,confidence:'medium'});
    else if(/\.xlsx(?:$|[?#])/i.test(url)) hints.push({kind:'XLSX',url,confidence:'medium'});
    else if(/\.ics(?:$|[?#])/i.test(url)) hints.push({kind:'ICS',url,confidence:'medium'});
    else if(/sitemap/i.test(url)) hints.push({kind:'SITEMAP',url,confidence:'medium'});
  }

  return unique(hints);
}
