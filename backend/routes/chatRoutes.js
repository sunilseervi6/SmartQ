import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { chat } from "../controllers/chatController.js";
import chatRateLimiter from "../middleware/rateLimiter.js";

const router = express.Router();

// Optional auth — attaches req.user if token present, but doesn't reject unauthenticated requests
const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch {
      // Token invalid/expired — proceed without user context
    }
  }
  next();
};

router.post("/", optionalAuth, chatRateLimiter(20, 60000), chat);

export default router;
