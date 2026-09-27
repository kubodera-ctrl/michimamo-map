const assert = require('node:assert/strict');

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.style = {}; this.listeners = {}; this.attributes = {}; }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  setAttribute(name, value) { this.attributes[name] = value; }
}

let rpcCalls = [];
global.document = {
  querySelectorAll: () => [],
  createElement: (tag) => new Element(tag)
};
global.crypto = { randomUUID: () => 'anon-session-test' };
global.sessionStorage = { getItem: () => null, setItem: () => {} };
global.window = {
  db: { rpc: async (name, args) => {
    rpcCalls.push({ name, args });
    if (name === 'get_asp_offers_for_placement') return { data: [{
      offer_id: 'A8.net:program-id', offer_name: '<img src=x onerror=alert(1)>',
      tracking_url: 'https://px.a8.net/svt/ejp?a8mat=exact%2Btracking',
      creative_type: 'image', creative_url: 'https://cdn.example/banner.png', impression_tracking_url: null
    }], error: null };
    return { error: new Error('internal click tracking unavailable') };
  } }
};
require('../asp-runtime-public.js');

(async () => {
  const container = new Element('div');
  container.dataset.aspService = 'machimamo';
  container.dataset.aspPlacement = 'mypage_asp_offers';
  await window.MachimamoAspPublic.mount(container);
  const card = container.children[0];
  const titleLink = card.children[0];
  assert.equal(titleLink.href, 'https://px.a8.net/svt/ejp?a8mat=exact%2Btracking', 'tracking URL is unchanged');
  assert.equal(titleLink.rel, 'sponsored nofollow noopener noreferrer');
  assert.equal(titleLink.children[1].textContent, '<img src=x onerror=alert(1)>', 'offer title is text, not HTML');
  const clickEvent = { defaultPrevented: false };
  titleLink.listeners.click(clickEvent);
  await Promise.resolve();
  const click = rpcCalls.find((call) => call.name === 'record_asp_offer_click');
  assert.ok(click);
  assert.match(click.args.p_anonymous_session_id, /^[0-9a-f-]{36}$/i);
  assert.equal(clickEvent.defaultPrevented, false, 'outbound navigation is not cancelled on logging failure');
  const imageAnchor = card.children.find((child) => child.tagName === 'a' && child !== titleLink);
  assert.equal(imageAnchor.href, titleLink.href);
  assert.equal(imageAnchor.children[0].referrerPolicy, 'no-referrer');
  console.log('PASS: public ASP slot escapes data, preserves official tracking link, and does not block navigation on click-log failure');
})().catch((error) => { console.error(error); process.exitCode = 1; });
