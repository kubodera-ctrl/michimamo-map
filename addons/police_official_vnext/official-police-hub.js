/** Same MAP UI extension: Tokyo official alerts, precursor releases, town statistics and 47 source links.
 *  NEVER grants submission points, geocodes an approximate event, or calls external police APIs.
 */
(function(root){
'use strict';
const SOURCE_PAGES=Object.freeze({
 precursor:'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/zencho.html',
 town_stats:'https://www.keishicho.metro.tokyo.lg.jp/about_mpd/jokyo_tokei/jokyo/ninchikensu.html',
 fraud:'https://www.keishicho.metro.tokyo.lg.jp/jiken_jiko/hassei/map_annai.html',
 opendata:'https://mail.keishicho.metro.tokyo.lg.jp/opendata/',
 national:'https://www.npa.go.jp/toukei/seianki/hanzaiopendatalink.html',
 rights:'https://www.keishicho.metro.tokyo.lg.jp/about/kenri_link.html'
});
function isSafeSourceUrl(value){
 try{const url=new URL(value);return url.protocol==='https:' && !url.username && !url.password && !url.port &&
  (url.hostname.endsWith('.go.jp') || url.hostname.endsWith('.lg.jp') || /(^|\.)pref\.[a-z]+\.jp$/.test(url.hostname) ||
   ['mail.keishicho.metro.tokyo.lg.jp','www.harp.lg.jp','odcs.bodik.jp',
    'data.bodik.jp','gifu-opendata.pref.gifu.lg.jp','shimane-opendata.jp',
    'yamaguchi-opendata.jp','www.okayama-opendata.jp','hiroshima-opendata.dataeye.jp',
    'www.ibaraki-opendata.jp','opendata.pref.toyama.jp'].includes(url.hostname));}
 catch(_){return false;}
}
function visibleReleaseRows(snapshot,dataset){
 if(!snapshot || snapshot.schema_version!==1 || snapshot.dataset!==dataset || !Array.isArray(snapshot.releases)){
  throw new Error('official cumulative snapshot schema mismatch');
 }
 if(snapshot.publication_enabled !== true) return [];
 const latestByPeriod=new Map();
 for(const release of snapshot.releases){
  if(!Number.isInteger(release.year)||!Number.isInteger(release.through_month)||release.through_month<1||release.through_month>12||
     !Number.isInteger(release.revision)||release.revision<1||!Array.isArray(release.records)) throw new Error('invalid cumulative release');
  const id=release.year+'-'+release.through_month;
  const old=latestByPeriod.get(id);
  if(old&&release.revision===old.revision) throw new Error('duplicate release revision');
  if(!old||release.revision>old.revision)latestByPeriod.set(id,release);
 }
 // A monthly cumulative dataset is a *replacement snapshot*, not a series of
 // independent incident counts. Select only the newest release in this dataset,
 // and do NOT fall back to an older, approved month when a newer month/correction
 // is still pending. This fails closed instead of displaying outdated figures.
 const newest=[...latestByPeriod.values()].sort((a,b)=>b.year-a.year || b.through_month-a.through_month)[0];
 const items=[];
 if(!newest) return items;
 if(newest.review_status!=='approved'||newest.rights_status!=='verified'||newest.superseded===true||newest.requires_review===true)return items;
 for(const record of newest.records){
  if(record.review_status!=='approved'||record.rights_status!=='verified')continue;
  if(record.latitude!=null||record.longitude!=null)throw new Error('cumulative area data must not contain coordinates');
  if(dataset==='precursor' && record.record_count_basis==='official_csv_rows_cumulative_not_unique_incidents' &&
     (!Number.isSafeInteger(record.recognized_count_cumulative)||record.recognized_count_cumulative<0))
     throw new Error('invalid official precursor cumulative row count');
  if(dataset==='town_stats' && (!Number.isSafeInteger(record.recognized_count_cumulative)||record.recognized_count_cumulative<0))throw new Error('invalid official cumulative count');
  items.push({...record,year:newest.year,through_month:newest.through_month});
 }
 return items;
}
function visibleDirectory(registry){
 if(!registry||registry.schema_version!==1||registry.data_ingestion_enabled!==false||!Array.isArray(registry.sources))throw new Error('bad police source registry');
 const seen=new Set();
 for(const row of registry.sources){
  if(!/^\d{2}$/.test(row.jis)||seen.has(row.jis)||!isSafeSourceUrl(row.source_page))throw new Error('invalid official source directory');
  if(row.rights_status!=='pending_per_prefecture'||row.data_status!=='link_only')throw new Error('national data must stay link-only until rights verified');
  seen.add(row.jis);
 }
 if(seen.size!==47)throw new Error('expected 47 prefectures');
 return registry.sources;
}
function text(doc,tag,value,css){const node=doc.createElement(tag);if(value!==undefined)node.textContent=String(value);if(css)node.className=css;return node;}
function a(doc,value,url){const node=text(doc,'a',value);if(isSafeSourceUrl(url)){node.href=url;node.target='_blank';node.rel='noopener noreferrer';}return node;}
function empty(doc,message){return text(doc,'p',message,'police-official-empty');}
function safeDate(value){return value&&/^\d{4}[-/]\d{2}[-/]\d{2}/.test(String(value))?String(value):'未確認';}
function renderRows(doc,container,rows,dataset,limit){
 container.replaceChildren();
 if(!rows.length){container.append(empty(doc,'承認済み・権利確認済みの情報は未配信です。公式の原典をご確認ください。'));return;}
 const cap=Math.max(0,Math.min(limit||100,500));
 for(const r of rows.slice(0,cap)){
  const entry=text(doc,'article',undefined,'police-official-entry');
  if(dataset==='precursor'){
   entry.append(text(doc,'strong','前兆事案／警視庁公表'),
     text(doc,'p',`${r.municipality}｜場所区分：${r.area_label}｜${r.event_type}`),
     text(doc,'small',r.record_count_basis==='official_csv_rows_cumulative_not_unique_incidents'
       ? `元CSV掲載行数 ${Number(r.recognized_count_cumulative).toLocaleString('ja-JP')}行（${r.year}年${r.through_month}月までの累計）。個別の事件数・速報件数ではありません。`
       : `発生：${safeDate(r.occurred_at)}／認知：${safeDate(r.recognized_at)}／掲載期間：${r.year}年${r.through_month}月累計`));
  }else{
   entry.append(text(doc,'strong',`${r.crime_type}：${Number(r.recognized_count_cumulative).toLocaleString('ja-JP')}件（累計）`),
     text(doc,'p',`${r.municipality} ${r.town}｜${r.year}年${r.through_month}月までの認知件数`));
  }
  entry.append(text(doc,'p','町丁目単位の情報であり、個別の事件地点を示すピンではありません。','police-official-disclaimer'));
  container.append(entry);
 }
 if(rows.length>cap)container.append(text(doc,'p',`表示上限 ${cap}件です。詳細は公式資料をご確認ください。`));
}
function mount({doc, map, leaflet, fetcher, location, enabled=true, db, sourceOnly=false, openNearby}){
 if(!enabled)return null;
 if(!doc||(!sourceOnly&&(!map||!leaflet))||!doc.querySelector('#filterWrapper .filter-content')||!doc.getElementById('map-container'))throw new Error('existing MAP unavailable');
 if(doc.getElementById('policeOfficialHubToggle'))return null;
 const bar=doc.querySelector('#filterWrapper .filter-content');
 const mapHost=doc.getElementById('map-container');
 const chip=text(doc,'button',sourceOnly?'公式防犯・データ':'防犯公表・統計','filter-chip police-official-hub-toggle');chip.id='policeOfficialHubToggle';chip.type='button';chip.setAttribute('aria-expanded','false');chip.setAttribute('aria-controls','policeOfficialHubPanel');
 const panel=text(doc,'aside',undefined,'police-official-panel police-official-hub');panel.id='policeOfficialHubPanel';panel.hidden=true;
 panel.setAttribute('aria-label',sourceOnly?'警察公式情報の確認先':'警察公表・犯罪統計');if(sourceOnly)panel.setAttribute('data-source-only','true');
 const top=text(doc,'div',undefined,'police-official-heading');const close=text(doc,'button','閉じる','police-official-close');close.type='button';top.append(text(doc,'strong',sourceOnly?'警察公式情報を探す':'警察公表・犯罪統計'),close);
 const quickNav=text(doc,'nav',undefined,'police-official-quick-nav');
 quickNav.setAttribute('aria-label','調べたい防犯情報から探す');
 const quickButtons=[];
 const tabbar=text(doc,'div',undefined,'police-official-hub-tabs');
 const info=text(doc,'div',undefined,'police-official-hub-data');
 const status=text(doc,'p','公開データの接続状況を確認してください。','police-official-status');status.setAttribute('role','status');
 const caution=text(doc,'p','警察公表と利用者投稿は別情報です。公式情報に投稿ポイントは付きません。表示の少なさや0件は、安全の保証ではありません。','police-official-disclaimer');
 panel.append(top,...(sourceOnly?[quickNav]:[]),tabbar,status,caution,info);
 bar.append(chip);mapHost.append(panel);
 let precursor=null,stats=null,directory=null,selected=sourceOnly?'mail':'precursor',prefectureQuery='';
 const tabs=[['mail','防犯情報'],['precursor','前兆事案'],['town_stats','町丁目統計'],['fraud','特殊詐欺・アポ電'],['national','全国47都道府県'],['about','出典と注意']];
 function changeTab(key){selected=key;render();}
 if(sourceOnly){
   quickNav.append(text(doc,'strong','今、何を確認したい？','police-official-quick-title'));
   const actions=[['子ども・通学','mail'],['不審者・声かけ','precursor'],['詐欺・アポ電','fraud'],['自転車盗','town_stats'],['全国の統計','national']];
   for(const [label,key] of actions){
     const button=text(doc,'button',label,'police-official-quick-action');button.type='button';
     button.setAttribute('data-police-topic',key);
     button.addEventListener('click',()=>changeTab(key));quickNav.append(button);quickButtons.push([button,key]);
   }
   if(typeof openNearby==='function'){
     quickNav.append(text(doc,'p','まちまもの地図ですぐ探す','police-official-quick-caption'));
     for(const [label,kind] of [['近くの交番','police'],['近くのAED','aed']]){
       const button=text(doc,'button',label,'police-official-map-action');button.type='button';
       button.setAttribute('data-police-map-action',kind);
       button.addEventListener('click',()=>{
         toggle(false);
         try { openNearby(kind); }catch(_){ /* The original MAP remains unchanged on optional navigation failure. */ }
       });
       quickNav.append(button);
     }
   }
 }
 function render(){
  info.replaceChildren();tabbar.replaceChildren();
  for(const [key,label] of tabs){const button=text(doc,'button',label);button.type='button';button.setAttribute('aria-pressed',String(key===selected));button.addEventListener('click',()=>changeTab(key));tabbar.append(button);}
  for(const [button,key] of quickButtons)button.setAttribute('aria-pressed',String(key===selected));
  try{
   if(selected==='mail'){
    status.textContent=sourceOnly?'警視庁の防犯配信：公式公開元を確認':'メールけいしちょう・公式情報';
    info.append(text(doc,'p','犯罪発生や子どもの安全に関する警視庁の配信情報を確認できます。対象情報はCC BY 4.0。'),
      a(doc,'メールけいしちょう Open DATA（公式）',SOURCE_PAGES.opendata),
      text(doc,'small','出典：警視庁「メールけいしちょう Open DATA」。まちまもMAPは警視庁の監修サービスではありません。'));
   }else if(selected==='precursor'){
    const rows=sourceOnly?[]:precursor?visibleReleaseRows(precursor,'precursor'):[];
    status.textContent=sourceOnly?'前兆事案：警視庁の最新公表元を確認':`前兆事案：承認済み ${rows.length}行／年内認知累計（新規事件数ではありません）`;
    if(sourceOnly)info.append(text(doc,'p','子どもや女性への声かけ・つきまといなどの公表情報です。認知された年の累計であり、個々の現在地の危険性を表すものではありません。'));
    else renderRows(doc,info,rows,'precursor',100);
    info.append(a(doc,'警視庁・前兆事案の認知情報（公式CSV）',SOURCE_PAGES.precursor));
   }else if(selected==='town_stats'){
    const rows=sourceOnly?[]:stats?visibleReleaseRows(stats,'town_stats'):[];
    status.textContent=sourceOnly?'町丁目統計：警視庁の最新公表元を確認':`町丁目統計：承認済み ${rows.length}行／年内認知累計`;
    if(sourceOnly)info.append(text(doc,'p','自転車盗などの犯罪種別・手口別の町丁目集計です。月間の新規発生件数や個々の犯行地点を示すものではありません。'));
    else renderRows(doc,info,rows,'town_stats',100);
    info.append(a(doc,'警視庁・町丁別犯罪認知件数（公式CSV）',SOURCE_PAGES.town_stats));
   }else if(selected==='fraud'){
    status.textContent='特殊詐欺・アポ電：警視庁の公式案内へのリンク';
    info.append(text(doc,'p','アポ電は特殊詐欺につながる予兆電話です。警視庁犯罪情報マップに公式の確認先があります。警察情報マップの画像・ピンは転載していません。'),a(doc,'警視庁犯罪情報マップ（アポ電を確認）',SOURCE_PAGES.fraud));
   }else if(selected==='national'){
    status.textContent='全国窃盗7手口：47都道府県の公式出典案内（年次データ、速報ではありません）';
    if(directory){
      const sourceRows=visibleDirectory(directory);
      const searchRow=text(doc,'div',undefined,'police-official-prefecture-search');
      const label=text(doc,'label','都道府県名で検索（例：東京・千葉）');
      const input=doc.createElement('input');input.type='search';input.value=prefectureQuery;
      input.setAttribute('aria-label','都道府県名で公式データ公開元を検索');
      input.setAttribute('placeholder','例：東京・千葉・大阪');input.setAttribute('maxlength','30');
      const count=text(doc,'p',undefined,'police-official-search-count');count.setAttribute('role','status');
      const results=text(doc,'div',undefined,'police-official-prefecture-results');
      const draw=()=>{
        const query=String(prefectureQuery||'').normalize('NFKC').trim().slice(0,30);
        const matched=sourceRows.filter(p=>String(p.prefecture).normalize('NFKC').includes(query)||p.jis===query);
        results.replaceChildren();count.textContent=`${matched.length} / ${sourceRows.length} 都道府県の公開元`;
        for(const p of matched){
          const line=text(doc,'div',undefined,'police-official-source-row');
          line.append(a(doc,p.prefecture+'の公式データ公開元',p.source_page),
            text(doc,'small','年次の窃盗統計・出典案内。新しい事件の速報ではありません。県別の再利用条件は確認待ち。'));
          results.append(line);
        }
        if(!matched.length)results.append(empty(doc,'一致する都道府県がありません。地域名を変えてください。'));
      };
      input.addEventListener('input',()=>{prefectureQuery=String(input.value||'').slice(0,30);draw();});
      const reset=text(doc,'button','クリア','police-official-search-reset');reset.type='button';
      reset.addEventListener('click',()=>{prefectureQuery='';input.value='';draw();input.focus?.();});
      label.append(input);searchRow.append(label,reset);
      info.append(searchRow,count,results);draw();
    }else info.append(empty(doc,'全国の公式公開元リストを読み込めませんでした。警察庁の原典から確認できます。'));
    info.append(a(doc,'警察庁・全国警察オープンデータの公式案内',SOURCE_PAGES.national));
   }else{
    status.textContent='公式の出典と確認条件';
    info.append(text(doc,'p','出典：警視庁。メールけいしちょうOpen DATAの対象情報はCC BY 4.0。統計CSVは資料ごとに利用条件を確認します。警視庁がまちまもMAPを監修したものではありません。'),
      a(doc,'メールけいしちょう Open DATA利用規約',SOURCE_PAGES.opendata+'policy'),
      a(doc,'警視庁ホームページの権利・出典表示',SOURCE_PAGES.rights),
      text(doc,'p','加工して表示する場合は出典・加工の明記が必要です。地図素材・警察マークは転用せず、町丁目から正確な発生地点を推定しません。')); 
   }
  }catch(_){status.textContent='公式データを検証できませんでした。前回の表示と出典リンクを確認してください。';info.append(a(doc,'警視庁・公開元',SOURCE_PAGES.opendata));}
 }
 function toggle(state){panel.hidden=!state;chip.classList.toggle('active',state);chip.setAttribute('aria-expanded',String(state));if(state)render();}
 chip.addEventListener('click',()=>toggle(panel.hidden));close.addEventListener('click',()=>toggle(false));
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){toggle(false);chip.focus?.();}});
 async function loadFromSameOrigin(url,key){
  const p=new URL(url,location.href);
  if(p.origin!==location.origin||!/^https?:$/.test(p.protocol)||p.username||p.password)throw new Error('same-origin only');
  const resp=await fetcher(p.pathname+p.search,{credentials:'same-origin',cache:'no-store'});
  if(!resp.ok)throw new Error('data load failed');
  const obj=await resp.json();
  if(key==='precursor')visibleReleaseRows(obj,'precursor');
  if(key==='town_stats')visibleReleaseRows(obj,'town_stats');
  if(key==='national')visibleDirectory(obj);
  return obj;
 }
 async function refresh(config){
  if(sourceOnly&&(config?.precursor||config?.town_stats))throw new Error('source-only mode does not fetch unreviewed data');
  const next={precursor,stats,directory}; const errs=[];
  for(const [name,key] of [['precursor','precursor'],['town_stats','town_stats'],['national','national']]){
   if(!config||typeof config[name]!=='string')continue;
   try{const value=await loadFromSameOrigin(config[name],key); if(name==='precursor')next.precursor=value;else if(name==='town_stats')next.stats=value;else next.directory=value;}
   catch(_){errs.push(name);}
  }
  precursor=next.precursor;stats=next.stats;directory=next.directory;
  if(!panel.hidden)render();
  return {error_sources:errs,retained_previous:errs.length>0};
 }
 function setSyntheticBundle(data){
  if(sourceOnly)throw new Error('source-only mode cannot publish records');
  if(data.precursor)visibleReleaseRows(data.precursor,'precursor');
  if(data.town_stats)visibleReleaseRows(data.town_stats,'town_stats');
  if(data.registry)visibleDirectory(data.registry);
  precursor=data.precursor||precursor;stats=data.town_stats||stats;directory=data.registry||directory;
  if(!panel.hidden)render();
 }
 async function loadAdmin({password, rpc, isCurrent}){
  if(sourceOnly)return; // no admin RPC and no credential handling in public source directory
  const adminArea=doc.getElementById('adminDashboardArea');
  if(!adminArea||adminArea.style.display==='none'||typeof rpc!=='function'||!password)return;
  let container=doc.getElementById('adminPoliceOfficialSection');
  if(!container){container=text(doc,'section',undefined,'police-official-admin');container.id='adminPoliceOfficialSection';container.append(text(doc,'h3','警視庁公表データ｜取込・訂正・承認状況'),text(doc,'p','管理者権限を確認して取得します。'));adminArea.prepend(container);}
  try{
   const {data,error}=await rpc('admin_get_police_official_review',{p_password:password});
   if(typeof isCurrent==='function'&&!isCurrent())return;
   if(error||!data||data.scope!=='police_official_review')throw new Error('admin official RPC unavailable');
   const statusNode=text(doc,'p',`未審査 ${Number(data.pending||0)}／訂正・取消 ${Number(data.corrections||0)}／出典要確認 ${Number(data.rights_pending||0)}／位置不明 ${Number(data.area_only||0)}`);
   container.replaceChildren(text(doc,'h3','警視庁公表データ｜取込・訂正・承認状況'),statusNode,
      text(doc,'p','新規・訂正を1件ずつ確認してください。原典の当該ファイル／ハッシュ／利用条件を実際に確認してから承認します。承認後も公開スイッチは別途OFFのままです。'));
   // A source page is not a license. Tokyo's catalog identifies historical
   // town-statistics resources as CC BY, but 2026 CSV scope is not yet proven.
   // Never turn a link into an automatic rights approval.
   const allowedEvidence={mail:'https://mail.keishicho.metro.tokyo.lg.jp/opendata/policy'};
   for(const item of (Array.isArray(data.queue)?data.queue:[]).slice(0,30)){
     const row=text(doc,'section',undefined,'police-official-source-row');
     row.append(text(doc,'strong',String(item.title||'公式データ')+'｜'+String(item.dataset||'')),
       text(doc,'p','ファイルSHA256：'+String(item.source_file_sha256||'不明')),
       text(doc,'p','内容SHA256：'+String(item.content_hash||'不明')),
       a(doc,'公式の出所を確認',item.source_url));
     if(item.dataset!=='mail'){
       row.append(text(doc,'p','資料別の2026年版利用条件・出所との対応が未確定です。公式ページへのリンクだけでは権利確認にならないため、現段階は承認不可。'));
       container.append(row);continue;
     }
     // Mail Open DATA's verified JSON export has only send_at/subject/message/
     // send_by/send_to. It contains NO official stable incident identifier.
     // Similar text, timestamps, or our local review hash cannot authorize approval.
     if(item.source_id_verified!==true){
       row.append(text(doc,'p','公式事案ID未確認：本文や配信日時の一致を同一事件・訂正・取消の根拠にしません。非公開の確認待ちです。','police-official-identity-hold'));
       container.append(row);continue;
     }
     if(item.is_fixture===true||item.requires_review===true){
       row.append(text(doc,'p','架空データ・確認事項残存のため承認不可。管理者の審査が必要です。','police-official-review-hold'));
       container.append(row);continue;
     }
     const label=text(doc,'label',undefined,'police-official-admin-check');
     const check=doc.createElement('input');check.type='checkbox';check.checked=false;
     label.append(check,text(doc,'span','このファイルの内容・発生地域・訂正・利用条件を原典で確認しました。'));
     const approve=text(doc,'button','確認済みとして承認','police-official-admin-approve');approve.type='button';
     const reject=text(doc,'button','非表示／却下','police-official-admin-reject');reject.type='button';
     const msg=text(doc,'p','操作待ち','police-official-status');
     async function decide(action){
       if(typeof isCurrent==='function'&&!isCurrent())return;
       if(action==='approve'&&!check.checked){msg.textContent='原典を確認するまで承認できません。';return;}
       // Direct human interaction only, never an automatic job/effect.
       const confirmFn=doc.defaultView&&doc.defaultView.confirm;
       if(typeof confirmFn!=='function'||!confirmFn(`公式データの${action==='approve'?'承認':'却下'}を実行しますか？`))return;
       approve.disabled=true;reject.disabled=true;
       try{
         const result=await rpc('admin_review_police_official',{
          p_password:password,p_document_id:item.id,p_action:action,
          p_expected_hash:item.content_hash,p_verified_source_sha256:item.source_file_sha256,
          p_rights_evidence_url:allowedEvidence[item.dataset]||null,
          p_reason:action==='reject'?'管理者による非表示':'原典と当該資料の利用条件を確認'
         });
         if(typeof isCurrent==='function'&&!isCurrent())return;
         if(result.error||result.data?.reviewed!==true)throw new Error('review_failed');
         msg.textContent='反映しました。最新の承認一覧を再取得してください。';
         await loadAdmin({password,rpc,isCurrent});
       }catch(_){msg.textContent='承認処理に失敗しました。状態を再確認してください。';
         approve.disabled=false;reject.disabled=false;}
     }
     approve.addEventListener('click',()=>decide('approve'));
     reject.addEventListener('click',()=>decide('reject'));
     row.append(label,approve,reject,msg);container.append(row);
   }
  }catch(_){container.replaceChildren(text(doc,'h3','警視庁公表データ｜取込・訂正・承認状況'),empty(doc,'管理者用公式データRPCは未接続です。既存投稿とポイントには影響しません。'));}
 }
 render();
 return {refresh,setSyntheticBundle,loadAdmin,close:()=>toggle(false),getState:()=>({mounted:true,sourceOnly,precursor:!!precursor,stats:!!stats,directory:!!directory})};
}
const api={SOURCE_PAGES,isSafeSourceUrl,visibleReleaseRows,visibleDirectory,mount};
if(typeof module==='object'&&module.exports)module.exports=api;else root.MachimamoPoliceHub=api;
})(typeof window!=='undefined'?window:globalThis);
