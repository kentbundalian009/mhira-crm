import LogisticsShippingSetting from '../models/LogisticsShippingSetting.js';
import Collection from '../models/MarketingCollection.js';

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
 * Helper to extract dynamic keywords from a region's description/name
 */
const extractRegionKeywords = (region, builtInKeywords = []) => {
  const dynamic = [];
  if (region?.description) {
    region.description
      .split(/[,/()]+/)
      .map((s) => s.replace(/\band\b/gi, '').trim().toLowerCase())
      .filter((s) => s.length >= 3)
      .forEach((s) => dynamic.push(s));
  }
  return Array.from(new Set([...builtInKeywords, ...dynamic]));
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

  // 1. Custom Overrides check — sort by longest locationName first so specific city (e.g. "Calamba City") matches before province ("Laguna")
  if (Array.isArray(setting?.customOverrides)) {
    const sortedOverrides = [...setting.customOverrides]
      .filter((ov) => ov && ov.isActive && ov.locationName)
      .sort((a, b) => (b.locationName?.length || 0) - (a.locationName?.length || 0));

    for (const ov of sortedOverrides) {
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

  // 2. NCR Detection
  const ncrRegion = setting?.regions?.find((r) => r.key === 'ncr' && r.isActive);
  if (ncrRegion) {
    const ncrKeywords = extractRegionKeywords(ncrRegion, [
      'ncr', 'metro manila', 'manila', 'quezon city', 'makati', 'taguig',
      'pasig', 'mandaluyong', 'parañaque', 'paranaque', 'las piñas', 'las pinas',
      'muntinlupa', 'marikina', 'pasay', 'caloocan', 'malabon', 'navotas',
      'valenzuela', 'san juan', 'pateros',
    ]);
    if (ncrKeywords.some((k) => addrStr.includes(k))) {
      return {
        regionKey: 'ncr',
        name: ncrRegion.name,
        rate: Number(ncrRegion.rate || 0),
        estimatedDays: ncrRegion.estimatedDays,
      };
    }
  }

  // 3. Island / Remote keywords
  const islRegion = setting?.regions?.find((r) => r.key === 'islands' && r.isActive);
  if (islRegion) {
    const islandKeywords = extractRegionKeywords(islRegion, [
      'palawan', 'batanes', 'catanduanes', 'marinduque', 'romblon',
      'dinagat', 'basilan', 'sulu', 'tawi-tawi', 'siargao',
    ]);
    if (islandKeywords.some((k) => addrStr.includes(k))) {
      return {
        regionKey: 'islands',
        name: islRegion.name,
        rate: Number(islRegion.rate || 0),
        estimatedDays: islRegion.estimatedDays,
      };
    }
  }

  // 4. Visayas Detection
  const visRegion = setting?.regions?.find((r) => r.key === 'visayas' && r.isActive);
  if (visRegion) {
    const visayasKeywords = extractRegionKeywords(visRegion, [
      'visayas', 'cebu', 'bohol', 'iloilo', 'negros', 'bacolod', 'dumaguete',
      'leyte', 'tacloban', 'samar', 'capiz', 'roxas', 'aklan', 'boracay',
      'antique', 'guimaras', 'siquijor', 'biliran',
    ]);
    if (visayasKeywords.some((k) => addrStr.includes(k))) {
      return {
        regionKey: 'visayas',
        name: visRegion.name,
        rate: Number(visRegion.rate || 0),
        estimatedDays: visRegion.estimatedDays,
      };
    }
  }

  // 5. Mindanao Detection
  const minRegion = setting?.regions?.find((r) => r.key === 'mindanao' && r.isActive);
  if (minRegion) {
    const mindanaoKeywords = extractRegionKeywords(minRegion, [
      'mindanao', 'davao', 'cagayan de oro', 'cdo', 'general santos', 'gensan',
      'zamboanga', 'bukidnon', 'camiguin', 'lanao', 'cotabato', 'sultan kudarat',
      'sarangani', 'agusan', 'butuan', 'surigao', 'misamis', 'iligan', 'barmm',
    ]);
    if (mindanaoKeywords.some((k) => addrStr.includes(k))) {
      return {
        regionKey: 'mindanao',
        name: minRegion.name,
        rate: Number(minRegion.rate || 0),
        estimatedDays: minRegion.estimatedDays,
      };
    }
  }

  // 6. Luzon Detection
  const luzRegion = setting?.regions?.find((r) => r.key === 'luzon' && r.isActive);
  if (luzRegion) {
    const luzonKeywords = extractRegionKeywords(luzRegion, [
      'luzon', 'laguna', 'calamba', 'cavite', 'batangas', 'rizal', 'quezon', 'bulacan',
      'pampanga', 'bataan', 'zambales', 'nueva ecija', 'tarlac', 'pangasinan',
      'la union', 'ilocos', 'benguet', 'baguio', 'isabela', 'cagayan',
      'nueva vizcaya', 'quirino', 'aurora', 'albay', 'bicol', 'camarines',
      'sorsogon', 'masbate',
    ]);
    if (luzonKeywords.some((k) => addrStr.includes(k))) {
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
 * Shared authoritative helper to compute location-based shipping fee
 * Used by Cart, Checkout, Order creation, and PayMongo Checkout Session
 */
export const computeLocationShipping = async ({ address, items = [], subtotal = 0 }) => {
  const setting = await getOrSeedShippingSettings();
  const matched = matchAddressToRegion(address, setting);

  let merchandiseSubtotal = Number(subtotal || 0);
  if (!merchandiseSubtotal && Array.isArray(items) && items.length > 0) {
    merchandiseSubtotal = items.reduce(
      (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
  }

  const isOverFreeThreshold =
    Boolean(setting.freeShippingEnabled) &&
    Number(setting.freeShippingThreshold) > 0 &&
    merchandiseSubtotal >= Number(setting.freeShippingThreshold);

  // Purely location-based shipping fee (or ₱0 when Free Shipping threshold is met)
  const finalFee = isOverFreeThreshold ? 0 : Math.max(0, Number(matched.rate || 0));

  return {
    shippingFee: finalFee,
    baseRegionRate: Number(matched.rate || 0),
    isFreeShipping: finalFee === 0,
    matchedRegion: matched.name,
    matchedRegionKey: matched.regionKey,
    estimatedDays: matched.estimatedDays || '2-5 Business Days',
    isOverFreeThreshold,
    freeShippingEnabled: Boolean(setting.freeShippingEnabled),
    freeShippingThreshold: Number(setting.freeShippingThreshold || 0),
    productShippingSurcharge: 0,
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
    if (freeShippingEnabled !== undefined) {
      setting.freeShippingEnabled = Boolean(freeShippingEnabled);
    }
    if (freeShippingThreshold !== undefined) {
      setting.freeShippingThreshold = Math.max(0, Number(freeShippingThreshold));
    }
    if (Array.isArray(regions)) {
      setting.regions = regions.map((r) => ({
        key: r.key === 'island' ? 'islands' : (r.key || r.id || 'luzon'),
        name: r.name || 'Delivery Region',
        rate: Math.max(0, Number(r.rate ?? r.fee ?? 0)),
        estimatedDays: r.estimatedDays || '2-4 Business Days',
        description: r.description || '',
        isActive: r.isActive !== false,
      }));
    }
    if (Array.isArray(customOverrides)) {
      setting.customOverrides = customOverrides.map((ov) => ({
        locationName: String(ov.locationName || ov.name || '').trim(),
        rate: Math.max(0, Number(ov.rate ?? ov.fee ?? 0)),
        estimatedDays: ov.estimatedDays || '1-3 Business Days',
        notes: ov.notes || ov.description || '',
        isActive: ov.isActive !== false,
      }));
    }
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
 * Calculate shipping fee dynamically based on customer location and subtotal
 */
export const calculateShippingFee = async (req, res) => {
  try {
    const { address, items = [], subtotal = 0 } = req.body;
    const result = await computeLocationShipping({ address, items, subtotal });

    return res.status(200).json({
      success: true,
      ...result,
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
 * Legacy product shipping endpoints kept for route compatibility
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
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product shipping data.',
      error: error.message,
    });
  }
};

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
    return res.status(200).json({
      success: true,
      product: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const bulkUpdateProductShipping = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Location-based shipping is active.',
  });
};
