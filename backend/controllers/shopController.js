import Shop from "../models/Shop.js";

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
      const customIdRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!customIdRegex.test(customId)) {
        return res.status(400).json({ 
          message: "Custom ID must be 3-20 characters long and contain only letters, numbers, and underscores" 
        });
      }

      // Check uniqueness (case-insensitive)
      const existingShop = await Shop.findOne({ 
        customId: customId.toLowerCase() 
      });
      if (existingShop) {
        return res.status(400).json({ 
          message: "This custom ID is already taken" 
        });
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
      shop: {
        id: shop._id,
        name: shop.name,
        address: shop.address,
        category: shop.category,
        shopCode: shop.shopCode,
        customId: shop.customId,
        description: shop.description,
        phone: shop.phone,
        email: shop.email,
        createdAt: shop.createdAt
      }
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
    
    const shops = await Shop.find({ owner: userId, isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      shops: shops.map(shop => ({
        id: shop._id,
        name: shop.name,
        address: shop.address,
        category: shop.category,
        shopCode: shop.shopCode,
        customId: shop.customId,
        description: shop.description,
        phone: shop.phone,
        email: shop.email,
        createdAt: shop.createdAt
      }))
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
      shop: {
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
        createdAt: shop.createdAt
      }
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
    if (customId !== undefined) {
      if (customId && customId !== shop.customId) {
        // Check format
        const customIdRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!customIdRegex.test(customId)) {
          return res.status(400).json({ 
            message: "Custom ID must be 3-20 characters long and contain only letters, numbers, and underscores" 
          });
        }

        // Check uniqueness
        const existingShop = await Shop.findOne({ 
          customId: customId.toLowerCase(),
          _id: { $ne: id }
        });
        if (existingShop) {
          return res.status(400).json({ 
            message: "This custom ID is already taken" 
          });
        }
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
      shop: {
        id: updatedShop._id,
        name: updatedShop.name,
        address: updatedShop.address,
        category: updatedShop.category,
        shopCode: updatedShop.shopCode,
        customId: updatedShop.customId,
        description: updatedShop.description,
        phone: updatedShop.phone,
        email: updatedShop.email,
        updatedAt: updatedShop.updatedAt
      }
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
    const customIdRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!customIdRegex.test(customId)) {
      return res.json({
        available: false,
        message: "Custom ID must be 3-20 characters long and contain only letters, numbers, and underscores"
      });
    }

    // Check availability
    const query = { customId: customId.toLowerCase() };
    if (shopId) {
      query._id = { $ne: shopId };
    }

    const existingShop = await Shop.findOne(query);
    
    res.json({
      available: !existingShop,
      message: existingShop ? "This custom ID is already taken" : "Custom ID is available"
    });
  } catch (err) {
    console.error("Check customId availability error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
