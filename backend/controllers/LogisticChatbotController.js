// import { GoogleGenAI } from "@google/genai";
import ChatbotTicket from "../models/LogisticChatbotTicket.js";
import dotenv from "dotenv";

dotenv.config();

// AI Initializer - Commented out muna para iwas 429 / API errors
// const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 1. Customer Chat Logic (Hybrid: Pre-meditated AI Assistant + Live Human CSR)
export const handleCustomerChat = async (req, res) => {
  try {
    const { message, ticketId, attachment, orderData, userId, customerName } = req.body;

    if (!message && !attachment && !orderData) {
      return res.status(400).json({ success: false, error: "Message, attachment, or order details required." });
    }

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let currentTicket = null;

    if (ticketId) {
      currentTicket = await ChatbotTicket.findOne({ ticketId });
    } else if (userId) {
      // Find active unresolved ticket for this customer
      currentTicket = await ChatbotTicket.findOne({ userId, status: { $ne: "resolved" } }).sort({ updatedAt: -1 });
    }

    // Create new ticket if not yet existing
    if (!currentTicket) {
      const generatedId = `TCK-${Date.now().toString().slice(-6)}`;
      currentTicket = new ChatbotTicket({
        ticketId: generatedId,
        userId: userId || "",
        customerName: customerName || orderData?.customerName || "Mhira Customer",
        subject: orderData ? `Order #${orderData.orderNumber || "INQUIRY"}` : (message || "File Attachment").slice(0, 30) + "...",
        status: orderData ? "human" : "ai",
        messages: [],
      });
    } else {
      if (userId && !currentTicket.userId) {
        currentTicket.userId = userId;
      }
      if (customerName && currentTicket.customerName === "Guest Customer") {
        currentTicket.customerName = customerName;
      }
    }

    // Save customer message + attachment + orderData
    currentTicket.messages.push({
      sender: "customer",
      text: message || (orderData ? `Order Inquiry #${orderData.orderNumber || ""}` : ""),
      attachment: attachment || "",
      orderData: orderData || null,
      time: timeString,
    });

    const lower = (message || "").toLowerCase().trim();

    // 🟢 1. CHECK IF USER SENT AN ORDER INQUIRY (PRIORITY #1):
    if (
      orderData ||
      lower.includes("order inquiry") ||
      lower.includes("[order inquiry") ||
      lower.includes("order number") ||
      lower.includes("item(s):") ||
      lower.includes("delivery address:") ||
      (lower.includes("order #") && (lower.includes("status:") || lower.includes("total:")))
    ) {
      currentTicket.status = "human";
      const orderNumStr = orderData?.orderNumber ? `#${orderData.orderNumber}` : "details";
      const inquiryAckMsg = `Order ${orderNumStr} received! We have forwarded your inquiry to our Logistics Support team. How can we assist you with this order today?`;

      currentTicket.messages.push({ sender: "ai", text: inquiryAckMsg, time: timeString });
      await currentTicket.save();

      return res.status(200).json({
        success: true,
        reply: inquiryAckMsg,
        status: "human",
        ticketId: currentTicket.ticketId,
        messages: currentTicket.messages,
      });
    }

    // Check if user requested Live Agent
    if (
      lower.includes("human agent") ||
      lower.includes("talk to human") ||
      lower.includes("live agent") ||
      lower.includes("speak with a human") ||
      lower.includes("csr") ||
      lower.includes("representative") ||
      lower.includes("kausap")
    ) {
      currentTicket.status = "human";
      const transferMsg = "Connecting you to a Live Mhira Support Specialist... 🎧\nOur staff has received your ticket and will assist you shortly. You may also attach photos or order details here.";
      currentTicket.messages.push({ sender: "ai", text: transferMsg, time: timeString });
      await currentTicket.save();

      return res.status(200).json({
        success: true,
        reply: transferMsg,
        status: "human",
        ticketId: currentTicket.ticketId,
        messages: currentTicket.messages,
      });
    }

    // 🟢 IF TICKET IS IN "HUMAN" MODE (CSR in charge):
    if (currentTicket.status === "human") {
      await currentTicket.save();
      return res.status(200).json({
        success: true,
        reply: null, // Waiting for CSR staff reply
        status: "human",
        ticketId: currentTicket.ticketId,
        messages: currentTicket.messages,
      });
    }

    // 🟢 SMART PRE-MEDITATED AI ASSISTANT REPLIES:
    let aiReply = "";

    if (lower.includes("serum") || lower.includes("face serum")) {
      aiReply = "✨ Best Face Serum Recommendation:\nOur #1 bestseller is the Mhira Collagen & Vitamin C Brightening Serum (30ml). It boosts skin elasticity, fades dark spots, and provides lightweight 24-hr hydration using pure botanical extracts. Check it out under Our Collection > Skin Care!";
    } else if (lower.includes("hair") || lower.includes("hair care")) {
      aiReply = "💆‍♀️ Natural Hair Care Tips:\n1. Use our sulfate-free organic shampoo bars to avoid scalp dryness.\n2. Apply pure Coconut & Argan Hair Oil on damp ends for frizz-free shine.\n3. Rinse with lukewarm water to seal hair cuticles.";
    } else if (lower.includes("lotion") || lower.includes("spf") || lower.includes("body lotion")) {
      aiReply = "🧴 Body Lotion with SPF:\nWe recommend our Mhira Botanical Whitening Lotion with SPF 30! Infused with organic Shea Butter, Niacinamide, and Aloe Vera to shield your skin from harmful UV rays while keeping it smooth all day.";
    } else if (lower.includes("track") || lower.includes("order") || lower.includes("delivery") || lower.includes("shipping status")) {
      aiReply = "📦 Order Tracking Hub:\nYou can monitor your delivery step-by-step (Placed ➔ Preparing ➔ On the Way ➔ Delivered) in your My Orders hub (/orders) or review live milestone updates in Store Notifications.";
    } else if (lower.includes("voucher") || lower.includes("coupon") || lower.includes("discount") || lower.includes("promo")) {
      aiReply = "🎟️ Active Platform Vouchers:\n• ORGANIC10 — 10% OFF all natural products\n• MHIRA50 — ₱50 OFF (Min. spend ₱500)\n• FREESHIP — Free nationwide shipping\nYou can select or enter these codes directly in your Shopping Bag summary!";
    } else if (attachment && !message) {
      aiReply = "Thank you for sending the file! Our team will review your attachment. If you need immediate assistance, click 'Talk to Human Agent'.";
    } else {
      aiReply = "Thank you for your message! 🌿 At Mhira Natural Soap & Cosmetics, all our products are handcrafted with 100% organic ingredients. Feel free to choose an option from the suggestions or ask about our soaps, serums, and delivery!";
    }

    currentTicket.messages.push({ sender: "ai", text: aiReply, time: timeString });
    await currentTicket.save();

    return res.status(200).json({
      success: true,
      reply: aiReply,
      status: "ai",
      ticketId: currentTicket.ticketId,
      messages: currentTicket.messages,
    });

  } catch (error) {
    console.error("🔴 SERVER ERROR:", error.message || error);
    return res.status(500).json({
      success: false,
      reply: "I apologize, but we're experiencing some technical difficulties. Our team has been notified and will assist you shortly.",
    });
  }
};

// 2. Poll/Get Specific Ticket updates para sa Customer
export const getTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await ChatbotTicket.findOne({ ticketId });
    if (!ticket) return res.status(404).json({ success: false });

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
};

// 3. Fetch all tickets for Sales Support Dashboard
export const getAllTickets = async (req, res) => {
  try {
    const tickets = await ChatbotTicket.find().sort({ updatedAt: -1 }).lean().maxTimeMS(5000);
    return res.status(200).json({ success: true, tickets: tickets || [] });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return res.status(200).json({ success: true, tickets: [] });
  }
};

// 4. Send Live CSR Reply (Auto Switch to Human Mode)
export const sendCSRReply = async (req, res) => {
  try {
    const { ticketId, text, attachment } = req.body;
    const ticket = await ChatbotTicket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    
    // Dagdag message mula sa CSR
    ticket.messages.push({
      sender: "csr",
      text: text || "",
      attachment: attachment || "",
      time: timeString,
    });
    
    // AUTOMATIC: Lilipat mula AI Mode papuntang Human Mode
    ticket.status = "human";
    await ticket.save();

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error sending CSR reply" });
  }
};

// 5. Update Ticket Status (Resolved, AI, or Human)
export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, closingMessage } = req.body;
    const ticket = await ChatbotTicket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (status) {
      ticket.status = status;
    }

    if (closingMessage) {
      ticket.messages.push({
        sender: "system",
        text: closingMessage,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    await ticket.save();

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error updating ticket status" });
  }
};

// 6. Delete Support Ticket
export const deleteTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    await ChatbotTicket.findOneAndDelete({ ticketId });
    return res.status(200).json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error deleting ticket" });
  }
};

// 7. Get Customer Active/Latest Conversation Ticket by User ID
export const getUserActiveTicket = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    // Try finding active unresolved conversation first
    let ticket = await ChatbotTicket.findOne({
      userId,
      status: { $ne: "resolved" },
    }).sort({ updatedAt: -1 });

    // Fallback to latest ticket for this user
    if (!ticket) {
      ticket = await ChatbotTicket.findOne({ userId }).sort({ updatedAt: -1 });
    }

    if (!ticket) {
      return res.status(200).json({ success: true, ticket: null });
    }

    return res.status(200).json({ success: true, ticket });
  } catch (error) {
    console.error("Error fetching user active ticket:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving conversation" });
  }
};

// 8. Get All Support Tickets for a Specific Customer (Desktop Messenger History)
export const getUserTickets = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const tickets = await ChatbotTicket.find({ userId }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, tickets: tickets || [] });
  } catch (error) {
    console.error("Error fetching user tickets history:", error);
    return res.status(500).json({ success: false, message: "Server error retrieving user tickets" });
  }
};