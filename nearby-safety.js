(function () {
    'use strict';
    // Location is used only for the current search and never persisted by this feature.
    let sequence = 0, category = 'aed', origin = null, radius = 5000, opener = null;
    const labels = { aed: 'AED', police_station: '警察署', koban: '交番', chuzaisho: '駐在所' };
    document.body.insertAdjacentHTML('beforeend', `
        <div id="nearbySafetyModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="nearbySafetyTitle" aria-hidden="true" inert>
          <div class="sheet">
            <div class="row"><h2 id="nearbySafetyTitle" style="margin:0;font-size:20px;">近くの安全スポット</h2><button class="close" type="button" aria-label="近くの安全スポットを閉じる" onclick="closeNearbySafety()">✕</button></div>
            <div class="nearby-tabs" role="group" aria-label="探す施設">
              <button type="button" data-nearby-category="aed" aria-pressed="true" onclick="selectNearbyCategory('aed')">AED</button>
              <button type="button" data-nearby-category="police" aria-pressed="false" onclick="selectNearbyCategory('police')">交番・警察署</button>
            </div>
            <div class="nearby-origin-actions"><button type="button" onclick="locateNearbySafety()">現在地で更新</button><button type="button" onclick="searchNearbyMapCenter()">地図の中心から探す</button></div>
            <p class="nearby-note">登録済みの施設から直線距離が近い順に表示します。道のり・所要時間はGoogleマップで確認してください。すべての施設を網羅しているわけではありません。</p>
            <p id="nearbyAedNote" class="nearby-note">AEDの利用時間や入口は現地でも確認してください。緊急時は119番へ通報し、通信指令員の指示に従ってください。</p>
            <div id="nearbySafetyResults" aria-live="polite"></div>
          </div>
        </div>`);
    const modal = document.getElementById('nearbySafetyModal');
    const results = document.getElementById('nearbySafetyResults');
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const isOpen = () => modal.classList.contains('open');
    function selectTab() {
        modal.querySelectorAll('[data-nearby-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.nearbyCategory === category)));
        document.getElementById('nearbyAedNote').hidden = category !== 'aed';
    }
    function message(text) { results.innerHTML = `<div class="nearby-status">${escape(text)}</div>`; }
    function distance(value) {
        const meters = Number(value);
        return meters < 1000 ? `約${Math.max(10, Math.round(meters / 10) * 10)}m` : `約${(meters / 1000).toFixed(1)}km`;
    }
    function originLabel(point) {
        if (point.basis === 'map') return '地図の中心から';
        return `現在地から（取得 ${new Intl.DateTimeFormat('ja-JP', {hour:'2-digit',minute:'2-digit'}).format(new Date(point.time))}／位置精度 約${Math.round(point.accuracy)}m）`;
    }
    function render(rows, point, searchRadius) {
        const heading = `${originLabel(point)}・半径${searchRadius / 1000}km以内の近い順、最大20件`;
        const precision = point.basis === 'gps' && point.accuracy > 100 ? '<p class="nearby-note">現在地の誤差が大きいため、距離や並び順は目安です。「現在地で更新」から再取得できます。</p>' : '';
        results.innerHTML = `<div class="nearby-status">${escape(heading)}</div>${precision}` + (rows.length ? rows.map(spot => {
            const nav = buildSafetyNavigationUrl(spot.lat, spot.lng);
            const source = /^https:\/\//i.test(spot.source_url || '') ? spot.source_url : null;
            const date = String(spot.source_updated_at || spot.source_date || '').slice(0,10) || '不明';
            return `<article class="nearby-card">
                <div class="nearby-meta"><span>${escape(labels[spot.facility_type] || '安全スポット')}</span><span>直線 ${escape(distance(spot.distance_m))}</span></div>
                <h3>${escape(spot.name)}</h3><p>${escape(spot.address || '住所情報なし')}</p>
                <p>設置場所：${escape(spot.installation_location || '詳細情報なし。現地の案内をご確認ください。')}</p>
                <p>利用時間：${escape(spot.availability || '情報なし。施設への確認が必要です。')}</p>
                ${nav ? `<a class="nearby-nav" href="${escape(nav)}" target="_blank" rel="noopener noreferrer">ここまでナビ</a>` : ''}
                <details><summary>出典・位置情報</summary>
                  ${source ? `<a href="${escape(source)}" target="_blank" rel="noopener noreferrer">${escape(spot.source_name || '情報元')}</a>` : escape(spot.source_name || '情報元不明')}
                  <div>データ基準日：${escape(date)}</div><div>${escape(spot.source_license || '')}</div>
                  <div>位置情報：${escape(spot.geocode_source || '詳細不明')}。実際の入口・設置場所と異なる場合があります。</div>
                </details>
            </article>`;
        }).join('') : '<div class="nearby-status">この範囲に掲載済みの候補が見つかりませんでした。実際に施設がないという意味ではありません。</div>')
        + (searchRadius < 10000 ? '<button type="button" class="nearby-expand" onclick="expandNearbySafety()">半径10kmまで広げる</button>' : '');
    }
    async function search() {
        if (!origin || !isOpen()) return;
        const request = ++sequence, point = {...origin}, searchCategory = category, searchRadius = radius;
        message(`${originLabel(point)}、候補を探しています…`);
        let timer;
        try {
            const response = await Promise.race([
                db.rpc('get_nearby_safety_spots', { p_latitude: point.lat, p_longitude: point.lng, p_category: searchCategory, p_radius_m: searchRadius, p_limit: 20 }),
                new Promise((_,reject) => { timer = setTimeout(() => reject(new Error('timeout')), 12000); })
            ]);
            if (request !== sequence || !isOpen()) return;
            if (response.error || !Array.isArray(response.data)) throw new Error('search_failed');
            render(response.data, point, searchRadius);
        } catch (_) {
            if (request === sequence && isOpen()) message('候補を取得できませんでした。通信環境を確認し、「現在地で更新」または「地図の中心から探す」で再試行してください。');
        } finally { clearTimeout(timer); }
    }
    window.openNearbySafety = function () {
        opener = document.activeElement;
        category = 'aed'; origin = null; radius = 5000;
        selectTab(); modal.inert = false; modal.setAttribute('aria-hidden','false'); modal.classList.add('open');
        modal.querySelector('.close').focus();
        window.locateNearbySafety();
    };
    window.closeNearbySafety = function () {
        ++sequence; origin = null;
        modal.classList.remove('open'); modal.inert = true; modal.setAttribute('aria-hidden','true');
        results.textContent = ''; opener?.focus();
    };
    window.locateNearbySafety = function () {
        const request = ++sequence; origin = null; radius = 5000;
        message('現在地を取得しています。位置情報の利用を許可してください。');
        if (!navigator.geolocation) { message('この端末では現在地を取得できません。「地図の中心から探す」を利用してください。'); return; }
        navigator.geolocation.getCurrentPosition(position => {
            if (request !== sequence || !isOpen()) return;
            const c = position.coords;
            if (![c.latitude,c.longitude,c.accuracy].every(Number.isFinite) || c.accuracy < 0) { message('現在地を確認できませんでした。地図の中心から探してください。'); return; }
            origin = {lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,time:Date.now(),basis:'gps'};
            search();
        }, error => {
            if (request !== sequence || !isOpen()) return;
            message(error.code === 1 ? '位置情報が許可されていません。端末の設定を確認するか、「地図の中心から探す」を利用してください。' : '現在地を取得できませんでした。もう一度取得するか、「地図の中心から探す」を利用してください。');
        }, {enableHighAccuracy:true,timeout:8000,maximumAge:30000});
    };
    window.searchNearbyMapCenter = function () {
        const center = map.getCenter(); radius = 5000;
        origin = {lat:center.lat,lng:center.lng,basis:'map'};
        search();
    };
    window.selectNearbyCategory = function (next) {
        if (!['aed','police'].includes(next)) return;
        category = next; radius = 5000; selectTab();
        if (origin) search();
        // If GPS is still pending it will search the most recently selected category.
    };
    window.expandNearbySafety = function () { radius = 10000; search(); };
    modal.addEventListener('click', event => { if (event.target === modal) window.closeNearbySafety(); });
    modal.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); window.closeNearbySafety(); }
        if (event.key !== 'Tab') return;
        const items = Array.from(modal.querySelectorAll('button,a[href],summary')).filter(el => !el.disabled && el.getClientRects().length);
        const first = items[0], last = items[items.length-1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
})();
