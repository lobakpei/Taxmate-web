'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const environment = process.argv[2];
if (!['production', 'staging'].includes(environment)) {
  throw new Error('Usage: node scripts/build-hosting.js <production|staging> [isolated-output-name]');
}

const buildRoot = path.resolve(root, '.hosting-build');
const outputName = process.argv[3] || environment;
if (!/^[a-z0-9][a-z0-9-]*$/.test(outputName)) throw new Error('Unsafe Hosting output name');
const destination = path.resolve(buildRoot, outputName);
if (!destination.startsWith(buildRoot + path.sep)) throw new Error('Unsafe Hosting build destination');

const rootFiles = [
  '404.html',
  'apple-touch-icon.png',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'favicon.ico',
  'icon-192.png',
  'icon-512-maskable.png',
  'icon-512.png',
  'index.html',
  'manifest.json',
  'og-image.png',
  'taxmate-share-20260829.png',
  'robots.txt',
  'sitemap.xml',
  'sw.js',
];

fs.rmSync(destination, {recursive: true, force: true});
fs.mkdirSync(destination, {recursive: true});

for (const file of rootFiles) fs.copyFileSync(path.join(root, file), path.join(destination, file));
const content = require(path.join(root, 'src', 'core', 'product-content.js'));
for (const kind of ['help', 'privacy', 'terms']) fs.writeFileSync(path.join(destination, `${kind}.html`), content.publicPage(kind));
fs.cpSync(path.join(root, 'src'), path.join(destination, 'src'), {recursive: true});
fs.rmSync(path.join(destination, 'src', 'core', 'legal.js'), {force: true});
fs.cpSync(path.join(root, 'assets', 'brand', 'derived'), path.join(destination, 'assets', 'brand', 'derived'), {recursive: true});
fs.mkdirSync(path.join(destination, 'vendor'), {recursive: true});
fs.copyFileSync(path.join(root, 'vendor', 'jszip-3.10.1.min.js'), path.join(destination, 'vendor', 'jszip-3.10.1.min.js'));

const environmentSource = environment === 'production'
  ? path.join(root, 'firebase-environment.js')
  : path.join(root, 'staging', 'firebase-environment.js');
fs.copyFileSync(environmentSource, path.join(destination, 'firebase-environment.js'));

process.stdout.write(`Built ${environment} Hosting artifact at ${path.relative(root, destination)}\n`);
