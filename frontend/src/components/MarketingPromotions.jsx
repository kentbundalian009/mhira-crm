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
  ArrowUpDown,
  Sparkles,
  Edit2,
  Archive,
  FileSpreadsheet,
  Hash,
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
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // View Mode ('active' = All Coupons | 'archived' = Archive Vault)
  const [viewMode, setViewMode] = useState('active');

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
    usageLimit: '',
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

  const handleOpenAddModal = () => {
    setEditingCoupon(null);
    setNewCoupon({
      code: '',
      discount: '',
      minSpend: '',
      usageLimit: '',
      expiry: '',
      targetSegment: 'All',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    const cleanDiscount = String(coupon.discount ?? '').replace(/[^0-9.]/g, '');
    const cleanMinSpend = String(coupon.minSpend ?? '').replace(/[^0-9.]/g, '');
    const cleanLimit = Number(coupon.usageLimit || 0);
    const cleanExpiry = coupon.expiry ? String(coupon.expiry).split('T')[0] : '';
    let normalizedSegment = coupon.targetSegment || 'All';
    if (normalizedSegment === 'VIP Spenders') normalizedSegment = 'VIP';
    if (normalizedSegment === 'New Customers') normalizedSegment = 'New';

    setNewCoupon({
      code: coupon.code || '',
      discount: cleanDiscount,
      minSpend: cleanMinSpend === '0' ? '' : cleanMinSpend,
      usageLimit: cleanLimit > 0 ? String(cleanLimit) : '',
      expiry: cleanExpiry,
      targetSegment: normalizedSegment,
    });
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount) return;

    setSubmitting(true);
    try {
      const payload = {
        ...newCoupon,
        usageLimit: Number(newCoupon.usageLimit) > 0 ? Number(newCoupon.usageLimit) : 0,
      };
      if (editingCoupon) {
        await axios.put(`${API_BASE_URL}/api/coupons/${editingCoupon._id}`, payload);
        showSuccessToast('Promotional coupon updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/api/coupons`, payload);
        showSuccessToast('Targeted promotional coupon created successfully!');
      }
      setNewCoupon({ code: '', discount: '', minSpend: '', usageLimit: '', expiry: '', targetSegment: 'All' });
      setEditingCoupon(null);
      setIsModalOpen(false);
      fetchCouponsAndSegments();
    } catch (err) {
      console.error('Error saving coupon:', err);
      showErrorToast(err.response?.data?.message || 'Failed to save coupon.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleArchive = async (coupon) => {
    const isCurrentlyArchived = Boolean(coupon.isArchived);
    const actionLabel = isCurrentlyArchived
      ? `Restore coupon "${coupon.code}" back to active coupons?`
      : `Move coupon "${coupon.code}" to the Archive Vault?`;

    if (!window.confirm(actionLabel)) return;

    try {
      await axios.put(`${API_BASE_URL}/api/coupons/${coupon._id}`, {
        isArchived: !isCurrentlyArchived,
        status: !isCurrentlyArchived ? 'Archived' : 'Active',
      });
      showSuccessToast(
        isCurrentlyArchived
          ? 'Coupon restored to active coupons!'
          : 'Coupon moved to Archive Vault!'
      );
      fetchCouponsAndSegments();
    } catch (err) {
      console.error('Error toggling archive status:', err);
      showErrorToast('Failed to update coupon archive state.');
    }
  };

  const handleDeleteCoupon = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this coupon?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/coupons/${id}`);
      showSuccessToast('Coupon permanently deleted.');
      fetchCouponsAndSegments();
    } catch (err) {
      console.error('Error deleting coupon:', err);
      showErrorToast('Failed to delete coupon.');
    }
  };

  // Helper to check expiry
  const checkIsExpired = (expiryDate) => {
    if (!expiryDate) return false;
    const exp = new Date(expiryDate);
    if (isNaN(exp.getTime())) return false;
    exp.setHours(23, 59, 59, 999);
    return exp < new Date();
  };

  // Filtered dataset
  const filteredCoupons = useMemo(() => {
    let result = coupons.filter((c) => {
      // 0. Archive Vault check
      const isItemArchived = Boolean(c.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;

      // 1. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const code = (c.code || '').toLowerCase();
        const seg = (c.targetSegment || '').toLowerCase();
        if (!code.includes(q) && !seg.includes(q)) return false;
      }

      // 2. Segment
      if (selectedSegment !== 'All') {
        const segLower = (c.targetSegment || '').toLowerCase();
        const selLower = selectedSegment.toLowerCase();
        if (!segLower.includes(selLower)) {
          return false;
        }
      }

      // 3. Status filter
      if (statusFilter !== 'All') {
        const expired = checkIsExpired(c.expiry);
        const limitReached = Number(c.usageLimit || 0) > 0 && Number(c.usedCount || 0) >= Number(c.usageLimit || 0);
        const isUnavailable = expired || limitReached;
        if (statusFilter === 'Active' && isUnavailable) return false;
        if (statusFilter === 'Expired' && !isUnavailable) return false;
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
  }, [coupons, viewMode, searchQuery, selectedSegment, statusFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, searchQuery, selectedSegment, statusFilter, sortBy]);

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
  const paginatedCoupons = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCoupons.slice(start, start + itemsPerPage);
  }, [filteredCoupons, currentPage, itemsPerPage]);

  const statusModules = useMemo(
    () => [
      { id: 'active', label: 'All Coupons' },
      { id: 'archived', label: 'Archive Vault' },
    ],
    []
  );

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      {/* MAIN CONTAINER */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-6">

        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
          <div className="flex items-center gap-1 -mb-px">
            {statusModules.map((mod) => {
              const isActive = viewMode === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setViewMode(mod.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                  }`}
                >
                  {mod.id === 'active' ? (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#01390f]" />
                  ) : (
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
          {/* ACTIONS GROUP */}
          <div className={`w-full ${viewMode === 'archived' ? 'lg:w-[140px]' : 'lg:w-[210px]'} shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]`}>
            <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
              {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
              {viewMode !== 'archived' && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Create a new promotional coupon code"
                >
                  <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    New<br />Coupon
                  </span>
                </button>
              )}

              {/* Stacked Compact Rows */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                {/* Reset Filters */}
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  disabled={activeFiltersCount === 0}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                  title={activeFiltersCount > 0 ? `Reset active filters (${activeFiltersCount})` : 'No active filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="whitespace-nowrap">
                    Reset Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                  </span>
                </button>
              </div>
            </div>

            {/* Group Caption */}
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
              Actions
            </div>
          </div>

          {/* SEARCH & FILTER GROUP */}
          <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
            <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                {/* Target Segment Select */}
                <div className="relative w-full">
                  <Users className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
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
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
                  >
                    <option value="All">All Coupon Statuses</option>
                    <option value="Active">Active Coupons</option>
                    <option value="Expired">Expired / Limit Reached</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Select */}
                <div className="relative w-full sm:col-span-2 md:col-span-1">
                  <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'Active' ? 'All' : 'Active')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                    statusFilter === 'Active'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  Active Only
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment(selectedSegment === 'VIP' ? 'All' : 'VIP')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${
                    selectedSegment === 'VIP'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  VIP Only
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment(selectedSegment === 'New' ? 'All' : 'New')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs sm:col-span-2 md:col-span-1 ${
                    selectedSegment === 'New'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  New Shoppers
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
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
                  <th className="py-3.5 px-4">PROMO CODE</th>
                  <th className="py-3.5 px-4 text-center">DISCOUNT RATE</th>
                  <th className="py-3.5 px-4 text-right">MINIMUM SPEND</th>
                  <th className="py-3.5 px-4 text-center">USAGE LIMIT</th>
                  <th className="py-3.5 px-4">TARGET AUDIENCE</th>
                  <th className="py-3.5 px-4 text-center">EXPIRY DATE</th>
                  <th className="py-3.5 px-4 text-center">STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
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
                      colSpan="8"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      {viewMode === 'archived'
                        ? 'No archived coupons in the vault.'
                        : 'No coupons found matching your search.'}
                    </td>
                  </tr>
                ) : (
                  paginatedCoupons.map((c) => {
                    const expired = checkIsExpired(c.expiry);
                    const rawDiscount = String(c.discount ?? '').replace(/%\s*OFF/i, '').trim();
                    const minSpendNum = Number(String(c.minSpend ?? '0').replace(/[^0-9.]/g, '')) || 0;
                    const limitNum = Number(c.usageLimit || 0);
                    const usedNum = Number(c.usedCount || 0);
                    const isLimitReached = limitNum > 0 && usedNum >= limitNum;

                    return (
                      <tr
                        key={c._id}
                        className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                      >
                        {/* 1. Promo Code Column */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                              {c.code}
                            </span>
                          </div>
                        </td>

                        {/* 2. Discount Rate (Matches Quantity Blue Theme) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                          {rawDiscount.includes('%') || rawDiscount.includes('₱')
                            ? `${rawDiscount} OFF`
                            : `${rawDiscount}% OFF`}
                        </td>

                        {/* 3. Min Spend */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {minSpendNum > 0 ? `₱${minSpendNum.toFixed(2)}` : 'No Minimum'}
                        </td>

                        {/* 4. Usage Limit */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {limitNum > 0 ? (
                            <span className={`font-bold ${isLimitReached ? 'text-rose-600' : 'text-slate-800'}`}>
                              {usedNum} / {limitNum}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-sans font-medium">Unlimited</span>
                          )}
                        </td>

                        {/* 5. Target Audience */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {c.targetSegment || 'All Shoppers'}
                        </td>

                        {/* 6. Expiry Date */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {c.expiry ? new Date(c.expiry).toLocaleDateString() : 'No Expiry'}
                        </td>

                        {/* 7. Status Column */}
                        <td
                          className={`px-4 py-3.5 whitespace-nowrap text-center text-slate-800 font-semibold text-xs transition-colors select-none ${
                            c.isArchived
                              ? 'bg-slate-200/60 group-hover:bg-slate-200/80'
                              : !expired && !isLimitReached
                              ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 group-hover:bg-amber-500/30'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.isArchived
                                  ? 'bg-slate-500'
                                  : !expired && !isLimitReached
                                  ? 'bg-emerald-500 animate-pulse'
                                  : 'bg-amber-400'
                              }`}
                            />
                            <span>
                              {c.isArchived
                                ? 'Archived'
                                : isLimitReached
                                ? 'Limit Reached'
                                : !expired
                                ? 'Active'
                                : 'Expired'}
                            </span>
                          </span>
                        </td>

                        {/* 8. Action (Sticky Right - Matching Finished Goods / Catalog Table) */}
                        <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px] transition-colors">
                          <div className="flex items-center justify-center gap-1.5">
                            {viewMode !== 'archived' ? (
                              <>
                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(c)}
                                  title="Edit Coupon"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Archive */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(c)}
                                  title="Archive Coupon"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Restore */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(c)}
                                  title="Restore Coupon"
                                  className="w-8 h-8 rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete permanently */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCoupon(c._id, e)}
                                  title="Delete Permanently"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
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

      {/* CREATE / EDIT COUPON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {editingCoupon ? 'Edit Promotional Coupon' : 'Create Promotional Coupon'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingCoupon
                    ? 'Modify existing voucher code settings, redemption limit, and spend thresholds'
                    : 'Generate targeted voucher codes with redemption limits and spend thresholds'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCoupon(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
                {/* 1. 2-COLUMN GRID: PROMO VOUCHER CODE & USAGE LIMIT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* PROMO VOUCHER CODE WITH QUICK-GENERATE */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Promo Voucher Code <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. MHIRA20OFF"
                          value={newCoupon.code}
                          onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                          className="w-full h-[34px] bg-slate-50 border border-slate-200 text-[#01390f] rounded-l-lg pl-8 pr-3 text-xs font-bold font-mono focus:outline-none focus:border-[#01390f] focus:bg-white uppercase transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const randomCode = 'MHIRA' + Math.floor(1000 + Math.random() * 9000);
                          setNewCoupon({ ...newCoupon, code: randomCode });
                        }}
                        className="h-[34px] bg-slate-100 hover:bg-slate-200/80 border-y border-r border-slate-200 rounded-r-lg px-3 text-xs font-semibold text-slate-700 cursor-pointer flex items-center justify-center shrink-0 transition-colors select-none"
                        title="Auto-generate promo code"
                      >
                        <span className="text-[10px] font-bold text-[#01390f] uppercase">Auto</span>
                      </button>
                    </div>
                  </div>

                  {/* USAGE / REDEMPTION LIMIT */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Usage Limit (Max Redemptions)
                    </label>
                    <div className="flex items-center">
                      <div className="h-[34px] bg-slate-100 border-y border-l border-slate-200 rounded-l-lg px-2.5 text-xs font-bold text-slate-500 flex items-center justify-center shrink-0">
                        <Hash className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 (Unlimited)"
                        value={newCoupon.usageLimit}
                        onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })}
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-r-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white font-mono transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. 2-COLUMN GRID: DISCOUNT PERCENTAGE & MIN SPEND */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DISCOUNT PERCENTAGE */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Discount Percentage (%) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <div className="h-[34px] bg-slate-100 border-y border-l border-slate-200 rounded-l-lg px-2.5 text-xs font-bold text-slate-500 flex items-center justify-center shrink-0">
                        <Percent className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        placeholder="e.g. 20"
                        value={newCoupon.discount}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-r-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white font-mono transition-colors"
                      />
                    </div>
                  </div>

                  {/* MIN SPEND REQUIREMENT */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Min Spend Requirement (₱)
                    </label>
                    <div className="flex items-center">
                      <div className="h-[34px] bg-slate-100 border-y border-l border-slate-200 rounded-l-lg px-3 text-xs font-bold text-slate-500 flex items-center justify-center shrink-0">
                        ₱
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 (No minimum)"
                        value={newCoupon.minSpend}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minSpend: e.target.value })}
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-r-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white font-mono transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. 2-COLUMN GRID: TARGET SEGMENT & EXPIRATION DATE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* TARGET CUSTOMER SEGMENT */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Target Customer Segment
                    </label>
                    <div className="relative">
                      <Users className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                      <select
                        value={newCoupon.targetSegment}
                        onChange={(e) => setNewCoupon({ ...newCoupon, targetSegment: e.target.value })}
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-8 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer appearance-none transition-colors"
                      >
                        <option value="All">All Shoppers (Public)</option>
                        <option value="VIP">VIP Tier (High Value)</option>
                        <option value="Regular">Regular Shoppers</option>
                        <option value="New">New First-time Shoppers</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* EXPIRATION DATE */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Expiration Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={newCoupon.expiry}
                        onChange={(e) => setNewCoupon({ ...newCoupon, expiry: e.target.value })}
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* STATUS HELPER NOTICE */}
                <div className="pt-1 text-xs text-slate-500">
                  <span>
                    {editingCoupon
                      ? 'Changes to this coupon will take effect immediately across checkout.'
                      : 'Coupon will be live immediately across customer checkout once saved.'}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCoupon(null);
                  }}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 whitespace-nowrap bg-[#01390f] hover:bg-[#0a5219] text-white cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span className="whitespace-nowrap">
                    {submitting
                      ? editingCoupon
                        ? 'Saving...'
                        : 'Creating...'
                      : editingCoupon
                      ? 'Save Changes'
                      : 'Create Coupon'}
                  </span>
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
