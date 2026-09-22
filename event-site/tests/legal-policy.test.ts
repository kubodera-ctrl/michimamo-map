import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(new URL(path,import.meta.url),'utf8');

const publicPolicyPages=[
  '../app/policies/page.tsx',
  '../app/terms/page.tsx',
  '../app/privacy/page.tsx',
  '../app/external-transmission/page.tsx',
  '../app/data-policy/page.tsx',
  '../app/advertising-policy/page.tsx',
  '../app/copyright/page.tsx',
  '../app/disclaimer/page.tsx',
  '../app/accessibility/page.tsx',
  '../app/corrections/page.tsx',
  '../app/operator/page.tsx'
];

test('all public policy pages follow the shared launch indexing gate',()=>{
  for(const path of publicPolicyPages){
    const source=read(path);
    assert.match(source,/publicPolicyRobots\(\)/,path);
    assert.match(source,/POLICY_UPDATED/,path);
  }
});

test('policy center links every governance page',()=>{
  const source=read('../app/policies/page.tsx');
  for(const href of [
    '/terms','/privacy','/external-transmission','/data-policy','/advertising-policy',
    '/copyright','/disclaimer','/accessibility','/corrections','/operator'
  ]){
    assert.ok(source.includes(`href:'${href}'`),`missing policy link: ${href}`);
  }
});

test('advertising policy requires clear PR disclosure and separates organic search',()=>{
  const source=read('../app/advertising-policy/page.tsx');
  assert.match(source,/「PR」「広告」「スポンサー」「プロモーション」/);
  assert.match(source,/通常検索結果との分離/);
  assert.match(source,/アフィリエイトリンク/);
  assert.match(source,/個人情報を、広告配信を目的として広告主へ販売する運用は行いません/);
});

test('privacy policy documents local storage, analytics, retention and external transmission',()=>{
  const source=read('../app/privacy/page.tsx');
  assert.match(source,/ローカルストレージ/);
  assert.match(source,/Google Analyticsには、まちイベの生の検索語を送信しません/);
  assert.match(source,/原則90日を超えたデータを削除/);
  assert.match(source,/\/external-transmission/);
  assert.match(source,/未成年者/);
});

test('external transmission page reflects implemented Google, Supabase and OSM dependencies',()=>{
  const source=read('../app/external-transmission/page.tsx');
  const map=read('../components/SavedEventsMapClient.tsx');
  const supabase=read('../lib/supabase.ts');
  const layout=read('../app/layout.tsx');

  assert.match(source,/Google Analytics/);
  assert.match(source,/Supabase/);
  assert.match(source,/OpenStreetMap/);
  assert.match(map,/tile\.openstreetmap\.org/);
  assert.match(supabase,/NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(layout,/googletagmanager\.com/);
});

test('event data policy keeps automated collection separate from publication',()=>{
  const source=read('../app/data-policy/page.tsx');
  assert.match(source,/「自動取得」と「自動公開」は別の処理/);
  assert.match(source,/未確認の事実を推測で補完しません/);
  assert.match(source,/画像・ロゴ・作品素材/);
  assert.match(source,/AIの推測だけで公開情報として確定しない/);
});

test('correction workflow has rights takedown and safe contact fallback',()=>{
  const source=read('../app/corrections/page.tsx');
  assert.match(source,/権利侵害申告/);
  assert.match(source,/掲載停止依頼/);
  assert.match(source,/一時非表示/);
  assert.match(source,/correctionFormUrl\(\)/);
  assert.match(source,/contactUrl\(\)/);
});

test('footer exposes policy hub, terms, privacy, corrections and operator',()=>{
  const source=read('../app/layout.tsx');
  for(const href of ['/policies','/terms','/privacy','/corrections','/operator']){
    assert.ok(source.includes(`href="${href}"`),`missing footer link: ${href}`);
  }
});

test('beta sitemap is empty until explicit indexing is allowed and includes policies after launch',()=>{
  const source=read('../app/sitemap.ts');
  assert.match(source,/if\(!searchIndexingAllowed\(\)\) return \[\]/);
  assert.match(source,/STATIC_POLICY_PATHS/);
  assert.match(source,/external-transmission/);
});

test('public operator/contact URLs require HTTPS and have safe fallback',()=>{
  const source=read('../lib/url-config.ts');
  assert.match(source,/export function operatorSiteUrl/);
  assert.match(source,/export function contactUrl/);
  assert.match(source,/export function correctionFormUrl/);
  assert.match(source,/httpsOnly:true/);
});
