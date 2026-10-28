import React, { useState, useEffect } from "react";
import axios, { API } from "../../axios";
import { Loader2 } from "lucide-react";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { subscribeLiveSync } from "../../utils/liveSync";

function CustomerEvents() {
  const [events, setEvents] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_public_events");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem("cached_public_events");
    } catch {
      return true;
    }
  });

  const API_BASE_URL =
    import.meta.env.MODE === "production"
      ? "https://mhira-crmsystem.onrender.com"
      : "http://localhost:5000";

  const fetchPublicEvents = async () => {
    try {
      const res = await API.get("/api/events/public");
      const safeData = Array.isArray(res.data)
        ? res.data
        : res.data?.events || res.data?.items || res.data?.data || [];
      setEvents(safeData);
      try {
        localStorage.setItem("cached_public_events", JSON.stringify(safeData));
      } catch (e) { }
    } catch (err) {
      console.error("Error fetching public events:", err);
      setEvents((prev) => (Array.isArray(prev) ? prev : []));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicEvents();

    const unsubscribe = subscribeLiveSync(() => {
      fetchPublicEvents();
    });

    const handleFocus = () => fetchPublicEvents();
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http") || url.startsWith("data:") || url.startsWith("blob:")) {
      return url;
    }
    return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  return (
    <div className="bg-white min-h-screen flex flex-col justify-between font-['Poppins',sans-serif] text-[#243746] antialiased selection:bg-[#246C94] selection:text-white">
      <div>
        <HeaderContainer />

        <main className="w-full">
          {/* Section Header: Pure Full-Width */}
          <div className="w-full px-6 sm:px-10 lg:px-16 pt-10 pb-8 bg-white border-b border-[#E1E9EF]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#246C94]">
              Updates & Happenings
            </span>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#243746] mt-1 uppercase">
              Events & Announcements
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-2">
              Discover our upcoming promotions, exclusive releases, and store schedules.
            </p>
          </div>

          {loading ? (
            <div className="w-full flex items-center justify-center py-32 text-[#246C94] gap-3">
              <Loader2 className="w-7 h-7 animate-spin" />
              <span className="text-sm font-semibold tracking-wide text-slate-600">
                Loading announcements...
              </span>
            </div>
          ) : events.length === 0 ? (
            <div className="w-full py-28 px-6 sm:px-10 lg:px-16 text-center">
              <h3 className="text-xl font-bold text-[#243746]">
                No active announcements right now
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                Please check back later for upcoming promotions, pop-ups, and special events.
              </p>
            </div>
          ) : (
            <div className="w-full flex flex-col divide-y divide-[#E1E9EF] bg-white">
              {events.map((item, idx) => (
                <article key={item._id || idx} className="w-full pb-14 sm:pb-20">
                  {/* Full-bleed Edge-to-Edge Image */}
                  {item.bannerImage && (
                    <div className="w-full h-[340px] sm:h-[480px] md:h-[620px] bg-slate-950 overflow-hidden">
                      <img
                        src={getImageUrl(item.bannerImage)}
                        alt={item.title}
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                  )}

                  {/* Fluid Content Block (Gumagamit ng pure 100% width) */}
                  <div className="w-full px-6 sm:px-10 lg:px-16 pt-8 flex flex-col items-start">
                    {/* Clean Minimalist Meta Row nang walang icons */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-3">
                      <span className="bg-[#EAF3E4] text-[#79A94B] border border-[#79A94B]/30 px-3 py-1 rounded-sm">
                        {item.category || "Special Announcement"}
                      </span>

                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-sm">
                        {item.eventDate
                          ? new Date(item.eventDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                          : "Ongoing"}
                      </span>

                      {item.location && (
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-sm">
                          {item.location}
                        </span>
                      )}
                    </div>

                    {/* Headline */}
                    <h2 className="w-full text-2xl sm:text-4xl md:text-5xl font-black text-[#243746] tracking-tight leading-tight uppercase">
                      {item.title}
                    </h2>

                    {/* Description */}
                    {item.description && (
                      <p className="w-full text-slate-600 text-sm sm:text-base md:text-lg mt-4 leading-relaxed font-normal">
                        {item.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default CustomerEvents;