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
          <p class="photo-note">自動の顔・ナンバー検出はまだありません。「範囲を選び直す」で元画像を表示し、隠す場所を指で囲んでください。確実に隠したい場所には「黒塗り」を使えます。</p>
          <div class="photo-tools">
            <button type="button" id="cameraPhotoSelect">範囲を選び直す</button>
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
          <p class="photo-note">加工画像だけを端末へ保存します。サーバーへの送信・地図への投稿は行いません。閉じる・再読み込み・画面を離れると、未保存の写真と編集内容は破棄されます。</p>
        </div>
        <footer><button type="button" id="cameraPhotoSave" disabled>加工画像を端末へ保存</button></footer>
      </dialog>`);
    const $ = id => document.getElementById(id);
    const dialog=$('cameraPhotoDialog'), canvas=$('cameraPhotoCanvas'), checked=$('cameraPhotoChecked');
    const save=$('cameraPhotoSave'), shutter=$('cameraShutter'), status=$('cameraPhotoStatus');
    let state=null, ready=false, pointer=null, tool='mosaic';
    function sync() {
        shutter.disabled=!ready || dialog.open;
        save.disabled=!state || !state.rendered || !checked.checked || !!pointer || state.exporting;
        $('cameraPhotoUndo').disabled=!state || !state.regions.length;
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
        if (state) { state.original.width=state.original.height=1;state=null; }
        canvas.width=canvas.height=1;checked.checked=false;
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
            state={original,capturedAt,regions:[{x:0,y:0,width:1,height:1,kind:'mosaic'}],version:0,rendered:false,exporting:false};
            canvas.width=original.width;canvas.height=original.height;
            checked.checked=false;pointer=null;
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
    $('cameraPhotoSelect').onclick=()=>{if(state){pointer=null;state.regions=[];edited();}};
    $('cameraPhotoAll').onclick=()=>{if(state){pointer=null;state.regions.push({x:0,y:0,width:1,height:1,kind:'mosaic'});edited();}};
    $('cameraPhotoUndo').onclick=()=>{if(state){pointer=null;state.regions.pop();edited();}};
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
    save.onclick=()=>{
        if(!state || !state.rendered || !checked.checked || pointer || state.exporting)return;
        const snapshot=state,version=state.version;
        state.exporting=true;paint();
        if(!state.rendered){state.exporting=false;sync();return;}
        try {
            canvas.toBlob(blob=>{
                if(state!==snapshot)return;
                snapshot.exporting=false;sync();
                if(version!==state.version || !checked.checked || !state.rendered || !dialog.open)return;
                if(!blob){status.textContent='保存用画像を作れませんでした。もう一度お試しください。';return;}
                const url=URL.createObjectURL(blob),link=document.createElement('a');
                link.href=url;link.download='machimamo-masked-'+snapshot.capturedAt.toISOString().replace(/[:.]/g,'-')+'.jpg';
                document.body.append(link);link.click();link.remove();
                setTimeout(()=>URL.revokeObjectURL(url),60000);
                status.textContent='加工画像の保存をブラウザーへ渡しました。ダウンロード先を確認してください。';
            },'image/jpeg',.9);
        }catch(_){if(state===snapshot){state.exporting=false;status.textContent='保存できませんでした。もう一度お試しください。';sync();}}
    };
    root.addEventListener('resize',fit);root.visualViewport?.addEventListener('resize',fit);root.visualViewport?.addEventListener('scroll',fit);
    new MutationObserver(fit).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
    sync();
})(typeof window!=='undefined'?window:globalThis);
