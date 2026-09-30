import assert from 'node:assert/strict';
import {inspectSource,shouldCreateSourceVersion,validateSourceConfig} from '../scripts/drive_source_fetch.mjs';

const source={
  sourceKey:'tokyo:tokyo-wangan:speed-guideline',
  sourceUrl:'https://www.keishicho.metro.tokyo.lg.jp/current.pdf',
  allowedHosts:['www.keishicho.metro.tokyo.lg.jp'],
  termsStatus:'PENDING'
};

validateSourceConfig(source);
assert.throws(()=>validateSourceConfig({...source,sourceUrl:'http://www.keishicho.metro.tokyo.lg.jp/current.pdf'}),/source_https_required/);
assert.throws(()=>validateSourceConfig({...source,sourceUrl:'https://example.com/current.pdf'}),/source_host_not_allowed/);
await assert.rejects(inspectSource(source,{fetchImpl:async()=>{throw new Error('must_not_fetch')}}),/terms_not_allowed/);

const headers=new Map([['content-type','application/pdf'],['etag','"v1"'],['last-modified','Wed, 30 Sep 2026 00:00:00 GMT']]);
headers.get=headers.get.bind(headers);
const pdf=new Uint8Array(256);pdf.set([0x25,0x50,0x44,0x46],0);for(let i=4;i<pdf.length;i++)pdf[i]=i%251;
const fetched=await inspectSource(source,{
  allowPending:true,
  fetchImpl:async()=>({status:200,ok:true,headers,arrayBuffer:async()=>pdf.buffer})
});
assert.equal(fetched.status,'fetched');
assert.equal(fetched.bytes,256);
assert.match(fetched.contentHash,/^[0-9a-f]{64}$/);
assert.equal(shouldCreateSourceVersion(null,fetched),true);
assert.equal(shouldCreateSourceVersion({contentHash:fetched.contentHash},fetched),false);

const h304=new Map([['etag','"v1"']]);h304.get=h304.get.bind(h304);
const notModified=await inspectSource({...source,termsStatus:'ALLOWED'},{
  etag:'"v1"',
  fetchImpl:async()=>({status:304,ok:false,headers:h304})
});
assert.equal(notModified.status,'not_modified');
assert.equal(shouldCreateSourceVersion({contentHash:fetched.contentHash},notModified),false);

const htmlHeaders=new Map([['content-type','text/html']]);htmlHeaders.get=htmlHeaders.get.bind(htmlHeaders);
await assert.rejects(inspectSource({...source,termsStatus:'ALLOWED'},{
  fetchImpl:async()=>({status:200,ok:true,headers:htmlHeaders,arrayBuffer:async()=>new TextEncoder().encode('<html>'+'.'.repeat(200)+'</html>').buffer})
}),/source_not_pdf/);

console.log('PASS: DRIVE source fetch/version gate');
