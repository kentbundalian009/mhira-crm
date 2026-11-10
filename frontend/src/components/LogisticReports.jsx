import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Search,
  Truck,
  DollarSign,
  RefreshCw,
  ShoppingBag,
  RotateCcw,
  X,
  ChevronDown,
  Printer,
  FileText,
  CheckCircle2,
  Calendar,
  Loader2,
  PackageCheck,
  AlertTriangle
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

const DEFAULT_ORDERS = [
  { _id: "ord-001", orderNumber: "ORD-2026-8812", customerName: "Valerie Mendoza", courier: "J&T Express", status: "Delivered", paymentStatus: "Paid", totalAmount: 1450, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { _id: "ord-002", orderNumber: "ORD-2026-8813", customerName: "Carlos Miguel Tan", courier: "Ninja Van", status: "In Transit", paymentStatus: "Paid", totalAmount: 890, createdAt: new Date(Date.now() - 5 * 3600000).toISOString() },
  { _id: "ord-003", orderNumber: "ORD-2026-8814", customerName: "Elena Rostova", courier: "Flash Express", status: "Delivered", paymentStatus: "Paid", totalAmount: 2340, createdAt: new Date(Date.now() - 14 * 3600000).toISOString() },
  { _id: "ord-004", orderNumber: "ORD-2026-8815", customerName: "Danilo Ramos", courier: "J&T Express", status: "Processing", paymentStatus: "Paid", totalAmount: 675, createdAt: new Date(Date.now() - 26 * 3600000).toISOString() },
  { _id: "ord-005", orderNumber: "ORD-2026-8816", customerName: "Grace Villanueva", courier: "LBC Express", status: "Delivered", paymentStatus: "Paid", totalAmount: 3120, createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
  { _id: "ord-006", orderNumber: "ORD-2026-8817", customerName: "Mark Anthony Lee", courier: "J&T Express", status: "Delivered", paymentStatus: "Paid", totalAmount: 1199, createdAt: new Date(Date.now() - 72 * 3600000).toISOString() }
];

const DEFAULT_RETURNS = [
  { _id: "ret-001", orderId: "ORD-2026-8742", customerName: "Sarah Delos Reyes", reason: "Damaged seal during transit", condition: "Defective Package", status: "Approved & Refunded", createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  { _id: "ret-002", orderId: "ORD-2026-8790", customerName: "Patrick Gomez", reason: "Wrong item variant dispatched", condition: "Intact & Resellable", status: "Replacement Shipped", createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
  { _id: "ret-003", orderId: "ORD-2026-8801", customerName: "Jasmine Soriano", reason: "Customer changed preference", condition: "Opened Bottle", status: "Under Review", createdAt: new Date(Date.now() - 72 * 3600000).toISOString() }
];

function LogisticReports() {
  const [reportType, setReportType] = useState("sales-summary"); // 'sales-summary' | 'returns-audit'
  const [dateRange, setDateRange] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const [orders, setOrders] = useState(DEFAULT_ORDERS);
  const [returns, setReturns] = useState(DEFAULT_RETURNS);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const API_BASE_URL = import.meta.env.MODE === "production"
    ? "https://mhira-crmsystem.onrender.com"
    : "http://localhost:5000";

  const fetchLogisticData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [ordersRes, returnsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/orders`, { headers }),
        axios.get(`${API_BASE_URL}/api/returns`, { headers })
      ]);

      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value.data) && ordersRes.value.data.length > 0) {
        setOrders(ordersRes.value.data);
      }
      if (returnsRes.status === "fulfilled" && Array.isArray(returnsRes.value.data) && returnsRes.value.data.length > 0) {
        setReturns(returnsRes.value.data);
      }
    } catch (error) {
      console.error("Error fetching logistic report data:", error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchLogisticData();
  }, [fetchLogisticData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, searchTerm, dateRange]);

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

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const cust = (o.customerName || o.user?.fullName || "").toLowerCase();
      const ref = (o.orderNumber || o._id || "").toLowerCase();
      const courier = (o.courier || o.shippingMethod || "").toLowerCase();
      const status = (o.status || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      if (query && !cust.includes(query) && !ref.includes(query) && !courier.includes(query) && !status.includes(query)) {
        return false;
      }

      if (!matchesDateRange(o.createdAt || o.updatedAt)) {
        return false;
      }

      return true;
    });
  }, [orders, searchTerm, matchesDateRange]);

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const cust = (r.customerName || "").toLowerCase();
      const ordId = (r.orderId || r._id || "").toLowerCase();
      const reason = (r.reason || "").toLowerCase();
      const cond = (r.condition || "").toLowerCase();
      const status = (r.status || "").toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      if (query && !cust.includes(query) && !ordId.includes(query) && !reason.includes(query) && !cond.includes(query) && !status.includes(query)) {
        return false;
      }

      if (!matchesDateRange(r.createdAt || r.updatedAt)) {
        return false;
      }

      return true;
    });
  }, [returns, searchTerm, matchesDateRange]);

  const currentTotal = reportType === "sales-summary" ? filteredOrders.length : filteredReturns.length;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedReturns = filteredReturns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  }, [orders]);

  const deliveredCount = useMemo(() => {
    return orders.filter((o) => (o.status || "").toLowerCase() === "delivered" || (o.status || "").toLowerCase() === "completed").length;
  }, [orders]);

  const deliveryRate = orders.length > 0 ? Math.round((deliveredCount / orders.length) * 100) : 100;

  // Official Executive PDF Export matching Marketing & Inventory
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    showSuccessToast("Preparing official executive Logistics audit report...");

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

      const docNo = `MN-LOG-${reportType === "sales-summary" ? "DISP" : "RET"}-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const reportTitle = reportType === "sales-summary"
        ? "OUTBOUND DISPATCHES & FREIGHT MANIFEST"
        : "CUSTOMER RETURN & REFUND AUDIT";

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
      doc.text("LOGISTICS OPERATIONS & FREIGHT DISPATCH AUDIT", 36, 21.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text("Official Outbound Delivery Manifest, Shipping Fees & Customer Returns Trail", 36, 26);

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
      let card1Label = "GROSS DISPATCH VALUE";
      let card1Val = `₱${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      let card2Label = "TOTAL ORDERS SHIPPED";
      let card2Val = `${orders.length} Dispatches`;
      let card3Label = "DELIVERY FULFILLMENT RATE";
      let card3Val = `${deliveredCount} Delivered (${deliveryRate}%)`;
      let card4Label = "RETURN CLAIMS AUDITED";
      let card4Val = `${returns.length} Requests Processed`;

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

      if (reportType === "sales-summary") {
        tableHead = [["ORDER TRACKING REF", "CUSTOMER NAME", "DISPATCH DATE", "FULFILLMENT STATUS", "CARRIER", "TOTAL AMOUNT"]];
        tableBody = filteredOrders.map((o, idx) => [
          o.orderNumber || o._id?.slice(-8) || `ORD-${idx + 1001}`,
          (o.customerName || o.user?.fullName || "Valued Customer").toUpperCase(),
          new Date(o.createdAt || Date.now()).toLocaleDateString(),
          (o.status || "Completed").toUpperCase(),
          o.courier || "J&T Express",
          `PHP ${Number(o.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);
        columnStyles = {
          0: { fontStyle: "bold", halign: "left", cellWidth: 36 },
          1: { halign: "left", cellWidth: 46 },
          2: { halign: "center", cellWidth: 24 },
          3: { halign: "center", cellWidth: 26 },
          4: { halign: "center", cellWidth: 24 },
          5: { fontStyle: "bold", halign: "right", cellWidth: 26 }
        };
      } else {
        tableHead = [["RETURN REF", "ORDER REF", "CUSTOMER NAME", "RETURN REASON", "CONDITION", "STATUS"]];
        tableBody = filteredReturns.map((r, idx) => [
          r._id?.slice(-8) || `RET-${idx + 101}`,
          r.orderId || "ORD-2026-N/A",
          (r.customerName || "Customer").toUpperCase(),
          r.reason || "Damaged item",
          r.condition || "Inspection Verified",
          (r.status || "Approved").toUpperCase()
        ]);
        columnStyles = {
          0: { fontStyle: "bold", halign: "left", cellWidth: 26 },
          1: { halign: "left", cellWidth: 32 },
          2: { halign: "left", cellWidth: 42 },
          3: { halign: "left", cellWidth: 38 },
          4: { halign: "center", cellWidth: 24 },
          5: { halign: "center", cellWidth: 20 }
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
          fillColor: [1, 57, 15], // Brand dark green
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
      doc.text("Logistics & Fulfillment Officer", startX + colWidth / 2, sigY + 14.8, { align: "center" });

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
      const fileName = `MHIRA_Logistics_Report_${reportType}_${dateTag}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Logistics official report: ${fileName}`);
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
            <span className="text-xs font-bold uppercase whitespace-nowrap">Logistics & Sales Operations</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 whitespace-nowrap">
            Logistics Reports & Dispatches Audit Ledger
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Generate and export official executive PDF manifests, carrier dispatch tracking, and customer return audits.
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
              { id: "sales-summary", label: "Sales & Shipment Manifest", icon: Truck },
              { id: "returns-audit", label: "Customer Return & Refund Audits", icon: ShoppingBag },
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
                  onClick={fetchLogisticData}
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
                  placeholder="Search Order Ref, Customer Name, Carrier..."
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
                    <option value="sales-summary">Sales & Shipment Manifest</option>
                    <option value="returns-audit">Customer Return & Refund Audits</option>
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
                    <option value="all">Scope: All Dispatches</option>
                    <option value="today">Scope: Today's Route</option>
                    <option value="week">Scope: Past 7 Days</option>
                    <option value="month">Scope: Past 30 Days</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Per Page Select */}
                <div className="relative w-full">
                  <ShoppingBag className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
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
                  onClick={() => setReportType("sales-summary")}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    reportType === "sales-summary"
                      ? "bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Sales Manifest
                </button>

                <button
                  type="button"
                  onClick={() => setReportType("returns-audit")}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    reportType === "returns-audit"
                      ? "bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Returns Audit
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setDateRange("all");
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
              {reportType === "sales-summary"
                ? "Outbound Logistics Order Dispatches & Revenue Report"
                : "Customer Return & Refund Inspection Log"}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-mono">
            <div>Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
            <div>Department: Logistics & Order Processing</div>
          </div>
        </div>

        {/* METRICS SUMMARY ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Gross Sales Revenue</span>
            <span className="text-xl font-extrabold text-[#01390f] block mt-0.5 whitespace-nowrap">
              ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Total Shipped Orders</span>
            <span className="text-xl font-extrabold text-[#01390f] block mt-0.5 whitespace-nowrap">{orders.length} Dispatches</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Completed Deliveries</span>
            <span className="text-xl font-extrabold text-blue-700 block mt-0.5 whitespace-nowrap">
              {deliveredCount} ({deliveryRate}%)
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Processed Returns</span>
            <span className="text-xl font-extrabold text-amber-700 block mt-0.5 whitespace-nowrap">{returns.length} Requests</span>
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

          {/* REPORT CONTENT TABLES */}
          {reportType === "sales-summary" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">Order Tracking Ref</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Dispatch Date</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Fulfillment Status</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Courier / Carrier</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-right">Total Order Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400 italic whitespace-nowrap">
                        No order sales records available for this filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((o, i) => (
                      <tr key={o._id || i} className="hover:bg-slate-50/90 transition-colors group">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {o.orderNumber || o._id?.slice(-8) || `ORD-${i + 1001}`}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {o.customerName || o.user?.fullName || "Valued Customer"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {new Date(o.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            (o.status || "").toLowerCase() === "delivered" || (o.status || "").toLowerCase() === "completed"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}>
                            {o.status || "Completed"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                          {o.courier || "J&T Express"}
                        </td>
                        {/* Signature Raw Materials Blue Accent Cell */}
                        <td className="py-3.5 px-4 font-mono font-black text-right whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 text-blue-950 transition-colors">
                          ₱{Number(o.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === "returns-audit" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">Return RMA Ref</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Order Tracking Ref</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Return Reason</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Inspection Condition</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Resolution Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredReturns.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-400 italic whitespace-nowrap">
                        No return audit records available for this filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedReturns.map((r, i) => (
                      <tr key={r._id || i} className="hover:bg-slate-50/90 transition-colors group">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {r._id?.slice(-8) || `RET-${i + 101}`}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {r.orderId || "ORD-2026-N/A"}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {r.customerName || "Customer"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap max-w-sm truncate">
                          {r.reason || "Damaged during transit"}
                        </td>
                        {/* Signature Raw Materials Blue Accent Cell */}
                        <td className="py-3.5 px-4 whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 text-blue-950 font-bold transition-colors">
                          {r.condition || "Inspection Verified"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            {r.status || "Approved"}
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
            <div className="text-[10px] text-slate-500 whitespace-nowrap">Logistics & Fulfillment Officer • Supply Chain Operations</div>
          </div>
          <div className="text-right text-[10px] text-slate-400">
            Internal Confidential • Verified Logistics Record
          </div>
        </div>

      </div>
    </div>
  );
}

export default LogisticReports;
