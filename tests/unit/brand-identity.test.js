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

test('favicon fills the small canvas with a legible face while unchanged PWA assets retain safe bounds',()=>{
  for(const [file,size] of Object.entries({'favicon-16x16.png':16,'favicon-32x32.png':32,'favicon-48x48.png':48,'apple-touch-icon.png':180,'icon-192.png':192,'icon-512.png':512,'icon-512-maskable.png':512})){
    const dimensions=pngDimensions(file);assert.deepEqual({width:dimensions.width,height:dimensions.height},{width:size,height:size},file);assert.equal(dimensions.bitDepth,8);assert.equal(dimensions.colourType,2,`${file} is fully opaque RGB`);
  }
  for(const [file,value] of Object.entries(assetManifest.iconRasterValidation)){const width=value.foregroundBoundsRatio.right-value.foregroundBoundsRatio.left,small=value.width<=48;assert.ok(width>=(small?0.78:0.75)&&width<=(small?0.88:0.83),`${file} optical foreground width ${width}`);if(!small)assert.ok(value.foregroundBounds.left>0&&value.foregroundBounds.top>0&&value.foregroundBounds.right<value.width-1&&value.foregroundBounds.bottom<value.height-1,`${file} full-size foreground remains uncropped`);assert.ok(value.blackPixels>=(value.width<=16?2:3),`${file} retains legible black eye and mouth pixels`);}
  const safe=assetManifest.maskableValidation;assert.equal(safe.transparentPixels,0);assert.equal(safe.opaquePixels,512*512);assert.ok(safe.foregroundBoundsRatio.left>=0.18&&safe.foregroundBoundsRatio.top>=0.18&&safe.foregroundBoundsRatio.right<=0.82&&safe.foregroundBoundsRatio.bottom<=0.82);assert.ok(safe.foregroundBoundsRatio.right-safe.foregroundBoundsRatio.left>0.5);
  const ico=read('favicon.ico');assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);const sizes=[];for(let index=0;index<3;index++)sizes.push(ico[6+index*16]||256);assert.deepEqual(sizes,[16,32,48]);
});

test('all website identity metadata points to the new assets while product SEO copy stays unchanged',()=>{
  assert.match(home,/<meta property="og:image" content="https:\/\/www\.taxmate\.uk\/taxmate-share-20260831-v2\.png">/);
  assert.match(home,/<meta property="og:image:secure_url" content="https:\/\/www\.taxmate\.uk\/taxmate-share-20260831-v2\.png">/);
  assert.match(home,/<meta name="twitter:image" content="https:\/\/www\.taxmate\.uk\/taxmate-share-20260831-v2\.png">/);
  assert.match(home,/<meta property="og:image:width" content="1200">/);
  assert.match(home,/<meta property="og:image:height" content="630">/);
  assert.match(home,/"image":"https:\/\/www\.taxmate\.uk\/icon-512\.png"/);
  assert.doesNotMatch(home,/rel="icon" type="image\/svg\+xml"/);
  assert.match(home,/rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png\?v=20260902-5"/);
  assert.match(home,/<meta name="description" content="Simple bookkeeping and tax planning for UK sole traders and self-employed people\. Track income and expenses and see your estimated tax as you go\.">/);
});

test('social preview is the exact supplied Founder-approved 1200 by 630 PNG',()=>{
  const file='taxmate-share-20260831-v2.png';assert.deepEqual(pngDimensions(file),{width:1200,height:630,bitDepth:8,colourType:6});
  assert.equal(sha256(read(file)),'132A70B72F79EF6002B6856A3B6FE565D966E68113A1584BAE869D3BACDD6624');
  assert.equal(assetManifest.approvedSocial.file,file);assert.equal(assetManifest.approvedSocial.sha256,'132A70B72F79EF6002B6856A3B6FE565D966E68113A1584BAE869D3BACDD6624');
  assert.equal(assetManifest.approvedSocialValidation.transparentPixels,0);assert.equal(assetManifest.approvedSocialValidation.opaquePixels,1200*630);
  assert.equal(fs.existsSync('assets/brand/derived/taxmate-share-20260829.svg'),false);
});

test('Home Add income uses a scoped white ink override without changing Add expense or the global action token',()=>{
  assert.match(home,/\.homecta \.home-add-income\{color:#fff\}/);assert.match(app,/class="btn home-add-income" data-tm-click="openEntry\('income'\)"/);assert.match(app,/class="btn danger-soft" data-tm-click="openEntry\('expense'\)"/);assert.match(home,/--brand-action-ink:#10231B/);
});

test('App Icon stays out of Home, Tax and Ltd heroes and is limited to identity metadata/assets',()=>{
  const body=home.split('</head>')[1];assert.doesNotMatch(body,/taxmate-icon-(?:light|dark)\.svg|icon-(?:192|512)/);
  for(const file of ['src/ui/ltd/workbench-renderer.js','src/ui/ltd/workbench.css'])assert.doesNotMatch(text(file),/taxmate-icon|icon-(?:192|512)|apple-touch-icon/);
  assert.doesNotMatch(app,/taxmate-icon|icon-(?:192|512)|apple-touch-icon/);
});

test('manifest, service worker and Hosting build carry every production brand asset',()=>{
  assert.deepEqual(manifest.icons.map(icon=>[icon.src,icon.sizes,icon.purpose]),[['icon-192.png?v=20260902-5','192x192','any'],['icon-512.png?v=20260902-5','512x512','any'],['icon-512-maskable.png?v=20260902-5','512x512','maskable']]);
  for(const file of ['favicon-16x16.png','favicon-32x32.png','favicon-48x48.png','favicon.ico','apple-touch-icon.png','icon-192.png','icon-512.png','icon-512-maskable.png']){assert.ok(sw.includes(`/${file}?v=20260902-5`),`${file} versioned and precached`);assert.ok(build.includes(`'${file}'`),`${file} copied`);}
  assert.ok(sw.includes('/taxmate-share-20260831-v2.png'));assert.ok(build.includes("'taxmate-share-20260831-v2.png'"));assert.doesNotMatch(home+sw+build,/taxmate-share-20260829/);
  for(const file of ['taxmate-brand-logo-light.svg','taxmate-brand-logo-dark.svg','taxmate-icon-light.svg','taxmate-icon-dark.svg'])assert.ok(sw.includes(`/assets/brand/derived/${file}`),`${file} precached`);
  assert.match(build,/assets', 'brand', 'derived/);
});
