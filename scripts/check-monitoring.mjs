import assert from 'node:assert/strict';
import fs from 'node:fs';
async function json(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  assert.equal(res.status, 200, url);
  return res.json();
}
let api;
// A fresh Prometheus instance may not have completed its first scrape yet.
for (let attempt = 0; attempt < 30; attempt++) {
  const targets = await json('http://localhost:9091/api/v1/targets');
  api = targets.data.activeTargets.find(target => target.labels.job === 'chat-api');
  if (api?.health === 'up') break;
  await new Promise(resolve => setTimeout(resolve, 2000));
}
assert.ok(api, 'API target configured');
assert.equal(api.health, 'up', api.lastError);
const health = await json('http://localhost:3001/api/health');
assert.equal(health.database, 'ok');
const password = fs.readFileSync(new URL('../.secrets/grafana_password', import.meta.url), 'utf8').trim();
const headers = { Authorization: 'Basic ' + Buffer.from('admin:' + password).toString('base64') };
const dashboard = await json('http://localhost:3001/api/dashboards/uid/chat-operations', headers);
assert.equal(dashboard.dashboard.panels.length, 6);
console.log('PASS: Prometheus scrapes the API; Grafana database and six-panel dashboard are available.');
