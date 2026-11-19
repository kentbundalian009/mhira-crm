import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  FileDown,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Archive,
  Layers,
  Info,
  Check,
} from 'lucide-react';
import axios, { API, API_BASE_URL } from '../axios';
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

  // Tab View Mode: 'active' (All Broadcasts) vs 'archived' (Archive Vault)
  const [viewMode, setViewMode] = useState('active');

  // Multi-Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'published' | 'draft'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewEventModal, setViewEventModal] = useState(null);
  const [modalError, setModalError] = useState('');
  const [archiveTargetEvent, setArchiveTargetEvent] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);
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
  const eventDateInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/events');
      const safeData = Array.isArray(res.data)
        ? res.data
        : res.data?.events || res.data?.items || res.data?.data || [];
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
    const file = e.target.files?.[0];
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

  // Toggle Archive / Restore
  const handleExecuteToggleArchive = async () => {
    if (!archiveTargetEvent) return;
    setIsArchiving(true);
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const id = archiveTargetEvent._id;
      const isCurrentlyArchived = Boolean(archiveTargetEvent.isArchived);

      await axios.patch(`${API_BASE_URL}/api/events/${id}/archive`, {}, config).catch(async () => {
        return await axios.put(
          `${API_BASE_URL}/api/events/${id}`,
          {
            isArchived: !isCurrentlyArchived,
            isPublished: !isCurrentlyArchived ? false : archiveTargetEvent.isPublished,
          },
          config
        );
      });

      showSuccessToast(
        isCurrentlyArchived
          ? 'Announcement restored to active broadcasts!'
          : 'Announcement moved to Archive Vault.'
      );

      setEvents((prev) => {
        const next = prev.map((item) =>
          item._id === id
            ? {
              ...item,
              isArchived: !isCurrentlyArchived,
              isPublished: !isCurrentlyArchived ? false : item.isPublished,
            }
            : item
        );
        try {
          localStorage.setItem('cached_marketing_events', JSON.stringify(next));
        } catch (_e) { }
        return next;
      });

      if (viewEventModal?._id === id) {
        setViewEventModal(null);
      }
      setArchiveTargetEvent(null);
      notifyLiveSync('marketing');
      fetchEvents();
    } catch (err) {
      console.error('Error toggling archive status:', err);
      showErrorToast(err.response?.data?.message || 'Failed to update archive status.');
    } finally {
      setIsArchiving(false);
    }
  };

  // Permanent Delete
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
      showSuccessToast('Announcement permanently deleted.');

      setEvents((prev) => {
        const next = prev.filter((item) => item._id !== deleteTargetEvent._id);
        try {
          localStorage.setItem('cached_marketing_events', JSON.stringify(next));
        } catch (_e) { }
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

  // Tab Counts
  const activeEventsCount = useMemo(() => events.filter((e) => !e.isArchived).length, [events]);
  const archivedEventsCount = useMemo(
    () => events.filter((e) => Boolean(e.isArchived)).length,
    [events]
  );

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // 0. Active vs Archive Vault Check
      const isArchived = Boolean(evt.isArchived);
      if (viewMode === 'active' && isArchived) return false;
      if (viewMode === 'archived' && !isArchived) return false;

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
  }, [events, viewMode, searchQuery, selectedCategory, selectedStatus]);

  // Unique Categories from relevant scope
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

  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, searchQuery, selectedCategory, selectedStatus]);

  // Export PDF Summary
  const handleExportAnnouncementsPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(
        viewMode === 'archived'
          ? 'MHIRA NATURAL - ARCHIVE VAULT ANNOUNCEMENTS AUDIT'
          : 'MHIRA NATURAL - ANNOUNCEMENTS & EVENTS AUDIT',
        14,
        11
      );

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Items: ${filteredEvents.length} | Scope: ${viewMode === 'archived' ? 'Archive Vault' : 'All Active Broadcasts'
        }`,
        14,
        18
      );

      const tableHead = [
        ['#', 'Title / Headline', 'Event Date', 'Location / Venue', 'Category', 'Status'],
      ];
      const tableBody = filteredEvents.map((evt, idx) => [
        idx + 1,
        evt.title || 'Announcement',
        evt.eventDate ? new Date(evt.eventDate).toLocaleDateString() : 'Ongoing',
        evt.location || 'Online',
        evt.category || 'General',
        evt.isArchived ? 'ARCHIVED' : evt.isPublished ? 'PUBLISHED' : 'DRAFT',
      ]);

      autoTable(doc, {
        startY: 32,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
        styles: { cellPadding: 2.8 },
      });

      const fileName = `${viewMode === 'archived' ? 'Announcements_Archive_Vault_' : 'Announcements_Audit_'
        }${new Date().toISOString().split('T')[0]}.pdf`;
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
        {/* EXCEL SHEET TABS: All Broadcasts & Archive Vault */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'active', label: 'All Broadcasts' },
              { id: 'archived', label: 'Archive Vault' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setViewMode(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${viewMode === tab.id
                  ? 'border-[#153E97] text-[#153E97] bg-slate-50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                  }`}
              >
                {tab.id === 'active' ? (
                  <Layers className="w-3.5 h-3.5 text-[#153E97]" />
                ) : (
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
          {/* ACTIONS GROUP */}
          <div
            className={`w-full ${viewMode === 'archived' ? 'lg:w-[130px]' : 'lg:w-[210px]'
              } shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]`}
          >
            <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
              {/* Tall Action Button: New Broadcast (Active view only) */}
              {viewMode !== 'archived' && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#153E97]"
                  title="Create a new storefront announcement"
                >
                  <Plus
                    className="w-5.5 h-5.5 text-[#153E97] group-hover:scale-110 transition-transform mb-0.5"
                    strokeWidth={2.5}
                  />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    New
                    <br />
                    Broadcast
                  </span>
                </button>
              )}

              {/* Stacked Compact Rows */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                {/* Export PDF */}
                <button
                  type="button"
                  onClick={handleExportAnnouncementsPdf}
                  disabled={filteredEvents.length === 0}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                  title="Export Announcements Audit PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#153E97] shrink-0" />
                  <span className="whitespace-nowrap">Export PDF</span>
                </button>

                {/* Reset Filters */}
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  disabled={activeFiltersCount === 0}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                  title={
                    activeFiltersCount > 0
                      ? `Reset active filters (${activeFiltersCount})`
                      : 'No active filters'
                  }
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
                  placeholder="Search announcement title, location, description..."
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
              <div className="grid grid-cols-3 gap-2 w-full">
                {/* Category Select */}
                <div className="relative w-full">
                  <Tag className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
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
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
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
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#153E97] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">Preset: All Broadcasts</option>
                    <option value="Announcement">Preset: Announcements</option>
                    <option value="Event">Preset: Special Events</option>
                    <option value="Promo">Preset: Promos &amp; Deals</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: Quick Toggles */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedStatus(selectedStatus === 'published' ? 'All' : 'published')
                  }
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${selectedStatus === 'published'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Live Only
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === 'draft' ? 'All' : 'draft')}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${selectedStatus === 'draft'
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-800 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Drafts Only
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === 'Announcement' ? 'All' : 'Announcement'
                    )
                  }
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${selectedCategory === 'Announcement'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Announcements
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
              Search &amp; Filter
            </div>
          </div>
        </div>

        {/* HR DIVIDER ABOVE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* 3. TABLE MASTERLIST */}
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
                <tr className="bg-[#153E97] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[260px]">
                    ANNOUNCEMENT TITLE &amp; BANNER
                  </th>
                  <th className="py-3.5 px-4 whitespace-nowrap">CATEGORY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">EVENT DATE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px]">LOCATION / VENUE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">STOREFRONT STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#153E97] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-28 min-w-[110px]">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-12 text-[#153E97] font-medium italic whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading announcements and events...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedEvents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="w-6 h-6 text-slate-300" />
                        <span>
                          {viewMode === 'archived'
                            ? 'No archived announcements found in the Archive Vault.'
                            : searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All'
                              ? 'No announcements match your filter criteria.'
                              : 'No announcements created yet. Click "New Broadcast" to publish your first post.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEvents.map((evt, idx) => {
                    const isLive = Boolean(evt.isPublished);
                    const isItemArchived = Boolean(evt.isArchived);

                    return (
                      <tr
                        key={evt._id || evt.id || idx}
                        className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                      >
                        {/* 1. TITLE & BANNER */}
                        <td className="px-4 py-3.5 whitespace-nowrap min-w-[260px] bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          <div className="flex items-center gap-3">
                            {evt.bannerImage ? (
                              <img
                                src={evt.bannerImage}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0 max-w-[240px]">
                              <span
                                className="font-semibold text-xs text-slate-900 truncate"
                                title={evt.title}
                              >
                                {evt.title || 'Untitled Announcement'}
                              </span>
                              <span
                                className="text-[11px] text-slate-500 truncate"
                                title={evt.description}
                              >
                                {evt.description || 'No description provided'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. CATEGORY (Standard Pill Badge — Blue / Yellow) */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${(evt.category || '').toLowerCase().includes('promo') ||
                              (evt.category || '').toLowerCase().includes('event')
                              ? 'bg-yellow-50 text-yellow-800 border-yellow-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                          >
                            {evt.category || 'Announcement'}
                          </span>
                        </td>

                        {/* 3. EVENT DATE */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold text-slate-800 bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          {evt.eventDate && !isNaN(new Date(evt.eventDate).getTime())
                            ? new Date(evt.eventDate).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                            : 'Ongoing'}
                        </td>

                        {/* 4. LOCATION */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-slate-50/50 group-hover:bg-blue-50/30 transition-colors">
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={evt.location}>
                              {evt.location || 'Online / Main Store'}
                            </span>
                          </span>
                        </td>

                        {/* 5. STOREFRONT STATUS (Blue / Yellow / Red Tinted Cell) */}
                        <td
                          className={`px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold transition-colors select-none ${isItemArchived
                              ? 'bg-red-500/20 group-hover:bg-red-500/30 text-red-900'
                              : isLive
                                ? 'bg-blue-500/20 group-hover:bg-blue-500/30 text-blue-900'
                                : 'bg-yellow-500/20 group-hover:bg-yellow-500/30 text-yellow-900'
                            }`}
                        >
                          {isItemArchived ? (
                            <span>Archived</span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleTogglePublish(evt, e)}
                              className="cursor-pointer hover:opacity-80 active:scale-95 transition-transform"
                              title="Click to toggle publish status"
                            >
                              {isLive ? 'Live' : 'Draft'}
                            </button>
                          )}
                        </td>

                        {/* 6. ACTION (Sticky Right) */}
                        <td className="py-3 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-28 min-w-[110px] transition-colors">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Eye (View) */}
                            <button
                              type="button"
                              onClick={() => setViewEventModal(evt)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#153E97] hover:text-white hover:border-[#153E97] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="View Announcement Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {viewMode === 'active' ? (
                              <>
                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(evt)}
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#153E97] hover:text-white hover:border-[#153E97] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="Edit Announcement"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Archive */}
                                <button
                                  type="button"
                                  onClick={() => setArchiveTargetEvent(evt)}
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="Move to Archive Vault"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Restore */}
                                <button
                                  type="button"
                                  onClick={() => setArchiveTargetEvent(evt)}
                                  className="w-8 h-8 rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="Restore to All Broadcasts"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                {/* Permanent Delete */}
                                <button
                                  type="button"
                                  onClick={(e) => confirmDeleteEvent(evt, e)}
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="Permanently Delete"
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

      {/* CREATE / EDIT ANNOUNCEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {selectedEvent ? 'Edit Announcement' : 'Create New Announcement'}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedEvent
                    ? 'Modify existing event broadcast, schedule, venue, and storefront banner'
                    : 'Post news, special promotional dates, and event broadcasts to the storefront'}
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

            {/* MODAL FORM BODY */}
            <form
              onSubmit={handleSubmit}
              className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm"
            >
              <div className="p-6 flex flex-col gap-5 flex-1 overflow-y-auto custom-scrollbar">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                    {modalError}
                  </div>
                )}

                {/* 1. PUBLISH TO STOREFRONT TOGGLE (CLEAN INLINE WITH UNDERLINE) */}
                <div
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, isPublished: !prev.isPublished }))
                  }
                  className="flex items-center gap-3 pb-3 border-b border-slate-100 cursor-pointer select-none group"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData((prev) => ({ ...prev, isPublished: !prev.isPublished }));
                    }}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${formData.isPublished
                        ? 'bg-[#01390f] text-white border-[#01390f]'
                        : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {formData.isPublished ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#01390f] transition-colors">
                      Publish to storefront immediately{' '}
                      <span className="text-[11px] font-normal text-slate-400">
                        (Visible to customers)
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formData.isPublished
                        ? 'Live in Customer Events & Promos storefront (/events) immediately upon saving'
                        : 'Saved as draft (hidden from customers until published)'}
                    </span>
                  </div>
                </div>

                {/* 2. BANNER IMAGE UPLOAD */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      Announcement Banner Image{' '}
                      <span className="text-[11px] font-normal normal-case text-slate-400">
                        (Max 2MB)
                      </span>
                    </label>
                    {formData.bannerImage && (
                      <span className="text-[11px] font-mono text-slate-400">1 banner added</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto py-1 custom-scrollbar">
                    <label
                      title="Upload Banner Image"
                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 self-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>

                    {formData.bannerImage ? (
                      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs shrink-0">
                        <img
                          src={formData.bannerImage}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1.5 left-1.5 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          Banner
                        </span>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, bannerImage: '' }))}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                          title="Remove banner image"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No banner uploaded yet. Click &ldquo;+&rdquo; to upload an event poster or
                        banner.
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. ANNOUNCEMENT TITLE */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                    Announcement Title <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Grand Anniversary Sale & New Product Launch"
                    className="w-full h-9 bg-transparent border-b-2 border-slate-200 text-slate-800 px-0.5 text-xs font-semibold placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-[#01390f] transition-colors"
                  />
                </div>

                {/* 4. 3-COLUMN GRID: CATEGORY, EVENT DATE & LOCATION / VENUE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Category
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                      <input
                        type="text"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        placeholder="e.g. Promo / Event"
                        className="w-full h-9 bg-transparent text-slate-800 px-0.5 text-xs font-semibold placeholder:text-slate-300 placeholder:font-normal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        Event Date
                      </label>
                      {formData.eventDate ? (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, eventDate: '' }))}
                          className="text-[10px] font-bold text-red-600 hover:text-red-700 cursor-pointer flex items-center gap-0.5 transition-colors"
                          title="Clear event date"
                        >
                          <X className="w-3 h-3" /> Clear
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                      )}
                    </div>
                    <div
                      onClick={() => {
                        try {
                          eventDateInputRef.current?.showPicker();
                          eventDateInputRef.current?.focus();
                        } catch (err) {}
                      }}
                      className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] cursor-pointer transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                      <input
                        ref={eventDateInputRef}
                        type="date"
                        name="eventDate"
                        placeholder="mm/dd/yyyy"
                        value={formData.eventDate || ''}
                        onChange={handleInputChange}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) {}
                        }}
                        onFocus={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) {}
                        }}
                        className="w-full h-9 bg-transparent text-slate-800 px-0.5 text-xs font-semibold focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Location / Venue
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        placeholder="e.g. Online / SM Mall"
                        className="w-full h-9 bg-transparent text-slate-800 px-0.5 text-xs font-semibold placeholder:text-slate-300 placeholder:font-normal focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. ANNOUNCEMENT DETAILS */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                    Announcement Details <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter full details of the announcement or event..."
                    className="w-full bg-transparent border-b-2 border-slate-200 text-slate-800 py-2 px-0.5 text-xs font-medium placeholder:text-slate-300 placeholder:font-normal focus:outline-none focus:border-[#01390f] transition-colors resize-none"
                  />
                </div>

                {/* 6. HELPER NOTE */}
                <div className="pt-1 text-xs text-slate-400">
                  <span>
                    <strong className="text-slate-500 font-semibold">Note:</strong>{' '}
                    {formData.isPublished
                      ? 'This announcement will immediately appear on the Customer Events & Promos page (/events) once saved.'
                      : 'Saved as draft. You can publish it anytime from the Storefront Status column or by editing this broadcast.'}
                  </span>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-slate-200 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span className="whitespace-nowrap">
                    {submitting
                      ? 'Saving...'
                      : selectedEvent
                        ? 'Save Changes'
                        : formData.isPublished
                          ? 'Publish Announcement'
                          : 'Save as Draft'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {viewEventModal.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Announcement broadcast details, venue schedule, and storefront status
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewEventModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY (VIEW ONLY — CLEAN PARAGRAPH STYLE, NO ICONS OR CONTAINERS) */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              {/* BANNER IMAGE (PRODUCT STOREFRONT IMAGES SIZE) */}
              {viewEventModal.bannerImage && (
                <div className="flex items-center gap-3 overflow-x-auto py-1 custom-scrollbar">
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs shrink-0">
                    <img
                      src={viewEventModal.bannerImage}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      Banner
                    </span>
                  </div>
                </div>
              )}

              {/* PARAGRAPH STYLE DETAILS (NO ICONS, NO LABELS, NO CONTAINERS) */}
              <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-800">
                  {viewEventModal.location || 'Online / Main Store'}
                </p>
                <p className="text-slate-500">
                  {viewEventModal.eventDate
                    ? new Date(viewEventModal.eventDate).toLocaleDateString()
                    : 'Ongoing'}
                </p>
                <p className="font-semibold text-[#01390f]">
                  {viewEventModal.category || 'Announcement'}
                </p>
                {viewEventModal.description && (
                  <p className="pt-2 text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {viewEventModal.description}
                  </p>
                )}
              </div>
            </div>

            {/* MODAL FOOTER (CLOSE ONLY) */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewEventModal(null)}
                className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE / RESTORE CONFIRMATION MODAL */}
      {archiveTargetEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${archiveTargetEvent.isArchived
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
              >
                {archiveTargetEvent.isArchived ? (
                  <RotateCcw className="w-5 h-5" />
                ) : (
                  <Archive className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  {archiveTargetEvent.isArchived ? 'Restore Announcement?' : 'Archive Announcement?'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {archiveTargetEvent.isArchived
                    ? 'This announcement will be restored back to your active broadcasts list.'
                    : 'This announcement will be moved to the Archive Vault and unpublished from storefront customer displays.'}
                </p>
              </div>
            </div>

            {/* Target Item Snapshot Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex items-center gap-3">
              {archiveTargetEvent.bannerImage ? (
                <img
                  src={archiveTargetEvent.bannerImage}
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
                  {archiveTargetEvent.title || 'Untitled Announcement'}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                    {archiveTargetEvent.category || 'Announcement'}
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono">
                    {archiveTargetEvent.eventDate
                      ? new Date(archiveTargetEvent.eventDate).toLocaleDateString()
                      : 'Ongoing'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setArchiveTargetEvent(null)}
                disabled={isArchiving}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-slate-200 whitespace-nowrap disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteToggleArchive}
                disabled={isArchiving}
                className={`px-6 py-2.5 sm:py-3 rounded-full text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap ${archiveTargetEvent.isArchived
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {isArchiving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : archiveTargetEvent.isArchived ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                <span className="whitespace-nowrap">
                  {isArchiving
                    ? 'Processing...'
                    : archiveTargetEvent.isArchived
                      ? 'Yes, Restore'
                      : 'Yes, Archive'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {deleteTargetEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Permanently Delete?</h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Are you sure you want to permanently remove this broadcast from the database? This action
                  cannot be undone.
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
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                    {deleteTargetEvent.category || 'Announcement'}
                  </span>
                  <span>&bull;</span>
                  <span className="font-mono">
                    {deleteTargetEvent.eventDate
                      ? new Date(deleteTargetEvent.eventDate).toLocaleDateString()
                      : 'Ongoing'}
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
                className="px-5 py-2.5 sm:py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-slate-200 whitespace-nowrap disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-red-600 hover:bg-red-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="whitespace-nowrap">
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingEventsManagement;
