import mongoose from 'mongoose';

const expirySchema = new mongoose.Schema(
  {
    batchNo: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Raw Materials', 'Packaging', 'Finished Goods', 'Other'],
      default: 'Raw Materials',
    },
    segment: {
      type: String,
      default: 'General',
      trim: true,
    },
    itemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    specification: {
      type: String,
      default: 'Standard',
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    mfgDate: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Near Expiry', 'Expired', 'Disposed'],
      default: 'Active',
    },
    disposalDetails: {
      disposedAt: { type: Date },
      disposedBy: { type: String, default: 'Inventory Manager' },
      reason: { type: String, default: 'Expired Stock' },
      quantityDisposed: { type: Number, default: 0 },
      notes: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

// High-performance database query indexes
expirySchema.index({ status: 1, expiryDate: 1 });
expirySchema.index({ batchNo: 1 });
expirySchema.index({ code: 1 });
expirySchema.index({ createdAt: -1 });

const Expiry = mongoose.models.Expiry || mongoose.model('Expiry', expirySchema);
export default Expiry;
