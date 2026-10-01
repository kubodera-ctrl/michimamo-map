'use strict';

const KNOWN_PROFILES=new Set([
  'DAILY_NEXTDAY','WEEKLY_FRIDAY','ROLLING_10DAY','HALF_MONTH',
  'OPEN_DATA_HALF_MONTH','MONTHLY_BOUNDARY','MONTHLY_ADVANCE','MONTHLY_SPOT',
  'HALF_YEAR','ANNUAL_CHANGE_DETECT','HTML_CHANGE_DETECT','HALF_MONTH_SPOT',
  'AD_HOC_SPOT','PREFECTURE_POLICY','SOURCE_STALE_AWARE'
]);

function text(value){return String(value??'').normalize('NFKC').trim();}

export function registryRowFromBundle(bundle,overrides={}){
  if(!bundle?.source)throw new Error('source_required');
  const s=bundle.source;
  const sourceKey=text(s.sourceKey);
  if(!sourceKey)throw new Error('source_key_required');
  const pollProfileId=text(overrides.pollProfileId||s.pollProfileId||s.cadenceType);
  if(!KNOWN_PROFILES.has(pollProfileId))throw new Error('unknown_poll_profile:'+pollProfileId);
  const termsStatus=text(overrides.termsStatus||s.termsStatus||'PENDING');
  if(!['PENDING','ALLOWED','RESTRICTED'].includes(termsStatus))throw new Error('invalid_terms_status');

  const requestedAuto=overrides.automatedFetchAllowed===true;
  const automatedFetchAllowed=requestedAuto&&termsStatus==='ALLOWED';

  return Object.freeze({
    sourceKey,
    prefectureCode:text(s.prefectureCode),
    policeOrg:text(s.policeOrg),
    stationName:text(s.stationName)||null,
    sourceFamily:text(s.sourceFamily),
    sourceUrl:text(s.sourceUrl),
    sourceIndexUrl:text(s.sourceIndexUrl)||null,
    contentFormat:text(overrides.contentFormat||s.contentFormat||'PDF_OR_HTML'),
    parserVersion:text(s.parserVersion)||null,
    sourceVersionDate:text(s.sourceVersionDate)||null,
    freshnessStatus:text(s.freshnessStatus||'UNKNOWN'),
    termsStatus,
    active:overrides.active!==false,
    automatedFetchAllowed,
    pollProfileId,
    nextCheckAt:overrides.nextCheckAt||null,
    publicationScope:text(overrides.publicationScope||'PREFECTURE_CENTRAL'),
    automationBlocker:automatedFetchAllowed?'NONE':(termsStatus==='ALLOWED'?'MANUAL_DISABLED':'TERMS_PENDING')
  });
}

export function buildPreviewRegistry(entries){
  if(!Array.isArray(entries)||!entries.length)throw new Error('entries_required');
  const rows=entries.map(entry=>registryRowFromBundle(entry.bundle,entry.overrides||{}));
  const seen=new Set();
  for(const row of rows){
    if(seen.has(row.sourceKey))throw new Error('duplicate_source_key:'+row.sourceKey);
    seen.add(row.sourceKey);
  }
  return Object.freeze(rows);
}

export function enableAutomatedFetch(row){
  if(!row||row.termsStatus!=='ALLOWED')throw new Error('terms_not_allowed');
  return Object.freeze({...row,automatedFetchAllowed:true,automationBlocker:'NONE'});
}
