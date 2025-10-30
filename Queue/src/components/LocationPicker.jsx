import { useState, useEffect } from 'react';
import api from '../api/axios';

/**
 * LocationPicker Component
 * Automatically captures user's current location when creating shop
 * Falls back to manual entry if location permission denied
 * Includes reverse geocoding to show human-readable address
 */
export default function LocationPicker({ onLocationChange, onAddressChange, initialLocation = null }) {
  const [location, setLocation] = useState(initialLocation);
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reverseGeocodingLoading, setReverseGeocodingLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Auto-capture location on component mount
  useEffect(() => {
    if (!initialLocation) {
      captureCurrentLocation();
    }
  }, []);

  // Reverse geocode coordinates to get human-readable address
  const reverseGeocodeLocation = async (lat, lng) => {
    setReverseGeocodingLoading(true);
    try {
      const response = await api.post('/geocoding/reverse', {
        lat,
        lng
      });

      if (response.data.success) {
        const addressData = response.data.data;
        setAddress(addressData);

        // Pass the formatted address back to parent if callback provided
        if (onAddressChange) {
          onAddressChange(addressData.address);
        }
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      // Don't show error to user, just log it
    } finally {
      setReverseGeocodingLoading(false);
    }
  };

  const captureCurrentLocation = () => {
    setLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setPermissionDenied(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };

        setLocation(newLocation);
        setPermissionDenied(false);
        onLocationChange(newLocation);

        // Automatically reverse geocode to get address
        reverseGeocodeLocation(newLocation.latitude, newLocation.longitude);

        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Location permission denied. You can enter coordinates manually.');
            setPermissionDenied(true);
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Location information unavailable.');
            break;
          case error.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('An unknown error occurred.');
        }

        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleManualChange = (field, value) => {
    const newLocation = {
      ...location,
      [field]: parseFloat(value) || ''
    };

    setLocation(newLocation);

    // Only send valid coordinates and reverse geocode
    if (newLocation.latitude && newLocation.longitude) {
      onLocationChange(newLocation);
      // Trigger reverse geocoding when both coordinates are available
      reverseGeocodeLocation(newLocation.latitude, newLocation.longitude);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <label className="form-label">
        Shop Location
        <span style={{ fontSize: '0.875rem', color: 'var(--gray-500)', marginLeft: '0.5rem' }}>
          (Auto-detected or enter manually)
        </span>
      </label>

      {/* Auto-detect button */}
      {!loading && (
        <button
          type="button"
          onClick={captureCurrentLocation}
          className="btn btn-primary"
          style={{ marginBottom: '1rem', width: '100%' }}
        >
          {location ? 'Update Location' : 'Use My Current Location'}
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{
          padding: '1rem',
          background: 'var(--light-blue)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          <div className="spinner" style={{ margin: '0 auto 0.5rem auto' }}></div>
          <p style={{ margin: 0, color: 'var(--primary-blue)' }}>
            Detecting your location...
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          padding: '1rem',
          background: '#fef2f2',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          color: 'var(--error)'
        }}>
          {error}
        </div>
      )}

      {/* Location display / manual entry */}
      {(location || permissionDenied) && (
        <div style={{
          padding: '1rem',
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--gray-200)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--gray-700)',
                marginBottom: '0.25rem',
                display: 'block'
              }}>
                Latitude
              </label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={location?.latitude || ''}
                onChange={(e) => handleManualChange('latitude', e.target.value)}
                placeholder="e.g., 28.6139"
                style={{ fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'var(--gray-700)',
                marginBottom: '0.25rem',
                display: 'block'
              }}>
                Longitude
              </label>
              <input
                type="number"
                step="any"
                className="form-input"
                value={location?.longitude || ''}
                onChange={(e) => handleManualChange('longitude', e.target.value)}
                placeholder="e.g., 77.2090"
                style={{ fontSize: '0.875rem' }}
              />
            </div>
          </div>

          {location?.latitude && location?.longitude && (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{
                fontSize: '0.75rem',
                color: 'var(--success)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>✓</span>
                <span>
                  Location set: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  {location.accuracy && ` (±${Math.round(location.accuracy)}m)`}
                </span>
              </p>

              {/* Human-readable address */}
              {reverseGeocodingLoading && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'var(--light-blue)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  color: 'var(--primary-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', marginRight: '0' }}></div>
                  <span>Finding address...</span>
                </div>
              )}

              {!reverseGeocodingLoading && address && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  background: 'var(--gray-50)',
                  border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: '0.25rem' }}>
                    📍 Detected Address:
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--gray-700)', fontWeight: '500' }}>
                    {address.address}
                  </div>
                  {(address.city || address.state || address.country) && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                      {[address.city, address.state, address.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p style={{
        fontSize: '0.75rem',
        color: 'var(--gray-500)',
        marginTop: '0.5rem',
        margin: '0.5rem 0 0 0'
      }}>
        Location helps customers find your shop on the map. It's optional but recommended.
      </p>
    </div>
  );
}
