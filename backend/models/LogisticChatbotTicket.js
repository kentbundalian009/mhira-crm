import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ["customer", "ai", "csr", "system"],
    required: true,
  },
  text: {
    type: String,
    default: "",
  },
  attachment: {
    type: String,
    default: "",
  },
  orderData: {
    type: Object,
    default: null,
  },
  time: {
    type: String,
    required: true,
  },
});

const chatbotTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      default: "",
    },
    customerName: {
      type: String,
      default: "Guest Customer",
    },
    subject: {
      type: String,
      default: "General Soap & Cosmetics Inquiry",
    },
    status: {
      type: String,
      enum: ["ai", "human", "resolved"],
      default: "ai",
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

// High-performance database query indexes
chatbotTicketSchema.index({ status: 1, createdAt: -1 });
chatbotTicketSchema.index({ userId: 1, createdAt: -1 });

const ChatbotTicket = mongoose.models.ChatbotTicket || mongoose.model("ChatbotTicket", chatbotTicketSchema);

export default ChatbotTicket;