import express from "express";
import {
  addShopToFavorites,
  addRoomToFavorites,
  removeShopFromFavorites,
  removeRoomFromFavorites,
  getFavorites,
  checkFavoriteStatus
} from "../controllers/favoriteController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all favorites
router.get("/", getFavorites);

// Check if specific item is favorited
router.get("/check/:itemType/:itemId", checkFavoriteStatus);

// Shop favorites
router.post("/shop/:shopId", addShopToFavorites);
router.delete("/shop/:shopId", removeShopFromFavorites);

// Room favorites
router.post("/room/:roomId", addRoomToFavorites);
router.delete("/room/:roomId", removeRoomFromFavorites);

export default router;
