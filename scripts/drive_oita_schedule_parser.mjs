import {parseCsv,normalizeStructuredScheduleRows,structuredPublicationGate} from './drive_structured_schedule_adapter.mjs';

const EXPECTED_HEADERS=Object.freeze(['日','曜日','時間帯','場所','取締種別']);
const WEEKDAYS=Object.freeze(['日','月','火','水','木','金','土']);
const DAYPARTS=new Set(['午前','午後']);

function clean(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}
function inRange(date,start,end){return (!start||date>=start)&&(!end||date<=end);}

export function decodeCp932Csv(bytes){
  if(!(bytes instanceof Uint8Array))throw new Error('cp932_bytes_required');
  try{return new TextDecoder('shift_jis',{fatal:true}).decode(bytes);}catch{throw new Error('cp932_decode_failed');}
}

export function normalizeOitaDate(value){
  const v=clean(value),m=/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(v);
  if(!m)throw new Error('invalid_oita_date:'+v);
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
  const dt=new Date(Date.UTC(y,mo-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)throw new Error('invalid_oita_date:'+v);
  return `${String(y).padStart(4,'0')}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

export function parseOitaPublicEnforcementCsv({source,bytes,mode='preview'}){
  if(!source?.sourceKey||source.sourceFamily!=='PUBLIC_SCHEDULE')throw new Error('oita_public_schedule_source_required');
  if(!source.sourceVersionKey)throw new Error('oita_source_version_key_required');
  const decoded=decodeCp932Csv(bytes);
  const parsed=parseCsv(decoded);
  if(parsed.headers.length!==EXPECTED_HEADERS.length||parsed.headers.some((h,i)=>h!==EXPECTED_HEADERS[i])){
    throw new Error('oita_header_mismatch:'+parsed.headers.join('|'));
  }
  const records=parsed.records.map((raw,index)=>{
    const rowNumber=raw.__rowNumber||index+2;
    const validDate=normalizeOitaDate(raw['日']);
    const weekday=clean(raw['曜日']);
    const expectedWeekday=WEEKDAYS[new Date(validDate+'T00:00:00Z').getUTCDay()];
    if(weekday!==expectedWeekday)throw new Error(`oita_weekday_mismatch:row_${rowNumber}:${weekday}:${expectedWeekday}`);
    const daypart=clean(raw['時間帯']);
    if(!DAYPARTS.has(daypart))throw new Error(`oita_invalid_daypart:row_${rowNumber}:${daypart}`);
    if(!inRange(validDate,source.periodStart,source.periodEnd))throw new Error(`oita_date_outside_source_period:row_${rowNumber}:${validDate}`);
    const locator=`${source.sourceKey}:${source.sourceVersionKey}:row-${rowNumber}`;
    return Object.freeze({...raw,'日':validDate,'時間帯':daypart,'__externalId':`${source.sourceVersionKey}:row-${rowNumber}`,'__sourceRecordKey':locator});
  });
  const events=normalizeStructuredScheduleRows({
    source,
    records,
    columnMap:{externalId:'__externalId',sourceRecordKey:'__sourceRecordKey',validDate:'日',timeText:'時間帯',localityText:'場所',enforcementType:'取締種別'},
    defaults:{geoPrecision:'LOCALITY',timePrecision:'DAYPART',displayMode:'LOCALITY_SCHEDULED'}
  });
  return Object.freeze({
    schemaVersion:1,
    parserVersion:'oita_public_schedule_csv_v1',
    headers:parsed.headers,
    sourceRecordCount:records.length,
    gate:structuredPublicationGate(source,{mode}),
    events
  });
}

export {EXPECTED_HEADERS as OITA_EXPECTED_HEADERS};
