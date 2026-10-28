import mongoose from 'mongoose';

const regionRateSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true,
    enum: ['ncr', 'luzon', 'visayas', 'mindanao', 'islands'],
  },
  name: { 
    type: String, 
    required: true 
  },
  rate: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0 
  },
  estimatedDays: { 
    type: String, 
    default: '3-5 Business Days' 
  },
  description: { 
    type: String, 
    default: '' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
});

const customOverrideSchema = new mongoose.Schema({
  locationName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  rate: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0 
  },
  estimatedDays: { 
    type: String, 
    default: '1-3 Business Days' 
  },
  notes: { 
    type: String, 
    default: '' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
});

const shippingSettingSchema = new mongoose.Schema(
  {
    settingKey: { 
      type: String, 
      default: 'primary', 
      unique: true 
    },
    defaultRate: { 
      type: Number, 
      default: 115,
      min: 0 
    },
    freeShippingEnabled: { 
      type: Boolean, 
      default: true 
    },
    freeShippingThreshold: { 
      type: Number, 
      default: 1500,
      min: 0 
    },
    regions: [regionRateSchema],
    customOverrides: [customOverrideSchema],
    lastUpdatedBy: { 
      type: String, 
      default: 'Logistics' 
    },
  },
  { timestamps: true }
);

const LogisticsShippingSetting =
  mongoose.models.LogisticsShippingSetting ||
  mongoose.model('LogisticsShippingSetting', shippingSettingSchema);

export default LogisticsShippingSetting;
