import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MACHIIBE_SOCIAL_MASTER} from '../lib/machiibe-social-master.ts';
import {buildXShareText,xWeightedLength} from '../lib/share.ts';

const read=(path:string)=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

test('social master locks five TikTok frames and a separate end card',()=>{
  assert.equal(MACHIIBE_SOCIAL_MASTER.tiktok.frames.length,5);
  assert.deepEqual(MACHIIBE_SOCIAL_MASTER.tiktok.format,{width:1080,height:1920,aspect:'9:16',fps:30});
  assert.equal(MACHIIBE_SOCIAL_MASTER.tiktok.frames[4].id,'end_card');
  assert.equal(MACHIIBE_SOCIAL_MASTER.tiktok.frames[4].layout,'separate_end_card');
  assert.equal(MACHIIBE_SOCIAL_MASTER.brand.aiMayChangeLayout,false);
  assert.equal(MACHIIBE_SOCIAL_MASTER.media.requireUsagePermission,true);
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

test('admin exposes the production master and keeps manual posting',()=>{
  const admin=read('../app/admin/page.tsx');
  const master=read('../app/admin/social-master/page.tsx');
  assert.match(admin,/\/admin\/social-master/);
  assert.match(master,/固定5Frame/);
  assert.match(master,/自動投稿はしません/);
});
