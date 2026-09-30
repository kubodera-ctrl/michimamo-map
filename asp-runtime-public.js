(function (root) {
    'use strict';

    const safeHttps = (value) => {
        try {
            const url = new URL(value);
            return typeof value === 'string' && !/[\s<>"']/.test(value)
                && url.protocol === 'https:' && !url.username && !url.password ? value : null;
        } catch { return null; }
    };

    function isStandalonePwa() {
        try {
            return root.matchMedia?.('(display-mode: standalone)')?.matches === true
                || root.navigator?.standalone === true;
        } catch { return false; }
    }

    function showEmpty(container) {
        const empty = document.createElement('p');
        empty.textContent = '現在表示できるPR情報はありません。';
        empty.style.cssText = 'margin:0;color:#64748b;font-size:.68rem;line-height:1.5;';
        empty.dataset.aspEmpty = 'true';
        container.appendChild(empty);
    }

    function anonymousSessionId() {
        try {
            const key = 'machimamo-asp-session-v1';
            let id = sessionStorage.getItem(key);
            if (!id) {
                id = crypto.randomUUID();
                sessionStorage.setItem(key, id);
            }
            return id;
        } catch { return null; }
    }

    function addOffer(container, offer, serviceKey, placementId, client) {
        const href = safeHttps(offer.tracking_url);
        if (!href) return;
        const card = document.createElement('article');
        card.style.cssText = 'padding:10px 0;border-top:1px solid #e2e8f0;';
        const sponsor = document.createElement('span');
        sponsor.textContent = 'PR';
        sponsor.style.cssText = 'display:inline-block;margin-right:6px;padding:2px 6px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:.62rem;font-weight:800;';
        const title = document.createElement('strong');
        title.textContent = String(offer.offer_name || '関連サービス');
        title.style.cssText = 'font-size:.78rem;color:#1e293b;';
        const link = document.createElement('a');
        link.href = href; // Keep the ASP-issued tracking URL unchanged.
        link.target = '_blank';
        link.rel = 'sponsored nofollow noopener noreferrer';
        link.append(sponsor, title);
        link.style.cssText = 'display:block;text-decoration:none;';
        const recordClick = () => {
            const anonId = anonymousSessionId();
            // Record asynchronously. Never cancel or delay the outbound ASP navigation.
            try {
                const result = client.rpc('record_asp_offer_click', {
                    p_offer_id: offer.offer_id,
                    p_service_key: serviceKey,
                    p_placement_id: placementId,
                    p_source_screen: placementId,
                    p_anonymous_session_id: anonId
                });
                Promise.resolve(result).catch(() => {});
            } catch { /* tracking failure must not block the official ASP URL */ }
        };
        link.addEventListener('click', recordClick, { passive: true });
        card.appendChild(link);
        const disclosure = document.createElement('p');
        disclosure.textContent = '広告・PR｜β初期はポイント還元なし';
        disclosure.style.cssText = 'margin:4px 0 0;color:#64748b;font-size:.64rem;';
        card.appendChild(disclosure);
        const imageUrl = offer.creative_type === 'image' ? safeHttps(offer.creative_url) : null;
        if (imageUrl) {
            const imageLink = document.createElement('a');
            imageLink.href = href;
            imageLink.target = '_blank';
            imageLink.rel = link.rel;
            const image = document.createElement('img');
            image.src = imageUrl;
            image.alt = String(offer.offer_name || '広告');
            image.loading = 'lazy';
            image.referrerPolicy = 'no-referrer';
            image.style.cssText = 'display:block;max-width:100%;height:auto;margin-top:7px;border-radius:8px;';
            imageLink.appendChild(image);
            imageLink.addEventListener('click', recordClick, { passive: true });
            card.appendChild(imageLink);
        }
        const pixelUrl = safeHttps(offer.impression_tracking_url);
        if (pixelUrl) {
            const pixel = document.createElement('img');
            pixel.src = pixelUrl;
            pixel.alt = '';
            pixel.width = 1;
            pixel.height = 1;
            pixel.referrerPolicy = 'no-referrer';
            pixel.setAttribute('aria-hidden', 'true');
            pixel.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
            card.appendChild(pixel);
        }
        container.appendChild(card);
    }

    async function mount(container) {
        const serviceKey = container.dataset.aspService;
        const placementId = container.dataset.aspPlacement;
        const client = root.db;
        if (isStandalonePwa()) { showEmpty(container); return; }
        if (!client || !['machimamo', 'machiibe'].includes(serviceKey) || !placementId) { showEmpty(container); return; }
        const { data, error } = await client.rpc('get_asp_offers_for_placement', {
            p_service_key: serviceKey,
            p_placement_id: placementId
        });
        if (error || !Array.isArray(data) || !data.length) { showEmpty(container); return; }
        data.slice(0, 3).forEach((offer) => addOffer(container, offer, serviceKey, placementId, client));
    }

    const containers = document.querySelectorAll('[data-asp-service][data-asp-placement]');
    containers.forEach((container) => mount(container));
    root.MachimamoAspPublic = { mount };
})(window);
