import React, { useState, useEffect, useMemo } from "react";
import {
  Truck,
  TrendingUp,
  PackageCheck,
  RotateCcw,
  Clock,
  BarChart3,
  DollarSign,
  Boxes,
  Loader2,
  Calendar,
  PieChart,
  Table as TableIcon
} from "lucide-react";
import axios, { API } from "../../axios";

function LogisticDashboard({ setActiveTab }) {
  const [pipelineView, setPipelineView] = useState("chart");
  const [volumeView, setVolumeView] = useState("chart");
  const [revenueView, setRevenueView] = useState("chart");
  const [quantityView, setQuantityView] = useState("chart");
  const [orders, setOrders] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_logistics_orders");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [returns, setReturns] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_logistics_returns");
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });
  const [supportTickets, setSupportTickets] = useState([]);
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

      const [ordersRes, returnsRes, ticketsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/orders`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/returns`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/chatbot/tickets`).catch(() => ({ data: { tickets: [] } }))
      ]);

      if (Array.isArray(ordersRes.data)) {
        setOrders(ordersRes.data);
        try {
          localStorage.setItem("cached_logistics_orders", JSON.stringify(ordersRes.data));
        } catch (e) {}
      }
      if (Array.isArray(returnsRes.data)) {
        setReturns(returnsRes.data);
        try {
          localStorage.setItem("cached_logistics_returns", JSON.stringify(returnsRes.data));
        } catch (e) {}
      }
      if (ticketsRes.data?.tickets && Array.isArray(ticketsRes.data.tickets)) {
        setSupportTickets(ticketsRes.data.tickets);
      }
    } catch (err) {
      console.error("Failed to load logistics dashboard data:", err);
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
    const totalOrders = orders.length;

    // Status breakdown
    const toPay = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "to pay" || s === "topay" || s === "unpaid";
    }).length;

    const toShip = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "to ship" || s === "toship" || s === "pending" || s === "processing";
    }).length;

    const toReceive = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "to receive" || s === "toreceive" || s === "in transit" || s === "shipped" || s === "on the way";
    }).length;

    const completed = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "completed" || s === "delivered";
    }).length;

    const cancelled = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "cancelled" || s === "canceled";
    }).length;

    const returnRefund = orders.filter((o) => {
      const s = (o.status || o.orderStatus || "").toLowerCase();
      return s === "return refund" || s === "returned" || s === "refunded";
    }).length + returns.length;

    // Total gross sales & average order value
    const totalRevenue = orders.reduce(
      (sum, o) => sum + Number(o.totalAmount || o.grandTotal || o.total || 0),
      0
    );
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Items volume dispatched
    const totalUnitsDispatched = orders.reduce((sum, o) => {
      if (Array.isArray(o.items)) {
        return sum + o.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 1), 0);
      }
      return sum + 1;
    }, 0);

    // Payment method distribution
    const paymentMap = {};
    orders.forEach((o) => {
      const method = o.paymentMethod || "Cash on Delivery (COD)";
      paymentMap[method] = (paymentMap[method] || 0) + Number(o.totalAmount || o.grandTotal || 0);
    });

    const paymentDensity = Object.entries(paymentMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    if (paymentDensity.length === 0) {
      paymentDensity.push({ name: "Cash on Delivery (COD)", amount: totalRevenue || 1 });
    }

    const totalReturns = returns.length;
    const pendingReturns = returns.filter((r) => {
      const s = (r.status || "").toLowerCase();
      return s === "pending" || s === "review" || s === "inspection";
    }).length;
    const totalTickets = supportTickets.length;
    const activeTickets = supportTickets.filter((t) => {
      const s = (t.status || "").toLowerCase();
      return s !== "resolved" && s !== "closed";
    }).length;
    const fulfillmentRate = totalOrders > 0 ? `${Math.round((completed / totalOrders) * 100)}%` : "100%";

    return {
      totalOrders,
      toPay,
      toShip,
      toReceive,
      completed,
      cancelled,
      returnRefund,
      totalRevenue,
      avgOrderValue,
      totalUnitsDispatched,
      paymentDensity,
      totalReturns,
      pendingReturns,
      totalTickets,
      activeTickets,
      fulfillmentRate
    };
  }, [orders, returns, supportTickets]);

  // Donut Chart SVG Calculation (Fulfillment Pipeline)
  const donutData = useMemo(() => {
    const total = dashboardStats.totalOrders || 1;
    const completed = dashboardStats.completed;
    const pending = dashboardStats.toShip + dashboardStats.toReceive;
    const issues = dashboardStats.cancelled + dashboardStats.returnRefund;

    const compPct = Math.round((completed / total) * 100);
    const pendPct = Math.round((pending / total) * 100);
    const issuePct = Math.max(0, 100 - compPct - pendPct);

    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    const compStroke = (completed / total) * circumference;
    const pendStroke = (pending / total) * circumference;
    const issueStroke = (issues / total) * circumference;

    const compOffset = 0;
    const pendOffset = -compStroke;
    const issueOffset = -(compStroke + pendStroke);

    return {
      completed,
      pending,
      issues,
      compPct,
      pendPct,
      issuePct,
      radius,
      circumference,
      compStroke,
      pendStroke,
      issueStroke,
      compOffset,
      pendOffset,
      issueOffset
    };
  }, [dashboardStats]);

  // Max value for Grouped Bar Chart Scaling
  const maxBarVal = Math.max(
    dashboardStats.totalOrders,
    dashboardStats.completed,
    dashboardStats.toShip + dashboardStats.toReceive,
    dashboardStats.returnRefund,
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
              Loading Logistics Analytics...
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Updating dispatch orders, transit statuses & RMA tracking
            </span>
          </div>
        </div>
      </div>
    );
  }

  const fulfillmentNum = dashboardStats.totalOrders > 0
    ? Math.round((dashboardStats.completed / dashboardStats.totalOrders) * 100)
    : 100;

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700 pb-12">

      {/* 1. TOP METRIC / STAT KPI CARDS (UNIFIED CENTRAL LOGISTICS KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Completed Dispatches with Fulfillment Loading Bar */}
        <div
          onClick={() => setActiveTab && setActiveTab("sales-orders")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#01390f]/50 cursor-pointer group"
          title="Click to view Delivered Orders"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#01390f] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
                Delivered Orders
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-tight whitespace-nowrap">
                  {dashboardStats.completed}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Orders
                </span>
              </div>
            </div>
          </div>

          {/* Fulfillment Progress / Loading Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-700 font-medium truncate">
                <strong className="text-slate-900 font-mono font-bold">
                  {dashboardStats.completed}
                </strong>
                <span className="text-slate-400"> / {dashboardStats.totalOrders} total orders</span>
              </span>
              <span className="text-[10px] font-bold font-mono text-[#153E97] bg-blue-50 px-1.5 py-0.5 rounded border border-[#153E97]/20 shadow-2xs shrink-0">
                {fulfillmentNum}%
              </span>
            </div>

            {/* Loading / Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
              <div
                className="bg-[#153E97] h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, fulfillmentNum)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: To Ship & En Route */}
        <div
          onClick={() => setActiveTab && setActiveTab("sales-orders")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view In-Transit & To-Ship Orders"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
                To Ship & En Route
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-tight whitespace-nowrap">
                  {dashboardStats.toShip + dashboardStats.toReceive}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Orders
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">{dashboardStats.toShip} packing • {dashboardStats.toReceive} in transit</span>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              In Transit
            </span>
          </div>
        </div>

        {/* Card 3: Dispatched Physical Units */}
        <div
          onClick={() => setActiveTab && setActiveTab("sales-orders")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view Dispatched Parcel Volume"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider truncate whitespace-nowrap">
                Dispatched Volume
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#153E97] leading-tight whitespace-nowrap">
                  {dashboardStats.totalUnitsDispatched}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Units
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">Physical parcel volume</span>
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              Shipped
            </span>
          </div>
        </div>

        {/* Card 4: Total Sales Revenue (#153E97 Solid Card) */}
        <div
          onClick={() => setActiveTab && setActiveTab("sales-analytics")}
          className="bg-[#153E97] border border-[#153E97] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:brightness-105 cursor-pointer group text-white"
          title="Click to view Logistic Sales Report"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate whitespace-nowrap">
                Total Sales Revenue
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-white leading-tight truncate">
                  ₱{dashboardStats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] text-white">
            <span className="truncate text-white font-medium">Gross logged revenue</span>
            <span className="text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded border border-white/30">
              Revenue
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Card 5: Average Order Value */}
        <div
          onClick={() => setActiveTab && setActiveTab("sales-analytics")}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-[#01390f]/50 hover:shadow-md transition-all min-w-0 cursor-pointer group"
          title="Click to view Order Value Analytics"
        >
          <span className="text-[11px] font-bold text-[#01390f] uppercase truncate group-hover:text-[#01390f] transition-colors">Average Order Value</span>
          <div className="mt-1 min-w-0">
            <span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 font-mono block truncate">
              ₱{dashboardStats.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium truncate">Per transaction avg</span>
          </div>
        </div>

        {/* Card 6: Dispatched Units */}
        <div
          onClick={() => setActiveTab && setActiveTab("sales-orders")}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-[#01390f]/50 hover:shadow-md transition-all min-w-0 cursor-pointer group"
          title="Click to view Order Products"
        >
          <span className="text-[11px] font-bold text-[#01390f] uppercase truncate group-hover:text-[#01390f] transition-colors">Dispatched Units</span>
          <div className="mt-1 min-w-0">
            <span className="text-lg sm:text-xl lg:text-2xl font-black text-[#01390f] font-mono block truncate">
              {dashboardStats.totalUnitsDispatched}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium truncate">Physical parcel volume</span>
          </div>
        </div>

        {/* Card 7: Return & RMA Management */}
        <div
          onClick={() => setActiveTab && setActiveTab("sales-returns")}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-[#153E97]/50 hover:shadow-md transition-all min-w-0 cursor-pointer group"
          title="Click to view Return & RMA Management"
        >
          <span className="text-[11px] font-bold text-[#153E97] uppercase truncate group-hover:text-[#153E97] transition-colors">RMA Returns</span>
          <div className="mt-1 min-w-0">
            <span className="text-lg sm:text-xl lg:text-2xl font-black text-[#153E97] font-mono block truncate">
              {dashboardStats.totalReturns}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium truncate">
              {dashboardStats.pendingReturns} pending inspection
            </span>
          </div>
        </div>

        {/* Card 8: Customer Support Inquiries */}
        <div
          onClick={() => setActiveTab && setActiveTab("sales-support")}
          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-[#153E97]/50 hover:shadow-md transition-all min-w-0 cursor-pointer group"
          title="Click to view Support Tickets"
        >
          <span className="text-[11px] font-bold text-[#153E97] uppercase truncate group-hover:text-[#153E97] transition-colors">Support Inquiries</span>
          <div className="mt-1 min-w-0">
            <span className="text-lg sm:text-xl lg:text-2xl font-black text-[#153E97] font-mono block truncate">
              {dashboardStats.totalTickets}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-medium truncate">
              {dashboardStats.activeTickets} pending CSR response
            </span>
          </div>
        </div>
      </div>

      {/* 2X2 BALANCED CHARTS GRID (UNIFIED #01390f & #153E97 PALETTE WITH CHART/TABLE TOGGLES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. FULFILLMENT PIPELINE DONUT & TABLE */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <Clock className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Fulfillment Pipeline Status
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setPipelineView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  pipelineView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Graph View (Donut)"
                aria-label="Graph View"
              >
                <PieChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPipelineView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  pipelineView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Table View (Data Breakdown)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {pipelineView === "chart" ? (
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

                {/* Delivered Segment (#01390f) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#01390f"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.compStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.compOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#025215] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Delivered: ${donutData.completed} (${donutData.compPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* In Transit / Pending Segment (#153E97) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#153E97"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.pendStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.pendOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#1d52c7] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`In Transit: ${donutData.pending} (${donutData.pendPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Cancelled / Returns Segment (#d97706) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#d97706"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.issueStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.issueOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#b45309] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Returns: ${donutData.issues} (${donutData.issuePct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              </svg>

              {/* Centered Donut Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Pipeline</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[0] : `${dashboardStats.totalOrders} Orders`}
                </span>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[1] : "Fulfillment Flow"}
                </span>
              </div>
            </div>
          ) : (
            /* TABLE BREAKDOWN VIEW */
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Status Stream</th>
                    <th className="pb-2 text-center whitespace-nowrap">Color</th>
                    <th className="pb-2 text-right whitespace-nowrap">Orders</th>
                    <th className="pb-2 text-right whitespace-nowrap">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Delivered / Completed</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#01390f] border border-emerald-200">
                        #01390f
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.completed}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {donutData.compPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">In Transit & Packing</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#153E97] border border-blue-200">
                        #153E97
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.toShip + dashboardStats.toReceive}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {donutData.pendPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">RMA Returns & Issues</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        #d97706
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.returnRefund}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {donutData.issuePct}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* LEGEND BADGES (#01390f & #153E97) */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-100 text-xs font-bold gap-2 whitespace-nowrap">
            <div className="flex items-center gap-4 whitespace-nowrap">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#01390f] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">Delivered ({donutData.completed})</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#153E97] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">In Transit ({donutData.pending})</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#d97706] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">Returns ({donutData.issues})</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Total: {dashboardStats.totalOrders} orders</span>
          </div>
        </div>

        {/* 2. ORDER FULFILLMENT & DISPATCH VOLUME (GROUPED BAR & TABLE) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <BarChart3 className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Fulfillment Volume
              </h3>
            </div>

            {/* Header controls: Legends + Icon-Only View Toggle */}
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="flex items-center gap-3 text-xs font-bold whitespace-nowrap">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-3 h-3 rounded bg-[#01390f] shrink-0"></span>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-nowrap">Fulfilled</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-3 h-3 rounded bg-[#153E97] shrink-0"></span>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-nowrap">Pending / In Transit</span>
                </div>
              </div>

              {/* View Toggle */}
              <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
                <button
                  onClick={() => setVolumeView("chart")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    volumeView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Graph View (Grouped Bars)"
                  aria-label="Graph View"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setVolumeView("table")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                    volumeView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                  title="Table View (Comparison Metrics)"
                  aria-label="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {volumeView === "chart" ? (
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

                {/* GROUP 1: ORDER VOLUME */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    {/* Fulfilled (#01390f) */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.completed / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.completed} Delivered
                      </span>
                    </div>

                    {/* In-Transit (#153E97) */}
                    <div
                      style={{ height: `${Math.max(14, ((dashboardStats.toShip + dashboardStats.toReceive) / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.toShip + dashboardStats.toReceive} Pending
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Order Volume</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.completed} vs {dashboardStats.toShip + dashboardStats.toReceive}</span>
                  </div>
                </div>

                {/* GROUP 2: DISPATCH STAGES */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    {/* En Route */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.toReceive / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.toReceive} En Route
                      </span>
                    </div>

                    {/* To Ship */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.toShip / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.toShip} To Pack
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Dispatch Stages</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.toReceive} vs {dashboardStats.toShip}</span>
                  </div>
                </div>

                {/* GROUP 3: RETURN RATIO */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    {/* Delivered Success */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.completed / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.completed} Success
                      </span>
                    </div>

                    {/* Returns */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.returnRefund / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.returnRefund} Issues
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Return Ratio</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.completed} vs {dashboardStats.returnRefund}</span>
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
                    <th className="pb-2 whitespace-nowrap">Logistics Metric</th>
                    <th className="pb-2 text-right whitespace-nowrap">Fulfilled (#01390f)</th>
                    <th className="pb-2 text-right whitespace-nowrap">Pending (#153E97)</th>
                    <th className="pb-2 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Overall Order Dispatches</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.completed} Orders
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.toShip + dashboardStats.toReceive} Orders
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        Tracking
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Transit vs Packing Pipeline</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.toReceive} En Route
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.toShip} To Pack
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Operational
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Fulfillment Success vs Returns</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.completed} Delivered
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {dashboardStats.returnRefund} Returns
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        {dashboardStats.fulfillmentRate} Rate
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-1 whitespace-nowrap">
            <span className="whitespace-nowrap">Scale: 0 to {maxBarVal} parcels</span>
            <span className="font-semibold text-[#01390f] whitespace-nowrap">Interactive live comparison</span>
          </div>
        </div>

        {/* 3. REVENUE DENSITY BY PAYMENT METHOD (BARS & TABLE) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <DollarSign className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Revenue Density
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setRevenueView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  revenueView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Bar Density View"
                aria-label="Bar View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRevenueView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${
                  revenueView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Table View (Data Breakdown)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {revenueView === "chart" ? (
            <div className="py-4 flex flex-col gap-3.5">
              {dashboardStats.paymentDensity.map((item, idx) => {
                const maxVal = dashboardStats.paymentDensity[0]?.amount || 1;
                const pct = Math.round((item.amount / maxVal) * 100);

                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs font-bold gap-2">
                      <span className="text-slate-800 truncate flex-1">{item.name}</span>
                      <span className="font-mono text-slate-900 shrink-0">₱{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                    <th className="pb-2 whitespace-nowrap">Payment Gateway</th>
                    <th className="pb-2 text-right whitespace-nowrap">Total Value</th>
                    <th className="pb-2 text-right whitespace-nowrap">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dashboardStats.paymentDensity.map((item, idx) => {
                    const pct = Math.round((item.amount / (dashboardStats.totalRevenue || 1)) * 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 font-bold text-slate-800 whitespace-nowrap">{item.name}</td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₱{Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <span>Total Sales Value: <strong className="text-slate-800 font-mono">₱{dashboardStats.totalRevenue.toFixed(2)}</strong></span>
            <span className="text-[#01390f] font-bold">Updated Live</span>
          </div>
        </div>

        {/* 4. TOTAL DISPATCHED PARCEL QUANTITY BREAKDOWN (DUAL BARS & TABLE) */}
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

              {/* Total Orders Dispatched Column (#01390f) */}
              <div className="flex flex-col items-center gap-2 h-full justify-end z-10 flex-1 max-w-[110px] sm:max-w-[140px]">
                <div
                  style={{
                    height: `${Math.max(16, (dashboardStats.totalOrders / Math.max(dashboardStats.totalOrders, dashboardStats.totalUnitsDispatched, 1)) * 100)}%`
                  }}
                  className="w-full bg-[#01390f] hover:brightness-110 rounded-t-2xl transition-all shadow-md flex items-start justify-center pt-2 relative group cursor-pointer"
                >
                  <span className="text-white font-mono font-black text-xs sm:text-sm">
                    {dashboardStats.totalOrders} Orders
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 text-center leading-tight">
                  Order Parcels
                </span>
              </div>

              {/* Total Product Units Sold Column (#153E97) */}
              <div className="flex flex-col items-center gap-2 h-full justify-end z-10 flex-1 max-w-[110px] sm:max-w-[140px]">
                <div
                  style={{
                    height: `${Math.max(16, (dashboardStats.totalUnitsDispatched / Math.max(dashboardStats.totalOrders, dashboardStats.totalUnitsDispatched, 1)) * 100)}%`
                  }}
                  className="w-full bg-[#153E97] hover:brightness-110 rounded-t-2xl transition-all shadow-md flex items-start justify-center pt-2 relative group cursor-pointer"
                >
                  <span className="text-white font-mono font-black text-xs sm:text-sm">
                    {dashboardStats.totalUnitsDispatched} Units
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 text-center leading-tight">
                  Total Products Dispatched
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Metric</th>
                    <th className="pb-2 text-right whitespace-nowrap">Quantity</th>
                    <th className="pb-2 text-center whitespace-nowrap">Theme Color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Total Order Parcels</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.totalOrders} Orders
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#01390f] border border-emerald-200">
                        #01390f
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Total Physical Products Dispatched</td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.totalUnitsDispatched} Units
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
            <span>Physical dispatch audit on hand</span>
          </div>
        </div>

      </div>

    </div>
  );
}

export default LogisticDashboard;
