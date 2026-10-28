import React, { useState, useEffect, useCallback } from 'react';
import { Check, Activity, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { API } from '../../axios';
import { showSuccessToast, showErrorToast } from '../../utils/toast';
import { notifyLiveSync } from '../../utils/liveSync';

// 1. FINISHED GOODS (FG) DEFAULTS
export const DEFAULT_FG_CATEGORIES = [
  'Bath & Body',
  'Beverages & Tea',
  'Body Lotion',
  'Cosmetics',
  'Eye Care',
  'Face Care',
  'Finished Goods',
  'Hair Care',
  'Hair Conditioner',
  'Lip Care',
  'Serums & Essences',
  'Skin Care',
  'Special Bundles',
  'Sun Care',
  'Toners & Mists',
];

export const DEFAULT_FG_UOMS = [
  'bottle',
  'box',
  'can',
  'jar',
  'pack',
  'pcs',
  'pouch',
  'roll',
  'set',
  'tube',
];

export const DEFAULT_FG_THRESHOLDS = {
  criticalLevel: 0,
  restockWarningPoint: 10,
  overstockLimitPoint: 1000,
};

// 2. RAW MATERIALS (RM) DEFAULTS - Contains all active categories from inventory
export const DEFAULT_RM_CATEGORIES = [
  'Active Ingredients',
  'Botanical / Plant Extracts',
  'Colorants / Pigments',
  'Conditioning Agents',
  'Emollients',
  'Emulsifiers',
  'Fragrance / Perfume',
  'Functional Additives',
  'Humectants',
  'Occlusives',
  'Packaging Materials',
  'pH Adjusters',
  'Preservatives',
  'Proteins / Hydrolyzed Proteins',
  'Raw Materials',
  'Solid',
  'Solvents',
  'Specialty Ingredients',
  'Thickeners / Viscosity Modifiers',
  'Utilities',
  'Vitamins & Derivatives',
];

export const DEFAULT_RM_UOMS = [
  'bag',
  'bottle',
  'box',
  'drum',
  'g',
  'gallon',
  'kg',
  'L',
  'LT',
  'mg',
  'mL',
  'pail',
  'pcs',
  'roll',
  'sack',
  'set',
];

export const DEFAULT_RM_THRESHOLDS = {
  criticalLevel: 0,
  restockWarningPoint: 10,
  overstockLimitPoint: 1000,
};

// Combined legacy exports for backward compatibility
export const DEFAULT_MASTER_CATEGORIES = [
  ...new Set([...DEFAULT_FG_CATEGORIES, ...DEFAULT_RM_CATEGORIES])
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));

export const DEFAULT_MASTER_UOMS = [
  ...new Set([...DEFAULT_FG_UOMS, ...DEFAULT_RM_UOMS])
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));

export const DEFAULT_MASTER_PACKAGING_UNITS = [];
export const getStoredPackagingUnits = () => [];

export const getStoredThresholds = (moduleType = 'finished_goods') => {
  const isRaw = moduleType === 'raw_materials' || moduleType === 'rawmat';
  const storageKey = isRaw ? 'inventory_rm_custom_thresholds' : 'inventory_fg_custom_thresholds';
  const defaultObj = isRaw ? DEFAULT_RM_THRESHOLDS : DEFAULT_FG_THRESHOLDS;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          criticalLevel: Number(parsed.criticalLevel !== undefined ? parsed.criticalLevel : defaultObj.criticalLevel),
          restockWarningPoint: Number(parsed.restockWarningPoint !== undefined ? parsed.restockWarningPoint : defaultObj.restockWarningPoint),
          overstockLimitPoint: Number(parsed.overstockLimitPoint !== undefined ? parsed.overstockLimitPoint : defaultObj.overstockLimitPoint),
        };
      }
    }
  } catch (e) {
    console.error('Failed to load stored thresholds:', e);
  }
  return { ...defaultObj };
};

export const getStoredCategories = (fallbackList = [], moduleType = 'finished_goods') => {
  const isRaw = moduleType === 'raw_materials' || moduleType === 'rawmat';
  const storageKey = isRaw ? 'inventory_rm_custom_categories' : 'inventory_fg_custom_categories';
  const defaultList = isRaw ? DEFAULT_RM_CATEGORIES : DEFAULT_FG_CATEGORIES;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...parsed, ...fallbackList]))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
      }
    }
  } catch (e) {
    console.error('Failed to load stored categories:', e);
  }
  return Array.from(new Set([...defaultList, ...fallbackList]))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
};

export const getStoredUOMs = (fallbackList = [], moduleType = 'finished_goods') => {
  const isRaw = moduleType === 'raw_materials' || moduleType === 'rawmat';
  const storageKey = isRaw ? 'inventory_rm_custom_uoms' : 'inventory_fg_custom_uoms';
  const defaultList = isRaw ? DEFAULT_RM_UOMS : DEFAULT_FG_UOMS;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...parsed, ...fallbackList]))
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
      }
    }
  } catch (e) {
    console.error('Failed to load stored UOMs:', e);
  }
  return Array.from(new Set([...defaultList, ...fallbackList]))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
};

export default function MasterCategoryUomModal({
  isOpen,
  onClose,
  moduleType = 'finished_goods',
  initialTab = 'categories',
  existingCategories = [],
}) {
  const [activeModule, setActiveModule] = useState(() =>
    moduleType === 'raw_materials' || moduleType === 'rawmat' ? 'raw_materials' : 'finished_goods'
  );
  const [activeTab, setActiveTab] = useState(
    initialTab === 'uoms' ? 'uoms' : 'categories'
  ); // 'categories' | 'uoms'

  const [categories, setCategories] = useState(() => getStoredCategories([], activeModule));
  const [uoms, setUoms] = useState(() => getStoredUOMs([], activeModule));
  const [thresholds, setThresholds] = useState(() => getStoredThresholds(activeModule));

  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [newUomInput, setNewUomInput] = useState('');
  const [loadingDb, setLoadingDb] = useState(false);
  const [savingDb, setSavingDb] = useState(false);

  const isRaw = activeModule === 'raw_materials';
  const categoryStorageKey = isRaw ? 'inventory_rm_custom_categories' : 'inventory_fg_custom_categories';
  const uomStorageKey = isRaw ? 'inventory_rm_custom_uoms' : 'inventory_fg_custom_uoms';
  const thresholdStorageKey = isRaw ? 'inventory_rm_custom_thresholds' : 'inventory_fg_custom_thresholds';

  const notifyUpdated = useCallback(() => {
    window.dispatchEvent(new Event('inventory_categories_uom_updated'));
    notifyLiveSync('inventory', { moduleType: activeModule });
  }, [activeModule]);

  // Fetch from MongoDB database
  const fetchFromDb = useCallback(async (targetModule) => {
    try {
      setLoadingDb(true);
      const res = await API.get(`/api/inventory-category-uom/${targetModule}`);
      if (res.data?.success) {
        const dbCats = res.data.categories || [];
        const dbUoms = res.data.uoms || [];
        const dbThresholds = res.data.defaultThresholds;

        setCategories(dbCats);
        setUoms(dbUoms);
        if (dbThresholds) {
          setThresholds(dbThresholds);
        }

        const catKey = targetModule === 'raw_materials' ? 'inventory_rm_custom_categories' : 'inventory_fg_custom_categories';
        const uomKey = targetModule === 'raw_materials' ? 'inventory_rm_custom_uoms' : 'inventory_fg_custom_uoms';
        const threshKey = targetModule === 'raw_materials' ? 'inventory_rm_custom_thresholds' : 'inventory_fg_custom_thresholds';

        localStorage.setItem(catKey, JSON.stringify(dbCats));
        localStorage.setItem(uomKey, JSON.stringify(dbUoms));
        if (dbThresholds) {
          localStorage.setItem(threshKey, JSON.stringify(dbThresholds));
        }

        notifyUpdated();
      }
    } catch (err) {
      console.error('Error fetching categories and UOMs from DB:', err);
    } finally {
      setLoadingDb(false);
    }
  }, [notifyUpdated]);

  // Save Default Stock Thresholds Handler
  const handleSaveThresholds = async (e) => {
    e?.preventDefault();
    try {
      setSavingDb(true);
      const res = await API.put(`/api/inventory-category-uom/${activeModule}`, {
        defaultThresholds: thresholds,
      });
      if (res.data?.success) {
        const updated = res.data.defaultThresholds || thresholds;
        setThresholds(updated);
        localStorage.setItem(thresholdStorageKey, JSON.stringify(updated));
        notifyUpdated();
        showSuccessToast('Stock Threshold & Reorder Limits saved to database successfully!');
      } else {
        showErrorToast(res.data?.message || 'Failed to save thresholds.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save thresholds.';
      showErrorToast(msg);
    } finally {
      setSavingDb(false);
    }
  };

  // Sync state when modal opens or activeModule changes
  useEffect(() => {
    if (isOpen) {
      const targetModule =
        moduleType === 'raw_materials' || moduleType === 'rawmat' ? 'raw_materials' : 'finished_goods';
      setActiveModule(targetModule);
      setActiveTab(initialTab === 'uoms' ? 'uoms' : 'categories');
      setCategories(getStoredCategories([], targetModule));
      setUoms(getStoredUOMs([], targetModule));
      setThresholds(getStoredThresholds(targetModule));
      setNewCategoryInput('');
      setNewUomInput('');
      fetchFromDb(targetModule);
    }
  }, [isOpen, moduleType, initialTab, fetchFromDb]);

  if (!isOpen) return null;

  // Add Category Handler (Persisted to Database)
  const handleAddCategory = async (e) => {
    e?.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      showErrorToast('Please enter a valid Category name.');
      return;
    }

    const exists = categories.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      showErrorToast(`Category "${trimmed}" already exists in the list.`);
      return;
    }

    try {
      setSavingDb(true);
      const res = await API.post(`/api/inventory-category-uom/${activeModule}/category`, {
        category: trimmed,
      });

      if (res.data?.success) {
        const updated = res.data.categories;
        setCategories(updated);
        localStorage.setItem(categoryStorageKey, JSON.stringify(updated));
        notifyUpdated();
        showSuccessToast(`Category "${trimmed}" saved to database successfully!`);
        setNewCategoryInput('');
      } else {
        showErrorToast(res.data?.message || 'Failed to save category to database.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save category.';
      showErrorToast(msg);
    } finally {
      setSavingDb(false);
    }
  };

  // Delete Category Handler (Persisted to Database)
  const handleDeleteCategory = async (catToDelete) => {
    if (categories.length <= 1) {
      showErrorToast('At least one category must be kept in the system.');
      return;
    }

    try {
      setSavingDb(true);
      const res = await API.delete(`/api/inventory-category-uom/${activeModule}/category`, {
        data: { category: catToDelete },
      });

      if (res.data?.success) {
        const updated = res.data.categories;
        setCategories(updated);
        localStorage.setItem(categoryStorageKey, JSON.stringify(updated));
        notifyUpdated();
        showSuccessToast(`Category "${catToDelete}" removed from database.`);
      } else {
        showErrorToast(res.data?.message || 'Failed to delete category.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update categories.';
      showErrorToast(msg);
    } finally {
      setSavingDb(false);
    }
  };

  // Add UOM Handler (Persisted to Database)
  const handleAddUom = async (e) => {
    e?.preventDefault();
    const trimmed = newUomInput.trim();
    if (!trimmed) {
      showErrorToast('Please enter a valid Unit of Measure name.');
      return;
    }

    const exists = uoms.some(
      (u) => u.toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      showErrorToast(`Unit "${trimmed}" already exists in the list.`);
      return;
    }

    try {
      setSavingDb(true);
      const res = await API.post(`/api/inventory-category-uom/${activeModule}/uom`, {
        uom: trimmed,
      });

      if (res.data?.success) {
        const updated = res.data.uoms;
        setUoms(updated);
        localStorage.setItem(uomStorageKey, JSON.stringify(updated));
        notifyUpdated();
        showSuccessToast(`Unit of Measure "${trimmed}" saved to database successfully!`);
        setNewUomInput('');
      } else {
        showErrorToast(res.data?.message || 'Failed to save Unit of Measure to database.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save UOM.';
      showErrorToast(msg);
    } finally {
      setSavingDb(false);
    }
  };

  // Delete UOM Handler (Persisted to Database)
  const handleDeleteUom = async (uomToDelete) => {
    if (uoms.length <= 1) {
      showErrorToast('At least one Unit of Measure must be kept in the system.');
      return;
    }

    try {
      setSavingDb(true);
      const res = await API.delete(`/api/inventory-category-uom/${activeModule}/uom`, {
        data: { uom: uomToDelete },
      });

      if (res.data?.success) {
        const updated = res.data.uoms;
        setUoms(updated);
        localStorage.setItem(uomStorageKey, JSON.stringify(updated));
        notifyUpdated();
        showSuccessToast(`Unit of Measure "${uomToDelete}" removed from database.`);
      } else {
        showErrorToast(res.data?.message || 'Failed to delete Unit of Measure.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update UOMs.';
      showErrorToast(msg);
    } finally {
      setSavingDb(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[85vh] sm:max-h-[88vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER (NO ICON - EXACT ADD FINISHED PRODUCT SPEC) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <h3 className="text-sm font-bold text-slate-800 whitespace-nowrap">
            {isRaw ? 'Raw Materials Master Configuration' : 'Finished Goods Master Configuration'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1 custom-scrollbar text-xs sm:text-sm">
          {/* TOP CARD: MODULE SPECIFICATION */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {isRaw ? 'Raw Materials Master Configuration' : 'Finished Goods Master Configuration'}
              </h4>
              <p className="text-[11px] text-slate-500">
                Item-specific rules evaluated for {isRaw ? 'raw materials' : 'finished goods'} categories & units of measure (UOM).
              </p>
            </div>

            {/* 2-COLUMN SEGMENTED SWITCHER (CATEGORIES, UOM UNITS) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  activeTab === 'categories'
                    ? 'bg-white border-[#01390f] shadow-xs ring-1 ring-[#01390f]/20'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                <div className="min-w-0 pr-1">
                  <span className="block text-xs font-bold text-slate-800 truncate">Categories</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Product groupings</span>
                </div>
                <span
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-mono font-bold shrink-0 ${
                    activeTab === 'categories'
                      ? 'bg-[#01390f] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {categories.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('uoms')}
                className={`p-3 rounded-xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  activeTab === 'uoms'
                    ? 'bg-white border-[#01390f] shadow-xs ring-1 ring-[#01390f]/20'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                }`}
              >
                <div className="min-w-0 pr-1">
                  <span className="block text-xs font-bold text-slate-800 truncate">UOM Units</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">Measurement units</span>
                </div>
                <span
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-mono font-bold shrink-0 ${
                    activeTab === 'uoms'
                      ? 'bg-[#01390f] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {uoms.length}
                </span>
              </button>
            </div>
          </div>

          {/* ACTIVE TAB CONTENT */}
          {activeTab === 'categories' ? (
            <div className="flex flex-col gap-4">
              {/* ADD CATEGORY INPUT */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                  Add New {isRaw ? 'Raw Material' : 'Finished Goods'} Category
                </label>
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    disabled={savingDb}
                    placeholder={
                      isRaw
                        ? 'Type category name (e.g. Active Ingredients, Preservatives)...'
                        : 'Type category name (e.g. Serums & Essences, Sun Care)...'
                    }
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={savingDb || !newCategoryInput.trim()}
                    className="px-6 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap bg-[#01390f] hover:bg-[#0a5219] text-white disabled:opacity-50"
                  >
                    {savingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>{savingDb ? 'Saving...' : '+ Add Category'}</span>
                  </button>
                </form>
              </div>

              {/* LIST OF CATEGORIES CARD */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {isRaw ? 'Raw Material' : 'Finished Goods'} Categories
                  </span>
                </div>

                <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar bg-white shadow-2xs">
                  {categories.map((cat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-50/90 transition-colors"
                    >
                      <span className="font-semibold text-slate-800 text-xs sm:text-sm pl-1">
                        {cat}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={savingDb}
                        title={`Delete category "${cat}"`}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors text-xs inline-flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200/80 text-blue-900 rounded-xl p-3 sm:p-3.5 text-xs font-medium">
                Categories saved here are persisted in the cloud database specifically for <strong className="font-bold">{isRaw ? 'Raw Materials' : 'Finished Goods'}</strong> and stay synchronized across all devices.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* ADD UOM INPUT */}
              <div>
                <label className="block font-semibold text-slate-600 mb-1 whitespace-nowrap text-xs">
                  Add New {isRaw ? 'Raw Material' : 'Finished Goods'} Unit of Measure (UOM)
                </label>
                <form onSubmit={handleAddUom} className="flex gap-2">
                  <input
                    type="text"
                    value={newUomInput}
                    onChange={(e) => setNewUomInput(e.target.value)}
                    disabled={savingDb}
                    placeholder={
                      isRaw
                        ? 'Type unit name (e.g. drum, pail, sack, kg, L)...'
                        : 'Type unit name (e.g. bottle, jar, box, pack, tube)...'
                    }
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-[#01390f] transition-all shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={savingDb || !newUomInput.trim()}
                    className="px-6 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap bg-[#01390f] hover:bg-[#0a5219] text-white disabled:opacity-50"
                  >
                    {savingDb ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>{savingDb ? 'Saving...' : '+ Add UOM'}</span>
                  </button>
                </form>
              </div>

              {/* LIST OF UOMS CARD */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {isRaw ? 'Raw Material' : 'Finished Goods'} Units
                  </span>
                </div>

                <div className="border border-slate-200/80 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar bg-white shadow-2xs">
                  {uoms.map((unit, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 sm:p-3 hover:bg-slate-50/90 transition-colors"
                    >
                      <span className="font-mono font-bold text-xs uppercase text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md ml-1">
                        {unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteUom(unit)}
                        disabled={savingDb}
                        title={`Delete unit "${unit}"`}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-bold px-2 py-1 rounded-lg cursor-pointer transition-colors text-xs inline-flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50/70 border border-blue-200/80 text-blue-900 rounded-xl p-3 sm:p-3.5 text-xs font-medium">
                Units of Measure saved here are persisted in the cloud database specifically for <strong className="font-bold">{isRaw ? 'Raw Materials' : 'Finished Goods'}</strong> dropdowns.
              </div>
            </div>
          )}
        </div>

        {/* ACTION BUTTONS FOOTER */}
        <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
