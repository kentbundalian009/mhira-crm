import mongoose from "mongoose";

const returnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Collection",
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String },
});

const returnRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    customerName: {
      type: String,
      default: "Customer",
    },
    items: [returnItemSchema],
    reason: {
      type: String,
      required: true,
      enum: [
        "Damaged / Broken Item",
        "Wrong Item Delivered",
        "Defective / Not Working",
        "Expired Product",
        "Item Not as Described",
        "Change of Mind / Other",
      ],
      default: "Damaged / Broken Item",
    },
    comments: {
      type: String,
      default: "",
    },
    refundAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    restockAction: {
      type: String,
      enum: ["Return to Inventory", "Dispose/Scrap", "Send Replacement to Client", "Pending"],
      default: "Pending",
    },
    approverName: {
      type: String,
      default: "",
    },
    dispositionReason: {
      type: String,
      default: "",
    },
    replacementCourier: {
      type: String,
      default: "",
    },
    replacementTracking: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// High-performance database query indexes
returnRequestSchema.index({ orderId: 1 });
returnRequestSchema.index({ userId: 1, createdAt: -1 });
returnRequestSchema.index({ status: 1, createdAt: -1 });

const ReturnRequest = mongoose.models.ReturnRequest || mongoose.model("ReturnRequest", returnRequestSchema);
export default ReturnRequest;
