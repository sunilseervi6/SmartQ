import Shop from "../models/Shop.js";
import Room from "../models/Room.js";
import Queue from "../models/Queue.js";
import User from "../models/User.js";
import { geocodeAddress, reverseGeocode, isValidCoordinates } from "../services/geocodingService.js";
import { uploadImage, deleteImage, isCloudinaryConfigured } from "../services/cloudinaryService.js";

// Helper Functions
const formatShopResponse = (shop) => ({
  id: shop._id,
  name: shop.name,
  address: shop.address,
  category: shop.category,
  shopCode: shop.shopCode,
  customId: shop.customId,
  description: shop.description,
  phone: shop.phone,
  email: shop.email,
  owner: shop.owner,
  location: shop.location,
  city: shop.city,
  state: shop.state,
  zipCode: shop.zipCode,
  country: shop.country,
  images: shop.images || [],
  createdAt: shop.createdAt,
  updatedAt: shop.updatedAt
});

const validateCustomIdFormat = (customId) => {
  const customIdRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!customIdRegex.test(customId)) {
    return {
      valid: false,
      message: "Custom ID must be 3-20 characters long and contain only letters, numbers, and underscores"
    };
  }
  return { valid: true };
};

const checkCustomIdUniqueness = async (customId, excludeShopId = null) => {
  const query = { customId: customId.toLowerCase() };
  if (excludeShopId) {
    query._id = { $ne: excludeShopId };
  }
  const existingShop = await Shop.findOne(query);
  return {
    available: !existingShop,
    message: existingShop ? "This custom ID is already taken" : "Custom ID is available"
  };
};

// Create a new shop
export const createShop = async (req, res) => {
  try {
    const { name, address, category, customId, description, phone, email, latitude, longitude, city, state, zipCode } = req.body;

    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userId = req.user.id; // from auth middleware

    // Validate required fields
    if (!name || !address || !category) {
      return res.status(400).json({
        message: "Name, address, and category are required"
      });
    }

    // If customId is provided, validate it
    if (customId) {
      // Check format
      const formatCheck = validateCustomIdFormat(customId);
      if (!formatCheck.valid) {
        return res.status(400).json({ message: formatCheck.message });
      }

      // Check uniqueness
      const uniquenessCheck = await checkCustomIdUniqueness(customId);
      if (!uniquenessCheck.available) {
        return res.status(400).json({ message: uniquenessCheck.message });
      }
    }

    // Handle location
    let locationData = {};

    // If latitude and longitude are provided, use them
    if (latitude && longitude && isValidCoordinates(parseFloat(latitude), parseFloat(longitude))) {
      locationData = {
        location: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)] // [lng, lat] format for MongoDB
        },
        city: city || '',
        state: state || '',
        zipCode: zipCode || ''
      };

      // If city not provided, try reverse geocoding
      if (!city) {
        try {
          const reverseGeocoded = await reverseGeocode(parseFloat(latitude), parseFloat(longitude));
          locationData.city = reverseGeocoded.city;
          locationData.state = reverseGeocoded.state;
          locationData.zipCode = reverseGeocoded.zipCode;
        } catch (err) {
          console.log("Reverse geocoding failed:", err.message);
        }
      }
    }
    // Otherwise, try to geocode the address
    else if (address) {
      try {
        const geocoded = await geocodeAddress(address);
        locationData = {
          location: {
            type: 'Point',
            coordinates: [geocoded.lng, geocoded.lat]
          },
          city: city || geocoded.city,
          state: state || geocoded.state,
          zipCode: zipCode || geocoded.zipCode
        };
      } catch (err) {
        console.log("Geocoding failed:", err.message);
        // Continue without location data
      }
    }

    // Create shop
    const shop = await Shop.create({
      name,
      address,
      category,
      customId: customId ? customId.toLowerCase() : undefined,
      description,
      phone,
      email,
      owner: userId,
      ...locationData
    });

    res.status(201).json({
      success: true,
      message: "Shop created successfully",
      shop: formatShopResponse(shop)
    });
  } catch (err) {
    console.error("Shop creation error:", err);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// Get user's shops
export const getUserShops = async (req, res) => {
  try {
    const userId = req.user.id;
    const shops = await Shop.find({ owner: userId, isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      shops: shops.map(shop => formatShopResponse(shop))
    });
  } catch (err) {
    console.error("Get user shops error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get shop by shopCode or customId
export const getShopByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by shopCode first, then by customId
    let shop = await Shop.findOne({ 
      shopCode: identifier.toUpperCase(), 
      isActive: true 
    }).populate('owner', 'name email');
    
    if (!shop) {
      shop = await Shop.findOne({ 
        customId: identifier.toLowerCase(), 
        isActive: true 
      }).populate('owner', 'name email');
    }

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    res.json({
      success: true,
      shop: formatShopResponse(shop)
    });
  } catch (err) {
    console.error("Get shop error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update shop
export const updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, category, customId, description, phone, email } = req.body;
    const userId = req.user.id;

    // Find shop and verify ownership
    const shop = await Shop.findOne({ _id: id, owner: userId });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found or unauthorized" });
    }

    // If customId is being updated, validate it
    if (customId !== undefined && customId && customId !== shop.customId) {
      // Check format
      const formatCheck = validateCustomIdFormat(customId);
      if (!formatCheck.valid) {
        return res.status(400).json({ message: formatCheck.message });
      }

      // Check uniqueness
      const uniquenessCheck = await checkCustomIdUniqueness(customId, id);
      if (!uniquenessCheck.available) {
        return res.status(400).json({ message: uniquenessCheck.message });
      }
    }

    // Update shop
    const updatedShop = await Shop.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(address && { address }),
        ...(category && { category }),
        ...(customId !== undefined && { customId: customId ? customId.toLowerCase() : null }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email })
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Shop updated successfully",
      shop: formatShopResponse(updatedShop)
    });
  } catch (err) {
    console.error("Update shop error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Check customId availability
export const checkCustomIdAvailability = async (req, res) => {
  try {
    const { customId } = req.params;
    const { shopId } = req.query; // Optional, for updates

    // Validate format
    const formatCheck = validateCustomIdFormat(customId);
    if (!formatCheck.valid) {
      return res.json({
        available: false,
        message: formatCheck.message
      });
    }

    // Check availability
    const uniquenessCheck = await checkCustomIdUniqueness(customId, shopId);
    res.json(uniquenessCheck);
  } catch (err) {
    console.error("Check customId availability error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete shop (requires password confirmation)
export const deleteShop = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = req.user.id;

    // Validate password is provided
    if (!password) {
      return res.status(400).json({ 
        message: "Password is required to delete the shop" 
      });
    }

    // Find user and verify password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: "Incorrect password. Shop deletion failed." 
      });
    }

    // Find shop and verify ownership
    const shop = await Shop.findOne({ _id: id, owner: userId });
    if (!shop) {
      return res.status(404).json({ 
        message: "Shop not found or unauthorized" 
      });
    }

    // Get all rooms for this shop
    const rooms = await Room.find({ shopId: id });
    const roomIds = rooms.map(room => room._id);

    // Delete all queues associated with the shop's rooms
    if (roomIds.length > 0) {
      await Queue.deleteMany({ roomId: { $in: roomIds } });
    }

    // Delete all rooms associated with the shop
    await Room.deleteMany({ shopId: id });

    // Remove shop from all users' favorites
    await User.updateMany(
      { 'favorites.itemId': id, 'favorites.itemType': 'shop' },
      { $pull: { favorites: { itemId: id, itemType: 'shop' } } }
    );

    // Remove rooms from all users' favorites
    if (roomIds.length > 0) {
      await User.updateMany(
        { 'favorites.itemId': { $in: roomIds }, 'favorites.itemType': 'room' },
        { $pull: { favorites: { itemId: { $in: roomIds }, itemType: 'room' } } }
      );
    }

    // Delete the shop itself
    await Shop.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Shop, its rooms, and all associated queues deleted successfully"
    });
  } catch (err) {
    console.error("Delete shop error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get nearby shops
export const getNearbyShops = async (req, res) => {
  try {
    const { lat, lng, radius = 10, category, limit = 50 } = req.query;

    // Validate coordinates
    if (!lat || !lng) {
      return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!isValidCoordinates(latitude, longitude)) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    // Build query
    const query = {
      isActive: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: parseFloat(radius) * 1000 // Convert km to meters
        }
      }
    };

    // Add category filter if provided
    if (category) {
      query.category = category;
    }

    // Find nearby shops
    const shops = await Shop.find(query)
      .limit(parseInt(limit))
      .select('-__v');

    // Calculate distance for each shop
    const shopsWithDistance = shops.map(shop => {
      const shopData = formatShopResponse(shop);

      // Calculate distance in km using Haversine formula
      if (shop.location && shop.location.coordinates) {
        const [shopLng, shopLat] = shop.location.coordinates;
        const R = 6371; // Earth's radius in km
        const dLat = (shopLat - latitude) * Math.PI / 180;
        const dLon = (shopLng - longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(latitude * Math.PI / 180) * Math.cos(shopLat * Math.PI / 180) *
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        shopData.distance = parseFloat(distance.toFixed(2));
      }

      return shopData;
    });

    res.json({
      success: true,
      count: shopsWithDistance.length,
      shops: shopsWithDistance
    });
  } catch (err) {
    console.error("Get nearby shops error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Upload shop images
export const uploadShopImages = async (req, res) => {
  try {
    const { shopId } = req.params;
    const userId = req.user.id;

    // Verify shop ownership
    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found or unauthorized" });
    }

    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        message: "Image upload is not configured. Please set up Cloudinary credentials."
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images provided" });
    }

    // Check max images limit (10 per shop)
    const currentImageCount = shop.images ? shop.images.length : 0;
    if (currentImageCount + req.files.length > 10) {
      return res.status(400).json({
        message: `Maximum 10 images allowed. You have ${currentImageCount} images already.`
      });
    }

    // Upload images to Cloudinary
    const uploadPromises = req.files.map(file => uploadImage(file.buffer));
    const uploadedImages = await Promise.all(uploadPromises);

    // Add images to shop
    const newImages = uploadedImages.map((img, index) => ({
      url: img.url,
      publicId: img.publicId,
      thumbnail: img.thumbnail,
      isPrimary: currentImageCount === 0 && index === 0, // First image of first upload is primary
      uploadedAt: new Date()
    }));

    shop.images = [...(shop.images || []), ...newImages];
    await shop.save();

    res.json({
      success: true,
      message: `${newImages.length} image(s) uploaded successfully`,
      images: shop.images
    });
  } catch (err) {
    console.error("Upload shop images error:", err);
    res.status(500).json({ message: err.message || "Failed to upload images" });
  }
};

// Delete shop image
export const deleteShopImage = async (req, res) => {
  try {
    const { shopId, imageId } = req.params;
    const userId = req.user.id;

    // Verify shop ownership
    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found or unauthorized" });
    }

    // Find image
    const imageIndex = shop.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({ message: "Image not found" });
    }

    const image = shop.images[imageIndex];

    // Delete from Cloudinary
    if (isCloudinaryConfigured()) {
      try {
        await deleteImage(image.publicId);
      } catch (err) {
        console.error("Cloudinary deletion error:", err);
        // Continue even if Cloudinary deletion fails
      }
    }

    // Remove image from shop
    shop.images.splice(imageIndex, 1);

    // If deleted image was primary and there are other images, make first one primary
    if (image.isPrimary && shop.images.length > 0) {
      shop.images[0].isPrimary = true;
    }

    await shop.save();

    res.json({
      success: true,
      message: "Image deleted successfully",
      images: shop.images
    });
  } catch (err) {
    console.error("Delete shop image error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Set primary shop image
export const setPrimaryImage = async (req, res) => {
  try {
    const { shopId, imageId } = req.params;
    const userId = req.user.id;

    // Verify shop ownership
    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found or unauthorized" });
    }

    // Find image
    const image = shop.images.find(img => img._id.toString() === imageId);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Set all images to non-primary
    shop.images.forEach(img => {
      img.isPrimary = false;
    });

    // Set selected image as primary
    image.isPrimary = true;

    await shop.save();

    res.json({
      success: true,
      message: "Primary image updated",
      images: shop.images
    });
  } catch (err) {
    console.error("Set primary image error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
