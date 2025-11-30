test('verifySignature and timestamp basic checks', async () => {
  const { generateKeyPairSync, createSign } = await import('crypto');
  const mod = await import('../utils/signatureVerify.js');
  const { verifySignature, verifyTimestamp } = mod;
  function b64(buf) { return buf.toString('base64'); }
  const { publicKey: rsaPub, privateKey: rsaPriv } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const message = 'This is a test message';
  const ts = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ message, ts });

  const signer = createSign('sha256');
  signer.update(payload);
  signer.end();
  const signature = signer.sign(rsaPriv);
  const signatureB64 = b64(signature);

  const rsaVerify = verifySignature({ publicKeyPem: rsaPub, data: payload, signatureB64, hashAlg: 'sha256' });
  expect(rsaVerify.valid).toBe(true);

  const tsRes = verifyTimestamp(ts);
  expect(tsRes.ok).toBe(true);
});
