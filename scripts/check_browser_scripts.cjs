const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let checked = 0;
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = match[1];
    if (/type\s*=\s*["'](?:module|application\/(?:ld\+)?json)["']/i.test(attrs)) continue;
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src && /^(?:https?:)?\/\//.test(src)) continue;
    const filename = src ? src.split('?')[0] : `index.html:inline-${checked + 1}`;
    const code = src ? fs.readFileSync(path.join(root, filename), 'utf8') : match[2];
    new vm.Script(code, { filename });
    checked++;
}
console.log(`PASS: ${checked} browser scripts parse successfully.`);
