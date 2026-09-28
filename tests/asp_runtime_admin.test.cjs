const assert = require('node:assert/strict');

const elements = {
  adminExportPassword: { value: 'test-admin-password' },
  adminAspImportJson: { value: '' },
  adminAspSourceUpdatedAt: { value: '2026-09-27T15:00' },
  adminAspRuntimeStatus: { textContent: '', style: {} },
  adminAspRuntimeList: { innerHTML: '' }
};
const calls = [];
global.document = {
  getElementById: (id) => elements[id] || null,
  addEventListener: () => {}
};
global.window = {
  db: {
    rpc: async (name, args) => { calls.push({ name, args }); return { data: 1, error: null }; }
  }
};
require('../asp-runtime-admin.js');

(async () => {
  const valid = [{
    offer_id: 'ofr_000002', asp: 'a8', program_id: 's00000027130002',
    advertiser_name: 'Advertiser', offer_name: 'Program', approval_status: 'approved',
    services: { machimamo: { source_listing_allowed: true, source_media_approved: true,
      production_listing_approved: false, media_conditions_verified: false, link_verified: false,
      web_approval_status: 'approved', tracking_url: 'https://px.a8.net/svt/path?a=original',
      point_reward_allowed: false, reward_permission: 'unknown', reward_enabled: false,
      reward_rule_confirmed: false, action_type: 'free_registration', cost_type: 'free',
      purchase_required: false, estimated_available_days: 3, source_added_at: '2026-09-27',
      recommendation_rank: 1, conversion_conditions: '無料会員登録' } }
  }];
  elements.adminAspImportJson.value = JSON.stringify(valid);
  await window.MachimamoAspAdmin.importFromSheet();
  assert.equal(calls.filter((call) => call.name === 'admin_import_asp_runtime').length, 1);
  assert.equal(calls[0].name, 'admin_import_asp_runtime');
  assert.equal(calls[0].args.p_offers[0].services.machimamo.tracking_url, valid[0].services.machimamo.tracking_url);
  assert.equal(calls[0].args.p_offers[0].offer_id, 'ofr_000002', 'preserves the stable offer_id from the current ASP master');
  assert.equal(calls[0].args.p_offers[0].services.machimamo.point_reward_allowed, false);
  assert.equal(calls[0].args.p_offers[0].services.machimamo.estimated_available_days, 3);
  assert.equal(calls[0].args.p_offers[0].services.machimamo.action_type, 'free_registration');
  assert.match(elements.adminAspRuntimeStatus.textContent, /公開状態は変更していません/);

  elements.adminAspImportJson.value = JSON.stringify([{ ...valid[0], html: '<script>alert(1)</script>' }]);
  await window.MachimamoAspAdmin.importFromSheet();
  assert.equal(calls.filter((call) => call.name === 'admin_import_asp_runtime').length, 1, 'raw HTML is blocked before the import RPC');
  assert.match(elements.adminAspRuntimeStatus.textContent, /完全広告HTML/);
  console.log('PASS: ASP admin import preserves exact tracking URL, defaults to no publication, and rejects raw HTML');
})().catch((error) => { console.error(error); process.exitCode = 1; });
