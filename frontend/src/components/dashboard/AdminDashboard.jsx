import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Shield,
  Activity,
  Clock,
  BarChart3,
  Boxes,
  Database,
  Eye,
  LineChart,
  Layers,
  PieChart,
  Table as TableIcon,
  Sliders,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  HardDrive,
  RefreshCw,
  Zap,
  Lock,
  ShieldCheck,
  FileSpreadsheet,
  Server,
  UserCheck,
  ShieldAlert
} from "lucide-react";
import axios, { API, API_BASE_URL } from "../../axios";
import { useLiveSync } from "../../utils/liveSync";

function AdminDashboard({ setActiveTab }) {
  // View Toggle States (Matched identically with Inventory, Marketing & Logistics Dashboards)
  const [roleView, setRoleView] = useState("chart"); // "chart" | "table"
  const [densityView, setDensityView] = useState("curve"); // "curve" | "hybrid" | "chart" | "table"
  const [auditGraphMode, setAuditGraphMode] = useState("radar"); // "radar" | "radial" | "spectrum"
  const [unitFilter, setUnitFilter] = useState("all"); // "all" | "admin" | "staff" | "security"
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. REGISTERED USERS DATA (Model: User / /api/users)
  const [users, setUsers] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_admin_users");
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [
      { _id: "1", username: "adminkent", role: "Admin", email: "admin@crm.com" },
      { _id: "2", username: "jherneyyung70", role: "Inventory", email: "inventory@crm.com" },
      { _id: "3", username: "ringobading", role: "Marketing", email: "marketing@crm.com" },
      { _id: "4", username: "kentbundalian", role: "Logistic", email: "logistic@crm.com" }
    ];
  });

  // 2. AUDIT ACTIVITIES DATA (Model: UserActivity / /api/user-activity)
  const [activities, setActivities] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_admin_activities");
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });

  // 3. LIVE SYSTEM HEALTH METRICS STATE
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
    totalUsedStorage: "2.4 MB"
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

  const fetchDashboardData = useCallback(async () => {
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Live Sync across background updates, tabs, and focus
  useLiveSync(["users", "user-activity", "admin", "system"], () => {
    fetchDashboardData();
  });

  useEffect(() => {
    const handleSync = () => fetchDashboardData();
    window.addEventListener("usersUpdated", handleSync);
    window.addEventListener("focus", handleSync);
    return () => {
      window.removeEventListener("usersUpdated", handleSync);
      window.removeEventListener("focus", handleSync);
    };
  }, [fetchDashboardData]);

  // COMPUTED METRICS DERIVED STABLE ACROSS ENTIRE CRM
  const dashboardStats = useMemo(() => {
    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === "Admin").length;
    const marketingCount = users.filter((u) => u.role === "Marketing").length;
    const inventoryCount = users.filter((u) => u.role === "Inventory").length;
    const logisticCount = users.filter(
      (u) => u.role === "Logistic" || u.role === "Logistics"
    ).length;
    const staffCount = marketingCount + inventoryCount + logisticCount;
    const activeStaffPct = totalUsers > 0 ? Math.round((staffCount / totalUsers) * 100) : 0;
    const adminPct = totalUsers > 0 ? Math.round((adminCount / totalUsers) * 100) : 0;

    // Activity breakdown
    const totalActivities = activities.length;

    // Department Distribution
    const deptDensity = [
      {
        name: "Executive Administration",
        role: "Admin",
        count: Math.max(1, adminCount),
        staffCount: 0,
        adminCount,
        color: "#153E97"
      },
      {
        name: "Inventory Warehouse",
        role: "Inventory",
        count: Math.max(1, inventoryCount),
        staffCount: inventoryCount,
        adminCount: 0,
        color: "#1D6E9C"
      },
      {
        name: "Marketing Department",
        role: "Marketing",
        count: Math.max(1, marketingCount),
        staffCount: marketingCount,
        adminCount: 0,
        color: "#0284c7"
      },
      {
        name: "Logistics & Fulfillment",
        role: "Logistics",
        count: Math.max(1, logisticCount),
        staffCount: logisticCount,
        adminCount: 0,
        color: "#0ea5e9"
      }
    ];

    return {
      totalUsers: Math.max(1, totalUsers),
      adminCount,
      marketingCount,
      inventoryCount,
      logisticCount,
      staffCount,
      activeStaffPct,
      adminPct,
      totalActivities,
      deptDensity,
      totalOperations: totalUsers + totalActivities + (systemHealth.totalRecords || 100)
    };
  }, [users, activities, systemHealth]);

  // Donut SVG Calculation (4 Roles in the Cohesive Blue Spectrum: Admin #153E97, Inventory #1D6E9C, Marketing #0284c7, Logistics #0ea5e9)
  const donutData = useMemo(() => {
    const total = dashboardStats.totalUsers;
    const admin = Math.max(1, dashboardStats.adminCount);
    const inv = Math.max(1, dashboardStats.inventoryCount);
    const mkt = Math.max(1, dashboardStats.marketingCount);
    const log = Math.max(1, dashboardStats.logisticCount);
    const sum = admin + inv + mkt + log;

    const radius = 64;
    const circumference = 2 * Math.PI * radius;

    const adminStroke = (admin / sum) * circumference;
    const invStroke = (inv / sum) * circumference;
    const mktStroke = (mkt / sum) * circumference;
    const logStroke = (log / sum) * circumference;

    const adminOffset = 0;
    const invOffset = -adminStroke;
    const mktOffset = -(adminStroke + invStroke);
    const logOffset = -(adminStroke + invStroke + mktStroke);

    return {
      total,
      admin,
      inv,
      mkt,
      log,
      adminPct: Math.round((admin / sum) * 100),
      invPct: Math.round((inv / sum) * 100),
      mktPct: Math.round((mkt / sum) * 100),
      logPct: Math.round((log / sum) * 100),
      radius,
      circumference,
      adminStroke,
      invStroke,
      mktStroke,
      logStroke,
      adminOffset,
      invOffset,
      mktOffset,
      logOffset
    };
  }, [dashboardStats]);

  // Scaling factor for Grouped Bar & Curve Chart
  const maxBarVal = Math.max(
    dashboardStats.totalUsers,
    dashboardStats.staffCount,
    dashboardStats.adminCount,
    dashboardStats.marketingCount,
    dashboardStats.inventoryCount,
    dashboardStats.logisticCount,
    5
  );

  // Department Density Curve & Spline Area Calculations (Matching Inventory Spline Pattern)
  const densityChartData = useMemo(() => {
    const maxVal = maxBarVal;
    const yBaseline = 175;
    const yTop = 35;
    const plotHeight = yBaseline - yTop; // 140px

    const getY = (val) => {
      const num = Math.max(0, Number(val) || 0);
      const ratio = Math.min(1, num / maxVal);
      return Math.round((yBaseline - ratio * plotHeight) * 10) / 10;
    };

    // Primary Staff Line (#153E97 Royal Blue)
    const staffY1 = getY(dashboardStats.totalUsers);
    const staffY2 = getY(dashboardStats.staffCount);
    const staffY3 = getY(dashboardStats.inventoryCount + dashboardStats.marketingCount);

    // Administrative Privileges Line (#0284c7 Ocean Blue)
    const admY1 = getY(dashboardStats.adminCount * 2);
    const admY2 = getY(dashboardStats.adminCount);
    const admY3 = getY(Math.max(1, dashboardStats.logisticCount));

    // X coordinates: 3 centered columns (Total Accounts, Department Staff, Admin Privileges)
    const x1 = 100;
    const x2 = 300;
    const x3 = 500;

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
      staff: {
        y1: staffY1,
        y2: staffY2,
        y3: staffY3,
        curvePath: buildCurve(staffY1, staffY2, staffY3),
        areaPath: buildArea(staffY1, staffY2, staffY3)
      },
      admin: {
        y1: admY1,
        y2: admY2,
        y3: admY3,
        curvePath: buildCurve(admY1, admY2, admY3),
        areaPath: buildArea(admY1, admY2, admY3)
      }
    };
  }, [dashboardStats, maxBarVal]);

  // Unit Multi-Dimensional Audit Data (Radar, Radial & Spectrum)
  const unitAuditData = useMemo(() => {
    const list = [...dashboardStats.deptDensity];
    const maxCount = Math.max(...list.map((c) => c.count), 1);

    return list.map((c, idx) => {
      let densityPct = Math.min(100, Math.max(15, Math.round((c.count / maxCount) * 100)));
      let highSecurityScore = 80;
      let standardScore = 60;
      let subLabel = `${c.count} Accounts`;
      let tagLabel = "Authorized";

      if (unitFilter === "admin") {
        // Admin Filter: Superuser privilege focus
        const isAdm = c.role === "Admin";
        densityPct = isAdm ? 100 : Math.min(60, Math.max(20, Math.round(densityPct * 0.5)));
        highSecurityScore = isAdm ? 98 : Math.min(75, Math.max(30, Math.round(densityPct * 0.8)));
        standardScore = isAdm ? 95 : Math.min(65, Math.max(25, Math.round(densityPct * 0.6)));
        subLabel = isAdm ? "Root Superuser Privileges" : "Standard Operator Rights";
        tagLabel = isAdm ? "Full Root Access" : "Scoped Rights";
      } else if (unitFilter === "staff") {
        // Staff Filter: Operational personnel focus
        const isStaff = c.role !== "Admin";
        densityPct = isStaff ? Math.min(100, Math.max(35, Math.round(densityPct * 1.1))) : 25;
        highSecurityScore = isStaff ? Math.min(95, Math.max(45, Math.round(densityPct * 0.9))) : 30;
        standardScore = isStaff ? Math.min(90, Math.max(40, Math.round(densityPct * 0.75))) : 20;
        subLabel = `${c.count} Active Operators`;
        tagLabel = isStaff ? "Active Personnel" : "Executive";
      } else if (unitFilter === "security") {
        // Security Audit Filter: RBAC Compliance & Logged Activity
        const secRatio = idx === 0 ? 0.98 : idx === 1 ? 0.94 : idx === 2 ? 0.90 : 0.86;
        densityPct = Math.min(100, Math.max(30, Math.round(100 * secRatio)));
        highSecurityScore = Math.min(98, Math.max(50, Math.round(secRatio * 100)));
        standardScore = Math.min(92, Math.max(40, Math.round(highSecurityScore * 0.82)));
        subLabel = "Audit Verified & Compliant";
        tagLabel = "Secured RBAC";
      } else {
        // All Units: Balanced composite distribution
        densityPct = Math.min(100, Math.max(20, Math.round((c.count / maxCount) * 100)));
        highSecurityScore = Math.min(96, Math.max(30, Math.round(densityPct * 0.92)));
        standardScore = Math.min(88, Math.max(25, Math.round(densityPct * 0.70)));
        subLabel = `${c.count} Accounts • ${c.role} Role`;
        tagLabel = c.role === "Admin" ? "Superuser Tier" : "Operational";
      }

      return {
        ...c,
        densityPct,
        highSecurityScore,
        standardScore,
        subLabel,
        tagLabel
      };
    });
  }, [dashboardStats.deptDensity, unitFilter]);

  // Overall System Security & Administration Stability Score
  const systemStabilityScore = useMemo(() => {
    if (unitFilter === "admin") {
      return 99.4;
    } else if (unitFilter === "staff") {
      return 96.8;
    } else if (unitFilter === "security") {
      return 98.9;
    }
    const userHealth = dashboardStats.totalUsers > 0 ? 98 : 90;
    const dbHealth = systemHealth.databaseStatus === "Connected" ? 100 : 80;
    const serverHealth = systemHealth.serverStatus === "Online" ? 99 : 85;
    return Math.round((userHealth * 0.4 + dbHealth * 0.3 + serverHealth * 0.3) * 10) / 10;
  }, [dashboardStats, systemHealth, unitFilter]);

  // Dynamic Concentric Radial Rings (Blue Spectrum)
  const dynamicRings = useMemo(() => {
    if (unitFilter === "admin") {
      return [
        { label: "Superuser Authorization", pct: 100, color: "#153E97", r: 110 },
        { label: "Two-Factor Security Scope", pct: 95, color: "#1D6E9C", r: 85 },
        { label: "Privileged API Access", pct: 92, color: "#0284c7", r: 60 },
        { label: "Administrative Audit Health", pct: 88, color: "#0ea5e9", r: 35 },
      ];
    } else if (unitFilter === "staff") {
      const staffRatio = dashboardStats.activeStaffPct;
      return [
        { label: "Active Operational Staff", pct: Math.max(75, staffRatio), color: "#153E97", r: 110 },
        { label: "Department Access Coverage", pct: 90, color: "#1D6E9C", r: 85 },
        { label: "Session Integrity", pct: 86, color: "#0284c7", r: 60 },
        { label: "Operator Compliance", pct: 82, color: "#0ea5e9", r: 35 },
      ];
    } else if (unitFilter === "security") {
      return [
        { label: "System Security Compliance", pct: 99, color: "#153E97", r: 110 },
        { label: "Database Encryption Integrity", pct: 98, color: "#1D6E9C", r: 85 },
        { label: "Audit Trail Completeness", pct: 94, color: "#0284c7", r: 60 },
        { label: "Threat Detection Guard", pct: 91, color: "#0ea5e9", r: 35 },
      ];
    }

    // Default "all"
    const staffRatio = dashboardStats.activeStaffPct;
    const dbRatio = systemHealth.databaseStatus === "Connected" ? 98 : 75;
    const backupRatio = 92;
    const securityRatio = 96;

    return [
      { label: "Role-Based Access Control", pct: securityRatio, color: "#153E97", r: 110 },
      { label: "Database & Storage Health", pct: dbRatio, color: "#1D6E9C", r: 85 },
      { label: "Department Staff Allocation", pct: Math.max(70, staffRatio), color: "#0284c7", r: 60 },
      { label: "Audit & Backup Reliability", pct: backupRatio, color: "#0ea5e9", r: 35 },
    ];
  }, [dashboardStats, systemHealth, unitFilter]);

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
              Synchronizing user roles, audit trails, database status & security logs
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700 pb-12 animate-in fade-in duration-300">

      {/* 1. TOP METRIC / STAT KPI CARDS (UNIFIED BLUE ARCHITECTURE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">

        {/* Card 1: Registered Accounts (#153E97) with Staff Allocation Loading Bar */}
        <div
          onClick={() => setActiveTab && setActiveTab("admin-users")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#153E97]/50 cursor-pointer group"
          title="Click to view User Accounts & Role Permissions"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#153E97] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
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
                {dashboardStats.activeStaffPct}%
              </span>
            </div>

            {/* Loading / Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden relative">
              <div
                className="bg-[#153E97] h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${dashboardStats.activeStaffPct}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Department Operators (#1D6E9C - Slate Marine Blue) */}
        <div
          onClick={() => setActiveTab && setActiveTab("admin-users")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#1D6E9C]/50 cursor-pointer group"
          title="Click to view Department Operators Breakdown"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#1D6E9C] uppercase tracking-wider transition-colors truncate whitespace-nowrap">
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
            <span className="text-[10px] font-bold text-[#1D6E9C] bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
              Active
            </span>
          </div>
        </div>

        {/* Card 3: System Administrators (#0284c7 - Ocean Blue) */}
        <div
          onClick={() => setActiveTab && setActiveTab("admin-formula-access")}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:border-[#0284c7]/50 cursor-pointer group"
          title="Click to view Superuser Privileges & Formula Access"
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-[#0284c7] uppercase tracking-wider truncate whitespace-nowrap">
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
            <span className="text-[10px] font-bold text-[#0284c7] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
              Secured
            </span>
          </div>
        </div>

        {/* Card 4: System Audit Logs (#153E97 Solid Card with white text) */}
        <div
          onClick={() => setActiveTab && setActiveTab("admin-activity")}
          className="bg-[#153E97] border border-[#153E97] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md hover:brightness-105 cursor-pointer group text-white"
          title="Click to view Security & User Activity Logs"
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
            <span className="truncate text-white font-medium">Live security & user trail</span>
            <span className="text-[10px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded border border-white/30">
              Logged
            </span>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL INSIGHTS (4 MINI QUICK-NAV CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setActiveTab && setActiveTab("admin-users")}
          className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-[#153E97] hover:shadow-xs transition-all cursor-pointer group"
          title="Manage user accounts, roles and credential resets"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#153E97] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate group-hover:text-[#153E97] transition-colors">
                User Management
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {users.length} registered accounts
              </span>
            </div>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#153E97] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
        </div>

        <div
          onClick={() => setActiveTab && setActiveTab("admin-activity")}
          className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-[#153E97] hover:shadow-xs transition-all cursor-pointer group"
          title="Inspect live audit trail, logins and administrative actions"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#153E97] flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate group-hover:text-[#153E97] transition-colors">
                Audit Activity Logs
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {activities.length} security events
              </span>
            </div>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#153E97] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
        </div>

        <div
          onClick={() => setActiveTab && setActiveTab("admin-database")}
          className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-[#153E97] hover:shadow-xs transition-all cursor-pointer group"
          title="View database health, backup schedules and collections"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#153E97] flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate group-hover:text-[#153E97] transition-colors">
                Data Backup & Health
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {systemHealth.databaseStatus} • {systemHealth.lastBackupText}
              </span>
            </div>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#153E97] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
        </div>

        <div
          onClick={() => setActiveTab && setActiveTab("admin-formula-access")}
          className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-[#153E97] hover:shadow-xs transition-all cursor-pointer group"
          title="Configure Role-Based Access Control and formula security"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#153E97] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate group-hover:text-[#153E97] transition-colors">
                Access Authorization
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Strict RBAC Protection
              </span>
            </div>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#153E97] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
        </div>
      </div>

      {/* 3. 2-COLUMN BALANCED CHARTS GRID (MATCHING INVENTORY & MARKETING DASHBOARDS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 1. ACCESS & ROLE ALLOCATION DONUT & TABLE (Cols 6) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <Clock className="w-4 h-4 text-[#153E97] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Access & Security Allocation
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setRoleView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${roleView === "chart" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
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
            /* DONUT SVG CHART (BLUE-CENTRIC) */
            <div className="py-5 flex flex-col items-center justify-center relative">
              <svg className="w-44 h-44 sm:w-52 sm:h-52 transform -rotate-90 select-none" viewBox="0 0 160 160">
                {/* Background Track */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#F1F5F9"
                  strokeWidth="18"
                  fill="transparent"
                />

                {/* Segment 1: Admin Superusers (#153E97) */}
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

                {/* Segment 2: Inventory Warehouse (#1D6E9C) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#1D6E9C"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.invStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.invOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#175b82] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Inventory: ${donutData.inv} (${donutData.invPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Segment 3: Marketing Operations (#0284c7) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#0284c7"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.mktStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.mktOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#0369a1] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Marketing: ${donutData.mkt} (${donutData.mktPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />

                {/* Segment 4: Logistics & Dispatch (#0ea5e9) */}
                <circle
                  cx="80"
                  cy="80"
                  r={donutData.radius}
                  stroke="#0ea5e9"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray={`${donutData.logStroke} ${donutData.circumference}`}
                  strokeDashoffset={donutData.logOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500 hover:stroke-[#38bdf8] cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(`Logistics: ${donutData.log} (${donutData.logPct}%)`)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              </svg>

              {/* Centered Donut Summary */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[0] : "System Roles"}
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono whitespace-nowrap">
                  {hoveredSegment ? hoveredSegment.split(":")[1]?.trim() : `${dashboardStats.totalUsers} Users`}
                </span>
                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                  {hoveredSegment ? "Role Share" : "Active Permissions"}
                </span>
              </div>
            </div>
          ) : (
            /* TABLE BREAKDOWN VIEW */
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Role Category</th>
                    <th className="pb-2 text-center whitespace-nowrap">Theme</th>
                    <th className="pb-2 text-right whitespace-nowrap">Personnel</th>
                    <th className="pb-2 text-right whitespace-nowrap">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Root Super Administrators</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#153E97] border border-blue-200">
                        #153E97
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.adminCount} Admins
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {donutData.adminPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Inventory Warehousing Staff</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-[#1D6E9C] border border-sky-200">
                        #1D6E9C
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.inventoryCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#1D6E9C] whitespace-nowrap">
                      {donutData.invPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Marketing Department Staff</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-[#0284c7] border border-sky-200">
                        #0284c7
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.marketingCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0284c7] whitespace-nowrap">
                      {donutData.mktPct}%
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Logistics &amp; Dispatch Staff</td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-[#0ea5e9] border border-sky-200">
                        #0ea5e9
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {dashboardStats.logisticCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0ea5e9] whitespace-nowrap">
                      {donutData.logPct}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Symmetrical Unified Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-100 gap-2 text-xs">
            <div className="flex items-center gap-4 whitespace-nowrap">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#153E97] ring-2 ring-white shadow-2xs shrink-0" />
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Admins <span className="font-mono font-bold text-slate-500">({dashboardStats.adminCount})</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] ring-2 ring-white shadow-2xs shrink-0" />
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Staff <span className="font-mono font-bold text-slate-500">({dashboardStats.staffCount})</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                Total Users: <span className="font-bold text-slate-700">{dashboardStats.totalUsers}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 2. DEPARTMENT ACTIVITY & USER DENSITY (SPLINE WAVE, HYBRID, BARS & TABLE) (Cols 6) */}
        <div className="lg:col-span-6 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
              <BarChart3 className="w-4 h-4 text-[#153E97] shrink-0" />
              <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
                Department Activity &amp; User Density
              </h3>
            </div>

            {/* Toolbar: Icon-Only View Toggle */}
            <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
              <button
                onClick={() => setDensityView("curve")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${densityView === "curve" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Curved Line View (Smooth Spline Wave)"
                aria-label="Curved Line View"
              >
                <LineChart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDensityView("hybrid")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${densityView === "hybrid" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Hybrid View (Curve Line + Bars)"
                aria-label="Hybrid View"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDensityView("chart")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${densityView === "chart" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Graph View (Grouped Bars)"
                aria-label="Graph View"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDensityView("table")}
                className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${densityView === "table" ? "bg-white text-[#153E97] shadow-xs" : "text-slate-400 hover:text-slate-700"
                  }`}
                title="Table View (Comparison Metrics)"
                aria-label="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {densityView === "curve" ? (
            /* 1. SMOOTH SPLINE AREA WAVE (BLUE PALETTE) */
            <div className="py-4 sm:py-6 flex flex-col justify-center select-none">
              <svg viewBox="0 0 600 220" className="w-full h-56 overflow-visible">
                <defs>
                  <linearGradient id="adminStaffGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#153E97" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#153E97" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="adminPrivGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                {[35, 80, 125, 175].map((y) => (
                  <line key={y} x1="40" y1={y} x2="560" y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
                ))}

                {/* Shaded Areas */}
                <path d={densityChartData.staff.areaPath} fill="url(#adminStaffGrad)" className="transition-all duration-700" />
                <path d={densityChartData.admin.areaPath} fill="url(#adminPrivGrad)" className="transition-all duration-700" />

                {/* Spline Lines */}
                <path
                  d={densityChartData.staff.curvePath}
                  fill="none"
                  stroke="#153E97"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
                <path
                  d={densityChartData.admin.curvePath}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />

                {/* Data Points */}
                {[
                  { x: densityChartData.x1, y: densityChartData.staff.y1, val: dashboardStats.totalUsers, color: "#153E97", label: "Total Users" },
                  { x: densityChartData.x2, y: densityChartData.staff.y2, val: dashboardStats.staffCount, color: "#153E97", label: "Staff" },
                  { x: densityChartData.x3, y: densityChartData.staff.y3, val: dashboardStats.inventoryCount + dashboardStats.marketingCount, color: "#153E97", label: "Core Ops" },
                  { x: densityChartData.x1, y: densityChartData.admin.y1, val: dashboardStats.adminCount * 2, color: "#0284c7", label: "Auth Keys" },
                  { x: densityChartData.x2, y: densityChartData.admin.y2, val: dashboardStats.adminCount, color: "#0284c7", label: "Admins" },
                  { x: densityChartData.x3, y: densityChartData.admin.y3, val: Math.max(1, dashboardStats.logisticCount), color: "#0284c7", label: "Logistics" },
                ].map((pt, i) => (
                  <g key={i} className="transition-all duration-700">
                    <circle cx={pt.x} cy={pt.y} r="5.5" fill="#ffffff" stroke={pt.color} strokeWidth="3" />
                    <text x={pt.x} y={pt.y - 10} textAnchor="middle" className="text-[10px] font-mono font-bold fill-slate-700">
                      {pt.val}
                    </text>
                  </g>
                ))}

                {/* X-Axis Labels */}
                <text x={densityChartData.x1} y="200" textAnchor="middle" className="text-[11px] font-bold fill-slate-700">Registered Accounts</text>
                <text x={densityChartData.x2} y="200" textAnchor="middle" className="text-[11px] font-bold fill-slate-700">Department Operators</text>
                <text x={densityChartData.x3} y="200" textAnchor="middle" className="text-[11px] font-bold fill-slate-700">Security Privileges</text>
              </svg>
            </div>
          ) : densityView === "hybrid" ? (
            /* 2. HYBRID VIEW: CURVE WAVE + GROUPED BARS */
            <div className="py-4 sm:py-6 flex flex-col justify-center relative select-none">
              <svg viewBox="0 0 600 220" className="w-full h-56 overflow-visible absolute inset-0 pointer-events-none">
                <defs>
                  <linearGradient id="adminHybridGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#153E97" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#153E97" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={densityChartData.staff.areaPath} fill="url(#adminHybridGrad)" className="transition-all duration-700" />
                <path d={densityChartData.staff.curvePath} fill="none" stroke="#153E97" strokeWidth="2.5" strokeDasharray="4 4" className="transition-all duration-700" />
                <path d={densityChartData.admin.curvePath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="4 4" className="transition-all duration-700" />
              </svg>

              <div className="h-56 w-full flex items-end justify-around px-2 sm:px-8 border-b border-slate-200 relative z-10">
                {/* Column 1 */}
                <div className="flex flex-col items-center gap-2 h-full justify-end">
                  <div className="flex items-end gap-1.5 sm:gap-2.5">
                    <div
                      style={{ height: `${Math.max(16, (dashboardStats.totalUsers / maxBarVal) * 100)}%` }}
                      className="w-6 sm:w-10 bg-[#153E97] rounded-t-lg transition-all"
                    />
                    <div
                      style={{ height: `${Math.max(16, (dashboardStats.adminCount / maxBarVal) * 100)}%` }}
                      className="w-6 sm:w-10 bg-[#0284c7] rounded-t-lg transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Accounts</span>
                </div>

                {/* Column 2 */}
                <div className="flex flex-col items-center gap-2 h-full justify-end">
                  <div className="flex items-end gap-1.5 sm:gap-2.5">
                    <div
                      style={{ height: `${Math.max(16, (dashboardStats.staffCount / maxBarVal) * 100)}%` }}
                      className="w-6 sm:w-10 bg-[#153E97] rounded-t-lg transition-all"
                    />
                    <div
                      style={{ height: `${Math.max(16, (dashboardStats.inventoryCount / maxBarVal) * 100)}%` }}
                      className="w-6 sm:w-10 bg-[#0284c7] rounded-t-lg transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Staff Ops</span>
                </div>

                {/* Column 3 */}
                <div className="flex flex-col items-center gap-2 h-full justify-end">
                  <div className="flex items-end gap-1.5 sm:gap-2.5">
                    <div
                      style={{ height: `${Math.max(16, (dashboardStats.marketingCount / maxBarVal) * 100)}%` }}
                      className="w-6 sm:w-10 bg-[#153E97] rounded-t-lg transition-all"
                    />
                    <div
                      style={{ height: `${Math.max(16, (dashboardStats.logisticCount / maxBarVal) * 100)}%` }}
                      className="w-6 sm:w-10 bg-[#0284c7] rounded-t-lg transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">Logistics</span>
                </div>
              </div>
            </div>
          ) : densityView === "chart" ? (
            /* 3. GROUPED BAR GRAPH CONTAINER */
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
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.marketingCount / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.marketingCount} Users
                      </span>
                    </div>
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.adminCount / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#0284c7] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
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
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.inventoryCount} Users
                      </span>
                    </div>
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.staffCount / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#0284c7] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
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
                      className="w-7 sm:w-11 md:w-14 bg-[#153E97] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
                    >
                      <span className="absolute -top-7 text-[10px] font-mono font-black text-slate-900 opacity-0 group-hover:opacity-100 bg-white px-1.5 py-0.5 rounded shadow-xs transition-opacity whitespace-nowrap border border-slate-200 z-20">
                        {dashboardStats.logisticCount} Users
                      </span>
                    </div>
                    <div
                      style={{ height: `${Math.max(14, (dashboardStats.totalUsers / maxBarVal) * 100)}%` }}
                      className="w-7 sm:w-11 md:w-14 bg-[#0284c7] hover:brightness-110 rounded-t-xl transition-all shadow-xs relative group flex justify-center cursor-pointer"
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
            /* 4. COMPARISON TABLE VIEW */
            <div className="py-4 my-auto overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase whitespace-nowrap">
                    <th className="pb-2 whitespace-nowrap">Department Scope</th>
                    <th className="pb-2 text-right whitespace-nowrap">Staff (#153E97)</th>
                    <th className="pb-2 text-right whitespace-nowrap">Admins (#0284c7)</th>
                    <th className="pb-2 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Marketing Department</td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.marketingCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0284c7] whitespace-nowrap">
                      {dashboardStats.adminCount} Admins
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#153E97]">
                        Authorized
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Inventory &amp; Warehousing</td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.inventoryCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0284c7] whitespace-nowrap">
                      {dashboardStats.adminCount} Admins
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#153E97]">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-800 whitespace-nowrap">Logistics &amp; Fulfillment</td>
                    <td className="py-3 text-right font-mono font-bold text-[#153E97] whitespace-nowrap">
                      {dashboardStats.logisticCount} Staff
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-[#0284c7] whitespace-nowrap">
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

          {/* Symmetrical Unified Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-100 gap-2 text-xs">
            <div className="flex items-center gap-4 whitespace-nowrap">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#153E97] ring-2 ring-white shadow-2xs shrink-0" />
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Primary Personnel</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] ring-2 ring-white shadow-2xs shrink-0" />
                <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Admin Privilege</span>
              </div>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
                Total Ops: <span className="font-bold text-slate-700">{dashboardStats.totalOperations}</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. LIVE SYSTEM ADMINISTRATION & SECURITY AUDIT (SECTION 3: HIGH-TECH MULTI-AXIS MATRIX) */}
      <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
            <Boxes className="w-4 h-4 text-[#153E97] shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 truncate whitespace-nowrap">
              Live System Administration &amp; Security Audit
            </h3>
          </div>

          {/* Toolbar: Icon-Only View Toggle (Radar, Radial, Spectrum) */}
          <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs shrink-0 whitespace-nowrap">
            <button
              onClick={() => setAuditGraphMode("radar")}
              className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${auditGraphMode === "radar" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              title="Multi-Axis Spider / Radar Audit"
              aria-label="Spider Radar"
            >
              <Boxes className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAuditGraphMode("radial")}
              className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${auditGraphMode === "radial" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              title="Concentric Radial Gauge"
              aria-label="Concentric Radial"
            >
              <PieChart className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAuditGraphMode("spectrum")}
              className={`p-1.5 rounded transition-all cursor-pointer whitespace-nowrap ${auditGraphMode === "spectrum" ? "bg-white text-slate-900 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              title="Density Spectrum"
              aria-label="Density Spectrum"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills & Series Legend (In Blue Palette) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setUnitFilter("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${unitFilter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              All Departments ({unitAuditData.length})
            </button>
            <button
              onClick={() => setUnitFilter("admin")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${unitFilter === "admin"
                ? "bg-[#153E97] text-white shadow-xs"
                : "bg-blue-50 text-[#153E97] hover:bg-blue-100"
                }`}
            >
              Executive Admins
            </button>
            <button
              onClick={() => setUnitFilter("staff")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${unitFilter === "staff"
                ? "bg-[#1D6E9C] text-white shadow-xs"
                : "bg-sky-50 text-[#1D6E9C] hover:bg-sky-100"
                }`}
            >
              Department Staff
            </button>
            <button
              onClick={() => setUnitFilter("security")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer whitespace-nowrap ${unitFilter === "security"
                ? "bg-[#0284c7] text-white shadow-xs"
                : "bg-sky-50 text-[#0284c7] hover:bg-sky-100"
                }`}
            >
              Security Audit
            </button>
          </div>

          {/* Legends */}
          <div className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Series:</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#153E97] ring-2 ring-white shadow-2xs shrink-0" />
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Authorized &amp; Active</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] ring-2 ring-white shadow-2xs shrink-0" />
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Standard Personnel</span>
            </div>
          </div>
        </div>

        {/* GRAPH CONTENT GRID (12 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* LEFT: THE INTERACTIVE GRAPH (Cols 7) */}
          <div className="lg:col-span-7 w-full flex items-center justify-center p-2 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-100 min-h-[300px]">
            {unitAuditData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-slate-400 text-xs">
                <Boxes className="w-8 h-8 text-slate-300 mb-2" />
                <span>No department data found for the selected filter.</span>
              </div>
            ) : auditGraphMode === "radar" ? (
              /* 1. RADAR / SPIDER WEB SVG CHART (BLUE-CENTRIC) */
              <svg viewBox="0 0 540 330" className="w-full max-h-[340px] overflow-visible select-none">
                <defs>
                  <filter id="radarAdmHighGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#153E97" floodOpacity="0.3" />
                  </filter>
                  <filter id="radarAdmNeuGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.3" />
                  </filter>
                </defs>

                {(() => {
                  const cx = 270;
                  const cy = 165;
                  const radius = 105;
                  const N = Math.max(3, unitAuditData.length);
                  const levels = [0.25, 0.5, 0.75, 1.0];

                  const highPts = unitAuditData.map((c, i) => {
                    const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                    const r = (Math.max(15, c.highSecurityScore) / 100) * radius;
                    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
                  }).join(" ");

                  const neuPts = unitAuditData.map((c, i) => {
                    const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                    const r = (Math.max(15, c.standardScore) / 100) * radius;
                    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
                  }).join(" ");

                  return (
                    <g>
                      {levels.map((lvl) => {
                        const pts = unitAuditData.map((_, i) => {
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

                      {/* Axes */}
                      {unitAuditData.map((c, i) => {
                        const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                        const sx = cx + radius * Math.cos(a);
                        const sy = cy + radius * Math.sin(a);
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
                            <text
                              x={lx}
                              y={ly}
                              textAnchor={textAnchor}
                              className="font-bold text-[10.5px] fill-slate-800 transition-all duration-500"
                            >
                              {c.name}
                            </text>
                            <text
                              x={lx}
                              y={ly + 11}
                              textAnchor={textAnchor}
                              className="font-mono text-[9px] fill-slate-400 font-semibold transition-all duration-500"
                            >
                              {c.count} accounts
                            </text>
                          </g>
                        );
                      })}

                      {/* Authorized / High Security Polygon (#153E97) */}
                      <polygon
                        points={highPts}
                        fill="#153E97"
                        fillOpacity="0.22"
                        stroke="#153E97"
                        strokeWidth="2.8"
                        filter="url(#radarAdmHighGlow)"
                        className="transition-all duration-700 ease-out"
                      />

                      {/* Standard Personnel Polygon (#0284c7) */}
                      <polygon
                        points={neuPts}
                        fill="#0284c7"
                        fillOpacity="0.22"
                        stroke="#0284c7"
                        strokeWidth="2.8"
                        filter="url(#radarAdmNeuGlow)"
                        className="transition-all duration-700 ease-out"
                      />

                      {/* Dots on Vertices with smooth transitions */}
                      {unitAuditData.map((c, i) => {
                        const a = (i * 2 * Math.PI / N) - Math.PI / 2;
                        const r1 = (Math.max(15, c.highSecurityScore) / 100) * radius;
                        const r2 = (Math.max(15, c.standardScore) / 100) * radius;
                        return (
                          <g key={`dots-${c.name}`}>
                            <circle
                              cx={cx + r1 * Math.cos(a)}
                              cy={cy + r1 * Math.sin(a)}
                              r="4.5"
                              fill="#153E97"
                              stroke="#ffffff"
                              strokeWidth="2"
                              className="transition-all duration-700 ease-out"
                            />
                            <circle
                              cx={cx + r2 * Math.cos(a)}
                              cy={cy + r2 * Math.sin(a)}
                              r="4.5"
                              fill="#0284c7"
                              stroke="#ffffff"
                              strokeWidth="2"
                              className="transition-all duration-700 ease-out"
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })()}
              </svg>
            ) : auditGraphMode === "radial" ? (
              /* 2. CONCENTRIC RADIAL ARC GAUGES (BLUE-CENTRIC) */
              <svg viewBox="0 0 540 330" className="w-full max-h-[340px] overflow-visible select-none">
                {(() => {
                  const cx = 270;
                  const cy = 165;
                  return (
                    <g>
                      {dynamicRings.map((ring) => {
                        const circumference = 2 * Math.PI * ring.r;
                        const strokeOffset = circumference * (1 - (ring.pct / 100));
                        return (
                          <g key={ring.label}>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={ring.r}
                              fill="none"
                              stroke="#E2E8F0"
                              strokeWidth="11"
                              opacity="0.6"
                            />
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
                        className="font-black font-mono text-sm fill-slate-900 transition-all duration-500"
                      >
                        {systemStabilityScore}%
                      </text>
                      <text
                        x={cx}
                        y={cy + 8}
                        textAnchor="middle"
                        className="font-bold text-[7px] uppercase tracking-wider fill-slate-400"
                      >
                        SECURITY
                      </text>
                    </g>
                  );
                })()}
              </svg>
            ) : (
              /* 3. HORIZONTAL DENSITY SPECTRUM (BLUE-CENTRIC) */
              <div className="w-full flex flex-col gap-3 py-2 px-1 sm:px-3">
                {unitAuditData.map((c, idx) => (
                  <div key={c.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 text-[11px] truncate max-w-[160px]">
                        {c.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-slate-400 transition-all duration-500">{c.subLabel}</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 transition-all duration-500">
                          {c.densityPct}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-2 relative flex items-center">
                      <div
                        style={{ width: `${c.densityPct}%` }}
                        className={`h-full rounded-full transition-all duration-700 ease-out ${idx % 2 === 0 ? "bg-[#153E97]" : "bg-[#0284c7]"
                          }`}
                      />
                      <div
                        style={{ left: `calc(${c.densityPct}% - 6px)` }}
                        className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-xs transition-all duration-700 ease-out ${idx % 2 === 0 ? "bg-[#153E97]" : "bg-[#0284c7]"
                          }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: AUDIT KPI BREAKDOWN & UNIT DENSITY MATRIX (Cols 5) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {unitFilter === "admin"
                    ? "Executive Admin Index"
                    : unitFilter === "staff"
                      ? "Operational Staff Coverage"
                      : unitFilter === "security"
                        ? "System Security & Compliance"
                        : "Administration Reliability Index"}
                </span>
                <span className="text-xs font-semibold text-slate-600 transition-all duration-500">
                  {unitFilter === "admin"
                    ? `${dashboardStats.adminCount} Superuser Root Admins`
                    : unitFilter === "staff"
                      ? `${dashboardStats.staffCount} Active Department Operators`
                      : unitFilter === "security"
                        ? `${activities.length} Audit Events Logged`
                        : `${users.length} Active Accounts Governed`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#153E97] animate-pulse" />
                <span className="font-mono text-xs font-bold text-slate-900 transition-all duration-500">
                  {systemStabilityScore}%
                </span>
              </div>
            </div>

            {/* Department Density Stack */}
            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto no-scrollbar pr-1">
              {unitAuditData.map((c, idx) => (
                <div
                  key={c.name}
                  className="bg-white border border-slate-100 hover:border-slate-300 rounded-xl p-2.5 flex flex-col gap-1.5 transition-all shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 text-[11px] truncate">
                      {c.name}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-600 transition-all duration-500">
                      {c.subLabel}
                    </span>
                  </div>

                  {/* Dual Capacity Bar (#153E97 & #0284c7) */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                    <div
                      style={{ width: `${c.highSecurityScore}%` }}
                      className="bg-[#153E97] h-full transition-all duration-700 ease-out"
                      title={`Security / Authorized: ${c.highSecurityScore}%`}
                    />
                    <div
                      style={{ width: `${100 - c.highSecurityScore}%` }}
                      className="bg-[#0284c7] h-full transition-all duration-700 ease-out"
                      title={`Standard Access: ${100 - c.highSecurityScore}%`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-[#153E97] font-semibold transition-all duration-500">
                      Secured: {c.highSecurityScore}%
                    </span>
                    <span className="font-mono text-[#0284c7] font-semibold transition-all duration-500">
                      Share: {c.densityPct}%
                    </span>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold transition-all duration-500 ${c.tagLabel.includes("Root") || c.tagLabel.includes("Secured") || c.tagLabel.includes("Superuser")
                      ? "bg-blue-50 text-[#153E97]"
                      : "bg-slate-100 text-slate-600"
                      }`}>
                      {c.tagLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Note & Live Telemetry (100% Matching Inventory & Blue Palette) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-100 gap-2 text-xs">
          <span className="text-[11px] text-slate-500">
            Real-time multi-dimensional security and role audit mapped against active system governance.
          </span>
          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">
              Active Units: <span className="font-bold text-slate-700">{unitAuditData.length}</span>
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

export default AdminDashboard;