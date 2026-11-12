import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Check,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Image as ImageIcon,
  X,
  Tag,
  Loader2,
  ShoppingBag,
  ListPlus,
  RefreshCw,
  FileDown,
  Download,
  Percent,
  SlidersHorizontal,
  CheckCircle2,
  Star,
  Upload,
  ChevronDown,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  PackageCheck,
  AlertCircle,
  Archive,
  FileSpreadsheet,
  Truck,
  Minus,
  ExternalLink,
  Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios, { API } from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { notifyLiveSync, subscribeLiveSync } from '../utils/liveSync';
import { compressImageToBase64 } from '../utils/imageCompressor';
import TablePagination from './common/TablePagination';

function MarketingAllProductsCatalog() {
  const [catalogProducts, setCatalogProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_marketing_catalog') || localStorage.getItem('mhira_db_products');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [
      { _id: '1', code: 'FG0001', itemDescription: 'NIACINAMIDE BODY LOTION', category: 'Bath & Body', navbarTag: 'Bath & Body', price: 225, quantity: 15, isPublished: true },
      { _id: '2', code: 'FG0002', itemDescription: 'HEALTHY HAIR AND SMOOTH SHINY HAIR', category: 'Hair Care', navbarTag: 'Hair Care', price: 280, quantity: 20, isPublished: true },
      { _id: '3', code: 'FG0003', itemDescription: 'HEALTHY HAIR AND SMOOTH SHINY HAIR', category: 'Hair Care', navbarTag: 'Hair Care', price: 250, quantity: 12, isPublished: true },
      { _id: '4', code: 'FG0004', itemDescription: 'FACE SERUM COLLAGEN', category: 'Skin Care', navbarTag: 'Skin Care', price: 300, quantity: 18, isPublished: true },
    ];
  });
  const [inventoryProducts, setInventoryProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_products');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Multi-Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedNavbarTag, setSelectedNavbarTag] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'published' | 'draft'
  const [recentProductSearch, setRecentProductSearch] = useState('');
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [showZeroOnly, setShowZeroOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [viewProductModal, setViewProductModal] = useState(null);

  // Package Set Modal States
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackageItem, setEditingPackageItem] = useState(null);
  const [viewPackageModal, setViewPackageModal] = useState(null);
  const [submittingPackage, setSubmittingPackage] = useState(false);

  // Finished Goods Search Dropdown inside Package Set Modal
  const [pkgInvSearchQuery, setPkgInvSearchQuery] = useState('');
  const [selectedPkgInvCategory, setSelectedPkgInvCategory] = useState('All');
  const [isPkgInvDropdownOpen, setIsPkgInvDropdownOpen] = useState(false);
  const pkgInvDropdownRef = useRef(null);

  const initialPackageFormState = {
    code: '',
    itemName: '',
    itemDescription: '',
    category: 'Package Sets',
    navbarTag: 'Package Sets',
    brand: 'Mhira Natural',
    quantity: 10,
    uom: 'Sets',
    images: [],
    price: 0,
    originalPrice: 0,
    promoBadge: 'Special Bundle',
    isOnSale: true,
    bundleItems: [],
    marketingDescription: '',
    shippingReturns: '1-3 Business Days (Metro Manila)',
    rating: 5,
    soldCount: 0,
    isPublished: true,
    isBundle: true,
  };

  const [packageFormData, setPackageFormData] = useState(initialPackageFormState);

  const [productReviews, setProductReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const existingShippingPolicies = useMemo(() => {
    const defaults = [
      "Standard Nationwide: Metro Manila 1-3 Business Days. Provincial 3-7 Business Days. 7-day replacement guarantee.",
      "Same-Day Express Delivery: NCR orders placed before 2PM delivered same-day. 7-day warranty.",
      "Eco-Botanical Fragile Handling: Bubble-wrapped botanical glass bottles. 7-day defect exchange."
    ];
    const fromProducts = catalogProducts
      .map(p => p.shippingReturns)
      .filter(s => s && s.trim() !== "");
    return Array.from(new Set([...defaults, ...fromProducts]));
  }, [catalogProducts]);

  const initialFormState = {
    productRef: '',
    code: '',
    itemDescription: '',
    category: 'Skin Care',
    navbarTag: 'Skin Care',
    brand: 'Mhira Natural',
    quantity: 0,
    uom: 'PCS',
    images: [],
    price: 0,
    originalPrice: 0,
    promoBadge: '',
    isOnSale: false,
    marketingDescription: '',
    shippingReturns: 'Standard Nationwide: Metro Manila 1-3 Business Days. Provincial 3-7 Business Days. 7-day replacement guarantee.',
    rating: 5,
    soldCount: 0,
    isPublished: true,
  };

  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [selectedInvCategory, setSelectedInvCategory] = useState('All');
  const [isInvDropdownOpen, setIsInvDropdownOpen] = useState(false);
  const invDropdownRef = useRef(null);

  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (invDropdownRef.current && !invDropdownRef.current.contains(e.target)) {
        setIsInvDropdownOpen(false);
      }
      if (pkgInvDropdownRef.current && !pkgInvDropdownRef.current.contains(e.target)) {
        setIsPkgInvDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resolveProductImageUrl = (img) => {
    if (!img) return '/mhira_removebg.png';
    if (typeof img === 'object' && img.url) img = img.url;
    if (typeof img !== 'string') return '/mhira_removebg.png';
    const trimmed = img.trim();
    if (!trimmed) return '/mhira_removebg.png';
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

  const uniqueInvCategories = useMemo(() => {
    const cats = inventoryProducts
      .map((p) => p.category || p.itemGroup || '')
      .filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [inventoryProducts]);

  const filteredInventoryProducts = useMemo(() => {
    const list = [...inventoryProducts];
    // Sort recent finished goods first (newest date or highest code)
    list.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA && dateB) return dateB - dateA;
      const codeA = String(a.code || a.itemCode || '');
      const codeB = String(b.code || b.itemCode || '');
      return codeB.localeCompare(codeA, undefined, { numeric: true });
    });

    return list.filter((inv) => {
      if (selectedInvCategory !== 'All') {
        const cat = inv.category || inv.itemGroup || '';
        if (cat !== selectedInvCategory) return false;
      }
      if (invSearchQuery.trim()) {
        const q = invSearchQuery.toLowerCase().trim();
        const code = (inv.code || inv.itemCode || '').toLowerCase();
        const name = (inv.itemDescription || inv.itemName || '').toLowerCase();
        const cat = (inv.category || '').toLowerCase();
        const spec = (inv.specification || inv.spec || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !cat.includes(q) && !spec.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [inventoryProducts, selectedInvCategory, invSearchQuery]);

  // Limit to 4 recent finished goods in dropdown when not actively searching
  const displayedInventoryProducts = useMemo(() => {
    if (invSearchQuery.trim()) {
      return filteredInventoryProducts;
    }
    return filteredInventoryProducts.slice(0, 4);
  }, [filteredInventoryProducts, invSearchQuery]);

  const isPackageSet = (item) => {
    if (!item) return false;
    return (
      item.isBundle === true ||
      item.category === 'Package Sets' ||
      item.category === 'Package Set' ||
      item.category === 'Special Bundles' ||
      item.navbarTag === 'Package Sets' ||
      (Array.isArray(item.bundleItems) && item.bundleItems.length > 0)
    );
  };

  const filteredPkgInventoryProducts = useMemo(() => {
    return inventoryProducts.filter((p) => {
      const matchCat =
        selectedPkgInvCategory === 'All' ||
        (p.category || p.itemGroup || '').toLowerCase() === selectedPkgInvCategory.toLowerCase();

      if (!matchCat) return false;

      if (!pkgInvSearchQuery.trim()) return true;

      const q = pkgInvSearchQuery.toLowerCase().trim();
      const name = (p.itemName || p.itemDescription || '').toLowerCase();
      const code = (p.code || p.itemCode || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const spec = String(p.specification || p.spec || '').toLowerCase();

      return name.includes(q) || code.includes(q) || cat.includes(q) || spec.includes(q);
    });
  }, [inventoryProducts, selectedPkgInvCategory, pkgInvSearchQuery]);

  const displayedPkgInventoryProducts = useMemo(() => {
    if (pkgInvSearchQuery.trim()) return filteredPkgInventoryProducts;
    return filteredPkgInventoryProducts.slice(0, 5);
  }, [filteredPkgInventoryProducts, pkgInvSearchQuery]);

  const calculateGroupedPrice = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const price = Number(item.originalPrice) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);
  };

  const estimatedPkgMaxBuildable = useMemo(() => {
    if (!packageFormData.bundleItems || packageFormData.bundleItems.length === 0) return 0;
    let minSets = Infinity;

    for (const bi of packageFormData.bundleItems) {
      const inv = inventoryProducts.find(
        (p) =>
          (bi.productRef && (p._id === bi.productRef || p.id === bi.productRef)) ||
          (bi.code && (p.code === bi.code || p.itemCode === bi.code))
      );
      const stock = inv ? Number(inv.quantity || 0) : 0;
      const neededPerSet = Number(bi.quantity) || 1;
      const possible = Math.floor(stock / neededPerSet);
      if (possible < minSets) minSets = possible;
    }

    return minSets === Infinity ? 0 : Math.max(0, minSets);
  }, [packageFormData.bundleItems, inventoryProducts]);

  const getPackageBuildableStock = (pkg) => {
    if (!pkg || !pkg.bundleItems || pkg.bundleItems.length === 0) return Number(pkg?.quantity || 0);
    let minSets = Infinity;
    for (const bi of pkg.bundleItems) {
      const inv = inventoryProducts.find(
        (p) =>
          (bi.productRef && (p._id === bi.productRef || p.id === bi.productRef)) ||
          (bi.code && (p.code === bi.code || p.itemCode === bi.code))
      );
      const stock = inv ? Number(inv.quantity || 0) : 0;
      const neededPerSet = Number(bi.quantity) || 1;
      const possible = Math.floor(stock / neededPerSet);
      if (possible < minSets) minSets = possible;
    }
    return minSets === Infinity ? Number(pkg.quantity || 0) : Math.max(0, minSets);
  };

  const matchedInventoryProduct = useMemo(() => {
    if (!formData.productRef && !formData.code) return null;
    return inventoryProducts.find(
      (inv) =>
        (formData.productRef && (inv._id === formData.productRef || inv.id === formData.productRef)) ||
        (formData.code && (inv.code === formData.code || inv.itemCode === formData.code))
    );
  }, [inventoryProducts, formData.productRef, formData.code]);

  const maxInventoryQty = matchedInventoryProduct ? Number(matchedInventoryProduct.quantity || 0) : null;

  const isProductChosen = Boolean(
    selectedCatalogItem ||
    formData.productRef ||
    formData.code ||
    (formData.itemDescription && formData.itemDescription.trim() !== '')
  );

  const isItemAlreadyInCatalog = (inv) => {
    if (!inv) return false;
    const invId = String(inv._id || inv.id || '').trim();
    const invCode = String(inv.code || inv.itemCode || '').trim().toLowerCase();
    const invName = String(inv.itemName || inv.itemDescription || '').trim().toLowerCase();

    return catalogProducts.some((cp) => {
      // If currently editing in modal, allow the item itself
      if (selectedCatalogItem && (cp._id === selectedCatalogItem._id || cp.id === selectedCatalogItem.id)) {
        return false;
      }
      const cpRefId = typeof cp.productRef === 'object' ? (cp.productRef?._id || cp.productRef?.id) : cp.productRef;
      if (invId && cpRefId && String(cpRefId).trim() === invId) return true;
      if (invCode && cp.code && String(cp.code).trim().toLowerCase() === invCode) return true;
      if (invName && (cp.itemName || cp.itemDescription) && String(cp.itemName || cp.itemDescription).trim().toLowerCase() === invName) return true;
      return false;
    });
  };

  const handleSelectInventoryItem = (inv) => {
    if (!inv) return;
    if (isItemAlreadyInCatalog(inv)) {
      showErrorToast(`"${inv.itemName || inv.itemDescription || 'Product'}" is already in your storefront catalog.`);
      return;
    }
    const invCat = inv.category;
    const isGeneric = !invCat || ['Finished Goods', 'Finished Product', 'Raw Materials', 'Packaging', 'Supplies'].includes(invCat);
    const chosenCategory = isGeneric ? 'Skin Care' : invCat;

    const img = inv.image || (Array.isArray(inv.images) && inv.images[0] ? inv.images[0] : '');

    setFormData((prev) => ({
      ...prev,
      productRef: inv._id || inv.id,
      code: inv.code || inv.itemCode || '',
      itemName: inv.itemName || inv.itemDescription || '',
      itemDescription: inv.itemDescription || inv.itemName || '',
      category: chosenCategory,
      navbarTag: chosenCategory,
      brand: inv.brand || 'Mhira Natural',
      quantity: Number(inv.quantity || 0),
      uom: inv.uom || 'PCS',
      images: img ? (prev.images && prev.images.length > 0 ? prev.images : [img]) : (prev.images || []),
      price: prev.price > 0 ? prev.price : (inv.price || inv.unitPrice || 0),
      originalPrice: inv.price || inv.unitPrice || 0,
      marketingDescription: inv.description || inv.marketingDescription || prev.marketingDescription || '',
    }));
    setIsInvDropdownOpen(false);
    setInvSearchQuery('');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catalogRes, inventoryRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/collections/catalog`),
        axios.get(`${API_BASE_URL}/api/products`),
      ]);

      const catData = catalogRes.status === "fulfilled" ? catalogRes.value.data : null;
      const safeCatalog = Array.isArray(catData) ? catData : (catData?.products || catData?.items || catData?.data || []);
      setCatalogProducts(safeCatalog);
      try {
        if (safeCatalog.length > 0) {
          localStorage.setItem('cached_marketing_catalog', JSON.stringify(safeCatalog));
          localStorage.setItem('mhira_db_products', JSON.stringify(safeCatalog));
        }
      } catch (e) { }

      const invData = inventoryRes.status === "fulfilled" ? inventoryRes.value.data : null;
      const safeInv = Array.isArray(invData) ? invData : (invData?.products || invData?.items || invData?.data || []);
      setInventoryProducts(safeInv);
      try {
        if (safeInv.length > 0) {
          localStorage.setItem('cached_inventory_products', JSON.stringify(safeInv));
        }
      } catch (e) { }
    } catch (err) {
      console.error('Error fetching catalog data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeLiveSync(() => {
      fetchData();
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const openAddModal = () => {
    setSelectedCatalogItem(null);
    setFormData(initialFormState);
    setProductReviews([]);
    setInvSearchQuery('');
    setSelectedInvCategory('All');
    setIsInvDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedCatalogItem(item);
    const rowRefId = typeof item.productRef === 'object' ? (item.productRef?._id || item.productRef?.id) : item.productRef;
    const matchedInv = inventoryProducts.find(
      (inv) =>
        (rowRefId && String(inv._id || inv.id) === String(rowRefId)) ||
        (item.code && String(inv.code || inv.itemCode || '').toLowerCase() === String(item.code).toLowerCase())
    );
    const syncedName = matchedInv?.itemName || item.itemName || item.itemDescription || matchedInv?.itemDescription || '';

    setFormData({
      productRef: item.productRef?._id || item.productRef || '',
      code: item.code || '',
      itemName: syncedName,
      itemDescription: syncedName,
      category: item.category || 'Skin Care',
      navbarTag: item.navbarTag || 'Skin Care',
      brand: item.brand || 'Mhira Natural',
      quantity: item.quantity || 0,
      uom: item.uom || 'pcs',
      images: item.images || [],
      price: item.price || 0,
      originalPrice: item.originalPrice || 0,
      promoBadge: item.promoBadge || '',
      isOnSale: item.isOnSale || false,
      marketingDescription: item.marketingDescription || '',
      ingredients: item.ingredients || '',
      shippingReturns: item.shippingReturns || '',
      rating: item.rating || 5,
      soldCount: item.soldCount || 0,
      isPublished: item.isPublished !== undefined ? item.isPublished : true,
    });

    setProductReviews([]);
    if (item._id) {
      setLoadingReviews(true);
      axios.get(`${API_BASE_URL}/api/reviews/product/${item._id}`)
        .then((res) => setProductReviews(Array.isArray(res.data) ? res.data : []))
        .catch(() => setProductReviews([]))
        .finally(() => setLoadingReviews(false));
    }
    setIsModalOpen(true);
  };

  const handleOpenViewModal = (item) => {
    const rowRefId = typeof item.productRef === 'object' ? (item.productRef?._id || item.productRef?.id) : item.productRef;
    const matchedInv = inventoryProducts.find(
      (inv) =>
        (rowRefId && String(inv._id || inv.id) === String(rowRefId)) ||
        (item.code && String(inv.code || inv.itemCode || '').toLowerCase() === String(item.code).toLowerCase())
    );
    const syncedName = matchedInv?.itemName || item.itemName || item.itemDescription || matchedInv?.itemDescription || 'Product';

    setViewProductModal({
      ...item,
      itemName: syncedName,
      itemDescription: syncedName,
    });
    setProductReviews([]);
    if (item._id) {
      setLoadingReviews(true);
      axios.get(`${API_BASE_URL}/api/reviews/product/${item._id}`)
        .then((res) => setProductReviews(Array.isArray(res.data) ? res.data : []))
        .catch(() => setProductReviews([]))
        .finally(() => setLoadingReviews(false));
    }
  };

  // Package Set Handlers
  const generateNextPackageCode = () => {
    let maxNum = 0;
    (catalogProducts || []).forEach((item) => {
      const codeStr = item?.code || '';
      const match = codeStr.match(/^(?:PKG-?|PKG)(\d+)/i);
      if (match) {
        const numPart = parseInt(match[1], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    try {
      if (maxNum === 0) {
        const cached = JSON.parse(localStorage.getItem('cached_marketing_catalog_products') || '[]');
        if (Array.isArray(cached)) {
          cached.forEach((item) => {
            const match = (item?.code || '').match(/^(?:PKG-?|PKG)(\d+)/i);
            if (match) {
              const numPart = parseInt(match[1], 10);
              if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
            }
          });
        }
      }
    } catch (e) { }
    return `PKG${String(maxNum + 1).padStart(4, '0')}`;
  };

  const openAddPackageSetModal = () => {
    setEditingPackageItem(null);
    const newCode = generateNextPackageCode();
    setPackageFormData({
      ...initialPackageFormState,
      code: newCode,
    });
    setPkgInvSearchQuery('');
    setSelectedPkgInvCategory('All');
    setIsPkgInvDropdownOpen(false);
    setIsPackageModalOpen(true);
  };

  const openEditPackageSetModal = (pkg) => {
    setEditingPackageItem(pkg);
    const items = Array.isArray(pkg.bundleItems) ? pkg.bundleItems : [];
    const groupedOriginal = Number(pkg.originalPrice) > 0 ? Number(pkg.originalPrice) : calculateGroupedPrice(items);

    setPackageFormData({
      _id: pkg._id,
      code: pkg.code || generateNextPackageCode(),
      itemName: pkg.itemName || pkg.itemDescription || '',
      itemDescription: pkg.itemDescription || pkg.itemName || '',
      category: 'Package Sets',
      navbarTag: 'Package Sets',
      brand: pkg.brand || 'Mhira Natural',
      quantity: typeof pkg.quantity === 'number' ? pkg.quantity : 10,
      uom: pkg.uom || 'Sets',
      images: Array.isArray(pkg.images) && pkg.images.length > 0 ? pkg.images : (pkg.image ? [pkg.image] : []),
      price: Number(pkg.price) || 0,
      originalPrice: groupedOriginal,
      promoBadge: pkg.promoBadge || 'Special Bundle',
      isOnSale: pkg.isOnSale ?? true,
      bundleItems: items,
      marketingDescription: pkg.marketingDescription || '',
      shippingReturns: pkg.shippingReturns || '1-3 Business Days (Metro Manila)',
      rating: pkg.rating || 5,
      soldCount: pkg.soldCount || 0,
      isPublished: pkg.isPublished ?? true,
      isBundle: true,
    });
    setPkgInvSearchQuery('');
    setSelectedPkgInvCategory('All');
    setIsPkgInvDropdownOpen(false);
    setIsPackageModalOpen(true);
  };

  const handleAddFinishedGoodToBundle = (inv) => {
    if (!inv) return;

    const invId = inv._id || inv.id;
    const invCode = inv.code || inv.itemCode || '';
    const invName = inv.itemName || inv.itemDescription || 'Finished Good';
    const invPrice = Number(inv.price || inv.unitPrice || inv.sellingPrice || 250);
    const invImg = inv.image || (Array.isArray(inv.images) && inv.images[0]) || '';
    const invSpec = inv.specification || inv.spec || '';
    const invUom = inv.uom || 'PCS';

    setPackageFormData((prev) => {
      const existingIdx = prev.bundleItems.findIndex(
        (bi) =>
          (invId && bi.productRef && String(bi.productRef) === String(invId)) ||
          (invCode && bi.code && bi.code === invCode)
      );

      let updatedItems = [...prev.bundleItems];
      if (existingIdx > -1) {
        updatedItems[existingIdx] = {
          ...updatedItems[existingIdx],
          quantity: Number(updatedItems[existingIdx].quantity || 1) + 1,
        };
      } else {
        updatedItems.push({
          productRef: invId,
          code: invCode,
          itemName: invName,
          itemDescription: invName,
          category: inv.category || 'Skin Care',
          uom: invUom,
          specification: invSpec,
          quantity: 1,
          originalPrice: invPrice,
          image: invImg,
        });
      }

      const newGroupedTotal = calculateGroupedPrice(updatedItems);
      const currentPrice = Number(prev.price) > 0 ? prev.price : Math.round(newGroupedTotal * 0.85);

      let updatedName = prev.itemName;
      if (!updatedName || updatedName.trim() === '') {
        const itemNames = updatedItems.map((i) => i.itemName).slice(0, 2).join(' + ');
        updatedName = `${itemNames} Set`;
      }

      return {
        ...prev,
        itemName: updatedName,
        itemDescription: updatedName,
        bundleItems: updatedItems,
        originalPrice: newGroupedTotal,
        price: currentPrice,
      };
    });

    setIsPkgInvDropdownOpen(false);
    setPkgInvSearchQuery('');
  };

  const handleUpdatePkgItemQuantity = (index, delta) => {
    setPackageFormData((prev) => {
      const updated = [...prev.bundleItems];
      const newQty = Number(updated[index].quantity || 1) + delta;
      if (newQty <= 0) {
        updated.splice(index, 1);
      } else {
        updated[index] = { ...updated[index], quantity: newQty };
      }

      const newGroupedTotal = calculateGroupedPrice(updated);
      return {
        ...prev,
        bundleItems: updated,
        originalPrice: newGroupedTotal,
      };
    });
  };

  const handleRemovePkgBundleItem = (index) => {
    setPackageFormData((prev) => {
      const updated = [...prev.bundleItems];
      updated.splice(index, 1);
      const newGroupedTotal = calculateGroupedPrice(updated);
      return {
        ...prev,
        bundleItems: updated,
        originalPrice: newGroupedTotal,
      };
    });
  };

  const applyPkgDiscountPercent = (pct) => {
    const base = Number(packageFormData.originalPrice) || 0;
    if (base <= 0) return;
    const discounted = Math.round(base * (1 - pct / 100));
    setPackageFormData((prev) => ({
      ...prev,
      price: discounted,
      isOnSale: pct > 0,
    }));
  };

  const handleApplyNoDiscount = () => {
    const base = Number(packageFormData.originalPrice) || 0;
    setPackageFormData((prev) => ({
      ...prev,
      price: base,
      isOnSale: false,
    }));
  };

  const currentPkgDiscountPct = useMemo(() => {
    const orig = Number(packageFormData.originalPrice) || 0;
    const curr = Number(packageFormData.price) || 0;
    if (orig <= 0 || curr <= 0) return null;
    if (curr >= orig) return 0;
    const diff = orig - curr;
    return Math.round((diff / orig) * 100);
  }, [packageFormData.originalPrice, packageFormData.price]);

  const handleCopyPkgBundledImages = () => {
    if (!packageFormData.bundleItems || packageFormData.bundleItems.length === 0) {
      showErrorToast('Please add at least one finished good to copy photos from.');
      return;
    }
    const collected = [];
    packageFormData.bundleItems.forEach((bi) => {
      if (bi.image && !collected.includes(bi.image)) collected.push(bi.image);
    });

    if (collected.length === 0) {
      showErrorToast('The selected finished goods do not have storefront photos yet.');
      return;
    }

    setPackageFormData((prev) => {
      const existing = prev.images || [];
      const merged = Array.from(new Set([...existing, ...collected]));
      return { ...prev, images: merged };
    });
    showSuccessToast(`Imported ${collected.length} photo(s) from bundled finished goods.`);
  };

  const handleAutoGeneratePkgDescription = () => {
    if (!packageFormData.bundleItems || packageFormData.bundleItems.length === 0) {
      showErrorToast('Please add finished goods before auto-generating a description.');
      return;
    }

    const itemsSummary = packageFormData.bundleItems
      .map((bi) => `• ${bi.quantity}x ${bi.itemName} (${bi.specification ? `${bi.specification} ${bi.uom || ''}` : bi.uom || 'PCS'})`)
      .join('\n');

    const template = `Elevate your personal self-care regimen with the ${packageFormData.itemName || 'Mhira Botanical Package Set'}. Specially bundled to deliver synergistic skin and body nourishment using locally sourced organic botanical ingredients.\n\nPackage Set Includes:\n${itemsSummary}\n\nHow to Use:\nIntegrate these botanical essentials into your morning and evening routine for visibly rejuvenated, radiant, and hydrated results.`;

    setPackageFormData((prev) => ({
      ...prev,
      marketingDescription: template,
    }));
    showSuccessToast('Auto-generated package set overview and usage instructions.');
  };

  const handleMultiplePackageImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showErrorToast(`"${file.name}" is not a valid image file.`);
        continue;
      }
      try {
        const compressedBase64 = await compressImageToBase64(file, {
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.75,
        });
        if (compressedBase64) {
          setPackageFormData((prev) => ({
            ...prev,
            images: [...(prev.images || []), compressedBase64],
          }));
        }
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  };

  const handleRemovePackageImageAtIndex = (idx) => {
    setPackageFormData((prev) => {
      const updated = [...(prev.images || [])];
      updated.splice(idx, 1);
      return { ...prev, images: updated };
    });
  };

  const handleSavePackageSet = async (e) => {
    if (e) e.preventDefault();

    if (!packageFormData.bundleItems || packageFormData.bundleItems.length === 0) {
      showErrorToast('Please group at least one Finished Good into this package set.');
      return;
    }

    if (!packageFormData.itemName || packageFormData.itemName.trim() === '') {
      showErrorToast('Please provide a Package Set Name.');
      return;
    }

    if (Number(packageFormData.price) <= 0) {
      showErrorToast('Please set a valid Selling Price.');
      return;
    }

    try {
      setSubmittingPackage(true);
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const finalCode = (packageFormData.code && packageFormData.code.trim()) ? packageFormData.code.trim().toUpperCase() : generateNextPackageCode();

      const payload = {
        code: finalCode,
        itemName: packageFormData.itemName.trim(),
        itemDescription: packageFormData.itemName.trim(),
        category: 'Package Sets',
        navbarTag: 'Package Sets',
        brand: packageFormData.brand || 'Mhira Natural',
        price: Number(packageFormData.price),
        originalPrice: Number(packageFormData.originalPrice) || Number(packageFormData.price),
        quantity: Math.max(0, Number(packageFormData.quantity) || 0),
        uom: packageFormData.uom || 'Sets',
        images: packageFormData.images || [],
        image: (packageFormData.images && packageFormData.images[0]) || '',
        promoBadge: packageFormData.promoBadge || 'Special Bundle',
        isOnSale: Number(packageFormData.originalPrice) > Number(packageFormData.price),
        bundleItems: packageFormData.bundleItems,
        marketingDescription: packageFormData.marketingDescription || '',
        shippingReturns: packageFormData.shippingReturns || '1-3 Business Days (Metro Manila)',
        isPublished: packageFormData.isPublished,
        isBundle: true,
      };

      if (editingPackageItem && (editingPackageItem._id || editingPackageItem.id)) {
        const id = editingPackageItem._id || editingPackageItem.id;
        await axios.put(`${API_BASE_URL}/api/collections/catalog/${id}`, payload, config);
        showSuccessToast(`Updated package set "${payload.itemName}".`);
      } else {
        await axios.post(`${API_BASE_URL}/api/collections/catalog`, payload, config);
        showSuccessToast(`Created new package set "${payload.itemName}".`);
      }

      setIsPackageModalOpen(false);
      setEditingPackageItem(null);
      notifyLiveSync('products');
      fetchData();
    } catch (err) {
      console.error('Error saving package set:', err);
      showErrorToast(err.response?.data?.message || 'Failed to save package set.');
    } finally {
      setSubmittingPackage(false);
    }
  };

  const handleInventorySelect = (e) => {
    const invId = e.target.value;
    if (!invId) return;

    const inv = inventoryProducts.find((i) => (i._id || i.id) === invId);
    if (inv) {
      const invCat = inv.category;
      const isGeneric = !invCat || ['Finished Goods', 'Finished Product', 'Raw Materials', 'Packaging', 'Supplies'].includes(invCat);
      const chosenCategory = isGeneric ? 'Skin Care' : invCat;

      setFormData((prev) => ({
        ...prev,
        productRef: invId,
        code: inv.code || inv.itemCode || '',
        itemDescription: inv.itemDescription || inv.itemName || '',
        category: chosenCategory,
        navbarTag: chosenCategory,
        brand: inv.brand || 'Mhira Natural',
        quantity: inv.quantity || 0,
        uom: 'PCS',
        images: inv.image ? [inv.image] : inv.images || [],
        price: inv.price || inv.unitPrice || 0,
        originalPrice: inv.price || inv.unitPrice || 0,
      }));
    }
  };

  const handleMultipleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showErrorToast(`${file.name} is not a valid image file.`);
        continue;
      }
      try {
        const compressedBase64 = await compressImageToBase64(file, {
          maxWidth: 600,
          maxHeight: 600,
          quality: 0.75,
        });
        if (compressedBase64) {
          setFormData((prev) => ({
            ...prev,
            images: [...(prev.images || []), compressedBase64]
          }));
        }
      } catch (err) {
        console.error('Error compressing catalog image:', err);
      }
    }
  };

  const handleRemoveImageAtIndex = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSaveCatalog = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.itemDescription) {
      showErrorToast('Please select a finished goods product from inventory first.');
      return;
    }

    if (maxInventoryQty !== null && Number(formData.quantity) > maxInventoryQty) {
      showErrorToast(`Quantity cannot exceed warehouse stock of ${maxInventoryQty} PCS.`);
      return;
    }

    if (!selectedCatalogItem) {
      const isDuplicate = catalogProducts.some((cp) => {
        const cpRefId = typeof cp.productRef === 'object' ? (cp.productRef?._id || cp.productRef?.id) : cp.productRef;
        const sameRef = formData.productRef && cpRefId && String(cpRefId).trim() === String(formData.productRef).trim();
        const sameCode = formData.code && cp.code && String(cp.code).trim().toLowerCase() === String(formData.code).trim().toLowerCase();
        const sameName = (formData.itemName || formData.itemDescription) && (cp.itemName || cp.itemDescription) &&
          String(formData.itemName || formData.itemDescription).trim().toLowerCase() === String(cp.itemName || cp.itemDescription).trim().toLowerCase();
        return sameRef || sameCode || sameName;
      });

      if (isDuplicate) {
        showErrorToast(`"${formData.itemName || formData.itemDescription}" already exists in the store catalog.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      if (selectedCatalogItem) {
        await axios.put(
          `${API_BASE_URL}/api/collections/catalog/${selectedCatalogItem._id}`,
          formData,
          config
        );
        showSuccessToast('Store catalog product updated successfully!');
      } else {
        await axios.post(`${API_BASE_URL}/api/collections/catalog`, formData, config);
        showSuccessToast('Product added to storefront catalog!');
      }

      setIsModalOpen(false);
      notifyLiveSync('products');
      fetchData();
    } catch (err) {
      console.error('Error saving catalog product:', err);
      showErrorToast(err.response?.data?.message || 'Failed to save catalog product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (item, e) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      };

      await axios.put(
        `${API_BASE_URL}/api/collections/catalog/${item._id}`,
        { ...item, isPublished: !item.isPublished },
        config
      );

      showSuccessToast(
        `Product ${!item.isPublished ? 'published to storefront' : 'moved to draft'}!`
      );
      notifyLiveSync('products');
      fetchData();
    } catch (err) {
      console.error('Error toggling status:', err);
      showErrorToast('Failed to update product status.');
    }
  };

  const handleDeleteCatalog = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Remove this product from the customer storefront catalog?')) return;

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      await axios.delete(`${API_BASE_URL}/api/collections/catalog/${id}`, config);
      showSuccessToast('Product removed from catalog.');
      if (viewProductModal?._id === id) setViewProductModal(null);
      notifyLiveSync('products');
      fetchData();
    } catch (err) {
      console.error('Error deleting product:', err);
      showErrorToast('Failed to remove product from catalog.');
    }
  };

  const handleToggleArchive = async (item) => {
    const isCurrentlyArchived = Boolean(item.isArchived);
    const actionLabel = isCurrentlyArchived
      ? 'restore this product to active catalog'
      : 'move this product to archive vault';
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const id = item._id || item.id;

      await axios.patch(`${API_BASE_URL}/api/collections/catalog/${id}/archive`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showSuccessToast(
        isCurrentlyArchived ? 'Product restored to active catalog!' : 'Product moved to archive vault!'
      );
      notifyLiveSync('products');
      fetchData();
    } catch (error) {
      console.error('Error toggling archive status:', error);
      showErrorToast(error.response?.data?.message || 'Failed to update archive status.');
    }
  };

  // Filtered Catalog Items
  const filteredProducts = useMemo(() => {
    let result = catalogProducts.filter((item) => {
      // 0. Vault / Archive check
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;

      // 1. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.code || '').toLowerCase();
        const rowRefId = typeof item.productRef === 'object' ? (item.productRef?._id || item.productRef?.id) : item.productRef;
        const matchedInv = inventoryProducts.find(
          (inv) =>
            (rowRefId && String(inv._id || inv.id) === String(rowRefId)) ||
            (item.code && String(inv.code || inv.itemCode || '').toLowerCase() === String(item.code).toLowerCase())
        );
        const name = (matchedInv?.itemName || item.itemName || item.itemDescription || matchedInv?.itemDescription || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !brand.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'All') {
        if ((item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 2.5 Navbar Tag
      if (selectedNavbarTag !== 'All') {
        if ((item.navbarTag || '').toLowerCase() !== selectedNavbarTag.toLowerCase()) {
          return false;
        }
      }

      // 3. Status (Live / Draft)
      if (selectedStatus !== 'All') {
        const isPub = selectedStatus === 'published';
        if (Boolean(item.isPublished) !== isPub) {
          return false;
        }
      }

      // 4. Quick Filters: Zero Qty
      const qty = Number(item.quantity || 0);
      if (showZeroOnly && qty !== 0) return false;
      if (hideZeroQty && qty === 0) return false;

      // 5. On Sale / Promos Only
      if (onSaleOnly && !item.isOnSale && !item.promoBadge) return false;

      return true;
    });

    // Sorting
    if (sortBy === 'price-low') {
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === 'stock-low') {
      result.sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0));
    } else if (sortBy === 'stock-high') {
      result.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => {
        const rowRefIdA = typeof a.productRef === 'object' ? (a.productRef?._id || a.productRef?.id) : a.productRef;
        const matchedA = inventoryProducts.find(
          (inv) =>
            (rowRefIdA && String(inv._id || inv.id) === String(rowRefIdA)) ||
            (a.code && String(inv.code || inv.itemCode || '').toLowerCase() === String(a.code).toLowerCase())
        );
        const nameA = matchedA?.itemName || a.itemName || a.itemDescription || '';

        const rowRefIdB = typeof b.productRef === 'object' ? (b.productRef?._id || b.productRef?.id) : b.productRef;
        const matchedB = inventoryProducts.find(
          (inv) =>
            (rowRefIdB && String(inv._id || inv.id) === String(rowRefIdB)) ||
            (b.code && String(inv.code || inv.itemCode || '').toLowerCase() === String(b.code).toLowerCase())
        );
        const nameB = matchedB?.itemName || b.itemName || b.itemDescription || '';
        return nameA.localeCompare(nameB);
      });
    }

    return result;
  }, [catalogProducts, inventoryProducts, viewMode, searchQuery, selectedCategory, selectedNavbarTag, selectedStatus, hideZeroQty, showZeroOnly, onSaleOnly, sortBy]);

  // Summary KPIs
  const publishedCount = useMemo(() => catalogProducts.filter((p) => p.isPublished && !p.isArchived).length, [catalogProducts]);
  const draftCount = useMemo(() => catalogProducts.filter((p) => !p.isPublished && !p.isArchived).length, [catalogProducts]);
  const promoCount = useMemo(() => catalogProducts.filter((p) => (p.isOnSale || p.promoBadge) && !p.isArchived).length, [catalogProducts]);
  const zeroCount = useMemo(() => catalogProducts.filter((p) => Number(p.quantity || 0) === 0 && !p.isArchived).length, [catalogProducts]);

  const peso = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusModules = [
    { id: 'active', label: 'Products Catalog' },
    { id: 'archived', label: 'Archive Vault' },
  ];

  // Unique Categories
  const uniqueCategories = useMemo(() => {
    const set = new Set(['Skin Care', 'Hair Care', 'Bath & Body']);
    catalogProducts.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [catalogProducts]);

  // Unique Navbar Tags
  const uniqueNavbarTags = useMemo(() => {
    const set = new Set(['Skin Care', 'Hair Care', 'Bath & Body']);
    catalogProducts.forEach((p) => {
      if (p.navbarTag && p.navbarTag.trim()) set.add(p.navbarTag.trim());
    });
    return Array.from(set);
  }, [catalogProducts]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedCategory !== 'All') count++;
    if (selectedNavbarTag !== 'All') count++;
    if (selectedStatus !== 'All') count++;
    if (hideZeroQty) count++;
    if (showZeroOnly) count++;
    if (onSaleOnly) count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [searchQuery, selectedCategory, selectedNavbarTag, selectedStatus, hideZeroQty, showZeroOnly, onSaleOnly, sortBy]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedNavbarTag('All');
    setSelectedStatus('All');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setOnSaleOnly(false);
    setSortBy('newest');
    setCurrentPage(1);
  };

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Reset pagination when filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, searchQuery, selectedCategory, selectedNavbarTag, selectedStatus, hideZeroQty, showZeroOnly, onSaleOnly, sortBy]);

  // Export PDF Catalog Report
  const handleExportCatalogPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 297, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - STOREFRONT PRODUCT CATALOG MASTERLIST', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Catalog Items: ${filteredProducts.length}`,
        14,
        18
      );

      const tableHead = [
        ['#', 'Item Code', 'Product Name', 'Category', 'Store Price', 'Promo / Discount', 'Stock', 'Store Status']
      ];

      const tableBody = filteredProducts.map((p, idx) => {
        const rowRefId = typeof p.productRef === 'object' ? (p.productRef?._id || p.productRef?.id) : p.productRef;
        const matchedInv = inventoryProducts.find(
          (inv) =>
            (rowRefId && String(inv._id || inv.id) === String(rowRefId)) ||
            (p.code && String(inv.code || inv.itemCode || '').toLowerCase() === String(p.code).toLowerCase())
        );
        const displayName = matchedInv?.itemName || p.itemName || p.itemDescription || matchedInv?.itemDescription || 'Product';

        return [
          idx + 1,
          p.code || 'N/A',
          displayName,
          p.category || 'General',
          `PHP ${Number(p.price || 0).toFixed(2)}`,
          p.promoBadge || (p.isOnSale ? 'On Sale' : '-'),
          `${p.quantity || 0} ${p.uom || 'pcs'}`,
          p.isPublished ? 'PUBLISHED (LIVE)' : 'DRAFT'
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
          fontSize: 8
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        theme: 'grid',
        styles: { cellPadding: 2.2 }
      });

      const fileName = `Product_Catalog_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Catalog Report: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export catalog PDF.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">

      {/* MAIN CONTAINER (MATCHES REPORTS.JSX LAYOUT & BRAND COLOR SCHEME) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">

        {/* TOP BAR: EXCEL SHEET TABS & STOREFRONT LINKS */}
        <div className="flex items-center justify-between gap-3 bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0 flex-wrap">
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

          {/* STOREFRONT PREVIEW LINKS */}
          <div className="flex items-center gap-2 py-1 -mb-px">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline select-none">
              Storefront Preview:
            </span>
            <a
              href="/collection"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 rounded-md transition-all shadow-2xs hover:scale-105 active:scale-95"
              title="Open Customer All Products Catalog (http://localhost:5173/collection)"
            >
              <span>ALL PRODUCTS</span>
              <ExternalLink className="w-3 h-3 text-emerald-700" />
            </a>
            <a
              href="/packages"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#01390f] bg-[#EDF7EE] hover:bg-[#d8eed9] border border-[#d5ead7] rounded-md transition-all shadow-2xs hover:scale-105 active:scale-95"
              title="Open Customer Package Sets (http://localhost:5173/packages)"
            >
              <span>PACKAGE SETS</span>
              <ExternalLink className="w-3 h-3 text-[#01390f]" />
            </a>
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
          {/* ACTIONS GROUP */}
          <div className={`w-full ${viewMode === 'archived' ? 'lg:w-[160px]' : 'lg:w-[330px]'} shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]`}>
            <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2 lg:gap-1.5 flex-1">
              {/* Action Buttons */}
              {viewMode !== 'archived' && (
                <>
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="flex-1 sm:flex-initial sm:w-[90px] lg:w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                    title="Add New Store Product (publishes to /collection)"
                  >
                    <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                      Add<br />Product
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={openAddPackageSetModal}
                    className="flex-1 sm:flex-initial sm:w-[96px] lg:w-[82px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                    title="Add New Package Set Bundle (publishes to /packages)"
                  >
                    <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                    <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                      Add<br />Package Set
                    </span>
                  </button>
                </>
              )}

              {/* Stacked Compact Rows */}
              <div className="w-full sm:w-auto sm:flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                {/* Reset Filters */}
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  disabled={activeFiltersCount === 0}
                  className={`flex items-center justify-center sm:justify-start gap-1.5 px-2 py-1 lg:py-0.5 rounded border transition-colors text-xs font-semibold cursor-pointer text-center sm:text-left w-full h-[32px] sm:h-[28px] lg:h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap shadow-2xs sm:shadow-none ${activeFiltersCount > 0
                      ? 'bg-emerald-50/80 border-emerald-200/90 text-[#01390f] hover:bg-emerald-100/90'
                      : 'bg-slate-50 lg:bg-transparent border-slate-200/80 lg:border-transparent text-slate-700 hover:bg-slate-100'
                    }`}
                  title={activeFiltersCount > 0 ? `Reset active filters (${activeFiltersCount})` : 'No active filters'}
                >
                  <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${activeFiltersCount > 0 ? 'text-[#01390f]' : 'text-slate-500'}`} />
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
                  placeholder="Search description, code, category, brand..."
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

              {/* Layer 2: 4-column Dropdowns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
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

                {/* Navbar / Collection Tag Select */}
                <div className="relative w-full">
                  <Tag className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedNavbarTag}
                    onChange={(e) => setSelectedNavbarTag(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Tags</option>
                    {uniqueNavbarTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Status Select (Live / Draft / All) */}
                <div className="relative w-full">
                  <PackageCheck className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Status</option>
                    <option value="published">Live Only</option>
                    <option value="draft">Drafts Only</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Order */}
                <div className="relative w-full">
                  <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="newest">Sort: Default / Recent</option>
                    <option value="price-low">Sort: Price Low to High</option>
                    <option value="price-high">Sort: Price High to Low</option>
                    <option value="stock-low">Sort: Stock Low to High</option>
                    <option value="stock-high">Sort: Stock High to Low</option>
                    <option value="name-asc">Sort: Product Name A-Z</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles */}
              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    const next = !hideZeroQty;
                    setHideZeroQty(next);
                    if (next) setShowZeroOnly(false);
                  }}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${hideZeroQty
                    ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Hide 0 Qty
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !showZeroOnly;
                    setShowZeroOnly(next);
                    if (next) setHideZeroQty(false);
                  }}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${showZeroOnly
                    ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  0 Qty Only
                </button>

                <button
                  type="button"
                  onClick={() => setOnSaleOnly(!onSaleOnly)}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${onSaleOnly
                    ? 'bg-amber-50 border-amber-500 text-amber-800 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  On Sale Only
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
              Search & Filter
            </div>
          </div>
        </div>

        {/* HR DIVIDER ABOVE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* Table Container */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {!loading && filteredProducts.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onRowsPerPageChange={(rows) => {
                setItemsPerPage(rows);
                setCurrentPage(1);
              }}
              rowsPerPageOptions={[5, 10, 20, 50, 100]}
            />
          )}

          {loading ? (
            <div className="flex flex-col justify-center items-center min-h-[400px] text-slate-400 gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#01390f]" />
              <span className="text-center font-medium text-xs">
                Fetching commercial product catalog...
              </span>
            </div>
          ) : paginatedProducts.length > 0 ? (
            <div className="overflow-x-auto relative custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white min-w-[200px]">ITEM NAME</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">IMAGE</th>
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CODE</th>
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-white">STORE PRICE</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STOREFRONT QUANTITY</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">TOTAL QUANTITY</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">SPECIFICATION</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">UOM</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STOREFRONT STATUS</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Loading products catalog...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan="10"
                        className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Info className="w-6 h-6 text-slate-300" />
                          <span>
                            {viewMode === 'archived'
                              ? 'No archived products found in the vault.'
                              : 'No products matched your search or filter criteria.'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((row, idx) => {
                      const isDepleted = Number(row.quantity ?? 0) === 0;
                      const count = Number(row.quantity ?? 0);
                      const isPkg = isPackageSet(row);
                      const rowRefId =
                        typeof row.productRef === 'object'
                          ? row.productRef?._id || row.productRef?.id
                          : row.productRef;
                      const matchedInv = inventoryProducts.find(
                        (inv) =>
                          (rowRefId && String(inv._id || inv.id) === String(rowRefId)) ||
                          (row.code &&
                            String(inv.code || inv.itemCode || '').toLowerCase() ===
                            String(row.code).toLowerCase()) ||
                          ((row.itemName || row.itemDescription) &&
                            (String(inv.itemName || '').toLowerCase() ===
                              String(row.itemName || row.itemDescription).toLowerCase() ||
                              String(inv.itemDescription || '').toLowerCase() ===
                              String(row.itemName || row.itemDescription).toLowerCase()))
                      );
                      const maxQty = isPkg
                        ? getPackageBuildableStock(row)
                        : matchedInv !== undefined
                          ? Number(matchedInv.quantity ?? 0)
                          : count;
                      const specVal = isPkg
                        ? `${Array.isArray(row.bundleItems) ? row.bundleItems.length : 0} items bundle`
                        : matchedInv?.specification || row.specification || '—';
                      const uomVal = isPkg
                        ? row.uom || 'Sets'
                        : matchedInv?.uom || row.uom || 'PCS';
                      const displayName = isPkg
                        ? row.itemName || row.itemDescription || 'Package Set'
                        : matchedInv?.itemName ||
                        row.itemName ||
                        row.itemDescription ||
                        matchedInv?.itemDescription ||
                        'Product';

                      return (
                        <tr
                          key={row._id || row.id || idx}
                          className={`transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm ${isDepleted && showZeroOnly ? 'bg-red-50/40' : ''
                            }`}
                        >
                          {/* 1. ITEM NAME */}
                          <td
                            className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors max-w-xs truncate"
                            title={displayName}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-xs text-slate-900 truncate">
                                {displayName}
                              </span>
                              {(isPkg || row.isOnSale) && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {isPkg && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200 uppercase tracking-wide">
                                      Package Set (
                                      {Array.isArray(row.bundleItems) ? row.bundleItems.length : 0} items)
                                    </span>
                                  )}
                                  {row.isOnSale && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-800 border border-amber-500/30 uppercase tracking-wide">
                                      {row.promoBadge || 'On Sale'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 2. IMAGE */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <div className="flex justify-center items-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isPkg) {
                                    setViewPackageModal(row);
                                  } else {
                                    handleOpenViewModal(row);
                                  }
                                }}
                                className="relative group/img cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-[#01390f] focus:outline-none focus:ring-2 focus:ring-[#01390f]/30 shadow-2xs transition-all hover:scale-105 active:scale-95 bg-slate-50"
                                title="Click to view full product image & specs"
                                aria-label={`View photo of ${displayName}`}
                              >
                                <img
                                  src={resolveProductImageUrl(
                                    (row.images && row.images[0]) || row.image
                                  )}
                                  alt={displayName}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = '/mhira_removebg.png';
                                  }}
                                  className="w-9 h-9 object-cover rounded-lg bg-slate-50 transition-transform duration-200 group-hover/img:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white rounded-lg">
                                  <Eye className="w-3.5 h-3.5 drop-shadow" />
                                </div>
                              </button>
                            </div>
                          </td>

                          {/* 3. CODE */}
                          <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                              {row.code || 'N/A'}
                            </span>
                          </td>

                          {/* 4. CATEGORY */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200">
                              {row.category || 'Standard'}
                            </span>
                          </td>

                          {/* 5. STORE PRICE */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            ₱{peso(row.price || 0)}
                          </td>

                          {/* 6. STOREFRONT QUANTITY (Blue accent column) */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                            {count.toLocaleString()}
                          </td>

                          {/* 7. MAX QUANTITY */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono font-bold text-xs text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {maxQty.toLocaleString()}
                          </td>

                          {/* 8. SPECIFICATION */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-semibold text-slate-700 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {specVal}
                          </td>

                          {/* 9. UOM */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs uppercase text-slate-700 font-bold bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {uomVal}
                          </td>

                          {/* 10. STATUS (Tinted cell matching the Expiry status style) */}
                          <td
                            className={`px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold transition-colors select-none ${row.isPublished
                                ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30 text-emerald-900'
                                : 'bg-amber-500/20 group-hover:bg-amber-500/30 text-amber-900'
                              }`}
                          >
                            <span>{row.isPublished ? 'Live' : 'Draft'}</span>
                          </td>

                          {/* 11. ACTION (Sticky Right) */}
                          <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px] transition-colors">
                            <div className="flex items-center justify-center gap-1.5">
                              {viewMode !== 'archived' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isPkg) {
                                        openEditPackageSetModal(row);
                                      } else {
                                        openEditModal(row);
                                      }
                                    }}
                                    title={
                                      isPkg
                                        ? 'Edit Package Set Details'
                                        : 'Edit Product Details'
                                    }
                                    className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleArchive(row)}
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
                                    onClick={() => handleToggleArchive(row)}
                                    title="Restore to Active Catalog"
                                    className="w-8 h-8 rounded-full bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCatalog(row._id, e)}
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
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-14 text-slate-500 font-medium italic text-xs">
              {viewMode === 'archived'
                ? 'No archived products found in the vault.'
                : 'No records match the selected filters.'}
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT CATALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div
            className={`bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col my-auto transition-all duration-300 ease-in-out animate-in fade-in zoom-in-95 ${!isProductChosen
              ? isInvDropdownOpen
                ? 'h-[540px] sm:h-[560px] max-h-[90vh]'
                : 'h-[245px] sm:h-[250px]'
              : 'h-[85vh] sm:h-[88vh] max-h-[88vh]'
              }`}
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {selectedCatalogItem ? 'Edit Storefront Product' : 'Add Product to Store Catalog'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure storefront pricing, promotional badges, and marketing descriptions
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

            <form onSubmit={handleSaveCatalog} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              <div
                className={`p-6 flex flex-col gap-4 flex-1 custom-scrollbar ${!isProductChosen ? 'overflow-visible' : 'overflow-y-auto'
                  }`}
              >
                {/* SELECT FROM FINISHED GOODS INVENTORY DROPDOWN (ONLY IN ADD MODE) */}
                {!selectedCatalogItem && (
                  <div className="flex flex-col gap-1.5 relative" ref={invDropdownRef}>
                    <div
                      className="flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setIsInvDropdownOpen((prev) => !prev)}
                    >
                      <label className="block text-xs font-semibold text-slate-700 cursor-pointer">
                        Select From Finished Goods Inventory
                      </label>
                    </div>

                    {/* DUAL SEARCH & SEGMENT CONTROLS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* 1. SEGMENT FILTER */}
                      <div className="sm:col-span-1 relative">
                        <Tag className="w-4 h-4 absolute left-3 top-2.5 pointer-events-none text-slate-400" />
                        <select
                          value={selectedInvCategory}
                          onChange={(e) => {
                            setSelectedInvCategory(e.target.value);
                            setIsInvDropdownOpen(true);
                          }}
                          onClick={() => setIsInvDropdownOpen(true)}
                          onFocus={() => setIsInvDropdownOpen(true)}
                          className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 cursor-pointer appearance-none truncate transition-all h-[34px]"
                        >
                          <option value="All">All Categories ({uniqueInvCategories.length})</option>
                          {uniqueInvCategories.map((cat) => (
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
                          id="finished-goods-search-input"
                          type="text"
                          value={invSearchQuery}
                          onChange={(e) => {
                            setInvSearchQuery(e.target.value);
                            setIsInvDropdownOpen(true);
                          }}
                          onFocus={() => setIsInvDropdownOpen(true)}
                          onClick={() => setIsInvDropdownOpen(true)}
                          placeholder="Search description, dimension, or code..."
                          className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 transition-all h-[34px]"
                        />
                        {invSearchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInvSearchQuery('');
                              setIsInvDropdownOpen(true);
                            }}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Clear search"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* SEARCH SUGGESTIONS DROPDOWN WITH PROMINENT DIMENSIONS */}
                    {isInvDropdownOpen && (
                      <div className="absolute left-0 right-0 top-[104%] bg-white border border-slate-200 divide-y divide-slate-100 rounded-2xl max-h-[280px] overflow-y-auto z-50 p-2.5 sm:p-3 custom-scrollbar">
                        {displayedInventoryProducts.length > 0 ? (
                          displayedInventoryProducts.map((p, idx) => {
                            const itemId = p._id || p.id;
                            const dimension = p.specification || p.spec || p.netWeight;
                            const segment = p.category || p.itemGroup || 'Finished Goods';
                            const count = p.quantity ?? 0;
                            const uom = p.uom || 'PCS';
                            const desc = p.itemName || p.itemDescription || 'Finished Good';
                            const code = p.code || p.itemCode || 'FG-N/A';
                            const isOutOfStock = Number(count) <= 0;
                            const alreadyExists = isItemAlreadyInCatalog(p);
                            const isAdded = formData.code === code || (formData.itemName && formData.itemName === desc);
                            const img = p.image || (Array.isArray(p.images) ? p.images[0] : null);

                            return (
                              <div
                                key={itemId || idx}
                                onMouseDown={(e) => {
                                  if (alreadyExists) {
                                    e.preventDefault();
                                    showErrorToast(`"${desc}" is already added to the store catalog.`);
                                    return;
                                  }
                                  handleSelectInventoryItem(p);
                                  setIsInvDropdownOpen(false);
                                  setInvSearchQuery('');
                                }}
                                className={`p-2.5 flex items-center justify-between gap-3 rounded-lg transition-colors ${alreadyExists
                                  ? 'opacity-50 bg-slate-50/80 cursor-not-allowed select-none'
                                  : isAdded
                                    ? 'opacity-60 bg-emerald-50/20 cursor-pointer hover:bg-slate-50'
                                    : 'hover:bg-slate-50 cursor-pointer'
                                  }`}
                                title={alreadyExists ? `"${desc}" is already in the store catalog` : undefined}
                              >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {img ? (
                                      <img
                                        src={resolveProductImageUrl(img)}
                                        alt={desc}
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = '/mhira_removebg.png';
                                        }}
                                        className={`w-full h-full object-cover ${alreadyExists ? 'grayscale' : ''}`}
                                      />
                                    ) : (
                                      <Package className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`font-bold text-sm whitespace-normal break-words ${alreadyExists ? 'text-slate-500' : 'text-slate-800'}`}>
                                        {desc}
                                      </span>
                                      {dimension && (
                                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border bg-indigo-50 border-indigo-200 text-indigo-700">
                                          {dimension} {uom}
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
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase border ${isOutOfStock
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                      }`}
                                  >
                                    Avail: {Number(count).toLocaleString()} {uom}
                                  </span>
                                  {alreadyExists ? (
                                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Already in Store
                                    </span>
                                  ) : isAdded ? (
                                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center flex flex-col items-center gap-2">
                            <p className="text-rose-500 italic font-medium text-xs">
                              No finished goods found matching &ldquo;{invSearchQuery}&rdquo; {selectedInvCategory !== 'All' ? `in ${selectedInvCategory}` : ''}.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SELECTED PRODUCT CONFIRMATION CARD (MATCHES WIP PREVIEW CARD) */}
                {isProductChosen && (
                  <div className="p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0">
                        {(formData.images && formData.images[0]) || matchedInventoryProduct?.image ? (
                          <img
                            src={resolveProductImageUrl((formData.images && formData.images[0]) || matchedInventoryProduct?.image)}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/mhira_removebg.png';
                            }}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-emerald-700" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {formData.code && (
                            <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 rounded">
                              {formData.code}
                            </span>
                          )}
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {formData.itemName || formData.itemDescription}
                          </span>
                          {matchedInventoryProduct?.specification && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border bg-indigo-50 border-indigo-200 text-indigo-700">
                              {matchedInventoryProduct.specification} {formData.uom || ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                            {formData.category || 'Skin Care'}
                          </span>
                          <span>•</span>
                          <span>
                            Current Stock: <strong className="text-slate-800 font-mono">{maxInventoryQty !== null ? maxInventoryQty : (formData.quantity || 0)} {formData.uom || 'PCS'}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#01390f] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        <span>Selected</span>
                      </span>
                      {!selectedCatalogItem && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              productRef: '',
                              code: '',
                              itemDescription: '',
                              itemName: '',
                              price: 0,
                              quantity: 0,
                              images: [],
                              category: 'Skin Care',
                              marketingDescription: '',
                              shippingReturns: '',
                            }));
                            setInvSearchQuery('');
                            setSelectedInvCategory('All');
                            setIsInvDropdownOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[11px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                          title="Change Finished Product"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                          <span>Change</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* STOREFRONT PRODUCT DETAILS - HIDDEN UNTIL A FINISHED GOOD IS SELECTED */}
                {isProductChosen && (
                  <>
                    {/* 1. PRODUCT STOREFRONT IMAGES (FIRST PHOTO IS MAIN THUMBNAIL) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-700 whitespace-nowrap">
                          Product Storefront Images <span className="text-[11px] font-normal text-slate-400">(First photo is main thumbnail)</span>
                        </label>
                        {formData.images && formData.images.length > 0 && (
                          <span className="text-[11px] font-mono text-slate-400">
                            {formData.images.length} {formData.images.length === 1 ? 'photo' : 'photos'} added
                          </span>
                        )}
                      </div>

                      {/* COMPACT ROW: UPLOAD BUTTON + PREVIEW THUMBNAILS */}
                      <div className="flex items-center gap-3 overflow-x-auto py-1 custom-scrollbar">
                        {/* UPLOAD BUTTON - ACTION CIRCLE (MATCHES EDIT/DELETE ACTION BUTTONS) */}
                        <label
                          title="Add Storefront Photos"
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 self-center"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleMultipleImageUpload}
                            className="hidden"
                          />
                        </label>

                        {/* THUMBNAILS LIST */}
                        {formData.images && formData.images.length > 0 ? (
                          formData.images.map((imgSrc, idx) => (
                            <div
                              key={idx}
                              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs shrink-0"
                            >
                              <img
                                src={imgSrc}
                                alt={`Product photo ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {idx === 0 && (
                                <span className="absolute bottom-1.5 left-1.5 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                  Main
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveImageAtIndex(idx)}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                                title="Remove photo"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            No photos uploaded yet. Click &ldquo;Add&rdquo; to upload storefront photos.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. 2-COLUMN GRID FOR CORE PRICE & ALLOCATED QUANTITY */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* SELLING PRICE */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                          Selling Price (₱) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 pointer-events-none">₱</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            placeholder="0.00"
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                          />
                        </div>
                      </div>

                      {/* STOREFRONT QUANTITY (CUSTOMER VISIBLE) WITH INTEGRATED MAX STOCK ADDON */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                          Storefront Quantity <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center">
                          <div className="relative flex-1">
                            <PackageCheck className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                            <input
                              type="number"
                              min="0"
                              max={maxInventoryQty !== null ? maxInventoryQty : undefined}
                              required
                              value={formData.quantity}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                if (maxInventoryQty !== null && val > maxInventoryQty) {
                                  showErrorToast(`Quantity cannot exceed warehouse stock of ${maxInventoryQty}.`);
                                  setFormData({ ...formData, quantity: maxInventoryQty });
                                } else {
                                  setFormData({ ...formData, quantity: val });
                                }
                              }}
                              placeholder="0"
                              className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-l-lg pl-8 pr-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                            />
                          </div>
                          <div
                            onClick={() => {
                              if (maxInventoryQty !== null) {
                                setFormData({ ...formData, quantity: maxInventoryQty });
                              }
                            }}
                            className="h-[34px] bg-slate-100 hover:bg-slate-200/80 border-y border-r border-slate-200 rounded-r-lg px-2.5 text-xs font-semibold text-slate-700 uppercase cursor-pointer flex items-center gap-1 shrink-0 transition-colors select-none"
                            title="Click to allocate full available stock"
                          >
                            <span className="text-[10px] text-slate-400 font-bold">MAX:</span>
                            <span className="font-mono font-bold text-[#01390f]">
                              {maxInventoryQty !== null ? maxInventoryQty : 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DETAILS (PRODUCT OVERVIEW & USAGE) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                        Details (Product Overview & Usage)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.marketingDescription}
                        onChange={(e) => setFormData({ ...formData, marketingDescription: e.target.value })}
                        placeholder="Enter detailed storefront overview, benefits, and how-to-use instructions..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors resize-none"
                      />
                    </div>

                    {/* ESTIMATED DELIVERY TRANSIT TIME (TYPE + DROPDOWN INTEGRATED UI) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                        Estimated Delivery Transit Time
                      </label>
                      <div className="flex items-center">
                        <div className="relative flex-1">
                          <Truck className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={formData.shippingReturns || ''}
                            onChange={(e) => setFormData({ ...formData, shippingReturns: e.target.value })}
                            placeholder="Type custom or select delivery preset..."
                            className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-l-lg pl-8 pr-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                          />
                        </div>
                        <select
                          value={[
                            '1-3 Business Days (Metro Manila)',
                            '3-5 Business Days (Standard)',
                            '3-7 Business Days (Provincial)',
                            'Same-Day NCR Express Delivery',
                          ].includes(formData.shippingReturns) ? formData.shippingReturns : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setFormData({ ...formData, shippingReturns: e.target.value });
                            }
                          }}
                          className="h-[34px] bg-slate-100 hover:bg-slate-200/80 border-y border-r border-slate-200 rounded-r-lg px-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none shrink-0 transition-colors"
                        >
                          <option value="">Quick Select Preset</option>
                          <option value="1-3 Business Days (Metro Manila)">1-3 Days (Metro Manila)</option>
                          <option value="3-5 Business Days (Standard)">3-5 Days (Standard)</option>
                          <option value="3-7 Business Days (Provincial)">3-7 Days (Provincial)</option>
                          <option value="Same-Day NCR Express Delivery">Same-Day NCR Express</option>
                        </select>
                      </div>
                    </div>

                    <div
                      onClick={() => setFormData((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
                      className="flex items-center gap-3 pt-1 cursor-pointer select-none group"
                      title="Click to toggle storefront publish status"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({ ...prev, isPublished: !prev.isPublished }));
                        }}
                        aria-label="Toggle publish to storefront"
                        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${formData.isPublished
                          ? 'bg-[#01390f] text-white border-[#01390f]'
                          : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-300 hover:bg-slate-50'
                          }`}
                      >
                        {formData.isPublished ? (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors" />
                        )}
                      </button>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-[#01390f] transition-colors">
                          Publish to storefront immediately <span className="text-[11px] font-normal text-slate-400">(Visible to customers)</span>
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formData.isPublished
                            ? 'Live in storefront catalog immediately upon saving'
                            : 'Saved as draft (hidden from customers until published)'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ACTION BUTTONS FOOTER (MATCHES FINISHED GOODS MODAL) */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                {isProductChosen && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 whitespace-nowrap bg-[#01390f] hover:bg-[#0a5219] text-white cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span className="whitespace-nowrap">{submitting ? 'Saving...' : 'Save Product'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PRODUCT DETAILS MODAL */}
      {viewProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {viewProductModal.itemName || viewProductModal.itemDescription}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Item Code: #{viewProductModal.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewProductModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-bold text-slate-900">{viewProductModal.category}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Selling Price:</span>
                  <span className="font-mono font-black text-[#01390f] text-base">
                    ₱{Number(viewProductModal.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Storefront Status:</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${viewProductModal.isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {viewProductModal.isPublished ? 'Published & Live' : 'Draft Mode'}
                  </span>
                </div>
              </div>

              {/* DETAILS */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Details:
                </span>
                <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200 text-xs whitespace-pre-line">
                  {viewProductModal.marketingDescription || "Standard daily natural skincare formula."}
                </p>
              </div>

              {/* SHIPPING & RETURNS */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Shipping & Returns:
                </span>
                <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-xl border border-slate-200 text-xs whitespace-pre-line">
                  {viewProductModal.shippingReturns || "Metro Manila: 1-3 Days. Provincial: 3-7 Days. 7-day replacement guarantee."}
                </p>
              </div>

              {/* CUSTOMER REVIEWS */}
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Customer Reviews ({productReviews.length}):
                </span>
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                  {loadingReviews ? (
                    <p className="text-xs text-slate-400 text-center py-2">Loading reviews...</p>
                  ) : productReviews.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2 italic">
                      No customer reviews submitted yet.
                    </p>
                  ) : (
                    productReviews.map((rev, idx) => (
                      <div key={rev._id || idx} className="bg-white border border-slate-200/60 rounded-lg p-2 space-y-0.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-800">{rev.userName || "Verified Buyer"}</span>
                          <span className="text-amber-600 font-semibold text-[11px]">★ {rev.rating || 5}/5</span>
                        </div>
                        <p className="text-xs text-slate-600">{rev.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setViewProductModal(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const itemToEdit = viewProductModal;
                  setViewProductModal(null);
                  openEditModal(itemToEdit);
                }}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <span>Edit Product</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CREATE / EDIT PACKAGE SET MODAL */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col h-[90vh] max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {editingPackageItem ? 'Edit Package Set' : 'Create Package Set'}
                </h3>
                <p className="text-xs text-slate-400">
                  Configure storefront pricing, promotional badges, and marketing descriptions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPackageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* MODAL FORM BODY */}
            <form onSubmit={handleSavePackageSet} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              <div className="p-6 flex flex-col gap-5 flex-1 overflow-y-auto custom-scrollbar">

                {/* 1. SELECT FINISHED GOODS INVENTORY */}
                <div className="flex flex-col gap-2 relative" ref={pkgInvDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 cursor-pointer">
                      Group Finished Goods into this Package Set <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {packageFormData.bundleItems.length} {packageFormData.bundleItems.length === 1 ? 'product' : 'products'} selected
                    </span>
                  </div>

                  {/* SEARCH & CATEGORY CONTROLS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Category Filter */}
                    <div className="sm:col-span-1 relative">
                      <Tag className="w-4 h-4 absolute left-3 top-2.5 pointer-events-none text-slate-400" />
                      <select
                        value={selectedPkgInvCategory}
                        onChange={(e) => {
                          setSelectedPkgInvCategory(e.target.value);
                          setIsPkgInvDropdownOpen(true);
                        }}
                        onClick={() => setIsPkgInvDropdownOpen(true)}
                        className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 cursor-pointer appearance-none truncate transition-all h-[36px]"
                      >
                        <option value="All">All Categories ({uniqueInvCategories.length})</option>
                        {uniqueInvCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* Search Input */}
                    <div className="sm:col-span-2 relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={pkgInvSearchQuery}
                        onChange={(e) => {
                          setPkgInvSearchQuery(e.target.value);
                          setIsPkgInvDropdownOpen(true);
                        }}
                        onFocus={() => setIsPkgInvDropdownOpen(true)}
                        placeholder="Search finished goods by name, spec, or code to add..."
                        className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 transition-all h-[36px]"
                      />
                      {pkgInvSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPkgInvSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AUTOCOMPLETE DROPDOWN */}
                  {isPkgInvDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 divide-y divide-slate-100 rounded-2xl max-h-[260px] overflow-y-auto z-50 p-2 shadow-xl custom-scrollbar">
                      {displayedPkgInventoryProducts.length > 0 ? (
                        displayedPkgInventoryProducts.map((p, idx) => {
                          const itemId = p._id || p.id;
                          const desc = p.itemName || p.itemDescription || 'Finished Good';
                          const code = p.code || p.itemCode || 'FG-N/A';
                          const spec = p.specification || p.spec;
                          const uom = p.uom || 'PCS';
                          const count = p.quantity ?? 0;
                          const img = p.image || (Array.isArray(p.images) ? p.images[0] : null);
                          const isAlreadyAdded = packageFormData.bundleItems.some(
                            (bi) => (itemId && bi.productRef === itemId) || (code && bi.code === code)
                          );

                          return (
                            <div
                              key={itemId || idx}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddFinishedGoodToBundle(p);
                              }}
                              className={`p-2 flex items-center justify-between gap-3 rounded-lg cursor-pointer transition-colors ${isAlreadyAdded ? 'bg-emerald-50/40 hover:bg-emerald-50' : 'hover:bg-slate-50'
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                  {img ? (
                                    <img
                                      src={resolveProductImageUrl(img)}
                                      alt={desc}
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/mhira_removebg.png';
                                      }}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-800 text-xs truncate">{desc}</span>
                                    {spec && (
                                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border bg-indigo-50 border-indigo-200 text-indigo-700">
                                        {spec} {uom}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="font-mono">{code}</span>
                                    <span>•</span>
                                    <span>Warehouse Stock: <strong>{Number(count).toLocaleString()} {uom}</strong></span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-slate-700">
                                  ₱{Number(p.price || p.unitPrice || 250).toFixed(2)}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isAlreadyAdded
                                    ? 'bg-emerald-100 text-[#01390f]'
                                    : 'bg-[#01390f] text-white'
                                    }`}
                                >
                                  {isAlreadyAdded ? '+ Add More' : '+ Add'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-3 text-center text-xs text-rose-500 italic">
                          No finished goods found matching &ldquo;{pkgInvSearchQuery}&rdquo;.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SELECTED BUNDLE ITEMS LIST (CARDS) */}
                {packageFormData.bundleItems.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Included Finished Goods in this Package Set:
                    </label>

                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {packageFormData.bundleItems.map((item, idx) => {
                        const itemSubtotal = (Number(item.originalPrice) || 0) * (Number(item.quantity) || 1);
                        const inv = inventoryProducts.find(
                          (p) =>
                            (item.productRef && (p._id === item.productRef || p.id === item.productRef)) ||
                            (item.code && (p.code === item.code || p.itemCode === item.code))
                        );
                        const stockCount = inv ? Number(inv.quantity || 0) : null;

                        return (
                          <div
                            key={idx}
                            className="p-2.5 bg-white border border-emerald-200/90 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-300 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center overflow-hidden shrink-0">
                                {item.image ? (
                                  <img
                                    src={resolveProductImageUrl(item.image)}
                                    alt=""
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = '/mhira_removebg.png';
                                    }}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-5 h-5 text-emerald-700" />
                                )}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {item.code && (
                                    <span className="font-mono text-[9px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1 py-0.2 rounded">
                                      {item.code}
                                    </span>
                                  )}
                                  <span className="font-bold text-slate-900 text-xs truncate">
                                    {item.itemName}
                                  </span>
                                  {item.specification && (
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border bg-indigo-50 border-indigo-200 text-indigo-700">
                                      {item.specification} {item.uom || ''}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>₱{Number(item.originalPrice || 0).toFixed(2)} each</span>
                                  {stockCount !== null && (
                                    <>
                                      <span>•</span>
                                      <span>Warehouse Stock: <strong>{stockCount} {item.uom || 'PCS'}</strong></span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* QUANTITY IN BUNDLE CONTROLS */}
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 h-[28px]">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePkgItemQuantity(idx, -1)}
                                  className="px-2 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Decrease quantity in set"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2 font-mono font-bold text-xs text-slate-800 select-none">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePkgItemQuantity(idx, 1)}
                                  className="px-2 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                  title="Increase quantity in set"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="text-right min-w-[65px]">
                                <span className="font-bold text-xs text-slate-800">
                                  ₱{itemSubtotal.toFixed(2)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemovePkgBundleItem(idx)}
                                className="w-6 h-6 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors flex items-center justify-center cursor-pointer"
                                title="Remove item from package set"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* COMPACT SUMMARY & DISCOUNT ROW */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>
                          Grouped Total: <strong className="font-mono text-sm font-bold text-[#01390f]">₱{Number(packageFormData.originalPrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </span>
                        {estimatedPkgMaxBuildable > 0 && (
                          <span className="text-[11px] text-slate-500 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            ~{estimatedPkgMaxBuildable} sets buildable
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Discount:</label>
                        <div className="relative">
                          <select
                            value={!packageFormData.isOnSale || Number(packageFormData.price) === Number(packageFormData.originalPrice) ? '0' : String(currentPkgDiscountPct || 'custom')}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '0') {
                                handleApplyNoDiscount();
                              } else if (val !== 'custom') {
                                applyPkgDiscountPercent(Number(val));
                              }
                            }}
                            className="h-[32px] bg-white border border-slate-300 rounded-lg pl-3 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer appearance-none shadow-2xs"
                          >
                            <option value="0">No Discount (Regular Price)</option>
                            <option value="10">10% OFF</option>
                            <option value="15">15% OFF</option>
                            <option value="20">20% OFF</option>
                            <option value="25">25% OFF</option>
                            <option value="30">30% OFF</option>
                            <option value="40">40% OFF</option>
                            <option value="50">50% OFF</option>
                            {currentPkgDiscountPct && ![0, 10, 15, 20, 25, 30, 40, 50].includes(currentPkgDiscountPct) && packageFormData.isOnSale && (
                              <option value="custom">Custom ({currentPkgDiscountPct}% OFF)</option>
                            )}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 pointer-events-none text-slate-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PACKAGE SET CODE, NAME & PROMO BADGE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Package Code <span className="text-[10px] text-slate-500 font-bold">(Auto-generated)</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      readOnly
                      value={packageFormData.code || ''}
                      placeholder="PKG0001"
                      className="w-full h-[36px] bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-3 text-xs font-mono font-bold focus:outline-none cursor-not-allowed select-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Package Set Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={packageFormData.itemName}
                      onChange={(e) => setPackageFormData({ ...packageFormData, itemName: e.target.value, itemDescription: e.target.value })}
                      placeholder="e.g. FACE & BODY RADIANCE DUO SET"
                      className="w-full h-[36px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-bold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* 3. STOREFRONT IMAGES (MULTI-PHOTO UPLOAD + COPY SHORTCUT) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Package Storefront Images <span className="text-[11px] font-normal text-slate-400">(First photo is main thumbnail)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {packageFormData.bundleItems.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCopyPkgBundledImages}
                          className="text-[11px] font-bold text-[#01390f] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Import Bundled Photos</span>
                        </button>
                      )}
                      {packageFormData.images && packageFormData.images.length > 0 && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {packageFormData.images.length} {packageFormData.images.length === 1 ? 'photo' : 'photos'} added
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto py-1 custom-scrollbar">
                    {/* Add Photo Button */}
                    <label
                      title="Add Storefront Photos"
                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 self-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleMultiplePackageImageUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Thumbnails */}
                    {packageFormData.images && packageFormData.images.length > 0 ? (
                      packageFormData.images.map((imgSrc, idx) => (
                        <div
                          key={idx}
                          className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs shrink-0"
                        >
                          <img
                            src={imgSrc}
                            alt={`Package photo ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow-xs">
                              Main
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePackageImageAtIndex(idx)}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No photos uploaded yet. Click &ldquo;+&rdquo; or &ldquo;Import Bundled Photos&rdquo;.
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. 2-COLUMN GRID FOR CORE PRICE & ALLOCATED STOREFRONT QUANTITY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selling Price */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Selling Price (₱) <span className="text-rose-500">*</span>
                      </label>
                      {Number(packageFormData.originalPrice) > Number(packageFormData.price) && Number(packageFormData.price) > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Save ₱{(packageFormData.originalPrice - packageFormData.price).toFixed(2)} ({Math.round(((packageFormData.originalPrice - packageFormData.price) / packageFormData.originalPrice) * 100)}% OFF)
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">₱</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={packageFormData.price}
                        onChange={(e) => setPackageFormData({ ...packageFormData, price: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full h-[36px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg pl-8 pr-3 text-xs font-bold text-sm focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Storefront Quantity with MAX Helper */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Storefront Quantity (Sets Available) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <div className="relative flex-1">
                        <PackageCheck className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="number"
                          min="0"
                          required
                          value={packageFormData.quantity}
                          onChange={(e) => setPackageFormData({ ...packageFormData, quantity: Math.max(0, Number(e.target.value) || 0) })}
                          placeholder="10"
                          className="w-full h-[36px] bg-slate-50 border border-slate-200 text-slate-800 rounded-l-lg pl-8 pr-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                        />
                      </div>
                      {estimatedPkgMaxBuildable > 0 && (
                        <div
                          onClick={() => setPackageFormData({ ...packageFormData, quantity: estimatedPkgMaxBuildable })}
                          className="h-[36px] bg-slate-100 hover:bg-slate-200/80 border-y border-r border-slate-200 rounded-r-lg px-2.5 text-xs font-semibold text-slate-700 uppercase cursor-pointer flex items-center gap-1 shrink-0 transition-colors select-none"
                          title="Click to set maximum buildable sets from stock"
                        >
                          <span className="text-[10px] text-slate-400 font-bold">MAX:</span>
                          <span className="font-mono font-bold text-[#01390f]">{estimatedPkgMaxBuildable}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. PROMO BADGE DROPDOWN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Promotional Badge
                    </label>
                    <select
                      value={packageFormData.promoBadge}
                      onChange={(e) => setPackageFormData({ ...packageFormData, promoBadge: e.target.value })}
                      className="w-full h-[36px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors cursor-pointer"
                    >
                      <option value="Special Bundle">Special Bundle</option>
                      <option value="Best Value">Best Value</option>
                      <option value="Starter Kit">Starter Kit</option>
                      <option value="Limited Edition">Limited Edition</option>
                      <option value="Routine Set">Routine Set</option>
                      <option value="Holiday Bundle">Holiday Bundle</option>
                    </select>
                  </div>

                  {/* Estimated Delivery Transit Time */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estimated Delivery Transit Time
                    </label>
                    <div className="flex items-center">
                      <div className="relative flex-1">
                        <Truck className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          value={packageFormData.shippingReturns || ''}
                          onChange={(e) => setPackageFormData({ ...packageFormData, shippingReturns: e.target.value })}
                          placeholder="Type custom or select delivery preset..."
                          className="w-full h-[36px] bg-slate-50 border border-slate-200 text-slate-800 rounded-l-lg pl-8 pr-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                        />
                      </div>
                      <select
                        value={[
                          '1-3 Business Days (Metro Manila)',
                          '3-5 Business Days (Standard)',
                          '3-7 Business Days (Provincial)',
                          'Same-Day NCR Express Delivery',
                        ].includes(packageFormData.shippingReturns) ? packageFormData.shippingReturns : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setPackageFormData({ ...packageFormData, shippingReturns: e.target.value });
                          }
                        }}
                        className="h-[36px] bg-slate-100 hover:bg-slate-200/80 border-y border-r border-slate-200 rounded-r-lg px-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none shrink-0 transition-colors"
                      >
                        <option value="">Quick Select Preset</option>
                        <option value="1-3 Business Days (Metro Manila)">1-3 Days (Metro Manila)</option>
                        <option value="3-5 Business Days (Standard)">3-5 Days (Standard)</option>
                        <option value="3-7 Business Days (Provincial)">3-7 Days (Provincial)</option>
                        <option value="Same-Day NCR Express Delivery">Same-Day NCR Express</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 6. DETAILS (PRODUCT OVERVIEW & USAGE) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Details (Product Overview & Usage)
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGeneratePkgDescription}
                      className="text-[11px] font-bold text-[#01390f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Auto-generate Description</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={packageFormData.marketingDescription}
                    onChange={(e) => setPackageFormData({ ...packageFormData, marketingDescription: e.target.value })}
                    placeholder="Enter detailed package overview, routine instructions, and customer benefits..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors resize-none"
                  />
                </div>

                {/* 7. PUBLISH TO STOREFRONT TOGGLE */}
                <div
                  onClick={() => setPackageFormData((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
                  className="flex items-center gap-3 pt-1 cursor-pointer select-none group"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPackageFormData((prev) => ({ ...prev, isPublished: !prev.isPublished }));
                    }}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${packageFormData.isPublished
                      ? 'bg-[#01390f] text-white border-[#01390f]'
                      : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {packageFormData.isPublished ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-[#01390f] transition-colors">
                      Publish to storefront immediately <span className="text-[11px] font-normal text-slate-400">(Visible to customers)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {packageFormData.isPublished
                        ? 'Live in Customer Package Sets storefront (/packages) immediately upon saving'
                        : 'Saved as draft (hidden from customers until published)'}
                    </span>
                  </div>
                </div>

              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPackage}
                  className="px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 bg-[#01390f] hover:bg-[#0a5219] text-white cursor-pointer disabled:opacity-50"
                >
                  {submittingPackage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{submittingPackage ? 'Saving...' : editingPackageItem ? 'Update Package Set' : 'Save Package Set'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW PACKAGE DETAILS MODAL */}
      {viewPackageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {viewPackageModal.itemName || viewPackageModal.itemDescription}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Package Code: #{viewPackageModal.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewPackageModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm custom-scrollbar flex-1">
              {/* Product Photo Gallery */}
              <div className="aspect-video w-full rounded-xl bg-slate-100 overflow-hidden border border-slate-200 flex items-center justify-center relative">
                <img
                  src={resolveProductImageUrl((viewPackageModal.images && viewPackageModal.images[0]) || viewPackageModal.image)}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/mhira_removebg.png';
                  }}
                  className="w-full h-full object-cover"
                />
                {viewPackageModal.promoBadge && (
                  <span className="absolute top-2 left-2 bg-[#01390f] text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-sm uppercase tracking-wider">
                    {viewPackageModal.promoBadge}
                  </span>
                )}
              </div>

              {/* Price & Savings */}
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Package Bundle Price:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-[#01390f]">₱{peso(viewPackageModal.price || 0)}</span>
                    {Number(viewPackageModal.originalPrice) > Number(viewPackageModal.price) && (
                      <span className="text-xs text-slate-400 line-through">₱{peso(viewPackageModal.originalPrice || 0)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Stock:</span>
                  <p className="text-xs font-bold text-slate-800">{viewPackageModal.quantity || 0} Sets Available</p>
                </div>
              </div>

              {/* Included Items */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  What&apos;s Included in this Package Set:
                </label>
                <div className="space-y-2">
                  {Array.isArray(viewPackageModal.bundleItems) && viewPackageModal.bundleItems.length > 0 ? (
                    viewPackageModal.bundleItems.map((bi, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/60">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {bi.image ? (
                              <img
                                src={resolveProductImageUrl(bi.image)}
                                alt=""
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/mhira_removebg.png';
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 text-xs block truncate">{bi.itemName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{bi.code} {bi.specification ? `• ${bi.specification}` : ''}</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#01390f] shrink-0 font-mono">
                          {bi.quantity}x
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No item breakdown specified.</p>
                  )}
                </div>
              </div>

              {/* Description */}
              {viewPackageModal.marketingDescription && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Product Overview & Usage:
                  </label>
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {viewPackageModal.marketingDescription}
                  </p>
                </div>
              )}

              {/* Transit Time */}
              {viewPackageModal.shippingReturns && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Estimated Delivery: <strong>{viewPackageModal.shippingReturns}</strong></span>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${viewPackageModal.isPublished ? 'bg-emerald-100 text-[#01390f]' : 'bg-slate-200 text-slate-600'}`}>
                {viewPackageModal.isPublished ? 'Live in Storefront' : 'Draft'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const pkg = viewPackageModal;
                    setViewPackageModal(null);
                    openEditPackageSetModal(pkg);
                  }}
                  className="px-4 py-2 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Edit Package
                </button>
                <button
                  type="button"
                  onClick={() => setViewPackageModal(null)}
                  className="px-4 py-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingAllProductsCatalog;