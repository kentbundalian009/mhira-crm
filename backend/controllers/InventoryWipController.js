import WIP from '../models/InventoryWIP.js';
import RawMaterial from '../models/InventoryRawMaterial.js';
import Product from '../models/InventoryProduct.js';
import ScrapAuditLog from '../models/ScrapAuditLog.js';

const normalizeRmCode = (code) => {
  const raw = String(code || '').toLowerCase().trim();
  if (!raw) return '';
  const m = raw.match(/^(?:rm-inv-|rm-?)0*(\d+)$/i);
  if (m) return `rm-${m[1]}`;
  return raw;
};

const normalizeRmName = (name) => {
  const clean = String(name || '')
    .toLowerCase()
    .replace(/niacinimide/g, 'niacinamide')
    .replace(/[^a-z0-9]/g, '');
  return clean;
};

const matchRawMaterialFromList = (ing, rmList) => {
  if (!ing || !Array.isArray(rmList) || rmList.length === 0) return null;

  // 1. Exact ID match
  if (ing.rawMaterialId) {
    const idStr = String(ing.rawMaterialId);
    const byId = rmList.find((m) => String(m._id || m.id) === idStr);
    if (byId) return byId;
  }

  // 2. Name match (exact case-insensitive or normalized alphanumeric)
  const ingNameNorm = normalizeRmName(ing.name || ing.materialName);
  if (ingNameNorm) {
    const byName = rmList.find((m) => {
      const mNameNorm = normalizeRmName(m.itemName);
      const mDescNorm = normalizeRmName(m.itemDescription);
      return mNameNorm === ingNameNorm || mDescNorm === ingNameNorm;
    });
    if (byName) return byName;
  }

  // 3. Code match (exact or normalized RM-INV-00001 -> RM0001)
  const ingCodeNorm = normalizeRmCode(ing.materialCode || ing.code);
  if (ingCodeNorm) {
    const byCode = rmList.find((m) => normalizeRmCode(m.code) === ingCodeNorm);
    if (byCode) return byCode;
  }

  return null;
};

// Get all WIP Batches
export const getWIPs = async (req, res) => {
  try {
    const wips = await WIP.find().sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    return res.status(200).json(wips || []);
  } catch (error) {
    console.error('Error fetching WIP batches:', error);
    return res.status(200).json([]);
  }
};

// Create new WIP Production Batch (Queues into Quick-Assistant as In Production)
export const createWIP = async (req, res) => {
  try {
    const {
      wipBatchCode,
      productId,
      productCode,
      productName,
      numberOfBatches,
      totalBatchWeight,
      batchWeightUom,
      targetQuantity,
      producedQuantity,
      mfgDate,
      expDate,
      estimatedDuration,
      estimatedDurationUnit,
      ingredientsUsed,
    } = req.body;

    let batchCode = (wipBatchCode || '').trim().toUpperCase();

    if (!batchCode) {
      const allWIPs = await WIP.find({}, 'wipBatchCode').lean();
      let maxNum = 0;
      for (const w of allWIPs) {
        const m = (w.wipBatchCode || '').match(/^WIP(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
      batchCode = `WIP${String(maxNum + 1).padStart(5, '0')}`;
    }

    const existingWIP = await WIP.findOne({
      wipBatchCode: { $regex: new RegExp(`^${batchCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existingWIP) {
      return res.status(400).json({ message: `Batch No. "${batchCode}" already exists. Please use a unique Batch No.` });
    }

    const targetQty = Number(targetQuantity) || 0;
    const producedQty = Number(producedQuantity) || 0;
    const numBatches = Number(numberOfBatches) || 1;
    const totalWeight = Number(totalBatchWeight) || 30;

    if (targetQty <= 0) {
      return res.status(400).json({ message: 'Target Yield Quantity must be greater than 0.' });
    }

    // Check for Out-of-Specification (Quarantine / Rejected) raw materials - block allocation
    const allRMs = await RawMaterial.find({}).lean().catch(() => []);
    if (Array.isArray(ingredientsUsed)) {
      for (const ing of ingredientsUsed) {
        const mat = matchRawMaterialFromList(ing, allRMs);

        if (mat && (mat.qcStatus === 'Quarantine' || mat.qcStatus === 'Rejected')) {
          return res.status(400).json({
            message: `Allocation Blocked: "${mat.itemName || mat.code}" is flagged as ${mat.qcStatus} (Out-of-Specification) and cannot be used in active production.`,
            blockedMaterial: mat,
          });
        }
      }
    }

    // Format ingredients with calculated deduction quantities
    const formattedIngredients = Array.isArray(ingredientsUsed)
      ? ingredientsUsed.map((ing) => {
          const parsedTheor = parseFloat(String(ing.theoreticalWeight || 0).replace(/[^0-9.]/g, '')) || 0;
          const parsedSpec = parseFloat(String(ing.specification || 0).replace(/[^0-9.]/g, '')) || 0;
          const unitReq = Number(ing.unitRequired) || parsedTheor || (parsedSpec * 50) || 0;
          const totalReq = Number(ing.totalRequired) || parseFloat((unitReq * numBatches).toFixed(2));
          const matchedMat = matchRawMaterialFromList(ing, allRMs);
          return {
            rawMaterialId: matchedMat ? matchedMat._id : ing.rawMaterialId,
            materialCode: (matchedMat && matchedMat.code) || ing.materialCode || '',
            name: ing.name || (matchedMat ? matchedMat.itemName : ''),
            specification: ing.specification || '',
            theoreticalWeight: ing.theoreticalWeight || String(unitReq),
            unitRequired: unitReq,
            totalRequired: totalReq,
            qtyDeducted: totalReq,
            uom: ing.uom || (matchedMat && matchedMat.uom) || 'g',
            shortageQty: Math.max(0, totalReq - (matchedMat ? Number(matchedMat.quantity) || 0 : 0)),
          };
        })
      : [];

    // Save WIP Batch in Pending / In Production state
    const newWIP = new WIP({
      wipBatchCode: batchCode,
      productId,
      productCode: productCode || '',
      productName: productName || 'Finished Product',
      numberOfBatches: numBatches,
      totalBatchWeight: totalWeight,
      batchWeightUom: batchWeightUom || 'kg',
      targetQuantity: targetQty,
      producedQuantity: 0,
      pendingQuantity: targetQty,
      mfgDate,
      expDate,
      estimatedDuration: Number(estimatedDuration) || 0,
      estimatedDurationUnit: estimatedDurationUnit || 'hours',
      status: 'Pending / In Production',
      ingredientsUsed: formattedIngredients,
    });

    const savedWIP = await newWIP.save();
    res.status(201).json({ message: 'WIP Production Batch queued in Production! Fulfill transaction in Quick-Assistant when complete.', wip: savedWIP });
  } catch (error) {
    console.error('WIP Creation Error:', error);
    res.status(500).json({ message: 'Failed to create WIP Batch', error: error.message });
  }
};

// Complete a pending WIP batch when production is finished
export const completePendingWIP = async (req, res) => {
  try {
    const { id } = req.params;
    let wip = null;
    try {
      wip = await WIP.findById(id);
    } catch (e) {}

    if (!wip) {
      wip = await WIP.findOne({ wipBatchCode: id });
    }

    if (!wip) {
      return res.status(404).json({ message: 'WIP Batch not found' });
    }

    if (wip.status === 'Completed' || (wip.pendingQuantity <= 0 && wip.producedQuantity >= wip.targetQuantity)) {
      return res.status(400).json({ message: 'This WIP batch is already completed' });
    }

    // 1. Deduct raw materials used from RawMaterial inventory
    if (Array.isArray(wip.ingredientsUsed)) {
      const allRMs = await RawMaterial.find({});
      const numBatches = Number(wip.numberOfBatches) || 1;

      for (const ing of wip.ingredientsUsed) {
        const parsedTheor = parseFloat(String(ing.theoreticalWeight || 0).replace(/[^0-9.]/g, '')) || 0;
        const parsedSpec = parseFloat(String(ing.specification || 0).replace(/[^0-9.]/g, '')) || 0;
        const unitReq = Number(ing.unitRequired) || parsedTheor || (parsedSpec * 50) || 0;
        const needed = Number(ing.totalRequired) || Number(ing.qtyDeducted) || parseFloat((unitReq * numBatches).toFixed(2)) || 0;

        if (needed > 0) {
          const mat = matchRawMaterialFromList(ing, allRMs);

          if (mat) {
            // Deduct overall bulk stock
            mat.quantity = Math.max(0, parseFloat(((Number(mat.quantity) || 0) - needed).toFixed(2)));
            await mat.save();
          }

          ing.unitRequired = unitReq;
          ing.totalRequired = needed;
          ing.qtyDeducted = needed;
          ing.shortageQty = 0;
        }
      }
    }

    // 2. Add Finished Goods to product inventory based on actual yield & log Rejection / Scrap Audit
    const {
      actualProducedQuantity,
      rejectedQuantity,
      rejectionReason,
      rejectionNotes,
      rejectionApprover,
      rejectionDisposition,
    } = req.body;

    const maxAllowed = Number(wip.targetQuantity) || 0;
    const parsedActual = Number(actualProducedQuantity);
    const yieldToAdd =
      actualProducedQuantity !== undefined && actualProducedQuantity !== null && !isNaN(parsedActual)
        ? Math.min(Math.max(0, parsedActual), maxAllowed)
        : maxAllowed;

    const calculatedRejects = Math.max(0, maxAllowed - yieldToAdd);
    const finalRejectQty =
      rejectedQuantity !== undefined && rejectedQuantity !== null && !isNaN(Number(rejectedQuantity))
        ? Number(rejectedQuantity)
        : calculatedRejects;

    if (finalRejectQty > 0) {
      try {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await ScrapAuditLog.countDocuments();
        const generatedLogId = `SCRAP-WIP-${dateStr}-${String(count + 1).padStart(4, '0')}`;

        const cleanNotes = (rejectionNotes && rejectionNotes.trim()) ? rejectionNotes.trim() : '';
        const auditNotes = cleanNotes
          ? `${cleanNotes} (Target: ${maxAllowed} pcs | Stocked: ${yieldToAdd} pcs | Defect: ${finalRejectQty} pcs)`
          : `Batch Target: ${maxAllowed} pcs | Stocked: ${yieldToAdd} pcs | Defect Loss: ${finalRejectQty} pcs`;

        const newScrap = new ScrapAuditLog({
          logId: generatedLogId,
          itemType: 'WIP / In-Production',
          itemCode: wip.productCode || '',
          itemName: wip.productName || 'Finished Product',
          batchId: wip.wipBatchCode || 'WIP-BATCH',
          quantity: finalRejectQty,
          uom: 'pcs',
          reason: (rejectionReason && rejectionReason.trim()) || 'Production Spillage / Quality Defect',
          approverName: (rejectionApprover && rejectionApprover.trim()) || 'Production QC Supervisor',
          disposition: (rejectionDisposition && rejectionDisposition.trim()) || 'Scrap / Dispose',
          notes: auditNotes,
        });

        await newScrap.save();
        wip.rejectedQuantity = finalRejectQty;
        wip.rejectionReason = newScrap.reason;
        wip.rejectionNotes = cleanNotes;
        wip.rejectionApprover = newScrap.approverName;
        wip.rejectionDisposition = newScrap.disposition;
        wip.scrapLogId = newScrap.logId;
      } catch (scrapErr) {
        console.error('Error logging WIP scrap:', scrapErr);
      }
    } else {
      wip.rejectedQuantity = 0;
      wip.rejectionReason = '';
      wip.rejectionNotes = '';
      wip.rejectionApprover = '';
      wip.rejectionDisposition = '';
      wip.scrapLogId = '';
    }

    if (yieldToAdd > 0) {
      let updatedProduct = null;
      if (wip.productId) {
        try {
          updatedProduct = await Product.findByIdAndUpdate(
            wip.productId,
            { $inc: { quantity: Math.abs(yieldToAdd) } },
            { new: true }
          );
        } catch (e) {}
      }

      // If not found by _id, match by code
      if (!updatedProduct && wip.productCode) {
        updatedProduct = await Product.findOneAndUpdate(
          { code: { $regex: new RegExp(`^${wip.productCode.trim()}$`, 'i') } },
          { $inc: { quantity: Math.abs(yieldToAdd) } },
          { new: true }
        );
      }

      // If not found by code, match by name / description
      if (!updatedProduct && wip.productName) {
        updatedProduct = await Product.findOneAndUpdate(
          {
            $or: [
              { itemDescription: { $regex: new RegExp(`^${wip.productName.trim()}$`, 'i') } },
              { itemName: { $regex: new RegExp(`^${wip.productName.trim()}$`, 'i') } }
            ]
          },
          { $inc: { quantity: Math.abs(yieldToAdd) } },
          { new: true }
        );
      }
    }

    wip.producedQuantity = yieldToAdd;
    wip.pendingQuantity = 0;
    wip.status = 'Completed';

    await wip.save();

    res.status(200).json({ message: 'Production Batch successfully completed and finished product quantity updated!', wip });
  } catch (error) {
    console.error('Error completing WIP:', error);
    res.status(500).json({ message: 'Failed to complete pending WIP batch', error: error.message });
  }
};