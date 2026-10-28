import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Package,
  Layers,
  Clock,
  Filter,
  Loader2,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  RotateCcw,
  ChevronDown,
  Activity,
  EyeOff,
  Info,
  ArrowUpDown,
  Boxes
} from 'lucide-react';
import axios, { API, API_BASE_URL } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';
import { INITIAL_DEFAULT_PRODUCTS } from './InventoryFinishedGoods';

function InventoryReports() {
  // Selected Tab: 'raw-materials' | 'finished-goods' | 'expiry-monitoring'
  const [activeTab, setActiveTab] = useState('raw-materials');

  // Filter States - Default to 'All' so all active warehouse records show immediately
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [showZeroOnly, setShowZeroOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Data States
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [expiryItems, setExpiryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all reports ledger data with safe caching
  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };

      const [prodRes, rawRes, expRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/inventory-products`, config).catch(async () => {
          return await API.get('/api/products').catch(() => ({ data: [] }));
        }),
        axios.get(`${API_BASE_URL}/api/inventory-raw-materials`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/inventory-expiry`, config).catch(() => ({ data: [] })),
      ]);

      if (prodRes.status === 'fulfilled') {
        const raw = Array.isArray(prodRes.value.data)
          ? prodRes.value.data
          : (prodRes.value.data?.products || prodRes.value.data?.items || []);
        if (raw.length > 0) {
          setProducts(raw);
          try {
            localStorage.setItem('cached_inventory_products', JSON.stringify(raw));
          } catch (e) { }
        } else {
          try {
            const cached = JSON.parse(localStorage.getItem('cached_inventory_products') || '[]');
            setProducts(cached.length > 0 ? cached : INITIAL_DEFAULT_PRODUCTS);
          } catch (e) {
            setProducts(INITIAL_DEFAULT_PRODUCTS);
          }
        }
      } else {
        try {
          const cached = JSON.parse(localStorage.getItem('cached_inventory_products') || '[]');
          setProducts(cached.length > 0 ? cached : INITIAL_DEFAULT_PRODUCTS);
        } catch (e) {
          setProducts(INITIAL_DEFAULT_PRODUCTS);
        }
      }

      if (rawRes.status === 'fulfilled') {
        const raw = Array.isArray(rawRes.value.data)
          ? rawRes.value.data
          : (rawRes.value.data?.rawMaterials || rawRes.value.data?.items || []);
        if (raw.length > 0) {
          setRawMaterials(raw);
          try {
            localStorage.setItem('cached_inventory_raw_materials', JSON.stringify(raw));
          } catch (e) { }
        } else {
          try {
            const cached = JSON.parse(localStorage.getItem('cached_inventory_raw_materials') || '[]');
            if (cached.length > 0) setRawMaterials(cached);
          } catch (e) { }
        }
      } else {
        try {
          const cached = JSON.parse(localStorage.getItem('cached_inventory_raw_materials') || '[]');
          if (cached.length > 0) setRawMaterials(cached);
        } catch (e) { }
      }

      if (expRes.status === 'fulfilled') {
        const raw = Array.isArray(expRes.value.data)
          ? expRes.value.data
          : (expRes.value.data?.items || expRes.value.data?.data || []);
        if (raw.length > 0) {
          setExpiryItems(raw);
          try {
            localStorage.setItem('cached_inventory_expiry', JSON.stringify(raw));
          } catch (e) { }
        } else {
          try {
            const cached = JSON.parse(localStorage.getItem('cached_inventory_expiry') || '[]');
            if (cached.length > 0) setExpiryItems(cached);
          } catch (e) { }
        }
      } else {
        try {
          const cached = JSON.parse(localStorage.getItem('cached_inventory_expiry') || '[]');
          if (cached.length > 0) setExpiryItems(cached);
        } catch (e) { }
      }
    } catch (error) {
      console.error('Error loading inventory report data:', error);
      showErrorToast('Failed to load inventory report data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllData = fetchReportsData;

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // MONTH & DATE FILTER HELPER
  const matchesDateFilter = (dateString) => {
    if (!dateString) return true;
    if (selectedMonth === 'All' && selectedYear === 'All') return true;

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return true;

    if (selectedYear !== 'All') {
      if (d.getFullYear().toString() !== selectedYear) return false;
    }

    if (selectedMonth !== 'All') {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      if (monthNames[d.getMonth()] !== selectedMonth) return false;
    }

    return true;
  };

  // 1. FILTERED FINISHED GOODS
  const filteredFinishedGoods = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const code = (p.code || p.sku || '').toLowerCase();
      const name = (p.name || p.itemName || p.itemDescription || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();

      if (q && !code.includes(q) && !name.includes(q) && !cat.includes(q)) {
        return false;
      }

      const qty = Number(p.quantity) || 0;
      if (hideZeroQty && qty === 0) return false;
      if (showZeroOnly && qty !== 0) return false;

      if (!matchesDateFilter(p.createdAt || p.updatedAt)) return false;

      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Active' && qty <= 0) return false;
        if (selectedStatus === 'Low' && (qty <= 0 || qty > 10)) return false;
        if (selectedStatus === 'Zero' && qty !== 0) return false;
      }

      return true;
    });
  }, [products, searchQuery, hideZeroQty, showZeroOnly, selectedMonth, selectedYear, selectedStatus]);

  // 2. FILTERED RAW MATERIALS
  const filteredRawMaterials = useMemo(() => {
    return rawMaterials.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const code = (r.code || '').toLowerCase();
      const name = (r.itemName || r.itemDescription || '').toLowerCase();
      const cat = (r.category || '').toLowerCase();
      const spec = (r.specification || '').toLowerCase();

      if (q && !code.includes(q) && !name.includes(q) && !cat.includes(q) && !spec.includes(q)) {
        return false;
      }

      const qty = Number(r.quantity) || 0;
      if (hideZeroQty && qty === 0) return false;
      if (showZeroOnly && qty !== 0) return false;

      if (!matchesDateFilter(r.createdAt || r.updatedAt)) return false;

      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Active' && qty <= 0) return false;
        if (selectedStatus === 'Low' && (qty <= 0 || qty > 10)) return false;
        if (selectedStatus === 'Zero' && qty !== 0) return false;
      }

      return true;
    });
  }, [rawMaterials, searchQuery, hideZeroQty, showZeroOnly, selectedMonth, selectedYear, selectedStatus]);

  // 3. FILTERED EXPIRY ITEMS
  const filteredExpiryItems = useMemo(() => {
    return expiryItems.filter((e) => {
      const q = searchQuery.toLowerCase().trim();
      const batch = (e.batchNo || '').toLowerCase();
      const code = (e.itemCode || '').toLowerCase();
      const name = (e.itemName || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();

      if (q && !batch.includes(q) && !code.includes(q) && !name.includes(q) && !cat.includes(q)) {
        return false;
      }

      const qty = Number(e.quantity) || 0;
      if (hideZeroQty && qty === 0) return false;
      if (showZeroOnly && qty !== 0) return false;

      if (!matchesDateFilter(e.expDate || e.mfgDate || e.createdAt)) return false;

      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Critical' && (e.daysRemaining === undefined || e.daysRemaining > 7)) return false;
        if (selectedStatus === 'Active' && (e.daysRemaining !== undefined && e.daysRemaining <= 0)) return false;
      }

      return true;
    });
  }, [expiryItems, searchQuery, hideZeroQty, showZeroOnly, selectedMonth, selectedYear, selectedStatus]);

  // Reset pagination on filter, tab, or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedMonth, selectedYear, selectedStatus, hideZeroQty, showZeroOnly, sortBy]);

  const activeDataset = useMemo(() => {
    switch (activeTab) {
      case 'finished-goods':
        return filteredFinishedGoods;
      case 'raw-materials':
        return filteredRawMaterials;
      case 'expiry-monitoring':
        return filteredExpiryItems;
      default:
        return [];
    }
  }, [activeTab, filteredFinishedGoods, filteredRawMaterials, filteredExpiryItems]);

  const sortedData = useMemo(() => {
    let result = [...activeDataset];
    if (sortBy === 'name_asc') {
      result.sort((a, b) =>
        (a.itemName || a.name || a.materialName || '').localeCompare(b.itemName || b.name || b.materialName || '')
      );
    } else if (sortBy === 'name_desc') {
      result.sort((a, b) =>
        (b.itemName || b.name || b.materialName || '').localeCompare(a.itemName || a.name || a.materialName || '')
      );
    } else if (sortBy === 'qty_desc') {
      result.sort((a, b) =>
        (Number(b.quantity ?? b.currentStock ?? 0)) - (Number(a.quantity ?? a.currentStock ?? 0))
      );
    } else if (sortBy === 'qty_asc') {
      result.sort((a, b) =>
        (Number(a.quantity ?? a.currentStock ?? 0)) - (Number(b.quantity ?? b.currentStock ?? 0))
      );
    } else if (sortBy === 'code_asc') {
      result.sort((a, b) =>
        (a.code || a.materialCode || a.batchNo || '').localeCompare(b.code || b.materialCode || b.batchNo || '')
      );
    }
    return result;
  }, [activeDataset, sortBy]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Real-time count of items with 0 quantity
  const zeroQtyCount = useMemo(() => {
    switch (activeTab) {
      case 'finished-goods':
        return products.filter((p) => (Number(p.quantity) || 0) === 0).length;
      case 'raw-materials':
        return rawMaterials.filter((r) => (Number(r.quantity) || 0) === 0).length;
      case 'expiry-monitoring':
        return expiryItems.filter((e) => (Number(e.quantity) || 0) === 0).length;
      default:
        return 0;
    }
  }, [activeTab, products, rawMaterials, expiryItems]);

  const activeTabTitle = useMemo(() => {
    switch (activeTab) {
      case 'raw-materials':
        return 'Raw Materials';
      case 'finished-goods':
        return 'Finished Goods';
      case 'expiry-monitoring':
        return 'Expiry Monitoring';
      default:
        return 'Records';
    }
  }, [activeTab]);

  const reportTabs = useMemo(() => [
    { id: 'raw-materials', label: 'Raw Materials', icon: Layers },
    { id: 'finished-goods', label: 'Finished Goods', icon: Package },
    { id: 'expiry-monitoring', label: 'Expiry Monitoring', icon: Clock },
  ], []);

  // EXPORT AUDIT LEDGER TO PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

      // Theme Banner
      doc.setFillColor(1, 57, 15); // #01390f
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('MHIRA NATURAL CRM SYSTEM', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');

      let reportTitle = 'INVENTORY AUDIT LEDGER';
      let tableHead = [];
      let tableBody = [];

      if (activeTab === 'finished-goods') {
        reportTitle = 'FINISHED GOODS INVENTORY & VALUATION LEDGER';
        tableHead = [
          ['Item Code', 'Product Name', 'Category', 'Net Wt / UOM', 'Stock Qty', 'Unit Price', 'Total Valuation', 'Status']
        ];
        tableBody = filteredFinishedGoods.map((p) => {
          const qty = Number(p.quantity) || 0;
          const price = Number(p.price) || 0;
          const totalVal = qty * price;
          return [
            p.code || p.sku || 'N/A',
            p.name || p.itemName || p.itemDescription || 'Finished Good',
            p.category || 'Finished Goods',
            p.netWeight || p.uom || 'pcs',
            `${qty} pcs`,
            `PHP ${price.toFixed(2)}`,
            `PHP ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            qty > 10 ? 'IN-STOCK' : qty > 0 ? 'LOW STOCK' : 'OUT OF STOCK'
          ];
        });
      } else if (activeTab === 'raw-materials') {
        reportTitle = 'RAW MATERIALS & SUPPLIES INVENTORY LEDGER';
        tableHead = [
          ['Material Code', 'Material Name', 'Category', 'Current Stock', 'UOM', 'Reorder Point', 'Status']
        ];
        tableBody = filteredRawMaterials.map((r) => {
          const qty = Number(r.quantity) || 0;
          return [
            r.code || 'N/A',
            r.itemName || r.itemDescription || 'Raw Material',
            r.category || 'Raw Materials',
            `${qty}`,
            r.uom || 'pcs',
            '10',
            qty > 10 ? 'SAFE BUFFER' : qty > 0 ? 'RESTOCK WARNING' : 'CRITICAL (0)'
          ];
        });
      } else if (activeTab === 'expiry-monitoring') {
        reportTitle = 'BATCH EXPIRY & SHELF-LIFE AUDIT REPORT';
        tableHead = [
          ['Batch No.', 'Item Name', 'Category', 'Stock Qty', 'UOM', 'Mfg Date', 'Expiry Date', 'Days Left', 'Status']
        ];
        tableBody = filteredExpiryItems.map((e) => [
          e.batchNo || 'BATCH',
          e.itemName || 'Item',
          e.category || 'General',
          `${e.quantity || 0}`,
          e.uom || 'pcs',
          e.mfgDate ? new Date(e.mfgDate).toLocaleDateString() : 'N/A',
          e.expDate ? new Date(e.expDate).toLocaleDateString() : 'N/A',
          e.daysRemaining !== undefined ? `${e.daysRemaining} days` : 'N/A',
          e.status || 'Monitored'
        ]);
      }

      doc.text(`${reportTitle} | Period: ${selectedMonth} ${selectedYear}`, 14, 18);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 210, 18);

      autoTable(doc, {
        startY: 28,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: 50,
          halign: 'center',
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 32 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 48 },
        },
        theme: 'grid',
      });

      const finalY = (doc.lastAutoTable?.finalY || 120) + 12;

      // Signature Blocks
      if (finalY + 30 < 200) {
        doc.setDrawColor(180, 180, 180);
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');

        doc.line(14, finalY + 20, 75, finalY + 20);
        doc.text('PREPARED BY (Inventory Officer)', 14, finalY + 25);

        doc.line(110, finalY + 20, 175, finalY + 20);
        doc.text('VERIFIED BY (Warehouse Manager)', 110, finalY + 25);

        doc.line(210, finalY + 20, 275, finalY + 20);
        doc.text('NOTED BY (Operations Head)', 210, finalY + 25);
      }

      const fileName = `Inventory_Report_${activeTab.replace('-', '_')}_${selectedMonth}_${selectedYear}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported ${activeTabTitle} report to PDF: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export PDF report.');
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedMonth !== 'All') count++;
    if (selectedYear !== 'All') count++;
    if (selectedStatus !== 'All') count++;
    if (hideZeroQty) count++;
    if (showZeroOnly) count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [searchQuery, selectedMonth, selectedYear, selectedStatus, hideZeroQty, showZeroOnly, sortBy]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedMonth('All');
    setSelectedYear('All');
    setSelectedStatus('All');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setSortBy('default');
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700 pb-12">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, FILTERS & TABLE) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">

        {/* ======================================================== */}
        {/* EXCEL-STYLE RIBBON & WORKBOOK TOOLBAR                    */}
        {/* ======================================================== */}
        <div className="w-full bg-white flex flex-col">
          
          {/* TOP BAR: EXCEL SHEET TABS */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 border-b border-slate-200">
            <div className="flex items-center gap-1 -mb-px">
              {reportTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 text-xs transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
                      isActive
                        ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg font-semibold'
                    }`}
                    title={tab.label}
                    aria-label={tab.label}
                  >
                    <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-[#01390f]' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN WHITE BACKGROUND - 1 ROW NO WRAPPING) */}
          <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
            
            {/* GROUP 1: ACTIONS (Fixed Width: Tall Full-Height + Stacked Layers) */}
            <div className="w-[230px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
              <div className="flex items-stretch gap-1.5 flex-1">
                {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Download PDF Report"
                  aria-label="Download PDF Report"
                >
                  <Download className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    Download<br />(PDF)
                  </span>
                </button>

                {/* 2 LAYERS (Stacked Compact Rows) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 py-0.5">
                  {/* Layer 1: Refresh Data */}
                  <button
                    type="button"
                    onClick={fetchAllData}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                    title="Refresh inventory reports data"
                    aria-label="Refresh Data"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Refresh</span>
                  </button>

                  {/* Layer 2: Reset Filters */}
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    disabled={activeFiltersCount === 0}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
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
                    placeholder={`Search ${activeTabTitle} (code, description, category)...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search report items..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Layer 2: Filter Dropdowns (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Month Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Calendar className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Month"
                    >
                      <option value="All">All Months</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Calendar className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Year"
                    >
                      <option value="All">All Years</option>
                      {['2027', '2026', '2025', '2024', '2023'].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Activity className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                      title="Filter by Status"
                    >
                      <option value="All">All Statuses</option>
                      {activeTab === 'finished-goods' && (
                        <>
                          <option value="Active">🟢 Active / In-Stock</option>
                          <option value="Low">🟡 Low / Reorder Warning</option>
                          <option value="Zero">🔴 Out of Stock (0)</option>
                        </>
                      )}
                      {activeTab === 'raw-materials' && (
                        <>
                          <option value="Active">🟢 Safe Buffer (&gt;10)</option>
                          <option value="Low">🟡 Restock Warning (1-10)</option>
                          <option value="Zero">🔴 Critical (0)</option>
                        </>
                      )}
                      {activeTab === 'expiry-monitoring' && (
                        <>
                          <option value="Active">🟢 Good Shelf-Life</option>
                          <option value="Critical">🔴 Critical (≤ 7 Days)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Layer 3: Quick Filter Toggles & Sort (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {/* Hide 0 Qty */}
                  <button
                    type="button"
                    onClick={() => {
                      setHideZeroQty(!hideZeroQty);
                      if (!hideZeroQty) setShowZeroOnly(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${
                      hideZeroQty
                        ? 'bg-red-50 text-red-700 border border-red-300'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                    title={hideZeroQty ? 'Showing: 0 Qty Hidden (Click to show)' : 'Click to Hide 0 Quantity items'}
                  >
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hide 0 Qty</span>
                  </button>

                  {/* 0 Qty Only */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowZeroOnly(!showZeroOnly);
                      if (!showZeroOnly) setHideZeroQty(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors relative h-[22px] w-full ${
                      showZeroOnly
                        ? 'bg-rose-50 text-rose-700 border border-rose-300 font-bold'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                    title={showZeroOnly ? `Showing: 0 Qty Only (${zeroQtyCount})` : `Filter 0 Qty Only (${zeroQtyCount} items)`}
                  >
                    <Boxes className="w-3.5 h-3.5 text-slate-500" />
                    <span>0 Qty Only {zeroQtyCount > 0 ? `(${zeroQtyCount})` : ''}</span>
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
                      <option value="default">Sort: Default</option>
                      <option value="name_asc">Name (A → Z)</option>
                      <option value="name_desc">Name (Z → A)</option>
                      <option value="qty_desc">Qty (High → Low)</option>
                      <option value="qty_asc">Qty (Low → High)</option>
                      <option value="code_asc">Code (A → Z)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-1 select-none">
                Search & Filters
              </div>
            </div>

          </div>

        </div>

        {/* TABLE MASTERLIST */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
          <TablePagination
            currentPage={currentPage}
            totalItems={activeDataset.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setItemsPerPage(rows);
              setCurrentPage(1);
            }}
            className="print:hidden"
          />
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                  {/* TAB 1: FINISHED GOODS HEADERS */}
                  {activeTab === 'finished-goods' && (
                    <>
                      <th className="py-3.5 px-4 whitespace-nowrap">Code</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">Item Profile / Name</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Category / Seg</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Net Wt / Unit</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Stock Qty</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Unit Price</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Valuation</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                    </>
                  )}

                  {/* TAB 2: RAW MATERIALS HEADERS */}
                  {activeTab === 'raw-materials' && (
                    <>
                      <th className="py-3.5 px-4 whitespace-nowrap">Code</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">Material Description</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Stock Qty</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">UOM</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Threshold Condition</th>
                    </>
                  )}

                  {/* TAB 3: EXPIRY MONITORING HEADERS */}
                  {activeTab === 'expiry-monitoring' && (
                    <>
                      <th className="py-3.5 px-4 whitespace-nowrap">Batch No.</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px]">Item Name</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Stock Qty</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">UOM</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Expiry Date</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Days Left</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap">Shelf-Life Status</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#01390f]" />
                        <span>Loading {activeTabTitle} audit ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : activeDataset.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="w-6 h-6 text-slate-300" />
                        <span>No {activeTabTitle.toLowerCase()} match the selected filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* TAB 1: FINISHED GOODS ROWS */}
                    {activeTab === 'finished-goods' &&
                      paginatedData.map((item, idx) => {
                        const qty = Number(item.quantity) || 0;
                        const price = Number(item.price) || 0;
                        const totalVal = qty * price;

                        return (
                          <tr key={item._id || idx} className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                              <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {item.code || item.sku || 'FG-001'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {item.name || item.itemName || item.itemDescription || 'Finished Good'}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-semibold text-slate-800">{item.category || 'Finished Goods'}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-600 whitespace-nowrap">
                              {item.netWeight || item.uom || '135g'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-black text-slate-900 whitespace-nowrap">
                              <span className={qty === 0 ? 'text-rose-600' : 'text-slate-900'}>
                                {qty} <span className="text-[11px] font-normal text-slate-400">PCS</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                              ₱{price.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-[#01390f] whitespace-nowrap">
                              ₱{totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {qty > 10 ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                                  In-Stock
                                </span>
                              ) : qty > 0 ? (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                                  Low Stock
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2.5 py-1 rounded-full">
                                  Out of Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                    {/* TAB 2: RAW MATERIALS ROWS */}
                    {activeTab === 'raw-materials' &&
                      paginatedData.map((item, idx) => {
                        const qty = Number(item.quantity) || 0;

                        return (
                          <tr key={item._id || idx} className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                              <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {item.code || 'RM0001'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {item.itemName || item.itemDescription || 'Raw Material'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">
                              <span className="inline-flex items-center text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md font-semibold border border-orange-200/70">
                                {item.category || 'Raw Materials'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-black text-slate-900 whitespace-nowrap">
                              <span className={qty === 0 ? 'text-rose-600' : 'text-slate-900'}>
                                {qty}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-500 uppercase text-xs whitespace-nowrap">
                              {item.uom || 'pcs'}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {qty > 10 ? (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                                  Safe Buffer
                                </span>
                              ) : qty > 0 ? (
                                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                                  Restock Warning
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                                  Critical (0)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                    {/* TAB 3: EXPIRY MONITORING ROWS */}
                    {activeTab === 'expiry-monitoring' &&
                      paginatedData.map((item, idx) => {
                        const days = Number(item.daysRemaining);
                        const isExpired = !isNaN(days) && days <= 0;
                        const isCritical = !isNaN(days) && days > 0 && days <= 7;
                        const isNear = !isNaN(days) && days > 7 && days <= 30;

                        return (
                          <tr key={item._id || item.id || idx} className="hover:bg-slate-50/90 transition-colors text-slate-700 whitespace-nowrap">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                              <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {item.batchNo || 'BATCH'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {item.itemName}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                              {item.category || 'General'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-black text-slate-900 whitespace-nowrap">
                              {item.quantity || 0}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono uppercase text-slate-500 whitespace-nowrap">
                              {item.uom || 'pcs'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono text-slate-700 whitespace-nowrap">
                              {item.expDate ? new Date(item.expDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap">
                              {!isNaN(days) ? (
                                <span className={isExpired ? 'text-rose-600' : isCritical ? 'text-amber-600' : 'text-slate-800'}>
                                  {days}d
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  isExpired
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : isCritical
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : isNear
                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {isExpired ? 'Expired' : isCritical ? 'Critical (≤7d)' : isNear ? 'Near Expiry' : 'Safe Shelf-Life'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default InventoryReports;
