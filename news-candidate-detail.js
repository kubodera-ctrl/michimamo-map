(function exposeMachimamoNewsCandidateDetail(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MachimamoNewsCandidateDetail = api;
})(typeof window !== 'undefined' ? window : globalThis, function createNewsCandidateDetail() {
  'use strict';

  const SERVICE_ID = 'machimamo';
  const LEGACY_KIND = 'LEGACY_UNVERIFIED';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[ch]);
  }

  function httpsUrl(value) {
    return typeof value === 'string' && /^https:\/\/[^\s]+$/i.test(value.trim());
  }

  function retentionState(newsDate, now = new Date()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(newsDate || ''))) {
      return { active:false, display:false, ageDays:null, state:'date_unknown', label:'日付要確認' };
    }
    const date = new Date(String(newsDate) + 'T00:00:00Z');
    const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (!Number.isFinite(date.getTime())) return { active:false, display:false, ageDays:null, state:'date_invalid', label:'日付要確認' };
    const ageDays = Math.floor((current.getTime() - date.getTime()) / 86400000);
    if (ageDays < 0) return { active:false, display:false, ageDays, state:'future', label:'未来日付・要確認' };
    if (ageDays <= 60) return { active:true, display:true, ageDays, state:'active_60d', label:`active（${ageDays}日）` };
    if (ageDays <= 90) return { active:false, display:true, ageDays, state:'inactive_61_90d', label:`inactive（${ageDays}日）` };
    return { active:false, display:false, ageDays, state:'expired_over_90d', label:`表示終了（${ageDays}日）` };
  }

  function gateBlockers(candidate, selection, validation = null) {
    if (!candidate || typeof candidate !== 'object') return ['候補データがありません'];
    if (candidate.informationKind === LEGACY_KIND) {
      return [
        '旧ニュース候補のため一次source証跡がありません',
        'verifiedFactsが正式確認されていません',
        'rights証跡がありません',
        'correction状態を確認できません'
      ];
    }

    const blockers = [];
    if (Array.isArray(validation?.errors)) blockers.push(...validation.errors.map(x => `validation: ${x}`));
    if (Array.isArray(candidate?.validation?.errors)) blockers.push(...candidate.validation.errors.map(x => `validation: ${x}`));
    if (candidate.service && candidate.service !== SERVICE_ID) blockers.push('serviceがmachimamoではありません');
    if (candidate.sourceStatus !== 'verified') blockers.push('sourceStatusがverifiedではありません');
    if (candidate.factsStatus !== 'verified') blockers.push('factsStatusがverifiedではありません');
    if (candidate.rightsStatus !== 'cleared') blockers.push('rightsStatusがclearedではありません');
    if (candidate.correctionStatus !== 'current') blockers.push('correctionStatusがcurrentではありません');
    if (candidate.informationKind === 'POLICE_OFFICIAL' && !candidate.sourceEventId) blockers.push('sourceEventIdがありません');
    if (!httpsUrl(candidate.source?.url)) blockers.push('source URLが未確認です');
    if (!/^[0-9a-f]{64}$/i.test(candidate.source?.sourceHash || '')) blockers.push('sourceHashが未確認です');
    if (!Array.isArray(candidate.verifiedFacts) || candidate.verifiedFacts.length === 0) blockers.push('verifiedFactsがありません');
    if (candidate.rights?.commercialUseAllowed !== true) blockers.push('commercialUseAllowed=trueを確認できません');
    if (!httpsUrl(candidate.rights?.rightsEvidenceUrl)) blockers.push('rights evidence URLがありません');
    if (candidate.rightsScopeConfirmed === false) blockers.push('sourceのrights scopeが未確認です');
    if (selection?.include === false) blockers.push(selection.reason || 'selection classifierで除外されています');
    if (selection?.retention && selection.retention.active === false) blockers.push('active retention対象外です');
    return [...new Set(blockers)];
  }

  function pipelineStages({ legacy, publishEligible }) {
    if (legacy) {
      return [
        ['Candidate','旧ニュース候補・要確認','blocked'],
        ['Production Preview','対象外','blocked'],
        ['Render','生成不可','blocked'],
        ['QC','承認不可','blocked'],
        ['管理者承認','承認不可','blocked'],
        ['Publishing Preview','投稿不可','blocked'],
        ['X / TikTok','投稿不可','blocked'],
        ['投稿完了確認','対象外','blocked']
      ];
    }
    return [
      ['Candidate', publishEligible ? 'Productionへ進める候補' : 'gate確認待ち', publishEligible ? 'ready' : 'blocked'],
      ['Production Preview', publishEligible ? 'read-only確認可能' : 'gate確認待ち', publishEligible ? 'ready' : 'blocked'],
      ['Render','Renderer待ち（exact v7 source）','pending'],
      ['QC','未接続','pending'],
      ['管理者承認','未接続','pending'],
      ['Publishing Preview','read-only preview可能','pending'],
      ['X / TikTok','接続設定必要','pending'],
      ['投稿完了確認','未接続','pending']
    ];
  }

  function toDetailView(candidate, { now = new Date(), selection = null, validation = null } = {}) {
    const legacy = candidate?.informationKind === LEGACY_KIND;
    const actualSelection = selection || candidate?.selection || null;
    const retention = actualSelection?.retention || retentionState(candidate?.newsDate, now);
    const blockers = gateBlockers(candidate, actualSelection, validation);
    const explicitPublishEligible =
      candidate?.publishEligible === true ||
      validation?.publishEligible === true ||
      candidate?.validation?.publishEligible === true;
    const gateReady = !legacy && blockers.length === 0;
    const publishEligible = explicitPublishEligible && gateReady;
    const source = candidate?.source || {};
    const rights = candidate?.rights || {};
    const locality = candidate?.localityEvidence || null;

    return Object.freeze({
      service: candidate?.service || SERVICE_ID,
      legacy,
      badge: legacy ? '旧ニュース候補・要確認' : 'canonical candidate',
      headline: candidate?.headline || candidate?.title || '名称なし',
      informationKind: candidate?.informationKind || '要確認',
      prefecture: candidate?.prefecture || '要確認',
      municipality: candidate?.municipality || '要確認',
      newsDate: candidate?.newsDate || '要確認',
      category: candidate?.category || '要確認',
      sourceEventId: legacy ? '要確認' : (candidate?.sourceEventId || '要確認'),
      sourceName: legacy ? (candidate?.sourceName || '旧officialデータ') : (source.name || '要確認'),
      sourceUrl: legacy ? null : (source.url || candidate?.sourceUrl || null),
      sourceDate: legacy ? '要確認' : (source.publishedAt || '要確認'),
      sourceHash: legacy ? '要確認' : (source.sourceHash || '要確認'),
      verifiedFacts: legacy ? [] : (Array.isArray(candidate?.verifiedFacts) ? candidate.verifiedFacts : []),
      sourceStatus: candidate?.sourceStatus || 'needs_review',
      factsStatus: candidate?.factsStatus || 'needs_review',
      rightsStatus: candidate?.rightsStatus || 'needs_review',
      correctionStatus: legacy ? 'needs_review' : (candidate?.correctionStatus || 'unknown'),
      rightsLevel: legacy ? '要確認' : (rights.rightsLevel || '要確認'),
      commercialUseAllowed: legacy ? null : (rights.commercialUseAllowed === true ? true : rights.commercialUseAllowed === false ? false : null),
      attribution: legacy ? '要確認' : (rights.attributionText || '要確認'),
      rightsEvidenceUrl: legacy ? null : (rights.rightsEvidenceUrl || null),
      rightsScopeConfirmed: legacy ? null : (candidate?.rightsScopeConfirmed === true ? true : candidate?.rightsScopeConfirmed === false ? false : null),
      lastVerifiedAt: legacy ? '要確認' : (candidate?.lastVerifiedAt || source.checkedAt || '要確認'),
      localityEvidence: legacy ? null : locality,
      retention,
      classifierTopic: legacy ? '未判定' : (actualSelection?.topic || '未接続'),
      classifierPriority: legacy ? '未判定' : (actualSelection?.priority || '未接続'),
      classifierInclude: legacy ? false : (actualSelection?.include === true ? true : actualSelection?.include === false ? false : null),
      classifierReason: legacy ? 'LEGACY_UNVERIFIEDはselection対象外です' : (actualSelection?.reason || 'classifier結果未接続'),
      publishEligible,
      blockers,
      legacyComment: candidate?.legacyComment || '',
      legacyAddress: candidate?.legacyAddress || '',
      legacyAcquiredAt: candidate?.acquiredAt || null,
      pipeline: pipelineStages({ legacy, publishEligible })
    });
  }

  function field(label, value, className = '') {
    const safe = value == null || value === '' ? '—' : escapeHtml(value);
    return `<div class="news-detail-field"><div class="news-detail-label">${escapeHtml(label)}</div><div class="news-detail-value ${className}">${safe}</div></div>`;
  }

  function htmlField(label, safeHtml) {
    return `<div class="news-detail-field"><div class="news-detail-label">${escapeHtml(label)}</div><div class="news-detail-value">${safeHtml}</div></div>`;
  }

  function boolText(value) {
    return value === true ? 'true' : value === false ? 'false' : '要確認';
  }

  function renderDetailHtml(view) {
    const sourceUrl = httpsUrl(view.sourceUrl)
      ? `<a class="news-detail-break" href="${escapeHtml(view.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(view.sourceUrl)}</a>`
      : '<span>要確認</span>';
    const rightsUrl = httpsUrl(view.rightsEvidenceUrl)
      ? `<a class="news-detail-break" href="${escapeHtml(view.rightsEvidenceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(view.rightsEvidenceUrl)}</a>`
      : '<span>要確認</span>';
    const facts = view.verifiedFacts.length
      ? `<ul class="news-detail-facts">${view.verifiedFacts.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : '<div class="news-detail-warn">要確認（正式verifiedFactsなし）</div>';
    const locality = view.localityEvidence
      ? `<pre class="news-detail-json">${escapeHtml(JSON.stringify(view.localityEvidence, null, 2))}</pre>`
      : '<span>要確認</span>';
    const blockers = view.blockers.length
      ? `<ul class="news-detail-blockers">${view.blockers.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
      : '<div class="news-detail-ok">Production gate条件を満たしています。</div>';
    const pipeline = `<div class="news-detail-pipeline">${view.pipeline.map(([name,status,state],i) => `
      <div class="news-detail-stage news-detail-stage-${escapeHtml(state)}">
        <div class="news-detail-stage-index">${i+1}</div>
        <div><strong>${escapeHtml(name)}</strong><div>${escapeHtml(status)}</div></div>
      </div>`).join('')}</div>`;

    return `
      <div class="news-detail-badge ${view.legacy ? 'is-legacy' : 'is-canonical'}">${escapeHtml(view.badge)}</div>
      <h3 class="news-detail-headline">${escapeHtml(view.headline)}</h3>
      <div class="news-detail-section">
        <h4>Candidate</h4>
        <div class="news-detail-grid">
          ${field('service', view.service)}
          ${field('informationKind', view.informationKind)}
          ${field('prefecture', view.prefecture)}
          ${field('municipality', view.municipality)}
          ${field('newsDate', view.newsDate)}
          ${field('category', view.category)}
          ${field('sourceEventId', view.sourceEventId, 'news-detail-break')}
        </div>
      </div>
      <div class="news-detail-section">
        <h4>source / facts / rights</h4>
        ${field('source name', view.sourceName)}
        ${htmlField('source URL', sourceUrl)}
        ${field('source date', view.sourceDate)}
        ${field('last verified', view.lastVerifiedAt)}
        ${field('sourceHash', view.sourceHash, 'news-detail-break news-detail-mono')}
        <div class="news-detail-field"><div class="news-detail-label">verifiedFacts</div><div class="news-detail-value">${facts}</div></div>
        <div class="news-detail-grid">
          ${field('sourceStatus', view.sourceStatus)}
          ${field('factsStatus', view.factsStatus)}
          ${field('rightsStatus', view.rightsStatus)}
          ${field('correctionStatus', view.correctionStatus)}
          ${field('rights level', view.rightsLevel)}
          ${field('commercialUseAllowed', boolText(view.commercialUseAllowed))}
          ${field('rightsScopeConfirmed', boolText(view.rightsScopeConfirmed))}
          ${field('attribution', view.attribution)}
        </div>
        ${htmlField('rights evidence', rightsUrl)}
        <div class="news-detail-field"><div class="news-detail-label">locality evidence</div><div class="news-detail-value">${locality}</div></div>
      </div>
      <div class="news-detail-section">
        <h4>retention / classifier</h4>
        <div class="news-detail-grid">
          ${field('retention state', view.retention?.label || view.retention?.state || '未接続')}
          ${field('classifier topic', view.classifierTopic)}
          ${field('classifier priority', view.classifierPriority)}
          ${field('include', boolText(view.classifierInclude))}
        </div>
        ${field('include / exclude理由', view.classifierReason)}
      </div>
      <div class="news-detail-section">
        <h4>Production gate</h4>
        <div class="news-detail-gate ${view.publishEligible ? 'is-ready' : 'is-blocked'}">publishEligible = ${view.publishEligible ? 'true' : 'false'}</div>
        <div class="news-detail-field"><div class="news-detail-label">publish不可理由</div><div class="news-detail-value">${blockers}</div></div>
      </div>
      ${view.legacy ? `
      <div class="news-detail-section">
        <h4>旧データ参考情報</h4>
        ${field('旧spots登録日時', view.legacyAcquiredAt || '要確認')}
        ${field('旧住所', view.legacyAddress || '要確認')}
        ${field('旧本文', view.legacyComment || '要確認')}
      </div>` : ''}
      <div class="news-detail-section">
        <h4>管理フロー</h4>
        ${pipeline}
        <p class="news-detail-note">現在はread-onlyです。未接続工程を通過したことにはしません。</p>
      </div>
    `;
  }

  function close() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('adminNewsDetailModal');
    modal?.classList.remove('open');
    document.body.classList.remove('news-detail-open');
  }

  function open(candidate, options = {}) {
    if (typeof document === 'undefined') return null;
    const modal = document.getElementById('adminNewsDetailModal');
    const body = document.getElementById('adminNewsDetailBody');
    const title = document.getElementById('adminNewsDetailTitle');
    if (!modal || !body) return null;
    const view = toDetailView(candidate, options);
    body.innerHTML = renderDetailHtml(view);
    if (title) title.textContent = view.legacy ? 'ニュース詳細｜旧ニュース候補・要確認' : 'ニュース詳細｜canonical candidate';
    modal.classList.add('open');
    document.body.classList.add('news-detail-open');
    const sheet = modal.querySelector('.news-detail-sheet');
    if (sheet) sheet.scrollTop = 0;
    modal.querySelector('.news-detail-close')?.focus({ preventScroll: true });
    return view;
  }

  function init() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('adminNewsDetailModal');
    if (!modal) return;
    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.classList.contains('open')) close();
    });
  }

  return Object.freeze({
    SERVICE_ID,
    LEGACY_KIND,
    retentionState,
    gateBlockers,
    toDetailView,
    renderDetailHtml,
    open,
    close,
    init
  });
});
