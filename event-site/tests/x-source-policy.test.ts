import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  X_SOURCE_POLICY,assessOfficialXAccount,preferredEvidenceSource,
  xAutomationAllowed,xFactsOnlyEvidenceAllowed
} from '../../shared/machiibe-ingestion/x-source-policy';

test('official X registry stays design-only with scraping/API/Production closed',()=>{
  const data=JSON.parse(fs.readFileSync(new URL('../../data/machiibe/official_x_source_registry_v1.json',import.meta.url),'utf8'));
  assert.equal(data.status,'design_only_no_api_fetch');
  assert.equal(data.rules.web_scraping_allowed,false);
  assert.equal(data.rules.website_dom_scripting_allowed,false);
  assert.equal(data.rules.official_api_fetch_enabled,false);
  assert.equal(data.rules.oauth_enabled,false);
  assert.equal(data.rules.recurring_fetch_enabled,false);
  assert.equal(data.rules.production_ingest_enabled,false);
  assert.equal(data.rules.x_post_body_reuse_default,false);
  assert.equal(data.rules.x_media_reuse_default,false);
  assert.equal(data.rules.blue_check_alone_is_official,false);
  assert.deepEqual(data.accounts,[]);
});

test('blue check alone never verifies an official account',()=>{
  const verdict=assessOfficialXAccount({
    officialSiteBacklink:false,
    officialOperatorPageMention:false,
    officialDomainMatch:false,
    goldCheckmark:false,
    greyCheckmark:false,
    verifiedOrganizationAffiliation:false,
    blueCheckmark:true,
    displayNameMatch:true,
    followerCount:1_000_000
  });
  assert.equal(verdict,'needs_review');
});

test('official-site backlink is sufficient strong evidence for official X account',()=>{
  const verdict=assessOfficialXAccount({
    officialSiteBacklink:true,
    officialOperatorPageMention:false,
    officialDomainMatch:true,
    goldCheckmark:false,
    greyCheckmark:false,
    verifiedOrganizationAffiliation:false,
    blueCheckmark:false
  });
  assert.equal(verdict,'verified_official');
});

test('X identity signal still requires official domain consistency when no site backlink exists',()=>{
  assert.equal(assessOfficialXAccount({
    officialSiteBacklink:false,
    officialOperatorPageMention:false,
    officialDomainMatch:true,
    goldCheckmark:true,
    greyCheckmark:false,
    verifiedOrganizationAffiliation:false,
    blueCheckmark:false
  }),'verified_official');
  assert.equal(assessOfficialXAccount({
    officialSiteBacklink:false,
    officialOperatorPageMention:false,
    officialDomainMatch:false,
    goldCheckmark:true,
    greyCheckmark:false,
    verifiedOrganizationAffiliation:false,
    blueCheckmark:false
  }),'needs_review');
});

test('X-only facts evidence requires public official post, provenance and no body/media reuse or inference',()=>{
  const allowed=xFactsOnlyEvidenceAllowed({
    accountVerdict:'verified_official',
    post:{
      publicPost:true,
      sourcePostUrl:'https://x.com/example/status/1234567890',
      explicitEventFact:true,
      inferredUnstatedFacts:false,
      fullPostBodyReused:false,
      mediaReused:false
    }
  });
  assert.equal(allowed,true);
  assert.equal(xFactsOnlyEvidenceAllowed({
    accountVerdict:'needs_review',
    post:{
      publicPost:true,
      sourcePostUrl:'https://x.com/example/status/1234567890',
      explicitEventFact:true,
      inferredUnstatedFacts:false,
      fullPostBodyReused:false,
      mediaReused:false
    }
  }),false);
  assert.equal(xFactsOnlyEvidenceAllowed({
    accountVerdict:'verified_official',
    post:{
      publicPost:true,
      sourcePostUrl:'https://x.com/example/status/1234567890',
      explicitEventFact:true,
      inferredUnstatedFacts:true,
      fullPostBodyReused:false,
      mediaReused:false
    }
  }),false);
});

test('web scraping stays blocked and API needs access, cost and policy approval',()=>{
  assert.equal(X_SOURCE_POLICY.webScrapingAllowed,false);
  assert.equal(xAutomationAllowed({mode:'web_scraping',apiAccessApproved:true,apiCostApproved:true,policyReviewed:true}),false);
  assert.equal(xAutomationAllowed({mode:'official_api',apiAccessApproved:true,apiCostApproved:false,policyReviewed:true}),false);
  assert.equal(xAutomationAllowed({mode:'official_api',apiAccessApproved:true,apiCostApproved:true,policyReviewed:true}),true);
  assert.equal(xAutomationAllowed({mode:'manual_research',apiAccessApproved:false,apiCostApproved:false,policyReviewed:false}),true);
});

test('official web becomes primary evidence when available after X announcement',()=>{
  assert.equal(preferredEvidenceSource({
    officialWebEventUrl:'https://official.example/event/1',
    xFactsAllowed:true
  }),'official_web_event_page');
  assert.equal(preferredEvidenceSource({
    officialWebEventUrl:null,
    xFactsAllowed:true
  }),'verified_official_x_post');
});
