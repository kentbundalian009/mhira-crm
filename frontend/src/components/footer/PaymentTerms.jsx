import React from "react";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { CreditCard, ShieldCheck, Banknote, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

function PaymentTerms() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-poppins">
      <HeaderContainer />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-14 w-full">
        {/* Top Header Badge */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Billing & Transaction Protection
          </span>
          <span className="text-xs text-gray-500 font-medium">
            Currency: Philippine Peso (PHP / ₱)
          </span>
        </div>

        {/* Main Content Box */}
        <div className="space-y-10">
          <div className="pb-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Payment & Billing Terms
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
              Mhira Natural Soap and Cosmetics Manufacturing
            </p>
          </div>

          <div className="text-xs sm:text-sm text-gray-600 space-y-8 leading-relaxed font-normal">
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                1. Accepted Payment Channels
              </h2>
              <p className="text-gray-600">
                To provide convenient, secure, and hassle-free transactions, Mhira Natural accepts multiple verified payment methods:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                  <h4 className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                    Cash on Delivery (COD)
                  </h4>
                  <p className="text-[12px] text-gray-600 mt-1">
                    Pay in cash directly to our accredited courier delivery rider upon physical handover of your package at your doorstep.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50">
                  <h4 className="font-bold text-xs text-gray-900">
                    Loyalty Points & Voucher Credits
                  </h4>
                  <p className="text-[12px] text-gray-600 mt-1">
                    Direct deductions using accumulated customer loyalty points (1 pt = ₱1) or validated promotional campaign vouchers.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                2. Billing Currency & Pricing Transparency
              </h2>
              <p className="text-gray-600">
                All purchases, invoice totals, and discounts are computed strictly in <strong>Philippine Pesos (PHP / ₱)</strong>. Total prices presented at the final checkout screen are final and all-inclusive—there are no hidden processing surcharges.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                3. Double-Charging & Duplicate Transaction Resolution
              </h2>
              <p className="text-gray-600">
                In the rare event that a network timeout, browser glitch, or payment gateway delay causes a duplicate deduction for a single order reference:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>Please email our Billing Desk at <a href="mailto:billing@mhiracosmetics.ph" className="text-[#01390f] font-semibold underline">billing@mhiracosmetics.ph</a> with a screenshot of the digital transaction receipts.</li>
                <li>Our finance team will investigate with the acquiring bank or e-wallet partner within <strong>24 business hours</strong>.</li>
                <li>Confirmed duplicate charges will be reversed and returned immediately to your original payment channel within <strong>24 to 72 hours</strong>.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                4. Anti-Fraud & Payment Security
              </h2>
              <p className="text-gray-600">
                Mhira Natural implements continuous real-time fraud monitoring. We reserve the right to decline, cancel, or hold orders that exhibit suspicious characteristics (such as stolen payment cards, fraudulent COD abuse, or automated scripted bot orders) to protect both legitimate cardholders and our business operations.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PaymentTerms;
