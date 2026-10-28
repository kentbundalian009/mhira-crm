import mongoose from "mongoose";
import { emitRealtimeSync } from "./socket.js";

const MODEL_TO_ENTITY_MAP = {
  AdminUser: ["users", "admin"],
  LogisticOrder: ["orders", "logistics"],
  LogisticReturnRequest: ["returns", "logistics"],
  LogisticChatbotTicket: ["support", "logistics"],
  LogisticsShippingSetting: ["shipping", "logistics"],
  InventoryProduct: ["products", "inventory"],
  InventoryRawMaterial: ["rawMaterials", "inventory"],
  InventoryWIP: ["wip", "inventory"],
  InventoryInbound: ["inbound", "inventory"],
  InventoryExpiry: ["expiry", "inventory"],
  InventorySupplier: ["suppliers", "inventory"],
  InventoryCategoryUom: ["categories", "inventory"],
  MarketingHomeSection: ["sections", "marketing"],
  MarketingCollection: ["collections", "marketing"],
  MarketingEvent: ["events", "marketing"],
  MarketingReview: ["reviews", "marketing"],
  MarketingCoupon: ["coupons", "marketing"],
  MarketingStory: ["story", "marketing"],
  CustomerCart: ["cart"],
  CustomerFavorites: ["favorites"],
  Notification: ["notifications"],
  ScrapAuditLog: ["scrap", "inventory"],
  SystemSettings: ["appearance", "settings", "admin"],
};

// Trailing-edge debounce timer map to coalesce high-frequency mutations (e.g. loops or batch inserts)
const debounceTimers = new Map();

function broadcastModelChange(modelName, action, doc = null) {
  if (!modelName) return;
  const entities = MODEL_TO_ENTITY_MAP[modelName] || [modelName.toLowerCase()];

  entities.forEach((entity) => {
    if (debounceTimers.has(entity)) {
      clearTimeout(debounceTimers.get(entity));
    }
    const timer = setTimeout(() => {
      debounceTimers.delete(entity);
      emitRealtimeSync(entity, {
        model: modelName,
        action,
        id: doc?._id || null,
        timestamp: Date.now(),
      });
    }, 80);
    debounceTimers.set(entity, timer);
  });
}

export function realtimePlugin(schema) {
  // Document post-save (inserts, document.save())
  schema.post("save", function (doc) {
    const modelName = this?.constructor?.modelName;
    broadcastModelChange(modelName, "save", doc);
  });

  // Query-level post hooks (updates)
  schema.post(["findOneAndUpdate", "updateOne", "updateMany"], function (res) {
    const modelName = this?.model?.modelName;
    broadcastModelChange(modelName, "update", null);
  });

  // Query-level post hooks (deletions)
  schema.post(["findOneAndDelete", "deleteOne", "deleteMany"], function (res) {
    const modelName = this?.model?.modelName;
    broadcastModelChange(modelName, "delete", null);
  });
}

// Auto-register plugin to all future Mongoose schemas
mongoose.plugin(realtimePlugin);
