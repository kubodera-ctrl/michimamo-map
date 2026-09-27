type IngestMessage={
  kind:'ingest-fetch';
  jobId:string;
  sourceId:number;
  requestedAt:string;
};

type ProductionMessage={
  kind:'production-render';
  postSetId:string;
  revisionId:string;
  requestedAt:string;
};

type PipelineMessage=IngestMessage|ProductionMessage;

interface Env{
  MEDIA_BUCKET:R2Bucket;
  INGEST_QUEUE:Queue<PipelineMessage>;
  PRODUCTION_QUEUE:Queue<PipelineMessage>;
  SUPABASE_URL:string;
  SUPABASE_SERVICE_ROLE_KEY:string;
  INTERNAL_ENQUEUE_TOKEN:string;
  PRODUCTION_CALLBACK_URL?:string;
  MAX_RAW_BYTES?:string;
}

function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

function bearer(request:Request){
  const raw=request.headers.get('authorization')||'';
  return raw.startsWith('Bearer ')?raw.slice(7):'';
}

function supabaseHeaders(env:Env,extra:Record<string,string>={}){
  return {
    apikey:env.SUPABASE_SERVICE_ROLE_KEY,
    authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'content-type':'application/json',
    ...extra
  };
}

async function supabase(env:Env,path:string,init:RequestInit={}){
  return fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/'+path,{
    ...init,
    headers:{...supabaseHeaders(env),...(init.headers||{})}
  });
}

async function patchJob(env:Env,jobId:string,patch:Record<string,unknown>){
  const response=await supabase(env,'machiibe_ingest_jobs?id=eq.'+encodeURIComponent(jobId),{
    method:'PATCH',
    body:JSON.stringify({...patch,updated_at:new Date().toISOString()})
  });
  if(!response.ok) throw new Error('job_patch_failed:'+response.status);
}

async function getSource(env:Env,sourceId:number){
  const response=await supabase(
    env,
    'regional_sources?id=eq.'+sourceId+'&select=id,name,source_kind,data_url,homepage_url,terms_review_status,acquisition_mode,automated_fetch_allowed,source_language,is_active'
  );
  if(!response.ok) throw new Error('source_lookup_failed:'+response.status);
  const rows=await response.json() as Array<{
    id:number;name:string;source_kind:string;data_url:string|null;homepage_url:string;
    terms_review_status:string;acquisition_mode:string;automated_fetch_allowed:boolean;source_language:string;is_active:boolean;
  }>;
  return rows[0]||null;
}

async function hash(bytes:ArrayBuffer){
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map((value)=>value.toString(16).padStart(2,'0')).join('');
}

async function handleIngest(message:Message<PipelineMessage>,env:Env){
  const body=message.body;
  if(body.kind!=='ingest-fetch') throw new Error('wrong_queue_message');
  await patchJob(env,body.jobId,{status:'fetching',started_at:new Date().toISOString(),error_code:null,error_message:null});

  const source=await getSource(env,body.sourceId);
  if(!source || !source.is_active) throw new Error('source_inactive');
  if(!source.automated_fetch_allowed || source.terms_review_status!=='reviewed_allowed'){
    await patchJob(env,body.jobId,{status:'failed',finished_at:new Date().toISOString(),error_code:'SOURCE_NOT_AUTOMATION_APPROVED',error_message:'Automated fetch is not allowed for this source.'});
    message.ack();
    return;
  }

  const sourceUrl=source.data_url||source.homepage_url;
  const response=await fetch(sourceUrl,{
    redirect:'follow',
    headers:{'user-agent':'MachiibeBot/1.0 (+https://machiibe-preview.kubodera.workers.dev/partners)'}
  });
  if(!response.ok) throw new Error('source_fetch_failed:'+response.status);

  const maxBytes=Math.max(1,Number(env.MAX_RAW_BYTES||'2097152'));
  const declared=Number(response.headers.get('content-length')||'0');
  if(declared>maxBytes) throw new Error('source_too_large');

  const bytes=await response.arrayBuffer();
  if(bytes.byteLength>maxBytes) throw new Error('source_too_large');
  const rawHash=await hash(bytes);
  const timestamp=new Date().toISOString();
  const key='ingest/'+source.id+'/'+timestamp.slice(0,10)+'/'+rawHash+'.bin';

  await env.MEDIA_BUCKET.put(key,bytes,{
    httpMetadata:{contentType:response.headers.get('content-type')||'application/octet-stream'},
    customMetadata:{sourceId:String(source.id),sourceUrl,fetchedAt:timestamp,sha256:rawHash}
  });

  const insert=await supabase(env,'machiibe_ingest_items',{
    method:'POST',
    headers:{...supabaseHeaders(env),Prefer:'return=minimal,resolution=ignore-duplicates'},
    body:JSON.stringify({
      job_id:body.jobId,
      source_id:source.id,
      source_name:source.name,
      source_type:source.source_kind,
      source_event_id:null,
      source_url:sourceUrl,
      source_language:source.source_language||'ja',
      terms_status:source.terms_review_status,
      raw_hash:rawHash,
      raw_object_key:key,
      fetched_at:timestamp,
      normalization_status:'pending'
    })
  });
  if(!insert.ok) throw new Error('ingest_item_insert_failed:'+insert.status);

  await patchJob(env,body.jobId,{status:'completed',finished_at:timestamp});
  message.ack();
}

async function handleProduction(message:Message<PipelineMessage>,env:Env){
  const body=message.body;
  if(body.kind!=='production-render') throw new Error('wrong_queue_message');
  if(!env.PRODUCTION_CALLBACK_URL){
    message.retry({delaySeconds:3600});
    return;
  }
  const response=await fetch(env.PRODUCTION_CALLBACK_URL,{
    method:'POST',
    headers:{
      authorization:`Bearer ${env.INTERNAL_ENQUEUE_TOKEN}`,
      'content-type':'application/json'
    },
    body:JSON.stringify({postSetId:body.postSetId,revisionId:body.revisionId})
  });
  if(!response.ok) throw new Error('production_callback_failed:'+response.status);
  message.ack();
}

export default {
  async fetch(request:Request,env:Env){
    const url=new URL(request.url);
    if(request.method==='GET'&&url.pathname==='/health'){
      return json({ok:true,service:'machiibe-pipeline'});
    }
    if(request.method!=='POST'||bearer(request)!==env.INTERNAL_ENQUEUE_TOKEN) return json({error:'forbidden'},403);

    const body=await request.json().catch(()=>null) as any;
    if(url.pathname==='/enqueue/ingest'){
      if(!body?.jobId||!Number.isInteger(body?.sourceId)) return json({error:'invalid_payload'},400);
      await env.INGEST_QUEUE.send({kind:'ingest-fetch',jobId:String(body.jobId),sourceId:Number(body.sourceId),requestedAt:new Date().toISOString()});
      return json({queued:true},202);
    }
    if(url.pathname==='/enqueue/production'){
      if(!body?.postSetId||!body?.revisionId) return json({error:'invalid_payload'},400);
      await env.PRODUCTION_QUEUE.send({kind:'production-render',postSetId:String(body.postSetId),revisionId:String(body.revisionId),requestedAt:new Date().toISOString()});
      return json({queued:true},202);
    }
    return json({error:'not_found'},404);
  },

  async queue(batch:MessageBatch<PipelineMessage>,env:Env){
    for(const message of batch.messages){
      try{
        if(batch.queue==='machiibe-ingest') await handleIngest(message,env);
        else if(batch.queue==='machiibe-production') await handleProduction(message,env);
        else throw new Error('unknown_queue');
      }catch(error){
        const messageText=error instanceof Error?error.message:'unknown_error';
        if(message.body.kind==='ingest-fetch'){
          await patchJob(env,message.body.jobId,{
            status:'failed',
            error_code:'QUEUE_PROCESSING_FAILED',
            error_message:messageText,
            attempt_count:message.attempts
          }).catch(()=>undefined);
        }
        message.retry();
      }
    }
  }
};
