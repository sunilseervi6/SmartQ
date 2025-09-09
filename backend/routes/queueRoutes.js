import express from "express";
import { 
  joinQueue, 
  leaveQueue, 
  getRoomQueue, 
  callNextCustomer,
  completeService,
  markNoShow,
  clearQueue,
  getMyQueueStatus
} from "../controllers/queueController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Customer routes (require authentication)
router.post("/join/:roomId", protect, joinQueue);
router.delete("/leave/:queueId", protect, leaveQueue);
router.get("/my-status", protect, getMyQueueStatus);

// Admin routes (require authentication)
router.post("/call-next/:roomId", protect, callNextCustomer);
router.put("/complete/:queueId", protect, completeService);
router.put("/no-show/:queueId", protect, markNoShow);
router.delete("/clear/:roomId", protect, clearQueue);

// Public routes
router.get("/room/:roomId", getRoomQueue);

export default router;
