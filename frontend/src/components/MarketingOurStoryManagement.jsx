import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Trash2,
  Save,
  Plus,
  Image as ImageIcon,
  Loader2,
  Edit2,
} from 'lucide-react';
import { API, getImageUrl } from '../axios';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { notifyLiveSync, subscribeLiveSync } from '../utils/liveSync';

const DEFAULT_STORY = {
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
};

function MarketingOurStoryManagement() {
  const [formData, setFormData] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_marketing_story');
      if (cached) return { ...DEFAULT_STORY, ...JSON.parse(cached) };
    } catch (_e) {}
    return { ...DEFAULT_STORY };
  });

  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Image Upload States
  const [founderFile, setFounderFile] = useState(null);
  const [founderPreview, setFounderPreview] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);

  const founderInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  // Fetch story data
  const fetchStory = async () => {
    try {
      const res = await API.get('/api/story');
      if (res.data?.success && res.data?.story) {
        const fetched = { ...DEFAULT_STORY, ...res.data.story };
        setFormData(fetched);
        try {
          localStorage.setItem('cached_marketing_story', JSON.stringify(fetched));
        } catch (_e) {}
      }
    } catch (err) {
      console.error('Error loading our story:', err);
    }
  };

  useEffect(() => {
    fetchStory();

    const unsubscribe = subscribeLiveSync((data) => {
      if (data?.type === 'story' || data?.type === 'marketing') {
        fetchStory();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePillarChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.pillars || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, pillars: updated };
    });
  };

  const handleAddPillar = () => {
    setFormData((prev) => ({
      ...prev,
      pillars: [
        ...(prev.pillars || []),
        {
          title: 'New Brand Pillar',
          description: 'Describe your pillar philosophy and natural commitment here.',
        },
      ],
    }));
  };

  const handleRemovePillar = (index) => {
    if (formData.pillars.length <= 1) {
      showErrorToast('You must maintain at least one brand pillar on the storefront.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      pillars: prev.pillars.filter((_, i) => i !== index),
    }));
  };

  // Founder Image Selection
  const handleFounderFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showErrorToast('Image size exceeds 15MB. Please choose a smaller image.');
      return;
    }

    setFounderFile(file);
    setFounderPreview(URL.createObjectURL(file));
  };

  const handleRemoveFounderImage = () => {
    setFounderFile(null);
    setFounderPreview(null);
    setFormData((prev) => ({ ...prev, founderImage: '' }));
    if (founderInputRef.current) founderInputRef.current.value = '';
  };

  // Banner Image Selection
  const handleBannerFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      showErrorToast('Banner image size exceeds 20MB. Please choose a smaller image.');
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleRemoveBannerImage = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setFormData((prev) => ({ ...prev, bannerImage: '' }));
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  // Save story changes
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const payload = new FormData();
      payload.append('headline', formData.headline || '');
      payload.append('intro', formData.intro || '');
      payload.append('founderName', formData.founderName || '');
      payload.append('founderRole', formData.founderRole || '');
      payload.append('founderBio1', formData.founderBio1 || '');
      payload.append('founderBio2', formData.founderBio2 || '');
      payload.append('visionTitle', formData.visionTitle || '');
      payload.append('visionText', formData.visionText || '');
      payload.append('taglineTitle', formData.taglineTitle || '');
      payload.append('taglineText', formData.taglineText || '');
      payload.append('closingTagline', formData.closingTagline || '');
      payload.append('pillars', JSON.stringify(formData.pillars || []));

      if (founderFile) {
        payload.append('founderImage', founderFile);
      } else {
        payload.append('founderImage', formData.founderImage || '');
      }

      if (bannerFile) {
        payload.append('bannerImage', bannerFile);
      } else {
        payload.append('bannerImage', formData.bannerImage || '');
      }

      const res = await API.put('/api/story', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        const savedStory = { ...DEFAULT_STORY, ...res.data.story };
        setFormData(savedStory);
        setFounderFile(null);
        setFounderPreview(null);
        setBannerFile(null);
        setBannerPreview(null);
        setIsModalOpen(false);

        try {
          localStorage.setItem('cached_marketing_story', JSON.stringify(savedStory));
        } catch (_e) {}

        showSuccessToast('Our Story page updated and published live to storefront!');
        notifyLiveSync('story');
        notifyLiveSync('marketing');
      } else {
        throw new Error(res.data?.message || 'Failed to save changes.');
      }
    } catch (err) {
      console.error('Error saving story:', err);
      showErrorToast(err.response?.data?.message || err.message || 'Failed to publish story.');
    } finally {
      setSaving(false);
    }
  };

  const displayFounderImg =
    founderPreview || (formData.founderImage ? getImageUrl(formData.founderImage) : '');
  const displayBannerImg =
    bannerPreview || (formData.bannerImage ? getImageUrl(formData.bannerImage) : '');

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      {/* MAIN CONTAINER (MATCHES MARKETING CONTENT LAYOUT) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">
        {/* EXCEL SHEET TAB BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white px-1 pt-1 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap inline-flex items-center border-[#01390f] text-[#01390f] bg-slate-50"
            >
              <span>Our Story Page (/about)</span>
            </button>
          </div>
        </div>

        {/* SINGLE PLACEMENT CARD (SAME UI AS MARKETING CONTENT) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-5 hover:border-slate-300 transition-all duration-150">
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-slate-900 text-sm">
                Our Story — Brand &amp; Founder Narrative
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-[#246C94] border-blue-200">
                Storefront About Page
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Manage Content</span>
              </button>
            </div>
          </div>

          {/* Unified Story Content Overview */}
          <div className="space-y-5">
            {/* Showcase Banner if uploaded */}
            {displayBannerImg && (
              <div className="w-full h-44 sm:h-56 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 relative shadow-2xs">
                <img
                  src={displayBannerImg}
                  alt="Showcase Banner"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Headline & Opening Philosophy */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Editorial Headline &amp; Introduction
              </span>
              <h2 className="text-base sm:text-lg font-bold italic text-slate-900">
                {formData.headline}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">{formData.intro}</p>
            </div>

            {/* Founder Section */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-start gap-4">
              <div className="w-28 h-36 sm:w-32 sm:h-40 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 flex flex-col items-center justify-center text-slate-400 shadow-2xs">
                {displayFounderImg ? (
                  <img
                    src={displayFounderImg}
                    alt={formData.founderName || 'Founder'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-center">
                    <User className="w-8 h-8 text-slate-300 mb-1" />
                    <span className="text-[10px] font-semibold text-slate-400">No Photo</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 min-w-0">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Founder Spotlight
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {formData.founderName}{' '}
                    <span className="text-xs font-medium text-slate-500">
                      — {formData.founderRole}
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {formData.founderBio1}
                </p>
                {formData.founderBio2 && (
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {formData.founderBio2}
                  </p>
                )}
              </div>
            </div>

            {/* Vision & Tagline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {formData.visionTitle || 'Vision'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {formData.visionText}
                </p>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {formData.taglineTitle || 'Tagline'}
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {formData.taglineText}
                </p>
              </div>
            </div>

            {/* Brand Pillars */}
            {formData.pillars && formData.pillars.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.pillars.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 space-y-1"
                  >
                    <h4 className="text-xs font-bold text-slate-900">{pillar.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Closing Signature */}
            {formData.closingTagline && (
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold italic text-[#246C94]">
                {formData.closingTagline}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MANAGE CONTENT MODAL (SAME UI AS MARKETING CONTENT MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Manage Content — Our Story Page
                </h3>
                <p className="text-xs text-slate-400">
                  Update storefront brand narrative, founder profile, vision, tagline, and pillars
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm"
            >
              <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
                {/* MEDIA UPLOADS: FOUNDER PORTRAIT & SHOWCASE BANNER */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Founder Portrait */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 whitespace-nowrap">
                      Founder Portrait Photo
                    </label>
                    <div className="flex items-center gap-3 py-1">
                      <label
                        title="Choose Founder Portrait"
                        className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          ref={founderInputRef}
                          accept="image/*"
                          onChange={handleFounderFileChange}
                          className="hidden"
                        />
                      </label>

                      {displayFounderImg ? (
                        <div className="relative w-24 h-24 rounded-md overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs shrink-0">
                          <img
                            src={displayFounderImg}
                            alt="Founder Portrait"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1.5 left-1.5 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            Portrait
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveFounderImage}
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                            title="Remove photo"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No portrait uploaded. Click &ldquo;+&rdquo; to upload.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Showcase Banner */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 whitespace-nowrap">
                      Showcase Banner Photo (Optional)
                    </label>
                    <div className="flex items-center gap-3 py-1">
                      <label
                        title="Choose Showcase Banner"
                        className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          ref={bannerInputRef}
                          accept="image/*"
                          onChange={handleBannerFileChange}
                          className="hidden"
                        />
                      </label>

                      {displayBannerImg ? (
                        <div className="relative w-24 h-24 rounded-md overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs shrink-0">
                          <img
                            src={displayBannerImg}
                            alt="Showcase Banner"
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1.5 left-1.5 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            Banner
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveBannerImage}
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                            title="Remove banner"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No banner uploaded. Click &ldquo;+&rdquo; to upload.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* HEADLINE & CLOSING SIGNATURE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Main Editorial Headline <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.headline}
                      onChange={(e) => handleChange('headline', e.target.value)}
                      placeholder='e.g. “WE WORK AS ONE TO BE THE NUMBER ONE”'
                      className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Closing Brand Signature Tagline
                    </label>
                    <input
                      type="text"
                      value={formData.closingTagline}
                      onChange={(e) => handleChange('closingTagline', e.target.value)}
                      placeholder="Mhira Natural — Simple care. Natural beauty. Everyday you."
                      className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* OPENING PHILOSOPHY */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Opening Philosophy / Subtitle <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.intro}
                    onChange={(e) => handleChange('intro', e.target.value)}
                    placeholder="At Mhira Natural, we believe that taking care of yourself should feel simple, gentle, and natural."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white resize-none leading-relaxed transition-colors"
                  />
                </div>

                {/* FOUNDER NAME & ROLE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Founder Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.founderName}
                      onChange={(e) => handleChange('founderName', e.target.value)}
                      placeholder="Mirasol P. Bituin"
                      className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Founder Title / Role <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.founderRole}
                      onChange={(e) => handleChange('founderRole', e.target.value)}
                      placeholder="Founder"
                      className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                {/* FOUNDER BIO PARAGRAPHS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Founder Story (Paragraph 1) <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={formData.founderBio1}
                      onChange={(e) => handleChange('founderBio1', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white resize-none leading-relaxed transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      Founder Journey (Paragraph 2)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.founderBio2}
                      onChange={(e) => handleChange('founderBio2', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white resize-none leading-relaxed transition-colors"
                    />
                  </div>
                </div>

                {/* VISION & TAGLINE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 whitespace-nowrap">
                      Vision Statement <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.visionTitle}
                      onChange={(e) => handleChange('visionTitle', e.target.value)}
                      placeholder="Vision"
                      className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                    />
                    <textarea
                      rows={3}
                      required
                      value={formData.visionText}
                      onChange={(e) => handleChange('visionText', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white resize-none leading-relaxed transition-colors"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700 whitespace-nowrap">
                      Tagline Meaning &amp; Description <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.taglineTitle}
                      onChange={(e) => handleChange('taglineTitle', e.target.value)}
                      placeholder="Tagline"
                      className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                    />
                    <textarea
                      rows={3}
                      required
                      value={formData.taglineText}
                      onChange={(e) => handleChange('taglineText', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white resize-none leading-relaxed transition-colors"
                    />
                  </div>
                </div>

                {/* BRAND PILLARS */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Brand Pillars &amp; Values
                    </label>
                    <button
                      type="button"
                      onClick={handleAddPillar}
                      className="px-3 py-1 text-xs font-bold text-[#01390f] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Pillar</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {formData.pillars?.map((pillar, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            value={pillar.title}
                            onChange={(e) => handlePillarChange(index, 'title', e.target.value)}
                            placeholder="Pillar Title"
                            className="flex-1 h-[34px] bg-white border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePillar(index)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            title="Remove pillar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          required
                          value={pillar.description}
                          onChange={(e) =>
                            handlePillarChange(index, 'description', e.target.value)
                          }
                          placeholder="Pillar description..."
                          className="w-full bg-white border border-slate-200 text-slate-700 rounded-lg p-2.5 text-xs leading-relaxed focus:outline-none focus:border-[#01390f] resize-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* STATUS HELPER NOTICE */}
                <div className="pt-1 text-xs text-slate-500">
                  <span>
                    Changes will be live immediately across customer storefront once saved.
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 whitespace-nowrap bg-[#01390f] hover:bg-[#0a5219] text-white cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="whitespace-nowrap">
                    {saving ? 'Saving...' : 'Save Story Content'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingOurStoryManagement;
