import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    status: {
      type: String,
      enum: ["Subscribed", "Unsubscribed"],
      default: "Subscribed",
    },
    source: {
      type: String,
      default: "Account Communication Preferences",
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

subscriberSchema.index({ email: 1 });
export const MarketingSubscriber =
  mongoose.models.MarketingSubscriber || mongoose.model("MarketingSubscriber", subscriberSchema);
export default MarketingSubscriber;
