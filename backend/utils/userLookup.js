import mongoose from "mongoose";
import { User } from "../models/AdminUser.js";
import { calculateTier } from "../controllers/AdminAuthController.js";

export const findUserByIdentifier = async (userId, timeoutMs = 3000) => {
  if (!userId) return null;
  let user = null;
  if (mongoose.Types.ObjectId.isValid(userId)) {
    user = await User.findById(userId).maxTimeMS(timeoutMs).catch(() => null);
  }
  if (!user) {
    user = await User.findOne({ $or: [{ email: userId }, { username: userId }] })
      .maxTimeMS(timeoutMs)
      .catch(() => null);
  }
  return user;
};

export const awardLoyaltyPoints = async (userId, orderAmount) => {
  const user = await findUserByIdentifier(userId);
  if (!user) return null;
  const amount = Number(orderAmount || 0);
  const pointsEarned = Math.floor(amount / 50);
  user.rewardPoints = (user.rewardPoints || 0) + pointsEarned;
  user.totalSpent = (user.totalSpent || 0) + amount;
  user.tier = calculateTier(user.totalSpent);
  await user.save().catch(() => {});
  return { user, pointsEarned };
};
