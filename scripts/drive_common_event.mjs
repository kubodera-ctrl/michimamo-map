'use strict';

const SOURCE_FAMILIES=new Set(['SPEED_GUIDELINE','PUBLIC_SCHEDULE','AREA_FOCUS']);

function text(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
function nullableText(value){const v=text(value);return v||null;}
function freezeArray(value){return Object.freeze(Array.isArray(value)?value.map(item=>Array.isArray(item)?Object.freeze([...item]):item):[]);}

export function toCommonDriveEvent(event,{sourceFamily}={}){
  const family=text(sourceFamily);
  if(!SOURCE_FAMILIES.has(family))throw new Error('invalid_source_family:'+family);
  if(!event?.eventKey||!event?.sourceKey||!event?.prefectureCode)throw new Error('common_event_identity_required');

  const hasSpeed=family==='SPEED_GUIDELINE';
  const endpoints=Array.isArray(event.routeEndpoints)?freezeArray(event.routeEndpoints):null;
  const geometryStatus=nullableText(event.geometryStatus)||(endpoints?'ENDPOINTS_CANDIDATE':'UNRESOLVED');

  return Object.freeze({
    schemaVersion:1,
    eventKey:event.eventKey,
    sourceKey:event.sourceKey,
    sourceFamily:family,
    sourceRecordKey:nullableText(event.sourceRecordKey),
    sourceSubrecordKey:nullableText(event.sourceSubrecordKey),
    sourceVersionDate:nullableText(event.sourceVersionDate),
    prefectureCode:text(event.prefectureCode),
    policeOrg:text(event.policeOrg),
    stationName:nullableText(event.stationName),
    infoType:text(event.infoType),
    enforcementType:text(event.enforcementType),
    displayMode:text(event.displayMode),
    freshnessStatus:text(event.freshnessStatus),
    sourceUrl:text(event.sourceUrl),
    sourceIndexUrl:nullableText(event.sourceIndexUrl),
    sourceVerifiedAt:nullableText(event.sourceVerifiedAt),
    route:Object.freeze({
      name:nullableText(event.routeName),
      scope:nullableText(event.roadScope)
    }),
    location:Object.freeze({
      precision:text(event.geoPrecision),
      segmentStartText:nullableText(event.segmentStartText),
      segmentEndText:nullableText(event.segmentEndText),
      areaText:nullableText(event.areaText),
      localityText:nullableText(event.localityText)
    }),
    time:Object.freeze({
      precision:text(event.timePrecision),
      startMinutes:Number.isInteger(event.timeStartMinutes)?event.timeStartMinutes:null,
      endMinutes:Number.isInteger(event.timeEndMinutes)?event.timeEndMinutes:null,
      text:nullableText(event.timeText),
      validDate:nullableText(event.validDate),
      validFrom:nullableText(event.validFrom),
      validTo:nullableText(event.validTo)
    }),
    speed:hasSpeed?Object.freeze({
      limitKmh:Number.isFinite(event.speedLimitKmh)?event.speedLimitKmh:null,
      text:nullableText(event.speedLimitText),
      kind:nullableText(event.speedLimitKind),
      valuesKmh:freezeArray(event.speedLimitValuesKmh),
      alternateKmh:freezeArray(event.alternateSpeedKmh)
    }):null,
    geometry:Object.freeze({
      status:geometryStatus,
      endpointVerified:event.endpointVerified===true,
      verified:event.geometryVerified===true,
      endpoints,
      routeMatchTokens:freezeArray(event.routeMatchTokens)
    }),
    scheduleChangeNote:nullableText(event.scheduleChangeNote)
  });
}

export function buildDriveStagingSnapshot(entries,{prefectureOrder=['13','12','14','11']}={}){
  if(!Array.isArray(entries)||!entries.length)throw new Error('staging_entries_required');
  const seenSources=new Set(),seenEvents=new Set(),sources=[],events=[];

  for(const entry of entries){
    const sourceFamily=text(entry?.sourceFamily);
    const sourceKey=text(entry?.sourceKey);
    if(!SOURCE_FAMILIES.has(sourceFamily)||!sourceKey||!Array.isArray(entry?.events))throw new Error('invalid_staging_entry');
    if(seenSources.has(sourceKey))throw new Error('duplicate_staging_source:'+sourceKey);
    seenSources.add(sourceKey);

    const normalized=entry.events.map(event=>toCommonDriveEvent(event,{sourceFamily}));
    for(const event of normalized){
      if(event.sourceKey!==sourceKey)throw new Error('source_key_mismatch:'+event.eventKey);
      if(seenEvents.has(event.eventKey))throw new Error('duplicate_staging_event:'+event.eventKey);
      seenEvents.add(event.eventKey);
      events.push(event);
    }
    sources.push(Object.freeze({
      sourceKey,
      sourceFamily,
      prefectureCode:normalized[0]?.prefectureCode||text(entry.prefectureCode),
      eventCount:normalized.length
    }));
  }

  const actualPrefectures=[...new Set(events.map(event=>event.prefectureCode))];
  const order=Object.freeze(prefectureOrder.filter(code=>actualPrefectures.includes(code)));
  const byPrefecture=Object.freeze(Object.fromEntries(order.map(code=>[
    code,events.filter(event=>event.prefectureCode===code).length
  ])));

  return Object.freeze({
    schemaVersion:1,
    schemaName:'drive_common_event_v1',
    stage:'PREVIEW_STAGING',
    prefectureOrder:order,
    sourceCount:sources.length,
    eventCount:events.length,
    byPrefecture,
    sources:Object.freeze(sources),
    events:Object.freeze(events)
  });
}
