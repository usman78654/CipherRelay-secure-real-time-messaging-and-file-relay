# Secure Chat Server

**Backend for End-to-End Encrypted Chat & File Sharing System**

## Overview

Zero-knowledge Node.js server that relays encrypted messages and stores ciphertext without ever having access to plaintext content or encryption keys.

### Key Principles

- ✅ **Zero-Knowledge Architecture** - Server never sees plaintext
- ✅ **Metadata Relay** - Stores only ciphertext + IV + authTag
- ✅ **No Key Storage** - Private keys never leave client
- ✅ **E2EE Enforcement** - All cryptographic operations client-side
- ✅ **Security-First** - Rate limiting, audit logs, JWT auth

---

## Quick Start

### Installation

```powershell
cd server/src
npm install
```

### Configuration

Create `.env` file in `server/src/`:

```bash
# Database
MONGO_URI=mongodb://localhost:27017/securechat

# Authentication
JWT_SECRET=your-strong-256-bit-secret-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development

# Security (optional)
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
ADMIN_USERS=admin,moderator

# TLS (optional for HTTPS)
USE_TLS=false
TLS_KEY_PATH=./config/ssl/key.pem
TLS_CERT_PATH=./config/ssl/cert.pem
```

### Running

```powershell
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

Server starts on `http://localhost:5000` (or HTTPS if TLS enabled)

### Testing

```powershell
# Run all tests
npm test
```

---

## API Endpoints

### Authentication (`/api/auth`)

**POST `/api/auth/register`** - Register new user
- Request: `{ "username": "alice", "password": "..." }`
- Response: `{ "token": "...", "user": {...} }`
- Note: NO cryptographic keys sent to server

**POST `/api/auth/login`** - Authenticate user
- Request: `{ "username": "alice", "password": "..." }`
- Response: `{ "token": "...", "user": {...} }`

### Chat (`/api/chat`)

**GET `/api/chat/history/:chatId`** - Retrieve encrypted messages
- Headers: `Authorization: Bearer <token>`
- Returns: Array of encrypted messages (ciphertext only)

**POST `/api/chat/send`** - Send encrypted message
- Request: `{ "chatId", "receiver", "ciphertext", "iv", "authTag" }`

### Files (`/api/files`)

**POST `/api/files/upload`** - Upload encrypted file chunks
- Request: `{ "encryptedFile": { "chunks": [...], "metadata": {...} } }`
- Response: `{ "fileId": "..." }`

**GET `/api/files/download/:fileId`** - Download encrypted file
- Response: `{ "chunks": [...], "metadata": {...} }`

### Key Exchange (`/api/key-exchange`)

**POST `/api/key-exchange/initiate`** - Start ECDH key exchange
- Includes digital signature for MITM prevention
- Server verifies signature before storing

**POST `/api/key-exchange/respond`** - Respond to key exchange
- Signature verified on server

---

## Socket.IO Events

### Client → Server
- `authenticate` - WebSocket authentication with JWT
- `send-encrypted-message` - Real-time encrypted message delivery

### Server → Client
- `receive-encrypted-message` - Receive encrypted message
- `error` - Error notifications

---

## Database Schema

**Users:** `{ username, passwordHash }` - NO keys stored  
**Messages:** `{ chatId, sender, receiver, ciphertext, iv, authTag }`  
**Files:** `{ chunks: [{data, iv, authTag}], metadata }`  
**KeyExchange:** `{ initiator, responder, publicData, status }`  
**AuditLog:** `{ userId, action, result, timestamp }`

---

## Security Features

- **JWT Authentication** - HMAC-SHA256, 24h expiration
- **bcrypt Passwords** - Cost factor 10
- **Rate Limiting** - 100 requests/15min per IP
- **Audit Logging** - All security events logged
- **Signature Verification** - Prevents MITM attacks
- **Input Validation** - All endpoints validate inputs
- **HTTPS/WSS** - TLS 1.2+ for production

---

## Directory Structure

```
src/
├── config/         # Database, environment config
├── controllers/    # Request handlers (auth, chat, files, etc.)
├── middleware/     # Auth, rate limiting, error handling
├── models/         # MongoDB schemas (User, Message, File, etc.)
├── routes/         # API route definitions
├── services/       # Business logic, logging, audit
├── socket/         # Socket.IO chat handlers
├── utils/          # Signature verification, time checks
├── app.js          # Express app setup
└── server.js       # Server entry point
```

---

## Deployment

```powershell
# Production
NODE_ENV=production npm start

# With PM2 (recommended)
pm2 start server.js --name secure-chat-server

# With Docker
docker build -t secure-chat-server .
docker run -p 5000:5000 secure-chat-server
```

---

## Troubleshooting

**MongoDB Connection Failed:**
```powershell
# Check MongoDB running
mongod --dbpath /path/to/data

# Verify MONGO_URI in .env
```

**Socket.IO Not Connecting:**
- Check CORS configuration in app.js
- Verify client connects to correct URL

**JWT Verification Failed:**
- Ensure JWT_SECRET matches between server restarts
- Check token expiration time

---

## Notes

- Server expects HTTPS in production (use TLS certificate)
- All cryptographic operations happen on client
- Server only stores ciphertext and metadata
- Private keys NEVER transmitted to server
- See `/docs` for complete documentation

---

## License

Educational use only - Information Security Course Project
