import mongoose from 'mongoose';

const inventoryCategoryUomSchema = new mongoose.Schema(
  {
    moduleType: {
      type: String,
      required: true,
      unique: true,
      enum: ['finished_goods', 'raw_materials'],
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
    },
    uoms: {
      type: [String],
      default: [],
    },
    defaultThresholds: {
      criticalLevel: { type: Number, default: 0 },
      restockWarningPoint: { type: Number, default: 10 },
      overstockLimitPoint: { type: Number, default: 1000 },
    },
  },
  {
    timestamps: true,
  }
);

inventoryCategoryUomSchema.index({ moduleType: 1 });

const InventoryCategoryUom =
  mongoose.models.InventoryCategoryUom ||
  mongoose.model('InventoryCategoryUom', inventoryCategoryUomSchema);

export default InventoryCategoryUom;
