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
import {sourceAutomationBlockers,type SourceEligibilityInput} from './source-eligibility';
import {readBoundedBody,sourceFetchUrlBlocker} from './source-fetch-policy';
import {sourcePolicySnapshotFromRegionalRow,type RegionalSourcePolicyRow} from './source-policy-snapshot';
import {normalizeFetchedSourcePayload} from './normalize-source-payload';
import {buildIngestReceipts,receiptReadbackPath,verifyIngestReceipts,type IngestReceipt,type ReceiptReadback} from './ingest-receipts';
import {previewSourceSchedule,previewJobHealth} from './source-schedule-plan';
import {registerAndDispatch,persistMonitorTick} from './r36-durable-dispatch';
import {applyVerifiedNonProdCandidates} from './r36-canonical-consumer';
import type {NormalizationPreviewRow} from './normalize-source-payload';

interface Env{
  MEDIA_BUCKET:R2Bucket;
  INGEST_QUEUE:Queue<PipelineMessage>;
  PRODUCTION_QUEUE:Queue<PipelineMessage>;
  SUPABASE_URL:string;
  SUPABASE_SERVICE_ROLE_KEY:string;
  INTERNAL_ENQUEUE_TOKEN:string;
  PRODUCTION_CALLBACK_URL?:string;
  MAX_RAW_BYTES?:string;
  NORMALIZATION_PREVIEW_ENABLED?:string;
  INGEST_RECEIPT_VERIFY_ENABLED?:string;
  AUTO_UPDATE_SCHEDULER_ENABLED?:string;
  AUTO_UPDATE_NONPROD_PROJECT_REF?:string;
  AUTO_UPDATE_DISPATCH_ENABLED?:string;
  AUTO_UPDATE_MONITOR_PERSIST_ENABLED?:string;
  CANONICAL_UPDATE_ENABLED?:string;
}

function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

function bearer(request:Request){
  const raw=request.headers.get('authorization')||'';
  return raw.startsWith('Bearer ')?raw.slice(7):'';
}

function authorizedEnqueue(request:Request, env:Env) {
  // An empty configured token must never authorize an unauthenticated request.
  return typeof env.INTERNAL_ENQUEUE_TOKEN === 'string'
    && env.INTERNAL_ENQUEUE_TOKEN.length > 0
    && bearer(request) === env.INTERNAL_ENQUEUE_TOKEN;
}

const NONRETRYABLE_PREVIEW_ERRORS = new Set([
  'source_utf8_decode_failed',
  'source_payload_has_no_items',
  'source_json_invalid',
  'source_payload_item_limit_exceeded'
]);
function nonRetryablePreviewError(errorMessage:string){
  return errorMessage.startsWith('source_charset_not_supported:')
    || NONRETRYABLE_PREVIEW_ERRORS.has(errorMessage);
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

const R36_NONPROD_REF='ufomasuyfgfcmwuuufzq';
function enforceR36NonProd(env:Env){
  if(env.AUTO_UPDATE_NONPROD_PROJECT_REF!==R36_NONPROD_REF
    ||env.NORMALIZATION_PREVIEW_ENABLED!=='true'
    ||env.INGEST_RECEIPT_VERIFY_ENABLED!=='true'
    ||!env.SUPABASE_URL
    ||new URL(env.SUPABASE_URL).origin!==`https://${R36_NONPROD_REF}.supabase.co`){
    throw new Error('r36_nonprod_scheduler_gate_closed');
  }
}
async function r36Rpc(env:Env,name:string,args:Record<string,unknown>):Promise<unknown>{
  const response=await supabase(env,'rpc/'+name,{
    method:'POST',body:JSON.stringify(args),headers:{Prefer:'return=representation'}
  });
  if(!response.ok)throw Error('r36_rpc_failed:'+name+':'+response.status);
  try{return await response.json();}catch{throw Error('r36_rpc_response_unconfirmed:'+name);}
}

async function patchJob(env:Env,jobId:string,patch:Record<string,unknown>){
  // PostgREST can return 204 after a PATCH that matched zero rows.
  // A queue message may be ACKed only after its exact job was updated.
  const response=await supabase(env,'machiibe_ingest_jobs?id=eq.'+encodeURIComponent(jobId)+'&select=id',{
    method:'PATCH',
    headers:{Prefer:'return=representation'},
    body:JSON.stringify({...patch,updated_at:new Date().toISOString()})
  });
  if(!response.ok) throw new Error('job_patch_failed:'+response.status);
  let rows:unknown;
  try{rows=await response.json();}catch{throw new Error('job_patch_unconfirmed');}
  if(!Array.isArray(rows)||rows.length!==1||rows[0]?.id!==jobId){
    throw new Error('job_patch_unconfirmed');
  }
}

async function getSource(env:Env,sourceId:number){
  const response=await supabase(
    env,
    'regional_sources?id=eq.'+sourceId+'&select=id,name,source_kind,prefecture,municipality,data_url,homepage_url,terms_review_status,acquisition_mode,automated_fetch_allowed,event_use_allowed,source_language,is_active,robots_status,commercial_use_status,reuse_status,redistribution_status,cache_status,image_use_status_source,sns_use_status,source_stage,fetch_method,last_terms_checked_at,attribution_requirement,update_frequency_minutes,last_checked_at,last_success_at,consecutive_failures,priority,source_etag,source_last_modified'
  );
  if(!response.ok) throw new Error('source_lookup_failed:'+response.status);
  const rows=await response.json() as Array<RegionalSourcePolicyRow&SourceEligibilityInput&{
    id:number;name:string;source_kind:string;data_url:string|null;homepage_url:string;
    terms_review_status:string;acquisition_mode:string;automated_fetch_allowed:boolean;source_language:string;
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
  const durableDispatch=env.AUTO_UPDATE_DISPATCH_ENABLED==='true';
  const canonicalUpdate=env.CANONICAL_UPDATE_ENABLED==='true';
  if(durableDispatch||canonicalUpdate){enforceR36NonProd(env);}
  if(canonicalUpdate&&!durableDispatch)throw Error('r36_canonical_requires_durable_dispatch');
  if(durableDispatch){
    // A Queue consumer can be invoked more than once for an already-finished
    // job (including after finish_dispatch succeeded but ACK was lost).
    // Never change a completed job back to fetching or reapply its canonical
    // mutation. Verify both the job identity and its durable outbox first.
    const lookup=await supabase(env,'machiibe_ingest_jobs?id=eq.'+encodeURIComponent(body.jobId)+'&select=id,source_id,status&limit=2');
    if(!lookup.ok)throw Error('r36_job_lookup_failed:'+lookup.status);
    let jobs:unknown;
    try{jobs=await lookup.json();}catch{throw Error('r36_job_lookup_invalid_json');}
    if(!Array.isArray(jobs)||jobs.length!==1||jobs[0]?.id!==body.jobId
      ||jobs[0]?.source_id!==body.sourceId||typeof jobs[0]?.status!=='string'){
      throw Error('r36_job_identity_unconfirmed');
    }
    if(jobs[0].status==='completed'){
      const confirmed=await r36Rpc(env,'machiibe_nonprod_finish_dispatch_r36',{
        p_job_id:body.jobId,p_success:true,p_error:null
      });
      if(confirmed!==true)throw Error('r36_replay_finish_unconfirmed');
      message.ack();
      return;
    }
    if(jobs[0].status==='failed'){
      const outbox=await supabase(env,'machiibe_nonprod_dispatch_outbox?job_id=eq.'+encodeURIComponent(body.jobId)+'&select=status&limit=2');
      if(!outbox.ok)throw Error('r36_failed_job_outbox_lookup_failed:'+outbox.status);
      let entries:unknown;
      try{entries=await outbox.json();}catch{throw Error('r36_failed_job_outbox_invalid_json');}
      if(!Array.isArray(entries)||entries.length!==1||typeof entries[0]?.status!=='string')throw Error('r36_failed_job_outbox_unconfirmed');
      if(entries[0].status==='dead_letter'){
        message.ack();
        return;
      }
    }
    if(!['queued','fetching','normalizing','failed'].includes(jobs[0].status)){
      throw Error('r36_unknown_job_state');
    }
  }
  await patchJob(env,body.jobId,{status:'fetching',started_at:new Date().toISOString(),error_code:null,error_message:null});

  const source=await getSource(env,body.sourceId);
  if(!source) throw new Error('source_inactive');
  const policySnapshot=sourcePolicySnapshotFromRegionalRow(source);
  if(policySnapshot.blockers.length){
    await patchJob(env,body.jobId,{status:'failed',finished_at:new Date().toISOString(),error_code:'SOURCE_POLICY_SNAPSHOT_INCOMPLETE',error_message:policySnapshot.blockers.join(',')});
    message.ack();
    return;
  }
  const policyBlockers=sourceAutomationBlockers(source,Date.now());
  if(policyBlockers.length){
    await patchJob(env,body.jobId,{status:'failed',finished_at:new Date().toISOString(),error_code:'SOURCE_NOT_AUTOMATION_APPROVED',error_message:policyBlockers.join(',')});
    message.ack();
    return;
  }

  const sourceUrl=source.data_url||source.homepage_url;
  const urlBlocker=sourceFetchUrlBlocker(sourceUrl);
  if(urlBlocker){
    await patchJob(env,body.jobId,{status:'failed',finished_at:new Date().toISOString(),error_code:'SOURCE_URL_NOT_ALLOWED',error_message:urlBlocker});
    message.ack();
    return;
  }
  const response=await fetch(sourceUrl,{
    redirect:'manual',
    headers:{'user-agent':'MachiibeBot/1.0 (+https://machiibe.sumion.net/partners)'}
  });
  if(response.status>=300&&response.status<400)throw new Error('source_redirect_blocked');
  if(!response.ok) throw new Error('source_fetch_failed:'+response.status);

  const configuredMax=Number(env.MAX_RAW_BYTES||'2097152');
  const maxBytes=Math.min(8*1024*1024,Math.max(1,configuredMax));
  const bytes=await readBoundedBody(response,maxBytes);
  const rawHash=await hash(bytes);
  const timestamp=new Date().toISOString();
  const receiptMode=env.INGEST_RECEIPT_VERIFY_ENABLED==='true';
  // Opting into durable receipts without the reviewed preview parser would
  // accidentally accept an unverified whole-feed envelope as an event.
  if(receiptMode && env.NORMALIZATION_PREVIEW_ENABLED!=='true') throw new Error('receipt_requires_normalization_preview');
  const key=receiptMode
    ? 'ingest/'+source.id+'/'+rawHash+'.bin'
    : 'ingest/'+source.id+'/'+timestamp.slice(0,10)+'/'+rawHash+'.bin';

  let itemRows:Record<string,unknown>[]|null=null;
  let normalizedCandidates:NormalizationPreviewRow[]|null=null;
  if(env.NORMALIZATION_PREVIEW_ENABLED==='true'){
    const contentType=response.headers.get('content-type')||'';
    const charset=contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]?.toLowerCase();
    if(charset&&!['utf-8','utf8'].includes(charset))throw new Error('source_charset_not_supported:'+charset);
    let textBody:string;
    try{textBody=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes);}catch{throw new Error('source_utf8_decode_failed');}
    const normalized=normalizeFetchedSourcePayload(textBody,policySnapshot.source,rawHash);
    if(!normalized.parsedCount)throw new Error('source_payload_has_no_items');
    normalizedCandidates=normalized.rows;
    itemRows=normalized.rows.map((row)=>({
      job_id:body.jobId,
      source_id:source.id,
      source_name:source.name,
      source_type:source.source_kind,
      source_event_id:row.sourceEventId,
      source_url:row.candidate.officialUrl||row.candidate.sourceUrl,
      source_language:source.source_language||'ja',
      terms_status:source.terms_review_status,
      raw_hash:rawHash,
      raw_object_key:key,
      fetched_at:timestamp,
      normalization_status:row.status==='needs_review'?'needs_review':'pending',
      error_code:row.blockers.length?'NORMALIZATION_REVIEW_REQUIRED':null,
      error_message:row.blockers.length?row.blockers.join(','):null
    }));
  }

  const receipts:IngestReceipt[]|null=receiptMode
    ? buildIngestReceipts((itemRows||[]) as Parameters<typeof buildIngestReceipts>[0])
    : null;

  await env.MEDIA_BUCKET.put(key,bytes,{
    httpMetadata:{contentType:response.headers.get('content-type')||'application/octet-stream'},
    customMetadata:{sourceId:String(source.id),sourceUrl,fetchedAt:timestamp,sha256:rawHash}
  });

  const insert=await supabase(env,receiptMode?'machiibe_ingest_items?on_conflict=receipt_key':'machiibe_ingest_items',{
    method:'POST',
    headers:{...supabaseHeaders(env),Prefer:'return=minimal,resolution=ignore-duplicates'},
    body:JSON.stringify(receipts||itemRows||{
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

  if(receipts){
    // Supabase/PostgREST reports success for INSERT ... ON CONFLICT DO NOTHING
    // even if zero rows were inserted. Read the actual saved receipt keys back
    // before acknowledging the message; a duplicate fetch may reuse prior rows.
    const confirmed:ReceiptReadback[]=[];
    for(let offset=0;offset<receipts.length;offset+=16){
      const expected=receipts.slice(offset,offset+16);
      const result=await supabase(env,receiptReadbackPath(expected));
      if(!result.ok) throw new Error('receipt_readback_failed:'+result.status);
      let rows:unknown;
      try{rows=await result.json();}catch{throw new Error('receipt_readback_unconfirmed');}
      if(!Array.isArray(rows)) throw new Error('receipt_readback_unconfirmed');
      confirmed.push(...rows as ReceiptReadback[]);
    }
    if(!verifyIngestReceipts(receipts,confirmed)) throw new Error('receipt_readback_unconfirmed');
  }

  if(durableDispatch){
    if(!receipts)throw Error('r36_dispatch_receipts_required');
    const linked=await r36Rpc(env,'machiibe_nonprod_link_job_receipts_r36',{
      p_job_id:body.jobId,p_receipt_keys:receipts.map(row=>row.receipt_key)
    });
    if(linked!==receipts.length)throw Error('r36_receipt_job_link_unconfirmed');
  }
  if(canonicalUpdate){
    if(!normalizedCandidates||!receipts)throw Error('r36_canonical_normalization_required');
    const currentSource=policySnapshot.source;
    const updates=await applyVerifiedNonProdCandidates(normalizedCandidates,currentSource,
      async (table,filter)=>{
        const result=await supabase(env,table+'?'+filter);
        if(!result.ok)throw Error('r36_canonical_lookup_failed:'+result.status);
        try{return await result.json();}catch{throw Error('r36_canonical_lookup_invalid_json');}
      },async(name,args)=>r36Rpc(env,name,args));
    console.info('machiibe_r36_canonical_nonprod',JSON.stringify(updates));
  }
  await patchJob(env,body.jobId,{status:'completed',finished_at:timestamp});
  if(durableDispatch){
    const confirmed=await r36Rpc(env,'machiibe_nonprod_finish_dispatch_r36',{
      p_job_id:body.jobId,p_success:true,p_error:null
    });
    if(confirmed!==true)throw Error('r36_dispatch_finish_unconfirmed');
  }
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
    if(request.method!=='POST'||!authorizedEnqueue(request,env)) return json({error:'forbidden'},403);

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

  /** R36: bounded, read-only dry-run. No cron trigger is configured in
   * wrangler.jsonc. Even if invoked manually, flags default OFF. No queue,
   * database mutation or alerts are sent from this handler. */
  async scheduled(controller:{scheduledTime:number;cron:string},env:Env){
    if(env.AUTO_UPDATE_SCHEDULER_ENABLED!=='true')return;
    enforceR36NonProd(env);
    const fields='id,name,source_kind,prefecture,municipality,homepage_url,data_url,fetch_method,terms_review_status,robots_status,commercial_use_status,reuse_status,redistribution_status,cache_status,image_use_status_source,sns_use_status,attribution_requirement,source_stage,last_terms_checked_at,update_frequency_minutes,last_checked_at,last_success_at,consecutive_failures,is_active,priority,automated_fetch_allowed,event_use_allowed,source_etag,source_last_modified,acquisition_mode';
    const response=await supabase(env,'regional_sources?select='+fields+'&order=priority.asc,id.asc&limit=100');
    if(!response.ok)throw new Error('r36_sources_read_failed:'+response.status);
    const rows:unknown=await response.json();
    const plan=previewSourceSchedule(rows,controller.scheduledTime);
    const jobResult=await supabase(env,'machiibe_ingest_jobs?select=id,status,requested_at,started_at,updated_at,attempt_count&order=updated_at.desc&limit=100');
    if(!jobResult.ok)throw new Error('r36_jobs_read_failed:'+jobResult.status);
    const jobs=previewJobHealth(await jobResult.json(),controller.scheduledTime);
    let registered=0,dispatched=0;
    if(env.AUTO_UPDATE_DISPATCH_ENABLED==='true'){
      const result=await registerAndDispatch(plan.due,
        async(name,args)=>r36Rpc(env,name,args),
        async body=>env.INGEST_QUEUE.send(body),new Date(controller.scheduledTime).toISOString());
      registered=result.registered;
      dispatched=result.dispatched;
    }
    if(env.AUTO_UPDATE_MONITOR_PERSIST_ENABLED==='true'){
      await persistMonitorTick(async(name,args)=>r36Rpc(env,name,args),controller.scheduledTime,{
        scanned:plan.scanned,eligible:plan.eligible,due:plan.dueTotal,registered,dispatched,
        stalled:jobs.stalled,failed:jobs.failed,dead_letter:jobs.deadLetter
      },plan.alerts);
    }
    // Aggregate-only telemetry: do not log source URLs, secrets, or full rows.
    console.info('machiibe_r36_nonprod_schedule_preview',JSON.stringify({
      scanned:plan.scanned,eligible:plan.eligible,held:plan.held,due:plan.dueTotal,
      alertCount:plan.alerts.length,truncated:plan.truncated,
      monitoredJobs:jobs.scanned,stalledJobs:jobs.stalled,failedJobs:jobs.failed,
      deadLetters:jobs.deadLetter,invalidJobs:jobs.invalid,
      queueWrites:dispatched,databaseWrites:env.AUTO_UPDATE_DISPATCH_ENABLED==='true'||env.AUTO_UPDATE_MONITOR_PERSIST_ENABLED==='true'?'nonprod':'none',notificationsSent:0
    }));
  },

  async queue(batch:MessageBatch<PipelineMessage>,env:Env){
    for(const message of batch.messages){
      try{
        if(batch.queue==='machiibe-ingest') await handleIngest(message,env);
        else if(batch.queue==='machiibe-production') await handleProduction(message,env);
        else throw new Error('unknown_queue');
      }catch(error){
        // A misconfigured nonProd opt-in must not even WRITE the failed job
        // to a production Supabase. Do not call patchJob before this guard.
        if(env.AUTO_UPDATE_DISPATCH_ENABLED==='true'||env.CANONICAL_UPDATE_ENABLED==='true'){
          try{enforceR36NonProd(env);}catch{message.retry();continue;}
        }
        const messageText=error instanceof Error?error.message:'unknown_error';
        if(messageText==='r36_job_identity_unconfirmed'){
          // Never mutate a job after its source/job ownership did not match.
          message.retry();
          continue;
        }
        if(message.body.kind==='ingest-fetch'){
          // A permanent preview format error should not burn repeated queue
          // retries once the failure record has been durably acknowledged.
          // If that DB update fails, retry rather than lose the diagnosis.
          const permanent = nonRetryablePreviewError(messageText);
          const recorded = await patchJob(env,message.body.jobId,{
            status:'failed',
            error_code:permanent?'NORMALIZATION_PREVIEW_REJECTED':'QUEUE_PROCESSING_FAILED',
            error_message:messageText,
            attempt_count:message.attempts
          }).then(()=>true,()=>false);
          if(permanent && recorded){
            if(env.AUTO_UPDATE_DISPATCH_ENABLED==='true'){
              try{
                enforceR36NonProd(env);
                const confirmed=await r36Rpc(env,'machiibe_nonprod_finish_dispatch_r36',{
                  p_job_id:message.body.jobId,p_success:false,p_error:'NORMALIZATION_PREVIEW_REJECTED'
                });
                if(confirmed!==true){message.retry();continue;}
              }catch{message.retry();continue;}
            }
            message.ack();
            continue;
          }
        }
        message.retry();
      }
    }
  }
};
