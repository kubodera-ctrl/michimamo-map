function clean(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
const EXPECTED_COLUMNS=Object.freeze(['routeName','segmentLabelStart','segmentLabelEnd','postedSpeedText']);

function parsePostedSpeed(value){
  const text=clean(value);
  const m=/(\d{2,3})\s*km\/h/i.exec(text);
  if(!m)throw new Error('aomori_invalid_posted_speed:'+text);
  const speed=Number(m[1]);
  if(speed<20||speed>130)throw new Error('aomori_speed_out_of_range:'+speed);
  return {speedLimitKmh:speed,speedLimitText:text};
}

export function aomoriPublicationGate(audit,{mode='preview'}={}){
  const reasons=[];
  const source=audit?.source||{};
  if(source.freshnessStatus!=='CURRENT')reasons.push('source_not_current');
  if(audit?.visualQa?.approved!==true)reasons.push('visual_qa_unapproved');
  if(!/^[a-f0-9]{64}$/i.test(String(audit?.sourceArtifactSha256||'')))reasons.push('source_artifact_hash_missing');
  if(!Array.isArray(audit?.rows)||audit.rows.length===0)reasons.push('no_rows');
  if(mode==='production'&&source.termsStatus!=='ALLOWED')reasons.push('terms_not_allowed');
  return Object.freeze({publishable:reasons.length===0,reasons:Object.freeze(reasons)});
}

export function parseAomoriSpeedGuidelineAudit(audit,{mode='preview'}={}){
  const source=audit?.source;
  if(!source?.sourceKey||source.sourceFamily!=='SPEED_GUIDELINE')throw new Error('aomori_speed_source_required');
  if(audit?.pageCount!==1)throw new Error('aomori_expected_single_page');
  const cols=audit?.visualQa?.columns||[];
  if(cols.length!==EXPECTED_COLUMNS.length||cols.some((c,i)=>c!==EXPECTED_COLUMNS[i]))throw new Error('aomori_visual_schema_mismatch');
  const gate=aomoriPublicationGate(audit,{mode});
  const events=gate.publishable?audit.rows.map((row,index)=>{
    const rowNumber=Number(row.rowNumber||index+1);
    const routeName=clean(row.routeName),start=clean(row.segmentLabelStart),end=clean(row.segmentLabelEnd);
    if(!routeName||!start||!end||start===end)throw new Error('aomori_row_identity_invalid:'+rowNumber);
    const speed=parsePostedSpeed(row.postedSpeedText);
    const sourceRecordKey=`${source.sourceKey}:${source.sourceVersionDate}:row-${rowNumber}`;
    return Object.freeze({
      eventKey:`${source.sourceKey}:${source.sourceVersionDate}:row-${rowNumber}`,
      externalId:`${source.sourceVersionDate}:row-${rowNumber}`,
      sourceKey:source.sourceKey,
      sourceRecordKey,
      sourceSubrecordKey:null,
      sourceVersionDate:source.sourceVersionDate,
      prefectureCode:source.prefectureCode,
      policeOrg:source.policeOrg,
      stationName:source.stationName||null,
      infoType:'SPEED_GUIDELINE',
      enforcementType:'速度',
      routeName,
      roadScope:'AREA',
      segmentStartText:start,
      segmentEndText:end,
      areaText:null,
      localityText:null,
      validDate:null,
      validFrom:null,
      validTo:null,
      timePrecision:'UNSPECIFIED',
      timeText:null,
      timeStartMinutes:null,
      timeEndMinutes:null,
      geoPrecision:'ROAD_AREA',
      displayMode:'ROAD_AREA_GUIDELINE',
      ...speed,
      speedLimitKind:'EXACT',
      speedLimitValuesKmh:Object.freeze([speed.speedLimitKmh]),
      alternateSpeedKmh:Object.freeze([]),
      sourceUrl:source.sourceUrl,
      sourceIndexUrl:source.sourceIndexUrl||null,
      sourceVerifiedAt:source.verifiedAt||null,
      freshnessStatus:source.freshnessStatus,
      routeEndpoints:null,
      endpointVerified:false,
      routeMatchTokens:Object.freeze([]),
      geometryStatus:'UNRESOLVED',
      geometryVerified:false,
      scheduleChangeNote:'速度取締り重点を示す資料で、実際の取締実施中や実施時刻を示すものではありません。'
    });
  }):[];
  return Object.freeze({schemaVersion:1,parserVersion:'aomori_speed_guideline_visual_v1',gate,events:Object.freeze(events)});
}

export {EXPECTED_COLUMNS as AOMORI_EXPECTED_COLUMNS};
