import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canRequestPlatformPost,
  deriveOverallPostState,
  isTikTokFinalPosted,
  isXCreateComplete,
  mapTikTokExternalStatus,
  platformDisplayState,
  publishingIdempotencyKey
} from '../lib/publishing-state';

test('platform idempotency key is stable per postSet + revision + platform + repost sequence',()=>{
  assert.equal(publishingIdempotencyKey({postSetId:'p1',revisionId:'r1',platform:'tiktok'}),'p1:r1:tiktok:0');
  assert.equal(publishingIdempotencyKey({postSetId:'p1',revisionId:'r1',platform:'tiktok',repostSequence:1}),'p1:r1:tiktok:1');
});

test('TikTok is complete only at PUBLISH_COMPLETE',()=>{
  assert.equal(mapTikTokExternalStatus('PROCESSING_UPLOAD'),'uploading');
  assert.equal(mapTikTokExternalStatus('PROCESSING_DOWNLOAD'),'posting');
  assert.equal(mapTikTokExternalStatus('SEND_TO_USER_INBOX'),'sent');
  assert.equal(mapTikTokExternalStatus('PUBLISH_COMPLETE'),'posted');
  assert.equal(mapTikTokExternalStatus('FAILED'),'failed');
  assert.equal(isTikTokFinalPosted('SEND_TO_USER_INBOX'),false);
  assert.equal(isTikTokFinalPosted('PUBLISH_COMPLETE'),true);
});

test('X is complete only after 201 plus an external post id',()=>{
  assert.equal(isXCreateComplete(200,'123'),false);
  assert.equal(isXCreateComplete(201,null),false);
  assert.equal(isXCreateComplete(201,'123'),true);
});

test('overall status distinguishes none partial done processing and failed',()=>{
  assert.equal(deriveOverallPostState([]),'未');
  assert.equal(deriveOverallPostState([{platform:'x',status:'posted'}]),'一部済');
  assert.equal(deriveOverallPostState([{platform:'x',status:'posted'},{platform:'tiktok',status:'posted'}]),'済');
  assert.equal(deriveOverallPostState([{platform:'x',status:'queued'},{platform:'tiktok',status:'not_requested'}]),'投稿処理中');
  assert.equal(deriveOverallPostState([{platform:'x',status:'failed'}]),'失敗');
});

test('approved publishEligible revision is required and posted revision needs explicit repost',()=>{
  assert.equal(canRequestPlatformPost({publishEligible:false,approvalStatus:'approved',platform:'x'}),false);
  assert.equal(canRequestPlatformPost({publishEligible:true,approvalStatus:'pending',platform:'x'}),false);
  assert.equal(canRequestPlatformPost({publishEligible:true,approvalStatus:'approved',platform:'x'}),true);
  assert.equal(canRequestPlatformPost({
    publishEligible:true,approvalStatus:'approved',platform:'x',
    existing:{platform:'x',status:'posted'}
  }),false);
  assert.equal(canRequestPlatformPost({
    publishEligible:true,approvalStatus:'approved',platform:'x',
    existing:{platform:'x',status:'posted'},explicitRepost:true
  }),true);
});


test('platform display distinguishes connection setup and posting lifecycle',()=>{
  assert.equal(platformDisplayState({connected:false,publishEligible:true,status:'not_requested'}),'接続設定必要');
  assert.equal(platformDisplayState({connected:true,publishEligible:false,status:'not_requested'}),'未');
  assert.equal(platformDisplayState({connected:true,publishEligible:true,status:'not_requested'}),'投稿準備中');
  assert.equal(platformDisplayState({connected:true,publishEligible:true,status:'queued'}),'queued');
  assert.equal(platformDisplayState({connected:true,publishEligible:true,status:'uploading'}),'uploading');
  assert.equal(platformDisplayState({connected:true,publishEligible:true,status:'sent'}),'送信済 / 投稿未完了');
  assert.equal(platformDisplayState({connected:true,publishEligible:true,status:'posting'}),'posting');
  assert.equal(platformDisplayState({connected:true,publishEligible:true,status:'posted'}),'済');
  assert.equal(platformDisplayState({connected:true,publishEligible:true,status:'failed'}),'失敗');
});
