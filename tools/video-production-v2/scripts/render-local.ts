import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia,selectComposition} from '@remotion/renderer';
import {machimamoVideoSchema} from '../src/types';
import {evaluateRights} from '../src/rights';

const format=process.argv[2]==='long'?'long':'short';
const inputPath=process.argv[3]??path.join('samples','typhoon25.json');
const outputPath=process.argv[4]??path.join('out','machimamo-'+format+'-v2.mp4');

const raw=JSON.parse(await readFile(inputPath,'utf8'));
const props=machimamoVideoSchema.parse({...raw,format});
const rights=evaluateRights(props);
if(!rights.renderAllowed){
  throw new Error('Rights gate blocked render: '+rights.reasons.join('; '));
}

await mkdir(path.dirname(outputPath),{recursive:true});
const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts')});
const composition=await selectComposition({
  serveUrl,
  id:format==='long'?'MachimamoLongV2':'MachimamoShortV2',
  inputProps:props
});

await renderMedia({
  composition,
  serveUrl,
  codec:'h264',
  pixelFormat:'yuv420p',
  outputLocation:outputPath,
  inputProps:props,
  audioCodec:'aac'
});

console.log(JSON.stringify({outputPath,rights},null,2));
