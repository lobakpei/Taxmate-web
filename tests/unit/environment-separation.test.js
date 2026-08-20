const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const productionHosting = JSON.parse(read('firebase.json')).hosting;
const stagingHosting = JSON.parse(read('firebase.staging.json')).hosting;

const textExtensions = new Set(['.css', '.html', '.js', '.json', '.txt', '.xml']);

function build(environment) {
  execFileSync(process.execPath, [path.join(root, 'scripts', 'build-hosting.js'), environment], {cwd: root, stdio: 'pipe'});
  return path.join(root, '.hosting-build', environment);
}

function artifactTextFiles(buildRoot) {
  const files = [];
  function visit(directory, relativeDirectory = '') {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const relative = path.posix.join(relativeDirectory.replaceAll('\\', '/'), entry.name);
      if (entry.isDirectory()) {
        visit(path.join(directory, entry.name), relative);
        continue;
      }
      if (textExtensions.has(path.extname(entry.name))) files.push(relative);
    }
  }
  visit(buildRoot);
  return files;
}

test('production deploy artifact contains no staging, TEST Stripe, localhost or temporary diagnostics references', () => {
  const buildRoot = build('production');
  const files = artifactTextFiles(buildRoot);
  const text = files.map(file => `${file}\n${fs.readFileSync(path.join(buildRoot, file), 'utf8')}`).join('\n');
  for (const forbidden of [
    /taxmate-staging/i,
    /308981292791/,
    /1:308981292791:web:550b795411f366864c7df2/,
    /6LdFcY4tAAAAAP6hI8PCdla4GLY_Dko3UZ63j_Rv/,
    /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i,
    /(?:sk_test_|rk_test_|whsec_|price_[A-Za-z0-9]+)/,
    /__auth_probe|firebase=staging/i
  ]) assert.doesNotMatch(text, forbidden);
  assert.ok(files.includes('firebase-environment.js'));
  assert.equal(files.some(file => file.startsWith('staging/') || file.startsWith('docs/') || file.startsWith('tests/')), false);
});

test('production Firebase runtime and CSP point only to taxmate-uk-2', () => {
  const environment = read('firebase-environment.js');
  const csp = productionHosting.headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
  assert.match(environment, /projectId: 'taxmate-uk-2'/);
  assert.match(environment, /authDomain: 'taxmate-uk-2\.firebaseapp\.com'/);
  assert.match(environment, /storageBucket: 'taxmate-uk-2\.firebasestorage\.app'/);
  assert.match(csp, /europe-west2-taxmate-uk-2\.cloudfunctions\.net/);
  assert.doesNotMatch(csp, /staging/i);
  assert.equal(productionHosting.public, '.hosting-build/production');
  assert.deepEqual(productionHosting.predeploy, ['node scripts/build-hosting.js production']);
});

test('staging deploy deterministically substitutes its isolated environment without production Firebase credentials', () => {
  const buildRoot = build('staging');
  const files = artifactTextFiles(buildRoot);
  const text = files.map(file => `${file}\n${fs.readFileSync(path.join(buildRoot, file), 'utf8')}`).join('\n');
  const csp = stagingHosting.headers[0].headers.find(header => header.key === 'Content-Security-Policy').value;
  assert.equal(stagingHosting.public, '.hosting-build/staging');
  assert.deepEqual(stagingHosting.predeploy, ['node scripts/build-hosting.js staging']);
  assert.ok(files.includes('firebase-environment.js'));
  assert.doesNotMatch(text, /taxmate-uk-2|995936701479|1:995936701479:web:ed61c51a65e61aa1d21202|6LcW6D0tAAAAAJHpolEjjPAkrVMdaizD-EGO7wsH/);
  assert.match(csp, /europe-west2-taxmate-staging\.cloudfunctions\.net/);
  assert.doesNotMatch(csp, /europe-west2-taxmate-uk-2\.cloudfunctions\.net/);
  assert.deepEqual(
    fs.readFileSync(path.join(root, '.hosting-build', 'production', 'src', 'app', 'app.js')),
    fs.readFileSync(path.join(root, '.hosting-build', 'staging', 'src', 'app', 'app.js'))
  );
});

test('application consumes injected environment without changing the Google Auth flow', () => {
  const html = read('index.html');
  const app = read('src/app/app.js');
  assert.ok(html.indexOf('firebase-environment.js') < html.indexOf('src/app/app.js'));
  assert.match(app, /window\.TAXMATE_FIREBASE_ENVIRONMENT/);
  assert.match(app, /firebase\.auth\(\)\.signInWithPopup\(provider\)/);
  assert.match(app, /new firebase\.auth\.GoogleAuthProvider\(\)/);
  assert.match(app, /firebase\.auth\(\)\.setPersistence\(firebase\.auth\.Auth\.Persistence\.LOCAL\)/);
  assert.doesNotMatch(app, /taxmate-staging|FIREBASE_STAGING|firebase=staging/i);
});

test('production Functions billing config contains only canonical LIVE prices',()=>{
  const env=fs.readFileSync(path.join(root,'functions/.env.taxmate-uk-2'),'utf8');
  for(const id of ['price_1U6Wi4Q2jZLVx6pgFbTCmjV3','price_1U6ZfnQ2jZLVx6pgNCCfs5Cg','price_1U6ZgaQ2jZLVx6pgi7dHPBeO','price_1U6ZgtQ2jZLVx6pgOeS7cRYl'])assert.match(env,new RegExp(id));
  assert.doesNotMatch(env,/price_1U6(?:HQ|ZE)[A-Za-z0-9]+|taxmate-staging|sk_test_|rk_test_|whsec_/);
  assert.match(env,/STRIPE_PRO_LEGACY_PRICE_IDS=price_1U6WiHQ2jZLVx6pgJWYXlwHv/);
});
