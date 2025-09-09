import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function MyShops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchShops();
  }, []);

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

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading your shops...</div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2>My Shops</h2>
        <button 
          onClick={() => navigate("/create-shop")}
          style={{ 
            padding: "0.75rem 1.5rem", 
            backgroundColor: "#28a745", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          + Create New Shop
        </button>
      </div>

      {error && <p style={{ color: "red", backgroundColor: "#ffe6e6", padding: "0.5rem", borderRadius: "4px" }}>{error}</p>}

      {shops.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <h3>No shops yet</h3>
          <p>Create your first shop to get started!</p>
          <button 
            onClick={() => navigate("/create-shop")}
            style={{ 
              padding: "0.75rem 1.5rem", 
              backgroundColor: "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "1rem"
            }}
          >
            Create Shop
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))" }}>
          {shops.map((shop) => (
            <div 
              key={shop.id} 
              style={{ 
                border: "1px solid #ddd", 
                borderRadius: "8px", 
                padding: "1.5rem",
                backgroundColor: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                <h3 style={{ margin: "0", color: "#333" }}>{shop.name}</h3>
                <span 
                  style={{ 
                    backgroundColor: "#e9ecef", 
                    padding: "0.25rem 0.5rem", 
                    borderRadius: "4px", 
                    fontSize: "0.8rem",
                    color: "#495057"
                  }}
                >
                  {shop.category}
                </span>
              </div>

              <div style={{ marginBottom: "1rem", color: "#666" }}>
                <p style={{ margin: "0.5rem 0" }}>📍 {shop.address}</p>
                {shop.description && <p style={{ margin: "0.5rem 0", fontStyle: "italic" }}>{shop.description}</p>}
                {shop.phone && <p style={{ margin: "0.5rem 0" }}>📞 {shop.phone}</p>}
                {shop.email && <p style={{ margin: "0.5rem 0" }}>✉️ {shop.email}</p>}
              </div>

              <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <strong>Shop Code:</strong>
                  <code style={{ backgroundColor: "#e9ecef", padding: "0.25rem 0.5rem", borderRadius: "3px" }}>
                    {shop.shopCode}
                  </code>
                </div>
                {shop.customId && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>Custom ID:</strong>
                    <code style={{ backgroundColor: "#d4edda", padding: "0.25rem 0.5rem", borderRadius: "3px" }}>
                      {shop.customId}
                    </code>
                  </div>
                )}
              </div>

              <div style={{ fontSize: "0.9rem", color: "#666", marginBottom: "1rem" }}>
                Created: {formatDate(shop.createdAt)}
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => navigate(`/shop/${shop.customId || shop.shopCode}`)}
                  style={{ 
                    flex: 1,
                    padding: "0.5rem", 
                    backgroundColor: "#007bff", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  View
                </button>
                <button 
                  onClick={() => {
                    const shareText = shop.customId 
                      ? `Check out ${shop.name}! Visit: ${window.location.origin}/shop/${shop.customId}`
                      : `Check out ${shop.name}! Shop Code: ${shop.shopCode}`;
                    navigator.clipboard.writeText(shareText);
                    alert("Share link copied to clipboard!");
                  }}
                  style={{ 
                    flex: 1,
                    padding: "0.5rem", 
                    backgroundColor: "#28a745", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <button 
          onClick={() => navigate("/")}
          style={{ 
            padding: "0.5rem 1rem", 
            backgroundColor: "#6c757d", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
