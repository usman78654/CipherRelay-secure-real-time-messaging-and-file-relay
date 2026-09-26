/** Store non-exportable private CryptoKeys using IndexedDB structured cloning. */
export const storeKeysSecurely = async (keys) => {
  const { saveKeys } = await import('../../storage/indexedDB.js');
  const id = keys.username || keys.id || 'local-user';
  if (!keys.signing?.privateKey || !keys.ecdh?.privateKey) throw new Error('Complete identity keys are required');
  await saveKeys(id, { id, username: id, version: 2, signing: keys.signing, ecdh: keys.ecdh }, null);
};
