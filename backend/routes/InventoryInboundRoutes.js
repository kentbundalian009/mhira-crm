import express from "express";
import {
  createInboundShipment,
  getInboundLogs,
  getInboundReturnTickets,
  updateReturnTicketStatus,
} from "../controllers/InventoryInboundController.js";

const router = express.Router();

router.post("/", createInboundShipment);
router.get("/", getInboundLogs);
router.get("/supplier-returns", getInboundReturnTickets);
router.patch("/supplier-returns/:id/status", updateReturnTicketStatus);

export default router;