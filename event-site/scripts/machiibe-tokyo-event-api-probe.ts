async function fetchWithOneRetry(url:string){
  let last:unknown=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch(url,{
        method:'GET',
        headers:{accept:'application/json'},
        redirect:'follow',
        signal:AbortSignal.timeout(30_000)
      });
      if(!response.ok)throw new Error('HTTP '+response.status);
      return response;
    }catch(error){
      last=error;
      if(attempt===1)await new Promise((resolve)=>setTimeout(resolve,1500));
    }
  }
  const cause=last instanceof Error
    ?String((last as Error&{cause?:unknown}).cause||last.message)
    :String(last);
  throw new Error('Tokyo Event API fetch failed after one retry: '+cause);
}
function record(value:unknown):Record<string,unknown>|null{
  return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
}
function rowsFromPayload(payload:unknown){
  if(Array.isArray(payload))return payload;
  const obj=record(payload);
  if(!obj)return [];
  for(const key of ['data','items','results','events','@graph']){
    if(Array.isArray(obj[key]))return obj[key] as unknown[];
  }
  return [];
}
function collectKeys(rows:unknown[]){
  const keys=new Set<string>();
  for(const row of rows.slice(0,20)){
    const obj=record(row);
    if(!obj)continue;
    for(const key of Object.keys(obj))keys.add(key);
  }
  return [...keys].sort();
}
function deepStrings(value:unknown,path='',out:Array<{path:string;value:string}>=[]){
  if(typeof value==='string'){
    out.push({path,value});return out;
  }
  if(Array.isArray(value)){
    value.slice(0,5).forEach((item,index)=>deepStrings(item,path+'['+index+']',out));
    return out;
  }
  const obj=record(value);
  if(obj){
    for(const [key,val] of Object.entries(obj)){
      deepStrings(val,path?(path+'.'+key):key,out);
    }
  }
  return out;
}
function urlFacts(rows:unknown[]){
  let httpsValues=0,officialLike=0;
  const sample:Array<{path:string;value:string}>=[];
  for(const row of rows.slice(0,20)){
    for(const entry of deepStrings(row)){
      if(/^https:\/\//i.test(entry.value)){
        httpsValues++;
        if(/url|uri|web|link|ホームページ|サイト/i.test(entry.path))officialLike++;
        if(sample.length<12)sample.push(entry);
      }
    }
  }
  return {httpsValues,officialLike,sample};
}
async function main(){
  const url='https://api.data.metro.tokyo.lg.jp/v1/Event?limit=20';
  const response=await fetchWithOneRetry(url);
  const payload=await response.json();
  const rows=rowsFromPayload(payload);
  const top=record(payload);
  process.stdout.write(JSON.stringify({
    dryRun:true,
    databaseWrite:false,
    activeWrite:false,
    productionChange:false,
    url,
    httpStatus:response.status,
    contentType:response.headers.get('content-type'),
    topLevel:Array.isArray(payload)?'array':top?Object.keys(top):typeof payload,
    rowCountInResponse:rows.length,
    rowKeys:collectKeys(rows),
    urlFacts:urlFacts(rows),
    firstRow:rows[0]??null
  },null,2)+'\n');
}
main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
