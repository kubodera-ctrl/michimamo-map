const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../camera-capture.js'),'utf8');
function setup() {
    const blobs=[],downloads=[],canvases=[],handlers={};
    function element(tag='div') {
        const el={tag,style:{},listeners:{},attrs:{},width:1,height:1,scrollTop:0,disabled:false,checked:false,open:false,
            setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this.listeners[k]=v;},focus(){},append(){},remove(){},
            setPointerCapture(){},getBoundingClientRect(){return {left:10,top:20,width:320,height:180};},
            showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();},
            click(){downloads.push(this.download);}};
        if(tag==='canvas') {
            el.ops=[];
            el.getContext=()=>({drawImage(...a){if(el.fail)throw Error('draw failed');el.ops.push(['draw',...a]);},clearRect(){el.ops=[];},fillRect(...a){el.ops.push(['fill',...a]);},strokeRect(){}});
            el.toBlob=(callback,type)=>blobs.push({callback,type,canvas:el});canvases.push(el);
        }
        return el;
    }
    const ids=['cameraPhotoDialog','cameraPhotoCanvas','cameraPhotoChecked','cameraPhotoSave','cameraShutter','cameraPhotoStatus','cameraPhotoUndo','cameraPhotoTime','cameraPhotoSelect','cameraPhotoAll','cameraPhotoMosaic','cameraPhotoSolid','videoElement'];
    const els=Object.fromEntries(ids.map(id=>[id,element(id==='cameraPhotoCanvas'?'canvas':'div')]));
    const close=element('button'),body=element();
    els.cameraPhotoDialog.querySelector=s=>s==='.photo-close'?close:body;
    Object.assign(els.videoElement,{readyState:2,videoWidth:1920,videoHeight:1080,srcObject:{}});
    const document={body:{insertAdjacentHTML(){},append(){}},documentElement:{},hidden:false,getElementById:id=>els[id],createElement:element};
    const window={innerWidth:390,innerHeight:700,addEventListener:(n,f)=>handlers[n]=f};
    const context={window,document,getComputedStyle:()=>({zoom:'1'}),MutationObserver:class{observe(){}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},setTimeout(){}};
    vm.runInNewContext(source,context);
    return {api:window.MachimamoCameraCapture,math:window.MachimamoCameraPrivacy,els,document,blobs,downloads,canvases,close};
}
const s=setup(), e=s.els;
assert.equal(s.api.capture(),false,'cannot capture before stream is ready');
s.api.setReady(true);assert.equal(s.api.capture(),true);assert.equal(e.cameraPhotoCanvas.width,1600);assert.equal(e.cameraPhotoCanvas.height,900);
assert.equal(s.api.capture(),false,'double tap cannot replace the open capture');
assert.equal(e.cameraPhotoSave.disabled,true,'review required before saving');
assert.ok(s.canvases.some(c=>c.ops.some(op=>op[0]==='draw'&&op[1]===e.cameraPhotoCanvas)),'mosaic samples protected canvas rather than restoring original pixels');
e.cameraPhotoChecked.checked=true;e.cameraPhotoChecked.onchange();assert.equal(e.cameraPhotoSave.disabled,false);
e.cameraPhotoSave.onclick();assert.equal(s.blobs.length,1);assert.equal(s.blobs[0].type,'image/jpeg');
e.cameraPhotoAll.onclick();assert.equal(e.cameraPhotoChecked.checked,false);
s.blobs[0].callback({});assert.equal(s.downloads.length,0,'editing invalidates in-flight export');
e.cameraPhotoChecked.checked=true;e.cameraPhotoChecked.onchange();e.cameraPhotoSave.onclick();s.blobs[1].callback({});
assert.equal(s.downloads.length,1);assert.match(s.downloads[0],/^machimamo-masked-/);
e.cameraPhotoSelect.onclick();e.cameraPhotoSolid.onclick();
e.cameraPhotoCanvas.onpointerdown({pointerId:1,button:0,clientX:170,clientY:110});
e.cameraPhotoCanvas.onpointerup({pointerId:1,clientX:330,clientY:200});
assert.ok(e.cameraPhotoCanvas.ops.some(op=>op[0]==='fill'),'manual solid mask is drawn');
assert.equal(e.cameraPhotoChecked.checked,false);
e.cameraPhotoChecked.checked=true;e.cameraPhotoChecked.onchange();e.cameraPhotoSave.onclick();
s.api.reset();s.blobs[2].callback({});assert.equal(s.downloads.length,1,'no image export after closing or backgrounding');
assert.equal(e.cameraPhotoCanvas.width,1);assert.equal(e.cameraPhotoDialog.open,false);assert.equal(e.cameraShutter.disabled,true);
s.api.setReady(true);s.document.hidden=true;assert.equal(s.api.capture(),false);s.document.hidden=false;
e.videoElement.readyState=1;assert.equal(s.api.capture(),false);
const p=s.math.normalizedPoint(999,-20,{left:10,top:20,width:320,height:180});assert.equal(p.x,1);assert.equal(p.y,0);
assert.throws(()=>s.math.pixelBounds({x:.9,y:0,width:.3,height:1},100,100));
assert.throws(()=>s.math.normalizedPoint(0,0,{left:0,top:0,width:0,height:1}));
const b=s.math.pixelBounds({x:.1,y:.2,width:.3,height:.4},100,100);assert.equal(b.x,10);assert.equal(b.y,20);assert.ok(b.width>=30);assert.ok(b.height>=40);
const broken=setup();broken.api.setReady(true);broken.els.cameraPhotoCanvas.fail=true;broken.api.capture();
assert.equal(broken.els.cameraPhotoSave.disabled,true,'draw failure must not enable source image export');
broken.els.cameraPhotoChecked.checked=true;broken.els.cameraPhotoChecked.onchange();assert.equal(broken.els.cameraPhotoSave.disabled,true);
broken.els.cameraPhotoAll.onclick();broken.els.cameraPhotoSave.onclick();assert.equal(broken.blobs.length,0);
console.log('PASS: capture readiness/double tap, resizing, review gate, protected overlap source, manual solid mask, stale export denial, close cleanup, background guard, draw failure. Browser rendering/touch/download require real-device verification.');
