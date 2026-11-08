import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Filter,
  Search,
  Plus,
  Edit2,
  Edit3,
  Trash2,
  Image as ImageIcon,
  X,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
  Archive,
  RotateCcw,
  Trash,
  Info,
  Check,
  Boxes,
  Tag,
  Package,
  FileText,
  Activity,
  Sparkles,
  Eye,
  EyeOff,
  Upload,
  Camera,
  Lock,
  FileSpreadsheet,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios, { API, API_BASE_URL } from '../axios';
import { useLiveSync, notifyLiveSync } from '../utils/liveSync';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { compressImageToBase64 } from '../utils/imageCompressor';
import TypeableDropdown from './common/TypeableDropdown';
import MasterCategoryUomModal, {
  getStoredCategories,
  getStoredUOMs,
  getStoredThresholds,
} from './common/MasterCategoryUomModal';
import { getUserFullName } from '../utils/userId';
import TablePagination from './common/TablePagination';
import ItemImageModal, { resolveItemImageUrl } from './common/ItemImageModal';
import PinAuthModal from './common/PinAuthModal';

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
  criticalLevel: 0,
  restockWarningPoint: 10,
  overstockLimitPoint: 1000,
};

const DEFAULT_UOM_THRESHOLDS = {
  pcs: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 1000 },
  box: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 200 },
  pack: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 500 },
  bottle: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 1000 },
  jar: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 500 },
  can: { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 500 },
  kg: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 100 },
  l: { criticalLevel: 0, restockWarningPoint: 5, overstockLimitPoint: 100 },
};

export const INITIAL_DEFAULT_PRODUCTS = [
  {
    _id: "6a8920d649974b364fb1a782",
    code: "FG0001",
    category: "Finished Goods",
    itemName: "SUNBLOCK CREAM",
    itemDescription: "NIACINAMIDE BODY LOTION",
    specification: "100",
    standardBatchSize: 5,
    batchSizeUom: "kg",
    netWeight: "135g",
    quantity: 48,
    uom: "ML",
    manufacturer: "N/A",
    brand: "",
    accountTo: "",
    image: "/mhira_removebg.png",
    isArchived: false,
    ingredients: [
      { rawMaterialId: "6a8928f91488b3c351cf63ef", materialCode: "RM0001", name: "Water", specification: "78.50", theoreticalWeight: "3925", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892be51488b3c351cf64a3", materialCode: "RM0013", name: "Stearic Acid", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bec1488b3c351cf64a4", materialCode: "RM0014", name: "Stearyl Alcohol", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bf71488b3c351cf64a5", materialCode: "RM0015", name: "Cetyl Alcohol", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bfd1488b3c351cf64a6", materialCode: "RM0016", name: "Ceto-Stearyl Alcohol", specification: "6.00", theoreticalWeight: "300", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931491488b3c351cf66ba", materialCode: "RM0026", name: "Glycol Monostearate", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c041488b3c351cf64a7", materialCode: "RM0017", name: "Petroleum Jelly", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c0d1488b3c351cf64a8", materialCode: "RM0018", name: "Beeswax White Pellets", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c141488b3c351cf64a9", materialCode: "RM0019", name: "Dimethicone", specification: "1.00", theoreticalWeight: "50", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c1a1488b3c351cf64aa", materialCode: "RM0020", name: "SLES", specification: "0.40", theoreticalWeight: "20", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89291e1488b3c351cf63f1", materialCode: "RM0003", name: "Sodium Benzoate", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c221488b3c351cf64ab", materialCode: "RM0021", name: "Titanium Dioxide", specification: "1.00", theoreticalWeight: "50", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c2a1488b3c351cf64ac", materialCode: "RM0022", name: "SunCat DE", specification: "1.50", theoreticalWeight: "75", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c301488b3c351cf64ad", materialCode: "RM0023", name: "Niacinamide", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929661488b3c351cf63f9", materialCode: "RM0011", name: "Phenoxyethanol", specification: "0.60", theoreticalWeight: "30", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89296d1488b3c351cf63fa", materialCode: "RM0012", name: "Scent", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" }
    ],
  },
  {
    _id: "6a89221149974b364fb1a784",
    code: "FG0002",
    category: "Finished Goods",
    itemName: "BODY LOTION",
    itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR",
    specification: "200",
    standardBatchSize: 5,
    batchSizeUom: "kg",
    netWeight: "",
    quantity: 0,
    uom: "ML",
    manufacturer: "N/A",
    brand: "",
    accountTo: "",
    image: "/mhira_removebg.png",
    isArchived: false,
    ingredients: [
      { rawMaterialId: "6a8928f91488b3c351cf63ef", materialCode: "RM0001", name: "Water", specification: "73.70", theoreticalWeight: "3685", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892be51488b3c351cf64a3", materialCode: "RM0013", name: "Stearic Acid", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bec1488b3c351cf64a4", materialCode: "RM0014", name: "Stearyl Alcohol", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bf71488b3c351cf64a5", materialCode: "RM0015", name: "Cetyl Alcohol", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bfd1488b3c351cf64a6", materialCode: "RM0016", name: "Ceto-Stearyl Alcohol", specification: "6.00", theoreticalWeight: "300", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931491488b3c351cf66ba", materialCode: "RM0026", name: "Glycol Monostearate", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c041488b3c351cf64a7", materialCode: "RM0017", name: "Petroleum Jelly", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c0d1488b3c351cf64a8", materialCode: "RM0018", name: "Beeswax White Pellets", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c141488b3c351cf64a9", materialCode: "RM0019", name: "Dimethicone", specification: "1.00", theoreticalWeight: "50", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c1a1488b3c351cf64aa", materialCode: "RM0020", name: "SLES", specification: "0.40", theoreticalWeight: "20", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89291e1488b3c351cf63f1", materialCode: "RM0003", name: "Sodium Benzoate", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c3a1488b3c351cf64ae", materialCode: "RM0024", name: "Papaya Extract", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c301488b3c351cf64ad", materialCode: "RM0023", name: "Niacinamide", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929661488b3c351cf63f9", materialCode: "RM0011", name: "Phenoxyethanol", specification: "0.60", theoreticalWeight: "30", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89296d1488b3c351cf63fa", materialCode: "RM0012", name: "Scent", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" }
    ],
  },
  {
    _id: "6a89239a69ab5ca9bdf7493c",
    code: "FG0003",
    category: "Finished Goods",
    itemName: "HAIR CONDITIONER",
    itemDescription: "HEALTHY HAIR AND SMOOTH SHINY HAIR",
    specification: "200",
    standardBatchSize: 5,
    batchSizeUom: "kg",
    netWeight: "",
    quantity: 0,
    uom: "ML",
    manufacturer: "N/A",
    brand: "",
    accountTo: "",
    image: "/mhira_removebg.png",
    isArchived: false,
    ingredients: [
      { rawMaterialId: "6a8928f91488b3c351cf63ef", materialCode: "RM0001", name: "Water", specification: "67.70", theoreticalWeight: "3385", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931411488b3c351cf66b9", materialCode: "RM0025", name: "Cetrimonium Chloride", specification: "3.00", theoreticalWeight: "150", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931491488b3c351cf66ba", materialCode: "RM0026", name: "Glycol Monostearate", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bec1488b3c351cf64a4", materialCode: "RM0014", name: "Stearyl Alcohol", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bf71488b3c351cf64a5", materialCode: "RM0015", name: "Cetyl Alcohol", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892bfd1488b3c351cf64a6", materialCode: "RM0016", name: "Ceto-Stearyl Alcohol", specification: "6.00", theoreticalWeight: "300", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931531488b3c351cf66bb", materialCode: "RM0027", name: "Coconut Oil", specification: "3.00", theoreticalWeight: "150", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931591488b3c351cf66bc", materialCode: "RM0028", name: "Argan Oil", specification: "5.00", theoreticalWeight: "250", quantity: 1, uom: "g" },
      { rawMaterialId: "6a892c0d1488b3c351cf64a8", materialCode: "RM0018", name: "Beeswax White Pellets", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931601488b3c351cf66bd", materialCode: "RM0029", name: "Polyquaternium 7", specification: "0.20", theoreticalWeight: "10", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929661488b3c351cf63f9", materialCode: "RM0011", name: "Phenoxyethanol", specification: "0.60", theoreticalWeight: "30", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929161488b3c351cf63f0", materialCode: "RM0002", name: "Sodium Hyaluronate C", specification: "1.00", theoreticalWeight: "50", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931671488b3c351cf66be", materialCode: "RM0030", name: "Aloe Vera Extract", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89316e1488b3c351cf66bf", materialCode: "RM0031", name: "Hydrolyzed Keratin", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8931751488b3c351cf66c0", materialCode: "RM0032", name: "D-Panthenol", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89317e1488b3c351cf66c1", materialCode: "RM0033", name: "Madre de Cacao Extract", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89296d1488b3c351cf63fa", materialCode: "RM0012", name: "Scent", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" }
    ],
  },
  {
    _id: "6a8924ce69ab5ca9bdf7493d",
    code: "FG0004",
    category: "Finished Goods",
    itemName: "SERUM",
    itemDescription: "FACE SERUM COLLAGEN",
    specification: "30",
    standardBatchSize: 5,
    batchSizeUom: "kg",
    netWeight: "",
    quantity: 0,
    uom: "ML",
    manufacturer: "N/A",
    brand: "",
    accountTo: "",
    image: "/mhira_removebg.png",
    isArchived: false,
    ingredients: [
      { rawMaterialId: "6a8928f91488b3c351cf63ef", materialCode: "RM0001", name: "Water", specification: "90.80", theoreticalWeight: "4540", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929161488b3c351cf63f0", materialCode: "RM0002", name: "Sodium Hyaluronate C", specification: "2.00", theoreticalWeight: "100", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89291e1488b3c351cf63f1", materialCode: "RM0003", name: "Sodium Benzoate", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929261488b3c351cf63f2", materialCode: "RM0004", name: "Potassium Sorbate", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89292e1488b3c351cf63f3", materialCode: "RM0005", name: "Tomato Extract", specification: "1.00", theoreticalWeight: "50", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929421488b3c351cf63f4", materialCode: "RM0006", name: "Witch Hazel Extract", specification: "1.00", theoreticalWeight: "50", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929491488b3c351cf63f5", materialCode: "RM0007", name: "Bust-A", specification: "0.80", theoreticalWeight: "40", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929501488b3c351cf63f6", materialCode: "RM0008", name: "Pore-MinEx", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929571488b3c351cf63f7", materialCode: "RM0009", name: "Cucumber Extract", specification: "1.00", theoreticalWeight: "50", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89295f1488b3c351cf63f8", materialCode: "RM0010", name: "Azelaic Optima", specification: "0.80", theoreticalWeight: "40", quantity: 1, uom: "g" },
      { rawMaterialId: "6a8929661488b3c351cf63f9", materialCode: "RM0011", name: "Phenoxyethanol", specification: "0.60", theoreticalWeight: "30", quantity: 1, uom: "g" },
      { rawMaterialId: "6a89296d1488b3c351cf63fa", materialCode: "RM0012", name: "Scent", specification: "0.50", theoreticalWeight: "25", quantity: 1, uom: "g" }
    ],
  }
];

const resolveProductImageUrl = (img) => {
  if (!img) return '/mhira_removebg.png';
  if (typeof img === 'object' && img.url) img = img.url;
  if (typeof img !== 'string') return '/mhira_removebg.png';
  const trimmed = img.trim();
  if (!trimmed || trimmed.includes('catbox.moe') || (trimmed.startsWith('data:image') && trimmed.length > 500)) {
    return '/mhira_removebg.png';
  }
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/mhira') || trimmed.startsWith('mhira') || trimmed.startsWith('/vite') || trimmed.startsWith('/assets')) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

function InventoryFinishedGoods() {
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { }
    return INITIAL_DEFAULT_PRODUCTS;
  });
  const [rawMaterialsList, setRawMaterialsList] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_raw_materials');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(false);

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

  // Image Preview Modal State
  const [selectedImageItem, setSelectedImageItem] = useState(null);

  // 6-Digit PIN Protection State for Bill of Materials & Product Editing
  const [pinProtectedItem, setPinProtectedItem] = useState(null);
  const [editPinTargetItem, setEditPinTargetItem] = useState(null);



  // CRUD Modal States
  const initialFormState = {
    image: '',
    code: '',
    category: 'Finished Goods',
    itemName: '',
    itemDescription: '',
    specification: '',
    standardBatchSize: 5,
    batchSizeUom: 'kg',
    netWeight: '',
    uom: 'pcs',
    manufacturer: '',
    brand: '',
    accountTo: '',
    criticalLevel: 0,
    restockWarningPoint: 10,
    overstockLimitPoint: 1000,
    ingredients: [],
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewIngredientsProduct, setViewIngredientsProduct] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isCategoryUomModalOpen, setIsCategoryUomModalOpen] = useState(false);
  const [categoryUomInitialTab, setCategoryUomInitialTab] = useState('categories');
  const [categoriesVersion, setCategoriesVersion] = useState(0);
  const [defaultThresholds, setDefaultThresholds] = useState(() => getStoredThresholds('finished_goods'));
  const [archiveTargetProduct, setArchiveTargetProduct] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);


  // Sync when custom categories, UOMs, or thresholds are modified
  useEffect(() => {
    const handleCategoryUomUpdated = () => {
      setCategoriesVersion((v) => v + 1);
      setDefaultThresholds(getStoredThresholds('finished_goods'));
    };
    window.addEventListener('inventory_categories_uom_updated', handleCategoryUomUpdated);
    window.addEventListener('storage', handleCategoryUomUpdated);
    return () => {
      window.removeEventListener('inventory_categories_uom_updated', handleCategoryUomUpdated);
      window.removeEventListener('storage', handleCategoryUomUpdated);
    };
  }, []);

  // Helper: Find effective threshold for an item directly from its specific attributes or dynamic defaults
  const getResolvedThreshold = useCallback((item) => {
    return {
      criticalLevel: Number(item?.criticalLevel !== undefined && item?.criticalLevel !== '' ? item.criticalLevel : (defaultThresholds.criticalLevel ?? 0)),
      restockWarningPoint: Number(item?.restockWarningPoint !== undefined && item?.restockWarningPoint !== '' ? item.restockWarningPoint : (defaultThresholds.restockWarningPoint ?? 10)),
      overstockLimitPoint: Number(item?.overstockLimitPoint !== undefined && item?.overstockLimitPoint !== '' ? item.overstockLimitPoint : (defaultThresholds.overstockLimitPoint ?? 1000)),
    };
  }, [defaultThresholds]);

  // Helper: Calculate stock condition status
  const getStockCondition = useCallback(
    (qty, resolvedThreshold) => {
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
    },
    []
  );

  // Auto-generate code starting from FG0001
  const generateNextCode = (list) => {
    let maxNum = 0;
    if (Array.isArray(list)) {
      list.forEach((item) => {
        const codeStr = item.code || item.itemCode || '';
        const match = codeStr.match(/^(?:FG-INV-|FG)(\d+)/i);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
    }
    const nextNum = maxNum + 1;
    return `FG${String(nextNum).padStart(4, '0')}`;
  };

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await API.get('/api/inventory-products', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(async () => {
        return await API.get('/api/products').catch(() => ({ data: [] }));
      });

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.products || response.data?.items || []);

      if (Array.isArray(raw) && raw.length > 0) {
        setProducts(raw);
        try {
          localStorage.setItem('cached_inventory_products', JSON.stringify(raw));
        } catch (e) { }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Raw Materials for Ingredients Selection
  const fetchRawMaterialsList = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await API.get('/api/inventory-raw-materials', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }).catch(() => ({ data: [] }));

      const raw = Array.isArray(response.data)
        ? response.data
        : (response.data?.data || response.data?.rawMaterials || response.data?.items || []);

      if (Array.isArray(raw) && raw.length > 0) {
        setRawMaterialsList(raw);
        try {
          localStorage.setItem('cached_inventory_raw_materials', JSON.stringify(raw));
        } catch (e) { }
      }
    } catch (error) {
      console.error('Error fetching raw materials for BOM:', error);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchRawMaterialsList();

    // Pre-fetch cloud database categories & UOM
    API.get('/api/inventory-category-uom/finished_goods')
      .then((res) => {
        if (res.data?.success) {
          localStorage.setItem('inventory_fg_custom_categories', JSON.stringify(res.data.categories || []));
          localStorage.setItem('inventory_fg_custom_uoms', JSON.stringify(res.data.uoms || []));
          setCategoriesVersion((v) => v + 1);
        }
      })
      .catch(() => { });

    const handleProductsUpdated = () => {
      fetchProducts();
    };

    window.addEventListener('inventory_products_updated', handleProductsUpdated);
    window.addEventListener('storage', handleProductsUpdated);
    return () => {
      window.removeEventListener('inventory_products_updated', handleProductsUpdated);
      window.removeEventListener('storage', handleProductsUpdated);
    };
  }, [fetchProducts, fetchRawMaterialsList]);

  // Real-time automatic background synchronization without refresh
  useLiveSync(['products', 'inventory'], () => {
    fetchProducts();
  });

  // Unique values for dropdown filters
  const sortedRawMaterialsList = useMemo(() => {
    if (!Array.isArray(rawMaterialsList)) return [];
    return [...rawMaterialsList].sort((a, b) => {
      const nameA = (a.itemName || a.itemDescription || a.code || '').toLowerCase().trim();
      const nameB = (b.itemName || b.itemDescription || b.code || '').toLowerCase().trim();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [rawMaterialsList]);

  const modalCategories = useMemo(() => {
    const fromProducts = products.map((item) => item.category).filter((v) => v && v.trim() !== '');
    const cats = getStoredCategories(fromProducts, 'finished_goods');
    return Array.from(new Set(cats.map((c) => String(c).trim()))).filter(Boolean).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [products, categoriesVersion]);

  // Categories strictly from existing Finished Goods products (only existing in data)
  const filterCategories = useMemo(() => {
    const currentProducts = products.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    const cats = Array.from(
      new Set(
        currentProducts
          .map((item) => item.category)
          .filter((v) => v && String(v).trim() !== '')
          .map((c) => String(c).trim())
      )
    );
    return cats.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [products, viewMode]);

  // Item Names strictly from existing products (contextual to selected category)
  const filterItemNames = useMemo(() => {
    let currentProducts = products.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    if (selectedCategory !== 'All') {
      currentProducts = currentProducts.filter((item) => (item.category || '') === selectedCategory);
    }
    const names = Array.from(
      new Set(
        currentProducts
          .map((item) => item.itemName)
          .filter((v) => v && String(v).trim() !== '')
          .map((n) => String(n).trim())
      )
    );
    return names.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [products, viewMode, selectedCategory]);

  const existingItemNames = useMemo(() => {
    const names = Array.from(
      new Set(products.map((item) => item.itemName).filter((v) => v && v.trim() !== '').map((n) => String(n).trim()))
    );
    return names.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [products]);

  // Conditions strictly from existing products
  const filterConditions = useMemo(() => {
    let currentProducts = products.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    if (selectedCategory !== 'All') {
      currentProducts = currentProducts.filter((item) => (item.category || '') === selectedCategory);
    }
    if (selectedItemName !== 'All') {
      currentProducts = currentProducts.filter((item) => (item.itemName || '') === selectedItemName);
    }
    const set = new Set();
    currentProducts.forEach((item) => {
      const qty = Number(item.quantity ?? 0);
      const resolved = getResolvedThreshold(item);
      const condition = getStockCondition(qty, resolved);
      if (condition?.key) {
        set.add(condition.key);
      }
    });
    return set;
  }, [products, viewMode, selectedCategory, selectedItemName, getResolvedThreshold, getStockCondition]);

  // Live item counts per stock condition status
  const conditionCounts = useMemo(() => {
    let currentProducts = products.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    if (selectedCategory !== 'All') {
      currentProducts = currentProducts.filter((item) => (item.category || '') === selectedCategory);
    }
    if (selectedItemName !== 'All') {
      currentProducts = currentProducts.filter((item) => (item.itemName || '') === selectedItemName);
    }
    const counts = { 'Critical Alert': 0, 'Restock Warning': 0, Healthy: 0, Overstock: 0 };
    currentProducts.forEach((item) => {
      const qty = Number(item.quantity ?? 0);
      const resolved = getResolvedThreshold(item);
      const condition = getStockCondition(qty, resolved);
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
  }, [products, viewMode, selectedCategory, selectedItemName, getResolvedThreshold, getStockCondition]);

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
        products
          .map((item) => item.itemDescription || item.description)
          .filter((v) => v && String(v).trim() !== '')
          .map((d) => String(d).trim())
      )
    );
    return descriptions.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );
  }, [products]);

  const existingUOMs = useMemo(() => {
    const fromProducts = products.map((item) => item.uom).filter((v) => v && v.trim() !== '');
    return getStoredUOMs(fromProducts, 'finished_goods');
  }, [products, categoriesVersion]);

  // Counts for active vs archived
  const activeCount = useMemo(() => {
    return products.filter((item) => !item.isArchived).length;
  }, [products]);

  const archivedCount = useMemo(() => {
    return products.filter((item) => item.isArchived).length;
  }, [products]);

  const totalStockUnits = useMemo(() => {
    const list = products.filter((item) => {
      if (viewMode === 'archived') return Boolean(item.isArchived);
      if (viewMode === 'active') return !item.isArchived;
      return true;
    });
    return list.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [products, viewMode]);

  // Product Ingredients (BOM) Formulation Totals: 100% Spec & 5000g Theor. Wt
  const totalBOMSpec = useMemo(() => {
    if (!formData.ingredients || formData.ingredients.length === 0) return 0;
    const sum = formData.ingredients.reduce((acc, ing) => acc + (parseFloat(ing.specification) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [formData.ingredients]);

  const totalBOMWeight = useMemo(() => {
    if (!formData.ingredients || formData.ingredients.length === 0) return 0;
    const sum = formData.ingredients.reduce((acc, ing) => acc + (parseFloat(ing.theoreticalWeight) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [formData.ingredients]);

  const isBOMSpecValid = Math.abs(totalBOMSpec - 100) < 0.05;
  const isBOMWeightValid = Math.abs(totalBOMWeight - 5000) < 0.5;
  const isBOMValid =
    formData.ingredients.length > 0 &&
    isBOMSpecValid &&
    isBOMWeightValid &&
    formData.ingredients.every((ing) => Boolean(ing.rawMaterialId));

  // Filtered dataset
  const filteredProducts = useMemo(() => {
    const list = products.filter((item) => {
      // 1. Vault check
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;

      // 2. Hide 0 Qty & 0 Qty Only
      const qty = Number(item.quantity ?? 0);
      if (showZeroOnly && qty !== 0) return false;
      if (hideZeroQty && qty === 0) return false;


      // 4. Search Query
      if (searchQuery && searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const code = (item.code || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        const name = (item.itemName || '').toLowerCase();
        const desc = (item.itemDescription || '').toLowerCase();
        const spec = (item.specification || '').toLowerCase();

        const match =
          code.includes(query) ||
          cat.includes(query) ||
          name.includes(query) ||
          desc.includes(query) ||
          spec.includes(query);

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

      // 7. Condition filter based on Threshold Rules
      if (selectedCondition !== 'All') {
        const resolved = getResolvedThreshold(item);
        const condition = getStockCondition(qty, resolved);
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
      return [...list].sort((a, b) => (a.itemName || '').localeCompare(b.itemName || ''));
    }
    if (sortBy === 'name_desc') {
      return [...list].sort((a, b) => (b.itemName || '').localeCompare(a.itemName || ''));
    }
    if (sortBy === 'qty_desc') {
      return [...list].sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0));
    }
    if (sortBy === 'qty_asc') {
      return [...list].sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0));
    }
    if (sortBy === 'code_asc') {
      return [...list].sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true }));
    }

    return list;
  }, [
    products,
    viewMode,
    hideZeroQty,
    showZeroOnly,
    searchQuery,
    selectedCategory,
    selectedItemName,
    selectedCondition,
    sortBy,
    getResolvedThreshold,
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
    sortBy,
  ]);

  // Paginated Slices
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Open Archive / Restore confirmation modal
  const handleToggleArchive = (product) => {
    setArchiveTargetProduct(product);
  };

  // Execute Toggle Archive status
  const executeToggleArchive = async () => {
    if (!archiveTargetProduct) return;
    const isCurrentlyArchived = Boolean(archiveTargetProduct.isArchived);

    try {
      setIsArchiving(true);
      const token = localStorage.getItem('token');
      const id = archiveTargetProduct._id || archiveTargetProduct.id;

      await axios.patch(`${API_BASE_URL}/api/inventory-products/${id}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showSuccessToast(
        isCurrentlyArchived
          ? 'Product restored to active inventory!'
          : 'Product moved to archive vault!'
      );
      setArchiveTargetProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error toggling product archive status:', error);
      showErrorToast(error.response?.data?.message || 'Failed to update archive status.');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    const autoCode = generateNextCode(products);
    setFormData({
      ...initialFormState,
      code: autoCode,
      ingredients: [],
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setSelectedProduct(product);
    setFormData({
      image: product.image || '',
      code: product.code || '',
      category: product.category || 'Finished Goods',
      itemName: product.itemName || '',
      itemDescription: product.itemDescription || '',
      specification: product.specification || '',
      standardBatchSize: 5,
      batchSizeUom: 'kg',
      netWeight: product.netWeight || '',
      uom: product.uom || 'pcs',
      manufacturer: product.manufacturer || product.brand || '',
      brand: product.brand || '',
      accountTo: product.accountTo || '',
      criticalLevel: product.criticalLevel !== undefined ? Number(product.criticalLevel) : 0,
      restockWarningPoint: product.restockWarningPoint !== undefined ? Number(product.restockWarningPoint) : 10,
      overstockLimitPoint: product.overstockLimitPoint !== undefined ? Number(product.overstockLimitPoint) : 1000,
      ingredients: Array.isArray(product.ingredients) ? product.ingredients : [],
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleRequestEditProduct = (product) => {
    setEditPinTargetItem(product);
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

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setModalError('File size is too large. Please select an image under 15MB.');
      return;
    }

    try {
      setModalError('');
      // Auto-compress to ~20KB-35KB WebP Base64 Data URL for instant rendering & 0 disk usage
      const compressedBase64 = await compressImageToBase64(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.75,
      });
      setFormData((prev) => ({ ...prev, image: compressedBase64 }));
    } catch (err) {
      console.error('Failed to compress image:', err);
      setModalError('Failed to process image. Please try another.');
    }
  };

  const handleAddIngredientRow = () => {
    setFormData((prev) => {
      const currentSpecSum = (prev.ingredients || []).reduce((acc, ing) => acc + (parseFloat(ing.specification) || 0), 0);
      const remainingSpec = Math.max(0, 100 - currentSpecSum);
      const remainingWeight = remainingSpec * 50;

      return {
        ...prev,
        ingredients: [
          ...prev.ingredients,
          {
            rawMaterialId: '',
            materialCode: '',
            name: '',
            specification: remainingSpec > 0 ? String(Number(remainingSpec.toFixed(2))) : '',
            theoreticalWeight: remainingWeight > 0 ? String(Number(remainingWeight.toFixed(2))) : '',
            quantity: 1,
            uom: 'g',
          },
        ],
      };
    });
  };

  const handleRemoveIngredientRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  const handleIngredientChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.ingredients];
      if (field === 'rawMaterialId') {
        const selectedMat = rawMaterialsList.find((mat) => (mat._id || mat.id) === value);
        if (selectedMat) {
          updated[index] = {
            ...updated[index],
            rawMaterialId: selectedMat._id || selectedMat.id,
            materialCode: selectedMat.code || selectedMat.itemCode || '',
            name: selectedMat.itemName || selectedMat.itemDescription || 'Raw Material',
            specification: updated[index].specification || selectedMat.specification || '',
            theoreticalWeight:
              updated[index].theoreticalWeight ||
              (selectedMat.specification ? String(Number(selectedMat.specification) * 50) : ''),
            uom: 'g',
          };
        } else {
          updated[index][field] = value;
        }
      } else if (field === 'specification') {
        const digitsOnly = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
        updated[index].specification = digitsOnly;
        if (digitsOnly !== '' && !isNaN(Number(digitsOnly))) {
          // Standard 5000g batch: 1% = 50g
          const calculatedWeight = Number(digitsOnly) * 50;
          updated[index].theoreticalWeight = String(Number(calculatedWeight.toFixed(2)));
        } else if (digitsOnly === '') {
          updated[index].theoreticalWeight = '';
        }
      } else if (field === 'theoreticalWeight') {
        const digitsOnly = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
        updated[index].theoreticalWeight = digitsOnly;
        if (digitsOnly !== '' && !isNaN(Number(digitsOnly))) {
          // Standard 5000g batch: 50g = 1%
          const calculatedSpec = Number(digitsOnly) / 50;
          updated[index].specification = String(Number(calculatedSpec.toFixed(4)));
        } else if (digitsOnly === '') {
          updated[index].specification = '';
        }
      } else if (field === 'quantity') {
        updated[index][field] = Math.max(0, Number(value) || 0);
      } else {
        updated[index][field] = value;
      }
      return { ...prev, ingredients: updated };
    });
  };

  const handleAutoBalanceWater = () => {
    setFormData((prev) => {
      const updated = [...(prev.ingredients || [])];
      const waterIndex = updated.findIndex((ing) => {
        const name = (ing.name || '').toLowerCase();
        return name.includes('water') || name.includes('aqua') || name.includes('purified');
      });
      if (waterIndex === -1) return prev;

      const otherSpec = updated.reduce(
        (sum, ing, idx) => (idx === waterIndex ? sum : sum + (parseFloat(ing.specification) || 0)),
        0
      );
      const newWaterSpec = Math.max(0, Math.round((100 - otherSpec) * 100) / 100);
      const newWaterWeight = Math.max(0, Math.round(((newWaterSpec / 100) * 5000) * 100) / 100);

      updated[waterIndex] = {
        ...updated[waterIndex],
        specification: newWaterSpec.toFixed(2),
        theoreticalWeight: String(newWaterWeight),
      };

      setModalError('');
      showSuccessToast(`Water formulation auto-balanced to ${newWaterSpec.toFixed(2)}% (${newWaterWeight}g) for 100% total!`);
      return { ...prev, ingredients: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError('');

    // Formulation validation: must be 100% and 5000g
    if (!isBOMValid) {
      let errorMsg = '';
      if (formData.ingredients.length === 0) {
        errorMsg = 'Formulation requirement: Please add ingredients totaling exactly 100% (5000g) before saving.';
      } else if (formData.ingredients.some((ing) => !ing.rawMaterialId)) {
        errorMsg = 'Please select a raw material for all ingredient rows.';
      } else {
        errorMsg = `Cannot save product: Total formulation must be exactly 100% (currently ${totalBOMSpec.toFixed(2)}%) and 5000g (currently ${totalBOMWeight.toFixed(2)}g).`;
      }
      setModalError(errorMsg);
      showErrorToast(errorMsg);
      setModalLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        ...formData,
        standardBatchSize: 5,
        batchSizeUom: 'kg',
      };

      if (selectedProduct) {
        const id = selectedProduct._id || selectedProduct.id;
        await axios.put(`${API_BASE_URL}/api/inventory-products/${id}`, payload, { headers });
        showSuccessToast('Finished Product updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/api/inventory-products`, payload, { headers });
        showSuccessToast('Finished Product created successfully!');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      setModalError(error.response?.data?.message || 'Failed to save product details.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const id = product._id || product.id;
    const confirmDelete = window.confirm(`Are you sure you want to permanently delete product "${product.itemDescription}"?`);
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/inventory-products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProducts();
      showSuccessToast('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      showErrorToast(error.response?.data?.message || 'Failed to delete product');
    }
  };

  // Quick count for zero quantity items
  const zeroCount = useMemo(() => {
    return products.filter((item) => {
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;
      return Number(item.quantity ?? 0) === 0;
    }).length;
  }, [products, viewMode]);


  const statusModules = useMemo(() => [
    { id: 'active', label: 'Finished Goods' },
    { id: 'archived', label: 'Archive Vault' },
  ], []);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'All') count++;
    if (selectedItemName !== 'All') count++;
    if (selectedCondition !== 'All') count++;
    if (sortBy !== 'default') count++;
    if (hideZeroQty) count++;
    if (showZeroOnly) count++;
    if (viewMode !== 'active') count++;
    return count;
  }, [
    searchQuery,
    selectedCategory,
    selectedItemName,
    selectedCondition,
    sortBy,
    hideZeroQty,
    showZeroOnly,
    viewMode,
  ]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedItemName('All');
    setSelectedCondition('All');
    setSortBy('default');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setViewMode('active');
    setCurrentPage(1);
  };

  // EXCEL RIBBON ACTION: Export Finished Goods to PDF Report (Official Portrait Format)
  const handleExportPDF = async () => {
    if (filteredProducts.length === 0) {
      showErrorToast('No products available to export.');
      return;
    }
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    showSuccessToast('Preparing official finished goods PDF audit report...');

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

      const docNo = `MN-INV-FG-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

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
      doc.text('FINISHED GOODS INVENTORY AUDIT', pageWidth - 14, 16.5, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`DOC NO: ${docNo}`, pageWidth - 14, 21.5, { align: 'right' });
      doc.text(`VIEW: ${viewMode === 'archived' ? 'Archive Vault' : 'Active Finished Goods'}`, pageWidth - 14, 26, { align: 'right' });
      doc.text(`GENERATED: ${new Date().toLocaleString()}`, pageWidth - 14, 30, { align: 'right' });

      // Dividing Line
      doc.setDrawColor(21, 62, 151);
      doc.setLineWidth(0.4);
      doc.line(14, 33.5, pageWidth - 14, 33.5);

      // 2. Summary KPI Audit Table
      const totalItems = filteredProducts.length;
      const totalStock = filteredProducts.reduce((acc, p) => acc + (Number(p.quantity ?? 0) || 0), 0);
      let healthy = 0;
      let restock = 0;
      let critical = 0;

      filteredProducts.forEach((p) => {
        const resolved = getResolvedThreshold(p);
        const cond = getStockCondition(Number(p.quantity ?? 0), resolved);
        if (cond.key === 'Healthy' || cond.key === 'Overstock') healthy++;
        else if (cond.key === 'Restock Warning') restock++;
        else critical++;
      });

      autoTable(doc, {
        startY: 36.5,
        margin: { left: 14, right: 14 },
        head: [['REGISTERED FINISHED GOODS', 'TOTAL FINISHED GOODS QUANTITY', 'BUFFER HEALTH CONDITION', 'CRITICAL & REORDER ALERTS']],
        body: [[
          `${totalItems.toLocaleString()} Active SKUs`,
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
      filteredProducts.forEach((p) => {
        const cat = (p.category || 'Finished Goods').trim() || 'General';
        if (!categoryMap.has(cat)) categoryMap.set(cat, []);
        categoryMap.get(cat).push(p);
      });
      const sortedCategoryNames = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b));

      const colHeaders = ['CODE', 'ITEM NAME', 'QUANTITY', 'SPECIFICATION & UOM'];
      const columnStyles = {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 26 },
        1: { fontStyle: 'bold', halign: 'left', cellWidth: 80 },
        2: { fontStyle: 'bold', halign: 'center', cellWidth: 42 },
        3: { halign: 'center', cellWidth: 34 },
      };

      let currentTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;

      if (sortedCategoryNames.length === 0) {
        autoTable(doc, {
          startY: currentTableStartY,
          margin: { left: 14, right: 14, top: 19, bottom: 12 },
          head: [colHeaders],
          body: [['-', 'No finished goods found for the selected criteria.', '-', '-']],
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 6.8, halign: 'center', valign: 'middle', overflow: 'ellipsize' },
          headStyles: { fillColor: [21, 62, 151], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7, halign: 'center', overflow: 'ellipsize' },
        });
      } else {
        sortedCategoryNames.forEach((catName, catIdx) => {
          const catItems = categoryMap.get(catName);
          const catBody = catItems.map((p) => {
            const qty = Number(p.quantity ?? 0);
            const resolved = getResolvedThreshold(p);
            const condition = getStockCondition(qty, resolved);
            const colors = getConditionColor(condition.key);
            const specUom = `${p.specification ? p.specification : '-'} • ${p.uom || 'PCS'}`;

            return [
              p.code || 'N/A',
              p.itemName || p.itemDescription || 'Finished Good',
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
          doc.text('MHIRA NATURAL BEAUTY PRODUCTS  |  FINISHED GOODS AUDIT', 14 + thumbW + 4, 11.5);

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
      const fileName = `MHIRA_Finished_Goods_Report_${viewMode}_${dateStr}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported ${filteredProducts.length} finished goods to official PDF!`);
    } catch (err) {
      console.error('PDF export error:', err);
      showErrorToast('Failed to generate PDF report.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700">
      {/* MAIN CONTAINER (MATCHES REFERENCE SYSTEM LAYOUT & SPACING) */}
      <div className="w-full bg-white border border-slate-100 text-slate-600 rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200">

        {/* ======================================================== */}
        {/* EXCEL-STYLE RIBBON & WORKBOOK TOOLBAR                    */}
        {/* ======================================================== */}
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
                    onClick={handleAddProduct}
                    className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                    title="Add Finished Product"
                  >
                    <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                      Finished<br />Product
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
                    name="finishedGoodsSearchQuery"
                    id="finishedGoodsSearchQuery"
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

        {/* CLEAN SEPARATOR BEFORE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* TABLE MASTERLIST */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
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
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">IMAGE</th>
                  <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[170px] font-semibold text-white">ITEM NAME</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">QUANTITY & CONDITION</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">SPECIFICATION & UOM</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">REQUIRED INGREDIENTS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && products.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Fetching product data from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((item) => {
                    const displayQty = Number(item.quantity ?? 0);
                    const resolved = getResolvedThreshold(item);
                    const condition = getStockCondition(displayQty, resolved);

                    return (
                      <tr
                        key={item._id || item.id}
                        className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                      >
                        {/* CODE */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.code || 'N/A'}
                        </td>

                        {/* IMAGE */}
                        <td className="py-2.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex justify-center items-center">
                            <button
                              type="button"
                              onClick={() => setSelectedImageItem({ ...item, type: 'Finished Good', condition })}
                              className="relative group/img cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-[#01390f] focus:outline-none focus:ring-2 focus:ring-[#01390f]/30 shadow-2xs transition-all hover:scale-105 active:scale-95 bg-slate-50"
                              title="Click to view full product image"
                              aria-label={`View photo of ${item.itemName || item.itemDescription}`}
                            >
                              <img
                                src={resolveItemImageUrl(item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : null))}
                                alt={item.itemDescription || item.itemName || 'Product'}
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

                        {/* CATEGORY */}
                        <td className="py-3.5 px-4 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {item.category || 'Finished Goods'}
                        </td>

                        {/* ITEM NAME */}
                        <td className="py-3.5 px-4 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-semibold text-slate-900 transition-colors">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.itemName || 'N/A'}
                            {item.isArchived && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold border border-rose-200">
                                Archived
                              </span>
                            )}
                          </div>
                        </td>

                        {/* QUANTITY & CONDITION */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {displayQty}{' '}
                              <span className="text-[10px] text-slate-400 font-normal font-sans">
                                / {resolved.overstockLimitPoint} max
                              </span>
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-md border ${condition.badgeClass}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${condition.dotClass}`}></span>
                              {condition.label}
                            </span>
                          </div>
                        </td>

                        {/* SPECIFICATION & UOM */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {item.specification ? item.specification : '-'}
                            </span>
                            <span className="inline-flex items-center justify-center text-xs font-bold px-2.5 py-0.5 rounded-md border border-slate-200 bg-slate-100 text-slate-700 uppercase">
                              {item.uom || 'PCS'}
                            </span>
                          </div>
                        </td>

                        {/* REQUIRED INGREDIENTS */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center justify-center">
                            {Array.isArray(item.ingredients) && item.ingredients.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setPinProtectedItem(item)}
                                title={`View Required Ingredients Formulation (${item.ingredients.length} items) - Protected: Requires PIN`}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 group/btn"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600 group-hover/btn:text-white transition-colors" />
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs italic font-medium">-</span>
                            )}
                          </div>
                        </td>

                        {/* ACTION (STICKY RIGHT) */}
                        <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px] transition-colors">
                          <div className="flex items-center justify-center gap-1.5">
                            {!item.isArchived ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRequestEditProduct(item)}
                                  title="Edit Product (Protected: Requires PIN Authorization)"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(item)}
                                  title="Archive Product"
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
                                  onClick={() => handleDeleteProduct(item)}
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

                {!loading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Info className="w-6 h-6 text-slate-300" />
                        <span>
                          {viewMode === 'archived'
                            ? 'No archived finished products found in the vault.'
                            : 'No finished products matched your search or filter criteria.'}
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


      {/* VIEW INGREDIENTS FORMULATION MODAL */}
      {viewIngredientsProduct && (() => {
        const viewIngredients = Array.isArray(viewIngredientsProduct.ingredients) ? viewIngredientsProduct.ingredients : [];
        const viewTotalSpec = viewIngredients.reduce((acc, ing) => acc + (parseFloat(ing.specification) || 0), 0);
        const viewTotalWeight = viewIngredients.reduce(
          (acc, ing) => acc + (parseFloat(ing.theoreticalWeight) || (Number(ing.quantity) || 0)),
          0
        );
        const isViewSpecValid = Math.abs(viewTotalSpec - 100) < 0.05;
        const isViewWeightValid = Math.abs(viewTotalWeight - 5000) < 0.5;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">

              {/* MODAL HEADER (MATCHING EDIT FINISHED PRODUCT) */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                  Product Ingredients (Bill of Materials)
                </h3>
                <button
                  type="button"
                  onClick={() => setViewIngredientsProduct(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* MODAL BODY (MATCHING EDIT FINISHED PRODUCT LAYOUT) */}
              <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm">
                {/* PRODUCT SUMMARY CARD (MATCHING EDIT FINISHED PRODUCT CARD LAYOUT) */}
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Finished Product Formulation
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {viewIngredientsProduct.itemName || viewIngredientsProduct.itemDescription || 'Product Formulation'} • Standard batch recipe. <span className="font-semibold text-slate-700">(Note: 5kg minimum)</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold font-mono">
                      {viewIngredientsProduct.code || 'N/A'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold">
                      {viewIngredients.length} {viewIngredients.length === 1 ? 'Ingredient' : 'Ingredients'}
                    </span>
                  </div>
                </div>

                {viewIngredients.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 italic">
                    No recipe ingredients configured for this finished product.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* COLUMN HEADERS */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-1 bg-slate-100/70 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                      <div className="col-span-6">Raw Material</div>
                      <div className="col-span-3 text-center">Spec / %</div>
                      <div className="col-span-2 text-center">Theor. Wt (Qty)</div>
                      <div className="col-span-1 text-center">UOM</div>
                    </div>

                    {/* INGREDIENT ROWS */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {viewIngredients.map((ing, idx) => {
                        const matName = ing.name || ing.materialCode || 'Raw Material';
                        const specVal = ing.specification
                          ? (String(ing.specification).includes('%') ? ing.specification : `${ing.specification}%`)
                          : '0%';
                        const wtVal = ing.theoreticalWeight || (ing.quantity ? String(ing.quantity) : '0');
                        const uomVal = ing.uom || 'g';

                        return (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                          >
                            <div className="col-span-6">
                              <span className="font-bold text-slate-900 block truncate leading-tight">
                                {matName}
                              </span>
                              {ing.materialCode && (
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {ing.materialCode}
                                </span>
                              )}
                            </div>

                            <div className="col-span-3 text-center font-mono font-medium text-slate-800 text-xs">
                              {specVal}
                            </div>

                            <div className="col-span-2 text-center font-mono font-bold text-slate-900 text-xs">
                              {wtVal}
                            </div>

                            <div className="col-span-1 text-center font-mono text-[11px] font-bold text-slate-600 uppercase">
                              {uomVal}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* TOTAL SUMMARY ROW (MATCHING ADD FINISHED PRODUCT TOTAL ROW) */}
                    <div className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="col-span-6 font-bold text-slate-700 uppercase tracking-wide text-[11px] pl-1">
                        Total
                      </div>

                      <div className="col-span-3 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${isViewSpecValid ? 'text-emerald-700' : 'text-slate-800'
                            }`}
                        >
                          {viewTotalSpec.toFixed(2)}%
                        </span>
                      </div>

                      <div className="col-span-2 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${isViewWeightValid ? 'text-emerald-700' : 'text-slate-800'
                            }`}
                        >
                          {viewTotalWeight.toFixed(2)}
                        </span>
                      </div>

                      <div className="col-span-1 text-center font-mono font-bold text-[11px] text-slate-600 uppercase">
                        g
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setViewIngredientsProduct(null)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setViewIngredientsProduct(null)}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL ADD / EDIT FINISHED PRODUCT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER (NO ICON) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                {selectedProduct ? 'Edit Finished Product' : 'Add Finished Product'}
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
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                    {modalError}
                  </div>
                )}

                {/* SPECIFIC STOCK THRESHOLD RULES */}
                <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Stock Threshold & Reorder Limits
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Item-specific rules evaluated for condition badges & replenishment warnings.
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

                {/* 2-COLUMN GRID FOR CORE PRODUCT INFORMATION (CONSISTENT WITH RAW MATERIALS) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PRODUCT CODE */}
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap">
                      Product Code <span className="text-[10px] text-slate-500 font-bold">(Auto-generated)</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      readOnly
                      value={formData.code}
                      placeholder="FG0001"
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
                    <TypeableDropdown
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleInputChange}
                      options={existingItemNames}
                      placeholder="Enter Item Name"
                      required
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
                      placeholder="Enter Specification"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#01390f] transition-all"
                    />
                  </div>

                  {/* PRODUCT IMAGE */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-600 whitespace-nowrap">
                        Product Image
                      </label>
                      {formData.image ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">
                          Square (PNG/JPG)
                        </span>
                      )}
                    </div>

                    {formData.image ? (
                      <div className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 flex items-center justify-between gap-2 shadow-2xs h-[42px]">
                        <button
                          type="button"
                          onClick={() => setSelectedImageItem({ ...formData, itemName: formData.itemName || 'Product', type: 'Finished Good' })}
                          className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group/img"
                          title="Click to view full image"
                        >
                          <img
                            src={formData.image}
                            alt="Product Preview"
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0 group-hover/img:scale-110 transition-transform"
                          />
                          <span className="text-xs sm:text-sm font-medium text-slate-700 truncate group-hover/img:text-[#01390f]">
                            Photo selected
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="px-2.5 py-1 bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[11px] font-bold uppercase tracking-wider rounded-full cursor-pointer transition-colors border border-[#d5ead7]">
                            Change
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full flex items-center justify-center gap-2 bg-white hover:bg-emerald-50/40 border border-dashed border-slate-300 hover:border-[#01390f] rounded-xl px-3.5 h-[42px] cursor-pointer transition-all text-slate-600 hover:text-[#01390f] shadow-2xs group">
                        <Upload className="w-4 h-4 text-slate-400 group-hover:text-[#01390f] transition-colors" />
                        <span className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-[#01390f]">Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* INGREDIENTS / BILL OF MATERIALS (BOM) SECTION */}
                <div className="border-t border-slate-200/80 pt-4 mt-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase">
                        Product Ingredients (Bill of Materials)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Select existing raw materials required to produce 1 unit of this item. <span className="font-semibold text-slate-700">(Note: 5kg minimum)</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddIngredientRow}
                      className="px-4 py-1.5 sm:py-2 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[11px] sm:text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer inline-flex items-center gap-1.5 border border-[#d5ead7] whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#01390f] shrink-0" strokeWidth={2.5} />
                      <span>Add Ingredient</span>
                    </button>
                  </div>

                  {formData.ingredients.length === 0 ? (
                    <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                      No raw materials/ingredients added yet. Click &quot;+ Add Ingredient&quot; above.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {/* COLUMN HEADERS */}
                      <div className="grid grid-cols-12 gap-2 px-3 py-1 bg-slate-100/70 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        <div className="col-span-5">Raw Material</div>
                        <div className="col-span-3 text-center">Spec / %</div>
                        <div className="col-span-2 text-center">Theor. Wt (Qty)</div>
                        <div className="col-span-1 text-center">UOM</div>
                        <div className="col-span-1 text-center">Action</div>
                      </div>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                        {formData.ingredients.map((ing, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
                          >
                            {/* 1. SELECT RAW MATERIAL */}
                            <div className="col-span-5">
                              <select
                                value={ing.rawMaterialId || ''}
                                onChange={(e) => handleIngredientChange(idx, 'rawMaterialId', e.target.value)}
                                className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[#01390f] cursor-pointer truncate"
                              >
                                <option value="">-- Select Material --</option>
                                {sortedRawMaterialsList.map((mat) => {
                                  const matId = mat._id || mat.id;
                                  const matName = mat.itemName || mat.itemDescription || 'Material';
                                  return (
                                    <option key={matId} value={matId}>
                                      {matName}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>

                            {/* 2. SPECIFICATION / % */}
                            <div className="col-span-3">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="e.g. 78.50"
                                value={ing.specification || ''}
                                onChange={(e) => handleIngredientChange(idx, 'specification', e.target.value)}
                                onKeyDown={(e) => {
                                  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                                  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                                  if (e.key === '.' && !e.currentTarget.value.includes('.')) return;
                                  if (!/^[0-9]$/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono font-medium text-center focus:outline-none focus:border-[#01390f]"
                                title="Specification / Percentage (Numbers only)"
                              />
                            </div>

                            {/* 3. THEORETICAL WEIGHT / QTY */}
                            <div className="col-span-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="e.g. 3925"
                                value={ing.theoreticalWeight || (ing.quantity ? String(ing.quantity) : '')}
                                onChange={(e) => handleIngredientChange(idx, 'theoreticalWeight', e.target.value)}
                                onKeyDown={(e) => {
                                  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
                                  if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) return;
                                  if (e.key === '.' && !e.currentTarget.value.includes('.')) return;
                                  if (!/^[0-9]$/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center focus:outline-none focus:border-[#01390f]"
                                title="Theoretical Weight (in grams)"
                              />
                            </div>

                            {/* 4. UOM */}
                            <div className="col-span-1 text-center font-mono text-[11px] font-bold text-slate-600 uppercase">
                              {ing.uom || 'g'}
                            </div>

                            {/* 5. REMOVE BUTTON */}
                            <div className="col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveIngredientRow(idx)}
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold p-1 rounded-lg cursor-pointer transition-colors text-xs inline-flex items-center justify-center"
                                title="Remove Ingredient"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* TOTAL SUMMARY ROW (100% SPEC & 5000G THEORETICAL WEIGHT) */}
                      <div className="grid grid-cols-12 gap-2 items-center p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="col-span-5 font-bold text-slate-700 uppercase tracking-wide text-[11px] pl-1">
                          Total
                        </div>

                        {/* SPEC TOTAL */}
                        <div className="col-span-3 text-center">
                          <span
                            className={`font-mono font-bold text-xs ${isBOMSpecValid ? 'text-emerald-700' : 'text-slate-800'
                              }`}
                          >
                            {totalBOMSpec.toFixed(2)}%
                          </span>
                        </div>

                        {/* WEIGHT TOTAL */}
                        <div className="col-span-2 text-center">
                          <span
                            className={`font-mono font-bold text-xs ${isBOMWeightValid ? 'text-emerald-700' : 'text-slate-800'
                              }`}
                          >
                            {totalBOMWeight.toFixed(2)}
                          </span>
                        </div>

                        {/* UOM */}
                        <div className="col-span-1 text-center font-mono font-bold text-[11px] text-slate-600 uppercase">
                          g
                        </div>

                        {/* EMPTY ACTION COLUMN */}
                        <div className="col-span-1"></div>
                      </div>

                      {/* FORMULATION VALIDATION NOTICE */}
                      {!isBOMValid && formData.ingredients && formData.ingredients.length > 0 && (
                        <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold shrink-0">⚠️ Total Formulation:</span>
                            <span>
                              Currently <strong className="font-mono">{totalBOMSpec.toFixed(2)}%</strong> ({totalBOMWeight.toFixed(2)}g). Must reach exactly <strong className="font-mono">100.00%</strong> (5000g).
                              {totalBOMSpec < 100 && (
                                <span className="font-bold text-amber-800 ml-1">
                                  (Lacking: {(100 - totalBOMSpec).toFixed(2)}% / {(5000 - totalBOMWeight).toFixed(2)}g)
                                </span>
                              )}
                              {totalBOMSpec > 100 && (
                                <span className="font-bold text-rose-700 ml-1">
                                  (Excess: {(totalBOMSpec - 100).toFixed(2)}% / {(totalBOMWeight - 5000).toFixed(2)}g)
                                </span>
                              )}
                            </span>
                          </div>
                          {formData.ingredients.some((ing) => {
                            const name = (ing.name || '').toLowerCase();
                            return name.includes('water') || name.includes('aqua') || name.includes('purified');
                          }) && (
                            <button
                              type="button"
                              onClick={handleAutoBalanceWater}
                              className="px-3 py-1.5 bg-[#01390f] hover:bg-[#0a5219] text-white font-bold rounded-lg text-[11px] transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
                              title="Automatically adjust Water to reach 100.00% (5000g)"
                            >
                              Auto-Balance Water to 100%
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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
                  disabled={modalLoading}
                  title={!isBOMValid ? `Formulation must reach 100% (currently ${totalBOMSpec.toFixed(2)}%)` : 'Save Product'}
                  className={`px-6 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${isBOMValid
                    ? 'bg-[#01390f] hover:bg-[#0a5219] text-white disabled:opacity-50'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                >
                  {modalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span className="whitespace-nowrap">{modalLoading ? 'Saving...' : 'Save Product'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MASTER CATEGORIES, UOM & STOCK THRESHOLDS MODAL */}
      <MasterCategoryUomModal
        isOpen={isCategoryUomModalOpen}
        onClose={() => setIsCategoryUomModalOpen(false)}
        moduleType="finished_goods"
        initialTab={categoryUomInitialTab}
        existingCategories={filterCategories}
      />

      {/* PRODUCT IMAGE PREVIEW MODAL */}
      <ItemImageModal
        isOpen={Boolean(selectedImageItem)}
        onClose={() => setSelectedImageItem(null)}
        item={selectedImageItem}
      />

      {/* 6-DIGIT PIN AUTHENTICATION MODAL FOR BILL OF MATERIALS */}
      <PinAuthModal
        isOpen={Boolean(pinProtectedItem)}
        onClose={() => setPinProtectedItem(null)}
        onSuccess={() => {
          setViewIngredientsProduct(pinProtectedItem);
        }}
        targetItem={pinProtectedItem}
        title="Formula Access Authorization"
        subtitle="Enter 6-digit PIN code to view Bill of Materials formulation"
      />

      {/* 6-DIGIT PIN AUTHENTICATION MODAL FOR EDITING FINISHED PRODUCT & FORMULA */}
      <PinAuthModal
        isOpen={Boolean(editPinTargetItem)}
        onClose={() => setEditPinTargetItem(null)}
        onSuccess={() => {
          const target = editPinTargetItem;
          setEditPinTargetItem(null);
          handleEditProduct(target);
          showSuccessToast(`Access granted. Editing ${target.itemName || target.itemDescription || 'product'}.`);
        }}
        targetItem={editPinTargetItem}
        title="Edit Product Authorization"
        subtitle={`Enter 6-digit PIN code to edit ${editPinTargetItem?.itemName || editPinTargetItem?.itemDescription || 'Finished Product'} and formula`}
      />

      {/* CONFIRM ARCHIVE / RESTORE MODAL (MATCHES DASHBOARD LOGOUT MODAL DESIGN) */}
      {archiveTargetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-sans">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-[#D5EAD7] flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D5EAD7] bg-[#EDF7EE] shrink-0">
              <h3 className="text-sm font-bold text-[#01390f] whitespace-nowrap">
                {archiveTargetProduct.isArchived ? 'Restore Finished Product' : 'Archive Finished Product'}
              </h3>
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => setArchiveTargetProduct(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 flex flex-col gap-4">
              <div className="p-3.5 bg-[#EDF7EE] rounded-2xl border border-[#D5EAD7] text-[#01390f] flex items-start gap-3">
                <div>
                  <span className="block text-xs font-bold text-[#01390f] uppercase">
                    {archiveTargetProduct.isArchived ? 'Active Directory Restoration' : 'Product Archive Vault'}
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                    {archiveTargetProduct.isArchived
                      ? 'Restoring this product will make it available again in active inventory and production scheduling.'
                      : 'Moving this product to archive vault hides it from active listings while safely preserving all history, formula, and records.'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  Are you sure you want to {archiveTargetProduct.isArchived ? 'restore this product to active inventory' : 'move this product to archive vault'}?
                </p>
                <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs flex flex-col gap-1">
                  <span className="font-bold text-slate-800">
                    {archiveTargetProduct.itemDescription || archiveTargetProduct.itemName || 'Finished Good'}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span>Code: {archiveTargetProduct.code || 'N/A'}</span>
                    <span>•</span>
                    <span>Category: {archiveTargetProduct.category || 'Finished Goods'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS FOOTER */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                disabled={isArchiving}
                onClick={() => setArchiveTargetProduct(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isArchiving}
                onClick={executeToggleArchive}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {isArchiving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : archiveTargetProduct.isArchived ? (
                  <RotateCcw className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
                <span>{isArchiving ? 'Processing...' : 'Confirm'}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryFinishedGoods;