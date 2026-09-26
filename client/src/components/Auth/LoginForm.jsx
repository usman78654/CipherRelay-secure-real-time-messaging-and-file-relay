import { useState } from "react";

const LoginForm = ({ onSubmit }) => {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try { await onSubmit(form); }
    catch (err) { setError(err.response?.data?.error || 'Sign in failed.'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="auth-card">
      <h2>Welcome Back</h2>
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}
      <form className="auth-form" onSubmit={handleSubmit} aria-label="Login form">
        <label>
          <span>Username</span>
          <input
            type="text"
            placeholder="Enter your username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            autoComplete="username"
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign In'}</button>
      </form>
      
      <div className="auth-footer">
        <a className="small-link" href="/register">Don't have an account? Create one</a>
      </div>
    </div>
  );
};

export default LoginForm;
