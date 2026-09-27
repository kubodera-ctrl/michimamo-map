(function exposeMachimamoNewsCandidateAdapter(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MachimamoNewsCandidateAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis, function createAdapter() {
  'use strict';

  const LEGACY_INFORMATION_KIND = 'LEGACY_UNVERIFIED';
  const PREFECTURES = Object.freeze([
    ['北海道',['北海道']],['青森県',['青森県','青森']],['岩手県',['岩手県','岩手']],['宮城県',['宮城県','宮城']],
    ['秋田県',['秋田県','秋田']],['山形県',['山形県','山形']],['福島県',['福島県','福島']],['茨城県',['茨城県','茨城']],
    ['栃木県',['栃木県','栃木']],['群馬県',['群馬県','群馬']],['埼玉県',['埼玉県','埼玉']],['千葉県',['千葉県','千葉']],
    ['東京都',['東京都','東京']],['神奈川県',['神奈川県','神奈川']],['新潟県',['新潟県','新潟']],['富山県',['富山県','富山']],
    ['石川県',['石川県','石川']],['福井県',['福井県','福井']],['山梨県',['山梨県','山梨']],['長野県',['長野県','長野']],
    ['岐阜県',['岐阜県','岐阜']],['静岡県',['静岡県','静岡']],['愛知県',['愛知県','愛知']],['三重県',['三重県','三重']],
    ['滋賀県',['滋賀県','滋賀']],['京都府',['京都府','京都']],['大阪府',['大阪府','大阪']],['兵庫県',['兵庫県','兵庫']],
    ['奈良県',['奈良県','奈良']],['和歌山県',['和歌山県','和歌山']],['鳥取県',['鳥取県','鳥取']],['島根県',['島根県','島根']],
    ['岡山県',['岡山県','岡山']],['広島県',['広島県','広島']],['山口県',['山口県','山口']],['徳島県',['徳島県','徳島']],
    ['香川県',['香川県','香川']],['愛媛県',['愛媛県','愛媛']],['高知県',['高知県','高知']],['福岡県',['福岡県','福岡']],
    ['佐賀県',['佐賀県','佐賀']],['長崎県',['長崎県','長崎']],['熊本県',['熊本県','熊本']],['大分県',['大分県','大分']],
    ['宮崎県',['宮崎県','宮崎']],['鹿児島県',['鹿児島県','鹿児島']],['沖縄県',['沖縄県','沖縄']]
  ]);

  function normalizeDigits(value) {
    return String(value || '').replace(/[０-９]/g, ch => String(ch.charCodeAt(0) - 0xFF10));
  }

  function inferPrefecture(row) {
    const haystack = `${row?.title || ''} ${row?.address || ''} ${row?.comment || ''}`;
    for (const [name, aliases] of PREFECTURES) {
      if (aliases.some(alias => haystack.includes(alias))) return name;
    }
    return '';
  }

  function inferMunicipality(row, prefecture = '') {
    let value = String(row?.address || '').trim();
    if (!value) return '';
    if (prefecture && value.startsWith(prefecture)) value = value.slice(prefecture.length).trim();
    return value.slice(0, 80);
  }

  function parseNewsDate(row) {
    const text = normalizeDigits(`${row?.title || ''} ${row?.comment || ''}`);
    const match = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (!match) return null;
    const created = new Date(row?.created_at || '');
    if (!Number.isFinite(created.getTime())) return null;
    const month = Number(match[1]), day = Number(match[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    let year = created.getUTCFullYear();
    let candidate = new Date(Date.UTC(year, month - 1, day));
    const createdDay = new Date(Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate()));
    if (candidate.getTime() - createdDay.getTime() > 35 * 86400000) {
      year -= 1;
      candidate = new Date(Date.UTC(year, month - 1, day));
    }
    if (candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) return null;
    return candidate.toISOString().slice(0, 10);
  }

  function normalizeLegacySpot(row) {
    if (!row || row.category !== 'official') return null;
    const prefecture = inferPrefecture(row);
    const newsDate = parseNewsDate(row);
    return Object.freeze({
      candidateId: `legacy-spot-${String(row.id)}`,
      legacySpotId: Number(row.id),
      informationKind: LEGACY_INFORMATION_KIND,
      title: String(row.title || '名称なし').trim(),
      legacyComment: String(row.comment || '').trim(),
      legacyAddress: String(row.address || '').trim(),
      prefecture,
      municipality: inferMunicipality(row, prefecture),
      newsDate,
      acquiredAt: row.created_at || null,
      sourceName: '旧officialデータ',
      sourceUrl: null,
      sourceStatus: 'needs_review',
      factsStatus: 'needs_review',
      rightsStatus: 'needs_review',
      renderStatus: 'blocked',
      qcStatus: 'not_started',
      approvalStatus: 'not_started',
      xStatus: 'not_started',
      tiktokStatus: 'not_started',
      postedAt: null,
      publishEligible: false,
      legacyReason: '一次ソースURL・verifiedFacts・rights証跡が旧spotsに保持されていないため要確認'
    });
  }

  function isoWeekStart(weekValue) {
    const match = /^(\d{4})-W(\d{2})$/.exec(String(weekValue || ''));
    if (!match) return null;
    const year = Number(match[1]), week = Number(match[2]);
    if (week < 1 || week > 53) return null;
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
    return monday.toISOString().slice(0, 10);
  }

  function isoWeekValue(date = new Date()) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  function filterCandidates(candidates, filters = {}) {
    return (Array.isArray(candidates) ? candidates : []).filter(candidate => {
      if (filters.informationKind && filters.informationKind !== 'all' && candidate.informationKind !== filters.informationKind) return false;
      if (filters.prefecture && candidate.prefecture !== filters.prefecture) return false;
      if (filters.municipality && !candidate.municipality.includes(String(filters.municipality).trim())) return false;
      if (filters.from && (!candidate.newsDate || candidate.newsDate < filters.from)) return false;
      if (filters.to && (!candidate.newsDate || candidate.newsDate > filters.to)) return false;
      if (filters.status && filters.status !== 'all' && filters.status !== 'unposted') return false;
      return true;
    });
  }

  function weeklySummary(candidates, { weekValue, prefecture, requestedCount = 6 } = {}) {
    const start = isoWeekStart(weekValue);
    if (!start || !prefecture) return { start, end: null, candidates: [], eligible: [], requestedCount, shortage: requestedCount };
    const endDate = new Date(`${start}T00:00:00Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const end = endDate.toISOString().slice(0, 10);
    const matched = (Array.isArray(candidates) ? candidates : []).filter(item =>
      item.prefecture === prefecture && item.newsDate && item.newsDate >= start && item.newsDate <= end
    );
    const eligible = matched.filter(item =>
      item.productionEligible === true ||
      (item.publishEligible === true && item.selection?.include === true)
    );
    return {
      start, end, candidates: matched, eligible,
      requestedCount,
      shortage: Math.max(0, requestedCount - eligible.length)
    };
  }

  return Object.freeze({
    LEGACY_INFORMATION_KIND,
    PREFECTURES: Object.freeze(PREFECTURES.map(([name]) => name)),
    normalizeLegacySpot,
    filterCandidates,
    isoWeekStart,
    isoWeekValue,
    weeklySummary
  });
});
