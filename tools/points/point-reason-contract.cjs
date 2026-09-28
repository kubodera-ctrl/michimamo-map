'use strict';

const REASONS = Object.freeze({
  spot_post: Object.freeze({state:'active', direction:'credit', source:'user_post', beta:true}),
  spot_like: Object.freeze({state:'active', direction:'credit', source:'user_like', beta:true}),
  quiz: Object.freeze({state:'legacy_compatible', direction:'credit', source:'legacy_quiz_points', beta:false}),
  gacha_cost: Object.freeze({state:'active_existing', direction:'debit', source:'gacha', beta:false}),
  gacha_prize: Object.freeze({state:'active_existing', direction:'credit', source:'gacha', beta:false}),
  admin: Object.freeze({state:'active_admin', direction:'both', source:'admin_adjustment', beta:false}),
  aed_new_approval: Object.freeze({state:'legacy_compatible', direction:'credit', source:'legacy_aed_approval', beta:false}),
  weekly_quiz_stamp_reward: Object.freeze({state:'active', direction:'credit', source:'weekly_stamps', beta:true}),
  aed_stamp_reward: Object.freeze({state:'active', direction:'credit', source:'aed_stamps', beta:true}),
  point_exchange: Object.freeze({state:'contract_ready_feature_off', direction:'debit', source:'point_exchange', beta:false}),
  point_exchange_reversal: Object.freeze({state:'planned_inactive', direction:'credit', source:'point_exchange', beta:false}),
  asp_reward: Object.freeze({state:'planned_inactive', direction:'credit', source:'asp_conversion', beta:false}),
  asp_reward_reversal: Object.freeze({state:'planned_inactive', direction:'debit', source:'asp_conversion', beta:false}),
  vehicle_reward: Object.freeze({state:'planned_inactive', direction:'credit', source:'vehicle_detection', beta:false})
});

const DB_ALLOWED_AFTER_MIGRATION = Object.freeze(
  Object.entries(REASONS)
    .filter(([,meta]) => meta.state !== 'planned_inactive')
    .map(([reason]) => reason)
);

const PLANNED_INACTIVE = Object.freeze(
  Object.entries(REASONS)
    .filter(([,meta]) => meta.state === 'planned_inactive')
    .map(([reason]) => reason)
);

function isContractReason(reason) {
  return Object.prototype.hasOwnProperty.call(REASONS, reason);
}
function isDatabaseAllowedAfterMigration(reason) {
  return DB_ALLOWED_AFTER_MIGRATION.includes(reason);
}
function isBetaEnabledReason(reason) {
  return !!REASONS[reason]?.beta;
}

module.exports = Object.freeze({
  REASONS,
  DB_ALLOWED_AFTER_MIGRATION,
  PLANNED_INACTIVE,
  isContractReason,
  isDatabaseAllowedAfterMigration,
  isBetaEnabledReason
});
