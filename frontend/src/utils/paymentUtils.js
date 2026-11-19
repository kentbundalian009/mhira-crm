export const isCodPayment = (paymentMethod) => {
  const lower = String(paymentMethod || "").toLowerCase();
  return lower.includes("cod") || lower.includes("cash on delivery");
};

const mapPaymentTypeToLabel = (t) => {
  if (!t) return "";
  if (t.includes("gcash")) return "GCash";
  if (t.includes("paymaya") || t.includes("maya")) return "Maya";
  if (t.includes("grab")) return "GrabPay";
  if (t.includes("billease")) return "BillEase";
  if (t.includes("dob") || t.includes("bpi") || t.includes("online banking")) {
    return "Online Banking (BPI / UB)";
  }
  if (t === "card" || (t.includes("card") && !t.includes("e-wallet"))) {
    return "Credit / Debit Card";
  }
  return "";
};

export const getDisplayPaymentMethod = (order) => {
  if (!order) return "Cash on Delivery";
  const rawMethod = String(order.paymentMethod || "").trim();
  const lowerMethod = rawMethod.toLowerCase();
  const detailType = String(order.paymentDetails?.paymentMethodType || "")
    .toLowerCase()
    .trim();

  if (
    !rawMethod ||
    lowerMethod.includes("e-wallet / card") ||
    lowerMethod.includes("e-wallet / online") ||
    lowerMethod === "paymongo" ||
    lowerMethod === "paymongo online payment"
  ) {
    const mapped = mapPaymentTypeToLabel(detailType);
    if (mapped) return mapped;
  }

  return rawMethod || "Cash on Delivery";
};
