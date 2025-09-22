import express from "express";
import { 
  createShop, 
  getUserShops, 
  getShopByIdentifier, 
  updateShop,
  checkCustomIdAvailability 
} from "../controllers/shopController.js";
import { protect, ownerOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/", protect, ownerOnly, createShop);
router.get("/", protect, ownerOnly, getUserShops);
router.put("/:id", protect, ownerOnly, updateShop);

// Public routes
router.get("/check-customid/:customId", checkCustomIdAvailability);
router.get("/:identifier", getShopByIdentifier);

export default router;
