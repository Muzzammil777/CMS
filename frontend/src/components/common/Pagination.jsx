import React from 'react';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
}) {
  if (totalPages <= 1 && !onPageSizeChange) return null;

  // Compute ellipsis-aware page numbers
  function pageNumbers() {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);
    const range = [1];
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('...');
    range.push(totalPages);
    return range;
  }

  const start = totalItems != null ? (currentPage - 1) * (pageSize || 10) + 1 : null;
  const end   = totalItems != null ? Math.min(currentPage * (pageSize || 10), totalItems) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 rounded-b-xl">
      {/* Left: record count + page-size picker */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {totalItems != null && (
          <span>
            Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalItems}</span> records
          </span>
        )}
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20"
          >
            {[3, 5, 10, 20, 50].map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        )}
      </div>

      {/* Right: page buttons */}
      {totalPages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          {pageNumbers().map((p, i) =>
            p === '...'
              ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs select-none">…</span>
              : (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  aria-current={currentPage === p ? 'page' : undefined}
                  className={`min-w-[30px] h-[30px] rounded-lg text-xs font-semibold transition-colors ${
                    p === currentPage
                      ? 'bg-[#6d28d9] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              )
          )}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </nav>
      )}
    </div>
  );
}
