import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function TablePagination({
  currentPage = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 20, 50, 100],
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(totalItems, currentPage * itemsPerPage);

  return (
    <div
      className={`px-4 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 font-semibold print:hidden ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-600">Rows per page:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (onRowsPerPageChange) onRowsPerPageChange(next);
            if (onPageChange) onPageChange(1);
          }}
          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 focus:outline-none focus:border-slate-400 cursor-pointer shadow-2xs"
        >
          {rowsPerPageOptions.map((opt) => (
            <option key={opt} value={opt} className="font-semibold text-slate-600">
              {opt}
            </option>
          ))}
        </select>
        {totalItems > 0 && (
          <span className="text-slate-500 font-normal text-xs ml-1">
            ({startItem}-{endItem} of {totalItems})
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="px-2 font-semibold text-slate-600">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange && onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
