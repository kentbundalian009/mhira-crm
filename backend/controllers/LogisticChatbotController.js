import { GoogleGenAI } from "@google/genai";
import ChatbotTicket from "../models/LogisticChatbotTicket.js";
import Collection from "../models/MarketingCollection.js";
import dotenv from "dotenv";

dotenv.config();

const MAX_AI_PRODUCT_QUESTIONS = 5;

const getGeminiClient = () => {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    return null;
  }
};

// Lightweight 2-minute in-memory cache of live Mhira products for fast AI grounding
let cachedCatalog = { items: [], fetchedAt: 0 };
const getProductCatalog = async () => {
  const now = Date.now();
  if (cachedCatalog.items.length > 0 && now - cachedCatalog.fetchedAt < 120000) {
    return cachedCatalog.items;
  }
  try {
    const items = await Collection.find({
      isArchived: { $ne: true },
      isPublished: { $ne: false },
    })
      .select("itemDescription category navbarTag price quantity description benefits")
      .limit(60)
      .lean()
      .maxTimeMS(3000);
    cachedCatalog = { items: items || [], fetchedAt: now };
    return cachedCatalog.items;
  } catch (err) {
    return cachedCatalog.items || [];
  }
};

const buildLocalProductFallback = (question, products) => {
  const lower = String(question || "").toLowerCase();
  const stopWords = new Set(["the", "and", "for", "with", "about", "what", "how", "much", "ano", "magkano", "meron", "ba", "kayo", "po", "ang", "mga", "sa", "ng", "product", "products"]);
  const tokens = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const scored = (products || [])
    .map((p) => {
      const hay = `${p.itemDescription || ""} ${p.category || ""} ${p.navbarTag || ""} ${p.description || ""}`.toLowerCase();
      const score = tokens.reduce((acc, tok) => acc + (hay.includes(tok) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length > 0) {
    const lines = scored.map(({ p }) => {
      const price = Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
      const stockLabel = Number(p.quantity ?? 1) > 0 ? "In Stock" : "Out of Stock";
      return `• ${p.itemDescription} (${p.category || p.navbarTag || "Botanical Care"}) — ₱${price} [${stockLabel}]`;
    });
    return `Here are the matching Mhira products from our catalog:\n\n${lines.join("\n")}\n\nYou can view full details and ingredients under Our Collection.`;
  }

  const featured = (products || []).slice(0, 3).map((p) => {
    const price = Number(p.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    return `• ${p.itemDescription} — ₱${price}`;
  });
  return `Welcome to Mhira Product AI. I can assist you with our organic soaps, serums, lotions, and hair care products.\n${
    featured.length > 0 ? `\nPopular selections:\n${featured.join("\n")}\n` : ""
  }\nFeel free to ask about a specific product name, skin concern, or price.`;
};

const askProductAI = async (question, products) => {
  const ai = getGeminiClient();
  if (!ai) {
    return buildLocalProductFallback(question, products);
  }

  const catalogLines = (products || [])
    .slice(0, 45)
    .map((p) => {
      const price = Number(p.price || 0).toFixed(2);
      const stock = Number(p.quantity ?? 1) > 0 ? "In Stock" : "Out of Stock";
      return `- ${p.itemDescription} | Category: ${p.category || p.navbarTag || "Botanical"} | Price: PHP ${price} | ${stock}`;
    })
    .join("\n");

  const prompt = `You are Mhira Product AI Assistant for "Mhira Natural Soap & Cosmetics" (Philippines).
STRICT RULES:
1. Answer ONLY questions related to Mhira Natural products (soaps, serums, lotions, skincare, hair care, ingredients, benefits, usage, pricing, recommendations).
2. Use ONLY the live product catalog below when quoting product names and prices. Never invent products or prices.
3. If the user asks anything unrelated to Mhira products (e.g., math, coding, general trivia, politics, or order tracking/refunds), politely state that you only handle Mhira product questions and invite them to switch the topic dropdown to "Order Inquiry & Live Agent".
4. Keep replies concise (2-5 short lines), professional, warm, and match the user's language (English or Taglish). Do NOT use emojis.

LIVE MHIRA PRODUCT CATALOG:
${catalogLines || "Organic soaps, brightening serums, botanical body lotions, and natural hair care."}

CUSTOMER QUESTION: ${question}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = (response?.text || "").trim();
    if (text) return text;
  } catch (err) {
    console.warn("[Chatbot Product AI] Gemini fallback triggered:", err.message || err);
  }

  return buildLocalProductFallback(question, products);
};

// 1. Customer Chat Logic (Guided 3-Mode: Product AI with Limit + Inquiry + Live Human CSR)
export const handleCustomerChat = async (req, res) => {
  try {
    const { message, ticketId, attachment, orderData, userId, customerName, chatMode = "" } = req.body;

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

    const normalizedMode = ["product_ai", "inquiry", "agent"].includes(chatMode)
      ? chatMode
      : orderData
      ? "inquiry"
      : "";

    // Create new ticket if not yet existing
    if (!currentTicket) {
      const generatedId = `TCK-${Date.now().toString().slice(-6)}`;
      currentTicket = new ChatbotTicket({
        ticketId: generatedId,
        userId: userId || "",
        customerName: customerName || orderData?.customerName || "Mhira Customer",
        subject: orderData
          ? `Order #${orderData.orderNumber || "INQUIRY"}`
          : normalizedMode === "product_ai"
          ? `Product AI: ${(message || "Inquiry").slice(0, 28)}`
          : (message || "Customer Inquiry").slice(0, 35),
        status: orderData || normalizedMode === "agent" || normalizedMode === "inquiry" ? "human" : "ai",
        chatMode: normalizedMode,
        aiQuestionCount: 0,
        messages: [],
      });
    } else {
      if (userId && !currentTicket.userId) {
        currentTicket.userId = userId;
      }
      if (customerName && currentTicket.customerName === "Guest Customer") {
        currentTicket.customerName = customerName;
      }
      if (normalizedMode) {
        currentTicket.chatMode = normalizedMode;
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
    const aiUsed = Number(currentTicket.aiQuestionCount || 0);
    const aiRemaining = Math.max(0, MAX_AI_PRODUCT_QUESTIONS - aiUsed);

    // 🟢 1. ORDER INQUIRY (PRIORITY #1 -> HUMAN LOGISTICS SUPPORT)
    if (
      orderData ||
      lower.includes("order inquiry") ||
      lower.includes("[order inquiry") ||
      lower.includes("order number") ||
      (lower.includes("order #") && (lower.includes("status:") || lower.includes("total:")))
    ) {
      currentTicket.status = "human";
      currentTicket.chatMode = "inquiry";
      const orderNumStr = orderData?.orderNumber ? `#${orderData.orderNumber}` : "details";
      const inquiryAckMsg = `Order ${orderNumStr} received! We have forwarded your inquiry to our Logistics Support team. How can we assist you with this order today?`;

      currentTicket.messages.push({ sender: "ai", text: inquiryAckMsg, time: timeString });
      await currentTicket.save();

      return res.status(200).json({
        success: true,
        reply: inquiryAckMsg,
        status: "human",
        chatMode: "inquiry",
        aiQuestionsRemaining: aiRemaining,
        aiLimit: MAX_AI_PRODUCT_QUESTIONS,
        ticketId: currentTicket.ticketId,
        messages: currentTicket.messages,
      });
    }

    // 🟢 2. LIVE AGENT OR GENERAL INQUIRY MODE -> ROUTE DIRECTLY TO HUMAN SUPPORT (0 AI QUOTA USED)
    const isRequestingAgent =
      normalizedMode === "agent" ||
      normalizedMode === "inquiry" ||
      lower.includes("human agent") ||
      lower.includes("talk to human") ||
      lower.includes("live agent") ||
      lower.includes("speak with a human") ||
      lower.includes("csr") ||
      lower.includes("representative") ||
      lower.includes("kausap");

    if (isRequestingAgent) {
      const wasHuman = currentTicket.status === "human" && currentTicket.messages.length > 2;
      currentTicket.status = "human";

      if (!wasHuman) {
        const ackMsg =
          normalizedMode === "inquiry"
            ? "Thank you for your inquiry. Your message has been forwarded to our Mhira Support team. A representative will reply to you here shortly."
            : "Connecting you to a Live Mhira Support Agent. Our staff has received your message and will assist you shortly. You may also attach photos or order details here.";
        currentTicket.messages.push({ sender: "ai", text: ackMsg, time: timeString });
        await currentTicket.save();

        return res.status(200).json({
          success: true,
          reply: ackMsg,
          status: "human",
          chatMode: currentTicket.chatMode || "agent",
          aiQuestionsRemaining: aiRemaining,
          aiLimit: MAX_AI_PRODUCT_QUESTIONS,
          ticketId: currentTicket.ticketId,
          messages: currentTicket.messages,
        });
      }

      await currentTicket.save();
      return res.status(200).json({
        success: true,
        reply: null,
        status: "human",
        chatMode: currentTicket.chatMode || "agent",
        aiQuestionsRemaining: aiRemaining,
        aiLimit: MAX_AI_PRODUCT_QUESTIONS,
        ticketId: currentTicket.ticketId,
        messages: currentTicket.messages,
      });
    }

    // 🟢 3. IF ALREADY IN HUMAN MODE AND NOT EXPLICITLY SWITCHED TO PRODUCT AI
    if (currentTicket.status === "human" && normalizedMode !== "product_ai") {
      await currentTicket.save();
      return res.status(200).json({
        success: true,
        reply: null,
        status: "human",
        chatMode: currentTicket.chatMode || "agent",
        aiQuestionsRemaining: aiRemaining,
        aiLimit: MAX_AI_PRODUCT_QUESTIONS,
        ticketId: currentTicket.ticketId,
        messages: currentTicket.messages,
      });
    }

    // 🟢 4. PRODUCT AI MODE (STRICT PRODUCT-ONLY + 5 QUESTIONS LIMIT PER SESSION)
    if (aiUsed >= MAX_AI_PRODUCT_QUESTIONS) {
      const limitMsg = `You have reached the limit of ${MAX_AI_PRODUCT_QUESTIONS} AI product questions for this session.\nFor further assistance, please switch the topic to "Order Inquiry & Live Agent" below.`;
      currentTicket.messages.push({ sender: "ai", text: limitMsg, time: timeString });
      await currentTicket.save();

      return res.status(200).json({
        success: true,
        reply: limitMsg,
        status: currentTicket.status,
        chatMode: "product_ai",
        limitReached: true,
        aiQuestionsRemaining: 0,
        aiLimit: MAX_AI_PRODUCT_QUESTIONS,
        ticketId: currentTicket.ticketId,
        messages: currentTicket.messages,
      });
    }

    currentTicket.status = "ai";
    currentTicket.chatMode = "product_ai";
    currentTicket.aiQuestionCount = aiUsed + 1;

    const products = await getProductCatalog();
    const aiReply =
      attachment && !message
        ? "Thank you for sharing the image! Please type your question about this product, or switch to 'Talk to Live Agent' for order/support help."
        : await askProductAI(message, products);

    currentTicket.messages.push({ sender: "ai", text: aiReply, time: timeString });
    await currentTicket.save();

    return res.status(200).json({
      success: true,
      reply: aiReply,
      status: "ai",
      chatMode: "product_ai",
      limitReached: currentTicket.aiQuestionCount >= MAX_AI_PRODUCT_QUESTIONS,
      aiQuestionsRemaining: Math.max(0, MAX_AI_PRODUCT_QUESTIONS - currentTicket.aiQuestionCount),
      aiLimit: MAX_AI_PRODUCT_QUESTIONS,
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