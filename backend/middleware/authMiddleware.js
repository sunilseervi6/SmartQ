import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (err) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

const ownerOnly = (req, res, next) => {
  console.log("ownerOnly middleware - User:", req.user);
  console.log("ownerOnly middleware - User role:", req.user?.role);
  
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized" });
  }
  if (req.user.role !== 'owner') {
    return res.status(403).json({ 
      message: "Owner access required", 
      userRole: req.user.role,
      debug: "User role is not 'owner'"
    });
  }
  next();
};

export { protect, ownerOnly };
export default protect;
