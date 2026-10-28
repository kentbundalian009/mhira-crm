import mongoose from 'mongoose';

const rawMaterialSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Material code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      default: 'Raw Material',
      trim: true,
    },
    itemName: {
      type: String,
      default: '',
      trim: true,
    },
    itemDescription: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
    },
    specification: {
      type: String,
      default: '',
      trim: true,
    },
    theoreticalWeight: {
      type: String,
      default: '',
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    uom: {
      type: String,
      required: [true, 'Unit of Measure (UOM) is required'],
      trim: true,
    },
    manufacturer: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    brand: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    accountTo: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    criticalLevel: {
      type: Number,
      default: 0,
    },
    restockWarningPoint: {
      type: Number,
      default: 10,
    },
    overstockLimitPoint: {
      type: Number,
      default: 1000,
    },
    qcStatus: {
      type: String,
      enum: ['Pass', 'Quarantine', 'Rejected'],
      default: 'Pass',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

rawMaterialSchema.index({ code: 'text', itemName: 'text', itemDescription: 'text', manufacturer: 'text', brand: 'text', accountTo: 'text' });

const RawMaterial = mongoose.models.RawMaterial || mongoose.model('RawMaterial', rawMaterialSchema);
export default RawMaterial;