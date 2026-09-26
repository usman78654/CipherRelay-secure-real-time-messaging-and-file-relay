import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('..', import.meta.url));
function validate(overrides) {
  return spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./config/env.js')"], {
    cwd,
    env: { ...process.env, NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(64), JWT_SECRET_FILE: '', MONGO_PASSWORD_FILE: '', MONGO_PASSWORD: '', MONGO_URI: 'mongodb://localhost/test', ALLOWED_ORIGINS: 'https://chat.example.org', ...overrides },
    encoding: 'utf8'
  });
}
test('production startup refuses absent or placeholder secrets', () => {
  expect(validate({ JWT_SECRET: '' }).status).not.toBe(0);
  expect(validate({ JWT_SECRET: 'changeme-secret-key' }).status).not.toBe(0);
});
test('production requires exact origins and explicit proxy topology', () => {
  expect(validate({ ALLOWED_ORIGINS: '*' }).status).not.toBe(0);
  expect(validate({ TRUST_PROXY: 'true' }).status).not.toBe(0);
  expect(validate({ TRUST_PROXY: '1' }).status).toBe(0);
});
