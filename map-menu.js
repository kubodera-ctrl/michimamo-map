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
    modal.addEventListener('click', event => {
        if (event.target === modal) { window.closeMapMenu(); return; }
        const action = event.target.closest('[data-map-action]')?.dataset.mapAction;
        if (!action) return;
        window.closeMapMenu();
        if (action === 'wbgt') window.openWbgtModal();
        else if (action === 'aed') window.openNearbySafety('aed');
        else if (action === 'police') window.openNearbySafety('police');
        else if (action === 'camera') startAIPatrol();
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
