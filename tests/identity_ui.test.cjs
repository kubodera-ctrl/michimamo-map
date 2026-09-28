'use strict';
const assert=require('node:assert/strict');
const identity=require('../identity-ui.js');
const profile=require('../profile-v2.js');
const fs=require('node:fs');
const path=require('node:path');

let state=identity.identityStateFromSession(null,'line');
assert.deepEqual(state,[],'saved provider without a real session is ignored');

state=identity.identityStateFromSession({user:{app_metadata:{},identities:[]}},'line');
assert.deepEqual(state,[{provider:'line',linked:true,verified:true,linkedAt:null}]);
assert.deepEqual(Object.keys(state[0]).sort(),['linked','linkedAt','provider','verified']);
assert.equal('email' in state[0],false);
assert.equal('uid' in state[0],false);

state=identity.identityStateFromSession({user:{
  app_metadata:{provider:'google',providers:['google','line']},
  identities:[
    {provider:'google',created_at:'2026-09-21T00:00:00Z'},
    {provider:'line',created_at:'2026-09-20T00:00:00Z'}
  ]
}},null);
assert.equal(state.length,2);
let badges=identity.badgeModel(state);
assert.equal(badges.mode,'individual');
assert.deepEqual(badges.badges.map(x=>x.label),['✓ Google','✓ LINE']);
assert.equal(identity.isLineLinked(state),true);

badges=identity.badgeModel([
  {provider:'line',linked:true,verified:true,linkedAt:null},
  {provider:'google',linked:true,verified:true,linkedAt:null},
  {provider:'apple',linked:true,verified:true,linkedAt:null}
]);
assert.equal(badges.mode,'summary');
assert.equal(badges.label,'認証済み 3');

assert.equal(identity.qaAllowed('machimamo-map-git-feat-dev36-identity-ui-miti4.vercel.app','?identityQa=1'),true);
assert.equal(identity.qaAllowed('machimamo-map.vercel.app','?identityQa=1'),false);
assert.equal(identity.qaAllowed('machimamo-iuc2di1cu-miti4.vercel.app','?identityQa=1'),false);

for(const key of ['auto','line','longauto','custom','multi']){
  const fixture=identity.fixtureState(key);
  assert.ok(fixture.name);
}
assert.equal(identity.fixtureState('auto').nameSource,'generated_v2');
assert.equal(identity.fixtureState('auto').name,'げんきなペンギン');
assert.equal(identity.fixtureState('longauto').name,'おだやかなカワウソ');
assert.equal(identity.fixtureState('custom').nameSource,'custom');
assert.equal(identity.fixtureState('multi').identities.length,3);

for(let i=0;i<80;i++){
  let cursor=i+1;
  const generated=profile.generateGuestName(()=>((cursor=(cursor*9301+49297)%233280)/233280));
  assert.equal(profile.isGeneratedGuestName(generated),true,generated);
}
assert.equal(profile.isGeneratedGuestName('ボス'),false);

const onboarding=fs.readFileSync(path.join(__dirname,'..','pwa-onboarding.js'),'utf8');
assert.match(onboarding,/現在の表示名は自動で設定されています。LINE認証後、マイページからニックネームを設定できます。/);
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
assert.match(html,/identity-ui\\.js\\?v=36-identity2/);
assert.match(html,/MachimamoIdentityUI\?\.syncSession/);
console.log('PASS identity UI contract, provider badges, generated-name metadata, safe Preview fixtures and tutorial copy');

const identitySource=fs.readFileSync(path.join(__dirname,'..','identity-ui.js'),'utf8');
assert.match(identitySource,/live session and linked/);
assert.match(identitySource,/未認証＋自動生成名/);
assert.match(identitySource,/長い自動生成名/);
assert.match(identitySource,/custom nickname/);
assert.match(identitySource,/showLineRequiredNameModal/);
const profileSource=fs.readFileSync(path.join(__dirname,'..','profile-v2.js'),'utf8');
assert.match(profileSource,/現在の名前は自動生成されています。名前を変更するにはLINE認証をお願いします。/);
assert.match(profileSource,/※ 編集/);

assert.equal(identity.fixtureState('unknown').name,'げんきなペンギン');
assert.equal(identity.formalLineAccessFromState(null,'line',true),false,'provider marker without session cannot grant access');
assert.equal(identity.formalLineAccessFromState({user:{app_metadata:{},identities:[]}},'line',false),false,'provider marker without linked profile cannot grant access');
assert.equal(identity.formalLineAccessFromState({user:{app_metadata:{},identities:[]}},'line',true),true,'existing custom LINE exchange requires session + linked profile + marker');
assert.equal(identity.formalLineAccessFromState({user:{app_metadata:{providers:['line']},identities:[]}},null,false),true,'explicit session provider is sufficient');
assert.equal(identity.formalLineAccessFromState({user:{app_metadata:{providers:['google']},identities:[]}},null,true),false,'Google-only session is not LINE access');

assert.equal(identity.nicknameEditDecision('generated_v2',false),'line_required');
assert.equal(identity.nicknameEditDecision('generated',false),'line_required');
assert.equal(identity.nicknameEditDecision('custom',false),'edit');
assert.equal(identity.nicknameEditDecision('generated_v2',true),'edit');

const profileLayoutSource=fs.readFileSync(path.join(__dirname,'..','profile-v2.js'),'utf8');
const toolsIndex=profileLayoutSource.indexOf('profile-v2-name-tools');
const nameLineIndex=profileLayoutSource.indexOf('profile-v2-name-line');
assert.ok(toolsIndex>=0 && nameLineIndex>=0 && toolsIndex<nameLineIndex,'edit/auto metadata is rendered above the profile name');
assert.match(identitySource,/自動設定中/);
