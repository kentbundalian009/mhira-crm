import { jsPDF } from "jspdf";
import { formatShippingAddress } from "./addressUtils";
import { getDisplayPaymentMethod, isCodPayment } from "./paymentUtils";

export const downloadWaybillPdf = (order) => {
  if (!order) return null;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [100, 150] });
  const orderIdShort = order._id ? String(order._id).slice(-8).toUpperCase() : "ORDER";
  const courierName = (order.courier || "J&T Express").trim();
  const trackingNo =
    order.trackingNumber ||
    `JT${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
  const customerName = order.customerName || order.userId?.name || order.user?.name || "Customer";
  const customerPhone =
    order.phone ||
    order.shippingPhone ||
    order.contactNumber ||
    order.userId?.phoneNumber ||
    order.phoneNumber ||
    "0917-000-0000";
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const totalAmount = Number(order.totalAmount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
  });
  const displayMethod = getDisplayPaymentMethod(order);
  const isCod = isCodPayment(displayMethod);

  // 1. Header Box
  doc.setFillColor(1, 57, 15);
  doc.rect(0, 0, 100, 15, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(courierName.toUpperCase(), 5, 7.5);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("AIRWAY BILL & SHIPPING LABEL", 5, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("STANDARD EXP", 72, 7.5);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(new Date().toLocaleDateString(), 74, 12);

  // 2. Barcode Box
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 15, 100, 21, "F");
  doc.setDrawColor(200, 200, 200);
  doc.rect(4, 17, 92, 17);
  doc.setFillColor(15, 23, 42);
  let bx = 9;
  for (let i = 0; i < 44; i++) {
    const barWidth = i % 3 === 0 || i % 7 === 0 ? 1.4 : 0.6;
    if (i % 6 !== 0) doc.rect(bx, 19, barWidth, 9.5, "F");
    bx += barWidth + 1.1;
  }
  doc.setTextColor(15, 23, 42);
  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.text(`* ${trackingNo} *`, 50, 32, { align: "center" });

  // 3. Payment Method & Amount Box
  doc.setDrawColor(30, 41, 59);
  if (isCod) {
    doc.setFillColor(254, 240, 138);
    doc.rect(4, 36, 92, 13, "FD");
    doc.setTextColor(113, 63, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("CASH ON DELIVERY (COD)", 7, 41);
    doc.setFontSize(9.5);
    doc.text(`AMOUNT TO COLLECT: PHP ${totalAmount}`, 7, 46.5);
  } else {
    doc.setFillColor(219, 234, 254);
    doc.rect(4, 36, 92, 13, "FD");
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("PREPAID / NON-COD  [ DO NOT COLLECT CASH ]", 7, 41);
    doc.setFontSize(8);
    const refStr = order.paymentDetails?.referenceNumber
      ? ` | Ref: ${order.paymentDetails.referenceNumber}`
      : "";
    doc.text(`PAID ONLINE (${displayMethod}${refStr}) - PHP ${totalAmount}`, 7, 46.5);
  }

  // 4. Consignee
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(4, 51, 92, 28, "FD");
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("RECIPIENT / SHIP TO:", 7, 55);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.text(customerName.toUpperCase(), 7, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Phone: ${customerPhone}`, 7, 64);
  const splitAddress = doc.splitTextToSize(
    formatShippingAddress(order.shippingAddress) || "Customer Delivery Address",
    86
  );
  doc.text(splitAddress, 7, 68);

  // 5. Shipper
  doc.rect(4, 81, 92, 16, "FD");
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("SENDER / RETURN TO:", 7, 85);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7.5);
  doc.text("MHIRA NATURAL SKINCARE", 7, 89);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Logistics & Supply Chain Hub, Manila, Philippines | Tel: 0917-123-4567", 7, 93);

  // 6. Order Contents
  doc.rect(4, 99, 92, 27, "FD");
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("PARCEL CONTENTS & ORDER INFO:", 7, 103);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`Order Ref: #${orderIdShort} | Date Placed: ${orderDate}`, 7, 107);

  let itemY = 111;
  const itemsList = order.items || [];
  const totalItemsCount = itemsList.reduce((acc, it) => acc + (it.quantity || 1), 0);
  itemsList.slice(0, 3).forEach((it) => {
    const rawName = String(it.name || it.product?.name || it.product?.itemName || "Product");
    // Only display pure product name without product code or SKU
    const cleanName = rawName.replace(/^[A-Z0-9]+-[A-Z0-9-]+\s*[-:]*\s*/i, "").replace(/\[.*?\]/g, "").trim() || "Product";
    doc.text(`• ${cleanName.substring(0, 38)} (x${it.quantity || 1})`, 7, itemY);
    itemY += 3.5;
  });
  if (itemsList.length > 3) {
    doc.text(`+ ${itemsList.length - 3} more items...`, 7, itemY);
  }
  doc.setFont("helvetica", "bold");
  doc.text(`Total Pcs: ${totalItemsCount} units | Declared Value: PHP ${totalAmount}`, 7, 123);

  // 7. Rider Signature
  doc.rect(4, 128, 92, 17);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DISPATCH / RIDER HANDOVER:", 7, 132);
  doc.text("RECIPIENT SIGNATURE:", 54, 132);
  doc.line(7, 140, 45, 140);
  doc.line(54, 140, 92, 140);
  doc.text(`Carrier: ${courierName}`, 7, 143.5);
  doc.text("Date Received:", 54, 143.5);

  const fileName = `Waybill_${courierName.replace(/\s+/g, "_")}_${trackingNo}.pdf`;
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
