import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]||'.');
const skipDirs=new Set(['.git','node_modules','.next','.open-next','dist','build','coverage','.vercel']);
const textExt=new Set([
  '.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.jsonc','.md','.txt','.yml','.yaml',
  '.toml','.sql','.html','.css','.scss','.env','.example','.sh','.py','.xml','.csv'
]);
const alwaysNames=new Set(['Dockerfile','Makefile','Procfile','wrangler.toml','.env','.env.example']);
const patterns=[
  {key:'legacy_account_subdomain',re:/kubodera\.workers\.dev/gi},
  {key:'machiibe_preview_legacy',re:/machiibe-preview\.kubodera\.workers\.dev/gi},
  {key:'workers_dev_any',re:/[A-Za-z0-9.-]+\.workers\.dev/gi},
  {key:'cors_callback_webhook_access_search',re:/(cors|allowed[_-]?origin|callback|webhook|redirect[_-]?uri|cloudflare\s+access|search\s+console)/gi}
];

function files(dir,out=[]){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(skipDirs.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) files(full,out);
    else {
      const ext=path.extname(ent.name).toLowerCase();
      if(textExt.has(ext)||alwaysNames.has(ent.name)||ent.name.startsWith('.env')) out.push(full);
    }
  }
  return out;
}
const findings=[];
for(const file of files(root)){
  let body;
  try{body=fs.readFileSync(file,'utf8');}catch{continue;}
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const lines=body.split(/\r?\n/);
  lines.forEach((line,index)=>{
    const keys=[];
    for(const p of patterns){
      p.re.lastIndex=0;
      if(p.re.test(line)) keys.push(p.key);
    }
    if(keys.length){
      findings.push({path:rel,line:index+1,keys,text:line.trim().slice(0,500)});
    }
  });
}
const legacy=findings.filter(x=>x.keys.includes('legacy_account_subdomain'));
const workers=findings.filter(x=>x.keys.includes('workers_dev_any'));
const related=findings.filter(x=>x.keys.includes('cors_callback_webhook_access_search'));
const expectedLegacy=new Set([
  'cloudflare/machiibe-pipeline/src/index.ts:95',
  'event-site/wrangler.jsonc:17'
]);
const actualLegacy=new Set(legacy.map((item)=>item.path+':'+item.line));
const unexpected=[...actualLegacy].filter((item)=>!expectedLegacy.has(item));
const missing=[...expectedLegacy].filter((item)=>!actualLegacy.has(item));

const report={
  scannedRoot:path.relative(process.cwd(),root)||'.',
  scannedFiles:files(root).length,
  legacyCount:legacy.length,
  workersDevCount:workers.length,
  relatedCount:related.length,
  legacy,
  workers,
  related
};
console.log('=== workers.dev repository audit ===');
console.log(JSON.stringify(report,null,2));
console.log('WORKERS_DEV_AUDIT_JSON='+JSON.stringify(report));
if(unexpected.length||missing.length){
  console.error('workers.dev migration guard failed',JSON.stringify({unexpected,missing}));
  process.exitCode=1;
}
