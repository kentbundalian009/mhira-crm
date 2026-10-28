import React from "react";
import Footer from "./Footer";

function MaintenanceScreen({
  message = "System is temporarily unavailable for maintenance. We are performing scheduled system upgrades and database optimizations.",
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-['Poppins',sans-serif] text-[#243746] antialiased selection:bg-[#246C94] selection:text-white">
      {/* 1. TOP HEADER (EXACT POSITION & STYLING OF MAIN HEADER) */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E1E9EF] w-full shadow-xs">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between gap-3 sm:gap-6">
          {/* BRAND LOGO (LEFT) */}
          <div className="flex items-center gap-2 z-10 shrink-0">
            <img
              src="/mhira_removebg.png"
              alt="Mhira Natural Logo"
              className="h-9 md:h-12 object-contain"
            />
          </div>

          {/* RIGHT STATUS PILL */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Maintenance Active</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN 404 CLEAN CONTENT (NO BOXED CONTAINER / NO BORDER) */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12 my-auto">
        <div className="max-w-xl w-full text-center flex flex-col items-center animate-in fade-in duration-200">
          
          {/* BIG CLEAN 404 */}
          <div className="mb-2">
            <span className="text-8xl sm:text-9xl font-black tracking-tight text-slate-100 select-none block leading-none">
              404
            </span>
          </div>

          {/* STATUS BADGE */}
          <span className="px-3.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 mb-3">
            System Temporarily Unavailable
          </span>

          {/* HEADING */}
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            Under Scheduled Maintenance
          </h1>

          {/* MESSAGE */}
          <p className="text-xs sm:text-sm text-gray-500 max-w-lg leading-relaxed">
            {message}
          </p>
        </div>
      </main>

      {/* 3. FOOTER (EXACT MATCHING APP FOOTER) */}
      <Footer />
    </div>
  );
}

export default MaintenanceScreen;
