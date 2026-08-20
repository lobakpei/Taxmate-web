const fs = require('node:fs/promises');
const path = require('node:path');
const auth = require('firebase-tools/lib/auth');

const projectId = 'taxmate-uk-2';
const projectNumber = '995936701479';
const outputDir = path.resolve(__dirname, '..', 'evidence', 'w0', 'firebase');

async function accessToken() {
  const account = auth.getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required');
  const refreshed = await auth.getAccessToken(account.tokens.refresh_token, []);
  return refreshed.access_token;
}
async function requestJson(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function safeError(error) {
  return {
    message: error.message,
    status: error.status || null,
    apiMessage: error.body?.error?.message || null
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const token = await accessToken();
  const report = {
    inspectedAt: new Date().toISOString(),
    projectId,
    projectNumber,
    rules: [],
    firestoreDatabase: null,
    storageBucket: null,
    appCheckServices: null
  };

  const releases = await requestJson(
    `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases?pageSize=100`,
    token
  );
  for (const release of releases.releases || []) {
    if (!/(cloud\.firestore|firebase\.storage)/.test(release.name || '')) continue;
    const ruleset = await requestJson(
      `https://firebaserules.googleapis.com/v1/${release.rulesetName}`,
      token
    );
    const kind = release.name.includes('cloud.firestore') ? 'firestore' : 'storage';
    const files = ruleset.source?.files || [];
    for (const [index, file] of files.entries()) {
      const suffix = files.length === 1 ? '' : `-${index + 1}`;
      await fs.writeFile(path.join(outputDir, `deployed-${kind}${suffix}.rules`), file.content || '', 'utf8');
    }
    report.rules.push({
      kind,
      releaseName: release.name,
      rulesetName: release.rulesetName,
      releaseCreateTime: release.createTime,
      rulesetCreateTime: ruleset.createTime,
      files: files.map(file => ({ name: file.name || null, bytes: Buffer.byteLength(file.content || '', 'utf8') }))
    });
  }

  try {
    report.firestoreDatabase = await requestJson(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`, token
    );
  } catch (error) { report.firestoreDatabase = { error: safeError(error) }; }

  try {
    report.storageBucket = await requestJson(
      'https://storage.googleapis.com/storage/v1/b/taxmate-uk-2.firebasestorage.app', token
    );
  } catch (error) { report.storageBucket = { error: safeError(error) }; }

  try {
    report.appCheckServices = await requestJson(
      `https://firebaseappcheck.googleapis.com/v1/projects/${projectNumber}/services`, token
    );
  } catch (error) { report.appCheckServices = { error: safeError(error) }; }

  await fs.writeFile(path.join(outputDir, 'metadata.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`Exported ${report.rules.length} deployed rules releases and Firebase metadata.\n`);
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
