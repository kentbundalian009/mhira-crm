import React, { useState, useEffect, useMemo } from "react";
import {
  Palette,
  Shield,
  ShieldCheck,
  Boxes,
  Truck,
  Megaphone,
  Check,
  RotateCcw,
  Sparkles,
  Copy,
  Eye,
  Save,
  Layers,
  Shuffle,
  Sliders,
  LayoutDashboard,
  Package,
  Activity,
  FileSpreadsheet,
  MousePointer,
  Table as TableIcon,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  ArrowRight,
  Loader2
} from "lucide-react";
import {
  STAFF_ROLES,
  DEFAULT_ROLE_THEMES,
  GRADIENT_PRESETS,
  SOLID_COLOR_PRESETS,
  SOLID_HOVER_PRESETS,
  ensureGradient,
  ensureSolidColor,
  ensureHover,
  adjustBrightness,
  getAllRoleThemes,
  saveAllRoleThemes,
  resetAllRoleThemes,
  syncThemesFromBackend
} from "../utils/themeManager";
import { showSuccessToast, showErrorToast } from "../utils/toast";

const ROLE_META = {
  Inventory: {
    icon: Boxes,
    title: "Inventory Storefront",
    roleKey: "Inventory",
    department: "Warehouse & Raw Materials",
    description: "Finished products, raw stock, supplier logging, inbound receiving, and FEFO expiry tracking.",
    colorBadge: "bg-teal-50 text-teal-800 border-teal-200",
    menuItems: [
      { name: "Dashboard", icon: LayoutDashboard, active: true },
      { name: "Finished Goods", icon: Package },
      { name: "Raw Materials", icon: Layers },
      { name: "Inbound Receiving", icon: Boxes },
      { name: "Inventory Reports", icon: FileSpreadsheet }
    ]
  },
  Marketing: {
    icon: Megaphone,
    title: "Marketing Storefront",
    roleKey: "Marketing",
    department: "Storefront & Promotions",
    description: "Storefront promotions, catalog listings, discount vouchers, announcements, and CMS content.",
    colorBadge: "bg-purple-50 text-purple-800 border-purple-200",
    menuItems: [
      { name: "Dashboard", icon: LayoutDashboard, active: true },
      { name: "Product Catalog", icon: Package },
      { name: "Promotions & Vouchers", icon: Layers },
      { name: "Announcements", icon: Activity },
      { name: "Marketing Reports", icon: FileSpreadsheet }
    ]
  },
  Logistics: {
    icon: Truck,
    title: "Logistics Storefront",
    roleKey: "Logistics",
    department: "Fulfillment & Orders",
    description: "Customer sales orders, dispatches, returns processing, and courier logistics.",
    colorBadge: "bg-blue-50 text-blue-800 border-blue-200",
    menuItems: [
      { name: "Dashboard", icon: LayoutDashboard, active: true },
      { name: "Order Management", icon: Package },
      { name: "Return Processing", icon: Layers },
      { name: "Support Center", icon: Activity },
      { name: "Logistics Reports", icon: FileSpreadsheet }
    ]
  },
  Admin: {
    icon: ShieldCheck,
    title: "Admin Storefront",
    roleKey: "Admin",
    department: "System & Core Administration",
    description: "System maintenance, user access control, security audits, and backups.",
    colorBadge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    menuItems: [
      { name: "Dashboard", icon: LayoutDashboard, active: true },
      { name: "User Management", icon: Shield },
      { name: "User Activity", icon: Activity },
      { name: "System Maintenance", icon: Layers },
      { name: "Reports", icon: FileSpreadsheet }
    ]
  }
};

const DISPLAY_ROLES = ["Inventory", "Marketing", "Logistics", "Admin"];

const DIRECTIONS = [
  { id: "90deg", label: "Horizontal Right", css: "90deg", icon: "→" },
  { id: "180deg", label: "Vertical Down", css: "180deg", icon: "↓" },
  { id: "135deg", label: "Diagonal Down", css: "135deg", icon: "↘" },
  { id: "45deg", label: "Diagonal Up", css: "45deg", icon: "↗" },
  { id: "radial", label: "Radial Flare", css: "circle at center", icon: "◎" }
];

function AdminAppearance() {
  const [selectedRole, setSelectedRole] = useState("Admin");
  const [activeTarget, setActiveTarget] = useState("solid"); // 'sidebar', 'header', 'solid', 'hover', 'both'
  const [allThemes, setAllThemes] = useState(() => getAllRoleThemes());
  const [isSaving, setIsSaving] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Custom Gradient Builder State for the selected role
  const [customAngle, setCustomAngle] = useState("135deg");
  const [colorStart, setColorStart] = useState("#012b0b");
  const [colorMiddle, setColorMiddle] = useState("#01390f");
  const [colorEnd, setColorEnd] = useState("#0a5219");
  const [enableMiddleColor, setEnableMiddleColor] = useState(true);

  // Initial backend sync
  useEffect(() => {
    syncThemesFromBackend().then((synced) => {
      if (synced) {
        setAllThemes(synced);
      }
    });

    const handleUpdate = (e) => {
      if (e.detail) {
        setAllThemes(e.detail);
      }
    };
    window.addEventListener("appearanceUpdated", handleUpdate);
    return () => window.removeEventListener("appearanceUpdated", handleUpdate);
  }, []);

  const currentRoleTheme = useMemo(() => {
    return allThemes[selectedRole] || DEFAULT_ROLE_THEMES[selectedRole];
  }, [allThemes, selectedRole]);

  // Parse gradient or solid string to seed color pickers
  const parseGradientToColors = (gradientStr) => {
    if (!gradientStr) return;
    const hexMatches = gradientStr.match(/#[a-fA-F0-9]{3,6}/g);
    if (hexMatches && hexMatches.length >= 2) {
      setColorStart(hexMatches[0]);
      if (hexMatches.length >= 3) {
        setColorMiddle(hexMatches[1]);
        setColorEnd(hexMatches[2]);
        setEnableMiddleColor(true);
      } else {
        setColorEnd(hexMatches[1]);
        setEnableMiddleColor(false);
      }
    } else if (hexMatches && hexMatches.length === 1) {
      setColorStart(hexMatches[0]);
      setColorMiddle(hexMatches[0]);
      setColorEnd(hexMatches[0]);
    }
  };

  // When changing role or target, update gradient customizer defaults
  useEffect(() => {
    let targetVal = currentRoleTheme.sidebarGradient;
    if (activeTarget === "header") {
      targetVal = currentRoleTheme.headerGradient;
    } else if (activeTarget === "solid") {
      targetVal = currentRoleTheme.solidColor || "#01390f";
    } else if (activeTarget === "hover") {
      targetVal = currentRoleTheme.sidebarHover || "#0a5219";
    }
    parseGradientToColors(targetVal);
  }, [selectedRole, activeTarget, currentRoleTheme]);

  // Construct gradient string strictly ensuring it is NEVER a flat solid color
  const generateGradientString = (angle, start, middle, end, useMiddle) => {
    let s = start || "#012b0b";
    let e = end || "#0a5219";
    if (s.toLowerCase() === e.toLowerCase()) {
      e = s + "cc";
    }

    if (angle === "circle at center") {
      if (useMiddle && middle) {
        return `radial-gradient(circle at center, ${s} 0%, ${middle} 55%, ${e} 100%)`;
      }
      return `radial-gradient(circle at center, ${s} 0%, ${e} 100%)`;
    }

    if (useMiddle && middle) {
      return `linear-gradient(${angle}, ${s} 0%, ${middle} 50%, ${e} 100%)`;
    }
    return `linear-gradient(${angle}, ${s} 0%, ${e} 100%)`;
  };

  // Helper to apply gradient or solid color to target
  const applyTargetValue = (val) => {
    setAllThemes((prev) => {
      const roleCopy = { ...(prev[selectedRole] || DEFAULT_ROLE_THEMES[selectedRole]) };
      if (activeTarget === "sidebar" || activeTarget === "both") {
        roleCopy.sidebarGradient = ensureGradient(val);
      }
      if (activeTarget === "header" || activeTarget === "both") {
        roleCopy.headerGradient = ensureGradient(val);
      }
      if (activeTarget === "solid") {
        roleCopy.solidColor = ensureSolidColor(val);
        roleCopy.solidHover = adjustBrightness(val, -15);
      }
      if (activeTarget === "hover") {
        roleCopy.sidebarHover = ensureHover(val);
      }
      return {
        ...prev,
        [selectedRole]: roleCopy
      };
    });
    setHasUnsavedChanges(true);
  };

  // Apply custom builder gradient to current role
  const handleApplyCustomGradient = () => {
    if (activeTarget === "solid" || activeTarget === "hover") {
      applyTargetValue(colorStart);
      showSuccessToast(`Applied solid color ${colorStart} to ${activeTarget === "solid" ? "Buttons & Tables" : "Sidebar Hover"}!`);
    } else {
      const newGradient = generateGradientString(
        customAngle,
        colorStart,
        colorMiddle,
        colorEnd,
        enableMiddleColor
      );
      applyTargetValue(newGradient);
      showSuccessToast(`Applied custom gradient to ${selectedRole} ${activeTarget}!`);
    }
  };

  // Select Preset handler
  const handleSelectPreset = (preset) => {
    if (activeTarget === "solid") {
      applyTargetValue(preset.hex);
      setColorStart(preset.hex);
      showSuccessToast(`Applied solid color: ${preset.name}`);
    } else if (activeTarget === "hover") {
      applyTargetValue(preset.hex);
      setColorStart(preset.hex);
      showSuccessToast(`Applied solid hover: ${preset.name}`);
    } else {
      setAllThemes((prev) => {
        const roleCopy = { ...(prev[selectedRole] || DEFAULT_ROLE_THEMES[selectedRole]) };
        if (activeTarget === "sidebar" || activeTarget === "both") {
          roleCopy.sidebarGradient = ensureGradient(preset.gradient);
        }
        if (activeTarget === "header" || activeTarget === "both") {
          roleCopy.headerGradient = ensureGradient(preset.gradient);
        }
        if (preset.solidColor) {
          roleCopy.solidColor = preset.solidColor;
          roleCopy.solidHover = preset.solidHover || adjustBrightness(preset.solidColor, -15);
        }
        if (preset.sidebarHover) {
          roleCopy.sidebarHover = preset.sidebarHover;
        }
        return {
          ...prev,
          [selectedRole]: roleCopy
        };
      });
      setHasUnsavedChanges(true);
      parseGradientToColors(preset.gradient);
      showSuccessToast(`Applied ${preset.name} (Sidebar, Header, Buttons, & Table Headers coordinated!)`);
    }
  };

  // Copy Sidebar gradient to Header
  const handleCopySidebarToHeader = () => {
    const sidebarGrad = currentRoleTheme.sidebarGradient;
    setAllThemes((prev) => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] || DEFAULT_ROLE_THEMES[selectedRole]),
        headerGradient: sidebarGrad
      }
    }));
    setHasUnsavedChanges(true);
    showSuccessToast(`Copied Sidebar gradient to Page Header for ${selectedRole}!`);
  };

  // Copy Header gradient to Sidebar
  const handleCopyHeaderToSidebar = () => {
    const headerGrad = currentRoleTheme.headerGradient;
    setAllThemes((prev) => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] || DEFAULT_ROLE_THEMES[selectedRole]),
        sidebarGradient: headerGrad
      }
    }));
    setHasUnsavedChanges(true);
    showSuccessToast(`Copied Page Header gradient to Sidebar for ${selectedRole}!`);
  };

  // Auto-Coordinate Solid Colors from Gradient
  const handleAutoCoordinateSolidColors = () => {
    const hexMatches = currentRoleTheme.sidebarGradient.match(/#[a-fA-F0-9]{3,6}/g) || [];
    const solidBase = hexMatches[1] || hexMatches[0] || "#01390f";
    const hoverBase = hexMatches[0] || adjustBrightness(solidBase, -20);

    setAllThemes((prev) => ({
      ...prev,
      [selectedRole]: {
        ...(prev[selectedRole] || DEFAULT_ROLE_THEMES[selectedRole]),
        solidColor: solidBase,
        solidHover: adjustBrightness(solidBase, -15),
        sidebarHover: hoverBase
      }
    }));
    setHasUnsavedChanges(true);
    showSuccessToast(`Buttons, table headers, and sidebar hover coordinated with ${selectedRole} theme!`);
  };

  // Copy current role's theme to all other roles
  const handleApplyToAllRoles = () => {
    const current = currentRoleTheme;
    setAllThemes((prev) => {
      const updated = { ...prev };
      STAFF_ROLES.forEach((r) => {
        updated[r] = {
          sidebarGradient: current.sidebarGradient,
          headerGradient: current.headerGradient,
          solidColor: current.solidColor,
          solidHover: current.solidHover,
          sidebarHover: current.sidebarHover
        };
      });
      return updated;
    });
    setHasUnsavedChanges(true);
    showSuccessToast(`Applied ${selectedRole} theme to ALL 4 staff roles!`);
  };

  // Random Harmonious Generator
  const handleRandomHarmonious = () => {
    if (activeTarget === "solid") {
      const randomSolid = SOLID_COLOR_PRESETS[Math.floor(Math.random() * SOLID_COLOR_PRESETS.length)];
      applyTargetValue(randomSolid.hex);
      setColorStart(randomSolid.hex);
      showSuccessToast(`Applied solid color: ${randomSolid.name}`);
    } else if (activeTarget === "hover") {
      const randomHover = SOLID_HOVER_PRESETS[Math.floor(Math.random() * SOLID_HOVER_PRESETS.length)];
      applyTargetValue(randomHover.hex);
      setColorStart(randomHover.hex);
      showSuccessToast(`Applied solid hover: ${randomHover.name}`);
    } else {
      const randomPreset = GRADIENT_PRESETS[Math.floor(Math.random() * GRADIENT_PRESETS.length)];
      handleSelectPreset(randomPreset);
    }
  };

  // Reset current role to default
  const handleResetCurrentRole = async () => {
    if (window.confirm(`Are you sure you want to reset appearance & solid theme for ${selectedRole} to brand defaults?`)) {
      const defaults = DEFAULT_ROLE_THEMES[selectedRole];
      setAllThemes((prev) => ({
        ...prev,
        [selectedRole]: JSON.parse(JSON.stringify(defaults))
      }));
      setHasUnsavedChanges(true);
      parseGradientToColors(defaults.sidebarGradient);
      showSuccessToast(`Reset ${selectedRole} gradients, buttons, & hover to default.`);
    }
  };

  // Reset all roles to default
  const handleResetAllRoles = async () => {
    if (window.confirm("Are you sure you want to reset ALL 4 staff roles to their default brand themes?")) {
      const reset = await resetAllRoleThemes();
      setAllThemes(reset);
      setHasUnsavedChanges(false);
      showSuccessToast("All staff role appearances reset to default!");
    }
  };

  // Save changes to storage and backend
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveAllRoleThemes(allThemes);
      setHasUnsavedChanges(false);
      showSuccessToast(`Appearance themes & button/table solid colors saved successfully!`);
    } catch (err) {
      console.error("Save error:", err);
      showErrorToast("Failed to save appearance settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const RoleIcon = ROLE_META[selectedRole].icon;

  const currentTargetValue = useMemo(() => {
    if (activeTarget === "header") return currentRoleTheme.headerGradient;
    if (activeTarget === "solid") return currentRoleTheme.solidColor || "#01390f";
    if (activeTarget === "hover") return currentRoleTheme.sidebarHover || "#0a5219";
    return currentRoleTheme.sidebarGradient;
  }, [activeTarget, currentRoleTheme]);

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      
      {/* 1. MAIN CARD CONTAINER (HOUSING EXCEL RIBBON TOOLBAR & STUDIO) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">
        
        {/* COMPACT EXCEL RIBBON TOOLBAR (SEAMLESS WHITE DESIGN) */}
        <div className="w-full bg-white flex flex-col">
          
          {/* TOP BAR: EXCEL SHEET TABS (ROLE SELECTION) */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 border-b border-slate-200">
            <div className="flex items-center gap-1 -mb-px overflow-x-auto no-scrollbar">
              {DISPLAY_ROLES.map((role) => {
                const meta = ROLE_META[role];
                const isSelected = selectedRole === role;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 whitespace-nowrap ${
                      isSelected
                        ? "border-[#01390f] text-[#01390f] bg-slate-50/80 rounded-t-lg font-bold shadow-2xs"
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg"
                    }`}
                  >
                    <span>{meta.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Unsaved Changes Indicator */}
            <div className="hidden md:flex items-center gap-2 py-1">
              {hasUnsavedChanges && (
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 rounded-full flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN 1-ROW NO-WRAP CONTROLS) */}
          <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap border-b border-slate-100">
            
            {/* GROUP 1: ACTIONS (Tall Save Button + Stacked Quick Actions) */}
            <div className="w-[230px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex items-stretch gap-1.5 flex-1">
                {/* Tall Full-Height Action Button: SAVE */}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-[82px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f] disabled:opacity-50"
                  title="Save Appearance & Theme Colors"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 text-[#01390f] animate-spin mb-1" />
                  ) : (
                    <Save className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.2} />
                  )}
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    {isSaving ? "Saving..." : "Save\nTheme"}
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-[130px] flex flex-col justify-between py-0.5 space-y-0.5">
                  {/* Layer 1: Sync to All Roles */}
                  <button
                    type="button"
                    onClick={handleApplyToAllRoles}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Apply current theme to all 4 staff roles"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Sync All Roles</span>
                  </button>

                  {/* Layer 2: Reset Current Role */}
                  <button
                    type="button"
                    onClick={handleResetCurrentRole}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title={`Reset ${selectedRole} to defaults`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Reset {selectedRole}</span>
                  </button>

                  {/* Layer 3: Reset All Roles */}
                  <button
                    type="button"
                    onClick={handleResetAllRoles}
                    className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Reset all staff roles to brand defaults"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">Reset All Defaults</span>
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Theme Actions
              </div>
            </div>

            {/* GROUP 2: TARGET ELEMENT SELECTOR */}
            <div className="w-[310px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex flex-col justify-between flex-1 py-0.5 gap-1">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTarget("solid")}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTarget === "solid"
                        ? "bg-[#01390f] text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span className="truncate">Buttons & Tables</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTarget("hover")}
                    className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeTarget === "hover"
                        ? "bg-[#01390f] text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <MousePointer className="w-3.5 h-3.5" />
                    <span className="truncate">Sidebar Hover</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTarget("sidebar")}
                    className={`px-1.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer truncate ${
                      activeTarget === "sidebar"
                        ? "bg-[#01390f] text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Sidebar Grad
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTarget("header")}
                    className={`px-1.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer truncate ${
                      activeTarget === "header"
                        ? "bg-[#01390f] text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Header Grad
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTarget("both")}
                    className={`px-1.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer truncate ${
                      activeTarget === "both"
                        ? "bg-[#01390f] text-white shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Both Grads
                  </button>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Target Element to Style
              </div>
            </div>

            {/* GROUP 3: QUICK HARMONIZERS & UTILITIES */}
            <div className="w-[210px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-0.5">
                {/* Auto Coordinate Solid Colors */}
                <button
                  type="button"
                  onClick={handleAutoCoordinateSolidColors}
                  className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-amber-50 text-slate-700 hover:text-amber-800 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                  title="Auto-extract button & hover colors from gradient"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Auto-Sync Solid</span>
                </button>

                {/* Sidebar -> Header */}
                <button
                  type="button"
                  onClick={handleCopySidebarToHeader}
                  className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                  title="Copy Sidebar Gradient to Page Header"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Sidebar → Header</span>
                </button>

                {/* Header -> Sidebar */}
                <button
                  type="button"
                  onClick={handleCopyHeaderToSidebar}
                  className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                  title="Copy Page Header Gradient to Sidebar"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Header → Sidebar</span>
                </button>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Harmonizers
              </div>
            </div>

            {/* GROUP 4: SHUFFLE & ACTIVE COLOR PILL */}
            <div className="flex-1 min-w-[200px] flex flex-col justify-between pl-1 min-h-[92px]">
              <div className="flex items-center justify-between gap-3 flex-1 py-0.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl shadow-xs border border-slate-200 shrink-0"
                    style={{ background: currentTargetValue }}
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                      Active: {activeTarget.toUpperCase()}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 block truncate">
                      {currentTargetValue}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRandomHarmonious}
                  className="px-3 py-2 text-xs font-bold text-[#01390f] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  title="Shuffle style randomly"
                >
                  <Shuffle className="w-3.5 h-3.5 text-[#01390f]" />
                  <span>Shuffle</span>
                </button>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Active Value & Shuffle
              </div>
            </div>

          </div>
        </div>

        {/* 2. DUAL-COLUMN WORKSPACE: LEFT = INTERACTIVE PREVIEW, RIGHT = COLOR STUDIO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: LIVE WORKSPACE PREVIEW (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col gap-3.5">
              
              {/* Preview Header & Controls */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-4 h-4 text-[#01390f] shrink-0" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">
                    Live Preview: {selectedRole} Layout
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewCollapsed(!previewCollapsed)}
                  className="text-[11px] font-semibold text-[#01390f] hover:text-[#012b0b] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {previewCollapsed ? "Expand Mini Nav" : "Collapse Mini Nav"}
                </button>
              </div>

              {/* PREVIEW CANVAS */}
              <div className="w-full bg-slate-100/90 rounded-2xl p-3 border border-slate-200/80 flex flex-col gap-3">
                
                {/* 1. MINI PAGE HEADER PREVIEW */}
                <div
                  style={{ background: currentRoleTheme.headerGradient }}
                  className="w-full rounded-xl p-3 text-white shadow-xs relative overflow-hidden transition-all duration-300"
                >
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
                  <div className="relative z-10 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white text-slate-800 flex items-center justify-center shrink-0 shadow-xs">
                      <RoleIcon className="w-3.5 h-3.5 text-slate-800" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold tracking-wide uppercase truncate">
                          {selectedRole} Portal
                        </span>
                        <span className="px-1.5 py-0.2 bg-white/20 text-[9px] rounded-full font-bold">
                          Staff
                        </span>
                      </div>
                      <p className="text-[10px] text-white/80 truncate max-w-[220px]">
                        {ROLE_META[selectedRole].description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. MINI SIDEBAR + MAIN CONTENT PREVIEW */}
                <div className="flex gap-2.5 flex-1 min-h-[290px]">
                  
                  {/* MINI SIDEBAR */}
                  <div
                    style={{ background: currentRoleTheme.sidebarGradient }}
                    className={`rounded-xl p-2.5 text-white shadow-xs flex flex-col transition-all duration-300 relative overflow-hidden ${
                      previewCollapsed ? "w-14 items-center" : "w-44"
                    }`}
                  >
                    {/* Scoped Hover Style for Mini Sidebar */}
                    <style>{`
                      .mini-nav-item:not(.active):hover {
                        background: ${currentRoleTheme.sidebarHover || "#0a5219"} !important;
                      }
                    `}</style>

                    <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

                    {/* Logo Brand Header */}
                    <div className="flex items-center gap-2 pb-2.5 mb-2 border-b border-white/15 w-full">
                      <div className="w-6 h-6 rounded-full bg-white p-0.5 shrink-0 flex items-center justify-center shadow-2xs">
                        <img
                          src="/mhira_removebg.png"
                          alt="Logo"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                      {!previewCollapsed && (
                        <div className="min-w-0 truncate">
                          <span className="font-extrabold text-[10px] tracking-wider block leading-tight">
                            MHIRA CRMS
                          </span>
                          <span className="text-[8px] text-white/70 block leading-tight">
                            {selectedRole} View
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Nav items with REAL dynamic hover */}
                    <div className="flex flex-col gap-1 w-full flex-1">
                      {ROLE_META[selectedRole].menuItems.map((item, idx) => {
                        const ItemIcon = item.icon;
                        return (
                          <div
                            key={idx}
                            title={!item.active ? "Hover to preview solid hover color!" : "Active tab"}
                            className={`mini-nav-item flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                              item.active
                                ? "active bg-white text-slate-900 font-bold shadow-xs"
                                : "text-white/85"
                            } ${previewCollapsed ? "justify-center" : ""}`}
                          >
                            <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                            {!previewCollapsed && (
                              <span className="truncate">{item.name}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Hover Demonstration Chip */}
                    {!previewCollapsed && (
                      <div className="pt-2 border-t border-white/15 mt-auto">
                        <div className="text-[8px] text-white/60 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <MousePointer className="w-2.5 h-2.5" />
                          Hover Color:
                        </div>
                        <div
                          style={{ background: currentRoleTheme.sidebarHover || "#0a5219" }}
                          className="px-2 py-1 rounded-md text-[9px] font-semibold text-white truncate shadow-2xs text-center border border-white/15"
                        >
                          Solid Hover
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MINI CONTENT CANVAS WITH REAL BUTTONS & TABLE HEADERS */}
                  <div className="flex-1 bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs flex flex-col justify-between gap-3">
                    <div className="flex flex-col gap-2.5">
                      
                      {/* BUTTON UI DEMO */}
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Button UI & Pill</span>
                        <span className="text-[8px] font-mono text-slate-400 font-semibold">{currentRoleTheme.solidColor || "#01390f"}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          style={{ background: currentRoleTheme.solidColor || "#01390f" }}
                          className="px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold text-white shadow-xs flex items-center gap-1 cursor-pointer transition-transform hover:scale-102"
                        >
                          <span>+ Action Button</span>
                        </button>
                        <div
                          style={{ background: currentRoleTheme.solidColor || "#01390f" }}
                          className="px-2 py-1 rounded-md text-[8.5px] font-bold text-white shadow-2xs"
                        >
                          Active Filter
                        </div>
                      </div>

                      {/* TABLE HEADER DEMO */}
                      <div className="mt-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <TableIcon className="w-3 h-3 text-slate-400" />
                            Table Header UI
                          </span>
                        </div>
                        <div
                          style={{ background: currentRoleTheme.solidColor || "#01390f" }}
                          className="w-full text-white font-bold text-[8.5px] uppercase tracking-wider py-1.5 px-2 rounded-t-lg flex items-center justify-between shadow-2xs"
                        >
                          <span>PROMO CODE</span>
                          <span>DISCOUNT</span>
                          <span className="text-right">ACTION</span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 border-t-0 rounded-b-lg p-1.5 text-[8.5px] text-slate-700 flex justify-between font-mono">
                          <span className="font-bold">SUMMERGLOW</span>
                          <span>20% OFF</span>
                          <span className="text-emerald-600 font-bold">Active</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[9px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-200/70 text-center font-medium">
                      Buttons, Filter Pills, and Table Headers automatically match this solid color!
                    </div>
                  </div>
                </div>
              </div>

              {/* Swatch Breakdown Cards */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase truncate">Sidebar Grad</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0" style={{ background: currentRoleTheme.sidebarGradient }} />
                    <span className="text-[10px] font-mono text-slate-700 truncate font-semibold">Active</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase truncate">Solid Buttons</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0" style={{ background: currentRoleTheme.solidColor || "#01390f" }} />
                    <span className="text-[10px] font-mono text-slate-700 truncate font-semibold">{currentRoleTheme.solidColor || "#01390f"}</span>
                  </div>
                </div>
                <div className="p-2 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col gap-0.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase truncate">Solid Hover</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0" style={{ background: currentRoleTheme.sidebarHover || "#0a5219" }} />
                    <span className="text-[10px] font-mono text-slate-700 truncate font-semibold">{currentRoleTheme.sidebarHover || "#0a5219"}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN: PALETTES & COLOR STUDIO (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            
            {/* 1. CURATED PRESETS */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col gap-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {activeTarget === "solid"
                      ? "Curated Solid Colors for Buttons & Table Headers"
                      : activeTarget === "hover"
                      ? "Curated Solid Colors for Sidebar Hover"
                      : "Curated Rich Gradient Presets"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeTarget === "solid"
                      ? "Piliin ang solid color para sa mga action buttons, table headers, at filter pills"
                      : activeTarget === "hover"
                      ? "Piliin ang malinis na solid color kapag itinapat ang mouse sa sidebar buttons"
                      : "Piliin ang multi-tone corporate gradient para sa Sidebar at Page Header"}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md shrink-0">
                  {activeTarget === "solid" ? `${SOLID_COLOR_PRESETS.length} Tones` : activeTarget === "hover" ? `${SOLID_HOVER_PRESETS.length} Tones` : `${GRADIENT_PRESETS.length} Styles`}
                </span>
              </div>

              {/* If SOLID BUTTON/TABLES */}
              {activeTarget === "solid" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {SOLID_COLOR_PRESETS.map((preset) => {
                    const isActive = (currentRoleTheme.solidColor || "").toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 group ${
                          isActive
                            ? "border-[#01390f] bg-emerald-50/50 ring-2 ring-[#01390f]/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60"
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg shadow-2xs border border-slate-200/60 shrink-0 relative overflow-hidden"
                          style={{ background: preset.hex }}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {preset.hex}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* If SOLID SIDEBAR HOVER */}
              {activeTarget === "hover" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {SOLID_HOVER_PRESETS.map((preset) => {
                    const isActive = (currentRoleTheme.sidebarHover || "").toLowerCase() === preset.hex.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 group ${
                          isActive
                            ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60"
                        }`}
                      >
                        <div
                          className="w-7 h-7 rounded-lg shadow-2xs border border-slate-200/60 shrink-0 relative overflow-hidden"
                          style={{ background: preset.hex }}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {preset.hex}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* If GRADIENT (Sidebar / Header) */}
              {activeTarget !== "solid" && activeTarget !== "hover" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {GRADIENT_PRESETS.map((preset) => {
                    const isActive = currentTargetValue === preset.gradient;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-2 relative group ${
                          isActive
                            ? "border-[#01390f] bg-emerald-50/40 ring-2 ring-[#01390f]/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50"
                        }`}
                      >
                        <div
                          className="w-full h-8 rounded-lg shadow-2xs border border-slate-200/50 relative overflow-hidden"
                          style={{ background: preset.gradient }}
                        >
                          {isActive && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {preset.category}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. CUSTOM MULTI-STOP PALETTE STUDIO */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#01390f]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    {activeTarget === "solid"
                      ? "Custom Solid Color (Buttons & Tables)"
                      : activeTarget === "hover"
                      ? "Custom Solid Color (Sidebar Hover)"
                      : "Custom Multi-Stop Gradient Studio"}
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-[#01390f] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {activeTarget === "solid" || activeTarget === "hover" ? "Solid Tone Picker" : "Multi-Stop Engine"}
                </span>
              </div>

              {/* If Solid Color Mode */}
              {activeTarget === "solid" || activeTarget === "hover" ? (
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colorStart.startsWith("#") ? colorStart : "#01390f"}
                      onChange={(e) => {
                        setColorStart(e.target.value);
                        applyTargetValue(e.target.value);
                      }}
                      className="w-12 h-12 rounded-xl border border-slate-300 cursor-pointer p-0.5 bg-white shadow-xs shrink-0"
                    />
                    <div>
                      <label className="text-xs font-bold text-slate-700 block">
                        {activeTarget === "solid" ? "Primary Button & Table Solid Hex" : "Sidebar Button Hover Solid Hex"}
                      </label>
                      <input
                        type="text"
                        value={colorStart}
                        onChange={(e) => {
                          setColorStart(e.target.value);
                          if (e.target.value.length >= 7) {
                            applyTargetValue(e.target.value);
                          }
                        }}
                        className="mt-1 text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#01390f] w-36 shadow-2xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCustomGradient}
                    className="px-4 py-2 bg-[#01390f] hover:bg-[#01250a] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    Apply Color to {selectedRole}
                  </button>
                </div>
              ) : (
                /* If Gradient Mode */
                <>
                  {/* Flow Direction Selector */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-2 block">
                      Flow Direction / Orientation
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {DIRECTIONS.map((dir) => (
                        <button
                          key={dir.id}
                          type="button"
                          onClick={() => {
                            setCustomAngle(dir.css);
                            const grad = generateGradientString(
                              dir.css,
                              colorStart,
                              colorMiddle,
                              colorEnd,
                              enableMiddleColor
                            );
                            applyTargetValue(grad);
                          }}
                          className={`py-2 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            customAngle === dir.css
                              ? "bg-[#01390f] text-white border-[#01390f] shadow-xs"
                              : "bg-slate-50 hover:bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          <span className="text-sm font-bold">{dir.icon}</span>
                          <span className="text-[10px] truncate">{dir.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Stop Color Pickers (Start, Middle, End) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                    
                    {/* STOP 1: Start Tone */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        1. Start Tone
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorStart.startsWith("#") ? colorStart : "#012b0b"}
                          onChange={(e) => {
                            setColorStart(e.target.value);
                            const grad = generateGradientString(
                              customAngle,
                              e.target.value,
                              colorMiddle,
                              colorEnd,
                              enableMiddleColor
                            );
                            applyTargetValue(grad);
                          }}
                          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs shrink-0"
                        />
                        <input
                          type="text"
                          value={colorStart}
                          onChange={(e) => {
                            setColorStart(e.target.value);
                            if (e.target.value.length >= 7) {
                              const grad = generateGradientString(
                                customAngle,
                                e.target.value,
                                colorMiddle,
                                colorEnd,
                                enableMiddleColor
                              );
                              applyTargetValue(grad);
                            }
                          }}
                          className="w-full text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#01390f] shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* STOP 2: Middle Via Tone */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                          2. Middle Via
                        </span>
                        <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={enableMiddleColor}
                            onChange={(e) => {
                              setEnableMiddleColor(e.target.checked);
                              const grad = generateGradientString(
                                customAngle,
                                colorStart,
                                colorMiddle,
                                colorEnd,
                                e.target.checked
                              );
                              applyTargetValue(grad);
                            }}
                            className="rounded-xs text-[#01390f] focus:ring-[#01390f]"
                          />
                          Include
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          disabled={!enableMiddleColor}
                          value={colorMiddle.startsWith("#") ? colorMiddle : "#01390f"}
                          onChange={(e) => {
                            setColorMiddle(e.target.value);
                            const grad = generateGradientString(
                              customAngle,
                              colorStart,
                              e.target.value,
                              colorEnd,
                              enableMiddleColor
                            );
                            applyTargetValue(grad);
                          }}
                          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs shrink-0 disabled:opacity-40"
                        />
                        <input
                          type="text"
                          disabled={!enableMiddleColor}
                          value={colorMiddle}
                          onChange={(e) => {
                            setColorMiddle(e.target.value);
                            if (e.target.value.length >= 7) {
                              const grad = generateGradientString(
                                customAngle,
                                colorStart,
                                e.target.value,
                                colorEnd,
                                enableMiddleColor
                              );
                              applyTargetValue(grad);
                            }
                          }}
                          className="w-full text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#01390f] shadow-2xs disabled:opacity-40"
                        />
                      </div>
                    </div>

                    {/* STOP 3: End Tone */}
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        3. End Tone
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorEnd.startsWith("#") ? colorEnd : "#0a5219"}
                          onChange={(e) => {
                            setColorEnd(e.target.value);
                            const grad = generateGradientString(
                              customAngle,
                              colorStart,
                              colorMiddle,
                              e.target.value,
                              enableMiddleColor
                            );
                            applyTargetValue(grad);
                          }}
                          className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5 bg-white shadow-2xs shrink-0"
                        />
                        <input
                          type="text"
                          value={colorEnd}
                          onChange={(e) => {
                            setColorEnd(e.target.value);
                            if (e.target.value.length >= 7) {
                              const grad = generateGradientString(
                                customAngle,
                                colorStart,
                                colorMiddle,
                                e.target.value,
                                enableMiddleColor
                              );
                              applyTargetValue(grad);
                            }
                          }}
                          className="w-full text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#01390f] shadow-2xs"
                        />
                      </div>
                    </div>

                  </div>

                  {/* Apply Custom Palette Action */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleApplyCustomGradient}
                      className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center gap-2 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Apply Custom Palette to {selectedRole}
                    </button>

                    <button
                      type="button"
                      onClick={handleApplyToAllRoles}
                      className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap flex items-center gap-1.5"
                      title="Copy current theme across Admin, Inventory, Logistics, and Marketing"
                    >
                      <Layers className="w-3.5 h-3.5 text-[#01390f]" />
                      Sync This Theme to All Roles
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default AdminAppearance;
