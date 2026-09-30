#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const fixture=require(path.join(root,'data/drive_sources/tokyo_wangan_speed_guideline.json'));
const pipeline=require(path.join(root,'drive-pipeline/tokyo-wangan-pipeline.cjs'));
const outPath=path.join(root,'drive-beta/data/tokyo-wangan-snapshot.js');

function render(snapshot){
  const json=JSON.stringify(snapshot,null,2);
  return `(function(root,factory){
  const value=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=value;
  root.MachimamoDriveTokyoSnapshot=value;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  return deepFreeze(${json});

  function deepFreeze(value){
    if(value&&typeof value==='object'){
      Object.freeze(value);
      for(const item of Object.values(value))deepFreeze(item);
    }
    return value;
  }
});
`;
}

const normalized=pipeline.normalizeSource(fixture);
const snapshot=pipeline.publicSnapshot(normalized,{mode:'preview'});
if(!snapshot.gate.publishable)throw new Error('preview_snapshot_not_publishable');
const content=render(snapshot);
if(process.argv.includes('--check')){
  const current=fs.readFileSync(outPath,'utf8');
  if(current!==content){
    console.error('Tokyo Wangan preview snapshot is stale. Run node scripts/drive/build_tokyo_wangan_snapshot.cjs');
    process.exit(1);
  }
  console.log('PASS: Tokyo Wangan preview snapshot is current');
}else{
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,content);
  console.log('WROTE '+path.relative(root,outPath));
}
