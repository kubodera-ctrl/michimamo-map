(function (root) {
    'use strict';
    const statuses = { pending: '審査待ち', needs_review: '要確認', needs_changes: '修正依頼中' };
    const flags = { duplicate_photo: '同じ写真の投稿あり', coordinate_velocity: '同じ位置付近からの連続投稿', low_gps_accuracy: 'GPS精度が低い' };
    function coordinates(lat, lng) {
        return lat !== null && lat !== '' && lng !== null && lng !== '' &&
            Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
    }
    function create({ db, L, target, review, formatDate }) {
        let generation = 0;
        const maps = new Set();
        function node(tag, text, className) {
            const el = document.createElement(tag);
            if (text !== undefined) el.textContent = text;
            if (className) el.className = className;
            return el;
        }
        function button(text, action) {
            const el = node('button', text, 'aed-review-button');
            el.type = 'button'; el.onclick = action; return el;
        }
        function clear() {
            generation++;
            maps.forEach(map => map.remove()); maps.clear();
            target.replaceChildren();
        }
        function render(rows) {
            clear();
            const current = generation;
            if (!rows.length) { target.append(node('p', '審査待ちのAED投稿はありません。')); return; }
            target.append(node('p', '写真・位置・掲載済み情報を確認して、人が最終判断します。', 'aed-review-note'));
            for (const row of rows) {
                const card = node('details', undefined, 'aed-review-card');
                const summary = node('summary', `${row.facility_name || '名称未設定'} — ${statuses[row.status] || row.status}`);
                card.append(summary, node('p', `${row.address || '住所未入力'} / ${row.installation_location || '設置場所未入力'}`));
                const content = node('div'); card.append(content); target.append(card);
                let opened = false;
                card.ontoggle = () => {
                    if (!card.open || current !== generation) return;
                    if (!opened) { opened = true; openReview(row, content, current); }
                    maps.forEach(map => map.invalidateSize());
                };
            }
        }
        function openReview(row, content, current) {
            const alive = () => current === generation;
            let photoReady = false, nearbyReady = false, selected = null, nearby = [], busy = false;
            let photoVersion = 0, searchVersion = 0, map, markerGroup;
            const validLocation = coordinates(row.latitude, row.longitude);
            const pos = [Number(row.latitude), Number(row.longitude)];
            const accuracy = Number(row.gps_accuracy_m);
            const accuracyText = row.gps_accuracy_m != null && Number.isFinite(accuracy) ? `${Math.round(accuracy)}m` : '不明';
            content.append(node('p', `投稿者：${row.user_name || '名称未設定'} / ${formatDate(row.created_at)} / GPS精度：${accuracyText}`, 'aed-review-note'));
            const warnings = Array.isArray(row.fraud_flags) ? row.fraud_flags : [];
            content.append(node('p', warnings.length ? '自動チェックの注意：' + warnings.map(f => flags[f] || f).join('・') : '自動チェックの注意：なし（正確性を保証するものではありません）', 'aed-review-warning'));
            content.append(node('p', '画像AI：未実施。AED本体・個人情報の写り込みは写真を目視で確認してください。', 'aed-review-note'));
            const grid = node('div', undefined, 'aed-review-grid'); content.append(grid);
            const photoBox = node('section'); grid.append(photoBox);
            photoBox.append(node('h4', '投稿写真（非公開）'));
            const photo = node('img'); photo.alt = '審査対象のAED投稿写真'; photo.className = 'aed-review-photo'; photo.hidden = true;
            photo.referrerPolicy = 'no-referrer';
            const photoStatus = node('p', '', 'aed-review-note'); photoStatus.setAttribute('role', 'status');
            const photoLink = node('a', '写真を別画面で確認'); photoLink.target = '_blank'; photoLink.rel = 'noopener noreferrer'; photoLink.hidden = true;
            const refreshPhoto = button('写真を再取得', loadPhoto);
            photoBox.append(photo, photoStatus, photoLink, refreshPhoto);
            const locationBox = node('section'); grid.append(locationBox);
            locationBox.append(node('h4', '投稿位置と掲載済みAED'), node('p', '青：投稿位置・GPS精度の目安 / 赤：掲載済みAED', 'aed-review-note'));
            const mapBox = node('div', undefined, 'aed-review-map'); mapBox.setAttribute('aria-label', 'AED審査用の位置比較地図'); locationBox.append(mapBox);
            if (validLocation && L) {
                try {
                    map = L.map(mapBox, { scrollWheelZoom: false }).setView(pos, 17); maps.add(map);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    }).addTo(map);
                    L.circleMarker(pos, { color: '#1d4ed8', radius: 9, fillOpacity: 0.9 }).addTo(map).bindPopup(node('span', '投稿位置'));
                    if (row.gps_accuracy_m != null && Number.isFinite(accuracy) && accuracy > 0) L.circle(pos, { radius: accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.08 }).addTo(map);
                    markerGroup = L.layerGroup().addTo(map);
                    locationBox.append(button('投稿位置へ戻る', () => map.setView(pos, 17)));
                } catch (_) { mapBox.textContent = '地図を表示できません。下の座標と候補一覧を確認してください。'; }
            } else mapBox.textContent = '投稿位置を確認できません。';
            locationBox.append(node('p', validLocation ? `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}` : '座標不明', 'aed-review-note'));
            const nearbyStatus = node('p', '', 'aed-review-note'); nearbyStatus.setAttribute('role', 'status');
            const candidates = node('div', undefined, 'aed-review-candidates');
            const searchControls = node('div', undefined, 'aed-review-actions');
            searchControls.append(button('500m以内を確認', () => loadNearby(500)), button('2kmまで広げる', () => loadNearby(2000)));
            content.append(node('h4', '掲載済みAEDとの照合'), searchControls, nearbyStatus, candidates);
            if (row.matched_safety_spot_id) content.append(node('p', `投稿者が指定した掲載済みAED：ID ${row.matched_safety_spot_id}。候補の内容を確認して選択してください。`, 'aed-review-note'));
            const checks = node('fieldset', undefined, 'aed-review-checks'); checks.append(node('legend', '承認前の目視確認'));
            const inputs = ['写真でAED本体を確認した', '施設名・設置場所・住所と投稿位置を照合した', '顔・ナンバーなど個人情報の写り込みを確認した', '掲載済み候補を照合し、新規／掲載済みを判断した'].map(labelText => {
                const label = node('label'), input = node('input'); input.type = 'checkbox'; input.onchange = updateButtons;
                label.append(input, node('span', labelText)); checks.append(label); return input;
            });
            content.append(checks);
            const actionStatus = node('p', '写真と周辺候補を読み込み、確認項目をチェックしてください。', 'aed-review-note'); actionStatus.setAttribute('role', 'status');
            const actions = node('div', undefined, 'aed-review-actions');
            const approveNew = button('新規承認 +30pt', () => decide('approved_new'));
            const approveExisting = button('掲載済み 0pt', () => decide('approved_existing'));
            const needsChanges = button('要修正', () => decide('needs_changes'));
            const reject = button('却下', () => decide('rejected'));
            actions.append(approveNew, approveExisting, needsChanges, reject); content.append(actionStatus, actions);
            function updateButtons() {
                const ready = photoReady && nearbyReady && validLocation && inputs.every(x => x.checked);
                approveNew.disabled = busy || !ready || selected !== null;
                approveExisting.disabled = busy || !ready || selected === null;
                needsChanges.disabled = reject.disabled = busy;
                if (!busy) actionStatus.textContent = ready ? (selected === null ? '新規として承認できます。近くに候補がない場合も、未掲載の保証にはなりません。' : `掲載済みAED ID ${selected} として承認できます。`) : '写真と周辺候補を読み込み、確認項目をチェックしてください。';
            }
            async function loadPhoto() {
                const version = ++photoVersion;
                photoReady = false; photo.hidden = photoLink.hidden = true; photo.removeAttribute('src'); photoLink.removeAttribute('href');
                photoStatus.textContent = '写真を読み込み中…'; updateButtons();
                try {
                    const { data, error } = await db.storage.from('aed-submission-images').createSignedUrl(row.photo_object_path, 600);
                    if (!alive() || version !== photoVersion) return;
                    if (error || !data?.signedUrl) throw error || new Error('photo_unavailable');
                    const url = new URL(data.signedUrl); if (url.protocol !== 'https:') throw new Error('invalid_photo_url');
                    photo.onload = () => { if (!alive() || version !== photoVersion) return; photoReady = true; photo.hidden = false; photoLink.hidden = false; photoStatus.textContent = '表示リンクは発行から10分間有効です。'; updateButtons(); };
                    photo.onerror = () => { if (!alive() || version !== photoVersion) return; photoReady = false; photo.hidden = photoLink.hidden = true; photoStatus.textContent = '写真を表示できません。「写真を再取得」を押してください。'; updateButtons(); };
                    photoLink.href = url.href; photo.src = url.href;
                } catch (_) { if (alive() && version === photoVersion) { photoStatus.textContent = '写真を取得できません。「写真を再取得」でやり直せます。'; updateButtons(); } }
            }
            async function loadNearby(radius) {
                const version = ++searchVersion;
                nearbyReady = false; selected = null; nearby = []; inputs[3].checked = false;
                candidates.replaceChildren(); if (markerGroup) markerGroup.clearLayers(); updateButtons();
                nearbyStatus.textContent = '掲載済みAEDを取得中…';
                if (!validLocation) { nearbyStatus.textContent = '座標が不明なため照合できません。'; return; }
                try {
                    const { data, error } = await db.rpc('get_nearby_safety_spots', { p_latitude: pos[0], p_longitude: pos[1], p_category: 'aed', p_radius_m: radius, p_limit: 20 });
                    if (!alive() || version !== searchVersion) return;
                    if (error || !Array.isArray(data)) throw error || new Error('nearby_unavailable');
                    nearby = data; nearbyReady = true;
                    nearbyStatus.textContent = `${radius}m以内の掲載済みAED：${nearby.length}件（近い順・最大20件）。距離は直線距離です。` + (nearby.length === 20 ? ' 全件表示ではありません。' : '') + ' 同じ建物でも別のAEDの場合があります。';
                    candidates.append(button('掲載済み候補の選択を解除', () => { selected = null; candidates.querySelectorAll('input').forEach(x => { x.checked = false; }); updateButtons(); }));
                    nearby.forEach((item, index) => {
                        const label = node('label', undefined, 'aed-review-candidate'), radio = node('input');
                        radio.type = 'radio'; radio.name = `aed-candidate-${row.id}`;
                        radio.onchange = () => { selected = item.id; updateButtons(); if (map && coordinates(item.lat, item.lng)) map.setView([Number(item.lat), Number(item.lng)], 18); };
                        const text = node('span');
                        text.append(node('strong', `${index + 1}. ${item.name || '名称未設定'}（約${Math.round(Number(item.distance_m))}m）`), node('div', item.address || '住所不明'), node('div', `設置場所：${item.installation_location || '情報なし'}`), node('div', `利用時間：${item.availability || '情報なし'} / 出典：${item.source_name || '不明'} / ID ${item.id}`));
                        label.append(radio, text); candidates.append(label);
                        if (markerGroup && coordinates(item.lat, item.lng)) L.circleMarker([Number(item.lat), Number(item.lng)], { color: '#dc2626', radius: 7, fillOpacity: 0.7 }).addTo(markerGroup).bindPopup(node('span', `${index + 1}. ${item.name || 'AED'}`));
                    });
                    if (map) {
                        const positions = nearby.filter(item => coordinates(item.lat, item.lng)).map(item => [Number(item.lat), Number(item.lng)]);
                        map.fitBounds([pos, ...positions], { padding: [18, 18], maxZoom: 17 });
                    }
                    updateButtons();
                } catch (_) { if (alive() && version === searchVersion) { nearbyStatus.textContent = '照合に失敗しました。範囲ボタンで再取得してください（候補なしとは扱いません）。'; updateButtons(); } }
            }
            async function decide(decision) {
                if (busy || !alive()) return;
                if (decision === 'approved_new' && approveNew.disabled || decision === 'approved_existing' && approveExisting.disabled) return;
                busy = true; updateButtons(); actionStatus.textContent = '審査結果を確認中…';
                try { await review(row.id, decision, decision === 'approved_existing' ? selected : null); }
                catch (_) { actionStatus.textContent = '審査処理に失敗しました。管理画面を再取得して結果を確認してください。'; }
                finally { busy = false; if (alive()) updateButtons(); }
            }
            updateButtons(); loadPhoto(); loadNearby(500);
        }
        return { render, clear };
    }
    root.MachimamoAedReview = { create, coordinates };
})(typeof window !== 'undefined' ? window : globalThis);
