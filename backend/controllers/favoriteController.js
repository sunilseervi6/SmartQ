import User from "../models/User.js";
import Shop from "../models/Shop.js";
import Room from "../models/Room.js";

// Add shop to favorites
export const addShopToFavorites = async (req, res) => {
  try {
    const { shopId } = req.params;
    const userId = req.user.id;

    // Check if shop exists
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Check if already favorited
    const user = await User.findById(userId);
    const alreadyFavorited = user.favorites.some(
      fav => fav.itemType === 'shop' && fav.itemId.toString() === shopId
    );

    if (alreadyFavorited) {
      return res.status(400).json({ message: "Shop already in favorites" });
    }

    // Add to favorites
    user.favorites.push({
      itemType: 'shop',
      itemId: shopId,
      itemModel: 'Shop'
    });
    await user.save();

    res.json({
      success: true,
      message: "Shop added to favorites",
      favorites: user.favorites
    });
  } catch (err) {
    console.error("Add shop to favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Add room to favorites
export const addRoomToFavorites = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Check if already favorited
    const user = await User.findById(userId);
    const alreadyFavorited = user.favorites.some(
      fav => fav.itemType === 'room' && fav.itemId.toString() === roomId
    );

    if (alreadyFavorited) {
      return res.status(400).json({ message: "Room already in favorites" });
    }

    // Add to favorites
    user.favorites.push({
      itemType: 'room',
      itemId: roomId,
      itemModel: 'Room'
    });
    await user.save();

    res.json({
      success: true,
      message: "Room added to favorites",
      favorites: user.favorites
    });
  } catch (err) {
    console.error("Add room to favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove shop from favorites
export const removeShopFromFavorites = async (req, res) => {
  try {
    const { shopId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    user.favorites = user.favorites.filter(
      fav => !(fav.itemType === 'shop' && fav.itemId.toString() === shopId)
    );
    await user.save();

    res.json({
      success: true,
      message: "Shop removed from favorites",
      favorites: user.favorites
    });
  } catch (err) {
    console.error("Remove shop from favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Remove room from favorites
export const removeRoomFromFavorites = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    user.favorites = user.favorites.filter(
      fav => !(fav.itemType === 'room' && fav.itemId.toString() === roomId)
    );
    await user.save();

    res.json({
      success: true,
      message: "Room removed from favorites",
      favorites: user.favorites
    });
  } catch (err) {
    console.error("Remove room from favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all favorites with populated details
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate({
      path: 'favorites.itemId'
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Separate shops and rooms, filter out null (deleted items)
    const favoriteShops = user.favorites
      .filter(fav => fav.itemType === 'shop' && fav.itemId)
      .map(fav => ({
        ...fav.itemId.toObject(),
        favoritedAt: fav.addedAt
      }));

    const favoriteRooms = await Promise.all(
      user.favorites
        .filter(fav => fav.itemType === 'room' && fav.itemId)
        .map(async (fav) => {
          const room = fav.itemId;
          // Populate shopId for room
          await room.populate('shopId');
          return {
            ...room.toObject(),
            favoritedAt: fav.addedAt
          };
        })
    );

    res.json({
      success: true,
      favorites: {
        shops: favoriteShops,
        rooms: favoriteRooms
      }
    });
  } catch (err) {
    console.error("Get favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Check if item is favorited
export const checkFavoriteStatus = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const isFavorited = user.favorites.some(
      fav => fav.itemType === itemType && fav.itemId.toString() === itemId
    );

    res.json({
      success: true,
      isFavorited
    });
  } catch (err) {
    console.error("Check favorite status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
