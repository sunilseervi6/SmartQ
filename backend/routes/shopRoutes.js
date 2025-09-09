import express from "express";
import { 
  createShop, 
  getUserShops, 
  getShopByIdentifier, 
  updateShop,
  checkCustomIdAvailability 
} from "../controllers/shopController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/", protect, createShop);
router.get("/", protect, getUserShops);
router.put("/:id", protect, updateShop);

// Public routes
router.get("/check-customid/:customId", checkCustomIdAvailability);
router.get("/:identifier", getShopByIdentifier);

export default router;
