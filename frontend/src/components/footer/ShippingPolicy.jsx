import React from "react";
import HeaderContainer from "../common/HeaderContainer";
import Footer from "../common/Footer";
import { Truck, Clock, MapPin, ShieldAlert, CloudLightning, CheckCircle2, HelpCircle } from "lucide-react";

function ShippingPolicy() {
  return (
    <div className="bg-white min-h-screen flex flex-col font-poppins">
      <HeaderContainer />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-14 w-full">
        {/* Top Header Badge */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
            Logistics & Fulfillment Documentation
          </span>
          <span className="text-xs text-gray-500 font-medium">
            Nationwide Coverage: Philippines
          </span>
        </div>

        {/* Main Content Box */}
        <div className="space-y-10">
          <div className="pb-6 border-b border-gray-200">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Shipping & Delivery Logistics Policy
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1 font-medium">
              Mhira Natural Soap and Cosmetics Manufacturing • Logistics Operations Desk
            </p>
          </div>

          <div className="text-xs sm:text-sm text-gray-600 space-y-8 leading-relaxed font-normal">
            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                1. Order Dispatch & Processing Timelines
              </h2>
              <p className="text-gray-600">
                All botanical soaps, teas, and cosmetic preparations are stored in temperature-controlled warehousing at our manufacturing facility in <strong>Cabuyao, Laguna</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li><strong>Order Cut-Off:</strong> Orders confirmed before <strong>2:00 PM (Philippine Standard Time)</strong> from Monday to Saturday are dispatched to courier hubs on the same business day.</li>
                <li><strong>Sunday & Public Holidays:</strong> Orders placed on Sundays or official non-working national holidays are processed on the subsequent business day.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                2. Estimated Delivery Transit Windows
              </h2>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                  <thead className="bg-gray-50 text-gray-800 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Destination Region</th>
                      <th className="px-4 py-3">Estimated Transit Lead Time</th>
                      <th className="px-4 py-3">Primary Courier Partners</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-gray-700 font-medium">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Laguna, Cavite & Metro Manila</td>
                      <td className="px-4 py-3 text-emerald-800 font-semibold">1 – 3 Business Days</td>
                      <td className="px-4 py-3">J&T Express</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Rest of Greater Luzon</td>
                      <td className="px-4 py-3">2 – 5 Business Days</td>
                      <td className="px-4 py-3">J&T Express</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Visayas Major Hubs</td>
                      <td className="px-4 py-3">4 – 7 Business Days</td>
                      <td className="px-4 py-3">J&T Express</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Mindanao Major Hubs</td>
                      <td className="px-4 py-3">5 – 8 Business Days</td>
                      <td className="px-4 py-3">J&T Express</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Remote Islands / Rural Out-of-Delivery Zones</td>
                      <td className="px-4 py-3 text-amber-700">7 – 12 Business Days</td>
                      <td className="px-4 py-3">J&T Express</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                3. Real-Time Tracking & Notifications
              </h2>
              <p className="text-gray-600">
                Every shipment is assigned an official courier tracking number / waybill barcode. Once handed over to the courier partner:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>You will receive an automated dispatch advisory email notification containing your tracking URL.</li>
                <li>You can track the live movement of your order anytime through our storefront under <strong>My Orders</strong>.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase">
                4. Cash on Delivery (COD) Guidelines
              </h2>
              <p className="text-gray-600">
                Cash on Delivery is supported nationwide. To ensure a smooth delivery experience:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>Please prepare the exact payment amount indicated on your electronic order summary to avoid courier change delays.</li>
                <li>If you will be away during the estimated delivery window, please designate an authorized representative with valid ID to receive the parcel and remit payment on your behalf.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                5. Weather Advisories & Force Majeure Exemption
              </h2>
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 space-y-2">
                <p>
                  During typhoons, tropical storms (PAGASA storm signals), port groundings, or regional highway closures, courier rider safety protocols are enacted. While transit times may be temporarily extended by 1–3 business days during severe weather, your products remain safely secured in sealed courier sorting hubs.
                </p>
                <p>
                  Mhira Natural and its courier partners are exempt from penalty liabilities arising from delays solely caused by acts of nature, civil disturbance, or government-mandated quarantine checkpoints.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ShippingPolicy;
