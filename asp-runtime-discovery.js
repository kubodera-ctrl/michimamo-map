(function exposeAspDiscovery(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MachimamoAspDiscovery = api;
})(typeof window !== 'undefined' ? window : globalThis, function createAspDiscovery() {
  'use strict';

  const FILTERS = Object.freeze(['all','fast','high_points','easy','free','no_purchase','recommended','new']);
  const SORTS = Object.freeze(['recommended','points_high','points_low','availability_fast','availability_slow','added_new','added_old','popular']);
  const EASY_ACTION_TYPES = Object.freeze(['free_registration','app_install','document_request']);
  const NON_PURCHASE_ACTION_TYPES = Object.freeze(['free_registration','app_install','document_request','bank_account_opening']);
  const ACTION_LABELS = Object.freeze({
    free_registration:'無料会員登録',
    app_install:'アプリインストール',
    document_request:'資料請求',
    bank_account_opening:'口座開設',
    purchase:'商品購入',
    service_contract:'サービス契約',
    reservation:'予約',
    application:'申込み・問い合わせ',
    other:'その他'
  });

  function safeHttps(value) {
    try {
      const url = new URL(value);
      return typeof value === 'string' && !/[\s<>"']/.test(value)
        && url.protocol === 'https:' && !url.username && !url.password ? value : null;
    } catch { return null; }
  }

  function toFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function toInteger(value) {
    const n = toFiniteNumber(value);
    return Number.isSafeInteger(n) ? n : null;
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const t = new Date(value + 'T00:00:00Z').getTime();
    return Number.isFinite(t) ? value : null;
  }

  function deriveActionType(conversionConditions) {
    const text = String(conversionConditions || '').normalize('NFKC');
    if (!text) return null;
    if (/無料[^。\n]{0,12}会員登録|会員登録[^。\n]{0,12}無料/.test(text)) return 'free_registration';
    if (/アプリ[^。\n]{0,16}インストール|インストール[^。\n]{0,16}アプリ/.test(text)) return 'app_install';
    if (/資料請求/.test(text)) return 'document_request';
    if (/口座開設/.test(text)) return 'bank_account_opening';
    if (!/購入不要/.test(text) && /商品購入|購入完了|新規購入/.test(text)) return 'purchase';
    if (/サービス契約|新規契約|契約完了/.test(text)) return 'service_contract';
    if (/予約完了|新規予約/.test(text)) return 'reservation';
    if (/申込|申込み|申し込み|問い合わせ|問合せ/.test(text)) return 'application';
    return null;
  }

  function normalizeOffer(raw) {
    const conversionConditions = typeof raw?.conversion_conditions === 'string' && raw.conversion_conditions.trim()
      ? raw.conversion_conditions.trim() : null;
    const explicitAction = ACTION_LABELS[raw?.action_type] ? raw.action_type : null;
    const actionType = explicitAction || deriveActionType(conversionConditions);
    let costType = ['free','paid'].includes(raw?.cost_type) ? raw.cost_type : null;
    if (!costType && actionType === 'free_registration') costType = 'free';
    let purchaseRequired = typeof raw?.purchase_required === 'boolean' ? raw.purchase_required : null;
    if (purchaseRequired === null && NON_PURCHASE_ACTION_TYPES.includes(actionType)) purchaseRequired = false;
    const rewardEnabled = raw?.reward_enabled === true;
    const rewardFixedPoints = rewardEnabled ? toInteger(raw?.reward_fixed_points) : null;
    const rewardRate = rewardEnabled ? toFiniteNumber(raw?.reward_rate) : null;
    return Object.freeze({
      offer_id: String(raw?.offer_id || ''),
      offer_name: String(raw?.offer_name || '関連サービス'),
      category: raw?.category ? String(raw.category) : null,
      tracking_url: safeHttps(raw?.tracking_url),
      creative_type: raw?.creative_type || null,
      creative_url: safeHttps(raw?.creative_url),
      reward_enabled: rewardEnabled,
      reward_fixed_points: rewardFixedPoints !== null && rewardFixedPoints >= 0 ? rewardFixedPoints : null,
      reward_rate: rewardRate !== null && rewardRate >= 0 ? rewardRate : null,
      action_type: actionType,
      cost_type: costType,
      purchase_required: purchaseRequired,
      estimated_available_days: (() => {
        const n = toInteger(raw?.estimated_available_days);
        return n !== null && n >= 0 ? n : null;
      })(),
      source_added_at: validDate(raw?.source_added_at),
      recommendation_rank: (() => {
        const n = toInteger(raw?.recommendation_rank);
        return n !== null && n > 0 ? n : null;
      })(),
      recommendation_note: raw?.recommendation_note ? String(raw.recommendation_note) : null,
      conversion_conditions: conversionConditions,
      placement_sort_order: toInteger(raw?.placement_sort_order) ?? 100,
      popularity_count: (() => {
        const n = toInteger(raw?.popularity_count);
        return n !== null && n >= 0 ? n : 0;
      })()
    });
  }

  function hasKnownPoints(offer) {
    return offer.reward_enabled === true && Number.isSafeInteger(offer.reward_fixed_points);
  }

  function matchesFilter(offer, filterKey) {
    switch (filterKey) {
      case 'all': return true;
      case 'fast': return Number.isSafeInteger(offer.estimated_available_days);
      case 'high_points': return hasKnownPoints(offer) && offer.reward_fixed_points > 0;
      case 'easy': return EASY_ACTION_TYPES.includes(offer.action_type);
      case 'free': return offer.cost_type === 'free';
      case 'no_purchase': return offer.purchase_required === false;
      case 'recommended': return Number.isSafeInteger(offer.recommendation_rank);
      case 'new': return !!offer.source_added_at;
      default: return false;
    }
  }

  function nullLastNumber(a, b, direction) {
    const av = a === null ? null : Number(a);
    const bv = b === null ? null : Number(b);
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return direction * (av - bv);
  }

  function stableFallback(a, b) {
    const placement = (a.placement_sort_order || 100) - (b.placement_sort_order || 100);
    if (placement) return placement;
    return String(a.offer_id).localeCompare(String(b.offer_id), 'ja');
  }

  function sortOffers(offers, sortKey) {
    const rows = offers.slice();
    rows.sort((a,b) => {
      let result = 0;
      switch (sortKey) {
        case 'points_high':
          result = nullLastNumber(hasKnownPoints(a) ? a.reward_fixed_points : null, hasKnownPoints(b) ? b.reward_fixed_points : null, -1);
          break;
        case 'points_low':
          result = nullLastNumber(hasKnownPoints(a) ? a.reward_fixed_points : null, hasKnownPoints(b) ? b.reward_fixed_points : null, 1);
          break;
        case 'availability_fast':
          result = nullLastNumber(a.estimated_available_days, b.estimated_available_days, 1);
          break;
        case 'availability_slow':
          result = nullLastNumber(a.estimated_available_days, b.estimated_available_days, -1);
          break;
        case 'added_new':
          result = (b.source_added_at || '').localeCompare(a.source_added_at || '');
          if (!a.source_added_at && b.source_added_at) result = 1;
          if (a.source_added_at && !b.source_added_at) result = -1;
          break;
        case 'added_old':
          result = (a.source_added_at || '').localeCompare(b.source_added_at || '');
          if (!a.source_added_at && b.source_added_at) result = 1;
          if (a.source_added_at && !b.source_added_at) result = -1;
          break;
        case 'popular':
          result = nullLastNumber(a.popularity_count > 0 ? a.popularity_count : null, b.popularity_count > 0 ? b.popularity_count : null, -1);
          break;
        case 'recommended':
        default:
          result = nullLastNumber(a.recommendation_rank, b.recommendation_rank, 1);
          break;
      }
      return result || stableFallback(a,b);
    });
    return rows;
  }

  function queryOffers(rawOffers, { filterKey='all', category='', sortKey='recommended' } = {}) {
    if (!FILTERS.includes(filterKey)) filterKey = 'all';
    if (!SORTS.includes(sortKey)) sortKey = 'recommended';
    const normalized = (Array.isArray(rawOffers) ? rawOffers : []).map(normalizeOffer).filter(x => x.tracking_url);
    const filtered = normalized.filter(offer =>
      (!category || offer.category === category) && matchesFilter(offer, filterKey)
    );
    return sortOffers(filtered, sortKey);
  }

  function capabilities(rawOffers) {
    const offers = (Array.isArray(rawOffers) ? rawOffers : []).map(normalizeOffer);
    return Object.freeze({
      points: offers.some(hasKnownPoints),
      availability: offers.some(x => Number.isSafeInteger(x.estimated_available_days)),
      addedAt: offers.some(x => !!x.source_added_at),
      easy: offers.some(x => EASY_ACTION_TYPES.includes(x.action_type)),
      free: offers.some(x => x.cost_type === 'free'),
      noPurchase: offers.some(x => x.purchase_required === false),
      recommended: offers.some(x => Number.isSafeInteger(x.recommendation_rank)),
      popular: offers.some(x => x.popularity_count > 0)
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function anonymousSessionId() {
    try {
      const key='machimamo-asp-session-v1';
      let id=sessionStorage.getItem(key);
      if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id);}
      return id;
    } catch { return null; }
  }

  function recordClick(client, offer, serviceKey, placementId) {
    try {
      const result = client.rpc('record_asp_offer_click', {
        p_offer_id: offer.offer_id,
        p_service_key: serviceKey,
        p_placement_id: placementId,
        p_source_screen: placementId,
        p_anonymous_session_id: anonymousSessionId()
      });
      Promise.resolve(result).catch(() => {});
    } catch {}
  }

  function renderCard(offer, client, serviceKey, placementId) {
    const href = safeHttps(offer.tracking_url);
    if (!href) return '';
    const meta = [];
    if (offer.category) meta.push('<span>'+escapeHtml(offer.category)+'</span>');
    if (hasKnownPoints(offer)) meta.push('<strong>'+offer.reward_fixed_points.toLocaleString('ja-JP')+'pt予定</strong>');
    if (offer.cost_type === 'free') meta.push('<span>無料</span>');
    if (offer.cost_type === 'paid') meta.push('<span>費用あり</span>');
    if (Number.isSafeInteger(offer.estimated_available_days)) meta.push('<span>利用可能まで '+offer.estimated_available_days+'日目安</span>');
    const actionLabel = ACTION_LABELS[offer.action_type] || null;
    const details = [
      offer.conversion_conditions ? '<div><b>成果条件</b><br>'+escapeHtml(offer.conversion_conditions)+'</div>' : '',
      actionLabel ? '<div><b>アクション</b> '+escapeHtml(actionLabel)+'</div>' : '',
      offer.purchase_required === false ? '<div><b>購入</b> 不要</div>' : '',
      offer.source_added_at ? '<div><b>追加日</b> '+escapeHtml(offer.source_added_at)+'</div>' : '',
      offer.recommendation_note ? '<div><b>おすすめ理由</b><br>'+escapeHtml(offer.recommendation_note)+'</div>' : ''
    ].filter(Boolean).join('');
    return '<article class="asp-discovery-card" data-asp-offer-id="'+escapeHtml(offer.offer_id)+'">'+
      '<div class="asp-discovery-card-head"><span class="asp-discovery-pr">PR</span><strong>'+escapeHtml(offer.offer_name)+'</strong></div>'+
      (meta.length?'<div class="asp-discovery-meta">'+meta.join('')+'</div>':'')+
      (offer.conversion_conditions?'<p class="asp-discovery-condition">'+escapeHtml(offer.conversion_conditions)+'</p>':'')+
      (details?'<details><summary>詳細条件</summary><div class="asp-discovery-details">'+details+'</div></details>':'')+
      '<a class="asp-discovery-link" href="'+escapeHtml(href)+'" target="_blank" rel="sponsored nofollow noopener noreferrer">詳細を見る</a>'+
      '</article>';
  }

  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById('aspDiscoveryStyles')) return;
    const style=document.createElement('style');
    style.id='aspDiscoveryStyles';
    style.textContent='.asp-discovery{display:grid;gap:10px}.asp-discovery-toolbar{display:grid;gap:9px}.asp-discovery-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;-webkit-overflow-scrolling:touch}.asp-discovery-chips button{flex:0 0 auto;min-height:38px;padding:7px 11px;border:1px solid #cbd5e1;border-radius:999px;background:#fff;font-size:.72rem;font-weight:800;color:#334155}.asp-discovery-chips button[aria-pressed="true"]{background:#0f4c81;color:#fff;border-color:#0f4c81}.asp-discovery-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px}.asp-discovery-controls label{display:grid;gap:4px;font-size:.68rem;font-weight:800;color:#475569}.asp-discovery-controls select{width:100%;min-width:0;min-height:42px;padding:7px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;font-size:16px}.asp-discovery-status{font-size:.68rem;color:#64748b;line-height:1.5}.asp-discovery-list{display:grid;gap:9px}.asp-discovery-card{padding:11px;border:1px solid #dbe5ef;border-radius:12px;background:#fff;min-width:0}.asp-discovery-card-head{display:flex;align-items:flex-start;gap:7px;font-size:.82rem;line-height:1.45}.asp-discovery-pr{flex:0 0 auto;padding:2px 6px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:.61rem;font-weight:900}.asp-discovery-meta{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.asp-discovery-meta span,.asp-discovery-meta strong{padding:4px 7px;border-radius:999px;background:#f1f5f9;color:#334155;font-size:.65rem}.asp-discovery-meta strong{background:#ecfdf5;color:#166534}.asp-discovery-condition{margin:8px 0 0;font-size:.7rem;line-height:1.5;color:#475569}.asp-discovery-card details{margin-top:8px;font-size:.68rem}.asp-discovery-card summary{cursor:pointer;font-weight:800;color:#475569}.asp-discovery-details{display:grid;gap:6px;margin-top:7px;padding:8px;border-radius:8px;background:#f8fafc;line-height:1.5;overflow-wrap:anywhere}.asp-discovery-link{display:block;margin-top:9px;padding:9px 10px;border-radius:9px;background:#0f4c81;color:#fff!important;text-align:center;text-decoration:none!important;font-size:.75rem;font-weight:900}@media(max-width:520px){.asp-discovery-controls{grid-template-columns:1fr}}';
    document.head.appendChild(style);
  }

  async function mount(container) {
    if (!container || typeof document === 'undefined') return;
    ensureStyles();
    const serviceKey=container.dataset.aspDiscoveryService;
    const placementId=container.dataset.aspDiscoveryPlacement;
    const client=(typeof window!=='undefined'?window.db:null);
    if (!client || !['machimamo','machiibe'].includes(serviceKey) || !placementId) return;
    container.classList.add('asp-discovery');
    container.innerHTML='<p class="asp-discovery-status">公開条件を満たした案件を確認しています…</p>';
    const {data,error}=await client.rpc('get_asp_offers_for_discovery',{p_service_key:serviceKey,p_placement_id:placementId});
    if(error){container.innerHTML='<p class="asp-discovery-status">現在、案件を読み込めません。</p>';return;}
    const rows=Array.isArray(data)?data:[];
    if(!rows.length){container.innerHTML='<p class="asp-discovery-status">現在、公開条件を満たした案件はありません。</p>';return;}
    const caps=capabilities(rows);
    const normalized=rows.map(normalizeOffer);
    const categories=Array.from(new Set(normalized.map(x=>x.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'ja'));
    const chips=[
      ['all','すべて',true],
      ['fast','反映が早い',caps.availability],
      ['high_points','高ポイント',caps.points],
      ['easy','かんたん',caps.easy],
      ['free','無料でできる',caps.free],
      ['no_purchase','購入不要',caps.noPurchase],
      ['recommended','おすすめ',caps.recommended],
      ['new','新着',caps.addedAt]
    ];
    const sortOptions=[
      ['recommended','おすすめ順',true],
      ['points_high','ポイント：高い順',caps.points],
      ['points_low','ポイント：低い順',caps.points],
      ['availability_fast','反映：早い順',caps.availability],
      ['availability_slow','反映：遅い順',caps.availability],
      ['added_new','追加：新しい順',caps.addedAt],
      ['added_old','追加：古い順',caps.addedAt],
      ['popular','人気順',container.dataset.aspEnablePopular==='true'&&caps.popular]
    ].filter(x=>x[2]);
    container.innerHTML='<div class="asp-discovery-toolbar">'+
      '<div class="asp-discovery-chips" role="group" aria-label="案件の見つけ方">'+chips.map(([k,l,en])=>'<button type="button" data-asp-filter="'+k+'" aria-pressed="'+(k==='all'?'true':'false')+'" '+(en?'':'disabled aria-disabled="true"')+'>'+l+'</button>').join('')+'</div>'+
      '<div class="asp-discovery-controls"><label>サービスカテゴリ<select data-asp-category><option value="">すべて</option>'+categories.map(x=>'<option value="'+escapeHtml(x)+'">'+escapeHtml(x)+'</option>').join('')+'</select></label>'+
      '<label>並び替え<select data-asp-sort>'+sortOptions.map(([k,l])=>'<option value="'+k+'">'+l+'</option>').join('')+'</select></label></div>'+
      '<div class="asp-discovery-status" data-asp-status></div></div><div class="asp-discovery-list" data-asp-list></div>';
    let state={filterKey:'all',category:'',sortKey:'recommended'};
    const render=()=>{
      const result=queryOffers(rows,state);
      const list=container.querySelector('[data-asp-list]');
      const status=container.querySelector('[data-asp-status]');
      status.textContent=result.length+'件表示。確認できない報酬額・反映日数は表示・並び替えに使用しません。';
      list.innerHTML=result.length?result.map(x=>renderCard(x,client,serviceKey,placementId)).join(''):'<p class="asp-discovery-status">条件に一致する公開案件はありません。</p>';
      list.querySelectorAll('.asp-discovery-link').forEach(link=>link.addEventListener('click',()=>{
        const card=link.closest('[data-asp-offer-id]');
        const offer=normalized.find(x=>x.offer_id===card?.dataset.aspOfferId);
        if(offer)recordClick(client,offer,serviceKey,placementId);
      },{passive:true}));
    };
    container.querySelectorAll('[data-asp-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      if(btn.disabled)return;
      state.filterKey=btn.dataset.aspFilter;
      container.querySelectorAll('[data-asp-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===btn)));
      render();
    }));
    container.querySelector('[data-asp-category]').addEventListener('change',e=>{state.category=e.target.value;render();});
    container.querySelector('[data-asp-sort]').addEventListener('change',e=>{state.sortKey=e.target.value;render();});
    render();
  }

  if (typeof document !== 'undefined') {
    const init=()=>document.querySelectorAll('[data-asp-discovery-service][data-asp-discovery-placement]').forEach(mount);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  }

  return Object.freeze({
    FILTERS,SORTS,EASY_ACTION_TYPES,ACTION_LABELS,
    deriveActionType,normalizeOffer,matchesFilter,sortOffers,queryOffers,capabilities,mount
  });
});
