const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { normalize } = require('@geolonia/normalize-japanese-addresses');

const OUT = 'data/aed_dev17_geolonia_strict';
fs.mkdirSync(OUT, { recursive: true });

const TARGETS = [
  {
    code: '04207', prefecture: '宮城県', municipality: '名取市',
    file: 'data/aed_dev14/raw/04207_32919.bin', type: 'csv',
    source_url: 'https://miyagi.dataeye.jp/resources/32919',
    source_license: 'cc-by4_0', source_updated_at: '2026-05-25',
    bounds: [38.05, 38.30, 140.75, 141.10],
  },
  {
    code: '12225', prefecture: '千葉県', municipality: '君津市',
    file: 'data/aed_dev14/raw/12225_56087.bin', type: 'xlsx', sheet: 'AED設置箇所一覧', range: 1,
    source_url: 'https://opendata.pref.chiba.lg.jp/resources/56087',
    source_license: 'cc-by4_0', source_updated_at: '2025-03-17',
    bounds: [35.10, 35.50, 139.70, 140.20],
  },
  {
    code: '12228', prefecture: '千葉県', municipality: '四街道市',
    file: 'data/aed_dev14/raw/12228_56525.bin', type: 'xlsx', sheet: '1113', range: 2,
    source_url: 'https://opendata.pref.chiba.lg.jp/resources/56525',
    source_license: 'cc-by4_0', source_updated_at: '2026-03-27', data_as_of: '2025-04-01',
    bounds: [35.60, 35.75, 140.10, 140.30],
  },
];

function clean(value) { return String(value ?? '').normalize('NFKC').trim(); }
function first(row, keys) {
  for (const key of keys) if (clean(row[key])) return clean(row[key]);
  return '';
}
function csvRows(file) {
  const buffer = fs.readFileSync(file);
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
  catch { text = iconv.decode(buffer, 'cp932'); }
  return parse(text, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true });
}
function xlsxRows(target) {
  const workbook = XLSX.readFile(target.file, { cellDates: false });
  return XLSX.utils.sheet_to_json(workbook.Sheets[target.sheet], { defval: '', range: target.range });
}

async function processTarget(target) {
  const rows = target.type === 'csv' ? csvRows(target.file) : xlsxRows(target);
  const accepted = [];
  const held = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const name = first(row, ['名称', '機関・施設名', '施設名称', '施設名', 'AED設置施設名称', '設置施設名']);
    let address = first(row, ['住所', '所在地', '所在地_連結表記', '所在地連結表記']);
    const phone = first(row, ['電話番号', '電話', 'TEL', 'tel']);
    address = address.replace(/^〒\d{3}-?\d{4}\s*/, '');
    if (address && !address.startsWith(target.prefecture)) {
      address = target.prefecture + (address.startsWith(target.municipality) ? address : target.municipality + address);
    }
    const base = {
      row: index + 2, name, address, phone: phone || null,
      source_url: target.source_url, source_license: target.source_license,
      source_updated_at: target.source_updated_at, data_as_of: target.data_as_of || null,
    };
    if (!name || !address) {
      held.push({ ...base, reason: 'missing_name_or_address' });
      continue;
    }
    try {
      const result = await normalize(address);
      const lat = Number(result.point?.lat);
      const lon = Number(result.point?.lng);
      const [south, north, west, east] = target.bounds;
      const strict = Number(result.level) === 8
        && result.point && Number(result.point.level) === 8
        && result.pref === target.prefecture && result.city === target.municipality
        && !clean(result.other) && lat >= south && lat <= north && lon >= west && lon <= east;
      const detail = {
        normalized: {
          pref: result.pref, city: result.city, town: result.town, addr: result.addr,
          level: result.level, point: result.point, other: result.other,
        },
      };
      if (strict) accepted.push({ ...base, ...detail, latitude: lat, longitude: lon });
      else held.push({ ...base, ...detail, reason: 'strict_level8_match_failed' });
    } catch (error) {
      held.push({ ...base, reason: 'geocoder_error', error: String(error.message || error) });
    }
  }
  const stem = `${target.code}_${target.municipality}`;
  const report = {
    code: target.code, prefecture: target.prefecture, municipality: target.municipality,
    source_rows: rows.length, accepted: accepted.length, held: held.length,
    policy: 'normalize level=8 AND point.level=8 AND pref/city exact AND other empty AND municipality bounds',
  };
  fs.writeFileSync(path.join(OUT, `${stem}_accepted.json`), JSON.stringify(accepted, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, `${stem}_held.json`), JSON.stringify(held, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, `${stem}_report.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}

async function main() {
  for (const target of TARGETS) await processTarget(target);
}
main().catch(error => { console.error(error); process.exit(1); });
