import React, { useState, useEffect, useCallback, useRef } from "react";
import axios, { API } from "../axios";
import { showSuccessToast, showErrorToast } from "../utils/toast";
import { INITIAL_DEFAULT_PRODUCTS } from "./InventoryFinishedGoods";
import ProductionTimeCalculatorModal from "./common/ProductionTimeCalculatorModal";
import {
  Layers,
  Calendar,
  Search,
  Plus,
  Factory,
  Loader2,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Package,
  Eye,
  Beaker,
  ArrowRight,
  RefreshCw,
  X,
  SlidersHorizontal,
  Scale,
  Settings,
  Sparkles,
  Check,
  ListPlus,
  FileDown,
  FileText,
  Filter,
  RotateCcw,
  Tag,
  Hash,
  ArrowUpDown,
  Pencil,
  Copy,
  Lock,
  Unlock,
  ShieldCheck
} from "lucide-react";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import TablePagination from './common/TablePagination';
import { resolveItemImageUrl } from './common/ItemImageModal';
import PinAuthModal from './common/PinAuthModal';

function HighlightMatch({ text, query }) {
  if (!text) return null;
  if (!query || !query.trim()) return <>{text}</>;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  const escapedTokens = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${escapedTokens})`, 'gi');
  const parts = String(text).split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-900 font-bold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// Standard Product Recipe BOM Presets
const RECIPE_PRESETS = [
  {
    id: 'serum',
    name: 'Face Serum Collagen Formula',
    matchKeywords: ['serum', 'collagen', 'face serum'],
    standardBatchWeight: 5,
    uom: 'kg',
    ingredients: [
      { materialCode: 'RM0001', name: 'Water', specification: '90.80', theoreticalWeight: '4540', quantity: 1, uom: 'g' },
      { materialCode: 'RM0002', name: 'Sodium Hyaluronate C', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0003', name: 'Sodium Benzoate', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' },
      { materialCode: 'RM0004', name: 'Potassium Sorbate', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' },
      { materialCode: 'RM0005', name: 'Tomato Extract', specification: '1.00', theoreticalWeight: '50', quantity: 1, uom: 'g' },
      { materialCode: 'RM0006', name: 'Witch Hazel Extract', specification: '1.00', theoreticalWeight: '50', quantity: 1, uom: 'g' },
      { materialCode: 'RM0007', name: 'Bust-A', specification: '0.80', theoreticalWeight: '40', quantity: 1, uom: 'g' },
      { materialCode: 'RM0008', name: 'Pore-MinEx', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' },
      { materialCode: 'RM0009', name: 'Cucumber Extract', specification: '1.00', theoreticalWeight: '50', quantity: 1, uom: 'g' },
      { materialCode: 'RM0010', name: 'Azelaic Optima', specification: '0.80', theoreticalWeight: '40', quantity: 1, uom: 'g' },
      { materialCode: 'RM0011', name: 'Phenoxyethanol', specification: '0.60', theoreticalWeight: '30', quantity: 1, uom: 'g' },
      { materialCode: 'RM0012', name: 'Scent', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' }
    ]
  },
  {
    id: 'lotion',
    name: 'Body Lotion Formula',
    matchKeywords: ['lotion', 'body lotion', 'sunscreen'],
    standardBatchWeight: 5,
    uom: 'kg',
    ingredients: [
      { materialCode: 'RM0001', name: 'Water', specification: '73.70', theoreticalWeight: '3685', quantity: 1, uom: 'g' },
      { materialCode: 'RM0013', name: 'Stearic Acid', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0014', name: 'Stearyl Alcohol', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0015', name: 'Cetyl Alcohol', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0016', name: 'Ceto-Stearyl Alcohol', specification: '6.00', theoreticalWeight: '300', quantity: 1, uom: 'g' },
      { materialCode: 'RM0026', name: 'Glycol Monostearate', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0017', name: 'Petroleum Jelly', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0018', name: 'Beeswax White Pellets', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0019', name: 'Dimethicone', specification: '1.00', theoreticalWeight: '50', quantity: 1, uom: 'g' },
      { materialCode: 'RM0020', name: 'SLES', specification: '0.40', theoreticalWeight: '20', quantity: 1, uom: 'g' },
      { materialCode: 'RM0003', name: 'Sodium Benzoate', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' },
      { materialCode: 'RM0024', name: 'Papaya Extract', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0023', name: 'Niacinamide', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' },
      { materialCode: 'RM0011', name: 'Phenoxyethanol', specification: '0.60', theoreticalWeight: '30', quantity: 1, uom: 'g' },
      { materialCode: 'RM0012', name: 'Scent', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' }
    ]
  },
  {
    id: 'conditioner',
    name: 'Hair Conditioner Formula',
    matchKeywords: ['conditioner', 'hair conditioner', 'hair'],
    standardBatchWeight: 5,
    uom: 'kg',
    ingredients: [
      { materialCode: 'RM0001', name: 'Water', specification: '67.70', theoreticalWeight: '3385', quantity: 1, uom: 'g' },
      { materialCode: 'RM0025', name: 'Cetrimonium Chloride', specification: '3.00', theoreticalWeight: '150', quantity: 1, uom: 'g' },
      { materialCode: 'RM0026', name: 'Glycol Monostearate', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0014', name: 'Stearyl Alcohol', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0015', name: 'Cetyl Alcohol', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0016', name: 'Ceto-Stearyl Alcohol', specification: '6.00', theoreticalWeight: '300', quantity: 1, uom: 'g' },
      { materialCode: 'RM0027', name: 'Coconut Oil', specification: '3.00', theoreticalWeight: '150', quantity: 1, uom: 'g' },
      { materialCode: 'RM0028', name: 'Argan Oil', specification: '5.00', theoreticalWeight: '250', quantity: 1, uom: 'g' },
      { materialCode: 'RM0018', name: 'Beeswax White Pellets', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0029', name: 'Polyquaternium 7', specification: '0.20', theoreticalWeight: '10', quantity: 1, uom: 'g' },
      { materialCode: 'RM0011', name: 'Phenoxyethanol', specification: '0.60', theoreticalWeight: '30', quantity: 1, uom: 'g' },
      { materialCode: 'RM0002', name: 'Sodium Hyaluronate C', specification: '1.00', theoreticalWeight: '50', quantity: 1, uom: 'g' },
      { materialCode: 'RM0030', name: 'Aloe Vera Extract', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0031', name: 'Hydrolyzed Keratin', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' },
      { materialCode: 'RM0032', name: 'D-Panthenol', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' },
      { materialCode: 'RM0033', name: 'Madre de Cacao Extract', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0012', name: 'Scent', specification: '0.50', theoreticalWeight: '25', quantity: 1, uom: 'g' }
    ]
  },
  {
    id: 'soap',
    name: 'Gluta Kojic Soap Formula',
    matchKeywords: ['soap', 'gluta', 'kojic'],
    standardBatchWeight: 5,
    uom: 'kg',
    ingredients: [
      { materialCode: 'RM0027', name: 'Coconut Oil', specification: '45.00', theoreticalWeight: '2250', quantity: 1, uom: 'g' },
      { materialCode: 'RM0034', name: 'Sodium Hydroxide (Lye)', specification: '15.00', theoreticalWeight: '750', quantity: 1, uom: 'g' },
      { materialCode: 'RM0001', name: 'Water', specification: '25.00', theoreticalWeight: '1250', quantity: 1, uom: 'g' },
      { materialCode: 'RM0035', name: 'Glutathione Powder', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0036', name: 'Kojic Acid Dipalmitate', specification: '2.00', theoreticalWeight: '100', quantity: 1, uom: 'g' },
      { materialCode: 'RM0024', name: 'Papaya Extract', specification: '3.00', theoreticalWeight: '150', quantity: 1, uom: 'g' },
      { materialCode: 'RM0037', name: 'Glycerin', specification: '5.00', theoreticalWeight: '250', quantity: 1, uom: 'g' },
      { materialCode: 'RM0012', name: 'Scent', specification: '3.00', theoreticalWeight: '150', quantity: 1, uom: 'g' }
    ]
  }
];

function InventoryWIP() {
  const API_URL = import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com/api'
    : 'http://localhost:5000/api';

  // Multi-source Instant Hydration (0ms load time)
  const getCachedProducts = () => {
    try {
      const keys = [
        'cached_inventory_products',
        'mhira_db_products',
        'cached_marketing_catalog',
        'inventory_products',
      ];
      for (const k of keys) {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          if (Array.isArray(parsed?.data) && parsed.data.length > 0) return parsed.data;
          if (Array.isArray(parsed?.products) && parsed.products.length > 0) return parsed.products;
        }
      }
    } catch (e) { }
    return INITIAL_DEFAULT_PRODUCTS;
  };

  const getCachedRawMaterials = () => {
    try {
      const keys = [
        'cached_inventory_raw_materials',
        'inventory_raw_materials',
        'raw_materials',
      ];
      for (const k of keys) {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          if (Array.isArray(parsed?.data) && parsed.data.length > 0) return parsed.data;
        }
      }
    } catch (e) { }
    return [];
  };

  const getCachedWipLogs = () => {
    try {
      const keys = [
        'cached_inventory_wip_logs',
        'inventory_wip_logs',
        'wip_logs',
      ];
      for (const k of keys) {
        const stored = localStorage.getItem(k);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          if (Array.isArray(parsed?.data) && parsed.data.length > 0) return parsed.data;
        }
      }
    } catch (e) { }
    return [];
  };

  // Data Sources
  const [allProducts, setAllProducts] = useState(getCachedProducts);
  const [allRawMaterials, setAllRawMaterials] = useState(getCachedRawMaterials);
  const [wipLogs, setWipLogs] = useState(getCachedWipLogs);
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(false);

  // Filter & View States
  const [viewMode, setViewMode] = useState('register'); // 'register' | 'logs'
  const [logsStatusFilter, setLogsStatusFilter] = useState('all');
  const [wipStatusFilter, setWipStatusFilter] = useState('all');
  const [wipProductFilter, setWipProductFilter] = useState('All');
  const [wipSortBy, setWipSortBy] = useState('newest');
  const [wipQuickFilter, setWipQuickFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAssistantSearch, setQuickAssistantSearch] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const uniqueWipProducts = React.useMemo(() => {
    const s = new Set();
    wipLogs.forEach((w) => {
      if (w.productName && w.productName.trim()) s.add(w.productName.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [wipLogs]);

  const activeWipFiltersCount = React.useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (wipStatusFilter !== 'all') count++;
    if (wipProductFilter !== 'All') count++;
    if (wipSortBy !== 'newest') count++;
    if (wipQuickFilter !== 'all') count++;
    return count;
  }, [searchQuery, wipStatusFilter, wipProductFilter, wipSortBy, wipQuickFilter]);

  const handleClearWipFilters = () => {
    setSearchQuery('');
    setWipStatusFilter('all');
    setLogsStatusFilter('all');
    setWipProductFilter('All');
    setWipSortBy('newest');
    setWipQuickFilter('all');
    setCurrentPage(1);
  };

  // Auto-generate code starting from WIP00001 (same as RM0001 and FG0001)
  const generateNextWipCode = (list) => {
    let maxNum = 0;
    if (Array.isArray(list)) {
      list.forEach((item) => {
        const codeStr = item.wipBatchCode || item.code || '';
        const match = codeStr.match(/^(?:WIP)(\d+)/i);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
    }
    const nextNum = maxNum + 1;
    return `WIP${String(nextNum).padStart(5, '0')}`;
  };

  // Form Controls
  const [wipBatchCode, setWipBatchCode] = useState(() => generateNextWipCode(getCachedWipLogs()));
  const [selectedProductId, setSelectedProductId] = useState("");
  const [numberOfBatches, setNumberOfBatches] = useState("1");
  const [totalBatchWeight, setTotalBatchWeight] = useState("5");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [isTargetQtyManual, setIsTargetQtyManual] = useState(false);
  const [producedQuantity, setProducedQuantity] = useState("");
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split("T")[0]);
  const [estimatedDuration, setEstimatedDuration] = useState("4");
  const [estimatedDurationUnit, setEstimatedDurationUnit] = useState("hours");

  // Rich Product Dropdown State
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('All');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const productDropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownListRef = useRef(null);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isProductDropdownOpen) {
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select?.();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isProductDropdownOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target)) {
        setIsProductDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [activeBatchSize, setActiveBatchSize] = useState(5);
  const [activeBatchUom, setActiveBatchUom] = useState('kg');
  // Set default exp date to 1 year from today
  const defaultExp = new Date();
  defaultExp.setFullYear(defaultExp.getFullYear() + 1);
  const [expDate, setExpDate] = useState(defaultExp.toISOString().split("T")[0]);

  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [isTimeCalcModalOpen, setIsTimeCalcModalOpen] = useState(false);

  // Modals state
  const [selectedLog, setSelectedLog] = useState(null);
  const [fulfillProducedQty, setFulfillProducedQty] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isFormulaUnlocked, setIsFormulaUnlocked] = useState(false);
  const [isFormulaPinModalOpen, setIsFormulaPinModalOpen] = useState(false);

  // Rejection & Scrap Audit states
  const [rejectionReason, setRejectionReason] = useState('Filling Spillage / Overflow');
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [rejectionApprover, setRejectionApprover] = useState('Production QC Supervisor');
  const [rejectionDisposition, setRejectionDisposition] = useState('Scrap / Dispose');

  const handleOpenFulfillModal = (log) => {
    setSelectedLog(log);
    setIsFormulaUnlocked(false);
    setIsFormulaPinModalOpen(false);
    const target = Number(log.targetQuantity || log.producedQuantity || 0);
    setFulfillProducedQty(String(target));
    setRejectionReason('Filling Spillage / Overflow');
    setCustomRejectionReason('');
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setRejectionApprover(u.name || u.fullName || u.username || 'Production QC Supervisor');
      } else {
        setRejectionApprover('Production QC Supervisor');
      }
    } catch (e) {
      setRejectionApprover('Production QC Supervisor');
    }
    setRejectionDisposition('Scrap / Dispose');
  };

  // Filter pending WIP logs for Quick-Assistant
  const pendingWipBatches = React.useMemo(() => {
    return wipLogs.filter(
      (log) => log.status !== 'Completed' || (Number(log.pendingQuantity) || 0) > 0
    );
  }, [wipLogs]);

  const filteredPendingBatches = React.useMemo(() => {
    if (!quickAssistantSearch.trim()) return pendingWipBatches;
    const q = quickAssistantSearch.toLowerCase().trim();
    return pendingWipBatches.filter((log) => {
      const code = (log.wipBatchCode || '').toLowerCase();
      const prod = (log.productName || '').toLowerCase();
      const pCode = (log.productCode || '').toLowerCase();
      return code.includes(q) || prod.includes(q) || pCode.includes(q);
    });
  }, [pendingWipBatches, quickAssistantSearch]);

  // Initial Fetch Data
  const fetchProducts = useCallback(async () => {
    try {
      setFetchingProducts(true);
      const token = localStorage.getItem("token");
      const res = await API.get('/api/inventory-products', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(async () => {
        return await API.get('/api/products').catch(() => ({ data: [] }));
      });
      const raw = Array.isArray(res.data)
        ? res.data
        : (res.data?.data || res.data?.products || res.data?.items || []);
      if (Array.isArray(raw) && raw.length > 0) {
        setAllProducts(raw);
        try {
          localStorage.setItem('cached_inventory_products', JSON.stringify(raw));
        } catch (e) { }
      } else {
        setAllProducts((prev) => (prev && prev.length > 0 ? prev : INITIAL_DEFAULT_PRODUCTS));
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setAllProducts((prev) => (prev && prev.length > 0 ? prev : INITIAL_DEFAULT_PRODUCTS));
    } finally {
      setFetchingProducts(false);
    }
  }, []);

  // Unique Product Categories list
  const uniqueCategories = React.useMemo(() => {
    const set = new Set();
    allProducts.forEach((p) => {
      const c = p.category || p.itemGroup || p.brand || p.Segment || p.segment;
      if (c && String(c).trim() !== '' && String(c).trim().toLowerCase() !== 'all') {
        set.add(String(c).trim());
      }
    });
    return Array.from(set).sort();
  }, [allProducts]);

  const availableProductCategories = React.useMemo(() => {
    return ['All', ...uniqueCategories];
  }, [uniqueCategories]);

  // High-performance tokenized normalized multi-attribute search with scoring
  const filteredProductsList = React.useMemo(() => {
    let list = allProducts;

    if (selectedProductCategory !== 'All' && selectedProductCategory !== 'All Categories') {
      list = list.filter((p) => (p.category || p.itemGroup || p.brand || p.Segment || p.segment || 'Finished Goods') === selectedProductCategory);
    }

    const rawTerm = productSearchTerm.trim().toLowerCase();
    if (!rawTerm) return list;

    const tokens = rawTerm.split(/\s+/).filter(Boolean);
    const compactTerm = rawTerm.replace(/[^a-z0-9]/g, '');

    const scored = [];

    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const code = String(p.code || '').toLowerCase();
      const codeCompact = code.replace(/[^a-z0-9]/g, '');
      const name = String(p.itemName || p.itemDescription || p.name || '').toLowerCase();
      const nameCompact = name.replace(/[^a-z0-9]/g, '');
      const spec = String(p.specification || '').toLowerCase();
      const specCompact = spec.replace(/[^a-z0-9]/g, '');
      const uom = String(p.uom || '').toLowerCase();
      const cat = String(p.category || '').toLowerCase();
      const brand = String(p.brand || p.manufacturer || '').toLowerCase();

      const fullCorpus = `${code} ${name} ${spec} ${uom} ${cat} ${brand} ${codeCompact} ${specCompact}`;

      const allTokensMatch = tokens.every((token) => {
        const tokenCompact = token.replace(/[^a-z0-9]/g, '');
        return (
          fullCorpus.includes(token) ||
          (tokenCompact && fullCorpus.includes(tokenCompact))
        );
      });

      if (
        allTokensMatch ||
        (compactTerm &&
          (codeCompact.includes(compactTerm) ||
            nameCompact.includes(compactTerm) ||
            specCompact.includes(compactTerm)))
      ) {
        let score = 0;
        if (code === rawTerm || codeCompact === compactTerm) score += 100;
        else if (code.startsWith(rawTerm) || codeCompact.startsWith(compactTerm)) score += 60;
        else if (code.includes(rawTerm)) score += 40;

        if (name === rawTerm) score += 80;
        else if (name.startsWith(rawTerm)) score += 50;
        else if (name.includes(rawTerm)) score += 30;

        if (spec.includes(rawTerm) || specCompact.includes(compactTerm)) score += 25;
        if (cat.includes(rawTerm)) score += 10;

        scored.push({ product: p, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.product);
  }, [allProducts, productSearchTerm, selectedProductCategory]);

  // Keep highlightedIndex in valid bounds
  useEffect(() => {
    setHighlightedIndex((prev) => {
      if (filteredProductsList.length === 0) return 0;
      return Math.min(prev, filteredProductsList.length - 1);
    });
  }, [filteredProductsList]);

  // Keyboard navigation inside dropdown
  const handleDropdownKeyDown = (e) => {
    if (!isProductDropdownOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsProductDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredProductsList.length - 1 ? prev + 1 : 0;
        const el = document.getElementById(`wip-prod-item-${next}`);
        el?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredProductsList.length - 1;
        const el = document.getElementById(`wip-prod-item-${next}`);
        el?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProductsList.length > 0 && filteredProductsList[highlightedIndex]) {
        const p = filteredProductsList[highlightedIndex];
        const syntheticEvent = { target: { value: p._id || p.id } };
        handleProductSelect(syntheticEvent);
        setIsProductDropdownOpen(false);
        setProductSearchTerm('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsProductDropdownOpen(false);
    }
  };

  const fetchRawMaterials = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await API.get('/api/inventory-raw-materials', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(() => ({ data: [] }));
      const raw = Array.isArray(res.data)
        ? res.data
        : (res.data?.data || res.data?.rawMaterials || res.data?.items || []);
      if (Array.isArray(raw) && raw.length > 0) {
        setAllRawMaterials(raw);
        try {
          localStorage.setItem('cached_inventory_raw_materials', JSON.stringify(raw));
        } catch (e) { }
      }
    } catch (err) {
      console.error("Error fetching raw materials:", err);
    }
  }, []);

  const fetchWIPLogs = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await API.get('/api/inventory-wip', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(async () => {
        return await axios.get(`${API_URL}/inventory-wip`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).catch(() => ({ data: [] }));
      });
      const logs = Array.isArray(res.data)
        ? res.data
        : (res.data?.data || res.data?.wips || []);

      if (Array.isArray(logs)) {
        setWipLogs(logs);
        setWipBatchCode(generateNextWipCode(logs));
        if (logs.length > 0) {
          try {
            localStorage.setItem('cached_inventory_wip_logs', JSON.stringify(logs));
          } catch (e) { }
        }
      }

      // Compute and broadcast pending WIP count for Sidebar notification banner
      const pendingCount = (logs || []).filter(
        (log) => log.status !== 'Completed' || (Number(log.pendingQuantity) || 0) > 0
      ).length;
      try {
        localStorage.setItem('pending_wip_count', String(pendingCount));
        window.dispatchEvent(new CustomEvent('wipCountUpdated', { detail: pendingCount }));
      } catch (e) { }
    } catch (err) {
      console.error("Error fetching WIP logs:", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchProducts();
    fetchRawMaterials();
    fetchWIPLogs();
  }, [fetchProducts, fetchRawMaterials, fetchWIPLogs]);

  // Get selected product object
  const selectedProduct = allProducts.find((p) => (p._id || p.id) === selectedProductId);

  // Dynamic Batch & Multiplier Calculations
  const masterBatchSize = Number(activeBatchSize) || 5;
  const batchUom = activeBatchUom || 'kg';

  // Unit net weight & theoretical pieces calculation
  const parsedUnitGrams = React.useMemo(() => {
    if (!selectedProduct) return 100;
    // 1. Explicit netWeight if defined
    const weightStr = selectedProduct.netWeight || '';
    const netWeightNum = parseFloat(String(weightStr).replace(/[^0-9.]/g, ''));
    if (netWeightNum > 0) return netWeightNum;

    // 2. Specification value
    const specNum = parseFloat(String(selectedProduct.specification || '').replace(/[^0-9.]/g, ''));
    const uomStr = String(selectedProduct.uom || '').toLowerCase().trim();

    // If specification is realistic volume/weight (> 1 mL or grams)
    if (specNum > 1) {
      if (uomStr === 'kg' || uomStr === 'l') return specNum * 1000;
      return specNum;
    }

    // If specNum is 1 and uom is 'pcs' / 'piece', 1 represents unit packaging count, not 1 gram!
    // A standard retail bottle/bar/tub in cosmetic formulations is ~100g/mL
    if (specNum === 1 && (uomStr === 'pcs' || uomStr === 'pc' || uomStr === 'piece' || uomStr === 'pieces' || uomStr === 'unit')) {
      return 100;
    }

    if (specNum > 0) return specNum;
    return 100;
  }, [selectedProduct]);

  const unitWeightDisplay = React.useMemo(() => {
    if (!selectedProduct) return '';
    const specNum = parseFloat(String(selectedProduct.specification || '').replace(/[^0-9.]/g, ''));
    const uomStr = String(selectedProduct.uom || '').toLowerCase().trim();
    if (specNum > 1) {
      return `${selectedProduct.specification} ${selectedProduct.uom || 'mL'}`;
    }
    if (selectedProduct.netWeight) {
      return selectedProduct.netWeight;
    }
    return `${parsedUnitGrams}g`;
  }, [selectedProduct, parsedUnitGrams]);

  // Standard pieces yield for 1 single batch
  const singleBatchStandardPcs = React.useMemo(() => {
    const factor = batchUom.toLowerCase() === 'kg' || batchUom.toLowerCase() === 'l' ? 1000 : 1;
    const singleBatchGrams = masterBatchSize * factor;
    return Math.floor(singleBatchGrams / parsedUnitGrams) || 100;
  }, [masterBatchSize, batchUom, parsedUnitGrams]);

  const theoreticalPiecesYield = React.useMemo(() => {
    if (!selectedProduct) return 0;
    const factor = batchUom.toLowerCase() === 'kg' || batchUom.toLowerCase() === 'l' ? 1000 : 1;
    const currentWeight = Number(totalBatchWeight) || (masterBatchSize * (Number(numberOfBatches) || 1));
    const totalGrams = currentWeight * factor;
    return Math.floor(totalGrams / parsedUnitGrams);
  }, [selectedProduct, totalBatchWeight, numberOfBatches, masterBatchSize, batchUom, parsedUnitGrams]);

  // Effective multiplier for ingredients deduction
  const effectiveMultiplier = React.useMemo(() => {
    return Number(totalBatchWeight) > 0 && masterBatchSize > 0
      ? Number(totalBatchWeight) / masterBatchSize
      : (Number(numberOfBatches) > 0 ? Number(numberOfBatches) : 1);
  }, [totalBatchWeight, masterBatchSize, numberOfBatches]);

  // Compute ingredients requirements based on recipe & effectiveMultiplier
  const ingredientsCalculation = React.useMemo(() => {
    if (!selectedProduct) return [];

    // Auto-resolve recipe ingredients from product or standard preset (e.g. FACE SERUM COLLAGEN)
    let rawList = Array.isArray(selectedProduct.ingredients) && selectedProduct.ingredients.length > 0
      ? selectedProduct.ingredients
      : [];

    if (rawList.length === 0) {
      const name = `${selectedProduct.itemName || ''} ${selectedProduct.itemDescription || ''} ${selectedProduct.code || ''}`.toLowerCase();
      const matched = RECIPE_PRESETS.find((preset) =>
        preset.matchKeywords.some((kw) => name.includes(kw))
      );
      if (matched && Array.isArray(matched.ingredients)) {
        rawList = matched.ingredients;
      }
    }

    return rawList.map((ing) => {
      const unitTheorWeight = parseFloat(String(ing.theoreticalWeight || ing.quantity || 0).replace(/[^0-9.]/g, '')) || 0;
      const totalReq = parseFloat((unitTheorWeight * effectiveMultiplier).toFixed(2));
      const totalDeducted = totalReq;

      // Find stock in raw materials
      const matInStock = allRawMaterials.find(
        (m) =>
          (m._id || m.id) === ing.rawMaterialId ||
          m.code === ing.materialCode ||
          (m.itemName && ing.name && m.itemName.toLowerCase() === ing.name.toLowerCase())
      );

      const isBlockedSpec = Boolean(
        matInStock && (matInStock.qcStatus === 'Quarantine' || matInStock.qcStatus === 'Rejected')
      );

      // Blocked out-of-spec materials cannot be allocated in production
      const availStock = isBlockedSpec ? 0 : (matInStock ? Number(matInStock.quantity) || 0 : 0);
      const shortageQty = Math.max(0, totalReq - availStock);

      return {
        rawMaterialId: matInStock ? (matInStock._id || matInStock.id) : ing.rawMaterialId,
        materialCode: ing.materialCode || (matInStock ? matInStock.code : ''),
        name: ing.name || (matInStock ? matInStock.itemName : 'Raw Material'),
        specification: ing.specification || '',
        theoreticalWeight: ing.theoreticalWeight || (ing.quantity ? String(ing.quantity) : ''),
        unitRequired: unitTheorWeight,
        totalRequired: totalReq,
        qtyDeducted: totalDeducted,
        availStock,
        shortageQty,
        isBlockedSpec,
        qcStatus: matInStock ? (matInStock.qcStatus || 'Pass') : 'Pass',
        uom: ing.uom || 'g'
      };
    });
  }, [selectedProduct, effectiveMultiplier, allRawMaterials]);

  // Check for Out-of-Specification (Quarantine / Rejected) blocked materials
  const blockedSpecMaterials = React.useMemo(() => {
    return ingredientsCalculation.filter((ing) => ing.isBlockedSpec);
  }, [ingredientsCalculation]);

  const hasBlockedSpec = blockedSpecMaterials.length > 0;

  // Maximum produced possible with current stock
  const maxPossibleProduced = React.useMemo(() => {
    if (ingredientsCalculation.length === 0) return Number(targetQuantity) || 0;
    let minQty = Number(targetQuantity) || 0;

    ingredientsCalculation.forEach((ing) => {
      if (ing.unitRequired > 0) {
        const possible = Math.floor(ing.availStock / ing.unitRequired);
        if (possible < minQty) {
          minQty = possible;
        }
      }
    });
    return Math.max(0, minQty);
  }, [ingredientsCalculation, targetQuantity]);

  // Check if current recipe has material shortage
  const hasShortage = React.useMemo(() => {
    return ingredientsCalculation.some((ing) => (Number(ing.shortageQty) || 0) > 0);
  }, [ingredientsCalculation]);

  // Sync target quantity automatically when theoretical pieces yield updates
  useEffect(() => {
    if (theoreticalPiecesYield > 0 && !isTargetQtyManual) {
      setTargetQuantity(String(theoreticalPiecesYield));
    }
  }, [theoreticalPiecesYield, isTargetQtyManual]);

  // Handle Product Select
  const handleProductSelect = (e) => {
    const pId = e.target.value;
    setSelectedProductId(pId);
    const prod = allProducts.find((p) => (p._id || p.id) === pId);
    if (prod) {
      const bSize = Number(prod.standardBatchSize) || 5;
      const bUom = prod.batchSizeUom || 'kg';
      const specNum = parseFloat(String(prod.specification || '').replace(/[^0-9.]/g, ''));
      const uomStr = String(prod.uom || '').toLowerCase().trim();
      const weightNum = parseFloat(String(prod.netWeight || '').replace(/[^0-9.]/g, ''));
      const parsedGrams = weightNum > 0
        ? weightNum
        : (specNum > 1
          ? (uomStr === 'kg' || uomStr === 'l' ? specNum * 1000 : specNum)
          : (specNum === 1 && (uomStr === 'pcs' || uomStr === 'pc' || uomStr === 'piece' || uomStr === 'pieces' || uomStr === 'unit') ? 100 : (specNum > 0 ? specNum : 100)));

      setActiveBatchSize(bSize);
      setActiveBatchUom(bUom);

      const factor = bUom.toLowerCase() === 'kg' || bUom.toLowerCase() === 'l' ? 1000 : 1;
      const suggested = Math.floor((bSize * factor) / parsedGrams);

      setIsTargetQtyManual(false);
      setNumberOfBatches("1");
      setTotalBatchWeight(String(bSize));
      setTargetQuantity(suggested > 0 ? String(suggested) : "50");

      if (!wipBatchCode || wipBatchCode.trim() === '' || wipBatchCode.startsWith('WIP-') || wipBatchCode.startsWith('BATCH-')) {
        setWipBatchCode(generateNextWipCode(wipLogs));
      }
    }
  };

  // Two-way synchronization handlers for bulk cooking inputs
  const handleBatchesChange = (val) => {
    setNumberOfBatches(val);
    const n = Number(val);
    if (!isNaN(n) && n > 0) {
      const totalW = parseFloat((masterBatchSize * n).toFixed(2));
      setTotalBatchWeight(String(totalW));
    }
  };

  const handleTotalWeightChange = (val) => {
    setTotalBatchWeight(val);
    const w = Number(val);
    if (!isNaN(w) && w > 0 && masterBatchSize > 0) {
      const calculatedBatches = parseFloat((w / masterBatchSize).toFixed(2));
      setNumberOfBatches(String(calculatedBatches));
    }
  };

  // Generate & Download WIP Batch PDF
  const handleDownloadWipPdf = (log) => {
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
      doc.text('WORK-IN-PROGRESS (WIP) PRODUCTION BATCH SHEET', 14, 17);

      doc.setFont('helvetica', 'bold');
      doc.text(`BATCH: ${log.wipBatchCode || 'N/A'}`, 196, 14, { align: 'right' });

      // Document Info / Metadata Block
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 28, 182, 34, 3, 3, 'FD');

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(8);

      // Col 1
      doc.setFont('helvetica', 'bold');
      doc.text('FINISHED GOOD:', 18, 35);
      doc.setFont('helvetica', 'normal');
      doc.text(`${log.productName || 'N/A'}${log.productCode ? ` [${log.productCode}]` : ''}`, 50, 35);

      doc.setFont('helvetica', 'bold');
      doc.text('BATCH NUMBER:', 18, 42);
      doc.setTextColor(1, 57, 15);
      doc.text(`${log.wipBatchCode || 'N/A'}`, 50, 42);
      doc.setTextColor(51, 65, 85);

      doc.setFont('helvetica', 'bold');
      doc.text('PRODUCTION YIELD:', 18, 49);
      doc.setFont('helvetica', 'normal');
      doc.text(`Target: ${log.targetQuantity || 0} pcs  |  Actual Output: ${log.producedQuantity || 0} pcs`, 50, 49);

      doc.setFont('helvetica', 'bold');
      doc.text('BATCH STATUS:', 18, 56);
      const isPending = Boolean((log.pendingQuantity || 0) > 0 || log.status === 'Pending / Shortage');
      if (isPending) {
        doc.setTextColor(180, 83, 9);
        doc.text(`PENDING (${log.pendingQuantity || 0} pcs short)`, 50, 56);
      } else {
        doc.setTextColor(1, 57, 15);
        doc.text('COMPLETED / FULFILLED', 50, 56);
      }
      doc.setTextColor(51, 65, 85);

      // Col 2
      doc.setFont('helvetica', 'bold');
      doc.text('MFG DATE:', 122, 35);
      doc.setFont('helvetica', 'normal');
      doc.text(`${log.mfgDate ? new Date(log.mfgDate).toLocaleDateString() : 'N/A'}`, 155, 35);

      doc.setFont('helvetica', 'bold');
      doc.text('EXPIRATION DATE:', 122, 42);
      doc.setFont('helvetica', 'normal');
      doc.text(`${log.expDate ? new Date(log.expDate).toLocaleDateString() : 'N/A'}`, 155, 42);

      doc.setFont('helvetica', 'bold');
      doc.text('BULK BATCH SIZE:', 122, 49);
      doc.setFont('helvetica', 'normal');
      doc.text(`${log.numberOfBatches || 1} Batch (${log.totalBatchWeight || 30} ${String(log.batchWeightUom || 'kg').toUpperCase()})`, 155, 49);

      doc.setFont('helvetica', 'bold');
      doc.text('RECORD CREATED:', 122, 56);
      doc.setFont('helvetica', 'normal');
      doc.text(`${new Date(log.createdAt || Date.now()).toLocaleDateString()}`, 155, 56);

      // Table of Ingredients / Raw Materials BOM
      const tableHead = [
        ['#', 'Raw Material Ingredient', 'Spec / %', 'Recipe (1 Batch)', 'Total Deducted Qty', 'UOM', 'Deduction Status']
      ];

      const tableBody = (log.ingredientsUsed || []).map((ing, idx) => [
        idx + 1,
        ing.name || ing.materialCode || 'Raw Material',
        ing.specification ? `${ing.specification}%` : '-',
        ing.theoreticalWeight || (ing.unitRequired ? String(ing.unitRequired) : '0'),
        `-${ing.qtyDeducted || 0}`,
        (ing.uom || 'pcs').toUpperCase(),
        isPending && (ing.shortageQty || 0) > 0 ? `Shortage: -${ing.shortageQty}` : 'Deducted from Stock'
      ]);

      autoTable(doc, {
        startY: 68,
        head: tableHead,
        body: tableBody.length > 0 ? tableBody : [['-', 'No ingredients recorded for this batch', '-', '-', '-', '-', '-']],
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
          1: { fontStyle: 'bold', halign: 'left', cellWidth: 58 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 24 },
          4: { fontStyle: 'bold', halign: 'center', textColor: [180, 20, 20], cellWidth: 26 },
          5: { halign: 'center', cellWidth: 16 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 28 },
        },
        theme: 'grid',
      });

      let finalY = doc.lastAutoTable.finalY + 10;

      // Rejection / Scrap Loss Audit in PDF
      if (log.rejectedQuantity > 0 && finalY + 20 < 270) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 202, 202);
        doc.roundedRect(14, finalY, 182, 14, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(185, 28, 28);
        doc.text(`QC SCRAP LOSS: ${log.rejectedQuantity} PCS REJECTED (Target: ${log.targetQuantity || 0} pcs | Stocked: ${log.producedQuantity || 0} pcs)`, 18, finalY + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Reason: ${log.rejectionReason || 'Spillage / Defect'}  |  Inspector: ${log.rejectionApprover || 'QC Inspector'}  |  Audit Log: ${log.scrapLogId || 'LOGGED'}`, 18, finalY + 10.5);
        finalY += 18;
      } else {
        finalY += 4;
      }

      // Quality and Authorization Signatures
      if (finalY + 35 < 285) {
        doc.setDrawColor(180, 180, 180);
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');

        doc.line(14, finalY + 18, 65, finalY + 18);
        doc.text('PREPARED BY (Production Lead)', 14, finalY + 22);

        doc.line(78, finalY + 18, 130, finalY + 18);
        doc.text('VERIFIED BY (Quality Assurance)', 78, finalY + 22);

        doc.line(143, finalY + 18, 196, finalY + 18);
        doc.text('APPROVED BY (Plant Manager)', 143, finalY + 22);
      }

      // Footer
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated automatically by CRM Inventory System | Date: ${new Date().toLocaleString()}`, 14, 290);

      doc.save(`WIP_Batch_${log.wipBatchCode || 'Report'}.pdf`);
      showSuccessToast(`Downloaded PDF for Batch ${log.wipBatchCode}`);
    } catch (err) {
      console.error('Error generating WIP PDF:', err);
      showErrorToast('Failed to generate WIP PDF.');
    }
  };

  // Open Confirmation Modal
  const handleOpenConfirm = (e) => {
    if (e) e.preventDefault();

    if (!wipBatchCode || !wipBatchCode.trim()) {
      showErrorToast("Please enter a Batch No.");
      return;
    }

    const trimmedCode = wipBatchCode.trim().toLowerCase();
    const isExisting = wipLogs.some(
      (log) => (log.wipBatchCode || '').toLowerCase().trim() === trimmedCode
    );

    if (isExisting) {
      showErrorToast(`Batch No. "${wipBatchCode.trim()}" already exists. Please use a unique Batch No.`);
      return;
    }

    if (!selectedProductId) {
      showErrorToast("Please select a Finished Product to produce.");
      return;
    }

    if (Number(targetQuantity) <= 0) {
      showErrorToast("Target Quantity must be greater than 0.");
      return;
    }

    if (Number(producedQuantity) < 0) {
      showErrorToast("Produced Quantity cannot be negative.");
      return;
    }

    if (Number(producedQuantity) > Number(targetQuantity)) {
      showErrorToast(`Actual Produced Quantity (${producedQuantity}) cannot exceed Target Production Quantity (${targetQuantity}).`);
      return;
    }

    const minAllowedExp = mfgDate || new Date().toISOString().split("T")[0];
    if (expDate && expDate < minAllowedExp) {
      showErrorToast(`Expiration Date cannot be earlier than ${minAllowedExp}.`);
      return;
    }

    setIsConfirmOpen(true);
  };

  // Submit WIP Batch Confirm
  const handleSubmitBatch = async () => {
    if (hasBlockedSpec) {
      showErrorToast("Cannot queue production: One or more raw materials are flagged as Out-of-Specification (Quarantine/Rejected).");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const payload = {
        wipBatchCode: wipBatchCode.trim().toUpperCase(),
        productId: selectedProduct._id || selectedProduct.id,
        productCode: selectedProduct.code || '',
        productName: selectedProduct.itemName || selectedProduct.itemDescription || 'Finished Product',
        numberOfBatches: Number(numberOfBatches) || 1,
        totalBatchWeight: Number(totalBatchWeight) || (masterBatchSize * (Number(numberOfBatches) || 1)),
        batchWeightUom: batchUom,
        targetQuantity: Number(targetQuantity) || 0,
        producedQuantity: 0,
        pendingQuantity: Number(targetQuantity) || 0,
        mfgDate,
        expDate,
        estimatedDuration: Number(estimatedDuration) || 0,
        estimatedDurationUnit: estimatedDurationUnit || 'hours',
        ingredientsUsed: ingredientsCalculation.map((ing) => ({
          rawMaterialId: ing.rawMaterialId,
          materialCode: ing.materialCode,
          name: ing.name,
          specification: ing.specification,
          theoreticalWeight: ing.theoreticalWeight,
          unitRequired: ing.unitRequired,
          totalRequired: ing.totalRequired,
          qtyDeducted: ing.qtyDeducted,
          uom: ing.uom,
          shortageQty: ing.shortageQty
        }))
      };

      const res = await API.post('/api/inventory-wip', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).catch(async () => {
        return await axios.post(`${API_URL}/inventory-wip`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      });

      showSuccessToast(
        `WIP Batch "${payload.wipBatchCode}" queued in Production! Click it in Quick-Assistant above once batch is physically finished to fulfill transaction.`
      );
      fetchWIPLogs();
      fetchRawMaterials();
      setIsConfirmOpen(false);

      // Reset Form fields
      setSelectedProductId("");
      setNumberOfBatches("1");
      setTotalBatchWeight("5");
      setTargetQuantity("");
      setIsTargetQtyManual(false);
      setProducedQuantity("");
      setWipBatchCode(generateNextWipCode(wipLogs));
    } catch (err) {
      console.error("Error creating WIP batch:", err);
      showErrorToast(err.response?.data?.message || "Failed to create WIP batch.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle change for fulfill produced quantity (capped at targetQuantity)
  const handleFulfillProducedQtyChange = (val, maxTarget) => {
    const num = Number(val);
    if (isNaN(num)) {
      setFulfillProducedQty('');
      return;
    }
    if (num > maxTarget) {
      setFulfillProducedQty(String(maxTarget));
      showErrorToast(`Actual produced quantity cannot exceed target yield (${maxTarget} pcs).`);
    } else if (num < 0) {
      setFulfillProducedQty('0');
    } else {
      setFulfillProducedQty(String(num));
    }
  };

  // Fulfill / Complete Pending Batch (Deduct raw materials, add finished goods, and log scrap)
  const handleCompleteBatch = async (batchId, actualQty, maxTarget) => {
    try {
      const maxAllowed = Number(maxTarget) || Infinity;
      const validQty = Math.max(0, Math.min(Number(actualQty) || 0, maxAllowed));
      const calculatedRejects = Math.max(0, maxAllowed - validQty);

      const payload = {
        actualProducedQuantity: validQty,
        rejectedQuantity: calculatedRejects,
        rejectionReason: rejectionReason === 'Other' && customRejectionReason.trim()
          ? customRejectionReason.trim()
          : rejectionReason,
        rejectionApprover: rejectionApprover.trim() || 'Production QC Supervisor',
        rejectionDisposition: rejectionDisposition || 'Scrap / Dispose',
      };

      setCompletingId(batchId);
      const token = localStorage.getItem("token");
      const res = await API.put(
        `/api/inventory-wip/${batchId}/complete`,
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      ).catch(async () => {
        return await axios.put(
          `${API_URL}/inventory-wip/${batchId}/complete`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      });

      // Optimistically update local product quantities
      if (selectedLog && validQty > 0) {
        const pId = selectedLog.productId;
        const pCode = selectedLog.productCode;
        const pName = selectedLog.productName;

        setAllProducts((prev) => {
          const next = prev.map((prod) => {
            const isMatch =
              (pId && (prod._id === pId || prod.id === pId)) ||
              (pCode && prod.code === pCode) ||
              (pName && (prod.itemName === pName || prod.itemDescription === pName));

            if (isMatch) {
              return { ...prod, quantity: (Number(prod.quantity) || 0) + validQty };
            }
            return prod;
          });
          try {
            localStorage.setItem('cached_inventory_products', JSON.stringify(next));
          } catch (e) { }
          return next;
        });

        // Trigger storage event for other components (like Finished Goods tab)
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('inventory_products_updated'));
      }

      if (calculatedRejects > 0) {
        showSuccessToast(
          `Production Batch fulfilled! ${validQty} pcs stocked to inventory and ${calculatedRejects} rejected pcs audited in Scrap Log. 🛡️`
        );
      } else {
        showSuccessToast(res.data?.message || "Production Batch successfully completed and stock updated!");
      }
      fetchWIPLogs();
      fetchRawMaterials();
      fetchProducts();
      setSelectedLog(null);
    } catch (err) {
      console.error("Error completing WIP batch:", err);
      showErrorToast(err.response?.data?.message || "Failed to complete WIP batch.");
    } finally {
      setCompletingId(null);
    }
  };

  // Filter logs by search query, status, product, quick filter and sorting
  const filteredWipLogs = React.useMemo(() => {
    let result = wipLogs.filter((w) => {
      const isPending = w.status === 'Pending / Shortage' || (Number(w.pendingQuantity) || 0) > 0;

      // 1. Quick filter
      if (wipQuickFilter === 'pending' && !isPending) return false;
      if (wipQuickFilter === 'completed' && isPending) return false;

      // 2. Status dropdown
      if (wipStatusFilter === 'completed' && isPending) return false;
      if (wipStatusFilter === 'pending' && !isPending) return false;

      // 3. Product dropdown
      if (wipProductFilter !== 'All') {
        if ((w.productName || '').toLowerCase() !== wipProductFilter.toLowerCase()) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (w.wipBatchCode || '').toLowerCase();
        const prod = (w.productName || '').toLowerCase();
        const pCode = (w.productCode || '').toLowerCase();
        const status = (w.status || '').toLowerCase();
        if (!code.includes(q) && !prod.includes(q) && !pCode.includes(q) && !status.includes(q)) return false;
      }

      return true;
    });

    // Sorting
    if (wipSortBy === 'newest') {
      result.sort((a, b) => new Date(b.mfgDate || b.createdAt || 0) - new Date(a.mfgDate || a.createdAt || 0));
    } else if (wipSortBy === 'oldest') {
      result.sort((a, b) => new Date(a.mfgDate || a.createdAt || 0) - new Date(b.mfgDate || b.createdAt || 0));
    } else if (wipSortBy === 'batch_asc') {
      result.sort((a, b) => (a.wipBatchCode || '').localeCompare(b.wipBatchCode || ''));
    } else if (wipSortBy === 'yield_desc') {
      result.sort((a, b) => (Number(b.targetQuantity || 0)) - (Number(a.targetQuantity || 0)));
    }

    return result;
  }, [wipLogs, searchQuery, wipStatusFilter, wipProductFilter, wipSortBy, wipQuickFilter]);

  // Reset pagination on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, wipStatusFilter, wipProductFilter, wipSortBy, wipQuickFilter, viewMode]);

  const paginatedWipLogs = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWipLogs.slice(start, start + itemsPerPage);
  }, [filteredWipLogs, currentPage, itemsPerPage]);

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700">

      {/* QUICK-ASSISTANT CONTAINER FOR PENDING WIP BATCHES (SEPARATE TOP CONTAINER) */}
      {pendingWipBatches.length > 0 && (
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 sm:p-3.5 flex flex-col gap-2.5 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          {/* HEADER BANNER & COMPACT FILTER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] sm:text-[11px] font-extrabold text-[#0f284e] tracking-wider uppercase">
                QUICK-ASSISTANT: PENDING BATCHES READY FOR PRODUCTION FULFILLMENT ({pendingWipBatches.length})
              </span>
            </div>

            <div className="relative w-full sm:w-56 md:w-64">
              <input
                type="text"
                placeholder="Filter batch number, product..."
                value={quickAssistantSearch}
                onChange={(e) => setQuickAssistantSearch(e.target.value)}
                className="w-full h-[25px] bg-white border border-slate-200 rounded-md pl-2.5 pr-6 text-[11px] text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs"
              />
              {quickAssistantSearch && (
                <button
                  type="button"
                  onClick={() => setQuickAssistantSearch('')}
                  className="absolute right-1.5 top-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear filter"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>

          {/* PENDING BATCH CARDS (COMPACT YELLOW BOLD STYLE) */}
          <div className="flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar">
            {filteredPendingBatches.map((log) => {
              const fullCode = log.wipBatchCode || '';
              const codeParts = fullCode.split('-');
              const shortCode = codeParts.length > 1 ? codeParts[codeParts.length - 1] : fullCode;
              const pcs = log.pendingQuantity || log.targetQuantity || 0;
              const rawName = log.productName || 'PRODUCT';

              return (
                <div
                  key={log._id || log.id}
                  onClick={() => handleOpenFulfillModal(log)}
                  className="group relative bg-[#F5B514] hover:bg-[#ECA90D] border-[1.5px] border-slate-900 rounded-xl sm:rounded-2xl w-40 sm:w-44 min-w-[150px] sm:min-w-[170px] h-[92px] sm:h-[98px] p-2.5 sm:p-3 flex flex-col justify-between items-center text-center shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer select-none active:scale-[0.98] shrink-0"
                  title={`Click to fulfill ${fullCode} (${rawName})`}
                >
                  {/* Middle: Bold Name */}
                  <div className="my-auto flex flex-col items-center justify-center w-full px-1">
                    <h4 className="text-[11px] sm:text-xs font-black text-slate-950 tracking-tight uppercase leading-tight line-clamp-2">
                      {rawName}
                    </h4>

                    {/* Subtitle: Code like RES-2026-0117 or fullCode */}
                    <p className="text-[9px] sm:text-[10px] font-bold text-amber-950/85 tracking-wide font-mono uppercase mt-0.5">
                      {fullCode}
                    </p>
                  </div>

                  {/* Bottom: Quantity */}
                  <span className="text-[9px] font-bold text-slate-950 bg-black/10 px-2.5 py-0.5 rounded-full leading-none">
                    {pcs} pcs pending
                  </span>
                </div>
              );
            })}

            {filteredPendingBatches.length === 0 && (
              <span className="text-xs text-slate-400 italic py-2">
                No pending batches match your filter.
              </span>
            )}
          </div>
        </div>
      )}

      {/* MAIN CARD CONTAINER (HOUSING PROCESS STEPS & LOGS - UNIFIED UI/UX) */}
      <div className="w-full bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 transition-all duration-300 flex flex-col gap-6 shadow-xs">

        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'register', label: 'Register Batch (WIP)' },
              { id: 'logs', label: 'WIP Production Logs' },
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

        {/* VIEW 1: BATCH REGISTRATION (FORM + BOM PREVIEW + RECENT BATCHES) */}
        {viewMode === 'register' && (
          <div className="flex flex-col gap-4">
            <form onSubmit={handleOpenConfirm} className="flex flex-col gap-4">

              {/* COMBINED STEPS 1 & 2: BATCH SCHEDULE & PRODUCT SELECTION */}
              <div className="flex flex-col gap-3.5 relative" ref={productDropdownRef}>
                {/* STEP 1: BATCH & PRODUCTION SCHEDULE */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1.5 border-b border-slate-100">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Batch &amp; Production Schedule
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Specify the batch tracking number, manufacturing date, expiration date, and estimated duration.
                      </p>
                    </div>
                  </div>

                  {/* PRIMARY BATCH CONTROLS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* 1. BATCH NO (AUTO GENERATED) */}
                    <div>
                      <label className="block font-semibold text-slate-600 text-xs mb-1 whitespace-nowrap">
                        Batch No. <span className="text-[10px] text-slate-500 font-bold">(Auto-generated)</span>
                      </label>
                      <div className="relative">
                        <Hash className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          name="wipBatchCode"
                          readOnly
                          value={wipBatchCode}
                          placeholder="WIP00001"
                          className="w-full h-[34px] bg-slate-100 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 text-xs font-semibold focus:outline-none cursor-not-allowed uppercase transition-colors"
                        />
                      </div>
                    </div>

                    {/* 2. MFG DATE */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mfg Date <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          required
                          max={new Date().toISOString().split("T")[0]}
                          value={mfgDate}
                          onChange={(e) => setMfgDate(e.target.value)}
                          onClick={(e) => {
                            try {
                              e.currentTarget.showPicker();
                            } catch (err) { }
                          }}
                          onKeyDown={(e) => e.preventDefault()}
                          className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer transition-colors"
                        />
                      </div>
                    </div>

                    {/* 3. EXPIRATION DATE */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Expiration Date <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          required
                          min={mfgDate || new Date().toISOString().split("T")[0]}
                          value={expDate}
                          onChange={(e) => setExpDate(e.target.value)}
                          onClick={(e) => {
                            try {
                              e.currentTarget.showPicker();
                            } catch (err) { }
                          }}
                          onKeyDown={(e) => e.preventDefault()}
                          className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer transition-colors"
                        />
                      </div>
                    </div>

                    {/* 4. ESTIMATED PRODUCTION DURATION */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                        Estimated Duration <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center">
                        <div className="relative flex-1">
                          <Clock className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            required
                            placeholder="e.g. 4"
                            value={estimatedDuration}
                            onChange={(e) => setEstimatedDuration(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-l-lg pl-8 pr-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                          />
                        </div>
                        <select
                          value={estimatedDurationUnit}
                          onChange={(e) => setEstimatedDurationUnit(e.target.value)}
                          className="h-[34px] bg-slate-100 border-y border-r border-slate-200 rounded-r-lg px-2 text-xs font-semibold text-slate-700 uppercase cursor-pointer focus:outline-none shrink-0"
                        >
                          <option value="hours">HR</option>
                          <option value="days">DAY</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SELECT FINISHED GOODS */}
                <div className="flex flex-col gap-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Select Finished Goods <span className="text-rose-500">*</span>
                    </label>
                    {selectedProduct && (
                      <span className="text-[11px] font-mono font-bold bg-[#01390f]/10 text-[#01390f] px-2 py-0.5 rounded-full">
                        Selected: {selectedProduct.itemName || selectedProduct.code}
                      </span>
                    )}
                  </div>

                  {/* DUAL SEARCH & SEGMENT CONTROLS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* 1. SEGMENT / CATEGORY FILTER */}
                    <div className="sm:col-span-1 relative">
                      <Tag className="w-3.5 h-3.5 absolute left-2.5 top-2.5 pointer-events-none text-slate-400" />
                      <select
                        value={selectedProductCategory}
                        onChange={(e) => {
                          setSelectedProductCategory(e.target.value);
                          setIsProductDropdownOpen(true);
                        }}
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-8 text-xs focus:outline-none focus:border-[#01390f] focus:bg-white font-semibold cursor-pointer appearance-none transition-colors"
                      >
                        <option value="All">All Categories ({uniqueCategories.length})</option>
                        {uniqueCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* 2. SMART MULTI-ATTRIBUTE SEARCH */}
                    <div className="sm:col-span-2 relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={productSearchTerm}
                        onChange={(e) => {
                          setProductSearchTerm(e.target.value);
                          setIsProductDropdownOpen(true);
                          setHighlightedIndex(0);
                        }}
                        onFocus={() => setIsProductDropdownOpen(true)}
                        onKeyDown={handleDropdownKeyDown}
                        placeholder="Search description, dimension (e.g. 2700, 50x50), or code..."
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-8 text-xs font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                      />
                      {productSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setProductSearchTerm('');
                            setIsProductDropdownOpen(false);
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {fetchingProducts && (
                        <Loader2 className="absolute right-8 top-2.5 w-4 h-4 animate-spin text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* FLOATING SEARCH SUGGESTIONS DROPDOWN */}
                  {isProductDropdownOpen && (
                    <div
                      ref={dropdownListRef}
                      className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 divide-y divide-slate-100 shadow-xl rounded-xl max-h-72 overflow-y-auto z-50 p-1 custom-scrollbar"
                    >
                      {filteredProductsList.length > 0 ? (
                        filteredProductsList.map((p, idx) => {
                          const itemId = p._id || p.id;
                          const dimension = p.specification || p.spec || p.netWeight;
                          const segment = p.category || p.itemGroup || p.brand || p.Segment || p.segment;
                          const count = p.quantity || p.availableStock || 0;
                          const uom = p.uom || 'pcs';
                          const desc = p.itemName || p.itemDescription || p.name || 'Finished Good';
                          const code = p.code || p.itemCode || 'FG-N/A';
                          const isSelected = itemId === selectedProductId;
                          const isHighlighted = idx === highlightedIndex;
                          const isOutOfStock = Number(count) <= 0;

                          return (
                            <div
                              key={itemId || idx}
                              id={`wip-prod-item-${idx}`}
                              onMouseEnter={() => setHighlightedIndex(idx)}
                              onMouseDown={() => {
                                const syntheticEvent = { target: { value: itemId } };
                                handleProductSelect(syntheticEvent);
                                setIsProductDropdownOpen(false);
                                setProductSearchTerm('');
                              }}
                              className={`p-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3 rounded-lg transition-colors ${isSelected
                                ? 'bg-emerald-50/70 border-l-4 border-[#01390f]'
                                : isHighlighted
                                  ? 'bg-slate-100/90'
                                  : ''
                                }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                  {p.imageUrl || p.image ? (
                                    <img
                                      src={resolveItemImageUrl(p.imageUrl || p.image)}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm text-slate-800 whitespace-normal break-words">
                                      <HighlightMatch text={desc} query={productSearchTerm} />
                                    </span>
                                    {dimension && (
                                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border bg-indigo-50 border-indigo-200 text-indigo-700">
                                        <HighlightMatch text={String(dimension)} query={productSearchTerm} /> {p.uom || ''}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                    {segment && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border bg-slate-100 border-slate-200 text-slate-600">
                                        {segment}
                                      </span>
                                    )}
                                    <span className="font-mono text-[10px] text-slate-400">
                                      <HighlightMatch text={code} query={productSearchTerm} />
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase border ${isOutOfStock
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}>
                                  Stock: {Number(count).toLocaleString()} {uom}
                                </span>
                                {isSelected && (
                                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center flex flex-col items-center justify-center gap-2">
                          <Search className="w-5 h-5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700">
                            {productSearchTerm
                              ? `No finished goods match "${productSearchTerm}"`
                              : 'No finished products found'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Try searching by code (e.g. FG0001), description, or dimension.
                          </span>
                          {productSearchTerm && (
                            <button
                              type="button"
                              onClick={() => {
                                setProductSearchTerm('');
                                setSelectedProductCategory('All');
                              }}
                              className="text-xs font-semibold text-[#01390f] hover:underline cursor-pointer"
                            >
                              Clear Search
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SELECTED PRODUCT PREVIEW CARD */}
                  {selectedProduct && (
                    <div className="mt-2 p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0">
                          {selectedProduct.imageUrl || selectedProduct.image ? (
                            <img
                              src={resolveItemImageUrl(selectedProduct.imageUrl || selectedProduct.image)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-emerald-700" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {selectedProduct.code && (
                              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded">
                                {selectedProduct.code}
                              </span>
                            )}
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {selectedProduct.itemName || selectedProduct.itemDescription}
                            </span>
                            {selectedProduct.specification && (
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border bg-indigo-50 border-indigo-200 text-indigo-700">
                                {selectedProduct.specification} {selectedProduct.uom || ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                              {selectedProduct.category || 'Finished Goods'}
                            </span>
                            <span>•</span>
                            <span>Current Stock: <strong className="text-slate-800 font-mono">{selectedProduct.quantity || 0} {selectedProduct.uom || 'pcs'}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Selected
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductId("");
                            setProductSearchTerm("");
                            setIsProductDropdownOpen(true);
                          }}
                          className="text-xs font-semibold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title="Change Finished Product"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PLACEHOLDER WHEN NO PRODUCT IS SELECTED */}
              {!selectedProduct && (
                <div className="p-8 bg-slate-50/70 border border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">
                    Please select a Finished Product in Step 2 to display Recipe Bill of Materials (BOM), Bulk Batch Cooking, and Raw Material Deductions.
                  </span>
                </div>
              )}

              {/* ONCE PRODUCT IS SELECTED: BULK BATCH COOKING & YIELD CONVERSION + RECIPE */}
              {selectedProduct && (
                <>
                  {/* DIVIDER BEFORE STEP 3 */}
                  <hr className="border-slate-200 -mt-2 -mb-2" />

                  {/* STEP 3: BULK BATCH COOKING & YIELD CONVERSION */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3 shadow-2xs relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Bulk Batch Cooking &amp; Yield Conversion
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Adjust batch count or total weight to calculate target piece yield and raw material deductions.
                        </p>
                      </div>
                      {isTargetQtyManual && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsTargetQtyManual(false);
                            if (theoreticalPiecesYield > 0) {
                              setTargetQuantity(String(theoreticalPiecesYield));
                            }
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors cursor-pointer self-start sm:self-auto"
                          title="Reset to formula yield based on total weight"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Auto-Yield</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* NUMBER OF BATCHES (EDITABLE) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                          No. of Batches (Bulk) <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={numberOfBatches}
                            onChange={(e) => handleBatchesChange(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-l-lg px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                          />
                          <span className="h-[34px] flex items-center bg-slate-100 border-y border-r border-slate-200 rounded-r-lg px-2.5 text-xs font-semibold text-slate-600 uppercase">
                            Batch
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium block mt-1">
                          Multiplier based on 1 master batch ({masterBatchSize} {batchUom})
                        </span>
                      </div>

                      {/* TOTAL BULK WEIGHT (EDITABLE) */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                          Total Bulk Weight <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            required
                            value={totalBatchWeight}
                            onChange={(e) => handleTotalWeightChange(e.target.value)}
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-l-lg px-3 text-xs font-semibold text-indigo-700 focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                          />
                          <span className="h-[34px] flex items-center bg-slate-100 border-y border-r border-slate-200 rounded-r-lg px-2.5 text-xs font-semibold text-slate-600 uppercase">
                            {batchUom}
                          </span>
                        </div>
                        <span className="text-[10px] text-indigo-600 font-medium block mt-1">
                          = {numberOfBatches} Batch(es) Formula
                        </span>
                      </div>

                      {/* TARGET YIELD (PCS / QTY) (EDITABLE WITH SYNC) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-slate-700 whitespace-nowrap">
                            Target Yield (Pieces / Qty) <span className="text-rose-500">*</span>
                          </label>
                          {isTargetQtyManual && (
                            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={targetQuantity}
                            onChange={(e) => {
                              setTargetQuantity(e.target.value);
                              setIsTargetQtyManual(true);
                            }}
                            placeholder="e.g. 50"
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 rounded-l-lg px-3 text-xs font-semibold text-emerald-800 focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                          />
                          <span className="h-[34px] flex items-center bg-slate-100 border-y border-r border-slate-200 rounded-r-lg px-2.5 text-xs font-semibold text-slate-600 uppercase">
                            Pcs
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-medium block mt-1 truncate">
                          {totalBatchWeight} {batchUom.toUpperCase()} ≈ {theoreticalPiecesYield} pcs {unitWeightDisplay ? `(at ${unitWeightDisplay} / unit)` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DIVIDER BETWEEN STEP 3 & BOM TABLE */}
                  <hr className="border-slate-200 -mt-2 -mb-2" />

                  {/* STEP 3: INGREDIENTS (BOM) DEDUCTION PREVIEW */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                        Raw Materials BOM Deduction &amp; Stock Check
                      </h4>
                      <span className="text-[11px] font-mono font-bold bg-[#01390f]/10 text-[#01390f] px-2 py-0.5 rounded-full">
                        {ingredientsCalculation.length} {ingredientsCalculation.length === 1 ? 'ingredient' : 'ingredients'}
                      </span>
                    </div>

                    {ingredientsCalculation.length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                        No recipe ingredients specified for "{selectedProduct.itemName || selectedProduct.itemDescription}".
                      </div>
                    ) : (
                      <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                                <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">
                                  Raw Material Ingredient
                                </th>
                                <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Spec / %</th>
                                <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Recipe (1 Batch)</th>
                                <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">
                                  Req for {totalBatchWeight} {batchUom.toUpperCase()} ({numberOfBatches} Batch{Number(numberOfBatches) > 1 ? 'es' : ''})
                                </th>
                                <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Warehouse Stock</th>
                                <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {ingredientsCalculation.map((ing, idx) => {
                                const isShort = ing.availStock < ing.totalRequired;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/90 transition-colors whitespace-nowrap text-slate-700 group">
                                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                                        <span className="truncate text-slate-900 font-bold">{ing.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                      {ing.specification ? `${ing.specification}%` : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                      {ing.unitRequired} {ing.uom}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                      {ing.totalRequired} {ing.uom}
                                    </td>
                                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                      {ing.availStock} {ing.uom}
                                    </td>
                                    <td className="py-3 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                      {ing.isBlockedSpec ? (
                                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap">
                                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> BLOCKED ({ing.qcStatus})
                                        </span>
                                      ) : isShort ? (
                                        <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap">
                                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Shortage ({ing.shortageQty} {ing.uom})
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2.5 py-0.5 rounded-md font-semibold text-xs whitespace-nowrap">
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sufficient
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* OUT-OF-SPEC BLOCKED ALERT BANNER */}
              {hasBlockedSpec && (
                <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 text-rose-950 flex items-start gap-3 animate-in fade-in">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-extrabold text-rose-900 uppercase tracking-wide">
                      Production Blocked: Out-of-Specification (Failed Spec) Materials Detected
                    </span>
                    <p className="text-rose-700 leading-relaxed">
                      The following raw material(s) in this recipe are currently flagged as <strong>Quarantine</strong> or <strong>Rejected</strong> and are strictly barred from production allocation:
                    </p>
                    <ul className="list-disc list-inside font-bold text-rose-900 space-y-0.5">
                      {blockedSpecMaterials.map((b, i) => (
                        <li key={i}>
                          {b.name} ({b.materialCode}) — <span className="uppercase text-rose-700 font-black">[{b.qcStatus}]</span>
                        </li>
                      ))}
                    </ul>
                    <span className="text-[11px] text-rose-800 font-medium mt-0.5">
                      A Supplier Return Ticket has been triggered. Please quarantine or replace these materials before initiating this production run.
                    </span>
                  </div>
                </div>
              )}

              {/* PRODUCTION TIME & SHORTAGE DELAY BANNER */}
              {selectedProduct && (
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${hasShortage ? 'bg-amber-50/70 border-amber-200/80 text-amber-950' : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                  }`}>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      Estimated Production Time & Schedule Range
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {hasShortage ? (
                        <>Material shortage detected. Includes estimated procurement delay before production.</>
                      ) : (
                        <>All raw materials available in warehouse stock. Production can proceed on schedule.</>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Estimated Duration</span>
                      <span className="font-mono font-bold text-sm text-[#01390f]">
                        {estimatedDuration} {estimatedDurationUnit === 'days' ? 'DAY' : 'HR'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTimeCalcModalOpen(true)}
                      className="inline-flex items-center justify-center bg-white hover:bg-slate-100 text-[#01390f] border border-slate-200 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                    >
                      <span>View Calculator</span>
                    </button>
                  </div>
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
                  disabled={submitting || hasBlockedSpec}
                  className={`px-6 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${hasBlockedSpec
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 cursor-not-allowed opacity-80'
                    : 'bg-[#01390f] hover:bg-[#0a5219] text-white disabled:opacity-50'
                    }`}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : hasBlockedSpec ? (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span className="whitespace-nowrap">
                    {submitting
                      ? "Confirming..."
                      : hasBlockedSpec
                        ? "Blocked: Contains Failed Spec"
                        : "Confirm"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 2: FULL PRODUCTION LOGS MASTERLIST */}
        {viewMode === 'logs' && (
          <div className="flex flex-col gap-6">
            {/* MS EXCEL-STYLE RIBBON TOOLBAR (CLEAN WHITE BACKGROUND - 1 ROW NO WRAPPING) */}
            <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">

              {/* GROUP 1: ACTIONS (Fixed Width: Compact Stacked Layers) */}
              <div className="w-[140px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
                <div className="flex items-stretch gap-1.5 flex-1">

                  {/* Stacked Compact Rows */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 space-y-0.5">
                    {/* Layer 1: Production Calculator */}
                    <button
                      type="button"
                      onClick={() => setIsTimeCalcModalOpen(true)}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-[#01390f] transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                      title="Production Time Calculator"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Time Calculator</span>
                    </button>

                    {/* Layer 2: Refresh Logs */}
                    <button
                      type="button"
                      onClick={fetchWIPLogs}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-700 hover:text-[#01390f] transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px]"
                      title="Refresh WIP Production Logs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Refresh Logs</span>
                    </button>

                    {/* Layer 3: Reset Filters */}
                    <button
                      type="button"
                      onClick={handleClearWipFilters}
                      disabled={activeWipFiltersCount === 0}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                      title={activeWipFiltersCount > 0 ? `Reset active filters (${activeWipFiltersCount})` : 'No active filters'}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="whitespace-nowrap">
                        Reset Filters {activeWipFiltersCount > 0 ? `(${activeWipFiltersCount})` : ''}
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
                      placeholder="Search Batch Code, Product Name, Product Code, Status..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                      title="Search Batch Code, Product Name, Status..."
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
                    {/* Status Filter */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Clock className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={wipStatusFilter}
                        onChange={(e) => setWipStatusFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Batch Status"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending / Shortage</option>
                        <option value="completed">Completed Only</option>
                      </select>
                    </div>

                    {/* Product Filter */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <Package className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={wipProductFilter}
                        onChange={(e) => setWipProductFilter(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Filter by Finished Product"
                      >
                        <option value="All">All Products ({uniqueWipProducts.length})</option>
                        {uniqueWipProducts.map((p, idx) => (
                          <option key={idx} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sort Order Dropdown */}
                    <div className="relative inline-flex items-center w-full min-w-0">
                      <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                      <select
                        value={wipSortBy}
                        onChange={(e) => setWipSortBy(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                        title="Sort Production Batches"
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="batch_asc">Batch No. (A-Z)</option>
                        <option value="yield_desc">Most Yield Output</option>
                      </select>
                    </div>
                  </div>

                  {/* Layer 3: Quick Filter Toggles (Equal 3 Columns) */}
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                      type="button"
                      onClick={() => setWipQuickFilter('all')}
                      className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center transition-colors cursor-pointer truncate ${wipQuickFilter === 'all'
                        ? 'bg-[#01390f] text-white border-[#01390f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      All Batches ({wipLogs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setWipQuickFilter('pending')}
                      className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center transition-colors cursor-pointer truncate ${wipQuickFilter === 'pending'
                        ? 'bg-[#01390f] text-white border-[#01390f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      Pending ({wipLogs.filter((l) => l.status === 'Pending / Shortage' || (l.pendingQuantity || 0) > 0).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setWipQuickFilter('completed')}
                      className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center transition-colors cursor-pointer truncate ${wipQuickFilter === 'completed'
                        ? 'bg-[#01390f] text-white border-[#01390f]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      Completed ({wipLogs.filter((l) => l.status === 'Completed' && (!l.pendingQuantity || l.pendingQuantity <= 0)).length})
                    </button>
                  </div>
                </div>

                {/* Group Caption */}
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
                  Search & Filters
                </div>
              </div>
            </div>

            {/* DIVIDER BETWEEN TOOLBAR AND TABLE */}
            <hr className="border-slate-200 -mt-4 -mb-2" />

            {/* Masterlist Table */}
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
              {/* TABLE PAGINATION */}
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredWipLogs.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={(rows) => {
                  setItemsPerPage(rows);
                  setCurrentPage(1);
                }}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      <th className="py-3 px-3 text-center w-12 font-semibold text-white">#</th>
                      <th className="py-3 px-4 whitespace-nowrap font-semibold text-white">
                        Batch Code
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap font-semibold text-white">Product Name</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap font-semibold text-white">Batch Size</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap font-semibold text-white">Target Yield</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap font-semibold text-white">Produced Output</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap font-semibold text-white">Mfg Date</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap font-semibold text-white">Exp Date</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap font-semibold text-white">Status</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] font-semibold text-white z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-36 min-w-[130px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#01390f] mb-2" />
                          <span>Loading production batches...</span>
                        </td>
                      </tr>
                    ) : filteredWipLogs.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-slate-400 italic">
                          No production batches found matching your search.
                        </td>
                      </tr>
                    ) : (
                      paginatedWipLogs.map((log, idx) => {
                        const isPending = log.status === 'Pending / Shortage' || (log.pendingQuantity || 0) > 0;
                        return (
                          <tr key={log._id || log.id || idx} className="hover:bg-slate-50/90 transition-colors whitespace-nowrap text-slate-700 group">
                            <td className="py-3 px-3 text-center font-mono text-slate-400 text-xs whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {(currentPage - 1) * itemsPerPage + idx + 1}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex items-center gap-1.5">
                                <span className="underline decoration-dotted cursor-pointer hover:text-[#01390f]" onClick={() => setSelectedLog(log)}>
                                  {log.wipBatchCode}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              <div className="flex flex-col">
                                <span>{log.productName}</span>
                                {log.productCode && (
                                  <span className="font-mono text-[10px] text-slate-400 font-bold">
                                    {log.productCode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {log.numberOfBatches || 1} Batch ({log.totalBatchWeight || 5} {log.batchWeightUom || 'kg'})
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {log.targetQuantity} pcs
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {log.producedQuantity || 0} pcs
                              {log.rejectedQuantity > 0 && (
                                <span className="block text-[10px] text-rose-600 font-normal">
                                  ({log.rejectedQuantity} scrapped)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {log.mfgDate ? new Date(log.mfgDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {log.expDate ? new Date(log.expDate).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                                  <Clock className="w-3 h-3" /> Pending ({log.pendingQuantity || log.targetQuantity} short)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Completed
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 bg-[#f8faf8] group-hover:bg-[#eef5ee] transition-colors text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-36 min-w-[130px]">
                              <div className="inline-flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedLog(log)}
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="View Batch Details & Fulfillment"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadWipPdf(log)}
                                  className="w-8 h-8 rounded-full bg-white border border-emerald-200 text-emerald-700 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                  title="Download WIP Batch Sheet PDF"
                                >
                                  <FileDown className="w-3.5 h-3.5" />
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
        )}

      </div>

      {/* DETAIL MODAL FOR WIP BATCH */}
      {selectedLog && (() => {
        const isLogPending = Boolean(
          (selectedLog.pendingQuantity || 0) > 0 || selectedLog.status === 'Pending / Shortage'
        );

        const ingredientStockStatus = (selectedLog.ingredientsUsed || []).map((ing) => {
          const pendingUnits = isLogPending ? Number(selectedLog.pendingQuantity) || 0 : 0;
          const neededForPending = (Number(ing.unitRequired) || 0) * pendingUnits;

          const currentMat = allRawMaterials.find(
            (m) =>
              (m._id || m.id) === ing.rawMaterialId ||
              m.code === ing.materialCode ||
              m.itemName === ing.name
          );

          const currentStock = currentMat ? Number(currentMat.quantity) || 0 : 0;
          const isInsufficient = isLogPending && currentStock < neededForPending;

          return {
            ...ing,
            neededForPending,
            currentStock,
            isInsufficient,
            missingQty: Math.max(0, neededForPending - currentStock),
          };
        });

        const hasInsufficientStockForFulfill = isLogPending && ingredientStockStatus.some((ing) => ing.isInsufficient);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
              {/* MODAL HEADER (NO ICONS) */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800 whitespace-nowrap">
                    WIP Batch Details ({selectedLog.wipBatchCode})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Created on {new Date(selectedLog.createdAt || selectedLog.mfgDate).toLocaleDateString()}
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
                {/* BATCH OVERVIEW CARD */}
                <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Product Name</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedLog.productName}
                      </span>
                    </div>
                    {selectedLog.productCode && (
                      <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg w-fit">
                        {selectedLog.productCode}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Bulk Batch Size</span>
                      <span className="font-bold text-indigo-700 text-sm font-mono">
                        {selectedLog.numberOfBatches || 1} Batch ({selectedLog.totalBatchWeight || 5} {selectedLog.batchWeightUom || 'kg'})
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Yield</span>
                      <span className="font-bold text-slate-800 text-sm font-mono">{selectedLog.targetQuantity} pcs</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Produced Output</span>
                      <span className="font-bold text-emerald-700 text-sm font-mono">{selectedLog.producedQuantity || selectedLog.targetQuantity} pcs</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                      <span className={`font-bold text-sm font-mono ${isLogPending ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {isLogPending ? 'Pending / In Production' : (selectedLog.status || 'Completed')}
                      </span>
                    </div>
                  </div>

                  {/* ACTUAL PRODUCED QUANTITY INPUT (FOR REJECTS & QUALITY GATE) */}
                  {isLogPending && (() => {
                    const targetQty = Number(selectedLog.targetQuantity || 0);
                    const enteredActual = Number(fulfillProducedQty) || 0;
                    const rejectCount = Math.max(0, targetQty - enteredActual);

                    return (
                      <div className="flex flex-col gap-3">
                        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                          <div>
                            <span className="font-bold text-xs text-emerald-950 block">
                              Actual Produced Quantity (Stock-In to Inventory) *
                            </span>
                            <span className="text-[11px] text-emerald-800 block">
                              Adjust if there were rejected / spilled units. Target yield was <strong>{selectedLog.targetQuantity} pcs</strong>.
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min="0"
                              max={selectedLog.targetQuantity}
                              value={fulfillProducedQty}
                              onChange={(e) => handleFulfillProducedQtyChange(e.target.value, selectedLog.targetQuantity)}
                              className="w-24 bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-sm font-semibold text-emerald-950 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="font-bold text-xs text-emerald-900 uppercase">
                              pcs
                            </span>
                          </div>
                        </div>

                        {/* REJECTION & SCRAP AUDIT REPORT SECTION */}
                        {rejectCount > 0 && (
                          <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 flex flex-col gap-3 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                                  ⚠️
                                </div>
                                <div>
                                  <span className="font-bold text-xs text-rose-950 block">
                                    {rejectCount} Defective / Rejected Units Detected (Production Loss)
                                  </span>
                                  <span className="text-[11px] text-rose-800 block">
                                    Target yield is <strong>{targetQty} pcs</strong>. Only <strong>{enteredActual} pcs</strong> will be added to inventory. The remaining <strong>{rejectCount} pcs</strong> will be logged in Scrap & Loss Prevention Audit.
                                  </span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                                -{rejectCount} pcs Scrap
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-rose-200/70 text-xs">
                              <div>
                                <label className="block text-[11px] font-bold text-rose-900 mb-1">
                                  Rejection / Scrap Reason *
                                </label>
                                <select
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="w-full bg-white border border-rose-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-600 shadow-2xs"
                                >
                                  <option value="Filling Spillage / Overflow">Filling Spillage / Overflow</option>
                                  <option value="Bottle / Packaging Defect">Bottle / Packaging Defect</option>
                                  <option value="QC Visual / Color Inconsistency">QC Visual / Color Inconsistency</option>
                                  <option value="Fill Weight Out-of-Tolerance">Fill Weight Out-of-Tolerance</option>
                                  <option value="Foreign Particle / Contamination">Foreign Particle / Contamination</option>
                                  <option value="Other">Other (Custom Reason)</option>
                                </select>
                                {rejectionReason === 'Other' && (
                                  <input
                                    type="text"
                                    placeholder="Specify custom reason..."
                                    value={customRejectionReason}
                                    onChange={(e) => setCustomRejectionReason(e.target.value)}
                                    className="w-full mt-1.5 bg-white border border-rose-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-rose-600"
                                  />
                                )}
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-rose-900 mb-1">
                                  QC Inspector / Approver *
                                </label>
                                <input
                                  type="text"
                                  placeholder="Inspector Name..."
                                  value={rejectionApprover}
                                  onChange={(e) => setRejectionApprover(e.target.value)}
                                  className="w-full bg-white border border-rose-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-rose-600 shadow-2xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-rose-900 mb-1">
                                  Disposition *
                                </label>
                                <select
                                  value={rejectionDisposition}
                                  onChange={(e) => setRejectionDisposition(e.target.value)}
                                  className="w-full bg-white border border-rose-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-rose-600 shadow-2xs"
                                >
                                  <option value="Scrap / Dispose">Scrap / Dispose (Standard Loss)</option>
                                  <option value="Quarantined">Quarantined (Hold for Re-inspection)</option>
                                  <option value="Destroyed">Destroyed / Incinerated</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/60 font-mono text-slate-600">
                    <div>
                      <span className="font-sans font-semibold text-slate-400">Mfg Date:</span> {selectedLog.mfgDate || 'N/A'}
                    </div>
                    <div>
                      <span className="font-sans font-semibold text-slate-400">Exp Date:</span> {selectedLog.expDate || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* INSUFFICIENT STOCK WARNING BANNER */}
                {isLogPending && hasInsufficientStockForFulfill && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs font-semibold">
                    <div className="font-bold text-[11px] text-rose-900 uppercase mb-1">
                      INSUFFICIENT RAW MATERIAL STOCK
                    </div>
                    <p className="leading-relaxed">
                      Cannot fulfill batch transaction: One or more required ingredients have insufficient stock to cover the remaining {selectedLog.pendingQuantity} pending units. Please receive new inventory in Inbound Receiving first.
                    </p>
                  </div>
                )}

                {/* INGREDIENTS / BOM BREAKDOWN (PROTECTED WITH PASSWORD / PIN) */}
                {!isFormulaUnlocked ? (
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center gap-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-2xl bg-[#01390f]/10 border border-[#01390f]/20 flex items-center justify-center text-[#01390f] shadow-inner">
                      <Lock className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <div className="max-w-md">
                      <h4 className="font-bold text-slate-800 text-sm">
                        Proprietary Formula Protected
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Ingredients & BOM Deduction Breakdown is confidential. Enter the authorization password / 6-digit PIN code to view master recipe formulation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFormulaPinModalOpen(true)}
                      className="mt-1 px-4 py-2 bg-[#01390f] hover:bg-[#0a5219] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer flex items-center gap-2"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Enter Password / PIN to View</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#01390f] uppercase tracking-wider flex items-center gap-1.5">
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        Ingredients & BOM Deduction Breakdown
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {ingredientStockStatus.length} Raw Material{ingredientStockStatus.length > 1 ? 's' : ''} in Recipe
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsFormulaUnlocked(false)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          Hide Formula
                        </button>
                      </div>
                    </div>

                    <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                              <th className="py-2.5 px-3.5 whitespace-nowrap">Raw Material</th>
                              <th className="py-2.5 px-3 text-center whitespace-nowrap">Spec / %</th>
                              <th className="py-2.5 px-3 text-center whitespace-nowrap">Recipe Wt</th>
                              <th className="py-2.5 px-3 text-center whitespace-nowrap">Qty Deducted</th>
                              {isLogPending && (
                                <>
                                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Needed for Pending</th>
                                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Warehouse Status</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {ingredientStockStatus.map((ing, idx) => {
                              const matName = ing.name || ing.materialName || 'Raw Material';
                              const specVal = ing.specification ? `${ing.specification}%` : '-';
                              const wtVal = ing.theoreticalWeight || (ing.unitRequired ? String(ing.unitRequired) : '0');
                              const uomVal = ing.uom || 'pcs';

                              return (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors whitespace-nowrap text-slate-700 group">
                                  <td className="py-3 px-3.5 font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                                      <span className="text-xs sm:text-sm text-slate-900 font-bold">{matName}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                    {specVal}
                                  </td>
                                  <td className="py-3 px-3 text-center font-mono font-semibold text-slate-700 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                    {wtVal} <span className="uppercase text-[10px] text-slate-500 font-bold">{uomVal}</span>
                                  </td>
                                  <td className="py-3 px-3 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                    <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-lg text-xs inline-block">
                                      -{Number(ing.qtyDeducted || 0).toLocaleString()} {ing.uom || 'pcs'}
                                    </span>
                                  </td>
                                  {isLogPending && (
                                    <>
                                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                        {Number(ing.neededForPending || 0).toLocaleString()} {ing.uom || 'pcs'}
                                      </td>
                                      <td className="py-3 px-3 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                                        {ing.isInsufficient ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                                            ⚠️ Short: {Number(ing.missingQty || 0).toLocaleString()} (Stock: {Number(ing.currentStock || 0).toLocaleString()})
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                            ✓ Ready ({Number(ing.currentStock || 0).toLocaleString()} in stock)
                                          </span>
                                        )}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLog(null);
                    setIsFormulaUnlocked(false);
                  }}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Close Details
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadWipPdf(selectedLog)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-rose-200 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <FileDown className="w-4 h-4 text-rose-600" />
                  <span>Download PDF</span>
                </button>
                {isLogPending && (
                  <button
                    type="button"
                    disabled={hasInsufficientStockForFulfill || completingId === selectedLog._id}
                    onClick={async () => {
                      await handleCompleteBatch(selectedLog._id, fulfillProducedQty, selectedLog.targetQuantity);
                    }}
                    className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {completingId === selectedLog._id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span className="whitespace-nowrap">
                      {completingId === selectedLog._id
                        ? 'Fulfilling Batch...'
                        : (() => {
                          const diff = Math.max(0, Number(selectedLog.targetQuantity || 0) - Number(fulfillProducedQty || 0));
                          return diff > 0
                            ? `Complete & Log ${diff} Scrap Loss`
                            : 'Complete Production Batch';
                        })()}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* FORMULA AUTHORIZATION PIN MODAL */}
      <PinAuthModal
        isOpen={isFormulaPinModalOpen}
        onClose={() => setIsFormulaPinModalOpen(false)}
        onSuccess={() => {
          setIsFormulaUnlocked(true);
          setIsFormulaPinModalOpen(false);
          showSuccessToast('Formula authorization verified. Formulation details unlocked.');
        }}
        title="Formula Access Authorization"
        subtitle={`Enter 6-digit PIN code to view BOM formula for ${selectedLog?.productName || 'Batch'}`}
      />



      {/* CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                Confirm WIP Production Batch
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
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-2">
                  <span className="font-bold text-xs text-slate-500 uppercase">Batch Details</span>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-500 block">Batch No:</span>
                      <span className="font-mono font-bold text-emerald-800">{wipBatchCode}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Finished Good:</span>
                      <span className="font-bold text-slate-900">{selectedProduct?.itemName || selectedProduct?.itemDescription}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">
                        Bulk Batch Cooking:
                      </span>
                      <span className="font-bold text-indigo-700 font-mono">
                        {numberOfBatches} Batch ({totalBatchWeight} {batchUom.toUpperCase()})
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Target Yield:</span>
                      <span className="font-bold text-slate-900 font-mono">{targetQuantity} pcs</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Production Status:</span>
                      <span className="font-bold text-amber-700 font-mono">Queued In Production</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block">Mfg Date / Exp Date:</span>
                      <span className="font-bold text-slate-800 font-mono">{mfgDate} / {expDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="font-bold text-xs text-[#01390f] uppercase">Ingredients BOM Deduction</span>
                  <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar max-h-56">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                            <th className="py-2.5 px-3.5 whitespace-nowrap">Raw Material</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Spec / %</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Theor. Wt</th>
                            <th className="py-2.5 px-3 text-center whitespace-nowrap">Deduction</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ingredientsCalculation.map((ing, index) => {
                            const matName = ing.name || ing.materialName || 'Raw Material';
                            const specVal = ing.specification ? `${ing.specification}%` : '-';
                            const wtVal = ing.theoreticalWeight || (ing.unitRequired ? String(ing.unitRequired) : '0');
                            const uomVal = ing.uom || 'pcs';

                            return (
                              <tr key={index} className="hover:bg-slate-50/80 transition-colors whitespace-nowrap text-slate-700">
                                <td className="py-2.5 px-3.5 font-bold text-slate-800 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                                    <span className="text-xs text-slate-900 font-bold">{matName}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700 whitespace-nowrap">
                                  {specVal}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-700 whitespace-nowrap">
                                  {wtVal} <span className="uppercase text-[10px] text-slate-500 font-bold">{uomVal}</span>
                                </td>
                                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                  <span className="font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-lg text-xs inline-block">
                                    -{Number(ing.qtyDeducted || 0).toLocaleString()} {ing.uom || 'pcs'}
                                  </span>
                                  {ing.shortageQty > 0 && (
                                    <span className="ml-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-lg font-bold font-mono whitespace-nowrap">
                                      Short: {ing.shortageQty}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200/70 rounded-xl p-3.5 mt-2">
                  Note: Confirming will register this batch as <strong>In Production</strong>. Raw materials are <strong>NOT</strong> deducted yet. When physical production is finished, click this batch in the Quick-Assistant bar above to fulfill transaction and deduct warehouse stock.
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
                  onClick={handleSubmitBatch}
                  disabled={submitting}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span className="whitespace-nowrap">{submitting ? 'Starting Production...' : 'Start Production'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* PRODUCTION TIME & SCHEDULE CALCULATOR MODAL */}
      <ProductionTimeCalculatorModal
        isOpen={isTimeCalcModalOpen}
        onClose={() => setIsTimeCalcModalOpen(false)}
        selectedProduct={selectedProduct}
        numberOfBatches={numberOfBatches}
        totalBatchWeight={totalBatchWeight}
        batchUom={batchUom}
        targetQuantity={targetQuantity}
        ingredients={ingredientsCalculation}
        mfgDate={mfgDate}
      />
    </div>
  );
}

export default InventoryWIP;