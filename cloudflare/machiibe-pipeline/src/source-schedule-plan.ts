import {sourceAutomationBlockers} from './source-eligibility';
import {sourcePolicySnapshotFromRegionalRow,type RegionalSourcePolicyRow} from './source-policy-snapshot';

/** R36: bounded non-production schedule/monitor PREVIEW. No network, queue, DB,
 * publication or external notification side effects occur in this module. */
export type ScheduleSourceRow=RegionalSourcePolicyRow & {
  acquisition_mode: string | null;
};
export type ScheduleAlertCode =
  'SOURCE_POLICY_HOLD' | 'SOURCE_LAST_CHECK_INVALID' |
  'SOURCE_FAILURE_STREAK' | 'SOURCE_STALE' | 'SOURCE_NEVER_SUCCEEDED';
export type ScheduleAlert={sourceId:number;code:ScheduleAlertCode;severity:'info'|'warning';fingerprint:string};
export type DueSource={sourceId:number;idempotencyKey:string;dueAt:string;frequencyMinutes:number};
export type SchedulePreview={
  enabled:false;
  scanned:number;
  eligible:number;
  held:number;
  dueTotal:number;
  due:DueSource[];
  alerts:ScheduleAlert[];
  truncated:boolean;
  queueWrites:0;
  databaseWrites:0;
  notificationsSent:0;
};

const MINUTE=60_000;
const MAX_SCAN=100;
const MAX_DUE_PER_TICK=3;
const MAX_ALERTS=40;

function parsedTimestamp(value:string|null|undefined):number|null{
  if(!value)return null;
  const ms=Date.parse(value);
  return Number.isFinite(ms)?ms:NaN;
}
function isValidAsOf(asOfMs:number){return Number.isSafeInteger(asOfMs)&&asOfMs>=0;}
function comparePriority(a:unknown,b:unknown){
  const safe=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Partial<ScheduleSourceRow>:null;
  const ar=safe(a),br=safe(b);
  const ap=Number.isInteger(ar?.priority)?ar!.priority as number:100;
  const bp=Number.isInteger(br?.priority)?br!.priority as number:100;
  const ai=Number.isSafeInteger(ar?.id)?ar!.id as number:0;
  const bi=Number.isSafeInteger(br?.id)?br!.id as number:0;
  return ap-bp||ai-bi;
}
function alert(sourceId:number,code:ScheduleAlertCode,severity:'info'|'warning',asOfMs:number):ScheduleAlert{
  // Predictable dedupe key for later outbox/alert-store integration. R36 never
  // sends this alert nor claims suppression persists between invocations.
  return {sourceId,code,severity,fingerprint:`r36:${sourceId}:${code}:${Math.floor(asOfMs/(60*MINUTE))}`};
}

/** Only reviewed sources may enter due list. No guessed rights or feed expiry. */
export function previewSourceSchedule(rows:unknown,asOfMs:number,maxDue=MAX_DUE_PER_TICK):SchedulePreview{
  if(!Array.isArray(rows)||rows.length>MAX_SCAN||!isValidAsOf(asOfMs))throw new Error('r36_invalid_schedule_input');
  if(!Number.isInteger(maxDue)||maxDue<0||maxDue>MAX_DUE_PER_TICK)throw new Error('r36_budget_out_of_bounds');
  const candidates:DueSource[]=[];
  const alerts:ScheduleAlert[]=[];
  let eligible=0,held=0;
  const seenSourceIds=new Set<number>();
  // Source order is by approved priority then ID, not arbitrary API order.
  const sorted=[...rows].sort(comparePriority);
  for(const raw of sorted){
    if(raw===null||typeof raw!=='object'||Array.isArray(raw)){
      held++;
      continue;
    }
    const row=raw as ScheduleSourceRow;
    if(!Number.isSafeInteger(row.id)||row.id<=0||seenSourceIds.has(row.id)){
      held++;
      continue;
    }
    seenSourceIds.add(row.id);
    const mapped=sourcePolicySnapshotFromRegionalRow(row,asOfMs);
    const blockers=[...mapped.blockers,...sourceAutomationBlockers(row,asOfMs)];
    if(blockers.length){
      held++;
      alerts.push(alert(row.id,'SOURCE_POLICY_HOLD','info',asOfMs));
      continue;
    }
    eligible++;
    const frequency=row.update_frequency_minutes!;
    const lastChecked=parsedTimestamp(row.last_checked_at);
    const lastSuccess=parsedTimestamp(row.last_success_at);
    if(lastChecked!==null&&(!Number.isFinite(lastChecked)||lastChecked>asOfMs)){
      alerts.push(alert(row.id,'SOURCE_LAST_CHECK_INVALID','warning',asOfMs));
      continue;
    }
    if(lastSuccess!==null&&(!Number.isFinite(lastSuccess)||lastSuccess>asOfMs)){
      alerts.push(alert(row.id,'SOURCE_STALE','warning',asOfMs));
      continue;
    }
    const failures=Number.isSafeInteger(row.consecutive_failures)&&row.consecutive_failures!>0
      ?row.consecutive_failures!:0;
    if(failures>=3)alerts.push(alert(row.id,'SOURCE_FAILURE_STREAK','warning',asOfMs));
    if(lastSuccess===null)alerts.push(alert(row.id,'SOURCE_NEVER_SUCCEEDED','info',asOfMs));
    else if(asOfMs-lastSuccess>2*frequency*MINUTE)alerts.push(alert(row.id,'SOURCE_STALE','warning',asOfMs));
    // Backoff caps repeated failed fetches at 16x original source cadence.
    const backoffFactor=Math.min(16,2**Math.min(failures,4));
    const dueMs=lastChecked===null?0:lastChecked+frequency*MINUTE*backoffFactor;
    if(dueMs>asOfMs)continue;
    const slot=Math.floor(asOfMs/(frequency*MINUTE));
    candidates.push({sourceId:row.id,
      idempotencyKey:`r36:nonprod:${row.id}:${frequency}:${slot}`,
      dueAt:new Date(asOfMs).toISOString(),frequencyMinutes:frequency});
  }
  const due=candidates.slice(0,maxDue);
  return {enabled:false,scanned:rows.length,eligible,held,dueTotal:candidates.length,due,
    alerts:alerts.slice(0,MAX_ALERTS),truncated:candidates.length>maxDue||alerts.length>MAX_ALERTS,
    queueWrites:0,databaseWrites:0,notificationsSent:0};
}

export type JobMonitorRow={
  id:string;status:string;requested_at:string|null;started_at:string|null;
  updated_at:string|null;attempt_count:number|null;
};
export type JobMonitorPreview={scanned:number;stalled:number;failed:number;deadLetter:number;invalid:number;notificationsSent:0};
/** Read-only job health aggregation, no message body or secret ever emitted. */
export function previewJobHealth(rows:unknown,asOfMs:number):JobMonitorPreview{
  if(!Array.isArray(rows)||rows.length>MAX_SCAN||!isValidAsOf(asOfMs))throw new Error('r36_invalid_jobs_input');
  let stalled=0,failed=0,deadLetter=0,invalid=0;
  for(const raw of rows){
    if(raw===null||typeof raw!=='object'||Array.isArray(raw)){invalid++;continue;}
    const j=raw as JobMonitorRow;
    if(typeof j.id!=='string'||!j.id||typeof j.status!=='string'){invalid++;continue;}
    if(j.status==='failed'){failed++;continue;}
    if(j.status==='dead_letter'){deadLetter++;continue;}
    if(j.status==='completed')continue;
    if(!['queued','fetching','normalizing'].includes(j.status)){invalid++;continue;}
    const timestamp=parsedTimestamp(j.started_at||j.updated_at||j.requested_at);
    if(timestamp===null||!Number.isFinite(timestamp)||timestamp>asOfMs){invalid++;continue;}
    const maxWait=j.status==='queued'?30*MINUTE:15*MINUTE;
    if(asOfMs-timestamp>maxWait)stalled++;
  }
  return {scanned:rows.length,stalled,failed,deadLetter,invalid,notificationsSent:0};
}
