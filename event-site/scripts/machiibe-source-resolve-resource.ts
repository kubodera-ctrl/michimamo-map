import fs from 'node:fs';
import path from 'node:path';
import {selectLatestCkanCsvResource} from '../../shared/machiibe-ingestion/resource-resolver';

type RegistryRow={
  source_key:string;
  review_state:string;
  resource_resolver?:string;
  resolver_api_url?:string;
  resolver_max_age_days?:number;
};

async function fetchJsonWithOneRetry(url:string){
  let lastError:unknown=null;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      const response=await fetch(url,{
        headers:{accept:'application/json'},
        redirect:'follow',
        signal:AbortSignal.timeout(30_000)
      });
      if(!response.ok)throw new Error('resolver metadata fetch failed: '+response.status);
      return await response.json();
    }catch(error){
      lastError=error;
      if(attempt===1)await new Promise((resolve)=>setTimeout(resolve,1500));
    }
  }
  const cause=lastError instanceof Error
    ?String((lastError as Error&{cause?:unknown}).cause||lastError.message)
    :String(lastError);
  throw new Error('resolver metadata network failure after one retry: '+cause);
}

async function main(){
  const sourceKey=process.argv[2];
  if(!sourceKey)throw new Error('usage: npm run source:resolve-resource -- <source_key>');
  const registryPath=path.resolve(process.cwd(),'../data/machiibe/national_source_discovery_v1.json');
  const registry=JSON.parse(fs.readFileSync(registryPath,'utf8')) as {sources:RegistryRow[]};
  const row=registry.sources.find((item)=>item.source_key===sourceKey);
  if(!row)throw new Error('source not found: '+sourceKey);
  if(row.resource_resolver!=='CKAN_LATEST_CSV'||!row.resolver_api_url){
    throw new Error('source has no CKAN_LATEST_CSV resolver');
  }
  if(!row.resolver_api_url.startsWith('https://'))throw new Error('resolver API must use HTTPS');

  const payload=await fetchJsonWithOneRetry(row.resolver_api_url) as {
    success?:boolean;
    result?:{resources?:unknown[]};
  };
  if(payload.success!==true||!payload.result||!Array.isArray(payload.result.resources)){
    throw new Error('invalid CKAN package_show payload');
  }
  const resolved=selectLatestCkanCsvResource(payload.result.resources as any[],{
    now:new Date().toISOString(),
    maxAgeDays:row.resolver_max_age_days??45
  });
  const output={
    sourceKey,
    registryState:row.review_state,
    dryRun:true,
    databaseWrite:false,
    activeWrite:false,
    resolver:'CKAN_LATEST_CSV',
    resolved,
    readyFreshnessGate:Boolean(resolved?.fresh)
  };
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}
main().catch((error)=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
