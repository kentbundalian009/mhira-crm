import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import API, { API_BASE_URL } from "./axios";
import { syncThemesFromBackend } from "./utils/themeManager";

// Maintenance Screen Component
import MaintenanceScreen from "./components/common/MaintenanceScreen";

// Auth & Internal Staff Dashboard Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyEmail from "./pages/VerifyEmail";
import Dashboard from "./pages/Dashboard";
import UserManual from "./pages/UserManual";

// Customer Storefront Components
import CustomerHome from "./components/customer/CustomerHome";
import CustomerAbout from "./components/customer/CustomerAbout";
import CustomerAccount from "./components/customer/CustomerAccount";
import CustomerCart from "./components/customer/CustomerCart";
import CustomerEvents from "./components/customer/CustomerEvents";
import CustomerNotifications from "./components/customer/CustomerNotifications";
import CustomerOrders from "./components/customer/CustomerOrders";
import CustomerOurCollection from "./components/customer/CustomerOurCollection";
import CustomerPackageSet from "./components/customer/CustomerPackageSet";
import CustomerProductDetail from "./components/customer/CustomerProductDetail";
import CustomerProductReviews from "./components/customer/CustomerProductReviews";
import Favorites from "./components/customer/Favorites";
import CustomerCheckout from "./components/customer/CustomerCheckout";
import CustomerContactAgent from "./components/customer/CustomerContactAgent";
import CustomerMhiraShoppers from "./components/customer/CustomerMhiraShoppers";

// Legal Documentation & Compliance Pages
import PrivacyPolicy from "./components/footer/PrivacyPolicy";
import TermsOfService from "./components/footer/TermsOfService";
import CookiePolicy from "./components/footer/CookiePolicy";
import ReturnRefundPolicy from "./components/footer/ReturnRefundPolicy";
import ShippingPolicy from "./components/footer/ShippingPolicy";
import PaymentTerms from "./components/footer/PaymentTerms";
import CookieConsentBanner from "./components/common/CookieConsentBanner";

// Error Boundary Component to prevent white screens and show actionable errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800 font-sans text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">!</div>
            <h2 className="text-lg font-bold text-[#243746]">Page Render Error</h2>
            <p className="text-xs text-slate-500">
              An unexpected display issue occurred. Clicking below will refresh the catalog state and restore the page.
            </p>
            <div className="p-3 bg-slate-100 rounded-lg text-left text-[11px] font-mono text-rose-600 overflow-x-auto max-h-32">
              {this.state.error?.message || "Unknown error"}
            </div>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("mhira_db_products");
                } catch (e) { }
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 bg-[#246C94] hover:bg-[#1D5777] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Global Maintenance Guard Wrapper
function MaintenanceGuard({ children }) {
  const location = useLocation();
  const [maintenance, setMaintenance] = useState({
    maintenanceMode: false,
    message: "",
    estimatedTime: "",
    contactEmail: "support@mhiracosmetics.ph",
  });
  const [turningOff, setTurningOff] = useState(false);

  // Check user role from localStorage
  const getUserRole = () => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) return "Customer";
      const user = JSON.parse(stored);
      const role = String(user?.role || "").trim().toLowerCase();
      if (role.includes("admin") || role.includes("super")) return "Admin";
      if (role.includes("invent")) return "Inventory";
      if (role.includes("logis")) return "Logistic";
      if (role.includes("market")) return "Marketing";
      return "Customer";
    } catch (e) {
      return "Customer";
    }
  };

  const userRole = getUserRole();

  const fetchMaintenanceStatus = useCallback(async () => {
    try {
      const res = await API.get("/api/system/maintenance");
      if (res.data?.success) {
        setMaintenance({
          maintenanceMode: Boolean(res.data.maintenanceMode),
          message: res.data.message || "",
          estimatedTime: res.data.estimatedTime || "",
          contactEmail: res.data.contactEmail || "support@mhiracosmetics.ph",
        });
      }
    } catch (err) {
      // Silent failover
    }
  }, []);

  useEffect(() => {
    // Initial sync of role themes from backend on startup
    syncThemesFromBackend().catch(() => {});
  }, []);

  useEffect(() => {
    fetchMaintenanceStatus();

    // Listen to real-time custom event
    const handleEvent = (e) => {
      if (e.detail) {
        setMaintenance((prev) => ({
          ...prev,
          maintenanceMode: Boolean(e.detail.maintenanceMode),
          message: e.detail.maintenanceMessage || prev.message,
          estimatedTime: e.detail.maintenanceEstimatedTime || prev.estimatedTime,
        }));
      }
    };

    window.addEventListener("maintenanceModeChanged", handleEvent);

    // Periodic check every 45s
    const interval = setInterval(fetchMaintenanceStatus, 45000);

    return () => {
      window.removeEventListener("maintenanceModeChanged", handleEvent);
      clearInterval(interval);
    };
  }, [fetchMaintenanceStatus]);

  // Quick action for Admin to turn off maintenance mode from the top banner
  const handleTurnOffMaintenance = async () => {
    try {
      setTurningOff(true);
      const res = await API.post("/api/system/maintenance", {
        maintenanceMode: false,
      });
      if (res.data?.success) {
        setMaintenance((prev) => ({ ...prev, maintenanceMode: false }));
        window.dispatchEvent(
          new CustomEvent("maintenanceModeChanged", {
            detail: { maintenanceMode: false },
          })
        );
      }
    } catch (e) {
      console.error("Error turning off maintenance:", e);
    } finally {
      setTurningOff(false);
    }
  };

  // If Maintenance Mode is active
  if (maintenance.maintenanceMode) {
    // Admin is completely exempt!
    if (userRole === "Admin") {
      return (
        <div className="relative">
          {/* Top Admin Sticky Notification Banner */}
          <div className="bg-rose-600 text-white text-xs font-semibold py-2 px-4 flex items-center justify-between z-50 sticky top-0 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              <span>
                🔴 <strong>System Maintenance Mode is Active:</strong> Public storefront and non-admin staff access is restricted.
              </span>
            </div>
            <button
              type="button"
              onClick={handleTurnOffMaintenance}
              disabled={turningOff}
              className="bg-white text-rose-700 hover:bg-rose-50 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            >
              {turningOff ? "Deactivating..." : "Turn Off Maintenance"}
            </button>
          </div>
          {children}
        </div>
      );
    }

    // Allow Admin & User Login/Password Reset/Verification/User Manual bypass route
    if (
      location.pathname === "/login" ||
      location.pathname === "/forgot-password" ||
      location.pathname === "/verify-email" ||
      location.pathname === "/user-manual" ||
      location.pathname === "/manual" ||
      location.pathname === "/help" ||
      location.pathname === "/documentation"
    ) {
      return children;
    }

    // All regular roles (Customer, Inventory, Marketing, Logistics, and unauthenticated visitors) see Maintenance Screen
    return (
      <MaintenanceScreen
        message={maintenance.message}
        estimatedTime={maintenance.estimatedTime}
        contactEmail={maintenance.contactEmail}
        onCheckStatus={fetchMaintenanceStatus}
      />
    );
  }

  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <MaintenanceGuard>
          <Routes>
            {/* Customer Storefront Routes */}
            <Route path="/" element={<CustomerHome />} />
            <Route path="/about" element={<CustomerAbout />} />
            <Route path="/account" element={<CustomerAccount initialTab="account" />} />
            <Route path="/settings" element={<CustomerAccount initialTab="account" />} />
            <Route path="/cart" element={<CustomerCart />} />
            <Route path="/checkout" element={<CustomerCheckout />} />
            <Route path="/events" element={<CustomerEvents />} />
            <Route path="/notifications" element={<CustomerNotifications />} />
            <Route path="/orders" element={<CustomerOrders />} />
            <Route path="/contact-agent" element={<CustomerContactAgent />} />
            <Route path="/customer/support-chat" element={<CustomerContactAgent />} />
            <Route path="/collection" element={<CustomerOurCollection />} />
            <Route path="/collection/:id" element={<CustomerProductDetail />} />
            <Route path="/collection/:id/reviews" element={<CustomerProductReviews />} />
            <Route path="/product/:id" element={<CustomerProductDetail />} />
            <Route path="/product/:id/reviews" element={<CustomerProductReviews />} />
            <Route path="/products/:id" element={<CustomerProductDetail />} />
            <Route path="/products/:id/reviews" element={<CustomerProductReviews />} />
            <Route path="/packages" element={<CustomerPackageSet />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/favorite" element={<Favorites />} />
            <Route path="/top-customers" element={<CustomerMhiraShoppers />} />
            <Route path="/mhira-shoppers" element={<CustomerMhiraShoppers />} />
            <Route path="/leaderboard" element={<CustomerMhiraShoppers />} />
            <Route path="/vip-club" element={<CustomerMhiraShoppers />} />

            {/* Legal & Regulatory Compliance Routes */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/terms-of-use" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/returns" element={<ReturnRefundPolicy />} />
            <Route path="/refund-policy" element={<ReturnRefundPolicy />} />
            <Route path="/return-policy" element={<ReturnRefundPolicy />} />
            <Route path="/shipping" element={<ShippingPolicy />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/payments" element={<PaymentTerms />} />
            <Route path="/payment-terms" element={<PaymentTerms />} />

            {/* System User Manual & Documentation Routes */}
            <Route path="/user-manual" element={<UserManual />} />
            <Route path="/manual" element={<UserManual />} />
            <Route path="/help" element={<UserManual />} />
            <Route path="/documentation" element={<UserManual />} />

            {/* Auth & Internal Staff Dashboard */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </MaintenanceGuard>

        {/* Global Philippine Data Privacy Act (RA 10173) Cookie Consent Banner */}
        <CookieConsentBanner />

      </Router>
    </ErrorBoundary>
  );
}

export default App;