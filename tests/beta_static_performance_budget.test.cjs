const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const inlineScripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .reduce((sum, match) => sum + match[1].length, 0);
const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*"([^"]+)"[^>]*>/gi)]
  .map(match => match[1])
  .filter(src => /^https?:/.test(src));

assert(html.length <= 750000, `index.html exceeded beta size budget: ${html.length}`);
assert(inlineScripts <= 190000, `inline JS exceeded beta budget: ${inlineScripts}`);
assert(externalScripts.length <= 3, `unexpected external script growth: ${externalScripts.length}`);

console.log(`beta static performance budget: PASS (html=${html.length}, inlineJS=${inlineScripts}, externalScripts=${externalScripts.length})`);
