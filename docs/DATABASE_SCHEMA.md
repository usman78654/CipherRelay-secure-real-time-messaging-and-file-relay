# Database Schema Design

**Project:** End-to-End Encrypted Secure Chat & File Sharing  
**Database:** MongoDB (NoSQL)  
**Date:** December 3, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Diagrams](#schema-diagrams)
3. [Collection Schemas](#collection-schemas)
4. [Security Considerations](#security-considerations)
5. [Indexing Strategy](#indexing-strategy)
6. [Data Flow](#data-flow)

---

## Overview

The database design follows a **zero-knowledge architecture** where the server stores only encrypted data and metadata. The database never contains:

- ❌ Plaintext messages
- ❌ Plaintext files
- ❌ Private cryptographic keys
- ❌ Passwords (only bcrypt hashes)
- ❌ Session keys

### Design Principles

1. **Zero-Knowledge Storage** - Server cannot decrypt any user content
2. **Metadata Minimization** - Store only essential metadata
3. **Audit Trail** - Log all security-relevant events
4. **Replay Protection** - Track sequence counters and nonces
5. **Scalability** - NoSQL for flexible schema and horizontal scaling

---

## Schema Diagrams

### Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
│─────────────────│
│ _id (ObjectId)  │◄─────┐
│ username        │      │
│ passwordHash    │      │
│ createdAt       │      │
└─────────────────┘      │
                         │
                         │ sender/receiver
                         │
┌─────────────────┐      │
│    Message      │      │
│─────────────────│      │
│ _id (ObjectId)  │      │
│ chatId          │──────┤
│ sender          │──────┘
│ receiver        │──────┐
│ ciphertext      │      │
│ iv              │      │
│ authTag         │      │
│ isFile          │      │
│ fileId          │──┐   │
│ fileName        │  │   │
│ fileSize        │  │   │
│ fileType        │  │   │
│ metadata        │  │   │
│ timestamp       │  │   │
└─────────────────┘  │   │
                     │   │
                     ▼   │
┌─────────────────┐      │
│      File       │      │
│─────────────────│      │
│ _id (ObjectId)  │      │
│ owner           │──────┘
│ receiver        │──────┐
│ fileName        │      │
│ encryptedChunks │      │
│ metadata        │      │
│ uploadedAt      │      │
└─────────────────┘      │
                         │
┌─────────────────┐      │
│  KeyExchange    │      │
│─────────────────│      │
│ _id (ObjectId)  │      │
│ sender          │──────┤
│ receiver        │──────┘
│ step            │
│ publicData      │
│ createdAt       │
└─────────────────┘

┌─────────────────┐
│   AuditLog      │
│─────────────────│
│ _id (ObjectId)  │
│ eventType       │
│ details         │
│ userId          │
│ timestamp       │
└─────────────────┘

┌─────────────────┐
│  SeqCounter     │
│─────────────────│
│ _id (ObjectId)  │
│ ownerId         │
│ chatId          │
│ seq             │
│ updatedAt       │
└─────────────────┘
```

---

## Collection Schemas

### 1. Users Collection

**Purpose:** Store user accounts with hashed passwords only.

**Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `username` | String | ✅ | Unique username (indexed) |
| `passwordHash` | String | ✅ | bcrypt hash (cost factor 10) |
| `createdAt` | Date | Auto | Account creation timestamp |

**Example Document:**

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "username": "alice",
  "passwordHash": "$2a$10$N9qo8uLOickgx2ZMRZoMye.gC/z7BG1XP0Hj8Sk",
  "createdAt": "2025-12-03T10:23:45.123Z"
}
```

**Security Notes:**
- ✅ Passwords hashed with bcrypt (NEVER stored in plaintext)
- ✅ Unique constraint prevents duplicate usernames
- ✅ No sensitive data stored (keys stored client-side only)

---

### 2. Messages Collection

**Purpose:** Store encrypted message ciphertext and metadata.

**Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `chatId` | String | ✅ | Chat identifier (sender-receiver sorted) |
| `sender` | String | ✅ | Username of sender |
| `receiver` | String | ✅ | Username of receiver |
| `ciphertext` | String | Optional | Base64 encrypted message (AES-GCM) |
| `iv` | String | Optional | Base64 initialization vector (12 bytes) |
| `authTag` | String | Optional | Base64 authentication tag (16 bytes) |
| `isFile` | Boolean | Default: false | Whether message contains file attachment |
| `fileId` | String | Optional | Reference to File document |
| `fileName` | String | Optional | Original filename (encrypted) |
| `fileSize` | Number | Optional | File size in bytes |
| `fileType` | String | Optional | MIME type |
| `metadata` | Object | Optional | Non-sensitive metadata |
| `timestamp` | Date | Auto | Message timestamp |

**Example Document (Text Message):**

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "chatId": "alice-bob",
  "sender": "alice",
  "receiver": "bob",
  "ciphertext": "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y=",
  "iv": "LXtZo8jx5C2aW3w+",
  "authTag": "ea0c381f4d5e6a7b8c9d0e1f2a3b4c5d",
  "isFile": false,
  "metadata": {},
  "timestamp": "2025-12-03T10:25:30.456Z"
}
```

**Example Document (File Message):**

```json
{
  "_id": "507f1f77bcf86cd799439013",
  "chatId": "alice-bob",
  "sender": "alice",
  "receiver": "bob",
  "isFile": true,
  "fileId": "507f1f77bcf86cd799439014",
  "fileName": "document.pdf",
  "fileSize": 262144,
  "fileType": "application/pdf",
  "metadata": {
    "chunks": 4,
    "encryptedName": "ZG9jdW1lbnQucGRm"
  },
  "timestamp": "2025-12-03T10:30:15.234Z"
}
```

**Security Notes:**
- ✅ All message content encrypted client-side with AES-256-GCM
- ✅ Server cannot decrypt ciphertext (no keys available)
- ✅ GCM auth tags ensure integrity and authenticity
- ✅ Only metadata visible to server (sender, receiver, timestamp)

---

### 3. Files Collection

**Purpose:** Store encrypted file chunks and metadata.

**Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `owner` | String | ✅ | Username of uploader |
| `receiver` | String | ✅ | Username of intended recipient |
| `fileName` | String | Optional | Encrypted filename |
| `encryptedChunks` | Array | Default: [] | Array of encrypted chunk objects |
| `metadata` | Object | Optional | Chunk metadata (IVs, tags, sizes) |
| `uploadedAt` | Date | Auto | Upload timestamp |

**Chunk Structure:**

```javascript
{
  chunkIndex: 0,
  ciphertext: "base64_encrypted_chunk",
  iv: "base64_iv",
  authTag: "base64_auth_tag",
  size: 65536  // bytes
}
```

**Example Document:**

```json
{
  "_id": "507f1f77bcf86cd799439014",
  "owner": "alice",
  "receiver": "bob",
  "fileName": "ZG9jdW1lbnQucGRm",
  "encryptedChunks": [
    {
      "chunkIndex": 0,
      "ciphertext": "U2FsdGVkX1+chunk1data...",
      "iv": "a1b2c3d4e5f6a7b8c9d0e1f2",
      "authTag": "chunk1authtag...",
      "size": 65536
    },
    {
      "chunkIndex": 1,
      "ciphertext": "U2FsdGVkX1+chunk2data...",
      "iv": "b2c3d4e5f6a7b8c9d0e1f2a3",
      "authTag": "chunk2authtag...",
      "size": 65536
    }
  ],
  "metadata": {
    "totalChunks": 4,
    "chunkSize": 65536,
    "totalSize": 262144
  },
  "uploadedAt": "2025-12-03T10:30:15.234Z"
}
```

**Security Notes:**
- ✅ Files encrypted in 64KB chunks with AES-256-GCM
- ✅ Each chunk has unique IV and auth tag
- ✅ Server stores encrypted chunks only
- ✅ Filename encrypted to prevent metadata leakage

---

### 4. KeyExchange Collection

**Purpose:** Store ECDH key exchange handshake messages.

**Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `sender` | String | ✅ | Username initiating/responding |
| `receiver` | String | ✅ | Username of peer |
| `step` | String | ✅ | Handshake step: `initiate`, `respond`, `confirm` |
| `publicData` | Object | ✅ | Ephemeral public key, signature, timestamp |
| `createdAt` | Date | Auto | Exchange timestamp |

**Example Document (Initiate Step):**

```json
{
  "_id": "507f1f77bcf86cd799439015",
  "sender": "alice",
  "receiver": "bob",
  "step": "initiate",
  "publicData": {
    "payload": "{\"ephPub\":\"base64_ecdh_public_key\",\"timestamp\":1701598530,\"sender\":\"alice\",\"receiver\":\"bob\"}",
    "signature": "base64_ecdsa_signature",
    "pubKeyB64": "base64_longterm_ecdsa_public_key",
    "timestamp": 1701598530
  },
  "createdAt": "2025-12-03T10:25:30.456Z"
}
```

**Security Notes:**
- ✅ Only public keys and signatures stored (no private keys)
- ✅ Signatures prevent MITM attacks
- ✅ Ephemeral keys provide forward secrecy
- ✅ Timestamps prevent replay attacks

---

### 5. AuditLog Collection

**Purpose:** Log security events for monitoring and forensics.

**Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `eventType` | String | ✅ | Event category (see below) |
| `details` | Object | Optional | Event-specific details |
| `userId` | String | Optional | Associated user ID |
| `timestamp` | Date | Auto | Event timestamp |

**Event Types:**

- `auth-register` - User registration
- `auth-login` - Successful login
- `auth-login-failed` - Failed login attempt
- `key-exchange-initiated` - ECDH handshake started
- `key-exchange-completed` - ECDH handshake finished
- `signature-verification-failed` - Invalid signature detected (MITM attempt)
- `replay-attack-detected` - Duplicate nonce or old timestamp
- `message-sent` - Encrypted message sent
- `file-uploaded` - Encrypted file uploaded
- `rate-limit-exceeded` - Too many requests

**Example Document:**

```json
{
  "_id": "507f1f77bcf86cd799439016",
  "eventType": "signature-verification-failed",
  "details": {
    "sender": "alice",
    "receiver": "bob",
    "reason": "Invalid ECDSA signature on ephemeral key",
    "ipAddress": "192.168.1.100"
  },
  "userId": "507f1f77bcf86cd799439011",
  "timestamp": "2025-12-03T10:26:15.789Z"
}
```

**Security Notes:**
- ✅ All authentication events logged
- ✅ Failed signature verifications logged (MITM detection)
- ✅ Replay attempts logged
- ✅ Logs used for forensics and compliance

---

### 6. SeqCounter Collection

**Purpose:** Track message sequence numbers for replay protection.

**Schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `ownerId` | String | ✅ | User ID (indexed) |
| `chatId` | String | ✅ | Chat identifier (indexed) |
| `seq` | Number | Default: 0 | Current sequence number |
| `updatedAt` | Date | Auto | Last update timestamp |

**Compound Index:** `{ ownerId: 1, chatId: 1 }` (unique)

**Example Document:**

```json
{
  "_id": "507f1f77bcf86cd799439017",
  "ownerId": "507f1f77bcf86cd799439011",
  "chatId": "alice-bob",
  "seq": 42,
  "updatedAt": "2025-12-03T10:30:00.000Z"
}
```

**Security Notes:**
- ✅ Prevents replay attacks (out-of-order messages rejected)
- ✅ Each chat has separate sequence counter
- ✅ Atomic increment operations ensure consistency

---

## Security Considerations

### 1. Zero-Knowledge Architecture

**What is NOT stored:**
- ❌ Plaintext messages
- ❌ Plaintext files
- ❌ Private keys (ECDSA or ECDH)
- ❌ Session keys (derived from ECDH)
- ❌ Passwords (only bcrypt hashes)

**What IS stored:**
- ✅ Encrypted ciphertext (AES-256-GCM)
- ✅ Initialization vectors (IVs)
- ✅ Authentication tags
- ✅ Public keys (for signature verification)
- ✅ Metadata (usernames, timestamps, file sizes)

### 2. Data Protection

| Data Type | Encryption | Storage Location | Access |
|-----------|-----------|------------------|--------|
| **Passwords** | bcrypt hash | MongoDB Users collection | Server only (hashed) |
| **Private Keys** | None (never transmitted) | Client IndexedDB | Client only |
| **Messages** | AES-256-GCM (client-side) | MongoDB Messages collection | Encrypted only |
| **Files** | AES-256-GCM chunks (client-side) | MongoDB Files collection | Encrypted only |
| **Session Keys** | Derived via HKDF (client-side) | Client memory | Client only |

### 3. Threat Mitigation

| Threat | Database Defense |
|--------|-----------------|
| **Server Compromise** | Server has no keys, cannot decrypt |
| **Database Breach** | All data encrypted, useless without client keys |
| **MITM Attack** | Signatures verified, invalid exchanges logged |
| **Replay Attack** | Sequence counters and nonces prevent replays |
| **Brute Force Login** | bcrypt slows password cracking |
| **SQL Injection** | MongoDB (NoSQL), parameterized queries |

---

## Indexing Strategy

### Performance Indexes

```javascript
// Users collection
db.users.createIndex({ username: 1 }, { unique: true });

// Messages collection
db.messages.createIndex({ chatId: 1, timestamp: -1 });
db.messages.createIndex({ sender: 1, timestamp: -1 });
db.messages.createIndex({ receiver: 1, timestamp: -1 });

// Files collection
db.files.createIndex({ owner: 1, uploadedAt: -1 });
db.files.createIndex({ receiver: 1, uploadedAt: -1 });

// KeyExchange collection
db.keyexchanges.createIndex({ sender: 1, receiver: 1, createdAt: -1 });

// AuditLog collection
db.auditlogs.createIndex({ eventType: 1, timestamp: -1 });
db.auditlogs.createIndex({ userId: 1, timestamp: -1 });

// SeqCounter collection
db.seqcounters.createIndex({ ownerId: 1, chatId: 1 }, { unique: true });
```

### Index Justifications

- **Username index (unique)** - Fast login lookups, prevent duplicates
- **ChatId + timestamp** - Efficiently retrieve conversation history
- **Sender/receiver indexes** - Query user's messages quickly
- **EventType + timestamp** - Audit log filtering and analysis
- **Compound (ownerId, chatId)** - Unique sequence counter per chat

---

## Data Flow

### 1. User Registration

```
Client                    Server                   Database
  |                         |                          |
  |-- POST /api/auth/register (username, password) --->|
  |                         |                          |
  |                         |-- bcrypt.hash(password)  |
  |                         |                          |
  |                         |-- INSERT INTO Users ---->|
  |                         |                    (username, hash)
  |                         |                          |
  |                         |<----- User created ------|
  |                         |                          |
  |<--- { message: "User registered" } ---------------|
  |                         |                          |
```

### 2. Message Send (E2EE)

```
Client A                  Server                   Database
  |                         |                          |
  |-- Generate session key (ECDH) -------------------- |
  |-- Encrypt message (AES-GCM) ---------------------- |
  |                         |                          |
  |-- POST /api/chat/send { ciphertext, iv, tag } --->|
  |                         |                          |
  |                         |-- INSERT INTO Messages ->|
  |                         |           (encrypted)    |
  |                         |                          |
  |                         |-- Emit via Socket.IO --->|
  |                         |                          |
  |                         |                     Client B
  |                         |                          |
  |                         |<--- Retrieve message ----|
  |                         |                          |
  |                         |-- Query Messages ------->|
  |                         |                          |
  |                         |<--- Return ciphertext ---|
  |                         |                          |
```

Client B decrypts locally with session key.

---

## Summary

This database schema implements a **zero-knowledge architecture** where:

1. **All encryption happens client-side** (Web Crypto API)
2. **Server stores only ciphertext** (cannot decrypt)
3. **Private keys never leave client** (IndexedDB only)
4. **Audit trails track security events** (forensics)
5. **Replay protection via sequence counters** (prevents replay attacks)
6. **Signatures prevent MITM** (ECDSA verification)

**Total Collections:** 6  
**Total Documents (example):** ~100 users, ~10,000 messages, ~500 files  
**Storage:** Minimal (ciphertext only, no redundant plaintext)  
**Security Level:** Military-grade E2EE with zero server trust

---

**Last Updated:** December 3, 2025  
**Schema Version:** 1.0
