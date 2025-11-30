# Secure Chat Client

**Frontend for End-to-End Encrypted Chat & File Sharing System**

## Overview

React-based web application providing true end-to-end encryption where all cryptographic operations occur client-side using the Web Crypto API.

### Key Features

- ✅ **Client-Side Encryption** - All crypto operations in browser
- ✅ **AES-256-GCM** - Authenticated encryption for messages & files
- ✅ **ECDH Key Exchange** - P-256 curve with ECDSA signatures
- ✅ **IndexedDB Storage** - Private keys never leave device
- ✅ **Real-time Messaging** - Socket.IO for instant delivery
- ✅ **Chunk-Based File Encryption** - 64KB chunks for large files
- ✅ **Zero-Knowledge** - Server never sees plaintext or keys

---

## Quick Start

### Installation

```powershell
cd client
npm install
```

### Configuration

Edit `src/config.js`:

```javascript
export default {
  API_URL: 'http://localhost:5000',      // Server API endpoint
  SOCKET_URL: 'http://localhost:5000',    // WebSocket endpoint
  MAX_FILE_SIZE: 10 * 1024 * 1024,        // 10MB max file size
  CHUNK_SIZE: 64 * 1024                   // 64KB chunk size
};
```

### Running

```powershell
npm start
```

Application opens at `http://localhost:3000`

---

## User Guide

### 1. Registration

1. Click "Register" on home page
2. Enter username and password
3. **Keys are automatically generated** on your device
4. Private keys stored in browser IndexedDB
5. Keys NEVER sent to server

**What happens:**
- ECDSA P-256 signing keypair generated
- ECDH P-256 key exchange keypair generated (deprecated - now uses ephemeral)
- Keys stored in IndexedDB under "secureChatDB"
- Only username/password sent to server

---

### 2. Login

1. Enter username and password
2. Server validates credentials (JWT returned)
3. Keys loaded from IndexedDB
4. If keys missing, prompted to regenerate

**Check your keys:**
- F12 → Application → IndexedDB → secureChatDB
- Should see your signing keys

---

### 3. Starting a Chat

1. Go to Dashboard
2. Click on a contact
3. **Automatic key exchange** initiates
4. ECDH protocol establishes shared session key
5. Chat ready for secure messaging

**Key exchange process:**
- Ephemeral ECDH keypairs generated
- Public keys signed with ECDSA
- Signatures verified (prevents MITM)
- Session key derived via HKDF
- Ready to encrypt/decrypt messages

---

### 4. Sending Messages

1. Type message in input field
2. Press Enter or click Send
3. **Message encrypted** with AES-256-GCM
4. Only ciphertext sent to server
5. Receiver **decrypts** on their device
6. **Real-time delivery** via WebSocket

**Encryption details:**
- Random 96-bit IV generated
- AES-256-GCM encryption
- 128-bit authentication tag
- Ciphertext + IV + authTag transmitted

---

### 5. Sending Files

1. Click attachment icon (📎)
2. Select file (max 10MB)
3. **File encrypted in chunks** (64KB each)
4. Each chunk gets unique IV
5. Encrypted chunks uploaded to server
6. Receiver downloads and decrypts

**File encryption process:**
- File split into 64KB chunks
- Each chunk encrypted with AES-256-GCM
- Unique IV per chunk
- Metadata (filename, size, type) included
- Server stores only encrypted chunks

---

### 6. Receiving Files

1. Click download button (⬇️) on file message
2. **Encrypted chunks downloaded** from server
3. Each chunk **decrypted** on your device
4. Chunks reassembled into original file
5. Browser download triggered

**File decryption process:**
- Encrypted chunks retrieved
- Each chunk decrypted with AES-256-GCM
- IV and authTag verified
- Chunks concatenated
- Blob created and downloaded

---

## Project Structure

```
client/src/
├── components/              # React components
│   ├── Auth/                # Login/Register forms
│   │   ├── LoginForm.jsx
│   │   └── RegisterForm.jsx
│   ├── Chat/                # Chat interface
│   │   ├── ChatWindow.jsx
│   │   ├── ChatInput.jsx
│   │   ├── MessageBubble.jsx
│   │   └── FileAttachment.jsx
│   └── Contacts/
│       └── ContactList.jsx
│
├── crypto/                  # Cryptographic modules
│   ├── encryption/          # AES-GCM operations
│   │   ├── encryptMessage.js
│   │   ├── decryptMessage.js
│   │   ├── encryptFile.js
│   │   └── decryptFile.js
│   ├── KeyExchange/         # ECDH protocol
│   │   ├── initiateExchange.js
│   │   ├── respondExchange.js
│   │   ├── finalizeInitiator.js
│   │   ├── deriveSessionKey.js
│   │   └── confirmKey.js
│   ├── keygen/              # Key generation
│   │   ├── generateKeys.js
│   │   ├── storeKeys.js
│   │   └── loadKeys.js
│   ├── replayProtection/    # Anti-replay
│   │   ├── timestampManager.js
│   │   ├── nonceManager.js
│   │   └── seqCounter.js
│   └── utils/
│       ├── base64.js
│       └── bufferHelpers.js
│
├── pages/                   # Route pages
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   └── ChatRoom.jsx
│
├── services/                # External integrations
│   ├── authService.js       # Auth API calls
│   └── socket.js            # Socket.IO setup
│
├── api/                     # API clients
│   ├── authAPI.js
│   ├── chatAPI.js
│   ├── fileAPI.js
│   └── keyExchangeAPI.js
│
├── storage/                 # Client-side storage
│   ├── indexedDB.js         # Key storage
│   └── localCache.js        # Session cache
│
├── styles/                  # CSS files
│   ├── global.css
│   └── chat.css
│
├── App.jsx                  # Main app component
├── index.js                 # Entry point
└── config.js                # Configuration
```

---

## Cryptographic Implementation

### Key Generation (`crypto/keygen/generateKeys.js`)

```javascript
// Generates ECDSA P-256 signing keypair
const signingKeyPair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

// Store in IndexedDB (private key as JWK)
await storeKeysSecurely({
  username,
  signing: signingKeyPair
});
```

---

### Key Exchange (`crypto/KeyExchange/`)

**1. Initiate** (`initiateExchange.js`):
```javascript
// Generate ephemeral ECDH keypair
const ephKeyPair = await crypto.subtle.generateKey(
  { name: 'ECDH', namedCurve: 'P-256' },
  true,
  ['deriveKey']
);

// Sign ephemeral public key
const signature = await crypto.subtle.sign(
  { name: 'ECDSA', hash: 'SHA-256' },
  signingPrivateKey,
  payload
);

// Send to peer
socket.emit('key-exchange-init', { ephPub, signature });
```

**2. Respond** (`respondExchange.js`):
```javascript
// Verify signature
const valid = await crypto.subtle.verify(
  { name: 'ECDSA', hash: 'SHA-256' },
  peerSigningPublicKey,
  signature,
  payload
);

if (!valid) throw new Error('Invalid signature - MITM attack!');

// Derive session key
const sessionKey = await deriveSessionKey(peerEphPub, myEphPriv);
```

---

### Message Encryption (`crypto/encryption/encryptMessage.js`)

```javascript
// Generate random IV
const iv = crypto.getRandomValues(new Uint8Array(12));

// Encrypt with AES-256-GCM
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv, tagLength: 128 },
  sessionKey,
  plaintextBytes
);

// Split ciphertext and authTag
const ciphertext = encrypted.slice(0, -16);
const authTag = encrypted.slice(-16);

// Send to peer
return { ciphertext, iv, authTag };
```

---

### File Encryption (`crypto/encryption/encryptFile.js`)

```javascript
// Split file into 64KB chunks
const CHUNK_SIZE = 64 * 1024;
const chunks = [];

for (let i = 0; i < file.size; i += CHUNK_SIZE) {
  const chunk = file.slice(i, i + CHUNK_SIZE);
  
  // Unique IV per chunk
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt chunk
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    sessionKey,
    await chunk.arrayBuffer()
  );
  
  chunks.push({ data: encrypted, iv });
}
```

---

## Security Features

### Client-Side Only Encryption

**What stays on client:**
- ✅ Private keys (ECDSA, ECDH)
- ✅ Session keys (AES-256-GCM)
- ✅ Plaintext messages
- ✅ Plaintext files
- ✅ All cryptographic operations

**What server sees:**
- ❌ Private keys (never transmitted)
- ❌ Session keys (never transmitted)
- ❌ Plaintext (never transmitted)
- ✅ Ciphertext only
- ✅ Metadata (sender, receiver, timestamp)

---

### MITM Prevention

**Digital Signatures:**
- Ephemeral public keys signed with ECDSA
- Signatures verified before accepting keys
- Attacker cannot forge signatures
- Demonstrated in `/attacks/mitm/`

---

### Replay Protection

**Timestamps:**
- Every message includes timestamp
- Messages older than 5 minutes rejected

**Sequence Counters:**
- Per-conversation sequence number
- Out-of-order messages detected

**Nonces:**
- Random nonce per message
- Duplicate nonces rejected

---

## Browser Compatibility

### Required APIs

- **Web Crypto API** - Chrome 37+, Firefox 34+, Safari 11+
- **IndexedDB** - All modern browsers
- **WebSocket** - All modern browsers
- **File API** - For file encryption/decryption

### Storage Quotas

- **IndexedDB** - 50MB+ available
- **localStorage** - Used for JWT tokens only

---

## Development

### Running Tests

```powershell
# Test socket connection
npm run test:socket

# Test file encryption (Node.js)
cd src/tests
node encrypt_file_demo.cjs

# Test key generation (browser console)
# F12 → Console:
import('./crypto/keygen/generateKeys.js').then(async ({ generateUserKeyPair }) => {
  const keys = await generateUserKeyPair();
  console.log('Keys generated:', keys);
});
```

---

### Debugging

**Enable verbose logging:**

```javascript
// Add to config.js
DEBUG: true,
LOG_CRYPTO: true
```

**Check IndexedDB:**

1. F12 → Application → IndexedDB → secureChatDB
2. Verify keys stored for your username
3. Check structure: `{ signingPublic, signingPrivate }`

**Check Socket Connection:**

```javascript
// In browser console
socket.on('connect', () => console.log('Connected!'));
socket.on('error', (err) => console.error('Socket error:', err));
```

---

## Performance

### Benchmarks (Average)

- **Key Generation:** ~50ms (one-time during registration)
- **Key Exchange:** ~100ms (one-time per conversation)
- **Message Encryption:** <5ms per message
- **Message Decryption:** <5ms per message
- **File Encryption (1MB):** ~150ms (64KB chunks)
- **File Decryption (1MB):** ~120ms (parallel processing)

---

## Troubleshooting

### Issue: Keys not found after registration

**Solution:**
1. Check IndexedDB in DevTools (F12 → Application)
2. Verify "secureChatDB" exists
3. If missing, go to Dashboard → "Regenerate Keys"

---

### Issue: Message decryption fails

**Solution:**
1. Ensure key exchange completed successfully
2. Check console for "Key exchange successful" message
3. Refresh chat to retry key exchange
4. Verify both users have valid keys

---

### Issue: File upload fails with 401

**Solution:**
1. Check JWT token in localStorage
2. Re-login if token expired
3. Verify token included in request headers

---

### Issue: Cannot connect to server

**Solution:**
1. Verify server running on port 5000
2. Check `config.js` has correct server URL
3. Check browser console for CORS errors
4. Ensure server CORS allows client origin

---

## Building for Production

```powershell
# Build optimized bundle
npm run build

# Output in /build directory
# Deploy to static hosting (Netlify, Vercel, etc.)
```

**Environment Variables:**
```bash
REACT_APP_API_URL=https://api.yourserver.com
REACT_APP_SOCKET_URL=https://api.yourserver.com
```

---

## Security Best Practices

### For Users

1. **Use strong passwords** - 12+ characters, mixed case, symbols
2. **Don't share devices** - Private keys stored per browser
3. **Backup important keys** - (future feature)
4. **Use HTTPS only** - Never use on HTTP in production

### For Developers

1. **Never log private keys** - Remove all crypto debug logs
2. **Validate all inputs** - Especially from untrusted sources
3. **Use secure random** - Always `crypto.getRandomValues()`
4. **Constant-time comparisons** - For crypto operations
5. **Clear sensitive data** - Overwrite arrays after use

---

## License

Educational use only - Information Security Course Project

---

## Support

For issues or questions:
- Check `/docs` for detailed documentation
- Review browser console for errors
- Verify IndexedDB key storage
- Check server connection status
