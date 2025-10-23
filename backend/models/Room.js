import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  roomCode: { 
    type: String, 
    unique: true,
    match: /^RM-[A-Z0-9]{6}$/
  },
  shopId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shop', 
    required: true 
  },
  roomType: { 
    type: String, 
    required: true,
    enum: ['counter', 'doctor', 'service', 'consultation', 'other']
  },
  description: {
    type: String,
    maxlength: 300
  },
  maxCapacity: {
    type: Number,
    min: 1,
    max: 100,
    default: 50
  },
  isActive: {
    type: Boolean,
    default: true
  },
  operatingHours: {
    start: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: "09:00"
    },
    end: {
      type: String,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: "17:00"
    }
  },
  currentQueueCount: {
    type: Number,
    default: 0
  },
  qrCodeData: {
    type: String  // Stores the data/URL encoded in QR code
  }
}, {
  timestamps: true
});

// Generate unique roomCode before validation
roomSchema.pre('validate', async function(next) {
  if (!this.roomCode) {
    let isUnique = false;
    let roomCode;
    
    while (!isUnique) {
      // Generate RM-XXXXXX format (exactly 6 characters)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomChars = '';
      for (let i = 0; i < 6; i++) {
        randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      roomCode = `RM-${randomChars}`;
      
      // Check if this roomCode already exists
      const existingRoom = await this.constructor.findOne({ roomCode });
      if (!existingRoom) {
        isUnique = true;
      }
    }
    
    this.roomCode = roomCode;
  }
  next();
});

// Index for faster queries
roomSchema.index({ shopId: 1 });
roomSchema.index({ shopId: 1, isActive: 1 });

export default mongoose.model("Room", roomSchema);
