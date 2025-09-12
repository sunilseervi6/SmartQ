import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function ManageRooms() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    roomType: "",
    description: "",
    maxCapacity: 50,
    operatingHours: {
      start: "09:00",
      end: "17:00"
    }
  });

  const roomTypes = ['counter', 'doctor', 'service', 'consultation', 'other'];

  useEffect(() => {
    fetchShopAndRooms();
  }, [shopId]);

  const fetchShopAndRooms = async () => {
    try {
      // Get shop details
      const shopResponse = await api.get("/shops");
      const currentShop = shopResponse.data.shops.find(s => s.id === shopId);
      setShop(currentShop);

      // Get rooms for this shop
      const roomsResponse = await api.get(`/rooms/shop/${shopId}`);
      if (roomsResponse.data.success) {
        setRooms(roomsResponse.data.rooms);
      }
    } catch (err) {
      setError("Failed to load shop or rooms");
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const response = await api.post(`/rooms/shop/${shopId}`, formData);
      if (response.data.success) {
        showNotification(`🎉 Room created successfully! Room code: ${response.data.room.roomCode}`);
        setRooms([response.data.room, ...rooms]);
        setShowCreateForm(false);
        setFormData({
          name: "",
          roomType: "",
          description: "",
          maxCapacity: 50,
          operatingHours: { start: "09:00", end: "17:00" }
        });
      }
    } catch (err) {
      showNotification(err.response?.data?.message || "Failed to create room", 'error');
    }
    setIsCreating(false);
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        await api.delete(`/rooms/${roomId}`);
        setRooms(rooms.filter(room => room.id !== roomId));
        showNotification("🗑️ Room deleted successfully");
      } catch (err) {
        showNotification("Failed to delete room", 'error');
      }
    }
  };

  const handleShareRoom = (room) => {
    const shareText = `Join queue at ${room.name}! Room Code: ${room.roomCode}`;
    navigator.clipboard.writeText(shareText);
    showNotification("📋 Room code copied to clipboard!");
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading rooms...</p>
    </div>
  );

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
          <div>
            <h1 className="page-title">🏢 Manage Rooms</h1>
            {shop && <p className="page-subtitle">Shop: {shop.name}</p>}
          </div>
          <div className="header-actions">
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn btn-success"
            >
              ➕ Create Room
            </button>
            <button 
              onClick={() => navigate("/my-shops")}
              className="btn btn-secondary"
            >
              ← Back to Shops
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="notification error">
          {error}
        </div>
      )}

      {/* Create Room Form */}
      {showCreateForm && (
        <div className="card form-card slide-in">
          <div className="card-header">
            <h2>🏗️ Create New Room</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateRoom} className="room-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Room Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Counter 1, Dr. Smith's Office"
                    required
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Room Type *</label>
                  <select
                    name="roomType"
                    value={formData.roomType}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  >
                    <option value="">Select type</option>
                    {roomTypes.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Max Capacity</label>
                  <input
                    type="number"
                    name="maxCapacity"
                    value={formData.maxCapacity}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    className="form-input"
                  />
                </div>

                <div className="form-group time-inputs">
                  <label className="form-label">Operating Hours</label>
                  <div className="time-row">
                    <input
                      type="time"
                      name="operatingHours.start"
                      value={formData.operatingHours.start}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                    <span className="time-separator">to</span>
                    <input
                      type="time"
                      name="operatingHours.end"
                      value={formData.operatingHours.end}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the room"
                  rows="2"
                  className="form-input"
                />
              </div>

              <div className="form-actions">
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary"
                >
                  {isCreating ? (
                    <>
                      <div className="loading-spinner small"></div>
                      Creating...
                    </>
                  ) : (
                    '🏗️ Create Room'
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn btn-secondary"
                  disabled={isCreating}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏢</div>
          <h3>No rooms yet</h3>
          <p>Create your first room to start managing queues!</p>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            🏗️ Create First Room
          </button>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room, index) => (
            <div 
              key={room.id} 
              className="card room-card fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="card-header">
                <div className="room-header">
                  <h3 className="room-name">{room.name}</h3>
                  <span className="room-type-badge">
                    {room.roomType}
                  </span>
                </div>
              </div>

              <div className="card-body">
                <div className="room-details">
                  {room.description && (
                    <p className="room-description">{room.description}</p>
                  )}
                  <div className="room-info">
                    <div className="info-item">
                      <span className="info-icon">⏰</span>
                      <span>{room.operatingHours.start} - {room.operatingHours.end}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">👥</span>
                      <span>Max: {room.maxCapacity} people</span>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">📊</span>
                      <span>Current Queue: {room.currentQueueCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="room-code-section">
                  <div className="code-display">
                    <span className="code-label">Room Code:</span>
                    <code className="room-code">{room.roomCode}</code>
                  </div>
                </div>
              </div>

              <div className="card-footer">
                <div className="room-actions">
                  <button 
                    onClick={() => navigate(`/queue-dashboard/${room.id}`)}
                    className="btn btn-primary flex-1"
                  >
                    📊 Manage Queue
                  </button>
                  <button 
                    onClick={() => handleShareRoom(room)}
                    className="btn btn-success flex-1"
                  >
                    📤 Share
                  </button>
                  <button 
                    onClick={() => handleDeleteRoom(room.id)}
                    className="btn btn-danger"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
