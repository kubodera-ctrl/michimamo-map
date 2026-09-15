import { normalize } from '@geolonia/normalize-japanese-addresses';
import fs from 'node:fs';
const root=process.env.AED_GEOCODE_ROOT || 'data/aed_dev11';
const path=`${root}/geocode_results.ndjson`;
const input=JSON.parse(fs.readFileSync(`${root}/geocode_inputs.json`,'utf8'));
const completed=new Set(fs.existsSync(path)?fs.readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(line=>{const r=JSON.parse(line);return `${r.dataset}:${r.row}`}):[]);
const pending=input.filter(r=>!completed.has(`${r.dataset}:${r.row}`));let cursor=0;
async function worker(){while(cursor<pending.length){const r=pending[cursor++];let timer;try{
 const g=await Promise.race([normalize(r.address),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('geocode_timeout')),20000)})]);
 fs.appendFileSync(path,JSON.stringify({dataset:r.dataset,row:r.row,input:r.address,pref:g.pref,city:g.city,normalization_level:g.level,point:g.point})+'\n');
 }catch(e){fs.appendFileSync(path,JSON.stringify({dataset:r.dataset,row:r.row,input:r.address,error:String(e)})+'\n')}finally{clearTimeout(timer)}
 if(cursor%200===0)console.error(`${cursor}/${pending.length}`);
}}
await Promise.all(Array.from({length:8},worker));console.error('complete');
