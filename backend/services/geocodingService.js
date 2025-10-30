import axios from 'axios';

/**
 * Geocoding service using Nominatim (OpenStreetMap) - 100% FREE
 * No API key required!
 * Rate limit: 1 request per second (we add delay automatically)
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

// Rate limiting: Store last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

/**
 * Sleep function for rate limiting
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ensure we don't exceed rate limits
 */
const ensureRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
};

/**
 * Convert address to coordinates (geocoding)
 * @param {string} address - Full address string
 * @returns {Promise<{lat: number, lng: number, displayName: string}>}
 */
export const geocodeAddress = async (address) => {
  try {
    await ensureRateLimit();

    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        addressdetails: 1,
        limit: 1
      },
      headers: {
        'User-Agent': 'SmartQ-QueueManagement/1.0' // Required by Nominatim
      }
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Address not found');
    }

    const result = response.data[0];

    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || '',
      state: result.address?.state || '',
      country: result.address?.country || '',
      zipCode: result.address?.postcode || ''
    };
  } catch (error) {
    console.error('Geocoding error:', error.message);
    throw new Error(`Failed to geocode address: ${error.message}`);
  }
};

/**
 * Convert coordinates to address (reverse geocoding)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{address: string, city: string, state: string, country: string}>}
 */
export const reverseGeocode = async (lat, lng) => {
  try {
    await ensureRateLimit();

    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon: lng,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'SmartQ-QueueManagement/1.0'
      }
    });

    if (!response.data) {
      throw new Error('Location not found');
    }

    const result = response.data;

    return {
      address: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || '',
      state: result.address?.state || '',
      country: result.address?.country || '',
      zipCode: result.address?.postcode || ''
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    throw new Error(`Failed to reverse geocode: ${error.message}`);
  }
};

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean}
 */
export const isValidCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};
