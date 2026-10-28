import ReturnRequest from "../models/LogisticReturnRequest.js";
import Order from "../models/LogisticOrder.js";
import Collection from "../models/MarketingCollection.js";
import Product from "../models/InventoryProduct.js";
import ScrapAuditLog from "../models/ScrapAuditLog.js";

// Helper to generate unique Scrap Log ID
const generateScrapId = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await ScrapAuditLog.countDocuments();
  return `SCRAP-RMA-${dateStr}-${String(count + 1).padStart(4, '0')}`;
};

// 1. Create Return Request (Customer Side)
export const createReturnRequest = async (req, res) => {
  try {
    const { orderId, userId, reason, comments, items, refundAmount, customerName } = req.body;

    // Check if order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check if a return request already exists for this order
    const existingReturn = await ReturnRequest.findOne({ orderId });
    if (existingReturn) {
      return res.status(400).json({ message: "A return request for this order already exists." });
    }

    // Prepare items to return (if not supplied, use order items)
    const returnItems = (items && items.length > 0)
      ? items
      : order.items.map((i) => ({
          product: i.product,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        }));

    const amount = Number(refundAmount) || Number(order.totalAmount) || 0;

    const newReturn = new ReturnRequest({
      orderId,
      userId: userId || order.userId,
      customerName: customerName || "Customer",
      items: returnItems,
      reason: reason || "Damaged / Broken Item",
      comments: comments || "",
      refundAmount: amount,
      status: "Pending",
    });

    await newReturn.save();

    // Update the Order status to "Return Refund"
    order.status = "Return Refund";
    await order.save();

    res.status(201).json({
      message: "Return request submitted successfully",
      returnRequest: newReturn,
    });
  } catch (error) {
    console.error("Error creating return request:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 2. Get All Return Requests (Admin / SalesReturnManagement.jsx)
export const getAllReturnRequests = async (req, res) => {
  try {
    const returns = await ReturnRequest.find()
      .populate("orderId")
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(5000);
    return res.status(200).json(returns || []);
  } catch (error) {
    console.error("Error fetching return requests:", error);
    return res.status(200).json([]);
  }
};

// 3. Get User Return Requests (Customer Side)
export const getUserReturnRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const returns = await ReturnRequest.find({ userId })
      .populate("orderId")
      .sort({ createdAt: -1 })
      .lean()
      .maxTimeMS(5000);
    return res.status(200).json(returns || []);
  } catch (error) {
    console.error("Error fetching user return requests:", error);
    return res.status(200).json([]);
  }
};

// 4. Update Return Request Status (Admin Action - Approve / Reject)
export const updateReturnStatus = async (req, res) => {
  try {
    const { returnId } = req.params;
    const { status, adminNotes, restockAction, approverName, dispositionReason, replacementCourier, replacementTracking } = req.body; 
    // status: "Approved" | "Rejected" | "Pending"
    // restockAction: "Return to Inventory" | "Dispose/Scrap" | "Send Replacement to Client"

    const existingReturn = await ReturnRequest.findById(returnId);
    if (!existingReturn) {
      return res.status(404).json({ message: "Return request not found" });
    }

    if (status === "Approved") {
      if (!restockAction || !["Return to Inventory", "Dispose/Scrap", "Send Replacement to Client"].includes(restockAction)) {
        return res.status(400).json({
          message: "Please choose whether to 'Return to Inventory', 'Dispose/Scrap', or 'Send Replacement to Client'.",
        });
      }

      if (!approverName || !approverName.trim()) {
        return res.status(400).json({
          message: "Approver/Inspector Name is strictly required to prevent inventory shrinkage/theft.",
        });
      }
    }

    existingReturn.status = status;
    if (adminNotes !== undefined) existingReturn.adminNotes = adminNotes;
    if (restockAction) existingReturn.restockAction = restockAction;
    if (approverName) existingReturn.approverName = approverName.trim();
    if (dispositionReason) existingReturn.dispositionReason = dispositionReason.trim();
    if (replacementCourier) existingReturn.replacementCourier = replacementCourier.trim();
    if (replacementTracking) existingReturn.replacementTracking = replacementTracking.trim();

    await existingReturn.save();

    let order = null;
    if (existingReturn.orderId) {
      order = await Order.findById(existingReturn.orderId);
      if (order) {
        if (!order.trackingTimeline) order.trackingTimeline = [];

        if (status === "Approved") {
          if (restockAction === "Send Replacement to Client") {
            // Moving back into delivery fulfillment for replacement
            order.status = "To Receive";
            if (replacementCourier) order.courier = replacementCourier;
            if (replacementTracking) order.trackingNumber = replacementTracking;
            order.trackingTimeline.push({
              title: "Replacement Package Dispatched to Client",
              description: `Replacement order sent via ${replacementCourier || "Express Courier"} (${replacementTracking ? `Waybill: ${replacementTracking}` : "Tracking pending"}). Deducted from warehouse stock.`,
              timestamp: new Date(),
              status: "To Receive",
            });
          } else {
            order.status = "Return Refund";
            order.paymentStatus = "Failed";
            order.trackingTimeline.push({
              title: restockAction === "Return to Inventory" ? "Return Restocked to Inventory" : "Return Inspected & Scrapped",
              description: `Return resolved by ${approverName.trim()}. Disposition: ${restockAction}. Notes: ${dispositionReason || adminNotes || "Processed"}`,
              timestamp: new Date(),
              status: "Return Refund",
            });
          }
        } else if (status === "Rejected") {
          order.status = "Completed";
          order.trackingTimeline.push({
            title: "Return Request Rejected",
            description: `Return request rejected by inspector ${approverName || "Logistics"}. Reason: ${adminNotes || "Requirements not met"}`,
            timestamp: new Date(),
            status: "Completed",
          });
        }
        await order.save();
      }
    }

    // Handle Inventory and Scrap Disposition
    if (status === "Approved" && existingReturn.items && existingReturn.items.length > 0) {
      const orderRef = order ? (order.orderNumber || order._id.toString()) : existingReturn._id.toString();

      if (restockAction === "Return to Inventory") {
        // Customer cancelled / RTS in good condition -> increment inventory stock back
        for (const item of existingReturn.items) {
          const qty = Number(item.quantity) || 1;
          if (item.product) {
            const col = await Collection.findByIdAndUpdate(
              item.product,
              { $inc: { quantity: qty } },
              { new: true }
            );
            if (col && col.productRef) {
              await Product.findByIdAndUpdate(col.productRef, { $inc: { quantity: qty } });
            }
          }
        }
      } else if (restockAction === "Dispose/Scrap") {
        // Defective/damaged -> Strictly do NOT restock. Log to ScrapAuditLog
        for (const item of existingReturn.items) {
          const qty = Number(item.quantity) || 1;
          const scrapLogId = await generateScrapId();
          const scrapEntry = new ScrapAuditLog({
            logId: scrapLogId,
            itemType: "Customer Return Damaged",
            itemCode: item.product ? String(item.product) : "",
            itemName: item.name || "Returned Item",
            batchId: orderRef,
            quantity: qty,
            uom: "pcs",
            reason: dispositionReason || existingReturn.reason || "Customer return defective/damaged",
            approverName: approverName.trim(),
            disposition: "Scrap / Dispose",
            notes: `RMA ID: ${existingReturn._id}. Order: ${orderRef}. Customer: ${existingReturn.customerName || 'N/A'}. Reason: ${existingReturn.reason}`,
          });
          await scrapEntry.save();
        }
      } else if (restockAction === "Send Replacement to Client") {
        // Replacement dispatched to client -> Deduct inventory (-qty) from warehouse!
        for (const item of existingReturn.items) {
          const qty = Number(item.quantity) || 1;
          if (item.product) {
            const col = await Collection.findByIdAndUpdate(
              item.product,
              { $inc: { quantity: -qty } },
              { new: true }
            );
            if (col && col.productRef) {
              await Product.findByIdAndUpdate(col.productRef, { $inc: { quantity: -qty } });
            }
          }
        }
      }
    }

    res.status(200).json({
      message: `Return request ${status.toLowerCase()} successfully`,
      returnRequest: existingReturn,
    });
  } catch (error) {
    console.error("Error updating return status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
