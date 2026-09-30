'use strict';

const FORMAT_TYPES=new Set(['PDF','HTML','CSV_STRUCTURED','WEBMAP']);
const PARSER_STATES=new Set([
  'COMMON_EVENT_PASS',
  'SOURCE_SCHEMA_AUDIT_PENDING',
  'SOURCE_SCHEMA_BINDING_PENDING',
  'DYNAMIC_PROVIDER_GATE'
]);

function text(value){return String(value??'').normalize('NFKC').trim();}

export function validateRepresentative(row){
  if(!row?.id||!row?.sourceKey||!row?.sourceFamily)throw new Error('representative_identity_required');
  if(!FORMAT_TYPES.has(row.contentFormat))throw new Error('unsupported_content_format:'+row.contentFormat);
  if(!PARSER_STATES.has(row.parserState))throw new Error('invalid_parser_state:'+row.parserState);
  if(!Array.isArray(row.geoModes)||row.geoModes.length===0)throw new Error('geo_modes_required:'+row.id);
  if(!Array.isArray(row.timeModes)||row.timeModes.length===0)throw new Error('time_modes_required:'+row.id);
  if(row.commonEventPass===true&&row.provenancePass!==true)throw new Error('common_event_requires_provenance:'+row.id);
  if(row.structuredFetchAllowed===true&&row.termsStatus!=='ALLOWED')throw new Error('terms_gate_violation:'+row.id);
  if(row.contentFormat==='WEBMAP'&&row.parserState!=='DYNAMIC_PROVIDER_GATE')throw new Error('webmap_must_be_provider_gated:'+row.id);
  return Object.freeze({...row});
}

export function summarizeParserMatrix(matrix){
  if(!Array.isArray(matrix?.representatives)||matrix.representatives.length===0)throw new Error('representatives_required');
  const rows=matrix.representatives.map(validateRepresentative);
  const ids=new Set();
  for(const row of rows){
    if(ids.has(row.id))throw new Error('duplicate_representative:'+row.id);
    ids.add(row.id);
  }
  const formats=Object.freeze([...new Set(rows.map(row=>row.contentFormat))].sort());
  const parserStates=Object.freeze([...new Set(rows.map(row=>row.parserState))].sort());
  const geoModes=Object.freeze([...new Set(rows.flatMap(row=>row.geoModes))].sort());
  const timeModes=Object.freeze([...new Set(rows.flatMap(row=>row.timeModes))].sort());
  const cadences=Object.freeze([...new Set(rows.map(row=>row.cadence))].sort());
  return Object.freeze({
    representativeCount:rows.length,
    commonEventPassCount:rows.filter(row=>row.commonEventPass).length,
    provenancePassCount:rows.filter(row=>row.provenancePass).length,
    pendingCount:rows.filter(row=>!row.commonEventPass).length,
    formats,parserStates,geoModes,timeModes,cadences,
    prefectureCodes:Object.freeze([...new Set(rows.map(row=>text(row.prefectureCode)))].sort())
  });
}

export function dynamicProviderGate(row,{apiSchemaApproved=false,termsAllowed=false,providerUseApproved=false}={}){
  const representative=validateRepresentative(row);
  if(representative.contentFormat!=='WEBMAP')throw new Error('dynamic_provider_required');
  const reasons=[];
  if(!apiSchemaApproved)reasons.push('provider_api_schema_unapproved');
  if(!termsAllowed)reasons.push('provider_terms_unapproved');
  if(!providerUseApproved)reasons.push('provider_use_unapproved');
  return Object.freeze({
    parseAllowed:reasons.length===0,
    automatedFetchAllowed:reasons.length===0&&representative.structuredFetchAllowed===true,
    reasons:Object.freeze(reasons)
  });
}
