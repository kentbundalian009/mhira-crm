import mongoose from 'mongoose';

const salesReportSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      trim: true,
    },
    customer: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      default: '',
    },
    tier: {
      type: String,
      enum: ['Platinum', 'Gold', 'Silver', 'Bronze', ''],
      default: '',
    },
    userId: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      required: true,
    },
    items: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Delivered', 'In Transit', 'Processing', 'Cancelled'],
      default: 'Delivered',
    },
  },
  { timestamps: true }
);

const SalesReport = mongoose.models.SalesReport || mongoose.model('SalesReport', salesReportSchema);
export default SalesReport;
