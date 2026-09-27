(function(root){
'use strict';
var d=root.MachimamoNewsProductionDomain;
if(!d||typeof document==='undefined')return;
var MID='adminNewsProductionModal',BID='adminNewsProductionBody',TID='adminNewsProductionTitle';
var weeklyContext=null;
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ensure(){
  if(!document.getElementById('newsProductionAdminStyles')){
    var st=document.createElement('style');st.id='newsProductionAdminStyles';
    st.textContent=
      'body.news-production-open .ad-banner{display:none!important}'+
      '#'+MID+'{z-index:12100;padding-top:env(safe-area-inset-top)}'+
      '#'+MID+' .news-production-sheet{width:100%;max-width:820px;height:94vh;height:94dvh;max-height:calc(100dvh - env(safe-area-inset-top));margin:auto;padding:0 14px calc(28px + env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;touch-action:pan-y;background:#fff;border-radius:24px 24px 0 0}'+
      '#'+MID+' .news-production-header{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 0 11px;background:rgba(255,255,255,.98);border-bottom:1px solid #e2e8f0}'+
      '#'+MID+' .news-production-header h2{margin:0;font-size:1rem;color:#0f172a;overflow-wrap:anywhere}'+
      '#'+BID+'{min-width:0;padding:12px 0 8px}.news-prod-section{margin:12px 0;padding:12px;border:1px solid #dbe5ef;border-radius:12px;background:#f8fafc;min-width:0}'+
      '.news-prod-section h3{margin:0 0 8px;font-size:.85rem;color:#0f4c81}.news-prod-section h4{margin:10px 0 6px;font-size:.78rem;color:#334155}'+
      '.news-prod-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:8px}.news-prod-field{min-width:0;padding:7px 8px;border-radius:8px;background:#fff;border:1px solid #e2e8f0}'+
      '.news-prod-label{font-size:.61rem;font-weight:900;color:#64748b;margin-bottom:3px}.news-prod-value{font-size:.75rem;line-height:1.5;overflow-wrap:anywhere;word-break:break-word}'+
      '.news-prod-banner{padding:10px 11px;border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#1e3a8a;font-size:.73rem;font-weight:800;line-height:1.55}'+
      '.news-prod-banner.warn{border-color:#f59e0b;background:#fffbeb;color:#92400e}.news-prod-banner.blocked{border-color:#fca5a5;background:#fff1f2;color:#9f1239}'+
      '.news-prod-facts,.news-prod-reasons{margin:0;padding-left:1.1rem;font-size:.72rem;line-height:1.6}.news-prod-reasons{color:#991b1b}'+
      '.news-prod-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.news-prod-actions button{min-height:42px;padding:8px 12px;border-radius:9px;border:1px solid #94a3b8;background:#fff;font-weight:850}.news-prod-actions button.primary{background:#0f4c81;color:#fff;border-color:#0f4c81}.news-prod-actions button[disabled]{opacity:.52;cursor:not-allowed}'+
      '.news-prod-flow{display:grid;gap:6px}.news-prod-flow-row{display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;padding:8px;border:1px solid #dbe5ef;border-radius:9px;background:#fff;font-size:.7rem;line-height:1.45}.news-prod-flow-n{width:23px;height:23px;border-radius:50%;display:grid;place-items:center;background:#e2e8f0;font-weight:900}'+
      '.news-prod-platform{margin:10px 0;padding:11px;border:1px solid #cbd5e1;border-radius:11px;background:#fff}.news-prod-platform h4{margin:0 0 8px;font-size:.83rem}.news-prod-preview-text{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;padding:9px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:.73rem;line-height:1.55}'+
      '.news-prod-status{display:inline-flex;padding:4px 8px;border-radius:999px;background:#e0f2fe;color:#075985;font-size:.66rem;font-weight:900}.news-weekly-list{display:grid;gap:8px}.news-weekly-item{padding:9px;border:1px solid #dbe5ef;border-radius:9px;background:#fff;min-width:0}'+
      '.news-weekly-item label{display:grid;grid-template-columns:22px minmax(0,1fr);gap:7px;align-items:start}.news-weekly-item input{width:18px;min-height:18px;margin-top:2px}.news-weekly-meta{margin-top:5px;font-size:.66rem;line-height:1.5;color:#475569;overflow-wrap:anywhere}'+
      '.news-weekly-count-select{width:100%;min-height:42px;font-size:16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:7px}.news-prod-hint{font-size:.68rem;line-height:1.55;color:#64748b;margin-top:6px}.news-prod-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.67rem;word-break:break-all}';
    document.head.appendChild(st);
  }
  if(!document.getElementById(MID)){
    var m=document.createElement('div');m.className='modal';m.id=MID;m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.setAttribute('aria-labelledby',TID);
    m.innerHTML='<div class="sheet news-production-sheet"><div class="news-production-header"><h2 id="'+TID+'">ニュースProduction</h2><button class="close" type="button" data-news-prod-close aria-label="閉じる"><i class="fa-solid fa-xmark"></i></button></div><div id="'+BID+'" aria-live="polite"></div></div>';
    document.body.appendChild(m);
    m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-news-prod-close]'))close();onClick(e);});
    m.addEventListener('change',onChange);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&m.classList.contains('open'))close();});
  }
}
function openHtml(title,html){
  ensure();var m=document.getElementById(MID);document.getElementById(TID).textContent=title;document.getElementById(BID).innerHTML=html;
  m.classList.add('open');document.body.classList.add('news-production-open');var sh=m.querySelector('.news-production-sheet');if(sh)sh.scrollTop=0;
}
function close(){var m=document.getElementById(MID);if(m)m.classList.remove('open');document.body.classList.remove('news-production-open');}
function field(k,v,cls){return '<div class="news-prod-field"><div class="news-prod-label">'+esc(k)+'</div><div class="news-prod-value '+(cls||'')+'">'+esc(v==null||v===''?'—':v)+'</div></div>';}
function list(a,cls){return Array.isArray(a)&&a.length?'<ul class="'+(cls||'news-prod-facts')+'">'+a.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'<div class="news-prod-hint">—</div>';}
function flow(mode){
  var n=mode==='WEEKLY'?['Candidate Set','Production Preview','Render','QC','管理者承認','Publishing Preview','TikTok','投稿完了確認']:['Candidate','Production Preview','Render','QC','管理者承認','Publishing Preview','X / TikTok','投稿完了確認'];
  var s=['確認済み','read-only','動画Renderer待ち','前工程待ち','前工程待ち','read-only preview','接続設定必要','未'];
  return '<div class="news-prod-flow">'+n.map(function(x,i){return '<div class="news-prod-flow-row"><div class="news-prod-flow-n">'+(i+1)+'</div><div><strong>'+esc(x)+'</strong><div>'+esc(s[i])+'</div></div></div>';}).join('')+'</div>';
}
function renderer(){
  return '<div class="news-prod-banner blocked"><strong>動画Renderer待ち</strong><br>Renderはdisabledです。理由：exact v7 source未回収（'+esc(d.RENDERER_BLOCKER)+'）。推測Rendererは作りません。</div><div class="news-prod-actions"><button disabled aria-disabled="true">Render（disabled）</button></div>';
}
function blockerBox(p){
  return p.blockers&&p.blockers.length?'<div class="news-prod-banner blocked"><strong>Production Preview blocker</strong>'+list(p.blockers,'news-prod-reasons')+'</div>':'<div class="news-prod-banner"><strong>Production Preview read-only</strong><br>候補gateは通過していますが、Production record / revision / renderは作成しません。</div>';
}
function attachSingleActions(candidate){
  ensure();var body=document.getElementById('adminNewsDetailBody');if(!body||body.querySelector('[data-single-production-actions]'))return;
  var legacy=candidate&&candidate.informationKind==='LEGACY_UNVERIFIED',sec=document.createElement('div');sec.className='news-detail-section';sec.setAttribute('data-single-production-actions','1');
  sec.innerHTML='<h4>次の管理操作</h4><p class="news-detail-note">iPhone詳細QA PASS後のread-only導線です。この操作ではProduction recordを作成しません。</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"><button type="button" data-single-production-preview '+(legacy?'disabled aria-disabled="true"':'')+'>Production Preview</button><button type="button" data-single-publishing-preview '+(legacy?'disabled aria-disabled="true"':'')+'>Publishing Preview</button></div>'+(legacy?'<div class="news-detail-note" style="color:#991b1b;">LEGACY_UNVERIFIEDはProduction / Publishing対象外です。</div>':'');
  sec.querySelector('[data-single-production-preview]')&&sec.querySelector('[data-single-production-preview]').addEventListener('click',function(){openSingleProductionPreview(candidate);});
  sec.querySelector('[data-single-publishing-preview]')&&sec.querySelector('[data-single-publishing-preview]').addEventListener('click',function(){openSinglePublishingPreview(candidate);});
  body.appendChild(sec);
}
function openSingleProductionPreview(c){
  var p=d.buildProductionPreview(c,{mode:'SINGLE'}),x=p.candidate;
  var source=x.source||{},rights=x.rights||{},sel=x.selection||{},ret=x.retention||{};
  openHtml('SINGLE｜Production Preview',blockerBox(p)+
    '<div class="news-prod-section"><h3>使用candidate / revision</h3><div class="news-prod-grid">'+
    field('candidateId',x.candidateId,'news-prod-mono')+field('revision','未作成（read-only）')+field('revisionId','null')+field('renderId','null')+
    field('予定動画mode','TikTok SHORT / SINGLE')+field('予定尺','43秒')+field('予定SNS','X + TikTok')+field('externalRequestSent','false')+'</div></div>'+
    '<div class="news-prod-section"><h3>source / verifiedFacts</h3><div class="news-prod-grid">'+field('source',source.name)+field('source URL',source.url,'news-prod-mono')+field('sourceHash',source.sourceHash,'news-prod-mono')+'</div><h4>verifiedFacts</h4>'+list(x.verifiedFacts)+'</div>'+
    '<div class="news-prod-section"><h3>rights / attribution</h3><div class="news-prod-grid">'+field('rights',x.rightsStatus)+field('rights level',rights.rightsLevel)+field('commercialUseAllowed',String(rights.commercialUseAllowed))+field('attribution',rights.attributionText)+field('rightsScopeConfirmed',String(rights.rightsScopeConfirmed))+'</div></div>'+
    '<div class="news-prod-section"><h3>selection / retention</h3><div class="news-prod-grid">'+field('priority',sel.priority)+field('topic',sel.topic)+field('include',String(sel.include))+field('selection reason',sel.reason)+field('retention',ret.label||ret.state)+field('retention active',String(ret.active))+'</div></div>'+
    renderer()+'<div class="news-prod-section"><h3>管理フロー</h3>'+flow('SINGLE')+'</div><div class="news-prod-actions"><button class="primary" data-open-single-publishing>Publishing Preview</button></div>');
  root.__machimamoNewsProductionCandidate=c;
}
function actionCard(name,pub,mode){
  var platform=name==='X'?'X':'TIKTOK',wf=d.defaultWorkflow(mode),a=d.publishingActionState(platform,{mode:mode,workflow:wf,oauthConnected:false,apiConfigured:false,publishingAdapterConnected:false,finalConfirmation:false});
  var text=platform==='X'?(pub.text+'\n'+pub.hashtags.join(' ')):(pub.caption+'\n'+pub.hashtags.join(' '));
  return '<div class="news-prod-platform" id="newsProdPlatform'+platform+'"><h4>'+esc(name)+' Preview <span class="news-prod-status">Preview可能</span></h4><div class="news-prod-preview-text">'+esc(text)+'</div><div class="news-prod-grid" style="margin-top:8px;">'+field('source attribution',pub.sourceAttribution||'—')+field('source URL',pub.sourceUrl||'—','news-prod-mono')+field('予定media',pub.plannedMedia)+field('externalRequestSent','false')+'</div><div class="news-prod-actions"><button disabled aria-disabled="true">'+esc(name)+'へ投稿（disabled）</button></div><div class="news-prod-hint"><strong>disabled理由：</strong>'+esc(a.reasons.join(' / '))+'</div></div>';
}
function openSinglePublishingPreview(c){
  var pub=d.singlePublishingPreview(c),wf=d.defaultWorkflow('SINGLE');
  openHtml('SINGLE｜Publishing Preview','<div class="news-prod-banner warn"><strong>read-only Publishing Preview</strong><br>実SNS requestは送信しません。externalRequestSent=false。</div>'+
    '<div class="news-prod-section"><h3>投稿状態</h3><div class="news-prod-grid">'+field('全体',d.overallStatus({mode:'SINGLE',X:wf.platforms.X,TIKTOK:wf.platforms.TIKTOK}))+field('X',d.PLATFORM_LABELS[wf.platforms.X])+field('TikTok',d.PLATFORM_LABELS[wf.platforms.TIKTOK])+field('revisionId','null')+field('renderId','null')+'</div></div>'+
    actionCard('X',pub.X,'SINGLE')+actionCard('TikTok',pub.TIKTOK,'SINGLE')+
    '<div class="news-prod-section"><h3>管理フロー</h3>'+flow('SINGLE')+'</div>');
  root.__machimamoNewsProductionCandidate=c;
}
function weeklyItem(c,selected,eligible){
  var id=c.candidateId||'',can=eligible.has(id),checked=selected.has(id);
  return '<div class="news-weekly-item"><label><input type="checkbox" data-weekly-candidate-id="'+esc(id)+'" '+(checked?'checked ':'')+(can?'':'disabled ')+'><span><strong>'+esc(c.headline||c.title||'名称なし')+'</strong><div class="news-weekly-meta">candidateId: '+esc(id)+'<br>'+esc(c.municipality||'地域要確認')+' / '+esc(c.category||'category要確認')+' / priority='+esc(c.selection&&c.selection.priority||'—')+'<br>source='+esc(c.sourceStatus||'—')+' / facts='+esc(c.factsStatus||'—')+' / rights='+esc(c.rightsStatus||'—')+' / correction='+esc(c.correctionStatus||'—')+' / publishEligible='+esc(String(c.publishEligible===true||c.productionEligible===true))+'</div></span></label></div>';
}
function currentWeeklySet(){
  return d.buildWeeklySet(weeklyContext.summary,{weekValue:weeklyContext.weekValue,prefecture:weeklyContext.prefecture,requestedCount:weeklyContext.requestedCount,selectedCandidateIds:weeklyContext.selectedCandidateIds});
}
function renderWeeklyDetail(){
  if(!weeklyContext)return;var set=currentWeeklySet();weeklyContext.selectedCandidateIds=set.selectedCandidateIds.slice();
  var e=new Set(set.eligibleCandidateIds),s=new Set(set.selectedCandidateIds),opts=d.WEEKLY_PRESETS.map(function(n){return '<option value="'+n+'" '+(n===set.requestedCount?'selected ':'')+(set.productionEligibleCount<n?'disabled ':'')+'>'+n+'件'+(set.productionEligibleCount<n?'（不足'+(n-set.productionEligibleCount)+'件）':'')+'</option>';}).join('');
  openHtml('WEEKLY詳細｜TikTok LONG','<div class="news-prod-banner '+(set.shortage?'blocked':'')+'"><strong>'+esc(set.message)+'</strong><br>架空ニュースによる穴埋めは行いません。</div>'+
    '<div class="news-prod-section"><h3>WEEKLY候補セット</h3><div class="news-prod-grid">'+field('対象週',set.weekValue)+field('期間',(set.weekStart||'—')+' 〜 '+(set.weekEnd||'—'))+field('都道府県',set.prefecture)+field('選択件数',set.selectedCandidateIds.length+' / '+set.requestedCount)+field('実候補件数',set.actualCandidateCount)+field('Production利用可能件数',set.productionEligibleCount)+field('不足件数',set.shortage)+field('予定尺',set.durationSec+'秒')+'</div><h4>候補数 6 / 9 / 12</h4><select class="news-weekly-count-select" data-weekly-count>'+opts+'</select><div class="news-prod-hint">Production候補が十分な件数だけ選択できます。自動推薦後も管理者が候補を確認・変更できます。</div></div>'+
    '<div class="news-prod-section"><h3>採用候補ニュース / 候補一覧</h3><div class="news-weekly-list">'+(set.candidates.length?set.candidates.map(function(c){return weeklyItem(c,s,e);}).join(''):'<div class="news-prod-hint">候補なし</div>')+'</div></div>'+
    '<div class="news-prod-section"><h3>管理フロー</h3>'+flow('WEEKLY')+'</div><div class="news-prod-actions"><button class="primary" data-weekly-production-preview>Production Preview</button><button data-weekly-publishing-preview>TikTok Preview</button></div>');
}
function openWeeklyDetail(summary,opt){
  opt=opt||{};var n=Number(opt.requestedCount||6),initial=d.buildWeeklySet(summary,{weekValue:opt.weekValue,prefecture:opt.prefecture,requestedCount:n});
  weeklyContext={summary:summary,weekValue:opt.weekValue,prefecture:opt.prefecture,requestedCount:n,selectedCandidateIds:initial.recommendedCandidateIds.slice()};renderWeeklyDetail();
}
function openWeeklyProductionPreview(){
  if(!weeklyContext)return;var p=d.buildWeeklyProductionPreview(weeklyContext.summary,{weekValue:weeklyContext.weekValue,prefecture:weeklyContext.prefecture,requestedCount:weeklyContext.requestedCount,selectedCandidateIds:weeklyContext.selectedCandidateIds}),set=p.weeklySet;
  openHtml('WEEKLY｜Production Preview',blockerBox(p)+'<div class="news-prod-section"><h3>Candidate Set / revision</h3><div class="news-prod-grid">'+field('対象週',set.weekValue)+field('都道府県',set.prefecture)+field('選択件数',set.selectedCandidateIds.length+' / '+set.requestedCount)+field('実候補件数',set.actualCandidateCount)+field('Production利用可能件数',set.productionEligibleCount)+field('不足件数',set.shortage)+field('revision','未作成（read-only）')+field('revisionId','null')+field('renderId','null')+field('予定動画mode','TikTok LONG / WEEKLY')+field('予定尺',p.plannedDurationSec+'秒')+field('予定SNS','TikTok')+field('externalRequestSent','false')+'</div><h4>採用候補</h4>'+list(set.selectedCandidates.map(function(x){return x.candidateId+'｜'+x.headline+'｜'+x.municipality+'｜'+x.category+'｜priority='+x.selection.priority;}))+'</div>'+renderer()+'<div class="news-prod-section"><h3>管理フロー</h3>'+flow('WEEKLY')+'</div><div class="news-prod-actions"><button class="primary" data-weekly-publishing-preview>TikTok Publishing Preview</button><button data-back-weekly-detail>WEEKLY詳細へ戻る</button></div>');
}
function openWeeklyPublishingPreview(){
  if(!weeklyContext)return;var set=currentWeeklySet(),pub=d.weeklyPublishingPreview(set),wf=d.defaultWorkflow('WEEKLY'),a=d.publishingActionState('TIKTOK',{mode:'WEEKLY',workflow:wf,oauthConnected:false,apiConfigured:false,publishingAdapterConnected:false,finalConfirmation:false});
  var txt=pub.TIKTOK.caption+'\n'+pub.TIKTOK.hashtags.join(' ');
  openHtml('WEEKLY｜TikTok Publishing Preview','<div class="news-prod-banner warn"><strong>read-only Publishing Preview</strong><br>WEEKLYはTikTok LONGのみです。Xは現仕様では対象外。externalRequestSent=false。</div>'+
    '<div class="news-prod-section"><h3>WEEKLY投稿予定</h3><div class="news-prod-grid">'+field('対象週',set.weekValue)+field('都道府県',set.prefecture)+field('ニュース件数',set.selectedCandidateIds.length)+field('予定尺',set.durationSec+'秒')+field('revisionId','null')+field('renderId','null')+'</div></div>'+
    '<div class="news-prod-platform"><h4>TikTok Preview <span class="news-prod-status">Preview可能</span></h4><div class="news-prod-preview-text">'+esc(txt)+'</div><div class="news-prod-grid" style="margin-top:8px;">'+field('予定media',pub.TIKTOK.plannedMedia)+field('externalRequestSent','false')+'</div><div class="news-prod-actions"><button disabled aria-disabled="true">TikTokへ投稿（disabled）</button></div><div class="news-prod-hint"><strong>disabled理由：</strong>'+esc(a.reasons.join(' / '))+'</div></div>'+
    '<div class="news-prod-section"><h3>管理フロー</h3>'+flow('WEEKLY')+'</div><div class="news-prod-actions"><button data-back-weekly-detail>WEEKLY詳細へ戻る</button></div>');
}
function syncWeeklySelection(){
  if(!weeklyContext)return;weeklyContext.selectedCandidateIds=Array.from(document.querySelectorAll('#'+MID+' [data-weekly-candidate-id]:checked')).map(function(x){return x.getAttribute('data-weekly-candidate-id');});
}
function onChange(e){
  if(!weeklyContext)return;
  if(e.target.matches('[data-weekly-count]')){weeklyContext.requestedCount=Number(e.target.value);var n=d.buildWeeklySet(weeklyContext.summary,{weekValue:weeklyContext.weekValue,prefecture:weeklyContext.prefecture,requestedCount:weeklyContext.requestedCount});weeklyContext.selectedCandidateIds=n.recommendedCandidateIds.slice();renderWeeklyDetail();}
  else if(e.target.matches('[data-weekly-candidate-id]')){syncWeeklySelection();if(weeklyContext.selectedCandidateIds.length>weeklyContext.requestedCount){e.target.checked=false;syncWeeklySelection();}renderWeeklyDetail();}
}
function onClick(e){
  var c=root.__machimamoNewsProductionCandidate;
  if(e.target.closest('[data-open-single-publishing]')&&c)openSinglePublishingPreview(c);
  if(e.target.closest('[data-weekly-production-preview]')){syncWeeklySelection();openWeeklyProductionPreview();}
  if(e.target.closest('[data-weekly-publishing-preview]')){syncWeeklySelection();openWeeklyPublishingPreview();}
  if(e.target.closest('[data-back-weekly-detail]'))renderWeeklyDetail();
}
ensure();
root.MachimamoNewsProductionAdmin=Object.freeze({
  version:'news-production-admin-ui-v1-readonly',attachSingleActions:attachSingleActions,
  openSingleProductionPreview:openSingleProductionPreview,openSinglePublishingPreview:openSinglePublishingPreview,
  openWeeklyDetail:openWeeklyDetail,openWeeklyProductionPreview:openWeeklyProductionPreview,
  openWeeklyPublishingPreview:openWeeklyPublishingPreview,close:close
});
})(typeof window!=='undefined'?window:globalThis);