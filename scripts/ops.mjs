#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const [command, value, confirmation] = process.argv.slice(2);
function run(args, options = {}) {
  const state = fs.existsSync('.release-state.json') ? JSON.parse(fs.readFileSync('.release-state.json')) : {};
  const env = { ...process.env, ...(state.current && !process.env.APP_TAG ? { APP_TAG: state.current } : {}) };
  const result = spawnSync('docker', ['compose', ...args], { cwd: root, stdio: 'inherit', env, ...options });
  if (result.error || result.status !== 0) throw new Error('Docker Compose operation failed: ' + args.slice(0, 3).join(' '));
  return result;
}
function init() {
  fs.mkdirSync('.secrets', { recursive: true, mode: 0o700 });
  for (const name of ['jwt_secret', 'mongo_password', 'mongo_root_password', 'grafana_password']) {
    const dest = path.join('.secrets', name);
    if (!fs.existsSync(dest)) fs.writeFileSync(dest, randomBytes(32).toString('hex') + '\n', { mode: 0o600, flag: 'wx' });
    // Compose file-backed secrets retain host permissions. Containers have different
    // UIDs; directory stays 0700 on the host, files must be readable inside mounts.
    if (process.platform !== 'win32') fs.chmodSync(dest, 0o644);
  }
  if (!fs.existsSync('.env')) fs.copyFileSync('.env.example', '.env', fs.constants.COPYFILE_EXCL);
  console.log('Configuration ready. Credentials are in .secrets/ (never commit them).');
}
function backup() {
  fs.mkdirSync('backups', { recursive: true, mode: 0o700 });
  const dest = path.resolve('backups', new Date().toISOString().replace(/[:.]/g, '-') + '.archive.gz');
  // Quiesce writes because this single-node MongoDB has no oplog snapshot.
  run(['stop', 'api']);
  const fd = fs.openSync(dest + '.partial', 'wx', 0o600);
  let complete = false;
  try {
    run(['exec', '-T', 'mongo', 'sh', '-ec', 'exec mongodump --host 127.0.0.1 --username chat --password "$(cat /run/secrets/mongo_password)" --authenticationDatabase securechat --db securechat --archive --gzip'], { stdio: ['ignore', fd, 'inherit'] });
    complete = true;
  } finally {
    fs.closeSync(fd);
    if (complete) { fs.renameSync(dest + '.partial', dest); console.log('Backup written: ' + dest); }
    run(['up', '-d', '--no-build', '--wait', 'api']);
  }
}
function restore(checkOnly) {
  if (!value) throw new Error('Supply an archive path');
  const source = path.resolve(value);
  if (!fs.statSync(source).isFile()) throw new Error('Archive must be a file');
  if (!checkOnly && confirmation !== '--replace') throw new Error('Restore replaces app data. Run backup first, then restore ARCHIVE --replace.');
  const db = checkOnly ? 'restore_check_' + Date.now() : 'securechat';
  if (!checkOnly) run(['stop', 'api']);
  const fd = fs.openSync(source, 'r');
  let complete = false;
  try {
    const restoreCommand = 'exec mongorestore --host 127.0.0.1 --username root --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin --archive --gzip --drop --nsInclude "securechat.*"' + (checkOnly ? ' --nsFrom "securechat.*" --nsTo "' + db + '.*"' : '');
    run(['exec', '-T', 'mongo', 'sh', '-ec', restoreCommand], { stdio: [fd, 'inherit', 'inherit'] });
    if (checkOnly) {
      const script = 'db=db.getSiblingDB("' + db + '"); const names=db.getCollectionNames(); if(!names.length) throw Error("No collections restored"); printjson(names.map(name=>({collection:name,documents:db.getCollection(name).countDocuments({})}))); db.dropDatabase();';
      run(['exec', '-T', 'mongo', 'sh', '-ec', 'exec mongosh --quiet --username root --password "$(cat /run/secrets/mongo_root_password)" --authenticationDatabase admin --eval "$1"', '--', script]);
      console.log('Restore check passed in an isolated temporary database.');
    } else console.log('Restore completed.');
    complete = true;
  } finally {
    fs.closeSync(fd);
    if (!checkOnly && complete) run(['up', '-d', '--no-build', '--wait', 'api']);
    if (!checkOnly && !complete) console.error('Restore failed; API remains stopped. Recover from a valid archive before starting it.');
  }
}
function release(tag, rollback = false) {
  if (!tag || !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(tag) || tag === 'latest') throw new Error('Supply an immutable release tag (commit SHA recommended), not latest');
  const stateFile = '.release-state.json';
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : {};
  const env = { ...process.env, APP_TAG: tag };
  // Validate availability before replacing running containers. Never rebuild on deploy.
  run(['config', '--quiet'], { env });
  try {
    run(['up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'api', 'web'], { env });
  } catch (error) {
    if (state.current) {
      console.error('Deployment failed; recovering previous healthy release ' + state.current);
      run(['up', '-d', '--no-build', '--wait', '--wait-timeout', '120', 'api', 'web'], { env: { ...process.env, APP_TAG: state.current } });
    }
    throw error;
  }
  fs.writeFileSync(stateFile, JSON.stringify({ current: tag, previous: state.current || null }, null, 2) + '\n');
  console.log((rollback ? 'Rollback' : 'Deployment') + ' healthy: ' + tag);
}
try {
  switch (command) {
    case 'init': init(); break;
    case 'up': run(['up', '-d', '--build', '--wait', '--wait-timeout', '180']); break;
    case 'monitor': run(['--profile', 'monitoring', 'up', '-d', '--wait', '--wait-timeout', '180']); break;
    case 'status': run(['ps']); break;
    case 'down': run(['--profile', 'monitoring', 'down']); break;
    case 'backup': backup(); break;
    case 'restore-check': restore(true); break;
    case 'restore': restore(false); break;
    case 'deploy': release(value); break;
    case 'rollback': {
      const state = JSON.parse(fs.readFileSync('.release-state.json'));
      release(state.previous, true); break;
    }
    default: console.log('Usage: node scripts/ops.mjs init|up|monitor|status|down|backup|restore-check ARCHIVE|restore ARCHIVE --replace|deploy TAG|rollback');
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
