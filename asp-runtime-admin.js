(function (root) {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const message = (text, error = false) => {
        const status = $('adminAspRuntimeStatus');
        if (!status) return;
        status.textContent = text;
        status.style.color = error ? '#b91c1c' : '#166534';
    };

    function password() {
        const input = $('adminExportPassword');
        return input && input.value.trim();
    }

    function hasForbiddenHtml(value) {
        if (!value || typeof value !== 'object') return false;
        if (Array.isArray(value)) return value.some(hasForbiddenHtml);
        return Object.entries(value).some(([key, child]) =>
            ['html', 'raw_html', 'tag_html', 'complete_ad_tag'].includes(key.toLowerCase()) || hasForbiddenHtml(child));
    }

    function validHttps(value, label) {
        if (value == null || value === '') return;
        let parsed;
        try { parsed = new URL(value); } catch { throw new Error(label + 'のURL形式が不正です'); }
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(label + 'は認証情報を含まないHTTPS URLにしてください');
    }


    const DISCOVERY_ACTION_TYPES = new Set(['free_registration','app_install','document_request','bank_account_opening','purchase','service_contract','reservation','application','other']);
    const DISCOVERY_COST_TYPES = new Set(['free','paid']);
    const REWARD_PERMISSIONS = new Set(['allowed','denied','unknown']);

    function validateDiscoveryMetadata(service) {
        if (service.action_type != null && service.action_type !== '' && !DISCOVERY_ACTION_TYPES.has(service.action_type)) throw new Error('action_typeが未定義です');
        if (service.cost_type != null && service.cost_type !== '' && !DISCOVERY_COST_TYPES.has(service.cost_type)) throw new Error('cost_typeが未定義です');
        if (service.reward_permission != null && service.reward_permission !== '' && !REWARD_PERMISSIONS.has(service.reward_permission)) throw new Error('reward_permissionが未定義です');
        for (const key of ['estimated_available_days','recommendation_rank','reward_fixed_points']) {
            if (service[key] == null || service[key] === '') continue;
            const n = Number(service[key]);
            if (!Number.isSafeInteger(n) || n < 0 || (key === 'recommendation_rank' && n < 1)) throw new Error(key + 'は確認済みの0以上の整数値のみ指定できます');
        }
        if (service.source_added_at != null && service.source_added_at !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(service.source_added_at))) throw new Error('source_added_atは確認済みのYYYY-MM-DDのみ指定できます');
        if (service.reward_enabled === true) {
            if (service.reward_permission !== 'allowed' || service.point_reward_allowed !== true || service.reward_rule_confirmed !== true) throw new Error('reward_enabledにはreward_permission=allowed・point_reward_allowed=true・reward_rule_confirmed=trueが必要です');
            const hasFixed = Number.isSafeInteger(Number(service.reward_fixed_points)) && Number(service.reward_fixed_points) >= 0;
            const hasRate = service.reward_rate != null && service.reward_rate !== '' && Number.isFinite(Number(service.reward_rate)) && Number(service.reward_rate) >= 0;
            if (!hasFixed && !hasRate) throw new Error('reward_enabledには確認済みreward_fixed_pointsまたはreward_rateが必要です');
            if (!service.reward_rule || typeof service.reward_rule !== 'object' || Array.isArray(service.reward_rule) || Object.keys(service.reward_rule).length === 0) throw new Error('reward_enabledには空でないreward_ruleが必要です');
        }
    }

    function parseOffers(raw) {
        let offers;
        try { offers = JSON.parse(raw); } catch { throw new Error('JSONを読み取れません'); }
        if (!Array.isArray(offers) || offers.length > 300) throw new Error('1〜300件の配列JSONを指定してください');
        if (hasForbiddenHtml(offers)) throw new Error('完全広告HTMLは同期できません。URL等の構造化フィールドに分けてください');
        for (const offer of offers) {
            if (!offer || typeof offer !== 'object' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(String(offer.offer_id || '')) || !offer.program_id) throw new Error('案件マスターの安定offer_idとprogram_idを指定してください');
            for (const service of Object.values(offer.services || {})) {
                validHttps(service.tracking_url, 'tracking_url');
                validHttps(service.creative_url, 'creative_url');
                validHttps(service.impression_tracking_url, 'impression_tracking_url');
                validateDiscoveryMetadata(service);
            }
        }
        return offers;
    }

    function displayUrl(value) {
        const text = String(value || '');
        if (!text) return '未取得';
        try {
            const u = new URL(text);
            return u.origin + u.pathname + (u.search ? '?…' : '');
        } catch { return 'URL形式不正'; }
    }

    function statusLabel(row) {
        const gates = [row.approval_status === 'approved', row.source_listing_allowed,
            row.source_media_approved, row.production_listing_approved,
            row.web_approval_status === 'approved', !!row.tracking_url];
        return gates.every(Boolean) ? 'ソース条件確認済み' : '未公開条件あり';
    }

    function render(rows) {
        const list = $('adminAspRuntimeList');
        if (!list) return;
        if (!rows.length) {
            list.innerHTML = '<p class="muted" style="font-size:.72rem;">Runtime Masterは空です。ASP2の正本から整形したデータを同期してください。</p>';
            return;
        }
        list.innerHTML = rows.map((row) => {
            const placements = Array.isArray(row.placements) ? row.placements : [];
            const placementJson = JSON.stringify(placements.map((p) => ({ placement_id: p.placement_id, enabled: p.enabled, sort_order: p.sort_order, valid_from: p.valid_from, valid_until: p.valid_until })), null, 2);
            return `<article data-asp-card data-offer-id="${escapeHtml(row.offer_id)}" data-service-key="${escapeHtml(row.service_key)}" style="margin:10px 0;padding:10px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:9px;">
                <div style="font-weight:900;font-size:.78rem;">${escapeHtml(row.offer_name)}</div>
                <div style="font-size:.67rem;color:#475569;margin:3px 0 8px;">${escapeHtml(row.asp)} / ${escapeHtml(row.program_id)} / ${escapeHtml(row.service_key)} · ${statusLabel(row)}</div>
                <div style="font-size:.65rem;line-height:1.5;color:#475569;">提携：${escapeHtml(row.approval_status)} · Web媒体：${escapeHtml(row.web_approval_status)} · 本番掲載判定：${row.production_listing_approved ? '許可' : '未許可'} · App：${escapeHtml(row.app_approval_status)} · SNS：${escapeHtml(row.sns_approval_status)} · LINE：${escapeHtml(row.line_approval_status)}<br>ポイント：${row.point_reward_allowed && row.reward_rule_confirmed ? '可・条件確定' : '対象外または未確定'} · click：${Number(row.click_count || 0)} · 成果連携：未接続<br>還元条件：${escapeHtml(JSON.stringify(row.reward_rule || {}))} · 最終確認：${escapeHtml(row.last_verified_at || '未記録')} · マスター同期：${escapeHtml(row.source_master_updated_at || '未同期')}<br>tracking URL：<code>${escapeHtml(displayUrl(row.tracking_url))}</code></div>
                <details style="margin-top:5px;font-size:.65rem;"><summary style="cursor:pointer;">登録済みURLを確認（クリック計測は発生しません）</summary><div style="overflow-wrap:anywhere;margin-top:5px;">tracking: <code>${escapeHtml(row.tracking_url || '未取得')}</code><br>creative: <code>${escapeHtml(row.creative_url || '未取得')}</code><br>impression: <code>${escapeHtml(row.impression_tracking_url || '未取得')}</code></div></details>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px;">
                    <label style="font-size:.68rem;">公開状態<select data-field="publish_status" style="margin-top:3px;background:white;"><option value="draft" ${row.publish_status === 'draft' ? 'selected' : ''}>draft</option><option value="active" ${row.publish_status === 'active' ? 'selected' : ''}>active</option><option value="paused" ${row.publish_status === 'paused' ? 'selected' : ''}>paused</option><option value="ended" ${row.publish_status === 'ended' ? 'selected' : ''}>ended</option></select></label>
                    <label style="display:flex;align-items:center;gap:6px;font-size:.68rem;"><input data-field="listing_enabled" type="checkbox" ${row.listing_enabled ? 'checked' : ''}>掲載を有効にする</label>
                </div>
                <label style="display:block;margin-top:7px;font-size:.68rem;">placement_id・掲載期間(JSON)<textarea data-field="placements" rows="3" style="width:100%;box-sizing:border-box;margin-top:3px;background:white;font:11px/1.4 ui-monospace,monospace;">${escapeHtml(placementJson)}</textarea></label>
                <button type="button" data-action="save" style="margin-top:7px;width:100%;padding:8px;border:0;border-radius:7px;background:#166534;color:white;font-weight:bold;">${escapeHtml(row.service_key)} の掲載設定を保存</button>
            </article>`;
        }).join('');
    }

    async function load() {
        const pass = password();
        if (!pass || !root.db || !$('adminAspRuntimeList')) return;
        const { data, error } = await root.db.rpc('admin_list_asp_runtime', { p_password: pass });
        if (error) { message('ASP管理データを取得できません。管理者認証とDB migrationを確認してください。', true); render([]); return; }
        render(Array.isArray(data) ? data : []);
    }

    async function importFromSheet() {
        const pass = password();
        if (!pass) { message('管理者パスワードを確認してください。', true); return; }
        try {
            const offers = parseOffers($('adminAspImportJson').value);
            const dateValue = $('adminAspSourceUpdatedAt').value;
            const sourceUpdatedAt = dateValue ? new Date(dateValue).toISOString() : '';
            if (!sourceUpdatedAt) throw new Error('案件マスター更新日時を入力してください');
            const { data, error } = await root.db.rpc('admin_import_asp_runtime', {
                p_password: pass, p_source_master_updated_at: sourceUpdatedAt, p_offers: offers
            });
            if (error) throw error;
            message(`同期しました（${Number(data || 0)}案件）。公開状態は変更していません。`);
            await load();
        } catch (error) {
            message(error.message || '同期に失敗しました。', true);
        }
    }

    async function saveCard(card) {
        const pass = password();
        if (!pass) { message('管理者パスワードを確認してください。', true); return; }
        const status = card.querySelector('[data-field="publish_status"]')?.value;
        const enabled = !!card.querySelector('[data-field="listing_enabled"]')?.checked;
        let placements;
        try { placements = JSON.parse(card.querySelector('[data-field="placements"]')?.value || '[]'); }
        catch { message('placement設定JSONを読み取れません。', true); return; }
        if (!Array.isArray(placements) || placements.length > 30) { message('placementは30件以下の配列で指定してください。', true); return; }
        const { error } = await root.db.rpc('admin_set_asp_publication', {
            p_password: pass,
            p_offer_id: card.dataset.offerId,
            p_service_key: card.dataset.serviceKey,
            p_publish_status: status,
            p_listing_enabled: enabled,
            p_placements: placements
        });
        if (error) { message('掲載設定を保存できませんでした。入力値とDB migrationを確認してください。', true); return; }
        message('掲載設定を保存しました。公開条件が揃わない案件は表示されません。');
        await load();
    }

    document.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action="save"]');
        const card = button && button.closest('[data-asp-card]');
        if (card) saveCard(card);
    });

    root.MachimamoAspAdmin = { load, importFromSheet };
})(window);
