import mongoose from 'mongoose';

const logisticCourierSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Courier code is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Courier name is required'],
      trim: true,
    },
    address: {
      type: String,
      default: '',
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

logisticCourierSchema.index({ isArchived: 1, createdAt: -1 });

const LogisticCourier = mongoose.models.LogisticCourier || mongoose.model('LogisticCourier', logisticCourierSchema);

export default LogisticCourier;
