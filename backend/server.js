import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"], // frontend
  credentials: true
}));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/queue", queueRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
