import express from 'express';
import { reverseGeocode, geocodeAddress, isValidCoordinates } from '../services/geocodingService.js';

const router = express.Router();

/**
 * POST /api/geocoding/reverse
 * Convert coordinates to human-readable address
 * Body: { lat: number, lng: number }
 */
router.post('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    // Validate inputs
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates provided'
      });
    }

    // Perform reverse geocoding
    const result = await reverseGeocode(latitude, longitude);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reverse geocode location'
    });
  }
});

/**
 * POST /api/geocoding/forward
 * Convert address to coordinates
 * Body: { address: string }
 */
router.post('/forward', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    // Perform geocoding
    const result = await geocodeAddress(address.trim());

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to geocode address'
    });
  }
});

export default router;
