const { generateKeyPairSync, createSign } = require('crypto');
const { verifySignature, verifyTimestamp } = require('../signatureVerify');

function b64(buf) { return buf.toString('base64'); }

// Generate RSA key pair for test
const { publicKey: rsaPub, privateKey: rsaPriv } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Test data
const message = 'This is a test message';
const ts = Math.floor(Date.now() / 1000);
const payload = JSON.stringify({ message, ts });

// Sign with RSA
const signer = createSign('sha256');
signer.update(payload);
signer.end();
const signature = signer.sign(rsaPriv);
const signatureB64 = b64(signature);

// Verify using our utility
const rsaVerify = verifySignature({ publicKeyPem: rsaPub, data: payload, signatureB64, hashAlg: 'sha256' });
console.log('RSA verify result:', rsaVerify);

// Timestamp verify
const tsRes = verifyTimestamp(ts);
console.log('Timestamp verify result:', tsRes);

// Negative test: wrong payload
const wrong = verifySignature({ publicKeyPem: rsaPub, data: payload + 'x', signatureB64, hashAlg: 'sha256' });
console.log('Negative (modified payload) verify result:', wrong);

if (!rsaVerify.valid) process.exitCode = 2;
if (!tsRes.ok) process.exitCode = 3;
if (wrong.valid) process.exitCode = 4;

// Also test ECDSA (P-256)
const { publicKey: ecPub, privateKey: ecPriv } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const signer2 = createSign('sha256');
signer2.update(payload);
signer2.end();
const sig2 = signer2.sign(ecPriv);
const sig2b64 = b64(sig2);
const ecVerify = verifySignature({ publicKeyPem: ecPub, data: payload, signatureB64: sig2b64, hashAlg: 'sha256' });
console.log('ECDSA verify result:', ecVerify);
if (!ecVerify.valid) process.exitCode = 5;

console.log('All signatureVerify smoke tests completed.');
