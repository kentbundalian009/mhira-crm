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
  FileDown
} from 'lucide-react';
import axios, { API } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';
import { CustomerTierBadge } from './customer/CustomerProductReviews';

function MarketingCustomerFeedback() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'highest' | 'lowest'
  const [selectedReview, setSelectedReview] = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/reviews`);
      setReviews(res.data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      showErrorToast('Failed to load customer reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Summary Metrics
  const totalCount = reviews.length;

  const averageRating = useMemo(() => {
    if (totalCount === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return (sum / totalCount).toFixed(1);
  }, [reviews, totalCount]);

  const fiveStarCount = useMemo(() => {
    return reviews.filter((r) => Number(r.rating) === 5).length;
  }, [reviews]);

  const satisfactionRate = useMemo(() => {
    if (totalCount === 0) return '100%';
    const positive = reviews.filter((r) => (Number(r.rating) || 5) >= 4).length;
    return `${Math.round((positive / totalCount) * 100)}%`;
  }, [reviews, totalCount]);

  const lowRatingCount = useMemo(() => {
    return reviews.filter((r) => (Number(r.rating) || 5) <= 3).length;
  }, [reviews]);

  // Filtered & Sorted dataset
  const filteredReviews = useMemo(() => {
    const list = reviews.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (r.comment || '').toLowerCase().includes(q) ||
        (r.userName || '').toLowerCase().includes(q) ||
        (r.productName || '').toLowerCase().includes(q);

      let matchesRating = true;
      if (ratingFilter === '5') {
        matchesRating = Number(r.rating) === 5;
      } else if (ratingFilter === 'low') {
        matchesRating = (Number(r.rating) || 5) <= 3;
      } else if (ratingFilter !== 'All') {
        matchesRating = Number(r.rating) === Number(ratingFilter);
      }

      return matchesSearch && matchesRating;
    });

    // Sorting
    return list.sort((a, b) => {
      if (sortOrder === 'highest') {
        return (Number(b.rating) || 5) - (Number(a.rating) || 5);
      }
      if (sortOrder === 'lowest') {
        return (Number(a.rating) || 5) - (Number(b.rating) || 5);
      }
      // default newest
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
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
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'All', label: 'All Reviews' },
              { id: '5', label: '5-Star Reviews' },
              { id: 'low', label: 'Needs Attention (≤ 3★)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRatingFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                  ratingFilter === tab.id
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
                onClick={handleExportReviewsPdf}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Export Reviews PDF Audit"
              >
                <FileDown className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-center leading-tight">Export PDF</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={fetchReviews}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh Feed</span>
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
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    ratingFilter === '5'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  5 Stars Only
                </button>

                <button
                  type="button"
                  onClick={() => setRatingFilter(ratingFilter === 'low' ? 'All' : 'low')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    ratingFilter === 'low'
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Critical (≤ 3★)
                </button>

                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'highest' ? 'newest' : 'highest')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    sortOrder === 'highest'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Highest First
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
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px]">PRODUCT</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">RATING</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[250px]">FEEDBACK COMMENT</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">DATE</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px]">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading verified customer feedback...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedReviews.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      {searchQuery || ratingFilter !== 'All'
                        ? 'No reviews match your filter criteria.'
                        : 'No customer feedback received yet.'}
                    </td>
                  </tr>
                ) : (
                  paginatedReviews.map((rev, idx) => {
                    const ratingNum = Number(rev.rating) || 5;

                    return (
                      <tr
                        key={rev._id || idx}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                      >
                        {/* 1. CUSTOMER */}
                        <td className="py-3.5 px-4 whitespace-nowrap min-w-[200px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#01390f] font-bold text-xs shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {rev.userName || 'Verified Buyer'}
                                </span>
                                {rev.userUsername && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    @{rev.userUsername}
                                  </span>
                                )}
                                <CustomerTierBadge tier={rev.userTier} badge={rev.userBadge} />
                              </div>
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Verified Purchase
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. PRODUCT */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-800 bg-slate-50 px-2.5 py-0.5 rounded-md font-semibold border border-slate-200/80 truncate max-w-[220px]">
                            {rev.productName || 'Organic Soap / Finished Good'}
                          </span>
                        </td>

                        {/* 3. RATING */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold font-mono text-xs border ${
                              ratingNum >= 4
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <Star className="w-3 h-3 fill-amber-500 stroke-none" />
                            <span>{ratingNum}.0</span>
                          </span>
                        </td>

                        {/* 4. FEEDBACK COMMENT */}
                        <td className="py-3.5 px-4 max-w-sm truncate text-slate-600 font-normal whitespace-nowrap" title={rev.comment}>
                          &quot;{rev.comment || 'Great organic botanical product!'}&quot;
                        </td>

                        {/* 5. DATE */}
                        <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-500 whitespace-nowrap font-medium">
                          {rev.createdAt
                            ? new Date(rev.createdAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Recent'}
                        </td>

                        {/* 6. ACTION (STICKY RIGHT) */}
                        <td className="py-3.5 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px]">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedReview(rev)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="View Full Customer Feedback"
                            >
                              <Eye className="w-3.5 h-3.5" />
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

      {/* REVIEW DETAILS MODAL */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Feedback from {selectedReview.userName || 'Verified Buyer'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedReview.createdAt ? new Date(selectedReview.createdAt).toLocaleDateString() : 'Recent Feedback'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Customer:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{selectedReview.userName || 'Verified Buyer'}</span>
                    {selectedReview.userUsername && (
                      <span className="text-xs text-slate-400 font-mono">(@{selectedReview.userUsername})</span>
                    )}
                    <CustomerTierBadge tier={selectedReview.userTier} badge={selectedReview.userBadge} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Product Purchased:</span>
                  <span className="font-semibold text-[#01390f]">{selectedReview.productName || 'Organic Soap'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Customer Rating:</span>
                  <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                    <span className="font-mono text-sm">{selectedReview.rating || 5}.0 Stars</span>
                    <div className="flex text-amber-400">
                      {[...Array(Number(selectedReview.rating) || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Full Customer Comment:
                </span>
                <p className="text-slate-700 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200 text-xs italic">
                  &quot;{selectedReview.comment}&quot;
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
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

export default MarketingCustomerFeedback;