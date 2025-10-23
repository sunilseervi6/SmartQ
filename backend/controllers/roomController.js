import Room from "../models/Room.js";
import Shop from "../models/Shop.js";
import Queue from "../models/Queue.js";
import User from "../models/User.js";
import { generateQRCodeDataURL, generateRoomJoinURL } from "../services/qrCodeService.js";

// Create a new room
export const createRoom = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { name, roomType, description, maxCapacity, operatingHours } = req.body;
    const userId = req.user.id;

    // Verify shop ownership
    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found or unauthorized" });
    }

    // Validate required fields
    if (!name || !roomType) {
      return res.status(400).json({ 
        message: "Name and room type are required" 
      });
    }

    // Create room
    const room = await Room.create({
      name,
      shopId,
      roomType,
      description,
      maxCapacity,
      operatingHours
    });

    // Generate QR code data URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = generateRoomJoinURL(room.roomCode, frontendUrl);
    room.qrCodeData = joinUrl;
    await room.save();

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: {
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
        roomType: room.roomType,
        description: room.description,
        maxCapacity: room.maxCapacity,
        operatingHours: room.operatingHours,
        isActive: room.isActive,
        currentQueueCount: room.currentQueueCount,
        qrCodeData: room.qrCodeData,
        createdAt: room.createdAt
      }
    });
  } catch (err) {
    console.error("Room creation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all rooms for a shop
export const getShopRooms = async (req, res) => {
  try {
    const { shopId } = req.params;
    const userId = req.user.id;

    // Verify shop ownership
    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({ message: "Shop not found or unauthorized" });
    }

    const rooms = await Room.find({ shopId, isActive: true })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      rooms: rooms.map(room => ({
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
        roomType: room.roomType,
        description: room.description,
        maxCapacity: room.maxCapacity,
        operatingHours: room.operatingHours,
        isActive: room.isActive,
        currentQueueCount: room.currentQueueCount,
        qrCodeData: room.qrCodeData,
        createdAt: room.createdAt
      }))
    });
  } catch (err) {
    console.error("Get shop rooms error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get room by roomCode (public)
export const getRoomByCode = async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const room = await Room.findOne({ 
      roomCode: roomCode.toUpperCase(), 
      isActive: true 
    }).populate('shopId', 'name address shopCode customId');

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
        roomType: room.roomType,
        description: room.description,
        maxCapacity: room.maxCapacity,
        operatingHours: room.operatingHours,
        currentQueueCount: room.currentQueueCount,
        qrCodeData: room.qrCodeData,
        shop: room.shopId,
        createdAt: room.createdAt
      }
    });
  } catch (err) {
    console.error("Get room error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update room
export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, roomType, description, maxCapacity, operatingHours, isActive } = req.body;
    const userId = req.user.id;

    // Find room and verify ownership through shop
    const room = await Room.findById(roomId).populate('shopId');
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.shopId.owner.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update room
    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      {
        ...(name && { name }),
        ...(roomType && { roomType }),
        ...(description !== undefined && { description }),
        ...(maxCapacity && { maxCapacity }),
        ...(operatingHours && { operatingHours }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Room updated successfully",
      room: {
        id: updatedRoom._id,
        name: updatedRoom.name,
        roomCode: updatedRoom.roomCode,
        roomType: updatedRoom.roomType,
        description: updatedRoom.description,
        maxCapacity: updatedRoom.maxCapacity,
        operatingHours: updatedRoom.operatingHours,
        isActive: updatedRoom.isActive,
        currentQueueCount: updatedRoom.currentQueueCount,
        updatedAt: updatedRoom.updatedAt
      }
    });
  } catch (err) {
    console.error("Update room error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get QR code for room
export const getRoomQRCode = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Generate QR code data URL if not already present
    let qrCodeData = room.qrCodeData;
    if (!qrCodeData) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      qrCodeData = generateRoomJoinURL(room.roomCode, frontendUrl);
      room.qrCodeData = qrCodeData;
      await room.save();
    }

    // Generate QR code image as base64 data URL
    const qrCodeImage = await generateQRCodeDataURL(qrCodeData);

    res.json({
      success: true,
      qrCode: {
        imageDataURL: qrCodeImage,
        joinURL: qrCodeData,
        roomCode: room.roomCode
      }
    });
  } catch (err) {
    console.error("Get QR code error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete room (requires password confirmation)
export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;
    const userId = req.user.id;

    // Validate password is provided
    if (!password) {
      return res.status(400).json({ 
        message: "Password is required to delete the room" 
      });
    }

    // Find user and verify password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: "Incorrect password. Room deletion failed." 
      });
    }

    // Find room and verify ownership through shop
    const room = await Room.findById(roomId).populate('shopId');
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (room.shopId.owner.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Hard delete - remove from database completely
    // First, delete all queues associated with this room
    await Queue.deleteMany({ roomId: roomId });
    
    // Then delete the room itself
    await Room.findByIdAndDelete(roomId);

    res.json({
      success: true,
      message: "Room and associated queues deleted successfully"
    });
  } catch (err) {
    console.error("Delete room error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
