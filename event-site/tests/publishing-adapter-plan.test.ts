import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_PUBLISHING_CAPABILITIES,
  planPublishingReadiness
} from '../lib/publishing-adapter-plan';

test('TikTok CURRENT photo path accepts 5-8 page CAROUSEL only when media and OAuth gates are ready',()=>{
  const blocked=planPublishingReadiness({
    platform:'tiktok',
    productionType:'CAROUSEL',
    mediaCount:8,
    publishEligible:true,
    approvalStatus:'approved',
    credentialsConfigured:false,
    publicMediaReady:false,
    verifiedMediaDomain:false
  });
  assert.equal(blocked.allowed,false);
  assert.ok(blocked.blockers.includes('tiktok_oauth_not_configured'));
  assert.ok(blocked.blockers.includes('tiktok_public_media_urls_not_ready'));
  assert.ok(blocked.blockers.includes('tiktok_media_domain_not_verified'));

  const ready=planPublishingReadiness({
    platform:'tiktok',
    productionType:'CAROUSEL',
    mediaCount:8,
    publishEligible:true,
    approvalStatus:'approved',
    credentialsConfigured:true,
    publicMediaReady:true,
    verifiedMediaDomain:true
  });
  assert.equal(ready.allowed,true);
  assert.equal(ready.mode,'tiktok_photo_direct');
  assert.equal(CURRENT_PUBLISHING_CAPABILITIES.tiktok.maxPhotosPerPost,35);
});

test('X never silently drops CURRENT carousel pages above four',()=>{
  const plan=planPublishingReadiness({
    platform:'x',
    productionType:'CAROUSEL',
    mediaCount:5,
    publishEligible:true,
    approvalStatus:'approved',
    credentialsConfigured:true,
    publicMediaReady:true,
    verifiedMediaDomain:true
  });
  assert.equal(plan.allowed,false);
  assert.ok(plan.blockers.includes('x_carousel_exceeds_single_post_media_limit'));
  assert.ok(plan.blockers.includes('x_multi_post_strategy_not_approved'));
  assert.equal(CURRENT_PUBLISHING_CAPABILITIES.x.maxPhotosPerPost,4);
});

test('publishing gate remains fail-closed before QC and admin approval',()=>{
  const plan=planPublishingReadiness({
    platform:'tiktok',
    productionType:'CAROUSEL',
    mediaCount:5,
    publishEligible:false,
    approvalStatus:'pending',
    credentialsConfigured:true,
    publicMediaReady:true,
    verifiedMediaDomain:true
  });
  assert.equal(plan.allowed,false);
  assert.ok(plan.blockers.includes('revision_not_publish_eligible'));
  assert.ok(plan.blockers.includes('revision_not_admin_approved'));
});
