import React, { useState, useEffect } from "react";
import { API, getImageUrl } from "../../axios";
import { subscribeLiveSync } from "../../utils/liveSync";

// Helper to safely extract auth-banner from existing localStorage cache
const getCachedBanner = () => {
  try {
    const rawSectionsStr =
      localStorage.getItem("mhira_db_sections_raw") ||
      localStorage.getItem("cached_marketing_sections");
    if (rawSectionsStr) {
      const parsed = JSON.parse(rawSectionsStr);
      if (Array.isArray(parsed)) {
        const authSec = parsed.find((s) => s && s.sectionName === "auth-banner");
        if (authSec && authSec.isPublished === false) {
          return "";
        }
        if (authSec?.images?.[0] && authSec.images[0] !== "banner") {
          const formatted = getImageUrl(authSec.images[0]);
          if (
            formatted &&
            !formatted.includes("mhira_auth_banner_default") &&
            !formatted.includes("founder")
          ) {
            return formatted;
          }
        }
      }
    }

    const dictSectionsStr = localStorage.getItem("mhira_db_sections");
    if (dictSectionsStr) {
      const parsedDict = JSON.parse(dictSectionsStr);
      const authSec = parsedDict?.["auth-banner"];
      if (authSec && authSec.isPublished === false) {
        return "";
      }
      if (authSec?.images?.[0] && authSec.images[0] !== "banner") {
        const formatted = getImageUrl(authSec.images[0]);
        if (
          formatted &&
          !formatted.includes("mhira_auth_banner_default") &&
          !formatted.includes("founder")
        ) {
          return formatted;
        }
      }
    }

    const direct = localStorage.getItem("mhira_auth_banner_url");
    if (
      direct &&
      direct !== "banner" &&
      !direct.includes("mhira_auth_banner_default") &&
      !direct.includes("founder")
    ) {
      return direct;
    }
  } catch (e) {}
  return "";
};

// Global memory cache to eliminate any image reload / flicker across /login, /signup, /forgot-password
let memoryAuthBanner = getCachedBanner();

export default function AuthVisualPanel() {
  const [imageSrc, setImageSrc] = useState(() => memoryAuthBanner || getCachedBanner() || "");

  useEffect(() => {
    let isMounted = true;

    // Purge any stale stored dummy references from previous sessions
    try {
      const cached = localStorage.getItem("mhira_auth_banner_url");
      if (
        cached &&
        (cached.includes("mhira_auth_banner_default") || cached.includes("founder"))
      ) {
        localStorage.removeItem("mhira_auth_banner_url");
      }
    } catch (e) {}

    const fetchAuthBanner = async () => {
      try {
        const res = await API.get("/api/sections").catch(() => ({ data: [] }));
        if (!isMounted) return;

        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.value || res.data?.sections || res.data?.data || [];

        if (Array.isArray(data)) {
          const authSec = data.find((s) => s && s.sectionName === "auth-banner");
          if (
            authSec &&
            authSec.isPublished !== false &&
            authSec?.images?.[0] &&
            authSec.images[0] !== "banner"
          ) {
            const formatted = getImageUrl(authSec.images[0]);
            if (
              formatted &&
              !formatted.includes("mhira_auth_banner_default") &&
              !formatted.includes("founder")
            ) {
              memoryAuthBanner = formatted;
              setImageSrc(formatted);
              try {
                localStorage.setItem("mhira_auth_banner_url", formatted);
              } catch (e) {}
              return;
            }
          }

          // If in Draft (isPublished === false) or no image is set in database, show only clean branding label background
          memoryAuthBanner = "";
          setImageSrc("");
          try {
            localStorage.removeItem("mhira_auth_banner_url");
          } catch (e) {}
        }
      } catch (err) {
        console.error("Error fetching auth banner from database:", err);
      }
    };

    fetchAuthBanner();

    const unsubscribe = subscribeLiveSync(() => {
      fetchAuthBanner();
    });

    const handleSync = () => fetchAuthBanner();
    window.addEventListener("sectionsUpdated", handleSync);
    window.addEventListener("marketingUpdated", handleSync);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener("sectionsUpdated", handleSync);
      window.removeEventListener("marketingUpdated", handleSync);
    };
  }, []);

  return (
    <div className="hidden lg:block lg:w-1/2 w-1/2 h-full min-h-screen relative overflow-hidden bg-[#103420] shrink-0 select-none">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt="Mhira Natural Auth Banner"
          className="w-full h-full object-cover object-center absolute inset-0 pointer-events-none select-none transition-opacity duration-300"
          loading="eager"
          decoding="sync"
          onError={() => {
            // Never fallback to stored mock images; display clean brand panel
            setImageSrc("");
            try {
              localStorage.removeItem("mhira_auth_banner_url");
            } catch (e) {}
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center p-12 bg-gradient-to-br from-[#0a2014] via-[#103420] to-[#1c4b2e] select-none">
          <img
            src="/mhira_removebg.png"
            alt="Mhira Natural Logo"
            className="h-28 w-auto mx-auto object-contain drop-shadow-xl"
          />
        </div>
      )}
    </div>
  );
}
