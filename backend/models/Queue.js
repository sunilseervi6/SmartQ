import mongoose from "mongoose";

const queueSchema = new mongoose.Schema({
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    required: true 
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  queueNumber: { 
    type: Number, 
    default: 1
  },
  status: { 
    type: String, 
    enum: ['waiting', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'waiting'
  },
  priority: { 
    type: String, 
    enum: ['normal', 'urgent', 'vip'],
    default: 'normal'
  },
  estimatedWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  calledAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  customerName: {
    type: String,
    maxlength: 100
  },
  notes: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Auto-increment queue number per room
queueSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Get the highest queue number for this room today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const lastQueue = await this.constructor.findOne({
        roomId: this.roomId,
        createdAt: { $gte: startOfDay }
      }).sort({ queueNumber: -1 });

      this.queueNumber = lastQueue ? lastQueue.queueNumber + 1 : 1;
      console.log(`Generated queue number ${this.queueNumber} for room ${this.roomId}`);
    } catch (error) {
      console.error('Error generating queue number:', error);
      this.queueNumber = 1; // Fallback to 1 if there's an error
    }
  }
  next();
});

// Update room's current queue count after save
queueSchema.post('save', async function() {
  const Room = mongoose.model('Room');
  const activeCount = await this.constructor.countDocuments({
    roomId: this.roomId,
    status: { $in: ['waiting', 'in_progress'] }
  });
  
  await Room.findByIdAndUpdate(this.roomId, { 
    currentQueueCount: activeCount 
  });
});

// Update room's current queue count after update
queueSchema.post('findOneAndUpdate', async function() {
  if (this.getUpdate().$set && this.getUpdate().$set.status) {
    const Room = mongoose.model('Room');
    const roomId = this.getQuery().roomId || this.getQuery()._id;
    
    if (roomId) {
      const activeCount = await mongoose.model('Queue').countDocuments({
        roomId: roomId,
        status: { $in: ['waiting', 'in_progress'] }
      });
      
      await Room.findByIdAndUpdate(roomId, { 
        currentQueueCount: activeCount 
      });
    }
  }
});

// Indexes for faster queries
queueSchema.index({ roomId: 1, status: 1 });
queueSchema.index({ customerId: 1 });
queueSchema.index({ roomId: 1, queueNumber: 1 });
queueSchema.index({ roomId: 1, createdAt: -1 });

export default mongoose.model("Queue", queueSchema);
