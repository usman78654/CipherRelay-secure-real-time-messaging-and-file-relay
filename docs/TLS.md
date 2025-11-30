# Development TLS (HTTPS/WSS)

To run the server with local TLS (self-signed certificate) for development/demo purposes:

1. Generate a self-signed certificate (example using OpenSSL):

```powershell
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 -subj "/CN=localhost"
```

2. Place the files under `server/src/config/ssl/key.pem` and `server/src/config/ssl/cert.pem` or set environment variables before starting the server:

```powershell
$env:USE_TLS = 'true'
$env:TLS_KEY_PATH = 'D:\INFO_SEC_PROJECT\server\src\config\ssl\key.pem'
$env:TLS_CERT_PATH = 'D:\INFO_SEC_PROJECT\server\src\config\ssl\cert.pem'
node server/src/server.js
```

3. When TLS is active, the server uses HTTPS and Socket.IO will operate over WSS. In the client, ensure `REACT_APP_SERVER_URL` is set to `https://localhost:5000` if the client is served separately.

Notes:
- Self-signed certs will be rejected by browsers; for demos you can import the cert into the OS/browser trust store or use a tool like `mkcert` to create locally trusted certs.
- For production, always use CA-signed certificates and secure key storage.
