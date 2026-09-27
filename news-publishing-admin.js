(function initMachimamoNewsPublishingAdmin() {
  'use strict';

  const SERVICE_ID = 'machimamo';
  const LEGACY_KIND = 'LEGACY_UNVERIFIED';
  const PAGE_SIZE = 500;
  const MAX_ROWS = 2500;
  const PREFECTURES = [
    '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
    '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
    '新潟県','富山県','石川県','福井県','山梨県','長野県',
    '岐阜県','静岡県','愛知県','三重県',
    '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
    '鳥取県','島根県','岡山県','広島県','山口県',
    '徳島県','香川県','愛媛県','高知県',
    '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
  ];

  let candidates = [];
  let loadPromise = null;

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[ch]);
  }

  function isAdminNewsVisible() {
    const dashboard = document.getElementById('adminDashboardArea');
    return document.body.classList.contains('admin-news-qa-only') || dashboard?.style.display === 'block';
  }

  async function fetchLegacyRowsReadOnly() {
    if (typeof db === 'undefined' || !db?.from) throw new Error('supabase_client_unavailable');
    const rows = [];
    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      const to = Math.min(from + PAGE_SIZE - 1, MAX_ROWS - 1);
      const { data, error } = await db.from('spots')
        .select('id,created_at,category,title,comment,address,is_hidden,report_count')
        .eq('category', 'official')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      const page = Array.isArray(data) ? data.filter(row => Number(row.report_count || 0) < 3) : [];
      rows.push(...page);
      if (!Array.isArray(data) || data.length < PAGE_SIZE) break;
    }
    return rows;
  }

  async function loadCandidatesOnce() {
    if (loadPromise) return loadPromise;
    const adapter = window.MachimamoNewsCandidateAdapter;
    if (!adapter) return null;
    const connection = document.getElementById('adminNewsPublishingConnection');
    if (connection) connection.textContent = '既存ニュース候補へ読み取り専用で接続しています…';
    loadPromise = fetchLegacyRowsReadOnly()
      .then(rows => {
        candidates = rows.map(adapter.normalizeLegacySpot).filter(Boolean);
        const section = document.getElementById('adminNewsPublishingSection');
        if (section) section.dataset.connection = 'legacy-read-only';
        if (connection) {
          connection.textContent = `旧official実データ ${candidates.length.toLocaleString()}件を読み取り専用で表示しています。一次ソースURL・verifiedFacts・rights証跡が旧データに無いため全件「要確認」で、生成・公開には使用できません。`;
        }
        renderSingleCandidates();
        renderWeeklyCandidates();
        return candidates;
      })
      .catch(error => {
        console.error('news candidate read-only load failed', error);
        if (connection) connection.textContent = 'ニュース候補の読み取りに失敗しました。生成・公開操作は無効のままです。';
        loadPromise = null;
        return null;
      });
    return loadPromise;
  }

  function findCandidate(candidateId) {
    return candidates.find(item => item.candidateId === candidateId) || null;
  }

  function openCandidateDetail(candidateId) {
    const item = findCandidate(candidateId);
    const detail = window.MachimamoNewsCandidateDetail;
    if (!item || !detail?.open) return;
    detail.open(item);
  }

  function currentFilters() {
    return {
      informationKind: document.getElementById('adminNewsTypeFilter')?.value || 'all',
      prefecture: document.getElementById('adminNewsPrefectureFilter')?.value || '',
      municipality: document.getElementById('adminNewsMunicipalityFilter')?.value || '',
      from: document.getElementById('adminNewsFromFilter')?.value || '',
      to: document.getElementById('adminNewsToFilter')?.value || '',
      status: document.getElementById('adminNewsStatusFilter')?.value || 'all'
    };
  }

  function renderSingleCandidates() {
    const target = document.getElementById('adminNewsSingleRows');
    const adapter = window.MachimamoNewsCandidateAdapter;
    if (!target || !adapter) return;
    const filtered = adapter.filterCandidates(candidates, currentFilters());
    if (!filtered.length) {
      target.innerHTML = '<tr><td colspan="15">条件に一致するニュース候補はありません。検証済みデータが無い場合、候補を作り話で補完しません。</td></tr>';
      return;
    }
    const shown = filtered.slice(0, 100);
    target.innerHTML = shown.map(item => {
      const headline = item.headline || item.title || '名称なし';
      const region = [item.prefecture, item.municipality].filter(Boolean).join(' ') || '地域要確認';
      const legacy = item.informationKind === LEGACY_KIND;
      const canonicalProductionReady =
        item.productionEligible === true ||
        (item.publishEligible === true && item.selection?.include === true);
      const sourceText = legacy ? '要確認' : escapeHtml(item.sourceStatus || '要確認');
      const factsText = legacy ? '要確認' : escapeHtml(item.factsStatus || '要確認');
      const rightsText = legacy ? '要確認' : escapeHtml(item.rightsStatus || '要確認');
      const idLine = legacy
        ? `旧データ #${Number(item.legacySpotId)}`
        : `${escapeHtml(item.informationKind || 'canonical')} / ${escapeHtml(item.sourceEventId || 'sourceEventId要確認')}`;
      return `<tr data-candidate-id="${escapeHtml(item.candidateId)}" role="button" tabindex="0" aria-label="ニュース詳細を開く：${escapeHtml(headline)}">
        <td><strong>${escapeHtml(headline)}</strong><div class="muted" style="font-size:.61rem;margin-top:3px;">${idLine}</div></td>
        <td>${escapeHtml(region)}</td>
        <td>${escapeHtml(item.prefecture || '要確認')}</td>
        <td>${escapeHtml(item.municipality || '要確認')}</td>
        <td>${escapeHtml(item.newsDate || '日付要確認')}</td>
        <td><span style="font-weight:800;">${sourceText}</span>${legacy ? '<div style="font-size:.6rem;">旧official・一次URL未保持</div>' : ''}</td>
        <td><span style="font-weight:800;">${factsText}</span></td>
        <td><span style="font-weight:800;">${rightsText}</span></td>
        <td>${legacy || !canonicalProductionReady ? '不可' : 'Renderer待ち'}</td>
        <td>${legacy ? '不可' : '未接続'}</td>
        <td>${legacy ? '不可' : '未接続'}</td>
        <td>${legacy ? '不可' : '接続設定必要'}</td>
        <td>${legacy ? '不可' : '接続設定必要'}</td>
        <td>${escapeHtml(item.postedAt || '—')}</td>
        <td><button type="button" data-news-detail-id="${escapeHtml(item.candidateId)}">詳細</button></td>
      </tr>`;
    }).join('');
    if (filtered.length > shown.length) {
      target.insertAdjacentHTML('beforeend', `<tr><td colspan="15">${filtered.length.toLocaleString()}件中、最新100件を表示しています。</td></tr>`);
    }
  }

  function renderWeeklyCandidates() {
    const target = document.getElementById('adminWeeklyCandidates');
    const adapter = window.MachimamoNewsCandidateAdapter;
    if (!target || !adapter) return;
    const weekValue = document.getElementById('adminWeeklyWeek')?.value || '';
    const prefecture = document.getElementById('adminWeeklyPrefecture')?.value || '';
    const requestedCount = Number(document.getElementById('adminWeeklyCount')?.value || 6);
    if (!weekValue || !prefecture) {
      target.textContent = '対象週と都道府県を選ぶと、実データ内の候補件数を読み取り専用で確認できます。';
      return;
    }
    const summary = adapter.weeklySummary(candidates, { weekValue, prefecture, requestedCount });
    const count = summary.candidates.length;
    if (!count) {
      target.textContent = `${prefecture}・${weekValue} に一致する旧ニュース候補はありません。架空ニュースで補完しません。`;
      return;
    }
    const examples = summary.candidates.slice(0, Math.min(6, count)).map(item => item.headline || item.title || '名称なし');
    target.innerHTML = `<strong>${escapeHtml(prefecture)} / ${escapeHtml(weekValue)}</strong><br>
      実候補 ${count.toLocaleString()}件 / Production利用可能 0件。選択希望 ${requestedCount}件に対し、全件でsource・facts・rights確認が必要です。
      <div style="margin-top:7px;font-size:.68rem;line-height:1.5;">${examples.map(x => '・' + escapeHtml(x)).join('<br>')}</div>`;
  }

  function bindCandidateDetailNavigation() {
    const target = document.getElementById('adminNewsSingleRows');
    if (!target) return;
    target.addEventListener('click', event => {
      const button = event.target.closest?.('[data-news-detail-id]');
      const row = event.target.closest?.('tr[data-candidate-id]');
      const id = button?.dataset.newsDetailId || row?.dataset.candidateId;
      if (id) openCandidateDetail(id);
    });
    target.addEventListener('keydown', event => {
      const row = event.target.closest?.('tr[data-candidate-id]');
      if (!row || !['Enter',' '].includes(event.key)) return;
      event.preventDefault();
      openCandidateDetail(row.dataset.candidateId);
    });
  }

  function bindFilters() {
    ['adminNewsTypeFilter','adminNewsPrefectureFilter','adminNewsStatusFilter','adminNewsShowPosted']
      .forEach(id => document.getElementById(id)?.addEventListener('change', renderSingleCandidates));
    ['adminNewsFromFilter','adminNewsToFilter']
      .forEach(id => document.getElementById(id)?.addEventListener('change', renderSingleCandidates));
    document.getElementById('adminNewsMunicipalityFilter')?.addEventListener('input', renderSingleCandidates);
    ['adminWeeklyWeek','adminWeeklyPrefecture','adminWeeklyCount']
      .forEach(id => document.getElementById(id)?.addEventListener('change', renderWeeklyCandidates));
  }

  const init = () => {
    const singleFilter = document.getElementById('adminNewsPrefectureFilter');
    const weeklyFilter = document.getElementById('adminWeeklyPrefecture');
    if (!singleFilter || !weeklyFilter) return;

    PREFECTURES.forEach((prefecture) => {
      singleFilter.add(new Option(prefecture, prefecture));
      weeklyFilter.add(new Option(prefecture, prefecture));
    });

    const typeFilter = document.getElementById('adminNewsTypeFilter');
    if (typeFilter && !typeFilter.querySelector(`option[value="${LEGACY_KIND}"]`)) {
      typeFilter.add(new Option('旧ニュース候補（要確認）', LEGACY_KIND));
    }

    const adapter = window.MachimamoNewsCandidateAdapter;
    const weeklyInput = document.getElementById('adminWeeklyWeek');
    if (adapter && weeklyInput && !weeklyInput.value) weeklyInput.value = adapter.isoWeekValue(new Date());

    bindFilters();
    bindCandidateDetailNavigation();
    window.MachimamoNewsCandidateDetail?.init?.();

    const dashboard = document.getElementById('adminDashboardArea');
    const updateAdminState = () => {
      document.body.classList.toggle('admin-dashboard-open', dashboard?.style.display === 'block');
      if (isAdminNewsVisible()) loadCandidatesOnce();
    };
    updateAdminState();
    if (dashboard && typeof MutationObserver !== 'undefined') {
      new MutationObserver(updateAdminState).observe(dashboard, { attributes: true, attributeFilter: ['style'] });
    }

    const state = window.MachimamoNewsPublishingAdmin = Object.freeze({
      version: 'news-publishing-admin-ui-v3-readonly-detail',
      serviceId: SERVICE_ID,
      productionModes: Object.freeze(['SINGLE', 'WEEKLY']),
      informationKinds: Object.freeze(['LOCAL_ANOMALY', 'POLICE_OFFICIAL', LEGACY_KIND]),
      prefectureCount: PREFECTURES.length,
      candidateSource: 'public.spots:official(read-only,legacy-unverified)',
      connected: 'read-only-legacy'
    });
    document.dispatchEvent(new CustomEvent('machimamo:news-publishing-admin-ready', { detail: state }));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
