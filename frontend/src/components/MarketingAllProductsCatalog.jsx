import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios, { API } from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { notifyLiveSync } from '../utils/liveSync';
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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [viewProductModal, setViewProductModal] = useState(null);

  // NAVBAR PROMO BANNER STATE
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    badge: 'Handcrafted Quality',
    title: '100% Natural Essentials',
    text: 'Glow naturally with our herbal soaps, tea, and organic serums.',
    buttonText: 'VIEW STOREFRONT CATALOG',
    image: '',
  });

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

  const filteredInventoryProducts = useMemo(() => {
    if (!invSearchQuery.trim()) return inventoryProducts;
    const q = invSearchQuery.toLowerCase().trim();
    return inventoryProducts.filter((inv) => {
      const code = (inv.code || inv.itemCode || '').toLowerCase();
      const name = (inv.itemDescription || inv.itemName || '').toLowerCase();
      const cat = (inv.category || '').toLowerCase();
      return code.includes(q) || name.includes(q) || cat.includes(q);
    });
  }, [inventoryProducts, invSearchQuery]);

  const matchedInventoryProduct = useMemo(() => {
    if (!formData.productRef && !formData.code) return null;
    return inventoryProducts.find(
      (inv) =>
        (formData.productRef && (inv._id === formData.productRef || inv.id === formData.productRef)) ||
        (formData.code && (inv.code === formData.code || inv.itemCode === formData.code))
    );
  }, [inventoryProducts, formData.productRef, formData.code]);

  const maxInventoryQty = matchedInventoryProduct ? Number(matchedInventoryProduct.quantity || 0) : null;

  const handleSelectInventoryItem = (inv) => {
    if (!inv) return;
    const invCat = inv.category;
    const isGeneric = !invCat || ['Finished Goods', 'Finished Product', 'Raw Materials', 'Packaging', 'Supplies'].includes(invCat);
    const chosenCategory = isGeneric ? 'Skin Care' : invCat;

    const img = inv.image || (Array.isArray(inv.images) && inv.images[0] ? inv.images[0] : '');

    setFormData((prev) => ({
      ...prev,
      productRef: inv._id || inv.id,
      code: inv.code || inv.itemCode || '',
      itemDescription: inv.itemDescription || inv.itemName || '',
      category: chosenCategory,
      navbarTag: chosenCategory,
      brand: inv.brand || 'Mhira Natural',
      quantity: Number(inv.quantity || 0),
      uom: 'PCS',
      images: img ? (prev.images && prev.images.length > 0 ? prev.images : [img]) : (prev.images || []),
      price: prev.price > 0 ? prev.price : (inv.price || inv.unitPrice || 0),
      originalPrice: inv.price || inv.unitPrice || 0,
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
  }, []);

  const openAddModal = () => {
    setSelectedCatalogItem(null);
    setFormData(initialFormState);
    setProductReviews([]);
    setInvSearchQuery('');
    setIsInvDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setSelectedCatalogItem(item);
    setFormData({
      productRef: item.productRef?._id || item.productRef || '',
      code: item.code || '',
      itemDescription: item.itemDescription || '',
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
    setViewProductModal(item);
    setProductReviews([]);
    if (item._id) {
      setLoadingReviews(true);
      axios.get(`${API_BASE_URL}/api/reviews/product/${item._id}`)
        .then((res) => setProductReviews(Array.isArray(res.data) ? res.data : []))
        .catch(() => setProductReviews([]))
        .finally(() => setLoadingReviews(false));
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

  // Filtered Catalog Items
  const filteredProducts = useMemo(() => {
    let result = catalogProducts.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.code || '').toLowerCase();
        const name = (item.itemName || item.itemDescription || '').toLowerCase();
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

      // 3. Status
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
      result.sort((a, b) => (a.itemName || a.itemDescription || '').localeCompare(b.itemName || b.itemDescription || ''));
    }

    return result;
  }, [catalogProducts, searchQuery, selectedCategory, selectedNavbarTag, selectedStatus, hideZeroQty, showZeroOnly, onSaleOnly, sortBy]);

  // Summary KPIs
  const publishedCount = useMemo(() => catalogProducts.filter((p) => p.isPublished).length, [catalogProducts]);
  const draftCount = useMemo(() => catalogProducts.filter((p) => !p.isPublished).length, [catalogProducts]);
  const promoCount = useMemo(() => catalogProducts.filter((p) => p.isOnSale || p.promoBadge).length, [catalogProducts]);
  const zeroCount = useMemo(() => catalogProducts.filter((p) => Number(p.quantity || 0) === 0).length, [catalogProducts]);

  const peso = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusModules = [
    { id: 'All', label: 'All Products', count: catalogProducts.length },
    { id: 'published', label: 'Live', count: publishedCount },
    { id: 'draft', label: 'Drafts', count: draftCount },
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
  }, [searchQuery, selectedCategory, selectedStatus, hideZeroQty, showZeroOnly, onSaleOnly, sortBy]);

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

      const tableBody = filteredProducts.map((p, idx) => [
        idx + 1,
        p.code || 'N/A',
        p.itemDescription || 'Product',
        p.category || 'General',
        `PHP ${Number(p.price || 0).toFixed(2)}`,
        p.promoBadge || (p.isOnSale ? 'On Sale' : '-'),
        `${p.quantity || 0} ${p.uom || 'pcs'}`,
        p.isPublished ? 'PUBLISHED (LIVE)' : 'DRAFT'
      ]);

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

        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {statusModules.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(mod.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                  selectedStatus === mod.id
                    ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                {mod.label}
              </button>
            ))}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
          {/* ACTIONS GROUP */}
          <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
            <div className="flex items-stretch gap-1.5 flex-1">
              <button
                type="button"
                onClick={openAddModal}
                className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                title="Add New Store Product"
              >
                <Plus className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-center leading-tight">Add Product</span>
              </button>
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(true)}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                  title="Storefront Promo Banner"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">Promo Banner</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCatalogPdf}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                  title="Download Catalog PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Export Catalog</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer w-full"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">Reset Filters</span>
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
              Actions
            </div>
          </div>

          {/* SEARCH & FILTER GROUP */}
          <div className="flex flex-col justify-between flex-1 min-h-[92px] pl-1">
            <div className="flex flex-col justify-between flex-1 gap-1.5 py-0.5">
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

              {/* Layer 2: 3-column Dropdowns */}
              <div className="grid grid-cols-3 gap-2 w-full">
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
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    hideZeroQty
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
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    showZeroOnly
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  0 Qty Only
                </button>

                <button
                  type="button"
                  onClick={() => setOnSaleOnly(!onSaleOnly)}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    onSaleOnly
                      ? 'bg-amber-50 border-amber-500 text-amber-800 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  On Sale Only
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none">
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="font-bold uppercase text-[11px] tracking-wider whitespace-nowrap bg-[#01390f] text-white">
                    <th className="py-3.5 px-4 w-[280px]">Item Profile</th>
                    <th className="py-3.5 px-4 text-center">Image</th>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Store Price</th>
                    <th className="py-3.5 px-4 text-center">Quantity</th>
                    <th className="py-3.5 px-4 text-center">UOM</th>
                    <th className="py-3.5 px-4 text-center">Storefront Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700 text-xs">
                  {paginatedProducts.map((row) => {
                    const isDepleted = Number(row.quantity ?? 0) === 0;
                    const count = Number(row.quantity ?? 0);

                    let fullBoxClasses = 'bg-emerald-100 text-emerald-950 font-bold';
                    if (count === 0) {
                      fullBoxClasses = 'bg-rose-100 text-rose-950 font-bold';
                    } else if (count <= 5) {
                      fullBoxClasses = 'bg-amber-100 text-amber-950 font-bold';
                    }

                    return (
                      <tr
                        key={row._id}
                        className={`transition-colors whitespace-nowrap group ${
                          isDepleted && showZeroOnly
                            ? 'bg-red-50/50 hover:bg-red-50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Item Profile */}
                        <td className="px-4 py-3 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex flex-col min-w-0 max-w-[280px]">
                            <span
                              className="font-semibold text-xs truncate text-slate-800"
                              title={row.itemName || row.itemDescription}
                            >
                              {row.itemName || row.itemDescription}
                            </span>
                            {row.isOnSale && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30 uppercase tracking-wide flex-shrink-0">
                                  {row.promoBadge || 'On Sale'}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Image */}
                        <td className="px-4 py-2 text-center whitespace-nowrap">
                          <div className="flex justify-center items-center">
                            {row.images && row.images[0] ? (
                              <img
                                src={resolveProductImageUrl(row.images[0])}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Code */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-slate-500" title={row.code}>
                          {row.code || '—'}
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-xs">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                            {row.category || 'Standard'}
                          </span>
                        </td>

                        {/* Store Price */}
                        <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-700">
                          ₱{peso(row.price || 0)}
                        </td>

                        {/* Quantity */}
                        <td className={`px-4 py-3 whitespace-nowrap text-center font-mono text-xs transition-colors ${fullBoxClasses}`}>
                          {count.toLocaleString()}
                        </td>

                        {/* UOM */}
                        <td className="px-4 py-3 whitespace-nowrap text-center font-medium text-xs text-slate-600">
                          {row.uom || 'PCS'}
                        </td>

                        {/* Storefront Status */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <button
                            type="button"
                            onClick={(e) => handleTogglePublish(row, e)}
                            className={`text-xs font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                              row.isPublished
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Click to toggle live publish state"
                          >
                            {row.isPublished ? 'Live' : 'Draft'}
                          </button>
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View */}
                            <button
                              type="button"
                              onClick={() => handleOpenViewModal(row)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="View Full Product Specs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Edit Product Details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCatalog(row._id, e)}
                              className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              title="Remove from Store Catalog"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-14 text-slate-500 font-medium italic text-xs">
              No records match the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT CATALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
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

            <form onSubmit={handleSaveCatalog} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              {/* SELECT FROM FINISHED GOODS INVENTORY DROPDOWN */}
              {!selectedCatalogItem && (
                <div className="space-y-1.5 relative" ref={invDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Select From Finished Goods Inventory (Optional)
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {inventoryProducts.length} finished goods available
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search finished goods by name, code, category..."
                      value={invSearchQuery}
                      onChange={(e) => {
                        setInvSearchQuery(e.target.value);
                        setIsInvDropdownOpen(true);
                      }}
                      onFocus={() => setIsInvDropdownOpen(true)}
                      className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#01390f] focus:ring-1 focus:ring-[#01390f]/20 transition-all h-[42px]"
                    />
                    {invSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInvSearchQuery('')}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title="Clear Search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* AUTOCOMPLETE DROPDOWN RESULTS (SAME AS HEADER SEARCH) */}
                  {isInvDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {filteredInventoryProducts.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                          {filteredInventoryProducts.map((inv) => {
                            const img = inv.image || (Array.isArray(inv.images) && inv.images[0]);
                            return (
                              <div
                                key={inv._id || inv.id}
                                onClick={() => handleSelectInventoryItem(inv)}
                                className="flex items-center gap-3 p-3 hover:bg-emerald-50/60 transition-colors cursor-pointer group"
                              >
                                {/* PRODUCT THUMBNAIL */}
                                <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/80">
                                  <img
                                    src={resolveProductImageUrl(img)}
                                    alt={inv.itemName || inv.itemDescription}
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = '/mhira_removebg.png';
                                    }}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                </div>

                                {/* PRODUCT DETAILS (CATEGORY, NAME, CODE) */}
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-semibold text-[#01390f] uppercase tracking-wider block">
                                    {inv.category || 'Finished Goods'}
                                  </span>
                                  <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate group-hover:text-[#01390f] transition-colors leading-snug">
                                    {inv.itemName || inv.itemDescription}
                                  </p>
                                  <span className="font-mono text-[11px] text-slate-400">
                                    {inv.code || inv.itemCode}
                                  </span>
                                </div>

                                {/* QUANTITY AVAILABLE */}
                                <div className="text-right shrink-0">
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-[#01390f] border border-emerald-200/80 text-xs font-mono font-bold">
                                    {inv.quantity || 0} PCS
                                  </span>
                                  <span className="block text-[10px] text-slate-400 mt-0.5">In Stock</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          No finished goods found matching &quot;{invSearchQuery}&quot;.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SELECTED PRODUCT SUMMARY CARD */}
              {(formData.code || formData.itemDescription || selectedCatalogItem) ? (
                <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                      <img
                        src={resolveProductImageUrl((formData.images && formData.images[0]) || matchedInventoryProduct?.image)}
                        alt={formData.itemDescription}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/mhira_removebg.png';
                        }}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {formData.code || 'N/A'}
                        </span>
                        <span className="text-[11px] font-semibold text-[#01390f] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">
                          {formData.category || 'Skin Care'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate max-w-sm">
                        {formData.itemDescription}
                      </h4>
                      {/* STATS: RATINGS & NO. SOLD */}
                      <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium mt-1">
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {Number(formData.rating || 5).toFixed(1)} / 5.0
                        </span>
                        <span>•</span>
                        <span className="text-slate-600 font-semibold">
                          {formData.soldCount || 0} Sold
                        </span>
                        {maxInventoryQty !== null && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-emerald-800">
                              {maxInventoryQty} PCS in Inventory
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CHANGE PRODUCT BUTTON (ONLY IN ADD MODE) */}
                  {!selectedCatalogItem && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          productRef: '',
                          code: '',
                          itemDescription: '',
                          quantity: 0,
                        }));
                        setInvSearchQuery('');
                        setIsInvDropdownOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-[#01390f] hover:text-[#01250a] font-semibold underline cursor-pointer shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Change Product</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/50 border border-dashed border-emerald-200 rounded-2xl text-center text-xs text-[#01390f] font-medium">
                  Please search or select a finished good from inventory above to configure its storefront listing.
                </div>
              )}

              {/* INPUTS: SELLING PRICE & STOREFRONT ALLOCATED QUANTITY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. SELLING PRICE */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Selling Price (₱) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-[#01390f] focus:outline-none focus:border-[#01390f] focus:bg-white font-mono"
                    placeholder="0.00"
                  />
                </div>

                {/* 2. STOREFRONT QUANTITY (CUSTOMER VISIBLE) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Storefront Quantity (Customer Visible) *
                    </label>
                    {maxInventoryQty !== null && (
                      <span className="text-[11px] font-mono font-semibold text-slate-500">
                        Warehouse: <span className="text-[#01390f] font-bold">{maxInventoryQty} PCS</span>
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={maxInventoryQty !== null ? maxInventoryQty : undefined}
                    required
                    value={formData.quantity}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      if (maxInventoryQty !== null && val > maxInventoryQty) {
                        showErrorToast(`Quantity cannot exceed warehouse stock of ${maxInventoryQty} PCS.`);
                        setFormData({ ...formData, quantity: maxInventoryQty });
                      } else {
                        setFormData({ ...formData, quantity: val });
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#01390f] focus:bg-white font-mono"
                    placeholder="0"
                  />
                  <p className="text-[10px] text-slate-400">
                    {maxInventoryQty !== null
                      ? `Warehouse has ${maxInventoryQty} PCS. You can allocate less for customers, but cannot exceed warehouse stock.`
                      : 'Quantity visible and available for customer purchases in the storefront.'}
                  </p>
                </div>
              </div>

              {/* MULTIPLE STOREFRONT PRODUCT IMAGES UPLOAD */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Product Storefront Images (Multiple Photos)
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Upload photos for customer gallery. First photo is the main storefront thumbnail.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#01390f] text-xs font-bold transition-all cursor-pointer shadow-2xs border border-emerald-200">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* IMAGES PREVIEW GRID */}
                {formData.images && formData.images.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 pt-1">
                    {formData.images.map((imgSrc, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs"
                      >
                        <img
                          src={imgSrc}
                          alt={`Product photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-md shadow-xs">
                            Main
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImageAtIndex(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                          title="Remove image"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-[#01390f] rounded-2xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-50/60 hover:bg-emerald-50/30 transition-all text-center">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">Click or drag images to upload</span>
                    <span className="text-[10px] text-slate-400">Select multiple PNG, JPG, WEBP files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* DETAILS (MARKETING DESCRIPTION) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Details (Product Overview & Usage)
                </label>
                <textarea
                  rows={3}
                  value={formData.marketingDescription}
                  onChange={(e) => setFormData({ ...formData, marketingDescription: e.target.value })}
                  placeholder="Enter detailed storefront overview, benefits, and how-to-use instructions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#01390f] focus:bg-white resize-none"
                />
              </div>

              {/* SHIPPING & RETURNS POLICY WITH EXISTING DROPDOWN */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Shipping & Returns Policy Type
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Select preset or customize below
                  </span>
                </div>

                <select
                  value={formData.shippingReturns || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData({ ...formData, shippingReturns: e.target.value });
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer text-slate-700"
                >
                  <option value="">-- Choose Existing Policy / Preset Type --</option>
                  {existingShippingPolicies.map((pol, idx) => (
                    <option key={idx} value={pol}>
                      {pol.length > 80 ? `${pol.substring(0, 80)}...` : pol}
                    </option>
                  ))}
                </select>

                <textarea
                  rows={2}
                  value={formData.shippingReturns}
                  onChange={(e) => setFormData({ ...formData, shippingReturns: e.target.value })}
                  placeholder="Enter or customize delivery transit timeframe and returns guarantee..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#01390f] focus:bg-white resize-none"
                />
              </div>

              {/* CUSTOMER REVIEWS VIEWER (IN MODAL) */}
              {selectedCatalogItem && (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Customer Reviews ({productReviews.length})
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Live reviews submitted by store customers
                    </span>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                    {loadingReviews ? (
                      <p className="text-xs text-slate-400 text-center py-3">Loading reviews...</p>
                    ) : productReviews.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-3 italic">
                        No customer reviews submitted yet for this product.
                      </p>
                    ) : (
                      productReviews.map((rev, idx) => (
                        <div
                          key={rev._id || idx}
                          className="bg-white border border-slate-200/70 rounded-xl p-2.5 shadow-2xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">
                              {rev.userName || "Verified Buyer"}
                            </span>
                            <span className="text-[11px] text-amber-600 font-semibold">
                              ★ {rev.rating || 5}/5
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{rev.comment}</p>
                          {rev.createdAt && (
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pub-check"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="w-4 h-4 text-[#01390f] rounded"
                />
                <label htmlFor="pub-check" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Publish to storefront immediately (Visible to customers)
                </label>
              </div>

              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 -mx-6 -mb-6 mt-4 whitespace-nowrap">
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
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span className="whitespace-nowrap">{submitting ? 'Saving...' : 'Save Product'}</span>
                </button>
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
                  {viewProductModal.itemDescription}
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
    </div>
  );
}

export default MarketingAllProductsCatalog;