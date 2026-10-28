import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, X, ChevronDown, ExternalLink } from "lucide-react";
import { showSuccessToast } from "../../utils/toast";

const COOKIE_CATEGORIES = [
  {
    id: "strictly_necessary",
    title: "Strictly Necessary Cookies",
    alwaysActive: true,
    description:
      "These cookies are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you which amount to a request for services, such as setting your privacy preferences, logging in or filling in forms. You can set your browser to block or alert you about these cookies, but some parts of the site will not then work. These cookies do not store any personally identifiable information."
  },
  {
    id: "performance",
    title: "Performance Cookies",
    alwaysActive: false,
    description:
      "These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site. All information these cookies collect is aggregated and therefore anonymous. If you do not allow these cookies we will not know when you have visited our site, and will not be able to monitor its performance."
  },
  {
    id: "functional",
    title: "Functional Cookies",
    alwaysActive: false,
    description:
      "These cookies enable the website to provide enhanced functionality and personalisation. They may be set by us or by third party providers whose services we have added to our pages. If you do not allow these cookies then some or all of these services may not function properly."
  },
  {
    id: "targeting",
    title: "Targeting Cookies",
    alwaysActive: false,
    description:
      "These cookies may be set through our site by our advertising partners. They may be used by those companies to build a profile of your interests and show you relevant adverts on other sites. They do not store directly personal information, but are based on uniquely identifying your browser and internet device. If you do not allow these cookies, you will experience less targeted advertising."
  },
  {
    id: "social_media",
    title: "Social Media Cookies",
    alwaysActive: false,
    description:
      "These cookies are set by a range of social media services that we have added to the site to enable you to share our content with your friends and networks. They are capable of tracking your browser across other sites and building up a profile of your interests. This may impact the content and messages you see on other websites you visit. If you do not allow these cookies you may not be able to use or see these sharing tools."
  }
];

export default function CookieConsentBanner() {
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Accordion state for categories (Strictly Necessary open by default)
  const [openAccordions, setOpenAccordions] = useState({
    strictly_necessary: true,
    performance: false,
    functional: false,
    targeting: false,
    social_media: false
  });

  // User cookie preferences state
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem("mhira_cookie_preferences");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          strictly_necessary: true,
          performance: Boolean(parsed.performance),
          functional: Boolean(parsed.functional),
          targeting: Boolean(parsed.targeting),
          social_media: Boolean(parsed.social_media)
        };
      }
    } catch (e) { }
    return {
      strictly_necessary: true,
      performance: false,
      functional: false,
      targeting: false,
      social_media: false
    };
  });

  useEffect(() => {
    try {
      const consent = localStorage.getItem("mhira_cookie_consent");
      if (!consent) {
        // Gentle fade in for first-time visitors
        const timer = setTimeout(() => setIsBannerVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch (e) { }

    const handleOpenModal = () => {
      setIsModalOpen(true);
    };

    const handleReset = () => {
      setIsBannerVisible(true);
      setIsModalOpen(true);
    };

    window.addEventListener("mhiraOpenCookiePreferences", handleOpenModal);
    window.addEventListener("mhiraCookieConsentReset", handleReset);

    return () => {
      window.removeEventListener("mhiraOpenCookiePreferences", handleOpenModal);
      window.removeEventListener("mhiraCookieConsentReset", handleReset);
    };
  }, []);

  // Lock body scroll when Privacy Preference Center modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [isModalOpen]);

  const toggleAccordion = (id) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggle = (id) => {
    if (id === "strictly_necessary") return;
    setPreferences((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const savePreferences = (consentType, customPrefs) => {
    try {
      localStorage.setItem("mhira_cookie_consent", consentType);
      localStorage.setItem("mhira_cookie_preferences", JSON.stringify(customPrefs));
      window.dispatchEvent(new CustomEvent("mhiraCookiePreferencesSaved", { detail: customPrefs }));
    } catch (e) { }
    setIsBannerVisible(false);
    setIsModalOpen(false);
    if (typeof showSuccessToast === "function") {
      showSuccessToast("Cookie preferences updated successfully.");
    }
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      strictly_necessary: true,
      performance: true,
      functional: true,
      targeting: true,
      social_media: true
    };
    setPreferences(allAccepted);
    savePreferences("all", allAccepted);
  };

  const handleRejectAll = () => {
    const allRejected = {
      strictly_necessary: true,
      performance: false,
      functional: false,
      targeting: false,
      social_media: false
    };
    setPreferences(allRejected);
    savePreferences("rejected", allRejected);
  };

  const handleConfirmChoices = () => {
    savePreferences("custom", preferences);
  };

  return (
    <>
      {/* 1. COMPACT FLOATING COOKIE CONSENT CARD (BOTTOM-LEFT) */}
      {isBannerVisible && !isModalOpen && (
        <aside
          aria-label="Cookie and Privacy Consent Banner"
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-[360px] z-50 bg-white border border-[#E1E9EF] shadow-2xl rounded-2xl p-4 sm:p-5 text-[#243746] font-poppins animate-slideUp transition-all"
        >
          {/* Top Row: Outline Cookie Icon + Notice */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 pt-0.5">
              <Cookie size={24} className="text-[#01390f]" strokeWidth={1.8} />
            </div>
            <div className="text-xs text-[#243746] leading-relaxed">
              <p className="font-medium">
                We use cookies to improve your browsing experience and for marketing purposes.
              </p>
              <Link
                to="/privacy"
                className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer inline-block mt-1 text-xs"
              >
                Read our Privacy Policy
              </Link>
            </div>
          </div>

          {/* Action Buttons: Reject All and Accept All */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <button
              type="button"
              onClick={handleRejectAll}
              className="w-full py-2.5 sm:py-3 px-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer text-center border border-[#d5ead7]"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={handleAcceptAll}
              className="w-full py-2.5 sm:py-3 px-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer text-center"
            >
              Accept All
            </button>
          </div>

          {/* Cookies Settings Link (Centered) */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[12px] text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer"
            >
              Cookies Settings
            </button>
          </div>
        </aside>
      )}

      {/* 2. PRIVACY PREFERENCE CENTER MODAL */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="privacy-preference-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 font-poppins"
        >
          {/* Dimmed Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Card */}
          <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#E1E9EF] z-10 flex flex-col max-h-[90vh] overflow-hidden animate-scaleUp">

            {/* Modal Header without icon */}
            <div className="p-5 sm:p-6 border-b border-[#E1E9EF] flex items-center justify-between gap-4 bg-white sticky top-0 z-10">
              <h2 id="privacy-preference-title" className="text-base sm:text-lg font-bold text-[#243746]">
                Privacy Preference Center
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-[#243746] transition cursor-pointer"
                aria-label="Close Privacy Preference Center"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 text-[#243746]">
              {/* Informational Intro */}
              <div className="space-y-3">
                <p className="text-xs sm:text-[13px] leading-relaxed text-[#243746]/85 font-normal">
                  When you visit any website, it may store or retrieve information on your browser, mostly in the form of cookies. This information might be about you, your preferences or your device and is mostly used to make the site work as you expect it to. The information does not usually directly identify you, but it can give you a more personalized web experience. Because we respect your right to privacy, you can choose not to allow some types of cookies. Click on the different category headings to find out more and change our default settings. However, blocking some types of cookies may impact your experience of the site and the services we are able to offer.{" "}
                  <a
                    href="https://cookiepedia.co.uk/giving-consent-to-cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#246C94] underline underline-offset-4 hover:text-[#1D5777] transition-colors font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>More information</span>
                    <ExternalLink size={12} className="inline shrink-0" />
                  </a>
                </p>
              </div>

              {/* Manage Consent Preferences Section */}
              <div className="pt-2 border-t border-[#E1E9EF]">
                <h3 className="text-sm sm:text-base font-bold text-[#243746] mb-3.5">
                  Manage Consent Preferences
                </h3>

                {/* Categories List */}
                <div className="space-y-3">
                  {COOKIE_CATEGORIES.map((cat) => {
                    const isOpen = openAccordions[cat.id];
                    const isChecked = preferences[cat.id];

                    return (
                      <div
                        key={cat.id}
                        className="border border-[#E1E9EF] rounded-xl overflow-hidden transition-all bg-white"
                      >
                        {/* Category Row */}
                        <div
                          onClick={() => toggleAccordion(cat.id)}
                          className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-pointer select-none gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ChevronDown
                              size={17}
                              className={`text-[#243746] transition-transform duration-200 shrink-0 ${
                                isOpen ? "rotate-180 text-[#01390f]" : ""
                              }`}
                            />
                            <span className="font-semibold text-xs sm:text-sm text-[#243746] truncate">
                              {cat.title}
                            </span>
                          </div>

                          <div
                            className="shrink-0 flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cat.alwaysActive ? (
                              <span className="text-[11px] font-bold text-[#01390f] bg-[#EDF7EE] px-2.5 py-1 rounded-full border border-[#01390f]/20 whitespace-nowrap">
                                Always Active
                              </span>
                            ) : (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isChecked}
                                aria-label={`Toggle ${cat.title}`}
                                onClick={() => handleToggle(cat.id)}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                                  isChecked ? "bg-[#01390f]" : "bg-slate-300"
                                }`}
                              >
                                <div
                                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                    isChecked ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Category Description */}
                        {isOpen && (
                          <div className="p-3.5 sm:p-4 text-xs text-[#243746]/85 font-normal leading-relaxed border-t border-[#E1E9EF] bg-white animate-fadeIn">
                            {cat.description}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 sm:p-5 border-t border-[#E1E9EF] bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-5 py-2.5 sm:py-3 rounded-full bg-[#EDF7EE] hover:bg-[#d8eed9] text-[#01390f] text-[12px] font-bold uppercase tracking-wider transition-all shadow-xs active:scale-[0.99] cursor-pointer border border-[#d5ead7]"
              >
                Reject All
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer"
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={handleConfirmChoices}
                  className="px-5 py-2.5 sm:py-3 rounded-full bg-[#01390f] hover:bg-[#0a5219] text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer"
                >
                  Confirm My Choices
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
