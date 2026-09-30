import {
  conditionalHeaders,sourceAutomationAllowed,type FetchPlan,type NormalizedEventCandidate,
  type RawSourceItem,type SourceFetchMethod,type SourcePolicySnapshot
} from './contracts';

type UnknownRecord=Record<string,unknown>;

function record(value:unknown):UnknownRecord|null{
  return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as UnknownRecord:null;
}
function text(value:unknown){
  return typeof value==='string'&&value.trim()?value.trim():null;
}
function webUrl(value:unknown){
  const candidate=text(value);
  return candidate&&/^https?:\/\//i.test(candidate)?candidate:null;
}
function httpsUrl(value:unknown){
  const candidate=text(value);
  return candidate&&/^https:\/\//i.test(candidate)?candidate:null;
}
function stringArray(value:unknown){
  if(Array.isArray(value))return value.map(text).filter((v):v is string=>Boolean(v));
  const one=text(value);return one?[one]:[];
}
function sourceHashPlaceholder(sourceId:number,index:number,payload:unknown){
  // Deterministic dry-run identity only. Runtime ingestion replaces this with SHA-256 of fetched bytes/item.
  const json=JSON.stringify(payload);
  let h=2166136261;
  for(let i=0;i<json.length;i++){h^=json.charCodeAt(i);h=Math.imul(h,16777619);}
  return 'dryrun-'+sourceId+'-'+index+'-'+(h>>>0).toString(16).padStart(8,'0');
}
function raw(source:SourcePolicySnapshot,payload:unknown,index:number,sourceEventId:string|null=null,sourceUrl:string|null=null,sourceUpdatedAt:string|null=null):RawSourceItem{
  return {
    sourceId:source.sourceId,
    sourceEventId,
    sourceUrl:sourceUrl||source.feedUrl||source.baseUrl,
    sourceUpdatedAt,
    sourceHash:sourceHashPlaceholder(source.sourceId,index,payload),
    payload
  };
}

export type AdapterParseResult={
  method:SourceFetchMethod;
  items:RawSourceItem[];
  warnings:string[];
};

export function buildDryRunFetchPlan(source:SourcePolicySnapshot):FetchPlan|null{
  if(!source.active||!source.feedUrl&& !source.baseUrl)return null;
  return {
    sourceId:source.sourceId,
    url:source.feedUrl||source.baseUrl,
    method:'GET',
    headers:conditionalHeaders({etag:source.etag,lastModified:source.lastModified}),
    dryRun:true
  };
}

export function buildApprovedFetchPlan(source:SourcePolicySnapshot):FetchPlan|null{
  if(!sourceAutomationAllowed(source))return null;
  return {...buildDryRunFetchPlan(source)!,dryRun:false};
}

function decodeXml(value:string){
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}
function xmlTag(block:string,name:string){
  const match=block.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'));
  return match?decodeXml(match[1].trim()):null;
}
function xmlAttr(block:string,tag:string,attr:string){
  const pattern="<"+tag+"\\b[^>]*\\b"+attr+"=[\"']([^\"']+)[\"'][^>]*>";
  const match=block.match(new RegExp(pattern,'i'));
  return match?decodeXml(match[1]):null;
}

export function parseRssAtom(body:string,source:SourcePolicySnapshot):AdapterParseResult{
  const blocks=[...body.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m)=>m[2]);
  const items=blocks.map((block,index)=>{
    const link=xmlTag(block,'link')||xmlAttr(block,'link','href')||source.feedUrl||source.baseUrl;
    return raw(
      source,
      {
        title:xmlTag(block,'title'),
        description:xmlTag(block,'description')||xmlTag(block,'summary')||xmlTag(block,'content'),
        start:xmlTag(block,'start')||xmlTag(block,'startDate'),
        end:xmlTag(block,'end')||xmlTag(block,'endDate'),
        link,
        guid:xmlTag(block,'guid')||xmlTag(block,'id'),
        updated:xmlTag(block,'updated')||xmlTag(block,'pubDate')
      },
      index,
      xmlTag(block,'guid')||xmlTag(block,'id'),
      link,
      xmlTag(block,'updated')||xmlTag(block,'pubDate')
    );
  });
  return {method:'RSS',items,warnings:items.length?[]:['no_rss_items']};
}

function unfoldIcs(body:string){
  return body.replace(/\r?\n[ \t]/g,'').split(/\r?\n/);
}
function icsValue(lines:string[],key:string){
  const line=lines.find((row)=>row.toUpperCase().startsWith(key.toUpperCase()+':')||row.toUpperCase().startsWith(key.toUpperCase()+';'));
  if(!line)return null;
  const pos=line.indexOf(':');
  return pos>=0?line.slice(pos+1).replace(/\\n/gi,'\n').replace(/\\,/g,',').trim():null;
}
export function parseIcs(body:string,source:SourcePolicySnapshot):AdapterParseResult{
  const blocks:string[][]=[];let current:string[]|null=null;
  for(const line of unfoldIcs(body)){
    if(line.toUpperCase()==='BEGIN:VEVENT')current=[];
    else if(line.toUpperCase()==='END:VEVENT'&&current){blocks.push(current);current=null;}
    else if(current)current.push(line);
  }
  const items=blocks.map((lines,index)=>{
    const uid=icsValue(lines,'UID'),url=icsValue(lines,'URL')||source.feedUrl||source.baseUrl;
    return raw(source,{
      uid,title:icsValue(lines,'SUMMARY'),description:icsValue(lines,'DESCRIPTION'),
      start:icsValue(lines,'DTSTART'),end:icsValue(lines,'DTEND'),location:icsValue(lines,'LOCATION'),
      url,lastModified:icsValue(lines,'LAST-MODIFIED')
    },index,uid,url,icsValue(lines,'LAST-MODIFIED'));
  });
  return {method:'ICS',items,warnings:items.length?[]:['no_vevent_items']};
}

function jsonItems(value:unknown):unknown[]{
  if(Array.isArray(value))return value;
  const obj=record(value);
  if(!obj)return [];
  for(const key of ['events','event_data','items','results','data']){
    const candidate=obj[key];
    if(Array.isArray(candidate))return candidate;
  }
  return [];
}
export function parseJsonApi(body:unknown,source:SourcePolicySnapshot):AdapterParseResult{
  const rows=jsonItems(body);
  const items=rows.map((payload,index)=>{
    const obj=record(payload);
    const id=obj?text(obj.id)||text(obj.uid)||text(obj.event_id):null;
    const url=obj?text(obj.url)||text(obj.official_url)||text(obj.open_url)||text(obj.source_url):null;
    const updated=obj?text(obj.updated_at)||text(obj.updated)||text(obj.modified)||text(obj.upd_date)||text(obj.created_date):null;
    return raw(source,payload,index,id,url,updated);
  });
  return {method:source.fetchMethod==='OPEN_DATA'?'OPEN_DATA':'JSON_API',items,warnings:items.length?[]:['no_json_items']};
}


function splitCommaFacts(value:unknown){
  const one=text(value);
  if(!one)return [] as string[];
  return one.split(/[、,，]/).map((part)=>part.trim()).filter(Boolean);
}
function stableTextHash(value:string){
  let h=2166136261;
  for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,'0');
}
export function parseKawasakiEventApi(body:unknown,source:SourcePolicySnapshot):AdapterParseResult{
  const root=record(body);
  const events=root&&Array.isArray(root.event_data)?root.event_data:[];
  const items:RawSourceItem[]=[];
  const warnings:string[]=[];
  for(const [eventIndex,payload] of events.entries()){
    const obj=record(payload);
    if(!obj){warnings.push('kawasaki_invalid_event:'+eventIndex);continue;}
    const dates=Array.isArray(obj.date_list)?obj.date_list.map(record).filter((v):v is UnknownRecord=>Boolean(v)):[];
    const officialUrl=webUrl(obj.open_url);
    const updated=text(obj.upd_date)||text(obj.created_date);
    const title=text(obj.title)||'';
    const occurrences=dates.length?dates:[null];
    for(const [occurrenceIndex,date] of occurrences.entries()){
      const dateValue=date?text(date.date):null;
      const timeFrom=date?text(date.time_from):null;
      const timeTo=date?text(date.time_to):null;
      const signature=[officialUrl||'',title,updated||'',dateValue||'',timeFrom||'',String(occurrenceIndex)].join('|');
      const sourceEventId='kawasaki-'+stableTextHash(signature);
      const normalizedPayload={
        ...obj,
        description:text(obj.content),
        startDate:dateValue,
        endDate:dateValue,
        start_time:timeFrom,
        end_time:timeTo,
        url:officialUrl,
        address:text(obj.place_adr),
        latitude:obj.place_lat??null,
        longitude:obj.place_lon??null,
        category:text(obj.type1),
        accessibility:splitCommaFacts(obj.barrier_free)
      };
      items.push(raw(source,normalizedPayload,items.length,sourceEventId,officialUrl||source.feedUrl||source.baseUrl,updated));
    }
  }
  if(!items.length)warnings.push('no_kawasaki_event_items');
  return {method:'JSON_API',items,warnings};
}

function parseCsvTable(body:string){
  const rows:string[][]=[];let row:string[]=[],value='',quoted=false,unclosedQuote=false;
  const input=body.replace(/^\uFEFF/,'');
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(ch==='"'){
      if(quoted&&input[i+1]==='"'){value+='"';i++;}
      else quoted=!quoted;
      continue;
    }
    if(ch===','&&!quoted){row.push(value);value='';continue;}
    if((ch==='\n'||ch==='\r')&&!quoted){
      if(ch==='\r'&&input[i+1]==='\n')i++;
      row.push(value);value='';
      if(row.some((cell)=>cell.trim()))rows.push(row);
      row=[];
      continue;
    }
    if(ch==='\r'&&quoted){
      if(input[i+1]==='\n')i++;
      value+='\n';
      continue;
    }
    value+=ch;
  }
  if(quoted)unclosedQuote=true;
  if(value.length||row.length){row.push(value);if(row.some((cell)=>cell.trim()))rows.push(row);}
  return {rows,unclosedQuote};
}
export function parseCsv(body:string,source:SourcePolicySnapshot):AdapterParseResult{
  const table=parseCsvTable(body);
  if(table.rows.length<2){
    return {method:'OPEN_DATA',items:[],warnings:[...(table.unclosedQuote?['csv_unclosed_quote']:[]),'no_csv_rows']};
  }
  const headers=table.rows[0].map((h)=>h.trim());
  let mismatchedRows=0;
  const items=table.rows.slice(1).map((values,index)=>{
    if(values.length!==headers.length)mismatchedRows++;
    const payload=Object.fromEntries(headers.map((h,i)=>[h,values[i]??'']));
    const id=text(payload['event_id'])||text(payload['イベントID'])||text(payload['ID'])||text(payload['NO']);
    const url=httpsUrl(payload['official_url'])||httpsUrl(payload['URL'])||httpsUrl(payload['コンテンツURL'])||httpsUrl(payload['url'])||source.feedUrl||source.baseUrl;
    const updated=text(payload['source_updated_at'])||text(payload['更新日']);
    return raw(source,payload,index,id,url,updated);
  });
  const warnings:string[]=[];
  if(table.unclosedQuote)warnings.push('csv_unclosed_quote');
  if(mismatchedRows)warnings.push('csv_column_mismatch:'+mismatchedRows);
  return {method:'OPEN_DATA',items,warnings};
}

function jsonLdNodes(value:unknown):UnknownRecord[]{
  if(Array.isArray(value))return value.flatMap(jsonLdNodes);
  const obj=record(value);
  if(!obj)return [];
  const graph=Array.isArray(obj['@graph'])?obj['@graph'].flatMap(jsonLdNodes):[];
  const types=stringArray(obj['@type']).map((v)=>v.toLowerCase());
  return [...(types.includes('event')?[obj]:[]),...graph];
}
export function parseJsonLd(value:unknown,source:SourcePolicySnapshot):AdapterParseResult{
  const nodes=jsonLdNodes(value);
  const items=nodes.map((node,index)=>{
    const id=text(node['@id'])||text(node.identifier);
    const url=text(node.url)||text(node['@id'])||source.feedUrl||source.baseUrl;
    const updated=text(node.dateModified);
    return raw(source,node,index,id,url,updated);
  });
  return {method:'JSON_LD',items,warnings:items.length?[]:['no_schema_event']};
}
export function parseHtmlStructured(html:string,source:SourcePolicySnapshot):AdapterParseResult{
  const items:RawSourceItem[]=[];const warnings:string[]=[];
  const scripts=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for(const script of scripts){
    try{
      const parsed=JSON.parse(script[1].trim());
      items.push(...parseJsonLd(parsed,source).items);
    }catch{warnings.push('invalid_jsonld_block');}
  }
  if(!items.length)warnings.push('no_schema_event');
  return {method:'HTML_STRUCTURED',items,warnings};
}

export function parseManualRows(rows:unknown[],source:SourcePolicySnapshot):AdapterParseResult{
  return {method:'MANUAL',items:rows.map((row,index)=>raw(source,row,index)),warnings:[]};
}

function pick(obj:UnknownRecord,keys:string[]){
  for(const key of keys){const v=text(obj[key]);if(v)return v;}
  return null;
}
function schemaPlace(obj:UnknownRecord){
  const place=record(obj.location),address=place?record(place.address):null;
  return {
    venueName:place?text(place.name):null,
    address:address?pick(address,['streetAddress']):null,
    municipality:address?pick(address,['addressLocality']):null,
    prefecture:address?pick(address,['addressRegion']):null
  };
}
function canonicalDateOnly(value:string|null){
  if(!value)return null;
  const match=value.trim().match(/^(\d{4})[-\/.年](\d{1,2})[-\/.月](\d{1,2})(?:日)?$/);
  if(!match)return value;
  const month=String(Number(match[2])).padStart(2,'0');
  const day=String(Number(match[3])).padStart(2,'0');
  return match[1]+'-'+month+'-'+day;
}

export function normalizeCommonItem(item:RawSourceItem,source:SourcePolicySnapshot):NormalizedEventCandidate{
  const obj=record(item.payload)||{};
  const place=schemaPlace(obj);
  const title=pick(obj,['name','title','イベント名','名称','記事タイトル']);
  const description=pick(obj,['description','content','summary','概要','内容','説明']);
  const startAt=canonicalDateOnly(pick(obj,['startDate','start_at','start','開始日時','開始日','イベント開始日']));
  const endAt=canonicalDateOnly(pick(obj,['endDate','end_at','end','終了日時','終了日','イベント終了日']));
  const explicitOfficialUrl=
    webUrl(obj.url)||webUrl(obj.official_url)||webUrl(obj.open_url)||webUrl(obj['公式URL'])||webUrl(obj['URL'])||
    webUrl(obj['コンテンツURL'])||webUrl(obj.link);
  const itemUrlIsFeed=item.sourceUrl===source.feedUrl||item.sourceUrl===source.baseUrl;
  const officialUrl=explicitOfficialUrl||(!itemUrlIsFeed?webUrl(item.sourceUrl):null);
  const priceRaw=pick(obj,['price_type','料金区分','料金種別','料金(基本)','料金(詳細)']);
  const normalizedPrice=(priceRaw||'').normalize('NFKC').toLowerCase();
  const priceType=priceRaw==='free'||priceRaw==='partly_free'||priceRaw==='paid'
    ?priceRaw
    :/一部.*有料|一部.*無料/.test(normalizedPrice)?'partly_free'
    :/無料|なし|free/.test(normalizedPrice)?'free'
    :/有料|paid/.test(normalizedPrice)?'paid'
    :'unknown';
  const latRaw=obj.latitude??obj.place_lat??obj['緯度']??record(obj.geo)?.latitude;
  const lngRaw=obj.longitude??obj.place_lon??obj['経度']??record(obj.geo)?.longitude;
  const numeric=(value:unknown)=>{
    if(typeof value==='number'&&Number.isFinite(value))return value;
    if(typeof value==='string'&&value.trim()&&Number.isFinite(Number(value.trim())))return Number(value.trim());
    return null;
  };
  const lat=numeric(latRaw),lng=numeric(lngRaw);
  return {
    sourceId:item.sourceId,sourceEventId:item.sourceEventId,sourceUrl:item.sourceUrl,
    sourceUpdatedAt:item.sourceUpdatedAt,sourceHash:item.sourceHash,
    title,description,startAt,endAt,timezone:'Asia/Tokyo',
    prefecture:place.prefecture||pick(obj,['prefecture','都道府県','都道府県名','所在地_都道府県'])||source.prefecture,
    municipality:place.municipality||pick(obj,['municipality','市区町村','市区町村名','市区郡','市町','所在地_市区町村'])||source.municipality,
    address:place.address||pick(obj,['address','place_adr','住所','所在地_連結表記']),lat,lng,
    venueName:place.venueName||pick(obj,['venue_name','会場','場所','場所名称']),
    venueType:pick(obj,['venue_type']),category:pick(obj,['category','type1','カテゴリ','カテゴリー','イベント種類']),
    tags:stringArray(obj.tags),ageMin:typeof obj.age_min==='number'?obj.age_min:null,
    ageMax:typeof obj.age_max==='number'?obj.age_max:null,
    family:typeof obj.family==='boolean'?obj.family:null,
    childFocused:typeof obj.child_focused==='boolean'?obj.child_focused:null,
    indoor:typeof obj.indoor==='boolean'?obj.indoor:null,
    rainOk:typeof obj.rain_ok==='boolean'?obj.rain_ok:null,
    accessibility:Array.isArray(obj.accessibility)?stringArray(obj.accessibility):splitCommaFacts(obj.accessibility??obj.barrier_free),
    priceType,priceMin:typeof obj.price_min==='number'?obj.price_min:null,
    priceMax:typeof obj.price_max==='number'?obj.price_max:null,
    imageUrl:null,imageRightsStatus:'unknown',officialUrl,
    verifiedAt:null,expiresAt:null,status:'candidate'
  };
}

export function parseSourcePayload(payload:unknown,source:SourcePolicySnapshot):AdapterParseResult{
  if(source.fetchMethod==='RSS')return parseRssAtom(String(payload??''),source);
  if(source.fetchMethod==='ICS')return parseIcs(String(payload??''),source);
  if(source.fetchMethod==='JSON_API'){
    const kawasaki=[source.baseUrl,source.feedUrl].some((url)=>url?.includes('eventapp.city.kawasaki.jp/data/api/v1'));
    return kawasaki?parseKawasakiEventApi(payload,source):parseJsonApi(payload,source);
  }
  if(source.fetchMethod==='JSON_LD')return parseJsonLd(payload,source);
  if(source.fetchMethod==='HTML_STRUCTURED')return parseHtmlStructured(String(payload??''),source);
  if(source.fetchMethod==='OPEN_DATA'){
    if(typeof payload==='string')return parseCsv(payload,source);
    return parseJsonApi(payload,source);
  }
  if(source.fetchMethod==='PARTNER')return {method:'PARTNER',items:(Array.isArray(payload)?payload:[payload]).map((row,index)=>raw(source,row,index)),warnings:[]};
  return parseManualRows(Array.isArray(payload)?payload:[payload],source);
}
