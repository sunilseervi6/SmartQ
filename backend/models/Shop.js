import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  address: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 200
  },
  category: { 
    type: String, 
    required: true,
    enum: ['Restaurant', 'Retail', 'Services', 'Electronics', 'Grocery', 'Fashion', 'Healthcare', 'Beauty', 'Automotive', 'Other']
  },
  shopCode: { 
    type: String, 
    unique: true,
    match: /^SHOP-[A-Z0-9]{6}$/
  },
  customId: { 
    type: String, 
    unique: true,
    sparse: true, // allows multiple null values
    match: /^[a-zA-Z0-9_]{3,20}$/,
    lowercase: true
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  description: {
    type: String,
    maxlength: 500
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate unique shopCode before validation
shopSchema.pre('validate', async function(next) {
  if (!this.shopCode) {
    let isUnique = false;
    let shopCode;
    
    while (!isUnique) {
      // Generate SHOP-XXXXXX format (exactly 6 characters)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomChars = '';
      for (let i = 0; i < 6; i++) {
        randomChars += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      shopCode = `SHOP-${randomChars}`;
      
      // Check if this shopCode already exists
      const existingShop = await this.constructor.findOne({ shopCode });
      if (!existingShop) {
        isUnique = true;
      }
    }
    
    this.shopCode = shopCode;
  }
  next();
});

// Index for faster queries
shopSchema.index({ owner: 1 });

export default mongoose.model("Shop", shopSchema);
