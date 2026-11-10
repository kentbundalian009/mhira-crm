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
  Eye,
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
import ItemImageModal, { resolveItemImageUrl } from './common/ItemImageModal';
import { getStoredThresholds } from './common/MasterCategoryUomModal';
import { INITIAL_DEFAULT_PRODUCTS } from './InventoryFinishedGoods';
import { getUserFullName } from '../utils/userId';

// Helper to convert image URL to base64 for crisp PDF header thumbnail
const loadBase64Image = (url) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 300;
          canvas.height = img.naturalHeight || img.height || 300;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
};

// Helper to create a transparent watermark image with subtle opacity (~0.075) for background
const loadWatermarkImage = (url, opacity = 0.075) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 500;
          canvas.height = img.naturalHeight || img.height || 500;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
};

function InventoryReports() {
  // Selected Tab: 'raw-materials' | 'finished-goods'
  const [activeTab, setActiveTab] = useState('raw-materials');
  // Expiry filter type: 'all' | 'raw-materials' | 'finished-goods'
  const [expiryFilterType, setExpiryFilterType] = useState('all');
  const [showExpiryOnly, setShowExpiryOnly] = useState(false);
  const [selectedExpiryDetail, setSelectedExpiryDetail] = useState(null);
  const [selectedImageItem, setSelectedImageItem] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

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
  const [wipRecords, setWipRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all reports ledger data with safe caching
  const fetchReportsData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };

      const [prodRes, rawRes, expRes, wipRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/inventory-products`, config).catch(async () => {
          return await API.get('/api/products').catch(() => ({ data: [] }));
        }),
        axios.get(`${API_BASE_URL}/api/inventory-raw-materials`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/inventory-expiry`, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/inventory-wip`, config).catch(async () => {
          return await API.get('/api/inventory-wip').catch(() => ({ data: [] }));
        }),
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

      if (wipRes.status === 'fulfilled') {
        const raw = Array.isArray(wipRes.value.data)
          ? wipRes.value.data
          : (wipRes.value.data?.wips || wipRes.value.data?.items || []);
        if (raw.length > 0) {
          setWipRecords(raw);
          try {
            localStorage.setItem('cached_inventory_wip_reports', JSON.stringify(raw));
          } catch (e) { }
        } else {
          try {
            const cached = JSON.parse(localStorage.getItem('cached_inventory_wip_reports') || '[]');
            if (cached.length > 0) setWipRecords(cached);
          } catch (e) { }
        }
      } else {
        try {
          const cached = JSON.parse(localStorage.getItem('cached_inventory_wip_reports') || '[]');
          if (cached.length > 0) setWipRecords(cached);
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

  // Dynamic stock threshold and condition resolution
  const defaultThresholds = useMemo(() => {
    return getStoredThresholds(activeTab === 'finished-goods' ? 'finished_goods' : 'raw_materials');
  }, [activeTab]);

  const getResolvedThreshold = useCallback((item) => {
    return {
      criticalLevel: Number(item?.criticalLevel !== undefined && item?.criticalLevel !== '' ? item.criticalLevel : (defaultThresholds.criticalLevel ?? 0)),
      restockWarningPoint: Number(item?.restockWarningPoint !== undefined && item?.restockWarningPoint !== '' ? item.restockWarningPoint : (defaultThresholds.restockWarningPoint ?? 10)),
      overstockLimitPoint: Number(item?.overstockLimitPoint !== undefined && item?.overstockLimitPoint !== '' ? item.overstockLimitPoint : (defaultThresholds.overstockLimitPoint ?? 1000)),
    };
  }, [defaultThresholds]);

  const getStockCondition = useCallback((qty, resolvedThreshold) => {
    const val = Number(qty) || 0;
    const critical = Number(resolvedThreshold?.criticalLevel ?? 0);
    const restock = Number(resolvedThreshold?.restockWarningPoint ?? 10);
    const overstock = Number(resolvedThreshold?.overstockLimitPoint ?? 1000);

    if (val <= critical) {
      return {
        key: 'Critical Alert',
        label: 'Critical Alert',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/70 font-semibold',
        dotClass: 'bg-rose-500',
      };
    }
    if (val <= restock) {
      return {
        key: 'Restock Warning',
        label: 'Restock Warning',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/70 font-semibold',
        dotClass: 'bg-amber-500',
      };
    }
    if (val <= overstock) {
      return {
        key: 'Healthy',
        label: 'Healthy',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 font-semibold',
        dotClass: 'bg-emerald-500',
      };
    }
    return {
      key: 'Overstock',
      label: 'Overstock',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/70 font-semibold',
      dotClass: 'bg-blue-500',
    };
  }, []);

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

  // Helpers to distinguish Raw Materials vs Finished Goods for expiry monitoring
  const isRawMaterialExpiry = useCallback((item) => {
    if (item.source === 'Inbound Receiving') return true;
    if (item.source === 'WIP Production') return false;
    const code = (item.code || item.itemCode || '').toUpperCase();
    if (code.startsWith('RM')) return true;
    if (code.startsWith('FG')) return false;
    const cat = (item.category || '').toLowerCase();
    if (cat.includes('raw')) return true;
    if (cat.includes('finish')) return false;
    return true;
  }, []);

  const isFinishedGoodExpiry = useCallback((item) => {
    return !isRawMaterialExpiry(item);
  }, [isRawMaterialExpiry]);

  // 3. FILTERED EXPIRY ITEMS
  const filteredExpiryItems = useMemo(() => {
    return expiryItems.filter((e) => {
      // Filter by active tab (finished goods vs raw materials)
      if (activeTab === 'raw-materials' && !isRawMaterialExpiry(e)) return false;
      if (activeTab === 'finished-goods' && !isFinishedGoodExpiry(e)) return false;

      const q = searchQuery.toLowerCase().trim();
      const batch = (e.batchNo || '').toLowerCase();
      const code = (e.itemCode || e.code || '').toLowerCase();
      const name = (e.itemName || e.itemDescription || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();

      if (q && !batch.includes(q) && !code.includes(q) && !name.includes(q) && !cat.includes(q)) {
        return false;
      }

      const qty = Number(e.quantity) || 0;
      if (hideZeroQty && qty === 0) return false;
      if (showZeroOnly && qty !== 0) return false;

      if (!matchesDateFilter(e.expDate || e.expiryDate || e.mfgDate || e.createdAt)) return false;

      if (selectedStatus !== 'All') {
        const days = e.daysRemaining !== undefined ? Number(e.daysRemaining) : Number(e.daysUntilExpiry);
        if (selectedStatus === 'Critical' && (isNaN(days) || days > 7)) return false;
        if (selectedStatus === 'Active' && (!isNaN(days) && days <= 0)) return false;
      }

      return true;
    });
  }, [expiryItems, activeTab, isRawMaterialExpiry, isFinishedGoodExpiry, searchQuery, hideZeroQty, showZeroOnly, selectedMonth, selectedYear, selectedStatus]);

  // 4. FILTERED WIP DEFECTIVE / REJECTED UNITS
  const filteredWipDefective = useMemo(() => {
    return wipRecords.filter((w) => {
      // Must have rejected quantity > 0
      const rejectQty = Number(w.rejectedQuantity) || 0;
      if (rejectQty <= 0) return false;

      const q = searchQuery.toLowerCase().trim();
      const batchCode = (w.wipBatchCode || '').toLowerCase();
      const pCode = (w.productCode || '').toLowerCase();
      const pName = (w.productName || '').toLowerCase();
      const reason = (w.rejectionReason || '').toLowerCase();
      const notes = (w.rejectionNotes || '').toLowerCase();
      const approver = (w.rejectionApprover || '').toLowerCase();
      const disposition = (w.rejectionDisposition || '').toLowerCase();
      const scrapId = (w.scrapLogId || '').toLowerCase();

      if (
        q &&
        !batchCode.includes(q) &&
        !pCode.includes(q) &&
        !pName.includes(q) &&
        !reason.includes(q) &&
        !notes.includes(q) &&
        !approver.includes(q) &&
        !disposition.includes(q) &&
        !scrapId.includes(q)
      ) {
        return false;
      }

      if (!matchesDateFilter(w.updatedAt || w.createdAt || w.mfgDate)) return false;

      if (selectedStatus !== 'All') {
        const disp = disposition.toLowerCase();
        if (selectedStatus === 'Scrap' && !disp.includes('scrap')) return false;
        if (selectedStatus === 'Quarantined' && !disp.includes('quarantine')) return false;
        if (selectedStatus === 'Destroyed' && !disp.includes('destroy')) return false;
      }

      return true;
    });
  }, [wipRecords, searchQuery, selectedMonth, selectedYear, selectedStatus]);

  // Reset pagination on filter, tab, or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, showExpiryOnly, searchQuery, selectedMonth, selectedYear, selectedStatus, hideZeroQty, showZeroOnly, sortBy]);

  const activeDataset = useMemo(() => {
    if (showExpiryOnly) {
      return filteredExpiryItems;
    }
    switch (activeTab) {
      case 'wip-defective':
        return filteredWipDefective;
      case 'finished-goods':
        return filteredFinishedGoods;
      case 'raw-materials':
      default:
        return filteredRawMaterials;
    }
  }, [showExpiryOnly, filteredExpiryItems, activeTab, filteredWipDefective, filteredFinishedGoods, filteredRawMaterials]);

  const sortedData = useMemo(() => {
    let result = [...activeDataset];
    if (activeTab === 'wip-defective' && !showExpiryOnly) {
      if (sortBy === 'qty_desc') {
        result.sort((a, b) => (Number(b.rejectedQuantity) || 0) - (Number(a.rejectedQuantity) || 0));
      } else if (sortBy === 'qty_asc') {
        result.sort((a, b) => (Number(a.rejectedQuantity) || 0) - (Number(b.rejectedQuantity) || 0));
      } else if (sortBy === 'name_asc') {
        result.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''));
      } else if (sortBy === 'name_desc') {
        result.sort((a, b) => (b.productName || '').localeCompare(a.productName || ''));
      } else if (sortBy === 'code_asc') {
        result.sort((a, b) => (a.wipBatchCode || '').localeCompare(b.wipBatchCode || ''));
      } else {
        result.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
      }
      return result;
    }
    if (sortBy === 'name_asc') {
      result.sort((a, b) =>
        (a.itemName || a.name || a.materialName || a.itemDescription || '').localeCompare(b.itemName || b.name || b.materialName || b.itemDescription || '')
      );
    } else if (sortBy === 'name_desc') {
      result.sort((a, b) =>
        (b.itemName || b.name || b.materialName || b.itemDescription || '').localeCompare(a.itemName || a.name || a.materialName || a.itemDescription || '')
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
        (a.code || a.itemCode || a.materialCode || a.batchNo || '').localeCompare(b.code || b.itemCode || b.materialCode || b.batchNo || '')
      );
    }
    return result;
  }, [activeDataset, sortBy, activeTab, showExpiryOnly]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Real-time count of items with 0 quantity
  const zeroQtyCount = useMemo(() => {
    if (showExpiryOnly) {
      return expiryItems.filter((e) => {
        if (activeTab === 'raw-materials' && !isRawMaterialExpiry(e)) return false;
        if (activeTab === 'finished-goods' && !isFinishedGoodExpiry(e)) return false;
        return (Number(e.quantity) || 0) === 0;
      }).length;
    }
    switch (activeTab) {
      case 'wip-defective':
        return 0;
      case 'finished-goods':
        return products.filter((p) => (Number(p.quantity) || 0) === 0).length;
      case 'raw-materials':
      default:
        return rawMaterials.filter((r) => (Number(r.quantity) || 0) === 0).length;
    }
  }, [showExpiryOnly, activeTab, expiryItems, products, rawMaterials, isRawMaterialExpiry, isFinishedGoodExpiry]);

  const activeTabTitle = useMemo(() => {
    if (showExpiryOnly) {
      return activeTab === 'finished-goods' ? 'Finished Goods Expiry' : 'Raw Materials Expiry';
    }
    switch (activeTab) {
      case 'wip-defective':
        return 'WIP Defective / Rejected Units';
      case 'raw-materials':
        return 'Raw Materials';
      case 'finished-goods':
        return 'Finished Goods';
      default:
        return 'Records';
    }
  }, [showExpiryOnly, activeTab]);

  const reportTabs = useMemo(() => [
    { id: 'raw-materials', label: 'Raw Materials', icon: Layers },
    { id: 'finished-goods', label: 'Finished Goods', icon: Package },
    { id: 'wip-defective', label: 'WIP Defective / Rejected Units', icon: AlertTriangle },
  ], []);

  // EXPORT AUDIT LEDGER TO PDF (Official Executive Report in A4 Portrait with Summary Table & Blue Header)
  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    showSuccessToast('Preparing official executive PDF audit report...');

    try {
      // 1. Load crisp logo thumbnail and transparent background watermark in parallel
      const [logoBase64, watermarkBase64] = await Promise.all([
        loadBase64Image('/mhira_removebg.png'),
        loadWatermarkImage('/mhira_removebg.png', 0.095),
      ]);

      const doc = new jsPDF('p', 'mm', 'a4'); // Portrait A4 (210mm x 297mm)
      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

      // Mhira Logo natural aspect ratio: 835 / 673 = 1.2407
      const logoRatio = 835 / 673;

      // Watermark geometry (centered on A4 portrait with natural aspect ratio)
      const wmWidth = 90;
      const wmHeight = wmWidth / logoRatio; // ~72.5mm
      const wmX = (pageWidth - wmWidth) / 2; // 60mm
      const wmY = (pageHeight - wmHeight) / 2; // ~112.25mm

      // Clean period label (fixes 'ALL All' issue)
      const formattedPeriod =
        selectedMonth === 'All' && selectedYear === 'All'
          ? 'All Time (Full Ledger)'
          : selectedMonth === 'All'
            ? `Full Year ${selectedYear}`
            : selectedYear === 'All'
              ? `${selectedMonth} (All Years)`
              : `${selectedMonth} ${selectedYear}`;

      const yearTag = selectedYear !== 'All' ? selectedYear : new Date().getFullYear();
      const monthTag = selectedMonth !== 'All' ? selectedMonth.slice(0, 3).toUpperCase() : 'FULL';
      const typeTag = showExpiryOnly
        ? (activeTab === 'finished-goods' ? 'FG-EXP' : 'RM-EXP')
        : (activeTab === 'wip-defective' ? 'WIP-DEFECT' : activeTab === 'finished-goods' ? 'FG' : 'RM');
      const docNo = `MN-INV-${typeTag}-${yearTag}-${monthTag}-${String(Date.now()).slice(-4)}`;

      // Determine Report Title
      let reportTitle = 'INVENTORY AUDIT LEDGER';
      if (showExpiryOnly) {
        reportTitle = activeTab === 'finished-goods'
          ? 'FINISHED GOODS EXPIRY MONITORING AUDIT'
          : 'RAW MATERIALS EXPIRY MONITORING AUDIT';
      } else if (activeTab === 'wip-defective') {
        reportTitle = 'WIP DEFECTIVE & REJECTED UNITS AUDIT REPORT';
      } else if (activeTab === 'finished-goods') {
        reportTitle = 'FINISHED GOODS INVENTORY AUDIT';
      } else {
        reportTitle = 'RAW MATERIALS INVENTORY AUDIT';
      }

      // ========================================================
      // 2. OFFICIAL COMPANY HEADER & NATURAL LOGO (NO CONTAINER)
      // ========================================================
      // Direct unboxed logo with natural aspect ratio (matches index/header perfectly)
      const headerLogoH = 15;
      const headerLogoW = headerLogoH * logoRatio; // ~18.6mm
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 12, headerLogoW, headerLogoH, undefined, 'FAST');
        } catch (e) { }
      }

      // Company Titles (starts at X=36, generously spaced in height)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(21, 62, 151);
      doc.text('MHIRA NATURAL BEAUTY PRODUCTS', 36, 16.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text('WAREHOUSE OPERATIONS & ENTERPRISE RESOURCE PLANNING', 36, 21.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text('Official Valuation Ledger, Material Movement & Expiry Audit Trail', 36, 26);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(21, 62, 151);
      doc.text('Security Classification: INTERNAL CONFIDENTIAL • Controlled Executive Copy', 36, 30);

      // Top-Right Official Metadata (Clean text, generously spaced in height)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(21, 62, 151);
      doc.text(reportTitle.toUpperCase(), pageWidth - 14, 16.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`DOC NO: ${docNo}`, pageWidth - 14, 21.5, { align: 'right' });
      doc.text(`AUDIT PERIOD: ${formattedPeriod}`, pageWidth - 14, 26, { align: 'right' });
      doc.text(`GENERATED: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });

      // Clean dividing line under header
      doc.setDrawColor(21, 62, 151);
      doc.setLineWidth(0.4);
      doc.line(14, 33.5, pageWidth - 14, 33.5);

      // ========================================================
      // 3. STATISTICAL KPI AUDIT SUMMARY TABLE (Naka-Table, Hindi Container)
      // ========================================================
      let card1Label = '';
      let card1Val = '';
      let card2Label = '';
      let card2Val = '';
      let card3Label = '';
      let card3Val = '';
      let card4Label = '';
      let card4Val = '';

      if (showExpiryOnly) {
        const totalItems = filteredExpiryItems.length;
        const totalStock = filteredExpiryItems.reduce(
          (acc, item) => acc + (Number(item.quantity ?? item.stockVolume ?? 0) || 0),
          0
        );
        const expiredCount = filteredExpiryItems.filter((e) => {
          const days = e.daysUntilExpiry !== undefined ? Number(e.daysUntilExpiry) : Number(e.daysRemaining);
          return !isNaN(days) && days <= 0;
        }).length;
        const criticalCount = filteredExpiryItems.filter((e) => {
          const days = e.daysUntilExpiry !== undefined ? Number(e.daysUntilExpiry) : Number(e.daysRemaining);
          return !isNaN(days) && days > 0 && days <= 7;
        }).length;
        const healthyCount = filteredExpiryItems.filter((e) => {
          const days = e.daysUntilExpiry !== undefined ? Number(e.daysUntilExpiry) : Number(e.daysRemaining);
          return !isNaN(days) && days > 30;
        }).length;

        card1Label = activeTab === 'finished-goods' ? 'MONITORED FG BATCHES' : 'MONITORED RM BATCHES';
        card1Val = `${totalItems.toLocaleString()} Active Lots`;
        card2Label = 'TOTAL BATCH QUANTITY';
        card2Val = `${totalStock.toLocaleString()} Stored Units`;
        card3Label = 'SHELF LIFE CONDITION';
        card3Val = `${healthyCount} Safe Buffer (>30d)`;
        card4Label = 'CRITICAL & EXPIRY ALERTS';
        card4Val = `${expiredCount} Expired | ${criticalCount} Critical (<= 7d)`;
      } else if (activeTab === 'wip-defective') {
        const totalBatches = filteredWipDefective.length;
        const totalTarget = filteredWipDefective.reduce((acc, w) => acc + (Number(w.targetQuantity) || 0), 0);
        const totalProduced = filteredWipDefective.reduce((acc, w) => acc + (Number(w.producedQuantity) || 0), 0);
        const totalDefective = filteredWipDefective.reduce((acc, w) => acc + (Number(w.rejectedQuantity) || 0), 0);
        const lossRate = totalTarget > 0 ? ((totalDefective / totalTarget) * 100).toFixed(1) : '0.0';

        card1Label = 'DEFECTIVE WIP BATCHES';
        card1Val = `${totalBatches.toLocaleString()} Batches Audited`;
        card2Label = 'TOTAL TARGET PLANNED';
        card2Val = `${totalTarget.toLocaleString()} Planned Units`;
        card3Label = 'ACTUAL PRODUCED YIELD';
        card3Val = `${totalProduced.toLocaleString()} Finished Units`;
        card4Label = 'TOTAL SCRAP LOSS';
        card4Val = `${totalDefective.toLocaleString()} pcs Defective (${lossRate}%)`;
      } else if (activeTab === 'finished-goods') {
        const totalItems = filteredFinishedGoods.length;
        const totalStock = filteredFinishedGoods.reduce((acc, p) => acc + (Number(p.quantity ?? 0) || 0), 0);
        let healthy = 0;
        let restock = 0;
        let critical = 0;

        filteredFinishedGoods.forEach((p) => {
          const resolved = getResolvedThreshold(p);
          const cond = getStockCondition(Number(p.quantity ?? 0), resolved);
          if (cond.key === 'Healthy' || cond.key === 'Overstock') healthy++;
          else if (cond.key === 'Restock Warning') restock++;
          else critical++;
        });

        card1Label = 'REGISTERED FINISHED GOODS';
        card1Val = `${totalItems.toLocaleString()} Active SKUs`;
        card2Label = 'TOTAL FINISHED GOODS QUANTITY';
        card2Val = `${totalStock.toLocaleString()} Stored Units`;
        card3Label = 'BUFFER HEALTH CONDITION';
        card3Val = `${healthy} Safe Buffer (>10)`;
        card4Label = 'CRITICAL & REORDER ALERTS';
        card4Val = `${critical} Critical Shortage | ${restock} Low`;
      } else {
        const totalItems = filteredRawMaterials.length;
        const totalStock = filteredRawMaterials.reduce(
          (acc, r) => acc + (Number(r.quantity ?? r.qty ?? 0) || 0),
          0
        );
        let healthy = 0;
        let restock = 0;
        let critical = 0;

        filteredRawMaterials.forEach((r) => {
          const resolved = getResolvedThreshold(r);
          const cond = getStockCondition(Number(r.quantity ?? r.qty ?? 0), resolved);
          if (cond.key === 'Healthy' || cond.key === 'Overstock') healthy++;
          else if (cond.key === 'Restock Warning') restock++;
          else critical++;
        });

        card1Label = 'REGISTERED RAW MATERIALS';
        card1Val = `${totalItems.toLocaleString()} Active Materials`;
        card2Label = 'TOTAL MATERIAL QUANTITY';
        card2Val = `${totalStock.toLocaleString()} Stored Units`;
        card3Label = 'BUFFER HEALTH CONDITION';
        card3Val = `${healthy} Safe Buffer (>10)`;
        card4Label = 'CRITICAL & REORDER ALERTS';
        card4Val = `${critical} Critical Shortage | ${restock} Low`;
      }

      // Summary KPI Table (Formal 4-column Table, Hindi Card Container)
      autoTable(doc, {
        startY: 36.5,
        margin: { left: 14, right: 14 },
        head: [[card1Label, card2Label, card3Label, card4Label]],
        body: [[card1Val, card2Val, card3Val, card4Val]],
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontStyle: 'normal',
          fontSize: 6.0,
          cellPadding: { top: 2.2, bottom: 2.2, left: 1.5, right: 1.5 },
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          halign: 'center',
          valign: 'middle',
          overflow: 'ellipsize',
        },
        headStyles: {
          fillColor: [239, 246, 255], // Soft blue tint #eff6ff
          textColor: [21, 62, 151], // Royal Blue text
          fontStyle: 'bold',
          fontSize: 5.6,
          halign: 'center',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          overflow: 'ellipsize',
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 6.0,
          halign: 'center',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
          overflow: 'ellipsize',
        },
        columnStyles: {
          0: { cellWidth: 45.5 },
          1: { cellWidth: 45.5 },
          2: { cellWidth: 45.5 },
          3: { cellWidth: 45.5 },
        },
      });

      // ========================================================
      // 4. BUILD CATEGORY-GROUPED DATA TABLES (Strict Whitespace-Nowrap, Category Title Row & Condition-Colored Quantity)
      // ========================================================
      const getConditionColor = (condKey) => {
        if (condKey === 'Critical Alert') {
          return {
            fillColor: [254, 226, 226], // Soft red tint (red-100) with deep red text
            textColor: [185, 28, 28],
          };
        }
        if (condKey === 'Restock Warning') {
          return {
            fillColor: [254, 249, 195], // Soft yellow tint (amber-100) with deep amber text
            textColor: [161, 98, 7],
          };
        }
        if (condKey === 'Overstock') {
          return {
            fillColor: [224, 242, 254], // Soft blue tint (sky-100) with deep blue text
            textColor: [29, 78, 216],
          };
        }
        // Healthy
        return {
          fillColor: [220, 252, 231], // Soft green tint (emerald-100) with deep green text
          textColor: [22, 101, 52],
        };
      };

      // 4A. Group items strictly by Category (sama-sama lahat per category, no separate Category column)
      const categoryMap = new Map();

      if (showExpiryOnly) {
        filteredExpiryItems.forEach((item) => {
          const cat = (item.category || (activeTab === 'finished-goods' ? 'Finished Goods' : 'Raw Materials')).trim() || 'General';
          if (!categoryMap.has(cat)) categoryMap.set(cat, []);
          categoryMap.get(cat).push(item);
        });
      } else if (activeTab === 'wip-defective') {
        filteredWipDefective.forEach((w) => {
          const cat = (w.rejectionDisposition || 'Scrap / Dispose').trim() || 'General';
          if (!categoryMap.has(cat)) categoryMap.set(cat, []);
          categoryMap.get(cat).push(w);
        });
      } else if (activeTab === 'finished-goods') {
        filteredFinishedGoods.forEach((p) => {
          const cat = (p.category || 'Finished Goods').trim() || 'General';
          if (!categoryMap.has(cat)) categoryMap.set(cat, []);
          categoryMap.get(cat).push(p);
        });
      } else {
        filteredRawMaterials.forEach((r) => {
          const cat = (r.category || 'Raw Materials').trim() || 'General';
          if (!categoryMap.has(cat)) categoryMap.set(cat, []);
          categoryMap.get(cat).push(r);
        });
      }

      const sortedCategoryNames = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b));

      // 4B. Column Definitions (Exact 182mm total width in Portrait A4, No Category Column)
      let colHeaders = [];
      let columnStyles = {};

      if (showExpiryOnly) {
        colHeaders = ['ITEM CODE', 'BATCH / LOT NO', 'ITEM NAME', 'STOCK VOLUME', 'MFG DATE', 'EXPIRY DATE', 'DAYS REMAINING'];
        columnStyles = {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 22 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 24 },
          2: { fontStyle: 'bold', halign: 'left', cellWidth: 46 },
          3: { fontStyle: 'bold', halign: 'center', cellWidth: 24 },
          4: { halign: 'center', cellWidth: 20 },
          5: { fontStyle: 'bold', halign: 'center', cellWidth: 20 },
          6: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
        };
      } else if (activeTab === 'wip-defective') {
        colHeaders = ['WIP NO', 'PRODUCT / ITEM NAME', 'TOTAL COUNT NA PRODUCE', 'NABAWAS NA QTY', 'REASON & DEDUCTION NOTES', 'QC APPROVER', 'DATE'];
        columnStyles = {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 18 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 44 },
          2: { halign: 'center', cellWidth: 28 },
          3: { fontStyle: 'bold', halign: 'center', cellWidth: 20 },
          4: { halign: 'left', cellWidth: 38 },
          5: { fontStyle: 'bold', halign: 'center', cellWidth: 20 },
          6: { halign: 'center', cellWidth: 14 },
        };
      } else if (activeTab === 'finished-goods') {
        colHeaders = ['CODE', 'ITEM NAME', 'QUANTITY', 'SPECIFICATION & UOM'];
        columnStyles = {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 26 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 80 },
          2: { fontStyle: 'bold', halign: 'center', cellWidth: 42 },
          3: { halign: 'center', cellWidth: 34 },
        };
      } else {
        colHeaders = ['CODE', 'ITEM NAME', 'QUANTITY', 'UOM'];
        columnStyles = {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 28 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 86 },
          2: { fontStyle: 'bold', halign: 'center', cellWidth: 44 },
          3: { fontStyle: 'bold', halign: 'center', cellWidth: 24 },
        };
      }

      // 4C. Render Category Tables with Title Row Above Header
      let currentTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;

      if (sortedCategoryNames.length === 0) {
        // Fallback for empty results
        autoTable(doc, {
          startY: currentTableStartY,
          margin: { left: 14, right: 14, top: 19, bottom: 12 },
          head: [colHeaders],
          body: [['-', 'No inventory records found for the selected criteria.', '-', '-']],
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 6.8, halign: 'center', valign: 'middle', overflow: 'ellipsize' },
          headStyles: { fillColor: [21, 62, 151], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, halign: 'center', overflow: 'ellipsize' },
        });
      } else {
        sortedCategoryNames.forEach((catName, catIdx) => {
          const catItems = categoryMap.get(catName);
          let catBody = [];

          if (showExpiryOnly) {
            catBody = catItems.map((item) => {
              const days = item.daysUntilExpiry !== undefined ? Number(item.daysUntilExpiry) : Number(item.daysRemaining);
              const isExpired = !isNaN(days) && days <= 0;
              const isCritical = !isNaN(days) && days > 0 && days <= 7;
              const isNear = !isNaN(days) && days > 7 && days <= 30;

              const expDate = item.expiryDate || item.expDate;
              const expStr = expDate && !isNaN(new Date(expDate).getTime()) ? new Date(expDate).toLocaleDateString() : 'N/A';
              const mfgStr = item.mfgDate && !isNaN(new Date(item.mfgDate).getTime()) ? new Date(item.mfgDate).toLocaleDateString() : 'N/A';
              const daysStr = item.status === 'Disposed'
                ? 'Disposed'
                : isExpired
                  ? '0d (Expired)'
                  : isCritical
                    ? `${days}d left (Critical)`
                    : isNear
                      ? `${days}d left (Near)`
                      : `${days}d left`;

              let expiryColor = { fillColor: [220, 252, 231], textColor: [22, 101, 52] };
              if (isExpired || isCritical) {
                expiryColor = { fillColor: [254, 226, 226], textColor: [185, 28, 28] };
              } else if (isNear) {
                expiryColor = { fillColor: [254, 249, 195], textColor: [161, 98, 7] };
              }

              return [
                item.code || item.itemCode || 'N/A',
                item.batchNo || 'N/A',
                item.itemName || item.itemDescription || 'N/A',
                `${Number(item.quantity ?? item.stockVolume ?? 0).toLocaleString()} ${item.uom || (activeTab === 'finished-goods' ? 'pcs' : 'kg')}`,
                mfgStr,
                expStr,
                {
                  content: daysStr,
                  styles: {
                    fillColor: expiryColor.fillColor,
                    textColor: expiryColor.textColor,
                    fontStyle: 'bold',
                    halign: 'center',
                    overflow: 'ellipsize',
                  },
                },
              ];
            });
          } else if (activeTab === 'wip-defective') {
            catBody = catItems.map((w) => {
              const target = Number(w.targetQuantity || 0);
              const produced = Number(w.producedQuantity || 0);
              const rejected = Number(w.rejectedQuantity || 0);
              const dateStr = w.updatedAt || w.createdAt ? new Date(w.updatedAt || w.createdAt).toLocaleDateString() : 'N/A';
              const reasonText = w.rejectionReason || 'Defective Loss';
              const notesText = w.rejectionNotes ? ` - ${w.rejectionNotes}` : '';

              return [
                w.wipBatchCode || 'WIP-BATCH',
                `${w.productName || 'Product'} (${w.productCode || 'FG'})`,
                `${target.toLocaleString()} tgt / ${produced.toLocaleString()} act`,
                {
                  content: `-${rejected.toLocaleString()} pcs`,
                  styles: {
                    fillColor: [254, 226, 226],
                    textColor: [185, 28, 28],
                    fontStyle: 'bold',
                    halign: 'center',
                    overflow: 'visible',
                  },
                },
                `${reasonText}${notesText}`,
                w.rejectionApprover || 'QC Staff',
                dateStr,
              ];
            });
          } else if (activeTab === 'finished-goods') {
            catBody = catItems.map((p) => {
              const qty = Number(p.quantity ?? 0);
              const resolved = getResolvedThreshold(p);
              const condition = getStockCondition(qty, resolved);
              const colors = getConditionColor(condition.key);
              const specUom = `${p.specification ? p.specification : '-'} • ${p.uom || 'PCS'}`;

              return [
                p.code || p.sku || 'N/A',
                p.itemName || p.name || p.itemDescription || 'Finished Good',
                {
                  content: qty.toLocaleString(),
                  styles: {
                    fillColor: colors.fillColor,
                    textColor: colors.textColor,
                    fontStyle: 'bold',
                    halign: 'center',
                    overflow: 'ellipsize',
                  },
                },
                specUom,
              ];
            });
          } else {
            catBody = catItems.map((r) => {
              const qty = Number(r.quantity ?? r.qty ?? 0);
              const resolved = getResolvedThreshold(r);
              const condition = getStockCondition(qty, resolved);
              const colors = getConditionColor(condition.key);

              return [
                r.code || r.itemCode || 'N/A',
                r.itemName || r.itemDescription || 'Raw Material',
                {
                  content: qty.toLocaleString(),
                  styles: {
                    fillColor: colors.fillColor,
                    textColor: colors.textColor,
                    fontStyle: 'bold',
                    halign: 'center',
                    overflow: 'ellipsize',
                  },
                },
                (r.uom || r.unit || 'pcs').toUpperCase(),
              ];
            });
          }

          // Intelligent page-break between categories
          if (catIdx > 0) {
            currentTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;
            if (currentTableStartY > pageHeight - 32) {
              doc.addPage();
              currentTableStartY = 19;
            }
          }

          const isWipDefective = activeTab === 'wip-defective';

          autoTable(doc, {
            startY: currentTableStartY,
            margin: { left: 14, right: 14, top: 19, bottom: 12 },
            head: [
              [
                {
                  content: `CATEGORY: ${catName.toUpperCase()}   •   ${catItems.length} ${catItems.length === 1 ? 'ITEM' : 'ITEMS'}`,
                  colSpan: colHeaders.length,
                  styles: {
                    fillColor: [241, 245, 249],
                    textColor: [21, 62, 151],
                    fontStyle: 'bold',
                    fontSize: isWipDefective ? 6.2 : 7.2,
                    halign: 'left',
                    valign: 'middle',
                    cellPadding: isWipDefective ? { top: 1.5, bottom: 1.5, left: 2, right: 2 } : { top: 2.2, bottom: 2.2, left: 3, right: 3 },
                    lineColor: [203, 213, 225],
                    lineWidth: 0.15,
                    overflow: 'visible',
                  },
                },
              ],
              colHeaders,
            ],
            body: catBody,
            theme: 'grid',
            styles: {
              font: 'helvetica',
              fontSize: isWipDefective ? 5.4 : 6.8,
              textColor: [51, 65, 85],
              cellPadding: isWipDefective ? { top: 1.4, bottom: 1.4, left: 1.2, right: 1.2 } : { top: 2, bottom: 2, left: 2, right: 2 },
              lineColor: [226, 232, 240],
              lineWidth: 0.15,
              valign: 'middle',
              overflow: isWipDefective ? 'visible' : 'ellipsize',
            },
            headStyles: {
              fillColor: [21, 62, 151], // Royal Blue #153E97
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: isWipDefective ? 5.4 : 7,
              cellPadding: isWipDefective ? { top: 1.6, bottom: 1.6, left: 1, right: 1 } : { top: 2, bottom: 2, left: 2, right: 2 },
              halign: 'center',
              valign: 'middle',
              lineColor: [21, 62, 151],
              lineWidth: 0.2,
              overflow: isWipDefective ? 'visible' : 'ellipsize',
            },
            bodyStyles: {
              overflow: isWipDefective ? 'visible' : 'ellipsize',
              valign: 'middle',
            },
            alternateRowStyles: {
              fillColor: [248, 250, 255],
            },
            columnStyles: columnStyles,
            didParseCell: (data) => {
              if (data.section === 'body' && data.cell.raw && typeof data.cell.raw === 'object' && data.cell.raw.styles) {
                if (data.cell.raw.styles.fillColor) {
                  data.cell.styles.fillColor = data.cell.raw.styles.fillColor;
                }
                if (data.cell.raw.styles.textColor) {
                  data.cell.styles.textColor = data.cell.raw.styles.textColor;
                }
                if (data.cell.raw.styles.overflow) {
                  data.cell.styles.overflow = data.cell.raw.styles.overflow;
                }
              }
            },
          });
        });
      }

      // ========================================================
      // 5. EXECUTIVE AUDIT SIGN-OFF SECTION (Single Signatory: Inventory Staff)
      // ========================================================
      let finalY = (doc.lastAutoTable?.finalY || 140) + 8;
      const sigSectionH = 24;

      // If remaining space on the current page is not enough, add a new page
      if (finalY + sigSectionH > pageHeight - 14) {
        doc.addPage();
        finalY = 22;
      }

      // Section Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(21, 62, 151);
      doc.text('AUDIT VERIFICATION & EXECUTIVE SIGN-OFF', 14, finalY);

      doc.setDrawColor(21, 62, 151);
      doc.setLineWidth(0.3);
      doc.line(14, finalY + 1.8, pageWidth - 14, finalY + 1.8);

      const sigY = finalY + 6.5;
      const colWidth = 72;
      const startX = 14;

      // Role title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(21, 62, 151);
      doc.text('PREPARED & COMPILED BY:', startX, sigY);

      // 1. Signatory Name (On top of underline)
      const signerFullName = getUserFullName('Signature over Printed Name');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(signerFullName.length > 25 ? 5.4 : 6.2);
      doc.setTextColor(15, 23, 42);
      doc.text(signerFullName, startX + (colWidth / 2), sigY + 9.5, { align: 'center' });

      // 2. Underline (Directly below Name)
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.25);
      doc.line(startX, sigY + 11, startX + colWidth, sigY + 11);

      // 3. Subtext: Inventory Staff (Single line, no date)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Inventory Staff', startX + (colWidth / 2), sigY + 14.8, { align: 'center' });

      // ========================================================
      // 6. FINAL PASS: CENTER WATERMARK, RUNNING HEADER & DYNAMIC PAGE NUMBERING (EVERY PAGE)
      // ========================================================
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Center Mhira Watermark Logo on EVERY page
        if (watermarkBase64) {
          try {
            doc.addImage(watermarkBase64, 'PNG', wmX, wmY, wmWidth, wmHeight, undefined, 'FAST');
          } catch (e) { }
        }

        // Running Header on Page 2+
        if (i > 1) {
          const thumbH = 7;
          const thumbW = thumbH * logoRatio;
          if (logoBase64) {
            try {
              doc.addImage(logoBase64, 'PNG', 14, 7, thumbW, thumbH, undefined, 'FAST');
            } catch (e) { }
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.2);
          doc.setTextColor(21, 62, 151);
          doc.text(`MHIRA NATURAL BEAUTY PRODUCTS  •  ${reportTitle.toUpperCase()}`, 14 + thumbW + 4, 11.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.2);
          doc.setTextColor(100, 116, 139);
          doc.text(`Period: ${formattedPeriod}`, pageWidth - 14, 11.5, { align: 'right' });

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(14, 16, pageWidth - 14, 16);
        }

        // Running Footer on Every Page
        const footerY = pageHeight - 7;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(14, footerY - 2.5, pageWidth - 14, footerY - 2.5);

        // Left-aligned Confidentiality
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(100, 116, 139);
        doc.text('INTERNAL CONFIDENTIAL • CONTROLLED EXECUTIVE COPY', 14, footerY + 1.2);

        // Right-aligned Dynamic Page Number
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, footerY + 1.2, { align: 'right' });
      }

      // Download PDF
      const dateTag = new Date().toISOString().slice(0, 10);
      const fileName = `MHIRA_Inventory_Report_${activeTab.replace('-', '_')}${showExpiryOnly ? '_Expiry' : ''}_${selectedMonth}_${selectedYear}_${dateTag}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported ${activeTabTitle} official audit report to PDF: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export PDF report.');
    } finally {
      setIsExportingPDF(false);
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
    if (showExpiryOnly) count++;
    return count;
  }, [searchQuery, selectedMonth, selectedYear, selectedStatus, hideZeroQty, showZeroOnly, sortBy, showExpiryOnly]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedMonth('All');
    setSelectedYear('All');
    setSelectedStatus('All');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setSortBy('default');
    setExpiryFilterType('all');
    setShowExpiryOnly(false);
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
                      setShowExpiryOnly(false);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 text-xs transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${isActive
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

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (RESPONSIVE: STACKS ON MOBILE, 1 ROW ON DESKTOP) */}
          <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">

            {/* GROUP 1: ACTIONS (Responsive: Full-width on mobile, fixed width on desktop) */}
            <div className="w-full lg:w-[256px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
              <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
                {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
                <button
                  type="button"
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f] disabled:opacity-60 disabled:cursor-wait"
                  title="Download Official PDF Report"
                  aria-label="Download Official PDF Report"
                >
                  {isExportingPDF ? (
                    <Loader2 className="w-5.5 h-5.5 text-[#01390f] animate-spin mb-0.5" />
                  ) : (
                    <Download className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                  )}
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    {isExportingPDF ? (
                      <>Exporting...<br />(PDF)</>
                    ) : (
                      <>Download<br />(PDF)</>
                    )}
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                  {/* Expiry FG or Expiry RM Button */}
                  {activeTab !== 'wip-defective' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowExpiryOnly((prev) => !prev);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded border transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] whitespace-nowrap ${showExpiryOnly
                          ? 'bg-emerald-50 text-[#01390f] border-emerald-300 font-bold shadow-2xs'
                          : 'bg-slate-50 lg:bg-transparent border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700'
                        }`}
                      title={
                        showExpiryOnly
                          ? `Showing ${activeTab === 'finished-goods' ? 'Expiry FG' : 'Expiry RM'} (Click to view standard list)`
                          : `Filter by ${activeTab === 'finished-goods' ? 'Expiry FG' : 'Expiry RM'}`
                      }
                    >
                      <Clock className={`w-3.5 h-3.5 shrink-0 ${showExpiryOnly ? 'text-[#01390f]' : 'text-slate-500'}`} />
                      <span className="whitespace-nowrap">
                        {activeTab === 'finished-goods' ? 'Expiry FG' : 'Expiry RM'}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-800 text-xs font-bold w-full h-[28px] lg:h-[22px] whitespace-nowrap select-none">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="truncate">Defect / Loss Audit</span>
                    </div>
                  )}

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

            {/* GROUP 2: SEARCH & FILTERS (Equal 3-Column Grid) */}
            <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">

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
                      {activeTab === 'wip-defective' && (
                        <>
                          <option value="Scrap">🔴 Scrap / Dispose</option>
                          <option value="Quarantined">🟡 Quarantined</option>
                          <option value="Destroyed">⚫ Destroyed</option>
                        </>
                      )}
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
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${hideZeroQty
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
                    className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors relative h-[22px] w-full ${showZeroOnly
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
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-1 select-none hidden lg:block">
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
                  {showExpiryOnly ? (
                    <>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">ITEM CODE</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">BATCH / LOT NO</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px] font-semibold text-white">ITEM NAME</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STOCK VOLUME</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">MFG DATE</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">EXPIRY DATE</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">DAYS REMAINING</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px] font-semibold text-white">
                        ACTION
                      </th>
                    </>
                  ) : (
                    <>
                      {/* TAB 1: FINISHED GOODS HEADERS */}
                      {activeTab === 'finished-goods' && (
                        <>
                          <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CODE</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">IMAGE</th>
                          <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px] font-semibold text-white">ITEM NAME</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">QUANTITY & CONDITION</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">SPECIFICATION & UOM</th>
                        </>
                      )}

                      {/* TAB 2: RAW MATERIALS HEADERS */}
                      {activeTab === 'raw-materials' && (
                        <>
                          <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CODE</th>
                          <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px] font-semibold text-white">ITEM NAME</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">QUANTITY & CONDITION</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">UOM</th>
                        </>
                      )}

                      {/* TAB 3: WIP DEFECTIVE / REJECTED UNITS HEADERS */}
                      {activeTab === 'wip-defective' && (
                        <>
                          <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">WIP NO</th>
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px] font-semibold text-white">PRODUCT / ITEM NAME</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">TOTAL COUNT NA PRODUCE</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">NABAWAS NA QUANTITY</th>
                          <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px] font-semibold text-white">REASON & DEDUCTION NOTES</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">NAME NG USER NA NAG BAWAS</th>
                          <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">DATE</th>
                        </>
                      )}
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        showExpiryOnly
                          ? 9
                          : activeTab === 'wip-defective'
                            ? 7
                            : activeTab === 'finished-goods'
                              ? 6
                              : 5
                      }
                      className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-[#01390f]" />
                        <span>Loading {activeTabTitle} audit ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : activeDataset.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        showExpiryOnly
                          ? 9
                          : activeTab === 'wip-defective'
                            ? 7
                            : activeTab === 'finished-goods'
                              ? 6
                              : 5
                      }
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="w-6 h-6 text-slate-300" />
                        <span>No {activeTabTitle.toLowerCase()} match the selected filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : showExpiryOnly ? (
                  paginatedData.map((item, idx) => {
                    const days =
                      item.daysUntilExpiry !== undefined
                        ? Number(item.daysUntilExpiry)
                        : Number(item.daysRemaining);
                    const isExpired = !isNaN(days) && days <= 0;
                    const isCritical = !isNaN(days) && days > 0 && days <= 7;
                    const isNear = !isNaN(days) && days > 7 && days <= 30;

                    return (
                      <tr
                        key={item._id || item.id || idx}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                      >
                        {/* 1. ITEM CODE */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                            {item.code || item.itemCode || 'N/A'}
                          </span>
                        </td>

                        {/* 2. BATCH / LOT NO */}
                        <td className="px-4 py-3.5 font-mono font-semibold text-xs text-slate-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.batchNo || 'N/A'}
                        </td>

                        {/* 3. CATEGORY (Pill Badge) */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200">
                            {item.category ||
                              (activeTab === 'finished-goods'
                                ? 'Finished Goods'
                                : 'Raw Materials')}
                          </span>
                        </td>

                        {/* 4. ITEM NAME */}
                        <td
                          className="px-4 py-3.5 font-semibold text-xs text-slate-900 whitespace-nowrap max-w-xs truncate bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors"
                          title={item.itemDescription || item.itemName}
                        >
                          {item.itemDescription || item.itemName || 'N/A'}
                        </td>

                        {/* 5. STOCK VOLUME (Matches Blue Accent Column) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                          {Number(item.quantity ?? item.stockVolume ?? 0).toLocaleString()}{' '}
                          {item.uom || (activeTab === 'finished-goods' ? 'pcs' : 'kg')}
                        </td>

                        {/* 6. MFG DATE */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.mfgDate ? new Date(item.mfgDate).toLocaleDateString() : 'N/A'}
                        </td>

                        {/* 7. EXPIRY DATE */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.expiryDate &&
                            item.expiryDate !== 'N/A' &&
                            !isNaN(new Date(item.expiryDate).getTime()) ? (
                            new Date(item.expiryDate).toLocaleDateString()
                          ) : item.expDate &&
                            item.expDate !== 'N/A' &&
                            !isNaN(new Date(item.expDate).getTime()) ? (
                            new Date(item.expDate).toLocaleDateString()
                          ) : (
                            'N/A'
                          )}
                        </td>

                        {/* 8. DAYS REMAINING (Clean Tinted Cell, Dot Removed) */}
                        <td
                          className={`px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold transition-colors select-none ${item.status === 'Disposed'
                              ? 'bg-slate-200/60 group-hover:bg-slate-200/80 text-slate-700'
                              : isExpired
                                ? 'bg-rose-500/20 group-hover:bg-rose-500/30 text-rose-800'
                                : isCritical
                                  ? 'bg-rose-500/20 group-hover:bg-rose-500/30 text-rose-800'
                                  : isNear
                                    ? 'bg-amber-500/20 group-hover:bg-amber-500/30 text-amber-900'
                                    : 'bg-emerald-500/20 group-hover:bg-emerald-500/30 text-emerald-900'
                            }`}
                        >
                          <span>
                            {item.status === 'Disposed'
                              ? 'Written Off'
                              : isExpired
                                ? 'Expired (0d)'
                                : `${days}d left`}
                          </span>
                        </td>

                        {/* 9. ACTION (STICKY RIGHT) */}
                        <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-20 min-w-[80px]">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => setSelectedExpiryDetail(item)}
                              title="View Expiry Details"
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    {/* TAB 1: FINISHED GOODS ROWS */}
                    {activeTab === 'finished-goods' &&
                      paginatedData.map((item, idx) => {
                        const displayQty = Number(item.quantity ?? 0);
                        const resolved = getResolvedThreshold(item);
                        const condition = getStockCondition(displayQty, resolved);

                        return (
                          <tr
                            key={item._id || idx}
                            className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                          >
                            {/* CODE */}
                            <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                                {item.code || item.sku || 'FG-001'}
                              </span>
                            </td>

                            {/* IMAGE */}
                            <td className="py-2.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex justify-center items-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedImageItem({
                                      ...item,
                                      type: 'Finished Good',
                                      condition,
                                    })
                                  }
                                  className="relative group/img cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-[#01390f] focus:outline-none focus:ring-2 focus:ring-[#01390f]/30 shadow-2xs transition-all hover:scale-105 active:scale-95 bg-white"
                                  title="Click to view full product image"
                                >
                                  <img
                                    src={resolveItemImageUrl(
                                      item.image ||
                                      item.imageUrl ||
                                      (Array.isArray(item.images) ? item.images[0] : null)
                                    )}
                                    alt={item.itemName || item.itemDescription || 'Product'}
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = '/mhira_removebg.png';
                                    }}
                                    className="w-10 h-10 object-cover rounded-lg bg-slate-50 transition-transform duration-200 group-hover/img:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white rounded-lg">
                                    <Eye className="w-3.5 h-3.5 drop-shadow" />
                                  </div>
                                </button>
                              </div>
                            </td>

                            {/* CATEGORY (Pill Badge) */}
                            <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200">
                                {item.category || 'Finished Goods'}
                              </span>
                            </td>

                            {/* ITEM NAME */}
                            <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-bold text-xs text-slate-800 transition-colors">
                              {item.itemName ||
                                item.name ||
                                item.itemDescription ||
                                'Finished Good'}
                            </td>

                            {/* QUANTITY & CONDITION (Blue Highlight Accent Column, No Dot) */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-mono font-bold text-slate-800 text-xs">
                                  {displayQty}{' '}
                                  <span className="text-[10px] text-slate-600 font-normal font-sans">
                                    / {resolved.overstockLimitPoint} max
                                  </span>
                                </span>
                                <span
                                  className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${condition.badgeClass}`}
                                >
                                  {condition.label}
                                </span>
                              </div>
                            </td>

                            {/* SPECIFICATION & UOM */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-mono font-bold text-slate-800 text-xs">
                                  {item.specification ? item.specification : '-'}
                                </span>
                                <span className="inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300 bg-slate-100 text-slate-700 uppercase">
                                  {item.uom || 'PCS'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {/* TAB 2: RAW MATERIALS ROWS */}
                    {activeTab === 'raw-materials' &&
                      paginatedData.map((item, idx) => {
                        const displayQty = Number(item.quantity ?? item.qty ?? 0);
                        const resolved = getResolvedThreshold(item);
                        const condition = getStockCondition(displayQty, resolved);

                        return (
                          <tr
                            key={item._id || idx}
                            className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                          >
                            {/* CODE */}
                            <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                                {item.code || item.itemCode || 'RM0001'}
                              </span>
                            </td>

                            {/* CATEGORY (Pill Badge) */}
                            <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200">
                                {item.category || 'Raw Materials'}
                              </span>
                            </td>

                            {/* ITEM NAME */}
                            <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-bold text-xs text-slate-800 transition-colors">
                              {item.itemName || item.itemDescription || 'Raw Material'}
                            </td>

                            {/* QUANTITY & CONDITION (Blue Highlight Accent Column, No Dot) */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-mono font-bold text-slate-800 text-xs">
                                  {displayQty}{' '}
                                  <span className="text-[10px] text-slate-600 font-normal font-sans">
                                    / {resolved.overstockLimitPoint} max
                                  </span>
                                </span>
                                <span
                                  className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${condition.badgeClass}`}
                                >
                                  {condition.label}
                                </span>
                              </div>
                            </td>

                            {/* UOM */}
                            <td className="px-4 py-3.5 text-center font-mono text-xs uppercase text-slate-700 whitespace-nowrap font-bold bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {item.uom || item.unit || 'pcs'}
                            </td>
                          </tr>
                        );
                      })}

                    {/* TAB 3: WIP DEFECTIVE / REJECTED UNITS ROWS */}
                    {activeTab === 'wip-defective' &&
                      paginatedData.map((item, idx) => {
                        const targetQty = Number(item.targetQuantity || 0);
                        const producedQty = Number(item.producedQuantity || 0);
                        const rejectedQty = Number(item.rejectedQuantity || 0);

                        return (
                          <tr
                            key={item._id || item.wipBatchCode || idx}
                            className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                          >
                            {/* WIP NO */}
                            <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                                {item.wipBatchCode || 'WIP-BATCH'}
                              </span>
                            </td>

                            {/* PRODUCT / ITEM NAME */}
                            <td className="px-4 py-3.5 whitespace-nowrap min-w-[180px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-slate-800 text-xs">
                                  {item.productName || 'Finished Product'}
                                </span>
                                {item.productCode && (
                                  <span className="font-mono text-[10px] text-slate-500 font-semibold">
                                    {item.productCode}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* TOTAL COUNT NA PRODUCE (Blue Highlight Accent Column) */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                              <div className="flex flex-col items-center gap-0.5">
                                <span>{producedQty.toLocaleString()} pcs produced</span>
                                <span className="text-[10px] text-slate-600 font-sans font-medium">
                                  Target: {targetQty.toLocaleString()} pcs
                                </span>
                              </div>
                            </td>

                            {/* NABAWAS NA QUANTITY */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                                  -{rejectedQty.toLocaleString()} pcs
                                </span>
                                <span className="text-[10px] text-rose-700 font-semibold uppercase tracking-wider">
                                  {item.rejectionDisposition || 'Scrap / Dispose'}
                                </span>
                              </div>
                            </td>

                            {/* REASON & DEDUCTION NOTES */}
                            <td className="px-4 py-3.5 whitespace-nowrap min-w-[200px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex flex-col gap-0.5 max-w-xs">
                                <span className="font-bold text-slate-800 text-xs">
                                  {item.rejectionReason || 'Quality Defect'}
                                </span>
                                {item.rejectionNotes ? (
                                  <span
                                    className="text-[11px] text-slate-600 font-normal italic truncate"
                                    title={item.rejectionNotes}
                                  >
                                    "{item.rejectionNotes}"
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-normal italic">
                                    No deduction notes provided
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* USER / QC APPROVER */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <span className="font-bold text-xs text-slate-800 whitespace-nowrap">
                                {item.rejectionApprover || 'QC Inspector'}
                              </span>
                            </td>

                            {/* DATE */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex flex-col items-center">
                                <span className="font-mono text-xs font-semibold text-slate-700">
                                  {new Date(
                                    item.updatedAt || item.createdAt || item.mfgDate
                                  ).toLocaleDateString()}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {item.updatedAt
                                    ? new Date(item.updatedAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                    : ''}
                                </span>
                              </div>
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

      {/* PRODUCT IMAGE PREVIEW MODAL */}
      <ItemImageModal
        isOpen={Boolean(selectedImageItem)}
        onClose={() => setSelectedImageItem(null)}
        item={selectedImageItem}
      />

      {/* EXPIRY DETAIL INSPECTION MODAL */}
      {selectedExpiryDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                  Batch Expiry & Shelf Life Details
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {selectedExpiryDetail.itemDescription || selectedExpiryDetail.itemName || (activeTab === 'finished-goods' ? 'Finished Good' : 'Raw Material')} • Batch: {selectedExpiryDetail.batchNo || 'N/A'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedExpiryDetail(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-200/70 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wide">
                      Batch / Lot Number
                    </span>
                    <span className="font-bold text-slate-900 text-sm block font-mono">
                      {selectedExpiryDetail.batchNo || 'N/A'}
                    </span>
                  </div>
                  <div>
                    {(() => {
                      const days = selectedExpiryDetail.daysUntilExpiry !== undefined ? Number(selectedExpiryDetail.daysUntilExpiry) : Number(selectedExpiryDetail.daysRemaining);
                      const isExpired = !isNaN(days) && days <= 0;
                      const isCritical = !isNaN(days) && days > 0 && days <= 7;
                      const isNear = !isNaN(days) && days > 7 && days <= 30;

                      return (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isExpired
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isCritical
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isNear
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-[#EDF7EE] text-[#01390f] border border-[#d5ead7]'
                          }`}>
                          {isExpired ? 'Expired' : isCritical ? 'Critical (≤7d)' : isNear ? 'Near Expiry (≤30d)' : 'Good Condition'}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Item Code</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedExpiryDetail.code || selectedExpiryDetail.itemCode || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Stock Volume</span>
                    <span className="font-bold text-[#01390f] font-mono">
                      {Number(selectedExpiryDetail.quantity ?? selectedExpiryDetail.stockVolume ?? 0).toLocaleString()} {selectedExpiryDetail.uom || (activeTab === 'finished-goods' ? 'pcs' : 'kg')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Mfg / Production Date</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {selectedExpiryDetail.mfgDate ? new Date(selectedExpiryDetail.mfgDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Expiration Date</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {selectedExpiryDetail.expiryDate && selectedExpiryDetail.expiryDate !== 'N/A' && !isNaN(new Date(selectedExpiryDetail.expiryDate).getTime())
                        ? new Date(selectedExpiryDetail.expiryDate).toLocaleDateString()
                        : selectedExpiryDetail.expDate && selectedExpiryDetail.expDate !== 'N/A' && !isNaN(new Date(selectedExpiryDetail.expDate).getTime())
                          ? new Date(selectedExpiryDetail.expDate).toLocaleDateString()
                          : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">Item Description</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {selectedExpiryDetail.itemDescription || selectedExpiryDetail.itemName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">Category</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedExpiryDetail.category || (activeTab === 'finished-goods' ? 'Finished Goods' : 'Raw Materials')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setSelectedExpiryDetail(null)}
                className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
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

export default InventoryReports;
