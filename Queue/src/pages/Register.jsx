import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      // Call backend register API
      await api.post("/auth/register", { name, email, password, role: isOwner ? 'owner' : 'customer' });
      
      // Registration successful - redirect to login
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-white border-l-4 border-green-500 p-4 rounded-lg shadow-lg z-50 fade-in';
      notification.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900">Registration Successful!</p>
            <p class="text-sm text-gray-500">Please login with your credentials.</p>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
      
      navigate("/login");
    } catch (err) {
      // Handle specific error messages
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, var(--light-blue) 0%, var(--light-teal) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div className="card fade-in" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="card-header text-center">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
          <h1 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>Join SmartQ</h1>
          <p style={{ color: 'var(--gray-600)', margin: '0' }}>Create your account to get started</p>
        </div>
        
        <div className="card-body">
          {error && (
            <div className="mb-4 fade-in" style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: 'var(--radius-md)', 
              padding: '1rem',
              color: 'var(--error)'
            }}>
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                👤 Full Name
              </label>
              <input 
                id="name"
                type="text"
                className="form-input"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Enter your full name" 
                required 
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                📧 Email Address
              </label>
              <input 
                id="email"
                type="email"
                className="form-input"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter your email address" 
                required 
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                🔒 Password
              </label>
              <input 
                id="password"
                type="password" 
                className="form-input"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Create a secure password" 
                required 
                disabled={loading}
                minLength="6"
              />
              <small style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                Password must be at least 6 characters long
              </small>
            </div>

            {/* Role selection */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="isOwner">
                🏪 Register as Shop Owner
              </label>
              <div className="flex items-center gap-2">
                <input 
                  id="isOwner" 
                  type="checkbox" 
                  checked={isOwner} 
                  onChange={(e) => setIsOwner(e.target.checked)}
                  disabled={loading}
                />
                <span style={{ color: 'var(--gray-600)' }}>
                  Enable this if you'll create and manage shops
                </span>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginBottom: '1rem' }}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0' }}></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <>
                  <span>🎯</span>
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="card-footer text-center">
          <p style={{ color: 'var(--gray-600)', margin: '0' }}>
            Already have an account?{' '}
            <a 
              href="/login" 
              style={{ 
                color: 'var(--primary-blue)', 
                fontWeight: '600',
                textDecoration: 'none'
              }}
              onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.target.style.textDecoration = 'none'}
            >
              Sign in here →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
