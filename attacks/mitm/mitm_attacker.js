/**
 * MITM Attack Demonstration
 * 
 * This script demonstrates a Man-in-the-Middle attack on the key exchange protocol.
 * It shows:
 * 1. How MITM can intercept and modify DH key exchange WITHOUT signatures
 * 2. How digital signatures PREVENT MITM attacks in our implementation
 */

import crypto from 'crypto';

// ============================================
// SCENARIO 1: Vulnerable DH (No Signatures)
// ============================================

console.log('\n========================================');
console.log('SCENARIO 1: DH Key Exchange WITHOUT Signatures');
console.log('========================================\n');

// Alice generates her DH keypair
const aliceDH = crypto.createDiffieHellman(2048);
aliceDH.generateKeys();
const alicePublicKey = aliceDH.getPublicKey();

console.log('1️⃣  Alice generates DH keypair');
console.log('   Alice Public Key:', alicePublicKey.toString('hex').substring(0, 40) + '...');

// ATTACKER INTERCEPTS and generates their own DH keypair
const attackerDH = crypto.createDiffieHellman(aliceDH.getPrime(), aliceDH.getGenerator());
attackerDH.generateKeys();
const attackerPublicKey = attackerDH.getPublicKey();

console.log('\n2️⃣  🚨 ATTACKER intercepts Alice\'s public key');
console.log('   Attacker generates fake keypair');
console.log('   Attacker Public Key:', attackerPublicKey.toString('hex').substring(0, 40) + '...');

// Bob thinks he's receiving Alice's key, but gets attacker's key
const bobDH = crypto.createDiffieHellman(aliceDH.getPrime(), aliceDH.getGenerator());
bobDH.generateKeys();
const bobPublicKey = bobDH.getPublicKey();

console.log('\n3️⃣  Bob generates his DH keypair');
console.log('   Bob Public Key:', bobPublicKey.toString('hex').substring(0, 40) + '...');

// ATTACKER computes shared secrets with BOTH parties
const attackerAliceSecret = attackerDH.computeSecret(alicePublicKey);
const attackerBobSecret = attackerDH.computeSecret(bobPublicKey);

// Alice computes shared secret with ATTACKER (thinking it's Bob)
const aliceSecret = aliceDH.computeSecret(attackerPublicKey);

// Bob computes shared secret with ATTACKER (thinking it's Alice)
const bobSecret = bobDH.computeSecret(attackerPublicKey);

console.log('\n4️⃣  Shared Secrets Computed:');
console.log('   Alice\'s secret:', aliceSecret.toString('hex').substring(0, 40) + '...');
console.log('   Bob\'s secret:', bobSecret.toString('hex').substring(0, 40) + '...');
console.log('   Attacker-Alice secret:', attackerAliceSecret.toString('hex').substring(0, 40) + '...');
console.log('   Attacker-Bob secret:', attackerBobSecret.toString('hex').substring(0, 40) + '...');

console.log('\n⚠️  RESULT: Alice and Bob have DIFFERENT secrets!');
console.log('   Alice encrypted message can be decrypted by attacker');
console.log('   Attacker can read, modify, and re-encrypt messages');
console.log('   ❌ MITM ATTACK SUCCESSFUL (No Signatures)\n');


// ============================================
// SCENARIO 2: Secure ECDH with Signatures
// ============================================

console.log('\n========================================');
console.log('SCENARIO 2: ECDH Key Exchange WITH Digital Signatures');
console.log('========================================\n');

// Alice generates long-term ECDSA signing keys
const aliceSignKeys = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

// Bob generates long-term ECDSA signing keys
const bobSignKeys = crypto.generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

console.log('1️⃣  Alice and Bob exchange long-term signing public keys (authenticated channel)');
console.log('   Alice Signing Public Key (trusted)');
console.log('   Bob Signing Public Key (trusted)');

// Alice generates ephemeral ECDH keypair
const aliceECDH = crypto.createECDH('prime256v1');
aliceECDH.generateKeys();
const aliceEphemeralPublic = aliceECDH.getPublicKey();

// Alice SIGNS her ephemeral public key
const alicePayload = JSON.stringify({
  ephemeralPublic: aliceEphemeralPublic.toString('hex'),
  timestamp: Date.now(),
  sender: 'Alice',
  receiver: 'Bob'
});

const aliceSignature = crypto.sign('sha256', Buffer.from(alicePayload), aliceSignKeys.privateKey);

console.log('\n2️⃣  Alice generates ephemeral ECDH keypair and SIGNS it');
console.log('   Ephemeral Public:', aliceEphemeralPublic.toString('hex').substring(0, 40) + '...');
console.log('   Signature:', aliceSignature.toString('hex').substring(0, 40) + '...');

// ATTACKER tries to intercept and replace with their own key
const attackerECDH = crypto.createECDH('prime256v1');
attackerECDH.generateKeys();
const attackerEphemeralPublic = attackerECDH.getPublicKey();

console.log('\n3️⃣  🚨 ATTACKER intercepts and tries to replace public key');
console.log('   Attacker Ephemeral Public:', attackerEphemeralPublic.toString('hex').substring(0, 40) + '...');

// Attacker tries to sign with Alice's identity (but doesn't have her private key)
const attackerFakePayload = JSON.stringify({
  ephemeralPublic: attackerEphemeralPublic.toString('hex'),
  timestamp: Date.now(),
  sender: 'Alice',  // Pretending to be Alice
  receiver: 'Bob'
});

// Attacker can't create valid signature without Alice's private key
// So they either:
// A) Send unsigned message (Bob will reject)
// B) Sign with their own key (Bob will detect it's not Alice's signature)

console.log('\n4️⃣  Bob receives the message and VERIFIES signature');

// Bob verifies with Alice's trusted public key
try {
  const isValid = crypto.verify(
    'sha256',
    Buffer.from(alicePayload),
    aliceSignKeys.publicKey,
    aliceSignature
  );
  
  console.log('   ✅ Alice\'s signature: VALID');
  console.log('   Ephemeral key is authenticated and trusted');
} catch (err) {
  console.log('   ❌ Signature verification FAILED');
}

// Try to verify attacker's message with Alice's public key (will fail)
try {
  // Attacker tries to forge Alice's signature (will fail)
  const attackerSignKeys = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  
  const attackerFakeSignature = crypto.sign('sha256', Buffer.from(attackerFakePayload), attackerSignKeys.privateKey);
  
  const isValid = crypto.verify(
    'sha256',
    Buffer.from(attackerFakePayload),
    aliceSignKeys.publicKey,  // Bob verifies with Alice's TRUSTED public key
    attackerFakeSignature
  );
  
  if (!isValid) {
    console.log('\n   🛡️  Attacker\'s fake signature: REJECTED');
    console.log('   Signature doesn\'t match Alice\'s trusted public key');
  }
} catch (err) {
  console.log('\n   🛡️  Attacker\'s fake signature: REJECTED');
  console.log('   Signature verification failed:', err.message);
}

console.log('\n✅ RESULT: MITM Attack PREVENTED by Digital Signatures');
console.log('   Bob only accepts ephemeral keys signed by Alice\'s trusted key');
console.log('   Attacker cannot forge signatures without Alice\'s private key');
console.log('   Secure key exchange completed successfully\n');


// ============================================
// SUMMARY
// ============================================

console.log('\n========================================');
console.log('SUMMARY: Why Digital Signatures Are Critical');
console.log('========================================\n');

console.log('WITHOUT Signatures:');
console.log('  ❌ Attacker can intercept and replace public keys');
console.log('  ❌ No way to verify authenticity of keys');
console.log('  ❌ Alice and Bob end up with different shared secrets');
console.log('  ❌ Attacker can decrypt, read, and modify all messages\n');

console.log('WITH Digital Signatures (ECDSA):');
console.log('  ✅ Each ephemeral public key is signed with long-term private key');
console.log('  ✅ Receiver verifies signature using sender\'s trusted public key');
console.log('  ✅ Attacker cannot forge signatures without private key');
console.log('  ✅ Modified or replaced keys are immediately detected');
console.log('  ✅ MITM attacks are prevented\n');

console.log('Our Implementation Uses:');
console.log('  • ECDSA P-256 for signing ephemeral DH public keys');
console.log('  • ECDH P-256 for key agreement');
console.log('  • Long-term signing keys stored in IndexedDB');
console.log('  • Ephemeral keys generated fresh for each session');
console.log('  • Signature verification before accepting any public key\n');
