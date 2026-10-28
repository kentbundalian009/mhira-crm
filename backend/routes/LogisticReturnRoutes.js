import express from "express";
import {
  createReturnRequest,
  getAllReturnRequests,
  getUserReturnRequests,
  updateReturnStatus,
} from "../controllers/LogisticReturnController.js";

const router = express.Router();

router.get("/", getAllReturnRequests);
router.post("/request", createReturnRequest);
router.get("/user/:userId", getUserReturnRequests);
router.put("/:returnId/status", updateReturnStatus);

export default router;
