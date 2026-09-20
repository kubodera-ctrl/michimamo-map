const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const migration=fs.readFileSync('supabase/migrations/20260919114859_local_anomaly_reporting.sql','utf8');

assert.match(html,/data-filter="local_anomaly"/,'map filter includes local anomaly');
assert.match(html,/<option value="local_anomaly">/,'post form includes local anomaly');
assert.match(html,/id="localAnomalyType"/,'local anomaly subtype selector exists');
assert.match(html,/id="localAnomalyFactOnly"/,'fact-only / no-tracking acknowledgement exists');
assert.match(html,/人物・車両を犯人や所有者と断定せず/,'UI explicitly prohibits identification and accusation');
const anomalyAreaIndex=html.indexOf('id="localAnomalyArea"');
const categoryIndex=html.indexOf('<label>種類</label>',html.indexOf('<form id="postForm"'));
assert.ok(anomalyAreaIndex>=0 && anomalyAreaIndex<categoryIndex,'local anomaly guidance/subtype area appears before the category selector when shown');
assert.match(html,/id="postTitleBlock"/,'title input can be conditionally hidden for local anomalies');
assert.match(html,/titleBlock\.style\.display = isOther \? 'block' : 'none'/,'free-text title is shown only when subtype is other');
assert.match(html,/titleLabel\.textContent = 'その他の内容'/,'other subtype asks for a specific free-text description');
assert.match(html,/titleInput\.required = isOther/,'free-text title is required only for other subtype');
assert.match(html,/title = anomalyLabel/,'non-other local anomaly submissions derive the title from the selected subtype');
assert.match(html,/人物の特徴・氏名・顔・ナンバーなどは書かず/,'local anomaly comment prompt rejects identifiers');
assert.match(html,/緊急の事故・犯罪・災害は110・119へ/,'local anomaly popup uses contextual emergency guidance');
assert.match(html,/cat === 'local_anomaly'\) \{[\s\S]*reportArea\.style\.display = 'none'/,'police-reported checkbox is hidden for general local anomalies');
assert.match(html,/localAnomalyLabels\s*=\s*\{/,'subtype labels are defined');
assert.match(html,/category:cat,anomaly_type:anomalyType/,'submission payload carries anomaly subtype');
assert.match(html,/\['aed', 'abandoned', 'local_anomaly'\]/,'local anomaly photos are normalized before upload');
assert.match(html,/cat==='abandoned' \|\| \(cat==='local_anomaly' && file\)/,'optional local anomaly photo gets a public URL');
assert.match(html,/option\[value="local_anomaly"\]/,'AI camera draft cannot select local anomaly');
assert.match(html,/spot\.category === 'local_anomaly'.*fa-eye/s,'local anomaly map pin uses its own icon');
assert.match(html,/s\.category === 'local_anomaly'.*#0891b2/s,'local anomaly heat circle uses its own color');
assert.match(html,/else if \(category === 'local_anomaly'\) catStr = "🟦地域の異変"/,'share copy names the local anomaly category');

assert.match(migration,/add column if not exists anomaly_type text/,'database stores only the anomaly subtype');
assert.match(migration,/cat not in \('illegal','danger','patrol','abandoned','reckless','local_anomaly'\)/,'RPC accepts the new category');
assert.match(migration,/cat='local_anomaly'.*atype is null/s,'RPC requires a valid anomaly subtype');
assert.match(migration,/cat in \('abandoned','local_anomaly'\)/,'AI camera source rejects local anomaly');
assert.match(migration,/cat not in \('abandoned','local_anomaly'\)/,'owned-photo validation covers local anomaly');
assert.doesNotMatch(migration,/number_plate|license_plate|person_id|vehicle_id|face_id/i,'schema does not add person or vehicle tracking identifiers');

console.log('PASS: local anomaly UI, privacy guardrails, map rendering and DB validation are wired.');
