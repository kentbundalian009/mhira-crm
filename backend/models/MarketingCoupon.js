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
      default: '₱0',
      trim: true,
    },
    expiry: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Expired'],
      default: 'Active',
    },
    targetSegment: {
      type: String,
      enum: ['All', 'VIP Spenders', 'Regular', 'New Customers'],
      default: 'All',
    },
  },
  { timestamps: true }
);

// High-performance database query indexes
couponSchema.index({ status: 1, createdAt: -1 });

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
export default Coupon;
