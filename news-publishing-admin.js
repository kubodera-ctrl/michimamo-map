(function initMachimamoNewsPublishingAdmin() {
  'use strict';

  const SERVICE_ID = 'machimamo';
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

  const init = () => {
    const singleFilter = document.getElementById('adminNewsPrefectureFilter');
    const weeklyFilter = document.getElementById('adminWeeklyPrefecture');
    if (!singleFilter || !weeklyFilter) return;

    PREFECTURES.forEach((prefecture) => {
      singleFilter.add(new Option(prefecture, prefecture));
      weeklyFilter.add(new Option(prefecture, prefecture));
    });

    const dashboard = document.getElementById('adminDashboardArea');
    const updateAdminAdVisibility = () => {
      document.body.classList.toggle('admin-dashboard-open', dashboard?.style.display === 'block');
    };
    updateAdminAdVisibility();
    if (dashboard && typeof MutationObserver !== 'undefined') {
      new MutationObserver(updateAdminAdVisibility).observe(dashboard, { attributes: true, attributeFilter: ['style'] });
    }

    const state = window.MachimamoNewsPublishingAdmin = Object.freeze({
      version: 'news-publishing-admin-ui-v1',
      serviceId: SERVICE_ID,
      productionModes: Object.freeze(['SINGLE', 'WEEKLY']),
      informationKinds: Object.freeze(['LOCAL_ANOMALY', 'POLICE_OFFICIAL']),
      prefectureCount: PREFECTURES.length,
      connected: false,
    });
    document.dispatchEvent(new CustomEvent('machimamo:news-publishing-admin-ready', { detail: state }));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
