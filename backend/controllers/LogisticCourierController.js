import LogisticCourier from '../models/LogisticCourier.js';

// Default couriers for initial seed
const DEFAULT_COURIERS = [
  { code: 'CR0001', name: 'J&T Express', address: 'Metro Manila Hub, Philippines' },
  { code: 'CR0002', name: 'Lalamove', address: 'Quezon City Operations Center' },
  { code: 'CR0003', name: 'Flash Express', address: 'Paranaque Sorting Facility' },
  { code: 'CR0004', name: 'Ninja Van', address: 'Taguig Sorting Hub' },
  { code: 'CR0005', name: 'Mhira In-House Rider', address: 'MHIRA Logistics Hub, Calamba, Laguna' },
];

// Get all couriers (with optional search)
export const getCouriers = async (req, res) => {
  try {
    const { search } = req.query;

    // Check count and auto-seed defaults if table is empty
    const count = await LogisticCourier.countDocuments();
    if (count === 0) {
      await LogisticCourier.insertMany(DEFAULT_COURIERS);
    }

    let query = {};
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { address: searchRegex },
      ];
    }

    const couriers = await LogisticCourier.find(query).sort({ createdAt: 1 }).lean().maxTimeMS(5000);
    return res.status(200).json(couriers || []);
  } catch (error) {
    console.error('Error fetching couriers:', error);
    return res.status(500).json({ message: 'Failed to fetch couriers', error: error.message });
  }
};

// Create a new courier
export const createCourier = async (req, res) => {
  try {
    const { code, name, address } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Courier name is required.' });
    }

    let courierCode = code;

    // Auto-generate code starting from CR0001 if code missing or blank
    if (!courierCode || courierCode.trim() === '') {
      const allCouriers = await LogisticCourier.find({}, 'code');
      let maxNum = 0;
      allCouriers.forEach((c) => {
        if (c.code) {
          const match = c.code.match(/^(?:CR-?|CR)(\d+)/i);
          if (match) {
            const numPart = parseInt(match[1], 10);
            if (!isNaN(numPart) && numPart > maxNum) {
              maxNum = numPart;
            }
          }
        }
      });
      courierCode = `CR${String(maxNum + 1).padStart(4, '0')}`;
    } else {
      courierCode = courierCode.trim().toUpperCase();
      const existing = await LogisticCourier.findOne({ code: courierCode });
      if (existing) {
        return res.status(400).json({ message: 'Courier code already exists' });
      }
    }

    const newCourier = new LogisticCourier({
      code: courierCode,
      name: name.trim(),
      address: (address || '').trim(),
    });

    const savedCourier = await newCourier.save();
    return res.status(201).json(savedCourier);
  } catch (error) {
    console.error('Error creating courier:', error);
    return res.status(500).json({ message: 'Failed to create courier', error: error.message });
  }
};

// Update an existing courier
export const updateCourier = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, address } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Courier name is required.' });
    }

    const courier = await LogisticCourier.findById(id);
    if (!courier) {
      return res.status(404).json({ message: 'Courier not found' });
    }

    if (code && code.trim().toUpperCase() !== courier.code) {
      const upperCode = code.trim().toUpperCase();
      const existing = await LogisticCourier.findOne({ code: upperCode, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: 'Courier code already exists' });
      }
      courier.code = upperCode;
    }

    courier.name = name.trim();
    courier.address = (address || '').trim();

    const updatedCourier = await courier.save();
    return res.status(200).json(updatedCourier);
  } catch (error) {
    console.error('Error updating courier:', error);
    return res.status(500).json({ message: 'Failed to update courier', error: error.message });
  }
};

// Toggle archive status
export const toggleArchiveCourier = async (req, res) => {
  try {
    const { id } = req.params;
    const courier = await LogisticCourier.findById(id);

    if (!courier) {
      return res.status(404).json({ message: 'Courier not found' });
    }

    courier.isArchived = !courier.isArchived;
    const updatedCourier = await courier.save();

    return res.status(200).json({
      message: `Courier ${courier.isArchived ? 'archived' : 'restored'} successfully`,
      courier: updatedCourier,
    });
  } catch (error) {
    console.error('Error toggling courier archive:', error);
    return res.status(500).json({ message: 'Failed to archive/restore courier', error: error.message });
  }
};

// Delete a courier permanently
export const deleteCourier = async (req, res) => {
  try {
    const { id } = req.params;
    const courier = await LogisticCourier.findById(id);

    if (!courier) {
      return res.status(404).json({ message: 'Courier not found' });
    }

    await LogisticCourier.findByIdAndDelete(id);
    return res.status(200).json({ message: 'Courier deleted permanently' });
  } catch (error) {
    console.error('Error deleting courier:', error);
    return res.status(500).json({ message: 'Failed to delete courier', error: error.message });
  }
};
