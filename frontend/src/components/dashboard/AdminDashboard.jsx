import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Shield,
  Server,
  Activity,
  Clock,
  BarChart3,
  Boxes,
  Database,
  Loader2,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Zap,
  Globe,
  RotateCcw,
  Sparkles,
  Layers,
  PieChart,
  Table as TableIcon
} from "lucide-react";
import axios, { API, API_BASE_URL } from "../../axios";

function AdminDashboard({ setActiveTab }) {
  const [roleView, setRoleView] = useState("chart");
  const [userView, setUserView] = useState("chart");
  const [deptView, setDeptView] = useState("chart");
  const [quantityView, setQuantityView] = useState("chart");
  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_admin_users");
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [
      { _id: "1", username: "adminkent", role: "Admin" },
      { _id: "2", username: "jherneyyung70", role: "Inventory" },
      { _id: "3", username: "ringobading", role: "Marketing" },
      { _id: "4", username: "kentbundalian", role: "Logistic" }
    ];
  });
  const [activities, setActivities] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_admin_activities");
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [refreshingHealth, setRefreshingHealth] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Live System Health Metrics State
  const [systemHealth, setSystemHealth] = useState({
    databaseStatus: "Connected",
    serverStatus: "Online",
    storageUsedPct: 72,
    apiStatus: "Operational",
    lastBackupText: "Last run 2 hrs ago",
    lastBackupTime: null,
    totalRecords: 107,
    totalCollections: 20,
    serverUptime: "99.98%",
  });

  const getRelativeTime = (isoString) => {
    if (!isoString) return "Last run 2 hrs ago";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `Last run ${diffMins} mins ago`;
    if (diffHours === 1) return "Last run 1 hr ago";
    if (diffHours < 24) return `Last run ${diffHours} hrs ago`;
    if (diffDays === 1) return "Last run yesterday";
    return `Last run ${diffDays} days ago`;
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const [usersRes, actRes, dbStatusRes] = await Promise.all([
        API.get("/api/users", config).catch(() => ({ data: [] })),
        API.get("/api/user-activity", config).catch(() => ({ data: [] })),
        API.get("/api/database/status").catch(() => ({ data: { success: false } })),
      ]);

      if (Array.isArray(usersRes.data) && usersRes.data.length > 0) {
        setUsers(usersRes.data);
        try {
          localStorage.setItem("cached_admin_users", JSON.stringify(usersRes.data));
        } catch (e) { }
      }
      if (Array.isArray(actRes.data)) {
        setActivities(actRes.data);
        try {
          localStorage.setItem("cached_admin_activities", JSON.stringify(actRes.data));
        } catch (e) { }
      }

      // Update System Health from live Database status
      if (dbStatusRes?.data?.success && dbStatusRes.data.metrics) {
        const m = dbStatusRes.data.metrics;
        setSystemHealth((prev) => ({
          ...prev,
          databaseStatus: "Connected",
          serverStatus: "Online",
          apiStatus: "Operational",
          lastBackupText: m.lastBackup ? getRelativeTime(m.lastBackup) : "Last run 2 hrs ago",
          lastBackupTime: m.lastBackup,
          totalRecords: m.totalDocuments || 107,
          totalCollections: m.totalCollections || 20,
          totalUsedStorage: m.totalUsedStorage || "2.4 MB",
          storageUsedPct: m.storageUsedPct || 72,
          storageFreeFormatted: m.storageFreeFormatted || "509.6 MB",
        }));
      }
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 400);
    }
  };

  const handleManualHealthRefresh = async () => {
    setRefreshingHealth(true);
    await fetchDashboardData();
    setTimeout(() => setRefreshingHealth(false), 600);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // COMPUTED METRICS & CHARTS DATA
  const dashboardStats = useMemo(() => {
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === "Admin").length;
    const marketingCount = users.filter((u) => u.role === "Marketing").length;
    const inventoryCount = users.filter((u) => u.role === "Inventory").length;
    const logisticCount = users.filter(
      (u) => u.role === "Logistic" || u.role === "Logistics"
    ).length;
    const staffCount = marketingCount + inventoryCount + logisticCount;

    // Activity breakdown
    const totalActivities = activities.length;

    // Department Distribution
    const deptDensity = [
      { name: "Marketing Department", count: marketingCount, role: "Marketing" },
      { name: "Inventory Warehouse", count: inventoryCount, role: "Inventory" },
      { name: "Logistics & Fulfillment", count: logisticCount, role: "Logistics" },
      { name: "Executive Admin", count: adminCount, role: "Admin" }
    ].sort((a, b) => b.count - a.count);

    return {
      totalUsers: Math.max(1, totalUsers),
      adminCount,
      marketingCount,
      inventoryCount,
      logisticCount,
      staffCount,
      totalActivities,
      deptDensity
    };
  }, [users, activities]);

  // Donut Chart SVG Calculation (Role Allocation)
  const donutData = useMemo(() => {
    const total = dashboardStats.totalUsers;
    const staff = dashboardStats.staffCount;
    const admin = dashboardStats.adminCount;

    const staffPct = Math.round((staff / total) * 100);
    const adminPct = Math.max(0, 100 - staffPct);

    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    const staffStroke = (staff / total) * circumference;
    const adminStroke = (admin / total) * circumference;

    const staffOffset = 0;
    const adminOffset = -staffStroke;

    return {
      staff,
      admin,
      staffPct,
      adminPct,
      radius,
      circumference,
      staffStroke,
      adminStroke,
      staffOffset,
      adminOffset
    };
  }, [dashboardStats]);

  // Max value for Grouped Bar Chart Scaling
  const maxBarVal = Math.max(
    dashboardStats.totalUsers,
    dashboardStats.adminCount,
    dashboardStats.marketingCount,
    dashboardStats.inventoryCount,
    dashboardStats.logisticCount,
    5
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
              Loading System Administration...
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Checking database connectivity, system health & user accounts
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700 pb-12 animate-in fade-in duration-300">

      {/* 1. TOP METRIC / STAT KPI CARDS (UNIFIED CENTRAL ADMIN KPIS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Registered Accounts with Staff Allocation Loading Bar */}
        <div
          onClick={() => setActiveTab && setActiveTab("admin-users")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#01390f]/50 cursor-pointer group"
          title="Click to view User Accounts"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#01390f] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
                Registered Users
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-tight whitespace-nowrap">
                  {users.length}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Accounts
                </span>
              </div>
            </div>
          </div>

          {/* Staff Allocation Loading Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-1.5 w-full">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-700 font-medium truncate">
                <strong className="text-slate-900 font-mono font-bold">
                  {dashboardStats.staffCount}
                </strong>
                <span className="text-slate-400"> / {users.length} active staff</span>
              </span>
              <span className="text-[10px] font-bold font-mono text-[#153E97] bg-blue-50 px-1.5 py-0.5 rounded border border-[#153E97]/20 shadow-2xs shrink-0">
                {users.length > 0 ? Math.round((dashboardStats.staffCount / users.length) * 100) : 0}%
              </span>
            </div>

            {/* Loading / Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
              <div
                className="bg-[#153E97] h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${users.length > 0 ? Math.min(100, Math.round((dashboardStats.staffCount / users.length) * 100)) : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Department Operators */}
        <div
          onClick={() => setActiveTab && setActiveTab("admin-users")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view Department Operators"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
                Department Operators
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-tight whitespace-nowrap">
                  {dashboardStats.staffCount}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Staff
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">{dashboardStats.inventoryCount} inv • {dashboardStats.logisticCount} log • {dashboardStats.marketingCount} mkt</span>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
              Active
            </span>
          </div>
        </div>

        {/* Card 3: System Administrators */}
        <div
          onClick={() => setActiveTab && setActiveTab("admin-users")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view System Administrators"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider truncate whitespace-nowrap">
                System Administrators
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-[#153E97] leading-tight whitespace-nowrap">
                  {dashboardStats.adminCount}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  Admins
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="truncate">Root super admin privileges</span>
            <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              Secured
            </span>
          </div>
        </div>

        {/* Card 4: System Audit Logs (#153E97 Solid Card with white text) */}
        <div
          onClick={() => setActiveTab && setActiveTab("admin-activity")}
          className="bg-[#153E97] border border-[#153E97] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:brightness-105 cursor-pointer group text-white"
          title="Click to view System Audit Logs"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate whitespace-nowrap">
                System Audit Logs
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black font-mono text-white leading-tight whitespace-nowrap">
                  {activities.length}
                </span>
                <span className="text-[11px] text-white/80 font-semibold uppercase tracking-wider">
                  Logs
                </span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between text-[11px] text-white">
            <span className="truncate text-white font-medium">Logged security & user activities</span>
            <span className="text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded border border-white/30">
              Logged
            </span>
          </div>
        </div>
      </div>

      {/* 2X2 BALANCED CHARTS GRID (UNIFIED #01390f & #153E97 PALETTE WITH CHART/TABLE TOGGLES) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. SYSTEM ROLE ALLOCATION DONUT & TABLE */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <Clock className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Access & Security Allocation
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setRoleView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${roleView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Graph View (Donut)"
                aria-label="Graph View"
              >
                <PieChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRoleView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${roleView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Table View (Data Breakdown)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {roleView === "chart" ? (
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

                {/* Department Operators Segment (#01390f) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#01390f"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.staffStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.staffOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#025215] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Operators: ${donutData.staff} (${donutData.staffPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Admin Superusers Segment (#153E97) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#153E97"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.adminStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.adminOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#1d52c7] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Admin: ${donutData.admin} (${donutData.adminPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              </svg>

              {/* Centered Donut Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">Security</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[0] : `${dashboardStats.totalUsers} Users`}
                </span>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[1] : "Active Roles"}
                </span>
              </div>
            </div>
          ) : (
            /* TABLE BREAKDOWN VIEW */
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Access Role</th>
                    <th className="pb-2 text-center whitespace-nowrap">Color</th>
                    <th className="pb-2 text-right whitespace-nowrap">Assigned Users</th>
                    <th className="pb-2 text-right whitespace-nowrap">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Department Operators (Staff)</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#01390f] border border-emerald-200">
                        #01390f
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.staffCount}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {donutData.staffPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">System Administrators (Superuser)</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#153E97] border border-blue-200">
                        #153E97
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.adminCount}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {donutData.adminPct}%
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
                <span className="text-slate-800 whitespace-nowrap">Operators ({donutData.staff})</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-3.5 h-3.5 rounded-full bg-[#153E97] shadow-xs shrink-0" />
                <span className="text-slate-800 whitespace-nowrap">Admins ({donutData.admin})</span>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">Total: {dashboardStats.totalUsers} accounts</span>
          </div>
        </div>

        {/* 2. DEPARTMENT ACCESS & USER DENSITY (GROUPED BAR & TABLE) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <BarChart3 className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Department User Density
              </h3>
            </div>

            {/* Header controls: Legends + Icon-Only View Toggle */}
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="flex items-center gap-3 text-xs font-bold whitespace-nowrap">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-3 h-3 rounded bg-[#01390f] shrink-0"></span>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-nowrap">Primary Staff</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-3 h-3 rounded bg-[#153E97] shrink-0"></span>
                  <span className="text-slate-800 font-mono text-[11px] whitespace-nowrap">Admin Roles</span>
                </div>
              </div>

              {/* View Toggle */}
              <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
                <button
                  onClick={() => setUserView("chart")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${userView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                    }`}
                  title="Graph View (Grouped Bars)"
                  aria-label="Graph View"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setUserView("table")}
                  className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${userView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                    }`}
                  title="Table View (Comparison Metrics)"
                  aria-label="Table View"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {userView === "chart" ? (
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

                {/* GROUP 1: MARKETING / ADMIN */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    {/* Marketing Bar (#01390f) */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.marketingCount / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.marketingCount} Users
                      </span>
                    </div>

                    {/* Admin Bar (#153E97) */}
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.adminCount / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.adminCount} Admins
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Marketing / Admin</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.marketingCount} vs {dashboardStats.adminCount}</span>
                  </div>
                </div>

                {/* GROUP 2: INVENTORY */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.inventoryCount / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.inventoryCount} Users
                      </span>
                    </div>

                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.staffCount / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.staffCount} Staff
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Inventory Staff</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.inventoryCount} vs {dashboardStats.staffCount}</span>
                  </div>
                </div>

                {/* GROUP 3: LOGISTICS */}
                <div className="flex-1 flex flex-col items-center gap-2 h-full justify-end z-10">
                  <div className="w-full flex items-end justify-center gap-2 sm:gap-3 h-full">
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.logisticCount / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#01390f] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.logisticCount} Users
                      </span>
                    </div>

                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.totalUsers / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.totalUsers} Total
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight whitespace-nowrap">Logistics / Ops</span>
                    <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">{dashboardStats.logisticCount} vs {dashboardStats.totalUsers}</span>
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
                    <th className="pb-2 whitespace-nowrap">Department Scope</th>
                    <th className="pb-2 text-right whitespace-nowrap">Operators (#01390f)</th>
                    <th className="pb-2 text-right whitespace-nowrap">Admin Level (#153E97)</th>
                    <th className="pb-2 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Marketing Department</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.marketingCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.adminCount} Admins
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Authorized
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Inventory &amp; Warehousing</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.inventoryCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.adminCount} Admins
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Logistics &amp; Fulfillment</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.logisticCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.totalUsers} Total
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        Audited
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 gap-1 whitespace-nowrap">
            <span className="whitespace-nowrap">Scale: 0 to {maxBarVal} accounts</span>
            <span className="font-semibold text-[#01390f] whitespace-nowrap">Live RBAC Authorization</span>
          </div>
        </div>

        {/* 3. DEPARTMENT ROLE DENSITY DISTRIBUTION */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <Database className="w-4 h-4 text-[#01390f] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Density Distribution
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setDeptView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${deptView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Bar Density View"
                aria-label="Bar View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeptView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${deptView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Table View (Data Breakdown)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {deptView === "chart" ? (
            <div className="py-4 flex flex-col gap-3.5">
              {dashboardStats.deptDensity.map((dept, idx) => {
                const maxDept = dashboardStats.deptDensity[0]?.count || 1;
                const pct = Math.round((dept.count / Math.max(1, maxDept)) * 100);

                return (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs font-bold gap-2">
                      <span className="text-slate-800 truncate flex-1">{dept.name}</span>
                      <span className="font-mono text-slate-900 shrink-0">{dept.count} users</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        style={{ width: `${Math.max(8, pct)}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${idx % 2 === 0 ? "bg-[#01390f]" : "bg-[#153E97]"
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
                    <th className="pb-2 whitespace-nowrap">System Unit</th>
                    <th className="pb-2 text-right whitespace-nowrap">Registered Accounts</th>
                    <th className="pb-2 text-right whitespace-nowrap">Density Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {dashboardStats.deptDensity.map((dept, idx) => {
                    const pct = Math.round((dept.count / (dashboardStats.totalUsers || 1)) * 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 font-bold text-slate-800 whitespace-nowrap">{dept.name}</td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {dept.count} users
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
            <span>Primary system departments</span>
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
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${quantityView === "chart" ? "bg-white text-[#01390f] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Bar View"
                aria-label="Bar View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setQuantityView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${quantityView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
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

              {/* Department Operators Column (#01390f) */}
              <div className="flex flex-col items-center gap-2 h-full justify-end z-10 flex-1 max-w-[110px] sm:max-w-[140px]">
                <div
                  style={{
                    height: `${Math.max(16, (dashboardStats.staffCount / Math.max(dashboardStats.staffCount, dashboardStats.adminCount, 1)) * 100)}%`
                  }}
                  className="w-full bg-[#01390f] hover:brightness-110 rounded-t-2xl transition-all shadow-md flex items-start justify-center pt-2 relative group cursor-pointer"
                >
                  <span className="text-white font-mono font-black text-xs sm:text-sm">
                    {dashboardStats.staffCount} Staff
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 text-center leading-tight">
                  Department Operators
                </span>
              </div>

              {/* Admin Personnel Column (#153E97) */}
              <div className="flex flex-col items-center gap-2 h-full justify-end z-10 flex-1 max-w-[110px] sm:max-w-[140px]">
                <div
                  style={{
                    height: `${Math.max(16, (dashboardStats.adminCount / Math.max(dashboardStats.staffCount, dashboardStats.adminCount, 1)) * 100)}%`
                  }}
                  className="w-full bg-[#153E97] hover:brightness-110 rounded-t-2xl transition-all shadow-md flex items-start justify-center pt-2 relative group cursor-pointer"
                >
                  <span className="text-white font-mono font-black text-xs sm:text-sm">
                    {dashboardStats.adminCount} Admins
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-900 text-center leading-tight">
                  Admin Personnel
                </span>
              </div>
            </div>
          ) : (
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Security Tier</th>
                    <th className="pb-2 text-right whitespace-nowrap">Total Accounts</th>
                    <th className="pb-2 text-center whitespace-nowrap">Theme Color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Operational Staff Accounts</td>
                    <td className="py-3 text-right font-mono font-bold text-[#01390f] whitespace-nowrap">
                      {dashboardStats.staffCount} Staff
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-[#01390f] border border-emerald-200">
                        #01390f
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Root System Administrators</td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.adminCount} Admins
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
            <span>Identity & access audit on hand</span>
          </div>
        </div>

      </div>

    </div>
  );
}

export default AdminDashboard;
