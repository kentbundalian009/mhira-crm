import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Tag,
  Trash2,
  Calendar,
  Users,
  Copy,
  Loader2,
  Award,
  Search,
  CheckCircle2,
  Percent,
  RefreshCw,
  Download,
  Filter,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Clock,
  Check,
  AlertCircle,
  X,
  FileDown,
  ArrowUpDown
} from 'lucide-react';
import axios from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

function MarketingPromotions() {
  const [coupons, setCoupons] = useState([]);
  const [segments, setSegments] = useState({
    vip: { count: 0 },
    regular: { count: 0 },
    new: { count: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Active' | 'Expired'
  const [sortBy, setSortBy] = useState('newest');
  const [submitting, setSubmitting] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discount: '',
    minSpend: '',
    expiry: '',
    targetSegment: 'All',
  });

  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  const fetchCouponsAndSegments = async () => {
    try {
      setLoading(true);
      const [resCoupons, resSegments] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/coupons`),
        axios
          .get(`${API_BASE_URL}/api/users/segments`)
          .catch(() => ({
            data: {
              segments: {
                vip: { count: 3 },
                regular: { count: 12 },
                new: { count: 25 },
              },
            },
          })),
      ]);

      setCoupons(resCoupons.data || []);
      if (resSegments.data?.segments) {
        setSegments(resSegments.data.segments);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      showErrorToast('Failed to load promotional coupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponsAndSegments();
  }, []);

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/api/coupons`, newCoupon);
      setNewCoupon({ code: '', discount: '', minSpend: '', expiry: '', targetSegment: 'All' });
      setIsModalOpen(false);
      showSuccessToast('Targeted promotional coupon created successfully!');
      fetchCouponsAndSegments();
    } catch (err) {
      console.error('Error creating coupon:', err);
      showErrorToast(err.response?.data?.message || 'Failed to create coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to deactivate and remove this coupon?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/coupons/${id}`);
      showSuccessToast('Coupon removed successfully.');
      fetchCouponsAndSegments();
    } catch (err) {
      console.error('Error deleting coupon:', err);
      showErrorToast('Failed to delete coupon.');
    }
  };

  const handleCopyCode = (code, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showSuccessToast(`Copied code "${code}" to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to check expiry
  const checkIsExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const exp = new Date(expiryDate);
    // End of that day
    exp.setHours(23, 59, 59, 999);
    return exp < new Date();
  };

  // Filtered dataset
  const filteredCoupons = useMemo(() => {
    let result = coupons.filter((c) => {
      // 1. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const code = (c.code || '').toLowerCase();
        const seg = (c.targetSegment || '').toLowerCase();
        if (!code.includes(q) && !seg.includes(q)) return false;
      }

      // 2. Segment
      if (selectedSegment !== 'All') {
        if ((c.targetSegment || '').toLowerCase() !== selectedSegment.toLowerCase()) {
          return false;
        }
      }

      // 3. Status filter
      if (statusFilter !== 'All') {
        const expired = checkIsExpired(c.expiry);
        if (statusFilter === 'Active' && expired) return false;
        if (statusFilter === 'Expired' && !expired) return false;
      }

      return true;
    });

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'discount-desc') {
      result.sort((a, b) => (parseFloat(b.discount) || 0) - (parseFloat(a.discount) || 0));
    } else if (sortBy === 'discount-asc') {
      result.sort((a, b) => (parseFloat(a.discount) || 0) - (parseFloat(b.discount) || 0));
    } else if (sortBy === 'code-asc') {
      result.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    }

    return result;
  }, [coupons, searchQuery, selectedSegment, statusFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSegment, statusFilter, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim() !== '') count++;
    if (selectedSegment !== 'All') count++;
    if (statusFilter !== 'All') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [searchQuery, selectedSegment, statusFilter, sortBy]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedSegment('All');
    setStatusFilter('All');
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / itemsPerPage));
  const paginatedCoupons = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCoupons.slice(start, start + itemsPerPage);
  }, [filteredCoupons, currentPage, itemsPerPage]);

  // PDF Export
  const handleExportCouponsPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - PROMOTIONS & VOUCHERS AUDIT', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Active Promotional Coupons: ${filteredCoupons.length}`,
        14,
        18
      );

      const tableHead = [['#', 'Promo Code', 'Discount Rate', 'Minimum Spend', 'Target Audience', 'Expiry Date', 'Status']];
      const tableBody = filteredCoupons.map((c, idx) => {
        const expired = checkIsExpired(c.expiry);
        return [
          idx + 1,
          c.code || 'N/A',
          `${c.discount}% OFF`,
          c.minSpend ? `PHP ${Number(c.minSpend).toFixed(2)}` : 'No Minimum',
          c.targetSegment || 'All Shoppers',
          c.expiry ? new Date(c.expiry).toLocaleDateString() : 'No Expiry',
          expired ? 'Expired' : 'Active'
        ];
      });

      autoTable(doc, {
        startY: 32,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5
        },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
        styles: { cellPadding: 2.8 }
      });

      const fileName = `Coupons_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Coupons Audit: ${fileName}`);
    } catch (err) {
      console.error('PDF error:', err);
      showErrorToast('Failed to export PDF.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      {/* MAIN CONTAINER */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-6">
        
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'All', label: 'All Coupons' },
              { id: 'Active', label: 'Active Coupons' },
              { id: 'Expired', label: 'Expired / Inactive' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
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
                onClick={() => setIsModalOpen(true)}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Create a new promotional coupon code"
              >
                <Plus className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-center leading-tight">New Coupon</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={handleExportCouponsPdf}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                  title="Export Coupons Audit PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={fetchCouponsAndSegments}
                  disabled={loading}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer w-full"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Reset Filters</span>
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
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Coupon Code, Target Audience..."
                  className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Layer 2: 3-column Dropdowns */}
              <div className="grid grid-cols-3 gap-2 w-full">
                {/* Target Segment Select */}
                <div className="relative w-full">
                  <Users className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Target Audiences</option>
                    <option value="VIP">VIP Shoppers</option>
                    <option value="Regular">Regular Shoppers</option>
                    <option value="New">New Shoppers</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Status Select */}
                <div className="relative w-full">
                  <Clock className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Coupon Statuses</option>
                    <option value="Active">Active Coupons</option>
                    <option value="Expired">Expired Coupons</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Select */}
                <div className="relative w-full">
                  <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="discount-desc">Sort: Highest Discount</option>
                    <option value="discount-asc">Sort: Lowest Discount</option>
                    <option value="code-asc">Sort: Code (A-Z)</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'Active' ? 'All' : 'Active')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    statusFilter === 'Active'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Active Only
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment(selectedSegment === 'VIP' ? 'All' : 'VIP')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedSegment === 'VIP'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  VIP Only
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment(selectedSegment === 'New' ? 'All' : 'New')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedSegment === 'New'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  New Shoppers
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
              Search & Filter
            </div>
          </div>
        </div>

        {/* HR DIVIDER ABOVE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* TABLE MASTERLIST CONTAINER */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
          {/* TABLE TOP PAGINATION BAR */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredCoupons.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setItemsPerPage(rows);
              setCurrentPage(1);
            }}
          />

          <div className="overflow-x-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                  {/* Promo Code Column */}
                  <th className="py-3.5 px-4">
                    PROMO CODE
                  </th>
                  <th className="py-3.5 px-4 text-center">DISCOUNT RATE</th>
                  <th className="py-3.5 px-4 text-right">MINIMUM SPEND</th>
                  <th className="py-3.5 px-4">TARGET AUDIENCE</th>
                  <th className="py-3.5 px-4 text-center">EXPIRY DATE</th>
                  <th className="py-3.5 px-4 text-center">STATUS</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px]">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading promotional coupons...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedCoupons.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      No coupons found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedCoupons.map((c) => {
                    const expired = checkIsExpired(c.expiry);
                    const isCopied = copiedCode === c.code;

                    return (
                      <tr
                        key={c._id}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap group"
                      >
                        {/* Promo Code Column */}
                        <td className="py-3 px-4 font-mono font-bold text-[#01390f] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="tracking-wide">{c.code}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyCode(c.code, e)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                isCopied
                                  ? 'text-emerald-700 bg-emerald-100'
                                  : 'text-slate-400 hover:text-[#01390f] hover:bg-slate-100'
                              }`}
                              title="Copy Code"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            {c.discount}% OFF
                          </span>
                        </td>

                        {/* Min Spend */}
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {c.minSpend ? `₱${Number(c.minSpend).toFixed(2)}` : 'No Minimum'}
                        </td>

                        {/* Target Audience */}
                        <td className="py-3 px-4">
                          <span className="text-[11px] font-bold px-2.5 py-0.5 bg-emerald-50 text-[#01390f] rounded-full border border-emerald-200">
                            {c.targetSegment || 'All Shoppers'}
                          </span>
                        </td>

                        {/* Expiry Date */}
                        <td className="py-3 px-4 text-center font-mono text-slate-500 text-xs">
                          {c.expiry ? new Date(c.expiry).toLocaleDateString() : 'No Expiry'}
                        </td>

                        {/* Status Pill */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              expired
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-emerald-50 text-[#01390f] border-emerald-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                expired ? 'bg-slate-400' : 'bg-[#01390f]'
                              }`}
                            />
                            {expired ? 'Expired' : 'Active'}
                          </span>
                        </td>

                        {/* Action (Sticky Right) */}
                        <td className="py-3 px-4 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-20 min-w-[80px]">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCoupon(c._id, e)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Delete Coupon"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE COUPON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Create Promotional Coupon
                </h3>
                <p className="text-xs text-slate-400">
                  Generate targeted voucher codes with spend thresholds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Promo Voucher Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MHIRA20OFF"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-[#01390f] focus:outline-none focus:border-[#01390f] focus:bg-white uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Discount Percentage (%) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    placeholder="e.g. 20"
                    value={newCoupon.discount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Min Spend Requirement (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={newCoupon.minSpend}
                    onChange={(e) => setNewCoupon({ ...newCoupon, minSpend: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Target Customer Segment
                  </label>
                  <select
                    value={newCoupon.targetSegment}
                    onChange={(e) => setNewCoupon({ ...newCoupon, targetSegment: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer"
                  >
                    <option value="All">All Shoppers</option>
                    <option value="VIP">VIP Tier (High Value)</option>
                    <option value="Regular">Regular Shoppers</option>
                    <option value="New">New First-time Shoppers</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={newCoupon.expiry}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expiry: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 -mx-6 -mb-6 mt-4 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span className="whitespace-nowrap">{submitting ? 'Creating...' : 'Create Coupon'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingPromotions;