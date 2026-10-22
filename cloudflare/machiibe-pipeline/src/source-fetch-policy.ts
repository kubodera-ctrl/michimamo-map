export function sourceFetchUrlBlocker(rawUrl:string):string|null{
  let url:URL;
  try{url=new URL(rawUrl);}catch{return 'source_url_invalid';}
  if(url.protocol!=='https:')return 'source_url_https_required';
  if(url.username||url.password)return 'source_url_credentials_forbidden';
  if(url.hash)return 'source_url_fragment_forbidden';
  const hostname=url.hostname.toLowerCase().replace(/^\[|\]$/g,'').replace(/\.$/,'');
  if(hostname==='localhost'||hostname.endsWith('.localhost')||hostname.endsWith('.local'))return 'source_url_local_host_forbidden';
  if(url.port&&url.port!=='443')return 'source_url_nonstandard_port';
  if(hostname.includes(':')||/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname))return 'source_url_ip_literal_forbidden';
  if(hostname.endsWith('.internal')||hostname.endsWith('.test')||hostname.endsWith('.invalid')||hostname.endsWith('.example'))return 'source_url_nonpublic_host_forbidden';
  return null;
}

export async function readBoundedBody(response:Response,maxBytes:number):Promise<ArrayBuffer>{
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw new Error('source_size_limit_invalid');
  const declared=Number(response.headers.get('content-length')||'0');
  if(Number.isFinite(declared)&&declared>maxBytes)throw new Error('source_too_large');
  if(!response.body)throw new Error('source_body_missing');
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];
  let total=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.byteLength;
      if(total>maxBytes){
        await reader.cancel('source_too_large');
        throw new Error('source_too_large');
      }
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);
  let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  return bytes.buffer;
}
