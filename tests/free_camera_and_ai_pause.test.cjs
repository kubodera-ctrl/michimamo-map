const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const html = read('index.html');
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) if (match[1].trim()) new vm.Script(match[1]);
const camera = html.slice(html.indexOf('    let mediaStream = null;'), html.indexOf('    let accidentCircles = [];'));
function setup() {
    const pending = [], handlers = {}, alerts = [];
    const active = new Set();
    const modeButton = () => ({attrs:{},setAttribute(k,v){this.attrs[k]=v;}});
    const elements = { cameraView: { classList: { add: x => active.add(x), remove: x => active.delete(x), contains: x => active.has(x) } }, videoElement: { srcObject: null, pause() {}, async play() {} }, cameraStatus: {}, cameraModeWalk:modeButton(), cameraModeDrive:modeButton() };
    const document = { hidden: false, getElementById: id => elements[id], addEventListener: (name, fn) => handlers[name] = fn };
    const storage=new Map();
    const context = { document, localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}, window: { addEventListener: (name, fn) => handlers[name] = fn }, navigator: { mediaDevices: { getUserMedia: options => { assert.equal(options.audio, false); return new Promise((resolve, reject) => pending.push({resolve, reject})); } } }, showToast: text => alerts.push(text) };
    vm.createContext(context); vm.runInContext(camera, context);
    return { context, pending, handlers, document, elements, alerts, active };
}
function stream() { const track = { stopped: false, stop() { this.stopped = true; } }; return { track, getTracks: () => [track] }; }
(async () => {
    const s = setup();
    const first = s.context.startAIPatrol();
    await s.context.startAIPatrol(); assert.equal(s.pending.length, 1, 'double start does not open two cameras');
    s.context.stopAIPatrol();
    const second = s.context.startAIPatrol();
    const old = stream(); s.pending[0].resolve(old); await first;
    assert.equal(old.track.stopped, true, 'late permission after closing releases camera');
    const current = stream(); s.pending[1].resolve(current); await second;
    assert.equal(s.elements.videoElement.srcObject, current);
    s.context.setCameraMode('drive');
    assert.equal(s.elements.cameraModeDrive.attrs['aria-pressed'],'true');
    assert.match(s.elements.cameraStatus.textContent,/自動候補記録.*テスト開始/);
    s.document.hidden = true; s.handlers.visibilitychange();
    assert.equal(current.track.stopped, true); assert.equal(s.elements.videoElement.srcObject, null); assert.equal(s.active.size, 0);
    s.document.hidden = false;
    const third = s.context.startAIPatrol(); s.handlers.pagehide();
    const late = stream(); s.pending[2].resolve(late); await third; assert.equal(late.track.stopped, true);
    const fail = s.context.startAIPatrol(); s.pending[3].reject({name:'NotAllowedError'}); await fail;
    assert.equal(s.active.size, 0); assert.match(s.alerts.at(-1), /許可されていません/);
    assert.ok(!html.includes('mockDetectionBox')); assert.ok(!html.includes('路上駐車を自動スキャン中'));
    assert.ok(html.includes('if (b.dataset.view !== "mapView") stopAIPatrol(false)'));

    // Run the real handler with stubbed auth: configured paid credentials must still never be used.
    let code = read('supabase/functions/aed-image-check/index.ts').replace(/^import .*;\n/gm, '');
    code = require('node:module').stripTypeScriptTypes(code);
    let handler, clients = 0, paidCalls = 0;
    const env = { SUPABASE_URL:'https://example.invalid', SUPABASE_ANON_KEY:'test', AED_AI_ENABLED:'true', OPENAI_API_KEY:'test-paid-key' };
    vm.runInNewContext(code, { Request, Response, model:'test', analyzeImage: () => { paidCalls++; throw new Error('must never be called'); },
        createClient: () => { clients++; return { auth: { getUser: async () => ({data:{user:{id:'admin'}}}) }, rpc: async () => ({data:[]}) }; },
        Deno: { env: {get: name => env[name]}, serve: fn => handler = fn } });
    for (const action of ['status', 'analyze']) {
        const response = await handler(new Request('https://example.invalid', {method:'POST', headers:{Authorization:'Bearer test'}, body:JSON.stringify({action,password:'test'})}));
        const body = await response.json();
        if (action === 'status') { assert.equal(body.paused, true); assert.equal(body.enabled, false); }
        else { assert.equal(response.status, 503); assert.equal(body.error, 'ai_paused'); }
    }
    assert.equal(paidCalls, 0); assert.equal(clients, 2, 'only caller client: no service client, reservation or image access');
    const unauth = await handler(new Request('https://example.invalid', {method:'POST'})); assert.equal(unauth.status, 401);
    console.log('PASS: inline syntax, camera lifecycle/races/denied permission, paid API blocked despite enabled settings, auth retained. No live paid request.');
})().catch(error => { console.error(error); process.exitCode = 1; });
