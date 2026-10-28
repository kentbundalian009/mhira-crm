import Supplier from '../models/InventorySupplier.js';

// Get all suppliers (with search)
export const getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { code: searchRegex },
        { name: searchRegex },
        { address: searchRegex },
        { contactPerson: searchRegex },
        { contactNumber: searchRegex },
      ];
    }

    const suppliers = await Supplier.find(query).sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    return res.status(200).json(suppliers || []);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(200).json([]);
  }
};

// Create a new supplier
export const createSupplier = async (req, res) => {
  try {
    const { code, name, address, contactPerson, contactNumber } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Supplier name is required.' });
    }

    if (!contactPerson || contactPerson.trim() === '') {
      return res.status(400).json({ message: 'Contact person is required.' });
    }

    if (!contactNumber || contactNumber.trim() === '') {
      return res.status(400).json({ message: 'Contact number is required.' });
    }

    let supplierCode = code;

    // Auto-generate code starting from SL0001 if code missing or blank
    if (!supplierCode || supplierCode.trim() === '') {
      const allSuppliers = await Supplier.find({}, 'code');
      let maxNum = 0;
      allSuppliers.forEach((s) => {
        if (s.code) {
          const match = s.code.match(/^(?:SUP-|SL-?|SL)(\d+)/i);
          if (match) {
            const numPart = parseInt(match[1], 10);
            if (!isNaN(numPart) && numPart > maxNum) {
              maxNum = numPart;
            }
          }
        }
      });
      supplierCode = `SL${String(maxNum + 1).padStart(4, '0')}`;
    } else {
      // Check if code already exists
      const existingSupplier = await Supplier.findOne({ code: supplierCode });
      if (existingSupplier) {
        return res.status(400).json({ message: 'Supplier code already exists' });
      }
    }

    const newSupplier = new Supplier({
      code: supplierCode,
      name: name.trim(),
      address: (address || '').trim(),
      contactPerson: contactPerson.trim(),
      contactNumber: contactNumber.trim(),
    });

    const savedSupplier = await newSupplier.save();
    res.status(201).json(savedSupplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ message: 'Failed to create supplier', error: error.message });
  }
};

// Update existing supplier
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, address, contactPerson, contactNumber } = req.body;

    if (name !== undefined && (!name || name.trim() === '')) {
      return res.status(400).json({ message: 'Supplier name is required.' });
    }

    if (contactPerson !== undefined && (!contactPerson || contactPerson.trim() === '')) {
      return res.status(400).json({ message: 'Contact person is required.' });
    }

    if (contactNumber !== undefined && (!contactNumber || contactNumber.trim() === '')) {
      return res.status(400).json({ message: 'Contact number is required.' });
    }

    const updatePayload = {};
    if (code) updatePayload.code = code.trim();
    if (name) updatePayload.name = name.trim();
    if (address !== undefined) updatePayload.address = address.trim();
    if (contactPerson) updatePayload.contactPerson = contactPerson.trim();
    if (contactNumber) updatePayload.contactNumber = contactNumber.trim();

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!updatedSupplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.status(200).json(updatedSupplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ message: 'Failed to update supplier', error: error.message });
  }
};

// Delete supplier
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSupplier = await Supplier.findByIdAndDelete(id);

    if (!deletedSupplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.status(200).json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ message: 'Failed to delete supplier', error: error.message });
  }
};

// Toggle archive supplier
export const toggleArchiveSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    supplier.isArchived = !supplier.isArchived;
    const updated = await supplier.save();

    res.status(200).json({
      message: supplier.isArchived ? 'Supplier archived successfully' : 'Supplier restored successfully',
      supplier: updated,
    });
  } catch (error) {
    console.error('Error toggling supplier archive status:', error);
    res.status(500).json({ message: 'Failed to toggle supplier archive status', error: error.message });
  }
};
