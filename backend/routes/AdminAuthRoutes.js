import express from "express";
import {
  signup,
  login,
  googleAuth,
  getMe,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  verifyPassword,
  getCustomerSegments,
  addCustomerAddress,
  updateCustomerAddress,
  getCustomerAddresses,
  setDefaultAddress,
  deleteCustomerAddress,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  sendStaffVerificationCode,
  verifyStaffEmail,
  sendVerificationLink,
  verifyEmailToken,
  requestCustomerData,
} from "../controllers/AdminAuthController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Public Routes (Signup, Login, & Google OAuth) - protected by authLimiter
router.post("/signup", authLimiter, signup);
router.post("/register", authLimiter, signup); // Alias for signup
router.post("/login", authLimiter, login);
router.post("/google", googleAuth);
router.post("/logout", logout);

// Forgot Password Flow (Rate limited against abuse)
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/verify-reset-code", authLimiter, verifyResetCode);
router.post("/reset-password", authLimiter, resetPassword);

// Staff & Customer Email Verification
router.post("/send-verification", authLimiter, sendStaffVerificationCode);
router.post("/verify-code", authLimiter, verifyStaffEmail);
router.post("/send-verification-link", authLimiter, sendVerificationLink);
router.post("/verify-email-token", authLimiter, verifyEmailToken);

// Protected Profile & Loyalty Route
router.get("/me", protect, getMe);
router.get("/user-activity", protect, (req, res) => res.status(200).json([]));
router.get("/activity", protect, (req, res) => res.status(200).json([]));
router.get("/profile/:id", protect, getUserProfile);
router.put("/profile/:id", protect, updateUserProfile);
router.post("/request-data/:id", protect, requestCustomerData);
router.put("/change-password/:id", authLimiter, protect, changePassword);
router.post("/verify-password/:id", authLimiter, protect, verifyPassword);
router.get("/segments", protect, authorize("Admin", "Marketing"), getCustomerSegments);

// Customer Address Routes (Protected)
router.post("/:userId/addresses", protect, addCustomerAddress);
router.put("/:userId/addresses/:addressId", protect, updateCustomerAddress);
router.get("/:userId/addresses", protect, getCustomerAddresses);
router.patch("/:userId/addresses/:addressId/default", protect, setDefaultAddress);
router.delete("/:userId/addresses/:addressId", protect, deleteCustomerAddress);

// User Management Routes (Admin Access Only)
router.get("/", protect, authorize("Admin"), getUsers);
router.post("/", protect, authorize("Admin"), createUser);
router.put("/:id", protect, authorize("Admin"), updateUser);
router.delete("/:id", protect, (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "superadmin";
  const isSelf = String(req.user?._id) === String(req.params.id);
  if (isAdmin || isSelf) {
    return deleteUser(req, res, next);
  }
  return res.status(403).json({ success: false, message: "Not authorized to delete this account." });
});

export default router;