import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Tag,
  Image as ImageIcon,
  X,
  Search,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ListPlus,
  RefreshCw,
  FileDown,
  Download,
  ChevronDown,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import axios, { API } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { notifyLiveSync } from '../utils/liveSync';
import { compressImageToBase64 } from '../utils/imageCompressor';
import TablePagination from './common/TablePagination';

function MarketingEventsManagement() {
  const [events, setEvents] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_marketing_events');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Multi-Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'published' | 'draft'
  const [recentEventSearch, setRecentEventSearch] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewEventModal, setViewEventModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [deleteTargetEvent, setDeleteTargetEvent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialFormState = {
    title: '',
    description: '',
    bannerImage: '',
    eventDate: '',
    location: 'Online / Main Store',
    category: 'Announcement',
    isPublished: true,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/events`);
      const safeData = Array.isArray(res.data) ? res.data : (res.data?.events || res.data?.items || res.data?.data || []);
      setEvents(safeData);
      try {
        localStorage.setItem('cached_marketing_events', JSON.stringify(safeData));
      } catch (e) { }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openAddModal = () => {
    setSelectedEvent(null);
    setFormData(initialFormState);
    setModalError('');
    setIsModalOpen(true);
  };

  const openEditModal = (evt) => {
    setSelectedEvent(evt);
    setFormData({
      title: evt.title || '',
      description: evt.description || '',
      bannerImage: evt.bannerImage || '',
      eventDate: evt.eventDate ? evt.eventDate.split('T')[0] : '',
      location: evt.location || 'Online / Main Store',
      category: evt.category || 'Announcement',
      isPublished: evt.isPublished !== undefined ? evt.isPublished : true,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setModalError('Image size should be less than 15MB.');
      return;
    }
    try {
      setModalError('');
      const compressedBase64 = await compressImageToBase64(file, {
        maxWidth: 800,
        maxHeight: 500,
        quality: 0.75,
      });
      setFormData((prev) => ({ ...prev, bannerImage: compressedBase64 }));
    } catch (err) {
      console.error('Error compressing banner image:', err);
      setModalError('Failed to process image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        ...formData,
        eventDate: formData.eventDate || new Date().toISOString().split('T')[0],
      };

      if (selectedEvent) {
        await axios.put(`${API_BASE_URL}/api/events/${selectedEvent._id}`, payload, config);
        showSuccessToast('Announcement updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/api/events`, payload, config);
        showSuccessToast('Announcement created successfully!');
      }
      setIsModalOpen(false);
      notifyLiveSync('marketing');
      fetchEvents();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save announcement.';
      setModalError(msg);
      showErrorToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (evt, e) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.put(
        `${API_BASE_URL}/api/events/${evt._id}`,
        { isPublished: !evt.isPublished },
        config
      );
      showSuccessToast(
        `Announcement ${!evt.isPublished ? 'published to storefront' : 'moved to draft'}!`
      );
      notifyLiveSync('marketing');
      fetchEvents();
    } catch (err) {
      console.error('Error toggling status:', err);
      showErrorToast('Failed to update status.');
    }
  };

  const confirmDeleteEvent = (evt, e) => {
    if (e) e.stopPropagation();
    setDeleteTargetEvent(evt);
  };

  const handleExecuteDelete = async () => {
    if (!deleteTargetEvent) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.delete(`${API_BASE_URL}/api/events/${deleteTargetEvent._id}`, config);
      showSuccessToast('Announcement deleted successfully.');

      setEvents((prev) => {
        const next = prev.filter((item) => item._id !== deleteTargetEvent._id);
        try {
          localStorage.setItem('cached_marketing_events', JSON.stringify(next));
        } catch (_e) {}
        return next;
      });

      if (viewEventModal?._id === deleteTargetEvent._id) {
        setViewEventModal(null);
      }
      setDeleteTargetEvent(null);
      notifyLiveSync('marketing');
      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      showErrorToast(err.response?.data?.message || 'Failed to delete announcement.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // 1. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const title = (evt.title || '').toLowerCase();
        const desc = (evt.description || '').toLowerCase();
        const loc = (evt.location || '').toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !loc.includes(q)) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'All') {
        if ((evt.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 3. Status
      if (selectedStatus !== 'All') {
        const isPub = selectedStatus === 'published';
        if (Boolean(evt.isPublished) !== isPub) {
          return false;
        }
      }

      return true;
    });
  }, [events, searchQuery, selectedCategory, selectedStatus]);

  // Summary KPIs
  const publishedCount = useMemo(() => events.filter((e) => e.isPublished).length, [events]);
  const draftCount = useMemo(() => events.filter((e) => !e.isPublished).length, [events]);
  const eventsWithDateCount = useMemo(() => events.filter((e) => e.eventDate).length, [events]);

  // Unique Categories
  const uniqueCategories = useMemo(() => {
    const set = new Set(['Announcement', 'Promo Event', 'Product Launch', 'Maintenance']);
    events.forEach((e) => {
      if (e.category && e.category.trim()) set.add(e.category.trim());
    });
    return Array.from(set);
  }, [events]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'All') count++;
    if (selectedStatus !== 'All') count++;
    return count;
  }, [searchQuery, selectedCategory, selectedStatus]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setCurrentPage(1);
  };

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedStatus]);

  // Export PDF Summary
  const handleExportAnnouncementsPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - ANNOUNCEMENTS & EVENTS AUDIT', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Announcements: ${filteredEvents.length}`,
        14,
        18
      );

      const tableHead = [['#', 'Title / Headline', 'Event Date', 'Location / Venue', 'Category', 'Status']];
      const tableBody = filteredEvents.map((evt, idx) => [
        idx + 1,
        evt.title || 'Announcement',
        evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : 'Ongoing',
        evt.location || 'Online',
        evt.category || 'General',
        evt.isPublished ? 'PUBLISHED' : 'DRAFT'
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

      const fileName = `Announcements_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Announcements Audit: ${fileName}`);
    } catch (err) {
      console.error('PDF generation error:', err);
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
              { id: 'All', label: 'All Broadcasts' },
              { id: 'published', label: 'Live' },
              { id: 'draft', label: 'Drafts' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                  selectedStatus === tab.id
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
                onClick={openAddModal}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Create a new storefront announcement"
              >
                <Plus className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-center leading-tight">New Broadcast</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={handleExportAnnouncementsPdf}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                  title="Export Announcements Audit PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={fetchEvents}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh Feeds</span>
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
                  placeholder="Search announcement title, location, description..."
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
                {/* Category Select */}
                <div className="relative w-full">
                  <Tag className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Status Select */}
                <div className="relative w-full">
                  <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Broadcast Statuses</option>
                    <option value="published">Published (Live)</option>
                    <option value="draft">Draft (Hidden)</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Category Preset Dropdown */}
                <div className="relative w-full">
                  <Sparkles className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">Preset: All Broadcasts</option>
                    <option value="Announcement">Preset: Announcements</option>
                    <option value="Event">Preset: Special Events</option>
                    <option value="Promo">Preset: Promos & Deals</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'published' ? 'All' : 'published')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedStatus === 'published'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Live Only
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'draft' ? 'All' : 'draft')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedStatus === 'draft'
                      ? 'bg-slate-100 border-slate-400 text-slate-800 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Drafts Only
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCategory(selectedCategory === 'Announcement' ? 'All' : 'Announcement')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    selectedCategory === 'Announcement'
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Announcements
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
          {/* TOP PAGINATION BAR */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredEvents.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[260px]">
                    ANNOUNCEMENT TITLE & BANNER
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CATEGORY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">EVENT DATE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px]">LOCATION / VENUE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">STOREFRONT STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-28 min-w-[110px]">
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
                        <span>Loading announcements and events...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedEvents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      {searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                        ? 'No announcements match your filter criteria.'
                        : 'No announcements created yet. Click "New Announcement" to publish your first post.'}
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((evt) => {
                    const isLive = Boolean(evt.isPublished);

                    return (
                      <tr
                        key={evt._id}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                      >
                        {/* 1. TITLE & BANNER */}
                        <td className="py-3.5 px-4 whitespace-nowrap min-w-[260px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center gap-3">
                            {evt.bannerImage ? (
                              <img
                                src={evt.bannerImage}
                                alt=""
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-[220px]">
                                {evt.title}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[220px]">
                                {evt.description || 'No description provided'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. CATEGORY */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs text-[#01390f] bg-emerald-50 px-2.5 py-0.5 rounded-lg font-semibold border border-emerald-200/70">
                            {evt.category || 'Announcement'}
                          </span>
                        </td>

                        {/* 3. EVENT DATE */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap font-medium">
                          {evt.eventDate
                            ? new Date(evt.eventDate).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Ongoing'}
                        </td>

                        {/* 4. LOCATION */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{evt.location || 'Online / Main Store'}</span>
                          </span>
                        </td>

                        {/* 5. STOREFRONT STATUS */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePublish(evt, e)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs cursor-pointer transition-all border shadow-2xs active:scale-95 ${
                              isLive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle live publish state"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                              }`}
                            ></span>
                            <span>{isLive ? 'Published' : 'Draft'}</span>
                          </button>
                        </td>

                        {/* 6. ACTION BUTTONS (STICKY RIGHT) */}
                        <td className="py-3.5 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-28 min-w-[110px]">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View */}
                            <button
                              type="button"
                              onClick={() => setViewEventModal(evt)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="View Announcement Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => openEditModal(evt)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Edit Announcement"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => confirmDeleteEvent(evt, e)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Delete Announcement"
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

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {selectedEvent ? 'Edit Announcement' : 'Create New Announcement'}
                </h3>
                <p className="text-xs text-slate-400">
                  Post news, special promotional dates, and event broadcasts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {modalError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Grand Anniversary Sale & New Product Launch"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Event Date
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleInputChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Online Store / SM Mall"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="e.g. Promo / Event"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Announcement Details *
                </label>
                <textarea
                  rows={4}
                  required
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter full details of the announcement or event..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#01390f] focus:bg-white resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Banner Image (Max 2MB)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-[#01390f] hover:file:bg-emerald-100 cursor-pointer"
                />
                {formData.bannerImage && (
                  <div className="mt-2 aspect-video w-48 rounded-xl overflow-hidden shadow-xs bg-slate-100">
                    <img src={formData.bannerImage} alt="Banner Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="evt-pub"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-[#01390f] rounded"
                />
                <label htmlFor="evt-pub" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Publish to mobile app & storefront immediately
                </label>
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
                  <span className="whitespace-nowrap">{submitting ? 'Saving...' : 'Save Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {viewEventModal.title}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {viewEventModal.eventDate ? new Date(viewEventModal.eventDate).toLocaleDateString() : 'Ongoing'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewEventModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              {viewEventModal.bannerImage && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-xs bg-slate-100">
                  <img src={viewEventModal.bannerImage} alt="Banner" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Location:</span>
                  <span className="font-bold text-slate-900">{viewEventModal.location}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-bold text-[#01390f]">{viewEventModal.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${viewEventModal.isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {viewEventModal.isPublished ? 'Published & Live' : 'Draft'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Announcement Body:
                </span>
                <p className="text-slate-600 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/70 text-xs">
                  {viewEventModal.description}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => confirmDeleteEvent(viewEventModal)}
                className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                title="Delete Announcement"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setViewEventModal(null)}
                  className="w-10 h-10 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border border-[#d5ead7] flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewEventModal;
                    setViewEventModal(null);
                    openEditModal(toEdit);
                  }}
                  className="w-10 h-10 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Edit Announcement"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Announcement?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Are you sure you want to permanently remove this broadcast? It will be unpublished immediately from the storefront and mobile app.
                </p>
              </div>
            </div>

            {/* Target Item Snapshot Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
              {deleteTargetEvent.bannerImage ? (
                <img
                  src={deleteTargetEvent.bannerImage}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-200/70 border border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {deleteTargetEvent.title || 'Untitled Announcement'}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-100/70 text-[#01390f] font-semibold text-[10px]">
                    {deleteTargetEvent.category || 'Announcement'}
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono">
                    {deleteTargetEvent.eventDate ? new Date(deleteTargetEvent.eventDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setDeleteTargetEvent(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span className="whitespace-nowrap">{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingEventsManagement;