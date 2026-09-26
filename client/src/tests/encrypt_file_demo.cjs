// Demo: encrypt and decrypt a generated buffer using encryptFile/decryptFile
(async () => {
  const assert = require('node:assert/strict');
  global.window = { crypto: require('node:crypto').webcrypto };
  const path = require('path');
  const { pathToFileURL } = require('url');
  const root = path.resolve(__dirname, '..');
  const imp = (p) => import(pathToFileURL(path.join(root, p)).href);

  const encMod = await imp('crypto/encryption/encryptFile.js');
  const decMod = await imp('crypto/encryption/decryptFile.js');

  const subtle = require('crypto').webcrypto.subtle;
  // Generate a random AES-GCM key for demo
  const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

  // Create sample data ~200KB
  const size = 200 * 1024;
  const arr = new Uint8Array(size);
  for (let i = 0; i < size; i++) arr[i] = i % 256;

  const { encryptFile } = encMod;
  const { decryptFile } = decMod;

  console.log('Encrypting...');
  const res = await encryptFile(arr.buffer, key);
  console.log('Encrypted chunks:', res.encryptedChunks.length);

  console.log('Decrypting...');
  const out = await decryptFile({ encryptedChunks: res.encryptedChunks, metadata: res.metadata }, key);
  const outBytes = out instanceof Uint8Array ? out : (await out.arrayBuffer ? new Uint8Array(await out.arrayBuffer()) : out);

  // Compare
  const same = outBytes.length === arr.length && outBytes.every((v, i) => v === arr[i]);
  console.log('Decrypt matches original:', same);
  assert.equal(same, true);
  const tampered = structuredClone(res);
  const bytes = Buffer.from(tampered.encryptedChunks[0].ciphertext, 'base64');
  bytes[0] ^= 1;
  tampered.encryptedChunks[0].ciphertext = bytes.toString('base64');
  await assert.rejects(() => decryptFile(tampered, key));
  console.log('Tampered ciphertext rejected: true');
  process.exit(same ? 0 : 2);
})();
