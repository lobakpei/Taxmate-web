'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');

const read=file=>fs.readFileSync(file);
const text=file=>read(file).toString('utf8');
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const pngDimensions=file=>{const value=read(file);assert.equal(value.toString('ascii',1,4),'PNG');return{width:value.readUInt32BE(16),height:value.readUInt32BE(20),bitDepth:value[24],colourType:value[25]};};
const sourceIdentity={
  'dark_brandlogo.svg':'55A5431D3196F94B9F92C326F87A1798089910FBAFD44E06DDEB3DACF47217A1',
  'light_brandlogo.svg':'7B8E9469058A4CBFD345387B55A0282DBFF43426EEF8AB76766FE4608C2B113E',
  'dark_icon.svg':'12DB5CC1BCF8B1BB7AD1B10C52124246960A0FDCCA2D52A747FBC58533D088B8',
  'light_icon.svg':'6CA5D181A5BB18C257642700C2AA2AEB5875A87B0D3BFD0A06A4E11E49905638'
};
const home=text('index.html'),app=text('src/app/app.js'),sw=text('sw.js'),build=text('scripts/build-hosting.js'),manifest=JSON.parse(text('manifest.json')),assetManifest=JSON.parse(text('assets/brand/derived/BRAND_ASSET_MANIFEST.json'));

test('Founder SVG masters are immutable exact vector sources with no embedded raster',()=>{
  for(const [file,expected] of Object.entries(sourceIdentity)){
    const value=read(path.join('assets','brand','source',file)),source=value.toString('utf8');
    assert.equal(sha256(value),expected,file);
    assert.match(source,/^<svg\b/);
    assert.match(source,/<path\b/);
    assert.doesNotMatch(source,/<image\b|data:image\/(?:png|jpe?g|webp)/i);
  }
});

test('transparent Brand Logo variants retain approved paths, colours and black face features',()=>{
  const light=text('assets/brand/derived/taxmate-brand-logo-light.svg'),dark=text('assets/brand/derived/taxmate-brand-logo-dark.svg');
  assert.equal((light.match(/<path\b/g)||[]).length,2);
  assert.match(light,/fill="#ffbe0a"/);
  assert.match(light,/fill="#0b121a"/);
  assert.doesNotMatch(light,/d="M 0 631 L 0 1262/);
  assert.equal((dark.match(/<path\b/g)||[]).length,3);
  assert.match(dark,/fill="#ffbd04"/);
  assert.match(dark,/fill="#fcfcfc"/);
  assert.match(dark,/fill="#0b121a" fill-rule="evenodd"/);
  assert.doesNotMatch(dark,/d="M 0 667 L 0 1334/);
  assert.deepEqual(assetManifest.darkFaceSubpaths,[10,11,13]);
  assert.equal(assetManifest.transparentLogoComparison.light.status,'PASS');
  assert.equal(assetManifest.transparentLogoComparison.dark.status,'PASS');
});

test('old pound-mark logo is removed only from active header and onboarding brand UI',()=>{
  assert.doesNotMatch(home,/<div class="logo">£<\/div>/);
  assert.doesNotMatch(app,/<div class="lo-mark">£<\/div>/);
  assert.doesNotMatch(app,/class="lo-name"/);
  assert.match(home,/<span class="cur">£<\/span>/);
  assert.match(app,/£9\.99/);
  assert.match(app,/£11\.99/);
  assert.match(app,/£99\.99/);
});

test('header and onboarding select the approved light and dark Brand Logos without duplicate identity',()=>{
  for(const file of ['taxmate-brand-logo-light.svg','taxmate-brand-logo-dark.svg'])assert.match(home,new RegExp(`/assets/brand/derived/${file}`));
  assert.match(home,/class="brand-logo-light"[^>]+alt="TaxMate"/);
  assert.match(home,/class="brand-logo-dark"[^>]+alt="TaxMate"/);
  assert.match(app,/onboarding-brand-lockup/);
  assert.match(app,/brand-logo-light[^>]+taxmate-brand-logo-light\.svg[^>]+alt="TaxMate"/);
  assert.match(app,/brand-logo-dark[^>]+taxmate-brand-logo-dark\.svg[^>]+alt="TaxMate"/);
  assert.match(home,/:root\[data-theme="dark"\] \.brand-lockup \.brand-logo-light\{display:none\}/);
  assert.match(home,/:root:not\(\[data-theme\]\) \.brand-lockup \.brand-logo-dark\{display:block\}/);
  assert.doesNotMatch(home,/<div class="name">Tax/);
});

test('favicon, PWA and maskable rasters have exact dimensions, full backgrounds and safe content bounds',()=>{
  for(const [file,size] of Object.entries({'favicon-16x16.png':16,'favicon-32x32.png':32,'favicon-48x48.png':48,'apple-touch-icon.png':180,'icon-192.png':192,'icon-512.png':512,'icon-512-maskable.png':512})){
    const dimensions=pngDimensions(file);assert.deepEqual({width:dimensions.width,height:dimensions.height},{width:size,height:size},file);assert.equal(dimensions.bitDepth,8);assert.equal(dimensions.colourType,2,`${file} is fully opaque RGB`);
  }
  const safe=assetManifest.maskableValidation;assert.equal(safe.transparentPixels,0);assert.equal(safe.opaquePixels,512*512);assert.ok(safe.foregroundBoundsRatio.left>=0.18&&safe.foregroundBoundsRatio.top>=0.18&&safe.foregroundBoundsRatio.right<=0.82&&safe.foregroundBoundsRatio.bottom<=0.82);
  const ico=read('favicon.ico');assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);const sizes=[];for(let index=0;index<3;index++)sizes.push(ico[6+index*16]||256);assert.deepEqual(sizes,[16,32,48]);
});

test('all website identity metadata points to the new assets while product SEO copy stays unchanged',()=>{
  assert.match(home,/<meta property="og:image" content="https:\/\/www\.taxmate\.uk\/taxmate-share-20260829\.png">/);
  assert.match(home,/<meta property="og:image:secure_url" content="https:\/\/www\.taxmate\.uk\/taxmate-share-20260829\.png">/);
  assert.match(home,/<meta name="twitter:image" content="https:\/\/www\.taxmate\.uk\/taxmate-share-20260829\.png">/);
  assert.match(home,/<meta property="og:image:width" content="1200">/);
  assert.match(home,/<meta property="og:image:height" content="630">/);
  assert.match(home,/"image":"https:\/\/www\.taxmate\.uk\/icon-512\.png"/);
  assert.match(home,/taxmate-icon-light\.svg" media="\(prefers-color-scheme: light\)"/);
  assert.match(home,/taxmate-icon-dark\.svg" media="\(prefers-color-scheme: dark\)"/);
  assert.match(home,/rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png"/);
  assert.match(home,/<meta name="description" content="Simple bookkeeping and tax planning for UK sole traders and self-employed people\. Track income and expenses and see your estimated tax as you go\.">/);
});

test('social preview is a real 1200 by 630 composition containing the approved icon and Brand Logo',()=>{
  assert.deepEqual(pngDimensions('taxmate-share-20260829.png'),{width:1200,height:630,bitDepth:8,colourType:2});
  const source=text('assets/brand/derived/taxmate-share-20260829.svg');
  assert.ok(source.includes(Buffer.from(text('assets/brand/source/light_icon.svg')).toString('base64')),'social composition embeds the immutable light icon');
  const logo=text('assets/brand/derived/taxmate-brand-logo-light.svg').replace(/\r\n/g,'\n');
  assert.ok(source.includes(Buffer.from(logo).toString('base64')),'social composition embeds the EOL-normalised transparent Brand Logo');
  assert.match(source,/Simple bookkeeping and tax planning/);
});

test('App Icon stays out of Home, Tax and Ltd heroes and is limited to identity metadata/assets',()=>{
  const body=home.split('</head>')[1];assert.doesNotMatch(body,/taxmate-icon-(?:light|dark)\.svg|icon-(?:192|512)/);
  for(const file of ['src/ui/ltd/workbench-renderer.js','src/ui/ltd/workbench.css'])assert.doesNotMatch(text(file),/taxmate-icon|icon-(?:192|512)|apple-touch-icon/);
  assert.doesNotMatch(app,/taxmate-icon|icon-(?:192|512)|apple-touch-icon/);
});

test('manifest, service worker and Hosting build carry every production brand asset',()=>{
  assert.deepEqual(manifest.icons.map(icon=>[icon.src,icon.sizes,icon.purpose]),[['icon-192.png','192x192','any'],['icon-512.png','512x512','any'],['icon-512-maskable.png','512x512','maskable']]);
  for(const file of ['favicon-16x16.png','favicon-32x32.png','favicon-48x48.png','favicon.ico','apple-touch-icon.png','icon-192.png','icon-512.png','icon-512-maskable.png','taxmate-share-20260829.png']){assert.ok(sw.includes(`/${file}`),`${file} precached`);assert.ok(build.includes(`'${file}'`),`${file} copied`);}
  for(const file of ['taxmate-brand-logo-light.svg','taxmate-brand-logo-dark.svg','taxmate-icon-light.svg','taxmate-icon-dark.svg'])assert.ok(sw.includes(`/assets/brand/derived/${file}`),`${file} precached`);
  assert.match(build,/assets', 'brand', 'derived/);
});
