import { jsPDF } from "jspdf";
import { formatShippingAddress } from "./addressUtils";
import { getDisplayPaymentMethod, isCodPayment } from "./paymentUtils";

export const downloadWaybillPdf = (order) => {
  if (!order) return null;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [100, 150] });
  const orderIdShort = order._id ? String(order._id).slice(-8).toUpperCase() : "ORDER";
  const customerName =
    order.customerName ||
    order.userId?.name ||
    order.user?.name ||
    "Customer";
  const customerPhone =
    order.phone ||
    order.shippingPhone ||
    order.contactNumber ||
    order.userId?.phoneNumber ||
    order.phoneNumber ||
    order.userId?.phone ||
    "N/A";
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const items = order.items || [];
  const totalItemsCount = items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const itemsSubtotal = items.reduce(
    (sum, it) => sum + (Number(it.price || 0) * (Number(it.quantity) || 1)),
    0
  );
  const shippingFee = Number(order.shippingFee ?? 45);
  const grandTotal = Number(
    order.totalAmount || (itemsSubtotal + shippingFee)
  ).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const subtotalFormatted = itemsSubtotal.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const shippingFeeFormatted = shippingFee.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const displayMethod = getDisplayPaymentMethod(order);
  const isCod = isCodPayment(displayMethod);
  const refNumber =
    order.paymentDetails?.referenceNumber ||
    order.paymentReference ||
    order.paymentDetails?.paymentId ||
    order.paymentIntentId ||
    order.checkoutSessionId ||
    "";

  // ========================================================
  // 1. HEADER BANNER (MHIRA Green Theme like Inventory Reports)
  // ========================================================
  doc.setFillColor(1, 57, 15); // #01390f
  doc.rect(0, 0, 100, 15, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("MHIRA NATURAL BEAUTY PRODUCTS", 5, 6.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text("OFFICIAL DISPATCH SLIP & ORDER WAYBILL", 5, 11);

  // Top-Right Order Metadata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`ORDER #${orderIdShort}`, 95, 6.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text(`DATE: ${orderDate}`, 95, 11, { align: "right" });

  // ========================================================
  // 2. CUSTOMER & DELIVERY INFORMATION BOX
  // ========================================================
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(4, 18, 92, 30, "FD");

  // Section Header with Email Verified Badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(1, 57, 15);
  doc.text("CUSTOMER & DELIVERY INFORMATION", 7, 22.5);

  // Email Verified Badge
  doc.setFillColor(237, 247, 238);
  doc.setDrawColor(1, 57, 15);
  doc.roundedRect(69, 19.5, 24, 4, 1, 1, "FD");
  doc.setTextColor(1, 57, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("Email Verified", 81, 22.5, { align: "center" });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(7, 24.5, 93, 24.5);

  // Customer Name
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("Customer Name:", 7, 28);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.text(customerName, 26, 28);

  // Contact Number
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("Contact Number:", 7, 33);
  doc.setTextColor(15, 23, 42);
  doc.setFont("courier", "bold");
  doc.setFontSize(6.8);
  doc.text(customerPhone, 26, 33);

  // Delivery Address
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.text("Delivery Address:", 7, 38);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  const fullAddress = formatShippingAddress(order.shippingAddress) || "Storefront Delivery Address";
  const addressLines = doc.splitTextToSize(fullAddress, 67);
  doc.text(addressLines.slice(0, 2), 26, 38);

  // ========================================================
  // 3. PURCHASED PRODUCTS BOX
  // ========================================================
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(4, 50, 92, 31, "FD");

  // Section Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(1, 57, 15);
  doc.text(`PURCHASED PRODUCTS (${totalItemsCount} item${totalItemsCount > 1 ? "s" : ""})`, 7, 54.5);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(7, 56.5, 93, 56.5);

  let curY = 60.5;
  const maxDisplay = 2;
  items.slice(0, maxDisplay).forEach((it) => {
    const rawName = String(it.name || it.product?.name || it.product?.itemName || "Purchased Product");
    const cleanName = rawName.replace(/^[A-Z0-9]+-[A-Z0-9-]+\s*[-:]*\s*/i, "").replace(/\[.*?\]/g, "").trim() || "Product";
    const code = it.code || it.product?.code || "";
    const qty = Number(it.quantity) || 1;

    // Product Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(cleanName.substring(0, 42), 7, curY);

    // Code & Qty Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(71, 85, 105);
    const codeDisplay = code ? `${code}   •   ` : "";
    doc.text(`${codeDisplay}Qty: ${qty}`, 7, curY + 3.8);

    curY += 8.5;
  });

  if (items.length > maxDisplay) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`+ ${items.length - maxDisplay} more item(s) in this order...`, 7, curY);
  }

  // ========================================================
  // 4. PAYMENT & FINANCIAL SUMMARY BOX
  // ========================================================
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(4, 83, 92, 44, "FD");

  // Section Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(1, 57, 15);
  doc.text("PAYMENT & FINANCIAL SUMMARY", 7, 87.5);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(7, 89.5, 93, 89.5);

  // Items Subtotal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Items Subtotal:", 7, 94);
  doc.setFont("courier", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`PHP ${subtotalFormatted}`, 93, 94, { align: "right" });

  // Shipping Fee
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Shipping / Delivery Fee:", 7, 98.5);
  doc.setFont("courier", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`PHP ${shippingFeeFormatted}`, 93, 98.5, { align: "right" });

  // Payment Method
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Payment Method:", 7, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(1, 57, 15);
  doc.text(isCod ? "Cash on Delivery (COD)" : displayMethod, 93, 103, { align: "right" });

  // Payment Settlement Note
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Payment Settlement:", 7, 107.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  if (isCod) {
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(`Collect PHP ${grandTotal} on Delivery`, 93, 107.5, { align: "right" });
  } else {
    doc.setTextColor(29, 78, 216); // blue-700
    const refSuffix = refNumber ? ` | Ref #${refNumber}` : "";
    doc.text(`Prepaid Online${refSuffix} - DO NOT COLLECT`, 93, 107.5, { align: "right" });
  }

  // Grand Total Highlight Banner
  doc.setFillColor(237, 247, 238); // light emerald #edf7ee
  doc.setDrawColor(1, 57, 15);
  doc.rect(7, 111, 86, 13, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(1, 57, 15);
  doc.text("GRAND TOTAL:", 11, 119.5);

  doc.setFont("courier", "bold");
  doc.setFontSize(10.5);
  doc.text(`PHP ${grandTotal}`, 89, 119.5, { align: "right" });

  // ========================================================
  // 5. DISPATCH HANDOVER & RECIPIENT SIGN-OFF
  // ========================================================
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.rect(4, 129, 92, 17, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DISPATCH / HANDOVER:", 7, 133);
  doc.text("RECIPIENT SIGNATURE:", 54, 133);

  doc.setDrawColor(148, 163, 184);
  doc.line(7, 140.5, 45, 140.5);
  doc.line(54, 140.5, 92, 140.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text("Logistics Officer Signature", 7, 143.5);
  doc.text("Received by Customer / Date", 54, 143.5);

  const fileName = `Waybill_Order_${orderIdShort}.pdf`;
  try {
    const blobUrl = doc.output("bloburl");
    if (blobUrl && typeof window !== "undefined") {
      window.open(blobUrl, "_blank");
    }
  } catch (e) {
    console.warn("Could not preview waybill in new tab:", e);
  }
  doc.save(fileName);
  return fileName;
};
