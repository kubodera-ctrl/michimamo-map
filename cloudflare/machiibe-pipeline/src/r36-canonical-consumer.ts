/** R36: isolated nonProd-only read/compare/RPC consumer.
 * Never inserts public.events or grants publication. All changes use the
 * security-invoker, optimistic-hash, source-policy-gated RPC. */
import {planCanonicalLifecycle,lifecycleMutationParameters,type ExistingCanonicalEvent} from './canonical-lifecycle';
import type {NormalizationPreviewRow} from './normalize-source-payload';
import type {SourcePolicySnapshot} from '../../../shared/machiibe-ingestion/contracts';
export type CanonicalStats={considered:number;held:number;unchanged:number;updated:number;newDrafts:number};
type Reader=(table:string,filter:string)=>Promise<unknown>;
type RpcRequest=(method:string,body:Record<string,unknown>)=>Promise<unknown>;
const SOURCE_ID=/^[A-Za-z0-9_-]{1,120}$/;
function safeDate(s:unknown):s is string{return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);}
export async function applyVerifiedNonProdCandidates(
 rows:NormalizationPreviewRow[],source:SourcePolicySnapshot,read:Reader,rpc:RpcRequest,nowMs=Date.now()
):Promise<CanonicalStats>{
 if(rows.length>200||!Number.isFinite(nowMs))throw Error('r36_canonical_batch_rejected');
 const stats:CanonicalStats={considered:0,held:0,unchanged:0,updated:0,newDrafts:0};
 for(const item of rows){
  stats.considered++;
  const c=item.candidate;
  if(item.status!=='ready_for_review'||!c.sourceEventId||!SOURCE_ID.test(c.sourceEventId)||c.sourceId!==source.sourceId
    ||!c.officialUrl?.startsWith('https://')||c.status==='cancelled'||c.status==='postponed'||c.status==='expired'){
    stats.held++;continue;
  }
  const records=await read('events',`source_id=eq.${c.sourceId}&source_event_key=eq.${encodeURIComponent(c.sourceEventId)}&select=id,source_id,source_event_key,official_url,title,start_date,end_date,venue_name,price_type,event_status,verification_status,publication_status,schedule_type&limit=2`);
  if(!Array.isArray(records)||records.length>1)throw Error('r36_canonical_lookup_invalid');
  if(records.length===0){stats.newDrafts++;continue;}
  const event=records[0] as Record<string,unknown>;
  if(!Number.isSafeInteger(event.id)||event.source_id!==c.sourceId||event.source_event_key!==c.sourceEventId
    ||event.official_url!==c.officialUrl||event.verification_status!=='verified'||event.publication_status!=='published'
    ||!safeDate(event.start_date)||!safeDate(event.end_date)){
    stats.held++;continue;
  }
  const provenance=await read('event_source_records',`source_id=eq.${c.sourceId}&source_event_key=eq.${encodeURIComponent(c.sourceEventId)}&select=id,event_id,source_url,content_hash&limit=2`);
  if(!Array.isArray(provenance)||provenance.length!==1){stats.held++;continue;}
  const rec=provenance[0] as Record<string,unknown>;
  if(rec.event_id!==event.id||rec.source_url!==event.official_url||typeof rec.content_hash!=='string'||!/^[a-f0-9]{64}$/.test(rec.content_hash)){
   stats.held++;continue;
  }
  const existing:ExistingCanonicalEvent={
   id:event.id as number,sourceId:c.sourceId,sourceEventId:c.sourceEventId,officialUrl:event.official_url as string,
   contentHash:rec.content_hash as string,title:String(event.title),startDate:event.start_date as string,endDate:event.end_date as string,
   venueName:typeof event.venue_name==='string'?event.venue_name:null,
   priceType:event.price_type as ExistingCanonicalEvent['priceType'],eventStatus:event.event_status as ExistingCanonicalEvent['eventStatus'],
   verificationStatus:'verified',publicationStatus:'published',scheduleType:event.schedule_type as ExistingCanonicalEvent['scheduleType']
  };
  const plan=planCanonicalLifecycle({source,candidate:c,existing,sourceReadinessVerified:true,
   eventUrlVerified:true,completeFeed:false,statusEvidence:null,asOfMs:nowMs});
  if(plan.action==='hold'){stats.held++;continue;}
  if(plan.action==='unchanged'){stats.unchanged++;continue;}
  if(plan.action!=='update_existing'){stats.held++;continue;}
  // Source status text alone cannot authorize cancellation, postponement or
  // restoration. Such changes are review-held until explicit official evidence.
  if(plan.patch?.event_status){stats.held++;continue;}
  const params=lifecycleMutationParameters(plan,existing,source);
  const result=await rpc('machiibe_nonprod_apply_existing_event_r36',{
    ...params,p_status_evidence_url:null,p_status_evidence_at:null
  });
  if(!Array.isArray(result)||result.length!==1||!result[0]||result[0].updated_event_id!==existing.id
   ||result[0].previous_hash!==plan.expectedContentHash||result[0].next_hash!==plan.newContentHash){
    throw Error('r36_canonical_update_unconfirmed');
  }
  stats.updated++;
 }
 return stats;
}
