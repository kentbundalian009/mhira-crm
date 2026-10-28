import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Supplier code is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance database query indexes
supplierSchema.index({ isArchived: 1, createdAt: -1 });

const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);

export default Supplier;
