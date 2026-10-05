import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
export const focusKey=e=>e.placeName+'|'+e.localityText;
const hash=x=>crypto.createHash('sha256').update(x.replaceAll('\r\n','\n')).digest('hex');
function pointValid(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=20&&p[0]<=46&&p[1]>=122&&p[1]<=154;}
export function buildTokyoFocusStatic(source,overlay,{sourceSha256,overlaySha256}={}){
  if(source?.freshnessStatus!=='CURRENT'||source.sourceRowCount!==214||source.publishedCount!==214||source.events?.length!==214)throw new Error('incomplete_focus_source');
  if(overlay?.freshnessStatus!=='CURRENT'||overlay.events?.length!==6)throw new Error('incomplete_verified_overlay');
  const merged=new Map();
  for(const event of source.events){
    if(!event.placeName||!event.localityText||!pointValid(event.locationPoint)||event.coordinateVerified!==false||event.locationApproximate!==true||merged.has(focusKey(event)))throw new Error('invalid_focus_base');
    merged.set(focusKey(event),event);
  }
  const verifiedKeys=new Set();
  for(const event of overlay.events){
    const key=focusKey(event);
    if(!merged.has(key)||verifiedKeys.has(key)||event.coordinateVerified!==true||event.geoPrecision!=='POINT'||!pointValid(event.locationPoint)||!event.coordinateEvidence?.length)throw new Error('invalid_focus_overlay');
    verifiedKeys.add(key);merged.set(key,{...event,locationApproximate:false});
  }
  const events=[...merged.values()];
  if(new Set(events.map(e=>e.id)).size!==214)throw new Error('duplicate_focus_id');
  return {schemaVersion:1,sourceLabel:'警視庁 重点取締場所（都内全域）',sourceUrl:source.sourceUrl,sourceVersionDate:source.sourceVersionDate,sourceVerifiedAt:source.sourceVerifiedAt,freshnessStatus:'CURRENT',scope:'tokyo_all_focus_static',locationMethod:source.locationMethod,locationAttribution:source.locationAttribution,sourceRowCount:214,publishedCount:214,verifiedCount:6,approximateCount:208,audit:{builderVersion:1,sourceSha256,overlaySha256,inputHashEncoding:'UTF-8 with LF line endings',acquisition:source.acquisition,sourceDatesPreserved:true,noRuntimeGeocoding:true,approximatePrecision:'TOWN_REPRESENTATIVE',verifiedPrecision:'Existing six independently evidenced points; no promotion of the other 208'},events};
}
async function main(){
  const args=process.argv.slice(2),arg=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
  const input=arg('--input')||'data/drive/tokyo-focus-locations-source-v1.json',overlay=arg('--overlay')||'drive-beta/data/tokyo-focus-locations-wangan-preview-v1.json';
  const [a,b]=await Promise.all([fs.readFile(input,'utf8'),fs.readFile(overlay,'utf8')]);
  const result=buildTokyoFocusStatic(JSON.parse(a),JSON.parse(b),{sourceSha256:hash(a),overlaySha256:hash(b)});
  await fs.writeFile(arg('--out')||'drive-beta/data/tokyo-focus-locations-all-v1.json',JSON.stringify(result,null,2)+'\n');
  console.log('TOKYO_FOCUS=214; VERIFIED=6; APPROXIMATE=208; mode=offline');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
