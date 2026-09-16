const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { normalize } = require('@geolonia/normalize-japanese-addresses');

const ROOT = 'data/aed_dev18_saitama';
const OUT = path.join(ROOT, 'strict_geocoding');
fs.mkdirSync(OUT, { recursive: true });
const recovery = JSON.parse(fs.readFileSync(path.join(ROOT, 'recovery.json'), 'utf8'));

function clean(value) { return String(value ?? '').normalize('NFKC').trim(); }
function first(row, keys) { for (const key of keys) if (clean(row[key])) return clean(row[key]); return ''; }
function readRows(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.subarray(0, 2).toString('binary') === 'PK' || buffer.subarray(0, 8).toString('hex') === 'd0cf11e0a1b11ae1') {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    return XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { text = iconv.decode(buffer, 'cp932'); }
  return parse(text, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
}
function addressOf(row, target) {
  let address = first(row, ['住所', '所在地', '所在地_連結表記', '所在地連結表記', '設置場所_住所']);
  if (!address) {
    address = [first(row, ['所在地_都道府県']), first(row, ['所在地_市区町村']), first(row, ['所在地_町字']), first(row, ['所在地_番地以下']), first(row, ['建物名等(方書)'])].join('');
  }
  address = address.replace(/^〒\d{3}-?\d{4}\s*/, '');
  if (address && !address.startsWith(target.prefecture)) address = target.prefecture + (address.startsWith(target.municipality) ? address : target.municipality + address);
  return address;
}
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length); let next = 0;
  async function worker() { while (next < items.length) { const index = next++; results[index] = await fn(items[index], index); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
async function processTarget(target) {
  const rows = readRows(target.snapshot);
  const reviewed = await mapLimit(rows, 8, async (row, index) => {
    const name = first(row, ['名称', '機関・施設名', '施設名称', '施設名', 'AED設置施設名称', '設置施設名', '設置場所_名称']);
    const address = addressOf(row, target);
    const base = { row: index + 2, name, address, phone: first(row, ['電話番号', '電話', 'TEL', 'tel', '設置場所_電話番号']) || null, source_url: target.source_url, source_license: target.source_license, source_updated_at: target.source_updated_at };
    if (!name || !address) return { accepted: false, value: { ...base, reason: 'missing_name_or_address' } };
    if (clean(row['外部利用不可']) && !['0', 'なし', '無'].includes(clean(row['外部利用不可']))) return { accepted: false, value: { ...base, reason: 'external_use_restricted' } };
    try {
      const result = await normalize(address);
      const lat = Number(result.point?.lat), lon = Number(result.point?.lng);
      const strict = Number(result.level) === 8 && result.point && Number(result.point.level) === 8 && result.pref === target.prefecture && result.city === target.municipality && !clean(result.other) && lat >= 34.7 && lat <= 36.4 && lon >= 138.6 && lon <= 140.0;
      const detail = { normalized: { pref: result.pref, city: result.city, town: result.town, addr: result.addr, level: result.level, point: result.point, other: result.other } };
      return strict ? { accepted: true, value: { ...base, ...detail, latitude: lat, longitude: lon } } : { accepted: false, value: { ...base, ...detail, reason: 'strict_level8_match_failed' } };
    } catch (error) { return { accepted: false, value: { ...base, reason: 'geocoder_error', error: String(error.message || error) } }; }
  });
  const accepted = reviewed.filter(x => x.accepted).map(x => x.value);
  const held = reviewed.filter(x => !x.accepted).map(x => x.value);
  const stem = `${target.code}_${target.municipality}`;
  const report = { code: target.code, prefecture: target.prefecture, municipality: target.municipality, source_rows: rows.length, accepted: accepted.length, held: held.length, policy: 'normalize level=8 AND point.level=8 AND pref/city exact AND other empty AND Saitama review bounds' };
  fs.writeFileSync(path.join(OUT, `${stem}_accepted.json`), JSON.stringify(accepted, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, `${stem}_held.json`), JSON.stringify(held, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, `${stem}_report.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
async function main() {
  const targets = recovery.rows.filter(row => row.fetch_status === 'downloaded').map(row => ({ ...row, source_license: row.source_license === 'pdl' ? 'PDL 1.0' : row.source_license }));
  for (const target of targets) await processTarget(target);
}
main().catch(error => { console.error(error); process.exit(1); });
