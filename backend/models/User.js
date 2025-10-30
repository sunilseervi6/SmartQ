import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer','owner'], default: 'customer' },

  // Favorites
  favorites: [{
    itemType: { type: String, enum: ['shop', 'room'], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'favorites.itemModel' },
    itemModel: { type: String, enum: ['Shop', 'Room'], required: true },
    addedAt: { type: Date, default: Date.now }
  }],

  // Notification Preferences
  notificationPreferences: {
    queueJoined: { type: Boolean, default: true },
    positionChange: { type: Boolean, default: true },
    nextInLine: { type: Boolean, default: true },
    yourTurn: { type: Boolean, default: true },
    queueCompleted: { type: Boolean, default: true }
  }
});

// hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
