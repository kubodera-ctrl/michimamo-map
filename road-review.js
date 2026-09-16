(function(root){
 'use strict';
 let generation=0, config=null, offset=0, busy=false, fetchSeq=0;
 const mount=()=>document.getElementById('adminRoadReports');
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function reset(){generation++;fetchSeq++;config=null;busy=false;offset=0;mount()?.replaceChildren();}
 const current=(ctx,token)=>config===ctx && token===generation && ctx.isCurrent();
 function input(parent,label,type='text') {const l=el('label',label),n=el('input');n.type=type;l.append(n);parent.append(l);return n;}
 function check(parent,text){const l=el('label'),n=el('input');n.type='checkbox';l.className='road-check';l.append(n,el('span',text));parent.append(l);return n;}
 function option(select,value,label){const n=el('option',label);n.value=value;select.append(n);}
 function dateLocal(iso){if(!iso)return '';const d=new Date(iso);if(!Number.isFinite(d.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
 function message(error){const t=String(error?.message||error||'');
  if(/source_changed/.test(t))return '投稿が変更されました。再読込して確認してください。';
  if(/source_unavailable/.test(t))return '期限切れ・削除・非表示などで、この投稿は集計できません。';
  if(/event_not_on_road/.test(t))return '統合先が変わりました。再読込して同じ道路の観測を選んでください。';
  if(/observation_time_required/.test(t))return '観測日時を確認してください。対象は直近10日以内です。';
  if(/invalid_password|admin_required|authentication_required/.test(t))return '管理者権限とパスワードを再確認してください。';
  if(/duplicate key/.test(t))return 'その道路区間コードは登録済みです。既存区間を選んでください。';
  return '処理できませんでした。内容を確認して再度お試しください。';
 }
 async function refresh(ctx,token){
  if(!current(ctx,token))return;
  const seq=++fetchSeq;
  const box=mount();box.replaceChildren(el('p','道路別の集計データを取得中…'));
  try{const {data,error}=await ctx.rpc('admin_road_reports',{p_password:ctx.password,p_action:'list',p_payload:{offset}});
   if(!current(ctx,token) || seq!==fetchSeq)return;if(error)throw error;
   if(!data || !Array.isArray(data.roads) || !Array.isArray(data.queue) || !Array.isArray(data.records))throw Error('invalid_response');
   render(data,ctx,token);
  }catch(error){if(current(ctx,token) && seq===fetchSeq){box.replaceChildren(el('p',message(error)));const retry=el('button','再読込');retry.type='button';retry.onclick=()=>refresh(ctx,token);box.append(retry);}}
 }
 async function act(action,payload,ctx,token,status){
  if(busy || !current(ctx,token))return;busy=true;fetchSeq++;const box=mount();box.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='保存中…';
  try{const {error}=await ctx.rpc('admin_road_reports',{p_password:ctx.password,p_action:action,p_payload:payload});
   if(!current(ctx,token))return;if(error)throw error;
   await refresh(ctx,token);
  }catch(error){if(current(ctx,token)){status.textContent=message(error);box.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  finally{if(current(ctx,token))busy=false;}
 }
 function render(data,ctx,token){
  const box=mount();box.replaceChildren();
  const summary=root.MachimamoRoadSummary.summarizeRoads(data.records,{fromMs:data.fromMs,toMs:data.toMs,nowMs:data.nowMs,periodId:data.periodId,roadIds:data.roads.map(r=>r.id)});
  const names=new Map(data.roads.map(r=>[r.id,r.label+'（'+r.boundaries+'）']));
  box.append(el('h3','道路別集計・確認待ち（管理者限定）'),el('p','直近10日間。確認した観測だけを集計します。一般向けランキングはまだ公開していません。'),el('p',new Date(data.fromMs).toLocaleString('ja-JP')+' ～ '+new Date(data.toMs).toLocaleString('ja-JP')));
  const reload=el('button','再読込');reload.type='button';reload.onclick=()=>{if(!busy)refresh(ctx,token);};box.append(reload);
  const table=el('table'),head=el('tr');for(const t of ['道路区間','観測件数','確認済み通行妨害'])head.append(el('th',t));table.append(head);
  for(const r of summary.publicSummary.roads){const tr=el('tr');for(const v of [names.get(r.roadId)||r.roadId,r.observedEvents,r.confirmedObstructionEvents])tr.append(el('td',String(v)));table.append(tr);}
  box.append(table);if(!summary.internal.length)box.append(el('p','集計対象の確認済み観測はまだありません。'));
  box.append(el('p','車両数・同じ車両の反復観測：ナンバー照合未接続のため未確認。'),el('p',summary.publicSummary.note));
  const details=el('details');details.append(el('summary','道路区間を登録する'));
  const form=el('form'),code=input(form,'区間コード（同じ区間は同じコード）'),label=input(form,'道路名・地域'),boundaries=input(form,'区間の始点・終点（交差点名など）');
  code.maxLength=80;label.maxLength=160;boundaries.maxLength=500;
  const verified=check(form,'同じ道路名でも区間を区別し、既存登録と重複しないことを確認した');
  const create=el('button','道路区間を登録');create.type='submit';const createStatus=el('p');createStatus.setAttribute('role','status');form.append(create,createStatus);
  form.onsubmit=e=>{e.preventDefault();if(!verified.checked || code.value.trim().length<3 || label.value.trim().length<3 || boundaries.value.trim().length<8){createStatus.textContent='道路名・区間コード・始点と終点を入力し、確認にチェックしてください。';return;}act('create_road',{code:code.value.trim(),label:label.value.trim(),boundaries:boundaries.value.trim(),verified:true},ctx,token,createStatus);};details.append(form);box.append(details);
  box.append(el('h4','駐停車関連投稿 '+data.queueTotal+'件（確認済み・対象外を含む）'));
  if(!data.queue.length)box.append(el('p','このページに対象の投稿はありません。'));
  for(const r of data.queue){
   const card=el('details');card.append(el('summary','#'+r.id+' '+r.title+' ／ '+({accepted:'集計対象',rejected:'対象外',pending:'確認待ち'}[r.review_status]||'確認待ち')));
   card.append(el('p',r.address||'住所未登録'),el('p',r.comment||''),el('p','投稿日時：'+new Date(r.created_at).toLocaleString('ja-JP')));
   if(Number.isFinite(r.lat) && Number.isFinite(r.lng) && Math.abs(r.lat)<=90 && Math.abs(r.lng)<=180){const link=el('a','投稿地点を地図で確認');link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(r.lat+','+r.lng);link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
   const roadLabel=el('label','道路区間'),road=el('select');option(road,'','道路区間を選択');for(const x of data.roads)option(road,x.id,names.get(x.id));road.value=r.road_id||'';roadLabel.append(road);card.append(roadLabel);
   const eventLabel=el('label','重複する観測'),events=el('select');eventLabel.append(events);card.append(eventLabel);
   function chooseEvents(){events.replaceChildren();option(events,'','新しい観測（別の観測と確認できた場合）');const seen=new Set();for(const x of data.records){if(x.roadId!==road.value || seen.has(x.eventId))continue;seen.add(x.eventId);option(events,x.eventId,'同じ観測にまとめる：投稿 #'+x.observationId+' ／ '+new Date(x.observedAtMs).toLocaleString('ja-JP'));}events.value=road.value===r.road_id?r.event_id||'':'';}
   road.onchange=chooseEvents;chooseEvents();
   const time=input(card,'観測日時（端末の時刻設定。不明なら対象外）','datetime-local');time.value=dateLocal(r.observed_at);
   const roadCheck=check(card,'投稿地点がこの道路区間にあることを確認した'),dedupCheck=check(card,'連写・複数人の投稿を確認し、同じ観測を重複計上しない'),timeCheck=check(card,'投稿時刻からの推測ではなく、観測日時を確認できた'),obstruction=check(card,'通行妨害を人が確認した（任意・AI判定だけではチェックしない）');
   card.append(el('p','時間が離れているだけでは、別の停車や連続した駐車とは判断しません。判断できないものは対象外にしてください。'));
   const status=el('p');status.setAttribute('role','status');
   const accept=el('button','確認して集計対象にする'),reject=el('button','集計対象外にする');accept.type=reject.type='button';
   accept.onclick=()=>{if(!road.value || !time.value || !roadCheck.checked || !dedupCheck.checked || !timeCheck.checked){status.textContent='道路・観測日時・重複を確認し、3つの確認にチェックしてください。';return;}const date=new Date(time.value);if(!Number.isFinite(date.getTime())){status.textContent='観測日時を確認してください。';return;}act('review',{spot_id:r.id,source_version:r.source_version,decision:'accepted',road_id:road.value,event_id:events.value||null,observed_at:date.toISOString(),checks:{road:true,dedup:true,time:true,obstruction:obstruction.checked}},ctx,token,status);};
   reject.onclick=()=>act('review',{spot_id:r.id,source_version:r.source_version,decision:'rejected'},ctx,token,status);
   card.append(accept,reject,status);box.append(card);
  }
  const prev=el('button','前の50件'),next=el('button','次の50件');prev.type=next.type='button';prev.disabled=offset===0;next.disabled=offset+50>=data.queueTotal;
  prev.onclick=()=>{if(!busy && offset>0){offset-=50;refresh(ctx,token);}};next.onclick=()=>{if(!busy && offset+50<data.queueTotal){offset+=50;refresh(ctx,token);}};box.append(prev,next);
 }
 root.MachimamoRoadReview={reset,load(ctx){reset();config=ctx;return refresh(ctx,generation);},dateLocal};
})(typeof window!=='undefined'?window:globalThis);
