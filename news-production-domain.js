(function(root,factory){
'use strict';
var api=factory();
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.MachimamoNewsProductionDomain=api;
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
var SERVICE_ID='machimamo';
var MODES=Object.freeze(['SINGLE','WEEKLY']);
var WEEKLY_PRESETS=Object.freeze([6,9,12]);
var RENDERER_BLOCKER='RENDERER_BLOCKED_BY_EXACT_V7_SOURCE';
var PLATFORM_LABELS=Object.freeze({
  NOT_APPLICABLE:'対象外',CONNECTION_REQUIRED:'接続設定必要',NOT_STARTED:'未',
  PREVIEW_AVAILABLE:'Preview可能',PREPARING:'投稿準備中',PROCESSING:'投稿処理中',
  POSTED:'済',FAILED:'失敗'
});
var STATES=Object.freeze({
  production:Object.freeze(['NOT_CONNECTED','DRAFT','FROZEN']),
  render:Object.freeze([RENDERER_BLOCKER,'NOT_STARTED','PROCESSING','SUCCEEDED','FAILED']),
  qc:Object.freeze(['NOT_CONNECTED','PENDING','PASSED','FAILED']),
  approval:Object.freeze(['NOT_CONNECTED','PENDING','APPROVED','REJECTED']),
  publishingPreview:Object.freeze(['NOT_CONNECTED','READY_READ_ONLY','READY']),
  platform:Object.freeze(Object.keys(PLATFORM_LABELS))
});
function nonEmpty(v){return typeof v==='string'&&v.trim().length>0;}
function sha(v){return typeof v==='string'&&/^[0-9a-f]{64}$/i.test(v);}
function uniq(a){return Array.from(new Set((a||[]).filter(Boolean)));}
function weeklyDurationSec(n){
  if(!Number.isSafeInteger(n)||n<1)throw new TypeError('newsCount must be a positive integer');
  return 38+12*Math.ceil(n/3);
}
function platformsForMode(mode){
  if(mode==='SINGLE')return Object.freeze(['X','TIKTOK']);
  if(mode==='WEEKLY')return Object.freeze(['TIKTOK']);
  throw new TypeError('mode must be SINGLE or WEEKLY');
}
function plannedDurationSec(mode,count){
  if(mode==='SINGLE')return 43;
  if(mode==='WEEKLY')return weeklyDurationSec(count||1);
  throw new TypeError('mode must be SINGLE or WEEKLY');
}
function candidateBlockers(c){
  if(!c||typeof c!=='object'||Array.isArray(c))return ['candidate is required'];
  var b=[];
  if(c.service!==SERVICE_ID)b.push('service must be machimamo');
  if(c.informationKind==='LEGACY_UNVERIFIED'||c.legacy===true)b.push('LEGACY_UNVERIFIED cannot enter Production Preview');
  if(c.publishEligible!==true&&c.productionEligible!==true)b.push('candidate publishEligible must be true');
  if(!nonEmpty(c.candidateId))b.push('candidateId is required');
  if(c.informationKind==='POLICE_OFFICIAL'&&!nonEmpty(c.sourceEventId))b.push('sourceEventId is required for POLICE_OFFICIAL');
  if(!sha((c.source&&c.source.sourceHash)||c.sourceHash||''))b.push('sourceHash must be SHA-256');
  if(!Array.isArray(c.verifiedFacts)||!c.verifiedFacts.length)b.push('verifiedFacts are required');
  if(c.sourceStatus!=='verified')b.push('sourceStatus must be verified');
  if(c.factsStatus!=='verified')b.push('factsStatus must be verified');
  if(c.rightsStatus!=='cleared')b.push('rightsStatus must be cleared');
  if(c.correctionStatus!=='current')b.push('correctionStatus must be current');
  if(!c.rights||c.rights.commercialUseAllowed!==true)b.push('commercialUseAllowed must be true');
  if(c.rightsScopeConfirmed===false)b.push('rightsScopeConfirmed must be true');
  if(c.selection&&c.selection.include===false)b.push(c.selection.reason||'selection excluded candidate');
  if(c.selection&&c.selection.retention&&c.selection.retention.active===false)b.push('active retention is required');
  return uniq(b);
}
function projectCandidate(c){
  c=c||{};var s=c.source||{},r=c.rights||{},sel=c.selection||{};
  return Object.freeze({
    candidateId:c.candidateId||null,informationKind:c.informationKind||null,sourceEventId:c.sourceEventId||null,
    headline:c.headline||c.title||null,prefecture:c.prefecture||null,municipality:c.municipality||null,
    newsDate:c.newsDate||null,category:c.category||null,
    sourceStatus:c.sourceStatus||'needs_review',factsStatus:c.factsStatus||'needs_review',
    rightsStatus:c.rightsStatus||'needs_review',correctionStatus:c.correctionStatus||'unknown',
    source:Object.freeze({name:s.name||null,url:s.url||null,publishedAt:s.publishedAt||null,sourceHash:s.sourceHash||c.sourceHash||null}),
    verifiedFacts:Object.freeze(Array.isArray(c.verifiedFacts)?c.verifiedFacts.slice():[]),
    rights:Object.freeze({rightsLevel:r.rightsLevel||null,commercialUseAllowed:r.commercialUseAllowed===true,
      attributionText:r.attributionText||null,rightsEvidenceUrl:r.rightsEvidenceUrl||null,
      rightsScopeConfirmed:c.rightsScopeConfirmed===true}),
    selection:Object.freeze({include:sel.include===true,priority:sel.priority||null,topic:sel.topic||null,reason:sel.reason||null}),
    retention:Object.freeze(sel.retention?Object.assign({},sel.retention):{}),
    publishEligible:c.publishEligible===true||c.productionEligible===true,
    blockers:Object.freeze(candidateBlockers(c))
  });
}
function buildProductionPreview(c,opt){
  opt=opt||{};var mode=opt.mode||'SINGLE';
  if(MODES.indexOf(mode)<0)throw new TypeError('mode must be SINGLE or WEEKLY');
  var p=projectCandidate(c),b=p.blockers.slice();
  return Object.freeze({
    schemaVersion:'machimamo-news-production-preview-v2',service:SERVICE_ID,mode:mode,readOnly:true,connected:false,
    productionRecordCreated:false,revisionId:null,revisionStatus:'NOT_CREATED_READ_ONLY',renderId:null,
    status:b.length?'BLOCKED':'READY_FOR_PRODUCTION_PREVIEW',candidate:p,
    plannedDurationSec:plannedDurationSec(mode,1),plannedPlatforms:platformsForMode(mode),
    blockers:Object.freeze(b),externalRequestSent:false,
    downstream:Object.freeze({productionRecord:'NOT_CONNECTED',render:RENDERER_BLOCKER,qc:'NOT_CONNECTED',
      approval:'NOT_CONNECTED',publishingPreview:'READY_READ_ONLY',externalPublishing:'CONNECTION_REQUIRED'})
  });
}
function weight(p){return p==='critical'?4:p==='high'?3:p==='medium'?2:p==='low'?1:0;}
function recommendWeekly(eligible,n){
  return (eligible||[]).filter(function(c){return candidateBlockers(c).length===0;}).slice().sort(function(a,b){
    var x=weight(b.selection&&b.selection.priority)-weight(a.selection&&a.selection.priority);
    if(x)return x;
    x=String(b.newsDate||'').localeCompare(String(a.newsDate||''));if(x)return x;
    return String(a.candidateId||'').localeCompare(String(b.candidateId||''));
  }).slice(0,n);
}
function buildWeeklySet(summary,opt){
  opt=opt||{};var n=Number(opt.requestedCount||6);
  if(WEEKLY_PRESETS.indexOf(n)<0)throw new TypeError('requestedCount must be 6, 9 or 12');
  var all=Array.isArray(summary&&summary.candidates)?summary.candidates:[];
  var eligible=(Array.isArray(summary&&summary.eligible)?summary.eligible:[]).filter(function(c){return candidateBlockers(c).length===0;});
  var rec=recommendWeekly(eligible,n),ids=Array.isArray(opt.selectedCandidateIds)?uniq(opt.selectedCandidateIds):rec.map(function(x){return x.candidateId;});
  var map=new Map(eligible.map(function(x){return [x.candidateId,x];}));
  var selected=ids.map(function(id){return map.get(id);}).filter(Boolean).slice(0,n);
  var shortage=Math.max(0,n-eligible.length);
  var ready=shortage===0&&selected.length===n;
  return Object.freeze({
    service:SERVICE_ID,mode:'WEEKLY',weekValue:opt.weekValue||null,weekStart:(summary&&summary.start)||null,
    weekEnd:(summary&&summary.end)||null,prefecture:opt.prefecture||null,requestedCount:n,
    actualCandidateCount:all.length,productionEligibleCount:eligible.length,shortage:shortage,
    selectionReady:ready,durationSec:weeklyDurationSec(n),
    candidates:Object.freeze(all.slice()),eligibleCandidateIds:Object.freeze(eligible.map(function(x){return x.candidateId;})),
    recommendedCandidateIds:Object.freeze(rec.map(function(x){return x.candidateId;})),
    selectedCandidateIds:Object.freeze(selected.map(function(x){return x.candidateId;})),
    selectedCandidates:Object.freeze(selected.map(projectCandidate)),
    message:shortage?'確認済みニュースが不足しています':(ready?'Production Previewへ進める選択です':'管理者の最終選択を確認してください')
  });
}
function buildWeeklyProductionPreview(summary,opt){
  var set=buildWeeklySet(summary,opt),b=[];
  if(set.shortage)b.push('確認済みニュースが'+set.shortage+'件不足しています');
  if(!set.selectionReady)b.push('選択件数が要求件数に達していません');
  set.selectedCandidates.forEach(function(c){(c.blockers||[]).forEach(function(x){b.push(c.candidateId+': '+x);});});
  b=uniq(b);
  return Object.freeze({
    schemaVersion:'machimamo-news-production-preview-v2',service:SERVICE_ID,mode:'WEEKLY',readOnly:true,connected:false,
    productionRecordCreated:false,revisionId:null,revisionStatus:'NOT_CREATED_READ_ONLY',renderId:null,
    status:b.length?'BLOCKED':'READY_FOR_PRODUCTION_PREVIEW',weeklySet:set,
    plannedDurationSec:set.durationSec,plannedPlatforms:platformsForMode('WEEKLY'),blockers:Object.freeze(b),
    externalRequestSent:false,downstream:Object.freeze({productionRecord:'NOT_CONNECTED',render:RENDERER_BLOCKER,
      qc:'NOT_CONNECTED',approval:'NOT_CONNECTED',publishingPreview:'READY_READ_ONLY',externalPublishing:'CONNECTION_REQUIRED'})
  });
}
function defaultWorkflow(mode){
  mode=mode||'SINGLE';platformsForMode(mode);
  return Object.freeze({service:SERVICE_ID,mode:mode,candidate:'READY',production:'NOT_CONNECTED',render:RENDERER_BLOCKER,
    qc:'NOT_CONNECTED',approval:'NOT_CONNECTED',publishingPreview:'READY_READ_ONLY',
    platforms:Object.freeze({X:mode==='WEEKLY'?'NOT_APPLICABLE':'PREVIEW_AVAILABLE',TIKTOK:'PREVIEW_AVAILABLE'}),
    revisionId:null,renderId:null,externalRequestSent:false});
}
function validateWorkflowState(x){
  var e=[];if(!x||typeof x!=='object')return {valid:false,errors:['workflow state must be an object']};
  var mode=x.mode||'SINGLE';if(MODES.indexOf(mode)<0)e.push('mode must be SINGLE or WEEKLY');
  if(x.service!==SERVICE_ID)e.push('service must be machimamo');
  ['production','render','qc','approval','publishingPreview'].forEach(function(k){if(STATES[k].indexOf(x[k])<0)e.push(k+' state is invalid');});
  var ps=x.platforms||{},req=mode==='WEEKLY'?['TIKTOK']:['X','TIKTOK'];
  req.forEach(function(k){if(STATES.platform.indexOf(ps[k])<0)e.push(k+' platform state is invalid');});
  if(mode==='WEEKLY'&&ps.X!=null&&ps.X!=='NOT_APPLICABLE')e.push('WEEKLY X platform must be NOT_APPLICABLE');
  if(x.render==='SUCCEEDED'&&x.production!=='FROZEN')e.push('render SUCCEEDED requires production FROZEN');
  if(x.qc==='PASSED'&&x.render!=='SUCCEEDED')e.push('QC PASSED requires render SUCCEEDED');
  if(x.approval==='APPROVED'&&x.qc!=='PASSED')e.push('approval APPROVED requires QC PASSED');
  if(x.publishingPreview==='READY'&&x.approval!=='APPROVED')e.push('publishing preview READY requires approval APPROVED');
  var posted=req.some(function(k){return ps[k]==='POSTED';});
  if(posted&&x.publishingPreview!=='READY')e.push('platform POSTED requires publishing preview READY');
  if(posted&&!x.revisionId)e.push('platform POSTED requires revisionId');
  if(posted&&!x.renderId)e.push('platform POSTED requires renderId');
  if(x.externalRequestSent===true&&x.approval!=='APPROVED')e.push('external request requires approval APPROVED');
  return {valid:e.length===0,errors:uniq(e)};
}
function hashtags(pref,mun,mode,c){
  var a=['#まちまも'];if(pref)a.push('#'+String(pref).replace(/\s+/g,''));if(mun)a.push('#'+String(mun).replace(/\s+/g,''));
  a.push(c&&c.category==='TRAFFIC_WRONG_WAY'?'#交通安全':'#防犯');if(mode==='WEEKLY')a.push('#週間まとめ');return Object.freeze(uniq(a));
}
function singlePublishingPreview(c){
  var p=projectCandidate(c),region=[p.prefecture,p.municipality].filter(Boolean).join(' '),attr=p.rights.attributionText||p.source.name||'出典要確認';
  var tags=hashtags(p.prefecture,p.municipality,'SINGLE',p),link='https://machimamo-map.vercel.app';
  return Object.freeze({service:SERVICE_ID,mode:'SINGLE',readOnly:true,externalRequestSent:false,revisionId:null,renderId:null,
    X:Object.freeze({status:'PREVIEW_AVAILABLE',text:'【'+(region||'地域情報')+'】'+(p.headline||'ニュース')+'\n'+attr+'\n'+link,
      hashtags:tags,sourceAttribution:attr,sourceUrl:p.source.url,link:link,plannedMedia:'SINGLE / 43秒 video（Renderer未生成）'}),
    TIKTOK:Object.freeze({status:'PREVIEW_AVAILABLE',caption:(region||'地域情報')+'｜'+(p.headline||'ニュース')+'\n'+attr,
      hashtags:tags,sourceAttribution:attr,sourceUrl:p.source.url,plannedMedia:'TikTok SHORT / SINGLE・43秒 video（Renderer未生成）'})});
}
function weeklyPublishingPreview(set){
  var tags=hashtags(set&&set.prefecture,null,'WEEKLY'),count=(set&&set.selectedCandidateIds&&set.selectedCandidateIds.length)||0;
  return Object.freeze({service:SERVICE_ID,mode:'WEEKLY',readOnly:true,externalRequestSent:false,revisionId:null,renderId:null,
    TIKTOK:Object.freeze({status:'PREVIEW_AVAILABLE',caption:(set.prefecture||'地域')+' '+(set.weekValue||'対象週')+'｜確認済みニュース '+count+'件まとめ',
      hashtags:tags,weekValue:set.weekValue||null,prefecture:set.prefecture||null,newsCount:count,
      plannedMedia:'TikTok LONG / WEEKLY・'+set.durationSec+'秒 video（Renderer未生成）'})});
}
function publishingActionState(platform,opt){
  opt=opt||{};var mode=opt.mode||'SINGLE',wf=opt.workflow||defaultWorkflow(mode);
  if(platformsForMode(mode).indexOf(platform)<0)return Object.freeze({enabled:false,reasons:Object.freeze(['このmodeでは投稿対象外です'])});
  var r=[];
  if(wf.render!=='SUCCEEDED')r.push(wf.render===RENDERER_BLOCKER?'動画Renderer待ち：exact v7 source未回収':'Renderer未完了');
  if(wf.qc!=='PASSED')r.push('QC未PASS');
  if(wf.approval!=='APPROVED')r.push('管理者未承認');
  if(opt.oauthConnected!==true)r.push('OAuth未接続');
  if(opt.apiConfigured!==true)r.push('API設定未完了');
  if(opt.publishingAdapterConnected!==true)r.push('Publishing Adapter未接続');
  if(opt.finalConfirmation!==true)r.push('最終本人確認待ち');
  return Object.freeze({enabled:r.length===0,reasons:Object.freeze(r)});
}
function overallStatus(x){
  x=x||{};if(x.mode==='WEEKLY')return x.TIKTOK==='POSTED'?'済':(x.TIKTOK==='FAILED'?'失敗':'未');
  var xd=x.X==='POSTED',td=x.TIKTOK==='POSTED';if(xd&&td)return '済';if(xd||td)return '一部済';if(x.X==='FAILED'||x.TIKTOK==='FAILED')return '失敗';return '未';
}
function singleIdempotencyKey(revisionId,renderId,platform){
  if(!nonEmpty(revisionId)||!nonEmpty(renderId)||['X','TIKTOK'].indexOf(platform)<0)throw new TypeError('revisionId, renderId and platform are required');
  return SERVICE_ID+':'+revisionId+':'+renderId+':'+platform;
}
function weeklyIdempotencyKey(weekValue,prefecture,revisionId,renderId,platform){
  if(!nonEmpty(weekValue)||!nonEmpty(prefecture)||!nonEmpty(revisionId)||!nonEmpty(renderId)||platform!=='TIKTOK')throw new TypeError('week, prefecture, revisionId, renderId and TIKTOK are required');
  return SERVICE_ID+':WEEKLY:'+weekValue+':'+prefecture+':'+revisionId+':'+renderId+':'+platform;
}
return Object.freeze({
  SERVICE_ID:SERVICE_ID,MODES:MODES,WEEKLY_PRESETS:WEEKLY_PRESETS,RENDERER_BLOCKER:RENDERER_BLOCKER,
  PLATFORM_LABELS:PLATFORM_LABELS,STATES:STATES,EXTERNAL_REQUEST_SENT:false,
  weeklyDurationSec:weeklyDurationSec,platformsForMode:platformsForMode,plannedDurationSec:plannedDurationSec,
  candidateBlockers:candidateBlockers,candidateProjection:projectCandidate,buildProductionPreview:buildProductionPreview,
  recommendWeeklyCandidates:recommendWeekly,buildWeeklySet:buildWeeklySet,buildWeeklyProductionPreview:buildWeeklyProductionPreview,
  defaultWorkflow:defaultWorkflow,validateWorkflowState:validateWorkflowState,
  singlePublishingPreview:singlePublishingPreview,weeklyPublishingPreview:weeklyPublishingPreview,
  publishingActionState:publishingActionState,overallStatus:overallStatus,
  singleIdempotencyKey:singleIdempotencyKey,weeklyIdempotencyKey:weeklyIdempotencyKey
});
});