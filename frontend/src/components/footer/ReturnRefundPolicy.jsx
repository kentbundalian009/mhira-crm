import React from "react";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { RotateCcw, AlertTriangle, CheckCircle2, Clock, Truck, FileQuestion, HelpCircle } from "lucide-react";

function ReturnRefundPolicy() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-poppins">
      <HeaderContainer />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-14 w-full">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Consumer Protection & DTI Compliance
          </span>
          <span className="text-xs text-gray-500 font-medium">
            Republic Act No. 7394 (Consumer Act of the Philippines)
          </span>
        </div>

        {/* Main Content Box */}
        <div className="space-y-10">
          <div className="pb-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Refund, Return & Exchange Policy
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
              Mhira Natural Soap and Cosmetics Manufacturing
            </p>
          </div>

          <div className="text-xs sm:text-sm text-gray-600 space-y-8 leading-relaxed font-normal">
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                1. 7-Day Replacement & Return Guarantee
              </h2>
              <p className="text-gray-600">
                At Mhira Natural, we take immense pride in the purity and artisanal craftsmanship of our organic soaps, herbal teas, and skincare items. Pursuant to the <strong>Consumer Act of the Philippines (Republic Act No. 7394)</strong>, we guarantee that every item dispatched meets stringent quality control standards.
              </p>
              <p className="text-gray-600">
                If your parcel arrives with a verified manufacturing defect, damage sustained during courier handling, or incorrect items, you have <strong>seven (7) calendar days</strong> from the official date of delivery recorded by the courier to initiate a return or replacement ticket.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                2. Grounds Eligible for Free Return & Replacement
              </h2>
              <p className="text-gray-600">
                Mhira Natural covers <strong>100% of return shipping and replacement costs</strong> under the following valid circumstances:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li><strong>Manufacturing Defects or Contamination:</strong> Unusual inconsistency, seal compromise prior to opening, or formula discoloration not attributable to natural oxidation.</li>
                <li><strong>Damaged in Transit:</strong> Broken glass dropper bottles, cracked cosmetic containers, or leaked liquid solutions caused during courier transit.</li>
                <li><strong>Wrong Item Received:</strong> Discrepancy between the items physically delivered and your official digital invoice.</li>
                <li><strong>Breach of FEFO Guarantee:</strong> Receipt of an item carrying less than 6 months remaining shelf life (unless purchased from an advertised short-dated clearance sale).</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                3. Conditions for Non-Returnable Items (Hygiene & Cosmetic Safety)
              </h2>
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs uppercase tracking-wider">
                  Mandatory Health & Hygiene Protocol
                </div>
                <p className="text-xs text-amber-950 leading-relaxed">
                  Due to the organic, personal-care, and topical nature of cosmetic and skincare formulations, <strong>items with broken tamper-evident seals, opened jars, partially used soaps, or brewed teas cannot be returned or refunded</strong> for health and sanitary reasons, unless verified to be defective upon opening.
                </p>
                <p className="text-xs text-amber-900">
                  Returns stemming solely from customer change of mind or personal preference regarding natural botanical scent (without product defect) are not permitted once the product seal has been broken.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                4. Step-by-Step Return Process
              </h2>
              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#01390f] text-white flex items-center justify-center font-bold text-xs shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">Document Unboxing & Damage</h4>
                    <p className="text-[12px] text-gray-600 mt-0.5">
                      Take clear photos or a short video showing the outer shipping waybill, package box, and damaged item or defective seal.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#01390f] text-white flex items-center justify-center font-bold text-xs shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">Submit Return Ticket</h4>
                    <p className="text-[12px] text-gray-600 mt-0.5">
                      Log in to your account, navigate to <strong>My Orders</strong>, and click <em>"Request Return / Replacement"</em>, or message our Logistics Desk via the on-screen live chatbot.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-[#01390f] text-white flex items-center justify-center font-bold text-xs shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-xs text-gray-900">Courier Pickup & QA Inspection</h4>
                    <p className="text-[12px] text-gray-600 mt-0.5">
                      Our logistics partner will collect the parcel. Once inspected at our Cabuyao facility (within 24–48 hours of return delivery), your resolution is immediately approved.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                5. Refund Settlement & Timelines
              </h2>
              <p className="text-gray-600">
                Upon QA inspection approval, customers may elect between an immediate brand-new replacement parcel, a store credit voucher with bonus loyalty points, or a monetary refund:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li><strong>GCash / Maya Refunds:</strong> Reimbursed directly to your mobile wallet within <strong>24 to 48 business hours</strong>.</li>
                <li><strong>Credit / Debit Card Purchases:</strong> Reversed through the acquiring bank gateway within <strong>5 to 10 banking days</strong> (depending on card issuer cycle).</li>
                <li><strong>Cash on Delivery (COD) Purchases:</strong> Refunded via direct GCash or bank transfer upon submission of recipient account details.</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ReturnRefundPolicy;
