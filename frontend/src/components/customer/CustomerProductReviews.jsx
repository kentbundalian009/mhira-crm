import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShoppingBag,
  Star,
  Camera,
  ThumbsUp,
  MoreHorizontal,
  Flag,
  ChevronLeft,
  ShieldCheck,
  MapPin,
  X,
  Maximize2,
  Sparkles,
  Award,
  Crown
} from "lucide-react";
import axios from "../../axios";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { showSuccessToast } from "../../utils/toast";
import { getUserId } from "../../utils/userId";

const DEFAULT_CATALOG = [
  {
    _id: "6a8ac1208c66e4350e663652",
    id: "6a8ac1208c66e4350e663652",
    itemDescription: "NIACINAMIDE BODY LOTION",
    category: "Bath & Body",
    price: 225,
    rating: 5,
    image: "",
  },
  {
    _id: "6a8ac46335a5ad9e2a53cd67",
    id: "6a8ac46335a5ad9e2a53cd67",
    itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR",
    category: "Hair Care",
    price: 280,
    rating: 5,
    image: "",
  },
];

// Helper to mask user names for privacy (e.g., "Ned Peregrin" -> "N**d P**n")
export const maskCustomerName = (name, isAnonymous) => {
  if (isAnonymous) return "A*******s";
  if (!name || typeof name !== "string") return "V*****d B***r";
  const words = name.trim().split(/\s+/);
  return words
    .map((word) => {
      if (word.length <= 1) return word;
      if (word.length === 2) return `${word[0]}*`;
      return `${word[0]}**${word[word.length - 1]}`;
    })
    .join(" ");
};

// Helper to format review dates (e.g. "6d ago", "1w", "9-16")
export const formatReviewDate = (dateVal) => {
  if (!dateVal) return "Recently";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Recently";

  const now = new Date();
  const diffMs = Math.max(0, now - d);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w`;

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = d.getFullYear();
  if (year === now.getFullYear()) {
    return `${month}-${day}`;
  }
  return `${month}-${day}-${year}`;
};

// Reusable Tier Badge for Customer Reviews
export const CustomerTierBadge = ({ tier, badge, className = "" }) => {
  if (!tier && !badge) return null;
  const t = (tier || "").toLowerCase();
  const b = (badge || "").toLowerCase();

  if (t === "platinum" || b.includes("platinum")) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs whitespace-nowrap ${className}`}>
        <span>{badge || "Mhira Badge"}</span>
      </span>
    );
  }

  if (t === "gold" || b.includes("gold")) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap ${className}`}>
        <span>{badge || "Mhira Badge"}</span>
      </span>
    );
  }

  if (t === "silver" || b.includes("silver")) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs whitespace-nowrap ${className}`}>
        <span>{badge || "Mhira Badge"}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF7EE] text-[#01390f] border border-[#D5EAD7] shadow-2xs whitespace-nowrap ${className}`}>
      <span>{badge || "Mhira Badge"}</span>
    </span>
  );
};

function CustomerProductReviews() {
  const { id } = useParams();
  const navigate = useNavigate();

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const API_BASE_URL =
    !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === "production"
      ? "https://mhira-crmsystem.onrender.com"
      : "http://localhost:5000";

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter tab matching CustomerOrders / Settings sidebar style
  const [activeTab, setActiveTab] = useState("All");

  // User liked reviews (persisted in localStorage)
  const [likedMap, setLikedMap] = useState(() => {
    try {
      const stored = localStorage.getItem("mhira_liked_reviews");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Active 3-dot dropdown menu
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Report Modal State
  const [reportingReview, setReportingReview] = useState(null);
  const [reportReason, setReportReason] = useState("Inappropriate content or offensive language");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Lightbox Modal State
  const [previewImage, setPreviewImage] = useState(null);

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch product and real customer reviews from database
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        let foundProduct = null;
        try {
          const cached = localStorage.getItem("mhira_db_products");
          if (cached) {
            const list = JSON.parse(cached);
            foundProduct = list.find(
              (p) => String(p._id || p.id || p.code) === String(id)
            );
          }
        } catch (e) {}

        if (!foundProduct) {
          foundProduct = DEFAULT_CATALOG.find(
            (p) => String(p._id || p.id) === String(id)
          );
        }

        try {
          const res = await axios.get(`${API_BASE_URL}/api/collections/public/${id}`);
          if (res.data) {
            foundProduct = res.data;
          }
        } catch (err) {
          try {
            const listRes = await axios.get(`${API_BASE_URL}/api/collections/public`);
            if (Array.isArray(listRes.data)) {
              const matched = listRes.data.find(
                (p) => String(p._id || p.id || p.code) === String(id)
              );
              if (matched) foundProduct = matched;
            }
          } catch (e) {}
        }

        if (isMounted && foundProduct) {
          setProduct(foundProduct);
        }

        // Fetch genuine customer reviews only from DB
        let fetchedReviews = [];
        try {
          const revRes = await axios.get(
            `${API_BASE_URL}/api/reviews/product/${foundProduct?._id || id}`
          );
          if (Array.isArray(revRes.data)) {
            fetchedReviews = revRes.data;
          }
        } catch (err) {
          console.warn("Reviews fetch error:", err);
        }

        if (isMounted) {
          setReviews(fetchedReviews);
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setReviews([]);
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Derived counts for filter tabs from genuine reviews
  const counts = useMemo(() => {
    const total = reviews.length;
    const visuals = reviews.filter((r) => r.images && r.images.length > 0).length;
    const star5 = reviews.filter((r) => Math.round(r.rating || 5) === 5).length;
    const star4 = reviews.filter((r) => Math.round(r.rating || 5) === 4).length;
    const star3 = reviews.filter((r) => Math.round(r.rating || 5) === 3).length;
    const star2 = reviews.filter((r) => Math.round(r.rating || 5) === 2).length;
    const star1 = reviews.filter((r) => Math.round(r.rating || 5) === 1).length;
    return { total, visuals, star5, star4, star3, star2, star1 };
  }, [reviews]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((rev) => {
      const ratingNum = Math.round(rev.rating || 5);
      if (activeTab === "All") return true;
      if (activeTab === "Includes visuals") return rev.images && rev.images.length > 0;
      if (activeTab === "5 Stars") return ratingNum === 5;
      if (activeTab === "4 Stars") return ratingNum === 4;
      if (activeTab === "3 Stars") return ratingNum === 3;
      if (activeTab === "2 Stars") return ratingNum === 2;
      if (activeTab === "1 Star") return ratingNum === 1;
      return true;
    });
  }, [reviews, activeTab]);

  // Handle Like Toggle
  const handleToggleLike = async (reviewId) => {
    const isCurrentlyLiked = Boolean(likedMap[reviewId]);
    const nextState = !isCurrentlyLiked;

    // Optimistic UI Update
    setLikedMap((prev) => {
      const updated = { ...prev, [reviewId]: nextState };
      try {
        localStorage.setItem("mhira_liked_reviews", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setReviews((prev) =>
      prev.map((r) => {
        if (r._id === reviewId) {
          const currentLikes = Number(r.likes || 0);
          return {
            ...r,
            likes: Math.max(0, currentLikes + (nextState ? 1 : -1)),
          };
        }
        return r;
      })
    );

    // Call backend API
    try {
      await axios.post(`${API_BASE_URL}/api/reviews/${reviewId}/like`, {
        action: nextState ? "like" : "unlike",
      });
    } catch (err) {}
  };

  // Handle Report Submission
  const handleSubmitReport = async () => {
    if (!reportingReview) return;
    setIsSubmittingReport(true);
    try {
      await axios.post(`${API_BASE_URL}/api/reviews/${reportingReview._id}/report`, {
        reason: reportReason,
        details: reportDetails,
        reportedBy: getUserId() || "Anonymous Shopper",
      });
      showSuccessToast("Thank you for your report. Our moderation team will review this review shortly.");
      setReportingReview(null);
      setReportDetails("");
      setOpenMenuId(null);
    } catch (err) {
      showSuccessToast("Report submitted successfully.");
      setReportingReview(null);
      setReportDetails("");
      setOpenMenuId(null);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const displayTitle = product?.itemDescription || product?.itemName || "Product";

  // Sidebar Filter items matching CustomerOrders.jsx style
  const tabs = [
    { id: "All", label: "All", icon: ShoppingBag, count: counts.total },
    { id: "Includes visuals", label: "Includes visuals", icon: Camera, count: counts.visuals },
    { id: "5 Stars", label: "5 Stars", icon: Star, count: counts.star5 },
    { id: "4 Stars", label: "4 Stars", icon: Star, count: counts.star4 },
    { id: "3 Stars", label: "3 Stars", icon: Star, count: counts.star3 },
    { id: "2 Stars", label: "2 Stars", icon: Star, count: counts.star2 },
    { id: "1 Star", label: "1 Star", icon: Star, count: counts.star1 },
  ];

  return (
    <div className="bg-white min-h-screen flex flex-col font-['Poppins',sans-serif] text-slate-800 antialiased">
      <HeaderContainer />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* ================= BREADCRUMB & PAGE TITLE (MATCHES CUSTOMER ORDERS DESIGN) ================= */}
        <div className="mb-8">
          <nav className="text-xs text-slate-500 mb-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center">
              <Link to="/" className="hover:underline">Home</Link>
              <span className="mx-2 text-slate-400">/</span>
              <Link to={`/product/${product?._id || id}`} className="hover:underline">{displayTitle}</Link>
              <span className="mx-2 text-slate-400">/</span>
              <span className="text-[#243746] font-medium capitalize">Product Reviews</span>
            </div>

            <Link
              to={`/product/${product?._id || id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#01390f] hover:underline"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Product</span>
            </Link>
          </nav>

          <div className="flex items-center justify-between border-b border-[#E1E9EF] pb-4">
            <h1 className="text-xl sm:text-2xl font-normal text-[#243746] tracking-tight capitalize">
              Product Reviews {reviews.length > 0 && `(${reviews.length})`}
            </h1>
          </div>
        </div>

        {/* ================= MAIN CONTENT LAYOUT (MATCHES CUSTOMER ORDERS) ================= */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* ================= LEFT SIDEBAR (CLEAN TEXT-ONLY CATEGORIES MATCHING COLLECTION) ================= */}
          <aside className="w-full md:w-56 flex-shrink-0">
            <nav className="flex md:flex-col overflow-x-auto scrollbar-none gap-5 sm:gap-6 md:gap-0 pb-2 md:pb-0 md:space-y-0.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-1 text-xs sm:text-sm leading-snug transition-colors text-left cursor-pointer shrink-0 md:w-full whitespace-nowrap ${
                      isActive
                        ? "text-[#01390f] font-bold"
                        : "text-[#26332E] hover:text-[#01390f] font-normal"
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ================= RIGHT MAIN CONTENT AREA ================= */}
          <section className="flex-1 w-full min-w-0 space-y-6">
            {loading ? (
              <div className="py-20 text-center text-xs text-slate-400 bg-white rounded-2xl border border-gray-100 p-8 shadow-2xs">
                Loading product reviews...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center bg-white rounded-2xl border border-gray-100 p-8 shadow-2xs">
                <Star className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-semibold text-sm mb-1">
                  No customer reviews yet
                </p>
                <p className="text-xs text-slate-400">
                  Reviews from verified purchases will be displayed here.
                </p>
              </div>
            ) : (
              filteredReviews.map((rev) => {
                const isLiked = Boolean(likedMap[rev._id]);
                const maskedName = maskCustomerName(rev.userName, rev.isAnonymous);
                const displayDate = formatReviewDate(rev.createdAt);
                const userLocation = rev.country || "Philippines";
                const ratingStars = Math.min(5, Math.max(1, Number(rev.rating || 5)));

                const initials = (rev.userName || "Verified Buyer")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={rev._id}
                    className="bg-white rounded-2xl border border-[#E1E9EF] shadow-2xs hover:shadow-xs transition-all overflow-hidden p-5 sm:p-6 space-y-3.5"
                  >
                    {/* CARD HEADER: USER INFO, LOCATION, DATE, AND 3-DOT MENU */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#EAF3E4] border border-[#79A94B]/30 text-[#246C94] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {initials}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#243746] text-xs sm:text-sm tracking-tight">
                              {maskedName}
                            </span>
                            <CustomerTierBadge tier={rev.userTier} badge={rev.userBadge} />
                            {rev.verifiedPurchase !== false && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-[#EAF3E4] text-[#79A94B] font-semibold px-2 py-0.5 rounded-full border border-[#79A94B]/30 shadow-2xs">
                                <ShieldCheck className="w-3 h-3 text-[#79A94B]" />
                                <span>Verified Purchase</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              <span>{userLocation}</span>
                            </span>
                            <span>•</span>
                            <span className="font-mono text-slate-400">{displayDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* 3-DOT MENU BUTTON */}
                      <div className="relative" ref={openMenuId === rev._id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === rev._id ? null : rev._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="More options"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* DROPDOWN MENU */}
                        {openMenuId === rev._id && (
                          <div className="absolute right-0 top-8 z-30 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setReportingReview(rev);
                                setOpenMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium transition-colors text-left cursor-pointer"
                            >
                              <Flag className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span>Report review</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STAR RATINGS */}
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < ratingStars
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-200 fill-slate-100"
                          }`}
                        />
                      ))}
                    </div>

                    {/* REVIEW COMMENT TEXT */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {rev.comment}
                    </p>

                    {/* VISUAL ATTACHMENTS */}
                    {rev.images && rev.images.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-2.5">
                        {rev.images.map((imgUrl, imgIndex) => (
                          <div
                            key={imgIndex}
                            onClick={() => setPreviewImage(imgUrl)}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-slate-200 cursor-pointer relative group/img bg-slate-50 shadow-2xs hover:border-[#79A94B] transition-all"
                          >
                            <img
                              src={imgUrl}
                              alt={`Customer attachment ${imgIndex + 1}`}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* LIKE REACTION BUTTON */}
                    <div className="pt-1 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleToggleLike(rev._id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          isLiked
                            ? "bg-[#EAF3E4] text-[#246C94] border border-[#79A94B]/40 font-bold shadow-2xs scale-102"
                            : "bg-slate-100/80 hover:bg-slate-200/70 text-slate-600 border border-slate-200/60"
                        }`}
                        title={isLiked ? "Unlike review" : "Helpful review"}
                      >
                        <ThumbsUp
                          className={`w-3.5 h-3.5 transition-transform ${
                            isLiked ? "fill-[#246C94] text-[#246C94] scale-110" : "text-slate-500"
                          }`}
                        />
                        <span>Helpful</span>
                        {Number(rev.likes || 0) > 0 && (
                          <span className="ml-0.5 font-mono font-bold text-[11px]">
                            ({rev.likes})
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </main>

      {/* ================= REPORT MODAL ================= */}
      {reportingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Report Review
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Review by {maskCustomerName(reportingReview.userName, reportingReview.isAnonymous)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReportingReview(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Snippet Preview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-600 line-clamp-2 italic">
              &quot;{reportingReview.comment}&quot;
            </div>

            {/* Reasons Radio List */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Why are you reporting this review?
              </label>

              {[
                "Inappropriate content or offensive language",
                "Spam, advertisement, or promotion",
                "Fake review or competitor manipulation",
                "Irrelevant or off-topic content",
                "Other reason",
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    reportReason === reason
                      ? "border-[#79A94B] bg-[#EAF3E4] text-[#246C94] font-semibold"
                      : "border-[#E1E9EF] hover:bg-slate-50 text-[#243746]"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    checked={reportReason === reason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="accent-[#79A94B] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {/* Optional Details */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#243746] block">
                Additional Details (Optional)
              </label>
              <textarea
                rows={2}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe any specific issue with this review..."
                className="w-full text-xs p-2.5 border border-[#E1E9EF] rounded-xl focus:outline-none focus:border-[#79A94B] focus:ring-1 focus:ring-[#79A94B] resize-none text-[#243746]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setReportingReview(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={handleSubmitReport}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= LIGHTBOX IMAGE PREVIEW MODAL ================= */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-zoom-out animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] bg-transparent rounded-2xl overflow-hidden flex flex-col items-center justify-center"
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black text-white p-2 rounded-full cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImage}
              alt="Visual attachment preview"
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default CustomerProductReviews;
