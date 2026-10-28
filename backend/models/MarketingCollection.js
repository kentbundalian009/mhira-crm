import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
  {
    productRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false
    },
    code: {
      type: String,
      required: true,
      trim: true
    },
    itemDescription: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true
    },
    brand: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      default: 0
    },
    uom: {
      type: String,
      default: 'pcs'
    },
    image: {
      type: String,
      default: ''
    },
    images: {
      type: [String],
      default: []
    },
    price: {
      type: Number,
      required: true,
      default: 0
    },
    originalPrice: {
      type: Number,
      default: 0
    },
    promoBadge: {
      type: String,
      default: '' // e.g. '🔥 ON SALE', '⚡ FLASH DEAL', '✨ NEW ARRIVAL', '🎁 SPECIAL BUNDLE'
    },
    isOnSale: {
      type: Boolean,
      default: false
    },
    shippingFee: {
      type: Number,
      default: 0
    },
    isFreeShipping: {
      type: Boolean,
      default: false
    },
    marketingDescription: {
      type: String,
      default: ''
    },
    ingredients: {
      type: String,
      default: ''
    },
    shippingReturns: {
      type: String,
      default: ''
    },
    rating: {
      type: Number,
      default: 5.0
    },
    soldCount: {
      type: Number,
      default: 0
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    navbarTag: {
      type: String,
      default: 'Skin Care'
    }
  },
  { timestamps: true }
);

// High-performance database query indexes
collectionSchema.index({ isPublished: 1, createdAt: -1 });
collectionSchema.index({ category: 1, isPublished: 1 });
collectionSchema.index({ navbarTag: 1, isPublished: 1 });

const Collection = mongoose.models.Collection || mongoose.model('Collection', collectionSchema);

export default Collection;