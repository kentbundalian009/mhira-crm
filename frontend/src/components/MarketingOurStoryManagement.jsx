import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  User,
  UploadCloud,
  Trash2,
  Save,
  Sparkles,
  RefreshCcw,
  Eye,
  ExternalLink,
  Quote,
  Plus,
  Image as ImageIcon,
  FileText,
  HeartHandshake,
  Compass,
  Check,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Monitor,
  Smartphone,
  Layers,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ShieldCheck,
  X
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
  const [resetting, setResetting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'split' | 'preview'
  const [activeSectionTab, setActiveSectionTab] = useState('all'); // 'all' | 'hero' | 'founder' | 'vision' | 'pillars' | 'showcase'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [showResetModal, setShowResetModal] = useState(false);

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

    // Listen for live updates
    const unsubscribe = subscribeLiveSync((data) => {
      if (data?.type === 'story' || data?.type === 'marketing') {
        fetchStory();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handlePillarChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...(prev.pillars || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, pillars: updated };
    });
    setHasChanges(true);
  };

  const handleAddPillar = () => {
    setFormData((prev) => ({
      ...prev,
      pillars: [
        ...(prev.pillars || []),
        { title: 'New Brand Pillar', description: 'Describe your pillar philosophy and natural commitment here.' },
      ],
    }));
    setHasChanges(true);
    showSuccessToast('Added a new brand pillar. Fill in your details below.');
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
    setHasChanges(true);
    showSuccessToast('Brand pillar removed.');
  };

  const handleMovePillar = (index, direction) => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formData.pillars.length) return;

    setFormData((prev) => {
      const updated = [...prev.pillars];
      const item = updated[index];
      updated[index] = updated[targetIdx];
      updated[targetIdx] = item;
      return { ...prev, pillars: updated };
    });
    setHasChanges(true);
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
    setHasChanges(true);
  };

  const handleRemoveFounderImage = () => {
    setFounderFile(null);
    setFounderPreview(null);
    setFormData((prev) => ({ ...prev, founderImage: '' }));
    setHasChanges(true);
    if (founderInputRef.current) founderInputRef.current.value = '';
    showSuccessToast('Founder photo removed.');
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
    setHasChanges(true);
  };

  const handleRemoveBannerImage = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setFormData((prev) => ({ ...prev, bannerImage: '' }));
    setHasChanges(true);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
    showSuccessToast('Showcase banner removed.');
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

      // Append files or keep existing strings
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
        setHasChanges(false);

        try {
          localStorage.setItem('cached_marketing_story', JSON.stringify(savedStory));
        } catch (_e) {}

        showSuccessToast('Our Story page updated & published live to storefront!');
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

  // Reset to default
  const handleExecuteReset = async () => {
    setResetting(true);
    try {
      const res = await API.post('/api/story/reset');
      if (res.data?.success) {
        const resetData = { ...DEFAULT_STORY, ...res.data.story };
        setFormData(resetData);
        setFounderFile(null);
        setFounderPreview(null);
        setBannerFile(null);
        setBannerPreview(null);
        setHasChanges(false);
        setShowResetModal(false);

        try {
          localStorage.setItem('cached_marketing_story', JSON.stringify(resetData));
        } catch (_e) {}

        showSuccessToast('Our Story content restored to factory defaults!');
        notifyLiveSync('story');
        notifyLiveSync('marketing');
      }
    } catch (err) {
      console.error('Error resetting story:', err);
      showErrorToast('Failed to reset story: ' + (err.response?.data?.message || err.message));
    } finally {
      setResetting(false);
    }
  };

  // Resolve founder image preview
  const displayFounderImg = founderPreview || (formData.founderImage ? getImageUrl(formData.founderImage) : '');
  const displayBannerImg = bannerPreview || (formData.bannerImage ? getImageUrl(formData.bannerImage) : '');

  // Render Live Storefront Preview Section
  const renderPreview = () => (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col font-['Poppins',sans-serif]">
      {/* Mock Browser Top Bar */}
      <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-500 font-mono text-[11px] shadow-2xs">
            <span className="text-emerald-700 font-bold">https://</span>
            <span>mhiranatural.com/about</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1 rounded cursor-pointer transition-colors ${
                previewDevice === 'desktop' ? 'bg-white text-[#01390f] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1 rounded cursor-pointer transition-colors ${
                previewDevice === 'mobile' ? 'bg-white text-[#01390f] shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <a
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#01390f] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
          >
            <span>Live Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Simulated Storefront Container */}
      <div
        className={`bg-slate-50/50 p-4 sm:p-8 overflow-y-auto max-h-[750px] custom-scrollbar flex justify-center ${
          previewDevice === 'mobile' ? 'items-center' : ''
        }`}
      >
        <div
          className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8 text-gray-800 transition-all ${
            previewDevice === 'mobile' ? 'max-w-sm w-full mx-auto text-xs' : 'max-w-3xl w-full'
          }`}
        >
          {/* BANNER IF EXISTS */}
          {displayBannerImg && (
            <div className="w-full h-44 sm:h-64 rounded-2xl overflow-hidden border border-slate-100 shadow-2xs relative">
              <img src={displayBannerImg} alt="Brand Banner" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4 sm:p-6">
                <span className="text-white text-xs sm:text-sm font-semibold tracking-wide drop-shadow-sm">
                  Mhira Natural Soap and Cosmetics Manufacturing
                </span>
              </div>
            </div>
          )}

          {/* HEADLINE */}
          <div className="space-y-3">
            <h1 className="text-xl sm:text-3xl font-bold italic tracking-tight text-[#243746] leading-tight">
              {formData.headline || '“WE WORK AS ONE TO BE THE NUMBER ONE”'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
              {formData.intro || 'At Mhira Natural, we believe that taking care of yourself should feel simple, gentle, and natural.'}
            </p>
          </div>

          {/* FOUNDER SECTION */}
          <section className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-wide">
              Founder
            </h2>
            <div className={`flex items-start gap-6 pt-1 ${previewDevice === 'mobile' ? 'flex-col' : 'flex-col sm:flex-row'}`}>
              {/* Founder Picture */}
              <div className="shrink-0 mx-auto sm:mx-0">
                <div className="w-40 h-52 sm:w-48 sm:h-60 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 p-2 text-center relative shadow-2xs">
                  {displayFounderImg ? (
                    <img
                      src={displayFounderImg}
                      alt={formData.founderName || 'Founder'}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4">
                      <User className="w-12 h-12 text-slate-300 mb-2" />
                      <span className="text-xs font-semibold text-slate-500">{formData.founderName || 'Mirasol P. Bituin'}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{formData.founderRole || 'Founder'}</span>
                    </div>
                  )}
                </div>
                {displayFounderImg && (
                  <div className="mt-2 text-center">
                    <span className="text-xs font-semibold text-[#243746] block">{formData.founderName || 'Mirasol P. Bituin'}</span>
                    <span className="text-[11px] text-gray-500 font-medium">{formData.founderRole || 'Founder'}</span>
                  </div>
                )}
              </div>

              {/* Founder Text */}
              <div className="space-y-3 flex-1 text-xs sm:text-sm text-gray-600 leading-relaxed">
                <p className="whitespace-pre-line">{formData.founderBio1}</p>
                {formData.founderBio2 && <p className="whitespace-pre-line">{formData.founderBio2}</p>}
              </div>
            </div>
          </section>

          {/* VISION */}
          <section className="space-y-2 pt-4 border-t border-gray-100">
            <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-wide">
              {formData.visionTitle || 'Vision'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {formData.visionText}
            </p>
          </section>

          {/* TAGLINE */}
          <section className="space-y-2 pt-4 border-t border-gray-100">
            <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-wide">
              {formData.taglineTitle || 'Tagline'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {formData.taglineText}
            </p>
          </section>

          {/* BRAND PILLARS */}
          {formData.pillars && formData.pillars.length > 0 && (
            <section className="space-y-4 pt-4 border-t border-gray-100">
              {formData.pillars.map((pillar, idx) => (
                <div key={idx} className="space-y-1.5 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <h2 className="text-sm sm:text-base font-bold text-[#243746] tracking-wide flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    <span>{pillar.title}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </section>
          )}

          {/* CLOSING TAGLINE */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs sm:text-sm md:text-base italic font-semibold text-[#246C94]">
              {formData.closingTagline || 'Mhira Natural — Simple care. Natural beauty. Everyday you.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      
      {/* 1. TOP RIBBON / TOOLBAR CONTAINER */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-5 transition-colors duration-200">
        
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'hero', label: '1. Headline & Hero' },
              { id: 'founder', label: '2. Founder Spotlight' },
              { id: 'vision', label: '3. Vision & Tagline' },
              { id: 'pillars', label: `4. Brand Pillars (${formData.pillars?.length || 0})` },
              { id: 'showcase', label: '5. Banner & Signature' },
              { id: 'preview', label: 'Live Storefront Preview' },
            ].map((tab) => {
              const isActive =
                tab.id === 'preview'
                  ? viewMode === 'preview'
                  : viewMode !== 'preview' && activeSectionTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'preview') {
                      setViewMode('preview');
                    } else {
                      if (viewMode === 'preview') setViewMode('editor');
                      setActiveSectionTab(tab.id);
                    }
                  }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                    isActive
                      ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* RIGHT ACTION CONTROLS */}
          <div className="hidden sm:flex items-center gap-2 pb-1.5 shrink-0">
            {/* Split View Switcher */}
            {viewMode !== 'preview' && (
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'split' ? 'editor' : 'split')}
                className={`h-[28px] px-2.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-emerald-50 text-[#01390f] border-emerald-300 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="Toggle Split Screen (Editor & Live Preview side by side)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{viewMode === 'split' ? 'Split View Active' : 'Split View'}</span>
              </button>
            )}

            {/* Reset Defaults Button */}
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              disabled={resetting || saving}
              className="h-[28px] px-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Restore default editorial narrative"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-rose-500 ${resetting ? 'animate-spin' : ''}`} />
              <span>Reset Defaults</span>
            </button>

            {/* Save / Publish Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-[28px] px-3.5 text-xs font-bold text-white bg-[#01390f] hover:bg-[#01280a] rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Publishing...' : hasChanges ? 'Publish Changes *' : 'Published & Live'}</span>
            </button>
          </div>
        </div>

        {/* STATUS BAR NOTICE */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 border border-slate-200/80 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live on Storefront (/about)</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <HeartHandshake className="w-3.5 h-3.5 text-[#01390f]" />
              <span>{formData.pillars?.length || 4} Core Pillars</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <User className="w-3.5 h-3.5 text-[#01390f]" />
              <span>{displayFounderImg ? 'Founder Portrait Custom' : 'Default Portrait'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="text-xs text-rose-600 font-semibold"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="text-xs text-white bg-[#01390f] px-3 py-1 rounded-lg font-bold"
            >
              Save
            </button>
          </div>

          {hasChanges && (
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
              ● Unsaved Changes Pending
            </span>
          )}
        </div>
      </div>

      {/* 3. MAIN WORKSPACE GRID */}
      <div
        className={`grid gap-6 ${
          viewMode === 'split'
            ? 'grid-cols-1 lg:grid-cols-12 items-start'
            : 'grid-cols-1'
        }`}
      >
        {/* ===================== CMS EDITORIAL FORM ===================== */}
        {viewMode !== 'preview' && (
          <form
            onSubmit={handleSave}
            className={`space-y-6 ${viewMode === 'split' ? 'lg:col-span-6' : 'w-full'}`}
          >
            {/* CARD 1: MAIN EDITORIAL HEADLINE & INTRO */}
            {(activeSectionTab === 'all' || activeSectionTab === 'hero') && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#01390f] flex items-center justify-center border border-emerald-100">
                      <Quote className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">1. Editorial Headline & Introduction</h2>
                      <p className="text-[11px] text-slate-400">Opening narrative greeting visitors on /about</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Hero Section
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Main Editorial Headline *
                    </label>
                    <input
                      type="text"
                      value={formData.headline}
                      onChange={(e) => handleChange('headline', e.target.value)}
                      placeholder='e.g. “WE WORK AS ONE TO BE THE NUMBER ONE”'
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 italic focus:bg-white focus:outline-none focus:border-[#01390f]"
                      required
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Displayed as the primary bold brand motto at the top of the Our Story page.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Opening Philosophy / Subtitle *
                    </label>
                    <textarea
                      rows={3}
                      value={formData.intro}
                      onChange={(e) => handleChange('intro', e.target.value)}
                      placeholder="e.g. At Mhira Natural, we believe that taking care of yourself should feel simple, gentle, and natural."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 leading-relaxed focus:bg-white focus:outline-none focus:border-[#01390f] resize-none"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CARD 2: FOUNDER SPOTLIGHT & IMAGE UPLOAD */}
            {(activeSectionTab === 'all' || activeSectionTab === 'founder') && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#01390f] flex items-center justify-center border border-emerald-100">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">2. Founder Profile & Portrait Photo</h2>
                      <p className="text-[11px] text-slate-400">Founder background, entrepreneur story, and portrait</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Portrait Spotlight
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Photo Upload Box (Left Column) */}
                  <div className="md:col-span-4 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Portrait Photograph
                    </label>

                    <div className="w-full h-56 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#01390f] bg-slate-50/70 flex flex-col items-center justify-center relative overflow-hidden transition-all group">
                      {displayFounderImg ? (
                        <>
                          <img
                            src={displayFounderImg}
                            alt="Founder Portrait"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                            <button
                              type="button"
                              onClick={() => founderInputRef.current?.click()}
                              className="px-3 py-1.5 bg-white text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-[#01390f]" /> Change Photo
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveFounderImage}
                              className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div
                          onClick={() => founderInputRef.current?.click()}
                          className="flex flex-col items-center justify-center p-4 text-center cursor-pointer w-full h-full"
                        >
                          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#01390f] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-2xs">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-700">Upload Portrait</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, or WEBP (Max 15MB)</span>
                          <span className="mt-2 text-[10px] text-emerald-800 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                            Click to browse
                          </span>
                        </div>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={founderInputRef}
                      onChange={handleFounderFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {displayFounderImg && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <Check className="w-3.5 h-3.5" /> Photo configured
                        </span>
                        <button
                          type="button"
                          onClick={() => founderInputRef.current?.click()}
                          className="text-[#01390f] hover:underline font-bold cursor-pointer"
                        >
                          Replace
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Text Fields (Right Column) */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Founder Full Name *
                        </label>
                        <input
                          type="text"
                          value={formData.founderName}
                          onChange={(e) => handleChange('founderName', e.target.value)}
                          placeholder="e.g. Mirasol P. Bituin"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#01390f]"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Title / Role *
                        </label>
                        <input
                          type="text"
                          value={formData.founderRole}
                          onChange={(e) => handleChange('founderRole', e.target.value)}
                          placeholder="e.g. Founder"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-[#01390f]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Founder Story & Brand Inception (Paragraph 1) *
                      </label>
                      <textarea
                        rows={3}
                        value={formData.founderBio1}
                        onChange={(e) => handleChange('founderBio1', e.target.value)}
                        placeholder="e.g. The Mhira Natural Soap and Cosmetics Manufacturing was founded by Mirasol P. Bituin in 2018..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed focus:bg-white focus:outline-none focus:border-[#01390f] resize-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Founder Journey & Inspiration (Paragraph 2)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.founderBio2}
                        onChange={(e) => handleChange('founderBio2', e.target.value)}
                        placeholder="e.g. Mhira’s journey began when she struggled to find skincare products..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed focus:bg-white focus:outline-none focus:border-[#01390f] resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 3: VISION & TAGLINE */}
            {(activeSectionTab === 'all' || activeSectionTab === 'vision') && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#01390f] flex items-center justify-center border border-emerald-100">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">3. Brand Vision & Tagline</h2>
                      <p className="text-[11px] text-slate-400">Core company aspiration and unity motto</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Corporate Identity
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Vision Box */}
                  <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Vision Heading
                      </label>
                      <input
                        type="text"
                        value={formData.visionTitle}
                        onChange={(e) => handleChange('visionTitle', e.target.value)}
                        placeholder="Vision"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#01390f]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Vision Narrative *
                      </label>
                      <textarea
                        rows={4}
                        value={formData.visionText}
                        onChange={(e) => handleChange('visionText', e.target.value)}
                        placeholder="Describe your vision for Mhira Natural..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed focus:outline-none focus:border-[#01390f] resize-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Tagline Box */}
                  <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Tagline Heading
                      </label>
                      <input
                        type="text"
                        value={formData.taglineTitle}
                        onChange={(e) => handleChange('taglineTitle', e.target.value)}
                        placeholder="Tagline"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#01390f]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Tagline Meaning & Description *
                      </label>
                      <textarea
                        rows={4}
                        value={formData.taglineText}
                        onChange={(e) => handleChange('taglineText', e.target.value)}
                        placeholder='e.g. "We work as one to be the number one!" expresses unity...'
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed focus:outline-none focus:border-[#01390f] resize-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CARD 4: CORE BRAND PILLARS */}
            {(activeSectionTab === 'all' || activeSectionTab === 'pillars') && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#01390f] flex items-center justify-center border border-emerald-100">
                      <HeartHandshake className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">4. Brand Pillars & Values</h2>
                      <p className="text-[11px] text-slate-400">
                        Formulation commitments, botanical promises, and daily care ethics
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPillar}
                    className="px-3 py-1.5 text-xs font-bold text-[#01390f] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Pillar</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.pillars?.map((pillar, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all space-y-3 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#01390f] uppercase tracking-wider bg-emerald-100/80 px-2.5 py-0.5 rounded-md border border-emerald-200">
                            Pillar #{index + 1}
                          </span>
                        </div>

                        {/* Reorder and Delete Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMovePillar(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePillar(index, 'down')}
                            disabled={index === formData.pillars.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePillar(index)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                            title="Remove this pillar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={pillar.title}
                          onChange={(e) => handlePillarChange(index, 'title', e.target.value)}
                          placeholder="Pillar Title (e.g. Natural care, made for everyday)"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-[#01390f]"
                          required
                        />
                        <textarea
                          rows={2}
                          value={pillar.description}
                          onChange={(e) => handlePillarChange(index, 'description', e.target.value)}
                          placeholder="Detailed pillar narrative or promise..."
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed focus:outline-none focus:border-[#01390f] resize-none"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CARD 5: OPTIONAL BRAND BANNER & SIGNATURE */}
            {(activeSectionTab === 'all' || activeSectionTab === 'showcase') && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#01390f] flex items-center justify-center border border-emerald-100">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">5. Story Showcase Banner & Signature</h2>
                      <p className="text-[11px] text-slate-400">Optional hero banner photograph and footer closing motto</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Visual Showcase
                  </span>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Showcase / Lifestyle Hero Banner (Optional)
                  </label>
                  <div className="w-full h-44 sm:h-52 rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#01390f] bg-slate-50/70 flex flex-col items-center justify-center relative overflow-hidden transition-all group">
                    {displayBannerImg ? (
                      <>
                        <img src={displayBannerImg} alt="Brand Banner" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => bannerInputRef.current?.click()}
                            className="px-3.5 py-1.5 bg-white text-slate-800 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-[#01390f]" /> Change Banner
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveBannerImage}
                            className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      </>
                    ) : (
                      <div
                        onClick={() => bannerInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-4 text-center cursor-pointer w-full h-full"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#01390f] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-2xs">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Upload Showcase / Hero Banner</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">High-resolution landscape image (Max 20MB)</span>
                        <span className="mt-2 text-[10px] text-emerald-800 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          Click to browse
                        </span>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={handleBannerFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Closing Tagline */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Closing Brand Signature Tagline
                  </label>
                  <input
                    type="text"
                    value={formData.closingTagline}
                    onChange={(e) => handleChange('closingTagline', e.target.value)}
                    placeholder="e.g. Mhira Natural — Simple care. Natural beauty. Everyday you."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#246C94] italic focus:bg-white focus:outline-none focus:border-[#01390f]"
                  />
                </div>
              </div>
            )}

            {/* STICKY BOTTOM SAVE BAR */}
            <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-lg flex items-center justify-between z-10 transition-all">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    hasChanges ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                  }`}
                />
                <span className="text-xs font-bold text-slate-700">
                  {hasChanges ? 'You have unsaved editorial changes' : 'All changes saved & live on storefront'}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  disabled={resetting || saving}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap disabled:opacity-50"
                >
                  Discard / Reset
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ===================== LIVE STOREFRONT PREVIEW ===================== */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={viewMode === 'split' ? 'lg:col-span-6 sticky top-4' : 'max-w-4xl mx-auto w-full'}>
            {renderPreview()}
          </div>
        )}
      </div>

      {/* RESTORE FACTORY DEFAULTS CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Restore Factory Defaults?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  This will reset the headline, opening philosophy, founder background, vision statement, tagline, and original 4 brand pillars back to Mhira Natural's standard editorial defaults.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={resetting}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                <span>{resetting ? 'Restoring...' : 'Yes, Restore Defaults'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingOurStoryManagement;
