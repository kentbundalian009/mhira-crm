import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  Calendar,
  MapPin,
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  ArrowRight,
  Sparkles,
  Megaphone,
  Clock,
  Tag,
  ShoppingBag,
} from "lucide-react";
import { API } from "../../axios";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { subscribeLiveSync } from "../../utils/liveSync";

function CustomerEvents() {
  const [events, setEvents] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_public_events");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem("cached_public_events");
    } catch {
      return true;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [activeEventModal, setActiveEventModal] = useState(null);

  const sortDropdownRef = useRef(null);

  const API_BASE_URL =
    import.meta.env.MODE === "production"
      ? "https://mhira-crmsystem.onrender.com"
      : "http://localhost:5000";

  const fetchPublicEvents = async () => {
    try {
      const res = await API.get("/api/events/public");
      const safeData = Array.isArray(res.data)
        ? res.data
        : res.data?.events || res.data?.items || res.data?.data || [];
      setEvents(safeData);
      try {
        localStorage.setItem("cached_public_events", JSON.stringify(safeData));
      } catch (e) {}
    } catch (err) {
      console.error("Error fetching public events:", err);
      setEvents((prev) => (Array.isArray(prev) ? prev : []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicEvents();

    const unsubscribe = subscribeLiveSync(() => {
      fetchPublicEvents();
    });

    const handleFocus = () => fetchPublicEvents();
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getImageUrl = (url) => {
    if (!url) return "";
    if (
      url.startsWith("http") ||
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return "Ongoing";
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return "Ongoing";
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEventTimingBadge = (dateStr) => {
    if (!dateStr) {
      return {
        label: "Ongoing",
        className: "bg-[#EDF7EE] text-[#01390f] border-[#D5EAD7]",
      };
    }
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) {
      return {
        label: "Ongoing",
        className: "bg-[#EDF7EE] text-[#01390f] border-[#D5EAD7]",
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(parsed);
    target.setHours(0, 0, 0, 0);

    if (target.getTime() === today.getTime()) {
      return {
        label: "Happening Today",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (target > today) {
      return {
        label: "Upcoming",
        className: "bg-sky-50 text-sky-700 border-sky-200",
      };
    }
    return {
      label: "Published",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    };
  };

  // Dynamic category tabs derived from active events
  const categories = useMemo(() => {
    const unique = new Set(["All"]);
    events.forEach((evt) => {
      const cat = (evt?.category || "Announcement").trim();
      if (cat) unique.add(cat);
    });
    return Array.from(unique);
  }, [events]);

  const sortOptions = [
    { label: "Newest First", value: "newest" },
    { label: "Event Date: Soonest", value: "date-asc" },
    { label: "Oldest First", value: "oldest" },
    { label: "Title: A-Z", value: "title-asc" },
  ];

  // Filtered & sorted events
  const filteredEvents = useMemo(() => {
    let list = Array.isArray(events) ? [...events] : [];

    if (selectedCategory !== "All") {
      list = list.filter(
        (item) =>
          (item.category || "Announcement").trim().toLowerCase() ===
          selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          (item.title || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q) ||
          (item.location || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "title-asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "date-asc") {
        const dA = a.eventDate ? new Date(a.eventDate).getTime() : Infinity;
        const dB = b.eventDate ? new Date(b.eventDate).getTime() : Infinity;
        return dA - dB;
      }
      const timeA = new Date(a.createdAt || a.eventDate || 0).getTime();
      const timeB = new Date(b.createdAt || b.eventDate || 0).getTime();
      return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
    });

    return list;
  }, [events, selectedCategory, searchQuery, sortBy]);

  const featuredEvent = filteredEvents.length > 0 ? filteredEvents[0] : null;

  return (
    <div className="bg-white min-h-screen flex flex-col justify-between font-['Poppins',sans-serif] text-[#243746] antialiased selection:bg-[#01390f] selection:text-white">
      <div>
        <HeaderContainer />

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {/* ================= BREADCRUMB & PAGE HEADER ================= */}
          <div className="mb-6">
            <nav className="text-xs text-slate-500 mb-3">
              <Link
                to="/"
                className="hover:underline hover:text-[#01390f] transition-colors"
              >
                Home
              </Link>
              <span className="mx-2 text-slate-400">/</span>
              <span className="text-[#243746] font-medium">
                {selectedCategory !== "All"
                  ? `${selectedCategory} Events`
                  : "Events & Announcements"}
              </span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#E1E9EF] pb-4 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-normal text-[#243746] tracking-tight flex items-center gap-2.5 flex-wrap">
                  <span>Events & Announcements</span>
                  {!loading && filteredEvents.length > 0 && (
                    <span className="text-xs font-semibold text-[#01390f] bg-[#EDF7EE] px-2.5 py-0.5 rounded-full border border-[#D5EAD7]">
                      {filteredEvents.length}{" "}
                      {filteredEvents.length === 1 ? "Update" : "Updates"}
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Discover our upcoming promotions, exclusive product launches, and official store schedules.
                </p>
              </div>

              {/* CONTROLS: SHOW/HIDE FILTERS + SORT BY */}
              <div className="flex items-center gap-6 sm:gap-8 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowFilters((prev) => !prev)}
                  className="group flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-900 hover:text-[#01390f] transition-colors cursor-pointer py-1.5 select-none"
                >
                  <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
                  <SlidersHorizontal
                    size={16}
                    className={`transition-transform duration-300 ease-out group-hover:scale-110 ${
                      !showFilters
                        ? "rotate-90 text-[#01390f]"
                        : "text-slate-700 group-hover:text-[#01390f]"
                    }`}
                  />
                </button>

                <div className="relative" ref={sortDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsSortOpen((prev) => !prev)}
                    className="group flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-900 hover:text-[#01390f] transition-colors cursor-pointer py-1.5 select-none"
                  >
                    <span>
                      Sort By:{" "}
                      <span className="text-slate-500 font-normal group-hover:text-[#01390f] transition-colors">
                        {sortOptions.find((opt) => opt.value === sortBy)?.label ||
                          "Newest First"}
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        isSortOpen
                          ? "rotate-180 text-[#01390f]"
                          : "text-slate-700 group-hover:text-[#01390f]"
                      }`}
                    />
                  </button>

                  {isSortOpen && (
                    <div className="absolute right-0 top-full pt-2 w-48 sm:w-52 z-50 animate-fadeIn">
                      <div className="bg-[#f7faf8] border border-[#D5EAD7] shadow-xl rounded-2xl overflow-hidden ring-1 ring-black/5 text-[#2D3732] py-1.5">
                        {sortOptions.map((opt) => {
                          const isSelected = sortBy === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSortBy(opt.value);
                                setIsSortOpen(false);
                              }}
                              className={`w-full px-5 py-2.5 text-xs sm:text-sm text-right transition-colors cursor-pointer block font-semibold ${
                                isSelected
                                  ? "bg-[#EDF7EE] text-[#01390f] font-bold"
                                  : "text-gray-700 hover:text-gray-950 hover:bg-[#EDF7EE]"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ================= COLLAPSIBLE FILTER & SEARCH BAR ================= */}
          {showFilters && (
            <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#f8faf8] border border-[#E1E9EF] rounded-2xl p-3 sm:p-4">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#01390f] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-slate-200/80 hover:border-[#01390f]/40 hover:text-[#01390f]"
                      }`}
                    >
                      {cat === "All" ? "All Updates" : cat}
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events, promos, or venue..."
                  className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-full text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#01390f] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ================= MAIN CONTENT STATE ================= */}
          {loading ? (
            <div className="w-full flex flex-col items-center justify-center py-28 text-[#01390f] gap-3">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-xs sm:text-sm font-medium text-slate-500">
                Loading events and announcements...
              </span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="w-full py-20 px-6 bg-[#f8faf8] border border-[#E1E9EF] rounded-2xl text-center max-w-xl mx-auto my-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EDF7EE] border border-[#D5EAD7] text-[#01390f] flex items-center justify-center mx-auto mb-3">
                <Megaphone className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#243746]">
                {searchQuery || selectedCategory !== "All"
                  ? "No matching announcements found"
                  : "No active announcements right now"}
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto leading-relaxed">
                {searchQuery || selectedCategory !== "All"
                  ? "Try clearing your search filter or switching to All Updates to see all published broadcasts."
                  : "Please check back soon for upcoming Mhira Natural promotions, pop-up schedules, and product launches."}
              </p>
              {(searchQuery || selectedCategory !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All");
                  }}
                  className="mt-4 px-4 py-2 rounded-full bg-[#01390f] text-white text-xs font-semibold hover:bg-[#0a5219] transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              {/* ================= 1. FEATURED SPOTLIGHT BANNER CARD ================= */}
              {featuredEvent && (
                <section aria-label="Featured Announcement">
                  <div
                    onClick={() => setActiveEventModal(featuredEvent)}
                    className="group bg-white rounded-2xl border border-[#E1E9EF] hover:border-[#01390f]/40 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden grid grid-cols-1 lg:grid-cols-12 cursor-pointer"
                  >
                    {/* Left: Structured Banner Image Holder */}
                    <div className="lg:col-span-7 relative bg-slate-900 min-h-[240px] sm:min-h-[320px] lg:min-h-[360px] max-h-[420px] overflow-hidden flex items-center justify-center">
                      {featuredEvent.bannerImage ? (
                        <>
                          {/* Subtle blurred background fill so any poster aspect ratio looks clean */}
                          <img
                            src={getImageUrl(featuredEvent.bannerImage)}
                            alt=""
                            aria-hidden="true"
                            className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110 pointer-events-none"
                          />
                          <img
                            src={getImageUrl(featuredEvent.bannerImage)}
                            alt={featuredEvent.title}
                            className="relative z-10 w-full h-full object-cover object-center group-hover:scale-[1.02] transition-transform duration-500"
                          />
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#01390f] via-[#0c4a1b] to-[#243746] flex flex-col items-center justify-center p-8 text-center text-white">
                          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center mb-3">
                            <Sparkles className="w-7 h-7 text-[#A3D977]" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest text-[#A3D977]">
                            Mhira Natural Official Broadcast
                          </span>
                          <p className="text-lg sm:text-xl font-bold mt-1 max-w-md line-clamp-2">
                            {featuredEvent.title}
                          </p>
                        </div>
                      )}

                      {/* Top-left Spotlight Pill */}
                      <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-[#01390f] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                          <Sparkles className="w-3 h-3 text-[#A3D977]" />
                          Featured Highlight
                        </span>
                      </div>
                    </div>

                    {/* Right: Structured Details Container */}
                    <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
                      <div>
                        {/* Category & Timing Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="inline-flex items-center gap-1 bg-[#EDF7EE] text-[#01390f] border border-[#D5EAD7] px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                            <Tag className="w-3 h-3" />
                            {featuredEvent.category || "Special Announcement"}
                          </span>

                          {(() => {
                            const badge = getEventTimingBadge(featuredEvent.eventDate);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}
                              >
                                <Clock className="w-3 h-3" />
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Event Headline */}
                        <h2 className="text-xl sm:text-2xl font-bold text-[#243746] group-hover:text-[#01390f] transition-colors tracking-tight leading-snug">
                          {featuredEvent.title}
                        </h2>

                        {/* Date & Location Metadata Grid */}
                        <div className="mt-4 p-3.5 rounded-xl bg-[#f8faf8] border border-[#E1E9EF] grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#EDF7EE] text-[#01390f] flex items-center justify-center shrink-0 mt-0.5">
                              <Calendar className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Event Date
                              </span>
                              <span className="text-xs font-semibold text-[#243746] block truncate">
                                {formatEventDate(featuredEvent.eventDate)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#EDF7EE] text-[#01390f] flex items-center justify-center shrink-0 mt-0.5">
                              <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Venue / Channel
                              </span>
                              <span className="text-xs font-semibold text-[#243746] block truncate">
                                {featuredEvent.location || "Online & Main Store"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Description Preview */}
                        {featuredEvent.description && (
                          <p className="text-slate-600 text-xs sm:text-sm mt-4 leading-relaxed line-clamp-4 whitespace-pre-line">
                            {featuredEvent.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom CTA Row */}
                      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveEventModal(featuredEvent);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          <span>Read Full Announcement</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <Link
                          to="/collections"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#243746] hover:text-[#01390f] transition-colors"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Explore Store</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* ================= 2. ALL EVENTS & ANNOUNCEMENTS GRID ================= */}
              <section aria-label="All Events and Announcements">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-tight">
                      All Events & Broadcasts
                    </h2>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {filteredEvents.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Click any card to view full announcement details
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((item, idx) => {
                    const timingBadge = getEventTimingBadge(item.eventDate);

                    return (
                      <article
                        key={item._id || idx}
                        onClick={() => setActiveEventModal(item)}
                        className="group bg-white rounded-2xl border border-[#E1E9EF] hover:border-[#01390f]/40 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          {/* Uniform Aspect-Ratio Image Container */}
                          <div className="aspect-16/10 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                            {item.bannerImage ? (
                              <img
                                src={getImageUrl(item.bannerImage)}
                                alt={item.title}
                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[#f0f7f1] via-[#e4f2e6] to-[#d5ead7] flex flex-col items-center justify-center p-5 text-center">
                                <div className="w-10 h-10 rounded-xl bg-white/90 text-[#01390f] flex items-center justify-center shadow-2xs mb-2">
                                  <Megaphone className="w-5 h-5" />
                                </div>
                                <span className="text-[11px] font-bold text-[#01390f] uppercase tracking-wider line-clamp-1">
                                  {item.category || "Official Update"}
                                </span>
                              </div>
                            )}

                            {/* Category Badge Overlay */}
                            <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-[#01390f] border border-[#D5EAD7] px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs">
                              {item.category || "Announcement"}
                            </span>

                            {/* Status Pill Overlay */}
                            <span
                              className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shadow-2xs backdrop-blur-xs ${timingBadge.className}`}
                            >
                              {timingBadge.label}
                            </span>
                          </div>

                          {/* Card Content Body */}
                          <div className="p-5">
                            {/* Date & Location Meta Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium mb-2.5">
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                                <span>{formatEventDate(item.eventDate)}</span>
                              </span>

                              <span className="inline-flex items-center gap-1.5 truncate max-w-[180px]">
                                <MapPin className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                                <span className="truncate">
                                  {item.location || "Online & Main Store"}
                                </span>
                              </span>
                            </div>

                            {/* Headline */}
                            <h3 className="text-base font-bold text-[#243746] group-hover:text-[#01390f] transition-colors line-clamp-2 leading-snug">
                              {item.title}
                            </h3>

                            {/* Description Snippet */}
                            <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                              {item.description ||
                                "Click to read the full details of this Mhira Natural event and announcement."}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-5 py-3.5 bg-[#f8faf8] border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[180px]">
                            {item.location || "Mhira Natural Storefront"}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#01390f] group-hover:translate-x-0.5 transition-transform">
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* ================= EVENT DETAILS MODAL ================= */}
      {activeEventModal && (
        <div
          onClick={() => setActiveEventModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto"
          >
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#f8faf8] border-b border-[#E1E9EF] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="bg-[#EDF7EE] text-[#01390f] border border-[#D5EAD7] px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                  {activeEventModal.category || "Announcement"}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {formatEventDate(activeEventModal.eventDate)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveEventModal(null)}
                className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Full Uncropped Banner View */}
              {activeEventModal.bannerImage && (
                <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-200/80 max-h-[380px] flex items-center justify-center">
                  <img
                    src={getImageUrl(activeEventModal.bannerImage)}
                    alt={activeEventModal.title}
                    className="w-full max-h-[380px] object-contain"
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-[#243746] leading-snug">
                  {activeEventModal.title}
                </h2>
              </div>

              {/* Metadata Pills Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#f8faf8] border border-[#E1E9EF]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EDF7EE] text-[#01390f] flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Date & Schedule
                    </span>
                    <span className="text-xs font-semibold text-[#243746]">
                      {formatEventDate(activeEventModal.eventDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EDF7EE] text-[#01390f] flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Location / Venue
                    </span>
                    <span className="text-xs font-semibold text-[#243746] block truncate">
                      {activeEventModal.location || "Online & Main Store"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Announcement Description */}
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {activeEventModal.description || "No additional details provided."}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#f8faf8] border-t border-[#E1E9EF] flex items-center justify-between gap-3 shrink-0">
              <Link
                to="/collections"
                onClick={() => setActiveEventModal(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#01390f] hover:underline"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Shop Mhira Collections</span>
              </Link>

              <button
                type="button"
                onClick={() => setActiveEventModal(null)}
                className="px-5 py-2 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default CustomerEvents;
