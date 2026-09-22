import test from 'node:test';
import assert from 'node:assert/strict';
import {HTML_LANG,LOCALE_LABELS,SUPPORTED_LOCALES,localePath,normalizeLocale,stripLocalePrefix} from '../lib/i18n-config';
import {getMessages} from '../lib/i18n';

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
