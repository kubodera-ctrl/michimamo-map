'use strict';

export const DRIVE_PREMIUM_FEATURE_KEY='police_official_info';

const ACTIVE='ACTIVE';
const TEST_SOURCE='TEST_GRANT';
const SERVER_SOURCE='SERVER_DB';

function text(value){return String(value??'').normalize('NFKC').trim();}
function parseTime(value){
  const ms=Date.parse(value);
  return Number.isFinite(ms)?ms:null;
}

export function evaluateDrivePremiumEntitlement({
  featureKey,
  auth,
  grants,
  now=new Date().toISOString(),
  environment='preview',
  allowTestGrant=false
}={}){
  const key=text(featureKey);
  if(key!==DRIVE_PREMIUM_FEATURE_KEY){
    return Object.freeze({allowed:false,reason:'UNKNOWN_FEATURE'});
  }

  const userId=text(auth?.userId);
  if(!auth?.verifiedServerSide||!userId){
    return Object.freeze({allowed:false,reason:'AUTH_REQUIRED'});
  }

  const nowMs=parseTime(now);
  if(nowMs===null){
    return Object.freeze({allowed:false,reason:'INVALID_NOW'});
  }

  const rows=Array.isArray(grants)?grants:[];
  const candidate=rows.find(row=>text(row?.userId)===userId&&text(row?.featureKey)===key);
  if(!candidate){
    return Object.freeze({allowed:false,reason:'NO_GRANT'});
  }

  const source=text(candidate.source);
  const isProduction=text(environment).toLowerCase()==='production';
  const sourceAllowed=source===SERVER_SOURCE||(!isProduction&&allowTestGrant&&source===TEST_SOURCE);
  if(!sourceAllowed){
    return Object.freeze({allowed:false,reason:'UNTRUSTED_GRANT_SOURCE'});
  }

  if(text(candidate.status)!==ACTIVE){
    return Object.freeze({allowed:false,reason:'GRANT_INACTIVE'});
  }

  const expiresAt=text(candidate.expiresAt);
  if(expiresAt){
    const expiresMs=parseTime(expiresAt);
    if(expiresMs===null||expiresMs<=nowMs){
      return Object.freeze({allowed:false,reason:'GRANT_EXPIRED'});
    }
  }

  return Object.freeze({allowed:true,reason:source===TEST_SOURCE?'TEST_GRANT_ACTIVE':'ENTITLED'});
}

export function drivePremiumUiState(entitlement,{storeConnected=false}={}){
  if(entitlement?.allowed===true){
    return Object.freeze({state:'UNLOCKED',canRequestPremium:true});
  }
  return Object.freeze({
    state:storeConnected?'LOCKED':'LOCKED_STORE_NOT_CONNECTED',
    canRequestPremium:false
  });
}
