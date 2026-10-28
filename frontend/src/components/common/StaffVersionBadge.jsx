import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

function StaffVersionBadge() {
  const [isStaff, setIsStaff] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkStaffStatus = () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        const directRole = localStorage.getItem("role") || "";

        let user = null;
        if (storedUser) {
          try {
            user = JSON.parse(storedUser);
          } catch (e) {}
        }

        const role = String(user?.role || user?.SystemRole || user?.accountType || directRole || "").trim().toLowerCase();
        const staffRoles = ["admin", "superadmin", "inventory", "logistic", "logistics", "marketing", "staff"];
        const matchesStaff = staffRoles.some((r) => role.includes(r));
        const isCustomer = role === "customer";
        const isDashboardRoute = location.pathname.startsWith("/dashboard");

        // Visible to staff / admin users or when on dashboard
        if ((token && matchesStaff && !isCustomer) || (token && isDashboardRoute)) {
          setIsStaff(true);
        } else {
          setIsStaff(false);
        }
      } catch {
        setIsStaff(false);
      }
    };

    checkStaffStatus();

    window.addEventListener("userLogin", checkStaffStatus);
    window.addEventListener("userUpdated", checkStaffStatus);
    window.addEventListener("userLogout", checkStaffStatus);
    window.addEventListener("storage", checkStaffStatus);

    return () => {
      window.removeEventListener("userLogin", checkStaffStatus);
      window.removeEventListener("userUpdated", checkStaffStatus);
      window.removeEventListener("userLogout", checkStaffStatus);
      window.removeEventListener("storage", checkStaffStatus);
    };
  }, [location.pathname]);

  if (!isStaff) return null;

  return (
    <div
      className="fixed bottom-3 right-3 z-50 bg-[#01390f] text-white text-[11px] font-mono font-semibold px-2.5 py-1 rounded-sm select-none cursor-default transition-opacity duration-200 opacity-40 hover:opacity-100 animate-fadeIn"
      title="Mhira Natural CRM System Version (Staff Mode)"
    >
      <span className="tracking-wide">System v1.2.0</span>
    </div>
  );
}

export default StaffVersionBadge;
