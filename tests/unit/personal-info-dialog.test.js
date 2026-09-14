'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('src/ui/direction-a.css','utf8');
const between=(source,start,end)=>{
  const from=source.indexOf(start);
  return source.slice(from,source.indexOf(end,from+start.length));
};

test('personal informational notice uses one accessible non-draggable footer action',()=>{
  const notice=between(html,'<div class="sb" id="sb-notice"','<div class="sb" id="sb-promo"');
  assert.match(notice,/aria-labelledby="notice-title"/);
  assert.match(notice,/aria-describedby="notice-message"/);
  assert.doesNotMatch(notice,/class="grab"|closeParentSheet/);
  const footer=between(notice,'<div class="notice-dialog-footer">','</div>');
  assert.equal((footer.match(/<button\b/g)||[]).length,1);
  assert.match(footer,/type="button"[^>]*data-notice-primary[^>]*closeSheet\('notice'\)/);
});

test('personal informational notice alone receives the approved centred presentation',()=>{
  assert.match(css,/#sb-notice\{[\s\S]*?align-items:center[\s\S]*?padding:16px[\s\S]*?background:rgba\(15,22,32,\.32\)/);
  assert.match(css,/#sb-notice>\.sheet\{[\s\S]*?width:min\(460px,100%\)[\s\S]*?max-height:min\(82dvh,620px\)[\s\S]*?border-radius:20px[\s\S]*?overflow:hidden/);
  assert.match(css,/#sb-notice \.notice-dialog-footer\{[\s\S]*?border-top:1px solid var\(--line\)[\s\S]*?background:var\(--card\)/);
  assert.match(css,/html\[data-direction-a="true"\] \.sb\{background:rgba\(15,22,32,\.5\);align-items:flex-end/);
  assert.match(css,/html\[data-direction-a="true"\] \.sb>\.sheet\{[\s\S]*?border-radius:24px 24px 0 0/);
});
