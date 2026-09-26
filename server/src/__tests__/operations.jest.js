import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../app.js';
import { safeAuditDetails } from '../services/logger.js';

test('liveness is independent of MongoDB, readiness fails without it', async () => {
  expect((await request(app).get('/health/live')).status).toBe(200);
  expect((await request(app).get('/health/ready')).status).toBe(503);
});
test('rejects an untrusted browser origin', async () => {
  expect((await request(app).get('/health/live').set('Origin', 'https://attacker.invalid')).status).toBe(403);
});
test('does not expose metrics on the public listener', async () => {
  expect((await request(app).get('/metrics')).status).toBe(404);
});
test('malformed JSON never returns or logs the submitted secret', async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  try {
    const response = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"password":"secret-canary",');
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain('secret-canary');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-canary');
    expect(response.headers['x-request-id']).toBeTruthy();
  } finally { spy.mockRestore(); }
});
test('audit fields discard nested payloads and credentials', () => {
  expect(safeAuditDetails({ owner: 'alice', body: { password: 'secret' }, token: 'jwt', error: 'password secret', packet: { ciphertext: 'private' } })).toEqual({ owner: 'alice' });
});
