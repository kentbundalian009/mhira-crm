export const formatShippingAddress = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr.trim();
  if (typeof addr === "object") {
    return [
      addr.streetAddress || addr.street,
      addr.apartment,
      addr.barangay ? `Brgy. ${String(addr.barangay).replace(/^Brgy\.?\s*/i, "")}` : "",
      addr.city,
      addr.province || addr.region,
      addr.postalCode,
      addr.country,
    ]
      .filter(Boolean)
      .join(", ");
  }
  return String(addr || "");
};
