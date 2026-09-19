const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = html.indexOf('function createSpotPin(');
const end = html.indexOf('        const m = L.marker', start);
assert.ok(start >= 0 && end > start, 'pin function must exist');
const fn = vm.runInNewContext('(' + html.slice(start, end) + '\nreturn contactActions;\n})', {
 L: { divIcon: x => x }, escapeHtml: x => x, localAnomalyLabels: { fallen_tree: '倒木' }
});
for (const category of ['illegal','danger','patrol','abandoned','reckless','local_anomaly','official']) {
 const actions = fn({category,title:'道路の異変',address:'東京都',anomaly_type:'fallen_tree'});
 assert.ok(actions.includes('shareSpot'));
 assert.ok(actions.includes(category === 'local_anomaly' ? '地域へ共有' : '110通報'));
}
assert.ok(html.includes("profileTab.prepend(csvCard)"), 'retain admin-first placement');
console.log('PASS: popup action initialization across 7 categories; admin-first placement retained');
