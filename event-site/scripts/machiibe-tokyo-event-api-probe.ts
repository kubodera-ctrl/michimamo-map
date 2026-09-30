export {};

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
  return value!==null&&typeof value==='object'&&!Array.isArray(value)
    ?value as Record<string,unknown>
    :null;
}

function eventRowsAndMeta(payload:unknown){
  if(Array.isArray(payload)){
    if(Array.isArray(payload[0])){
      return {rows:payload[0] as unknown[],meta:record(payload[1]),shape:'[rows,meta]'};
    }
    return {rows:payload as unknown[],meta:null,shape:'rows'};
  }
  const obj=record(payload);
  if(!obj)return {rows:[] as unknown[],meta:null,shape:typeof payload};
  for(const key of ['events','items','results','data']){
    if(Array.isArray(obj[key]))return {rows:obj[key] as unknown[],meta:obj,shape:key};
  }
  return {rows:[] as unknown[],meta:obj,shape:'object'};
}

function nestedRecord(obj:Record<string,unknown>|null,key:string){
  return obj?record(obj[key]):null;
}

function eventName(row:unknown){
  const obj=record(row);
  const names=obj&&Array.isArray(obj['名称'])?obj['名称']:[];
  for(const item of names){
    const n=record(item);
    if(n&&typeof n['表記']==='string'&&n['表記'].trim())return n['表記'].trim();
  }
  return null;
}

function eventDate(row:unknown,key:'開始日'|'終了日'){
  const obj=record(row);
  const period=nestedRecord(obj,'期間');
  const value=period?.[key];
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:null;
}

function eventReference(row:unknown){
  const obj=record(row);
  const ref=nestedRecord(obj,'参照');
  const value=ref?.['参照先'];
  return typeof value==='string'&&value.trim()?value.trim():null;
}

function eventPlace(row:unknown){
  const obj=record(row);
  const place=nestedRecord(obj,'開催場所');
  const address=nestedRecord(place,'住所');
  return {
    venue:typeof place?.['表記']==='string'?place['表記']:null,
    address:typeof address?.['表記']==='string'?address['表記']:null,
    lat:typeof nestedRecord(place,'地理座標')?.['緯度']==='string'?nestedRecord(place,'地理座標')?.['緯度']:null,
    lng:typeof nestedRecord(place,'地理座標')?.['経度']==='string'?nestedRecord(place,'地理座標')?.['経度']:null
  };
}

function dateStats(rows:unknown[]){
  const starts=rows.map((row)=>eventDate(row,'開始日')).filter((x):x is string=>Boolean(x)).sort();
  const ends=rows.map((row)=>eventDate(row,'終了日')).filter((x):x is string=>Boolean(x)).sort();
  return {
    withStartDate:starts.length,
    minStartDate:starts[0]||null,
    maxStartDate:starts.at(-1)||null,
    minEndDate:ends[0]||null,
    maxEndDate:ends.at(-1)||null
  };
}

function referenceStats(rows:unknown[]){
  const refs=rows.map(eventReference).filter((x):x is string=>Boolean(x));
  return {
    withReference:refs.length,
    https:refs.filter((x)=>x.startsWith('https://')).length,
    http:refs.filter((x)=>x.startsWith('http://')).length,
    other:refs.filter((x)=>!/^https?:\/\//.test(x)).length,
    sample:refs.slice(0,10)
  };
}

async function main(){
  const url='https://api.data.metro.tokyo.lg.jp/v1/Event?limit=100';
  const response=await fetchWithOneRetry(url);
  const payload=await response.json();
  const parsed=eventRowsAndMeta(payload);
  const rows=parsed.rows;
  const first=rows[0];
  const firstObj=record(first);
  const meta=parsed.meta;
  process.stdout.write(JSON.stringify({
    dryRun:true,
    databaseWrite:false,
    activeWrite:false,
    productionChange:false,
    url,
    httpStatus:response.status,
    contentType:response.headers.get('content-type'),
    shape:parsed.shape,
    rowCountInPage:rows.length,
    meta,
    dateStats:dateStats(rows),
    referenceStats:referenceStats(rows),
    sample:{
      name:eventName(first),
      startAt:eventDate(first,'開始日'),
      endAt:eventDate(first,'終了日'),
      reference:eventReference(first),
      place:eventPlace(first),
      keys:firstObj?Object.keys(firstObj):[]
    }
  },null,2)+'\n');
}

main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
