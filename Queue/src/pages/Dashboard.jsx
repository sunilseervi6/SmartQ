import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <div className="page-container">
      {user ? (
        <>
          {/* Welcome Header */}
          <div className="card fade-in" style={{ marginBottom: '2rem' }}>
            <div className="card-header text-center">
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👋</div>
              <h1 style={{ color: 'var(--primary-blue)', margin: '0' }}>
                Welcome to SmartQ!
              </h1>
              <p style={{ fontSize: '1.2rem', color: 'var(--gray-600)', margin: '0.5rem 0 0 0' }}>
                Hello <strong style={{ color: 'var(--primary-teal)' }}>{user.name}</strong>, 
                you are successfully logged in
                {user.role ? <> as <strong style={{ color: 'var(--primary-blue)', textTransform: 'capitalize' }}>{user.role}</strong></> : null}.
              </p>
            </div>
          </div>

          {/* Action Cards */}
          <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
            {/* Create Shop Card (owners only) */}
            {user.role === 'owner' && (
              <div className="card action-card fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--primary-blue), var(--secondary-blue))' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏪</div>
                  <h3 style={{ color: 'white', margin: '0' }}>Create Shop</h3>
                </div>
                <div className="card-body">
                  <p style={{ color: 'var(--gray-600)', textAlign: 'center', marginBottom: '1.5rem' }}>
                    Set up a new shop and start managing your queues efficiently
                  </p>
                  <button 
                    onClick={() => navigate("/create-shop")}
                    className="btn btn-primary"
                  >
                    🏪 Create Shop
                  </button>
                </div>
              </div>
            )}

            {/* My Shops Card (owners only) */}
            {user.role === 'owner' && (
              <div className="card action-card fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--primary-teal), var(--secondary-teal))' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏢</div>
                  <h3 style={{ color: 'white', margin: '0' }}>My Shops</h3>
                </div>
                <div className="card-body">
                  <p style={{ color: 'var(--gray-600)', textAlign: 'center', marginBottom: '1.5rem' }}>
                    Manage your existing shops and monitor their performance
                  </p>
                  <button 
                    onClick={() => navigate("/my-shops")}
                    className="btn btn-primary"
                  >
                    🏢 View Shops
                  </button>
                </div>
              </div>
            )}

            {/* Join Queue Card (everyone) */}
            <div className="card action-card fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--success), #22c55e)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚶‍♂️</div>
                <h3 style={{ color: 'white', margin: '0' }}>Join Queue</h3>
              </div>
              <div className="card-body">
                <p style={{ color: 'var(--gray-600)', textAlign: 'center', marginBottom: '1.5rem' }}>
                  Find and join queues at your favorite shops and services
                </p>
                <button 
                  onClick={() => navigate("/join-queue")}
                  className="btn btn-primary"
                >
                  🚶‍♂️ Join Queue
                </button>
              </div>
            </div>
          </div>

          {/* Tip for customers about owner features */}
          {user.role !== 'owner' && (
            <div className="card fade-in" style={{ marginBottom: '2rem' }}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>💡</span>
                <p style={{ margin: 0, color: 'var(--gray-700)' }}>
                  Want to create and manage shops? Log out and register with the "Register as Shop Owner" option.
                </p>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="card fade-in" style={{ animationDelay: '0.4s', marginBottom: '2rem' }}>
            <div className="card-header">
              <h2 style={{ color: 'var(--primary-blue)', margin: '0' }}>📊 Quick Overview</h2>
            </div>
            <div className="card-body">
              <div className="stats-grid">
                <div className="stat-item">
                  <div style={{ fontSize: '2.5rem' }}>🏪</div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-blue)' }}>0</div>
                    <div style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>Total Shops</div>
                  </div>
                </div>
                <div className="stat-item">
                  <div style={{ fontSize: '2.5rem' }}>🏢</div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-blue)' }}>0</div>
                    <div style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>Active Rooms</div>
                  </div>
                </div>
                <div className="stat-item">
                  <div style={{ fontSize: '2.5rem' }}>👥</div>
                  <div>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary-blue)' }}>0</div>
                    <div style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>Queue Members</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logout Section */}
          <div className="text-center">
            <button 
              onClick={logout}
              className="btn btn-danger"
            >
              🚪 Logout
            </button>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body text-center">
            <h2>Please log in to access the dashboard</h2>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
              <button 
                onClick={() => navigate("/login")}
                className="btn btn-primary"
              >
                Login
              </button>
              <button 
                onClick={() => navigate("/register")}
                className="btn btn-secondary"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
