import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import QRScanner from "../components/QRScanner";

export default function QuickJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomCodeFromURL = searchParams.get("room");

  const [roomCode, setRoomCode] = useState(roomCodeFromURL || "");
  const [room, setRoom] = useState(null);
  const [queue, setQueue] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myQueueStatus, setMyQueueStatus] = useState(null);
  const [autoSearched, setAutoSearched] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    // Get customer name from localStorage if available
    const savedName = localStorage.getItem("customerName");
    if (savedName) {
      setCustomerName(savedName);
    }

    // Auto-search if room code is in URL and haven't searched yet
    if (roomCodeFromURL && !autoSearched) {
      setAutoSearched(true);
      handleSearchRoom({ preventDefault: () => {} });
    }
  }, [roomCodeFromURL, autoSearched]);

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

  const handleScanSuccess = (scannedRoomCode) => {
    setShowScanner(false);
    setRoomCode(scannedRoomCode);
    // Automatically search for the room
    setTimeout(() => {
      handleSearchRoom({ preventDefault: () => {} });
    }, 100);
  };

  const handleScanClose = () => {
    setShowScanner(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--light-blue) 0%, var(--light-teal) 100%)',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div className="card mb-6 fade-in">
          <div className="card-header">
            <div className="flex justify-between items-center">
              <div>
                <h1 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem' }}>
                  Join Queue
                </h1>
                <p style={{ color: 'var(--gray-600)', margin: '0' }}>
                  {roomCodeFromURL ? `Quick join via QR code` : `Find and join queues at your favorite shops`}
                </p>
              </div>
              <button
                onClick={() => navigate("/dashboard")}
                className="btn btn-ghost"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
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

        {success && (
          <div className="card mb-6 fade-in" style={{ borderLeft: '4px solid var(--success)' }}>
            <div className="card-body" style={{ background: '#f0fdf4', color: 'var(--success)' }}>
              <div className="flex items-center gap-2">
                <span>&#10003;</span>
                <span>{success}</span>
              </div>
            </div>
          </div>
        )}

        {/* Search Room */}
        <div className="card mb-6 fade-in">
          <div className="card-header">
            <h2 style={{ color: 'var(--primary-teal)', margin: '0' }}>Find Room</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSearchRoom} className="flex gap-4 items-end">
              <div style={{ flex: 1 }}>
                <label className="form-label">Room Code</label>
                <input
                  type="text"
                  className="form-input"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Enter room code (e.g., RM-ABC123)"
                  disabled={loading}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="btn btn-success"
                disabled={loading}
              >
                <span>📷</span>
                <span>Scan QR</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`btn ${loading ? 'btn-ghost' : 'btn-primary'}`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0' }}></div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <span>Search</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Room Info */}
        {room && (
          <div className="card mb-6 fade-in">
            <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--light-blue), var(--light-teal))' }}>
              <h2 style={{ color: 'var(--primary-blue)', margin: '0' }}>{room.name}</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                <div>
                  <h4 style={{ color: 'var(--gray-700)', marginBottom: '1rem' }}>Room Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="flex items-center gap-2">
                      <span><strong>Type:</strong> {room.roomType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span><strong>Hours:</strong> {room.operatingHours ? `${room.operatingHours.start} - ${room.operatingHours.end}` : 'Not specified'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={{ color: 'var(--gray-700)', marginBottom: '1rem' }}>Queue Status</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div className="flex items-center gap-2">
                      <span><strong>Capacity:</strong> {room.currentCount} / {room.maxCapacity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span><strong>Code:</strong> <code style={{ background: 'var(--gray-100)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>{room.roomCode}</code></span>
                    </div>
                  </div>
                </div>
              </div>
              {room.description && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ color: 'var(--gray-600)', fontStyle: 'italic', margin: '0' }}>
                    {room.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Queue Status */}
        {myQueueStatus && (
          <div className="card mb-6 fade-in">
            <div className="card-header" style={{
              background: myQueueStatus.status === 'in_progress'
                ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                : 'linear-gradient(135deg, var(--light-blue), var(--light-teal))'
            }}>
              <h2 style={{ color: myQueueStatus.status === 'in_progress' ? 'var(--success)' : 'var(--primary-blue)', margin: '0' }}>
                {myQueueStatus.status === 'in_progress' ? 'You\'re Being Served!' : 'Your Queue Status'}
              </h2>
            </div>
            <div className="card-body">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <div style={{
                      background: myQueueStatus.status === 'in_progress' ? 'var(--success)' : 'var(--primary-blue)',
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
                      #{myQueueStatus.queueNumber}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                        Queue Number #{myQueueStatus.queueNumber}
                      </h3>
                      <div className="flex items-center gap-4">
                        <span className={`status-badge ${myQueueStatus.status === 'in_progress' ? 'status-in-progress' : 'status-waiting'}`}>
                          {myQueueStatus.status === 'in_progress' ? 'Being Served' : 'Waiting'}
                        </span>
                        {myQueueStatus.status === 'waiting' && getQueuePosition() && (
                          <span style={{ color: 'var(--gray-600)' }}>
                            Position {getQueuePosition()} in line
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {myQueueStatus.estimatedWaitTime > 0 && (
                    <p style={{ color: 'var(--gray-600)', margin: '0' }}>
                      Estimated wait: {myQueueStatus.estimatedWaitTime} minutes
                    </p>
                  )}
                </div>
                {myQueueStatus.status === 'waiting' && (
                  <button
                    onClick={handleLeaveQueue}
                    className="btn btn-danger"
                  >
                    Leave Queue
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Join Queue Form */}
        {room && !myQueueStatus && (
          <div className="card mb-6 fade-in">
            <div className="card-header">
              <h2 style={{ color: 'var(--primary-teal)', margin: '0' }}>Join Queue</h2>
            </div>
            <div className="card-body">
              <form onSubmit={handleJoinQueue} style={{ display: 'grid', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select
                    className="form-input"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    disabled={loading}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || room.currentCount >= room.maxCapacity}
                  className={`btn ${room.currentCount >= room.maxCapacity ? 'btn-ghost' : 'btn-success'}`}
                  style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}
                >
                  {room.currentCount >= room.maxCapacity ? (
                    <span>Queue Full</span>
                  ) : loading ? (
                    <div className="flex items-center gap-2">
                      <div className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0' }}></div>
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <span>Join Queue</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Current Queue Display */}
        {room && queue.length > 0 && (
          <div className="card fade-in">
            <div className="card-header">
              <h2 style={{ color: 'var(--primary-blue)', margin: '0' }}>
                Current Queue ({queue.filter(q => q.status === 'waiting').length} waiting)
              </h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gap: '1rem' }}>
                {queue
                  .filter(q => ['waiting', 'in_progress'].includes(q.status))
                  .sort((a, b) => a.queueNumber - b.queueNumber)
                  .map((customer, index) => (
                    <div
                      key={customer.id}
                      className="card slide-in"
                      style={{
                        background: customer.status === 'in_progress'
                          ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                          : 'var(--white)',
                        border: customer.status === 'in_progress'
                          ? '2px solid var(--success)'
                          : '1px solid var(--gray-200)'
                      }}
                    >
                      <div className="card-body">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div style={{
                              background: customer.status === 'in_progress' ? 'var(--success)' : 'var(--primary-teal)',
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
                              {customer.queueNumber}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                                {customer.customerName}
                              </h4>
                              <div className="flex items-center gap-2">
                                {customer.status === 'in_progress' && (
                                  <span className="status-badge status-in-progress">
                                    Being Served
                                  </span>
                                )}
                                {customer.priority !== 'normal' && (
                                  <span className={`status-badge ${customer.priority === 'urgent' ? 'status-urgent' : 'status-vip'}`}>
                                    {customer.priority === 'urgent' ? 'URGENT' : 'VIP'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* QR Scanner Modal */}
        {showScanner && (
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onClose={handleScanClose}
          />
        )}
      </div>
    </div>
  );
}
