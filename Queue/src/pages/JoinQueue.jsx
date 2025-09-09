import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function JoinQueue() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [room, setRoom] = useState(null);
  const [queue, setQueue] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myQueueStatus, setMyQueueStatus] = useState(null);

  useEffect(() => {
    // Get customer name from localStorage if available
    const savedName = localStorage.getItem("customerName");
    if (savedName) {
      setCustomerName(savedName);
    }
  }, []);

  const handleSearchRoom = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/queue/room/${roomCode}`);
      if (response.data.success) {
        setRoom(response.data.room);
        setQueue(response.data.queue);
        
        // Check if current user is already in queue
        const userId = localStorage.getItem("userId");
        const existingQueue = response.data.queue.find(q => 
          q.customerId === userId && 
          ['waiting', 'in_progress'].includes(q.status)
        );
        setMyQueueStatus(existingQueue);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Room not found");
      setRoom(null);
      setQueue([]);
    }
    setLoading(false);
  };

  const handleJoinQueue = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Save customer name for future use
      localStorage.setItem("customerName", customerName);
      
      const response = await api.post(`/queue/join/${room.id}`, {
        customerName: customerName.trim(),
        priority
      });
      
      if (response.data.success) {
        setSuccess(`Successfully joined queue! Your queue number is #${response.data.queue.queueNumber}`);
        setMyQueueStatus(response.data.queue);
        // Refresh room data
        handleSearchRoom({ preventDefault: () => {} });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join queue");
    }
    setLoading(false);
  };

  const handleLeaveQueue = async () => {
    if (!window.confirm("Are you sure you want to leave the queue?")) return;

    try {
      await api.delete(`/queue/leave/${myQueueStatus.id}`);
      setSuccess("Successfully left the queue");
      setMyQueueStatus(null);
      // Refresh room data
      handleSearchRoom({ preventDefault: () => {} });
    } catch (err) {
      setError("Failed to leave queue");
    }
  };

  const getQueuePosition = () => {
    if (!myQueueStatus || !queue.length) return null;
    const waitingQueue = queue.filter(q => q.status === 'waiting');
    const position = waitingQueue.findIndex(q => q.id === myQueueStatus.id);
    return position >= 0 ? position + 1 : null;
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2>Join Queue</h2>
        <button 
          onClick={() => navigate("/dashboard")}
          style={{ 
            padding: "0.75rem 1.5rem", 
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

      {error && <p style={{ color: "red", backgroundColor: "#ffe6e6", padding: "0.5rem", borderRadius: "4px", marginBottom: "1rem" }}>{error}</p>}
      {success && <p style={{ color: "green", backgroundColor: "#e6ffe6", padding: "0.5rem", borderRadius: "4px", marginBottom: "1rem" }}>{success}</p>}

      {/* Search Room */}
      <div style={{ 
        backgroundColor: "#f8f9fa", 
        padding: "2rem", 
        borderRadius: "8px", 
        marginBottom: "2rem",
        border: "1px solid #ddd"
      }}>
        <h3>Find Room</h3>
        <form onSubmit={handleSearchRoom} style={{ display: "flex", gap: "1rem", alignItems: "end" }}>
          <div style={{ flex: 1 }}>
            <label>Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter room code (e.g., RM-ABC123)"
              style={{ width: "100%", padding: "0.75rem", marginTop: "0.25rem", fontSize: "1rem" }}
            />
          </div>
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
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {/* Room Info */}
      {room && (
        <div style={{ 
          border: "1px solid #ddd", 
          borderRadius: "8px", 
          padding: "2rem",
          backgroundColor: "white",
          marginBottom: "2rem"
        }}>
          <h3>{room.name}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <p><strong>Room Type:</strong> {room.roomType}</p>
              <p><strong>Operating Hours:</strong> {room.operatingHours ? `${room.operatingHours.start} - ${room.operatingHours.end}` : 'Not specified'}</p>
            </div>
            <div>
              <p><strong>Current Queue:</strong> {room.currentCount} / {room.maxCapacity}</p>
              <p><strong>Room Code:</strong> <code>{room.roomCode}</code></p>
            </div>
          </div>
          {room.description && <p style={{ color: "#666", fontStyle: "italic" }}>{room.description}</p>}
        </div>
      )}

      {/* My Queue Status */}
      {myQueueStatus && (
        <div style={{ 
          backgroundColor: myQueueStatus.status === 'in_progress' ? "#d4edda" : "#d1ecf1", 
          border: `1px solid ${myQueueStatus.status === 'in_progress' ? "#c3e6cb" : "#bee5eb"}`, 
          borderRadius: "8px", 
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <h3>Your Queue Status</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p><strong>Queue Number:</strong> #{myQueueStatus.queueNumber}</p>
              <p><strong>Status:</strong> {myQueueStatus.status === 'in_progress' ? 'Being Served' : 'Waiting'}</p>
              {myQueueStatus.status === 'waiting' && (
                <p><strong>Position:</strong> {getQueuePosition()} in line</p>
              )}
              {myQueueStatus.estimatedWaitTime > 0 && (
                <p><strong>Estimated Wait:</strong> {myQueueStatus.estimatedWaitTime} minutes</p>
              )}
            </div>
            {myQueueStatus.status === 'waiting' && (
              <button 
                onClick={handleLeaveQueue}
                style={{ 
                  padding: "0.75rem 1.5rem", 
                  backgroundColor: "#dc3545", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Leave Queue
              </button>
            )}
          </div>
        </div>
      )}

      {/* Join Queue Form */}
      {room && !myQueueStatus && (
        <div style={{ 
          backgroundColor: "#f8f9fa", 
          padding: "2rem", 
          borderRadius: "8px", 
          marginBottom: "2rem",
          border: "1px solid #ddd"
        }}>
          <h3>Join Queue</h3>
          <form onSubmit={handleJoinQueue} style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label>Your Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                required
                style={{ width: "100%", padding: "0.75rem", marginTop: "0.25rem" }}
              />
            </div>

            <div>
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: "100%", padding: "0.75rem", marginTop: "0.25rem" }}
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="vip">VIP</option>
              </select>
            </div>

            <button 
              type="submit"
              disabled={loading || room.currentCount >= room.maxCapacity}
              style={{ 
                padding: "1rem 2rem", 
                backgroundColor: room.currentCount >= room.maxCapacity ? "#6c757d" : "#28a745", 
                color: "white", 
                border: "none", 
                borderRadius: "4px",
                cursor: room.currentCount >= room.maxCapacity ? "not-allowed" : "pointer",
                fontSize: "1.1rem",
                fontWeight: "bold"
              }}
            >
              {room.currentCount >= room.maxCapacity ? "Queue Full" : loading ? "Joining..." : "Join Queue"}
            </button>
          </form>
        </div>
      )}

      {/* Current Queue Display */}
      {room && queue.length > 0 && (
        <div>
          <h3>Current Queue ({queue.filter(q => q.status === 'waiting').length} waiting)</h3>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {queue
              .filter(q => ['waiting', 'in_progress'].includes(q.status))
              .sort((a, b) => a.queueNumber - b.queueNumber)
              .map((customer, index) => (
                <div 
                  key={customer.id}
                  style={{ 
                    border: "1px solid #ddd", 
                    borderRadius: "4px", 
                    padding: "1rem",
                    backgroundColor: customer.status === 'in_progress' ? "#d4edda" : "white",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ 
                      backgroundColor: customer.status === 'in_progress' ? "#28a745" : "#007bff", 
                      color: "white", 
                      borderRadius: "50%", 
                      width: "30px", 
                      height: "30px", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: "0.9rem",
                      fontWeight: "bold"
                    }}>
                      {customer.queueNumber}
                    </div>
                    <div>
                      <strong>{customer.customerName}</strong>
                      {customer.status === 'in_progress' && (
                        <span style={{ 
                          marginLeft: "0.5rem",
                          backgroundColor: "#28a745",
                          color: "white",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.8rem"
                        }}>
                          Being Served
                        </span>
                      )}
                      {customer.priority !== 'normal' && (
                        <span style={{ 
                          marginLeft: "0.5rem",
                          backgroundColor: customer.priority === 'urgent' ? '#dc3545' : '#6f42c1',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}>
                          {customer.priority.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
