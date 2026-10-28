import LogisticsShippingSetting from '../models/LogisticsShippingSetting.js';
import Collection from '../models/MarketingCollection.js';
import mongoose from 'mongoose';

const DEFAULT_REGIONS = [
  {
    key: 'ncr',
    name: 'Metro Manila (NCR)',
    rate: 65,
    estimatedDays: '1-3 Business Days',
    description: 'Manila, Quezon City, Makati, Taguig, Pasig, Mandaluyong, and all NCR cities',
    isActive: true,
  },
  {
    key: 'luzon',
    name: 'Luzon (North & South)',
    rate: 85,
    estimatedDays: '2-4 Business Days',
    description: 'Laguna, Cavite, Batangas, Rizal, Bulacan, Pampanga, Central & Northern Luzon',
    isActive: true,
  },
  {
    key: 'visayas',
    name: 'Visayas',
    rate: 135,
    estimatedDays: '4-7 Business Days',
    description: 'Cebu, Iloilo, Bohol, Negros, Leyte, Samar, and Western/Central/Eastern Visayas',
    isActive: true,
  },
  {
    key: 'mindanao',
    name: 'Mindanao',
    rate: 155,
    estimatedDays: '5-8 Business Days',
    description: 'Davao, Cagayan de Oro, General Santos, Zamboanga, Bukidnon, and Mindanao provinces',
    isActive: true,
  },
  {
    key: 'islands',
    name: 'Island & Remote Areas',
    rate: 180,
    estimatedDays: '7-10 Business Days',
    description: 'Palawan, Batanes, Catanduanes, Romblon, Dinagat, and remote island archipelagos',
    isActive: true,
  },
];

const DEFAULT_OVERRIDES = [
  {
    locationName: 'Laguna',
    rate: 50,
    estimatedDays: '1-2 Business Days',
    notes: 'Near Laguna Manufacturing Plant / Hub (Special Local Rate)',
    isActive: true,
  },
  {
    locationName: 'Calamba City',
    rate: 45,
    estimatedDays: 'Same-Day / Next-Day',
    notes: 'Local City Express Dropoff',
    isActive: true,
  },
];

/**
 * Get or seed default shipping settings
 */
export const getOrSeedShippingSettings = async () => {
  let setting = await LogisticsShippingSetting.findOne({ settingKey: 'primary' });
  if (!setting) {
    setting = new LogisticsShippingSetting({
      settingKey: 'primary',
      defaultRate: 115,
      freeShippingEnabled: true,
      freeShippingThreshold: 1500,
      regions: DEFAULT_REGIONS,
      customOverrides: DEFAULT_OVERRIDES,
      lastUpdatedBy: 'System Default',
    });
    await setting.save();
  }
  return setting;
};

/**
 * Helper to match an address to a shipping region or custom override
 */
export const matchAddressToRegion = (address, setting) => {
  if (!address) {
    return {
      regionKey: 'default',
      name: 'Standard Delivery',
      rate: Number(setting?.defaultRate ?? 115),
      estimatedDays: '3-5 Business Days',
    };
  }

  let addrStr = '';
  if (typeof address === 'string') {
    addrStr = address.toLowerCase();
  } else if (typeof address === 'object') {
    addrStr = [
      address.province,
      address.city,
      address.region,
      address.barangay,
      address.street,
      address.streetAddress,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  // 1. Custom Overrides check (e.g. Laguna, Calamba City, etc.)
  if (Array.isArray(setting?.customOverrides)) {
    for (const ov of setting.customOverrides) {
      if (ov.isActive && ov.locationName) {
        const locLower = ov.locationName.toLowerCase().trim();
        if (locLower && addrStr.includes(locLower)) {
          return {
            regionKey: 'custom',
            name: ov.locationName,
            rate: Number(ov.rate || 0),
            estimatedDays: ov.estimatedDays || '1-3 Business Days',
            notes: ov.notes || 'Custom Location Rate',
            isCustomOverride: true,
          };
        }
      }
    }
  }

  // 2. NCR Detection
  const ncrKeywords = [
    'ncr', 'metro manila', 'manila', 'quezon city', 'makati', 'taguig',
    'pasig', 'mandaluyong', 'parañaque', 'paranaque', 'las piñas', 'las pinas',
    'muntinlupa', 'marikina', 'pasay', 'caloocan', 'malabon', 'navotas',
    'valenzuela', 'san juan', 'pateros'
  ];
  if (ncrKeywords.some((k) => addrStr.includes(k))) {
    const ncrRegion = setting?.regions?.find((r) => r.key === 'ncr' && r.isActive);
    if (ncrRegion) {
      return {
        regionKey: 'ncr',
        name: ncrRegion.name,
        rate: Number(ncrRegion.rate || 0),
        estimatedDays: ncrRegion.estimatedDays,
      };
    }
  }

  // 3. Island / Remote keywords
  const islandKeywords = [
    'palawan', 'batanes', 'catanduanes', 'marinduque', 'romblon',
    'dinagat', 'basilan', 'sulu', 'tawi-tawi', 'siargao'
  ];
  if (islandKeywords.some((k) => addrStr.includes(k))) {
    const islRegion = setting?.regions?.find((r) => r.key === 'islands' && r.isActive);
    if (islRegion) {
      return {
        regionKey: 'islands',
        name: islRegion.name,
        rate: Number(islRegion.rate || 0),
        estimatedDays: islRegion.estimatedDays,
      };
    }
  }

  // 4. Visayas Detection
  const visayasKeywords = [
    'visayas', 'cebu', 'bohol', 'iloilo', 'negros', 'bacolod', 'dumaguete',
    'leyte', 'tacloban', 'samar', 'capiz', 'roxas', 'aklan', 'boracay',
    'antique', 'guimaras', 'siquijor', 'biliran'
  ];
  if (visayasKeywords.some((k) => addrStr.includes(k))) {
    const visRegion = setting?.regions?.find((r) => r.key === 'visayas' && r.isActive);
    if (visRegion) {
      return {
        regionKey: 'visayas',
        name: visRegion.name,
        rate: Number(visRegion.rate || 0),
        estimatedDays: visRegion.estimatedDays,
      };
    }
  }

  // 5. Mindanao Detection
  const mindanaoKeywords = [
    'mindanao', 'davao', 'cagayan de oro', 'cdo', 'general santos', 'gensan',
    'zamboanga', 'bukidnon', 'camiguin', 'lanao', 'cotabato', 'sultan kudarat',
    'sarangani', 'agusan', 'butuan', 'surigao', 'misamis', 'iligan', 'barmm'
  ];
  if (mindanaoKeywords.some((k) => addrStr.includes(k))) {
    const minRegion = setting?.regions?.find((r) => r.key === 'mindanao' && r.isActive);
    if (minRegion) {
      return {
        regionKey: 'mindanao',
        name: minRegion.name,
        rate: Number(minRegion.rate || 0),
        estimatedDays: minRegion.estimatedDays,
      };
    }
  }

  // 6. Luzon Detection
  const luzonKeywords = [
    'luzon', 'laguna', 'cavite', 'batangas', 'rizal', 'quezon', 'bulacan',
    'pampanga', 'bataan', 'zambales', 'nueva ecija', 'tarlac', 'pangasinan',
    'la union', 'ilocos', 'benguet', 'baguio', 'isabela', 'cagayan',
    'nueva vizcaya', 'quirino', 'aurora', 'albay', 'bicol', 'camarines',
    'sorsogon', 'masbate'
  ];
  if (luzonKeywords.some((k) => addrStr.includes(k))) {
    const luzRegion = setting?.regions?.find((r) => r.key === 'luzon' && r.isActive);
    if (luzRegion) {
      return {
        regionKey: 'luzon',
        name: luzRegion.name,
        rate: Number(luzRegion.rate || 0),
        estimatedDays: luzRegion.estimatedDays,
      };
    }
  }

  // 7. Fallback to defaultRate
  return {
    regionKey: 'default',
    name: 'Standard Nationwide Delivery',
    rate: Number(setting?.defaultRate ?? 115),
    estimatedDays: '3-5 Business Days',
  };
};

/**
 * 1. GET /api/shipping-rates
 * Returns the current shipping settings and regions
 */
export const getShippingSettings = async (req, res) => {
  try {
    const setting = await getOrSeedShippingSettings();
    return res.status(200).json({
      success: true,
      settings: setting,
    });
  } catch (error) {
    console.error('Error fetching shipping settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping settings.',
      error: error.message,
    });
  }
};

/**
 * 2. PUT /api/shipping-rates
 * Updates the global shipping settings
 */
export const updateShippingSettings = async (req, res) => {
  try {
    const {
      defaultRate,
      freeShippingEnabled,
      freeShippingThreshold,
      regions,
      customOverrides,
      updatedBy,
    } = req.body;

    let setting = await getOrSeedShippingSettings();

    if (defaultRate !== undefined) setting.defaultRate = Math.max(0, Number(defaultRate));
    if (freeShippingEnabled !== undefined) setting.freeShippingEnabled = Boolean(freeShippingEnabled);
    if (freeShippingThreshold !== undefined) {
      setting.freeShippingThreshold = Math.max(0, Number(freeShippingThreshold));
    }
    if (Array.isArray(regions)) setting.regions = regions;
    if (Array.isArray(customOverrides)) setting.customOverrides = customOverrides;
    setting.lastUpdatedBy = updatedBy || req.user?.username || req.user?.fullName || 'Logistics';

    await setting.save();

    return res.status(200).json({
      success: true,
      message: 'Shipping settings saved successfully.',
      settings: setting,
    });
  } catch (error) {
    console.error('Error updating shipping settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update shipping settings.',
      error: error.message,
    });
  }
};

/**
 * 3. POST /api/shipping-rates/calculate
 * Calculate shipping fee dynamically based on location and products
 */
export const calculateShippingFee = async (req, res) => {
  try {
    const { address, items = [], subtotal = 0 } = req.body;
    const setting = await getOrSeedShippingSettings();

    const matched = matchAddressToRegion(address, setting);

    // Calculate subtotal from items if not provided
    let merchandiseSubtotal = Number(subtotal || 0);
    if (!merchandiseSubtotal && Array.isArray(items) && items.length > 0) {
      merchandiseSubtotal = items.reduce(
        (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1),
        0
      );
    }

    // Check Free Shipping Threshold promo
    const isOverFreeThreshold =
      setting.freeShippingEnabled &&
      setting.freeShippingThreshold > 0 &&
      merchandiseSubtotal >= setting.freeShippingThreshold;

    // Check product-specific shipping fee
    let productShippingSurcharge = 0;
    let hasAllFreeShippingProducts = items.length > 0;

    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const prodId = it.product || it._id || it.id;
        if (prodId && mongoose.Types.ObjectId.isValid(prodId)) {
          const colProduct = await Collection.findById(prodId).lean().catch(() => null);
          if (colProduct) {
            if (!colProduct.isFreeShipping) {
              hasAllFreeShippingProducts = false;
            }
            if (colProduct.shippingFee && Number(colProduct.shippingFee) > 0) {
              productShippingSurcharge += Number(colProduct.shippingFee);
            }
          } else {
            hasAllFreeShippingProducts = false;
          }
        } else {
          hasAllFreeShippingProducts = false;
        }
      }
    } else {
      hasAllFreeShippingProducts = false;
    }

    let finalFee = matched.rate;

    // If all items have free shipping, fee is 0
    if (hasAllFreeShippingProducts) {
      finalFee = 0;
    } else if (isOverFreeThreshold) {
      finalFee = 0;
    } else {
      finalFee = Math.max(0, finalFee + productShippingSurcharge);
    }

    return res.status(200).json({
      success: true,
      shippingFee: finalFee,
      isFreeShipping: finalFee === 0,
      matchedRegion: matched.name,
      matchedRegionKey: matched.regionKey,
      estimatedDays: matched.estimatedDays,
      isOverFreeThreshold,
      freeShippingThreshold: setting.freeShippingThreshold,
      productShippingSurcharge,
    });
  } catch (error) {
    console.error('Error calculating shipping fee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate shipping fee.',
      shippingFee: 115,
      error: error.message,
    });
  }
};

/**
 * 4. GET /api/shipping-rates/products
 * Fetch all catalog products with their Store Price, product shipping fee, and free shipping state
 */
export const getProductsShipping = async (req, res) => {
  try {
    const products = await Collection.find()
      .select('_id code itemDescription category price originalPrice image images shippingFee isFreeShipping isPublished quantity')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      products: products || [],
    });
  } catch (error) {
    console.error('Error fetching products shipping data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product shipping data.',
      error: error.message,
    });
  }
};

/**
 * 5. PUT /api/shipping-rates/products/:id
 * Update individual product shipping fee & free shipping toggle
 */
export const updateProductShipping = async (req, res) => {
  try {
    const { id } = req.params;
    const { shippingFee, isFreeShipping } = req.body;

    const updated = await Collection.findByIdAndUpdate(
      id,
      {
        $set: {
          shippingFee: Math.max(0, Number(shippingFee || 0)),
          isFreeShipping: Boolean(isFreeShipping),
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product shipping fee updated successfully.',
      product: updated,
    });
  } catch (error) {
    console.error('Error updating product shipping fee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product shipping fee.',
      error: error.message,
    });
  }
};

/**
 * 6. PUT /api/shipping-rates/products-bulk
 * Bulk update product shipping fees
 */
export const bulkUpdateProductShipping = async (req, res) => {
  try {
    const { updates = [] } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No product updates provided.' });
    }

    const bulkOps = updates.map((u) => ({
      updateOne: {
        filter: { _id: u._id || u.id },
        update: {
          $set: {
            shippingFee: Math.max(0, Number(u.shippingFee || 0)),
            isFreeShipping: Boolean(u.isFreeShipping),
          },
        },
      },
    }));

    await Collection.bulkWrite(bulkOps);

    return res.status(200).json({
      success: true,
      message: `Successfully updated shipping fees for ${updates.length} products.`,
    });
  } catch (error) {
    console.error('Error bulk updating product shipping fees:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk update product shipping fees.',
      error: error.message,
    });
  }
};
