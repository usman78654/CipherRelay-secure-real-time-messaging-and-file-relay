import { useState } from "react";
import { generateUserKeyPair, exportPublicIdentityKeys } from "../../crypto/keygen/generateKeys";
import { storeKeysSecurely } from "../../crypto/keygen/storeKeys";

const RegisterForm = ({ onSubmit }) => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [error, setError] = useState("");
  const [keyGenStatus, setKeyGenStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^[A-Za-z0-9_-]{3,32}$/.test(form.username)) {
      setError("Username must be 3-32 characters and use only letters, numbers, _ or -.");
      return;
    }
    if (new TextEncoder().encode(form.password).length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setGeneratingKeys(true);

    try {
      // Step 1: Generate ECC key pairs
      setKeyGenStatus("Generating ECDSA signing keys...");
      const keys = await generateUserKeyPair();
      const identityKeys = await exportPublicIdentityKeys(keys, form.username);
      setKeyGenStatus("Creating account...");
      await onSubmit({ ...form, identityKeys });
      
      setKeyGenStatus("Generating ECDH key exchange keys...");
      console.log('✓ ECC Keys generated:', {
        signing: 'ECDSA P-256',
        ecdh: 'ECDH P-256'
      });

      // Step 2: Store keys securely in IndexedDB (client-side only)
      setKeyGenStatus("Storing keys securely in IndexedDB...");
      await storeKeysSecurely({ username: form.username, ...keys });
      console.log('✓ Keys stored in IndexedDB (never sent to server)');

      // Step 3: Proceed with account registration
      setKeyGenStatus("Creating account...");
      alert('Registration successful — you can now sign in.');
      window.location.href = '/login';
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.error || err.message || "Registration failed");
    } finally {
      setGeneratingKeys(false);
      setKeyGenStatus("");
    }
  };

  return (
    <div className="auth-card">
      <h2>Create Account</h2>
      {error && <p style={{ color: "red", fontSize: "14px", marginBottom: "10px" }}>{error}</p>}
      {generatingKeys && (
        <div style={{ 
          background: "#e7f5ec", 
          padding: "12px", 
          borderRadius: "8px", 
          marginBottom: "15px",
          border: "1px solid #008069"
        }}>
          <p style={{ color: "#008069", fontSize: "14px", margin: 0 }}>
            🔐 {keyGenStatus}
          </p>
        </div>
      )}
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Username</span>
          <input
            type="text"
            placeholder="Choose a username"
            minLength={3}
            maxLength={32}
            pattern="[A-Za-z0-9_-]+"
            title="Use 3-32 letters, numbers, underscores, or hyphens."
            autoComplete="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            placeholder="At least 8 characters"
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <small>Use 8-72 characters. Do not reuse an important password for this demo.</small>
        </label>

        <button type="submit" disabled={generatingKeys}>
          {generatingKeys ? 'Generating Keys...' : 'Create Account'}
        </button>
      </form>
      
      <div className="auth-footer">
        <a className="small-link" href="/login">Already have an account? Sign in</a>
      </div>
    </div>
  );
};

export default RegisterForm;
