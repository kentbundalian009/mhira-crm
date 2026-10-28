import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function UserManualPage() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem("dashboard_target_tab", "user-manual");
    } catch (e) {}
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-600 text-xs">
      <span>Redirecting to Dashboard Operations Manual...</span>
    </div>
  );
}
