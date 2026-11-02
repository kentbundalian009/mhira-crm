import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Tag,
  Star,
  RotateCcw,
  RefreshCw,
  X,
  ChevronDown,
  Calendar,
  Activity,
  Eye,
  SlidersHorizontal,
  Loader2,
  CheckCircle2,
  User,
  ShoppingBag,
  Percent,
  Layers,
  ArrowUpDown,
  FileText
} from 'lucide-react';
import axios, { API, API_BASE_URL } from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';
import ItemImageModal, { resolveItemImageUrl } from './common/ItemImageModal';
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

function MarketingReports() {
  // Selected Tab: 'products-catalog' | 'products-vouchers' | 'customer-feedback'
  const [activeTab, setActiveTab] = useState('products-catalog');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedImageItem, setSelectedImageItem] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAudience, setSelectedAudience] = useState('All');
  const [selectedRating, setSelectedRating] = useState('All');
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [showZeroOnly, setShowZeroOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [activeOnlyCoupons, setActiveOnlyCoupons] = useState(false);
  const [fiveStarOnly, setFiveStarOnly] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Datasets
  const [catalogProducts, setCatalogProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_marketing_catalog') || localStorage.getItem('mhira_db_products');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [
      { _id: '1', code: 'FG0001', itemDescription: 'NIACINAMIDE BODY LOTION', category: 'Bath & Body', price: 225, quantity: 15, isPublished: true },
      { _id: '2', code: 'FG0002', itemDescription: 'HEALTHY HAIR AND SMOOTH SHINY HAIR', category: 'Hair Care', price: 280, quantity: 20, isPublished: true },
      { _id: '3', code: 'FG0003', itemDescription: 'ORGANIC HERBAL SHAMPOO BAR', category: 'Hair Care', price: 250, quantity: 12, isPublished: true },
      { _id: '4', code: 'FG0004', itemDescription: 'FACE SERUM COLLAGEN', category: 'Skin Care', price: 300, quantity: 18, isPublished: true },
    ];
  });

  const [coupons, setCoupons] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_coupons');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [
      { _id: 'c1', code: 'MHIRA10', discount: '10% OFF', minSpend: 499, targetSegment: 'All Customers', expiry: '2026-12-31' },
      { _id: 'c2', code: 'VIPGLOW20', discount: '20% OFF', minSpend: 999, targetSegment: 'VIP', expiry: '2026-12-31' },
      { _id: 'c3', code: 'NEWGLOW50', discount: '₱50 OFF', minSpend: 350, targetSegment: 'New', expiry: '2026-11-30' },
    ];
  });

  const [feedback, setFeedback] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_reviews');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [
      { _id: 'f1', userName: 'Maria Santos', productName: 'NIACINAMIDE BODY LOTION', rating: 5, comment: 'Super bango and non-greasy sa skin!', createdAt: '2026-10-15' },
      { _id: 'f2', userName: 'Joana Cruz', productName: 'FACE SERUM COLLAGEN', rating: 5, comment: 'Mabilis ma-absorb, noticeably brightened my skin in 2 weeks.', createdAt: '2026-10-20' },
      { _id: 'f3', userName: 'Elena Bautista', productName: 'ORGANIC HERBAL SHAMPOO BAR', rating: 4, comment: 'Gentle on scalp and lathers nicely. Highly recommended.', createdAt: '2026-10-22' },
    ];
  });

  const reportTabs = [
    { id: 'products-catalog', label: 'Products Catalog', icon: FileSpreadsheet },
    { id: 'products-vouchers', label: 'Products Vouchers', icon: Tag },
    { id: 'customer-feedback', label: 'Customer Feedback', icon: Star },
  ];

  const activeTabTitle = useMemo(() => {
    const found = reportTabs.find((t) => t.id === activeTab);
    return found ? found.label : 'Marketing Report';
  }, [activeTab]);

  // Fetch Live Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [catRes, cpnRes, fbRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/collections/catalog`, { headers }),
        axios.get(`${API_BASE_URL}/api/coupons`, { headers }),
        axios.get(`${API_BASE_URL}/api/reviews`, { headers }),
      ]);

      if (catRes.status === 'fulfilled') {
        const raw = Array.isArray(catRes.value.data)
          ? catRes.value.data
          : catRes.value.data?.products || catRes.value.data?.data || [];
        if (Array.isArray(raw) && raw.length > 0) {
          setCatalogProducts(raw);
          try {
            localStorage.setItem('cached_marketing_catalog', JSON.stringify(raw));
          } catch (e) { }
        }
      }

      if (cpnRes.status === 'fulfilled') {
        const raw = Array.isArray(cpnRes.value.data)
          ? cpnRes.value.data
          : cpnRes.value.data?.coupons || cpnRes.value.data?.data || [];
        if (Array.isArray(raw) && raw.length > 0) {
          setCoupons(raw);
          try {
            localStorage.setItem('cached_coupons', JSON.stringify(raw));
          } catch (e) { }
        }
      }

      if (fbRes.status === 'fulfilled') {
        const raw = Array.isArray(fbRes.value.data)
          ? fbRes.value.data
          : fbRes.value.data?.reviews || fbRes.value.data?.data || [];
        if (Array.isArray(raw) && raw.length > 0) {
          setFeedback(raw);
          try {
            localStorage.setItem('cached_reviews', JSON.stringify(raw));
          } catch (e) { }
        }
      }
    } catch (err) {
      console.error('Error fetching marketing report data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // MONTH & DATE FILTER HELPER (Matches InventoryReports.jsx)
  const matchesDateFilter = useCallback((dateString) => {
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
  }, [selectedMonth, selectedYear]);

  // Categories list from Catalog
  const uniqueCategories = useMemo(() => {
    const set = new Set(['Skin Care', 'Hair Care', 'Bath & Body']);
    catalogProducts.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [catalogProducts]);

  // Check coupon expiration helper
  const checkIsCouponExpired = (expiryStr) => {
    if (!expiryStr) return false;
    const exp = new Date(expiryStr);
    if (isNaN(exp.getTime())) return false;
    return exp < new Date();
  };

  // 1. FILTERED CATALOG PRODUCTS
  const filteredCatalog = useMemo(() => {
    let result = catalogProducts.filter((item) => {
      // Exclude archived items from active catalog reporting
      if (item.isArchived === true) return false;

      const q = searchQuery.toLowerCase().trim();
      const code = (item.code || '').toLowerCase();
      const name = (item.itemName || item.itemDescription || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();

      if (q && !code.includes(q) && !name.includes(q) && !cat.includes(q) && !brand.includes(q)) {
        return false;
      }

      if (selectedCategory !== 'All') {
        if ((item.category || '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      const qty = Number(item.quantity ?? 0);
      if (hideZeroQty && qty === 0) return false;
      if (showZeroOnly && qty !== 0) return false;
      if (onSaleOnly && !item.isOnSale && !item.promoBadge) return false;

      if (!matchesDateFilter(item.createdAt || item.updatedAt)) return false;

      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Live' && !item.isPublished) return false;
        if (selectedStatus === 'Draft' && item.isPublished) return false;
        if (selectedStatus === 'InStock' && qty <= 0) return false;
        if (selectedStatus === 'Zero' && qty !== 0) return false;
      }

      return true;
    });

    if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.itemName || a.itemDescription || '').localeCompare(b.itemName || b.itemDescription || ''));
    } else if (sortBy === 'price_low') {
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === 'price_high') {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === 'qty_desc') {
      result.sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0));
    }

    return result;
  }, [catalogProducts, searchQuery, selectedCategory, hideZeroQty, showZeroOnly, onSaleOnly, matchesDateFilter, selectedStatus, sortBy]);

  // 2. FILTERED PRODUCTS VOUCHERS
  const filteredCoupons = useMemo(() => {
    let result = coupons.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const code = (c.code || '').toLowerCase();
      const disc = (c.discount || '').toLowerCase();
      const target = (c.targetSegment || c.target || '').toLowerCase();

      if (q && !code.includes(q) && !disc.includes(q) && !target.includes(q)) {
        return false;
      }

      if (selectedAudience !== 'All') {
        const seg = (c.targetSegment || c.target || '').toLowerCase();
        if (!seg.includes(selectedAudience.toLowerCase())) return false;
      }

      const isExpired = checkIsCouponExpired(c.expiry || c.validUntil);
      if (activeOnlyCoupons && isExpired) return false;

      if (!matchesDateFilter(c.expiry || c.createdAt)) return false;

      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Active' && isExpired) return false;
        if (selectedStatus === 'Expired' && !isExpired) return false;
      }

      return true;
    });

    if (sortBy === 'name_asc') {
      result.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    }

    return result;
  }, [coupons, searchQuery, selectedAudience, activeOnlyCoupons, matchesDateFilter, selectedStatus, sortBy]);

  // 3. FILTERED CUSTOMER FEEDBACK
  const filteredFeedback = useMemo(() => {
    let result = feedback.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const cust = (f.userName || f.customerName || '').toLowerCase();
      const prod = (f.productName || '').toLowerCase();
      const comm = (f.comment || '').toLowerCase();

      if (q && !cust.includes(q) && !prod.includes(q) && !comm.includes(q)) {
        return false;
      }

      const r = Number(f.rating) || 5;
      if (selectedRating !== 'All') {
        if (selectedRating === '5' && r !== 5) return false;
        if (selectedRating === '4' && r !== 4) return false;
        if (selectedRating === '3' && r !== 3) return false;
        if (selectedRating === 'low' && r > 3) return false;
      }

      if (fiveStarOnly && r !== 5) return false;
      if (criticalOnly && r > 3) return false;

      if (!matchesDateFilter(f.createdAt || f.date)) return false;

      return true;
    });

    if (sortBy === 'highest') {
      result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => Number(a.rating || 0) - Number(b.rating || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [feedback, searchQuery, selectedRating, fiveStarOnly, criticalOnly, matchesDateFilter, sortBy]);

  // Current active dataset
  const currentDataset = useMemo(() => {
    if (activeTab === 'products-catalog') return filteredCatalog;
    if (activeTab === 'products-vouchers') return filteredCoupons;
    return filteredFeedback;
  }, [activeTab, filteredCatalog, filteredCoupons, filteredFeedback]);

  // Pagination slice
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return currentDataset.slice(start, start + itemsPerPage);
  }, [currentDataset, currentPage, itemsPerPage]);

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedMonth, selectedYear, selectedCategory, selectedStatus, selectedAudience, selectedRating, hideZeroQty, showZeroOnly, onSaleOnly, activeOnlyCoupons, fiveStarOnly, criticalOnly, sortBy]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedMonth !== 'All') count++;
    if (selectedYear !== 'All') count++;
    if (selectedCategory !== 'All') count++;
    if (selectedStatus !== 'All') count++;
    if (selectedAudience !== 'All') count++;
    if (selectedRating !== 'All') count++;
    if (hideZeroQty) count++;
    if (showZeroOnly) count++;
    if (onSaleOnly) count++;
    if (activeOnlyCoupons) count++;
    if (fiveStarOnly) count++;
    if (criticalOnly) count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [searchQuery, selectedMonth, selectedYear, selectedCategory, selectedStatus, selectedAudience, selectedRating, hideZeroQty, showZeroOnly, onSaleOnly, activeOnlyCoupons, fiveStarOnly, criticalOnly, sortBy]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedMonth('All');
    setSelectedYear('All');
    setSelectedCategory('All');
    setSelectedStatus('All');
    setSelectedAudience('All');
    setSelectedRating('All');
    setHideZeroQty(false);
    setShowZeroOnly(false);
    setOnSaleOnly(false);
    setActiveOnlyCoupons(false);
    setFiveStarOnly(false);
    setCriticalOnly(false);
    setSortBy('default');
    setCurrentPage(1);
  };

  // ========================================================
  // OFFICIAL EXECUTIVE PDF GENERATION (MATCHES INVENTORY REPORTS)
  // ========================================================
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

      // Natural logo ratio: 835 / 673 = 1.2407
      const logoRatio = 835 / 673;

      // Watermark geometry (centered on A4 portrait)
      const wmWidth = 90;
      const wmHeight = wmWidth / logoRatio;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;

      // Clean period label
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
      const typeTag =
        activeTab === 'products-catalog'
          ? 'CAT'
          : activeTab === 'products-vouchers'
            ? 'VOUCH'
            : 'REV';

      const docNo = `MN-MKT-${typeTag}-${yearTag}-${monthTag}-${String(Date.now()).slice(-4)}`;

      // Determine Report Title
      let reportTitle = 'MARKETING AUDIT LEDGER';
      if (activeTab === 'products-catalog') {
        reportTitle = 'PRODUCTS CATALOG AUDIT REPORT';
      } else if (activeTab === 'products-vouchers') {
        reportTitle = 'PRODUCTS VOUCHERS AUDIT REPORT';
      } else {
        reportTitle = 'CUSTOMER FEEDBACK & SENTIMENT AUDIT';
      }

      // ========================================================
      // 2. OFFICIAL COMPANY HEADER & NATURAL LOGO (NO CONTAINER)
      // ========================================================
      const headerLogoH = 15;
      const headerLogoW = headerLogoH * logoRatio; // ~18.6mm
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 14, 12, headerLogoW, headerLogoH, undefined, 'FAST');
        } catch (e) { }
      }

      // Company Titles (starts at X=36, generously spaced)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(21, 62, 151); // Royal Blue #153E97
      doc.text('MHIRA NATURAL BEAUTY PRODUCTS', 36, 16.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text('MARKETING OPERATIONS & STOREFRONT PERFORMANCE AUDIT', 36, 21.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text('Official Commercial Catalog, Promotional Vouchers & Customer Sentiment Audit Trail', 36, 26);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(21, 62, 151);
      doc.text('Security Classification: INTERNAL CONFIDENTIAL • Controlled Executive Copy', 36, 30);

      // Top-Right Official Metadata
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
      // 3. STATISTICAL KPI AUDIT SUMMARY TABLE (4 Columns)
      // ========================================================
      let card1Label = '';
      let card1Val = '';
      let card2Label = '';
      let card2Val = '';
      let card3Label = '';
      let card3Val = '';
      let card4Label = '';
      let card4Val = '';

      if (activeTab === 'products-catalog') {
        const totalItems = filteredCatalog.length;
        const totalStock = filteredCatalog.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
        const promoCount = filteredCatalog.filter((p) => p.isOnSale || p.promoBadge).length;
        const zeroCount = filteredCatalog.filter((p) => Number(p.quantity || 0) === 0).length;
        const inStockCount = totalItems - zeroCount;

        card1Label = 'REGISTERED CATALOG PRODUCTS';
        card1Val = `${totalItems.toLocaleString()} Active SKUs`;
        card2Label = 'TOTAL STOREFRONT STOCK';
        card2Val = `${totalStock.toLocaleString()} Available Units`;
        card3Label = 'ON SALE & PROMO ITEMS';
        card3Val = `${promoCount.toLocaleString()} Promotional Deals`;
        card4Label = 'INVENTORY VISIBILITY';
        card4Val = `${inStockCount} In Stock | ${zeroCount} Depleted`;
      } else if (activeTab === 'products-vouchers') {
        const totalVouchers = filteredCoupons.length;
        const activeCount = filteredCoupons.filter((c) => !checkIsCouponExpired(c.expiry || c.validUntil)).length;
        const expiredCount = totalVouchers - activeCount;
        const vipCount = filteredCoupons.filter((c) => (c.targetSegment || '').toUpperCase().includes('VIP')).length;

        card1Label = 'REGISTERED PROMO CODES';
        card1Val = `${totalVouchers.toLocaleString()} Vouchers`;
        card2Label = 'USABLE & ACTIVE CODES';
        card2Val = `${activeCount.toLocaleString()} Active Vouchers`;
        card3Label = 'EXPIRED VOUCHERS';
        card3Val = `${expiredCount.toLocaleString()} Expired Codes`;
        card4Label = 'TARGETED VIP OFFERS';
        card4Val = `${vipCount} VIP Exclusive Offers`;
      } else {
        const totalReviews = filteredFeedback.length;
        const avgRating = totalReviews > 0
          ? (filteredFeedback.reduce((sum, f) => sum + (Number(f.rating) || 5), 0) / totalReviews).toFixed(1)
          : '5.0';
        const fiveStarCount = filteredFeedback.filter((f) => Number(f.rating) === 5).length;
        const criticalCount = filteredFeedback.filter((f) => Number(f.rating) <= 3).length;

        card1Label = 'TOTAL CUSTOMER REVIEWS';
        card1Val = `${totalReviews.toLocaleString()} Verified Feedbacks`;
        card2Label = 'AVERAGE CUSTOMER RATING';
        card2Val = `${avgRating} / 5.0 Star Rating`;
        card3Label = 'PERFECT 5-STAR REVIEWS';
        card3Val = `${fiveStarCount.toLocaleString()} Top Rated Reviews`;
        card4Label = 'CRITICAL FEEDBACK AUDIT';
        card4Val = `${criticalCount} Reviews (<= 3 Stars)`;
      }

      // Summary KPI Table (Formal 4-column Table)
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
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [239, 246, 255], // Soft blue tint #eff6ff
          textColor: [21, 62, 151], // Royal Blue text
          fontStyle: 'bold',
          fontSize: 5.6,
          halign: 'center',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: 6.0,
          halign: 'center',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        columnStyles: {
          0: { cellWidth: 45.5 },
          1: { cellWidth: 45.5 },
          2: { cellWidth: 45.5 },
          3: { cellWidth: 45.5 },
        },
      });

      // ========================================================
      // 4. MAIN DATA TABLE (AutoTable - Blue Header & Strict Width)
      // ========================================================
      let tableHead = [];
      let tableBody = [];
      let columnStyles = {};

      if (activeTab === 'products-catalog') {
        tableHead = [
          ['CODE', 'CATEGORY', 'PRODUCT TITLE', 'STORE PRICE', 'STOCK QTY', 'PROMO BADGE', 'STORE STATUS']
        ];
        tableBody = filteredCatalog.map((p) => {
          const qty = Number(p.quantity ?? 0);
          const priceStr = `PHP ${Number(p.price || 0).toFixed(2)}`;
          const promoStr = p.promoBadge || (p.isOnSale ? 'On Sale' : '-');
          const statusStr = p.isPublished ? 'Published (Live)' : 'Draft Mode';

          return [
            p.code || 'N/A',
            p.category || 'Skin Care',
            p.itemName || p.itemDescription || 'Product',
            priceStr,
            `${qty.toLocaleString()} ${p.uom || 'PCS'}`,
            promoStr,
            statusStr,
          ];
        });

        // Exact 182mm total width in Portrait
        columnStyles = {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 22 },
          1: { halign: 'left', cellWidth: 30 },
          2: { fontStyle: 'bold', halign: 'left', cellWidth: 46 },
          3: { fontStyle: 'bold', halign: 'right', cellWidth: 26 },
          4: { fontStyle: 'bold', halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 20 },
          6: { fontStyle: 'bold', halign: 'center', cellWidth: 16 },
        };
      } else if (activeTab === 'products-vouchers') {
        tableHead = [
          ['VOUCHER CODE', 'DISCOUNT RATE', 'MINIMUM SPEND', 'TARGET AUDIENCE', 'EXPIRY DATE', 'STATUS']
        ];
        tableBody = filteredCoupons.map((c) => {
          const isExpired = checkIsCouponExpired(c.expiry || c.validUntil);
          const minSpendStr = c.minSpend ? `PHP ${Number(c.minSpend).toFixed(2)}` : 'None';
          const expStr = c.expiry || c.validUntil ? new Date(c.expiry || c.validUntil).toLocaleDateString() : 'No Expiry';

          return [
            c.code || 'N/A',
            c.discount || '10% OFF',
            minSpendStr,
            c.targetSegment || c.target || 'All Customers',
            expStr,
            isExpired ? 'Expired' : 'Active / Usable',
          ];
        });

        // Exact 182mm total width in Portrait
        columnStyles = {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 32 },
          1: { fontStyle: 'bold', halign: 'center', cellWidth: 28 },
          2: { fontStyle: 'bold', halign: 'right', cellWidth: 32 },
          3: { halign: 'left', cellWidth: 38 },
          4: { halign: 'center', cellWidth: 28 },
          5: { fontStyle: 'bold', halign: 'center', cellWidth: 24 },
        };
      } else {
        tableHead = [
          ['CUSTOMER NAME', 'PRODUCT REVIEWED', 'RATING', 'FEEDBACK COMMENT', 'DATE']
        ];
        tableBody = filteredFeedback.map((f) => {
          const r = Number(f.rating) || 5;
          const dateStr = f.createdAt || f.date ? new Date(f.createdAt || f.date).toLocaleDateString() : 'N/A';

          return [
            f.userName || f.customerName || 'Verified Buyer',
            f.productName || 'Natural Product',
            `${r.toFixed(1)} / 5.0 Stars`,
            f.comment || 'No written remark provided.',
            dateStr,
          ];
        });

        // Exact 182mm total width in Portrait
        columnStyles = {
          0: { fontStyle: 'bold', halign: 'left', cellWidth: 34 },
          1: { halign: 'left', cellWidth: 42 },
          2: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
          3: { halign: 'left', cellWidth: 56 },
          4: { halign: 'center', cellWidth: 24 },
        };
      }

      const mainTableStartY = (doc.lastAutoTable?.finalY || 45) + 4.5;

      autoTable(doc, {
        startY: mainTableStartY,
        margin: { left: 14, right: 14, top: 19, bottom: 12 },
        head: tableHead,
        body: tableBody,
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 6.8,
          textColor: [51, 65, 85],
          cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
          lineColor: [226, 232, 240],
          lineWidth: 0.15,
          valign: 'middle',
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [21, 62, 151], // Royal Blue #153E97
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center',
          valign: 'middle',
          lineColor: [21, 62, 151],
          lineWidth: 0.2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 255], // Subtle cool blue tint
        },
        columnStyles: columnStyles,
        didParseCell: (data) => {
          if (data.section === 'body') {
            const txt = String(data.cell.raw || '');
            if (txt.includes('Expired') || txt.includes('Depleted') || txt.includes('Draft')) {
              data.cell.styles.textColor = [190, 18, 60]; // rose-700
              data.cell.styles.fontStyle = 'bold';
            } else if (txt.includes('Active') || txt.includes('Published') || txt.includes('Live')) {
              data.cell.styles.textColor = [1, 57, 15]; // dark green
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawPage: (data) => {
          // Thumbnail Logo & Running Header on Page 2+
          if (data.pageNumber > 1) {
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
        },
      });

      // ========================================================
      // 5. EXECUTIVE AUDIT SIGN-OFF SECTION (Marketing Staff)
      // ========================================================
      let finalY = (doc.lastAutoTable?.finalY || 140) + 8;
      const sigSectionH = 24;

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

      // 3. Role (Below underline)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Marketing Staff', startX + (colWidth / 2), sigY + 14.8, { align: 'center' });

      // ========================================================
      // 6. FINAL PASS: CENTER WATERMARK & PAGE NUMBERING
      // ========================================================
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        if (watermarkBase64) {
          try {
            doc.addImage(watermarkBase64, 'PNG', wmX, wmY, wmWidth, wmHeight, undefined, 'FAST');
          } catch (e) { }
        }

        // Running Page Numbering
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 5.8, { align: 'right' });
      }

      // Download PDF
      const dateTag = new Date().toISOString().slice(0, 10);
      const fileName = `MHIRA_Marketing_Report_${activeTab}_${selectedMonth}_${selectedYear}_${dateTag}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported ${activeTabTitle} official audit report to PDF: ${fileName}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      showErrorToast('Failed to export PDF report.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const peso = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

            {/* GROUP 1: ACTIONS (Responsive) */}
            <div className="w-full lg:w-[210px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
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
                    placeholder={`Search ${activeTabTitle} (code, title, details)...`}
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

                  {/* Contextual 3rd Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    {activeTab === 'products-catalog' ? (
                      <>
                        <Tag className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                          title="Filter by Category"
                        >
                          <option value="All">All Categories</option>
                          {uniqueCategories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </>
                    ) : activeTab === 'products-vouchers' ? (
                      <>
                        <User className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                        <select
                          value={selectedAudience}
                          onChange={(e) => setSelectedAudience(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                          title="Filter by Target Audience"
                        >
                          <option value="All">All Audiences</option>
                          <option value="VIP">VIP Customers</option>
                          <option value="Regular">Regular Shoppers</option>
                          <option value="New">New Shoppers</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <Star className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                        <select
                          value={selectedRating}
                          onChange={(e) => setSelectedRating(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                          title="Filter by Rating"
                        >
                          <option value="All">All Ratings</option>
                          <option value="5">5 Stars</option>
                          <option value="4">4 Stars</option>
                          <option value="3">3 Stars</option>
                          <option value="low">Critical (≤ 3★)</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>

                {/* Layer 3: Contextual Quick Filter Toggles & Sort (Equal 3 Columns) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {activeTab === 'products-catalog' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setHideZeroQty(!hideZeroQty);
                          if (!hideZeroQty) setShowZeroOnly(false);
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${hideZeroQty
                          ? 'bg-emerald-50 text-[#01390f] border border-emerald-300 shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        title="Hide 0 Quantity Items"
                      >
                        <span>Hide 0 Qty</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOnSaleOnly(!onSaleOnly)}
                        className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${onSaleOnly
                          ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        title="On Sale / Promo Items Only"
                      >
                        <span>On Sale Only</span>
                      </button>

                      <div className="relative inline-flex items-center w-full min-w-0">
                        <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                          title="Sort Items"
                        >
                          <option value="default">Sort: Default</option>
                          <option value="name_asc">Name (A → Z)</option>
                          <option value="price_low">Price (Low → High)</option>
                          <option value="price_high">Price (High → Low)</option>
                          <option value="qty_desc">Qty (High → Low)</option>
                        </select>
                      </div>
                    </>
                  ) : activeTab === 'products-vouchers' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setActiveOnlyCoupons(!activeOnlyCoupons)}
                        className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${activeOnlyCoupons
                          ? 'bg-emerald-50 text-[#01390f] border border-emerald-300 shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        title="Show Active / Usable Coupons Only"
                      >
                        <span>Active Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedAudience(selectedAudience === 'VIP' ? 'All' : 'VIP')}
                        className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${selectedAudience === 'VIP'
                          ? 'bg-emerald-50 text-[#01390f] border border-emerald-300 shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        title="VIP Exclusive Coupons"
                      >
                        <span>VIP Only</span>
                      </button>

                      <div className="relative inline-flex items-center w-full min-w-0">
                        <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                          title="Sort Vouchers"
                        >
                          <option value="default">Sort: Default</option>
                          <option value="name_asc">Code (A → Z)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setFiveStarOnly(!fiveStarOnly);
                          if (!fiveStarOnly) setCriticalOnly(false);
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${fiveStarOnly
                          ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        title="Show 5-Star Reviews Only"
                      >
                        <span>5 Stars Only</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCriticalOnly(!criticalOnly);
                          if (!criticalOnly) setFiveStarOnly(false);
                        }}
                        className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[22px] w-full ${criticalOnly
                          ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs font-bold'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        title="Show Reviews Needing Attention"
                      >
                        <span>Critical (≤ 3★)</span>
                      </button>

                      <div className="relative inline-flex items-center w-full min-w-0">
                        <ArrowUpDown className="w-3.5 h-3.5 absolute left-1.5 text-slate-500 pointer-events-none" />
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded pl-6 pr-5 py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[22px] cursor-pointer truncate"
                          title="Sort Feedback"
                        >
                          <option value="default">Sort: Default</option>
                          <option value="newest">Newest First</option>
                          <option value="highest">Highest Rating</option>
                          <option value="lowest">Lowest Rating</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
                Search & Filter
              </div>
            </div>

          </div>

        </div>

        {/* HR DIVIDER BEFORE TABLE (MATCHES INVENTORY REPORTS EXACTLY) */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* TABLE MASTERLIST CONTAINER */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
          {/* TABLE PAGINATION */}
          <TablePagination
            currentPage={currentPage}
            totalItems={currentDataset.length}
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
                  {activeTab === 'products-catalog' ? (
                    <>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white min-w-[200px]">ITEM PROFILE</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">IMAGE</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CODE</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">CATEGORY</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-white">STORE PRICE</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">QUANTITY</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">UOM</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STATUS</th>
                    </>
                  ) : activeTab === 'products-vouchers' ? (
                    <>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">VOUCHER CODE</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">DISCOUNT RATE</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-semibold text-white">MINIMUM SPEND</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">TARGET AUDIENCE</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">EXPIRY DATE</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">STATUS</th>
                    </>
                  ) : (
                    <>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white min-w-[200px]">CUSTOMER</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">PRODUCT REVIEWED</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">RATING</th>
                      <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white min-w-[280px]">FEEDBACK COMMENT</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">DATE SUBMITTED</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700 text-xs">
                {loading ? (
                  <tr>
                    <td
                      colSpan={activeTab === 'products-catalog' ? 8 : activeTab === 'products-vouchers' ? 6 : 5}
                      className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading {activeTabTitle.toLowerCase()} data...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === 'products-catalog' ? 8 : activeTab === 'products-vouchers' ? 6 : 5}
                      className="text-center py-14 text-slate-500 font-medium italic text-xs"
                    >
                      No records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, idx) => {
                    if (activeTab === 'products-catalog') {
                      const count = Number(row.quantity ?? 0);
                      const isDepleted = count === 0;

                      return (
                        <tr
                          key={row._id || idx}
                          className={`transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm ${isDepleted ? 'bg-red-50/40' : ''
                            }`}
                        >
                          {/* 1. Item Profile */}
                          <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <div className="flex flex-col min-w-0 max-w-[280px]">
                              <span
                                className="font-bold text-xs truncate text-slate-800"
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

                          {/* 2. Image (Interactive Thumbnail) */}
                          <td className="py-2.5 px-4 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <div className="flex justify-center items-center">
                              <button
                                type="button"
                                onClick={() => setSelectedImageItem(row)}
                                className="relative group/img cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-[#01390f] focus:outline-none focus:ring-2 focus:ring-[#01390f]/30 shadow-2xs transition-all hover:scale-105 active:scale-95 bg-slate-50"
                                title="Click to preview product image"
                              >
                                <img
                                  src={resolveItemImageUrl((row.images && row.images[0]) || row.image)}
                                  alt={row.itemName || row.itemDescription || 'Product'}
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
                          <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                              {row.category || 'Standard'}
                            </span>
                          </td>

                          {/* 5. Store Price */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            ₱{peso(row.price || 0)}
                          </td>

                          {/* 6. Quantity (Blue subtle background, no pill container) */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                            {count.toLocaleString()}
                          </td>

                          {/* 7. UOM */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {row.uom || 'PCS'}
                          </td>

                          {/* 8. Status (Full-cell color tint: Green for Live, Amber for Draft) */}
                          <td
                            className={`px-4 py-3.5 whitespace-nowrap text-center text-slate-800 font-semibold text-xs transition-colors select-none ${row.isPublished
                              ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 group-hover:bg-amber-500/30'
                              }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${row.isPublished ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                                  }`}
                              />
                              <span>{row.isPublished ? 'Live' : 'Draft'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (activeTab === 'products-vouchers') {
                      const isExpired = checkIsCouponExpired(row.expiry || row.validUntil);

                      return (
                        <tr
                          key={row._id || idx}
                          className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 whitespace-nowrap text-xs sm:text-sm font-medium"
                        >
                          {/* 1. Code */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono font-bold text-xs text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {row.code || 'N/A'}
                          </td>

                          {/* 2. Discount Rate (Matches Blue Theme) */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                            {row.discount || '10% OFF'}
                          </td>

                          {/* 3. Min Spend */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {row.minSpend ? `₱${peso(row.minSpend)}` : 'None'}
                          </td>

                          {/* 4. Target Audience */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {row.targetSegment || row.target || 'All Customers'}
                          </td>

                          {/* 5. Expiry Date */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {row.expiry || row.validUntil
                              ? new Date(row.expiry || row.validUntil).toLocaleDateString()
                              : 'No Expiry'}
                          </td>

                          {/* 6. Status (Active = Green / Expired = Amber) */}
                          <td
                            className={`px-4 py-3.5 whitespace-nowrap text-center text-slate-800 font-semibold text-xs transition-colors select-none ${!isExpired
                              ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                              : 'bg-amber-500/20 group-hover:bg-amber-500/30'
                              }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${!isExpired ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                                  }`}
                              />
                              <span>{!isExpired ? 'Active / Usable' : 'Expired'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    // Customer Feedback
                    const r = Number(row.rating) || 5;
                    return (
                      <tr
                        key={row._id || idx}
                        className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                      >
                        {/* 1. Customer */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#01390f] font-bold text-xs shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-800 text-xs truncate">
                                {row.userName || row.customerName || 'Verified Buyer'}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Verified Purchase
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Product */}
                        <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 truncate max-w-[220px]">
                            {row.productName || 'Commercial Product'}
                          </span>
                        </td>

                        {/* 3. Rating (Blue Accent Column) */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{Number(r || 0).toFixed(1)}</span>
                          </div>
                        </td>

                        {/* 4. Comment */}
                        <td className="px-4 py-3.5 text-slate-600 whitespace-normal max-w-sm bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <p className="line-clamp-2 text-xs leading-relaxed">
                            {row.comment || 'No written comment provided.'}
                          </p>
                        </td>

                        {/* 5. Date */}
                        <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-600 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          {row.createdAt || row.date ? new Date(row.createdAt || row.date).toLocaleDateString() : '—'}
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

      {/* Image Preview Modal */}
      {selectedImageItem && (
        <ItemImageModal
          isOpen={Boolean(selectedImageItem)}
          onClose={() => setSelectedImageItem(null)}
          item={selectedImageItem}
        />
      )}
    </div>
  );
}

export default MarketingReports;
