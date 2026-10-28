import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.Mixed,
    required: false,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String },
});

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Order Placed", "To Pay", "To Ship", "To Receive", "Completed", "Cancelled", "Return Refund"],
      default: "Order Placed",
    },
    paymentStatus: {
      type: String,
      default: "Paid",
    },
    paymentMethod: { type: String, default: "Cash on Delivery" },
    shippingAddress: { type: String, default: "Default Address" },
    customerNotes: { type: String, default: "" },
    shippingFee: { type: Number, default: 0 },
    voucherCode: { type: String, default: "" },
    voucherDiscount: { type: Number, default: 0 },
    pointsRedeemed: { type: Number, default: 0 },
    checkoutSessionId: { type: String, default: "" },
    paymentIntentId: { type: String, default: "" },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
    paidAt: { type: Date },
    courier: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    inventoryDeducted: { type: Boolean, default: false },
    isReviewed: { type: Boolean, default: false },
    proofOfDelivery: {
      image: { type: String, default: "" },
      recipientName: { type: String, default: "" },
      deliveredAt: { type: Date },
      notes: { type: String, default: "" },
    },
    estimatedDelivery: {
      startDate: { type: String, default: "" },
      endDate: { type: String, default: "" },
      formattedRange: { type: String, default: "" },
      isDelayed: { type: Boolean, default: false },
      delayReason: { type: String, default: "" },
    },
    trackingTimeline: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
        status: { type: String, default: "" },
      },
    ],
    cancellationRequest: {
      status: {
        type: String,
        enum: ["None", "Pending", "Approved", "Rejected"],
        default: "None",
      },
      reason: { type: String, default: "" },
      requestedAt: { type: Date },
      reviewedAt: { type: Date },
      reviewedBy: { type: String, default: "" },
      rejectionReason: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// High-performance database query indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "cancellationRequest.status": 1 });
orderSchema.index({ createdAt: -1 });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;