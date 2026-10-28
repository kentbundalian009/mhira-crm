import ScrapAuditLog from '../models/ScrapAuditLog.js';

// Generate human-readable Log ID
const generateLogId = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await ScrapAuditLog.countDocuments();
  return `SCRAP-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

// GET all scrap audit logs with optional search & filtering
export const getScrapAuditLogs = async (req, res) => {
  try {
    const { search, itemType, limit = 100 } = req.query;
    const filter = {};

    if (itemType && itemType !== 'All') {
      filter.itemType = itemType;
    }

    if (search) {
      filter.$or = [
        { logId: { $regex: search, $options: 'i' } },
        { itemName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { batchId: { $regex: search, $options: 'i' } },
        { approverName: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
      ];
    }

    const logs = await ScrapAuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching scrap audit logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scrap audit logs',
      error: error.message,
    });
  }
};

// POST Create scrap audit log entry manually
export const createScrapAuditLog = async (req, res) => {
  try {
    const {
      itemType,
      itemCode,
      itemName,
      batchId,
      quantity,
      uom,
      reason,
      approverName,
      disposition,
      notes,
    } = req.body;

    // Strict validation
    if (!itemName || !batchId || !quantity || !reason || !approverName) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: itemName, batchId, quantity, reason, and approverName are all strictly required.',
      });
    }

    const parsedQty = Number(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid number greater than 0.',
      });
    }

    const logId = await generateLogId();

    const newLog = new ScrapAuditLog({
      logId,
      itemType: itemType || 'Finished Product',
      itemCode: itemCode || '',
      itemName: itemName.trim(),
      batchId: batchId.trim(),
      quantity: parsedQty,
      uom: uom || 'pcs',
      reason: reason.trim(),
      approverName: approverName.trim(),
      disposition: disposition || 'Scrap / Dispose',
      notes: notes ? notes.trim() : '',
    });

    await newLog.save();

    return res.status(201).json({
      success: true,
      message: 'Scrap & rejection audit record created successfully',
      data: newLog,
    });
  } catch (error) {
    console.error('Error creating scrap audit log:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create scrap audit log',
      error: error.message,
    });
  }
};
