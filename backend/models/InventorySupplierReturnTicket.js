import mongoose from 'mongoose';

const supplierReturnTicketSchema = new mongoose.Schema(
  {
    ticketNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    rawMaterialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RawMaterial',
      required: true,
    },
    materialCode: {
      type: String,
      default: '',
      trim: true,
    },
    materialName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierName: {
      type: String,
      default: 'Unknown Supplier',
      trim: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    uom: {
      type: String,
      default: 'pcs',
      trim: true,
    },
    qcStatus: {
      type: String,
      enum: ['Quarantine', 'Rejected'],
      required: true,
    },
    reason: {
      type: String,
      default: 'Out-of-Specification (Failed Spec) Raw Material',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending Supplier Return', 'Return Initiated', 'Item Returned', 'Credit/Replacement Issued'],
      default: 'Pending Supplier Return',
    },
    notes: {
      type: String,
      default: '',
    },
    batchPoNo: {
      type: String,
      default: '',
      trim: true,
    },
    originLocation: {
      type: String,
      default: '',
      trim: true,
    },
    dateReceived: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance database query indexes
supplierReturnTicketSchema.index({ status: 1, createdAt: -1 });

const SupplierReturnTicket =
  mongoose.models.SupplierReturnTicket ||
  mongoose.model('SupplierReturnTicket', supplierReturnTicketSchema);

export default SupplierReturnTicket;
