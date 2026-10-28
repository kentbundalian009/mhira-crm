import express from "express";
import {
  handleCustomerChat,
  getTicketStatus,
  getUserActiveTicket,
  getUserTickets,
  getAllTickets,
  sendCSRReply,
  updateTicketStatus,
  deleteTicket,
} from "../controllers/LogisticChatbotController.js";

const router = express.Router();

router.post("/chat", handleCustomerChat);
router.get("/user-ticket/:userId", getUserActiveTicket);
router.get("/user-tickets/:userId", getUserTickets);
router.get("/ticket/:ticketId", getTicketStatus);
router.get("/tickets", getAllTickets);
router.post("/csr-reply", sendCSRReply);
router.patch("/ticket/:ticketId/status", updateTicketStatus);
router.put("/ticket/:ticketId/status", updateTicketStatus);
router.delete("/ticket/:ticketId", deleteTicket);

export default router;