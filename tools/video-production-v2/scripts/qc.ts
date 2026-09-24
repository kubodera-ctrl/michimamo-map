import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {machimamoVideoSchema} from '../src/types';
import {evaluateRights} from '../src/rights';

const video=process.argv[2];
const input=process.argv[3]??'samples/typhoon25.json';
if(!video) throw new Error('usage: tsx scripts/qc.ts <video.mp4> [input.json]');

const props=machimamoVideoSchema.parse(JSON.parse(await readFile(input,'utf8')));
const ff=JSON.parse(execFileSync('ffprobe',[
  '-v','error',
  '-select_streams','v:0',
  '-show_entries','stream=width,height,r_frame_rate,codec_name',
  '-show_entries','format=duration',
  '-of','json',
  video
],{encoding:'utf8'}));

const stream=ff.streams?.[0];
const duration=Number(ff.format?.duration??0);
const rights=evaluateRights(props);
const checks={
  width1080:stream?.width===1080,
  height1920:stream?.height===1920,
  fps30:stream?.r_frame_rate==='30/1',
  h264:stream?.codec_name==='h264',
  duration:Math.abs(duration-props.durationSeconds)<=0.35,
  rightsRenderAllowed:rights.renderAllowed
};

const technicalPass=Object.values(checks).every(Boolean);
console.log(JSON.stringify({
  technicalPass,
  publishEligible:technicalPass&&rights.publishEligible,
  requiresHumanReview:rights.requiresHumanReview,
  checks,
  actual:{
    duration,
    width:stream?.width,
    height:stream?.height,
    fps:stream?.r_frame_rate,
    codec:stream?.codec_name
  },
  rights
},null,2));

if(!technicalPass) process.exit(2);
