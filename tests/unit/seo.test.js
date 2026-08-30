'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');
const home=read('index.html');
const help=read('help.html');
const privacy=read('privacy.html');
const terms=read('terms.html');
const robots=read('robots.txt');
const sitemap=read('sitemap.xml');
const production=JSON.parse(read('firebase.json'));
const staging=JSON.parse(read('firebase.staging.json'));
const title='Self-Employed Bookkeeping &amp; Tax Made Simple | TaxMate UK';
const description='Simple bookkeeping and tax planning for UK sole traders and self-employed people. Track income and expenses and see your estimated tax as you go.';

function matches(text,re){return [...text.matchAll(re)];}

test('production homepage has the exact approved title, description and one canonical',()=>{
  assert.equal(matches(home,/<title>[^<]+<\/title>/gi).length,1);
  assert.match(home,new RegExp(`<title>${title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}<\\/title>`));
  assert.equal(matches(home,/<meta\s+name="description"/gi).length,1);
  assert.ok(home.includes(`<meta name="description" content="${description}">`));
  const canonicals=matches(home,/<link\s+rel="canonical"\s+href="([^"]+)"/gi);
  assert.equal(canonicals.length,1);
  assert.equal(canonicals[0][1],'https://www.taxmate.uk/');
  assert.doesNotMatch(home,/<meta\s+name="robots"\s+content="[^"]*noindex/i);
});

test('homepage exposes one exact H1 and approved crawlable explanatory copy',()=>{
  const headings=matches(home,/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  assert.equal(headings.length,1);
  assert.equal(headings[0][1].trim(),'Self-employed bookkeeping and tax, made simple.');
  assert.match(home,/Add your income\. Add your expenses\. See your estimated tax\./);
  assert.match(home,/TaxMate is a simple bookkeeping and tax-planning app for UK sole traders and self-employed people\./);
  assert.match(home,/does not submit your tax return or MTD updates to HMRC/i);
});

test('public links are real crawlable anchors and index strategy is explicit',()=>{
  for(const href of ['/help.html','/privacy.html','/terms.html'])assert.ok(home.includes(`href="${href}"`));
  assert.match(help,/<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(privacy,/<meta name="robots" content="noindex,follow">/);
  assert.match(terms,/<meta name="robots" content="noindex,follow">/);
  for(const page of [help,privacy,terms])assert.match(page,/<a href="\/">/);
});

test('robots and sitemap contain production canonical URLs only',()=>{
  assert.match(robots,/^User-agent:\s*\*/m);
  assert.match(robots,/^Allow:\s*\/$/m);
  assert.match(robots,/^Sitemap:\s*https:\/\/www\.taxmate\.uk\/sitemap\.xml$/m);
  assert.match(sitemap,/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  const urls=matches(sitemap,/<loc>([^<]+)<\/loc>/g).map(match=>match[1]);
  assert.deepEqual(urls,['https://www.taxmate.uk/','https://www.taxmate.uk/help.html']);
  assert.doesNotMatch(sitemap,/localhost|127\.0\.0\.1|web\.app|firebaseapp\.com/i);
});

test('SoftwareApplication JSON-LD is parseable and contains truthful claims only',()=>{
  const blocks=matches(home,/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
  assert.equal(blocks.length,1);
  const data=JSON.parse(blocks[0][1]);
  assert.equal(data['@type'],'SoftwareApplication');
  assert.equal(data.applicationCategory,'FinanceApplication');
  assert.equal(data.url,'https://www.taxmate.uk/');
  assert.equal(data.image,'https://www.taxmate.uk/icon-512.png');
  assert.equal(data.offers.price,'0');
  assert.equal(data.offers.priceCurrency,'GBP');
  assert.doesNotMatch(blocks[0][1],/\bLtd\b|\baggregateRating\b|\breview\b|\baward\b|HMRC.?approved|\bcertified\b/i);
});

test('Open Graph, language and canonical behavior are consistent',()=>{
  assert.match(home,/<html lang="en-GB">/);
  assert.ok(home.includes(`<meta property="og:title" content="${title}">`));
  assert.ok(home.includes(`<meta property="og:description" content="${description}">`));
  assert.match(home,/<meta property="og:url" content="https:\/\/www\.taxmate\.uk\/">/);
  assert.match(home,/<meta property="og:image" content="https:\/\/www\.taxmate\.uk\/taxmate-share-20260829\.png">/);
  assert.doesNotMatch([home,help,privacy,terms].join('\n'),/hreflang=/i);
  assert.equal(matches(home,/rel="canonical"/gi).length,1);
});

test('public canonicals match the final www destination',()=>{
  const expected=[
    [home,'https://www.taxmate.uk/'],
    [help,'https://www.taxmate.uk/help.html'],
    [privacy,'https://www.taxmate.uk/privacy.html'],
    [terms,'https://www.taxmate.uk/terms.html']
  ];
  for(const [page,url] of expected){
    const canonicals=matches(page,/<link\s+rel="canonical"\s+href="([^"]+)"/gi);
    assert.equal(canonicals.length,1);
    assert.equal(canonicals[0][1],url);
  }
});

test('approved TaxMate favicon set is explicit, square and deployable',()=>{
  assert.match(home,/<link rel="icon" href="\/favicon\.ico" sizes="any">/);
  assert.match(home,/<link rel="icon" type="image\/svg\+xml" href="\/assets\/brand\/derived\/taxmate-icon-light\.svg" media="\(prefers-color-scheme: light\)">/);
  assert.match(home,/<link rel="icon" type="image\/svg\+xml" href="\/assets\/brand\/derived\/taxmate-icon-dark\.svg" media="\(prefers-color-scheme: dark\)">/);
  assert.match(home,/<link rel="icon" type="image\/png" sizes="16x16" href="\/favicon-16x16\.png">/);
  assert.match(home,/<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32x32\.png">/);
  assert.match(home,/<link rel="icon" type="image\/png" sizes="48x48" href="\/favicon-48x48\.png">/);
  assert.match(home,/<link rel="icon" type="image\/png" sizes="192x192" href="\/icon-192\.png">/);
  const png=fs.readFileSync('favicon-48x48.png');
  assert.equal(png.toString('ascii',1,4),'PNG');
  assert.equal(png.readUInt32BE(16),48);
  assert.equal(png.readUInt32BE(20),48);
  const ico=fs.readFileSync('favicon.ico');
  assert.equal(ico.readUInt16LE(0),0);
  assert.equal(ico.readUInt16LE(2),1);
  const count=ico.readUInt16LE(4),sizes=[];
  for(let index=0;index<count;index++)sizes.push(ico[6+index*16]||256);
  for(const size of [16,32,48])assert.ok(sizes.includes(size));
  const buildScript=read('scripts/build-hosting.js');
  for(const file of ['favicon.ico','favicon-16x16.png','favicon-32x32.png','favicon-48x48.png','apple-touch-icon.png','taxmate-share-20260829.png'])assert.ok(buildScript.includes(`'${file}'`));
});

test('staging is header-level noindex while production is not',()=>{
  const stagingHeaders=staging.hosting.headers.flatMap(rule=>rule.headers||[]);
  const productionHeaders=production.hosting.headers.flatMap(rule=>rule.headers||[]);
  assert.equal(stagingHeaders.find(header=>header.key==='X-Robots-Tag').value,'noindex, nofollow, noarchive');
  assert.equal(productionHeaders.some(header=>header.key==='X-Robots-Tag'),false);
  assert.ok(production.hosting.ignore.includes('firebase.staging.json'));
});

test('404 page is non-indexable and provides useful navigation',()=>{
  const page=read('404.html');
  assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
  assert.match(page,/<h1>Page not found<\/h1>/);
  assert.match(page,/<a href="\/">Return to TaxMate<\/a>/);
});
