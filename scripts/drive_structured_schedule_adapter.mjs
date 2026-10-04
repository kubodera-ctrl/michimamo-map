'use strict';

function text(value){return String(value??'').normalize('NFKC').replace(/\s+/g,' ').trim();}

export function parseCsv(textInput){
  const input=String(textInput??'').replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(ch==='"'){
      if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(ch===','&&!quoted){
      row.push(cell);cell='';
    }else if((ch==='\n'||ch==='\r')&&!quoted){
      if(ch==='\r'&&input[i+1]==='\n')i++;
      row.push(cell);cell='';
      if(row.some(value=>String(value).length>0))rows.push(row);
      row=[];
    }else cell+=ch;
  }
  if(cell.length||row.length){row.push(cell);if(row.some(value=>String(value).length>0))rows.push(row);}
  if(quoted)throw new Error('unterminated_csv_quote');
  if(rows.length<2)throw new Error('csv_data_rows_required');
  const headers=rows[0].map(text);
  if(headers.some(header=>!header))throw new Error('csv_header_required');
  const records=rows.slice(1).map((values,index)=>{
    const record={};
    headers.forEach((header,column)=>{record[header]=values[column]??'';});
    return Object.freeze({...record,__rowNumber:index+2});
  });
  return Object.freeze({headers:Object.freeze(headers),records:Object.freeze(records)});
}

function requiredColumn(mapping,key){
  const value=text(mapping?.[key]);
  if(!value)throw new Error('column_mapping_required:'+key);
  return value;
}

export function normalizeStructuredScheduleRows({source,records,columnMap,defaults={}}){
  if(!source?.sourceKey||source.sourceFamily!=='PUBLIC_SCHEDULE')throw new Error('public_schedule_source_required');
  if(!Array.isArray(records)||records.length===0)throw new Error('structured_records_required');
  const enforcementColumn=requiredColumn(columnMap,'enforcementType');
  const localityColumn=requiredColumn(columnMap,'localityText');
  const dateColumn=text(columnMap?.validDate);
  const timeColumn=text(columnMap?.timeText);
  const routeColumn=text(columnMap?.routeName);
  const idColumn=text(columnMap?.externalId);
  const sourceRecordColumn=text(columnMap?.sourceRecordKey);
  const geoPrecision=text(defaults.geoPrecision||'LOCALITY');
  const timePrecision=text(defaults.timePrecision||'DAYPART');
  const displayMode=text(defaults.displayMode||'LOCALITY_SCHEDULED');

  return Object.freeze(records.map((record,index)=>{
    const enforcementType=text(record[enforcementColumn]);
    const localityText=text(record[localityColumn]);
    if(!enforcementType||!localityText)throw new Error('structured_required_value_missing:row_'+(record.__rowNumber||index+2));
    const externalId=text(idColumn&&record[idColumn])||'row-'+String(record.__rowNumber||index+2);
    const sourceRecordKey=text(sourceRecordColumn&&record[sourceRecordColumn])||externalId;
    const validDate=text(dateColumn&&record[dateColumn])||null;
    if(validDate&&!/^\d{4}-\d{2}-\d{2}$/.test(validDate))throw new Error('invalid_structured_date:'+validDate);
    return Object.freeze({
      eventKey:source.sourceKey+':'+externalId,
      externalId,
      sourceKey:source.sourceKey,
      sourceRecordKey,
      sourceSubrecordKey:null,
      sourceVersionDate:source.sourceVersionDate??null,
      prefectureCode:text(source.prefectureCode),
      policeOrg:text(source.policeOrg),
      stationName:text(source.stationName)||null,
      infoType:'PUBLIC_SCHEDULE',
      enforcementType,
      routeName:text(routeColumn&&record[routeColumn])||null,
      roadScope:null,
      localityText,
      areaText:null,
      validDate,
      validFrom:validDate,
      validTo:validDate,
      timePrecision,
      timeText:text(timeColumn&&record[timeColumn])||null,
      timeStartMinutes:null,
      timeEndMinutes:null,
      geoPrecision,
      displayMode,
      sourceUrl:text(source.sourceUrl),
      sourceIndexUrl:text(source.sourceIndexUrl)||null,
      sourceVerifiedAt:text(source.verifiedAt)||null,
      freshnessStatus:text(source.freshnessStatus||'UNKNOWN'),
      scheduleChangeNote:'公開予定は変更される場合があり、現在の取締実施地点を示すものではありません。'
    });
  }));
}

export function structuredPublicationGate(source,{mode='preview'}={}){
  const reasons=[];
  if(source?.freshnessStatus!=='CURRENT')reasons.push('source_not_current');
  if(mode==='production'&&source?.termsStatus!=='ALLOWED')reasons.push('terms_not_allowed');
  if(source?.schemaBindingApproved!==true)reasons.push('source_schema_binding_unapproved');
  return Object.freeze({publishable:reasons.length===0,reasons:Object.freeze(reasons)});
}
