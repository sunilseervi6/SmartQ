import Queue from "../models/Queue.js";
import Room from "../models/Room.js";
import Shop from "../models/Shop.js";
import mongoose from "mongoose";

// Join queue (customer)
export const joinQueue = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { customerName, priority, notes } = req.body;
    
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    
    const customerId = req.user.id;

    // Check if room exists and is active
    let room;
    if (mongoose.Types.ObjectId.isValid(roomId)) {
      room = await Room.findOne({ _id: roomId, isActive: true });
    }
    if (!room) {
      room = await Room.findOne({ roomCode: roomId, isActive: true });
    }
    if (!room) {
      return res.status(404).json({ message: "Room not found or inactive" });
    }

    // Check if customer is already in queue for this room
    const existingQueue = await Queue.findOne({
      roomId: room._id,
      customerId,
      status: { $in: ['waiting', 'in_progress'] }
    });

    if (existingQueue) {
      return res.status(400).json({ message: "You are already in this queue" });
    }

    // Check room capacity
    const currentCount = await Queue.countDocuments({
      roomId: room._id,
      status: { $in: ['waiting', 'in_progress'] }
    });

    if (currentCount >= room.maxCapacity) {
      return res.status(400).json({ message: "Queue is full" });
    }

    // Generate queue number manually
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const lastQueue = await Queue.findOne({
      roomId: room._id,
      createdAt: { $gte: startOfDay }
    }).sort({ queueNumber: -1 });

    const queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;

    // Create queue entry
    const queueEntry = await Queue.create({
      roomId: room._id,
      customerId,
      queueNumber,
      priority: priority || 'normal',
      notes
    });

    // Calculate estimated wait time (5 minutes per person ahead)
    const peopleAhead = await Queue.countDocuments({
      roomId: room._id,
      status: 'waiting',
      queueNumber: { $lt: queueEntry.queueNumber }
    });

    const estimatedWaitTime = peopleAhead * 5; // 5 minutes per person
    await Queue.findByIdAndUpdate(queueEntry._id, { estimatedWaitTime });

    res.status(201).json({
      success: true,
      message: "Successfully joined the queue",
      queue: {
        id: queueEntry._id,
        queueNumber: queueEntry.queueNumber,
        position: peopleAhead + 1,
        estimatedWaitTime,
        status: queueEntry.status,
        joinedAt: queueEntry.joinedAt
      }
    });
  } catch (err) {
    console.error("Join queue error:", err);
    console.error("Error details:", err.message);
    console.error("Stack trace:", err.stack);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Leave queue (customer)
export const leaveQueue = async (req, res) => {
  try {
    const { queueId } = req.params;
    const customerId = req.user.id;

    const queueEntry = await Queue.findOne({
      _id: queueId,
      customerId,
      status: { $in: ['waiting', 'in_progress'] }
    });

    if (!queueEntry) {
      return res.status(404).json({ message: "Queue entry not found" });
    }

    await Queue.findByIdAndUpdate(queueId, { 
      status: 'cancelled',
      completedAt: new Date()
    });

    res.json({
      success: true,
      message: "Successfully left the queue"
    });
  } catch (err) {
    console.error("Leave queue error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get room queue (public)
export const getRoomQueue = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Try to find room by ID first, then by roomCode
    let room;
    if (mongoose.Types.ObjectId.isValid(roomId)) {
      room = await Room.findOne({ _id: roomId, isActive: true });
    }
    if (!room) {
      room = await Room.findOne({ roomCode: roomId, isActive: true });
    }
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const queue = await Queue.find({
      roomId: room._id,
      status: { $in: ['waiting', 'in_progress'] }
    })
    .populate('customerId', 'name')
    .sort({ queueNumber: 1 });

    res.json({
      success: true,
      room: {
        id: room._id,
        name: room.name,
        roomCode: room.roomCode,
        roomType: room.roomType,
        description: room.description,
        operatingHours: room.operatingHours,
        currentCount: queue.length,
        maxCapacity: room.maxCapacity
      },
      queue: queue.map((entry, index) => ({
        id: entry._id,
        queueNumber: entry.queueNumber,
        position: index + 1,
        customerId: entry.customerId._id,
        customerName: entry.customerId.name,
        status: entry.status,
        priority: entry.priority,
        estimatedWaitTime: entry.estimatedWaitTime,
        joinedAt: entry.joinedAt
      }))
    });
  } catch (err) {
    console.error("Get room queue error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Call next customer (admin)
export const callNextCustomer = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify room ownership
    let room;
    if (mongoose.Types.ObjectId.isValid(roomId)) {
      room = await Room.findById(roomId).populate('shopId');
    }
    if (!room) {
      room = await Room.findOne({ roomCode: roomId }).populate('shopId');
    }
    if (!room || room.shopId.owner.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Find next waiting customer
    const nextCustomer = await Queue.findOne({
      roomId: room._id,
      status: 'waiting'
    })
    .populate('customerId', 'name email')
    .sort({ priority: -1, queueNumber: 1 }); // VIP first, then by queue number

    if (!nextCustomer) {
      return res.status(404).json({ message: "No customers waiting" });
    }

    // Update status to in_progress
    await Queue.findByIdAndUpdate(nextCustomer._id, {
      status: 'in_progress',
      calledAt: new Date()
    });

    res.json({
      success: true,
      message: "Customer called successfully",
      customer: {
        id: nextCustomer._id,
        queueNumber: nextCustomer.queueNumber,
        name: nextCustomer.customerId.name,
        email: nextCustomer.customerId.email,
        priority: nextCustomer.priority,
        joinedAt: nextCustomer.joinedAt,
        notes: nextCustomer.notes
      }
    });
  } catch (err) {
    console.error("Call next customer error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Complete service (admin)
export const completeService = async (req, res) => {
  try {
    const { queueId } = req.params;
    const userId = req.user.id;

    const queueEntry = await Queue.findById(queueId).populate({
      path: 'roomId',
      populate: { path: 'shopId' }
    });

    if (!queueEntry || queueEntry.roomId.shopId.owner.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Queue.findByIdAndUpdate(queueId, {
      status: 'completed',
      completedAt: new Date()
    });

    res.json({
      success: true,
      message: "Service completed successfully"
    });
  } catch (err) {
    console.error("Complete service error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark as no-show (admin)
export const markNoShow = async (req, res) => {
  try {
    const { queueId } = req.params;
    const userId = req.user.id;

    const queueEntry = await Queue.findById(queueId).populate({
      path: 'roomId',
      populate: { path: 'shopId' }
    });

    if (!queueEntry || queueEntry.roomId.shopId.owner.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Queue.findByIdAndUpdate(queueId, {
      status: 'no_show',
      completedAt: new Date()
    });

    res.json({
      success: true,
      message: "Marked as no-show"
    });
  } catch (err) {
    console.error("Mark no-show error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Clear queue (admin)
export const clearQueue = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify room ownership
    let room;
    if (mongoose.Types.ObjectId.isValid(roomId)) {
      room = await Room.findById(roomId).populate('shopId');
    }
    if (!room) {
      room = await Room.findOne({ roomCode: roomId }).populate('shopId');
    }
    if (!room || room.shopId.owner.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Update all waiting customers to cancelled
    await Queue.updateMany(
      { roomId: room._id, status: { $in: ['waiting', 'in_progress'] } },
      { 
        status: 'cancelled',
        completedAt: new Date()
      }
    );

    res.json({
      success: true,
      message: "Queue cleared successfully"
    });
  } catch (err) {
    console.error("Clear queue error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get customer's queue status
export const getMyQueueStatus = async (req, res) => {
  try {
    const customerId = req.user.id;

    const myQueues = await Queue.find({
      customerId,
      status: { $in: ['waiting', 'in_progress'] }
    })
    .populate('roomId', 'name roomCode shopId')
    .populate({
      path: 'roomId',
      populate: { path: 'shopId', select: 'name' }
    })
    .sort({ joinedAt: -1 });

    const queueStatus = await Promise.all(myQueues.map(async (queue) => {
      // Calculate current position
      const position = await Queue.countDocuments({
        roomId: queue.roomId._id,
        status: 'waiting',
        queueNumber: { $lt: queue.queueNumber }
      }) + 1;

      return {
        id: queue._id,
        queueNumber: queue.queueNumber,
        position,
        status: queue.status,
        estimatedWaitTime: (position - 1) * 5, // Update estimated time
        joinedAt: queue.joinedAt,
        room: {
          name: queue.roomId.name,
          roomCode: queue.roomId.roomCode,
          shop: queue.roomId.shopId.name
        }
      };
    }));

    res.json({
      success: true,
      queues: queueStatus
    });
  } catch (err) {
    console.error("Get my queue status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
