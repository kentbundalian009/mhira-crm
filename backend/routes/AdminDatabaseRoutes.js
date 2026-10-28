import express from "express";
import {
  getDatabaseStatus,
  createBackup,
  listBackups,
  downloadBackup,
  restoreBackup,
  deleteBackup,
  getScheduleSettings,
  updateScheduleSettings,
  exportSingleCollection,
} from "../controllers/AdminDatabaseController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Strict security: All database and backup endpoints require an authenticated Admin
router.use(protect, authorize("Admin"));

router.get("/status", getDatabaseStatus);
router.post("/backup", createBackup);
router.get("/backups", listBackups);
router.get("/backup/:filename/download", downloadBackup);
router.get("/collection/:name/export", exportSingleCollection);
router.post("/restore", restoreBackup);
router.delete("/backup/:filename", deleteBackup);
router.get("/schedule", getScheduleSettings);
router.post("/schedule", updateScheduleSettings);

export default router;
