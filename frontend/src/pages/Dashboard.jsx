import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

// Layout Components
import Sidebar from "../components/layout/Sidebar";
import PageHeader from "../components/layout/PageHeader";
import DashboardTopbar from "../components/layout/DashboardTopbar";

// Role Dashboard Components
import AdminDashboard from "../components/dashboard/AdminDashboard";
import MarketingDashboard from "../components/dashboard/MarketingDashboard";
import InventoryDashboard from "../components/dashboard/InventoryDashboard";
import LogisticDashboard from "../components/dashboard/LogisticDashboard";

// Feature Components - Admin (Strictly Restricted to User Management, User Activity, System Settings, Reports, Backup & Restore)
import AdminUserActivity from "../components/AdminUserActivity";
import AdminUserManagement from "../components/AdminUserManagement";
import AdminSystemMaintenance from "../components/AdminSystemMaintenance";
import AdminReports from "../components/AdminReports";
import AdminDataBackup from "../components/AdminDataBackup";
import AdminAppearance from "../components/AdminAppearance";
import AdminFormulaAccess from "../components/AdminFormulaAccess";
import { getRoleTheme, normalizeRole as normalizeThemeRole, getRoleFromTab, syncThemesFromBackend, applyRoleThemeToRoot } from "../utils/themeManager";
import { subscribeLiveSync } from "../utils/liveSync";

// Feature Components - Inventory
import InventoryExpiryMonitoring from "../components/InventoryExpiryMonitoring";
import InventoryDeliveryReceiving from "../components/InventoryDeliveryReceiving";
import InventoryFinishedGoods from "../components/InventoryFinishedGoods";
import InventoryRawMaterials from "../components/InventoryRawMaterials";
import InventorySuppliers from "../components/InventorySuppliers";
import InventoryWIP from "../components/InventoryWIP";
import InventoryReports from "../components/InventoryReports";

// Feature Components - Logistics
import LogisticsPerformanceAnalytics from "../components/LogisticsPerformanceAnalytics";
import LogisticsOrderManagement from "../components/LogisticsOrderManagement";
import LogisticsReturnManagement from "../components/LogisticsReturnManagement";
import LogisticsSupportCenter from "../components/LogisticsSupportCenter";
import LogisticsShippingSetting from "../components/LogisticsShippingSetting";
import InventoryPurchaseRequest from "../components/InventoryPurchaseRequest";
import LogisticReports from "../components/LogisticReports";

// Feature Components - Marketing
import MarketingAllProductsCatalog from "../components/MarketingAllProductsCatalog";
import MarketingEventsManagement from "../components/MarketingEventsManagement";
import MarketingCustomerFeedback from "../components/MarketingCustomerFeedback";
import MarketingPromotions from "../components/MarketingPromotions";
import MarketingMarketingContent from "../components/MarketingMarketingContent";
import MarketingReports from "../components/MarketingReports";
import MarketingEmailCampaigns from "../components/MarketingEmailCampaigns";
import MarketingOurStoryManagement from "../components/MarketingOurStoryManagement";

// User Profile Settings Component
import Settings from "../components/layout/Settings";
import UserManual from "../components/UserManual";

function Dashboard() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  let currentUser = null;
  try {
    currentUser = storedUser ? JSON.parse(storedUser) : null;
  } catch (e) {
    currentUser = null;
  }

  const normalizeRole = (role) => {
    if (!role) return "Admin";
    const r = String(role).trim().toLowerCase();
    if (r.includes("invent")) return "Inventory";
    if (r.includes("logis")) return "Logistic";
    if (r.includes("market")) return "Marketing";
    if (r.includes("admin") || r.includes("super")) return "Admin";
    return role;
  };

  const userRole = normalizeRole(currentUser?.role || "Customer");

  // Strict allowed tabs per user role
  const allowedTabsByRole = {
    Admin: [
      "admin-dashboard",
      "admin-users",
      "admin-activity",
      "admin-formula-access",
      "system-settings",
      "admin-appearance",
      "admin-database",
      "admin-reports",
      "user-manual",
      "settings",
      // Logistics
      "logistic-dashboard",
      "sales-orders",
      "sales-analytics",
      "sales-returns",
      "sales-support",
      "logistic-reports",
      // Inventory
      "inventory-dashboard",
      "inv-products",
      "inv-rawmat",
      "inv-supplier",
      "inv-wip",
      "inv-inbound",
      "material-requests",
      "inv-material-requests",
      "inv-expiry",
      "inv-reports",
      // Marketing
      "marketing-dashboard",
      "product-catalog",
      "announcement",
      "customer-feedback",
      "coupons",
      "advertisement",
      "marketing-notification-desk",
      "marketing-reports",
    ],
    Logistic: [
      "logistic-dashboard",
      "sales-orders",
      "sales-analytics",
      "sales-returns",
      "sales-support",
      "shipping-rates",
      "logistic-shipping-settings",
      "logistic-reports",
      "user-manual",
      "settings"
    ],
    Inventory: [
      "inventory-dashboard",
      "inv-products",
      "inv-rawmat",
      "inv-supplier",
      "inv-wip",
      "inv-inbound",
      "material-requests",
      "inv-material-requests",
      "inv-expiry",
      "inv-reports",
      "user-manual",
      "settings"
    ],
    Marketing: [
      "marketing-dashboard",
      "product-catalog",
      "announcement",
      "customer-feedback",
      "coupons",
      "advertisement",
      "marketing-notification-desk",
      "marketing-reports",
      "marketing-our-story",
      "user-manual",
      "settings"
    ]
  };

  const isTabAllowedForRole = (role, tab) => {
    const normalized = normalizeRole(role);
    // Super-Admin Access: Admin has full access to all department tabs & modules
    if (normalized === "Admin") return true;
    const allowed = allowedTabsByRole[normalized] || [];
    return allowed.includes(tab);
  };

  const getDefaultTabForRole = (role) => {
    const normalized = normalizeRole(role);
    switch (normalized) {
      case "Inventory":
        return "inventory-dashboard";
      case "Logistic":
        return "logistic-dashboard";
      case "Marketing":
        return "marketing-dashboard";
      case "Admin":
      default:
        return "admin-dashboard";
    }
  };

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const target = localStorage.getItem("dashboard_target_tab");
      if (target) {
        localStorage.removeItem("dashboard_target_tab");
        return target;
      }
    } catch (e) {}
    return getDefaultTabForRole(userRole);
  });

  // Determine effective department role (for Admin browsing across departments, or staff member locked in role)
  const effectiveRole = userRole === "Admin" ? (getRoleFromTab(activeTab) || "Admin") : userRole;
  const [roleTheme, setRoleTheme] = useState(() => getRoleTheme(effectiveRole));

  useEffect(() => {
    const theme = getRoleTheme(effectiveRole);
    setRoleTheme(theme);
    applyRoleThemeToRoot(effectiveRole);
  }, [effectiveRole]);

  useEffect(() => {
    syncThemesFromBackend().catch(() => {});

    const handleAppearanceUpdate = (e) => {
      const themes = e.detail;
      if (themes) {
        const norm = normalizeThemeRole(effectiveRole);
        if (themes[norm]) {
          setRoleTheme(themes[norm]);
          applyRoleThemeToRoot(effectiveRole);
        }
      } else {
        const current = getRoleTheme(effectiveRole);
        setRoleTheme(current);
        applyRoleThemeToRoot(effectiveRole);
      }
    };

    const unsubLiveSync = subscribeLiveSync((event) => {
      if (event?.type === "appearance" && event?.payload) {
        const norm = normalizeThemeRole(effectiveRole);
        if (event.payload[norm]) {
          setRoleTheme(event.payload[norm]);
          applyRoleThemeToRoot(effectiveRole);
        }
      }
    });

    window.addEventListener("appearanceUpdated", handleAppearanceUpdate);
    window.addEventListener("storage", handleAppearanceUpdate);
    return () => {
      window.removeEventListener("appearanceUpdated", handleAppearanceUpdate);
      window.removeEventListener("storage", handleAppearanceUpdate);
      unsubLiveSync();
    };
  }, [effectiveRole]);

  useEffect(() => {
    // 1. If not logged in, redirect to Login
    if (!token || !currentUser) {
      navigate("/login");
      return;
    }

    // 2. If Customer, restrict access to Dashboard and redirect to Home ("/")
    if (userRole === "Customer") {
      navigate("/");
      return;
    }

    // 3. Auto fallback if activeTab is not allowed for the user's role
    if (!isTabAllowedForRole(userRole, activeTab)) {
      setActiveTab(getDefaultTabForRole(userRole));
    }
  }, [token, currentUser, userRole, activeTab, navigate]);

  useEffect(() => {
    const handleNavigateTab = (e) => {
      if (e?.detail) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener("navigateToTab", handleNavigateTab);
    return () => window.removeEventListener("navigateToTab", handleNavigateTab);
  }, []);

  const renderContent = () => {
    // Check strict role restriction
    if (!isTabAllowedForRole(userRole, activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-rose-100 shadow-xs text-center my-6 font-sans">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Access Restricted</h2>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            You do not have permission to access this module. Your current role (<span className="font-bold text-rose-600">{userRole}</span>) is restricted from viewing this tab.
          </p>
          <button
            type="button"
            onClick={() => setActiveTab(getDefaultTabForRole(userRole))}
            className="px-5 py-2.5 bg-[#1D6E9C] hover:bg-[#0E4A6B] text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer shadow-xs"
          >
            Go to Authorized Dashboard
          </button>
        </div>
      );
    }

    switch (activeTab) {
      // Role Dashboard Landings
      case "admin-dashboard":
        return <AdminDashboard setActiveTab={setActiveTab} />;
      case "marketing-dashboard":
        return <MarketingDashboard setActiveTab={setActiveTab} />;
      case "inventory-dashboard":
        return <InventoryDashboard setActiveTab={setActiveTab} />;
      case "logistic-dashboard":
        return <LogisticDashboard setActiveTab={setActiveTab} />;

      // Admin Components
      case "admin-users":
        return <AdminUserManagement />;
      case "admin-activity":
        return <AdminUserActivity />;
      case "admin-formula-access":
        return <AdminFormulaAccess />;
      case "system-settings":
        return <AdminSystemMaintenance />;
      case "admin-appearance":
        return <AdminAppearance />;
      case "admin-database":
        return <AdminDataBackup />;
      case "admin-reports":
        return <AdminReports />;

      // Logistics / Sales
      case "sales-analytics":
        return <LogisticsPerformanceAnalytics />;
      case "sales-orders":
        return <LogisticsOrderManagement />;
      case "material-requests":
      case "inv-material-requests":
        return <InventoryPurchaseRequest />;
      case "sales-returns":
        return <LogisticsReturnManagement />;
      case "sales-support":
        return <LogisticsSupportCenter />;
      case "shipping-rates":
      case "logistic-shipping-settings":
        return <LogisticsShippingSetting />;
      case "logistic-reports":
        return <LogisticReports />;

      // Inventory
      case "inv-products":
        return <InventoryFinishedGoods />;
      case "inv-rawmat":
        return <InventoryRawMaterials />;
      case "inv-supplier":
        return <InventorySuppliers />;
      case "inv-inbound":
        return <InventoryDeliveryReceiving />;
      case "inv-wip":
        return <InventoryWIP />;
      case "inv-expiry":
        return <InventoryExpiryMonitoring />;
      case "inv-reports":
        return <InventoryReports />;

      // Marketing
      case "product-catalog":
        return <MarketingAllProductsCatalog />; 
      case "announcement":
        return <MarketingEventsManagement />;
      case "customer-feedback":
        return <MarketingCustomerFeedback />;
      case "coupons":
        return <MarketingPromotions />;
      case "advertisement":
        return <MarketingMarketingContent />;
      case "marketing-notification-desk":
        return <MarketingEmailCampaigns />;
      case "marketing-reports":
        return <MarketingReports />;
      case "marketing-our-story":
        return <MarketingOurStoryManagement />;

      // Global User Settings & User Manual
      case "user-manual":
        return <UserManual />;
      case "settings":
        return <Settings />;

      default:
        return <AdminDashboard setActiveTab={setActiveTab} />;
    }
  };

  // If customer or not logged in, render null while navigating
  if (!token || !currentUser || userRole === "Customer") {
    return null;
  }

  return (
    <div
      style={{
        "--role-solid": roleTheme?.solidColor || "#01390f",
        "--role-solid-hover": roleTheme?.solidHover || "#01250a",
        "--role-sidebar-hover": roleTheme?.sidebarHover || "#0a5219",
      }}
      className="crm-role-theme-wrapper flex min-h-screen bg-[#f5f6f7] text-slate-800 relative w-full overflow-x-hidden font-sans antialiased transition-colors duration-200"
    >
      {/* 1. SIDEBAR */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={effectiveRole} />

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 w-full">
        
        {/* TOPBAR */}
        <DashboardTopbar setActiveTab={setActiveTab} />

        {/* 3. MAIN CONTENT AREA */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto w-full overscroll-contain custom-scrollbar">
          <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased min-w-0 pb-12">
            
            {/* Page Header */}
            <PageHeader activeTab={activeTab} userRole={effectiveRole} />
            
            {/* Dynamic Content */}
            <div className="animate-fade-in w-full min-w-0">
              {renderContent()}
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}

export default Dashboard;