import express from "express";
import {
  createRoom,
  getShopRooms,
  getRoomByCode,
  updateRoom,
  deleteRoom,
  getRoomQRCode,
  browseRooms
} from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes (must come before protected routes to avoid conflicts)
router.get("/browse", browseRooms);  // Browse/search rooms with filters
router.get("/code/:roomCode", getRoomByCode);
router.get("/:roomId/qr", getRoomQRCode);  // QR code endpoint

// Protected routes (require authentication)
router.post("/shop/:shopId", protect, createRoom);
router.get("/shop/:shopId", protect, getShopRooms);
router.put("/:roomId", protect, updateRoom);
router.delete("/:roomId", protect, deleteRoom);

export default router;
