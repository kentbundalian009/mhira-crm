import WIP from '../models/InventoryWIP.js';
import RawMaterial from '../models/InventoryRawMaterial.js';
import Product from '../models/InventoryProduct.js';
import ScrapAuditLog from '../models/ScrapAuditLog.js';

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
    if (Array.isArray(ingredientsUsed)) {
      for (const ing of ingredientsUsed) {
        let mat = null;
        if (ing.rawMaterialId) {
          mat = await RawMaterial.findById(ing.rawMaterialId).lean();
        }
        if (!mat && ing.materialCode) {
          mat = await RawMaterial.findOne({ code: { $regex: new RegExp(`^${ing.materialCode.trim()}$`, 'i') } }).lean();
        }
        if (!mat && ing.name) {
          mat = await RawMaterial.findOne({ itemName: { $regex: new RegExp(`^${ing.name.trim()}$`, 'i') } }).lean();
        }

        if (mat && (mat.qcStatus === 'Quarantine' || mat.qcStatus === 'Rejected')) {
          return res.status(400).json({
            message: `Allocation Blocked: "${mat.itemName || mat.code}" is flagged as ${mat.qcStatus} (Out-of-Specification) and cannot be used in active production.`,
            blockedMaterial: mat,
          });
        }
      }
    }

    // Format ingredients - 0 deducted initially until fulfilled via Quick-Assistant
    const formattedIngredients = Array.isArray(ingredientsUsed)
      ? ingredientsUsed.map((ing) => {
          const unitReq = Number(ing.unitRequired) || 0;
          const totalReq = Number(ing.totalRequired) || (unitReq * numBatches);
          return {
            rawMaterialId: ing.rawMaterialId,
            materialCode: ing.materialCode || '',
            name: ing.name || '',
            specification: ing.specification || '',
            theoreticalWeight: ing.theoreticalWeight || '',
            unitRequired: unitReq,
            totalRequired: totalReq,
            qtyDeducted: 0,
            uom: ing.uom || 'pcs',
            shortageQty: totalReq,
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

    // 1. Deduct raw materials used using FIFO (First-In, First-Out) on packaging containers
    if (Array.isArray(wip.ingredientsUsed)) {
      for (const ing of wip.ingredientsUsed) {
        const needed = Number(ing.totalRequired) || 0;
        if (needed > 0) {
          let mat = null;
          if (ing.rawMaterialId) {
            try {
              mat = await RawMaterial.findById(ing.rawMaterialId);
            } catch (e) {}
          }
          if (!mat && ing.materialCode) {
            mat = await RawMaterial.findOne({
              code: { $regex: new RegExp(`^${ing.materialCode.trim()}$`, 'i') }
            });
          }
          if (!mat && ing.name) {
            mat = await RawMaterial.findOne({
              itemName: { $regex: new RegExp(`^${ing.name.trim()}$`, 'i') }
            });
          }

          if (mat) {
            // Deduct overall bulk stock
            mat.quantity = Math.max(0, (Number(mat.quantity) || 0) - needed);
            await mat.save();
          }

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
          notes: `Batch Target: ${maxAllowed} pcs | Stocked: ${yieldToAdd} pcs | Defect Loss: ${finalRejectQty} pcs`,
        });

        await newScrap.save();
        wip.rejectedQuantity = finalRejectQty;
        wip.rejectionReason = newScrap.reason;
        wip.rejectionApprover = newScrap.approverName;
        wip.rejectionDisposition = newScrap.disposition;
        wip.scrapLogId = newScrap.logId;
      } catch (scrapErr) {
        console.error('Error logging WIP scrap:', scrapErr);
      }
    } else {
      wip.rejectedQuantity = 0;
      wip.rejectionReason = '';
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