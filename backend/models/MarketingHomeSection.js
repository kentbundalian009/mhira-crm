import mongoose from 'mongoose';

const homeSectionSchema = new mongoose.Schema(
  {
    sectionName: {
      type: String,
      required: true,
      unique: true, // Halimbawa: 'carousel', 'featured', 'ads-i', 'ads-ii'
    },
    title: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      default: '',
    },
    images: [
      {
        type: String, // Nagtatago ng array ng image paths (hal. '/uploads/image-123.jpg')
      },
    ],
    slideDetails: [
      {
        image: { type: String, default: '' },
        title: { type: String, default: '' },
        text: { type: String, default: '' },
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const HomeSection = mongoose.models.HomeSection || mongoose.model('HomeSection', homeSectionSchema);

export default HomeSection;