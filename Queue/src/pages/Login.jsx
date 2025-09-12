import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data);
      showNotification("🎉 Login successful! Welcome back!");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="card-header text-center">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔐</div>
          <h1 style={{ color: 'var(--primary-blue)', margin: '0' }}>Welcome Back!</h1>
          <p style={{ color: 'var(--gray-600)', margin: '0.5rem 0 0 0' }}>
            Sign in to your SmartQ account
          </p>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="notification error" style={{ position: 'relative', margin: '0 0 1rem 0' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="form-input"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loading ? (
                <>
                  <div className="loading-spinner small"></div>
                  Signing in...
                </>
              ) : (
                '🔐 Sign In'
              )}
            </button>

            <div className="text-center">
              <p style={{ color: 'var(--gray-600)', margin: '0' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="btn btn-ghost"
                  style={{ padding: '0', minHeight: 'auto', textDecoration: 'underline' }}
                >
                  Create one here
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
