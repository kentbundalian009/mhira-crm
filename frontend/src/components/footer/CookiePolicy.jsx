import React from "react";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";

function CookiePolicy() {
  const handleResetPreferences = () => {
    try {
      window.dispatchEvent(new Event("mhiraOpenCookiePreferences"));
    } catch (e) { }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col font-poppins">
      <HeaderContainer />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-14 w-full">
        {/* Top Header Badge */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Transparency & Tracking Policy
          </span>
          <span className="text-xs text-gray-500 font-medium">
            Effective Date: September 2026
          </span>
        </div>

        {/* Main Content Box */}
        <div className="space-y-10">
          <div className="pb-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Cookie & Storage Policy
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
              Mhira Natural Soap and Cosmetics Manufacturing
            </p>
          </div>

          <div className="text-xs sm:text-sm text-gray-600 space-y-8 leading-relaxed font-normal">
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                1. What Are Cookies and Local Storage?
              </h2>
              <p className="text-gray-600">
                Cookies and browser local storage are small text data elements placed on your computer, tablet, or smartphone when you visit a website. They allow the platform to remember your active session, retain items in your shopping bag as you navigate between pages, and protect our system from malicious traffic.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                2. Categories of Storage Technologies We Use
              </h2>
              <div className="space-y-4 pt-2">
                {/* Category 1 */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">
                      1. Strictly Necessary & Essential Cookies (Always Active)
                    </span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">Mandatory</span>
                  </div>
                  <p className="text-xs text-gray-700">
                    These cookies and keys are vital for the technical operation of the website. Without them, you cannot log in, keep items in your shopping cart, or complete a secure checkout.
                  </p>
                  <ul className="list-disc pl-5 text-[11px] text-gray-600 space-y-0.5">
                    <li><strong>token & user:</strong> Secure authentication state and session validation.</li>
                    <li><strong>cached_cart_items:</strong> Keeps your handcrafted botanical products saved in your cart.</li>
                    <li><strong>Cloudflare Turnstile:</strong> Validates real human visitors and mitigates automated bot abuse.</li>
                  </ul>
                </div>

                {/* Category 2 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      2. Functional & Preference Storage
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">Optional</span>
                  </div>
                  <p className="text-xs text-gray-700">
                    These allow the website to remember choices you make (such as dismissed promo banners or localized display preferences) for a tailored browsing experience.
                  </p>
                </div>

                {/* Category 3 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      3. Performance & Diagnostic Analytics
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">Optional</span>
                  </div>
                  <p className="text-xs text-gray-700">
                    Helps us understand how visitors interact with our soap collections, what categories are most popular, and identify slow loading pages so we can continuously optimize performance.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                3. How to Manage or Revoke Your Cookie Consent
              </h2>
              <p className="text-gray-600">
                You can change your cookie preferences at any time. If you wish to reset your consent choice for our website, click the button below:
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetPreferences}
                  className="bg-[#01390f] hover:bg-[#0a5219] text-white px-6 py-3.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer active:scale-95"
                >
                  Manage Cookie Preferences
                </button>
              </div>
              <p className="text-[12px] text-gray-500 mt-2">
                You can also configure your browser (Chrome, Safari, Edge, Firefox) to block or alert you about cookies. Please note that disabling essential cookies may cause portions of the checkout and account portal to malfunction.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CookiePolicy;
