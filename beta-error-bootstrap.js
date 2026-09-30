(function(root){
'use strict';

const queue=[];
let phase='boot';
let reporter=null;

function token(value,fallback='unknown'){
  const text=String(value||'');
  return /^[a-z0-9][a-z0-9._:-]{0,63}$/i.test(text)?text:fallback;
}

function sourceGroup(filename){
  if(!filename)return 'unknown';
  try{
    const url=new URL(filename,location.href);
    if(url.origin===location.origin)return 'same_origin';
    if(/(^|\.)unpkg\.com$/.test(url.hostname))return 'unpkg';
    if(/(^|\.)jsdelivr\.net$/.test(url.hostname))return 'jsdelivr';
    if(/(^|\.)cloudflare\.com$/.test(url.hostname))return 'cloudflare_cdn';
    return 'external';
  }catch(_){return 'unknown';}
}

function normalize(event){
  return {
    kind:token(event?.kind),
    code:token(event?.code),
    detail:token(event?.detail,'none'),
    phase:token(event?.phase||phase,'none'),
    source:token(event?.source,'unknown'),
    line:Number.isInteger(event?.line)?Math.max(0,event.line):0,
    path:location.pathname||'/'
  };
}

function capture(event){
  const safe=normalize(event);
  if(reporter){
    try{reporter(safe);}catch(_){}
    return;
  }
  if(queue.length<30)queue.push(safe);
}

root.MachimamoBetaError={
  capture,
  setPhase(value){phase=token(value,'none');},
  clearPhase(value){if(!value||phase===value)phase='runtime';},
  attachReporter(fn){
    if(typeof fn!=='function')return;
    reporter=fn;
    while(queue.length){
      const item=queue.shift();
      try{reporter(item);}catch(_){}
    }
  }
};

root.addEventListener('error',event=>{
  capture({
    kind:'global_error',
    code:'window_error',
    source:sourceGroup(event.filename),
    line:Number(event.lineno)||0
  });
});

root.addEventListener('unhandledrejection',()=>{
  capture({
    kind:'unhandled_rejection',
    code:'promise_rejection',
    source:'promise'
  });
});
})(window);
