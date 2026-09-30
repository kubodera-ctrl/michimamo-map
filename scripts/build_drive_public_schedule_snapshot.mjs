import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPublicSchedulePreview} from './drive_public_schedule_pipeline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const sourcePath=path.join(root,'data/drive/tokyo-public-enforcement-2026-09.json');
const outPath=path.join(root,'drive-beta/data/tokyo-public-enforcement-2026-09-preview-v1.json');

const bundle=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const snapshot=buildPublicSchedulePreview(bundle);
const content=JSON.stringify(snapshot,null,2)+'\n';

if(process.argv.includes('--check')){
  if(!fs.existsSync(outPath))throw new Error('public_schedule_snapshot_missing');
  const current=JSON.parse(fs.readFileSync(outPath,'utf8'));
  if(JSON.stringify(current)!==JSON.stringify(snapshot)){
    console.error('DRIVE public schedule preview snapshot is stale');
    process.exit(1);
  }
  console.log('PASS: DRIVE public schedule preview snapshot current');
}else{
  fs.mkdirSync(path.dirname(outPath),{recursive:true});
  fs.writeFileSync(outPath,content);
  console.log('WROTE '+path.relative(root,outPath));
}
