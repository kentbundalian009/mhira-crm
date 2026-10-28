import React from 'react';

// Premium Modern Gold Medal (Zero Black Outline, Warm Golden Shine)
export const GoldMedal = ({ className = "w-5 h-5", size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 ${className}`}
  >
    {/* Ribbon */}
    <path d="M7 2L12 11L17 2H13.8L12 5.5L10.2 2H7Z" fill="#DC2626" />
    <path d="M9.5 2L12 8L14.5 2H13.2L12 4.5L10.8 2H9.5Z" fill="#F87171" />
    
    {/* Outer Rim */}
    <circle cx="12" cy="14.5" r="6.5" fill="#D97706" />
    {/* Main Disc */}
    <circle cx="12" cy="14.5" r="5.6" fill="#F59E0B" />
    {/* Inner Coin Highlight */}
    <circle cx="12" cy="14.5" r="4.6" fill="#FDE047" />
    
    {/* Embossed Star */}
    <path
      d="M12 11.8L12.9 13.6L14.9 13.9L13.4 15.3L13.8 17.2L12 16.2L10.2 17.2L10.6 15.3L9.1 13.9L11.1 13.6L12 11.8Z"
      fill="#B45309"
    />
  </svg>
);

// Premium Modern Silver Medal (Zero Black Outline, Crisp Metallic Shine)
export const SilverMedal = ({ className = "w-5 h-5", size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 ${className}`}
  >
    {/* Ribbon */}
    <path d="M7 2L12 11L17 2H13.8L12 5.5L10.2 2H7Z" fill="#2563EB" />
    <path d="M9.5 2L12 8L14.5 2H13.2L12 4.5L10.8 2H9.5Z" fill="#60A5FA" />
    
    {/* Outer Rim */}
    <circle cx="12" cy="14.5" r="6.5" fill="#64748B" />
    {/* Main Disc */}
    <circle cx="12" cy="14.5" r="5.6" fill="#94A3B8" />
    {/* Inner Coin Highlight */}
    <circle cx="12" cy="14.5" r="4.6" fill="#F1F5F9" />
    
    {/* Embossed Star */}
    <path
      d="M12 11.8L12.9 13.6L14.9 13.9L13.4 15.3L13.8 17.2L12 16.2L10.2 17.2L10.6 15.3L9.1 13.9L11.1 13.6L12 11.8Z"
      fill="#475569"
    />
  </svg>
);

// Premium Modern Bronze Medal (Zero Black Outline, Warm Bronze Shine)
export const BronzeMedal = ({ className = "w-5 h-5", size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block shrink-0 ${className}`}
  >
    {/* Ribbon */}
    <path d="M7 2L12 11L17 2H13.8L12 5.5L10.2 2H7Z" fill="#059669" />
    <path d="M9.5 2L12 8L14.5 2H13.2L12 4.5L10.8 2H9.5Z" fill="#34D399" />
    
    {/* Outer Rim */}
    <circle cx="12" cy="14.5" r="6.5" fill="#92400E" />
    {/* Main Disc */}
    <circle cx="12" cy="14.5" r="5.6" fill="#D97706" />
    {/* Inner Coin Highlight */}
    <circle cx="12" cy="14.5" r="4.6" fill="#FEF3C7" />
    
    {/* Embossed Star */}
    <path
      d="M12 11.8L12.9 13.6L14.9 13.9L13.4 15.3L13.8 17.2L12 16.2L10.2 17.2L10.6 15.3L9.1 13.9L11.1 13.6L12 11.8Z"
      fill="#78350F"
    />
  </svg>
);

export default {
  GoldMedal,
  SilverMedal,
  BronzeMedal,
};
