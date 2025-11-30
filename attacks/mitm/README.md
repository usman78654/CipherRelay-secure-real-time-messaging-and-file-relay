# MITM Attack Demonstration

This directory contains scripts and documentation demonstrating Man-in-the-Middle (MITM) attacks on key exchange protocols and how digital signatures prevent them.

## 📁 Files

### 1. `mitm_attacker.js`
**Theoretical MITM demonstration** showing:
- How MITM breaks Diffie-Hellman WITHOUT signatures
- How digital signatures (ECDSA) PREVENT MITM attacks
- Side-by-side comparison of vulnerable vs. secure protocols

**Run:**
```bash
cd attacks/mitm
node mitm_attacker.js
```

**Output:** Console logs showing successful MITM on unsigned DH vs. failed MITM on signed ECDH.

---

### 2. `live_mitm_demo.js`
**Live proxy-based MITM attack** that:
- Acts as man-in-the-middle proxy between client and server
- Intercepts real Socket.IO traffic
- Attempts to replace ephemeral public keys
- Shows signature verification detecting and blocking the attack

**Run:**
```bash
# Terminal 1: Start real server
cd server/src
npm start

# Terminal 2: Start MITM proxy
cd attacks/mitm
node live_mitm_demo.js

# Terminal 3: Update client config to use proxy, then start client
# In client/src/config.js: SOCKET_URL: 'http://localhost:5001'
cd client
npm start
```

**Expected Result:** Proxy logs show attack attempt, but server rejects modified messages due to invalid signatures.

---

## 🎯 Attack Scenarios Demonstrated

### Scenario 1: Vulnerable DH (No Signatures) ❌

**Attack Flow:**
1. Alice sends DH public key → **ATTACKER INTERCEPTS**
2. Attacker generates own DH keypair
3. Attacker sends fake public key to Bob (pretending to be Alice)
4. Bob sends his public key → **ATTACKER INTERCEPTS**
5. Attacker sends different fake public key to Alice (pretending to be Bob)

**Result:**
- Alice computes `shared_secret_1 = DH(alice_private, attacker_public_1)`
- Bob computes `shared_secret_2 = DH(bob_private, attacker_public_2)`
- Attacker computes both secrets
- **Alice and Bob have DIFFERENT secrets**
- Attacker can decrypt all messages

**Why it works:** No authentication of public keys!

---

### Scenario 2: Secure ECDH with Signatures ✅

**Our Implementation:**
1. Alice generates ephemeral ECDH keypair
2. Alice **SIGNS** ephemeral public key with her long-term ECDSA private key
3. Alice sends: `{ ephemeralPublic, signature }`
4. **ATTACKER intercepts and tries to replace key**
5. Bob receives message
6. Bob **VERIFIES signature** using Alice's trusted ECDSA public key
7. Signature verification **FAILS** (attacker doesn't have Alice's private key)
8. Bob **REJECTS** the message

**Result:**
- ✅ MITM attack **PREVENTED**
- ✅ Only authentic keys are accepted
- ✅ Secure key exchange completed

---

## 🔐 Cryptographic Details

### Our Protocol Uses:

| Component | Algorithm | Purpose |
|-----------|-----------|---------|
| **Long-term Keys** | ECDSA P-256 | Sign ephemeral keys |
| **Ephemeral Keys** | ECDH P-256 | Key agreement |
| **Signature** | ECDSA-SHA256 | Authenticate public keys |
| **Session Key** | HKDF-SHA256 | Derive from shared secret |
| **Message Encryption** | AES-256-GCM | Encrypt messages |

### Key Security Properties:

1. **Authentication:** Digital signatures prove identity of sender
2. **Integrity:** Signatures detect any modification of public keys
3. **Non-repudiation:** Only holder of private key can create valid signature
4. **Forward Secrecy:** Ephemeral keys ensure past sessions can't be decrypted
5. **MITM Prevention:** Attacker cannot forge signatures without private key

---

## 📸 Screenshots for Report

### Required Evidence:

1. **Console output from `mitm_attacker.js`:**
   - Shows successful MITM on unsigned DH
   - Shows failed MITM on signed ECDH
   - Includes all printed logs

2. **Live proxy attack logs:**
   - Proxy intercepting traffic
   - Attempted key replacement
   - Signature verification failure
   - Server rejecting modified message

3. **Browser DevTools:**
   - Client console showing signature verification
   - Network tab showing WebSocket traffic
   - Error messages when MITM is detected

4. **Server logs:**
   - Message receipt with signatures
   - Signature verification logic
   - Rejection of invalid signatures

---

## 🧪 Step-by-Step Testing

### Test 1: Run Theoretical Demo

```bash
cd attacks/mitm
node mitm_attacker.js > mitm_attack_output.txt
```

**What to capture:**
- Full console output showing both scenarios
- Screenshot of terminal output
- Save `mitm_attack_output.txt` for report

---

### Test 2: Live MITM Attack

**Setup:**
```bash
# Terminal 1: Real server
cd server/src
npm start

# Terminal 2: MITM proxy
cd attacks/mitm
node live_mitm_demo.js
```

**Configure client to use proxy:**
```javascript
// client/src/config.js
export default {
  API_URL: 'http://localhost:5000',  // Keep API on real server
  SOCKET_URL: 'http://localhost:5001'  // Point socket to MITM proxy
};
```

**Test Steps:**
1. Start proxy (Terminal 2)
2. Start client (Terminal 3)
3. Login as user1
4. Login as user2 (different browser)
5. Send message from user1 to user2
6. Watch proxy logs show interception attempt
7. Verify message is rejected or signature fails

**What to capture:**
- Proxy console showing attack attempt
- Client console showing signature verification
- Server console showing message processing
- Network traffic in DevTools

---

## 📊 Analysis Results

### Without Signatures:
```
Alice's Secret:  a1b2c3d4...
Bob's Secret:    e5f6g7h8...  ❌ DIFFERENT!
Attacker knows BOTH secrets
Message decrypted by attacker: "Hello Bob!"
```

### With Signatures:
```
Alice's Signature: Valid ✅
Attacker's Fake Signature: Invalid ❌
Bob rejects attacker's key
Alice and Bob share same secret: x9y8z7...
Message encrypted end-to-end
Attacker cannot decrypt
```

---

## 🛡️ Defense Mechanisms in Our Implementation

### 1. Long-term Key Exchange (Out-of-Band)
- Users exchange ECDSA public keys via authenticated channel
- Stored in IndexedDB and trusted

### 2. Ephemeral Key Signing
- Each session generates fresh ECDH keypair
- Ephemeral public key is signed with long-term ECDSA key
- Signature sent alongside public key

### 3. Signature Verification
```javascript
// Receiver verifies before accepting any key
const isValid = await subtle.verify(
  { name: 'ECDSA', hash: 'SHA-256' },
  senderTrustedPublicKey,  // Must be previously authenticated
  signature,
  payload
);

if (!isValid) {
  throw new Error('Invalid signature - possible MITM attack!');
}
```

### 4. Timestamp Validation
- Prevents replay of old signed messages
- 5-minute window for freshness

---

## 📝 Report Sections

### For Assignment Report:

**Section: MITM Attack Demonstration**

1. **Threat Description**
   - What is MITM attack
   - How it works on key exchange
   - Potential impact

2. **Vulnerable Scenario**
   - DH without authentication
   - Code example from `mitm_attacker.js`
   - Console output showing successful attack

3. **Secure Implementation**
   - ECDH with ECDSA signatures
   - Protocol flow diagram
   - Code showing signature generation/verification

4. **Live Attack Attempt**
   - Proxy setup
   - Traffic interception
   - Signature verification blocking attack
   - Logs and screenshots

5. **Conclusion**
   - Digital signatures are essential
   - Our implementation is secure
   - No vulnerability to MITM

---

## 🔗 Related Files

- **Protocol Documentation:** `docs/protocol/KEY_EXCHANGE_PROTOCOL.md`
- **Key Management:** `docs/KEY_MANAGEMENT.md`
- **Client Implementation:** `client/src/crypto/KeyExchange/`
- **Server Implementation:** `server/src/controllers/keyExchangeController.js`

---

## ⚠️ Important Notes

1. **These are demonstration scripts for educational purposes**
2. **Do NOT use MITM techniques on networks you don't own**
3. **The proxy is for local testing only**
4. **Always use signatures in production systems**
5. **This demonstrates WHY our implementation is secure**
