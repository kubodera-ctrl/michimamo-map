type CkanResource={
  id?:string|null;
  url?:string|null;
  name?:string|null;
  format?:string|null;
  mimetype?:string|null;
  state?:string|null;
  last_modified?:string|null;
  created?:string|null;
};
type CkanPackage={
  id?:string|null;
  name?:string|null;
  title?:string|null;
  notes?:string|null;
  metadata_modified?:string|null;
  license_id?:string|null;
  license_title?:string|null;
  organization?:{title?:string|null;name?:string|null}|null;
  resources?:CkanResource[];
};

function parseTime(value:string|null|undefined){
  if(!value)return null;
  const ms=Date.parse(value);
  return Number.isFinite(ms)?ms:null;
}
function ageDays(value:string|null|undefined,nowMs:number){
  const ms=parseTime(value);
  return ms===null?null:Number(Math.max(0,(nowMs-ms)/86_400_000).toFixed(2));
}
function csvResource(resource:CkanResource){
  if(resource.state&&resource.state!=='active')return false;
  const url=(resource.url||'').trim();
  if(!url.startsWith('https://'))return false;
  const format=(resource.format||'').toLowerCase();
  const mime=(resource.mimetype||'').toLowerCase();
  return format==='csv'||mime==='text/csv'||/\.csv(?:$|\?)/i.test(url);
}
function eventLike(pkg:CkanPackage){
  const text=[pkg.title,pkg.name,pkg.notes].filter(Boolean).join(' ').normalize('NFKC');
  return /イベント|行事|催事/.test(text);
}
function reusableLicense(pkg:CkanPackage){
  const value=((pkg.license_id||'')+' '+(pkg.license_title||'')).toLowerCase();
  return /cc[-_ ]?by|クリエイティブ・コモンズ.*表示/.test(value);
}
async function fetchJson(url:string){
  let last:unknown=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(30_000)});
      if(!response.ok)throw new Error('CKAN search failed: '+response.status);
      return await response.json();
    }catch(error){
      last=error;
      if(attempt===1)await new Promise((resolve)=>setTimeout(resolve,1500));
    }
  }
  throw last;
}

async function main(){
  const now=new Date();
  const maxAgeDays=Number(process.argv[2]||60);
  if(!Number.isFinite(maxAgeDays)||maxAgeDays<1)throw new Error('invalid maxAgeDays');
  const url=new URL('https://data.bodik.jp/api/3/action/package_search');
  url.searchParams.set('q','イベント OR 行事 OR 催事');
  url.searchParams.set('rows','100');
  url.searchParams.set('sort','metadata_modified desc');
  const payload=await fetchJson(url.toString()) as {
    success?:boolean;
    result?:{results?:CkanPackage[]};
  };
  if(payload.success!==true||!Array.isArray(payload.result?.results)){
    throw new Error('invalid CKAN package_search payload');
  }
  const nowMs=now.getTime();
  const rows=payload.result!.results!.flatMap((pkg)=>{
    if(!eventLike(pkg)||!reusableLicense(pkg))return [];
    const packageAge=ageDays(pkg.metadata_modified,nowMs);
    if(packageAge===null||packageAge>maxAgeDays)return [];
    const resources=(pkg.resources||[]).filter(csvResource)
      .sort((a,b)=>(parseTime(b.last_modified)||parseTime(b.created)||0)-(parseTime(a.last_modified)||parseTime(a.created)||0));
    const resource=resources[0];
    if(!resource)return [];
    const resourceAge=ageDays(resource.last_modified||resource.created,nowMs);
    return [{
      packageId:pkg.id||null,
      packageName:pkg.name||null,
      title:pkg.title||null,
      organization:pkg.organization?.title||pkg.organization?.name||null,
      licenseId:pkg.license_id||null,
      licenseTitle:pkg.license_title||null,
      metadataModified:pkg.metadata_modified||null,
      packageAgeDays:packageAge,
      resourceId:resource.id||null,
      resourceName:resource.name||null,
      resourceUrl:resource.url||null,
      resourceModified:resource.last_modified||resource.created||null,
      resourceAgeDays:resourceAge,
      freshnessCandidate:resourceAge!==null&&resourceAge<=maxAgeDays
    }];
  }).sort((a,b)=>(a.resourceAgeDays??999999)-(b.resourceAgeDays??999999));

  process.stdout.write(JSON.stringify({
    dryRun:true,
    databaseWrite:false,
    activeWrite:false,
    autoPromotion:false,
    maxAgeDays,
    candidateCount:rows.length,
    candidates:rows.slice(0,25)
  },null,2)+'\n');
}
main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
