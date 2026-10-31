/* まちまもMAP non-production vNext: opt-in separate official police publication layer.
 * Does not use `spots`, Supabase, RSS `official`, local_anomaly, votes or points.
 */
(function (root) {
  'use strict';
  const SOURCE_ID = 'tokyo_mail_keishicho_opendata';
  const SOURCE_URL = 'https://mail.keishicho.metro.tokyo.lg.jp/opendata/';
  const LABEL = '警視庁公表（公式防犯データ）';
  const PRECISION = {exact: '根拠ある確定座標', town: '町丁目程度', municipality: '区市町村程度', unknown: '位置不明'};

  const httpsFromSource = (value) => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && u.hostname === 'mail.keishicho.metro.tokyo.lg.jp'
        && u.pathname.startsWith('/opendata/') ? u.href : SOURCE_URL;
    } catch (_) { return SOURCE_URL; }
  };
  const el = (doc, tag, text, className) => {
    const n = doc.createElement(tag);
    if (text !== undefined) n.textContent = text;
    if (className) n.className = className;
    return n;
  };
  const visible = (r) => r && r.source_id === SOURCE_ID && ['active', 'corrected'].includes(r.source_status)
    && r.review_status === 'approved' && r.rights_status === 'verified'
    && r.identity_verified === true && r.is_fixture !== true;
  const exactPoint = (r) => visible(r) && r.location_precision === 'exact'
    && r.location_source === 'police_explicit_coordinates'
    && Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))
    && r.latitude !== null && r.longitude !== null
    && Math.abs(Number(r.latitude)) <= 90 && Math.abs(Number(r.longitude)) <= 180;

  function validateSnapshot(data) {
    if (!data || data.schema_version !== 1 || data.source_id !== SOURCE_ID
        || !Array.isArray(data.records) || data.records.length > 20000
        || (data.last_success_at !== null && typeof data.last_success_at !== 'string')) {
      throw new Error('公式情報の形式が確認できません');
    }
    if (data.records.some(r => !r || r.source_id !== SOURCE_ID || typeof r.title !== 'string'
        || typeof r.area_label !== 'string' || typeof r.id !== 'string'
        || !['active', 'corrected', 'withdrawn'].includes(r.source_status)
        || !['pending', 'pending_identity', 'approved', 'rejected'].includes(r.review_status))) {
      throw new Error('公式情報に未確認の項目があります');
    }
    const seen = new Set();
    for (const r of data.records) {
      if (seen.has(r.id)) throw new Error('重複した事案識別子');
      seen.add(r.id);
    }
    return data.records.filter(visible);
  }

  function detail(doc, record) {
    const div = el(doc, 'section', undefined, 'police-official-detail');
    const title = el(doc, 'strong', record.title || '警察公表情報');
    const badge = el(doc, 'span', LABEL, 'police-official-source-badge');
    const date = el(doc, 'p', `公表：${record.published_at || '不明'}／発生：${record.occurred_at || '不明'}／認知：${record.recognized_at || '不明'}`);
    const area = el(doc, 'p', `発生地域：${record.area_label || '不明'}／位置精度：${PRECISION[record.location_precision] || '位置不明'}`);
    const summary = el(doc, 'p', record.summary || '詳細未確認');
    const note = el(doc, 'p', '位置は事件現場を特定するものとは限りません。掲載外の事案もあり、安全を保証する情報ではありません。', 'police-official-disclaimer');
    const attribution = el(doc, 'p', `出典：警視庁『メールけいしちょうOpen DATA』／CC BY 4.0／訂正状態：${record.source_status === 'corrected' ? '訂正済み' : '公開中'}。警察公認アプリではありません。`);
    const link = el(doc, 'a', '警視庁の原典を確認');
    link.href = httpsFromSource(record.source_url);
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    div.append(badge, title, date, area, summary, note, attribution, link);
    return div;
  }

  function createController({doc, map, leaflet, fetcher, location, enabled}) {
    if (!enabled) return null;
    if (!doc || !map || !leaflet || !leaflet.layerGroup || !leaflet.marker) {
      throw new Error('existing Leaflet map is required');
    }
    const bar = doc.querySelector('#filterWrapper .filter-content');
    const mapContainer = doc.getElementById('map-container');
    if (!bar || !mapContainer) throw new Error('existing map filter DOM missing');
    const old = doc.getElementById('policeOfficialFilterToggle');
    if (old) return null; // duplicate-safe UI mount
    const layer = leaflet.layerGroup().addTo(map);
    const button = el(doc, 'button', '警視庁公表', 'filter-chip police-official-filter');
    button.id = 'policeOfficialFilterToggle'; button.type = 'button';
    button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-expanded', 'false');
    const panel = el(doc, 'aside', undefined, 'police-official-panel');
    panel.id = 'policeOfficialPanel'; panel.hidden = true;
    panel.setAttribute('aria-label', '警視庁公表の防犯情報');
    const close = el(doc, 'button', '閉じる', 'police-official-close'); close.type = 'button';
    const head = el(doc, 'div', undefined, 'police-official-heading');
    head.append(el(doc, 'strong', '警視庁公表の防犯情報'), close);
    const status = el(doc, 'p', '公式情報は未読込です。', 'police-official-status');
    status.setAttribute('role', 'status');
    const list = el(doc, 'div', undefined, 'police-official-list');
    panel.append(head, status,
      el(doc, 'p', '利用者の「地域の異変」とは別の警察公表情報です。公式データに投稿ポイントは付きません。', 'police-official-disclaimer'), list);
    bar.append(button); mapContainer.append(panel);

    let currentSnapshot = null;
    let currentRecords = [];
    const markers = [];
    function draw() {
      layer.clearLayers(); markers.length = 0;
      list.replaceChildren();
      if (currentRecords.length === 0) {
        list.append(el(doc, 'p', '確認済みの警察公表情報はありません。', 'police-official-empty'));
      }
      for (const r of currentRecords) {
        list.append(detail(doc, r));
        if (!exactPoint(r)) continue;
        // Marker only for explicitly sourced exact coordinates, never area centroids.
        const m = leaflet.marker([Number(r.latitude), Number(r.longitude)]);
        m.bindPopup(detail(doc, r)); m.addTo(layer); markers.push(m);
      }
      status.textContent = `警察公表 ${currentRecords.length}件／根拠ある地点表示 ${markers.length}件／最終取得：${currentSnapshot?.last_success_at || '不明'}`;
    }
    function open(opened) {
      panel.hidden = !opened;
      button.classList.toggle('active', opened);
      button.setAttribute('aria-pressed', String(opened));
      button.setAttribute('aria-expanded', String(opened));
    }
    button.addEventListener('click', () => open(panel.hidden));
    close.addEventListener('click', () => open(false));
    draw();

    function setSnapshot(snapshot) {
      const validated = validateSnapshot(snapshot); // Validate fully before changing previous good list.
      currentSnapshot = snapshot; currentRecords = validated;
      draw();
      return {visible: currentRecords.length, exact_markers: markers.length};
    }
    async function refresh(sourcePath) {
      const origin = (location && location.origin) || null;
      const url = new URL(sourcePath, (location && location.href) || 'http://localhost/');
      if (!origin || url.origin !== origin || !/^https?:$/.test(url.protocol)) {
        throw new Error('同一オリジン以外からの取得を拒否しました');
      }
      try {
        const res = await fetcher(url.pathname + url.search, {credentials: 'same-origin', cache: 'no-store'});
        if (!res.ok) throw new Error('公式情報の取得失敗');
        return setSnapshot(await res.json());
      } catch (_) {
        status.textContent = `取得失敗：前回の確認済み表示を維持／最終成功：${currentSnapshot?.last_success_at || 'なし'}`;
        return {error: true, preserved: currentRecords.length};
      }
    }
    return {setSnapshot, refresh, close: () => open(false), getState: () => ({visible: currentRecords.length,
      exact_markers: markers.length, last_success_at: currentSnapshot?.last_success_at || null})};
  }

  const api = {SOURCE_ID, visible, exactPoint, validateSnapshot, detail, createController};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MachimamoPoliceOfficial = api;
})(typeof window !== 'undefined' ? window : globalThis);
