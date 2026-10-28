import Inbound from "../models/InventoryInbound.js";
import RawMaterial from "../models/InventoryRawMaterial.js";
import SupplierReturnTicket from "../models/InventorySupplierReturnTicket.js";

export const createInboundShipment = async (req, res) => {
  try {
    const { batchPoNo, supplierBrand, dateReceived, originLocation, preparedBy, items } = req.body;

    const cleanDrNo = (batchPoNo || '').trim();
    if (!cleanDrNo) {
      return res.status(400).json({ message: "Delivery Receipt No. is required." });
    }

    // Check if Delivery Receipt No. already exists (case-insensitive match)
    const existingInbound = await Inbound.findOne({
      batchPoNo: { $regex: new RegExp(`^${cleanDrNo.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
    }).lean();

    if (existingInbound) {
      return res.status(400).json({
        message: `Delivery Receipt No. "${cleanDrNo}" already exists in the system. Duplicate DR numbers are not allowed.`
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "At least one item must be added." });
    }

    const defaultMfg = dateReceived ? new Date(dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    // Process each item and auto-create Supplier Return Tickets for items on HOLD / REJECTED
    const createdTickets = [];
    const initialTicketCount = await SupplierReturnTicket.countDocuments();
    let ticketOffset = 1;

    const sanitizedItems = [];
    for (const item of items) {
      const exp = item.expiryDate || item.expirationDate || '';
      const actualQty = Number(item.actualQuantity) || Number(item.quantityReceived) || 1;
      const pkgType = (item.packagingType || 'Standard').trim();
      const pkgCount = Number(item.packageCount) || 1;
      const pkgSize = Number(item.packSize) || (pkgCount > 0 ? parseFloat((actualQty / pkgCount).toFixed(2)) : actualQty);
      const pkgDisplay = (item.packagingDisplay || '').trim() || `${pkgCount} ${pkgType}`;
      const receivingStatus = item.receivingStatus === 'Hold / Supplier Return' || item.receivingStatus === 'Rejected'
        ? item.receivingStatus
        : 'Accepted';
      const returnReason = (item.returnReason || '').trim();

      let supplierReturnTicketNo = '';

      // If item is put ON HOLD or REJECTED at Inbound
      if (receivingStatus !== 'Accepted') {
        const ticketSeq = String(initialTicketCount + ticketOffset).padStart(4, '0');
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        supplierReturnTicketNo = `SRT-${ticketSeq}-${randomSuffix}`;
        ticketOffset++;

        const newTicket = new SupplierReturnTicket({
          ticketNo: supplierReturnTicketNo,
          rawMaterialId: item.rawMaterialId,
          materialCode: item.code || '',
          materialName: item.itemName || item.itemDescription || 'Raw Material',
          supplierName: supplierBrand || 'Supplier',
          quantity: actualQty,
          uom: item.uom || 'pcs',
          qcStatus: receivingStatus === 'Rejected' ? 'Rejected' : 'Quarantine',
          reason: returnReason || 'Defective / Failed inspection during Inbound receiving',
          status: 'Pending Supplier Return',
          notes: `Held at Inbound Receiving under DR #${cleanDrNo}. Reason: ${returnReason || 'No reason provided.'}`,
          batchPoNo: cleanDrNo,
          originLocation: originLocation || 'Main Warehouse',
          dateReceived: dateReceived ? new Date(dateReceived) : new Date(),
        });

        const savedTicket = await newTicket.save();
        createdTickets.push(savedTicket);
      }

      sanitizedItems.push({
        ...item,
        actualQuantity: actualQty,
        quantityReceived: actualQty,
        packagingType: pkgType,
        packageCount: pkgCount,
        packSize: pkgSize,
        packagingDisplay: pkgDisplay,
        mfgDate: item.mfgDate || defaultMfg,
        expiryDate: exp,
        expirationDate: exp,
        receivingStatus,
        returnReason,
        supplierReturnTicketNo,
      });
    }

    const newInbound = new Inbound({
      batchPoNo,
      supplierBrand,
      dateReceived,
      originLocation,
      preparedBy,
      items: sanitizedItems,
    });

    const savedInbound = await newInbound.save();

    // Update stock and packaging breakdown in Raw Materials ONLY for Accepted items
    // Items that are on 'Hold / Supplier Return' or 'Rejected' are NOT added to inventory!
    const acceptedItems = sanitizedItems.filter(
      (item) => item.receivingStatus === 'Accepted'
    );

    const updatePromises = acceptedItems.map((item) => {
      const qtyToAdd = Number(item.actualQuantity) || 0;

      return RawMaterial.findByIdAndUpdate(
        item.rawMaterialId,
        {
          $inc: { quantity: qtyToAdd },
        },
        { new: true }
      );
    });

    await Promise.all(updatePromises);

    res.status(201).json({
      message: createdTickets.length > 0
        ? `Inbound shipment recorded! ${acceptedItems.length} item(s) added to inventory, and ${createdTickets.length} item(s) put ON HOLD with Supplier Return Ticket(s).`
        : "Inbound shipment recorded and stock updated!",
      inbound: savedInbound,
      createdTickets,
    });
  } catch (error) {
    console.error("Error recording inbound shipment:", error);
    res.status(500).json({ message: "Failed to record inbound shipment", error: error.message });
  }
};

export const getInboundLogs = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { batchPoNo: { $regex: search, $options: "i" } },
          { supplierBrand: { $regex: search, $options: "i" } },
        ],
      };
    }

    const logs = await Inbound.find(query).sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    return res.status(200).json(logs || []);
  } catch (error) {
    console.error("Error fetching inbound logs:", error);
    return res.status(200).json([]);
  }
};

export const getInboundReturnTickets = async (req, res) => {
  try {
    const tickets = await SupplierReturnTicket.find().sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    return res.status(200).json(tickets || []);
  } catch (error) {
    console.error("Error fetching supplier return tickets:", error);
    return res.status(500).json({ message: "Failed to fetch return tickets", error: error.message });
  }
};

export const updateReturnTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = [
      'Pending Supplier Return',
      'Return Initiated',
      'Item Returned',
      'Credit/Replacement Issued',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid ticket status.' });
    }

    const updateData = { status };
    if (notes !== undefined) updateData.notes = notes;

    const updated = await SupplierReturnTicket.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Supplier return ticket not found.' });
    }

    return res.status(200).json({
      message: `Supplier Return Ticket updated to "${status}"!`,
      ticket: updated,
    });
  } catch (error) {
    console.error("Error updating return ticket status:", error);
    return res.status(500).json({ message: "Failed to update return ticket", error: error.message });
  }
};