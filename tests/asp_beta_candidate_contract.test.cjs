'use strict';
const assert=require('node:assert/strict');
const rows=[
['ofr_000080','https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3779876&pid=892710079','<a href="//ck.jp.ap.valuecommerce.com/servlet/referral?sid=3779876&pid=892710079" rel="nofollow">'],
['ofr_000083','https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3779876&pid=892710083','<a href="//ck.jp.ap.valuecommerce.com/servlet/referral?sid=3779876&pid=892710083" rel="nofollow">'],
['ofr_000085','https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3779876&pid=892710082','<a href="//ck.jp.ap.valuecommerce.com/servlet/referral?sid=3779876&pid=892710082" rel="nofollow">']
];
for(const [id,url,tag] of rows){const u=new URL(url),href=tag.match(/href="([^"]+)"/)[1];assert.equal('https:'+href,u.href, id+' official tag href must exactly match source URL');assert.equal(u.searchParams.get('sid'),'3779876');assert.match(u.searchParams.get('pid'),/^8927100(79|82|83)$/)}
console.log('PASS ASP candidate URL/tag exact-match (non-network)');