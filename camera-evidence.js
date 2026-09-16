(function (root) {
    'use strict';
    const STATES={upload_pending:'送信待ち',active:'10日保存中',preserved:'30日保全中',decision_due:'延長判断待ち',delete_queued:'削除待ち',delete_failed:'削除再試行待ち'};
    let userId=null, adminVersion=0, mineVersion=0;
    const el=id=>document.getElementById(id);
    const date=value=>value?new Date(value).toLocaleString('ja-JP'):'—';
    const errorMessage=error=>String(error?.message||'');
    function dbClient(){if(typeof db==='undefined')throw Error('service_unavailable');return db;}
    function node(tag,text,className){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n;}
    async function session(){const {data,error}=await dbClient().auth.getSession();if(error||!data.session)throw Error('login_required');return data.session;}
    async function sha256(blob){const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');}
    function jpeg(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('encode_failed')),'image/jpeg',.9));}
    const originalRequests=new WeakMap();
    async function saveBlob(blob,width,height,spotId=null,requestId=crypto.randomUUID()){
        await session();
        if(!(blob instanceof Blob)||blob.type!=='image/jpeg'||!Number.isInteger(width)||!Number.isInteger(height))throw Error('invalid_image');
        const prepared=await dbClient().rpc('prepare_camera_evidence_once',{p_spot_id:spotId,p_request_id:requestId});
        if(prepared.error||!prepared.data)throw prepared.error||Error('prepare_failed');
        const evidence=Array.isArray(prepared.data)?prepared.data[0]:prepared.data;
        if(!['active','preserved','decision_due'].includes(evidence.state)){
            const upload=await dbClient().storage.from('camera-evidence').upload(evidence.object_path,blob,{contentType:'image/jpeg',upsert:false});
            // Even a lost upload response may mean success. Finalize verifies stored metadata.
            if(upload.error && evidence.state && evidence.state!=='upload_pending')throw upload.error;
        }
        const finalized=await dbClient().rpc('finalize_camera_evidence',{p_id:evidence.id,p_sha256:await sha256(blob),p_width:width,p_height:height,p_privacy_confirmed:true});
        if(finalized.error)throw finalized.error;
        loadMine();return evidence.id;
    }
    async function saveOriginal(canvas){
        if(!originalRequests.has(canvas))originalRequests.set(canvas,crypto.randomUUID());
        const s=await session(),id=originalRequests.get(canvas),outbox=root.MachimamoPostOutbox;
        const pending=await outbox.pending();
        if(pending){if(pending.id!==id)throw Error('pending_submission');return (await outbox.resume()).result.id;}
        return (await outbox.send({id,userId:s.user.id,kind:'original',file:await jpeg(canvas),width:canvas.width,height:canvas.height,createdAt:Date.now()})).id;
    }
    function evidenceCard(item,admin){
        const card=node('article',null,'camera-evidence-card');card.dataset.id=item.id;
        const head=node('div');head.append(node('strong',STATES[item.state]||item.state),node('span','期限 '+date(item.deadline||item.decision_due_at||item.preserve_until||item.normal_delete_at)));
        card.append(head,node('p',`保存開始 ${date(item.finalized_at||item.created_at)}${item.spot_id?'・投稿 '+item.spot_id:''}`));
        if(item.preserve_reason)card.append(node('p','保全理由：'+item.preserve_reason));
        const actions=node('div',null,'camera-evidence-actions');
        if(item.object_path&&!['delete_queued','delete_failed'].includes(item.state)){const preview=node('button','画像を10分だけ表示');preview.dataset.action='preview';actions.append(preview);}
        if(admin){
            if(['active','preserved','decision_due'].includes(item.state)){const preserve=node('button',item.state==='decision_due'?'30日延長':'30日保全');preserve.dataset.action=item.state==='decision_due'?'extend':'preserve';actions.append(preserve);}
            const del=node('button','削除へ','danger');del.dataset.action='delete';actions.append(del);
        }else if(!['delete_queued','delete_failed'].includes(item.state)){const del=node('button','早期削除を申請','danger');del.dataset.action='owner-delete';actions.append(del);}
        card.append(actions);return card;
    }
    async function preview(item,card){
        const old=card.querySelector('img');if(old){old.remove();return;}
        const {data,error}=await dbClient().storage.from('camera-evidence').createSignedUrl(item.object_path,600);
        if(error||!data?.signedUrl){root.showToast?.('画像を表示できませんでした');return;}
        const img=node('img');img.src=data.signedUrl;img.alt='非公開の証拠画像';img.loading='lazy';card.append(img);
    }
    async function loadMine(){
        const area=el('myCameraEvidenceArea');if(!area)return;
        const version=++mineVersion;area.replaceChildren(node('p','保存状況を確認中…','muted'));
        try{
            const s=await session();const result=await dbClient().from('camera_evidence').select('id,spot_id,state,created_at,finalized_at,normal_delete_at,preserve_until,decision_due_at,object_path,preserve_reason').eq('user_id',s.user.id).neq('state','deleted').order('created_at',{ascending:false});
            if(version!==mineVersion||s.user.id!==userId)return;if(result.error)throw result.error;
            area.replaceChildren();
            if(!result.data.length){area.append(node('p','保存中の非公開画像はありません。','muted'));return;}
            for(const item of result.data){const card=evidenceCard(item,false);card.onclick=async event=>{const action=event.target?.dataset?.action;if(action==='preview')await preview(item,card);if(action==='owner-delete'&&confirm('この画像を削除待ちにしますか？取り消せません。')){const r=await dbClient().rpc('request_my_camera_evidence_deletion',{p_id:item.id});root.showToast?.(r.error?'削除申請に失敗しました':'削除待ちにしました');if(!r.error)loadMine();}};area.append(card);}
        }catch(error){if(version===mineVersion)area.replaceChildren(node('p',errorMessage(error)==='login_required'?'LINEログイン後に確認できます。':'保存状況を取得できませんでした。','muted'));}
    }
    async function loadAdmin(password,isCurrent=()=>true){
        const area=el('adminCameraEvidence');if(!area)return;const version=++adminVersion;
        const result=await dbClient().rpc('admin_camera_evidence',{p_password:password,p_action:'list',p_payload:{}});
        if(version!==adminVersion||!isCurrent())return;
        area.replaceChildren(node('h3','非公開カメラ証拠・保存期限'));
        if(result.error){area.append(node('p','保存期限データを取得できませんでした。','muted'));return;}
        const payload=result.data||{},items=Array.isArray(payload.items)?payload.items:[];
        area.append(node('p',`保存中 ${items.length}件・7日回答待ち ${Number(payload.due_count||0)}件`,'muted'));
        if(!items.length){area.append(node('p','対象はありません。','muted'));return;}
        for(const item of items){const card=evidenceCard(item,true);card.onclick=async event=>{
            const action=event.target?.dataset?.action;if(!action)return;if(action==='preview'){await preview(item,card);return;}
            let reason='';if(action==='preserve'||action==='extend'){reason=(prompt('保全理由を10文字以上で入力してください')||'').trim();if(reason.length<10){root.showToast?.('保全理由は10文字以上必要です');return;}}
            if(action==='delete'&&!confirm('この画像を削除待ちにしますか？取り消せません。'))return;
            const r=await dbClient().rpc('admin_camera_evidence',{p_password:password,p_action:action,p_payload:{id:item.id,reason}});
            root.showToast?.(r.error?'操作を完了できませんでした':'保存期限を更新しました');if(!r.error)loadAdmin(password,isCurrent);
        };area.append(card);}
    }
    async function runRetention(s){
        if(!s?.user?.id)return;const key='michimamo_camera_retention_'+s.user.id,last=Number(localStorage.getItem(key)||0);
        if(Date.now()-last<21600000)return;
        const result=await dbClient().functions.invoke('camera-evidence-retention',{body:{}});
        if(!result.error&&result.data?.status==='completed')localStorage.setItem(key,String(Date.now()));
    }
    function onSession(s){userId=s?.user?.id||null;++mineVersion;if(!userId){const area=el('myCameraEvidenceArea');area?.replaceChildren(node('p','LINEログイン後に確認できます。','muted'));return;}runRetention(s).catch(()=>{});loadMine();}
    root.MachimamoCameraEvidence={saveOriginal,saveBlob,loadMine,loadAdmin,onSession};
    setTimeout(()=>dbClient().auth.getSession().then(({data})=>onSession(data.session)).catch(()=>{}),0);
})(typeof window!=='undefined'?window:globalThis);
