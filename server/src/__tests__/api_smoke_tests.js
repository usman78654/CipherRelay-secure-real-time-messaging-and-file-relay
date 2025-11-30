import path from 'path';

const PORT = process.env.PORT || 5000;

async function waitForServer(timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) return true;
    } catch (e) {
      // not yet ready
    }
    await new Promise(r => setTimeout(r, 250));
  }
  return false;
}

async function run() {
  console.log('Running API smoke tests (ensure server is running separately)...');
  const ok = await waitForServer(8000);
  if (!ok) {
    console.error('Server not reachable at http://localhost:' + PORT);
    process.exit(2);
  }

  try {
    console.log('Server is reachable, running API checks...');

    // 1) Register
    const username = `testuser_${Date.now()}`;
    const password = 'TestPass123!';
    let res = await fetch(`http://localhost:${PORT}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    console.log('Register status:', res.status);
    if (res.status !== 201) throw new Error('Register failed');

    // 2) Login
    res = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const loginBody = await res.json();
    console.log('Login status:', res.status, loginBody.message || 'ok');
    if (!loginBody.token) throw new Error('Login did not return token');
    const token = loginBody.token;

    // 3) Send an encrypted message (mock ciphertext)
    const chatId = `chat_${username}_other`;
    const payload = {
      chatId,
      sender: username,
      receiver: 'other',
      ciphertext: 'deadbeef',
      iv: 'ivdata',
      authTag: 'tag',
      metadata: { timestamp: Math.floor(Date.now() / 1000), nonce: `n-${Date.now()}` }
    };
    res = await fetch(`http://localhost:${PORT}/api/chat/send`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    console.log('Send message status:', res.status);
    if (res.status !== 201) throw new Error('Send message failed');

    // 4) Fetch messages
    res = await fetch(`http://localhost:${PORT}/api/chat/${chatId}`, { headers: { Authorization: `Bearer ${token}` } });
    const msgs = await res.json();
    console.log('Get messages status:', res.status, 'count=', Array.isArray(msgs) ? msgs.length : 'n/a');

    // 5) Upload encrypted file
    const filePayload = {
      owner: username,
      receiver: 'other',
      fileName: 'secret.txt',
      encryptedChunks: ['c1'],
      metadata: { timestamp: Math.floor(Date.now() / 1000), chunkSize: 1024 }
    };
    res = await fetch(`http://localhost:${PORT}/api/files/upload`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(filePayload)
    });
    console.log('File upload status:', res.status);

    // 6) Report decrypt failure
    res = await fetch(`http://localhost:${PORT}/api/chat/report-decrypt-failure`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ messageId: 'fake', reason: 'tag-mismatch' })
    });
    console.log('Report decrypt status:', res.status);

    console.log('API smoke tests completed successfully.');
    process.exitCode = 0;
  } catch (err) {
    console.error('API smoke tests failed:', err.message);
    process.exitCode = 2;
  } finally {
    srv.kill();
  }
}

run();
