import { useState } from "react";

const LoginForm = ({ onSubmit }) => {
  const [form, setForm] = useState({ username: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);  // Parent passes final auth handler
  };

  return (
    <div className="auth-card">
      <h2>Welcome Back</h2>
      <form className="auth-form" onSubmit={handleSubmit} aria-label="Login form">
        <label>
          <span>Username</span>
          <input
            type="text"
            placeholder="Enter your username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
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
          />
        </label>

        <button type="submit">Sign In</button>
      </form>
      
      <div className="auth-footer">
        <a className="small-link" href="/register">Don't have an account? Create one</a>
      </div>
    </div>
  );
};

export default LoginForm;
