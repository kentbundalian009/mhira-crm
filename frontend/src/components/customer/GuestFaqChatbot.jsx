import React, { useState, useRef, useEffect, useMemo } from "react";
import { X, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

// Categories for FAQ Knowledge Base (English, No Emojis)
const FAQ_CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "about", label: "About Mhira" },
  { id: "shopping", label: "Shopping & Orders" },
  { id: "shipping", label: "Shipping & Delivery" },
  { id: "payments", label: "Payments" },
  { id: "account", label: "Account" },
  { id: "support", label: "Support & Returns" },
];

const FAQ_ITEMS = [
  // --- ABOUT MHIRA ---
  {
    id: "about-brand",
    category: "about",
    question: "What is Mhira Natural Cosmetics?",
    answer:
      "**Mhira Natural Soap and Cosmetics Manufacturing** is a Philippine botanical personal care brand founded in 2018 by Mirasol P. Bituin. We craft natural and organic personal care products—from handcrafted herbal soaps, collagen facial serums, and hair revival tonics to nourishing body lotions that are gentle and effective on your skin.",
    actions: [
      { label: "Read Our Story", path: "/about" },
      { label: "Browse Collection", path: "/collection" },
    ],
  },
  {
    id: "about-fda",
    category: "about",
    question: "Are the products safe and FDA-notified?",
    answer:
      "**Yes, 100%.** All Mhira cosmetic products strictly adhere to Good Manufacturing Practices (GMP) and hold official FDA cosmetic notifications. Our formulas are **paraben-free, cruelty-free, hypoallergenic**, and crafted from safe, skin-loving botanical ingredients.",
    actions: [{ label: "View About Us", path: "/about" }],
  },
  {
    id: "about-sensitive",
    category: "about",
    question: "Are these products suitable for sensitive or acne-prone skin?",
    answer:
      "**Yes, absolutely.** Our botanical ingredients, including aloe vera, coconut extracts, niacinamide, and pure collagen, are mild and designed for all skin types, including sensitive and breakout-prone skin.",
    actions: [{ label: "View Soaps & Serums", path: "/collection" }],
  },

  // --- SHOPPING & ORDERING ---
  {
    id: "shop-how-to-order",
    category: "shopping",
    question: "How do I place an order on the Mhira website?",
    answer:
      "Ordering is simple and straightforward:\n1. Visit **'Our Collection'** or **'Package Sets'** in the main navigation menu.\n2. Choose your desired product and click **'Add to Bag'**.\n3. Open your shopping bag at the top right and click **'Checkout'**.\n4. Enter your shipping address and select your preferred payment method.",
    actions: [
      { label: "Browse Collection", path: "/collection" },
      { label: "View Package Sets", path: "/packages" },
    ],
  },
  {
    id: "shop-need-account",
    category: "shopping",
    question: "Do I need an account to make a purchase?",
    answer:
      "You can freely browse the store, view prices, and add items to your cart as a guest without logging in. When checking out, we recommend registering for an account (takes under a minute) so you can track delivery status in real-time and review your order history.",
    actions: [
      { label: "Create Account", path: "/signup" },
      { label: "Sign In", path: "/login" },
    ],
  },
  {
    id: "shop-package-sets",
    category: "shopping",
    question: "Do you offer package sets or bundle discounts?",
    answer:
      "**Yes.** Visit our **'Package Sets'** page to discover curated skincare and hair care bundles offering substantial savings compared to purchasing items individually.",
    actions: [{ label: "View Package Sets", path: "/packages" }],
  },

  // --- SHIPPING & DELIVERY ---
  {
    id: "ship-timeframe",
    category: "shipping",
    question: "How long will it take for my order to arrive?",
    answer:
      "Estimated delivery timeframes:\n• **Metro Manila / NCR**: 1 to 3 business days\n• **Greater Manila (Cavite, Laguna, Rizal, Bulacan)**: 2 to 4 business days\n• **Provincial Luzon, Visayas & Mindanao**: 4 to 7 business days\nOur logistics system automatically provides tracking updates throughout delivery.",
    actions: [{ label: "View Shipping Policy", path: "/shipping" }],
  },
  {
    id: "ship-fee",
    category: "shipping",
    question: "How much is the shipping fee?",
    answer:
      "Standard shipping starts at **₱80** for Metro Manila and **₱120 – ₱180** for provincial destinations. The exact shipping fee is automatically calculated at Checkout based on your specific delivery address.",
    actions: [{ label: "Proceed to Checkout", path: "/checkout" }],
  },
  {
    id: "ship-couriers",
    category: "shipping",
    question: "Which courier services do you use?",
    answer:
      "We partner with reputable courier providers including **J&T Express**, local same-day express couriers (for Metro Manila), and our in-house Mhira Logistics fleet to ensure parcels arrive safely and promptly.",
    actions: [],
  },

  // --- PAYMENTS ---
  {
    id: "pay-cod",
    category: "payments",
    question: "Do you accept Cash on Delivery (COD)?",
    answer:
      "**Yes. Cash on Delivery (COD)** is available nationwide across the Philippines. Simply select Cash on Delivery at checkout and hand your payment to the courier upon parcel delivery.",
    actions: [{ label: "Start Shopping", path: "/collection" }],
  },
  {
    id: "pay-online",
    category: "payments",
    question: "What online payment methods do you accept?",
    answer:
      "We accept the following payment methods:\n• **GCash** and **Maya** (via secure PayMongo gateway)\n• **Credit and Debit Cards** (Visa and Mastercard)\n• **Online Bank Transfers**\nAll transactions are secured with 256-bit bank-level encryption.",
    actions: [{ label: "View Payment Info", path: "/payments" }],
  },

  // --- ACCOUNT & BENEFITS ---
  {
    id: "acc-benefits",
    category: "account",
    question: "What are the advantages of creating an account?",
    answer:
      "Creating a free Mhira account gives you:\n• **Real-Time Tracking**: Monitor your parcel from Pending to Delivered\n• **Saved Favorites**: Keep your preferred items in your wishlist\n• **Exclusive Perks**: Access special member discounts and vouchers\n• **Order History**: View past receipts and invoices anytime",
    actions: [
      { label: "Create Free Account", path: "/signup" },
      { label: "Sign In", path: "/login" },
    ],
  },
  {
    id: "acc-track-order",
    category: "account",
    question: "How can I track my order?",
    answer:
      "When logged in to your account, navigate to **'My Orders'** in the menu to check the real-time status of your shipment (Pending -> Processing -> In-Transit -> Delivered).",
    actions: [{ label: "Sign In to Track", path: "/login" }],
  },

  // --- SUPPORT & RETURNS ---
  {
    id: "supp-contact",
    category: "support",
    question: "How can I contact Mhira support?",
    answer:
      "Our support team is available **Monday to Saturday, 9:00 AM – 6:00 PM PHT**.\n\nYou can reach us through our Contact page or email us directly at support@mhiracosmetics.ph for any questions or order inquiries.",
    actions: [
      { label: "Contact Us", path: "/about" },
      { label: "Sign In", path: "/login" },
    ],
  },
  {
    id: "supp-refund-policy",
    category: "support",
    question: "What is your return and refund policy?",
    answer:
      "We provide a **7-day return and replacement policy** for items with manufacturing defects, transit damage, or incorrect items received. Please reach out to our support team with a photo or unboxing video of the parcel.",
    actions: [{ label: "View Refund Policy", path: "/returns" }],
  },
];

function GuestFaqChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isTyping, setIsTyping] = useState(false);

  const chatMessagesEndRef = useRef(null);

  // Initial welcome greeting (English, No Emojis)
  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      sender: "bot",
      text: "Welcome to **Mhira Natural Soap and Cosmetics**.\n\nSelect any question below to get instant answers about our products, ordering, shipping, and payments.",
      actions: [
        { label: "Browse Collection", path: "/collection" },
        { label: "View Package Sets", path: "/packages" },
      ],
      time: "Just now",
    },
  ]);

  // Filtered FAQ items based on selected category
  const filteredFaqs = useMemo(() => {
    if (selectedCategory === "all") {
      return FAQ_ITEMS;
    }
    return FAQ_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  // Auto-scroll to bottom on new messages or typing state
  useEffect(() => {
    if (isOpen) {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Handle question selection
  const handleSelectFaq = (faq) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Add user's selected question as a chat message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: faq.question,
      time: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // 2. Simulate short response delay (~400ms)
    setTimeout(() => {
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: faq.answer,
        actions: faq.actions || [],
        selectedFaqId: faq.id,
        category: faq.category,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 400);
  };

  // Reset chat conversation
  const handleResetChat = () => {
    setSelectedCategory("all");
    setIsTyping(false);
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: "Conversation reset. Select any question below to get instant information.",
        actions: [
          { label: "Browse Collection", path: "/collection" },
          { label: "View Package Sets", path: "/packages" },
        ],
        time: "Just now",
      },
    ]);
  };

  // Render markdown-like bold text & bullet points
  const formatBotText = (text) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      // Bold rendering
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.startsWith("• ")) {
        return (
          <div key={idx} className="flex items-start gap-2 ml-1 my-0.5 text-xs text-slate-700 leading-relaxed">
            <span className="text-[#01390f] font-bold">•</span>
            <span>{renderedParts}</span>
          </div>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs text-slate-700 leading-relaxed">
            <span>{renderedParts}</span>
          </div>
        );
      }
      return (
        <p key={idx} className="text-xs text-slate-700 leading-relaxed min-h-[1.1rem]">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* 1. FLOATING TRIGGER BUTTON (Cookie UI consistent: rounded-full, green background, white "FAQ'S" text only, no white outline) */}
      {!isOpen && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center border-0 ring-0 outline-none select-none"
            aria-label="Open FAQs"
            title="Open FAQs"
          >
            FAQ'S
          </button>
        </div>
      )}

      {/* 2. MAIN FAQ DIALOG OVERLAY */}
      {isOpen && (
        <div
          role="dialog"
          aria-labelledby="faq-chatbot-title"
          className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 w-[95vw] sm:w-[410px] h-[600px] max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 border-0 font-['Poppins',sans-serif] animate-fadeIn"
        >
          {/* HEADER: Strictly "FAQ'S" and "X" */}
          <div className="bg-[#01390f] px-5 py-3.5 text-white flex items-center justify-between shrink-0 border-b border-[#012a0b]">
            <h2 id="faq-chatbot-title" className="font-bold text-sm tracking-wider text-white uppercase">
              FAQ'S
            </h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close FAQs"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CATEGORY SELECTOR (Exact Cookie Consent Banner Button Style) */}
          <div className="bg-slate-50 px-3.5 py-2.5 border-b border-[#E1E9EF] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {FAQ_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-[#01390f] hover:bg-[#0a5219] text-white shadow-md active:scale-[0.99]"
                      : "bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#d5ead7] shadow-xs active:scale-[0.99]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* CHAT MESSAGES STREAM */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";

              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 text-xs shadow-xs space-y-2 ${
                      isUser
                        ? "bg-[#01390f] text-white rounded-br-xs"
                        : "bg-white text-slate-800 rounded-bl-xs border border-slate-200"
                    }`}
                  >
                    {/* Bot Header */}
                    {!isUser && (
                      <div className="text-[11px] text-[#01390f] font-semibold mb-1 pb-1 border-b border-slate-100">
                        Mhira FAQ
                      </div>
                    )}

                    {/* Text Content */}
                    <div className="space-y-1">{isUser ? msg.text : formatBotText(msg.text)}</div>

                    {/* Action Links (Exact Cookie Consent Banner Button Style: Accept All & Reject All Styles) */}
                    {!isUser && msg.actions && msg.actions.length > 0 && (
                      <div className="pt-2.5 mt-2 border-t border-slate-100 flex flex-wrap gap-2">
                        {msg.actions.map((act, aIdx) => {
                          const isPrimary = aIdx === 0;
                          return (
                            <Link
                              key={aIdx}
                              to={act.path}
                              onClick={() => setIsOpen(false)}
                              className={`py-2 px-3.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.99] ${
                                isPrimary
                                  ? "bg-[#01390f] hover:bg-[#0a5219] text-white shadow-md"
                                  : "bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#d5ead7] shadow-xs"
                              }`}
                            >
                              <span>{act.label}</span>
                              <ChevronRight size={12} />
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div
                      className={`text-[9px] pt-1 text-right ${
                        isUser ? "text-white/70" : "text-slate-400"
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-2.5 rounded-2xl rounded-bl-xs w-fit shadow-xs">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                <span className="text-[10px] text-slate-400 font-medium ml-1">Answering...</span>
              </div>
            )}

            {/* INTERACTIVE QUESTION SELECTOR */}
            <div className="pt-2 pb-1 space-y-2">
              <div className="flex items-center justify-between text-xs px-0.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#01390f]">
                  Select a question:
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {filteredFaqs.length} {filteredFaqs.length === 1 ? "question" : "questions"}
                </span>
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                  No questions available in this category. Please select another topic above.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {filteredFaqs.map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      disabled={isTyping}
                      onClick={() => handleSelectFaq(faq)}
                      className="w-full text-left py-2.5 px-4 bg-white hover:bg-[#EDF7EE] border border-[#d5ead7] hover:border-[#01390f]/30 rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between group shadow-2xs active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-[#01390f] transition-colors leading-snug">
                        {faq.question}
                      </span>
                      <ChevronRight
                        size={14}
                        className="text-[#01390f] group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* COOKIE-STYLE DUAL ACTION BAR (Exact Reject All & Accept All Style) */}
            <div className="pt-2.5 pb-1 flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleResetChat}
                className="flex-1 py-2.5 px-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7]"
              >
                Clear Chat
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="flex-1 py-2.5 px-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer text-center"
              >
                All Topics
              </button>
            </div>

            <div ref={chatMessagesEndRef} />
          </div>
        </div>
      )}
    </>
  );
}

export default GuestFaqChatbot;
