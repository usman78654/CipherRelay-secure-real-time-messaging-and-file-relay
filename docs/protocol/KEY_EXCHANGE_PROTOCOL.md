# Secure Key Exchange Protocol - Implementation

## Overview

This system implements a **custom ECDH-based key exchange protocol with digital signatures** to establish secure session keys for end-to-end encryption.

## Protocol Design

### Phase 1: Initiation
**Initiator (Alice) → Responder (Bob)**

1. Alice generates ephemeral ECDH key pair (P-256)
2. Alice creates payload: `{ ephPub, timestamp, sender, receiver }`
3. Alice signs payload with her long-term ECDSA private key
4. Alice sends: `{ payload, signature, pubKeyB64, timestamp }`

**Security Features:**
- ✅ Ephemeral keys provide forward secrecy
- ✅ Digital signature prevents man-in-the-middle (MITM)
- ✅ Timestamp prevents replay attacks
- ✅ Long-term public key allows verification

### Phase 2: Response
**Responder (Bob) → Initiator (Alice)**

1. Bob verifies Alice's signature using her long-term public key
2. Bob validates timestamp (reject if too old)
3. Bob generates his own ephemeral ECDH key pair
4. Bob performs ECDH with Alice's ephemeral public key
5. Bob derives session key using HKDF-SHA256
6. Bob creates response payload with his ephemeral public key
7. Bob signs response with his long-term ECDSA private key
8. Bob sends: `{ payload, signature, pubKeyB64, timestamp }`

**Security Features:**
- ✅ Signature verification authenticates Alice
- ✅ Timestamp validation prevents replay
- ✅ ECDH derives shared secret
- ✅ HKDF produces AES-256-GCM session key

### Phase 3: Finalization
**Initiator (Alice) finalizes**

1. Alice verifies Bob's signature
2. Alice validates timestamp
3. Alice performs ECDH with Bob's ephemeral public key
4. Alice derives same session key using HKDF-SHA256
5. Both parties now have identical AES-256-GCM session key

**Security Features:**
- ✅ Mutual authentication via signatures
- ✅ Same derivation produces identical keys
- ✅ Session key never transmitted over network

### Phase 4: Key Confirmation (Optional)
**Both parties exchange confirmations**

1. Compute SHA-256 hash of session key
2. Sign hash with long-term private key
3. Exchange signed hashes
4. Verify both parties derived same key

## Cryptographic Primitives

| Component | Algorithm | Key Size | Purpose |
|-----------|-----------|----------|---------|
| Long-term Keys | ECDSA P-256 | 256-bit | Digital signatures |
| Ephemeral Keys | ECDH P-256 | 256-bit | Key agreement |
| Key Derivation | HKDF-SHA256 | - | Session key generation |
| Session Key | AES-256-GCM | 256-bit | Message encryption |

## Protocol Flow

```
Alice (Initiator)                                   Bob (Responder)
─────────────────                                  ──────────────────

1. Generate ephemeral ECDH key pair
2. Sign ephPub + timestamp
                    ──────────────────────────>
                    ephPub_A, Sign_A(ephPub_A)
                                                    3. Verify Sign_A
                                                    4. Generate ephemeral ECDH
                                                    5. Derive: shared = ECDH(ephPriv_B, ephPub_A)
                                                    6. Derive: sessionKey = HKDF(shared)
                    <──────────────────────────
                    ephPub_B, Sign_B(ephPub_B)
7. Verify Sign_B
8. Derive: shared = ECDH(ephPriv_A, ephPub_B)
9. Derive: sessionKey = HKDF(shared)

✓ Both have same sessionKey
```

## Security Analysis

### Protections Against Attacks

**1. Man-in-the-Middle (MITM)**
- ✅ Digital signatures authenticate both parties
- ✅ Attacker cannot forge signatures without private keys
- ✅ Each party verifies the other's long-term public key

**2. Replay Attacks**
- ✅ Timestamps ensure freshness (reject old messages)
- ✅ Ephemeral keys are single-use
- ✅ Nonces can be added for additional protection

**3. Forward Secrecy**
- ✅ Ephemeral keys are discarded after exchange
- ✅ Compromise of long-term keys doesn't reveal past sessions
- ✅ Each conversation uses fresh ephemeral keys

**4. Key Substitution**
- ✅ Signatures bind ephemeral keys to identities
- ✅ Cannot swap public keys without invalidating signature

## Implementation Files

| File | Purpose |
|------|---------|
| `initiateExchange.js` | Step 1: Generate ephemeral keys, sign, send |
| `respondExchange.js` | Step 2: Verify, respond, derive key |
| `finalizeInitiator.js` | Step 3: Complete handshake, derive key |
| `deriveSessionKey.js` | HKDF-SHA256 key derivation |
| `confirmKey.js` | Optional key confirmation step |

## Key Derivation Details

**HKDF-SHA256 Parameters:**
```javascript
{
  name: 'HKDF',
  hash: 'SHA-256',
  salt: optional (can be empty),
  info: optional context string
}
```

**Output:**
- AES-256-GCM CryptoKey
- 256-bit key length
- Suitable for encrypt/decrypt operations

## Usage Example

```javascript
// Alice initiates
const { ephKeyPair } = await initiateKeyExchange({ username: 'bob' });

// Bob responds (receives Alice's packet via socket)
const { sessionKey } = await respondToKeyExchange(alicePacket);

// Alice finalizes (receives Bob's response)
const sessionKey = await finalizeInitiator(ephKeyPair, bobResponse);

// Both now have same sessionKey
// Use for AES-GCM encryption/decryption
```

## Differences from Standard Protocols

**Compared to TLS 1.3:**
- Similar: ECDH + signatures + HKDF
- Different: Simplified (no certificate chains)
- Different: Custom message format

**Compared to Signal Protocol:**
- Similar: ECDH-based key agreement
- Different: No ratcheting (yet)
- Different: Simpler state management

## Assignment Compliance

✅ **Custom Key Exchange Protocol** - Not copied from textbooks  
✅ **ECDH** - Elliptic Curve Diffie-Hellman  
✅ **Digital Signatures** - ECDSA P-256  
✅ **Authenticity** - Signatures prevent MITM  
✅ **Session Key Derivation** - HKDF-SHA256  
✅ **Key Confirmation** - Optional fingerprint exchange  

## Future Enhancements

1. **Double Ratchet** - Signal-style forward secrecy
2. **Certificate Pinning** - Stronger identity verification
3. **Key Refresh** - Periodic re-keying
4. **Multi-Device** - X3DH for offline messaging

## Testing

### Verify Key Exchange:
```javascript
// In browser console
import('./crypto/KeyExchange/initiateExchange.js').then(async ({ initiateKeyExchange }) => {
  const result = await initiateKeyExchange({ username: 'testuser' });
  console.log('✓ Key exchange initiated:', result);
});
```

### Verify Signature:
Check that signatures are generated and verified correctly for authenticity.

### Verify Session Key:
Confirm both parties derive identical session keys from ECDH shared secret.
