import InventoryCategoryUom from '../models/InventoryCategoryUom.js';

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

const normalizeModuleType = (type) => {
  if (!type) return 'finished_goods';
  const clean = String(type).toLowerCase().trim();
  if (clean === 'raw_materials' || clean === 'rawmat' || clean === 'raw') {
    return 'raw_materials';
  }
  return 'finished_goods';
};

// GET config for a moduleType (auto-initializes if missing)
export const getConfig = async (req, res) => {
  try {
    const moduleType = normalizeModuleType(req.params.moduleType || req.query.moduleType);
    let doc = await InventoryCategoryUom.findOne({ moduleType }).lean();

    const defaultCats = moduleType === 'raw_materials' ? DEFAULT_RM_CATEGORIES : DEFAULT_FG_CATEGORIES;
    const defaultUoms = moduleType === 'raw_materials' ? DEFAULT_RM_UOMS : DEFAULT_FG_UOMS;
    const initialThresholds = moduleType === 'raw_materials'
      ? { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 1000 }
      : { criticalLevel: 0, restockWarningPoint: 10, overstockLimitPoint: 1000 };

    if (!doc) {
      doc = await InventoryCategoryUom.create({
        moduleType,
        categories: defaultCats,
        uoms: defaultUoms,
        defaultThresholds: initialThresholds,
      });
      doc = doc.toObject();
    }

    const defaultThresholds = doc.defaultThresholds || initialThresholds;

    return res.status(200).json({
      success: true,
      moduleType,
      categories: (doc.categories || []).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
      ),
      uoms: (doc.uoms || []).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
      ),
      defaultThresholds,
    });
  } catch (error) {
    console.error('Error fetching inventory category & UOM config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load configuration from database.',
      error: error.message,
    });
  }
};

// PUT update entire config for moduleType
export const updateConfig = async (req, res) => {
  try {
    const moduleType = normalizeModuleType(req.params.moduleType || req.body.moduleType);
    const { categories, uoms, defaultThresholds } = req.body;

    const updatePayload = {};

    if (Array.isArray(categories)) {
      updatePayload.categories = Array.from(
        new Set(categories.map((c) => String(c).trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
    }

    if (Array.isArray(uoms)) {
      updatePayload.uoms = Array.from(
        new Set(uoms.map((u) => String(u).trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
    }

    if (defaultThresholds && typeof defaultThresholds === 'object') {
      updatePayload.defaultThresholds = {
        criticalLevel: Math.max(0, Number(defaultThresholds.criticalLevel) || 0),
        restockWarningPoint: Math.max(0, Number(defaultThresholds.restockWarningPoint) || 0),
        overstockLimitPoint: Math.max(1, Number(defaultThresholds.overstockLimitPoint) || 1000),
      };
    }

    const updated = await InventoryCategoryUom.findOneAndUpdate(
      { moduleType },
      { $set: updatePayload },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: `${moduleType === 'raw_materials' ? 'Raw Materials' : 'Finished Goods'} configuration saved to database successfully!`,
      moduleType,
      categories: updated.categories || [],
      uoms: updated.uoms || [],
      defaultThresholds: updated.defaultThresholds || defaultThresholds,
    });
  } catch (error) {
    console.error('Error updating inventory category & UOM config:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save configuration to database.',
      error: error.message,
    });
  }
};

// POST add single category
export const addCategory = async (req, res) => {
  try {
    const moduleType = normalizeModuleType(req.params.moduleType);
    const categoryName = String(req.body.category || req.body.name || '').trim();

    if (!categoryName) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const doc = await InventoryCategoryUom.findOne({ moduleType });
    const currentCats = doc?.categories || (moduleType === 'raw_materials' ? DEFAULT_RM_CATEGORIES : DEFAULT_FG_CATEGORIES);

    const exists = currentCats.some((c) => c.toLowerCase() === categoryName.toLowerCase());
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Category "${categoryName}" already exists.`,
      });
    }

    const newCats = [...currentCats, categoryName].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );

    const updated = await InventoryCategoryUom.findOneAndUpdate(
      { moduleType },
      { $set: { categories: newCats } },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: `Category "${categoryName}" added successfully!`,
      categories: updated.categories,
      uoms: updated.uoms,
    });
  } catch (error) {
    console.error('Error adding category:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE single category
export const deleteCategory = async (req, res) => {
  try {
    const moduleType = normalizeModuleType(req.params.moduleType);
    const categoryName = String(req.body.category || req.query.category || '').trim();

    if (!categoryName) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const doc = await InventoryCategoryUom.findOne({ moduleType });
    const currentCats = doc?.categories || [];

    if (currentCats.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'At least one category must remain configured in the database.',
      });
    }

    const newCats = currentCats.filter(
      (c) => c.toLowerCase() !== categoryName.toLowerCase()
    );

    const updated = await InventoryCategoryUom.findOneAndUpdate(
      { moduleType },
      { $set: { categories: newCats } },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: `Category "${categoryName}" removed successfully!`,
      categories: updated.categories,
      uoms: updated.uoms,
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST add single UOM
export const addUom = async (req, res) => {
  try {
    const moduleType = normalizeModuleType(req.params.moduleType);
    const uomName = String(req.body.uom || req.body.unit || '').trim();

    if (!uomName) {
      return res.status(400).json({ success: false, message: 'Unit of Measure is required.' });
    }

    const doc = await InventoryCategoryUom.findOne({ moduleType });
    const currentUoms = doc?.uoms || (moduleType === 'raw_materials' ? DEFAULT_RM_UOMS : DEFAULT_FG_UOMS);

    const exists = currentUoms.some((u) => u.toLowerCase() === uomName.toLowerCase());
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Unit "${uomName}" already exists.`,
      });
    }

    const newUoms = [...currentUoms, uomName].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
    );

    const updated = await InventoryCategoryUom.findOneAndUpdate(
      { moduleType },
      { $set: { uoms: newUoms } },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: `Unit of Measure "${uomName}" added successfully!`,
      categories: updated.categories,
      uoms: updated.uoms,
    });
  } catch (error) {
    console.error('Error adding UOM:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE single UOM
export const deleteUom = async (req, res) => {
  try {
    const moduleType = normalizeModuleType(req.params.moduleType);
    const uomName = String(req.body.uom || req.query.uom || '').trim();

    if (!uomName) {
      return res.status(400).json({ success: false, message: 'Unit of Measure is required.' });
    }

    const doc = await InventoryCategoryUom.findOne({ moduleType });
    const currentUoms = doc?.uoms || [];

    if (currentUoms.length <= 1) {
      return res.status(400).json({
        success: false,
        message: 'At least one Unit of Measure must remain configured in the database.',
      });
    }

    const newUoms = currentUoms.filter(
      (u) => u.toLowerCase() !== uomName.toLowerCase()
    );

    const updated = await InventoryCategoryUom.findOneAndUpdate(
      { moduleType },
      { $set: { uoms: newUoms } },
      { new: true, upsert: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: `Unit of Measure "${uomName}" removed successfully!`,
      categories: updated.categories,
      uoms: updated.uoms,
    });
  } catch (error) {
    console.error('Error deleting UOM:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

