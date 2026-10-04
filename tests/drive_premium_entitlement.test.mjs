import assert from 'node:assert/strict';
import {
  DRIVE_PREMIUM_FEATURE_KEY,
  drivePremiumUiState,
  evaluateDrivePremiumEntitlement
} from '../scripts/drive_premium_entitlement.mjs';

const now='2026-10-01T00:00:00Z';
const auth={verifiedServerSide:true,userId:'user-1'};

assert.deepEqual(
  evaluateDrivePremiumEntitlement({featureKey:DRIVE_PREMIUM_FEATURE_KEY,now}),
  {allowed:false,reason:'AUTH_REQUIRED'}
);
assert.deepEqual(
  evaluateDrivePremiumEntitlement({featureKey:'other',auth,now}),
  {allowed:false,reason:'UNKNOWN_FEATURE'}
);
assert.deepEqual(
  evaluateDrivePremiumEntitlement({featureKey:DRIVE_PREMIUM_FEATURE_KEY,auth,grants:[],now}),
  {allowed:false,reason:'NO_GRANT'}
);
assert.deepEqual(
  evaluateDrivePremiumEntitlement({
    featureKey:DRIVE_PREMIUM_FEATURE_KEY,
    auth,
    now,
    grants:[{userId:'user-1',featureKey:DRIVE_PREMIUM_FEATURE_KEY,status:'ACTIVE',source:'CLIENT'}]
  }),
  {allowed:false,reason:'UNTRUSTED_GRANT_SOURCE'}
);
assert.deepEqual(
  evaluateDrivePremiumEntitlement({
    featureKey:DRIVE_PREMIUM_FEATURE_KEY,
    auth,
    now,
    grants:[{userId:'user-1',featureKey:DRIVE_PREMIUM_FEATURE_KEY,status:'ACTIVE',source:'TEST_GRANT'}],
    allowTestGrant:true,
    environment:'production'
  }),
  {allowed:false,reason:'UNTRUSTED_GRANT_SOURCE'}
);
assert.deepEqual(
  evaluateDrivePremiumEntitlement({
    featureKey:DRIVE_PREMIUM_FEATURE_KEY,
    auth,
    now,
    grants:[{userId:'user-1',featureKey:DRIVE_PREMIUM_FEATURE_KEY,status:'ACTIVE',source:'TEST_GRANT'}],
    allowTestGrant:true,
    environment:'preview'
  }),
  {allowed:true,reason:'TEST_GRANT_ACTIVE'}
);
assert.deepEqual(
  evaluateDrivePremiumEntitlement({
    featureKey:DRIVE_PREMIUM_FEATURE_KEY,
    auth,
    now,
    grants:[{userId:'user-1',featureKey:DRIVE_PREMIUM_FEATURE_KEY,status:'ACTIVE',source:'SERVER_DB',expiresAt:'2026-09-30T23:59:59Z'}]
  }),
  {allowed:false,reason:'GRANT_EXPIRED'}
);
assert.deepEqual(
  evaluateDrivePremiumEntitlement({
    featureKey:DRIVE_PREMIUM_FEATURE_KEY,
    auth,
    now,
    grants:[{userId:'user-1',featureKey:DRIVE_PREMIUM_FEATURE_KEY,status:'ACTIVE',source:'SERVER_DB',expiresAt:'2026-10-02T00:00:00Z'}]
  }),
  {allowed:true,reason:'ENTITLED'}
);
assert.deepEqual(
  drivePremiumUiState({allowed:false},{storeConnected:false}),
  {state:'LOCKED_STORE_NOT_CONNECTED',canRequestPremium:false}
);
assert.deepEqual(
  drivePremiumUiState({allowed:true},{storeConnected:false}),
  {state:'UNLOCKED',canRequestPremium:true}
);

console.log('PASS: DRIVE Premium entitlement server-side fail-closed contract');
