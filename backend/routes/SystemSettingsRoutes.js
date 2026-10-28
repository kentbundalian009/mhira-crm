import express from "express";
import {
  getMaintenanceStatus,
  updateMaintenanceStatus,
  getSystemSettings,
  updateSystemSettings,
  getFormulaPinStatus,
  verifyFormulaPin,
  updateFormulaPin,
  resetFormulaPin,
} from "../controllers/SystemSettingsController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes for all frontend clients (Branding, themes, and maintenance check)
router.get("/maintenance", getMaintenanceStatus);
router.get("/settings", getSystemSettings);

// Admin-controlled modification routes (Strictly protected)
router.post("/maintenance", protect, authorize("Admin"), updateMaintenanceStatus);
router.post("/settings", protect, authorize("Admin"), updateSystemSettings);

// Formula Access Authorization PIN routes
router.get("/formula-pin", protect, getFormulaPinStatus);
router.post("/formula-pin/verify", protect, verifyFormulaPin);
router.post("/formula-pin/change", protect, authorize("Admin"), updateFormulaPin);
router.post("/formula-pin/reset", protect, authorize("Admin"), resetFormulaPin);

export default router;

