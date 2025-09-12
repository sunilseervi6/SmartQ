import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function MyShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchShops();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchShops = async () => {
    try {
      const response = await api.get("/shops");
      if (response.data.success) {
        setShops(response.data.shops);
      }
    } catch (err) {
      setError("Failed to load shops");
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleShareShop = (shop) => {
    const shareText = shop.customId 
      ? `Check out ${shop.name}! Visit: ${window.location.origin}/shop/${shop.customId}`
      : `Check out ${shop.name}! Shop Code: ${shop.shopCode}`;
    navigator.clipboard.writeText(shareText);
    showNotification("📋 Share link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your shops...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">🏪 My Shops</h1>
          <button 
            onClick={() => navigate("/create-shop")}
            className="btn btn-success"
          >
            ➕ Create New Shop
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="notification error">
          {error}
        </div>
      )}

      {shops.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏪</div>
          <h3>No shops yet</h3>
          <p>Create your first shop to get started!</p>
          <button 
            onClick={() => navigate("/create-shop")}
            className="btn btn-primary"
          >
            🏗️ Create Shop
          </button>
        </div>
      ) : (
        <div className="shops-grid">
          {shops.map((shop, index) => (
            <div 
              key={shop.id} 
              className="card shop-card fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="card-header">
                <div className="shop-header">
                  <h3 className="shop-name">{shop.name}</h3>
                  <span className="shop-category-badge">
                    {shop.category}
                  </span>
                </div>
              </div>

              <div className="card-body">
                <div className="shop-details">
                  <div className="shop-info">
                    <div className="info-item">
                      <span className="info-icon">📍</span>
                      <span>{shop.address}</span>
                    </div>
                    {shop.description && (
                      <div className="info-item description">
                        <span className="info-icon">📝</span>
                        <span className="shop-description">{shop.description}</span>
                      </div>
                    )}
                    {shop.phone && (
                      <div className="info-item">
                        <span className="info-icon">📞</span>
                        <span>{shop.phone}</span>
                      </div>
                    )}
                    {shop.email && (
                      <div className="info-item">
                        <span className="info-icon">✉️</span>
                        <span>{shop.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="shop-codes-section">
                  <div className="code-display">
                    <span className="code-label">Shop Code:</span>
                    <code className="shop-code">{shop.shopCode}</code>
                  </div>
                  {shop.customId && (
                    <div className="code-display">
                      <span className="code-label">Custom ID:</span>
                      <code className="custom-id">{shop.customId}</code>
                    </div>
                  )}
                </div>

                <div className="shop-meta">
                  <span className="created-date">📅 Created: {formatDate(shop.createdAt)}</span>
                </div>
              </div>

              <div className="card-footer">
                <div className="shop-actions">
                  <button 
                    onClick={() => navigate(`/manage-rooms/${shop.id}`)}
                    className="btn btn-primary flex-1"
                  >
                    🏢 Manage Rooms
                  </button>
                  <button 
                    onClick={() => handleShareShop(shop)}
                    className="btn btn-success flex-1"
                  >
                    📤 Share
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="page-footer">
        <button 
          onClick={() => navigate("/")}
          className="btn btn-secondary"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
