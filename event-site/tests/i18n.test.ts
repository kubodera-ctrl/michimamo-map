import test from 'node:test';
import assert from 'node:assert/strict';
import {HTML_LANG,LOCALE_LABELS,SUPPORTED_LOCALES,localePath,normalizeLocale,stripLocalePrefix} from '../lib/i18n-config';
import {getMessages} from '../lib/i18n';
import fs from 'node:fs';

test('public locale set stays stable',()=>{
  assert.deepEqual([...SUPPORTED_LOCALES],['ja','en','zh-cn','zh-tw','ko']);
  for(const locale of SUPPORTED_LOCALES){
    assert.ok(LOCALE_LABELS[locale]);
    assert.ok(HTML_LANG[locale]);
    assert.ok(getMessages(locale).homeTitle);
    assert.ok(getMessages(locale).footerNotice);
  }
});

test('locale paths preserve Japanese canonical URLs and prefix foreign locales',()=>{
  assert.equal(localePath('/events/example','ja'),'/events/example');
  assert.equal(localePath('/events/example','en'),'/en/events/example');
  assert.equal(localePath('/zh-cn/events/example','ko'),'/ko/events/example');
  assert.deepEqual(stripLocalePrefix('/zh-tw/events/example'),{locale:'zh-tw',pathname:'/events/example',hadPrefix:true});
});

test('unknown locale falls back safely to Japanese',()=>{
  assert.equal(normalizeLocale('fr'),'ja');
  assert.equal(normalizeLocale('EN'),'en');
});


test('translation SQL keeps machine output behind review',()=>{
  const sql=fs.readFileSync(new URL('../../supabase/migrations/20260923073000_event_i18n_foundation.sql',import.meta.url),'utf8');
  assert.match(sql,/event_translations_review_gate_ck/);
  assert.match(sql,/review_status <> 'approved'/);
  assert.match(sql,/machine_reviewed/);
  assert.match(sql,/revoke all on table public\.event_translations from anon,authenticated/i);
  assert.match(sql,/revoke all on function public\.get_public_event_translations\(bigint\[\],text\)/i);
  assert.match(sql,/grant execute on function public\.get_public_event_translations\(bigint\[\],text\)/i);
  assert.match(sql,/t\.review_status='approved'/);
  assert.match(sql,/p_event_ids\[1:100\]/);
});

test('public shell contains locale rewrite and language switcher',()=>{
  const middleware=fs.readFileSync(new URL('../middleware.ts',import.meta.url),'utf8');
  const layout=fs.readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8');
  assert.match(middleware,/x-machiibe-locale/);
  assert.match(middleware,/machiibe_locale/);
  assert.match(layout,/LanguageSwitcher/);
  assert.match(layout,/HTML_LANG\[locale\]/);
  assert.match(layout,/zh-Hans/);
  assert.match(layout,/zh-Hant/);
});
