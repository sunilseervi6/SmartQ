import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function QueueDashboard() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentCustomer, setCurrentCustomer] = useState(null);

  useEffect(() => {
    fetchRoomAndQueue();
    // Set up polling for real-time updates
    const interval = setInterval(fetchRoomAndQueue, 3000);
    return () => clearInterval(interval);
  }, [roomId]);

  const fetchRoomAndQueue = async () => {
    try {
      const response = await api.get(`/queue/room/${roomId}`);
      if (response.data.success) {
        setRoom(response.data.room);
        setQueue(response.data.queue);
        setCurrentCustomer(response.data.queue.find(q => q.status === 'in_progress'));
      }
    } catch (err) {
      setError("Failed to load queue data");
    }
    setLoading(false);
  };

  const handleCallNext = async () => {
    try {
      const response = await api.post(`/queue/call-next/${roomId}`);
      if (response.data.success) {
        alert(`Called: ${response.data.customer.name} (Queue #${response.data.customer.queueNumber})`);
        fetchRoomAndQueue();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to call next customer");
    }
  };

  const handleCompleteService = async (queueId) => {
    try {
      await api.put(`/queue/complete/${queueId}`);
      alert("Service completed successfully");
      fetchRoomAndQueue();
    } catch (err) {
      alert("Failed to complete service");
    }
  };

  const handleMarkNoShow = async (queueId) => {
    if (window.confirm("Mark this customer as no-show?")) {
      try {
        await api.put(`/queue/no-show/${queueId}`);
        alert("Marked as no-show");
        fetchRoomAndQueue();
      } catch (err) {
        alert("Failed to mark as no-show");
      }
    }
  };

  const handleClearQueue = async () => {
    if (window.confirm("Are you sure you want to clear the entire queue? This cannot be undone.")) {
      try {
        await api.delete(`/queue/clear/${roomId}`);
        alert("Queue cleared successfully");
        fetchRoomAndQueue();
      } catch (err) {
        alert("Failed to clear queue");
      }
    }
  };

  if (loading) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;

  const waitingCustomers = queue.filter(q => q.status === 'waiting');

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h2>Queue Dashboard</h2>
          {room && (
            <div style={{ color: "#666" }}>
              <p>{room.name} ({room.roomCode})</p>
              <p>Current Queue: {room.currentCount} / {room.maxCapacity}</p>
            </div>
          )}
        </div>
        <button 
          onClick={() => navigate(-1)}
          style={{ 
            padding: "0.75rem 1.5rem", 
            backgroundColor: "#6c757d", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Back
        </button>
      </div>

      {error && <p style={{ color: "red", backgroundColor: "#ffe6e6", padding: "0.5rem", borderRadius: "4px" }}>{error}</p>}

      {/* Current Customer */}
      <div style={{ marginBottom: "2rem" }}>
        <h3>Currently Serving</h3>
        {currentCustomer ? (
          <div style={{ 
            backgroundColor: "#d4edda", 
            border: "1px solid #c3e6cb", 
            borderRadius: "8px", 
            padding: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <h4 style={{ margin: "0 0 0.5rem 0" }}>Queue #{currentCustomer.queueNumber}</h4>
              <p style={{ margin: "0", fontSize: "1.1rem" }}><strong>{currentCustomer.customerName}</strong></p>
              {currentCustomer.priority !== 'normal' && (
                <span style={{ 
                  backgroundColor: currentCustomer.priority === 'urgent' ? '#dc3545' : '#6f42c1',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  marginTop: '0.5rem',
                  display: 'inline-block'
                }}>
                  {currentCustomer.priority.toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                onClick={() => handleCompleteService(currentCustomer.id)}
                style={{ 
                  padding: "0.75rem 1.5rem", 
                  backgroundColor: "#28a745", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                Complete Service
              </button>
              <button 
                onClick={() => handleMarkNoShow(currentCustomer.id)}
                style={{ 
                  padding: "0.75rem 1.5rem", 
                  backgroundColor: "#dc3545", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer"
                }}
              >
                No Show
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            backgroundColor: "#f8f9fa", 
            border: "1px solid #dee2e6", 
            borderRadius: "8px", 
            padding: "2rem",
            textAlign: "center",
            color: "#6c757d"
          }}>
            <p>No customer currently being served</p>
            {waitingCustomers.length > 0 && (
              <button 
                onClick={handleCallNext}
                style={{ 
                  padding: "0.75rem 2rem", 
                  backgroundColor: "#007bff", 
                  color: "white", 
                  border: "none", 
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  fontWeight: "bold"
                }}
              >
                Call Next Customer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Queue Controls */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
        <button 
          onClick={handleCallNext}
          disabled={waitingCustomers.length === 0}
          style={{ 
            padding: "0.75rem 1.5rem", 
            backgroundColor: waitingCustomers.length > 0 ? "#007bff" : "#6c757d", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            cursor: waitingCustomers.length > 0 ? "pointer" : "not-allowed"
          }}
        >
          Call Next ({waitingCustomers.length})
        </button>
        <button 
          onClick={handleClearQueue}
          disabled={queue.length === 0}
          style={{ 
            padding: "0.75rem 1.5rem", 
            backgroundColor: queue.length > 0 ? "#dc3545" : "#6c757d", 
            color: "white", 
            border: "none", 
            borderRadius: "4px",
            cursor: queue.length > 0 ? "pointer" : "not-allowed"
          }}
        >
          Clear Queue
        </button>
      </div>

      {/* Waiting Queue */}
      <div>
        <h3>Waiting Queue ({waitingCustomers.length})</h3>
        {waitingCustomers.length === 0 ? (
          <div style={{ 
            backgroundColor: "#f8f9fa", 
            border: "1px solid #dee2e6", 
            borderRadius: "8px", 
            padding: "2rem",
            textAlign: "center",
            color: "#6c757d"
          }}>
            <p>No customers waiting</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {waitingCustomers.map((customer, index) => (
              <div 
                key={customer.id}
                style={{ 
                  border: "1px solid #ddd", 
                  borderRadius: "8px", 
                  padding: "1rem",
                  backgroundColor: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ 
                    backgroundColor: "#007bff", 
                    color: "white", 
                    borderRadius: "50%", 
                    width: "40px", 
                    height: "40px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center",
                    fontWeight: "bold"
                  }}>
                    {customer.position}
                  </div>
                  <div>
                    <h4 style={{ margin: "0 0 0.25rem 0" }}>Queue #{customer.queueNumber}</h4>
                    <p style={{ margin: "0", fontSize: "1.1rem" }}><strong>{customer.customerName}</strong></p>
                    <small style={{ color: "#666" }}>
                      Joined: {new Date(customer.joinedAt).toLocaleTimeString()}
                      {customer.estimatedWaitTime > 0 && ` • Est. wait: ${customer.estimatedWaitTime} min`}
                    </small>
                  </div>
                  {customer.priority !== 'normal' && (
                    <span style={{ 
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
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {index === 0 && (
                    <button 
                      onClick={handleCallNext}
                      style={{ 
                        padding: "0.5rem 1rem", 
                        backgroundColor: "#28a745", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "4px",
                        cursor: "pointer"
                      }}
                    >
                      Call Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
