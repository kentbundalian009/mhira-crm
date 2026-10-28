import mongoose from "mongoose";

const inboundItemSchema = new mongoose.Schema({
  rawMaterialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RawMaterial",
    required: true,
  },
  code: { type: String },
  itemName: { type: String },
  category: { type: String },
  segment: { type: String },
  itemDescription: { type: String },
  specification: { type: String },
  uom: { type: String },
  brand: { type: String },
  accountTo: { type: String },
  imageUrl: { type: String },
  expectedQuantity: { type: Number, default: 0 },
  actualQuantity: { type: Number, required: true },
  quantityReceived: { type: Number },
  packagingType: { type: String, default: 'Standard' },
  packageCount: { type: Number, default: 1 },
  packSize: { type: Number, default: 0 },
  packagingDisplay: { type: String, default: '' },
  mfgDate: { type: String },
  expiryDate: { type: String },
  expirationDate: { type: String },
  receivingStatus: {
    type: String,
    enum: ['Accepted', 'Hold / Supplier Return', 'Rejected'],
    default: 'Accepted',
  },
  returnReason: { type: String, default: '' },
  supplierReturnTicketNo: { type: String, default: '' },
});

const inboundSchema = new mongoose.Schema(
  {
    batchPoNo: { type: String, required: true },
    supplierBrand: { type: String, required: true },
    dateReceived: { type: Date, required: true },
    originLocation: { type: String },
    preparedBy: { type: String, default: "Inventory Admin" },
    items: [inboundItemSchema],
  },
  { timestamps: true }
);

// High-performance database query indexes
inboundSchema.index({ createdAt: -1 });
inboundSchema.index({ batchPoNo: 1 });
inboundSchema.index({ dateReceived: -1 });

const Inbound = mongoose.models.Inbound || mongoose.model("Inbound", inboundSchema);
export default Inbound;