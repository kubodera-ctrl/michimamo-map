import crypto from 'node:crypto';

export function validateSourceConfig(source){
  if(!source||typeof source.sourceUrl!=='string')throw new Error('source_url_required');
  const url=new URL(source.sourceUrl);
  if(url.protocol!=='https:')throw new Error('source_https_required');
  const hosts=Array.isArray(source.allowedHosts)?source.allowedHosts:[];
  if(!hosts.length||!hosts.includes(url.hostname))throw new Error('source_host_not_allowed');
  if(!['PENDING','ALLOWED','RESTRICTED'].includes(source.termsStatus))throw new Error('invalid_terms_status');
  return url;
}


export function resolveLinkedSourceUrl(source,indexHtml,{linkText}={}){
  validateSourceConfig(source);
  if(typeof source.sourceIndexUrl!=='string'||!source.sourceIndexUrl)throw new Error('source_index_url_required');
  const indexUrl=new URL(source.sourceIndexUrl);
  if(indexUrl.protocol!=='https:')throw new Error('source_index_https_required');
  const hosts=Array.isArray(source.allowedHosts)?source.allowedHosts:[];
  if(!hosts.includes(indexUrl.hostname))throw new Error('source_index_host_not_allowed');
  const html=String(indexHtml??'');
  if(!html)throw new Error('source_index_empty');

  const anchors=[...html.matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)]
    .map(m=>({
      href:m[2],
      label:m[3].replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim()
    }));
  const targetLabel=String(linkText||source.stationName||'').normalize('NFKC').replace(/\s+/g,'').trim();
  if(!targetLabel)throw new Error('source_link_text_required');

  const matches=anchors.filter(a=>a.label.normalize('NFKC').replace(/\s+/g,'').includes(targetLabel));
  if(matches.length!==1)throw new Error(matches.length?'source_index_link_ambiguous':'source_index_link_not_found');

  const resolved=new URL(matches[0].href,indexUrl);
  if(resolved.protocol!=='https:')throw new Error('resolved_source_https_required');
  if(!hosts.includes(resolved.hostname))throw new Error('resolved_source_host_not_allowed');
  return resolved.toString();
}

export function validateResolvedSourceUrl(source,resolvedUrl){
  const configured=validateSourceConfig(source).toString();
  const resolved=new URL(resolvedUrl).toString();
  if(configured!==resolved)throw new Error('configured_source_not_current_index_link');
  return true;
}

function getHeader(headers,name){
  if(!headers)return null;
  if(typeof headers.get==='function')return headers.get(name);
  const key=Object.keys(headers).find(k=>k.toLowerCase()===name.toLowerCase());
  return key?headers[key]:null;
}

export async function inspectSource(source,{fetchImpl=globalThis.fetch,etag=null,lastModified=null,allowPending=false}={}){
  validateSourceConfig(source);
  if(typeof fetchImpl!=='function')throw new Error('fetch_unavailable');
  if(source.termsStatus!=='ALLOWED'&&!allowPending)throw new Error('terms_not_allowed');

  const headers={
    Accept:'application/pdf,application/octet-stream;q=0.9,*/*;q=0.1',
    'User-Agent':'machimamo-drive-source-check/1.0'
  };
  if(etag)headers['If-None-Match']=etag;
  if(lastModified)headers['If-Modified-Since']=lastModified;

  const response=await fetchImpl(source.sourceUrl,{method:'GET',headers,redirect:'follow'});
  if(response.status===304){
    return Object.freeze({
      sourceKey:source.sourceKey,
      status:'not_modified',
      httpStatus:304,
      etag:getHeader(response.headers,'etag'),
      lastModified:getHeader(response.headers,'last-modified'),
      bytes:0,
      contentHash:null
    });
  }
  if(!response.ok)throw new Error('source_http_'+response.status);

  const body=new Uint8Array(await response.arrayBuffer());
  const contentType=(getHeader(response.headers,'content-type')||'').toLowerCase();
  const isPdf=contentType.includes('application/pdf')||(body.length>=4&&body[0]===0x25&&body[1]===0x50&&body[2]===0x44&&body[3]===0x46);
  if(!isPdf)throw new Error('source_not_pdf');
  if(body.length<100)throw new Error('source_pdf_too_small');

  return Object.freeze({
    sourceKey:source.sourceKey,
    status:'fetched',
    httpStatus:response.status,
    etag:getHeader(response.headers,'etag'),
    lastModified:getHeader(response.headers,'last-modified'),
    contentType,
    bytes:body.byteLength,
    contentHash:crypto.createHash('sha256').update(body).digest('hex')
  });
}

export function shouldCreateSourceVersion(previous,inspection){
  if(!inspection||inspection.status==='not_modified')return false;
  if(inspection.status!=='fetched'||!inspection.contentHash)throw new Error('invalid_inspection');
  return !previous?.contentHash||previous.contentHash!==inspection.contentHash;
}
