/** R36: non-production only adapter for the audited durable schedule/outbox RPCs.
 * No flags or secrets are created by this module. Side effects require the
 * caller's explicit nonProd gates and service-only PostgREST transport. */
import type {DueSource,ScheduleAlert} from './source-schedule-plan';

type RpcRequest=(name:string,body:Record<string,unknown>)=>Promise<unknown>;
export type DispatchClaim={outbox_id:string;job_id:string;source_id:number;claim_token:string};
export type DispatchBudget={registered:number;dispatched:number;claimed:number;failedDispatches:number};
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function isRecord(x:unknown):x is Record<string,unknown>{return !!x&&typeof x==='object'&&!Array.isArray(x);}
export function safeClaim(x:unknown):DispatchClaim{
  if(!isRecord(x)||typeof x.outbox_id!=='string'||!UUID.test(x.outbox_id)
    ||typeof x.job_id!=='string'||!UUID.test(x.job_id)
    ||typeof x.claim_token!=='string'||!UUID.test(x.claim_token)
    ||!Number.isSafeInteger(x.source_id)||Number(x.source_id)<=0){
      throw new Error('r36_invalid_claim_envelope');
    }
  return {outbox_id:x.outbox_id,job_id:x.job_id,claim_token:x.claim_token,source_id:Number(x.source_id)};
}
function validDue(d:DueSource){
 return Number.isSafeInteger(d.sourceId)&&d.sourceId>0
  &&/^r36:nonprod:\d+:\d+:\d+$/.test(d.idempotencyKey)
  &&Number.isFinite(Date.parse(d.dueAt));
}
export async function registerAndDispatch(
  due:DueSource[],rpc:RpcRequest,send:(message:{kind:'ingest-fetch';jobId:string;sourceId:number;requestedAt:string})=>Promise<unknown>,
  nowIso:string
):Promise<DispatchBudget>{
  if(due.length>3||!Number.isFinite(Date.parse(nowIso))||due.some(x=>!validDue(x)))throw Error('r36_dispatch_budget_rejected');
  let registered=0,dispatched=0,failedDispatches=0;
  for(const item of due){
    const result=await rpc('machiibe_nonprod_register_due_r36',{
      p_source_id:item.sourceId,p_idempotency_key:item.idempotencyKey,p_scheduled_at:item.dueAt
    });
    if(!Array.isArray(result)||result.length>1)throw new Error('r36_register_response_invalid');
    if(result.length===1){
      const row=result[0];
      if(!isRecord(row)||row.created!==true||typeof row.job_id!=='string'||!UUID.test(row.job_id))throw Error('r36_register_response_invalid');
      registered++;
    }
  }
  // Claim abandoned pending/sent messages too, even when no Source is due.
  const raw=await rpc('machiibe_nonprod_claim_dispatch_r36',{p_limit:3});
  if(!Array.isArray(raw)||raw.length>3)throw new Error('r36_claim_response_invalid');
  const claims=raw.map(safeClaim);
  const unique=new Set(claims.map(c=>c.outbox_id));
  if(unique.size!==claims.length)throw Error('r36_duplicate_claim');
  for(const claim of claims){
    let sent=false;
    try{
      await send({kind:'ingest-fetch',jobId:claim.job_id,sourceId:claim.source_id,requestedAt:nowIso});
      sent=true;
      const confirmed=await rpc('machiibe_nonprod_mark_dispatched_r36',{
        p_outbox_id:claim.outbox_id,p_token:claim.claim_token
      });
      if(confirmed!==true)throw Error('r36_dispatch_not_persisted');
      dispatched++;
    }catch(e){
      failedDispatches++;
      if(!sent){
        // If Queue.send failed, release our lease for next tick. If it was
        // accepted but the DB ACK failed, leave lease in place to expire and
        // retry with the same job id (at-least-once delivery, never guess).
        try{await rpc('machiibe_nonprod_release_claim_r36',{
          p_outbox_id:claim.outbox_id,p_token:claim.claim_token,p_error:'queue_send_failed'
        });}catch{/* original transport failure is retained */}
      }
      throw e;
    }
  }
  return {registered,dispatched,claimed:claims.length,failedDispatches};
}

export type MonitorSummary={scanned:number;eligible:number;due:number;registered:number;dispatched:number;stalled:number;failed:number;dead_letter:number};
export async function persistMonitorTick(rpc:RpcRequest,asOfMs:number,metrics:MonitorSummary,alerts:ScheduleAlert[]) {
 if(!Number.isSafeInteger(asOfMs)||asOfMs<0||alerts.length>40)throw Error('r36_monitor_invalid');
 const required=Object.values(metrics);
 if(required.length!==8||required.some(x=>!Number.isInteger(x)||x<0||x>100))throw Error('r36_monitor_budget_invalid');
 const alertRows=alerts.map(a=>({
   code:a.code,sourceId:a.sourceId,severity:a.severity,
   // Daily suppression, not per-hour log spam. The record is durable, but
   // sending a notification remains explicitly disabled.
   fingerprint:`r36:${a.sourceId}:${a.code}:${Math.floor(asOfMs/86400000)}`
 }));
 const result=await rpc('machiibe_nonprod_record_tick_r36',{
   p_slot:Math.floor(asOfMs/3600000),p_scheduled_at:new Date(asOfMs).toISOString(),p_stats:metrics,p_alerts:alertRows
 });
 if(result!==true)throw Error('r36_monitor_not_persisted');
 return {persisted:true,alertRows:alertRows.length,notificationsSent:0 as const};
}
