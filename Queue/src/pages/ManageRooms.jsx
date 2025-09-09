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

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post(`/rooms/shop/${shopId}`, formData);
      if (response.data.success) {
        alert(`Room created successfully! Room code: ${response.data.room.roomCode}`);
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
      setError(err.response?.data?.message || "Failed to create room");
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (window.confirm("Are you sure you want to delete this room?")) {
      try {
        await api.delete(`/rooms/${roomId}`);
        setRooms(rooms.filter(room => room.id !== roomId));
        alert("Room deleted successfully");
      } catch (err) {
        setError("Failed to delete room");
      }
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Manage Rooms</h2>
          {shop && <p style={{ color: "#666" }}>Shop: {shop.name}</p>}
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{ 
              padding: "0.75rem 1.5rem", 
              backgroundColor: "#28a745", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            + Create Room
          </button>
          <button 
            onClick={() => navigate("/my-shops")}
            style={{ 
              padding: "0.75rem 1.5rem", 
              backgroundColor: "#6c757d", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Back to Shops
          </button>
        </div>
      </div>

      {error && <p style={{ color: "red", backgroundColor: "#ffe6e6", padding: "0.5rem", borderRadius: "4px" }}>{error}</p>}

      {/* Create Room Form */}
      {showCreateForm && (
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "2rem", 
          borderRadius: "8px", 
          marginBottom: "2rem",
          border: "1px solid #ddd"
        }}>
          <h3>Create New Room</h3>
          <form onSubmit={handleCreateRoom} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label>Room Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Counter 1, Dr. Smith's Office"
                required
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>

            <div>
              <label>Room Type *</label>
              <select
                name="roomType"
                value={formData.roomType}
                onChange={handleInputChange}
                required
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              >
                <option value="">Select type</option>
                {roomTypes.map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Max Capacity</label>
              <input
                type="number"
                name="maxCapacity"
                value={formData.maxCapacity}
                onChange={handleInputChange}
                min="1"
                max="100"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ flex: 1 }}>
                <label>Start Time</label>
                <input
                  type="time"
                  name="operatingHours.start"
                  value={formData.operatingHours.start}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>End Time</label>
                <input
                  type="time"
                  name="operatingHours.end"
                  value={formData.operatingHours.end}
                  onChange={handleInputChange}
                  style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
                />
              </div>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the room"
                rows="2"
                style={{ width: "100%", padding: "0.5rem", marginTop: "0.25rem", resize: "vertical" }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button 
                type="submit"
                style={{ 
                  padding: "0.75rem 1.5rem", 
                  backgroundColor: "#007bff", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Create Room
              </button>
              <button 
                type="button"
                onClick={() => setShowCreateForm(false)}
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
      )}

      {/* Rooms List */}
      {rooms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
          <h3>No rooms yet</h3>
          <p>Create your first room to start managing queues!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))" }}>
          {rooms.map((room) => (
            <div 
              key={room.id} 
              style={{ 
                border: "1px solid #ddd", 
                borderRadius: "8px", 
                padding: "1.5rem",
                backgroundColor: "white",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                <h3 style={{ margin: "0", color: "#333" }}>{room.name}</h3>
                <span 
                  style={{ 
                    backgroundColor: "#e9ecef", 
                    padding: "0.25rem 0.5rem", 
                    borderRadius: "4px", 
                    fontSize: "0.8rem",
                    color: "#495057"
                  }}
                >
                  {room.roomType}
                </span>
              </div>

              <div style={{ marginBottom: "1rem", color: "#666" }}>
                {room.description && <p style={{ margin: "0.5rem 0" }}>{room.description}</p>}
                <p style={{ margin: "0.5rem 0" }}>⏰ {room.operatingHours.start} - {room.operatingHours.end}</p>
                <p style={{ margin: "0.5rem 0" }}>👥 Max: {room.maxCapacity} people</p>
                <p style={{ margin: "0.5rem 0" }}>📊 Current Queue: {room.currentQueueCount}</p>
              </div>

              <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>Room Code:</strong>
                  <code style={{ backgroundColor: "#e9ecef", padding: "0.25rem 0.5rem", borderRadius: "3px" }}>
                    {room.roomCode}
                  </code>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button 
                  onClick={() => navigate(`/queue-dashboard/${room.id}`)}
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
                  Manage Queue
                </button>
                <button 
                  onClick={() => {
                    const shareText = `Join queue at ${room.name}! Room Code: ${room.roomCode}`;
                    navigator.clipboard.writeText(shareText);
                    alert("Room code copied to clipboard!");
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
                <button 
                  onClick={() => handleDeleteRoom(room.id)}
                  style={{ 
                    padding: "0.5rem", 
                    backgroundColor: "#dc3545", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
