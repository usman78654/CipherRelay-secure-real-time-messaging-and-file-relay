/**
 * Authentication Controller
 * Stores hashed passwords only (no plaintext).
 */

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/env.js";
import { logEvent } from "../services/logger.js";
import { createPublicKey, ECDH, verify } from 'node:crypto';

const SALT_ROUNDS = 10;

function validPublicKeys(username, identityKeys) {
  if (!identityKeys || typeof identityKeys.signingPublicKey !== 'string' || typeof identityKeys.agreementPublicKey !== 'string' || typeof identityKeys.proofSignature !== 'string') return false;
  try {
    const signing = Buffer.from(identityKeys.signingPublicKey, 'base64');
    const agreement = Buffer.from(identityKeys.agreementPublicKey, 'base64');
    if (signing.length < 80 || signing.length > 160 || agreement.length !== 65 || agreement[0] !== 4) return false;
    const signingKey = createPublicKey({ key: signing, format: 'der', type: 'spki' });
    if (signingKey.asymmetricKeyType !== 'ec' || signingKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') return false;
    ECDH.convertKey(agreement, 'prime256v1', undefined, undefined, 'uncompressed');
    const proof = Buffer.from(identityKeys.proofSignature, 'base64');
    const statement = Buffer.from(`securechat-identity-v1\u0000${username}\u0000${identityKeys.agreementPublicKey}`);
    return proof.length === 64 && verify('sha256', statement, { key: signingKey, dsaEncoding: 'ieee-p1363' }, proof);
  } catch { return false; }
}

export const register = async (req, res) => {
  try {
    const { username, password, identityKeys } = req.body;
    if (typeof username !== 'string' || !/^[A-Za-z0-9_-]{3,32}$/.test(username) || typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Use a 3-32 character username (letters, numbers, _ or -) and an 8-72 byte password.' });
    if (!validPublicKeys(username, identityKeys)) return res.status(400).json({ error: 'Valid, proof-bound P-256 identity public keys are required.' });

    const existing = await User.findOne({ username });
    if (existing) return res.status(409).json({ error: "Username already exists." });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = new User({ username, passwordHash: hash, identityKeys });
    await newUser.save();

    await logEvent("auth-register", { username }, newUser._id.toString());
    res.status(201).json({ message: "User registered." });
  } catch (err) {
    await logEvent("auth-register-error", { error: err.message, body: req.body }, null);
    res.status(500).json({ error: "Registration failed." });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || username.length > 32 || Buffer.byteLength(password) > 72) return res.status(400).json({ error: 'Invalid credentials format.' });

    const user = await User.findOne({ username });
    if (!user) {
      await logEvent("auth-login-failed", { username }, null);
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await logEvent("auth-login-failed", { userId: user._id.toString() }, user._id.toString());
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign({ sub: user._id.toString(), username: user.username }, config.JWT_SECRET, { expiresIn: '8h' });

    await logEvent("auth-login", { userId: user._id.toString() }, user._id.toString());
    res.json({ user: { id: user._id.toString(), username: user.username }, token });
  } catch (err) {
    await logEvent("auth-login-error", { error: err.message, body: req.body }, null);
    res.status(500).json({ error: "Login failed." });
  }
};
