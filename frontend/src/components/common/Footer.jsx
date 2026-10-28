import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Scale, Truck, RotateCcw, CreditCard, Cookie } from "lucide-react";

const Footer = () => {
  const triggerCookiePreferences = (e) => {
    e.preventDefault();
    try {
      window.dispatchEvent(new Event("mhiraOpenCookiePreferences"));
    } catch (err) { }
  };

  return (
    <footer className="bg-white text-gray-800 border-t border-[#E1E9EF] font-['Poppins',sans-serif] pt-14 pb-8 shadow-xs">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-[#E1E9EF]">

          {/* Column 1: Brand & Regulatory Identity */}
          <div className="space-y-3.5 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/mhira_removebg.png" alt="Mhira Natural Soap & Cosmetics" className="h-10 object-contain" />
              <span className="font-extrabold text-[13px] tracking-wider uppercase text-[#246C94]">
                Mhira Natural
              </span>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">
              Handcrafted 100% natural soaps, herbal teas, and organic cosmetics. Formulated under strict First-Expired, First-Out (FEFO) quality standards.
            </p>
            <div className="pt-1 text-[11px] text-gray-500 font-medium space-y-1">
              <p className="font-bold text-[#243746]">DTI & LGU Registered</p>
              <p>Mhira Natural Soap and Cosmetics Manufacturing</p>
            </div>
          </div>

          {/* Column 2: Company & Navigation */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase text-[#243746] tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li>
                <Link to="/about" className="hover:text-[#246C94] transition-colors">
                  About Our Brand
                </Link>
              </li>
              <li>
                <Link to="/collection" className="hover:text-[#246C94] transition-colors">
                  Our Natural Catalog
                </Link>
              </li>
              <li>
                <Link to="/packages" className="hover:text-[#246C94] transition-colors">
                  Package & Gift Sets
                </Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-[#246C94] transition-colors">
                  Events & Promos
                </Link>
              </li>
              <li>
                <Link to="/user-manual" className="hover:text-[#246C94] transition-colors font-semibold text-[#01390f] flex items-center gap-1.5">
                  <span>📖 System User Manual</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Regulatory Policies */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase text-[#243746] tracking-wider">
              Policies & Legal
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li>
                <Link to="/terms" className="hover:text-[#246C94] transition-colors flex items-center gap-1.5">
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[#246C94] transition-colors flex items-center gap-1.5">
                  <span>Privacy Policy (RA 10173)</span>
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:text-[#246C94] transition-colors flex items-center gap-1.5">
                  <span>Return & Refund (RA 7394)</span>
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="hover:text-[#246C94] transition-colors flex items-center gap-1.5">
                  <span>Shipping & Delivery Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/payments" className="hover:text-[#246C94] transition-colors flex items-center gap-1.5">
                  <span>Payment & Billing Terms</span>
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-[#246C94] transition-colors flex items-center gap-1.5">
                  <span>Cookie Policy & Tracking</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Manufacturing Office & Customer Care */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase text-[#243746] tracking-wider">
              Manufacturing & Care
            </h4>
            <div className="space-y-2 text-xs text-gray-600">
              <p className="text-[#243746] font-medium">Cabuyao, Laguna, Philippines 🇵🇭</p>
              <p>
                Hotline:{" "}
                <a href="tel:0906525847" className="hover:text-[#246C94] transition-colors font-semibold text-[#243746]">
                  0906 525 847
                </a>
              </p>
              <p>
                Support:{" "}
                <a href="mailto:support@mhiracosmetics.ph" className="hover:text-[#246C94] transition-colors font-semibold text-[#243746]">
                  support@mhiracosmetics.ph
                </a>
              </p>
              <p>
                DPO / Privacy:{" "}
                <a href="mailto:privacy@mhiracosmetics.ph" className="hover:text-[#246C94] transition-colors font-semibold text-[#243746]">
                  privacy@mhiracosmetics.ph
                </a>
              </p>
              <p className="text-[11px] text-gray-400 pt-1">
                Mon - Sat: 8:00 AM – 5:00 PM PHT
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Legal Copyright & Preference Toggles */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 Mhira Natural Soap and Cosmetics Manufacturing. All rights reserved.</p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px]">
            <Link to="/privacy" className="hover:text-[#246C94] transition-colors">Privacy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-[#246C94] transition-colors">Terms</Link>
            <span>•</span>
            <Link to="/refund-policy" className="hover:text-[#246C94] transition-colors">Refund Policy</Link>
            <span>•</span>
            <Link to="/shipping-policy" className="hover:text-[#246C94] transition-colors">Shipping Policy</Link>
            <span>•</span>
            <button
              onClick={triggerCookiePreferences}
              className="hover:text-[#246C94] underline transition-colors cursor-pointer text-gray-500 hover:text-gray-800"
            >
              Cookie Preferences
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;