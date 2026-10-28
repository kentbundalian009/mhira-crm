import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
  rawMaterialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RawMaterial',
  },
  materialCode: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    required: true,
  },
  specification: {
    type: String,
    default: '',
  },
  theoreticalWeight: {
    type: String,
    default: '',
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  uom: {
    type: String,
    default: 'pcs',
  },
});

const productSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      default: '',
    },
    code: {
      type: String,
      required: [true, 'Product code is required'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'Finished Goods',
      trim: true,
    },
    itemName: {
      type: String,
      default: '',
      trim: true,
    },
    itemDescription: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
    },
    specification: {
      type: String,
      default: '',
      trim: true,
    },
    standardBatchSize: {
      type: Number,
      default: 5,
    },
    batchSizeUom: {
      type: String,
      default: 'kg',
      trim: true,
    },
    netWeight: {
      type: String,
      default: '',
      trim: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    uom: {
      type: String,
      required: [true, 'Unit of Measure (UOM) is required'],
      trim: true,
    },
    manufacturer: {
      type: String,
      default: 'N/A',
      trim: true,
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    accountTo: {
      type: String,
      default: '',
      trim: true,
    },
    ingredients: [ingredientSchema],
    isArchived: {
      type: Boolean,
      default: false,
    },
    criticalLevel: {
      type: Number,
      default: 0,
    },
    restockWarningPoint: {
      type: Number,
      default: 10,
    },
    overstockLimitPoint: {
      type: Number,
      default: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance database query indexes
productSchema.index({ isArchived: 1, createdAt: -1 });
productSchema.index({ category: 1, isArchived: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;