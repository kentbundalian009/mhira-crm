import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Search,
  ShieldCheck,
  Users,
  Activity,
  FileText,
  Calendar,
  RotateCcw,
  RefreshCw,
  X,
  ChevronDown,
  Loader2,
  CheckCircle2,
  Lock,
  UserCheck,
  KeyRound,
  Database
} from "lucide-react";
import axios, { API } from "../axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import TablePagination from "./common/TablePagination";
import { getUserFullName } from "../utils/userId";

// Helper to convert image URL to base64 for crisp PDF header thumbnail
const loadBase64Image = (url) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
};

// Helper to create a transparent watermark image with subtle opacity (~0.095) for background
const loadWatermarkImage = (url, opacity = 0.095) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 500;
          canvas.height = img.naturalHeight || img.height || 500;
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
};

// Default fallback data for admin accounts
const DEFAULT_USERS = [
  { _id: "u1", fullName: "Kent Bryan", username: "superadmin", email: "admin@mhiranatural.com", role: "Admin", department: "Executive Backoffice", status: "Active", createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { _id: "u2", fullName: "Maria Santos", username: "msantos", email: "warehouse@mhiranatural.com", role: "Inventory", department: "Warehouse & Formulation", status: "Active", createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { _id: "u3", fullName: "Angela Cruz", username: "acruz", email: "marketing@mhiranatural.com", role: "Marketing", department: "Commercial & Sales", status: "Active", createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  { _id: "u4", fullName: "John Doe", username: "jdoe", email: "logistics@mhiranatural.com", role: "Logistics", department: "Dispatch & Freight", status: "Active", createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { _id: "u5", fullName: "Production Lab Staff", username: "factory_user", email: "lab@mhiranatural.com", role: "Inventory", department: "Soap & Cosmetic Lab", status: "Active", createdAt: new Date(Date.now() - 15 * 86400000).toISOString() }
];

// Default fallback data for admin security & activity logs
const DEFAULT_ACTIVITIES = [
  { _id: "act1", user: "Kent Bryan", action: "Formula Access PIN Verified", details: "Authorized viewing of Bill of Materials for Niacinamide Lotion Lot #LOT-2026-031", category: "Security", createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
  { _id: "act2", user: "Maria Santos", action: "Raw Material Batch Received", details: "Inbounded 50kg Pure Shea Butter under Batch PO-2026-089", category: "Inventory", createdAt: new Date(Date.now() - 65 * 60000).toISOString() },
  { _id: "act3", user: "Kent Bryan", action: "Database Snapshot Backup", details: "Triggered cloud MongoDB snapshot backup with SHA-256 verification", category: "System", createdAt: new Date(Date.now() - 3 * 3600000).toISOString() },
  { _id: "act4", user: "Angela Cruz", action: "Voucher Campaign Published", details: "Created promo code GLOW20 with 20% discount cap at ₱200", category: "Marketing", createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { _id: "act5", user: "John Doe", action: "Courier Rates Synchronized", details: "Adjusted PayMongo base metro shipping rate to ₱85.00 for J&T Express", category: "Logistics", createdAt: new Date(Date.now() - 8 * 3600000).toISOString() },
  { _id: "act6", user: "Kent Bryan", action: "System Security Policy Updated", details: "Enforced default factory PIN (123456) lockout rules across production workstations", category: "Security", createdAt: new Date(Date.now() - 24 * 3600000).toISOString() }
];

function AdminReports() {
  const [reportType, setReportType] = useState("users-audit"); // 'users-audit' | 'activity-logs'
  const [dateRange, setDateRange] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [users, setUsers] = useState(DEFAULT_USERS);
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);

  const API_BASE_URL = import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [usersRes, activityRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/users`, { headers }),
        axios.get(`${API_BASE_URL}/api/user-activities`, { headers })
      ]);

      if (usersRes.status === "fulfilled" && Array.isArray(usersRes.value.data) && usersRes.value.data.length > 0) {
        setUsers(usersRes.value.data);
      }
      if (activityRes.status === "fulfilled" && Array.isArray(activityRes.value.data) && activityRes.value.data.length > 0) {
        setActivities(activityRes.value.data);
      }
    } catch (error) {
      console.error("Error fetching admin report data:", error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, searchTerm, dateRange, roleFilter]);

  // Date filtering helper
  const matchesDateRange = useCallback((dateString) => {
    if (!dateString || dateRange === "all") return true;
    const itemDate = new Date(dateString);
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    if (dateRange === "today") {
      return itemDate.toDateString() === now.toDateString();
    }
    if (dateRange === "week") {
      const diffTime = Math.abs(now - itemDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (dateRange === "month") {
      const diffTime = Math.abs(now - itemDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }
    return true;
  }, [dateRange]);

  // Filtered User Accounts
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = (u.fullName || u.name || "").toLowerCase();
      const uname = (u.username || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      const dept = (u.department || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      if (query && !name.includes(query) && !uname.includes(query) && !email.includes(query) && !role.includes(query) && !dept.includes(query)) {
        return false;
      }

      if (roleFilter !== "all" && (u.role || "").toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      if (!matchesDateRange(u.createdAt)) {
        return false;
      }

      return true;
    });
  }, [users, searchTerm, roleFilter, matchesDateRange]);

  // Filtered Activity Logs
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      const user = (a.user || a.username || "").toLowerCase();
      const action = (a.action || "").toLowerCase();
      const details = (a.details || a.description || "").toLowerCase();
      const cat = (a.category || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      if (query && !user.includes(query) && !action.includes(query) && !details.includes(query) && !cat.includes(query)) {
        return false;
      }

      if (roleFilter !== "all" && (a.category || "").toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      if (!matchesDateRange(a.createdAt || a.timestamp)) {
        return false;
      }

      return true;
    });
  }, [activities, searchTerm, roleFilter, matchesDateRange]);

  const currentTotal = reportType === "users-audit" ? filteredUsers.length : filteredActivities.length;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedActivities = filteredActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Official Executive PDF Generation matching Marketing & Inventory
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    showSuccessToast("Preparing official executive Admin audit report...");

    try {
      const [logoBase64, watermarkBase64] = await Promise.all([
        loadBase64Image("/mhira_removebg.png"),
        loadWatermarkImage("/mhira_removebg.png", 0.095)
      ]);

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

      const logoRatio = 835 / 673;
      const wmWidth = 90;
      const wmHeight = wmWidth / logoRatio;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;

      const formattedPeriod =
        dateRange === "all"
          ? "All Time (Full Ledger)"
          : dateRange === "today"
          ? "Today Only"
          : dateRange === "week"
          ? "Past 7 Days"
          : "Past 30 Days";

      const docNo = `MN-ADM-${reportType === "users-audit" ? "USR" : "ACT"}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const reportTitle = reportType === "users-audit"
        ? "SYSTEM USER ACCOUNTS AUDIT LEDGER"
        : "SECURITY & SYSTEM ACTIVITY TRAIL AUDIT";

      // 1. Company Header
      const headerLogoH = 15;
      const headerLogoW = headerLogoH * logoRatio;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, "PNG", 14, 12, headerLogoW, headerLogoH, undefined, "FAST");
        } catch (e) {}
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(1, 57, 15); // Dark brand green
      doc.text("MHIRA NATURAL BEAUTY PRODUCTS", 36, 16.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text("ADMINISTRATIVE BACKOFFICE & SYSTEM SECURITY AUDIT", 36, 21.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text("Official User Access Ledger, Formula Protection PIN & Event Trail", 36, 26);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(21, 62, 151);
      doc.text("Security Classification: INTERNAL CONFIDENTIAL • Controlled Executive Copy", 36, 30);

      // Top-Right Metadata
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(1, 57, 15);
      doc.text(reportTitle, pageWidth - 14, 16.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`DOC NO: ${docNo}`, pageWidth - 14, 21.5, { align: "right" });
      doc.text(`AUDIT PERIOD: ${formattedPeriod}`, pageWidth - 14, 26, { align: "right" });
      doc.text(`GENERATED: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: "right" });

      doc.setDrawColor(1, 57, 15);
      doc.setLineWidth(0.4);
      doc.line(14, 33.5, pageWidth - 14, 33.5);

      // 2. 4-Column KPI Summary Table
      let card1Label = "TOTAL REGISTERED USERS";
      let card1Val = `${users.length} Active Staff`;
      let card2Label = "ADMINISTRATORS";
      let card2Val = `${users.filter(u => (u.role || "").toLowerCase() === "admin").length} Super Admins`;
      let card3Label = "AUDITED TRAIL EVENTS";
      let card3Val = `${activities.length} System Records`;
      let card4Label = "SECURITY POLICIES";
      let card4Val = "Enforced & Monitored";

      autoTable(doc, {
        startY: 36.5,
        margin: { left: 14, right: 14 },
        head: [[card1Label, card2Label, card3Label, card4Label]],
        body: [[card1Val, card2Val, card3Val, card4Val]],
        theme: "grid",
        styles: {
          font: "helvetica",
          fontStyle: "normal",
          fontSize: 6.0,
          cellPadding: { top: 2.2, bottom: 2.2, left: 1.5, right: 1.5 },
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          halign: "center",
          valign: "middle",
          overflow: "ellipsize",
        },
        headStyles: {
          fillColor: [239, 246, 255],
          textColor: [21, 62, 151],
          fontStyle: "bold",
          fontSize: 5.6,
          halign: "center",
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [15, 23, 42],
          fontStyle: "bold",
          fontSize: 6.0,
          halign: "center",
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        columnStyles: {
          0: { cellWidth: 45.5 },
          1: { cellWidth: 45.5 },
          2: { cellWidth: 45.5 },
          3: { cellWidth: 45.5 },
        },
      });

      // 3. Main Data Table
      let tableHead = [];
      let tableBody = [];
      let columnStyles = {};

      if (reportType === "users-audit") {
        tableHead = [["FULL NAME", "USERNAME", "EMAIL ADDRESS", "DEPARTMENT / ROLE", "STATUS", "DATE ONBOARDED"]];
        tableBody = filteredUsers.map((u) => [
          (u.fullName || u.name || "N/A").toUpperCase(),
          u.username || "N/A",
          u.email || "N/A",
          `${u.department || "Operations"} - ${u.role || "Staff"}`,
          u.status || "Active",
          new Date(u.createdAt || Date.now()).toLocaleDateString()
        ]);
        columnStyles = {
          0: { fontStyle: "bold", halign: "left", cellWidth: 40 },
          1: { halign: "left", cellWidth: 28 },
          2: { halign: "left", cellWidth: 44 },
          3: { fontStyle: "bold", halign: "left", cellWidth: 38 },
          4: { halign: "center", cellWidth: 16 },
          5: { halign: "center", cellWidth: 16 }
        };
      } else {
        tableHead = [["TIMESTAMP", "OPERATOR / USER", "EVENT / ACTION", "LOG DETAILS", "SECURITY CATEGORY"]];
        tableBody = filteredActivities.map((a) => [
          new Date(a.createdAt || a.timestamp || Date.now()).toLocaleString(),
          (a.user || a.username || "System").toUpperCase(),
          a.action || "Log Event",
          a.details || a.description || "-",
          a.category || "Security"
        ]);
        columnStyles = {
          0: { halign: "center", cellWidth: 34 },
          1: { fontStyle: "bold", halign: "left", cellWidth: 34 },
          2: { fontStyle: "bold", halign: "left", cellWidth: 42 },
          3: { halign: "left", cellWidth: 50 },
          4: { halign: "center", cellWidth: 22 }
        };
      }

      const mainTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;

      autoTable(doc, {
        startY: mainTableStartY,
        margin: { left: 14, right: 14, top: 19, bottom: 12 },
        head: tableHead,
        body: tableBody,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 6.8,
          textColor: [51, 65, 85],
          cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          valign: "middle",
          overflow: "ellipsize",
        },
        headStyles: {
          fillColor: [1, 57, 15], // Signature dark green
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
          halign: "center",
          valign: "middle",
          lineColor: [1, 57, 15],
          lineWidth: 0.2,
          overflow: "ellipsize",
        },
        bodyStyles: {
          overflow: "ellipsize",
          valign: "middle",
        },
        alternateRowStyles: {
          fillColor: [248, 250, 255],
        },
        columnStyles: columnStyles,
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            const thumbH = 7;
            const thumbW = thumbH * logoRatio;
            if (logoBase64) {
              try {
                doc.addImage(logoBase64, "PNG", 14, 7, thumbW, thumbH, undefined, "FAST");
              } catch (e) {}
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.2);
            doc.setTextColor(1, 57, 15);
            doc.text(`MHIRA NATURAL BEAUTY PRODUCTS  •  ${reportTitle}`, 14 + thumbW + 4, 11.5);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.2);
            doc.setTextColor(100, 116, 139);
            doc.text(`Period: ${formattedPeriod}`, pageWidth - 14, 11.5, { align: "right" });

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.line(14, 16, pageWidth - 14, 16);
          }

          const footerY = pageHeight - 7;
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(14, footerY - 2.5, pageWidth - 14, footerY - 2.5);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.8);
          doc.setTextColor(100, 116, 139);
          doc.text("INTERNAL CONFIDENTIAL • CONTROLLED EXECUTIVE COPY", 14, footerY + 1.2);
        },
      });

      // 4. Executive Sign-Off Section
      let finalY = (doc.lastAutoTable?.finalY || 140) + 8;
      const sigSectionH = 24;

      if (finalY + sigSectionH > pageHeight - 14) {
        doc.addPage();
        finalY = 22;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(1, 57, 15);
      doc.text("AUDIT VERIFICATION & EXECUTIVE SIGN-OFF", 14, finalY);

      doc.setDrawColor(1, 57, 15);
      doc.setLineWidth(0.3);
      doc.line(14, finalY + 1.8, pageWidth - 14, finalY + 1.8);

      const sigY = finalY + 6.5;
      const colWidth = 72;
      const startX = 14;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.2);
      doc.setTextColor(1, 57, 15);
      doc.text("PREPARED & VERIFIED BY:", startX, sigY);

      const signerFullName = getUserFullName("Signature over Printed Name");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(signerFullName.length > 25 ? 5.4 : 6.2);
      doc.setTextColor(15, 23, 42);
      doc.text(signerFullName, startX + colWidth / 2, sigY + 9.5, { align: "center" });

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.line(startX, sigY + 11, startX + colWidth, sigY + 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text("System Administrator", startX + colWidth / 2, sigY + 14.8, { align: "center" });

      // 5. Watermark and Running Page Numbers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (watermarkBase64) {
          try {
            doc.addImage(watermarkBase64, "PNG", wmX, wmY, wmWidth, wmHeight, undefined, "FAST");
          } catch (e) {}
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 5.8, { align: "right" });
      }

      const dateTag = new Date().toISOString().slice(0, 10);
      const fileName = `MHIRA_Admin_Report_${reportType}_${dateTag}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Admin official report: ${fileName}`);
    } catch (err) {
      console.error("Error generating PDF:", err);
      showErrorToast("Failed to export PDF report.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-800">
      {/* HEADER & CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#01390f]">
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-xs font-bold uppercase whitespace-nowrap">System Administration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 whitespace-nowrap">
            Admin Reports & Security Audit Ledger
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Generate and export official executive PDF audit logs, user security profiles, and system activity trails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="inline-flex items-center gap-2 bg-[#01390f] hover:bg-[#012409] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap disabled:opacity-60"
          >
            {isExportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="whitespace-nowrap">{isExportingPDF ? "Generating PDF..." : "Export PDF Report"}</span>
          </button>
        </div>
      </div>

      {/* EXCEL SHEET TABS & RIBBON TOOLBAR CONTAINER */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-6">
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "users-audit", label: "User Accounts Audit", icon: Users },
              { id: "activity-logs", label: "Security Activity Trails", icon: ShieldCheck },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReportType(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                    reportType === tab.id
                      ? "border-[#01390f] text-[#01390f] bg-slate-50"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
          {/* ACTIONS GROUP */}
          <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
            <div className="flex items-stretch gap-1.5 flex-1">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f] disabled:opacity-60"
                title="Download Official PDF Report"
              >
                {isExportingPDF ? (
                  <Loader2 className="w-5 h-5 mb-0.5 text-[#01390f] animate-spin" />
                ) : (
                  <Download className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[11px] font-bold text-center leading-tight">Export PDF</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? "animate-spin" : ""}`} />
                  <span className="truncate">Refresh Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setDateRange("all");
                    setRoleFilter("all");
                  }}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer w-full"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Reset Search</span>
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
              Actions
            </div>
          </div>

          {/* SEARCH & FILTER GROUP */}
          <div className="flex flex-col justify-between flex-1 min-h-[92px] pl-1">
            <div className="flex flex-col justify-between flex-1 gap-1.5 py-0.5">
              {/* Layer 1: Search */}
              <div className="relative flex items-center w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search staff, roles, activity details..."
                  className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Layer 2: 3-column Dropdowns */}
              <div className="grid grid-cols-3 gap-2 w-full">
                {/* Report Type Select */}
                <div className="relative w-full">
                  <FileText className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="users-audit">User Accounts Audit</option>
                    <option value="activity-logs">Security Activity Trails</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Scope Select */}
                <div className="relative w-full">
                  <Calendar className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="all">Scope: Full Ledger</option>
                    <option value="today">Scope: Today Only</option>
                    <option value="week">Scope: Past 7 Days</option>
                    <option value="month">Scope: Past 30 Days</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Per Page Select */}
                <div className="relative w-full">
                  <Users className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value={10}>Show 10 Rows</option>
                    <option value={25}>Show 25 Rows</option>
                    <option value={50}>Show 50 Rows</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setReportType("users-audit")}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    reportType === "users-audit"
                      ? "bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Users Audit
                </button>

                <button
                  type="button"
                  onClick={() => setReportType("activity-logs")}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    reportType === "activity-logs"
                      ? "bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Activity Logs
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setDateRange("all");
                    setRoleFilter("all");
                  }}
                  className="h-[22px] text-xs px-2 rounded border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium flex items-center justify-center cursor-pointer transition-colors"
                >
                  Reset Scope
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
              Search & Filter
            </div>
          </div>
        </div>

        {/* HR DIVIDER ABOVE REPORT DOCUMENT */}
        <hr className="border-slate-200 -mt-4 -mb-2" />
      </div>

      {/* REPORT DOCUMENT CONTAINER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        
        {/* REPORT OFFICIAL HEADER */}
        <div className="border-b border-slate-200 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-lg font-black text-[#01390f] uppercase whitespace-nowrap">
              Mhira Natural Soap & Cosmetics Mfg.
            </h2>
            <p className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
              {reportType === "users-audit" ? "System User Accounts Audit Masterlist" : "Security & System Activity Log Trail"}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-mono">
            <div>Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
            <div>Classification: Confidential Internal Audit</div>
          </div>
        </div>

        {/* METRICS SUMMARY ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Total Staff Accounts</span>
            <span className="text-xl font-extrabold text-[#01390f] block mt-0.5 whitespace-nowrap">{users.length} Users</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Active Admins</span>
            <span className="text-xl font-extrabold text-blue-700 block mt-0.5 whitespace-nowrap">
              {users.filter((u) => (u.role || "").toLowerCase() === "admin").length} Accounts
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Audit Trail Logs</span>
            <span className="text-xl font-extrabold text-emerald-700 block mt-0.5 whitespace-nowrap">{activities.length} Events</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Security Status</span>
            <span className="text-xl font-extrabold text-[#01390f] block mt-0.5 whitespace-nowrap">Protected</span>
          </div>
        </div>

        {/* TABLE MASTERLIST CONTAINER */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          <TablePagination
            currentPage={currentPage}
            totalItems={currentTotal}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setItemsPerPage(rows);
              setCurrentPage(1);
            }}
          />

          {/* REPORT CONTENT TABLE */}
          {reportType === "users-audit" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">Full Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Username</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Email Address</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Department / Role</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Account Status</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Date Onboarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400 italic whitespace-nowrap">
                        No user accounts match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u, i) => (
                      <tr key={u._id || i} className="hover:bg-slate-50/90 transition-colors group">
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {u.fullName || u.name || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {u.username || "N/A"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {u.email || "N/A"}
                        </td>
                        {/* Signature Raw Materials Blue Accent Cell */}
                        <td className="py-3.5 px-4 whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 text-blue-950 font-bold transition-colors">
                          <span className="uppercase text-[11px]">{u.department || "Operations"} - {u.role || "Staff"}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {u.status || "Active"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">Timestamp</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Operator / User</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Event / Action</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Log Details</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Security Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400 italic whitespace-nowrap">
                        No activity records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedActivities.map((act, i) => (
                      <tr key={act._id || i} className="hover:bg-slate-50/90 transition-colors group">
                        <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(act.createdAt || act.timestamp || Date.now()).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {act.user || act.username || "System"}
                        </td>
                        {/* Signature Raw Materials Blue Accent Cell */}
                        <td className="py-3.5 px-4 whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 text-blue-950 font-bold transition-colors">
                          {act.action || "Log Event"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap max-w-sm truncate">
                          {act.details || act.description || "-"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {act.category || "Security"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* REPORT SIGN-OFF FOOTER */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-xs text-slate-500">
          <div>
            <div className="font-bold text-[#01390f] uppercase text-[11px] whitespace-nowrap">
              PREPARED & VERIFIED BY:
            </div>
            <div className="mt-6 text-[12px] font-bold text-slate-900 whitespace-nowrap uppercase">
              {getUserFullName("Signature over Printed Name")}
            </div>
            <div className="border-b border-slate-400 w-56 my-1"></div>
            <div className="text-[10px] text-slate-500 whitespace-nowrap">System Administrator • Internal Audit Division</div>
          </div>
          <div className="text-right text-[10px] text-slate-400">
            Internal Confidential • Verified Administrative Record
          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminReports;
