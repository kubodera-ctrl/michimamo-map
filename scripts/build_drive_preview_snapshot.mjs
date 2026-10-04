import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPublicPreviewSnapshot} from './drive_enforcement_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const sourcePath=path.join(root,'data/drive/tokyo-wangan-source-v1.json');
const outPath=path.join(root,'drive-beta/data/tokyo-wangan-preview-v1.json');

const bundle=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const snapshot=buildPublicPreviewSnapshot(bundle);
const content=JSON.stringify(snapshot,null,2)+'\n';

if(process.argv.includes('--check')){
  if(!fs.existsSync(outPath))throw new Error('preview_snapshot_missing');
  const current=JSON.parse(fs.readFileSync(outPath,'utf8'));
  if(JSON.stringify(current)!==JSON.stringify(snapshot)){
    console.error('DRIVE preview snapshot is stale');
    process.exit(1);
  }
  console.log('PASS: DRIVE preview snapshot current');
}else{
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,content);
  console.log('WROTE '+path.relative(root,outPath));
}
