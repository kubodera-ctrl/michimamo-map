'use strict';

const POLICE_CSV='https://www.keishicho.metro.tokyo.lg.jp/kotsu/torishimari/kokai_juten/jutentorishimari.files/juten.csv';
const POLICE_PAGE='https://www.keishicho.metro.tokyo.lg.jp/kotsu/torishimari/kokai_juten/jutentorishimari.html';
const GEOLONIA_BASE='https://japanese-addresses-v2.geoloniamaps.com/api/ja/%E6%9D%B1%E4%BA%AC%E9%83%BD';

function parseCsv(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){
      if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;continue;}
      if(ch==='"'){quoted=false;continue;}
      cell+=ch;continue;
    }
    if(ch==='"'){quoted=true;continue;}
    if(ch===','){row.push(cell);cell='';continue;}
    if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';continue;}
    cell+=ch;
  }
  if(cell.length||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
  return rows;
}

function normalizeText(value){return String(value||'').normalize('NFKC').replace(/\s+/g,'').trim();}
function normalizeTownKey(value){
  const kanji={'〇':'0','一':'1','二':'2','三':'3','四':'4','五':'5','六':'6','七':'7','八':'8','九':'9','十':'10'};
  return normalizeText(value)
    .replace(/^大字/,'')
    .replace(/([一二三四五六七八九])?十([一二三四五六七八九])?/g,(_,a,b)=>String((a?Number(kanji[a]):1)*10+(b?Number(kanji[b]):0)))
    .replace(/[〇一二三四五六七八九]/g,m=>kanji[m])
    .replace(/[・‐－―ー\-]/g,'');
}
function stripVicinity(value){return normalizeText(value).replace(/(?:付近|周辺)$/,'');}
function geoloniaMunicipalityKey(municipality,location){
  const admin=normalizeText(municipality);
  const full=stripVicinity(location);
  if(admin.endsWith('郡')&&full.startsWith(admin)){
    const nested=full.slice(admin.length).match(/^(.+?[町村])/);
    if(nested)return admin+nested[1];
  }
  return admin;
}
function authoritativeFullLocationAlias(admin,full){
  // 警視庁CSVは行政区=稲城市だが、この1行だけ実施場所を「多摩市大丸1541番」と記録。
  // 稲城市公式でも大丸は川崎街道沿いの地名として確認できるため、source typoとして限定補正する。
  if(admin==='稲城市'&&/^多摩市大丸1541番(?:地)?$/.test(full))return '稲城市大丸1541番';
  return full;
}
function authoritativeLocalityAlias(admin,full,local){
  // 警視庁の別公式資料で本町新道=吉祥寺本町1丁目と確認できる省略表記。
  if(admin==='武蔵野市'&&local==='本町1丁目')return '吉祥寺本町1丁目';
  // 町田市2024住所対照表で南大谷1428番地の掲載枝番は全て南大谷一丁目へ変更。
  if(admin==='町田市'&&/^南大谷1428番(?:地)?$/.test(local))return '南大谷一丁目';
  return local;
}
function locationParts(municipality,location){
  const admin=normalizeText(municipality);
  let full=authoritativeFullLocationAlias(admin,stripVicinity(location));
  if(admin&&!full.startsWith(admin))full=admin+full;
  const city=geoloniaMunicipalityKey(admin,full);
  let local=city&&full.startsWith(city)
    ?full.slice(city.length)
    :(admin&&full.startsWith(admin)?full.slice(admin.length):full);
  local=authoritativeLocalityAlias(admin,full,local);
  local=local.replace(/\d+番.*$/,'').replace(/\d+号.*$/,'');
  return {city,full,local};
}

function matchTownPoint(local,townRows){
  const key=normalizeTownKey(local);
  let best=null,bestLen=-1;
  for(const item of Array.isArray(townRows)?townRows:[]){
    if(!Array.isArray(item?.point)||item.point.length!==2)continue;
    const candidate=normalizeTownKey((item.oaza_cho||'')+(item.chome||''));
    if(!candidate)continue;
    if(key===candidate||(key.startsWith(candidate)&&candidate.length>bestLen)){
      best=item;bestLen=candidate.length;
    }
  }
  if(!best)return null;
  const [lng,lat]=best.point.map(Number);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
  return [lat,lng];
}

function rowsFromCsv(text){
  const parsed=parseCsv(text);
  if(parsed.length<2)return [];
  const out=[];let lastMunicipality='',lastStation='';
  for(const cols of parsed.slice(1)){
    if(cols.length<4)continue;
    const municipality=normalizeText(cols[0])||lastMunicipality;
    const policeStation=normalizeText(cols[1])||lastStation;
    const localityText=normalizeText(cols[2]);
    const placeName=normalizeText(cols[3]);
    const reason=String(cols[4]||'').trim();
    if(municipality)lastMunicipality=municipality;
    if(policeStation)lastStation=policeStation;
    if(!localityText||!placeName)continue;
    out.push({municipality,policeStation,localityText,placeName,reason});
  }
  return out;
}

async function fetchTownRows(city){
  const url=GEOLONIA_BASE+'/'+encodeURIComponent(city)+'.json';
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('geolonia_'+city+'_'+response.status);
  const payload=await response.json();
  return Array.isArray(payload?.data)?payload.data:[];
}

async function buildAllTokyoEvents(sourceRows){
  const cities=[...new Set(sourceRows.map(x=>locationParts(x.municipality,x.localityText).city).filter(Boolean))];
  const cityData=new Map();
  await Promise.all(cities.map(async city=>{
    try{cityData.set(city,await fetchTownRows(city));}
    catch(error){console.warn('focus geocode city failed',city,error.message);cityData.set(city,[]);}
  }));
  const events=[];
  for(const row of sourceRows){
    const parts=locationParts(row.municipality,row.localityText);
    const point=matchTownPoint(parts.local,cityData.get(parts.city));
    if(!point)continue;
    const slug=Buffer.from(row.municipality+'|'+row.placeName).toString('base64url').slice(0,32);
    events.push({
      id:'focus-tokyo-'+slug,
      eventKey:'tokyo:focus-locations:all:'+slug,
      enforcementType:'重点取締場所',
      policeStation:row.policeStation||null,
      localityText:row.localityText,
      placeName:row.placeName,
      reason:row.reason||null,
      geoPrecision:'LOCALITY',
      locationPoint:point,
      coordinatePrecision:'TOWN_REPRESENTATIVE',
      coordinateVerified:false,
      locationApproximate:true,
      coordinateEvidence:[
        '警視庁 重点取締場所一覧の実施場所',
        'Geolonia 住所データの町丁目代表点（CC BY 4.0）'
      ],
      sourceUrl:POLICE_PAGE,
      sourceVerifiedAt:'2026-10-01',
      freshnessStatus:'CURRENT'
    });
  }
  return events;
}

async function handler(req,res){
  try{
    const response=await fetch(POLICE_CSV,{headers:{'User-Agent':'machidora-preview/1.0','Accept':'text/csv,*/*;q=0.8'}});
    if(!response.ok)throw new Error('police_csv_'+response.status);
    const bytes=await response.arrayBuffer();
    const text=new TextDecoder('shift_jis').decode(bytes);
    const sourceRows=rowsFromCsv(text);
    const events=await buildAllTokyoEvents(sourceRows);
    res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.status(200).json({
      schemaVersion:1,
      sourceLabel:'警視庁 重点取締場所（都内全域Preview）',
      sourceUrl:POLICE_PAGE,
      sourceVersionDate:'2026-07-01',
      sourceVerifiedAt:'2026-10-01',
      freshnessStatus:'CURRENT',
      scope:'tokyo_all_focus_locality_preview',
      locationMethod:'OFFICIAL_LOCALITY_TO_TOWN_REPRESENTATIVE',
      locationAttribution:'Geolonia 住所データ (CC BY 4.0)',
      sourceRowCount:sourceRows.length,
      publishedCount:events.length,
      events
    });
  }catch(error){
    console.error('drive focus Tokyo API failed',error);
    res.setHeader('Cache-Control','no-store');
    return res.status(502).json({error:'focus_tokyo_unavailable'});
  }
}

module.exports=handler;
module.exports.parseCsv=parseCsv;
module.exports.rowsFromCsv=rowsFromCsv;
module.exports.geoloniaMunicipalityKey=geoloniaMunicipalityKey;
module.exports.authoritativeFullLocationAlias=authoritativeFullLocationAlias;
module.exports.authoritativeLocalityAlias=authoritativeLocalityAlias;
module.exports.locationParts=locationParts;
module.exports.matchTownPoint=matchTownPoint;
module.exports.buildAllTokyoEvents=buildAllTokyoEvents;
