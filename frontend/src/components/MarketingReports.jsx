import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  Search,
  ShoppingBag,
  Tag,
  Megaphone,
  Star,
  RotateCcw,
  RefreshCw,
  X,
  ChevronDown,
  Printer,
  FileText
} from "lucide-react";
import axios, { API } from "../axios";

import TablePagination from "./common/TablePagination";

function MarketingReports() {
  const [reportType, setReportType] = useState("catalog-matrix");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [catalog, setCatalog] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [feedback, setFeedback] = useState([]);

  const API_BASE_URL = import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com'
    : 'http://localhost:5000';

  useEffect(() => {
    fetchMarketingData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, searchTerm]);

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [catRes, cpnRes, fbRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/marketing/catalog`, { headers }),
        axios.get(`${API_BASE_URL}/api/coupons`, { headers }),
        axios.get(`${API_BASE_URL}/api/feedback`, { headers })
      ]);

      if (catRes.status === "fulfilled" && Array.isArray(catRes.value.data)) {
        setCatalog(catRes.value.data);
      }
      if (cpnRes.status === "fulfilled" && Array.isArray(cpnRes.value.data)) {
        setCoupons(cpnRes.value.data);
      }
      if (fbRes.status === "fulfilled" && Array.isArray(fbRes.value.data)) {
        setFeedback(fbRes.value.data);
      }
    } catch (error) {
      console.error("Error fetching marketing report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const filteredCatalog = catalog.filter((c) =>
    (c.itemDescription || c.name || c.category || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCoupons = coupons.filter((cp) =>
    (cp.code || cp.discount || "").toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFeedback = feedback.filter((f) =>
    (f.customerName || f.comment || f.productName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentTotal = reportType === "catalog-matrix"
    ? filteredCatalog.length
    : reportType === "coupons-report"
    ? filteredCoupons.length
    : filteredFeedback.length;

  const paginatedCatalog = filteredCatalog.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedCoupons = filteredCoupons.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const paginatedFeedback = filteredFeedback.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-800">
      {/* HEADER & PRINT CONTROLS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-[#01390f]">
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-xs font-bold uppercase whitespace-nowrap">Storefront & Promotions</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 whitespace-nowrap">
            Marketing & Catalog Performance Reports
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Generate printable PDF reports for storefront product price matrices, coupon performance, and customer review audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-2 bg-[#01390f] hover:bg-[#012409] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="whitespace-nowrap">Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* EXCEL SHEET TABS & RIBBON TOOLBAR CONTAINER */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-6 print:hidden">
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "catalog-matrix", label: "Catalog Price Matrix" },
              { id: "coupons-report", label: "Voucher & Coupon Log" },
              { id: "feedback-audit", label: "Customer Reviews Audit" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportType(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                  reportType === tab.id
                    ? "border-[#01390f] text-[#01390f] bg-slate-50"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
          {/* ACTIONS GROUP */}
          <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
            <div className="flex items-stretch gap-1.5 flex-1">
              <button
                type="button"
                onClick={handlePrintPDF}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Download or Print PDF Report"
              >
                <Download className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-center leading-tight">Export PDF</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={fetchMarketingData}
                  disabled={loading}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? "animate-spin" : ""}`} />
                  <span className="truncate">Refresh Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Print View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
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
                  placeholder="Search Catalog, Coupon Code, Reviewer..."
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
                    <option value="catalog-matrix">Catalog Price Matrix</option>
                    <option value="coupons-report">Voucher & Coupon Log</option>
                    <option value="feedback-audit">Customer Reviews Audit</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Scope Select */}
                <div className="relative w-full">
                  <Tag className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="all">Scope: All Entries</option>
                    <option value="active">Scope: Active Only</option>
                    <option value="featured">Scope: Featured/VIP</option>
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
                  onClick={() => setReportType("catalog-matrix")}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    reportType === "catalog-matrix"
                      ? "bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Catalog Matrix
                </button>

                <button
                  type="button"
                  onClick={() => setReportType("coupons-report")}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    reportType === "coupons-report"
                      ? "bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Vouchers Log
                </button>

                <button
                  type="button"
                  onClick={() => setReportType("feedback-audit")}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    reportType === "feedback-audit"
                      ? "bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Reviews Audit
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

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        
        {/* REPORT OFFICIAL HEADER (Appears on Screen & PDF) */}
        <div className="border-b border-slate-200 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-lg font-black text-[#01390f] uppercase whitespace-nowrap">
              Mhira Natural Soap & Cosmetics Mfg.
            </h2>
            <p className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
              {reportType === "catalog-matrix"
                ? "Published Storefront Catalog & Price Matrix Report"
                : reportType === "coupons-report"
                ? "Promotional Vouchers & Coupon Discounts Summary"
                : "Customer Rating & Feedback Review Log"}
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-mono">
            <div>Generated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
            <div>Department: Marketing & Customer Engagement</div>
          </div>
        </div>

        {/* METRICS SUMMARY ROW */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Store Catalog Items</span>
            <span className="text-xl font-extrabold text-[#01390f] block mt-0.5 whitespace-nowrap">{catalog.length} Products</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Active Coupons</span>
            <span className="text-xl font-extrabold text-[#01390f] block mt-0.5 whitespace-nowrap">{coupons.length} Vouchers</span>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase block whitespace-nowrap">Customer Satisfaction</span>
            <span className="text-xl font-extrabold text-amber-600 block mt-0.5 whitespace-nowrap">5.0 / 5.0 Star Avg</span>
          </div>
        </div>

        {/* TABLE CONTAINER & MASTERLIST */}
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
          {reportType === "catalog-matrix" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">Product Title</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Retail Price (₱)</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Promo Discount</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCatalog.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400 italic whitespace-nowrap">
                        No marketing catalog products available.
                      </td>
                    </tr>
                  ) : (
                    paginatedCatalog.map((item, i) => (
                      <tr key={item._id || i} className="hover:bg-slate-50/80 group">
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">{item.itemDescription || item.name || `Product #${i+1}`}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{item.category || "Herbal Soap"}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">₱{Number(item.price || 299).toFixed(2)}</td>
                        <td className="py-3 px-4 font-mono text-emerald-700 whitespace-nowrap">{item.discount || "Standard"}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-[#01390f] border border-emerald-200/60 whitespace-nowrap">
                            Published
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === "coupons-report" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">Voucher Code</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Discount Value</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Target Segment</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-slate-400 italic whitespace-nowrap">
                        No coupon voucher records available.
                      </td>
                    </tr>
                  ) : (
                    paginatedCoupons.map((c, i) => (
                      <tr key={c._id || i} className="hover:bg-slate-50/80 group">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">{c.code || `PROMO-${i+1}`}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">{c.discount || "10% OFF"}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{c.target || "All Customers"}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 whitespace-nowrap">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {reportType === "feedback-audit" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Product Reviewed</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Rating</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Feedback Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFeedback.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-slate-400 italic whitespace-nowrap">
                        No customer feedback records available.
                      </td>
                    </tr>
                  ) : (
                    paginatedFeedback.map((f, i) => (
                      <tr key={f._id || i} className="hover:bg-slate-50/80 group">
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">{f.customerName || "Customer Reviewer"}</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{f.productName || "Natural Organic Soap"}</td>
                        <td className="py-3 px-4 font-bold text-amber-500 whitespace-nowrap font-mono">5.0 ⭐</td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{f.comment || "Extremely hydrating, great natural aroma!"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* REPORT SIGN-OFF FOOTER */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <div className="font-semibold text-slate-700 whitespace-nowrap">Verified By:</div>
            <div className="mt-4 border-b border-slate-400 w-48"></div>
            <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Marketing Manager Signature</div>
          </div>
          <div className="text-right text-[10px] text-slate-400">
            Page 1 of 1 • Storefront Performance Audit
          </div>
        </div>

      </div>
    </div>
  );
}

export default MarketingReports;
