import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios, { API, getImageUrl, getBackendMediaUrl } from '../../axios';
import {
  Sparkles,
  ShoppingBag,
  Star,
  ArrowRight,
  ShieldCheck,
  Tag,
  X,
  Megaphone,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize,
  Minimize
} from 'lucide-react';

import HeaderContainer from '../common/HeaderContainer';
import Footer from '../common/Footer';
import { showSuccessToast, showErrorToast } from "../../utils/toast";
import { getUserId } from "../../utils/userId";
import { subscribeLiveSync } from "../../utils/liveSync";

// Default Instant Fallback Data (Guarantees 0ms initial render even before Render wakes up)
export const DEFAULT_HOME_SECTIONS_RAW = [
  {
    sectionName: 'carousel',
    title: 'Uncomplicated Natural Beauty',
    text: 'Uncomplicated, multi-use products designed to simplify your routine.',
    images: ['/uploads/images-1787841936081.mp4'],
    order: 0,
  },
  {
    sectionName: 'ads-i',
    title: 'Organic Summer Glow Collection',
    text: 'Experience pure botanical luxury with cold-pressed coconut & papaya extracts.',
    images: ['/uploads/images-1787841699206.jpg'],
    order: 1,
  },
  {
    sectionName: 'ads-ii',
    title: 'Handcrafted With Pure Botanicals',
    text: 'Non-toxic, cruelty-free, and ethically formulated for all skin types.',
    images: ['/uploads/images-1787841704908.jpg'],
    order: 2,
  },
  {
    sectionName: 'popup-ad',
    title: 'Special Promotion Announcement 🌿',
    text: 'Discover our latest organic handcrafted skin care collections & special promotional discounts today!',
    images: ['/uploads/images-1787841610736.webp'],
    order: 3,
  },
  {
    sectionName: 'navbar-promo',
    title: 'Announcement:',
    text: 'Current pricing and offers end 8/11/2026 at 11:59 PM ET / 8:59 PM PT — Grab your organic favorites now! 🌿',
    images: ['/uploads/images-1787841679579.webp'],
    order: 4,
  },
];

export const DEFAULT_HOME_SECTIONS_MAP = DEFAULT_HOME_SECTIONS_RAW.reduce((acc, curr) => {
  acc[curr.sectionName] = curr;
  return acc;
}, {});

// Helper function para alamin kung video ang URL
const isVideoFile = (url = '') => {
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(url) || url.startsWith('data:video');
};

// Helper para ma-validate ang totoong image path (hindi dummy "banner")
const isValidMedia = (url = '') => {
  return url && url.trim() !== '' && url !== 'banner' && url.length > 4;
};

function Home() {
  const navigate = useNavigate();
  const [sectionsRaw, setSectionsRaw] = useState(() => {
    try {
      const cached = localStorage.getItem('mhira_db_sections_raw');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_HOME_SECTIONS_RAW;
  });

  const [sections, setSections] = useState(() => {
    try {
      const cached = localStorage.getItem('mhira_db_sections');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_HOME_SECTIONS_MAP;
  });

  const [featuredProducts, setFeaturedProducts] = useState(() => {
    try {
      const cached = localStorage.getItem('mhira_db_products');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupImgError, setPopupImgError] = useState(false);

  // Watch Video Modal state & refs
  const [isWatchModalOpen, setIsWatchModalOpen] = useState(false);
  const [modalVideoSrc, setModalVideoSrc] = useState('');
  const [isModalPlaying, setIsModalPlaying] = useState(true);
  const [isModalMuted, setIsModalMuted] = useState(false);
  const [modalCurrentTime, setModalCurrentTime] = useState(0);
  const [modalDuration, setModalDuration] = useState(0);
  const modalVideoRef = useRef(null);
  const modalContainerRef = useRef(null);

  const videoRefs = useRef({});

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  const API_BASE_URL =
    !isLocalhost || import.meta.env.PROD || import.meta.env.MODE === 'production'
      ? 'https://mhira-crmsystem.onrender.com'
      : 'http://localhost:5000';

  const fetchHomeData = async () => {
    try {
      const sectionsRes = await API.get('/api/sections');
      const secData = sectionsRes?.data;
      const rawSections = Array.isArray(secData) ? secData : (secData?.sections || secData?.items || secData?.data || []);
      if (rawSections.length > 0) {
        setSectionsRaw(rawSections);
        const mapped = rawSections.reduce((acc, curr) => {
          if (curr && curr.sectionName) acc[curr.sectionName] = curr;
          return acc;
        }, {});
        setSections(mapped);
        try {
          localStorage.setItem('mhira_db_sections_raw', JSON.stringify(rawSections));
          localStorage.setItem('mhira_db_sections', JSON.stringify(mapped));
        } catch (e) {}
      }
    } catch (err) {
      console.error("Fetch Error on Home Page:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();

    // Real-time Database Sync Listener (Tab-to-Tab & Admin-to-Customer)
    const unsubscribe = subscribeLiveSync(() => {
      fetchHomeData();
    });

    const handleWindowFocus = () => {
      fetchHomeData();
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchHomeData();
    });

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const carouselData = sections['carousel'] || {};
  const rawCarouselImages = (carouselData.images || []).filter(isValidMedia);

  const heroImages = rawCarouselImages;

  // Dynamic Promotional Campaign Ads (Follows Drag & Drop sequence from Admin!)
  const promotionalAds = useMemo(() => {
    const adsMetaMap = {
      'ads-i': {
        badge: 'Special Offer',
        defaultTitle: 'Pure Botanical Care Your Skin Truly Deserves.',
        defaultText: 'Discover the transformative power of nature. Formulated with 100% plant-based ingredients and zero harsh chemicals, Mhira Natural nourishes, protects, and restores your skin’s healthy, authentic radiance every single day.'
      },
      'ads-ii': {
        badge: 'Secondary Campaign',
        defaultTitle: 'Handcrafted with Precision & Care',
        defaultText: 'Pure ingredients thoughtfully formulated to nourish your body safely and naturally.'
      }
    };

    // Filter promo ad sections from sorted backend list (exclude deprecated sections)
    const candidateSections = sectionsRaw.filter(
      (sec) => sec.sectionName && sec.sectionName.startsWith('ads-') && sec.sectionName !== 'ads-iii' && sec.sectionName !== 'ads-iv' && sec.sectionName !== 'featured'
    );

    // Fallback if empty
    const activeList = candidateSections.length > 0
      ? candidateSections
      : ['ads-i', 'ads-ii'].map((k) => sections[k]).filter(Boolean);

    return activeList
      .map((ad, index) => {
        if (!ad) return null;
        const validImgs = (ad.images || []).filter(isValidMedia);

        // RULE: 0 Media Items = DO NOT SHOW on Customer Home!
        if (validImgs.length === 0) {
          return null;
        }

        const key = ad.sectionName;
        const fallback = adsMetaMap[key] || {
          badge: `Campaign 0${index + 1}`,
          defaultTitle: 'Pure Botanical Care Your Skin Truly Deserves.',
          defaultText: 'Discover our limited-time special curation designed to revitalize your daily skincare routine.'
        };

        return {
          sectionName: key,
          badge: fallback.badge,
          title: ad.title || fallback.defaultTitle,
          text: ad.text || fallback.defaultText,
          images: validImgs
        };
      })
      .filter(Boolean);
  }, [sectionsRaw, sections]);

  // Pop-Up Ad Trigger Logic
  const popupData = sections['popup-ad'] || {};
  const rawPopupImages = (popupData.images || []).filter(isValidMedia);
  const popupText =
    popupData.text && popupData.text !== "Discover our latest organic handcrafted skin care collections & special promotional discounts today!"
      ? popupData.text
      : "Brighten, Smooth & Refresh Your Skin Naturally";

  useEffect(() => {
    if (!sections || Object.keys(sections).length === 0) return;
    const currentPopup = sections['popup-ad'];
    if (!currentPopup) return;

    const validImages = (currentPopup.images || []).filter(isValidMedia);
    const hasMedia = validImages.length > 0;
    const hasContent =
      (currentPopup.title && currentPopup.title.trim() !== '') ||
      (currentPopup.text && currentPopup.text.trim() !== '');

    if (!hasMedia && !hasContent) return;

    const token = localStorage.getItem('token');
    let userRole = 'Customer';
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        userRole = u?.role || 'Customer';
      }
    } catch (e) {}

    // Staff roles do not need customer promotional pop-ups
    const staffRoles = ['Admin', 'Inventory', 'Marketing', 'Logistic'];
    if (token && staffRoles.includes(userRole)) {
      return;
    }

    if (!token) {
      // 1. Guest user: Lalabas isang beses lang pag nag-open yung link ng /
      let guestSeen = false;
      try {
        guestSeen = sessionStorage.getItem('mhira_special_offer_guest_seen') === 'true';
      } catch (e) {}

      if (!guestSeen) {
        try {
          sessionStorage.setItem('mhira_special_offer_guest_seen', 'true');
        } catch (e) {}
        const timer = setTimeout(() => {
          setIsPopupOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } else {
      // 2. Logged-in user: Lalabas after mag-login ng user, isang beses lang pag login
      let showOnLogin = false;
      try {
        showOnLogin = sessionStorage.getItem('mhira_show_offer_on_login') === 'true';
      } catch (e) {}

      if (showOnLogin) {
        try {
          sessionStorage.removeItem('mhira_show_offer_on_login');
        } catch (e) {}
        const timer = setTimeout(() => {
          setIsPopupOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [sections]);

  // Video playback control on slide change or isPlaying toggle
  useEffect(() => {
    const currentMedia = heroImages[currentSlide];
    const isVideo = isVideoFile(currentMedia);
    const activeVideo = videoRefs.current[currentSlide];

    if (isVideo && activeVideo) {
      if (isPlaying) {
        activeVideo.currentTime = 0;
        activeVideo.play().catch(() => { });
      } else {
        activeVideo.pause();
      }
    }
  }, [currentSlide, isPlaying, heroImages]);

  // Carousel Auto-play / Timer Logic
  useEffect(() => {
    if (heroImages.length <= 1 || !isPlaying) return;

    const currentMedia = heroImages[currentSlide];
    const isVideo = isVideoFile(currentMedia);

    // Kung video, hayaang tapusin ang video (onEnded will trigger next slide)
    if (isVideo) {
      return;
    }

    // Kung image, mag-advance matapos ang 5 segundo
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentSlide, isPlaying, heroImages]);

  const handleVideoEnded = () => {
    if (isPlaying && heroImages.length > 1) {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => {
      const nextState = !prev;
      const activeVideo = videoRefs.current[currentSlide];
      if (activeVideo) {
        if (nextState) {
          activeVideo.play().catch(() => { });
        } else {
          activeVideo.pause();
        }
      }
      return nextState;
    });
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleOpenWatchModal = () => {
    const currentMedia = heroImages[currentSlide];
    let targetSrc = '';

    if (isVideoFile(currentMedia)) {
      targetSrc = getImageUrl(currentMedia);
    } else {
      const foundVideo = heroImages.find(isVideoFile);
      if (foundVideo) {
        targetSrc = getImageUrl(foundVideo);
      } else {
        return;
      }
    }

    setModalVideoSrc(targetSrc);
    setIsWatchModalOpen(true);
    setIsModalPlaying(true);
    setIsModalMuted(false);
  };

  const handleCloseWatchModal = () => {
    setIsWatchModalOpen(false);
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
    }
  };

  const handleModalTogglePlay = () => {
    if (modalVideoRef.current) {
      if (isModalPlaying) {
        modalVideoRef.current.pause();
        setIsModalPlaying(false);
      } else {
        modalVideoRef.current.play();
        setIsModalPlaying(true);
      }
    }
  };

  const handleModalToggleMute = () => {
    if (modalVideoRef.current) {
      modalVideoRef.current.muted = !isModalMuted;
      setIsModalMuted(!isModalMuted);
    }
  };

  const handleModalTimeUpdate = () => {
    if (modalVideoRef.current) {
      setModalCurrentTime(modalVideoRef.current.currentTime);
      setModalDuration(modalVideoRef.current.duration || 0);
    }
  };

  const handleModalSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (modalVideoRef.current) {
      modalVideoRef.current.currentTime = seekTime;
      setModalCurrentTime(seekTime);
    }
  };

  const handleModalFullscreen = () => {
    if (modalContainerRef.current) {
      if (!document.fullscreenElement) {
        modalContainerRef.current.requestFullscreen().catch(() => { });
      } else {
        document.exitFullscreen().catch(() => { });
      }
    }
  };

  const handleAddToCart = async (e, product) => {
    if (e) e.stopPropagation();
    const userId = getUserId();
    const productId = String(product._id || product.id || product.code);

    // 1. Update cached_cart_items immediately
    try {
      const stored = localStorage.getItem("cached_cart_items");
      let currentCart = stored ? JSON.parse(stored) : [];
      const idx = currentCart.findIndex(i => String(i.product?._id || i.product?.id || i.product?.code || i.product) === productId);
      if (idx > -1) {
        currentCart[idx].quantity = (Number(currentCart[idx].quantity) || 0) + 1;
      } else {
        currentCart.push({ product, quantity: 1 });
      }
      localStorage.setItem("cached_cart_items", JSON.stringify(currentCart));
    } catch (e) {}

    // 2. 0ms INSTANT FEEDBACK
    showSuccessToast(`Added ${product.itemDescription || product.itemName || "Product"} to your cart.`);
    window.dispatchEvent(new CustomEvent("itemAddedToBag", { detail: { product, quantity: 1 } }));
    window.dispatchEvent(new Event("cartUpdated"));

    try {
      const res = await axios.post(`${API_BASE_URL}/api/cart/add`, {
        userId: userId,
        productId: productId,
        quantity: 1,
        product: product
      });
      if (res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
        localStorage.setItem("cached_cart_items", JSON.stringify(res.data.items));
        window.dispatchEvent(new Event("cartUpdated"));
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  const displayProductsList = featuredProducts.slice(0, 4);

  // Render page immediately without full-screen blocking loader for instant loading speed

  return (
    <div className="bg-white min-h-screen font-['Poppins',sans-serif] text-slate-800 flex flex-col antialiased">

      <HeaderContainer />

      {/* SECTION 1: HERO CAROUSEL BANNER */}
      {heroImages.length > 0 ? (
        <section className="relative w-full h-[540px] md:h-[650px] bg-slate-950 overflow-hidden shrink-0">
          {heroImages.map((imgUrl, idx) => {
            const fullImgPath = getImageUrl(imgUrl);
            const isVideo = isVideoFile(imgUrl);

            return (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                  }`}
              >
                {isVideo ? (
                  <video
                    ref={(el) => (videoRefs.current[idx] = el)}
                    src={fullImgPath}
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                    poster="/uploads/images-1787841699206.jpg"
                    onEnded={handleVideoEnded}
                    onError={(e) => {
                      if (!e.currentTarget.dataset.retriedBackend) {
                        e.currentTarget.dataset.retriedBackend = 'true';
                        e.currentTarget.src = getBackendMediaUrl(imgUrl);
                      }
                    }}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <img
                    src={fullImgPath}
                    alt={`Hero Slide ${idx + 1}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    fetchPriority={idx === 0 ? "high" : "auto"}
                    decoding="async"
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      if (!e.currentTarget.dataset.retriedBackend) {
                        e.currentTarget.dataset.retriedBackend = 'true';
                        e.currentTarget.src = getBackendMediaUrl(imgUrl);
                      } else if (!e.currentTarget.dataset.fallback) {
                        e.currentTarget.dataset.fallback = 'true';
                        e.currentTarget.src = '/mhira_removebg.png';
                        e.currentTarget.className = 'w-full h-full object-contain p-12 bg-slate-900';
                      }
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20 pointer-events-none" />
              </div>
            );
          })}

          {/* HERO CENTER CONTENT (NIKE STYLE: LOWER CENTER, BOLD HEADLINE, SUBTEXT, WATCH BUTTON) */}
          <div className="absolute inset-0 z-20 flex flex-col justify-end items-center text-center px-4 sm:px-6 pb-20 sm:pb-24 max-w-4xl mx-auto pointer-events-none">
            {(() => {
              const currentMedia = heroImages[currentSlide];
              const slideDetail = (carouselData.slideDetails || []).find((s) => s && s.image === currentMedia)
                || (carouselData.slideDetails || [])[currentSlide]
                || {};
              const slideTitle = slideDetail.title !== undefined ? slideDetail.title?.trim() : (carouselData.title || "");
              const slideText = slideDetail.text !== undefined ? slideDetail.text?.trim() : (carouselData.text || "");

              if (!slideTitle && !slideText) return null;

              return (
                <div key={currentSlide} className="animate-fadeIn w-full flex flex-col items-center">
                  {slideTitle && (
                    <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-5xl font-black text-white tracking-tight drop-shadow-2xl uppercase leading-none">
                      {slideTitle}
                    </h1>
                  )}
                  {slideText && (
                    <p className="text-white/95 text-xs sm:text-sm md:text-base mt-3 sm:mt-4 max-w-2xl drop-shadow-lg leading-relaxed font-medium">
                      {slideText}
                    </p>
                  )}
                </div>
              );
            })()}

            {isVideoFile(heroImages[currentSlide]) && (
              <div className="mt-5 sm:mt-6 pointer-events-auto">
                <button
                  onClick={handleOpenWatchModal}
                  className="px-7 py-2.5 sm:py-3 bg-white hover:bg-slate-200 text-black text-xs sm:text-sm font-bold uppercase rounded-full shadow-2xl transition-all duration-300 active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span>Watch</span>
                  <Play size={13} className="fill-black text-black ml-0.5" />
                </button>
              </div>
            )}
          </div>

          {/* CENTER BOTTOM SLIDE DOTS (NIKE STYLE) */}
          {heroImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
              {heroImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                    }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* BOTTOM RIGHT CONTROLS: PAUSE/PLAY, PREV, NEXT (NIKE STYLE) */}
          {heroImages.length > 1 && (
            <div className="absolute bottom-6 right-6 md:right-10 z-30 flex items-center gap-2.5 pointer-events-auto">
              {/* Pause / Play Button */}
              <button
                type="button"
                onClick={togglePlayPause}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                title={isPlaying ? "Pause carousel" : "Play carousel"}
              >
                {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
              </button>

              {/* Prev Button */}
              <button
                type="button"
                onClick={handlePrevSlide}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                title="Previous slide"
              >
                <ChevronLeft size={18} />
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNextSlide}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white border border-white/20 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                title="Next slide"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="relative w-full py-20 md:py-28 bg-gradient-to-br from-emerald-950 via-slate-900 to-black overflow-hidden shrink-0 flex items-center justify-center text-center px-6">
          <div className="relative z-20 flex flex-col justify-center items-center max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-2xl uppercase leading-none">
              {carouselData.title || "Mhira Natural Soap & Cosmetics"}
            </h1>
            <p className="text-white/90 text-xs sm:text-sm md:text-base mt-3 sm:mt-4 max-w-2xl drop-shadow-lg leading-relaxed font-medium">
              {carouselData.text || "Pure botanical formulas created to nourish, protect, and illuminate your natural skin glow."}
            </p>
          </div>
        </section>
      )}

      {/* SECTION 2: PROMOTIONAL CAMPAIGNS (DYNAMIC REUSABLE ALTERNATING TEMPLATES) */}
      {promotionalAds.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-8 py-12 md:py-20 w-full bg-white space-y-16 md:space-y-24">
          {promotionalAds.map((ad, idx) => {
            const isReversed = idx % 2 !== 0;
            const validImages = ad.images || [];
            const rawUrl = validImages[0];
            const mediaUrl = getImageUrl(rawUrl);
            const isVideo = isVideoFile(mediaUrl);

            return (
              <div
                key={ad.sectionName || idx}
                className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center justify-between gap-8 md:gap-14 bg-white`}
              >
                {/* Media Side (Left if even, Right if odd) */}
                <div className="w-full md:w-1/2 h-[340px] sm:h-[420px] md:h-[480px] bg-slate-100 overflow-hidden relative shadow-xs rounded-none">
                  {isVideo ? (
                    <video
                      src={mediaUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.retriedBackend) {
                          e.currentTarget.dataset.retriedBackend = 'true';
                          e.currentTarget.src = getBackendMediaUrl(rawUrl);
                        }
                      }}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt={ad.title || "Campaign Promotion"}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center transition-opacity duration-300"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.retriedBackend) {
                          e.currentTarget.dataset.retriedBackend = 'true';
                          e.currentTarget.src = getBackendMediaUrl(rawUrl);
                        } else if (!e.currentTarget.dataset.fallback) {
                          e.currentTarget.dataset.fallback = 'true';
                          e.currentTarget.src = '/mhira_removebg.png';
                          e.currentTarget.className = 'w-full h-full object-contain p-8 bg-slate-50';
                        }
                      }}
                    />
                  )}
                </div>

                {/* Text Content Side */}
                <div className="w-full md:w-1/2 flex flex-col justify-center items-start py-4">
                  <span className="text-xs font-bold text-[#246C94] uppercase mb-2 tracking-wider">
                    {ad.badge}
                  </span>
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#243746] uppercase tracking-tight leading-tight">
                    {ad.title}
                  </h2>
                  {ad.text && (
                    <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-4 max-w-lg leading-relaxed">
                      {ad.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* POP-UP SPECIAL OFFER MODAL */}
      {isPopupOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPopupOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 md:p-6 overflow-hidden font-poppins animate-fadeIn"
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto transition-all animate-in fade-in zoom-in-95 duration-200">

            {/* Poster Media (Image only, X button inside image) */}
            <div className="w-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
              {/* Close Button Inside the Image */}
              <button
                type="button"
                onClick={() => setIsPopupOpen(false)}
                className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              {rawPopupImages.length > 0 && !popupImgError ? (
                isVideoFile(rawPopupImages[0]) ? (
                  <video
                    src={getImageUrl(rawPopupImages[0])}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-auto max-h-[380px] object-cover"
                    onError={(e) => {
                      if (!e.currentTarget.dataset.retriedBackend) {
                        e.currentTarget.dataset.retriedBackend = 'true';
                        e.currentTarget.src = getBackendMediaUrl(rawPopupImages[0]);
                      } else {
                        setPopupImgError(true);
                      }
                    }}
                  />
                ) : (
                  <img
                    src={getImageUrl(rawPopupImages[0])}
                    alt="Special Offer"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto max-h-[380px] object-cover cursor-pointer"
                    onClick={() => {
                      setIsPopupOpen(false);
                      navigate("/collection");
                    }}
                    onError={(e) => {
                      if (!e.currentTarget.dataset.retriedBackend) {
                        e.currentTarget.dataset.retriedBackend = 'true';
                        e.currentTarget.src = getBackendMediaUrl(rawPopupImages[0]);
                      } else if (!e.currentTarget.dataset.fallback) {
                        e.currentTarget.dataset.fallback = 'true';
                        e.currentTarget.src = '/mhira_removebg.png';
                        e.currentTarget.className = 'w-full h-60 object-contain p-6 bg-slate-900';
                      } else {
                        setPopupImgError(true);
                      }
                    }}
                  />
                )
              ) : (
                <div
                  onClick={() => {
                    setIsPopupOpen(false);
                    navigate("/collection");
                  }}
                  className="w-full h-60 bg-gradient-to-br from-[#01390f] to-slate-900 flex items-center justify-center p-6 cursor-pointer"
                >
                  <img src="/mhira_removebg.png" alt="Mhira Natural" className="h-16 object-contain" />
                </div>
              )}
            </div>

            {/* Bottom White Container: Inlined Text & Small Shop Collection Button */}
            <div className="p-4 sm:p-5 bg-white flex items-center justify-between gap-3 sm:gap-4 shrink-0">
              <p className="text-xs sm:text-[13px] font-semibold text-[#243746] leading-snug flex-1 min-w-0">
                {popupText}
              </p>

              <button
                type="button"
                onClick={() => {
                  setIsPopupOpen(false);
                  navigate("/collection");
                }}
                className="shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 bg-[#01390f] hover:bg-[#0a5219] text-white text-[11px] sm:text-[12px] font-bold uppercase tracking-wider rounded-full shadow-md active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap"
              >
                Shop Collection
              </button>
            </div>

          </div>
        </div>
      )}

      {/* NIKE-STYLE FULLSCREEN/POPUP VIDEO PLAYER MODAL (MATCHING SCREENSHOT 2) */}
      {isWatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-fadeIn">
          {/* Close 'X' Button at top right */}
          <button
            onClick={handleCloseWatchModal}
            className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black text-white p-2.5 rounded-full border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Close video"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            ref={modalContainerRef}
            className="relative w-full h-full max-w-6xl max-h-[85vh] mx-auto flex flex-col justify-center items-center overflow-hidden rounded-2xl bg-black group"
          >
            <video
              ref={modalVideoRef}
              src={modalVideoSrc}
              autoPlay
              playsInline
              muted={isModalMuted}
              onTimeUpdate={handleModalTimeUpdate}
              onLoadedMetadata={handleModalTimeUpdate}
              onEnded={() => setIsModalPlaying(false)}
              onClick={handleModalTogglePlay}
              className="w-full h-full object-contain cursor-pointer"
            />

            {/* Bottom Floating Control Bar (Nike Style matching screenshot 2) */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 sm:p-6 flex items-center gap-4 text-white z-30 transition-opacity duration-300">
              {/* Play / Pause */}
              <button
                type="button"
                onClick={handleModalTogglePlay}
                className="text-white hover:text-slate-300 transition cursor-pointer p-1"
                title={isModalPlaying ? "Pause" : "Play"}
              >
                {isModalPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
              </button>

              {/* Mute / Volume */}
              <button
                type="button"
                onClick={handleModalToggleMute}
                className="text-white hover:text-slate-300 transition cursor-pointer p-1"
                title={isModalMuted ? "Unmute" : "Mute"}
              >
                {isModalMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>

              {/* Scrubber / Progress Bar */}
              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={modalDuration || 100}
                  value={modalCurrentTime}
                  onChange={handleModalSeek}
                  className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white hover:h-2 transition-all"
                />
              </div>

              {/* Time display */}
              <span className="text-xs font-mono font-medium text-white/90 shrink-0">
                {formatTime(modalCurrentTime)}
              </span>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={handleModalFullscreen}
                className="text-white hover:text-slate-300 transition cursor-pointer p-1"
                title="Fullscreen"
              >
                <Maximize size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default Home;