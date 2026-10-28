import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Filter,
  Search,
  Loader2,
  Package,
  Eye,
  FileDown,
  ChevronDown,
  X,
  RotateCcw,
  Clock,
  Layers,
  Trash2,
  Archive,
  FileSpreadsheet,
  ArrowUpDown,
  AlertTriangle,
} from 'lucide-react';
import axios, { API, API_BASE_URL } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

function InventoryExpiryMonitoring() {
  const [items, setItems] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_expiry');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [batchFilter, setBatchFilter] = useState('All');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [showExpiredOnly, setShowExpiredOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'expiry_desc' | 'name_asc' | 'qty_desc'
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal States
  const [selectedItem, setSelectedItem] = useState(null); // Detail Inspection Modal
  const [disposeModalItem, setDisposeModalItem] = useState(null);
  const [disposalForm, setDisposalForm] = useState({
    reason: 'Expired Stock / Shelf Life Exceeded',
    quantity: 0,
    disposedBy: 'Inventory Manager',
    notes: ''
  });
  const [disposing, setDisposing] = useState(false);

  // Fetch Expiry Items
  const fetchExpiryItems = useCallback(async () => {
    try {
      if (items.length === 0) setLoading(true);
      const token = localStorage.getItem('token');

      const response = await API.get('/api/inventory-expiry', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.items || []);

      if (Array.isArray(raw)) {
        setItems(raw);
        try {
          localStorage.setItem('cached_inventory_expiry', JSON.stringify(raw));
        } catch (e) { }
      }
    } catch (error) {
      console.error('Error loading expiry items:', error);
    } finally {
      setLoading(false);
    }
  }, [items.length]);

  useEffect(() => {
    fetchExpiryItems();
  }, [fetchExpiryItems]);

  // Unique categories and batches for dropdowns
  const existingCategories = useMemo(() => {
    const set = new Set();
    items.forEach((i) => {
      if (i.category && i.category.trim()) set.add(i.category.trim());
    });
    return Array.from(set);
  }, [items]);

  const existingBatches = useMemo(() => {
    const set = new Set();
    items.forEach((i) => {
      if (i.batchNo && i.batchNo.trim()) set.add(i.batchNo.trim());
    });
    return Array.from(set);
  }, [items]);

  // Counts for active vs archived/disposed
  const activeCount = useMemo(() => {
    return items.filter((i) => !i.isArchived && i.status !== 'Disposed').length;
  }, [items]);

  const archivedCount = useMemo(() => {
    return items.filter((i) => Boolean(i.isArchived) || i.status === 'Disposed').length;
  }, [items]);

  // Comprehensive shelf life KPI stats
  const expiryStats = useMemo(() => {
    let totalActive = 0;
    let safeCount = 0;
    let nearExpiryCount = 0;
    let criticalCount = 0;
    let expiredCount = 0;
    let totalStockUnits = 0;

    items.forEach((item) => {
      const isArchivedOrDisposed = Boolean(item.isArchived) || item.status === 'Disposed';
      if (!isArchivedOrDisposed) {
        totalActive++;
        totalStockUnits += Number(item.quantity || 0);
        const days = item.daysUntilExpiry;
        if (days <= 0 || item.status === 'Expired') {
          expiredCount++;
        } else if (days <= 30) {
          criticalCount++;
        } else if (days <= 60) {
          nearExpiryCount++;
        } else {
          safeCount++;
        }
      }
    });

    return {
      totalActive,
      safeCount,
      nearExpiryCount,
      criticalCount,
      expiredCount,
      totalStockUnits
    };
  }, [items]);

  const statusModules = useMemo(() => [
    { id: 'active', label: 'Expiry Monitoring' },
    { id: 'archived', label: 'Archive Vault' },
  ], []);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    let list = items.filter((item) => {
      // 1. Vault check
      const isArchivedOrDisposed = Boolean(item.isArchived) || item.status === 'Disposed';
      if (viewMode === 'active' && isArchivedOrDisposed) return false;
      if (viewMode === 'archived' && !isArchivedOrDisposed) return false;

      // Quick Toggles
      const days = item.daysUntilExpiry;
      if (showCriticalOnly && !(days > 0 && days <= 30)) return false;
      if (showExpiredOnly && !(days <= 0 || item.status === 'Expired')) return false;

      // 2. Search query (Code, Name, Batch)
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const code = (item.code || '').toLowerCase();
        const name = (item.itemDescription || item.itemName || '').toLowerCase();
        const batch = (item.batchNo || '').toLowerCase();
        if (!code.includes(query) && !name.includes(query) && !batch.includes(query)) {
          return false;
        }
      }

      // 3. Category
      if (categoryFilter !== 'All') {
        const cat = (item.category || '').toLowerCase();
        if (!cat.includes(categoryFilter.toLowerCase())) return false;
      }

      // 4. Status
      if (statusFilter !== 'All') {
        if (statusFilter === 'Expired' && !(days <= 0 || item.status === 'Expired')) return false;
        if (statusFilter === 'Critical' && !(days > 0 && days <= 30)) return false;
        if (statusFilter === 'Near Expiry' && !(days > 30 && days <= 60)) return false;
        if (statusFilter === 'Safe' && !(days > 60 && item.status !== 'Disposed')) return false;
        if (statusFilter === 'Disposed' && item.status !== 'Disposed') return false;
      }

      // 5. Batch
      if (batchFilter !== 'All') {
        if ((item.batchNo || '') !== batchFilter) return false;
      }

      return true;
    });

    if (sortBy === 'expiry_desc') {
      list.sort((a, b) => new Date(b.expiryDate || '1970-01-01') - new Date(a.expiryDate || '1970-01-01'));
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.itemDescription || a.itemName || '').localeCompare(b.itemDescription || b.itemName || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'qty_desc') {
      list.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
    } else {
      // FEFO: earliest expiry first
      list.sort((a, b) => new Date(a.expiryDate || '9999-12-31') - new Date(b.expiryDate || '9999-12-31'));
    }

    return list;
  }, [items, viewMode, searchQuery, categoryFilter, statusFilter, batchFilter, showCriticalOnly, showExpiredOnly, sortBy]);

  // Reset pagination on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, batchFilter, showCriticalOnly, showExpiredOnly, sortBy, viewMode]);

  // Paginated Slices
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery && searchQuery.trim() !== '') count++;
    if (categoryFilter !== 'All') count++;
    if (statusFilter !== 'All') count++;
    if (batchFilter !== 'All') count++;
    if (showCriticalOnly) count++;
    if (showExpiredOnly) count++;
    if (sortBy !== 'default') count++;
    if (viewMode !== 'active') count++;
    return count;
  }, [searchQuery, categoryFilter, statusFilter, batchFilter, showCriticalOnly, showExpiredOnly, sortBy, viewMode]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setStatusFilter('All');
    setBatchFilter('All');
    setShowCriticalOnly(false);
    setShowExpiredOnly(false);
    setSortBy('default');
    setViewMode('active');
    setCurrentPage(1);
  };

  // Open Disposal Modal
  const openDisposeModal = (item) => {
    setDisposeModalItem(item);
    setDisposalForm({
      reason: 'Expired Stock / Shelf Life Exceeded',
      quantity: item.quantity || 0,
      disposedBy: 'Inventory Manager',
      notes: `Batch ${item.batchNo} reached 0 days remaining (Expired: ${item.expiryDate}). Written off.`
    });
  };

  // Submit Batch Disposal
  const handleConfirmDisposal = async (e) => {
    if (e) e.preventDefault();
    if (!disposeModalItem) return;

    try {
      setDisposing(true);
      const token = localStorage.getItem('token');

      const payload = {
        batchNo: disposeModalItem.batchNo,
        code: disposeModalItem.code,
        category: disposeModalItem.category,
        itemDescription: disposeModalItem.itemDescription || disposeModalItem.itemName,
        quantity: Number(disposalForm.quantity) || 0,
        mfgDate: disposeModalItem.mfgDate,
        expiryDate: disposeModalItem.expiryDate,
        reason: disposalForm.reason,
        notes: disposalForm.notes,
        disposedBy: disposalForm.disposedBy
      };

      const res = await axios.post(`${API_BASE_URL}/api/inventory-expiry/dispose`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showSuccessToast(res.data?.message || `Batch "${disposeModalItem.batchNo}" successfully written off!`);
      setDisposeModalItem(null);
      if (selectedItem && selectedItem.batchNo === disposeModalItem.batchNo) {
        setSelectedItem(null);
      }
      fetchExpiryItems();
    } catch (err) {
      console.error('Failed to dispose batch:', err);
      showErrorToast(err.response?.data?.message || 'Failed to dispose batch.');
    } finally {
      setDisposing(false);
    }
  };

  // PDF Export Handlers
  const handleDownloadExpiryPdf = (item) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const isDisposed = item.status === 'Disposed';
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('CRM INVENTORY & WAREHOUSE MANAGEMENT', 14, 11);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        isDisposed ? 'OFFICIAL EXPIRED STOCK DISPOSAL & WRITE-OFF SLIP' : 'BATCH SHELF LIFE & EXPIRY INSPECTION CERTIFICATE',
        14,
        18
      );
      doc.setDrawColor(220, 225, 230);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 28, 182, 38, 2, 2, 'FD');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('BATCH / LOT NO:', 18, 36); doc.setFont('helvetica', 'normal'); doc.text(`${item.batchNo || 'N/A'}`, 55, 36);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEM CODE:', 18, 44); doc.setFont('helvetica', 'normal'); doc.text(`${item.code || 'N/A'}`, 55, 44);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEM NAME:', 18, 52); doc.setFont('helvetica', 'normal'); doc.text(`${item.itemDescription || item.itemName || 'N/A'}`, 55, 52);
      doc.setFont('helvetica', 'bold');
      doc.text('CATEGORY:', 18, 60); doc.setFont('helvetica', 'normal'); doc.text(`${item.category || 'General'}`, 55, 60);
      doc.setFont('helvetica', 'bold');
      doc.text('STOCK QUANTITY:', 122, 36); doc.setFont('helvetica', 'normal'); doc.text(`${item.quantity} ${(item.uom || 'pcs').toUpperCase()}`, 160, 36);
      doc.setFont('helvetica', 'bold');
      doc.text('MFG DATE:', 122, 44); doc.setFont('helvetica', 'normal'); doc.text(`${item.mfgDate ? new Date(item.mfgDate).toLocaleDateString() : 'N/A'}`, 160, 44);
      doc.setFont('helvetica', 'bold');
      doc.text('EXPIRY DATE:', 122, 52); doc.setFont('helvetica', 'normal'); doc.text(`${item.expiryDate && item.expiryDate !== 'N/A' && !isNaN(new Date(item.expiryDate).getTime()) ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}`, 160, 52);
      doc.setFont('helvetica', 'bold');
      doc.text('SHELF LIFE STATUS:', 122, 60); doc.setFont('helvetica', 'normal');
      doc.text(
        isDisposed ? 'DISPOSED / WRITTEN OFF' : item.daysUntilExpiry <= 0 ? `EXPIRED (${Math.abs(item.daysUntilExpiry)}d AGO)` : `${item.daysUntilExpiry} DAYS REMAINING`,
        160,
        60
      );
      const tableHead = [['Parameter', 'Recorded Inspection Details', 'Status Evaluation']];
      const tableBody = [
        ['Batch Identification', `Lot: ${item.batchNo || 'N/A'}`, 'Verified System Batch'],
        ['Material Description', item.itemDescription || item.itemName || 'N/A', `Code: ${item.code || 'N/A'}`],
        ['Monitored Category', item.category || 'General', item.source || 'Warehouse Inventory'],
        ['Batch Current Volume', `${item.quantity} ${(item.uom || 'pcs').toUpperCase()}`, 'Physical Count Checked'],
        ['Manufacturing Record', item.mfgDate ? new Date(item.mfgDate).toLocaleDateString() : 'N/A', 'Production / Inbound Record'],
        ['Expiration Date Limit', item.expiryDate && item.expiryDate !== 'N/A' && !isNaN(new Date(item.expiryDate).getTime()) ? new Date(item.expiryDate).toLocaleDateString() : 'N/A', 'Manufacturer Specification'],
        ['Shelf Life Evaluation', item.daysUntilExpiry <= 0 ? 'CRITICAL - ZERO SHELF LIFE' : `${item.daysUntilExpiry} Days Active Shelf Life`, item.daysUntilExpiry <= 0 ? 'Quarantine & Write-Off' : 'FEFO Dispatch Recommended'],
        ...(isDisposed && item.disposalDetails ? [['Disposal Authorization', item.disposalDetails.disposedBy || 'Authorized Admin', 'Official Write-Off'], ['Disposal Reason', item.disposalDetails.reason || 'Expired Stock', 'Disposal Protocol Checked'], ['Disposal Notes', item.disposalDetails.notes || 'N/A', 'Audit Log Logged']] : [])
      ];
      autoTable(doc, {
        startY: 72,
        head: tableHead,
        body: tableBody,
        headStyles: { fillColor: [1, 57, 15], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
        styles: { cellPadding: 2.8 }
      });
      const finalY = doc.lastAutoTable.finalY + 8;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, finalY, 182, 18, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('FEFO PROTOCOL: Items with shortest remaining shelf life must be prioritized for immediate production / dispatch.', 18, finalY + 6);
      doc.text('EXPIRED ITEMS: Expired stock must be physically separated from usable raw materials to prevent cross-contamination.', 18, finalY + 12);
      const signY = finalY + 32;
      doc.setDrawColor(180, 180, 180);
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.line(14, signY, 65, signY); doc.text('INSPECTOR / WAREHOUSE CLERK', 14, signY + 5);
      doc.line(78, signY, 130, signY); doc.text('QC / QA LEAD', 78, signY + 5);
      doc.line(144, signY, 196, signY); doc.text('INVENTORY HEAD', 144, signY + 5);
      doc.save(`Expiry_Inspection_${item.batchNo || 'Batch'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to generate PDF document.');
    }
  };

  const handleDownloadExpiryAuditReport = (itemList) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('CRM INVENTORY SYSTEM - MASTER EXPIRY MONITORING AUDIT REPORT', 14, 11);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Monitored Batches: ${itemList.length}`, 14, 18);
      const tableHead = [['#', 'Batch / Lot No', 'Item Code', 'Item Description', 'Category', 'Stock Qty', 'Mfg Date', 'Expiry Date', 'Days Remaining', 'Status']];
      const tableBody = (itemList || []).map((item, idx) => [
        idx + 1,
        item.batchNo || 'N/A',
        item.code || 'N/A',
        item.itemDescription || item.itemName || 'N/A',
        item.category || 'General',
        `${item.quantity} ${item.uom || 'pcs'}`,
        item.mfgDate ? new Date(item.mfgDate).toLocaleDateString() : 'N/A',
        item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
        item.status === 'Disposed' ? 'Written Off' : item.daysUntilExpiry <= 0 ? `Expired (${Math.abs(item.daysUntilExpiry)}d ago)` : `${item.daysUntilExpiry} days`,
        item.status === 'Disposed' ? 'Disposed' : item.daysUntilExpiry <= 0 ? 'Expired' : 'Active'
      ]);
      autoTable(doc, {
        startY: 30,
        head: tableHead,
        body: tableBody,
        headStyles: { fillColor: [1, 57, 15], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
        styles: { cellPadding: 2.2 }
      });
      doc.save(`Expiry_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export audit report.');
    }
  };

  const renderStatusBadge = (item) => {
    if (item.status === 'Disposed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-md font-semibold border border-slate-200 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Disposed
        </span>
      );
    }
    const days = item.daysUntilExpiry;
    if (days <= 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md font-semibold border border-rose-200 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Expired ({Math.abs(days)}d ago)
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-md font-semibold border border-rose-200 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Critical ({days}d left)
        </span>
      );
    }
    if (days <= 60) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md font-semibold border border-amber-300 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Near Expiry ({days}d left)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-200 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Safe ({days}d left)
      </span>
    );
  };

  const renderCategoryBadge = (category) => {
    return (
      <span className="inline-flex items-center text-xs text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md font-semibold border border-emerald-200">
        {category || 'General'}
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-800">

      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">

        {/* ======================================================== */}
        {/* COMPACT EXCEL RIBBON TOOLBAR (SEAMLESS WHITE DESIGN)     */}
        {/* ======================================================== */}
        <div className="w-full bg-white flex flex-col">

          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
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
                    className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 ${isActive
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

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN WHITE BACKGROUND - 1 ROW NO WRAPPING) */}
          <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">

            {/* GROUP 1: ACTIONS (Reset Filters) */}
            <div className="w-[140px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex items-center flex-1 py-1">
                {/* Reset Filters */}
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  disabled={activeFiltersCount === 0}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white transition-colors text-xs font-semibold cursor-pointer w-full disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                  title={activeFiltersCount > 0 ? `Reset active filters (${activeFiltersCount})` : 'No active filters'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="whitespace-nowrap">
                    Reset Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                  </span>
                </button>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                Actions
              </div>
            </div>

            {/* GROUP 2: SEARCH & FILTERS (Equal 3-Column Grid) */}
            <div className="flex flex-col justify-between flex-1 min-h-[92px] pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-1">

                {/* Layer 1: Search Bar */}
                <div className="relative flex items-center w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search Code, Name, Batch..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search Code, Name, Batch..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Layer 2: Filter Dropdowns (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Category Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Package className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Category"
                    >
                      <option value="All">All Categories ({existingCategories.length})</option>
                      <option value="Raw Materials">Raw Materials</option>
                      <option value="Finished Goods">Finished Goods</option>
                      {existingCategories
                        .filter((cat) => cat !== 'Raw Materials' && cat !== 'Finished Goods')
                        .map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                    </select>
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Clock className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Expiry Status"
                    >
                      <option value="All">All Expiry Status</option>
                      <option value="Safe">🟢 Safe Buffer (&gt; 60 Days)</option>
                      <option value="Near Expiry">🟡 Near Expiry (≤ 60 Days)</option>
                      <option value="Critical">🔴 Critical Alert (≤ 30 Days)</option>
                      <option value="Expired">⚠️ Expired (0 Days / Past)</option>
                      <option value="Disposed">📦 Disposed / Written Off</option>
                    </select>
                  </div>

                  {/* Batch Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Layers className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={batchFilter}
                      onChange={(e) => setBatchFilter(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Batch / DR"
                    >
                      <option value="All">All Batches / DRs ({existingBatches.length})</option>
                      {existingBatches.map((batch, idx) => (
                        <option key={idx} value={batch}>{batch}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Layer 3: Quick Filter Toggles & Sort (Exact Same 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Critical Alert */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCriticalOnly(!showCriticalOnly);
                      if (!showCriticalOnly) setShowExpiredOnly(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${showCriticalOnly
                        ? 'bg-rose-50 text-rose-700 border border-rose-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    title="Filter Critical Batches (<= 30 days left)"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Critical (≤ 30d)</span>
                    <span className="font-mono text-[11px]">({expiryStats.criticalCount})</span>
                  </button>

                  {/* Expired Only */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowExpiredOnly(!showExpiredOnly);
                      if (!showExpiredOnly) setShowCriticalOnly(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${showExpiredOnly
                        ? 'bg-red-50 text-red-700 border border-red-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    title="Filter Expired Batches"
                  >
                    <span>Expired Only</span>
                    <span className="font-mono text-[11px]">({expiryStats.expiredCount})</span>
                  </button>

                  {/* Sort Select */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Sort items"
                    >
                      <option value="default">Sort: FEFO (Earliest)</option>
                      <option value="expiry_desc">Expiry: Latest First</option>
                      <option value="name_asc">Name (A → Z)</option>
                      <option value="qty_desc">Qty (High → Low)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-1 select-none">
                Search & Filter
              </div>
            </div>

          </div>

        </div>

        {/* CLEAN SEPARATOR BEFORE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* TABLE MASTERLIST */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">ITEM CODE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">BATCH / LOT NO</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">ITEM NAME</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STOCK VOLUME</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">MFG DATE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">EXPIRY DATE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">DAYS REMAINING</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px] font-semibold text-white">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Fetching shelf life and expiry records...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedItems.map((item, idx) => (
                  <tr
                    key={item._id || idx}
                    className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                  >
                    {/* ITEM CODE */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {item.code || 'N/A'}
                    </td>

                    {/* BATCH / LOT NO */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {item.batchNo || 'N/A'}
                    </td>

                    {/* CATEGORY */}
                    <td className="py-3.5 px-4 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {renderCategoryBadge(item.category)}
                    </td>

                    {/* ITEM NAME */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap max-w-xs truncate bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {item.itemDescription || item.itemName || 'N/A'}
                    </td>

                    {/* STOCK VOLUME */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {Number(item.quantity ?? 0).toLocaleString()} {item.uom || 'pcs'}
                    </td>

                    {/* MFG DATE */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {item.mfgDate ? new Date(item.mfgDate).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* EXPIRY DATE */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {item.expiryDate && item.expiryDate !== 'N/A' && !isNaN(new Date(item.expiryDate).getTime()) ? (
                        <span className="text-rose-700">{new Date(item.expiryDate).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-slate-500 font-semibold">N/A</span>
                      )}
                    </td>

                    {/* DAYS REMAINING */}
                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {item.status === 'Disposed' ? (
                        <span className="text-slate-400">Written Off</span>
                      ) : item.daysUntilExpiry <= 0 ? (
                        <span className="text-rose-600">0d (Expired)</span>
                      ) : (
                        <span
                          className={
                            item.daysUntilExpiry <= 30
                              ? 'text-rose-600'
                              : item.daysUntilExpiry <= 60
                                ? 'text-amber-700'
                                : 'text-[#01390f]'
                          }
                        >
                          {item.daysUntilExpiry}d left
                        </span>
                      )}
                    </td>

                    {/* STATUS BADGE */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                      {renderStatusBadge(item)}
                    </td>

                    {/* ACTION COLUMN (EYE ICON BUTTON TO OPEN DETAIL MODAL) */}
                    <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-20 min-w-[80px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          title="View Expiry Details"
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      {viewMode === 'archived'
                        ? 'No archived or disposed expiry records in the vault.'
                        : 'No active expiry records matched your search or filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DETAIL INSPECTION MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                  Batch Expiry & Shelf Life Details
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedItem.itemDescription || selectedItem.itemName || 'Inventory Item'} • Batch: {selectedItem.batchNo || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm">
              {/* PRIMARY BATCH CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-200/70 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wide">
                      Batch / Lot Number
                    </span>
                    <span className="font-bold text-slate-900 text-sm block font-mono">
                      {selectedItem.batchNo || 'N/A'}
                    </span>
                  </div>
                  <div>{renderStatusBadge(selectedItem)}</div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Item Code</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedItem.code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Stock Volume</span>
                    <span className="font-bold text-[#01390f] font-mono">
                      {Number(selectedItem.quantity ?? 0).toLocaleString()} {selectedItem.uom || 'pcs'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Mfg / Received Date</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {selectedItem.mfgDate ? new Date(selectedItem.mfgDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Expiration Date</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {selectedItem.expiryDate && selectedItem.expiryDate !== 'N/A' && !isNaN(new Date(selectedItem.expiryDate).getTime())
                        ? new Date(selectedItem.expiryDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">Item Description</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {selectedItem.itemDescription || selectedItem.itemName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">Category</span>
                    {renderCategoryBadge(selectedItem.category)}
                  </div>
                </div>
              </div>

              {/* DISPOSAL RECORD (IF DISPOSED) */}
              {selectedItem.status === 'Disposed' && selectedItem.disposalDetails && (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 flex flex-col gap-2 text-xs">
                  <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wide">
                    Disposal & Write-Off Record
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                    <div>
                      <span className="text-slate-400 block font-semibold">Disposed By:</span>
                      {selectedItem.disposalDetails.disposedBy || 'Authorized Admin'}
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Reason:</span>
                      {selectedItem.disposalDetails.reason || 'Expired Stock'}
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block font-semibold">Notes:</span>
                      {selectedItem.disposalDetails.notes || 'N/A'}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION TO WRITE-OFF IF EXPIRED & NOT YET DISPOSED */}
              {selectedItem.daysUntilExpiry <= 0 && selectedItem.status !== 'Disposed' && (
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-rose-800 text-xs block">
                      Shelf Life Expired
                    </span>
                    <span className="text-[11px] text-rose-600">
                      This batch has reached 0 days remaining and should be formally written off.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDisposeModal(selectedItem)}
                    className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>Write-Off Stock</span>
                  </button>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => handleDownloadExpiryPdf(selectedItem)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-rose-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-600" />
                <span>Download Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPOSAL WRITE-OFF MODAL */}
      {disposeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-rose-50/80 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-rose-900 whitespace-nowrap">
                  Dispose Expired Batch ({disposeModalItem.batchNo})
                </h3>
                <p className="text-xs text-rose-700">Write off stock past shelf life</p>
              </div>
              <button
                type="button"
                onClick={() => setDisposeModalItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDisposal} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 flex flex-col gap-4 overflow-y-auto text-xs sm:text-sm">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900">
                  <p className="text-xs">
                    Batch expired on <strong>{disposeModalItem.expiryDate}</strong>. Confirming removal from active inventory.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Item Code:</span>
                    <span className="font-mono font-bold text-slate-800">{disposeModalItem.code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Category:</span>
                    <span className="font-bold text-slate-800">{disposeModalItem.category || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-semibold">Description:</span>
                    <span className="font-bold text-slate-900">{disposeModalItem.itemDescription || disposeModalItem.itemName || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="block text-xs font-bold text-slate-700">Disposal Reason *</label>
                  <select
                    value={disposalForm.reason}
                    onChange={(e) => setDisposalForm({ ...disposalForm, reason: e.target.value })}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option>Expired Stock / Shelf Life Exceeded</option>
                    <option>Degraded Quality / Chemical Breakdown</option>
                    <option>Compromised Packaging / Contamination</option>
                  </select>

                  <label className="block text-xs font-bold text-slate-700">Disposal Notes *</label>
                  <textarea
                    rows={2}
                    value={disposalForm.notes}
                    onChange={(e) => setDisposalForm({ ...disposalForm, notes: e.target.value })}
                    placeholder="Enter formal write-off remarks..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setDisposeModalItem(null)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disposing}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {disposing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>Confirm Write-Off</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryExpiryMonitoring;