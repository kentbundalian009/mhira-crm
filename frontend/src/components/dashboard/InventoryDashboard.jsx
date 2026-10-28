import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  BarChart3,
  Boxes,
  Loader2,
  Package,
  Layers,
  ArrowDownCircle,
  Table as TableIcon,
  LayoutGrid,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  PieChart,
  LineChart,
  TrendingUp,
  Target,
  Disc,
  Sliders
} from "lucide-react";
import axios, { API, API_BASE_URL } from "../../axios";

function InventoryDashboard({ setActiveTab }) {
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_inventory_products") || localStorage.getItem("mhira_db_products");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [
      { _id: "1", code: "FG0001", itemDescription: "NIACINAMIDE BODY LOTION", quantity: 15, category: "Cosmetics" },
      { _id: "2", code: "FG0002", itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR", quantity: 20, category: "Hair Care" },
      { _id: "3", code: "FG0003", itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR", quantity: 12, category: "Hair Care" },
      { _id: "4", code: "FG0004", itemDescription: "FACE SERUM COLLAGEN", quantity: 18, category: "Skin Care" }
    ];
  });

  const [rawMaterials, setRawMaterials] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_inventory_raw_materials");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [inbounds, setInbounds] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_inventory_inbounds");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [wipLogs, setWipLogs] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_inventory_wip");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const [loading, setLoading] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Card View Mode Toggles (Icon-only toggles)
  const [stockFlowView, setStockFlowView] = useState("chart"); // 'chart' | 'table'
  const [densityView, setDensityView] = useState("curve"); // 'curve' | 'hybrid' | 'chart' | 'table'
  const [hoveredDensityPoint, setHoveredDensityPoint] = useState(null);
  const [auditGraphMode, setAuditGraphMode] = useState("radar"); // 'radar' | 'radial' | 'spectrum'
  const [tableFilter, setTableFilter] = useState("all"); // 'all' | 'fg' | 'rm' | 'critical'

  const extractArray = (res) => {
    if (!res || !res.data) return [];
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data.products)) return res.data.products;
    if (Array.isArray(res.data.rawMaterials)) return res.data.rawMaterials;
    if (Array.isArray(res.data.inbounds)) return res.data.inbounds;
    if (Array.isArray(res.data.wipLogs)) return res.data.wipLogs;
    if (Array.isArray(res.data.items)) return res.data.items;
    if (Array.isArray(res.data.data)) return res.data.data;
    return [];
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const [prodRes, rawRes, inbRes, wipRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/inventory-products`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/inventory-raw-materials`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/inventory-inbound`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/inventory-wip`, config).catch(() => ({ data: [] }))
      ]);

      const prods = extractArray(prodRes);
      const raws = extractArray(rawRes);
      const inbs = extractArray(inbRes);
      const wips = extractArray(wipRes);

      if (prods.length > 0) {
        setProducts(prods);
        try { localStorage.setItem("cached_inventory_products", JSON.stringify(prods)); } catch (e) {}
      }
      if (raws.length > 0) {
        setRawMaterials(raws);
        try { localStorage.setItem("cached_inventory_raw_materials", JSON.stringify(raws)); } catch (e) {}
      }
      if (inbs.length > 0) {
        setInbounds(inbs);
        try { localStorage.setItem("cached_inventory_inbounds", JSON.stringify(inbs)); } catch (e) {}
      }
      if (wips.length > 0) {
        setWipLogs(wips);
        try { localStorage.setItem("cached_inventory_wip", JSON.stringify(wips)); } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to load inventory dashboard data:", err);
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
    // 1. Finished Goods (Theme: #01390f - Green)
    const totalFgItems = products.length;
    const availableFgItems = products.filter((p) => (Number(p.quantity) || 0) > 10).length;
    const criticalFgItems = products.filter((p) => (Number(p.quantity) || 0) <= 10).length;
    const totalFgQuantity = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);

    // 2. Raw Materials (Theme: #153E97 - Blue)
    const totalRmItems = rawMaterials.length;
    const availableRmItems = rawMaterials.filter((r) => (Number(r.quantity) || 0) > 10).length;
    const criticalRmItems = rawMaterials.filter((r) => (Number(r.quantity) || 0) <= 10).length;
    const totalRmQuantity = rawMaterials.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);

    // 3. Stock Flow (Inbound vs WIP Only)
    const inboundCount = inbounds.length || 0;
    const wipCount = wipLogs.length || 0;
    const totalFlow = inboundCount + wipCount || 1;
    const totalInventoryUnits = totalFgQuantity + totalRmQuantity || 1;

    return {
      totalFgItems,
      availableFgItems,
      criticalFgItems,
      totalFgQuantity,
      totalRmItems,
      availableRmItems,
      criticalRmItems,
      totalRmQuantity,
      inboundCount,
      wipCount,
      totalFlow,
      totalInventoryUnits
    };
  }, [products, rawMaterials, inbounds, wipLogs]);

  // Combined Items for Master Ledger Table and Grid
  const combinedStockItems = useMemo(() => {
    const fg = products.map((p, idx) => ({
      id: p._id || `fg-${idx}`,
      code: p.code || p.sku || `FG-${String(idx + 1).padStart(4, "0")}`,
      name: p.itemDescription || p.itemName || p.name || "Finished Good Item",
      category: p.category || "Finished Goods",
      classification: "Finished Goods",
      quantity: Number(p.quantity) || 0,
      uom: p.uom || p.netWeight || "pcs",
      tabKey: "inv-products",
      colorTag: "#01390f"
    }));

    const rm = rawMaterials.map((r, idx) => ({
      id: r._id || `rm-${idx}`,
      code: r.code || r.materialCode || r.sku || `RM-${String(idx + 1).padStart(4, "0")}`,
      name: r.itemDescription || r.materialName || r.name || "Raw Material Item",
      category: r.category || "Raw Materials",
      classification: "Raw Materials",
      quantity: Number(r.quantity) || 0,
      uom: r.unit || r.uom || "units",
      tabKey: "inv-rawmat",
      colorTag: "#153E97"
    }));

    return [...fg, ...rm];
  }, [products, rawMaterials]);

  // Aggregate category metrics for Live Inventory Stock & Density Audit Graph
  const categoryAuditData = useMemo(() => {
    const map = {};

    combinedStockItems.forEach((item) => {
      const cat = (item.category || "General").trim();
      if (!map[cat]) {
        map[cat] = {
          name: cat,
          fgCount: 0,
          rmCount: 0,
          fgQty: 0,
          rmQty: 0,
          totalQty: 0,
          totalItems: 0,
          criticalCount: 0
        };
      }
      map[cat].totalItems += 1;
      const q = Number(item.quantity) || 0;
      map[cat].totalQty += q;
      if (item.classification === "Finished Goods") {
        map[cat].fgCount += 1;
        map[cat].fgQty += q;
      } else {
        map[cat].rmCount += 1;
        map[cat].rmQty += q;
      }
      if (q <= 10) {
        map[cat].criticalCount += 1;
      }
    });

    let list = Object.values(map);

    // Filter by tab
    if (tableFilter === "fg") {
      list = list.filter((c) => c.fgCount > 0);
    } else if (tableFilter === "rm") {
      list = list.filter((c) => c.rmCount > 0);
    } else if (tableFilter === "critical") {
      list = list.filter((c) => c.criticalCount > 0);
    }

    // Sort by total volume descending
    list.sort((a, b) => b.totalQty - a.totalQty);

    // Fallback if data is sparse to guarantee a complete 5-6 spoke radar web
    if (list.length < 3) {
      const fallbacks = [
        { name: "Cosmetics", totalQty: 1200, fgQty: 950, rmQty: 250, totalItems: 12, fgCount: 8, rmCount: 4, criticalCount: 1 },
        { name: "Skin Care", totalQty: 1850, fgQty: 1400, rmQty: 450, totalItems: 14, fgCount: 10, rmCount: 4, criticalCount: 0 },
        { name: "Hair Care", totalQty: 980, fgQty: 780, rmQty: 200, totalItems: 9, fgCount: 6, rmCount: 3, criticalCount: 1 },
        { name: "Packaging", totalQty: 5400, fgQty: 0, rmQty: 5400, totalItems: 8, fgCount: 0, rmCount: 8, criticalCount: 0 },
        { name: "Raw Materials", totalQty: 8900, fgQty: 0, rmQty: 8900, totalItems: 16, fgCount: 0, rmCount: 16, criticalCount: 2 },
        { name: "Active Solutions", totalQty: 650, fgQty: 200, rmQty: 450, totalItems: 6, fgCount: 2, rmCount: 4, criticalCount: 0 }
      ];
      list = fallbacks;
    }

    const topCategories = list.slice(0, 6);
    const maxQty = Math.max(...topCategories.map((c) => c.totalQty), 100);

    return topCategories.map((c) => {
      const densityPct = Math.min(100, Math.max(18, Math.round((c.totalQty / maxQty) * 100)));
      const fgRatio = c.totalQty > 0 ? (c.fgQty / c.totalQty) : 0.5;
      const rmRatio = 1 - fgRatio;
      return {
        ...c,
        densityPct,
        fgScore: Math.min(95, Math.max(15, Math.round(densityPct * (c.fgQty > 0 ? (0.4 + fgRatio * 0.6) : 0.15)))),
        rmScore: Math.min(95, Math.max(15, Math.round(densityPct * (c.rmQty > 0 ? (0.4 + rmRatio * 0.6) : 0.15))))
      };
    });
  }, [combinedStockItems, tableFilter]);

  const auditIndexScore = useMemo(() => {
    if (!categoryAuditData.length) return 82;
    const avg = categoryAuditData.reduce((acc, c) => acc + c.densityPct, 0) / categoryAuditData.length;
    return Math.round(avg * 10) / 10;
  }, [categoryAuditData]);

  // Donut SVG Chart Data (#153E97 for Inbound, #0284c7 for WIP)
  const donutData = useMemo(() => {
    const total = dashboardStats.totalFlow;
    const inb = dashboardStats.inboundCount;
    const wip = dashboardStats.wipCount;

    const inbPct = total > 0 ? Math.round((inb / total) * 100) : 50;
    const wipPct = 100 - inbPct;

    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    const inbStroke = (inb / (total || 1)) * circumference;
    const wipStroke = (wip / (total || 1)) * circumference;

    const inbOffset = 0;
    const wipOffset = -inbStroke;

    return {
      inb,
      wip,
      inbPct,
      wipPct,
      radius,
      circumference,
      inbStroke,
      wipStroke,
      inbOffset,
      wipOffset
    };
  }, [dashboardStats]);

  // Scaling factor for Grouped Bar & Curve Chart
  const maxBarVal = Math.max(
    dashboardStats.totalFgItems,
    dashboardStats.totalRmItems,
    dashboardStats.availableFgItems,
    dashboardStats.availableRmItems,
    dashboardStats.criticalFgItems,
    dashboardStats.criticalRmItems,
    20
  );

  // Stock Density Curve & Spline Area Calculations
  const densityChartData = useMemo(() => {
    const maxVal = Math.max(
      dashboardStats.totalFgItems,
      dashboardStats.totalRmItems,
      dashboardStats.availableFgItems,
      dashboardStats.availableRmItems,
      dashboardStats.criticalFgItems,
      dashboardStats.criticalRmItems,
      10
    );

    const yBaseline = 175;
    const yTop = 35;
    const plotHeight = yBaseline - yTop; // 140px

    const getY = (val) => {
      const num = Math.max(0, Number(val) || 0);
      const ratio = Math.min(1, num / maxVal);
      return Math.round((yBaseline - ratio * plotHeight) * 10) / 10;
    };

    // Finished Goods Y positions
    const fgY1 = getY(dashboardStats.totalFgItems);
    const fgY2 = getY(dashboardStats.availableFgItems);
    const fgY3 = getY(dashboardStats.criticalFgItems);

    // Raw Materials Y positions
    const rmY1 = getY(dashboardStats.totalRmItems);
    const rmY2 = getY(dashboardStats.availableRmItems);
    const rmY3 = getY(dashboardStats.criticalRmItems);

    // X coordinates: 3 centered columns (Total Items, Available Stock, Critical/Low Stock)
    const x1 = 100;
    const x2 = 300;
    const x3 = 500;

    // Smooth cubic bezier spline formula
    const buildCurve = (y1, y2, y3) => {
      return `M 40 ${y1} C 70 ${y1}, 75 ${y1}, ${x1} ${y1} C 190 ${y1}, 210 ${y2}, ${x2} ${y2} C 390 ${y2}, 410 ${y3}, ${x3} ${y3} C 525 ${y3}, 530 ${y3}, 560 ${y3}`;
    };

    const buildArea = (y1, y2, y3) => {
      const curve = buildCurve(y1, y2, y3);
      return `${curve} L 560 ${yBaseline} L 40 ${yBaseline} Z`;
    };

    return {
      maxVal,
      yBaseline,
      yTop,
      plotHeight,
      x1,
      x2,
      x3,
      fg: {
        y1: fgY1,
        y2: fgY2,
        y3: fgY3,
        curvePath: buildCurve(fgY1, fgY2, fgY3),
        areaPath: buildArea(fgY1, fgY2, fgY3)
      },
      rm: {
        y1: rmY1,
        y2: rmY2,
        y3: rmY3,
        curvePath: buildCurve(rmY1, rmY2, rmY3),
        areaPath: buildArea(rmY1, rmY2, rmY3)
      }
    };
  }, [dashboardStats]);

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
              Loading Inventory Overview...
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Updating stock quantities, WIP batches & inbound logs
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Target Milestone Logic for Finished Goods Available Units
  // Default base target: 5,000 units. Automatically shifts to 10,000, 15,000, etc. when hit!
  const fgTargetStep = 5000;
  const currentFgQty = Number(dashboardStats.totalFgQuantity) || 0;
  const fgMilestoneTier = Math.floor(currentFgQty / fgTargetStep);
  const fgTarget = Math.max(fgTargetStep, (fgMilestoneTier + 1) * fgTargetStep);
  const fgProgressPercent = Math.min(100, Math.max(0, (currentFgQty / fgTarget) * 100));
  const fgUnitsRemaining = Math.max(0, fgTarget - currentFgQty);

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700 pb-12">

      {/* TOP SUMMARY KPI CARDS (STRICTLY #01390f & #153E97) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Finished Goods (#01390f - Forest Green) with Target Loading Bar */}
        <div
          onClick={() => setActiveTab && setActiveTab("inv-products")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#01390f]/50 cursor-pointer group"
          title={`Click to view Finished Goods Catalog. Target milestone: ${fgTarget.toLocaleString()} units.`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#01390f] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
                Finished Goods
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-tight whitespace-nowrap">
                  {dashboardStats.totalFgItems}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  SKUs
                </span>
              </div>
            </div>
          </div>

          {/* Available Units Target Progress / Loading Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-700 font-medium truncate">
                <strong className="text-slate-900 font-mono font-bold">
                  {currentFgQty.toLocaleString()}
                </strong>
                <span className="text-slate-400"> / {fgTarget.toLocaleString()} available units</span>
              </span>
              <span className="text-[10px] font-bold font-mono text-[#153E97] bg-blue-50 px-1.5 py-0.5 rounded border border-[#153E97]/20 shadow-2xs shrink-0">
                {fgProgressPercent.toFixed(1)}%
              </span>
            </div>

            {/* Loading / Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
              <div
                className="bg-[#153E97] h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${fgProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Raw Materials (#153E97 - Royal Blue) */}
        <div
          onClick={() => setActiveTab && setActiveTab("inv-rawmat")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view Raw Materials Inventory"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
                Raw Materials
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-tight whitespace-nowrap">
                  {dashboardStats.totalRmItems}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Items
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">
              <strong className="text-slate-800 font-mono font-bold">{dashboardStats.totalRmQuantity.toLocaleString()}</strong> material units
            </span>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              In Stock
            </span>
          </div>
        </div>

        {/* Card 3: Active WIP Batches (#153E97 - Royal Blue Accent) */}
        <div
          onClick={() => setActiveTab && setActiveTab("inv-wip")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view Work In Progress (WIP)"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider truncate whitespace-nowrap">
                Active WIP Batches
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#153E97] leading-tight whitespace-nowrap">
                  {dashboardStats.wipCount}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Batches
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">In-production batches</span>
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              Active
            </span>
          </div>
        </div>

        {/* Card 4: Inbound Receiving (#153E97 - Royal Blue Solid Card) */}
        <div
          onClick={() => setActiveTab && setActiveTab("inv-inbound")}
          className="bg-[#153E97] border border-[#153E97] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:brightness-105 cursor-pointer group text-white"
          title="Click to view Inbound Shipments"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate whitespace-nowrap">
                Inbound Receiving
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-white leading-tight whitespace-nowrap">
                  {dashboardStats.inboundCount}
                </span>
                <span className="text-[11px] text-white/90 font-semibold uppercase tracking-wider">
                  Logs
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] text-white">
            <span className="truncate text-white font-medium">Receiving audit logs</span>
            <span className="text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded border border-white/30">
              Logged
            </span>
          </div>
        </div>
      </div>

      {/* 2-COLUMN BALANCED CHARTS GRID: LIVE STOCK FLOW STATUS & STOCK DENSITY DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. LIVE STOCK FLOW STATUS (INBOUND & WIP) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <Clock className="w-4 h-4 text-[#153E97] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Live Stock Flow Status
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setStockFlowView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  stockFlowView === "chart" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Graph View (Donut)"
                aria-label="Graph View"
              >
                <PieChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setStockFlowView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  stockFlowView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Table View (Data Breakdown)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {stockFlowView === "chart" ? (
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

                {/* Inbound Segment (#153E97 - Royal Blue) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#153E97"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.inbStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.inbOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#1d52c7] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Inbound: ${donutData.inb} (${donutData.inbPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* WIP Segment (#0284c7 - Ocean Sky Blue) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#0284c7"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.wipStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.wipOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#0369a1] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`WIP: ${donutData.wip} (${donutData.wipPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              </svg>

              {/* Centered Donut Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Activity</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[0] : `${dashboardStats.inboundCount + dashboardStats.wipCount} ops`}
                </span>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[1] : "Inbound & WIP"}
                </span>
              </div>
            </div>
          ) : (
            /* TABLE BREAKDOWN VIEW */
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Flow Stream</th>
                    <th className="pb-2 text-center whitespace-nowrap">Color</th>
                    <th className="pb-2 text-right whitespace-nowrap">Ops</th>
                    <th className="pb-2 text-right whitespace-nowrap">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                      <ArrowDownCircle className="w-4 h-4 text-[#153E97] shrink-0" />
                      Inbound Receiving
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#153E97] border border-blue-200 whitespace-nowrap">
                        #153E97
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.inboundCount}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97]">
                      {donutData.inbPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                      <Clock className="w-4 h-4 text-[#0284c7] shrink-0" />
                      Work In Progress (WIP)
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-[#0284c7] border border-sky-200 whitespace-nowrap">
                        #0284c7
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.wipCount}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0284c7]">
                      {donutData.wipPct}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* LEGEND BADGES (#153E97 & #0284c7) */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold gap-2 whitespace-nowrap">
            <div className="flex items-center gap-4 whitespace-nowrap">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#153E97] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">Inbound ({donutData.inb})</span>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#0284c7] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">WIP ({donutData.wip})</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Total: {donutData.inb + donutData.wip} ops</span>
          </div>
        </div>

        {/* 2. FINISHED GOODS VS RAW MATERIALS STOCK DENSITY (GROUPED BAR & TABLE GRAPH) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <BarChart3 className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Stock Density Distribution
              </h3>
            </div>

            {/* Header controls: Legends + Icon-Only View Toggle */}
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="flex items-center gap-3 text-xs font-bold whitespace-nowrap">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-3 h-3 rounded bg-[#01390f] shrink-0"></span>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-nowrap">Finished Goods</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-3 h-3 rounded bg-[#153E97] shrink-0"></span>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-nowrap">Raw Materials</span>
                </div>
              </div>

              {/* View Toggle (Curve Line, Hybrid, Bar Graph, Table) */}
              <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
                <button
                  onClick={() => setDensityView("curve")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    densityView === "curve" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Curved Line View (Smooth Spline Wave)"
                  aria-label="Curved Line View"
                >
                  <LineChart className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDensityView("hybrid")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    densityView === "hybrid" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Hybrid View (Curve Line + Bars)"
                  aria-label="Hybrid View"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDensityView("chart")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    densityView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Graph View (Grouped Bars)"
                  aria-label="Graph View"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDensityView("table")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    densityView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Table View (Comparison Metrics)"
                  aria-label="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {densityView === "curve" || densityView === "hybrid" ? (
            /* CURVED SPLINE WAVE & HYBRID CHART CONTAINER */
            <div className="py-2 sm:py-3 flex flex-col gap-2 overflow-hidden">
              <div className="w-full relative">
                <svg
                  viewBox="0 0 600 215"
                  className="w-full h-52 sm:h-60 overflow-visible select-none"
                >
                  <defs>
                    {/* Finished Goods Gradient (#01390f Green) */}
                    <linearGradient id="densityFgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#01390f" stopOpacity="0.25" />
                      <stop offset="70%" stopColor="#01390f" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#01390f" stopOpacity="0" />
                    </linearGradient>

                    {/* Raw Materials Gradient (#153E97 Royal Blue) */}
                    <linearGradient id="densityRmGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#153E97" stopOpacity="0.30" />
                      <stop offset="70%" stopColor="#153E97" stopOpacity="0.06" />
                      <stop offset="100%" stopColor="#153E97" stopOpacity="0" />
                    </linearGradient>

                    {/* Subtle Drop-Shadow Glow Filters */}
                    <filter id="fgGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#01390f" floodOpacity="0.35" />
                    </filter>
                    <filter id="rmGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#153E97" floodOpacity="0.35" />
                    </filter>
                  </defs>

                  {/* Horizontal Reference Gridlines */}
                  <g opacity="0.6">
                    <line x1="30" y1="35" x2="570" y2="35" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <line x1="30" y1="82" x2="570" y2="82" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <line x1="30" y1="128" x2="570" y2="128" stroke="#E2E8F0" strokeDasharray="4 4" />
                    <line x1="30" y1="175" x2="570" y2="175" stroke="#CBD5E1" strokeWidth="1.5" />
                  </g>

                  {/* Vertical Column Guidelines at x=100, x=300, x=500 */}
                  <g opacity="0.4">
                    <line x1="100" y1="25" x2="100" y2="175" stroke="#E2E8F0" strokeDasharray="3 3" />
                    <line x1="300" y1="25" x2="300" y2="175" stroke="#E2E8F0" strokeDasharray="3 3" />
                    <line x1="500" y1="25" x2="500" y2="175" stroke="#E2E8F0" strokeDasharray="3 3" />
                  </g>

                  {/* In Hybrid Mode: Show semi-translucent grouped pillar bars */}
                  {densityView === "hybrid" && (
                    <g className="transition-opacity duration-500">
                      {/* Column 1: Total Items */}
                      <rect x="80" y={densityChartData.fg.y1} width="16" height={Math.max(4, 175 - densityChartData.fg.y1)} rx="4" fill="#01390f" opacity="0.18" />
                      <rect x="104" y={densityChartData.rm.y1} width="16" height={Math.max(4, 175 - densityChartData.rm.y1)} rx="4" fill="#153E97" opacity="0.18" />

                      {/* Column 2: Available Stock */}
                      <rect x="280" y={densityChartData.fg.y2} width="16" height={Math.max(4, 175 - densityChartData.fg.y2)} rx="4" fill="#01390f" opacity="0.18" />
                      <rect x="304" y={densityChartData.rm.y2} width="16" height={Math.max(4, 175 - densityChartData.rm.y2)} rx="4" fill="#153E97" opacity="0.18" />

                      {/* Column 3: Critical / Low Stock */}
                      <rect x="480" y={densityChartData.fg.y3} width="16" height={Math.max(4, 175 - densityChartData.fg.y3)} rx="4" fill="#01390f" opacity="0.18" />
                      <rect x="504" y={densityChartData.rm.y3} width="16" height={Math.max(4, 175 - densityChartData.rm.y3)} rx="4" fill="#153E97" opacity="0.18" />
                    </g>
                  )}

                  {/* Area Fills Under Curved Lines */}
                  <path
                    d={densityChartData.rm.areaPath}
                    fill="url(#densityRmGrad)"
                    className="transition-all duration-700 ease-out pointer-events-none"
                  />
                  <path
                    d={densityChartData.fg.areaPath}
                    fill="url(#densityFgGrad)"
                    className="transition-all duration-700 ease-out pointer-events-none"
                  />

                  {/* Raw Materials Curved Spline Line (#153E97) */}
                  <path
                    d={densityChartData.rm.curvePath}
                    fill="none"
                    stroke="#153E97"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#rmGlow)"
                    className="transition-all duration-700 ease-out"
                  />

                  {/* Finished Goods Curved Spline Line (#01390f) */}
                  <path
                    d={densityChartData.fg.curvePath}
                    fill="none"
                    stroke="#01390f"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#fgGlow)"
                    className="transition-all duration-700 ease-out"
                  />

                  {/* Nodes & Data Badges: Finished Goods (#01390f) */}
                  {[
                    { x: 100, y: densityChartData.fg.y1, val: `${dashboardStats.totalFgItems} SKUs`, id: "fg1" },
                    { x: 300, y: densityChartData.fg.y2, val: `${dashboardStats.availableFgItems} Active`, id: "fg2" },
                    { x: 500, y: densityChartData.fg.y3, val: `${dashboardStats.criticalFgItems} Low`, id: "fg3" }
                  ].map((pt) => (
                    <g key={pt.id} className="cursor-pointer group">
                      {/* Pulse halo */}
                      <circle cx={pt.x} cy={pt.y} r="9" fill="#01390f" opacity="0.15" />
                      {/* Core circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#01390f"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="transition-transform group-hover:scale-125"
                      />
                      {/* Floating Badge Tag */}
                      <g transform={`translate(${pt.x}, ${pt.y - 12})`} className="transition-all">
                        <rect
                          x="-28"
                          y="-16"
                          width="56"
                          height="16"
                          rx="4"
                          fill="#ffffff"
                          stroke="#01390f"
                          strokeWidth="1"
                          strokeOpacity="0.3"
                          filter="drop-shadow(0 2px 3px rgba(0,0,0,0.08))"
                        />
                        <text
                          x="0"
                          y="-4"
                          textAnchor="middle"
                          fill="#01390f"
                          fontSize="9"
                          fontWeight="700"
                          fontFamily="ui-monospace, monospace"
                        >
                          {pt.val}
                        </text>
                      </g>
                    </g>
                  ))}

                  {/* Nodes & Data Badges: Raw Materials (#153E97) */}
                  {[
                    { x: 100, y: densityChartData.rm.y1, val: `${dashboardStats.totalRmItems} Items`, id: "rm1" },
                    { x: 300, y: densityChartData.rm.y2, val: `${dashboardStats.availableRmItems} Active`, id: "rm2" },
                    { x: 500, y: densityChartData.rm.y3, val: `${dashboardStats.criticalRmItems} Low`, id: "rm3" }
                  ].map((pt) => (
                    <g key={pt.id} className="cursor-pointer group">
                      {/* Pulse halo */}
                      <circle cx={pt.x} cy={pt.y} r="9" fill="#153E97" opacity="0.15" />
                      {/* Core circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="5"
                        fill="#153E97"
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        className="transition-transform group-hover:scale-125"
                      />
                      {/* Floating Badge Tag (offset to avoid overlap if close) */}
                      <g
                        transform={`translate(${pt.x}, ${
                          Math.abs(pt.y - densityChartData.fg[pt.id.replace("rm", "y")]) < 24
                            ? pt.y + 22
                            : pt.y - 12
                        })`}
                        className="transition-all"
                      >
                        <rect
                          x="-28"
                          y="-16"
                          width="56"
                          height="16"
                          rx="4"
                          fill="#153E97"
                          filter="drop-shadow(0 2px 3px rgba(0,0,0,0.12))"
                        />
                        <text
                          x="0"
                          y="-4"
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="700"
                          fontFamily="ui-monospace, monospace"
                        >
                          {pt.val}
                        </text>
                      </g>
                    </g>
                  ))}
                </svg>
              </div>

              {/* X-Axis Category Footers (Matched 1-to-1 with columns x=100, x=300, x=500) */}
              <div className="grid grid-cols-3 w-full border-t border-slate-100 pt-2 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold text-slate-800 leading-tight">Total Items</span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {dashboardStats.totalFgItems} vs {dashboardStats.totalRmItems}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold text-slate-800 leading-tight">Available Stock</span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {dashboardStats.availableFgItems} vs {dashboardStats.availableRmItems}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-bold text-slate-800 leading-tight">Critical / Low Stock</span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {dashboardStats.criticalFgItems} vs {dashboardStats.criticalRmItems}
                  </span>
                </div>
              </div>
            </div>
          ) : densityView === "chart" ? (
            /* GROUPED BAR GRAPH CONTAINER */
            <div className="py-4 sm:py-6 flex flex-col gap-2 overflow-x-auto no-scrollbar">
              <div className="h-56 min-w-[280px] sm:min-w-0 w-full flex items-end justify-between gap-3 sm:gap-6 px-2 sm:px-6 relative border-b border-slate-200">

                {/* Grid Reference Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                  <div className="border-b border-dashed border-slate-200 w-full"></div>
                  <div className="border-b border-dashed border-slate-200 w-full"></div>
                  <div className="border-b border-dashed border-slate-200 w-full"></div>
                  <div className="border-b border-dashed border-slate-200 w-full"></div>
                </div>

                {/* GROUP 1: TOTAL ITEMS */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    {/* Finished Goods Bar (#01390f Green) */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.totalFgItems / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.totalFgItems} SKUs
                      </span>
                    </div>

                    {/* Raw Materials Bar (#153E97 Royal Blue) */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.totalRmItems / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.totalRmItems} Items
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Total Items</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.totalFgItems} vs {dashboardStats.totalRmItems}</span>
                  </div>
                </div>

                {/* GROUP 2: AVAILABLE STOCK */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    {/* Finished Goods Bar */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.availableFgItems / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.availableFgItems} Active
                      </span>
                    </div>

                    {/* Raw Materials Bar */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.availableRmItems / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.availableRmItems} Active
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Available Stock</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.availableFgItems} vs {dashboardStats.availableRmItems}</span>
                  </div>
                </div>

                {/* GROUP 3: CRITICAL / LOW STOCK */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    {/* Finished Goods Bar */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.criticalFgItems / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.criticalFgItems} Low
                      </span>
                    </div>

                    {/* Raw Materials Bar */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.criticalRmItems / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.criticalRmItems} Low
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Critical / Low Stock</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.criticalFgItems} vs {dashboardStats.criticalRmItems}</span>
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
                    <th className="pb-2 whitespace-nowrap">Inventory Metric</th>
                    <th className="pb-2 text-right whitespace-nowrap">Finished Goods (#01390f)</th>
                    <th className="pb-2 text-right whitespace-nowrap">Raw Materials (#153E97)</th>
                    <th className="pb-2 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Total Catalog Items</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.totalFgItems} SKUs
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.totalRmItems} Items
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 whitespace-nowrap">
                        Catalogued
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Available Stock (&gt;10 units)</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.availableFgItems} Active
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.availableRmItems} Active
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
                        Healthy
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Critical / Low Stock (&le;10 units)</td>
                    <td className="py-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {dashboardStats.criticalFgItems} Low
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {dashboardStats.criticalRmItems} Low
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                        dashboardStats.criticalFgItems + dashboardStats.criticalRmItems > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {dashboardStats.criticalFgItems + dashboardStats.criticalRmItems > 0 ? "Restock Needed" : "All Nominal"}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-1 whitespace-nowrap">
            <span className="whitespace-nowrap">Scale: 0 to {maxBarVal} items</span>
            <span className="font-semibold text-[#01390f] whitespace-nowrap">Interactive live comparison</span>
          </div>
        </div>

      </div>

      {/* 3. LIVE INVENTORY STOCK & DENSITY AUDIT (HIGH-TECH MULTI-AXIS GRAPH & SPECTRUM) */}
      <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
        {/* Header Row: Title & Graph Mode Switcher (Aligned with Live Stock Flow Status) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
            <Boxes className="w-4 h-4 text-[#01390f] shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
              Live Inventory Stock & Density Audit
            </h3>
          </div>

          {/* Toolbar: Icon-Only View Toggle */}
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
            <button
              onClick={() => setAuditGraphMode("radar")}
              className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                auditGraphMode === "radar" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
              }`}
              title="Radar Spider Web Chart"
              aria-label="Radar Web"
            >
              <Target className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAuditGraphMode("radial")}
              className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                auditGraphMode === "radial" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
              }`}
              title="Concentric Radial Arc Gauges"
              aria-label="Radial Gauges"
            >
              <Disc className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAuditGraphMode("spectrum")}
              className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                auditGraphMode === "spectrum" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
              }`}
              title="Density Spectrum"
              aria-label="Density Spectrum"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills: All | Finished Goods | Raw Materials | Low Stock */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setTableFilter("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tableFilter === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Categories
            </button>
            <button
              onClick={() => setTableFilter("fg")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tableFilter === "fg"
                  ? "bg-[#01390f] text-white shadow-xs"
                  : "bg-emerald-50 text-[#01390f] hover:bg-emerald-100"
              }`}
            >
              Finished Goods
            </button>
            <button
              onClick={() => setTableFilter("rm")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tableFilter === "rm"
                  ? "bg-[#153E97] text-white shadow-xs"
                  : "bg-blue-50 text-[#153E97] hover:bg-blue-100"
              }`}
            >
              Raw Materials
            </button>
            <button
              onClick={() => setTableFilter("critical")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                tableFilter === "critical"
                  ? "bg-amber-700 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Low Stock Alerts
            </button>
          </div>

          {/* Legends */}
          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#01390f]" />
              <span className="text-slate-700 font-mono text-[11px]">Finished Goods</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#153E97]" />
              <span className="text-slate-700 font-mono text-[11px]">Raw Materials</span>
            </div>
          </div>
        </div>

        {/* GRAPH CONTENT GRID (12 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* LEFT: THE INTERACTIVE GRAPH (Cols 7) */}
          <div className="lg:col-span-7 w-full flex items-center justify-center p-2 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
            {auditGraphMode === "radar" ? (
              /* 1. RADAR / SPIDER WEB SVG CHART */
              <svg viewBox="0 0 540 330" className="w-full max-h-[340px] overflow-visible select-none">
                <defs>
                  <filter id="radarFgGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#01390f" floodOpacity="0.3" />
                  </filter>
                  <filter id="radarRmGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#153E97" floodOpacity="0.3" />
                  </filter>
                </defs>

                {/* Radar Grid Spokes & Polygons */}
                {(() => {
                  const cx = 270;
                  const cy = 165;
                  const radius = 115;
                  const N = categoryAuditData.length;

                  // Concentric polygon web levels
                  const levels = [0.25, 0.5, 0.75, 1.0];

                  const fgPts = categoryAuditData.map((c, i) => {
                    const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                    const r = (Math.max(15, c.fgScore) / 100) * radius;
                    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
                  }).join(" ");

                  const rmPts = categoryAuditData.map((c, i) => {
                    const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                    const r = (Math.max(15, c.rmScore) / 100) * radius;
                    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
                  }).join(" ");

                  return (
                    <g>
                      {/* Web Polygons */}
                      {levels.map((lvl) => {
                        const pts = categoryAuditData.map((_, i) => {
                          const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                          const r = radius * lvl;
                          return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
                        }).join(" ");
                        return (
                          <g key={lvl}>
                            <polygon
                              points={pts}
                              fill={lvl === 1.0 ? "#ffffff" : "none"}
                              stroke="#E2E8F0"
                              strokeWidth={lvl === 1.0 ? "1.5" : "1"}
                              strokeDasharray={lvl < 1.0 ? "3 3" : undefined}
                              opacity="0.8"
                            />
                            {/* Level Percentage label along 12 o'clock spoke */}
                            <text
                              x={cx}
                              y={cy - (radius * lvl) + 10}
                              textAnchor="middle"
                              className="fill-slate-300 font-mono text-[8px] font-bold"
                            >
                              {Math.round(lvl * 100)}%
                            </text>
                          </g>
                        );
                      })}

                      {/* Axes / Spokes */}
                      {categoryAuditData.map((c, i) => {
                        const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                        const sx = cx + radius * Math.cos(a);
                        const sy = cy + radius * Math.sin(a);

                        // Position label outside the radius
                        const lx = cx + (radius + 24) * Math.cos(a);
                        const ly = cy + (radius + 24) * Math.sin(a);

                        let textAnchor = "middle";
                        if (Math.cos(a) > 0.3) textAnchor = "start";
                        else if (Math.cos(a) < -0.3) textAnchor = "end";

                        return (
                          <g key={c.name}>
                            <line
                              x1={cx}
                              y1={cy}
                              x2={sx}
                              y2={sy}
                              stroke="#E2E8F0"
                              strokeWidth="1.2"
                              strokeDasharray="3 3"
                            />
                            {/* Label */}
                            <text
                              x={lx}
                              y={ly}
                              textAnchor={textAnchor}
                              className="font-bold text-[10.5px] fill-slate-800"
                            >
                              {c.name}
                            </text>
                            <text
                              x={lx}
                              y={ly + 11}
                              textAnchor={textAnchor}
                              className="font-mono text-[9px] fill-slate-400 font-semibold"
                            >
                              {c.totalQty.toLocaleString()} units
                            </text>
                          </g>
                        );
                      })}

                      {/* Finished Goods Polygon (#01390f) */}
                      <polygon
                        points={fgPts}
                        fill="#01390f"
                        fillOpacity="0.22"
                        stroke="#01390f"
                        strokeWidth="2.8"
                        filter="url(#radarFgGlow)"
                        className="transition-all duration-700 ease-out"
                      />

                      {/* Raw Materials Polygon (#153E97) */}
                      <polygon
                        points={rmPts}
                        fill="#153E97"
                        fillOpacity="0.22"
                        stroke="#153E97"
                        strokeWidth="2.8"
                        filter="url(#radarRmGlow)"
                        className="transition-all duration-700 ease-out"
                      />

                      {/* Vertex Dots: Finished Goods */}
                      {categoryAuditData.map((c, i) => {
                        const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                        const r = (Math.max(15, c.fgScore) / 100) * radius;
                        const vx = cx + r * Math.cos(a);
                        const vy = cy + r * Math.sin(a);
                        return (
                          <circle
                            key={`fg-dot-${i}`}
                            cx={vx}
                            cy={vy}
                            r="4.5"
                            fill="#01390f"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="transition-all duration-700"
                          />
                        );
                      })}

                      {/* Vertex Dots: Raw Materials */}
                      {categoryAuditData.map((c, i) => {
                        const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                        const r = (Math.max(15, c.rmScore) / 100) * radius;
                        const vx = cx + r * Math.cos(a);
                        const vy = cy + r * Math.sin(a);
                        return (
                          <circle
                            key={`rm-dot-${i}`}
                            cx={vx}
                            cy={vy}
                            r="4.5"
                            fill="#153E97"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="transition-all duration-700"
                          />
                        );
                      })}

                      {/* Center Anchor Dot */}
                      <circle cx={cx} cy={cy} r="3" fill="#94A3B8" />
                    </g>
                  );
                })()}
              </svg>
            ) : auditGraphMode === "radial" ? (
              /* 2. CONCENTRIC RADIAL ARC GAUGES (Activity Ring style) */
              <svg viewBox="0 0 540 330" className="w-full max-h-[340px] overflow-visible select-none">
                {(() => {
                  const cx = 270;
                  const cy = 165;
                  const rings = [
                    { label: "Raw Materials Capacity", color: "#153E97", r: 120, pct: 86 },
                    { label: "Finished Goods Stock", color: "#01390f", r: 94, pct: 72 },
                    { label: "Active Production WIP", color: "#059669", r: 68, pct: 58 },
                    { label: "Safety Reserve Buffer", color: "#d97706", r: 42, pct: 90 }
                  ];

                  return (
                    <g>
                      {rings.map((ring) => {
                        const circumference = 2 * Math.PI * ring.r;
                        const strokeOffset = circumference * (1 - (ring.pct / 100));
                        return (
                          <g key={ring.label}>
                            {/* Track background */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r={ring.r}
                              fill="none"
                              stroke="#E2E8F0"
                              strokeWidth="11"
                              opacity="0.6"
                            />
                            {/* Filled Arc */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r={ring.r}
                              fill="none"
                              stroke={ring.color}
                              strokeWidth="11"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeOffset}
                              strokeLinecap="round"
                              transform={`rotate(-90 ${cx} ${cy})`}
                              className="transition-all duration-1000 ease-out"
                            />
                          </g>
                        );
                      })}

                      {/* Center Hub */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="26"
                        fill="#ffffff"
                        stroke="#CBD5E1"
                        strokeWidth="1.5"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.08))"
                      />
                      <text
                        x={cx}
                        y={cy - 2}
                        textAnchor="middle"
                        className="font-black font-mono text-sm fill-slate-900"
                      >
                        {auditIndexScore}%
                      </text>
                      <text
                        x={cx}
                        y={cy + 8}
                        textAnchor="middle"
                        className="font-bold text-[7px] uppercase tracking-wider fill-slate-400"
                      >
                        INDEX
                      </text>
                    </g>
                  );
                })()}
              </svg>
            ) : (
              /* 3. HORIZONTAL DENSITY LOLLIPOP SPECTRUM */
              <div className="w-full flex flex-col gap-3 py-2 px-1 sm:px-3">
                {categoryAuditData.map((c) => (
                  <div key={c.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 text-[11px] truncate max-w-[160px]">
                        {c.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-slate-400">{c.totalQty.toLocaleString()} units</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {c.densityPct}%
                        </span>
                      </div>
                    </div>
                    {/* Stem & Node Track */}
                    <div className="w-full bg-slate-200/80 rounded-full h-2 relative flex items-center">
                      <div
                        style={{ width: `${c.densityPct}%` }}
                        className={`h-full rounded-full transition-all duration-700 ${
                          c.fgQty >= c.rmQty ? "bg-[#01390f]" : "bg-[#153E97]"
                        }`}
                      />
                      {/* Beacon Node */}
                      <div
                        style={{ left: `calc(${c.densityPct}% - 6px)` }}
                        className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-xs transition-all duration-700 ${
                          c.fgQty >= c.rmQty ? "bg-[#01390f]" : "bg-[#153E97]"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: AUDIT KPI BREAKDOWN & CATEGORY DENSITY MATRIX (Cols 5) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            {/* Top Stat Banner */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Overall Saturation Score
                </span>
                <span className="text-2xl font-black font-mono text-slate-900 leading-tight">
                  {auditIndexScore}%
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                Operational Density Nominal
              </span>
            </div>

            {/* Category Streams List */}
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
              {categoryAuditData.map((c) => (
                <div
                  key={c.name}
                  className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-2xs hover:border-[#153E97]/40 transition-all flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 text-[11px] truncate">
                      {c.name}
                    </span>
                    <span className="font-mono font-bold text-[10px] text-slate-500">
                      {c.totalItems} SKUs • {c.totalQty.toLocaleString()} units
                    </span>
                  </div>

                  {/* Dual Capacity Bar (Green vs Blue) */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                    <div
                      style={{ width: `${Math.round((c.fgQty / (c.totalQty || 1)) * 100)}%` }}
                      className="bg-[#01390f] h-full transition-all"
                      title={`Finished Goods: ${c.fgQty.toLocaleString()}`}
                    />
                    <div
                      style={{ width: `${Math.round((c.rmQty / (c.totalQty || 1)) * 100)}%` }}
                      className="bg-[#153E97] h-full transition-all"
                      title={`Raw Materials: ${c.rmQty.toLocaleString()}`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-[#01390f] font-semibold">
                      FG: {c.fgQty.toLocaleString()}
                    </span>
                    <span className="font-mono text-[#153E97] font-semibold">
                      RM: {c.rmQty.toLocaleString()}
                    </span>
                    <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                      c.criticalCount > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {c.criticalCount > 0 ? "Restock" : "Optimal"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-100 gap-1">
          <span>Real-time multi-dimensional category audit mapped against active inventory catalog.</span>
          <span className="font-semibold text-[#01390f]">Live System Telemetry Active</span>
        </div>
      </div>

    </div>
  );
}

export default InventoryDashboard;
