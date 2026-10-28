import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Package,
  Truck,
  Megaphone,
  ShieldCheck,
  Users,
  Activity,
  FileText,
  Sparkles,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  Star,
  Database,
  Sliders,
  ShoppingBag,
  RotateCcw,
  Calendar,
  Gift,
  ShieldAlert,
  ArrowUpRight,
  Tag,
  Clock,
  Check,
  CheckCircle,
  FileDown,
  SlidersHorizontal,
  Workflow,
  Factory,
  Beaker,
  Palette,
  HardDriveDownload,
  Percent,
  MessageSquare,
  Eye,
  X,
  Plus
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas-pro";
import { showSuccessToast, showErrorToast } from "../utils/toast";

export default function UserManual() {
  const [activePhase, setActivePhase] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [contentFocus, setContentFocus] = useState("all"); // 'all' | 'sop' | 'ui' | 'faq'
  const [expandedSections, setExpandedSections] = useState({
    pipeline: true,
    inventory: true,
    marketing: true,
    customer: true,
    logistics: true,
    admin: true,
    faq: true
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAll = () => {
    setExpandedSections({
      pipeline: true,
      inventory: true,
      marketing: true,
      customer: true,
      logistics: true,
      admin: true,
      faq: true
    });
  };

  const collapseAll = () => {
    setExpandedSections({
      pipeline: false,
      inventory: false,
      marketing: false,
      customer: false,
      logistics: false,
      admin: false,
      faq: false
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const isSectionVisible = (phaseId) => {
    if (isGeneratingPdf) return true;
    if (activePhase === "all" || activePhase === phaseId) return true;
    if (searchQuery) return true;
    return false;
  };

  const isSectionExpanded = (key) => {
    if (isGeneratingPdf) return true;
    return !!expandedSections[key];
  };

  const isContentFocusMatch = (type) => {
    if (isGeneratingPdf) return true;
    if (contentFocus === "all") return true;
    if (type === "sop") return contentFocus === "sop";
    if (type === "ui") return contentFocus === "ui";
    if (type === "faq") return contentFocus === "faq";
    return true;
  };

  // Helper to load image as Base64 for PDF running header
  const loadBase64Image = (url) => {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 100;
            canvas.height = img.naturalHeight || img.height || 100;
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

  // Official Executive PDF Document Downloader (Serves pre-compiled vector PDF with instant fallback)
  const handleDownloadPdf = async () => {
    try {
      const link = document.createElement("a");
      link.href = "/MHIRA_CRM_Operations_Manual_Final.pdf";
      link.download = "MHIRA_CRM_Operations_Manual_Final.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccessToast("Official MHIRA CRM Operations Manual (Final Vector PDF) downloaded successfully!");
      return;
    } catch (err) {
      console.warn("Direct download failed, falling back to dynamic generator:", err);
    }

    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    showSuccessToast("Generating high-resolution PDF from actual UI...");

    try {
      const logoBase64 = await loadBase64Image("/mhira_removebg.png");

      // Give React 450ms to ensure all 5 sections are expanded and rendered
      await new Promise((resolve) => setTimeout(resolve, 450));

      const pageIds = [
        "pdf-page-1",
        "pdf-page-2",
        "pdf-page-3",
        "pdf-page-4",
        "pdf-page-5"
      ];

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      const marginX = 10;
      const headerHeight = 11;
      const footerHeight = 10;
      const maxContentWidth = pageWidth - (marginX * 2); // 190mm
      const maxContentHeight = pageHeight - headerHeight - footerHeight - 4; // ~272mm

      let renderedPages = 0;

      for (let i = 0; i < pageIds.length; i++) {
        const el = document.getElementById(pageIds[i]);
        if (!el) continue;

        const canvas = await html2canvas(el, {
          scale: 2, // 2x retina crispness
          useCORS: true,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: "#ffffff",
          logging: false,
          windowWidth: 1100
        });

        if (renderedPages > 0) {
          doc.addPage();
        }
        renderedPages++;

        // Draw Running Header (Brand Blue #153E97)
        doc.setFillColor(21, 62, 151);
        doc.rect(0, 0, pageWidth, headerHeight, "F");

        if (logoBase64) {
          doc.setFillColor(255, 255, 255);
          doc.circle(marginX + 4, headerHeight / 2, 3.5, "F");
          try {
            doc.addImage(logoBase64, "PNG", marginX + 1.5, (headerHeight / 2) - 2.5, 5, 5);
          } catch (e) {}
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("User Manual CRM Operations • Confidential & Proprietary", marginX + 10, (headerHeight / 2) + 1.2);
        } else {
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text("User Manual CRM Operations • Confidential & Proprietary", marginX, (headerHeight / 2) + 1.2);
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(225, 235, 255);
        doc.text("SOP Ref: MHIRA-SOP-2026-v1.2", pageWidth - marginX, (headerHeight / 2) + 1.2, { align: "right" });

        // Place Captured DOM Canvas into PDF Body
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const naturalImgHeight = (canvas.height * maxContentWidth) / canvas.width;
        const renderHeight = Math.min(naturalImgHeight, maxContentHeight);
        const renderWidth = (canvas.width * renderHeight) / canvas.height;
        const posX = marginX + ((maxContentWidth - renderWidth) / 2);
        const posY = headerHeight + 2;

        doc.addImage(imgData, "JPEG", posX, posY, renderWidth, renderHeight, undefined, "FAST");

        // Draw Running Footer
        doc.setDrawColor(210, 220, 230);
        doc.setLineWidth(0.3);
        doc.line(marginX, pageHeight - 7, pageWidth - marginX, pageHeight - 7);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(130, 140, 150);
        doc.text("User Manual CRM Operations • Confidential & Proprietary", marginX, pageHeight - 3.5);
        doc.text(`Page ${renderedPages} of ${pageIds.length}`, pageWidth - marginX, pageHeight - 3.5, { align: "right" });
      }

      doc.save("MHIRA_CRM_Operations_Manual.pdf");
      showSuccessToast("Official User Manual CRM Operations PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF Export error:", err);
      showErrorToast("Direct PDF capture encountered an error. Opening print preview...");
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const phaseTabs = [
    { id: "all", label: "All Procedures", icon: BookOpen },
    { id: "inventory", label: "1. Inventory & FEFO WIP", icon: Package },
    { id: "marketing", label: "2. Marketing Merchandising", icon: Megaphone },
    { id: "customer", label: "3. Customer Storefront", icon: ShoppingBag },
    { id: "logistics", label: "4. Logistics Fulfillment", icon: Truck },
    { id: "admin", label: "5. Admin Governance", icon: ShieldCheck }
  ];

  return (
    <div className="space-y-6 font-['Poppins',sans-serif] text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900 print:p-0 print:m-0">
      
      {/* ========================================================================= */}
      {/* PDF PAGE 1: BRAND LOGO HEADER & 5-PHASE LIFECYCLE OVERVIEW               */}
      {/* ========================================================================= */}
      <div id="pdf-page-1" className="space-y-6">
        {/* CENTERED BRAND LOGO THUMBNAIL & OFFICIAL OPERATIONS HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden">
        {/* Decorative Top Accent Bar matching brand colors */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#153E97] via-blue-600 to-[#153E97]" />

        {/* Centered Circular Logo Thumbnail */}
        <div className="relative group">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-50 border-2 border-[#153E97] p-2 flex items-center justify-center shadow-lg shadow-blue-900/10 hover:scale-105 transition-transform duration-300">
            <img
              src="/mhira_removebg.png"
              alt="MHIRA Natural Soap & Cosmetics"
              crossOrigin="anonymous"
              className="w-full h-full object-contain filter drop-shadow-xs"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-[#153E97] text-white text-[9px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-xs whitespace-nowrap">
            OFFICIAL
          </span>
        </div>

        {/* Title, Confidential & Proprietary Tagline */}
        <div className="space-y-1.5 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#153E97] text-xs font-bold tracking-wide uppercase whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>User Manual CRM Operations • Confidential &amp; Proprietary</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight whitespace-nowrap">
            MHIRA Natural Soap &amp; Cosmetics CRM Operations
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xl mx-auto">
            Comprehensive Standard Operating Procedures (SOP) across Inventory, Marketing Merchandising, Customer Storefront, Logistics Order Confirmation, and Admin Governance.
          </p>
        </div>

        {/* Quick Meta Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold whitespace-nowrap">
            SOP Ref: MHIRA-SOP-2026-v1.2
          </span>
          <span className="px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-[#153E97] font-semibold text-[11px] whitespace-nowrap">
            Brand Palette: #153E97 Primary Blue
          </span>
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px] whitespace-nowrap">
            Role: All Department Scopes
          </span>
          <span className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[11px] whitespace-nowrap">
            Confidential &amp; Proprietary
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXCEL RIBBON TOOLBAR (EXACT MATCH WITH PRODUCT CATALOG TOOLBAR)           */}
      {/* ========================================================================= */}
      <div className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3 print:hidden ${isGeneratingPdf ? 'hidden' : ''}`}>
        {/* EXCEL SHEET TABS (DISPLAYED ONLY ONCE AT THE TOP) */}
        <div className="flex items-center justify-between bg-white px-1 pt-0 pb-0 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {phaseTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePhase(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${
                  activePhase === tab.id
                    ? "border-[#153E97] text-[#153E97] bg-blue-50/50 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            ))}
          </div>
          <div className="text-[11px] font-mono text-slate-400 font-semibold hidden lg:block shrink-0 pl-2 whitespace-nowrap">
            Operations Manual v1.2.0
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR ACTIONS & STRUCTURED FILTERS */}
        <div className="py-1 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
          {/* ACTIONS GROUP */}
          <div className="w-[230px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
            <div className="flex items-stretch gap-1.5 flex-1">
              {/* Primary Large Button: Download PDF */}
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleDownloadPdf}
                className="w-[78px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#153E97] disabled:opacity-50"
                title="Download Official PDF Operations Manual"
              >
                {isGeneratingPdf ? (
                  <RotateCcw className="w-5 h-5 mb-0.5 text-[#153E97] animate-spin" />
                ) : (
                  <FileDown className="w-5 h-5 mb-0.5 text-[#153E97] group-hover:scale-110 transition-transform" />
                )}
                <span className="text-[11px] font-bold text-center leading-tight whitespace-nowrap">
                  {isGeneratingPdf ? "Generating..." : "Download PDF"}
                </span>
              </button>

              {/* Sub-Actions Column */}
              <div className="flex-1 min-w-[130px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#153E97] hover:bg-slate-100 transition-colors cursor-pointer w-full whitespace-nowrap"
                  title="Print to Paper / PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate whitespace-nowrap">Print Manual</span>
                </button>
                <button
                  type="button"
                  onClick={expandAll}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#153E97] hover:bg-slate-100 transition-colors cursor-pointer w-full whitespace-nowrap"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate whitespace-nowrap">Expand All</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer w-full whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate whitespace-nowrap">Collapse All</span>
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none whitespace-nowrap">
              Document Actions
            </div>
          </div>

          {/* SEARCH & FILTER GROUP (NO DUPLICATE TABS) */}
          <div className="flex flex-col justify-between flex-1 min-h-[92px] pl-1">
            <div className="flex flex-col justify-between flex-1 gap-1.5 py-0.5">
              {/* Layer 1: Search Input */}
              <div className="relative flex items-center w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search SOP procedure, step, or role (e.g. 'auto deduct', 'finished goods', 'waybill', 'coupons')..."
                  className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Layer 2: Real Filter Controls (Replaces the duplicate buttons!) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                {/* Department Role Scope */}
                <div className="relative w-full">
                  <Layers className="w-3.5 h-3.5 absolute left-2 top-1.5 text-slate-400 pointer-events-none" />
                  <select
                    value={activePhase}
                    onChange={(e) => setActivePhase(e.target.value)}
                    className="w-full h-[24px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate font-medium whitespace-nowrap"
                  >
                    {phaseTabs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Section Content Filter */}
                <div className="relative w-full">
                  <FileText className="w-3.5 h-3.5 absolute left-2 top-1.5 text-slate-400 pointer-events-none" />
                  <select
                    value={contentFocus}
                    onChange={(e) => setContentFocus(e.target.value)}
                    className="w-full h-[24px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate font-medium whitespace-nowrap"
                  >
                    <option value="all">Content: Full SOP &amp; UI Screens</option>
                    <option value="sop">Content: SOP Steps &amp; Policies</option>
                    <option value="ui">Content: Actual Frontend UI Only</option>
                    <option value="faq">Content: Troubleshooting &amp; FAQs</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Filter Summary & Reset */}
                <div className="flex items-center justify-between px-2 h-[24px] bg-slate-50 border border-slate-200 rounded text-xs">
                  <span className="text-[11px] text-slate-600 truncate">
                    {searchQuery
                      ? `Search: "${searchQuery}"`
                      : activePhase !== "all"
                      ? `${phaseTabs.find((p) => p.id === activePhase)?.label.split(". ")[1] || "Filtered"}`
                      : "All 5 Departments"}
                  </span>
                  {(activePhase !== "all" || searchQuery || contentFocus !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setActivePhase("all");
                        setSearchQuery("");
                        setContentFocus("all");
                      }}
                      className="text-[10.5px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1 shrink-0 flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
              Search &amp; Operations Filter
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5-PHASE LIFECYCLE OVERVIEW CARD                                          */}
      {/* ========================================================================= */}
      {(activePhase === "all" || searchQuery) && contentFocus !== "faq" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleSection("pipeline")}
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#153E97] block">
                Overview • Inter-Department Flow
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>MHIRA System Operational Lifecycle</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#153E97] border border-blue-200">
                  Closed-Loop Production, Marketing &amp; Logistics Fulfillment
                </span>
              </h2>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-700 print:hidden">
              {isSectionExpanded("pipeline") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isSectionExpanded("pipeline") && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                The MHIRA System operates in a sequential lifecycle where each department hands over validated data to the next role, guaranteeing zero stock mismatch and complete auditability:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
                {/* 1. Inventory */}
                <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                  <div className="w-5 h-5 rounded bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center">1</div>
                  <span className="text-[10px] font-bold uppercase text-amber-700 block">Inventory</span>
                  <h3 className="font-bold text-slate-900 text-xs">Production &amp; Conversion</h3>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Receives raw materials. Executes WIP batch conversion with <strong>automated raw material stock deduction</strong> into Finished Goods.
                  </p>
                </div>

                {/* 2. Marketing */}
                <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200/80 space-y-1.5">
                  <div className="w-5 h-5 rounded bg-purple-600 text-white font-bold text-[11px] flex items-center justify-center">2</div>
                  <span className="text-[10px] font-bold uppercase text-purple-700 block">Marketing</span>
                  <h3 className="font-bold text-slate-900 text-xs">Merchandising &amp; Catalog</h3>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Takes finished goods, assigns retail price, photography, and descriptions. Publishes to storefront and sets up promo vouchers.
                  </p>
                </div>

                {/* 3. Customer */}
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                  <div className="w-5 h-5 rounded bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center">3</div>
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">Customer</span>
                  <h3 className="font-bold text-slate-900 text-xs">Storefront Ordering</h3>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Customer browses live catalog, adds items to cart, applies voucher, and checks out with validated shipping address.
                  </p>
                </div>

                {/* 4. Logistics */}
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                  <div className="w-5 h-5 rounded bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center">4</div>
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">Logistics</span>
                  <h3 className="font-bold text-slate-900 text-xs">Order Confirmation &amp; Fulfillment</h3>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Acts as Order Confirmation desk. Validates customer address &amp; COD, generates courier waybills, and manages dispatch through delivery.
                  </p>
                </div>

                {/* 5. Admin */}
                <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200/80 space-y-1.5">
                  <div className="w-5 h-5 rounded bg-rose-600 text-white font-bold text-[11px] flex items-center justify-center">5</div>
                  <span className="text-[10px] font-bold uppercase text-rose-700 block">Admin</span>
                  <h3 className="font-bold text-slate-900 text-xs">Governance &amp; Maintenance</h3>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Manages staff permissions, monitors real-time activity audit trails, manages system maintenance mode, and runs cloud backups.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* PDF PAGE 2: PHASE 1 - INVENTORY MANAGEMENT MODULE                        */}
      {/* ========================================================================= */}
      {isSectionVisible("inventory") && isContentFocusMatch("sop") && (
        <div id="pdf-page-2" className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleSection("inventory")}
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
                Phase 01 • Inventory Management
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Raw Materials, WIP Batch Conversion &amp; Automated Stock Deduction</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Role: Inventory Staff
                </span>
              </h2>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-700 print:hidden">
              {isSectionExpanded("inventory") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isSectionExpanded("inventory") && (
            <div className="space-y-6 pt-1">
              {/* Step 1.1 */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1.1
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Inbound Raw Materials Stock-In &amp; Supplier Receiving
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      <strong>Navigation:</strong> <span className="font-mono text-amber-800 font-semibold">Sidebar &gt; Inventory &gt; Delivery Receiving</span>
                    </p>
                    <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                      Log incoming supplier shipments of coconut oils, lye, botanical extracts, and packaging. Record the PO number, batch lot number, inbound quantity, and FEFO expiry date before accepting items into warehouse stock.
                    </p>
                  </div>
                </div>

                {/* EXACT LIGHT THEME FRONTEND UI: DELIVERY RECEIVING TABLE */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      <span className="font-mono text-[11px] text-slate-600 font-semibold">Frontend View: Inventory &gt; Delivery Receiving Manifest</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Actual Screen UI
                    </span>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#153E97] text-white text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3 whitespace-nowrap">Item Code</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Raw Material Description</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Batch Lot No.</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap">Inbound Qty</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">FEFO Expiry Date</th>
                          <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">RM0027</td>
                          <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-sm shadow-2xs shrink-0">🥥</span>
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-bold whitespace-nowrap">Pure Virgin Coconut Oil</span>
                                <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">Cold-Pressed Botanical Grade</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-800 font-semibold whitespace-nowrap">LOT-CO-2026-04</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">+150.00 kg</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">October 15, 2028</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              Received
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">RM0034</td>
                          <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-sm shadow-2xs shrink-0">🧪</span>
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-bold whitespace-nowrap">Sodium Hydroxide (Lye)</span>
                                <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">Technical Grade 99% Saponifier</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-800 font-semibold whitespace-nowrap">LOT-LYE-2026-02</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">+50.00 kg</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">May 20, 2029</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              Received
                            </span>
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">RM0036</td>
                          <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-sm shadow-2xs shrink-0">✨</span>
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-bold whitespace-nowrap">Pure Kojic Dipalmitate</span>
                                <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">Skin Brightening Active Powder</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-amber-800 font-semibold whitespace-nowrap">LOT-KOJIC-2026-01</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">+25.00 kg</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">December 10, 2027</td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                              Received
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Step 1.2 */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1.2
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Work-in-Progress (WIP) Batch Conversion &amp; Automated Raw Material Deduction
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      <strong>Navigation:</strong> <span className="font-mono text-amber-800 font-semibold">Sidebar &gt; Inventory &gt; Work in Progress (WIP)</span>
                    </p>
                    <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                      Select the production formulation (e.g. <em>Gluta Kojic Soap Formula</em>) and enter the target output units. The system calculates exact recipe ratios and <strong>automatically deducts consumed raw materials from inventory</strong> upon clicking complete.
                    </p>
                  </div>
                </div>

                {/* EXACT LIGHT THEME FRONTEND UI: WIP CONVERSION MODAL */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <Factory className="w-4 h-4 text-amber-600" />
                      <span className="font-mono text-[11px] text-slate-700 font-bold">Frontend View: Batch Production &amp; Conversion Modal</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Auto-Deduction Engine
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3 shadow-2xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2.5 border-b border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Selected Formulation:</span>
                        <span className="font-bold text-slate-900">Gluta Kojic Soap Formula (Standard Batch: 5.00 kg)</span>
                      </div>
                      <div className="sm:text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Target Finished Output:</span>
                        <span className="font-mono font-black text-emerald-800 text-sm">100 Finished Bars (135g)</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                        Automated Raw Material Stock Deduction Preview:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 rounded bg-rose-50/60 border border-rose-200/80 flex justify-between items-center">
                          <span className="text-slate-800">Coconut Oil (RM0027):</span>
                          <span className="font-bold text-rose-700">-4.50 kg</span>
                        </div>
                        <div className="p-2 rounded bg-rose-50/60 border border-rose-200/80 flex justify-between items-center">
                          <span className="text-slate-800">Lye / NaOH (RM0034):</span>
                          <span className="font-bold text-rose-700">-1.50 kg</span>
                        </div>
                        <div className="p-2 rounded bg-rose-50/60 border border-rose-200/80 flex justify-between items-center">
                          <span className="text-slate-800">Kojic Powder (RM0036):</span>
                          <span className="font-bold text-rose-700">-0.20 kg</span>
                        </div>
                        <div className="p-2 rounded bg-rose-50/60 border border-rose-200/80 flex justify-between items-center">
                          <span className="text-slate-800">Papaya Extract (RM0024):</span>
                          <span className="font-bold text-rose-700">-0.30 kg</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>All ingredient balances verified. Stocks sufficient for production.</span>
                      </span>
                      <button
                        type="button"
                        className="px-3.5 py-1.5 bg-[#153E97] text-white rounded-lg font-bold text-xs shadow-xs hover:bg-blue-800 cursor-pointer whitespace-nowrap transition-colors"
                      >
                        Convert &gt;&gt; Finished Goods
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1.3 */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-amber-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1.3
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Finished Goods Stock Handover &amp; Inventory Completion
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      <strong>Navigation:</strong> <span className="font-mono text-amber-800 font-semibold">Sidebar &gt; Inventory &gt; Finished Goods</span>
                    </p>
                    <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                      The manufactured units are instantly registered in Finished Goods with lot numbers and FEFO tracking. Inventory's primary product creation task is now complete. The batch is automatically ready for Marketing to merchandise.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Handover Completed:</strong> Finished Goods inventory is stocked and waiting for Marketing staff to assign descriptions, prices, and images.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PDF PAGE 3: PHASE 2 - MARKETING MERCHANDISING                            */}
      {/* ========================================================================= */}
      {isSectionVisible("marketing") && isContentFocusMatch("sop") && (
        <div id="pdf-page-3" className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleSection("marketing")}
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block">
                Phase 02 • Marketing Management
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Product Merchandising, Storefront Publishing &amp; Campaigns</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                  Role: Marketing Staff
                </span>
              </h2>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-700 print:hidden">
              {isSectionExpanded("marketing") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isSectionExpanded("marketing") && (
            <div className="space-y-6 pt-1">
              {/* Step 2.1 */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2.1
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Storefront Product Merchandising: Pricing, Imagery &amp; Description
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      <strong>Navigation:</strong> <span className="font-mono text-purple-800 font-semibold">Sidebar &gt; Marketing &gt; Products Catalog</span>
                    </p>
                    <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                      Marketing selects the stocked finished goods, sets the public selling price, uploads studio photography, writes natural botanical descriptions, and toggles visibility to <strong>Published</strong>.
                    </p>
                  </div>
                </div>

                {/* EXACT LIGHT THEME FRONTEND UI: MARKETING PRODUCT MODAL */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-200">
                    <span className="font-mono text-[11px] text-slate-700 font-bold">Frontend View: Marketing &gt; Storefront Product Editor Modal</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                      Step 2.1 Interface
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3.5 shadow-2xs text-xs">
                    {/* Image Preview Box with Actual Frontend Image */}
                    <div className="border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-center text-center bg-slate-50/50 space-y-2">
                      <div className="w-24 h-24 rounded-lg bg-white border-2 border-slate-200 shadow-xs flex items-center justify-center overflow-hidden p-1 group">
                        <img
                          src="/uploads/product_serum.png"
                          alt="FACE SERUM COLLAGEN (30 ML)"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">Asset: /uploads/product_serum.png</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 whitespace-nowrap">
                        ✓ Real Frontend Photo Asset
                      </span>
                    </div>

                    {/* Details Form Fields */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block whitespace-nowrap">Product Name</label>
                          <input
                            type="text"
                            readOnly
                            value="FACE SERUM COLLAGEN (30 ML)"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-slate-800 whitespace-nowrap"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block whitespace-nowrap">Selling Price (PHP)</label>
                          <input
                            type="text"
                            readOnly
                            value="₱300.00"
                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-bold text-[#153E97] whitespace-nowrap"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block whitespace-nowrap">Storefront Botanical Benefits</label>
                        <textarea
                          readOnly
                          rows={2}
                          value="Artisanal collagen serum formulated with active Sodium Hyaluronate, organic Tomato & Cucumber extracts, Witch Hazel, and Azelaic Optima for skin elasticity and luminous glow."
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 text-[11px] text-slate-700"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">Storefront Status:</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Published &amp; Visible to Customers</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2.2 */}
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2.2
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      Marketing Campaign Suite: Products Vouchers, Feedback, Content &amp; Events
                    </h3>
                    <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                      Marketing coordinates promotional voucher codes, moderates customer testimonials, configures hero advertisements, updates brand storytelling, and manages wellness event calendars.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[#153E97] flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span>Products Vouchers</span>
                    </span>
                    <p className="text-[11px] text-slate-600">Create discount coupons (e.g. <code className="bg-white px-1 py-0.5 rounded font-mono text-purple-700">NATURAL20</code>) with minimum spend rules.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[#153E97] flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                      <span>Customer Feedback Process</span>
                    </span>
                    <p className="text-[11px] text-slate-600">Audit and approve verified customer product reviews and star ratings before public storefront display.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[#153E97] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Marketing Content</span>
                    </span>
                    <p className="text-[11px] text-slate-600">Update homepage hero carousels, seasonal sale banners, and organic skincare guidance articles.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[#153E97] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>Events Management</span>
                    </span>
                    <p className="text-[11px] text-slate-600">Publish organic trade shows, pop-up bazaars, and seasonal holiday sale schedules.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[#153E97] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                      <span>Our Story Management</span>
                    </span>
                    <p className="text-[11px] text-slate-600">Maintain corporate background, DTI/FDA manufacturing certifications, and brand heritage.</p>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <span className="font-bold text-[#153E97] flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-purple-600" />
                      <span>Products Promotions</span>
                    </span>
                    <p className="text-[11px] text-slate-600">Bundle finished soaps and teas into gift packages with discounted promotional prices.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PDF PAGE 4: PHASE 3 - CUSTOMER PORTAL & PHASE 4 - LOGISTICS FULFILLMENT   */}
      {/* ========================================================================= */}
      <div id="pdf-page-4" className="space-y-6">
        {isSectionVisible("customer") && isContentFocusMatch("sop") && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleSection("customer")}
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">
                Phase 03 • Customer Storefront
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Storefront Browsing, Cart, Checkout &amp; Loyalty Rewards</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Role: Customer / Shopper
                </span>
              </h2>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-700 print:hidden">
              {isSectionExpanded("customer") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isSectionExpanded("customer") && (
            <div className="space-y-5 pt-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-3">
                  <div className="border-l-2 border-emerald-600 pl-3 space-y-0.5">
                    <span className="font-mono text-xs font-bold text-emerald-700 uppercase">Step 3.1: Catalog Exploration &amp; Cart</span>
                    <p className="text-xs text-slate-600">
                      Customers explore <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[#153E97]">/collection</code>, review ingredients and feedback, and add items to cart.
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-600 pl-3 space-y-0.5">
                    <span className="font-mono text-xs font-bold text-emerald-700 uppercase">Step 3.2: Checkout &amp; Voucher Discount</span>
                    <p className="text-xs text-slate-600">
                      Customer enters Philippine delivery address, applies voucher code <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-emerald-800">NATURAL20</code>, and selects payment: <strong>Cash on Delivery (COD)</strong>, <strong>GCash</strong>, or <strong>Maya</strong>.
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-600 pl-3 space-y-0.5">
                    <span className="font-mono text-xs font-bold text-emerald-700 uppercase">Step 3.3: Order Tracking &amp; Loyalty Tiers</span>
                    <p className="text-xs text-slate-600">
                      Upon delivery completion, customer automatically earns <strong>1 Reward Point per ₱50 spent</strong>, unlocks tier badges (<strong>Gold</strong>, <strong>Silver</strong>, or <strong>Bronze</strong>), and submits customer feedback.
                    </p>
                  </div>
                </div>

                {/* EXACT LIGHT THEME FRONTEND UI: CUSTOMER CHECKOUT SUMMARY */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-200">
                    <span className="font-mono text-[11px] text-slate-700 font-bold">Frontend View: Customer Checkout Drawer</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Step 3.2 Interface
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 text-xs shadow-2xs">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                      <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 p-0.5 overflow-hidden shrink-0 shadow-2xs">
                        <img
                          src="/uploads/product_serum.png"
                          alt="FACE SERUM COLLAGEN (30 ML)"
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 block truncate">1x FACE SERUM COLLAGEN (30 ML)</span>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">SKU: FG0004 • ₱300.00 each</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 whitespace-nowrap text-right">₱300.00</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="whitespace-nowrap">Voucher Applied (NATURAL20):</span>
                      <span className="font-mono font-bold whitespace-nowrap">-₱60.00</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="whitespace-nowrap">Standard Shipping (Cabuyao, Laguna):</span>
                      <span className="font-mono font-bold text-slate-900 whitespace-nowrap">₱65.00</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-bold">
                      <span className="text-slate-900 whitespace-nowrap">Total Amount:</span>
                      <span className="font-mono text-[#153E97] whitespace-nowrap">₱305.00</span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 whitespace-nowrap">Method: Cash on Delivery</span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200 whitespace-nowrap">
                        Status: Order Placed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PHASE 4: LOGISTICS FULFILLMENT & ORDER CONFIRMATION */}
        {isSectionVisible("logistics") && isContentFocusMatch("sop") && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleSection("logistics")}
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
                Phase 04 • Logistics Fulfillment &amp; Order Confirmation
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Order Confirmation, Thermal Waybill Printing &amp; Courier Dispatch</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                  Role: Logistics Staff
                </span>
              </h2>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-700 print:hidden">
              {isSectionExpanded("logistics") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isSectionExpanded("logistics") && (
            <div className="space-y-5 pt-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <div className="space-y-3">
                  <div className="border-l-2 border-blue-600 pl-3 space-y-0.5">
                    <span className="font-mono text-xs font-bold text-blue-700 uppercase">Step 4.1: Customer Order Confirmation &amp; Verification</span>
                    <p className="text-xs text-slate-600">
                      <strong>Navigation:</strong> <span className="font-mono text-blue-800 font-semibold">Sidebar &gt; Logistics &gt; Order Management</span>
                    </p>
                    <p className="text-xs text-slate-600 pt-0.5 leading-relaxed">
                      Logistics serves as the official <strong>Order Confirmation</strong> authority. The team monitors incoming orders placed by customers, verifies Philippine delivery addresses, validates Cash on Delivery (COD) / digital payment status, and confirms the order from <strong>Order Placed</strong> into <strong>Processing</strong>.
                    </p>
                  </div>

                  <div className="border-l-2 border-blue-600 pl-3 space-y-0.5">
                    <span className="font-mono text-xs font-bold text-blue-700 uppercase">Step 4.2: Thermal Waybill Printing &amp; Courier Dispatch</span>
                    <p className="text-xs text-slate-600">
                      Upon confirmation, Logistics generates official courier thermal waybill stickers (J&amp;T Express, LBC) with scannable barcodes and tracking numbers, affixes labels onto packages, and updates status to <strong>In Transit</strong>.
                    </p>
                  </div>

                  <div className="border-l-2 border-blue-600 pl-3 space-y-0.5">
                    <span className="font-mono text-xs font-bold text-blue-700 uppercase">Step 4.3: Delivery Handover &amp; Customer Completion</span>
                    <p className="text-xs text-slate-600">
                      Upon courier delivery handover, Logistics marks the order as <strong>Delivered</strong>, completing the order fulfillment lifecycle and automatically triggering customer loyalty reward points.
                    </p>
                  </div>
                </div>

                {/* EXACT LIGHT THEME FRONTEND UI: LOGISTICS ORDER CONFIRMATION & THERMAL WAYBILL CARD */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-200">
                    <span className="font-mono text-[11px] text-slate-700 font-bold">Frontend View: Logistics Express &gt; Order Confirmation &amp; Waybill</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      Step 4.1 &amp; 4.2 Interface
                    </span>
                  </div>

                  <div className="bg-white border-2 border-slate-800 rounded-lg p-3.5 space-y-2.5 font-mono text-xs shadow-2xs text-slate-900">
                    <div className="flex justify-between items-center border-b border-slate-300 pb-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-50 border border-[#153E97] p-0.5 flex items-center justify-center shrink-0">
                          <img src="/mhira_removebg.png" alt="Mhira Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-black text-[#153E97] whitespace-nowrap">MHIRA LOGISTICS EXPRESS</span>
                      </div>
                      <span className="font-bold text-blue-700 whitespace-nowrap">TRACKING: #JNT-PH-00293182</span>
                    </div>

                    {/* Scannable Barcode Representation */}
                    <div className="flex flex-col items-center justify-center py-1.5 bg-slate-50 border border-slate-200 rounded">
                      <div className="flex items-center gap-0.5 h-7">
                        {[3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3].map((w, idx) => (
                          <div key={idx} className="bg-slate-900 h-full rounded-xs" style={{ width: `${w * 1.5}px` }} />
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-600 font-mono tracking-widest pt-0.5 whitespace-nowrap">JNT-PH-00293182</span>
                    </div>

                    <div className="space-y-0.5 text-[11px]">
                      <p className="whitespace-nowrap"><span className="font-bold">Sender:</span> Mhira Natural Soap &amp; Cosmetics, Cabuyao, Laguna</p>
                      <p className="whitespace-nowrap"><span className="font-bold">Recipient:</span> Kent Bundalian (0906 525 847)</p>
                      <p className="whitespace-nowrap"><span className="font-bold">Address:</span> Brgy. Sala, Cabuyao, Laguna, Philippines 4025</p>
                      <p className="whitespace-nowrap"><span className="font-bold">Contents:</span> 2x Gluta-Kojic Soap (135g)</p>
                      <p className="font-sans text-[10px] text-emerald-800 font-bold pt-0.5 whitespace-nowrap">✓ Order Confirmed by Logistics Desk</p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-300 flex justify-between items-center text-xs">
                      <span className="font-bold whitespace-nowrap">Payment: COD Collect</span>
                      <span className="font-black text-emerald-800 text-sm whitespace-nowrap">₱353.00</span>
                    </div>

                    <div className="flex gap-2 pt-1 font-sans">
                      <button type="button" className="flex-1 py-1.5 bg-[#153E97] text-white rounded font-bold text-xs hover:bg-blue-800 cursor-pointer whitespace-nowrap transition-colors">
                        Confirm &amp; Print Waybill
                      </button>
                      <button type="button" className="flex-1 py-1.5 bg-blue-600 text-white rounded font-bold text-xs hover:bg-blue-700 cursor-pointer whitespace-nowrap transition-colors">
                        Dispatch (In Transit)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* ========================================================================= */}
      {/* PDF PAGE 5: PHASE 5 - ADMIN GOVERNANCE & TROUBLESHOOTING FAQS             */}
      {/* ========================================================================= */}
      <div id="pdf-page-5" className="space-y-6">
        {isSectionVisible("admin") && isContentFocusMatch("sop") && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleSection("admin")}
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">
                Phase 05 • Admin Governance
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Appearance, User Security, Maintenance &amp; Cloud Backups</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                  Role: Admin
                </span>
              </h2>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-700 print:hidden">
              {isSectionExpanded("admin") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isSectionExpanded("admin") && (
            <div className="space-y-5 pt-1">
              <p className="text-xs text-slate-600 leading-relaxed">
                The Admin role governs platform integrity, security compliance (RA 10173 Philippine Data Privacy Act), and disaster recovery:
              </p>

              {/* 5 Admin Governance Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-purple-600" />
                    <span>Appearance</span>
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono">Admin &gt; Appearance</p>
                  <p className="text-[11px] text-slate-600">Customizes visual themes, sidebar background gradients, and role header accents for each department.</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-rose-600" />
                    <span>User Management</span>
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono">Admin &gt; User Management</p>
                  <p className="text-[11px] text-slate-600">Creates staff accounts, assigns role permissions, resets credentials, and deactivates former employee access.</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>User Activity</span>
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono">Admin &gt; User Activity</p>
                  <p className="text-[11px] text-slate-600">Monitors immutable security audit logs including login timestamps, batch conversions, and status updates.</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    <span>System Maintenance</span>
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono">Admin &gt; System Maintenance</p>
                  <p className="text-[11px] text-slate-600">Activates emergency maintenance mode during updates, locking storefront while keeping admin access active.</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 md:col-span-2 lg:col-span-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Data Backup &amp; Recovery</span>
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono">Admin &gt; Data Backup</p>
                  <p className="text-[11px] text-slate-600">Generates one-click JSON / MongoDB database snapshot exports, ensuring comprehensive disaster recovery for all orders and catalogs.</p>
                </div>
              </div>

              {/* EXACT LIGHT THEME FRONTEND UI: USER MANAGEMENT TABLE */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 pb-1.5 border-b border-slate-200">
                  <span className="font-mono text-[11px] text-slate-700 font-bold">Frontend View: Admin &gt; User Management Directory</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                    Step 5.2 Interface
                  </span>
                </div>

                <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#153E97] text-white text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3 whitespace-nowrap">Staff Member &amp; Handle</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">Email Address</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">Assigned Role</th>
                        <th className="py-2.5 px-3 text-center whitespace-nowrap">Account Status</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">System Access Scope</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              AD
                            </div>
                            <div>
                              <span className="font-bold block text-slate-900 whitespace-nowrap">Administrator</span>
                              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">@admin</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">admin@mhiracosmetics.ph</td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                            Admin
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            Active
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          Full System Governance, Maintenance Mode &amp; Cloud Backup
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 border border-blue-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              KB
                            </div>
                            <div>
                              <span className="font-bold block text-slate-900 whitespace-nowrap">Kent Bundalian</span>
                              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">@logistics_kent</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">logistics@mhiracosmetics.ph</td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                            Logistic
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            Active
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          Order Confirmation Desk, Thermal Waybill &amp; Courier Handover
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              IO
                            </div>
                            <div>
                              <span className="font-bold block text-slate-900 whitespace-nowrap">Inventory Officer</span>
                              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">@inv_officer</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">inventory@mhiracosmetics.ph</td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                            Inventory
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            Active
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          Raw Materials Receiving, FEFO Expiry &amp; WIP Auto-Deductions
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 border border-purple-300 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              ML
                            </div>
                            <div>
                              <span className="font-bold block text-slate-900 whitespace-nowrap">Marketing Lead</span>
                              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">@marketing_team</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">marketing@mhiracosmetics.ph</td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
                            Marketing
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                            Active
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          Storefront Products Catalog, Vouchers, Promotions &amp; Content
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FREQUENTLY ASKED QUESTIONS & TROUBLESHOOTING */}
        {(isSectionVisible("all") || isContentFocusMatch("faq")) && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 print:border-none print:shadow-none print:p-0">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => toggleSection("faq")}
          >
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Support &amp; Troubleshooting
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Frequently Asked Questions &amp; Diagnostics</span>
              </h2>
            </div>
            <button type="button" className="text-slate-400 hover:text-slate-700 print:hidden">
              {isSectionExpanded("faq") ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isSectionExpanded("faq") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#153E97]" />
                  <span>How does raw material auto-deduction prevent stock discrepancy?</span>
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  When the Inventory officer finishes a batch in WIP, the formula mathematically calculates ingredient ratios and automatically reduces raw material quantities while incrementing Finished Goods, ensuring zero unrecorded consumption.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#153E97]" />
                  <span>Can Marketing publish finished goods without Inventory stock?</span>
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Marketing can prepare copy and upload product photos, but storefront stock availability strictly mirrors verified Finished Goods inventory counts to prevent overselling.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#153E97]" />
                  <span>Why is Logistics the official Order Confirmation authority?</span>
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Logistics validates Philippine shipping destinations, checks parcel weight against courier shipping rates, confirms COD contact legitimacy, and transitions orders into Processing before printing thermal waybills.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#153E97]" />
                  <span>How do Customer Loyalty Tiers (Gold, Silver, Bronze) work?</span>
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Customers earn 1 reward point per ₱50 spent on delivered orders. Spending thresholds: Bronze (&lt;₱1,000), Silver (₱1,000+), Gold (₱5,000+), and Platinum (₱10,000+).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#153E97]" />
                  <span>How do I export this manual as an official PDF document?</span>
                </h3>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Click the <strong>"Download PDF"</strong> button on the Excel-style toolbar to generate an official document, or click <strong>"Print Manual"</strong> (<kbd className="px-1 py-0.5 rounded bg-white border border-slate-300 font-mono text-[9px]">Ctrl + P</kbd>) for visual printing.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
