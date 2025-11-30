# MITM Attack Prevention - Visual Protocol Flows

## Scenario 1: VULNERABLE - DH Without Signatures ❌

```
┌─────────────────┐                  ┌──────────────────┐                  ┌─────────────────┐
│                 │                  │                  │                  │                 │
│     ALICE       │                  │    ATTACKER      │                  │      BOB        │
│                 │                  │   (Evil Proxy)   │                  │                 │
└─────────────────┘                  └──────────────────┘                  └─────────────────┘
         │                                    │                                     │
         │ 1. Generate DH keypair             │                                     │
         │    a_private, A_public             │                                     │
         │                                    │                                     │
         │ 2. Send A_public                   │                                     │
         ├────────────────────────────────────►                                     │
         │                                    │ 🚨 INTERCEPT!                       │
         │                                    │ Generate X_private, X_public        │
         │                                    │                                     │
         │                                    │ 3. Forward X_public                 │
         │                                    │    (pretending to be Alice)         │
         │                                    ├─────────────────────────────────────►
         │                                    │                                     │
         │                                    │                         4. Generate DH keypair
         │                                    │                            b_private, B_public
         │                                    │                                     │
         │                                    │ 5. Send B_public                    │
         │                                    ◄─────────────────────────────────────┤
         │                                    │ 🚨 INTERCEPT!                       │
         │                                    │ Generate Y_private, Y_public        │
         │ 6. Forward Y_public                │                                     │
         │    (pretending to be Bob)          │                                     │
         ◄────────────────────────────────────┤                                     │
         │                                    │                                     │
         │ 7. Compute shared secret           │ 8. Compute TWO secrets              │ 9. Compute shared secret
         │    K1 = DH(a, Y)                   │    K1 = DH(y, A)                    │    K2 = DH(b, X)
         │                                    │    K2 = DH(x, B)                    │
         │                                    │                                     │
         │ Result: K1 = 34b1eaa2...           │ Attacker knows BOTH:                │ Result: K2 = 1458f174...
         │                                    │   K1 = 34b1eaa2... ✓                │
         │                                    │   K2 = 1458f174... ✓                │
         │                                    │                                     │
         │ 10. Encrypt message                │                                     │
         │     C1 = AES(K1, "Hello")          │                                     │
         │                                    │                                     │
         │ 11. Send C1                        │                                     │
         ├────────────────────────────────────►                                     │
         │                                    │ 🚨 DECRYPT!                         │
         │                                    │ M = AES-Decrypt(K1, C1)             │
         │                                    │ M = "Hello" ✓ SUCCESS               │
         │                                    │                                     │
         │                                    │ 🚨 MODIFY!                          │
         │                                    │ M' = "Give me your password"        │
         │                                    │                                     │
         │                                    │ 🚨 RE-ENCRYPT!                      │
         │                                    │ C2 = AES(K2, M')                    │
         │                                    │                                     │
         │                                    │ 12. Send C2                         │
         │                                    ├─────────────────────────────────────►
         │                                    │                                     │
         │                                    │                         13. Decrypt message
         │                                    │                             M' = AES-Decrypt(K2, C2)
         │                                    │                             M' = "Give me your password"
         │                                    │                                     │
         │                                    │                         ❌ Bob receives ATTACKER'S message!
         │                                    │                                     │
         
RESULT:
❌ Alice thinks she's talking to Bob
❌ Bob thinks he's talking to Alice  
❌ Both are actually talking to the ATTACKER
❌ Attacker can read, modify, and inject ANY message
❌ Complete loss of confidentiality and integrity
```

---

## Scenario 2: SECURE - ECDH With ECDSA Signatures ✅

```
┌─────────────────┐                  ┌──────────────────┐                  ┌─────────────────┐
│                 │                  │                  │                  │                 │
│     ALICE       │                  │    ATTACKER      │                  │      BOB        │
│                 │                  │   (Evil Proxy)   │                  │                 │
└─────────────────┘                  └──────────────────┘                  └─────────────────┘

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
PRE-REQUISITE: Long-term key exchange (authenticated channel, done once)
─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

Alice: Generate ECDSA signing keypair → SignKey_A_private, SignKey_A_public
Bob:   Generate ECDSA signing keypair → SignKey_B_private, SignKey_B_public

Exchange public keys via authenticated server (TLS):
    Alice ← SignKey_A_public → Server ← SignKey_B_public → Bob
    Alice ← SignKey_B_public → Server ← SignKey_A_public → Bob

Store trusted public keys in IndexedDB:
    Alice stores: SignKey_B_public (TRUSTED)
    Bob stores:   SignKey_A_public (TRUSTED)

─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

         │                                    │                                     │
         │ 1. Generate ephemeral ECDH keys    │                                     │
         │    a_private, A_public             │                                     │
         │                                    │                                     │
         │ 2. Create payload                  │                                     │
         │    Payload = {                     │                                     │
         │      ephPub: A_public,             │                                     │
         │      timestamp: 1701360000,        │                                     │
         │      sender: "Alice",              │                                     │
         │      receiver: "Bob"               │                                     │
         │    }                               │                                     │
         │                                    │                                     │
         │ 3. SIGN payload with long-term key │                                     │
         │    Signature = ECDSA-Sign(         │                                     │
         │      SignKey_A_private,            │                                     │
         │      Payload                       │                                     │
         │    )                               │                                     │
         │                                    │                                     │
         │ 4. Send signed message             │                                     │
         │    { Payload, Signature }          │                                     │
         ├────────────────────────────────────►                                     │
         │                                    │ 🚨 INTERCEPT!                       │
         │                                    │                                     │
         │                                    │ Attacker reads:                     │
         │                                    │   Payload: { A_public, ... }        │
         │                                    │   Signature: 304502207f9398...      │
         │                                    │                                     │
         │                                    │ 🚨 ATTACK ATTEMPT!                  │
         │                                    │ Generate X_private, X_public        │
         │                                    │                                     │
         │                                    │ Create fake payload:                │
         │                                    │   Payload' = {                      │
         │                                    │     ephPub: X_public,  ← FAKE!      │
         │                                    │     timestamp: 1701360000,          │
         │                                    │     sender: "Alice",  ← FORGED!     │
         │                                    │     receiver: "Bob"                 │
         │                                    │   }                                 │
         │                                    │                                     │
         │                                    │ ⚠️  PROBLEM: Attacker doesn't       │
         │                                    │    have SignKey_A_private!          │
         │                                    │                                     │
         │                                    │ Option A: Send unsigned             │
         │                                    │   → Bob will reject (no signature)  │
         │                                    │                                     │
         │                                    │ Option B: Keep old signature        │
         │                                    │   → Won't match modified payload    │
         │                                    │                                     │
         │                                    │ Option C: Sign with attacker key    │
         │                                    │   → Won't match Alice's trusted key │
         │                                    │                                     │
         │                                    │ Attacker chooses Option B:          │
         │                                    │ Send modified payload with          │
         │                                    │ original signature                  │
         │                                    │                                     │
         │                                    │ 5. Forward fake message             │
         │                                    │    { Payload', Signature }          │
         │                                    ├─────────────────────────────────────►
         │                                    │                                     │
         │                                    │              6. Import Alice's TRUSTED
         │                                    │                 public key from IndexedDB
         │                                    │                 SignKey_A_public ✓
         │                                    │                                     │
         │                                    │              7. VERIFY signature:
         │                                    │                 isValid = ECDSA-Verify(
         │                                    │                   SignKey_A_public,
         │                                    │                   Signature,
         │                                    │                   Payload'  ← Modified!
         │                                    │                 )
         │                                    │                                     │
         │                                    │              8. Verification Result:
         │                                    │                 isValid = FALSE ❌
         │                                    │                                     │
         │                                    │              9. Detection:
         │                                    │                 Signature doesn't match
         │                                    │                 modified payload!
         │                                    │                                     │
         │                                    │              10. REJECT message
         │                                    │                  throw Error(
         │                                    │                    'Invalid signature -
         │                                    │                     possible MITM!'
         │                                    │                  )
         │                                    │                                     │
         │                                    │ 11. Error response                  │
         │                                    ◄─────────────────────────────────────┤
         │                                    │                                     │
         │                                    │ 🛡️ ATTACK BLOCKED!                  │
         │                                    │    Signature verification failed    │
         │                                    │    Message rejected                 │
         │                                    │    Bob NOT compromised              │
         │                                    │                                     │
         
RESULT:
✅ Signature proves A_public came from Alice
✅ Any modification detected immediately
✅ Attacker cannot forge signature without SignKey_A_private
✅ Bob only accepts authentic, unmodified keys
✅ Secure key exchange completed
✅ MITM attack PREVENTED
```

---

## Key Differences: Why Signatures Matter

### Without Signatures ❌

| Step | Alice | Attacker | Bob | Result |
|------|-------|----------|-----|--------|
| Key Exchange | Sends A_public | Replaces with X_public | Receives X_public | ❌ Bob has wrong key |
| Authentication | None | N/A | None | ❌ No way to verify |
| Shared Secret | Computes K1 | Computes K1 and K2 | Computes K2 | ❌ Different secrets |
| Encryption | Encrypts with K1 | Decrypts with K1 | N/A | ❌ Attacker can decrypt |
| Integrity | No protection | Modifies message | Decrypts with K2 | ❌ Modified message accepted |

**Outcome:** Complete compromise of confidentiality and integrity

---

### With Signatures ✅

| Step | Alice | Attacker | Bob | Result |
|------|-------|----------|-----|--------|
| Key Exchange | Sends A_public + Signature | Tries to replace | Receives both | ✅ Has signature to verify |
| Authentication | Signs with SignKey_A_private | Cannot forge signature | Verifies with SignKey_A_public | ✅ Authentic key verified |
| Attack Attempt | N/A | Modifies payload | Signature check fails | ✅ Attack detected |
| Response | N/A | N/A | Rejects message | ✅ No key accepted |
| Shared Secret | Not established | Cannot compute | Not established | ✅ No compromise |

**Outcome:** Attack prevented, security maintained

---

## Cryptographic Security Properties

### ECDSA Signature Provides:

1. **Authentication**
   - Proves the ephemeral public key came from Alice
   - Only Alice can create valid signature (has private key)

2. **Integrity**
   - Any modification to payload invalidates signature
   - Even 1-bit change results in verification failure

3. **Non-repudiation**
   - Signature proves Alice sent this specific key
   - Cannot deny sending the message

4. **Binding**
   - Signature binds ephemeral key to Alice's identity
   - Prevents key substitution attacks

### Additional Protections:

5. **Timestamp Validation**
   - Prevents replay of old signed messages
   - 5-minute freshness window

6. **Explicit Parties**
   - Payload specifies sender and receiver
   - Prevents redirect attacks

7. **Ephemeral Keys**
   - Fresh keys for each session
   - Forward secrecy guaranteed

---

## Attack Complexity Analysis

### Breaking the Signature:

**Option 1: Brute force private key**
- Complexity: 2^256 operations
- Time: Longer than age of universe
- Status: Computationally infeasible

**Option 2: Forge ECDSA signature**
- Complexity: Breaking P-256 elliptic curve
- Best known attack: ~2^128 operations
- Status: Infeasible with current technology

**Option 3: Modify signed payload**
- Complexity: Find collision for SHA-256
- Best known attack: 2^128 operations
- Status: Infeasible

**Option 4: Compromise Alice's device**
- Complexity: Physical/malware attack
- Protection: Out of scope for protocol
- Mitigation: Device security, antivirus

---

## Conclusion

### The Critical Difference:

**Without signatures:**
```
Key → Network → Attacker → Modified Key → Victim
No authentication → Attack succeeds ❌
```

**With signatures:**
```
Key + Signature → Network → Attacker → Modified Key + Signature → Victim
                                                                      ↓
                                                              Verify Signature
                                                                      ↓
                                                              Signature Invalid
                                                                      ↓
                                                              Reject Message ✅
```

### Bottom Line:

**Digital signatures are ESSENTIAL for secure key exchange.**

Without them, MITM attacks are trivial.
With them, MITM attacks are prevented.

Our implementation uses ECDSA P-256 signatures and is **secure** against MITM attacks. ✅
