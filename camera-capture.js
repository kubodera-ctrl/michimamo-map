(function (root) {
    'use strict';
    const clamp = n => Math.max(0, Math.min(1, n));
    function normalizedPoint(x, y, rect) {
        if (![x,y,rect.left,rect.top,rect.width,rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) throw Error('invalid_pointer');
        return { x:clamp((x - rect.left) / rect.width), y:clamp((y - rect.top) / rect.height) };
    }
    function regionFromPoints(a, b, kind) {
        return { x:Math.min(a.x,b.x), y:Math.min(a.y,b.y), width:Math.abs(a.x-b.x), height:Math.abs(a.y-b.y), kind };
    }
    function pixelBounds(box, width, height) {
        if (![box.x,box.y,box.width,box.height].every(Number.isFinite) || box.x < 0 || box.y < 0 || box.width <= 0 || box.height <= 0 || box.x + box.width > 1.000001 || box.y + box.height > 1.000001) throw Error('invalid_region');
        const x=Math.floor(box.x*width), y=Math.floor(box.y*height);
        return { x, y, width:Math.min(width-x,Math.ceil((box.x+box.width)*width)-x), height:Math.min(height-y,Math.ceil((box.y+box.height)*height)-y) };
    }
    root.MachimamoCameraPrivacy = { normalizedPoint, regionFromPoints, pixelBounds };
    if (typeof document === 'undefined') return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="cameraPhotoDialog" aria-labelledby="cameraPhotoTitle">
        <header><h2 id="cameraPhotoTitle">写真の保護・確認</h2><button type="button" class="photo-close" aria-label="写真を破棄して閉じる">×</button></header>
        <div class="photo-body">
          <p id="cameraPhotoTime" class="photo-note"></p>
          <p><strong>最初は画像全体にモザイクをかけています。</strong></p>
          <p class="photo-note">対応端末では「顔を検出してモザイク」を試せます。ナンバーは未対応です。「範囲を選び直す」で元画像を表示し、隠す場所を指で囲んでください。確実に隠したい場所には「黒塗り」を使えます。</p>
          <div class="photo-tools">
            <button type="button" id="cameraPhotoSelect">範囲を選び直す</button>
            <button type="button" id="cameraPhotoDetect">顔を検出してモザイク（試験）</button>
            <button type="button" id="cameraPhotoAll">全体モザイク</button>
            <button type="button" id="cameraPhotoUndo">1つ戻す</button>
          </div>
          <div class="photo-tools" role="group" aria-label="隠し方">
            <button type="button" id="cameraPhotoMosaic" aria-pressed="true">モザイク</button>
            <button type="button" id="cameraPhotoSolid" aria-pressed="false">黒塗り</button>
          </div>
          <canvas id="cameraPhotoCanvas" aria-label="加工画像。指でドラッグして隠す範囲を選択"></canvas>
          <p class="photo-note">画像上は範囲選択、その外側は上下スクロールです。</p>
          <p id="cameraPhotoStatus" role="status" class="photo-note"></p>
          <label class="photo-check"><input type="checkbox" id="cameraPhotoChecked"><span>画像全体を確認し、顔・ナンバーなどの隠し漏れがないことを確認しました</span></label>
          <p class="photo-note">確認後は地図へ移動します。現在地から50m以内の投稿位置を選び、種類などを入力して投稿してください。加工画像は端末へ保存せず、投稿後も一般公開しません。</p>
          <details class="photo-evidence"><summary>事故・事件に備えて元画像を非公開で10日保存する（任意）</summary><p class="photo-note">万が一、事故・事件に関係した場合に、現場の状況を確認する資料として保管します。所轄警察署など関係機関から依頼があった際は、管理者が依頼内容と提供の可否を確認し、必要な範囲で提供する場合があります。自動で提出するものではなく、証拠としての採用を保証するものでもありません。元画像は一般公開せず、通常10日で削除します。必要な場合は管理者が理由を記録して30日保全し、その満了後7日以内に延長判断がなければ削除します。</p><label class="photo-check"><input type="checkbox" id="cameraEvidenceConsent"><span>元画像（顔・ナンバーを含む場合があります）の非公開保存、上記目的での関係機関への提供、期限後の削除に同意します</span></label><button type="button" id="cameraEvidenceSave" disabled>元画像を非公開で10日保存</button></details>
        </div>
        <footer><button type="button" id="cameraPhotoSave" disabled>投稿へ進む</button></footer>
      </dialog>`);
    const $ = id => document.getElementById(id);
    const dialog=$('cameraPhotoDialog'), canvas=$('cameraPhotoCanvas'), checked=$('cameraPhotoChecked');
    const detect=$('cameraPhotoDetect');
    const save=$('cameraPhotoSave'), shutter=$('cameraShutter'), status=$('cameraPhotoStatus'), evidenceConsent=$('cameraEvidenceConsent'), evidenceSave=$('cameraEvidenceSave');
    let state=null, ready=false, pointer=null, tool='mosaic';
    function sync() {
        shutter.disabled=!ready || dialog.open;
        save.disabled=!state || !state.rendered || !checked.checked || !!pointer || state.exporting || state.detecting;
        detect.disabled=!state || state.failed || state.detecting || !root.MachimamoCameraDetection?.supported();
        detect.textContent=root.MachimamoCameraDetection?.supported() ? '顔を検出してモザイク（試験）' : 'この端末は顔検出未対応';
        $('cameraPhotoUndo').disabled=!state || !state.regions.length;
        evidenceSave.disabled=!state || !evidenceConsent.checked || state.evidenceSaving || state.evidenceSaved;
    }
    function fit() {
        if (!dialog.open) return;
        const z=parseFloat(getComputedStyle(document.documentElement).zoom)||1;
        const vv=root.visualViewport, w=(vv?.width||root.innerWidth)/z, h=(vv?.height||root.innerHeight)/z;
        const inset=Math.min(12,w/20,h/20), width=Math.min(620,w-inset*2);
        Object.assign(dialog.style,{width:width+'px',height:Math.max(1,h-inset*2)+'px',left:((vv?.offsetLeft||0)/z+(w-width)/2)+'px',top:((vv?.offsetTop||0)/z+inset)+'px'});
    }
    function paint(selection) {
        if (!state || state.failed) return;
        state.rendered=false;
        try {
            const ctx=canvas.getContext('2d');
            if (!ctx) throw Error('canvas_unavailable');
            ctx.clearRect(0,0,canvas.width,canvas.height);
            ctx.imageSmoothingEnabled=true;
            ctx.drawImage(state.original,0,0);
            for (const box of state.regions) {
                const b=pixelBounds(box,canvas.width,canvas.height);
                if (box.kind==='solid') { ctx.fillStyle='#111827';ctx.fillRect(b.x,b.y,b.width,b.height);continue; }
                const tile=document.createElement('canvas');
                tile.width=Math.max(1,Math.floor(b.width/32));tile.height=Math.max(1,Math.floor(b.height/32));
                // Sample already-protected pixels: overlapping masks cannot restore source pixels.
                const small=tile.getContext('2d'); if (!small) throw Error('canvas_unavailable');
                small.drawImage(canvas,b.x,b.y,b.width,b.height,0,0,tile.width,tile.height);
                ctx.imageSmoothingEnabled=false;
                ctx.drawImage(tile,0,0,tile.width,tile.height,b.x,b.y,b.width,b.height);
                tile.width=tile.height=1;
            }
            if (selection && selection.width>0 && selection.height>0) {
                const b=pixelBounds(selection,canvas.width,canvas.height);
                ctx.strokeStyle='#f59e0b';ctx.lineWidth=Math.max(2,canvas.width/250);ctx.strokeRect(b.x,b.y,b.width,b.height);
            }
            state.rendered=true;
        } catch (_) {
            state.failed=true;
            canvas.width=canvas.height=1;
            checked.checked=false;
            status.textContent='加工できませんでした。この写真は保存せず、閉じて撮り直してください。';
        }
        sync();
    }
    function edited() {
        if (!state) return;
        state.version++;checked.checked=false;
        status.textContent=state.regions.length ? '加工後の画像全体を確認してください。' : 'まだ隠す範囲がありません。顔・ナンバーなどの写り込みを確認してください。';
        paint();
    }
    function discard() {
        pointer=null;
        if (state) { clearTimeout(state.detectionTimer); if(state.detectionImage)state.detectionImage.width=state.detectionImage.height=1; state.original.width=state.original.height=1;state=null; }
        canvas.width=canvas.height=1;checked.checked=false;evidenceConsent.checked=false;
        sync();
    }
    function capture() {
        if (!ready || dialog.open || document.hidden) return false;
        const video=$('videoElement');
        if (video.readyState<2 || !video.videoWidth || !video.videoHeight || !video.srcObject) { root.showToast?.('映像の準備ができてから、もう一度撮影してください。');return false; }
        try {
            const original=document.createElement('canvas');
            const scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));
            original.width=Math.max(1,Math.round(video.videoWidth*scale));original.height=Math.max(1,Math.round(video.videoHeight*scale));
            const ctx=original.getContext('2d'); if(!ctx)throw Error('canvas_unavailable');
            ctx.drawImage(video,0,0,original.width,original.height);
            const capturedAt=new Date();
            state={original,capturedAt,regions:[{x:0,y:0,width:1,height:1,kind:'mosaic'}],version:0,rendered:false,exporting:false,detecting:false,initialMask:true};
            canvas.width=original.width;canvas.height=original.height;
            checked.checked=false;evidenceConsent.checked=false;pointer=null;
            $('cameraPhotoTime').textContent='撮影日時：'+capturedAt.toLocaleString('ja-JP');
            status.textContent='全体モザイクで表示中です。必要な範囲だけ隠す場合は「範囲を選び直す」を押してください。';
            dialog.showModal();fit();dialog.querySelector('.photo-body').scrollTop=0;paint();sync();
            return true;
        } catch (_) { if(dialog.open)dialog.close();discard();root.showToast?.('撮影できませんでした。もう一度お試しください。');return false; }
    }
    root.MachimamoCameraCapture={capture,setReady(value){ready=!!value;sync();},reset(){ready=false;if(dialog.open)dialog.close();discard();}};
    shutter.onclick=capture;
    dialog.querySelector('.photo-close').onclick=()=>dialog.close();
    dialog.addEventListener('close',discard);
    $('cameraPhotoSelect').onclick=()=>{if(state){pointer=null;state.initialMask=false;state.regions=[];edited();}};
    $('cameraPhotoAll').onclick=()=>{if(state){pointer=null;state.regions.push({x:0,y:0,width:1,height:1,kind:'mosaic'});edited();}};
    $('cameraPhotoUndo').onclick=()=>{if(state){pointer=null;state.regions.pop();state.initialMask=false;edited();}};
    detect.onclick=async()=>{
        if(!state || state.failed || state.detecting || pointer || !root.MachimamoCameraDetection?.supported())return;
        const snapshot=state,version=++state.version;
        checked.checked=false;state.detecting=true;sync();
        status.textContent='端末内で顔を確認中です。ナンバーは検出しません。';
        let image;
        try {
            image=document.createElement('canvas');image.width=state.original.width;image.height=state.original.height;
            state.detectionImage=image;
            const ctx=image.getContext('2d');if(!ctx)throw Error('canvas_unavailable');
            ctx.drawImage(state.original,0,0);
            const result=await Promise.race([
                root.MachimamoCameraDetection.detectFaces(image),
                new Promise((_,reject)=>{snapshot.detectionTimer=setTimeout(()=>reject(Error('timeout')),8000);})
            ]);
            if(state!==snapshot || state.version!==version || !dialog.open || document.hidden)return;
            if(!result.length){status.textContent='顔の候補は見つかりませんでした。見落としの可能性があるため、画像全体を確認して手動で隠してください。';return;}
            // Explicit request may replace ONLY the initial full-frame mask; preserve all user masks.
            if(state.initialMask){state.regions.shift();state.initialMask=false;}
            state.regions.push(...result);edited();
            status.textContent='顔の候補 '+result.length+'件にモザイクを追加しました。ナンバーや顔の見落としは手動で隠してください。';
        }catch(_){
            if(state===snapshot && state.version===version)status.textContent='この端末では顔検出を完了できませんでした。現在の加工を残しています。手動で範囲を指定してください。';
        }finally{
            clearTimeout(snapshot.detectionTimer);
            if(image)image.width=image.height=1;
            snapshot.detectionImage=null;snapshot.detecting=false;
            if(state===snapshot)sync();
        }
    };
    function choose(next) {tool=next;$('cameraPhotoMosaic').setAttribute('aria-pressed',String(next==='mosaic'));$('cameraPhotoSolid').setAttribute('aria-pressed',String(next==='solid'));}
    $('cameraPhotoMosaic').onclick=()=>choose('mosaic');$('cameraPhotoSolid').onclick=()=>choose('solid');
    const point=event=>normalizedPoint(event.clientX,event.clientY,canvas.getBoundingClientRect());
    canvas.onpointerdown=event=>{
        if (!state || !state.rendered || pointer || (event.button!==undefined && event.button!==0)) return;
        pointer={id:event.pointerId,start:point(event)};checked.checked=false;state.version++;
        canvas.setPointerCapture(event.pointerId);sync();
    };
    canvas.onpointermove=event=>{if(pointer && pointer.id===event.pointerId)paint(regionFromPoints(pointer.start,point(event),tool));};
    canvas.onpointerup=event=>{
        if(!pointer || pointer.id!==event.pointerId || !state)return;
        const box=regionFromPoints(pointer.start,point(event),tool);pointer=null;
        if(box.width*canvas.width>=3 && box.height*canvas.height>=3)state.regions.push(box);
        edited();
    };
    function cancelPointer(event) {if(pointer && pointer.id===event.pointerId){pointer=null;paint();}}
    canvas.onpointercancel=cancelPointer;canvas.onlostpointercapture=cancelPointer;
    checked.onchange=sync;
    evidenceConsent.onchange=sync;
    evidenceSave.onclick=async()=>{
        if(!state || !evidenceConsent.checked || state.evidenceSaving || state.evidenceSaved)return;
        state.evidenceSaving=true;sync();status.textContent='非公開の保存領域へ送信中です…';
        try{
            await root.MachimamoCameraEvidence.saveOriginal(state.original);
            state.evidenceSaved=true;evidenceConsent.checked=false;
            status.textContent='元画像を非公開で保存しました。通常10日後に削除されます。マイページから早期削除も申請できます。';
        }catch(error){
            status.textContent=error?.message==='login_required'?'保存にはLINEログインが必要です。':'非公開保存を完了できませんでした。もう一度お試しください。';
        }finally{if(state){state.evidenceSaving=false;sync();}}
    };
    save.onclick=()=>{
        if(!state || !state.rendered || !checked.checked || pointer || state.exporting || state.detecting)return;
        const snapshot=state,version=state.version;
        state.exporting=true;paint();
        if(!state.rendered){state.exporting=false;sync();return;}
        try {
            canvas.toBlob(blob=>{
                if(state!==snapshot)return;
                snapshot.exporting=false;sync();
                if(version!==state.version || !checked.checked || !state.rendered || !dialog.open)return;
                if(!blob){status.textContent='投稿用画像を作れませんでした。もう一度お試しください。';return;}
                Promise.resolve(root.startCameraPostDraft?.({file:blob,capturedAt:snapshot.capturedAt,width:canvas.width,height:canvas.height}))
                  .then(started=>{if(state===snapshot&&started){dialog.close();}})
                  .catch(()=>{if(state===snapshot){status.textContent='現在地を取得できませんでした。位置情報を許可して、もう一度お試しください。';}});
            },'image/jpeg',.9);
        }catch(_){if(state===snapshot){state.exporting=false;status.textContent='投稿用画像を作れませんでした。もう一度お試しください。';sync();}}
    };
    root.addEventListener('resize',fit);root.visualViewport?.addEventListener('resize',fit);root.visualViewport?.addEventListener('scroll',fit);
    new MutationObserver(fit).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
    sync();
})(typeof window!=='undefined'?window:globalThis);
