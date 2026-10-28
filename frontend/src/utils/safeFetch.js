/**
 * Universal safe data extractor for API responses
 * Guarantees that frontend tables, lists, and grids always receive a valid Array
 */
export const extractSafeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.products)) return data.products;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.events)) return data.events;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.coupons)) return data.coupons;
  if (Array.isArray(data.orders)) return data.orders;
  if (Array.isArray(data.returns)) return data.returns;
  if (Array.isArray(data.tickets)) return data.tickets;
  if (Array.isArray(data.suppliers)) return data.suppliers;
  if (Array.isArray(data.sales)) return data.sales;
  if (Array.isArray(data.materials)) return data.materials;
  if (Array.isArray(data.logs)) return data.logs;
  return [];
};

export default extractSafeArray;
