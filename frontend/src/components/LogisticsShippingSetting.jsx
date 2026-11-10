import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  RotateCcw,
  Info,
  Tag,
  MapPin,
  Activity,
  EyeOff,
  FileSpreadsheet,
  ArrowUpDown,
  Globe,
  Calculator,
  Clock,
  Truck,
  CheckCircle2,
  RefreshCw,
  Save,
  Navigation,
  Building2,
  Settings,
} from 'lucide-react';
import { notifyLiveSync } from '../utils/liveSync';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';
import {
  getMergedPhDirectory,
  addCustomPhLocation,
  TRANSIT_WINDOW_OPTIONS,
} from '../utils/phLocations';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const API_BASE_URL =
  !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com'
    : 'http://localhost:5000';

const DEFAULT_REGIONS = [
  {
    key: 'ncr',
    name: 'Metro Manila (NCR)',
    description:
      'Manila, Quezon City, Makati, Taguig, Pasig, Mandaluyong, Pasay, Parañaque, Las Piñas, Muntinlupa, Marikina, Valenzuela, Caloocan, Malabon, Navotas, San Juan, Pateros',
    rate: 65,
    estimatedDays: '1 - 2 Days',
    isActive: true,
  },
  {
    key: 'luzon',
    name: 'Luzon (North & South)',
    description:
      'Cavite, Laguna, Batangas, Rizal, Quezon, Bulacan, Pampanga, Tarlac, Nueva Ecija, Bataan, Zambales, Pangasinan, Baguio, Ilocos, Bicol, Cagayan Valley',
    rate: 85,
    estimatedDays: '2 - 4 Days',
    isActive: true,
  },
  {
    key: 'visayas',
    name: 'Visayas',
    description:
      'Cebu, Iloilo, Bacolod, Bohol, Leyte, Samar, Dumaguete, Roxas, Boracay, Kalibo, Ormoc, Tacloban',
    rate: 135,
    estimatedDays: '4 - 6 Days',
    isActive: true,
  },
  {
    key: 'mindanao',
    name: 'Mindanao',
    description:
      'Davao, Cagayan de Oro, Zamboanga, General Santos, Butuan, Iligan, Tagum, Cotabato, Surigao, Pagadian',
    rate: 155,
    estimatedDays: '5 - 8 Days',
    isActive: true,
  },
  {
    key: 'islands',
    name: 'Island & Remote Areas',
    description:
      'Palawan, Batanes, Siargao, Camiguin, Siquijor, Basilan, Sulu, Tawi-Tawi, Catanduanes, Marinduque, Romblon',
    rate: 180,
    estimatedDays: '7 - 12 Days',
    isActive: true,
  },
];

function LogisticsShippingSetting() {
  const [phDirectory, setPhDirectory] = useState(() => getMergedPhDirectory());

  const [settings, setSettings] = useState({
    defaultRate: 115,
    freeShippingThreshold: 1500,
    freeShippingEnabled: true,
    regions: DEFAULT_REGIONS,
    customOverrides: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Workbook Sheet Tabs: 'all' | 'regions' | 'overrides' | 'directory' | 'simulator'
  const [viewMode, setViewMode] = useState('all');

  // Filter & Search States (matching Finished Goods toolbar)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocationName, setSelectedLocationName] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [hideDisabled, setHideDisabled] = useState(false);
  const [sortBy, setSortBy] = useState('default');

  // Directory Filter States
  const [dirRegionFilter, setDirRegionFilter] = useState('All');
  const [dirProvinceFilter, setDirProvinceFilter] = useState('All');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Add / Edit Location Rate Modal States (Dropdown-driven!)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [locationForm, setLocationForm] = useState({
    rowType: 'override', // 'region' | 'override'
    scopeType: 'city', // 'city' | 'province'
    selectedRegionId: 'region4a',
    selectedProvince: 'Laguna',
    selectedCity: 'Calamba City',
    key: '',
    overrideIdx: null,
    name: 'Calamba City, Laguna',
    description: '',
    rate: 50,
    estimatedDays: '1 - 2 Days',
    isActive: true,
  });

  // Add New Custom Place to PH Directory Modal State
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const [newPlaceForm, setNewPlaceForm] = useState({
    regionId: 'region4a',
    province: 'Laguna',
    city: '',
  });

  // Live Rate Simulator Modal State (with Region -> Province -> City dropdowns!)
  const [isSimulatorModalOpen, setIsSimulatorModalOpen] = useState(false);
  const [simRegionId, setSimRegionId] = useState('region4a');
  const [simProvince, setSimProvince] = useState('Laguna');
  const [simCity, setSimCity] = useState('Calamba City');
  const [testAddress, setTestAddress] = useState('Calamba City, Laguna');
  const [testSubtotal, setTestSubtotal] = useState(850);
  const [simulatedResult, setSimulatedResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simQuickFee, setSimQuickFee] = useState(45);
  const [simQuickTransit, setSimQuickTransit] = useState('Same-Day / Next-Day');

  useEffect(() => {
    const syncDir = () => setPhDirectory(getMergedPhDirectory());
    window.addEventListener('ph_locations_updated', syncDir);
    return () => window.removeEventListener('ph_locations_updated', syncDir);
  }, []);

  const normalizeLoadedSettings = (raw) => {
    const src = raw?.settings || raw || {};
    const normRegions =
      Array.isArray(src.regions) && src.regions.length > 0
        ? src.regions.map((r) => ({
          key: r.key === 'island' ? 'islands' : r.key || r.id || 'luzon',
          name: r.name || 'Regional Zone',
          description: r.description || '',
          rate: Number(r.rate ?? r.fee ?? 0),
          estimatedDays: r.estimatedDays || '2 - 4 Days',
          isActive: r.isActive !== false,
        }))
        : DEFAULT_REGIONS;

    const normOverrides = Array.isArray(src.customOverrides)
      ? src.customOverrides.map((ov) => ({
        locationName: ov.locationName || ov.name || '',
        rate: Number(ov.rate ?? ov.fee ?? 0),
        estimatedDays: ov.estimatedDays || '1 - 3 Days',
        notes: ov.notes || ov.description || '',
        isActive: ov.isActive !== false,
      }))
      : [];

    return {
      defaultRate: Number(src.defaultRate ?? 115),
      freeShippingThreshold: Number(src.freeShippingThreshold ?? 1500),
      freeShippingEnabled: Boolean(src.freeShippingEnabled ?? true),
      regions: normRegions,
      customOverrides: normOverrides,
    };
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shipping-rates?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const loaded = normalizeLoadedSettings(data);
        setSettings(loaded);
      }
    } catch (error) {
      console.error('Failed to load shipping settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSettings = async (
    nextSettings,
    toastMsg = 'Shipping rates saved & synced to Cart, Checkout & PayMongo!'
  ) => {
    setSaving(true);
    try {
      const payload = {
        defaultRate: Number(nextSettings.defaultRate ?? 115),
        freeShippingEnabled: Boolean(nextSettings.freeShippingEnabled),
        freeShippingThreshold: Number(nextSettings.freeShippingThreshold ?? 1500),
        regions: (nextSettings.regions || []).map((r) => ({
          key: r.key === 'island' ? 'islands' : r.key || r.id || 'luzon',
          name: r.name,
          rate: Math.max(0, Number(r.rate ?? r.fee ?? 0)),
          estimatedDays: r.estimatedDays || '2 - 4 Days',
          description: r.description || '',
          isActive: r.isActive !== false,
        })),
        customOverrides: (nextSettings.customOverrides || []).map((ov) => ({
          locationName: String(ov.locationName || ov.name || '').trim(),
          rate: Math.max(0, Number(ov.rate ?? ov.fee ?? 0)),
          estimatedDays: ov.estimatedDays || '1 - 3 Days',
          notes: ov.notes || ov.description || '',
          isActive: ov.isActive !== false,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/api/shipping-rates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = normalizeLoadedSettings(data);
        setSettings(updated);
        showSuccessToast(toastMsg);
        notifyLiveSync('shipping');
        notifyLiveSync('logistics');
        runSimulator(testAddress, testSubtotal);
        return true;
      } else {
        showErrorToast(data.message || 'Failed to save shipping rates.');
        return false;
      }
    } catch {
      showErrorToast('Network error while saving shipping rates.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const runSimulator = async (addr = testAddress, sub = testSubtotal) => {
    setSimulating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/shipping-rates/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addr,
          subtotal: Number(sub || 0),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatedResult(data);
        setSimQuickFee(data.shippingFee ?? 0);
        setSimQuickTransit(data.estimatedDays || '1 - 2 Days');
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveFromSimulator = async () => {
    const fee = Math.max(0, Number(simQuickFee || 0));
    const locName = simCity || testAddress;

    let nextSettings = { ...settings };
    const existingIdx = (settings.customOverrides || []).findIndex(
      (ov) => ov.locationName.toLowerCase() === locName.toLowerCase()
    );

    const overrideEntry = {
      locationName: locName,
      rate: fee,
      estimatedDays: simQuickTransit || '1 - 2 Days',
      notes: `Configured via Checkout Simulator (${simProvince})`,
      isActive: true,
    };

    if (existingIdx >= 0) {
      nextSettings.customOverrides = settings.customOverrides.map((ov, i) =>
        i === existingIdx ? overrideEntry : ov
      );
    } else {
      nextSettings.customOverrides = [
        ...(settings.customOverrides || []),
        overrideEntry,
      ];
    }

    const ok = await persistSettings(
      nextSettings,
      `Saved shipping rate for "${locName}" (₱${fee.toFixed(2)}) & synced to PayMongo!`
    );
    if (ok) {
      await runSimulator(testAddress, testSubtotal);
    }
  };

  useEffect(() => {
    if (!loading) {
      runSimulator(testAddress, testSubtotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Unified Masterlist of all Location Shipping Rules
  const allRows = useMemo(() => {
    const regionRows = (settings.regions || []).map((region) => ({
      rowType: 'region',
      key: `region-${region.key}`,
      regionKey: region.key,
      code: `ZN-${String(region.key || 'REG').toUpperCase()}`,
      category: 'Regional Delivery Zone',
      name: region.name,
      description: region.description || '',
      rate: Number(region.rate ?? region.fee ?? 0),
      estimatedDays: region.estimatedDays || '2 - 4 Days',
      isActive: region.isActive !== false,
    }));

    const overrideRows = (settings.customOverrides || []).map((ov, idx) => ({
      rowType: 'override',
      key: `override-${idx}`,
      overrideIdx: idx,
      code: `LOC-${String(idx + 1).padStart(4, '0')}`,
      category: 'City / Province Override',
      name: ov.locationName,
      description:
        ov.notes || `Priority location rate for customer addresses matching "${ov.locationName}"`,
      rate: Number(ov.rate ?? ov.fee ?? 0),
      estimatedDays: ov.estimatedDays || '1 - 3 Days',
      isActive: ov.isActive !== false,
    }));

    return [...regionRows, ...overrideRows];
  }, [settings.regions, settings.customOverrides]);

  // Flattened Nationwide PH Directory Rows (for the PH Locations Directory tab)
  const directoryRows = useMemo(() => {
    const list = [];
    phDirectory.forEach((reg) => {
      (reg.provinces || []).forEach((prov) => {
        // Check if province has an override
        const provOverride = (settings.customOverrides || []).find(
          (o) =>
            o.isActive !== false &&
            o.locationName.toLowerCase() === prov.name.toLowerCase()
        );
        // Find base regional rate
        const baseReg = (settings.regions || []).find((r) =>
          r.name.toLowerCase().includes(reg.islandGroup.toLowerCase().split(' ')[0])
        );
        const defaultFee = Number(
          provOverride?.rate ?? baseReg?.rate ?? reg.defaultFee ?? settings.defaultRate
        );

        list.push({
          key: `dir-${reg.regionId}-${prov.name}`,
          code: reg.regionCode,
          regionId: reg.regionId,
          regionName: reg.regionName,
          islandGroup: reg.islandGroup,
          province: prov.name,
          cities: prov.cities || [],
          effectiveFee: defaultFee,
          hasCustomOverride: Boolean(provOverride),
          defaultTransit: provOverride?.estimatedDays || baseReg?.estimatedDays || reg.defaultTransit,
        });
      });
    });

    return list.filter((item) => {
      if (dirRegionFilter !== 'All' && item.regionId !== dirRegionFilter) return false;
      if (dirProvinceFilter !== 'All' && item.province !== dirProvinceFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchReg = item.regionName.toLowerCase().includes(q);
        const matchProv = item.province.toLowerCase().includes(q);
        const matchCity = item.cities.some((c) => c.toLowerCase().includes(q));
        if (!matchReg && !matchProv && !matchCity) return false;
      }
      return true;
    });
  }, [phDirectory, settings, dirRegionFilter, dirProvinceFilter, searchQuery]);

  const filterLocationNames = useMemo(() => {
    return Array.from(new Set(allRows.map((r) => r.name).filter(Boolean)));
  }, [allRows]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim() !== '') count++;
    if (selectedCategory !== 'All') count++;
    if (selectedLocationName !== 'All') count++;
    if (selectedCondition !== 'All') count++;
    if (hideDisabled) count++;
    if (sortBy !== 'default') count++;
    if (dirRegionFilter !== 'All') count++;
    if (dirProvinceFilter !== 'All') count++;
    return count;
  }, [
    searchQuery,
    selectedCategory,
    selectedLocationName,
    selectedCondition,
    hideDisabled,
    sortBy,
    dirRegionFilter,
    dirProvinceFilter,
  ]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedLocationName('All');
    setSelectedCondition('All');
    setHideDisabled(false);
    setSortBy('default');
    setDirRegionFilter('All');
    setDirProvinceFilter('All');
    setCurrentPage(1);
  };

  const filteredRows = useMemo(() => {
    return allRows
      .filter((row) => {
        if (
          selectedCategory !== 'All' &&
          selectedCategory !== 'all_provinces' &&
          row.category !== selectedCategory
        ) {
          return false;
        }
        if (selectedLocationName !== 'All' && row.name !== selectedLocationName) {
          return false;
        }
        if (selectedCondition === 'Active Rate' && !row.isActive) return false;
        if (selectedCondition === 'Disabled Rate' && row.isActive) return false;
        if (hideDisabled && !row.isActive) return false;

        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchCode = row.code.toLowerCase().includes(q);
          const matchName = row.name.toLowerCase().includes(q);
          const matchDesc = row.description.toLowerCase().includes(q);
          const matchCat = row.category.toLowerCase().includes(q);
          if (!matchCode && !matchName && !matchDesc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        if (sortBy === 'fee_desc') return b.rate - a.rate;
        if (sortBy === 'fee_asc') return a.rate - b.rate;
        if (sortBy === 'code_asc') return a.code.localeCompare(b.code);
        return 0;
      });
  }, [
    allRows,
    selectedCategory,
    selectedLocationName,
    selectedCondition,
    hideDisabled,
    searchQuery,
    sortBy,
  ]);

  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const paginatedDirectoryRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return directoryRows.slice(startIndex, startIndex + itemsPerPage);
  }, [directoryRows, currentPage, itemsPerPage]);

  // Cascading helpers for the Add/Edit Modal
  const modalRegionObj = useMemo(() => {
    return (
      phDirectory.find((r) => r.regionId === locationForm.selectedRegionId) ||
      phDirectory[0]
    );
  }, [phDirectory, locationForm.selectedRegionId]);

  const modalProvinces = useMemo(() => {
    return modalRegionObj?.provinces || [];
  }, [modalRegionObj]);

  const modalCities = useMemo(() => {
    const provObj = modalProvinces.find(
      (p) => p.name === locationForm.selectedProvince
    );
    return provObj?.cities || [];
  }, [modalProvinces, locationForm.selectedProvince]);

  // Cascading helpers for Simulator
  const simRegionObj = useMemo(() => {
    return phDirectory.find((r) => r.regionId === simRegionId) || phDirectory[0];
  }, [phDirectory, simRegionId]);

  const simProvinces = useMemo(() => simRegionObj?.provinces || [], [simRegionObj]);

  const simCities = useMemo(() => {
    const p = simProvinces.find((pr) => pr.name === simProvince) || simProvinces[0];
    return p?.cities || [];
  }, [simProvinces, simProvince]);

  // Open Modal to Add New Location Rate via Dropdowns
  const handleOpenAddModal = (preset = null) => {
    setEditingRow(null);
    const defaultReg = preset?.regionId
      ? phDirectory.find((r) => r.regionId === preset.regionId)
      : phDirectory.find((r) => r.regionId === 'region4a') || phDirectory[0];
    const defaultProv =
      preset?.province || defaultReg?.provinces?.[0]?.name || 'Laguna';
    const provObj =
      defaultReg?.provinces?.find((p) => p.name === defaultProv) ||
      defaultReg?.provinces?.[0];
    const defaultCity = preset?.city || provObj?.cities?.[0] || 'Calamba City';
    const scope = preset?.scopeType || 'city';
    const computedName = scope === 'province' ? defaultProv : defaultCity;

    setLocationForm({
      rowType: 'override',
      scopeType: scope,
      selectedRegionId: defaultReg?.regionId || 'region4a',
      selectedProvince: defaultProv,
      selectedCity: defaultCity,
      key: '',
      overrideIdx: null,
      name: computedName,
      description: `${defaultReg?.regionName || ''} • ${defaultProv}`,
      rate: preset?.rate ?? defaultReg?.defaultFee ?? 65,
      estimatedDays: defaultReg?.defaultTransit || '1 - 3 Days',
      isActive: true,
    });
    setIsLocationModalOpen(true);
  };

  // Open Modal to Edit Existing Regional Zone or Override Rate
  const handleOpenEditModal = (row) => {
    setEditingRow(row);

    // Try to match existing override name to a Region / Province / City in PH_DIRECTORY
    let matchedRegionId = 'region4a';
    let matchedProvince = 'Laguna';
    let matchedCity = '';
    let matchedScope = 'city';

    if (row.rowType === 'override') {
      const targetLower = row.name.toLowerCase();
      for (const reg of phDirectory) {
        for (const prov of reg.provinces || []) {
          if (prov.name.toLowerCase() === targetLower) {
            matchedRegionId = reg.regionId;
            matchedProvince = prov.name;
            matchedCity = prov.cities?.[0] || '';
            matchedScope = 'province';
            break;
          }
          const foundCity = (prov.cities || []).find(
            (c) => c.toLowerCase() === targetLower
          );
          if (foundCity) {
            matchedRegionId = reg.regionId;
            matchedProvince = prov.name;
            matchedCity = foundCity;
            matchedScope = 'city';
            break;
          }
        }
      }
    }

    setLocationForm({
      rowType: row.rowType,
      scopeType: matchedScope,
      selectedRegionId: matchedRegionId,
      selectedProvince: matchedProvince,
      selectedCity: matchedCity || row.name,
      key: row.regionKey || '',
      overrideIdx: row.overrideIdx ?? null,
      name: row.name,
      description: row.description || '',
      rate: row.rate,
      estimatedDays: row.estimatedDays || '1 - 3 Days',
      isActive: row.isActive,
    });
    setIsLocationModalOpen(true);
  };

  const handleSaveLocationModal = async (e) => {
    e.preventDefault();

    const finalLocationName =
      locationForm.rowType === 'region'
        ? locationForm.name.trim()
        : locationForm.scopeType === 'province'
          ? locationForm.selectedProvince
          : locationForm.selectedCity;

    if (!finalLocationName) {
      showErrorToast('Please select a valid location from the dropdown.');
      return;
    }

    let nextSettings = { ...settings };

    if (editingRow && editingRow.rowType === 'region') {
      nextSettings.regions = settings.regions.map((r) =>
        r.key === editingRow.regionKey
          ? {
            ...r,
            name: finalLocationName,
            description: locationForm.description.trim(),
            rate: Math.max(0, Number(locationForm.rate || 0)),
            estimatedDays: locationForm.estimatedDays || '2 - 4 Days',
            isActive: Boolean(locationForm.isActive),
          }
          : r
      );
    } else if (editingRow && editingRow.rowType === 'override') {
      nextSettings.customOverrides = settings.customOverrides.map((ov, idx) =>
        idx === editingRow.overrideIdx
          ? {
            ...ov,
            locationName: finalLocationName,
            rate: Math.max(0, Number(locationForm.rate || 0)),
            estimatedDays: locationForm.estimatedDays || '1 - 3 Days',
            notes:
              locationForm.scopeType === 'province'
                ? `Province-wide rate (${modalRegionObj?.regionName || 'Philippines'})`
                : `City / Municipality rate (${locationForm.selectedProvince}, ${modalRegionObj?.regionCode || 'PH'
                })`,
            isActive: Boolean(locationForm.isActive),
          }
          : ov
      );
    } else {
      // Check if an override for this exact locationName already exists; if so, update it
      const existingIdx = settings.customOverrides.findIndex(
        (ov) => ov.locationName.toLowerCase() === finalLocationName.toLowerCase()
      );
      const overrideEntry = {
        locationName: finalLocationName,
        rate: Math.max(0, Number(locationForm.rate || 0)),
        estimatedDays: locationForm.estimatedDays || '1 - 3 Days',
        notes:
          locationForm.scopeType === 'province'
            ? `Province-wide rate (${modalRegionObj?.regionName || 'Philippines'})`
            : `City / Municipality rate (${locationForm.selectedProvince}, ${modalRegionObj?.regionCode || 'PH'
            })`,
        isActive: Boolean(locationForm.isActive),
      };

      if (existingIdx >= 0) {
        nextSettings.customOverrides = settings.customOverrides.map((ov, i) =>
          i === existingIdx ? overrideEntry : ov
        );
      } else {
        nextSettings.customOverrides = [
          ...settings.customOverrides,
          overrideEntry,
        ];
      }
    }

    const ok = await persistSettings(
      nextSettings,
      `Saved shipping rate for "${finalLocationName}" (₱${Number(
        locationForm.rate || 0
      ).toFixed(2)}) & synced to PayMongo!`
    );
    if (ok) {
      setIsLocationModalOpen(false);
    }
  };

  const handleAddPlaceToDirectory = (e) => {
    e.preventDefault();
    if (!newPlaceForm.province.trim() || !newPlaceForm.city.trim()) {
      showErrorToast('Please select a province and enter the city/municipality name.');
      return;
    }
    const regObj = phDirectory.find((r) => r.regionId === newPlaceForm.regionId);
    const updatedDir = addCustomPhLocation({
      regionId: newPlaceForm.regionId,
      regionName: regObj?.regionName || '',
      province: newPlaceForm.province.trim(),
      city: newPlaceForm.city.trim(),
    });
    setPhDirectory(updatedDir);
    showSuccessToast(
      `Added "${newPlaceForm.city.trim()}, ${newPlaceForm.province.trim()}" to PH Locations Directory!`
    );
    setNewPlaceForm((prev) => ({ ...prev, city: '' }));
    setIsAddPlaceModalOpen(false);
  };

  const handleInlineFeeUpdate = (row, newFeeValue) => {
    const numericFee = Math.max(0, Number(newFeeValue || 0));
    if (row.rowType === 'region') {
      setSettings((prev) => ({
        ...prev,
        regions: prev.regions.map((r) =>
          r.key === row.regionKey ? { ...r, rate: numericFee } : r
        ),
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        customOverrides: prev.customOverrides.map((ov, idx) =>
          idx === row.overrideIdx ? { ...ov, rate: numericFee } : ov
        ),
      }));
    }
  };

  const handleToggleRowActive = async (row) => {
    let nextSettings = { ...settings };
    if (row.rowType === 'region') {
      nextSettings.regions = settings.regions.map((r) =>
        r.key === row.regionKey ? { ...r, isActive: !row.isActive } : r
      );
    } else {
      nextSettings.customOverrides = settings.customOverrides.map((ov, idx) =>
        idx === row.overrideIdx ? { ...ov, isActive: !row.isActive } : ov
      );
    }
    await persistSettings(
      nextSettings,
      `${row.name} rate ${!row.isActive ? 'activated' : 'disabled'} & synced!`
    );
  };

  const handleRemoveOverride = async (overrideIdx, name) => {
    const nextSettings = {
      ...settings,
      customOverrides: settings.customOverrides.filter((_, i) => i !== overrideIdx),
    };
    await persistSettings(
      nextSettings,
      `Removed location override "${name}" & synced rates!`
    );
  };

  // Official locations for the region being edited (for dropdown selector)
  const officialRegionLocations = useMemo(() => {
    if (!editingRow || editingRow.rowType !== 'region') {
      return phDirectory.flatMap((reg) =>
        (reg.provinces || []).flatMap((prov) => [
          { name: prov.name, group: reg.regionName },
          ...(prov.cities || []).map((c) => ({ name: c, group: `${prov.name} Cities` })),
        ])
      );
    }

    const rKey = (editingRow.regionKey || '').toLowerCase();
    const rName = (editingRow.name || '').toLowerCase();

    if (rKey === 'ncr' || rName.includes('ncr') || rName.includes('metro manila')) {
      const ncrReg = phDirectory.find((r) => r.regionId === 'ncr');
      return (ncrReg?.provinces?.[0]?.cities || []).map((city) => ({
        name: city,
        group: 'Metro Manila (NCR) Cities',
      }));
    }

    if (rKey === 'luzon' || rName.includes('luzon')) {
      const luzonRegs = phDirectory.filter((r) =>
        ['car', 'region1', 'region2', 'region3', 'region4a', 'region5'].includes(r.regionId)
      );
      const list = [];
      for (const reg of luzonRegs) {
        for (const prov of reg.provinces || []) {
          list.push({ name: prov.name, group: reg.regionName });
          for (const city of prov.cities || []) {
            list.push({ name: city, group: `${prov.name} Cities` });
          }
        }
      }
      return list;
    }

    if (rKey === 'visayas' || rName.includes('visayas')) {
      const visRegs = phDirectory.filter((r) =>
        ['region6', 'region7', 'region8'].includes(r.regionId)
      );
      const list = [];
      for (const reg of visRegs) {
        for (const prov of reg.provinces || []) {
          list.push({ name: prov.name, group: reg.regionName });
          for (const city of prov.cities || []) {
            list.push({ name: city, group: `${prov.name} Cities` });
          }
        }
      }
      return list;
    }

    if (rKey === 'mindanao' || rName.includes('mindanao')) {
      const minRegs = phDirectory.filter((r) =>
        ['region9', 'region10', 'region11', 'region12', 'caraga', 'barmm'].includes(r.regionId)
      );
      const list = [];
      for (const reg of minRegs) {
        for (const prov of reg.provinces || []) {
          list.push({ name: prov.name, group: reg.regionName });
          for (const city of prov.cities || []) {
            list.push({ name: city, group: `${prov.name} Cities` });
          }
        }
      }
      return list;
    }

    if (rKey === 'islands' || rName.includes('island')) {
      const islRegs = phDirectory.filter((r) =>
        ['region4b', 'caraga', 'barmm'].includes(r.regionId)
      );
      const list = [];
      for (const reg of islRegs) {
        for (const prov of reg.provinces || []) {
          list.push({ name: prov.name, group: reg.regionName });
        }
      }
      ['Palawan', 'Batanes', 'Catanduanes', 'Marinduque', 'Romblon', 'Siargao', 'Camiguin', 'Siquijor', 'Basilan', 'Sulu', 'Tawi-Tawi', 'Dinagat Islands'].forEach(
        (island) => {
          if (!list.some((item) => item.name.toLowerCase() === island.toLowerCase())) {
            list.push({ name: island, group: 'Island & Remote Areas' });
          }
        }
      );
      return list;
    }

    return phDirectory.flatMap((reg) =>
      (reg.provinces || []).map((prov) => ({
        name: prov.name,
        group: reg.regionName,
      }))
    );
  }, [editingRow, phDirectory]);

  // Parse covered locations for region edit
  const coveredLocationsList = useMemo(() => {
    if (!locationForm.description) return [];
    return locationForm.description
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [locationForm.description]);

  const handleAddCoveredLocation = (locationNameToAdd) => {
    if (!locationNameToAdd) return;
    const exists = coveredLocationsList.some(
      (loc) => loc.toLowerCase() === locationNameToAdd.toLowerCase()
    );
    if (!exists) {
      const updated = [...coveredLocationsList, locationNameToAdd].join(', ');
      setLocationForm((prev) => ({ ...prev, description: updated }));
    }
  };

  const handleRemoveCoveredLocation = (indexToRemove) => {
    const updated = coveredLocationsList
      .filter((_, idx) => idx !== indexToRemove)
      .join(', ');
    setLocationForm((prev) => ({ ...prev, description: updated }));
  };

  const handleSelectAllOfficialLocations = () => {
    const allNames = officialRegionLocations.map((loc) => loc.name);
    const combined = Array.from(new Set([...allNames, ...coveredLocationsList]));
    setLocationForm((prev) => ({ ...prev, description: combined.join(', ') }));
  };

  const handleClearAllCoveredLocations = () => {
    setLocationForm((prev) => ({ ...prev, description: '' }));
  };

  const statusModules = [
    {
      id: 'directory',
      label: 'PH Locations Directory (Nationwide)',
      icon: Building2,
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6 font-sans antialiased text-slate-700">
      {/* MAIN CONTAINER (MATCHES FINISHED GOODS SYSTEM LAYOUT & SPACING) */}
      <div className="w-full bg-white border border-slate-100 text-slate-600 rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200">
        {/* ======================================================== */}
        {/* COMPACT EXCEL RIBBON TOOLBAR (RESPONSIVE SEAMLESS DESIGN) */}
        {/* ======================================================== */}
        <div className="w-full bg-white flex flex-col">
          {/* TOP BAR: EXCEL SHEET TABS (SINGLE PRIMARY WORKBOOK TAB) */}
          <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
            <div className="flex items-center gap-1 -mb-px">
              <button
                type="button"
                className="px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg"
              >
                <Building2 className="w-3.5 h-3.5 text-[#01390f]" />
                <span>PH Locations Directory (Nationwide)</span>
              </button>
            </div>
          </div>

          {/* MS EXCEL-STYLE RIBBON TOOLBAR (RESPONSIVE: STACKS ON MOBILE, 1 ROW ON DESKTOP) */}
          <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
            {/* GROUP 1: ACTIONS (Matches Finished Goods exact width and button layout) */}
            <div className="w-full lg:w-[256px] shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]">
              <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
                {/* Tall Full-Height Action Button */}
                <button
                  type="button"
                  onClick={() => handleOpenAddModal()}
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Select Region, Province, or City from PH Dropdown & Set Shipping Rate"
                >
                  <Plus
                    className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5"
                    strokeWidth={2.5}
                  />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    Location
                    <br />
                    Rate
                  </span>
                </button>

                {/* Stacked Compact Rows */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                  {/* Layer 1: PH Locations Directory / Dropdown Module */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory((prev) =>
                        prev === 'all_provinces' ? 'All' : 'all_provinces'
                      );
                      setCurrentPage(1);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-[#01390f] transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Toggle between Configured Shipping Rates & Nationwide Directory"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                    <span className="whitespace-nowrap">
                      {selectedCategory === 'all_provinces'
                        ? 'Configured Rates'
                        : 'Nationwide Directory'}
                    </span>
                  </button>

                  {/* Layer 2: Checkout & PayMongo Simulator Modal Button */}
                  <button
                    type="button"
                    onClick={() => setIsSimulatorModalOpen(true)}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 hover:text-[#01390f] transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px]"
                    title="Open Live Checkout & PayMongo Simulator Modal"
                  >
                    <Calculator className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                    <span className="whitespace-nowrap">Checkout Simulator</span>
                  </button>

                  {/* Layer 3: Reset Filters */}
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    disabled={activeFiltersCount === 0}
                    className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                    title={
                      activeFiltersCount > 0
                        ? `Reset active filters (${activeFiltersCount})`
                        : 'No active filters'
                    }
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

            {/* GROUP 2: SEARCH & FILTERS (Responsive Multi-Column Grid matching Finished Goods) */}
            <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
              <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">
                {/* Layer 1: Search Bar (Enhanced Height h-[38px]) */}
                <div className="relative flex items-center w-full">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="search"
                    name="shippingRatesSearchQuery"
                    id="shippingRatesSearchQuery"
                    autoComplete="off"
                    placeholder="Search Region, Province, or City across the Philippines (e.g. Laguna, NCR, Cebu, Davao)..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                    title="Search Region, Province, or City..."
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Layer 2: Filter Dropdowns (3 cols on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                  {/* 1. Rule Category / View Scope Dropdown */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <Tag className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                      title="Filter by Rule Category or View Full Nationwide Directory"
                    >
                      <option value="All">
                        All Location Rates ({allRows.length})
                      </option>
                      <option value="Regional Delivery Zone">
                        Regional Delivery Zones ({settings.regions.length})
                      </option>
                      <option value="City / Province Override">
                        City / Province Overrides ({settings.customOverrides.length})
                      </option>
                      <option value="all_provinces">
                        Nationwide Directory ({phDirectory.flatMap((r) => r.provinces || []).length} Provinces)
                      </option>
                    </select>
                  </div>

                  {selectedCategory === 'all_provinces' ? (
                    <>
                      {/* PH Region Filter */}
                      <div className="relative inline-flex items-center w-full min-w-0">
                        <Globe className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                        <select
                          value={dirRegionFilter}
                          onChange={(e) => {
                            setDirRegionFilter(e.target.value);
                            setDirProvinceFilter('All');
                            setCurrentPage(1);
                          }}
                          className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                        >
                          <option value="All">
                            All Philippine Regions ({phDirectory.length})
                          </option>
                          {phDirectory.map((reg) => (
                            <option key={reg.regionId} value={reg.regionId}>
                              {reg.regionName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* PH Province Filter */}
                      <div className="relative inline-flex items-center w-full min-w-0">
                        <MapPin className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                        <select
                          value={dirProvinceFilter}
                          onChange={(e) => {
                            setDirProvinceFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                        >
                          <option value="All">All Provinces</option>
                          {(dirRegionFilter === 'All'
                            ? phDirectory.flatMap((r) => r.provinces)
                            : phDirectory.find((r) => r.regionId === dirRegionFilter)
                              ?.provinces || []
                          ).map((prov, idx) => (
                            <option key={idx} value={prov.name}>
                              {prov.name} ({prov.cities.length} cities)
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Location Name Dropdown */}
                      <div className="relative inline-flex items-center w-full min-w-0">
                        <MapPin className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                        <select
                          value={selectedLocationName}
                          onChange={(e) => {
                            setSelectedLocationName(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                          title="Filter by Configured Location"
                        >
                          <option value="All">
                            All Configured Locations ({filterLocationNames.length})
                          </option>
                          {filterLocationNames.map((name, idx) => (
                            <option key={idx} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status / Condition Dropdown */}
                      <div className="relative inline-flex items-center w-full min-w-0 sm:col-span-2 md:col-span-1">
                        <Activity className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                        <select
                          value={selectedCondition}
                          onChange={(e) => {
                            setSelectedCondition(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                          title="Filter by Rate Status"
                        >
                          <option value="All">All Rate Statuses</option>
                          <option value="Active Rate">🟢 Active Rate</option>
                          <option value="Disabled Rate">🔴 Disabled Rate</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Layer 3: Quick Filter Toggles & Sort */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {/* Hide Disabled Rates */}
                  <button
                    type="button"
                    onClick={() => {
                      setHideDisabled(!hideDisabled);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center justify-center gap-1.5 px-2 py-1 sm:py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors h-[30px] sm:h-[22px] w-full shadow-2xs ${hideDisabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                  >
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hide Disabled</span>
                  </button>

                  {/* Sort Select */}
                  <div className="relative inline-flex items-center w-full min-w-0">
                    <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 text-slate-500 pointer-events-none" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded pl-7 pr-6 py-1 sm:py-0.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#01390f] h-[30px] sm:h-[22px] cursor-pointer truncate shadow-2xs"
                    >
                      <option value="default">Sort: Default Priority</option>
                      <option value="name_asc">Location (A → Z)</option>
                      <option value="name_desc">Location (Z → A)</option>
                      <option value="fee_asc">Shipping Fee (Low → High)</option>
                      <option value="fee_desc">Shipping Fee (High → Low)</option>
                      <option value="code_asc">Code (A → Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group Caption */}
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-1 select-none hidden lg:block">
                Search &amp; Filter
              </div>
            </div>
          </div>
        </div>

        {/* CLEAN SEPARATOR BEFORE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {selectedCategory === 'all_provinces' ? (
          /* ================================================================= */
          /* VIEW 2: NATIONWIDE PH LOCATIONS DIRECTORY (17 REGIONS / 82 PROV)  */
          /* ================================================================= */
          <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
            <TablePagination
              currentPage={currentPage}
              totalItems={directoryRows.length}
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
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">
                      REGION CODE
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">
                      PHILIPPINE REGION
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">
                      PROVINCE
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[280px] font-semibold text-white">
                      CITIES &amp; MUNICIPALITIES (CLICK TO SET CITY RATE)
                    </th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">
                      EFFECTIVE RATE
                    </th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-28 min-w-[110px] font-semibold text-white">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDirectoryRows.map((item) => (
                    <tr
                      key={item.key}
                      className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07]">
                        {item.code}
                      </td>
                      <td className="py-3.5 px-4 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07]">
                        <span className="font-medium text-slate-700">{item.regionName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07]">
                        <div className="flex items-center gap-1.5">
                          <span>{item.province}</span>
                          {item.hasCustomOverride && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">
                              Custom Override
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07]">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {item.cities.map((city, cIdx) => {
                            const cityOverride = (settings.customOverrides || []).find(
                              (o) =>
                                o.isActive !== false &&
                                o.locationName.toLowerCase() === city.toLowerCase()
                            );
                            return (
                              <button
                                key={cIdx}
                                type="button"
                                onClick={() =>
                                  handleOpenAddModal({
                                    scopeType: 'city',
                                    regionId: item.regionId,
                                    province: item.province,
                                    city,
                                    rate: cityOverride?.rate ?? item.effectiveFee,
                                  })
                                }
                                className={`text-[11px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${cityOverride
                                  ? 'bg-emerald-50 text-[#01390f] border-emerald-300 font-bold'
                                  : 'bg-white hover:bg-[#EDF7EE] text-slate-600 hover:text-[#01390f] border-slate-200'
                                  }`}
                                title={`Click to set shipping rate for ${city}, ${item.province}`}
                              >
                                {city}
                                {cityOverride ? ` (₱${cityOverride.rate})` : ''}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            ₱{Number(item.effectiveFee).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {item.defaultTransit}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-28 min-w-[110px]">
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenAddModal({
                              scopeType: 'province',
                              regionId: item.regionId,
                              province: item.province,
                              city: item.cities[0] || '',
                              rate: item.effectiveFee,
                            })
                          }
                          className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[#01390f] hover:bg-[#01390f] hover:text-white hover:border-[#01390f] text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Set Rate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* VIEW 3: TABLE MASTERLIST (EXACT FINISHED GOODS TABLE DESIGN)      */
          /* ================================================================= */
          <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden">
            {/* TABLE PAGINATION */}
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredRows.length}
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
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">
                      CODE
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap font-semibold text-white">
                      RULE CATEGORY
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[180px] font-semibold text-white">
                      LOCATION / ZONE NAME
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap min-w-[260px] font-semibold text-white">
                      COVERED PROVINCES &amp; CITIES
                    </th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">
                      SHIPPING FEE &amp; STATUS
                    </th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-white">
                      TRANSIT &amp; GATEWAY
                    </th>
                    <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">
                      ACTION
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading && allRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-12 text-[#01390f] font-medium italic whitespace-nowrap"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Fetching location shipping rates from database...</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const isRegion = row.rowType === 'region';
                      return (
                        <tr
                          key={row.key}
                          className="hover:bg-slate-50/90 transition-colors text-slate-700 font-medium text-xs sm:text-sm whitespace-nowrap group"
                        >
                          {/* 1. CODE */}
                          <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                              {row.code}
                            </span>
                          </td>

                          {/* 2. RULE CATEGORY (Pill Badge matching Raw Materials) */}
                          <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-medium text-xs text-slate-600 transition-colors">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${isRegion
                                ? 'bg-blue-50 text-blue-700 border-blue-200/70'
                                : 'bg-amber-50 text-amber-700 border-amber-200/70'
                                }`}
                            >
                              {isRegion ? (
                                <Globe className="w-3 h-3" />
                              ) : (
                                <Navigation className="w-3 h-3" />
                              )}
                              <span>{row.category}</span>
                            </span>
                          </td>

                          {/* 3. LOCATION / ZONE NAME */}
                          <td className="px-4 py-3.5 whitespace-nowrap min-w-[170px] bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] font-bold text-xs text-slate-800 transition-colors">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{row.name}</span>
                              {!row.isActive && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold border border-rose-200">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 4. COVERED PROVINCES & CITIES */}
                          <td className="px-4 py-3.5 max-w-[340px] truncate bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] text-xs text-slate-600 transition-colors">
                            <span title={row.description}>{row.description}</span>
                          </td>

                          {/* 5. SHIPPING FEE & STATUS (Blue Accent Column matching Raw Materials Quantity/Volume) */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap bg-blue-600/25 group-hover:bg-blue-600/40 transition-colors">
                            <div className="flex flex-col items-center gap-1">
                              <div className="inline-flex items-center bg-white border border-slate-200 rounded-md px-2 py-0.5 focus-within:border-[#01390f] shadow-2xs">
                                <span className="text-slate-400 font-bold text-xs mr-1">
                                  ₱
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={row.rate}
                                  onChange={(e) =>
                                    handleInlineFeeUpdate(row, e.target.value)
                                  }
                                  onBlur={() => persistSettings(settings)}
                                  className="w-16 font-mono font-bold text-slate-900 text-xs text-center focus:outline-none bg-transparent"
                                  title="Edit shipping fee and click outside to auto-save"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleRowActive(row)}
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-opacity hover:opacity-80 ${row.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70 font-semibold'
                                  : 'bg-rose-50 text-rose-700 border-rose-200/70 font-semibold'
                                  }`}
                                title="Click to toggle Active / Disabled status"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${row.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                ></span>
                                <span>{row.isActive ? 'Active Rate' : 'Disabled'}</span>
                              </button>
                            </div>
                          </td>

                          {/* 6. TRANSIT & GATEWAY */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {row.estimatedDays}
                              </span>
                              <span className="inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 uppercase">
                                PAYMONGO SYNC
                              </span>
                            </div>
                          </td>

                          {/* 7. ACTION (STICKY RIGHT - EXACT RAW MATERIALS STYLING) */}
                          <td className="py-3 px-3 bg-[#f8faf8] group-hover:bg-[#eef5ee] text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-24 min-w-[90px] transition-colors">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(row)}
                                title="Edit Location Rate & Transit Window"
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isRegion ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleRowActive(row)}
                                  title={
                                    row.isActive
                                      ? 'Disable Regional Rate'
                                      : 'Enable Regional Rate'
                                  }
                                  className={`w-8 h-8 rounded-full bg-white border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${row.isActive
                                    ? 'border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
                                    : 'border-slate-200 text-slate-400 hover:bg-slate-600 hover:text-white hover:border-slate-600'
                                    }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveOverride(row.overrideIdx, row.name)
                                  }
                                  title="Delete Location Override"
                                  className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {!loading && filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                      >
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Info className="w-6 h-6 text-slate-300" />
                          <span>
                            No location shipping rates matched your search or filter criteria.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* ADD / EDIT LOCATION SHIPPING RATE MODAL (DROPDOWN-DRIVEN)         */}
      {/* ================================================================= */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200/80 flex flex-col max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                {editingRow
                  ? `Edit Shipping Rate — ${editingRow.name}`
                  : 'Add Location Shipping Rate (Philippines)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveLocationModal}
              className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm"
            >
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {locationForm.rowType === 'region' ? (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Regional Delivery Zone
                      </label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          readOnly
                          value={locationForm.name}
                          className="w-full h-[34px] pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Covered Provinces & Cities (Dropdown-driven with individual badge chips - No manual typing) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Covered Provinces &amp; Cities ({coveredLocationsList.length})
                        </label>
                        <div className="flex items-center gap-2">
                          {officialRegionLocations.length > 0 && (
                            <button
                              type="button"
                              onClick={handleSelectAllOfficialLocations}
                              className="text-[11px] text-[#01390f] font-bold hover:underline cursor-pointer"
                            >
                              + Select All ({officialRegionLocations.length})
                            </button>
                          )}
                          {coveredLocationsList.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllCoveredLocations}
                              className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dropdown to pick/add without typing */}
                      <div className="relative mb-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          value=""
                          onChange={(e) => {
                            handleAddCoveredLocation(e.target.value);
                            e.target.value = '';
                          }}
                          className="w-full h-[36px] pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                        >
                          <option value="">
                            -- ➕ Choose Province or City from Dropdown to Add --
                          </option>
                          {officialRegionLocations.map((loc, idx) => {
                            const isAlreadyCovered = coveredLocationsList.some(
                              (c) => c.toLowerCase() === loc.name.toLowerCase()
                            );
                            return (
                              <option
                                key={idx}
                                value={loc.name}
                                disabled={isAlreadyCovered}
                              >
                                {loc.name} {isAlreadyCovered ? '✓ (Covered)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Display as individual pills / badges with remove button */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl min-h-[80px] max-h-[150px] overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5">
                        {coveredLocationsList.length === 0 ? (
                          <div className="flex items-center justify-center w-full py-3 text-xs text-slate-400 italic">
                            No covered locations selected yet. Pick a city or province from the dropdown above.
                          </div>
                        ) : (
                          coveredLocationsList.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-[#01390f] border border-emerald-200 shadow-2xs group"
                            >
                              <span>{item}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCoveredLocation(idx)}
                                className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer rounded-full p-0.5 hover:bg-white"
                                title={`Remove ${item}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 1. LOCATION COVERAGE LEVEL */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        1. Coverage Level *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setLocationForm((prev) => ({
                              ...prev,
                              scopeType: 'city',
                              name: prev.selectedCity || prev.selectedProvince,
                            }))
                          }
                          className={`h-[34px] rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${locationForm.scopeType === 'city'
                            ? 'bg-[#01390f] text-white border-[#01390f]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Specific City / Municipality
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLocationForm((prev) => ({
                              ...prev,
                              scopeType: 'province',
                              name: prev.selectedProvince,
                            }))
                          }
                          className={`h-[34px] rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${locationForm.scopeType === 'province'
                            ? 'bg-[#01390f] text-white border-[#01390f]'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          Entire Province
                        </button>
                      </div>
                    </div>

                    {/* 2. PHILIPPINE REGION DROPDOWN */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        2. Select Philippine Region *
                      </label>
                      <div className="relative">
                        <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          value={locationForm.selectedRegionId}
                          onChange={(e) => {
                            const nextRegionId = e.target.value;
                            const regObj = phDirectory.find(
                              (r) => r.regionId === nextRegionId
                            );
                            const firstProv = regObj?.provinces?.[0]?.name || '';
                            const firstCity =
                              regObj?.provinces?.[0]?.cities?.[0] || '';
                            setLocationForm((prev) => ({
                              ...prev,
                              selectedRegionId: nextRegionId,
                              selectedProvince: firstProv,
                              selectedCity: firstCity,
                              name:
                                prev.scopeType === 'province' ? firstProv : firstCity,
                              rate: regObj?.defaultFee ?? prev.rate,
                              estimatedDays:
                                regObj?.defaultTransit || prev.estimatedDays,
                            }));
                          }}
                          className="w-full h-[34px] pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                        >
                          {phDirectory.map((reg) => (
                            <option key={reg.regionId} value={reg.regionId}>
                              {reg.regionName} — {reg.islandGroup}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 3. PROVINCE & CITY CASCADING DROPDOWNS */}
                    <div
                      className={`grid grid-cols-1 ${locationForm.scopeType === 'city' ? 'sm:grid-cols-2' : ''
                        } gap-3.5`}
                    >
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          3. Select Province *
                        </label>
                        <div className="relative">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <select
                            value={locationForm.selectedProvince}
                            onChange={(e) => {
                              const nextProv = e.target.value;
                              const provObj = modalProvinces.find(
                                (p) => p.name === nextProv
                              );
                              const firstCity = provObj?.cities?.[0] || '';
                              setLocationForm((prev) => ({
                                ...prev,
                                selectedProvince: nextProv,
                                selectedCity: firstCity,
                                name:
                                  prev.scopeType === 'province'
                                    ? nextProv
                                    : firstCity,
                              }));
                            }}
                            className="w-full h-[34px] pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                          >
                            {modalProvinces.map((prov, idx) => (
                              <option key={idx} value={prov.name}>
                                {prov.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {locationForm.scopeType === 'city' && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            4. Select City / Municipality *
                          </label>
                          <div className="relative">
                            <Navigation className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <select
                              value={locationForm.selectedCity}
                              onChange={(e) => {
                                const nextCity = e.target.value;
                                setLocationForm((prev) => ({
                                  ...prev,
                                  selectedCity: nextCity,
                                  name: nextCity,
                                }));
                              }}
                              className="w-full h-[34px] pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                            >
                              {modalCities.map((city, idx) => (
                                <option key={idx} value={city}>
                                  {city}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* SHIPPING FEE & ESTIMATED TRANSIT WINDOW DROPDOWN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Shipping Fee (₱) *
                    </label>
                    <div className="relative">
                      <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={locationForm.rate}
                        onChange={(e) =>
                          setLocationForm((prev) => ({
                            ...prev,
                            rate: e.target.value,
                          }))
                        }
                        placeholder="e.g., 60"
                        className="w-full h-[34px] pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#01390f] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Estimated Transit Window *
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <select
                        value={locationForm.estimatedDays}
                        onChange={(e) =>
                          setLocationForm((prev) => ({
                            ...prev,
                            estimatedDays: e.target.value,
                          }))
                        }
                        className="w-full h-[34px] pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                      >
                        {TRANSIT_WINDOW_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        {!TRANSIT_WINDOW_OPTIONS.includes(
                          locationForm.estimatedDays
                        ) && (
                            <option value={locationForm.estimatedDays}>
                              {locationForm.estimatedDays}
                            </option>
                          )}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Rate Status
                  </label>
                  <div className="relative">
                    <Activity className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={locationForm.isActive ? 'active' : 'disabled'}
                      onChange={(e) =>
                        setLocationForm((prev) => ({
                          ...prev,
                          isActive: e.target.value === 'active',
                        }))
                      }
                      className="w-full h-[34px] pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                    >
                      <option value="active">
                        🟢 Active (Applied at Cart, Checkout &amp; PayMongo)
                      </option>
                      <option value="disabled">🔴 Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{editingRow ? 'Save Changes' : 'Save Location Rate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ADD NEW CITY / MUNICIPALITY TO PH LOCATIONS MODULE MODAL          */}
      {/* ================================================================= */}
      {isAddPlaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/80 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                Add City / Municipality to PH Module
              </h3>
              <button
                type="button"
                onClick={() => setIsAddPlaceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleAddPlaceToDirectory}
              className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm"
            >
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Philippine Region *
                  </label>
                  <select
                    value={newPlaceForm.regionId}
                    onChange={(e) => {
                      const reg = phDirectory.find(
                        (r) => r.regionId === e.target.value
                      );
                      setNewPlaceForm({
                        regionId: e.target.value,
                        province: reg?.provinces?.[0]?.name || '',
                        city: '',
                      });
                    }}
                    className="w-full h-[34px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f]"
                  >
                    {phDirectory.map((reg) => (
                      <option key={reg.regionId} value={reg.regionId}>
                        {reg.regionName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Province *
                  </label>
                  <select
                    value={newPlaceForm.province}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({
                        ...prev,
                        province: e.target.value,
                      }))
                    }
                    className="w-full h-[34px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f]"
                  >
                    {(
                      phDirectory.find((r) => r.regionId === newPlaceForm.regionId)
                        ?.provinces || []
                    ).map((prov, idx) => (
                      <option key={idx} value={prov.name}>
                        {prov.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City / Municipality Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlaceForm.city}
                    onChange={(e) =>
                      setNewPlaceForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder="Enter new city or municipality name..."
                    className="w-full h-[34px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#01390f]"
                  />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsAddPlaceModalOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Module</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* FREE SHIPPING PROMO & FALLBACK RULES MODAL                        */}
      {/* ================================================================= */}
      {/* CHECKOUT & PAYMONGO SHIPPING RATE SIMULATOR MODAL                 */}
      {/* ================================================================= */}
      {isSimulatorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden border border-slate-200/80 flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">

                <div>
                  <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
                    Checkout &amp; PayMongo Simulator
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Test live checkout shipping calculation and adjust rates instantly
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulatorModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT: DROPDOWNS & SUBTOTAL */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        1. Philippine Region
                      </label>
                      <select
                        value={simRegionId}
                        onChange={(e) => {
                          const nextRegId = e.target.value;
                          setSimRegionId(nextRegId);
                          const reg = phDirectory.find((r) => r.regionId === nextRegId);
                          const firstProv = reg?.provinces?.[0]?.name || '';
                          const firstCity = reg?.provinces?.[0]?.cities?.[0] || '';
                          setSimProvince(firstProv);
                          setSimCity(firstCity);
                          const addr = `${firstCity}, ${firstProv}`;
                          setTestAddress(addr);
                          runSimulator(addr, testSubtotal);
                        }}
                        className="w-full h-[36px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                      >
                        {phDirectory.map((reg) => (
                          <option key={reg.regionId} value={reg.regionId}>
                            {reg.regionName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        2. Province
                      </label>
                      <select
                        value={simProvince}
                        onChange={(e) => {
                          const nextProv = e.target.value;
                          setSimProvince(nextProv);
                          const provObj = simProvinces.find((p) => p.name === nextProv);
                          const firstCity = provObj?.cities?.[0] || '';
                          setSimCity(firstCity);
                          const addr = `${firstCity}, ${nextProv}`;
                          setTestAddress(addr);
                          runSimulator(addr, testSubtotal);
                        }}
                        className="w-full h-[36px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                      >
                        {simProvinces.map((prov, idx) => (
                          <option key={idx} value={prov.name}>
                            {prov.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        3. City / Municipality
                      </label>
                      <select
                        value={simCity}
                        onChange={(e) => {
                          const nextCity = e.target.value;
                          setSimCity(nextCity);
                          const addr = `${nextCity}, ${simProvince}`;
                          setTestAddress(addr);
                          runSimulator(addr, testSubtotal);
                        }}
                        className="w-full h-[36px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                      >
                        {simCities.map((city, idx) => (
                          <option key={idx} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Cart Merchandise Subtotal (₱)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={testSubtotal}
                          onChange={(e) => {
                            setTestSubtotal(e.target.value);
                            runSimulator(testAddress, e.target.value);
                          }}
                          className="w-full h-[36px] pl-7 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#01390f] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => runSimulator(testAddress, testSubtotal)}
                      disabled={simulating}
                      className="w-full h-[36px] px-5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center active:scale-[0.99] disabled:opacity-50"
                    >
                      <span>{simulating ? 'Calculating Rate...' : 'Test Checkout & PayMongo Rate'}</span>
                    </button>
                  </div>
                </div>

                {/* RIGHT: OUTPUT CARD & ADJUSTMENT */}
                <div className="lg:col-span-6 space-y-4">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Cart, Checkout &amp; PayMongo Output
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {simulatedResult?.isFreeShipping ? 'FREE SHIPPING' : 'LOCATION RATE'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Selected PH Location:</span>
                      <span className="font-bold text-slate-800">{testAddress}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Matched Location Rule:</span>
                      <span className="font-bold text-[#01390f]">
                        {simulatedResult?.matchedRegion || 'Standard Delivery'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Estimated Transit Window:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {simulatedResult?.estimatedDays || '2 - 5 Days'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">PayMongo Line Item Name:</span>
                      <span className="font-semibold text-slate-800">
                        Shipping Fee ({simulatedResult?.matchedRegion || 'Standard Delivery'})
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Checkout Shipping Fee:
                      </span>
                      <div className="text-right">
                        {simulatedResult?.isFreeShipping &&
                          simulatedResult?.baseRegionRate > 0 && (
                            <span className="text-xs text-slate-400 line-through mr-2 font-mono">
                              ₱{Number(simulatedResult.baseRegionRate).toFixed(2)}
                            </span>
                          )}
                        <span className="text-2xl font-mono font-black text-[#01390f]">
                          ₱{Number(simulatedResult?.shippingFee ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QUICK ADJUST & SAVE SECTION: "tas pag may babaguhin ako jan mag save na" */}
                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-200/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Adjust Rate for {simCity || testAddress}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Shipping Fee (₱)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={simQuickFee}
                          onChange={(e) => setSimQuickFee(e.target.value)}
                          className="w-full h-[36px] px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#01390f]"
                        />
                      </div>
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                          Transit Window
                        </label>
                        <select
                          value={simQuickTransit}
                          onChange={(e) => setSimQuickTransit(e.target.value)}
                          className="w-full h-[36px] px-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#01390f] cursor-pointer"
                        >
                          {TRANSIT_WINDOW_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-4">
                        <button
                          type="button"
                          onClick={handleSaveFromSimulator}
                          disabled={saving}
                          className="w-full h-[36px] px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center active:scale-[0.99] disabled:opacity-50 whitespace-nowrap"
                        >
                          <span>{saving ? 'Saving...' : 'Save Rate'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-3.5 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsSimulatorModalOpen(false)}
                className="px-5 py-2 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7] active:scale-[0.99]"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogisticsShippingSetting;
