(function (root) {
    'use strict';
    const KEY='machimamo_drive_test_history_v1',MAX_HISTORY=20,DB='machimamo-drive-test-v1';
    const categories=['roadside_stop','crosswalk_blocked','intersection_blocked','cycle_space_blocked','bus_stop_blocked'];
    const counters=['candidates','valid','invalid','duplicate','falsePositive','samePlaceDuplicate','sameVehicleDuplicate','gpsFailure','imageFailure','ringFailure','fpsDrop','aiPaused','drivePaused'];
    let session=null,watchId=null,thumbUrls=[],fullSessionId='',fullFilter='all',fullPage=0;
    const now=()=>new Date().toISOString();
    const numberOrNull=value=>Number.isFinite(value)?value:null;
    const load=()=>{try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[];}catch(_){return [];}};
    const save=items=>localStorage.setItem(KEY,JSON.stringify(items.slice(0,MAX_HISTORY)));
    const distanceKm=(a,b)=>{const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;
        const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
    async function batteryLevel(){try{const b=await navigator.getBattery?.();return numberOrNull(b?.level*100);}catch(_){return null;}}
    function empty(label){return {id:crypto.randomUUID(),label:String(label||'東京都内・初回実走').slice(0,80),environment:'urban',startedAt:now(),endedAt:null,
        durationMs:0,distanceKm:0,counters:Object.fromEntries(counters.map(k=>[k,0])),categories:Object.fromEntries(categories.map(k=>[k,0])),
        classifications:{roadside:0,congestion:0,signal_wait:0,indeterminate:0},events:[],batteryStart:null,batteryEnd:null,batteryPerHour:null,thermalMax:null,thermalHistory:[],temporaryBytes:0,serverBytes:0,mobileBytes:null,wifiPendingBytes:0,
        lastPosition:null,positionSamples:0,measurementNotes:{battery:'Battery API対応時のみ',thermal:'OS実温度はWebでは取得不可。代理状態のみ',mobileBytes:'Webでは回線別実測不可'},schemaVersion:1};}
    function stopWatch(){if(watchId!==null&&navigator.geolocation)navigator.geolocation.clearWatch(watchId);watchId=null;}
    function position(pos){if(!session)return;const c=pos?.coords;if(!Number.isFinite(c?.latitude)||!Number.isFinite(c?.longitude)){session.counters.gpsFailure++;return;}
        const next={lat:c.latitude,lng:c.longitude,accuracy:Number.isFinite(c.accuracy)?c.accuracy:null,at:pos.timestamp||Date.now(),speedKmh:Number.isFinite(c.speed)&&c.speed>=0?c.speed*3.6:null};
        if(session.lastPosition&&next.at>session.lastPosition.at&&next.accuracy!==null&&next.accuracy<=100&&session.lastPosition.accuracy!==null&&session.lastPosition.accuracy<=100){
            const km=distanceKm(session.lastPosition,next);if(km<=2){session.distanceKm+=km;if(next.speedKmh===null){const hours=(next.at-session.lastPosition.at)/3600000;if(hours>0)next.speedKmh=Math.min(180,km/hours);}}
        }
        session.lastPosition=next;session.positionSamples++;persistActive();render();
    }
    function persistActive(){if(session)localStorage.setItem(KEY+'_active',JSON.stringify(session));else localStorage.removeItem(KEY+'_active');}
    function startWatch(){if(watchId!==null||!navigator.geolocation)return;watchId=navigator.geolocation.watchPosition(position,()=>{if(session){session.counters.gpsFailure++;persistActive();render();}},
        {enableHighAccuracy:true,maximumAge:5000,timeout:15000});}
    async function start(label,environment='urban'){
        if(session)return false;session=empty(label);session.environment=environment;session.batteryStart=await batteryLevel();persistActive();
        startWatch();
        render();return true;
    }
    async function end(){if(!session)return null;stopWatch();session.endedAt=now();session.durationMs=Math.max(0,new Date(session.endedAt)-new Date(session.startedAt));session.batteryEnd=await batteryLevel();
        if(session.batteryStart!==null&&session.batteryEnd!==null&&session.durationMs>0)session.batteryPerHour=Math.max(0,(session.batteryStart-session.batteryEnd)/(session.durationMs/3600000));
        delete session.lastPosition;const result=JSON.parse(JSON.stringify(session));save([result,...load()]);session=null;persistActive();render();return result;}
    function increment(name,amount=1){if(session&&Object.hasOwn(session.counters,name)&&Number.isFinite(amount)&&amount>=0){session.counters[name]+=amount;persistActive();}}
    function category(name,amount=1){if(session&&Object.hasOwn(session.categories,name)&&Number.isFinite(amount)&&amount>=0){session.categories[name]+=amount;persistActive();}}
    function bytes(kind,amount){if(!session||!Number.isFinite(amount)||amount<0)return;if(kind==='temporary')session.temporaryBytes+=amount;if(kind==='server')session.serverBytes+=amount;if(kind==='wifiPending')session.wifiPendingBytes=amount;persistActive();}
    const thermalRank={nominal:0,fair:1,serious:2,critical:3};
    function thermal(state){if(!session||!Object.hasOwn(thermalRank,state))return;session.thermalHistory.push({at:now(),state});if(session.thermalHistory.length>100)session.thermalHistory.shift();
        if(session.thermalMax===null||thermalRank[state]>thermalRank[session.thermalMax])session.thermalMax=state;persistActive();}
    const openDb=()=>new Promise((resolve,reject)=>{if(!root.indexedDB)return reject(Error('indexeddb_unavailable'));const req=indexedDB.open(DB,2);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('thumbs'))db.createObjectStore('thumbs',{keyPath:'id'});if(!db.objectStoreNames.contains('events')){const events=db.createObjectStore('events',{keyPath:'id'});events.createIndex('sessionId','sessionId',{unique:false});events.createIndex('classification','classification',{unique:false});}};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    async function storeThumb(id,blob,expiresAt){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction('thumbs','readwrite');tx.objectStore('thumbs').put({id,blob,expiresAt});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
    async function storeEvent(entry){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction('events','readwrite');tx.objectStore('events').put(entry);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
    async function eventRows(sessionId,classification='all'){if(!sessionId)return[];const db=await openDb(),rows=[];await new Promise((resolve,reject)=>{const tx=db.transaction('events','readonly'),index=tx.objectStore('events').index('sessionId'),req=index.openCursor(root.IDBKeyRange.only(sessionId));req.onsuccess=()=>{const cursor=req.result;if(!cursor)return;if(classification==='all'||cursor.value.classification===classification)rows.push(cursor.value);cursor.continue();};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();return rows.sort((a,b)=>new Date(a.at)-new Date(b.at));}
    async function thumbRows(ids){if(!ids.length)return[];const db=await openDb(),rows=[];await new Promise((resolve,reject)=>{const tx=db.transaction('thumbs','readonly'),store=tx.objectStore('thumbs');for(const id of ids){const req=store.get(id);req.onsuccess=()=>{if(req.result&&req.result.expiresAt>Date.now())rows.push(req.result);};}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();return rows;}
    async function cleanupThumbs(){try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction('thumbs','readwrite'),store=tx.objectStore('thumbs'),req=store.openCursor();req.onsuccess=()=>{const cursor=req.result;if(!cursor)return;if(cursor.value.expiresAt<=Date.now())cursor.delete();cursor.continue();};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(_){}}
    async function recordEvent(event,blob){if(!session||!event||!Object.hasOwn(session.classifications,event.classification))return false;
        const id=session.id+':'+crypto.randomUUID(),entry={id,at:event.at||now(),lat:numberOrNull(event.lat),lng:numberOrNull(event.lng),classification:event.classification,
            reason:String(event.reason||'').slice(0,200),duplicate:!!event.duplicate,egoSpeedKmh:numberOrNull(event.egoSpeedKmh),surroundingVehicles:Number(event.surroundingVehicles||0),stoppedRate:numberOrNull(event.stoppedRate),trafficLight:!!event.trafficLight};
        entry.sessionId=session.id;session.classifications[event.classification]++;session.events.push(entry);if(session.events.length>30)session.events.shift();persistActive();
        try{await storeEvent(entry);if(blob)await storeThumb(id,blob,Date.now()+10*86400000);}catch(_){session.counters.ringFailure++;persistActive();return false;}render();return true;}
    function summary(item){const durationMs=item.endedAt?item.durationMs:Math.max(0,Date.now()-new Date(item.startedAt));const hours=durationMs/3600000,mins=durationMs/60000,valid=item.counters.valid;
        return {...item,durationMs,durationMinutes:mins,candidatesPerMinute:mins>0?item.counters.candidates/mins:null,validPerKm:item.distanceKm>0?valid/item.distanceKm:null,
            duplicateRate:item.counters.candidates>0?item.counters.duplicate/item.counters.candidates:null,falsePositiveRate:item.counters.candidates>0?item.counters.falsePositive/item.counters.candidates:null,
            batteryConsumed:item.batteryStart!==null&&item.batteryEnd!==null?Math.max(0,item.batteryStart-item.batteryEnd):null,hours};}
    const fmt=(n,d=1)=>Number.isFinite(n)?Number(n).toFixed(d):'未取得';
    const mb=n=>fmt(n/1048576,1)+'MB';
    function render(){const target=document.getElementById('adminDriveTestLog');if(!target)return;const items=(session?[summary(session)]:[]).concat(load().map(summary));
        target.innerHTML=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><button id="driveTestStart" ${session?'disabled':''}>テスト開始</button><button id="driveTestEnd" ${session?'':'disabled'}>テスト終了・保存</button></div>`+
            `<p class="muted" style="font-size:.68rem">履歴はこの端末に最大${MAX_HISTORY}件保存。Battery API・サーマル実値・回線別通信量はiPhone Webでは未取得になる場合があります。</p>`+
            (items.length?items.map((x,i)=>`<article style="background:#fff;border:1px solid #bfdbfe;border-radius:9px;padding:9px;margin:7px 0;font-size:.7rem"><strong>${i===0&&session?'計測中：':'今回のテスト結果：'}${x.label}</strong><br>
            走行時間 ${fmt(x.durationMinutes)}分／距離 ${fmt(x.distanceKm)}km／候補 ${x.counters.candidates}件／有効 ${x.counters.valid}件／無効 ${x.counters.invalid}件／重複 ${x.counters.duplicate}件／誤検知 ${x.counters.falsePositive}件<br>
            1分あたり候補 ${fmt(x.candidatesPerMinute,2)}件／1kmあたり有効 ${fmt(x.validPerKm,2)}件<br>
            路上停車候補 ${x.classifications?.roadside||0}／渋滞候補 ${x.classifications?.congestion||0}／信号待ち候補 ${x.classifications?.signal_wait||0}／判別不能 ${x.classifications?.indeterminate||0}<br>
            横断歩道 ${x.categories.crosswalk_blocked}／交差点 ${x.categories.intersection_blocked}／自転車空間 ${x.categories.cycle_space_blocked}／バス停 ${x.categories.bus_stop_blocked}／通常停車 ${x.categories.roadside_stop}<br>
            GPS失敗 ${x.counters.gpsFailure}／画像失敗 ${x.counters.imageFailure}／リング失敗 ${x.counters.ringFailure}／FPS低下 ${x.counters.fpsDrop}／AI停止 ${x.counters.aiPaused}／一時停止 ${x.counters.drivePaused}<br>
            バッテリー消費 ${fmt(x.batteryConsumed)}%／1時間換算 ${fmt(x.batteryPerHour)}%／最大サーマル ${x.thermalMax||'未取得'}<br>
            一時保存 ${mb(x.temporaryBytes)}／送信 ${mb(x.serverBytes)}／モバイル ${x.mobileBytes===null?'未取得':mb(x.mobileBytes)}／Wi-Fi待ち ${mb(x.wifiPendingBytes)}</article>`).join(''):'<p>テスト履歴はありません。</p>')+
            '<div id="driveTestThumbs" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:10px"></div>'+
            '<details style="margin-top:12px"><summary style="font-weight:800;color:#1e3a8a">開発者用・セッション全件確認</summary><div id="driveTestFullControls" style="margin-top:8px"></div><div id="driveTestFullEvents"></div></details>';
        document.getElementById('driveTestStart').onclick=()=>start('東京都内・初回実走','urban');document.getElementById('driveTestEnd').onclick=end;
        renderThumbs(items[0]);renderFullControls(items);
    }
    async function renderThumbs(item){const target=document.getElementById('driveTestThumbs');if(!target)return;for(const url of thumbUrls)URL.revokeObjectURL(url);thumbUrls=[];
        const events=(item?.events||[]).slice(-30).reverse();if(!events.length){target.innerHTML='<p class="muted" style="grid-column:1/-1">確認用サムネイルはまだありません。</p>';return;}
        try{const rows=await thumbRows(events.map(x=>x.id)),byId=new Map(rows.map(x=>[x.id,x]));if(!target.isConnected)return;target.innerHTML='';for(const event of events){const row=byId.get(event.id);if(!row)continue;const url=URL.createObjectURL(row.blob);thumbUrls.push(url);const card=document.createElement('article');card.style.cssText='background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:5px;font-size:.62rem';const img=document.createElement('img');img.src=url;img.alt='車載テスト候補';img.style.cssText='width:100%;height:auto;border-radius:5px';const text=document.createElement('div');text.textContent=`${event.classification}／${new Date(event.at).toLocaleString('ja-JP')}／${event.lat===null?'位置未取得':event.lat.toFixed(5)+','+event.lng.toFixed(5)}／${event.reason}`;card.append(img,text);target.append(card);}}
        catch(_){target.textContent='サムネイルを読み込めませんでした。';}}
    function downloadFile(name,type,text){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
    const csvCell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
    async function exportEvents(format){const rows=await eventRows(fullSessionId,'all');if(format==='json'){downloadFile(`machimamo-drive-${fullSessionId}.json`,'application/json',JSON.stringify(rows,null,2));return;}
        const fields=['sessionId','id','at','classification','duplicate','lat','lng','egoSpeedKmh','surroundingVehicles','stoppedRate','trafficLight','reason'];downloadFile(`machimamo-drive-${fullSessionId}.csv`,'text/csv;charset=utf-8','\ufeff'+fields.join(',')+'\n'+rows.map(row=>fields.map(key=>csvCell(row[key])).join(',')).join('\n'));}
    function renderFullControls(items){const target=document.getElementById('driveTestFullControls');if(!target)return;const sessions=[...new Map(items.map(x=>[x.id,x])).values()];if(!sessions.length){target.textContent='セッションがありません。';return;}if(!sessions.some(x=>x.id===fullSessionId))fullSessionId=sessions[0].id;
        target.innerHTML=`<label>セッション <select id="driveFullSession">${sessions.map(x=>`<option value="${x.id}" ${x.id===fullSessionId?'selected':''}>${x.label}／${new Date(x.startedAt).toLocaleString('ja-JP')}／全${x.counters.candidates}候補</option>`).join('')}</select></label>
        <label style="display:block;margin-top:6px">分類 <select id="driveFullFilter"><option value="all">全分類</option><option value="roadside">路上停車候補</option><option value="congestion">渋滞候補</option><option value="signal_wait">信号待ち候補</option><option value="indeterminate">判別不能</option></select></label>
        <div style="display:flex;gap:6px;margin:7px 0"><button id="driveExportCsv">CSV出力</button><button id="driveExportJson">JSON出力</button></div>`;
        const filter=document.getElementById('driveFullFilter');filter.value=fullFilter;document.getElementById('driveFullSession').onchange=e=>{fullSessionId=e.target.value;fullPage=0;renderFullEvents();};filter.onchange=e=>{fullFilter=e.target.value;fullPage=0;renderFullEvents();};document.getElementById('driveExportCsv').onclick=()=>exportEvents('csv');document.getElementById('driveExportJson').onclick=()=>exportEvents('json');renderFullEvents();}
    async function renderFullEvents(){const target=document.getElementById('driveTestFullEvents');if(!target)return;target.textContent='全件ログを読み込み中…';try{const rows=await eventRows(fullSessionId,fullFilter),pageSize=50,pages=Math.max(1,Math.ceil(rows.length/pageSize));fullPage=Math.min(fullPage,pages-1);const page=rows.slice(fullPage*pageSize,(fullPage+1)*pageSize),thumbs=await thumbRows(page.map(x=>x.id)),byId=new Map(thumbs.map(x=>[x.id,x]));target.innerHTML=`<p style="font-size:.7rem">該当 ${rows.length}件・${fullPage+1}/${pages}ページ</p><div id="driveFullGrid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px"></div><div style="display:flex;justify-content:space-between;margin-top:7px"><button id="driveFullPrev" ${fullPage===0?'disabled':''}>前へ</button><button id="driveFullNext" ${fullPage>=pages-1?'disabled':''}>次へ</button></div>`;const grid=document.getElementById('driveFullGrid');for(const event of page){const card=document.createElement('article');card.style.cssText='background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:5px;font-size:.62rem';const row=byId.get(event.id);if(row){const url=URL.createObjectURL(row.blob);thumbUrls.push(url);const img=document.createElement('img');img.src=url;img.alt='車載テスト候補';img.style.cssText='width:100%;height:auto;border-radius:5px';card.append(img);}const text=document.createElement('div');text.textContent=`${event.classification}／${new Date(event.at).toLocaleString('ja-JP')}／GPS ${event.lat===null?'未取得':event.lat.toFixed(5)+','+event.lng.toFixed(5)}／速度 ${event.egoSpeedKmh===null?'未取得':event.egoSpeedKmh.toFixed(1)+'km/h'}／周辺 ${event.surroundingVehicles}台／同時停止 ${event.stoppedRate===null?'未取得':(event.stoppedRate*100).toFixed(0)+'%'}／${event.reason}`;card.append(text);grid.append(card);}document.getElementById('driveFullPrev').onclick=()=>{fullPage--;renderFullEvents();};document.getElementById('driveFullNext').onclick=()=>{fullPage++;renderFullEvents();};}catch(_){target.textContent='全件ログを読み込めませんでした。';}}
    cleanupThumbs();
    try { const active=JSON.parse(localStorage.getItem(KEY+'_active')||'null');if(active?.schemaVersion===1&&!active.endedAt){session=active;session.classifications||={roadside:0,congestion:0,signal_wait:0,indeterminate:0};session.events||=[];startWatch();} } catch (_) { localStorage.removeItem(KEY+'_active'); }
    root.MachimamoDriveTestLog={start,end,increment,category,bytes,thermal,position,recordEvent,history:()=>load().map(summary),active:()=>session?summary(session):null,renderAdmin:render};
})(typeof window!=='undefined'?window:globalThis);
