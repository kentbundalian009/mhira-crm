import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    empNo: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    customerNo: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: "",
    },
    gender: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      required: false,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordOtp: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["Customer", "Admin", "Inventory", "Marketing", "Logistic"],
      default: "Customer",
    },
    profileImage: {
      type: String,
      default: "",
    },
    rewardPoints: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    tier: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },
    customerCode: {
      type: String,
      trim: true,
      default: "W502585",
    },
    accountType: {
      type: String,
      trim: true,
      default: "Shopper",
    },
    billingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "Philippines" },
    },
    shippingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
      postalCode: { type: String, default: "" },
      country: { type: String, default: "Philippines" },
    },
    addresses: [
      {
        fullName: { type: String, default: "" },
        phoneNumber: { type: String, default: "" },
        region: { type: String, default: "" },
        province: { type: String, default: "" },
        city: { type: String, default: "" },
        barangay: { type: String, default: "" },
        postalCode: { type: String, default: "" },
        streetAddress: { type: String, default: "" },
        deliveryInstructions: { type: String, default: "", trim: true },
        label: { type: String, default: "Home", trim: true },
        isDefault: { type: Boolean, default: false },
        latitude: { type: Number, default: 14.2117 },
        longitude: { type: Number, default: 121.1656 },
      },
    ],
    dateOfBirth: {
      month: { type: String, default: "10" },
      day: { type: String, default: "25" },
      year: { type: String, default: "2005" },
    },
    location: {
      type: String,
      default: "Philippines",
      trim: true,
    },
    communicationPreferences: {
      generalCommunication: { type: Boolean, default: true },
    },
    profileVisibility: {
      displayUsername: { type: String, default: "" },
      reviewVisibility: { type: String, enum: ["Private", "Social", "Public"], default: "Public" },
      locationSharing: { type: String, enum: ["Friends", "None"], default: "None" },
    },
    privacySettings: {
      shareUsageData: { type: Boolean, default: true },
      shareContactForAds: { type: Boolean, default: false },
      useSkincareData: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// High-performance database query indexes
userSchema.index({ role: 1, createdAt: -1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;