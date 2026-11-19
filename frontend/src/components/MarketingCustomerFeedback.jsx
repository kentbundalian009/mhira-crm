import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  MessageSquare,
  Search,
  CheckCircle2,
  User,
  Loader2,
  Award,
  ThumbsUp,
  Calendar,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  ChevronDown,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles,
  X,
  FileDown,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import axios, { API, API_BASE_URL } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { notifyLiveSync } from '../utils/liveSync';
import TablePagination from './common/TablePagination';
import { INITIAL_DEFAULT_PRODUCTS } from './InventoryFinishedGoods';

function MarketingCustomerFeedback() {
  const [reviews, setReviews] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { }
    return INITIAL_DEFAULT_PRODUCTS;
  });
  const [catalogProducts, setCatalogProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_marketing_catalog');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'highest' | 'lowest'
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const handleOpenCommentModal = async (rev) => {
    setSelectedReview(rev);
    setReplyText(rev?.adminReply || '');

    // Mark as read if not already read
    if (rev && !rev.isRead && (!rev.adminReply || String(rev.adminReply).trim() === '')) {
      const revId = rev._id;
      setReviews((prev) =>
        prev.map((r) => (r._id === revId ? { ...r, isRead: true, readAt: new Date().toISOString() } : r))
      );

      const remainingUnread = Math.max(
        0,
        (Array.isArray(reviews) ? reviews : []).filter(
          (r) => r?._id !== revId && !r?.isRead && (!r?.adminReply || String(r?.adminReply).trim() === '')
        ).length
      );
      try {
        localStorage.setItem('unread_feedback_count', String(remainingUnread));
      } catch (e) { }
      window.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: remainingUnread }));
      window.dispatchEvent(new CustomEvent('sidebarCountRefresh'));

      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        API.patch(`/api/reviews/${revId}/read`, {}, { headers }).catch(() => { });
        notifyLiveSync('reviews');
      } catch (err) {
        console.error('Error marking review as read:', err);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await API.patch('/api/reviews/mark-all-read', {}, { headers });
      setReviews((prev) => prev.map((r) => ({ ...r, isRead: true, readAt: new Date().toISOString() })));
      try {
        localStorage.setItem('unread_feedback_count', '0');
      } catch (e) { }
      window.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: 0 }));
      window.dispatchEvent(new CustomEvent('sidebarCountRefresh'));
      notifyLiveSync('reviews');
      showSuccessToast('All customer feedback comments marked as read!');
    } catch (err) {
      console.error('Error marking all as read:', err);
      showErrorToast('Failed to mark all as read.');
    }
  };

  const handleSaveReply = async (e) => {
    if (e) e.preventDefault();
    if (!selectedReview?._id) return;
    setSavingReply(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const trimmed = replyText.trim();
      await API.put(
        `/api/reviews/${selectedReview._id}/status`,
        { adminReply: trimmed },
        { headers }
      );
      setReviews((prev) =>
        prev.map((r) =>
          r._id === selectedReview._id
            ? { ...r, adminReply: trimmed, adminReplyAt: trimmed ? new Date().toISOString() : null, isRead: true }
            : r
        )
      );
      setSelectedReview((prev) =>
        prev ? { ...prev, adminReply: trimmed, adminReplyAt: trimmed ? new Date().toISOString() : null, isRead: true } : null
      );
      notifyLiveSync('reviews');
      showSuccessToast(trimmed ? 'Mhira Natural reply posted to customer review!' : 'Reply removed.');
      setSelectedReview(null);
    } catch (err) {
      console.error('Error saving reply:', err);
      showErrorToast('Failed to save reply.');
    } finally {
      setSavingReply(false);
    }
  };

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [revRes, fgRes, catRes] = await Promise.allSettled([
        API.get('/api/reviews', { headers }),
        API.get('/api/inventory-products', { headers }),
        API.get('/api/collections/catalog', { headers }),
      ]);

      if (revRes.status === 'fulfilled') {
        const rawReviews = revRes.value?.data;
        const fetchedReviews = Array.isArray(rawReviews)
          ? rawReviews
          : Array.isArray(rawReviews?.data)
          ? rawReviews.data
          : Array.isArray(rawReviews?.reviews)
          ? rawReviews.reviews
          : [];
        setReviews(fetchedReviews);
        const unread = fetchedReviews.filter(
          (r) => !r?.isRead && (!r?.adminReply || String(r?.adminReply).trim() === '')
        ).length;
        try {
          localStorage.setItem('unread_feedback_count', String(unread));
        } catch (e) { }
        window.dispatchEvent(new CustomEvent('reviewsUpdated', { detail: unread }));
      } else {
        console.error('Failed to load reviews:', revRes.reason);
        setReviews([]);
      }

      if (fgRes.status === 'fulfilled') {
        const rawFg = Array.isArray(fgRes.value?.data)
          ? fgRes.value.data
          : fgRes.value?.data?.data || fgRes.value?.data?.products || [];
        if (Array.isArray(rawFg) && rawFg.length > 0) {
          setFinishedGoods(rawFg);
        }
      }

      if (catRes.status === 'fulfilled') {
        const rawCat = Array.isArray(catRes.value?.data)
          ? catRes.value.data
          : catRes.value?.data?.products || catRes.value?.data?.data || [];
        if (Array.isArray(rawCat) && rawCat.length > 0) {
          setCatalogProducts(rawCat);
        }
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // Resolve Finished Goods Item Profile, Specification, and UOM for a review
  const resolveReviewProductInfo = (rev) => {
    const colObj = rev.productId && typeof rev.productId === 'object' ? rev.productId : null;
    const colId = colObj ? String(colObj._id || colObj.id || '') : String(rev.productId || '');

    const matchedCat = catalogProducts.find(
      (c) =>
        (colId && String(c._id || c.id) === colId) ||
        (colObj?.code && String(c.code || '').toLowerCase() === String(colObj.code).toLowerCase())
    );

    const refId =
      (colObj?.productRef && typeof colObj.productRef === 'object'
        ? String(colObj.productRef._id || colObj.productRef.id || '')
        : String(colObj?.productRef || '')) ||
      (matchedCat?.productRef && typeof matchedCat.productRef === 'object'
        ? String(matchedCat.productRef._id || matchedCat.productRef.id || '')
        : String(matchedCat?.productRef || ''));

    const candidateCode = String(
      rev.productCode || colObj?.code || matchedCat?.code || ''
    ).toLowerCase().trim();

    const candidateName = String(
      rev.itemName ||
      rev.productName ||
      colObj?.itemName ||
      colObj?.itemDescription ||
      matchedCat?.itemName ||
      matchedCat?.itemDescription ||
      ''
    ).toLowerCase().trim();

    const allFg = [...finishedGoods, ...INITIAL_DEFAULT_PRODUCTS];
    const matchedFg =
      (colObj?.productRef && typeof colObj.productRef === 'object' ? colObj.productRef : null) ||
      allFg.find((fg) => {
        if (refId && String(fg._id || fg.id) === refId) return true;
        if (colId && String(fg._id || fg.id) === colId) return true;
        if (candidateCode && String(fg.code || '').toLowerCase().trim() === candidateCode) return true;
        if (
          candidateName &&
          (String(fg.itemName || '').toLowerCase().trim() === candidateName ||
            String(fg.itemDescription || '').toLowerCase().trim() === candidateName)
        ) {
          return true;
        }
        return false;
      });

    const itemProfile =
      matchedFg?.itemName ||
      matchedFg?.itemDescription ||
      rev.itemName ||
      colObj?.itemName ||
      colObj?.itemDescription ||
      matchedCat?.itemName ||
      matchedCat?.itemDescription ||
      rev.productName ||
      'Finished Good';

    const specification =
      matchedFg?.specification ||
      rev.specification ||
      colObj?.specification ||
      matchedCat?.specification ||
      '-';

    const uom =
      matchedFg?.uom ||
      rev.uom ||
      colObj?.uom ||
      matchedCat?.uom ||
      'ML';

    return { itemProfile, specification, uom };
  };

  // Resolve Customer Email for display under Customer Name
  const resolveCustomerEmail = (rev) => {
    if (rev.userEmail && String(rev.userEmail).trim()) return String(rev.userEmail).trim();
    if (rev.email && String(rev.email).trim()) return String(rev.email).trim();
    if (typeof rev.userId === 'string' && rev.userId.includes('@')) return rev.userId.trim();
    if (rev.userUsername && String(rev.userUsername).trim()) {
      const cleanUser = String(rev.userUsername).toLowerCase().replace(/[^a-z0-9._-]/g, '');
      if (cleanUser) return `${cleanUser}@gmail.com`;
    }
    if (rev.userName && !['anonymous', 'verified buyer', 'verified customer'].includes(String(rev.userName).toLowerCase().trim())) {
      const cleanName = String(rev.userName).toLowerCase().trim().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '');
      if (cleanName) return `${cleanName}@gmail.com`;
    }
    return 'verified.buyer@gmail.com';
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Summary Metrics
  const totalCount = Array.isArray(reviews) ? reviews.length : 0;

  const unreadCount = useMemo(() => {
    if (!Array.isArray(reviews)) return 0;
    return reviews.filter(
      (r) => !r?.isRead && (!r?.adminReply || String(r?.adminReply).trim() === '')
    ).length;
  }, [reviews]);

  const averageRating = useMemo(() => {
    if (!Array.isArray(reviews) || totalCount === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + (Number(r?.rating) || 5), 0);
    return (sum / totalCount).toFixed(1);
  }, [reviews, totalCount]);

  const fiveStarCount = useMemo(() => {
    if (!Array.isArray(reviews)) return 0;
    return reviews.filter((r) => Number(r?.rating) === 5).length;
  }, [reviews]);

  const satisfactionRate = useMemo(() => {
    if (!Array.isArray(reviews) || totalCount === 0) return '100%';
    const positive = reviews.filter((r) => (Number(r?.rating) || 5) >= 4).length;
    return `${Math.round((positive / totalCount) * 100)}%`;
  }, [reviews, totalCount]);

  const lowRatingCount = useMemo(() => {
    if (!Array.isArray(reviews)) return 0;
    return reviews.filter((r) => (Number(r?.rating) || 5) <= 3).length;
  }, [reviews]);

  // Filtered & Sorted dataset
  const filteredReviews = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    const list = reviews.filter((r) => {
      if (!r) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.comment || '').toLowerCase().includes(q) ||
        (r.userName || '').toLowerCase().includes(q) ||
        (r.productName || '').toLowerCase().includes(q);

      let matchesRating = true;
      if (ratingFilter === 'unread') {
        matchesRating = !r.isRead && (!r.adminReply || String(r.adminReply).trim() === '');
      } else if (ratingFilter === '5') {
        matchesRating = Number(r.rating) === 5;
      } else if (ratingFilter === 'low') {
        matchesRating = (Number(r.rating) || 5) <= 3;
      } else if (ratingFilter !== 'All') {
        matchesRating = Number(r.rating) === Number(ratingFilter);
      }

      return matchesSearch && matchesRating;
    });

    // Sorting
    return [...list].sort((a, b) => {
      if (sortOrder === 'highest') {
        return (Number(b?.rating) || 5) - (Number(a?.rating) || 5);
      }
      if (sortOrder === 'lowest') {
        return (Number(a?.rating) || 5) - (Number(b?.rating) || 5);
      }
      // default newest
      const dateA = new Date(a?.createdAt || 0).getTime();
      const dateB = new Date(b?.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [reviews, searchQuery, ratingFilter, sortOrder]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (ratingFilter !== 'All') count++;
    if (sortOrder !== 'newest') count++;
    return count;
  }, [searchQuery, ratingFilter, sortOrder]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setRatingFilter('All');
    setSortOrder('newest');
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReviews.slice(start, start + itemsPerPage);
  }, [filteredReviews, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ratingFilter, sortOrder]);

  // PDF Export
  const handleExportReviewsPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - CUSTOMER FEEDBACK & REVIEWS AUDIT', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Reviews: ${filteredReviews.length} | Avg Rating: ${averageRating} / 5.0`,
        14,
        18
      );

      const tableHead = [['#', 'Customer Name', 'Product', 'Rating', 'Feedback Comment', 'Date']];
      const tableBody = filteredReviews.map((r, idx) => [
        idx + 1,
        r.userName || 'Verified Buyer',
        r.productName || 'Organic Soap / Product',
        `${r.rating || 5} / 5`,
        r.comment || 'N/A',
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent'
      ]);

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

      const fileName = `Customer_Reviews_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Reviews Audit: ${fileName}`);
    } catch (err) {
      console.error('PDF error:', err);
      showErrorToast('Failed to export PDF.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">

      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">

        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
          <div className="flex items-center gap-1 -mb-px">
            <button
              type="button"
              onClick={() => setRatingFilter('All')}
              className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${ratingFilter === 'All'
                ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#01390f]" />
              <span>All Reviews</span>
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => setRatingFilter(ratingFilter === 'unread' ? 'All' : 'unread')}
                className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap rounded-t-lg ${ratingFilter === 'unread'
                  ? 'border-red-600 text-red-700 bg-red-50/80 font-bold shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                title="Filter by unread customer comments"
              >
                <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                <span>Unread Comments</span>
                <span
                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 leading-none shadow-2xs ${ratingFilter === 'unread'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
          {/* ACTIONS GROUP */}
          <div className="w-full lg:w-[130px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
            <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
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

                {/* Mark All As Read */}
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] whitespace-nowrap"
                    title={`Mark all ${unreadCount} unread feedback comments as read`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span className="whitespace-nowrap">
                      Mark Read ({unreadCount})
                    </span>
                  </button>
                )}
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
                  placeholder="Search customer name, product, or feedback comments..."
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
                {/* Rating Select */}
                <div className="relative w-full">
                  <Star className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={ratingFilter}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Ratings</option>
                    {unreadCount > 0 && <option value="unread">Unread Comments ({unreadCount})</option>}
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                    <option value="low">Critical (≤ 3★)</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Order */}
                <div className="relative w-full">
                  <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="highest">Sort: Highest Rating</option>
                    <option value="lowest">Sort: Lowest Rating</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Quick Rating Preset */}
                <div className="relative w-full">
                  <MessageSquare className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={ratingFilter === '5' ? '5' : ratingFilter === 'low' ? 'low' : 'All'}
                    onChange={(e) => setRatingFilter(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">Category: All</option>
                    <option value="5">Category: Positive (5★)</option>
                    <option value="low">Category: Needs Attention</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setRatingFilter(ratingFilter === '5' ? 'All' : '5')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${ratingFilter === '5'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  5 Stars Only
                </button>

                <button
                  type="button"
                  onClick={() => setRatingFilter(ratingFilter === 'low' ? 'All' : 'low')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${ratingFilter === 'low'
                    ? 'bg-red-50 border-red-300 text-red-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Critical (≤ 3★)
                </button>

                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'highest' ? 'newest' : 'highest')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${sortOrder === 'highest'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Highest First
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

        {/* 3. TABLE MASTERLIST (MATCHES INVENTORY / ADMIN DATABASE STANDARD) */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* PAGINATION TOP BAR */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredReviews.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">
                    CUSTOMER
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">ITEM NAME</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">SPECIFICATION</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">UOM</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">RATING</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">COMMENTS</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">DATE</th>
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
                        <span>Loading verified customer feedback...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedReviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="w-6 h-6 text-slate-300" />
                        <span>
                          {searchQuery || ratingFilter !== 'All'
                            ? 'No reviews match your filter criteria.'
                            : 'No customer feedback received yet.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedReviews.map((rev, idx) => {
                    const ratingNum = Number(rev.rating) || 5;
                    const customerName = rev.userName || 'Verified Buyer';
                    const customerEmail = resolveCustomerEmail(rev);
                    const { itemProfile, specification, uom } = resolveReviewProductInfo(rev);
                    const hasUnread =
                      !rev.isRead && (!rev.adminReply || String(rev.adminReply).trim() === '');
                    const hasReplied = rev.adminReply && String(rev.adminReply).trim() !== '';

                    return (
                      <tr
                        key={rev._id || idx}
                        className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                      >
                        {/* 1. CUSTOMER (Name & Subtitle) */}
                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[200px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-slate-900 truncate">
                              {customerName}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                              {customerEmail || 'No email provided'}
                            </span>
                          </div>
                        </td>

                        {/* 2. ITEM PROFILE */}
                        <td
                          className="px-4 py-3.5 whitespace-nowrap font-semibold text-xs text-slate-900 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors max-w-xs truncate"
                          title={itemProfile}
                        >
                          {itemProfile || 'N/A'}
                        </td>

                        {/* 3. SPECIFICATION */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {specification || '—'}
                        </td>

                        {/* 4. UOM */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs uppercase text-slate-700 font-bold whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {uom || 'ML'}
                        </td>

                        {/* 5. RATING (Matches Quantity/Volume Blue Accent) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 stroke-none" />
                            <span>{Number(ratingNum || 0).toFixed(1)}</span>
                          </div>
                        </td>

                        {/* 6. COMMENTS (Action Circle Cell) */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleOpenCommentModal(rev)}
                              title={
                                hasUnread
                                  ? 'Unread Comment - Click to read & reply'
                                  : hasReplied
                                    ? 'View Comment & Mhira Natural Reply'
                                    : 'View Customer Comment & Reply'
                              }
                              className="relative w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 group/btn"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {hasUnread ? (
                                <span
                                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white animate-pulse"
                                  title="Unread comment"
                                />
                              ) : hasReplied ? (
                                <span
                                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white"
                                  title="Replied by Mhira Natural"
                                />
                              ) : null}
                            </button>
                          </div>
                        </td>

                        {/* 7. DATE */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {rev.createdAt && !isNaN(new Date(rev.createdAt).getTime())
                            ? new Date(rev.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                            : 'Recent'}
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

      {/* COMMENT & MHIRA NATURAL REPLY MODAL (MATCHING PACKAGE SET MODAL UI) */}
      {selectedReview && (() => {
        const { itemProfile, specification, uom } = resolveReviewProductInfo(selectedReview);
        const customerName = selectedReview.userName || 'Verified Buyer';
        const customerEmail = resolveCustomerEmail(selectedReview);
        const ratingNum = Number(selectedReview.rating) || 5;

        const REPLY_PRESETS = [
          'Thank you so much for your kind feedback and for choosing Mhira Natural! We are delighted to be part of your daily botanical routine.',
          'We are thrilled that you loved our handcrafted botanical product! Thank you for supporting Mhira Natural.',
          'Greetings from Mhira Natural! We truly appreciate your support and wonderful review.',
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-['Poppins',sans-serif]">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    Customer Comment
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review customer feedback details and post an official Mhira Natural storefront reply
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* MODAL FORM BODY */}
              <form onSubmit={handleSaveReply} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
                <div className="p-6 flex flex-col gap-5 flex-1 overflow-y-auto custom-scrollbar">

                  {/* 1. CUSTOMER DETAILS & COMMENT (CLEAN PARAGRAPH STYLE — NO LABELS OR INPUT LINES) */}
                  <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    <p className="font-semibold text-slate-800">
                      {customerName}
                      {customerEmail ? (
                        <span className="text-slate-400 font-normal ml-1.5">
                          ({customerEmail})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-slate-500">
                      {selectedReview.createdAt && !isNaN(new Date(selectedReview.createdAt).getTime())
                        ? new Date(selectedReview.createdAt).toLocaleDateString()
                        : 'Verified Review'}
                    </p>
                    <p className="font-semibold text-[#01390f]">
                      {itemProfile}{' '}
                      {specification && specification !== '-' ? `(${specification} ${uom})` : ''} —{' '}
                      {ratingNum.toFixed(1)} Stars
                    </p>
                    <p className="pt-2 text-slate-700 leading-relaxed whitespace-pre-wrap break-words font-normal">
                      {selectedReview.comment || 'No comment provided.'}
                    </p>
                  </div>

                  {/* 3. OFFICIAL MHIRA NATURAL REPLY (MATCHING PACKAGE SET DETAILS TEXTAREA UI) */}
                  <div>
                    <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#EDF7EE] border border-[#D5EAD7] flex items-center justify-center overflow-hidden p-0.5 shrink-0">
                          <img
                            src="/mhira_removebg.png"
                            alt="Mhira Natural"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Official Mhira Natural Reply <span className="text-red-600">*</span>
                        </label>
                        {selectedReview.adminReply && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                            Replied
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center">
                          <select
                            value={REPLY_PRESETS.includes(replyText) ? replyText : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                setReplyText(e.target.value);
                              }
                            }}
                            className="h-7 bg-slate-100 hover:bg-slate-200/80 rounded px-2 pr-5 text-[10px] font-bold text-slate-600 cursor-pointer focus:outline-none appearance-none transition-colors"
                          >
                            <option value="">Reply Presets</option>
                            <option value={REPLY_PRESETS[0]}>Greeting #1 (Warm Thank You)</option>
                            <option value={REPLY_PRESETS[1]}>Greeting #2 (Product Appreciation)</option>
                            <option value={REPLY_PRESETS[2]}>Greeting #3 (Short Official Reply)</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-1.5 text-slate-500 pointer-events-none" />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const generated = `Hello ${customerName}! Thank you so much for your ${ratingNum}-star review on our ${itemProfile}. We are thrilled to hear your feedback and truly appreciate your continued support for Mhira Natural!`;
                            setReplyText(generated);
                            showSuccessToast('Auto-generated personalized reply.');
                          }}
                          className="text-[11px] font-bold text-[#01390f] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Auto-generate Reply</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Enter official Mhira Natural greeting or reply to this customer comment"
                      className="w-full bg-transparent border-b-2 border-slate-200 focus:border-[#01390f] py-2 text-xs font-medium text-slate-800 focus:outline-none leading-relaxed transition-colors resize-none placeholder:text-slate-300 placeholder:font-normal"
                    />
                  </div>

                  {/* STATUS HELPER NOTICE AT THE BOTTOM */}
                  <div className="pt-1 text-xs text-slate-400">
                    <span>
                      Note: Your official Mhira Natural reply will be displayed publicly under this customer&apos;s review on the storefront product page upon saving.
                    </span>
                  </div>
                </div>

                {/* ACTION BUTTONS FOOTER */}
                <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setSelectedReview(null)}
                    className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingReply}
                    className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingReply ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>{selectedReview.adminReply ? 'Update Reply' : 'Send Reply'}</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default MarketingCustomerFeedback;
