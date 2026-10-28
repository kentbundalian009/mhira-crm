import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  Sparkles,
  AlertTriangle,
  Truck,
  Gift,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Copy,
  RotateCcw,
  Package,
  CloudRain,
  ExternalLink,
  ShieldCheck,
  Tag,
  Loader2
} from 'lucide-react';
import axios from '../../axios';
import { showSuccessToast, showErrorToast } from '../../utils/toast';

const API_BASE_URL =
  import.meta.env.MODE === 'production'
    ? 'https://mhira-crmsystem.onrender.com/api'
    : 'http://localhost:5000/api';

const QUICK_ORDER_TEMPLATES = [
  {
    id: 'weather-delay',
    label: 'Weather / Typhoon Delay Advisory',
    icon: CloudRain,
    type: 'WEATHER_DELAY',
    subject: (id) => `[Advisory] Severe Weather Delay Notice for Order #${id || 'XXXX'}`,
    headline: 'Shipment Advisory: Weather Delay & Safety Protocol',
    message: (name) =>
      `Dear ${name},\n\nDue to adverse weather conditions and local typhoon advisories affecting regional transport hubs, rider safety protocols have been temporarily enacted.\n\nYour Mhira Natural package is safely stored in the courier distribution warehouse. While delivery may experience a 1–2 day adjustment, rest assured your items are completely secure and will resume transit once road safety permits.\n\nThank you for your gracious understanding.`,
  },
  {
    id: 'replacement-shipped',
    label: 'Replacement Dispatched Notice',
    icon: RotateCcw,
    type: 'REPLACEMENT_DISPATCHED',
    subject: (id) => `[Mhira Logistics] Replacement Order Dispatched #${id || 'XXXX'}`,
    headline: 'Your Replacement Package is on the Way',
    message: (name) =>
      `Dear ${name},\n\nWe have reviewed and approved your return request. A brand-new replacement package has been carefully packed, quality-inspected, and handed over to our courier partner.\n\nYou can track the new shipment using the waybill details below. No additional shipping fees apply.\n\nThank you for trusting Mhira Natural.`,
  },
  {
    id: 'out-for-delivery',
    label: 'Out for Delivery / Transit Alert',
    icon: Truck,
    type: 'ORDER_UPDATE',
    subject: (id) => `[Mhira Logistics] Your Package is In Transit #${id || 'XXXX'}`,
    headline: 'Package In Transit to Your Destination',
    message: (name) =>
      `Dear ${name},\n\nGreat news! Your package has been dispatched from our central warehouse and is now moving with our courier partner.\n\nPlease prepare the exact Cash on Delivery amount if applicable upon arrival.\n\nWe hope you love your handcrafted botanical products!`,
  },
  {
    id: 'delivered-care',
    label: 'Delivered / Customer Check-in',
    icon: CheckCircle2,
    type: 'ORDER_UPDATE',
    subject: (id) => `[Mhira Logistics] Delivered! Enjoy Your Natural Care Essentials #${id || 'XXXX'}`,
    headline: 'Your Package Has Been Successfully Delivered',
    message: (name) =>
      `Dear ${name},\n\nOur records show your Mhira Natural package was delivered today. We hope your natural self-care ritual begins on a joyful note!\n\nIf you have any feedback or usage questions, our team is always ready to assist.\n\nWith gratitude,\nMhira Natural Family`,
  },
];

const QUICK_MARKETING_PRESETS = [
  {
    id: 'botanical-glow',
    label: 'Seasonal Glow & Moisture Revival',
    campaignTitle: '🌿 Revitalize Your Skin: Seasonal Moisture Revival',
    headline: 'Experience Pure Botanical Radiance',
    bodyText:
      'Indulge your skin with our pure cold-processed organic soaps, antioxidant botanical serums, and gentle botanical oils.\n\nHandcrafted in Cabuyao, Laguna in small artisanal batches for optimal active ingredient potency.',
    discountCode: 'GLOW20',
    discountNote: '20% OFF your entire botanical collection cart',
    ctaText: 'Claim Your Glow Voucher',
  },
  {
    id: 'monsoon-shield',
    label: 'Rainy Season Barrier Hydration',
    campaignTitle: '🌧️ Rainy Season Defense: Deep Barrier Hydration',
    headline: 'Protect & Nourish During Monsoon Weather',
    bodyText:
      'Rainy days and fluctuating humidity can dehydrate your skin barrier. Mhira\'s restorative botanical hydration mist and botanical repair balm lock in essential moisture without heaviness.\n\nOrder today and receive a complimentary travel-size facial essence.',
    discountCode: 'SHIELD15',
    discountNote: '15% OFF + Free Botanical Gift on checkout',
    ctaText: 'Shop Hydration Routine',
  },
  {
    id: 'vip-appreciation',
    label: 'VIP Customer Exclusive Voucher',
    campaignTitle: '💎 A Private Thank You from Mhira Natural',
    headline: 'A Private Invitation for Our Valued Client',
    bodyText:
      'As one of our most cherished customers, we invite you to experience our newest organic collection before public launch.\n\nUse your personal VIP token below for instant savings at checkout.',
    discountCode: 'VIPMHIRA',
    discountNote: '₱250 OFF on orders above ₱1,200',
    ctaText: 'Explore VIP Collection',
  },
];

export default function CustomerEmailNotificationModal({
  isOpen,
  onClose,
  initialTab = 'order',
  orderContext = null,
  onSuccess = null,
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'order' | 'marketing'

  // Order Notification State
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('Valued Customer');
  const [orderId, setOrderId] = useState('');
  const [notificationType, setNotificationType] = useState('ORDER_UPDATE');
  const [orderSubject, setOrderSubject] = useState('');
  const [orderHeadline, setOrderHeadline] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [courier, setCourier] = useState('J&T Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  // Marketing Advertisement State
  const [targetAudience, setTargetAudience] = useState('CUSTOM'); // 'CUSTOM' | 'ALL_CUSTOMERS'
  const [marketingEmail, setMarketingEmail] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [marketingHeadline, setMarketingHeadline] = useState('');
  const [marketingBody, setMarketingBody] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountNote, setDiscountNote] = useState('');
  const [ctaText, setCtaText] = useState('Shop Collection');
  const [ctaUrl, setCtaUrl] = useState('http://localhost:5173/shop');

  // Preview & Loading
  const [sending, setSending] = useState(false);
  const [previewTab, setPreviewTab] = useState('compose'); // 'compose' | 'preview' (for mobile or toggle)

  // Populate from orderContext whenever modal opens
  useEffect(() => {
    if (orderContext) {
      const email = orderContext.customerEmail || orderContext.email || '';
      const name = orderContext.customerName || orderContext.name || 'Valued Customer';
      const ordId = orderContext.orderId || orderContext._id || '';
      const cour = orderContext.courier || 'J&T Express';
      const track = orderContext.trackingNumber || '';
      const est = orderContext.estimatedDelivery || '';

      setRecipientEmail(email);
      setMarketingEmail(email);
      setRecipientName(name);
      setOrderId(ordId);
      setCourier(cour);
      setTrackingNumber(track);
      setEstimatedDelivery(est);

      // Set default template
      const defaultTpl = QUICK_ORDER_TEMPLATES[2]; // out-for-delivery
      const shortId = ordId ? ordId.slice(-8).toUpperCase() : '';
      setNotificationType(defaultTpl.type);
      setOrderSubject(defaultTpl.subject(shortId));
      setOrderHeadline(defaultTpl.headline);
      setOrderMessage(defaultTpl.message(name));
    } else {
      // Default blank/clean
      const defaultTpl = QUICK_ORDER_TEMPLATES[0];
      setNotificationType(defaultTpl.type);
      setOrderSubject(defaultTpl.subject(''));
      setOrderHeadline(defaultTpl.headline);
      setOrderMessage(defaultTpl.message('Valued Customer'));
    }

    // Default marketing template
    const defaultMkt = MARKETING_TEMPLATES[0];
    setCampaignTitle(defaultMkt.campaignTitle);
    setMarketingHeadline(defaultMkt.headline);
    setMarketingBody(defaultMkt.bodyText);
    setDiscountCode(defaultMkt.discountCode);
    setDiscountNote(defaultMkt.discountNote);
    setCtaText(defaultMkt.ctaText);
  }, [orderContext, isOpen]);

  // Sync tab if initialTab changed
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  if (!isOpen) return null;

  const handleApplyOrderTemplate = (tpl) => {
    const shortId = orderId ? orderId.slice(-8).toUpperCase() : '';
    setNotificationType(tpl.type);
    setOrderSubject(tpl.subject(shortId));
    setOrderHeadline(tpl.headline);
    setOrderMessage(tpl.message(recipientName || 'Valued Customer'));
  };

  const handleApplyMarketingTemplate = (tpl) => {
    setCampaignTitle(tpl.campaignTitle);
    setMarketingHeadline(tpl.headline);
    setMarketingBody(tpl.bodyText);
    setDiscountCode(tpl.discountCode);
    setDiscountNote(tpl.discountNote);
    setCtaText(tpl.ctaText);
  };

  const handleSendOrderNotification = async (e) => {
    e?.preventDefault();
    if (!recipientEmail || !recipientEmail.trim()) {
      showErrorToast('Recipient email is required.');
      return;
    }
    if (!orderSubject.trim()) {
      showErrorToast('Subject is required.');
      return;
    }

    try {
      setSending(true);
      const payload = {
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName.trim(),
        orderId: orderId.trim(),
        notificationType,
        subject: orderSubject.trim(),
        headline: orderHeadline.trim(),
        message: orderMessage.trim(),
        courier: courier.trim(),
        trackingNumber: trackingNumber.trim(),
        estimatedDelivery: estimatedDelivery.trim(),
        actionUrl: `http://localhost:5173/orders`,
        actionText: 'View My Orders & Track',
      };

      const res = await axios.post(`${API_BASE_URL}/notifications/order`, payload);
      if (res.data?.success) {
        showSuccessToast(`Email notification dispatched to ${recipientEmail} via Gmail! 🚀`);
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        showErrorToast(res.data?.message || 'Failed to dispatch email.');
      }
    } catch (err) {
      console.error('Error dispatching email:', err);
      showErrorToast(err.response?.data?.message || 'Network error sending notification.');
    } finally {
      setSending(false);
    }
  };

  const handleSendMarketingAd = async (e) => {
    e?.preventDefault();
    if (targetAudience === 'CUSTOM' && (!marketingEmail || !marketingEmail.trim())) {
      showErrorToast('Recipient email is required for custom audience.');
      return;
    }
    if (!campaignTitle.trim()) {
      showErrorToast('Campaign subject/title is required.');
      return;
    }

    try {
      setSending(true);
      const payload = {
        targetAudience,
        recipientEmail: targetAudience === 'CUSTOM' ? marketingEmail.trim() : undefined,
        campaignTitle: campaignTitle.trim(),
        headline: marketingHeadline.trim(),
        bodyText: marketingBody.trim(),
        discountCode: discountCode.trim(),
        discountNote: discountNote.trim(),
        ctaText: ctaText.trim(),
        ctaUrl: ctaUrl.trim(),
      };

      const res = await axios.post(`${API_BASE_URL}/notifications/marketing`, payload);
      if (res.data?.success) {
        showSuccessToast(res.data.message || 'Marketing campaign delivered to customer inbox! ✨');
        if (onSuccess) onSuccess(res.data);
        onClose();
      } else {
        showErrorToast(res.data?.message || 'Failed to dispatch marketing email.');
      }
    } catch (err) {
      console.error('Error sending marketing email:', err);
      showErrorToast(err.response?.data?.message || 'Network error sending marketing email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl flex flex-col border border-slate-200/80 overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-linear-to-r from-[#01390f] via-[#054d19] to-[#01390f] px-6 py-4.5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Mail className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Customer Email Dispatch & Marketing Desk
                </h3>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Gmail Connected
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Dispatch official logistics advisories, weather delays, return resolutions, or promotional campaigns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRIMARY TABS: ORDER ADVISORY VS MARKETING AD */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('order')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'order'
                  ? 'bg-[#01390f] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Logistics & Order Advisory</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('marketing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'marketing'
                  ? 'bg-[#01390f] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Gift className="w-3.5 h-3.5 text-amber-300" />
              <span>Marketing & Email Advertisement</span>
            </button>
          </div>

          {/* Quick toggle preview on smaller screens */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-semibold text-slate-600 lg:hidden">
            <button
              type="button"
              onClick={() => setPreviewTab('compose')}
              className={`px-3 py-1 rounded-md ${previewTab === 'compose' ? 'bg-[#01390f] text-white' : ''}`}
            >
              Compose
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('preview')}
              className={`px-3 py-1 rounded-md ${previewTab === 'preview' ? 'bg-[#01390f] text-white' : ''}`}
            >
              Live Preview
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT: TWO-COLUMN LAYOUT (COMPOSE + LIVE PREVIEW) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* LEFT COLUMN: COMPOSE FORM */}
          <div
            className={`lg:col-span-6 space-y-4 ${
              previewTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* TAB 1: ORDER NOTIFICATION COMPOSER */}
            {activeTab === 'order' && (
              <form onSubmit={handleSendOrderNotification} className="space-y-4">
                
                {/* Quick Templates Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>One-Click Smart Templates</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ORDER_TEMPLATES.map((tpl) => {
                      const Icon = tpl.icon;
                      const isSelected = notificationType === tpl.type;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleApplyOrderTemplate(tpl)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#01390f] bg-emerald-50 text-[#01390f] shadow-2xs font-bold'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#01390f]' : 'text-slate-400'}`} />
                          <span className="truncate">{tpl.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recipient Coordinates */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Customer Email (Gmail) *
                      </label>
                      <input
                        type="email"
                        required
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="customer@gmail.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Customer Name
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Maria Clara"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Order Ref ID
                      </label>
                      <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        placeholder="e.g. 64b2..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Courier Partner
                      </label>
                      <select
                        value={courier}
                        onChange={(e) => setCourier(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-800 font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                      >
                        <option value="J&T Express">J&T Express</option>
                        <option value="Ninja Van">Ninja Van</option>
                        <option value="Flash Express">Flash Express</option>
                        <option value="Lalamove">Lalamove</option>
                        <option value="SPX Express">SPX Express</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Waybill / Tracking No.
                      </label>
                      <input
                        type="text"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="JT94829104820"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Estimated Delivery Window (Visible to Customer)
                    </label>
                    <input
                      type="text"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      placeholder="e.g. Aug 28 - 30 (Adjusted due to Typhoon Carina)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:border-[#01390f] outline-none"
                    />
                  </div>
                </div>

                {/* Email Subject & Content */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Email Subject Line *
                    </label>
                    <input
                      type="text"
                      required
                      value={orderSubject}
                      onChange={(e) => setOrderSubject(e.target.value)}
                      placeholder="Shipment Update for Order #..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Header Banner Title
                    </label>
                    <input
                      type="text"
                      value={orderHeadline}
                      onChange={(e) => setOrderHeadline(e.target.value)}
                      placeholder="Shipment Advisory: Weather Delay & Safety Protocol"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:border-[#01390f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Custom Message Body
                    </label>
                    <textarea
                      rows={5}
                      value={orderMessage}
                      onChange={(e) => setOrderMessage(e.target.value)}
                      placeholder="Write advisory or shipment notes here..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-[#01390f] outline-none leading-relaxed"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-2.5 sm:py-3 px-6 rounded-full font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{sending ? 'Dispatching to Gmail...' : 'Send Order Advisory to Customer'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: MARKETING ADVERTISEMENT COMPOSER */}
            {activeTab === 'marketing' && (
              <form onSubmit={handleSendMarketingAd} className="space-y-4">
                
                {/* Marketing Templates */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pre-Crafted Marketing Campaigns</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {MARKETING_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyMarketingTemplate(tpl)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-left hover:border-[#01390f] hover:bg-emerald-50/50 transition-all text-xs cursor-pointer shadow-2xs"
                      >
                        <div className="font-bold text-slate-800 truncate text-[11px]">{tpl.label}</div>
                        <div className="text-[10px] text-emerald-700 font-mono mt-0.5">{tpl.discountCode}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Audience */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Campaign Target Audience
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          targetAudience === 'CUSTOM'
                            ? 'border-[#01390f] bg-emerald-50 text-[#01390f]'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="targetAudience"
                          value="CUSTOM"
                          checked={targetAudience === 'CUSTOM'}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          className="accent-[#01390f]"
                        />
                        <span>Single Customer Email</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          targetAudience === 'ALL_CUSTOMERS'
                            ? 'border-[#01390f] bg-emerald-50 text-[#01390f]'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="targetAudience"
                          value="ALL_CUSTOMERS"
                          checked={targetAudience === 'ALL_CUSTOMERS'}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          className="accent-[#01390f]"
                        />
                        <span>Broadcast to All Customers</span>
                      </label>
                    </div>
                  </div>

                  {targetAudience === 'CUSTOM' && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Recipient Gmail Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={marketingEmail}
                        onChange={(e) => setMarketingEmail(e.target.value)}
                        placeholder="customer@gmail.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Campaign Copy & Discount */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Email Subject / Campaign Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={campaignTitle}
                      onChange={(e) => setCampaignTitle(e.target.value)}
                      placeholder="✨ Exclusive Weekend Secret: 20% Off Natural Elixirs"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Hero Headline
                    </label>
                    <input
                      type="text"
                      value={marketingHeadline}
                      onChange={(e) => setMarketingHeadline(e.target.value)}
                      placeholder="Unlock Radiant Skin with Pure Botanical Luxury"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:bg-white focus:border-[#01390f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Promotional Story / Body Copy
                    </label>
                    <textarea
                      rows={4}
                      value={marketingBody}
                      onChange={(e) => setMarketingBody(e.target.value)}
                      placeholder="Highlight botanical ingredients, benefits, limited stock..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:border-[#01390f] outline-none leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Voucher Code (Optional)
                      </label>
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                        placeholder="e.g. BOTANICAL20"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold tracking-wider focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Promo Tagline
                      </label>
                      <input
                        type="text"
                        value={discountNote}
                        onChange={(e) => setDiscountNote(e.target.value)}
                        placeholder="20% OFF Site-wide + Free Shipping"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        CTA Button Label
                      </label>
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="Shop Now"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                        Destination Link
                      </label>
                      <input
                        type="text"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        placeholder="http://localhost:5173/shop"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:bg-white focus:border-[#01390f] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-[#01390f] hover:bg-[#0a5219] text-white py-2.5 sm:py-3 px-6 rounded-full font-bold text-[12px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>
                      {sending
                        ? 'Broadcasting Campaign...'
                        : targetAudience === 'ALL_CUSTOMERS'
                        ? 'Broadcast Advertisement to All Customers'
                        : 'Send Advertisement to Customer'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* RIGHT COLUMN: LIVE GMAIL EMAIL PREVIEW */}
          <div
            className={`lg:col-span-6 flex flex-col ${
              previewTab === 'compose' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <Eye className="w-4 h-4 text-emerald-600" />
                <span>Live Customer Gmail Preview</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Responsive View</span>
            </div>

            {/* Email Shell simulating Gmail / Apple Mail */}
            <div className="bg-slate-200/90 rounded-3xl p-3 sm:p-4 border border-slate-300 shadow-inner flex-1 flex flex-col overflow-hidden">
              {/* Fake Gmail Header Bar */}
              <div className="bg-white rounded-2xl p-3 mb-3 border border-slate-200/90 shadow-2xs space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <div className="truncate">
                    <strong className="text-slate-800">From:</strong> Mhira Natural &lt;logistics@mhiranatural.ph&gt;
                  </div>
                  <span className="text-[10px] font-mono">Just now</span>
                </div>
                <div className="truncate text-slate-500 text-[11px]">
                  <strong className="text-slate-800">To:</strong>{' '}
                  {activeTab === 'order'
                    ? recipientEmail || 'customer@gmail.com'
                    : targetAudience === 'ALL_CUSTOMERS'
                    ? 'All Registered VIP Customers'
                    : marketingEmail || 'customer@gmail.com'}
                </div>
                <div className="font-bold text-slate-900 text-xs truncate pt-0.5">
                  <strong className="text-slate-500 font-semibold">Subject:</strong>{' '}
                  {activeTab === 'order'
                    ? orderSubject || 'Shipment Advisory'
                    : campaignTitle || 'Exclusive Offer from Mhira Natural'}
                </div>
              </div>

              {/* Email Body Card */}
              <div className="bg-white rounded-[24px] border border-slate-200 shadow-md overflow-y-auto max-h-[520px] flex-1">
                {/* Brand Logo & Title matching Login.jsx */}
                <div className="pt-6 pb-2 text-center">
                  <img
                    src="/mhira_removebg.png"
                    alt="Mhira Natural"
                    className="h-11 mx-auto mb-1.5 object-contain"
                  />
                  <div className="text-xs font-bold tracking-[2px] text-[#01390f] uppercase">
                    MHIRA NATURAL
                  </div>
                </div>

                {/* Email Body Contents */}
                <div className="p-6 space-y-4 pt-1">
                  {/* Category Pill */}
                  <div className="text-center">
                    <div className="inline-block text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f0fdf4] text-[#01390f] border border-[#bbf7d0]">
                      {activeTab === 'order'
                        ? notificationType === 'WEATHER_DELAY'
                          ? 'LOGISTICS ADVISORY'
                          : notificationType === 'REPLACEMENT_DISPATCHED'
                          ? 'REPLACEMENT DISPATCHED'
                          : notificationType === 'RETURN_APPROVED'
                          ? 'RETURN RESOLUTION'
                          : 'ORDER DISPATCH UPDATE'
                        : 'EXCLUSIVE PROMOTION'}
                    </div>
                  </div>

                  {/* Title / Headline */}
                  <h2 className="text-base sm:text-lg font-bold text-gray-800 leading-snug text-center">
                    {activeTab === 'order'
                      ? orderHeadline || 'Shipment Update'
                      : marketingHeadline || 'Experience Pure Botanical Luxury'}
                  </h2>

                  {/* Message Paragraphs */}
                  <div className="text-xs text-slate-600 leading-relaxed space-y-2 whitespace-pre-line text-center">
                    {activeTab === 'order'
                      ? orderMessage || 'Your package update will appear here.'
                      : marketingBody || 'Your promotional campaign text will appear here.'}
                  </div>

                  {/* ORDER DETAILS BOX (Only in Order tab) */}
                  {activeTab === 'order' && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs text-left">
                      {orderId && (
                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Order ID</span>
                          <span className="font-mono font-bold text-[#01390f]">
                            #{orderId.slice(-8).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Courier Partner</span>
                        <span className="font-semibold text-slate-800">{courier}</span>
                      </div>
                      {trackingNumber && (
                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Waybill / Tracking</span>
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-full border border-slate-300">
                            {trackingNumber}
                          </span>
                        </div>
                      )}
                      {estimatedDelivery && (
                        <div className="flex justify-between items-center pt-0.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500">Estimated Delivery</span>
                          <span className="font-bold text-emerald-800">{estimatedDelivery}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MARKETING PROMO CARD (Only in Marketing tab) */}
                  {activeTab === 'marketing' && (discountCode || discountNote) && (
                    <div className="bg-gradient-to-r from-[#01390f] to-[#04611b] rounded-2xl p-4 text-white text-center space-y-2 shadow-sm">
                      <div className="text-[10px] font-bold tracking-widest text-[#a3e635] uppercase">
                        LIMITED TIME OFFER
                      </div>
                      {discountNote && <div className="text-xs font-bold">{discountNote}</div>}
                      {discountCode && (
                        <div className="inline-block bg-white text-[#01390f] px-4 py-1.5 rounded-full font-mono text-sm font-extrabold tracking-widest border-2 border-dashed border-[#01390f]">
                          {discountCode}
                        </div>
                      )}
                      <div className="text-[10px] text-emerald-200/90">Apply at checkout to redeem savings</div>
                    </div>
                  )}

                  {/* CTA BUTTON */}
                  <div className="text-center pt-2">
                    <div className="inline-block bg-[#01390f] text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-wider shadow-md cursor-default">
                      {activeTab === 'order' ? 'Track Order Details' : ctaText || 'Explore Mhira Natural'}
                    </div>
                  </div>

                  {/* Footer disclaimer */}
                  <div className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 text-center leading-relaxed">
                    &copy; {new Date().getFullYear()} Mhira Natural Soap and Cosmetics Manufacturing. All rights reserved.<br />
                    <span className="text-[9px] text-slate-300 block mt-1">Automated System Notification &bull; Confidential &bull; Please do not reply directly to this email.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
