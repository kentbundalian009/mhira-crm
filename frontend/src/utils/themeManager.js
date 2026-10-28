import { API } from "./axios";
import { notifyLiveSync } from "./liveSync";

export const STAFF_ROLES = ["Admin", "Inventory", "Logistics", "Marketing"];

export const DEFAULT_ROLE_THEMES = {
  Admin: {
    sidebarGradient: "linear-gradient(180deg, #012b0b 0%, #01390f 50%, #0a5219 100%)",
    headerGradient: "linear-gradient(90deg, #012b0b 0%, #01390f 50%, #0a5219 100%)",
    solidColor: "#01390f",
    solidHover: "#01250a",
    sidebarHover: "#0a5219",
  },
  Inventory: {
    sidebarGradient: "linear-gradient(180deg, #022c22 0%, #064e3b 50%, #047857 100%)",
    headerGradient: "linear-gradient(90deg, #022c22 0%, #064e3b 50%, #047857 100%)",
    solidColor: "#047857",
    solidHover: "#065f46",
    sidebarHover: "#064e3b",
  },
  Logistics: {
    sidebarGradient: "linear-gradient(180deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)",
    headerGradient: "linear-gradient(90deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)",
    solidColor: "#1d4ed8",
    solidHover: "#1e40af",
    sidebarHover: "#1e3a8a",
  },
  Marketing: {
    sidebarGradient: "linear-gradient(180deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)",
    headerGradient: "linear-gradient(90deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)",
    solidColor: "#7e22ce",
    solidHover: "#581c87",
    sidebarHover: "#581c87",
  },
};

export const GRADIENT_PRESETS = [
  {
    id: "mhira-classic",
    name: "Mhira Classic Forest",
    category: "Green",
    gradient: "linear-gradient(135deg, #012b0b 0%, #01390f 50%, #0a5219 100%)",
    colors: ["#012b0b", "#01390f", "#0a5219"],
    solidColor: "#01390f",
    solidHover: "#01250a",
    sidebarHover: "#0a5219"
  },
  {
    id: "deep-pine",
    name: "Deep Pine & Mint",
    category: "Green",
    gradient: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #059669 100%)",
    colors: ["#022c22", "#064e3b", "#059669"],
    solidColor: "#047857",
    solidHover: "#065f46",
    sidebarHover: "#064e3b"
  },
  {
    id: "ocean-cobalt",
    name: "Ocean Twilight Cobalt",
    category: "Blue",
    gradient: "linear-gradient(135deg, #0a192f 0%, #1e3a8a 50%, #2563eb 100%)",
    colors: ["#0a192f", "#1e3a8a", "#2563eb"],
    solidColor: "#1d4ed8",
    solidHover: "#1e40af",
    sidebarHover: "#1e3a8a"
  },
  {
    id: "midnight-navy",
    name: "Midnight Navy & Sky",
    category: "Blue",
    gradient: "linear-gradient(135deg, #031b33 0%, #0f3d68 50%, #0284c7 100%)",
    colors: ["#031b33", "#0f3d68", "#0284c7"],
    solidColor: "#0284c7",
    solidHover: "#0369a1",
    sidebarHover: "#0f3d68"
  },
  {
    id: "royal-amethyst",
    name: "Royal Velvet Amethyst",
    category: "Purple",
    gradient: "linear-gradient(135deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)",
    colors: ["#2e1065", "#581c87", "#7e22ce"],
    solidColor: "#7e22ce",
    solidHover: "#581c87",
    sidebarHover: "#581c87"
  },
  {
    id: "mystic-plum",
    name: "Mystic Plum & Orchid",
    category: "Purple",
    gradient: "linear-gradient(135deg, #1e0836 0%, #4a044e 50%, #a21caf 100%)",
    colors: ["#1e0836", "#4a044e", "#a21caf"],
    solidColor: "#a21caf",
    solidHover: "#701a75",
    sidebarHover: "#4a044e"
  },
  {
    id: "sunset-amber",
    name: "Sunset Bronze & Amber",
    category: "Orange",
    gradient: "linear-gradient(135deg, #451a03 0%, #9a3412 50%, #ea580c 100%)",
    colors: ["#451a03", "#9a3412", "#ea580c"],
    solidColor: "#ea580c",
    solidHover: "#c2410c",
    sidebarHover: "#9a3412"
  },
  {
    id: "crimson-ruby",
    name: "Crimson Ruby & Wine",
    category: "Red",
    gradient: "linear-gradient(135deg, #4c0519 0%, #881337 50%, #e11d48 100%)",
    colors: ["#4c0519", "#881337", "#e11d48"],
    solidColor: "#e11d48",
    solidHover: "#be123c",
    sidebarHover: "#881337"
  },
  {
    id: "nordic-teal",
    name: "Nordic Teal & Cyan",
    category: "Teal",
    gradient: "linear-gradient(135deg, #042f2e 0%, #115e59 50%, #0d9488 100%)",
    colors: ["#042f2e", "#115e59", "#0d9488"],
    solidColor: "#0d9488",
    solidHover: "#0f766e",
    sidebarHover: "#115e59"
  },
  {
    id: "midnight-obsidian",
    name: "Midnight Slate Obsidian",
    category: "Dark",
    gradient: "linear-gradient(135deg, #090d16 0%, #1e293b 50%, #334155 100%)",
    colors: ["#090d16", "#1e293b", "#334155"],
    solidColor: "#1e293b",
    solidHover: "#0f172a",
    sidebarHover: "#334155"
  },
  {
    id: "charcoal-gold",
    name: "Charcoal & Tuscan Gold",
    category: "Dark",
    gradient: "linear-gradient(135deg, #18181b 0%, #292524 50%, #854d0e 100%)",
    colors: ["#18181b", "#292524", "#854d0e"],
    solidColor: "#854d0e",
    solidHover: "#713f12",
    sidebarHover: "#451a03"
  },
  {
    id: "cyber-indigo",
    name: "Cyber Neon Indigo",
    category: "Indigo",
    gradient: "linear-gradient(135deg, #13032b 0%, #312e81 50%, #4f46e5 100%)",
    colors: ["#13032b", "#312e81", "#4f46e5"],
    solidColor: "#4f46e5",
    solidHover: "#3730a3",
    sidebarHover: "#312e81"
  }
];

export const SOLID_COLOR_PRESETS = [
  { id: "emerald", name: "Mhira Emerald", hex: "#01390f", hover: "#01250a" },
  { id: "pine", name: "Pine Green", hex: "#047857", hover: "#065f46" },
  { id: "amethyst", name: "Royal Purple", hex: "#7e22ce", hover: "#581c87" },
  { id: "plum", name: "Deep Plum", hex: "#581c87", hover: "#3b0764" },
  { id: "sapphire", name: "Ocean Blue", hex: "#1d4ed8", hover: "#1e40af" },
  { id: "navy", name: "Deep Navy", hex: "#1e3a8a", hover: "#0f172a" },
  { id: "amber", name: "Sunset Amber", hex: "#ea580c", hover: "#c2410c" },
  { id: "crimson", name: "Ruby Crimson", hex: "#e11d48", hover: "#be123c" },
  { id: "teal", name: "Nordic Teal", hex: "#0d9488", hover: "#0f766e" },
  { id: "obsidian", name: "Slate Obsidian", hex: "#1e293b", hover: "#0f172a" },
  { id: "charcoal", name: "Charcoal Black", hex: "#18181b", hover: "#09090b" },
  { id: "gold", name: "Tuscan Gold", hex: "#854d0e", hover: "#713f12" }
];

export const SOLID_HOVER_PRESETS = [
  { id: "h-emerald", name: "Forest Green", hex: "#0a5219" },
  { id: "h-pine", name: "Pine Deep", hex: "#064e3b" },
  { id: "h-purple", name: "Plum Purple", hex: "#581c87" },
  { id: "h-violet", name: "Royal Violet", hex: "#6b21a8" },
  { id: "h-blue", name: "Cobalt Blue", hex: "#1e3a8a" },
  { id: "h-sky", name: "Ocean Navy", hex: "#0f3d68" },
  { id: "h-amber", name: "Amber Bronze", hex: "#9a3412" },
  { id: "h-wine", name: "Wine Crimson", hex: "#881337" },
  { id: "h-teal", name: "Glacier Teal", hex: "#115e59" },
  { id: "h-slate", name: "Dark Slate", hex: "#334155" },
  { id: "h-obsidian", name: "Midnight Obsidian", hex: "#0f172a" },
  { id: "h-frost", name: "Glass Frost", hex: "rgba(255, 255, 255, 0.18)" }
];

const STORAGE_KEY = "crm_role_appearance_theme";

/**
 * Adjust hex color brightness
 */
export const adjustBrightness = (hex, percent) => {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return hex;
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return hex;
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split("").map((c) => c + c).join("") : cleanHex, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

/**
 * Normalizes role string to standard 4 roles: Admin, Inventory, Logistics, Marketing
 */
export const normalizeRole = (role) => {
  if (!role) return "Admin";
  const r = String(role).trim().toLowerCase();
  if (r.includes("invent")) return "Inventory";
  if (r.includes("logis")) return "Logistics";
  if (r.includes("market")) return "Marketing";
  if (r.includes("admin") || r.includes("super")) return "Admin";
  return "Admin";
};

/**
 * Determines role from tabId
 */
export const getRoleFromTab = (tabId) => {
  if (!tabId) return "Admin";
  const t = String(tabId).toLowerCase();
  if (t.includes("inv") || t.includes("material-request") || t.includes("supplier") || t.includes("expiry") || t.includes("wip") || t.includes("inbound") || t.includes("rawmat")) {
    return "Inventory";
  }
  if (t.includes("sales") || t.includes("logistic") || t.includes("order") || t.includes("return") || t.includes("support") || t.includes("shipping")) {
    return "Logistics";
  }
  if (t.includes("marketing") || t.includes("product-catalog") || t.includes("coupon") || t.includes("announcement") || t.includes("advertisement") || t.includes("feedback") || t.includes("story")) {
    return "Marketing";
  }
  return "Admin";
};

/**
 * Validates and enforces that the background is a rich gradient (never a solid color).
 */
export const ensureGradient = (val, fallback = "linear-gradient(135deg, #012b0b 0%, #01390f 50%, #0a5219 100%)") => {
  if (!val || typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (trimmed.startsWith("linear-gradient") || trimmed.startsWith("radial-gradient")) {
    return trimmed;
  }
  if (trimmed.startsWith("#") || trimmed.startsWith("rgb")) {
    return `linear-gradient(135deg, ${trimmed} 0%, #0a5219 100%)`;
  }
  return fallback;
};

/**
 * Validates solid color
 */
export const ensureSolidColor = (val, fallback = "#01390f") => {
  if (!val || typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("rgb")) {
    return trimmed;
  }
  return fallback;
};

/**
 * Validates hover styling (solid color, rgba, or gradient).
 */
export const ensureHover = (val, fallback = "#0a5219") => {
  if (!val || typeof val !== "string") return fallback;
  const trimmed = val.trim();
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb") ||
    trimmed.startsWith("rgba") ||
    trimmed.startsWith("linear-gradient") ||
    trimmed.startsWith("radial-gradient")
  ) {
    return trimmed;
  }
  return fallback;
};

/**
 * Retrieves all stored themes with instant fallback to defaults
 */
export const getAllRoleThemes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        Admin: {
          sidebarGradient: ensureGradient(parsed.Admin?.sidebarGradient, DEFAULT_ROLE_THEMES.Admin.sidebarGradient),
          headerGradient: ensureGradient(parsed.Admin?.headerGradient, DEFAULT_ROLE_THEMES.Admin.headerGradient),
          solidColor: ensureSolidColor(parsed.Admin?.solidColor, DEFAULT_ROLE_THEMES.Admin.solidColor),
          solidHover: ensureSolidColor(parsed.Admin?.solidHover, DEFAULT_ROLE_THEMES.Admin.solidHover),
          sidebarHover: ensureHover(parsed.Admin?.sidebarHover, DEFAULT_ROLE_THEMES.Admin.sidebarHover),
        },
        Inventory: {
          sidebarGradient: ensureGradient(parsed.Inventory?.sidebarGradient, DEFAULT_ROLE_THEMES.Inventory.sidebarGradient),
          headerGradient: ensureGradient(parsed.Inventory?.headerGradient, DEFAULT_ROLE_THEMES.Inventory.headerGradient),
          solidColor: ensureSolidColor(parsed.Inventory?.solidColor, DEFAULT_ROLE_THEMES.Inventory.solidColor),
          solidHover: ensureSolidColor(parsed.Inventory?.solidHover, DEFAULT_ROLE_THEMES.Inventory.solidHover),
          sidebarHover: ensureHover(parsed.Inventory?.sidebarHover, DEFAULT_ROLE_THEMES.Inventory.sidebarHover),
        },
        Logistics: {
          sidebarGradient: ensureGradient(parsed.Logistics?.sidebarGradient || parsed.Logistic?.sidebarGradient, DEFAULT_ROLE_THEMES.Logistics.sidebarGradient),
          headerGradient: ensureGradient(parsed.Logistics?.headerGradient || parsed.Logistic?.headerGradient, DEFAULT_ROLE_THEMES.Logistics.headerGradient),
          solidColor: ensureSolidColor(parsed.Logistics?.solidColor || parsed.Logistic?.solidColor, DEFAULT_ROLE_THEMES.Logistics.solidColor),
          solidHover: ensureSolidColor(parsed.Logistics?.solidHover || parsed.Logistic?.solidHover, DEFAULT_ROLE_THEMES.Logistics.solidHover),
          sidebarHover: ensureHover(parsed.Logistics?.sidebarHover || parsed.Logistic?.sidebarHover, DEFAULT_ROLE_THEMES.Logistics.sidebarHover),
        },
        Marketing: {
          sidebarGradient: ensureGradient(parsed.Marketing?.sidebarGradient, DEFAULT_ROLE_THEMES.Marketing.sidebarGradient),
          headerGradient: ensureGradient(parsed.Marketing?.headerGradient, DEFAULT_ROLE_THEMES.Marketing.headerGradient),
          solidColor: ensureSolidColor(parsed.Marketing?.solidColor, DEFAULT_ROLE_THEMES.Marketing.solidColor),
          solidHover: ensureSolidColor(parsed.Marketing?.solidHover, DEFAULT_ROLE_THEMES.Marketing.solidHover),
          sidebarHover: ensureHover(parsed.Marketing?.sidebarHover, DEFAULT_ROLE_THEMES.Marketing.sidebarHover),
        },
      };
    }
  } catch (e) {
    console.warn("Error reading themes from localStorage:", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_ROLE_THEMES));
};

/**
 * Gets theme for a specific role
 */
export const getRoleTheme = (role) => {
  const normRole = normalizeRole(role);
  const allThemes = getAllRoleThemes();
  return allThemes[normRole] || DEFAULT_ROLE_THEMES[normRole] || DEFAULT_ROLE_THEMES.Admin;
};

/**
 * Persists themes to localStorage, dispatches local sync event, and attempts backend sync
 */
export const saveAllRoleThemes = async (themes) => {
  const sanitized = {
    Admin: {
      sidebarGradient: ensureGradient(themes.Admin?.sidebarGradient, DEFAULT_ROLE_THEMES.Admin.sidebarGradient),
      headerGradient: ensureGradient(themes.Admin?.headerGradient, DEFAULT_ROLE_THEMES.Admin.headerGradient),
      solidColor: ensureSolidColor(themes.Admin?.solidColor, DEFAULT_ROLE_THEMES.Admin.solidColor),
      solidHover: ensureSolidColor(themes.Admin?.solidHover, adjustBrightness(themes.Admin?.solidColor, -15)),
      sidebarHover: ensureHover(themes.Admin?.sidebarHover, DEFAULT_ROLE_THEMES.Admin.sidebarHover),
    },
    Inventory: {
      sidebarGradient: ensureGradient(themes.Inventory?.sidebarGradient, DEFAULT_ROLE_THEMES.Inventory.sidebarGradient),
      headerGradient: ensureGradient(themes.Inventory?.headerGradient, DEFAULT_ROLE_THEMES.Inventory.headerGradient),
      solidColor: ensureSolidColor(themes.Inventory?.solidColor, DEFAULT_ROLE_THEMES.Inventory.solidColor),
      solidHover: ensureSolidColor(themes.Inventory?.solidHover, adjustBrightness(themes.Inventory?.solidColor, -15)),
      sidebarHover: ensureHover(themes.Inventory?.sidebarHover, DEFAULT_ROLE_THEMES.Inventory.sidebarHover),
    },
    Logistics: {
      sidebarGradient: ensureGradient(themes.Logistics?.sidebarGradient, DEFAULT_ROLE_THEMES.Logistics.sidebarGradient),
      headerGradient: ensureGradient(themes.Logistics?.headerGradient, DEFAULT_ROLE_THEMES.Logistics.headerGradient),
      solidColor: ensureSolidColor(themes.Logistics?.solidColor, DEFAULT_ROLE_THEMES.Logistics.solidColor),
      solidHover: ensureSolidColor(themes.Logistics?.solidHover, adjustBrightness(themes.Logistics?.solidColor, -15)),
      sidebarHover: ensureHover(themes.Logistics?.sidebarHover, DEFAULT_ROLE_THEMES.Logistics.sidebarHover),
    },
    Marketing: {
      sidebarGradient: ensureGradient(themes.Marketing?.sidebarGradient, DEFAULT_ROLE_THEMES.Marketing.sidebarGradient),
      headerGradient: ensureGradient(themes.Marketing?.headerGradient, DEFAULT_ROLE_THEMES.Marketing.headerGradient),
      solidColor: ensureSolidColor(themes.Marketing?.solidColor, DEFAULT_ROLE_THEMES.Marketing.solidColor),
      solidHover: ensureSolidColor(themes.Marketing?.solidHover, adjustBrightness(themes.Marketing?.solidColor, -15)),
      sidebarHover: ensureHover(themes.Marketing?.sidebarHover, DEFAULT_ROLE_THEMES.Marketing.sidebarHover),
    },
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error("Failed to write themes to localStorage:", err);
  }

  // 1. 0ms instant broadcast to current window components
  window.dispatchEvent(new CustomEvent("appearanceUpdated", { detail: sanitized }));
  window.dispatchEvent(new Event("storage"));

  // 2. Real-time broadcast across all tabs and browser windows
  try {
    notifyLiveSync("appearance", sanitized);
  } catch (e) {}

  // 3. Persist to backend settings file (config/system_settings.json)
  try {
    await API.post("/api/system/settings", { roleAppearances: sanitized });
  } catch (e) {
    console.warn("Backend theme save notice (running with local cache):", e.message);
  }

  return sanitized;
};

/**
 * Applies CSS variables directly to :root (document.documentElement)
 */
export const applyRoleThemeToRoot = (role) => {
  if (typeof document === "undefined") return;
  const theme = getRoleTheme(role);
  if (!theme) return;

  const root = document.documentElement;
  root.style.setProperty("--role-solid", theme.solidColor || "#01390f");
  root.style.setProperty("--role-solid-hover", theme.solidHover || "#01250a");
  root.style.setProperty("--role-sidebar-hover", theme.sidebarHover || "#0a5219");
  root.style.setProperty("--role-sidebar-gradient", theme.sidebarGradient);
  root.style.setProperty("--role-header-gradient", theme.headerGradient);
};

/**
 * Reset a single role's theme to default
 */
export const resetRoleTheme = async (role) => {
  const normRole = normalizeRole(role);
  const current = getAllRoleThemes();
  current[normRole] = JSON.parse(JSON.stringify(DEFAULT_ROLE_THEMES[normRole]));
  return await saveAllRoleThemes(current);
};

/**
 * Reset all role themes to default
 */
export const resetAllRoleThemes = async () => {
  return await saveAllRoleThemes(DEFAULT_ROLE_THEMES);
};

/**
 * Fetch and sync themes from backend settings if available
 */
export const syncThemesFromBackend = async () => {
  try {
    const res = await API.get("/api/system/settings");
    if (res.data?.settings?.roleAppearances) {
      const backendThemes = res.data.settings.roleAppearances;
      const merged = {
        ...DEFAULT_ROLE_THEMES,
        ...backendThemes,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("appearanceUpdated", { detail: merged }));
      window.dispatchEvent(new Event("storage"));
      return merged;
    }
  } catch (e) {
    // Non-blocking fallback to local storage
  }
  return getAllRoleThemes();
};
