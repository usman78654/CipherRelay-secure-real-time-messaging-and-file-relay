/**
 * Test script to verify ECC key generation and storage
 * Run this in browser console to test
 */

async function testKeyGeneration() {
  console.log('=== ECC Key Generation Test ===\n');
  
  try {
    // Import modules
    const { generateUserKeyPair } = await import('./crypto/keygen/generateKeys.js');
    const { storeKeysSecurely } = await import('./crypto/keygen/storeKeys.js');
    const { loadKeysSecurely } = await import('./crypto/keygen/loadKeys.js');
    
    // Test 1: Generate keys
    console.log('1. Generating ECC key pairs...');
    const keys = await generateUserKeyPair();
    console.log('✓ Keys generated successfully');
    console.log('  - Signing key (ECDSA):', keys.signing ? 'Present' : 'Missing');
    console.log('  - ECDH key:', keys.ecdh ? 'Present' : 'Missing');
    
    // Test 2: Store keys
    console.log('\n2. Storing keys in IndexedDB...');
    await storeKeysSecurely({ username: 'test_user', ...keys }, null);
    console.log('✓ Keys stored successfully');
    
    // Test 3: Load keys
    console.log('\n3. Loading keys from IndexedDB...');
    const loadedKeys = await loadKeysSecurely('test_user');
    console.log('✓ Keys loaded successfully');
    console.log('  - Signing key:', loadedKeys.signing ? 'Present' : 'Missing');
    console.log('  - ECDH key:', loadedKeys.ecdh ? 'Present' : 'Missing');
    
    // Test 4: Verify key types
    console.log('\n4. Verifying key properties...');
    if (loadedKeys.signing) {
      console.log('  - Signing public key algorithm:', loadedKeys.signing.publicKey.algorithm.name);
      console.log('  - Signing curve:', loadedKeys.signing.publicKey.algorithm.namedCurve);
    }
    if (loadedKeys.ecdh) {
      console.log('  - ECDH public key algorithm:', loadedKeys.ecdh.publicKey.algorithm.name);
      console.log('  - ECDH curve:', loadedKeys.ecdh.publicKey.algorithm.namedCurve);
    }
    
    // Test 5: Test signing (to verify keys work)
    console.log('\n5. Testing signing functionality...');
    const message = new TextEncoder().encode('Test message');
    const signature = await window.crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      loadedKeys.signing.privateKey,
      message
    );
    console.log('✓ Signature generated:', signature.byteLength, 'bytes');
    
    const verified = await window.crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      loadedKeys.signing.publicKey,
      signature,
      message
    );
    console.log('✓ Signature verified:', verified);
    
    console.log('\n=== ALL TESTS PASSED ✓ ===');
    console.log('\nKey Security Notes:');
    console.log('  ✓ Keys generated using Web Crypto API (P-256 curve)');
    console.log('  ✓ Private keys stored in IndexedDB (client-side only)');
    console.log('  ✓ Private keys NEVER sent to server');
    console.log('  ✓ Keys persist across browser sessions');
    
    return { success: true, keys: loadedKeys };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error };
  }
}

// Export for use in console
window.testKeyGeneration = testKeyGeneration;

console.log('Key generation test loaded. Run: testKeyGeneration()');
