import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Loader2 } from "lucide-react";
import { showSuccessToast } from "../../utils/toast";

function DashboardTopbar({ setActiveTab }) {
  const [currentDateTime, setCurrentDateTime] = useState("");
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    if (typeof setActiveTab === "function") {
      setActiveTab("settings");
    } else {
      window.dispatchEvent(new CustomEvent("navigateToTab", { detail: "settings" }));
    }
  };

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.MODE === "production"
      ? "https://mhira-crmsystem.onrender.com"
      : "http://localhost:5000");

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: "Confirm",
    message: "Are you sure you want to log out? Any unsaved progress will be ended.",
    actionType: "logout"
  });

  const [handleConfirmAction, setHandleConfirmAction] = useState(() => { });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formatted =
        now.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }) +
        " " +
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
      setCurrentDateTime(formatted);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);



  const fetchUserProfile = async () => {
    const token = localStorage.getItem("token");
    const storedUserStr = localStorage.getItem("user");
    if (!storedUserStr) return;

    try {
      const parsedUser = JSON.parse(storedUserStr);
      setCurrentUser(parsedUser);

      const userId = parsedUser.id || parsedUser._id || (parsedUser.user && (parsedUser.user.id || parsedUser.user._id));
      if (userId && token) {
        const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.ok) {
          const freshUser = await response.json();
          setCurrentUser(freshUser);

          // Build lightweight sanitized user object (avoid storing huge base64 strings in localStorage)
          const isLargeImg = freshUser.profileImage && freshUser.profileImage.length > 2000;
          const lightweightUser = {
            _id: freshUser._id || parsedUser._id || userId,
            id: freshUser.id || freshUser._id || parsedUser.id || userId,
            username: freshUser.username || parsedUser.username || "",
            fullName: freshUser.fullName || freshUser.fullname || parsedUser.fullName || "",
            email: freshUser.email || parsedUser.email || "",
            role: freshUser.role || parsedUser.role || "Staff",
            accountType: freshUser.accountType || parsedUser.accountType || "Staff",
            profileImage: isLargeImg ? "" : (freshUser.profileImage || parsedUser.profileImage || ""),
          };

          try {
            localStorage.setItem("user", JSON.stringify(lightweightUser));
          } catch (storageErr) {
            console.warn("Storage quota limit reached, maintaining in-memory user state.");
            try {
              // Clear non-critical caches to recover space
              localStorage.removeItem("cached_admin_users");
              localStorage.removeItem("cached_admin_activities");
              localStorage.removeItem("cached_inventory_products");
              localStorage.removeItem("cached_logistics_orders");
              localStorage.setItem("user", JSON.stringify(lightweightUser));
            } catch (retryErr) { }
          }
        }
      }
    } catch (err) {
      console.warn("Topbar user profile sync non-blocking notice:", err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    const handleUserUpdate = () => fetchUserProfile();
    window.addEventListener("userUpdated", handleUserUpdate);
    window.addEventListener("storage", handleUserUpdate);
    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
      window.removeEventListener("storage", handleUserUpdate);
    };
  }, []);

  const executeLogout = async () => {
    setIsLoggingOut(true);

    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => { });
      }
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.clear();
    window.dispatchEvent(new Event("userLogout"));
    showSuccessToast("Successfully logged out!");

    setTimeout(() => {
      setIsConfirmModalOpen(false);
      setIsLoggingOut(false);
      navigate("/login");
    }, 600);
  };

  const handleLogoutClick = () => {
    setIsLoggingOut(false);
    setConfirmModalConfig({
      title: "Sign out of Staff Portal?",
      message: "Are you sure you want to log out? Any unsaved changes will be lost, and you will be returned to the login screen.",
      actionType: "logout"
    });
    setHandleConfirmAction(() => executeLogout);
    setIsConfirmModalOpen(true);
  };

  const userRole = currentUser?.role || currentUser?.SystemRole || localStorage.getItem("role") || "Staff";
  const userName = currentUser?.fullName || currentUser?.Fullname || currentUser?.FullName || currentUser?.username || currentUser?.Username || "System User";
  const userInitial = userName.charAt(0).toUpperCase();
  const profileImage = currentUser?.profileImage || currentUser?.ProfileImage;

  return (
    <>
      <header className="w-full h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs text-slate-800 flex justify-between items-center pl-14 sm:pl-6 px-3 sm:px-6 md:px-8 z-30 flex-shrink-0 select-none transition-colors duration-200 font-sans">

        <div className="hidden sm:flex items-center gap-2 bg-[#EDF7EE] border border-[#d5ead7] text-[#01390f] px-3.5 py-1.5 rounded-full shadow-2xs font-mono text-xs font-semibold whitespace-nowrap">
          <span>
            {currentDateTime || "Thursday, October 8, 2026 • 08:58 AM"}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap">
          <button
            type="button"
            onClick={handleGoToSettings}
            title="Click to view & edit Profile / Settings"
            className="flex items-center gap-2.5 bg-[#EDF7EE] hover:bg-[#d8eed9] border border-[#d5ead7] px-3 py-1.5 rounded-full shadow-2xs transition-all cursor-pointer group whitespace-nowrap active:scale-[0.98] text-left"
          >
            {profileImage ? (
              <img
                src={
                  profileImage.startsWith("http") || profileImage.startsWith("data:") || profileImage.startsWith("blob:")
                    ? profileImage
                    : `${API_BASE_URL}${profileImage.startsWith("/") ? "" : "/"}${profileImage}`
                }
                alt={userName}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#01390f]/30 group-hover:border-[#01390f] transition-colors"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#01390f] text-white flex items-center justify-center text-xs font-bold shrink-0 whitespace-nowrap transition-colors ring-1 ring-[#01390f]/30">
                {userInitial}
              </div>
            )}
            <div className="flex flex-col text-left whitespace-nowrap">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px] sm:max-w-[180px] whitespace-nowrap transition-colors">
                {userName}
              </span>
              <span className="text-[9px] font-bold text-[#01390f] uppercase leading-tight whitespace-nowrap flex items-center gap-1">
                {userRole}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogoutClick}
            title="Sign out of your session"
            className="w-9 h-9 rounded-full flex items-center justify-center text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/90 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
          >
            <LogOut size={16} className="text-rose-600 flex-shrink-0 stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* CONFIRM LOGOUT MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-[#D5EAD7] flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D5EAD7] bg-[#EDF7EE] shrink-0">
              <h3 className="text-sm font-bold text-[#01390f] whitespace-nowrap">
                {confirmModalConfig.title}
              </h3>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {confirmModalConfig.message}
              </p>
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={executeLogout}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                <span>{isLoggingOut ? "Logging Out..." : "Logout"}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

export default DashboardTopbar;
