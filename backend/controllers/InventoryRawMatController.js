import RawMaterial from '../models/InventoryRawMaterial.js';
import SupplierReturnTicket from '../models/InventorySupplierReturnTicket.js';

// Helper function to auto-create Supplier Return Ticket when raw material is flagged Quarantine or Rejected
const triggerSupplierReturnTicket = async (material, qcStatus, customNotes = '') => {
  try {
    const count = await SupplierReturnTicket.countDocuments();
    const ticketNo = `SRT-${String(count + 1).padStart(5, '0')}`;
    const supplierName = material.manufacturer || material.brand || material.accountTo || 'Supplier';

    const ticket = new SupplierReturnTicket({
      ticketNo,
      rawMaterialId: material._id,
      materialCode: material.code,
      materialName: material.itemName || material.itemDescription,
      supplierName: supplierName !== 'N/A' && supplierName ? supplierName : 'Supplier',
      quantity: material.quantity || 0,
      uom: material.uom || 'pcs',
      qcStatus,
      reason: `Out-of-Specification (Failed Spec) - Flagged as ${qcStatus}`,
      notes: customNotes || `Auto-generated supplier return ticket for failed spec raw material: ${material.code}`,
    });

    await ticket.save();
    return ticket;
  } catch (err) {
    console.error('Failed to trigger supplier return ticket:', err);
    return null;
  }
};

// GET all supplier return tickets
export const getSupplierReturnTickets = async (req, res) => {
  try {
    const tickets = await SupplierReturnTicket.find().sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    return res.status(200).json(tickets || []);
  } catch (error) {
    console.error('Error fetching supplier return tickets:', error);
    return res.status(200).json([]);
  }
};

// GET all raw materials
export const getRawMaterials = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { code: searchRegex },
        { category: searchRegex },
        { itemName: searchRegex },
        { itemDescription: searchRegex },
        { specification: searchRegex },
        { theoreticalWeight: searchRegex },
        { manufacturer: searchRegex },
        { brand: searchRegex },
        { accountTo: searchRegex },
        { qcStatus: searchRegex },
      ];
    }

    const rawMaterials = await RawMaterial.find(query).sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    return res.status(200).json(rawMaterials || []);
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    return res.status(200).json([]);
  }
};

// POST create raw material
export const createRawMaterial = async (req, res) => {
  try {
    const materialData = { ...req.body };
    delete materialData.image;
    delete materialData.imageUrl;
    delete materialData.photo;
    delete materialData.picture;

    // Auto-generate code starting from RM0001 if missing or blank
    if (!materialData.code || materialData.code.trim() === '') {
      const allMaterials = await RawMaterial.find({}, 'code');
      let maxNum = 0;
      allMaterials.forEach((m) => {
        if (m.code) {
          const match = m.code.match(/^(?:RM-INV-|RM)(\d+)/i);
          if (match) {
            const numPart = parseInt(match[1], 10);
            if (!isNaN(numPart) && numPart > maxNum) {
              maxNum = numPart;
            }
          }
        }
      });
      materialData.code = `RM${String(maxNum + 1).padStart(4, '0')}`;
    }

    const newMaterial = new RawMaterial(materialData);
    const savedMaterial = await newMaterial.save();

    // Auto-trigger supplier return ticket if flagged as Quarantine or Rejected
    if (savedMaterial.qcStatus === 'Quarantine' || savedMaterial.qcStatus === 'Rejected') {
      await triggerSupplierReturnTicket(savedMaterial, savedMaterial.qcStatus);
    }

    return res.status(201).json(savedMaterial);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Item code already exists.' });
    }
    return res.status(400).json({ message: error.message });
  }
};

// PUT update raw material
export const updateRawMaterial = async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.image;
    delete updateData.imageUrl;
    delete updateData.photo;
    delete updateData.picture;

    const existing = await RawMaterial.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Raw material not found.' });
    }

    const previousQc = existing.qcStatus || 'Pass';

    const updatedMaterial = await RawMaterial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    // If QC status is newly set or changed to Quarantine or Rejected, trigger ticket
    const newQc = updatedMaterial.qcStatus;
    if ((newQc === 'Quarantine' || newQc === 'Rejected') && previousQc !== newQc) {
      await triggerSupplierReturnTicket(updatedMaterial, newQc);
    }

    return res.status(200).json(updatedMaterial);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

// DELETE raw material
export const deleteRawMaterial = async (req, res) => {
  try {
    const deletedMaterial = await RawMaterial.findByIdAndDelete(req.params.id);

    if (!deletedMaterial) {
      return res.status(404).json({ message: 'Raw material not found.' });
    }

    return res.status(200).json({ message: 'Raw material deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// TOGGLE ARCHIVE raw material
export const toggleArchiveRawMaterial = async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Raw material not found.' });
    }

    material.isArchived = !material.isArchived;
    const updated = await material.save();

    return res.status(200).json({
      message: material.isArchived ? 'Material archived successfully.' : 'Material unarchived successfully.',
      material: updated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};