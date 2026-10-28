import React from "react";
import { MapPin, Phone, Mail, Clock, Store, Navigation, Sparkles } from "lucide-react";
import HeaderContainer from '../common/HeaderContainer';
import Footer from "../common/Footer";

function Stores() {
  const storeLocations = [
    {
      id: 1,
      name: "Mhira Natural Flagship Store",
      type: "Main Boutique & Laboratory",
      address: "124 Acacia Avenue, Green Valley Arcade, Quezon City, Metro Manila",
      contact: "+63 (02) 8921-5400",
      email: "qc-branch@mhiracosmetics.ph",
      hours: "Monday - Sunday: 9:00 AM - 8:00 PM",
      isFlagship: true
    },
    {
      id: 2,
      name: "Mhira Natural Alabang Outlet",
      type: "Retail Store & Wellness Corner",
      address: "2nd Floor West Wing, Lifestyle Center, Muntinlupa City",
      contact: "+63 (02) 8802-3310",
      email: "alabang@mhiracosmetics.ph",
      hours: "Monday - Sunday: 10:00 AM - 9:00 PM",
      isFlagship: false
    },
    {
      id: 3,
      name: "Mhira Natural Cebu Wellness Hub",
      type: "Visayas Regional Partner",
      address: "Ground Floor, Mango Square Mall, General Maxilom Ave, Cebu City",
      contact: "+63 (032) 412-8876",
      email: "cebu@mhiracosmetics.ph",
      hours: "Monday - Saturday: 9:00 AM - 7:00 PM",
      isFlagship: false
    }
  ];

  return (
    <div className="bg-white min-h-screen flex flex-col justify-between font-sans text-[#243746]">
      <div>
        <HeaderContainer />

        {/* HERO SECTION */}
        <section className="relative bg-gradient-to-b from-[#246C94] via-[#1D5777] to-[#246C94] text-white py-16 px-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
          
          <div className="relative max-w-3xl mx-auto space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-extrabold uppercase tracking-widest backdrop-blur-xs border border-white/10 shadow-xs">
              <Store className="w-3.5 h-3.5 text-[#79A94B]" />
              Physical Stores & Authorized Outlets
            </span>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Find Our Store Near You
            </h1>
            <p className="text-white/80 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              Visit any of our physical boutique branches to sample our organic soaps, experience scent profiles, and consult with our skincare specialists.
            </p>
          </div>
        </section>

        {/* STORE BRANCHES LIST */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {storeLocations.map((store) => (
              <div
                key={store.id}
                className="bg-white rounded-2xl border border-[#E1E9EF] p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
              >
                {store.isFlagship && (
                  <span className="absolute top-0 right-0 bg-[#79A94B] text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-xs">
                    Flagship
                  </span>
                )}

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF3E4] text-[#246C94] flex items-center justify-center border border-[#79A94B]/30 shadow-2xs group-hover:scale-105 transition-transform">
                    <Store className="w-6 h-6" />
                  </div>

                  <div>
                    <span className="text-xs font-bold text-[#246C94] uppercase tracking-wider block">
                      {store.type}
                    </span>
                    <h2 className="text-lg font-bold text-[#243746] mt-0.5">
                      {store.name}
                    </h2>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-[#E1E9EF] text-xs text-slate-600">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{store.address}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-mono">{store.contact}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-cyan-600 shrink-0" />
                      <span>{store.email}</span>
                    </div>

                    <div className="flex items-start gap-2.5 pt-1">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span className="font-medium text-slate-700">{store.hours}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-4 border-t border-[#E1E9EF]">
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(store.name + " " + store.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-slate-50 hover:bg-[#246C94] hover:text-white text-[#243746] font-bold py-2.5 px-4 rounded-xl text-xs transition-all border border-[#E1E9EF] cursor-pointer shadow-2xs group-hover:border-[#246C94]"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions on Map</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default Stores;