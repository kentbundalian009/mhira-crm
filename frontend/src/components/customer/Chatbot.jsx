import { API_BASE_URL } from "../../utils/apiConfig";
import React, { useState, useRef, useEffect } from "react";
import { Send, X, Bot, Headset, Paperclip, Smile, ShieldAlert, ChevronRight, ChevronDown, MoreVertical, CheckCircle2, Sparkles, HelpCircle, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios, { API } from "../../axios";
import { showErrorToast } from "../../utils/toast";
import { compressImageToBase64 } from "../../utils/imageCompressor";
import { useAppData } from "../../context/AppDataContext";

function Chatbot({ isOpen: externalOpen }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [isHumanMode, setIsHumanMode] = useState(false);
  const [featuredProduct, setFeaturedProduct] = useState(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [endingTask, setEndingTask] = useState(false);

  // File & Emoji states
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Anti-Spam Rate Limiting & Cooldown Ban State
  // Rule: 10 rapid messages = 30-min ban (1st warning), repeat = 5-hour ban
  const [banInfo, setBanInfo] = useState(() => {
    try {
      const stored = localStorage.getItem("mhira_chat_ban");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.bannedUntil && parsed.bannedUntil > Date.now()) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });
  const [remainingTimeText, setRemainingTimeText] = useState("");
  const recentMsgTimestampsRef = useRef([]);

  // Attached Order Context state
  const [attachedOrder, setAttachedOrder] = useState(null);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Guided 2-Mode Chat Selector + Instant FAQ's Panel
  const AI_QUESTION_LIMIT = 5;
  const [selectedChatMode, setSelectedChatMode] = useState(""); // "" | "product_ai" | "agent"
  const [aiQuestionsRemaining, setAiQuestionsRemaining] = useState(AI_QUESTION_LIMIT);
  const [showFaqPanel, setShowFaqPanel] = useState(false);
  const [expandedFaqId, setExpandedFaqId] = useState(null);

  const chatModeOptions = [
    {
      id: "product_ai",
      label: "AI Assistant",
      shortLabel: "AI Assistant",
      placeholder: "Ask Mhira AI about products, ingredients, or prices...",
      helper: "AI answers Mhira product questions (up to 5 questions per session).",
    },
    {
      id: "agent",
      label: "Order Inquiry",
      shortLabel: "Order Inquiry",
      placeholder: "Type your order inquiry or message our mhira agent...",
      helper: "Connect directly with Mhira Logistics & Customer Support Staff.",
    },
  ];

  const quickFaqs = [
    {
      id: "faq-fda",
      question: "Are Mhira products safe and FDA-notified?",
      answer:
        "Yes! All Mhira Natural Soap & Cosmetics products follow GMP standards, hold FDA cosmetic notifications, and are paraben-free, cruelty-free, and safe for sensitive skin.",
    },
    {
      id: "faq-payments",
      question: "What payment methods do you accept?",
      answer:
        "We accept direct PayMongo checkout (GCash, Maya, Credit/Debit Card, GrabPay, Online Banking BPI/UB, BillEase) and Cash on Delivery (COD) nationwide.",
    },
    {
      id: "faq-delivery",
      question: "How long does shipping and delivery take?",
      answer:
        "Metro Manila / NCR: 1–3 business days. Laguna / Cavite / Rizal / Bulacan: 2–4 business days. Provincial Luzon, Visayas & Mindanao: 4–7 business days.",
    },
    {
      id: "faq-tracking",
      question: "How can I track my order?",
      answer:
        "Go to My Orders (/orders) to view live step-by-step updates (Order Placed → Waiting for Courier → In Transit → Delivered), download your Waybill PDF, or check Process Records.",
    },
    {
      id: "faq-returns",
      question: "How do I request a return or cancel an order?",
      answer:
        "Open My Orders (/orders) and click 'Cancel Order' before courier handover, or 'Return Item' within 7 days of delivery for damaged or wrong items.",
    },
  ];

  const activeModeConfig = chatModeOptions.find((m) => m.id === selectedChatMode) || null;

  const handleSelectChatMode = (modeId) => {
    setSelectedChatMode(modeId);
    setShowFaqPanel(false);
    if (modeId === "agent") {
      setIsHumanMode(true);
    } else if (modeId === "product_ai") {
      setIsHumanMode(false);
    }
  };

  // Quick Emotion Emojis only (clean 5 emotions)
  const quickEmojis = ["😀", "😊", "👍", "❤️", "🙏"];


  const appData = useAppData();
  // Get current logged-in customer info
  let activeUser = null;
  try {
    activeUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch (e) {
    activeUser = null;
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
  const isLoggedIn = Boolean(token && (appData?.user || activeUser));
  const activeUserId = (appData?.user?._id || appData?.user?.id) || activeUser?._id || activeUser?.id || "";
  const activeCustomerName = appData?.user?.name || appData?.user?.username || activeUser?.name || activeUser?.username || "Mhira Customer";

  // Live Countdown Timer for Temporary Chat Ban
  useEffect(() => {
    if (!banInfo || !banInfo.bannedUntil) {
      setRemainingTimeText("");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = banInfo.bannedUntil - now;
      if (diffMs <= 0) {
        setBanInfo(null);
        setRemainingTimeText("");
        try {
          localStorage.removeItem("mhira_chat_ban");
        } catch (e) {}
      } else {
        const totalSecs = Math.ceil(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        if (hrs > 0) {
          setRemainingTimeText(`${hrs}h ${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
        } else {
          setRemainingTimeText(`${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [banInfo]);

  // Check backend ban status on mount
  useEffect(() => {
    const checkBanStatus = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/chatbot/ban-status/${activeUserId || "guest"}`);
        const data = await res.json();
        if (data.success && data.banned && data.bannedUntil > Date.now()) {
          const newBan = {
            bannedUntil: data.bannedUntil,
            offenseCount: data.offenseCount || 1,
            penaltyDuration: data.penaltyDuration || "30 minutes",
          };
          setBanInfo(newBan);
          localStorage.setItem("mhira_chat_ban", JSON.stringify(newBan));
        }
      } catch (err) {}
    };
    checkBanStatus();
  }, [activeUserId]);

  // Load existing ticket & conversation history on login / mount
  useEffect(() => {
    const loadConversationHistory = async () => {
      try {
        let loadedTicket = null;

        // 1. If customer is logged in, fetch from user-ticket API
        if (activeUserId) {
          const res = await fetch(`${API_BASE_URL}/api/chatbot/user-ticket/${activeUserId}`);
          const data = await res.json();
          if (data.success && data.ticket) {
            loadedTicket = data.ticket;
          }
        }

        // 2. Fallback to cached ticketId
        if (!loadedTicket) {
          const cachedId = localStorage.getItem(`mhira_chat_ticket_${activeUserId || "guest"}`);
          if (cachedId) {
            const res = await fetch(`${API_BASE_URL}/api/chatbot/ticket/${cachedId}`);
            const data = await res.json();
            if (data.success && data.ticket) {
              loadedTicket = data.ticket;
            }
          }
        }

        if (loadedTicket) {
          setTicketId(loadedTicket.ticketId);
          if (loadedTicket.status === "human") setIsHumanMode(true);
          if (loadedTicket.chatMode) {
            setSelectedChatMode(loadedTicket.chatMode === "inquiry" ? "agent" : loadedTicket.chatMode);
          } else if (loadedTicket.status === "human") {
            setSelectedChatMode("agent");
          }
          const used = Number(loadedTicket.aiQuestionCount || 0);
          setAiQuestionsRemaining(Math.max(0, AI_QUESTION_LIMIT - used));
          const formattedMsgs = (loadedTicket.messages || []).map((m, idx) => ({
            id: idx,
            sender: m.sender,
            text: m.text,
            attachment: m.attachment,
            orderData: m.orderData || null,
            time: m.time,
          }));
          setMessages(formattedMsgs);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    };

    loadConversationHistory();
  }, [activeUserId, API_BASE_URL]);

  // Listen to openChatbotWithOrder event from My Orders
  useEffect(() => {
    const handleOpenWithOrder = (event) => {
      const order = event.detail?.order;
      if (order) {
        setAttachedOrder(order);
        setSelectedChatMode("agent");
        setShowFaqPanel(false);
        setIsHumanMode(true);
        setIsOpen(true);
      }
    };

    window.addEventListener("openChatbotWithOrder", handleOpenWithOrder);
    return () => {
      window.removeEventListener("openChatbotWithOrder", handleOpenWithOrder);
    };
  }, []);

  // Fetch real product from database
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/collections/public`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          const item = res.data[0];
          setFeaturedProduct({
            id: item._id || item.id,
            name: item.itemDescription || item.name || "Handcrafted Natural Soap",
            price: Number(item.price || 0),
            image: item.image || (item.images && item.images[0]) || "/mhira_removebg.png",
            category: item.category || item.navbarTag || "Natural Botanical",
          });
        }
      } catch (e) {
        console.error("Error fetching featured product:", e);
      }
    };
    fetchFeatured();
  }, [API_BASE_URL]);

  useEffect(() => {
    if (externalOpen) setIsOpen(true);
  }, [externalOpen]);

  // Polling for CSR replies
  useEffect(() => {
    if (!ticketId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/chatbot/ticket/${ticketId}`);
        const data = await res.json();
        if (data.success && data.ticket) {
          if (data.ticket.status === "human") setIsHumanMode(true);

          const formattedMsgs = data.ticket.messages.map((m, idx) => ({
            id: idx,
            sender: m.sender,
            text: m.text,
            attachment: m.attachment,
            orderData: m.orderData || null,
            time: m.time,
          }));
          setMessages(formattedMsgs);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [ticketId, API_BASE_URL]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, filePreview]);

  // Handle File Selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File size must be under 5MB.");
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageToBase64(file, {
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.75,
        });
        setFilePreview(compressed);
      } catch (err) {
        console.error('Failed to compress chatbot attachment:', err);
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
  };

  // End active support task and archive session
  const handleEndTask = async () => {
    setIsHeaderMenuOpen(false);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const endEventMsgs = [
      {
        id: Date.now(),
        sender: "system",
        text: `Logistics Support Staff left • ${nowTime}`,
        time: nowTime,
      },
      {
        id: Date.now() + 1,
        sender: "system",
        text: "Session resolved and saved to your account.",
        time: nowTime,
      },
      {
        id: Date.now() + 2,
        sender: "ai",
        text: "We're glad that we could assist you today! All inquiries have been saved. If you have more questions in the future, don't hesitate to reach out.",
        time: nowTime,
      },
    ];

    if (!ticketId) {
      setMessages((prev) => [...prev, ...endEventMsgs]);
      setIsHumanMode(false);
      return;
    }

    try {
      setEndingTask(true);
      await fetch(`${API_BASE_URL}/api/chatbot/ticket/${ticketId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          closingMessage: `Logistics Support Staff left • ${nowTime}\nSession resolved and saved.`,
        }),
      });

      setIsHumanMode(false);
      setSelectedChatMode("");
      setAiQuestionsRemaining(AI_QUESTION_LIMIT);
      setMessages((prev) => [...prev, ...endEventMsgs]);
      localStorage.removeItem(`mhira_chat_ticket_${activeUserId || "guest"}`);
      setTicketId(null);
    } catch (err) {
      console.error("Error ending task:", err);
      setMessages((prev) => [...prev, ...endEventMsgs]);
      setIsHumanMode(false);
    } finally {
      setEndingTask(false);
    }
  };

  // Smart Pre-meditated responses for instant accuracy
  const getPremeditatedReply = (text) => {
    const lower = text.toLowerCase();
    if (
      lower.includes("order inquiry") ||
      lower.includes("[order inquiry") ||
      lower.includes("order number") ||
      lower.includes("item(s):") ||
      lower.includes("delivery address:") ||
      (lower.includes("order #") && (lower.includes("status:") || lower.includes("total:")))
    ) {
      return "📦 Salamat po sa inyong order inquiry! Na-forward na po namin ang inyong buong order details sa aming Mhira Customer Support & Logistics Staff.\n\nKasalukuyan na pong sinusuri ng aming team ang inyong order at makikipag-ugnayan ang aming live specialist dito sa chat sa ilang sandali lamang. Kung mayroon pa po kayong karagdagang tanong o request (hal. delivery address correction, rider follow-up, o product concern), i-type lamang po ito rito.";
    }
    if (lower.includes("serum") || lower.includes("face serum")) {
      return "Best Face Serum Recommendation:\nOur #1 bestseller is the Mhira Collagen & Vitamin C Brightening Serum (30ml). It boosts skin elasticity, fades dark spots, and provides lightweight 24-hr hydration using pure botanical extracts. Check it out under Our Collection > Skin Care.";
    }
    if (lower.includes("hair") || lower.includes("hair care")) {
      return "Natural Hair Care Tips:\n1. Use our sulfate-free organic shampoo bars to avoid scalp dryness.\n2. Apply pure Coconut & Argan Hair Oil on damp ends for frizz-free shine.\n3. Rinse with lukewarm water to seal hair cuticles.";
    }
    if (lower.includes("lotion") || lower.includes("spf") || lower.includes("body lotion")) {
      return "Body Lotion with SPF:\nWe recommend our Mhira Botanical Whitening Lotion with SPF 30, infused with organic Shea Butter, Niacinamide, and Aloe Vera to shield your skin from UV rays while keeping it smooth all day.";
    }
    if (lower.includes("track") || lower.includes("order")) {
      return "Order Tracking Hub:\nYou can monitor your delivery step-by-step in your My Orders hub (/orders) or review live milestone updates in Store Notifications.";
    }
    if (lower.includes("voucher") || lower.includes("coupon") || lower.includes("promo")) {
      return "Active Mhira Vouchers:\n• ORGANIC10 — 10% OFF all natural products\n• MHIRA50 — ₱50 OFF (Min. spend ₱500)\n• FREESHIP — Free nationwide shipping\nYou can select or enter these codes directly in your Cart summary.";
    }
    if (lower.includes("human") || lower.includes("agent") || lower.includes("csr")) {
      return "Connecting you to a Live Mhira Support Specialist.\nOur staff has received your ticket and will assist you shortly. You may also attach photos or order details here.";
    }
    return null;
  };

  // Send Order Inquiry Details (Rich Card with Image & Full Order Payload)
  const handleSendOrderInquiry = (orderToSend = attachedOrder) => {
    if (!orderToSend) return;
    const firstItem = (orderToSend.items && orderToSend.items[0]) || {};
    const orderIdShort = orderToSend._id ? String(orderToSend._id).slice(-8).toUpperCase() : "ORDER";

    const orderPayload = {
      orderId: orderToSend._id,
      orderNumber: orderIdShort,
      itemName: firstItem.name || firstItem.itemDescription || "Natural Botanical Soap / Cosmetic",
      itemImage: firstItem.image || (firstItem.images && firstItem.images[0]) || "/mhira_removebg.png",
      quantity: firstItem.quantity || 1,
      totalAmount: Number(orderToSend.totalAmount || 0),
      status: orderToSend.status || "Waiting for Courier",
      paymentMethod: orderToSend.paymentMethod || "Cash on Delivery",
      paymentStatus: orderToSend.paymentStatus || "Paid",
      customerName: orderToSend.customerName || orderToSend.userId?.name || "Customer",
      shippingAddress:
        typeof orderToSend.shippingAddress === "object"
          ? Object.values(orderToSend.shippingAddress).filter(Boolean).join(", ")
          : (orderToSend.shippingAddress || "Default Delivery Address"),
    };

    setAttachedOrder(null);
    sendMessage("", orderPayload);
  };

  // Send Message / Attachment / OrderCard
  const sendMessage = async (textToSend = input, orderDataToSend = null) => {
    const text = typeof textToSend === "string" ? textToSend : input;
    const attachmentToSend = filePreview;

    if ((!text.trim() && !attachmentToSend && !orderDataToSend) || loading) return;

    // Check if customer is currently banned by Anti-Spam protection
    if (banInfo && banInfo.bannedUntil > Date.now()) {
      showErrorToast(`Chat temporarily restricted. Cooldown remaining: ${remainingTimeText || "active"}`);
      return;
    }

    // Special quick navigation
    if (text.includes("Track my order")) {
      navigate("/orders");
      setIsOpen(false);
      return;
    }
    if (text.includes("Active Vouchers")) {
      navigate("/cart");
      setIsOpen(false);
      return;
    }

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Client-side Anti-Spam Rapid Burst Tracker (10 messages in 45s)
    const now = Date.now();
    recentMsgTimestampsRef.current = recentMsgTimestampsRef.current.filter((ts) => now - ts < 45000);
    recentMsgTimestampsRef.current.push(now);

    if (recentMsgTimestampsRef.current.length >= 10) {
      const prevOffense = banInfo?.offenseCount || 0;
      const newOffense = prevOffense + 1;
      const banDurationMs = newOffense >= 2 ? 5 * 60 * 60 * 1000 : 30 * 60 * 1000;
      const bannedUntil = now + banDurationMs;
      const penaltyLabel = newOffense >= 2 ? "5 hours (2nd Penalty)" : "30 minutes (1st Warning)";

      const newBanState = {
        bannedUntil,
        offenseCount: newOffense,
        penaltyDuration: newOffense >= 2 ? "5 hours" : "30 minutes",
      };
      setBanInfo(newBanState);
      try {
        localStorage.setItem("mhira_chat_ban", JSON.stringify(newBanState));
      } catch (e) {}

      recentMsgTimestampsRef.current = [];
      const warningSystemMsg = {
        id: Date.now() + 99,
        sender: "system",
        text: `Chat suspended for ${penaltyLabel} due to rapid messaging.`,
        time: userTime,
      };
      setMessages((prev) => [...prev, warningSystemMsg]);
      showErrorToast(`Chat suspended for ${penaltyLabel}.`);
      return;
    }

    const userMsg = {
      id: Date.now(),
      sender: "customer",
      text: text.trim(),
      attachment: attachmentToSend || "",
      orderData: orderDataToSend || null,
      time: userTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    removeSelectedFile();
    setIsEmojiPickerOpen(false);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          attachment: attachmentToSend || "",
          orderData: orderDataToSend || null,
          userId: activeUserId || "",
          customerName: activeCustomerName || "Mhira Customer",
          chatMode: orderDataToSend ? "inquiry" : selectedChatMode,
          ticketId,
        }),
      });

      const data = await response.json();

      // Handle Anti-Spam Ban Response from Backend
      if (response.status === 429 || data.banned) {
        const banDurationMs = data.remainingMs || (data.offenseCount >= 2 ? 5 * 60 * 60 * 1000 : 30 * 60 * 1000);
        const newBanState = {
          bannedUntil: data.bannedUntil || Date.now() + banDurationMs,
          offenseCount: data.offenseCount || 1,
          penaltyDuration: data.penaltyDuration || "30 minutes",
        };
        setBanInfo(newBanState);
        try {
          localStorage.setItem("mhira_chat_ban", JSON.stringify(newBanState));
        } catch (e) {}

        const warningSystemMsg = {
          id: Date.now() + 99,
          sender: "system",
          text: data.error || `Chat suspended for ${data.penaltyDuration || "cooldown"} due to rapid messaging.`,
          time: userTime,
        };
        setMessages((prev) => [...prev, warningSystemMsg]);
        showErrorToast(data.error || "Chat suspended.");
        setLoading(false);
        return;
      }

      if (data.ticketId) {
        setTicketId(data.ticketId);
        localStorage.setItem(`mhira_chat_ticket_${activeUserId || "guest"}`, data.ticketId);
      }
      if (typeof data.aiQuestionsRemaining === "number") {
        setAiQuestionsRemaining(data.aiQuestionsRemaining);
      }

      const lower = text.toLowerCase();
      const isRequestingStaff =
        lower.includes("logistics staff") ||
        lower.includes("talk to human") ||
        lower.includes("human agent") ||
        lower.includes("mhira agent") ||
        lower.includes("representative");

      if (isRequestingStaff) {
        setIsHumanMode(true);
        const nowTime = userTime;
        const nikeMilestones = [
          {
            id: Date.now() + 1,
            sender: "system",
            text: `Transfer requested at ${nowTime}`,
            time: nowTime,
          },
          {
            id: Date.now() + 2,
            sender: "system",
            text: `We're connecting you to an agent. Your estimated wait time is 1 minute. • ${nowTime}`,
            time: nowTime,
          },
          {
            id: Date.now() + 3,
            sender: "system",
            text: `Mhira Bot left • ${nowTime}`,
            time: nowTime,
          },
          {
            id: Date.now() + 4,
            sender: "system",
            text: `Logistics Support Specialist joined • ${nowTime}`,
            time: nowTime,
          },
          {
            id: Date.now() + 5,
            sender: "csr",
            text: "Thanks for connecting with Mhira Logistics. We’re catching up with your messages and we’ll be ready to help soon.",
            time: nowTime,
          },
        ];
        setMessages((prev) => [...prev, ...nikeMilestones]);
      } else {
        if (data.status === "human") setIsHumanMode(true);

        const localSmartReply = orderDataToSend
          ? `Order #${orderDataToSend.orderNumber} received! We have forwarded your inquiry to our Logistics Support team. How can we assist you with this order today?`
          : getPremeditatedReply(text);
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
      console.error("Error communicating with assistant:", err);
      const localSmartReply = orderDataToSend
        ? `Order #${orderDataToSend.orderNumber} received! We have forwarded your inquiry to our Logistics Support team. How can we assist you with this order today?`
        : getPremeditatedReply(text);
      if (localSmartReply) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "ai",
            text: localSmartReply,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <>
      {/* Floating Trigger (Same UI as FAQ'S but says CHAT) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center border-0 ring-0 outline-none select-none"
            aria-label="Open Chat"
            title="Open Chat"
          >
            CHAT
          </button>
        </div>
      )}

      {/* Main Chat Overlay */}
      {isOpen && (
        <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[410px] h-[600px] max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border-0 font-['Poppins',sans-serif] animate-fadeIn">

          {/* 1. Header (Refined Editorial Header — No Decorative Icons or Emojis) */}
          <div className="bg-gradient-to-r from-[#012b0b] via-[#01390f] to-[#0a5219] px-5 py-4 text-white flex items-center justify-between shrink-0 border-b border-white/10">
            <div>
              <h2 id="live-chat-title" className="font-bold text-sm text-white uppercase leading-tight">
                {showFaqPanel ? "MHIRA FAQ's" : "MHIRA CHATBOT"}
              </h2>
              <p className="text-[10px] text-emerald-100/80 font-medium tracking-wide mt-0.5">
                {showFaqPanel ? "Instant Help & Store Policies" : "Product AI & Live Customer Support"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">

              {/* 3-Dot Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                  className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                  title="More Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* 3-Dot Dropdown Menu */}
                {isHeaderMenuOpen && (
                  <div className="absolute right-0 top-9 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in duration-100">
                    <button
                      type="button"
                      disabled={endingTask}
                      onClick={handleEndTask}
                      className="w-full px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>End Task</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                  setIsOpen(false);
                }}
                className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Close Chat"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 2. Chat Stream OR Instant FAQ's View */}
          {showFaqPanel ? (
            <div className="flex-1 p-4 overflow-y-auto bg-[#f6f9f6] space-y-3 custom-scrollbar">
              <div className="bg-white border border-[#d5ead7] rounded-2xl p-4 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#01390f] block">
                  Frequently Asked Questions
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Select a question below for instant information on Mhira products, shipping, payments, and returns.
                </p>
              </div>

              <div className="space-y-2">
                {quickFaqs.map((faq) => {
                  const isOpenFaq = expandedFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className={`bg-white rounded-xl overflow-hidden transition-all border ${isOpenFaq
                        ? "border-[#01390f]/40 shadow-xs"
                        : "border-slate-200/90 hover:border-[#01390f]/25"
                        }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isOpenFaq ? null : faq.id)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-[#EDF7EE]/40 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-slate-800 leading-snug">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-[#01390f] shrink-0 transition-transform duration-200 ${isOpenFaq ? "rotate-180" : ""
                            }`}
                        />
                      </button>
                      {isOpenFaq && (
                        <div className="px-4 pb-3.5 pt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-[#fafcfa]">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectChatMode("product_ai")}
                  className="py-2.5 px-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#01390f]/20 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  AI Assistant
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectChatMode("agent")}
                  className="py-2.5 px-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#01390f]/20 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  Order Inquiry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto bg-[#f6f9f6] space-y-3.5 custom-scrollbar">

              {/* Timestamp Badge */}
              <div className="flex justify-center">
                <span className="bg-slate-200/70 text-slate-600 text-[10px] px-2.5 py-0.5 rounded-full font-medium">
                  Today
                </span>
              </div>

              {/* SAFETY TIP BANNER (CLEAN EDITORIAL CALLOUT — NO DECORATIVE ICONS) */}
              <div className="bg-amber-50/90 border-l-3 border-amber-500 border-y border-r border-amber-200/80 rounded-xl px-3.5 py-2.5 text-amber-950 text-[11px] leading-relaxed shadow-2xs">
                <p>
                  <strong className="font-bold uppercase tracking-wider text-[10px] text-amber-800 mr-1.5">Safety Notice</strong>
                  Transact and track shipments only within the Mhira Natural official portal.
                </p>
              </div>

              {/* INITIAL WELCOME INTRO CARD (AT TOP OF CONVERSATION) */}
              <div className="bg-white border border-[#d5ead7] rounded-2xl p-3 shadow-2xs text-xs text-slate-800 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-[10px] text-slate-500 font-medium">Mhira Bot</span>
                  <span className="text-[10px] text-slate-400">Live</span>
                </div>
                <p className="leading-relaxed">
                  Hi there, <strong>{activeCustomerName}</strong>! I'm <strong>Mhira Bot</strong>. Please select one of the options below so I can connect you to the right Logistics Specialist.
                </p>

                {/* REAL ACCURATE FEATURED PRODUCT CARD */}
                {featuredProduct && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-[#01390f] uppercase tracking-wider block mb-1">
                      Featured Choice
                    </span>
                    <div
                      onClick={() => {
                        navigate(`/product/${featuredProduct.id}`);
                        setIsOpen(false);
                      }}
                      className="bg-white hover:bg-[#EDF7EE] border border-[#d5ead7] hover:border-[#01390f]/40 rounded-xl p-2.5 flex items-center gap-2.5 transition-all cursor-pointer group shadow-2xs"
                    >
                      <img
                        src={featuredProduct.image}
                        alt={featuredProduct.name}
                        className="w-12 h-12 object-cover rounded-lg bg-white border border-slate-100 shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] bg-[#EDF7EE] text-[#01390f] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[#d5ead7]">
                          {featuredProduct.category}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-[#01390f] transition-colors mt-0.5">
                          {featuredProduct.name}
                        </p>
                        <span className="text-xs font-bold text-[#01390f] block mt-0.5">
                          ₱{featuredProduct.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#01390f] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                )}

                {/* GUIDED 2-OPTION DROPDOWN + FAQ'S BUTTON (Clean Editorial Style, No Emojis/Icons) */}
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#01390f] block">
                      Select Assistance Type
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowFaqPanel(true)}
                      className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-[#EDF7EE] text-[#01390f] border border-slate-200 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      View FAQ's
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      value={selectedChatMode}
                      onChange={(e) => handleSelectChatMode(e.target.value)}
                      className="w-full appearance-none bg-[#EDF7EE] hover:bg-[#e1f3e3] border border-[#01390f]/30 text-[#01390f] text-xs font-semibold rounded-xl px-3.5 py-2.5 pr-9 outline-none focus:border-[#01390f] focus:ring-2 focus:ring-[#01390f]/10 cursor-pointer transition-all"
                    >
                      <option value="">-- Choose an option to begin --</option>
                      {chatModeOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#01390f] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {activeModeConfig && (
                    <p className="text-[11px] text-slate-500 leading-snug bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      {activeModeConfig.helper}
                    </p>
                  )}
                </div>
              </div>

              {/* CHAT MESSAGES STREAM */}
              {messages.map((msg, index) => {
                const isCust = msg.sender === "customer";
                const isCsr = msg.sender === "csr";
                const isSystem = msg.sender === "system";

                if (isSystem) {
                  return (
                    <div key={index} className="flex justify-center my-1.5">
                      <span className="bg-slate-200/70 border border-slate-300/40 text-slate-600 text-[10px] px-3 py-0.5 rounded-full font-medium tracking-tight shadow-2xs text-center max-w-[90%]">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={index} className={`flex ${isCust ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs text-xs flex flex-col gap-1.5 ${isCust
                        ? "bg-[#01390f] text-white rounded-tr-none"
                        : isCsr
                          ? "bg-amber-600 text-white rounded-tl-none"
                          : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                        }`}
                    >
                      {/* RICH ORDER CARD IF ATTACHED */}
                      {msg.orderData && (
                        <div className="bg-white text-slate-900 rounded-xl p-2.5 border border-emerald-200/80 shadow-xs space-y-2 text-left">
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                            <span className="font-bold text-[#01390f] text-[11px]">
                              Order #{msg.orderData.orderNumber}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#01390f] border border-emerald-200">
                              {msg.orderData.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <img
                              src={msg.orderData.itemImage}
                              alt={msg.orderData.itemName}
                              className="w-11 h-11 rounded-lg object-cover bg-slate-50 border border-slate-200 shrink-0"
                              onError={(e) => { e.target.src = "/mhira_removebg.png"; }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs text-slate-900 truncate">
                                {msg.orderData.itemName}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Qty: {msg.orderData.quantity} • <strong className="text-[#01390f]">₱{Number(msg.orderData.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 truncate flex items-center justify-between">
                            <span>{msg.orderData.paymentMethod || "COD"} ({msg.orderData.paymentStatus || "Paid"})</span>
                            <span className="truncate max-w-[130px]">{msg.orderData.customerName}</span>
                          </div>
                        </div>
                      )}

                      {/* ATTACHMENT PREVIEW */}
                      {msg.attachment && (
                        <div className="rounded-lg overflow-hidden bg-black/10 max-h-48 border border-white/20">
                          <img
                            src={msg.attachment}
                            alt="Attachment"
                            className="w-full h-full object-cover max-h-48 cursor-pointer hover:opacity-95"
                            onClick={() => window.open(msg.attachment, "_blank")}
                          />
                        </div>
                      )}

                      {msg.text && (
                        <p className="leading-relaxed font-normal whitespace-pre-line">{msg.text}</p>
                      )}

                      <span
                        className={`text-[9px] text-right font-medium ${isCust || isCsr ? "text-slate-200" : "text-slate-400"
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
                  <div className="bg-white border border-slate-200 text-slate-500 text-xs rounded-2xl rounded-tl-none px-3.5 py-2 shadow-2xs animate-pulse flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-[#01390f] animate-spin" /> Preparing response...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* 3. Attached Order Inquiry Banner */}
          {attachedOrder && (
            <div className="p-3 bg-emerald-50/90 border-t border-emerald-200 text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#01390f] text-xs">
                  Order #{attachedOrder._id ? String(attachedOrder._id).slice(-8).toUpperCase() : "ORDER"}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachedOrder(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer text-xs font-bold"
                  title="Dismiss order inquiry"
                >
                  ✕
                </button>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                    {attachedOrder.items?.[0]?.name || attachedOrder.items?.[0]?.itemDescription || "Purchased Product"}
                    {attachedOrder.items?.length > 1 ? ` (+${attachedOrder.items.length - 1} more)` : ""}
                  </span>
                  <span className="font-bold text-[#01390f]">
                    ₱{Number(attachedOrder.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                  <span>Status: <strong className="text-slate-700">{attachedOrder.status || "In Transit"}</strong></span>
                  <span>{attachedOrder.paymentMethod || "COD"} • {attachedOrder.paymentStatus || "Paid"}</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate pt-0.5 border-t border-slate-100">
                  Recipient: {attachedOrder.customerName || attachedOrder.userId?.name || "Customer"} (
                  {typeof attachedOrder.shippingAddress === "object"
                    ? Object.values(attachedOrder.shippingAddress).filter(Boolean).join(", ")
                    : (attachedOrder.shippingAddress || "Delivery Address")}
                  )
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSendOrderInquiry(attachedOrder)}
                className="w-full py-2.5 px-4 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send size={12} />
                <span>Send Order Details to Support</span>
              </button>
            </div>
          )}

          {/* 4. File Preview Banner */}
          {filePreview && (
            <div className="px-3.5 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs text-[#01390f]">
              <div className="flex items-center gap-2 overflow-hidden">
                <img src={filePreview} alt="Upload preview" className="w-8 h-8 rounded object-cover border border-emerald-300" />
                <span className="truncate text-[11px] font-medium">{selectedFile?.name || "Image attachment"}</span>
              </div>
              <button
                type="button"
                onClick={removeSelectedFile}
                className="text-rose-600 hover:text-rose-700 font-bold p-1 cursor-pointer"
                title="Remove attachment"
              >
                ✕
              </button>
            </div>
          )}

          {/* 5. Input Bar & Guided Mode Gate */}
          {!showFaqPanel && (
            <div className="p-3.5 bg-white border-t border-slate-200/90 shrink-0 space-y-2 shadow-[0_-4px_16px_rgba(15,23,42,0.04)]">
              {/* Anti-Spam Temporary Ban Info Bar (Same Font & Size as Switch Topic, in Red) */}
              {banInfo && banInfo.bannedUntil > Date.now() && (
                <div className="flex items-center justify-between gap-2 px-1 text-[11px]">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 font-bold border border-red-200 truncate tracking-wide text-[11px]">
                    Restricted
                  </span>
                  <span className="text-[11px] font-semibold text-red-600 shrink-0">
                    {remainingTimeText ? `${remainingTimeText} remaining` : (banInfo.offenseCount >= 2 ? "5h remaining" : "30m remaining")}
                  </span>
                </div>
              )}

              {!selectedChatMode ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500 font-medium text-center">
                    Select a topic below to enable messaging
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <select
                        value={selectedChatMode}
                        onChange={(e) => handleSelectChatMode(e.target.value)}
                        className="w-full appearance-none bg-[#f6f9f6] hover:bg-[#EDF7EE] border border-[#01390f]/25 text-slate-800 text-xs font-semibold rounded-full px-4 py-2.5 pr-8 outline-none focus:border-[#01390f] cursor-pointer transition-colors truncate"
                      >
                        <option value="">Choose:</option>
                        {chatModeOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-[#01390f] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFaqPanel(true)}
                      className="px-4 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#01390f]/20 text-[11px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-all"
                    >
                      FAQ's
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 px-1 text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EDF7EE] text-[#01390f] font-bold border border-[#01390f]/20 truncate tracking-wide">
                        {activeModeConfig?.shortLabel}
                      </span>
                      {selectedChatMode === "product_ai" && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${aiQuestionsRemaining > 0
                            ? "bg-slate-50 text-slate-600 border-slate-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                        >
                          {aiQuestionsRemaining}/{AI_QUESTION_LIMIT} left
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedChatMode("")}
                      className="text-[11px] font-semibold text-[#01390f] hover:underline cursor-pointer shrink-0"
                    >
                      Switch Topic
                    </button>
                  </div>

                  {selectedChatMode === "product_ai" && aiQuestionsRemaining <= 0 ? (
                    <div className="bg-[#f6f9f6] border border-[#d5ead7] rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-700 font-medium text-[11px]">
                        AI product limit reached ({AI_QUESTION_LIMIT}/{AI_QUESTION_LIMIT}).
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectChatMode("agent")}
                        className="px-3.5 py-1.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[10px] font-bold uppercase tracking-wider shrink-0 cursor-pointer transition-all"
                      >
                        Mhira Agent
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        sendMessage();
                      }}
                      className={`flex items-center gap-2 border rounded-full px-3.5 py-1.5 transition-all ${
                        banInfo && banInfo.bannedUntil > Date.now()
                          ? "bg-slate-100 border-slate-300 opacity-70 cursor-not-allowed"
                          : "bg-[#f6f9f6] border-slate-200 focus-within:border-[#01390f] focus-within:bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={Boolean(banInfo && banInfo.bannedUntil > Date.now())}
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 text-slate-400 hover:text-[#01390f] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

                      <input
                        type="text"
                        value={input}
                        disabled={Boolean(banInfo && banInfo.bannedUntil > Date.now())}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                          banInfo && banInfo.bannedUntil > Date.now()
                            ? `Chat restricted (${remainingTimeText || "Cooldown active"})`
                            : (activeModeConfig?.placeholder || "Type your message...")
                        }
                        className={`flex-1 bg-transparent outline-none text-xs text-slate-800 placeholder:text-slate-400 px-1 ${
                          banInfo && banInfo.bannedUntil > Date.now() ? "cursor-not-allowed italic text-slate-500" : ""
                        }`}
                      />

                      <button
                        type="submit"
                        disabled={(!input.trim() && !filePreview) || loading || Boolean(banInfo && banInfo.bannedUntil > Date.now())}
                        className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                          (input.trim() || filePreview) && !loading && !(banInfo && banInfo.bannedUntil > Date.now())
                            ? "bg-[#01390f] hover:bg-[#0a5219] text-white shadow-xs active:scale-[0.99] cursor-pointer"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        Send
                      </button>
                    </form>
                  )}

                  {/* Informational Security & Anti-Spam Policy Note */}
                  <div className="pt-1 flex items-center justify-between px-1 text-[10px] text-slate-400">
                    <span className="font-medium leading-tight">
                      Note: 10 rapid messages triggers a 30m ban (1st warning); repeat offenses trigger a 5hr ban.
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      )}
    </>
  );
}

export default Chatbot;