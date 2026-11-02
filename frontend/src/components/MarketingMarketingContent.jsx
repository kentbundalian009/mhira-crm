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
  Sparkles,
  Layers,
  Type,
  FileText,
  Tag,
  Plus
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
      color: 'bg-blue-50 text-[#246C94] border-blue-200',
    },
    'ads-i': {
      name: 'Special Promotion Banner (Ads I)',
      badge: 'Special Banner',
      color: 'bg-blue-50 text-[#246C94] border-blue-200',
    },
    'ads-ii': {
      name: 'Secondary Campaign (Ads II)',
      badge: 'Brand Deals',
      color: 'bg-blue-50 text-[#246C94] border-blue-200',
    },
    'popup-ad': {
      name: 'Pop-Up Modal Banner',
      badge: 'Special Offer',
      color: 'bg-blue-50 text-[#246C94] border-blue-200',
    },
    'auth-banner': {
      name: 'Auth Page Banner (Login / Signup / Forgot Pass)',
      badge: 'Auth Showcase',
      color: 'bg-blue-50 text-[#246C94] border-blue-200',
    },
    'topbar-announcement': {
      name: 'Topbar Marquee Announcement Ticker',
      badge: 'Storefront Header',
      color: 'bg-blue-50 text-[#246C94] border-blue-200',
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
    { id: 'ads-i', label: 'Special Banner (Ads I)' },
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap inline-flex items-center ${selectedSectionFilter === tab.id
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
                  className={`bg-white rounded-2xl border ${dragOverIndex === idx
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
                      {/* Images / Videos Grid (Consistent Thumbnail + Title & Caption under photo) */}
                      {sec.images.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {sec.images.map((img, i) => {
                            const slideDetail = (sec.slideDetails || []).find((s) => s.image === img) || (sec.slideDetails || [])[i];
                            const displayTitle = sec.sectionName === 'carousel' ? slideDetail?.title : (i === 0 ? sec.title : '');
                            const displayText = sec.sectionName === 'carousel' ? slideDetail?.text : (i === 0 ? sec.text : '');
                            const hasCustomText = Boolean(displayTitle || displayText);

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
                                {hasCustomText && (
                                  <div className="px-1 text-[11px] leading-tight">
                                    {displayTitle && <p className="font-bold text-slate-800 truncate" title={displayTitle}>{displayTitle}</p>}
                                    {displayText && <p className="text-[10px] text-slate-500 truncate mt-0.5" title={displayText}>{displayText}</p>}
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

      {/* ADD / EDIT MODAL (CONSISTENT WITH CREATE PROMOTIONAL COUPON MODAL UI) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className={`bg-white rounded-3xl shadow-2xl w-full ${activeSectionName === 'carousel' ? 'max-w-3xl' : 'max-w-xl sm:max-w-2xl'} overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200`}>
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {modalMode === 'add'
                    ? 'Add Storefront Campaign Media'
                    : `Manage Content — ${sectionMeta[activeSectionName]?.name || activeSectionName}`}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeSectionName === 'topbar-announcement'
                    ? 'Configure live announcement ticker text and banner asset'
                    : isSingleMediaSection(activeSectionName)
                      ? 'Upload and manage single banner creative placement'
                      : 'Manage hero carousel banner slides, titles, and subheadings'}
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

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm">
              <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
                {/* TARGET STOREFRONT PLACEMENT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                    Target Storefront Placement <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={activeSectionName}
                      onChange={(e) => handleSectionSelectChange(e.target.value)}
                      className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 pr-8 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white cursor-pointer appearance-none transition-colors"
                    >
                      <option value="carousel">Hero Carousel Slider (Main Banner - Multi-slide)</option>
                      <option value="ads-i">Special Promotion Banner (Ads I - Special Banner)</option>
                      <option value="ads-ii">Secondary Campaign (Ads II - Single Image)</option>
                      <option value="popup-ad">Pop-Up Modal Banner (Homepage Pop-up)</option>
                      <option value="auth-banner">Auth Page Banner (Login / Signup / Forgot Pass)</option>
                      <option value="topbar-announcement">Topbar Announcement (Marquee Ticker)</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* AUTH BANNER NOTICE OR TOPBAR ANNOUNCEMENT TEXTAREA */}
                {activeSectionName === 'auth-banner' ? (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-[#246C94] font-medium flex items-center gap-2 shadow-2xs">
                    <Sparkles className="w-4 h-4 text-[#246C94] shrink-0" />
                    <span>Upload 1 image to display as the full-screen side banner on Login, Signup, and Forgot Password pages.</span>
                  </div>
                ) : activeSectionName === 'topbar-announcement' || activeSectionName === 'popup-ad' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                      {activeSectionName === 'popup-ad'
                        ? 'Pop-up Promo Caption / Subtext (Optional)'
                        : 'Topbar Scrolling Ticker Text'}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={activeSectionName === 'popup-ad' ? 'Enter Subtext' : 'Enter Announcement Ticker Text'}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#01390f] focus:bg-white resize-none leading-relaxed transition-colors"
                    />
                  </div>
                ) : null}

                {/* 1. PRODUCT STOREFRONT IMAGES (FIRST PHOTO IS MAIN THUMBNAIL) - SAME FOR ALL BANNERS */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 whitespace-nowrap">
                      Product Storefront Images <span className="text-[11px] font-normal text-slate-400">(First photo is main thumbnail)</span>
                    </label>
                    {(existingImages.length + newPreviews.length) > 0 && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {existingImages.length + newPreviews.length} {(existingImages.length + newPreviews.length) === 1 ? 'photo' : 'photos'} added
                      </span>
                    )}
                  </div>

                  {/* COMPACT ROW: UPLOAD BUTTON + PREVIEW THUMBNAILS */}
                  <div className="flex items-center gap-3 overflow-x-auto py-1 custom-scrollbar">
                    {/* UPLOAD BUTTON - ACTION CIRCLE (MATCHES EDIT/DELETE ACTION BUTTONS) */}
                    <label
                      title={isSingleMediaSection(activeSectionName) ? "Choose Storefront Photo" : "Add Storefront Photos"}
                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 self-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        multiple={!isSingleMediaSection(activeSectionName)}
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {/* THUMBNAILS LIST */}
                    {(existingImages.length > 0 || newPreviews.length > 0) ? (
                      <>
                        {/* EXISTING STOREFRONT PHOTOS */}
                        {existingImages.map((imgUrl, idx) => {
                          const isVid = isVideoFile(imgUrl);
                          const isMain = idx === 0;
                          return (
                            <div
                              key={`existing-${idx}`}
                              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs shrink-0"
                            >
                              {isVid ? (
                                <video
                                  src={resolveMediaSrc(imgUrl)}
                                  className="w-full h-full object-cover"
                                  muted
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
                                  alt={`Product photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    if (!e.currentTarget.dataset.retried) {
                                      e.currentTarget.dataset.retried = 'true';
                                      e.currentTarget.src = getImageUrl(imgUrl);
                                    }
                                  }}
                                />
                              )}
                              {isMain && (
                                <span className="absolute bottom-1.5 left-1.5 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                  Main
                                </span>
                              )}
                              {isVid && (
                                <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[8px] font-bold p-1 rounded backdrop-blur-xs flex items-center">
                                  <Video className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveExistingImage(idx)}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                                title="Remove photo"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}

                        {/* NEWLY ADDED PREVIEWS */}
                        {newPreviews.map((prev, idx) => {
                          const isVid = isVideoFile(newFiles[idx]?.name || '');
                          const isMain = existingImages.length === 0 && idx === 0;
                          return (
                            <div
                              key={`new-${idx}`}
                              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-md overflow-hidden border border-emerald-300 bg-emerald-50/40 group shadow-2xs shrink-0"
                            >
                              {isVid ? (
                                <video src={prev} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={prev} alt={`New photo preview ${idx + 1}`} className="w-full h-full object-cover" />
                              )}
                              {isMain ? (
                                <span className="absolute bottom-1.5 left-1.5 bg-[#01390f] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                  Main
                                </span>
                              ) : (
                                <span className="absolute bottom-1.5 left-1.5 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                  New
                                </span>
                              )}
                              {isVid && (
                                <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[8px] font-bold p-1 rounded backdrop-blur-xs flex items-center">
                                  <Video className="w-2.5 h-2.5" />
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveNewFile(idx)}
                                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center opacity-90 hover:opacity-100 hover:scale-110 transition-all cursor-pointer shadow-xs"
                                title="Remove photo"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No photos uploaded yet. Click &ldquo;+&rdquo; to upload storefront photos.
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. HEADLINE & SUBTEXT INPUTS (SAME 2-COL UI FOR ALL BANNERS) */}
                {activeSectionName === 'carousel' ? (
                  (existingImages.length > 0 || newPreviews.length > 0) && (
                    <div className="space-y-4 pt-1">
                      {/* Existing Slides */}
                      {existingImages.map((imgUrl, idx) => {
                        const detail = existingSlideDetails[idx] || { title: '', text: '' };
                        return (
                          <div key={`detail-existing-${idx}`} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                Slide #{idx + 1} Headline Title {idx === 0 ? <span className="text-[11px] font-bold text-[#01390f]">(Main)</span> : null}
                              </label>
                              <input
                                type="text"
                                placeholder="Enter Headline Title"
                                value={detail.title || ''}
                                onChange={(e) => handleExistingSlideDetailChange(idx, 'title', e.target.value)}
                                className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                Slide #{idx + 1} Promo Caption / Subtext
                              </label>
                              <input
                                type="text"
                                placeholder="Enter Subtext"
                                value={detail.text || ''}
                                onChange={(e) => handleExistingSlideDetailChange(idx, 'text', e.target.value)}
                                className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                              />
                            </div>
                          </div>
                        );
                      })}

                      {/* New Upload Slides */}
                      {newPreviews.map((prev, idx) => {
                        const detail = newSlideDetails[idx] || { title: '', text: '' };
                        const slideNum = existingImages.length + idx + 1;
                        const isMain = existingImages.length === 0 && idx === 0;
                        return (
                          <div key={`detail-new-${idx}`} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                Slide #{slideNum} Headline Title {isMain ? <span className="text-[11px] font-bold text-[#01390f]">(Main)</span> : <span className="text-[11px] font-bold text-emerald-700">(New)</span>}
                              </label>
                              <input
                                type="text"
                                placeholder="Enter Headline Title"
                                value={detail.title || ''}
                                onChange={(e) => handleNewSlideDetailChange(idx, 'title', e.target.value)}
                                className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                                Slide #{slideNum} Promo Caption / Subtext
                              </label>
                              <input
                                type="text"
                                placeholder="Enter Subtext"
                                value={detail.text || ''}
                                onChange={(e) => handleNewSlideDetailChange(idx, 'text', e.target.value)}
                                className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : activeSectionName !== 'auth-banner' && activeSectionName !== 'topbar-announcement' ? (
                  /* SPECIAL BANNER (ADS I), ADS II, AND OTHER BANNERS - EXACT SAME 2-COL UI AS MAIN BANNER */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                        Headline Title <span className="text-[11px] font-bold text-[#01390f]">(Main)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Headline Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 whitespace-nowrap">
                        Promo Caption / Subtext
                      </label>
                      <input
                        type="text"
                        placeholder="Enter Subtext"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-[34px] bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 text-xs font-semibold focus:outline-none focus:border-[#01390f] focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                ) : null}
                {/* STATUS HELPER NOTICE */}
                <div className="pt-1 text-xs text-slate-500">
                  <span>Changes will be live immediately across customer storefront once saved.</span>
                </div>
              </div>

              {/* ACTION BUTTONS FOOTER (MATCHES CATALOG & FINISHED GOODS MODAL) */}
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
                  disabled={submitting}
                  className="px-6 py-2.5 sm:py-3 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 whitespace-nowrap bg-[#01390f] hover:bg-[#0a5219] text-white cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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