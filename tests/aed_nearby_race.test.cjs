const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html', 'utf8');
function setup() {
  const requests = [], alerts = [], elements = {};
  const context = vm.createContext({
    document: {getElementById(id) {return elements[id] ||= {textContent:'', value:'東京都', checked:true};}},
    db: {rpc() {return new Promise(resolve => requests.push(resolve));}},
    alert: text => alerts.push(text), escapeHtml: x => x,
  });
  vm.runInContext(`let aedGps={latitude:35,longitude:139,accuracy:10};
    let aedNearbyReady=false, aedNearbyCandidateIds=[], aedExistingSpotId=null;
    let uploadedImageFile={}, aedPhotoMeta={};` +
    html.slice(html.indexOf('    async function loadNearbyAedCandidates()'),html.indexOf('    function captureAedGps()')) +
    html.slice(html.indexOf('    async function handleAedSubmission('),html.indexOf('    function checkWithAI(')),context);
  return {context, requests, alerts, elements};
}
test('submission waits for nearby lookup, even before an error exists', async () => {
  const {context,alerts}=setup();
  await vm.runInContext("handleAedSubmission({}, '施設名', '入口付近')",context);
  assert.equal(alerts.length,1);
  assert.match(alerts[0], /周辺AEDの確認が完了していません/);
});
test('old lookup cannot overwrite new GPS candidates', async () => {
  const {context, requests}=setup();
  const old=vm.runInContext('loadNearbyAedCandidates()',context);
  const current=vm.runInContext('aedGps={latitude:36,longitude:140,accuracy:10}; loadNearbyAedCandidates()',context);
  requests[1]({data:[],error:null}); await current;
  requests[0]({data:[{id:999}],error:null}); await old;
  assert.equal(vm.runInContext('aedNearbyReady',context),true);
  assert.equal(vm.runInContext('aedNearbyCandidateIds.length',context),0);
});
test('failed refresh clears previous candidate and blocks submission', async () => {
  const {context,requests}=setup();
  vm.runInContext('aedNearbyReady=true; aedNearbyCandidateIds=[123]; aedExistingSpotId=123;',context);
  const pending=vm.runInContext('loadNearbyAedCandidates()',context);
  requests[0]({data:null,error:{message:'offline'}}); await pending;
  assert.equal(vm.runInContext('aedNearbyReady',context),false);
  assert.equal(vm.runInContext('aedExistingSpotId',context),null);
  assert.equal(vm.runInContext('aedNearbyCandidateIds.length',context),0);
});
