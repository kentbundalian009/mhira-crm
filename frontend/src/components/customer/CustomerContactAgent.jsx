import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  MoreVertical,
  CheckCircle2,
  RotateCcw,
  Paperclip,
  Search,
  Phone,
  Clock,
  ShieldCheck,
  ShoppingBag,
  Truck,
  ChevronRight,
  X,
  Bot,
  Headset,
  ShieldAlert,
  Loader2,
  MessageSquare,
  ArrowRight,
  HelpCircle,
  Package,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../../axios";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showErrorToast, showSuccessToast } from "../../utils/toast";
import { compressImageToBase64 } from "../../utils/imageCompressor";
import { useAppData } from "../../context/AppDataContext";

const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

const FAQ_PREVIEWS = [
  {
    q: "How long does shipping take?",
    a: "Metro Manila: 1-3 business days. Greater Manila: 2-4 business days. Provincial Luzon, Visayas & Mindanao: 4-7 business days.",
  },
  {
    q: "Is Cash on Delivery (COD) supported?",
    a: "Yes! Cash on Delivery is available nationwide across the Philippines. You only pay the courier upon parcel arrival.",
  },
  {
    q: "What is your return and refund policy?",
    a: "We offer a 7-day return and replacement policy for items with factory defects or transit damage. Please have photos or an unboxing video ready.",
  },
  {
    q: "Are Mhira products FDA-notified and safe?",
    a: "Yes, 100%. All Mhira cosmetic products strictly follow Good Manufacturing Practices (GMP) and hold valid FDA cosmetic notifications.",
  },
];

function CustomerContactAgent() {
  const navigate = useNavigate();
  const appData = useAppData();

  // Active User Authentication
  let activeUser = null;
  try {
    activeUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    activeUser = null;
  }
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const isLoggedIn = Boolean(token && (appData?.user || activeUser));
  const activeUserId =
    (appData?.user?._id || appData?.user?.id) || activeUser?._id || activeUser?.id || "";
  const activeCustomerName =
    appData?.user?.name || appData?.user?.username || activeUser?.name || activeUser?.username || "Mhira Customer";
  const activeCustomerEmail = appData?.user?.email || activeUser?.email || "customer@mhira.shop";

  // Sidebar Tabs matching Notifications & Collection layout
  const tabs = ["Live Support", "Order Inquiries", "Past Tickets", "Help & FAQs"];
  const [activeTab, setActiveTab] = useState("Live Support");

  // Messenger Main States
  const [ticketId, setTicketId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isHumanMode, setIsHumanMode] = useState(false);
  const [ticketsHistory, setTicketsHistory] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Search & Filter for past tickets
  const [threadSearch, setThreadSearch] = useState("");

  // Header Dropdown & End Task
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [endingTask, setEndingTask] = useState(false);

  // File Attachment & Order context
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [attachedOrder, setAttachedOrder] = useState(null);
  const [isOrderSelectModalOpen, setIsOrderSelectModalOpen] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState(null);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Quick inquiry prompt choices (Cookie Consent button style)
  const promptChoices = [
    "Product questions",
    "Order questions",
    "Delivery & Courier tracking",
    "Talk to Logistics Staff",
  ];

  // 1. Redirect if not logged in & ensure page starts at the top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);

  // 2. Fetch User Conversation History & Tickets
  const fetchUserConversation = async () => {
    if (!activeUserId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chatbot/user-ticket/${activeUserId}`);
      const data = await res.json();
      if (data.success && data.ticket) {
        setTicketId(data.ticket.ticketId);
        if (data.ticket.status === "human") setIsHumanMode(true);
        const formatted = (data.ticket.messages || []).map((m, idx) => ({
          id: idx,
          sender: m.sender,
          text: m.text,
          attachment: m.attachment,
          orderData: m.orderData || null,
          time: m.time,
        }));
        setMessages(formatted);
      } else {
        const cachedId = localStorage.getItem(`mhira_chat_ticket_${activeUserId}`);
        if (cachedId) {
          const tRes = await fetch(`${API_BASE_URL}/api/chatbot/ticket/${cachedId}`);
          const tData = await tRes.json();
          if (tData.success && tData.ticket) {
            setTicketId(tData.ticket.ticketId);
            if (tData.ticket.status === "human") setIsHumanMode(true);
            const formatted = (tData.ticket.messages || []).map((m, idx) => ({
              id: idx,
              sender: m.sender,
              text: m.text,
              attachment: m.attachment,
              orderData: m.orderData || null,
              time: m.time,
            }));
            setMessages(formatted);
          }
        }
      }

      const histRes = await fetch(`${API_BASE_URL}/api/chatbot/user-tickets/${activeUserId}`);
      const histData = await histRes.json();
      if (histData.success && Array.isArray(histData.tickets)) {
        setTicketsHistory(histData.tickets);
      }
    } catch (err) {
      console.error("Error fetching customer tickets:", err);
    }
  };

  // 3. Fetch Customer Orders for context attachment
  const fetchCustomerOrders = async () => {
    if (!activeUserId) return;
    try {
      setLoadingOrders(true);
      const res = await axios.get(`${API_BASE_URL}/api/orders/user/${encodeURIComponent(activeUserId)}`);
      if (Array.isArray(res.data)) {
        setCustomerOrders(res.data);
      }
    } catch (e) {
      console.error("Error fetching orders for chat context:", e);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchUserConversation();
    fetchCustomerOrders();
  }, [activeUserId]);

  // 4. Polling for Live Staff Replies & Status updates
  useEffect(() => {
    if (!ticketId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/chatbot/ticket/${ticketId}`);
        const data = await res.json();
        if (data.success && data.ticket) {
          if (data.ticket.status === "human") {
            setIsHumanMode(true);
          } else if (data.ticket.status === "resolved") {
            setIsHumanMode(false);
          }

          if (data.ticket.messages && data.ticket.messages.length > messages.length) {
            const formatted = data.ticket.messages.map((m, idx) => ({
              id: idx,
              sender: m.sender,
              text: m.text,
              attachment: m.attachment,
              orderData: m.orderData || null,
              time: m.time,
            }));
            setMessages(formatted);
          }
        }
      } catch (e) {
        // quiet error
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [ticketId, messages.length]);

  // Scroll ONLY the internal chat container down on new message, never the whole page
  useEffect(() => {
    if (activeTab === "Live Support" && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading, activeTab]);

  // Handle Image Upload Selection with Compression
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showErrorToast("Please select a valid image file.");
      return;
    }

    try {
      const compressedBase64 = await compressImageToBase64(file, 800, 800, 0.7);
      setSelectedFile(file);
      setFilePreview(compressedBase64);
    } catch (err) {
      console.error("Failed to compress attachment:", err);
      showErrorToast("Error processing image file.");
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Pre-meditated bot reply helper
  const getPremeditatedReply = (msgText) => {
    const lower = msgText.toLowerCase();
    if (lower.includes("product") || lower.includes("serum") || lower.includes("soap")) {
      return "All Mhira Natural personal care items are 100% botanical, FDA-notified, and organic. You can browse our collection or ask our staff for tailored product recommendations.";
    }
    if (lower.includes("delivery") || lower.includes("shipping") || lower.includes("track")) {
      return "Standard delivery takes 1-3 business days within Metro Manila and 4-7 days for provincial addresses. Live tracking is available in 'My Orders'.";
    }
    if (lower.includes("order") || lower.includes("payment") || lower.includes("cod")) {
      return "We accept Cash on Delivery (COD) nationwide, as well as GCash, Maya, and credit cards via PayMongo.";
    }
    if (lower.includes("staff") || lower.includes("human") || lower.includes("agent")) {
      return "Connecting you to our Logistics & Support team. A representative will respond to your inquiry shortly.";
    }
    return "Thank you for reaching out to Mhira Support! How else may our logistics care team assist you today?";
  };

  // Send message handler
  const handleSendMessage = async (textToSend = null) => {
    const messageText = (textToSend || input).trim();
    if (!messageText && !filePreview && !attachedOrder) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let orderDataToSend = null;
    if (attachedOrder) {
      const firstItem = attachedOrder.items?.[0] || {};
      orderDataToSend = {
        orderId: attachedOrder._id || attachedOrder.id,
        orderNumber: attachedOrder._id ? String(attachedOrder._id).slice(-8).toUpperCase() : "ORDER",
        status: attachedOrder.status || "In Transit",
        itemName: firstItem.name || firstItem.itemDescription || "Purchased Product",
        itemImage: firstItem.image || (firstItem.images && firstItem.images[0]) || "/mhira_removebg.png",
        totalAmount: attachedOrder.totalAmount || 0,
        quantity: firstItem.quantity || 1,
        paymentMethod: attachedOrder.paymentMethod || "COD",
        shippingAddress: attachedOrder.shippingAddress || "Registered Delivery Address",
        customerName: attachedOrder.customerName || activeCustomerName,
      };
    }

    const newMsg = {
      id: Date.now(),
      sender: "customer",
      text: messageText,
      attachment: filePreview,
      orderData: orderDataToSend,
      time: now,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setSelectedFile(null);
    setFilePreview(null);
    setAttachedOrder(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);

    try {
      const payload = {
        ticketId: ticketId,
        userId: activeUserId,
        customerName: activeCustomerName,
        customerEmail: activeCustomerEmail,
        message: messageText || (filePreview ? "Sent an image attachment" : "Order Inquiry"),
        attachment: newMsg.attachment,
        orderData: orderDataToSend,
        sender: "customer",
      };

      const res = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (!ticketId && data.ticketId) {
          setTicketId(data.ticketId);
          localStorage.setItem(`mhira_chat_ticket_${activeUserId}`, data.ticketId);
        }
        if (data.status === "human") setIsHumanMode(true);

        const localSmartReply = orderDataToSend
          ? `Order #${orderDataToSend.orderNumber} received. We have forwarded your order inquiry directly to our Logistics Support team.`
          : getPremeditatedReply(messageText);
        const replyText = data.reply || localSmartReply;

        if (replyText) {
          const botMsg = {
            id: Date.now() + 1,
            sender: "ai",
            text: replyText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };
          setMessages((prev) => [...prev, botMsg]);
        }
      }
    } catch (err) {
      console.error("Error communicating with support agent:", err);
      const fallbackReply = orderDataToSend
        ? `Order #${orderDataToSend.orderNumber} received. We have forwarded your order inquiry directly to our Logistics Support team.`
        : getPremeditatedReply(messageText);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: fallbackReply,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // End ticket / task
  const handleEndTask = async () => {
    if (!ticketId) {
      showErrorToast("No active support ticket to end.");
      return;
    }

    try {
      setEndingTask(true);
      const res = await fetch(`${API_BASE_URL}/api/chatbot/ticket/${ticketId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      const data = await res.json();

      if (data.success) {
        showSuccessToast("Support ticket closed successfully.");
        setIsHumanMode(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "system",
            text: "This support ticket has been marked as completed. Thank you for choosing Mhira Natural!",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        localStorage.removeItem(`mhira_chat_ticket_${activeUserId}`);
        setTicketId(null);
        fetchUserConversation();
      }
    } catch (err) {
      console.error("Failed to end task:", err);
      showErrorToast("Failed to close ticket. Please try again.");
    } finally {
      setEndingTask(false);
      setIsHeaderMenuOpen(false);
    }
  };

  // Start new inquiry
  const handleStartNewChat = () => {
    localStorage.removeItem(`mhira_chat_ticket_${activeUserId}`);
    setTicketId(null);
    setMessages([]);
    setIsHumanMode(false);
    setAttachedOrder(null);
    setSelectedFile(null);
    setFilePreview(null);
    setActiveTab("Live Support");
    showSuccessToast("Started new chat inquiry.");
  };

  // Select a past ticket to view
  const handleSelectTicket = (t) => {
    setTicketId(t.ticketId);
    if (t.status === "human") setIsHumanMode(true);
    else setIsHumanMode(false);

    const formatted = (t.messages || []).map((m, idx) => ({
      id: idx,
      sender: m.sender,
      text: m.text,
      attachment: m.attachment,
      orderData: m.orderData || null,
      time: m.time,
    }));
    setMessages(formatted);
    setActiveTab("Live Support");
  };

  // Filtered tickets based on search
  const filteredTickets = useMemo(() => {
    if (!threadSearch.trim()) return ticketsHistory;
    const term = threadSearch.toLowerCase();
    return ticketsHistory.filter(
      (t) =>
        t.ticketId?.toLowerCase().includes(term) ||
        t.subject?.toLowerCase().includes(term) ||
        t.messages?.some((m) => m.text?.toLowerCase().includes(term))
    );
  }, [ticketsHistory, threadSearch]);

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* BREADCRUMB & HEADER (MATCHING NOTIFICATIONS & MY ORDERS DESIGN) */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2 text-slate-400">/</span>
            <span className="text-[#243746] font-medium">Contact Agent</span>
          </nav>

          <div className="flex items-center justify-between border-b border-[#E1E9EF] pb-4">
            <h1 className="text-xl sm:text-2xl font-normal text-[#243746] tracking-tight">
              Support & Contact Agent
            </h1>

            <button
              type="button"
              onClick={handleStartNewChat}
              className="inline-flex items-center gap-1.5 text-xs text-[#01390f] hover:text-[#01250a] font-medium cursor-pointer py-1.5 px-4 rounded-full hover:bg-[#EDF7EE] transition-colors border border-[#d5ead7]"
            >
              <RotateCcw size={14} />
              <span>Start New Inquiry</span>
            </button>
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT MATCHING NOTIFICATIONS */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* ================= LEFT SIDEBAR (CLEAN TEXT-ONLY CATEGORIES MATCHING NOTIFICATIONS) ================= */}
          <aside className="w-full md:w-56 flex-shrink-0 space-y-6">
            <nav className="flex md:flex-col overflow-x-auto scrollbar-none gap-5 sm:gap-6 md:gap-0 pb-2 md:pb-0 md:space-y-0.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`py-1 text-xs sm:text-sm leading-snug transition-colors text-left cursor-pointer shrink-0 md:w-full whitespace-nowrap ${
                      isActive
                        ? "text-[#01390f] font-bold"
                        : "text-[#26332E] hover:text-[#01390f] font-normal"
                    }`}
                  >
                    <span>{tab}</span>
                  </button>
                );
              })}
            </nav>

            {/* Customer Information & Hotline Card in Sidebar */}
            <div className="hidden md:block pt-4 border-t border-[#E1E9EF] space-y-4">
              <div className="bg-[#f8faf8] border border-[#d5ead7] rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#01390f] text-white flex items-center justify-center font-bold text-xs">
                    {activeCustomerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="font-bold text-xs text-slate-800 truncate leading-tight">
                      {activeCustomerName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{activeCustomerEmail}</p>
                  </div>
                </div>
                {ticketId && (
                  <div className="pt-2 border-t border-[#d5ead7] text-[10px] text-slate-500 flex items-center justify-between">
                    <span>Ticket #</span>
                    <span className="font-mono font-bold text-[#01390f]">{ticketId}</span>
                  </div>
                )}
              </div>

              {/* Verified Hotline Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#01390f]" />
                  <span>Mhira Care Hotline</span>
                </div>
                <div className="text-[10px] space-y-1 text-slate-600">
                  <p className="flex items-center gap-1">
                    <Phone size={10} /> +63 917 123 4567
                  </p>
                  <p className="flex items-center gap-1">
                    <Clock size={10} /> Mon - Sat: 8:00 AM - 6:00 PM
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* ================= RIGHT MAIN CONTENT AREA ================= */}
          <section className="flex-1 w-full min-w-0">
            {/* 1. LIVE SUPPORT CHAT INTERFACE */}
            {activeTab === "Live Support" && (
              <div className="bg-white rounded-2xl shadow-xl border border-[#d5ead7] overflow-hidden flex flex-col h-[650px] max-h-[85vh]">
                {/* Chat Header (Strictly CHAT with End Task menu) */}
                <div className="bg-[#01390f] px-5 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-[#012a0b]">
                  <div className="flex items-center gap-3">
                    <h2 id="support-chat-title" className="font-bold text-sm tracking-wider text-white uppercase">
                      CHAT
                    </h2>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-emerald-200 font-medium">
                      {isHumanMode ? "Staff Connected" : "Mhira Logistics Desk"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* 3-Dot Options Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                        className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                        title="Chat Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isHeaderMenuOpen && (
                        <div className="absolute right-0 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-700 animate-in fade-in duration-150">
                          <button
                            type="button"
                            disabled={endingTask}
                            onClick={handleEndTask}
                            className="w-full px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-semibold transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>End Task</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleStartNewChat}
                            className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>Start New Inquiry</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages Stream */}
                <div
                  ref={chatContainerRef}
                  className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-[#f8faf8] custom-scrollbar"
                >
                  {/* Today Badge */}
                  <div className="flex justify-center">
                    <span className="bg-slate-200/80 text-slate-600 text-[11px] px-3 py-0.5 rounded-full font-medium">
                      Today
                    </span>
                  </div>

                  {/* Safety Tip Banner */}
                  <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-start gap-2.5 text-amber-900 text-xs shadow-2xs">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Safety Notice:</strong> For your security, keep all payment confirmations and shipping verifications inside the official Mhira portal.
                    </p>
                  </div>

                  {/* Initial Welcome Intro Card with Cookie Button Options */}
                  <div className="bg-white border border-[#d5ead7] rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-[#01390f]" />
                        <span className="text-xs font-bold text-slate-800">Mhira Bot</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Live</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Hi there, <strong>{activeCustomerName}</strong>! I'm <strong>Mhira Bot</strong>. Please select one of the options below or message us directly so I can connect you to the right Logistics Specialist.
                    </p>

                    {/* Quick Inquiries Pills (Exact Cookie Consent Reject All Style) */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#01390f] block">
                        What can we help with?
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {promptChoices.map((choice, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendMessage(choice)}
                            disabled={loading}
                            className="px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#d5ead7] shadow-xs active:scale-[0.99] transition-all cursor-pointer text-left disabled:opacity-50"
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Message Bubbles */}
                  {messages.map((msg, index) => {
                    const isCust = msg.sender === "customer";
                    const isCsr = msg.sender === "csr";
                    const isSystem = msg.sender === "system";

                    if (isSystem) {
                      return (
                        <div key={index} className="flex justify-center my-2">
                          <span className="bg-slate-200/70 border border-slate-300/40 text-slate-600 text-[11px] px-3.5 py-1 rounded-full font-medium tracking-tight shadow-2xs text-center max-w-[85%]">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className={`flex ${isCust ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-2xs text-xs flex flex-col gap-2 ${
                            isCust
                              ? "bg-[#01390f] text-white rounded-tr-none"
                              : isCsr
                              ? "bg-amber-600 text-white rounded-tl-none"
                              : "bg-white border border-[#d5ead7] text-slate-800 rounded-tl-none"
                          }`}
                        >
                          {/* Attached Order Card in Message */}
                          {msg.orderData && (
                            <div className="bg-white text-slate-900 rounded-xl p-3 border border-emerald-200/80 shadow-xs space-y-2 text-left">
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <span className="font-bold text-[#01390f] text-xs">
                                  Order #{msg.orderData.orderNumber}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#01390f] border border-emerald-200">
                                  {msg.orderData.status}
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <img
                                  src={msg.orderData.itemImage}
                                  alt={msg.orderData.itemName}
                                  className="w-12 h-12 rounded-lg object-cover bg-slate-50 border border-slate-200 shrink-0"
                                  onError={(e) => {
                                    e.target.src = "/mhira_removebg.png";
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-xs text-slate-900 truncate">
                                    {msg.orderData.itemName}
                                  </p>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Qty: {msg.orderData.quantity} •{" "}
                                    <strong className="text-[#01390f]">
                                      ₱{Number(msg.orderData.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </strong>
                                  </p>
                                </div>
                              </div>

                              <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                                <span>{msg.orderData.paymentMethod || "COD"}</span>
                                <span className="truncate max-w-[150px]">{msg.orderData.shippingAddress}</span>
                              </div>
                            </div>
                          )}

                          {/* Image Attachment Preview */}
                          {msg.attachment && (
                            <div className="rounded-lg overflow-hidden bg-black/10 max-h-64 border border-white/20">
                              <img
                                src={msg.attachment}
                                alt="Attachment"
                                className="w-full h-full object-cover max-h-64 cursor-pointer hover:opacity-95"
                                onClick={() => setPreviewModalImg(msg.attachment)}
                              />
                            </div>
                          )}

                          {/* Text Message Content */}
                          {msg.text && (
                            <p className="leading-relaxed whitespace-pre-line text-[12px]">{msg.text}</p>
                          )}

                          <span
                            className={`text-[10px] text-right font-medium ${
                              isCust || isCsr ? "text-white/70" : "text-slate-400"
                            }`}
                          >
                            {isCsr ? `Logistics Staff • ${msg.time}` : msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 text-slate-500 text-xs rounded-2xl rounded-tl-none px-4 py-2.5 shadow-2xs flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-[#01390f] animate-spin" />
                        <span>Preparing reply...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Attached Order Banner Before Sending */}
                {attachedOrder && (
                  <div className="p-3 bg-emerald-50 border-t border-emerald-200 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-white border border-emerald-300 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 text-[#01390f]" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-[#01390f] truncate">
                          Attached: Order #{attachedOrder._id ? String(attachedOrder._id).slice(-8).toUpperCase() : "ORDER"}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {attachedOrder.items?.[0]?.name || "Product"} • ₱{Number(attachedOrder.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedOrder(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* File Attachment Preview Banner Before Sending */}
                {filePreview && (
                  <div className="px-4 py-2.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs text-[#01390f]">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img src={filePreview} alt="Preview" className="w-9 h-9 rounded object-cover border border-emerald-300" />
                      <span className="truncate text-xs font-medium">{selectedFile?.name || "Image attachment"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="text-rose-600 hover:text-rose-700 font-bold p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Input Bar & Actions (Cookie UI Consistent) */}
                <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-2 focus-within:border-[#01390f] focus-within:bg-white transition"
                  >
                    {/* File Attachment Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 text-slate-400 hover:text-[#01390f] transition cursor-pointer"
                      title="Attach photo/file"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Attach Order Trigger Button (Cookie Reject All Style) */}
                    <button
                      type="button"
                      onClick={() => setIsOrderSelectModalOpen(true)}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#01390f] bg-[#EDF7EE] hover:bg-[#d8eed9] border border-[#d5ead7] rounded-full transition cursor-pointer active:scale-99"
                      title="Inquire about an order"
                    >
                      <ShoppingBag size={12} />
                      <span>Attach Order</span>
                    </button>

                    {/* Text Input */}
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        isHumanMode
                          ? "Message live logistics representative..."
                          : "Type your inquiry or choose an option above..."
                      }
                      className="flex-1 bg-transparent outline-none text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 px-2"
                    />

                    {/* Send Button (Cookie Accept All Style) */}
                    <button
                      type="submit"
                      disabled={(!input.trim() && !filePreview && !attachedOrder) || loading}
                      className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                        (input.trim() || filePreview || attachedOrder) && !loading
                          ? "bg-[#01390f] hover:bg-[#0a5219] text-white shadow-md active:scale-[0.99] cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* 2. ORDER INQUIRIES TAB (SELECT ANY ORDER TO INQUIRE) */}
            {activeTab === "Order Inquiries" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E1E9EF]">
                  <h2 className="text-base font-bold text-[#243746]">
                    Your Orders for Support Inquiry
                  </h2>
                  <span className="text-xs text-slate-400">
                    {customerOrders.length} {customerOrders.length === 1 ? "order" : "orders"}
                  </span>
                </div>

                {loadingOrders ? (
                  <div className="py-20 text-center text-xs text-slate-400">Loading orders...</div>
                ) : customerOrders.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center bg-slate-50/60 rounded-2xl border border-slate-200 p-8">
                    <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-600 font-semibold text-sm mb-1">No orders found.</p>
                    <p className="text-slate-400 text-xs mb-4">You have not placed any orders yet.</p>
                    <Link
                      to="/collection"
                      className="px-5 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99]"
                    >
                      Browse Products
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customerOrders.map((ord) => {
                      const shortId = ord._id ? String(ord._id).slice(-8).toUpperCase() : "ORDER";
                      const firstItem = ord.items?.[0] || {};

                      return (
                        <div
                          key={ord._id}
                          className="bg-white border border-[#d5ead7] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition"
                        >
                          <div className="flex items-center gap-3.5">
                            <img
                              src={firstItem.image || (firstItem.images && firstItem.images[0]) || "/mhira_removebg.png"}
                              alt={firstItem.name || "Item"}
                              className="w-14 h-14 rounded-xl object-cover bg-slate-50 border border-slate-200 shrink-0"
                              onError={(e) => {
                                e.target.src = "/mhira_removebg.png";
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#01390f] text-sm">Order #{shortId}</span>
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EDF7EE] text-[#01390f] border border-[#d5ead7]">
                                  {ord.status || "In Transit"}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                                {firstItem.name || "Purchased Product"}
                                {ord.items?.length > 1 ? ` (+${ord.items.length - 1} more items)` : ""}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Total: <strong className="text-[#01390f]">₱{Number(ord.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> • {ord.paymentMethod || "COD"}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setAttachedOrder(ord);
                              setActiveTab("Live Support");
                              showSuccessToast(`Order #${shortId} attached to Live Support.`);
                            }}
                            className="px-4 py-2 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[11px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer whitespace-nowrap text-center"
                          >
                            Inquire with Agent
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. PAST TICKETS TAB */}
            {activeTab === "Past Tickets" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E1E9EF]">
                  <h2 className="text-base font-bold text-[#243746]">
                    Your Support Tickets & History
                  </h2>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={threadSearch}
                      onChange={(e) => setThreadSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#01390f]"
                    />
                  </div>
                </div>

                {filteredTickets.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center bg-slate-50/60 rounded-2xl border border-slate-200 p-8">
                    <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-600 font-semibold text-sm mb-1">No tickets found.</p>
                    <p className="text-slate-400 text-xs mb-4">Your resolved support conversations will appear here.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("Live Support")}
                      className="px-5 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer"
                    >
                      Start a Conversation
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTickets.map((t) => {
                      const isResolved = t.status === "resolved";
                      const lastMsg = t.messages?.[t.messages.length - 1]?.text || t.subject || "Order Inquiry";

                      return (
                        <div
                          key={t._id || t.ticketId}
                          className="bg-white border border-[#d5ead7] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs hover:shadow-xs transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#01390f] text-sm">
                                {t.ticketId || "Support Ticket"}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  isResolved
                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                    : "bg-[#EDF7EE] text-[#01390f] border-[#d5ead7]"
                                }`}
                              >
                                {isResolved ? "Resolved" : t.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-800 line-clamp-1 mt-1">
                              {t.subject || "General Inquiry"}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {lastMsg}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Updated on {new Date(t.updatedAt || t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectTicket(t)}
                            className="px-4 py-2 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#d5ead7] text-[11px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer whitespace-nowrap text-center"
                          >
                            View Conversation
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. HELP & FAQS TAB */}
            {activeTab === "Help & FAQs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E1E9EF]">
                  <h2 className="text-base font-bold text-[#243746]">
                    Frequently Asked Logistics & Store Inquiries
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab("Live Support")}
                    className="text-xs font-bold text-[#01390f] hover:underline cursor-pointer"
                  >
                    Need Live Agent? Chat Now ➔
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {FAQ_PREVIEWS.map((faq, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-[#d5ead7] rounded-2xl p-4 shadow-2xs space-y-2 hover:border-[#01390f]/40 transition"
                    >
                      <h3 className="font-bold text-xs text-slate-800 flex items-start gap-2">
                        <HelpCircle size={15} className="text-[#01390f] shrink-0 mt-0.5" />
                        <span>{faq.q}</span>
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed pl-5.5">
                        {faq.a}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab("Live Support")}
                    className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer"
                  >
                    Connect with Live Specialist
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL: SELECT ORDER TO INQUIRE */}
      {isOrderSelectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-[#d5ead7] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Select Order for Support Inquiry
              </h3>
              <button
                type="button"
                onClick={() => setIsOrderSelectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
              {customerOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No orders found to attach.
                </div>
              ) : (
                customerOrders.map((ord) => {
                  const shortId = ord._id ? String(ord._id).slice(-8).toUpperCase() : "ORDER";
                  const firstItem = ord.items?.[0] || {};
                  return (
                    <div
                      key={ord._id}
                      onClick={() => {
                        setAttachedOrder(ord);
                        setIsOrderSelectModalOpen(false);
                        showSuccessToast(`Attached Order #${shortId}`);
                      }}
                      className="p-3 border border-[#d5ead7] hover:border-[#01390f] hover:bg-[#EDF7EE] rounded-xl flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={firstItem.image || (firstItem.images && firstItem.images[0]) || "/mhira_removebg.png"}
                          alt={firstItem.name || "Item"}
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                          onError={(e) => {
                            e.target.src = "/mhira_removebg.png";
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">
                            #{shortId} • {ord.status || "In Transit"}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {firstItem.name || "Product"} (Qty: {firstItem.quantity || 1})
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#01390f] shrink-0 ml-2">
                        ₱{Number(ord.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMAGE PREVIEW MODAL */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewModalImg(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-3 right-3 text-white bg-black/60 rounded-full p-1.5 hover:bg-black cursor-pointer"
            >
              <X size={18} />
            </button>
            <img src={previewModalImg} alt="Preview Attachment" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default CustomerContactAgent;
