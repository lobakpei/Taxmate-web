'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const environment = process.argv[2];
if (!['production', 'staging'].includes(environment)) {
  throw new Error('Usage: node scripts/build-hosting.js <production|staging>');
}

const buildRoot = path.resolve(root, '.hosting-build');
const destination = path.resolve(buildRoot, environment);
if (!destination.startsWith(buildRoot + path.sep)) throw new Error('Unsafe Hosting build destination');

const rootFiles = [
  '404.html',
  'help.html',
  'icon-192.png',
  'icon-512-maskable.png',
  'icon-512.png',
  'index.html',
  'manifest.json',
  'og-image.png',
  'privacy.html',
  'robots.txt',
  'sitemap.xml',
  'sw.js',
  'terms.html'
];

fs.rmSync(destination, {recursive: true, force: true});
fs.mkdirSync(destination, {recursive: true});

for (const file of rootFiles) fs.copyFileSync(path.join(root, file), path.join(destination, file));
fs.cpSync(path.join(root, 'src'), path.join(destination, 'src'), {recursive: true});
fs.mkdirSync(path.join(destination, 'vendor'), {recursive: true});
fs.copyFileSync(path.join(root, 'vendor', 'jszip-3.10.1.min.js'), path.join(destination, 'vendor', 'jszip-3.10.1.min.js'));

const environmentSource = environment === 'production'
  ? path.join(root, 'firebase-environment.js')
  : path.join(root, 'staging', 'firebase-environment.js');
fs.copyFileSync(environmentSource, path.join(destination, 'firebase-environment.js'));

process.stdout.write(`Built ${environment} Hosting artifact at ${path.relative(root, destination)}\n`);
