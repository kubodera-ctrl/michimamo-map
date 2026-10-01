import fs from 'node:fs';
import path from 'node:path';
import {normalizeCommonItem,parseHtmlStructured} from '../../shared/machiibe-ingestion/adapters';
import {parseFactsOnlyHtml} from '../../shared/machiibe-ingestion/facts-only-html';
import type {SourcePolicySnapshot} from '../../shared/machiibe-ingestion/contracts';

type FactsOnlyRow={
  source_key:string;
  source_name?:string;
  source_type?:string;
  prefecture?:string|null;
  municipality?:string|null;
  base_url?:string;
  feed_url?:string|null;
  homepage_url?:string;
  event_url?:string;
  fetch_method?:string;
  terms_status?:string;
  robots_status?:string;
  commercial_use_status?:string;
  reuse_status?:string;
  redistribution_status?:string;
  cache_status?:string;
  image_use_status?:string;
  sns_use_status?:string;
  attribution_requirement?:string|null;
  review_state?:string;
  automated_fetch_allowed?:boolean;
  fetch_scope?:string;
  body_text_reuse_allowed?:boolean;
  image_reuse_allowed?:boolean;
  html_cache_allowed?:boolean;
  source_link_required?:boolean;
  stop_on_403_429_or_explicit_bot_block?:boolean;
  max_requests_per_minute?:number;
  observed_current_items_min?:number|null;
};

function stableSourceId(sourceKey:string){
  let hash=2166136261;
  for(let i=0;i<sourceKey.length;i++){
    hash^=sourceKey.charCodeAt(i);
    hash=Math.imul(hash,16777619);
  }
  return (hash>>>0)||1;
}

function loadRows(){
  const nationalPath=path.resolve(process.cwd(),'../data/machiibe/national_source_discovery_v1.json');
  const facilityPath=path.resolve(process.cwd(),'../data/machiibe/facility_source_instances_v1.json');
  const national=JSON.parse(fs.readFileSync(nationalPath,'utf8')) as {sources:FactsOnlyRow[]};
  const facilityJson=JSON.parse(fs.readFileSync(facilityPath,'utf8')) as
    {sources?:FactsOnlyRow[];instances?:FactsOnlyRow[]}|FactsOnlyRow[];
  const facility=Array.isArray(facilityJson)
    ?facilityJson
    :(facilityJson.sources||facilityJson.instances||[]);
  return [...national.sources,...facility];
}

function fetchUrl(row:FactsOnlyRow){
  const raw=row.feed_url||row.event_url||row.base_url||row.homepage_url||'';
  if(row.source_key==='fukui-pref-odekake-events'&&raw){
    const now=new Date();
    const year=new Intl.DateTimeFormat('en',{timeZone:'Asia/Tokyo',year:'numeric'}).format(now);
    const month=new Intl.DateTimeFormat('en',{timeZone:'Asia/Tokyo',month:'numeric'}).format(now);
    const url=new URL(raw);
    url.searchParams.set('year',year);
    url.searchParams.set('month',month);
    return url.toString();
  }
  return raw;
}

function assertFactsOnly(row:FactsOnlyRow){
  if(row.review_state!=='TERMS_REVIEWED') throw new Error('facts-only source must remain TERMS_REVIEWED');
  if(row.terms_status!=='reviewed_facts_only') throw new Error('facts-only terms gate is not reviewed_facts_only');
  if(row.automated_fetch_allowed!==true) throw new Error('facts-only automated fetch is disabled');
  if(row.fetch_scope!=='facts_only') throw new Error('facts-only scope is not explicit');
  if(row.robots_status==='disallowed') throw new Error('robots/access policy explicitly disallows automated fetch');
  if(row.fetch_method && row.fetch_method!=='HTML_STRUCTURED') throw new Error('facts-only live dry-run currently supports HTML_STRUCTURED only');
  if(row.body_text_reuse_allowed!==false) throw new Error('body text reuse must be disabled');
  if(row.image_reuse_allowed!==false) throw new Error('image reuse must be disabled');
  if(row.html_cache_allowed!==false) throw new Error('HTML cache must be disabled');
  if(row.source_link_required!==true) throw new Error('source link retention must be required');
  if(row.stop_on_403_429_or_explicit_bot_block!==true) throw new Error('403/429/bot-block stop gate must be enabled');
  const url=fetchUrl(row);
  if(!url.startsWith('https://')) throw new Error('facts-only source requires an HTTPS public URL');
  return url;
}

function sourceSnapshot(row:FactsOnlyRow,url:string):SourcePolicySnapshot{
  const robots=(row.robots_status||'pending') as SourcePolicySnapshot['robotsStatus'];
  const commercial=(row.commercial_use_status||'conditional') as SourcePolicySnapshot['commercialUseStatus'];
  const reuse=(row.reuse_status||'unknown') as SourcePolicySnapshot['reuseStatus'];
  const redistribution=(row.redistribution_status||'unknown') as SourcePolicySnapshot['redistributionStatus'];
  const cache=(row.cache_status||'unknown') as SourcePolicySnapshot['cacheStatus'];
  const image=(row.image_use_status||'unknown') as SourcePolicySnapshot['imageUseStatus'];
  const sns=(row.sns_use_status||'unknown') as SourcePolicySnapshot['snsUseStatus'];
  return {
    sourceId:stableSourceId(row.source_key),
    sourceName:row.source_name||row.source_key,
    sourceType:row.source_type||'facility_event_page',
    prefecture:row.prefecture||null,
    municipality:row.municipality||null,
    baseUrl:row.base_url||row.homepage_url||url,
    feedUrl:url,
    fetchMethod:'HTML_STRUCTURED',
    termsStatus:'reviewed_facts_only',
    robotsStatus:robots,
    commercialUseStatus:commercial,
    reuseStatus:reuse,
    redistributionStatus:redistribution,
    cacheStatus:cache,
    imageUseStatus:image,
    snsUseStatus:sns,
    attributionRequirement:row.attribution_requirement||null,
    sourceStage:'TERMS_REVIEWED',
    lastTermsCheckedAt:'2026-10-01',
    updateFrequencyMinutes:1440,
    lastCheckedAt:null,
    lastSuccessAt:null,
    failureCount:0,
    active:false,
    priority:80,
    automatedFetchAllowed:true,
    etag:null,
    lastModified:null
  };
}

function decodeEntities(value:string){
  return value
    .replace(/&amp;/gi,'&')
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/&nbsp;/gi,' ');
}

function decodeHtml(bytes:Uint8Array,contentType:string){
  const declared=(contentType.match(/charset=([^;\s]+)/i)?.[1]||'').toLowerCase();
  const aliases:Record<string,string>={
    'utf8':'utf-8','utf-8':'utf-8',
    'shift_jis':'shift_jis','shift-jis':'shift_jis','sjis':'shift_jis','windows-31j':'shift_jis','cp932':'shift_jis',
    'euc-jp':'euc-jp','euc_jp':'euc-jp','eucjp':'euc-jp'
  };
  const decode=(encoding:string,fatal=false)=>new TextDecoder(encoding,{fatal}).decode(bytes);
  const explicit=aliases[declared];
  if(explicit){
    try{return {html:decode(explicit),encoding:explicit};}catch{}
  }
  const anchors=['イベント','開催','期間','場所','会場','募集','年月','タイトル','一覧','件中','令和'];
  const candidates=['utf-8','shift_jis','euc-jp'].map((encoding,index)=>{
    try{
      const html=decode(encoding);
      const head=html.slice(0,120_000);
      const replacementCount=(html.match(/\uFFFD/g)||[]).length;
      const anchorHits=anchors.filter(anchor=>head.includes(anchor)).length;
      const mojibakePenalty=(head.match(/[･｢｣､｡]/g)||[]).length;
      return {html,encoding,score:anchorHits*500-replacementCount*50-mojibakePenalty-index};
    }catch{
      return {html:'',encoding,score:Number.MIN_SAFE_INTEGER};
    }
  });
  const best=candidates.sort((a,b)=>b.score-a.score)[0];
  if(!best||best.score===Number.MIN_SAFE_INTEGER) return {html:decode('utf-8'),encoding:'utf-8-replacement'};
  return {html:best.html,encoding:best.encoding};
}

function plainText(value:string){
  return decodeEntities(value.replace(/<script\b[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim());
}

function siteKey(hostname:string){
  const parts=hostname.toLowerCase().split('.').filter(Boolean);
  if(parts.length>=4&&parts.slice(-2).join('.')==='lg.jp') return parts.slice(-4).join('.');
  if(parts.length>=3&&parts.slice(-2).join('.')==='co.jp') return parts.slice(-3).join('.');
  return parts.slice(-2).join('.');
}

function canonicalUrl(value:string){
  const url=new URL(value);
  url.hash='';
  return url.toString();
}

function anchorInventory(html:string,pageUrl:string){
  const page=new URL(pageUrl);
  const seen=new Set<string>();
  const candidates:{title:string;url:string}[]=[];
  const generic=/^(詳しく|詳細|こちら|もっと見る|一覧|トップ|ホーム|次へ|前へ|戻る|menu|more|read more)$/i;
  const asset=/\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|css|js)(?:$|\?)/i;
  for(const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const href=decodeEntities(match[1].trim());
    if(!href||href.startsWith('#')||/^(?:mailto|tel|javascript):/i.test(href))continue;
    let url:URL;
    try{url=new URL(href,pageUrl);}catch{continue;}
    if(url.protocol!=='https:'||asset.test(url.pathname))continue;
    if(siteKey(url.hostname)!==siteKey(page.hostname))continue;
    const title=plainText(match[2]);
    if(title.length<3||title.length>160||generic.test(title))continue;
    const key=title+'|'+canonicalUrl(url.toString());
    if(seen.has(key))continue;
    seen.add(key);
    candidates.push({title,url:canonicalUrl(url.toString())});
  }
  const pageCanonical=canonicalUrl(pageUrl);
  return candidates.filter(item=>item.url!==pageCanonical);
}

function eventLikeLinkInventory(row:FactsOnlyRow,links:{title:string;url:string}[]){
  const eventWords=/(イベント|開催|募集|体験|教室|講座|フェスタ|まつり|祭|展|観察|セミナー|公演|マルシェ|大会|相談|ツアー|ライブ|コンサート|ワークショップ|発表|シンポジウム|フォーラム|POP.?UP|グリーティング|festival|event|workshop|concert)/i;
  return links.filter(item=>{
    const url=new URL(item.url);
    const path=url.pathname.toLowerCase();
    if(row.source_key==='kyoto-station-building-events'){
      return path.startsWith('/events/')
        && path!=='/events/'
        && !path.startsWith('/events/news_pdf/');
    }
    if(row.source_key==='ibaraki-kasumigaura-esc-events'){
      return path.includes('/03_event/')
        && !/(?:\/top\.htm|\/event_schedule20\d{2}\.htm)$/.test(path)
        && item.title.length>=4;
    }
    if(row.source_key==='fukui-pref-odekake-events'){
      return path.endsWith('/event/view.php')
        && url.searchParams.has('event_cod')
        && item.title.length>=3;
    }
    if(row.source_key==='yamaguchi-pref-event-calendar'){
      return item.title!=='イベント一覧表示'
        && eventWords.test(item.title);
    }
    if(row.source_key==='tochigi-pref-event-calendar'){
      return !/^(本日のイベント一覧|長期イベント一覧|イベント情報一覧)$/.test(item.title)
        && eventWords.test(item.title);
    }
    if(row.source_key==='kyoto-pref-current-events'){
      return eventWords.test(item.title)
        && !/(イベント・募集|イベント検索|イベント一覧|募集情報)$/.test(item.title);
    }
    return eventWords.test(item.title);
  });
}

function dateEvidence(text:string,lastModified:string|null){
  const western=[...text.matchAll(/\b(20\d{2})[\/.\-年](\d{1,2})[\/.\-月](\d{1,2})(?:日)?\b/g)]
    .map(match=>match[1]+'-'+String(Number(match[2])).padStart(2,'0')+'-'+String(Number(match[3])).padStart(2,'0'));
  const reiwa=[...text.matchAll(/令和\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g)]
    .map(match=>String(2018+Number(match[1]))+'-'+String(Number(match[2])).padStart(2,'0')+'-'+String(Number(match[3])).padStart(2,'0'));
  const full=[...western,...reiwa];
  const monthDay=[...text.matchAll(/(?:^|\D)(\d{1,2})月(\d{1,2})日/g)].length;
  const unique=[...new Set(full)].sort();
  const now=new Date();
  const currentYear=new Intl.DateTimeFormat('en',{timeZone:'Asia/Tokyo',year:'numeric'}).format(now);
  const currentMonth=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Tokyo',month:'numeric'}).format(now));
  const currentMonthDayTokenCount=[...text.matchAll(new RegExp('(?:^|\\D)'+currentMonth+'月\\s*\\d{1,2}日','g'))].length;
  const currentYearMentionCount=(text.match(new RegExp(currentYear+'年','g'))||[]).length
    +(text.match(new RegExp('令和\\s*'+(Number(currentYear)-2018)+'年','g'))||[]).length;
  let lastModifiedAgeDays:null|number=null;
  if(lastModified){
    const t=Date.parse(lastModified);
    if(Number.isFinite(t)) lastModifiedAgeDays=Math.max(0,Math.floor((Date.now()-t)/86_400_000));
  }
  return {
    fullDateCount:unique.length,
    monthDayTokenCount:monthDay,
    currentMonthDayTokenCount,
    currentYearMentionCount,
    latestFullDate:unique.length?unique[unique.length-1]:null,
    containsCurrentYear:unique.some(value=>value.startsWith(currentYear+'-'))||currentYearMentionCount>0,
    httpLastModified:lastModified,
    httpLastModifiedAgeDays:lastModifiedAgeDays
  };
}

async function main(){
  const sourceKey=process.argv[2];
  if(!sourceKey) throw new Error('usage: npm run source:dry-run-facts-only -- <source_key>');
  const row=loadRows().find(item=>item.source_key===sourceKey);
  if(!row) throw new Error('source not found: '+sourceKey);
  const url=assertFactsOnly(row);
  const source=sourceSnapshot(row,url);

  const response=await fetch(url,{
    method:'GET',
    headers:{
      accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
      'user-agent':'SUMION-machiibe-facts-only-dry-run/1.0 (+https://machiibe.jp/)'
    },
    redirect:'follow',
    signal:AbortSignal.timeout(20_000)
  });
  if(response.status===403||response.status===429){
    throw new Error('explicit access stop status: '+response.status);
  }
  if(!response.ok) throw new Error('fetch failed: '+response.status);
  const contentType=(response.headers.get('content-type')||'').toLowerCase();
  if(contentType&&!contentType.includes('text/html')&&!contentType.includes('application/xhtml+xml')){
    throw new Error('unexpected content-type: '+contentType);
  }

  const declaredLength=Number(response.headers.get('content-length')||0);
  const maxBytes=2_000_000;
  if(declaredLength>maxBytes) throw new Error('content-length exceeds dry-run byte limit');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength>maxBytes) throw new Error('response exceeds dry-run byte limit');
  const decoded=decodeHtml(bytes,contentType);
  const html=decoded.html;

  const parsed=parseHtmlStructured(html,source);
  const normalized=parsed.items.map(item=>normalizeCommonItem(item,source));
  const factParsed=parseFactsOnlyHtml(row.source_key,html,response.url||url);
  const factNormalized=factParsed.items.map((item,index)=>normalizeCommonItem({
    sourceId:source.sourceId,
    sourceEventId:null,
    sourceUrl:item.officialUrl,
    sourceUpdatedAt:null,
    sourceHash:'facts-only-'+source.sourceId+'-'+String(index),
    payload:{
      title:item.title,
      startDate:item.startAt,
      endDate:item.endAt,
      venue_name:item.venueName,
      category:item.category,
      url:item.officialUrl
    }
  },source));
  const links=anchorInventory(html,url);
  let eventLikeLinks=eventLikeLinkInventory(row,links);
  if(row.source_key==='fukui-pref-odekake-events'){
    const seenEventCodes=new Set<string>();
    eventLikeLinks=eventLikeLinks.filter(item=>{
      const code=new URL(item.url).searchParams.get('event_cod');
      if(!code||seenEventCodes.has(code))return false;
      seenEventCodes.add(code);
      return true;
    });
  }
  const pageText=plainText(html);
  const lastModified=response.headers.get('last-modified');
  const dates=dateEvidence(pageText,lastModified);

  const structured={
    items:normalized.length,
    withTitle:normalized.filter(item=>Boolean(item.title)).length,
    withStart:normalized.filter(item=>Boolean(item.startAt)).length,
    withLocation:normalized.filter(item=>Boolean(item.venueName||item.address||item.municipality)).length,
    withEventSpecificOfficialUrl:normalized.filter(item=>Boolean(item.officialUrl&&canonicalUrl(item.officialUrl)!==canonicalUrl(url))).length,
    parserWarnings:parsed.warnings
  };
  const factStructured={
    items:factNormalized.length,
    withTitle:factNormalized.filter(item=>Boolean(item.title)).length,
    withDateText:factParsed.items.filter(item=>Boolean(item.dateText)).length,
    withStart:factNormalized.filter(item=>Boolean(item.startAt)).length,
    withEnd:factNormalized.filter(item=>Boolean(item.endAt)).length,
    withLocation:factNormalized.filter(item=>Boolean(item.venueName||item.address||item.municipality)).length,
    withStatusFact:factParsed.items.filter(item=>Boolean(item.statusFact)).length,
    withEventSpecificOfficialUrl:factNormalized.filter(item=>Boolean(item.officialUrl&&canonicalUrl(item.officialUrl)!==canonicalUrl(url))).length,
    parserWarnings:factParsed.warnings
  };

  const output={
    sourceKey,
    dryRun:true,
    productionWrite:false,
    databaseWrite:false,
    activeWrite:false,
    requestCount:1,
    policy:{
      reviewState:row.review_state,
      termsStatus:row.terms_status,
      robotsStatus:row.robots_status||'pending',
      fetchScope:row.fetch_scope,
      bodyTextReuse:false,
      imageReuse:false,
      htmlCache:false,
      sourceLinkRequired:true,
      readyPromotion:false,
      publishablePromotion:false,
      activePromotion:false
    },
    http:{
      status:response.status,
      finalUrl:response.url,
      contentType,
      detectedEncoding:decoded.encoding,
      bytes:bytes.byteLength,
      etag:response.headers.get('etag'),
      lastModified
    },
    schema:{
      jsonLdStructuredEvents:structured,
      sourceSpecificHtmlFacts:factStructured,
      sameOfficialSiteFactLinkCandidates:links.length,
      eventLikeFactLinkCandidates:eventLikeLinks.length,
      eventSpecificUrlSample:eventLikeLinks.slice(0,12),
      extractionMode:factNormalized.length>0?'source_specific_html_facts':normalized.length>0?'json_ld_event':'html_fact_links_required'
    },
    freshness:dates,
    load:{
      configuredMaxRequestsPerMinute:row.max_requests_per_minute||null,
      actualRequestsThisRun:1,
      retries:0,
      maxResponseBytes:maxBytes,
      htmlPersisted:false
    },
    observedCurrentItemsMin:row.observed_current_items_min??null
  };
  process.stdout.write(JSON.stringify(output,null,2)+'\n');
}

main().catch(error=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
