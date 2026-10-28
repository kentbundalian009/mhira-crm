import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ListPlus,
  Calendar,
  Search,
  Trash2,
  Plus,
  Image as ImageIcon,
  CheckCircle,
  CheckCircle2,
  Eye,
  X,
  Loader2,
  MapPin,
  AlertTriangle,
  Scale,
  Globe,
  PackageCheck,
  FileDown,
  ShieldAlert,
  AlertCircle,
  Filter,
  Clock,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Tag,
  ChevronDown,
  Building2,
  Hash,
  RefreshCw,
  ArrowUpDown,
  Truck
} from 'lucide-react';
import axios, { API, API_BASE_URL } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';
import MasterCategoryUomModal from './common/MasterCategoryUomModal';

const DEFAULT_GLOBAL_THRESHOLDS = {
  criticalLevel: 0,
  restockWarningPoint: 10,
  overstockLimitPoint: 200,
};

const DEFAULT_UOM_THRESHOLDS = {
  pcs: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 200 },
  kg: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  g: { criticalLevel: 0, restockWarningPoint: 500, overstockLimitPoint: 5000 },
  l: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 100 },
  lt: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 100 },
  ml: { criticalLevel: 0, restockWarningPoint: 500, overstockLimitPoint: 5000 },
  drum: { criticalLevel: 0, restockWarningPoint: 2, overstockLimitPoint: 20 },
  box: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  bag: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  roll: { criticalLevel: 0, restockWarningPoint: 3, overstockLimitPoint: 30 },
  meter: { criticalLevel: 0, restockWarningPoint: 20, overstockLimitPoint: 200 },
};

const getConversionFactor = (fromUnit, toUnit) => {
  const from = (fromUnit || '').toLowerCase().trim();
  const to = (toUnit || '').toLowerCase().trim();
  if (from === to) return 1;

  // 1 KG or 1 LT / L -> 1,000 g or 1,000 mL
  if (
    (from === 'kg' || from === 'l' || from === 'lt' || from === 'liter' || from === 'liters') &&
    (to === 'g' || to === 'ml')
  ) {
    return 1000;
  }

  // 1 g or 1 mL -> 0.001 KG or 0.001 LT
  if (
    (from === 'g' || from === 'ml') &&
    (to === 'kg' || to === 'l' || to === 'lt' || to === 'liter' || to === 'liters')
  ) {
    return 0.001;
  }

  if ((from === 'l' && to === 'lt') || (from === 'lt' && to === 'l')) return 1;
  if ((from === 'kg' && (to === 'l' || to === 'lt')) || ((from === 'l' || from === 'lt') && to === 'kg')) return 1;
  return 1;
};

const getAvailableReceivingUnits = (baseUom) => {
  const b = (baseUom || 'pcs').toLowerCase().trim();
  if (b === 'g' || b === 'kg') return ['kg', 'g', 'lt'];
  if (b === 'ml' || b === 'l' || b === 'lt') return ['lt', 'ml', 'kg', 'l'];
  return [baseUom || 'pcs'];
};

function InventoryDeliveryReceiving() {
  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  const getTodayLocalDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDate = getTodayLocalDate();

  // Header State
  const [batchPoNo, setBatchPoNo] = useState('');
  const [supplierBrand, setSupplierBrand] = useState('');
  const [suppliersList, setSuppliersList] = useState([]);
  const [selectedSupplierAddress, setSelectedSupplierAddress] = useState('');
  const [dateReceived, setDateReceived] = useState(todayDate);
  const [originLocation, setOriginLocation] = useState('');

  // Multi-tier Threshold Rules States
  const [globalThresholds, setGlobalThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('rawmat_threshold_rules');
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Failed to load global thresholds:', err);
    }
    return DEFAULT_GLOBAL_THRESHOLDS;
  });

  const [uomThresholds, setUomThresholds] = useState(() => {
    try {
      const saved = localStorage.getItem('rawmat_uom_thresholds');
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Failed to load uom thresholds:', err);
    }
    return DEFAULT_UOM_THRESHOLDS;
  });

  const [itemSpecificLimits, setItemSpecificLimits] = useState(() => {
    try {
      const saved = localStorage.getItem('rawmat_item_specific_limits');
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Failed to load specific limits:', err);
    }
    return {};
  });

  // Search & Raw Material Selection
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Manifest Table Items
  const [selectedItems, setSelectedItems] = useState([]);

  // View Mode: 'receive' | 'logs'
  const [viewMode, setViewMode] = useState('receive');

  // Sidebar Logs
  const [inboundLogs, setInboundLogs] = useState([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logSupplierFilter, setLogSupplierFilter] = useState('All');
  const [logDateFilter, setLogDateFilter] = useState('All');
  const [logSortBy, setLogSortBy] = useState('newest');
  const [logQuickFilter, setLogQuickFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  // Pagination states for inbound logs
  const [logPage, setLogPage] = useState(1);
  const [logPerPage, setLogPerPage] = useState(10);

  // Modal Detail View for Inbound Logs
  const [selectedLog, setSelectedLog] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isMasterConfigModalOpen, setIsMasterConfigModalOpen] = useState(false);

  // Check if current Delivery Receipt No. is already existing
  const isDrDuplicate = useMemo(() => {
    const trimmed = (batchPoNo || '').trim().toLowerCase();
    if (!trimmed) return false;
    return inboundLogs.some(
      (log) => (log.batchPoNo || '').trim().toLowerCase() === trimmed
    );
  }, [batchPoNo, inboundLogs]);

  // Reset pagination on log search or filters change
  useEffect(() => {
    setLogPage(1);
  }, [logSearchQuery, logSupplierFilter, logDateFilter, logSortBy, logQuickFilter]);

  const uniqueLogSuppliers = useMemo(() => {
    const s = new Set();
    inboundLogs.forEach((l) => {
      if (l.supplierBrand) s.add(l.supplierBrand);
    });
    suppliersList.forEach((sup) => {
      if (sup.name) s.add(sup.name);
    });
    return Array.from(s).sort();
  }, [inboundLogs, suppliersList]);

  const filteredInboundLogs = useMemo(() => {
    let result = inboundLogs.filter((log) => {
      // 1. Search Query
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase().trim();
        const dr = (log.batchPoNo || '').toLowerCase();
        const sup = (log.supplierBrand || '').toLowerCase();
        const loc = (log.originLocation || '').toLowerCase();
        const prep = (log.preparedBy || '').toLowerCase();
        if (!dr.includes(q) && !sup.includes(q) && !loc.includes(q) && !prep.includes(q)) {
          return false;
        }
      }

      // 2. Supplier filter
      if (logSupplierFilter !== 'All') {
        if ((log.supplierBrand || '').toLowerCase() !== logSupplierFilter.toLowerCase()) {
          return false;
        }
      }

      // 3. Date range filter
      if (logDateFilter !== 'All') {
        const logDate = log.dateReceived ? new Date(log.dateReceived) : null;
        if (logDate && !isNaN(logDate.getTime())) {
          const now = new Date();
          if (logDateFilter === 'today') {
            const todayStr = getTodayLocalDate();
            const logStr = logDate.toISOString().split('T')[0];
            if (logStr !== todayStr) return false;
          } else if (logDateFilter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);
            if (logDate < weekAgo) return false;
          } else if (logDateFilter === 'month') {
            if (logDate.getMonth() !== now.getMonth() || logDate.getFullYear() !== now.getFullYear()) {
              return false;
            }
          }
        }
      }

      // 4. Quick filter
      if (logQuickFilter === 'today') {
        const todayStr = getTodayLocalDate();
        const logStr = log.dateReceived ? new Date(log.dateReceived).toISOString().split('T')[0] : '';
        if (logStr !== todayStr) return false;
      } else if (logQuickFilter === 'multi') {
        if ((log.items?.length || 0) <= 1) return false;
      }

      return true;
    });

    // Sorting
    if (logSortBy === 'newest') {
      result.sort((a, b) => new Date(b.dateReceived || 0) - new Date(a.dateReceived || 0));
    } else if (logSortBy === 'oldest') {
      result.sort((a, b) => new Date(a.dateReceived || 0) - new Date(b.dateReceived || 0));
    } else if (logSortBy === 'dr_asc') {
      result.sort((a, b) => (a.batchPoNo || '').localeCompare(b.batchPoNo || ''));
    } else if (logSortBy === 'items_desc') {
      result.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
    }

    return result;
  }, [inboundLogs, logSearchQuery, logSupplierFilter, logDateFilter, logQuickFilter, logSortBy]);

  const activeLogFiltersCount = useMemo(() => {
    let count = 0;
    if (logSearchQuery.trim()) count++;
    if (logSupplierFilter !== 'All') count++;
    if (logDateFilter !== 'All') count++;
    if (logQuickFilter !== 'all') count++;
    if (logSortBy !== 'newest') count++;
    return count;
  }, [logSearchQuery, logSupplierFilter, logDateFilter, logQuickFilter, logSortBy]);

  const handleClearLogFilters = () => {
    setLogSearchQuery('');
    setLogSupplierFilter('All');
    setLogDateFilter('All');
    setLogQuickFilter('all');
    setLogSortBy('newest');
    setLogPage(1);
  };

  const handleClearManifest = () => {
    if (selectedItems.length === 0) return;
    if (window.confirm('Are you sure you want to clear all raw materials from the receiving manifest?')) {
      setSelectedItems([]);
      showSuccessToast('Cleared all items from the receiving manifest.');
    }
  };

  const paginatedInboundLogs = useMemo(() => {
    const start = (logPage - 1) * logPerPage;
    return filteredInboundLogs.slice(start, start + logPerPage);
  }, [filteredInboundLogs, logPage, logPerPage]);

  // Helper: Resolve effective threshold for an item based on item's own limits, material-specific, UOM, or global default
  const getResolvedThreshold = useCallback(
    (item, gRules = globalThresholds, uRules = uomThresholds, sLimits = itemSpecificLimits) => {
      // 0. Direct Item thresholds configured from Raw Materials master list
      if (
        item?.overstockLimitPoint !== undefined ||
        item?.maxLimit !== undefined ||
        item?.thresholds?.overstockLimitPoint !== undefined
      ) {
        return {
          criticalLevel: Number(item?.criticalLevel ?? item?.thresholds?.criticalLevel ?? gRules.criticalLevel ?? 0),
          restockWarningPoint: Number(item?.restockWarningPoint ?? item?.thresholds?.restockWarningPoint ?? gRules.restockWarningPoint ?? 10),
          overstockLimitPoint: Number(item?.overstockLimitPoint ?? item?.maxLimit ?? item?.thresholds?.overstockLimitPoint ?? gRules.overstockLimitPoint ?? 1000),
        };
      }

      const itemId = item?._id || item?.id || item?.rawMaterialId;
      const code = item?.code || item?.itemCode;

      // 1. Material specific override
      if (itemId && sLimits[itemId] !== undefined) {
        return {
          criticalLevel: Number(gRules.criticalLevel ?? 0),
          restockWarningPoint: Number(gRules.restockWarningPoint ?? 10),
          overstockLimitPoint: Number(sLimits[itemId]),
        };
      }
      if (code && sLimits[code] !== undefined) {
        return {
          criticalLevel: Number(gRules.criticalLevel ?? 0),
          restockWarningPoint: Number(gRules.restockWarningPoint ?? 10),
          overstockLimitPoint: Number(sLimits[code]),
        };
      }

      // 2. UOM specific rules
      const uomKey = (item?.uom || item?.unit || 'pcs').toLowerCase().trim();
      if (uRules && uRules[uomKey]) {
        return {
          criticalLevel: Number(uRules[uomKey].criticalLevel ?? 0),
          restockWarningPoint: Number(uRules[uomKey].restockWarningPoint ?? 10),
          overstockLimitPoint: Number(uRules[uomKey].overstockLimitPoint ?? 200),
        };
      }

      // 3. Global fallback
      return {
        criticalLevel: Number(gRules.criticalLevel ?? 0),
        restockWarningPoint: Number(gRules.restockWarningPoint ?? 10),
        overstockLimitPoint: Number(gRules.overstockLimitPoint ?? 200),
      };
    },
    [globalThresholds, uomThresholds, itemSpecificLimits]
  );

  // Helper: Calculate stock condition status
  const calculateProjectedStatus = useCallback(
    (currentStock, qtyReceived, item) => {
      const current = Number(currentStock) || 0;
      const rules = getResolvedThreshold(item);
      const critical = Number(rules?.criticalLevel ?? 0);
      const restock = Number(rules?.restockWarningPoint ?? 10);
      const maxLimit = Number(rules?.overstockLimitPoint ?? 200);

      const received = Number(qtyReceived) || 0;
      const projected = current + received;

      if (projected > maxLimit) {
        return {
          key: 'Overstock',
          label: 'Overstock Limit Exceeded',
          isOverLimit: true,
          overAmount: projected - maxLimit,
          maxLimit,
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/70 font-semibold',
          dotClass: 'bg-blue-500',
        };
      }
      if (projected <= critical) {
        return {
          key: 'Critical Alert',
          label: 'Critical Alert',
          isOverLimit: false,
          maxLimit,
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/70 font-semibold',
          dotClass: 'bg-rose-500',
        };
      }
      if (projected <= restock) {
        return {
          key: 'Restock Warning',
          label: 'Restock Warning',
          isOverLimit: false,
          maxLimit,
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/70 font-semibold',
          dotClass: 'bg-amber-500',
        };
      }
      return {
        key: 'Healthy',
        label: 'Healthy',
        isOverLimit: false,
        maxLimit,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 font-semibold',
        dotClass: 'bg-emerald-500',
      };
    },
    [getResolvedThreshold]
  );

  // Fetch all suppliers for dropdown
  const fetchSuppliers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await API.get('/api/inventory-suppliers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));
      setSuppliersList(res.data || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  }, []);

  // Fetch all raw materials for dropdown (excluding in-house plant utilities)
  const fetchRawMaterials = useCallback(async () => {
    try {
      setIsSearching(true);
      const token = localStorage.getItem('token');
      const res = await API.get('/api/inventory-raw-materials', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));
      const allData = res.data || [];
      setRawMaterialsList(allData);
      setSearchResults(allData);
    } catch (err) {
      console.error('Error fetching raw materials:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchRawMaterials();
    fetchSuppliers();
  }, [fetchRawMaterials, fetchSuppliers]);

  // Handle supplier change and auto-populate address
  const handleSupplierChange = (e) => {
    const selectedName = e.target.value;
    setSupplierBrand(selectedName);
    const found = suppliersList.find((s) => s.name === selectedName || s.code === selectedName);
    const addr = found ? found.address || '' : '';
    setSelectedSupplierAddress(addr);
    if (addr) {
      setOriginLocation(addr);
    }
  };

  // Handle Date Received change
  const handleDateReceivedChange = (e) => {
    const selected = e.target.value;
    if (selected > todayDate) {
      showErrorToast('Future dates are not allowed for Date Received. Please select a past or present date.');
      setDateReceived(todayDate);
    } else {
      setDateReceived(selected);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Unique Categories from Raw Materials Catalog
  const uniqueCategories = useMemo(() => {
    const cats = new Set();
    rawMaterialsList.forEach((item) => {
      const c = item.category || item.segment;
      if (c && c.trim()) {
        cats.add(c.trim());
      }
    });
    return Array.from(cats).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [rawMaterialsList]);

  // Filter Raw Materials dynamically
  const applyFilter = useCallback((query, category) => {
    let filtered = rawMaterialsList;

    if (category && category !== 'All Categories') {
      const catLower = category.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const itemCat = (item.category || item.segment || '').toLowerCase().trim();
        return itemCat === catLower;
      });
    }

    if (query && query.trim() !== '') {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const code = (item.code || item.itemCode || '').toLowerCase();
        const name = (item.itemName || item.name || '').toLowerCase();
        const desc = (item.itemDescription || item.description || '').toLowerCase();
        const spec = (item.specification || item.spec || item.dimension || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        return (
          code.includes(q) ||
          name.includes(q) ||
          desc.includes(q) ||
          spec.includes(q) ||
          brand.includes(q)
        );
      });
    }

    setSearchResults(filtered);
  }, [rawMaterialsList]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    applyFilter(value, selectedCategory);
    setShowDropdown(true);
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    setSelectedCategory(value);
    applyFilter(searchQuery, value);
    setShowDropdown(true);
  };

  const handleInputFocus = () => {
    if (rawMaterialsList.length === 0) {
      fetchRawMaterials();
    }
    applyFilter(searchQuery, selectedCategory);
    setShowDropdown(true);
  };

  // Add Item to Receiving Table
  const handleSelectItem = (item) => {
    const itemId = item._id || item.id;
    const baseUom = item.uom || item.unit || 'pcs';
    const receivingUnit = baseUom.toLowerCase() === 'g' ? 'kg' : (baseUom.toLowerCase() === 'ml' ? 'l' : baseUom);
    const initialRawQty = 1;
    const factor = getConversionFactor(receivingUnit, baseUom);
    const initialConverted = parseFloat((initialRawQty * factor).toFixed(2));
    const newItem = {
      lineKey: `${itemId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      rawMaterialId: itemId,
      code: item.code || item.itemCode || 'N/A',
      itemName: item.itemName || item.name || item.itemDescription || item.description || '',
      itemDescription: item.itemDescription || item.description || item.itemName || '',
      specification: item.specification || item.spec || '',
      category: item.category || 'Raw Material',
      segment: item.segment || '',
      currentStock: Number(item.quantity ?? item.qty ?? 0),
      rawInputQty: initialRawQty,
      receivingUnit: receivingUnit,
      quantityReceived: initialConverted,
      actualQuantity: initialConverted,
      uom: baseUom,
      expirationDate: '',
      expiryDate: '',
      receivingStatus: 'Accepted',
    };

    setSelectedItems((prev) => [...prev, newItem]);
    setSearchQuery('');
    applyFilter('', selectedCategory);
    setShowDropdown(false);
  };

  // Handle Input Changes inside Table Rows
  const handleItemQtyChange = (index, value) => {
    const numVal = Math.max(0.001, parseFloat(value) || 0);
    setSelectedItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const factor = getConversionFactor(item.receivingUnit, item.uom);
      const convertedQty = parseFloat((numVal * factor).toFixed(2));
      updated[index] = {
        ...item,
        rawInputQty: value,
        quantityReceived: convertedQty,
        actualQuantity: convertedQty,
      };
      return updated;
    });
  };

  const handleItemUnitChange = (index, newUnit) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      const inputVal = Math.max(0.001, parseFloat(item.rawInputQty) || 0);
      const factor = getConversionFactor(newUnit, item.uom);
      const convertedQty = parseFloat((inputVal * factor).toFixed(2));
      updated[index] = {
        ...item,
        receivingUnit: newUnit,
        quantityReceived: convertedQty,
        actualQuantity: convertedQty,
      };
      return updated;
    });
  };

  const handleItemExpiryChange = (index, value) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        expiryDate: value,
        expirationDate: value,
      };
      return updated;
    });
  };

  const handleToggleNoExpiry = (index) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      const isCurrentlyNA = updated[index]?.expiryDate === 'N/A';
      const newVal = isCurrentlyNA ? '' : 'N/A';
      updated[index] = {
        ...updated[index],
        expiryDate: newVal,
        expirationDate: newVal,
      };
      return updated;
    });
  };

  // Remove Item from Table
  const handleRemoveSelectedItem = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Fetch Inbound Logs
  const fetchLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/inventory-inbound`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInboundLogs(res.data || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleOpenConfirm = (e) => {
    if (e) e.preventDefault();

    const trimmedDr = (batchPoNo || '').trim();
    if (!trimmedDr) {
      showErrorToast('Delivery Receipt No. is required.');
      return;
    }
    if (isDrDuplicate) {
      showErrorToast(`Delivery Receipt No. "${trimmedDr}" already exists in the records. Duplicate DR numbers are not allowed.`);
      return;
    }
    if (!supplierBrand) {
      showErrorToast('Supplier Name is required.');
      return;
    }
    if (!dateReceived) {
      showErrorToast('Date Received is required.');
      return;
    }
    if (dateReceived > todayDate) {
      showErrorToast('Future dates are not allowed for Date Received. Please select a past or present date.');
      return;
    }
    if (selectedItems.length === 0) {
      showErrorToast('Please add at least one item to the receiving manifest table.');
      return;
    }

    const invalidItem = selectedItems.find((item) => !item.quantityReceived || item.quantityReceived <= 0);
    if (invalidItem) {
      showErrorToast(`Please enter a valid quantity for item: ${invalidItem.itemName || invalidItem.itemDescription}`);
      return;
    }

    // Expiration date is strictly mandatory (must be a valid date or marked as 'N/A')
    const unassignedExpiryItem = selectedItems.find((item) => {
      const exp = (item.expiryDate || item.expirationDate || '').trim();
      return !exp;
    });
    if (unassignedExpiryItem) {
      showErrorToast(
        `Expiration Date is required for item: "${unassignedExpiryItem.itemName || unassignedExpiryItem.itemDescription || 'Selected Item'}". Please enter a date or select N/A.`
      );
      return;
    }

    setIsConfirmOpen(true);
  };

  // Submit Inbound Shipment Registration
  const handleSubmitInboundConfirm = async () => {
    try {
      if (isDrDuplicate) {
        showErrorToast(`Delivery Receipt No. "${batchPoNo.trim()}" already exists! Please use a unique DR number.`);
        return;
      }

      const unassignedExpiryItem = selectedItems.find((item) => {
        const exp = (item.expiryDate || item.expirationDate || '').trim();
        return !exp;
      });
      if (unassignedExpiryItem) {
        showErrorToast(
          `Expiration Date is required for item: "${unassignedExpiryItem.itemName || unassignedExpiryItem.itemDescription || 'Selected Item'}". Please enter a date or select N/A.`
        );
        return;
      }
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const formattedItems = selectedItems.map((item) => {
        const exp = item.expiryDate || item.expirationDate || '';
        const qty = Number(item.quantityReceived || item.actualQuantity || 1);

        return {
          ...item,
          actualQuantity: qty,
          expectedQuantity: qty,
          quantityReceived: qty,
          packagingType: 'Standard',
          packageCount: 1,
          packSize: qty,
          packagingDisplay: '',
          mfgDate: item.mfgDate || dateReceived || todayDate,
          expiryDate: exp,
          expirationDate: exp,
          receivingStatus: item.receivingStatus || 'Accepted',
          returnReason: item.returnReason || '',
        };
      });

      const payload = {
        batchPoNo,
        supplierBrand,
        dateReceived,
        originLocation,
        items: formattedItems,
      };

      const res = await axios.post(`${API_BASE_URL}/api/inventory-inbound`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const msg = res.data?.message || 'Inbound Shipment successfully recorded!';
      showSuccessToast(msg);

      setBatchPoNo('');
      setSupplierBrand('');
      setSelectedSupplierAddress('');
      setDateReceived(todayDate);
      setOriginLocation('');
      setSelectedItems([]);
      setIsConfirmOpen(false);
      fetchLogs();
      fetchRawMaterials();
    } catch (error) {
      console.error('Failed to submit inbound:', error);
      showErrorToast(error.response?.data?.message || 'Error recording inbound shipment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate & Download Inbound Delivery Receipt PDF
  const handleDownloadInboundPdf = (log) => {
    if (!log) return;
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Brand Header Banner
      doc.setFillColor(1, 57, 15); // #01390f deep green
      doc.rect(0, 0, 210, 22, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('CRM INVENTORY SYSTEM', 14, 11);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('GOODS INBOUND RECEIVING / DELIVERY RECEIPT SLIP', 14, 17);

      doc.setFont('helvetica', 'bold');
      doc.text(`DR: ${log.batchPoNo || 'N/A'}`, 196, 14, { align: 'right' });

      // Metadata Box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 28, 182, 30, 3, 3, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('SUPPLIER BRAND:', 18, 36);
      doc.text('ORIGIN / LOCATION:', 18, 44);
      doc.text('RECEIVED BY:', 18, 52);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(log.supplierBrand || 'N/A', 52, 36);
      doc.text(log.originLocation || 'Main Warehouse', 52, 44);
      doc.text(log.preparedBy || 'Inventory Clerk', 52, 52);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('DATE RECEIVED:', 122, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(`${new Date(log.dateReceived).toLocaleDateString()}`, 155, 36);

      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL ITEMS:', 122, 44);
      doc.setFont('helvetica', 'normal');
      doc.text(`${log.items?.length || 0} Materials`, 155, 44);

      doc.setFont('helvetica', 'bold');
      doc.text('RECORD LOGGED:', 122, 52);
      doc.setFont('helvetica', 'normal');
      doc.text(`${new Date(log.createdAt || Date.now()).toLocaleDateString()}`, 155, 52);

      // Table of Received Items
      const tableHead = [
        ['#', 'Item Code', 'Item Name / Description', 'Qty Received', 'UOM', 'Expiry Date', 'Status']
      ];

      const tableBody = (log.items || []).map((item, idx) => {
        const isHeld = item.receivingStatus === 'Hold / Supplier Return' || item.receivingStatus === 'Rejected';
        const statusText = isHeld
          ? `ON HOLD (${item.supplierReturnTicketNo || 'Return Ticket'})`
          : 'Stock Received';
        const qtyText = isHeld
          ? `0 (+${item.quantityReceived ?? item.actualQuantity ?? 0} Held)`
          : `+${item.quantityReceived ?? item.actualQuantity ?? item.expectedQuantity ?? 0}`;

        return [
          idx + 1,
          item.code || 'N/A',
          item.itemName || item.itemDescription || item.description || 'Raw Material',
          qtyText,
          (item.uom || 'pcs').toUpperCase(),
          item.expiryDate || item.expirationDate || 'N/A',
          statusText
        ];
      });

      autoTable(doc, {
        startY: 64,
        head: tableHead,
        body: tableBody.length > 0 ? tableBody : [['-', '-', 'No materials recorded', '-', '-', '-', '-']],
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
          0: { halign: 'center', cellWidth: 10 },
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 30 },
          2: { fontStyle: 'bold', halign: 'left', cellWidth: 55 },
          3: { halign: 'center', cellWidth: 24 },
          4: { fontStyle: 'bold', halign: 'center', textColor: [1, 57, 15], cellWidth: 25 },
          5: { halign: 'center', cellWidth: 14 },
          6: { halign: 'center', cellWidth: 20 },
          7: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
        },
        theme: 'grid',
      });

      const finalY = doc.lastAutoTable.finalY + 14;

      // Signatures
      if (finalY + 35 < 285) {
        doc.setDrawColor(180, 180, 180);
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');

        doc.line(14, finalY + 18, 65, finalY + 18);
        doc.text('RECEIVED BY (Warehouse Clerk)', 14, finalY + 22);

        doc.line(78, finalY + 18, 130, finalY + 18);
        doc.text('INSPECTED BY (QC Inspector)', 78, finalY + 22);

        doc.line(143, finalY + 18, 196, finalY + 18);
        doc.text('NOTED BY (Inventory Officer)', 143, finalY + 22);
      }

      // Footer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated automatically by CRM Inventory System | Date: ${new Date().toLocaleString()}`, 14, 290);

      doc.save(`Inbound_Receipt_${log.batchPoNo || 'Slip'}.pdf`);
      showSuccessToast(`Downloaded PDF for DR #${log.batchPoNo}`);
    } catch (err) {
      console.error('Error generating Inbound PDF:', err);
      showErrorToast('Failed to generate Inbound PDF.');
    }
  };

  // Check if any item in the manifest exceeds the overstock limit
  const hasOverstockItems = useMemo(() => {
    return selectedItems.some((item) => {
      const rules = getResolvedThreshold(item);
      const limit = Number(rules?.overstockLimitPoint ?? 200);
      const current = Number(item.currentStock || 0);
      const received = Number(item.quantityReceived || 1);
      return current + received > limit;
    });
  }, [selectedItems, getResolvedThreshold]);

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] text-slate-700">
      {/* MAIN CARD CONTAINER (HOUSING TOOLBAR, RECEIVING MANIFEST / LOGS - MATCHES INVENTORY RAW MAT) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">

        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'receive', label: 'Raw Materials Receive' },
              { id: 'logs', label: 'Delivery Receipts' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${viewMode === tab.id
                  ? 'border-[#01390f] text-[#01390f] bg-slate-50 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'receive' && (
          <form onSubmit={handleOpenConfirm} className="flex flex-col gap-4">
            {/* SHIPMENT DETAILS & MATERIAL SELECTION */}
            <div className="flex flex-col gap-2.5 relative" ref={dropdownRef}>
              {/* STEP 1: INBOUND SHIPMENT & SUPPLIER DETAILS */}
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Delivery Receipt &amp; Supplier Info
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Enter the delivery receipt number, select the supplier, and specify the arrival date.
                    </p>
                  </div>
                </div>

                {/* SHIPMENT CONTROLS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* 1. DELIVERY RECEIPT NO. */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Delivery Receipt No. <span className="text-rose-500">*</span>
                      </label>
                      {isDrDuplicate && (
                        <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" /> Already exists
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Hash className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. DR-2026-001"
                        value={batchPoNo}
                        onChange={(e) => setBatchPoNo(e.target.value)}
                        className={`w-full bg-slate-50/50 hover:bg-white focus:bg-white border rounded-lg pl-9 pr-3 py-2 text-xs font-mono font-bold focus:outline-none transition-all h-[34px] ${isDrDuplicate
                          ? 'border-red-500 text-red-900 bg-red-50/50'
                          : 'border-slate-200 text-slate-800 focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20'
                          }`}
                      />
                    </div>
                    {isDrDuplicate && (
                      <p className="text-[11px] text-red-600 mt-1 font-medium leading-tight">
                        Delivery Receipt No. is already used. Please provide a unique number.
                      </p>
                    )}
                  </div>

                  {/* 2. SUPPLIER NAME */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supplier Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                      <select
                        required
                        value={supplierBrand}
                        onChange={handleSupplierChange}
                        className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 cursor-pointer appearance-none truncate transition-all h-[34px]"
                      >
                        <option value="">Select Supplier</option>
                        {suppliersList.map((sup) => (
                          <option key={sup._id || sup.id} value={sup.name}>
                            {sup.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    {selectedSupplierAddress && (
                      <p className="text-[11px] text-slate-500 mt-1 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                        <span>{selectedSupplierAddress}</span>
                      </p>
                    )}
                  </div>

                  {/* 3. DATE RECEIVED */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Date Received <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        required
                        max={todayDate}
                        value={dateReceived}
                        onChange={handleDateReceivedChange}
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch (err) { }
                        }}
                        className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold font-mono focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 cursor-pointer transition-all h-[34px]"
                      />
                    </div>
                  </div>
                </div>
              </div>


              {/* SELECT RAW MATERIALS TO MANIFEST */}
              <div className="flex flex-col gap-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Select Raw Materials <span className="text-rose-500">*</span>
                  </label>
                  {isDrDuplicate && (
                    <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-600" /> Already exists
                    </span>
                  )}
                </div>

                {/* DUAL SEARCH & SEGMENT CONTROLS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">


                  {/* 1. SEGMENT FILTER */}
                  <div className="sm:col-span-1 relative">
                    <Tag className="w-4 h-4 absolute left-3 top-2.5 pointer-events-none text-slate-400" />
                    <select
                      value={selectedCategory}
                      onChange={handleCategoryChange}
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 cursor-pointer appearance-none truncate transition-all h-[34px]"
                    >
                      <option value="All Categories">All Categories ({uniqueCategories.length})</option>
                      {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* 2. SMART MULTI-ATTRIBUTE SEARCH */}
                  <div className="sm:col-span-2 relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="raw-material-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={handleInputFocus}
                      placeholder="Search description, dimension (e.g. 2700, 50x50), or code..."
                      className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 transition-all h-[34px]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          applyFilter('', selectedCategory);
                        }}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isSearching && (
                      <Loader2 className="absolute right-8 top-2.5 w-4 h-4 animate-spin text-slate-400" />
                    )}
                  </div>
                </div>

                {/* SEARCH SUGGESTIONS DROPDOWN WITH PROMINENT DIMENSIONS */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 divide-y divide-slate-100 shadow-xl rounded-xl max-h-72 overflow-y-auto z-50 p-1 custom-scrollbar">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => {
                        const itemId = item._id || item.id;
                        const dimension = item.Dimension || item.Dimensions || item.dimension || item.dimensions || item.specification || item.spec;
                        const segment = item.Segment || item.segment || item.category;
                        const count = item.ActualCount || item.actualCount || item.AvailableStock || item.currentStock || item.quantity || 0;
                        const uom = item.UOM || item.uom || item.unit || 'pcs';
                        const desc = item.ItemDescription || item.itemDescription || item.itemName || item.name || 'Raw Material';
                        const code = item.Code || item.code || item.itemCode || 'RM-N/A';
                        const isAdded = selectedItems.some((i) => i.rawMaterialId === itemId);

                        return (
                          <div
                            key={itemId}
                            onMouseDown={() => handleSelectItem(item)}
                            className={`p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 rounded-lg transition-colors ${isAdded ? 'opacity-60 bg-emerald-50/20' : ''
                              }`}
                          >
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-800 whitespace-normal break-words">
                                  {desc}
                                </span>
                                {dimension && (
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border bg-indigo-50 border-indigo-200 text-indigo-700">
                                    {dimension}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                {segment && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-100 border-slate-200 text-slate-600">
                                    {segment}
                                  </span>
                                )}
                                <span className="font-mono text-[10px] text-slate-400">{code}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] px-2 py-0.5 rounded-md font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Avail: {Number(count).toLocaleString()} {uom}
                              </span>
                              {isAdded && (
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Added
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center flex flex-col items-center gap-2">
                        <p className="text-rose-500 italic font-medium text-xs">
                          No materials found matching &ldquo;{searchQuery}&rdquo; {selectedCategory !== 'All Categories' ? `in ${selectedCategory}` : ''}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>


            {/* MANIFEST HEADER */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Inbound Receiving Manifest
                </h3>
                <span className="text-xs font-semibold font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                  {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearManifest}
                  className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear Manifest</span>
                </button>
              )}
            </div>

            {/* MANIFEST TABLE */}
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
              <div className="overflow-x-auto relative custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      {/* 1. CODE */}
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CODE</th>
                      {/* 2. ITEM NAME */}
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px] font-semibold text-white">
                        ITEM NAME
                      </th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">CURRENT STOCK</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">QTY RECEIVED</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">AUTO-CONVERTED STOCK</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">PROJECTED STOCK & LIMIT</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">EXPIRY DATE *</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[80px] font-semibold text-white">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedItems.map((item, index) => {
                      const current = Number(item.currentStock || 0);
                      const convertedQty = Number(item.quantityReceived || 0);
                      const projected = current + convertedQty;
                      const status = calculateProjectedStatus(current, convertedQty, item);
                      const limit = status.maxLimit;
                      const availableUnits = getAvailableReceivingUnits(item.uom);

                      return (
                        <tr key={item.lineKey || index} className="hover:bg-slate-50/90 transition-colors whitespace-nowrap group">
                          {/* 1. CODE */}
                          <td className="py-3 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="inline-flex items-center text-xs font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              {item.code}
                            </span>
                          </td>

                          {/* 2. ITEM NAME */}
                          <td className="py-3.5 px-4 whitespace-nowrap min-w-[200px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                              {item.itemName || item.itemDescription || item.description || 'N/A'}
                            </span>
                          </td>

                          {/* 3. CURRENT STOCK */}
                          <td className="py-3 px-4 text-center text-slate-600 font-mono font-semibold whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {current.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase font-bold">{item.uom}</span>
                          </td>

                          {/* 4. QTY RECEIVED */}
                          <td className="py-3 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.rawInputQty ?? ''}
                                onWheel={(e) => e.target.blur()}
                                onChange={(e) => handleItemQtyChange(index, e.target.value)}
                                className="w-16 text-center bg-white border border-slate-200 rounded-lg py-1 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:border-[#01390f]"
                              />
                              <select
                                value={item.receivingUnit || item.uom}
                                onChange={(e) => handleItemUnitChange(index, e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold font-mono text-[#01390f] uppercase focus:outline-none cursor-pointer"
                              >
                                {availableUnits.map((u) => (
                                  <option key={u} value={u}>
                                    {u.toUpperCase()}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* 5. AUTO-CONVERTED STOCK */}
                          <td className="py-3 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-md whitespace-nowrap">
                              +{convertedQty.toLocaleString()} <span className="uppercase text-[10px] text-emerald-600 font-semibold">{item.uom}</span>
                            </span>
                          </td>

                          {/* 7. PROJECTED STOCK & LIMIT */}
                          <td className="py-3 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {projected.toLocaleString()} <span className="text-slate-400 font-normal">/ {limit.toLocaleString()} max</span>
                              </span>
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${status.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`}></span>
                                {status.isOverLimit ? `Overstock (+${status.overAmount})` : status.label}
                              </span>
                            </div>
                          </td>

                          {/* 8. EXPIRY DATE */}
                          <td className="py-3 px-4 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <div className="flex items-center gap-1.5">
                              {item.expiryDate === 'N/A' ? (
                                <div className="bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5 text-xs font-mono font-bold text-slate-700 select-none shadow-2xs whitespace-nowrap">
                                  N/A (No Expiry)
                                </div>
                              ) : (
                                <input
                                  type="date"
                                  min={todayDate}
                                  value={item.expiryDate || ''}
                                  onChange={(e) => handleItemExpiryChange(index, e.target.value)}
                                  onClick={(e) => {
                                    try {
                                      e.currentTarget.showPicker();
                                    } catch (err) { }
                                  }}
                                  onKeyDown={(e) => e.preventDefault()}
                                  className={`bg-white border rounded-full px-3 py-1.5 text-xs font-mono text-slate-700 focus:outline-none focus:border-[#01390f] cursor-pointer shadow-2xs transition-all ${!item.expiryDate ? 'border-amber-300 ring-1 ring-amber-300/60 bg-amber-50/20' : 'border-slate-200'
                                    }`}
                                />
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleNoExpiry(index)}
                                title={item.expiryDate === 'N/A' ? 'Click to select a date instead' : 'Set as N/A (Non-expiring)'}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.98] cursor-pointer text-center whitespace-nowrap border ${item.expiryDate === 'N/A'
                                  ? 'bg-[#01390f] hover:bg-[#0a5219] text-white border-[#01390f]'
                                  : 'bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] border-[#d5ead7]'
                                  }`}
                              >
                                {item.expiryDate === 'N/A' ? '✓ N/A' : 'N/A'}
                              </button>
                            </div>
                            {!item.expiryDate && (
                              <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                                Date or N/A required
                              </span>
                            )}
                          </td>

                          {/* 9. ACTION (STICKY RIGHT) */}
                          <td className="py-3 px-4 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[80px]">
                            <button
                              type="button"
                              onClick={() => handleRemoveSelectedItem(index)}
                              title="Delete Item from Manifest"
                              className="w-8 h-8 rounded-full bg-white border border-rose-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 inline-flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {selectedItems.length === 0 && (
                      <tr>
                        <td colSpan="9" className="text-center py-10 text-slate-400 font-medium italic whitespace-nowrap">
                          No raw materials added yet. Search and select items above to build the manifest.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {hasOverstockItems && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 flex flex-col gap-1 text-xs">
                <span className="font-bold text-amber-900">Overstock Warning Notice:</span>
                <span>
                  One or more raw materials will exceed their configured Overstock Buffer Limit after this shipment is received.
                </span>
              </div>
            )}

            {/* ACTION BUTTONS FOOTER */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setViewMode('logs')}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span className="whitespace-nowrap">
                  {submitting ? 'Confirming...' : 'Confirm'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* VIEW 2: DELIVERY RECEIPTS MASTERLIST TABLE */}
        {viewMode === 'logs' && (
          <div className="flex flex-col gap-6">
            {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN WHITE BACKGROUND - 1 ROW NO WRAPPING) */}
            <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">

              {/* GROUP 1: ACTIONS (Reset Filters) */}
              <div className="w-[140px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
                <div className="flex items-center flex-1 py-1">
                  {/* Reset Filters */}
                  <button
                    type="button"
                    onClick={handleClearLogFilters}
                    disabled={activeLogFiltersCount === 0}
                    className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white transition-colors text-xs font-semibold cursor-pointer w-full disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                    title={activeLogFiltersCount > 0 ? `Reset active filters (${activeLogFiltersCount})` : 'No active filters'}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">
                      Reset Filters {activeLogFiltersCount > 0 ? `(${activeLogFiltersCount})` : ''}
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
                      placeholder="Search DR Number, Supplier Brand, Location, Prepared By..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                      title="Search DR Number, Supplier, Origin..."
                    />
                    {logSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setLogSearchQuery('')}
                        className="absolute right-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear search"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Layer 2: Filter Dropdowns (Equal 3 Columns) */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {/* Supplier Filter */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Truck className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={logSupplierFilter}
                        onChange={(e) => setLogSupplierFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Supplier Brand"
                      >
                        <option value="All">All Suppliers ({uniqueLogSuppliers.length})</option>
                        {uniqueLogSuppliers.map((sup, idx) => (
                          <option key={idx} value={sup}>{sup}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date Received Filter */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Calendar className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={logDateFilter}
                        onChange={(e) => setLogDateFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Date Received"
                      >
                        <option value="All">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>

                    {/* Sort Order Dropdown */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={logSortBy}
                        onChange={(e) => setLogSortBy(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Sort Delivery Receipts"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="dr_asc">DR No. (A-Z)</option>
                        <option value="items_desc">Most Items</option>
                      </select>
                    </div>
                  </div>

                  {/* Layer 3: Quick Filter Toggles (Equal 3 Columns) */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => setLogQuickFilter('all')}
                      className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center transition-colors cursor-pointer truncate ${logQuickFilter === 'all'
                        ? 'bg-[#01390f] text-white border-[#01390f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      All Receipts ({inboundLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogQuickFilter('today')}
                      className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center transition-colors cursor-pointer truncate ${logQuickFilter === 'today'
                        ? 'bg-[#01390f] text-white border-[#01390f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      Today&apos;s Receipts
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogQuickFilter('multi')}
                      className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center transition-colors cursor-pointer truncate ${logQuickFilter === 'multi'
                        ? 'bg-[#01390f] text-white border-[#01390f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      Multi-Item Only
                    </button>
                  </div>
                </div>

                {/* Group Caption */}
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                  Search & Filters
                </div>
              </div>
            </div>
            {/* LOGS TABLE MASTERLIST */}
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
              {/* TABLE PAGINATION */}
              <TablePagination
                currentPage={logPage}
                totalItems={filteredInboundLogs.length}
                itemsPerPage={logPerPage}
                onPageChange={setLogPage}
                onRowsPerPageChange={(rows) => {
                  setLogPerPage(rows);
                  setLogPage(1);
                }}
              />
              <div className="overflow-x-auto relative custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      {/* DR NUMBER */}
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[160px] font-semibold text-white">
                        DR NUMBER
                      </th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">SUPPLIER BRAND</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">DATE RECEIVED</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">TOTAL MATERIALS</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">ORIGIN LOCATION</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">PREPARED BY</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STATUS</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-36 min-w-[130px] font-semibold text-white">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedInboundLogs.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                      >
                        {/* DR NUMBER */}
                        <td className="py-3.5 px-4 whitespace-nowrap min-w-[160px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="font-mono font-semibold text-slate-600 text-xs sm:text-sm">
                            {log.batchPoNo || 'DR-LOG'}
                          </span>
                        </td>

                        {/* SUPPLIER BRAND */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {log.supplierBrand}
                        </td>

                        {/* DATE RECEIVED */}
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {new Date(log.dateReceived).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>

                        {/* TOTAL MATERIALS */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="font-mono font-bold text-slate-800 text-xs">
                            {log.items?.length || 0} items
                          </span>
                        </td>

                        {/* ORIGIN LOCATION */}
                        <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {log.originLocation || 'Main Warehouse'}
                        </td>

                        {/* PREPARED BY */}
                        <td className="py-3.5 px-4 text-slate-600 text-xs whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {log.preparedBy || 'Inventory Staff'}
                        </td>

                        {/* STATUS */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Received</span>
                          </span>
                        </td>

                        {/* ACTIONS (STICKY RIGHT) */}
                        <td className="py-3.5 px-4 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-36 min-w-[130px]">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedLog(log)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadInboundPdf(log)}
                              className="w-8 h-8 rounded-full bg-white border border-emerald-200 text-[#01390f] hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Download PDF Slip"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredInboundLogs.length === 0 && (
                      <tr>
                        <td colSpan="8" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                          No inbound shipment delivery receipts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* DETAIL MODAL FOR LOG BATCH */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800 whitespace-nowrap">
                  Delivery Receipt Details ({selectedLog.batchPoNo || 'DR'})
                </h3>
                <p className="text-xs text-slate-400">
                  Received on {new Date(selectedLog.dateReceived).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm">
              {/* SHIPMENT OVERVIEW CARD */}
              <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Supplier / Brand</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedLog.supplierBrand}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs text-[#01390f] bg-slate-50 border border-[#01390f] px-2.5 py-1 rounded-lg w-fit">
                    DR #{selectedLog.batchPoNo || 'N/A'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Date Received</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm font-mono">
                      {new Date(selectedLog.dateReceived).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Origin Location</span>
                    <span className="font-bold text-slate-800 text-xs sm:text-sm truncate block">
                      {selectedLog.originLocation || 'Main Warehouse'}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Received</span>
                    <span className="font-bold text-[#01390f] text-xs sm:text-sm font-mono">
                      {selectedLog.items?.length || 0} Materials
                    </span>
                  </div>
                </div>
              </div>

              {/* RECEIVED MATERIALS BREAKDOWN */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-xs text-slate-700 uppercase">
                  Received Materials List
                </span>
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {selectedLog.items?.map((item, idx) => {
                    const isHeld = item.receivingStatus === 'Hold / Supplier Return' || item.receivingStatus === 'Rejected';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 hover:bg-slate-50/60 gap-2 whitespace-nowrap ${isHeld ? 'bg-amber-400/15 border-l-4 border-amber-400' : 'bg-white'
                          }`}
                      >
                        <div className="inline-flex items-center gap-2 text-xs bg-slate-50 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
                          <span className="font-mono text-[10px] text-slate-500 font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {item.code}
                          </span>
                          <span className="font-bold text-slate-900 whitespace-nowrap">
                            {item.itemName || item.itemDescription || item.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap whitespace-nowrap">

                          {isHeld ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-bold text-amber-950 text-xs bg-amber-400/20 border border-amber-400 px-2 py-0.5 rounded-lg whitespace-nowrap flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-amber-950" />
                                0 Added (+{item.quantityReceived ?? item.actualQuantity ?? 0} {item.uom} HELD)
                              </span>
                              <span className="text-[10px] font-bold text-amber-950 bg-amber-400/30 border border-amber-400 px-1.5 py-0.5 rounded whitespace-nowrap">
                                {item.supplierReturnTicketNo || 'Supplier Return'}
                              </span>
                              {item.returnReason && (
                                <span className="text-[10px] text-slate-500 italic max-w-[150px] truncate" title={item.returnReason}>
                                  ({item.returnReason})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-[#01390f] text-xs bg-slate-50 border border-[#01390f] px-2 py-0.5 rounded-lg whitespace-nowrap">
                              +{item.quantityReceived ?? item.actualQuantity ?? item.expectedQuantity ?? 0} {item.uom}
                            </span>
                          )}

                          {(item.expiryDate || item.expirationDate) && (
                            <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                              Exp: {item.expiryDate || item.expirationDate}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Close Details
              </button>
              <button
                type="button"
                onClick={() => handleDownloadInboundPdf(selectedLog)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-rose-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <FileDown className="w-4 h-4 text-rose-600" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                Confirm Inbound Receiving
              </h3>
              <button
                onClick={() => setIsConfirmOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              {/* SCROLLABLE BODY */}
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="bg-[#01390f]/5 border border-[#01390f]/20 rounded-2xl p-4 flex flex-col gap-2">
                  <span className="font-bold text-xs text-slate-500 uppercase">Shipment Details</span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-500 block">Delivery Receipt No:</span>
                      <span className="font-mono font-bold text-[#01390f]">{batchPoNo}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Supplier:</span>
                      <span className="font-bold text-slate-900">{supplierBrand}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Date Received:</span>
                      <span className="font-bold text-slate-900">{new Date(dateReceived).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Origin Location:</span>
                      <span className="font-bold text-slate-900">{originLocation || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-bold text-xs text-slate-600 uppercase">Items to Receive</span>
                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                    {selectedItems.map((item, index) => {
                      const rules = getResolvedThreshold(item);
                      const limit = Number(rules?.overstockLimitPoint ?? 200);
                      const current = Number(item.currentStock || 0);
                      const received = Number(item.quantityReceived || 1);
                      const projected = current + received;
                      const isOver = projected > limit;

                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-slate-50/50">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-800 text-xs sm:text-sm">{item.itemName || item.itemDescription || item.description}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded w-fit">
                                {item.code}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-[#01390f] text-sm font-mono">
                                +{received} {item.uom || 'pcs'}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold ${isOver ? 'text-red-600' : 'text-slate-500'
                                  }`}
                              >
                                Projected: {projected}/{limit}
                              </span>
                            </div>
                            {item.expiryDate && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.expiryDate === 'N/A'
                                ? 'text-slate-600 bg-slate-100 border-slate-200'
                                : 'text-red-600 bg-red-50 border-red-200'
                                }`}>
                                Exp: {item.expiryDate}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {hasOverstockItems && (
                  <div className="p-3 bg-amber-400/15 border border-amber-400/60 text-amber-950 rounded-xl text-xs">
                    <strong>Notice:</strong> One or more items will exceed their configured Overstock Limit. Confirming will still record the shipment and update stock ledger accordingly.
                  </div>
                )}

                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  Note: Confirming this action will update the warehouse quantities of these raw materials immediately. Please double check all quantities and descriptions.
                </p>
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmitInboundConfirm}
                  disabled={submitting}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span className="whitespace-nowrap">{submitting ? 'Confirming...' : 'Confirm Inbound'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryDeliveryReceiving;