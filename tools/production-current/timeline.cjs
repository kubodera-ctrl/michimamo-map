'use strict';
// Drive VIDEO_PRODUCTION_MASTER_CURRENT.md / 2026-09-27.
// Planning only: no renderer, network request, approval or publishing side effects.
const TEMPLATE_VERSION = 'CURRENT_20260927';
function planTimeline(mode, newsCount) {
  if (!['SINGLE','WEEKLY'].includes(mode)) throw new TypeError('unsupported mode');
  if (!Number.isSafeInteger(newsCount) || newsCount < 1) throw new TypeError('newsCount must be a positive integer');
  if (mode === 'SINGLE' && newsCount !== 1) throw new TypeError('SINGLE requires one news item');
  const pageCount = mode === 'SINGLE' ? 1 : Math.ceil(newsCount / 3);
  if (pageCount > 1000) throw new RangeError('render admission limit exceeded');
  const pages = []; let startSec = 0;
  const add = (kind,durationSec,extra={}) => {
    pages.push({kind,startSec,endSec:startSec+durationSec,durationSec,...extra}); startSec+=durationSec;
  };
  add('TOP',3); add('MAP',7);
  for(let i=0;i<pageCount;i++) add('NEWS',12,{newsPage:i,newsOffset:mode==='SINGLE'?0:i*3,newsCount:mode==='SINGLE'?1:Math.min(3,newsCount-i*3),animationSec:10,holdSec:2});
  if(mode==='WEEKLY') add('SAFETY',7);
  add('MAP_INFO',8); add('LOGIC',8); add('END',5);
  return {templateVersion:TEMPLATE_VERSION,mode,newsCount,pageCount,durationSec:startSec,width:1080,height:1920,fps:30,pages};
}
module.exports={TEMPLATE_VERSION,planTimeline};
