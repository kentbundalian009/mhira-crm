import mongoose from 'mongoose';

const ingredientUsageSchema = new mongoose.Schema({
  rawMaterialId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
  materialCode: String,
  name: String,
  specification: { type: String, default: '' },
  theoreticalWeight: { type: String, default: '' },
  unitRequired: Number,
  totalRequired: Number,
  qtyDeducted: Number,
  uom: String,
  shortageQty: { type: Number, default: 0 },
});

const wipSchema = new mongoose.Schema(
  {
    wipBatchCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    productCode: { type: String, default: '' },
    productName: { type: String, required: true },
    numberOfBatches: {
      type: Number,
      default: 1,
    },
    totalBatchWeight: {
      type: Number,
      default: 30,
    },
    batchWeightUom: {
      type: String,
      default: 'kg',
    },
    targetQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    producedQuantity: {
      type: Number,
      default: 0,
    },
    pendingQuantity: {
      type: Number,
      default: 0,
    },
    mfgDate: {
      type: String,
      required: true,
    },
    expDate: {
      type: String,
      required: true,
    },
    estimatedDuration: {
      type: Number,
      default: 0,
    },
    estimatedDurationUnit: {
      type: String,
      enum: ['hours', 'days'],
      default: 'hours',
    },
    status: {
      type: String,
      enum: ['Completed', 'Pending / In Production', 'Pending / Shortage', 'In Production'],
      default: 'Pending / In Production',
    },
    rejectedQuantity: {
      type: Number,
      default: 0,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    rejectionApprover: {
      type: String,
      default: '',
      trim: true,
    },
    rejectionDisposition: {
      type: String,
      default: 'Scrap / Dispose',
      trim: true,
    },
    scrapLogId: {
      type: String,
      default: '',
      trim: true,
    },
    ingredientsUsed: [ingredientUsageSchema],
  },
  { timestamps: true }
);

// High-performance database query indexes
wipSchema.index({ status: 1, createdAt: -1 });
wipSchema.index({ createdAt: -1 });

const WIP = mongoose.models.WIP || mongoose.model('WIP', wipSchema);
export default WIP;