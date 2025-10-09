import Shop from "../models/Shop.js";
import Room from "../models/Room.js";
import Queue from "../models/Queue.js";
import User from "../models/User.js";

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
    console.log("Shop creation request received");
    console.log("Request body:", req.body);
    console.log("User from middleware:", req.user);
    
    const { name, address, category, customId, description, phone, email } = req.body;
    
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

    // Create shop
    const shop = await Shop.create({
      name,
      address,
      category,
      customId: customId ? customId.toLowerCase() : undefined,
      description,
      phone,
      email,
      owner: userId
    });

    res.status(201).json({
      success: true,
      message: "Shop created successfully",
      shop: formatShopResponse(shop)
    });
  } catch (err) {
    console.error("Shop creation error:", err);
    console.error("Error stack:", err.stack);
    console.error("Request body:", req.body);
    console.error("User ID:", req.user?.id);
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
    console.log("Getting shops for user ID:", userId);
    console.log("User object:", req.user);
    
    const shops = await Shop.find({ owner: userId, isActive: true })
      .sort({ createdAt: -1 });
      
    console.log("Found shops:", shops.length);
    console.log("Shop owners:", shops.map(s => ({ name: s.name, owner: s.owner })));

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
