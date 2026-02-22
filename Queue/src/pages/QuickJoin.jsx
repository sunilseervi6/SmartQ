import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import QRScanner from "../components/QRScanner";
import useSocket from "../hooks/useSocket";

export default function QuickJoin() {
  const navigate = useNavigate();
  const { joinRoom, leaveRoom, onQueueUpdate, offQueueUpdate } = useSocket();
  const [searchParams] = useSearchParams();
  const roomCodeFromURL = searchParams.get("room");

  const [roomCode, setRoomCode] = useState(roomCodeFromURL || "");
  const [room, setRoom] = useState(null);
  const [queue, setQueue] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myQueueStatus, setMyQueueStatus] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  // Use ref for roomCode so socket callback always has current value
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  // Fetch queue data for a given code
  const fetchQueueData = useCallback(async (code) => {
    if (!code || !code.trim()) return;
    try {
      const response = await api.get(`/queue/room/${code}`);
      if (response.data.success) {
        setRoom(response.data.room);
        setQueue(response.data.queue);

        // Check if current user is already in queue
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = user.id;
        const existingQueue = response.data.queue.find(q =>
          q.customerId === userId &&
          ['waiting', 'in_progress'].includes(q.status)
        );
        setMyQueueStatus(existingQueue || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Room not found");
      setRoom(null);
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    // Get customer name from localStorage if available
    const savedName = localStorage.getItem("customerName");
    if (savedName) {
      setCustomerName(savedName);
    }

    // Auto-search if room code is in URL
    if (roomCodeFromURL) {
      setLoading(true);
      fetchQueueData(roomCodeFromURL).finally(() => setLoading(false));
    }
  }, [roomCodeFromURL, fetchQueueData]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (room && room.id) {
      joinRoom(room.id);

      onQueueUpdate(() => {
        // Use ref to get current roomCode (avoids stale closure)
        fetchQueueData(roomCodeRef.current);
      });

      return () => {
        leaveRoom(room.id);
        offQueueUpdate();
      };
    }
  }, [room?.id, joinRoom, leaveRoom, onQueueUpdate, offQueueUpdate, fetchQueueData]);

  const handleSearchRoom = async (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setLoading(true);
    setError("");
    try {
      await fetchQueueData(roomCode);
    } catch {
      // Error already handled inside fetchQueueData
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
        customerName: customerName.trim()
      });

      if (response.data.success) {
        setSuccess(`Successfully joined queue! Your queue number is #${response.data.queue.queueNumber}`);
        setMyQueueStatus(response.data.queue);
        // Refresh room data
        await fetchQueueData(roomCode);
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
      await fetchQueueData(roomCode);
    } catch (err) {
      setError("Failed to leave queue");
    }
  };

  const isWithinOperatingHours = () => {
    if (!room || !room.operatingHours || !room.operatingHours.start || !room.operatingHours.end) {
      return true;
    }
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = room.operatingHours.start.split(':').map(Number);
    const [endH, endM] = room.operatingHours.end.split(':').map(Number);
    return currentMinutes >= startH * 60 + startM && currentMinutes < endH * 60 + endM;
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
    roomCodeRef.current = scannedRoomCode;
    // Automatically search for the room
    setLoading(true);
    setError("");
    fetchQueueData(scannedRoomCode).finally(() => setLoading(false));
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
                onClick={() => navigate("/")}
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

        {/* Room & Shop Info */}
        {room && (
          <div className="card mb-6 fade-in">
            <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--light-blue), var(--light-teal))' }}>
              <h2 style={{ color: 'var(--primary-blue)', margin: '0' }}>{room.name}</h2>
              {room.shop && (
                <p style={{ color: 'var(--gray-600)', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                  at {room.shop.name}
                </p>
              )}
            </div>
            <div className="card-body">
              {/* Shop Images Gallery */}
              {room.shop && room.shop.images && room.shop.images.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: room.shop.images.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    maxHeight: room.shop.images.length === 1 ? '400px' : '250px'
                  }}>
                    {room.shop.images
                      .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
                      .slice(0, 4)
                      .map((image, index) => (
                        <div
                          key={index}
                          style={{
                            position: 'relative',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            border: '2px solid var(--gray-200)',
                            height: room.shop.images.length === 1 ? '400px' : '200px'
                          }}
                        >
                          <img
                            src={image.url}
                            alt={`${room.shop.name} - Image ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          {image.isPrimary && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '0.5rem',
                                left: '0.5rem',
                                background: 'var(--primary-teal)',
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontWeight: '600'
                              }}
                            >
                              Primary
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  {room.shop.images.length > 4 && (
                    <p style={{
                      textAlign: 'center',
                      color: 'var(--gray-500)',
                      fontSize: '0.875rem',
                      marginTop: '0.5rem'
                    }}>
                      +{room.shop.images.length - 4} more images
                    </p>
                  )}
                </div>
              )}

              {/* Shop Information */}
              {room.shop && (
                <div style={{
                  padding: '1.5rem',
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ color: 'var(--primary-teal)', marginBottom: '1rem' }}>Shop Information</h4>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {room.shop.address && (
                      <div className="flex items-start gap-2">
                        <div>
                          <strong style={{ color: 'var(--gray-700)' }}>Address:</strong>
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-600)' }}>
                            {room.shop.address}
                          </p>
                          {(room.shop.city || room.shop.state) && (
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-500)', fontSize: '0.875rem' }}>
                              {[room.shop.city, room.shop.state, room.shop.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {room.shop.category && (
                      <div className="flex items-center gap-2">
                        <span><strong>Category:</strong> {room.shop.category}</span>
                      </div>
                    )}
                    {room.shop.phone && (
                      <div className="flex items-center gap-2">
                        <span><strong>Phone:</strong> {room.shop.phone}</span>
                      </div>
                    )}
                    {room.shop.email && (
                      <div className="flex items-center gap-2">
                        <span><strong>Email:</strong> {room.shop.email}</span>
                      </div>
                    )}
                    {room.shop.description && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <p style={{ color: 'var(--gray-600)', fontStyle: 'italic', margin: '0' }}>
                          {room.shop.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Room Details */}
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

                {!isWithinOperatingHours() && (
                  <div style={{
                    padding: '1rem',
                    background: '#fef2f2',
                    border: '1px solid var(--error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--error)',
                    textAlign: 'center'
                  }}>
                    Queue is currently closed. Operating hours: {room.operatingHours.start} - {room.operatingHours.end}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || room.currentCount >= room.maxCapacity || !isWithinOperatingHours()}
                  className={`btn ${(room.currentCount >= room.maxCapacity || !isWithinOperatingHours()) ? 'btn-ghost' : 'btn-success'}`}
                  style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}
                >
                  {!isWithinOperatingHours() ? (
                    <span>Queue Closed</span>
                  ) : room.currentCount >= room.maxCapacity ? (
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
