const assert = require('node:assert/strict');
const geometry = require('../map-viewport.js');
const bounds = {left:10,right:380,top:200,bottom:700};
for (const scale of [0.5,1,2]) {
  for (const rect of [
    {left:90,right:350,top:120,bottom:620}, // tall popup formerly cut above controls
    {left:180,right:440,top:220,bottom:720}, // right and bottom edges
    {left:-30,right:230,top:230,bottom:620}, // left edge
    {left:70,right:330,top:250,bottom:650} // already visible
  ]) {
    const [x,y] = geometry.popupPan(rect,bounds,scale,scale);
    assert(rect.left-x*scale >= bounds.left);
    assert(rect.right-x*scale <= bounds.right);
    assert(rect.top-y*scale >= bounds.top);
    assert(rect.bottom-y*scale <= bounds.bottom);
    if (rect.top===250) assert.deepEqual([x,y],[0,0]);
  }
}
// A compensated layout taller than the actual visible viewport must target the visible center.
const rect={left:0,right:780,top:100,bottom:1500};
const viewport={left:0,right:780,top:0,bottom:1300};
const [x,y]=geometry.centerOffset(rect,viewport,2,2);
assert.equal((rect.left+rect.right)/2+x*2,390);
assert.equal((rect.top+rect.bottom)/2+y*2,700);
assert.deepEqual(geometry.centerOffset(bounds,{left:0,right:400,top:0,bottom:800}),[0,0]);
console.log('PASS: popup containment at 0.5x/1x/2x scales and visible map centering');
