import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.username || !form.email || !form.password) {
      return setError("All fields are required");
    }
    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }
    if (form.password !== form.confirm) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);
      await register(form.username, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <span className="auth-logo-text">
            Chat<span style={{ color: "var(--accent)" }}>Wave</span>
          </span>
        </div>

        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join ChatWave and start chatting in seconds</p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: "rgba(255,77,109,.1)",
                border: "1px solid rgba(255,77,109,.3)",
                color: "var(--danger)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: ".85rem",
                marginBottom: "16px",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="input"
              type="text"
              name="username"
              placeholder="cooluser123"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="input"
              type="password"
              name="password"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className="input"
              type="password"
              name="confirm"
              placeholder="••••••••"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button
            className="btn btn-primary w-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: "8px", height: "44px", fontSize: ".95rem" }}
          >
            {loading ? <span className="spinner" /> : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
