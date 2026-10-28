import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Send,
  Sparkles,
  Users,
  Gift,
  Eye,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Tag,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Megaphone,
  Percent,
  Check,
  Calendar,
  Layers,
  FileSpreadsheet,
  Trash2,
  ArrowRight,
  Monitor,
  Smartphone,
  ChevronDown,
  RotateCcw,
  FileDown,
  X,
  Loader2,
  Plus
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

const SMART_MARKETING_PRESETS = [
  {
    id: 'botanical-glow',
    title: 'Botanical Glow Weekend Special',
    category: 'FLASH SALE',
    categoryColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    campaignTitle: '✨ Exclusive Weekend Secret: 20% Off Natural Elixirs',
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
    categoryColor: 'bg-blue-50 text-blue-800 border-blue-200',
    campaignTitle: '🌿 Stay Hydrated & Shielded This Season with Mhira',
    headline: 'Botanical Shield: Deep Hydration Routine',
    bodyText:
      'Fluctuating humidity and rain can strip your skin of natural hydration. Mhira\'s restorative botanical hydration mist and barrier repair balm lock in essential moisture without heaviness.\n\nOrder today and receive a complimentary travel-size botanical facial essence.',
    discountCode: 'SHIELD15',
    discountNote: '15% OFF + Free Botanical Gift at Checkout',
    ctaText: 'Shop Hydration Routine',
    ctaUrl: `${FRONTEND_BASE_URL}/packages`,
  },
  {
    id: 'vip-appreciation',
    title: 'VIP Customer Exclusive Voucher',
    category: 'VIP REWARD',
    categoryColor: 'bg-amber-50 text-amber-800 border-amber-200',
    campaignTitle: '💎 A Private Thank You from Mhira Natural',
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
    categoryColor: 'bg-purple-50 text-purple-800 border-purple-200',
    campaignTitle: '🌸 Just Arrived: Handcrafted Botanical Soap Bar Collection',
    headline: 'Freshly Cured Natural Botanical Bar Soaps',
    bodyText:
      'Our artisanal cold-process soaps cured for 6 weeks are now officially available. Infused with Philippine raw botanicals, virgin coconut oil, and wild honey for gentle daily cleansing.\n\nLimited batch quantity available. Order yours before stock runs out!',
    discountCode: 'BOTANICALBAR',
    discountNote: 'Buy 2 Get 10% OFF + Free Eco Pouch',
    ctaText: 'Discover New Arrivals',
    ctaUrl: `${FRONTEND_BASE_URL}/collection`,
  },
];

export default function MarketingEmailCampaigns() {
  // Campaign Compose State
  const [targetAudience, setTargetAudience] = useState('ALL_CUSTOMERS'); // 'ALL_CUSTOMERS' | 'CUSTOM'
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [campaignTitle, setCampaignTitle] = useState(SMART_MARKETING_PRESETS[0].campaignTitle);
  const [headline, setHeadline] = useState(SMART_MARKETING_PRESETS[0].headline);
  const [bodyText, setBodyText] = useState(SMART_MARKETING_PRESETS[0].bodyText);
  const [discountCode, setDiscountCode] = useState(SMART_MARKETING_PRESETS[0].discountCode);
  const [discountNote, setDiscountNote] = useState(SMART_MARKETING_PRESETS[0].discountNote);
  const [ctaText, setCtaText] = useState(SMART_MARKETING_PRESETS[0].ctaText);
  const [ctaUrl, setCtaUrl] = useState(SMART_MARKETING_PRESETS[0].ctaUrl);
  const [bannerImage, setBannerImage] = useState('');
  const [activePresetId, setActivePresetId] = useState(SMART_MARKETING_PRESETS[0].id);

  // Status & Counts
  const [sending, setSending] = useState(false);
  const [registeredCustomers, setRegisteredCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [activeTab, setActiveTab] = useState('composer'); // 'composer' | 'history'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // History Search & Filter States
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyAudienceFilter, setHistoryAudienceFilter] = useState('All');
  const [deleteTargetHistory, setDeleteTargetHistory] = useState(null);

  // Campaign History State
  const [campaignHistory, setCampaignHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('mhira_marketing_campaign_history');
      if (cached) return JSON.parse(cached);
    } catch (_e) {}
    return [
      {
        id: 'hist-1',
        title: '✨ Exclusive Weekend Secret: 20% Off Natural Elixirs',
        headline: 'Unlock Radiant Skin with Pure Botanical Luxury',
        bodyText:
          'Indulge your skin with our pure, cold-pressed botanical oils and natural antioxidant serums. Handcrafted in micro-batches to preserve bio-active botanical potency.\n\nEnjoy an exclusive 20% savings on your entire order this weekend only. Cash on delivery is accepted nationwide.',
        targetAudience: 'ALL_CUSTOMERS',
        recipientsCount: 42,
        discountCode: 'GLOW20',
        discountNote: '20% OFF Site-wide + Free Nationwide Shipping',
        ctaText: 'Claim Your Botanical Offer',
        ctaUrl: `${FRONTEND_BASE_URL}/collection`,
        dispatchedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        status: 'Delivered',
      },
      {
        id: 'hist-2',
        title: '💎 A Private Thank You from Mhira Natural',
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
      },
    ];
  });

  // Fetch Customers count from backend
  const fetchCustomerAudience = async () => {
    setLoadingCustomers(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/users`);
      if (res.data && Array.isArray(res.data)) {
        const custs = res.data.filter((u) => u.role === 'Customer' && u.email);
        setRegisteredCustomers(custs);
      }
    } catch (e) {
      console.warn('Could not fetch registered customers list:', e.message);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchCustomerAudience();
  }, []);

  const handleApplyPreset = (preset) => {
    setActivePresetId(preset.id);
    setCampaignTitle(preset.campaignTitle);
    setHeadline(preset.headline);
    setBodyText(preset.bodyText);
    setDiscountCode(preset.discountCode);
    setDiscountNote(preset.discountNote);
    setCtaText(preset.ctaText);
    setCtaUrl(preset.ctaUrl);
    showSuccessToast(`Applied preset: ${preset.title} ✨`);
  };

  const handleDuplicateToComposer = (item) => {
    setCampaignTitle(item.title || '');
    setHeadline(item.headline || item.title || '');
    setBodyText(item.bodyText || '');
    setDiscountCode(item.discountCode || '');
    setDiscountNote(item.discountNote || '');
    setCtaText(item.ctaText || 'Shop Collection');
    setCtaUrl(item.ctaUrl || `${FRONTEND_BASE_URL}/collection`);
    setTargetAudience(item.targetAudience || 'ALL_CUSTOMERS');
    if (item.recipientEmail) setRecipientEmail(item.recipientEmail);
    setActiveTab('composer');
    showSuccessToast('Campaign duplicated into Studio Composer. Ready for editing.');
  };

  const handleDeleteHistory = () => {
    if (!deleteTargetHistory) return;
    const updated = campaignHistory.filter((item) => item.id !== deleteTargetHistory.id);
    setCampaignHistory(updated);
    try {
      localStorage.setItem('mhira_marketing_campaign_history', JSON.stringify(updated));
    } catch (_e) {}
    setDeleteTargetHistory(null);
    showSuccessToast('Campaign record removed from history.');
  };

  const handleCopyCodeToClipboard = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    showSuccessToast(`Copied voucher code "${code}" to clipboard!`);
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

    try {
      setSending(true);
      const payload = {
        targetAudience,
        recipientEmail: targetAudience === 'CUSTOM' ? recipientEmail.trim() : undefined,
        campaignTitle: campaignTitle.trim(),
        headline: headline.trim(),
        bodyText: bodyText.trim(),
        discountCode: discountCode.trim(),
        discountNote: discountNote.trim(),
        ctaText: ctaText.trim(),
        ctaUrl: ctaUrl.trim(),
        bannerImage: bannerImage.trim() || undefined,
      };

      const res = await axios.post(`${API_BASE_URL}/notifications/marketing`, payload);
      if (res.data?.success) {
        showSuccessToast(res.data.message || 'Marketing email broadcasted successfully to inboxes! 🚀');

        // Append to history
        const newEntry = {
          id: `hist-${Date.now()}`,
          title: campaignTitle.trim(),
          headline: headline.trim(),
          bodyText: bodyText.trim(),
          targetAudience,
          recipientEmail: targetAudience === 'CUSTOM' ? recipientEmail.trim() : null,
          recipientsCount: res.data.sentCount || (targetAudience === 'ALL_CUSTOMERS' ? registeredCustomers.length || 1 : 1),
          discountCode: discountCode.trim(),
          discountNote: discountNote.trim(),
          ctaText: ctaText.trim(),
          ctaUrl: ctaUrl.trim(),
          dispatchedAt: new Date().toISOString(),
          status: 'Delivered',
        };
        const updatedHistory = [newEntry, ...campaignHistory];
        setCampaignHistory(updatedHistory);
        try {
          localStorage.setItem('mhira_marketing_campaign_history', JSON.stringify(updatedHistory));
        } catch (_e) {}
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

  // Filtered History
  const filteredHistory = useMemo(() => {
    return campaignHistory.filter((item) => {
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const t = (item.title || '').toLowerCase();
        const r = (item.recipientEmail || '').toLowerCase();
        const c = (item.discountCode || '').toLowerCase();
        if (!t.includes(q) && !r.includes(q) && !c.includes(q)) return false;
      }
      if (historyAudienceFilter !== 'All') {
        if (item.targetAudience !== historyAudienceFilter) return false;
      }
      return true;
    });
  }, [campaignHistory, historySearchQuery, historyAudienceFilter]);

  // Campaign History Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHistory.slice(start, start + itemsPerPage);
  }, [filteredHistory, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [historySearchQuery, historyAudienceFilter]);

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
        `Generated on ${new Date().toLocaleDateString()} | Total Broadcast Records: ${filteredHistory.length}`,
        14,
        18
      );

      const tableHead = [['#', 'Campaign Subject', 'Target Audience', 'Voucher Code', 'Dispatched At', 'Status']];
      const tableBody = filteredHistory.map((item, idx) => [
        idx + 1,
        item.title || 'Broadcast Campaign',
        item.targetAudience === 'ALL_CUSTOMERS'
          ? `All Customers (${item.recipientsCount || 1})`
          : (item.recipientEmail || 'Single Recipient'),
        item.discountCode || 'None',
        new Date(item.dispatchedAt).toLocaleString(),
        item.status || 'Delivered',
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
    <div className="w-full flex flex-col gap-6 font-['Poppins',sans-serif] antialiased text-slate-800">
      
      {/* 1. TOP STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Registered Customer Reach */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between group hover:border-emerald-300 transition-all">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Total Customer Reach</span>
            <div className="text-2xl font-black text-[#01390f] mt-1 font-mono">
              {loadingCustomers ? '...' : registeredCustomers.length || 42}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" /> Registered Customer Accounts
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#01390f] group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Dispatched Campaigns */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between group hover:border-emerald-300 transition-all">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Campaigns Sent</span>
            <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
              {campaignHistory.length}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
              <Megaphone className="w-3 h-3 text-slate-400" /> Dispatched to Inboxes
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Active Promo Voucher */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between group hover:border-emerald-300 transition-all">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Active Voucher</span>
            <div className="text-lg font-black text-slate-900 mt-1 font-mono tracking-wider flex items-center gap-1.5">
              <span>{discountCode || 'NONE'}</span>
              {discountCode && (
                <button
                  type="button"
                  onClick={() => handleCopyCodeToClipboard(discountCode)}
                  className="text-slate-400 hover:text-[#01390f] cursor-pointer"
                  title="Copy code"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5 truncate max-w-[190px]">
              <Percent className="w-3 h-3 shrink-0" />
              <span className="truncate">{discountNote || 'Live Promo Voucher'}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <Gift className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Gmail Delivery Engine Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between group hover:border-emerald-300 transition-all">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Delivery Gateway</span>
            <div className="text-sm font-bold text-slate-900 mt-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Gmail Engine Active</span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
              Direct SMTP & API Dispatch
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#01390f] group-hover:scale-110 transition-transform">
            <Mail className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. MAIN CARD: STUDIO WORKSPACE */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6 transition-colors duration-200">
        
        {/* EXCEL SHEET TABS */}
        <div className="flex items-center justify-between bg-white px-1 pt-1 pb-0 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'composer', label: 'Campaign Studio & Composer' },
              { id: 'history', label: `Dispatched History (${campaignHistory.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-[#01390f] text-[#01390f] bg-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 pb-1.5 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gmail SMTP Engine Ready</span>
          </div>
        </div>

        {/* TAB 1: CAMPAIGN STUDIO (COMPOSE + LIVE PREVIEW) */}
        {activeTab === 'composer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: COMPOSE CONTROLS (7 COLS) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* SMART PRESETS SHELF */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>One-Click Smart Campaign Presets</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Click to auto-fill template</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SMART_MARKETING_PRESETS.map((preset) => {
                    const isSelected = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer shadow-2xs flex flex-col justify-between group ${
                          isSelected
                            ? 'bg-emerald-50/70 border-[#01390f] ring-1 ring-[#01390f]'
                            : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${preset.categoryColor}`}>
                            {preset.category}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                            {preset.discountCode}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 truncate group-hover:text-[#01390f]">
                          {preset.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {preset.discountNote}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TARGET AUDIENCE SETTING */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Select Target Audience
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      targetAudience === 'ALL_CUSTOMERS'
                        ? 'border-[#01390f] bg-white text-[#01390f] shadow-2xs font-bold'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      value="ALL_CUSTOMERS"
                      checked={targetAudience === 'ALL_CUSTOMERS'}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="accent-[#01390f] w-4 h-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs">Broadcast to All Customers</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({registeredCustomers.length || 42} Registered Profiles)
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      targetAudience === 'CUSTOM'
                        ? 'border-[#01390f] bg-white text-[#01390f] shadow-2xs font-bold'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      value="CUSTOM"
                      checked={targetAudience === 'CUSTOM'}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="accent-[#01390f] w-4 h-4 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs">Single Customer / Test Email</span>
                      <span className="text-[11px] text-slate-500 font-normal">Direct dispatch to specific Gmail</span>
                    </div>
                  </label>
                </div>

                {targetAudience === 'CUSTOM' && (
                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Pick Registered Customer
                      </label>
                      <select
                        value={selectedCustomerId}
                        onChange={handleCustomerSelect}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:border-[#01390f] outline-none shadow-2xs cursor-pointer truncate"
                      >
                        <option value="">Select from accounts...</option>
                        {registeredCustomers.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.fullName || 'Customer'} ({c.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Recipient Gmail Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={recipientEmail}
                        onChange={(e) => {
                          setRecipientEmail(e.target.value);
                          setSelectedCustomerId('');
                        }}
                        placeholder="e.g., client@gmail.com"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:border-[#01390f] outline-none shadow-2xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CAMPAIGN CONTENT FORM */}
              <form onSubmit={handleDispatchCampaign} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                
                {/* Subject Line */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Email Subject Line (Customer Inbox Preview) *
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {campaignTitle.length}/60 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    placeholder="✨ Exclusive Weekend Secret: 20% Off Natural Elixirs"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-[#01390f] outline-none"
                  />
                </div>

                {/* Hero Headline */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Hero Headline (Email Body Title) *
                  </label>
                  <input
                    type="text"
                    required
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Unlock Radiant Skin with Pure Botanical Luxury"
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:border-[#01390f] outline-none"
                  />
                </div>

                {/* Body Text */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Promotional Story / Body Copy *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder="Describe the botanical ingredients, artisan formulation, and why customers should order today..."
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-[#01390f] outline-none leading-relaxed resize-none"
                  />
                </div>

                {/* Promo Code & Offer Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Promotional Voucher Code
                    </label>
                    <input
                      type="text"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                      placeholder="e.g., BOTANICAL20"
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 tracking-wider focus:bg-white focus:border-[#01390f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Discount Offer Note
                    </label>
                    <input
                      type="text"
                      value={discountNote}
                      onChange={(e) => setDiscountNote(e.target.value)}
                      placeholder="e.g., 20% OFF Site-wide + Free Shipping"
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-[#01390f] outline-none"
                    />
                  </div>
                </div>

                {/* CTA Button & Link */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Action Button Text
                    </label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="Claim Your Botanical Offer"
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-[#01390f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Destination URL
                    </label>
                    <input
                      type="text"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder={`${FRONTEND_BASE_URL}/collection`}
                      className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:border-[#01390f] outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Dispatch Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-3 px-6 rounded-full font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>
                      {sending
                        ? 'Broadcasting Campaign to Gmail...'
                        : targetAudience === 'ALL_CUSTOMERS'
                        ? `Broadcast Campaign to All Registered Customers (${registeredCustomers.length || 42})`
                        : 'Send Campaign to Customer Gmail'}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT COLUMN: LIVE GMAIL PREVIEW SCREEN (5 COLS) */}
            <div className="lg:col-span-5 flex flex-col sticky top-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span>Interactive Gmail Live Preview</span>
                </div>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      previewDevice === 'desktop' ? 'bg-white text-[#01390f] shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Desktop Mail Preview"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      previewDevice === 'mobile' ? 'bg-white text-[#01390f] shadow-2xs' : 'text-slate-400 hover:text-slate-700'
                    }`}
                    title="Mobile Mail Preview"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Gmail Container Shell */}
              <div className="bg-slate-100 rounded-3xl p-3 sm:p-4 border border-slate-200 shadow-inner flex flex-col">
                {/* Fake Gmail Header */}
                <div className="bg-white rounded-2xl p-3 mb-3 border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <div className="truncate">
                      <strong className="text-slate-800">From:</strong> Mhira Natural &lt;marketing@mhiranatural.ph&gt;
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Just now</span>
                  </div>
                  <div className="truncate text-slate-500 text-[11px]">
                    <strong className="text-slate-800">To:</strong>{' '}
                    {targetAudience === 'ALL_CUSTOMERS'
                      ? 'All Registered VIP Customers'
                      : recipientEmail || 'customer@gmail.com'}
                  </div>
                  <div className="font-bold text-slate-900 text-xs truncate pt-0.5">
                    <strong className="text-slate-400 font-medium">Subject:</strong>{' '}
                    {campaignTitle || 'Special Offer from Mhira Natural'}
                  </div>
                </div>

                {/* Email Body Card */}
                <div
                  className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-h-[560px] overflow-y-auto custom-scrollbar transition-all ${
                    previewDevice === 'mobile' ? 'max-w-xs mx-auto text-xs' : 'w-full'
                  }`}
                >
                  {/* Brand Logo & Title */}
                  <div className="pt-6 pb-2 text-center">
                    <img
                      src="/mhira_removebg.png"
                      alt="Mhira Natural"
                      className="h-10 mx-auto mb-1.5 object-contain"
                    />
                    <div className="text-[11px] font-bold tracking-[2px] text-[#01390f] uppercase">
                      MHIRA NATURAL
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 pt-1">
                    <div className="text-center">
                      <div className="inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full bg-emerald-50 text-[#01390f] border border-emerald-200">
                        EXCLUSIVE PROMOTION
                      </div>
                    </div>

                    <h2 className="text-base font-bold text-slate-800 leading-snug text-center">
                      {headline || 'Experience Pure Botanical Luxury'}
                    </h2>

                    <div className="text-xs text-slate-600 leading-relaxed space-y-2 whitespace-pre-line text-center">
                      {bodyText || 'Your promotional campaign description will appear here.'}
                    </div>

                    {/* VOUCHER TICKET CARD */}
                    {(discountCode || discountNote) && (
                      <div
                        onClick={() => handleCopyCodeToClipboard(discountCode)}
                        className="bg-linear-to-r from-[#01390f] to-[#04611b] rounded-2xl p-4 text-white text-center space-y-2 shadow-md cursor-pointer group hover:scale-[1.01] transition-transform"
                        title="Click to copy voucher code"
                      >
                        <div className="text-[10px] font-extrabold tracking-widest text-emerald-300 uppercase">
                          LIMITED TIME SPECIAL OFFER
                        </div>
                        {discountNote && (
                          <div className="text-xs font-bold">{discountNote}</div>
                        )}
                        {discountCode && (
                          <div className="inline-block bg-white text-[#01390f] px-3.5 py-1 rounded-full font-mono text-sm font-black tracking-widest border-2 border-dashed border-[#01390f] shadow-xs group-hover:bg-emerald-50">
                            {discountCode}
                          </div>
                        )}
                        <div className="text-[10px] text-emerald-200/90 flex items-center justify-center gap-1">
                          <Copy className="w-3 h-3" />
                          <span>Click to copy voucher token</span>
                        </div>
                      </div>
                    )}

                    {/* CTA Button */}
                    <div className="text-center pt-1">
                      <div className="inline-block bg-[#01390f] hover:bg-[#01280a] text-white px-7 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer transition-transform active:scale-95">
                        {ctaText || 'Shop Collection'}
                      </div>
                    </div>

                    {/* Footer Disclaimer */}
                    <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 text-center leading-relaxed">
                      &copy; {new Date().getFullYear()} Mhira Natural Soap and Cosmetics Manufacturing. All rights reserved.<br />
                      <span className="text-[9px] text-slate-400 block mt-1">
                        Automated System Notification &bull; Confidential &bull; Please do not reply directly to this email.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DISPATCHED CAMPAIGN HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            
            {/* SEARCH & FILTER CONTROLS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex items-center flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search by subject, recipient email, or voucher code..."
                    className="w-full bg-white border border-slate-200 rounded px-2.5 pl-8 pr-7 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#01390f] h-[38px] font-normal shadow-2xs transition-colors"
                  />
                  {historySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Tag className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
                  <select
                    value={historyAudienceFilter}
                    onChange={(e) => setHistoryAudienceFilter(e.target.value)}
                    className="h-[28px] bg-white border border-slate-200 rounded-lg pl-8 pr-6 text-xs text-slate-700 focus:border-[#01390f] focus:outline-none cursor-pointer appearance-none"
                  >
                    <option value="All">All Audiences</option>
                    <option value="ALL_CUSTOMERS">Broadcast (All Customers)</option>
                    <option value="CUSTOM">Direct / Test Single</option>
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportHistoryPdf}
                  className="h-[28px] px-3 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <FileDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* HISTORY TABLE CONTAINER */}
            <div className="bg-white border-slate-200 rounded-xl border shadow-xs overflow-hidden flex flex-col">
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredHistory.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onRowsPerPageChange={(rows) => {
                  setItemsPerPage(rows);
                  setCurrentPage(1);
                }}
              />
              <div className="overflow-x-auto relative custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#01390f] text-white font-bold uppercase text-[11px] tracking-wider whitespace-nowrap">
                      <th className="py-3.5 px-4 min-w-[240px]">SUBJECT / HEADLINE</th>
                      <th className="py-3.5 px-4 min-w-[180px]">TARGET AUDIENCE</th>
                      <th className="py-3.5 px-4">VOUCHER CODE</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">DISPATCHED AT</th>
                      <th className="py-3.5 px-4 text-center">DELIVERY STATUS</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap relative sticky right-0 bg-[#01390f] z-20 shadow-[-8px_0_16px_rgba(0,0,0,0.2)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/60 before:z-30 w-28 min-w-[110px]">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400 italic">
                          {historySearchQuery || historyAudienceFilter !== 'All'
                            ? 'No logged campaigns match your search criteria.'
                            : 'No email broadcasts logged yet. Compose your first campaign in the Studio tab.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="py-3.5 px-4 bg-[#01390f]/[0.04] group-hover:bg-[#01390f]/[0.07] transition-colors">
                            <div className="font-bold text-slate-900 truncate max-w-[240px]">
                              {item.title}
                            </div>
                            {item.headline && item.headline !== item.title && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                                {item.headline}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {item.targetAudience === 'ALL_CUSTOMERS' ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 text-[11px]">
                                <Users className="w-3 h-3" /> All Customers ({item.recipientsCount || 1})
                              </span>
                            ) : (
                              <span className="text-slate-800 font-mono text-[11px] truncate max-w-[160px] inline-block">
                                {item.recipientEmail || 'Single Recipient'}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.discountCode ? (
                              <span className="font-mono font-bold text-[#01390f] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                                {item.discountCode}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">None</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(item.dispatchedAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> {item.status || 'Delivered'}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 bg-white group-hover:bg-slate-50 text-center whitespace-nowrap relative sticky right-0 z-10 shadow-[-8px_0_16px_rgba(0,0,0,0.08)] before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-slate-300 before:z-30 w-28 min-w-[110px]">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Duplicate to Composer */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateToComposer(item)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-[#01390f] hover:text-white hover:border-[#01390f] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Duplicate Campaign into Studio Composer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Record */}
                              <button
                                type="button"
                                onClick={() => setDeleteTargetHistory(item)}
                                className="w-8 h-8 rounded-full bg-white border border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Delete Record from History"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        )}
      </div>

      {/* DELETE HISTORY CONFIRMATION MODAL */}
      {deleteTargetHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-['Poppins',sans-serif]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Campaign Log?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to remove this record from your dispatch history? This only clears the log entry and will not affect already delivered customer emails.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs">
              <div className="font-bold text-slate-800 truncate">
                {deleteTargetHistory.title}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Dispatched on {new Date(deleteTargetHistory.dispatchedAt).toLocaleString()}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTargetHistory(null)}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7] whitespace-nowrap"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHistory}
                className="px-6 py-2.5 sm:py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Log</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
