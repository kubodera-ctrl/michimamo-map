(function () {
    'use strict';
    document.body.insertAdjacentHTML('beforeend', `
      <div id="mapMenuModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="mapMenuTitle" aria-hidden="true" inert>
        <div class="sheet map-menu-sheet">
          <div class="map-menu-handle" aria-hidden="true"></div>
          <div class="row"><h2 id="mapMenuTitle" style="margin:0;font-size:20px;">マップメニュー</h2><button class="close" type="button" aria-label="メニューを閉じる" onclick="closeMapMenu()">✕</button></div>
          <div class="map-menu-grid">
            <button class="map-menu-item" type="button" data-map-action="wbgt"><i class="fa-solid fa-sun" aria-hidden="true"></i><span>WBGT予報</span></button>
            <button class="map-menu-item" type="button" data-map-action="aed"><i class="fa-solid fa-heart-pulse" aria-hidden="true"></i><span>近くのAED</span></button>
            <button class="map-menu-item" type="button" data-map-action="police"><i class="fa-solid fa-house" aria-hidden="true"></i><span>近くの交番</span></button>
            <button class="map-menu-item" type="button" data-map-action="camera"><i class="fa-solid fa-camera" aria-hidden="true"></i><span>AIカメラ</span></button>
            <button class="map-menu-item" type="button" data-map-action="official-safety"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>公式防犯・データ</span></button>
            <button class="map-menu-item" type="button" data-map-action="safety-assist"><i class="fa-solid fa-bell" aria-hidden="true"></i><span>緊急サポート</span></button>
          </div>
        </div>
      </div>`);
    const modal = document.getElementById('mapMenuModal');
    const trigger = document.getElementById('mapMenuBtn');
    window.openMapMenu = function () {
        modal.inert = false; modal.setAttribute('aria-hidden','false');modal.classList.add('open');
        trigger.setAttribute('aria-expanded','true');modal.querySelector('.close').focus();
    };
    window.closeMapMenu = function () {
        trigger.focus();modal.classList.remove('open');modal.inert = true;
        modal.setAttribute('aria-hidden','true');trigger.setAttribute('aria-expanded','false');
    };
    // On-demand only, from constant same-origin assets. No external script,
    // location access, Supabase call, posting, or tracking on menu opening.
    const loaded = new Map();
    function loadMapAsset(scriptPath, cssPath) {
        if (loaded.has(scriptPath)) return loaded.get(scriptPath);
        if (!document.getElementById('machimamo-asset-'+cssPath)) {
            const link = document.createElement('link');link.rel='stylesheet';
            link.id='machimamo-asset-'+cssPath;link.href=cssPath;
            document.head.append(link);
        }
        const operation = new Promise((resolve,reject)=>{
            const script=document.createElement('script');script.src=scriptPath;script.async=true;
            script.onload=resolve;script.onerror=()=>reject(new Error('same-origin safety module not available'));
            document.head.append(script);
        });
        loaded.set(scriptPath,operation);
        operation.catch(()=>loaded.delete(scriptPath));
        return operation;
    }
    async function openOfficialSafety() {
        await loadMapAsset('official-police-hub.js','official-police-layer.css');
        if (!window.MachimamoPoliceHub) throw new Error('official source links unavailable');
        if (!document.getElementById('policeOfficialHubToggle')) {
            const hub=window.MachimamoPoliceHub.mount({doc:document,enabled:true,sourceOnly:true,
                fetcher:window.fetch.bind(window),location:window.location,
                openNearby:typeof window.openNearbySafety==='function'
                    ? k=>window.openNearbySafety(k):undefined});
            if (!hub) throw new Error('existing MAP source panel unavailable');
            window.MachimamoPoliceHubController=hub;
            hub.refresh({national:'official_source_registry.json'}).catch(()=>{});
        }
        const chip=document.getElementById('policeOfficialHubToggle');
        if (chip && chip.getAttribute('aria-expanded')!=='true') chip.click();
    }
    async function openSafetyAssist() {
        await loadMapAsset('safety-assist.js','safety-assist.css');
        if (typeof window.MachimamoSafetyAssist?.open !== 'function') throw new Error('safety module not available');
        window.MachimamoSafetyAssist.open();
    }
    function showLoadError(error) {
        // Do not promise emergency calls or silently fail; no automatic dialing.
        window.alert?.('安全サポートを開けませんでした。緊急時は直接110番・119番へ連絡してください。');
    }

    modal.addEventListener('click', event => {
        if (event.target === modal) { window.closeMapMenu(); return; }
        const action = event.target.closest('[data-map-action]')?.dataset.mapAction;
        if (!action) return;
        window.closeMapMenu();
        if (action === 'wbgt') window.openWbgtModal();
        else if (action === 'aed') window.openNearbySafety('aed');
        else if (action === 'police') window.openNearbySafety('police');
        else if (action === 'camera') startAIPatrol();
        else if (action === 'official-safety') openOfficialSafety().catch(showLoadError);
        else if (action === 'safety-assist') openSafetyAssist().catch(showLoadError);
    });
    modal.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault();window.closeMapMenu();return; }
        if (event.key !== 'Tab') return;
        const buttons = Array.from(modal.querySelectorAll('button'));
        const first = buttons[0],last = buttons[buttons.length-1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault();last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault();first.focus(); }
    });
})();
