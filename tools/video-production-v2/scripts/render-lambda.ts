import {readFile} from 'node:fs/promises';
import {getRenderProgress,renderMediaOnLambda} from '@remotion/lambda/client';
import {machimamoVideoSchema} from '../src/types';
import {evaluateRights} from '../src/rights';

const inputPath=process.argv[2]??'samples/typhoon25.json';
const props=machimamoVideoSchema.parse(JSON.parse(await readFile(inputPath,'utf8')));
const rights=evaluateRights(props);
if(!rights.renderAllowed){
  throw new Error('Rights gate blocked render: '+rights.reasons.join('; '));
}

const region=process.env.REMOTION_AWS_REGION;
const functionName=process.env.REMOTION_FUNCTION_NAME;
const serveUrl=process.env.REMOTION_SERVE_URL;
if(!region||!functionName||!serveUrl){
  throw new Error('REMOTION_AWS_REGION, REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL are required');
}

const composition=props.format==='long'?'MachimamoLongV2':'MachimamoShortV2';
const started=await renderMediaOnLambda({
  region:region as never,
  functionName,
  serveUrl,
  composition,
  inputProps:props,
  codec:'h264',
  privacy:'private',
  imageFormat:'jpeg',
  maxRetries:2
});

for(;;){
  const progress=await getRenderProgress({
    renderId:started.renderId,
    bucketName:started.bucketName,
    functionName,
    region:region as never
  });

  if(progress.fatalErrorEncountered){
    throw new Error(progress.errors?.[0]?.message??'Lambda render failed');
  }

  if(progress.done){
    console.log(JSON.stringify({
      renderId:started.renderId,
      bucketName:started.bucketName,
      outputFile:progress.outputFile,
      publishEligible:rights.publishEligible,
      requiresHumanReview:rights.requiresHumanReview,
      rightsReasons:rights.reasons
    },null,2));
    break;
  }

  await new Promise((resolve)=>setTimeout(resolve,2500));
}
