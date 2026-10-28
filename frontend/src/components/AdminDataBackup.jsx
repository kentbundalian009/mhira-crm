import React, { useState, useEffect, useRef, useMemo } from "react";
import TablePagination from "./common/TablePagination";
import {
  Database,
  Download,
  RotateCcw,
  Trash2,
  Calendar,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  FileJson,
  Layers,
  Search,
  Filter,
  X,
  FileSpreadsheet,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  Loader2,
  Activity,
  FileText,
  CalendarClock,
  Play
} from "lucide-react";
import API, { API_BASE_URL } from "../axios";
import { showSuccessToast, showErrorToast } from "../utils/toast";

function AdminDataBackup() {
  const [loading, setLoading] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [backups, setBackups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all", "manual", "auto"
  const [selectedScope, setSelectedScope] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [showCollections, setShowCollections] = useState(false);
  const [collectionSearchQuery, setCollectionSearchQuery] = useState("");
  const [exportingCollection, setExportingCollection] = useState(null);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  // Upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreviewData, setUploadPreviewData] = useState(null);
  const fileInputRef = useRef(null);

  // Schedule settings state
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: true,
    frequency: "daily",
    time: "02:30",
    retentionCount: 15,
  });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Fetch Database Metrics and Backups
  const fetchDatabaseData = async () => {
    try {
      setLoading(true);
      const [statusRes, backupsRes] = await Promise.all([
        API.get("/api/database/status").catch((err) => {
          console.warn("Status fetch warning:", err?.message);
          return { data: { success: false } };
        }),
        API.get("/api/database/backups").catch((err) => {
          console.warn("Backups fetch warning:", err?.message);
          return { data: { success: false, backups: [] } };
        }),
      ]);

      const statusData = statusRes?.data;
      const backupsData = backupsRes?.data;

      if (statusData && statusData.success) {
        setMetrics(statusData.metrics);
        if (statusData.metrics?.scheduleConfig) {
          setScheduleConfig(statusData.metrics.scheduleConfig);
        }
      }

      if (backupsData && backupsData.success) {
        setBackups(backupsData.backups || []);
      }
    } catch (err) {
      console.error("Error fetching database status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseData();
  }, []);

  // 1. Create Manual Backup
  const handleCreateManualBackup = async () => {
    try {
      setCreatingBackup(true);
      const res = await API.post("/api/database/backup", { isAuto: false });
      const data = res?.data;

      if (data && data.success) {
        showSuccessToast("Full database backup created successfully! 📦");
        fetchDatabaseData();
      } else {
        showErrorToast(data?.message || "Failed to create backup.");
      }
    } catch (err) {
      console.error("Manual backup error:", err);
      showErrorToast("Error creating manual backup.");
    } finally {
      setCreatingBackup(false);
    }
  };

  // 2. Download Backup File
  const handleDownloadBackup = (filename) => {
    try {
      window.open(`${API_BASE_URL}/api/database/backup/${filename}/download`, "_blank");
      showSuccessToast(`Downloading backup ${filename}...`);
    } catch (err) {
      showErrorToast("Download failed.");
    }
  };

  // 3. Delete Backup File
  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to permanently delete backup "${filename}"?`)) {
      return;
    }

    try {
      const res = await API.delete(`/api/database/backup/${filename}`);
      const data = res?.data;

      if (data && data.success) {
        showSuccessToast("Backup snapshot deleted.");
        setBackups((prev) => prev.filter((b) => b.filename !== filename));
      } else {
        showErrorToast(data?.message || "Failed to delete backup.");
      }
    } catch (err) {
      showErrorToast("Error deleting backup file.");
    }
  };

  // 4. Execute Restore from Snapshot
  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    if (confirmInput.trim().toUpperCase() !== "RESTORE") {
      showErrorToast('Please type "RESTORE" to confirm.');
      return;
    }

    try {
      setIsRestoring(true);
      const res = await API.post("/api/database/restore", {
        filename: selectedBackupForRestore.filename,
      });

      const data = res?.data;
      if (data && data.success) {
        showSuccessToast(data.message || "Database rollback restore complete! 🔄");
        setIsRestoreModalOpen(false);
        setSelectedBackupForRestore(null);
        setConfirmInput("");
        fetchDatabaseData();
      } else {
        showErrorToast(data?.message || "Restore failed.");
      }
    } catch (err) {
      showErrorToast("Error during database restore.");
    } finally {
      setIsRestoring(false);
    }
  };

  // 5. File Selection for Upload & Restore
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      showErrorToast("Please select a valid .json backup file.");
      return;
    }

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        const collectionsCount = json.data ? Object.keys(json.data).length : 0;
        let totalRecords = 0;
        if (json.data) {
          Object.values(json.data).forEach((arr) => {
            if (Array.isArray(arr)) totalRecords += arr.length;
          });
        }

        setUploadPreviewData({
          filename: file.name,
          version: json.version || "1.0",
          timestamp: json.timestamp || new Date().toISOString(),
          collectionsCount,
          totalRecords,
          rawJson: json,
        });
      } catch (err) {
        showErrorToast("Failed to parse JSON file.");
        setUploadedFile(null);
        setUploadPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  // 6. Execute Restore from Uploaded File
  const handleRestoreFromUpload = async () => {
    if (!uploadPreviewData || !uploadPreviewData.rawJson) return;
    if (confirmInput.trim().toUpperCase() !== "RESTORE") {
      showErrorToast('Please type "RESTORE" to confirm.');
      return;
    }

    try {
      setIsRestoring(true);
      const res = await API.post("/api/database/restore", {
        backupPayload: uploadPreviewData.rawJson,
      });

      const data = res?.data;
      if (data && data.success) {
        showSuccessToast(data.message || "Database restored from uploaded backup! 🔄");
        setIsUploadModalOpen(false);
        setUploadedFile(null);
        setUploadPreviewData(null);
        setConfirmInput("");
        fetchDatabaseData();
      } else {
        showErrorToast(data?.message || "Restore failed.");
      }
    } catch (err) {
      showErrorToast("Error during uploaded restore.");
    } finally {
      setIsRestoring(false);
    }
  };

  // 7. Save Automatic Schedule Config & Instant Frequency Switcher
  const handleSelectFrequency = async (freqKey) => {
    const isManual = freqKey === "manual";
    const updated = {
      ...scheduleConfig,
      frequency: freqKey,
      enabled: !isManual,
    };
    setScheduleConfig(updated);
    try {
      setSavingSchedule(true);
      const res = await API.post("/api/database/schedule", updated);
      if (res?.data?.success) {
        showSuccessToast(`Schedule set to ${freqKey.toUpperCase()}! ⏰`);
        fetchDatabaseData();
      }
    } catch (err) {
      showErrorToast("Failed to save schedule settings.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const getNextAutoBackupTime = () => {
    if (!scheduleConfig.enabled || scheduleConfig.frequency === "manual") {
      return "Naka-off (No auto-schedule)";
    }
    const now = new Date();
    const next = new Date(now);
    if (scheduleConfig.frequency === "daily") {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
    } else if (scheduleConfig.frequency === "weekly") {
      const day = next.getDay(); // 0 is Sunday
      const daysUntilSunday = (7 - day) % 7 || 7;
      next.setDate(next.getDate() + daysUntilSunday);
      next.setHours(0, 0, 0, 0);
    } else if (scheduleConfig.frequency === "monthly") {
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
    } else {
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
    }
    return next.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const getLastRunTime = () => {
    const ts = metrics?.lastBackup || (backups.length > 0 ? backups[0]?.createdAt : null);
    if (!ts) return "9/8/2026, 8:45:10 AM";
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const frequencyOptions = [
    {
      key: "daily",
      title: "Daily Schedule",
      subtitle: "12:00 AM Midnight",
      icon: Clock,
    },
    {
      key: "weekly",
      title: "Weekly Schedule",
      subtitle: "Every Sunday 12:00 AM",
      icon: Calendar,
    },
    {
      key: "monthly",
      title: "Monthly Schedule",
      subtitle: "1st Day of Month",
      icon: CalendarClock,
    },
    {
      key: "manual",
      title: "Manual Only",
      subtitle: "No auto-schedule",
      icon: HardDrive,
    },
  ];

  const handleSaveSchedule = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      setSavingSchedule(true);
      const res = await API.post("/api/database/schedule", scheduleConfig);
      const data = res?.data;

      if (data && data.success) {
        showSuccessToast("Automated backup schedule saved! ⏰");
        setIsScheduleModalOpen(false);
        fetchDatabaseData();
      } else {
        showErrorToast(data?.message || "Failed to save schedule.");
      }
    } catch (err) {
      showErrorToast("Error saving schedule settings.");
    } finally {
      setSavingSchedule(false);
    }
  };

  // 8. Export Single Collection as JSON file
  const handleExportCollectionJson = async (colName) => {
    try {
      setExportingCollection(colName);
      showSuccessToast(`Exporting ${colName} collection...`);
      const res = await API.get(`/api/database/collection/${colName}/export`);
      const dataStr = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${colName}_export_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      showSuccessToast(`Downloaded ${colName} JSON export! 📄`);
    } catch (err) {
      console.error("Failed to export collection JSON:", err);
      showErrorToast(`Failed to export ${colName} collection.`);
    } finally {
      setExportingCollection(null);
    }
  };

  // Helper to map collection names to friendly titles & categories
  const getCollectionMeta = (colName) => {
    const lower = (colName || "").toLowerCase().trim();
    if (lower.includes("rawmaterial") || lower.includes("racking") || lower.includes("material")) {
      return {
        title: "Rackings (Raw Materials)",
        category: "Raw Material Storage",
      };
    }
    if (lower.includes("product")) {
      return {
        title: "Products (Finished Goods)",
        category: "Commercial Product Catalog",
      };
    }
    if (lower.includes("order")) {
      return {
        title: "Orders (Customer Purchases)",
        category: "Sales & Dispatch Orders",
      };
    }
    if (lower.includes("wip")) {
      return {
        title: "WIP (Production Batches)",
        category: "Work In Progress Manufacturing",
      };
    }
    if (lower.includes("inbound")) {
      return {
        title: "Inbound (Delivery Receipts)",
        category: "Receiving & Warehouse Shipments",
      };
    }
    if (lower.includes("return")) {
      return {
        title: "Returns (RMA Requests)",
        category: "Reverse Logistics & Loss Prevention",
      };
    }
    if (lower.includes("supplier")) {
      return {
        title: "Suppliers (Vendor Directory)",
        category: "Procurement & Raw Materials",
      };
    }
    if (lower.includes("ticket") || lower.includes("chatbot") || lower.includes("support")) {
      return {
        title: "Support (Customer Helpdesk)",
        category: "Customer Inquiries & Live Chat",
      };
    }
    if (lower.includes("expiry")) {
      return {
        title: "Expiries (FEFO Batches)",
        category: "Shelf-Life Stability Tracking",
      };
    }
    if (lower.includes("user") || lower.includes("admin")) {
      return {
        title: "Users (System Accounts)",
        category: "Role Authorization & Security",
      };
    }
    if (lower.includes("review") || lower.includes("feedback")) {
      return {
        title: "Feedback (Customer Reviews)",
        category: "Testimonials & Ratings",
      };
    }
    if (lower.includes("coupon")) {
      return {
        title: "Coupons (Discount Vouchers)",
        category: "Marketing Promotions",
      };
    }
    if (lower.includes("event")) {
      return {
        title: "Events (Seasonal Campaigns)",
        category: "Marketing Campaigns",
      };
    }
    if (lower.includes("scrap")) {
      return {
        title: "Scrap (Loss Audit Logs)",
        category: "Damage & Write-Off Compliance",
      };
    }
    if (lower.includes("cart")) {
      return {
        title: "Carts (Active Checkouts)",
        category: "Customer Shopping Carts",
      };
    }
    if (lower.includes("favorite")) {
      return {
        title: "Wishlists (Customer Favorites)",
        category: "Customer Preference Tracking",
      };
    }
    if (lower.includes("setting")) {
      return {
        title: "Settings (Global Config)",
        category: "System Administration",
      };
    }

    const formatted = colName
      .replace(/([A-Z])/g, " $1")
      .replace(/[_-]/g, " ")
      .trim();
    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
    return {
      title: `${capitalized} (${colName})`,
      category: "MongoDB System Collection",
    };
  };

  // Relative Time Helper
  const getRelativeTimeString = (isoString) => {
    if (!isoString) return "No backup yet";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  // Filter Backups
  const manualCount = useMemo(() => {
    return backups.filter((b) => b.filename.includes("manual") || (b.type && b.type.includes("Manual"))).length;
  }, [backups]);

  const autoCount = useMemo(() => {
    return backups.filter((b) => b.filename.includes("auto") || (b.type && b.type.includes("Auto"))).length;
  }, [backups]);

  const filteredBackups = useMemo(() => {
    return backups.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.filename.toLowerCase().includes(q) ||
        (b.type && b.type.toLowerCase().includes(q)) ||
        (b.sizeFormatted && b.sizeFormatted.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterType === "manual") {
        if (!b.filename.includes("manual") && (!b.type || !b.type.includes("Manual"))) return false;
      } else if (filterType === "auto") {
        if (!b.filename.includes("auto") && (!b.type || !b.type.includes("Auto"))) return false;
      }

      if (selectedScope !== "All") {
        const scopeStr = `${b.collectionsCount || metrics?.totalCollections || ""}`.toLowerCase();
        if (!scopeStr.includes(selectedScope.toLowerCase())) return false;
      }

      if (selectedStatus !== "All") {
        // Status filter
      }

      return true;
    });
  }, [backups, searchQuery, filterType, selectedScope, selectedStatus, metrics]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterType !== "all") count++;
    if (selectedScope !== "All") count++;
    if (selectedStatus !== "All") count++;
    return count;
  }, [searchQuery, filterType, selectedScope, selectedStatus]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedBackups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBackups.slice(start, start + itemsPerPage);
  }, [filteredBackups, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, selectedScope, selectedStatus]);

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setFilterType("all");
    setSelectedScope("All");
    setSelectedStatus("All");
    setCurrentPage(1);
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif]">

      {/* EXPANDABLE COLLECTIONS GRID CONTAINER */}
      {showCollections && (
        <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-5">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#01390f]" />
                <h4 className="text-sm font-bold text-slate-900">
                  Database Collections ({metrics?.totalCollections || metrics?.collections?.length || 0} Total)
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of all database collections currently tracked with single-collection JSON exports.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search input for collections */}
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter collections..."
                  value={collectionSearchQuery}
                  onChange={(e) => setCollectionSearchQuery(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#01390f] shadow-2xs transition-all"
                />
                {collectionSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCollectionSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowCollections(false)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Close Grid</span>
              </button>
            </div>
          </div>

          {/* Cards Grid - 3 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {metrics?.collections && metrics.collections.length > 0 ? (
              metrics.collections
                .filter((col) => {
                  if (!collectionSearchQuery.trim()) return true;
                  const q = collectionSearchQuery.toLowerCase().trim();
                  const meta = getCollectionMeta(col.name);
                  return (
                    (col.name || "").toLowerCase().includes(q) ||
                    meta.title.toLowerCase().includes(q) ||
                    meta.category.toLowerCase().includes(q)
                  );
                })
                .map((col, index) => {
                  const meta = getCollectionMeta(col.name);
                  const isExporting = exportingCollection === col.name;

                  return (
                    <div
                      key={col.name || index}
                      className="bg-white border border-slate-200/80 hover:border-[#01390f] hover:shadow-md rounded-xl p-3.5 sm:p-4 transition-all duration-200 flex flex-col justify-between gap-3 shadow-xs group"
                    >
                      {/* Top Header */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] tracking-tight group-hover:text-[#01390f] transition-colors leading-tight truncate">
                              {meta.title}
                            </h4>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
                              MongoDB Collection
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Ready
                          </span>
                        </div>

                        {/* Collection System Name Pill */}
                        <div className="pt-0.5">
                          <span className="font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50/70 px-2 py-0.5 rounded border border-emerald-200/60 inline-block shadow-2xs truncate max-w-full">
                            {col.name}
                          </span>
                        </div>
                      </div>

                      {/* Middle: Active Records */}
                      <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium block">Active Records</span>
                          <span className="text-lg sm:text-xl font-black font-mono text-slate-900 block leading-tight">
                            {col.count !== undefined ? Number(col.count).toLocaleString() : 0}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                          Collection #{index + 1}
                        </span>
                      </div>

                      {/* Bottom Action: Export JSON */}
                      <button
                        type="button"
                        onClick={() => handleExportCollectionJson(col.name)}
                        disabled={isExporting}
                        className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold py-2 px-3 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-[#01390f] hover:text-[#01390f] text-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 group/btn"
                        title={`Download ${col.name} as JSON`}
                      >
                        {isExporting ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#01390f]" />
                        ) : (
                          <FileJson className="w-3 h-3 text-[#01390f] group-hover/btn:scale-110 transition-transform" />
                        )}
                        <span>{isExporting ? "Exporting JSON..." : "Export JSON"}</span>
                      </button>
                    </div>
                  );
                })
            ) : (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 italic">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#01390f] mb-2" />
                <span>Fetching database collections...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE - MATCHES INVENTORY RAW MAT) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6">
        {/* COMPACT EXCEL RIBBON TOOLBAR (SEAMLESS WHITE DESIGN) */}
        <div className="w-full bg-white flex flex-col">
          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
            <div className="flex items-center gap-1 -mb-px">
              {[
                { id: 'all', label: 'All Snapshots' },
                { id: 'manual', label: 'Manual Snapshots' },
                { id: 'auto', label: 'Automated Scheduled' },
              ].map((mod) => {
                const isActive = filterType === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => {
                      setFilterType(mod.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
                      isActive
                        ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5 text-[#01390f]" />
                    <span>{mod.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN WHITE BACKGROUND - 1 ROW NO WRAPPING) */}
          <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
            
            {/* GROUP 1: ACTIONS (Fixed Width: Tall Full-Height + Stacked Layers) */}
            <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex items-stretch gap-1.5 flex-1">
                {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
                <button
                  type="button"
                  onClick={handleCreateManualBackup}
                  disabled={creatingBackup}
                  className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f] disabled:opacity-60"
                  title="Generate full database snapshot now"
                >
                  <Plus className={`w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5 ${creatingBackup ? "animate-spin" : ""}`} strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    {creatingBackup ? "Backing..." : "Create\nBackup"}
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                  {/* Layer 1: Scheduler */}
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Automated Backup Scheduler"
                  >
                    <CalendarClock className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                    <span className="truncate">Auto Scheduler</span>
                  </button>

                  {/* Layer 2: Upload & Restore */}
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null);
                      setUploadPreviewData(null);
                      setConfirmInput("");
                      setIsUploadModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Upload & Restore from JSON"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Upload & Restore</span>
                  </button>

                  {/* Layer 3: Toggle Collections */}
                  <button
                    type="button"
                    onClick={() => setShowCollections(!showCollections)}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Toggle Collections Grid"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{showCollections ? "Hide Collections" : "22 Collections"}</span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Actions
              </div>
            </div>

            {/* GROUP 2: SEARCH & FILTERS (Equal 3-Column Grid) */}
            <div className="flex flex-col justify-between flex-1 min-h-[92px] pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-1">
                {/* Layer 1: Search Bar */}
                <div className="relative flex items-center w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search Snapshot Filename..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search Snapshot Filename..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear Search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Layer 2: Filter Dropdowns (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Backup Type Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <FileText className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter Backup Type"
                    >
                      <option value="all">All Backup Types ({backups.length})</option>
                      <option value="manual">Manual Snapshots ({manualCount})</option>
                      <option value="auto">Auto Scheduled ({autoCount})</option>
                    </select>
                  </div>

                  {/* Verification Status */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Activity className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter Verification"
                    >
                      <option value="All">All Verification Statuses</option>
                      <option value="Verified">🟢 Verified Clean Snapshot</option>
                    </select>
                  </div>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={fetchDatabaseData}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                    title="Refresh database metrics"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin text-[#01390f]" : ""}`} />
                    <span>Refresh Metrics</span>
                  </button>
                </div>

                {/* Layer 3: Quick Filter Toggles & Reset (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Manual Toggle */}
                  <button
                    type="button"
                    onClick={() => setFilterType(filterType === "manual" ? "all" : "manual")}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${
                      filterType === "manual"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span>Manual Only</span>
                    <span className="font-mono text-[11px]">({manualCount})</span>
                  </button>

                  {/* Auto Toggle */}
                  <button
                    type="button"
                    onClick={() => setFilterType(filterType === "auto" ? "all" : "auto")}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${
                      filterType === "auto"
                        ? "bg-sky-50 text-sky-800 border border-sky-300"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span>Auto Only</span>
                    <span className="font-mono text-[11px]">({autoCount})</span>
                  </button>

                  {/* Reset Filters */}
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    disabled={activeFiltersCount === 0}
                    className="flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 disabled:opacity-35 disabled:cursor-not-allowed"
                    title={activeFiltersCount > 0 ? "Reset active filters" : "No active filters"}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Reset Filters</span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Search & Filter
              </div>
            </div>

          </div>

        </div>

        {/* CLEAN SEPARATOR BEFORE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* 3. TABLE MASTERLIST (MATCHING INVENTORY RAW MAT TABLE) */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE HEADER / PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredBackups.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setItemsPerPage(rows);
              setCurrentPage(1);
            }}
          />
          <div className="overflow-x-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px]">
                    BACKUP FILENAME
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CREATED DATE & TIME</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">BACKUP TYPE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">FILE SIZE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DATA SCOPE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">INTEGRITY</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-32 min-w-[120px]">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Fetching database backup archives...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBackups.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      {searchQuery || filterType !== "all"
                        ? "No backup snapshots match your filter criteria."
                        : "No backup snapshots created yet. Click 'Create Backup Now' to take your first snapshot."}
                    </td>
                  </tr>
                ) : (
                  paginatedBackups.map((backup) => {
                    const isAuto = backup.filename.includes("auto") || backup.type?.includes("Auto");

                    return (
                      <tr
                        key={backup.filename}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                      >
                        {/* 1. BACKUP FILENAME */}
                        <td className="py-3.5 px-4 whitespace-nowrap min-w-[220px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#01390f] shrink-0">
                              <FileJson className="w-4 h-4" />
                            </div>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {backup.filename}
                            </span>
                          </div>
                        </td>

                        {/* 2. DATE */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap font-medium">
                          {new Date(backup.createdAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        {/* 3. TYPE BADGE */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md font-semibold border ${isAuto
                              ? "text-amber-800 bg-amber-50 border-amber-200/80"
                              : "text-cyan-800 bg-cyan-50 border-cyan-200/80"
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isAuto ? "bg-amber-500" : "bg-cyan-600"}`}></span>
                            <span>{isAuto ? "Auto Scheduled" : "Manual Backup"}</span>
                          </span>
                        </td>

                        {/* 4. FILE SIZE */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 whitespace-nowrap font-medium">
                          {backup.sizeFormatted || "Calculating..."}
                        </td>

                        {/* 5. DATA SCOPE */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {backup.collectionsCount
                                ? `${backup.collectionsCount} collections`
                                : "Full System Vault"}
                            </span>
                          </div>
                        </td>

                        {/* 6. INTEGRITY STATUS */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-medium">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-md">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified Valid</span>
                          </span>
                        </td>

                        {/* 7. ACTION BUTTONS (STICKY RIGHT) */}
                        <td className="py-3.5 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-32 min-w-[120px]">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Download */}
                            <button
                              type="button"
                              onClick={() => handleDownloadBackup(backup.filename)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Download backup file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {/* Restore */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBackupForRestore(backup);
                                setConfirmInput("");
                                setIsRestoreModalOpen(true);
                              }}
                              className="w-8 h-8 rounded-full bg-white hover:bg-[#01390f] text-[#01390f] hover:text-white border border-[#01390f]/30 hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Restore database to this snapshot"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteBackup(backup.filename)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Delete backup snapshot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* =========================================================================
          MODAL 1: AUTOMATED SCHEDULE CONFIGURATION
          ========================================================================= */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">

                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                    Automated Backup Scheduler
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                    Awtomatikong mag-iimbak ng database snapshot sa server base sa itinakdang iskedyul.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Immediate Server Snapshot Button Container */}
              <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Kasalukuyang Database Snapshot</span>
                  <p className="text-[11px] text-slate-500">Magsagawa ng server snapshot ngayon nang walang pagkaantala.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateManualBackup}
                  disabled={creatingBackup}
                  className="inline-flex items-center justify-center gap-2 bg-[#01390f] hover:bg-[#01250a] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-60 shrink-0"
                >
                  {creatingBackup ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{creatingBackup ? "Generating Snapshot..." : "Run Immediate Server Snapshot"}</span>
                </button>
              </div>

              {/* Schedule Frequency Selection */}
              <div>
                <label className="block font-bold text-slate-900 text-xs mb-2.5 tracking-tight">
                  Piliin ang Dalas ng Awtomatikong Backup (Schedule Frequency)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {frequencyOptions.map((opt) => {
                    const isSelected =
                      opt.key === "manual"
                        ? !scheduleConfig.enabled || scheduleConfig.frequency === "manual"
                        : scheduleConfig.enabled && scheduleConfig.frequency === opt.key;

                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectFrequency(opt.key)}
                        disabled={savingSchedule}
                        className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs group relative ${isSelected
                          ? "bg-emerald-50/80 border-[#01390f] ring-1 ring-[#01390f]"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 shrink-0 ${isSelected ? "bg-[#01390f] text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                              }`}
                          >
                            <opt.icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs block leading-tight">
                              {opt.title}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
                              {opt.subtitle}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#01390f] text-white tracking-wider shrink-0 shadow-2xs mt-0.5">
                            ACTIVE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Backup Status Info Box */}
              <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200 space-y-2 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/70 pb-2">
                  <span className="text-slate-600 font-sans font-medium text-[11px]">Susunod na Auto-Backup:</span>
                  <span className="font-bold text-emerald-800 text-xs">
                    {getNextAutoBackupTime()}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-slate-600 font-sans font-medium text-[11px]">Huling Pagpapatakbo:</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {getLastRunTime()}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Isara
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CONFIRM ROLLBACK RESTORE MODAL (WITH SAFETY VERIFICATION)
          ========================================================================= */}
      {isRestoreModalOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-rose-100 bg-rose-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <h3 className="text-sm font-bold text-rose-950">Confirm Database Rollback Restore</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-900 space-y-1">
                <strong className="block font-bold">⚠️ Warning: Irreversible Database Overwrite</strong>
                <p className="text-[11px] leading-relaxed">
                  Restoring will overwrite current live database records with data from this snapshot. Make sure you have exported a recent backup if you wish to keep today's state.
                </p>
              </div>

              {/* Selected Snapshot Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">File:</span>
                  <span className="font-bold text-slate-800">{selectedBackupForRestore.filename}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-800">{new Date(selectedBackupForRestore.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Size:</span>
                  <span className="text-slate-800">{selectedBackupForRestore.sizeFormatted}</span>
                </div>
              </div>

              {/* Safety Confirmation Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-semibold text-slate-700">
                  Type <strong className="text-rose-600 font-mono">RESTORE</strong> to confirm:
                </label>
                <input
                  type="text"
                  placeholder="RESTORE"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono uppercase tracking-wider text-slate-900 focus:outline-none focus:border-rose-600"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestoreModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={confirmInput.trim().toUpperCase() !== "RESTORE" || isRestoring}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 whitespace-nowrap"
                >
                  {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{isRestoring ? "Restoring Database..." : "Proceed with Restore"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: UPLOAD & RESTORE FROM LOCAL .JSON BACKUP FILE
          ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[#01390f]" />
                <h3 className="text-sm font-bold text-slate-900">Upload & Restore Database Backup</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#01390f] bg-slate-50/60 hover:bg-emerald-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer space-y-2"
              >
                <FileJson className="w-8 h-8 text-slate-400 mx-auto" />
                <span className="font-bold text-slate-700 text-xs block">
                  {uploadedFile ? uploadedFile.name : "Click to select a .JSON database backup file"}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Supports exported Mhira CRM JSON backup packages
                </span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".json,application/json"
                  className="hidden"
                />
              </div>

              {/* Uploaded Summary Preview */}
              {uploadPreviewData && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 animate-in fade-in">
                  <span className="font-bold text-[#01390f] text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Valid Backup Package Detected
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-950 pt-1">
                    <div>Collections: <strong>{uploadPreviewData.collectionsCount}</strong></div>
                    <div>Total Records: <strong>{uploadPreviewData.totalRecords.toLocaleString()}</strong></div>
                    <div>Created Date: <strong>{new Date(uploadPreviewData.timestamp).toLocaleDateString()}</strong></div>
                    <div>Version: <strong>{uploadPreviewData.version}</strong></div>
                  </div>
                </div>
              )}

              {/* Verification Input */}
              {uploadPreviewData && (
                <div className="space-y-1.5 pt-1">
                  <label className="block font-semibold text-slate-700">
                    Type <strong className="text-rose-600 font-mono">RESTORE</strong> to confirm upload overwrite:
                  </label>
                  <input
                    type="text"
                    placeholder="RESTORE"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 font-mono uppercase tracking-wider text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestoreFromUpload}
                  disabled={!uploadPreviewData || confirmInput.trim().toUpperCase() !== "RESTORE" || isRestoring}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 whitespace-nowrap"
                >
                  {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{isRestoring ? "Restoring Uploaded Database..." : "Restore Uploaded Backup"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDataBackup;
