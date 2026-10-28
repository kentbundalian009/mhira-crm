import mongoose from "mongoose";
import { User } from "../models/AdminUser.js";
import MarketingSubscriber from "../models/MarketingSubscriber.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { revokeToken, invalidateUserSession } from "../middleware/authMiddleware.js";
import { generateOTP, storeOTP, verifyOTP, grantResetPermission, consumeResetPermission } from "../lib/otpService.js";
import {
  sendVerificationCodeEmail,
  sendCustomerWelcomeEmail,
  sendStaffWelcomeEmail,
  sendVerificationLinkEmail,
  sendGoogleWelcomeEmail,
} from "../lib/email.js";
import { verifyTurnstileToken } from "../lib/turnstile.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || "mhira_cosmetics_jwt_secret_key_2026";

// Helper function to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Helper function to generate 7-day Email Verification Token
export const generateVerificationToken = (email) => {
  return jwt.sign(
    { email: String(email).trim().toLowerCase(), purpose: "email_verification" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// Helper function to generate sequential Customer No (CTM-000001, CTM-000002, etc.)
export const generateNextCustomerNo = async () => {
  try {
    const latestUser = await User.findOne({
      $or: [
        { customerNo: { $regex: /^CTM-/i } },
        { empNo: { $regex: /^CTM-/i } },
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .select("customerNo empNo")
      .lean();

    let maxNum = 0;
    if (latestUser) {
      const val = latestUser.customerNo || latestUser.empNo || "";
      const match = val.match(/CTM-(\d+)/i);
      if (match) {
        maxNum = parseInt(match[1], 10) || 0;
      }
    }

    if (maxNum === 0) {
      const count = await User.countDocuments({ role: "Customer" });
      maxNum = count;
    }

    const nextNum = maxNum + 1;
    return `CTM-${String(nextNum).padStart(6, "0")}`;
  } catch (error) {
    console.error("Error generating Customer No:", error);
    return `CTM-${String(Date.now()).slice(-6)}`;
  }
};

// @desc    Register a new Customer
// @route   POST /api/users/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { username, fullName, email, phoneNumber, gender, password, turnstileToken } = req.body;

    if (!username || !fullName || !email || !password) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    if (turnstileToken) {
      const turnstileCheck = await verifyTurnstileToken(turnstileToken, req.ip);
      if (!turnstileCheck.success) {
        return res.status(400).json({ message: turnstileCheck.message });
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Check if user already exists (indexed queries)
    const existingUser = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    }).lean();

    if (existingUser) {
      return res.status(400).json({
        message: "Username or Email is already registered.",
      });
    }

    // Fast asynchronous password hashing (rounds: 10)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Auto-generate primary customer key (e.g. CTM-000001)
    const customerNo = await generateNextCustomerNo();

    // Save customer account
    const user = new User({
      customerNo,
      empNo: customerNo,
      customerCode: customerNo,
      username: cleanUsername,
      fullName: fullName.trim(),
      email: cleanEmail,
      phoneNumber: phoneNumber ? phoneNumber.trim() : "",
      gender: gender ? gender.trim() : "",
      password: hashedPassword,
      role: "Customer",
      accountType: "Customer",
    });

    await user.save();

    // Generate one-click verification link
    const vToken = generateVerificationToken(cleanEmail);
    const frontendUrl = process.env.FRONTEND_URL || "https://mhira-crmsystem.onrender.com";
    const verificationLink = `${frontendUrl}/verify-email?token=${vToken}`;

    // Send customer welcome & credentials email with direct verification button (non-blocking)
    sendCustomerWelcomeEmail({
      to: cleanEmail,
      fullName: user.fullName,
      customerNo: user.customerNo,
      username: user.username,
      password: password,
      verificationLink,
    }).catch((err) => console.error("Error sending customer welcome email:", err.message));

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Customer account registered successfully! Details sent to your email.",
      token,
      user: {
        _id: user._id,
        customerNo: user.customerNo,
        customerCode: user.customerCode,
        empNo: user.empNo,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        role: user.role,
        accountType: user.accountType,
      },
    });
  } catch (error) {
    console.error("Error during signup:", error.message);
    return res.status(500).json({ message: error.message || "Server error during signup" });
  }
};

// @desc    Authenticate User & Login
// @route   POST /api/users/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password, turnstileToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password." });
    }

    if (turnstileToken) {
      const turnstileCheck = await verifyTurnstileToken(turnstileToken, req.ip);
      if (!turnstileCheck.success) {
        return res.status(400).json({ message: turnstileCheck.message });
      }
    }

    const identifier = String(email).trim();
    const cleanEmail = identifier.toLowerCase();

    // Query indexed fields directly with lean() for fast sub-millisecond lookup
    const user = await User.findOne({
      $or: [
        { email: cleanEmail },
        { username: identifier },
        { username: cleanEmail },
        { customerNo: identifier },
        { empNo: identifier },
      ],
    })
      .select("_id customerNo empNo customerCode username fullName email phoneNumber gender role profileImage accountType billingAddress shippingAddress password")
      .lean()
      .maxTimeMS(8000);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials. User not found." });
    }

    // Direct asynchronous password validation
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials. Incorrect password." });
    }

    // Instant token generation and immediate payload return
    const token = generateToken(user._id);

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        _id: user._id,
        customerNo: user.customerNo || user.empNo || user.customerCode || "CTM-000001",
        customerCode: user.customerCode || user.customerNo || user.empNo || "CTM-000001",
        empNo: user.empNo || user.customerNo || "",
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || "",
        gender: user.gender || "",
        role: user.role || "Customer",
        accountType: user.accountType || "Customer",
        profileImage: user.profileImage || "",
        billingAddress: user.billingAddress || null,
        shippingAddress: user.shippingAddress || null,
      },
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    return res.status(500).json({ message: "Server error during login" });
  }
};

// @desc    Get Current User Profile
// @route   GET /api/users/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: "User profile not found." });
    }
    return res.status(200).json(req.user);
  } catch (error) {
    console.error("Error fetching current user profile:", error.message);
    return res.status(500).json({ message: "Server error fetching profile" });
  }
};

// @desc    Get all users with search and role filter
// @route   GET /api/users
// @access  Private (Admin / Staff)
export const getUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    let query = {};

    if (role && role !== "All") {
      query.role = role;
    }

    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { empNo: searchRegex },
        { customerNo: searchRegex },
        { username: searchRegex },
        { fullName: searchRegex },
        { email: searchRegex },
      ];
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 }).lean().maxTimeMS(8000);
    return res.status(200).json(users || []);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    return res.status(200).json([]);
  }
};

// @desc    Create new user (Admin creation for Staff/Customer)
// @route   POST /api/users
// @access  Private (Admin)
export const createUser = async (req, res) => {
  try {
    const { empNo, username, fullName, email, password, role } = req.body;

    if (!username || !fullName || !email) {
      return res.status(400).json({ message: "Please fill in username, full name, and email." });
    }

    const allowedRoles = ["Customer", "Admin", "Inventory", "Marketing", "Logistic"];
    const targetRole = allowedRoles.includes(role) ? role : "Customer";

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check existing
    const checkQuery = [{ username: cleanUsername }, { email: cleanEmail }];
    if (empNo && empNo.trim() !== "") {
      checkQuery.push({ empNo: empNo.trim() });
    }

    const existingUser = await User.findOne({ $or: checkQuery }).lean();
    if (existingUser) {
      return res.status(400).json({
        message: "Employee No., Username, or Email is already taken.",
      });
    }

    let targetEmpNo = empNo && empNo.trim() !== "" ? empNo.trim() : undefined;
    let customerNo = undefined;

    if (targetRole === "Customer") {
      customerNo = targetEmpNo || (await generateNextCustomerNo());
      targetEmpNo = customerNo;
    }

    // Auto-generate secure temporary password if not provided
    const plainPassword =
      password && password.trim() !== ""
        ? password.trim()
        : `Mhira@${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    const newUser = new User({
      empNo: targetEmpNo,
      customerNo: customerNo,
      customerCode: customerNo || undefined,
      username: cleanUsername,
      fullName: fullName.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: targetRole,
    });

    await newUser.save();

    const vToken = generateVerificationToken(cleanEmail);
    const frontendUrl = process.env.FRONTEND_URL || "https://mhira-crmsystem.onrender.com";
    const verificationLink = `${frontendUrl}/verify-email?token=${vToken}`;

    // Dispatch credentials email with password to the user
    if (targetRole === "Customer") {
      sendCustomerWelcomeEmail({
        to: cleanEmail,
        fullName: newUser.fullName,
        customerNo: newUser.customerNo,
        username: newUser.username,
        password: plainPassword,
        verificationLink,
      }).catch((err) => console.error("Error sending customer welcome email:", err.message));
    } else {
      sendStaffWelcomeEmail({
        to: cleanEmail,
        fullName: newUser.fullName,
        empNo: targetEmpNo || "STAFF",
        role: targetRole,
        temporaryPassword: plainPassword,
        verificationLink,
      }).catch((err) => console.error("Error sending staff welcome email:", err.message));
    }

    const result = newUser.toObject();
    delete result.password;

    return res.status(201).json({
      message: "User created successfully! Account credentials sent to email.",
      user: result,
      temporaryPassword: plainPassword,
    });
  } catch (error) {
    console.error("Error creating user:", error.message);
    return res.status(500).json({ message: error.message || "Server error creating user" });
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Private (Admin)
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { empNo, username, fullName, email, role, password, phoneNumber, gender } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.empNo = empNo !== undefined ? empNo : user.empNo;
    user.username = username || user.username;
    user.fullName = fullName || user.fullName;
    user.email = email ? email.trim().toLowerCase() : user.email;
    user.role = role || user.role;
    user.phoneNumber = phoneNumber !== undefined ? phoneNumber : user.phoneNumber;
    user.gender = gender !== undefined ? gender : user.gender;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();
    invalidateUserSession(id);
    const result = updatedUser.toObject();
    delete result.password;

    return res.status(200).json({ message: "User updated successfully", user: result });
  } catch (error) {
    console.error("Error updating user:", error.message);
    return res.status(500).json({ message: "Server error updating user" });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    invalidateUserSession(id);
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error.message);
    return res.status(500).json({ message: "Server error deleting user" });
  }
};

// Helper to compute tier based on total spent amount
export const calculateTier = (totalSpent) => {
  if (totalSpent >= 10000) return "Platinum";
  if (totalSpent >= 5000) return "Gold";
  if (totalSpent >= 1000) return "Silver";
  return "Bronze";
};

// @desc    Get user profile with points & tier
// @route   GET /api/users/profile/:id
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let user = null;

    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select("-password").lean().maxTimeMS(8000);
    }

    if (!user && id) {
      const cleanId = String(id).trim();
      user = await User.findOne({
        $or: [
          { email: cleanId.toLowerCase() },
          { username: cleanId },
          { username: cleanId.toLowerCase() },
          { customerNo: cleanId },
          { customerCode: cleanId },
          { empNo: cleanId },
        ],
      })
        .select("-password")
        .lean()
        .maxTimeMS(8000);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const calculatedTier = calculateTier(user.totalSpent || 0);
    const formattedUser = {
      ...user,
      customerCode: user.customerCode || user.customerNo || user.empNo || "CTM-000001",
      customerNo: user.customerNo || user.customerCode || user.empNo || "CTM-000001",
      tier: user.tier || calculatedTier,
    };

    return res.status(200).json(formattedUser);
  } catch (error) {
    console.error("Error in getUserProfile:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update Customer Profile (Self-edit)
// @route   PUT /api/users/profile/:id
export const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullName,
      username,
      email,
      phoneNumber,
      customerCode,
      accountType,
      billingAddress,
      shippingAddress,
      gender,
      profileImage,
      dateOfBirth,
      location,
      communicationPreferences,
      profileVisibility,
      privacySettings,
    } = req.body;

    let user = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user && id) {
      user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { username: id }, { customerNo: id }] });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (fullName) user.fullName = fullName.trim();
    if (username) {
      const cleanUsername = username.trim();
      if (cleanUsername !== user.username) {
        if (cleanUsername.length < 3) {
          return res.status(400).json({ message: "Username must be at least 3 characters." });
        }
        const existingUser = await User.findOne({
          username: { $regex: new RegExp(`^${cleanUsername}$`, "i") },
          _id: { $ne: user._id },
        });
        if (existingUser) {
          return res.status(400).json({ message: "Username is already taken by another account." });
        }
        user.username = cleanUsername;
        if (user.profileVisibility) {
          user.profileVisibility.displayUsername = cleanUsername;
        }
      }
    }
    if (email) user.email = email.trim().toLowerCase();
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber.trim();
    if (gender !== undefined) user.gender = gender.trim();
    if (customerCode) user.customerCode = customerCode.trim();
    if (accountType) user.accountType = accountType.trim();
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (location !== undefined) user.location = String(location).trim() || "Philippines";

    if (dateOfBirth !== undefined) {
      user.dateOfBirth = {
        month: dateOfBirth.month ?? user.dateOfBirth?.month ?? "10",
        day: dateOfBirth.day ?? user.dateOfBirth?.day ?? "25",
        year: dateOfBirth.year ?? user.dateOfBirth?.year ?? "2005",
      };
    }

    if (communicationPreferences !== undefined) {
      user.communicationPreferences = {
        generalCommunication: Boolean(communicationPreferences.generalCommunication),
      };
      try {
        const isSub = Boolean(user.communicationPreferences.generalCommunication);
        await MarketingSubscriber.findOneAndUpdate(
          { email: user.email.toLowerCase() },
          {
            email: user.email.toLowerCase(),
            fullName: user.fullName || "",
            userId: user._id,
            status: isSub ? "Subscribed" : "Unsubscribed",
            source: "Account Communication Preferences",
            subscribedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      } catch (subErr) {
        console.warn("Marketing subscriber sync error:", subErr.message);
      }
    }

    if (profileVisibility !== undefined) {
      user.profileVisibility = {
        displayUsername: profileVisibility.displayUsername ?? user.profileVisibility?.displayUsername ?? user.username,
        reviewVisibility: profileVisibility.reviewVisibility ?? user.profileVisibility?.reviewVisibility ?? "Public",
        locationSharing: profileVisibility.locationSharing ?? user.profileVisibility?.locationSharing ?? "None",
      };
    }

    if (privacySettings !== undefined) {
      user.privacySettings = {
        shareUsageData: privacySettings.shareUsageData !== undefined ? Boolean(privacySettings.shareUsageData) : true,
        shareContactForAds: privacySettings.shareContactForAds !== undefined ? Boolean(privacySettings.shareContactForAds) : false,
        useSkincareData: privacySettings.useSkincareData !== undefined ? Boolean(privacySettings.useSkincareData) : true,
      };
    }

    if (billingAddress) {
      user.billingAddress = {
        street: billingAddress.street ?? user.billingAddress?.street ?? "",
        city: billingAddress.city ?? user.billingAddress?.city ?? "",
        province: billingAddress.province ?? user.billingAddress?.province ?? "",
        postalCode: billingAddress.postalCode ?? user.billingAddress?.postalCode ?? "",
        country: billingAddress.country ?? user.billingAddress?.country ?? "Philippines",
      };
    }

    if (shippingAddress) {
      user.shippingAddress = {
        street: shippingAddress.street ?? user.shippingAddress?.street ?? "",
        city: shippingAddress.city ?? user.shippingAddress?.city ?? "",
        province: shippingAddress.province ?? user.shippingAddress?.province ?? "",
        postalCode: shippingAddress.postalCode ?? user.shippingAddress?.postalCode ?? "",
        country: shippingAddress.country ?? user.shippingAddress?.country ?? "Philippines",
      };

      if (!user.addresses) user.addresses = [];
      const streetVal = user.shippingAddress.street ? user.shippingAddress.street.trim() : "";
      if (streetVal) {
        const defaultIdx = user.addresses.findIndex((a) => a.isDefault);
        if (defaultIdx >= 0) {
          user.addresses[defaultIdx].streetAddress = streetVal;
          user.addresses[defaultIdx].city = user.shippingAddress.city || user.addresses[defaultIdx].city;
          user.addresses[defaultIdx].province = user.shippingAddress.province || user.addresses[defaultIdx].province;
          user.addresses[defaultIdx].postalCode = user.shippingAddress.postalCode || user.addresses[defaultIdx].postalCode;
        } else if (user.addresses.length > 0) {
          user.addresses[0].isDefault = true;
          user.addresses[0].streetAddress = streetVal;
          user.addresses[0].city = user.shippingAddress.city || user.addresses[0].city;
          user.addresses[0].province = user.shippingAddress.province || user.addresses[0].province;
          user.addresses[0].postalCode = user.shippingAddress.postalCode || user.addresses[0].postalCode;
        } else {
          user.addresses.push({
            fullName: user.fullName || "Customer",
            phoneNumber: user.phoneNumber || "",
            region: "South Luzon (Calabarzon)",
            province: user.shippingAddress.province || "Laguna",
            city: user.shippingAddress.city || "Calamba City",
            barangay: "Uwisan",
            postalCode: user.shippingAddress.postalCode || "4027",
            streetAddress: streetVal,
            label: "Home",
            isDefault: true,
          });
        }
      }
    }

    const updatedUser = await user.save();
    invalidateUserSession(id);
    const resultObj = updatedUser.toObject();
    delete resultObj.password;

    return res.status(200).json({ message: "Profile updated successfully!", user: resultObj });
  } catch (error) {
    console.error("Error updating customer profile:", error.message);
    return res.status(500).json({ message: error.message || "Server error updating profile" });
  }
};

// @desc    Get Customer Segmentation Analytics (For Marketing)
// @route   GET /api/users/segments
export const getCustomerSegments = async (req, res) => {
  try {
    const customers = await User.find({ role: "Customer" }).select("-password").lean().maxTimeMS(8000);

    const vip = customers.filter((c) => (c.totalSpent || 0) >= 5000);
    const regular = customers.filter((c) => (c.totalSpent || 0) >= 1000 && (c.totalSpent || 0) < 5000);
    const newCustomers = customers.filter((c) => (c.totalSpent || 0) < 1000);

    return res.status(200).json({
      totalCustomers: customers.length,
      segments: {
        vip: { count: vip.length, users: vip },
        regular: { count: regular.length, users: regular },
        new: { count: newCustomers.length, users: newCustomers },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Change User Password
// @route   PUT /api/users/change-password/:id
export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required." });
    }

    let user = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user && id) {
      user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { username: id }, { customerNo: id }] });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password. Please re-enter your current password." });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from current password." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    invalidateUserSession(id);

    return res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    console.error("Error changing password:", error.message);
    return res.status(500).json({ message: error.message || "Server error changing password." });
  }
};

// @desc    Verify current password for realtime match check
// @route   POST /api/users/verify-password/:id
export const verifyPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({ valid: false, message: "Current password is required." });
    }

    let user = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).lean();
    }
    if (!user && id) {
      user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { username: id }, { customerNo: id }] }).lean();
    }

    if (!user) {
      return res.status(404).json({ valid: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(200).json({ valid: false, message: "Current password does not match." });
    }

    return res.status(200).json({ valid: true, message: "Current password verified." });
  } catch (error) {
    console.error("Error verifying password:", error.message);
    return res.status(500).json({ valid: false, message: error.message || "Server error verifying password." });
  }
};

// ================= CUSTOMER ADDRESS MANAGEMENT =================

export const addCustomerAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      fullName,
      phoneNumber,
      region,
      province,
      city,
      barangay,
      postalCode,
      streetAddress,
      deliveryInstructions,
      label,
      isDefault,
      latitude,
      longitude,
    } = req.body;

    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && userId) {
      user = await User.findOne({ $or: [{ email: userId.toLowerCase() }, { username: userId }, { customerNo: userId }] });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.addresses) user.addresses = [];

    const shouldBeDefault = isDefault || user.addresses.length === 0;

    if (shouldBeDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    const newAddress = {
      fullName: fullName || user.fullName,
      phoneNumber: phoneNumber || user.phoneNumber,
      region: region || "",
      province: province || "",
      city: city || "",
      barangay: barangay || "",
      postalCode: postalCode || "",
      streetAddress: streetAddress || "",
      deliveryInstructions: deliveryInstructions || "",
      label: label || "Home",
      isDefault: shouldBeDefault,
      latitude: latitude || 14.2117,
      longitude: longitude || 121.1656,
    };

    user.addresses.push(newAddress);

    if (shouldBeDefault) {
      user.shippingAddress = {
        street: streetAddress || "",
        city: city || "",
        province: province || "",
        postalCode: postalCode || "",
        country: "Philippines",
      };
    }

    await user.save();
    return res.status(201).json({
      message: "Delivery address added successfully.",
      addresses: user.addresses,
      address: user.addresses[user.addresses.length - 1],
    });
  } catch (error) {
    console.error("Error adding address:", error);
    return res.status(500).json({ message: "Server error adding address." });
  }
};

export const getCustomerAddresses = async (req, res) => {
  try {
    const { userId } = req.params;
    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && userId) {
      user = await User.findOne({ $or: [{ email: userId.toLowerCase() }, { username: userId }, { customerNo: userId }] });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let addresses = user.addresses || [];

    // Fallback: If user has saved shippingAddress or billingAddress on profile, synthesize into addresses
    if (addresses.length === 0 && (user.shippingAddress?.street || user.billingAddress?.street)) {
      const src = user.shippingAddress?.street ? user.shippingAddress : user.billingAddress;
      const synthesized = {
        _id: new mongoose.Types.ObjectId(),
        fullName: user.fullName || "Customer",
        phoneNumber: user.phoneNumber || "",
        region: "South Luzon (Calabarzon)",
        province: src.province || "Laguna",
        city: src.city || "Calamba City",
        barangay: "Uwisan",
        postalCode: src.postalCode || "4027",
        streetAddress: src.street || "",
        label: "Home",
        isDefault: true,
        latitude: 14.2117,
        longitude: 121.1656,
      };

      user.addresses = [synthesized];
      try {
        await user.save();
      } catch (err) {}
      addresses = user.addresses;
    }

    return res.status(200).json({ addresses: addresses || [] });
  } catch (error) {
    console.error("Error getting addresses:", error);
    return res.status(500).json({ message: "Server error getting addresses." });
  }
};

export const setDefaultAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && userId) {
      user = await User.findOne({ $or: [{ email: userId.toLowerCase() }, { username: userId }, { customerNo: userId }] });
    }

    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.addresses) user.addresses = [];

    let targetAddr = null;
    user.addresses.forEach((a) => {
      if (a._id?.toString() === addressId || a.id === addressId) {
        a.isDefault = true;
        targetAddr = a;
      } else {
        a.isDefault = false;
      }
    });

    if (targetAddr) {
      user.shippingAddress = {
        street: targetAddr.streetAddress || "",
        city: targetAddr.city || "",
        province: targetAddr.province || "",
        postalCode: targetAddr.postalCode || "",
        country: "Philippines",
      };
    }

    await user.save();
    return res.status(200).json({ message: "Default address updated.", addresses: user.addresses });
  } catch (error) {
    console.error("Error setting default address:", error);
    return res.status(500).json({ message: "Server error updating default address." });
  }
};

export const deleteCustomerAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && userId) {
      user = await User.findOne({ $or: [{ email: userId.toLowerCase() }, { username: userId }, { customerNo: userId }] });
    }

    if (!user) return res.status(404).json({ message: "User not found." });

    user.addresses = (user.addresses || []).filter(
      (a) => a._id?.toString() !== addressId && a.id !== addressId
    );

    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return res.status(200).json({ message: "Address deleted.", addresses: user.addresses });
  } catch (error) {
    console.error("Error deleting address:", error);
    return res.status(500).json({ message: "Server error deleting address." });
  }
};

// @desc    Update Customer Delivery Address
// @route   PUT /api/users/:userId/addresses/:addressId
export const updateCustomerAddress = async (req, res) => {
  try {
    const { userId, addressId } = req.params;
    const {
      fullName,
      phoneNumber,
      region,
      province,
      city,
      barangay,
      postalCode,
      streetAddress,
      deliveryInstructions,
      label,
      isDefault,
      latitude,
      longitude,
    } = req.body;

    let user = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(userId);
    }
    if (!user && userId) {
      user = await User.findOne({ $or: [{ email: userId.toLowerCase() }, { username: userId }, { customerNo: userId }] });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.addresses) user.addresses = [];

    const targetAddr = user.addresses.id(addressId) || user.addresses.find((a) => String(a._id) === String(addressId));
    if (!targetAddr) {
      return res.status(404).json({ message: "Address not found." });
    }

    if (fullName !== undefined) targetAddr.fullName = fullName;
    if (phoneNumber !== undefined) targetAddr.phoneNumber = phoneNumber;
    if (region !== undefined) targetAddr.region = region;
    if (province !== undefined) targetAddr.province = province;
    if (city !== undefined) targetAddr.city = city;
    if (barangay !== undefined) targetAddr.barangay = barangay;
    if (postalCode !== undefined) targetAddr.postalCode = postalCode;
    if (streetAddress !== undefined) targetAddr.streetAddress = streetAddress;
    if (deliveryInstructions !== undefined) targetAddr.deliveryInstructions = deliveryInstructions;
    if (label !== undefined) targetAddr.label = label;
    if (latitude !== undefined) targetAddr.latitude = latitude;
    if (longitude !== undefined) targetAddr.longitude = longitude;

    if (isDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = String(a._id) === String(addressId);
      });
      user.shippingAddress = {
        street: targetAddr.streetAddress || "",
        city: targetAddr.city || "",
        province: targetAddr.province || "",
        postalCode: targetAddr.postalCode || "",
        country: "Philippines",
      };
    }

    await user.save();
    return res.status(200).json({
      message: "Delivery address updated successfully.",
      addresses: user.addresses,
      address: targetAddr,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    return res.status(500).json({ message: "Server error updating address." });
  }
};

// ==========================================
// GOOGLE OAUTH CONTROLLERS & HELPERS
// ==========================================

// Helper: Verify Google Token (ID token or Access token)
const verifyGoogleTokenHelper = async ({ credential, access_token, user_info }) => {
  // 1. If ID token (credential) is supplied
  if (credential) {
    if (process.env.GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          return {
            email: payload.email,
            fullName: payload.name || payload.given_name || "Google User",
            picture: payload.picture || "",
            sub: payload.sub,
          };
        }
      } catch (err) {
        console.warn("verifyIdToken via SDK failed, trying tokeninfo endpoint:", err.message);
      }
    }

    // Direct Google Tokeninfo API fallback verification
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.email) {
          return {
            email: payload.email,
            fullName: payload.name || payload.given_name || "Google User",
            picture: payload.picture || "",
            sub: payload.sub,
          };
        }
      }
    } catch (fetchErr) {
      console.error("Tokeninfo endpoint error:", fetchErr.message);
    }
  }

  // 2. If access_token is supplied
  if (access_token) {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload && payload.email) {
          return {
            email: payload.email,
            fullName: payload.name || payload.given_name || "Google User",
            picture: payload.picture || "",
            sub: payload.sub,
          };
        }
      }
    } catch (accessErr) {
      console.error("Userinfo endpoint error:", accessErr.message);
    }
  }

  // 3. If direct user_info passed (mock/development helper)
  if (user_info && user_info.email) {
    return {
      email: user_info.email,
      fullName: user_info.name || user_info.fullName || "Google User",
      picture: user_info.picture || user_info.profileImage || "",
      sub: user_info.sub || user_info.id || `google_${Date.now()}`,
    };
  }

  return null;
};

// @desc    Authenticate / Register user via Google OAuth
// @route   POST /api/users/google OR /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { credential, access_token, user_info } = req.body;

    if (!credential && !access_token && !user_info) {
      return res.status(400).json({
        success: false,
        message: "Google credential or access token is required.",
      });
    }

    const profile = await verifyGoogleTokenHelper({
      credential,
      access_token,
      user_info,
    });

    if (!profile || !profile.email) {
      return res.status(401).json({
        success: false,
        message: "Google token verification failed. Please try signing in again.",
      });
    }

    const cleanEmail = String(profile.email).trim().toLowerCase();
    const googleId = String(profile.sub || "");

    // 1. Look up existing user by googleId or email
    let user = await User.findOne({
      $or: [
        ...(googleId ? [{ googleId }] : []),
        { email: cleanEmail },
      ],
    });

    if (user) {
      let shouldSave = false;
      if (!user.googleId && googleId) {
        user.googleId = googleId;
        shouldSave = true;
      }
      if (!user.profileImage && profile.picture) {
        user.profileImage = profile.picture;
        shouldSave = true;
      }
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
        shouldSave = true;
      }
      if (shouldSave) {
        await user.save();
      }
    } else {
      // 2. Create new Customer Account
      const customerNo = await generateNextCustomerNo();

      // Ensure unique username
      const emailPrefix = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
      let chosenUsername = emailPrefix;
      const usernameExists = await User.findOne({ username: chosenUsername }).lean();
      if (usernameExists) {
        chosenUsername = `${emailPrefix}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // Generate secure random hashed password
      const randomSecret = crypto.randomBytes(32).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomSecret, salt);

      user = new User({
        customerNo,
        empNo: customerNo,
        customerCode: customerNo,
        username: chosenUsername,
        fullName: profile.fullName || emailPrefix,
        email: cleanEmail,
        phoneNumber: "",
        gender: "",
        password: hashedPassword,
        role: "Customer",
        accountType: "Customer",
        authProvider: "google",
        googleId: googleId || undefined,
        profileImage: profile.picture || "",
        isEmailVerified: true,
      });

      await user.save();

      // Dispatch Google Welcome Email to the new user's Gmail (non-blocking)
      sendGoogleWelcomeEmail({
        to: cleanEmail,
        fullName: user.fullName,
        customerNo: user.customerNo,
      }).catch((err) =>
        console.error("Error sending Google welcome email:", err.message)
      );
    }

    // Generate JWT token
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Google login successful!",
      token,
      user: {
        _id: user._id,
        customerNo: user.customerNo || user.empNo || user.customerCode || "CTM-000001",
        customerCode: user.customerCode || user.customerNo || user.empNo || "CTM-000001",
        empNo: user.empNo || user.customerNo || "",
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || "",
        gender: user.gender || "",
        role: user.role || "Customer",
        accountType: user.accountType || "Customer",
        profileImage: user.profileImage || "",
        billingAddress: user.billingAddress || null,
        shippingAddress: user.shippingAddress || null,
      },
    });
  } catch (error) {
    console.error("Error in googleAuth:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during Google authentication.",
    });
  }
};

// @desc    Logout User & Revoke Token (Blacklist in Redis)
// @route   POST /api/auth/logout, POST /api/users/logout
// @access  Public / Authenticated
export const logout = async (req, res) => {
  try {
    let token = req.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      await revokeToken(token);
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully. Token has been revoked.",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during logout.",
    });
  }
};

// @desc    Initiate Forgot Password - Generate and send 6-digit OTP to Email
// @route   POST /api/auth/forgot-password, POST /api/users/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email address is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account registered with that email address.",
      });
    }

    // Generate secure 8-digit OTP
    const otp = generateOTP(8);
    // Store in Upstash Redis & local memory for 15 minutes (900 seconds)
    await storeOTP(`reset:${cleanEmail}`, otp, 900);

    // Also persist in MongoDB user document as backup
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Send email notification
    await sendVerificationCodeEmail({
      to: cleanEmail,
      code: otp,
      userName: user.fullName || user.username || "Valued User",
      type: "password_reset",
    });

    return res.status(200).json({
      success: true,
      message: "An 8-digit verification code has been dispatched to your email address.",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process forgot password request.",
    });
  }
};

// @desc    Verify 6-digit OTP code for password reset
// @route   POST /api/auth/verify-reset-code, POST /api/users/verify-reset-code
// @access  Public
export const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and verification code are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();

    // 1. Try OTP service (Redis + Memory)
    let result = await verifyOTP(`reset:${cleanEmail}`, cleanCode);

    // 2. If not found in OTP service, check MongoDB fallback
    if (!result.valid) {
      const user = await User.findOne({ email: cleanEmail });
      if (
        user &&
        user.resetPasswordOtp &&
        String(user.resetPasswordOtp).trim() === cleanCode &&
        user.resetPasswordExpires &&
        new Date(user.resetPasswordExpires) > new Date()
      ) {
        result = { valid: true };
      }
    }

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    // Grant temporary 10-minute reset permission in Redis & local memory
    await grantResetPermission(cleanEmail, 600);

    return res.status(200).json({
      success: true,
      message: "Verification code confirmed. You can now choose a new password.",
    });
  } catch (error) {
    console.error("Error in verifyResetCode:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify code.",
    });
  }
};

// @desc    Reset Password with verified state
// @route   POST /api/auth/reset-password, POST /api/users/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: "Email and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if permission was established by step 2 (verifyResetCode)
    let isAuthorized = await consumeResetPermission(cleanEmail);

    // 2. Fallback: if permission was not found, check if code was provided and is valid
    if (!isAuthorized && code) {
      const cleanCode = String(code).trim();
      const result = await verifyOTP(`reset:${cleanEmail}`, cleanCode);
      if (result.valid) {
        isAuthorized = true;
      } else {
        // Check MongoDB fallback
        const userCheck = await User.findOne({ email: cleanEmail });
        if (
          userCheck &&
          userCheck.resetPasswordOtp &&
          String(userCheck.resetPasswordOtp).trim() === cleanCode &&
          userCheck.resetPasswordExpires &&
          new Date(userCheck.resetPasswordExpires) > new Date()
        ) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired or not found. Please request a new one.",
      });
    }

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    await user.save();
    invalidateUserSession(user._id);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully! You may now sign in with your new password.",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reset password.",
    });
  }
};

// @desc    Send Email Verification Code for Staff (Admin User Management)
// @route   POST /api/users/send-verification
// @access  Protected (Admin only)
export const sendStaffVerificationCode = async (req, res) => {
  try {
    const { email, fullName } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Staff email is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = generateOTP(6);
    await storeOTP(`staff_verify:${cleanEmail}`, otp, 900); // 15 mins

    await sendVerificationCodeEmail({
      to: cleanEmail,
      code: otp,
      userName: fullName || "Staff Member",
      type: "staff_verification",
    });

    return res.status(200).json({
      success: true,
      message: `Verification code dispatched to ${cleanEmail}`,
    });
  } catch (error) {
    console.error("Error in sendStaffVerificationCode:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send staff verification code.",
    });
  }
};

// @desc    Verify Staff Email with Code
// @route   POST /api/users/verify-code
// @access  Protected (Admin / Staff)
export const verifyStaffEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and verification code are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await verifyOTP(`staff_verify:${cleanEmail}`, String(code).trim());

    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }

    await User.findOneAndUpdate({ email: cleanEmail }, { isEmailVerified: true });

    return res.status(200).json({
      success: true,
      message: "Staff email successfully verified!",
    });
  } catch (error) {
    console.error("Error in verifyStaffEmail:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify staff code.",
    });
  }
};

// @desc    Send verification email with clickable link to customer
// @route   POST /api/users/send-verification-link
// @access  Public / Admin
export const sendVerificationLink = async (req, res) => {
  try {
    const { email, fullName } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email address is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with that email." });
    }

    const vToken = generateVerificationToken(cleanEmail);
    const frontendUrl = process.env.FRONTEND_URL || "https://mhira-crmsystem.onrender.com";
    const verificationLink = `${frontendUrl}/verify-email?token=${vToken}`;

    await sendVerificationLinkEmail({
      to: cleanEmail,
      fullName: fullName || user.fullName || user.username || "Valued Customer",
      verificationLink,
    });

    return res.status(200).json({
      success: true,
      message: `Verification email dispatched to ${cleanEmail}!`,
    });
  } catch (error) {
    console.error("Error in sendVerificationLink:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send verification email.",
    });
  }
};

// @desc    Verify customer email from one-click link
// @route   POST /api/users/verify-email-token
// @access  Public
export const verifyEmailToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Verification token is required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(400).json({
        success: false,
        message: "Verification link is invalid or has expired. Please request a new link.",
      });
    }

    if (!decoded || !decoded.email || decoded.purpose !== "email_verification") {
      return res.status(400).json({
        success: false,
        message: "Invalid verification token format.",
      });
    }

    const cleanEmail = decoded.email.trim().toLowerCase();
    const updatedUser = await User.findOneAndUpdate(
      { email: cleanEmail },
      { isEmailVerified: true },
      { returnDocument: "after" }
    );

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        isEmailVerified: true,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error in verifyEmailToken:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error verifying email.",
    });
  }
};

// @desc    Request Account Data Export (Privacy Tab)
// @route   POST /api/users/request-data/:id
export const requestCustomerData = async (req, res) => {
  try {
    const { id } = req.params;
    let user = null;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id).select("-password").lean();
    }
    if (!user && id) {
      user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { username: id }, { customerNo: id }] }).select("-password").lean();
    }
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    return res.status(200).json({
      success: true,
      message: `Your account data request has been received. A copy will be emailed to ${user.email}.`,
      data: {
        account: {
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          tier: user.tier,
          rewardPoints: user.rewardPoints,
          location: user.location,
          dateOfBirth: user.dateOfBirth,
        },
        addresses: user.addresses || [],
        privacySettings: user.privacySettings || {},
        communicationPreferences: user.communicationPreferences || {},
      },
    });
  } catch (error) {
    console.error("Error requesting data:", error);
    return res.status(500).json({ message: "Server error processing data request." });
  }
};