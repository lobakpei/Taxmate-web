'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Invite=require('../../src/core/partner-invite');

test('Partner invite uses a fixed HTTPS production origin and fragment-only code',()=>{
  assert.equal(Invite.inviteUrl('connect8'),'https://www.taxmate.uk/#partner-invite=CONNECT8');
  assert.equal(Invite.codeFromHash('#partner-invite=CONNECT8'),'CONNECT8');
  assert.equal(Invite.codeFromHash('#partner-invite=bad'),null);
  assert.throws(()=>Invite.inviteUrl('bad'),/partner-invite-code-invalid/);
  assert.doesNotMatch(Invite.inviteUrl('CONNECT8'),/localhost|127\.0\.0\.1|web\.app|\?/i);
});

test('production shell ships the invite runtime and contains no obsolete Settings detour copy',()=>{
  const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),app=fs.readFileSync('src/app/app.js','utf8');
  assert.match(html,/<script src="src\/core\/partner-invite\.js"><\/script>/);
  assert.match(sw,/'\/src\/core\/partner-invite\.js'/);
  assert.equal((app.match(/'sy\.inviteMsg':/g)||[]).length,6);
  assert.equal((app.match(/'sy\.inviteAfterSave':/g)||[]).length,6);
  assert.doesNotMatch(app,/'ob\.codeEntry'|Go straight to dashboard[\s\S]{0,180}Settings|Share this code with your partner — it activates when you save\./i);
});

test('structured native-share payload carries the canonical message without invitation metadata',()=>{
  const message='I’ve invited you to connect to ‘{n}’ on TaxMate. 🤝\n\nOpen the link and TaxMate will guide you through sign-in and Pro access.\n\n{u}\n\nCode: {c}';
  const value=Invite.payload({businessName:'Founder Review Partnership',code:'CONNECT8',title:'Invite partner',message});
  assert.deepEqual(value,{title:'Invite partner',text:'I’ve invited you to connect to ‘Founder Review Partnership’ on TaxMate. 🤝\n\nOpen the link and TaxMate will guide you through sign-in and Pro access.\n\nhttps://www.taxmate.uk/#partner-invite=CONNECT8\n\nCode: CONNECT8',url:'https://www.taxmate.uk/#partner-invite=CONNECT8'});
  assert.equal(Object.isFrozen(value),true);
  assert.deepEqual(Object.keys(value),['title','text','url']);
  assert.equal(value.url.split('#')[0],Invite.PRODUCTION_ORIGIN);
});
