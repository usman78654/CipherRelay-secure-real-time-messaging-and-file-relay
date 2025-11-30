# Key Generation & Secure Storage

## Overview

This system implements **ECC (Elliptic Curve Cryptography)** key generation and secure client-side storage, meeting the assignment requirement that **private keys NEVER leave the client device**.

## Implementation Details

### 1. Key Generation (generateKeys.js)

**Algorithm:** ECC with NIST P-256 curve

**Two Key Pairs Generated:**

1. **ECDSA Signing Keys (P-256)**
   - Used for digital signatures
   - Ensures message authenticity
   - Prevents man-in-the-middle attacks

2. **ECDH Key Exchange Keys (P-256)**
   - Used for Diffie-Hellman key agreement
   - Derives shared session keys
   - Enables forward secrecy

```javascript
const keys = await generateUserKeyPair();
// Returns: { signing: {publicKey, privateKey}, ecdh: {publicKey, privateKey} }
```

### 2. Secure Storage (IndexedDB)

**Location:** Browser's IndexedDB (client-side only)

**Storage Structure:**
```javascript
{
  id: "username",
  signingPublic: ArrayBuffer,     // SPKI format
  signingPrivate: JWK,             // JSON Web Key
  ecdhPublic: ArrayBuffer,         // Raw format
  ecdhPrivate: JWK                 // JSON Web Key
}
```

**Security Guarantees:**
- ✅ Private keys stored ONLY in IndexedDB
- ✅ Never transmitted over network
- ✅ Never sent to server
- ✅ Persist across browser sessions
- ✅ Isolated per origin (same-origin policy)

### 3. Key Lifecycle

#### Registration Flow:
1. User enters username/password
2. **Client generates ECC key pairs** (ECDSA + ECDH)
3. Keys stored in IndexedDB
4. Only username/password sent to server
5. Account created

#### Login Flow:
1. User logs in with username/password
2. Keys loaded from IndexedDB
3. If missing, user prompted to generate keys
4. Keys ready for encryption/signing

### 4. Key Usage

**Signing Keys (ECDSA):**
- Sign outgoing messages
- Verify incoming message signatures
- Authenticate key exchange protocol

**ECDH Keys:**
- Perform Diffie-Hellman key agreement
- Derive shared session keys
- Enable end-to-end encryption

## Assignment Compliance

### ✅ Requirements Met:

1. **Asymmetric Key Pair Generation**
   - ✓ ECC P-256 (meets "RSA-2048 OR ECC P-256" requirement)
   - ✓ Generated on registration
   - ✓ Using Web Crypto API (browser standard)

2. **Secure Key Storage**
   - ✓ Private keys stored in IndexedDB
   - ✓ Never stored on server
   - ✓ Never transmitted over network
   - ✓ Client-side only storage

3. **Key Persistence**
   - ✓ Keys survive browser refresh
   - ✓ Keys available across sessions
   - ✓ No re-generation needed

## API Reference

### generateUserKeyPair()
Generates ECDSA and ECDH key pairs using ECC P-256.

**Returns:**
```javascript
{
  signing: { publicKey: CryptoKey, privateKey: CryptoKey },
  ecdh: { publicKey: CryptoKey, privateKey: CryptoKey }
}
```

### storeKeysSecurely(keys, unused)
Stores keys in IndexedDB.

**Parameters:**
- `keys`: Object containing `{ username, signing, ecdh }`
- `unused`: Legacy parameter (ignored)

**Storage:** Browser IndexedDB under database "secureChatDB"

### loadKeysSecurely(username)
Loads keys from IndexedDB.

**Parameters:**
- `username`: User identifier

**Returns:**
```javascript
{
  signing: { publicKey: CryptoKey, privateKey: CryptoKey },
  ecdh: { publicKey: CryptoKey, privateKey: CryptoKey }
}
```

## Testing

### Browser Console Test:
```javascript
// Test key generation
import('./tests/test_key_generation.js').then(() => {
  testKeyGeneration();
});
```

### Manual Verification:
1. Open DevTools → Application → IndexedDB
2. Check "secureChatDB" → "keys" store
3. Verify keys are present for registered users
4. Confirm private keys are in JWK format

## Security Notes

### Why ECC over RSA?
- Smaller key size (256-bit ECC ≈ 3072-bit RSA)
- Faster operations
- Better mobile performance
- NIST-approved P-256 curve

### Why IndexedDB?
- Persistent storage
- Large storage capacity
- Asynchronous API
- Same-origin security
- Better than localStorage for binary data

### Private Key Protection:
- Keys never leave browser
- Keys never in memory longer than needed
- Keys isolated by browser origin
- No server-side copy exists
- No network transmission

## Future Enhancements (Optional)

1. **Key Backup:** Encrypted export/import
2. **Key Rotation:** Periodic key regeneration
3. **Multi-Device:** Sync via encrypted backup
4. **Hardware Security:** WebAuthn integration

## Conclusion

This implementation meets all assignment requirements for secure key generation and storage:
- ✅ Asymmetric keys (ECC P-256)
- ✅ Client-side generation
- ✅ Secure storage (IndexedDB)
- ✅ Private keys never leave client
- ✅ Justification provided (this document)
