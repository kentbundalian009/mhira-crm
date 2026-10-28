import React from "react";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { ShieldCheck, Lock, UserCheck, Eye, Database, FileKey, Mail } from "lucide-react";

function PrivacyPolicy() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-poppins">
      <HeaderContainer />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-14 w-full">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Legal Compliance Documentation
          </span>
          <span className="text-xs text-gray-500 font-medium">
            Republic Act No. 10173 (Data Privacy Act of 2012)
          </span>
        </div>

        {/* Main Content Box */}
        <div className="space-y-10">
          <div className="pb-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Privacy Policy & Data Protection Manual
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
              Mhira Natural Soap and Cosmetics Manufacturing • National Privacy Commission (NPC) Standards
            </p>
          </div>

          <div className="text-xs sm:text-sm text-gray-600 space-y-8 leading-relaxed font-normal">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                1. Statement of Policy & Commitment
              </h2>
              <p className="text-gray-600">
                <strong>Mhira Natural Soap and Cosmetics Manufacturing</strong> ("Mhira Natural", "we", "us", or "our") deeply respects your fundamental human right to privacy. We are fully committed to safeguarding your personal data in accordance with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, its Implementing Rules and Regulations (IRR), and all relevant circulars issued by the <strong>National Privacy Commission (NPC)</strong> of the Philippines.
              </p>
              <p className="text-gray-600">
                This Privacy Policy describes in transparent detail what personal information we collect, the lawful purpose for collection, how it is processed and secured, who we share it with, and how you can exercise your statutory rights as a Data Subject.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                2. Information We Collect
              </h2>
              <p className="text-gray-600">
                We collect personal information directly from you when you register an account, browse our catalog, submit an order, or communicate with our customer desk:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-xs text-gray-900 mb-1 flex items-center gap-1.5">
                    Identification & Contact Data
                  </h4>
                  <p className="text-[12px] text-gray-600">
                    Full name, email address, mobile/telephone number, and username.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-xs text-gray-900 mb-1 flex items-center gap-1.5">
                    Shipping & Logistics Coordinates
                  </h4>
                  <p className="text-[12px] text-gray-600">
                    Delivery address, province, city/municipality, postal code, and special drop-off instructions.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-xs text-gray-900 mb-1 flex items-center gap-1.5">
                    Order & Transaction History
                  </h4>
                  <p className="text-[12px] text-gray-600">
                    Purchased botanical items, order totals, loyalty points balance, customer tier, and return/replacement records.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <h4 className="font-bold text-xs text-gray-900 mb-1 flex items-center gap-1.5">
                    Security & Verification Tokens
                  </h4>
                  <p className="text-[12px] text-gray-600">
                    Hashed passwords (bcrypt), Cloudflare Turnstile anti-bot challenge validation tokens, and device IP for fraud prevention.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                3. Purpose and Lawful Basis for Data Processing
              </h2>
              <p className="text-gray-600">
                Your personal data is collected and processed based on the performance of a purchase contract, legitimate business interest, and legal compliance:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li><strong>Order Fulfillment & Delivery:</strong> Packing, scheduling, generating waybills, and transporting your organic items via accredited logistics couriers.</li>
                <li><strong>Customer Support & Logistics Advisories:</strong> Sending automated email/SMS dispatch notifications, delivery tracking updates, and weather delay alerts.</li>
                <li><strong>Loyalty Rewards Program:</strong> Accurately computing Tier progression (Regular vs. VIP) and point redemptions.</li>
                <li><strong>System Security:</strong> Preventing malicious automated bots, fraudulent bulk orders, and unauthorized logins via Cloudflare Turnstile security.</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                4. Data Sharing with Third-Party Processors
              </h2>
              <p className="text-gray-600">
                <strong>We do NOT sell, rent, or trade your personal information.</strong> We only share relevant minimum necessary coordinates with trusted third-party service providers bound by strict Data Sharing Agreements:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li><strong>Courier & Logistics Partners:</strong> J&T Express, Ninja Van, Flash Express, and Lalamove receive your name, address, and mobile number solely for doorstep package delivery and COD collection.</li>
                <li><strong>Payment Processors:</strong> Official digital payment channels (e.g. GCash, Maya, card gateways) process transaction tokens under PCI-DSS standards. We never store credit card CVVs on our servers.</li>
                <li><strong>Security Infrastructure:</strong> Cloudflare provides automated bot mitigation and DNS protection.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                5. Data Retention & Storage Policy
              </h2>
              <p className="text-gray-600">
                Your personal data is stored in encrypted cloud databases located in secure data centers. We retain transaction data for a period of up to <strong>five (5) years</strong> to comply with Philippine tax (Bureau of Internal Revenue / BIR) audit rules and commercial warranty claims. Upon the lapse of the retention period, records are irreversibly anonymized or securely purged.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                6. Your Statutory Rights as a Data Subject
              </h2>
              <p className="text-gray-600">
                Under Republic Act No. 10173, you are guaranteed the following rights:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li><strong>Right to be Informed:</strong> To know whether personal data pertaining to you is being processed.</li>
                <li><strong>Right to Access:</strong> To request a copy of the personal data we hold about you.</li>
                <li><strong>Right to Rectification:</strong> To correct inaccurate or outdated information in your profile.</li>
                <li><strong>Right to Erasure or Blocking:</strong> To request the suspension, withdrawal, or deletion of your personal account.</li>
                <li><strong>Right to Object:</strong> To opt-out of marketing promotions, newsletters, and commercial announcements.</li>
                <li><strong>Right to File a Complaint:</strong> You have the right to lodge a complaint with the National Privacy Commission (NPC) at <em>privacy.gov.ph</em> if you believe your rights have been violated.</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section className="pt-6 border-t border-gray-100 space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                7. Data Protection Officer (DPO) Contact
              </h2>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <p><strong>Designated Compliance Officer:</strong> Office of the Data Protection Officer</p>
                <p><strong>Company:</strong> Mhira Natural Soap and Cosmetics Manufacturing</p>
                <p><strong>Office Address:</strong> Cabuyao, Laguna, Philippines</p>
                <p><strong>DPO Inquiries Email:</strong> <a href="mailto:privacy@mhiracosmetics.ph" className="text-[#01390f] font-semibold underline">privacy@mhiracosmetics.ph</a></p>
                <p><strong>Alternate Contact:</strong> <a href="mailto:kentbundalian009@gmail.com" className="text-[#01390f] font-semibold underline">kentbundalian009@gmail.com</a></p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PrivacyPolicy;