import React, { useEffect } from "react";
import toast, { useToasterStore } from "react-hot-toast";
import { Check, X as ErrorIcon, Info, AlertTriangle } from "lucide-react";

/**
 * Global Toast Limiter Component
 * Ensures at most `limit` (default 3) toasts can be visible simultaneously.
 * Excess / older toasts are automatically dismissed immediately when spamming occurs.
 */
export const ToastLimiter = ({ limit = 3 }) => {
  const { toasts } = useToasterStore();

  useEffect(() => {
    toasts
      .filter((t) => t.visible)
      .filter((_, i) => i >= limit)
      .forEach((t) => toast.dismiss(t.id));
  }, [toasts, limit]);

  return null;
};

/**
 * Intelligent Role-Aware Toast UI
 * - Admin, Inventory, Marketing, Logistics & Staff -> Top-Right
 * - Customer / Storefront View -> Bottom-Center (Floating Pill)
 * - Removed close "X" button for clean, distraction-free modern look
 */

export const isStaffRole = () => {
  try {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      const role = String(parsed.role || parsed.position || "").toLowerCase().trim();
      const staffRoles = [
        "admin",
        "inventory",
        "marketing",
        "logistics",
        "production",
        "sales",
        "finance",
        "hr",
        "manager",
        "staff",
        "superadmin",
      ];
      if (staffRoles.includes(role)) return true;
    }
  } catch (e) {}

  if (typeof window !== "undefined" && window.location) {
    const path = window.location.pathname.toLowerCase();
    const staffPaths = [
      "/dashboard",
      "/admin",
      "/logistics",
      "/inventory",
      "/marketing",
      "/sales-report",
      "/settings",
      "/wip",
      "/users",
      "/pos",
      "/finance",
      "/audit",
    ];
    if (staffPaths.some((p) => path.startsWith(p))) return true;
  }

  return false;
};

const getToastConfig = () => {
  const isStaff = isStaffRole();
  return {
    position: isStaff ? "top-right" : "bottom-center",
    isStaff,
  };
};

export const showSuccessToast = (message, options = {}) => {
  const { position, isStaff } = getToastConfig();
  return toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 bg-white/95 backdrop-blur-md text-[#243746] px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-xl border border-[#E1E9EF] ring-1 ring-black/5 max-w-sm sm:max-w-md w-full font-poppins antialiased transition-all duration-300 ${
          isStaff
            ? t.visible
              ? "animate-in fade-in slide-in-from-top-4 duration-300"
              : "animate-out fade-out slide-out-to-top-4 duration-200"
            : t.visible
            ? "animate-in fade-in slide-in-from-bottom-4 duration-300"
            : "animate-out fade-out slide-out-to-bottom-4 duration-200"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-[#01390f] flex items-center justify-center shrink-0 shadow-xs">
          <Check className="w-3.5 h-3.5 text-white stroke-[2.8]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-[13px] font-semibold text-[#243746] leading-snug block">
            {message}
          </span>
        </div>
      </div>
    ),
    {
      position,
      duration: 2500,
      ...options,
    }
  );
};

export const showErrorToast = (message, options = {}) => {
  const { position, isStaff } = getToastConfig();
  return toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 bg-white/95 backdrop-blur-md text-[#243746] px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-xl border border-[#E1E9EF] ring-1 ring-black/5 max-w-sm sm:max-w-md w-full font-poppins antialiased transition-all duration-300 ${
          isStaff
            ? t.visible
              ? "animate-in fade-in slide-in-from-top-4 duration-300"
              : "animate-out fade-out slide-out-to-top-4 duration-200"
            : t.visible
            ? "animate-in fade-in slide-in-from-bottom-4 duration-300"
            : "animate-out fade-out slide-out-to-bottom-4 duration-200"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-[#8b1818] flex items-center justify-center shrink-0 shadow-xs">
          <ErrorIcon className="w-3.5 h-3.5 text-white stroke-[2.8]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-[13px] font-semibold text-[#243746] leading-snug block">
            {message}
          </span>
        </div>
      </div>
    ),
    {
      position,
      duration: 3000,
      ...options,
    }
  );
};

export const showInfoToast = (message, options = {}) => {
  const { position, isStaff } = getToastConfig();
  return toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 bg-white/95 backdrop-blur-md text-[#243746] px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-xl border border-[#E1E9EF] ring-1 ring-black/5 max-w-sm sm:max-w-md w-full font-poppins antialiased transition-all duration-300 ${
          isStaff
            ? t.visible
              ? "animate-in fade-in slide-in-from-top-4 duration-300"
              : "animate-out fade-out slide-out-to-top-4 duration-200"
            : t.visible
            ? "animate-in fade-in slide-in-from-bottom-4 duration-300"
            : "animate-out fade-out slide-out-to-bottom-4 duration-200"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-[#246C94] flex items-center justify-center shrink-0 shadow-xs">
          <Info className="w-3.5 h-3.5 text-white stroke-[2.5]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-[13px] font-semibold text-[#243746] leading-snug block">
            {message}
          </span>
        </div>
      </div>
    ),
    {
      position,
      duration: 2500,
      ...options,
    }
  );
};

export const showWarningToast = (message, options = {}) => {
  const { position, isStaff } = getToastConfig();
  return toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 bg-white/95 backdrop-blur-md text-[#243746] px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-xl border border-[#E1E9EF] ring-1 ring-black/5 max-w-sm sm:max-w-md w-full font-poppins antialiased transition-all duration-300 ${
          isStaff
            ? t.visible
              ? "animate-in fade-in slide-in-from-top-4 duration-300"
              : "animate-out fade-out slide-out-to-top-4 duration-200"
            : t.visible
            ? "animate-in fade-in slide-in-from-bottom-4 duration-300"
            : "animate-out fade-out slide-out-to-bottom-4 duration-200"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-[#b45309] flex items-center justify-center shrink-0 shadow-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-white stroke-[2.5]" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs sm:text-[13px] font-semibold text-[#243746] leading-snug block">
            {message}
          </span>
        </div>
      </div>
    ),
    {
      position,
      duration: 3000,
      ...options,
    }
  );
};

export default {
  success: showSuccessToast,
  error: showErrorToast,
  info: showInfoToast,
  warning: showWarningToast,
  limiter: ToastLimiter,
};
