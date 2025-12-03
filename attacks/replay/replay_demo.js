/**
 * Replay Attack Demonstration
 * Shows how timestamps, nonces, and sequence counters prevent replay attacks
 */

console.log('='.repeat(70));
console.log('REPLAY ATTACK DEMONSTRATION');
console.log('='.repeat(70));
console.log();

// Simulate a legitimate message
const legitimateMessage = {
  sender: 'alice',
  receiver: 'bob',
  ciphertext: 'U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=',
  iv: 'a1b2c3d4e5f6g7h8',
  timestamp: Date.now(),
  nonce: 'random-nonce-12345',
  sequenceNumber: 1
};

console.log('✅ LEGITIMATE MESSAGE:');
console.log(JSON.stringify(legitimateMessage, null, 2));
console.log();

// Scenario 1: Replay attack WITHOUT protection
console.log('━'.repeat(70));
console.log('SCENARIO 1: System WITHOUT Replay Protection ❌');
console.log('━'.repeat(70));
console.log();

console.log('Step 1: Attacker captures legitimate message');
console.log('Step 2: Attacker replays same message 5 minutes later');
console.log();

const replayedMessage = { ...legitimateMessage };
console.log('📤 REPLAYED MESSAGE (identical):');
console.log(JSON.stringify(replayedMessage, null, 2));
console.log();

console.log('❌ Server accepts message (NO PROTECTION)');
console.log('❌ Bob receives duplicate message');
console.log('❌ Attack SUCCESSFUL - Replay not detected!');
console.log();

// Scenario 2: Replay attack WITH protection
console.log('━'.repeat(70));
console.log('SCENARIO 2: Our System WITH Replay Protection ✅');
console.log('━'.repeat(70));
console.log();

console.log('Step 1: Attacker captures legitimate message at t=0');
const capturedTime = Date.now();
console.log(`   Captured timestamp: ${new Date(capturedTime).toISOString()}`);
console.log(`   Nonce: ${legitimateMessage.nonce}`);
console.log(`   Sequence: ${legitimateMessage.sequenceNumber}`);
console.log();

console.log('Step 2: Attacker waits 6 minutes...');
console.log();

console.log('Step 3: Attacker replays message at t=6min');
const replayTime = capturedTime + (6 * 60 * 1000); // 6 minutes later
console.log(`   Current time: ${new Date(replayTime).toISOString()}`);
console.log(`   Message timestamp: ${new Date(capturedTime).toISOString()}`);
console.log(`   Time difference: ${(replayTime - capturedTime) / 60000} minutes`);
console.log();

console.log('🛡️ Server Checks:');
console.log();

// Check 1: Timestamp
console.log('Check 1: Timestamp Freshness');
const maxAge = 5 * 60 * 1000; // 5 minutes
const age = replayTime - capturedTime;
const timestampValid = age <= maxAge;
console.log(`   Message age: ${age / 60000} minutes`);
console.log(`   Max allowed: ${maxAge / 60000} minutes`);
console.log(`   ❌ REJECTED - Message too old!`);
console.log();

// Check 2: Nonce
console.log('Check 2: Nonce Uniqueness');
const usedNonces = new Set(['random-nonce-12345', 'other-nonce-67890']);
const nonceValid = !usedNonces.has(legitimateMessage.nonce);
console.log(`   Received nonce: ${legitimateMessage.nonce}`);
console.log(`   Already used: ${usedNonces.has(legitimateMessage.nonce)}`);
console.log(`   ❌ REJECTED - Nonce already seen!`);
console.log();

// Check 3: Sequence Number
console.log('Check 3: Sequence Number');
const lastSeqNumber = 5; // Bob has received messages 1-5
const seqValid = legitimateMessage.sequenceNumber > lastSeqNumber;
console.log(`   Received sequence: ${legitimateMessage.sequenceNumber}`);
console.log(`   Last received: ${lastSeqNumber}`);
console.log(`   ❌ REJECTED - Old sequence number!`);
console.log();

console.log('═'.repeat(70));
console.log('RESULT: ✅ REPLAY ATTACK BLOCKED!');
console.log('═'.repeat(70));
console.log();
console.log('Our system uses THREE layers of protection:');
console.log('  1. Timestamps (reject messages > 5 minutes old)');
console.log('  2. Nonces (reject if nonce seen before)');
console.log('  3. Sequence numbers (reject if number <= last received)');
console.log();
console.log('Attacker cannot replay old messages! 🛡️');
console.log();

// Show successful fresh message
console.log('━'.repeat(70));
console.log('LEGITIMATE FRESH MESSAGE (for comparison):');
console.log('━'.repeat(70));
console.log();

const freshMessage = {
  sender: 'alice',
  receiver: 'bob',
  ciphertext: 'U2FsdGVkX1+NEW_MESSAGE_DATA',
  iv: 'new-iv-value',
  timestamp: Date.now(),
  nonce: 'fresh-nonce-99999',  // New nonce
  sequenceNumber: 6  // Next in sequence
};

console.log('✅ FRESH MESSAGE:');
console.log(JSON.stringify(freshMessage, null, 2));
console.log();

const currentTime = Date.now();
const msgAge = currentTime - freshMessage.timestamp;
console.log('🛡️ Server Checks:');
console.log(`   ✅ Timestamp fresh (${msgAge}ms old)`);
console.log(`   ✅ Nonce never seen before`);
console.log(`   ✅ Sequence number in order (6 > 5)`);
console.log();
console.log('✅ MESSAGE ACCEPTED - All checks passed!');
console.log();
console.log('='.repeat(70));
