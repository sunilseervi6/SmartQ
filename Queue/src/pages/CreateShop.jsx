import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";
import ImageUpload from "../components/ImageUpload";
import LocationPicker from "../components/LocationPicker";

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
  const [location, setLocation] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [error, setError] = useState("");
  const [customIdStatus, setCustomIdStatus] = useState("");
  const [isCheckingCustomId, setIsCheckingCustomId] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Frontend guard: only owners can access this page
    if (!user) {
      navigate("/login", { replace: true });
    } else if (user.role !== 'owner') {
      // Show a lightweight notification and redirect to dashboard
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-white border-l-4 border-yellow-500 p-4 rounded-lg shadow-lg z-50 fade-in';
      notification.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0">⚠️</div>
          <div class="ml-3">
            <p class="text-sm font-medium text-gray-900">Owner access required</p>
            <p class="text-sm text-gray-500">Please register/login as a Shop Owner to create shops.</p>
          </div>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3500);
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

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

  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
  };

  const handleAddressChange = (detectedAddress) => {
    // Auto-populate the address field if it's empty
    if (!formData.address || formData.address.trim() === '') {
      setFormData(prev => ({
        ...prev,
        address: detectedAddress
      }));
    }
  };

  const handleImagesSelected = (images) => {
    setSelectedImages(images);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Create shop data with location
      const shopData = {
        ...formData,
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude
        })
      };

      // Create shop first
      const shopResponse = await api.post("/shops", shopData);

      if (shopResponse.data.success) {
        const shopId = shopResponse.data.shop.id;

        // Upload images if any selected
        if (selectedImages.length > 0) {
          const imageFormData = new FormData();
          selectedImages.forEach((image) => {
            imageFormData.append('images', image);
          });

          try {
            await api.post(`/shops/${shopId}/images`, imageFormData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
          } catch (imgErr) {
            setError(`Shop created but image upload failed: ${imgErr.response?.data?.message || imgErr.message}`);
          }
        }

        // Create success notification
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
              <p class="text-sm font-medium text-gray-900">Shop Created Successfully!</p>
              <p class="text-sm text-gray-500">Shop code: ${shopResponse.data.shop.shopCode}</p>
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--light-blue) 0%, var(--light-teal) 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {/* Header */}
        <div className="card mb-6 fade-in">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <div>
                <h1 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>
                  Create New Shop
                </h1>
                <p style={{ color: 'var(--gray-600)', margin: '0' }}>
                  Set up your shop and start managing queues
                </p>
              </div>
              <button
                onClick={() => navigate("/")}
                className="btn btn-ghost"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="card mb-6 fade-in" style={{ borderLeft: '4px solid var(--error)' }}>
            <div className="card-body" style={{ background: '#fef2f2', color: 'var(--error)' }}>
              <div className="flex items-center gap-2">
                <span>&#9888;</span>
                <span>{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="card fade-in">
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Basic Information */}
              <div>
                <h3 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Basic Information</h3>

                <div className="form-group">
                  <label className="form-label">Shop Name *</label>
                  <input
                    type="text"
                    name="name"
                    className="form-input"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your shop name"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Address *
                    <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginLeft: '0.5rem', fontWeight: 'normal' }}>
                      (Auto-filled from location, editable)
                    </span>
                  </label>
                  <textarea
                    name="address"
                    className="form-input"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your shop address or use location detection below"
                    required
                    rows="3"
                    disabled={loading}
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    name="category"
                    className="form-input"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location Section - NEW! */}
              <div>
                <h3 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Location</h3>
                <LocationPicker
                  onLocationChange={handleLocationChange}
                  onAddressChange={handleAddressChange}
                />
              </div>

              {/* Images Section - NEW! */}
              <div>
                <h3 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Shop Images</h3>
                <ImageUpload onImagesSelected={handleImagesSelected} maxImages={10} />
              </div>

              {/* Custom ID Section */}
              <div>
                <h3 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Shop Identification</h3>

                <div className="form-group">
                  <label className="form-label">Custom ID (Optional)</label>
                  <input
                    type="text"
                    name="customId"
                    className="form-input"
                    value={formData.customId}
                    onChange={handleInputChange}
                    placeholder="e.g., my_shop_123"
                    pattern="[a-zA-Z0-9_]{3,20}"
                    disabled={loading}
                  />
                  <div style={{ marginTop: '0.5rem' }}>
                    {isCheckingCustomId && (
                      <div className="flex items-center gap-2" style={{ color: 'var(--primary-blue)' }}>
                        <div className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0' }}></div>
                        <small>Checking availability...</small>
                      </div>
                    )}
                    {customIdStatus && (
                      <small style={{
                        color: customIdStatus.includes('✅') ? 'var(--success)' : 'var(--error)',
                        fontWeight: '500'
                      }}>
                        {customIdStatus}
                      </small>
                    )}
                  </div>
                  <small style={{
                    display: 'block',
                    color: 'var(--gray-500)',
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem'
                  }}>
                    Custom ID allows easy sharing. Use 3-20 characters with letters, numbers, and underscores only.
                  </small>
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <h3 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Additional Details</h3>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-input"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Brief description of your shop and services"
                    rows="3"
                    maxLength="500"
                    disabled={loading}
                    style={{ resize: 'vertical', minHeight: '80px' }}
                  />
                  <small style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }}>
                    {formData.description.length}/500 characters
                  </small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-input"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Contact phone number"
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      className="form-input"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Contact email address"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end" style={{ marginTop: '2rem' }}>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn btn-ghost"
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0' }}></div>
                      <span>Creating Shop...</span>
                    </div>
                  ) : (
                    <span>Create Shop</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
