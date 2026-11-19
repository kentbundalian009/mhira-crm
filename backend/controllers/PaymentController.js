import mongoose from "mongoose";
import Order from "../models/LogisticOrder.js";
import Cart from "../models/CustomerCart.js";
import Product from "../models/InventoryProduct.js";
import { User } from "../models/AdminUser.js";
import { calculateTier } from "./AdminAuthController.js";
import { populateProductsList } from "./CustomerCartController.js";
import { handleInventoryStockSync } from "./LogisticOrderController.js";
import { computeLocationShipping } from "./LogisticsShippingController.js";
import { findUserByIdentifier, awardLoyaltyPoints } from "../utils/userLookup.js";

// Helper to get active PayMongo Secret Key
export const getPayMongoSecretKey = () => {
  const env = (process.env.PAYMONGO_ENV || "test").toLowerCase().trim();
  const isLive = env === "live" || env === "production";
  
  if (isLive) {
    const liveKey = process.env.PAYMONGO_LIVE_SECRET_KEY || process.env.PAYMONGO_SECRET_KEY;
    if (liveKey && liveKey.trim()) return liveKey.trim();
  }

  // Test mode or generic env key
  const testKey =
    process.env.PAYMONGO_TEST_SECRET_KEY ||
    process.env.PAYMONGO_SECRET_KEY ||
    process.env.PAYMONGO_LIVE_SECRET_KEY;
  if (testKey && testKey.trim()) return testKey.trim();

  // Fallback to default PayMongo test secret key if not set in cloud host environment
  return "sk_test_WNGVs7yVVvzBSemJ5Sqq7rfK";
};

// Helper to get active PayMongo Public Key
export const getPayMongoPublicKey = () => {
  const env = (process.env.PAYMONGO_ENV || "test").toLowerCase().trim();
  const isLive = env === "live" || env === "production";

  if (isLive) {
    const liveKey = process.env.PAYMONGO_LIVE_PUBLIC_KEY || process.env.PAYMONGO_PUBLIC_KEY;
    if (liveKey && liveKey.trim()) return liveKey.trim();
  }

  // Test mode or generic env key
  const testKey =
    process.env.PAYMONGO_TEST_PUBLIC_KEY ||
    process.env.PAYMONGO_PUBLIC_KEY ||
    process.env.PAYMONGO_LIVE_PUBLIC_KEY;
  if (testKey && testKey.trim()) return testKey.trim();

  // Fallback to default PayMongo test public key if not set in cloud host environment
  return "pk_test_1CHfU6Pe2gLYKZ1Xy2wbBJDm";
};

// Helper to create PayMongo Auth Header
const getPayMongoAuthHeader = () => {
  const secretKey = getPayMongoSecretKey();
  if (!secretKey) {
    throw new Error("PayMongo secret key is not configured in backend environment variables.");
  }
  const token = Buffer.from(`${secretKey}:`).toString("base64");
  return `Basic ${token}`;
};

const MHIRA_BRAND_FALLBACK_IMAGE = "https://files.catbox.moe/hrz9h0.png";

const ALL_PAYMONGO_TYPES = ["gcash", "paymaya", "card", "grab_pay", "dob", "billease"];

const PAYMONGO_METHOD_MAP = {
  gcash: { type: "gcash", label: "GCash" },
  paymaya: { type: "paymaya", label: "Maya" },
  maya: { type: "paymaya", label: "Maya" },
  card: { type: "card", label: "Credit / Debit Card" },
  "credit / debit card": { type: "card", label: "Credit / Debit Card" },
  "credit/debit card": { type: "card", label: "Credit / Debit Card" },
  grab_pay: { type: "grab_pay", label: "GrabPay" },
  grabpay: { type: "grab_pay", label: "GrabPay" },
  dob: { type: "dob", label: "Online Banking (BPI / UB)" },
  dob_ubp: { type: "dob", label: "Online Banking (BPI / UB)" },
  "online banking": { type: "dob", label: "Online Banking (BPI / UB)" },
  "online banking (bpi / ub)": { type: "dob", label: "Online Banking (BPI / UB)" },
  bpi: { type: "dob", label: "Online Banking (BPI / UB)" },
  billease: { type: "billease", label: "BillEase" },
};

export const resolvePayMongoMethod = (input) => {
  const raw = String(input || "").toLowerCase().trim();
  if (!raw) {
    return { types: ALL_PAYMONGO_TYPES, label: "PayMongo Online Payment", singleType: "" };
  }
  if (PAYMONGO_METHOD_MAP[raw]) {
    const m = PAYMONGO_METHOD_MAP[raw];
    return { types: [m.type], label: m.label, singleType: m.type };
  }
  if (raw.includes("gcash")) return { types: ["gcash"], label: "GCash", singleType: "gcash" };
  if (raw.includes("maya")) return { types: ["paymaya"], label: "Maya", singleType: "paymaya" };
  if (raw.includes("grab")) return { types: ["grab_pay"], label: "GrabPay", singleType: "grab_pay" };
  if (raw.includes("billease")) return { types: ["billease"], label: "BillEase", singleType: "billease" };
  if (raw.includes("dob") || raw.includes("bpi") || raw.includes("online banking")) {
    return { types: ["dob"], label: "Online Banking (BPI / UB)", singleType: "dob" };
  }
  if (raw.includes("card") && !raw.includes("e-wallet")) {
    return { types: ["card"], label: "Credit / Debit Card", singleType: "card" };
  }
  return { types: ALL_PAYMONGO_TYPES, label: "PayMongo Online Payment", singleType: "" };
};

export const formatPayMongoMethodLabel = (rawType, fallback = "PayMongo Online Payment") => {
  const resolved = resolvePayMongoMethod(rawType);
  if (resolved.singleType) return resolved.label;
  const fb = String(fallback || "").trim();
  if (fb && !fb.toLowerCase().includes("e-wallet / card") && !fb.toLowerCase().includes("e-wallet / online")) {
    return fb;
  }
  return resolved.label;
};

/**
 * Helper to upload base64 image on the fly to permanent CDN if needed
 */
export const uploadBase64ToCDN = async (base64Str, filename = "product") => {
  if (!base64Str || typeof base64Str !== "string") return null;
  const match = base64Str.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  const base64Data = match ? match[2] : (base64Str.startsWith("data:") ? "" : base64Str);
  if (!base64Data) return null;
  const ext = match ? (match[1] === "jpeg" ? "jpg" : match[1]) : "png";

  try {
    const buffer = Buffer.from(base64Data, "base64");
    const blob = new Blob([buffer], { type: `image/${ext}` });
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", blob, `${filename}_${Date.now()}.${ext}`);

    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
    });
    const url = await res.text();
    if (url && url.startsWith("https://files.catbox.moe/")) {
      return url.trim();
    }
  } catch (err) {
    console.error("Failed to upload on-the-fly base64 to CDN:", err.message);
  }
  return null;
};

/**
 * Helper to ensure image URLs provided to PayMongo line items are valid, public, and fast-loading
 */
export const resolvePayMongoImageUrl = async (img) => {
  if (!img || typeof img !== "string" || img.trim() === "") {
    return [MHIRA_BRAND_FALLBACK_IMAGE];
  }
  const trimmed = img.trim();

  // If already a valid public HTTPS URL, use it directly!
  if (trimmed.startsWith("https://") && !trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
    return [trimmed];
  }

  // If base64 data URL, upload on-the-fly to permanent CDN
  if (trimmed.startsWith("data:image")) {
    const cdnUrl = await uploadBase64ToCDN(trimmed);
    if (cdnUrl) return [cdnUrl];
    return [MHIRA_BRAND_FALLBACK_IMAGE];
  }

  // If public HTTP (non-localhost)
  if (trimmed.startsWith("http://") && !trimmed.includes("localhost") && !trimmed.includes("127.0.0.1")) {
    return [trimmed];
  }

  // Default brand fallback image
  return [MHIRA_BRAND_FALLBACK_IMAGE];
};

/**
 * 1. Create PayMongo Checkout Session
 * POST /api/payments/create-checkout-session
 */
export const createPayMongoCheckoutSession = async (req, res) => {
  try {
    const {
      userId,
      shippingAddress,
      customerNotes,
      shippingFee = 0,
      voucherCode = "",
      voucherDiscount = 0,
      pointsRedeemed = 0,
      paymentMethod = "",
      paymongoMethodType = "",
      successUrl,
      cancelUrl,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Please log in to your customer account to proceed with checkout.",
      });
    }

    // Resolve order items
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
      return res.status(400).json({ success: false, message: "Order bag is empty." });
    }

    // Subtotal
    const merchandiseSubtotal = orderItems.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );

    // Apply points redemption discount safely
    let discountFromPoints = 0;
    const user = await findUserByIdentifier(userId);

    if (user && pointsRedeemed && Number(pointsRedeemed) > 0) {
      const actualRedeemed = Math.min(user.rewardPoints || 0, Number(pointsRedeemed));
      discountFromPoints = actualRedeemed;
      user.rewardPoints = Math.max(0, (user.rewardPoints || 0) - actualRedeemed);
      await user.save().catch(() => {});
    }

    const totalDiscount = Number(voucherDiscount || 0) + discountFromPoints;
    const computedShipping = await computeLocationShipping({
      address: shippingAddress,
      subtotal: merchandiseSubtotal,
    });
    const finalShippingFee = Number(computedShipping.shippingFee ?? shippingFee ?? 0);
    const totalAmount = Math.max(20, Math.round((merchandiseSubtotal - totalDiscount + finalShippingFee) * 100) / 100);

    const resolvedMethod = resolvePayMongoMethod(paymongoMethodType || paymentMethod);

    // Create the order in database initially as "To Pay" / "Pending Payment"
    const newOrder = new Order({
      userId,
      items: orderItems,
      totalAmount,
      status: "To Pay",
      paymentStatus: "Pending Payment",
      paymentMethod: resolvedMethod.label,
      paymentDetails: resolvedMethod.singleType
        ? { paymentMethodType: resolvedMethod.singleType }
        : {},
      shippingAddress: shippingAddress || "Default Address",
      customerNotes: customerNotes || "",
      shippingFee: finalShippingFee,
      voucherCode: voucherCode || "",
      voucherDiscount: Number(voucherDiscount || 0),
      pointsRedeemed: discountFromPoints,
      trackingTimeline: [
        {
          title: "Order Placed",
          description: `Order registered. Awaiting ${resolvedMethod.label} payment completion via PayMongo.`,
          timestamp: new Date(),
          status: "To Pay",
        },
      ],
    });

    await newOrder.save();

    // Clear user cart upon successful checkout attempt
    await Cart.updateOne({ userId }, { $set: { items: [] } }).catch(() => {});

    // Prepare line items for PayMongo Checkout Session
    // In PayMongo, line items amount must be in centavos (PHP * 100), >= 2000 (₱20.00)
    let paymongoLineItems = [];

    if (totalDiscount <= 0) {
      // Direct mapping
      paymongoLineItems = await Promise.all(
        orderItems.map(async (item) => ({
          name: item.name || "Product Item",
          amount: Math.max(2000, Math.round(item.price * 100)),
          quantity: item.quantity,
          currency: "PHP",
          images: await resolvePayMongoImageUrl(item.image),
        }))
      );
    } else {
      // Proportional discount distribution across items
      const netSubtotal = Math.max(0, merchandiseSubtotal - totalDiscount);
      let runningCentavos = Math.round(netSubtotal * 100);

      paymongoLineItems = await Promise.all(
        orderItems.map(async (item, index) => {
          const itemOriginalTotal = item.price * item.quantity;
          const proportion = merchandiseSubtotal > 0 ? (itemOriginalTotal / merchandiseSubtotal) : (1 / orderItems.length);
          
          let itemCentavos = Math.round(netSubtotal * proportion * 100);
          if (index === orderItems.length - 1) {
            // Last item adjusts remainder
            itemCentavos = Math.max(2000 * item.quantity, runningCentavos);
          } else {
            itemCentavos = Math.max(2000 * item.quantity, itemCentavos);
            runningCentavos = Math.max(0, runningCentavos - itemCentavos);
          }

          const unitAmountCentavos = Math.max(2000, Math.round(itemCentavos / item.quantity));

          return {
            name: `${item.name}${totalDiscount > 0 ? " (Discounted)" : ""}`,
            amount: unitAmountCentavos,
            quantity: item.quantity,
            currency: "PHP",
            images: await resolvePayMongoImageUrl(item.image),
          };
        })
      );
    }

    // Add shipping fee line item if applicable
    if (finalShippingFee > 0) {
      paymongoLineItems.push({
        name: `Shipping Fee (${computedShipping.matchedRegion || "Standard Delivery"})`,
        amount: Math.max(100, Math.round(finalShippingFee * 100)),
        quantity: 1,
        currency: "PHP",
        images: ["https://files.catbox.moe/hrz9h0.png"],
      });
    }

    // Determine return URLs
    const clientOrigin = req.headers.origin || "http://localhost:5173";
    const finalSuccessUrl = successUrl || `${clientOrigin}/orders?payment=success&orderId=${newOrder._id}`;
    const finalCancelUrl = cancelUrl || `${clientOrigin}/orders?payment=cancelled&orderId=${newOrder._id}`;
    const urlDelimiter = finalSuccessUrl.includes("?") ? "&" : "?";
    const sessionSuccessUrl = `${finalSuccessUrl}${urlDelimiter}session_id={CHECKOUT_SESSION_ID}`;

    // PayMongo API call
    const authHeader = getPayMongoAuthHeader();
    const payload = {
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          payment_method_types: resolvedMethod.types,
          line_items: paymongoLineItems,
          description: `MHIRA Cosmetics Order #${String(newOrder._id).slice(-8).toUpperCase()}`,
          success_url: sessionSuccessUrl,
          cancel_url: finalCancelUrl,
        },
      },
    };

    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const sessionData = await response.json();

    if (!response.ok || !sessionData?.data) {
      console.error("PayMongo Session Error:", sessionData);
      // Clean up newly saved order since session creation failed
      await Order.findByIdAndDelete(newOrder._id).catch(() => {});
      return res.status(400).json({
        success: false,
        message: sessionData?.errors?.[0]?.detail || "Failed to create payment checkout session with PayMongo.",
        error: sessionData,
      });
    }

    const checkoutSession = sessionData.data;
    const checkoutUrl = checkoutSession.attributes.checkout_url;
    const sessionId = checkoutSession.id;

    // Save session ID to order
    newOrder.checkoutSessionId = sessionId;
    await newOrder.save();

    return res.status(200).json({
      success: true,
      message: "Checkout session created successfully.",
      checkoutUrl,
      sessionId,
      orderId: newOrder._id,
      order: newOrder,
    });
  } catch (error) {
    console.error("Error in createPayMongoCheckoutSession:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error creating payment session.",
      error: error.message,
    });
  }
};

/**
 * 2. Verify PayMongo Payment Session
 * GET /api/payments/verify-session/:sessionId
 * OR POST /api/payments/verify-session
 */
export const verifyPayMongoPayment = async (req, res) => {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId || req.query.sessionId;
    const orderId = req.query.orderId || req.body.orderId;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Missing sessionId parameter." });
    }

    // Call PayMongo to retrieve session
    const authHeader = getPayMongoAuthHeader();
    const response = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${sessionId}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    const sessionData = await response.json();

    if (!response.ok || !sessionData?.data) {
      console.error("PayMongo Verify Error:", sessionData);
      return res.status(404).json({
        success: false,
        message: "PayMongo session not found or invalid.",
        error: sessionData,
      });
    }

    const session = sessionData.data;
    const payments = session.attributes?.payments || [];
    const sessionStatus = session.attributes?.status;

    // Check if payment was executed and paid
    const paidPayment = payments.find(
      (p) => (p.attributes?.status || "").toLowerCase() === "paid"
    );
    const isPaid = Boolean(paidPayment) || sessionStatus === "paid";

    // Find the corresponding order
    let order = null;
    if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
      order = await Order.findById(orderId);
    }
    if (!order) {
      order = await Order.findOne({ checkoutSessionId: sessionId });
    }

    if (!order) {
      return res.status(200).json({
        success: true,
        paid: isPaid,
        status: sessionStatus,
        message: "Session status checked, but order reference not found.",
      });
    }

    if (isPaid && order.paymentStatus !== "Paid") {
      // Update order status to paid and move to To Ship
      order.paymentStatus = "Paid";
      order.status = "To Ship";
      order.paidAt = new Date();

      const paymentMethodType =
        paidPayment?.attributes?.source?.type ||
        paidPayment?.attributes?.payment_method_type ||
        paidPayment?.attributes?.payment_method_used ||
        order.paymentDetails?.paymentMethodType ||
        "PayMongo E-Payment";

      const cleanPaymentLabel = formatPayMongoMethodLabel(paymentMethodType, order.paymentMethod);
      order.paymentMethod = cleanPaymentLabel;

      order.paymentDetails = {
        ...(order.paymentDetails || {}),
        paymentId: paidPayment?.id || "",
        paymentMethodType,
        amountPaid: paidPayment?.attributes?.amount ? paidPayment.attributes.amount / 100 : order.totalAmount,
        paidAt: new Date(),
        referenceNumber: paidPayment?.attributes?.external_reference_number || paidPayment?.id || "",
      };

      // Add timeline entry
      order.trackingTimeline.push({
        title: "Payment Confirmed",
        description: `Payment received via ${cleanPaymentLabel} (PayMongo). Order is now in 'To Ship' status and is being prepared.`,
        timestamp: new Date(),
        status: "To Ship",
      });

      // Order is in packing / 'To Ship'; inventory will be deducted once order moves to 'In Transit'
      await handleInventoryStockSync(order, "To Ship");

      // Update user loyalty points & tier
      if (order.userId) {
        await awardLoyaltyPoints(order.userId, order.totalAmount);
      }

      await order.save();
    }

    return res.status(200).json({
      success: true,
      paid: isPaid,
      status: sessionStatus,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      order,
    });
  } catch (error) {
    console.error("Error verifying PayMongo payment:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying payment session.",
      error: error.message,
    });
  }
};

/**
 * 3. Webhook listener for PayMongo asynchronous notifications
 * POST /api/payments/webhook
 */
export const handlePayMongoWebhook = async (req, res) => {
  try {
    const event = req.body?.data;
    if (!event) {
      return res.status(400).json({ success: false, message: "Invalid webhook payload." });
    }

    const eventType = event.attributes?.type;
    console.log(`[PayMongo Webhook] Received event: ${eventType}`);

    if (eventType === "checkout_session.payment.paid") {
      const checkoutSession = event.attributes?.data;
      const sessionId = checkoutSession?.id;

      if (sessionId) {
        const order = await Order.findOne({ checkoutSessionId: sessionId });
        if (order && order.paymentStatus !== "Paid") {
          const payments = checkoutSession?.attributes?.payments || [];
          const paidPayment =
            payments.find((p) => (p.attributes?.status || "").toLowerCase() === "paid") || payments[0];
          const paymentMethodType =
            paidPayment?.attributes?.source?.type ||
            paidPayment?.attributes?.payment_method_type ||
            paidPayment?.attributes?.payment_method_used ||
            order.paymentDetails?.paymentMethodType ||
            "";
          const cleanPaymentLabel = formatPayMongoMethodLabel(paymentMethodType, order.paymentMethod);

          order.paymentStatus = "Paid";
          order.status = "To Ship";
          order.paidAt = new Date();
          order.paymentMethod = cleanPaymentLabel;
          order.paymentDetails = {
            ...(order.paymentDetails || {}),
            paymentId: paidPayment?.id || order.paymentDetails?.paymentId || "",
            paymentMethodType: paymentMethodType || order.paymentDetails?.paymentMethodType || "",
            referenceNumber:
              paidPayment?.attributes?.external_reference_number ||
              paidPayment?.id ||
              order.paymentDetails?.referenceNumber ||
              "",
            paidAt: new Date(),
          };
          order.trackingTimeline.push({
            title: "Payment Confirmed (Webhook)",
            description: `Payment confirmed via ${cleanPaymentLabel} (PayMongo webhook). Order queued for packing and shipping.`,
            timestamp: new Date(),
            status: "To Ship",
          });

          await handleInventoryStockSync(order, "To Ship");

          // Update user loyalty points & tier
          if (order.userId) {
            await awardLoyaltyPoints(order.userId, order.totalAmount);
          }

          await order.save();
          console.log(`[PayMongo Webhook] Order #${order._id} successfully marked as Paid!`);
        }
      }
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error("[PayMongo Webhook] Error processing event:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * 4. Config endpoint for Frontend to check if PayMongo is active
 * GET /api/payments/config
 */
export const getPaymentConfig = (req, res) => {
  const env = (process.env.PAYMONGO_ENV || "test").toLowerCase().trim();
  const publicKey = getPayMongoPublicKey();

  return res.status(200).json({
    success: true,
    enabled: Boolean(publicKey),
    environment: env,
    publicKey,
    supportedMethods: [
      { id: "gcash", name: "GCash", type: "wallet" },
      { id: "paymaya", name: "Maya", type: "wallet" },
      { id: "card", name: "Credit / Debit Card", type: "card" },
      { id: "grab_pay", name: "GrabPay", type: "wallet" },
      { id: "billease", name: "BillEase", type: "bnpl" },
    ],
  });
};

/**
 * 5. Resume / Pay for an existing unpaid order
 * POST /api/payments/pay-order/:orderId
 */
export const payExistingOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.paymentStatus === "Paid") {
      return res.status(400).json({ success: false, message: "Order is already paid." });
    }
    const lowerMethod = String(order.paymentMethod || "").toLowerCase();
    if (lowerMethod.includes("cod") || lowerMethod.includes("cash on delivery")) {
      return res.status(400).json({
        success: false,
        message: "Cash on Delivery (COD) orders do not require online payment.",
      });
    }

    const resolvedMethod = resolvePayMongoMethod(
      req.body?.paymongoMethodType ||
        req.body?.paymentMethod ||
        order.paymentDetails?.paymentMethodType ||
        order.paymentMethod
    );

    const merchandiseSubtotal = (order.items || []).reduce(
      (acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
    const computedShipping = await computeLocationShipping({
      address: order.shippingAddress,
      subtotal: merchandiseSubtotal,
    });
    const latestShippingFee = Number(computedShipping.shippingFee ?? order.shippingFee ?? 0);
    const totalDiscount = Number(order.voucherDiscount || 0) + Number(order.pointsRedeemed || 0);
    order.shippingFee = latestShippingFee;
    order.totalAmount = Math.max(
      20,
      Math.round((merchandiseSubtotal - totalDiscount + latestShippingFee) * 100) / 100
    );
    await order.save().catch(() => {});

    const paymongoLineItems = await Promise.all(
      (order.items || []).map(async (item) => ({
        name: item.name || "Product Item",
        amount: Math.max(2000, Math.round(item.price * 100)),
        quantity: item.quantity,
        currency: "PHP",
        images: await resolvePayMongoImageUrl(item.image),
      }))
    );

    if (latestShippingFee > 0) {
      paymongoLineItems.push({
        name: `Shipping Fee (${computedShipping.matchedRegion || "Standard Delivery"})`,
        amount: Math.max(100, Math.round(latestShippingFee * 100)),
        quantity: 1,
        currency: "PHP",
        images: ["https://files.catbox.moe/hrz9h0.png"],
      });
    }

    const clientOrigin = req.headers.origin || "http://localhost:5173";
    const finalSuccessUrl = `${clientOrigin}/orders?payment=success&orderId=${order._id}`;
    const finalCancelUrl = `${clientOrigin}/orders?payment=cancelled&orderId=${order._id}`;

    const authHeader = getPayMongoAuthHeader();
    const payload = {
      data: {
        attributes: {
          send_email_receipt: true,
          show_description: true,
          show_line_items: true,
          payment_method_types: resolvedMethod.types,
          line_items: paymongoLineItems,
          description: `MHIRA Cosmetics Order #${String(order._id).slice(-8).toUpperCase()}`,
          success_url: `${finalSuccessUrl}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: finalCancelUrl,
        },
      },
    };

    const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const sessionData = await response.json();
    if (!response.ok || !sessionData?.data) {
      return res.status(400).json({
        success: false,
        message: sessionData?.errors?.[0]?.detail || "Failed to initialize payment.",
      });
    }

    order.checkoutSessionId = sessionData.data.id;
    await order.save();

    return res.status(200).json({
      success: true,
      checkoutUrl: sessionData.data.attributes.checkout_url,
      sessionId: sessionData.data.id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Auto-Fetch / Sync PayMongo Payment Reference & Process Record for an Order
 * GET /api/payments/sync-order-reference/:orderId
 * POST /api/payments/sync-order-reference/:orderId
 */
export const syncPayMongoOrderReference = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    let authHeader;
    try {
      authHeader = getPayMongoAuthHeader();
    } catch (authErr) {
      return res.status(500).json({ success: false, message: authErr.message });
    }

    let matchedPayment = null;
    let matchSource = "";

    // 1. Try querying via checkoutSessionId if present
    if (order.checkoutSessionId) {
      try {
        const sessionRes = await fetch(`https://api.paymongo.com/v1/checkout_sessions/${order.checkoutSessionId}`, {
          method: "GET",
          headers: { Authorization: authHeader },
        });
        const sessionJson = await sessionRes.json();
        if (sessionRes.ok && sessionJson?.data) {
          const payments = sessionJson.data.attributes?.payments || [];
          const paidP = payments.find((p) => (p.attributes?.status || "").toLowerCase() === "paid") || payments[0];
          if (paidP) {
            matchedPayment = paidP;
            matchSource = "checkout_session";
          }
        }
      } catch (err) {
        console.warn("[PayMongo Sync] Session lookup note:", err.message);
      }
    }

    // 2. Try querying via paymentIntentId if present
    if (!matchedPayment && order.paymentIntentId) {
      try {
        const intentRes = await fetch(`https://api.paymongo.com/v1/payment_intents/${order.paymentIntentId}`, {
          method: "GET",
          headers: { Authorization: authHeader },
        });
        const intentJson = await intentRes.json();
        if (intentRes.ok && intentJson?.data) {
          const payments = intentJson.data.attributes?.payments || [];
          const paidP = payments.find((p) => (p.attributes?.status || "").toLowerCase() === "paid") || payments[0];
          if (paidP) {
            matchedPayment = paidP;
            matchSource = "payment_intent";
          }
        }
      } catch (err) {
        console.warn("[PayMongo Sync] Payment Intent lookup note:", err.message);
      }
    }

    // 3. Fallback: Search PayMongo recent payments list
    if (!matchedPayment) {
      try {
        const paymentsRes = await fetch("https://api.paymongo.com/v1/payments?limit=50", {
          method: "GET",
          headers: { Authorization: authHeader },
        });
        const paymentsJson = await paymentsRes.json();
        if (paymentsRes.ok && Array.isArray(paymentsJson?.data)) {
          const shortId = String(order._id).slice(-8).toUpperCase();
          const midId = String(order._id).slice(-12).toUpperCase();
          const fullId = String(order._id);
          const orderCentavos = Math.round(Number(order.totalAmount || 0) * 100);

          matchedPayment = paymentsJson.data.find((p) => {
            const desc = (p.attributes?.description || "").toUpperCase();
            if (desc.includes(shortId) || desc.includes(midId) || desc.includes(fullId)) {
              return true;
            }
            if (order.customerEmail && p.attributes?.billing?.email) {
              const emailMatch = p.attributes.billing.email.toLowerCase() === order.customerEmail.toLowerCase();
              const amtMatch = Math.abs((p.attributes.amount || 0) - orderCentavos) < 100;
              if (emailMatch && amtMatch) return true;
            }
            return false;
          });
          if (matchedPayment) {
            matchSource = "payments_list";
          }
        }
      } catch (err) {
        console.warn("[PayMongo Sync] Payments list lookup note:", err.message);
      }
    }

    if (!matchedPayment) {
      return res.status(200).json({
        success: true,
        matched: false,
        message: "No PayMongo transaction record found yet for this order.",
        order,
      });
    }

    // Extract transaction details
    const refNumber =
      matchedPayment.attributes?.external_reference_number ||
      matchedPayment.id ||
      matchedPayment.attributes?.payment_intent_id ||
      matchedPayment.attributes?.source?.id ||
      "";

    const channel = (
      matchedPayment.attributes?.source?.type ||
      matchedPayment.attributes?.payment_method_type ||
      "GCash / Online"
    ).toUpperCase();

    const grossAmount = matchedPayment.attributes?.amount
      ? matchedPayment.attributes.amount / 100
      : Number(order.totalAmount || 0);

    const fee = matchedPayment.attributes?.fee
      ? matchedPayment.attributes.fee / 100
      : 0;

    const netAmount = matchedPayment.attributes?.net_amount
      ? matchedPayment.attributes.net_amount / 100
      : grossAmount - fee;

    const billing = matchedPayment.attributes?.billing || {};
    const paidAtDate = matchedPayment.attributes?.paid_at
      ? new Date(matchedPayment.attributes.paid_at * 1000)
      : new Date();

    const isPaid = (matchedPayment.attributes?.status || "").toLowerCase() === "paid";

    const cleanLabel = formatPayMongoMethodLabel(channel, order.paymentMethod);
    order.paymentMethod = cleanLabel;

    // Update order paymentDetails
    order.paymentDetails = {
      ...(order.paymentDetails || {}),
      referenceNumber: refNumber,
      paymentId: matchedPayment.id,
      paymentIntentId: matchedPayment.attributes?.payment_intent_id || order.paymentIntentId || "",
      sourceId: matchedPayment.attributes?.source?.id || "",
      paymentMethodType: channel,
      grossAmount,
      fee,
      netAmount,
      billingDetails: billing,
      paymongoStatus: matchedPayment.attributes?.status || "paid",
      verifiedAt: new Date(),
      verifiedBy: "PayMongo Auto-Sync API",
      matchSource,
    };

    if (isPaid) {
      order.paymentStatus = "Paid";
      order.paidAt = order.paidAt || paidAtDate;
      if (order.status === "Order Placed" || order.status === "To Pay") {
        order.status = "To Ship";
      }
    }

    // Add Timeline audit event
    if (!order.trackingTimeline) order.trackingTimeline = [];
    const alreadyLogged = order.trackingTimeline.some(
      (t) => t.title?.includes("PayMongo") && (t.description?.includes(refNumber) || t.description?.includes(matchedPayment.id))
    );

    if (!alreadyLogged) {
      order.trackingTimeline.push({
        title: "PayMongo Reference Auto-Captured",
        description: `Verified online payment via PayMongo API (${channel}). Reference No: ${refNumber}. Gross: ₱${grossAmount.toFixed(2)}, Fee: ₱${fee.toFixed(2)}, Net: ₱${netAmount.toFixed(2)}.`,
        timestamp: new Date(),
        status: order.status,
        actor: "PayMongo Auto-Sync System",
      });
    }

    await order.save();

    return res.status(200).json({
      success: true,
      matched: true,
      referenceNumber: refNumber,
      paymentId: matchedPayment.id,
      channel,
      grossAmount,
      fee,
      netAmount,
      billing,
      paymongoStatus: matchedPayment.attributes?.status,
      order,
      message: `PayMongo transaction successfully synced! Reference: ${refNumber}`,
    });
  } catch (error) {
    console.error("Error in syncPayMongoOrderReference:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to sync PayMongo reference.",
    });
  }
};

