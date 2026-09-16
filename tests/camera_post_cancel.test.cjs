const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');const source=html.slice(html.indexOf('    window.startCameraPostDraft ='),html.indexOf("    map.on('dblclick'",html.indexOf('    window.startCameraPostDraft =')));
test('GPS result after camera dialog cancel does not reopen map or retain photo',async()=>{
 let finish,touched=0,current=true;const ctx={window:{},navigator:{geolocation:{getCurrentPosition:r=>finish=r}},clearCameraPostDraft(){touched++;},URL:{createObjectURL(){touched++;}},stopAIPatrol(){touched++;},activateMapView(){touched++;}};
 vm.createContext(ctx);vm.runInContext(source,ctx);const wait=ctx.window.startCameraPostDraft({file:{}},()=>current);current=false;finish({coords:{latitude:35,longitude:139,accuracy:10}});assert.equal(await wait,false);assert.equal(touched,0);
});
