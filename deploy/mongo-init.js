// Runs only on a new MongoDB volume. Application user cannot administer MongoDB.
const fs = require('fs');
db = db.getSiblingDB('securechat');
db.createUser({
  user: 'chat',
  pwd: fs.readFileSync('/run/secrets/mongo_password', 'utf8').trim(),
  roles: [{ role: 'readWrite', db: 'securechat' }]
});
