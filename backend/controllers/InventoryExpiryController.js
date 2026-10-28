import Expiry from '../models/InventoryExpiry.js';
import WIP from '../models/InventoryWIP.js';
import Inbound from '../models/InventoryInbound.js';
import RawMaterial from '../models/InventoryRawMaterial.js';
import Product from '../models/InventoryProduct.js';

export const getExpiryItems = async (req, res) => {
  try {
    // 1. Fetch active Products, Raw Materials, Standalone Expiries, WIPs, and Inbounds in parallel
    const [allProducts, allRawMaterials, standaloneItems, wipBatches, inboundBatches] = await Promise.all([
      Product.find().lean().maxTimeMS(8000).catch(() => []),
      RawMaterial.find().lean().maxTimeMS(8000).catch(() => []),
      Expiry.find().lean().maxTimeMS(8000).catch(() => []),
      WIP.find().sort({ expDate: 1 }).lean().maxTimeMS(8000).catch(() => []),
      Inbound.find().sort({ dateReceived: -1 }).lean().maxTimeMS(8000).catch(() => [])
    ]);

    const productCodeMap = new Map();
    const productNameMap = new Map();
    allProducts.forEach((p) => {
      if (p.code) productCodeMap.set(p.code.toLowerCase().trim(), p);
      if (p.itemName) productNameMap.set(p.itemName.toLowerCase().trim(), p);
      if (p.itemDescription) productNameMap.set(p.itemDescription.toLowerCase().trim(), p);
    });

    const rawMaterialCodeMap = new Map();
    const rawMaterialNameMap = new Map();
    allRawMaterials.forEach((rm) => {
      if (rm.code) rawMaterialCodeMap.set(rm.code.toLowerCase().trim(), rm);
      if (rm.itemName) rawMaterialNameMap.set(rm.itemName.toLowerCase().trim(), rm);
      if (rm.itemDescription) rawMaterialNameMap.set(rm.itemDescription.toLowerCase().trim(), rm);
    });

    // Check if any item has been disposed in Expiry collection
    const disposedMap = new Map();
    standaloneItems.filter((i) => i.status === 'Disposed').forEach((i) => {
      disposedMap.set((i.batchNo || '').toLowerCase().trim(), i);
    });

    const rawMap = new Map();

    // 2. Process real WIP Finished Goods batches matching real products
    wipBatches.forEach((w) => {
      if (!w.expDate) return;
      const codeKey = (w.productCode || '').toLowerCase().trim();
      const nameKey = (w.productName || '').toLowerCase().trim();
      const matchingProduct = productCodeMap.get(codeKey) || productNameMap.get(nameKey);

      if (matchingProduct || w.productCode) {
        const itemCode = matchingProduct?.code || w.productCode || 'FG-BATCH';
        const itemName = matchingProduct?.itemName || matchingProduct?.itemDescription || w.productName || 'Finished Good';
        const itemSpec = matchingProduct?.specification ? `${matchingProduct.specification} ${matchingProduct.uom || ''}` : `Status: ${w.status}`;
        const itemUom = matchingProduct?.uom || 'pcs';
        const itemQty = w.producedQuantity > 0 ? w.producedQuantity : (w.targetQuantity || 0);

        const key = `${w.wipBatchCode}_${itemCode}`.toLowerCase();
        const disposedInfo = disposedMap.get((w.wipBatchCode || '').toLowerCase().trim());

        rawMap.set(key, {
          _id: w._id,
          batchNo: w.wipBatchCode,
          code: itemCode,
          category: matchingProduct?.category || 'Finished Goods',
          itemDescription: itemName,
          specification: itemSpec,
          quantity: itemQty,
          uom: itemUom,
          mfgDate: w.mfgDate,
          expiryDate: w.expDate,
          status: disposedInfo ? 'Disposed' : (w.status || 'Active'),
          disposalDetails: disposedInfo ? disposedInfo.disposalDetails : undefined,
          source: 'WIP Production'
        });
      }
    });

    // 3. Process real Inbound Raw Materials batches matching real raw materials
    inboundBatches.forEach((inb) => {
      if (Array.isArray(inb.items)) {
        inb.items.forEach((it, idx) => {
          const codeKey = (it.code || '').toLowerCase().trim();
          const nameKey = (it.itemName || it.itemDescription || '').toLowerCase().trim();
          const matchingRM = rawMaterialCodeMap.get(codeKey) || rawMaterialNameMap.get(nameKey);

          const rDate = inb.dateReceived ? new Date(inb.dateReceived) : new Date();
          const autoExp = new Date(rDate);
          autoExp.setFullYear(autoExp.getFullYear() + 1);

          const itemCode = matchingRM?.code || it.code || 'RM-INBOUND';
          const itemName = matchingRM?.itemName || matchingRM?.itemDescription || it.itemName || it.itemDescription || 'Inbound Raw Material';
          const itemUom = matchingRM?.uom || it.uom || 'g';
          const itemQty = it.actualQuantity || it.quantityReceived || it.expectedQuantity || matchingRM?.quantity || 0;
          const batchNo = inb.batchPoNo || inb.deliveryReceiptNo || `DR-${inb._id.toString().slice(-6).toUpperCase()}`;

          const key = `${batchNo}_${itemCode}`.toLowerCase();
          const disposedInfo = disposedMap.get(batchNo.toLowerCase().trim());

          rawMap.set(key, {
            _id: `${inb._id}_${idx}`,
            batchNo,
            code: itemCode,
            category: matchingRM?.category || it.category || 'Raw Materials',
            segment: matchingRM?.segment || it.segment || 'Receiving',
            itemDescription: itemName,
            specification: matchingRM?.specification || it.specification || (inb.supplierName ? `Supplier: ${inb.supplierName}` : 'Standard'),
            quantity: itemQty,
            uom: itemUom,
            mfgDate: inb.dateReceived ? new Date(inb.dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            expiryDate: it.expiryDate || autoExp.toISOString().split('T')[0],
            status: disposedInfo ? 'Disposed' : 'Active',
            disposalDetails: disposedInfo ? disposedInfo.disposalDetails : undefined,
            source: 'Inbound Receiving'
          });
        });
      }
    });

    // 4. Process Standalone Expiry Items
    standaloneItems.forEach((st) => {
      const key = `standalone_${st.batchNo || st._id}`.toLowerCase();
      if (!rawMap.has(key)) {
        rawMap.set(key, {
          _id: st._id,
          batchNo: st.batchNo || 'BATCH-N/A',
          code: st.code || 'ITEM',
          category: st.category || 'Raw Materials',
          segment: st.segment || 'Storage',
          itemDescription: st.itemDescription || 'Inventory Batch',
          specification: st.specification || 'Direct Expiry Record',
          quantity: st.quantity || 0,
          uom: st.uom || 'pcs',
          mfgDate: st.mfgDate,
          expiryDate: st.expiryDate,
          status: st.status || 'Active',
          disposalDetails: st.disposalDetails,
          source: 'Expiry Register'
        });
      }
    });

    const allBatches = Array.from(rawMap.values());

    // Compute FEFO & Expiration status dynamically
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort by expiry date ascending
    allBatches.sort((a, b) => {
      const dateA = new Date(a.expiryDate || '9999-12-31').getTime();
      const dateB = new Date(b.expiryDate || '9999-12-31').getTime();
      return dateA - dateB;
    });

    let fefoAssigned = false;
    const processedItems = allBatches.map((item) => {
      const expDate = new Date(item.expiryDate);
      const diffTime = expDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let computedStatus = "Good / Safe";
      let statusColor = "emerald";

      if (item.status === 'Disposed') {
        computedStatus = "Disposed / Written Off";
        statusColor = "slate";
      } else if (isNaN(daysUntil) || !item.expiryDate) {
        computedStatus = "No Expiry Date";
        statusColor = "slate";
      } else if (daysUntil <= 0) {
        computedStatus = "Expired";
        statusColor = "rose";
      } else if (daysUntil <= 30) {
        computedStatus = "Critical (< 30d)";
        statusColor = "rose";
      } else if (daysUntil <= 60) {
        computedStatus = "Near Expiry (< 60d)";
        statusColor = "amber";
      }

      const isFefoPick = !fefoAssigned && daysUntil > 0 && item.status !== 'Disposed';
      if (isFefoPick) {
        fefoAssigned = true;
      }

      return {
        ...item,
        daysUntilExpiry: isNaN(daysUntil) ? 999 : daysUntil,
        computedStatus,
        statusColor,
        isFefoPick
      };
    });

    // Filtering
    const { category, status, timeframe, search } = req.query;
    let filtered = processedItems;

    if (category && category !== 'All') {
      filtered = filtered.filter(
        (i) => (i.category || '').toLowerCase() === category.toLowerCase()
      );
    }

    if (status && status !== 'All') {
      filtered = filtered.filter((i) => {
        if (status === 'Expired') return i.daysUntilExpiry <= 0;
        if (status === 'Critical') return i.daysUntilExpiry > 0 && i.daysUntilExpiry <= 30;
        if (status === 'Near Expiry') return i.daysUntilExpiry > 30 && i.daysUntilExpiry <= 60;
        if (status === 'Safe') return i.daysUntilExpiry > 60;
        return true;
      });
    }

    if (timeframe && timeframe !== 'All') {
      filtered = filtered.filter((i) => {
        if (timeframe === 'Expired') return i.daysUntilExpiry <= 0;
        if (timeframe === '30days') return i.daysUntilExpiry > 0 && i.daysUntilExpiry <= 30;
        if (timeframe === '60days') return i.daysUntilExpiry > 0 && i.daysUntilExpiry <= 60;
        if (timeframe === '90days') return i.daysUntilExpiry > 0 && i.daysUntilExpiry <= 90;
        if (timeframe === 'over90') return i.daysUntilExpiry > 90;
        return true;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          (i.batchNo && i.batchNo.toLowerCase().includes(q)) ||
          (i.code && i.code.toLowerCase().includes(q)) ||
          (i.itemDescription && i.itemDescription.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }

    return res.status(200).json(filtered || []);
  } catch (error) {
    console.error("Error fetching expiry inventory:", error);
    return res.status(200).json([]);
  }
};

export const disposeExpiryBatch = async (req, res) => {
  try {
    const { batchNo, code, category, quantity, reason, notes, disposedBy } = req.body;

    if (!batchNo) {
      return res.status(400).json({ message: 'Batch number is required for disposal.' });
    }

    const qtyToDispose = Number(quantity) || 0;

    // 1. Deduct from Raw Materials if applicable
    if (category && (category.toLowerCase().includes('raw') || category.toLowerCase().includes('packaging'))) {
      if (code) {
        await RawMaterial.findOneAndUpdate(
          { code: { $regex: new RegExp(`^${code.trim()}$`, 'i') } },
          { $inc: { quantity: -Math.abs(qtyToDispose) } }
        );
      }
    }

    // 2. Deduct from Finished Goods if applicable
    if (category && category.toLowerCase().includes('finish')) {
      if (code) {
        await Product.findOneAndUpdate(
          { code: { $regex: new RegExp(`^${code.trim()}$`, 'i') } },
          { $inc: { quantity: -Math.abs(qtyToDispose) } }
        );
      }
    }

    // 3. Mark / Upsert in Expiry collection as Disposed
    let expiryDoc = await Expiry.findOne({ batchNo: { $regex: new RegExp(`^${batchNo.trim()}$`, 'i') } });
    if (expiryDoc) {
      expiryDoc.status = 'Disposed';
      expiryDoc.disposalDetails = {
        disposedAt: new Date(),
        disposedBy: disposedBy || 'Inventory Manager',
        reason: reason || 'Expired Stock',
        quantityDisposed: qtyToDispose,
        notes: notes || ''
      };
      await expiryDoc.save();
    } else {
      expiryDoc = new Expiry({
        batchNo: batchNo.trim(),
        code: code || 'ITEM',
        category: category || 'Raw Materials',
        itemDescription: req.body.itemDescription || 'Disposed Batch',
        quantity: qtyToDispose,
        mfgDate: req.body.mfgDate || new Date().toISOString().split('T')[0],
        expiryDate: req.body.expiryDate || new Date().toISOString().split('T')[0],
        status: 'Disposed',
        disposalDetails: {
          disposedAt: new Date(),
          disposedBy: disposedBy || 'Inventory Manager',
          reason: reason || 'Expired Stock',
          quantityDisposed: qtyToDispose,
          notes: notes || ''
        }
      });
      await expiryDoc.save();
    }

    return res.status(200).json({
      message: `Batch "${batchNo}" successfully disposed and written off from inventory!`,
      disposal: expiryDoc
    });
  } catch (error) {
    console.error('Error disposing batch:', error);
    return res.status(500).json({ message: 'Failed to process batch disposal', error: error.message });
  }
};

export const createExpiryItem = async (req, res) => {
  try {
    const newItem = new Expiry(req.body);
    const savedItem = await newItem.save();
    return res.status(201).json(savedItem);
  } catch (error) {
    return res.status(400).json({ message: 'Error creating expiry record', error: error.message });
  }
};

export const updateExpiryItem = async (req, res) => {
  try {
    const updated = await Expiry.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(400).json({ message: 'Error updating expiry record', error: error.message });
  }
};

export const deleteExpiryItem = async (req, res) => {
  try {
    await Expiry.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Expiry record deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting expiry record', error: error.message });
  }
};
