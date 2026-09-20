(function (root) {
    'use strict';
    const svc = () => root.MachimamoExchange.service;
    const fallbackProviders = [
        'PayPayマネーライト','Amazonギフトカード','楽天ポイント','dポイント',
        'Vポイントギフト','Pontaポイント','nanacoギフト','Google Play ギフトコード',
        'au PAY ギフトカード','WAON POINT eギフト','FamiPayギフトコード','PayPal',
        'セブン銀行ATM','銀行振込'
    ].map((name, index) => ({ id: 'planned-' + index, name, logoUrl: null, status: 'planned', notice: null }));
    const fallbackOptions = [
        { id: 'digital-gift-3000', requiredPoints: 30000, faceValueYen: 3000, enabled: true },
        { id: 'digital-gift-5000', requiredPoints: 50000, faceValueYen: 5000, enabled: true }
    ];
    let catalog = { beta: true, enabled: false, options: fallbackOptions, providers: fallbackProviders };
    let adminPassword = '';
    let adminFilter = '';

    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    const authId = () => root.MachimamoProfileState?.authId?.() || null;
    const balance = () => Math.max(0, Number.parseInt(document.getElementById('myPointDisp')?.textContent || '0', 10) || 0);
    const selectedOption = () => catalog.options.find(x => x.id === document.querySelector('input[name="exchangeOption"]:checked')?.value) || catalog.options[0];
    const statusLabel = status => ({
        requested:'受付中',points_reserved:'受付中',approved:'確認中',issuing:'交換処理中',
        issued:'交換完了',issue_failed:'失敗',cancelled:'キャンセル',rejected:'キャンセル'
    })[status] || status || '不明';

    function renderProvider(provider) {
        const approvedLogo = provider.status === 'approved' && /^https:\/\//.test(provider.logoUrl || '');
        const mark = approvedLogo
            ? '<img src="' + esc(provider.logoUrl) + '" alt="" loading="lazy">'
            : '<span>' + esc(provider.name.slice(0, 1)) + '</span>';
        return '<div class="exchange-provider-card"><div class="exchange-provider-mark">' + mark + '</div><div><strong>' +
            esc(provider.name) + '</strong><small>' + (provider.status === 'approved' ? '提供予定' : '正式提供時の交換先例') + '</small></div></div>';
    }

    function renderModal() {
        const app = document.getElementById('pointExchangeApp');
        if (!app) return;
        const options = (catalog.options.length ? catalog.options : fallbackOptions).filter(x => x.enabled !== false);
        const providers = catalog.providers.length ? catalog.providers : fallbackProviders;
        app.innerHTML = '<div class="exchange-head"><div><div id="pointExchangeTitle" style="font-size:19px;font-weight:900;color:#0f4c81">ポイント交換</div><div style="font-size:.75rem;color:#64748b">現在のポイント：<strong id="pointExchangeBalance">' +
            balance().toLocaleString('ja-JP') + 'pt</strong></div></div><button type="button" class="close" onclick="closePointExchange()" aria-label="ポイント交換を閉じる"><i class="fa-solid fa-xmark"></i></button></div>' +
            '<div class="exchange-hero"><h2>🎁 貯めたポイントを好きなギフトへ</h2><div class="exchange-rate-row"><div class="exchange-rate"><strong>30,000pt</strong><span>貯める</span></div><i class="fa-solid fa-arrow-right"></i><div class="exchange-rate"><strong>3,000円分</strong><span>受け取る</span></div></div><p>50,000ptなら5,000円分。正式提供後は、普段使っているサービスや現金受取などから好きな受取方法を選べます。</p></div>' +
            '<div class="exchange-beta"><strong>β版・受付停止中</strong><br>現在は画面と安全な交換基盤を準備しています。入力内容・ポイント・個人情報は保存されません。</div>' +
            '<section class="exchange-section"><div class="point-exchange-section-title">正式提供時の交換先例</div><p class="exchange-provider-note">デジタルギフト側で選べる受取先の例です。交換先・名称・条件は変更、追加、終了される場合があります。正式ロゴは契約・クリエイティブ承認後に掲載します。</p><div class="exchange-provider-grid">' +
            providers.filter(x => x.status !== 'disabled' && x.enabled !== false).map(renderProvider).join('') + '</div></section>' +
            '<form id="pointExchangeForm" onsubmit="MachimamoPointExchange.showConfirmation(event)"><div id="exchangeEntryStep"><section class="exchange-section"><div class="point-exchange-section-title">交換額を選ぶ</div><div class="exchange-options">' +
            options.map((x, i) => '<label class="exchange-option"><input type="radio" name="exchangeOption" value="' + esc(x.id) + '" ' + (i === 0 ? 'checked' : '') + ' onchange="MachimamoPointExchange.updatePreview()"><strong>' + Number(x.faceValueYen).toLocaleString('ja-JP') + '円分</strong><span>' + Number(x.requiredPoints).toLocaleString('ja-JP') + 'pt必要</span></label>').join('') +
            '</div><div id="pointExchangeEligibility" class="exchange-eligibility"></div></section>' +
            '<section class="exchange-section"><div class="point-exchange-section-title">デジタルギフトで交換</div><div class="exchange-data-note">まちまもでPayPay ID、Amazonアカウント、楽天ID、銀行口座は取得しません。正式運用では、発行された受取URLを開いてデジタルギフト側で受取方法を選びます。</div>' +
            '<div class="exchange-field"><label for="exchangeBirthDate">年齢確認（生年月日）</label><input id="exchangeBirthDate" type="date" autocomplete="bday" onchange="MachimamoPointExchange.toggleGuardian()"></div>' +
            '<div id="guardianFields" class="exchange-guardian"><strong>未成年者の保護者確認</strong><p class="exchange-provider-note">正式な同意方法は、利用条件・法的確認後に変更できる構造です。β版では保存しません。</p><label for="guardianName">保護者氏名</label><input id="guardianName" type="text" maxlength="60" autocomplete="name"><label for="guardianRelation">続柄</label><select id="guardianRelation"><option value="">選択してください</option><option value="parent">父・母</option><option value="guardian">未成年後見人</option><option value="other">その他</option></select><label class="exchange-check"><input id="guardianConsent" type="checkbox"> 保護者として交換条件を確認し、申請に同意します。</label><label for="guardianSignature">保護者署名（氏名入力）</label><input id="guardianSignature" type="text" maxlength="60"></div>' +
            '<label class="exchange-check"><input id="exchangeTermsConsent" type="checkbox"> 交換レート、審査、不正取得分の取消し、発行後の取消し不可、交換先・条件が変更される場合があることを確認しました。</label><button type="submit" class="primary"><i class="fa-solid fa-circle-check"></i> 申請内容を確認</button></section></div>' +
            '<div id="exchangeConfirmStep" class="exchange-confirm"><section class="exchange-section"><div class="point-exchange-section-title">申請内容の確認</div><div id="exchangeConfirmSummary" class="exchange-confirm-summary"></div><p class="exchange-provider-note">β版のため、次のボタンを押しても申請、ポイント確保、減算、ギフト発行は行いません。</p><div class="exchange-actions"><button type="button" class="exchange-secondary" onclick="MachimamoPointExchange.backToEntry()">戻る</button><button type="button" class="primary" style="margin-top:0" onclick="submitPointExchangeBeta(event)">交換を申請する</button></div></section></div></form>';
        updatePreview();
    }

    async function open() {
        if (!authId()) { root.showToast('ポイント交換にはLINEログインが必要です'); return; }
        try { catalog = await svc().getCatalog(); } catch (error) { console.warn('exchange catalog fallback', error); }
        renderModal();
        document.getElementById('pointExchangeModal').classList.add('open');
        document.querySelector('#pointExchangeModal .close')?.focus();
    }
    function close() { document.getElementById('pointExchangeModal')?.classList.remove('open'); backToEntry(); }
    function updatePreview() {
        const option = selectedOption(), target = document.getElementById('pointExchangeEligibility');
        if (!option || !target) return;
        const shortage = option.requiredPoints - balance();
        target.textContent = shortage <= 0 ? '交換可能な残高です（正式提供後に申請できます）' : '交換まであと ' + shortage.toLocaleString('ja-JP') + 'pt';
        target.style.color = shortage <= 0 ? '#166534' : '#b45309';
    }
    function isMinor() {
        const value = document.getElementById('exchangeBirthDate')?.value;
        if (!value) return false;
        const birth = new Date(value + 'T00:00:00'), today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
        return Number.isFinite(age) && age < 18;
    }
    function toggleGuardian() { const el = document.getElementById('guardianFields'); if (el) el.style.display = isMinor() ? 'block' : 'none'; }
    function showConfirmation(event) {
        event?.preventDefault();
        if (!document.getElementById('exchangeBirthDate')?.value) { root.showToast('生年月日を入力してください'); return; }
        if (!document.getElementById('exchangeTermsConsent')?.checked) { root.showToast('注意事項を確認してください'); return; }
        if (isMinor()) {
            const name = document.getElementById('guardianName')?.value.trim();
            const signature = document.getElementById('guardianSignature')?.value.trim();
            if (!name || !document.getElementById('guardianRelation')?.value || !document.getElementById('guardianConsent')?.checked || signature !== name) {
                root.showToast('保護者情報・同意・署名を確認してください'); return;
            }
        }
        const option = selectedOption();
        document.getElementById('exchangeConfirmSummary').innerHTML = '<strong>デジタルギフト</strong><br>' + Number(option.faceValueYen).toLocaleString('ja-JP') + '円分<br>必要ポイント：' + Number(option.requiredPoints).toLocaleString('ja-JP') + 'pt<br>受取先：発行後にデジタルギフト画面で選択';
        document.getElementById('exchangeEntryStep').style.display = 'none';
        document.getElementById('exchangeConfirmStep').style.display = 'block';
    }
    function backToEntry() { const a=document.getElementById('exchangeEntryStep'),b=document.getElementById('exchangeConfirmStep'); if(a)a.style.display='block';if(b)b.style.display='none'; }
    function submitBeta(event) { event?.preventDefault(); alert(root.MachimamoExchange.BETA_MESSAGE); }

    async function loadHistory() {
        const card = document.getElementById('pointExchangeHistoryCard'), area = document.getElementById('pointExchangeHistoryArea');
        if (!card || !area) return;
        card.style.display = authId() ? 'block' : 'none';
        if (!authId()) return;
        try {
            const rows = await svc().getMyHistory();
            area.innerHTML = rows.length ? rows.map(x => '<div class="exchange-history-item"><div class="exchange-history-top"><strong>' + esc(new Date(x.requestedAt).toLocaleDateString('ja-JP')) + '</strong><span class="exchange-status">' + esc(statusLabel(x.status)) + '</span></div><div>デジタルギフト・' + Number(x.faceValueYen).toLocaleString('ja-JP') + '円分・' + Number(x.points).toLocaleString('ja-JP') + 'pt</div>' + (x.status === 'issued' && /^https:\/\//.test(x.claimUrl || '') ? '<a class="exchange-claim" href="' + esc(x.claimUrl) + '" target="_blank" rel="noopener noreferrer">ギフトを受け取る</a>' : '') + '</div>').join('') : '<p class="muted" style="font-size:.76rem">交換履歴はありません。</p>';
        } catch (error) { area.innerHTML = '<p class="muted" style="font-size:.76rem">交換履歴を取得できませんでした。</p>'; }
    }
    function renderAdmin(rows) {
        const area=document.getElementById('adminPointExchangeArea'); if(!area)return;
        area.innerHTML=rows.length?rows.map(x=>'<div class="admin-exchange-item"><strong>'+esc(x.userName||'名称未設定')+'</strong>　<span class="exchange-status">'+esc(statusLabel(x.status))+'</span><br>'+esc(x.requestedAt?new Date(x.requestedAt).toLocaleString('ja-JP'):'')+'・'+Number(x.points).toLocaleString('ja-JP')+'pt → '+Number(x.faceValueYen).toLocaleString('ja-JP')+'円<br>方法：デジタルギフト<br>申請ID：'+esc(x.id)+'<br>発行ID：'+esc(x.externalIssueId||'未発行')+(x.failureReason?'<br>失敗理由：'+esc(x.failureReason):'')+'<div class="admin-exchange-actions"><button disabled>承認</button><button disabled>却下</button><button disabled>再処理</button></div></div>').join(''):'<p class="muted" style="font-size:.72rem">該当する交換申請はありません。</p>';
    }
    async function loadAdmin(password) {
        adminPassword=password; try{renderAdmin(await svc().getAdminRequests(password,adminFilter));}catch(error){const area=document.getElementById('adminPointExchangeArea');if(area)area.innerHTML='<p class="muted" style="font-size:.72rem">交換管理データを取得できませんでした。</p>';}
    }
    async function filterAdmin(status) {
        adminFilter=status;
        document.querySelectorAll('[data-exchange-filter]').forEach(x=>x.classList.toggle('active',x.dataset.exchangeFilter===status));
        if(adminPassword)await loadAdmin(adminPassword);
    }

    root.MachimamoPointExchange={open,close,updatePreview,toggleGuardian,showConfirmation,backToEntry,submitBeta,loadHistory,loadAdmin,filterAdmin};
    root.openPointExchange=open; root.closePointExchange=close; root.updatePointExchangePreview=updatePreview;
    root.toggleGuardianFields=toggleGuardian; root.submitPointExchangeBeta=submitBeta;
    const priorUpdate=root.updateMyPage;
    root.updateMyPage=function(){const result=priorUpdate?.apply(this,arguments);loadHistory();return result;};
})(window);
