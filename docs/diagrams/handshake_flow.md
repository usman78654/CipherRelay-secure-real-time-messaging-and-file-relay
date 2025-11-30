Handshake flow (textual diagram)

Client A (Initiator) -> Server: POST /api/key-exchange { step: 'initiate', payload: { ephPub, timestamp }, signature, pubKeyPem }
Server: verify signature, timestamp, store initiation packet, forward/notify receiver

Client B (Responder) -> Server: POST /api/key-exchange { step: 'respond', payload: { ephPub, timestamp }, signature, pubKeyPem }
Server: verify and store response

Client A -> Server: POST /api/key-exchange { step: 'confirm', payload: { fingerprint, timestamp }, signature }
Server: store confirmation

Notes:
- All payloads are signed by the sender's long-term private key (ECDSA P-256)
- Ephemeral ECDH keys are used to derive shared symmetric keys via HKDF-SHA256
- The server never receives symmetric keys or plaintext

Data flow (files):
- Client encrypts file into chunks using AES-256-GCM per chunk with unique IV
- Client POSTs JSON: { owner, receiver, fileName, encryptedChunks: [{index, iv, ciphertext}], metadata }
- Server stores the encryptedChunks array and metadata only
- Receiver GETs file metadata and then downloads file document and decrypts locally

