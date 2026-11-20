import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Users,
  Clock,
  Search,
  Tag,
  FileSpreadsheet,
  Trash2,
  ChevronDown,
  RotateCcw,
  FileDown,
  X,
  Loader2,
  Plus,
  Edit2,
  Archive,
  ArrowUpDown,
  Sparkles,
  Globe,
  Eye,
  Check,
} from 'lucide-react';
import axios from '../axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import TablePagination from './common/TablePagination';

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const API_BASE_URL =
  !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com/api'
    : 'http://localhost:5000/api';

const FRONTEND_BASE_URL =
  !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com'
    : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

// Helper to strip emojis from any existing cached strings
const stripEmojis = (str) =>
  String(str || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const SMART_MARKETING_PRESETS = [
  {
    id: 'botanical-glow',
    title: 'Botanical Glow Weekend Special',
    category: 'FLASH SALE',
    campaignTitle: 'Exclusive Weekend Secret: 20% Off Natural Elixirs',
    headline: 'Unlock Radiant Skin with Pure Botanical Luxury',
    bodyText:
      'Indulge your skin with our pure, cold-pressed botanical oils and natural antioxidant serums. Handcrafted in micro-batches to preserve bio-active botanical potency.\n\nEnjoy an exclusive 20% savings on your entire order this weekend only. Cash on delivery is accepted nationwide.',
    discountCode: 'GLOW20',
    discountNote: '20% OFF Site-wide + Free Nationwide Shipping',
    ctaText: 'Claim Your Botanical Offer',
    ctaUrl: `${FRONTEND_BASE_URL}/collection`,
  },
  {
    id: 'monsoon-shield',
    title: 'Monsoon Skin Shield Routine',
    category: 'SEASONAL',
    campaignTitle: 'Stay Hydrated & Shielded This Season with Mhira',
    headline: 'Botanical Shield: Deep Hydration Routine',
    bodyText:
      "Fluctuating humidity and rain can strip your skin of natural hydration. Mhira's restorative botanical hydration mist and barrier repair balm lock in essential moisture without heaviness.\n\nOrder today and receive a complimentary travel-size botanical facial essence.",
    discountCode: 'SHIELD15',
    discountNote: '15% OFF + Free Botanical Gift at Checkout',
    ctaText: 'Shop Hydration Routine',
    ctaUrl: `${FRONTEND_BASE_URL}/packages`,
  },
  {
    id: 'vip-appreciation',
    title: 'VIP Customer Exclusive Voucher',
    category: 'VIP REWARD',
    campaignTitle: 'A Private Thank You from Mhira Natural',
    headline: 'A Private Invitation for Our Valued Client',
    bodyText:
      'As one of our most distinguished customers, we invite you to experience our newest organic collection before the official public launch.\n\nUse your personal VIP token below for instant savings on your next checkout.',
    discountCode: 'VIPMHIRA',
    discountNote: '₱250 OFF on orders above ₱1,200',
    ctaText: 'Explore VIP Collection',
    ctaUrl: `${FRONTEND_BASE_URL}/collection`,
  },
  {
    id: 'new-arrival-drop',
    title: 'New Organic Soap Collection Drop',
    category: 'PRODUCT LAUNCH',
    campaignTitle: 'Just Arrived: Handcrafted Botanical Soap Bar Collection',
    headline: 'Freshly Cured Natural Botanical Bar Soaps',
    bodyText:
      'Our artisanal cold-process soaps cured for 6 weeks are now officially available. Infused with Philippine raw botanicals, virgin coconut oil, and wild honey for gentle daily cleansing.\n\nLimited batch quantity available. Order yours before stock runs out!',
    discountCode: 'BOTANICALBAR',
    discountNote: 'Buy 2 Get 10% OFF + Free Eco Pouch',
    ctaText: 'Discover New Arrivals',
    ctaUrl: `${FRONTEND_BASE_URL}/collection`,
  },
];

export default function MarketingProductsPromotions() {
  // View Mode ('active' | 'archived')
  const [viewMode, setViewMode] = useState('active');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [voucherFilter, setVoucherFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewCampaignData, setPreviewCampaignData] = useState(null);
  const [viewCampaignModal, setViewCampaignModal] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [sending, setSending] = useState(false);

  const [targetAudience, setTargetAudience] = useState('ALL_CUSTOMERS');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [campaignTitle, setCampaignTitle] = useState(SMART_MARKETING_PRESETS[0].campaignTitle);
  const [headline, setHeadline] = useState(SMART_MARKETING_PRESETS[0].headline);
  const [bodyText, setBodyText] = useState(SMART_MARKETING_PRESETS[0].bodyText);
  const [discountCode, setDiscountCode] = useState(SMART_MARKETING_PRESETS[0].discountCode);
  const [discountNote, setDiscountNote] = useState(SMART_MARKETING_PRESETS[0].discountNote);
  const [ctaText, setCtaText] = useState(SMART_MARKETING_PRESETS[0].ctaText);
  const [ctaUrl, setCtaUrl] = useState(SMART_MARKETING_PRESETS[0].ctaUrl);
  const [activePresetId, setActivePresetId] = useState(SMART_MARKETING_PRESETS[0].id);
  const [isPublished, setIsPublished] = useState(true);

  // Registered Customers
  const [registeredCustomers, setRegisteredCustomers] = useState([]);

  // Campaign History State
  const [campaignHistory, setCampaignHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('mhira_marketing_campaign_history');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => ({
            ...item,
            title: stripEmojis(item.title),
            headline: stripEmojis(item.headline),
            isArchived: Boolean(item.isArchived),
          }));
        }
      }
    } catch (_e) { }
    return [
      {
        id: 'hist-1',
        title: 'Exclusive Weekend Secret: 20% Off Natural Elixirs',
        headline: 'Unlock Radiant Skin with Pure Botanical Luxury',
        bodyText:
          'Indulge your skin with our pure, cold-pressed botanical oils and natural antioxidant serums. Handcrafted in micro-batches to preserve bio-active botanical potency.\n\nEnjoy an exclusive 20% savings on your entire order this weekend only. Cash on delivery is accepted nationwide.',
        targetAudience: 'ALL_CUSTOMERS',
        recipientsCount: 1,
        discountCode: 'GLOW20',
        discountNote: '20% OFF Site-wide + Free Nationwide Shipping',
        ctaText: 'Claim Your Botanical Offer',
        ctaUrl: `${FRONTEND_BASE_URL}/collection`,
        dispatchedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        status: 'Delivered',
        isArchived: false,
      },
      {
        id: 'hist-2',
        title: 'A Private Thank You from Mhira Natural',
        headline: 'A Private Invitation for Our Valued Client',
        bodyText:
          'As one of our most distinguished customers, we invite you to experience our newest organic collection before the official public launch.\n\nUse your personal VIP token below for instant savings on your next checkout.',
        targetAudience: 'CUSTOM',
        recipientEmail: 'vip.client@gmail.com',
        recipientsCount: 1,
        discountCode: 'VIPMHIRA',
        discountNote: '₱250 OFF on orders above ₱1,200',
        ctaText: 'Explore VIP Collection',
        ctaUrl: `${FRONTEND_BASE_URL}/collection`,
        dispatchedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        status: 'Delivered',
        isArchived: false,
      },
    ];
  });

  const saveHistoryToStorage = (updated) => {
    setCampaignHistory(updated);
    try {
      localStorage.setItem('mhira_marketing_campaign_history', JSON.stringify(updated));
    } catch (_e) { }
  };

  // Fetch Customers from backend (strictly verified customer accounts)
  const fetchCustomerAudience = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users`);
      if (res.data && Array.isArray(res.data)) {
        const custs = res.data.filter(
          (u) =>
            u.role === 'Customer' &&
            u.email &&
            Boolean(u.isEmailVerified) &&
            !u.isArchived
        );
        setRegisteredCustomers(custs);
      }
    } catch (e) {
      console.warn('Could not fetch verified customers list:', e.message);
    }
  };

  useEffect(() => {
    fetchCustomerAudience();
  }, []);

  const handleApplyPreset = (presetId) => {
    setActivePresetId(presetId);
    const preset = SMART_MARKETING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setCampaignTitle(preset.campaignTitle);
    setHeadline(preset.headline);
    setBodyText(preset.bodyText);
    setDiscountCode(preset.discountCode);
    setDiscountNote(preset.discountNote);
    setCtaText(preset.ctaText);
    setCtaUrl(preset.ctaUrl);
  };

  const handleOpenAddModal = () => {
    setEditingCampaign(null);
    const defaultPreset = SMART_MARKETING_PRESETS[0];
    setActivePresetId(defaultPreset.id);
    setTargetAudience('ALL_CUSTOMERS');
    setRecipientEmail('');
    setSelectedCustomerId('');
    setCampaignTitle(defaultPreset.campaignTitle);
    setHeadline(defaultPreset.headline);
    setBodyText(defaultPreset.bodyText);
    setDiscountCode(defaultPreset.discountCode);
    setDiscountNote(defaultPreset.discountNote);
    setCtaText(defaultPreset.ctaText);
    setCtaUrl(defaultPreset.ctaUrl);
    setIsPublished(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingCampaign(item);
    setActivePresetId('');
    setTargetAudience(item.targetAudience || 'ALL_CUSTOMERS');
    setRecipientEmail(item.recipientEmail || '');
    setSelectedCustomerId('');
    setCampaignTitle(stripEmojis(item.title || ''));
    setHeadline(stripEmojis(item.headline || item.title || ''));
    setBodyText(item.bodyText || '');
    setDiscountCode(item.discountCode || '');
    setDiscountNote(item.discountNote || '');
    setCtaText(item.ctaText || 'Shop Collection');
    setCtaUrl(item.ctaUrl || `${FRONTEND_BASE_URL}/collection`);
    setIsPublished(item.isPublished !== undefined ? Boolean(item.isPublished) : item.status !== 'Draft');
    setIsModalOpen(true);
  };

  const handleAutoGenerateStory = () => {
    const titleStr = headline || campaignTitle || 'Pure Botanical Luxury';
    const codeStr = discountCode ? `Use voucher code ${discountCode} at checkout${discountNote ? ` (${discountNote})` : ''}.` : 'Cash on delivery is accepted nationwide.';
    const generated = `Experience the restorative power of Mhira Natural with "${titleStr}". Handcrafted in micro-batches using sustainably sourced organic botanicals to nourish, hydrate, and protect your skin naturally.\n\n${codeStr}`;
    setBodyText(generated);
    showSuccessToast('Auto-generated promotional story copy.');
  };

  const handleOpenPreviewModal = (customData = null) => {
    if (customData && customData.title) {
      setPreviewCampaignData({
        campaignTitle: stripEmojis(customData.title || customData.campaignTitle || ''),
        headline: stripEmojis(customData.headline || customData.title || ''),
        bodyText: customData.bodyText || '',
        discountCode: customData.discountCode || '',
        discountNote: customData.discountNote || '',
        ctaText: customData.ctaText || 'Shop the Botanical Collection',
        ctaUrl: customData.ctaUrl || `${FRONTEND_BASE_URL}/collection`,
        targetAudience: customData.targetAudience || 'ALL_CUSTOMERS',
        recipientEmail: customData.recipientEmail || '',
      });
    } else if (isModalOpen) {
      setPreviewCampaignData({
        campaignTitle: stripEmojis(campaignTitle || ''),
        headline: stripEmojis(headline || campaignTitle || ''),
        bodyText: bodyText || '',
        discountCode: discountCode || '',
        discountNote: discountNote || '',
        ctaText: ctaText || 'Shop the Botanical Collection',
        ctaUrl: ctaUrl || `${FRONTEND_BASE_URL}/collection`,
        targetAudience,
        recipientEmail,
      });
    } else {
      const source = filteredCampaigns[0] || campaignHistory[0] || SMART_MARKETING_PRESETS[0];
      setPreviewCampaignData({
        campaignTitle: stripEmojis(source.title || source.campaignTitle || ''),
        headline: stripEmojis(source.headline || source.title || ''),
        bodyText: source.bodyText || '',
        discountCode: source.discountCode || '',
        discountNote: source.discountNote || '',
        ctaText: source.ctaText || 'Claim Your Botanical Offer',
        ctaUrl: source.ctaUrl || `${FRONTEND_BASE_URL}/collection`,
        targetAudience: source.targetAudience || 'ALL_CUSTOMERS',
        recipientEmail: source.recipientEmail || '',
      });
    }
    setIsPreviewModalOpen(true);
  };

  const handleToggleArchive = (item) => {
    const nextArchived = !item.isArchived;
    const updated = campaignHistory.map((c) =>
      c.id === item.id ? { ...c, isArchived: nextArchived } : c
    );
    saveHistoryToStorage(updated);
    showSuccessToast(
      nextArchived
        ? `Campaign "${item.title}" moved to Archive Vault.`
        : `Campaign "${item.title}" restored to All Campaigns.`
    );
  };

  const handleDeleteCampaign = (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this campaign record?')) return;
    const updated = campaignHistory.filter((item) => item.id !== id);
    saveHistoryToStorage(updated);
    showSuccessToast('Campaign record permanently deleted.');
  };

  const handleCustomerSelect = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    const found = registeredCustomers.find((c) => c._id === custId);
    if (found && found.email) {
      setRecipientEmail(found.email);
    }
  };

  const handleDispatchCampaign = async (e) => {
    e?.preventDefault();
    if (targetAudience === 'CUSTOM' && !recipientEmail.trim()) {
      showErrorToast('Recipient email is required for single customer dispatch.');
      return;
    }
    if (!campaignTitle.trim()) {
      showErrorToast('Campaign subject line is required.');
      return;
    }

    const cleanTitle = stripEmojis(campaignTitle.trim());
    const cleanHeadline = stripEmojis(headline.trim());

    // If set to Draft (not published immediately), save locally as Draft without sending emails
    if (!isPublished) {
      const draftEntry = {
        id: editingCampaign ? editingCampaign.id : `hist-${Date.now()}`,
        title: cleanTitle,
        headline: cleanHeadline,
        bodyText: bodyText.trim(),
        targetAudience,
        recipientEmail: targetAudience === 'CUSTOM' ? recipientEmail.trim() : null,
        recipientsCount: 0,
        discountCode: discountCode.trim(),
        discountNote: discountNote.trim(),
        ctaText: ctaText.trim(),
        ctaUrl: ctaUrl.trim(),
        dispatchedAt: new Date().toISOString(),
        status: 'Draft',
        isPublished: false,
        isArchived: false,
      };

      const updatedHistory = editingCampaign
        ? campaignHistory.map((item) => (item.id === editingCampaign.id ? draftEntry : item))
        : [draftEntry, ...campaignHistory];

      saveHistoryToStorage(updatedHistory);
      showSuccessToast('Email campaign saved as Draft!');
      setIsModalOpen(false);
      setEditingCampaign(null);
      return;
    }

    try {
      setSending(true);

      const payload = {
        targetAudience,
        recipientEmail: targetAudience === 'CUSTOM' ? recipientEmail.trim() : undefined,
        campaignTitle: cleanTitle,
        headline: cleanHeadline,
        bodyText: bodyText.trim(),
        discountCode: discountCode.trim(),
        discountNote: discountNote.trim(),
        ctaText: ctaText.trim(),
        ctaUrl: ctaUrl.trim(),
      };

      const res = await axios.post(`${API_BASE_URL}/notifications/marketing`, payload);
      if (res.data?.success) {
        showSuccessToast(res.data.message || 'Marketing email broadcasted successfully to inboxes.');

        const newEntry = {
          id: editingCampaign ? editingCampaign.id : `hist-${Date.now()}`,
          title: cleanTitle,
          headline: cleanHeadline,
          bodyText: bodyText.trim(),
          targetAudience,
          recipientEmail: targetAudience === 'CUSTOM' ? recipientEmail.trim() : null,
          recipientsCount:
            res.data.sentCount ||
            (targetAudience === 'ALL_CUSTOMERS' ? registeredCustomers.length : 1),
          discountCode: discountCode.trim(),
          discountNote: discountNote.trim(),
          ctaText: ctaText.trim(),
          ctaUrl: ctaUrl.trim(),
          dispatchedAt: new Date().toISOString(),
          status: 'Live',
          isPublished: true,
          isArchived: false,
        };

        const updatedHistory = editingCampaign
          ? campaignHistory.map((item) => (item.id === editingCampaign.id ? newEntry : item))
          : [newEntry, ...campaignHistory];

        saveHistoryToStorage(updatedHistory);
        setIsModalOpen(false);
        setEditingCampaign(null);
      } else {
        showErrorToast(res.data?.message || 'Failed to dispatch email campaign.');
      }
    } catch (err) {
      console.error('Error dispatching marketing campaign:', err);
      showErrorToast(err.response?.data?.message || 'Network error dispatching campaign.');
    } finally {
      setSending(false);
    }
  };

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    let result = campaignHistory.filter((item) => {
      const isItemArchived = Boolean(item.isArchived);
      if (viewMode === 'active' && isItemArchived) return false;
      if (viewMode === 'archived' && !isItemArchived) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const t = (item.title || '').toLowerCase();
        const h = (item.headline || '').toLowerCase();
        const r = (item.recipientEmail || '').toLowerCase();
        const c = (item.discountCode || '').toLowerCase();
        if (!t.includes(q) && !h.includes(q) && !r.includes(q) && !c.includes(q)) return false;
      }

      if (audienceFilter !== 'All') {
        if (item.targetAudience !== audienceFilter) return false;
      }

      if (voucherFilter !== 'All') {
        const hasVoucher = Boolean(item.discountCode && item.discountCode.trim());
        if (voucherFilter === 'WithVoucher' && !hasVoucher) return false;
        if (voucherFilter === 'NoVoucher' && hasVoucher) return false;
      }

      return true;
    });

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.dispatchedAt || 0) - new Date(a.dispatchedAt || 0));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.dispatchedAt || 0) - new Date(b.dispatchedAt || 0));
    } else if (sortBy === 'title-asc') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return result;
  }, [campaignHistory, viewMode, searchQuery, audienceFilter, voucherFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode, searchQuery, audienceFilter, voucherFilter, sortBy]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim() !== '') count++;
    if (audienceFilter !== 'All') count++;
    if (voucherFilter !== 'All') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [searchQuery, audienceFilter, voucherFilter, sortBy]);

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setAudienceFilter('All');
    setVoucherFilter('All');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCampaigns.slice(start, start + itemsPerPage);
  }, [filteredCampaigns, currentPage, itemsPerPage]);

  const statusModules = useMemo(
    () => [
      { id: 'active', label: 'All Campaigns' },
      { id: 'archived', label: 'Archive Vault' },
    ],
    []
  );

  // Export PDF Summary
  const handleExportHistoryPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(1, 57, 15);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MHIRA NATURAL - EMAIL CAMPAIGNS AUDIT LOG', 14, 11);

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generated on ${new Date().toLocaleDateString()} | Total Broadcast Records: ${filteredCampaigns.length}`,
        14,
        18
      );

      const tableHead = [['#', 'Campaign Subject', 'Target Audience', 'Voucher Code', 'Dispatched At', 'Status']];
      const tableBody = filteredCampaigns.map((item, idx) => [
        idx + 1,
        stripEmojis(item.title || 'Broadcast Campaign'),
        item.targetAudience === 'ALL_CUSTOMERS'
          ? `All Verified Customers (${item.recipientsCount || 1})`
          : item.recipientEmail || 'Single Recipient',
        item.discountCode || 'None',
        new Date(item.dispatchedAt).toLocaleString(),
        item.isArchived ? 'Archived' : item.status || 'Delivered',
      ]);

      autoTable(doc, {
        startY: 32,
        head: tableHead,
        body: tableBody,
        headStyles: {
          fillColor: [1, 57, 15],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        theme: 'grid',
        styles: { cellPadding: 2.8 },
      });

      const fileName = `Campaign_Audit_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      showSuccessToast(`Exported Campaign Audit: ${fileName}`);
    } catch (err) {
      console.error('PDF export error:', err);
      showErrorToast('Failed to export campaign audit PDF.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-700">
      {/* MAIN CONTAINER */}
      <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col gap-6">

        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 overflow-x-auto no-scrollbar border-b border-slate-100 sm:border-b-0">
          <div className="flex items-center gap-1 -mb-px">
            {statusModules.map((mod) => {
              const isActive = viewMode === mod.id;
              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setViewMode(mod.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${isActive
                    ? 'border-[#01390f] text-[#01390f] bg-slate-50 rounded-t-lg font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 rounded-t-lg'
                    }`}
                >
                  {mod.id === 'active' ? (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#01390f]" />
                  ) : (
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* EXCEL RIBBON TOOLBAR */}
        <div className="py-2.5 bg-white flex flex-col lg:flex-row items-stretch gap-3 lg:gap-2.5">
          {/* ACTIONS GROUP */}
          <div
            className={`w-full ${viewMode === 'archived' ? 'lg:w-[140px]' : 'lg:w-[210px]'
              } shrink-0 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 pb-2.5 lg:pb-0 lg:pr-2.5 min-h-0 lg:min-h-[92px]`}
          >
            <div className="flex items-stretch gap-2 lg:gap-1.5 flex-1">
              {viewMode !== 'archived' && (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="w-[84px] sm:w-[90px] lg:w-[74px] shrink-0 flex flex-col items-center justify-center px-1.5 py-1.5 lg:py-1 rounded-md bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer group text-slate-700 hover:text-[#01390f]"
                  title="Create and dispatch a new email campaign"
                >
                  <Plus
                    className="w-5.5 h-5.5 text-[#01390f] group-hover:scale-110 transition-transform mb-0.5"
                    strokeWidth={2.5}
                  />
                  <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
                    New
                    <br />
                    Campaign
                  </span>
                </button>
              )}

              {/* Stacked Compact Rows */}
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 lg:gap-1 py-0.5">
                <button
                  type="button"
                  onClick={handleExportHistoryPdf}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] whitespace-nowrap"
                  title="Export campaign audit PDF"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="whitespace-nowrap">Export PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPreviewModal()}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-emerald-50 text-[#01390f] transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] whitespace-nowrap"
                  title="Preview email UI/UX design and brand logo"
                >
                  <Eye className="w-3.5 h-3.5 text-[#01390f] shrink-0" />
                  <span className="whitespace-nowrap">Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  disabled={activeFiltersCount === 0}
                  className="flex items-center gap-1.5 px-2 py-1 lg:py-0.5 rounded bg-slate-50 lg:bg-transparent border border-slate-200/80 lg:border-transparent hover:bg-slate-100 text-slate-700 transition-colors text-xs font-semibold cursor-pointer text-left w-full h-[28px] lg:h-[22px] disabled:opacity-35 disabled:cursor-not-allowed whitespace-nowrap"
                  title={
                    activeFiltersCount > 0
                      ? `Reset active filters (${activeFiltersCount})`
                      : 'No active filters'
                  }
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="whitespace-nowrap">
                    Reset Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
                  </span>
                </button>
              </div>
            </div>

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
              Actions
            </div>
          </div>

          {/* SEARCH & FILTER GROUP */}
          <div className="flex flex-col justify-between flex-1 min-h-0 lg:min-h-[92px] lg:pl-1">
            <div className="flex flex-col justify-between flex-1 py-0.5 space-y-2 lg:space-y-1">
              {/* Layer 1: Search */}
              <div className="relative flex items-center w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Campaign Subject, Headline, Recipient, or Voucher Code..."
                  className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Layer 2: 3-column Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                {/* Target Audience Select */}
                <div className="relative w-full">
                  <Users className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={audienceFilter}
                    onChange={(e) => setAudienceFilter(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
                  >
                    <option value="All">All Target Audiences</option>
                    <option value="ALL_CUSTOMERS">Broadcast (Verified Customers)</option>
                    <option value="CUSTOM">Single Recipient</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Voucher Filter Select */}
                <div className="relative w-full">
                  <Tag className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={voucherFilter}
                    onChange={(e) => setVoucherFilter(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
                  >
                    <option value="All">All Campaign Types</option>
                    <option value="WithVoucher">With Promo Voucher</option>
                    <option value="NoVoucher">No Voucher Attached</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Select */}
                <div className="relative w-full sm:col-span-2 md:col-span-1">
                  <ArrowUpDown className="w-3.5 h-3.5 absolute left-2 top-1 text-slate-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-[30px] sm:h-[22px] text-xs bg-slate-50 border border-slate-200 rounded pl-7 pr-5 focus:outline-none focus:border-[#01390f] focus:bg-white text-slate-700 cursor-pointer appearance-none truncate shadow-2xs"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="oldest">Sort: Oldest First</option>
                    <option value="title-asc">Sort: Subject (A-Z)</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-1.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Layer 3: 3-column Quick Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() =>
                    setAudienceFilter(audienceFilter === 'ALL_CUSTOMERS' ? 'All' : 'ALL_CUSTOMERS')
                  }
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${audienceFilter === 'ALL_CUSTOMERS'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Broadcast Only
                </button>

                <button
                  type="button"
                  onClick={() => setAudienceFilter(audienceFilter === 'CUSTOM' ? 'All' : 'CUSTOM')}
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs ${audienceFilter === 'CUSTOM'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  Single Email Only
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setVoucherFilter(voucherFilter === 'WithVoucher' ? 'All' : 'WithVoucher')
                  }
                  className={`h-[30px] sm:h-[22px] text-xs px-2 rounded border font-medium flex items-center justify-center cursor-pointer transition-colors shadow-2xs sm:col-span-2 md:col-span-1 ${voucherFilter === 'WithVoucher'
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-800 font-semibold'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                >
                  With Voucher Only
                </button>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center pt-0.5 select-none hidden lg:block">
              Search & Filter
            </div>
          </div>
        </div>

        {/* HR DIVIDER ABOVE TABLE */}
        <hr className="border-slate-200 -mt-4 -mb-2" />

        {/* TABLE MASTERLIST CONTAINER */}
        <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredCampaigns.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setItemsPerPage(rows);
              setCurrentPage(1);
            }}
          />

          <div className="overflow-x-auto relative custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4">CAMPAIGN SUBJECT</th>
                  <th className="py-3.5 px-4">TARGET AUDIENCE</th>
                  <th className="py-3.5 px-4 text-center">RECIPIENTS</th>
                  <th className="py-3.5 px-4 text-center">VOUCHER CODE</th>
                  <th className="py-3.5 px-4">OFFER NOTE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">DISPATCHED DATE</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">STOREFRONT STATUS</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-24 min-w-[90px] font-semibold text-white">
                    ACTION
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedCampaigns.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-12 text-slate-400 font-medium italic whitespace-nowrap"
                    >
                      {viewMode === 'archived'
                        ? 'No archived email campaigns in the vault.'
                        : 'No email campaigns found matching your search.'}
                    </td>
                  </tr>
                ) : (
                  paginatedCampaigns.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors whitespace-nowrap group hover:bg-slate-50/90 text-slate-700 font-medium text-xs sm:text-sm"
                    >
                      {/* 1. Campaign Subject */}
                      <td className="px-4 py-3.5 whitespace-nowrap bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors max-w-xs truncate">
                        <div className="font-semibold text-xs text-slate-900 truncate">
                          {stripEmojis(item.title)}
                        </div>
                        {item.headline && item.headline !== item.title && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {stripEmojis(item.headline)}
                          </div>
                        )}
                      </td>

                      {/* 2. Target Audience */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-xs text-slate-600 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                          {item.targetAudience === 'ALL_CUSTOMERS'
                            ? 'All Verified Customers'
                            : item.recipientEmail || 'Single Recipient'}
                        </span>
                      </td>

                      {/* 3. Recipients (Matches Quantity Blue Theme) */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center bg-blue-600/25 group-hover:bg-blue-600/40 text-slate-800 font-mono font-bold text-xs transition-colors">
                        {item.recipientsCount || 1} Sent
                      </td>

                      {/* 4. Voucher Code */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        <span className="font-mono font-bold text-xs text-slate-800 tracking-wide">
                          {item.discountCode || 'None'}
                        </span>
                      </td>

                      {/* 5. Offer Note */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs font-semibold text-slate-700 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors max-w-[200px] truncate">
                        {item.discountNote || 'â€”'}
                      </td>

                      {/* 6. Dispatched Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold text-slate-800 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                        {item.dispatchedAt
                          ? new Date(item.dispatchedAt).toLocaleDateString()
                          : 'N/A'}
                      </td>

                      {/* 7. Status (Live vs Draft vs Archived Tinted Cell â€” Blue / Yellow / Red) */}
                      <td
                        className={`px-4 py-3.5 whitespace-nowrap text-center font-mono text-xs font-bold transition-colors select-none ${item.isArchived
                          ? 'bg-red-500/20 group-hover:bg-red-500/30 text-red-900'
                          : item.isPublished === false || item.status === 'Draft'
                            ? 'bg-yellow-500/20 group-hover:bg-yellow-500/30 text-yellow-900'
                            : 'bg-blue-500/20 group-hover:bg-blue-500/30 text-blue-900'
                          }`}
                      >
                        <span>
                          {item.isArchived
                            ? 'Archived'
                            : item.isPublished === false || item.status === 'Draft'
                              ? 'Draft'
                              : 'Live'}
                        </span>
                      </td>

                      {/* 8. Action (Sticky Right) */}
                      <td className="py-3 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-28 min-w-[110px] transition-colors">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewCampaignModal(item)}
                            title="View Campaign Details"
                            className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {viewMode !== 'archived' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                title="Edit or Resend Campaign"
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleArchive(item)}
                                title="Archive Campaign"
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(item)}
                                title="Restore Campaign"
                                className="w-8 h-8 rounded-full bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteCampaign(item.id)}
                                title="Delete Permanently"
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT EMAIL CAMPAIGN MODAL (CONSISTENT WITH CATALOG, VOUCHERS & ANNOUNCEMENTS MODAL) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {editingCampaign ? 'Edit & Resend Email Campaign' : 'Create Email Campaign'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingCampaign
                    ? 'Modify existing email campaign details and broadcast to customers'
                    : 'Compose and dispatch promotional email campaigns to customer inboxes'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCampaign(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                âœ•
              </button>
            </div>

            <form
              onSubmit={handleDispatchCampaign}
              className="flex flex-col flex-1 overflow-hidden text-xs sm:text-sm"
            >
              <div className="p-6 flex flex-col gap-5 flex-1 overflow-y-auto custom-scrollbar">
                {/* 1. PUBLISH / DISPATCH IMMEDIATELY TOGGLE (CLEAN INLINE WITH UNDERLINE AT THE VERY TOP) */}
                <div
                  onClick={() => setIsPublished((prev) => !prev)}
                  className="flex items-center gap-3 pb-3 border-b border-slate-100 cursor-pointer select-none group"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPublished((prev) => !prev);
                    }}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0 ${isPublished
                      ? 'bg-[#01390f] text-white border-[#01390f]'
                      : 'bg-white text-slate-400 border-slate-200 group-hover:border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {isPublished ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </button>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-[#01390f] transition-colors">
                        Publish &amp; dispatch campaign immediately{' '}
                        <span className="text-[11px] font-normal text-slate-400">(Send to customer inboxes)</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {isPublished
                        ? 'Live broadcast to verified customer Gmail inboxes immediately upon saving'
                        : 'Saved as draft (not yet dispatched to customer inboxes until published)'}
                    </span>
                  </div>
                </div>

                {/* 2. 2-COLUMN GRID: CAMPAIGN PRESET & TARGET AUDIENCE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Campaign Template Preset
                    </label>
                    <div className="relative flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                      <select
                        value={activePresetId}
                        onChange={(e) => handleApplyPreset(e.target.value)}
                        className="w-full h-9 bg-transparent text-slate-800 pr-6 text-xs font-semibold focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="">Custom Campaign</option>
                        {SMART_MARKETING_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-1 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Target Customer Audience <span className="text-red-600">*</span>
                    </label>
                    <div className="relative flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                      <select
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="w-full h-9 bg-transparent text-slate-800 pr-6 text-xs font-semibold focus:outline-none cursor-pointer appearance-none"
                      >
                        <option value="ALL_CUSTOMERS">
                          All Verified Customers ({registeredCustomers.length})
                        </option>
                        <option value="CUSTOM">Single Customer / Test Email</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-1 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* SINGLE CUSTOMER SELECTOR (IF CUSTOM) */}
                {targetAudience === 'CUSTOM' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                        Pick Verified Customer
                      </label>
                      <div className="relative flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2 pointer-events-none" />
                        <select
                          value={selectedCustomerId}
                          onChange={handleCustomerSelect}
                          className="w-full h-9 bg-transparent text-slate-800 pr-6 text-xs font-semibold focus:outline-none cursor-pointer appearance-none truncate"
                        >
                          <option value="">Select verified customer account</option>
                          {registeredCustomers.map((c) => (
                            <option key={c._id} value={c._id}>
                              {c.fullName || 'Customer'} ({c.email})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-1 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                        Recipient Gmail Address <span className="text-red-600">*</span>
                      </label>
                      <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                        <input
                          type="email"
                          required
                          value={recipientEmail}
                          onChange={(e) => {
                            setRecipientEmail(e.target.value);
                            setSelectedCustomerId('');
                          }}
                          placeholder="Enter recipient Gmail address"
                          className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none placeholder:text-slate-300 placeholder:font-normal"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. 2-COLUMN GRID: EMAIL SUBJECT LINE & HERO HEADLINE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Email Subject Line <span className="text-red-600">*</span>
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        required
                        value={campaignTitle}
                        onChange={(e) => setCampaignTitle(e.target.value)}
                        placeholder="Enter email subject line"
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none placeholder:text-slate-300 placeholder:font-normal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Hero Headline <span className="text-red-600">*</span>
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        required
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="Enter campaign hero headline"
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none placeholder:text-slate-300 placeholder:font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. 2-COLUMN GRID: PROMO VOUCHER CODE & DISCOUNT OFFER NOTE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Promotional Voucher Code
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        placeholder="Enter Promo Mhira Code"
                        value={discountCode}
                        onChange={(e) =>
                          setDiscountCode(e.target.value.toUpperCase().replace(/\s+/g, ''))
                        }
                        className="w-full h-9 bg-transparent text-[#01390f] text-xs font-bold font-mono focus:outline-none uppercase placeholder:normal-case placeholder:font-sans placeholder:text-slate-300 placeholder:font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const randomCode = 'MHIRA' + Math.floor(1000 + Math.random() * 9000);
                          setDiscountCode(randomCode);
                        }}
                        className="ml-2 px-2 py-1 rounded bg-slate-100 hover:bg-[#01390f]/10 text-[10px] font-bold text-[#01390f] uppercase cursor-pointer shrink-0 transition-colors select-none"
                        title="Auto-generate promo code"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Discount Offer Note
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={discountNote}
                        onChange={(e) => setDiscountNote(e.target.value)}
                        placeholder="Enter discount offer note"
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none placeholder:text-slate-300 placeholder:font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. 2-COLUMN GRID: ACTION BUTTON TEXT & DESTINATION URL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Action Button Text
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Send className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="Enter action button label"
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-semibold focus:outline-none placeholder:text-slate-300 placeholder:font-normal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1 whitespace-nowrap">
                      Destination URL
                    </label>
                    <div className="flex items-center border-b-2 border-slate-200 focus-within:border-[#01390f] transition-colors">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
                      <input
                        type="text"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        placeholder="Enter destination URL"
                        className="w-full h-9 bg-transparent text-slate-800 text-xs font-mono font-semibold focus:outline-none placeholder:font-sans placeholder:text-slate-300 placeholder:font-normal"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. PROMOTIONAL BODY COPY */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      Promotional Story / Body Copy <span className="text-red-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateStory}
                      className="text-[11px] font-bold text-[#01390f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Auto-generate Story</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Enter promotional story and campaign details..."
                    className="w-full bg-transparent border-b-2 border-slate-200 focus:border-[#01390f] text-slate-800 py-2 text-xs font-medium focus:outline-none leading-relaxed resize-none transition-colors placeholder:text-slate-300 placeholder:font-normal"
                  />
                </div>

                {/* STATUS HELPER NOTICE AT THE BOTTOM */}
                <div className="pt-1 text-xs text-slate-400">
                  <span>
                    {isPublished
                      ? 'Note: This campaign is set to Live and will be dispatched immediately via the Mhira Natural Gmail SMTP engine once saved.'
                      : 'Note: This campaign is set to Draft and will be saved without dispatching emails until switched to Live.'}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS FOOTER */}
              <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-between gap-2.5 shrink-0 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => handleOpenPreviewModal()}
                  className="px-4 py-2.5 rounded-full bg-white hover:bg-emerald-50 text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer flex items-center gap-1.5 border border-[#01390f]/30 whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5 text-[#01390f]" />
                  <span>Preview Email UI</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingCampaign(null);
                    }}
                    className="px-5 py-2.5 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer border border-[#d5ead7] whitespace-nowrap"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending}
                    className="px-6 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 whitespace-nowrap bg-[#01390f] hover:bg-[#0a5219] text-white cursor-pointer disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : isPublished ? <Send className="w-3.5 h-3.5" /> : null}
                    <span className="whitespace-nowrap">
                      {sending
                        ? 'Sending...'
                        : !isPublished
                          ? 'Save as Draft'
                          : editingCampaign
                            ? 'Save & Resend'
                            : 'Send Campaign'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMAIL UI/UX DESIGN & LOGO PREVIEW MODAL */}
      {isPreviewModalOpen && previewCampaignData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-6 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[92vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL TOP BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#01390f]/10 border border-[#01390f]/20 flex items-center justify-center text-[#01390f] shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-800">
                    Email UI/UX &amp; Logo Live Preview
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Exact HTML layout &amp; Mhira Natural brand logo delivered to customer Gmail inboxes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Switch Template Preset in Preview */}
                <select
                  value=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val.startsWith('preset:')) {
                      const pId = val.replace('preset:', '');
                      const preset = SMART_MARKETING_PRESETS.find((p) => p.id === pId);
                      if (preset) {
                        setPreviewCampaignData({
                          campaignTitle: preset.campaignTitle,
                          headline: preset.headline,
                          bodyText: preset.bodyText,
                          discountCode: preset.discountCode,
                          discountNote: preset.discountNote,
                          ctaText: preset.ctaText,
                          ctaUrl: preset.ctaUrl,
                          targetAudience: 'ALL_CUSTOMERS',
                          recipientEmail: '',
                        });
                      }
                    } else if (val.startsWith('hist:')) {
                      const hId = val.replace('hist:', '');
                      const hist = campaignHistory.find((h) => String(h.id) === hId);
                      if (hist) {
                        handleOpenPreviewModal(hist);
                      }
                    }
                  }}
                  className="h-8 bg-white border border-slate-200 rounded-lg px-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#01390f] cursor-pointer"
                >
                  <option value="">Switch Preview Template...</option>
                  <optgroup label="Campaign Presets">
                    {SMART_MARKETING_PRESETS.map((p) => (
                      <option key={p.id} value={`preset:${p.id}`}>
                        {p.title}
                      </option>
                    ))}
                  </optgroup>
                  {campaignHistory.length > 0 && (
                    <optgroup label="Recent Campaigns">
                      {campaignHistory.slice(0, 6).map((h) => (
                        <option key={h.id} value={`hist:${h.id}`}>
                          {stripEmojis(h.title)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer text-sm"
                >
                  âœ•
                </button>
              </div>
            </div>

            {/* GMAIL INBOX ENVELOPE METADATA BAR */}
            <div className="px-6 py-3 bg-white border-b border-slate-200/80 flex flex-col gap-1 text-xs shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-14">Subject:</span>
                <span className="font-bold text-slate-900">
                  {previewCampaignData.campaignTitle || previewCampaignData.headline || 'Exclusive Offer from Mhira Natural'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-14">From:</span>
                <span className="font-semibold text-[#01390f]">Mhira Natural</span>
                <span className="text-slate-400 font-mono text-[11px]">&lt;noreply@mhira.shop&gt;</span>
                <span className="mx-1 text-slate-300">•</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">To:</span>
                <span className="text-slate-600 font-medium">
                  {previewCampaignData.targetAudience === 'CUSTOM' && previewCampaignData.recipientEmail
                    ? previewCampaignData.recipientEmail
                    : `All Verified Customers (${registeredCustomers.length || 1})`}
                </span>
              </div>
            </div>

            {/* EXACT RENDERED EMAIL HTML CANVAS (MATCHES backend/lib/email.js + NotificationController.js) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#fcfdfb] p-4 sm:p-8">
              <div
                style={{
                  maxWidth: '480px',
                  margin: '0 auto',
                  backgroundColor: '#ffffff',
                  borderRadius: '24px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.04)',
                  padding: '40px 36px',
                  fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  color: '#1f2937',
                }}
              >
                {/* 1. Centered Mhira Logo & Brand Title */}
                <div style={{ textAlign: 'center', margin: '0 auto 12px auto' }}>
                  <img
                    src="/mhira_removebg.png"
                    alt="Mhira Natural"
                    style={{
                      display: 'inline-block',
                      maxHeight: '52px',
                      height: '52px',
                      width: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    color: '#01390f',
                    textTransform: 'uppercase',
                    margin: '0 0 16px 0',
                    textAlign: 'center',
                  }}
                >
                  MHIRA NATURAL
                </div>

                {/* 2. Pill Category */}
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#01390f',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      padding: '4px 14px',
                      borderRadius: '9999px',
                    }}
                  >
                    EXCLUSIVE MARKETING PROMOTION
                  </span>
                </div>

                {/* 3. Main Heading (Title) */}
                <h1
                  style={{
                    margin: '0 0 16px 0',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: '#1f2937',
                    lineHeight: 1.35,
                    textAlign: 'center',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {previewCampaignData.headline || 'Special Announcement'}
                </h1>

                {/* 4. Secondary Sub-Headline */}
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#01390f',
                    lineHeight: 1.35,
                    margin: '0 0 16px 0',
                    textAlign: 'center',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {previewCampaignData.campaignTitle || previewCampaignData.headline || 'Experience Pure Botanical Luxury'}
                </h2>

                {/* 5. Body Copy Paragraphs */}
                <div
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.65,
                    color: '#4b5563',
                    marginBottom: '20px',
                    textAlign: 'center',
                  }}
                >
                  {(
                    previewCampaignData.bodyText ||
                    'Discover our latest botanical beauty innovations handcrafted with sustainable, natural ingredients.'
                  )
                    .split('\n')
                    .filter((p) => p.trim() !== '')
                    .map((para, idx) => (
                      <p key={idx} style={{ margin: '0 0 10px 0' }}>
                        {para.trim()}
                      </p>
                    ))}
                </div>

                {/* 6. Promotional Voucher / Discount Highlight Card */}
                {(previewCampaignData.discountCode || previewCampaignData.discountNote) && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #01390f 0%, #064e1b 100%)',
                      borderRadius: '20px',
                      padding: '24px',
                      color: '#ffffff',
                      textAlign: 'center',
                      margin: '26px 0',
                      boxShadow: '0 4px 14px rgba(1, 57, 15, 0.15)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: '#bbf7d0',
                        marginBottom: '6px',
                      }}
                    >
                      LIMITED TIME OFFER
                    </div>
                    {previewCampaignData.discountNote && (
                      <div
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          marginBottom: '12px',
                          color: '#ffffff',
                        }}
                      >
                        {previewCampaignData.discountNote}
                      </div>
                    )}
                    {previewCampaignData.discountCode && (
                      <>
                        <div
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#ffffff',
                            color: '#01390f',
                            padding: '10px 28px',
                            borderRadius: '9999px',
                            fontFamily: "'Poppins', Consolas, monospace",
                            fontSize: '20px',
                            fontWeight: 800,
                            letterSpacing: '4px',
                            border: '2px dashed #01390f',
                            marginBottom: '10px',
                          }}
                        >
                          {previewCampaignData.discountCode}
                        </div>
                        <div style={{ fontSize: '11px', color: '#d1fae5', marginTop: '4px' }}>
                          Use code at checkout to claim your savings
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* 7. CTA Button */}
                <div style={{ textAlign: 'center', margin: '28px 0 20px 0' }}>
                  <a
                    href={previewCampaignData.ctaUrl || `${FRONTEND_BASE_URL}/collection`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#01390f',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      textDecoration: 'none',
                      padding: '14px 32px',
                      borderRadius: '9999px',
                      boxShadow: '0 4px 14px rgba(1, 57, 15, 0.2)',
                    }}
                  >
                    {previewCampaignData.ctaText || 'Shop the Botanical Collection'} &rarr;
                  </a>
                </div>

                {/* 8. Notice Box */}
                <div
                  style={{
                    backgroundColor: '#fcfdfa',
                    border: '1px solid #e5e7eb',
                    borderLeft: '4px solid #01390f',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginTop: '24px',
                    fontSize: '12px',
                    color: '#4b5563',
                    lineHeight: 1.6,
                    textAlign: 'center',
                  }}
                >
                  You received this exclusive invitation as a distinguished member of the Mhira Natural community. Cash on Delivery is available nationwide across the Philippines.
                </div>

                {/* 9. Email Footer */}
                <div
                  style={{
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid #f1f5f9',
                    textAlign: 'center',
                    fontSize: '11px',
                    color: '#9ca3af',
                    lineHeight: 1.7,
                  }}
                >
                  &copy; {new Date().getFullYear()} Mhira Natural Soap and Cosmetics Manufacturing. All rights reserved.
                  <br />
                  <span style={{ fontSize: '10px', color: '#cbd5e1' }}>
                    Automated System Notification &bull; Confidential &bull; Please do not reply directly to this email.
                  </span>
                </div>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                Brand Logo: <code className="font-mono text-[#01390f] font-bold">/mhira_removebg.png</code> (CID inline attachment)
              </span>
              <div className="flex items-center gap-2">
                {!isModalOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPreviewModalOpen(false);
                      handleOpenAddModal();
                    }}
                    className="px-4 py-2 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Compose Campaign</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-5 py-2 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-xs font-bold uppercase tracking-wider transition-all border border-[#d5ead7] cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CAMPAIGN DETAILS MODAL (VIEW ONLY â€” CLEAN PARAGRAPH STYLE, CLOSE ONLY) */}
      {viewCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-hidden font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] my-auto transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  {stripEmojis(viewCampaignModal.title || viewCampaignModal.headline || 'Email Campaign')}
                </h3>
                <p className="text-xs text-slate-400">
                  {viewCampaignModal.dispatchedAt
                    ? new Date(viewCampaignModal.dispatchedAt).toLocaleDateString()
                    : 'Ongoing'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewCampaignModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm"
              >
                âœ•
              </button>
            </div>

            {/* MODAL BODY (PARAGRAPH STYLE â€” NO ICONS, NO LABELS, NO CONTAINERS) */}
            <div className="p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar text-xs sm:text-sm">
              <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <p className="font-semibold text-slate-800">
                  {viewCampaignModal.targetAudience === 'ALL_CUSTOMERS'
                    ? 'All Verified Customers'
                    : viewCampaignModal.recipientEmail || 'Single Recipient'}{' '}
                  ({viewCampaignModal.recipientsCount || 1} Sent)
                </p>
                <p className="text-slate-500">
                  {viewCampaignModal.dispatchedAt
                    ? new Date(viewCampaignModal.dispatchedAt).toLocaleDateString()
                    : 'Not Dispatched'}
                </p>
                {(viewCampaignModal.discountCode || viewCampaignModal.discountNote) && (
                  <p className="font-semibold text-[#01390f]">
                    {viewCampaignModal.discountCode ? `Code: ${viewCampaignModal.discountCode}` : ''}
                    {viewCampaignModal.discountCode && viewCampaignModal.discountNote ? ' â€” ' : ''}
                    {viewCampaignModal.discountNote || ''}
                  </p>
                )}
                {viewCampaignModal.headline && viewCampaignModal.headline !== viewCampaignModal.title && (
                  <p className="pt-1 font-semibold text-slate-800">
                    {stripEmojis(viewCampaignModal.headline)}
                  </p>
                )}
                {viewCampaignModal.bodyText && (
                  <p className="pt-2 text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {viewCampaignModal.bodyText}
                  </p>
                )}
              </div>
            </div>

            {/* MODAL FOOTER (CLOSE ONLY) */}
            <div className="px-6 py-4 bg-slate-100/90 border-t border-slate-200/80 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewCampaignModal(null)}
                className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
