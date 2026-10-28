import mongoose from 'mongoose';

const pillarSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false }
);

export const defaultStoryContent = {
  headline: '“WE WORK AS ONE TO BE THE NUMBER ONE”',
  intro:
    'At Mhira Natural, we believe that taking care of yourself should feel simple, gentle, and natural.',
  founderName: 'Mirasol P. Bituin',
  founderRole: 'Founder',
  founderImage: '',
  founderBio1:
    'The Mhira Natural Soap and Cosmetics Manufacturing was founded by Mirasol P. Bituin in 2018, a passionate entrepreneur with a deep love for nature and a vision to create natural skincare products that are gentle on the skin and the environment.',
  founderBio2:
    'Mhira’s journey began when she struggled to find skincare products that were free from harsh chemicals and synthetic ingredients. Determined to make a difference, she embarked on a mission to develop a line of products that would harness the power of nature to promote healthy and radiant skin.',
  visionTitle: 'Vision',
  visionText:
    'To become the most influential Natural Hair and Skin Care Company in both local and international aspects. We aspire to inspire people around the world to embrace their individuality and celebrate their unique beauty.',
  taglineTitle: 'Tagline',
  taglineText:
    '"We work as one to be the number one!" expresses the concept of unity and collective effort towards achieving the top position or becoming the best in a particular endeavor. It highlights the importance of teamwork, collaboration, and synergy in reaching the ultimate goal.',
  pillars: [
    {
      title: 'Natural care, made for everyday',
      description:
        'We create personal care products that make everyday self-care easy and enjoyable. From skin to hair, our products are made to fit naturally into your daily routine—simple to use, gentle to your skin, and made for your everyday needs.',
    },
    {
      title: 'Nature-inspired, skin-loving care',
      description:
        'We believe in the power of nature. Each Mhira Natural product is thoughtfully made with carefully selected ingredients inspired by nature, bringing gentle care to your skin and hair while helping you feel fresh, confident, and naturally beautiful.',
    },
    {
      title: 'Kind to you, kind to nature',
      description:
        'Beauty should not come at the expense of the world around us. Mhira Natural is committed to creating products with care for you, your skin, your hair, and the environment we all share.',
    },
    {
      title: 'Made with care, made for you',
      description:
        'Our promise is simple: to create natural personal care that feels good, works beautifully, and brings a little more care into your everyday routine.',
    },
  ],
  bannerImage: '',
  closingTagline: 'Mhira Natural — Simple care. Natural beauty. Everyday you.',
  updatedBy: 'Marketing Team',
};

const marketingStorySchema = new mongoose.Schema(
  {
    headline: {
      type: String,
      default: defaultStoryContent.headline,
    },
    intro: {
      type: String,
      default: defaultStoryContent.intro,
    },
    founderName: {
      type: String,
      default: defaultStoryContent.founderName,
    },
    founderRole: {
      type: String,
      default: defaultStoryContent.founderRole,
    },
    founderImage: {
      type: String,
      default: '',
    },
    founderBio1: {
      type: String,
      default: defaultStoryContent.founderBio1,
    },
    founderBio2: {
      type: String,
      default: defaultStoryContent.founderBio2,
    },
    visionTitle: {
      type: String,
      default: defaultStoryContent.visionTitle,
    },
    visionText: {
      type: String,
      default: defaultStoryContent.visionText,
    },
    taglineTitle: {
      type: String,
      default: defaultStoryContent.taglineTitle,
    },
    taglineText: {
      type: String,
      default: defaultStoryContent.taglineText,
    },
    pillars: {
      type: [pillarSchema],
      default: defaultStoryContent.pillars,
    },
    bannerImage: {
      type: String,
      default: '',
    },
    closingTagline: {
      type: String,
      default: defaultStoryContent.closingTagline,
    },
    updatedBy: {
      type: String,
      default: 'Marketing Team',
    },
  },
  {
    timestamps: true,
  }
);

const MarketingStory =
  mongoose.models.MarketingStory || mongoose.model('MarketingStory', marketingStorySchema);

export default MarketingStory;
