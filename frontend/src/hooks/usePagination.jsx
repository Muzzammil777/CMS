/**
 * usePagination — a reusable hook + UI component for table/list pagination.
 *
 * Usage:
 *   const { page, pageSize, totalPages, paginated, PaginationBar } = usePagination(items, 10);
 *   // then render <PaginationBar /> wherever you want the controls
 */
import { useState, useMemo } from 'react';

export function usePagination(items = [], defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when items or pageSize change
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  function goTo(p) {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }

  // Compute visible page numbers (max 5 around current)
  function pageNumbers() {
    const delta = 2;
    const range = [];
    const left = Math.max(2, safePage - delta);
    const right = Math.min(totalPages - 1, safePage + delta);

    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('...');
    if (totalPages > 1) range.push(totalPages);
    return range;
  }

  function PaginationBar() {
    if (items.length === 0) return null;

    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(safePage * pageSize, items.length);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white rounded-b-xl">
        {/* Info + page size */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of{' '}
            <span className="font-semibold text-slate-700">{items.length}</span> records
          </span>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="ml-2 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#00236f]/20"
          >
            {[5, 10, 20, 50].map(n => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
        </div>

        {/* Page buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(safePage - 1)}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          {pageNumbers().map((p, i) =>
            p === '...'
              ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
              : (
                <button
                  key={p}
                  onClick={() => goTo(p)}
                  className={`min-w-[30px] h-[30px] rounded-lg text-xs font-semibold transition-colors ${
                    p === safePage
                      ? 'bg-[#00236f] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {p}
                </button>
              )
          )}

          <button
            onClick={() => goTo(safePage + 1)}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>
    );
  }

  return { page: safePage, setPage: goTo, pageSize, totalPages, paginated, PaginationBar };
}
