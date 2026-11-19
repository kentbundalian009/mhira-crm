import React from "react";
import { Banknote } from "lucide-react";

export const MastercardLogo = () => (
  <div className="h-5 px-1.5 rounded bg-white border border-gray-200 flex items-center justify-center shadow-2xs shrink-0 select-none" title="Mastercard">
    <svg viewBox="0 0 32 20" className="h-3 w-auto">
      <circle cx="11" cy="10" r="7.5" fill="#EB001B" />
      <circle cx="21" cy="10" r="7.5" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  </div>
);

export const VisaLogo = () => (
  <div className="h-5 px-2 rounded bg-white border border-gray-200 flex items-center justify-center shadow-2xs shrink-0 select-none" title="Visa">
    <span className="font-black italic text-[11px] tracking-tight text-[#1A1F71] leading-none">VISA</span>
  </div>
);

export const GCashLogo = () => (
  <div className="h-5 px-1.5 rounded bg-[#005CE6] flex items-center justify-center gap-1 shadow-2xs shrink-0 select-none text-white font-bold" title="GCash">
    <span className="w-2.5 h-2.5 rounded-full bg-white text-[#005CE6] flex items-center justify-center text-[7px] font-black leading-none">G</span>
    <span className="text-[10px] font-extrabold tracking-tight">GCash</span>
  </div>
);

export const MayaLogo = () => (
  <div className="h-5 px-2 rounded bg-black flex items-center justify-center shadow-2xs shrink-0 select-none" title="Maya">
    <span className="text-[#00E575] font-black text-[10px] tracking-tight lowercase">maya</span>
  </div>
);

export const GrabPayLogo = () => (
  <div className="h-5 px-1.5 rounded bg-[#00B14F] flex items-center justify-center shadow-2xs shrink-0 select-none" title="GrabPay">
    <span className="text-white font-bold text-[9px] tracking-tight">GrabPay</span>
  </div>
);

export const BPILogo = () => (
  <div className="h-5 px-1.5 rounded bg-[#B11116] flex items-center justify-center gap-0.5 shadow-2xs shrink-0 select-none" title="BPI Online">
    <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-white">
      <path d="M8 1L2 4v4c0 4 2.8 6.9 6 7.8 3.2-.9 6-3.8 6-7.8V4L8 1zm0 3.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6zm0 5c1.4 0 2.8.6 3.2 1.6-.8.8-2 1.4-3.2 1.4s-2.4-.6-3.2-1.4c.4-1 1.8-1.6 3.2-1.6z"/>
    </svg>
    <span className="text-white font-bold text-[9px] tracking-wider">BPI</span>
  </div>
);

export const BillEaseLogo = () => (
  <div className="h-5 px-1.5 rounded bg-white border border-gray-200 flex items-center justify-center shadow-2xs shrink-0 select-none" title="BillEase">
    <span className="font-extrabold text-[9px] text-[#0B2545]">bill</span>
    <span className="font-extrabold text-[9px] text-[#FF5A5F]">ease</span>
  </div>
);

export const PAYMENT_OPTIONS = [
  {
    id: "GCash",
    label: "GCash",
    subtitle: "Direct GCash e-wallet checkout via PayMongo",
    note: "Pag-click ng Complete Order, didiretso ka agad sa GCash payment portal ng PayMongo.",
    paymongoType: "gcash",
    logos: () => <GCashLogo />,
  },
  {
    id: "Maya",
    label: "Maya",
    subtitle: "Direct Maya e-wallet checkout via PayMongo",
    note: "Pag-click ng Complete Order, didiretso ka agad sa Maya payment portal ng PayMongo.",
    paymongoType: "paymaya",
    logos: () => <MayaLogo />,
  },
  {
    id: "Credit / Debit Card",
    label: "Credit / Debit Card",
    subtitle: "Visa & Mastercard checkout via PayMongo",
    note: "Pag-click ng Complete Order, didiretso ka agad sa Card payment form ng PayMongo.",
    paymongoType: "card",
    logos: () => (
      <div className="flex items-center gap-1">
        <VisaLogo />
        <MastercardLogo />
      </div>
    ),
  },
  {
    id: "GrabPay",
    label: "GrabPay",
    subtitle: "Direct GrabPay wallet checkout via PayMongo",
    note: "Pag-click ng Complete Order, didiretso ka agad sa GrabPay payment portal ng PayMongo.",
    paymongoType: "grab_pay",
    logos: () => <GrabPayLogo />,
  },
  {
    id: "Online Banking (BPI / UB)",
    label: "Online Banking (BPI / UB)",
    subtitle: "Direct online bank transfer via PayMongo",
    note: "Pag-click ng Complete Order, didiretso ka agad sa Online Banking (BPI / UnionBank) ng PayMongo.",
    paymongoType: "dob",
    logos: () => <BPILogo />,
  },
  {
    id: "BillEase",
    label: "BillEase",
    subtitle: "Buy Now, Pay Later installment via PayMongo",
    note: "Pag-click ng Complete Order, didiretso ka agad sa BillEase checkout ng PayMongo.",
    paymongoType: "billease",
    logos: () => <BillEaseLogo />,
  },
  {
    id: "Cash on Delivery",
    label: "Cash on Delivery (COD)",
    subtitle: "Pay cash upon parcel delivery to courier",
    note: "Cash Payment / Pay upon parcel delivery to courier. No online payment required.",
    paymongoType: null,
    logos: () => (
      <div className="h-5 px-2 rounded bg-amber-50 border border-amber-200 flex items-center justify-center gap-1 shrink-0 select-none text-amber-800 font-bold text-[10px]">
        <Banknote className="w-3 h-3" />
        <span>COD</span>
      </div>
    ),
  },
];
