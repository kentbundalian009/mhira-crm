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

const DEFAULT_GLOBAL_THRESHOLDS = {
  criticalLevel: 0,
  restockWarningPoint: 30,
  overstockLimitPoint: 9999999,
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

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


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

  // Modal Threshold Configuration States
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [thresholdTab, setThresholdTab] = useState('global'); // 'global' | 'uom' | 'specific'
  const [tempGlobalThresholds, setTempGlobalThresholds] = useState(DEFAULT_GLOBAL_THRESHOLDS);
  const [tempUomThresholds, setTempUomThresholds] = useState(DEFAULT_UOM_THRESHOLDS);
  const [tempSpecificLimits, setTempSpecificLimits] = useState({});

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
    category: 'Active Ingredients',
    itemName: '',
    itemDescription: '-',
    specification: '',
    uom: 'g',
    criticalLevel: defaultThresholds.criticalLevel ?? 0,
    restockWarningPoint: defaultThresholds.restockWarningPoint ?? 10,
    overstockLimitPoint: defaultThresholds.overstockLimitPoint ?? 1000,
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  // Helper: Find effective threshold for an item directly from its specific attributes or dynamic defaults
  const getResolvedThreshold = useCallback((item) => {
    return {
      criticalLevel: Number(item?.criticalLevel !== undefined && item?.criticalLevel !== '' ? item.criticalLevel : (defaultThresholds.criticalLevel ?? 0)),
      restockWarningPoint: Number(item?.restockWarningPoint !== undefined && item?.restockWarningPoint !== '' ? item.restockWarningPoint : (defaultThresholds.restockWarningPoint ?? 10)),
      overstockLimitPoint: Number(item?.overstockLimitPoint !== undefined && item?.overstockLimitPoint !== '' ? item.overstockLimitPoint : (defaultThresholds.overstockLimitPoint ?? 1000)),
    };
  }, [defaultThresholds]);

  // Helper: Calculate stock condition status
  const getStockCondition = useCallback((qty, itemOrThreshold) => {
    const resolvedThreshold =
      itemOrThreshold && itemOrThreshold.criticalLevel !== undefined && itemOrThreshold.restockWarningPoint !== undefined && itemOrThreshold.overstockLimitPoint !== undefined
        ? itemOrThreshold
        : getResolvedThreshold(itemOrThreshold);
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
          setCategoriesVersion((v) => v + 1);
        }
      })
      .catch(() => { });
  }, [fetchRawMaterials]);

  // Real-time automatic background synchronization without refresh
  useLiveSync(['rawMaterials', 'inventory'], () => {
    fetchRawMaterials();
  });

  // Stored master categories for Add/Edit Raw Material modal
  const modalCategories = useMemo(() => {
    const fromMaterials = rawMaterials.map((item) => item.category).filter((v) => v && v.trim() !== '');
    const cats = getStoredCategories(fromMaterials, 'raw_materials');
    return Array.from(new Set(cats.map((c) => String(c).trim()))).filter(Boolean).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [rawMaterials, categoriesVersion]);

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
    const fromMaterials = rawMaterials.map((item) => item.uom).filter((v) => v && v.trim() !== '');
    return getStoredUOMs(fromMaterials, 'raw_materials');
  }, [rawMaterials, categoriesVersion]);

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
      category: 'Raw Materials',
      itemName: '',
      itemDescription: '-',
      specification: '',
      uom: 'g',
      criticalLevel: 0,
      restockWarningPoint: 10,
      overstockLimitPoint: 1000,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setIsEditing(true);
    setSelectedId(item._id || item.id);
    setFormData({
      code: item.code || item.itemCode || '',
      category: item.category || '',
      itemName: item.itemName || '',
      itemDescription: item.itemDescription || item.description || '',
      specification: item.specification || '',
      uom: item.uom || item.unit || 'pcs',
      criticalLevel: item.criticalLevel !== undefined ? Number(item.criticalLevel) : 0,
      restockWarningPoint: item.restockWarningPoint !== undefined ? Number(item.restockWarningPoint) : 10,
      overstockLimitPoint: item.overstockLimitPoint !== undefined ? Number(item.overstockLimitPoint) : 1000,
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
        criticalLevel: formData.criticalLevel !== undefined ? formData.criticalLevel : 0,
        restockWarningPoint: formData.restockWarningPoint !== undefined ? formData.restockWarningPoint : 10,
        overstockLimitPoint: formData.overstockLimitPoint !== undefined ? formData.overstockLimitPoint : 1000,
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
  ]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedItemName('All');
    setSelectedCondition('All');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setSortBy('default');
    setViewMode('active');
    setCurrentPage(1);
  };

  // EXCEL RIBBON ACTION: Export Raw Materials to PDF Report
  const handleExportPDF = () => {
    if (filteredMaterials.length === 0) {
      showErrorToast('No raw materials available to export.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Brand Header Banner (#01390f deep green)
      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - RAW MATERIALS INVENTORY MASTERLIST', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated: ${new Date().toLocaleString()} | View: ${viewMode === 'archived' ? 'Archive Vault' : 'Active Raw Materials'} | Total Records: ${filteredMaterials.length}`,
        14,
        18
      );

      const tableHead = [
        ['#', 'Item Code', 'Category', 'Item Name', 'Qty', 'UOM', 'Stock Condition']
      ];

      const tableBody = filteredMaterials.map((m, idx) => {
        const qty = Number(m.quantity ?? m.qty ?? 0);
        const condition = getStockCondition(qty, m);

        return [
          idx + 1,
          m.code || m.itemCode || 'N/A',
          m.category || 'N/A',
          m.itemName || 'N/A',
          qty.toLocaleString(),
          m.uom || 'pcs',
          condition?.label || 'Normal'
        ];
      });

      autoTable(doc, {
        startY: 30,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { fontStyle: 'bold', halign: 'center', cellWidth: 24 },
          2: { cellWidth: 32 },
          3: { fontStyle: 'bold', cellWidth: 42 },
          4: { cellWidth: 65 },
          5: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 16 },
          7: { halign: 'center', cellWidth: 32 },
          8: { halign: 'center', cellWidth: 30 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 }
      });

      const dateStr = new Date().toISOString().split('T')[0];
      doc.save(`raw_materials_inventory_${viewMode}_${dateStr}.pdf`);
      showSuccessToast(`Exported ${filteredMaterials.length} raw materials to PDF!`);
    } catch (err) {
      console.error('PDF export error:', err);
      showErrorToast('Failed to generate PDF report.');
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

                  {/* Layer 2: Reset Filters */}
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
                    type="text"
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
            totalItems={filteredMaterials.length}
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
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CODE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px] font-semibold text-white">ITEM NAME</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">QUANTITY & CONDITION</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">UOM</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading raw materials...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedMaterials.map((item) => {
                  const displayCode = item.code || item.itemCode || 'N/A';
                  const displayCat = item.category || 'Materials';
                  const displayName = item.itemName || 'N/A';
                  const displayDesc = item.itemDescription || item.description || 'N/A';
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
                      <td className="py-3.5 px-4 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-mono font-semibold text-slate-600 whitespace-nowrap">
                        <span>{displayCode}</span>
                      </td>

                      {/* CATEGORY */}
                      <td className="py-3.5 px-4 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-semibold text-slate-900 transition-colors">
                        {displayCat}

                      </td>

                      {/* ITEM NAME */}
                      <td className="py-3.5 px-4 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-semibold text-slate-900 transition-colors">
                        {displayName}
                      </td>

                      {/* QUANTITY */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {displayQty}{' '}
                            <span className="text-[10px] text-slate-400 font-normal font-sans">
                              / {resolvedRules.overstockLimitPoint} max
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${condition.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${condition.dotClass}`}></span>
                            {condition.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs uppercase text-slate-600 whitespace-nowrap font-bold bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
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
                })}

                {!loading && filteredMaterials.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
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
                      Healthy: {Math.max(0, (Number(formData.restockWarningPoint) || 0) + 1)} - {Number(formData.overstockLimitPoint) || 1000} {formData.uom ? formData.uom.toUpperCase() : ''}
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
                        value={formData.criticalLevel !== undefined ? formData.criticalLevel : 0}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-800 focus:outline-none focus:border-rose-500"
                        placeholder="0"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Default: 0 (Emergency)</span>
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
                        value={formData.restockWarningPoint !== undefined ? formData.restockWarningPoint : 10}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-800 focus:outline-none focus:border-amber-500"
                        placeholder="10"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Default: 10 (Reorder)</span>
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
                        value={formData.overstockLimitPoint !== undefined ? formData.overstockLimitPoint : 1000}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-blue-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-800 focus:outline-none focus:border-blue-500"
                        placeholder="1000"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Default: 1000 (Overstock Limit)</span>
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
                      placeholder="Type or select Item Name..."
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


                  {/* SPECIFICATION (NUMBERS ONLY) */}
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      Specification <span className="text-[10px] text-slate-500 font-bold">(Numbers only)</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      name="specification"
                      value={formData.specification}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                        if (e.key === '.' && !e.currentTarget.value.includes('.')) return;
                        if (!/^[0-9]$/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const paste = (e.clipboardData || window.clipboardData).getData('text');
                        const sanitized = paste.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
                        if (sanitized) {
                          setFormData((prev) => ({ ...prev, specification: sanitized }));
                        }
                      }}
                      placeholder="Enter numeric specification (e.g. 100, 250, 78.5)..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#01390f] transition-all"
                    />
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

    </div>
  );
}

export default InventoryRawMaterials;