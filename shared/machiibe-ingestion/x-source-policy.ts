export type XOfficialityVerdict='verified_official'|'needs_review';

export type XAccountEvidence={
  officialSiteBacklink:boolean;
  officialOperatorPageMention:boolean;
  officialDomainMatch:boolean;
  goldCheckmark:boolean;
  greyCheckmark:boolean;
  verifiedOrganizationAffiliation:boolean;
  blueCheckmark:boolean;
  displayNameMatch?:boolean;
  followerCount?:number|null;
};

export type XPostEvidence={
  publicPost:boolean;
  sourcePostUrl:string;
  explicitEventFact:boolean;
  inferredUnstatedFacts:boolean;
  fullPostBodyReused:boolean;
  mediaReused:boolean;
};

export const X_SOURCE_POLICY={
  webScrapingAllowed:false,
  websiteDomScriptingAllowed:false,
  officialApiFetchEnabled:false,
  oauthEnabled:false,
  recurringFetchEnabled:false,
  productionIngestEnabled:false,
  officialWebPreferredAsPrimaryEvidence:true,
  blueCheckAloneIsOfficial:false,
  xPostBodyReuseDefault:false,
  xMediaReuseDefault:false,
  embedDefault:false,
  defaultUserSurface:'link_out' as const
};

export function assessOfficialXAccount(e:XAccountEvidence):XOfficialityVerdict{
  if(e.officialSiteBacklink||e.officialOperatorPageMention)return 'verified_official';
  const xIdentity=e.goldCheckmark||e.greyCheckmark||e.verifiedOrganizationAffiliation;
  if(xIdentity&&e.officialDomainMatch)return 'verified_official';
  return 'needs_review';
}

function isXPostUrl(value:string){
  try{
    const url=new URL(value);
    const host=url.hostname.toLowerCase();
    return (host==='x.com'||host==='www.x.com'||host==='twitter.com'||host==='www.twitter.com')
      && /\/status\/\d+/.test(url.pathname);
  }catch{return false;}
}

export function xFactsOnlyEvidenceAllowed(input:{
  accountVerdict:XOfficialityVerdict;
  post:XPostEvidence;
}){
  const {accountVerdict,post}=input;
  return accountVerdict==='verified_official'
    && post.publicPost
    && isXPostUrl(post.sourcePostUrl)
    && post.explicitEventFact
    && !post.inferredUnstatedFacts
    && !post.fullPostBodyReused
    && !post.mediaReused;
}

export function xAutomationAllowed(input:{
  mode:'manual_research'|'official_api'|'web_scraping';
  apiAccessApproved:boolean;
  apiCostApproved:boolean;
  policyReviewed:boolean;
}){
  if(input.mode==='manual_research')return true;
  if(input.mode==='web_scraping')return false;
  return input.apiAccessApproved&&input.apiCostApproved&&input.policyReviewed;
}

export function preferredEvidenceSource(input:{
  officialWebEventUrl:string|null;
  xFactsAllowed:boolean;
}){
  if(input.officialWebEventUrl)return 'official_web_event_page' as const;
  if(input.xFactsAllowed)return 'verified_official_x_post' as const;
  return 'needs_review' as const;
}
