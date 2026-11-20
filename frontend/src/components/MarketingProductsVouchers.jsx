import { API_BASE_URL } from "../utils/apiConfig";
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Info,
  Eye,
} from 'lucide-react';
import axios from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

function MarketingProductsVouchers() {
  const [coupons, setCoupons] = useState([]);
  const [segments, setSegments] = useState({
    loyal: { count: 0 },
    silver: { count: 0 },
    bronze: { count: 0 },
    vip: { count: 0 },
    regular: { count: 0 },
    new: { count: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [viewCouponModal, setViewCouponModal] = useState(null);
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
    isPublished: true,
    note: '',
  });

  const expiryInputRef = useRef(null);

  const getTodayLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDate = useMemo(() => getTodayLocalDate(), []);


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
      isPublished: true,
      note: '',
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
    if (normalizedSegment === 'VIP Spenders' || normalizedSegment === 'VIP' || normalizedSegment === 'Loyal' || normalizedSegment === 'Gold') normalizedSegment = 'Gold Tier';
    if (normalizedSegment === 'Regular' || normalizedSegment === 'Silver') normalizedSegment = 'Silver Tier';
    if (normalizedSegment === 'New Customers' || normalizedSegment === 'New' || normalizedSegment === 'Bronze') normalizedSegment = 'Bronze Tier';

    const isLive =
      coupon.isPublished !== undefined
        ? Boolean(coupon.isPublished)
        : coupon.status !== 'Draft' && coupon.status !== 'Inactive';

    setNewCoupon({
      code: coupon.code || '',
      discount: cleanDiscount,
      minSpend: cleanMinSpend === '0' ? '' : cleanMinSpend,
      usageLimit: cleanLimit > 0 ? String(cleanLimit) : '',
      expiry: cleanExpiry,
      targetSegment: normalizedSegment,
      isPublished: isLive,
      note: coupon.note || '',
    });
    setIsModalOpen(true);
  };

  const handleAutoGenerateVoucherNote = () => {
    const codeStr = newCoupon.code ? newCoupon.code.toUpperCase() : 'MHIRA VOUCHER';
    const discStr = newCoupon.discount ? `${newCoupon.discount}% OFF` : 'Special Discount';
    const minStr = Number(newCoupon.minSpend) > 0 ? `with a minimum spend of ₱${Number(newCoupon.minSpend).toLocaleString()}` : 'with no minimum spend required';
    const segStr = newCoupon.targetSegment && newCoupon.targetSegment !== 'All' ? `exclusively for ${newCoupon.targetSegment} members` : 'valid for all verified Mhira Natural shoppers';
    const expStr = newCoupon.expiry ? `Valid until ${new Date(newCoupon.expiry).toLocaleDateString()}.` : 'Valid on regular and promotional items at checkout.';

    const generated = `Enjoy ${discStr} on your Mhira Natural botanical order using voucher code ${codeStr} (${minStr}), ${segStr}. ${expStr}`;
    setNewCoupon((prev) => ({ ...prev, note: generated }));
    showSuccessToast('Auto-generated promotional voucher note.');
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discount) return;

    setSubmitting(true);
    try {
      const isPub = Boolean(newCoupon.isPublished);
      const payload = {
        ...newCoupon,
        usageLimit: Number(newCoupon.usageLimit) > 0 ? Number(newCoupon.usageLimit) : 0,
        isPublished: isPub,
        status: isPub ? 'Active' : 'Draft',
        note: (newCoupon.note || '').trim(),
      };
      if (editingCoupon) {
        await axios.put(`${API_BASE_URL}/api/coupons/${editingCoupon._id}`, payload);
        showSuccessToast('Promotional coupon updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/api/coupons`, payload);
        showSuccessToast('Targeted promotional coupon created successfully!');
      }
      setNewCoupon({
        code: '',
        discount: '',
        minSpend: '',
        usageLimit: '',
        expiry: '',
        targetSegment: 'All',
        isPublished: true,
        note: '',
      });
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
        if (selLower.includes('gold') || selLower.includes('loyal') || selLower === 'vip') {
          if (!segLower.includes('gold') && !segLower.includes('loyal') && !segLower.includes('vip') && segLower !== 'all') return false;
        } else if (selLower.includes('silver') || selLower === 'regular') {
          if (!segLower.includes('silver') && !segLower.includes('regular') && segLower !== 'all') return false;
        } else if (selLower.includes('bronze') || selLower === 'new') {
          if (!segLower.includes('bronze') && !segLower.includes('new') && segLower !== 'all') return false;
        } else if (!segLower.includes(selLower) && segLower !== 'all') {
          return false;
        }
      }

      // 3. Status filter (Live vs Draft)
      if (statusFilter !== 'All') {
        const isLive =
          c.isPublished !== undefined
            ? Boolean(c.isPublished)
            : c.status !== 'Draft' && c.status !== 'Inactive';
        if ((statusFilter === 'Live' || statusFilter === 'Active') && !isLive) return false;
        if ((statusFilter === 'Draft' || statusFilter === 'Expired') && isLive) return false;
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
                  className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${isActive
                    ? 'border-[#153E97] text-[#153E97] bg-slate-50 rounded-t-lg font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                    }`}
                >
                  {mod.id === 'active' ? (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#153E97]" />
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
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#153E97]"
                  title="Create a new promotional coupon code"
                >
                  <Plus className="w-5.5 h-5.5 text-[#153E97] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
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
                  className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#153E97] h-[38px] font-normal shadow-2xs transition-colors"
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
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs font-medium"
                  >
                    <option value="All">All Customer Segments</option>
                    <option value="Gold Tier">Gold Tier</option>
                    <option value="Silver Tier">Silver Tier</option>
                    <option value="Bronze Tier">Bronze Tier</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Status Select */}
                <div className="relative w-full">
                  <Clock className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
                  >
                    <option value="All">All Status (Live &amp; Draft)</option>
                    <option value="Live">Live Only</option>
                    <option value="Draft">Draft Only</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Select */}
                <div className="relative w-full sm:col-span-2 md:col-span-1">
                  <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="discount-desc">Sort: Highest Discount</option>
                    <option value="discount-asc">Sort: Lowest Discount</option>
                    <option value="code-asc">Sort: Code (A-Z)</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: Quick Toggles for Segments & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'Live' ? 'All' : 'Live')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${statusFilter === 'Live'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Live Only
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment(selectedSegment === 'Gold Tier' ? 'All' : 'Gold Tier')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${selectedSegment === 'Gold Tier'
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-800 font-semibold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Gold Tier
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment(selectedSegment === 'Silver Tier' ? 'All' : 'Silver Tier')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${selectedSegment === 'Silver Tier'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Silver Tier
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSegment(selectedSegment === 'Bronze Tier' ? 'All' : 'Bronze Tier')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${selectedSegment === 'Bronze Tier'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Bronze Tier
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
                <tr className="bg-[#153E97] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4">PROMO CODE</th>
                  <th className="py-3.5 px-4 text-center">DISCOUNT RATE</th>
                  <th className="py-3.5 px-4 text-right">MINIMUM SPEND</th>
                  <th className="py-3.5 px-4 text-center">USAGE LIMIT</th>
                  <th className="py-3.5 px-4">TARGET AUDIENCE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">EXPIRY DATE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">STOREFRONT STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#153E97] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-12 text-[#153E97] font-medium italic whitespace-nowrap"
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
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="w-6 h-6 text-slate-300" />
                        <span>
                          {viewMode === 'archived'
                            ? 'No archived coupons found in the vault.'
                            : 'No coupons matched your search or filter criteria.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCoupons.map((c, idx) => {
                    const expired = checkIsExpired(c.expiry);
                    const rawDiscount = String(c.discount ?? '')
                      .replace(/%\s*OFF/i, '')
                      .trim();
                    const minSpendNum =
                      Number(String(c.minSpend ?? '0').replace(/[^0-9.]/g, '')) || 0;
                    const limitNum = Number(c.usageLimit || 0);
                    const usedNum = Number(c.usedCount || 0);
                    const isLimitReached = limitNum > 0 && usedNum >= limitNum;

                    // Status text & style categorization (Live vs Draft vs Archived)
                    const isCouponLive =
                      c.isPublished !== undefined
                        ? Boolean(c.isPublished)
                        : c.status !== 'Draft' && c.status !== 'Inactive';
                    let statusLabel = isCouponLive ? 'Live' : 'Draft';
                    let statusStyle = isCouponLive
                      ? 'bg-blue-500/20 group-hover:bg-blue-500/30 text-blue-900'
                      : 'bg-yellow-500/20 group-hover:bg-yellow-500/30 text-yellow-900';

                    if (c.isArchived) {
                      statusLabel = 'Archived';
                      statusStyle = 'bg-red-500/20 group-hover:bg-red-500/30 text-red-900';
                    }

                    return (
                      <tr
                        key={c._id || c.id || idx}
                        className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                      >
                        {/* 1. PROMO CODE */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                            {c.code || 'N/A'}
                          </span>
                        </td>

                        {/* 2. DISCOUNT RATE (Volume / Accent Blue Column) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/20 group-hover:bg-blue-600/30 text-slate-800 font-mono font-bold text-xs transition-colors">
                          {rawDiscount.includes('%') || rawDiscount.includes('₱')
                            ? `${rawDiscount} OFF`
                            : `${rawDiscount}% OFF`}
                        </td>

                        {/* 3. MIN SPEND */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-800 bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          {minSpendNum > 0 ? `₱${minSpendNum.toFixed(2)}` : 'No Minimum'}
                        </td>

                        {/* 4. USAGE LIMIT */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          {limitNum > 0 ? (
                            <span
                              className={`font-bold ${isLimitReached ? 'text-red-600' : 'text-slate-800'
                                }`}
                            >
                              {usedNum} / {limitNum}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-sans font-medium text-xs">
                              Unlimited
                            </span>
                          )}
                        </td>

                        {/* 5. TARGET AUDIENCE (Standardized Pill Badges â€” Blue / Yellow / Red) */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${(c.targetSegment || '').includes('Gold') ||
                              (c.targetSegment || '').includes('Loyal') ||
                              (c.targetSegment || '') === 'VIP'
                              ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                          >
                            {c.targetSegment || 'All Shoppers'}
                          </span>
                        </td>

                        {/* 6. EXPIRY DATE */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold text-slate-800 bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          {c.expiry && !isNaN(new Date(c.expiry).getTime())
                            ? new Date(c.expiry).toLocaleDateString()
                            : 'No Expiry'}
                        </td>

                        {/* 7. STATUS (Cell-Tinted Style) */}
                        <td
                          className={`px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold transition-colors select-none ${statusStyle}`}
                        >
                          <span>{statusLabel}</span>
                        </td>

                        {/* 8. ACTION (Sticky Right) */}
                        <td className="py-3 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-28 min-w-[110px] transition-colors">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewCouponModal(c)}
                              title="View Voucher Details"
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {viewMode !== 'archived' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(c)}
                                  title="Edit Coupon"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(c)}
                                  title="Archive Coupon"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(c)}
                                  title="Restore Coupon"
                                  className="w-8 h-8 rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCoupon(c._id, e)}
                                  title="Delete Permanently"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
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

      {/* CREATE / EDIT COUPON MODAL (MATCHING CREATE PACKAGE SET MODAL UI) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {editingCoupon ? 'Edit Promotional Voucher' : 'Create Promotional Voucher'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure voucher codes, discount rates, spend thresholds, and promotional notes
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
                âœ•
              </button>
            </div>

            {/* MODAL FORM BODY */}
            <form onSubmit={handleSaveCoupon} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              <div className="p-6 flex flex-col gap-5 flex-1 overflow-y-auto custom-scrollbar">

                {/* 1. PUBLISH TO STOREFRONT TOGGLE (CLEAN INLINE WITH UNDERLINE AT THE VERY TOP) */}
                <div
                  onClick={() => setNewCoupon((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
                  className="flex items-center gap-3 pb-3 border-b border-slate-100 cursor-pointer select-none group"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewCoupon((prev) => ({ ...prev, isPublished: !prev.isPublished }));
                    }}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${newCoupon.isPublished
                      ? 'bg-[#01390f] text-white border-[#01390f]'
                      : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {newCoupon.isPublished ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </button>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-[#01390f] transition-colors">
                        Publish to storefront immediately{' '}
                        <span className="text-[11px] font-normal text-slate-400">(Visible to customers)</span>
                      </span>


                    </div>
                    <span className="text-[11px] text-slate-400">
                      {newCoupon.isPublished
                        ? 'Live in Customer Checkout immediately upon saving'
                        : 'Saved as draft (hidden from customers until published)'}
                    </span>
                  </div>
                </div>

                {/* 2. 2-COLUMN GRID: PROMO VOUCHER CODE & USAGE LIMIT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* PROMO VOUCHER CODE WITH QUICK-GENERATE */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Promo Voucher Code <span className="text-red-600">*</span>
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        required
                        placeholder="Enter Promo Mhira Code"
                        value={newCoupon.code}
                        onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                        className="w-full h-9 bg-transparent text-[#01390f] text-xs font-bold font-mono focus:outline-none uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-300 placeholder:font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const randomCode = 'MHIRA' + Math.floor(1000 + Math.random() * 9000);
                          setNewCoupon({ ...newCoupon, code: randomCode });
                        }}
                        className="ml-2 px-2 py-1 rounded bg-slate-100 hover:bg-[#01390f]/10 text-[10px] font-bold text-[#01390f] uppercase cursor-pointer shrink-0 transition-colors select-none"
                        title="Auto-generate promo code"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  {/* USAGE / REDEMPTION LIMIT */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Usage Limit <span className="text-[10px] text-slate-400 font-normal normal-case">(Max Redemptions)</span>
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter usage limit (0 = unlimited)"
                        value={newCoupon.usageLimit}
                        onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })}
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold font-mono focus:outline-none placeholder:font-sans placeholder:text-slate-300 placeholder:font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. 2-COLUMN GRID: DISCOUNT PERCENTAGE & MIN SPEND */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* DISCOUNT PERCENTAGE WITH QUICK PRESETS */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Discount Percentage (%) <span className="text-red-600">*</span>
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Percent className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        placeholder="Enter discount percentage"
                        value={newCoupon.discount}
                        onChange={(e) => setNewCoupon({ ...newCoupon, discount: e.target.value })}
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-bold font-mono focus:outline-none placeholder:font-sans placeholder:text-slate-300 placeholder:font-normal"
                      />
                      <div className="relative flex items-center ml-1 shrink-0">
                        <select
                          value={['5', '10', '15', '20', '25', '30', '40', '50'].includes(String(newCoupon.discount)) ? String(newCoupon.discount) : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setNewCoupon({ ...newCoupon, discount: e.target.value });
                            }
                          }}
                          className="h-7 bg-slate-100 hover:bg-slate-200/80 rounded px-2 pr-5 text-[10px] font-bold text-slate-600 cursor-pointer focus:outline-none appearance-none transition-colors"
                        >
                          <option value="">Presets</option>
                          <option value="5">5% OFF</option>
                          <option value="10">10% OFF</option>
                          <option value="15">15% OFF</option>
                          <option value="20">20% OFF</option>
                          <option value="25">25% OFF</option>
                          <option value="30">30% OFF</option>
                          <option value="40">40% OFF</option>
                          <option value="50">50% OFF</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1.5 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* MIN SPEND REQUIREMENT */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Min Spend Requirement (₱)
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <span className="text-xs font-bold text-slate-400 shrink-0 mr-2">₱</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="Enter minimum spend amount"
                        value={newCoupon.minSpend}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minSpend: e.target.value })}
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-bold font-mono focus:outline-none placeholder:font-sans placeholder:text-slate-300 placeholder:font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. 2-COLUMN GRID: TARGET SEGMENT & EXPIRATION DATE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* TARGET CUSTOMER SEGMENT */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Target Customer Segment
                    </label>
                    <div className="relative flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                      <select
                        value={newCoupon.targetSegment}
                        onChange={(e) => setNewCoupon({ ...newCoupon, targetSegment: e.target.value })}
                        className="w-full h-9 bg-transparent text-slate-800 pr-6 text-xs font-semibold focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="All">All Shoppers (Public)</option>
                        <option value="Gold Tier">Gold Tier</option>
                        <option value="Silver Tier">Silver Tier</option>
                        <option value="Bronze Tier">Bronze Tier</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-1 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* EXPIRATION DATE */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Expiration Date
                      </label>
                      {newCoupon.expiry ? (
                        <button
                          type="button"
                          onClick={() => setNewCoupon({ ...newCoupon, expiry: '' })}
                          className="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer flex items-center gap-0.5 transition-colors"
                          title="Clear expiration date"
                        >
                          <X className="w-3 h-3" /> Clear
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                      )}
                    </div>
                    <div
                      onClick={() => {
                        try {
                          expiryInputRef.current?.showPicker();
                          expiryInputRef.current?.focus();
                        } catch (err) { }
                      }}
                      className="relative cursor-pointer flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-[#01390f] shrink-0 mr-2 pointer-events-none" />
                      <input
                        ref={expiryInputRef}
                        type="date"
                        placeholder="Select expiration date"
                        min={todayDate}
                        value={newCoupon.expiry || ''}
                        onChange={(e) => setNewCoupon({ ...newCoupon, expiry: e.target.value })}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) { }
                        }}
                        onFocus={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) { }
                        }}
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-75 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. VOUCHER NOTE / DESCRIPTION AT THE BOTTOM (MATCHING PACKAGE SET DETAILS) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Voucher Note (Terms &amp; Description)
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateVoucherNote}
                      className="text-[11px] font-bold text-[#01390f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Auto-generate Note</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={newCoupon.note || ''}
                    onChange={(e) => setNewCoupon({ ...newCoupon, note: e.target.value })}
                    placeholder="Enter voucher terms, promotional note, or eligibility description..."
                    className="w-full bg-transparent border-b-2 border-slate-200 focus:border-[#01390f] py-2 text-xs font-medium text-slate-800 focus:outline-none leading-relaxed transition-colors resize-none placeholder:text-slate-300 placeholder:font-normal"
                  />
                </div>

                {/* STATUS HELPER NOTICE AT THE BOTTOM */}
                <div className="pt-1 text-xs text-slate-400 flex items-center justify-between gap-2">
                  <span>
                    {newCoupon.isPublished
                      ? 'Note: This voucher is set to Live and can be redeemed immediately by customers at checkout.'
                      : 'Note: This voucher is set to Draft and will remain hidden from checkout until switched to Live.'}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS FOOTER (MATCHING CREATE PACKAGE SET MODAL) */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingCoupon(null);
                  }}
                  className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 bg-[#01390f] hover:bg-[#0a5219] text-white cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>
                    {submitting
                      ? 'Saving...'
                      : editingCoupon
                        ? 'Update Voucher'
                        : 'Save Voucher'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW COUPON MODAL (VIEW ONLY â€” CLEAN PARAGRAPH STYLE, CLOSE ONLY) */}
      {viewCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 font-mono">
                  {viewCouponModal.code}
                </h3>
                <p className="text-xs text-slate-400">
                  {viewCouponModal.expiry && !isNaN(new Date(viewCouponModal.expiry).getTime())
                    ? new Date(viewCouponModal.expiry).toLocaleDateString()
                    : 'No Expiry'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewCouponModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                âœ•
              </button>
            </div>

            {/* MODAL BODY (PARAGRAPH STYLE â€” NO ICONS, NO LABELS, NO CONTAINERS) */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-800">
                  {viewCouponModal.targetSegment || 'All Shoppers'}
                </p>
                <p className="text-slate-500">
                  {viewCouponModal.expiry && !isNaN(new Date(viewCouponModal.expiry).getTime())
                    ? new Date(viewCouponModal.expiry).toLocaleDateString()
                    : 'No Expiry'}{' '}
                  •{' '}
                  {Number(viewCouponModal.usageLimit || 0) > 0
                    ? `${Number(viewCouponModal.usedCount || 0)} / ${Number(viewCouponModal.usageLimit)} Used`
                    : 'Unlimited Usage'}
                </p>
                <p className="font-semibold text-[#01390f]">
                  {String(viewCouponModal.discount || '0').includes('%') ||
                    String(viewCouponModal.discount || '0').includes('₱')
                    ? `${viewCouponModal.discount} OFF`
                    : `${viewCouponModal.discount}% OFF`}
                  {Number(viewCouponModal.minSpend || 0) > 0
                    ? ` (Min. Spend ₱${Number(viewCouponModal.minSpend).toFixed(2)})`
                    : ' (No Minimum Spend)'}
                </p>
                {viewCouponModal.description && (
                  <p className="pt-2 text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {viewCouponModal.description}
                  </p>
                )}
              </div>
            </div>

            {/* MODAL FOOTER (CLOSE ONLY) */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewCouponModal(null)}
                className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingProductsVouchers;
