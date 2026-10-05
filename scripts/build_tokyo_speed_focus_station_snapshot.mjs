import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);


const INDEX='https://www.keishicho.metro.tokyo.lg.jp/kotsu/jikoboshi/torikumi/sokudokanri/torishimari.html';
const BASE='https://www.keishicho.metro.tokyo.lg.jp';
const SEED='supabase/migrations/20260910_tokyo_safety_seed.sql';

function decodeHtml(s){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function stripTags(s){return decodeHtml(String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());}
function normalizeLine(s){return String(s||'').normalize('NFKC').replace(/[‐‑‒–—―ー−－]/g,'-').replace(/\s+/g,' ').trim();}
function parseStationCoords(sql){
  const out=new Map();
  const re=/\('(?:[^']|'')*','police_station','([^']+)'(?:,'[^']*'){5},(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),/g;
  let m;
  while((m=re.exec(sql))){
    out.set(m[1],[Number(m[2]),Number(m[3])]);
  }
  return out;
}
function parsePdfLinks(html){
  const out=[]; const re=/<a[^>]+href="([^"]*torishimari\.files\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=re.exec(html))){
    const label=stripTags(m[2]);
    const station=(label.match(/([^\s（）()]+警察署)/)||[])[1];
    if(!station)continue;
    const href=m[1].startsWith('http')?m[1]:new URL(m[1],INDEX).href;
    out.push({station,href});
  }
  return out;
}
function parseWindows(text){
  const lines=String(text||'').split(/\r?\n/).map(normalizeLine);
  const start=lines.findIndex(x=>x.includes('重点時間帯'));
  const scope=(start>=0?lines.slice(start+1):lines).slice(0,80);
  const windows=[];
  for(const line of scope){
    if(line.startsWith('※')||line.includes('署指定の重点路線'))break;
    const m=line.match(/(\d{1,2})\s*-\s*(\d{1,2})\s*$/);
    if(!m)continue;
    const a=Number(m[1]),b=Number(m[2]);
    if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||a>24||b<0||b>24||a===b)continue;
    windows.push([a,b]);
  }
  return [...new Map(windows.map(x=>[x.join('-'),x])).values()];
}
function isMainlandMunicipality(name){
  return !/(大島町|八丈町|新島村|小笠原村|利島村|神津島村|三宅村|御蔵島村)/.test(name||'');
}
function parseMunicipalityByStation(sql){
  const out=new Map();
  const re=/\('(?:[^']|'')*','police_station','([^']+)','東京都','([^']+)'/g;
  let m; while((m=re.exec(sql)))out.set(m[1],m[2]);
  return out;
}
async function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
async function fetchWithRetry(url,options={}){
  const response=await fetch(url,options);
  if(!response.ok)throw new Error('http_'+response.status);
  return response;
}
async function pooled(items,limit,fn){
  const results=new Array(items.length); let next=0;
  async function worker(){
    while(true){
      const i=next++; if(i>=items.length)return;
      try{results[i]=await fn(items[i],i);}catch(error){results[i]={error:String(error?.message||error),...items[i]};}
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},worker));
  return results;
}

async function buildLive(versionDate,verifiedAt){
const pdfParse=require('pdf-parse/lib/pdf-parse.js');
const [indexRes,seedSql]=await Promise.all([
  fetch(INDEX,{headers:{'User-Agent':'machidora-snapshot/1.0','Accept':'text/html'}}),
  fs.readFile(SEED,'utf8')
]);
if(!indexRes.ok)throw new Error('index_http_'+indexRes.status);
const html=await indexRes.text();
const links=parsePdfLinks(html);
if(links.length<80)throw new Error('too_few_station_pdfs_'+links.length);
const coords=parseStationCoords(seedSql);
const municipalities=parseMunicipalityByStation(seedSql);

const parsed=await pooled(links,2,async item=>{
  const municipality=municipalities.get(item.station)||null;
  const point=coords.get(item.station)||null;
  if(!point||!isMainlandMunicipality(municipality))return {...item,skip:true,municipality};
  const response=await fetchWithRetry(item.href,{headers:{'User-Agent':'machidora-snapshot/1.0','Accept':'application/pdf'}},4);
  const buf=Buffer.from(await response.arrayBuffer());
  const data=await pdfParse(buf,{max:1});
  const rawSha256=crypto.createHash('sha256').update(buf).digest('hex');
  const windows=parseWindows(data.text);
  return {...item,municipality,locationPoint:point,windows,pdfBytes:buf.length,rawSha256};
});

const events=parsed.filter(x=>!x?.skip&&!x?.error&&Array.isArray(x.windows)&&x.windows.length>0).map(x=>({
  id:'speed-station-'+Buffer.from(x.station).toString('base64url').slice(0,30),
  station:x.station,
  municipality:x.municipality,
  locationPoint:x.locationPoint,
  geoPrecision:'POLICE_STATION_HQ_SUMMARY',
  displayPrecision:'STATION_SUMMARY',
  windows:x.windows,
  sourcePdf:x.href,
  rawSha256:x.rawSha256,
  rawFetchedAt:verifiedAt,
  sourceIndex:INDEX,
  sourceVerifiedAt:verifiedAt,
  freshnessStatus:'CURRENT',
  disclaimer:'警察署ごとの速度取締重点路線・重点時間帯の集約表示。マーカー位置は警察署所在地であり、取締地点そのものではありません。'
}));

const failures=parsed.filter(x=>x?.error).map(x=>({station:x.station,error:x.error}));
const noWindows=parsed.filter(x=>!x?.skip&&!x?.error&&(!x.windows||x.windows.length===0)).map(x=>x.station);
const snapshot={
  schemaVersion:1,
  sourceLabel:'警視庁 警察署速度取締指針（都内全域サマリー）',
  sourceUrl:INDEX,
  sourceVersionDate:versionDate,
  sourceVerifiedAt:verifiedAt,
  freshnessStatus:'CURRENT',
  scope:'tokyo_mainland_police_station_speed_focus_summary',
  displayContract:{
    redBlink:'at least one official focus window is active in JST',
    orange:'official focus windows exist but none is active',
    markerLocation:'police station headquarters; not enforcement route geometry',
    exactGeometryOverride:'existing verified/routable road geometry remains authoritative where available'
  },
  sourceStationPdfCount:links.length,
  publishedStationCount:events.length,
  failedStationCount:failures.length,
  noWindowStationCount:noWindows.length,
  failures,
  noWindows,
  events
};
if(failures.length||noWindows.length)throw new Error('incomplete_station_acquisition');
return snapshot;
}

export {parseWindows,parsePdfLinks};
export function buildCompactStationSnapshot(source){
  if(!source?.sourceVersionDate||!source.sourceVerifiedAt||source.freshnessStatus!=='CURRENT'||!Array.isArray(source.events)||source.events.length!==97)throw new Error('invalid_station_source');
  if(source.failures?.length||source.noWindows?.length)throw new Error('incomplete_station_source');
  const seen=new Set();
  const data=source.events.map(e=>{
    const [lat,lng]=e.locationPoint||[];
    if(!e.station||!e.municipality||seen.has(e.station)||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<20||lat>46||lng<122||lng>154)throw new Error('invalid_station_record');
    seen.add(e.station);
    if(!Array.isArray(e.windows)||!e.windows.length||e.windows.some(w=>!Array.isArray(w)||w.length!==2||w.some(n=>!Number.isInteger(n)||n<0||n>24)||w[0]===w[1]))throw new Error('invalid_station_windows');
    const pdf=new URL(e.sourcePdf),slug=pdf.pathname.match(/torishimari\.files\/([a-z0-9_-]+)\.pdf$/i)?.[1];
    if(pdf.origin!=='https://www.keishicho.metro.tokyo.lg.jp'||!slug)throw new Error('invalid_station_pdf');
    return [e.station,e.municipality,lat,lng,e.windows.map(w=>w.join('-')).join(','),slug];
  });
  return {v:1,sourceVersionDate:source.sourceVersionDate,count:data.length,data,audit:{sourceUrl:source.sourceUrl,sourceVerifiedAt:source.sourceVerifiedAt,sourceProvenance:source.provenance??null,sourceStationPdfCount:source.sourceStationPdfCount??null,publishedStationCount:data.length,failedStationCount:source.failures?.length??0,noWindowStationCount:source.noWindows?.length??0,failures:source.failures??[],noWindows:source.noWindows??[],markerLocation:'POLICE_STATION_HQ_SUMMARY_NOT_ENFORCEMENT_POINT',pdfParserVersion:'1.1.1',records:source.events.map(e=>({station:e.station,sourcePdf:e.sourcePdf,rawSha256:e.rawSha256??null,rawFetchedAt:e.rawFetchedAt??null}))}};
}
async function main(){
  const args=process.argv.slice(2),value=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
  let source;
  if(args.includes('--live')){
    const version=value('--source-version-date'),verified=value('--verified-at');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(version||'')||!verified||Number.isNaN(Date.parse(verified)))throw new Error('explicit_source_dates_required');
    source=await buildLive(version,verified);
  }else source=JSON.parse(await fs.readFile(value('--input')||'data/drive/tokyo-speed-focus-stations-source-v1.json','utf8'));
  const result=buildCompactStationSnapshot(source),out=value('--out')||'drive-beta/data/tokyo-speed-focus-stations-preview-v1.json';
  await fs.writeFile(out,JSON.stringify(result)+'\n');
  console.log('TOKYO_SPEED_STATIONS='+result.count+'; mode='+(args.includes('--live')?'live':'offline'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
