import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Package,
  Save,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Tag,
  Clock,
  X,
  Loader2,
  Info,
  Check
} from 'lucide-react';
import axios from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

const API_BASE_URL =
  import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com'
    : 'http://localhost:5000';

export default function LogisticsShippingSetting() {
  // Navigation / View Tabs matching Product Catalog layout
  const [selectedTab, setSelectedTab] = useState('products'); // 'products' | 'regions' | 'overrides' | 'promo' | 'simulator'
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProducts, setSavingProducts] = useState(false);

  // Pagination for Products Table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [shippingFilter, setShippingFilter] = useState('All'); // 'All' | 'custom' | 'free' | 'default'
  const [sortBy, setSortBy] = useState('newest');
  const [freeOnlyToggle, setFreeOnlyToggle] = useState(false);
  const [customFeeOnlyToggle, setCustomFeeOnlyToggle] = useState(false);

  // Global Settings State
  const [settings, setSettings] = useState({
    defaultRate: 115,
    freeShippingEnabled: true,
    freeShippingThreshold: 1500,
    regions: [
      { key: 'ncr', name: 'Metro Manila (NCR)', rate: 65, estimatedDays: '1-3 Business Days', description: 'Manila, Quezon City, Makati, Taguig, Pasig, Mandaluyong, and all NCR cities', isActive: true },
      { key: 'luzon', name: 'Luzon (North & South)', rate: 85, estimatedDays: '2-4 Business Days', description: 'Laguna, Cavite, Batangas, Rizal, Bulacan, Pampanga, Central & Northern Luzon', isActive: true },
      { key: 'visayas', name: 'Visayas', rate: 135, estimatedDays: '4-7 Business Days', description: 'Cebu, Iloilo, Bohol, Negros, Leyte, Samar, and Western/Central/Eastern Visayas', isActive: true },
      { key: 'mindanao', name: 'Mindanao', rate: 155, estimatedDays: '5-8 Business Days', description: 'Davao, Cagayan de Oro, General Santos, Zamboanga, Bukidnon, and Mindanao provinces', isActive: true },
      { key: 'islands', name: 'Island & Remote Areas', rate: 180, estimatedDays: '7-10 Business Days', description: 'Palawan, Batanes, Catanduanes, Romblon, Dinagat, and remote island archipelagos', isActive: true },
    ],
    customOverrides: [
      { locationName: 'Laguna', rate: 50, estimatedDays: '1-2 Business Days', notes: 'Near Laguna Manufacturing Plant / Hub', isActive: true },
      { locationName: 'Calamba City', rate: 45, estimatedDays: 'Same-Day / Next-Day', notes: 'Local City Express Dropoff', isActive: true },
    ],
  });

  // Products State
  const [products, setProducts] = useState([]);
  const [modifiedProducts, setModifiedProducts] = useState({});

  // Add Custom Location Override Modal
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [newOverride, setNewOverride] = useState({
    locationName: '',
    rate: 60,
    estimatedDays: '1-3 Business Days',
    notes: '',
  });

  // Simulator State
  const [simAddress, setSimAddress] = useState('Calamba City, Laguna');
  const [simSubtotal, setSimSubtotal] = useState(750);
  const [simResult, setSimResult] = useState(null);
  const [calculatingSim, setCalculatingSim] = useState(false);

  // Load Initial Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, productsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/shipping-rates`),
        axios.get(`${API_BASE_URL}/api/shipping-rates/products`),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.settings) {
        setSettings(settingsRes.value.data.settings);
      }

      if (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value.data?.products)) {
        setProducts(productsRes.value.data.products);
      }
    } catch (err) {
      console.error('Error fetching shipping data:', err);
      showErrorToast('Failed to load current shipping configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Unique Categories from Products
  const uniqueCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [products]);

  // Tab Definitions matching the Excel sheet tabs design
  const tabs = [
    { id: 'products', label: 'Product Shipping Fees Matrix', count: products.length },
    { id: 'regions', label: 'Regional Delivery Rates', count: settings.regions?.length || 5 },
    { id: 'overrides', label: 'Special Location Overrides', count: settings.customOverrides?.length || 0 },
    { id: 'promo', label: 'Free Delivery & Fallbacks' },
    { id: 'simulator', label: 'Rate Simulator & Tester' },
  ];

  // Region Handlers
  const handleRegionChange = (index, field, value) => {
    setSettings((prev) => {
      const nextRegions = [...prev.regions];
      nextRegions[index] = {
        ...nextRegions[index],
        [field]: field === 'rate' ? Math.max(0, Number(value) || 0) : value,
      };
      return { ...prev, regions: nextRegions };
    });
  };

  // Override Handlers
  const handleRemoveOverride = (index) => {
    setSettings((prev) => ({
      ...prev,
      customOverrides: prev.customOverrides.filter((_, i) => i !== index),
    }));
  };

  const handleAddOverride = (e) => {
    e.preventDefault();
    if (!newOverride.locationName.trim()) {
      showErrorToast('Please enter a province or city name.');
      return;
    }

    setSettings((prev) => ({
      ...prev,
      customOverrides: [
        ...prev.customOverrides,
        {
          locationName: newOverride.locationName.trim(),
          rate: Math.max(0, Number(newOverride.rate) || 0),
          estimatedDays: newOverride.estimatedDays.trim() || '1-3 Business Days',
          notes: newOverride.notes.trim(),
          isActive: true,
        },
      ],
    }));

    setNewOverride({
      locationName: '',
      rate: 60,
      estimatedDays: '1-3 Business Days',
      notes: '',
    });
    setShowOverrideModal(false);
    showSuccessToast('Custom location override added.');
  };

  // Save Settings to Backend
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await axios.put(`${API_BASE_URL}/api/shipping-rates`, settings);
      if (res.data?.success) {
        showSuccessToast('Shipping configurations saved successfully! 🎉');
        if (res.data.settings) setSettings(res.data.settings);
      } else {
        showErrorToast(res.data?.message || 'Could not save settings.');
      }
    } catch (err) {
      console.error('Save shipping settings error:', err);
      showErrorToast('Error saving shipping settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Product Shipping Changes
  const handleProductShippingChange = (prodId, field, val) => {
    const originalProd = products.find((p) => p._id === prodId);
    if (!originalProd) return;

    setModifiedProducts((prev) => {
      const existing = prev[prodId] || {
        shippingFee: originalProd.shippingFee || 0,
        isFreeShipping: originalProd.isFreeShipping || false,
      };

      return {
        ...prev,
        [prodId]: {
          ...existing,
          [field]: field === 'shippingFee' ? Math.max(0, Number(val) || 0) : val,
        },
      };
    });
  };

  // Save All Modified Products
  const handleSaveProducts = async () => {
    const updates = Object.entries(modifiedProducts).map(([id, data]) => ({
      _id: id,
      shippingFee: data.shippingFee,
      isFreeShipping: data.isFreeShipping,
    }));

    if (updates.length === 0) {
      showErrorToast('No product shipping changes to save.');
      return;
    }

    try {
      setSavingProducts(true);
      const res = await axios.put(`${API_BASE_URL}/api/shipping-rates/products/bulk`, { updates });
      if (res.data?.success) {
        showSuccessToast(`Updated shipping fees for ${updates.length} products! 🚀`);
        setProducts((prev) =>
          prev.map((p) => {
            if (modifiedProducts[p._id]) {
              return {
                ...p,
                shippingFee: modifiedProducts[p._id].shippingFee,
                isFreeShipping: modifiedProducts[p._id].isFreeShipping,
              };
            }
            return p;
          })
        );
        setModifiedProducts({});
      }
    } catch (err) {
      console.error('Error saving product shipping fees:', err);
      showErrorToast('Failed to save product shipping changes.');
    } finally {
      setSavingProducts(false);
    }
  };

  // Single Product Save
  const handleSaveSingleProduct = async (prodId) => {
    const data = modifiedProducts[prodId];
    if (!data) return;

    try {
      const res = await axios.put(`${API_BASE_URL}/api/shipping-rates/products/${prodId}`, data);
      if (res.data?.success) {
        showSuccessToast('Product shipping fee saved! 🚚');
        setProducts((prev) =>
          prev.map((p) => (p._id === prodId ? { ...p, ...data } : p))
        );
        setModifiedProducts((prev) => {
          const next = { ...prev };
          delete next[prodId];
          return next;
        });
      }
    } catch (err) {
      console.error('Single product update error:', err);
      showErrorToast('Failed to update product fee.');
    }
  };

  // Reset Filters
  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setShippingFilter('All');
    setSortBy('newest');
    setFreeOnlyToggle(false);
    setCustomFeeOnlyToggle(false);
    setCurrentPage(1);
    showSuccessToast('Filters reset to default.');
  };

  // Run Simulator
  const handleRunSimulator = async () => {
    try {
      setCalculatingSim(true);
      const res = await axios.post(`${API_BASE_URL}/api/shipping-rates/calculate`, {
        address: simAddress,
        subtotal: Number(simSubtotal) || 0,
      });

      if (res.data?.success) {
        setSimResult(res.data);
      }
    } catch (err) {
      console.error('Simulation error:', err);
      showErrorToast('Failed to calculate shipping fee.');
    } finally {
      setCalculatingSim(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'simulator') {
      handleRunSimulator();
    }
  }, [selectedTab]);

  // Filter & Sort Logic for Products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.itemDescription || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q);

      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;

      const currentFee = modifiedProducts[p._id]?.shippingFee ?? p.shippingFee ?? 0;
      const currentFree = modifiedProducts[p._id]?.isFreeShipping ?? p.isFreeShipping ?? false;

      let matchFilter = true;
      if (shippingFilter === 'custom' || customFeeOnlyToggle) matchFilter = currentFee > 0;
      else if (shippingFilter === 'free' || freeOnlyToggle) matchFilter = currentFree;
      else if (shippingFilter === 'default') matchFilter = currentFee === 0 && !currentFree;

      return matchSearch && matchCat && matchFilter;
    });

    if (sortBy === 'price-low') {
      result.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === 'fee-low') {
      result.sort((a, b) => {
        const feeA = modifiedProducts[a._id]?.shippingFee ?? a.shippingFee ?? 0;
        const feeB = modifiedProducts[b._id]?.shippingFee ?? b.shippingFee ?? 0;
        return feeA - feeB;
      });
    } else if (sortBy === 'fee-high') {
      result.sort((a, b) => {
        const feeA = modifiedProducts[a._id]?.shippingFee ?? a.shippingFee ?? 0;
        const feeB = modifiedProducts[b._id]?.shippingFee ?? b.shippingFee ?? 0;
        return feeB - feeA;
      });
    } else if (sortBy === 'name-asc') {
      result.sort((a, b) => (a.itemDescription || '').localeCompare(b.itemDescription || ''));
    }

    return result;
  }, [
    products,
    searchQuery,
    selectedCategory,
    shippingFilter,
    sortBy,
    freeOnlyToggle,
    customFeeOnlyToggle,
    modifiedProducts,
  ]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const modifiedCount = Object.keys(modifiedProducts).length;

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      {/* MAIN CONTAINER (EXACT MATCH WITH PRODUCTS CATALOG LAYOUT & BRAND COLOR SCHEME) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">
        
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 ${
                  selectedTab === tab.id
                    ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      selectedTab === tab.id
                        ? 'bg-[#01390f] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.id === 'products' && modifiedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500 text-white animate-pulse">
                    {modifiedCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR (EXACT MATCH WITH PRODUCTS CATALOG STRUCTURE) */}
        <div className="py-2.5 bg-white flex items-stretch gap-2.5 overflow-x-auto flex-nowrap">
          {/* ACTIONS GROUP */}
          <div className="w-[226px] shrink-0 flex flex-col justify-between border-r border-slate-200 pr-2.5 min-h-[92px]">
            <div className="flex items-stretch gap-1.5 flex-1">
              {/* PRIMARY ACTION BUTTON */}
              {selectedTab === 'products' ? (
                <button
                  type="button"
                  onClick={handleSaveProducts}
                  disabled={savingProducts || modifiedCount === 0}
                  className={`w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md transition-colors cursor-pointer group text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed ${
                    modifiedCount > 0 ? 'bg-amber-50 hover:bg-amber-100 text-amber-900' : 'hover:bg-slate-100'
                  }`}
                  title="Save Modified Product Shipping Fees"
                >
                  {savingProducts ? (
                    <Loader2 className="w-5 h-5 mb-0.5 text-[#01390f] animate-spin" />
                  ) : (
                    <Save className={`w-5 h-5 mb-0.5 ${modifiedCount > 0 ? 'text-amber-600' : 'text-[#01390f]'} group-hover:scale-110 transition-transform`} />
                  )}
                  <span className="text-[11px] font-bold text-center leading-tight">
                    {savingProducts ? 'Saving...' : modifiedCount > 0 ? `Save (${modifiedCount})` : 'Save Fees'}
                  </span>
                </button>
              ) : selectedTab === 'overrides' ? (
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(true)}
                  className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Add Special Location Override"
                >
                  <Plus className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] font-bold text-center leading-tight">Add Override</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-[76px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Save Shipping Settings"
                >
                  {savingSettings ? (
                    <Loader2 className="w-5 h-5 mb-0.5 text-[#01390f] animate-spin" />
                  ) : (
                    <Save className="w-5 h-5 mb-0.5 text-[#01390f] group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[11px] font-bold text-center leading-tight">
                    {savingSettings ? 'Saving...' : 'Save Rates'}
                  </span>
                </button>
              )}

              {/* VERTICAL QUICK ACTIONS STACK (3 ROWS) */}
              <div className="flex-1 min-w-[135px] flex flex-col justify-between py-0.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(true)}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                  title="Add Location Override"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">Add Location</span>
                </button>

                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 hover:text-[#01390f] hover:bg-slate-100 transition-colors cursor-pointer w-full"
                  title="Refresh Current Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span className="truncate">Refresh Data</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="h-[22px] flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer w-full"
                  title="Reset Search and Filters"
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
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search item code, description, category, or location..."
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
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
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

                {/* Shipping Type Filter */}
                <div className="relative w-full">
                  <Truck className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={shippingFilter}
                    onChange={(e) => {
                      setShippingFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate"
                  >
                    <option value="All">All Shipping Modes</option>
                    <option value="free">🎁 Free Shipping Only</option>
                    <option value="custom">⚡ Custom Product Fee</option>
                    <option value="default">Standard Region Fee</option>
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
                    <option value="price-low">Sort: Store Price Low to High</option>
                    <option value="price-high">Sort: Store Price High to Low</option>
                    <option value="fee-low">Sort: Shipping Fee Low to High</option>
                    <option value="fee-high">Sort: Shipping Fee High to Low</option>
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
                    const next = !freeOnlyToggle;
                    setFreeOnlyToggle(next);
                    if (next) setCustomFeeOnlyToggle(false);
                    setCurrentPage(1);
                  }}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    freeOnlyToggle
                      ? 'bg-emerald-50 border-[#01390f] text-[#01390f] font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  🎁 Free Shipping Only
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = !customFeeOnlyToggle;
                    setCustomFeeOnlyToggle(next);
                    if (next) setFreeOnlyToggle(false);
                    setCurrentPage(1);
                  }}
                  className={`h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors ${
                    customFeeOnlyToggle
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ⚡ Custom Fee Only
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTab('simulator');
                  }}
                  className="h-[22px] text-xs px-2 rounded border border-amber-300 bg-amber-50 text-amber-800 font-medium flex items-center justify-center cursor-pointer hover:bg-amber-100 transition-colors"
                >
                  <Sparkles className="w-3 h-3 mr-1 text-amber-600" />
                  <span>Test Live Rate</span>
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

        {/* ================= VIEW 1: PRODUCTS SHIPPING FEE MATRIX ================= */}
        {selectedTab === 'products' && (
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
              <div className="flex flex-col justify-center items-center min-h-[360px] text-slate-400 gap-3">
                <Loader2 className="w-9 h-9 animate-spin text-[#01390f]" />
                <span className="font-medium text-xs">Fetching product shipping matrix...</span>
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
                      <th className="py-3.5 px-4 text-center">Free Shipping</th>
                      <th className="py-3.5 px-4 text-right w-44">Shipping Fee (₱)</th>
                      <th className="py-3.5 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700 text-xs">
                    {paginatedProducts.map((row) => {
                      const mod = modifiedProducts[row._id];
                      const isModified = Boolean(mod);
                      const currentFee = mod ? mod.shippingFee : row.shippingFee || 0;
                      const currentFree = mod ? mod.isFreeShipping : row.isFreeShipping || false;

                      const img =
                        row.image ||
                        (Array.isArray(row.images) && row.images[0]) ||
                        '/mhira_removebg.png';

                      return (
                        <tr
                          key={row._id}
                          className={`transition-colors whitespace-nowrap group ${
                            isModified ? 'bg-amber-50/60' : 'hover:bg-slate-50/80'
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
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                Qty: {row.quantity ?? 0} {row.uom || 'pcs'}
                              </span>
                            </div>
                          </td>

                          {/* Image */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="w-9 h-9 rounded-md border border-slate-200 bg-white p-0.5 inline-flex items-center justify-center overflow-hidden">
                              <img
                                src={img}
                                alt={row.itemDescription}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.target.src = '/mhira_removebg.png';
                                }}
                              />
                            </div>
                          </td>

                          {/* Code */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-xs font-medium text-slate-600">
                            {row.code || '—'}
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3 whitespace-nowrap font-medium text-xs">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200">
                              {row.category || 'Standard'}
                            </span>
                          </td>

                          {/* Store Price */}
                          <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs font-bold text-slate-800">
                            ₱{Number(row.price || 0).toFixed(2)}
                          </td>

                          {/* Free Shipping Toggle */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleProductShippingChange(
                                  row._id,
                                  'isFreeShipping',
                                  !currentFree
                                )
                              }
                              className={`text-xs font-semibold px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                                currentFree
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {currentFree ? '🎁 Free Shipping' : 'Standard'}
                            </button>
                          </td>

                          {/* Delivery Fee Input */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="relative inline-flex items-center w-full max-w-[120px]">
                              <span className="absolute left-2.5 text-slate-400 font-mono font-bold text-xs">
                                ₱
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="5"
                                disabled={currentFree}
                                value={currentFee}
                                onChange={(e) =>
                                  handleProductShippingChange(
                                    row._id,
                                    'shippingFee',
                                    e.target.value
                                  )
                                }
                                placeholder="0.00"
                                className={`w-full pl-7 pr-3 py-1.5 rounded-lg border text-right font-mono font-bold text-xs focus:outline-hidden ${
                                  currentFree
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                                    : currentFee > 0
                                    ? 'bg-blue-50 border-blue-300 text-blue-900 focus:border-blue-600'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-[#01390f]'
                                }`}
                              />
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            {isModified ? (
                              <button
                                type="button"
                                onClick={() => handleSaveSingleProduct(row._id)}
                                className="px-3 py-1 bg-[#01390f] hover:bg-[#022b0c] text-white text-xs font-bold rounded shadow-2xs transition-all active:scale-95 cursor-pointer"
                              >
                                Save
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-medium">
                                Synced
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center min-h-[300px] text-slate-400 gap-2">
                <Package className="w-8 h-8 text-slate-300" />
                <span className="font-medium text-xs">No products matched the filter.</span>
              </div>
            )}
          </div>
        )}

        {/* ================= VIEW 2: REGIONAL DELIVERY ZONES ================= */}
        {selectedTab === 'regions' && (
          <div className="space-y-4">
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Philippine Island & Regional Rates Matrix
                </span>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-3 py-1.5 rounded-lg bg-[#01390f] hover:bg-[#022b0c] text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingSettings ? 'Saving...' : 'Save Regional Rates'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="font-bold uppercase text-[11px] tracking-wider whitespace-nowrap bg-[#01390f] text-white">
                      <th className="py-3.5 px-4 w-[240px]">Zone / Island Group</th>
                      <th className="py-3.5 px-4">Coverage Scope & Cities</th>
                      <th className="py-3.5 px-4 w-44">Estimated Days</th>
                      <th className="py-3.5 px-4 text-right w-44">Shipping Fee (₱)</th>
                      <th className="py-3.5 px-4 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700 text-xs">
                    {settings.regions?.map((reg, idx) => (
                      <tr key={reg.key} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-900 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                            <span>{reg.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={reg.description || ''}
                            onChange={(e) => handleRegionChange(idx, 'description', e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs text-slate-700 focus:border-[#01390f] focus:outline-hidden"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={reg.estimatedDays || ''}
                              onChange={(e) => handleRegionChange(idx, 'estimatedDays', e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-xs text-slate-700 focus:border-[#01390f] focus:outline-hidden"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="relative inline-flex items-center w-full max-w-[130px]">
                            <span className="absolute left-2.5 text-slate-400 font-mono font-bold text-xs">
                              ₱
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="5"
                              value={reg.rate}
                              onChange={(e) => handleRegionChange(idx, 'rate', e.target.value)}
                              className="w-full pl-7 pr-3 py-1 rounded border border-slate-300 bg-white text-right font-mono font-bold text-xs text-slate-900 focus:border-[#01390f] focus:outline-hidden"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRegionChange(idx, 'isActive', !reg.isActive)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border cursor-pointer transition-colors ${
                              reg.isActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {reg.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 3: SPECIAL LOCATION OVERRIDES ================= */}
        {selectedTab === 'overrides' && (
          <div className="space-y-4">
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Province & City Custom Overrides
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Special rate rules for proximity to Laguna plant or high-density client hubs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#01390f] hover:bg-[#022b0c] text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Location Override</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                {settings.customOverrides?.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    No custom overrides configured. Regional rates are applied by default.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="font-bold uppercase text-[11px] tracking-wider whitespace-nowrap bg-[#01390f] text-white">
                        <th className="py-3.5 px-4 w-[240px]">Province / City Name</th>
                        <th className="py-3.5 px-4">Coverage Description / Notes</th>
                        <th className="py-3.5 px-4 w-44">Estimated Days</th>
                        <th className="py-3.5 px-4 text-right w-44">Special Delivery Fee (₱)</th>
                        <th className="py-3.5 px-4 text-center w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700 text-xs">
                      {settings.customOverrides?.map((ov, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            {ov.locationName}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {ov.notes || '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-600">
                            {ov.estimatedDays || '1-3 Business Days'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                            ₱{Number(ov.rate || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveOverride(idx)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Delete Override"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 4: PROMOTIONS & FALLBACKS ================= */}
        {selectedTab === 'promo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Free Shipping Minimum Spend Promo
                </span>
                <input
                  type="checkbox"
                  checked={settings.freeShippingEnabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      freeShippingEnabled: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-[#01390f] rounded cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Kapag umabot sa minimum order spend ang subtotal ng customer sa bag, awtomatikong magiging ₱0.00 ang shipping fee sa checkout.
              </p>
              <div className="relative pt-1">
                <span className="absolute left-3 top-3 text-slate-400 font-mono font-bold text-xs">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  disabled={!settings.freeShippingEnabled}
                  value={settings.freeShippingThreshold}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      freeShippingThreshold: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-800 focus:border-[#01390f] focus:outline-hidden disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="bg-white border-slate-200 rounded-xl border shadow-xs p-5 space-y-3">
              <span className="text-xs font-bold text-slate-900">
                Nationwide Standard Fallback Rate
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Gagamitin kung sakaling hindi matukoy o labas sa listahan ng mga lungsod ang address ng customer.
              </p>
              <div className="relative pt-1">
                <span className="absolute left-3 top-3 text-slate-400 font-mono font-bold text-xs">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={settings.defaultRate}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultRate: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-800 focus:border-[#01390f] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>{savingSettings ? 'Saving...' : 'Save Promotional & Fallback Settings'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= VIEW 5: RATE SIMULATOR & TESTER ================= */}
        {selectedTab === 'simulator' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs p-5 space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-[#01390f]" />
                <span>Customer Address Tester</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivery Address String
                </label>
                <textarea
                  rows={2}
                  value={simAddress}
                  onChange={(e) => setSimAddress(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:border-[#01390f] focus:outline-hidden"
                  placeholder="e.g. Block 25 Lot 1, Brgy. Uwisan, Calamba City, Laguna"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[11px] text-slate-400">Examples:</span>
                  {['Calamba City, Laguna', 'Quezon City, Metro Manila', 'Cebu City, Visayas', 'Davao City, Mindanao', 'Puerto Princesa, Palawan'].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setSimAddress(city)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] cursor-pointer"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cart Subtotal (₱)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono font-bold text-xs">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={simSubtotal}
                    onChange={(e) => setSimSubtotal(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-xs text-slate-800 focus:border-[#01390f] focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunSimulator}
                disabled={calculatingSim}
                className="w-full py-2.5 sm:py-3 px-6 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{calculatingSim ? 'Calculating...' : 'Run Simulation'}</span>
              </button>
            </div>

            {/* Result Box */}
            <div className="bg-slate-50/80 border-slate-200 rounded-xl border shadow-xs p-5 space-y-3 text-xs">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Simulated Output & PayMongo Total
              </span>

              {simResult ? (
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Matched Zone / Region:</span>
                      <span className="font-bold text-slate-800">{simResult.matchedRegion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimated Transit:</span>
                      <span className="font-semibold text-slate-700">{simResult.estimatedDays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Free Shipping Qualified:</span>
                      <span className={`font-bold ${simResult.isFreeShipping ? 'text-emerald-700' : 'text-slate-600'}`}>
                        {simResult.isFreeShipping ? 'Yes (Promo)' : 'No'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-2 space-y-1.5">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold">₱{Number(simSubtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Fee:</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {simResult.shippingFee === 0 ? 'FREE' : `₱${simResult.shippingFee.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-[#01390f] pt-1 border-t border-slate-200">
                      <span>Total Amount:</span>
                      <span className="font-mono text-base">
                        ₱{(Number(simSubtotal) + Number(simResult.shippingFee)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  Click Run Simulation to preview shipping cost.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* MODAL: ADD SPECIAL LOCATION OVERRIDE */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-['Poppins',sans-serif]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#01390f]" />
                <span>Add Location Override</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOverride} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Province or City Name *
                </label>
                <input
                  type="text"
                  required
                  value={newOverride.locationName}
                  onChange={(e) =>
                    setNewOverride({ ...newOverride, locationName: e.target.value })
                  }
                  placeholder="e.g. Laguna, Cavite, or Cebu City"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#01390f] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Special Shipping Fee (₱) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  required
                  value={newOverride.rate}
                  onChange={(e) =>
                    setNewOverride({ ...newOverride, rate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold focus:border-[#01390f] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Estimated Delivery Days
                </label>
                <input
                  type="text"
                  value={newOverride.estimatedDays}
                  onChange={(e) =>
                    setNewOverride({ ...newOverride, estimatedDays: e.target.value })
                  }
                  placeholder="e.g. 1-2 Business Days"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#01390f] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Internal Notes
                </label>
                <input
                  type="text"
                  value={newOverride.notes}
                  onChange={(e) =>
                    setNewOverride({ ...newOverride, notes: e.target.value })
                  }
                  placeholder="e.g. Proximity to Laguna Plant Hub"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-[#01390f] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{savingSettings ? 'Saving...' : 'Save Override'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
