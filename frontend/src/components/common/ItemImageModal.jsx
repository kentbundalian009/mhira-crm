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
  const [activeIdx, setActiveIdx] = useState(0);

  // Manage body scroll lock and reset active index
  useEffect(() => {
    if (isOpen) {
      setImageError(false);
      setActiveIdx(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, item]);

  // Keyboard shortcut for Escape, Left and Right arrows
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setImageError(false);
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setImageError(false);
        setActiveIdx((prev) => prev + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const images = Array.isArray(item?.images) && item.images.length > 0
    ? item.images
    : (item?.image ? [item.image] : (item?.imageUrl ? [item.imageUrl] : (typeof item === 'string' ? [item] : [])));

  const currentRaw = images[activeIdx] || images[0] || item?.image || item?.imageUrl || null;
  const resolvedUrl = resolveItemImageUrl(currentRaw);
  const itemName = item.itemName || item.itemDescription || 'Product Image';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs font-['Poppins',sans-serif] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-3 sm:p-4 max-w-xl w-auto max-h-[85vh] sm:max-h-[88vh] flex items-center justify-center animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON (X ONLY) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 sm:-top-3.5 sm:-right-3.5 w-8 h-8 sm:w-9 sm:h-9 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full flex items-center justify-center shadow-md border border-slate-200 text-sm font-bold transition-all active:scale-95 cursor-pointer z-20"
          title="Close (Esc)"
          aria-label="Close Image Preview"
        >
          ✕
        </button>

        {/* PREV / NEXT ARROWS (WHEN MULTIPLE IMAGES) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageError(false);
                setActiveIdx((prev) => (prev > 0 ? prev - 1 : images.length - 1));
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/85 text-white flex items-center justify-center text-lg font-bold transition-all active:scale-95 cursor-pointer z-10 shadow-md backdrop-blur-xs"
              title="Previous photo (←)"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setImageError(false);
                setActiveIdx((prev) => (prev < images.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/85 text-white flex items-center justify-center text-lg font-bold transition-all active:scale-95 cursor-pointer z-10 shadow-md backdrop-blur-xs"
              title="Next photo (→)"
            >
              ›
            </button>
            {/* THUMBNAIL DOTS */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-slate-900/50 backdrop-blur-xs px-2.5 py-1 rounded-full shadow-xs">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageError(false);
                    setActiveIdx(i);
                  }}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    i === activeIdx ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Photo ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

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
