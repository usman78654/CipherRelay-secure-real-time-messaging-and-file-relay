const axios = require('axios');
const { io } = require('socket.io-client');

async function run() {
  const BASE = 'http://localhost:5000';
  const username = `cli_test_${Date.now()}`;
  const password = 'TestPass123!';

  console.log('Registering user...');
  await axios.post(`${BASE}/api/auth/register`, { username, password }).catch(e => { console.warn('register warn', e.response && e.response.data); });

  console.log('Logging in...');
  const loginRes = await axios.post(`${BASE}/api/auth/login`, { username, password });
  const token = loginRes.data.token;
  console.log('Received token:', !!token);

  const socket = io(BASE, { auth: { token } });

  socket.on('connect', () => console.log('Socket connected', socket.id));
  socket.on('connect_error', (err) => console.error('connect_error', err.message));
  socket.on('receive-encrypted-message', (msg) => console.log('received msg', msg));
  socket.on('message-stored', (ack) => console.log('message-stored ack', ack));

  // Wait for connection
  await new Promise(r => socket.once('connect', r));

  // Send a fake encrypted message
  socket.emit('send-encrypted-message', {
    chatId: `chat_${username}_other`,
    sender: username,
    receiver: 'other',
    ciphertext: 'deadbeef',
    iv: 'iv',
    authTag: 'tag',
    metadata: { timestamp: Math.floor(Date.now()/1000), nonce: `n-${Date.now()}` }
  });

  // wait a bit
  await new Promise(r => setTimeout(r, 1500));
  socket.disconnect();
}

run().catch(e=>{console.error(e); process.exit(1)});
