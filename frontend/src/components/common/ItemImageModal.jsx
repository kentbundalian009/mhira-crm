import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../axios';

export const resolveItemImageUrl = (img) => {
  if (!img) return '/mhira_removebg.png';
  if (typeof img === 'object' && img.url) img = img.url;
  if (typeof img !== 'string') return '/mhira_removebg.png';
  const trimmed = img.trim();
  if (!trimmed) return '/mhira_removebg.png';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }
  if (
    trimmed.startsWith('/mhira') ||
    trimmed.startsWith('mhira') ||
    trimmed.startsWith('/vite') ||
    trimmed.startsWith('/assets')
  ) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
  return `${API_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

export default function ItemImageModal({ isOpen, onClose, item }) {
  const [imageError, setImageError] = useState(false);

  // Manage body scroll lock
  useEffect(() => {
    if (isOpen) {
      setImageError(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, item]);

  // Keyboard shortcut for Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const rawImage =
    item.image ||
    item.imageUrl ||
    (Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null);
  const resolvedUrl = resolveItemImageUrl(rawImage);
  const itemName = item.itemName || item.itemDescription || 'Product Image';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs font-['Poppins',sans-serif] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-3 sm:p-4 max-w-lg w-auto max-h-[85vh] sm:max-h-[88vh] flex items-center justify-center animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON (X ONLY) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 sm:-top-3.5 sm:-right-3.5 w-8 h-8 sm:w-9 sm:h-9 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full flex items-center justify-center shadow-md border border-slate-200 text-sm font-bold transition-all active:scale-95 cursor-pointer z-10"
          title="Close (Esc)"
          aria-label="Close Image Preview"
        >
          ✕
        </button>

        {/* IMAGE ONLY */}
        <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
          <img
            src={imageError ? '/mhira_removebg.png' : resolvedUrl}
            alt={itemName}
            onError={() => setImageError(true)}
            className="max-h-[75vh] max-w-[85vw] sm:max-w-md object-contain rounded-2xl drop-shadow-md select-none"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
