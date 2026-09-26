import fs from 'node:fs';
import dotenv from 'dotenv';
dotenv.config();
function secret(name) {
  if (process.env[name] && process.env[name + '_FILE']) throw new Error('Set only ' + name + ' or ' + name + '_FILE');
  return process.env[name + '_FILE'] ? fs.readFileSync(process.env[name + '_FILE'], 'utf8').trim() : process.env[name];
}
const production = process.env.NODE_ENV === 'production';
const jwtSecret = secret('JWT_SECRET') || (production ? '' : 'local-development-only-do-not-deploy');
if (production && (jwtSecret.length < 32 || /changeme|local-development|your-secret/i.test(jwtSecret))) throw new Error('Production requires a random JWT_SECRET of at least 32 characters');
const origins = (process.env.ALLOWED_ORIGINS || (production ? '' : 'http://localhost:3000')).split(',').map(s => s.trim()).filter(Boolean);
if (!origins.length || origins.some(origin => {
  try { const url = new URL(origin); return !['http:', 'https:'].includes(url.protocol) || url.origin !== origin; }
  catch { return true; }
})) throw new Error('ALLOWED_ORIGINS must contain exact HTTP(S) origins');
const mongoPassword = secret('MONGO_PASSWORD');
const mongoUri = process.env.MONGO_URI || (mongoPassword
  ? 'mongodb://' + encodeURIComponent(process.env.MONGO_USER || 'chat') + ':' + encodeURIComponent(mongoPassword) + '@mongo:27017/securechat?authSource=securechat'
  : production ? '' : 'mongodb://localhost:27017/secure-chat');
if (!mongoUri) throw new Error('MONGO_URI or MONGO_PASSWORD_FILE is required');
const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
if (!['0', '1'].includes(process.env.TRUST_PROXY || '0')) throw new Error('TRUST_PROXY must be 0 or 1');
export default {
  PORT: port, MONGO_URI: mongoUri, JWT_SECRET: jwtSecret,
  ALLOWED_ORIGINS: origins, TRUST_PROXY: Number(process.env.TRUST_PROXY || 0),
  ADMIN_USERS: (process.env.ADMIN_USERS || '').split(',').map(s => s.trim()).filter(Boolean)
};
