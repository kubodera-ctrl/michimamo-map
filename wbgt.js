(function () {
    'use strict';

    const WBGT_ENDPOINT = 'https://ckftozjhdszlwqnylmxv.supabase.co/functions/v1/wbgt';
    const levelClasses = {
        '危険': 'level-danger',
        '厳重警戒': 'level-severe',
        '警戒': 'level-warning',
        '注意': 'level-caution',
        '暑さ指数21未満': 'level-low'
    };

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        })[char]);
    }

    function formatOfficialTime(value) {
        const match = String(value || '').match(/^\d{4}\/\d{2}\/\d{2} (\d{2}:\d{2})/);
        return match ? match[1] : '不明';
    }

    function formatValue(value) {
        const number = Number(value);
        return Number.isInteger(number) ? String(number) : number.toFixed(1);
    }

    function currentOrMapCenter() {
        if (Number.isFinite(userLat) && Number.isFinite(userLng)) {
            return Promise.resolve({ lat: userLat, lng: userLng, basis: '現在地' });
        }
        if (!navigator.geolocation) {
            const center = map.getCenter();
            return Promise.resolve({ lat: center.lat, lng: center.lng, basis: '現在地を取得できなかったため、MAP中心地点' });
        }
        return new Promise(resolve => {
            navigator.geolocation.getCurrentPosition(
                position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, basis: '現在地' }),
                () => {
                    const center = map.getCenter();
                    resolve({ lat: center.lat, lng: center.lng, basis: '現在地を取得できなかったため、MAP中心地点' });
                },
                { enableHighAccuracy: true, timeout: 7000, maximumAge: 5 * 60 * 1000 }
            );
        });
    }

    function showLoading() {
        document.getElementById('wbgtContent').innerHTML = '<div class="wbgt-state"><div class="wbgt-spinner"></div>現在地周辺の暑さ指数を確認しています…</div>';
    }

    function showError(message) {
        document.getElementById('wbgtContent').innerHTML = `
            <div class="wbgt-state">
                <i class="fa-solid fa-circle-exclamation" style="font-size:2rem;color:#b91c1c;margin-bottom:10px;"></i><br>
                <strong>${escapeHtml(message || '暑さ指数を取得できませんでした')}</strong><br>
                <span style="font-size:.86rem;">古い数値は表示していません。時間をおいて再度お試しください。</span><br>
                <button class="wbgt-retry" onclick="loadWbgt()">もう一度確認</button>
            </div>`;
    }

    function showResult(data, basis) {
        const current = data.current;
        const station = data.station;
        const levelClass = levelClasses[current.level] || 'level-low';
        const maxText = data.todayMax
            ? `${escapeHtml(data.todayMax.label || '本日の最高見込み')}：WBGT ${formatValue(data.todayMax.value)}｜${escapeHtml(data.todayMax.level)}`
            : '本日の最高見込み：取得できませんでした';
        document.getElementById('wbgtContent').innerHTML = `
            <p class="wbgt-place"><strong>${escapeHtml(basis)}</strong><br>最寄りの環境省情報提供地点：${escapeHtml(station.name)}（約${escapeHtml(station.distanceKm)}km）</p>
            <div class="wbgt-card">
                <div class="wbgt-level ${levelClass}">${escapeHtml(current.level)}</div>
                <div class="wbgt-value">WBGT ${formatValue(current.value)}</div>
                <p class="wbgt-guidance">${escapeHtml(current.guidance)}</p>
                <div class="wbgt-max">${maxText}</div>
            </div>
            <div class="wbgt-meta">
                更新：${formatOfficialTime(current.observedAt)}（${current.measured ? '実況実測値' : '実況推定値'}）<br>
                出典：<a href="${escapeHtml(data.source.url)}" target="_blank" rel="noopener noreferrer">環境省 熱中症予防情報サイト</a>
            </div>
            <p class="wbgt-note">※ ${escapeHtml(data.note)}</p>`;
    }

    async function loadWbgt() {
        showLoading();
        try {
            const location = await currentOrMapCenter();
            const url = new URL(WBGT_ENDPOINT);
            url.searchParams.set('lat', location.lat.toFixed(6));
            url.searchParams.set('lng', location.lng.toFixed(6));
            const response = await fetch(url, { method: 'GET', cache: 'no-store' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.current || !data.station) throw new Error(data.message || '暑さ指数を取得できませんでした');
            showResult(data, location.basis);
        } catch (error) {
            showError(error && error.message);
        }
    }

    function openWbgtModal() {
        document.getElementById('wbgtModal').classList.add('open');
        loadWbgt();
    }

    function closeWbgtModal() {
        document.getElementById('wbgtModal').classList.remove('open');
    }

    window.openWbgtModal = openWbgtModal;
    window.closeWbgtModal = closeWbgtModal;
    window.loadWbgt = loadWbgt;
    window.machimamoWbgt = { formatOfficialTime, formatValue };
})();
