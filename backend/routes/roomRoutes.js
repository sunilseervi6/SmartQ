import express from "express";
import { 
  createRoom, 
  getShopRooms, 
  getRoomByCode, 
  updateRoom,
  deleteRoom 
} from "../controllers/roomController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes (require authentication)
router.post("/shop/:shopId", protect, createRoom);
router.get("/shop/:shopId", protect, getShopRooms);
router.put("/:roomId", protect, updateRoom);
router.delete("/:roomId", protect, deleteRoom);

// Public routes
router.get("/code/:roomCode", getRoomByCode);

export default router;
