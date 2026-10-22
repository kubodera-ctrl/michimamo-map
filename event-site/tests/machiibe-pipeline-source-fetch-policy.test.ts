import assert from 'node:assert/strict';
import test from 'node:test';
import {readBoundedBody,sourceFetchUrlBlocker} from '../../cloudflare/machiibe-pipeline/src/source-fetch-policy';

test('source URL accepts HTTPS public host and rejects unsafe URL forms',()=>{
  assert.equal(sourceFetchUrlBlocker('https://data.bodik.jp/dataset/events.csv'),null);
  assert.equal(sourceFetchUrlBlocker('http://data.example.jp/events.csv'),'source_url_https_required');
  assert.equal(sourceFetchUrlBlocker('https://user:pass@example.jp/feed'),'source_url_credentials_forbidden');
  assert.equal(sourceFetchUrlBlocker('https://localhost/feed'),'source_url_local_host_forbidden');
  assert.equal(sourceFetchUrlBlocker('https://localhost./feed'),'source_url_local_host_forbidden');
  assert.equal(sourceFetchUrlBlocker('https://events.example.jp:8443/feed'),'source_url_nonstandard_port');
  assert.equal(sourceFetchUrlBlocker('https://192.168.1.20/feed'),'source_url_ip_literal_forbidden');
  assert.equal(sourceFetchUrlBlocker('https://127.0.0.1/feed'),'source_url_ip_literal_forbidden');
  assert.equal(sourceFetchUrlBlocker('https://[::1]/feed'),'source_url_ip_literal_forbidden');
});

test('response body is capped while streaming, even without Content-Length',async()=>{
  const response=new Response(new ReadableStream<Uint8Array>({
    start(controller){controller.enqueue(new Uint8Array(3));controller.enqueue(new Uint8Array(3));}
  }));
  await assert.rejects(readBoundedBody(response,5),/source_too_large/);
});

test('bounded response body preserves exact bytes',async()=>{
  const response=new Response(new Uint8Array([1,2,3]));
  assert.deepEqual([...new Uint8Array(await readBoundedBody(response,3))],[1,2,3]);
});
