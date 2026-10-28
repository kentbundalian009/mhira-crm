import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Ensure backups directory exists
const backupsDir = path.join(process.cwd(), "backups");
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Config file for automated schedule settings
const scheduleConfigFile = path.join(backupsDir, "schedule_config.json");

const getScheduleConfig = () => {
  try {
    if (fs.existsSync(scheduleConfigFile)) {
      const data = fs.readFileSync(scheduleConfigFile, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading schedule config:", err);
  }
  return {
    enabled: true,
    frequency: "daily", // daily, weekly, hourly
    time: "02:30", // Off-peak default: 2:00 AM - 3:00 AM
    retentionCount: 15,
    lastBackup: null,
    lastStatus: "Healthy",
  };
};

const saveScheduleConfig = (config) => {
  try {
    fs.writeFileSync(scheduleConfigFile, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving schedule config:", err);
  }
};

// Helper: Format bytes to human readable string
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// 1. Get Database Status & Real-time Metrics
export const getDatabaseStatus = async (req, res) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ success: false, message: "Database not connected" });
    }

    // List all collections and count documents
    const collectionsList = await db.listCollections().toArray();
    let totalDocuments = 0;
    const collectionsDetail = [];

    for (const colInfo of collectionsList) {
      const name = colInfo.name;
      // Skip system collections
      if (name.startsWith("system.")) continue;
      const count = await db.collection(name).countDocuments();
      totalDocuments += count;
      collectionsDetail.push({
        name,
        count,
      });
    }

    // Get list of saved backup files
    const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith(".json") && f !== "schedule_config.json");
    let totalBackupBytes = 0;
    let latestBackupTime = null;
    let latestBackupFile = null;

    const backupFilesList = files.map((filename) => {
      const filePath = path.join(backupsDir, filename);
      const stats = fs.statSync(filePath);
      totalBackupBytes += stats.size;

      if (!latestBackupTime || stats.mtime > latestBackupTime) {
        latestBackupTime = stats.mtime;
        latestBackupFile = filename;
      }

      return {
        filename,
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        createdAt: stats.birthtime || stats.mtime,
      };
    });

    const scheduleConfig = getScheduleConfig();

    let dbStorageBytes = 0;
    try {
      const dbStats = await db.stats();
      dbStorageBytes = dbStats.dataSize || dbStats.storageSize || 0;
    } catch (e) {
      console.warn("db.stats fetch notice:", e?.message);
    }

    const totalSystemStorageBytes = dbStorageBytes + totalBackupBytes;
    const maxStorageQuotaBytes = 512 * 1024 * 1024; // 512 MB Cloud Allocation
    const calculatedStoragePct = Math.max(1, Math.min(100, Math.round((totalSystemStorageBytes / maxStorageQuotaBytes) * 100)));

    return res.status(200).json({
      success: true,
      metrics: {
        databaseName: mongoose.connection.name || "mhira_crm_db",
        totalCollections: collectionsDetail.length,
        totalDocuments,
        collections: collectionsDetail,
        totalBackupsCount: backupFilesList.length,
        totalBackupStorage: formatBytes(totalBackupBytes),
        totalBackupBytes,
        dbStorageFormatted: formatBytes(dbStorageBytes),
        totalUsedStorage: formatBytes(totalSystemStorageBytes),
        storageQuota: "512 MB",
        storageUsedPct: calculatedStoragePct,
        storageFreeFormatted: formatBytes(Math.max(0, maxStorageQuotaBytes - totalSystemStorageBytes)),
        lastBackup: latestBackupTime ? latestBackupTime.toISOString() : scheduleConfig.lastBackup,
        lastBackupFilename: latestBackupFile,
        systemHealth: "Healthy",
        scheduleConfig,
      },
    });
  } catch (error) {
    console.error("Error fetching database status:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Create Full Database Backup Snapshot (Manual or Triggered)
export const createBackup = async (req, res) => {
  try {
    const isAuto = req.body?.isAuto || false;
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(500).json({ success: false, message: "Database connection not ready" });
    }

    const collectionsList = await db.listCollections().toArray();
    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      databaseName: mongoose.connection.name || "mhira_crm_db",
      type: isAuto ? "Automated Scheduled" : "Manual Admin Backup",
      collectionsCount: 0,
      totalRecords: 0,
      data: {},
    };

    let totalRecordsCount = 0;

    for (const col of collectionsList) {
      const colName = col.name;
      if (colName.startsWith("system.")) continue;

      const docs = await db.collection(colName).find({}).toArray();
      backupData.data[colName] = docs;
      totalRecordsCount += docs.length;
    }

    backupData.collectionsCount = Object.keys(backupData.data).length;
    backupData.totalRecords = totalRecordsCount;

    // Generate clean filename: mhira_backup_YYYY-MM-DD_HHmmss.json
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const prefix = isAuto ? "auto" : "manual";
    const filename = `mhira_${prefix}_backup_${dateStr}.json`;
    const filePath = path.join(backupsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");

    const stats = fs.statSync(filePath);

    // Update Schedule Config metadata
    const config = getScheduleConfig();
    config.lastBackup = now.toISOString();
    config.lastStatus = "Healthy";
    saveScheduleConfig(config);

    // Enforce retention limit if configured
    try {
      const allFiles = fs
        .readdirSync(backupsDir)
        .filter((f) => f.endsWith(".json") && f !== "schedule_config.json")
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(backupsDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (allFiles.length > (config.retentionCount || 20)) {
        const toDelete = allFiles.slice(config.retentionCount || 20);
        for (const item of toDelete) {
          try {
            fs.unlinkSync(path.join(backupsDir, item.name));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Retention cleanup warning:", e.message);
    }

    return res.status(200).json({
      success: true,
      message: `Backup ${filename} created successfully!`,
      backup: {
        filename,
        type: backupData.type,
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        totalRecords: totalRecordsCount,
        collectionsCount: backupData.collectionsCount,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error creating database backup:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. List all Backups in History
export const listBackups = async (req, res) => {
  try {
    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.endsWith(".json") && f !== "schedule_config.json");

    const backupsList = [];

    for (const filename of files) {
      const filePath = path.join(backupsDir, filename);
      const stats = fs.statSync(filePath);

      let metadata = {
        type: filename.includes("auto") ? "Automated Scheduled" : "Manual Admin Backup",
        collectionsCount: 0,
        totalRecords: 0,
      };

      try {
        // Read top of JSON or full to get summary
        const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        metadata.type = content.type || metadata.type;
        metadata.collectionsCount = content.collectionsCount || Object.keys(content.data || {}).length;
        metadata.totalRecords = content.totalRecords || 0;
      } catch (err) {
        // fallback to stats if parse fails
      }

      backupsList.push({
        filename,
        type: metadata.type,
        sizeBytes: stats.size,
        sizeFormatted: formatBytes(stats.size),
        collectionsCount: metadata.collectionsCount,
        totalRecords: metadata.totalRecords,
        createdAt: stats.birthtime || stats.mtime,
      });
    }

    // Sort newest first
    backupsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      backups: backupsList,
    });
  } catch (error) {
    console.error("Error listing backups:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Download Backup File
export const downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    // Security check against directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(backupsDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Backup file not found" });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    res.setHeader("Content-Type", "application/json");
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading backup:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Restore Database from a Backup File / Snapshot
export const restoreBackup = async (req, res) => {
  try {
    const { filename, backupPayload } = req.body;
    let restoreData = null;

    if (filename) {
      const safeFilename = path.basename(filename);
      const filePath = path.join(backupsDir, safeFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "Backup snapshot file not found on server" });
      }
      const raw = fs.readFileSync(filePath, "utf-8");
      restoreData = JSON.parse(raw);
    } else if (backupPayload) {
      restoreData = typeof backupPayload === "string" ? JSON.parse(backupPayload) : backupPayload;
    }

    if (!restoreData || !restoreData.data) {
      return res.status(400).json({ success: false, message: "Invalid backup format or empty payload" });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ success: false, message: "Database connection not ready" });
    }

    let restoredCollectionsCount = 0;
    let restoredDocsCount = 0;

    // Iterate through all collections in backup
    for (const [colName, docs] of Object.entries(restoreData.data)) {
      if (colName.startsWith("system.")) continue;

      // 1. Clear existing collection
      try {
        await db.collection(colName).deleteMany({});
      } catch (e) {
        console.warn(`Could not clear collection ${colName}:`, e.message);
      }

      // 2. Insert backup documents if any
      if (Array.isArray(docs) && docs.length > 0) {
        // Convert string IDs back to ObjectId if present
        const sanitizedDocs = docs.map((doc) => {
          if (doc._id && typeof doc._id === "string" && doc._id.length === 24) {
            try {
              doc._id = new mongoose.Types.ObjectId(doc._id);
            } catch (e) {}
          }
          return doc;
        });

        await db.collection(colName).insertMany(sanitizedDocs);
        restoredDocsCount += docs.length;
      }
      restoredCollectionsCount++;
    }

    return res.status(200).json({
      success: true,
      message: `Database restored successfully! Restored ${restoredCollectionsCount} collections and ${restoredDocsCount} records.`,
      restoredCollectionsCount,
      restoredDocsCount,
      restoredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error restoring database:", error);
    return res.status(500).json({ success: false, message: `Restore failed: ${error.message}` });
  }
};

// 6. Delete a Backup File
export const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(backupsDir, safeFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.status(200).json({ success: true, message: "Backup file removed successfully" });
    } else {
      return res.status(404).json({ success: false, message: "File not found" });
    }
  } catch (error) {
    console.error("Error deleting backup:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Get / Update Scheduled Backup Settings
export const getScheduleSettings = async (req, res) => {
  try {
    const config = getScheduleConfig();
    return res.status(200).json({ success: true, config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateScheduleSettings = async (req, res) => {
  try {
    const current = getScheduleConfig();
    const updated = {
      ...current,
      ...req.body,
    };
    saveScheduleConfig(updated);
    return res.status(200).json({
      success: true,
      message: "Automated backup schedule updated successfully!",
      config: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: Check if a valid backup already exists for the given date (YYYY-MM-DD)
export const checkExistingBackupForDate = (dateStr) => {
  try {
    if (!fs.existsSync(backupsDir)) return { exists: false };
    const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith(".json") && f !== "schedule_config.json");
    for (const file of files) {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      const fileDate = new Date(stats.birthtime || stats.mtime).toISOString().slice(0, 10);
      const formattedDateHyphen = dateStr.replace(/-/g, "");

      // Check if file modification matches dateStr or filename contains date pattern
      if ((fileDate === dateStr || file.includes(dateStr) || file.includes(formattedDateHyphen)) && stats.size > 200) {
        return { exists: true, filename: file, size: stats.size };
      }
    }
  } catch (err) {
    console.warn("Could not check existing backups:", err.message);
  }
  return { exists: false };
};

// Automated Background Scheduler Worker
export const startAutoBackupService = () => {
  console.log("🛡️ [Mhira Auto-Backup] Service initialized. Off-peak window configured (02:00 - 03:00 AM daily) with single-backup duplicate protection.");

  // Check every 15 minutes
  setInterval(async () => {
    try {
      const config = getScheduleConfig();
      if (!config.enabled || config.frequency === "manual") return;

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const currentHour = now.getHours();

      // Check if execution should be aborted because a valid backup already exists for today
      if (config.frequency === "daily") {
        const existingCheck = checkExistingBackupForDate(todayStr);
        const lastBackupToday = config.lastBackup && config.lastBackup.startsWith(todayStr);

        if (existingCheck.exists || lastBackupToday) {
          // Abort execution - backup already exists for today
          return;
        }

        // Off-peak execution check: ideally run between 2:00 AM and 3:00 AM
        // Or if config.time specifies a time, compare hours
        const targetHour = config.time ? parseInt(config.time.split(":")[0], 10) : 2;
        if (currentHour !== targetHour && currentHour !== 2 && currentHour !== 0) {
          return;
        }
      }

      const last = config.lastBackup ? new Date(config.lastBackup) : null;
      let shouldRun = false;

      if (!last) {
        shouldRun = true;
      } else {
        const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);

        if (config.frequency === "hourly" && diffHours >= 1) {
          shouldRun = true;
        } else if (config.frequency === "daily") {
          shouldRun = true;
        } else if (config.frequency === "weekly" && diffHours >= 168) {
          shouldRun = true;
        } else if (config.frequency === "monthly" && (diffHours >= 672 || now.getDate() === 1)) {
          shouldRun = true;
        }
      }

      if (shouldRun) {
        // Double-check abort guard before starting database read
        const duplicateGuard = checkExistingBackupForDate(todayStr);
        if (config.frequency === "daily" && duplicateGuard.exists) {
          console.log(`⏸️ [Mhira Auto-Backup] Aborted execution: Valid backup already exists for today (${todayStr}: ${duplicateGuard.filename}).`);
          return;
        }

        console.log("🛡️ [Mhira Auto-Backup] Triggering scheduled off-peak database backup...");
        const db = mongoose.connection.db;
        if (db) {
          const collectionsList = await db.listCollections().toArray();
          const backupData = {
            version: "1.0",
            timestamp: now.toISOString(),
            databaseName: mongoose.connection.name || "mhira_crm_db",
            type: "Automated Scheduled",
            collectionsCount: 0,
            totalRecords: 0,
            data: {},
          };

          let totalCount = 0;
          for (const col of collectionsList) {
            if (col.name.startsWith("system.")) continue;
            const docs = await db.collection(col.name).find({}).toArray();
            backupData.data[col.name] = docs;
            totalCount += docs.length;
          }

          backupData.collectionsCount = Object.keys(backupData.data).length;
          backupData.totalRecords = totalCount;

          const pad = (n) => String(n).padStart(2, "0");
          const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
          const filename = `mhira_auto_backup_${dateStr}.json`;
          const filePath = path.join(backupsDir, filename);

          fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");

          config.lastBackup = now.toISOString();
          config.lastStatus = "Healthy";
          saveScheduleConfig(config);
          console.log(`✅ [Mhira Auto-Backup] Created ${filename} (${totalCount} records protected during off-peak window)`);
        }
      }
    } catch (e) {
      console.error("🔴 [Mhira Auto-Backup] Scheduled backup error:", e);
    }
  }, 1000 * 60 * 15); // check every 15 minutes
};

// 9. Export Single MongoDB Collection as JSON
export const exportSingleCollection = async (req, res) => {
  try {
    const { name } = req.params;
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ success: false, message: "Database connection not ready" });
    }

    const docs = await db.collection(name).find({}).toArray();
    const exportData = {
      version: "1.0",
      collectionName: name,
      databaseName: mongoose.connection.name || "mhira_crm_db",
      timestamp: new Date().toISOString(),
      activeRecords: docs.length,
      status: "Ready",
      data: docs,
    };

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${name}_export_${dateStr}.json`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error("Error exporting collection:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
