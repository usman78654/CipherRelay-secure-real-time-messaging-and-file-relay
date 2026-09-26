/**
 * Loads previously stored private/public keys from secure storage.
 */

export const loadUserKeys = async () => {
  // Backwards-compatible loader used by existing code.
  // It delegates to `loadKeysSecurely` and maps signing keys to the
  // legacy shape { publicKey, privateKey, username, ecdh }.
  try {
    const keys = await loadKeysSecurely();
    if (!keys) return { publicKey: null, privateKey: null };
    return {
      publicKey: keys.signing ? keys.signing.publicKey : null,
      privateKey: keys.signing ? keys.signing.privateKey : null,
      ecdh: keys.ecdh || null,
      username: keys.username || 'local-user'
    };
  } catch (err) {
    return { publicKey: null, privateKey: null };
  }
};

export const loadKeysSecurely = async (id) => {
  const { loadKeys } = await import('../../storage/indexedDB.js');
  const { AuthService } = await import('../../services/authService.js');
  const subtle = (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) ? window.crypto.subtle : (globalThis.crypto && globalThis.crypto.subtle) ? globalThis.crypto.subtle : null;
  if (!subtle) throw new Error('Web Crypto API not available');

  // If no id provided, get username from AuthService
  let username = id;
  if (!username) {
    try {
      username = AuthService.getUsername();
      
      if (!username) {
        username = 'local-user';
      }
    } catch (err) {
      console.warn('Could not get username from auth, using local-user:', err.message);
      username = 'local-user';
    }
  }

  console.log(`🔍 Loading keys for user: ${username}`);
  const entry = await loadKeys(username);
  if (!entry) {
    console.warn(`⚠️ No keys found for user: ${username}`);
    return null;
  }

  // Our save format stores the exported object under `publicKey`.
  const store = entry.publicKey || entry;
  const result = { username }; // Include username in result
  if (store.version === 2 && store.signing?.privateKey && store.ecdh?.privateKey) {
    return { username, signing: store.signing, ecdh: store.ecdh };
  }
  
  if (store.signingPublic && store.signingPrivate) {
    const pubBuf = new Uint8Array(store.signingPublic).buffer;
    result.signing = {
      publicKey: await subtle.importKey('spki', pubBuf, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['verify']),
      privateKey: await subtle.importKey('jwk', store.signingPrivate, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']),
    };
    console.log(`✅ Loaded ECDSA signing keys for ${username}`);
  } else {
    console.warn(`⚠️ No signing keys found in storage for ${username}`);
  }

  if (store.ecdhPublic && store.ecdhPrivate) {
    const pubBuf = new Uint8Array(store.ecdhPublic).buffer;
    result.ecdh = {
      publicKey: await subtle.importKey('raw', pubBuf, { name: 'ECDH', namedCurve: 'P-256' }, true, []),
      privateKey: await subtle.importKey('jwk', store.ecdhPrivate, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']),
    };
    console.log(`✅ Loaded ECDH exchange keys for ${username}`);
  } else {
    console.warn(`⚠️ No ECDH keys found in storage for ${username}`);
  }

  return result;
};
