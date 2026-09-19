import 'server-only';

type Bucket={count:number;resetAt:number};
const globalBuckets=globalThis as typeof globalThis & {__machiibeRateBuckets?:Map<string,Bucket>};
const buckets=globalBuckets.__machiibeRateBuckets ?? new Map<string,Bucket>();
globalBuckets.__machiibeRateBuckets=buckets;

export function requestClientKey(request:Request,prefix:string){
  const cloudflare=request.headers.get('cf-connecting-ip')?.trim();
  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real=request.headers.get('x-real-ip')?.trim();
  return `${prefix}:${cloudflare||forwarded||real||'unknown'}`;
}

export function allowRequest(key:string,limit:number,windowMs:number){
  const now=Date.now();
  const current=buckets.get(key);
  if(!current || current.resetAt<=now){
    buckets.set(key,{count:1,resetAt:now+windowMs});
    return {allowed:true,retryAfter:0};
  }
  if(current.count>=limit){
    return {allowed:false,retryAfter:Math.max(1,Math.ceil((current.resetAt-now)/1000))};
  }
  current.count+=1;
  if(buckets.size>5000){
    for(const [bucketKey,bucket] of buckets){
      if(bucket.resetAt<=now) buckets.delete(bucketKey);
    }
  }
  return {allowed:true,retryAfter:0};
}
