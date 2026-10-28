import React, { useEffect, useState } from "react";
import axios, { API } from "../../axios";
import { subscribeLiveSync } from "../../utils/liveSync";

const DEFAULT_ANNOUNCEMENT =
  "Announcement: Current pricing and offers end 8/11/2026 at 11:59 PM ET / 8:59 PM PT — Grab your organic favorites now! 🌿";

function Topbar() {
  const [announcementText, setAnnouncementText] = useState(() => {
    try {
      const cached = localStorage.getItem("mhira_db_topbar_text");
      if (cached && !cached.includes("MHIRAWELCOME") && !cached.includes("Enjoy 10% off")) {
        return cached;
      }
      return DEFAULT_ANNOUNCEMENT;
    } catch {
      return DEFAULT_ANNOUNCEMENT;
    }
  });
  const [promoImage, setPromoImage] = useState(() => {
    try {
      return localStorage.getItem("mhira_db_topbar_img") || "";
    } catch {
      return "";
    }
  });

  const API_BASE_URL =
    import.meta.env.MODE === "production"
      ? "https://mhira-crmsystem.onrender.com"
      : "http://localhost:5000";

  const fetchAnnouncement = () => {
    axios
      .get(`${API_BASE_URL}/api/sections`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          // Explicitly prioritize the Topbar Marquee Announcement Ticker
          const topbarSec = res.data.find(
            (s) => s.sectionName === "topbar-announcement"
          );
          const navbarPromoSec = res.data.find(
            (s) => s.sectionName === "navbar-promo"
          );

          let nextText = "";
          if (topbarSec) {
            const hasText = topbarSec.text && topbarSec.text.trim() !== "";
            const hasTitle = topbarSec.title && topbarSec.title.trim() !== "";
            if (hasText) {
              nextText = topbarSec.text.trim();
            } else if (hasTitle) {
              nextText = topbarSec.title.trim();
            }
          }

          if (!nextText && navbarPromoSec) {
            const hasText = navbarPromoSec.text && navbarPromoSec.text.trim() !== "";
            const hasTitle = navbarPromoSec.title && navbarPromoSec.title.trim() !== "";
            if (hasText) {
              nextText = navbarPromoSec.text.trim();
            } else if (hasTitle) {
              nextText = navbarPromoSec.title.trim();
            }
          }

          if (!nextText) {
            nextText = DEFAULT_ANNOUNCEMENT;
          }

          setAnnouncementText(nextText);
          try {
            localStorage.setItem("mhira_db_topbar_text", nextText);
          } catch (e) {}

          const targetSec = topbarSec || navbarPromoSec;
          if (targetSec) {
            const validImgs = (targetSec.images || []).filter(
              (img) => img && img !== "banner"
            );
            const nextImg = validImgs.length > 0 ? validImgs[0] : "";
            setPromoImage(nextImg);
            try {
              localStorage.setItem("mhira_db_topbar_img", nextImg);
            } catch (e) {}
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching topbar announcement:", err);
      });
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("mhira_db_topbar_text");
      if (cached && (cached.includes("MHIRAWELCOME") || cached.includes("Enjoy 10% off"))) {
        localStorage.removeItem("mhira_db_topbar_text");
        setAnnouncementText(DEFAULT_ANNOUNCEMENT);
      }
    } catch (e) {}

    fetchAnnouncement();

    const unsubscribe = subscribeLiveSync(() => {
      fetchAnnouncement();
    });

    const handleFocus = () => fetchAnnouncement();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleFocus);
    window.addEventListener("sectionUpdated", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleFocus);
      window.removeEventListener("sectionUpdated", handleFocus);
    };
  }, []);

  return (
    <div className="bg-[#01390f] text-white text-xs sm:text-[13px] font-['Poppins',sans-serif] border-b border-[#012b0b] w-full overflow-hidden select-none py-2 m-0 p-0 shadow-xs">
      {/* Custom Keyframes Style for Single Slow Marquee from Right to Left */}
      <style>{`
        @keyframes marquee-single {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-single {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          will-change: transform;
          animation: marquee-single 38s linear infinite;
        }
        .animate-marquee-single:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* FULL-WIDTH ZERO-PADDING ZERO-MARGIN SINGLE SLOW TICKER */}
      <div className="w-full overflow-hidden m-0 p-0 flex items-center">
        <div className="animate-marquee-single font-medium text-white flex items-center gap-2.5">
          {promoImage && (
            <img
              src={promoImage.startsWith("http") ? promoImage : `${API_BASE_URL}${promoImage}`}
              alt="Promo Icon"
              className="w-4 h-4 rounded-full object-cover inline-block align-middle shadow-2xs shrink-0 ring-1 ring-white/50"
            />
          )}
          <span className="tracking-wide text-white/95 font-medium">{announcementText}</span>
        </div>
      </div>
    </div>
  );
}

export default Topbar;