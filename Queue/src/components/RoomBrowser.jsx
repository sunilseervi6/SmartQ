import { useState, useEffect } from 'react';
import api from '../api/axios';

/**
 * RoomBrowser Component
 * Allows users to discover and browse nearby rooms/queues
 * Features: location-based search, category filter, text search
 */
export default function RoomBrowser({ onRoomSelect }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState('5');
  const [category, setCategory] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  const categories = [
    'All',
    'Restaurant',
    'Retail',
    'Services',
    'Electronics',
    'Grocery',
    'Fashion',
    'Healthcare',
    'Beauty',
    'Automotive',
    'Other'
  ];

  const radiusOptions = [
    { value: '1', label: '1 km' },
    { value: '5', label: '5 km' },
    { value: '10', label: '10 km' },
    { value: '25', label: '25 km' },
    { value: '50', label: '50 km' }
  ];

  // Auto-load nearby rooms on component mount
  useEffect(() => {
    detectLocation();
  }, []);

  const detectLocation = () => {
    setLocationLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      searchRooms(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setUserLocation(location);
        setLocationLoading(false);
        searchRooms(location);
      },
      (error) => {
        console.error('Location error:', error);
        setError('Unable to detect location. Showing all available rooms.');
        setLocationLoading(false);
        searchRooms(null);
      }
    );
  };

  const searchRooms = async (location = userLocation) => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();

      if (location) {
        params.append('lat', location.latitude);
        params.append('lng', location.longitude);
        params.append('radius', radius);
      }

      if (category && category.toLowerCase() !== 'all') {
        params.append('category', category);
      }

      if (searchText.trim()) {
        params.append('search', searchText.trim());
      }

      const response = await api.get(`/rooms/browse?${params.toString()}`);

      if (response.data.success) {
        setRooms(response.data.rooms);
      }
    } catch (err) {
      console.error('Browse rooms error:', err);
      setError(err.response?.data?.message || 'Failed to load rooms');
      setRooms([]);
    }

    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchRooms();
  };

  const handleJoinRoom = (roomCode) => {
    if (onRoomSelect) {
      onRoomSelect(roomCode);
    }
  };

  return (
    <div>
      {/* Search Filters */}
      <div className="card mb-6">
        <div className="card-header">
          <h3 style={{ color: 'var(--primary-teal)', margin: '0' }}>Search Filters</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Location Detection */}
              <div>
                <label className="form-label">Your Location</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={locationLoading}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {locationLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0' }}></div>
                        <span>Detecting...</span>
                      </div>
                    ) : userLocation ? (
                      <>
                        <span>📍</span>
                        <span>Update Location</span>
                      </>
                    ) : (
                      <>
                        <span>📍</span>
                        <span>Detect My Location</span>
                      </>
                    )}
                  </button>
                  {userLocation && (
                    <div style={{
                      flex: 2,
                      padding: '0.5rem 1rem',
                      background: 'var(--gray-50)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      color: 'var(--gray-600)'
                    }}>
                      <span>✓ Location detected</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {/* Radius Filter */}
                <div className="form-group">
                  <label className="form-label">Search Radius</label>
                  <select
                    className="form-input"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    disabled={!userLocation}
                  >
                    {radiusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text Search */}
              <div className="form-group">
                <label className="form-label">Search by Shop Name or Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="e.g., Coffee Shop, Main Street..."
                />
              </div>

              {/* Search Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-success"
                style={{ fontSize: '1rem', padding: '0.75rem 2rem' }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0' }}></div>
                    <span>Searching...</span>
                  </div>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Search Rooms</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card mb-6" style={{ borderLeft: '4px solid var(--error)' }}>
          <div className="card-body" style={{ background: '#fef2f2', color: 'var(--error)' }}>
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && rooms.length === 0 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '3rem', margin: '0 0 1rem 0' }}>🔍</p>
            <h3 style={{ color: 'var(--gray-600)', margin: '0 0 0.5rem 0' }}>No rooms found</h3>
            <p style={{ color: 'var(--gray-500)', margin: '0' }}>
              Try adjusting your search filters or increasing the search radius
            </p>
          </div>
        </div>
      )}

      {!loading && rooms.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ color: 'var(--primary-blue)', margin: '0' }}>
              Available Rooms ({rooms.length})
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="card"
                  style={{
                    border: '2px solid var(--gray-200)',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-teal)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gray-200)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="card-body">
                    <div style={{ display: 'grid', gridTemplateColumns: room.shop.images && room.shop.images.length > 0 ? '200px 1fr auto' : '1fr auto', gap: '1.5rem', alignItems: 'start' }}>
                      {/* Shop Image */}
                      {room.shop.images && room.shop.images.length > 0 && (
                        <div style={{
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          border: '2px solid var(--gray-200)',
                          height: '150px'
                        }}>
                          <img
                            src={room.shop.images.find(img => img.isPrimary)?.url || room.shop.images[0].url}
                            alt={room.shop.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      )}

                      {/* Room & Shop Info */}
                      <div>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--primary-blue)' }}>
                          {room.name}
                        </h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--gray-600)', margin: '0 0 0.75rem 0' }}>
                          at <strong>{room.shop.name}</strong>
                        </p>

                        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          {room.shop.address && (
                            <div className="flex items-start gap-2">
                              <span style={{ fontSize: '1rem' }}>📍</span>
                              <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                                {room.shop.address}
                                {room.distance !== null && (
                                  <span style={{ color: 'var(--primary-teal)', marginLeft: '0.5rem', fontWeight: '600' }}>
                                    ({room.distance} km away)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-4" style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                            <span>🏢 {room.roomType}</span>
                            <span>🏷️ {room.shop.category}</span>
                            <span className={room.currentQueueCount >= room.maxCapacity ? 'text-error' : 'text-success'}>
                              👥 {room.currentQueueCount}/{room.maxCapacity} in queue
                            </span>
                          </div>

                          {room.operatingHours && (
                            <div className="flex items-center gap-2" style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                              <span>🕒</span>
                              <span>{room.operatingHours.start} - {room.operatingHours.end}</span>
                            </div>
                          )}
                        </div>

                        {room.description && (
                          <p style={{ fontSize: '0.875rem', color: 'var(--gray-500)', fontStyle: 'italic', margin: '0' }}>
                            {room.description}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '150px' }}>
                        <button
                          onClick={() => handleJoinRoom(room.roomCode)}
                          disabled={room.currentQueueCount >= room.maxCapacity}
                          className={`btn ${room.currentQueueCount >= room.maxCapacity ? 'btn-ghost' : 'btn-primary'}`}
                          style={{ width: '100%' }}
                        >
                          {room.currentQueueCount >= room.maxCapacity ? (
                            <>
                              <span>🚫</span>
                              <span>Full</span>
                            </>
                          ) : (
                            <>
                              <span>🎯</span>
                              <span>Join Queue</span>
                            </>
                          )}
                        </button>
                        <div style={{
                          textAlign: 'center',
                          fontSize: '0.75rem',
                          color: 'var(--gray-500)',
                          padding: '0.25rem'
                        }}>
                          Code: <code style={{ background: 'var(--gray-100)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                            {room.roomCode}
                          </code>
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
    </div>
  );
}
