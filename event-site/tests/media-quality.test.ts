import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  mediaSafetyState,
  measureMediaQuality,
  selectDisplayMedia,
  type ImageRightsContract,
  type MediaCandidate
} from '../../shared/machiibe-ingestion/contracts';

const reviewedRights=(patch:Partial<ImageRightsContract>={}):ImageRightsContract=>({
  displayAllowed:true,
  cacheAllowed:false,
  commercialAllowed:false,
  snsAllowed:false,
  attributionRequired:false,
  attributionText:null,
  licenseName:null,
  licenseUrl:null,
  rightsSourceUrl:'https://example.test/rights-evidence',
  reviewedAt:'2026-10-01',
  ...patch
});

const media=(patch:Partial<MediaCandidate> & Pick<MediaCandidate,'id'|'role'>):MediaCandidate=>({
  subjectType:patch.role==='category_visual'||patch.role==='generic_fallback'?'category':'event',
  url:'https://example.test/image.jpg',
  rights:reviewedRights(),
  machiibeOwned:false,
  ...patch
});

test('media safety state is fail-closed until display rights and provenance review are explicit',()=>{
  const safe=media({id:'safe',role:'event_official'});
  const unknown=media({
    id:'unknown',
    role:'event_official',
    rights:reviewedRights({displayAllowed:null,rightsSourceUrl:null,reviewedAt:null})
  });
  const blocked=media({
    id:'blocked',
    role:'event_official',
    rights:reviewedRights({displayAllowed:false})
  });
  const owned=media({
    id:'owned',
    role:'category_visual',
    url:null,
    machiibeOwned:true,
    rights:reviewedRights({displayAllowed:null,rightsSourceUrl:null,reviewedAt:null})
  });
  assert.equal(mediaSafetyState(safe),'SAFE');
  assert.equal(mediaSafetyState(unknown),'REVIEW_REQUIRED');
  assert.equal(mediaSafetyState(blocked),'DO_NOT_USE');
  assert.equal(mediaSafetyState(owned),'SAFE');
});

test('display resolver follows official -> illustration -> venue -> branded category and skips unsafe media',()=>{
  const selected=selectDisplayMedia([
    media({id:'official-unknown',role:'event_official',rights:reviewedRights({displayAllowed:null,rightsSourceUrl:null,reviewedAt:null})}),
    media({id:'venue-safe',role:'venue_official',subjectType:'venue'}),
    media({id:'illustration-safe',role:'event_illustration'}),
    media({id:'category-safe',role:'category_visual',url:null,machiibeOwned:true})
  ]);
  assert.equal(selected?.id,'illustration-safe');

  const category=selectDisplayMedia([
    media({id:'official-blocked',role:'event_official',rights:reviewedRights({displayAllowed:false})}),
    media({id:'venue-review',role:'venue_official',subjectType:'venue',rights:reviewedRights({reviewedAt:null})}),
    media({id:'category-safe',role:'category_visual',url:null,machiibeOwned:true})
  ]);
  assert.equal(category?.id,'category-safe');
});

test('media quality KPI is measurable and reaches 100/0/0 with safe fallback coverage',()=>{
  const result=measureMediaQuality([
    {eventId:'e1',candidates:[media({id:'official',role:'event_official'})]},
    {eventId:'e2',candidates:[media({id:'illustration',role:'event_illustration'})]},
    {eventId:'e3',candidates:[media({id:'venue',role:'venue_official',subjectType:'venue'})]},
    {eventId:'e4',candidates:[media({id:'category',role:'category_visual',url:null,machiibeOwned:true})]}
  ]);
  assert.equal(result.image_coverage_rate,100);
  assert.equal(result.empty_visual_count,0);
  assert.equal(result.rights_unknown_public_image_count,0);
});

test('database draft tracks provenance/final public selection and rejects unknown-rights public selection by contract',()=>{
  const sql=fs.readFileSync(new URL('../../supabase/migrations/20260928143000_machiibe_national_ingestion_foundation.sql',import.meta.url),'utf8');
  assert.match(sql,/event_illustration/);
  assert.match(sql,/provenance_kind/);
  assert.match(sql,/checked_at/);
  assert.match(sql,/public_selected/);
  assert.match(sql,/machiibe_media_public_gate_ck/);
  assert.match(sql,/provenance_kind <> 'unknown'/);
  assert.match(sql,/rights_reviewed_at is not null/);
});
