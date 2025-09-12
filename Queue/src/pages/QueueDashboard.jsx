import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import useSocket from "../hooks/useSocket";

export default function QueueDashboard() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const { joinRoom, leaveRoom, onQueueUpdate, offQueueUpdate } = useSocket();

  useEffect(() => {
    fetchRoomAndQueue();
    
    // Join socket room for real-time updates
    joinRoom(roomId);
    
    // Listen for queue updates
    onQueueUpdate((data) => {
      console.log('Queue update received:', data);
      fetchRoomAndQueue(); // Refresh data when updates occur
    });

    return () => {
      leaveRoom(roomId);
      offQueueUpdate();
    };
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
        // Create a more elegant notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-white border-l-4 border-blue-500 p-4 rounded-lg shadow-lg z-50 fade-in';
        notification.innerHTML = `
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium text-gray-900">Customer Called!</p>
              <p class="text-sm text-gray-500">${response.data.customer.name} (Queue #${response.data.customer.queueNumber})</p>
            </div>
          </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
        
        fetchRoomAndQueue();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to call next customer");
    }
  };

  const handleCompleteService = async (queueId) => {
    try {
      await api.put(`/queue/complete/${queueId}`);
      fetchRoomAndQueue();
    } catch (err) {
      setError("Failed to complete service");
    }
  };

  const handleMarkNoShow = async (queueId) => {
    if (window.confirm("Mark this customer as no-show?")) {
      try {
        await api.put(`/queue/no-show/${queueId}`);
        fetchRoomAndQueue();
      } catch (err) {
        setError("Failed to mark as no-show");
      }
    }
  };

  const handleClearQueue = async () => {
    if (window.confirm("Are you sure you want to clear the entire queue? This cannot be undone.")) {
      try {
        await api.delete(`/queue/clear/${roomId}`);
        fetchRoomAndQueue();
      } catch (err) {
        setError("Failed to clear queue");
      }
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading queue dashboard...</span>
      </div>
    );
  }

  const waitingCustomers = queue.filter(q => q.status === 'waiting');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--light-blue) 0%, var(--light-teal) 100%)', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header Section */}
        <div className="card mb-6 fade-in">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <div>
                <h1 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>
                  🎯 Queue Dashboard
                </h1>
                {room && (
                  <div style={{ color: 'var(--gray-600)' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                      {room.name} ({room.roomCode})
                    </p>
                    <div className="flex gap-4 items-center">
                      <span className="status-badge status-waiting">
                        👥 {room.currentCount} / {room.maxCapacity} Capacity
                      </span>
                      <span style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>
                        📊 {waitingCustomers.length} Waiting
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => navigate(-1)}
                className="btn btn-ghost"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="card mb-6 fade-in" style={{ borderLeft: '4px solid var(--error)' }}>
            <div className="card-body" style={{ background: '#fef2f2', color: 'var(--error)' }}>
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Current Customer Section */}
        <div className="card mb-8 fade-in">
          <div className="card-header">
            <h2 style={{ color: 'var(--primary-teal)' }}>🔥 Currently Serving</h2>
          </div>
          <div className="card-body">
            {currentCustomer ? (
              <div style={{ 
                background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '2rem',
                border: '2px solid var(--success)'
              }}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ 
                        background: 'var(--success)', 
                        color: 'white', 
                        borderRadius: '50%', 
                        width: '60px', 
                        height: '60px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 'bold'
                      }}>
                        #{currentCustomer.queueNumber}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--gray-900)' }}>
                          {currentCustomer.customerName}
                        </h3>
                        <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                          ⏰ Called at {new Date(currentCustomer.calledAt || Date.now()).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {currentCustomer.priority !== 'normal' && (
                      <span className={`status-badge ${currentCustomer.priority === 'urgent' ? 'status-urgent' : 'status-vip'}`}>
                        {currentCustomer.priority === 'urgent' ? '🚨 URGENT' : '⭐ VIP'}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleCompleteService(currentCustomer.id)}
                      className="btn btn-success"
                    >
                      ✅ Complete Service
                    </button>
                    <button 
                      onClick={() => handleMarkNoShow(currentCustomer.id)}
                      className="btn btn-danger"
                    >
                      ❌ No Show
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ 
                background: 'var(--gray-100)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '3rem',
                textAlign: 'center',
                border: '2px dashed var(--gray-300)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎪</div>
                <h3 style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>No customer currently being served</h3>
                {waitingCustomers.length > 0 && (
                  <button 
                    onClick={handleCallNext}
                    className="btn btn-primary"
                    style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}
                  >
                    📢 Call Next Customer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Queue Controls */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={handleCallNext}
            disabled={waitingCustomers.length === 0}
            className={`btn ${waitingCustomers.length > 0 ? 'btn-primary' : 'btn-ghost'}`}
          >
            📢 Call Next ({waitingCustomers.length})
          </button>
          <button 
            onClick={handleClearQueue}
            disabled={queue.length === 0}
            className={`btn ${queue.length > 0 ? 'btn-danger' : 'btn-ghost'}`}
          >
            🗑️ Clear Queue
          </button>
        </div>

        {/* Waiting Queue */}
        <div className="card fade-in">
          <div className="card-header">
            <h2 style={{ color: 'var(--primary-blue)' }}>
              ⏳ Waiting Queue ({waitingCustomers.length})
            </h2>
          </div>
          <div className="card-body">
            {waitingCustomers.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '3rem',
                color: 'var(--gray-500)'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎭</div>
                <h3>No customers waiting</h3>
                <p>The queue is empty. New customers can join anytime!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {waitingCustomers.map((customer, index) => (
                  <div 
                    key={customer.id}
                    className="card slide-in"
                    style={{ 
                      background: index === 0 ? 'linear-gradient(135deg, var(--light-blue), var(--light-teal))' : 'var(--white)',
                      border: index === 0 ? '2px solid var(--primary-blue)' : '1px solid var(--gray-200)',
                      transform: index === 0 ? 'scale(1.02)' : 'scale(1)'
                    }}
                  >
                    <div className="card-body">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div style={{ 
                            background: index === 0 ? 'var(--primary-blue)' : 'var(--primary-teal)', 
                            color: 'white', 
                            borderRadius: '50%', 
                            width: '50px', 
                            height: '50px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '1.2rem'
                          }}>
                            {customer.position}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                Queue #{customer.queueNumber}
                              </h4>
                              {index === 0 && (
                                <span className="status-badge" style={{ background: 'var(--warning)', color: 'white' }}>
                                  🔥 NEXT
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--gray-900)', marginBottom: '0.5rem' }}>
                              👤 {customer.customerName}
                            </p>
                            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--gray-600)' }}>
                              <span>
                                ⏰ Joined: {new Date(customer.joinedAt).toLocaleTimeString()}
                              </span>
                              {customer.estimatedWaitTime > 0 && (
                                <span>
                                  ⌛ Est. wait: {customer.estimatedWaitTime} min
                                </span>
                              )}
                            </div>
                          </div>
                          {customer.priority !== 'normal' && (
                            <span className={`status-badge ${customer.priority === 'urgent' ? 'status-urgent' : 'status-vip'}`}>
                              {customer.priority === 'urgent' ? '🚨 URGENT' : '⭐ VIP'}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {index === 0 && (
                            <button 
                              onClick={handleCallNext}
                              className="btn btn-success"
                            >
                              📢 Call Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
