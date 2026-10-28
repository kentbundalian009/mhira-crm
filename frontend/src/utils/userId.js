/**
 * Universal User ID & Authentication Helper for Storefront & CRM
 * Strictly identifies logged-in customer accounts.
 */

export const isUserLoggedIn = () => {
  const storedUser = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  if (!storedUser || !token) return false;
  try {
    const parsed = JSON.parse(storedUser);
    return !!(parsed && (parsed._id || parsed.id || parsed.email));
  } catch {
    return false;
  }
};

export const getUserId = () => {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed._id) return String(parsed._id);
      if (parsed.id) return String(parsed.id);
      if (parsed.email) return String(parsed.email);
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
    }
  }
  return null;
};

export default getUserId;
