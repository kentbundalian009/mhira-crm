import mongoose from 'mongoose';

const scrapAuditLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    itemType: {
      type: String,
      enum: ['Raw Material', 'Finished Product', 'WIP / In-Production', 'Customer Return'],
      default: 'Customer Return',
    },
    itemCode: {
      type: String,
      default: '',
      trim: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    batchId: {
      type: String,
      required: [true, 'Batch ID or Order Reference is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Scrapped/Rejected quantity is required'],
      min: [0.001, 'Quantity must be greater than 0'],
    },
    uom: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    reason: {
      type: String,
      required: [true, 'Reason for rejection/scrap is strictly required'],
      trim: true,
    },
    approverName: {
      type: String,
      required: [true, 'Approver or Inspector Name is strictly required to prevent shrinkage/theft'],
      trim: true,
    },
    disposition: {
      type: String,
      enum: ['Scrap / Dispose', 'Quarantined', 'Destroyed', 'Supplier Return'],
      default: 'Scrap / Dispose',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast search and audit filtering
scrapAuditLogSchema.index({ batchId: 1, approverName: 1, createdAt: -1 });

const ScrapAuditLog = mongoose.models.ScrapAuditLog || mongoose.model('ScrapAuditLog', scrapAuditLogSchema);

export default ScrapAuditLog;
