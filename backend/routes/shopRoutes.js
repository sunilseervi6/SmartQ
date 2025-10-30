import express from "express";
import {
  createShop,
  getUserShops,
  getShopByIdentifier,
  updateShop,
  deleteShop,
  checkCustomIdAvailability,
  getNearbyShops,
  uploadShopImages,
  deleteShopImage,
  setPrimaryImage
} from "../controllers/shopController.js";
import { protect, ownerOnly } from "../middleware/authMiddleware.js";
import { upload } from "../services/cloudinaryService.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/", protect, ownerOnly, createShop);
router.get("/", protect, ownerOnly, getUserShops);
router.put("/:id", protect, ownerOnly, updateShop);
router.delete("/:id", protect, ownerOnly, deleteShop);

// Image upload routes
router.post("/:shopId/images", protect, ownerOnly, upload.array('images', 10), uploadShopImages);
router.delete("/:shopId/images/:imageId", protect, ownerOnly, deleteShopImage);
router.put("/:shopId/images/:imageId/primary", protect, ownerOnly, setPrimaryImage);

// Public routes
router.get("/nearby", getNearbyShops); // Get shops near a location
router.get("/check-customid/:customId", checkCustomIdAvailability);
router.get("/:identifier", getShopByIdentifier);

export default router;
