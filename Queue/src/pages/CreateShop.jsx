import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function CreateShop() {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    category: "",
    customId: "",
    description: "",
    phone: "",
    email: ""
  });
  const [error, setError] = useState("");
  const [customIdStatus, setCustomIdStatus] = useState("");
  const [isCheckingCustomId, setIsCheckingCustomId] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const categories = [
    'Restaurant', 'Retail', 'Services', 'Electronics', 
    'Grocery', 'Fashion', 'Healthcare', 'Beauty', 
    'Automotive', 'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check customId availability when user types
    if (name === 'customId') {
      setCustomIdStatus("");
      if (value.length >= 3) {
        checkCustomIdAvailability(value);
      }
    }
  };

  const checkCustomIdAvailability = async (customId) => {
    if (!customId || customId.length < 3) return;
    
    setIsCheckingCustomId(true);
    try {
      const response = await api.get(`/shops/check-customid/${customId}`);
      if (response.data.available) {
        setCustomIdStatus("✅ Available");
      } else {
        setCustomIdStatus("❌ " + response.data.message);
      }
    } catch (err) {
      setCustomIdStatus("❌ Error checking availability");
    }
    setIsCheckingCustomId(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/shops", formData);
      
      if (response.data.success) {
        alert(`Shop created successfully! Your shop code is: ${response.data.shop.shopCode}`);
        navigate("/my-shops");
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to create shop. Please try again.");
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h2>Create New Shop</h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {error && <p style={{ color: "red", backgroundColor: "#ffe6e6", padding: "0.5rem", borderRadius: "4px" }}>{error}</p>}
        
        <div>
          <label>Shop Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter shop name"
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>

        <div>
          <label>Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter shop address"
            required
            rows="3"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", resize: "vertical" }}
          />
        </div>

        <div>
          <label>Category *</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          >
            <option value="">Select category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Custom ID (Optional)</label>
          <input
            type="text"
            name="customId"
            value={formData.customId}
            onChange={handleInputChange}
            placeholder="e.g., my_shop_123 (3-20 characters, letters, numbers, underscore only)"
            pattern="[a-zA-Z0-9_]{3,20}"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
          {isCheckingCustomId && <small style={{ color: "blue" }}>Checking availability...</small>}
          {customIdStatus && <small style={{ color: customIdStatus.includes('✅') ? 'green' : 'red' }}>{customIdStatus}</small>}
          <small style={{ display: "block", color: "#666", marginTop: "0.25rem" }}>
            Custom ID allows easy sharing (like Instagram usernames). If not provided, you'll get an auto-generated shop code.
          </small>
        </div>

        <div>
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Brief description of your shop"
            rows="3"
            maxLength="500"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", resize: "vertical" }}
          />
        </div>

        <div>
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Contact phone number"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>

        <div>
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Contact email"
            style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              padding: "0.75rem 1.5rem", 
              backgroundColor: "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Creating..." : "Create Shop"}
          </button>
          
          <button 
            type="button" 
            onClick={() => navigate("/")}
            style={{ 
              padding: "0.75rem 1.5rem", 
              backgroundColor: "#6c757d", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
