import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discount: {
      type: String,
      required: true,
      trim: true,
    },
    minSpend: {
      type: String,
      default: '0',
      trim: true,
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 = Unlimited redemptions
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiry: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Expired', 'Archived'],
      default: 'Active',
    },
    targetSegment: {
      type: String,
      default: 'All',
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// High-performance database query indexes
couponSchema.index({ isArchived: 1, status: 1, createdAt: -1 });

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
export default Coupon;
