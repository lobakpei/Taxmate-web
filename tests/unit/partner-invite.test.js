'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Invite=require('../../src/core/partner-invite');

test('Partner invite uses the ordinary HTTPS production homepage with no code or identity in the URL',()=>{
  assert.equal(Invite.inviteUrl(),'https://www.taxmate.uk/');
  assert.doesNotMatch(Invite.inviteUrl(),/localhost|127\.0\.0\.1|web\.app|[?#]|CONNECT8/i);
  assert.equal('FRAGMENT_KEY' in Invite,false);
  assert.equal('codeFromHash' in Invite,false);
});

test('production shell ships the invite runtime and contains no obsolete Settings detour copy',()=>{
  const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),app=fs.readFileSync('src/app/app.js','utf8');
  assert.match(html,/<script src="src\/core\/partner-invite\.js"><\/script>/);
  assert.match(sw,/'\/src\/core\/partner-invite\.js'/);
  assert.equal((app.match(/'sy\.inviteMsg':/g)||[]).length,6);
  assert.equal((app.match(/'sy\.inviteAfterSave':/g)||[]).length,6);
  assert.doesNotMatch(app,/'ob\.codeEntry'|Go straight to dashboard[\s\S]{0,180}Settings|Share this code with your partner — it activates when you save\./i);
  assert.doesNotMatch(app,/PARTNER_INVITE_DRAFT_KEY|PARTNER_INVITE_BOOT_CODE|startPartnerInviteOnboarding|capturePartnerInviteLaunch|#partner-invite=/);
});

test('structured native-share payload carries the canonical message without invitation metadata',()=>{
  const message='I’ve invited you to connect to ‘{n}’ on TaxMate. 🤝\n\nOpen TaxMate, choose “Enter a Partner Sync code” and enter this code:\n\n{c}\n\n{u}';
  const value=Invite.payload({businessName:'Founder Review Partnership',code:'CONNECT8',title:'Invite partner',message});
  assert.deepEqual(value,{title:'Invite partner',text:'I’ve invited you to connect to ‘Founder Review Partnership’ on TaxMate. 🤝\n\nOpen TaxMate, choose “Enter a Partner Sync code” and enter this code:\n\nCONNECT8\n\nhttps://www.taxmate.uk/',url:'https://www.taxmate.uk/'});
  assert.equal(Object.isFrozen(value),true);
  assert.deepEqual(Object.keys(value),['title','text','url']);
  assert.equal(value.url,Invite.PRODUCTION_ORIGIN);
  assert.doesNotMatch(value.url,/CONNECT8|Founder|[?#]/);
  assert.throws(()=>Invite.payload({businessName:'Founder Review Partnership',code:'BAD',title:'Invite partner',message}),/partner-invite-code-invalid/);
});
