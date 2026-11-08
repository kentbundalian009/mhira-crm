import mongoose from "mongoose";
import Order from "../models/LogisticOrder.js";
import Cart from "../models/CustomerCart.js";
import Product from "../models/InventoryProduct.js";
import Collection from "../models/MarketingCollection.js";
import { User } from "../models/AdminUser.js";
import { calculateTier } from "./AdminAuthController.js";
import { populateProductsList } from "./CustomerCartController.js";
import { computeLocationShipping } from "./LogisticsShippingController.js";

export const isTransitOrBeyond = (status) => {
  const s = String(status || "").toLowerCase().trim();
  return (
    s === "in transit" ||
    s === "in-transit" ||
    s === "to receive" ||
    s === "to-receive" ||
    s === "completed" ||
    s === "delivered"
  );
};

export const isPreTransit = (status) => {
  const s = String(status || "").toLowerCase().trim();
  return (
    s === "order placed" ||
    s === "order-placed" ||
    s === "to pay" ||
    s === "to-pay" ||
    s === "to ship" ||
    s === "to-ship" ||
    s === "cancelled" ||
    s === "return refund" ||
    s === "return" ||
    s === "returned"
  );
};

/**
 * Resolves an order item to target inventory products in the database.
 * Handles:
 * 1. Direct Product ObjectId
 * 2. Collection ObjectId (resolving coll.productRef)
 * 3. Package Set Bundles (resolving each bundleItem to its Product and applying bundle quantity)
 * 4. Product Code match (e.g. FG0001)
 * 5. Product Name / itemDescription match
 */
export const resolveProductTargets = async (item, itemQty) => {
  const targets = [];
  const baseQty = Number(item?.quantity ?? itemQty ?? 1);
  if (baseQty <= 0) return targets;

  // 1. If item.product is a valid ObjectId
  if (item.product && mongoose.Types.ObjectId.isValid(item.product)) {
    const prodId = new mongoose.Types.ObjectId(item.product);

    // Direct Product check
    const directProduct = await Product.findById(prodId).lean();
    if (directProduct) {
      targets.push({
        productId: directProduct._id,
        productName: directProduct.itemName || directProduct.itemDescription,
        qty: baseQty,
      });
      return targets;
    }

    // Collection check
    const coll = await Collection.findById(prodId).lean();
    if (coll) {
      if (coll.isBundle && Array.isArray(coll.bundleItems) && coll.bundleItems.length > 0) {
        for (const bItem of coll.bundleItems) {
          const bQty = Number(bItem.quantity || 1) * baseQty;
          let bProd = null;
          if (bItem.productRef) {
            bProd = await Product.findById(bItem.productRef).lean();
          }
          if (!bProd && bItem.code) {
            bProd = await Product.findOne({
              $or: [{ code: bItem.code }, { code: new RegExp(`^${bItem.code}$`, "i") }],
            }).lean();
          }
          if (bProd) {
            targets.push({
              productId: bProd._id,
              collectionId: coll._id,
              productName: bProd.itemName || bProd.itemDescription,
              qty: bQty,
            });
          }
        }
        if (targets.length > 0) return targets;
      } else if (coll.productRef) {
        const refProduct = await Product.findById(coll.productRef).lean();
        if (refProduct) {
          targets.push({
            productId: refProduct._id,
            collectionId: coll._id,
            productName: refProduct.itemName || refProduct.itemDescription,
            qty: baseQty,
          });
          return targets;
        }
      }
    }
  }

  // 2. Try resolving by code
  const codeCandidate = item.code || (typeof item.product === "string" ? item.product : "");
  if (codeCandidate && codeCandidate.trim()) {
    const cleanCode = codeCandidate.trim();
    const prodByCode = await Product.findOne({
      $or: [
        { code: cleanCode },
        { code: new RegExp(`^${cleanCode}$`, "i") },
      ],
    }).lean();
    if (prodByCode) {
      targets.push({
        productId: prodByCode._id,
        productName: prodByCode.itemName || prodByCode.itemDescription,
        qty: baseQty,
      });
      return targets;
    }
  }

  // 3. Try resolving by name or description
  const nameCandidate = item.name || item.itemName || item.itemDescription;
  if (nameCandidate && nameCandidate.trim()) {
    const cleanName = nameCandidate.trim();
    const prodByName = await Product.findOne({
      $or: [
        { itemName: cleanName },
        { itemName: new RegExp(`^${cleanName}$`, "i") },
        { itemDescription: cleanName },
        { itemDescription: new RegExp(`^${cleanName}$`, "i") },
        { code: cleanName },
        { code: new RegExp(`^${cleanName}$`, "i") },
      ],
    }).lean();
    if (prodByName) {
      targets.push({
        productId: prodByName._id,
        productName: prodByName.itemName || prodByName.itemDescription,
        qty: baseQty,
      });
      return targets;
    }

    // Check Collection by name (and bundle support)
    const collByName = await Collection.findOne({
      $or: [
        { itemDescription: cleanName },
        { itemDescription: new RegExp(`^${cleanName}$`, "i") },
        { code: cleanName },
        { code: new RegExp(`^${cleanName}$`, "i") },
      ],
    }).lean();
    if (collByName) {
      if (collByName.isBundle && Array.isArray(collByName.bundleItems) && collByName.bundleItems.length > 0) {
        for (const bItem of collByName.bundleItems) {
          const bQty = Number(bItem.quantity || 1) * baseQty;
          let bProd = null;
          if (bItem.productRef) {
            bProd = await Product.findById(bItem.productRef).lean();
          }
          if (!bProd && bItem.code) {
            bProd = await Product.findOne({
              $or: [{ code: bItem.code }, { code: new RegExp(`^${bItem.code}$`, "i") }],
            }).lean();
          }
          if (bProd) {
            targets.push({
              productId: bProd._id,
              collectionId: collByName._id,
              productName: bProd.itemName || bProd.itemDescription,
              qty: bQty,
            });
          }
        }
        if (targets.length > 0) return targets;
      } else if (collByName.productRef) {
        const refProduct = await Product.findById(collByName.productRef).lean();
        if (refProduct) {
          targets.push({
            productId: refProduct._id,
            collectionId: collByName._id,
            productName: refProduct.itemName || refProduct.itemDescription,
            qty: baseQty,
          });
          return targets;
        }
      }
    }
  }

  return targets;
};

// Helper function to deduct or restore stock in Product inventory (Specifically upon "In Transit")
export const handleInventoryStockSync = async (order, newStatus) => {
  try {
    if (!order || !order.items || order.items.length === 0) return;

    // A. DEDUCT: Triggered when order reaches "In Transit" or beyond, and has NOT yet been deducted
    if (isTransitOrBeyond(newStatus) && !order.inventoryDeducted) {
      for (const item of order.items) {
        const targets = await resolveProductTargets(item, item.quantity);
        for (const t of targets) {
          // Decrement from Product inventory
          await Product.updateOne(
            { _id: t.productId },
            { $inc: { quantity: -t.qty } }
          );

          // Decrement Collection quantity if present
          if (t.collectionId) {
            await Collection.updateOne(
              { _id: t.collectionId },
              { $inc: { quantity: -t.qty } }
            );
          }
        }
      }

      order.inventoryDeducted = true;
      await Order.updateOne({ _id: order._id }, { $set: { inventoryDeducted: true } });
      console.log(`[Inventory Stock Sync] Deducted stock for Order ${order._id} on status: ${newStatus} (In Transit)`);
    }

    // B. RESTORE: Triggered if an in-transit order is cancelled, returned, or reset to pre-transit
    if (isPreTransit(newStatus) && order.inventoryDeducted) {
      for (const item of order.items) {
        const targets = await resolveProductTargets(item, item.quantity);
        for (const t of targets) {
          // Increment back into Product inventory
          await Product.updateOne(
            { _id: t.productId },
            { $inc: { quantity: t.qty } }
          );

          // Increment Collection quantity if present
          if (t.collectionId) {
            await Collection.updateOne(
              { _id: t.collectionId },
              { $inc: { quantity: t.qty } }
            );
          }
        }
      }

      order.inventoryDeducted = false;
      await Order.updateOne({ _id: order._id }, { $set: { inventoryDeducted: false } });
      console.log(`[Inventory Stock Sync] Restored stock for Order ${order._id} on status: ${newStatus}`);
    }
  } catch (err) {
    console.warn("[Inventory Stock Sync] Non-blocking warning:", err.message);
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
    const computedShipping = await computeLocationShipping({
      address: shippingAddress,
      subtotal: totalAmount,
    });
    const finalShippingFee = Number(computedShipping.shippingFee ?? req.body.shippingFee ?? 0);
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
      shippingFee: finalShippingFee,
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
      } else if (status === "In Transit" || status === "To Receive") {
        query.status = { $in: ["In Transit", "To Receive"] };
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
    } else if (status === "To Receive" || status === "In Transit") {
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