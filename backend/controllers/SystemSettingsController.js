import fs from "fs";
import path from "path";

const configDir = path.join(process.cwd(), "config");
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const settingsFilePath = path.join(configDir, "system_settings.json");

const defaultSettings = {
  siteName: "Mhira Natural Soap & Cosmetics",
  contactEmail: "support@mhiracosmetics.ph",
  currency: "PHP (₱)",
  timezone: "Asia/Manila (GMT+8)",
  maintenanceMode: false,
  maintenanceMessage: "System is temporarily unavailable for maintenance. We are performing scheduled system upgrades and database optimizations.",
  maintenanceEstimatedTime: "1-2 Hours",
  autoEmailNotif: true,
  enableReviews: true,
  autoDailyBackup: true,
  roleAppearances: {
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
  },
  formulaAccessPin: "123456",
  formulaPinUpdatedAt: new Date().toISOString(),
  formulaPinUpdatedBy: "System Default",
  updatedAt: new Date().toISOString(),
};

// In-Memory Settings Cache (0ms Instant Delivery)
let memoryCachedSettings = null;

const getStoredSettings = () => {
  if (memoryCachedSettings) {
    return memoryCachedSettings;
  }
  try {
    if (fs.existsSync(settingsFilePath)) {
      const data = fs.readFileSync(settingsFilePath, "utf-8");
      memoryCachedSettings = { ...defaultSettings, ...JSON.parse(data) };
      return memoryCachedSettings;
    }
  } catch (err) {
    console.error("Error reading system settings from disk:", err.message);
  }
  memoryCachedSettings = { ...defaultSettings };
  return memoryCachedSettings;
};

const saveStoredSettings = (settings) => {
  memoryCachedSettings = { ...settings };
  try {
    fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2), "utf-8", (err) => {
      if (err) console.error("Async error saving system settings to disk:", err.message);
    });
  } catch (err) {
    console.error("Error initiating settings file write:", err.message);
  }
};

export const invalidateSettingsCache = () => {
  memoryCachedSettings = null;
};

// 1. Get Maintenance Status (Public endpoint for frontend interceptor)
export const getMaintenanceStatus = async (req, res) => {
  try {
    const settings = getStoredSettings();
    return res.status(200).json({
      success: true,
      maintenanceMode: Boolean(settings.maintenanceMode),
      message: settings.maintenanceMessage || defaultSettings.maintenanceMessage,
      estimatedTime: settings.maintenanceEstimatedTime || defaultSettings.maintenanceEstimatedTime,
      siteName: settings.siteName || defaultSettings.siteName,
      contactEmail: settings.contactEmail || defaultSettings.contactEmail,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching maintenance status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Toggle / Update Maintenance Mode (Admin only)
export const updateMaintenanceStatus = async (req, res) => {
  try {
    const { maintenanceMode, maintenanceMessage, maintenanceEstimatedTime } = req.body;
    const current = getStoredSettings();

    const updated = {
      ...current,
      maintenanceMode: maintenanceMode !== undefined ? Boolean(maintenanceMode) : current.maintenanceMode,
      maintenanceMessage: maintenanceMessage || current.maintenanceMessage,
      maintenanceEstimatedTime: maintenanceEstimatedTime || current.maintenanceEstimatedTime,
      updatedAt: new Date().toISOString(),
    };

    saveStoredSettings(updated);

    return res.status(200).json({
      success: true,
      message: `System Maintenance Mode is now ${updated.maintenanceMode ? "ENABLED 🔴" : "DISABLED 🟢"}`,
      settings: updated,
    });
  } catch (error) {
    console.error("Error updating maintenance status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get All System Settings
export const getSystemSettings = async (req, res) => {
  try {
    const settings = getStoredSettings();
    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update All System Settings
export const updateSystemSettings = async (req, res) => {
  try {
    const current = getStoredSettings();
    const updated = {
      ...current,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };

    saveStoredSettings(updated);

    return res.status(200).json({
      success: true,
      message: "System settings updated successfully!",
      settings: updated,
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get Formula Access Authorization PIN Status (For Admin Console & Staff Verification)
export const getFormulaPinStatus = async (req, res) => {
  try {
    const settings = getStoredSettings();
    const currentPin = String(settings.formulaAccessPin || "123456").trim();
    const isDefault = currentPin === "123456";
    const userRole = String(req.user?.role || "").trim().toLowerCase();
    const isAdmin = ["admin", "superadmin"].includes(userRole);

    return res.status(200).json({
      success: true,
      isDefault,
      updatedAt: settings.formulaPinUpdatedAt || settings.updatedAt || new Date().toISOString(),
      updatedBy: settings.formulaPinUpdatedBy || "System Default",
      // Expose currentPin to Admins only
      currentPin: isAdmin ? currentPin : undefined,
    });
  } catch (error) {
    console.error("Error fetching formula PIN status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Verify 6-digit PIN Code (Used by Inventory Finished Goods Formulation modal)
export const verifyFormulaPin = async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || typeof pin !== "string") {
      return res.status(400).json({ success: false, valid: false, message: "PIN is required." });
    }

    const settings = getStoredSettings();
    const correctPin = String(settings.formulaAccessPin || "123456").trim();
    const enteredPin = String(pin).trim();

    if (enteredPin === correctPin) {
      return res.status(200).json({
        success: true,
        valid: true,
        message: "PIN verified successfully. Access granted.",
      });
    }

    return res.status(200).json({
      success: true,
      valid: false,
      message: "Invalid 6-digit PIN code. Please try again.",
    });
  } catch (error) {
    console.error("Error verifying formula PIN:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Update Formula Access Authorization PIN (Admin Only)
export const updateFormulaPin = async (req, res) => {
  try {
    const { newPin } = req.body;
    const cleanPin = String(newPin || "").trim();

    if (!cleanPin || !/^\d{6}$/.test(cleanPin)) {
      return res.status(400).json({
        success: false,
        message: "New PIN must be exactly 6 numeric digits (0-9).",
      });
    }

    const current = getStoredSettings();
    const adminIdentifier = req.user?.username || req.user?.name || req.user?.email || "Admin";

    const updated = {
      ...current,
      formulaAccessPin: cleanPin,
      formulaPinUpdatedAt: new Date().toISOString(),
      formulaPinUpdatedBy: adminIdentifier,
      updatedAt: new Date().toISOString(),
    };

    saveStoredSettings(updated);

    return res.status(200).json({
      success: true,
      message: "Formula Access Authorization PIN updated successfully!",
      currentPin: cleanPin,
      isDefault: cleanPin === "123456",
      updatedAt: updated.formulaPinUpdatedAt,
      updatedBy: updated.formulaPinUpdatedBy,
    });
  } catch (error) {
    console.error("Error updating formula PIN:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Reset Formula Access PIN to Factory Default 123456 (Admin Only)
export const resetFormulaPin = async (req, res) => {
  try {
    const current = getStoredSettings();
    const adminIdentifier = req.user?.username || req.user?.name || req.user?.email || "Admin";

    const updated = {
      ...current,
      formulaAccessPin: "123456",
      formulaPinUpdatedAt: new Date().toISOString(),
      formulaPinUpdatedBy: `${adminIdentifier} (Reset to Default)`,
      updatedAt: new Date().toISOString(),
    };

    saveStoredSettings(updated);

    return res.status(200).json({
      success: true,
      message: "Formula Access PIN has been reset to factory default (123456).",
      currentPin: "123456",
      isDefault: true,
      updatedAt: updated.formulaPinUpdatedAt,
      updatedBy: updated.formulaPinUpdatedBy,
    });
  } catch (error) {
    console.error("Error resetting formula PIN:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

