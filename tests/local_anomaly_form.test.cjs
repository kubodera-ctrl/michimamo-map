const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
const elements = Object.fromEntries(['postCategory','localAnomalyType','postTitle','postTitleLabel'].map(id => [id,{value:'',style:{}}]));
const context = vm.createContext({document:{getElementById:id=>elements[id]},localAnomalyLabels:{road_damage:'道路の破損・陥没',other:'その他'}});
vm.runInContext(html.slice(html.indexOf('    function syncLocalAnomalyTitle()'),html.indexOf('    function toggleImageUpload()')),context);
test('blue anomaly block precedes category and text controls',()=>{
  const form=html.slice(html.indexOf('<form id="postForm"'),html.indexOf('id="aedSubmissionArea"'));
  assert.ok(form.indexOf('id="localAnomalyArea"') < form.indexOf('id="postCategory"'));
  assert.ok(form.indexOf('id="postCategory"') < form.indexOf('id="postTitle"'));
});
test('ordinary anomaly needs no title; other needs text; other categories restore title',()=>{
  elements.postCategory.value='local_anomaly';
  for(const type of ['','road_damage','other','road_damage']) {
    elements.localAnomalyType.value=type;
    context.syncLocalAnomalyTitle();
    const needsText=type==='other';
    assert.equal(elements.postTitle.required,needsText);
    assert.equal(elements.postTitle.disabled,!needsText);
    assert.equal(elements.postTitle.style.display,needsText?'':'none');
    assert.equal(elements.postTitleLabel.style.display,elements.postTitle.style.display);
  }
  for(const category of ['illegal','aed','abandoned']) {
    elements.postCategory.value=category;
    context.syncLocalAnomalyTitle();
    assert.equal(elements.postTitle.required,true);
    assert.equal(elements.postTitle.disabled,false);
    assert.equal(elements.postTitle.style.display,'');
  }
});
test('payload title uses selected label and ignores stale hidden text',()=>{
  assert.equal(context.resolveLocalAnomalyTitle('road_damage','old other text'),'道路の破損・陥没');
  assert.equal(context.resolveLocalAnomalyTitle('other','  倒れた柵  '),'倒れた柵');
  assert.equal(context.resolveLocalAnomalyTitle('other',' \n '),'');
  assert.equal(context.resolveLocalAnomalyTitle('unknown','stale'),'');
});
