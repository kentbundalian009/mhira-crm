import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Filter,
  Search,
  Plus,
  Edit2,
  Edit3,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  Archive,
  RotateCcw,
  Info,
  Package,
  SlidersHorizontal,
  Check,
  Boxes,
  Tag,
  FileText,
  Activity,
  Sparkles,
  EyeOff,
  FileSpreadsheet,
  ArrowUpDown,
  Clock,
  Eye,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios, { API, API_BASE_URL } from '../axios';
import { useLiveSync, notifyLiveSync } from '../utils/liveSync';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import MasterCategoryUomModal, {
  getStoredCategories,
  getStoredUOMs,
  getStoredThresholds,
} from './common/MasterCategoryUomModal';
import TablePagination from './common/TablePagination';
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

// Helper to create a transparent watermark image with subtle opacity for background
const loadWatermarkImage = (url, opacity = 0.095) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 600;
          canvas.height = img.naturalHeight || img.height || 600;
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

const DEFAULT_GLOBAL_THRESHOLDS = {
  criticalLevel: 1000,
  restockWarningPoint: 5000,
  overstockLimitPoint: 200000,
};

const DEFAULT_UOM_THRESHOLDS = {
  pcs: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 200 },
  kg: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  g: { criticalLevel: 0, restockWarningPoint: 30, overstockLimitPoint: 9999999 },
  l: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 100 },
  lt: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 100 },
  ml: { criticalLevel: 0, restockWarningPoint: 500, overstockLimitPoint: 5000 },
  drum: { criticalLevel: 0, restockWarningPoint: 2, overstockLimitPoint: 20 },
  box: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  bag: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 50 },
  roll: { criticalLevel: 0, restockWarningPoint: 3, overstockLimitPoint: 30 },
  meter: { criticalLevel: 0, restockWarningPoint: 20, overstockLimitPoint: 200 },
};

function InventoryRawMaterials() {
  const [rawMaterials, setRawMaterials] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_raw_materials');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [isCategoryUomModalOpen, setIsCategoryUomModalOpen] = useState(false);
  const [categoryUomInitialTab, setCategoryUomInitialTab] = useState('categories');
  const [categoriesVersion, setCategoriesVersion] = useState(0);
  const [defaultThresholds, setDefaultThresholds] = useState(() => getStoredThresholds('raw_materials'));

  // Sync when custom categories, UOMs, or thresholds are modified anywhere in the app
  useEffect(() => {
    const handleCategoryUomUpdated = () => {
      setCategoriesVersion((v) => v + 1);
      setDefaultThresholds(getStoredThresholds('raw_materials'));
    };
    window.addEventListener('inventory_categories_uom_updated', handleCategoryUomUpdated);
    window.addEventListener('storage', handleCategoryUomUpdated);
    return () => {
      window.removeEventListener('inventory_categories_uom_updated', handleCategoryUomUpdated);
      window.removeEventListener('storage', handleCategoryUomUpdated);
    };
  }, []);

  // Filter States (Only Search, Category, Item Name, Condition)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedItemName, setSelectedItemName] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [showZeroOnly, setShowZeroOnly] = useState(false);
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name_asc' | 'name_desc' | 'qty_desc' | 'qty_asc' | 'code_asc'
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Expiry RM Filter Mode states
  const [showExpiryOnly, setShowExpiryOnly] = useState(false);
  const [expiryItems, setExpiryItems] = useState([]);
  const [loadingExpiry, setLoadingExpiry] = useState(false);
  const [selectedExpiryDetail, setSelectedExpiryDetail] = useState(null);

  // Fetch Expiry items from backend
  const fetchExpiryItems = useCallback(async () => {
    try {
      setLoadingExpiry(true);
      const token = localStorage.getItem('token');
      const response = await API.get('/api/inventory-expiry', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.items || []);

      if (Array.isArray(raw)) {
        setExpiryItems(raw);
      }
    } catch (err) {
      console.error('Error fetching raw materials expiry records:', err);
    } finally {
      setLoadingExpiry(false);
    }
  }, []);

  useEffect(() => {
    if (showExpiryOnly) {
      fetchExpiryItems();
    }
  }, [showExpiryOnly, fetchExpiryItems]);


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

  // UOM Modal Form Inputs
  const [newUomName, setNewUomName] = useState('');
  const [newUomCritical, setNewUomCritical] = useState('0');
  const [newUomRestock, setNewUomRestock] = useState('10');
  const [newUomOverstock, setNewUomOverstock] = useState('200');

  // Specific Item Modal Form Inputs
  const [selectedSpecificMaterialId, setSelectedSpecificMaterialId] = useState('');
  const [specificLimitInput, setSpecificLimitInput] = useState('');

  // Add / Edit Modal States
  const initialFormState = {
    code: '',
    category: '',
    itemName: '',
    itemDescription: '-',
    specification: '',
    uom: 'g',
    criticalLevel: defaultThresholds.criticalLevel ?? 1000,
    restockWarningPoint: defaultThresholds.restockWarningPoint ?? 5000,
    overstockLimitPoint: defaultThresholds.overstockLimitPoint ?? 200000,
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  // Helper: Find effective threshold for an item directly from its specific attributes or dynamic defaults
  const getResolvedThreshold = useCallback((item) => {
    return {
      criticalLevel: Number(item?.criticalLevel !== undefined && item?.criticalLevel !== '' ? item.criticalLevel : (defaultThresholds.criticalLevel ?? 1000)),
      restockWarningPoint: Number(item?.restockWarningPoint !== undefined && item?.restockWarningPoint !== '' ? item.restockWarningPoint : (defaultThresholds.restockWarningPoint ?? 5000)),
      overstockLimitPoint: Number(item?.overstockLimitPoint !== undefined && item?.overstockLimitPoint !== '' ? item.overstockLimitPoint : (defaultThresholds.overstockLimitPoint ?? 200000)),
    };
  }, [defaultThresholds]);

  // Helper: Calculate stock condition status
  const getStockCondition = useCallback((qty, itemOrThreshold) => {
    const resolvedThreshold =
      itemOrThreshold && itemOrThreshold.criticalLevel !== undefined && itemOrThreshold.restockWarningPoint !== undefined && itemOrThreshold.overstockLimitPoint !== undefined
        ? itemOrThreshold
        : getResolvedThreshold(itemOrThreshold);
    const val = Number(qty) || 0;
    const critical = Number(resolvedThreshold?.criticalLevel ?? 1000);
    const restock = Number(resolvedThreshold?.restockWarningPoint ?? 5000);
    const overstock = Number(resolvedThreshold?.overstockLimitPoint ?? 200000);

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
  }, [getResolvedThreshold]);

  // Auto-generate code starting from RM0001
  const generateNextCode = (list) => {
    let maxNum = 0;
    if (Array.isArray(list)) {
      list.forEach((item) => {
        const codeStr = item.code || item.itemCode || '';
        const match = codeStr.match(/^(?:RM-INV-|RM)(\d+)/i);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
    }
    const nextNum = maxNum + 1;
    return `RM${String(nextNum).padStart(4, '0')}`;
  };

  // Fetch raw materials
  const fetchRawMaterials = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await API.get('/api/inventory-raw-materials', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.rawMaterials || response.data?.items || []);

      if (Array.isArray(raw) && raw.length > 0) {
        setRawMaterials(raw);
        try {
          localStorage.setItem('cached_inventory_raw_materials', JSON.stringify(raw));
        } catch (e) { }
      }
    } catch (error) {
      console.error('Error loading raw materials:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRawMaterials();

    // Pre-fetch cloud database categories & UOM
    API.get('/api/inventory-category-uom/raw_materials')
      .then((res) => {
        if (res.data?.success) {
          localStorage.setItem('inventory_rm_custom_categories', JSON.stringify(res.data.categories || []));
          localStorage.setItem('inventory_rm_custom_uoms', JSON.stringify(res.data.uoms || []));
          if (res.data.defaultThresholds) {
            localStorage.setItem('inventory_rm_custom_thresholds', JSON.stringify(res.data.defaultThresholds));
            setDefaultThresholds(res.data.defaultThresholds);
          }
          setCategoriesVersion((v) => v + 1);
        }
      })
      .catch(() => { });
  }, [fetchRawMaterials]);

  // Real-time automatic background synchronization without refresh
  useLiveSync(['rawMaterials', 'inventory'], () => {
    fetchRawMaterials();
  });

  // Stored master categories for Add/Edit Raw Material modal (strictly active configured categories)
  const modalCategories = useMemo(() => {
    const cats = getStoredCategories([], 'raw_materials');
    return Array.from(new Set(cats.map((c) => String(c).trim()))).filter(Boolean).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [categoriesVersion]);

  // Categories strictly from existing Raw Materials (only existing in data)
  const filterCategories = useMemo(() => {
    const currentMaterials = rawMaterials.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    const cats = Array.from(
      new Set(
        currentMaterials
          .map((item) => item.category)
          .filter((v) => v && String(v).trim() !== '')
          .map((c) => String(c).trim())
      )
    );
    return cats.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [rawMaterials, viewMode]);

  // Item Names strictly from existing Raw Materials (contextual to selected category)
  const filterItemNames = useMemo(() => {
    let currentMaterials = rawMaterials.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    if (selectedCategory !== 'All') {
      currentMaterials = currentMaterials.filter((item) => (item.category || '') === selectedCategory);
    }
    const names = Array.from(
      new Set(
        currentMaterials
          .map((item) => item.itemName)
          .filter((v) => v && String(v).trim() !== '')
          .map((n) => String(n).trim())
      )
    );
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  }, [rawMaterials, viewMode, selectedCategory]);

  const existingItemNames = useMemo(() => {
    const names = Array.from(
      new Set(rawMaterials.map((item) => item.itemName).filter((v) => v && v.trim() !== ''))
    );
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  }, [rawMaterials]);

  // Conditions strictly from existing Raw Materials
  const filterConditions = useMemo(() => {
    let currentMaterials = rawMaterials.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    if (selectedCategory !== 'All') {
      currentMaterials = currentMaterials.filter((item) => (item.category || '') === selectedCategory);
    }
    if (selectedItemName !== 'All') {
      currentMaterials = currentMaterials.filter((item) => (item.itemName || '') === selectedItemName);
    }
    const set = new Set();
    currentMaterials.forEach((item) => {
      const qty = Number(item.quantity ?? item.qty ?? 0);
      const condition = getStockCondition(qty, item);
      if (condition?.key) {
        set.add(condition.key);
      }
    });
    return set;
  }, [rawMaterials, viewMode, selectedCategory, selectedItemName, getStockCondition]);

  // Live item counts per stock condition status
  const conditionCounts = useMemo(() => {
    let currentMaterials = rawMaterials.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    if (selectedCategory !== 'All') {
      currentMaterials = currentMaterials.filter((item) => (item.category || '') === selectedCategory);
    }
    if (selectedItemName !== 'All') {
      currentMaterials = currentMaterials.filter((item) => (item.itemName || '') === selectedItemName);
    }
    const counts = { 'Critical Alert': 0, 'Restock Warning': 0, Healthy: 0, Overstock: 0 };
    currentMaterials.forEach((item) => {
      const qty = Number(item.quantity ?? item.qty ?? 0);
      const condition = getStockCondition(qty, item);
      if (condition?.key === 'Critical Alert' || condition?.key === 'Critical') {
        counts['Critical Alert']++;
      } else if (condition?.key === 'Restock Warning') {
        counts['Restock Warning']++;
      } else if (condition?.key === 'Healthy' || condition?.key === 'Safe Zone') {
        counts.Healthy++;
      } else if (condition?.key === 'Overstock') {
        counts.Overstock++;
      }
    });
    // Backwards-compatibility aliases
    counts.Critical = counts['Critical Alert'];
    counts['Safe Zone'] = counts.Healthy;
    return counts;
  }, [rawMaterials, viewMode, selectedCategory, selectedItemName, getStockCondition]);

  // Auto-reset filters if selected option no longer exists in current data
  useEffect(() => {
    if (selectedCategory !== 'All' && !filterCategories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [filterCategories, selectedCategory]);

  useEffect(() => {
    if (selectedItemName !== 'All' && !filterItemNames.includes(selectedItemName)) {
      setSelectedItemName('All');
    }
  }, [filterItemNames, selectedItemName]);

  const existingItemDescriptions = useMemo(() => {
    const descriptions = Array.from(
      new Set(
        rawMaterials
          .map((item) => item.itemDescription || item.description)
          .filter((v) => v && v.trim() !== '')
      )
    );
    return descriptions.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
  }, [rawMaterials]);

  const existingUOMs = useMemo(() => {
    const units = getStoredUOMs([], 'raw_materials');
    return Array.from(new Set(units.map((u) => String(u).trim()))).filter(Boolean).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [categoriesVersion]);

  const existingManufacturers = useMemo(() => {
    return Array.from(
      new Set(rawMaterials.map((item) => item.manufacturer || item.brand).filter((v) => v && v.trim() !== ''))
    );
  }, [rawMaterials]);

  // Counts for active vs archived
  const activeCount = useMemo(() => {
    return rawMaterials.filter((item) => !item.isArchived).length;
  }, [rawMaterials]);

  const archivedCount = useMemo(() => {
    return rawMaterials.filter((item) => item.isArchived).length;
  }, [rawMaterials]);

  const totalStockUnits = useMemo(() => {
    const list = rawMaterials.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    return list.reduce((sum, item) => sum + (Number(item.quantity ?? item.qty ?? 0) || 0), 0);
  }, [rawMaterials, viewMode]);

  // Filtered dataset
  const filteredMaterials = useMemo(() => {
    let list = rawMaterials.filter((item) => {
      // 1. Vault check
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;

      // 2. Hide 0 quantity & 0 Qty Only
      const qty = Number(item.quantity ?? item.qty ?? 0);
      if (showZeroOnly && qty !== 0) return false;
      if (hideZeroQty && qty === 0) return false;

      // 4. Search query
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const code = (item.code || item.itemCode || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const name = (item.itemName || '').toLowerCase();
        const desc = (item.itemDescription || item.description || '').toLowerCase();

        const match =
          code.includes(query) ||
          cat.includes(query) ||
          name.includes(query) ||
          desc.includes(query);
        if (!match) return false;
      }

      // 5. Category filter
      if (selectedCategory !== 'All') {
        if ((item.category || '') !== selectedCategory) return false;
      }

      // 6. Item Name filter
      if (selectedItemName !== 'All') {
        if ((item.itemName || '') !== selectedItemName) return false;
      }

      // 7. Stock Condition filter
      if (selectedCondition !== 'All') {
        const condition = getStockCondition(qty, item);
        const matchesCondition =
          condition.key === selectedCondition ||
          (selectedCondition === 'Critical Alert' && (condition.key === 'Critical' || condition.key === 'Critical Alert')) ||
          (selectedCondition === 'Healthy' && (condition.key === 'Safe Zone' || condition.key === 'Healthy')) ||
          (selectedCondition === 'Overstock' && condition.key === 'Overstock') ||
          (selectedCondition === 'Restock Warning' && condition.key === 'Restock Warning');
        if (!matchesCondition) return false;
      }

      return true;
    });

    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.itemName || '').localeCompare(b.itemName || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => (b.itemName || '').localeCompare(a.itemName || '', undefined, { numeric: true, sensitivity: 'base' }));
    } else if (sortBy === 'qty_desc') {
      list.sort((a, b) => Number(b.quantity ?? b.qty ?? 0) - Number(a.quantity ?? a.qty ?? 0));
    } else if (sortBy === 'qty_asc') {
      list.sort((a, b) => Number(a.quantity ?? a.qty ?? 0) - Number(b.quantity ?? b.qty ?? 0));
    } else if (sortBy === 'code_asc') {
      list.sort((a, b) => (a.code || a.itemCode || '').localeCompare(b.code || b.itemCode || '', undefined, { numeric: true, sensitivity: 'base' }));
    }

    return list;
  }, [
    rawMaterials,
    viewMode,
    hideZeroQty,
    showZeroOnly,
    searchQuery,
    selectedCategory,
    selectedItemName,
    selectedCondition,
    sortBy,
    getStockCondition,
  ]);

  // Reset pagination on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    viewMode,
    hideZeroQty,
    showZeroOnly,
    selectedCategory,
    selectedItemName,
    selectedCondition,
  ]);

  // Paginated Slices
  const paginatedMaterials = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMaterials.slice(start, start + itemsPerPage);
  }, [filteredMaterials, currentPage, itemsPerPage]);

  // Raw Material Expiry distinction helper
  const isRawMaterialExpiry = useCallback((item) => {
    if (item.source === 'Inbound Receiving') return true;
    if (item.source === 'WIP Production') return false;
    const code = (item.code || '').toUpperCase();
    if (code.startsWith('RM')) return true;
    if (code.startsWith('FG')) return false;
    const cat = (item.category || '').toLowerCase();
    if (cat.includes('raw')) return true;
    if (cat.includes('finish')) return false;
    return true;
  }, []);

  // Filtered Expiry Raw Materials dataset
  const filteredExpiryMaterials = useMemo(() => {
    return expiryItems.filter((item) => {
      if (item.isArchived || item.status === 'Disposed') return false;
      if (!isRawMaterialExpiry(item)) return false;

      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.code || '').toLowerCase();
        const batch = (item.batchNo || '').toLowerCase();
        const desc = (item.itemDescription || item.itemName || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        if (!code.includes(q) && !batch.includes(q) && !desc.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      if (selectedCategory !== 'All') {
        if ((item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [expiryItems, isRawMaterialExpiry, searchQuery, selectedCategory]);

  const paginatedExpiryMaterials = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpiryMaterials.slice(start, start + itemsPerPage);
  }, [filteredExpiryMaterials, currentPage, itemsPerPage]);

  // Sync threshold rules from localStorage when window gains focus or storage changes
  useEffect(() => {
    const syncThresholds = () => {
      try {
        const savedG = localStorage.getItem('rawmat_threshold_rules');
        if (savedG) setGlobalThresholds(JSON.parse(savedG));
        const savedU = localStorage.getItem('rawmat_uom_thresholds');
        if (savedU) setUomThresholds(JSON.parse(savedU));
        const savedS = localStorage.getItem('rawmat_item_specific_limits');
        if (savedS) setItemSpecificLimits(JSON.parse(savedS));
      } catch (err) {
        console.error('Error syncing thresholds from localStorage:', err);
      }
    };
    window.addEventListener('storage', syncThresholds);
    window.addEventListener('focus', syncThresholds);
    return () => {
      window.removeEventListener('storage', syncThresholds);
      window.removeEventListener('focus', syncThresholds);
    };
  }, []);

  // Toggle Archive
  const handleToggleArchive = async (item) => {
    const isCurrentlyArchived = Boolean(item.isArchived);
    const actionLabel = isCurrentlyArchived
      ? 'restore this raw material to active inventory'
      : 'move this raw material to archive vault';
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const id = item._id || item.id;

      await axios.patch(`${API_BASE_URL}/api/inventory-raw-materials/${id}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showSuccessToast(
        isCurrentlyArchived ? 'Material restored to active inventory!' : 'Material moved to archive vault!'
      );
      notifyLiveSync('rawMaterials');
      fetchRawMaterials();
    } catch (error) {
      console.error('Error toggling archive status:', error);
      showErrorToast(error.response?.data?.message || 'Failed to update archive status.');
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedId(null);
    const autoCode = generateNextCode(rawMaterials);
    setFormData({
      ...initialFormState,
      code: autoCode,
      category: modalCategories[0] || '',
      itemName: '',
      itemDescription: '-',
      specification: '',
      uom: existingUOMs[0] || 'g',
      criticalLevel: defaultThresholds.criticalLevel ?? 1000,
      restockWarningPoint: defaultThresholds.restockWarningPoint ?? 5000,
      overstockLimitPoint: defaultThresholds.overstockLimitPoint ?? 200000,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setIsEditing(true);
    setSelectedId(item._id || item.id);
    const itemCat = (item.category || '').trim();
    const matchedCategory = modalCategories.find(
      (c) => c.toLowerCase() === itemCat.toLowerCase()
    );
    const itemUom = (item.uom || item.unit || '').trim();
    const matchedUom = existingUOMs.find(
      (u) => u.toLowerCase() === itemUom.toLowerCase()
    );

    setFormData({
      code: item.code || item.itemCode || '',
      category: matchedCategory || '',
      itemName: item.itemName || '',
      itemDescription: item.itemDescription || item.description || '',
      specification: item.specification || '',
      uom: matchedUom || existingUOMs[0] || 'g',
      criticalLevel: item.criticalLevel !== undefined ? Number(item.criticalLevel) : (defaultThresholds.criticalLevel ?? 1000),
      restockWarningPoint: item.restockWarningPoint !== undefined ? Number(item.restockWarningPoint) : (defaultThresholds.restockWarningPoint ?? 5000),
      overstockLimitPoint: item.overstockLimitPoint !== undefined ? Number(item.overstockLimitPoint) : (defaultThresholds.overstockLimitPoint ?? 200000),
    });

    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'specification') {
      const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
      setFormData((prev) => ({ ...prev, [name]: sanitized }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const payload = {
        code: formData.code,
        category: formData.category,
        itemName: formData.itemName,
        itemDescription: formData.itemDescription,
        specification: formData.specification || '',
        uom: formData.uom,
        criticalLevel: formData.criticalLevel !== undefined && formData.criticalLevel !== '' ? Number(formData.criticalLevel) : (defaultThresholds.criticalLevel ?? 1000),
        restockWarningPoint: formData.restockWarningPoint !== undefined && formData.restockWarningPoint !== '' ? Number(formData.restockWarningPoint) : (defaultThresholds.restockWarningPoint ?? 5000),
        overstockLimitPoint: formData.overstockLimitPoint !== undefined && formData.overstockLimitPoint !== '' ? Number(formData.overstockLimitPoint) : (defaultThresholds.overstockLimitPoint ?? 200000),
      };

      if (isEditing && selectedId) {
        await axios.put(`${API_BASE_URL}/api/inventory-raw-materials/${selectedId}`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        showSuccessToast('Raw Material updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/api/inventory-raw-materials`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        showSuccessToast('Raw Material created successfully!');
      }

      setIsModalOpen(false);
      notifyLiveSync('rawMaterials');
      fetchRawMaterials();
    } catch (error) {
      console.error('Error saving raw material:', error);
      showErrorToast(error.response?.data?.message || 'Failed to save raw material details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this raw material?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/inventory-raw-materials/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showSuccessToast('Raw Material deleted successfully!');
      notifyLiveSync('rawMaterials');
      fetchRawMaterials();
    } catch (error) {
      console.error('Failed to delete material:', error);
      showErrorToast('Error deleting raw material.');
    }
  };

  // Quick count for zero quantity items
  const zeroCount = useMemo(() => {
    return rawMaterials.filter((item) => {
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;
      return Number(item.quantity ?? item.qty ?? 0) === 0;
    }).length;
  }, [rawMaterials, viewMode]);

  const statusModules = useMemo(() => [
    { id: 'active', label: 'Raw Materials' },
    { id: 'archived', label: 'Archive Vault' },
  ], []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'All') count++;
    if (selectedItemName !== 'All') count++;
    if (selectedCondition !== 'All') count++;
    if (hideZeroQty) count++;
    if (showZeroOnly) count++;
    if (sortBy !== 'default') count++;
    if (viewMode !== 'active') count++;
    if (showExpiryOnly) count++;
    return count;
  }, [
    searchQuery,
    selectedCategory,
    selectedItemName,
    selectedCondition,
    hideZeroQty,
    showZeroOnly,
    sortBy,
    viewMode,
    showExpiryOnly,
  ]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedItemName('All');
    setSelectedCondition('All');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setShowExpiryOnly(false);
    setSortBy('default');
    setViewMode('active');
    setCurrentPage(1);
  };

  // EXCEL RIBBON ACTION: Export Raw Materials to PDF Report (Official Portrait Format)
  const handleExportPDF = async () => {
    if (filteredMaterials.length === 0) {
      showErrorToast('No raw materials available to export.');
      return;
    }
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    showSuccessToast('Preparing official raw materials PDF audit report...');

    try {
      const [logoBase64, watermarkBase64] = await Promise.all([
        loadBase64Image('/mhira_removebg.png'),
        loadWatermarkImage('/mhira_removebg.png', 0.095),
      ]);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const logoRatio = 835 / 673;

      const wmWidth = 90;
      const wmHeight = wmWidth / logoRatio;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;

      const docNo = `MN-INV-RM-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      // 1. Header Logo & Titles
      const headerLogoH = 15;
      const headerLogoW = headerLogoH * logoRatio;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 12, headerLogoW, headerLogoH, undefined, 'FAST');
        } catch (e) { }
      }

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
      doc.text('Security Classification: INTERNAL CONFIDENTIAL | Controlled Executive Copy', 36, 30);

      // Top-Right Metadata
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(21, 62, 151);
      doc.text('RAW MATERIALS INVENTORY AUDIT', pageWidth - 14, 16.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`DOC NO: ${docNo}`, pageWidth - 14, 21.5, { align: 'right' });
      doc.text(`VIEW: ${viewMode === 'archived' ? 'Archive Vault' : 'Active Raw Materials'}`, pageWidth - 14, 26, { align: 'right' });
      doc.text(`GENERATED: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });

      // Dividing Line
      doc.setDrawColor(21, 62, 151);
      doc.setLineWidth(0.4);
      doc.line(14, 33.5, pageWidth - 14, 33.5);

      // 2. Summary KPI Audit Table
      const totalItems = filteredMaterials.length;
      const totalStock = filteredMaterials.reduce((acc, r) => acc + (Number(r.quantity ?? r.qty ?? 0) || 0), 0);
      let healthy = 0;
      let restock = 0;
      let critical = 0;

      filteredMaterials.forEach((r) => {
        const resolved = getResolvedThreshold(r);
        const cond = getStockCondition(Number(r.quantity ?? r.qty ?? 0), resolved);
        if (cond.key === 'Healthy' || cond.key === 'Overstock') healthy++;
        else if (cond.key === 'Restock Warning') restock++;
        else critical++;
      });

      autoTable(doc, {
        startY: 36.5,
        margin: { left: 14, right: 14 },
        head: [['REGISTERED RAW MATERIALS', 'TOTAL MATERIAL QUANTITY', 'BUFFER HEALTH CONDITION', 'CRITICAL & REORDER ALERTS']],
        body: [[
          `${totalItems.toLocaleString()} Active Materials`,
          `${totalStock.toLocaleString()} Stored Units`,
          `${healthy} Safe Buffer (>10)`,
          `${critical} Critical Shortage | ${restock} Low`
        ]],
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
          fillColor: [239, 246, 255],
          textColor: [21, 62, 151],
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

      // 3. Main Data Table (Grouped by Category with Title Row & Condition-Colored Quantity)
      const getConditionColor = (condKey) => {
        if (condKey === 'Critical Alert') return { fillColor: [254, 226, 226], textColor: [185, 28, 28] };
        if (condKey === 'Restock Warning') return { fillColor: [254, 249, 195], textColor: [161, 98, 7] };
        if (condKey === 'Overstock') return { fillColor: [224, 242, 254], textColor: [29, 78, 216] };
        return { fillColor: [220, 252, 231], textColor: [22, 101, 52] };
      };

      const categoryMap = new Map();
      filteredMaterials.forEach((r) => {
        const cat = (r.category || 'Raw Materials').trim() || 'General';
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat).push(r);
      });
      const sortedCategoryNames = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b));

      const colHeaders = ['CODE', 'ITEM NAME', 'QUANTITY', 'UOM'];
      const columnStyles = {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 28 },
        1: { fontStyle: 'bold', halign: 'left', cellWidth: 86 },
        2: { fontStyle: 'bold', halign: 'center', cellWidth: 44 },
        3: { fontStyle: 'bold', halign: 'center', cellWidth: 24 },
      };

      let currentTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;

      if (sortedCategoryNames.length === 0) {
        autoTable(doc, {
          startY: currentTableStartY,
          margin: { left: 14, right: 14, top: 19, bottom: 12 },
          head: [colHeaders],
          body: [['-', 'No raw materials found for the selected criteria.', '-', '-']],
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 6.8, halign: 'center', valign: 'middle', overflow: 'ellipsize' },
          headStyles: { fillColor: [21, 62, 151], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, halign: 'center', overflow: 'ellipsize' },
        });
      } else {
        sortedCategoryNames.forEach((catName, catIdx) => {
          const catItems = categoryMap.get(catName);
          const catBody = catItems.map((r) => {
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

          if (catIdx > 0) {
            currentTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;
            if (currentTableStartY > pageHeight - 32) {
              doc.addPage();
              currentTableStartY = 19;
            }
          }

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
                    fontSize: 7.2,
                    halign: 'left',
                    valign: 'middle',
                    cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
                    lineColor: [203, 213, 225],
                    lineWidth: 0.15,
                    overflow: 'ellipsize',
                  },
                },
              ],
              colHeaders,
            ],
            body: catBody,
            theme: 'grid',
            styles: {
              font: 'helvetica',
              fontSize: 6.8,
              textColor: [51, 65, 85],
              cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
              lineColor: [226, 232, 240],
              lineWidth: 0.15,
              valign: 'middle',
              overflow: 'ellipsize',
            },
            headStyles: {
              fillColor: [21, 62, 151],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 7,
              halign: 'center',
              valign: 'middle',
              lineColor: [21, 62, 151],
              lineWidth: 0.2,
              overflow: 'ellipsize',
            },
            bodyStyles: {
              overflow: 'ellipsize',
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
              }
            },
          });
        });
      }

      // 4. Executive Sign-Off Section
      let finalY = (doc.lastAutoTable?.finalY || 140) + 8;
      const sigSectionH = 24;
      if (finalY + sigSectionH > pageHeight - 14) {
        doc.addPage();
        finalY = 22;
      }

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

      // 3. Subtext: Inventory Staff
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Inventory Staff', startX + (colWidth / 2), sigY + 14.8, { align: 'center' });

      // 5. Final Pass: Center Watermark Logo, Running Header & Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (watermarkBase64) {
          try {
            doc.addImage(watermarkBase64, 'PNG', wmX, wmY, wmWidth, wmHeight, undefined, 'FAST');
          } catch (e) { }
        }

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
          doc.text('MHIRA NATURAL BEAUTY PRODUCTS  |  RAW MATERIALS AUDIT', 14 + thumbW + 4, 11.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.2);
          doc.setTextColor(100, 116, 139);
          doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 14, 11.5, { align: 'right' });

          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.2);
          doc.line(14, 16, pageWidth - 14, 16);
        }

        const footerY = pageHeight - 7;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(14, footerY - 2.5, pageWidth - 14, footerY - 2.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.8);
        doc.setTextColor(100, 116, 139);
        doc.text('INTERNAL CONFIDENTIAL | CONTROLLED EXECUTIVE COPY', 14, footerY + 1.2);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, footerY + 1.2, { align: 'right' });
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `MHIRA_Raw_Materials_Report_${viewMode}_${dateStr}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported ${filteredMaterials.length} raw materials to official PDF!`);
    } catch (err) {
      console.error('PDF export error:', err);
      showErrorToast('Failed to generate PDF report.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 font-sans antialiased text-slate-700">
      {/* MAIN CONTAINER (MATCHES REFERENCE SYSTEM LAYOUT & SPACING) */}
      <div className="w-full bg-white border border-slate-100 text-slate-600 rounded-2xl p-3 sm:p-6 shadow-sm flex flex-col gap-4 sm:gap-6 transition-colors duration-200">

        {/* ======================================================== */}
        {/* COMPACT EXCEL RIBBON TOOLBAR (RESPONSIVE SEAMLESS DESIGN) */}
        {/* ======================================================== */}
        <div className="w-full bg-white flex flex-col">

          {/* TOP BAR: EXCEL SHEET TABS */}
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

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (RESPONSIVE: STACKS ON MOBILE, 1 ROW ON DESKTOP) */}
          <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">

            {/* GROUP 1: ACTIONS (Responsive: Full-width on mobile, fixed width on desktop) */}
            <div className={`w-full ${viewMode === 'archived' ? 'lg:w-[140px]' : 'lg:w-[256px]'} shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]`}>
              <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
                {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
                {viewMode !== 'archived' && (
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                    title="Add Raw Material"
                  >
                    <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                      Raw<br />Material
                    </span>
                  </button>
                )}

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                  {/* Layer 1: Categories & UOM */}
                  <button
                    type="button"
                    onClick={() => setIsCategoryUomModalOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Categories & UOM Management"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">Dropdown</span>
                  </button>

                  {/* Layer 3: Reset Filters */}
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

            {/* GROUP 2: SEARCH & FILTERS (Responsive Multi-Column Grid) */}
            <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">

                {/* Layer 1: Search Bar (Enhanced Height) */}
                <div className="relative flex items-center w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="search"
                    name="rawMaterialsSearchQuery"
                    id="rawMaterialsSearchQuery"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    placeholder="Search Code, Description, Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search Code, Description, Name..."
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

                {/* Layer 2: Filter Dropdowns (Responsive: 1 col on mobile, 3 cols on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {/* Category Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Tag className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter by Category"
                    >
                      <option value="All">All Categories ({filterCategories.length})</option>
                      {filterCategories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Item Name Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Package className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedItemName}
                      onChange={(e) => setSelectedItemName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter by Item Name"
                    >
                      <option value="All">All Item Names ({filterItemNames.length})</option>
                      {filterItemNames.map((name, idx) => (
                        <option key={idx} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Condition Dropdown (Always Available Options with Live Counts) */}
                  <div className="relative inline-flex items-center w-full min-w-0 sm:col-span-2 md:col-span-1">
                    <Activity className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedCondition}
                      onChange={(e) => setSelectedCondition(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter by Condition & Stock Threshold Limits"
                    >
                      <option value="All">All Conditions</option>
                      <option value="Critical Alert">🔴 Critical Alert</option>
                      <option value="Restock Warning">🟡 Restock Warning</option>
                      <option value="Healthy">🟢 Healthy</option>
                      <option value="Overstock">🔵 Overstock</option>
                    </select>
                  </div>
                </div>

                {/* Layer 3: Quick Filter Toggles & Sort (Responsive: 1 col on mobile, 3 cols on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {/* Hide 0 Qty */}
                  <button
                    type="button"
                    onClick={() => {
                      setHideZeroQty(!hideZeroQty);
                      if (!hideZeroQty) setShowZeroOnly(false);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[30px] sm:h-[22px] w-full shadow-2xs ${hideZeroQty
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
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors relative h-[30px] sm:h-[22px] w-full shadow-2xs ${showZeroOnly
                      ? 'bg-rose-50 text-rose-700 border border-rose-300'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    title={showZeroOnly ? `Showing: 0 Qty Only (${zeroCount})` : `Filter 0 Qty Only (${zeroCount} items)`}
                  >
                    <Boxes className="w-3.5 h-3.5 text-slate-500" />
                    <span>0 Qty Only {zeroCount > 0 ? `(${zeroCount})` : ''}</span>
                  </button>

                  {/* Sort Select */}
                  <div className="relative inline-flex items-center w-full min-w-0 sm:col-span-2 md:col-span-1">
                    <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
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
                Search & Filter
              </div>
            </div>

          </div>

        </div>

        {/* CLEAN SEPARATOR BEFORE TABLE (MOVED UP TO SAVE SPACE) */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* TABLE MASTERLIST */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={showExpiryOnly ? filteredExpiryMaterials.length : filteredMaterials.length}
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
                      <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-20 min-w-[80px] font-semibold text-white">ACTION</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CODE</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                      <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px] font-semibold text-white">ITEM NAME</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">QUANTITY & CONDITION</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">UOM</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {showExpiryOnly ? (
                  loadingExpiry ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Fetching raw materials expiry records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredExpiryMaterials.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Info className="w-6 h-6 text-slate-300" />
                          <span>No raw materials expiry records matched your search or filter criteria.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedExpiryMaterials.map((item, idx) => {
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
                          className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                        >
                          {/* 1. ITEM CODE */}
                          <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                              {item.code || 'N/A'}
                            </span>
                          </td>

                          {/* 2. BATCH / LOT NO */}
                          <td className="px-4 py-3.5 font-mono font-semibold text-xs text-slate-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {item.batchNo || 'N/A'}
                          </td>

                          {/* 3. CATEGORY (Pill Badge matching Target Audience) */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200">
                              {item.category || 'Raw Materials'}
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
                            {Number(item.quantity ?? 0).toLocaleString()} {item.uom || 'pcs'}
                          </td>

                          {/* 6. MFG DATE */}
                          <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {item.mfgDate ? new Date(item.mfgDate).toLocaleDateString() : 'N/A'}
                          </td>

                          {/* 7. EXPIRY DATE */}
                          <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {item.expiryDate &&
                              item.expiryDate !== 'N/A' &&
                              !isNaN(new Date(item.expiryDate).getTime())
                              ? new Date(item.expiryDate).toLocaleDateString()
                              : 'N/A'}
                          </td>

                          {/* 8. DAYS REMAINING / STATUS (Dot removed, purely clean tinted cell) */}
                          <td
                            className={`px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold transition-colors select-none ${item.status === 'Disposed'
                                ? 'bg-slate-200/60 group-hover:bg-slate-200/80 text-slate-700'
                                : isExpired || isCritical
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

                          {/* 9. ACTION (Sticky Right) */}
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
                  )
                ) : (
                  <>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Loading raw materials...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedMaterials.map((item) => {
                        const displayCode = item.code || item.itemCode || 'N/A';
                        const displayCat = item.category || 'Materials';
                        const displayName = item.itemName || 'N/A';
                        const displayQty = Number(item.quantity ?? item.qty ?? 0);
                        const displayUom = item.uom || item.unit || 'pcs';
                        const condition = getStockCondition(displayQty, item);
                        const resolvedRules = getResolvedThreshold(item);

                        return (
                          <tr
                            key={item._id || item.id}
                            className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                          >
                            {/* CODE */}
                            <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                                {displayCode}
                              </span>
                            </td>

                            {/* CATEGORY */}
                            <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-medium text-xs text-slate-600 transition-colors">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200">
                                {displayCat}
                              </span>
                            </td>

                            {/* ITEM NAME */}
                            <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-bold text-xs text-slate-800 transition-colors">
                              {displayName}
                            </td>

                            {/* QUANTITY & CONDITION (Blue cell tint para cohesive sa volume) */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 transition-colors">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {displayQty}{' '}
                                  <span className="text-[10px] text-slate-600 font-normal font-sans">
                                    / {resolvedRules.overstockLimitPoint} max
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
                              {displayUom}
                            </td>

                            {/* ACTION (STICKY RIGHT) */}
                            <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px] transition-colors">
                              <div className="flex items-center justify-center gap-1.5">
                                {viewMode !== 'archived' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(item)}
                                      title="Edit Item"
                                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleArchive(item)}
                                      title="Archive Item"
                                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleArchive(item)}
                                      title="Restore to Active"
                                      className="w-8 h-8 rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(item._id || item.id)}
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

                    {!loading && filteredMaterials.length === 0 && (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                        >
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Info className="w-6 h-6 text-slate-300" />
                            <span>
                              {viewMode === 'archived'
                                ? 'No archived raw materials found in the vault.'
                                : 'No raw materials matched your search or filter criteria.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL ADD / EDIT RAW MATERIAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER (NO ICON) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                {isEditing ? 'Edit Raw Material' : 'Add Raw Material'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              {/* SCROLLABLE BODY */}
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar">
                {/* SPECIFIC STOCK THRESHOLD RULES */}
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Stock Threshold & Reorder Limits
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Item-specific rules evaluated for condition badges & procurement warnings.
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold">
                      Healthy: {Math.max(0, (Number(formData.restockWarningPoint) || (defaultThresholds.restockWarningPoint ?? 5000)) + 1)} - {Number(formData.overstockLimitPoint) || (defaultThresholds.overstockLimitPoint ?? 200000)} {formData.uom ? formData.uom.toUpperCase() : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* CRITICAL */}
                    <div className="bg-white p-2.5 rounded-xl border border-rose-200/80">
                      <label className="block text-[11px] font-bold text-rose-700 mb-1">
                        Critical Alert (≤)
                      </label>
                      <input
                        type="number"
                        name="criticalLevel"
                        min="0"
                        value={formData.criticalLevel !== undefined ? formData.criticalLevel : (defaultThresholds.criticalLevel ?? 1000)}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-800 focus:outline-none focus:border-rose-500"
                        placeholder={String(defaultThresholds.criticalLevel ?? 1000)}
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Default: {defaultThresholds.criticalLevel ?? 1000} (Emergency)
                      </span>
                    </div>

                    {/* RESTOCK WARNING */}
                    <div className="bg-white p-2.5 rounded-xl border border-amber-200/80">
                      <label className="block text-[11px] font-bold text-amber-700 mb-1">
                        Restock Warning (≤)
                      </label>
                      <input
                        type="number"
                        name="restockWarningPoint"
                        min="0"
                        value={formData.restockWarningPoint !== undefined ? formData.restockWarningPoint : (defaultThresholds.restockWarningPoint ?? 5000)}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-800 focus:outline-none focus:border-amber-500"
                        placeholder={String(defaultThresholds.restockWarningPoint ?? 5000)}
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Default: {defaultThresholds.restockWarningPoint ?? 5000} (Reorder)
                      </span>
                    </div>

                    {/* OVERSTOCK */}
                    <div className="bg-white p-2.5 rounded-xl border border-blue-200/80">
                      <label className="block text-[11px] font-bold text-blue-700 mb-1">
                        Overstock (&gt;)
                      </label>
                      <input
                        type="number"
                        name="overstockLimitPoint"
                        min="1"
                        value={formData.overstockLimitPoint !== undefined ? formData.overstockLimitPoint : (defaultThresholds.overstockLimitPoint ?? 200000)}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-800 focus:outline-none focus:border-blue-500"
                        placeholder={String(defaultThresholds.overstockLimitPoint ?? 200000)}
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Default: {defaultThresholds.overstockLimitPoint ?? 200000} (Overstock Limit)
                      </span>
                    </div>
                  </div>
                </div>



                {/* 2-COLUMN GRID FOR CORE MATERIAL INFORMATION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* MATERIAL CODE */}
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      Material Code <span className="text-[10px] text-slate-500 font-bold">(Auto-generated)</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      readOnly
                      value={formData.code}
                      placeholder="RM0001"
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* CATEGORY */}
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">Category</label>
                    <div className="relative">
                      <select
                        name="category"
                        required
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] transition-all cursor-pointer shadow-2xs uppercase"
                      >
                        <option value="" disabled>Select Category</option>
                        {modalCategories.map((cat, idx) => (
                          <option key={idx} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ITEM NAME */}
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">Item Name</label>
                    <input
                      type="text"
                      name="itemName"
                      required
                      value={formData.itemName}
                      onChange={handleInputChange}
                      placeholder="Enter Item Name..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs"
                    />
                  </div>

                  {/* UNIT OF MEASUREMENT (UOM) */}
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">Unit of Measurement (UOM)</label>
                    <div className="relative">
                      <select
                        name="uom"
                        required
                        value={formData.uom}
                        onChange={handleInputChange}
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium focus:outline-none focus:border-[#01390f] transition-all cursor-pointer shadow-2xs uppercase"
                      >
                        <option value="" disabled>Select UOM</option>
                        {existingUOMs.map((unit, idx) => (
                          <option key={idx} value={unit}>
                            {unit.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span className="whitespace-nowrap">{submitting ? 'Saving...' : 'Save Raw Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORIES, UOM & STOCK THRESHOLDS MANAGEMENT MODAL */}
      <MasterCategoryUomModal
        isOpen={isCategoryUomModalOpen}
        onClose={() => setIsCategoryUomModalOpen(false)}
        moduleType="raw_materials"
        initialTab={categoryUomInitialTab}
        existingCategories={filterCategories}
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
                  {selectedExpiryDetail.itemDescription || selectedExpiryDetail.itemName || 'Raw Material'} • Batch: {selectedExpiryDetail.batchNo || 'N/A'}
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
                    <span className="font-bold text-slate-800 font-mono">{selectedExpiryDetail.code || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Stock Volume</span>
                    <span className="font-bold text-[#01390f] font-mono">
                      {Number(selectedExpiryDetail.quantity ?? selectedExpiryDetail.stockVolume ?? 0).toLocaleString()} {selectedExpiryDetail.uom || 'pcs'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Mfg / Received Date</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {selectedExpiryDetail.mfgDate ? new Date(selectedExpiryDetail.mfgDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Expiration Date</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {selectedExpiryDetail.expiryDate && selectedExpiryDetail.expiryDate !== 'N/A' && !isNaN(new Date(selectedExpiryDetail.expiryDate).getTime())
                        ? new Date(selectedExpiryDetail.expiryDate).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">Material Description</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      {selectedExpiryDetail.itemDescription || selectedExpiryDetail.itemName || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[11px]">Category</span>
                    <span className="font-bold text-slate-800 text-xs">
                      {selectedExpiryDetail.category || 'Raw Materials'}
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

export default InventoryRawMaterials;