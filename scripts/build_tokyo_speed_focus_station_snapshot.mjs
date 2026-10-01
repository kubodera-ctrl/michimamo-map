import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const pdfParse=require('pdf-parse');

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
async function fetchWithRetry(url,options={},attempts=4){
  let lastError=null;
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const response=await fetch(url,options);
      if(response.ok)return response;
      lastError=new Error('http_'+response.status);
      if(response.status<500&&response.status!==429)throw lastError;
    }catch(error){lastError=error;}
    if(attempt<attempts)await sleep(500*attempt);
  }
  throw lastError||new Error('fetch_failed');
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

const outPath=process.argv[2]||'tokyo-speed-focus-stations-preview-v1.json';
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
  const windows=parseWindows(data.text);
  return {...item,municipality,locationPoint:point,windows,pdfBytes:buf.length};
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
  sourceIndex:INDEX,
  sourceVerifiedAt:'2026-10-01',
  freshnessStatus:'CURRENT',
  disclaimer:'警察署ごとの速度取締重点路線・重点時間帯の集約表示。マーカー位置は警察署所在地であり、取締地点そのものではありません。'
}));

const failures=parsed.filter(x=>x?.error).map(x=>({station:x.station,error:x.error}));
const noWindows=parsed.filter(x=>!x?.skip&&!x?.error&&(!x.windows||x.windows.length===0)).map(x=>x.station);
const snapshot={
  schemaVersion:1,
  sourceLabel:'警視庁 警察署速度取締指針（都内全域サマリー）',
  sourceUrl:INDEX,
  sourceVersionDate:'2026-07-30',
  sourceVerifiedAt:'2026-10-01',
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
await fs.writeFile(outPath,JSON.stringify(snapshot,null,2)+'\n');
console.log('TOKYO_SPEED_PDFS='+links.length);
console.log('TOKYO_SPEED_STATIONS='+events.length);
console.log('TOKYO_SPEED_FAILURES='+failures.length);
console.log('TOKYO_SPEED_NOWINDOW='+noWindows.length);
console.log('OUTPUT='+outPath);
