import mongoose from "mongoose";
import Order from "../models/LogisticOrder.js";
import Cart from "../models/CustomerCart.js";
import Product from "../models/InventoryProduct.js";
import { User } from "../models/AdminUser.js";
import { calculateTier } from "./AdminAuthController.js";
import { populateProductsList } from "./CustomerCartController.js";

// Helper function to deduct or restore stock in Product inventory (Bulk execution)
export const handleInventoryStockSync = async (order, newStatus) => {
  try {
    const deductStatuses = ["To Ship", "To Receive", "Completed"];
    const restoreStatuses = ["Cancelled", "Return Refund", "Order Placed", "To Pay"];

    if (deductStatuses.includes(newStatus) && !order.inventoryDeducted) {
      const bulkOps = [];
      for (const item of order.items || []) {
        if (!item.name && !item.product) continue;
        const qtyToDeduct = Number(item.quantity || 1);

        if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
          bulkOps.push({
            updateOne: {
              filter: { _id: item.product },
              update: { $inc: { quantity: -qtyToDeduct } },
            },
          });
        } else if (item.name) {
          bulkOps.push({
            updateOne: {
              filter: { $or: [{ itemDescription: item.name }, { code: item.name }] },
              update: { $inc: { quantity: -qtyToDeduct } },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps, { ordered: false }).catch(() => {});
      }
      order.inventoryDeducted = true;
      await Order.updateOne({ _id: order._id }, { $set: { inventoryDeducted: true } }).catch(() => {});
    }

    if (restoreStatuses.includes(newStatus) && order.inventoryDeducted) {
      const bulkOps = [];
      for (const item of order.items || []) {
        if (!item.name && !item.product) continue;
        const qtyToRestore = Number(item.quantity || 1);

        if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
          bulkOps.push({
            updateOne: {
              filter: { _id: item.product },
              update: { $inc: { quantity: qtyToRestore } },
            },
          });
        } else if (item.name) {
          bulkOps.push({
            updateOne: {
              filter: { $or: [{ itemDescription: item.name }, { code: item.name }] },
              update: { $inc: { quantity: qtyToRestore } },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps, { ordered: false }).catch(() => {});
      }
      order.inventoryDeducted = false;
      await Order.updateOne({ _id: order._id }, { $set: { inventoryDeducted: false } }).catch(() => {});
    }
  } catch (err) {
    console.warn("Non-blocking inventory sync warning:", err.message);
  }
};

// Create Order (Checkout)
export const createOrder = async (req, res) => {
  try {
    const { userId, shippingAddress, pointsRedeemed, paymentMethod, walletAmountApplied } = req.body;

    let orderItems = [];
    if (req.body.items && Array.isArray(req.body.items) && req.body.items.length > 0) {
      orderItems = req.body.items.map((item) => ({
        product: item.product || item._id || item.productId,
        name: item.name || item.itemDescription || item.title || "Product Item",
        price: Number(item.price || item.unitPrice || 0),
        quantity: Number(item.quantity || 1),
        image: item.image || item.imageUrl || (item.images && item.images[0]) || "",
      }));
    } else {
      const cart = await Cart.findOne({ userId }).lean().maxTimeMS(3000);
      if (cart && cart.items && cart.items.length > 0) {
        const populated = await populateProductsList(cart.items);
        orderItems = populated.map((item) => ({
          product: item.product?._id || item.product?.id,
          name: item.product?.itemDescription || item.product?.itemName || "Product Item",
          price: Number(item.product?.price || 0),
          quantity: Number(item.quantity || 1),
          image: item.product?.image || (item.product?.images && item.product?.images[0]) || "",
        }));
      }
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let totalAmount = orderItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    // Apply points redemption discount safely
    let discountFromPoints = 0;
    let user = null;
    if (userId) {
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId).maxTimeMS(3000).catch(() => null);
      }
      if (!user) {
        user = await User.findOne({ $or: [{ email: userId }, { username: userId }] }).maxTimeMS(3000).catch(() => null);
      }
    }

    if (user && pointsRedeemed && Number(pointsRedeemed) > 0) {
      const actualRedeemed = Math.min(user.rewardPoints || 0, Number(pointsRedeemed));
      discountFromPoints = actualRedeemed;
      user.rewardPoints = Math.max(0, (user.rewardPoints || 0) - actualRedeemed);
    }

    const finalVoucherDiscount = Number(req.body.voucherDiscount || 0);
    const finalShippingFee = Number(req.body.shippingFee || 0);
    totalAmount = Math.max(0, Math.round((totalAmount - finalVoucherDiscount - discountFromPoints + finalShippingFee) * 100) / 100);

    const finalPaymentMethod = paymentMethod || "Cash on Delivery";

    const newOrder = new Order({
      userId,
      items: orderItems,
      totalAmount,
      status: "Order Placed",
      paymentStatus:
        finalPaymentMethod.toLowerCase().includes("cod") ||
        finalPaymentMethod.toLowerCase().includes("cash on delivery")
          ? "Pending COD"
          : "Pending Payment",
      paymentMethod: finalPaymentMethod,
      shippingAddress: shippingAddress || "Default Address",
      customerNotes: req.body.customerNotes || "",
      shippingFee: Number(req.body.shippingFee || 0),
      voucherCode: req.body.voucherCode || "",
      voucherDiscount: Number(req.body.voucherDiscount || 0),
      pointsRedeemed: discountFromPoints,
      trackingTimeline: [
        {
          title: "Order Placed",
          description: "Your order has been placed and is waiting for seller confirmation.",
          timestamp: new Date(),
          status: "Order Placed",
        },
      ],
    });

    await newOrder.save();

    // Run loyalty update and cart clear concurrently (stock will be deducted once confirmed / moving to To Ship)
    const tasks = [
      Cart.updateOne({ userId }, { $set: { items: [] } }).catch(() => {}),
    ];

    if (user) {
      const pointsEarned = Math.floor(totalAmount / 50); // 1 point per ₱50 spent
      user.rewardPoints = (user.rewardPoints || 0) + pointsEarned;
      user.totalSpent = (user.totalSpent || 0) + totalAmount;
      user.tier = calculateTier(user.totalSpent);
      tasks.push(user.save().catch(() => {}));
    }

    await Promise.allSettled(tasks);

    return res.status(201).json({
      message: "Order placed successfully!",
      order: newOrder,
      earnedPoints: user ? Math.floor(totalAmount / 50) : 0,
      newTier: user?.tier
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper to normalize paymentStatus based on fulfillment status
const normalizeOrderPayment = (order) => {
  if (!order) return order;
  const status = String(order.status || "").toLowerCase().trim();
  if (status === "completed" || status === "delivered" || status === "to review") {
    order.paymentStatus = "Paid";
  }
  return order;
};

// Get All Orders for Admin / SalesOrderManagement
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean().maxTimeMS(5000);
    const normalized = (orders || []).map(normalizeOrderPayment);
    return res.status(200).json(normalized);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    return res.status(200).json([]);
  }
};

// Get User Orders
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let userIds = [userId];
    try {
      let user = null;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId).select("_id email username customerNo customerCode empNo").lean().maxTimeMS(3000).catch(() => null);
      }
      if (!user && userId) {
        const cleanId = String(userId).trim();
        user = await User.findOne({
          $or: [
            { email: cleanId.toLowerCase() },
            { username: cleanId },
            { customerNo: cleanId },
            { customerCode: cleanId },
            { empNo: cleanId },
          ],
        }).select("_id email username customerNo customerCode empNo").lean().maxTimeMS(3000).catch(() => null);
      }
      if (user) {
        if (user._id) userIds.push(String(user._id));
        if (user.email) userIds.push(user.email);
        if (user.username) userIds.push(user.username);
        if (user.customerNo) userIds.push(user.customerNo);
        if (user.customerCode) userIds.push(user.customerCode);
        if (user.empNo) userIds.push(user.empNo);
      }
    } catch (e) {}

    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));

    let query = {
      $or: [
        { userId: { $in: uniqueUserIds } },
        { customerEmail: { $in: uniqueUserIds } },
      ],
    };
    if (status && status !== "All") {
      if (status === "To Pay") {
        query.status = { $in: ["Order Placed", "To Pay"] };
      } else if (status === "To Review" || status === "Completed") {
        query.status = { $in: ["Completed", "Delivered", "To Review"] };
      } else if (status === "Returns" || status === "Return" || status === "Return Refund") {
        query.status = { $in: ["Return", "Returned", "Return Requested", "Return Refund"] };
      } else {
        query.status = status;
      }
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean().maxTimeMS(4000).catch(() => []);
    const normalized = (orders || []).map(normalizeOrderPayment);
    return res.status(200).json(normalized);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return res.status(200).json([]);
  }
};

// Update Order Status (Admin / Logistics Action)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, paymentStatus, courier, trackingNumber, proofOfDelivery, estimatedDelivery } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status) {
      order.status = status;
    }

    if (courier !== undefined) {
      order.courier = courier;
    }

    if (trackingNumber !== undefined) {
      order.trackingNumber = trackingNumber;
    }

    // Handle Proof of Delivery
    if (proofOfDelivery) {
      order.proofOfDelivery = {
        image: proofOfDelivery.image || order.proofOfDelivery?.image || "",
        recipientName: proofOfDelivery.recipientName || order.proofOfDelivery?.recipientName || "",
        deliveredAt: proofOfDelivery.deliveredAt || new Date(),
        notes: proofOfDelivery.notes || order.proofOfDelivery?.notes || "",
      };
    }

    // Handle Estimated Delivery Date & Weather Delay
    if (estimatedDelivery) {
      order.estimatedDelivery = {
        startDate: estimatedDelivery.startDate || order.estimatedDelivery?.startDate || "",
        endDate: estimatedDelivery.endDate || order.estimatedDelivery?.endDate || "",
        formattedRange: estimatedDelivery.formattedRange || order.estimatedDelivery?.formattedRange || "",
        isDelayed: Boolean(estimatedDelivery.isDelayed),
        delayReason: estimatedDelivery.delayReason || "",
      };
    }

    // Auto-generate default 3-5 day estimate if moving to To Ship without one
    if (status === "To Ship" && (!order.estimatedDelivery || !order.estimatedDelivery.formattedRange)) {
      const start = new Date();
      start.setDate(start.getDate() + 3);
      const end = new Date();
      end.setDate(end.getDate() + 5);
      const opt = { month: "short", day: "numeric" };
      order.estimatedDelivery = {
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        formattedRange: `${start.toLocaleDateString("en-US", opt)} - ${end.toLocaleDateString("en-US", opt)}`,
        isDelayed: false,
        delayReason: "",
      };
    }

    // Append to Tracking Timeline
    if (!order.trackingTimeline) order.trackingTimeline = [];
    if (status === "To Ship") {
      order.trackingTimeline.push({
        title: "Order Confirmed & Packing",
        description: "Seller confirmed order. Items are being packed for courier handover.",
        timestamp: new Date(),
        status: "To Ship",
      });
    } else if (status === "To Receive") {
      const courierName = order.courier || "Courier Partner";
      const waybill = order.trackingNumber ? ` (Waybill: ${order.trackingNumber})` : "";
      order.trackingTimeline.push({
        title: "Handed Over to Courier / In Transit",
        description: `Parcel has been dispatched via ${courierName}${waybill}. Out for delivery to destination.`,
        timestamp: new Date(),
        status: "To Receive",
      });
    } else if (status === "Completed" || status === "Delivered") {
      const recipient = order.proofOfDelivery?.recipientName ? ` (Received by ${order.proofOfDelivery.recipientName})` : "";
      order.trackingTimeline.push({
        title: "Parcel Delivered & COD Collected",
        description: `Order successfully delivered${recipient}. Cash on Delivery collected by courier rider.`,
        timestamp: new Date(),
        status: "Completed",
      });
    } else if (status === "Cancelled") {
      order.trackingTimeline.push({
        title: "Order Cancelled",
        description: "Order fulfillment cancelled. Warehouse stock restored.",
        timestamp: new Date(),
        status: "Cancelled",
      });
    }

    // Once an order is Delivered, Completed, or To Review, Cash on Delivery is collected -> Payment is "Paid"!
    const normalizedStatus = String(status || order.status || "").toLowerCase().trim();
    if (
      normalizedStatus === "completed" ||
      normalizedStatus === "delivered" ||
      normalizedStatus === "to review"
    ) {
      order.paymentStatus = "Paid";
    } else if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();

    // Sync inventory stock based on new status
    if (status) {
      await handleInventoryStockSync(order, status);
    }

    res.status(200).json({
      message: `Order updated successfully`,
      order
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Customer requests cancellation (Does NOT cancel immediately)
export const requestOrderCancellation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = "Customer requested cancellation" } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Order is already cancelled." });
    }

    const uncancelableStatuses = ["In Transit", "To Receive", "Delivered", "Completed"];
    if (uncancelableStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Orders already in transit or delivered cannot be cancelled. You may submit a return request instead.",
      });
    }

    if (order.cancellationRequest?.status === "Pending") {
      return res.status(400).json({
        success: false,
        message: "A cancellation request for this order is already pending review by Logistics.",
      });
    }

    order.cancellationRequest = {
      status: "Pending",
      reason: reason.trim(),
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: "",
      rejectionReason: "",
    };

    if (!order.trackingTimeline) order.trackingTimeline = [];
    order.trackingTimeline.push({
      title: "Cancellation Requested",
      description: `Customer submitted cancellation request: "${reason.trim()}". Awaiting Logistics review.`,
      timestamp: new Date(),
      status: order.status,
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Cancellation request submitted. Awaiting Logistics approval.",
      order,
    });
  } catch (error) {
    console.error("Error submitting cancellation request:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Logistics approves or rejects cancellation request
export const reviewOrderCancellation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, rejectionReason = "", reviewedBy = "Logistics Admin" } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    if (order.cancellationRequest?.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "This order does not have an active pending cancellation request.",
      });
    }

    if (action === "approve") {
      order.status = "Cancelled";
      order.cancellationRequest.status = "Approved";
      order.cancellationRequest.reviewedAt = new Date();
      order.cancellationRequest.reviewedBy = reviewedBy;

      if (!order.trackingTimeline) order.trackingTimeline = [];
      order.trackingTimeline.push({
        title: "Order Cancelled (Approved by Logistics)",
        description: `Logistics approved the customer cancellation request (${order.cancellationRequest.reason || "Customer request"}). Order is cancelled.`,
        timestamp: new Date(),
        status: "Cancelled",
      });

      // Restore inventory stock if previously deducted
      await handleInventoryStockSync(order, "Cancelled");
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Order cancellation approved. Order is now cancelled and stock restored.",
        order,
      });
    } else if (action === "reject") {
      order.cancellationRequest.status = "Rejected";
      order.cancellationRequest.reviewedAt = new Date();
      order.cancellationRequest.reviewedBy = reviewedBy;
      order.cancellationRequest.rejectionReason = rejectionReason || "Order is already prepared for fulfillment.";

      if (!order.trackingTimeline) order.trackingTimeline = [];
      order.trackingTimeline.push({
        title: "Cancellation Request Declined",
        description: `Logistics declined cancellation request: "${order.cancellationRequest.rejectionReason}". Fulfillment continues.`,
        timestamp: new Date(),
        status: order.status,
      });

      await order.save();

      return res.status(200).json({
        success: true,
        message: "Cancellation request declined. Order fulfillment will proceed.",
        order,
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid action. Must be 'approve' or 'reject'." });
    }
  } catch (error) {
    console.error("Error reviewing cancellation request:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};