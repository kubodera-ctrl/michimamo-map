import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MACHIIBE_SOCIAL_MASTER} from '../lib/machiibe-social-master';
import {MACHIIBE_CAROUSEL_CURRENT,MACHIIBE_VIDEO_CURRENT} from '../lib/machiibe-production-master';
import {buildXShareText,xWeightedLength} from '../lib/share';

const read=(path:string)=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('legacy single-event TikTok asset master stays separate from CURRENT Production',()=>{
  assert.equal(MACHIIBE_SOCIAL_MASTER.tiktok.frames.length,5);
  assert.equal(MACHIIBE_SOCIAL_MASTER.tiktok.frames[4].id,'end_card');
  assert.equal(MACHIIBE_CAROUSEL_CURRENT.productionType,'CAROUSEL');
  assert.equal(MACHIIBE_CAROUSEL_CURRENT.output,'PNG');
  assert.equal(MACHIIBE_VIDEO_CURRENT.active,false);
  assert.equal(MACHIIBE_SOCIAL_MASTER.brand.aiMayChangeLayout,false);
});

test('X master leaves room for the separately attached URL',()=>{
  const text=buildXShareText({
    prefix:'【今週末のおでかけ】',
    placeText:'東京都 江東区 有明',
    title:'とても長いイベントタイトルが入ってもX投稿画面からはみ出しにくいようにするテストイベント',
    conditionText:'子どもが主役・屋内・完全無料',
    dateText:'2026年9月26日〜2026年9月27日',
    timeText:'10:00〜17:00',
    summary:'長いイベント説明はCTAがある管理投稿では省略して、詳細ページへ誘導する。',
    ctaLines:[MACHIIBE_SOCIAL_MASTER.copy.cta.machiibe,MACHIIBE_SOCIAL_MASTER.copy.cta.machimamo],
    hashtags:['まちイベ','東京イベント','親子イベント'],
    pageUrl:'https://example.jp/events/example'
  });
  assert.ok(xWeightedLength(text)<=250,`X master text too long: ${xWeightedLength(text)}`);
  assert.match(text,/まちイベ/);
  assert.match(text,/まちまも/);
});

test('current TikTok renderer consumes canonical dimensions and safe area',()=>{
  const source=read('../components/TikTokAssetGenerator.tsx');
  assert.match(source,/MACHIIBE_SOCIAL_MASTER\.tiktok\.safeArea/);
  assert.match(source,/MACHIIBE_SOCIAL_MASTER\.tiktok\.format/);
});

test('admin exposes CURRENT CAROUSEL and keeps VIDEO disabled until its formal master exists',()=>{
  const admin=read('../app/admin/page.tsx');
  const master=read('../app/admin/social-master/page.tsx');
  assert.match(admin,/\\/admin\\/social-master/);
  assert.match(master,/CAROUSEL — ACTIVE/);
  assert.match(master,/VIDEO — MASTER待ち/);
  assert.match(master,/MACHIIBE_VIDEO_CURRENT\\.reason/);
  assert.match(master,/SNS Publishing/);
});
