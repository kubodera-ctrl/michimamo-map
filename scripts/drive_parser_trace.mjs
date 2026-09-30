import {toCommonDriveEvent} from './drive_common_event.mjs';

function text(value){return String(value??'').normalize('NFKC').trim();}
function nullable(value){const v=text(value);return v||null;}

export function buildParserTrace({source,sourceVersion,sourceRecord,event,sourceFamily,mode='preview'}){
  if(!source?.sourceKey||!sourceVersion?.contentHash||!sourceRecord?.sourceRecordKey)throw new Error('parser_trace_identity_required');
  if(event?.sourceKey!==source.sourceKey)throw new Error('event_source_mismatch');
  if(event?.sourceRecordKey!==sourceRecord.sourceRecordKey)throw new Error('source_record_lineage_mismatch');

  const commonEvent=toCommonDriveEvent(event,{sourceFamily});
  const eventReasons=[];
  if(source.active===false)eventReasons.push('source_inactive');
  if(commonEvent.freshnessStatus!=='CURRENT')eventReasons.push('source_not_current');
  if(mode==='production'&&source.termsStatus!=='ALLOWED')eventReasons.push('terms_not_allowed');
  if(sourceVersion.validationPassed!==true)eventReasons.push('source_version_not_validated');
  if(sourceRecord.validationPassed!==true)eventReasons.push('source_record_not_validated');

  const lineGeometryReasons=[];
  if(commonEvent.location.precision!=='EXACT_SEGMENT')lineGeometryReasons.push('not_exact_segment');
  else if(commonEvent.geometry.endpointVerified!==true)lineGeometryReasons.push('endpoint_not_verified');
  else if(commonEvent.geometry.verified!==true)lineGeometryReasons.push('geometry_not_verified');

  return Object.freeze({
    schemaVersion:1,
    source:Object.freeze({
      sourceKey:source.sourceKey,
      sourceFamily,
      termsStatus:text(source.termsStatus||'PENDING'),
      active:source.active!==false
    }),
    sourceVersion:Object.freeze({
      contentHash:text(sourceVersion.contentHash),
      versionDate:nullable(sourceVersion.versionDate),
      parserVersion:nullable(sourceVersion.parserVersion),
      fetchedAt:nullable(sourceVersion.fetchedAt),
      validationPassed:sourceVersion.validationPassed===true
    }),
    sourceRecord:Object.freeze({
      sourceRecordKey:sourceRecord.sourceRecordKey,
      rawLocator:nullable(sourceRecord.rawLocator),
      validationPassed:sourceRecord.validationPassed===true
    }),
    commonEvent,
    provenance:Object.freeze({
      sourceRecordKey:commonEvent.sourceRecordKey,
      sourceSubrecordKey:commonEvent.sourceSubrecordKey,
      sourceVersionDate:commonEvent.sourceVersionDate,
      sourceUrl:commonEvent.sourceUrl,
      sourceIndexUrl:commonEvent.sourceIndexUrl
    }),
    precision:Object.freeze({
      geometry:commonEvent.location.precision,
      time:commonEvent.time.precision
    }),
    freshness:commonEvent.freshnessStatus,
    publishGate:Object.freeze({
      eventFactsPublishable:eventReasons.length===0,
      eventReasons:Object.freeze(eventReasons),
      lineGeometryPublishable:lineGeometryReasons.length===0,
      lineGeometryReasons:Object.freeze(lineGeometryReasons)
    })
  });
}
