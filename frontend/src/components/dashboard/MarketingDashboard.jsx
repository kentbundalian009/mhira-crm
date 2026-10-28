import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Tag,
  Megaphone,
  Star,
  Clock,
  BarChart3,
  Boxes,
  Database,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Percent,
  PieChart,
  Table as TableIcon
} from "lucide-react";
import axios, { API } from "../../axios";

function MarketingDashboard({ setActiveTab }) {
  const [assetView, setAssetView] = useState("chart");
  const [ratingsView, setRatingsView] = useState("chart");
  const [categoryView, setCategoryView] = useState("chart");
  const [quantityView, setQuantityView] = useState("chart");
  const [catalog, setCatalog] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_marketing_catalog") || localStorage.getItem("mhira_db_products");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [
      { _id: "1", code: "FG0001", itemDescription: "NIACINAMIDE BODY LOTION", category: "Bath & Body", price: 225 },
      { _id: "2", code: "FG0002", itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR", category: "Hair Care", price: 280 },
      { _id: "3", code: "FG0003", itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR", category: "Hair Care", price: 250 },
      { _id: "4", code: "FG0004", itemDescription: "FACE SERUM COLLAGEN", category: "Skin Care", price: 300 },
    ];
  });

  const [coupons, setCoupons] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_marketing_coupons");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [sections, setSections] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_marketing_sections");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [reviews, setReviews] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_marketing_reviews");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [loading, setLoading] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const API_BASE_URL =
    import.meta.env.MODE === "production"
      ? "https://mhira-crmsystem.onrender.com"
      : "http://localhost:5000";

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [catRes, coupRes, secRes, revRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/collections/catalog`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/coupons`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/sections`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/reviews`, config).catch(() => ({ data: [] }))
      ]);

      if (Array.isArray(catRes.data) && catRes.data.length > 0) {
        setCatalog(catRes.data);
        localStorage.setItem("cached_marketing_catalog", JSON.stringify(catRes.data));
      }
      if (Array.isArray(coupRes.data)) {
        setCoupons(coupRes.data);
        localStorage.setItem("cached_marketing_coupons", JSON.stringify(coupRes.data));
      }
      if (Array.isArray(secRes.data)) {
        setSections(secRes.data);
        localStorage.setItem("cached_marketing_sections", JSON.stringify(secRes.data));
      }
      if (Array.isArray(revRes.data)) {
        setReviews(revRes.data);
        localStorage.setItem("cached_marketing_reviews", JSON.stringify(revRes.data));
      }
    } catch (err) {
      console.error("Failed to load marketing dashboard data:", err);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 400);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // COMPUTED METRICS & CHARTS DATA
  const dashboardStats = useMemo(() => {
    const totalCatalogItems = catalog.length;
    const totalCoupons = coupons.length;
    const totalBanners = sections.length || 5;
    const totalMarketingAssets = totalCatalogItems + totalCoupons + totalBanners;

    // Review satisfaction breakdown
    const fiveStars = reviews.filter((r) => Number(r.rating) === 5).length;
    const fourStars = reviews.filter((r) => Number(r.rating) === 4).length;
    const otherStars = reviews.filter((r) => Number(r.rating) < 4).length;
    const totalReviews = reviews.length;

    // Category Spread
    const categoryMap = {};
    catalog.forEach((item) => {
      const cat = item.navbarTag || item.category || "General Collection";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const categoryDensity = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    if (categoryDensity.length === 0) {
      categoryDensity.push(
        { name: "Skin Care", count: Math.max(1, totalCatalogItems) },
        { name: "Bath & Body", count: 2 },
        { name: "Package Sets", count: 1 }
      );
    }

    return {
      totalCatalogItems,
      totalCoupons,
      totalBanners,
      totalMarketingAssets: Math.max(1, totalMarketingAssets),
      fiveStars,
      fourStars,
      otherStars,
      totalReviews,
      categoryDensity
    };
  }, [catalog, coupons, sections, reviews]);

  // Product Catalog Breakdown Metrics
  const publishedCount = useMemo(() => {
    return catalog.filter((p) => p.status === "published" || p.isPublished || p.isPublished === undefined).length;
  }, [catalog]);

  const draftCount = useMemo(() => {
    return catalog.filter((p) => p.status === "draft" || p.isPublished === false).length;
  }, [catalog]);

  const promoCount = useMemo(() => {
    return catalog.filter((p) => p.discountPrice || p.onSale || p.badge).length;
  }, [catalog]);

  // Donut Chart SVG Calculation
  const donutData = useMemo(() => {
    const total = dashboardStats.totalMarketingAssets;
    const catCount = dashboardStats.totalCatalogItems;
    const coupCount = dashboardStats.totalCoupons;
    const bannerCount = dashboardStats.totalBanners;

    const catPct = Math.round((catCount / total) * 100);
    const coupPct = Math.round((coupCount / total) * 100);
    const bannerPct = Math.max(0, 100 - catPct - coupPct);

    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    const catStroke = (catCount / total) * circumference;
    const coupStroke = (coupCount / total) * circumference;
    const bannerStroke = (bannerCount / total) * circumference;

    const catOffset = 0;
    const coupOffset = -catStroke;
    const bannerOffset = -(catStroke + coupStroke);

    return {
      catCount,
      coupCount,
      bannerCount,
      catPct,
      coupPct,
      bannerPct,
      radius,
      circumference,
      catStroke,
      coupStroke,
      bannerStroke,
      catOffset,
      coupOffset,
      bannerOffset
    };
  }, [dashboardStats]);

  // Max value for Grouped Bar Chart Scaling
  const maxBarVal = Math.max(
    dashboardStats.totalReviews,
    dashboardStats.fiveStars,
    dashboardStats.fourStars,
    dashboardStats.otherStars,
    10
  );

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[460px] py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-3 border-[#153E97]/20 border-t-[#153E97] animate-spin" />
            <div className="absolute w-7 h-7 rounded-full bg-[#153E97]/10 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#153E97] animate-ping" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Loading Marketing Analytics...
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Updating product catalogs, active promotions & customer reviews
            </span>
          </div>
        </div>
      </div>
    );
  }

  const liveStorePct = catalog.length > 0 ? Math.round((publishedCount / catalog.length) * 100) : 0;

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700 pb-12">

      {/* TOP SUMMARY KPI CARDS (UNIFIED CENTRAL MARKETING KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Store Products with Live Progress Bar */}
        <div
          onClick={() => setActiveTab && setActiveTab("product-catalog")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#01390f]/50 cursor-pointer group"
          title="Click to view Product Catalog"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#01390f] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
                Store Products
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-tight whitespace-nowrap">
                  {catalog.length}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  SKUs
                </span>
              </div>
            </div>
          </div>

          {/* Live Storefront Progress / Loading Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-700 font-medium truncate">
                <strong className="text-slate-900 font-mono font-bold">
                  {publishedCount}
                </strong>
                <span className="text-slate-400"> / {catalog.length} live on store</span>
              </span>
              <span className="text-[10px] font-bold font-mono text-[#153E97] bg-blue-50 px-1.5 py-0.5 rounded border border-[#153E97]/20 shadow-2xs shrink-0">
                {liveStorePct}%
              </span>
            </div>

            {/* Loading / Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
              <div
                className="bg-[#153E97] h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, liveStorePct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Live on Storefront */}
        <div
          onClick={() => setActiveTab && setActiveTab("product-catalog")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view Live Storefront Products"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
                Live on Storefront
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-tight whitespace-nowrap">
                  {publishedCount}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Products
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">Visible to online buyers</span>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              Published
            </span>
          </div>
        </div>

        {/* Card 3: Draft / Hidden */}
        <div
          onClick={() => setActiveTab && setActiveTab("product-catalog")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view Draft & Hidden Catalog Items"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider truncate whitespace-nowrap">
                Draft & Inactive
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#153E97] leading-tight whitespace-nowrap">
                  {draftCount}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Items
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">Pending approval / restock</span>
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              Drafts
            </span>
          </div>
        </div>

        {/* Card 4: Active Promos & Sale (#153E97 Solid Card) */}
        <div
          onClick={() => setActiveTab && setActiveTab("promotions-vouchers")}
          className="bg-[#153E97] border border-[#153E97] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:brightness-105 cursor-pointer group text-white"
          title="Click to view Promotions & Vouchers"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate whitespace-nowrap">
                Active Promos & Sale
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-white leading-tight whitespace-nowrap">
                  {promoCount}
                </span>
                <span className="text-[11px] text-white/90 font-semibold uppercase tracking-wider">
                  Coupons
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] text-white">
            <span className="truncate text-white font-medium">Badged with discount</span>
            <span className="text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded border border-white/30">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* 2X2 BALANCED CHARTS GRID (UNIFIED #01390f & #153E97 PALETTE WITH CHART/TABLE TOGGLES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. MARKETING ASSETS DONUT & TABLE */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <Clock className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Campaign Asset Allocation
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setAssetView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  assetView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Graph View (Donut)"
                aria-label="Graph View"
              >
                <PieChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAssetView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  assetView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Table View (Data Breakdown)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {assetView === "chart" ? (
            /* DONUT SVG CHART */
            <div className="py-5 flex flex-col items-center justify-center relative">
              <svg className="w-44 h-44 sm:w-52 sm:h-52 transform -rotate-90" viewBox="0 0 160 160">
                {/* Background Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#F1F5F9"
                  strokeWidth="18"
                  fill="transparent"
                />

                {/* Catalog Products Segment (#01390f) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#01390f"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.catStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.catOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#025215] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Catalog: ${donutData.catCount} (${donutData.catPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Discount Coupons Segment (#153E97) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#153E97"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.coupStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.coupOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#1d52c7] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Vouchers: ${donutData.coupCount} (${donutData.coupPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Banner Ads Segment (#d97706) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#d97706"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.bannerStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.bannerOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#b45309] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Ads: ${donutData.bannerCount} (${donutData.bannerPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              </svg>

              {/* Centered Donut Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Campaigns</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[0] : `${dashboardStats.totalCatalogItems} SKUs`}
                </span>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[1] : "Active Assets"}
                </span>
              </div>
            </div>
          ) : (
            /* TABLE BREAKDOWN VIEW */
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Asset Channel</th>
                    <th className="pb-2 text-center whitespace-nowrap">Color</th>
                    <th className="pb-2 text-right whitespace-nowrap">Units / Items</th>
                    <th className="pb-2 text-right whitespace-nowrap">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Product Catalog Listings</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#01390f] border border-emerald-200">
                        #01390f
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {donutData.catCount}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {donutData.catPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Discount Coupons & Vouchers</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#153E97] border border-blue-200">
                        #153E97
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {donutData.coupCount}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {donutData.coupPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Storefront Sections & Banners</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        #d97706
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {donutData.bannerCount}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {donutData.bannerPct}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* LEGEND BADGES */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold gap-2 whitespace-nowrap">
            <div className="flex items-center gap-4 whitespace-nowrap">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#01390f] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">Catalog ({donutData.catCount})</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#153E97] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">Coupons ({donutData.coupCount})</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#d97706] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">Ads ({donutData.bannerCount})</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Total: {dashboardStats.totalMarketingAssets} assets</span>
          </div>
        </div>

        {/* 2. CUSTOMER SATISFACTION & REVIEWS (GROUPED BAR & TABLE) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <BarChart3 className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Ratings Volume
              </h3>
            </div>

            {/* Header controls: Legends + Icon-Only View Toggle */}
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="flex items-center gap-3 text-xs font-bold whitespace-nowrap">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-3 h-3 rounded bg-[#01390f] shrink-0"></span>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-nowrap">5-Star High</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-3 h-3 rounded bg-[#153E97] shrink-0"></span>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-nowrap">Standard / Other</span>
                </div>
              </div>

              {/* View Toggle */}
              <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
                <button
                  onClick={() => setRatingsView("chart")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    ratingsView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Graph View (Grouped Bars)"
                  aria-label="Graph View"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRatingsView("table")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    ratingsView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Table View (Comparison Metrics)"
                  aria-label="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {ratingsView === "chart" ? (
            /* GROUPED BAR GRAPH CONTAINER */
            <div className="py-4 sm:py-6 flex flex-col gap-2 overflow-x-auto no-scrollbar">
              <div className="h-56 min-w-[280px] sm:min-w-0 w-full flex items-end justify-between gap-3 sm:gap-6 px-1 sm:px-6 relative border-b border-slate-200">
                {/* Grid Reference Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-slate-200 w-full"></div>
                  <div className="border-b border-dashed border-slate-200 w-full"></div>
                  <div className="border-b border-dashed border-slate-200 w-full"></div>
                  <div className="border-b border-dashed border-slate-200 w-full"></div>
                </div>

                {/* GROUP 1: OVERALL SATISFACTION */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    {/* 5-Star Bar (#01390f) */}
                    <div
                      style={{ height: `${Math.max(14, (Math.max(1, dashboardStats.fiveStars) / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.fiveStars} High
                      </span>
                    </div>

                    {/* 4-Star Bar (#153E97) */}
                    <div
                      style={{ height: `${Math.max(14, (Math.max(0, dashboardStats.fourStars) / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.fourStars} Good
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Overall Ratings</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.fiveStars} vs {dashboardStats.fourStars}</span>
                  </div>
                </div>

                {/* GROUP 2: REVIEWS VOLUME */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    <div
                      style={{ height: `${Math.max(14, (Math.max(1, dashboardStats.totalReviews) / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.totalReviews} Total
                      </span>
                    </div>

                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.otherStars / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.otherStars} Neutral
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Feedback Spread</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.totalReviews} vs {dashboardStats.otherStars}</span>
                  </div>
                </div>

                {/* GROUP 3: MARKETING REACH */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.totalCatalogItems / Math.max(dashboardStats.totalCatalogItems, 10)) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.totalCatalogItems} Active
                      </span>
                    </div>

                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.totalCoupons / Math.max(dashboardStats.totalCoupons, 5)) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.totalCoupons} Vouchers
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Campaign Reach</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.totalCatalogItems} vs {dashboardStats.totalCoupons}</span>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            /* COMPARISON TABLE VIEW */
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Feedback Metric</th>
                    <th className="pb-2 text-right whitespace-nowrap">High Rating (#01390f)</th>
                    <th className="pb-2 text-right whitespace-nowrap">Neutral/Standard (#153E97)</th>
                    <th className="pb-2 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Customer Star Breakdown</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.fiveStars} Reviews (5★)
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.fourStars} Reviews (4★)
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Top Rated
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Overall Feedback Submissions</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.totalReviews} Total
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.otherStars} &lt;4 Stars
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Audited
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Marketing Catalog &amp; Coupons</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.totalCatalogItems} Products
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.totalCoupons} Vouchers
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        Active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-1 whitespace-nowrap">
            <span className="whitespace-nowrap">Scale: 0 to {maxBarVal} customer responses</span>
            <span className="font-semibold text-[#01390f] whitespace-nowrap">Live Sentiment Tracking</span>
          </div>
        </div>

        {/* 3. STOREFRONT CATEGORY DENSITY DISTRIBUTION */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <Database className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Category Density Distribution
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setCategoryView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  categoryView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Bar Density View"
                aria-label="Bar View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCategoryView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  categoryView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Table View (Data Breakdown)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {categoryView === "chart" ? (
            <div className="py-4 flex flex-col gap-3.5">
              {dashboardStats.categoryDensity.map((cat, idx) => {
                const maxCat = dashboardStats.categoryDensity[0]?.count || 1;
                const pct = Math.round((cat.count / maxCat) * 100);

                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs font-bold gap-2">
                      <span className="text-slate-800 truncate flex-1">{cat.name}</span>
                      <span className="font-mono text-slate-900 shrink-0">{cat.count} listings</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        style={{ width: `${Math.max(8, pct)}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx % 2 === 0 ? "bg-[#01390f]" : "bg-[#153E97]"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Product Category</th>
                    <th className="pb-2 text-right whitespace-nowrap">Listings Count</th>
                    <th className="pb-2 text-right whitespace-nowrap">Density Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dashboardStats.categoryDensity.map((cat, idx) => {
                    const pct = Math.round((cat.count / (dashboardStats.totalCatalogItems || 1)) * 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 font-bold text-slate-800 whitespace-nowrap">{cat.name}</td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {cat.count} items
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-1 whitespace-nowrap">
            <span>Primary storefront sections</span>
            <span className="text-[#01390f] font-bold">Updated Live</span>
          </div>
        </div>

        {/* 4. QUANTITY BREAKDOWN (ACTUAL COUNT) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <Boxes className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Quantity Breakdown (Actual Count)
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setQuantityView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  quantityView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Bar View"
                aria-label="Bar View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setQuantityView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  quantityView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Table View (Comparison Metrics)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {quantityView === "chart" ? (
            /* DUAL COMPARISON BARS (#01390f & #153E97) */
            <div className="py-6 flex items-end justify-around gap-4 sm:gap-6 h-56 border-b border-slate-200 px-2 sm:px-4 relative">
              {/* Grid Reference Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-dashed border-slate-200 w-full"></div>
                <div className="border-b border-dashed border-slate-200 w-full"></div>
                <div className="border-b border-dashed border-slate-200 w-full"></div>
              </div>

              {/* Published Catalog Listings (#01390f) */}
              <div className="flex flex-col items-center gap-2 h-full justify-end z-10 flex-1 max-w-[110px] sm:max-w-[140px]">
                <div
                  style={{
                    height: `${Math.max(16, (dashboardStats.totalCatalogItems / Math.max(dashboardStats.totalCatalogItems, dashboardStats.totalCoupons, 1)) * 100)}%`
                  }}
                  className="w-full bg-[#01390f] hover:brightness-110 rounded-t-2xl transition-all shadow-md flex items-start justify-center pt-2 relative group cursor-pointer"
                >
                  <span className="text-white font-mono font-black text-xs sm:text-sm">
                    {dashboardStats.totalCatalogItems} SKUs
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 text-center leading-tight">
                  Catalog Listings
                </span>
              </div>

              {/* Active Coupon Vouchers (#153E97) */}
              <div className="flex flex-col items-center gap-2 h-full justify-end z-10 flex-1 max-w-[110px] sm:max-w-[140px]">
                <div
                  style={{
                    height: `${Math.max(16, (dashboardStats.totalCoupons / Math.max(dashboardStats.totalCatalogItems, dashboardStats.totalCoupons, 1)) * 100)}%`
                  }}
                  className="w-full bg-[#153E97] hover:brightness-110 rounded-t-2xl transition-all shadow-md flex items-start justify-center pt-2 relative group cursor-pointer"
                >
                  <span className="text-white font-mono font-black text-xs sm:text-sm">
                    {dashboardStats.totalCoupons} Vouchers
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 text-center leading-tight">
                  Discount Vouchers
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Asset Category</th>
                    <th className="pb-2 text-right whitespace-nowrap">Volume</th>
                    <th className="pb-2 text-center whitespace-nowrap">Theme Color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Live Catalog Listings</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.totalCatalogItems} SKUs
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#01390f] border border-emerald-200">
                        #01390f
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Active Promotional Coupons</td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.totalCoupons} Vouchers
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#153E97] border border-blue-200">
                        #153E97
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-1 whitespace-nowrap">
            <span>Storefront marketing audit on hand</span>
          </div>
        </div>

      </div>

    </div>
  );
}

export default MarketingDashboard;
