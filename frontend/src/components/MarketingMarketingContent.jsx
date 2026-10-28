import React, { useState, useEffect, useMemo } from 'react';
import {
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Save,
  CheckCircle2,
  Video,
  Loader2,
  Edit2,
  X,
  Eye,
  Megaphone,
  GripVertical,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import { notifyLiveSync, useLiveSync } from '../utils/liveSync';
import { API, API_BASE_URL, getBackendMediaUrl, getImageUrl } from '../axios';

// Helper to check if URL is a video
const isVideoFile = (url = '') => {
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(url) || url.startsWith('data:video');
};

// Helper to resolve media URLs with local/cloud backend fallback
const resolveMediaSrc = (url = '') => {
  if (!url || typeof url !== 'string') return '/mhira_removebg.png';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return getBackendMediaUrl(url);
};

function MarketingMarketingContent() {
  const [sections, setSections] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_marketing_sections');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('All');

  // Drag & Drop Reordering State
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [activeSectionName, setActiveSectionName] = useState('carousel');
  const [appendMode, setAppendMode] = useState(true);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const [existingImages, setExistingImages] = useState([]);
  const [existingSlideDetails, setExistingSlideDetails] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const [newSlideDetails, setNewSlideDetails] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Check if placement is single-media only (ads-i, ads-ii, ads-iii, ads-iv, etc. bawal multiple)
  const isSingleMediaSection = (secName) => secName !== 'carousel';

  // Fetch all sections from backend
  const fetchSections = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/sections');
      const data = res.data;
      const rawList = Array.isArray(data)
        ? data
        : data?.sections || data?.items || data?.data || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        setSections(rawList);
        try {
          localStorage.setItem('cached_marketing_sections', JSON.stringify(rawList));
        } catch (e) { }
      }
    } catch (err) {
      console.error('Error fetching section data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset section sequence to default store order (Hero Carousel Slider first)
  const handleResetOrder = async () => {
    const defaultOrder = ['carousel', 'ads-i', 'ads-ii', 'popup-ad', 'auth-banner', 'topbar-announcement'];
    try {
      await API.post('/api/sections/reorder', { orderedSectionNames: defaultOrder });
      showSuccessToast('Layout order restored: Hero Carousel Slider is now at the top!');
      notifyLiveSync('sections');
      fetchSections();
    } catch (err) {
      console.error('Reset order error:', err);
      showErrorToast(err.response?.data?.message || 'Failed to reset layout order.');
    }
  };

  // Real-time automatic synchronization without refresh
  useLiveSync(['sections', 'marketing'], () => {
    fetchSections();
  });

  useEffect(() => {
    fetchSections();
  }, []);

  // Drag & Drop Handlers for Section Reordering
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...filteredSections];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save reordered array to backend
    const orderedNames = reordered.map((s) => s.sectionName);
    try {
      await API.post('/api/sections/reorder', { orderedSectionNames: orderedNames });
      showSuccessToast('Campaign layout order updated & live on storefront!');
      notifyLiveSync('sections');
      fetchSections();
    } catch (err) {
      console.error('Reorder error:', err);
      showErrorToast(err.response?.data?.message || 'Failed to save layout order.');
    }
  };

  // OPEN MODAL IN "ADD NEW POSTER" MODE
  const openAddModal = () => {
    setModalMode('add');
    setActiveSectionName('carousel');
    setTitle('');
    setText('');

    const targetSection = sections.find((sec) => sec.sectionName === 'carousel');
    const validImgs = targetSection
      ? (targetSection.images || []).filter((img) => img && img !== 'banner')
      : [];
    setExistingImages(validImgs);

    const slideDetailsMap = targetSection?.slideDetails || [];
    const initialExistingDetails = validImgs.map((img, idx) => {
      const found = slideDetailsMap.find((s) => s.image === img) || slideDetailsMap[idx];
      return {
        image: img,
        title: found?.title || '',
        text: found?.text || '',
      };
    });
    setExistingSlideDetails(initialExistingDetails);

    setNewFiles([]);
    setNewPreviews([]);
    setNewSlideDetails([]);
    setAppendMode(true);
    setIsModalOpen(true);
  };

  // OPEN MODAL IN "EDIT SECTION" MODE
  const openEditModal = (sectionName) => {
    setModalMode('edit');
    setActiveSectionName(sectionName);
    const targetSection = sections.find((sec) => sec.sectionName === sectionName);

    if (targetSection) {
      setTitle(targetSection.title || '');
      setText(targetSection.text || '');
      const validImgs = (targetSection.images || []).filter((img) => img && img !== 'banner');
      const filteredImgs = isSingleMediaSection(sectionName) ? validImgs.slice(0, 1) : validImgs;
      setExistingImages(filteredImgs);

      const slideDetailsMap = targetSection.slideDetails || [];
      const initialExistingDetails = filteredImgs.map((img, idx) => {
        const found = slideDetailsMap.find((s) => s.image === img) || slideDetailsMap[idx];
        return {
          image: img,
          title: found?.title || '',
          text: found?.text || '',
        };
      });
      setExistingSlideDetails(initialExistingDetails);
    } else {
      setTitle('');
      setText('');
      setExistingImages([]);
      setExistingSlideDetails([]);
    }

    setNewFiles([]);
    setNewPreviews([]);
    setNewSlideDetails([]);
    setAppendMode(true);
    setIsModalOpen(true);
  };

  const handleSectionSelectChange = (newSecName) => {
    setActiveSectionName(newSecName);
    const targetSection = sections.find((sec) => sec.sectionName === newSecName);
    const validImgs = targetSection
      ? (targetSection.images || []).filter((img) => img && img !== 'banner')
      : [];

    if (isSingleMediaSection(newSecName)) {
      setExistingImages(validImgs.slice(0, 1));
      setNewFiles((prev) => prev.slice(0, 1));
      setNewPreviews((prev) => prev.slice(0, 1));
      setNewSlideDetails((prev) => prev.slice(0, 1));
      setExistingSlideDetails([]);
    } else {
      setExistingImages(validImgs);
      const slideDetailsMap = targetSection?.slideDetails || [];
      const initialExistingDetails = validImgs.map((img, idx) => {
        const found = slideDetailsMap.find((s) => s.image === img) || slideDetailsMap[idx];
        return {
          image: img,
          title: found?.title || '',
          text: found?.text || '',
        };
      });
      setExistingSlideDetails(initialExistingDetails);
    }

    if (modalMode === 'edit') {
      setTitle(targetSection?.title || '');
      setText(targetSection?.text || '');
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (isSingleMediaSection(activeSectionName)) {
      const singleFile = selectedFiles[0];
      setNewFiles([singleFile]);
      setNewPreviews([URL.createObjectURL(singleFile)]);
      setNewSlideDetails([{ title: '', text: '' }]);
      setExistingImages([]);
      setExistingSlideDetails([]);
    } else {
      setNewFiles((prev) => [...prev, ...selectedFiles]);
      const previews = selectedFiles.map((file) => URL.createObjectURL(file));
      setNewPreviews((prev) => [...prev, ...previews]);
      setNewSlideDetails((prev) => [
        ...prev,
        ...selectedFiles.map(() => ({ title: '', text: '' })),
      ]);
    }
  };

  const handleRemoveNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
    setNewSlideDetails((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove existing media item inside the modal before saving
  const handleRemoveExistingImage = (index) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
    setExistingSlideDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExistingSlideDetailChange = (index, field, value) => {
    setExistingSlideDetails((prev) => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { image: existingImages[index] || '', title: '', text: '' };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleNewSlideDetailChange = (index, field, value) => {
    setNewSlideDetails((prev) => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { title: '', text: '' };
      }
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Remove existing media item from active section directly on page
  const handleRemoveExistingMedia = async (sectionName, imgPath) => {
    const target = sections.find((s) => s.sectionName === sectionName);
    if (!target) return;

    const updatedImages = (target.images || []).filter((img) => img !== imgPath);
    const updatedSlideDetails = (target.slideDetails || []).filter((s) => s.image !== imgPath);

    const formData = new FormData();
    formData.append('title', target.title || '');
    formData.append('text', target.text || '');
    updatedImages.forEach((img) => formData.append('existingImages', img));
    if (sectionName === 'carousel') {
      formData.append('slideDetails', JSON.stringify(updatedSlideDetails));
    }

    try {
      await API.put(`/api/sections/${sectionName}`, formData);
      showSuccessToast('Media asset removed successfully!');
      notifyLiveSync('sections');
      fetchSections();
    } catch (err) {
      console.error('Error removing media:', err);
      showErrorToast(err.response?.data?.message || 'Failed to update media.');
    }
  };

  const handleDeleteImage = handleRemoveExistingMedia;

  // Delete entire section media / banner, headline, and subtext (Wipes completely)
  const handleDeleteEntireSection = async (sectionName, sectionDisplayName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete and reset "${sectionDisplayName || sectionName.toUpperCase()}"?\n\nThis will clear its media, headline, and subtitle, and hide the banner container from the Storefront.`
    );
    if (!confirmDelete) return;

    // Optimistically clear in local state
    setSections((prev) =>
      prev.map((s) =>
        s.sectionName === sectionName ? { ...s, title: '', text: '', images: [] } : s
      )
    );

    try {
      await API.delete(`/api/sections/${sectionName}`);
      showSuccessToast(`Cleared '${sectionDisplayName || sectionName}'! Banner container is now hidden from the storefront.`);
      notifyLiveSync('sections');
      fetchSections();
    } catch (err) {
      console.error('Error deleting section media:', err);
      showErrorToast(err.response?.data?.message || 'Failed to remove advertisement banner.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (modalMode === 'add' && newFiles.length === 0 && existingImages.length === 0) {
      showErrorToast('Please select at least one image or video poster to upload.');
      return;
    }

    setSubmitting(true);

    const targetSection = sections.find((s) => s.sectionName === activeSectionName);
    const finalTitle = activeSectionName === 'carousel'
      ? (existingSlideDetails[0]?.title || newSlideDetails[0]?.title || '')
      : (title.trim() !== '' ? title : targetSection?.title || '');
    const finalText = activeSectionName === 'carousel'
      ? (existingSlideDetails[0]?.text || newSlideDetails[0]?.text || '')
      : (text.trim() !== '' ? text : targetSection?.text || '');

    const formData = new FormData();
    formData.append('title', finalTitle);
    formData.append('text', finalText);

    if (isSingleMediaSection(activeSectionName)) {
      // Enforce strictly 1 media item for promo ads
      if (newFiles.length > 0) {
        formData.append('images', newFiles[0]);
      } else if (existingImages.length > 0) {
        formData.append('existingImages', existingImages[0]);
      }
    } else {
      if (appendMode) {
        existingImages.forEach((img) => {
          formData.append('existingImages', img);
        });
      }
      newFiles.forEach((file) => {
        formData.append('images', file);
      });

      if (activeSectionName === 'carousel') {
        formData.append('slideDetails', JSON.stringify(existingSlideDetails));
        formData.append('newSlideDetails', JSON.stringify(newSlideDetails));
      }
    }

    try {
      const res = await API.put(`/api/sections/${activeSectionName}`, formData);

      showSuccessToast(
        modalMode === 'add'
          ? `New poster added to '${activeSectionName.toUpperCase()}'!`
          : `Updated section '${activeSectionName.toUpperCase()}'!`
      );
      setIsModalOpen(false);
      notifyLiveSync('sections');
      fetchSections();
    } catch (err) {
      console.error('Submission error:', err);
      showErrorToast(err.response?.data?.message || 'Error uploading poster or updating section.');
    } finally {
      setSubmitting(false);
    }
  };

  // Section metadata mapping
  const sectionMeta = {
    carousel: {
      name: 'Hero Carousel Slider',
      badge: 'Main Banner',
      color: 'bg-emerald-50 text-[#01390f] border-emerald-200',
    },
    'ads-i': {
      name: 'Primary Promotion (Ads I)',
      badge: 'Special Offer',
      color: 'bg-emerald-50 text-[#01390f] border-emerald-200',
    },
    'ads-ii': {
      name: 'Secondary Campaign (Ads II)',
      badge: 'Brand Deals',
      color: 'bg-emerald-50 text-[#01390f] border-emerald-200',
    },
    'popup-ad': {
      name: 'Pop-Up Modal Banner',
      badge: 'Special Offer',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    'auth-banner': {
      name: 'Auth Page Banner (Login / Signup / Forgot Pass)',
      badge: 'Auth Showcase',
      color: 'bg-blue-50 text-[#246C94] border-blue-200',
    },
    'topbar-announcement': {
      name: 'Topbar Marquee Announcement Ticker',
      badge: 'Storefront Header',
      color: 'bg-emerald-50 text-[#01390f] border-emerald-200',
    },
  };

  const definedSections = ['carousel', 'ads-i', 'ads-ii', 'popup-ad', 'auth-banner', 'topbar-announcement'];

  const normalizedSections = useMemo(() => {
    const backendNames = sections.map((s) => s.sectionName).filter(Boolean);
    const combinedNames = Array.from(new Set([...backendNames, ...definedSections]))
      .filter((secName) => secName !== 'navbar-promo');

    return combinedNames.map((secName) => {
      const existing = sections.find((s) => s.sectionName === secName);
      const validImages = existing
        ? (existing.images || []).filter((img) => img && img !== 'banner')
        : [];
      return {
        sectionName: secName,
        title: existing?.title || '',
        text: existing?.text || '',
        slideDetails: existing?.slideDetails || [],
        images: isSingleMediaSection(secName) ? validImages.slice(0, 1) : validImages,
        meta: sectionMeta[secName] || {
          name: secName.toUpperCase(),
          badge: 'Campaign',
          color: 'bg-slate-100 text-slate-700 border-slate-200',
        },
      };
    });
  }, [sections]);

  const filteredSections = useMemo(() => {
    return normalizedSections.filter((sec) => {
      if (selectedSectionFilter !== 'All' && sec.sectionName !== selectedSectionFilter) {
        return false;
      }
      return true;
    });
  }, [normalizedSections, selectedSectionFilter]);

  // Summary KPIs
  const totalPlacementsCount = normalizedSections.length;
  const totalMediaCount = useMemo(() => {
    return normalizedSections.reduce((acc, s) => acc + (s.images?.length || 0), 0);
  }, [normalizedSections]);
  const heroSlidesCount = useMemo(() => {
    const hero = sections.find((s) => s.sectionName === 'carousel');
    return (hero?.images || []).filter((i) => i && i !== 'banner').length;
  }, [sections]);
  const popupHasMedia = useMemo(() => {
    const pop = sections.find((s) => s.sectionName === 'popup-ad');
    return (pop?.images || []).filter((i) => i && i !== 'banner').length > 0;
  }, [sections]);

  // Excel Sheet Tab Modules
  const placementTabs = [
    { id: 'All', label: 'All Placements' },
    { id: 'carousel', label: 'Hero Slider' },
    { id: 'ads-i', label: 'Primary (Ads I)' },
    { id: 'ads-ii', label: 'Secondary (Ads II)' },
    { id: 'popup-ad', label: 'Pop-Up Banner' },
    { id: 'auth-banner', label: 'Auth Banner' },
    { id: 'topbar-announcement', label: 'Topbar Announcement' },
  ];

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">

      {/* MAIN CONTAINER (MATCHES ALL PRODUCTS CATALOG LAYOUT & BRAND COLOR SCHEME) */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">

        {/* EXCEL SHEET TABS & ACTION BUTTONS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white px-1 pt-1 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {placementTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedSectionFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap inline-flex items-center ${
                  selectedSectionFilter === tab.id
                    ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* DRAG AND DROP INSTRUCTION NOTICE (ONLY ON ALL PLACEMENTS TAB) */}
        {selectedSectionFilter === 'All' && (
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-[#01390f] shadow-2xs">
            <div className="flex items-center gap-2.5 font-medium">
              <GripVertical className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Drag & Drop Ad Reordering:</strong> Drag any section using the grab handle to reposition its order. Changes instantly sync live to the storefront!
              </span>
            </div>
          </div>
        )}

        {/* 3. CAMPAIGN SECTIONS LIST */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="text-center py-16 text-[#01390f] font-medium italic flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading campaign marketing media...</span>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-medium italic">
              No campaign advertisements found matching your criteria.
            </div>
          ) : (
            filteredSections.map((sec, idx) => {
              const hasContent =
                sec.images.length > 0 ||
                (sec.title && sec.title.trim() !== '') ||
                (sec.text && sec.text.trim() !== '');

              return (
                <div
                  key={sec.sectionName}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`bg-white rounded-2xl border ${
                    dragOverIndex === idx
                      ? 'border-[#01390f] ring-2 ring-emerald-500/20 bg-emerald-50/10'
                      : 'border-slate-200/80'
                  } ${draggedIndex === idx ? 'opacity-40 scale-[0.99]' : 'opacity-100'} p-5 shadow-xs flex flex-col gap-4 hover:border-slate-300 transition-all duration-150 relative group`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                        title="Drag to reorder section placement on homepage"
                      >
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{sec.meta.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sec.meta.color}`}>
                        {sec.meta.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {sec.sectionName !== 'topbar-announcement' && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {sec.images.length} {isSingleMediaSection(sec.sectionName) ? 'Media Item' : 'Media Items'}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(sec.sectionName)}
                        className="px-5 py-2 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Manage Content</span>
                      </button>
                    </div>
                  </div>

                  {sec.sectionName === 'topbar-announcement' ? (
                    <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Scrolling Message</span>
                      <p className="text-xs text-slate-800 leading-relaxed font-semibold">
                        {sec.text || sec.title || 'Announcement: Current pricing and offers end 8/11/2026 at 11:59 PM ET / 8:59 PM PT — Grab your organic favorites now! 🌿'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Section Titles & Details */}
                      {sec.sectionName !== 'auth-banner' && (sec.title || sec.text) && (
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 flex flex-col gap-1">
                          {sec.title && <span className="font-bold text-xs text-slate-800">{sec.title}</span>}
                          {sec.text && <span className="text-xs text-slate-600 leading-relaxed font-medium">{sec.text}</span>}
                        </div>
                      )}

                      {/* Images / Videos Grid */}
                      {sec.images.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {sec.images.map((img, i) => {
                            const slideDetail = (sec.slideDetails || []).find((s) => s.image === img) || (sec.slideDetails || [])[i];
                            const hasCustomText = slideDetail && (slideDetail.title || slideDetail.text);

                            return (
                              <div key={i} className="flex flex-col gap-1.5">
                                <div className="group/img relative aspect-video rounded-xl overflow-hidden bg-slate-100 shadow-2xs border border-slate-200/60">
                                  {isVideoFile(img) ? (
                                    <video
                                      src={resolveMediaSrc(img)}
                                      className="w-full h-full object-cover"
                                      muted
                                      playsInline
                                      onError={(e) => {
                                        if (!e.currentTarget.dataset.retried) {
                                          e.currentTarget.dataset.retried = 'true';
                                          e.currentTarget.src = getImageUrl(img);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src={resolveMediaSrc(img)}
                                      alt={`${sec.meta.name} ${i + 1}`}
                                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                      onError={(e) => {
                                        if (!e.currentTarget.dataset.retried) {
                                          e.currentTarget.dataset.retried = 'true';
                                          e.currentTarget.src = getImageUrl(img);
                                        }
                                      }}
                                    />
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end justify-between p-2">
                                    <span className="text-[10px] text-white font-mono font-medium">
                                      #{i + 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteImage(sec.sectionName, img)}
                                      className="p-1 rounded bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                                      title="Delete media"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {sec.sectionName === 'carousel' && hasCustomText && (
                                  <div className="px-1 text-[11px] leading-tight">
                                    {slideDetail.title && <p className="font-bold text-slate-800 truncate" title={slideDetail.title}>{slideDetail.title}</p>}
                                    {slideDetail.text && <p className="text-[10px] text-slate-500 truncate mt-0.5" title={slideDetail.text}>{slideDetail.text}</p>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-400 italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-1">
                          <span>No active media uploaded yet for this campaign placement.</span>
                          <button
                            type="button"
                            onClick={() => openEditModal(sec.sectionName)}
                            className="text-xs font-bold text-[#01390f] hover:underline mt-1 cursor-pointer"
                          >
                            + Upload Banner Creative
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className={`bg-white rounded-3xl shadow-2xl w-full ${activeSectionName === 'carousel' ? 'max-w-3xl' : 'max-w-2xl'} overflow-hidden flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200`}>
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {modalMode === 'add'
                    ? 'Add New Campaign Media Poster'
                    : `Edit Placement: ${activeSectionName === 'topbar-announcement'
                      ? 'TOPBAR ANNOUNCEMENT'
                      : activeSectionName === 'popup-ad'
                        ? 'POP-UP AD BANNER'
                        : activeSectionName.toUpperCase()
                    }`}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeSectionName === 'topbar-announcement'
                    ? 'Topbar announcement text ticker (scrolling marquee banner)'
                    : isSingleMediaSection(activeSectionName)
                      ? 'Single banner placement (1 media item only — replaces previous poster)'
                      : 'Hero carousel banner placement (Supports multiple slides with individual titles & subtext)'}
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

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Target Storefront Placement *
                </label>
                <select
                  value={activeSectionName}
                  onChange={(e) => handleSectionSelectChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white"
                >
                  <option value="carousel">Hero Carousel Slider (Main Banner - Multi-slide)</option>
                  <option value="ads-i">Primary Promotion (Ads I - Single Image)</option>
                  <option value="ads-ii">Secondary Campaign (Ads II - Single Image)</option>
                  <option value="popup-ad">Pop-Up Modal Banner (Homepage Pop-up)</option>
                  <option value="auth-banner">Auth Page Banner (Login / Signup / Forgot Pass - Split Left)</option>
                  <option value="topbar-announcement">Topbar Announcement (Marquee Ticker)</option>
                </select>
              </div>

              {activeSectionName === 'auth-banner' ? (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-[#246C94] font-medium flex items-center gap-2 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-[#246C94] shrink-0" />
                  <span>Upload 1 image to display as the full-screen side banner on Login, Signup, and Forgot Password pages.</span>
                </div>
              ) : activeSectionName === 'topbar-announcement' || activeSectionName === 'popup-ad' ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {activeSectionName === 'popup-ad'
                      ? 'Pop-up Promo Caption / Subtext (Optional)'
                      : 'Topbar Scrolling Ticker Text'}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      activeSectionName === 'popup-ad'
                        ? 'e.g., Discover our latest organic handcrafted skin care collections & special promotional discounts today!'
                        : 'e.g., Announcement: Current pricing and offers end 8/11/2026 at 11:59 PM ET / 8:59 PM PT — Grab your organic favorites now! 🌿'
                    }
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white resize-none leading-relaxed"
                  />
                </div>
              ) : activeSectionName === 'carousel' ? null : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Headline Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Pure Botanical Care Your Skin Truly Deserves."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Subtext / Promo Caption (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Discover the transformative power of nature..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#01390f] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* UPLOAD MEDIA (FOR ALL CAMPAIGN SECTIONS INCLUDING TOPBAR ANNOUNCEMENT) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    {isSingleMediaSection(activeSectionName) ? 'Select Poster / Icon (1 Media Item Only)' : 'Select Media Files (Images / Videos)'}
                  </label>
                  {isSingleMediaSection(activeSectionName) && (
                    <span className="text-[10px] font-bold text-[#01390f] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      1 Media Item Allowed
                    </span>
                  )}
                </div>
                <label className="border-2 border-dashed border-slate-200 hover:border-[#01390f] rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-emerald-50/30">
                  <UploadCloud className="w-8 h-8 text-[#01390f] mb-1.5" />
                  <span className="text-xs font-bold text-slate-700">
                    {isSingleMediaSection(activeSectionName)
                      ? 'Click to choose 1 poster/icon (Single Image/Video)'
                      : 'Click to upload poster images or videos'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {isSingleMediaSection(activeSectionName)
                      ? 'Supports PNG, JPG, WEBP, MP4 (Replaces existing image)'
                      : 'Supports PNG, JPG, WEBP, MP4 (Max 10MB each)'}
                  </span>
                  <input
                    type="file"
                    multiple={!isSingleMediaSection(activeSectionName)}
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* NEW PREVIEWS */}
              {newPreviews.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#01390f] uppercase tracking-wider block">
                    New Poster to Upload ({newPreviews.length})
                  </span>
                  {activeSectionName === 'carousel' ? (
                    <div className="space-y-3">
                      {newPreviews.map((prev, idx) => {
                        const detail = newSlideDetails[idx] || { title: '', text: '' };
                        const isVid = isVideoFile(newFiles[idx]?.name || '');
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl relative shadow-2xs">
                            <div className="w-full sm:w-44 aspect-video rounded-lg overflow-hidden shrink-0 border border-emerald-300 relative bg-slate-900">
                              {isVid ? (
                                <video src={prev} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={prev} alt="New Preview" className="w-full h-full object-cover" />
                              )}
                              <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                                New #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveNewFile(idx)}
                                className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
                                title="Remove file"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
                              <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                  Slide #{existingImages.length + idx + 1} Headline Title (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., Pure Botanical Care Your Skin Truly Deserves"
                                  value={detail.title || ''}
                                  onChange={(e) => handleNewSlideDetailChange(idx, 'title', e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-[#01390f] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                  Slide #{existingImages.length + idx + 1} Subtext / Promo Caption (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., Discover the transformative power of nature..."
                                  value={detail.text || ''}
                                  onChange={(e) => handleNewSlideDetailChange(idx, 'text', e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-[#01390f] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {newPreviews.map((prev, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-emerald-300 shadow-2xs">
                          <img src={prev} alt="New Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewFile(idx)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* EXISTING IMAGES */}
              {existingImages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Currently Active Media ({existingImages.length})
                  </span>
                  {activeSectionName === 'carousel' ? (
                    <div className="space-y-3">
                      {existingImages.map((imgUrl, idx) => {
                        const detail = existingSlideDetails[idx] || { title: '', text: '' };
                        const isVid = isVideoFile(imgUrl);
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-50/80 border border-slate-200 rounded-xl relative shadow-2xs">
                            <div className="w-full sm:w-44 aspect-video rounded-lg overflow-hidden shrink-0 border border-slate-200 relative bg-slate-900">
                              {isVid ? (
                                <video
                                  src={resolveMediaSrc(imgUrl)}
                                  className="w-full h-full object-cover"
                                  muted
                                  loop
                                  playsInline
                                  onError={(e) => {
                                    if (!e.currentTarget.dataset.retried) {
                                      e.currentTarget.dataset.retried = 'true';
                                      e.currentTarget.src = getImageUrl(imgUrl);
                                    }
                                  }}
                                />
                              ) : (
                                <img
                                  src={resolveMediaSrc(imgUrl)}
                                  alt={`Slide ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    if (!e.currentTarget.dataset.retried) {
                                      e.currentTarget.dataset.retried = 'true';
                                      e.currentTarget.src = getImageUrl(imgUrl);
                                    }
                                  }}
                                />
                              )}
                              <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-xs">
                                Slide #{idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveExistingImage(idx)}
                                className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors cursor-pointer shadow-sm"
                                title="Remove from placement"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex-1 flex flex-col justify-center gap-2 min-w-0">
                              <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                  Slide #{idx + 1} Headline Title (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., Pure Botanical Care Your Skin Truly Deserves"
                                  value={detail.title || ''}
                                  onChange={(e) => handleExistingSlideDetailChange(idx, 'title', e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-[#01390f] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                  Slide #{idx + 1} Subtext / Promo Caption (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., Discover the transformative power of nature..."
                                  value={detail.text || ''}
                                  onChange={(e) => handleExistingSlideDetailChange(idx, 'text', e.target.value)}
                                  className="w-full bg-white border border-slate-200 focus:border-[#01390f] rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {existingImages.map((imgUrl, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                          {isVideoFile(imgUrl) ? (
                            <video
                              src={resolveMediaSrc(imgUrl)}
                              className="w-full h-full object-cover"
                              muted
                              loop
                              playsInline
                              onError={(e) => {
                                if (!e.currentTarget.dataset.retried) {
                                  e.currentTarget.dataset.retried = 'true';
                                  e.currentTarget.src = getImageUrl(imgUrl);
                                }
                              }}
                            />
                          ) : (
                            <img
                              src={resolveMediaSrc(imgUrl)}
                              alt="Existing Asset"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                if (!e.currentTarget.dataset.retried) {
                                  e.currentTarget.dataset.retried = 'true';
                                  e.currentTarget.src = getImageUrl(imgUrl);
                                }
                              }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors cursor-pointer"
                            title="Remove from placement"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0 -mx-6 -mb-6 mt-4 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="whitespace-nowrap">{submitting ? 'Saving...' : 'Save Campaign Media'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketingMarketingContent;