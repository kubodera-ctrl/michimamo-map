(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.MachimamoIdentityUI = api;
    api.install(root);
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const PROVIDER_LABELS = Object.freeze({
    line: 'LINE',
    google: 'Google',
    apple: 'Apple'
  });
  const MAX_INDIVIDUAL_BADGES = 2;
  const QA_HOST = 'machimamo-map-git-feat-dev36-identity-ui-miti4.vercel.app';

  function normalizeProvider(value) {
    const key = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(PROVIDER_LABELS, key) ? key : null;
  }

  function safeLinkedAt(value) {
    if (!value) return null;
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
  }

  function identityStateFromSession(session, savedProvider) {
    if (!session || !session.user) return Object.freeze([]);
    const byProvider = new Map();
    const add = function (provider, linkedAt) {
      const key = normalizeProvider(provider);
      if (!key) return;
      const previous = byProvider.get(key);
      const nextLinkedAt = safeLinkedAt(linkedAt);
      byProvider.set(key, Object.freeze({
        provider: key,
        linked: true,
        verified: true,
        linkedAt: previous?.linkedAt || nextLinkedAt || null
      }));
    };

    const identities = Array.isArray(session.user.identities) ? session.user.identities : [];
    identities.forEach(function (identity) {
      add(identity?.provider, identity?.created_at || identity?.updated_at);
    });

    const metadata = session.user.app_metadata || {};
    const providers = Array.isArray(metadata.providers) ? metadata.providers : [];
    providers.forEach(function (provider) { add(provider, null); });
    add(metadata.provider, null);

    // Existing custom LINE exchange stores only a display hint after a real session exists.
    // It is never used for authorization/RLS; this contract is presentation-only.
    add(savedProvider, null);

    return Object.freeze(Array.from(byProvider.values()));
  }

  function badgeModel(identities) {
    const linked = (Array.isArray(identities) ? identities : [])
      .filter(function (item) { return item?.linked === true && item?.verified === true && PROVIDER_LABELS[item.provider]; });
    if (linked.length > MAX_INDIVIDUAL_BADGES) {
      return Object.freeze({
        mode: 'summary',
        count: linked.length,
        label: '認証済み ' + linked.length,
        providers: Object.freeze(linked.map(function (item) { return item.provider; }))
      });
    }
    return Object.freeze({
      mode: 'individual',
      count: linked.length,
      badges: Object.freeze(linked.map(function (item) {
        return Object.freeze({
          provider: item.provider,
          label: '✓ ' + PROVIDER_LABELS[item.provider] + '接続',
          title: 'このまちまもアカウントに' + PROVIDER_LABELS[item.provider] + 'が接続済み'
        });
      }))
    });
  }

  function isLineLinked(identities) {
    return (Array.isArray(identities) ? identities : [])
      .some(function (item) { return item?.provider === 'line' && item.linked === true && item.verified === true; });
  }

  function qaAllowed(hostname, search) {
    if (hostname !== QA_HOST) return false;
    return /(?:^|[?&])identityQa=1(?:&|$)/.test(String(search || ''));
  }

  function fixtureState(key) {
    const fixtures = {
      guest: {
        name: 'テストユーザー',
        nameSource: 'custom',
        identities: []
      },
      line: {
        name: 'まちまも太郎',
        nameSource: 'custom',
        identities: [{provider:'line',linked:true,verified:true,linkedAt:'2026-09-28T00:00:00Z'}]
      },
      auto: {
        name: '青空ネコ12',
        nameSource: 'generated',
        identities: []
      },
      multi: {
        name: 'ながいニックネーム',
        nameSource: 'custom',
        identities: [
          {provider:'line',linked:true,verified:true,linkedAt:'2026-09-20T00:00:00Z'},
          {provider:'google',linked:true,verified:true,linkedAt:'2026-09-21T00:00:00Z'},
          {provider:'apple',linked:true,verified:true,linkedAt:'2026-09-22T00:00:00Z'}
        ]
      }
    };
    const fixture = fixtures[key] || fixtures.guest;
    return Object.freeze({
      name: fixture.name,
      nameSource: fixture.nameSource,
      identities: Object.freeze(fixture.identities.map(function (item) { return Object.freeze({...item}); }))
    });
  }

  function install(win) {
    if (!win.document) return;
    const doc = win.document;
    let identities = Object.freeze([]);
    let profileMeta = {name:'',nameSource:'unknown'};
    let qaKey = null;
    const isQa = qaAllowed(win.location?.hostname || '', win.location?.search || '');

    function providerTitle(provider) {
      return PROVIDER_LABELS[provider] || provider;
    }

    function renderBadges(target, state) {
      if (!target) return;
      target.replaceChildren();
      const model = badgeModel(state);
      if (model.mode === 'summary') {
        const badge = doc.createElement('span');
        badge.className = 'identity-provider-badge identity-provider-summary';
        badge.textContent = model.label;
        badge.title = 'このまちまもアカウントに接続済み: ' + model.providers.map(providerTitle).join(' / ');
        badge.setAttribute('aria-label', badge.title);
        target.appendChild(badge);
        return;
      }
      model.badges.forEach(function (item) {
        const badge = doc.createElement('span');
        badge.className = 'identity-provider-badge identity-provider-' + item.provider;
        badge.textContent = item.label;
        badge.title = item.title;
        badge.setAttribute('aria-label', item.title);
        target.appendChild(badge);
      });
    }

    function renderLineAction(target, state) {
      if (!target || isLineLinked(state)) return;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'identity-line-link-button';
      button.textContent = 'LINE認証';
      button.setAttribute('aria-label', 'LINEでこのまちまもアカウントを認証する');
      button.addEventListener('click', function () {
        if (qaKey) {
          win.showToast?.('QA表示のため実際のLINE認証は開始しません');
          return;
        }
        if (typeof win.signInWithLine === 'function') win.signInWithLine();
      });
      target.appendChild(button);
    }

    function renderNameSource(target, source) {
      if (!target) return;
      target.replaceChildren();
      if (source !== 'generated') return;
      const badge = doc.createElement('span');
      badge.className = 'identity-name-source';
      badge.textContent = '自動設定';
      badge.title = '現在の表示名は自動で設定されています';
      target.appendChild(badge);
    }

    function effective() {
      if (qaKey) return fixtureState(qaKey);
      return Object.freeze({
        name: profileMeta.name,
        nameSource: profileMeta.nameSource,
        identities: identities
      });
    }

    function render() {
      const state = effective();
      const name = doc.getElementById('myNameDisplay');
      if (qaKey && name) name.textContent = state.name;
      const badges = doc.getElementById('profileIdentityBadges');
      const source = doc.getElementById('profileNameMeta');
      if (!badges && !source) return;
      if (badges) {
        badges.replaceChildren();
        renderBadges(badges, state.identities);
        renderLineAction(badges, state.identities);
      }
      renderNameSource(source, state.nameSource);
      ensureQaPanel();
    }

    function syncSession(session) {
      let saved = null;
      try { saved = win.localStorage?.getItem('michimamo_auth_provider'); } catch {}
      identities = identityStateFromSession(session, saved);
      render();
      return identities;
    }

    function syncProfile(meta) {
      profileMeta = {
        name: String(meta?.name || ''),
        nameSource: ['generated','custom'].includes(meta?.nameSource) ? meta.nameSource : 'unknown'
      };
      if (!qaKey) {
        const name = doc.getElementById('myNameDisplay');
        if (name && profileMeta.name) name.textContent = profileMeta.name;
      }
      render();
    }

    async function refreshFromAuth() {
      try {
        const response = await win.db?.auth?.getSession?.();
        syncSession(response?.data?.session || null);
      } catch {
        syncSession(null);
      }
    }

    function applyQaFixture(key) {
      if (!isQa) return false;
      qaKey = key;
      render();
      const panel = doc.getElementById('identityQaPanel');
      panel?.querySelectorAll('[data-identity-fixture]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.identityFixture === qaKey));
      });
      return true;
    }

    function ensureQaPanel() {
      if (!isQa || doc.getElementById('identityQaPanel')) return;
      const row = doc.querySelector('#activityTab .profile-edit');
      if (!row?.parentElement) return;
      const panel = doc.createElement('div');
      panel.id = 'identityQaPanel';
      panel.className = 'identity-qa-panel';
      panel.innerHTML =
        '<strong>Identity Preview QA</strong><small>表示fixtureのみ。Auth/DBは変更しません。</small>' +
        '<div class="identity-qa-buttons">' +
          '<button type="button" data-identity-fixture="guest">未LINE認証</button>' +
          '<button type="button" data-identity-fixture="line">LINE認証済み</button>' +
          '<button type="button" data-identity-fixture="auto">自動生成名</button>' +
          '<button type="button" data-identity-fixture="multi">複数provider</button>' +
        '</div>';
      panel.addEventListener('click', function (event) {
        const button = event.target.closest('[data-identity-fixture]');
        if (button) applyQaFixture(button.dataset.identityFixture);
      });
      row.parentElement.insertBefore(panel, row);
      applyQaFixture(qaKey || 'guest');
    }

    doc.addEventListener('DOMContentLoaded', function () {
      ensureQaPanel();
      refreshFromAuth();
      render();
    });

    Object.assign(api, {
      syncSession,
      syncProfile,
      refreshFromAuth,
      applyQaFixture,
      render
    });
  }

  const api = {
    PROVIDER_LABELS,
    MAX_INDIVIDUAL_BADGES,
    identityStateFromSession,
    badgeModel,
    isLineLinked,
    qaAllowed,
    fixtureState,
    install
  };
  return api;
});
