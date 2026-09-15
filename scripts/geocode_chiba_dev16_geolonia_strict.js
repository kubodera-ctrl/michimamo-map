const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { normalize } = require('@geolonia/normalize-japanese-addresses');

const OUT='data/aed_dev16_geolonia_strict';
fs.mkdirSync(OUT,{recursive:true});

function clean(v){ return String(v ?? '').normalize('NFKC').trim(); }
function first(row, keys){ for(const k of keys){ if(clean(row[k])) return clean(row[k]); } return ''; }
function csvRows(file){
  const buf=fs.readFileSync(file);
  let text;
  try { text = new TextDecoder('utf-8',{fatal:true}).decode(buf); }
  catch { text = iconv.decode(buf,'cp932'); }
  const records=parse(text,{columns:true,skip_empty_lines:true,relax_quotes:true,relax_column_count:true});
  return records.filter(r=>first(r,['名称','施設名称','施設名']) || first(r,['住所','所在地']));
}
function xlsxRows(file){
  const wb=XLSX.readFile(file,{cellDates:false});
  for(const s of wb.SheetNames){ const ws=wb.Sheets[s]; const rows=XLSX.utils.sheet_to_json(ws,{defval:''}); if(rows.length) return rows; }
  return [];
}
function targetRows(){
  const catalog=JSON.parse(fs.readFileSync('data/aed_dev14/catalog_fetch.json','utf8'));
  const byCode=Object.fromEntries(catalog.map(x=>[String(x.code),x]));
  const targets=[];
  for(const [code,municipality] of [['12207','松戸市'],['12217','柏市'],['12221','八千代市']]){
    const item=byCode[code];
    if(!item || item.fetch_status!=='downloaded'){ targets.push({code,municipality,rows:[],source:item,skip:'source_not_downloaded'}); continue; }
    let rows=[]; const file=item.snapshot;
    if(code==='12221') rows=xlsxRows(file); else rows=csvRows(file);
    targets.push({code,municipality,rows,source:item});
  }
  const naga=JSON.parse(fs.readFileSync('data/aed_dev16_chiba_pages/12220_流山市.json','utf8'));
  const table=naga.tables?.[0]?.rows||[]; const headers=table[0]||[];
  const rows=table.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??''])));
  targets.push({code:'12220',municipality:'流山市',rows,source:{url:naga.url,selected_resource:{license:'cc-by4_0',updated_at:null}}});
  return targets;
}

async function main(){
  for(const t of targetRows()){
    const accepted=[],held=[];
    for(let i=0;i<t.rows.length;i++){
      const row=t.rows[i];
      const name=first(row,['名称','施設名称','施設名','AED設置施設名称','設置施設名']);
      let address=first(row,['住所','所在地','所在地_連結表記','所在地連結表記']);
      const phone=first(row,['電話番号','電話','TEL','tel']);
      if(t.code==='12217' && !address){ held.push({row:i+2,name,address,phone,reason:'missing_address_in_source'}); continue; }
      if(address){ address=address.replace(/^〒\d{3}-?\d{4}\s*/,''); if(!address.startsWith('千葉県')) address='千葉県'+address; }
      if(!name || !address){ held.push({row:i+2,name,address,phone,reason:'missing_name_or_address'}); continue; }
      try{
        const r=await normalize(address);
        const strict=Number(r.level)===8 && r.point && Number(r.point.level)===8 && r.pref==='千葉県' && r.city===t.municipality && !clean(r.other);
        const base={row:i+2,name,address,phone:phone||null,normalized:{pref:r.pref,city:r.city,town:r.town,addr:r.addr,level:r.level,point:r.point,other:r.other},source_url:t.source?.url||null,source_license:t.source?.selected_resource?.license||null,source_updated_at:t.source?.selected_resource?.updated_at||null};
        if(strict) accepted.push({...base,latitude:Number(r.point.lat),longitude:Number(r.point.lng)});
        else held.push({...base,reason:'strict_level8_match_failed'});
      }catch(e){ held.push({row:i+2,name,address,phone:phone||null,reason:'geocoder_error',error:String(e.message||e)}); }
    }
    const report={code:t.code,prefecture:'千葉県',municipality:t.municipality,source_rows:t.rows.length,accepted:accepted.length,held:held.length,policy:'normalize level=8 AND point.level=8 AND pref/city exact AND other empty'};
    fs.writeFileSync(path.join(OUT,`${t.code}_${t.municipality}_accepted.json`),JSON.stringify(accepted,null,2)+'\n');
    fs.writeFileSync(path.join(OUT,`${t.code}_${t.municipality}_held.json`),JSON.stringify(held,null,2)+'\n');
    fs.writeFileSync(path.join(OUT,`${t.code}_${t.municipality}_report.json`),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report));
  }
}
main().catch(e=>{console.error(e);process.exit(1)});
