import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Check,
  Edit2,
  Trash2,
  Eye,
  Search,
  X,
  Tag,
  Loader2,
  RefreshCw,
  Download,
  Percent,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Package,
  PackageCheck,
  Archive,
  FileSpreadsheet,
  Truck,
  Boxes,
  Minus
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios, { API } from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { notifyLiveSync, subscribeLiveSync } from '../utils/liveSync';
import { compressImageToBase64 } from '../utils/imageCompressor';
import TablePagination from './common/TablePagination';

function MarketingPackageSets() {
  const [packageSets, setPackageSets] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_marketing_package_sets');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });

  const [inventoryProducts, setInventoryProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory_products');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });

  const [loading, setLoading] = useState(false);

  // Multi-Filter States (matching MarketingAllProductsCatalog)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromoBadge, setSelectedPromoBadge] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'published' | 'draft'
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived'

  // Quick Toggles (matching MarketingAllProductsCatalog)
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [showZeroOnly, setShowZeroOnly] = useState(false);
  const [onlyDiscounted, setOnlyDiscounted] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewPackageModal, setViewPackageModal] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Finished Goods Search Dropdown inside Modal
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [selectedInvCategory, setSelectedInvCategory] = useState('All');
  const [isInvDropdownOpen, setIsInvDropdownOpen] = useState(false);
  const invDropdownRef = useRef(null);

  const API_BASE_URL =
    import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  const peso = (n) =>
    (Number(n) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const statusModules = [
    { id: 'active', label: 'Active Package Sets' },
    { id: 'archived', label: 'Archived Sets' },
  ];

  const initialFormState = {
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

  const [formData, setFormData] = useState(initialFormState);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (invDropdownRef.current && !invDropdownRef.current.contains(e.target)) {
        setIsInvDropdownOpen(false);
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

  // Distinct categories from Finished Goods inventory
  const uniqueInvCategories = useMemo(() => {
    const cats = inventoryProducts
      .map((p) => p.category || p.itemGroup || '')
      .filter(Boolean);
    return Array.from(new Set(cats));
  }, [inventoryProducts]);

  // Filtered inventory products in modal dropdown
  const filteredInventoryProducts = useMemo(() => {
    return inventoryProducts.filter((p) => {
      const matchCat =
        selectedInvCategory === 'All' ||
        (p.category || p.itemGroup || '').toLowerCase() === selectedInvCategory.toLowerCase();

      if (!matchCat) return false;

      if (!invSearchQuery.trim()) return true;

      const q = invSearchQuery.toLowerCase().trim();
      const name = (p.itemName || p.itemDescription || '').toLowerCase();
      const code = (p.code || p.itemCode || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const spec = String(p.specification || p.spec || '').toLowerCase();

      return name.includes(q) || code.includes(q) || cat.includes(q) || spec.includes(q);
    });
  }, [inventoryProducts, selectedInvCategory, invSearchQuery]);

  const displayedInventoryProducts = useMemo(() => {
    if (invSearchQuery.trim()) return filteredInventoryProducts;
    return filteredInventoryProducts.slice(0, 5);
  }, [filteredInventoryProducts, invSearchQuery]);

  // Fetch package sets & inventory products
  const fetchData = async () => {
    try {
      setLoading(true);
      const [catalogRes, inventoryRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/collections/catalog`),
        axios.get(`${API_BASE_URL}/api/products`),
      ]);

      const catData = catalogRes.status === 'fulfilled' ? catalogRes.value.data : null;
      const safeCatalog = Array.isArray(catData)
        ? catData
        : catData?.products || catData?.items || catData?.data || [];

      // Filter Package Sets
      const bundles = safeCatalog.filter(
        (item) =>
          item.isBundle === true ||
          item.category === 'Package Sets' ||
          item.category === 'Package Set' ||
          item.category === 'Special Bundles' ||
          item.navbarTag === 'Package Sets' ||
          (Array.isArray(item.bundleItems) && item.bundleItems.length > 0)
      );

      setPackageSets(bundles);
      try {
        localStorage.setItem('cached_marketing_package_sets', JSON.stringify(bundles));
      } catch (e) { }

      const invData = inventoryRes.status === 'fulfilled' ? inventoryRes.value.data : null;
      const safeInv = Array.isArray(invData)
        ? invData
        : invData?.products || invData?.items || invData?.data || [];
      setInventoryProducts(safeInv);
      try {
        if (safeInv.length > 0) {
          localStorage.setItem('cached_inventory_products', JSON.stringify(safeInv));
        }
      } catch (e) { }
    } catch (err) {
      console.error('Error fetching package sets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const unsubscribe = subscribeLiveSync(() => {
      fetchData();
    });

    const handleFocus = () => fetchData();
    window.addEventListener('focus', handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Helper to calculate buildable stock for a package set from raw warehouse finished goods
  const getRowBuildableStock = (pkg) => {
    const items = Array.isArray(pkg.bundleItems) ? pkg.bundleItems : [];
    if (items.length === 0) return Number(pkg.quantity || 0);
    let minSets = Infinity;
    for (const bi of items) {
      const inv = inventoryProducts.find(
        (p) =>
          (bi.productRef && (p._id === bi.productRef || p.id === bi.productRef)) ||
          (bi.code && (p.code === bi.code || p.itemCode === bi.code))
      );
      const stock = inv ? Number(inv.quantity || 0) : 0;
      const needed = Number(bi.quantity) || 1;
      const possible = Math.floor(stock / needed);
      if (possible < minSets) minSets = possible;
    }
    return minSets === Infinity ? Number(pkg.quantity || 0) : Math.max(0, minSets);
  };

  // Filter package sets list
  const filteredPackageSets = useMemo(() => {
    let list = [...packageSets];

    // Archived vs Active
    if (viewMode === 'archived') {
      list = list.filter((p) => p.isArchived === true);
    } else {
      list = list.filter((p) => !p.isArchived);
    }

    // Status Filter
    if (selectedStatus === 'published') {
      list = list.filter((p) => p.isPublished === true);
    } else if (selectedStatus === 'draft') {
      list = list.filter((p) => p.isPublished === false);
    }

    // Promo Badge Filter
    if (selectedPromoBadge !== 'All') {
      list = list.filter((p) => (p.promoBadge || '').toLowerCase() === selectedPromoBadge.toLowerCase());
    }

    // Category Filter
    if (selectedCategory !== 'All') {
      list = list.filter((p) => (p.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    // Quick Toggles
    if (hideZeroQty) {
      list = list.filter((p) => Number(p.quantity || 0) > 0);
    }
    if (showZeroOnly) {
      list = list.filter((p) => Number(p.quantity || 0) === 0);
    }
    if (onlyDiscounted) {
      list = list.filter((p) => Number(p.originalPrice || 0) > Number(p.price || 0));
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const name = (p.itemName || p.itemDescription || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        const badge = (p.promoBadge || '').toLowerCase();
        const desc = (p.marketingDescription || '').toLowerCase();
        const hasMatchingItem = Array.isArray(p.bundleItems) && p.bundleItems.some((bi) => {
          const biName = (bi.itemName || bi.itemDescription || '').toLowerCase();
          const biCode = (bi.code || '').toLowerCase();
          return biName.includes(q) || biCode.includes(q);
        });

        return name.includes(q) || code.includes(q) || badge.includes(q) || desc.includes(q) || hasMatchingItem;
      });
    }

    // Sorting (matching MarketingAllProductsCatalog sort keys)
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'price-low') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === 'savings') {
      list.sort((a, b) => {
        const saveA = Math.max(0, Number(a.originalPrice || 0) - Number(a.price || 0));
        const saveB = Math.max(0, Number(b.originalPrice || 0) - Number(b.price || 0));
        return saveB - saveA;
      });
    } else if (sortBy === 'stock-low') {
      list.sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0));
    } else if (sortBy === 'stock-high') {
      list.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => (a.itemName || a.itemDescription || '').localeCompare(b.itemName || b.itemDescription || ''));
    }

    return list;
  }, [packageSets, viewMode, selectedStatus, selectedPromoBadge, selectedCategory, hideZeroQty, showZeroOnly, onlyDiscounted, searchQuery, sortBy]);

  // Paginated Package Sets
  const paginatedPackageSets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPackageSets.slice(start, start + itemsPerPage);
  }, [filteredPackageSets, currentPage, itemsPerPage]);

  // Calculate grouped price from bundle items
  const calculateGroupedPrice = (items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const price = Number(item.originalPrice) || 0;
      const qty = Number(item.quantity) || 1;
      return sum + price * qty;
    }, 0);
  };

  // Estimate maximum buildable packages based on inventory stock
  const estimatedMaxBuildable = useMemo(() => {
    if (!formData.bundleItems || formData.bundleItems.length === 0) return 0;
    let minSets = Infinity;

    for (const bi of formData.bundleItems) {
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
  }, [formData.bundleItems, inventoryProducts]);

  // Auto-generate code e.g. PKG0001
  const generateNextPackageCode = () => {
    const existingCodes = packageSets
      .map((p) => p.code || '')
      .filter((c) => c.startsWith('PKG'));
    const numbers = existingCodes
      .map((c) => parseInt(c.replace('PKG', ''), 10))
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `PKG${String(nextNum).padStart(4, '0')}`;
  };

  // Open modal in ADD mode
  const openAddModal = () => {
    setEditingItem(null);
    const newCode = generateNextPackageCode();
    setFormData({
      ...initialFormState,
      code: newCode,
    });
    setInvSearchQuery('');
    setSelectedInvCategory('All');
    setIsInvDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Open modal in EDIT mode
  const openEditModal = (pkg) => {
    setEditingItem(pkg);
    const items = Array.isArray(pkg.bundleItems) ? pkg.bundleItems : [];
    const groupedOriginal = Number(pkg.originalPrice) > 0 ? Number(pkg.originalPrice) : calculateGroupedPrice(items);

    setFormData({
      _id: pkg._id,
      code: pkg.code || '',
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
    setInvSearchQuery('');
    setSelectedInvCategory('All');
    setIsInvDropdownOpen(false);
    setIsModalOpen(true);
  };

  // Finished Goods Item Selection Handler
  const handleAddFinishedGoodToBundle = (inv) => {
    if (!inv) return;

    const invId = inv._id || inv.id;
    const invCode = inv.code || inv.itemCode || '';
    const invName = inv.itemName || inv.itemDescription || 'Finished Good';
    const invPrice = Number(inv.price || inv.unitPrice || inv.sellingPrice || 250);
    const invImg = inv.image || (Array.isArray(inv.images) && inv.images[0]) || '';
    const invSpec = inv.specification || inv.spec || '';
    const invUom = inv.uom || 'PCS';

    setFormData((prev) => {
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

    setIsInvDropdownOpen(false);
    setInvSearchQuery('');
  };

  // Update quantity of an included item in bundle
  const handleUpdateItemQuantity = (index, delta) => {
    setFormData((prev) => {
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

  // Remove item from bundle
  const handleRemoveBundleItem = (index) => {
    setFormData((prev) => {
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

  // Quick discount calculation chips (e.g. 10%, 15%, 20% OFF)
  const applyDiscountPercent = (pct) => {
    const base = Number(formData.originalPrice) || 0;
    if (base <= 0) return;
    const discounted = Math.round(base * (1 - pct / 100));
    setFormData((prev) => ({
      ...prev,
      price: discounted,
      isOnSale: pct > 0,
    }));
  };

  // Auto copy images from bundled finished goods
  const handleCopyBundledImages = () => {
    if (!formData.bundleItems || formData.bundleItems.length === 0) {
      showErrorToast('Please add at least one finished good to copy photos from.');
      return;
    }
    const collected = [];
    formData.bundleItems.forEach((bi) => {
      if (bi.image && !collected.includes(bi.image)) collected.push(bi.image);
    });

    if (collected.length === 0) {
      showErrorToast('The selected finished goods do not have storefront photos yet.');
      return;
    }

    setFormData((prev) => {
      const existing = prev.images || [];
      const merged = Array.from(new Set([...existing, ...collected]));
      return { ...prev, images: merged };
    });
    showSuccessToast(`Imported ${collected.length} photo(s) from bundled finished goods.`);
  };

  // Auto-generate professional marketing description
  const handleAutoGenerateDescription = () => {
    if (!formData.bundleItems || formData.bundleItems.length === 0) {
      showErrorToast('Please add finished goods before auto-generating a description.');
      return;
    }

    const itemsSummary = formData.bundleItems
      .map((bi) => `• ${bi.quantity}x ${bi.itemName} (${bi.specification ? `${bi.specification} ${bi.uom || ''}` : bi.uom || 'PCS'})`)
      .join('\n');

    const template = `Elevate your personal self-care regimen with the ${formData.itemName || 'Mhira Botanical Package Set'}. Specially bundled to deliver synergistic skin and body nourishment using locally sourced organic botanical ingredients.\n\nPackage Set Includes:\n${itemsSummary}\n\nHow to Use:\nIntegrate these botanical essentials into your morning and evening routine for visibly rejuvenated, radiant, and hydrated results.`;

    setFormData((prev) => ({
      ...prev,
      marketingDescription: template,
    }));
    showSuccessToast('Auto-generated package set overview and usage instructions.');
  };

  // Multiple image upload handler with compression
  const handleMultipleImageUpload = async (e) => {
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
          setFormData((prev) => ({
            ...prev,
            images: [...(prev.images || []), compressedBase64],
          }));
        }
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  };

  const handleRemoveImageAtIndex = (idx) => {
    setFormData((prev) => {
      const updated = [...(prev.images || [])];
      updated.splice(idx, 1);
      return { ...prev, images: updated };
    });
  };

  // Save Package Set (Create or Edit)
  const handleSavePackageSet = async (e) => {
    if (e) e.preventDefault();

    if (!formData.bundleItems || formData.bundleItems.length === 0) {
      showErrorToast('Please group at least one Finished Good into this package set.');
      return;
    }

    if (!formData.itemName || formData.itemName.trim() === '') {
      showErrorToast('Please provide a Package Set Name.');
      return;
    }

    if (Number(formData.price) <= 0) {
      showErrorToast('Please set a valid Selling Price.');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      const payload = {
        code: formData.code.trim().toUpperCase(),
        itemName: formData.itemName.trim(),
        itemDescription: formData.itemName.trim(),
        category: 'Package Sets',
        navbarTag: 'Package Sets',
        brand: formData.brand || 'Mhira Natural',
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice) || Number(formData.price),
        quantity: Math.max(0, Number(formData.quantity) || 0),
        uom: formData.uom || 'Sets',
        images: formData.images || [],
        image: (formData.images && formData.images[0]) || '',
        promoBadge: formData.promoBadge || 'Special Bundle',
        isOnSale: Number(formData.originalPrice) > Number(formData.price),
        bundleItems: formData.bundleItems,
        marketingDescription: formData.marketingDescription || '',
        shippingReturns: formData.shippingReturns || '1-3 Business Days (Metro Manila)',
        isPublished: formData.isPublished,
        isBundle: true,
      };

      if (editingItem && (editingItem._id || editingItem.id)) {
        const id = editingItem._id || editingItem.id;
        await axios.put(`${API_BASE_URL}/api/collections/catalog/${id}`, payload, config);
        showSuccessToast(`Updated package set "${payload.itemName}".`);
      } else {
        await axios.post(`${API_BASE_URL}/api/collections/catalog`, payload, config);
        showSuccessToast(`Created new package set "${payload.itemName}".`);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      notifyLiveSync();
      fetchData();
    } catch (err) {
      console.error('Error saving package set:', err);
      showErrorToast(err.response?.data?.message || 'Failed to save package set.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Archive Status
  const handleToggleArchive = async (pkg) => {
    try {
      const id = pkg._id || pkg.id;
      const token = localStorage.getItem('token');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      await axios.patch(`${API_BASE_URL}/api/collections/catalog/${id}/archive`, {}, config);
      showSuccessToast(`${pkg.itemName || pkg.itemDescription} is now ${pkg.isArchived ? 'Restored' : 'Archived'}.`);
      notifyLiveSync();
      fetchData();
    } catch (err) {
      console.error('Error toggling archive status:', err);
      showErrorToast('Failed to toggle archive status.');
    }
  };

  // Reset all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('All');
    setSelectedPromoBadge('All');
    setSelectedCategory('All');
    setSortBy('newest');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setOnlyDiscounted(false);
    setCurrentPage(1);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedStatus !== 'All') count++;
    if (selectedPromoBadge !== 'All') count++;
    if (selectedCategory !== 'All') count++;
    if (sortBy !== 'newest') count++;
    if (hideZeroQty) count++;
    if (showZeroOnly) count++;
    if (onlyDiscounted) count++;
    return count;
  }, [searchQuery, selectedStatus, selectedPromoBadge, selectedCategory, sortBy, hideZeroQty, showZeroOnly, onlyDiscounted]);

  // Export PDF Report
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      doc.setFont('helvetica');

      doc.setFontSize(14);
      doc.setTextColor(1, 57, 15);
      doc.text('MHIRA BOTANICALS - MARKETING PACKAGE SETS CATALOG', 14, 15);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on ${new Date().toLocaleString()} | Active Bundles: ${filteredPackageSets.length}`, 14, 22);

      const tableHead = [['#', 'Set Code', 'Package Name', 'Bundled Products', 'Grouped Price', 'Bundle Price', 'Savings', 'Stock', 'Status']];
      const tableBody = filteredPackageSets.map((p, idx) => {
        const bundledText = Array.isArray(p.bundleItems)
          ? p.bundleItems.map((bi) => `${bi.quantity}x ${bi.itemName}`).join(', ')
          : 'N/A';
        const orig = Number(p.originalPrice || 0);
        const sell = Number(p.price || 0);
        const diff = Math.max(0, orig - sell);

        return [
          idx + 1,
          p.code || 'N/A',
          p.itemName || p.itemDescription || 'Package Set',
          bundledText,
          `PHP ${orig.toFixed(2)}`,
          `PHP ${sell.toFixed(2)}`,
          diff > 0 ? `Save PHP ${diff.toFixed(2)}` : '-',
          `${p.quantity || 0} Sets`,
          p.isPublished ? 'Live' : 'Draft',
        ];
      });

      autoTable(doc, {
        startY: 28,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        theme: 'grid',
        styles: { cellPadding: 2.5 },
      });

      const fileName = `Package_Sets_Catalog_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Package Sets Report: ${fileName}`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      showErrorToast('Failed to export package sets PDF.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">

      {/* MAIN CONTAINER (IDENTICAL TO ALL PRODUCTS CATALOG) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">

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

        {/* EXCEL RIBBON TOOLBAR (EXACT SAME UI AS ALL PRODUCTS CATALOG) */}
        <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
          {/* ACTIONS GROUP */}
          <div className={`w-full ${viewMode === 'archived' ? 'lg:w-[130px]' : 'lg:w-[210px]'} shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]`}>
            <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
              {/* 1 COLUMN NA 1 LAYER: Tall Full-Height Action Button */}
              {viewMode !== 'archived' && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Create New Package Set"
                >
                  <Plus className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5" strokeWidth={2.5} />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    Add<br />Package Set
                  </span>
                </button>
              )}

              {/* Stacked Compact Rows */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                {/* Reset Filters */}
                <button
                  type="button"
                  onClick={handleClearFilters}
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
                  placeholder="Search package name, code, or bundled finished goods..."
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

              {/* Layer 2: 4-column Dropdowns (h-[22px] exact match) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
                {/* Promo Badge Select */}
                <div className="relative w-full">
                  <Tag className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedPromoBadge}
                    onChange={(e) => setSelectedPromoBadge(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Promo Badges</option>
                    <option value="Special Bundle">Special Bundle</option>
                    <option value="Best Value">Best Value</option>
                    <option value="Routine Set">Routine Set</option>
                    <option value="Starter Kit">Starter Kit</option>
                    <option value="Limited Edition">Limited Edition</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Category Select */}
                <div className="relative w-full">
                  <Tag className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Categories</option>
                    <option value="Package Sets">Package Sets</option>
                    <option value="Special Bundles">Special Bundles</option>
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
                    <option value="savings">Sort: Highest Savings</option>
                    <option value="stock-low">Sort: Stock Low to High</option>
                    <option value="stock-high">Sort: Stock High to Low</option>
                    <option value="name-asc">Sort: Package Name A-Z</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles (h-[22px] exact match) */}
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
                  onClick={() => setOnlyDiscounted(!onlyDiscounted)}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${onlyDiscounted
                    ? 'bg-amber-50 border-amber-500 text-amber-800 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Discounted Only
                </button>
              </div>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
              Search & Filter
            </div>
          </div>
        </div>

        {/* HR DIVIDER ABOVE TABLE (IDENTICAL TO ALL PRODUCTS CATALOG) */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* TABLE CONTAINER */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {!loading && filteredPackageSets.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredPackageSets.length}
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
                Fetching package sets catalog...
              </span>
            </div>
          ) : paginatedPackageSets.length > 0 ? (
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
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">BUNDLED PRODUCTS</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">UOM</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STOREFRONT STATUS</th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700 text-xs">
                  {paginatedPackageSets.map((row) => {
                    const isDepleted = Number(row.quantity ?? 0) === 0;
                    const count = Number(row.quantity ?? 0);
                    const buildableStock = getRowBuildableStock(row);
                    const displayName = row.itemName || row.itemDescription || 'Package Set';
                    const items = Array.isArray(row.bundleItems) ? row.bundleItems : [];
                    const mainImg = (row.images && row.images[0]) || row.image;

                    return (
                      <tr
                        key={row._id || row.id || row.code}
                        className={`transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm ${isDepleted && showZeroOnly ? 'bg-red-50/50' : ''
                          }`}
                      >
                        {/* 1. Item Name */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex flex-col min-w-0 max-w-[280px]">
                            <span
                              className="font-bold text-xs truncate text-slate-800"
                              title={displayName}
                            >
                              {displayName}
                            </span>
                            {row.isOnSale && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30 uppercase tracking-wide flex-shrink-0">
                                  {row.promoBadge || 'Special Bundle'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 2. Image (Interactive with hover Eye overlay matching All Products Catalog) */}
                        <td className="py-2.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex justify-center items-center">
                            <button
                              type="button"
                              onClick={() => setViewPackageModal(row)}
                              className="relative group/img cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-[#01390f] focus:outline-none focus:ring-2 focus:ring-[#01390f]/30 shadow-2xs transition-all hover:scale-105 active:scale-95 bg-slate-50"
                              title="Click to view package set preview"
                              aria-label={`View photo of ${displayName}`}
                            >
                              <img
                                src={resolveProductImageUrl(mainImg)}
                                alt={displayName}
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

                        {/* 3. Code */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-mono font-semibold text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors" title={row.code}>
                          {row.code || '—'}
                        </td>

                        {/* 4. Category */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {row.category || 'Package Sets'}
                        </td>

                        {/* 5. Store Price */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          ₱{peso(row.price || 0)}
                        </td>

                        {/* 6. Storefront Quantity */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                          {count.toLocaleString()}
                        </td>

                        {/* 7. Total Quantity (Buildable warehouse inventory) */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono font-bold text-xs text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {buildableStock.toLocaleString()}
                        </td>

                        {/* 8. Bundled Products Breakdown */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center justify-center gap-1 flex-nowrap">
                            {items.length > 0 ? (
                              items.map((bi, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100/70 border border-emerald-200 text-emerald-900 whitespace-nowrap"
                                  title={`${bi.quantity}x ${bi.itemName}`}
                                >
                                  <span>{bi.quantity}x</span>
                                  <span className="truncate max-w-[80px]">{bi.code || bi.itemName}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">—</span>
                            )}
                          </div>
                        </td>

                        {/* 9. UOM */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-center font-medium text-xs text-slate-600 uppercase bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {row.uom || 'Sets'}
                        </td>

                        {/* 10. Storefront Status */}
                        <td className={`px-4 py-3.5 whitespace-nowrap text-center text-slate-800 font-semibold text-xs transition-colors select-none ${row.isPublished
                          ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                          : 'bg-amber-500/20 group-hover:bg-amber-500/30'
                          }`}>
                          {row.isPublished ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span>Live</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5">
                              <span>Draft</span>
                            </span>
                          )}
                        </td>

                        {/* 11. Action (Sticky Right matching All Products Catalog) */}
                        <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px] transition-colors">
                          <div className="flex items-center justify-center gap-1.5">
                            {viewMode !== 'archived' ? (
                              <>
                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(row)}
                                  title="Edit Package Details"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Archive */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(row)}
                                  title="Archive Package Set"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Restore */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleArchive(row)}
                                  title="Restore Package Set"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-700 hover:text-white hover:border-emerald-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Boxes className="w-10 h-10 text-slate-300" />
              <p className="font-semibold text-slate-600">No package sets found.</p>
              <p className="text-xs text-slate-400">
                {activeFiltersCount > 0
                  ? 'Try clearing active filters.'
                  : 'Click "+ Add Package Set" to group finished goods and create your first bundle!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT PACKAGE SET MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col h-[90vh] max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">

            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {editingItem ? 'Edit Package Set' : 'Create Package Set'}
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

            {/* MODAL FORM BODY */}
            <form onSubmit={handleSavePackageSet} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              <div className="p-6 flex flex-col gap-5 flex-1 overflow-y-auto custom-scrollbar">

                {/* 1. SELECT FINISHED GOODS INVENTORY */}
                <div className="flex flex-col gap-2 relative" ref={invDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 cursor-pointer">
                      Group Finished Goods into this Package Set <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {formData.bundleItems.length} {formData.bundleItems.length === 1 ? 'product' : 'products'} selected
                    </span>
                  </div>

                  {/* SEARCH & CATEGORY CONTROLS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Category Filter */}
                    <div className="sm:col-span-1 relative">
                      <Tag className="w-4 h-4 absolute left-3 top-2.5 pointer-events-none text-slate-400" />
                      <select
                        value={selectedInvCategory}
                        onChange={(e) => {
                          setSelectedInvCategory(e.target.value);
                          setIsInvDropdownOpen(true);
                        }}
                        onClick={() => setIsInvDropdownOpen(true)}
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
                        value={invSearchQuery}
                        onChange={(e) => {
                          setInvSearchQuery(e.target.value);
                          setIsInvDropdownOpen(true);
                        }}
                        onFocus={() => setIsInvDropdownOpen(true)}
                        placeholder="Search finished goods by name, spec, or code to add..."
                        className="w-full bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 text-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 transition-all h-[36px]"
                      />
                      {invSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setInvSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* AUTOCOMPLETE DROPDOWN */}
                  {isInvDropdownOpen && (
                    <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 divide-y divide-slate-100 rounded-2xl max-h-[260px] overflow-y-auto z-50 p-2 shadow-xl custom-scrollbar">
                      {displayedInventoryProducts.length > 0 ? (
                        displayedInventoryProducts.map((p, idx) => {
                          const itemId = p._id || p.id;
                          const desc = p.itemName || p.itemDescription || 'Finished Good';
                          const code = p.code || p.itemCode || 'FG-N/A';
                          const spec = p.specification || p.spec;
                          const uom = p.uom || 'PCS';
                          const count = p.quantity ?? 0;
                          const img = p.image || (Array.isArray(p.images) ? p.images[0] : null);
                          const isAlreadyAdded = formData.bundleItems.some(
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
                          No finished goods found matching &ldquo;{invSearchQuery}&rdquo;.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* SELECTED BUNDLE ITEMS LIST (CARDS) */}
                {formData.bundleItems.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Included Finished Goods in this Package Set:
                    </label>

                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                      {formData.bundleItems.map((item, idx) => {
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
                                  onClick={() => handleUpdateItemQuantity(idx, -1)}
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
                                  onClick={() => handleUpdateItemQuantity(idx, 1)}
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
                                onClick={() => handleRemoveBundleItem(idx)}
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

                    {/* GROUPED VALUE & DISCOUNT SHORTCUT BAR */}
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs mt-1">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-[#01390f]" />
                        <span>
                          Grouped Original Total: <strong className="font-mono text-[#01390f] text-sm">₱{Number(formData.originalPrice).toFixed(2)}</strong>
                        </span>
                        {estimatedMaxBuildable > 0 && (
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-bold ml-1">
                            ~{estimatedMaxBuildable} sets buildable
                          </span>
                        )}
                      </div>

                      {/* QUICK DISCOUNT BUTTONS */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Apply Discount:</span>
                        {[10, 15, 20, 25].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => applyDiscountPercent(pct)}
                            className="px-2 py-0.5 rounded bg-white hover:bg-[#01390f] hover:text-white border border-emerald-300 text-[#01390f] text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            {pct}% OFF
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => applyDiscountPercent(0)}
                          className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Exact Sum
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PACKAGE SET CODE, NAME & PROMO BADGE */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Package Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="PKG0001"
                      className="w-full h-[36px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-mono font-bold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Package Set Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value, itemDescription: e.target.value })}
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
                      {formData.bundleItems.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCopyBundledImages}
                          className="text-[11px] font-bold text-[#01390f] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Import Bundled Photos</span>
                        </button>
                      )}
                      {formData.images && formData.images.length > 0 && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {formData.images.length} {formData.images.length === 1 ? 'photo' : 'photos'} added
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
                        onChange={handleMultipleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Thumbnails */}
                    {formData.images && formData.images.length > 0 ? (
                      formData.images.map((imgSrc, idx) => (
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
                            onClick={() => handleRemoveImageAtIndex(idx)}
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
                      {Number(formData.originalPrice) > Number(formData.price) && Number(formData.price) > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Save ₱{(formData.originalPrice - formData.price).toFixed(2)} ({Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)}% OFF)
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
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
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
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: Math.max(0, Number(e.target.value) || 0) })}
                          placeholder="10"
                          className="w-full h-[36px] bg-slate-50 border border-slate-200 text-slate-800 rounded-l-lg pl-8 pr-2 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                        />
                      </div>
                      {estimatedMaxBuildable > 0 && (
                        <div
                          onClick={() => setFormData({ ...formData, quantity: estimatedMaxBuildable })}
                          className="h-[36px] bg-slate-100 hover:bg-slate-200/80 border-y border-r border-slate-200 rounded-r-lg px-2.5 text-xs font-semibold text-slate-700 uppercase cursor-pointer flex items-center gap-1 shrink-0 transition-colors select-none"
                          title="Click to set maximum buildable sets from stock"
                        >
                          <span className="text-[10px] text-slate-400 font-bold">MAX:</span>
                          <span className="font-mono font-bold text-[#01390f]">{estimatedMaxBuildable}</span>
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
                      value={formData.promoBadge}
                      onChange={(e) => setFormData({ ...formData, promoBadge: e.target.value })}
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
                          value={formData.shippingReturns || ''}
                          onChange={(e) => setFormData({ ...formData, shippingReturns: e.target.value })}
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
                        ].includes(formData.shippingReturns) ? formData.shippingReturns : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData({ ...formData, shippingReturns: e.target.value });
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
                      onClick={handleAutoGenerateDescription}
                      className="text-[11px] font-bold text-[#01390f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-generate Description</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={formData.marketingDescription}
                    onChange={(e) => setFormData({ ...formData, marketingDescription: e.target.value })}
                    placeholder="Enter detailed package overview, routine instructions, and customer benefits..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors resize-none"
                  />
                </div>

                {/* 7. PUBLISH TO STOREFRONT TOGGLE */}
                <div
                  onClick={() => setFormData((prev) => ({ ...prev, isPublished: !prev.isPublished }))}
                  className="flex items-center gap-3 pt-1 cursor-pointer select-none group"
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
                      Publish to storefront immediately <span className="text-[11px] font-normal text-slate-400">(Visible to customers)</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formData.isPublished
                        ? 'Live in CustomerPackageSets storefront immediately upon saving'
                        : 'Saved as draft (hidden from customers until published)'}
                    </span>
                  </div>
                </div>

              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 bg-[#01390f] hover:bg-[#0a5219] text-white cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{submitting ? 'Saving...' : editingItem ? 'Update Package Set' : 'Save Package Set'}</span>
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
                    openEditModal(pkg);
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

export default MarketingPackageSets;
