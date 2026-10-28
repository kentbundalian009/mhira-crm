import React from "react";
import { Link } from "react-router-dom";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { FileText, Shield, Scale, AlertCircle, CheckCircle2, Clock, Building2 } from "lucide-react";

function TermsOfService() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-poppins">
      <HeaderContainer />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-14 w-full">
        {/* Top Header Badge / Effective Date */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Legal Documentation & User Agreement
          </span>
          <span className="text-xs text-gray-500 font-medium">
            Effective Date: September 2026 • Version 2.4
          </span>
        </div>

        {/* Main Content Box */}
        <div className="space-y-10">
          <div className="pb-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Terms and Conditions of Service
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
              Mhira Natural Soap and Cosmetics Manufacturing • Republic of the Philippines
            </p>
          </div>

          <div className="text-xs sm:text-sm text-gray-600 space-y-8 leading-relaxed font-normal">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                <span>1. Overview, Acceptance & Eligibility</span>
              </h2>
              <p className="text-gray-600">
                These Terms of Service ("Terms") govern your use of the website located at <strong>mhira-crmsystem.onrender.com</strong>, our Customer Relationship Management storefront, mobile portals, and related services operated by <strong>Mhira Natural Soap and Cosmetics Manufacturing</strong> ("Mhira Natural", "we", "us", or "our").
              </p>
              <p className="text-gray-600">
                By accessing our platform or purchasing our handcrafted goods, you affirm that you are at least 18 years of age (or have the consent and supervision of a legal guardian) and are fully capable of entering into binding obligations under the laws of the Republic of the Philippines.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                2. Account Creation & Security
              </h2>
              <p className="text-gray-600">
                To access specialized features such as our Loyalty Points System, tier discounts, order tracking, and express checkout, you may register an account:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>You agree to provide accurate, current, and complete registration credentials.</li>
                <li>You are solely responsible for maintaining the confidentiality of your account credentials and passwords.</li>
                <li>You must notify us immediately of any unauthorized use or security breach of your account.</li>
                <li>Mhira Natural reserves the right to suspend or terminate accounts that engage in fraudulent actions, bot manipulation, or violation of our fair-use policies.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                3. Products, Botanical Ingredients & FEFO Quality Standard
              </h2>
              <p className="text-gray-600">
                All soaps, herbal teas, serums, and organic cosmetic formulations are handcrafted in micro-batches using authentic botanical oils and natural extracts:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li><strong>FEFO Expiration Standard:</strong> Every batch is logged with strict manufacturing and expiration dates under our First-Expired, First-Out (FEFO) warehouse inventory control. We guarantee that all dispatched items carry at least 6 months of active shelf life unless explicitly marked as clearance items.</li>
                <li><strong>Natural Variations:</strong> Because we avoid synthetic artificial stabilizers and toxic chemical dyes, slight variations in color, organic aroma, and botanical texture across production batches are normal and a hallmark of authentic handcrafted goods.</li>
                <li><strong>Patch Testing Recommendation:</strong> We encourage customers to perform an allergy patch test prior to full application, especially if you have known plant allergies. Consult a dermatologist if persistent sensitivity occurs.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                4. Pricing, Currency & Loyalty Program
              </h2>
              <p className="text-gray-600">
                All prices displayed on our website are denominated in <strong>Philippine Pesos (PHP / ₱)</strong> and are inclusive of standard local taxes where applicable.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>We reserve the right to modify prices, bundle promotions, and seasonal discount vouchers at any time without prior notice.</li>
                <li><strong>Loyalty Points & Tiers:</strong> Customers accumulate loyalty points for valid purchases (₱50 spent = 1 Loyalty Point). Points carry a monetary redemption value of 1 Point = ₱1 discount at checkout and may not be exchanged for physical currency.</li>
                <li>Coupon vouchers are non-transferable and subject to specific expiry dates and minimum spend thresholds.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                5. Intellectual Property Rights
              </h2>
              <p className="text-gray-600">
                All proprietary content on this platform—including but not limited to brand trademarks, "Mhira Natural" logos, product packaging graphics, proprietary cosmetic formulas, copywriting, website architecture, and database algorithms—is the exclusive intellectual property of <strong>Mhira Natural Soap and Cosmetics Manufacturing</strong> protected under Philippine Intellectual Property Code (RA 8293) and international copyright treaties.
              </p>
              <p className="text-gray-600">
                No portion of this site or our branding may be copied, reproduced, scraped, republished, or distributed for commercial purposes without prior written authorization.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                6. Limitation of Liability & Warranty Disclaimer
              </h2>
              <p className="text-gray-600">
                To the maximum extent permitted by applicable Philippine law:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>Our services and products are provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied.</li>
                <li>Mhira Natural shall not be liable for indirect, incidental, special, or consequential damages resulting from product misuse, improper storage contrary to packaging guidelines, or external courier transit delays caused by natural disasters (Force Majeure).</li>
                <li>In all circumstances, our maximum aggregate liability shall not exceed the total purchase price paid by you for the specific order giving rise to the claim.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                7. Governing Law & Dispute Resolution
              </h2>
              <p className="text-gray-600">
                These Terms shall be interpreted, construed, and enforced exclusively in accordance with the laws of the <strong>Republic of the Philippines</strong>, without regard to its conflict of law principles.
              </p>
              <p className="text-gray-600">
                Any legal action, proceeding, or dispute arising out of or relating to these Terms or our products shall be submitted to the exclusive jurisdiction of the proper courts situated in <strong>Cabuyao City, Laguna, Philippines</strong>, with the parties expressly waiving any other venue.
              </p>
            </section>

            {/* Section 8 */}
            <section className="pt-6 border-t border-gray-100 space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                8. Business Identity & Legal Contact
              </h2>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <p><strong>Registered Trade Name:</strong> Mhira Natural Soap and Cosmetics Manufacturing</p>
                <p><strong>Business Registration:</strong> DTI / City of Cabuyao Business Permit No. Registered</p>
                <p><strong>Principal Manufacturing Facility:</strong> Cabuyao, Laguna, Philippines</p>
                <p><strong>Legal & Compliance Desk:</strong> <a href="mailto:legal@mhiracosmetics.ph" className="text-[#01390f] font-semibold underline">legal@mhiracosmetics.ph</a></p>
                <p><strong>Customer Care Hotline:</strong> <a href="tel:0906525847" className="text-[#01390f] font-semibold underline">0906 525 847</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default TermsOfService;