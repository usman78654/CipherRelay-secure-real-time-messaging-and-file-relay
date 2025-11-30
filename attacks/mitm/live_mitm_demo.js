/**
 * Live MITM Attack Demo - Intercepts actual Socket.IO traffic
 * 
 * This script acts as a proxy between client and server to demonstrate
 * how MITM attacks work in practice and how our signatures prevent them.
 * 
 * Run this BEFORE starting the client to intercept traffic.
 */

import { io as ioClient } from 'socket.io-client';
import { Server } from 'socket.io';
import express from 'express';
import http from 'http';
import crypto from 'crypto';

const REAL_SERVER = 'http://localhost:5000';
const PROXY_PORT = 5001;

console.log('\n🚨 MITM PROXY SERVER STARTING...\n');
console.log('This proxy sits between client and server');
console.log(`Client should connect to: http://localhost:${PROXY_PORT}`);
console.log(`Proxy forwards to real server: ${REAL_SERVER}\n`);

const app = express();
const server = http.createServer(app);
const proxyIO = new Server(server, {
  cors: { origin: '*' }
});

// Connect to real server
const serverConnection = ioClient(REAL_SERVER, {
  transports: ['websocket'],
  autoConnect: true
});

serverConnection.on('connect', () => {
  console.log('✅ Proxy connected to real server\n');
});

// Map client sockets to server
const clientToServer = new Map();

proxyIO.on('connection', (clientSocket) => {
  console.log(`📱 Client connected: ${clientSocket.id}`);
  
  // Forward all client events to server
  clientSocket.onAny((event, ...args) => {
    console.log(`\n📤 CLIENT → SERVER: ${event}`);
    
    if (event === 'send-encrypted-message') {
      const packet = args[0];
      console.log('   Message packet:', {
        chatId: packet.chatId,
        sender: packet.sender,
        receiver: packet.receiver,
        hasCiphertext: !!packet.ciphertext,
        hasSignature: !!(packet.publicData && packet.publicData.signature)
      });
      
      // ATTEMPT MITM ATTACK
      console.log('\n🚨 ATTEMPTING MITM ATTACK...');
      
      if (packet.publicData && packet.publicData.signature) {
        console.log('   ⚠️  Message has digital signature');
        console.log('   Attempting to replace ephemeral public key...');
        
        // Generate attacker's fake ephemeral key
        const attackerECDH = crypto.createECDH('prime256v1');
        attackerECDH.generateKeys();
        const fakePublicKey = attackerECDH.getPublicKey('base64');
        
        console.log('   Attacker fake key:', fakePublicKey.substring(0, 40) + '...');
        
        // Try to replace the public key in payload
        try {
          const originalPayload = JSON.parse(packet.publicData.payload);
          const modifiedPayload = {
            ...originalPayload,
            ephPub: fakePublicKey,
            _attackerModified: true
          };
          
          console.log('   ⚠️  Modified payload with attacker key');
          console.log('   Original signature still present:', packet.publicData.signature.substring(0, 40) + '...');
          console.log('   🛡️  PREDICTION: Receiver will detect invalid signature and REJECT\n');
          
          // Send modified packet
          packet.publicData.payload = JSON.stringify(modifiedPayload);
        } catch (err) {
          console.log('   ❌ Could not modify payload:', err.message);
        }
      } else {
        console.log('   ⚠️  No signature found - message vulnerable to MITM');
        console.log('   💡 This is why signatures are critical!\n');
      }
    }
    
    serverConnection.emit(event, ...args);
  });
  
  // Forward server responses to client
  serverConnection.onAny((event, ...args) => {
    console.log(`📥 SERVER → CLIENT: ${event}`);
    
    if (event === 'receive-encrypted-message') {
      const msg = args[0];
      console.log('   Message:', {
        chatId: msg.chatId,
        sender: msg.sender,
        hasCiphertext: !!msg.ciphertext
      });
    }
    
    if (event === 'error') {
      console.log('   ❌ Error:', args[0]);
      if (args[0].error && args[0].error.includes('signature')) {
        console.log('   🛡️  SIGNATURE VERIFICATION FAILED - MITM PREVENTED!\n');
      }
    }
    
    clientSocket.emit(event, ...args);
  });
  
  clientSocket.on('disconnect', () => {
    console.log(`📱 Client disconnected: ${clientSocket.id}\n`);
  });
});

server.listen(PROXY_PORT, () => {
  console.log(`🚨 MITM Proxy listening on port ${PROXY_PORT}`);
  console.log(`\nTo test:`);
  console.log(`1. Keep real server running on port 5000`);
  console.log(`2. Update client config to connect to http://localhost:${PROXY_PORT}`);
  console.log(`3. Try to send a key exchange message`);
  console.log(`4. Watch the logs to see MITM attack being prevented\n`);
});

serverConnection.on('connect_error', (err) => {
  console.error('❌ Cannot connect to real server:', err.message);
  console.log('Make sure the server is running on port 5000\n');
});
